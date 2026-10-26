import * as THREE from "../../../vendor/three/build/three.module.js";
import { GLTFLoader } from "../../../vendor/three/examples/jsm/loaders/GLTFLoader.js";
import { createFireTheatre } from "./stage.js";
import { createAtmosphere, cinematicCamera } from "./camera.js";
import { createPhoenixFireworks } from "./fireworks.js";

// The approved V16 actor, lighting and camera, with added world-space fireworks,
// driven by the host theatre clock. No separate RAF, keyboard or audio loop.
export async function createPhoenixTheatre({
  canvas,
  onContextLost = () => {},
  signal,
  resolveAsset = (path) => new URL(path, import.meta.url).href,
}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#121b26");
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 350);
  const controls = {
    target: new THREE.Vector3(),
    update() {
      camera.lookAt(this.target);
    },
  };
  const atmosphere = createAtmosphere(scene);
  scene.add(new THREE.HemisphereLight(0xc0dcff, 0x382015, 1.9));
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  for (const [color, intensity, pos] of [
    [0xffd4ac, 3, [-5, 8, 7]],
    [0xa9ccff, 2, [5, 3, 4]],
    [0x91dcff, 3.2, [1, 6, -5]],
    [0xff8840, 1.3, [-4, 1, -2]],
  ]) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...pos);
    scene.add(light);
  }
  let disposed = false,
    ready = false,
    resizeKey = "",
    renderKey = "",
    actor,
    mixer,
    theatre,
    fireworks,
    flightRoot,
    rootInterpolant;
  const root = new THREE.Vector3(),
    ahead = new THREE.Vector3(),
    behind = new THREE.Vector3(),
    velocity = new THREE.Vector3();
  const meshes = [];
  const hudTop = document.querySelector(".phoenix-top"),
    hudBottom = document.querySelector(".phoenix-bottom");
  const lost = (event) => {
    event.preventDefault();
    ready = false;
    onContextLost();
  };
  canvas.addEventListener("webglcontextlost", lost);
  function resize(width, height, pixelRatio) {
    const ratio = Math.min(pixelRatio || 1, 1.75, 1600 / width),
      short = height <= 550;
    const topInset = hudTop?.getClientRects().length
      ? Math.max(
          0,
          hudTop.getBoundingClientRect().top -
            (short ? 8 : width <= 760 ? 19 : 30),
        )
      : 0;
    const bottomInset = hudBottom?.getClientRects().length
      ? Math.max(
          0,
          height -
            hudBottom.getBoundingClientRect().bottom -
            (short ? 8 : width <= 760 ? 18 : 26),
        )
      : 0;
    const extra = topInset + bottomInset,
      key = [width, height, ratio, extra].join(":");
    if (key === resizeKey) return;
    resizeKey = key;
    renderKey = "";
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Keep the accepted close-up within the main theatre's title/subtitle bands.
    const room =
      camera.aspect < 0.9 ? height * 0.8 : height - (height < 530 ? 136 : 260);
    camera.zoom = THREE.MathUtils.clamp(
      (room - extra) / (height * 0.8),
      0.58,
      1,
    );
    camera.updateProjectionMatrix();
  }
  function render(
    t,
    width = innerWidth,
    height = innerHeight,
    pixelRatio = devicePixelRatio,
  ) {
    if (disposed || !actor) return;
    resize(width, height, pixelRatio);
    t = Math.max(0, Math.min(27, t));
    const key = t.toFixed(6) + ":" + resizeKey;
    if (key === renderKey) return;
    renderKey = key;
    mixer.setTime(Math.min(t, 26.999999));
    actor.updateMatrixWorld(true);
    actor.visible = t >= 2.94;
    atmosphere.update(t);
    flightRoot.getWorldPosition(root);
    cinematicCamera(camera, controls, t, camera.aspect, root.y);
    fireworks.update(t, camera, width, height, renderer.getPixelRatio(), root);
    ahead.fromArray(rootInterpolant.evaluate(Math.min(27, t + 0.02)));
    behind.fromArray(rootInterpolant.evaluate(Math.max(0, t - 0.02)));
    velocity.subVectors(ahead, behind).multiplyScalar(25);
    theatre.update(t, camera, root, velocity, flightRoot.scale.x);
    renderer.render(scene, camera);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    ready = false;
    canvas.removeEventListener("webglcontextlost", lost);
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set();
    scene.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      for (const mat of [].concat(o.material || [])) materials.add(mat);
    });
    for (const mat of materials) {
      for (const value of Object.values(mat))
        if (value?.isTexture) textures.add(value);
      for (const uniform of Object.values(mat.uniforms || {}))
        if (uniform.value?.isTexture) textures.add(uniform.value);
      mat.dispose();
    }
    for (const geometry of geometries) geometry.dispose();
    for (const texture of textures) texture.dispose();
    mixer?.stopAllAction();
    if (actor) mixer?.uncacheRoot(actor);
    renderer.dispose();
  }
  try {
    const modelURL = resolveAsset(
      "./phoenix-3d-review/phoenix-rig-v16.glb?rev=16a",
    );
    const response = await fetch(modelURL, { signal });
    if (!response.ok) throw new Error("凤凰演出资源未能载入");
    const gltf = await new GLTFLoader().parseAsync(
      await response.arrayBuffer(),
      "",
    );
    signal?.throwIfAborted();
    actor = gltf.scene;
    scene.add(actor);
    const clip = gltf.animations[0];
    if (!clip || Math.abs(clip.duration - 27) > 0.01)
      throw new Error("凤凰演出资源不完整");
    actor.traverse((o) => {
      if (!o.isMesh) return;
      meshes.push(o);
      o.frustumCulled = false;
      for (const mat of [].concat(o.material)) {
        mat.side = THREE.DoubleSide;
        if (mat.map && /feather|filament/i.test(mat.name)) {
          mat.alphaTest = 0.3;
          mat.transparent = false;
          mat.depthWrite = true;
          mat.alphaToCoverage = true;
        }
        mat.needsUpdate = true;
      }
    });
    flightRoot = actor.getObjectByName("flight_root");
    rootInterpolant = clip.tracks
      .find((track) => track.name === "flight_root.position")
      ?.createInterpolant();
    if (!flightRoot || !rootInterpolant) throw new Error("凤凰飞行动作缺失");
    mixer = new THREE.AnimationMixer(actor);
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    theatre = createFireTheatre(scene, actor, meshes);
    // Sample the immutable choreography/camera for fixed world-space births.
    // Use an independent camera so score construction cannot change the live pose.
    const scoreCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 350),
      scoreTarget = new THREE.Vector3();
    const scoreControls = {
      target: scoreTarget,
      update() {
        scoreCamera.lookAt(scoreTarget);
      },
    };
    fireworks = createPhoenixFireworks(scene, (t) => {
      const sampledRoot = new THREE.Vector3().fromArray(
        rootInterpolant.evaluate(t),
      );
      scoreCamera.aspect = camera.aspect;
      cinematicCamera(
        scoreCamera,
        scoreControls,
        t,
        camera.aspect,
        sampledRoot.y,
      );
      return {
        position: scoreCamera.position.clone(),
        target: scoreTarget.clone(),
        zoom: camera.zoom,
      };
    });
    mixer.setTime(18.7);
    actor.updateMatrixWorld(true);
    theatre.cacheReleasePose();
    // Warm each effect family while the host keeps this canvas covered.
    render(3.6);
    await renderer.compileAsync(scene, camera);
    for (const t of [0.8, 7.8, 18.9, 19.6, 23.4, 0]) {
      await new Promise(requestAnimationFrame);
      signal?.throwIfAborted();
      render(t);
    }
    ready = true;
    return {
      render,
      dispose,
      get ready() {
        return ready && !disposed;
      },
      inspect() {
        return {
          revision: 16,
          viewportRevision: 18,
          duration: clip.duration,
          joints: meshes[0].skeleton.bones.length,
          morphTracks: clip.tracks.filter((track) =>
            track.name.includes("morphTargetInfluences"),
          ).length,
          vertices: meshes.reduce(
            (n, m) => n + m.geometry.attributes.position.count,
            0,
          ),
          flameEmitters: theatre.counts,
          fireworks: fireworks.stats,
          renderer: renderer.capabilities.isWebGL2 ? "WebGL2" : "WebGL",
        };
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
