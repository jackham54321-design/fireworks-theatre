/** One asset interface for the website and the self-contained edition. */
export function createAssetLoader(manifest, documentBase = document.baseURI) {
  const urls = new Map();
  const pending = new Map();
  let visualModules;
  let visionRuntime;
  const clean = (path) => path.split("?")[0].replace(/^\.\//, "");

  function entry(path) {
    const key = clean(path);
    const item = manifest.resources[key];
    if (!item) throw new Error(`资源缺失：${key}`);
    return [key, item];
  }

  function unpack(item) {
    const content = document.getElementById(item.element).textContent;
    const bytes = new Uint8Array(item.packedBytes);
    let offset = 0;
    // Bound temporary allocations even for the largest model.
    for (let i = 0; i < content.length; i += 65536) {
      const part = atob(content.slice(i, i + 65536));
      for (let j = 0; j < part.length; j++)
        bytes[offset++] = part.charCodeAt(j);
    }
    if (offset !== bytes.length) throw new Error("内嵌资源不完整");
    return bytes;
  }

  async function bytes(path) {
    const [, item] = entry(path);
    if (!item.element) {
      const response = await fetch(new URL(item.path, documentBase));
      if (!response.ok) throw new Error(`资源加载失败：${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    }
    const packed = unpack(item);
    if (item.encoding === "identity") return packed;
    const stream = new Blob([packed])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    const output = new Uint8Array(await new Response(stream).arrayBuffer());
    if (output.length !== item.bytes) throw new Error("内嵌资源解压不完整");
    return output;
  }

  async function assetURL(path) {
    const [key, item] = entry(path);
    if (urls.has(key)) return urls.get(key);
    if (!item.element) {
      const url = new URL(item.path, documentBase).href;
      urls.set(key, url);
      return url;
    }
    if (!pending.has(key)) {
      pending.set(
        key,
        bytes(key)
          .then((data) => {
            const url = URL.createObjectURL(
              new Blob([data], { type: item.type }),
            );
            urls.set(key, url);
            return url;
          })
          .catch((error) => {
            pending.delete(key);
            throw error;
          }),
      );
    }
    return pending.get(key);
  }

  function musicURL(id) {
    const [key, item] = entry(`fireworks-audio/${id}.mp3`);
    if (!urls.has(key)) {
      // Keep play() in the original click activation on mobile browsers.
      if (item.element && item.encoding !== "identity")
        throw new Error("音乐资源格式不符");
      urls.set(
        key,
        item.element
          ? URL.createObjectURL(new Blob([unpack(item)], { type: item.type }))
          : new URL(item.path, documentBase).href,
      );
    }
    return urls.get(key);
  }

  async function prepareModules() {
    if (!visualModules) {
      visualModules = Promise.all(
        manifest.modules.map(async (key) => [key, await assetURL(key)]),
      )
        .then((pairs) => {
          const map = document.createElement("script");
          map.type = "importmap";
          map.textContent = JSON.stringify({
            imports: Object.fromEntries(pairs),
          });
          document.head.append(map);
        })
        .catch((error) => {
          visualModules = null;
          throw error;
        });
    }
    return visualModules;
  }

  async function load(url) {
    const kind = url.includes("dragon-theatre")
      ? "dragon"
      : url.includes("theatre-2d")
        ? "phoenix2d"
        : "phoenix3d";
    const show = manifest.shows[kind];
    await Promise.all([prepareModules(), ...show.assets.map(assetURL)]);
    return import(show.entry);
  }

  function resolveAsset(path) {
    const [key] = entry(path);
    if (!urls.has(key)) throw new Error(`演出资源尚未就绪：${key}`);
    return urls.get(key);
  }

  async function vision() {
    if (!visionRuntime) {
      visionRuntime = (async () => {
        const api = await import(await assetURL("vision/vision_bundle.mjs"));
        const variant = (await api.FilesetResolver.isSimdSupported())
          ? "internal"
          : "nosimd_internal";
        const prefix = `vision/wasm/vision_wasm_${variant}`;
        const [wasmLoaderPath, wasmBinaryPath, model] = await Promise.all([
          assetURL(prefix + ".js"),
          assetURL(prefix + ".wasm"),
          bytes("vision/hand_landmarker.task"),
        ]);
        return {
          HandLandmarker: api.HandLandmarker,
          files: { wasmLoaderPath, wasmBinaryPath },
          model,
        };
      })().catch((error) => {
        visionRuntime = null;
        throw error;
      });
    }
    return visionRuntime;
  }

  async function initialAssets() {
    const [rose, samples, call, rosePhoto] = await Promise.all([
      bytes("initial/acceptedRoseAsset"),
      bytes("initial/fireworkSamplesV25"),
      bytes("initial/phoenixCallPcmBase64"),
      assetURL("initial/loveRosePhoto"),
    ]);
    let binary = "";
    for (let i = 0; i < call.length; i += 8192)
      binary += String.fromCharCode(...call.subarray(i, i + 8192));
    const decoder = new TextDecoder();
    return {
      rose: JSON.parse(decoder.decode(rose)),
      samples: JSON.parse(decoder.decode(samples)),
      phoenixCall: btoa(binary),
      rosePhoto,
    };
  }

  function dispose() {
    for (const url of urls.values())
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    urls.clear();
  }
  return {
    bytes,
    load,
    resolveAsset,
    musicURL,
    vision,
    initialAssets,
    dispose,
  };
}
