import { createAssetLoader } from "./runtime/assets.js";
import { createTheatre } from "./main.js";
import { exportSource } from "./runtime/source-export.js";

const manifest = window.__THEATRE_MANIFEST__;
const assets = createAssetLoader(manifest);
document
  .getElementById("exportSourceBtn")
  .addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const status = document.getElementById("sourceExportStatus");
    button.disabled = true;
    try {
      const blob = await exportSource(
        manifest.sourceFiles,
        assets.bytes,
        (done, total) => {
          status.textContent = `正在整理源码与素材… ${Math.round((done / total) * 100)}%`;
        },
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "fireworks-theatre-source.tar.gz";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      status.textContent = "工程已导出，解压后阅读 README 即可开始编辑。";
    } catch (error) {
      console.error("Source export failed", error);
      status.textContent = "导出未完成，请重试或使用新版桌面浏览器。";
    } finally {
      button.disabled = false;
    }
  });
window.fireworksPortable = Object.freeze({
  revision: manifest.revision,
  musicURL: assets.musicURL,
  vision: assets.vision,
});
window.phoenixAssetBundle = Object.freeze({
  load: assets.load,
  resolveAsset: assets.resolveAsset,
});
addEventListener("pagehide", (event) => {
  if (!event.persisted) assets.dispose();
});

assets
  .initialAssets()
  .then((data) => {
    createTheatre(data);
    document.getElementById("theatreLoading")?.remove();
  })
  .catch((error) => {
    console.error("Theatre could not start", error);
    document.getElementById("theatreLoading").textContent =
      "资源未能完整加载，请刷新或使用新版浏览器打开。";
  });
