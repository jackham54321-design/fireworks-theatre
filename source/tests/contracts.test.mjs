import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { exportSource, tarHeader } from "../src/runtime/source-export.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hash = (data) => createHash("sha256").update(data).digest("hex");

test("all production resources are contained in the standalone project", async () => {
  const project = JSON.parse(
    await fs.readFile(path.join(root, "project.json")),
  );
  for (const file of Object.values(project.resources)) {
    assert(!path.isAbsolute(file) && !file.split("/").includes(".."));
    assert((await fs.stat(path.join(root, file))).isFile(), file);
  }
});

test("launch replacement keeps the thirteen flight durations and original burst/tail", async () => {
  const bank = JSON.parse(
    await fs.readFile(path.join(root, "assets/data/firework-samples-v25.json")),
  );
  assert.equal(bank.launches.length, 13);
  assert.equal(
    hash(Buffer.from(bank.burst.pcm, "base64")),
    "5612ec7ed317439644840ef9db58e342b327a0dd108932a12857b6ebde642e1e",
  );
  const expected = [
    0.55, 0.7, 0.85, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.3, 2.6, 2.9, 3.2,
  ];
  bank.launches.forEach((clip, i) => {
    const data = Buffer.from(clip.pcm, "base64");
    assert(
      Math.abs(
        data.length / (clip.channels * 2 * bank.sampleRate) - expected[i],
      ) <
        1 / bank.sampleRate,
    );
    assert(data.some((x) => x !== 0));
  });
});

test("source export produces a valid deterministic tar with byte-exact entries", async () => {
  const files = { "README.md": "readme", "assets/a.bin": "binary" };
  const data = {
    readme: new TextEncoder().encode("烟花剧场"),
    binary: Uint8Array.from([0, 1, 255, 0, 13]),
  };
  const blob = await exportSource(files, async (key) => data[key]);
  const tar = gunzipSync(new Uint8Array(await blob.arrayBuffer()));
  let offset = 0;
  for (const [name, key] of Object.entries(files)) {
    const header = tar.subarray(offset, offset + 512);
    assert.equal(
      header.subarray(0, 100).toString().replace(/\0.*$/s, ""),
      "fireworks-theatre/" + name,
    );
    const size = parseInt(
      header.subarray(124, 136).toString().replace(/\0.*$/s, ""),
      8,
    );
    assert.equal(size, data[key].length);
    assert.deepEqual(
      tar.subarray(offset + 512, offset + 512 + size),
      Buffer.from(data[key]),
    );
    const expectedSum = parseInt(header.subarray(148, 154).toString(), 8);
    const checked = Buffer.from(header);
    checked.fill(32, 148, 156);
    assert.equal(
      checked.reduce((a, b) => a + b, 0),
      expectedSum,
    );
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  assert(tar.subarray(offset).every((x) => x === 0));
  assert.throws(() => tarHeader("../escape", 1));
});
