import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { Script } from "node:vm";
import { parse } from "@babel/parser";
import { build, transform } from "esbuild";
import { exportSource } from "../src/runtime/source-export.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist");
const release = path.join(root, "release");
const project = JSON.parse(
  await fs.readFile(path.join(root, "project.json"), "utf8"),
);
const hash = (data) => createHash("sha256").update(data).digest("hex");
const mime = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".glb": "model/gltf-binary",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".wasm": "application/wasm",
  ".task": "application/octet-stream",
};
const files = new Map();
const sources = new Map();
const moduleKey = (file) => "theatre/" + file;
const resolve = (file, spec) =>
  path.posix.normalize(path.posix.join(path.posix.dirname(file), spec));

async function visit(file) {
  if (sources.has(file)) return;
  const source = await fs.readFile(path.join(root, file), "utf8");
  sources.set(file, source);
  for (const node of parse(source, { sourceType: "module" }).program.body) {
    if (node.source) await visit(resolve(file, node.source.value));
  }
}
for (const show of Object.values(project.shows)) await visit(show.entry);
for (const [file, source] of sources) {
  const replacements = parse(source, { sourceType: "module" })
    .program.body.filter((node) => node.source)
    .map((node) => [
      node.source.start,
      node.source.end,
      JSON.stringify(moduleKey(resolve(file, node.source.value))),
    ]);
  let text = source;
  for (const [a, b, value] of replacements.reverse())
    text = text.slice(0, a) + value + text.slice(b);
  const compiled = await transform(text, {
    minify: true,
    format: "esm",
    target: "es2022",
    legalComments: "inline",
  });
  files.set(moduleKey(file), {
    path: "modules/" + file,
    type: "text/javascript",
    data: Buffer.from(compiled.code),
  });
}
for (const [key, file] of Object.entries(project.resources)) {
  files.set(key, {
    path: file,
    type: mime[path.extname(file)] || "application/octet-stream",
    data: await fs.readFile(path.join(root, file)),
  });
}
// One allowlist drives both the downloadable project and the embedded source.
// Media is reused by key, never duplicated in the single HTML.
const sourceFiles = Object.fromEntries(
  Object.entries(project.resources).map(([key, file]) => [file, key]),
);
async function walk(directory) {
  const entries = await fs.readdir(path.join(root, directory), {
    withFileTypes: true,
  });
  const result = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const file = directory + "/" + entry.name;
    if (entry.isDirectory()) result.push(...(await walk(file)));
    else if (entry.isFile()) result.push(file);
  }
  return result;
}
const editable = [
  "index.html",
  "project.json",
  "package.json",
  "package-lock.json",
  "README.md",
  "LICENSE",
  ".gitignore",
  "scripts/build.mjs",
  "assets/licenses.json",
  "assets/vendor/mediapipe/LICENSE",
  "assets/vendor/three/LICENSE",
  ...(await walk("src")),
  ...(await walk("vendor")),
  ...(await walk("docs")),
  ...(await walk("tests")),
];
for (const file of [...new Set(editable)]) {
  const key = "source/" + file;
  files.set(key, {
    path: "source/" + (file === ".gitignore" ? "gitignore.txt" : file),
    type: mime[path.extname(file)] || "text/plain",
    data: await fs.readFile(path.join(root, file)),
  });
  sourceFiles[file] = key;
}
const app = await build({
  absWorkingDir: root,
  entryPoints: ["src/boot.js"],
  bundle: true,
  write: false,
  format: "iife",
  minify: true,
  target: "es2022",
  legalComments: "inline",
});
const script = app.outputFiles[0].text;
const style = (
  await transform(await fs.readFile(path.join(root, "src/style.css"), "utf8"), {
    loader: "css",
    minify: true,
  })
).code;
const escapeHTML = (text) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const notices = await Promise.all(
  [
    "LICENSE",
    "docs/ASSETS.md",
    "assets/vendor/three/LICENSE",
    "assets/vendor/mediapipe/LICENSE",
  ].map(
    async (file) =>
      `<details><summary>${file}</summary><pre style="white-space:pre-wrap;max-height:16rem;overflow:auto;font:11px/1.6 monospace">${escapeHTML(await fs.readFile(path.join(root, file), "utf8"))}</pre></details>`,
  ),
);
const shell = (
  await fs.readFile(path.join(root, "index.html"), "utf8")
).replace("<!-- THEATRE_NOTICES -->", () => notices.join("\n"));
const manifest = {
  revision: project.revision,
  modules: [...sources.keys()].map(moduleKey),
  shows: Object.fromEntries(
    Object.entries(project.shows).map(([key, show]) => [
      key,
      { ...show, entry: moduleKey(show.entry) },
    ]),
  ),
  resources: {},
  sourceFiles,
};
await fs.mkdir(output, { recursive: true });
await fs.mkdir(release, { recursive: true });
for (const [key, item] of files) {
  const destination = path.join(output, item.path);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, item.data);
  manifest.resources[key] = {
    path: item.path,
    type: item.type,
    bytes: item.data.length,
    sha256: hash(item.data),
  };
}
const loading =
  '<div id="theatreLoading" role="status" style="position:fixed;inset:0;display:grid;place-content:center;background:#060b16;color:#edce91;z-index:10000;font:15px/1.8 sans-serif;text-align:center">正在打开烟花剧场…</div>';
const safeJSON = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");
const manifestScript = (value) =>
  "<script>window.__THEATRE_MANIFEST__=" + safeJSON(value) + "</script>";
const webManifest = {
  ...manifest,
  edition: "web",
  offlineDownloadUrl: "downloads/fireworks-theatre.html",
  resources: Object.fromEntries(
    Object.entries(manifest.resources).filter(
      ([key]) => !key.startsWith("source/"),
    ),
  ),
};
delete webManifest.sourceFiles;
const html = shell
  .replace(
    "<!-- THEATRE_STYLE -->",
    () => '<link rel="stylesheet" href="app.css">',
  )
  .replace(
    "<!-- THEATRE_BOOT -->",
    () =>
      loading +
      manifestScript(webManifest) +
      '<script defer src="app.js"></script>',
  );
await fs.writeFile(path.join(output, "index.html"), html);
await fs.writeFile(path.join(output, "app.js"), script);
await fs.writeFile(path.join(output, "app.css"), style);
const embedded = structuredClone(manifest),
  blocks = [];
embedded.edition = "offline";
let packedBytes = 0;
for (const [key, item] of files) {
  const zipped = key.startsWith("fireworks-audio/")
    ? item.data
    : gzipSync(item.data, { level: 9 });
  const compressed = zipped.length < item.data.length * 0.98;
  const packed = compressed ? zipped : item.data;
  const element = "theatre-resource-" + blocks.length;
  embedded.resources[key] = {
    ...manifest.resources[key],
    element,
    encoding: compressed ? "gzip" : "identity",
    packedBytes: packed.length,
  };
  blocks.push(
    `<script type="application/octet-stream" id="${element}">${packed.toString("base64")}</script>`,
  );
  packedBytes += packed.length;
}
const offline = shell
  .replace("<!-- THEATRE_STYLE -->", () => "<style>" + style + "</style>")
  .replace(
    "<!-- THEATRE_BOOT -->",
    () =>
      loading +
      blocks.join("\n") +
      manifestScript(embedded) +
      "<script>" +
      script.replaceAll("</script", "<\\/script") +
      "</script>",
  );
const offlinePath = path.join(release, "烟花剧场.html");
// String replacement callbacks preserve minified `$&` identifiers verbatim.
const inline = offline.slice(
  offline.lastIndexOf("<script>") + 8,
  offline.lastIndexOf("</script>"),
);
if (inline !== script.replaceAll("</script", "<\\/script"))
  throw new Error("Inline script changed during HTML assembly");
new Script(inline, { filename: "offline-app.js" });
await fs.writeFile(offlinePath, offline);
await fs.mkdir(path.join(output, "downloads"), { recursive: true });
await fs.writeFile(
  path.join(output, "downloads/fireworks-theatre.html"),
  offline,
);
const archive = await exportSource(
  sourceFiles,
  async (key) => files.get(key).data,
);
await fs.writeFile(
  path.join(release, "fireworks-theatre-source.tar.gz"),
  new Uint8Array(await archive.arrayBuffer()),
);
for (const [file, key] of Object.entries(sourceFiles)) {
  const target = path.join(release, "source", file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, files.get(key).data);
}
const report = {
  revision: project.revision,
  offlineBytes: Buffer.byteLength(offline),
  offlineSha256: hash(offline),
  webInitialBytes:
    Buffer.byteLength(html) +
    Buffer.byteLength(script) +
    Buffer.byteLength(style),
  resourceBytes: [...files.values()].reduce((n, f) => n + f.data.length, 0),
  packedBytes,
  resources: manifest.resources,
  webResources: webManifest.resources,
  offlineDownloadPath: "downloads/fireworks-theatre.html",
};
await fs.writeFile(
  path.join(release, "build-report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      revision: report.revision,
      offlineBytes: report.offlineBytes,
      webInitialBytes: report.webInitialBytes,
      resourceBytes: report.resourceBytes,
      packedBytes,
      offlineSha256: report.offlineSha256,
    },
    null,
    2,
  ),
);
