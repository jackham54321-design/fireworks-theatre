import * as THREE from "../../../vendor/three/build/three.module.js";
import { GLTFLoader } from "../../../vendor/three/examples/jsm/loaders/GLTFLoader.js";
import { createDragonStage } from "./stage.js";
import { createDragonPipeline } from "./pipeline.js";
import { createDragonFireworks } from "./fireworks.js";
import { cameraState } from "./camera.js";
import {
  createDragonImpact,
  GLASS_IMPACT_TIME,
  GLASS_SNAPSHOT_TIME,
} from "./impact.js";
import { createDragonAttack } from "./attack.js";

// Final V14 choreography, driven by the theatre's single transport. No private RAF.
export async function createDragonTheatre({
  canvas,
  signal,
  onContextLost = () => {},
  onAudioError = () => {},
  resolveAsset = (path) => new URL(path, import.meta.url).href,
}) {
  const DURATION = 21.6,
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.07;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#071117");
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 180);
  const pmrem = new THREE.PMREMGenerator(renderer),
    room = new THREE.Scene();
  room.background = new THREE.Color("#647985");
  for (const [pos, col, power] of [
    [[-6, 6, 5], 0xffe6bd, 3],
    [[7, 4, -4], 0xb7eaff, 2],
    [[0, -6, 0], 0x30291f, 0.6],
  ]) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 12),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(col).multiplyScalar(power),
        side: THREE.DoubleSide,
      }),
    );
    panel.position.fromArray(pos);
    panel.lookAt(0, 0, 0);
    room.add(panel);
  }
  const env = pmrem.fromScene(room, 0.04);
  scene.environment = env.texture;
  room.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0x92bfd4, 0x191820, 0.82));
  for (const [col, pow, pos] of [
    [0xffdda6, 3.4, [-7, 8, 10]],
    [0x79cfff, 3.4, [8, 5, -8]],
    [0xd3e8f0, 0.65, [0, 3, 13]],
  ]) {
    const light = new THREE.DirectionalLight(col, pow);
    light.position.fromArray(pos);
    scene.add(light);
  }
  const impactMaterial = new THREE.MeshBasicMaterial({
    color: 0x071117,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const impact = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), impactMaterial);
  impact.position.z = -0.12;
  impact.renderOrder = 10000;
  impact.frustumCulled = false;
  camera.add(impact);
  scene.add(camera);
  const impactFx = createDragonImpact(renderer, camera);
  let attack = null;
  const ease = (a, b, t) => {
    const u = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
    return u * u * u * (u * (u * 6 - 15) + 10);
  };
  const hash = (n) =>
    (((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1) + 1) % 1;
  const far = new Float32Array(270 * 3);
  for (let i = 0; i < 270; i++) {
    far[i * 3] = (hash(i) - 0.5) * 90;
    far[i * 3 + 1] = (hash(i + 300) - 0.5) * 50;
    far[i * 3 + 2] = -35 - hash(i + 600) * 45;
  }
  const farGeometry = new THREE.BufferGeometry();
  farGeometry.setAttribute("position", new THREE.BufferAttribute(far, 3));
  scene.add(
    new THREE.Points(
      farGeometry,
      new THREE.PointsMaterial({
        color: 0x8aabb0,
        size: 0.045,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      }),
    ),
  );
  const count = 96,
    wind = new Float32Array(count * 6),
    colors = new Float32Array(count * 6),
    windGeometry = new THREE.BufferGeometry();
  for (let i = 0; i < count; i++) {
    const color = new THREE.Color(i % 3 ? 0x88b5bd : 0xd1ae64);
    for (let k = 0; k < 2; k++)
      colors.set([color.r, color.g, color.b], i * 6 + k * 3);
  }
  windGeometry.setAttribute("position", new THREE.BufferAttribute(wind, 3));
  windGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const windMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.LineSegments(windGeometry, windMaterial));
  const rushLight = new THREE.PointLight(0xffdd9c, 0, 20, 2);
  rushLight.position.set(0, 3, 8);
  scene.add(rushLight);
  const rootPosition = new THREE.Vector3(),
    headPosition = new THREE.Vector3(),
    mouthPosition = new THREE.Vector3(),
    mouthDirection = new THREE.Vector3(),
    transform = new THREE.Matrix4();
  const bodyNames = ["root", "spine_05", "spine_11", "spine_17", "spine_24"],
    bodyPoints = bodyNames.map(() => new THREE.Vector3()),
    bodyFrames = bodyNames.map(() => new THREE.Quaternion());
  const feet = [
    ["fore_2.L", [1.100000023841858, -2.0299999713897705, 3.2699999809265137]],
    ["fore_2.R", [-1.100000023841858, -2.0299999713897705, 3.2699999809265137]],
    ["hind_2.L", [1.100000023841858, -1.840000033378601, -1.4800000190734863]],
    ["hind_2.R", [-1.100000023841858, -1.840000033378601, -1.4800000190734863]],
  ];
  const footPoints = feet.map(() => new THREE.Vector3()),
    footBones = [],
    footInverse = [],
    bodyBones = [];
  let disposed = false,
    ready = false,
    actor,
    mixer,
    actions = [],
    root,
    head,
    headInverse,
    theatre,
    fireworks,
    pipeline,
    resizeKey = "",
    renderKey = "",
    lastTime = 0;
  let rawAudio = [],
    audioBuffers = null,
    audioContext = null,
    audioDestination = null,
    decoding = null,
    desired = null,
    audioFailure = false;
  let audioSources = [],
    audioGains = [],
    audioStarted = 0,
    audioOffset = 0,
    audioRunning = false,
    lastLevels = [];
  function haltAudio() {
    for (const source of audioSources) {
      source.onended = null;
      try {
        source.stop();
      } catch {}
      source.disconnect();
    }
    for (const gain of audioGains) gain.disconnect();
    audioSources = [];
    audioGains = [];
    audioRunning = false;
    lastLevels = [];
  }
  function stopAudio() {
    if (desired) desired = { ...desired, playing: false };
    haltAudio();
  }
  function applyAudio() {
    const request = desired;
    if (
      disposed ||
      !request?.playing ||
      !audioBuffers ||
      audioContext?.state !== "running" ||
      request.time >= DURATION ||
      request.music + request.effects <= 0
    ) {
      haltAudio();
      return;
    }
    const levels = [request.music, request.effects];
    if (!audioSources.length) {
      audioOffset = Math.max(0, Math.min(DURATION - 0.001, request.time));
      audioStarted = audioContext.currentTime;
      audioRunning = true;
      let ended = 0;
      for (const buffer of audioBuffers) {
        const gain = audioContext.createGain(),
          source = audioContext.createBufferSource();
        gain.gain.value = 0;
        gain.connect(audioDestination);
        source.buffer = buffer;
        source.connect(gain);
        source.onended = () => {
          if (++ended === 2) audioRunning = false;
        };
        source.start(audioStarted, audioOffset);
        audioSources.push(source);
        audioGains.push(gain);
      }
    }
    for (let i = 0; i < 2; i++)
      if (lastLevels[i] !== levels[i])
        audioGains[i].gain.setTargetAtTime(
          levels[i],
          audioContext.currentTime,
          0.025,
        );
    lastLevels = levels;
  }
  function prepareAudio(context, output) {
    if (!context || disposed || audioFailure) return Promise.resolve();
    if (context === audioContext && decoding) return decoding;
    haltAudio();
    audioContext = context;
    audioDestination = output;
    audioBuffers = null;
    decoding = Promise.all(
      rawAudio.map((bytes) => context.decodeAudioData(bytes.slice(0))),
    )
      .then((buffers) => {
        if (disposed || audioContext !== context) return;
        audioBuffers = buffers;
        applyAudio();
      })
      .catch((error) => {
        if (!disposed) {
          audioFailure = true;
          haltAudio();
          onAudioError(error);
        }
      });
    return decoding;
  }
  function syncAudio(request) {
    desired = request;
    if (request.context && request.context !== audioContext)
      prepareAudio(request.context, request.output);
    applyAudio();
  }
  function audioTime(fallback) {
    return audioRunning && audioContext?.state === "running"
      ? Math.min(
          DURATION,
          audioOffset + audioContext.currentTime - audioStarted,
        )
      : fallback;
  }
  function audioInspect() {
    return {
      ready: !!audioBuffers,
      running: audioRunning,
      failed: audioFailure,
      time: audioTime(lastTime),
      musicGain: lastLevels[0] ?? 0,
      effectsGain: lastLevels[1] ?? 0,
    };
  }
  const lost = (event) => {
    event.preventDefault();
    ready = false;
    stopAudio();
    onContextLost();
  };
  canvas.addEventListener("webglcontextlost", lost);
  function resize(width, height, pixelRatio) {
    const ratio = Math.min(pixelRatio || 1, 1.5, 1800 / width),
      key = [width, height, ratio].join(":");
    if (key === resizeKey) return;
    resizeKey = key;
    renderKey = "";
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
  }
  function render(
    time,
    width = innerWidth,
    height = innerHeight,
    pixelRatio = devicePixelRatio,
  ) {
    if (disposed || !actor) return;
    time = THREE.MathUtils.clamp(time, 0, DURATION);
    resize(width, height, pixelRatio);
    if (time.toFixed(6) + ":" + resizeKey === renderKey) return;
    if (time >= GLASS_IMPACT_TIME && impactFx.needsCapture()) {
      renderFrame(GLASS_SNAPSHOT_TIME, width, height, pixelRatio);
      impactFx.capture();
    }
    renderFrame(time, width, height, pixelRatio);
    impactFx.render(time, width, height);
  }
  function renderFrame(
    time,
    width = innerWidth,
    height = innerHeight,
    pixelRatio = devicePixelRatio,
  ) {
    if (disposed || !actor) return;
    resize(width, height, pixelRatio);
    time = THREE.MathUtils.clamp(time, 0, DURATION);
    lastTime = time;
    const key = time.toFixed(6) + ":" + resizeKey;
    if (key === renderKey) return;
    renderKey = key;
    attack?.restore();
    for (const action of actions) {
      action.paused = false;
      action.enabled = true;
    }
    mixer.setTime(time);
    actor.updateMatrixWorld(true);
    attack?.apply(time);
    actor.updateMatrixWorld(true);
    root.getWorldPosition(rootPosition);
    head.getWorldPosition(headPosition);
    bodyBones.forEach((bone, i) => {
      bone.getWorldPosition(bodyPoints[i]);
      bone.getWorldQuaternion(bodyFrames[i]);
    });
    footBones.forEach((bone, i) => {
      transform.multiplyMatrices(bone.matrixWorld, footInverse[i]);
      footPoints[i].fromArray(feet[i][1]).applyMatrix4(transform);
    });
    const shot = cameraState(
      time,
      width / height,
      bodyPoints,
      rootPosition,
      headPosition,
    );
    camera.position.fromArray(shot.position);
    camera.fov = shot.fov;
    camera.lookAt(...shot.target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    transform.multiplyMatrices(head.matrixWorld, headInverse);
    mouthPosition.set(0, 0.74, 3.82).applyMatrix4(transform);
    mouthDirection.set(0, 0, 1).transformDirection(transform);
    theatre.update(
      time,
      true,
      headPosition,
      mouthPosition,
      mouthDirection,
      bodyPoints,
      footPoints,
      bodyFrames,
    );
    impactFx.update(time, width, height);
    fireworks.update(
      time,
      camera,
      width,
      height,
      renderer.getPixelRatio(),
      headPosition,
    );
    const tau = (time - 15) * 1.6,
      cut = ease(6.635, 6.65, tau),
      flash = ease(6.61, 6.65, tau) * (1 - ease(6.66, 6.97, tau));
    impactMaterial.opacity = 1 - (1 - cut) * (1 - flash);
    impactMaterial.color
      .setRGB(0.78, 0.9, 0.88)
      .lerp(new THREE.Color("#071117"), ease(6.65, 7, tau));
    if (time >= 19.6) impactMaterial.opacity = 1 - ease(19.6, 20.15, time);
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    impact.scale.set(tan * 0.12 * camera.aspect, tan * 0.12, 1);
    actor.visible = tau < 6.65;
    const rush = ease(4.5, 6.35, tau),
      u = THREE.MathUtils.clamp((tau - 4.5) / 1.85, 0, 1),
      advance =
        1.85 * (u ** 6 - 3 * u ** 5 + 2.5 * u ** 4) + Math.max(0, tau - 6.35),
      distance = 2 * tau + 23 * advance;
    for (let i = 0; i < count; i++) {
      const angle = hash(i + 1300) * Math.PI * 2,
        radius = 2 + hash(i + 1700) * 10,
        z = -36 + ((hash(i + 1900) * 47 + distance) % 47),
        length = 0.07 + 1.1 * rush,
        x = Math.cos(angle) * radius,
        y = 1.45 + Math.sin(angle) * radius * 0.65;
      wind.set([x, y, z, x, y, z - length], i * 6);
    }
    windGeometry.attributes.position.needsUpdate = true;
    windMaterial.opacity = (0.08 + 0.42 * rush) * (1 - ease(6.6, 6.75, tau));
    rushLight.intensity = 9 * rush;
    pipeline.render(scene, camera, time, headPosition, theatre.storm);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    ready = false;
    stopAudio();
    canvas.removeEventListener("webglcontextlost", lost);
    pipeline?.dispose();
    impactFx.dispose();
    attack?.dispose();
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set([env.texture]);
    scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of [].concat(object.material || []))
        materials.add(material);
    });
    for (const material of materials) {
      for (const value of Object.values(material))
        if (value?.isTexture) textures.add(value);
      for (const uniform of Object.values(material.uniforms || {}))
        if (uniform.value?.isTexture) textures.add(uniform.value);
      material.dispose();
    }
    for (const geometry of geometries) geometry.dispose();
    for (const texture of textures) texture.dispose();
    mixer?.stopAllAction();
    if (actor) mixer?.uncacheRoot(actor);
    env.dispose();
    renderer.dispose();
    rawAudio = [];
    audioBuffers = null;
  }
  try {
    const paths = [
      "dragon-show-v14.glb",
      "show-foot-motion-v14.json",
      "theatre-music-v27.wav",
      "theatre-effects-v29.wav",
    ];
    const responses = await Promise.all(
      paths.map((path) =>
        fetch(resolveAsset("./dragon-3d-review/" + path), { signal }).then(
          (response) => {
            if (!response.ok) throw Error("飞龙演出资源未能载入");
            return response;
          },
        ),
      ),
    );
    const [model, footMotion, music, effects] = await Promise.all([
      responses[0].arrayBuffer(),
      responses[1].json(),
      responses[2].arrayBuffer(),
      responses[3].arrayBuffer(),
    ]);
    rawAudio = [music, effects];
    signal?.throwIfAborted();
    const gltf = await new GLTFLoader().parseAsync(model, "");
    signal?.throwIfAborted();
    actor = gltf.scene;
    scene.add(actor);
    if (
      gltf.animations.length !== 1 ||
      Math.abs(gltf.animations[0].duration - DURATION) > 0.001
    )
      throw Error("飞龙动作资源不完整");
    actor.traverse((object) => {
      if (object.isMesh) {
        object.frustumCulled = false;
        for (const material of [].concat(object.material))
          material.envMapIntensity = 0.8;
      }
    });
    root = actor.getObjectByName("root");
    head = actor.getObjectByName("head");
    if (!root || !head) throw Error("飞龙骨骼缺失");
    bodyNames.forEach((name) => {
      const bone = actor.getObjectByName(name);
      if (!bone) throw Error("飞龙躯干缺失");
      bodyBones.push(bone);
    });
    actor.traverse((object) => {
      if (object.isSkinnedMesh && !headInverse) {
        const index = object.skeleton.bones.indexOf(head);
        if (index < 0) return;
        headInverse = object.skeleton.boneInverses[index].clone();
        for (const [name] of feet) {
          const k = object.skeleton.bones.findIndex(
            (bone) =>
              bone.name === THREE.PropertyBinding.sanitizeNodeName(name),
          );
          if (k < 0) throw Error("飞龙足部缺失");
          footBones.push(object.skeleton.bones[k]);
          footInverse.push(object.skeleton.boneInverses[k].clone());
        }
      }
    });
    if (!headInverse) throw Error("飞龙蒙皮缺失");
    attack = createDragonAttack(actor, head, headInverse);
    mixer = new THREE.AnimationMixer(actor);
    actions = gltf.animations.map((clip) => {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      return action;
    });
    function sampleShot(time, aspect) {
      attack?.restore();
      for (const action of actions) {
        action.paused = false;
        action.enabled = true;
      }
      mixer.setTime(time);
      actor.updateMatrixWorld(true);
      const body = bodyBones.map((bone) =>
          bone.getWorldPosition(new THREE.Vector3()),
        ),
        r = root.getWorldPosition(new THREE.Vector3()),
        h = head.getWorldPosition(new THREE.Vector3()),
        shot = cameraState(time, aspect, body, r, h);
      for (const action of actions) {
        action.paused = false;
        action.enabled = true;
      }
      mixer.setTime(lastTime);
      actor.updateMatrixWorld(true);
      attack?.apply(lastTime);
      actor.updateMatrixWorld(true);
      return shot;
    }
    theatre = createDragonStage(scene, camera, footMotion);
    fireworks = createDragonFireworks(scene, sampleShot);
    pipeline = createDragonPipeline(renderer);
    render(10.57);
    await renderer.compileAsync(scene, camera);
    for (const time of [1.8, 8.9, 19.125, 0]) {
      await new Promise(requestAnimationFrame);
      signal?.throwIfAborted();
      render(time);
    }
    ready = true;
    return {
      render,
      dispose,
      prepareAudio,
      syncAudio,
      stopAudio,
      audioTime,
      audioInspect,
      get ready() {
        return ready && !disposed;
      },
      inspect() {
        return {
          revision: 29,
          choreography: 14,
          duration: DURATION,
          joints: 46,
          meshes: 4,
          climax: [15, 19.6],
          audio: "user-roar-and-thunder-balanced-v2",
          renderer: renderer.capabilities.isWebGL2 ? "WebGL2" : "WebGL",
          storm: theatre.stats,
          fireworks: fireworks.stats,
          pipeline: pipeline.stats,
          screenImpact: impactFx.stats,
          attack: attack?.inspect(),
          glassSound: "user-final-crash-v28",
        };
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
