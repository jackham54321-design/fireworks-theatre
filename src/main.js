import {makeAcceptedRoseRuntime} from './rose-renderer.js';
import { createAudioController } from "./audio.js";
export function createTheatre(initialAssets) {
  // One transport owns rendering, input, show lifecycle and user-activated audio.
  const $ = (id) => document.getElementById(id);
  const canvas = $("stage"),
    ctx = canvas.getContext("2d", { alpha: false });
  const backdrop = document.createElement("canvas"),
    bg = backdrop.getContext("2d");
  const light = document.createElement("canvas"),
    fx = light.getContext("2d");
  const nearCanvas = $("nearStage"),
    nearFx = nearCanvas.getContext("2d");
  const video = $("camera");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const state = {
    effect: "gold",
    palette: "gold",
    view: "2d",
    curved: false,
    paused: false,
    auto: !reduced.matches,
    density: 2,
    quality: "auto",
    sound: false,
    immersed: false,
    slow: false,
    wind: 0.2,
  };
  const depthView = { x: 0, y: 0, aimX: 0, aimY: 0 };
  let depthDirty = false;
  let depthShapeBag = [],
    lastDepthShape = null,
    depthRouteBag = [],
    lastDepthRoute = -1;
  let w = innerWidth,
    h = innerHeight,
    dpr = 1,
    horizon = 0,
    clock = 0,
    lastFrame = 0,
    nextAuto = 0.25,
    chapter = -1;
  let particles = [],
    rockets = [],
    ordinaryComets = [],
    flashes = [],
    pending = [],
    meteors = [],
    skyPaths = [],
    pointer = null,
    specialUntil = 0,
    specialCaption = null,
    textCloud = null,
    wishSerial = 0,
    frameAverage = 16.7,
    adaptive = 1,
    slowFrames = 0;
  let story = null;
  let encounter = null;
  let compactControls = null;
  let ordinaryGpu = null,
    ordinaryGpuUnavailable = false,
    loveGpuFrame = null,
    loveCurvedPetals = [];
  let stream = null,
    landmarker = null,
    cameraState = "off",
    cameraSession = 0,
    lastVideoTime = -1,
    lastDetect = 0,
    handMarks = [],
    lastFinale = -10;
  const handMemory = new Map(),
    spriteCache = new Map();
  let handTrackId = 0,
    lastHandsAt = null,
    handDetectionCost = 0;
  const dualGesture = {
    hold: 0,
    pair: "",
    wasValid: false,
    lastValid: null,
    latched: false,
    releaseSince: null,
    lastAt: -Infinity,
    fired: false,
  };
  const TAU = Math.PI * 2,
    rand = (a, b) => a + Math.random() * (b - a),
    clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const palettes = {
    gold: [38, 44, 48],
    blue: [190, 204, 217],
    pink: [282, 306, 332],
    red: [346, 354, 4],
    green: [133, 150, 165],
    rainbow: [0, 28, 52, 105, 150, 185, 218, 265, 300, 330],
  };
  const paletteInk = {
    gold: ["237,206,145", "#edce91"],
    blue: ["167,219,246", "#a7dbf6"],
    pink: ["220,179,233", "#dcb3e9"],
    red: ["255,139,157", "#ff8b9d"],
    green: ["133,239,187", "#85efbb"],
    rainbow: ["211,185,246", "#d3b9f6"],
  };
  const effectNames = {
    gold: "金尘 · 柳丝余烬",
    star: "星屑 · 棱光闪耀",
    frost: "霜晶 · 六角枝雪",
    petal: "花瓣 · 薄樱随风",
    butterfly: "焰蝶 · 光翼翩跹",
    mix: "混合 · 五重光影合奏",
  };
  const materialTypes = ["gold", "star", "frost", "petal", "butterfly"];
  const materialSpecs = {
    gold: { count: 315, life: [2.8, 4.6], size: [0.8, 1.55], speed: 175 },
    star: { count: 90, life: [2.5, 4.2], size: [13, 23], speed: 155 },
    frost: { count: 64, life: [4.7, 7], size: [18, 32], speed: 185 },
    petal: { count: 66, life: [4.8, 7.5], size: [19, 35], speed: 155 },
    butterfly: { count: 42, life: [4.8, 6.8], size: [28, 43], speed: 155 },
  };
  const materialLifetime = (type, seconds) =>
    seconds * (type === "petal" || type === "butterfly" ? 0.75 : 1);
  const spectacular = () =>
    state.effect === "mix" && state.palette === "rainbow";
  const chapters = [
    ["序章", "夜色初燃"],
    ["渐起", "星河有信"],
    ["盛放", "万千光芒"],
    ["余韵", "把美好留在此刻"],
  ];
  const hue = () => {
    const p = palettes[state.palette];
    return p[Math.floor(Math.random() * p.length)] + rand(-7, 7);
  };
  const preferencesKey = "fireworks-theater:preferences:v1";
  const soundPreferences = {
    music: true,
    effects: true,
    musicVolume: 0.5,
    effectsVolume: 0.8,
    followShows: true,
  };
  const scoreTracks = {
    moonlight: {
      title: "Moonlight",
      subtitle: "钢琴与弦乐",
      page: "moonlight",
      balanceDb: -6.54,
    },
    hope: {
      title: "A Kind Of Hope",
      subtitle: "温暖钢琴 · 希望与心意",
      page: "a-kind-of-hope",
      balanceDb: -0.34,
    },
    computations: {
      title: "Computations in a Snowstorm",
      subtitle: "电子氛围 · 宇宙漫游",
      page: "computations",
      balanceDb: -2.32,
    },
    snowfall: {
      title: "Snowfall",
      subtitle: "空灵钢琴 · 星光飘落",
      page: "snowfall",
      balanceDb: -3.35,
    },
    signal: {
      title: "Signal to Noise",
      subtitle: "大提琴与电子 · 穿行夜色",
      page: "signal-to-noise",
      balanceDb: -2.78,
    },
    childhood: {
      title: "Childhood",
      subtitle: "纯真钢琴 · 童话启程",
      page: "childhood",
      balanceDb: -3.56,
    },
    celestial: {
      title: "Celestial",
      subtitle: "梦幻管弦 · 星境穿行",
      page: "celestial",
      balanceDb: -3.19,
    },
    reverie: {
      title: "Reverie",
      subtitle: "梦境钢琴 · 柔光与弦乐",
      page: "reverie",
      balanceDb: -4.37,
    },
    titan: {
      title: "Titan",
      subtitle: "恢宏管弦 · 群星齐放",
      page: "titan",
      balanceDb: -3.03,
    },
  };
  const scoreScenes = {
    ambient: { track: "moonlight", cue: 0 },
    heart: { track: "hope", cue: 0 },
    wish: { track: "hope", cue: 0 },
    orbit: { track: "computations", cue: 0 },
    meteor: { track: "snowfall", cue: 0 },
    depth: { track: "signal", cue: 0 },
    classic: { track: "childhood", cue: 0 },
    immersive: { track: "celestial", cue: 0 },
    love: { track: "reverie", cue: 0 },
    finale: { track: "titan", cue: 0 },
    phoenix: { track: "titan", cue: 0 },
  };
  function restorePreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem(preferencesKey));
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) return;
      if (
        typeof saved.effect === "string" &&
        Object.hasOwn(effectNames, saved.effect)
      )
        state.effect = saved.effect;
      if (
        typeof saved.palette === "string" &&
        Object.hasOwn(palettes, saved.palette)
      )
        state.palette = saved.palette;
      if (typeof saved.auto === "boolean") state.auto = saved.auto;
      if (saved.view === "2d" || saved.view === "3d") state.view = saved.view;
      if (typeof saved.curved === "boolean") state.curved = saved.curved;
      if (saved.audio && typeof saved.audio === "object") {
        for (const key of ["music", "effects", "followShows"])
          if (typeof saved.audio[key] === "boolean")
            soundPreferences[key] = saved.audio[key];
        for (const key of ["musicVolume", "effectsVolume"])
          if (Number.isFinite(saved.audio[key]))
            soundPreferences[key] = clamp(saved.audio[key], 0, 1);
      }
    } catch {}
  }
  function savePreferences() {
    try {
      localStorage.setItem(
        preferencesKey,
        JSON.stringify({
          effect: state.effect,
          palette: state.palette,
          auto: state.auto,
          view: state.view,
          curved: state.curved,
          audio: soundPreferences,
        }),
      );
    } catch {}
  }
  function syncAppearance() {
    document
      .querySelectorAll("[data-effect]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.effect === state.effect),
        ),
      );
    document
      .querySelectorAll("[data-palette]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.palette === state.palette),
        ),
      );
    const [rgb, ink] = paletteInk[state.palette];
    document.documentElement.style.setProperty("--accent", rgb);
    document.documentElement.style.setProperty("--gold", ink);
  }
  function setViewMode(mode, remember = true) {
    if (mode !== "2d" && mode !== "3d") return;
    const leaveDragon = mode === "2d" && phoenix?.mode === "dragon";
    if (leaveDragon) stopPhoenixShow();
    state.view = mode;
    if (mode === "2d")
      for (const p of particles)
        if (p.spatial) {
          p.vx = p.spatial.vx * (p.projectedScale || 1);
          p.vy = p.spatial.vy * (p.projectedScale || 1);
          delete p.spatial;
          p.projectedScale = 1;
          p.renderZ = 0;
          p.depthAlpha = 1;
        }
    $("view2dBtn").setAttribute("aria-pressed", String(mode === "2d"));
    $("view3dBtn").setAttribute("aria-pressed", String(mode === "3d"));
    $("depthBurstBtn").hidden = mode !== "3d";
    $("depthNote").hidden = mode === "3d";
    $("depthFrame").hidden = mode !== "3d";
    document.body.classList.toggle("depth-mode", mode === "3d");
    syncTrajectoryCopy();
    syncProgrammeUI();
    depthView.x = depthView.y = depthView.aimX = depthView.aimY = 0;
    depthDirty = true;
    if (remember) savePreferences();
    updateCaption();
    if (leaveDragon) $("aliceStoryBtn").focus();
  }
  function syncProgrammeUI() {
    $("dragonShowBtn").hidden = state.view !== "3d";
    const spatial = state.view === "3d";
    $("aliceProgrammeMeta").textContent = (spatial ? "3D" : "2D") + " · 90 秒";
    $("phoenixProgrammeMeta").textContent =
      (spatial ? "3D · 27" : "2D · 22") + " 秒";
    $("aliceStoryBtn").setAttribute(
      "aria-label",
      "开演：爱丽丝梦游仙境，" + (spatial ? "3D 临境" : "2D 平面") + "，90 秒",
    );
    $("phoenixShowBtn").setAttribute(
      "aria-label",
      "开演：凤舞九天，" + (spatial ? "3D 火凤，27 秒" : "2D 凤舞，22 秒"),
    );
  }
  function syncTrajectoryCopy() {
    $("trajectoryInput").checked = state.curved;
    $("wishIntro").innerHTML =
      state.view === "3d"
        ? `一字一枚彗星焰弹，沿不同方向的${state.curved ? "曲线" : "直线"}飞近。<br>按顺序爆开，由你选中的粒子组成祝福。`
        : "一字一朵礼花，依次升空绽放。<br>让星环、花雨和流光，为你的祝福伴演。";
  }
  const depthFocal = () => clamp(Math.min(w, h) * 0.9, 330, 700);
  function projectDepth(s) {
    const yaw = depthView.x,
      pitch = depthView.y,
      x = s.x * Math.cos(yaw) + s.z * Math.sin(yaw),
      z = s.z * Math.cos(yaw) - s.x * Math.sin(yaw),
      y = s.y * Math.cos(pitch) - z * Math.sin(pitch),
      rz = s.y * Math.sin(pitch) + z * Math.cos(pitch),
      focal = depthFocal(),
      distance = focal + rz;
    if (distance < focal * 0.16) return null;
    const scale = focal / distance;
    return {
      x: s.cx + x * scale,
      y: s.cy + y * scale,
      scale,
      z: rz,
      alpha:
        clamp((distance / focal - 0.16) / 0.22, 0, 1) *
        clamp(0.42 + scale * 0.58, 0.5, 1),
    };
  }
  function advanceDepth(p, dt, wind) {
    const s = p.spatial;
    s.age += dt;
    if (s.formation) {
      const age = s.age,
        bloom = 1 - Math.exp(-age * 7),
        pulse = s.formation === 1 ? 1 + Math.sin(age * 5.8) * 0.035 : 1,
        yaw =
          s.yaw +
          (s.formation === 1
            ? Math.sin(age * 0.8 - 0.9) * s.spin
            : age * s.spin),
        pitch = s.pitch + (s.formation === 4 ? age * s.phase : 0),
        roll = s.roll;
      const lx = s.gx * pulse,
        ly =
          s.formation === 2
            ? s.gy * (1 + Math.sin(age * 7 + s.phase) * 0.13)
            : s.gy,
        lz = s.gz;
      const ax = lx * Math.cos(yaw) + lz * Math.sin(yaw),
        az = lz * Math.cos(yaw) - lx * Math.sin(yaw),
        ay = ly * Math.cos(pitch) - az * Math.sin(pitch),
        bz = ly * Math.sin(pitch) + az * Math.cos(pitch),
        scatter = Math.max(0, age - 2.15) ** 2 * 0.3;
      s.x =
        (ax * Math.cos(roll) - ay * Math.sin(roll) + s.ox) * bloom +
        s.vx * scatter;
      s.y =
        (ax * Math.sin(roll) + ay * Math.cos(roll) + s.oy) * bloom +
        s.vy * scatter -
        age * s.rise;
      s.z = (bz + s.oz) * bloom + s.vz * scatter;
    } else if (s.ring) {
      const a = s.angle + s.age * s.spin,
        r = s.radius * (1 - Math.exp(-s.age * 2.4)),
        tilt = s.tilt + Math.sin(s.age * 0.4) * 0.12,
        turn = s.turn + s.age * 0.13;
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r * Math.cos(tilt);
      s.x = x * Math.cos(turn) - y * Math.sin(turn);
      s.y = x * Math.sin(turn) + y * Math.cos(turn);
      s.z =
        (s.baseZ || 0) +
        Math.sin(a) * r * Math.sin(tilt) * (s.depthStretch || 1);
    } else {
      const drag = Math.exp(-dt * p.drag);
      s.vx *= drag;
      s.vy = s.vy * drag + p.gravity * dt;
      s.vz *= Math.exp(-dt * (p.shape === "tunnel" ? 0.07 : 0.16));
      s.x += (s.vx + wind) * dt;
      s.y +=
        (s.vy +
          (p.type === "butterfly" ? Math.sin(clock * 3 + p.seed) * 8 : 0)) *
        dt;
      s.z += s.vz * dt;
    }
    const point = projectDepth(s);
    if (!point) return false;
    p.x = point.x;
    p.y = point.y;
    p.projectedScale = point.scale;
    p.renderZ = point.z;
    p.depthAlpha =
      point.alpha *
      (s.gestureOrbit || s.formation === 4
        ? clamp(0.78 + (point.scale - 1) * 1.1, 0.45, 1)
        : 1);
    return p.x > -w * 0.55 && p.x < w * 1.55 && p.y > -h * 0.6 && p.y < h * 1.5;
  }
  function quality() {
    return state.quality === "high"
      ? 1.25
      : state.quality === "low"
        ? 0.58
        : adaptive;
  }
  function maxParticles() {
    return Math.round(4000 * quality());
  }
  function notify(message) {
    $("toast").textContent = message;
    $("toast").hidden = false;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => ($("toast").hidden = true), 4500);
  }
  function seeded(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  function resize() {
    const previousWidth = w || innerWidth,
      previousHeight = h || innerHeight,
      liveFlights = rockets.slice(),
      liveComets = ordinaryComets.slice();
    w = innerWidth;
    h = innerHeight;
    horizon = h * (w < h ? 0.64 : 0.675);
    dpr = Math.min(
      devicePixelRatio || 1,
      state.quality === "low"
        ? 1
        : textCloud?.kind === "love" && state.quality === "auto"
          ? 1.35
          : 1.7,
    );
    // Keep lettering at full resolution; translucent particle layers need fewer pixels on small screens.
    const compact = w <= 760 || (h <= 560 && w <= 1024),
      effectRatio =
        compact && state.quality !== "high" ? Math.min(dpr, 1.15) : dpr;
    for (const c of [canvas, backdrop]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    for (const c of [light, nearCanvas]) {
      c.width = Math.round(w * effectRatio);
      c.height = Math.round(h * effectRatio);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bg.setTransform(dpr, 0, 0, dpr, 0, 0);
    fx.setTransform(effectRatio, 0, 0, effectRatio, 0, 0);
    nearFx.setTransform(effectRatio, 0, 0, effectRatio, 0, 0);
    fx.clearRect(0, 0, w, h);
    pointer = null;
    drawBackdrop();
    if (textCloud) layoutWish(textCloud);
    else if (wish && !phoenix) createText();
    // Rotation changes the stage, never the running flight's age or its launch schedule.
    rockets = liveFlights;
    ordinaryComets = liveComets;
    const rx = w / previousWidth,
      ry = h / previousHeight;
    // Keep burst lifetimes and paths intact when rotating or resizing the viewport.
    const sceneScale = Math.min(w, h) / Math.min(previousWidth, previousHeight);
    for (const p of particles) {
      const oldX = p.x,
        oldY = p.y;
      for (const key of ["x", "px", "vx"]) p[key] *= rx;
      for (const key of ["y", "py", "vy"]) p[key] *= ry;
      const space = p.spatial || p.orbit;
      if (space) {
        space.cx *= rx;
        space.cy *= ry;
        for (const key of [
          "x",
          "y",
          "z",
          "vx",
          "vy",
          "vz",
          "radius",
          "baseZ",
          "gx",
          "gy",
          "gz",
          "ox",
          "oy",
          "oz",
          "rise",
        ])
          if (Number.isFinite(space[key])) space[key] *= sceneScale;
        const projected = p.spatial
          ? projectDepth(space)
          : { x: space.cx + space.x, y: space.cy + space.y, scale: 1 };
        if (projected) {
          const trailScale =
            (sceneScale * projected.scale) / (p.projectedScale || 1);
          for (const point of p.history || []) {
            point.x = projected.x + (point.x - oldX) * trailScale;
            point.y = projected.y + (point.y - oldY) * trailScale;
          }
          p.x = p.px = projected.x;
          p.y = p.py = projected.y;
        }
      } else
        for (const point of p.history || []) {
          point.x *= rx;
          point.y *= ry;
        }
    }
    for (const f of flashes) {
      f.x *= rx;
      f.y *= ry;
    }
    for (const m of meteors) {
      for (const key of ["x", "sx", "ex"]) m[key] *= rx;
      for (const key of ["y", "sy", "ey"]) m[key] *= ry;
    }
    for (const path of skyPaths)
      for (const point of path.points) {
        point.x *= rx;
        point.y *= ry;
      }
    depthDirty = true;
    for (const r of new Set([...rockets, ...ordinaryComets])) {
      for (const key of ["x", "sx", "tx"]) r[key] *= rx;
      for (const key of ["y", "sy", "ty"]) r[key] *= ry;
      if (r.route) {
        for (const key of ["sx", "c1x", "c2x"]) r.route[key] *= rx;
        for (const key of ["sy", "c1y", "c2y"]) r.route[key] *= ry;
      }
      if (r.wishGlyph !== null && textCloud?.id === r.wishId) {
        const g = textCloud.glyphs[r.wishGlyph];
        if (g) {
          r.tx = g.x;
          r.ty = g.y;
          g.comet = r;
        }
      }
    }
    if (textCloud?.kind === "love")
      for (const r of rockets)
        if (r.roseCue) {
          const p = r.roseCue.finale
            ? loveFinalFlowerPose(r.roseCue.rank)
            : acceptedRoseAnchor(r.roseCue.rank, 13 + r.roseCue.rank * 0.65);
          r.tx = p.x;
          r.ty = p.y;
        }
    if (encounter) depthDirty = true;
    if (story) {
      depthDirty = true;
      syncStoryUI(true);
    }
    syncCompactControls();
    syncLandscapeUI();
    syncWishKeyboard();
    for (const r of new Set([...rockets, ...ordinaryComets]))
      if (!r.curved) {
        r.sx = r.tx;
        r.sy = h + 12;
        if (r.route) {
          r.route.sx = r.tx;
          r.route.sy = r.sy;
        }
        const p = depthShellPoint(r);
        r.x = p.x;
        r.y = p.y;
      }
  }
  function drawBackdrop() {
    const rng = seeded(19389),
      sky = bg.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#040914");
    sky.addColorStop(0.65, "#091222");
    sky.addColorStop(1, "#1a2335");
    bg.fillStyle = sky;
    bg.fillRect(0, 0, w, horizon);
    const haze = bg.createRadialGradient(
      w * 0.51,
      horizon,
      0,
      w * 0.51,
      horizon,
      w * 0.7,
    );
    haze.addColorStop(0, `rgba(${paletteInk[state.palette][0]},.055)`);
    haze.addColorStop(1, "#1a233000");
    bg.fillStyle = haze;
    bg.fillRect(0, 0, w, horizon);
    for (let i = 0; i < Math.min(210, w * 0.15); i++) {
      const x = rng() * w,
        y = 30 + rng() * horizon * 0.91,
        r = rng() < 0.95 ? 0.5 : 1;
      bg.fillStyle = `rgba(192,211,241,${0.1 + rng() * 0.42})`;
      bg.beginPath();
      bg.arc(x, y, r, 0, TAU);
      bg.fill();
    }
    const water = bg.createLinearGradient(0, horizon, 0, h);
    water.addColorStop(0, "#0e1b2a");
    water.addColorStop(0.5, "#0a1525");
    water.addColorStop(1, "#060e1a");
    bg.fillStyle = water;
    bg.fillRect(0, horizon, w, h - horizon);
    const city = document.createElement("canvas");
    city.width = backdrop.width;
    city.height = backdrop.height;
    const c = city.getContext("2d");
    c.scale(dpr, dpr);
    for (let layer = 0; layer < 2; layer++) {
      let x = -8;
      while (x < w + 10) {
        const bw = randSeed(12, 44),
          bh = randSeed(11, layer ? 57 : 73) * (h / 720),
          y = horizon - bh + (layer ? 4 : -9);
        c.fillStyle = layer ? "#050a12" : "#0b1320";
        c.fillRect(x, y, bw, bh + 12);
        if (rng() > 0.72) {
          c.fillRect(x + bw * 0.17, y - 4, bw * 0.6, 4);
          if (rng() > 0.6) {
            c.fillStyle = "#35404e";
            c.fillRect(x + bw * 0.5, y - 15, 1, 11);
          }
        }
        for (let wx = x + 4; wx < x + bw - 2; wx += 6)
          for (let wy = y + 6; wy < horizon - 3; wy += 7)
            if (rng() > 0.84) {
              c.fillStyle = rng() > 0.5 ? "#a6a18a55" : "#60829444";
              c.fillRect(wx, wy, 1.4, 1.8);
            }
        x += bw - 1;
      }
    }
    bg.drawImage(city, 0, 0, w, h);
    bg.save();
    bg.translate(0, horizon * 1.65);
    bg.scale(1, -0.65);
    bg.globalAlpha = 0.27;
    bg.drawImage(city, 0, 0, w, h);
    bg.restore();
    bg.strokeStyle = "#455b7114";
    bg.lineWidth = 0.5;
    for (let y = horizon + 3; y < h; y += 2.5 + (y - horizon) * 0.012) {
      bg.beginPath();
      bg.moveTo(0, y);
      bg.lineTo(w, y);
      bg.stroke();
    }
    const vignette = bg.createRadialGradient(
      w * 0.5,
      h * 0.45,
      w * 0.18,
      w * 0.5,
      h * 0.45,
      w * 0.73,
    );
    vignette.addColorStop(0, "#00000000");
    vignette.addColorStop(1, "#01040b7a");
    bg.fillStyle = vignette;
    bg.fillRect(0, 0, w, h);
    function randSeed(a, b) {
      return a + rng() * (b - a);
    }
  }
  // Separate materials, rather than the same blurred point with four symbols.
  function sprite(hueValue, type, variant = 0) {
    const rounded = (((Math.round(hueValue / 15) * 15) % 360) + 360) % 360,
      key =
        rounded +
        type +
        (type === "gold" || type === "petal" || type === "butterfly"
          ? 0
          : variant);
    if (spriteCache.has(key)) return spriteCache.get(key);
    const s = document.createElement("canvas");
    s.width = s.height = 128;
    const c = s.getContext("2d");
    const H = (sat, light, alpha = 1) =>
      `hsla(${rounded},${sat}%,${light}%,${alpha})`;
    if (type === "gold") {
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 54);
      g.addColorStop(0, "#fffbed");
      g.addColorStop(0.07, H(92, 89));
      g.addColorStop(0.22, H(90, 66, 0.38));
      g.addColorStop(0.6, H(90, 55, 0.06));
      g.addColorStop(1, H(90, 50, 0));
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
    } else if (type === "star") {
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 43);
      g.addColorStop(0, "#fff");
      g.addColorStop(0.12, H(60, 92, 0.6));
      g.addColorStop(0.38, H(60, 80, 0.08));
      g.addColorStop(1, H(60, 80, 0));
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
      c.translate(64, 64);
      c.rotate(variant * 0.19);
      c.fillStyle = H(55, 90, 0.8);
      c.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i * TAU) / 16,
          r = i % 2 ? 2.2 : i % 4 ? 19 : 49;
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath();
      c.fill();
      c.fillStyle = "#fffef8";
      c.beginPath();
      c.arc(0, 0, 3, 0, TAU);
      c.fill();
    } else if (type === "frost") {
      c.translate(64, 64);
      const arm = 43 + variant * 4;
      for (let i = 0; i < 6; i++) {
        c.save();
        c.rotate((i * TAU) / 6);
        c.strokeStyle = H(28, 88, 0.9);
        c.lineWidth = 1.7;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(0, -arm);
        for (const fraction of [0.29, 0.47, 0.65, 0.82]) {
          const y = -arm * fraction,
            len = arm * (1 - fraction) * 0.43;
          for (const sign of [-1, 1]) {
            c.moveTo(0, y);
            c.lineTo(sign * len, y - len * 0.85);
            if (fraction < 0.7) {
              c.moveTo(sign * len * 0.58, y - len * 0.49);
              c.lineTo(sign * (len * 0.58 + 4), y - len * 0.49 - 7);
            }
          }
        }
        c.stroke();
        c.strokeStyle = "#f6fdff";
        c.lineWidth = 0.65;
        c.beginPath();
        c.moveTo(-0.7, -arm * 0.12);
        c.lineTo(-0.7, -arm);
        c.stroke();
        c.restore();
      }
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6 - Math.PI / 2;
        c.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
      }
      c.closePath();
      c.fillStyle = H(32, 88, 0.16);
      c.fill();
      c.strokeStyle = H(30, 96, 0.65);
      c.lineWidth = 1;
      c.stroke();
    } else if (type === "petal") {
      // A translucent, notched petal with curved veins and a shaded folded edge.
      c.beginPath();
      c.moveTo(62, 116);
      c.bezierCurveTo(39, 91, 14, 61, 24, 29);
      c.bezierCurveTo(29, 10, 48, 13, 61, 27);
      c.bezierCurveTo(70, 9, 94, 14, 100, 33);
      c.bezierCurveTo(110, 67, 82, 101, 62, 116);
      c.closePath();
      const g = c.createLinearGradient(28, 20, 86, 116);
      g.addColorStop(0, H(62, 91, 0.88));
      g.addColorStop(0.3, H(55, 83, 0.94));
      g.addColorStop(0.63, H(48, 72, 0.87));
      g.addColorStop(1, H(58, 49, 0.72));
      c.fillStyle = g;
      c.fill();
      c.save();
      c.clip();
      const shine = c.createRadialGradient(43, 38, 2, 50, 52, 63);
      shine.addColorStop(0, "#ffffff5c");
      shine.addColorStop(1, "#ffffff00");
      c.fillStyle = shine;
      c.fillRect(0, 0, 128, 128);
      c.strokeStyle = H(60, 49, 0.2);
      c.lineWidth = 0.8;
      for (let j = 0; j < 5; j++) {
        c.beginPath();
        c.moveTo(62, 113);
        c.bezierCurveTo(64 + j * 4, 77, 30 + j * 14, 50, 34 + j * 14, 26);
        c.stroke();
      }
      c.strokeStyle = "#fff8";
      c.lineWidth = 1.1;
      c.beginPath();
      c.moveTo(26, 30);
      c.bezierCurveTo(17, 60, 43, 95, 61, 113);
      c.stroke();
      c.restore();
    } else if (type === "butterfly") {
      c.translate(64, 65);
      for (const side of [-1, 1]) {
        c.save();
        c.scale(side, 1);
        c.beginPath();
        c.moveTo(1, -3);
        c.bezierCurveTo(10, -24, 26, -49, 45, -45);
        c.bezierCurveTo(57, -42, 52, -19, 43, -8);
        c.bezierCurveTo(48, 8, 42, 28, 29, 31);
        c.bezierCurveTo(17, 33, 7, 16, 1, 3);
        c.closePath();
        const g = c.createLinearGradient(0, 0, 48, -28);
        g.addColorStop(0, H(95, 91, 0.92));
        g.addColorStop(0.27, H(88, 67, 0.92));
        g.addColorStop(0.7, `hsla(${rounded + 32},88%,61%,.86)`);
        g.addColorStop(1, H(85, 82, 0.88));
        c.fillStyle = g;
        c.fill();
        c.strokeStyle = H(75, 92, 0.8);
        c.lineWidth = 1.1;
        c.stroke();
        c.save();
        c.clip();
        c.strokeStyle = H(60, 97, 0.45);
        c.lineWidth = 0.85;
        for (const [tx, ty] of [
          [45, -43],
          [49, -23],
          [41, -6],
          [38, 15],
          [28, 28],
        ]) {
          c.beginPath();
          c.moveTo(1, 0);
          c.quadraticCurveTo(16, ty * 0.22, tx, ty);
          c.stroke();
        }
        c.fillStyle = "#fff9";
        for (let j = 0; j < 5; j++) {
          const angle = -1.2 + j * 0.43;
          c.beginPath();
          c.ellipse(
            34 + Math.cos(angle) * 8,
            -10 + Math.sin(angle) * 20,
            1.4,
            2.3,
            0.3,
            0,
            TAU,
          );
          c.fill();
        }
        c.restore();
        c.restore();
      }
      c.strokeStyle = "#fff5dd";
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(0, -9);
      c.lineTo(0, 15);
      c.moveTo(0, -8);
      c.quadraticCurveTo(-2, -18, -7, -20);
      c.moveTo(0, -8);
      c.quadraticCurveTo(2, -18, 7, -20);
      c.stroke();
    }
    if (spriteCache.size > 240)
      spriteCache.delete(spriteCache.keys().next().value);
    spriteCache.set(key, s);
    return s;
  }
  function addParticle(p) {
    if (particles.length >= maxParticles()) return;
    p.life = materialLifetime(p.type, p.life);
    p.max = materialLifetime(p.type, p.max);
    p.rotation ??= rand(0, TAU);
    p.spin ??= p.type === "butterfly" ? rand(-0.35, 0.35) : rand(-1.3, 1.3);
    p.variant ??= Math.floor(rand(0, 3));
    p.depth ??= rand(0.65, 1);
    p.drag ??=
      p.type === "gold"
        ? 0.58
        : p.type === "star"
          ? 0.85
          : p.type === "frost"
            ? 1.65
            : p.type === "butterfly"
              ? 0.8
              : 1.1;
    p.gravity ??=
      p.type === "gold"
        ? 32
        : p.type === "star"
          ? 17
          : p.type === "butterfly"
            ? -2
            : 14;
    p.history ??= [];
    particles.push(p);
  }
  function handBloom(gesture, x, y) {
    if (gesture === "open")
      burst(x, y, hue(), state.effect, w < 700 ? 0.95 : 1.05, "sphere", {
        noEcho: true,
      });
    else if (gesture === "peace")
      burst(x, y, hue(), state.effect, 0.94, "ring", { orbitOnly: true });
    else if (gesture === "point") launch(x, y);
    else if (gesture === "pinch")
      for (let j = 0; j < 6; j++) {
        const type =
            state.effect === "mix"
              ? materialTypes[j % materialTypes.length]
              : state.effect,
          spec = materialSpecs[type],
          life = type === "gold" ? 1 : 1.6;
        addParticle({
          x,
          y,
          px: x,
          py: y,
          vx: rand(-45, 45),
          vy: rand(-40, 20),
          life,
          max: life,
          hue: hue(),
          size: type === "gold" ? 0.8 : rand(...spec.size) * 0.55,
          type,
          seed: j,
          gravity: 22,
          trail: type === "gold" || type === "butterfly",
        });
      }
    else if (["fingerheart", "dj", "thumbsup", "shaka"].includes(gesture))
      gestureFirework(gesture, x, y);
  }
  function gestureFirework(gesture, x, y) {
    if (
      state.view === "3d" &&
      ["fingerheart", "dj", "thumbsup", "shaka"].includes(gesture)
    ) {
      gestureSculpture(gesture, x, y);
      return;
    }
    const radius = Math.min(w * 0.23, horizon * 0.25, 166),
      density = quality(),
      spatial = state.view === "3d";
    x = clamp(x, radius + 18, w - radius - 18);
    y = clamp(y, radius + 28, horizon - radius * 0.7 - 12);
    // All four signatures share the existing particle renderer, budget, lifetime and pause clock.
    const emit = (
      dx,
      dy,
      z,
      vx,
      vy,
      vz,
      color,
      type = "star",
      size = 1.6,
      life = 2.4,
    ) => {
      type = state.effect === "mix" ? type : state.effect;
      if (type !== "gold") size *= 6;
      const px = x + dx,
        py = y + dy,
        p = {
          x: px,
          y: py,
          px,
          py,
          vx,
          vy,
          life,
          max: life,
          hue: color,
          size,
          type,
          seed: rand(0, 100),
          trail: type === "gold" || type === "butterfly",
          split: false,
          drag: 0.7,
          gravity: 6,
          gesture,
        };
      if (spatial)
        p.spatial = { cx: x, cy: y, x: dx, y: dy, z, vx, vy, vz, age: 0 };
      addParticle(p);
    };
    if (gesture === "fingerheart") {
      for (let side = -1; side <= 1; side += 2) {
        const count = Math.round(110 * density);
        for (let i = 0; i < count; i++) {
          const a = (i / count) * TAU,
            dx = (16 * Math.sin(a) ** 3) / 17,
            dy =
              -(
                13 * Math.cos(a) -
                5 * Math.cos(2 * a) -
                2 * Math.cos(3 * a) -
                Math.cos(4 * a)
              ) / 17;
          const r = radius * 0.52,
            offset = side * radius * 0.5;
          emit(
            dx * r + offset,
            dy * r,
            side * 36 + Math.sin(a) * 12,
            dx * 24 + side * 5,
            dy * 24 - 6,
            side * 8,
            side < 0 ? 342 : 26,
            i % 5 ? "petal" : "gold",
            i % 5 ? 1.7 : 1.05,
            2.7,
          );
        }
      }
      const count = Math.round(48 * density);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU;
        emit(
          Math.cos(a) * radius * 0.9,
          Math.sin(a) * radius * 0.26 + radius * 0.3,
          Math.sin(a) * 70,
          Math.cos(a) * 15,
          -7,
          Math.sin(a) * 15,
          42,
          "gold",
          0.9,
          2.8,
        );
      }
    } else if (gesture === "dj") {
      const heights = [0.38, 0.66, 0.9, 0.57, 1, 0.72, 0.88, 0.52, 0.35],
        steps = Math.round(15 * density);
      heights.forEach((height, col) => {
        for (let j = 0; j < steps; j++) {
          const t = j / (steps - 1),
            dx = (col - 4) * radius * 0.205,
            dy = radius * 0.48 - t * radius * height;
          emit(
            dx,
            dy,
            (col % 2 ? 1 : -1) * 28,
            dx * 0.08,
            -12 - t * 16,
            (col - 4) * 2,
            184 + col * 12,
            j % 3 ? "gold" : "star",
            j % 3 ? 1.25 : 2,
            2.35,
          );
        }
      });
      const count = Math.round(94 * density);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU;
        emit(
          Math.cos(a) * radius,
          Math.sin(a) * radius * 0.27 + radius * 0.55,
          Math.sin(a) * radius * 0.7,
          Math.cos(a) * 20,
          -2,
          Math.sin(a) * 16,
          270 + a * 20,
          "gold",
          1.05,
          2.7,
        );
      }
    } else if (gesture === "thumbsup") {
      const outline = [
          [-0.9, 0.28],
          [-1, -0.48],
          [-0.64, -0.12],
          [-0.48, -0.72],
          [-0.24, -0.24],
          [0, -0.95],
          [0.24, -0.24],
          [0.48, -0.72],
          [0.64, -0.12],
          [1, -0.48],
          [0.9, 0.28],
          [-0.9, 0.28],
        ],
        steps = Math.round(15 * density);
      for (let n = 0; n < outline.length - 1; n++)
        for (let j = 0; j < steps; j++) {
          const a = outline[n],
            b = outline[n + 1],
            t = j / steps,
            dx = (a[0] + (b[0] - a[0]) * t) * radius,
            dy = (a[1] + (b[1] - a[1]) * t) * radius;
          emit(
            dx,
            dy,
            Math.sin(n) * 12,
            dx * 0.1,
            dy * 0.12 - 5,
            0,
            38 + n * 1.5,
            "gold",
            1.25,
            2.8,
          );
        }
      for (const [dx, dy] of [
        [-0.48, -0.72],
        [0, -0.95],
        [0.48, -0.72],
        [-1, -0.48],
        [1, -0.48],
      ])
        for (let j = 0; j < Math.round(12 * density); j++) {
          const a = (j / Math.round(12 * density)) * TAU;
          emit(
            dx * radius,
            dy * radius,
            0,
            Math.cos(a) * 32,
            Math.sin(a) * 32 - 6,
            Math.sin(a) * 20,
            48,
            "star",
            1.8,
            2.2,
          );
        }
    } else {
      const count = Math.round(112 * density);
      for (let side = -1; side <= 1; side += 2)
        for (let i = 0; i < count; i++) {
          const t = i / (count - 1),
            a = t * TAU * 1.6 + (side * Math.PI) / 2,
            dx = (t * 2 - 1) * radius,
            dy = Math.sin(a) * radius * 0.31 + side * radius * 0.11;
          emit(
            dx,
            dy,
            Math.cos(a) * radius * 0.7,
            side * 12,
            Math.cos(a) * 18 - 7,
            Math.sin(a) * 20,
            side < 0 ? 182 + t * 28 : 208 + t * 20,
            i % 3 ? "gold" : "frost",
            i % 3 ? 1.1 : 2,
            2.5,
          );
        }
    }
    flashes.push({
      x,
      y,
      life: 0.16,
      max: 0.16,
      hue: gesture === "fingerheart" ? 342 : gesture === "thumbsup" ? 42 : 195,
      power: 0.24,
    });
    boom(x / w, 0.65);
  }
  function gestureSculpture(gesture, x, y) {
    const r = Math.min(w * 0.25, horizon * 0.29, 190),
      q = Math.max(0.72, quality()),
      spriteScale = clamp(Math.min(w / 1150, h / 690), 0.6, 1),
      kind =
        gesture === "fingerheart"
          ? 1
          : gesture === "dj"
            ? 2
            : gesture === "shaka"
              ? 4
              : 3;
    x = clamp(x, r + 16, w - r - 16);
    y = clamp(y, r + 24, horizon - r * 0.75 - 12);
    // Rotating volumes use the same simulation clock, perspective and depth sorting as ordinary 3D fireworks.
    const emit = (gx, gy, gz, color, type = "gold", size = 0.9, rig = {}) => {
      type = state.effect === "mix" ? type : state.effect;
      const life = rig.life || 3.55;
      const p = {
        x,
        y,
        px: x,
        py: y,
        vx: gx * 0.16,
        vy: gy * 0.16 - 8,
        life,
        max: life,
        hue: color,
        size:
          type === "gold"
            ? size * 1.5
            : rand(...materialSpecs[type].size) *
              (0.65 + size * 0.2) *
              spriteScale,
        type,
        seed: rand(0, 100),
        trail: type === "gold" || type === "butterfly",
        split: false,
        drag: 0.7,
        gravity: 0,
        gesture,
      };
      p.spatial = {
        cx: x,
        cy: y,
        x: 0,
        y: 0,
        z: 0,
        vx: p.vx,
        vy: p.vy,
        vz: gz * 0.22,
        age: 0,
        formation: kind,
        gx,
        gy,
        gz,
        ox: rig.ox || 0,
        oy: rig.oy || 0,
        oz: rig.oz || 0,
        yaw: rig.yaw ?? 0.35,
        pitch: rig.pitch ?? 0.28,
        roll: rig.roll || 0,
        spin: rig.spin ?? 0.55,
        phase: rig.phase || 0,
        rise: r * 0.035,
      };
      addParticle(p);
    };
    if (gesture === "fingerheart") {
      const count = Math.round(76 * q),
        heart = (a) => [
          (16 * Math.sin(a) ** 3) / 17,
          -(
            13 * Math.cos(a) -
            5 * Math.cos(2 * a) -
            2 * Math.cos(3 * a) -
            Math.cos(4 * a)
          ) / 17,
        ];
      for (const side of [-1, 1])
        for (let layer = -2; layer <= 2; layer++)
          for (let i = 0; i < count; i++) {
            const a = (i / count) * TAU,
              [hx, hy] = heart(a),
              shell = Math.sqrt(1 - (layer / 2.65) ** 2),
              scale = r * 0.59;
            emit(
              hx * scale * shell,
              hy * scale * shell,
              layer * r * 0.18,
              side < 0 ? 342 : 26,
              (i + layer) % 6 === 0 ? "petal" : "gold",
              0.85,
              {
                ox: side * r * 0.43,
                oz: side * r * 0.22,
                yaw: side * 0.12,
                pitch: side * 0.12,
                roll: side * 0.08,
                spin: side * 0.65,
              },
            );
          }
      const countRing = Math.round(110 * q);
      for (let i = 0; i < countRing; i++) {
        const a = (i / countRing) * TAU;
        emit(
          Math.cos(a) * r * 1.08,
          0,
          Math.sin(a) * r * 1.08,
          42,
          i % 17 ? "gold" : "star",
          0.9,
          { pitch: 0.45, yaw: -0.3, roll: -0.12, spin: -0.6, oy: r * 0.2 },
        );
      }
    } else if (gesture === "dj") {
      const heights = [0.42, 0.72, 1, 0.62, 0.9, 0.55, 0.86, 0.68, 0.4],
        steps = Math.round(21 * q);
      heights.forEach((height, col) => {
        const a = (col / 9) * TAU;
        for (let side = -1; side <= 1; side += 2)
          for (let j = 0; j < steps; j++) {
            const t = j / (steps - 1),
              angle = a + side * 0.026;
            emit(
              Math.cos(angle) * r * 0.84,
              r * 0.48 - t * r * height * 1.15,
              Math.sin(angle) * r * 0.84,
              184 + col * 12,
              j % 7 ? "gold" : "star",
              j % 7 ? 1 : 1.2,
              { phase: col * 0.9, pitch: 0.24, spin: 0.62 },
            );
          }
      });
      const count = Math.round(88 * q);
      for (let ring = 0; ring < 3; ring++)
        for (let i = 0; i < count; i++) {
          const a = (i / count) * TAU,
            rr = r * (0.35 + ring * 0.36);
          emit(
            Math.cos(a) * rr,
            r * 0.55,
            Math.sin(a) * rr,
            268 + ring * 15,
            i % 19 ? "gold" : "frost",
            0.85,
            { phase: ring, pitch: 0.24, spin: 0.62 },
          );
        }
      for (let i = 0; i < Math.round(86 * q); i++) {
        const t = i / Math.round(86 * q),
          a = t * TAU * 2.2;
        emit(
          Math.cos(a) * r * (1 - t * 0.4),
          r * (0.45 - t * 1.6),
          Math.sin(a) * r * (1 - t * 0.4),
          190 + t * 90,
          i % 11 ? "gold" : "star",
          0.75,
          { pitch: 0.24, spin: -0.7, phase: t * 4 },
        );
      }
    } else if (gesture === "shaka") {
      const count = Math.round(132 * q),
        rig = { yaw: 0.2, pitch: 0.25, roll: -0.12, spin: 0.24, phase: 1.1 };
      // Two thick light ribbons wind around the same axis, alternately crossing in front and behind.
      for (const side of [-1, 1])
        for (let i = 0; i < count; i++) {
          const t = i / (count - 1),
            a = t * TAU * 1.7 + (side * Math.PI) / 2,
            rr = r * (0.36 + 0.22 * Math.sin(t * Math.PI)),
            color = side < 0 ? 182 + t * 26 : 208 + t * 20;
          for (let strand = 0; strand < 3; strand++) {
            const tube = (strand / 3) * TAU,
              radial = rr + Math.cos(tube) * r * 0.04;
            emit(
              (t * 2 - 1) * r * 1.04 + Math.sin(tube) * r * 0.035,
              Math.sin(a) * radial,
              Math.cos(a) * radial,
              color,
              strand === 0 && i % 9 === 0
                ? "frost"
                : strand === 1 && i % 13 === 0
                  ? "star"
                  : "gold",
              0.95,
              rig,
            );
          }
        }
      for (const side of [-1, 1])
        for (const t of [0, 1])
          for (let i = 0; i < Math.round(10 * q); i++) {
            const a = t * TAU * 1.7 + (side * Math.PI) / 2,
              b = (i / Math.round(10 * q)) * TAU,
              rr = r * 0.36;
            emit(
              (t * 2 - 1) * r * 1.04 + Math.cos(b) * r * 0.065,
              Math.sin(a) * rr + Math.sin(b) * r * 0.065,
              Math.cos(a) * rr + Math.sin(b * 2) * r * 0.065,
              side < 0 ? 190 : 222,
              i % 4 ? "gold" : "star",
              0.75,
              rig,
            );
          }
    } else {
      const outline = [
          [-0.9, 0.28],
          [-1, -0.48],
          [-0.64, -0.12],
          [-0.48, -0.72],
          [-0.24, -0.24],
          [0, -0.95],
          [0.24, -0.24],
          [0.48, -0.72],
          [0.64, -0.12],
          [1, -0.48],
          [0.9, 0.28],
          [-0.9, 0.28],
        ],
        rig = { pitch: 0.24, yaw: -0.3, spin: 0.25 },
        steps = Math.round(22 * q);
      for (const face of [-1, 1])
        for (let edge = 0; edge < outline.length - 1; edge++)
          for (let i = 0; i < steps; i++) {
            const t = i / steps,
              a = outline[edge],
              b = outline[edge + 1];
            emit(
              (a[0] + (b[0] - a[0]) * t) * r,
              (a[1] + (b[1] - a[1]) * t) * r,
              face * r * 0.42,
              face < 0 ? 46 : 38,
              i % 23 ? "gold" : "star",
              face < 0 ? 1.1 : 0.85,
              rig,
            );
          }
      for (const [px, py] of outline.slice(0, -1))
        for (let i = 0; i < Math.round(16 * q); i++) {
          const t = i / (Math.round(16 * q) - 1);
          emit(px * r, py * r, (t * 2 - 1) * r * 0.42, 43, "gold", 0.75, rig);
        }
      for (const [px, py] of [
        [-1, -0.48],
        [-0.48, -0.72],
        [0, -0.95],
        [0.48, -0.72],
        [1, -0.48],
      ])
        for (let i = 0; i < Math.round(16 * q); i++) {
          const a = (i / Math.round(16 * q)) * TAU;
          emit(
            px * r + Math.cos(a) * r * 0.08,
            py * r + Math.sin(a) * r * 0.08,
            -r * 0.42,
            50,
            i % 4 ? "gold" : "star",
            1.2,
            rig,
          );
        }
    }
    flashes.push({
      x,
      y,
      life: 0.2,
      max: 0.2,
      hue: kind === 1 ? 342 : kind === 3 ? 42 : 195,
      power: 0.32,
    });
    boom(x / w, 0.75);
  }
  function burst(
    x,
    y,
    color = hue(),
    type = state.effect,
    power = 1,
    shape = "sphere",
    options = {},
  ) {
    if (options.orbitOnly) {
      emitRing(x, y, color, power, type, {
        ...options,
        density: 1.9,
        ringTilt: 1.12,
        ringTurn: -0.06,
        ringSpin: 0.56,
        ringDepth: -1.16,
      });
      emitRing(
        x,
        y,
        color + (state.palette === "rainbow" ? 165 : 16),
        power * 0.82,
        type,
        {
          ...options,
          density: 1.5,
          ringTilt: 1.04,
          ringTurn: Math.PI / 2 - 0.08,
          ringSpin: -0.72,
          ringDepth: 1.08,
        },
      );
      if (!options.quiet) {
        flashes.push({ x, y, life: 0.12, max: 0.12, hue: color, power: 0.18 });
        boom(x / w, power * 0.6);
      }
      return;
    }
    if (shape === "saturn") {
      const spatial = state.view === "3d" && !options.flat;
      burst(
        x,
        y,
        color,
        spatial ? type : type === "mix" ? "mix" : "star",
        power * 0.65,
        "sphere",
        spatial ? { ...options, orbitCore: true } : options,
      );
      emitRing(x, y, color + 22, power, type, options);
      return;
    }
    if (type === "mix") {
      const rainbow = state.palette === "rainbow";
      const reserve = Math.ceil(340 * power * quality()),
        overflow = particles.length + reserve - maxParticles();
      if (overflow > 0) particles.splice(0, overflow);
      const layers = [
        ["gold", 1, 0.55, 0],
        ["star", 0.82, 0.72, 65],
        ["frost", 0.76, 0.46, 140],
        ["petal", 0.68, 0.54, 215],
        ["butterfly", 0.88, 0.68, 290],
      ];
      for (const [material, size, density, offset] of layers)
        burst(
          x,
          y,
          color + (rainbow ? offset : 0),
          material,
          power * size,
          shape,
          {
            ...options,
            density: density * (options.density ?? 1),
            quiet: true,
          },
        );
      if (rainbow && shape === "sphere" && !options.noEcho)
        schedule(
          0.42,
          () =>
            burst(x, y, color + 175, "star", power * 0.72, "ring", {
              ...options,
              density: 0.36,
              quiet: true,
            }),
          options.automatic,
        );
      if (!options.quiet) boom(x / w, power, { near: options.depthImpact });
      return;
    }
    const spec = materialSpecs[type];
    const count = Math.round(
        spec.count * power * quality() * (options.density ?? 1),
      ),
      scale = clamp(Math.min(w / 1150, h / 690), 0.67, 1.3),
      radius = spec.speed * scale * power;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + rand(-0.02, 0.02),
        z = rand(-1, 1),
        r = shape === "sphere" ? Math.sqrt(1 - z * z) * rand(0.75, 1) : 1;
      let dx = Math.cos(a) * r,
        dy = Math.sin(a) * r;
      if (shape === "heart") {
        dx = (16 * Math.sin(a) ** 3) / 17;
        dy =
          -(
            13 * Math.cos(a) -
            5 * Math.cos(2 * a) -
            2 * Math.cos(3 * a) -
            Math.cos(4 * a)
          ) / 17;
      }
      const life = rand(...spec.life),
        materialHue =
          state.palette === "rainbow"
            ? color + (a * 180) / Math.PI + rand(-9, 9)
            : color + rand(-8, 8);
      const p = {
        x,
        y,
        px: x,
        py: y,
        vx: dx * radius,
        vy: dy * radius,
        life,
        max: life,
        hue: materialHue,
        size:
          rand(...spec.size) *
          scale *
          (options.orbitCore ? 0.6 : 1) *
          (options.romance && type !== "gold" ? 0.67 : 1),
        orbitCore: options.orbitCore ?? false,
        romance: Boolean(options.romance),
        type,
        seed: rand(0, 100),
        trail: type === "gold" || type === "butterfly",
        split: type === "gold" && Math.random() < 0.4,
        drag: shape === "heart" ? 1.2 : undefined,
        gravity: shape === "heart" ? 12 : undefined,
        companion: options.companion ?? false,
        shape,
      };
      if (state.view === "3d" && !options.flat) {
        const ring = shape === "ring",
          tilt = 0.94;
        if (ring) {
          p.vy = Math.sin(a) * radius * Math.cos(tilt);
          dx = Math.cos(a);
        }
        if (shape === "tunnel") {
          p.vx = Math.cos(a) * radius * rand(0.3, 0.85);
          p.vy = Math.sin(a) * radius * rand(0.22, 0.7);
          p.drag = 0.24;
          p.gravity = 5;
        }
        const vz =
          shape === "tunnel"
            ? -radius * rand(2.5, 3.5)
            : shape === "heart"
              ? Math.sin(a * 2) * radius * 0.7
              : ring
                ? Math.sin(a) * radius * Math.sin(tilt) * 1.6
                : z * radius * 2.7;
        p.spatial = {
          cx: x,
          cy: y,
          x: 0,
          y: 0,
          z: 0,
          vx: p.vx,
          vy: p.vy,
          vz,
          age: 0,
        };
        p.split = false;
        if (options.depthImpact) {
          const near = i % 5 === 0 || (shape === "tunnel" && i % 5 === 1),
            far = i % 5 === 2 || (shape !== "tunnel" && i % 5 === 1),
            focal = depthFocal(),
            s = p.spatial;
          s.layer = near ? "near" : far ? "far" : "middle";
          s.z = focal * (near ? -0.18 : far ? 0.4 : 0.04);
          s.vz = near
            ? -focal * rand(0.6, 0.82)
            : far
              ? radius * rand(0.8, 1.4)
              : vz * 0.45;
          if (near) {
            s.vx *= 0.55;
            s.vy *= 0.55;
          }
        }
      }
      addParticle(p);
    }
    if (!options.quiet) {
      flashes.push({
        x,
        y,
        life: 0.18,
        max: 0.18,
        hue: color,
        power: power * 0.6,
      });
      boom(x / w, power, { near: options.depthImpact });
    }
  }
  function emitRing(x, y, color, power, type, options = {}) {
    const spatial = state.view === "3d" && !options.flat,
      material = spatial || options.orbitOnly ? type : "gold",
      mixed = material === "mix",
      scale = clamp(w / 1000, 0.65, 1.2),
      spriteScale = clamp(Math.min(w / 1150, h / 690), 0.67, 1.1),
      angle = -0.4;
    const specs = {
        gold: { count: 160, size: [0.55, 1] },
        star: { count: 86, size: [8, 13] },
        frost: { count: 66, size: [13, 19] },
        petal: { count: 70, size: [13, 20] },
        butterfly: { count: 56, size: [17, 25] },
      },
      count = Math.round(
        (mixed ? (options.orbitOnly ? 84 : 100) : specs[material].count) *
          quality() *
          (options.romance ? 0.65 : 1) *
          (options.orbitOnly ? (options.density ?? 1) : 1),
      );
    const orientation =
      spatial || options.orbitOnly
        ? {
            tilt: options.ringTilt ?? rand(0.88, 1.14),
            turn: options.ringTurn ?? rand(-0.65, 0.35),
            spin:
              options.ringSpin ??
              rand(0.24, 0.46) * (Math.random() < 0.5 ? -1 : 1),
            baseZ: options.depthImpact ? -depthFocal() * 0.025 : 0,
            depthStretch: options.ringDepth ?? (options.depthImpact ? 1.18 : 1),
          }
        : {};
    const overflow = particles.length + count - maxParticles();
    if (overflow > 0) particles.splice(0, overflow);
    for (let i = 0; i < count; i++) {
      const kind = mixed ? materialTypes[i % materialTypes.length] : material,
        t = (i / count) * TAU,
        rx = Math.cos(t) * 215 * scale * power,
        ry = Math.sin(t) * 59 * scale * power,
        life = spatial ? rand(3.6, 4.4) : rand(2.8, 4.1);
      const p = {
        x,
        y,
        px: x,
        py: y,
        vx: rx * Math.cos(angle) - ry * Math.sin(angle),
        vy: rx * Math.sin(angle) + ry * Math.cos(angle),
        life,
        max: life,
        hue:
          color +
          (state.palette === "rainbow" ? (i / count) * 360 : rand(-9, 9)),
        romance: Boolean(options.romance),
        size:
          rand(...specs[kind].size) *
          (kind === "gold" ? 1 : spriteScale) *
          (options.romance && kind !== "gold" ? 0.67 : 1),
        type: kind,
        seed: i * 2.39996,
        gravity: 9,
        drag: 0.7,
        trail: kind === "gold",
        companion: options.companion ?? false,
      };
      if (spatial || options.orbitOnly) {
        p.rotation = t + rand(-0.4, 0.4);
        p.spin = rand(-0.45, 0.45);
        p.depth = rand(0.85, 1);
        const orbit = {
          cx: x,
          cy: y,
          x: 0,
          y: 0,
          z: 0,
          vx: p.vx,
          vy: p.vy,
          vz: 0,
          age: 0,
          ring: true,
          gestureOrbit: Boolean(options.orbitOnly),
          angle: t,
          radius:
            (options.orbitOnly
              ? Math.min(w * 0.31, 220)
              : Math.min(w * 0.4, 245)) * power,
          ...orientation,
        };
        if (spatial) p.spatial = orbit;
        else p.orbit = orbit;
        if (options.orbitOnly && kind !== "gold") p.size *= 0.82;
      }
      addParticle(p);
    }
  }
  function particleScale(p) {
    return Math.min(
      p.projectedScale || 1,
      p.romance
        ? 1.65
        : p.orbitCore
          ? 2.2
          : p.spatial?.ring
            ? 2.5
            : p.spatial?.layer
              ? 3.2
              : 4.6,
    );
  }
  function drawParticle(p, alpha, surface = fx) {
    const fx = surface,
      scale = particleScale(p),
      t = 1 - p.life / p.max;
    fx.globalAlpha = alpha;
    fx.globalCompositeOperation =
      p.type === "petal" || p.type === "butterfly" ? "source-over" : "lighter";
    if (
      p.spatial &&
      !p.spatial.ring &&
      scale > 1.35 &&
      p.history.length > 2 &&
      p.type !== "gold"
    ) {
      const q = p.history[Math.max(0, p.history.length - 4)];
      fx.strokeStyle = `hsla(${p.hue},95%,83%,.2)`;
      fx.lineWidth = Math.max(0.8, scale * 0.7);
      fx.beginPath();
      fx.moveTo(q.x, q.y);
      fx.lineTo(p.x, p.y);
      fx.stroke();
    }
    if (p.type === "gold") {
      const burnHue = p.hue - Math.max(0, t - 0.45) * 22;
      if (p.trail && p.history.length > 1) {
        fx.strokeStyle = `hsla(${burnHue},95%,${74 - t * 20}%,.8)`;
        fx.lineWidth = Math.max(0.3, p.size * 0.75 * scale * (1 - t * 0.55));
        fx.beginPath();
        p.history.forEach((q, j) => {
          if (!j) fx.moveTo(q.x, q.y);
          else fx.lineTo(q.x, q.y);
        });
        fx.stroke();
      }
      const size = p.size * (8 - t * 3) * scale,
        imageHue = Math.round(burnHue / 15);
      if (!p.image || p.imageHue !== imageHue) {
        p.image = sprite(burnHue, "gold");
        p.imageHue = imageHue;
      }
      fx.drawImage(p.image, p.x - size / 2, p.y - size / 2, size, size);
      fx.fillStyle = `hsl(${burnHue},95%,${98 - t * 28}%)`;
      fx.beginPath();
      fx.arc(p.x, p.y, Math.max(0.38, p.size * 0.7 * scale), 0, TAU);
      fx.fill();
    } else {
      if (p.type === "butterfly" && !p.spatial?.ring && p.history.length > 1) {
        fx.globalCompositeOperation = "lighter";
        fx.strokeStyle = `hsla(${p.hue},90%,77%,.28)`;
        fx.lineWidth = 0.6;
        fx.beginPath();
        p.history.forEach((q, j) => {
          if (!j) fx.moveTo(q.x, q.y);
          else fx.lineTo(q.x, q.y);
        });
        fx.stroke();
        fx.globalCompositeOperation = "source-over";
      }
      const flutter =
        p.type === "butterfly"
          ? 0.16 + 0.84 * Math.abs(Math.sin(p.seed + clock * 5.5))
          : p.type === "petal"
            ? 0.25 + 0.75 * Math.abs(Math.sin(p.seed + clock * 1.7))
            : p.type === "frost"
              ? 0.7 + 0.3 * Math.sin(p.seed + clock)
              : 1;
      const size = p.size * p.depth * scale,
        c = Math.cos(p.rotation),
        s = Math.sin(p.rotation);
      p.image ??= sprite(p.hue, p.type, p.variant);
      fx.save();
      fx.transform(c * flutter, s * flutter, -s, c, p.x, p.y);
      if (p.type === "star") {
        fx.globalAlpha *=
          0.55 + 0.45 * Math.pow(Math.sin(p.seed + clock * 3.5), 2);
        const pulse = 1 + 0.15 * Math.sin(clock * 4 + p.seed);
        fx.drawImage(
          p.image,
          (-size * pulse) / 2,
          (-size * pulse) / 2,
          size * pulse,
          size * pulse,
        );
      } else if (p.type === "frost") {
        fx.globalAlpha *= 0.66 + 0.34 * Math.cos(p.seed + clock * 1.6) ** 2;
        fx.drawImage(p.image, -size / 2, -size / 2, size, size);
      } else if (p.type === "butterfly")
        fx.drawImage(p.image, -size / 2, -size / 2, size, size);
      else
        fx.drawImage(
          p.image,
          -size * 0.42,
          -size * 0.55,
          size * 0.84,
          size * 1.1,
        );
      fx.restore();
    }
  }
  function particleInView(p) {
    const margin =
      24 +
      p.size *
        (p.type === "gold" ? 8 : 1.3) *
        Math.min(p.projectedScale || 1, 4.6);
    if (
      p.x >= -margin &&
      p.x <= w + margin &&
      p.y >= -margin &&
      p.y <= h + margin
    )
      return true;
    for (const q of p.history)
      if (
        q.x >= -margin &&
        q.x <= w + margin &&
        q.y >= -margin &&
        q.y <= h + margin
      )
        return true;
    return false;
  }
  // Mobile volleys and the hidden love show share the material batches. Text stays on Canvas.
  function prepareOrdinaryGpu() {
    const love = textCloud?.kind === "love";
    if (
      !compactControls ||
      state.view !== "3d" ||
      state.quality === "high" ||
      story ||
      (textCloud && !love) ||
      (!love && (state.effect !== "mix" || state.palette !== "rainbow")) ||
      ordinaryGpuUnavailable
    )
      return null;
    try {
      if (!ordinaryGpu) {
        let surface =
          typeof OffscreenCanvas === "function"
            ? new OffscreenCanvas(1, 1)
            : document.createElement("canvas");
        const options = {
          alpha: true,
          premultipliedAlpha: true,
          antialias: false,
          depth: false,
          stencil: false,
          powerPreference: "high-performance",
        };
        let gl = surface.getContext("webgl2", options);
        if (!gl && typeof surface.transferToImageBitmap === "function") {
          surface = document.createElement("canvas");
          gl = surface.getContext("webgl2", options);
        }
        if (!gl) {
          ordinaryGpuUnavailable = true;
          return null;
        }
        nearCanvas.dataset.gpuTransfer =
          typeof surface.transferToImageBitmap === "function"
            ? "image-bitmap"
            : "canvas";
        const shader = (type, source) => {
          const s = gl.createShader(type);
          gl.shaderSource(s, source);
          gl.compileShader(s);
          if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
            throw Error(gl.getShaderInfoLog(s));
          return s;
        };
        const vertex = shader(
          gl.VERTEX_SHADER,
          `#version 300 es
    precision highp float;
    uniform vec2 uView;uniform sampler2D uInstances;uniform int uFirst;out vec2 vUv;out vec3 vHsl;out float vAlpha;flat out float vKind;
    vec4 instance(int i){return texelFetch(uInstances,ivec2(i&1023,i>>10),0);}
    void main(){const vec2 corners[6]=vec2[6](vec2(-1,-1),vec2(1,-1),vec2(1,1),vec2(-1,-1),vec2(1,1),vec2(-1,1));vec2 q=corners[gl_VertexID];int i=(gl_InstanceID+uFirst)*4;vec4 a=instance(i),b=instance(i+1),c=instance(i+2),d=instance(i+3);vec2 p=a.xy+a.zw*q.x+b.xy*q.y;gl_Position=vec4(p/uView*vec2(2.0,-2.0)+vec2(-1.0,1.0),0.0,1.0);vUv=b.zw+(q+1.0)*0.5*c.x;vHsl=c.yzw;vAlpha=d.x;vKind=d.y;}`,
        );
        const fragment = shader(
          gl.FRAGMENT_SHADER,
          `#version 300 es
    precision highp float;uniform sampler2D uAtlas;uniform sampler2D uPetals;in vec2 vUv;in vec3 vHsl;in float vAlpha;flat in float vKind;out vec4 color;
    vec3 hsl(vec3 p){vec3 q=clamp(abs(mod(p.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0);return p.z+(q-0.5)*(1.0-abs(2.0*p.z-1.0))*p.y;}
    void main(){
     if(vKind<0.5){color=(vKind<-.5?texture(uPetals,vUv):texture(uAtlas,vUv))*vAlpha;}
     else{float coverage=1.0;if(vKind<1.5){float d=length(vUv*2.0-1.0);coverage=clamp(((vKind-1.0)/0.4-d)/max(fwidth(d),0.0001)+0.5,0.0,1.0);}
      else{coverage=clamp(((vKind-2.0)*0.5-abs(vUv.y-0.5))/max(fwidth(vUv.y),0.0001)+0.5,0.0,1.0);}float a=vAlpha*coverage;color=vec4(hsl(vHsl)*a,a);}
     if(color.a<0.001)discard;
    }`,
        );
        const program = gl.createProgram();
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
          throw Error(gl.getProgramInfoLog(program));
        const data = new Float32Array(1024 * 256 * 4),
          vao = gl.createVertexArray(),
          instances = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, instances);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA32F,
          1024,
          256,
          0,
          gl.RGBA,
          gl.FLOAT,
          null,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.activeTexture(gl.TEXTURE0);
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          2048,
          2048,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        ordinaryGpu = {
          surface,
          gl,
          program,
          data,
          vao,
          texture,
          instances,
          view: gl.getUniformLocation(program, "uView"),
          atlas: gl.getUniformLocation(program, "uAtlas"),
          petals: gl.getUniformLocation(program, "uPetals"),
          instanceUniform: gl.getUniformLocation(program, "uInstances"),
          first: gl.getUniformLocation(program, "uFirst"),
          ready: 0,
          quads: 0,
          ranges: new Int32Array(72),
          groups: Array.from({ length: 48 }, () => []),
        };
        surface.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          ordinaryGpuUnavailable = true;
          ordinaryGpu = null;
          depthDirty = true;
          nearCanvas.dataset.particleRenderer = "canvas-2d";
        });
        surface.addEventListener("webglcontextrestored", () => {
          ordinaryGpuUnavailable = false;
          depthDirty = true;
        });
      }
      const r = ordinaryGpu,
        { gl } = r;
      if (gl.isContextLost()) return null;
      // Spread the existing material artwork uploads over the comet's flight, before impact.
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, r.texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      for (let n = 0; n < 8 && r.ready < 216; n++, r.ready++) {
        const cell = r.ready,
          hue = Math.floor(cell / 9) * 15,
          slot = cell % 9,
          type =
            slot === 0
              ? "gold"
              : slot < 4
                ? "star"
                : slot < 7
                  ? "frost"
                  : slot === 7
                    ? "petal"
                    : "butterfly",
          variant = slot < 4 ? slot - 1 : slot < 7 ? slot - 4 : 0;
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          (cell % 16) * 128,
          Math.floor(cell / 16) * 128,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          sprite(hue, type, Math.max(0, variant)),
        );
      }
      if (r.ready === 216 && !r.validated) {
        if (gl.getError() !== gl.NO_ERROR)
          throw Error("GPU texture allocation failed");
        r.validated = true;
      }
      if (love) prepareLoveGpuAtlas(r);
      return r;
    } catch (error) {
      ordinaryGpuUnavailable = true;
      ordinaryGpu = null;
      nearCanvas.dataset.particleRenderer = "canvas-2d";
      nearCanvas.dataset.gpuReason = String(error.message || error);
      return null;
    }
  }
  function gpuCorners(
    r,
    ax,
    ay,
    bx,
    by,
    cx,
    cy,
    dx,
    dy,
    cell,
    alpha,
    kind,
    hue = 0,
    sat = 0,
    light = 0,
  ) {
    const d = r.data,
      k = r.quads++ * 16;
    d[k] = (ax + cx) * 0.5;
    d[k + 1] = (ay + cy) * 0.5;
    d[k + 2] = (bx - ax) * 0.5;
    d[k + 3] = (by - ay) * 0.5;
    d[k + 4] = (dx - ax) * 0.5;
    d[k + 5] = (dy - ay) * 0.5;
    d[k + 6] = kind ? 0 : ((cell % 16) * 128 + 0.5) / 2048;
    d[k + 7] = kind ? 0 : (Math.floor(cell / 16) * 128 + 0.5) / 2048;
    d[k + 8] = kind ? 1 : 127 / 2048;
    d[k + 9] = (((hue % 360) + 360) % 360) / 360;
    d[k + 10] = sat;
    d[k + 11] = light;
    d[k + 12] = alpha;
    d[k + 13] = kind;
  }
  function gpuQuad(
    r,
    x,
    y,
    width,
    height,
    rotation,
    flutter,
    cell,
    alpha,
    kind = 0,
    hue = 0,
    sat = 0,
    light = 0,
  ) {
    const c = Math.cos(rotation),
      s = Math.sin(rotation),
      ax = c * width * flutter * 0.5,
      ay = s * width * flutter * 0.5,
      bx = -s * height * 0.5,
      by = c * height * 0.5;
    gpuCorners(
      r,
      x - ax - bx,
      y - ay - by,
      x + ax - bx,
      y + ay - by,
      x + ax + bx,
      y + ay + by,
      x - ax + bx,
      y - ay + by,
      cell,
      alpha,
      kind,
      hue,
      sat,
      light,
    );
  }
  function gpuLine(r, a, b, width, hue, sat, light, alpha) {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      length = Math.hypot(dx, dy);
    if (length < 0.001 || alpha < 0.005) return;
    const expanded = width + 2 / r.ratio,
      nx = (-dy / length) * expanded * 0.5,
      ny = (dx / length) * expanded * 0.5;
    gpuCorners(
      r,
      a.x + nx,
      a.y + ny,
      b.x + nx,
      b.y + ny,
      b.x - nx,
      b.y - ny,
      a.x - nx,
      a.y - ny,
      0,
      alpha,
      2 + width / expanded,
      hue,
      sat,
      light,
    );
  }
  function compositeGpu(r, target) {
    const bitmap =
      typeof r.surface.transferToImageBitmap === "function"
        ? r.surface.transferToImageBitmap()
        : null;
    try {
      target.drawImage(bitmap || r.surface, 0, 0, w, h);
    } finally {
      if (bitmap) bitmap.close();
    }
  }
  function gpuParticleTrail(r, p) {
    const scale = particleScale(p),
      t = 1 - p.life / p.max,
      alpha = p.renderAlpha,
      history = p.history;
    if (
      p.spatial &&
      !p.spatial.ring &&
      scale > 1.35 &&
      history.length > 2 &&
      p.type !== "gold"
    )
      gpuLine(
        r,
        history[Math.max(0, history.length - 4)],
        p,
        Math.max(0.8, scale * 0.7),
        p.hue,
        0.95,
        0.83,
        alpha * 0.2,
      );
    if (
      ((p.type === "gold" && p.trail) ||
        (p.type === "butterfly" && !p.spatial?.ring)) &&
      history.length > 1
    ) {
      const gold = p.type === "gold",
        color = p.hue - (gold ? Math.max(0, t - 0.45) * 22 : 0),
        width = gold
          ? Math.max(0.3, p.size * 0.75 * scale * (1 - t * 0.55))
          : 0.6;
      for (let i = 1; i < history.length; i++)
        gpuLine(
          r,
          history[i - 1],
          history[i],
          width,
          color,
          gold ? 0.95 : 0.9,
          gold ? (74 - t * 20) / 100 : 0.77,
          alpha * (gold ? 0.8 : 0.28),
        );
    }
  }
  function gpuParticleSprite(r, p) {
    const scale = particleScale(p),
      t = 1 - p.life / p.max;
    let alpha = p.renderAlpha,
      size,
      flutter = 1,
      color = p.hue,
      rotation = p.rotation,
      width,
      height;
    if (p.type === "gold") {
      color -= Math.max(0, t - 0.45) * 22;
      size = p.size * (8 - t * 3) * scale;
      rotation = 0;
      width = height = size;
    } else {
      size = p.size * p.depth * scale;
      flutter =
        p.type === "butterfly"
          ? 0.16 + 0.84 * Math.abs(Math.sin(p.seed + clock * 5.5))
          : p.type === "petal"
            ? 0.25 + 0.75 * Math.abs(Math.sin(p.seed + clock * 1.7))
            : p.type === "frost"
              ? 0.7 + 0.3 * Math.sin(p.seed + clock)
              : 1;
      if (p.type === "star") {
        alpha *= 0.55 + 0.45 * Math.sin(p.seed + clock * 3.5) ** 2;
        size *= 1 + 0.15 * Math.sin(clock * 4 + p.seed);
      } else if (p.type === "frost")
        alpha *= 0.66 + 0.34 * Math.cos(p.seed + clock * 1.6) ** 2;
      width = size * (p.type === "petal" ? 0.84 : 1);
      height = size * (p.type === "petal" ? 1.1 : 1);
    }
    const hue = ((Math.round(color / 15) % 24) + 24) % 24,
      slot =
        p.type === "gold"
          ? 0
          : p.type === "star"
            ? 1 + p.variant
            : p.type === "frost"
              ? 4 + p.variant
              : p.type === "petal"
                ? 7
                : 8;
    gpuQuad(
      r,
      p.x,
      p.y,
      width,
      height,
      rotation,
      flutter,
      hue * 9 + slot,
      alpha,
    );
    if (p.type === "gold") {
      const radius = Math.max(0.38, p.size * 0.7 * scale),
        expanded = radius + 0.75 / r.ratio;
      gpuQuad(
        r,
        p.x,
        p.y,
        expanded * 2,
        expanded * 2,
        0,
        1,
        0,
        alpha,
        1 + (radius / expanded) * 0.4,
        color,
        0.95,
        (98 - t * 28) / 100,
      );
    }
  }
  function drawOrdinaryGpu(visible) {
    const r = prepareOrdinaryGpu();
    if (!r || r.ready < 216) {
      if (nearCanvas.dataset.particleRenderer !== "canvas-2d")
        nearCanvas.dataset.particleRenderer = "canvas-2d";
      return false;
    }
    const { gl } = r;
    if (r.surface.width !== light.width || r.surface.height !== light.height) {
      r.surface.width = light.width;
      r.surface.height = light.height;
    }
    r.ratio = r.surface.width / w;
    for (const group of r.groups) group.length = 0;
    for (const p of visible)
      if (p.renderAlpha >= 0.005 && particleInView(p)) {
        const layer = p.spatial && p.projectedScale > 1.32 ? 1 : 0,
          band = clamp(
            Math.floor(((p.renderZ || 0) / depthFocal() + 1) * 4),
            0,
            11,
          ),
          over = p.type === "petal" || p.type === "butterfly" ? 1 : 0;
        r.groups[layer * 24 + band * 2 + over].push(p);
      }
    gl.bindVertexArray(r.vao);
    gl.useProgram(r.program);
    gl.uniform2f(r.view, w, h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, r.texture);
    gl.uniform1i(r.atlas, 0);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, r.petalTexture || r.texture);
    gl.uniform1i(r.petals, 2);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, r.instances);
    gl.uniform1i(r.instanceUniform, 1);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.viewport(0, 0, r.surface.width, r.surface.height);
    for (let layer = 0; layer < 2; layer++) {
      r.quads = 0;
      let ranges = 0;
      for (let band = 11; band >= 0; band--) {
        const add = r.groups[layer * 24 + band * 2],
          over = r.groups[layer * 24 + band * 2 + 1],
          start = r.quads;
        for (const p of add) gpuParticleTrail(r, p);
        for (const p of over) gpuParticleTrail(r, p);
        for (const p of add) gpuParticleSprite(r, p);
        r.ranges[ranges++] = start;
        r.ranges[ranges++] = r.quads - start;
        r.ranges[ranges++] = 0;
        const begin = r.quads;
        for (const p of over) gpuParticleSprite(r, p);
        r.ranges[ranges++] = begin;
        r.ranges[ranges++] = r.quads - begin;
        r.ranges[ranges++] = 1;
      }
      if (!r.quads) continue;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const rows = Math.ceil((r.quads * 4) / 1024);
      // This texture holds coordinates and opacity, so RGBA alpha conversion would corrupt it.
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        1024,
        rows,
        gl.RGBA,
        gl.FLOAT,
        r.data.subarray(0, rows * 4096),
      );
      for (let i = 0; i < ranges; i += 3) {
        if (!r.ranges[i + 1]) continue;
        gl.blendFunc(gl.ONE, r.ranges[i + 2] ? gl.ONE_MINUS_SRC_ALPHA : gl.ONE);
        gl.uniform1i(r.first, r.ranges[i]);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, r.ranges[i + 1]);
      }
      const target = layer ? nearFx : fx;
      target.globalAlpha = 1;
      target.globalCompositeOperation = "source-over";
      compositeGpu(r, target);
    }
    if (nearCanvas.dataset.particleRenderer !== "webgl2-batch")
      nearCanvas.dataset.particleRenderer = "webgl2-batch";
    return true;
  }
  function prepareLoveGpuAtlas(r) {
    const { gl } = r;
    if (!r.petalTexture) {
      r.petalTexture = gl.createTexture();
      r.petalReady = 0;
      r.roseReady = 0;
      r.petalCells = new Map();
      r.loveLayers = [0, 1].map(() => ({
        data: new Float32Array(16384 * 16),
        quads: 0,
        ratio: 1,
      }));
      r.letters = [];
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, r.petalTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        2048,
        2048,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
      for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
        gl.texParameteri(gl.TEXTURE_2D, key, gl.LINEAR);
      for (const key of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
        gl.texParameteri(gl.TEXTURE_2D, key, gl.CLAMP_TO_EDGE);
    }
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, r.petalTexture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    // Full-resolution front/back artwork, warmed during the distant comet flights.
    const hues = [325, 330, 335, 340, 345, 350, 355, 360, 40];
    for (let n = 0; n < 8 && r.petalReady < 54; n++, r.petalReady++) {
      const cell = r.petalReady,
        color = hues[Math.floor(cell / 6)],
        tone = Math.floor((cell % 6) / 2),
        back = Boolean(cell % 2);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        (cell % 12) * 160,
        Math.floor(cell / 12) * 160,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        lovePetalTexture(color, tone * 2, back),
      );
      r.petalCells.set(color + ":" + tone + ":" + back, cell);
    }
    if (r.petalReady === 54 && !r.petalsValidated) {
      if (gl.getError() !== gl.NO_ERROR)
        throw Error("GPU petal allocation failed");
      r.petalsValidated = true;
    }
    if (loveRosePhotoReady)
      for (
        let n = 0;
        n < 3 && r.roseReady < loveRosePetals.length;
        n++, r.roseReady++
      ) {
        const cell = 54 + r.roseReady;
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          (cell % 12) * 160,
          Math.floor(cell / 12) * 160,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          loveRoseFragment(loveRosePetals[r.roseReady]),
        );
      }
  }
  function beginLoveGpu() {
    loveCurvedPetals.length = 0;
    const r = prepareOrdinaryGpu();
    loveGpuFrame = r && r.ready === 216 && r.petalReady === 54 ? r : null;
    const renderer = loveGpuFrame ? "webgl2-batch" : "canvas-2d";
    if (nearCanvas.dataset.loveRenderer !== renderer)
      nearCanvas.dataset.loveRenderer = renderer;
    if (loveGpuFrame) {
      if (
        r.surface.width !== light.width ||
        r.surface.height !== light.height
      ) {
        r.surface.width = light.width;
        r.surface.height = light.height;
      }
      for (const layer of r.loveLayers) {
        layer.quads = 0;
        layer.ratio = r.surface.width / w;
      }
      r.letters.length = 0;
    }
    return loveGpuFrame;
  }
  function loveGpuLayer(surface) {
    return loveGpuFrame?.loveLayers[surface === nearFx ? 1 : 0];
  }
  function gpuLoveMote(
    surface,
    x,
    y,
    size,
    hue,
    type,
    alpha,
    rotation = 0,
    flutter = 1,
  ) {
    const r = loveGpuLayer(surface);
    if (!r) return false;
    const color = ((Math.round(hue / 15) % 24) + 24) % 24,
      slot =
        type === "gold"
          ? 0
          : type === "star"
            ? 1
            : type === "frost"
              ? 4
              : type === "petal"
                ? 7
                : 8;
    gpuQuad(r, x, y, size, size, rotation, flutter, color * 9 + slot, alpha);
    return true;
  }
  function gpuLovePetalSilhouette(p, alpha, hue, surface) {
    const r = loveGpuLayer(surface),
      t = p.tumble,
      c = Math.cos(p.rotation),
      s = Math.sin(p.rotation),
      ax = ((c * t.a - s * t.b) * p.size) / 2,
      ay = ((s * t.a + c * t.b) * p.size) / 2,
      bx = ((c * t.c - s * t.d) * p.size) / 2,
      by = ((s * t.c + c * t.d) * p.size) / 2,
      color = ((Math.round(hue / 15) % 24) + 24) % 24;
    gpuCorners(
      r,
      p.x - ax - bx,
      p.y - ay - by,
      p.x + ax - bx,
      p.y + ay - by,
      p.x + ax + bx,
      p.y + ay + by,
      p.x - ax + bx,
      p.y - ay + by,
      color * 9 + 7,
      alpha,
      0,
    );
  }
  function gpuLoveFragment(p, alpha, surface) {
    if (!loveGpuFrame || loveGpuFrame.roseReady !== loveRosePetals.length)
      return false;
    if (alpha <= 0) return true;
    const r = loveGpuLayer(surface),
      m = p.matrix,
      k = r.quads * 16,
      cell = 54 + p.source;
    gpuCorners(
      r,
      p.x - (m[0] + m[2]) / 2,
      p.y - (m[1] + m[3]) / 2,
      p.x + (m[0] - m[2]) / 2,
      p.y + (m[1] - m[3]) / 2,
      p.x + (m[0] + m[2]) / 2,
      p.y + (m[1] + m[3]) / 2,
      p.x + (-m[0] + m[2]) / 2,
      p.y + (-m[1] + m[3]) / 2,
      0,
      alpha,
      -1,
    );
    r.data[k + 6] = ((cell % 12) * 160 + 0.5) / 2048;
    r.data[k + 7] = (Math.floor(cell / 12) * 160 + 0.5) / 2048;
    r.data[k + 8] = 159 / 2048;
    return true;
  }
  function gpuLovePetal(p, alpha, hue, layer, surface, matrix = null) {
    const r = loveGpuLayer(surface);
    if (!r) return false;
    const t = p.tumble,
      c = Math.cos(p.rotation),
      s = Math.sin(p.rotation),
      m = matrix || [
        (c * t.a - s * t.b) * p.size,
        (s * t.a + c * t.b) * p.size,
        (c * t.c - s * t.d) * p.size,
        (s * t.c + c * t.d) * p.size,
      ],
      color = Math.round(hue / 5) * 5,
      tone = Math.min(2, Math.floor(layer / 2));
    for (const back of [false, true]) {
      const opacity = alpha * t.light * (back ? 1 - t.front : t.front);
      if (opacity <= 0) continue;
      const cell = loveGpuFrame.petalCells.get(color + ":" + tone + ":" + back),
        k = r.quads * 16;
      gpuCorners(
        r,
        p.x - (m[0] + m[2]) / 2,
        p.y - (m[1] + m[3]) / 2,
        p.x + (m[0] - m[2]) / 2,
        p.y + (m[1] - m[3]) / 2,
        p.x + (m[0] + m[2]) / 2,
        p.y + (m[1] + m[3]) / 2,
        p.x + (-m[0] + m[2]) / 2,
        p.y + (-m[1] + m[3]) / 2,
        0,
        opacity,
        -1,
      );
      r.data[k + 6] = ((cell % 12) * 160 + 0.5) / 2048;
      r.data[k + 7] = (Math.floor(cell / 12) * 160 + 0.5) / 2048;
      r.data[k + 8] = 159 / 2048;
    }
    if (p.size >= 7 && t.edge >= 0.08) {
      const size = p.size,
        point = (u) => {
          const v = 1 - u,
            x =
              (3 * v * v * u * 0.065 -
                3 * v * u * u * 0.045 +
                u * u * u * 0.03) *
              t.bend *
              size,
            y =
              (v * v * v * 0.3 +
                3 * v * v * u * 0.08 -
                3 * v * u * u * 0.21 -
                u * u * u * 0.36) *
              size;
          return { x: p.x + c * x - s * y, y: p.y + s * x + c * y };
        };
      let a = point(0);
      for (let i = 1; i <= 12; i++) {
        const b = point(i / 12);
        gpuLine(
          r,
          a,
          b,
          Math.max(0.35, Math.min(0.7, size * 0.018)),
          351,
          0.78,
          0.833,
          alpha * t.edge * 0.65,
        );
        a = b;
      }
    }
    return true;
  }
  function loveTextPlane(image, pose, width, height, alpha) {
    if (loveGpuFrame)
      loveGpuFrame.letters.push({ image, pose, width, height, alpha });
    else lovePlane(image, pose, width, height, alpha);
  }
  function finishLoveGpu() {
    const r = loveGpuFrame;
    if (!r) {
      flushLoveCurvedPetals();
      return;
    }
    const { gl } = r;
    gl.bindVertexArray(r.vao);
    gl.useProgram(r.program);
    gl.uniform2f(r.view, w, h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, r.texture);
    gl.uniform1i(r.atlas, 0);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, r.petalTexture);
    gl.uniform1i(r.petals, 2);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, r.instances);
    gl.uniform1i(r.instanceUniform, 1);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.viewport(0, 0, r.surface.width, r.surface.height);
    for (let i = 0; i < 2; i++) {
      const layer = r.loveLayers[i];
      if (!layer.quads) continue;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const rows = Math.ceil((layer.quads * 4) / 1024);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        1024,
        rows,
        gl.RGBA,
        gl.FLOAT,
        layer.data.subarray(0, rows * 4096),
      );
      gl.uniform1i(r.first, 0);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, layer.quads);
      const surface = i ? nearFx : ctx;
      surface.save();
      surface.globalAlpha = 1;
      surface.globalCompositeOperation = "source-over";
      compositeGpu(r, surface);
      surface.restore();
    }
    loveGpuFrame = null;
    flushLoveCurvedPetals();
    for (const p of r.letters)
      lovePlane(p.image, p.pose, p.width, p.height, p.alpha);
  }
  function nextDepthShape() {
    if (!depthShapeBag.length) depthShapeBag = ["sphere", "saturn", "tunnel"];
    const candidates = depthShapeBag.filter(
        (shape) => shape !== lastDepthShape,
      ),
      shape = candidates[Math.floor(Math.random() * candidates.length)];
    depthShapeBag.splice(depthShapeBag.indexOf(shape), 1);
    lastDepthShape = shape;
    return shape;
  }
  function nextDepthRoute(tx, ty, curved) {
    if (!depthRouteBag.length)
      depthRouteBag = Array.from({ length: 8 }, (_, i) => i);
    const candidates = depthRouteBag.filter(
        (index) => index !== lastDepthRoute,
      ),
      index = candidates[Math.floor(Math.random() * candidates.length)];
    depthRouteBag.splice(depthRouteBag.indexOf(index), 1);
    lastDepthRoute = index;
    const angle = (index * TAU) / 8 + rand(-0.12, 0.12),
      sx = clamp(w * (0.5 + Math.cos(angle) * 0.46), 20, w - 20),
      sy = clamp(horizon * (0.52 + Math.sin(angle) * 0.43), 70, horizon - 20),
      dx = tx - sx,
      dy = ty - sy,
      length = Math.max(1, Math.hypot(dx, dy)),
      nx = -dy / length,
      ny = dx / length;
    const bend = curved
        ? Math.min(w, horizon) *
          rand(0.12, 0.26) *
          (Math.random() < 0.5 ? -1 : 1)
        : 0,
      sweep = Math.random() < 0.5 ? -1 : 1;
    return {
      index,
      sx,
      sy,
      c1x: clamp(sx + dx * 0.32 + nx * bend, 15, w - 15),
      c1y: clamp(sy + dy * 0.32 + ny * bend, 65, horizon - 20),
      c2x: clamp(sx + dx * 0.74 + nx * bend * sweep, 15, w - 15),
      c2y: clamp(sy + dy * 0.74 + ny * bend * sweep, 65, horizon - 20),
      nx,
      ny,
      spiral:
        curved && Math.random() < 0.3
          ? Math.min(w, horizon) * rand(0.035, 0.065)
          : 0,
      phase: rand(0, TAU),
    };
  }
  function launch(
    x = rand(w * 0.19, w * 0.81),
    y = rand(h * 0.14, horizon * 0.72),
    options = {},
  ) {
    if (state.paused || story) return;
    const loveTarget =
      textCloud?.kind === "love" && options.wishId === textCloud.id;
    const ordinaryDepth =
      state.view === "3d" &&
      options.shape === undefined &&
      !Number.isInteger(options.wishGlyph) &&
      !options.companion;
    const ballistic =
      !Number.isInteger(options.wishGlyph) &&
      !options.loveShell &&
      !options.roseCue;
    const tx = clamp(
        x,
        options.roseCue ? 8 : 25,
        w - (options.roseCue ? 8 : 25),
      ),
      ty = options.roseCue
        ? clamp(y, meshRoseViewport().top, meshRoseViewport().bottom)
        : clamp(y, 65, loveTarget ? h - 110 : horizon - 35),
      sx = state.curved
        ? (options.sx ??
          clamp(tx + rand(-w * 0.13, w * 0.13), w * 0.06, w * 0.94))
        : tx,
      sy = !state.curved || loveTarget ? h + 12 : horizon + 6,
      duration =
        (options.duration ??
          (ordinaryDepth ? rand(2.45, 2.75) : rand(0.85, 1.25))) *
        (ballistic ? 0.74 : 1);
    if (rockets.length >= 25) {
      const replace = Number.isInteger(options.wishGlyph)
        ? rockets.findIndex((r) => r.wishGlyph === null)
        : -1;
      if (replace < 0) return;
      const removed = rockets.splice(replace, 1)[0];
      ordinaryComets = ordinaryComets.filter((r) => r !== removed);
    }
    const shape =
      options.shape ?? (ordinaryDepth ? nextDepthShape() : "sphere");
    const rocket = {
      x: sx,
      y: sy,
      sx,
      sy,
      tx,
      ty,
      age: 0,
      duration,
      ballistic,
      hue: options.hue ?? hue(),
      type: options.type ?? state.effect,
      power: options.power ?? 1,
      shape,
      wishGlyph: options.wishGlyph ?? null,
      wishId: options.wishId ?? null,
      companion: options.companion ?? false,
      automatic: options.automatic ?? false,
      curved: state.curved,
      loveShell: Boolean(options.loveShell),
      loveWord: loveTarget ? options.loveWord : null,
      roseCue: loveTarget ? (options.roseCue ?? null) : null,
    };
    rocket.depthFlight =
      ordinaryDepth || rocket.wishGlyph !== null || rocket.loveShell;
    rocket.flightSeed = rocket.wishGlyph ?? Math.floor(rand(0, 1000));
    rocket.depthShell = rocket.depthFlight && state.view === "3d";
    rocket.route = rocket.depthShell
      ? nextDepthRoute(tx, ty, rocket.curved)
      : null;
    if (ballistic && rocket.route && rocket.curved) {
      rocket.route.sx = clamp(
        w * (0.08 + (0.84 * rocket.route.index) / 7) +
          rand(-w * 0.02, w * 0.02),
        w * 0.04,
        w * 0.96,
      );
      rocket.route.sy = horizon + 6;
      rocket.sx = rocket.route.sx;
      rocket.sy = rocket.route.sy;
    }
    if (rocket.route && !rocket.curved) {
      rocket.route.sx = tx;
      rocket.route.sy = sy;
    }
    if (rocket.depthShell) {
      const point = depthShellPoint(rocket, 0);
      rocket.x = point.x;
      rocket.y = point.y;
    }
    if (
      rocket.wishGlyph !== null &&
      textCloud?.id === rocket.wishId &&
      textCloud.glyphs[rocket.wishGlyph]
    )
      textCloud.glyphs[rocket.wishGlyph].comet = rocket;
    if (ordinaryDepth || rocket.loveShell) {
      rocket.tailAt = clock;
      rocket.tailRainbow = state.palette === "rainbow";
      ordinaryComets.push(rocket);
      if (ordinaryComets.length > 40) ordinaryComets.shift();
    }
    rockets.push(rocket);
    rocket.soundVoice = whoosh(tx / w, { duration, from: rocket.x / w });
    return rocket;
  }
  function depthShellPoint(r, t = clamp(r.age / r.duration, 0, 1)) {
    if (!r.curved) {
      const u = r.ballistic ? t * (2 - t) : 1 - Math.pow(1 - t, 1.7),
        f = depthFocal(),
        scale = r.ballistic
          ? 1 / ((1 / 0.42) * (1 - t) + (1 / 1.6) * t)
          : 0.12 + 1.48 * t * t * (3 - 2 * t);
      return {
        x: r.tx,
        y: r.sy + (r.ty - r.sy) * u,
        scale,
        depth: f * (1 / scale - 1),
      };
    }
    if (Number.isInteger(r.loveWord) && state.view === "3d")
      return loveWordFlight(r, t);
    if (r.ballistic && r.route) {
      // Constant world-space vertical acceleration; perspective comes from linear depth travel.
      // The stage has no calibrated metre scale. Timings are intentionally theatrical.
      const f = depthFocal(),
        a = 0.42,
        b = 1.6,
        cx = w * 0.5,
        cy = horizon - h * 0.11,
        z = f * ((1 / a - 1) * (1 - t) + (1 / b - 1) * t),
        scale = f / (f + z),
        rise = t * (2 - t);
      const x0 = (r.route.sx - cx) / a,
        x1 = (r.tx - cx) / b,
        y0 = (r.route.sy - cy) / a,
        y1 = (r.ty - cy) / b,
        bend = r.curved
          ? (r.route.index % 2 ? -1 : 1) * Math.min(w * 0.22, 150) * t * (1 - t)
          : 0;
      return {
        x: cx + (x0 + (x1 - x0) * t + bend) * scale,
        y: cy + (y0 + (y1 - y0) * rise) * scale,
        scale,
        depth: z,
      };
    }
    const scale = 0.12 + 1.48 * t * t * (3 - 2 * t),
      projection = scale / 1.6,
      cx = w * 0.5,
      cy = horizon - h * 0.11,
      side = r.flightSeed % 2 ? -1 : 1;
    if (r.route) {
      const p = r.route,
        u = t * t * (3 - 2 * t),
        v = 1 - u,
        swirl =
          Math.sin(t * TAU * 2 + p.phase) *
          Math.sin(t * Math.PI) ** 2 *
          p.spiral;
      if (!r.curved)
        return {
          x: p.sx + (r.tx - p.sx) * u,
          y: p.sy + (r.ty - p.sy) * u,
          scale,
          depth: depthFocal() * (1 / scale - 1),
        };
      return {
        x:
          v * v * v * p.sx +
          3 * v * v * u * p.c1x +
          3 * v * u * u * p.c2x +
          u * u * u * r.tx +
          p.nx * swirl,
        y:
          v * v * v * p.sy +
          3 * v * v * u * p.c1y +
          3 * v * u * u * p.c2y +
          u * u * u * r.ty +
          p.ny * swirl,
        scale,
        depth: depthFocal() * (1 / scale - 1),
      };
    }
    return {
      x:
        cx +
        (r.tx -
          cx +
          (r.curved
            ? side * Math.min(w * 0.13, 105) * Math.sin(t * Math.PI)
            : 0)) *
          projection,
      y: cy + (r.ty - cy + (r.curved ? h * 0.08 * (1 - t) : 0)) * projection,
      scale,
      depth: depthFocal() * (1 / scale - 1),
    };
  }
  const cometTailSpecs = {
    gold: { life: 0.85, size: 6, fall: 8, spin: 0.3 },
    star: { life: 0.95, size: 8, fall: 3, spin: 0.6 },
    frost: { life: 1.15, size: 12, fall: 5, spin: 0.2 },
    petal: { life: 1.4, size: 12, fall: 14, spin: 1.1 },
    butterfly: { life: 1.35, size: 15, fall: -7, spin: 0.7 },
  };
  function wishTailVisibility(show, x, y, size = 0) {
    if (show.kind === "love") return loveTextVisibility(show, x, y, size);
    let visibility = 1;
    for (const g of show.glyphs)
      if (g.born !== null) {
        const dx = Math.max(Math.abs(x - g.x) - g.font * 0.56 - size * 0.35, 0),
          dy = Math.max(Math.abs(y - g.y) - g.font * 0.6 - size * 0.35, 0);
        visibility = Math.min(visibility, clamp(Math.hypot(dx, dy) / 14, 0, 1));
      }
    return visibility;
  }
  function wishCometTail(show, g) {
    const r = g.comet;
    if (
      state.view !== "3d" ||
      show !== textCloud ||
      !g.fired ||
      !r ||
      r.wishId !== show.id
    )
      return [];
    return cometTailMotes(r, {
      age: Math.max(r.age, show.age - g.flightAt),
      time: show.age,
      effect: show.effect,
      rainbow: show.rainbow,
      color: g.hue,
      rank: g.rank,
      show,
    });
  }
  function ordinaryCometTail(r) {
    if (state.view !== "3d" || !ordinaryComets.includes(r)) return [];
    return cometTailMotes(r, {
      age: Math.max(r.age, clock - r.tailAt),
      time: clock,
      effect: r.type,
      rainbow: r.tailRainbow,
      color: r.hue,
      rank: r.flightSeed,
      show: textCloud,
    });
  }
  function refreshCometMaterials() {
    for (const r of ordinaryComets) {
      r.type = state.effect;
      r.tailRainbow = state.palette === "rainbow";
      r.hue = hue();
    }
  }
  function cometTailMotes(
    r,
    { age, time, effect, rainbow, color, rank, show = null },
  ) {
    const step = r.loveShell ? 0.14 : 0.075,
      motes = [];
    if (age > r.duration + 1.45) return motes;
    const first = Math.max(0, Math.ceil((age - 1.45) / step)),
      last = Math.floor(Math.min(age, r.duration) / step);
    for (let i = first; i <= last; i++) {
      const type =
          effect === "mix"
            ? materialTypes[(i + rank * 2) % materialTypes.length]
            : effect,
        spec = cometTailSpecs[type],
        life = materialLifetime(type, spec.life),
        elapsed = age - i * step;
      if (elapsed <= 0 || elapsed >= life) continue;
      const progress = elapsed / life,
        phase = i * 2.4 + rank * 0.7,
        seed = Math.sin(i * 12.9898 + rank * 78.233) * 0.5 + 0.5,
        point = depthShellPoint(r, (i * step) / r.duration),
        next = depthShellPoint(r, Math.min(1, (i * step + 0.02) / r.duration));
      const dx = next.x - point.x,
        dy = next.y - point.y,
        length = Math.max(0.01, Math.hypot(dx, dy)),
        sway = Math.sin(phase + elapsed * 2.4) * elapsed * (4 + seed * 5);
      const x = point.x - (dy / length) * sway + state.wind * elapsed * 9,
        y =
          point.y +
          (dx / length) * sway +
          spec.fall * elapsed +
          (type === "petal" ? 6 : type === "frost" ? 2 : 0) *
            elapsed *
            elapsed +
          (type === "butterfly"
            ? Math.sin(phase + elapsed * 4) * elapsed * 5
            : 0);
      const size =
          spec.size * clamp(point.scale, 0.2, 1.2) * (1 - progress * 0.22),
        twinkle =
          type === "frost" || type === "star"
            ? 0.42 + 0.58 * Math.sin(time * 7 + phase) ** 2
            : 1;
      const alpha =
        clamp(elapsed / 0.09, 0, 1) *
        Math.pow(1 - progress, 0.7) *
        0.85 *
        twinkle *
        (show ? wishTailVisibility(show, x, y, size) : 1);
      const flutter =
        type === "butterfly"
          ? 0.22 + 0.78 * Math.abs(Math.sin(time * 5.5 + phase))
          : type === "petal"
            ? 0.4 + 0.6 * Math.abs(Math.sin(time * 1.9 + phase))
            : 1;
      motes.push({
        x,
        y,
        size,
        type,
        hue: rainbow ? color + i * 137.5 : color + Math.sin(phase) * 5,
        variant: i % 3,
        rotation: phase + spec.spin * elapsed,
        flutter,
        alpha,
      });
    }
    return motes;
  }
  // Shared 3D shells stay visible above the blessing's reading mask.
  function drawDepthShells() {
    if (state.view !== "3d") return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (const r of ordinaryComets)
      for (const m of ordinaryCometTail(r)) {
        if (m.alpha < 0.01) continue;
        ctx.globalCompositeOperation =
          m.type === "petal" || m.type === "butterfly"
            ? "source-over"
            : "lighter";
        ctx.globalAlpha = m.alpha;
        paintWishMote(ctx, m, m.x, m.y, m.size, m.rotation, m.flutter);
      }
    for (const g of textCloud?.glyphs || [])
      for (const m of wishCometTail(textCloud, g)) {
        if (m.alpha < 0.01) continue;
        ctx.globalCompositeOperation =
          m.type === "petal" || m.type === "butterfly"
            ? "source-over"
            : "lighter";
        ctx.globalAlpha = m.alpha;
        paintWishMote(ctx, m, m.x, m.y, m.size, m.rotation, m.flutter);
      }
    ctx.globalCompositeOperation = "lighter";
    for (const r of rockets) {
      if (!r.depthShell || (r.wishId !== null && r.wishId !== textCloud?.id))
        continue;
      const glyph =
          r.wishGlyph !== null && textCloud?.id === r.wishId
            ? textCloud.glyphs[r.wishGlyph]
            : null,
        materialTail = glyph
          ? textCloud.effect !== "gold"
          : Number.isFinite(r.tailAt) && r.type !== "gold",
        ribbon = materialTail ? 0.38 : 1,
        color = glyph?.hue ?? r.hue;
      const head = depthShellPoint(r),
        tail = 0.82,
        steps = compactControls ? (r.curved ? 24 : 18) : 32;
      for (let i = 0; i < steps; i++) {
        const a = Math.max(0, r.age - tail + (i * tail) / steps),
          b = Math.max(0, r.age - tail + ((i + 1) * tail) / steps);
        if (a === b) continue;
        const p = depthShellPoint(r, a / r.duration),
          q = depthShellPoint(r, b / r.duration),
          heat = (i + 1) / steps;
        const dx = q.x - p.x,
          dy = q.y - p.y,
          length = Math.max(0.01, Math.hypot(dx, dy)),
          nx = -dy / length,
          ny = dx / length;
        ctx.globalAlpha = Math.pow(heat, 1.5) * 0.22 * ribbon;
        ctx.strokeStyle = `hsl(${color + (1 - heat) * 28},100%,62%)`;
        ctx.lineWidth = (0.5 + q.scale * 8) * heat;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
        ctx.globalAlpha = heat * heat * 0.75 * ribbon;
        ctx.strokeStyle = `hsl(${color + 12},100%,83%)`;
        ctx.lineWidth = Math.max(0.25, heat * q.scale * 3.1);
        ctx.stroke();
        ctx.globalAlpha = heat * 0.85 * ribbon;
        ctx.strokeStyle = "#fff6d8";
        ctx.lineWidth = Math.max(0.2, heat * q.scale * 1.1);
        ctx.stroke();
        const twist =
          Math.sin(b * 18 + r.flightSeed) * q.scale * 1.5 * (1 - heat);
        ctx.globalAlpha = heat * 0.4 * ribbon;
        ctx.lineWidth = Math.max(0.25, q.scale * 0.5);
        ctx.strokeStyle = `hsl(${color - 22},100%,78%)`;
        ctx.beginPath();
        ctx.moveTo(p.x + nx * twist, p.y + ny * twist);
        ctx.lineTo(q.x + nx * twist, q.y + ny * twist);
        ctx.stroke();
        if (!materialTail && i % 3 === 0) {
          const flicker = Math.sin(i * 4.7 + r.age * 9),
            scatter = (1 - heat) * q.scale * 25,
            s = Math.max(0.5, q.scale * 2.2 * heat);
          ctx.globalAlpha = heat * 0.75;
          ctx.fillStyle = `hsl(${color + 25},100%,79%)`;
          ctx.fillRect(
            p.x + nx * flicker * scatter,
            p.y + ny * flicker * scatter + (1 - heat) * 8,
            s,
            s,
          );
        }
      }
      const radius = Math.max(0.4, head.scale * 3.3),
        glow = head.scale * 34,
        previous = depthShellPoint(r, Math.max(0, (r.age - 0.03) / r.duration)),
        angle = Math.atan2(head.y - previous.y, head.x - previous.x);
      ctx.globalAlpha = 0.72;
      ctx.drawImage(
        sprite(color, "gold"),
        head.x - glow / 2,
        head.y - glow / 2,
        glow,
        glow,
      );
      ctx.save();
      ctx.translate(head.x, head.y);
      ctx.rotate(angle);
      ctx.scale(1.3, 0.7);
      const fire = ctx.createRadialGradient(
        -radius * 0.25,
        -radius * 0.3,
        radius * 0.05,
        0,
        0,
        radius,
      );
      fire.addColorStop(0, "#fffef4");
      fire.addColorStop(0.27, "#fff8d5");
      fire.addColorStop(0.6, `hsl(${color},100%,83%)`);
      fire.addColorStop(1, `hsla(${color},100%,54%,.7)`);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = fire;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "#fffdef";
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(
        head.x - radius * 0.12,
        head.y - radius * 0.16,
        radius * 0.36,
        0,
        TAU,
      );
      ctx.fill();
    }
    for (const g of textCloud?.glyphs || []) {
      if (g.born === null) continue;
      const age = textCloud.age - g.born,
        t = age / 0.65;
      if (t < 0 || t >= 1) continue;
      const radius = g.font * (0.12 + 0.95 * (1 - Math.pow(1 - t, 2))),
        alpha = Math.pow(1 - t, 1.7);
      ctx.globalAlpha = alpha * 0.75;
      ctx.strokeStyle = `hsl(${g.hue},95%,85%)`;
      ctx.lineWidth = 1.5 * (1 - t) + 0.4;
      ctx.beginPath();
      ctx.ellipse(g.x, g.y, radius, radius * 0.56, -0.25, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 24; i++) {
        const angle = (i * TAU) / 24 + g.rank,
          reach = radius * (0.65 + 0.35 * Math.sin(i * 2.4) ** 2),
          inner = reach * (0.3 + 0.5 * t);
        ctx.strokeStyle = `hsl(${g.hue + (textCloud.rainbow ? i * 47 : Math.sin(i) * 15)},95%,80%)`;
        ctx.beginPath();
        ctx.moveTo(
          g.x + Math.cos(angle) * inner,
          g.y + Math.sin(angle) * inner,
        );
        ctx.lineTo(
          g.x + Math.cos(angle) * reach,
          g.y + Math.sin(angle) * reach,
        );
        ctx.stroke();
      }
      const glow = g.font * (1.85 - t * 1.2);
      ctx.globalAlpha = alpha;
      ctx.drawImage(
        sprite(g.hue, "gold"),
        g.x - glow / 2,
        g.y - glow / 2,
        glow,
        glow,
      );
    }
    ctx.restore();
  }
  function schedule(delay, callback, automatic = false) {
    pending.push({ at: clock + delay, callback, automatic });
  }
  function finale() {
    if (story) return;
    if (state.paused) {
      notify("演出已暂停，继续后即可齐放");
      return;
    }
    if (clock - lastFinale < 2) return;
    lastFinale = clock;
    if (!wish) {
      audioController.accentUntil = clock + 9;
      syncPerformanceScore();
    }
    const n = w < 600 ? 7 : 11;
    for (let i = 0; i < n; i++)
      schedule(i * 0.13, () =>
        launch(
          w * (0.15 + (0.7 * i) / (n - 1)),
          h * (0.18 + Math.sin((i / (n - 1)) * Math.PI) * 0.14),
          { power: 1.15, sx: w * (0.2 + (0.6 * i) / (n - 1)) },
        ),
      );
    schedule(1.7, () => {
      for (let i = 0; i < 3; i++)
        launch(w * (0.3 + 0.2 * i), h * 0.22, { power: 1.25 });
    });
  }
  function specialShow(mode) {
    if (story) return;
    if (state.paused) {
      notify("请先继续演出，再开启夜空里的奇遇");
      return;
    }
    if (wish) {
      notify("先让这句祝福完整绽放，再开启下一场奇遇");
      return;
    }
    initAudio();
    closePanels();
    stopSoundVoices();
    pending = [];
    rockets = [];
    ordinaryComets = [];
    meteors = [];
    encounter = null;
    particles.forEach((p) => (p.life = Math.min(p.life, 0.65)));
    specialUntil = clock + 9;
    audioController.accentUntil = 0;
    clearTimeout(notify.timer);
    $("toast").hidden = true;
    if (mode === "heart" || mode === "orbit" || mode === "meteor") {
      encounter = createEncounter(mode);
      specialUntil = clock + encounter.duration;
      specialCaption = { scene: mode, ...encounterCaption(mode) };
    } else if (mode === "depth") {
      setViewMode("3d");
      launch(w * 0.5, h * 0.31, {
        shape: "tunnel",
        power: w < 600 ? 1.2 : 1.4,
      });
      schedule(1.65, () =>
        launch(w * 0.5, h * 0.29, {
          shape: "saturn",
          power: w < 600 ? 0.8 : 1.05,
        }),
      );
      schedule(3.1, () => {
        launch(w * 0.28, h * 0.3, { shape: "tunnel", power: 0.85 });
        launch(w * 0.72, h * 0.25, { shape: "tunnel", power: 0.85 });
      });
      specialCaption = { name: "临境", note: "让星光，越过夜空来到你面前" };
    }
    updateCaption();
    syncPerformanceScore();
  }
  function createEncounter(mode) {
    const rng = seeded(Math.floor(rand(1, 1e8))),
      field = Array.from({ length: 144 }, (_, i) => ({
        angle: i * 2.39996,
        r: 0.38 + rng() * 0.9,
        z: rng() * 1.7 - 0.85,
        phase: rng() * TAU,
        speed: 0.3 + rng() * 0.4,
      }));
    const comets = Array.from({ length: 28 }, (_, i) => ({
      at: 0.3 + i * 0.18,
      duration: 2.6 + (i % 3) * 0.22,
      sx: -1.65 + (i % 5) * 0.31,
      sy: -1.12 - (i % 3) * 0.17,
      ex: 0.5 + (i % 5) * 0.23,
      ey: 0.3 + (i % 4) * 0.16,
      z: 0.8 - (i % 4) * 0.35,
      hue: i * 23,
    }));
    const show = {
      mode,
      age: 0,
      duration: mode === "meteor" ? 16.5 : 12,
      effect: state.effect,
      rainbow: state.palette === "rainbow",
      hue: hue(),
      field,
      comets,
      motes: [],
      cursor: 0,
      beats: 0,
    };
    if (mode === "meteor" && state.view === "3d") {
      show.birdMesh = encounterBirdMesh();
      prepareEncounterBirdGpu(show.birdMesh);
    }
    return show;
  }
  function encounterCaption(mode) {
    const flat = state.view === "2d",
      names = flat
        ? {
            heart: "心动 · 心弦共振",
            orbit: "星环 · 星图圆舞",
            meteor: "流星 · 银翼寄愿",
          }
        : {
            heart: "心动 · 怦然一瞬",
            orbit: "星环 · 星海天仪",
            meteor: "流星 · 星鹤逐愿",
          },
      notes = flat
        ? {
            heart: "两束流光，描出同一拍心跳",
            orbit: "同心星盘，旋成一幅会呼吸的星图",
            meteor: "银翼横掠星空，留下一笔流星与光羽",
          }
        : {
            heart: "两束流光相遇，凝成一颗会跳动的琉璃心",
            orbit: "绕过光环，看见一颗发光的行星",
            meteor: "星鹤振羽掠过，留下一场轻柔的落羽",
          };
    return { name: names[mode], note: notes[mode] };
  }
  const encounterEase = (t) => {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  };
  let encounterProjection = null;
  function encounterFrame() {
    if (
      encounterProjection &&
      encounterProjection.w === w &&
      encounterProjection.h === h &&
      encounterProjection.yaw === depthView.x &&
      encounterProjection.pitch === depthView.y
    )
      return encounterProjection;
    return (encounterProjection = {
      w,
      h,
      yaw: depthView.x,
      pitch: depthView.y,
      x: w * 0.5,
      y: horizon * (h < 540 ? 0.55 : 0.59),
      unit: Math.min(w * 0.335, horizon * 0.43),
      focal: depthFocal(),
      cy: Math.cos(depthView.x),
      sy: Math.sin(depthView.x),
      cp: Math.cos(depthView.y),
      sp: Math.sin(depthView.y),
    });
  }
  function encounterPoint(x, y, z = 0) {
    const f = encounterFrame();
    if (state.view !== "3d")
      return {
        x: f.x + x * f.unit,
        y: f.y + y * f.unit,
        scale: 1,
        z: 0,
        alpha: 1,
      };
    const xx = (x * f.cy + z * f.sy) * f.unit,
      zz = (z * f.cy - x * f.sy) * f.unit,
      yy = y * f.unit * f.cp - zz * f.sp,
      rz = y * f.unit * f.sp + zz * f.cp,
      distance = f.focal + rz;
    if (distance < f.focal * 0.16) return null;
    const scale = f.focal / distance;
    return {
      x: f.x + xx * scale,
      y: f.y + yy * scale,
      scale,
      z: rz,
      alpha:
        clamp((distance / f.focal - 0.16) / 0.22, 0, 1) *
        clamp(0.42 + scale * 0.58, 0.5, 1),
    };
  }
  function encounterColor(show, i = 0) {
    return (
      show.hue +
      (show.rainbow ? i * 47 : i % 3 === 1 ? 65 : i % 3 === 2 ? -24 : 0)
    );
  }
  function encounterMote(
    show,
    visible,
    x,
    y,
    z,
    size,
    color,
    alpha = 1,
    type = "gold",
  ) {
    const q = encounterPoint(x, y, z);
    if (!q || alpha < 0.003) return;
    const i = show.cursor++,
      p =
        show.motes[i] ||
        (show.motes[i] = {
          history: [],
          spatial: { ring: true },
          max: 1,
          life: 0.8,
          depth: 0.96,
          seed: i * 2.39996,
          variant: i % 3,
          trail: false,
        });
    if (p.type !== type || p.imageHue !== Math.round(color / 15)) {
      p.image = null;
      p.imageHue = Math.round(color / 15);
    }
    p.x = q.x;
    p.y = q.y;
    p.hue = color;
    p.type = type;
    p.size = size;
    p.rotation = show.age * 0.23 + i * 1.31;
    p.projectedScale = q.scale;
    p.renderZ = q.z;
    p.renderAlpha =
      alpha * q.alpha * clamp(0.85 + (q.scale - 1) * 0.8, 0.42, 1);
    visible.push(p);
  }
  function encounterTrace(points, color, alpha, width = 1) {
    if (alpha < 0.003) return;
    fx.globalCompositeOperation = "lighter";
    fx.strokeStyle = `hsla(${color},90%,76%,${alpha})`;
    fx.lineWidth = width;
    fx.beginPath();
    let drawing = false;
    for (const p of points) {
      if (!p) {
        drawing = false;
        continue;
      }
      if (drawing) fx.lineTo(p.x, p.y);
      else {
        fx.moveTo(p.x, p.y);
        drawing = true;
      }
    }
    fx.stroke();
  }
  function encounterHead(point, color, size, alpha = 1) {
    if (!point) return;
    const s = size * point.scale;
    fx.globalAlpha = alpha * point.alpha;
    fx.globalCompositeOperation = "lighter";
    fx.drawImage(sprite(color, "gold"), point.x - s, point.y - s, s * 2, s * 2);
    fx.drawImage(
      sprite(color, "star", 1),
      point.x - s * 0.48,
      point.y - s * 0.48,
      s * 0.96,
      s * 0.96,
    );
    fx.globalAlpha = 1;
  }
  function encounterBurst(show, x, y, color, power = 0.65) {
    const q = encounterPoint(x, y, 0);
    if (!q) return;
    const from = particles.length;
    burst(q.x, q.y, color, show.effect, power, "sphere", {
      density: 0.33,
      noEcho: true,
    });
    for (let i = from; i < particles.length; i++) {
      particles[i].life = Math.min(particles[i].life, 2.1);
      particles[i].max = Math.min(particles[i].max, 2.1);
    }
  }
  function encounterWorld(p, pose) {
    const m =
        pose.rotation ||
        (pose.rotation = [
          Math.cos(pose.yaw || 0),
          Math.sin(pose.yaw || 0),
          Math.cos(pose.pitch || 0),
          Math.sin(pose.pitch || 0),
          Math.cos(pose.roll || 0),
          Math.sin(pose.roll || 0),
        ]),
      x = p.x * m[0] + p.z * m[1],
      z = p.z * m[0] - p.x * m[1],
      y = p.y * m[2] - z * m[3],
      zz = p.y * m[3] + z * m[2],
      scale = pose.scale ?? 1;
    return {
      x: pose.x + (x * m[4] - y * m[5]) * scale,
      y: pose.y + (x * m[5] + y * m[4]) * scale,
      z: pose.z + zz * scale,
    };
  }
  function encounterFace(mesh, a, b, c, part = "solid", tint = 0) {
    mesh.faces.push({ a, b, c, part, tint });
  }
  function encounterEllipsoid(mesh, center, radius, around = 12, rows = 7) {
    const start = mesh.vertices.length;
    for (let j = 0; j <= rows; j++)
      for (let i = 0; i <= around; i++) {
        const v = (j / rows) * Math.PI,
          u = (i / around) * TAU;
        mesh.vertices.push({
          x: center.x + Math.sin(v) * Math.cos(u) * radius.x,
          y: center.y + Math.cos(v) * radius.y,
          z: center.z + Math.sin(v) * Math.sin(u) * radius.z,
          normal: [
            (Math.sin(v) * Math.cos(u)) / radius.x,
            Math.cos(v) / radius.y,
            (Math.sin(v) * Math.sin(u)) / radius.z,
          ],
          uv: [i / around, j / rows],
        });
      }
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < around; i++) {
        const a = start + j * (around + 1) + i,
          b = a + 1,
          c = a + around + 1,
          d = c + 1;
        encounterFace(mesh, a, c, b);
        encounterFace(mesh, b, c, d);
      }
  }
  function encounterBirdNeck(mesh) {
    const start = mesh.vertices.length,
      rows = compactControls ? 18 : 26,
      around = compactControls ? 16 : 22,
      centers = [];
    for (let j = 0; j <= rows; j++) {
      const u = j / rows,
        y = -0.025 - 0.057 * Math.sin(u * Math.PI * 0.63),
        z = -0.17 - u * 0.47,
        dy = -0.057 * Math.PI * 0.63 * Math.cos(u * Math.PI * 0.63),
        dz = -0.47,
        length = Math.hypot(dy, dz),
        radius = 0.044 - u * 0.012;
      centers.push({ y, z });
      for (let i = 0; i <= around; i++) {
        const a = (i / around) * TAU;
        mesh.vertices.push({
          x: Math.cos(a) * radius,
          y: y + ((Math.sin(a) * dz) / length) * radius,
          z: z - ((Math.sin(a) * dy) / length) * radius,
          normal: [
            Math.cos(a),
            (Math.sin(a) * dz) / length,
            (-Math.sin(a) * dy) / length,
          ],
          uv: [i / around, u],
        });
      }
    }
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < around; i++) {
        const a = start + j * (around + 1) + i,
          b = a + 1,
          c = a + around + 1,
          d = c + 1;
        for (const ids of [
          [a, b, c],
          [b, d, c],
        ]) {
          const [p, q, r] = ids.map((i) => mesh.vertices[i]),
            uy = q.y - p.y,
            uz = q.z - p.z,
            ux = q.x - p.x,
            vy = r.y - p.y,
            vz = r.z - p.z,
            vx = r.x - p.x,
            nx = uy * vz - uz * vy,
            ny = uz * vx - ux * vz,
            nz = ux * vy - uy * vx,
            cy = (centers[j].y + centers[j + 1].y) / 2,
            cz = (centers[j].z + centers[j + 1].z) / 2,
            dot =
              nx * (p.x + q.x + r.x) +
              ny * (p.y + q.y + r.y - 3 * cy) +
              nz * (p.z + q.z + r.z - 3 * cz);
          encounterFace(
            mesh,
            ids[0],
            ids[dot < 0 ? 2 : 1],
            ids[dot < 0 ? 1 : 2],
          );
        }
      }
  }
  function encounterSurface(
    mesh,
    pose,
    alpha,
    color,
    deform = null,
    crystal = false,
  ) {
    if (alpha < 0.003) return;
    const world = mesh.vertices.map((v) =>
        encounterWorld(deform ? deform(v) : v, pose),
      ),
      projected = world.map((p) => encounterPoint(p.x, p.y, p.z)),
      faces = [];
    for (const face of mesh.faces) {
      if (face.blade !== undefined) continue;
      const a = world[face.a],
        b = world[face.b],
        c = world[face.c],
        pa = projected[face.a],
        pb = projected[face.b],
        pc = projected[face.c];
      if (!pa || !pb || !pc) continue;
      const ux = b.x - a.x,
        uy = b.y - a.y,
        uz = b.z - a.z,
        vx = c.x - a.x,
        vy = c.y - a.y,
        vz = c.z - a.z;
      let nx = uy * vz - uz * vy,
        ny = uz * vx - ux * vz,
        nz = ux * vy - uy * vx;
      const length = Math.hypot(nx, ny, nz);
      if (length < 1e-8) continue;
      nx /= length;
      ny /= length;
      nz /= length;
      if (face.part === "solid" && nz > 0) continue;
      if (nz > 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      const light = Math.max(0, nx * -0.38 + ny * -0.5 + nz * -0.77),
        shine =
          Math.max(0, nx * -0.23 + ny * -0.4 + nz * -0.89) **
          (crystal ? 16 : 7),
        rim = (1 - Math.abs(nz)) ** 3;
      faces.push({
        face,
        pa,
        pb,
        pc,
        z: (a.z + b.z + c.z) / 3,
        light,
        shine,
        rim,
      });
    }
    // Each cambered feather is one continuous projected vane, avoiding faceted strip seams.
    for (const part of mesh.feathers || []) {
      const outline = part.outline.map((i) => projected[i]);
      if (outline.some((p) => !p)) continue;
      const a = world[part.start + 3],
        b = world[part.start + 5],
        c = world[part.rib.at(-1)],
        ux = b.x - a.x,
        uy = b.y - a.y,
        uz = b.z - a.z,
        vx = c.x - a.x,
        vy = c.y - a.y,
        vz = c.z - a.z;
      let nx = uy * vz - uz * vy,
        ny = uz * vx - ux * vz,
        nz = ux * vy - uy * vx;
      const length = Math.hypot(nx, ny, nz) || 1;
      nx /= length;
      ny /= length;
      nz /= length;
      if (nz > 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      const light = Math.max(0, nx * -0.38 + ny * -0.5 + nz * -0.77),
        root = projected[part.rib[0]],
        tip = projected[part.rib.at(-1)];
      faces.push({
        outline,
        root,
        tip,
        z: part.rib.reduce((sum, i) => sum + world[i].z, 0) / part.rib.length,
        light,
        tint: mesh.faces[part.faceStart].tint,
      });
    }
    faces.sort((a, b) => b.z - a.z);
    fx.save();
    fx.globalCompositeOperation = "source-over";
    for (const f of faces) {
      if (f.outline) {
        const hue = color + f.tint,
          l = 65 + f.light * 25,
          gradient = fx.createLinearGradient(
            f.root.x,
            f.root.y,
            f.tip.x,
            f.tip.y,
          );
        gradient.addColorStop(0, `hsla(${hue - 8},30%,${l - 8}%,.75)`);
        gradient.addColorStop(0.4, `hsl(${hue},25%,${Math.min(97, l + 7)}%)`);
        gradient.addColorStop(1, `hsla(${hue + 15},40%,${l}%,.35)`);
        fx.globalAlpha =
          alpha * 0.78 * Math.min(...f.outline.map((p) => p.alpha));
        fx.fillStyle = gradient;
        fx.beginPath();
        f.outline.forEach((p, i) =>
          i ? fx.lineTo(p.x, p.y) : fx.moveTo(p.x, p.y),
        );
        fx.closePath();
        fx.fill();
        continue;
      }
      const feather = f.face.part === "feather",
        l = crystal
          ? 29 + f.light * 40 + f.shine * 23
          : 58 + f.light * 25 + f.shine * 12,
        hue = color + f.face.tint + (crystal ? f.rim * 44 : 0),
        saturation = crystal ? 68 : feather ? 38 : 28;
      fx.globalAlpha =
        alpha *
        (crystal ? 0.88 : feather ? 0.63 : 0.9) *
        Math.min(f.pa.alpha, f.pb.alpha, f.pc.alpha);
      fx.fillStyle = `hsl(${hue},${saturation}%,${l}%)`;
      fx.beginPath();
      fx.moveTo(f.pa.x, f.pa.y);
      fx.lineTo(f.pb.x, f.pb.y);
      fx.lineTo(f.pc.x, f.pc.y);
      fx.closePath();
      fx.fill();
      if (crystal && f.shine > 0.24) {
        fx.strokeStyle = `hsla(${hue + 16},75%,94%,${f.shine * 0.6})`;
        fx.lineWidth = 0.45;
        fx.stroke();
      }
    }
    fx.restore();
    return { world, projected };
  }
  function encounterHeartMesh() {
    const mesh = { vertices: [], faces: [] },
      around = compactControls ? 40 : 56,
      rows = compactControls ? 14 : 22;
    for (let j = 0; j <= rows; j++) {
      const v = -Math.PI / 2 + (j / rows) * Math.PI,
        layer = Math.cos(v);
      for (let i = 0; i <= around; i++) {
        const a = (i / around) * TAU;
        mesh.vertices.push({
          x: ((16 * Math.sin(a) ** 3) / 17) * layer,
          y:
            (-(
              13 * Math.cos(a) -
              5 * Math.cos(2 * a) -
              2 * Math.cos(3 * a) -
              Math.cos(4 * a)
            ) /
              17 -
              0.13) *
            layer,
          z: 0.39 * Math.sin(v) * (1 + 0.08 * Math.cos(a) * layer),
        });
      }
    }
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < around; i++) {
        const a = j * (around + 1) + i,
          b = a + 1,
          c = a + around + 1,
          d = c + 1;
        for (const ids of [
          [a, b, c],
          [b, d, c],
        ]) {
          const [p, q, r] = ids.map((k) => mesh.vertices[k]),
            u = { x: q.x - p.x, y: q.y - p.y, z: q.z - p.z },
            v = { x: r.x - p.x, y: r.y - p.y, z: r.z - p.z },
            normal = {
              x: u.y * v.z - u.z * v.y,
              y: u.z * v.x - u.x * v.z,
              z: u.x * v.y - u.y * v.x,
            },
            dot =
              normal.x * (p.x + q.x + r.x) +
              normal.y * (p.y + q.y + r.y) +
              normal.z * (p.z + q.z + r.z);
          encounterFace(
            mesh,
            ids[0],
            ids[dot < 0 ? 2 : 1],
            ids[dot < 0 ? 1 : 2],
            "solid",
            Math.sin(i * 0.3 + j * 0.2) * 3,
          );
        }
      }
    return mesh;
  }
  function encounterHeartbeat(t) {
    const p = (((t - 3.5) % 1.8) + 1.8) % 1.8;
    return (
      Math.exp(-(((p - 0.16) / 0.075) ** 2)) * 0.092 +
      Math.exp(-(((p - 0.37) / 0.1) ** 2)) * 0.045
    );
  }
  function encounterBinary(t, side) {
    const u = encounterEase(t / 2.55),
      sign = side ? 1 : -1;
    return {
      x: sign * (1.45 * (1 - u) + 0.055 * u),
      y: -0.57 * (1 - u) + Math.sin(u * Math.PI) * 0.14 * sign,
      z: 0.6 * (1 - u),
    };
  }
  function drawBinaryEncounter(s, visible, fade) {
    const t = s.age,
      formed = encounterEase((t - 2.3) / 1.8),
      release = encounterEase((t - 9.7) / 2),
      pulse = encounterHeartbeat(t),
      color = s.rainbow ? 334 : s.hue,
      colors = s.rainbow ? [334, 42] : [s.hue, s.hue + 38];
    for (let side = 0; side < 2; side++) {
      const path = [];
      for (let j = 0; j < 42; j++) {
        const p = encounterBinary(Math.max(0, t - j * 0.026), side);
        path.unshift(encounterPoint(p.x, p.y, p.z));
      }
      const arrival = fade * (1 - encounterEase((t - 2.4) / 0.65));
      encounterTrace(path, colors[side], arrival * 0.15, 10);
      encounterTrace(path, colors[side], arrival * 0.85, 1.1);
      const p = encounterBinary(t, side);
      encounterHead(
        encounterPoint(p.x, p.y, p.z),
        colors[side],
        w < 700 ? 27 : 39,
        arrival,
      );
    }
    const mesh = s.heartMesh || (s.heartMesh = encounterHeartMesh()),
      pose = {
        x: 0,
        y: -0.05,
        z: 0,
        scale: (0.32 + 0.42 * formed) * (1 + pulse),
        yaw: state.view === "3d" ? 0.26 * Math.sin(t * 0.43) : 0.08,
        pitch: 0.08 * Math.sin(t * 0.35),
        roll: Math.sin(t * 0.54) * 0.035,
      };
    const sculpted = encounterSurface(
      mesh,
      pose,
      fade * formed * (1 - release),
      color,
      null,
      true,
    );
    if (sculpted) {
      const stride = w < 700 ? 10 : 12;
      for (let i = 0; i < mesh.vertices.length; i += stride) {
        const p = sculpted.world[i],
          q = mesh.vertices[i];
        if (q.z > -0.12) continue;
        const shimmer = 0.35 + 0.65 * Math.sin(i * 1.7 + t * 1.4) ** 8;
        const spread = release * release,
          seed = s.field[i % s.field.length],
          x = p.x + Math.cos(seed.angle) * spread * 0.65,
          y = p.y - spread * (0.6 + seed.r * 0.4),
          z = p.z - spread * (0.3 + seed.z * 0.25);
        encounterMote(
          s,
          visible,
          x,
          y,
          z,
          0.45 + release * 0.2,
          color + (s.rainbow ? i * 0.65 : 10),
          fade *
            formed *
            (release > 0.01 ? Math.sin(release * Math.PI) : shimmer * 0.7),
        );
      }
    }
    // The trace and the sculpture share one double-beat rhythm.
    const ecg = [
        [-1.27, 0.81],
        [-0.48, 0.81],
        [-0.34, 0.74],
        [-0.26, 0.91],
        [-0.17, 0.51],
        [-0.07, 1.03],
        [0.03, 0.75],
        [0.14, 0.81],
        [1.27, 0.81],
      ],
      line = ecg.map(([x, y]) => encounterPoint(x, y, 0.12)),
      traceAlpha = fade * encounterEase((t - 1.5) / 1.3) * (1 - release * 0.8);
    encounterTrace(line, colors[0], traceAlpha * 0.1, 7);
    encounterTrace(line, colors[0], traceAlpha * 0.64, 0.85);
    const progress = ((((t - 3.66) / 1.8 + 0.5) % 1) + 1) % 1,
      position = progress * (ecg.length - 1),
      index = Math.min(ecg.length - 2, Math.floor(position)),
      fraction = position - index,
      a = ecg[index],
      b = ecg[index + 1];
    encounterHead(
      encounterPoint(
        a[0] + (b[0] - a[0]) * fraction,
        a[1] + (b[1] - a[1]) * fraction,
        0.12,
      ),
      colors[1],
      7,
      traceAlpha,
    );
    for (let beat = 0; beat < 4; beat++) {
      const age = t - (3.66 + beat * 1.8);
      if (age < 0 || age > 1.45) continue;
      const r = 0.65 + age * 0.58,
        alpha = fade * (1 - age / 1.45) * 0.5,
        path = [];
      for (let i = 0; i <= 90; i++) {
        const a = (i / 90) * TAU;
        path.push(
          encounterPoint(
            Math.cos(a) * r,
            Math.sin(a) * r * 0.68,
            Math.sin(a) * r * 0.42 + 0.12,
          ),
        );
      }
      encounterTrace(path, colors[beat % 2], alpha * 0.17, 5);
      encounterTrace(path, colors[beat % 2], alpha, 1.05);
    }
    const n = w < 700 ? 35 : 60;
    for (let i = 0; i < n; i++) {
      const f = s.field[i],
        u = (t * 0.1 + f.phase / TAU) % 1,
        r = 1.05 + u * 0.28,
        z = f.z * 0.45;
      encounterMote(
        s,
        visible,
        Math.cos(f.angle) * r,
        Math.sin(f.angle) * r * 0.65,
        z,
        0.38,
        colors[i % 2],
        fade * formed * Math.sin(u * Math.PI) * 0.5,
      );
    }
    if (t >= 2.55 && s.beats === 0) {
      s.beats = 1;
      const q = encounterPoint(0, 0, 0);
      if (q) {
        flashes.push({
          x: q.x,
          y: q.y,
          life: 0.3,
          max: 0.3,
          hue: color,
          power: 0.35,
        });
        boom(q.x / w, 0.5);
      }
    }
  }
  function encounterPlanet(q, r, color, alpha, age = 0) {
    if (!q) return;
    r *= q.scale;
    fx.save();
    fx.globalCompositeOperation = "source-over";
    fx.globalAlpha = alpha;
    fx.translate(q.x, q.y);
    fx.rotate(-0.25);
    fx.beginPath();
    fx.arc(0, 0, r, 0, TAU);
    fx.clip();
    const g = fx.createRadialGradient(
      -r * 0.4,
      -r * 0.42,
      r * 0.03,
      r * 0.28,
      r * 0.22,
      r * 1.5,
    );
    g.addColorStop(0, `hsl(${color - 25},70%,91%)`);
    g.addColorStop(0.32, `hsl(${color},65%,63%)`);
    g.addColorStop(0.72, `hsl(${color + 22},62%,24%)`);
    g.addColorStop(1, "#030816");
    fx.fillStyle = g;
    fx.fillRect(-r, -r, r * 2, r * 2);
    for (let i = -6; i <= 6; i++) {
      fx.strokeStyle = `hsla(${color + i * 4 + Math.sin(age * 0.5 + i) * 7},60%,${i % 2 ? 82 : 25}%,.19)`;
      fx.lineWidth = r * (i % 3 === 0 ? 0.055 : 0.024);
      fx.beginPath();
      fx.ellipse(
        Math.sin(age * 0.35 + i) * r * 0.035,
        i * r * 0.14 + Math.sin(age * 0.55 + i) * r * 0.018,
        r * 1.05,
        r * 0.15,
        0,
        0,
        TAU,
      );
      fx.stroke();
    }
    fx.restore();
    fx.globalAlpha = 1;
  }
  function encounterOrbit(t, a, r) {
    const turn = -0.26 + Math.sin(t * 0.3) * 0.06,
      x = Math.cos(a) * r,
      y = Math.sin(a) * r * 0.29;
    return {
      x: x * Math.cos(turn) - y * Math.sin(turn),
      y: x * Math.sin(turn) + y * Math.cos(turn),
      z: -Math.sin(a) * r * 0.83,
    };
  }
  function drawOrbitEncounter(s, visible, fade) {
    const t = s.age,
      formed = encounterEase(t / 2.5),
      ramp = 0.18 + 0.82 * formed,
      center = encounterPoint(0, 0, 0),
      f = encounterFrame(),
      radius = f.unit * 0.25 * (0.15 + 0.85 * formed),
      color = s.hue - 15,
      ringAlpha = fade * encounterEase((t - 0.7) / 1.7);
    const ringLines = (front) => {
      for (let band = 0; band < 3; band++) {
        const path = [];
        for (let j = 0; j <= 140; j++) {
          const a = (j / 140) * TAU,
            p = encounterOrbit(t, a, (0.66 + band * 0.17) * ramp);
          path.push(p.z < 0 === front ? encounterPoint(p.x, p.y, p.z) : null);
        }
        encounterTrace(path, encounterColor(s, band), ringAlpha * 0.1, 8);
        encounterTrace(
          path,
          encounterColor(s, band),
          ringAlpha * (band === 1 ? 0.8 : 0.48),
          band === 1 ? 2 : 1,
        );
      }
    };
    ringLines(false);
    encounterHead(center, color, radius * 1.4, fade * 0.6);
    encounterPlanet(center, radius, color, fade, t);
    ringLines(true);
    const count = w < 700 ? 48 : 78;
    for (let band = 0; band < 3; band++)
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU + t * (0.24 + band * 0.08),
          p = encounterOrbit(t, a, (0.66 + band * 0.17) * ramp),
          q = encounterPoint(p.x, p.y, p.z);
        if (
          !q ||
          (p.z > 0 && Math.hypot(q.x - center.x, q.y - center.y) < radius)
        )
          continue;
        const kind =
            i % 9 === 0
              ? s.effect === "mix"
                ? materialTypes[(i + band) % 5]
                : s.effect
              : "gold",
          glint = 0.5 + 0.5 * Math.sin(a * 3 - t * 2 + band) ** 6;
        encounterMote(
          s,
          visible,
          p.x,
          p.y,
          p.z,
          kind === "gold" ? 0.8 : 9,
          encounterColor(s, band) + (s.rainbow ? i * 4 : 0),
          ringAlpha * glint,
          kind,
        );
      }
    for (let moon = 0; moon < 3; moon++) {
      const a = t * (0.34 + moon * 0.06) + (moon * TAU) / 3,
        p = encounterOrbit(t, a, (1.18 + moon * 0.07) * ramp),
        path = [];
      for (let j = 0; j < 26; j++) {
        const past = encounterOrbit(
          t,
          a - j * 0.018,
          (1.18 + moon * 0.07) * ramp,
        );
        path.unshift(encounterPoint(past.x, past.y, past.z));
      }
      encounterTrace(path, encounterColor(s, moon + 1), ringAlpha * 0.5, 1);
      encounterHead(
        encounterPoint(p.x, p.y, p.z),
        encounterColor(s, moon + 1),
        moon ? 10 : 15,
        ringAlpha,
      );
    }
    const accents = w < 700 ? 28 : 52;
    for (let i = 0; i < accents; i++) {
      const d = s.field[i],
        a = d.angle + t * 0.08,
        p = encounterOrbit(t, a, (1.24 + Math.sin(d.phase) * 0.12) * ramp);
      encounterMote(
        s,
        visible,
        p.x,
        p.y,
        p.z + d.z * 0.15,
        0.35,
        encounterColor(s, i),
        ringAlpha * 0.4,
      );
    }
    if (t >= 7.1 && s.beats < 1) {
      s.beats = 1;
      encounterBurst(s, -0.85, -0.32, s.hue + 65, 0.6);
    }
    if (t >= 8.4 && s.beats < 2) {
      s.beats = 2;
      encounterBurst(s, 0.85, 0.28, s.hue, 0.6);
    }
  }
  const encounterConstellation = [
    [-1.12, -0.48],
    [-0.72, -0.43],
    [-0.37, -0.25],
    [0, 0.04],
    [0.37, -0.25],
    [0.72, -0.43],
    [1.12, -0.48],
    [0.12, -0.16],
    [0, 0.36],
    [-0.14, 0.49],
    [0.14, 0.49],
  ];
  function encounterComet(s, m, age, visible, fade, hero = false) {
    const u = (age - m.at) / m.duration;
    if (u < 0 || u > 1) return;
    const flight = (v) => ({
        x: m.sx + (m.ex - m.sx) * v,
        y: m.sy + (m.ey - m.sy) * v,
        z: m.z - (hero ? 1.2 : 0.25) * v,
      }),
      p = flight(u),
      opacity = fade * encounterEase(u * 8) * encounterEase((1 - u) * 7),
      color = s.hue + m.hue;
    for (let strand = 0; strand < (hero ? 3 : 1); strand++) {
      const path = [];
      for (let j = 0; j < 24; j++) {
        const v = Math.max(0, u - j * (hero ? 0.009 : 0.007)),
          q = flight(v),
          twist = hero
            ? (Math.sin(j * 0.3 - age * 2 + (strand * TAU) / 3) * 0.018 * j) /
              24
            : 0;
        path.unshift(encounterPoint(q.x, q.y + twist, q.z + twist));
      }
      encounterTrace(
        path,
        color + strand * 45,
        opacity * (hero ? 0.14 : 0.12),
        hero ? 9 - strand * 2 : 3,
      );
      encounterTrace(
        path,
        color + strand * 45,
        opacity * (hero ? 0.85 : 0.7),
        hero ? 2.2 - strand * 0.5 : 1,
      );
    }
    encounterHead(
      encounterPoint(p.x, p.y, p.z),
      color,
      hero ? 37 : 12 + (1 - m.z) * 5,
      opacity,
    );
    for (let i = 0; i < (hero ? 14 : 4); i++) {
      const v = Math.max(0, u - i * 0.012),
        q = flight(v);
      encounterMote(
        s,
        visible,
        q.x,
        q.y + Math.sin(i * 2.4) * 0.025,
        q.z,
        0.45,
        color + i * 3,
        opacity * (1 - i / (hero ? 14 : 4)),
      );
    }
  }
  function encounterFeather(mesh, root, end, width, side = 0, tint = 0) {
    const segments = compactControls ? 8 : 12,
      columns = 5,
      start = mesh.vertices.length,
      faceStart = mesh.faces.length,
      dx = end.x - root.x,
      dz = end.z - root.z,
      length = Math.hypot(dx, dz) || 1,
      rib = [],
      barbs = [];
    for (let j = 0; j <= segments; j++) {
      const u = j / segments,
        spread = Math.sin(Math.PI * u ** 0.68) ** 0.88 * width * (1 - u * 0.3),
        center = {
          x: root.x + dx * u,
          y: root.y + (end.y - root.y) * u - 0.025 * Math.sin(u * Math.PI),
          z: root.z + dz * u,
        };
      for (let k = 0; k < columns; k++) {
        const v = k / 2 - 1,
          vane = v * (v < 0 ? 0.86 : 1.06);
        mesh.vertices.push({
          x: center.x - (dz / length) * spread * vane,
          y: center.y + v * v * 0.021 * Math.sin(u * Math.PI),
          z: center.z + (dx / length) * spread * vane,
          wing: side,
          uv: [k / 4, u],
          kind: 1 + (tint + 10) * 0.001,
        });
      }
      rib.push(start + j * columns + 2);
      if (j > 0 && j < segments)
        barbs.push([
          start + j * columns,
          start + (j - 1) * columns + 2,
          start + j * columns + 4,
        ]);
    }
    for (let j = 0; j < segments; j++)
      for (let k = 0; k < columns - 1; k++) {
        const a = start + j * columns + k,
          b = a + 1,
          c = a + columns,
          d = c + 1;
        encounterFace(mesh, a, b, c, "feather", tint);
        encounterFace(mesh, b, d, c, "feather", tint);
      }
    const quill = mesh.vertices.length;
    mesh.vertices.push({
      x: root.x - dx * 0.1,
      y: root.y + (root.y - end.y) * 0.1,
      z: root.z - dz * 0.1,
      wing: side,
      kind: 1,
      uv: [0.5, 0],
    });
    rib.unshift(quill);
    const count = mesh.vertices.length - start,
      outline = [];
    for (let j = 0; j <= segments; j++) outline.push(start + j * columns);
    for (let j = segments; j >= 0; j--)
      outline.push(start + j * columns + columns - 1);
    for (let i = faceStart; i < mesh.faces.length; i++)
      mesh.faces[i].blade = mesh.feathers.length;
    const part = {
      start,
      count,
      faceStart,
      faceCount: mesh.faces.length - faceStart,
      rib,
      barbs,
      outline,
    };
    mesh.feathers.push(part);
    return part;
  }
  function encounterBirdMesh() {
    const mesh = { vertices: [], faces: [], feathers: [] },
      compact = compactControls,
      around = compact ? 20 : 28,
      rows = compact ? 12 : 18;
    encounterEllipsoid(
      mesh,
      { x: 0, y: 0.012, z: 0.045 },
      { x: 0.128, y: 0.104, z: 0.3 },
      around,
      rows,
    );
    encounterBirdNeck(mesh);
    encounterEllipsoid(
      mesh,
      { x: 0, y: -0.081, z: -0.64 },
      { x: 0.059, y: 0.052, z: 0.083 },
      compact ? 16 : 22,
      compact ? 10 : 14,
    );
    encounterBirdTube(
      mesh,
      { x: 0, y: -0.077, z: -0.705 },
      { x: 0, y: -0.073, z: -0.93 },
      0.019,
      2,
      0.001,
    );
    for (const side of [-1, 1]) {
      const start = mesh.vertices.length;
      encounterEllipsoid(
        mesh,
        { x: side * 0.052, y: -0.092, z: -0.667 },
        { x: 0.008, y: 0.008, z: 0.009 },
        12,
        8,
      );
      for (let i = start; i < mesh.vertices.length; i++)
        mesh.vertices[i].kind = 3;
      encounterBirdTube(
        mesh,
        { x: side * 0.038, y: 0.075, z: 0.19 },
        { x: side * 0.041, y: 0.13, z: 0.67 },
        0.006,
        4,
      );
      encounterBirdTube(
        mesh,
        { x: side * 0.041, y: 0.13, z: 0.67 },
        { x: side * 0.063, y: 0.126, z: 0.79 },
        0.004,
        4,
      );
    }
    const secondary = compact ? 8 : 12,
      primary = compact ? 9 : 12;
    for (const side of [-1, 1]) {
      for (let i = 0; i < secondary; i++) {
        const u = i / (secondary - 1),
          x = 0.12 + u * 0.59;
        encounterFeather(
          mesh,
          { x: side * x, y: -0.035, z: -0.085 },
          {
            x: side * (x + 0.065),
            y: 0.025,
            z: 0.34 + 0.12 * Math.sin(u * Math.PI),
          },
          compact ? 0.102 : 0.08,
          side,
          Math.sin(i * 0.9) * 4,
        );
      }
      for (let i = 0; i < primary; i++) {
        const u = i / (primary - 1);
        encounterFeather(
          mesh,
          { x: side * (0.66 + u * 0.2), y: -0.035, z: -0.15 + u * 0.1 },
          { x: side * (1.24 - u * 0.14), y: 0.01, z: -0.15 + u * 0.68 },
          compact ? 0.088 : 0.073,
          side,
          i * 0.7 - 4,
        );
      }
      for (let layer = 0; layer < 2; layer++)
        for (let i = 0; i < (compact ? 6 : 10); i++) {
          const u = i / (compact ? 5 : 9),
            x = 0.13 + u * 0.61;
          encounterFeather(
            mesh,
            { x: side * x, y: -0.052 - layer * 0.008, z: -0.1 - layer * 0.035 },
            {
              x: side * (x + 0.025),
              y: -0.025 - layer * 0.01,
              z: 0.17 - layer * 0.09,
            },
            compact ? 0.086 : 0.063,
            side,
            7 + layer * 2,
          );
        }
    }
    for (const side of [-1, 1])
      for (let i = 0; i < 7; i++) {
        const x = 0.025 + Math.sin((i / 6) * Math.PI) * 0.067;
        encounterFeather(
          mesh,
          { x: side * x, y: -0.093, z: -0.14 + i * 0.032 },
          { x: side * (x + 0.015), y: -0.061, z: 0.18 + i * 0.024 },
          0.038,
          0,
          8,
        );
      }
    for (let i = -2; i <= 2; i++)
      encounterFeather(
        mesh,
        { x: i * 0.027, y: 0.015, z: 0.22 },
        { x: i * 0.065, y: 0.07, z: 0.7 - Math.abs(i) * 0.055 },
        0.032,
        0,
        i * 3,
      );
    mesh.plumeSources = mesh.feathers
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => {
        const a = mesh.vertices[p.rib[0]],
          b = mesh.vertices[p.rib.at(-1)];
        return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) > 0.36 && a.wing;
      })
      .map(({ i }) => i);
    return mesh;
  }
  function encounterBirdTube(mesh, a, b, radius, kind = 0, endRadius = radius) {
    const start = mesh.vertices.length,
      dx = b.x - a.x,
      dy = b.y - a.y,
      dz = b.z - a.z,
      len = Math.hypot(dx, dy, dz),
      ux = dz / Math.hypot(dx, dz),
      uz = -dx / Math.hypot(dx, dz),
      vx = (dy * uz) / len,
      vy = (dz * ux - dx * uz) / len,
      vz = (-dy * ux) / len,
      n = 12;
    for (let j = 0; j < 2; j++)
      for (let i = 0; i <= n; i++) {
        const angle = (i / n) * TAU,
          r = j ? endRadius : radius,
          c = Math.cos(angle) * r,
          s = Math.sin(angle) * r;
        mesh.vertices.push({
          x: a.x + dx * j + ux * c + vx * s,
          y: a.y + dy * j + vy * s,
          z: a.z + dz * j + uz * c + vz * s,
          kind,
        });
      }
    for (let i = 0; i < n; i++) {
      const a = start + i,
        b = a + 1,
        c = a + n + 1,
        d = c + 1;
      encounterFace(mesh, a, b, c);
      encounterFace(mesh, b, d, c);
    }
  }
  function encounterCameraPlane(x, y, z) {
    const f = encounterFrame(),
      scale = 1 + z / (f.focal / f.unit),
      xx = x * scale,
      yy = y * scale,
      wy = yy * f.cp + z * f.sp,
      zz = z * f.cp - yy * f.sp;
    return { x: xx * f.cy - zz * f.sy, y: wy, z: zz * f.cy + xx * f.sy };
  }
  function encounterBirdPose(t) {
    const u = clamp((t - 6.65) / 7.55, 0, 1),
      f = encounterFrame(),
      cameraZ = (f.focal / f.unit) * (0.42 - 0.92 * u),
      screenX = -w / (2 * f.unit) - 1.6 + (w / f.unit + 4.7) * u,
      screenY =
        -0.04 -
        0.18 * Math.sin(u * Math.PI) -
        u * 0.08 +
        Math.sin(t * TAU * 1.16) * 0.009,
      p = encounterCameraPlane(screenX, screenY, cameraZ);
    return {
      ...p,
      scale: 0.76,
      yaw: -0.89 + 0.2 * Math.sin(u * Math.PI) - u * 0.08,
      pitch: -0.22 + 0.018 * Math.sin((t - 6.65) * TAU * 0.58),
      roll: -0.08 + 0.2 * Math.sin(u * Math.PI) - u * 0.05,
      flight: u,
      cameraZ,
    };
  }
  function encounterWingState(t) {
    const phase = (t - 6.65) * TAU * 0.58;
    return {
      base: 0.46 * Math.sin(phase),
      lag: 0.18 * Math.sin(phase - 0.5),
      sweep: 0.045 * Math.sin(phase - 0.2),
      unfold: 1,
    };
  }
  function encounterBirdFlex(v, t, flex = encounterWingState(t)) {
    if (!v.wing) return v;
    const reach = clamp((Math.abs(v.x) - 0.08) / 1.16, 0, 1),
      blend = encounterEase((reach - 0.18) / 0.68),
      angle = flex.base + flex.lag * blend,
      x = Math.abs(v.x) - 0.08,
      y = v.y + 0.035,
      c = Math.cos(angle),
      sn = Math.sin(angle);
    return {
      x: v.wing * (0.08 + x * c + y * sn),
      y: -0.035 - x * sn + y * c,
      z: v.z + flex.sweep * reach * reach,
    };
  }
  let encounterBirdGpu = null,
    encounterBirdGpuUnavailable = false;
  function encounterGpuGeometry(mesh) {
    if (mesh.gpuData) return mesh.gpuData;
    const normals = Array.from({ length: mesh.vertices.length }, () => [
      0, 0, 0,
    ]);
    for (const f of mesh.faces) {
      const a = mesh.vertices[f.a],
        b = mesh.vertices[f.b],
        c = mesh.vertices[f.c],
        ux = b.x - a.x,
        uy = b.y - a.y,
        uz = b.z - a.z,
        vx = c.x - a.x,
        vy = c.y - a.y,
        vz = c.z - a.z,
        n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      for (const i of [f.a, f.b, f.c])
        for (let k = 0; k < 3; k++) normals[i][k] += n[k];
    }
    const data = new Float32Array(mesh.faces.length * 30);
    let at = 0;
    for (const f of mesh.faces)
      for (const i of [f.a, f.b, f.c]) {
        const v = mesh.vertices[i],
          raw = v.normal || normals[i],
          n = Math.hypot(...raw) > 1e-12 ? raw : [0, -1, 0],
          length = Math.hypot(...n),
          uv = v.uv || [0.5, 0.5];
        data.set(
          [
            v.x,
            v.y,
            v.z,
            n[0] / length,
            n[1] / length,
            n[2] / length,
            uv[0],
            uv[1],
            v.wing || 0,
            v.kind ?? (f.blade !== undefined ? 1 : 0),
          ],
          at,
        );
        at += 10;
      }
    return (mesh.gpuData = data);
  }
  function prepareEncounterBirdGpu(mesh) {
    if (encounterBirdGpuUnavailable) return null;
    try {
      if (!encounterBirdGpu) {
        const surface = document.createElement("canvas"),
          gl = surface.getContext("webgl2", {
            alpha: true,
            antialias: true,
            premultipliedAlpha: true,
            depth: true,
          });
        if (!gl) {
          encounterBirdGpuUnavailable = true;
          return null;
        }
        const vert = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
layout(location=3) in float aWing;
layout(location=4) in float aKind;
uniform mat3 uModel;
uniform vec3 uOrigin;
uniform float uScale;
uniform vec3 uWing;
uniform float uFlex;
uniform vec4 uView;
uniform vec4 uCamera;
uniform vec2 uCenter;
out vec3 vNormal;
out vec3 vCamera;
out vec2 vUV;
flat out float vKind;
void main(){
 vec3 p=aPosition,n=aNormal;
 if(abs(aWing)>.5&&uFlex>.5){float reach=clamp((abs(p.x)-.08)/1.16,0.,1.),blend=smoothstep(.18,.86,reach),a=uWing.x+uWing.y*blend,c=cos(a),s=sin(a),x=abs(p.x)-.08,y=p.y+.035,nx=n.x*aWing;
 p=vec3(aWing*(.08+x*c+y*s),-.035-x*s+y*c,p.z+uWing.z*reach*reach);n=vec3(aWing*(nx*c+n.y*s),-nx*s+n.y*c,n.z);}
 p=uModel*p*uScale+uOrigin;n=uModel*n;
 vec3 cam=vec3(p.x*uCamera.x+p.z*uCamera.y,p.y,p.z*uCamera.x-p.x*uCamera.y);
 cam=vec3(cam.x,cam.y*uCamera.z-cam.z*uCamera.w,cam.y*uCamera.w+cam.z*uCamera.z);
 vec3 cn=vec3(n.x*uCamera.x+n.z*uCamera.y,n.y,n.z*uCamera.x-n.x*uCamera.y);
 cn=vec3(cn.x,cn.y*uCamera.z-cn.z*uCamera.w,cn.y*uCamera.w+cn.z*uCamera.z);
 float distance=uView.w+cam.z,nearPlane=uView.w*.16,farPlane=uView.w*7.;
 vec2 center=vec2(uCenter.x*2./uView.x-1.,1.-uCenter.y*2./uView.y);
 gl_Position=vec4(center*distance+vec2(cam.x,-cam.y)*uView.w*uView.z*2./uView.xy,((farPlane+nearPlane)*distance-2.*farPlane*nearPlane)/(farPlane-nearPlane),distance);
 vNormal=cn;vCamera=cam;vUV=aUV;vKind=aKind;
}`;
        const frag = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vCamera;
in vec2 vUV;
flat in float vKind;
uniform float uOpacity;
uniform float uHue;
uniform float uFocal;
out vec4 outputColor;
void main(){
 vec3 N=normalize(vNormal),V=normalize(vec3(0.,0.,-uFocal)-vCamera);if(dot(N,V)<0.)N=-N;
 vec3 L=normalize(vec3(-.38,-.67,-.88)),H=normalize(L+V);
 float key=max(dot(N,L),0.),fill=max(dot(N,normalize(vec3(.55,.28,-.25))),0.),rim=pow(1.-max(dot(N,V),0.),3.);
 vec3 tint=.5+.5*cos(uHue*.0174533+vec3(0.,-2.094,2.094));
 vec3 base=mix(vec3(.76,.85,.88),vec3(.94,.96,.94),.55);
 float spec=pow(max(dot(N,H),0.),28.)*.055;
 if(vKind>.5&&vKind<1.5){float x=vUV.x*2.-1.,fw=max(fwidth(x),.005),shaft=(1.-smoothstep(.018,.035+fw,abs(x)))*min(1.,.055/fw),weave=vUV.y*112.-abs(x)*12.,barbs=sin(weave)*.022*sin(vUV.y*3.14159)*(1.-smoothstep(.9,2.8,fwidth(weave))),hem=pow(abs(x),4.);
 base=mix(vec3(.45,.59,.68),vec3(.88,.94,.96),smoothstep(0.,.84,vUV.y));base*=.90+.065*sin(vKind*370.);base+=shaft*-.12+barbs-hem*.055;spec*=.65;}
 if(vKind<.5)base+=sin(vUV.y*85.+sin(vUV.x*34.)*2.)*.009;
 if(vKind>1.5&&vKind<2.5)base=vec3(.58,.47,.27);
 if(vKind>2.5&&vKind<3.5){base=vec3(.009,.017,.023);spec=pow(max(dot(N,H),0.),75.)*.65;}
 if(vKind>3.5)base=vec3(.22,.29,.32);
 vec3 color=base*(.25+key*.67+fill*.13)+vec3(.28,.45,.58)*rim*.19+spec;
 if(vKind<1.5)color+=tint*.035;
 color=pow(max(color,vec3(0.)),vec3(1./2.2));
 outputColor=vec4(color,uOpacity);
}`;
        const compile = (kind, source) => {
            const shader = gl.createShader(kind);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
              throw Error(gl.getShaderInfoLog(shader));
            return shader;
          },
          program = gl.createProgram();
        gl.attachShader(program, compile(gl.VERTEX_SHADER, vert));
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, frag));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
          throw Error(gl.getProgramInfoLog(program));
        const uniforms = {};
        for (const name of [
          "Model",
          "Origin",
          "Scale",
          "Wing",
          "Flex",
          "View",
          "Camera",
          "Center",
          "Opacity",
          "Hue",
          "Focal",
        ])
          uniforms[name] = gl.getUniformLocation(program, "u" + name);
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        encounterBirdGpu = {
          surface,
          gl,
          program,
          uniforms,
          vao,
          buffer: gl.createBuffer(),
          mesh: null,
          plumes: new Map(),
          show: null,
        };
        surface.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          encounterBirdGpuUnavailable = true;
          encounterBirdGpu = null;
          depthDirty = true;
          nearCanvas.dataset.craneRenderer = "canvas-mesh";
        });
        surface.addEventListener("webglcontextrestored", () => {
          encounterBirdGpuUnavailable = false;
          depthDirty = true;
        });
      }
      const r = encounterBirdGpu;
      if (r.gl.isContextLost()) return null;
      if (r.mesh !== mesh) {
        r.mesh = mesh;
        r.gl.bindBuffer(r.gl.ARRAY_BUFFER, r.buffer);
        r.gl.bufferData(
          r.gl.ARRAY_BUFFER,
          encounterGpuGeometry(mesh),
          r.gl.STATIC_DRAW,
        );
      }
      return r;
    } catch (error) {
      encounterBirdGpuUnavailable = true;
      nearCanvas.dataset.craneError = String(error.message || error).slice(
        0,
        400,
      );
      return null;
    }
  }
  function renderEncounterBirdGpu(
    r,
    show,
    mesh,
    pose,
    time,
    opacity,
    color,
    plumes,
  ) {
    try {
      const { gl, surface, uniforms: u } = r,
        f = encounterFrame();
      if (surface.width !== light.width || surface.height !== light.height) {
        surface.width = light.width;
        surface.height = light.height;
      }
      if (r.show !== show) {
        for (const b of r.plumes.values()) gl.deleteBuffer(b);
        r.plumes.clear();
        r.show = show;
      }
      gl.viewport(0, 0, surface.width, surface.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);
      gl.depthMask(true);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(
        gl.SRC_ALPHA,
        gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA,
      );
      gl.useProgram(r.program);
      gl.bindVertexArray(r.vao);
      gl.uniform4f(u.View, w, h, f.unit, f.focal / f.unit);
      gl.uniform4f(u.Camera, f.cy, f.sy, f.cp, f.sp);
      gl.uniform2f(u.Center, f.x, f.y);
      gl.uniform1f(u.Focal, f.focal / f.unit);
      const flex = encounterWingState(time);
      gl.uniform3f(u.Wing, flex.base, flex.lag, flex.sweep);
      const draw = (buffer, m, p, a, hue, animated) => {
        const basis = [
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: 0, y: 0, z: 1 },
          ].map((v) =>
            encounterWorld(v, {
              yaw: p.yaw,
              pitch: p.pitch,
              roll: p.roll,
              x: 0,
              y: 0,
              z: 0,
              scale: 1,
            }),
          ),
          matrix = new Float32Array(basis.flatMap((v) => [v.x, v.y, v.z]));
        gl.uniformMatrix3fv(u.Model, false, matrix);
        gl.uniform3f(u.Origin, p.x, p.y, p.z);
        gl.uniform1f(u.Scale, p.scale ?? 1);
        gl.uniform1f(u.Opacity, a);
        gl.uniform1f(u.Hue, hue);
        gl.uniform1f(u.Flex, animated ? 1 : 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        for (const [location, size, offset] of [
          [0, 3, 0],
          [1, 3, 12],
          [2, 2, 24],
          [3, 1, 32],
          [4, 1, 36],
        ]) {
          gl.enableVertexAttribArray(location);
          gl.vertexAttribPointer(location, size, gl.FLOAT, false, 40, offset);
        }
        gl.drawArrays(gl.TRIANGLES, 0, m.faces.length * 3);
      };
      draw(r.buffer, mesh, pose, opacity, color, true);
      gl.depthMask(false);
      plumes.sort(
        (a, b) =>
          (encounterPoint(b.pose.x, b.pose.y, b.pose.z)?.z || 0) -
          (encounterPoint(a.pose.x, a.pose.y, a.pose.z)?.z || 0),
      );
      for (const p of plumes) {
        if (p.alpha < 0.003) continue;
        let b = r.plumes.get(p.mesh);
        if (!b) {
          b = gl.createBuffer();
          r.plumes.set(p.mesh, b);
          gl.bindBuffer(gl.ARRAY_BUFFER, b);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            encounterGpuGeometry(p.mesh),
            gl.STATIC_DRAW,
          );
        }
        draw(b, p.mesh, p.pose, p.alpha, p.color, false);
      }
      gl.depthMask(true);
      fx.save();
      fx.globalCompositeOperation = "source-over";
      fx.globalAlpha = 1;
      fx.drawImage(surface, 0, 0, w, h);
      fx.restore();
      nearCanvas.dataset.craneRenderer = "webgl2-sculpture";
      return true;
    } catch (error) {
      encounterBirdGpuUnavailable = true;
      nearCanvas.dataset.craneError = String(error.message || error).slice(
        0,
        400,
      );
      return false;
    }
  }
  function encounterFeatherDetails(part, projected, color, alpha) {
    const spine = part.rib.map((i) => projected[i]);
    encounterTrace(spine, color, alpha * 0.55, 0.55);
    let previous = null;
    for (const indices of part.barbs) {
      const row = indices.map((i) => projected[i]);
      if (row.some((p) => !p)) {
        previous = null;
        continue;
      }
      if (part.loose && previous)
        for (const u of [0.33, 0.67]) {
          const points = row.map((p, i) => ({
            x: previous[i].x + (p.x - previous[i].x) * u,
            y: previous[i].y + (p.y - previous[i].y) * u,
          }));
          encounterTrace(points, color + 8, alpha * 0.18, 0.3);
        }
      encounterTrace(row, color + 8, alpha * 0.23, 0.35);
      previous = row;
    }
  }
  function encounterFallenFeathers(s, visible, fade, mesh, gpuPlumes = null) {
    const key = w + ":" + h + ":" + state.view;
    if (s.featherKey !== key) {
      s.featherKey = key;
      s.fallen = [];
    }
    for (let i = 0; i < 22; i++) {
      if (compactControls && i % 2) continue;
      const born = 8.9 + i * 0.215,
        age = s.age - born,
        life = 4;
      if (age < 0 || age > life) continue;
      let f = s.fallen[i];
      if (!f) {
        const sourceIndex =
            mesh.plumeSources[(i * 7 + 3) % mesh.plumeSources.length],
          source = mesh.feathers[sourceIndex],
          pose = encounterBirdPose(born),
          vertices = mesh.vertices
            .slice(source.start, source.start + source.count)
            .map((v) => encounterWorld(encounterBirdFlex(v, born), pose)),
          anchor = vertices[1],
          local = vertices.map((v, j) => ({
            x: v.x - anchor.x,
            y: v.y - anchor.y,
            z: v.z - anchor.z,
            uv: mesh.vertices[source.start + j].uv,
            kind: mesh.vertices[source.start + j].kind,
          })),
          faces = mesh.faces
            .slice(source.faceStart, source.faceStart + source.faceCount)
            .map((v) => ({
              ...v,
              a: v.a - source.start,
              b: v.b - source.start,
              c: v.c - source.start,
            }));
        const part = {
          start: 0,
          count: local.length,
          faceStart: 0,
          faceCount: faces.length,
          rib: source.rib.map((v) => v - source.start),
          barbs: source.barbs.map((row) => row.map((v) => v - source.start)),
          outline: source.outline.map((v) => v - source.start),
          loose: true,
        };
        f = s.fallen[i] = {
          anchor,
          sourceIndex,
          mesh: { vertices: local, faces, feathers: [part] },
          ...part,
          seed: i * 2.39996,
        };
      }
      const ease = encounterEase(age / 0.8),
        sway = Math.sin(age * 1.15 + f.seed) - Math.sin(f.seed),
        pose = {
          x: f.anchor.x + age * 0.035 + sway * 0.1 * ease,
          y: f.anchor.y + age * 0.055 + age * age * 0.018,
          z: f.anchor.z + age * (i % 3 === 0 ? -0.085 : 0.055),
          scale: 1,
          yaw: Math.sin(age * 0.95 + f.seed) * 0.55 * ease,
          pitch: Math.sin(age * 1.1 + f.seed * 0.7) * 0.7 * ease,
          roll: Math.sin(age * 1.3 + f.seed) * 0.65 * ease,
        },
        alpha =
          fade *
          encounterEase(age / 0.18) *
          encounterEase((life - age) / 1.0) *
          0.72,
        color = (s.rainbow ? 196 : s.hue) + (i % 4) * 17;
      if (gpuPlumes) {
        gpuPlumes.push({ mesh: f.mesh, pose, alpha, color });
        encounterMote(
          s,
          visible,
          pose.x,
          pose.y,
          pose.z,
          0.25,
          color,
          alpha * 0.4,
        );
      } else {
        const drawn = encounterSurface(f.mesh, pose, alpha, color);
        if (drawn) {
          encounterFeatherDetails(f, drawn.projected, color + 12, alpha);
          const p = drawn.world[Math.floor(drawn.world.length / 2)];
          encounterMote(s, visible, p.x, p.y, p.z, 0.25, color, alpha * 0.4);
        }
      }
    }
  }
  function drawEncounterBird(s, visible, fade) {
    const t = s.age;
    if (t < 6.65) return;
    const pose = encounterBirdPose(t),
      mesh = s.birdMesh || (s.birdMesh = encounterBirdMesh()),
      color = s.rainbow ? 196 : s.hue,
      alpha = fade * (1 - encounterEase((t - 14.2) / 0.65));
    const gpu = prepareEncounterBirdGpu(mesh),
      plumes = [];
    encounterFallenFeathers(s, visible, fade, mesh, gpu ? plumes : null);
    if (
      gpu &&
      renderEncounterBirdGpu(gpu, s, mesh, pose, t, alpha, color, plumes)
    ) {
      for (let i = 0; i < mesh.feathers.length; i += 5) {
        const part = mesh.feathers[i],
          p = encounterWorld(
            encounterBirdFlex(mesh.vertices[part.rib.at(-2)], t),
            pose,
          );
        encounterMote(
          s,
          visible,
          p.x,
          p.y,
          p.z,
          0.22,
          color + (i % 4) * 10,
          alpha * (0.15 + 0.35 * Math.sin(t * 1.5 + i) ** 8),
        );
      }
      return;
    }
    const flex = encounterWingState(t),
      drawn = encounterSurface(mesh, pose, alpha, color, (v) =>
        encounterBirdFlex(v, t, flex),
      );
    if (!drawn) return;
    for (const part of mesh.feathers)
      encounterFeatherDetails(part, drawn.projected, color + 20, alpha * 0.7);
    for (let i = 0; i < mesh.feathers.length; i += 2) {
      const part = mesh.feathers[i],
        p = drawn.world[part.rib.at(-2)],
        twinkle = 0.3 + 0.7 * Math.sin(i * 1.7 + t * 2) ** 6;
      encounterMote(
        s,
        visible,
        p.x,
        p.y,
        p.z,
        0.35,
        color + (s.rainbow ? i * 5 : 8),
        alpha * twinkle * 0.7,
      );
    }
    const head = encounterWorld({ x: 0, y: -0.085, z: -0.65 }, pose),
      eye = encounterWorld({ x: 0.047, y: -0.091, z: -0.665 }, pose),
      q = encounterPoint(eye.x, eye.y, eye.z);
    encounterHead(
      encounterPoint(head.x, head.y, head.z),
      color,
      5,
      alpha * 0.5,
    );
    if (q) {
      fx.save();
      fx.globalCompositeOperation = "source-over";
      fx.globalAlpha = alpha;
      fx.fillStyle = "#142538";
      fx.beginPath();
      fx.arc(q.x, q.y, Math.max(0.5, q.scale * 0.9), 0, TAU);
      fx.fill();
      fx.restore();
    }
    // Two fine trailing legs and the rounded neck keep the silhouette avian in a bank.
    for (const side of [-1, 1]) {
      const points = [];
      for (const v of [
        { x: side * 0.036, y: 0.06, z: 0.2 },
        { x: side * 0.039, y: 0.12, z: 0.59 },
        { x: side * 0.06, y: 0.125, z: 0.69 },
      ]) {
        const p = encounterWorld(v, pose);
        points.push(encounterPoint(p.x, p.y, p.z));
      }
      encounterTrace(points, color + 5, alpha * 0.5, 0.65);
    }
  }
  function drawMeteorEncounter(s, visible, fade) {
    const t = s.age,
      bird = t >= 6.65 && t < 14.85 ? encounterBirdPose(t) : null;
    for (let i = 0; i < 22; i++) {
      const m = encounterSpatialMeteorPose(i, t);
      if (!bird || m.cameraZ >= bird.cameraZ)
        drawSpatialMeteor(s, i, t, visible, fade);
    }
    const stream =
        fade *
        encounterEase((t - 0.5) / 1.8) *
        (1 - encounterEase((t - 14.4) / 1.6)),
      count = compactControls ? 42 : 70,
      f = encounterFrame();
    for (let i = 0; i < count; i++) {
      const d = s.field[i],
        u = (d.phase / TAU + t * 0.025) % 1,
        span = w / f.unit + 0.8,
        p = encounterCameraPlane(
          (u - 0.5) * span,
          -1.35 + (i % 9) * 0.17 + (u - 0.5) * span * 0.37,
          ((0.3 + d.z * 0.7) * f.focal) / f.unit,
        );
      encounterMote(
        s,
        visible,
        p.x,
        p.y,
        p.z,
        0.3 + (i % 3) * 0.08,
        encounterColor(s, i),
        stream * Math.sin(u * Math.PI) * (0.18 + 0.3 * Math.sin(t + i) ** 8),
      );
    }
    drawEncounterBird(s, visible, fade);
    if (bird)
      for (let i = 0; i < 22; i++) {
        const m = encounterSpatialMeteorPose(i, t);
        if (m.cameraZ < bird.cameraZ) drawSpatialMeteor(s, i, t, visible, fade);
      }
  }
  function encounterSpatialMeteorPose(i, t) {
    const f = encounterFrame(),
      layer = i % 3,
      at = i < 18 ? 0.2 + i * 0.255 : 8.4 + (i - 18) * 0.76,
      duration = [4.5, 3.8, 3.2][layer],
      u = (t - at) / duration,
      span = w / f.unit + 2.8,
      cameraZ = ([0.85, 0.22, -0.2][layer] * f.focal) / f.unit,
      x = -w / (2 * f.unit) - 1.4 + span * u,
      y = -2.05 + ((i * 7) % 11) * 0.15 + span * u * 0.37,
      p = encounterCameraPlane(x, y, cameraZ);
    return {
      ...p,
      u,
      at,
      duration,
      span,
      screenX: x,
      screenY: y,
      cameraZ,
      layer,
    };
  }
  function drawSpatialMeteor(s, i, t, visible, fade) {
    const m = encounterSpatialMeteorPose(i, t);
    if (m.u < 0 || m.u > 1) return;
    const q = encounterPoint(m.x, m.y, m.z);
    if (!q) return;
    const f = encounterFrame(),
      angle = Math.atan(0.37),
      length =
        Math.min(m.span * m.u, 0.85 + (i % 4) * 0.16) *
        f.unit *
        (0.65 + q.scale * 0.35),
      width = (0.62 + (i % 3) * 0.13) * q.scale,
      alpha =
        fade *
        q.alpha *
        encounterEase(m.u * 10) *
        encounterEase((1 - m.u) * 10),
      color = s.rainbow ? [202, 270, 328, 43, 174][i % 5] : s.hue;
    fx.save();
    fx.translate(q.x, q.y);
    fx.rotate(angle);
    fx.globalCompositeOperation = "lighter";
    fx.globalAlpha = alpha;
    for (let layer = 0; layer < 3; layer++) {
      const size = width * [5.0, 1.0, 0.3][layer],
        reach = length * [1.07, 1, 0.83][layer],
        g = fx.createLinearGradient(-reach, 0, 1, 0);
      g.addColorStop(0, `hsla(${color},80%,76%,0)`);
      g.addColorStop(
        0.4,
        `hsla(${color},80%,80%,${[0.025, 0.14, 0.32][layer]})`,
      );
      g.addColorStop(
        0.87,
        `hsla(${color + 10},75%,87%,${[0.09, 0.4, 0.85][layer]})`,
      );
      g.addColorStop(
        1,
        layer === 2
          ? "#fffef3"
          : `hsla(${color},85%,87%,${layer ? 0.55 : 0.18})`,
      );
      fx.fillStyle = g;
      fx.beginPath();
      fx.moveTo(-reach, 0);
      fx.quadraticCurveTo(-reach * 0.24, -size * 1.4, 0, -size * 0.6);
      fx.quadraticCurveTo(size * 0.5, 0, 0, size * 0.6);
      fx.quadraticCurveTo(-reach * 0.24, size * 1.4, -reach, 0);
      fx.fill();
    }
    fx.fillStyle = "#fffef0";
    fx.beginPath();
    fx.ellipse(0, 0, 1.65 * q.scale, 0.65 * q.scale, 0, 0, TAU);
    fx.fill();
    fx.restore();
    encounterHead(q, color, 7.0, alpha * 0.35);
    for (let j = 0; j < 6; j++) {
      const past = t - (j + 1) * 0.065,
        p = encounterSpatialMeteorPose(i, past);
      if (p.u < 0) continue;
      encounterMote(
        s,
        visible,
        p.x,
        p.y,
        p.z,
        0.25 + (j % 2) * 0.06,
        color + j * 3,
        alpha * (1 - j / 6) * 0.4,
      );
    }
  }
  function encounterFlatHeart(a, r = 1) {
    return {
      x: ((16 * Math.sin(a) ** 3) / 17) * r,
      y:
        (-(
          13 * Math.cos(a) -
          5 * Math.cos(2 * a) -
          2 * Math.cos(3 * a) -
          Math.cos(4 * a)
        ) /
          17) *
          r -
        0.08,
    };
  }
  function drawFlatHeartEncounter(s, visible, fade) {
    const t = s.age,
      formed = encounterEase((t - 2.2) / 1.6),
      release = encounterEase((t - 9.4) / 2.2),
      beat = encounterHeartbeat(t),
      r = 0.83 * (1 + beat * 1.6),
      color = s.rainbow ? 338 : s.hue;
    for (const side of [-1, 1]) {
      const path = [],
        u = clamp(t / 2.55, 0, 1);
      for (let j = 0; j < 36; j++) {
        const v = Math.max(0, u - j * 0.009),
          x = side * (1.45 * (1 - encounterEase(v))),
          y = -0.25 + Math.sin(v * Math.PI) * side * 0.28;
        path.unshift(encounterPoint(x, y, 0));
      }
      const alpha = fade * (1 - encounterEase((t - 2.45) / 0.6));
      encounterTrace(path, color + side * 23, alpha * 0.14, 7);
      encounterTrace(path, color + side * 23, alpha, 1.2);
      encounterHead(path.at(-1), color + side * 23, 18, alpha);
    }
    const path = [];
    for (let i = 0; i <= 160; i++) {
      const p = encounterFlatHeart((i / 160) * TAU, r);
      path.push(encounterPoint(p.x, p.y, 0));
    }
    if (formed > 0.001) {
      const f = encounterFrame(),
        alpha = fade * formed * (1 - release);
      fx.save();
      fx.globalCompositeOperation = "lighter";
      fx.globalAlpha = alpha;
      const g = fx.createLinearGradient(0, f.y - f.unit, 0, f.y + f.unit);
      g.addColorStop(0, `hsla(${color - 16},90%,72%,.16)`);
      g.addColorStop(0.55, `hsla(${color + 12},80%,60%,.035)`);
      g.addColorStop(1, `hsla(${color + 40},90%,80%,.14)`);
      fx.fillStyle = g;
      fx.beginPath();
      path.forEach((p, i) => (i ? fx.lineTo(p.x, p.y) : fx.moveTo(p.x, p.y)));
      fx.closePath();
      fx.fill();
      fx.restore();
      for (const k of [0.93, 1, 1.055]) {
        const trace = path
          .slice(0, Math.ceil(1 + 160 * formed))
          .map((p) => ({ x: f.x + (p.x - f.x) * k, y: f.y + (p.y - f.y) * k }));
        encounterTrace(
          trace,
          color + (k - 1) * 350,
          alpha * (k === 1 ? 0.16 : 0.05),
          k === 1 ? 10 : 4,
        );
        encounterTrace(
          trace,
          color + (k - 1) * 350,
          alpha * (k === 1 ? 0.95 : 0.42),
          k === 1 ? 1.7 : 0.65,
        );
      }
    }
    for (let n = 0; n < 4; n++) {
      const age = t - (3.66 + n * 1.8);
      if (age < 0 || age > 1.55) continue;
      const line = [];
      for (let i = 0; i <= 120; i++) {
        const p = encounterFlatHeart((i / 120) * TAU, r * (1 + age * 0.31));
        line.push(encounterPoint(p.x, p.y, 0));
      }
      encounterTrace(line, color + n * 9, fade * (1 - age / 1.55) * 0.45, 1);
    }
    const ecg = [
        [-1.25, 0.4],
        [-0.54, 0.4],
        [-0.4, 0.33],
        [-0.3, 0.51],
        [-0.18, 0.13],
        [-0.05, 0.65],
        [0.08, 0.34],
        [0.22, 0.4],
        [1.25, 0.4],
      ],
      line = ecg.map(([x, y]) => encounterPoint(x, y, 0)),
      a = fade * formed * (1 - release);
    encounterTrace(line, color + 20, a * 0.12, 6);
    encounterTrace(line, color + 20, a * 0.8, 0.9);
    const phase = ((((t - 3.5) / 1.8) % 1) + 1) % 1,
      p = phase * (ecg.length - 1),
      j = Math.min(ecg.length - 2, Math.floor(p)),
      v = p - j;
    encounterHead(
      encounterPoint(
        ecg[j][0] + (ecg[j + 1][0] - ecg[j][0]) * v,
        ecg[j][1] + (ecg[j + 1][1] - ecg[j][1]) * v,
        0,
      ),
      color + 48,
      7,
      a,
    );
    const count = compactControls ? 54 : 88;
    for (let i = 0; i < count; i++) {
      const d = s.field[i],
        p = encounterFlatHeart((i / count) * TAU, r),
        drift = release * release,
        x = p.x + Math.cos(d.angle) * drift * 0.48,
        y = p.y - drift * (0.5 + d.r * 0.38),
        kind =
          i % 9 === 0
            ? s.effect === "mix"
              ? materialTypes[i % 5]
              : s.effect
            : "gold";
      encounterMote(
        s,
        visible,
        x,
        y,
        0,
        kind === "gold" ? 0.65 : 6,
        color + (s.rainbow ? i * 3 : 0),
        fade *
          formed *
          (1 - release) *
          (0.35 + 0.65 * Math.sin(i * 1.7 + t * 2) ** 6),
        kind,
      );
    }
  }
  function drawFlatOrbitEncounter(s, visible, fade) {
    const t = s.age,
      formed = encounterEase(t / 2.5),
      alpha = fade * formed,
      ramp = 0.2 + 0.8 * formed,
      color = s.rainbow ? 42 : s.hue,
      point = (a, r) =>
        encounterPoint(Math.cos(a) * r * ramp, Math.sin(a) * r * ramp, 0);
    for (let ring = 0; ring < 3; ring++) {
      const radius = [0.48, 0.78, 1.08][ring],
        direction = ring === 1 ? -1 : 1,
        turn = t * (0.13 + ring * 0.035) * direction,
        stroke = [];
      for (let i = 0; i <= 120; i++)
        stroke.push(point((i / 120) * TAU, radius));
      encounterTrace(stroke, color + ring * 55, alpha * 0.08, 7);
      encounterTrace(stroke, color + ring * 55, alpha * 0.55, 0.9);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + turn;
        encounterTrace(
          [point(a, radius - 0.025), point(a, radius + 0.025)],
          color + ring * 55,
          alpha * 0.6,
          0.8,
        );
      }
      const count = compactControls ? 32 : 48;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU + turn,
          kind =
            i % 11 === 0
              ? s.effect === "mix"
                ? materialTypes[(i + ring) % 5]
                : s.effect
              : "gold";
        encounterMote(
          s,
          visible,
          Math.cos(a) * radius * ramp,
          Math.sin(a) * radius * ramp,
          0,
          kind === "gold" ? 0.65 : 6,
          encounterColor(s, ring) + (s.rainbow ? i * 4 : 0),
          alpha * (0.35 + 0.65 * Math.sin(i * 1.5 + t) ** 8),
          kind,
        );
      }
      const head = turn * 3 + ring * 2,
        tail = [];
      for (let j = 0; j < 30; j++)
        tail.push(point(head - j * 0.017 * direction, radius));
      encounterTrace(tail, color + ring * 55, alpha * 0.75, 1.6);
      encounterHead(point(head, radius), color + ring * 55, 10, alpha);
    }
    // A face-on star compass: flat circular geometry, without a shaded planet or depth tilt.
    const compass = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * TAU - t * 0.08,
        r = i % 2 ? 0.075 : 0.25;
      compass.push(point(a, r));
    }
    encounterTrace(compass, color, alpha * 0.2, 6);
    encounterTrace(compass, color, alpha * 0.9, 1.2);
    encounterHead(point(0, 0), color, 17, alpha);
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * TAU,
        r = 1.22,
        major = i % 4 === 0;
      encounterTrace(
        [point(a, r), point(a, r + (major ? 0.065 : 0.025))],
        color + 60,
        alpha * (major ? 0.6 : 0.22),
        major ? 1 : 0.6,
      );
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + t * 0.075,
        p = point(a, 1.22);
      encounterHead(p, color + i * 25, i % 2 ? 4 : 6, alpha * 0.7);
      if (i % 2 === 0)
        encounterTrace(
          [p, point(a + TAU / 3, 1.22)],
          color + 80,
          alpha * 0.13,
          0.6,
        );
    }
  }
  function encounterFlatBirdPose(t) {
    const u = clamp((t - 6.65) / 7.55, 0, 1),
      f = encounterFrame(),
      edge = w / (2 * f.unit) + 1.4;
    return {
      x: -edge + edge * 2 * u,
      y: -0.08 - 0.28 * Math.sin(u * Math.PI),
      scale: 0.76,
      roll: -0.09 * Math.cos(u * Math.PI),
      flight: u,
    };
  }
  function encounterFlatCraneWing(t, back = false) {
    const phase = (t - 6.65) * TAU * 0.62,
      flap = Math.sin(phase),
      outer = Math.sin(phase - 0.48),
      root = { x: -0.1, y: -0.025 };
    const elbow = back
        ? { x: 0.2, y: -0.22 - flap * 0.22 }
        : { x: -0.37, y: -0.2 - flap * 0.27 },
      wrist = back
        ? { x: 0.34, y: -0.39 - outer * 0.34 }
        : { x: -0.68, y: -0.38 - outer * 0.43 },
      parts = [],
      n = compactControls ? 8 : 12;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1),
        a = {
          x: wrist.x + (elbow.x - wrist.x) * u * 0.33,
          y: wrist.y + (elbow.y - wrist.y) * u * 0.33,
        },
        b = back
          ? { x: 0.39 - u * 0.4, y: wrist.y - 0.22 + u * 0.63 }
          : { x: -1.16 + u * 0.36, y: wrist.y - 0.29 + u * 0.83 };
      parts.push({
        a,
        b,
        width: (0.065 + 0.018 * Math.sin(u * Math.PI)) * (back ? 0.85 : 1),
        bend: (back ? 1 : -1) * 0.035,
        detail: true,
        tint: i * 0.8,
      });
    }
    const rows = compactControls ? 7 : 10;
    for (let i = 0; i < rows; i++) {
      const u = i / (rows - 1),
        a = {
          x: root.x + (wrist.x - root.x) * u * 0.86,
          y: root.y + (wrist.y - root.y) * u * 0.86,
        },
        b = { x: a.x - (back ? 0.19 : 0.22), y: a.y + 0.24 + 0.14 * u };
      parts.push({
        a,
        b,
        width: compactControls ? 0.098 : 0.078,
        bend: -0.025,
        detail: true,
        tint: -4 + i,
      });
    }
    for (let i = 0; i < 7; i++) {
      const u = i / 6,
        a = {
          x: root.x + (elbow.x - root.x) * u,
          y: root.y + (elbow.y - root.y) * u,
        },
        b = { x: a.x - (back ? 0.09 : 0.12), y: a.y + 0.13 };
      parts.push({ a, b, width: 0.041, bend: -0.012, detail: false, tint: 8 });
    }
    return { root, elbow, wrist, parts };
  }
  function paintEncounterFlatFeather(part, color, alpha, loose = false) {
    const { a, b, width, bend } = part,
      dx = b.x - a.x,
      dy = b.y - a.y,
      length = Math.hypot(dx, dy) || 1,
      nx = -dy / length,
      ny = dx / length,
      cx = (a.x + b.x) / 2 + nx * bend,
      cy = (a.y + b.y) / 2 + ny * bend;
    const g = fx.createLinearGradient(a.x, a.y, b.x, b.y);
    g.addColorStop(0, `hsla(${color - 9},48%,66%,.55)`);
    g.addColorStop(0.48, `hsla(${color},36%,88%,.95)`);
    g.addColorStop(0.88, `hsla(${color + 15},55%,96%,.85)`);
    g.addColorStop(1, `hsla(${color + 30},60%,94%,.35)`);
    fx.globalCompositeOperation = "source-over";
    fx.globalAlpha = alpha;
    fx.fillStyle = g;
    fx.strokeStyle = `hsla(${color + 10},60%,95%,${loose ? 0.62 : 0.28})`;
    fx.lineWidth = loose ? 0.006 : 0.0038;
    fx.beginPath();
    fx.moveTo(a.x, a.y);
    fx.bezierCurveTo(
      a.x + dx * 0.17 + nx * width * 0.6,
      a.y + dy * 0.17 + ny * width * 0.6,
      cx + nx * width,
      cy + ny * width,
      b.x + nx * width * 0.1,
      b.y + ny * width * 0.1,
    );
    fx.quadraticCurveTo(
      b.x + dx * 0.018,
      b.y + dy * 0.018,
      b.x - nx * width * 0.1,
      b.y - ny * width * 0.1,
    );
    fx.bezierCurveTo(
      cx - nx * width * 0.79,
      cy - ny * width * 0.79,
      a.x + dx * 0.16 - nx * width * 0.34,
      a.y + dy * 0.16 - ny * width * 0.34,
      a.x,
      a.y,
    );
    fx.fill();
    fx.stroke();
    fx.globalAlpha = alpha * 0.58;
    fx.lineWidth = loose ? 0.004 : 0.0024;
    fx.beginPath();
    fx.moveTo(a.x - dx * 0.09, a.y - dy * 0.09);
    fx.quadraticCurveTo(cx, cy, b.x, b.y);
    fx.stroke();
    if (part.detail) {
      fx.globalAlpha = alpha * 0.26;
      const count = compactControls ? 3 : 5;
      for (let i = 1; i <= count; i++) {
        const u = 0.18 + (i / (count + 1)) * 0.64,
          x = a.x + dx * u,
          y = a.y + dy * u,
          spread = Math.sin(u * Math.PI) * width;
        fx.beginPath();
        fx.moveTo(x + nx * spread, y + ny * spread);
        fx.quadraticCurveTo(
          x + dx * 0.025,
          y + dy * 0.025,
          x + dx * 0.07 - nx * spread * 0.7,
          y + dy * 0.07 - ny * spread * 0.7,
        );
        fx.stroke();
      }
    }
  }
  function drawFlatEncounterBird(s, visible, fade) {
    const t = s.age;
    if (t < 6.65) return;
    const pose = encounterFlatBirdPose(t),
      q = encounterPoint(pose.x, pose.y, 0),
      f = encounterFrame(),
      alpha = fade * (1 - encounterEase((t - 14.2) / 0.6)),
      color = s.rainbow ? 194 : s.hue;
    fx.save();
    fx.translate(q.x, q.y);
    fx.scale(f.unit * pose.scale, f.unit * pose.scale);
    fx.rotate(pose.roll);
    // Curved feather vanes overlap from the wingtip back toward the shoulder, following an articulated wing.
    for (const back of [true, false]) {
      const wing = encounterFlatCraneWing(t, back),
        opacity = alpha * (back ? 0.5 : 0.94),
        vane = fx.createLinearGradient(
          wing.root.x,
          wing.root.y,
          wing.wrist.x,
          wing.wrist.y,
        );
      vane.addColorStop(0, `hsla(${color},35%,75%,.85)`);
      vane.addColorStop(1, `hsla(${color + 10},45%,90%,.65)`);
      fx.globalCompositeOperation = "source-over";
      fx.globalAlpha = opacity;
      fx.fillStyle = vane;
      fx.beginPath();
      fx.moveTo(wing.root.x, wing.root.y);
      fx.quadraticCurveTo(
        wing.elbow.x,
        wing.elbow.y - 0.055,
        wing.wrist.x,
        wing.wrist.y,
      );
      fx.lineTo(wing.wrist.x - 0.13, wing.wrist.y + 0.22);
      fx.quadraticCurveTo(
        wing.elbow.x - 0.15,
        wing.elbow.y + 0.22,
        wing.root.x - 0.13,
        wing.root.y + 0.095,
      );
      fx.closePath();
      fx.fill();
      for (const part of wing.parts)
        paintEncounterFlatFeather(
          part,
          color + part.tint + (back ? 23 : 0),
          opacity,
        );
      fx.globalCompositeOperation = "lighter";
      fx.globalAlpha = opacity * 0.36;
      fx.strokeStyle = `hsl(${color},60%,91%)`;
      fx.lineWidth = 0.006;
      fx.beginPath();
      fx.moveTo(wing.root.x, wing.root.y);
      fx.quadraticCurveTo(
        wing.elbow.x,
        wing.elbow.y - 0.04,
        wing.wrist.x,
        wing.wrist.y,
      );
      fx.stroke();
    }
    const body = fx.createLinearGradient(-0.3, -0.14, 0.65, 0.06);
    body.addColorStop(0, `hsla(${color - 10},30%,60%,.5)`);
    body.addColorStop(0.45, `hsla(${color},32%,90%,.95)`);
    body.addColorStop(1, "#f3f8f4");
    fx.globalCompositeOperation = "source-over";
    fx.globalAlpha = alpha * 0.9;
    fx.fillStyle = body;
    fx.strokeStyle = `hsla(${color + 8},55%,96%,.85)`;
    fx.lineWidth = 0.006;
    fx.beginPath();
    fx.moveTo(-0.43, 0.026);
    fx.bezierCurveTo(-0.26, -0.087, -0.05, -0.11, 0.12, -0.056);
    fx.bezierCurveTo(0.25, -0.1, 0.37, -0.26, 0.52, -0.277);
    fx.bezierCurveTo(0.59, -0.33, 0.68, -0.305, 0.68, -0.252);
    fx.quadraticCurveTo(0.65, -0.205, 0.57, -0.222);
    fx.bezierCurveTo(0.43, -0.21, 0.33, -0.095, 0.2, 0.013);
    fx.bezierCurveTo(0.02, 0.115, -0.24, 0.1, -0.43, 0.026);
    fx.closePath();
    fx.fill();
    fx.stroke();
    fx.fillStyle = `hsla(${color - 16},45%,93%,.95)`;
    fx.beginPath();
    fx.moveTo(0.674, -0.274);
    fx.lineTo(0.98, -0.248);
    fx.lineTo(0.674, -0.239);
    fx.closePath();
    fx.fill();
    // Tail plumes and long fine legs make the silhouette recognizably a crane.
    for (let i = 0; i < 5; i++)
      paintEncounterFlatFeather(
        {
          a: { x: -0.23, y: 0.01 + i * 0.012 },
          b: { x: -0.62 - i * 0.024, y: 0.08 + i * 0.02 },
          width: 0.026,
          bend: -0.015,
          detail: false,
        },
        color + 8,
        alpha * 0.8,
      );
    fx.globalAlpha = alpha * 0.58;
    fx.strokeStyle = `hsl(${color + 18},40%,84%)`;
    fx.lineWidth = 0.008;
    for (const side of [-1, 1]) {
      fx.beginPath();
      fx.moveTo(-0.17, 0.075);
      fx.quadraticCurveTo(
        -0.53,
        0.12 + side * 0.025,
        -0.96,
        0.13 + side * 0.036,
      );
      fx.lineTo(-1.045, 0.16 + side * 0.028);
      fx.stroke();
    }
    fx.globalAlpha = alpha;
    fx.fillStyle = "#172839";
    fx.beginPath();
    fx.arc(0.632, -0.267, 0.011, 0, TAU);
    fx.fill();
    fx.fillStyle = "#fffbea";
    fx.beginPath();
    fx.arc(0.635, -0.27, 0.0035, 0, TAU);
    fx.fill();
    // The crane carries one warm wishing star, with only a few glints along its silver wing.
    fx.globalCompositeOperation = "lighter";
    fx.globalAlpha = alpha * 0.28;
    fx.drawImage(sprite(43, "gold"), 0.88, -0.31, 0.3, 0.3);
    fx.globalAlpha = alpha * 0.8;
    fx.strokeStyle = "#ffe4ac";
    fx.lineWidth = 0.003;
    fx.beginPath();
    fx.moveTo(0.975, -0.248);
    fx.quadraticCurveTo(1.015, -0.23, 1.03, -0.19);
    fx.stroke();
    fx.fillStyle = "#fff0c4";
    fx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5,
        r = i % 2 ? 0.024 : 0.055,
        x = 1.03 + Math.cos(a) * r,
        y = -0.14 + Math.sin(a) * r;
      i ? fx.lineTo(x, y) : fx.moveTo(x, y);
    }
    fx.closePath();
    fx.fill();
    const shimmerWing = encounterFlatCraneWing(t);
    for (let i = 0; i < 5; i++) {
      const p = shimmerWing.parts[(i * 3 + 2) % (compactControls ? 8 : 12)].a,
        size = 0.024 + (i % 2) * 0.006;
      fx.globalAlpha = alpha * (0.2 + 0.65 * Math.sin(t * 1.7 + i * 2.1) ** 8);
      fx.drawImage(
        sprite(color + 10, "star"),
        p.x - size,
        p.y - size,
        size * 2,
        size * 2,
      );
    }
    fx.restore();
    const key = w + ":" + h;
    if (s.flatPlumeKey !== key) {
      s.flatPlumeKey = key;
      s.flatPlumes = [];
    }
    const count = compactControls ? 12 : 20;
    for (let i = 0; i < count; i++) {
      const born = 8.55 + i * 0.22,
        age = t - born,
        life = 3.8;
      if (age < 0 || age > life) continue;
      let feather = s.flatPlumes[i];
      if (!feather) {
        const origin = encounterFlatBirdPose(born),
          source =
            encounterFlatCraneWing(born).parts[i % (compactControls ? 8 : 12)],
          c = Math.cos(origin.roll),
          sn = Math.sin(origin.roll),
          world = (p) => ({
            x: origin.x + (p.x * c - p.y * sn) * origin.scale,
            y: origin.y + (p.x * sn + p.y * c) * origin.scale,
          }),
          a = world(source.a),
          b = world(source.b);
        feather = s.flatPlumes[i] = {
          anchor: a,
          part: {
            a: { x: 0, y: 0 },
            b: { x: b.x - a.x, y: b.y - a.y },
            width: source.width * origin.scale,
            bend: source.bend * origin.scale,
            detail: true,
          },
        };
      }
      const sway =
          (Math.sin(age * 1.25 + i) - Math.sin(i)) * encounterEase(age / 0.8),
        p = encounterPoint(
          feather.anchor.x - age * 0.055 + sway * 0.035,
          feather.anchor.y + age * 0.075 + age * age * 0.021,
          0,
        ),
        opacity =
          fade *
          encounterEase(age / 0.28) *
          encounterEase((life - age) / 0.9) *
          0.62;
      fx.save();
      fx.translate(p.x, p.y);
      fx.scale(f.unit, f.unit);
      fx.rotate(Math.sin(age * 0.95 + i) * 0.36 * encounterEase(age / 0.7));
      paintEncounterFlatFeather(
        feather.part,
        color + (s.rainbow ? (i % 4) * 16 : 8),
        opacity,
        true,
      );
      fx.restore();
    }
  }
  function encounterFlatMeteorPose(i, t) {
    const f = encounterFrame(),
      hero = i === 20,
      at = i < 20 ? 0.15 + i * 0.235 : hero ? 4.8 : 9.4 + (i - 21) * 0.5,
      duration = hero ? 3.8 : 3.1 + (i % 3) * 0.18,
      u = (t - at) / duration,
      span = w / f.unit + 2.5,
      startX = -w / (2 * f.unit) - 1.25,
      startY = hero ? -1.6 : -2.14 + ((i * 7) % 13) * 0.14;
    return {
      x: startX + span * u,
      y: startY + span * u * 0.37,
      u,
      span,
      at,
      duration,
      hero,
      tail: hero ? 2.0 : 0.68 + (i % 4) * 0.19,
      width: hero ? 1.65 : 0.68 + (i % 3) * 0.18,
    };
  }
  function drawFlatMeteor(s, i, t, visible, fade) {
    const m = encounterFlatMeteorPose(i, t);
    if (m.u < 0 || m.u > 1) return;
    const f = encounterFrame(),
      q = encounterPoint(m.x, m.y, 0),
      dx = 1 / Math.hypot(1, 0.37),
      dy = 0.37 * dx,
      length = Math.min(m.span * m.u, m.tail) * f.unit,
      alpha = fade * encounterEase(m.u * 10) * encounterEase((1 - m.u) * 9),
      color = s.rainbow ? [195, 224, 276, 329, 42][i % 5] : s.hue;
    fx.save();
    fx.translate(q.x, q.y);
    fx.rotate(Math.atan2(dy, dx));
    fx.globalCompositeOperation = "lighter";
    for (const layer of [0, 1, 2]) {
      const size = m.width * [5.4, 1.15, 0.32][layer],
        reach = length * [1.08, 1, 0.84][layer],
        g = fx.createLinearGradient(-reach, 0, 1, 0);
      g.addColorStop(0, `hsla(${color},80%,70%,0)`);
      g.addColorStop(
        0.38,
        `hsla(${color},80%,76%,${[0.035, 0.13, 0.32][layer]})`,
      );
      g.addColorStop(
        0.84,
        `hsla(${color + 15},70%,88%,${[0.1, 0.42, 0.85][layer]})`,
      );
      g.addColorStop(
        1,
        layer === 2
          ? "#fffcec"
          : `hsla(${color + 8},80%,85%,${layer ? 0.65 : 0.22})`,
      );
      fx.globalAlpha = alpha;
      fx.fillStyle = g;
      fx.beginPath();
      fx.moveTo(-reach, 0);
      fx.quadraticCurveTo(-reach * 0.23, -size * 1.5, 0, -size * 0.6);
      fx.quadraticCurveTo(size * 0.5, 0, 0, size * 0.6);
      fx.quadraticCurveTo(-reach * 0.23, size * 1.5, -reach, 0);
      fx.fill();
    }
    fx.globalAlpha = alpha;
    fx.fillStyle = "#fffef3";
    fx.beginPath();
    fx.ellipse(0, 0, m.hero ? 2.6 : 1.65, m.hero ? 1 : 0.65, 0, 0, TAU);
    fx.fill();
    fx.strokeStyle = `hsla(${color},80%,94%,.6)`;
    fx.lineWidth = 0.55;
    fx.beginPath();
    fx.moveTo(-4, 0);
    fx.lineTo(4, 0);
    fx.moveTo(0, -(m.hero ? 5 : 2.5));
    fx.lineTo(0, m.hero ? 5 : 2.5);
    fx.stroke();
    fx.restore();
    encounterHead(q, color, m.hero ? 18 : 10, alpha * (m.hero ? 0.58 : 0.4));
    for (let j = 0; j < (m.hero ? 13 : 5); j++) {
      const back = (j + 1) * 0.055,
        age = m.u * m.duration - back;
      if (age < 0) continue;
      const p = encounterFlatMeteorPose(i, t - back);
      encounterMote(
        s,
        visible,
        p.x,
        p.y,
        0,
        0.32 + (j % 3) * 0.08,
        color + j * 2,
        alpha * (1 - j / (m.hero ? 13 : 5)) * 0.42,
      );
    }
  }
  function drawFlatMeteorEncounter(s, visible, fade) {
    const t = s.age;
    for (let i = 0; i < 24; i++) drawFlatMeteor(s, i, t, visible, fade);
    const shimmer =
        fade *
        encounterEase((t - 0.4) / 2) *
        (1 - encounterEase((t - 14.4) / 1.8)),
      count = compactControls ? 36 : 64;
    for (let i = 0; i < count; i++) {
      const d = s.field[i],
        u = (d.phase / TAU + t * 0.024) % 1,
        span = w / encounterFrame().unit + 1,
        x = -span * 0.5 + u * span,
        y = -1.45 + (i % 9) * 0.19 + (u - 0.5) * span * 0.37;
      encounterMote(
        s,
        visible,
        x,
        y,
        0,
        0.34 + (i % 4) * 0.08,
        encounterColor(s, i),
        shimmer *
          Math.sin(u * Math.PI) *
          (0.15 + 0.35 * Math.sin(t * 1.2 + i) ** 8),
      );
    }
    drawFlatEncounterBird(s, visible, fade);
  }
  function drawEncounter(dt, visible) {
    const s = encounter;
    if (!s) return;
    if (wish || textCloud || story) {
      encounter = null;
      return;
    }
    s.age += dt;
    if (s.age >= s.duration) {
      encounter = null;
      return;
    }
    s.cursor = 0;
    const fade =
      encounterEase(s.age / 0.65) * encounterEase((s.duration - s.age) / 1.8);
    fx.save();
    fx.globalAlpha = 1;
    if (state.view === "2d") {
      if (s.mode === "heart") drawFlatHeartEncounter(s, visible, fade);
      else if (s.mode === "orbit") drawFlatOrbitEncounter(s, visible, fade);
      else drawFlatMeteorEncounter(s, visible, fade);
    } else if (s.mode === "heart") drawBinaryEncounter(s, visible, fade);
    else if (s.mode === "orbit") drawOrbitEncounter(s, visible, fade);
    else drawMeteorEncounter(s, visible, fade);
    fx.restore();
    s.motes.length = s.cursor;
  }
  function drawMeteors(dt) {
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.age += dt;
      const t = m.age / m.duration;
      if (t >= 1) {
        meteors.splice(i, 1);
        continue;
      }
      m.x = m.sx + (m.ex - m.sx) * t;
      m.y = m.sy + (m.ey - m.sy) * t;
      const dx = m.ex - m.sx,
        dy = m.ey - m.sy,
        len = Math.hypot(dx, dy),
        tail = Math.min(len * t, 130),
        tx = m.x - (dx / len) * tail,
        ty = m.y - (dy / len) * tail;
      fx.globalCompositeOperation = "lighter";
      fx.globalAlpha = Math.min(t * 8, (1 - t) * 5, 1);
      const g = fx.createLinearGradient(tx, ty, m.x, m.y);
      g.addColorStop(0, "#b8daff00");
      g.addColorStop(0.8, "#b7dcff80");
      g.addColorStop(1, "#fffbed");
      fx.strokeStyle = g;
      fx.lineWidth = 1.35;
      fx.beginPath();
      fx.moveTo(tx, ty);
      fx.lineTo(m.x, m.y);
      fx.stroke();
      fx.drawImage(sprite(m.hue, "star"), m.x - 7, m.y - 7, 14, 14);
      if (Math.random() < dt * 50) {
        const life = rand(0.3, 0.8);
        addParticle({
          x: m.x,
          y: m.y,
          px: m.x,
          py: m.y,
          vx: rand(-10, 10),
          vy: rand(-8, 8),
          life,
          max: life,
          hue: m.hue,
          size: 0.45,
          type: "gold",
          seed: 0,
        });
      }
    }
    fx.globalAlpha = 1;
  }
  function drawSkyPaths(dt) {
    for (let i = skyPaths.length - 1; i >= 0; i--) {
      skyPaths[i].age += dt;
      if (skyPaths[i].age > 5) skyPaths.splice(i, 1);
    }
    const paths =
      pointer && pointer.points.length > 2
        ? [...skyPaths, { points: pointer.points, age: 0 }]
        : skyPaths;
    for (const path of paths) {
      fx.globalCompositeOperation = "lighter";
      fx.globalAlpha = Math.max(0, 1 - path.age / 5) * 0.7;
      fx.strokeStyle = "#b8d8e880";
      fx.lineWidth = 0.65;
      fx.beginPath();
      path.points.forEach((p, i) => {
        if (!i) fx.moveTo(p.x, p.y);
        else fx.lineTo(p.x, p.y);
      });
      fx.stroke();
      for (let i = 0; i < path.points.length; i += 3) {
        const p = path.points[i];
        fx.drawImage(sprite(205, "star"), p.x - 4, p.y - 4, 8, 8);
      }
    }
    fx.globalAlpha = 1;
  }
  function drawCharge() {
    if (!pointer || pointer.points.length > 2) return;
    const elapsed = (performance.now() - pointer.start) / 1000;
    if (elapsed < 0.2) return;
    const charge = clamp((elapsed - 0.2) / 1.5, 0, 1),
      radius = 17 + charge * 18;
    ctx.strokeStyle = "#edce9130";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, radius, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = "#f3d99c";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(
      pointer.x,
      pointer.y,
      radius,
      -Math.PI / 2,
      -Math.PI / 2 + TAU * charge,
    );
    ctx.stroke();
    ctx.drawImage(
      sprite(43, "star"),
      pointer.x - 9 - charge * 6,
      pointer.y - 9 - charge * 6,
      18 + charge * 12,
      18 + charge * 12,
    );
  }
  function toggleSlow() {
    state.slow = !state.slow;
    $("slowInput").checked = state.slow;
    $("slowTag").hidden = !state.slow;
    $("slowExit").hidden = !state.slow || hasOpenPanel();
  }
  $("heartBtn").addEventListener("click", () => specialShow("heart"));
  $("orbitBtn").addEventListener("click", () => specialShow("orbit"));
  $("meteorBtn").addEventListener("click", () => specialShow("meteor"));
  $("view2dBtn").addEventListener("click", () => setViewMode("2d"));
  $("view3dBtn").addEventListener("click", () => setViewMode("3d"));
  $("depthBurstBtn").addEventListener("click", () => specialShow("depth"));
  addEventListener("pointermove", (event) => {
    if (
      (state.view === "3d" || story?.variant === "immersive") &&
      !reduced.matches &&
      !state.paused
    ) {
      depthView.aimX = (clamp(event.clientX / w, 0, 1) - 0.5) * 0.12;
      depthView.aimY = (clamp(event.clientY / h, 0, 1) - 0.5) * 0.08;
    }
  });
  canvas.addEventListener("pointerleave", () => {
    depthView.aimX = depthView.aimY = 0;
  });
  $("slowInput").addEventListener("change", toggleSlow);
  $("slowExit").addEventListener("click", toggleSlow);
  $("windInput").addEventListener("input", (event) => {
    state.wind = Number(event.target.value);
    $("windValue").textContent =
      Math.abs(state.wind) < 0.15
        ? "无风"
        : state.wind > 0
          ? "向右 " + Math.round(state.wind * 100) + "%"
          : "向左 " + Math.round(-state.wind * 100) + "%";
  });
  function setAutoPlay(on, remember = true) {
    state.auto = Boolean(on);
    $("autoInput").checked = state.auto;
    $("autoBtn").setAttribute("aria-pressed", String(state.auto));
    $("autoLabel").textContent = state.auto ? "自动开" : "自动关";
    $("autoBtn").title = state.auto
      ? "关闭自动播放，只释放你手动点亮的烟花"
      : "开启自动播放，让烟花随乐章绽放";
    if (state.auto) nextAuto = clock + 0.3;
    else {
      pending = pending.filter((task) => !task.automatic);
      for (const r of rockets) if (r.automatic) stopRocketSound(r);
      rockets = rockets.filter((rocket) => !rocket.automatic);
      ordinaryComets = ordinaryComets.filter((r) => !r.automatic);
    }
    if (remember) savePreferences();
    updateCaption();
  }
  function updateShow(dt) {
    if (specialCaption && clock >= specialUntil) {
      specialCaption = null;
      updateCaption();
    }
    if (
      !state.auto ||
      phoenix ||
      wish ||
      story ||
      clock < specialUntil ||
      pointer
    )
      return;
    const phase = Math.floor((clock % 48) / 12);
    if (chapter !== phase) {
      chapter = phase;
      updateCaption();
    }
    if (clock < nextAuto) return;
    const intervals = spectacular()
        ? [1.8, 1.2, 0.75, 2.2]
        : [2.3, 1.5, 0.85, 2.8],
      amount = state.density === 3 ? 1.6 : state.density === 1 ? 0.65 : 1;
    nextAuto = clock + (intervals[phase] * rand(0.7, 1.2)) / amount;
    const targetX = rand(w * 0.18, w * 0.82),
      targetY = rand(h * 0.15, horizon * 0.68);
    launch(targetX, targetY, { power: rand(0.8, 1.12), automatic: true });
    if (phase === 2 && Math.random() > 0.45)
      schedule(
        0.17,
        () =>
          launch(w - targetX, targetY + rand(-20, 30), {
            power: 0.85,
            automatic: true,
          }),
        true,
      );
  }
  function updateCaption() {
    if (phoenix) {
      syncPhoenixUI();
      return;
    }
    const index = chapter < 0 ? 0 : chapter;
    const special =
      specialCaption && clock < specialUntil
        ? encounter
          ? { ...specialCaption, ...encounterCaption(encounter.mode) }
          : specialCaption
        : null;
    if (textCloud?.kind === "love") {
      syncLoveUI();
      return;
    }
    $("chapterName").textContent = state.paused
      ? "幕间"
      : textCloud
        ? "寄语"
        : special
          ? special.name
          : state.auto
            ? chapters[index][0]
            : "自由";
    $("showStatus").textContent = state.paused
      ? "PAUSED"
      : textCloud
        ? "SKY LETTERS"
        : special
          ? "A LITTLE MAGIC"
          : state.auto
            ? "AUTO · 0" + (index + 1)
            : "YOUR STAGE";
    if (state.view === "3d") $("showStatus").textContent += " · 3D";
    $("chapterNote").textContent = state.paused
      ? "停在这一瞬 · 继续即绽放"
      : textCloud
        ? `${state.view === "3d" ? "逐字飞来 · 立体绽放" : "一字一礼花"} · ${textCloud.glyphs.filter((g) => g.born !== null).length} / ${textCloud.glyphs.length}`
        : special
          ? special.note
          : !state.auto
            ? "由你点亮 · " + effectNames[state.effect]
            : spectacular()
              ? "绚彩交响 · 五重材质 · 全光谱绽放"
              : chapters[index][1] + " · " + effectNames[state.effect];
  }
  function paint(dt) {
    if (state.paused && textCloud?.kind === "love" && !depthDirty) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(backdrop, 0, 0, w, h);
    if (!state.paused || depthDirty) {
      dt = state.paused ? 0 : dt;
      depthDirty = false;
      const ease = 1 - Math.exp(-dt * 5);
      depthView.x += (depthView.aimX - depthView.x) * ease;
      depthView.y += (depthView.aimY - depthView.y) * ease;
      fx.clearRect(0, 0, w, h);
      nearFx.clearRect(0, 0, w, h);
      fx.globalCompositeOperation = "lighter";
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.age += dt;
        const t = clamp(r.age / r.duration, 0, 1),
          ease = r.ballistic ? t * (2 - t) : 1 - Math.pow(1 - t, 1.7),
          oldX = r.x,
          oldY = r.y,
          bend =
            r.ballistic && r.curved
              ? (r.flightSeed % 2 ? -1 : 1) *
                Math.min(w * 0.16, 110) *
                t *
                (1 - t)
              : 0;
        r.x =
          r.sx + (r.tx - r.sx) * (r.ballistic || r.curved ? t : ease) + bend;
        r.y = r.sy + (r.ty - r.sy) * ease;
        r.depthShell = r.depthFlight && state.view === "3d";
        if (r.depthShell) {
          const point = depthShellPoint(r);
          r.x = point.x;
          r.y = point.y;
        }
        if (!r.depthShell) {
          fx.globalAlpha = r.companion ? letterVisibility(r.x, r.y) : 1;
          fx.strokeStyle = `hsla(${r.hue},95%,85%,.8)`;
          fx.lineWidth = 0.8;
          fx.beginPath();
          fx.moveTo(oldX, oldY);
          fx.lineTo(r.x, r.y);
          fx.stroke();
          fx.drawImage(sprite(r.hue, "gold"), r.x - 3, r.y - 3, 6, 6);
          if (Math.random() < dt * 90)
            addParticle({
              x: r.x,
              y: r.y,
              px: r.x,
              py: r.y,
              vx: rand(-5, 5),
              vy: rand(8, 35),
              life: 0.65,
              max: 0.65,
              hue: r.hue,
              size: 0.55,
              type: "gold",
              seed: 0,
              gravity: 16,
              trail: true,
              companion: r.companion,
            });
        }
        if (t >= 1) {
          rockets.splice(i, 1);
          if (r.roseCue) revealLoveRose(r.wishId, r.roseCue);
          if (r.wishGlyph !== null) revealWishGlyph(r.wishId, r.wishGlyph);
          else
            burst(r.x, r.y, r.hue, r.type, r.power, r.shape, {
              companion: r.companion,
              automatic: r.automatic,
              depthImpact:
                !r.loveShell && Boolean(r.route) && state.view === "3d",
              noEcho: r.loveShell,
              romance: r.loveShell,
              density: r.loveShell ? 0.4 : 1,
            });
        }
      }
      fx.globalAlpha = 1;
      const visible = [];
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0 || (!p.spatial && p.y > h + 10)) {
          particles.splice(i, 1);
          continue;
        }
        p.px = p.x;
        p.py = p.y;
        const airborne =
            p.type === "petal" || p.type === "frost" || p.type === "butterfly",
          wind = airborne
            ? state.wind * 19 +
              Math.sin(clock * (p.type === "butterfly" ? 2.3 : 1.4) + p.seed) *
                (p.type === "petal" ? 13 : p.type === "butterfly" ? 19 : 6)
            : state.wind * 2;
        if (p.orbit) {
          const s = p.orbit;
          s.age += dt;
          const a = s.angle + s.age * s.spin,
            r = s.radius * (1 - Math.exp(-s.age * 2.4)),
            turn = s.turn + s.age * 0.13,
            rx = Math.cos(a) * r,
            ry = Math.sin(a) * r * Math.cos(s.tilt);
          s.x = rx * Math.cos(turn) - ry * Math.sin(turn);
          s.y = rx * Math.sin(turn) + ry * Math.cos(turn);
          p.x = s.cx + s.x;
          p.y = s.cy + s.y;
        } else if (p.spatial) {
          if (!advanceDepth(p, dt, wind)) {
            particles.splice(i, 1);
            continue;
          }
        } else {
          const drag = Math.exp(-dt * p.drag);
          p.vx *= drag;
          p.vy = p.vy * drag + p.gravity * dt;
          p.x += (p.vx + wind) * dt;
          p.y +=
            (p.vy +
              (p.type === "butterfly" ? Math.sin(clock * 3 + p.seed) * 8 : 0)) *
            dt;
        }
        p.rotation += p.spin * dt * (airborne ? 1 : 0.35);
        const historySize = p.trail ? 13 : p.spatial && !p.spatial.ring ? 4 : 0;
        if (historySize) {
          const point = p.history.length < historySize ? {} : p.history.shift();
          point.x = p.x;
          point.y = p.y;
          p.history.push(point);
        }
        if (p.split && p.life < p.max * 0.52) {
          p.split = false;
          for (let j = 0; j < 2; j++) {
            const life = rand(0.35, 0.8);
            addParticle({
              x: p.x,
              y: p.y,
              px: p.x,
              py: p.y,
              vx: p.vx * 0.4 + rand(-19, 19),
              vy: p.vy * 0.4 + rand(-16, 12),
              life,
              max: life,
              hue: p.hue - 8,
              size: 0.38,
              type: "gold",
              seed: p.seed,
              trail: false,
              companion: p.companion,
            });
          }
        }
        const fade = clamp(p.life / Math.min(1.2, p.max * 0.4), 0, 1),
          twinkle =
            p.type === "gold" && p.life < p.max * 0.5
              ? 0.35 + 0.65 * Math.sin(p.life * 24 + p.seed) ** 2
              : 1;
        p.renderAlpha =
          fade *
          twinkle *
          (p.depthAlpha ?? 1) *
          (p.companion ? letterVisibility(p.x, p.y) : 1);
        visible.push(p);
      }
      drawEncounter(dt, visible);
      if (state.view === "3d")
        visible.sort((a, b) => (b.renderZ || 0) - (a.renderZ || 0));
      if (!drawOrdinaryGpu(visible))
        for (const p of visible)
          if (p.renderAlpha >= 0.005 && particleInView(p))
            drawParticle(
              p,
              p.renderAlpha,
              p.spatial && p.projectedScale > 1.32 ? nearFx : fx,
            );
      nearFx.globalAlpha = 1;
      drawMeteors(dt);
      drawSkyPaths(dt);
      drawStoryScene();
      if (textCloud && state.view === "3d" && textCloud.kind !== "love")
        maskWishEffects(textCloud);
      fx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(light, 0, 0, w, h);
    // Mirror the actual particle layer, then break it into small horizontal ripples.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizon, w, h - horizon);
    ctx.clip();
    ctx.globalAlpha = 0.22;
    ctx.translate(0, horizon * 1.72);
    ctx.scale(1, -0.72);
    ctx.drawImage(light, 0, 0, w, h);
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#06101c55";
    for (let y = horizon + 3; y < h; y += 5) {
      const shift = Math.sin(y * 0.16 + clock * 1.1) * 8;
      ctx.fillRect(shift, y, w, 1.5);
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      if (!state.paused) f.life -= dt;
      if (f.life <= 0) {
        flashes.splice(i, 1);
        continue;
      }
      const a = f.life / f.max;
      ctx.globalCompositeOperation = "screen";
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 145 * f.power);
      g.addColorStop(0, `hsla(${f.hue},90%,80%,${a * 0.18})`);
      g.addColorStop(1, `hsla(${f.hue},90%,60%,0)`);
      ctx.fillStyle = g;
      ctx.fillRect(f.x - 180, f.y - 180, 360, 360);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "lighter";
    drawDepthShells();
    drawText(dt);
    drawHands();
    drawCharge();
    ctx.globalCompositeOperation = "source-over";
  }
  // A small, local stage: sampled light drawings become actors after their own shell bursts.
  const storyArt = (() => {
    const art = {};
    function make(name, draw) {
      const points = [];
      let x = 0,
        y = 0,
        part = "body";
      const add = (a, b) => {
        points.push({ x: a, y: b, part });
        x = a;
        y = b;
      };
      const pen = {
        part: (p) => {
          part = p;
        },
        M: (a, b) => {
          x = a;
          y = b;
          add(a, b);
        },
        L: (a, b) => {
          const sx = x,
            sy = y,
            n = Math.max(1, Math.ceil(Math.hypot(a - x, b - y) / 0.038));
          for (let i = 1; i <= n; i++)
            add(sx + ((a - sx) * i) / n, sy + ((b - sy) * i) / n);
        },
        C: (a, b, c, d, e, f) => {
          const sx = x,
            sy = y,
            n = Math.max(
              12,
              Math.ceil(
                (Math.hypot(a - x, b - y) +
                  Math.hypot(c - a, d - b) +
                  Math.hypot(e - c, f - d)) /
                  0.04,
              ),
            );
          for (let i = 1; i <= n; i++) {
            const t = i / n,
              u = 1 - t;
            add(
              u * u * u * sx +
                3 * u * u * t * a +
                3 * u * t * t * c +
                t * t * t * e,
              u * u * u * sy +
                3 * u * u * t * b +
                3 * u * t * t * d +
                t * t * t * f,
            );
          }
        },
        E: (cx, cy, rx, ry, angle = 0) => {
          const n = Math.max(18, Math.ceil((TAU * Math.max(rx, ry)) / 0.038));
          for (let i = 0; i <= n; i++) {
            const t = (i / n) * TAU,
              a = Math.cos(t) * rx,
              b = Math.sin(t) * ry;
            add(
              cx + a * Math.cos(angle) - b * Math.sin(angle),
              cy + a * Math.sin(angle) + b * Math.cos(angle),
            );
          }
        },
      };
      draw(pen);
      art[name] = points;
    }
    make("alice", (p) => {
      p.E(0, -0.68, 0.2, 0.23);
      p.M(-0.2, -0.65);
      p.C(-0.4, -0.45, -0.27, -0.2, -0.33, -0.1);
      p.M(0.2, -0.65);
      p.C(0.39, -0.44, 0.3, -0.22, 0.31, -0.1);
      p.M(-0.17, -0.44);
      p.L(-0.28, -0.1);
      p.L(-0.62, 0.52);
      p.C(-0.28, 0.72, 0.27, 0.72, 0.62, 0.52);
      p.L(0.28, -0.1);
      p.L(0.17, -0.44);
      p.M(-0.14, -0.37);
      p.L(-0.14, 0.04);
      p.L(0.14, 0.04);
      p.L(0.14, -0.37);
      p.M(-0.18, 0.09);
      p.L(-0.34, 0.48);
      p.C(-0.1, 0.56, 0.12, 0.56, 0.34, 0.48);
      p.L(0.18, 0.09);
      p.M(-0.25, -0.29);
      p.L(-0.53, -0.1);
      p.L(-0.72, -0.27);
      p.M(0.25, -0.29);
      p.L(0.56, -0.13);
      p.L(0.7, -0.31);
      p.M(-0.2, 0.66);
      p.L(-0.23, 0.98);
      p.L(-0.43, 1);
      p.M(0.2, 0.66);
      p.L(0.23, 0.98);
      p.L(0.43, 1);
      p.M(-0.17, -0.87);
      p.L(-0.3, -0.99);
      p.L(-0.32, -0.8);
      p.L(-0.17, -0.87);
      p.L(0.02, -0.98);
      p.L(0.03, -0.8);
      p.L(-0.17, -0.87);
    });
    make("rabbit", (p) => {
      p.E(0, -0.2, 0.38, 0.34);
      p.E(-0.19, -0.77, 0.105, 0.38, -0.23);
      p.E(0.17, -0.79, 0.105, 0.4, 0.16);
      p.E(-0.18, -0.77, 0.04, 0.25, -0.23);
      p.E(0.17, -0.79, 0.04, 0.27, 0.16);
      p.E(0, 0.43, 0.39, 0.48);
      p.E(-0.3, 0.84, 0.25, 0.11, -0.1);
      p.E(0.29, 0.84, 0.25, 0.11, 0.1);
      p.E(-0.43, 0.48, 0.12, 0.15);
      p.M(-0.27, 0.08);
      p.L(-0.2, 0.48);
      p.L(0, 0.34);
      p.L(0.2, 0.48);
      p.L(0.27, 0.08);
      p.M(0, 0.13);
      p.L(0, 0.63);
      p.E(-0.13, -0.26, 0.026, 0.04);
      p.E(0.13, -0.26, 0.026, 0.04);
      p.M(-0.055, -0.13);
      p.L(0, -0.08);
      p.L(0.055, -0.13);
      p.M(-0.06, 0);
      p.C(0, 0.05, 0.05, 0.04, 0.11, -0.01);
      for (const s of [-1, 1]) {
        p.M(s * 0.12, -0.1);
        p.L(s * 0.54, -0.16);
        p.M(s * 0.13, -0.05);
        p.L(s * 0.54, -0.03);
      }
      p.M(0.31, 0.22);
      p.L(0.58, 0.05);
      p.L(0.68, 0.22);
      p.E(0.72, 0.4, 0.2, 0.24);
    });
    make("watch", (p) => {
      p.E(0, 0.1, 0.77, 0.77);
      p.E(0, 0.1, 0.67, 0.67);
      p.E(0, -0.89, 0.18, 0.12);
      p.M(-0.12, -0.76);
      p.L(-0.12, -0.66);
      p.M(0.12, -0.76);
      p.L(0.12, -0.66);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        p.M(Math.sin(a) * 0.58, 0.1 - Math.cos(a) * 0.58);
        p.L(Math.sin(a) * 0.51, 0.1 - Math.cos(a) * 0.51);
      }
      p.M(0, 0.1);
      p.L(0, -0.32);
      p.M(0, 0.1);
      p.L(0.31, 0.24);
      p.E(0, 0.1, 0.045, 0.045);
    });
    make("key", (p) => {
      p.E(-0.45, 0, 0.36, 0.36);
      p.E(-0.45, 0, 0.19, 0.19);
      p.M(-0.09, -0.06);
      p.L(0.95, -0.06);
      p.L(0.95, 0.18);
      p.L(0.79, 0.18);
      p.L(0.79, 0.08);
      p.L(0.62, 0.08);
      p.L(0.62, 0.24);
      p.L(0.45, 0.24);
      p.L(0.45, 0.06);
      p.L(-0.09, 0.06);
    });
    make("door", (p) => {
      p.M(-0.58, 1);
      p.L(-0.58, -0.47);
      p.C(-0.58, -1.23, 0.58, -1.23, 0.58, -0.47);
      p.L(0.58, 1);
      p.L(-0.58, 1);
      p.M(-0.45, 0.87);
      p.L(-0.45, -0.44);
      p.C(-0.45, -1.02, 0.45, -1.02, 0.45, -0.44);
      p.L(0.45, 0.87);
      p.L(-0.45, 0.87);
      p.E(0.25, 0.08, 0.055, 0.055);
      p.M(0.25, 0.13);
      p.L(0.21, 0.27);
      p.L(0.29, 0.27);
      p.L(0.25, 0.13);
    });
    make("flower", (p) => {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU;
        p.E(
          Math.cos(a) * 0.4,
          -0.43 + Math.sin(a) * 0.4,
          0.2,
          0.32,
          a + Math.PI / 2,
        );
      }
      p.E(0, -0.43, 0.2, 0.2);
      p.M(0, 0.15);
      p.C(-0.2, 0.44, 0.15, 0.74, 0, 1.08);
      p.M(0, 0.52);
      p.C(0.23, 0.22, 0.57, 0.33, 0.54, 0.39);
      p.C(0.48, 0.58, 0.24, 0.66, 0, 0.52);
      p.M(0, 0.81);
      p.C(-0.26, 0.52, -0.55, 0.55, -0.54, 0.61);
      p.C(-0.45, 0.84, -0.2, 0.97, 0, 0.81);
      p.E(-0.065, -0.45, 0.018, 0.025);
      p.E(0.065, -0.45, 0.018, 0.025);
      p.M(-0.07, -0.35);
      p.C(0, -0.29, 0.05, -0.3, 0.09, -0.35);
    });
    make("mushroom", (p) => {
      p.M(-1, 0.13);
      p.C(-0.98, -0.75, -0.5, -0.9, 0, -0.9);
      p.C(0.5, -0.9, 0.98, -0.75, 1, 0.13);
      p.C(0.42, 0.32, -0.43, 0.32, -1, 0.13);
      p.M(-0.17, 0.27);
      p.C(-0.18, 0.67, -0.4, 1.01, -0.28, 1.05);
      p.L(0.31, 1.05);
      p.C(0.4, 0.94, 0.16, 0.64, 0.17, 0.27);
      p.E(-0.4, -0.4, 0.13, 0.16);
      p.E(0.36, -0.45, 0.16, 0.13);
      p.E(0, -0.7, 0.1, 0.1);
      p.M(-0.79, 0.13);
      p.C(-0.3, 0.01, 0.3, 0.01, 0.79, 0.13);
    });
    make("cat", (p) => {
      p.M(-0.86, 0.08);
      p.C(-1, -0.3, -0.88, -0.53, -0.76, -0.61);
      p.L(-0.78, -0.98);
      p.L(-0.39, -0.78);
      p.C(-0.1, -0.88, 0.1, -0.88, 0.39, -0.78);
      p.L(0.78, -0.98);
      p.L(0.76, -0.61);
      p.C(0.88, -0.53, 1, -0.3, 0.86, 0.08);
      p.C(0.62, 0.69, -0.62, 0.69, -0.86, 0.08);
      p.part("eyes");
      p.E(-0.35, -0.32, 0.24, 0.13, -0.12);
      p.E(0.35, -0.32, 0.24, 0.13, 0.12);
      p.M(-0.35, -0.44);
      p.L(-0.35, -0.2);
      p.M(0.35, -0.44);
      p.L(0.35, -0.2);
      p.part("smile");
      p.M(-0.65, -0.02);
      p.C(-0.24, 0.2, 0.24, 0.2, 0.65, -0.02);
      p.C(0.5, 0.58, -0.5, 0.58, -0.65, -0.02);
      for (let i = -3; i <= 3; i++) {
        const x = i * 0.13;
        p.M(x, 0.14 - Math.abs(x) * 0.09);
        p.L(x, 0.39 - Math.abs(x) * 0.3);
      }
    });
    make("cup", (p) => {
      p.M(-0.7, -0.42);
      p.L(-0.57, 0.47);
      p.C(-0.48, 0.72, 0.39, 0.72, 0.54, 0.47);
      p.L(0.7, -0.42);
      p.C(0.32, -0.26, -0.31, -0.26, -0.7, -0.42);
      p.E(0, -0.43, 0.7, 0.16);
      p.M(0.7, -0.27);
      p.C(1.35, -0.52, 1.28, 0.52, 0.57, 0.37);
      p.E(0, 0.77, 0.98, 0.12);
    });
    make("pot", (p) => {
      p.E(0, 0.18, 0.65, 0.7);
      p.M(-0.57, -0.13);
      p.L(-0.99, -0.5);
      p.L(-1.14, -0.32);
      p.C(-1.02, 0.24, -0.68, 0.25, -0.57, 0.45);
      p.M(0.57, -0.22);
      p.C(1.43, -0.7, 1.36, 0.84, 0.59, 0.56);
      p.M(-0.45, -0.4);
      p.C(-0.4, -0.75, 0.4, -0.75, 0.45, -0.4);
      p.E(0, -0.77, 0.12, 0.09);
      p.M(-0.38, 0.83);
      p.L(0.38, 0.83);
      p.E(0, 0.16, 0.14, 0.23);
    });
    make("crown", (p) => {
      p.M(-0.95, 0.49);
      p.L(-1, -0.5);
      p.L(-0.45, -0.05);
      p.L(0, -0.9);
      p.L(0.45, -0.05);
      p.L(1, -0.5);
      p.L(0.95, 0.49);
      p.L(-0.95, 0.49);
      p.M(-0.95, 0.63);
      p.L(0.95, 0.63);
      for (const x of [-1, 0, 1]) p.E(x, x === 0 ? -0.97 : -0.58, 0.075, 0.075);
      p.E(0, 0.28, 0.1, 0.1);
      p.E(-0.53, 0.29, 0.06, 0.06);
      p.E(0.53, 0.29, 0.06, 0.06);
    });
    make("heart", (p) => {
      p.M(0, 1);
      p.C(-1, 0.34, -1.15, -0.46, -0.6, -0.76);
      p.C(-0.24, -0.96, 0, -0.6, 0, -0.45);
      p.C(0, -0.6, 0.24, -0.96, 0.6, -0.76);
      p.C(1.15, -0.46, 1, 0.34, 0, 1);
    });
    make("card", (p) => {
      p.M(-0.65, -1);
      p.L(0.65, -1);
      p.L(0.65, 1);
      p.L(-0.65, 1);
      p.L(-0.65, -1);
      p.M(0, 0.45);
      p.C(-0.55, 0.03, -0.56, -0.25, -0.31, -0.37);
      p.C(-0.13, -0.45, 0, -0.26, 0, -0.18);
      p.C(0, -0.26, 0.13, -0.45, 0.31, -0.37);
      p.C(0.56, -0.25, 0.55, 0.03, 0, 0.45);
      p.M(-0.48, -0.77);
      p.L(-0.48, -0.54);
      p.M(0.48, 0.77);
      p.L(0.48, 0.54);
    });
    return art;
  })();
  const storyActs = [
    {
      title: "追逐白兔",
      short: "白兔",
      duration: 12,
      hue: 43,
      lines: [
        [0, "夏日的梦里，一只白兔匆匆跑过。"],
        [4, "“来不及了！”怀表一闪，爱丽丝追进了夜色。"],
        [9, "好奇心，替她推开了第一扇门。"],
      ],
      actors: [
        {
          art: "alice",
          x: -290,
          y: 55,
          size: 105,
          at: 0.25,
          hue: 204,
          motion: "follow",
        },
        {
          art: "rabbit",
          x: 95,
          y: 25,
          size: 135,
          at: 1.1,
          hue: 45,
          motion: "hop",
        },
        {
          art: "watch",
          x: 310,
          y: -90,
          size: 68,
          at: 2.5,
          hue: 42,
          motion: "pendulum",
        },
      ],
    },
    {
      title: "坠入星洞",
      short: "星洞",
      duration: 12,
      hue: 218,
      lines: [
        [0, "脚下忽然一空，兔子洞变成了星光隧道。"],
        [4, "怀表、钥匙和门，像流星一样从身边掠过。"],
        [9, "她仍在下坠，却已经不再害怕。"],
      ],
      actors: [
        {
          art: "alice",
          x: 0,
          y: 0,
          size: 108,
          at: 0.2,
          hue: 205,
          motion: "fall",
        },
        {
          art: "key",
          x: -275,
          y: 30,
          size: 70,
          at: 1.6,
          hue: 45,
          motion: "float",
        },
        {
          art: "door",
          x: 295,
          y: 20,
          size: 92,
          at: 3.2,
          hue: 265,
          motion: "float",
        },
      ],
    },
    {
      title: "花园低语",
      short: "花园",
      duration: 12,
      hue: 149,
      lines: [
        [0, "落地时，她已经小得像一粒花粉。"],
        [4, "高高的花朵弯下腰，整座花园都在轻声问好。"],
        [9, "世界变大了，勇气也可以慢慢长大。"],
      ],
      actors: [
        {
          art: "flower",
          x: -295,
          y: 5,
          size: 112,
          at: 0.15,
          hue: 330,
          motion: "sway",
        },
        {
          art: "flower",
          x: 280,
          y: 15,
          size: 125,
          at: 0.8,
          hue: 48,
          motion: "sway",
        },
        {
          art: "mushroom",
          x: 130,
          y: 105,
          size: 85,
          at: 1.8,
          hue: 286,
          motion: "sway",
        },
        {
          art: "alice",
          x: -65,
          y: 106,
          size: 78,
          at: 2.5,
          hue: 205,
          motion: "shrink",
        },
      ],
    },
    {
      title: "月下的微笑",
      short: "微笑",
      duration: 12,
      hue: 281,
      lines: [
        [0, "树梢亮起一双眼睛，柴郡猫从星屑里现身。"],
        [4, "“路会通向哪里？”她问。猫笑得像一弯月亮。"],
        [8, "身影渐渐消失，夜空里，只剩下那道微笑。"],
      ],
      actors: [
        {
          art: "cat",
          x: 30,
          y: -35,
          size: 175,
          at: 0.2,
          hue: 284,
          motion: "cat",
        },
        {
          art: "alice",
          x: -300,
          y: 115,
          size: 82,
          at: 1.4,
          hue: 204,
          motion: "sway",
        },
      ],
    },
    {
      title: "没有终点的茶会",
      short: "茶会",
      duration: 13,
      hue: 34,
      lines: [
        [0, "下一站，是一场永远停在茶点时分的聚会。"],
        [4, "茶壶倒出银河，杯盏沿着星环轻轻起舞。"],
        [9, "她为自己斟了一杯，装着所有还没问出口的问题。"],
      ],
      actors: [
        {
          art: "pot",
          x: 0,
          y: -60,
          size: 123,
          at: 0.2,
          hue: 43,
          motion: "pour",
        },
        {
          art: "cup",
          x: -275,
          y: 80,
          size: 78,
          at: 1.2,
          hue: 203,
          motion: "tea",
        },
        {
          art: "cup",
          x: 255,
          y: 100,
          size: 70,
          at: 2.2,
          hue: 328,
          motion: "tea",
        },
        {
          art: "watch",
          x: 310,
          y: -115,
          size: 52,
          at: 3,
          hue: 45,
          motion: "pendulum",
        },
      ],
    },
    {
      title: "红心风暴",
      short: "红心",
      duration: 14,
      hue: 350,
      lines: [
        [0, "红心王冠燃起，纸牌卫兵卷起一场风暴。"],
        [4, "纸牌越飞越近，几乎要冲出这片夜空。"],
        [9, "爱丽丝站直了：“你们，不过是一副纸牌！”"],
      ],
      actors: [
        {
          art: "crown",
          x: 0,
          y: -105,
          size: 128,
          at: 0.1,
          hue: 350,
          motion: "sway",
        },
        {
          art: "alice",
          x: 0,
          y: 110,
          size: 91,
          at: 1.5,
          hue: 204,
          motion: "stand",
        },
        ...Array.from({ length: 8 }, (_, i) => ({
          art: "card",
          x: (i % 2 ? -1 : 1) * (195 + Math.floor(i / 2) * 40),
          y: -80 + Math.floor(i / 2) * 64,
          size: 39,
          at: 2 + i * 0.36,
          hue: i % 2 ? 350 : 43,
          motion: "card",
          rank: i,
        })),
      ],
    },
    {
      title: "梦醒，星光仍在",
      short: "梦醒",
      duration: 15,
      hue: 43,
      lines: [
        [0, "风暴散开，纸牌化成了漫天的光翼。"],
        [4, "爱丽丝睁开眼睛，仙境却没有完全离开。"],
        [9, "那份敢于出发的好奇心，会陪她走向下一场奇遇。"],
      ],
      actors: [
        {
          art: "door",
          x: 0,
          y: -28,
          size: 178,
          at: 0.1,
          hue: 43,
          motion: "door",
        },
        {
          art: "alice",
          x: 0,
          y: 55,
          size: 112,
          at: 1.7,
          hue: 204,
          motion: "awake",
        },
        {
          art: "flower",
          x: -285,
          y: 87,
          size: 80,
          at: 3.3,
          hue: 328,
          motion: "sway",
        },
        {
          art: "flower",
          x: 285,
          y: 87,
          size: 80,
          at: 3.9,
          hue: 149,
          motion: "sway",
        },
      ],
    },
  ];
  const storyDuration = storyActs.reduce((sum, act) => sum + act.duration, 0);
  const immersiveStoryActs = storyActs.map((act, i) => ({
    ...act,
    title: [
      "追光而行",
      "穿越兔子洞",
      "巨花之间",
      "微笑的另一面",
      "星轨茶会",
      "纸牌越过银幕",
      "穿过梦的门",
    ][i],
    lines: [
      [
        [0, "白兔回头向你招手。轻点夜空，唤醒一群光蝶。"],
        [4, "怀表滴答，耳朵一抖：快跟上，仙境要开门了。"],
        [9, "跟上它，向好奇心出发。"],
      ],
      [
        [0, "兔子洞打开了。我们正穿过一层又一层星环。"],
        [4, "钥匙、门和爱丽丝，在不同的远近中缓缓飞过。"],
        [9, "别回头，最亮的地方还在前面。"],
      ],
      [
        [0, "花朵伸了个懒腰，蝶群从花心里飞了出来。"],
        [4, "轻点一下，花瓣会朝你舒展。连蘑菇也在呼吸。"],
        [9, "原来，换个角度，世界会重新绽放。"],
      ],
      [
        [0, "先是一双眼睛，然后，一道藏不住的微笑。"],
        [4, "柴郡猫歪了歪头：你在看我，还是我在看你？"],
        [8, "轻点夜空，和它眨眨眼。微笑会留到最后。"],
      ],
      [
        [0, "茶会漂浮在星轨上。杯盏从远处绕到身前。"],
        [4, "茶壶倾下银河，怀表在另一条轨道上慢慢旋转。"],
        [9, "时间仿佛停住了，星光却还在流淌。"],
      ],
      [
        [0, "红心王冠升起。纸牌从仙境深处向我们飞来。"],
        [4, "有的从远处旋转，有的已经掠过身侧。"],
        [9, "爱丽丝迎着风暴站起：勇气，比梦更真实。"],
      ],
      [
        [0, "纸牌化成光蝶，梦的门缓缓打开。"],
        [4, "先安静一瞬。听，整座仙境正在一起呼吸。"],
        [9, "现在，让心里的星河，盛放给整个宇宙。"],
      ],
    ][i],
    actors: act.actors.map((cue) => ({ ...cue })),
  }));
  immersiveStoryActs[6].actors.push({
    art: "heart",
    x: 0,
    y: 0,
    size: 130,
    at: 7.2,
    hue: 43,
    motion: "heart",
  });
  const storyActStart = (index, script = story?.script ?? storyActs) =>
    script.slice(0, index).reduce((sum, act) => sum + act.duration, 0);
  function storyLayout() {
    const compact = w < 700,
      top = h < 540 ? 128 : 196,
      bottom = h - (h < 540 ? 108 : 190),
      height = Math.max(130, bottom - top);
    const scale = Math.min((w - 38) / (compact ? 650 : 1000), height / 460);
    return {
      cx: w * 0.5,
      cy: (top + bottom) * 0.5 - 22 * scale,
      scale,
      compact,
    };
  }
  function storyActorPose(actor, t, layout) {
    let x = actor.x * (layout.compact ? 0.6 : 1),
      y = actor.y,
      rotation = 0,
      size = 1,
      z = 0;
    const n = Math.max(0, t - actor.at - 1.1),
      rank = actor.rank || 0;
    switch (actor.motion) {
      case "follow":
        x += Math.min(n * 9, 70);
        rotation = Math.sin(n * 2) * 0.035;
        break;
      case "hop":
        x += Math.sin(n * 0.65) * 32;
        y -= Math.abs(Math.sin(n * 2.3)) * 19;
        rotation = Math.sin(n * 2.3) * 0.04;
        break;
      case "pendulum":
        rotation = Math.sin(n * 0.8) * 0.22;
        y += Math.sin(n * 0.9) * 6;
        break;
      case "fall":
        x += Math.sin(n * 0.8) * 58;
        y = -145 + clamp(n / 8, 0, 1) * 270;
        rotation = Math.sin(n * 0.7) * 0.55 + 0.28;
        size = 0.8;
        z = Math.sin(n * 0.4) * 0.15;
        break;
      case "float":
        y += Math.sin(n * 0.9 + actor.x) * 25;
        rotation = Math.sin(n * 0.5) * 0.28;
        z = 0.3 + Math.sin(n * 0.4) * 0.12;
        break;
      case "sway":
        rotation = Math.sin(n * 0.8 + actor.x) * 0.055;
        break;
      case "shrink":
        size = 1 - clamp(n / 5, 0, 1) * 0.35;
        y += clamp(n / 5, 0, 1) * 20;
        break;
      case "cat":
        y += Math.sin(n * 0.6) * 8;
        break;
      case "pour":
        rotation = -0.16 - Math.sin(n * 0.8) * 0.13;
        y += Math.sin(n * 0.6) * 5;
        break;
      case "tea": {
        const angle = n * 0.4 + (actor.x < 0 ? Math.PI : 0);
        x = Math.cos(angle) * 260 * (layout.compact ? 0.6 : 1);
        y = 80 + Math.sin(angle) * 45;
        z = Math.sin(angle) * 0.2;
        rotation = Math.sin(n * 0.8) * 0.09;
        break;
      }
      case "card": {
        const fly = clamp((n - 1.4) / 6, 0, 1);
        x += (actor.x < 0 ? -1 : 1) * fly * (layout.compact ? 70 : 120);
        y += Math.sin(n + rank) * 22 + fly * 60;
        rotation =
          Math.sin(n * 0.8 + rank) * 0.34 + fly * (rank % 2 ? 1 : -1) * 0.65;
        z = 0.3 - fly * 0.85;
        break;
      }
      case "stand":
        size = 0.8 + clamp(n / 7, 0, 1) * 0.35;
        break;
      case "door":
        size = 1 + Math.sin(n * 0.3) * 0.03;
        break;
      case "awake":
        y += Math.sin(n * 0.6) * 2;
        break;
    }
    if (reduced.matches) {
      rotation *= 0.25;
      z = 0;
    }
    const depth = state.view === "3d" ? 1 / (1 + z * 0.7) : 1;
    return {
      x: layout.cx + x * layout.scale * depth,
      y: layout.cy + y * layout.scale * depth,
      rotation,
      scale: layout.scale * size * depth,
      depth,
    };
  }
  function makeStoryActor(cue) {
    const points = storyArt[cue.art],
      span = cue.size * 2.85,
      layers = new Map(),
      motes = [];
    const count = Math.min(
        points.length,
        Math.round(580 * Math.min(quality(), 1)),
      ),
      stride = points.length / count;
    for (let i = 0; i < count; i++) {
      const point = points[Math.floor(i * stride)],
        x = point.x * cue.size,
        y = point.y * cue.size;
      if (!layers.has(point.part)) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = Math.ceil(span * 1.5);
        const c = canvas.getContext("2d");
        c.setTransform(1.5, 0, 0, 1.5, span * 0.75, span * 0.75);
        layers.set(point.part, { canvas, c });
      }
      const layer = layers.get(point.part),
        c = layer.c,
        hue =
          cue.hue + (story.rainbow ? (i / count) * 100 - 50 : Math.sin(i) * 8),
        accent = i % 7 === 0,
        type = accent
          ? story.effect === "mix"
            ? materialTypes[Math.floor(i / 7) % 5]
            : story.effect
          : "gold",
        size = type === "gold" ? 7.5 : type === "star" ? 10 : 13;
      const m = {
        x,
        y,
        hue: story.rainbow && accent ? cue.hue + i * 137.5 : hue,
        type,
        size,
        part: point.part,
        seed: i * 2.39996,
        variant: i % 3,
      };
      motes.push(m);
      c.globalCompositeOperation =
        type === "petal" || type === "butterfly" ? "source-over" : "lighter";
      c.globalAlpha = type === "gold" ? 0.88 : 0.9;
      c.drawImage(
        sprite(m.hue, type, m.variant),
        x - size / 2,
        y - size / 2,
        size,
        size,
      );
      if (type === "gold") {
        c.fillStyle = "#fff4d7";
        c.globalAlpha = 0.9;
        c.fillRect(x - 0.65, y - 0.65, 1.3, 1.3);
      }
    }
    return { ...cue, motes, layers, span, flight: 1.1 };
  }
  function syncStoryUI(force = false) {
    if (!story) return;
    const s = story,
      act = s.script[s.act],
      local = s.age - storyActStart(s.act),
      seconds = Math.floor(s.age),
      fmt = (n) =>
        String(Math.floor(n / 60)).padStart(2, "0") +
        ":" +
        String(n % 60).padStart(2, "0");
    if (!force && s.uiAt !== null && s.age - s.uiAt < 0.12) return;
    s.uiAt = s.age;
    $("storyTime").textContent = fmt(seconds) + " / " + fmt(storyDuration);
    $("storyActTitle").textContent = s.finished ? "星火谢幕" : act.title;
    $("storyActCount").textContent = s.finished
      ? "七幕已完 · 愿好奇心永不散场"
      : `第${["一", "二", "三", "四", "五", "六", "七"][s.act]}幕 / 七幕`;
    $("storyHud").style.setProperty("--story-ink", `hsl(${act.hue},62%,77%)`);
    $("storyHud").setAttribute("data-ended", String(s.finished));
    $("storyEndTitle").hidden = !s.finished;
    $("storyReplayBtn").hidden = !s.finished;
    $("storyPauseBtn").setAttribute("aria-pressed", String(state.paused));
    $("storyPauseBtn").textContent = state.paused ? "继续" : "暂停";
    $("storyPauseBtn").disabled = s.finished;
    $("storyNextBtn").disabled = s.finished || s.act === storyActs.length - 1;
    $("storySoundBtn").textContent = state.sound
      ? "音效已开 · 点击静音"
      : "音效关闭 · 点击开启";
    $("storyKicker").textContent =
      s.variant === "immersive"
        ? "3D FIREWORK TALES · 爱丽丝 · 星境穿行"
        : "FIREWORK TALES · 爱丽丝梦游仙境";
    $("storyHud").setAttribute(
      "aria-label",
      s.variant === "immersive"
        ? "爱丽丝 3D 临境烟火短剧"
        : "爱丽丝经典烟火童话",
    );
    $("storyGestureHint").textContent =
      s.variant === "immersive"
        ? w < 700
          ? "轻点唤蝶 · Esc 退出"
          : "轻点 / Enter 唤醒光蝶 · 移动观景 · Esc 退出"
        : "空格 暂停 · Esc 退出";
    const line = s.finished
      ? "演出已谢幕。把这场梦，留给下一次抬头。"
      : act.lines.filter(([at]) => at <= local).at(-1)[1];
    if (s.caption !== line) {
      s.caption = line;
      $("storyCaption").textContent = line;
      canvas.setAttribute("aria-label", act.title + "。" + line);
    }
    document.querySelectorAll("[data-story-act]").forEach((button, i) => {
      button.setAttribute("aria-current", String(i === s.act));
      button.setAttribute("aria-label", `第${i + 1}幕：${s.script[i].title}`);
      button.style.setProperty(
        "--fill",
        `${clamp((s.age - storyActStart(i)) / s.script[i].duration, 0, 1) * 100}%`,
      );
    });
  }
  function enterStoryAct(index) {
    const s = story;
    s.act = index;
    s.actors = s.script[index].actors.map(
      s.variant === "immersive" ? makeImmersiveActor : makeStoryActor,
    );
    s.sparks = [];
    s.magic = [];
    s.lastMagic = -10;
    s.lastLocal = -0.01;
    s.accentAt = 1.8;
    s.uiAt = null;
    particles.forEach((p) => (p.life = Math.min(p.life, 0.45)));
    flashes = [];
    depthDirty = true;
    syncStoryUI(true);
  }
  function startAliceStory(variant = "classic") {
    variant = variant === "immersive" ? "immersive" : "classic";
    if (variant === "immersive")
      try {
        initImmersiveRenderer();
      } catch (error) {
        console.error(error);
        notify("3D 舞台暂时无法开启，请稍后重试，或先观看经典版。");
        return;
      }
    const previous = story?.previous ?? {
      paused: state.paused,
      immersed: state.immersed,
    };
    if (wish || textCloud) finishWishShow(true);
    if (cameraState !== "off") stopCamera();
    if (state.immersed) setImmersed(false);
    if (state.paused) togglePause();
    initAudio();
    closePanels();
    clearTimeout(notify.timer);
    $("toast").hidden = true;
    particles = [];
    rockets = [];
    ordinaryComets = [];
    pending = [];
    meteors = [];
    skyPaths = [];
    flashes = [];
    pointer = null;
    specialCaption = null;
    specialUntil = 0;
    const rng = seeded(620925);
    story = {
      variant,
      script: variant === "immersive" ? immersiveStoryActs : storyActs,
      age: 0,
      act: 0,
      actors: [],
      sparks: [],
      stars:
        variant === "immersive"
          ? Array.from({ length: 1500 }, () => ({
              x: (rng() - 0.5) * 7400,
              y: (rng() - 0.5) * 4000,
              z: 1400 - rng() * 11000,
              size: 4 + rng() * 10,
              seed: rng() * TAU,
            }))
          : [],
      effect: state.effect,
      rainbow: state.palette === "rainbow",
      curved: state.curved,
      previous,
      finished: false,
      caption: "",
      uiAt: null,
    };
    audioController.accentUntil = 0;
    syncPerformanceScore();
    alignProgrammeScore();
    document.body.classList.toggle("story-mode", true);
    document.body.classList.toggle("story-immersive", variant === "immersive");
    $("storyDepthStage").hidden = variant !== "immersive";
    $("storyHud").hidden = false;
    enterStoryAct(0);
    $("storyHud").focus();
  }
  function stopAliceStory() {
    if (story) stopSoundVoices();
    if (!story) return;
    const previous = story.previous;
    story = null;
    particles = [];
    rockets = [];
    ordinaryComets = [];
    pending = [];
    meteors = [];
    flashes = [];
    skyPaths = [];
    pointer = null;
    $("storyHud").hidden = true;
    $("storyDepthStage").hidden = true;
    document.body.classList.toggle("story-mode", false);
    document.body.classList.toggle("story-immersive", false);
    if (state.paused !== previous.paused) togglePause();
    if (previous.immersed) setImmersed(true);
    else $("settingsBtn").focus();
    canvas.setAttribute(
      "aria-label",
      "互动烟花夜空。轻点发射、长按蓄力、拖动绘星河；空格暂停，F 齐放，T 慢镜，H 隐藏控制。",
    );
    nextAuto = clock + 1.2;
    depthDirty = true;
    updateCaption();
    syncPerformanceScore();
  }
  function seekStoryAct(index) {
    if (
      !story ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= storyActs.length
    )
      return;
    story.age = storyActStart(index);
    story.finished = false;
    particles = [];
    flashes = [];
    stopSoundVoices();
    enterStoryAct(index);
    syncPerformanceScore();
    alignProgrammeScore();
  }
  function advanceStory(dt) {
    const s = story;
    if (!s || s.finished) return;
    s.age = Math.min(storyDuration, s.age + dt);
    let index = 0,
      end = s.script[0].duration;
    while (s.age >= end && index < s.script.length - 1)
      end += s.script[++index].duration;
    if (index !== s.act) enterStoryAct(index);
    const act = s.script[s.act],
      local = s.age - storyActStart(s.act),
      layout = storyLayout();
    if (s.variant === "immersive") advanceImmersiveStory(dt, local, act);
    else {
      for (const actor of s.actors) {
        if (s.lastLocal < actor.at && local >= actor.at)
          storyActorSound(actor, clamp(actor.x / 1000 + 0.5, 0, 1));
        const impact = actor.at + actor.flight;
        if (s.lastLocal < impact && local >= impact) {
          const pose = storyActorPose(actor, local, layout);
          burst(pose.x, pose.y, actor.hue, "gold", 0.18, "sphere", {
            flat: true,
            density: 0.28,
            noEcho: true,
            quiet: true,
          });
          storyActorSound(actor, pose.x / w, true);
        }
      }
      if (local >= s.accentAt && local < act.duration - 1.2) {
        const side = Math.floor(s.accentAt) % 2,
          x = w * (side ? 0.83 : 0.17),
          y =
            layout.cy +
            (Math.sin(s.accentAt) * 0.2 - 0.25) * 180 * layout.scale;
        burst(
          x,
          y,
          act.hue + (s.rainbow ? s.accentAt * 37 : 0),
          s.act === 6 ? "butterfly" : s.effect,
          s.act === 5 ? 0.3 : 0.24,
          "sphere",
          { flat: true, density: 0.45, noEcho: true, quiet: true },
        );
        s.accentAt = local + (s.act === 5 ? 1.15 : 2.1);
      }
      if (s.act === 6)
        for (const at of [5.3, 9.5])
          if (s.lastLocal < at && local >= at) {
            for (const side of [-1, 1]) {
              const x = layout.cx + side * Math.min(w * 0.34, 390),
                y = layout.cy - 70 * layout.scale;
              burst(
                x,
                y,
                43 + (s.rainbow ? (side + 1) * 90 + at * 20 : 0),
                s.effect,
                0.72,
                "sphere",
                { flat: true, density: 0.62, noEcho: true, quiet: true },
              );
              boom(x / w, 0.7);
            }
          }
    }
    s.lastLocal = local;
    if (s.age >= storyDuration) {
      s.finished = true;
      syncStoryUI(true);
      $("storyReplayBtn").focus();
    } else syncStoryUI();
  }
  function drawStoryFlight(actor, local, layout, pose) {
    const t = clamp((local - actor.at) / actor.flight, 0, 1),
      u = 1 - (1 - t) ** 2,
      sx = layout.cx + (actor.x < 0 ? -1 : 1) * Math.min(w * 0.3, 290),
      sy = Math.min(h - 130, horizon + 35),
      bend = story.curved
        ? Math.sin(t * Math.PI) * (actor.x < 0 ? 50 : -50)
        : 0;
    const point = (q) => ({
      x:
        sx +
        (pose.x - sx) * q +
        (story.curved ? Math.sin(q * Math.PI) * bend : 0),
      y: sy + (pose.y - sy) * q,
    });
    const end = point(u);
    fx.globalCompositeOperation = "lighter";
    fx.globalAlpha = 0.8;
    fx.strokeStyle = `hsla(${actor.hue},85%,78%,.55)`;
    fx.lineWidth = 1;
    fx.beginPath();
    for (let j = 0; j < 9; j++) {
      const p = point(Math.max(0, u - j * 0.018));
      if (j === 0) fx.moveTo(p.x, p.y);
      else fx.lineTo(p.x, p.y);
    }
    fx.stroke();
    fx.drawImage(sprite(actor.hue, "gold"), end.x - 10, end.y - 10, 20, 20);
    fx.fillStyle = "#fff5df";
    fx.beginPath();
    fx.arc(end.x, end.y, 1.4 + t * 0.8, 0, TAU);
    fx.fill();
  }
  function storyPartAlpha(actor, part, local) {
    if (actor.art !== "cat" || part === "smile") return 1;
    return clamp(
      ((part === "eyes" ? 8.8 : 7.9) - local) / (part === "eyes" ? 1.2 : 1.7),
      0,
      1,
    );
  }
  function drawStoryActor(actor, local, act, layout) {
    if (local < actor.at) return;
    const pose = storyActorPose(actor, local, layout),
      age = local - actor.at - actor.flight;
    if (age < 0) {
      drawStoryFlight(actor, local, layout, pose);
      return;
    }
    const form = clamp(age / 1.05, 0, 1),
      open = 1 - (1 - form) ** 3,
      exit = actor.art === "cat" ? 0.6 : 1.15,
      scatter =
        story.act === storyActs.length - 1
          ? 0
          : clamp((local - act.duration + exit) / exit, 0, 1),
      fade = 1 - scatter;
    fx.save();
    fx.translate(pose.x, pose.y);
    fx.rotate(pose.rotation);
    fx.scale(pose.scale, pose.scale);
    if (form >= 1 && scatter === 0) {
      for (const [part, layer] of actor.layers) {
        fx.globalCompositeOperation = "lighter";
        fx.globalAlpha =
          storyPartAlpha(actor, part, local) *
          (0.88 + 0.05 * Math.sin(age * 1.3));
        fx.drawImage(
          layer.canvas,
          -actor.span / 2,
          -actor.span / 2,
          actor.span,
          actor.span,
        );
      }
      for (let i = 0; i < actor.motes.length; i += 11) {
        const m = actor.motes[i],
          a = storyPartAlpha(actor, m.part, local);
        fx.globalAlpha = a * (0.3 + 0.6 * Math.sin(age * 2 + m.seed) ** 2);
        fx.globalCompositeOperation =
          m.type === "petal" || m.type === "butterfly"
            ? "source-over"
            : "lighter";
        const pulse = 0.9 + 0.5 * Math.sin(age * 2 + m.seed) ** 2;
        fx.drawImage(
          sprite(m.hue, m.type, m.variant),
          m.x - (m.size * pulse) / 2,
          m.y - (m.size * pulse) / 2,
          m.size * pulse,
          m.size * pulse,
        );
      }
      for (let i = 0; i < actor.motes.length; i += 23) {
        const m = actor.motes[i],
          burn = (age * 0.65 + m.seed) % 1,
          alpha =
            storyPartAlpha(actor, m.part, local) *
            Math.sin(burn * Math.PI) *
            0.65;
        fx.globalCompositeOperation = "lighter";
        fx.globalAlpha = alpha;
        const x = m.x + Math.sin(m.seed) * burn * 7,
          y = m.y + burn * burn * 26;
        fx.drawImage(sprite(m.hue, "gold"), x - 3, y - 3, 6, 6);
      }
    } else {
      for (let i = 0; i < actor.motes.length; i++) {
        const m = actor.motes[i],
          a = storyPartAlpha(actor, m.part, local),
          spread = scatter * scatter * 80,
          dx = m.x * open + Math.cos(m.seed) * ((1 - form) * 9 + spread),
          dy =
            m.y * open +
            Math.sin(m.seed) * ((1 - form) * 9 + spread) +
            scatter * scatter * 25,
          size = m.size * (0.8 + 0.2 * open);
        fx.globalAlpha =
          a * fade * (0.6 + 0.4 * Math.sin(m.seed + age * 3) ** 2);
        fx.globalCompositeOperation =
          m.type === "petal" || m.type === "butterfly"
            ? "source-over"
            : "lighter";
        fx.drawImage(
          sprite(m.hue, m.type, m.variant),
          dx - size / 2,
          dy - size / 2,
          size,
          size,
        );
      }
    }
    fx.restore();
  }
  function drawStoryTunnel(local, layout) {
    const cx = layout.cx,
      cy = layout.cy - 15;
    fx.globalCompositeOperation = "lighter";
    for (let ring = 0; ring < 11; ring++) {
      const q = (ring / 11 + local * (reduced.matches ? 0.018 : 0.062)) % 1,
        r = (20 + q * q * 550) * layout.scale,
        alpha = clamp(q * 2.1, 0, 1) * (1 - q * 0.5);
      for (let j = 0; j < 62; j++) {
        const angle = (j / 62) * TAU + local * 0.12,
          color = 190 + ring * 11,
          size = 6 + q * 9;
        fx.globalAlpha = alpha * (0.75 + 0.25 * Math.sin(j + local) ** 2);
        const x = cx + Math.cos(angle) * r,
          y = cy + Math.sin(angle) * r * 0.63;
        fx.drawImage(
          sprite(color, "gold"),
          x - size / 2,
          y - size / 2,
          size,
          size,
        );
        fx.fillStyle = `hsl(${color},65%,86%)`;
        fx.fillRect(x - 0.55, y - 0.55, 1.1, 1.1);
      }
    }
  }
  function drawStorySteam(local, layout) {
    fx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * TAU,
        x =
          layout.cx +
          Math.cos(angle) * 260 * layout.scale * (layout.compact ? 0.6 : 1),
        y = layout.cy + (80 + Math.sin(angle) * 45) * layout.scale;
      fx.globalAlpha = 0.45;
      fx.drawImage(sprite(43 + i, "gold"), x - 3, y - 3, 6, 6);
    }
    fx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 36; i++) {
      const t = (i / 36 + local * 0.15) % 1,
        x = layout.cx + Math.sin(t * 8 + local) * 35 * layout.scale,
        y = layout.cy - (75 + t * 135) * layout.scale;
      fx.globalAlpha = Math.sin(t * Math.PI) * 0.65;
      fx.drawImage(sprite(43 + i * 3, "star"), x - 3, y - 3, 6, 6);
    }
    // Tea pours as a shower of individual light beads into the waiting cup.
    for (let i = 0; i < 34; i++) {
      const t = (i / 34 + local * 0.28) % 1,
        x = layout.cx - (90 + t * 170) * layout.scale,
        y = layout.cy + (-70 + t * t * 150) * layout.scale;
      fx.globalAlpha = Math.sin(t * Math.PI) * 0.75;
      fx.drawImage(sprite(43 + i * 4, "gold"), x - 3, y - 3, 6, 6);
    }
  }
  function drawStoryScene() {
    if (!story) return;
    if (story.variant === "immersive") {
      renderImmersiveStory();
      return;
    }
    const act = storyActs[story.act],
      local = story.age - storyActStart(story.act),
      layout = storyLayout(),
      glow = fx.createRadialGradient(
        layout.cx,
        layout.cy,
        0,
        layout.cx,
        layout.cy,
        Math.max(w * 0.44, 200),
      );
    glow.addColorStop(0, `hsla(${act.hue},75%,38%,.07)`);
    glow.addColorStop(1, `hsla(${act.hue},75%,20%,0)`);
    fx.globalCompositeOperation = "source-over";
    fx.globalAlpha = 1;
    fx.fillStyle = glow;
    fx.fillRect(0, 0, w, h);
    if (story.act === 1) drawStoryTunnel(local, layout);
    if (story.act === 4 && local > 2) drawStorySteam(local, layout);
    if (story.act === 6) {
      for (let i = 0; i < 30; i++) {
        const t = local * 0.18 + i * 2.39996,
          x = layout.cx + Math.sin(t * 0.7) * (180 + i * 6) * layout.scale,
          y = layout.cy + Math.cos(t * 0.45 + i) * (80 + i * 3) * layout.scale,
          wing = 0.25 + 0.75 * Math.abs(Math.sin(t * 3));
        fx.globalCompositeOperation = "source-over";
        fx.globalAlpha = clamp(local / 4, 0, 0.75);
        fx.save();
        fx.translate(x, y);
        fx.scale(wing, 1);
        fx.drawImage(sprite(43 + i * 12, "butterfly", i % 3), -7, -7, 14, 14);
        fx.restore();
      }
    }
    const actors = story.actors
      .map((actor) => ({
        actor,
        depth: storyActorPose(actor, local, layout).depth,
      }))
      .sort((a, b) => a.depth - b.depth);
    for (const { actor } of actors) drawStoryActor(actor, local, act, layout);
    fx.globalAlpha = 1;
    fx.globalCompositeOperation = "lighter";
  }
  // Volumetric point sculptures and a perspective camera for the separate immersive production.
  let immersiveRenderer = null;
  const immersiveModels = new Map(),
    immersiveMaxPoints = 16000,
    immersiveStride = 9;
  const immersiveColor = Array.from({ length: 360 }, (_, i) => {
    const h = i / 60,
      x = 1 - Math.abs((h % 2) - 1),
      c =
        h < 1
          ? [1, x, 0]
          : h < 2
            ? [x, 1, 0]
            : h < 3
              ? [0, 1, x]
              : h < 4
                ? [0, x, 1]
                : h < 5
                  ? [x, 0, 1]
                  : [1, 0, x];
    return c.map((v) => 0.32 + v * 0.68);
  });
  function makeImmersiveModel(name) {
    if (immersiveModels.has(name)) return immersiveModels.get(name);
    const points = [];
    const add = (x, y, z, nx = 0, ny = 0, nz = 1, part = "body", hue = 0) =>
      points.push({
        x,
        y,
        z,
        nx,
        ny,
        nz,
        part,
        hue,
        seed: points.length * 2.39996,
      });
    function ellipsoid(
      cx,
      cy,
      cz,
      rx,
      ry,
      rz,
      rows = 12,
      cols = 25,
      part = "body",
      tint = 0,
    ) {
      for (let a = 1; a < rows; a++)
        for (let b = 0; b < cols; b++) {
          const p = (a / rows) * Math.PI,
            q = ((b + (a % 2) * 0.5) / cols) * TAU,
            nx = Math.sin(p) * Math.cos(q),
            ny = Math.cos(p),
            nz = Math.sin(p) * Math.sin(q);
          add(cx + rx * nx, cy + ry * ny, cz + rz * nz, nx, ny, nz, part, tint);
        }
    }
    function line(fn, n = 50, part = "body", tint = 0) {
      for (let i = 0; i <= n; i++) {
        const p = fn(i / n);
        add(p.x, p.y, p.z, 0, 0, 1, part, tint);
      }
    }
    function torus(
      cx,
      cy,
      cz,
      r,
      tube = 0.04,
      part = "body",
      tint = 0,
      turn = 0,
    ) {
      for (let i = 0; i < 64; i++)
        for (let j = 0; j < 5; j++) {
          const a = (i / 64) * TAU,
            b = (j / 5) * TAU,
            rr = r + Math.cos(b) * tube,
            x = Math.cos(a) * rr,
            y = Math.sin(a) * rr,
            z = Math.sin(b) * tube;
          add(
            cx + x,
            cy + y * Math.cos(turn) - z * Math.sin(turn),
            cz + y * Math.sin(turn) + z * Math.cos(turn),
            Math.cos(a),
            Math.sin(a) * Math.cos(turn),
            Math.sin(a) * Math.sin(turn),
            part,
            tint,
          );
        }
    }
    function tube(fn, radius, steps = 25, sides = 10, part = "body", tint = 0) {
      for (let i = 0; i <= steps; i++) {
        const t = i / steps,
          p = fn(t),
          p0 = fn(Math.max(0, t - 0.005)),
          p1 = fn(Math.min(1, t + 0.005)),
          dx = p1.x - p0.x,
          dy = p1.y - p0.y,
          dz = p1.z - p0.z,
          len = Math.hypot(dx, dy, dz) || 1,
          tx = dx / len,
          ty = dy / len,
          tz = dz / len;
        let bx = -ty,
          by = tx,
          bz = 0,
          bl = Math.hypot(bx, by);
        if (bl < 0.01) {
          bx = 1;
          by = 0;
          bl = 1;
        }
        bx /= bl;
        by /= bl;
        const nx = -tz * by,
          ny = tz * bx,
          nz = tx * by - ty * bx,
          r = typeof radius === "function" ? radius(t) : radius;
        for (let j = 0; j < sides; j++) {
          const a = (j / sides) * TAU,
            ux = bx * Math.cos(a) + nx * Math.sin(a),
            uy = by * Math.cos(a) + ny * Math.sin(a),
            uz = bz * Math.cos(a) + nz * Math.sin(a);
          add(p.x + r * ux, p.y + r * uy, p.z + r * uz, ux, uy, uz, part, tint);
        }
      }
    }
    function cone(y0, y1, r0, r1, part = "body", tint = 0, rows = 16) {
      for (let i = 0; i <= rows; i++)
        for (let j = 0; j < 32; j++) {
          const t = i / rows,
            a = ((j + (i % 2) * 0.5) / 32) * TAU,
            r = r0 + (r1 - r0) * t;
          add(
            Math.cos(a) * r,
            y0 + (y1 - y0) * t,
            Math.sin(a) * r,
            Math.cos(a),
            0.25,
            Math.sin(a),
            part,
            tint,
          );
        }
    }
    function extrude(art, depth = 0.12) {
      for (const p of storyArt[art])
        for (const z of [-depth, depth])
          add(p.x, -p.y, z, 0, 0, z > 0 ? 1 : -1, p.part, 0);
    }
    if (name === "rabbit") {
      ellipsoid(0, -0.38, 0, 0.46, 0.59, 0.36, 16, 30);
      ellipsoid(0, 0.36, 0.08, 0.39, 0.38, 0.34, 15, 30, "head");
      for (const sign of [-1, 1]) {
        const ear = sign < 0 ? "earL" : "earR";
        ellipsoid(sign * 0.2, 1, 0.02, 0.12, 0.48, 0.1, 11, 15, ear);
        ellipsoid(sign * 0.2, 1, 0.115, 0.065, 0.33, 0.018, 8, 11, ear, 310);
        ellipsoid(
          sign * 0.29,
          -0.91,
          0.16,
          0.28,
          0.13,
          0.24,
          8,
          15,
          sign < 0 ? "footL" : "footR",
        );
        ellipsoid(
          sign * 0.15,
          0.4,
          0.382,
          0.04,
          0.065,
          0.03,
          6,
          9,
          "eyes",
          165,
        );
        ellipsoid(
          sign * 0.5,
          -0.38,
          0.03,
          0.13,
          0.3,
          0.14,
          8,
          13,
          sign < 0 ? "pawL" : "pawR",
        );
        for (const yy of [0.12, 0.22])
          line(
            (t) => ({
              x: sign * (0.13 + t * 0.5),
              y: yy + t * (yy - 0.16),
              z: 0.36 + t * 0.04,
            }),
            17,
            "head",
          );
      }
      ellipsoid(0, 0.21, 0.422, 0.06, 0.04, 0.04, 5, 10, "head", 315);
      ellipsoid(0, -0.3, 0.35, 0.29, 0.38, 0.035, 10, 22, "body", 205);
    } else if (name === "alice") {
      cone(-0.67, 0.06, 0.61, 0.2, "body", 205, 15);
      ellipsoid(0, 0.28, 0, 0.25, 0.33, 0.19, 12, 24, "body", 203);
      ellipsoid(0, 0.84, 0.03, 0.24, 0.28, 0.22, 12, 24, "body", 35);
      ellipsoid(0, 0.89, -0.12, 0.29, 0.33, 0.19, 12, 22, "body", 30);
      for (const sign of [-1, 1]) {
        tube(
          (t) => ({
            x: sign * (0.2 + t * 0.48),
            y: 0.43 - t * 0.23 + Math.sin(t * Math.PI) * 0.1,
            z: 0.08 + t * 0.1,
          }),
          0.07,
          13,
          8,
          "body",
          204,
        );
        tube(
          (t) => ({ x: sign * 0.19, y: -0.65 - t * 0.43, z: 0.05 }),
          0.055,
          13,
          8,
          "body",
          40,
        );
        ellipsoid(
          sign * 0.22,
          -1.11,
          0.12,
          0.15,
          0.06,
          0.14,
          5,
          10,
          "body",
          207,
        );
      }
      for (let i = -1; i <= 1; i += 2)
        ellipsoid(i * 0.1, 0.88, 0.24, 0.025, 0.025, 0.016, 4, 8, "eyes", 200);
      tube(
        (t) => ({
          x: -0.28 + t * 0.56,
          y: 1.06 + Math.sin(t * Math.PI) * 0.1,
          z: 0.06,
        }),
        0.03,
        20,
        5,
        "body",
        205,
      );
    } else if (name === "flower") {
      tube(
        (t) => ({
          x: Math.sin(t * Math.PI) * 0.07,
          y: -1.05 + t * 1.3,
          z: Math.sin(t * 2) * 0.08,
        }),
        0.045,
        28,
        7,
        "body",
        145,
      );
      for (let k = 0; k < 7; k++)
        for (let a = 0; a < 12; a++)
          for (let b = 0; b < 7; b++) {
            const t = a / 11,
              ac = (k / 7) * TAU + (b / 6 - 0.5) * 0.62,
              r = 0.15 + Math.sin(t * Math.PI * 0.75) * 0.69;
            add(
              Math.cos(ac) * r,
              0.55 + Math.sin(ac) * r,
              0.12 + Math.sin(t * Math.PI) * 0.23 - 0.13 * t,
              Math.cos(ac) * 0.3,
              Math.sin(ac) * 0.3,
              1,
              "petals",
              k * 8,
            );
          }
      ellipsoid(0, 0.55, 0.18, 0.19, 0.19, 0.16, 9, 18, "body", 45);
      for (const sign of [-1, 1])
        for (let i = 0; i < 15; i++)
          for (let j = 0; j < 5; j++) {
            const t = i / 14,
              s = (j / 4 - 0.5) * 0.34 * Math.sin(t * Math.PI);
            add(
              sign * (t * 0.55),
              -0.45 + t * 0.25 + s,
              0.04 + Math.sin(t * Math.PI) * 0.12,
              0,
              0.5,
              1,
              "body",
              145,
            );
          }
    } else if (name === "mushroom") {
      for (let i = 0; i <= 14; i++)
        for (let j = 0; j < 40; j++) {
          const a = (i / 14) * Math.PI * 0.5,
            b = (j / 40) * TAU;
          add(
            Math.sin(a) * Math.cos(b),
            0.05 + Math.cos(a) * 0.78,
            Math.sin(a) * Math.sin(b) * 0.8,
            Math.sin(a) * Math.cos(b),
            Math.cos(a),
            Math.sin(a) * Math.sin(b),
            "body",
            290,
          );
        }
      tube(
        (t) => ({ x: Math.sin(t * 2) * 0.08, y: -1 + t * 1.05, z: 0 }),
        (t) => 0.2 - t * 0.06,
        20,
        13,
        "body",
        42,
      );
      for (const [x, y, z] of [
        [-0.45, 0.6, 0.3],
        [0.4, 0.62, 0.24],
        [0, 0.8, 0],
      ])
        ellipsoid(x, y, z, 0.15, 0.055, 0.12, 6, 12, "body", 45);
    } else if (name === "cat") {
      ellipsoid(0, 0.1, 0, 1, 0.75, 0.55, 20, 38, "body", 280);
      for (const sign of [-1, 1])
        tube(
          (t) => ({
            x: sign * (0.64 + t * 0.16),
            y: 0.62 + t * 0.59,
            z: -0.01,
          }),
          (t) => 0.25 * (1 - t) + 0.015,
          12,
          12,
          "body",
          285,
        );
      for (const sign of [-1, 1]) {
        torus(sign * 0.37, 0.3, 0.51, 0.19, 0.025, "eyes", 45);
        ellipsoid(
          sign * 0.37,
          0.3,
          0.57,
          0.025,
          0.13,
          0.035,
          9,
          8,
          "eyes",
          147,
        );
      }
      for (let k = 0; k < 2; k++)
        line(
          (t) => {
            const x = (t - 0.5) * 1.38;
            return {
              x,
              y: -0.17 - (1 - (x / 0.7) ** 2) * (k ? 0.34 : 0.1),
              z: 0.5 + 0.13 * (1 - (x / 0.8) ** 2),
            };
          },
          90,
          "smile",
          45,
        );
      for (let i = -4; i <= 4; i++)
        line(
          (t) => ({
            x: i * 0.13,
            y: -0.25 - t * (0.23 - Math.abs(i) * 0.025),
            z: 0.63,
          }),
          12,
          "smile",
          45,
        );
    } else if (name === "pot") {
      ellipsoid(0, 0, 0, 0.66, 0.68, 0.57, 17, 34, "body", 40);
      torus(0, 0.64, 0, 0.37, 0.045, "body", 45, Math.PI / 2);
      ellipsoid(0, 0.76, 0, 0.12, 0.08, 0.12, 7, 15, "body", 45);
      tube(
        (t) => ({ x: -0.48 - t * 0.72, y: 0.16 + t * 0.45, z: 0.1 }),
        (t) => 0.16 - t * 0.075,
        25,
        12,
        "body",
        43,
      );
      tube(
        (t) => ({
          x: 0.55 + Math.sin(t * Math.PI) * 0.55,
          y: 0.45 - Math.sin(t * Math.PI * 0.5) * 0.8,
          z: Math.sin(t * TAU) * 0.03,
        }),
        0.065,
        38,
        9,
        "body",
        43,
      );
    } else if (name === "cup") {
      cone(-0.52, 0.42, 0.42, 0.68, "body", 205, 14);
      torus(0, 0.42, 0, 0.68, 0.035, "body", 45, Math.PI / 2);
      torus(0, -0.62, 0, 0.88, 0.025, "body", 45, Math.PI / 2);
      tube(
        (t) => ({
          x: 0.58 + Math.sin(t * Math.PI) * 0.5,
          y: 0.25 - t * 0.65,
          z: 0,
        }),
        0.05,
        25,
        8,
        "body",
        45,
      );
    } else if (name === "watch") {
      torus(0, 0, 0, 0.77, 0.085, "body", 43);
      torus(0, 0, 0.095, 0.66, 0.02, "body", 45);
      torus(0, 0.91, 0, 0.14, 0.035, "body", 45);
      for (let j = 0; j < 12; j++) {
        const a = (j / 12) * TAU;
        line(
          (t) => ({
            x: Math.sin(a) * (0.51 + t * 0.09),
            y: Math.cos(a) * (0.51 + t * 0.09),
            z: 0.11,
          }),
          5,
          "body",
          45,
        );
      }
      line((t) => ({ x: 0, y: t * 0.43, z: 0.12 }), 20, "minute", 45);
      line((t) => ({ x: t * 0.31, y: -t * 0.14, z: 0.12 }), 18, "hour", 45);
    } else if (name === "door") {
      tube(
        (t) => {
          const a = t * Math.PI;
          return { x: Math.cos(a) * 0.6, y: 0.4 + Math.sin(a) * 0.65, z: 0 };
        },
        0.06,
        42,
        10,
        "body",
        45,
      );
      for (const sign of [-1, 1])
        tube(
          (t) => ({ x: sign * 0.6, y: -1 + t * 1.4, z: 0 }),
          0.065,
          30,
          9,
          "body",
          45,
        );
      line((t) => ({ x: -0.6 + t * 1.2, y: -1, z: 0 }), 45, "body", 45);
      torus(0.29, -0.1, 0.09, 0.06, 0.018, "body", 45);
    } else if (name === "heart") {
      const outline = storyArt.heart;
      for (let k = -8; k <= 8; k++) {
        const z = (k / 8) * 0.48,
          r = Math.sqrt(Math.max(0, 1 - (z / 0.5) ** 2));
        for (let i = 0; i < outline.length; i += 2) {
          const p = outline[i];
          add(p.x * r, -p.y * r, z, p.x, -p.y, z * 2, "body", 43);
        }
      }
    } else if (name === "card") {
      extrude("card", 0.055);
      for (let iy = 0; iy < 17; iy++)
        for (let ix = 0; ix < 10; ix++) {
          const x = -0.6 + ix * 0.133,
            y = -0.95 + iy * 0.118;
          if ((ix + iy) % 3 === 0) add(x, y, -0.06, 0, 0, -1, "body", 345);
        }
    } else if (name === "crown") {
      extrude("crown", 0.24);
      for (const p of storyArt.crown)
        for (let z = -0.18; z <= 0.18; z += 0.12)
          add(p.x, -p.y, z, 0, 0, 1, "body", 350);
    } else {
      extrude(storyArt[name] ? name : "key", 0.1);
    }
    const model = { points };
    immersiveModels.set(name, model);
    return model;
  }
  function immersiveCamera(local, act = story?.act ?? 0) {
    const duration = (story?.script ?? immersiveStoryActs)[act].duration,
      u = clamp(local / duration, 0, 1),
      motion = reduced.matches ? 0.15 : 1,
      lookX = depthView.x * 220,
      lookY = -depthView.y * 160;
    let eye = { x: 0, y: 55, z: 1000 },
      target = { x: 0, y: 20, z: -550 },
      roll = 0;
    if (act === 0) {
      eye = {
        x: Math.sin(local * 0.18) * 100 * motion,
        y: 55,
        z: 1050 - u * 370 * motion,
      };
    }
    if (act === 1) {
      eye = {
        x: Math.sin(local * 0.3) * 70 * motion,
        y: Math.sin(local * 0.2) * 35 * motion,
        z: 650 - local * 220 * motion,
      };
      target = { x: 0, y: 0, z: eye.z - 1500 };
      roll = Math.sin(local * 0.24) * 0.08 * motion;
    }
    if (act === 2) {
      eye = {
        x: (-200 + 400 * u) * motion,
        y: -80 + Math.sin(u * Math.PI) * 45,
        z: 900 - u * 620 * motion,
      };
      target = { x: 70 * Math.sin(u * Math.PI), y: 0, z: -650 };
    }
    if (act === 3) {
      eye = {
        x: Math.sin(u * Math.PI * 1.3 - 0.65) * 260 * motion,
        y: 65,
        z: 850 - u * 170 * motion,
      };
      target = { x: 0, y: 80, z: -550 };
    }
    if (act === 4) {
      eye = {
        x: Math.sin(local * 0.18) * 270 * motion,
        y: 150 + Math.sin(local * 0.2) * 35,
        z: 850,
      };
      target = { x: 0, y: 10, z: -550 };
    }
    if (act === 5) {
      eye = {
        x: Math.sin(local * 0.2) * 55 * motion,
        y: 45,
        z: 900 - u * 100 * motion,
      };
      target = { x: 0, y: 0, z: -650 };
    }
    if (act === 6) {
      eye = {
        x: Math.sin(u * Math.PI) * 80 * motion,
        y: 50,
        z: 1000 - clamp((local - 3) / 11, 0, 1) * 2300 * motion,
      };
      target = { x: 0, y: 30, z: eye.z - 1500 };
    }
    const framing = clamp((w / h) * 1.45, 0.64, 1);
    eye.x *= framing;
    target.x = target.x * framing + lookX;
    target.y += lookY;
    return {
      eye,
      target,
      roll,
      fov:
        2 *
        Math.atan(Math.tan((25 * Math.PI) / 180) * Math.max(1, 0.8 / (w / h))),
    };
  }
  function immersivePose(actor, local, camera) {
    const n = Math.max(0, local - actor.at - actor.flight),
      rank = actor.rank || 0,
      act = story.act;
    let x = actor.x,
      y = -actor.y,
      z = -550,
      size = actor.size * 1.55,
      yaw = Math.sin(n * 0.3 + actor.x) * 0.15,
      pitch = 0,
      roll = 0;
    if (actor.art === "alice") {
      y = -65;
      size *= 0.9;
      yaw = 0.15 + Math.sin(n * 0.3) * 0.13;
    }
    if (act === 0) {
      if (actor.art === "rabbit") {
        x = 100 + Math.sin(n * 0.6) * 100;
        z = -430 - n * 75;
        y = -30 + Math.abs(Math.sin(n * 2.1)) * 57;
        yaw = -0.15 - n * 0.035;
        roll = Math.sin(n * 2.1) * 0.055;
      }
      if (actor.art === "watch") {
        x = 350 * Math.cos(n * 0.25);
        y = 80;
        z = -400 + Math.sin(n * 0.3) * 250;
        yaw = n * 0.35;
        size *= 1.15;
      }
    }
    if (act === 1) {
      z = camera.eye.z - (actor.art === "alice" ? 700 : 1300 - n * 110);
      y =
        actor.art === "alice"
          ? 60 - Math.sin(n * 0.6) * 95
          : Math.sin(n * 0.45 + actor.x) * 130;
      x = actor.art === "alice" ? Math.sin(n * 0.5) * 70 : actor.x;
      roll = actor.art === "alice" ? Math.sin(n * 0.45) * 0.5 : n * 0.14;
      pitch = Math.sin(n * 0.3) * 0.25;
    }
    if (act === 2) {
      z =
        actor.art === "alice"
          ? -920
          : actor.art === "mushroom"
            ? -150
            : -620 + (actor.x < 0 ? 180 : -180);
      if (actor.art === "flower") {
        size *= 1.65;
        y = 10;
        pitch = -0.12;
        yaw = actor.x < 0 ? 0.5 : -0.45;
        roll = Math.sin(n * 0.85 + actor.x) * 0.09;
      }
      if (actor.art === "alice") {
        size *= 0.65;
        y = -175;
      }
      if (actor.art === "mushroom") {
        x = 170;
        y = -155;
      }
    }
    if (act === 3) {
      if (actor.art === "cat") {
        x = Math.sin(n * 0.4) * 18;
        y = 95;
        z = -550;
        size *= 1.13;
        yaw = Math.sin(n * 0.22) * 0.3;
        roll = Math.sin(n * 0.7) * 0.085;
      } else {
        x = -300;
        y = -150;
        z = -210;
        size *= 0.8;
      }
    }
    if (act === 4) {
      if (actor.art === "cup") {
        const a = n * 0.45 + (actor.x < 0 ? Math.PI : 0);
        x = Math.cos(a) * 390;
        z = -550 + Math.sin(a) * 380;
        y = -80 + Math.sin(n) * 15;
        yaw = a + 0.6;
        roll = Math.sin(n * 1.25 + actor.x) * 0.15;
      } else if (actor.art === "pot") {
        x = 0;
        y = 100;
        size *= 1.2;
        roll = 0.13 + Math.sin(n * 0.65) * 0.13;
        yaw = -0.1 + Math.sin(n * 0.23) * 0.4;
      } else {
        x = 440 * Math.cos(n * 0.24);
        y = 170;
        z = -550 + Math.sin(n * 0.24) * 430;
        yaw = n * 0.3;
      }
    }
    if (act === 5) {
      if (actor.art === "card") {
        const fly = clamp(
          (n - 0.4) / Math.max(4.5, 9.6 - actor.at + rank * 0.12),
          0,
          1,
        );
        x = actor.x * (0.28 + fly * 0.82);
        y = -actor.y * (0.4 + fly * 0.8);
        z = -2100 + fly * 3400;
        yaw = Math.sin(n * 0.8 + rank) * 0.6 + n * 0.23;
        roll = Math.sin(n * 0.6 + rank) * 0.45;
        pitch = Math.sin(n * 0.4) * 0.2;
        size *= 1.3;
      } else if (actor.art === "crown") {
        x = 0;
        y = 205;
        z = -800;
        size *= 1.25;
        yaw = Math.sin(n * 0.25) * 0.32;
      } else {
        y = -130;
        z = -500;
        size *= 0.85 + clamp(n / 7, 0, 1) * 0.35;
      }
    }
    if (act === 6) {
      z = actor.art === "door" ? -620 : actor.art === "alice" ? -750 : -850;
      y = actor.art === "alice" ? -80 : actor.art === "door" ? 30 : -120;
      if (actor.art === "door") size *= 1.35;
      if (actor.art === "alice") x = -160 - clamp((local - 5) / 5, 0, 1) * 120;
      if (actor.art === "flower") x *= 1.4;
      if (actor.art === "heart") {
        x = 0;
        y = 120;
        z = camera.eye.z - 900;
        yaw = 0.2 + Math.sin(n * 0.55) * 0.38;
      }
    }
    x *= clamp((w / h) * 1.45, 0.64, 1);
    if (reduced.matches) {
      yaw *= 0.25;
      pitch *= 0.25;
      roll *= 0.25;
      if (actor.art === "card") z = -1300 + clamp(n / 8, 0, 1) * 500;
    }
    return { x, y, z, size, yaw, pitch, roll };
  }
  function immersiveView(camera) {
    const e = camera.eye,
      t = camera.target;
    let zx = e.x - t.x,
      zy = e.y - t.y,
      zz = e.z - t.z,
      l = Math.hypot(zx, zy, zz);
    zx /= l;
    zy /= l;
    zz /= l;
    let xx = zz,
      xy = 0,
      xz = -zx;
    l = Math.hypot(xx, xz);
    xx /= l;
    xz /= l;
    let yx = zy * xz,
      yy = zz * xx - zx * xz,
      yz = -zy * xx;
    const c = Math.cos(camera.roll),
      s = Math.sin(camera.roll),
      rx = xx * c + yx * s,
      ry = xy * c + yy * s,
      rz = xz * c + yz * s,
      ux = yx * c - xx * s,
      uy = yy * c - xy * s,
      uz = yz * c - xz * s;
    return new Float32Array([
      rx,
      ux,
      zx,
      0,
      ry,
      uy,
      zy,
      0,
      rz,
      uz,
      zz,
      0,
      -(rx * e.x + ry * e.y + rz * e.z),
      -(ux * e.x + uy * e.y + uz * e.z),
      -(zx * e.x + zy * e.y + zz * e.z),
      1,
    ]);
  }
  function immersiveProject(point, camera) {
    const v = immersiveView(camera),
      x = v[0] * point.x + v[4] * point.y + v[8] * point.z + v[12],
      y = v[1] * point.x + v[5] * point.y + v[9] * point.z + v[13],
      depth = -(v[2] * point.x + v[6] * point.y + v[10] * point.z + v[14]),
      f = h / (2 * Math.tan(camera.fov / 2));
    return {
      x: w * 0.5 + (x * f) / depth,
      y: h * 0.46 - (y * f) / depth,
      scale: f / depth,
      depth,
    };
  }
  function initImmersiveRenderer() {
    if (immersiveRenderer) return immersiveRenderer;
    const surface = $("storyDepthStage"),
      gl = surface.getContext("webgl2", {
        alpha: false,
        antialias: false,
        powerPreference: "high-performance",
      }),
      data = new Float32Array(immersiveMaxPoints * immersiveStride);
    if (!gl) {
      surface.dataset.renderer = "canvas-perspective";
      return (immersiveRenderer = {
        surface,
        ctx: surface.getContext("2d"),
        data,
        count: 0,
        mode: "canvas",
      });
    }
    function program(vertex, fragment) {
      const shaders = [
          [gl.VERTEX_SHADER, vertex],
          [gl.FRAGMENT_SHADER, fragment],
        ].map(([kind, source]) => {
          const shader = gl.createShader(kind);
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
            throw Error(gl.getShaderInfoLog(shader));
          return shader;
        }),
        p = gl.createProgram();
      shaders.forEach((shader) => gl.attachShader(p, shader));
      gl.linkProgram(p);
      shaders.forEach((shader) => gl.deleteShader(shader));
      if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw Error(gl.getProgramInfoLog(p));
      return p;
    }
    const particlesProgram = program(
      `#version 300 es
 precision highp float;
 layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aColor;layout(location=2) in float aSize;layout(location=3) in float aType;layout(location=4) in float aAlpha;
 uniform mat4 uView;uniform mat4 uProjection;uniform float uFocal;
 out vec3 vColor;out float vAlpha;flat out float vType;
 void main(){vec4 p=uView*vec4(aPosition,1.0);float d=-p.z;gl_Position=uProjection*p;gl_PointSize=clamp(aSize*uFocal/max(d,60.0),1.0,48.0);vColor=aColor;vType=aType;vAlpha=aAlpha*smoothstep(65.0,180.0,d)*(1.0-smoothstep(7000.0,14000.0,d));}
 `,
      `#version 300 es
 precision highp float;uniform sampler2D uAtlas;in vec3 vColor;in float vAlpha;flat in float vType;out vec4 fragColor;
 void main(){vec4 t=texture(uAtlas,vec2((vType+gl_PointCoord.x)/5.0,gl_PointCoord.y));if(t.a<0.035||vAlpha<0.015)discard;float light=dot(t.rgb,vec3(0.299,0.587,0.114));vec3 color=mix(vColor,vec3(1.0,0.98,0.9),pow(light,5.0)*0.6)*(0.7+light*0.5);fragColor=vec4(color,t.a*vAlpha);}
 `,
    );
    const skyProgram = program(
      `#version 300 es
 out vec2 vUv;void main(){vUv=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(vUv*2.0-1.0,0.0,1.0);}
 `,
      `#version 300 es
 precision highp float;in vec2 vUv;uniform vec3 uTint;uniform float uTime;out vec4 fragColor;
 void main(){vec2 p=vUv-vec2(0.5,0.48);float halo=exp(-dot(p*vec2(1.1,1.8),p*vec2(1.1,1.8))*5.0);float band=exp(-abs(p.y+0.12*sin(p.x*5.0+uTime*0.025))*16.0);vec3 color=vec3(0.008,0.016,0.043)+vec3(0.008,0.015,0.035)*halo+uTint*band*0.035;
 float wave=0.17+0.08*sin(p.x*6.0+uTime*0.12)+0.025*sin(p.x*19.0-uTime*0.2);float curtain=exp(-abs(p.y-wave)*20.0)*(0.55+0.45*sin(p.x*65.0+uTime*0.17));float veil=exp(-abs(p.y-wave-0.1)*12.0);vec3 aurora=mix(vec3(0.12,0.7,0.63),uTint,0.5+0.4*sin(p.x*3.0+uTime*0.08));color+=aurora*(curtain*0.09+veil*0.025);color+=vec3(0.006,0.011,0.022)*max(0.0,1.0-vUv.y*2.0);fragColor=vec4(color,1.0);}
 `,
    );
    const atlas = document.createElement("canvas");
    atlas.width = 640;
    atlas.height = 128;
    const ac = atlas.getContext("2d");
    materialTypes.forEach((type, i) =>
      ac.drawImage(sprite(43, type), i * 128, 0, 128, 128),
    );
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const buffer = gl.createBuffer(),
      uniforms = {
        view: gl.getUniformLocation(particlesProgram, "uView"),
        projection: gl.getUniformLocation(particlesProgram, "uProjection"),
        focal: gl.getUniformLocation(particlesProgram, "uFocal"),
        atlas: gl.getUniformLocation(particlesProgram, "uAtlas"),
        tint: gl.getUniformLocation(skyProgram, "uTint"),
        time: gl.getUniformLocation(skyProgram, "uTime"),
      };
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
    surface.dataset.renderer = "webgl2";
    return (immersiveRenderer = {
      surface,
      gl,
      data,
      count: 0,
      mode: "webgl2",
      particlesProgram,
      skyProgram,
      buffer,
      texture,
      uniforms,
    });
  }
  function immersiveWrite(
    renderer,
    x,
    y,
    z,
    hue,
    size,
    type = 0,
    alpha = 1,
    brightness = 1,
  ) {
    if (
      renderer.count >= immersiveMaxPoints ||
      alpha < 0.015 ||
      !Number.isFinite(x + y + z + size)
    )
      return;
    const c = immersiveColor[((Math.round(hue) % 360) + 360) % 360],
      d = renderer.data,
      k = renderer.count++ * immersiveStride;
    d[k] = x;
    d[k + 1] = y;
    d[k + 2] = z;
    d[k + 3] = c[0] * brightness;
    d[k + 4] = c[1] * brightness;
    d[k + 5] = c[2] * brightness;
    d[k + 6] = size;
    d[k + 7] = type;
    d[k + 8] = alpha;
  }
  function immersiveRotation(pose) {
    const y = Math.cos(pose.yaw),
      s = Math.sin(pose.yaw),
      p = Math.cos(pose.pitch),
      t = Math.sin(pose.pitch),
      r = Math.cos(pose.roll),
      u = Math.sin(pose.roll);
    return [
      r * y - u * t * s,
      -u * p,
      r * s + u * t * y,
      u * y + r * t * s,
      r * p,
      u * s - r * t * y,
      -p * s,
      t,
      p * y,
    ];
  }
  function immersiveFlightPoint(actor, local, camera) {
    const pose = immersivePose(actor, actor.at + actor.flight, camera),
      t = clamp((local - actor.at) / actor.flight, 0, 1),
      u = t * t * (3 - 2 * t),
      angle = ((actor.rank ?? Math.abs(actor.x) % 8) * TAU) / 8,
      sx = Math.cos(angle) * 700,
      sy = -180 + Math.sin(angle) * 340,
      sz = pose.z - 2000,
      bend = story.curved ? Math.sin(u * Math.PI) : 0;
    return {
      x: sx + (pose.x - sx) * u + bend * Math.sin(angle + 1.3) * 180,
      y: sy + (pose.y - sy) * u + bend * 110,
      z: sz + (pose.z - sz) * u,
    };
  }
  function makeImmersiveActor(cue) {
    return { ...cue, flight: 2.4, model: makeImmersiveModel(cue.art) };
  }
  function immersiveActing(actor, local) {
    const n = Math.max(0, local - actor.at - actor.flight),
      response = Math.exp(-(((story.age - story.lastMagic - 0.32) / 0.5) ** 2)),
      motion = reduced.matches ? 0.2 : 1;
    return {
      n,
      motion,
      response,
      hop: Math.sin(n * 2.1),
      look:
        (Math.sin(n * 0.55) * 0.12 +
          Math.exp(-(((n - 2.5) / 0.9) ** 2)) * 0.55) *
        motion,
      blink:
        1 - 0.96 * Math.max(Math.exp(-(((local - 6.7) / 0.14) ** 2)), response),
    };
  }
  function immersiveDeform(point, actor, acting, out = {}) {
    let { x, y, z } = point;
    const { n, motion, response, hop, look, blink } = acting,
      part = point.part;
    if (actor.art === "rabbit") {
      if (
        part === "head" ||
        part === "eyes" ||
        part === "earL" ||
        part === "earR"
      ) {
        const a = look,
          c = Math.cos(a),
          s = Math.sin(a);
        z -= 0.06;
        const xx = x * c + z * s;
        z = z * c - x * s + 0.06;
        x = xx;
      }
      if (part === "earL" || part === "earR") {
        const side = part === "earL" ? -1 : 1,
          a =
            (Math.sin(n * 3.2 + side) * 0.12 + side * response * 0.28) * motion,
          yy = y - 0.58;
        y = 0.58 + yy * Math.cos(a);
        x += Math.sin(a) * yy;
        z += Math.sin(n * 2.1 + side) * 0.06 * motion;
      }
      if (part === "pawL" || part === "pawR") {
        const sign = part === "pawL" ? -1 : 1;
        y +=
          Math.sin(n * 2.1 + sign) * 0.12 * motion +
          (part === "pawR"
            ? (0.13 + 0.14 * Math.sin(n * 5)) *
              Math.exp(-(((n - 2.5) / 1.1) ** 2)) *
              motion
            : 0);
        z += hop * sign * 0.09 * motion;
      }
      if (part === "footL" || part === "footR")
        z += hop * (part === "footL" ? -1 : 1) * 0.13 * motion;
    } else if (actor.art === "flower") {
      if (part === "petals") {
        const open =
          0.82 +
          0.18 * clamp(n / 1.8, 0, 1) +
          Math.sin(n * 1.2 + actor.x) * 0.06 * motion +
          response * 0.15 * motion;
        x *= open;
        y = 0.55 + (y - 0.55) * open;
        z += Math.sin(n * 1.5 + x * 3) * 0.06 * motion + (1 - open) * 0.6;
      }
      x += Math.sin(n * 0.85 + actor.x) * Math.max(0, y + 1) * 0.035 * motion;
    } else if (actor.art === "mushroom" && y > 0.04) {
      const breath = Math.sin(n * 1.6) * 0.035 * motion;
      y = 0.04 + (y - 0.04) * (1 + breath);
      x *= 1 - breath * 0.5;
      z *= 1 - breath * 0.5;
    } else if (actor.art === "cat") {
      if (part === "eyes")
        y = 0.3 + (y - 0.3) * (x > 0 ? blink : Math.min(1, blink + 0.25));
      if (part === "body" && n > 4) {
        const drift = clamp((n - 4) / 2, 0, 1);
        x += Math.cos(point.seed) * drift * 0.12;
        y += drift * 0.15;
        z += Math.sin(point.seed) * drift * 0.15;
      }
    } else if (
      actor.art === "watch" &&
      (part === "minute" || part === "hour")
    ) {
      const a = -n * (part === "minute" ? 0.9 : 0.075),
        c = Math.cos(a),
        s = Math.sin(a),
        xx = x * c - y * s;
      y = x * s + y * c;
      x = xx;
    } else if (actor.art === "alice" && y < 0.06 && y > -0.7) {
      x += Math.sin(n * 1.6 + y * 3) * 0.025 * motion;
      z += Math.sin(n * 1.6 + x * 3) * 0.04 * motion;
    }
    out.x = x;
    out.y = y;
    out.z = z;
    return out;
  }
  function immersivePartAlpha(actor, part, local) {
    if (actor.art !== "cat") return 1;
    const age = local - actor.at - actor.flight;
    if (part === "eyes")
      return clamp(age / 0.4, 0, 1) * clamp((9.5 - local) / 1.2, 0, 1);
    if (part === "smile") return clamp((age - 0.65) / 0.8, 0, 1);
    return clamp((age - 1.8) / 1.2, 0, 1) * clamp((8.4 - local) / 1.5, 0, 1);
  }
  function awakenImmersiveMagic(screenX = w * 0.5, screenY = h * 0.45) {
    const s = story;
    if (
      s?.variant !== "immersive" ||
      s.finished ||
      state.paused ||
      s.age - s.lastMagic < 0.55
    )
      return;
    const local = s.age - storyActStart(s.act),
      camera = immersiveCamera(local),
      v = immersiveView(camera),
      depth = 800,
      f = h / (2 * Math.tan(camera.fov / 2)),
      x = ((screenX - w * 0.5) * depth) / f,
      y = ((h * 0.46 - screenY) * depth) / f;
    s.lastMagic = s.age;
    s.magic.push({
      at: s.age,
      x: camera.eye.x + v[0] * x + v[1] * y - v[2] * depth,
      y: camera.eye.y + v[4] * x + v[5] * y - v[6] * depth,
      z: camera.eye.z + v[8] * x + v[9] * y - v[10] * depth,
    });
    if (s.magic.length > 3) s.magic.shift();
  }
  // Deliberate crescendos leave a quiet beat before the final, three-depth fanfare.
  const immersiveCues = [
    [],
    [{ at: 8.3, power: 1.3, depth: 1800 }],
    [],
    [],
    [{ at: 8.8, power: 1, depth: 1400 }],
    [{ at: 10.2, power: 1.15, depth: 1500 }],
    [
      { at: 8.7, power: 1, depth: 1900 },
      { at: 10.3, power: 1.5, depth: 1350 },
      { at: 11.9, power: 1.8, depth: 850 },
    ],
  ];
  function immersiveBurst(x, y, z, hue, power = 1) {
    const s = story,
      n = Math.round(90 * power * Math.min(quality(), 1));
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996,
        yy = 1 - (2 * (i + 0.5)) / n,
        r = Math.sqrt(1 - yy * yy),
        speed = 90 + Math.random() * 130,
        life = 2.5 + Math.random() * 1.6;
      if (s.sparks.length >= 900) s.sparks.shift();
      s.sparks.push({
        x,
        y,
        z,
        vx: Math.cos(a) * r * speed,
        vy: yy * speed,
        vz: Math.sin(a) * r * speed * 1.6,
        age: 0,
        life,
        hue: hue + (s.rainbow ? (i / n) * 360 : Math.sin(i) * 12),
        type:
          s.effect === "mix"
            ? i % 5
            : Math.max(0, materialTypes.indexOf(s.effect)),
        seed: a,
      });
    }
  }
  function advanceImmersiveStory(dt, local, act) {
    const s = story,
      camera = immersiveCamera(local);
    for (const actor of s.actors) {
      if (s.lastLocal < actor.at && local >= actor.at)
        storyActorSound(actor, clamp(actor.x / 1000 + 0.5, 0, 1));
      const at = actor.at + actor.flight;
      if (s.lastLocal < at && local >= at) {
        const p = immersivePose(actor, local, camera);
        immersiveBurst(p.x, p.y, p.z, actor.hue, 0.6);
        storyActorSound(actor, clamp(actor.x / 1000 + 0.5, 0, 1), true);
      }
    }
    if (local >= s.accentAt && local < act.duration - 1) {
      const side = Math.floor(s.accentAt) % 2 ? -1 : 1;
      if (s.act !== 6 || local < 4)
        immersiveBurst(
          side * (380 + Math.random() * 100),
          40,
          camera.eye.z - 900 - Math.random() * 500,
          act.hue + s.accentAt * 23,
          s.act === 3 ? 0.4 : 0.65,
        );
      s.accentAt = local + (s.act === 5 ? 1.8 : 3.1);
    }
    for (const cue of immersiveCues[s.act])
      if (s.lastLocal < cue.at && local >= cue.at) {
        for (const side of [-1, 1])
          immersiveBurst(
            side * (s.act === 6 ? 520 : 430),
            s.act === 6 ? 150 : 30,
            camera.eye.z - cue.depth,
            act.hue + (s.rainbow ? (side + 1) * 80 + cue.at * 20 : 0),
            cue.power,
          );
        boom(0.5, 0.7);
      }
    s.magic = s.magic.filter((m) => s.age - m.at < 3.6);
    for (let i = s.sparks.length - 1; i >= 0; i--) {
      const p = s.sparks[i];
      p.age += dt;
      if (p.age > p.life) {
        s.sparks.splice(i, 1);
        continue;
      }
      const drag = Math.exp(-dt * 0.3);
      p.vx *= drag;
      p.vy = p.vy * drag - 12 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
    }
  }
  function drawImmersiveActor(renderer, actor, local, camera) {
    if (local < actor.at) return;
    const age = local - actor.at - actor.flight;
    if (age < 0) {
      for (let j = 15; j >= 0; j--) {
        const q = immersiveFlightPoint(actor, local - j * 0.027, camera);
        immersiveWrite(
          renderer,
          q.x,
          q.y,
          q.z,
          actor.hue,
          10 + j * 0.1,
          0,
          (1 - j / 17) * 0.95,
        );
      }
      const p = immersiveFlightPoint(actor, local, camera);
      immersiveWrite(renderer, p.x, p.y, p.z, actor.hue, 23, 0, 1.1);
      return;
    }
    const pose = immersivePose(actor, local, camera),
      rotation = immersiveRotation(pose),
      acting = immersiveActing(actor, local),
      deformed = {},
      form = clamp(age / 1.05, 0, 1),
      spread = 1 - (1 - form) ** 3,
      exit = actor.art === "cat" ? 0.65 : 1,
      fade =
        story.act === 6
          ? 1
          : clamp((story.script[story.act].duration - local) / exit, 0, 1),
      stride = quality() < 0.7 ? 2 : 1,
      points = actor.model.points;
    for (let i = 0; i < points.length; i += stride) {
      const p = points[i],
        part = immersivePartAlpha(actor, p.part, local);
      if (part < 0.015) continue;
      const q = immersiveDeform(p, actor, acting, deformed),
        noise = (1 - form) * 0.17,
        x = (q.x * spread + Math.cos(p.seed) * noise) * pose.size,
        y = (q.y * spread + Math.sin(p.seed) * noise) * pose.size,
        z = (q.z * spread + Math.sin(p.seed * 1.7) * noise) * pose.size;
      const wx = pose.x + rotation[0] * x + rotation[1] * y + rotation[2] * z,
        wy = pose.y + rotation[3] * x + rotation[4] * y + rotation[5] * z,
        wz = pose.z + rotation[6] * x + rotation[7] * y + rotation[8] * z,
        nx = rotation[0] * p.nx + rotation[1] * p.ny + rotation[2] * p.nz,
        ny = rotation[3] * p.nx + rotation[4] * p.ny + rotation[5] * p.nz,
        nz = rotation[6] * p.nx + rotation[7] * p.ny + rotation[8] * p.nz,
        light = 0.55 + 0.65 * Math.max(0, nx * 0.25 + ny * 0.4 + nz * 0.85);
      const accent = i % 17 === 0,
        type = accent
          ? story.effect === "mix"
            ? Math.floor(i / 17) % 5
            : Math.max(0, materialTypes.indexOf(story.effect))
          : 0,
        hue =
          (p.hue || actor.hue) +
          (story.rainbow
            ? accent
              ? i * 137.5
              : p.x * 60 + p.y * 55 + p.z * 95
            : 0),
        alpha = part * fade * (0.95 + 0.35 * Math.sin(local * 2 + p.seed) ** 2);
      immersiveWrite(
        renderer,
        wx,
        wy,
        wz,
        hue,
        type === 0 ? 9.5 : type === 1 ? 11 : 14,
        type,
        alpha,
        light,
      );
    }
  }
  function immersiveButterfly(
    renderer,
    x,
    y,
    z,
    size,
    hue,
    phase,
    alpha,
    detailed = false,
  ) {
    const flap = reduced.matches ? 0.45 : Math.sin(phase) * 1.08,
      wing = Math.cos(flap),
      lift = Math.sin(flap),
      layers = detailed ? 4 : 1;
    for (const side of [-1, 1])
      for (let lobe = 0; lobe < 2; lobe++)
        for (let layer = 0; layer < layers; layer++)
          for (let j = 0; j < 16; j++) {
            const a = (j / 16) * TAU,
              radial = detailed ? 0.3 + layer * 0.233 : 1,
              xx = (0.46 + Math.cos(a) * 0.42) * (lobe ? 0.72 : 1) * radial,
              yy =
                ((lobe ? -0.27 : 0.3) + Math.sin(a) * (lobe ? 0.32 : 0.49)) *
                radial,
              zz = xx * lift;
            immersiveWrite(
              renderer,
              x + side * xx * size * wing,
              y + yy * size,
              z + zz * size,
              hue + side * 16 + lobe * 22 + layer * 7,
              detailed ? 8 : 5.8,
              0,
              alpha * (detailed ? 0.55 + layer * 0.15 : 1),
            );
          }
    for (let j = 0; j < 6; j++)
      immersiveWrite(
        renderer,
        x,
        y + (j / 5 - 0.5) * size * 0.7,
        z,
        hue,
        5,
        0,
        alpha,
      );
  }
  function immersiveDreamscape(renderer, local, camera) {
    const s = story,
      motion = reduced.matches ? 0.18 : 1;
    // Interwoven light ribbons surround the tunnel without filling its readable center.
    if (s.act === 1)
      for (let strand = 0; strand < 3; strand++)
        for (let j = 0; j < 300; j++) {
          const z = 400 - j * 28,
            a = j * 0.065 + (strand * TAU) / 3 + local * 0.15 * motion,
            r = 420 + Math.sin(j * 0.025 + local * 0.25) * 45;
          immersiveWrite(
            renderer,
            Math.cos(a) * r,
            Math.sin(a) * r,
            z,
            185 + strand * 65 + j * 0.14,
            j % 9 === 0 ? 19 : 12,
            j % 9 === 0 ? 1 : 0,
            0.9,
          );
        }
    // Small, articulated light wings drift at different depths, rather than one flat sprite layer.
    if (s.act === 0 || s.act === 2 || s.act === 6) {
      const count = s.act === 6 ? 22 : s.act === 2 ? 15 : 6,
        release =
          s.act === 6
            ? clamp((local - 4) / 5, 0, 1)
            : clamp((local - 3) / 2, 0, 1);
      for (let i = 0; i < count; i++) {
        const a = i * 2.39996 + local * 0.16 * motion,
          side = i % 2 ? 1 : -1,
          depth = 470 + (i % 7) * 170,
          x = side * (200 + (i % 5) * 70) + Math.sin(a) * 80,
          y = 40 + Math.sin(a * 0.7) * 170,
          z = camera.eye.z - depth;
        immersiveButterfly(
          renderer,
          x,
          y,
          z,
          18 + (i % 4) * 6,
          s.rainbow ? i * 137.5 : 43 + i * 9,
          local * 5 * motion + i,
          release * 0.8,
        );
      }
    }
    if (s.act === 2) {
      for (let ring = 0; ring < 3; ring++)
        for (let j = 0; j < 160; j++) {
          const a = (j / 160) * TAU + local * 0.07 * (ring % 2 ? 1 : -1),
            r = 170 + ring * 90;
          immersiveWrite(
            renderer,
            Math.cos(a) * r,
            -270 + Math.sin(a * 3 + local * 0.6) * 8,
            -540 + Math.sin(a) * r,
            145 + ring * 62,
            6,
            0,
            0.45,
          );
        }
    }
    if (s.act === 3) {
      for (let j = 0; j < 220; j++) {
        const a = (j / 220) * TAU + local * 0.12,
          r = 420 + Math.sin(a * 3 + local * 0.7) * 24;
        immersiveWrite(
          renderer,
          Math.cos(a) * r,
          80 + Math.sin(a) * r * 0.58,
          -870 + Math.sin(a * 2) * 130,
          265 + j * 0.25,
          6,
          0,
          0.3,
        );
      }
    }
    if (s.act === 4 && local > 3.8) {
      const pot = s.actors.find((a) => a.art === "pot"),
        cup = s.actors.find((a) => a.art === "cup"),
        p = immersivePose(pot, local, camera),
        c = immersivePose(cup, local, camera),
        r = immersiveRotation(p),
        x = -1.2 * p.size,
        y = 0.61 * p.size,
        z = 0.1 * p.size,
        source = {
          x: p.x + r[0] * x + r[1] * y + r[2] * z,
          y: p.y + r[3] * x + r[4] * y + r[5] * z,
          z: p.z + r[6] * x + r[7] * y + r[8] * z,
        };
      for (let j = 0; j < 110; j++) {
        const u = (j / 110 + local * 0.23) % 1,
          arc = Math.sin(u * Math.PI),
          xx = source.x + (c.x - source.x) * u,
          yy = source.y + (c.y + 0.42 * c.size - source.y) * u + arc * 65,
          zz = source.z + (c.z - source.z) * u;
        immersiveWrite(
          renderer,
          xx,
          yy,
          zz,
          43 + (s.rainbow ? u * 230 : 0),
          12 + (j % 7 === 0 ? 5 : 0),
          j % 8 === 0 ? 1 : 0,
          arc * 1.1,
        );
      }
      for (let i = 0; i < 24; i++) {
        const a = i * 2.39996 + local * 0.4,
          y = 20 + ((local * 23 + i * 11) % 140);
        immersiveWrite(
          renderer,
          c.x + Math.sin(a) * 25,
          c.y + c.size * 0.45 + y,
          c.z + Math.cos(a) * 25,
          200 + i * 3,
          8,
          0,
          (1 - y / 165) * 0.5,
        );
      }
    }
    if (s.act === 6) {
      const charge = clamp((local - 4) / 4.7, 0, 1),
        bloom = clamp((local - 8.7) / 3.2, 0, 1);
      for (let band = 0; band < 2; band++)
        for (let j = 0; j < 360; j++) {
          const a = (j / 360) * TAU + local * 0.08 * (band ? 1 : -1) * motion,
            r = 320 + band * 60 + bloom * 90,
            x = Math.cos(a) * r,
            y = 120 + Math.sin(a) * r * 0.72,
            z = camera.eye.z - 1100 + Math.sin(a * 2 + band) * 130;
          immersiveWrite(
            renderer,
            x,
            y,
            z,
            band ? 320 + j * 0.2 : 170 + j * 0.2,
            j % 12 === 0 ? 14 : 7,
            j % 12 === 0 ? 1 : 0,
            charge * (0.3 + bloom * 0.5),
          );
        }
      if (local > 8.7)
        for (const side of [-1, 1]) {
          const t = local - 8.7;
          immersiveButterfly(
            renderer,
            side * (350 + Math.sin(t * 0.6) * 65),
            125 + Math.sin(t * 0.7 + side) * 65,
            camera.eye.z - 820 + Math.sin(t * 0.3) * 120,
            105 + 25 * bloom,
            side < 0 ? 185 : 320,
            t * 3.5 * motion + side,
            bloom * 0.9,
            true,
          );
        }
      // A glowing aperture sits inside the physical arch, then falls behind the camera.
      if (local < 10)
        for (let j = 0; j < 260; j++) {
          const a = j * 2.39996 + local * 0.1,
            r = 170 + Math.sin(j * 0.12 + local * 0.7) * 35;
          immersiveWrite(
            renderer,
            Math.cos(a) * r,
            35 + Math.sin(a) * r * 1.25,
            -660,
            190 + j * 0.4,
            8,
            0,
            clamp((local - 3) / 2, 0, 0.6),
          );
        }
    }
    for (const m of s.magic) {
      const t = s.age - m.at,
        fade = Math.sin(Math.min(1, t / 3.6) * Math.PI),
        r = 30 + t * 70;
      for (let j = 0; j < 70; j++) {
        const a = (j / 70) * TAU;
        immersiveWrite(
          renderer,
          m.x + Math.cos(a) * r,
          m.y + Math.sin(a) * r * 0.6,
          m.z - t * 35,
          s.rainbow ? j * 5 : 43,
          6,
          0,
          fade * 0.55,
        );
      }
      const count = reduced.matches ? 3 : 9;
      for (let i = 0; i < count; i++) {
        const a = i * 2.39996,
          x = m.x + Math.cos(a) * t * 65,
          y = m.y + t * (45 + (i % 3) * 15) + Math.sin(t * 3 + i) * 12,
          z = m.z + Math.sin(a) * t * 100;
        immersiveButterfly(
          renderer,
          x,
          y,
          z,
          16 + (i % 3) * 5,
          s.rainbow ? i * 137.5 : 43 + i * 9,
          t * 6 + i,
          fade * 0.9,
        );
      }
    }
  }
  function immersiveEnvironment(renderer, local, camera) {
    const stars = story.stars,
      stride = quality() < 0.7 ? 2 : 1;
    for (let i = 0; i < stars.length; i += stride) {
      const p = stars[i];
      immersiveWrite(
        renderer,
        p.x,
        p.y,
        p.z,
        195 + p.seed * 60,
        p.size,
        0,
        0.25 + 0.45 * Math.sin(p.seed + local * 0.35) ** 2,
      );
    }
    if (story.act !== 1)
      for (let iz = 0; iz < 26; iz++)
        for (let ix = -8; ix <= 8; ix++) {
          const z = 500 - iz * 210,
            x = ix * 115,
            y = -290 + Math.sin(ix * 0.8 + iz * 0.7) * 4;
          immersiveWrite(renderer, x, y, z, 190 + iz * 3, 5, 0, 0.22);
        }
    if (story.act === 1) {
      for (let ring = 0; ring < 22; ring++) {
        const z = 400 - ring * 420;
        for (let j = 0; j < 90; j++) {
          const a =
              (j / 90) * TAU +
              ring * 0.08 +
              (reduced.matches ? 0 : local * 0.035),
            r = 390 + Math.sin(ring * 0.4 + local * 0.22) * 35;
          immersiveWrite(
            renderer,
            Math.cos(a) * r,
            Math.sin(a) * r,
            z,
            190 + ring * 11,
            j % 10 === 0 ? 21 : 12,
            j % 10 === 0 ? 1 : 0,
            0.85,
          );
        }
      }
    }
    if (story.act === 4) {
      for (let j = 0; j < 200; j++) {
        const a = (j / 200) * TAU,
          x = Math.cos(a) * 430,
          z = -550 + Math.sin(a) * 420;
        immersiveWrite(renderer, x, -155, z, 43 + j * 0.6, 9, 0, 0.65);
      }
    }
    if (story.act === 2 || story.act === 6)
      for (let i = 0; i < 90; i++) {
        const a = i * 2.39996 + local * 0.12,
          x = Math.sin(a) * 750,
          y = -120 + Math.sin(a * 0.7 + local * 0.25) * 270,
          z = camera.eye.z - 200 - (i % 12) * 190,
          type = story.act === 6 ? 4 : 3;
        immersiveWrite(
          renderer,
          x,
          y,
          z,
          story.rainbow ? i * 137.5 : story.act === 6 ? 43 : 330,
          15 + (i % 3) * 4,
          type,
          0.7,
        );
      }
    for (const p of story.sparks) {
      const alpha = clamp((p.life - p.age) / 0.9, 0, 1);
      immersiveWrite(
        renderer,
        p.x,
        p.y,
        p.z,
        p.hue,
        p.type === 0 ? 8 : 19,
        p.type,
        alpha,
      );
      if (p.type === 0)
        for (let j = 1; j < 5; j++)
          immersiveWrite(
            renderer,
            p.x - p.vx * j * 0.035,
            p.y - p.vy * j * 0.035,
            p.z - p.vz * j * 0.035,
            p.hue,
            5,
            0,
            alpha * (1 - j / 5) * 0.6,
          );
    }
    // Comets and a local star shower move through real depth, then clip softly at the camera.
    if (
      !reduced.matches &&
      (story.act === 1 || story.act === 5 || story.act === 6)
    )
      for (let i = 0; i < 48; i++) {
        const cycle = (local * 0.12 + i * 0.618) % 1,
          z = camera.eye.z - 1900 + cycle * 2250,
          angle = i * 2.39996,
          x = Math.cos(angle) * (140 + (i % 7) * 55),
          y = Math.sin(angle) * (100 + (i % 5) * 42);
        for (let j = 0; j < 4; j++)
          immersiveWrite(
            renderer,
            x,
            y,
            z - j * 50,
            story.rainbow ? i * 47 : 210,
            9 - j,
            0,
            (1 - j / 4) * 0.75,
          );
      }
    immersiveDreamscape(renderer, local, camera);
  }
  function renderImmersiveStory() {
    const renderer = initImmersiveRenderer(),
      local = story.age - storyActStart(story.act),
      camera = immersiveCamera(local),
      surface = renderer.surface,
      ratio = Math.min(dpr, 1.5),
      width = Math.round(w * ratio),
      height = Math.round(h * ratio);
    if (surface.width !== width || surface.height !== height) {
      surface.width = width;
      surface.height = height;
    }
    renderer.count = 0;
    for (const actor of story.actors)
      drawImmersiveActor(renderer, actor, local, camera);
    immersiveEnvironment(renderer, local, camera);
    surface.dataset.points = String(renderer.count);
    if (renderer.mode === "canvas") {
      const c = renderer.ctx;
      c.setTransform(ratio, 0, 0, ratio, 0, 0);
      c.globalCompositeOperation = "source-over";
      c.globalAlpha = 1;
      c.fillStyle = "#030916";
      c.fillRect(0, 0, w, h);
      const list = [],
        d = renderer.data,
        stride = Math.max(1, Math.ceil(renderer.count / 2600));
      for (let i = 0; i < renderer.count; i += stride) {
        const k = i * immersiveStride,
          p = immersiveProject({ x: d[k], y: d[k + 1], z: d[k + 2] }, camera);
        if (
          p.depth > 65 &&
          p.x > -70 &&
          p.x < w + 70 &&
          p.y > -70 &&
          p.y < h + 70
        )
          list.push({ p, k });
      }
      list.sort((a, b) => b.p.depth - a.p.depth);
      for (const { p, k } of list) {
        const size = Math.min(40, d[k + 6] * p.scale),
          hue =
            (Math.atan2(
              Math.sqrt(3) * (d[k + 4] - d[k + 5]),
              2 * d[k + 3] - d[k + 4] - d[k + 5],
            ) *
              180) /
            Math.PI;
        c.globalCompositeOperation = "lighter";
        c.globalAlpha = d[k + 8] * clamp((p.depth - 65) / 115, 0, 1);
        c.drawImage(
          sprite(hue, materialTypes[Math.round(d[k + 7])]),
          p.x - size / 2,
          p.y - size / 2,
          size,
          size,
        );
      }
      c.globalAlpha = 1;
      return;
    }
    const { gl, uniforms } = renderer,
      f = 1 / Math.tan(camera.fov / 2),
      near = 60,
      far = 16000,
      projection = new Float32Array([
        f / (w / h),
        0,
        0,
        0,
        0,
        f,
        0,
        0,
        0,
        -0.08,
        (far + near) / (near - far),
        -1,
        0,
        0,
        (2 * far * near) / (near - far),
        0,
      ]),
      view = immersiveView(camera),
      color = immersiveColor[(story.script[story.act].hue + 360) % 360];
    gl.viewport(0, 0, width, height);
    gl.clearColor(0.006, 0.011, 0.027, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.useProgram(renderer.skyProgram);
    gl.uniform3fv(uniforms.tint, color);
    gl.uniform1f(uniforms.time, story.age);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.useProgram(renderer.particlesProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffer);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      0,
      renderer.data.subarray(0, renderer.count * immersiveStride),
    );
    for (const [location, size, offset] of [
      [0, 3, 0],
      [1, 3, 12],
      [2, 1, 24],
      [3, 1, 28],
      [4, 1, 32],
    ]) {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(
        location,
        size,
        gl.FLOAT,
        false,
        immersiveStride * 4,
        offset,
      );
    }
    gl.uniformMatrix4fv(uniforms.view, false, view);
    gl.uniformMatrix4fv(uniforms.projection, false, projection);
    gl.uniform1f(uniforms.focal, height * 0.5 * f);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, renderer.texture);
    gl.uniform1i(uniforms.atlas, 0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, renderer.count);
  }
  $("storyDepthStage").addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    immersiveRenderer = null;
    if (story?.variant === "immersive") {
      stopAliceStory();
      notify("3D 舞台暂时中断，请重新开演。");
    }
  });
  // The multilingual wording is checked against Wiktionary and Omniglot.
  // Uyghur source, supplied by Adiljan Barat: https://www.omniglot.com/language/phrases/uyghur.htm
  const loveLanguages = [
    { lang: "ja", name: "日语", text: "愛してる" },
    { lang: "en", name: "英语", text: "I love you", finaleOnly: true },
    { lang: "fr", name: "法语", text: "Je t’aime" },
    { lang: "ko", name: "韩语", text: "사랑해요" },
    { lang: "ru", name: "俄语", text: "Я тебя люблю" },
    { lang: "de", name: "德语", text: "Ich liebe dich" },
    { lang: "ug", name: "维吾尔语", text: "مەن سىزنى سۆيۈمەن", rtl: true },
    { lang: "zh", name: "中文", text: "我爱你", finaleOnly: true },
    { lang: "es", name: "西班牙语", text: "Te amo" },
    { lang: "it", name: "意大利语", text: "Ti amo" },
    { lang: "pt", name: "葡萄牙语", text: "Eu te amo" },
    { lang: "ar", name: "阿拉伯语", text: "أحبك", rtl: true },
    { lang: "tr", name: "土耳其语", text: "Seni seviyorum" },
    { lang: "el", name: "希腊语", text: "Σ’ αγαπώ" },
    { lang: "sw", name: "斯瓦希里语", text: "Ninakupenda" },
  ];
  const loveStages = [
    { at: 0, title: "万语同心", line: "让全世界的语言，一起说出这三个字。" },
    {
      at: 10,
      title: "为你，花开成海",
      line: "把未说出口的温柔，开成送给你的花。",
    },
    {
      at: 22,
      title: "双心 · 星河相拥",
      line: "两颗心，绕过星河，终于朝彼此靠近。",
    },
    { at: 32, title: "此刻，爱意盛放", line: "万千花火，只为这一刻。" },
  ];
  const loveFinaleLines = [
    { lang: "zh", parts: ["我", "爱", "你"], at: 32 },
    { lang: "en", parts: ["I", "love", "you"], at: 36.5 },
  ];
  const loveCues = [
    { at: 10.4, kind: "rose", rank: 0 },
    { at: 11.05, kind: "rose", rank: 1 },
    { at: 11.7, kind: "rose", rank: 2 },
    { at: 19.2, kind: "wings" },
    { at: 22.1, kind: "hearts" },
    { at: 28, kind: "rings" },
    { at: 41, kind: "grand" },
    { at: 42.6, kind: "grand" },
  ];
  const loveRoseCache = new Map();
  const lovePetalCache = new Map();
  const loveRoseAtlasCache = new Map();
  let loveWordPetalAtlas = null;
  const loveRosePetals = Array.from({ length: 6 }, (_, layer) =>
    Array.from({ length: [5, 6, 7, 5, 4, 3][layer] }, (_, index) => {
      const count = [5, 6, 7, 5, 4, 3][layer],
        angle = (index / count) * TAU + layer * 2.18,
        inner = [175, 120, 80, 48, 24, 0][layer],
        outer = [400, 175, 120, 80, 48, 24][layer],
        half = Math.PI / count,
        xs = [],
        ys = [];
      for (let i = 0; i <= 24; i++)
        for (const radius of [inner, outer]) {
          const a = angle - half + (i / 24) * half * 2;
          xs.push(clamp(16 + Math.cos(a) * radius, -256, 256));
          ys.push(clamp(-38 + Math.sin(a) * radius, -256, 256));
        }
      const left = Math.min(...xs),
        right = Math.max(...xs),
        top = Math.min(...ys),
        bottom = Math.max(...ys);
      return {
        layer,
        index,
        angle,
        inner,
        outer,
        half,
        cx: (left + right) / 2,
        cy: (top + bottom) / 2,
        size: Math.max(right - left, bottom - top) + 8,
        radius: (inner + outer) / 2,
      };
    }),
  ).flat();
  const loveRosePhoto = document.createElement("img"),
    loveRosePhotoPlate = document.createElement("canvas"),
    loveRoseFragments = [];
  let loveRosePhotoReady = false;
  loveRosePhoto.addEventListener("load", () => {
    loveRosePhotoPlate.width = loveRosePhotoPlate.height = 512;
    loveRosePhotoPlate
      .getContext("2d")
      .drawImage(loveRosePhoto, 0, 0, 512, 512);
    loveRosePhotoReady = true;
    loveRoseCache.clear();
    loveRoseFragments.length = 0;
  });
  loveRosePhoto.src = initialAssets.rosePhoto;
  function loveRoseFragment(petal) {
    const index = loveRosePetals.indexOf(petal);
    if (loveRoseFragments[index]) return loveRoseFragments[index];
    if (!loveRosePhotoReady) return null;
    const tile = document.createElement("canvas");
    tile.width = tile.height = 160;
    const c = tile.getContext("2d"),
      scale = 160 / petal.size;
    c.scale(scale, scale);
    c.translate(petal.size / 2 - petal.cx, petal.size / 2 - petal.cy);
    c.beginPath();
    c.arc(
      16,
      -38,
      petal.outer + 2,
      petal.angle - petal.half - 0.012,
      petal.angle + petal.half + 0.012,
    );
    if (petal.inner)
      c.arc(
        16,
        -38,
        Math.max(0, petal.inner - 2),
        petal.angle + petal.half + 0.012,
        petal.angle - petal.half - 0.012,
        true,
      );
    else c.lineTo(16, -38);
    c.closePath();
    c.clip();
    c.drawImage(loveRosePhotoPlate, -256, -256, 512, 512);
    loveRoseFragments[index] = tile;
    return tile;
  }
  // Visible programme entry, dimension-specific renderer and one host clock.
  let phoenix = null,
    phoenixAttempt = 0;
  const phoenixRuntimes = { "2d": null, "3d": null, dragon: null },
    phoenixPreparations = { "2d": null, "3d": null, dragon: null };
  const programmeSurfaces = {
    "2d": "phoenixFlatStage",
    "3d": "phoenixStage",
    dragon: "dragonStage",
  };
  const dragonActs = [
    { at: 0, title: "游龙破雾", line: "星河初醒，云随龙动。" },
    { at: 4, title: "直冲云霄", line: "长身凌空，一跃九霄。" },
    { at: 7, title: "凌空定势", line: "踏云御风，蓄势于一息。" },
    { at: 8.2, title: "龙吟九霄", line: "一声长吟，唤醒万重云海。" },
    { at: 9.6, title: "御雷", line: "千钧雷霆，应声而至。" },
    { at: 12.6, title: "回身蓄冲", line: "云开雷歇，锋芒收于长身。" },
    { at: 15, title: "破空直冲", line: "穿过星河，迎面而来。" },
    { at: 19.6, title: "电光余响", line: "龙归星河，余光仍在。" },
  ];
  const phoenixActs = [
    { at: 0, title: "火种 · 静待新生", line: "夜色深处，藏着一颗不灭的火种。" },
    { at: 2.8, title: "涅槃 · 破卵而出", line: "浴火而生，振羽照亮长夜。" },
    { at: 5, title: "浴火 · 翩然起舞", line: "让流光随羽，让天地随心。" },
    { at: 14, title: "凝神 · 扶正身姿", line: "万千火光，收于一息之间。" },
    { at: 16.4, title: "蓄势 · 抱翼聚焰", line: "敛翼藏锋，静待下一次盛放。" },
    { at: 18.2, title: "大招 · 火羽流星", line: "展翼唤星火，流羽落九天。" },
    {
      at: 20.5,
      title: "凤舞九天 · 直冲云霄",
      line: "一飞冲霄，把光留给人间。",
    },
    { at: 27, title: "余焰 · 星火归夜", line: "这一场火光，留在心上。" },
  ];
  const phoenixEase = (v) => {
    v = clamp(v, 0, 1);
    return v * v * v * (10 + v * (-15 + 6 * v));
  };
  function phoenixSoundCues(mode) {
    if (mode === "dragon") return [];
    const rows =
      mode === "2d"
        ? [
            [0.2, "fire", 0.5, 0.1],
            [1.78, "burst", 0.5, 0.65],
            [2.3, "call", 0.5, 0.34],
            [4.72, "wing", 0.35, 0.13],
            [5.65, "wing", 0.65, 0.12],
            [7.15, "air", 0.7, 0.1],
            [8.45, "wing", 0.3, 0.11],
            [10.2, "lift", 0.5, 0.15],
            [11.6, "rush", 0.5, 2.2],
            [12.0, "call", 0.5, 0.4],
            [15.1, "bloom", 0.27, 0.08],
            [16.2, "bloom", 0.73, 0.07],
            [18.3, "chime", 0.5, 0.05],
          ]
        : [
            [0.18, "fire", 0.5, 0.085],
            [1.25, "fire", 0.5, 0.1],
            [2.75, "burst", 0.5, 0.78],
            [3.12, "call", 0.5, 0.34],
            [4.7, "wing", 0.35, 0.12],
            [6.3, "wing", 0.66, 0.11],
            [8.3, "wing", 0.33, 0.1],
            [10.45, "wing", 0.65, 0.1],
            [12.5, "air", 0.5, 0.08],
            [15.0, "fire", 0.5, 0.07],
            [16.6, "lift", 0.5, 0.13],
            [18.3, "air", 0.5, 0.18],
            [18.65, "burst", 0.5, 0.7],
            [18.9, "call", 0.5, 0.4],
            [19.1, "rush", 0.5, 1.5],
            [19.7, "fire", 0.25, 0.08],
            [20.55, "rush", 0.5, 2.7],
            [21.3, "wing", 0.5, 0.11],
            [23.5, "bloom", 0.3, 0.06],
            [24.1, "bloom", 0.7, 0.055],
            [26.1, "chime", 0.5, 0.04],
          ];
    return rows.map(([at, kind, pan, gain], i) => ({
      at,
      kind,
      pan,
      gain,
      variant: i % 3,
    }));
  }
  function phoenixFailure(error) {
    if (!phoenix) return;
    stopSoundVoices();
    phoenix.status = "error";
    phoenix.error = error;
    phoenix.uiAt = -1;
    phoenix.runtime?.stopAudio?.();
    $(phoenix.surface).hidden = true;
    syncPhoenixUI(true);
    syncPerformanceScore();
  }
  async function preparePhoenix(mode, abort) {
    if (phoenixRuntimes[mode]?.ready) return phoenixRuntimes[mode];
    if (phoenixPreparations[mode]) return phoenixPreparations[mode].promise;
    const url =
      (mode === "dragon"
        ? "./dragon-theatre.js?rev=17-cinematic"
        : mode === "2d"
          ? "./phoenix-theatre-2d.js?rev=v18-responsive"
          : "./phoenix-theatre.js?rev=v18-responsive") +
      "&attempt=" +
      ++phoenixAttempt;
    const preparation = { abort, promise: null };
    phoenixPreparations[mode] = preparation;
    preparation.promise = (
      window.phoenixAssetBundle
        ? window.phoenixAssetBundle.load(url)
        : import(url)
    )
      .then((module) => {
        abort.signal.throwIfAborted();
        const create =
          mode === "dragon"
            ? module.createDragonTheatre
            : module.createPhoenixTheatre;
        return create({
          resolveAsset: window.phoenixAssetBundle?.resolveAsset,
          signal: abort.signal,
          canvas: $(programmeSurfaces[mode]),
          onAudioError() {
            if (phoenix?.mode === mode)
              notify("飞龙音轨暂不可用，画面继续播放。");
          },
          onContextLost() {
            const stale = phoenixRuntimes[mode];
            phoenixRuntimes[mode] = null;
            phoenixPreparations[mode] = null;
            stale?.dispose();
            if (phoenix?.mode === mode)
              phoenixFailure(new Error("舞台暂时中断"));
          },
        });
      })
      .then((runtime) => {
        if (abort.signal.aborted) {
          runtime.dispose?.();
          abort.signal.throwIfAborted();
        }
        phoenixRuntimes[mode] = runtime;
        return runtime;
      })
      .catch((error) => {
        if (phoenixPreparations[mode] === preparation)
          phoenixPreparations[mode] = null;
        throw error;
      });
    return preparation.promise;
  }
  async function startPhoenixShow(kind = "phoenix") {
    if (kind === "dragon" && state.view !== "3d") return;
    const previous = phoenix?.previous ?? {
      immersed: state.immersed,
      paused: state.paused,
    };
    const mode = kind === "dragon" ? "dragon" : state.view,
      duration = mode === "dragon" ? 21.6 : mode === "2d" ? 22 : 27,
      surface = programmeSurfaces[mode];
    if (story) stopAliceStory();
    if (textCloud) finishWishShow(true);
    if (cameraState !== "off") stopCamera();
    if (state.immersed) setImmersed(false);
    if (state.paused) togglePause();
    phoenix?.runtime?.stopAudio?.();
    stopSoundVoices();
    if (phoenix?.status === "loading") {
      phoenix.abort.abort();
      phoenixPreparations[phoenix.mode] = null;
    }
    const show = {
      mode,
      duration,
      end: duration + (mode === "dragon" ? 0 : 1.4),
      surface,
      abort: new AbortController(),
      age: 0,
      status: "loading",
      finished: false,
      previous,
      act: -1,
      uiAt: -1,
      lastCue: -1,
      soundCues: phoenixSoundCues(mode),
      frameTimes: [],
      slowFrames: [],
      uiVisibleUntil: performance.now() + 2200,
    };
    phoenix = show;
    wish = mode === "dragon" ? "飞龙在天" : "凤舞九天";
    particles = [];
    rockets = [];
    ordinaryComets = [];
    pending = [];
    meteors = [];
    skyPaths = [];
    flashes = [];
    pointer = null;
    specialCaption = null;
    specialUntil = 0;
    audioController.accentUntil = 0;
    fx.clearRect(0, 0, w, h);
    nearFx.clearRect(0, 0, w, h);
    closePanels();
    clearTimeout(notify.timer);
    $("toast").hidden = true;
    document.body.classList.toggle("phoenix-mode", true);
    document.body.classList.toggle("dragon-mode", mode === "dragon");
    document.body.classList.toggle("dragon-quiet", false);
    for (const id of Object.values(programmeSurfaces)) $(id).hidden = true;
    $("phoenixHud").hidden = false;
    $("programmeTitle").textContent = wish;
    $("programmeKicker").textContent =
      mode === "dragon"
        ? "DRAGON · THUNDER ABOVE THE CLOUDS"
        : "PHOENIX · REBIRTH IN FLAME";
    $("phoenixHud").setAttribute("aria-label", wish + "演出");
    $("phoenixProgress").setAttribute("aria-label", wish + "演出进度");
    document.body.dataset.programme = mode === "dragon" ? "dragon" : "phoenix";
    $("phoenixProgress").setAttribute("aria-valuemax", String(duration));
    document.body.dataset.phoenixDimension = mode;
    $("wishSubmit").disabled = true;
    $("wishStop").hidden = false;
    syncPhoenixUI(true);
    syncPerformanceScore();
    $("phoenixHud").focus();
    if (mode === "dragon") {
      initAudio();
      syncAudioPlayback();
    }
    try {
      const runtime = await preparePhoenix(mode, show.abort);
      if (phoenix !== show) return;
      if (audioController.context) {
        if (mode === "dragon")
          await runtime.prepareAudio?.(
            audioController.context,
            audioController.output,
          );
        else await preparePhoenixCall();
      }
      if (phoenix !== show) return;
      if (!runtime.ready) throw new Error("舞台尚未准备好");
      show.runtime = runtime;
      runtime.render(0, w, h, programmePixelRatio(), horizon);
      $(surface).hidden = false;
      $(surface).style.opacity = "0";
      show.status = "ready";
      show.uiAt = -1;
      show.uiVisibleUntil = performance.now() + 2200;
      lastFrame = 0;
      document.body.dataset.phoenixModel = JSON.stringify(runtime.inspect());
      initAudio();
      syncPerformanceScore();
      alignProgrammeScore();
      syncPhoenixAudio();
      syncPhoenixUI(true);
    } catch (error) {
      if (phoenix === show) phoenixFailure(error);
    }
  }
  function stopPhoenixShow() {
    if (!phoenix) return;
    const previous = phoenix.previous,
      trigger = phoenix.mode === "dragon" ? "dragonShowBtn" : "phoenixShowBtn";
    phoenix.runtime?.stopAudio?.();
    stopSoundVoices();
    if (phoenix.status === "loading") {
      phoenix.abort.abort();
      phoenixPreparations[phoenix.mode] = null;
    }
    phoenix = null;
    for (const id of Object.values(programmeSurfaces)) {
      $(id).hidden = true;
      $(id).style.opacity = "0";
    }
    $("phoenixHud").hidden = true;
    document.body.classList.toggle("phoenix-mode", false);
    document.body.dataset.phoenixState = "idle";
    document.body.classList.toggle("dragon-mode", false);
    document.body.classList.toggle("dragon-quiet", false);
    document.body.dataset.dragonState = "idle";
    document.body.dataset.programme = "ambient";
    wish = "";
    textCloud = null;
    $("wishSubmit").disabled = !validWish();
    $("wishSubmit").textContent = "让祝福绽放";
    $("wishStop").hidden = true;
    if (state.paused !== previous.paused) togglePause();
    nextAuto = clock + 1.2;
    lastFrame = 0;
    depthDirty = true;
    updateCaption();
    syncPerformanceScore();
    syncAudioPlayback();
    if (previous.immersed) setImmersed(true);
    else $(trigger).focus();
  }
  function syncPhoenixUI(force = false) {
    const show = phoenix;
    if (!show) return;
    const dragon = show.mode === "dragon",
      acts = dragon ? dragonActs : phoenixActs,
      act = acts.findLastIndex((a) => show.age >= a.at),
      flat =
        show.mode === "2d" &&
        show.runtime?.phase(Math.min(show.duration, show.age)),
      phase = flat ? { title: flat[0], line: flat[1] } : acts[Math.max(0, act)];
    const message =
      show.status === "loading"
        ? "正在准备演出…"
        : show.status === "error"
          ? dragon
            ? "飞龙演出暂未载入，请重试或返回剧场。"
            : "火种暂时未能点亮，请重试。"
          : phase.line;
    if (force || act !== show.act || message !== show.message) {
      show.act = act;
      show.message = message;
      $("phoenixActTitle").textContent = show.finished
        ? dragon
          ? "龙归星河"
          : "星火不息"
        : show.status === "loading"
          ? dragon
            ? "候龙入云"
            : "静候火种"
          : show.status === "error"
            ? "演出暂未就绪"
            : phase.title;
      $("phoenixCaption").textContent = message;
      $(show.surface).setAttribute(
        "aria-label",
        (dragon ? "飞龙在天。" : "凤舞九天。") + phase.title + "。" + message,
      );
    }
    $("phoenixPauseBtn").disabled = show.status !== "ready" || show.finished;
    $("phoenixPauseBtn").textContent = state.paused ? "继续" : "暂停";
    $("phoenixPauseBtn").setAttribute("aria-pressed", String(state.paused));
    $("phoenixReplayBtn").hidden = !show.finished && show.status !== "error";
    $("phoenixReplayBtn").textContent =
      show.status === "error"
        ? dragon
          ? "重新载入"
          : "重新点燃"
        : dragon
          ? "再看一次 ↗"
          : "再舞一次 ↗";
    document.body.dataset.phoenixState =
      show.status === "ready"
        ? show.finished
          ? "ended"
          : state.paused
            ? "paused"
            : "playing"
        : show.status;
    document.body.dataset.phoenixTime = show.age.toFixed(4);
    document.body.dataset.dragonState = dragon
      ? document.body.dataset.phoenixState
      : "idle";
    if (dragon) document.body.dataset.dragonTime = show.age.toFixed(4);
    if (!force && show.age - show.uiAt < 0.15) return;
    show.uiAt = show.age;
    const time = Math.min(show.duration, show.age);
    $("phoenixTime").textContent = dragon
      ? time.toFixed(1) + " / 21.6 秒"
      : "00:" +
        String(Math.floor(time)).padStart(2, "0") +
        " / 00:" +
        show.duration;
    $("phoenixProgress").style.setProperty(
      "--phoenix-fill",
      (time / show.duration) * 100 + "%",
    );
    $("phoenixProgress").setAttribute("aria-valuenow", time.toFixed(1));
  }
  function advancePhoenixShow(dt, elapsed) {
    const show = phoenix;
    if (!show || show.status !== "ready" || show.finished) return;
    show.frameTimes.push(elapsed);
    if (elapsed > 25)
      show.slowFrames.push({ time: show.age, milliseconds: elapsed });
    show.age = Math.min(
      show.end,
      show.mode === "dragon"
        ? show.runtime.audioTime(show.age + dt)
        : show.age + dt,
    );
    const cues = show.soundCues;
    for (let i = show.lastCue + 1; i < cues.length; i++) {
      const cue = cues[i];
      if (show.age < cue.at) break;
      if (cue.kind === "burst") boom(cue.pan, cue.gain);
      else if (cue.kind === "rush")
        whoosh(cue.pan, { duration: cue.gain, from: cue.pan });
      else playTheatreEffect(cue.kind, cue.pan, cue.gain, cue.variant);
      show.lastCue = i;
    }
    if (show.age >= show.end) {
      show.finished = true;
      const times = [...show.frameTimes].sort((a, b) => a - b);
      document.body.dataset.phoenixFrames = JSON.stringify({
        frames: times.length,
        p95: times[Math.floor(times.length * 0.95)],
        max: times.at(-1),
        over50: times.filter((t) => t > 50).length,
        slowFrames: show.slowFrames,
      });
      show.runtime?.stopAudio?.();
      if (show.mode === "dragon") syncAudioPlayback();
      syncPerformanceScore();
      syncPhoenixUI(true);
    } else syncPhoenixUI();
  }
  function programmePixelRatio() {
    return state.quality === "low"
      ? Math.min(devicePixelRatio || 1, 1)
      : devicePixelRatio || 1;
  }
  function paintPhoenixShow() {
    const show = phoenix;
    if (!show) return;
    const keyboardFocus = document.activeElement?.matches?.(
      ".phoenix-controls button:focus-visible,.phoenix-replay:focus-visible",
    );
    document.body.classList.toggle(
      "dragon-quiet",
      show.mode === "dragon" &&
        show.status === "ready" &&
        !show.finished &&
        !state.paused &&
        !keyboardFocus &&
        performance.now() > show.uiVisibleUntil,
    );
    if (show.status !== "ready" || show.finished) {
      if (show.finished) $(show.surface).hidden = true;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.drawImage(backdrop, 0, 0, w, h);
      return;
    }
    const opacity =
      phoenixEase(show.age / 0.7) *
      (1 -
        phoenixEase(
          show.mode === "dragon"
            ? (show.age - (show.duration - 0.8)) / 0.8
            : (show.age - show.duration) / 1.4,
        ));
    $(show.surface).style.opacity = String(opacity);
    if (opacity < 1 || show.mode === "2d") {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.drawImage(backdrop, 0, 0, w, h);
    }
    try {
      show.runtime.render(
        Math.min(show.duration, show.age),
        w,
        h,
        programmePixelRatio(),
        horizon,
      );
    } catch (error) {
      show.runtime?.dispose();
      phoenixRuntimes[show.mode] = null;
      phoenixPreparations[show.mode] = null;
      phoenixFailure(error);
    }
  }
  $("phoenixPauseBtn").addEventListener("click", () => {
    if (phoenix?.status === "ready" && !phoenix.finished) togglePause();
  });
  $("phoenixExitBtn").addEventListener("click", stopPhoenixShow);
  $("phoenixReplayBtn").addEventListener("click", () => {
    if (phoenix)
      startPhoenixShow(phoenix.mode === "dragon" ? "dragon" : "phoenix");
  });
  function syncPhoenixAudio() {
    const show = phoenix;
    if (show?.mode !== "dragon" || !show.runtime) return;
    show.runtime.syncAudio({
      context: audioController.context,
      output: audioController.output,
      time: show.age,
      playing:
        state.sound &&
        !state.paused &&
        !document.hidden &&
        show.status === "ready" &&
        !show.finished,
      music:
        soundPreferences.followShows && soundPreferences.music
          ? soundPreferences.musicVolume * 0.8 * Math.pow(10, 6.78 / 20)
          : 0,
      effects: soundPreferences.effects
        ? soundPreferences.effectsVolume * 0.75
        : 0,
    });
    document.body.dataset.dragonAudio = JSON.stringify(
      show.runtime.audioInspect(),
    );
  }
  function revealDragonControls() {
    if (phoenix?.mode === "dragon")
      phoenix.uiVisibleUntil = performance.now() + 2200;
  }
  addEventListener("pointermove", revealDragonControls, { passive: true });
  addEventListener("pointerdown", revealDragonControls, { passive: true });
  addEventListener("focusin", revealDragonControls);
  addEventListener("keydown", revealDragonControls);
  $("dragonStage").addEventListener("click", () => {
    if (
      phoenix?.mode === "dragon" &&
      phoenix.status === "ready" &&
      !phoenix.finished
    )
      togglePause();
  });
  const isLoveWish = (text) => text.trim().toLowerCase() === "magic";
  function loveEase(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }
  function loveHeartbeat(local, period, beats) {
    const phase = local % period;
    let pulse = 0;
    for (const [at, width, weight] of beats)
      for (const cycle of [-1, 0, 1])
        pulse +=
          weight * Math.exp(-(((phase - at + cycle * period) / width) ** 2));
    return pulse;
  }
  function loveRoseRainBlend(show) {
    return loveEase((show.age - (show.finaleRainAt ?? Infinity)) / 1.2);
  }
  function loveProject(x, y, z = 0) {
    const focal = depthFocal(),
      distance = focal + z;
    if (distance < focal * 0.14) return null;
    const scale = focal / distance;
    return {
      x: w * 0.5 + (x - w * 0.5) * scale,
      y: h * 0.44 + (y - h * 0.44) * scale,
      scale,
      z,
    };
  }
  function loveWordFlight(r, t) {
    const g = textCloud?.kind === "love" ? textCloud.glyphs[r.loveWord] : null,
      u = t * t * (3 - 2 * t),
      a =
        (g?.finaleOnly
          ? g.finaleOrder / 6
          : (g?.languageIndex ?? r.loveWord) / loveLanguages.length) *
          TAU +
        0.37,
      focal = depthFocal(),
      far = 7.3,
      initial = 1 / (1 + far),
      cx = w * 0.5,
      cy = h * 0.44,
      sx = (Math.cos(a) * w * 0.4) / initial,
      sy = (Math.sin(a) * h * 0.29) / initial,
      bend = r.curved ? Math.sin(u * Math.PI) : 0;
    const x =
        cx + sx * (1 - u) + (r.tx - cx) * u + Math.sin(a) * w * 0.3 * bend,
      y = cy + sy * (1 - u) + (r.ty - cy) * u + Math.cos(a) * h * 0.17 * bend,
      z = focal * far * (1 - u),
      p = loveProject(x, y, z);
    return { ...p, scale: 0.12 + 1.48 * u, depth: z };
  }
  function lovePlaneFrame(pose) {
    const origin = loveProject(pose.x, pose.y, pose.z);
    if (!origin) return null;
    const yaw = pose.yaw || 0,
      pitch = pose.pitch || 0,
      roll = pose.roll || 0,
      c = Math.cos(roll),
      s = Math.sin(roll),
      xx = Math.cos(yaw) * c,
      xy = Math.cos(yaw) * -s,
      zx = -Math.sin(yaw) * c,
      zy = Math.sin(yaw) * s;
    const za = s * Math.sin(pitch) + zx * Math.cos(pitch),
      zb = c * Math.sin(pitch) + zy * Math.cos(pitch),
      x = loveProject(
        pose.x + xx,
        pose.y + s * Math.cos(pitch) - zx * Math.sin(pitch),
        pose.z + za,
      ),
      y = loveProject(
        pose.x + xy,
        pose.y + c * Math.cos(pitch) - zy * Math.sin(pitch),
        pose.z + zb,
      );
    if (!x || !y) return null;
    return {
      origin,
      ax: x.x - origin.x,
      ay: x.y - origin.y,
      bx: y.x - origin.x,
      by: y.y - origin.y,
      z: pose.z,
      za,
      zb,
    };
  }
  function lovePlane(image, pose, width, height, alpha, surface = ctx) {
    if (alpha < 0.005) return;
    const m = lovePlaneFrame(pose);
    if (!m) return;
    surface.save();
    surface.globalAlpha = alpha;
    surface.globalCompositeOperation = "source-over";
    surface.transform(m.ax, m.ay, m.bx, m.by, m.origin.x, m.origin.y);
    if (typeof image === "function") image(surface);
    else surface.drawImage(image, -width / 2, -height / 2, width, height);
    surface.restore();
  }
  function loveMovingPlanePoint(poseAt, at, dx, dy) {
    // Emit from the same projected plane that paints the source, including its local depth.
    const point = (t) => {
      const m = lovePlaneFrame(poseAt(t)),
        z = m.z + m.za * dx + m.zb * dy,
        scale = depthFocal() / (depthFocal() + z);
      return {
        x: w * 0.5 + (m.origin.x + m.ax * dx + m.bx * dy - w * 0.5) / scale,
        y: h * 0.44 + (m.origin.y + m.ay * dx + m.by * dy - h * 0.44) / scale,
        z,
      };
    };
    const p = point(at),
      before = point(at - 0.001),
      after = point(at + 0.001);
    return {
      ...p,
      vx: (after.x - before.x) / 0.002,
      vy: (after.y - before.y) / 0.002,
      vz: (after.z - before.z) / 0.002,
    };
  }
  function lovePetalTravel(origin, local, vx, vy, vz, gravity) {
    const carry = 0.55 * (1 - Math.exp(-local / 0.55)),
      travel = local - 0.3 * (1 - Math.exp(-local / 0.3));
    return loveProject(
      origin.x + origin.vx * carry + vx * travel,
      origin.y + origin.vy * carry + vy * travel + gravity * local * local,
      origin.z + origin.vz * carry + vz * travel,
    );
  }
  function loveWordPetalOrigin(show, g, index, count, release, spread) {
    let cache = g.rainOrigins;
    if (
      !cache ||
      cache.release !== release ||
      cache.count !== count ||
      cache.width !== w ||
      cache.height !== h ||
      cache.view !== state.view ||
      cache.reduced !== reduced.matches
    )
      cache = g.rainOrigins = {
        release,
        count,
        width: w,
        height: h,
        view: state.view,
        reduced: reduced.matches,
        points: [],
      };
    if (!cache.points[index]) {
      const q = g.points[
        Math.floor(((index + 0.5) / count) * g.points.length)
      ] || { dx: 0, dy: 0 };
      cache.points[index] = loveMovingPlanePoint(
        (at) => loveWordPose(show, g, at),
        release + 0.08 + (index / count) * spread,
        q.dx,
        q.dy,
      );
    }
    return cache.points[index];
  }
  function loveHeartMotion(show, age = show.age) {
    const old = show.heartMotion;
    if (
      old &&
      old.age === age &&
      old.width === w &&
      old.height === h &&
      old.view === state.view &&
      old.reduced === reduced.matches
    )
      return old;
    const local = Math.max(0, age - 4.4),
      motion = reduced.matches ? 0 : clamp(local / 1.2, 0, 1),
      spatial = state.view === "3d",
      beat = loveHeartbeat(local, 1.35, [
        [0.2, 0.13, 1],
        [0.43, 0.11, 0.4],
      ]),
      yaw = spatial ? Math.sin(local * 0.53) * 0.13 * motion : 0,
      pitch = spatial ? Math.sin(local * 0.37) * 0.04 * motion : 0,
      roll = Math.sin(local * 0.43) * 0.012 * motion;
    const result = {
      age,
      width: w,
      height: h,
      view: state.view,
      reduced: reduced.matches,
      cy: show.heartFrame.top + show.heartFrame.height * 0.5,
      pulse: 1 + beat * 0.022 * motion,
      cyaw: Math.cos(yaw),
      syaw: Math.sin(yaw),
      cp: Math.cos(pitch),
      sp: Math.sin(pitch),
      cr: Math.cos(roll),
      sr: Math.sin(roll),
      roll,
    };
    if (age === show.age) show.heartMotion = result;
    return result;
  }
  function loveHeartPosition(show, hx, hy, hz = 0, age = show.age) {
    const frame = show.heartFrame,
      m = loveHeartMotion(show, age),
      x = hx * frame.halfWidth * m.pulse,
      y = (hy - 0.5) * frame.height * m.pulse,
      z = state.view === "3d" ? hz * depthFocal() : 0,
      rx = x * m.cyaw + z * m.syaw,
      rz = z * m.cyaw - x * m.syaw,
      py = y * m.cp - rz * m.sp,
      pz = y * m.sp + rz * m.cp;
    return loveProject(
      w * 0.5 + rx * m.cr - py * m.sr,
      m.cy + rx * m.sr + py * m.cr,
      pz,
    );
  }
  function loveWordDrift(show, g, age = show.age) {
    const old = g.heartPose;
    if (
      age === show.age &&
      old &&
      old.age === age &&
      old.width === w &&
      old.height === h &&
      old.view === state.view &&
      old.reduced === reduced.matches
    )
      return old;
    const p = loveHeartPosition(show, g.hx, g.hy, g.hz, age),
      m = loveHeartMotion(show, age),
      local = Math.max(0, age - 4.4),
      roll =
        m.roll * 0.45 +
        (reduced.matches
          ? 0
          : Math.sin(local * 0.68 + g.rank * 2.4) * 0.008 * clamp(local, 0, 1)),
      result = {
        ...p,
        roll,
        age,
        width: w,
        height: h,
        view: state.view,
        reduced: reduced.matches,
      };
    if (age === show.age) g.heartPose = result;
    return result;
  }
  function loveWordPose(show, g, age = show.age) {
    const form = clamp((age - g.born) / 1.2, 0, 1),
      u = 1 - (1 - form) ** 3,
      spatial = state.view === "3d",
      p = g.finaleOnly
        ? loveFinalWordDrift(show, g, age)
        : loveWordDrift(show, g, age),
      scale = p.scale * (spatial ? 0.55 + 0.45 * u : 0.94 + 0.06 * u),
      z = depthFocal() * (1 / scale - 1),
      side = g.rank % 2 ? -1 : 1,
      motion = reduced.matches ? 0 : 1;
    return {
      x: w * 0.5 + (p.x - w * 0.5) / scale,
      y: h * 0.44 + (p.y - h * 0.44) / scale,
      z,
      yaw: spatial ? side * 0.65 * (1 - u) * motion + (p.yaw || 0) * u : 0,
      pitch: spatial ? -0.3 * (1 - u) * motion + (p.pitch || 0) * u : 0,
      roll: p.roll,
      form,
      scale,
      screenX: p.x,
      screenY: p.y,
    };
  }
  function loveWordRelease(g) {
    return 7.8 + g.releaseOrder * 0.035;
  }
  function loveWordOpacity(show, g) {
    const t = clamp((show.age - loveWordRelease(g)) / 1.6, 0, 1);
    return 1 - t * t * (3 - 2 * t);
  }
  function wordPetalAtlas() {
    if (loveWordPetalAtlas) return loveWordPetalAtlas;
    const sheet = document.createElement("canvas");
    sheet.width = 960;
    sheet.height = 960;
    const c = sheet.getContext("2d");
    for (let back = 0; back < 2; back++)
      for (let tone = 0; tone < 3; tone++)
        for (let color = 0; color < 6; color++)
          c.drawImage(
            lovePetalTexture(
              [331, 337, 343, 349, 355, 38][color],
              tone * 2,
              Boolean(back),
            ),
            color * 160,
            tone * 160 + back * 480,
            160,
            160,
          );
    loveWordPetalAtlas = sheet;
    return sheet;
  }
  function lovePetalTumble(time, phase, motion = 1, unfold = 1) {
    const t = time * motion,
      yaw =
        (phase +
          t * (0.95 + 0.18 * Math.sin(phase)) +
          0.2 * Math.sin(t * 0.85 + phase)) *
        unfold,
      pitch = Math.sin(t * 0.72 + phase * 0.63) * 0.34 * unfold,
      a = Math.cos(yaw),
      b = Math.sin(yaw) * Math.sin(pitch),
      d = Math.cos(pitch),
      face = a * d;
    return {
      a,
      b,
      c: 0,
      d,
      yaw,
      pitch,
      front: loveEase((face + 0.18) / 0.36),
      light: 0.82 + 0.18 * Math.abs(face),
      edge: (1 - Math.abs(face)) ** 5,
      bend: Math.sin(yaw),
    };
  }
  function lovePetalScreenFade(y) {
    const clip = meshRoseViewport();
    return (
      loveEase((y - clip.top) / clip.feather) *
      loveEase((clip.bottom - y) / clip.feather)
    );
  }
  function queueLoveCurvedPetal(p, alpha, layer = 0) {
    if (state.view !== "3d" || !prepareRoseMeshGpu()) return false;
    if (alpha < 0.003) return true;
    // A shared curved surface, rather than a camera-facing disc. Keep the source's world depth and projected size.
    const shape = meshRosePetals[[0, 9, 18][Math.floor(layer / 2) % 3]],
      t = p.tumble,
      scale = p.scale || 1,
      matrix = meshRoseMatrix({
        size: (512 * p.size * 0.78) / (155 * scale),
        yaw: t.yaw,
        pitch: t.pitch,
        roll: p.rotation,
      }),
      pivot = meshRosePoint(shape, 0, 0.55, 1, 0);
    loveCurvedPetals.push({
      p: shape,
      center: {
        x: w * 0.5 + (p.x - w * 0.5) / scale,
        y: h * 0.44 + (p.y - h * 0.44) / scale,
        z: p.z,
      },
      matrix,
      pivot,
      open: 1,
      time: 0,
      alpha,
      near: scale > 1.3,
      z: p.z,
    });
    return true;
  }
  function flushLoveCurvedPetals() {
    if (loveCurvedPetals.length)
      drawRoseMeshBatch(loveCurvedPetals.sort((a, b) => b.z - a.z));
    loveCurvedPetals.length = 0;
  }
  function paintLovePetalFaces(surface, front, back, size, tumble) {
    const alpha = surface.globalAlpha;
    if (tumble.front > 0) {
      surface.globalAlpha = alpha * tumble.light * tumble.front;
      surface.drawImage(...front, -size / 2, -size / 2, size, size);
    }
    if (tumble.front < 1) {
      surface.globalAlpha = alpha * tumble.light * (1 - tumble.front);
      surface.drawImage(...back, -size / 2, -size / 2, size, size);
    }
    surface.globalAlpha = alpha;
  }
  function paintLovePetalEdge(surface, size, tumble) {
    if (size < 7 || tumble.edge < 0.08) return;
    surface.save();
    surface.globalAlpha *= tumble.edge * 0.65;
    surface.strokeStyle = "#f6b3bd";
    surface.lineWidth = Math.max(0.35, Math.min(0.7, size * 0.018));
    surface.beginPath();
    surface.moveTo(0, size * 0.3);
    surface.bezierCurveTo(
      tumble.bend * size * 0.065,
      size * 0.08,
      -tumble.bend * size * 0.045,
      -size * 0.21,
      tumble.bend * size * 0.03,
      -size * 0.36,
    );
    surface.stroke();
    surface.restore();
  }
  function drawLoveWords(show) {
    for (const g of show.glyphs) {
      if (g.finaleOnly) continue;
      if (g.born === null) {
        const r = g.comet;
        if (!r || state.view !== "3d") continue;
        const t = clamp(r.age / r.duration, 0, 1);
        if (t < 0.35) continue;
        const head = depthShellPoint(r),
          u = t * t * (3 - 2 * t),
          scale = 0.1 + 0.45 * u,
          side = g.rank % 2 ? -1 : 1,
          motion = reduced.matches ? 0.2 : 1,
          pose = {
            x: w * 0.5 + (head.x - w * 0.5) / scale,
            y: h * 0.44 + (head.y - h * 0.44) / scale,
            z: depthFocal() * (1 / scale - 1),
            yaw: side * 0.65 * motion,
            pitch: -0.3 * motion,
          };
        loveTextPlane(
          g.plate.canvas,
          pose,
          g.width,
          g.height,
          clamp((t - 0.35) / 0.4, 0, 1) * 0.52,
        );
        continue;
      }
      const alpha =
        loveWordOpacity(show, g) *
        (0.52 + 0.48 * clamp((show.age - g.born) / 0.25, 0, 1));
      if (alpha < 0.005) continue;
      loveTextPlane(
        g.plate.canvas,
        loveWordPose(show, g),
        g.width,
        g.height,
        alpha,
      );
    }
  }
  function drawLoveFinalWords(show, exit) {
    for (const { g, x, y, scale } of loveFinalWords(show)) {
      if (g.born === null) continue;
      const local = show.age - g.born,
        form = clamp(local / 1.2, 0, 1),
        spread = 1 - (1 - form) ** 3;
      if (form < 1 && !reduced.matches)
        for (let i = 0; i < g.points.length; i += 4) {
          const q = g.points[i],
            a = q.seed + g.rank,
            scatter = Math.sin(form * Math.PI) * g.font * scale * 0.7,
            xx = x + q.dx * scale * spread + Math.cos(a) * scatter,
            yy = y + q.dy * scale * spread + Math.sin(a) * scatter,
            type =
              show.effect === "mix"
                ? materialTypes[Math.floor(i / 4) % 5]
                : show.effect,
            size = (type === "gold" ? 3 : 7) * scale,
            hue = show.rainbow ? g.hue + i * 47 : g.hue,
            alpha = (1 - form) * 0.75 * exit;
          if (!gpuLoveMote(ctx, xx, yy, size, hue, type, alpha)) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.drawImage(
              sprite(hue, type),
              xx - size / 2,
              yy - size / 2,
              size,
              size,
            );
            ctx.restore();
          }
        }
      loveTextPlane(
        g.plate.canvas,
        loveWordPose(show, g),
        g.width,
        g.height,
        clamp(local / 0.55, 0, 1) * loveFinalWordOpacity(show, g) * exit,
      );
    }
    drawLovePetalPoints(loveFinalWordPetals(show), exit);
  }
  function loveWordPetals(show) {
    const count = reduced.matches ? 3 : w < 700 ? 9 : 14,
      petals = [];
    for (const g of show.glyphs) {
      const release = loveWordRelease(g),
        elapsed = show.age - release;
      if (g.finaleOnly || g.born === null || elapsed < 0 || elapsed > 6.3)
        continue;
      const focal = depthFocal();
      for (let i = 0; i < count; i++) {
        const local = elapsed - 0.08 - (i / count) * 0.9;
        if (local < 0 || local > 5.1) continue;
        const origin = loveWordPetalOrigin(show, g, i, count, release, 0.9),
          phase = i * 2.39996 + g.rank * 1.7,
          motion = reduced.matches ? 0.2 : 1,
          p = lovePetalTravel(
            origin,
            local,
            Math.sin(phase) * (16 + (g.rank % 3) * 4) * motion,
            8 + Math.cos(phase) * 5,
            state.view === "3d"
              ? focal * (i % 5 === 0 ? -0.13 : 0.025 + (i % 3) * 0.025) * motion
              : 0,
            11,
          );
        if (!p) continue;
        const size = Math.min(
            46,
            (5 + g.font * 0.2) * (0.85 + 0.3 * loveEase(local / 1.2)) * p.scale,
          ),
          alpha =
            loveEase(local / 0.3) *
            loveEase((5.1 - local) / 1.2) *
            clamp((4.6 - p.scale) / 1.5, 0, 1) *
            lovePetalScreenFade(p.y) *
            loveTextVisibility(show, p.x, p.y, size);
        petals.push({
          ...p,
          alpha,
          size,
          rotation: phase + local * 0.32 * motion,
          tumble: lovePetalTumble(local, phase, motion),
          color: show.rainbow && i % 9 === 0 ? 5 : (i + g.rank) % 5,
          layer: i % 6,
        });
      }
    }
    return petals.sort((a, b) => b.z - a.z);
  }
  function drawLoveWordPetals(show) {
    if (show.age < 7.8 || show.age > 14.6) return;
    drawLovePetalPoints(loveWordPetals(show));
  }
  function drawLovePetalPoints(points, opacity = 1) {
    if (!points.length) return;
    const sheet = wordPetalAtlas();
    for (const p of points) {
      if (p.alpha < 0.01 || p.x < -50 || p.x > w + 50) continue;
      const surface = state.view === "3d" && p.scale > 1.3 ? nearFx : ctx,
        tumble = p.tumble;
      if (
        queueLoveCurvedPetal(p, p.alpha * 0.9 * opacity, p.layer) ||
        gpuLovePetal(
          p,
          p.alpha * 0.9 * opacity,
          [331, 337, 343, 349, 355, 38][p.color],
          p.layer,
          surface,
        )
      )
        continue;
      surface.save();
      surface.globalCompositeOperation = "source-over";
      surface.globalAlpha = p.alpha * 0.9 * opacity;
      surface.translate(p.x, p.y);
      surface.rotate(p.rotation);
      surface.save();
      surface.transform(tumble.a, tumble.b, tumble.c, tumble.d, 0, 0);
      paintLovePetalFaces(
        surface,
        [sheet, p.color * 160, Math.floor(p.layer / 2) * 160, 160, 160],
        [sheet, p.color * 160, Math.floor(p.layer / 2) * 160 + 480, 160, 160],
        p.size,
        tumble,
      );
      surface.restore();
      paintLovePetalEdge(surface, p.size, tumble);
      surface.restore();
    }
  }
  function loveDepthRosePose(rank, age) {
    const base = loveRosePose(rank),
      local = Math.max(0, age - 13 - rank * 0.65),
      motion = reduced.matches ? 0.15 : 1,
      open = loveEase(local / 3.5),
      approach = loveEase((local - 3.7) / 3.6),
      scatter = loveEase((local - 5.6) / 2.1),
      spatial = state.view === "3d",
      z = spatial
        ? depthFocal() *
          ((0.95 + rank * 0.16) * (1 - open) +
            [0.08, -0.08, 0.25][rank] * open -
            approach * 0.7 * motion)
        : 0,
      worldX = w * 0.5 + (base.x - w * 0.5) * (1 - approach * 0.22 * motion),
      worldY = base.y + approach * h * 0.065 * motion,
      p = loveProject(worldX, worldY, z);
    return {
      ...base,
      ...p,
      worldX,
      worldY,
      z,
      open,
      scatter,
      local,
      yaw: spatial
        ? (rank - 1) * 0.22 + Math.sin(local * 0.4) * 0.12 * motion
        : 0,
      pitch: spatial ? -0.14 + Math.sin(local * 0.3 + rank) * 0.06 * motion : 0,
      roll: (rank - 1) * 0.1 + Math.sin(local * 0.7 + rank) * 0.035 * motion,
      alpha: p ? (1 - scatter) ** 1.6 * clamp((3.4 - p.scale) / 1.2, 0, 1) : 0,
    };
  }
  function loveDepthPetal(show, index) {
    const motion = reduced.matches ? 0.18 : 1,
      u = (show.age * 0.045 * motion + index * 0.618034) % 1,
      focal = depthFocal(),
      a = index * 2.39996,
      side = index % 2 ? -1 : 1,
      foreground = index % 9 === 0,
      x =
        w * 0.5 +
        side * w * (0.12 + (index % 7) * 0.042) +
        Math.sin(show.age * 0.24 * motion + a) * Math.min(25, w * 0.035),
      y = h * 0.08 + u * h * 0.65 + Math.sin(a + u * 3) * 16,
      z = focal * (foreground ? 2.1 - u * 2.98 : 1.5 - u * 1.15),
      p = loveProject(x, y, z);
    if (!p) return null;
    const size = Math.min(
        43,
        (foreground ? 13 : 7 + (index % 4) * 2) * p.scale,
      ),
      alpha =
        loveEase(u / 0.1) *
        loveEase((0.99 - u) / 0.13) *
        lovePetalScreenFade(p.y) *
        loveTextVisibility(show, p.x, p.y, size);
    return {
      ...p,
      size,
      alpha,
      rotation: show.age * 0.3 * motion + a,
      tumble: lovePetalTumble(show.age, a, motion),
    };
  }
  function drawDepthLoveRain(show, rain, exit) {
    if (rain * exit < 0.005) return;
    const blend = loveRoseRainBlend(show),
      base = reduced.matches ? 24 : w < 700 ? 64 : 96,
      count = blend > 0 ? (reduced.matches ? 24 : w < 700 ? 84 : 126) : base,
      petals = Array.from({ length: count }, (_, i) => ({
        p: loveDepthPetal(show, i),
        i,
      }))
        .filter(
          ({ p }) =>
            p && p.alpha > 0.01 && p.x > -50 && p.x < w + 50 && p.y < h + 50,
        )
        .sort((a, b) => b.p.z - a.p.z);
    for (const { p, i } of petals) {
      const surface = p.scale > 1.25 ? nearFx : ctx,
        focus =
          1 -
          0.62 *
            loveEase((show.age - 12.5) / 1.5) *
            (1 - loveEase((show.age - 24) / 2)),
        alpha = rain * exit * p.alpha * 0.8 * (i < base ? 1 : blend) * focus,
        tumble = p.tumble;
      if (queueLoveCurvedPetal(p, alpha, (i % 3) * 2)) continue;
      if (loveGpuFrame) {
        if (blend < 1)
          gpuLovePetalSilhouette(
            p,
            alpha * (1 - blend),
            show.rainbow ? i * 137.5 : 337 + (i % 4) * 12,
            surface,
          );
        if (blend > 0)
          gpuLovePetal(
            p,
            alpha * blend,
            [331, 337, 343, 349, 355, 38][
              show.rainbow && i % 9 === 0 ? 5 : i % 5
            ],
            (i % 3) * 2,
            surface,
          );
        continue;
      }
      surface.save();
      surface.globalCompositeOperation = "source-over";
      surface.translate(p.x, p.y);
      surface.rotate(p.rotation);
      surface.save();
      surface.transform(tumble.a, tumble.b, tumble.c, tumble.d, 0, 0);
      if (blend < 1) {
        surface.globalAlpha = alpha * (1 - blend);
        surface.drawImage(
          sprite(show.rainbow ? i * 137.5 : 337 + (i % 4) * 12, "petal", i % 3),
          -p.size / 2,
          -p.size / 2,
          p.size,
          p.size,
        );
      }
      if (blend > 0) {
        surface.globalAlpha = alpha * blend;
        const sheet = wordPetalAtlas(),
          x = (show.rainbow && i % 9 === 0 ? 5 : i % 5) * 160,
          y = (i % 3) * 160;
        paintLovePetalFaces(
          surface,
          [sheet, x, y, 160, 160],
          [sheet, x, y + 480, 160, 160],
          p.size,
          tumble,
        );
      }
      surface.restore();
      surface.globalAlpha = alpha * blend;
      paintLovePetalEdge(surface, p.size, tumble);
      surface.restore();
    }
  }
  // BEGIN ACCEPTED ROSE RUNTIME
  const acceptedRoseAsset = initialAssets.rose;
  let acceptedRoseRuntime = null;
  
  function acceptedRoseStage() {
    const clip = meshRoseViewport(),
      height = Math.min(clip.bottom - clip.top, w * 1.25);
    return {
      x: 0,
      y: clip.top + (clip.bottom - clip.top - height) * 0.5,
      width: w,
      height,
    };
  }
  function prepareAcceptedRoses() {
    if (!acceptedRoseRuntime) {
      acceptedRoseRuntime = makeAcceptedRoseRuntime(acceptedRoseAsset, {onError: error => {nearCanvas.dataset.roseError = String(error.message || error);}});
      acceptedRoseRuntime.prewarm();
    }
    return acceptedRoseRuntime;
  }
  function acceptedRoseConfig(show, finale = false) {
    const clip = meshRoseViewport(),
      rect = finale ? { x: 0, y: 0, width: w, height: h } : acceptedRoseStage();
    if (show.glyphs?.length) loveTextVisibility(show, 0, 0);
    const boxes = (show.heartReadMask?.boxes || [])
        .filter((p) => p.fade > 0.05)
        .slice(0, 6),
      boxData = new Float32Array(24);
    boxes.forEach((p, i) => boxData.set([p.x, p.y, p.rx, p.ry], i * 4));
    return {
      width: w,
      height: h,
      age: show.age,
      births: loveRoseBirths(show, finale),
      scatterAt: Math.max(50, (show.finaleFormedAt ?? 41.6) + 8.4),
      rect,
      clip,
      boxes,
      boxData,
      finale,
      flowers: finale
        ? Array.from({ length: 6 }, (_, i) => loveFinalFlowerPose(i))
        : null,
      arrivals: !finale,
      step:
        state.quality === "low"
          ? 4
          : state.quality === "high"
            ? 1
            : compactControls
              ? 2
              : 1,
      ratio: Math.min(
        dpr,
        state.quality === "low" ? 1 : compactControls ? 1.3 : 1.6,
      ),
    };
  }
  function acceptedRoseAnchor(rank, age) {
    const runtime = prepareAcceptedRoses();
    return runtime.anchor(rank, age - 13, w, h, acceptedRoseStage());
  }
  function renderAcceptedRoses(show, finale = false, opacity = 1) {
    const time = show.age - 13;
    if ((!finale && (time < 0 || time > 11.2)) || opacity < 0.003) return;
    const runtime = prepareAcceptedRoses(),
      config = acceptedRoseConfig(show, finale),
      surface = runtime.render(time, config);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = opacity;
    ctx.drawImage(surface, 0, 0, w, h);
    ctx.restore();
    nearCanvas.dataset.acceptedRoseRenderer = runtime.software
      ? "approved-canvas-mesh"
      : "approved-webgl2";
    nearCanvas.dataset.roseVersion = "review-06";
    nearCanvas.dataset.roseTime = time.toFixed(3);
  }

  // END ACCEPTED ROSE RUNTIME
  // Individual spoon-shaped petals: narrow attachment, cupped body and an irregular rolled lip.
  // The same surface stays intact when a petal leaves the flower.
  const meshRosePetals = [7, 8, 9, 9, 7].flatMap((count, layer) =>
    Array.from({ length: count }, (_, order) => {
      const id = [0, 7, 15, 24, 33][layer] + order,
        phase = id * 2.39996;
      return {
        id,
        order,
        layer,
        angle: (order / count) * TAU + layer * 2.39996 + Math.sin(phase) * 0.11,
        rim: 112 - layer * 22 + Math.sin(phase) * 3,
        height: 145 + layer * 6 + Math.sin(phase) * 8,
        width: 85 - layer * 14 + Math.cos(phase) * 4,
        root: 10 - layer * 1.6,
        curl: 16 - layer * 1.7 + Math.sin(phase) * 2,
        phase,
        kind: 0,
      };
    }),
  );
  const meshRoseGreens = [
    {
      kind: 2,
      layer: 0,
      angle: 0,
      rim: 3.6,
      height: 420,
      width: 0,
      root: 0,
      curl: 0,
      phase: 0,
    },
    ...Array.from({ length: 5 }, (_, i) => ({
      kind: 1,
      layer: 0,
      angle: (i / 5) * TAU,
      rim: 45,
      height: 38,
      width: 0.19,
      root: 13,
      curl: 0,
      phase: i,
    })),
    ...[-1, 1].map((side, i) => ({
      kind: 3,
      layer: 0,
      angle: side * 0.85,
      rim: 38,
      height: 112,
      width: 0,
      root: 240 + i * 100,
      curl: 0,
      phase: i,
    })),
  ];
  let roseMeshGpu = null,
    roseMeshGpuUnavailable = false;
  function meshRosePoint(p, u, v, open, time) {
    if (p.kind === 2) {
      const a = u * Math.PI;
      return {
        x: Math.cos(a) * p.rim + Math.sin(v * 2) * 2,
        y: 65 + v * p.height,
        z: Math.sin(a) * p.rim,
      };
    }
    if (p.kind === 3) {
      const side = p.angle < 0 ? -1 : 1,
        r = Math.sin(v * Math.PI) * p.rim * (1 + 0.045 * Math.sin(v * 36));
      return {
        x: side * v * p.height,
        z: u * r + Math.sin(v * Math.PI) * 11,
        y: p.root - v * 24 + u * u * r * 0.3,
      };
    }
    if (p.kind === 1) {
      const a = p.angle + u * p.width * Math.sin(v * Math.PI);
      return {
        x: Math.sin(a) * (p.root + v * p.rim),
        y: 66 + v * p.height,
        z: Math.cos(a) * (p.root + v * p.rim),
      };
    }
    const b = loveEase((open - (4 - p.layer) * 0.045) / 0.8),
      t = v * (1 - 0.11 * u * u),
      lip = loveEase((v - 0.72) / 0.28),
      width =
        p.width *
        Math.pow(Math.max(0, Math.sin(t * Math.PI * 0.82)), 0.68) *
        (0.2 + 0.8 * b),
      cup =
        u * u * (6 + p.curl * (0.1 + 0.4 * b)) * Math.sin(t * Math.PI * 0.78),
      radius =
        p.root +
        p.rim * (0.085 + 0.915 * b) * Math.pow(t, 1.42) -
        cup +
        lip * p.curl * 0.55 * b,
      fine =
        Math.sin(u * 13 + p.phase + t * 4) *
        0.65 *
        t *
        t *
        Math.sin(t * Math.PI),
      hem =
        (Math.sin(u * 16 + p.phase) * 0.7 + Math.sin(u * 7 - p.phase) * 0.45) *
        Math.pow(v, 9),
      y =
        65 -
        p.height * t * (0.92 + 0.08 * (1 - b)) +
        p.rim * 0.19 * b * t * t * t +
        lip * p.curl * b * (1 - u * u * 0.35 + u * Math.sin(p.phase) * 0.16) +
        fine +
        hem,
      a =
        p.angle +
        u * (0.16 + p.layer * 0.055) * (1 - b * 0.65) +
        (0.05 + p.layer * 0.03) * Math.sin(t * Math.PI * 0.7),
      tangent = u * width,
      breath = Math.sin(time * 0.7 + p.phase) * 0.55 * b * v * v * v;
    return {
      x: Math.sin(a) * (radius + breath) + Math.cos(a) * tangent,
      y,
      z: Math.cos(a) * (radius + breath) - Math.sin(a) * tangent,
    };
  }
  function meshRoseRig(rank, age, finale = false) {
    const motion = reduced.matches ? 0.15 : 1,
      f = depthFocal(),
      spatial = state.view === "3d";
    if (finale) {
      const p = loveFinalFlowerPose(rank),
        z = spatial ? f * 0.12 : 0,
        scale = spatial ? 1 / 1.12 : 1;
      return {
        x: w * 0.5 + (p.x - w * 0.5) / scale,
        y: h * 0.44 + (p.y - h * 0.44) / scale,
        z,
        size: p.size / scale,
        open: 1,
        yaw: 0,
        pitch: spatial ? 0.38 : 0,
        roll: Math.atan2(-p.nx, p.ny),
        alpha: 1,
      };
    }
    const base = loveRosePose(rank),
      local = Math.max(0, age - 13 - rank * 0.65),
      open = loveEase(local / 3.5),
      approach = loveEase((local - 3.4) / 3.4) * motion;
    return {
      x:
        w * 0.5 +
        (base.x - w * 0.5) * (1 - approach * 0.08) +
        Math.sin(local * 0.7 + rank) * w * 0.018 * loveEase(local) * motion,
      y:
        base.y +
        Math.sin(local * 0.6 + rank) * h * 0.009 * motion +
        approach * h * 0.025,
      z: spatial
        ? f * ((1.1 + rank * 0.12) * (1 - open) + 0.12 * open - 0.48 * approach)
        : 0,
      size: base.size * 1.48,
      open,
      yaw: (rank - 1) * 0.6 + local * 0.19 * motion,
      pitch: 0.68 + Math.sin(local * 0.45 + rank) * 0.09 * motion,
      roll: (rank - 1) * 0.08 + Math.sin(local * 0.55 + rank) * 0.055 * motion,
      alpha: loveEase(local / 0.65),
    };
  }
  function meshRoseMatrix(p) {
    const cy = Math.cos(p.yaw),
      sy = Math.sin(p.yaw),
      cx = Math.cos(p.pitch),
      sx = Math.sin(p.pitch),
      cz = Math.cos(p.roll),
      sz = Math.sin(p.roll),
      s = p.size / 512;
    return [
      (cz * cy - sz * sx * sy) * s,
      (sz * cy + cz * sx * sy) * s,
      -cx * sy * s,
      -sz * cx * s,
      cz * cx * s,
      sx * s,
      (cz * sy + sz * sx * cy) * s,
      (sz * sy - cz * sx * cy) * s,
      cx * cy * s,
    ];
  }
  function meshRoseTransform(m, p) {
    return {
      x: m[0] * p.x + m[3] * p.y + m[6] * p.z,
      y: m[1] * p.x + m[4] * p.y + m[7] * p.z,
      z: m[2] * p.x + m[5] * p.y + m[8] * p.z,
    };
  }
  function meshRoseCenter(rank, age, p, finale, frame = null) {
    const rig = frame?.rig || meshRoseRig(rank, age, finale),
      m = frame?.m || meshRoseMatrix(rig),
      pivot = meshRosePoint(p, 0, 0.55, rig.open, age),
      q = meshRoseTransform(m, pivot);
    return { x: rig.x + q.x, y: rig.y + q.y, z: rig.z + q.z, rig, m, pivot };
  }
  function meshRoseRelease(rank, p, finale) {
    return (
      (finale ? 49.4 + rank * 0.45 : 18.6 + rank * 0.65) +
      (p.kind ? 0 : p.layer * 0.17 + (p.order || 0) * 0.018)
    );
  }
  function meshRoseViewport() {
    return w > h && h <= 560
      ? { top: 56, bottom: h - 64, feather: 24 }
      : { top: 130, bottom: h - 90, feather: 40 };
  }
  function meshRosePetalState(
    show,
    rank,
    p,
    finale = false,
    opacity = 1,
    frame = null,
  ) {
    const at = meshRoseRelease(rank, p, finale),
      local = show.age - at,
      motion = reduced.matches ? 0.18 : 1,
      attached = finale || local < 0 || p.kind;
    let center, matrix, open, pivot, rig;
    if (attached) {
      const q = meshRoseCenter(rank, show.age, p, finale, frame);
      center = q;
      matrix = q.m;
      rig = q.rig;
      open = rig.open;
      pivot = q.pivot;
      opacity *= rig.alpha;
      if (p.kind && !finale)
        opacity *= 1 - loveEase((show.age - (18.6 + rank * 0.65)) / 1.6);
    } else {
      if (local > 5.2) return null;
      let cache = show.meshRoseOrigins;
      if (
        !cache ||
        cache.width !== w ||
        cache.height !== h ||
        cache.view !== state.view ||
        cache.reduced !== reduced.matches
      )
        cache = show.meshRoseOrigins = {
          width: w,
          height: h,
          view: state.view,
          reduced: reduced.matches,
          points: new Map(),
        };
      const key = (finale ? "f" : "m") + rank + ":" + meshRosePetals.indexOf(p);
      let origin = cache.points.get(key);
      if (!origin) {
        const q = meshRoseCenter(rank, at, p, finale),
          a = meshRoseCenter(rank, at - 0.001, p, finale),
          b = meshRoseCenter(rank, at + 0.001, p, finale);
        origin = {
          ...q,
          vx: (b.x - a.x) / 0.002,
          vy: (b.y - a.y) / 0.002,
          vz: (b.z - a.z) / 0.002,
          wy: (b.rig.yaw - a.rig.yaw) / 0.002,
          wx: (b.rig.pitch - a.rig.pitch) / 0.002,
          wz: (b.rig.roll - a.rig.roll) / 0.002,
        };
        cache.points.set(key, origin);
      }
      const carry = 0.38 * (1 - Math.exp(-local / 0.38)),
        travel = local - 0.5 * (1 - Math.exp(-local / 0.5)),
        f = depthFocal(),
        unfurl = loveEase(local / 1.3),
        side = rank % 2 ? -1 : 1,
        accent = (p.id + rank * 3) % 11 === 0,
        sweep =
          (side * (14 + p.layer * 2) + Math.sin(p.angle) * 36) *
          motion *
          travel,
        sway = Math.sin(travel * 0.9 + p.phase) * 4 * unfurl * motion;
      center = {
        x: origin.x + origin.vx * carry + sweep + sway,
        y:
          origin.y +
          origin.vy * carry +
          (-8 + Math.cos(p.angle) * 25 + p.layer * 2) * travel +
          (5.5 + p.layer * 0.5) * local * local,
        z:
          origin.z +
          origin.vz * carry +
          (state.view === "3d"
            ? f * (accent ? -0.085 : 0.12 + p.layer * 0.025) * motion * travel
            : 0),
      };
      matrix = meshRoseMatrix({
        ...origin.rig,
        size: origin.rig.size * (1 - 0.18 * loveEase(local / 3.5)),
        yaw:
          origin.rig.yaw +
          origin.wy * carry +
          (p.id % 2 ? 1 : -1) * travel * 0.48 * motion,
        pitch:
          origin.rig.pitch +
          origin.wx * carry +
          Math.sin(travel * 0.95 + p.phase) * 0.3 * unfurl * motion,
        roll:
          origin.rig.roll +
          origin.wz * carry +
          Math.sin(travel * 0.7 + p.phase) * 0.16 * unfurl * motion,
      });
      open = 1;
      pivot = meshRosePoint(p, 0, 0.55, 1, show.age);
      opacity *= 1 - loveEase((local - 3.4) / 1.8);
    }
    const screen = loveProject(center.x, center.y, center.z),
      anchor = attached ? loveProject(rig.x, rig.y, rig.z) : screen;
    if (!screen || !anchor || opacity < 0.003) return null;
    // Keep an attached rose together across compositing layers; clip its actual surface at the HUD edges.
    const clip = frame?.clip || meshRoseViewport(),
      radius = attached ? rig.size * 1.05 * anchor.scale : 12 * screen.scale;
    opacity *=
      loveTextVisibility(
        show,
        screen.x,
        screen.y,
        (p.kind ? 6 : 12) * screen.scale,
      ) *
      clamp((anchor.y - clip.top + radius) / clip.feather, 0, 1) *
      clamp((clip.bottom - anchor.y + radius) / clip.feather, 0, 1) *
      clamp((4.8 - anchor.scale) / 1.4, 0, 1);
    // A distant stem still needs a stable silhouette at the mobile particle layer's lower resolution.
    if (p.kind === 2)
      p = {
        ...p,
        rim: Math.max(
          p.rim,
          Math.min(
            10,
            0.65 / (Math.hypot(matrix[0], matrix[1], matrix[2]) * screen.scale),
          ),
        ),
      };
    return opacity < 0.003
      ? null
      : {
          p,
          center,
          matrix,
          open,
          time: show.age,
          alpha: opacity,
          near: anchor.scale > 1.4,
          z: center.z,
          pivot,
        };
  }
  function meshRoseInstances(show, finale = false, opacity = 1) {
    if (opacity < 0.003) return [];
    const out = [],
      ranks = finale ? [0, 1, 2, 3, 4, 5] : [0, 1, 2],
      clip = meshRoseViewport();
    for (const rank of ranks) {
      if (!finale && show.age < 13 + rank * 0.65) continue;
      const rig = meshRoseRig(rank, show.age, finale),
        frame = { rig, m: meshRoseMatrix(rig), clip };
      for (const p of [...meshRosePetals, ...meshRoseGreens]) {
        const q = meshRosePetalState(show, rank, p, finale, opacity, frame);
        if (q) out.push(q);
      }
    }
    return out.sort((a, b) => b.z - a.z);
  }
  function prepareRoseMeshGpu() {
    if (roseMeshGpuUnavailable) return null;
    if (roseMeshGpu && !roseMeshGpu.gl.isContextLost()) {
      if (roseMeshGpu.profile !== state.quality + ":" + compactControls)
        updateRoseMeshGrid(roseMeshGpu);
      return roseMeshGpu;
    }
    try {
      let surface =
          typeof OffscreenCanvas === "function"
            ? new OffscreenCanvas(1, 1)
            : document.createElement("canvas"),
        gl = surface.getContext("webgl2", {
          alpha: true,
          premultipliedAlpha: true,
          depth: true,
          antialias: true,
          powerPreference: "high-performance",
        });
      if (!gl) {
        roseMeshGpuUnavailable = true;
        return null;
      }
      const shader = (kind, source) => {
        const s = gl.createShader(kind);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
          throw Error(gl.getShaderInfoLog(s));
        return s;
      };
      const vertex = shader(
        gl.VERTEX_SHADER,
        `#version 300 es
   precision highp float;
   layout(location=0)in vec2 aUv;layout(location=1)in vec4 aShape;layout(location=2)in vec4 aDetail;layout(location=3)in vec4 aX;layout(location=4)in vec4 aY;layout(location=5)in vec4 aZ;layout(location=6)in vec4 aMotion;
   uniform vec3 uView;out vec3 vNormal;out vec3 vWorld;out vec2 vUv;out float vAlpha;flat out float vKind;flat out float vLayer;flat out float vSeed;
   vec3 point(vec2 uv){float u=uv.x,v=clamp(uv.y,0.,1.),kind=aMotion.w;
    if(kind>1.5&&kind<2.5)return vec3(cos(u*3.14159265)*aShape.y+sin(v*2.)*2.,65.+v*aShape.z,sin(u*3.14159265)*aShape.y);
    if(kind>2.5){float side=aShape.x<0.?-1.:1.,r=sin(v*3.14159265)*aShape.y*(1.+.045*sin(v*36.));return vec3(side*v*aShape.z,aDetail.z-v*24.+u*u*r*.3,u*r+sin(v*3.14159265)*11.);}
    if(kind>.5){float a=aShape.x+u*aShape.w*sin(v*3.14159265),r=aDetail.z+v*aShape.y;return vec3(sin(a)*r,66.+v*aShape.z,cos(a)*r);}
    float s=clamp((aMotion.x-(4.-aDetail.x)*.045)/.8,0.,1.),b=s*s*(3.-2.*s),t=v*(1.-.11*u*u),lp=clamp((v-.72)/.28,0.,1.),lip=lp*lp*(3.-2.*lp),width=aShape.w*pow(max(0.,sin(t*2.576105976)),.68)*(.2+.8*b),cup=u*u*(6.+aDetail.w*(.1+.4*b))*sin(t*2.45044227);
    float r=aDetail.z+aShape.y*(.085+.915*b)*pow(t,1.42)-cup+lip*aDetail.w*.55*b,fine=sin(u*13.+aDetail.y+t*4.)*.65*t*t*sin(t*3.14159265),hem=(sin(u*16.+aDetail.y)*.7+sin(u*7.-aDetail.y)*.45)*pow(v,9.);
    float y=65.-aShape.z*t*(.92+.08*(1.-b))+aShape.y*.19*b*t*t*t+lip*aDetail.w*b*(1.-u*u*.35+u*sin(aDetail.y)*.16)+fine+hem,a=aShape.x+u*(.16+aDetail.x*.055)*(1.-b*.65)+(.05+aDetail.x*.03)*sin(t*2.199114858),tangent=u*width,breath=sin(aMotion.y*.7+aDetail.y)*.55*b*v*v*v;
    return vec3(sin(a)*(r+breath)+cos(a)*tangent,y,cos(a)*(r+breath)-sin(a)*tangent);
   }
   void main(){mat3 m=mat3(aX.xyz,aY.xyz,aZ.xyz);vec3 p=point(aUv);vec3 du=point(aUv+vec2(.001,0.))-p;float stepV=aUv.y>.999?-.001:.001;vec3 dv=(point(aUv+vec2(0.,stepV))-p)*sign(stepV);vNormal=normalize(m*cross(du,dv)+vec3(0.,.0000001,0.));vWorld=m*p+vec3(aX.w,aY.w,aZ.w);float f=uView.z,d=max(.001,f+vWorld.z),n=f*.065,far=f*12.;gl_Position=vec4((vWorld.x-uView.x*.5)*2.*f/uView.x,.12*d-(vWorld.y-uView.y*.44)*2.*f/uView.y,(far+n)/(far-n)*d-2.*far*n/(far-n),d);vUv=aUv;vAlpha=aMotion.z;vKind=aMotion.w;vLayer=aDetail.x;vSeed=aDetail.y;}`,
      );
      const fragment = shader(
        gl.FRAGMENT_SHADER,
        `#version 300 es
   precision highp float;uniform vec3 uView;uniform vec3 uClip;in vec3 vNormal;in vec3 vWorld;in vec2 vUv;in float vAlpha;flat in float vKind;flat in float vLayer;flat in float vSeed;out vec4 color;
   float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
   void main(){vec3 n=normalize(gl_FrontFacing?vNormal:-vNormal),l=normalize(vec3(-.45,-.8,-.65)),eye=normalize(vec3(uView.x*.5-vWorld.x,uView.y*.44-vWorld.y,-uView.z-vWorld.z));float diffuse=clamp((dot(n,l)+.35)/1.35,0.,1.),lip=smoothstep(.6,1.,vUv.y),ao=.76+.24*smoothstep(.06,.8,vUv.y),grain=noise(vUv*vec2(115.,160.)+vSeed),mottle=noise(vUv*vec2(9.,17.)+vSeed);
    float veinPhase=vUv.x*(51.+vUv.y*29.)+noise(vUv*7.+vSeed)*1.7,vein=pow(.5+.5*sin(veinPhase),9.)*(1.-smoothstep(.4,1.5,fwidth(veinPhase)));
    vec3 base=mix(vec3(.57,.235,.34),vec3(.88,.47,.58),smoothstep(.02,.75,vUv.y));base=mix(base,vec3(.96,.65,.72),lip*.56);base*=1.-vLayer*.022;base*=.965+.055*mottle;base+=(grain-.5)*.014-vein*.009;
    float trans=max(0.,dot(-n,l))*(.06+.13*lip),velvet=pow(1.-abs(dot(n,eye)),3.)*.045,sheen=pow(max(0.,dot(n,normalize(l+eye))),5.)*.018;
    vec3 lit=base*(.51+diffuse*.48+trans)*ao+base*velvet+vec3(.98,.76,.79)*sheen;
    if(vKind>.5){base=mix(vec3(.10,.28,.13),vec3(.30,.53,.25),vUv.y);if(vKind>2.5)base+=vec3(.035,.065,.025)*(1.-smoothstep(.015,.065,abs(vUv.x)));lit=base*(.5+diffuse*.54)+pow(max(0.,dot(n,normalize(l+eye))),18.)*.035;}
    float sy=uView.y*.44+(vWorld.y-uView.y*.44)*uView.z/max(.001,uView.z+vWorld.z),alpha=vAlpha*smoothstep(uClip.x,uClip.x+uClip.z,sy)*(1.-smoothstep(uClip.y-uClip.z,uClip.y,sy));if(vKind<.5)alpha*=1.-.045*pow(abs(vUv.x),8.);if(alpha<.003)discard;color=vec4(lit*alpha,alpha);
   }`,
      );
      const program = gl.createProgram();
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw Error(gl.getProgramInfoLog(program));
      const columns =
          state.quality === "low"
            ? 6
            : state.quality === "high"
              ? 14
              : compactControls
                ? 8
                : 12,
        rows =
          state.quality === "low"
            ? 8
            : state.quality === "high"
              ? 22
              : compactControls
                ? 12
                : 18,
        uv = [];
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < columns; x++) {
          const a = (x / columns) * 2 - 1,
            b = y / rows,
            c = ((x + 1) / columns) * 2 - 1,
            d = (y + 1) / rows;
          uv.push(a, b, c, b, c, d, a, b, c, d, a, d);
        }
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const vertices = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
      const instances = gl.createBuffer(),
        data = new Float32Array(384 * 24);
      gl.bindBuffer(gl.ARRAY_BUFFER, instances);
      gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
      for (let i = 1; i <= 6; i++) {
        gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 96, (i - 1) * 16);
        gl.vertexAttribDivisor(i, 1);
      }
      roseMeshGpu = {
        surface,
        gl,
        program,
        vao,
        vertices,
        instances,
        data,
        count: uv.length / 2,
        view: gl.getUniformLocation(program, "uView"),
        clip: gl.getUniformLocation(program, "uClip"),
        columns,
        rows,
        compact: compactControls,
        profile: state.quality + ":" + compactControls,
      };
      surface.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        roseMeshGpuUnavailable = true;
        roseMeshGpu = null;
      });
      surface.addEventListener("webglcontextrestored", () => {
        roseMeshGpuUnavailable = false;
      });
      return roseMeshGpu;
    } catch (error) {
      roseMeshGpuUnavailable = true;
      nearCanvas.dataset.roseError = String(error.message || error);
      return null;
    }
  }
  function updateRoseMeshGrid(r) {
    const columns =
        state.quality === "low"
          ? 6
          : state.quality === "high"
            ? 14
            : compactControls
              ? 8
              : 12,
      rows =
        state.quality === "low"
          ? 8
          : state.quality === "high"
            ? 22
            : compactControls
              ? 12
              : 18,
      uv = [];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < columns; x++) {
        const a = (x / columns) * 2 - 1,
          b = y / rows,
          c = ((x + 1) / columns) * 2 - 1,
          d = (y + 1) / rows;
        uv.push(a, b, c, b, c, d, a, b, c, d, a, d);
      }
    const { gl } = r;
    gl.bindVertexArray(r.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, r.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
    r.count = uv.length / 2;
    r.columns = columns;
    r.rows = rows;
    r.compact = compactControls;
    r.profile = state.quality + ":" + compactControls;
  }
  function writeRoseMeshInstance(data, index, q) {
    const p = q.p,
      m = q.matrix,
      k = index * 24,
      pivot = meshRoseTransform(
        m,
        q.pivot || meshRosePoint(p, 0, 0.55, q.open, q.time),
      );
    data.set(
      [
        p.angle,
        p.rim,
        p.height,
        p.width,
        p.layer,
        p.phase,
        p.root,
        p.curl,
        m[0],
        m[1],
        m[2],
        q.center.x - pivot.x,
        m[3],
        m[4],
        m[5],
        q.center.y - pivot.y,
        m[6],
        m[7],
        m[8],
        q.center.z - pivot.z,
        q.open,
        q.time,
        q.alpha,
        p.kind,
      ],
      k,
    );
  }
  function drawRoseMeshCpu(instances) {
    const triangles = [],
      columns = 4,
      rows = 6,
      clip = meshRoseViewport();
    for (const q of instances) {
      const pivot = q.pivot || meshRosePoint(q.p, 0, 0.55, q.open, q.time),
        point = (u, v) => {
          const p = meshRosePoint(q.p, u, v, q.open, q.time),
            a = meshRoseTransform(q.matrix, {
              x: p.x - pivot.x,
              y: p.y - pivot.y,
              z: p.z - pivot.z,
            });
          return {
            x: q.center.x + a.x,
            y: q.center.y + a.y,
            z: q.center.z + a.z,
          };
        };
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < columns; x++) {
          const a = point((x / columns) * 2 - 1, y / rows),
            b = point(((x + 1) / columns) * 2 - 1, y / rows),
            c = point(((x + 1) / columns) * 2 - 1, (y + 1) / rows),
            d = point((x / columns) * 2 - 1, (y + 1) / rows);
          for (const verts of [
            [a, b, c],
            [a, c, d],
          ]) {
            const projected = verts.map((p) => loveProject(p.x, p.y, p.z));
            if (projected.some((p) => !p)) continue;
            const sy = projected.reduce((sum, p) => sum + p.y, 0) / 3,
              alpha =
                q.alpha *
                loveEase((sy - clip.top) / clip.feather) *
                (1 -
                  loveEase((sy - clip.bottom + clip.feather) / clip.feather));
            if (alpha < 0.003) continue;
            const e = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z },
              f = { x: d.x - a.x, y: d.y - a.y, z: d.z - a.z },
              nx = e.y * f.z - e.z * f.y,
              ny = e.z * f.x - e.x * f.z,
              nz = e.x * f.y - e.y * f.x,
              light =
                0.45 +
                0.5 *
                  Math.abs(
                    (nx * -0.45 + ny * -0.8 + nz * -0.65) /
                      (Math.hypot(nx, ny, nz) || 1),
                  );
            triangles.push({
              verts: projected,
              z: verts.reduce((sum, p) => sum + p.z, 0) / 3,
              alpha,
              light,
              kind: q.p.kind,
              near: q.near,
            });
          }
        }
    }
    triangles.sort((a, b) => b.z - a.z);
    for (const t of triangles) {
      const c = t.near ? nearFx : ctx;
      c.save();
      c.globalAlpha = t.alpha;
      c.globalCompositeOperation = "source-over";
      c.fillStyle = t.kind
        ? `hsl(126,32%,${22 + t.light * 21}%)`
        : `hsl(337,54%,${34 + t.light * 43}%)`;
      c.beginPath();
      c.moveTo(t.verts[0].x, t.verts[0].y);
      c.lineTo(t.verts[1].x, t.verts[1].y);
      c.lineTo(t.verts[2].x, t.verts[2].y);
      c.closePath();
      c.fill();
      c.restore();
    }
  }
  function drawRoseScene(show, finale = false, opacity = 1) {
    renderAcceptedRoses(show, finale, opacity);
  }
  function drawRoseMeshBatch(instances) {
    if (!instances.length) return;
    const r = prepareRoseMeshGpu();
    nearCanvas.dataset.roseRenderer = r ? "webgl2-mesh" : "canvas-mesh";
    if (!r) {
      drawRoseMeshCpu(instances);
      return;
    }
    const { gl } = r,
      ratio = Math.min(
        dpr,
        state.quality === "low"
          ? 1
          : state.quality === "high"
            ? 1.7
            : compactControls
              ? 1.15
              : 1.6,
      ),
      width = Math.round(w * ratio),
      height = Math.round(h * ratio);
    if (r.surface.width !== width || r.surface.height !== height) {
      r.surface.width = width;
      r.surface.height = height;
    }
    const clip = meshRoseViewport();
    gl.bindVertexArray(r.vao);
    gl.useProgram(r.program);
    gl.uniform3f(r.view, w, h, state.view === "3d" ? depthFocal() : 1e6);
    gl.uniform3f(r.clip, clip.top, clip.bottom, clip.feather);
    gl.viewport(0, 0, width, height);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER, r.instances);
    for (const near of [false, true]) {
      let count = 0;
      for (const q of instances)
        if (q.near === near) writeRoseMeshInstance(r.data, count++, q);
      if (!count) continue;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, r.data.subarray(0, count * 24));
      gl.drawArraysInstanced(gl.TRIANGLES, 0, r.count, count);
      const target = near ? nearFx : ctx;
      target.save();
      target.globalAlpha = 1;
      target.globalCompositeOperation = "source-over";
      compositeGpu(r, target);
      target.restore();
    }
  }

  function drawDepthLoveGarden(show) {
    drawRoseScene(show);
  }

  function loveFont(g) {
    return g.rtl
      ? '"Geeza Pro","Al Bayan","Noto Naskh Arabic",sans-serif'
      : g.lang === "ko"
        ? '"Apple SD Gothic Neo","PingFang SC",sans-serif'
        : '"Songti SC","Hiragino Mincho ProN","PingFang SC",serif';
  }
  function bakeLovePhrase(g, show) {
    const mask = document.createElement("canvas"),
      c = mask.getContext("2d");
    c.font = `600 ${g.font}px ${loveFont(g)}`;
    g.wordWidth = c.measureText(g.char).width;
    g.width = Math.ceil(g.wordWidth + g.font * 0.9 + 24);
    g.height = Math.ceil(g.font * 2.2 + 20);
    mask.width = g.width;
    mask.height = g.height;
    c.font = `600 ${g.font}px ${loveFont(g)}`;
    c.direction = g.rtl ? "rtl" : "ltr";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#fff";
    c.fillText(g.char, g.width / 2, g.height / 2);
    const data = c.getImageData(0, 0, g.width, g.height).data,
      points = [],
      step = quality() < 0.75 ? 3 : 2;
    for (let y = 0; y < g.height; y += step)
      for (let x = 0; x < g.width; x += step)
        if (data[(y * g.width + x) * 4 + 3] > 100)
          points.push({
            dx: x - g.width / 2,
            dy: y - g.height / 2,
            seed: points.length * 2.39996,
            size: 1,
          });
    const cap = Math.round(420 * Math.min(quality(), 1));
    g.points =
      points.length > cap
        ? Array.from(
            { length: cap },
            (_, i) => points[Math.floor((i * points.length) / cap)],
          )
        : points;
    const plate = document.createElement("canvas"),
      ratio = Math.min(dpr, 1.6);
    plate.width = Math.ceil(g.width * ratio);
    plate.height = Math.ceil(g.height * ratio);
    const p = plate.getContext("2d");
    p.scale(ratio, ratio);
    p.translate(g.width / 2, g.height / 2);
    p.font = `600 ${g.font}px ${loveFont(g)}`;
    p.direction = g.rtl ? "rtl" : "ltr";
    p.textAlign = "center";
    p.textBaseline = "middle";
    p.fillStyle = `hsl(${g.hue},65%,89%)`;
    p.shadowColor = `hsla(${g.hue},90%,70%,.65)`;
    p.shadowBlur = 7;
    p.globalAlpha = 0.78;
    p.fillText(g.char, 0, 0);
    p.shadowBlur = 0;
    for (let i = 0; i < g.points.length; i++) {
      const q = g.points[i],
        accent = i % 4 === 0,
        type = accent
          ? show.effect === "mix"
            ? materialTypes[Math.floor(i / 4) % 5]
            : show.effect
          : "gold",
        color = show.rainbow && accent ? g.hue + i * 47 : g.hue,
        size =
          type === "gold"
            ? Math.max(2.6, g.font * 0.095)
            : Math.max(5, g.font * 0.24);
      p.globalAlpha = accent ? 0.85 : 0.7;
      p.drawImage(
        sprite(color, type),
        q.dx - size / 2,
        q.dy - size / 2,
        size,
        size,
      );
    }
    p.globalCompositeOperation = "destination-in";
    p.globalAlpha = 1;
    p.drawImage(mask, -g.width / 2, -g.height / 2, g.width, g.height);
    p.globalCompositeOperation = "source-over";
    g.plate = { canvas: plate, width: g.width, height: g.height };
  }
  function layoutLove(show) {
    const compact = w < 700,
      top = h < 540 ? 118 : compact ? 180 : 200,
      bottom = h - (h < 540 ? 108 : compact ? 140 : 165),
      height = Math.max(120, bottom - top),
      old = show.glyphs || [],
      probe = document.createElement("canvas").getContext("2d");
    show.heartFrame = { top, height, halfWidth: w * 0.405 };
    show.heartMotion = null;
    show.heartReadMask = null;
    // Two lobes, a recessed centre, tapering sides and a single tip; every phrase faces the audience.
    const slots = [
        [-0.27, 0.02, 0.23],
        [0, 0.2, 0.28],
        [0.6, 0.15, 0.32],
        [0.27, 0.02, 0.23],
        [0.5, 0.52, 0.4],
        [0.63, 0.3, 0.44],
        [-0.63, 0.3, 0.44],
        [0, 0.4, 0.38],
        [0.2, 0.87, 0.18],
        [-0.2, 0.87, 0.18],
        [0.35, 0.68, 0.29],
        [0, 1, 0.2],
        [-0.5, 0.52, 0.4],
        [-0.6, 0.15, 0.28],
        [-0.35, 0.68, 0.29],
      ],
      order = [0, 13, 2, 1, 4, 3, 11, 14, 6, 8, 5, 7, 10, 12, 9];
    show.glyphs = [];
    loveLanguages.forEach((language, i) => {
      const line = loveFinaleLines.find((line) => line.lang === language.lang),
        [hx, hy, fraction] = slots[i],
        hz = language.lang === "zh" ? -0.055 : Math.sin(i * 1.7) * 0.04,
        p = loveHeartPosition(show, hx, hy, hz, 0),
        boxWidth = (w * fraction) / (compact ? 1.16 : 1.1);
      (line?.parts || [language.text]).forEach((text, part) => {
        const rank = show.glyphs.length,
          previous = old[rank],
          g = {
            ...language,
            text,
            char: text,
            rank,
            languageIndex: i,
            part,
            finaleOrder: line ? loveFinaleLines.indexOf(line) * 3 + part : null,
            hx,
            hy,
            hz,
            x: p.x,
            y: p.y,
            boxWidth,
            tilt: 0,
            releaseOrder: order[i],
            font: Math.min(
              language.lang === "zh" ? (compact ? 40 : 52) : compact ? 26 : 36,
              height *
                (language.lang === "zh"
                  ? compact
                    ? 0.063
                    : h < 540
                      ? 0.11
                      : 0.14
                  : h < 540
                    ? 0.082
                    : 0.102),
            ),
            hue:
              show.baseHue +
              (show.rainbow ? i * 137.5 + part * 47 : (i % 3) * 12 + part * 4),
            born: previous?.born ?? null,
            fired: previous?.fired ?? false,
            flightAt: previous?.flightAt ?? null,
            flightDuration: 2.6,
            launchAt: line
              ? line.at + part * 0.65
              : (previous?.launchAt ?? 0.4 + (i % 3) * 0.035),
          };
        if (!line) {
          probe.font = `600 ${g.font}px ${loveFont(g)}`;
          const room = Math.min(
            boxWidth - 14,
            (Math.min(p.x - 12, w - 12 - p.x) * 2) / p.scale / 1.1,
          );
          g.font = Math.max(
            10,
            Math.min(
              g.font,
              (g.font * room) / Math.max(1, probe.measureText(g.char).width),
            ),
          );
        }
        bakeLovePhrase(g, show);
        show.glyphs.push(g);
      });
    });
    for (const { g, x, y } of loveFinalWords(show)) {
      g.x = x;
      g.y = y;
    }
    show.bounds = { left: 12, right: w - 12, top, bottom };
    show.layout = {
      top,
      bottom,
      columns: compact ? 2 : 3,
      rows: 7,
      cellHeight: height / 7,
    };
    depthDirty = true;
  }
  function startLoveShow() {
    if (cameraState !== "off") stopCamera();
    const previousImmersed = state.immersed;
    if (previousImmersed) setImmersed(false);
    particles = [];
    flashes = [];
    meteors = [];
    skyPaths = [];
    textCloud = {
      id: ++wishSerial,
      kind: "love",
      text: wish,
      age: 0,
      duration: 56,
      gap: 0.035,
      baseHue: hue(),
      effect: state.effect,
      rainbow: state.palette === "rainbow",
      glyphs: [],
      readUntil: null,
      lastAge: -0.01,
      nextAccent: 4.7,
      act: -1,
      uiAt: -1,
      previousImmersed,
    };
    audioController.accentUntil = 0;
    syncPerformanceScore();
    resize();
    wordPetalAtlas();
    prepareAcceptedRoses();
    document.body.classList.toggle("writing-wish", true);
    document.body.classList.toggle("love-mode", true);
    $("loveHud").hidden = false;
    $("wishStop").hidden = false;
    $("wishSubmit").disabled = true;
    $("wishSubmit").textContent = "万语同心 · 烟火正在启程";
    syncLoveUI(true);
    $("loveHud").focus();
  }
  function syncLoveUI(force = false) {
    const show = textCloud;
    if (show?.kind !== "love") return;
    const act = loveStages.findLastIndex((s) => show.age >= s.at);
    if (act !== show.act) {
      show.act = act;
      $("loveActTitle").textContent = loveStages[act].title;
      $("loveCaption").textContent = loveStages[act].line;
      canvas.setAttribute(
        "aria-label",
        loveStages[act].title + "。" + loveStages[act].line,
      );
    }
    const ending = loveFinaleLines
        .map((line) => {
          const parts = show.glyphs.filter(
            (g) => g.lang === line.lang && g.born !== null,
          );
          return parts.length
            ? {
                lang: line.lang,
                name: parts[0].name,
                text: parts
                  .map((g) => g.char)
                  .join(line.lang === "en" ? " " : ""),
              }
            : null;
        })
        .filter(Boolean),
      finalWords = ending.map((g) => g.text).join("|");
    if (show.finalWords !== finalWords) {
      show.finalWords = finalWords;
      $("loveTranscript").innerHTML = [
        ...loveLanguages.filter((g) => !g.finaleOnly),
        ...ending,
      ]
        .map(
          (g) =>
            `<li lang="${g.lang}" dir="${g.rtl ? "rtl" : "ltr"}">${g.name}：${g.text}</li>`,
        )
        .join("");
      if (ending.length)
        canvas.setAttribute(
          "aria-label",
          loveStages[act].title +
            "。" +
            ending.map((g) => g.text).join("。") +
            "。",
        );
    }
    $("lovePauseBtn").textContent = state.paused ? "继续" : "暂停";
    $("lovePauseBtn").setAttribute("aria-pressed", String(state.paused));
    if (!force && show.age - show.uiAt < 0.15) return;
    show.uiAt = show.age;
    $("loveTime").textContent =
      `00:${String(Math.min(show.duration, Math.floor(show.age))).padStart(2, "0")} / 00:${show.duration}`;
    $("loveProgress").style.setProperty(
      "--love-fill",
      `${clamp(show.age / show.duration, 0, 1) * 100}%`,
    );
  }
  function loveFinalFrame() {
    return {
      x: w * 0.5,
      y: h < 540 ? h * 0.45 : h * 0.44,
      radius: Math.min(w * 0.31, h * 0.29, 250) * 1.12,
    };
  }
  function loveFinalOutline(pulse = 1, count = 240) {
    const f = loveFinalFrame();
    return loveHeartPoints(f.x, f.y, f.radius * pulse, 0, 0, 0, count, 1).sort(
      (a, b) => a.i - b.i,
    );
  }
  function loveInsideOutline(x, y, outline) {
    let inside = false;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const a = outline[i],
        b = outline[j];
      if (
        a.y > y !== b.y > y &&
        x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
      )
        inside = !inside;
    }
    return inside;
  }
  function loveRectInside(x, y, rx, ry, outline) {
    for (const sx of [-1, 0, 1])
      for (const sy of [-1, 0, 1])
        if (!loveInsideOutline(x + sx * rx, y + sy * ry, outline)) return false;
    return true;
  }
  let loveCaptionFrame = null;
  function loveFinalCaption() {
    const key = w + ":" + h + ":" + state.view;
    if (loveCaptionFrame?.key === key) return loveCaptionFrame;
    const f = loveFinalFrame(),
      outline = loveFinalOutline(),
      measure = document.createElement("canvas").getContext("2d"),
      lines = [
        { text: "把整个星河", x: f.x, y: f.y + f.radius * 0.47 },
        { text: "都送给你", x: f.x, y: f.y + f.radius * 0.58 },
      ];
    let font = Math.min(16, Math.max(9, f.radius * 0.085));
    for (let i = 0; i < 20; i++) {
      measure.font = `${font}px "Songti SC",serif`;
      if (
        lines.every((p) =>
          loveRectInside(
            p.x,
            p.y,
            measure.measureText(p.text).width * 0.52 + 3,
            font * 0.7 + 2,
            outline,
          ),
        )
      )
        break;
      font *= 0.97;
    }
    return (loveCaptionFrame = { key, lines, font });
  }
  function loveFinalWords(show) {
    const cached = show.finaleLayout;
    if (
      cached?.glyphs === show.glyphs &&
      cached.width === w &&
      cached.height === h &&
      cached.view === state.view
    )
      return cached.words;
    const f = loveFinalFrame(),
      outline = loveFinalOutline(),
      words = [];
    loveFinaleLines.forEach((line, i) => {
      const parts = show.glyphs.filter((g) => g.lang === line.lang),
        font = parts[0].font,
        gap = font * (i ? 0.3 : 0.08),
        width =
          parts.reduce((n, g) => n + g.wordWidth, 0) + gap * (parts.length - 1),
        y = f.y + f.radius * (i ? 0.28 : -0.05);
      let scale = Math.min(
        1.65,
        (f.radius * 1.36) / Math.max(width, 1),
        (f.radius * (i ? 0.17 : 0.28)) / font,
        (h * (i ? 0.055 : 0.09)) / font,
      );
      // Leave room for the shared gentle rotation, pulse, glow and perspective.
      for (
        let n = 0;
        n < 35 &&
        !loveRectInside(
          f.x,
          y,
          width * scale * 0.57 + 8,
          font * scale * 0.77 + 6,
          outline,
        );
        n++
      )
        scale *= 0.96;
      let x = f.x - (width * scale) / 2;
      for (const g of parts) {
        words.push({ g, scale, x: x + (g.wordWidth * scale) / 2, y });
        x += (g.wordWidth + gap) * scale;
      }
    });
    show.finaleLayout = {
      glyphs: show.glyphs,
      width: w,
      height: h,
      view: state.view,
      words,
    };
    return words;
  }
  let loveFlowerFrame = null;
  function loveFinalFlowerPose(rank) {
    const key = w + ":" + h + ":" + state.view;
    if (!loveFlowerFrame || loveFlowerFrame.key !== key) {
      const f = loveFinalFrame(),
        outline = loveFinalOutline(1.035),
        clip = meshRoseViewport(),
        angles = [1.3, 1.82, 2.35, TAU - 2.35, TAU - 1.82, TAU - 1.3];
      loveFlowerFrame = {
        key,
        poses: angles.map((a) => {
          const index = Math.round((a / TAU) * 240) % 240,
            p = outline[index],
            before = outline[(index + 239) % 240],
            after = outline[(index + 1) % 240],
            dx = after.x - before.x,
            dy = after.y - before.y,
            length = Math.hypot(dx, dy),
            nx = dy / length,
            ny = -dx / length,
            room = Math.min(
              nx > 0
                ? (w - 12 - p.x) / nx
                : nx < 0
                  ? (12 - p.x) / nx
                  : Infinity,
              ny > 0
                ? (clip.bottom - p.y) / ny
                : ny < 0
                  ? (clip.top - p.y) / ny
                  : Infinity,
            ),
            gap = 10,
            size = Math.max(
              10,
              Math.min(
                88,
                f.radius * 0.36,
                w * 0.13,
                h * 0.15,
                (room - gap) / 1.7,
              ),
            ),
            offset = size * 0.54 + gap;
          return { x: p.x + nx * offset, y: p.y + ny * offset, nx, ny, size };
        }),
      };
    }
    return loveFlowerFrame.poses[rank];
  }
  function loveRoseBirths(show, finale = false) {
    const key = finale ? "finale" : "garden";
    show.roseBorn ??= {
      garden: Array(3).fill(null),
      finale: Array(6).fill(null),
    };
    return show.roseBorn[key];
  }
  function revealLoveRose(id, cue) {
    const show = textCloud;
    if (show?.kind !== "love" || show.id !== id) return;
    const births = loveRoseBirths(show, cue.finale);
    if (births[cue.rank] !== null) return;
    births[cue.rank] = show.age;
    depthDirty = true;
  }
  function launchLoveRose(show, rank, finale = false) {
    const p = finale
      ? loveFinalFlowerPose(rank)
      : acceptedRoseAnchor(rank, 13 + rank * 0.65);
    return launch(p.x, p.y, {
      shape: "sphere",
      type: show.effect,
      power: finale ? 0.34 : 0.48,
      hue: 337 + (rank % 3) * 7,
      duration: 2.6,
      companion: true,
      wishId: show.id,
      loveShell: true,
      roseCue: { rank, finale },
    });
  }
  function advanceLoveRoses(show) {
    show.roseFired ??= Array(6).fill(false);
    for (let rank = 0; rank < 6; rank++) {
      const pair = Math.min(rank, 5 - rank),
        at = 38.3 + pair * 0.32;
      if (
        !show.roseFired[rank] &&
        show.age >= at &&
        launchLoveRose(show, rank, true)
      )
        show.roseFired[rank] = true;
    }
  }
  function loveFinalMotion(show, age = show.age) {
    const old = show.finalMotion;
    if (
      old &&
      old.age === age &&
      old.width === w &&
      old.height === h &&
      old.view === state.view &&
      old.reduced === reduced.matches &&
      old.formedAt === show.finaleFormedAt
    )
      return old;
    const local = Math.max(0, age - (show.finaleFormedAt ?? Infinity)),
      motion = reduced.matches ? 0 : clamp(local / 0.9, 0, 1),
      beat = loveHeartbeat(local, 1.55, [
        [0.22, 0.15, 1],
        [0.48, 0.13, 0.35],
      ]),
      spatial = state.view === "3d",
      yaw = spatial ? Math.sin(local * 0.55) * 0.12 * motion : 0,
      pitch = spatial ? Math.sin(local * 0.41) * 0.035 * motion : 0,
      roll = Math.sin(local * 0.39) * 0.012 * motion;
    const result = {
      age,
      width: w,
      height: h,
      view: state.view,
      reduced: reduced.matches,
      formedAt: show.finaleFormedAt,
      pulse: 1 + beat * 0.022 * motion,
      yaw,
      pitch,
      roll,
      lift: Math.sin(local * 0.8) * Math.min(2, h * 0.0025) * motion,
      z: spatial ? Math.sin(local * 0.5) * depthFocal() * 0.022 * motion : 0,
    };
    if (age === show.age) show.finalMotion = result;
    return result;
  }
  function loveFinalWordDrift(show, g, age = show.age) {
    const old = g.finalPose;
    if (
      old &&
      old.age === age &&
      old.width === w &&
      old.height === h &&
      old.view === state.view &&
      old.reduced === reduced.matches &&
      old.formedAt === show.finaleFormedAt
    )
      return old;
    const words = loveFinalWords(show),
      b = words.find((p) => p.g === g),
      m = loveFinalMotion(show, age),
      cy = (words[0].y + words[3].y) / 2,
      dx = (b.x - w * 0.5) * m.pulse,
      dy = (b.y - cy) * m.pulse,
      xx = dx * Math.cos(m.yaw),
      zz = -dx * Math.sin(m.yaw),
      yy = dy * Math.cos(m.pitch) - zz * Math.sin(m.pitch),
      z = m.z + dy * Math.sin(m.pitch) + zz * Math.cos(m.pitch),
      p = loveProject(
        w * 0.5 + xx * Math.cos(m.roll) - yy * Math.sin(m.roll),
        cy + xx * Math.sin(m.roll) + yy * Math.cos(m.roll) + m.lift,
        z,
      ),
      result = {
        ...p,
        scale: b.scale * m.pulse * p.scale,
        roll: m.roll,
        yaw: m.yaw * 0.5,
        pitch: m.pitch * 0.5,
        age,
        width: w,
        height: h,
        view: state.view,
        reduced: reduced.matches,
        formedAt: show.finaleFormedAt,
      };
    if (age === show.age) g.finalPose = result;
    return result;
  }
  function loveFinalWordRelease(show, g) {
    return (show.finaleFormedAt ?? Infinity) + 4.4 + g.finaleOrder * 0.42;
  }
  function loveFinalWordOpacity(show, g) {
    const t = clamp((show.age - loveFinalWordRelease(show, g)) / 1.35, 0, 1);
    return 1 - t * t * (3 - 2 * t);
  }
  function loveFinalWordPetals(show) {
    const count = reduced.matches ? 3 : w < 700 ? 18 : 26,
      petals = [],
      motion = reduced.matches ? 0.18 : 1,
      focal = depthFocal();
    for (const { g } of loveFinalWords(show)) {
      const release = loveFinalWordRelease(show, g),
        elapsed = show.age - release;
      if (g.born === null || elapsed < 0 || elapsed > 6) continue;
      for (let i = 0; i < count; i++) {
        const local = elapsed - 0.08 - (i / count) * 0.75;
        if (local < 0 || local > 5.1) continue;
        const origin = loveWordPetalOrigin(show, g, i, count, release, 0.75),
          phase = i * 2.39996 + g.finaleOrder * 1.7,
          p = lovePetalTravel(
            origin,
            local,
            Math.sin(phase) * (14 + (i % 3) * 5) * motion,
            6 + (i % 4) * 3,
            state.view === "3d"
              ? focal * (i % 6 === 0 ? -0.16 : 0.02 + (i % 3) * 0.025) * motion
              : 0,
            11,
          );
        if (!p) continue;
        const size = Math.min(
            46,
            (6 + g.font * 0.18) * (0.7 + 0.3 * loveEase(local / 1.2)) * p.scale,
          ),
          alpha =
            loveEase(local / 0.28) *
            loveEase((5.1 - local) / 1.2) *
            clamp((4.6 - p.scale) / 1.5, 0, 1) *
            lovePetalScreenFade(p.y) *
            loveTextVisibility(show, p.x, p.y, size);
        petals.push({
          ...p,
          alpha,
          size,
          rotation: phase + local * 0.32 * motion,
          tumble: lovePetalTumble(local, phase, motion),
          color: show.rainbow && i % 9 === 0 ? 5 : (i + g.finaleOrder) % 5,
          layer: i % 6,
          owner: g.finaleOrder,
        });
      }
    }
    return petals.sort((a, b) => b.z - a.z);
  }
  function loveTextVisibility(show, x, y, size = 0) {
    // Every mote shares these moving reading areas; build them once per animation frame.
    const finale = show.age >= 10.2;
    let mask = show.heartReadMask;
    if (
      !mask ||
      mask.age !== show.age ||
      mask.width !== w ||
      mask.height !== h ||
      mask.view !== state.view ||
      mask.reduced !== reduced.matches ||
      mask.formedAt !== show.finaleFormedAt ||
      mask.glyphs !== show.glyphs
    ) {
      const boxes = [];
      for (const g of show.glyphs) {
        if (Boolean(g.finaleOnly) !== finale || g.born === null) continue;
        const fade = finale
          ? loveFinalWordOpacity(show, g)
          : loveWordOpacity(show, g);
        if (finale ? fade < 0.005 : fade <= 0) continue;
        const p = finale ? loveFinalWordDrift(show, g) : loveWordDrift(show, g),
          sn = Math.abs(Math.sin(p.roll));
        boxes.push({
          x: p.x,
          y: p.y,
          rx: finale
            ? (g.wordWidth * 0.56 + g.font * sn) * p.scale
            : (g.wordWidth / 2 + sn * g.font) * p.scale + 8,
          ry: finale
            ? (g.font * 0.7 + g.wordWidth * sn * 0.5) * p.scale
            : (g.font * 0.65 + (sn * g.wordWidth) / 2) * p.scale + 8,
          fade,
        });
      }
      if (finale && show.age >= 32) {
        const english = show.glyphs.filter(
          (g) => g.lang === "en" && g.born !== null,
        );
        if (english.length === 3) {
          const fade =
              clamp(
                (show.age - Math.max(...english.map((g) => g.born))) / 1.2,
                0,
                1,
              ) * clamp((show.duration - show.age) / 2, 0, 1),
            caption = loveFinalCaption();
          ctx.save();
          ctx.font = `${caption.font}px "Songti SC",serif`;
          for (const line of caption.lines)
            boxes.push({
              x: line.x,
              y: line.y,
              rx: ctx.measureText(line.text).width * 0.52 + 4,
              ry: caption.font * 0.75 + 3,
              fade,
            });
          ctx.restore();
        }
      }
      mask = show.heartReadMask = {
        age: show.age,
        width: w,
        height: h,
        view: state.view,
        reduced: reduced.matches,
        formedAt: show.finaleFormedAt,
        glyphs: show.glyphs,
        edge: finale ? 30 : 22,
        boxes,
      };
    }
    let opacity = 1;
    for (const p of mask.boxes) {
      const dx = Math.max(Math.abs(x - p.x) - p.rx - size * 0.3, 0),
        dy = Math.max(Math.abs(y - p.y) - p.ry - size * 0.3, 0);
      if (dx >= mask.edge || dy >= mask.edge) continue;
      opacity = Math.min(
        opacity,
        1 - (1 - clamp(Math.hypot(dx, dy) / mask.edge, 0.08, 1)) * p.fade,
      );
    }
    return opacity;
  }
  function loveRosePose(rank) {
    const centerY = h < 540 ? h * 0.43 : h * 0.4,
      spread = Math.min(w * 0.23, 215),
      size = Math.min(w * 0.26, h * 0.225, 190);
    return {
      x: w * 0.5 + (rank - 1) * spread,
      y: centerY + (rank === 1 ? -size * 0.28 : size * 0.06),
      size,
    };
  }
  function loveSalvo(show, cue) {
    const fire = (
      x,
      y,
      shape,
      power,
      color = show.baseHue,
      type = show.effect,
    ) =>
      launch(x, y, {
        shape,
        type,
        power,
        hue: color,
        duration: 2.6,
        companion: true,
        wishId: show.id,
        loveShell: true,
      });
    if (cue.kind === "grand") {
      const n = reduced.matches ? 3 : w < 700 ? 6 : 8;
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.5) / n) * TAU + (cue.at > 42 ? 0.32 : 0);
        fire(
          w * 0.5 + Math.cos(a) * w * 0.4,
          clamp(h * 0.44 + Math.sin(a) * h * 0.27, 170, h - 155),
          "heart",
          w < 700 ? 0.72 : 0.95,
          show.rainbow ? i * 137.5 : 337 + (i % 3) * 17,
          i % 3 === 0 ? "petal" : show.effect,
        );
      }
      return;
    }
    if (cue.kind === "rose") {
      launchLoveRose(show, cue.rank);
      return;
    }
    if (cue.kind === "hearts") {
      for (const side of [-1, 1])
        fire(
          w * 0.5 + side * Math.min(w * 0.2, 170),
          h * 0.43,
          "heart",
          w < 700 ? 0.65 : 0.9,
          side < 0 ? 337 : 43,
        );
      return;
    }
    if (cue.kind === "rings") {
      for (const side of [-1, 1])
        fire(
          w * 0.5 + side * w * 0.2,
          h * 0.43,
          state.view === "3d" ? "saturn" : "ring",
          0.62,
          side < 0 ? 332 : 43,
        );
      return;
    }
    if (cue.kind === "wings") {
      for (const side of [-1, 1])
        fire(
          w * (side < 0 ? 0.2 : 0.8),
          h * 0.32,
          "heart",
          0.62,
          side < 0 ? 337 : 43,
          "butterfly",
        );
      return;
    }
    const n = reduced.matches ? 3 : w < 700 ? 4 : 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU,
        x = w * 0.5 + Math.cos(a) * w * 0.37,
        y = clamp(h * 0.43 + Math.sin(a) * h * 0.22, 180, h - 165);
      fire(
        x,
        y,
        i % 3 === 0 ? "heart" : i % 3 === 1 ? "ring" : "sphere",
        w < 700 ? 0.57 : 0.8,
        show.rainbow ? i * 137.5 : 337 + (i % 3) * 24,
      );
    }
  }
  function advanceLoveShow(show, dt) {
    for (const g of show.glyphs)
      if (!g.fired && show.age >= g.launchAt) {
        g.fired = true;
        g.flightAt = show.age;
        launch(g.x, g.y, {
          wishGlyph: g.rank,
          loveWord: g.rank,
          wishId: show.id,
          type: show.effect,
          hue: g.hue,
          duration: g.flightDuration,
          sx: w * (0.06 + (0.88 * g.rank) / (show.glyphs.length - 1)),
        });
      }
    for (const cue of loveCues)
      if (show.lastAge < cue.at && show.age >= cue.at) loveSalvo(show, cue);
    if (show.age >= show.nextAccent && show.age < 8) {
      const i = Math.floor(show.nextAccent),
        x = i % 2 ? w * 0.08 : w * 0.92,
        y = h * 0.45;
      burst(x, y, show.rainbow ? i * 57 : 337, show.effect, 0.4, "heart", {
        companion: true,
        noEcho: true,
        density: 0.65,
        quiet: true,
      });
      show.nextAccent = show.age + 2.3;
    }
    advanceLoveRoses(show);
    show.lastAge = show.age;
    syncLoveUI();
    if (show.age >= show.duration) finishWishShow();
  }
  function lovePetalTexture(hue, layer = 0, back = false) {
    const color = Math.round(hue / 5) * 5,
      tone = Math.min(2, Math.floor(layer / 2)),
      key = color + ":" + tone + ":" + back;
    if (lovePetalCache.has(key)) return lovePetalCache.get(key);
    const plate = document.createElement("canvas");
    plate.width = plate.height = 160;
    const c = plate.getContext("2d");
    c.translate(80, 86);
    const path = () => {
      c.beginPath();
      c.moveTo(-10, 45);
      if (tone === 0) {
        c.bezierCurveTo(-18, 30, -50, 15, -59, -15);
        c.bezierCurveTo(-68, -39, -52, -65, -30, -66);
        c.bezierCurveTo(-17, -69, -10, -57, 1, -60);
        c.bezierCurveTo(20, -70, 43, -63, 51, -47);
        c.bezierCurveTo(63, -42, 58, -27, 53, -12);
        c.bezierCurveTo(46, 16, 22, 27, 9, 44);
      } else if (tone === 1) {
        c.bezierCurveTo(-17, 25, -39, 13, -43, -12);
        c.bezierCurveTo(-53, -38, -37, -64, -13, -67);
        c.bezierCurveTo(2, -69, 12, -59, 23, -62);
        c.bezierCurveTo(48, -64, 57, -37, 45, -17);
        c.bezierCurveTo(35, 5, 16, 24, 9, 44);
      } else {
        c.bezierCurveTo(-18, 28, -49, 13, -56, -11);
        c.bezierCurveTo(-64, -33, -52, -55, -35, -58);
        c.bezierCurveTo(-29, -65, -13, -65, -3, -59);
        c.bezierCurveTo(12, -52, 20, -68, 35, -57);
        c.bezierCurveTo(56, -53, 61, -35, 51, -14);
        c.bezierCurveTo(42, 10, 21, 25, 9, 44);
      }
      c.quadraticCurveTo(-1, 52, -10, 45);
      c.closePath();
    };
    // Blush pink, translucent edges and a cool mauve throat rather than scarlet velvet.
    const pink = color >= 300 ? 328 + (color - 325) * 0.42 : 26,
      lift = back ? 4 : 0;
    path();
    const velvet = c.createLinearGradient(-36, -63, 27, 48);
    velvet.addColorStop(
      0,
      `hsl(${pink + 5},${back ? 36 : 44}%,${83 - tone * 2 + lift}%)`,
    );
    velvet.addColorStop(
      0.3,
      `hsl(${pink + 2},${back ? 37 : 46}%,${75 - tone * 3 + lift}%)`,
    );
    velvet.addColorStop(
      0.72,
      `hsl(${pink - 3},${back ? 34 : 42}%,${65 - tone * 3 + lift}%)`,
    );
    velvet.addColorStop(1, `hsl(${pink - 7},32%,${49 - tone * 3 + lift}%)`);
    c.fillStyle = velvet;
    c.fill();
    c.save();
    path();
    c.clip();
    const silk = c.createLinearGradient(-42, 0, 32, 4);
    silk.addColorStop(0, "#ffffff00");
    silk.addColorStop(0.38, "#ffe1d80a");
    silk.addColorStop(0.52, "#ffe9dc12");
    silk.addColorStop(0.7, "#510d250e");
    silk.addColorStop(1, "#ffffff00");
    c.fillStyle = silk;
    c.fillRect(-72, -76, 144, 134);
    for (let i = 0; i < 45; i++) {
      const edge = -52 + i * 2.4;
      c.beginPath();
      c.moveTo(-2 + ((i % 3) - 1) * 1.2, 48);
      c.bezierCurveTo(
        (i - 22) * 0.63,
        21,
        edge * 0.7,
        -19,
        edge,
        -53 + Math.sin(i * 0.6) * 7,
      );
      c.strokeStyle = `hsla(${pink + 8},35%,${back ? 85 : 80}%,${i % 5 === 0 ? 0.09 : 0.035})`;
      c.lineWidth = i % 5 === 0 ? 0.38 : 0.22;
      c.stroke();
    }
    const grain = seeded(2301 + tone * 97);
    for (let i = 0; i < 720; i++) {
      const x = grain() * 122 - 61,
        y = grain() * 124 - 70;
      c.fillStyle = i % 3 ? "#fff1e30b" : "#49112708";
      c.fillRect(x, y, 0.2 + grain() * 0.45, 0.2 + grain() * 0.35);
    }
    // A narrow rolled lip casts its own shadow; it does not shade the petal like a sphere.
    c.beginPath();
    c.moveTo(-50 + tone * 4, -45);
    c.bezierCurveTo(-42, -63, -29, -68, -14, -59);
    c.bezierCurveTo(-2, -51, 13, -66, 30, -57);
    c.bezierCurveTo(41, -51, 47, -43, 49, -37);
    c.bezierCurveTo(39, -49, 27, -53, 15, -52);
    c.bezierCurveTo(-7, -48, -28, -64, -50 + tone * 4, -45);
    const lip = c.createLinearGradient(0, -66, 3, -43);
    lip.addColorStop(0, `hsla(${pink + 8},35%,89%,.5)`);
    lip.addColorStop(0.3, `hsla(${pink + 4},41%,81%,.35)`);
    lip.addColorStop(0.8, `hsla(${pink - 6},32%,46%,.2)`);
    lip.addColorStop(1, "#00000000");
    c.fillStyle = lip;
    c.fill();
    c.strokeStyle = `hsla(${pink + 9},34%,90%,${back ? 0.3 : 0.42})`;
    c.lineWidth = 0.42;
    c.beginPath();
    c.moveTo(-50 + tone * 4, -45);
    c.bezierCurveTo(-42, -63, -29, -68, -14, -59);
    c.bezierCurveTo(-2, -51, 13, -66, 30, -57);
    c.stroke();
    c.restore();
    if (lovePetalCache.size >= 96)
      lovePetalCache.delete(lovePetalCache.keys().next().value);
    lovePetalCache.set(key, plate);
    return plate;
  }
  function lovePetalPose(petal, open) {
    const t = clamp((open - (5 - petal.layer) * 0.065) / 0.67, 0, 1),
      u = t * t * (3 - 2 * t),
      radius = petal.radius * (0.13 + 0.87 * u),
      angle = petal.angle;
    return {
      x: petal.cx * (0.13 + 0.87 * u),
      y: petal.cy * (0.13 + 0.87 * u),
      size: petal.size * (0.31 + 0.69 * u),
      rotation: (1 - u) * Math.sin(angle) * 0.2,
      wide: 0.72 + 0.28 * u,
      flutter: 0.68 + 0.32 * u,
      depth: petal.layer,
      shade: 1,
    };
  }
  function loveRoseAtlas(hue) {
    if (loveRoseAtlasCache.has(hue)) return loveRoseAtlasCache.get(hue);
    const sheet = document.createElement("canvas");
    sheet.width = 160;
    sheet.height = 480;
    const c = sheet.getContext("2d");
    for (let tone = 0; tone < 3; tone++)
      c.drawImage(
        lovePetalTexture(hue - tone * 3, tone * 2),
        0,
        tone * 160,
        160,
        160,
      );
    if (loveRoseAtlasCache.size >= 8)
      loveRoseAtlasCache.delete(loveRoseAtlasCache.keys().next().value);
    loveRoseAtlasCache.set(hue, sheet);
    return sheet;
  }
  function paintLoveRose(c, hue, effect, open, size = 512) {
    const sheet = loveRosePhotoReady ? null : loveRoseAtlas(hue),
      alpha = c.globalAlpha;
    c.save();
    c.scale(size / 512, size / 512);
    if (loveRosePhotoReady) {
      const scale = 0.31 + 0.69 * loveEase(open);
      c.drawImage(
        loveRosePhotoPlate,
        -256 * scale,
        -256 * scale,
        512 * scale,
        512 * scale,
      );
    }
    const petals = loveRosePetals
      .map((petal, i) => ({ petal, i, p: lovePetalPose(petal, open) }))
      .sort((a, b) => a.p.depth - b.p.depth);
    for (const { petal, i, p } of petals) {
      const fragment = loveRoseFragment(petal);
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rotation);
      c.scale(p.wide, p.flutter);
      c.globalAlpha =
        alpha * (fragment ? Math.sin(clamp(open, 0, 1) * Math.PI) * 0.3 : 1);
      if (fragment)
        c.drawImage(fragment, -p.size / 2, -p.size / 2, p.size, p.size);
      else
        c.drawImage(
          sheet,
          0,
          Math.floor(petal.layer / 2) * 160,
          160,
          160,
          -p.size / 2,
          -p.size / 2,
          p.size,
          p.size,
        );
      c.restore();
      if (i % 8 === 0 && open > 0.25) {
        const type =
            effect === "mix" ? materialTypes[(i + petal.layer) % 5] : effect,
          spark = type === "gold" ? 2.8 : 4.5;
        c.globalAlpha = alpha * 0.18;
        c.drawImage(
          sprite(hue + petal.layer * 9, type),
          p.x - spark / 2,
          p.y - p.size * 0.18 - spark / 2,
          spark,
          spark,
        );
        c.globalAlpha = alpha;
      }
    }
    c.restore();
  }
  function loveRose(hue, effect, open = 1) {
    const frame = Math.round(clamp(open, 0, 1) * 14),
      key = hue + ":" + effect + ":" + frame;
    if (loveRoseCache.has(key)) return loveRoseCache.get(key);
    const plate = document.createElement("canvas");
    plate.width = plate.height = 384;
    const c = plate.getContext("2d");
    c.scale(0.75, 0.75);
    c.translate(256, 256);
    paintLoveRose(c, hue, effect, frame / 14);
    if (loveRoseCache.size >= 72)
      loveRoseCache.delete(loveRoseCache.keys().next().value);
    loveRoseCache.set(key, plate);
    return plate;
  }
  function loveRoseScatter(show, rank) {
    const start = 18.6 + rank * 0.65,
      time = show.age - start;
    if (time < 0 || time > 6) return [];
    const points = [],
      motion = reduced.matches ? 0.2 : 1;
    let cache = show.roseRainOrigins;
    if (
      !cache ||
      cache.width !== w ||
      cache.height !== h ||
      cache.view !== state.view ||
      cache.reduced !== reduced.matches
    )
      cache = show.roseRainOrigins = {
        width: w,
        height: h,
        view: state.view,
        reduced: reduced.matches,
        points: [],
      };
    for (let i = 0; i < loveRosePetals.length; i++) {
      const petal = loveRosePetals[i],
        local = time - petal.layer * 0.075;
      if (local < 0) continue;
      const p = lovePetalPose(petal, 1),
        key = rank * loveRosePetals.length + i;
      let origin = cache.points[key];
      if (!origin) {
        const at = start + petal.layer * 0.075,
          poseAt = (t) => {
            const a = loveDepthRosePose(rank, t);
            return {
              x: a.worldX,
              y: a.worldY,
              z: a.z,
              yaw: a.yaw,
              pitch: a.pitch,
              roll: a.roll,
            };
          },
          pose = poseAt(at),
          scale = (loveRosePose(rank).size * 1.35) / 512,
          m = lovePlaneFrame(pose),
          c = Math.cos(p.rotation),
          s = Math.sin(p.rotation),
          unit = p.size * scale;
        origin = cache.points[key] = {
          ...loveMovingPlanePoint(poseAt, at, p.x * scale, p.y * scale),
          a: (m.ax * c + m.bx * s) * p.wide * unit,
          b: (m.ay * c + m.by * s) * p.wide * unit,
          c: (m.bx * c - m.ax * s) * p.flutter * unit,
          d: (m.by * c - m.ay * s) * p.flutter * unit,
          rotation: p.rotation + pose.roll,
          unit,
        };
        origin.scale = loveProject(origin.x, origin.y, origin.z).scale;
      }
      const side = Math.cos(petal.angle),
        projected = lovePetalTravel(
          origin,
          local,
          side * (22 + petal.layer * 4) * motion,
          -12,
          state.view === "3d"
            ? depthFocal() *
                (i % 4 === 0 ? 0.1 : -0.12 - (i % 3) * 0.045) *
                motion
            : 0,
          11 + (i % 4) * 2,
        );
      if (!projected) continue;
      const blend = loveEase(local / 0.85),
        ratio = projected.scale / origin.scale,
        size = Math.min(72, origin.unit * projected.scale),
        rotation = origin.rotation + local * (0.35 + (i % 3) * 0.18) * motion,
        tumble = lovePetalTumble(local, i * 2.39996, motion, blend),
        c = Math.cos(rotation),
        s = Math.sin(rotation),
        matrix = [
          origin.a * ratio * (1 - blend) +
            (c * tumble.a - s * tumble.b) * size * blend,
          origin.b * ratio * (1 - blend) +
            (s * tumble.a + c * tumble.b) * size * blend,
          origin.c * ratio * (1 - blend) - s * tumble.d * size * blend,
          origin.d * ratio * (1 - blend) + c * tumble.d * size * blend,
        ];
      const alpha =
        loveEase(local / 0.35) *
        loveEase((5.8 - time) / 1.3) *
        clamp((4.5 - projected.scale) / 1.5, 0, 1) *
        clamp((projected.y - 162) / 35, 0, 1) *
        clamp((h - 115 - projected.y) / 45, 0, 1) *
        loveTextVisibility(show, projected.x, projected.y);
      points.push({
        ...projected,
        alpha,
        size: Math.max(
          Math.hypot(matrix[0], matrix[1]),
          Math.hypot(matrix[2], matrix[3]),
        ),
        matrix,
        rotation,
        tumble,
        hue: [344, 350, 335][rank] + Math.sin(i) * 9,
        layer: petal.layer,
        source: i,
        blend,
      });
    }
    return points;
  }
  function drawLoveRoseScatter(show) {
    const points = [0, 1, 2]
      .flatMap((rank) => loveRoseScatter(show, rank))
      .filter((p) => p.alpha > 0.01 && p.x > -80 && p.x < w + 80)
      .sort((a, b) => b.z - a.z);
    for (const p of points) {
      const surface = state.view === "3d" && p.scale > 1.3 ? nearFx : ctx,
        fragment = loveRoseFragment(loveRosePetals[p.source]),
        blend = fragment ? p.blend : 1,
        alpha = p.alpha * 0.92;
      if (
        loveGpuFrame &&
        (!fragment || gpuLoveFragment(p, alpha * (1 - blend), surface))
      ) {
        gpuLovePetal(p, alpha * blend, p.hue, p.layer, surface, p.matrix);
        continue;
      }
      surface.save();
      surface.globalAlpha = alpha;
      surface.globalCompositeOperation = "source-over";
      surface.save();
      surface.transform(...p.matrix, p.x, p.y);
      if (fragment && blend < 1) {
        surface.globalAlpha = alpha * (1 - blend);
        surface.drawImage(fragment, -0.5, -0.5, 1, 1);
      }
      surface.globalAlpha = alpha * blend;
      paintLovePetalFaces(
        surface,
        [lovePetalTexture(p.hue, p.layer)],
        [lovePetalTexture(p.hue, p.layer, true)],
        1,
        p.tumble,
      );
      surface.restore();
      surface.globalAlpha = alpha * blend;
      surface.translate(p.x, p.y);
      surface.rotate(p.rotation);
      paintLovePetalEdge(surface, p.size, p.tumble);
      surface.restore();
    }
  }
  const loveHeartMeshes = new Map();
  function loveHeartPoints(
    x,
    y,
    size,
    yaw,
    z = 0,
    pitch = 0,
    count = 170,
    symmetry = 0,
  ) {
    let mesh = loveHeartMeshes.get(count);
    if (!mesh) {
      mesh = Array.from({ length: count }, (_, i) => {
        const a = (i / count) * TAU;
        return {
          x: (16 * Math.sin(a) ** 3) / 17,
          y:
            -(
              13 * Math.cos(a) -
              5 * Math.cos(2 * a) -
              2 * Math.cos(3 * a) -
              Math.cos(4 * a)
            ) / 17,
          z: Math.sin(a * 2) * 0.35,
          symZ: Math.cos(a * 2) * 0.12,
        };
      });
      loveHeartMeshes.set(count, mesh);
    }
    const points = [],
      cy = Math.cos(yaw),
      sy = Math.sin(yaw),
      cp = Math.cos(pitch),
      sp = Math.sin(pitch);
    for (let i = 0; i < count; i++) {
      const q = mesh[i],
        xx = q.x * size,
        yy = q.y * size,
        zz =
          (q.z * (1 - symmetry) +
            (state.view === "3d" ? q.symZ : 0) * symmetry) *
          size,
        rx = xx * cy + zz * sy,
        rz = zz * cy - xx * sy,
        p = loveProject(x + rx, y + yy * cp - rz * sp, z + yy * sp + rz * cp);
      if (p) points.push({ ...p, i });
    }
    return points.sort((a, b) => b.z - a.z);
  }
  function drawLoveHeart(
    show,
    x,
    y,
    size,
    yaw,
    alpha,
    color,
    z = 0,
    pitch = 0,
    echo = false,
  ) {
    if (state.view === "3d") {
      const points = loveHeartPoints(
          x,
          y,
          size,
          yaw,
          z,
          pitch,
          echo ? 110 : 170,
          echo ? 0 : loveEase((show.age - 28.8) / 3.2),
        ),
        clip = meshRoseViewport();
      ctx.save();
      nearFx.save();
      ctx.globalCompositeOperation = nearFx.globalCompositeOperation =
        "source-over";
      for (const p of points) {
        if (p.x < -35 || p.x > w + 35 || p.y < clip.top || p.y > clip.bottom)
          continue;
        const type =
            p.i % 7 === 0
              ? show.effect === "mix"
                ? materialTypes[Math.floor(p.i / 7) % 5]
                : show.effect
              : "gold",
          hue = color + (show.rainbow ? p.i * 0.7 : 0),
          s = Math.min(30, (type === "gold" ? 7 : 13) * p.scale),
          visibility =
            loveTextVisibility(show, p.x, p.y, s) * lovePetalScreenFade(p.y),
          surface = p.scale > 1.5 ? nearFx : ctx,
          opacity =
            alpha *
            visibility *
            clamp((5 - p.scale) / 2, 0, 1) *
            (0.65 + 0.35 * Math.min(p.scale, 1.5));
        if (gpuLoveMote(surface, p.x, p.y, s, hue, type, opacity)) continue;
        surface.globalAlpha = opacity;
        surface.drawImage(sprite(hue, type), p.x - s / 2, p.y - s / 2, s, s);
      }
      nearFx.restore();
      ctx.restore();
      return;
    }
    const points = [];
    for (let i = 0; i < 170; i++) {
      const a = (i / 170) * TAU,
        xx = (16 * Math.sin(a) ** 3) / 17,
        yy =
          -(
            13 * Math.cos(a) -
            5 * Math.cos(2 * a) -
            2 * Math.cos(3 * a) -
            Math.cos(4 * a)
          ) / 17,
        z = state.view === "3d" ? Math.sin(a * 2) * 0.2 : 0,
        rx = xx * Math.cos(yaw) + z * Math.sin(yaw),
        rz = z * Math.cos(yaw) - xx * Math.sin(yaw),
        scale = state.view === "3d" ? 1 / (1 + rz * 0.38) : 1;
      points.push({
        x: x + rx * size * scale,
        y: y + yy * size * scale,
        scale,
        i,
      });
    }
    points.sort((a, b) => a.scale - b.scale);
    for (const p of points) {
      const type =
          p.i % 7 === 0
            ? show.effect === "mix"
              ? materialTypes[Math.floor(p.i / 7) % 5]
              : show.effect
            : "gold",
        hue = color + (show.rainbow ? p.i * 0.7 : 0),
        s = (type === "gold" ? 9 : 15) * p.scale;
      ctx.globalAlpha = alpha * (0.65 + 0.35 * p.scale);
      ctx.drawImage(sprite(hue, type), p.x - s / 2, p.y - s / 2, s, s);
    }
  }
  function drawLoveGarden(show) {
    drawDepthLoveGarden(show);
  }
  function drawLoveShow(show) {
    const t = show.age,
      motion = reduced.matches ? 0.18 : 1,
      exit = clamp((show.duration - t) / 2, 0, 1),
      cx = w * 0.5,
      cy = h < 540 ? h * 0.45 : h * 0.44;
    beginLoveGpu();
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    // Aurora-coloured silk, and a slow cascade whose foreground petals have a larger scale.
    const glow = ctx.createRadialGradient(
      cx,
      cy,
      20,
      cx,
      cy,
      Math.max(w, h) * 0.65,
    );
    glow.addColorStop(0, "#62244312");
    glow.addColorStop(0.6, "#2e173a0a");
    glow.addColorStop(1, "#03091100");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    const rain = clamp((t - 9) / 3, 0, 1),
      roseBlend = loveRoseRainBlend(show),
      count = reduced.matches ? 28 : w < 700 ? 75 : 125;
    if (state.view === "3d") drawDepthLoveRain(show, rain, exit);
    else
      for (let i = 0; i < count; i++) {
        const u = (t * 0.047 * motion + i * 0.618034) % 1,
          x =
            ((((i * 0.381966 + Math.sin(t * 0.18 * motion + i) * 0.025) % 1) +
              1) %
              1) *
            w,
          y = 170 + u * Math.max(60, h - 290),
          depth = 0.55 + (i % 5) * 0.27,
          size = (i % 3 === 0 ? 17 : 10) * depth,
          angle = t * 0.5 * motion + i,
          tumble = lovePetalTumble(t, i * 2.39996, motion);
        ctx.save();
        const alpha =
          rain * exit * 0.62 * loveEase(u / 0.1) * loveEase((1 - u) / 0.12);
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.save();
        ctx.transform(tumble.a, tumble.b, tumble.c, tumble.d, 0, 0);
        if (roseBlend < 1) {
          ctx.globalAlpha = alpha * (1 - roseBlend);
          ctx.drawImage(
            sprite(
              show.rainbow ? i * 137.5 : 337 + (i % 4) * 12,
              "petal",
              i % 3,
            ),
            -size / 2,
            -size / 2,
            size,
            size,
          );
        }
        if (roseBlend > 0) {
          ctx.globalAlpha = alpha * roseBlend;
          const sheet = wordPetalAtlas(),
            sx = (show.rainbow && i % 9 === 0 ? 5 : i % 5) * 160,
            sy = (i % 3) * 160;
          paintLovePetalFaces(
            ctx,
            [sheet, sx, sy, 160, 160],
            [sheet, sx, sy + 480, 160, 160],
            size,
            tumble,
          );
        }
        ctx.restore();
        ctx.globalAlpha = alpha * roseBlend;
        paintLovePetalEdge(ctx, size, tumble);
        ctx.restore();
      }
    if (t < 10.2) drawLoveWords(show);
    drawLoveWordPetals(show);
    if (t >= 10 && t < 26.2) drawLoveGarden(show);
    if (t >= 24.7) {
      const local = t - 24.7,
        final = t >= 32,
        merge = loveEase((t - 28.8) / 3.2),
        fade = clamp(local / 1.2, 0, 1) * exit,
        radius = Math.min(w * 0.31, h * 0.29, 250),
        separation =
          Math.min(w * 0.18, 150) *
          (1 - loveEase(local / 6) * 0.6) *
          (1 - merge),
        pulse = 1 + Math.sin(local * 2.4) ** 6 * 0.035 * motion;
      const hearts = [-1, 1]
        .map((side) => ({
          side,
          z:
            state.view === "3d"
              ? side *
                Math.sin(local * 0.55) *
                depthFocal() *
                0.24 *
                (1 - merge) *
                motion
              : 0,
        }))
        .sort((a, b) => b.z - a.z);
      for (const { side, z } of hearts)
        drawLoveHeart(
          show,
          cx + side * separation,
          cy,
          radius * pulse * (1 + 0.12 * merge),
          side * (0.3 + Math.sin(local * 0.55) * 0.32) * motion * (1 - merge),
          fade * 0.85,
          side < 0 ? 337 : 43,
          z,
          Math.sin(local * 0.4) * 0.22 * motion * (1 - merge),
        );
      if (state.view === "3d" && !reduced.matches) {
        const u = (t - 28) / 3.5;
        if (u >= 0 && u <= 1)
          drawLoveHeart(
            show,
            cx - w * (0.1 + u * 0.12),
            cy - h * 0.08 * u,
            radius * 0.65,
            -(0.35 - u * 0.8),
            Math.sin(u * Math.PI) * 0.22 * exit * (1 - merge),
            show.rainbow ? t * 22 : 337,
            depthFocal() * (0.9 - u * 1.65),
            0.2,
            true,
          );
      }
      if (local > 2)
        for (let i = 0; i < 180; i++) {
          const a = (i / 180) * TAU + local * 0.1 * motion,
            den = 1 + Math.sin(a) ** 2,
            x = cx + (Math.cos(a) / den) * radius * 1.55,
            y = cy + ((Math.sin(a) * Math.cos(a)) / den) * radius * 0.65,
            s = 3.5,
            alpha = fade * 0.55 * loveEase(local - 2),
            hue = show.rainbow ? i * 2 : 43;
          if (gpuLoveMote(ctx, x, y, s, hue, "gold", alpha)) continue;
          ctx.globalAlpha = alpha;
          ctx.drawImage(sprite(hue, "gold"), x - s / 2, y - s / 2, s, s);
        }
      if (final) {
        const english = show.glyphs.filter((g) => g.lang === "en"),
          ready = english.every((g) => g.born !== null),
          alpha = ready
            ? clamp((t - Math.max(...english.map((g) => g.born))) / 1.2, 0, 1) *
              exit
            : 0;
        drawRoseScene(show, true, exit * 0.9);
        drawLoveFinalWords(show, exit);
        const caption = loveFinalCaption();
        ctx.globalAlpha = alpha * 0.8;
        ctx.textAlign = "center";
        ctx.font = `${caption.font}px "Songti SC",serif`;
        ctx.fillStyle = "#f0d4d8";
        for (const line of caption.lines)
          ctx.fillText(line.text, line.x, line.y);
      }
    }
    if (t > 13)
      for (let i = 0; i < (reduced.matches ? 5 : 16); i++) {
        const a = i * 2.39996 + t * 0.15 * motion,
          r = Math.min(w * 0.4, 340),
          x = cx + Math.sin(a) * r,
          y = cy + Math.cos(a * 0.73) * Math.min(h * 0.24, 180),
          size = 13 + (i % 4) * 4,
          alpha = exit * 0.65 * loveEase((t - 13) / 1.2),
          hue = show.rainbow ? i * 47 : 43 + i * 9,
          rotation = Math.sin(a) * 0.3,
          flutter = 0.18 + 0.82 * Math.abs(Math.sin(t * 3.4 * motion + i));
        if (
          gpuLoveMote(
            ctx,
            x,
            y,
            size,
            hue,
            "butterfly",
            alpha,
            rotation,
            flutter,
          )
        )
          continue;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.scale(flutter, 1);
        ctx.drawImage(
          sprite(hue, "butterfly"),
          -size / 2,
          -size / 2,
          size,
          size,
        );
        ctx.restore();
      }
    finishLoveGpu();
    ctx.restore();
  }
  $("lovePauseBtn").addEventListener("click", () => {
    if (textCloud?.kind === "love") {
      togglePause();
      syncLoveUI(true);
    }
  });
  $("loveExitBtn").addEventListener("click", () => finishWishShow(true));
  let wish = "";
  function wishCharacters(text) {
    return typeof Intl.Segmenter === "function"
      ? Array.from(
          new Intl.Segmenter("zh", { granularity: "grapheme" }).segment(text),
          (s) => s.segment,
        )
      : Array.from(text);
  }
  function bakeWishGlyph(g, show) {
    const size = Math.ceil(g.font * 1.85 + 14),
      scale = Math.min(dpr, 1.7),
      make = () => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = Math.ceil(size * scale);
        const c = canvas.getContext("2d");
        c.scale(scale, scale);
        c.translate(size / 2, size / 2);
        c.fillStyle = `hsl(${g.hue},70%,94%)`;
        return { canvas, c, size };
      };
    g.plate = make();
    g.glints = make();
    const dot = sprite(g.hue, "gold");
    for (const p of g.points) {
      const s = p.size * 5.3,
        c = g.plate.c;
      c.globalAlpha = 0.83 + 0.1 * Math.sin(p.seed) ** 2;
      c.drawImage(dot, p.dx - s / 2, p.dy - s / 2, s, s);
      c.fillRect(p.dx - 0.6, p.dy - 0.6, 1.2, 1.2);
      if (Math.sin(p.seed * 3) > 0.2) {
        const glow = g.glints.c;
        glow.globalAlpha = 0.75;
        glow.drawImage(dot, p.dx - s * 0.65, p.dy - s * 0.65, s * 1.3, s * 1.3);
        glow.fillRect(p.dx - 0.55, p.dy - 0.55, 1.1, 1.1);
      }
    }
    g.face = make();
    g.side = make();
    for (const layer of [g.face, g.side]) {
      const c = layer.c;
      c.font = `600 ${g.font}px "Songti SC", "PingFang SC", serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.lineJoin = "round";
    }
    const face = g.face.c,
      ink = face.createLinearGradient(0, -g.font * 0.55, 0, g.font * 0.55);
    ink.addColorStop(0, "#fffef5");
    ink.addColorStop(0.42, `hsl(${g.hue},45%,94%)`);
    ink.addColorStop(0.72, `hsl(${g.hue},68%,78%)`);
    ink.addColorStop(1, `hsl(${g.hue},62%,91%)`);
    face.shadowColor = `hsla(${g.hue},85%,75%,.5)`;
    face.shadowBlur = 5;
    face.fillStyle = ink;
    face.fillText(g.char, 0, 0);
    face.shadowBlur = 0;
    face.strokeStyle = "#fff9";
    face.lineWidth = 0.4;
    face.strokeText(g.char, 0, 0);
    g.side.c.fillStyle = `hsl(${g.hue},45%,33%)`;
    g.side.c.fillText(g.char, 0, 0);
    g.side.c.strokeStyle = `hsla(${g.hue},65%,70%,.85)`;
    g.side.c.lineWidth = 0.6;
    g.side.c.strokeText(g.char, 0, 0);
    bakeWishMaterial(g, show, make);
  }
  function paintWishMote(c, m, x, y, size, rotation = m.rotation, flutter = 1) {
    const cos = Math.cos(rotation),
      sin = Math.sin(rotation);
    c.save();
    c.transform(cos * flutter, sin * flutter, -sin, cos, x, y);
    c.drawImage(
      sprite(m.hue, m.type, m.variant),
      -size / 2,
      -size / 2,
      size,
      size,
    );
    c.restore();
  }
  function bakeWishMaterial(g, show, make) {
    const spacing = Math.max(
        2,
        g.font *
          (show.effect === "gold"
            ? 0.04
            : show.effect === "frost"
              ? 0.09
              : show.effect === "mix"
                ? 0.105
                : 0.12),
      ),
      cells = new Set(),
      anchors = [];
    for (const p of g.points) {
      const key = Math.floor(p.dx / spacing) + "," + Math.floor(p.dy / spacing);
      if (!cells.has(key)) {
        cells.add(key);
        anchors.push(p);
      }
    }
    const cap = Math.round(
        (show.effect === "gold" ? 250 : 170) * Math.min(quality(), 1),
      ),
      points =
        anchors.length > cap
          ? Array.from(
              { length: cap },
              (_, i) => anchors[Math.floor((i * anchors.length) / cap)],
            )
          : anchors;
    const sizes = {
      gold: 0.075,
      star: 0.16,
      frost: 0.23,
      petal: 0.25,
      butterfly: 0.29,
    };
    g.motes = points.map((p, i) => {
      const type =
          show.effect === "mix"
            ? materialTypes[(i + g.rank * 2) % materialTypes.length]
            : show.effect,
        colorStep =
          show.effect === "mix"
            ? Math.floor(i / 5) * 137.5 + (i % 5) * 72
            : i * 137.5;
      return {
        dx: p.dx,
        dy: p.dy,
        type,
        hue: show.rainbow ? g.hue + colorStep : g.hue,
        seed: p.seed,
        rotation: Math.sin(p.seed * 3) * 1.1,
        variant: i % 3,
        size: Math.max(type === "gold" ? 3 : 6, g.font * sizes[type]),
      };
    });
    g.materialPlate = make();
    g.materialGlints = make();
    for (let i = 0; i < g.motes.length; i++) {
      const m = g.motes[i];
      g.materialPlate.c.globalAlpha = m.type === "gold" ? 1 : 0.98;
      paintWishMote(g.materialPlate.c, m, m.dx, m.dy, m.size);
      if (i % 5 === 0) {
        g.materialGlints.c.globalAlpha = 0.8;
        paintWishMote(g.materialGlints.c, m, m.dx, m.dy, m.size * 1.1);
      }
    }
    for (const layer of [g.materialPlate, g.materialGlints]) {
      layer.c.globalAlpha = 1;
      layer.c.globalCompositeOperation = "destination-in";
      layer.c.drawImage(
        g.side.canvas,
        -g.side.size / 2,
        -g.side.size / 2,
        g.side.size,
        g.side.size,
      );
      layer.c.globalCompositeOperation = "source-over";
    }
  }
  function refreshWishMaterials() {
    if (!textCloud) return;
    const show = textCloud;
    show.effect = state.effect;
    show.rainbow = state.palette === "rainbow";
    show.baseHue = hue();
    if (show.kind === "love") {
      layoutLove(show);
      return;
    }
    for (const g of show.glyphs) {
      g.hue = show.baseHue + (show.rainbow ? g.rank * 37 : rand(-6, 6));
      bakeWishGlyph(g, show);
    }
  }
  function bakeWishMask(show) {
    const b = show.bounds,
      pad = 38,
      margin = 12,
      width = b.right - b.left + margin * 2 + pad * 2,
      height = b.bottom - b.top + margin * 2 + pad * 2,
      canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * dpr);
    canvas.height = Math.ceil(height * dpr);
    const c = canvas.getContext("2d");
    c.scale(dpr, dpr);
    c.fillStyle = "#000";
    c.shadowColor = "#000";
    c.shadowBlur = 18 * dpr;
    c.fillRect(pad, pad, width - pad * 2, height - pad * 2);
    show.readingMask = {
      canvas,
      x: b.left - margin - pad,
      y: b.top - margin - pad,
      width,
      height,
    };
  }
  function maskWishEffects(show) {
    const mask = show.readingMask;
    for (const c of [fx, nearFx]) {
      c.save();
      c.globalAlpha = 1;
      c.globalCompositeOperation = "destination-out";
      c.drawImage(mask.canvas, mask.x, mask.y, mask.width, mask.height);
      c.restore();
    }
  }
  function layoutWish(show) {
    if (show.kind === "love") {
      layoutLove(show);
      return;
    }
    const columns = h < 500 ? 12 : w < 600 ? 4 : w < 1000 ? 6 : 12,
      lines = [[]];
    for (const char of wishCharacters(show.text)) {
      let line = lines[lines.length - 1];
      if (/\s/u.test(char) && (line.length === 0 || line.length === columns))
        continue;
      if (line.length >= columns) {
        line = [];
        lines.push(line);
      }
      line.push(char);
    }
    for (const line of lines)
      while (line.length && /\s/u.test(line[line.length - 1])) line.pop();
    const rows = lines.length,
      longest = Math.max(...lines.map((line) => line.length), 1),
      top = h < 500 ? 88 : w < 600 ? Math.max(158, h * 0.18) : 140,
      bottom = Math.max(top + 55, horizon - 65);
    const font = Math.max(
      20,
      Math.min(
        w < 600 ? 54 : 82,
        ((w * (w < 600 ? 0.65 : 0.7)) / (longest + 0.35)) * 0.86,
        (bottom - top) / (rows * 1.4),
      ),
    );
    const cell = font * 1.18,
      lineHeight = font * 1.46,
      block = font + (rows - 1) * lineHeight,
      cy = clamp(h * 0.3, top + block / 2, bottom - block / 2),
      cx = w < 600 ? w * 0.47 : w * 0.5;
    const previous = show.glyphs || [],
      glyphs = [];
    let rank = 0;
    lines.forEach((line, row) =>
      line.forEach((char, column) => {
        if (/\s/u.test(char)) return;
        const old = previous[rank],
          x = cx + (column - (line.length - 1) / 2) * cell,
          y = cy + (row - (rows - 1) / 2) * lineHeight;
        const g = {
          char,
          x,
          y,
          font,
          rank,
          born: old?.born ?? null,
          fired: old?.fired ?? false,
          flightAt: old?.flightAt ?? null,
          flightDuration: old?.flightDuration ?? 2.6,
          launchAt: old?.launchAt ?? 0.45 + rank * show.gap,
          hue:
            old?.hue ?? show.baseHue + (show.rainbow ? rank * 37 : rand(-6, 6)),
          points: [],
        };
        const off = document.createElement("canvas"),
          c = off.getContext("2d");
        off.width = Math.ceil(font * 1.6);
        off.height = Math.ceil(font * 1.8);
        c.font = `600 ${font}px "Songti SC", "PingFang SC", serif`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillStyle = "#fff";
        c.fillText(char, off.width / 2, off.height / 2);
        const data = c.getImageData(0, 0, off.width, off.height).data,
          step = quality() < 0.8 ? 3 : 2;
        for (let py = 0; py < off.height; py += step)
          for (let px = 0; px < off.width; px += step)
            if (data[(py * off.width + px) * 4 + 3] > 120)
              g.points.push({
                dx: px - off.width / 2,
                dy: py - off.height / 2,
                seed: rand(0, TAU),
                size: rand(0.85, 1.3),
              });
        const cap = Math.max(180, Math.round(650 * quality()));
        if (g.points.length > cap) {
          const points = g.points;
          g.points = Array.from(
            { length: cap },
            (_, i) => points[Math.floor((i * points.length) / cap)],
          );
        }
        bakeWishGlyph(g, show);
        glyphs.push(g);
        rank++;
      }),
    );
    show.glyphs = glyphs;
    show.bounds = {
      left: Math.min(...glyphs.map((g) => g.x - g.font * 0.58)),
      right: Math.max(...glyphs.map((g) => g.x + g.font * 0.58)),
      top: Math.min(...glyphs.map((g) => g.y - g.font * 0.58)),
      bottom: Math.max(...glyphs.map((g) => g.y + g.font * 0.58)),
    };
    bakeWishMask(show);
  }
  function createText() {
    const count = wishCharacters(wish).filter((c) => !/\s/u.test(c)).length;
    if (!count) return;
    if (isLoveWish(wish)) {
      startLoveShow();
      return;
    }
    const spatial = state.view === "3d";
    textCloud = {
      id: ++wishSerial,
      text: wish,
      age: 0,
      gap: spatial
        ? count <= 4
          ? 1
          : count <= 8
            ? 0.82
            : 0.68
        : count <= 4
          ? 0.7
          : count <= 8
            ? 0.56
            : 0.48,
      baseHue: hue(),
      rainbow: state.palette === "rainbow",
      effect: state.effect,
      glyphs: [],
      nextAccent: 0.15,
      accent: 0,
      readUntil: null,
      finaleAt: null,
      finale: false,
    };
    audioController.accentUntil = 0;
    syncPerformanceScore();
    layoutWish(textCloud);
    $("wishSubmit").disabled = true;
    $("wishSubmit").textContent = spatial
      ? "焰弹正从远方飞来…"
      : "礼花正在升空…";
    $("wishStop").hidden = false;
    document.body.classList.toggle("writing-wish", true);
    updateCaption();
  }
  function revealWishGlyph(id, index) {
    const show = textCloud,
      g = show?.id === id ? show.glyphs[index] : null;
    if (!g || g.born !== null) return;
    if (show.kind === "love") {
      g.born = show.age;
      show.heartReadMask = null;
      burst(
        g.x,
        g.y,
        g.hue,
        show.effect,
        g.finaleOnly ? 0.46 : 0.16,
        "sphere",
        {
          density: g.finaleOnly ? 0.5 : 0.3,
          quiet: true,
          flat: true,
          noEcho: true,
          companion: true,
        },
      );
      if (g.finaleOnly) {
        if (
          show.glyphs.filter((g) => g.finaleOnly).every((g) => g.born !== null)
        ) {
          show.finaleRainAt = show.age + 0.4;
          show.finaleFormedAt = show.age + 1.2;
        }
        flashes.push({
          x: g.x,
          y: g.y,
          life: 0.2,
          max: 0.2,
          hue: g.hue,
          power: 0.28,
        });
        boom(g.x / w, 0.65);
        syncLoveUI(true);
      } else if (index % 4 === 0) boom(g.x / w, 0.55);
      return;
    }
    g.born = show.age;
    burst(g.x, g.y, g.hue, "gold", 0.22, "sphere", {
      density: 0.24,
      quiet: true,
      flat: true,
    });
    flashes.push({
      x: g.x,
      y: g.y,
      life: 0.15,
      max: 0.15,
      hue: g.hue,
      power: 0.28,
    });
    boom(g.x / w, 0.75);
    const revealed = show.glyphs.filter((g) => g.born !== null).length;
    $("wishSubmit").textContent =
      `逐字绽放 · ${revealed} / ${show.glyphs.length}`;
    updateCaption();
    if (revealed === show.glyphs.length) {
      show.finaleAt = show.age + 0.85;
      show.readUntil = show.age + (state.view === "3d" ? 6 : 4.4);
    }
  }
  function letterVisibility(x, y) {
    if (textCloud?.kind === "love") return loveTextVisibility(textCloud, x, y);
    if (!textCloud) return 1;
    const b = textCloud.bounds,
      dx = Math.max(b.left - 12 - x, 0, x - b.right - 12),
      dy = Math.max(b.top - 12 - y, 0, y - b.bottom - 12);
    return clamp(Math.hypot(dx, dy) / 38, 0.06, 1);
  }
  function wishAccent(show, crown = false) {
    const b = show.bounds,
      side = show.accent++ % 2,
      below = horizon - 35 - b.bottom;
    let x,
      y,
      power,
      type,
      shape = "sphere";
    if (crown) {
      x = w * 0.5;
      y = Math.max(78, b.top - 65);
      power = w < 600 ? 0.3 : 0.5;
      type = "star";
      shape = "ring";
    } else if (w >= 760) {
      x = side ? w * 0.9 : w * 0.1;
      y = clamp((b.top + b.bottom) * 0.5, h * 0.2, horizon - 60);
      power = 0.6;
      type =
        show.effect === "mix"
          ? ["mix", "star", "butterfly", "mix"][show.accent % 4]
          : show.accent % 3 === 0
            ? "star"
            : show.effect;
    } else {
      x = side ? w * 0.82 : w * 0.15;
      y = clamp(
        b.bottom + Math.max(38, below * 0.56),
        b.bottom + 24,
        horizon - 30,
      );
      power = below < 65 ? 0.27 : 0.43;
      type =
        show.effect === "mix"
          ? ["mix", "star", "butterfly", "mix"][show.accent % 4]
          : show.accent % 3 === 0
            ? "star"
            : show.effect;
    }
    if (!crown && show.accent % 3 === 0) shape = "ring";
    if (state.view === "3d") {
      shape = crown || show.accent % 2 ? "saturn" : "tunnel";
      type = show.effect;
      if (crown) {
        x = (b.left + b.right) / 2;
        y = (b.top + b.bottom) / 2;
        power = clamp(
          (b.right - b.left + 65) / (2 * Math.min(w * 0.4, 245)),
          0.6,
          1.65,
        );
      } else if (shape === "tunnel") power *= 0.9;
    }
    launch(x, y, {
      type,
      shape,
      power,
      hue: show.baseHue + (show.rainbow ? show.accent * 67 : rand(-8, 8)),
      duration: state.view === "3d" ? 1.15 : 0.82,
      companion: true,
      wishId: show.id,
      sx: side ? w * 0.94 : w * 0.06,
    });
  }
  function advanceWishShow(dt) {
    const show = textCloud;
    if (!show) return;
    show.age += dt;
    if (show.kind === "love") {
      advanceLoveShow(show, dt);
      return;
    }
    for (const g of show.glyphs)
      if (!g.fired && show.age >= g.launchAt) {
        g.fired = true;
        g.flightAt = show.age;
        g.flightDuration =
          (state.view === "3d" ? 2.6 : 0.88) + Math.abs(g.x / w - 0.5) * 0.14;
        launch(g.x, g.y, {
          wishGlyph: g.rank,
          wishId: show.id,
          hue: g.hue,
          duration: g.flightDuration,
          sx: clamp(
            g.x + (g.rank % 2 ? -1 : 1) * w * 0.045,
            w * 0.06,
            w * 0.94,
          ),
        });
      }
    for (const g of show.glyphs)
      if (
        g.born !== null &&
        show.age - g.born > 0.6 &&
        (show.readUntil === null || show.age < show.readUntil) &&
        g.points.length &&
        Math.random() < dt * 7
      ) {
        const p = g.points[Math.floor(Math.random() * g.points.length)],
          life = rand(0.35, 0.85);
        addParticle({
          x: g.x + p.dx,
          y: g.y + p.dy,
          px: g.x + p.dx,
          py: g.y + p.dy,
          vx: rand(-7, 7),
          vy: rand(8, 22),
          life,
          max: life,
          hue: g.hue,
          size: 0.45,
          type: "gold",
          seed: p.seed,
          gravity: 20,
          trail: true,
        });
      }
    if (
      show.age >= show.nextAccent &&
      (show.readUntil === null || show.age < show.readUntil + 0.4)
    ) {
      wishAccent(show);
      show.nextAccent = show.age + (w < 600 ? 1.2 : 1.05);
    }
    if (show.finaleAt !== null && !show.finale && show.age >= show.finaleAt) {
      show.finale = true;
      wishAccent(show, true);
      wishAccent(show);
      wishAccent(show);
      $("wishSubmit").textContent = "整句已绽放 · 正在为你谢幕";
    }
    if (show.readUntil !== null && show.age > show.readUntil + 2.8)
      finishWishShow();
  }
  function finishWishShow(cancel = false) {
    if (phoenix) {
      stopPhoenixShow();
      return;
    }
    const love = textCloud?.kind === "love",
      previousImmersed = textCloud?.previousImmersed;
    const id = textCloud?.id;
    if (id !== undefined) {
      for (const r of rockets) if (r.wishId === id) stopRocketSound(r);
      rockets = rockets.filter((r) => r.wishId !== id);
    }
    if (cancel)
      particles.forEach((p) => {
        if (p.companion) p.life = Math.min(p.life, 0.5);
      });
    textCloud = null;
    wish = "";
    $("wishSubmit").disabled = !validWish();
    $("wishSubmit").textContent = "让祝福绽放";
    $("wishStop").hidden = true;
    document.body.classList.toggle("writing-wish", false);
    nextAuto = clock + 0.7;
    updateCaption();
    if (love) {
      document.body.classList.toggle("love-mode", false);
      $("loveHud").hidden = true;
      ordinaryComets = ordinaryComets.filter((r) => r.wishId !== id);
      particles.forEach((p) => {
        if (p.companion) p.life = Math.min(p.life, 0.35);
      });
      if (state.paused) togglePause();
      canvas.setAttribute(
        "aria-label",
        "互动烟花夜空。轻点发射、长按蓄力、拖动绘星河。",
      );
      if (previousImmersed) setImmersed(true);
      else $("writeBtn").focus();
      resize();
      depthDirty = true;
    }
    syncPerformanceScore();
  }
  function wishGlyphPose(show, g) {
    const focal = depthFocal(),
      arrived = g.born !== null,
      progress = clamp(
        arrived
          ? (show.age - g.born) / 0.75
          : (show.age - (g.flightAt ?? show.age)) / g.flightDuration,
        0,
        1,
      ),
      side = g.rank % 2 ? -1 : 1;
    const approach = 0.22 + 0.78 * progress * progress * (3 - 2 * progress),
      depth = arrived
        ? -focal * 0.1 * Math.sin(progress * Math.PI) * (1 - progress)
        : focal * (1 / approach - 1),
      cx = (show.bounds.left + show.bounds.right) / 2,
      cy = (show.bounds.top + show.bounds.bottom) / 2;
    return {
      cx,
      cy,
      wx: g.x - cx,
      wy: g.y - cy - (arrived ? 0 : g.font * 0.55 * (1 - progress)),
      depth,
      focal,
      scale: focal / (focal + depth),
      yaw:
        0.07 +
        depthView.x * 0.3 +
        (arrived
          ? side * 0.18 * Math.sin(progress * Math.PI) * (1 - progress)
          : side * 0.64 * Math.pow(1 - progress, 1.6)),
      pitch:
        -0.12 +
        depthView.y * 0.2 +
        (arrived
          ? 0.07 * Math.sin(progress * Math.PI) * (1 - progress)
          : 0.25 * (1 - progress)),
      alpha: arrived ? 1 : clamp(0.18 + progress * 1.2, 0, 1),
      progress,
      arrived,
    };
  }
  function projectWishPoint(pose, dx, dy, dz = 0) {
    const x = dx * Math.cos(pose.yaw) + dz * Math.sin(pose.yaw),
      z = dz * Math.cos(pose.yaw) - dx * Math.sin(pose.yaw),
      y = dy * Math.cos(pose.pitch) - z * Math.sin(pose.pitch),
      rz = dy * Math.sin(pose.pitch) + z * Math.cos(pose.pitch),
      scale = pose.focal / (pose.focal + pose.depth + rz);
    return {
      x: pose.cx + (pose.wx + x) * scale,
      y: pose.cy + (pose.wy + y) * scale,
      scale,
    };
  }
  function drawWishMotes(show, g, pose, alpha, drift = 0, settled = false) {
    const formation = pose.arrived ? 1 - Math.pow(1 - pose.progress, 3) : 1,
      spread =
        drift > 0
          ? drift * 18
          : pose.arrived
            ? g.font * 0.2 * Math.sin(pose.progress * Math.PI)
            : g.font * 0.85 * Math.pow(1 - pose.progress, 1.5),
      stride = settled ? 7 : 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha;
    for (let i = 0; i < g.motes.length; i += stride) {
      const m = g.motes[i],
        angle = m.seed + show.age * 0.7,
        dx =
          m.dx * formation + Math.cos(angle) * spread + state.wind * drift * 5,
        dy = m.dy * formation + Math.sin(angle) * spread * 0.7 - drift * 9,
        dz = Math.sin(m.seed * 3) * spread * 0.8,
        point = projectWishPoint(pose, dx, dy, dz),
        rotation =
          m.rotation + Math.sin(angle) * Math.min(spread / g.font, 1) * 0.9;
      const flutter =
          m.type === "butterfly"
            ? 0.28 + 0.72 * Math.abs(Math.sin(show.age * 3.8 + m.seed))
            : m.type === "petal"
              ? 0.65 + 0.35 * Math.abs(Math.sin(show.age * 1.4 + m.seed))
              : 1,
        size =
          m.size *
          point.scale *
          (settled ? 1 : 1 + Math.min(spread / g.font, 1) * 0.35);
      paintWishMote(ctx, m, point.x, point.y, size, rotation, flutter);
    }
  }
  function drawDepthWishText(show, drift, fade) {
    const glyphs = show.glyphs
      .filter((g) => g.born !== null)
      .map((g) => ({ g, pose: wishGlyphPose(show, g) }))
      .sort((a, b) => b.pose.depth - a.pose.depth);
    for (const { g, pose } of glyphs) {
      const opacity =
        fade * pose.alpha * (drift > 0 ? clamp(1 - drift / 0.7, 0, 1) : 1);
      const layer = (texture, depth, alpha) => {
        const origin = projectWishPoint(pose, 0, 0, depth),
          x = projectWishPoint(pose, 1, 0, depth),
          y = projectWishPoint(pose, 0, 1, depth),
          size = texture.size;
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = alpha;
        ctx.transform(
          x.x - origin.x,
          x.y - origin.y,
          y.x - origin.x,
          y.y - origin.y,
          origin.x,
          origin.y,
        );
        ctx.drawImage(texture.canvas, -size / 2, -size / 2, size, size);
        ctx.restore();
      };
      if (opacity > 0) {
        const focus = clamp((pose.progress - 0.38) / 0.62, 0, 1),
          blend = focus * focus * (3 - 2 * focus);
        for (const depth of [16, 12, 8, 4])
          layer(g.side, depth, opacity * 0.6 * blend);
        layer(
          g.face,
          0,
          opacity * blend * (show.effect === "frost" ? 0.3 : 0.2),
        );
        layer(g.materialPlate, -0.2, opacity * blend);
        layer(
          g.materialGlints,
          -0.5,
          opacity *
            blend *
            (0.12 + 0.22 * Math.sin(show.age * 3 + g.rank) ** 2),
        );
        if (blend < 1) drawWishMotes(show, g, pose, opacity * (1 - blend));
        if (pose.progress >= 1 && drift === 0)
          drawWishMotes(show, g, pose, opacity * 0.65, 0, true);
      }
      if (drift > 0 && g.born !== null) {
        const dustPose = {
          ...pose,
          depth: pose.depth + drift * pose.focal * 0.45,
        };
        drawWishMotes(
          show,
          g,
          dustPose,
          fade * clamp(drift / 0.4, 0, 1),
          drift,
        );
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawText(dt) {
    if (!textCloud) return;
    const show = textCloud,
      drift =
        show.readUntil === null ? 0 : Math.max(0, show.age - show.readUntil),
      fade = clamp(1 - drift / 2.8, 0, 1);
    if (show.kind === "love") {
      drawLoveShow(show);
      return;
    }
    if (state.view === "3d") {
      drawDepthWishText(show, drift, fade);
      return;
    }
    for (const g of show.glyphs) {
      if (g.born === null) continue;
      const age = show.age - g.born,
        progress = clamp(age / 0.75, 0, 1),
        reach = 1 - Math.pow(1 - progress, 3),
        turn = (1 - progress) * 0.42,
        dot = sprite(g.hue, "gold");
      if (progress >= 1) {
        const size = g.plate.size,
          x = g.x - size / 2 + Math.sin(show.age * 3 + g.rank) * 0.18,
          y = g.y - size / 2;
        ctx.globalAlpha = fade * (drift > 0 ? clamp(1 - drift / 0.4, 0, 1) : 1);
        ctx.drawImage(g.plate.canvas, x, y, size, size);
        ctx.globalAlpha *= 0.2 + 0.3 * Math.sin(show.age * 3.4 + g.rank) ** 2;
        ctx.drawImage(g.glints.canvas, x, y, size, size);
        if (drift === 0) continue;
      }
      ctx.fillStyle = `hsl(${g.hue},70%,94%)`;
      const stride =
        drift > 0 ? Math.max(1, Math.ceil(g.points.length / 210)) : 1;
      for (let i = 0; i < g.points.length; i += stride) {
        const p = g.points[i];
        const dx = p.dx * Math.cos(turn) - p.dy * Math.sin(turn),
          dy = p.dx * Math.sin(turn) + p.dy * Math.cos(turn),
          swirl = Math.sin(progress * Math.PI) * (1 - progress) * 5;
        const x =
            g.x +
            dx * reach +
            Math.cos(p.seed) * swirl +
            Math.sin(p.seed) * drift * 15 +
            state.wind * drift * 5 +
            Math.sin(show.age * 5 + p.seed) * 0.3,
          y =
            g.y +
            dy * reach +
            Math.sin(p.seed) * swirl -
            drift * 9 +
            drift * drift * 5 +
            Math.cos(show.age * 4 + p.seed) * 0.25;
        ctx.globalAlpha =
          fade *
          clamp(age / 0.08, 0, 1) *
          (drift > 0 ? clamp(drift / 0.4, 0, 1) : 1) *
          (0.78 + 0.22 * Math.sin(p.seed + show.age * 3) ** 2);
        const size = p.size * 5.3;
        ctx.drawImage(dot, x - size / 2, y - size / 2, size, size);
        ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
      }
    }
    ctx.globalAlpha = 1;
  }
  function validWish() {
    const len = wishCharacters($("wishInput").value.trim()).length;
    return len > 0 && len <= 12;
  }
  function updateWish() {
    const len = wishCharacters($("wishInput").value.trim()).length;
    $("wishCount").textContent = len + " / 12";
    $("wishCount").style.color = len > 12 ? "#f2ada5" : "";
    $("wishSubmit").disabled = !validWish() || !!wish;
  }
  $("wishInput").addEventListener("input", updateWish);
  $("wishForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validWish() || wish || story) return;
    if (state.paused) {
      notify("请先继续演出，再让祝福绽放");
      return;
    }
    initAudio();
    wish = $("wishInput").value.trim();
    closePanels();
    rockets = [];
    ordinaryComets = [];
    pending = [];
    meteors = [];
    skyPaths = [];
    pointer = null;
    specialCaption = null;
    specialUntil = 0;
    particles.forEach((p) => (p.life = Math.min(p.life, 0.5)));
    createText();
  });
  $("wishStop").addEventListener("click", () => finishWishShow(true));
  // Only an explicit sound gesture opens the audio gate. Audio preferences never restore it.
  const audioController = createAudioController({
    getElement: $,
    clamp,
    TAU,
    seeded,
    notify,
    scoreScenes,
    scoreTracks,
    savePreferences,
    syncPhoenixAudio,
    syncStoryUI,
    state,
    soundPreferences,
    getClock: () => clock,
    getPhoenix: () => phoenix,
    getStory: () => story,
    getTextCloud: () => textCloud,
    getSpecialCaption: () => specialCaption,
    getSpecialUntil: () => specialUntil,
    phoenixCallPcmBase64: initialAssets.phoenixCall,
    fireworkSamplesV25: initialAssets.samples,
  });
  const {
    makeFireworkBuffer,
    makeDetailBuffer,
    playTheatreEffect,
    storyActorSound,
    duckMusic,
    scoreEnvelope,
    programmeMusicShape,
    programmeScoreTime,
    scoreCue,
    alignProgrammeScore,
    preparePhoenixCall,
    initAudio,
    updateAudioGains,
    stopSoundVoices,
    stopRocketSound,
    playFireworkVoice,
    boom,
    whoosh,
    musicAllowed,
    performanceScoreScene,
    getMusicDecks,
    seekScoreCue,
    fadeScoreDeck,
    pauseScoreDeck,
    pauseAllMusic,
    activateScoreDeck,
    failScoreDeck,
    requestSceneScore,
    syncPerformanceScore,
    syncSoundUI,
    syncAudioPlayback,
    updateMusicMix,
    setSound,
    toggleSound,
  } = audioController;
  audioController.bindAudioUI();
  function togglePause() {
    state.paused = !state.paused;
    clearHandTracking();
    if (cameraState === "on")
      setHandStatus(
        state.paused
          ? "手势已暂停 · 继续演出后生效"
          : "张开手掌试试 · 让手离镜头 40–80 cm",
      );
    $("pauseBtn").setAttribute("aria-pressed", String(state.paused));
    $("pauseLabel").textContent = state.paused ? "继续" : "暂停";
    $("pauseIcon").setAttribute(
      "d",
      state.paused ? "m7 4 8 6-8 6z" : "M7 5v10m6-10v10",
    );
    syncAudioPlayback();
    updateCaption();
    if (story) syncStoryUI(true);
    if (phoenix) syncPhoenixUI(true);
  }
  function setImmersed(on) {
    state.immersed = on;
    document.body.classList.toggle("immersed", on);
    $("chrome").inert = on;
    $("restoreBtn").hidden = !on;
    closePanels();
    if (on) $("stage").focus();
    else $("immersiveBtn").focus();
  }
  const panels = [
    ["appearancePanel", "appearanceBtn"],
    ["writePanel", "writeBtn"],
    ["settingsPanel", "settingsBtn"],
    ["gesturePanel", "gestureGuideBtn"],
  ];
  let panelTrigger = null;
  function hasOpenPanel() {
    return panels.some(
      ([id]) => (id !== "appearancePanel" || compactControls) && !$(id).hidden,
    );
  }
  function closePanels(restoreFocus = false) {
    for (const [id, btn] of panels) {
      $(id).hidden = id === "appearancePanel" ? Boolean(compactControls) : true;
      $(btn).setAttribute("aria-expanded", "false");
    }
    document.body.classList.toggle("mobile-panel-open", false);
    syncWishKeyboard();
    $("slowExit").hidden = !state.slow;
    if (restoreFocus && panelTrigger) $(panelTrigger).focus();
  }
  function syncCompactControls() {
    const compact =
      innerWidth <= 760 || (innerHeight <= 560 && innerWidth <= 1024);
    if (compact === compactControls) return;
    compactControls = compact;
    closePanels();
  }
  function togglePanel(id, button) {
    const open = $(id).hidden;
    closePanels();
    if (open) {
      $(id).hidden = false;
      $("slowExit").hidden = true;
      document.body.classList.toggle(
        "mobile-panel-open",
        Boolean(compactControls),
      );
      $(button).setAttribute("aria-expanded", "true");
      panelTrigger = button;
      (id === "writePanel"
        ? $("wishInput")
        : $(id).querySelector("button")
      ).focus();
      syncWishKeyboard();
    }
  }
  function syncWishKeyboard() {
    const viewport = window.visualViewport,
      bottom = viewport
        ? Math.max(0, innerHeight - viewport.height - viewport.offsetTop)
        : 0,
      raised =
        !$("writePanel").hidden &&
        ((bottom > 90 && (viewport?.scale ?? 1) < 1.2) || innerHeight < 330);
    document.body.classList.toggle("wish-keyboard", raised);
    if (raised) {
      document.documentElement.style.setProperty(
        "--keyboard-bottom",
        bottom + "px",
      );
      document.documentElement.style.setProperty(
        "--keyboard-height",
        (viewport?.height ?? innerHeight) + "px",
      );
    }
  }
  $("wishInput").addEventListener("focus", syncWishKeyboard);
  $("wishInput").addEventListener("blur", syncWishKeyboard);
  window.visualViewport?.addEventListener("resize", syncWishKeyboard);
  window.visualViewport?.addEventListener("scroll", syncWishKeyboard);
  $("appearanceBtn").addEventListener("click", () =>
    togglePanel("appearancePanel", "appearanceBtn"),
  );
  $("writeBtn").addEventListener("click", () =>
    togglePanel("writePanel", "writeBtn"),
  );
  $("settingsBtn").addEventListener("click", () =>
    togglePanel("settingsPanel", "settingsBtn"),
  );
  for (const id of ["gestureGuideBtn", "cameraGuideBtn", "settingsGestureBtn"])
    $(id).addEventListener("click", () => {
      const open = $("gesturePanel").hidden;
      togglePanel("gesturePanel", "gestureGuideBtn");
      if (open) {
        panelTrigger =
          id === "settingsGestureBtn"
            ? "settingsBtn"
            : id === "cameraGuideBtn"
              ? "cameraBtn"
              : id;
        (
          gestureChoices.find(
            (button) => button.getAttribute("aria-pressed") === "true",
          ) || $("gestureOpenChoice")
        ).focus();
      }
    });
  const gestureChoices = [...document.querySelectorAll("[data-gesture-guide]")],
    gestureDemos = [...document.querySelectorAll("[data-gesture-demo]")];
  gestureChoices.forEach((button) =>
    button.addEventListener("click", () => {
      const pose = button.dataset.gestureGuide;
      gestureChoices.forEach((choice) =>
        choice.setAttribute("aria-pressed", String(choice === button)),
      );
      gestureDemos.forEach((demo) => {
        demo.hidden = demo.dataset.gestureDemo !== pose;
      });
      const tabs = button.parentElement;
      if (tabs.scrollWidth > tabs.clientWidth)
        tabs.scrollTo({
          left:
            tabs.scrollLeft +
            button.getBoundingClientRect().left -
            tabs.getBoundingClientRect().left -
            (tabs.clientWidth - button.offsetWidth) / 2,
          behavior: "instant",
        });
    }),
  );
  $("gesturePreviewBtn").addEventListener("click", () => {
    if (story || phoenix || textCloud) {
      notify("请先结束当前演出，再试放手势烟花");
      return;
    }
    const gesture =
      gestureChoices.find(
        (button) => button.getAttribute("aria-pressed") === "true",
      )?.dataset.gestureGuide || "open";
    closePanels(true);
    if (state.paused) togglePause();
    initAudio();
    if (gesture === "both") finale();
    else handBloom(gesture, w * 0.5, horizon * (w < 480 ? 0.58 : 0.5));
    $("skyHint").hidden = true;
  });
  $("gestureMotionBtn").addEventListener("click", () => {
    const button = $("gestureMotionBtn"),
      paused = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(paused));
    button.textContent = paused ? "播放示范" : "暂停示范";
    $("gesturePanel").classList.toggle("gesture-demo-paused", paused);
  });
  document
    .querySelectorAll("[data-close]")
    .forEach((b) => b.addEventListener("click", () => closePanels(true)));
  $("pauseBtn").addEventListener("click", togglePause);
  $("finaleBtn").addEventListener("click", () => {
    initAudio();
    finale();
  });
  $("immersiveBtn").addEventListener("click", () => setImmersed(true));
  $("restoreBtn").addEventListener("click", () => setImmersed(false));
  let landscapeLocked = false,
    landscapeFullscreen = false,
    landscapeBusy = false,
    landscapeRequest = 0;
  function syncLandscapeUI() {
    const button = $("landscapeBtn"),
      active =
        landscapeLocked ||
        (landscapeFullscreen && Boolean(document.fullscreenElement));
    button.textContent = active ? "退出横屏" : "横屏观看";
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-busy", String(landscapeBusy));
    button.disabled = landscapeBusy;
    document.body.classList.toggle(
      "theater-fullscreen",
      Boolean(document.fullscreenElement),
    );
    $("fullscreenBtn").setAttribute(
      "aria-label",
      document.fullscreenElement ? "退出全屏" : "全屏观看",
    );
  }
  function releaseLandscape() {
    if (landscapeLocked) {
      try {
        window.screen?.orientation?.unlock();
      } catch {}
    }
    landscapeLocked = false;
    syncLandscapeUI();
  }
  async function toggleLandscape() {
    if (landscapeBusy) return;
    landscapeBusy = true;
    syncLandscapeUI();
    const request = ++landscapeRequest;
    try {
      if (
        landscapeLocked ||
        (landscapeFullscreen && document.fullscreenElement)
      ) {
        releaseLandscape();
        if (landscapeFullscreen && document.fullscreenElement)
          await document.exitFullscreen();
        landscapeFullscreen = false;
        closePanels();
        return;
      }
      if (
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
      ) {
        try {
          await document.documentElement.requestFullscreen({
            navigationUI: "hide",
          });
          landscapeFullscreen = Boolean(document.fullscreenElement);
        } catch {}
      }
      if (request !== landscapeRequest) return;
      const orientation = window.screen?.orientation;
      if (orientation?.lock) {
        try {
          await orientation.lock("landscape");
          if (request !== landscapeRequest) {
            orientation.unlock();
            return;
          }
          landscapeLocked = true;
        } catch {}
      }
      closePanels();
      if (!landscapeLocked)
        notify(
          innerWidth > innerHeight
            ? "已适配横屏，旋转手机可随时切回"
            : "请将手机横放；若画面未旋转，请关闭系统竖屏锁定",
        );
    } finally {
      landscapeBusy = false;
      syncLandscapeUI();
    }
  }
  $("landscapeBtn").addEventListener("click", toggleLandscape);
  $("fullscreenBtn").addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen({
          navigationUI: "hide",
        });
      else notify("当前浏览器不支持全屏，可使用沉浸模式");
    } catch {
      notify("无法进入全屏，可使用沉浸模式");
    }
  });
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && landscapeFullscreen) {
      ++landscapeRequest;
      landscapeFullscreen = false;
      releaseLandscape();
    }
    syncLandscapeUI();
  });
  window.screen?.orientation?.addEventListener("change", () =>
    requestAnimationFrame(() => {
      if (w !== innerWidth || h !== innerHeight) resize();
      syncLandscapeUI();
    }),
  );
  document.querySelectorAll("[data-effect]").forEach((button) =>
    button.addEventListener("click", () => {
      state.effect = button.dataset.effect;
      syncAppearance();
      refreshCometMaterials();
      refreshWishMaterials();
      savePreferences();
      updateCaption();
      if (state.auto) launch(w * 0.5, h * 0.29, { automatic: true });
    }),
  );
  document.querySelectorAll("[data-palette]").forEach((button) =>
    button.addEventListener("click", () => {
      state.palette = button.dataset.palette;
      syncAppearance();
      refreshCometMaterials();
      refreshWishMaterials();
      savePreferences();
      drawBackdrop();
      updateCaption();
      if (state.auto) launch(w * 0.5, h * 0.29, { automatic: true });
    }),
  );
  $("autoBtn").addEventListener("click", () => setAutoPlay(!state.auto));
  $("autoInput").addEventListener("change", (e) =>
    setAutoPlay(e.target.checked),
  );
  $("trajectoryInput").addEventListener("change", (e) => {
    state.curved = e.target.checked;
    syncTrajectoryCopy();
    savePreferences();
  });
  $("aliceStoryBtn").addEventListener("click", () =>
    startAliceStory(state.view === "3d" ? "immersive" : "classic"),
  );
  $("phoenixShowBtn").addEventListener("click", startPhoenixShow);
  $("dragonShowBtn").addEventListener("click", () =>
    startPhoenixShow("dragon"),
  );
  $("storyExitBtn").addEventListener("click", stopAliceStory);
  $("storyReplayBtn").addEventListener("click", () =>
    startAliceStory(story?.variant ?? "classic"),
  );
  $("storyPauseBtn").addEventListener("click", () => {
    if (story && !story.finished) togglePause();
  });
  $("storyNextBtn").addEventListener("click", () => {
    if (story) seekStoryAct(story.act + 1);
  });
  $("storySoundBtn").addEventListener("click", toggleSound);
  document
    .querySelectorAll("[data-story-act]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        seekStoryAct(Number(button.dataset.storyAct)),
      ),
    );
  $("densityInput").addEventListener("input", (e) => {
    state.density = Number(e.target.value);
    $("densityValue").textContent = ["疏朗", "适中", "盛大"][state.density - 1];
  });
  $("qualityInput").addEventListener("change", (e) => {
    state.quality = e.target.value;
    resize();
  });
  function syncCameraDisplay() {
    const preview = $("previewInput").checked,
      skeleton = $("skeletonInput").checked;
    $("cameraCard").hidden = cameraState === "off";
    $("cameraFeed").classList.toggle("preview-hidden", !preview);
    $("cameraFeed").setAttribute("aria-hidden", String(!preview));
    $("cameraDisplayHint").textContent =
      !preview && !skeleton
        ? "画面与骨节已隐藏，点「显示设置」可开启。"
        : `画面${preview ? "已显示" : "已隐藏"} · 骨节${skeleton ? "已显示" : "已隐藏"}，可在显示设置中切换。`;
  }
  for (const id of ["previewInput", "skeletonInput"]) {
    $(id).checked = false;
    $(id).addEventListener("change", syncCameraDisplay);
  }
  $("cameraDisplayBtn").addEventListener("click", () => {
    if ($("settingsPanel").hidden) togglePanel("settingsPanel", "settingsBtn");
    panelTrigger = "cameraBtn";
    $("previewInput").focus();
  });
  syncCameraDisplay();
  canvas.addEventListener("pointerdown", (e) => {
    if (phoenix || textCloud?.kind === "love") return;
    if (
      story?.variant === "immersive" &&
      e.button === 0 &&
      Number.isFinite(e.clientX)
    ) {
      awakenImmersiveMagic(e.clientX, e.clientY);
      return;
    }
    if (story || !Number.isFinite(e.clientX) || e.button !== 0 || pointer)
      return;
    const hadPanel = hasOpenPanel();
    closePanels();
    if (hadPanel) return;
    if (state.paused) {
      notify("演出已暂停，按空格或点击“继续”");
      return;
    }
    initAudio();
    const x = e.clientX,
      y = clamp(e.clientY, 65, horizon - 35);
    pointer = {
      id: e.pointerId,
      start: performance.now(),
      x,
      y,
      points: [{ x, y }],
    };
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!pointer || pointer.id !== e.pointerId || state.paused) return;
    const p = { x: e.clientX, y: clamp(e.clientY, 65, horizon - 35) },
      last = pointer.points[pointer.points.length - 1];
    if (
      Math.hypot(last.x - p.x, last.y - p.y) > 9 &&
      pointer.points.length < 90
    )
      pointer.points.push(p);
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!pointer || pointer.id !== e.pointerId) return;
    const gesture = pointer;
    pointer = null;
    if (state.paused) return;
    $("skyHint").hidden = true;
    if (gesture.points.length > 3) {
      skyPaths.push({ points: gesture.points, age: 0 });
      if (skyPaths.length > 4) skyPaths.shift();
      specialUntil = clock + 4;
      const count = Math.min(7, Math.ceil(gesture.points.length / 3)),
        type = state.effect,
        color = hue();
      for (let i = 0; i < count; i++) {
        const p =
          gesture.points[
            Math.round((i * (gesture.points.length - 1)) / (count - 1))
          ];
        schedule(i * 0.23, () =>
          launch(p.x, p.y, { type, hue: color + i * 3, power: 0.58 }),
        );
      }
    } else {
      const charge = clamp(
        ((performance.now() - gesture.start) / 1000 - 0.2) / 1.5,
        0,
        1,
      );
      launch(gesture.x, gesture.y, {
        power: 1 + charge * (w < 600 ? 0.55 : 0.9),
      });
      if (charge > 0.85) {
        const color = hue();
        schedule(1.5, () =>
          launch(gesture.x, gesture.y, {
            type: "star",
            hue: color,
            power: 0.7,
          }),
        );
      }
    }
  });
  canvas.addEventListener("pointercancel", () => {
    pointer = null;
  });
  canvas.addEventListener("lostpointercapture", () => {
    pointer = null;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (phoenix) stopPhoenixShow();
      else if (textCloud?.kind === "love") finishWishShow(true);
      else if (story) stopAliceStory();
      else if (state.immersed) setImmersed(false);
      else closePanels(true);
      return;
    }
    if (phoenix) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (
        e.code === "Space" &&
        phoenix.status === "ready" &&
        !phoenix.finished
      ) {
        e.preventDefault();
        togglePause();
      } else if (e.key.toLowerCase() === "m") toggleSound();
      return;
    }
    if (textCloud?.kind === "love") {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePause();
        syncLoveUI();
      } else if (e.key.toLowerCase() === "m") toggleSound();
      return;
    }
    if (story) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!story.finished) togglePause();
      } else if (
        e.key === "Enter" &&
        story.variant === "immersive" &&
        !(e.target instanceof Element && e.target.closest("button"))
      ) {
        e.preventDefault();
        awakenImmersiveMagic();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seekStoryAct(story.act + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekStoryAct(story.act - 1);
      } else if (e.key.toLowerCase() === "m") toggleSound();
      return;
    }
    if (
      (e.target instanceof Element &&
        e.target.closest("input,select,textarea,button")) ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      e.repeat
    )
      return;
    if (e.code === "Space") {
      e.preventDefault();
      pointer = null;
      togglePause();
    } else if (e.code === "Enter") {
      initAudio();
      launch();
    } else if (e.key.toLowerCase() === "f") {
      initAudio();
      finale();
    } else if (e.key.toLowerCase() === "t") toggleSlow();
    else if (e.key.toLowerCase() === "m") toggleSound();
    else if (e.key.toLowerCase() === "h") setImmersed(!state.immersed);
  });
  // Camera lifecycle: cancel invalidates pending startup and stops any late stream.
  function stopCamera() {
    cameraSession++;
    cameraState = "off";
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
    if (landmarker) {
      landmarker.close();
      landmarker = null;
    }
    clearHandTracking(false);
    handDetectionCost = 0;
    lastDetect = 0;
    lastVideoTime = -1;
    $("cameraBtn").setAttribute("aria-pressed", "false");
    $("cameraBtn").setAttribute("aria-label", "开启手势烟花");
    $("cameraLabel").textContent = "手势烟花";
    $("cameraCard").hidden = true;
  }
  function timeout(promise, ms, message) {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]).finally(() => clearTimeout(timer));
  }
  async function startCamera() {
    if (cameraState !== "off") {
      stopCamera();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      notify(
        "此环境无法访问摄像头。请用 localhost 或 HTTPS 打开；点击夜空仍可体验。",
      );
      return;
    }
    const session = ++cameraSession;
    cameraState = "loading";
    $("cameraLabel").textContent = "取消开启";
    $("cameraBtn").setAttribute("aria-pressed", "true");
    $("cameraBtn").setAttribute("aria-label", "取消开启手势烟花");
    syncCameraDisplay();
    $("cameraStatus").textContent = "请在浏览器中允许摄像头。";
    try {
      const request = navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });
      request.then(
        (s) => {
          if (session !== cameraSession) s.getTracks().forEach((t) => t.stop());
        },
        () => {},
      );
      const s = await timeout(request, 30000, "等待摄像头授权超时");
      if (session !== cameraSession) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = s;
      video.srcObject = s;
      const interrupted = () => {
        if (session !== cameraSession || stream !== s) return;
        stopCamera();
        notify("摄像头连接已中断，请点击“手势烟花”重新连接。");
      };
      for (const track of s.getTracks())
        track.addEventListener?.("ended", interrupted, { once: true });
      if (s.getTracks().some((track) => track.readyState === "ended")) {
        interrupted();
        return;
      }
      await video.play();
      if (session !== cameraSession) return;
      $("cameraStatus").textContent =
        "正在加载手势模型…首次可能需要 10–30 秒。";
      const embedded = window.fireworksPortable
        ? await timeout(
            window.fireworksPortable.vision(),
            60000,
            "内嵌手势组件加载超时",
          )
        : null;
      if (session !== cameraSession) return;
      const { HandLandmarker, FilesetResolver } =
        embedded ??
        (await timeout(
          import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs"),
          25000,
          "模型脚本加载超时",
        ));
      if (session !== cameraSession) return;
      const files =
        embedded?.files ??
        (await timeout(
          FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
          ),
          25000,
          "识别组件加载超时",
        ));
      if (session !== cameraSession) return;
      const options = {
        baseOptions: embedded
          ? { modelAssetBuffer: embedded.model, delegate: "GPU" }
          : {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate: "GPU",
            },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.55,
      };
      async function buildModel() {
        let expired = false;
        const task = HandLandmarker.createFromOptions(files, options);
        task.then(
          (m) => {
            if (expired) m.close();
          },
          () => {},
        );
        try {
          return await timeout(task, 30000, "手势模型加载超时");
        } catch (error) {
          expired = true;
          throw error;
        }
      }
      let model;
      try {
        model = await buildModel();
      } catch {
        if (session !== cameraSession) return;
        options.baseOptions.delegate = "CPU";
        model = await buildModel();
      }
      if (session !== cameraSession) {
        model.close();
        return;
      }
      landmarker = model;
      cameraState = "on";
      $("cameraLabel").textContent = "手势已开启";
      $("cameraBtn").setAttribute("aria-label", "关闭手势烟花");
      $("cameraStatus").textContent = "张开手掌试试 · 让手离镜头 40–80 cm";
    } catch (error) {
      if (session !== cameraSession) return;
      const denied = ["NotAllowedError", "PermissionDeniedError"].includes(
          error.name,
        ),
        noDevice = error.name === "NotFoundError";
      stopCamera();
      notify(
        denied
          ? "摄像头未获授权。你仍可点击夜空放烟花，或稍后重新开启。"
          : noDevice
            ? "没有找到摄像头。点击夜空，也能导演这场烟火。"
            : "手势模式暂不可用，请检查网络或摄像头后重试。点击夜空仍可体验。",
      );
    }
  }
  $("cameraBtn").addEventListener("click", startCamera);
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const handDistance = (a, b) =>
    Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
  function handAngle(a, b, c) {
    const u = handDistance(a, b),
      v = handDistance(c, b);
    return u * v > 1e-10
      ? (Math.acos(
          clamp(
            ((a.x - b.x) * (c.x - b.x) +
              (a.y - b.y) * (c.y - b.y) +
              ((a.z || 0) - (b.z || 0)) * ((c.z || 0) - (b.z || 0))) /
              (u * v),
            -1,
            1,
          ),
        ) *
          180) /
          Math.PI
      : 0;
  }
  const handFreshness = 0.45;
  function measureFingers(points) {
    return [5, 9, 13, 17].map((i) => {
      const bones = [0, 1, 2].map((j) =>
          handDistance(points[i + j], points[i + j + 1]),
        ),
        reach = handDistance(points[i], points[i + 3]);
      const forward =
        ((points[i + 3].x - points[i].x) * (points[9].x - points[0].x) +
          (points[i + 3].y - points[i].y) * (points[9].y - points[0].y) +
          ((points[i + 3].z || 0) - (points[i].z || 0)) *
            ((points[9].z || 0) - (points[0].z || 0))) /
        Math.max(1e-8, reach * handDistance(points[0], points[9]));
      return {
        pip: handAngle(points[i], points[i + 1], points[i + 2]),
        dip: handAngle(points[i + 1], points[i + 2], points[i + 3]),
        reach:
          reach /
          Math.max(
            1e-6,
            bones.reduce((a, b) => a + b, 0),
          ),
        forward,
        bones,
      };
    });
  }
  function measureHand(lm, world) {
    const finite = (p) =>
      p &&
      Number.isFinite(p.x) &&
      Number.isFinite(p.y) &&
      (p.z === undefined || Number.isFinite(p.z));
    if (!Array.isArray(lm) || lm.length !== 21 || !lm.every(finite))
      return { valid: false, reason: "请让手掌与指尖完整入镜" };
    const aspect =
        video.videoWidth && video.videoHeight
          ? video.videoWidth / video.videoHeight
          : 4 / 3,
      image = lm.map((p) => ({
        x: p.x * aspect,
        y: p.y,
        z: (p.z || 0) * aspect,
      }));
    const scale = Math.max(
        handDistance(image[0], image[9]),
        handDistance(image[5], image[17]) * 0.8,
      ),
      ids = [0, 5, 9, 13, 17];
    const cx = ids.reduce((n, i) => n + lm[i].x, 0) / 5,
      cy = ids.reduce((n, i) => n + lm[i].y, 0) / 5;
    const result = { lm, image, aspect, scale, cx, cy, valid: false };
    if (
      lm.some((p) => p.x < 0.005 || p.x > 0.995 || p.y < 0.005 || p.y > 0.995)
    )
      return { ...result, reason: "请让手腕与所有指尖完整入镜" };
    if (scale < 0.055)
      return { ...result, reason: "手掌离镜头近一些 · 建议 40–80 cm" };
    const area = Math.abs(
      (image[5].x - image[0].x) * (image[17].y - image[0].y) -
        (image[5].y - image[0].y) * (image[17].x - image[0].x),
    );
    if (area / (scale * scale) < 0.14)
      return { ...result, reason: "手掌或手背朝向镜头，避免侧着手" };
    let points =
      Array.isArray(world) && world.length === 21 && world.every(finite)
        ? world
        : image;
    let palm = Math.max(
      handDistance(points[0], points[9]),
      handDistance(points[5], points[17]) * 0.8,
    );
    if (palm < 1e-5) {
      points = image;
      palm = scale;
    }
    const fingers = measureFingers(points),
      plane = image.map((p) => ({ x: p.x, y: p.y, z: 0 })),
      planeScale = Math.max(
        distance(plane[0], plane[9]),
        distance(plane[5], plane[17]) * 0.8,
      ),
      planeFingers = measureFingers(plane);
    if (
      fingers.some((f) =>
        f.bones.some((b) => b / palm < 0.035 || b / palm > 1.05),
      )
    )
      return { ...result, reason: "手指暂时被遮挡 · 请展开后再试" };
    return {
      ...result,
      valid: true,
      points,
      palm,
      fingers,
      plane,
      planeScale,
      planeFingers,
    };
  }
  function handPose(sample, previous = "rest") {
    if (!sample.valid) return "rest";
    const {
      points: p,
      palm,
      fingers: f,
      image,
      scale,
      plane: q,
      planeScale,
      planeFingers: g,
    } = sample;
    // Occluded finger depth is less reliable than its silhouette; require agreement on shape, not every joint angle.
    const extended = (i, hold = false) => {
      const a = f[i],
        b = g[i];
      if (b.pip < 120 && b.reach < 0.76 && !(a.pip > 158 && a.reach > 0.93))
        return false;
      const straight =
        a.reach > (hold ? 0.71 : 0.79) &&
        a.forward > (hold ? 0.1 : 0.18) &&
        (a.pip > (hold ? 126 : 138) || (a.dip > 155 && a.reach > 0.88));
      const silhouette =
        b.reach > (hold ? 0.76 : 0.84) &&
        b.pip > (hold ? 136 : 148) &&
        b.forward > (hold ? 0.25 : 0.38) &&
        a.reach > (hold ? 0.55 : 0.63) &&
        a.forward > -0.15;
      const clearSilhouette =
        b.reach > 0.92 &&
        b.pip > 160 &&
        b.dip > 155 &&
        b.forward > 0.55 &&
        a.reach > 0.62;
      return straight || silhouette || clearSilhouette;
    };
    const folded = (i, hold = false) =>
      !extended(i, hold) &&
      (f[i].reach < (hold ? 0.79 : 0.73) ||
        f[i].forward < (hold ? 0.45 : 0.3) ||
        g[i].forward < 0.25 ||
        (g[i].reach < 0.76 && g[i].pip < 120));
    // A natural precision pinch may curl all remaining fingers. Elevated contact distinguishes it from a fist.
    const pinched = previous === "pinch",
      contact = distance(q[4], q[8]) / planeScale,
      depth = Math.abs(image[4].z - image[8].z) / scale;
    const raisedContact =
      handDistance(p[0], p[8]) / handDistance(p[0], p[5]) > 1.02 &&
      distance(q[0], q[8]) / distance(q[0], q[5]) > 1.08;
    const loop =
      (f[0].pip < 172 || f[0].dip < 165 || g[0].pip < 165) &&
      (raisedContact || [1, 2, 3].some((i) => extended(i, true)));
    const pinch =
      contact < (pinched ? 0.4 : 0.24) &&
      handDistance(image[4], image[8]) / scale < (pinched ? 0.54 : 0.4) &&
      depth < (pinched ? 0.5 : 0.35) &&
      handDistance(p[4], p[8]) / palm < (pinched ? 0.95 : 0.75) &&
      loop;
    // A finger heart crosses finger segments, while a pinch only joins their tips.
    const crosses = (a, b, c, d) => {
      const ux = b.x - a.x,
        uy = b.y - a.y,
        vx = d.x - c.x,
        vy = d.y - c.y,
        den = ux * vy - uy * vx;
      if (Math.abs(den) < planeScale * planeScale * 0.015) return false;
      const dx = c.x - a.x,
        dy = c.y - a.y,
        t = (dx * vy - dy * vx) / den,
        u = (dx * uy - dy * ux) / den;
      return t > 0.04 && t < 0.96 && u > 0.04 && u < 0.96;
    };
    const heart = previous === "fingerheart",
      otherFolded = [1, 2, 3].every((i) => folded(i, heart));
    const thumbReach =
      handDistance(p[2], p[4]) /
      Math.max(1e-6, handDistance(p[2], p[3]) + handDistance(p[3], p[4]));
    const thumbPlaneReach =
      distance(q[2], q[4]) /
      Math.max(1e-6, distance(q[2], q[3]) + distance(q[3], q[4]));
    const up = {
      x: (q[9].x - q[0].x) / planeScale,
      y: (q[9].y - q[0].y) / planeScale,
    };
    const lift = (i) =>
        ((q[i].x - q[5].x) * up.x + (q[i].y - q[5].y) * up.y) / planeScale,
      thumbLift = lift(4),
      indexLift = lift(8);
    const crossing =
      contact > (heart ? 0.07 : 0.1) &&
      contact < (heart ? 0.8 : 0.68) &&
      depth < 0.55 &&
      raisedContact &&
      (crosses(q[3], q[4], q[6], q[7]) || crosses(q[3], q[4], q[7], q[8]));
    // On the back of a hand, the hidden index/thumb joints can lose their exact crossing and world direction.
    const uprightPair =
      g[0].reach > 0.92 &&
      g[0].pip > 160 &&
      g[0].forward > 0.55 &&
      thumbReach > 0.8 &&
      thumbPlaneReach > 0.78 &&
      thumbLift > (heart ? 0.38 : 0.52) &&
      indexLift > (heart ? 0.5 : 0.65);
    const backHeart =
      uprightPair &&
      contact > (heart ? 0.23 : 0.28) &&
      contact < (heart ? 1 : 0.85) &&
      depth < (heart ? 0.85 : 0.72) &&
      handDistance(p[4], p[8]) / palm < 1.15;
    if (otherFolded && (crossing || backHeart)) return "fingerheart";
    const possibleHeart =
      otherFolded &&
      g[0].reach > 0.86 &&
      g[0].pip > 150 &&
      g[0].forward > 0.4 &&
      thumbLift > 0.38 &&
      indexLift > 0.55 &&
      thumbReach > 0.8;
    const uncertainPair =
      otherFolded && uprightPair && contact >= 0.18 && contact <= 0.32;
    if (pinch && !uncertainPair) return "pinch";
    if (uncertainPair) return "rest";
    const thumbOut =
      thumbReach > 0.82 &&
      ((handDistance(p[4], p[5]) / palm > 0.5 &&
        distance(q[4], q[5]) / planeScale > 0.4) ||
        (thumbPlaneReach > 0.85 && distance(q[4], q[5]) / planeScale > 0.62));
    const side = { x: q[5].x - q[17].x, y: q[5].y - q[17].y },
      thumbSide =
        ((q[4].x - q[5].x) * side.x + (q[4].y - q[5].y) * side.y) /
        Math.max(1e-8, distance(q[5], q[17]) * planeScale);
    const thumbOpen =
      thumbReach > 0.86 &&
      thumbPlaneReach > 0.85 &&
      thumbSide > 0.15 &&
      distance(q[4], q[5]) / planeScale > 0.32;
    if (
      thumbOpen &&
      extended(0, previous === "dj") &&
      extended(3, previous === "dj") &&
      folded(1, previous === "dj") &&
      folded(2, previous === "dj")
    )
      return "dj";
    if (
      thumbOpen &&
      extended(3, previous === "shaka") &&
      [0, 1, 2].every((i) => folded(i, previous === "shaka"))
    )
      return "shaka";
    const thumbUp =
      ((q[4].x - q[2].x) * (q[9].x - q[0].x) +
        (q[4].y - q[2].y) * (q[9].y - q[0].y)) /
      Math.max(1e-8, distance(q[2], q[4]) * distance(q[0], q[9]));
    const obliqueThumb =
      thumbUp > (previous === "thumbsup" ? 0.55 : 0.6) &&
      thumbReach > 0.9 &&
      thumbPlaneReach > 0.92 &&
      distance(q[4], q[5]) / planeScale > 0.72 &&
      g.every((finger) => finger.reach < 0.6 && finger.pip < 110);
    if (
      thumbOut &&
      (thumbUp > 0.78 || obliqueThumb) &&
      [0, 1, 2, 3].every((i) => folded(i, previous === "thumbsup")) &&
      [0, 1, 2, 3].filter((i) => f[i].pip < 145 || g[i].pip < 135).length >= 3
    )
      return "thumbsup";
    if (
      [0, 1, 2, 3].every((i) => extended(i, previous === "open")) &&
      handDistance(p[4], p[5]) / palm > 0.32
    )
      return "open";
    if (
      extended(0, previous === "peace") &&
      extended(1, previous === "peace") &&
      folded(2, previous === "peace") &&
      folded(3, previous === "peace") &&
      distance(q[8], q[12]) / planeScale > (previous === "peace" ? 0.15 : 0.23)
    )
      return "peace";
    if (
      !possibleHeart &&
      extended(0, previous === "point") &&
      [1, 2, 3].every((i) => folded(i, previous === "point"))
    )
      return "point";
    return "rest";
  }
  function handAim(sample, gesture) {
    const ids =
      gesture === "point"
        ? [8]
        : gesture === "pinch" || gesture === "fingerheart"
          ? [4, 8]
          : [0, 5, 9, 13, 17];
    return {
      nx: 1 - ids.reduce((n, i) => n + sample.lm[i].x, 0) / ids.length,
      ny: ids.reduce((n, i) => n + sample.lm[i].y, 0) / ids.length,
    };
  }
  function analyze(lm, previous = "rest", world) {
    const sample = measureHand(lm, world),
      gesture = handPose(sample, previous),
      aim = sample.lm ? handAim(sample, gesture) : { nx: 0.5, ny: 0.5 };
    return { gesture, valid: sample.valid, x: aim.nx * w, y: aim.ny * horizon };
  }
  function setHandStatus(text) {
    if ($("cameraStatus").textContent !== text)
      $("cameraStatus").textContent = text;
  }
  function showHandHold(progress) {
    const bar = $("cameraHold");
    bar.hidden = progress === null;
    if (progress !== null) {
      bar.style.setProperty("--gesture-hold", String(clamp(progress, 0, 1)));
      bar.setAttribute(
        "aria-valuenow",
        String(Math.floor(clamp(progress, 0, 1) * 4) * 25),
      );
    }
  }
  function clearHandTracking(keepCooldown = true) {
    handMarks = [];
    handMemory.clear();
    lastHandsAt = null;
    handTrackId = 0;
    const lastAt = keepCooldown ? dualGesture.lastAt : -Infinity,
      latched = keepCooldown && dualGesture.latched,
      fired = keepCooldown && dualGesture.fired;
    Object.assign(dualGesture, {
      hold: 0,
      pair: "",
      wasValid: false,
      lastValid: null,
      latched,
      releaseSince: null,
      lastAt,
      fired,
    });
    showHandHold(null);
  }
  function matchHandTracks(samples, now) {
    const tracks = [...handMemory.values()].filter(
      (m) => now - m.seenAt <= handFreshness,
    );
    let best = { cost: Infinity, matches: [] };
    function visit(i, used, cost, matches) {
      if (i === samples.length) {
        if (cost < best.cost) best = { cost, matches: matches.slice() };
        return;
      }
      visit(i + 1, used, cost + 2.5, [...matches, null]);
      const s = samples[i];
      for (const m of tracks) {
        if (used.has(m.id)) continue;
        const gap = Math.hypot((s.cx - m.cx) * s.aspect, s.cy - m.cy),
          span = Math.max(s.scale, m.scale);
        if (
          gap > Math.max(0.12, span * 1.6) ||
          Math.max(s.scale, m.scale) / Math.min(s.scale, m.scale) > 2.1
        )
          continue;
        const score =
          gap / span +
          0.25 * Math.abs(Math.log(s.scale / m.scale)) +
          (s.side && m.side && s.side !== m.side ? 0.08 : 0);
        const next = new Set(used);
        next.add(m.id);
        visit(i + 1, next, cost + score, [...matches, m]);
      }
    }
    visit(0, new Set(), 0, []);
    return best.matches;
  }
  function updateHandTrack(sample, track, now) {
    const m = track || {
      id: ++handTrackId,
      gesture: "rest",
      candidate: "rest",
      candidateSince: now,
      since: now,
      samples: 0,
      fires: {},
      seenAt: now,
      nx: 1 - sample.cx,
      ny: sample.cy,
      cx: sample.cx,
      cy: sample.cy,
      scale: sample.scale,
    };
    const dt = Math.max(0.001, now - m.seenAt);
    if (dt > handFreshness) {
      m.gesture = "rest";
      m.candidate = "rest";
      m.candidateSince = now;
      m.samples = 0;
    }
    const raw = handPose(sample, m.gesture),
      aim = handAim(sample, raw);
    const uncertain =
      raw === "rest" &&
      m.candidate !== "rest" &&
      now - (m.candidateLast ?? -Infinity) < 0.16;
    if (!uncertain) {
      if (raw !== m.candidate) {
        m.candidate = raw;
        m.candidateSince = now;
        m.samples = 1;
      } else m.samples++;
      m.candidateLast = now;
    }
    const settle =
      raw === "pinch"
        ? 0.075
        : raw === "peace"
          ? 0.11
          : raw === "open"
            ? 0.13
            : raw === "point"
              ? 0.1
              : ["fingerheart", "dj", "thumbsup", "shaka"].includes(raw)
                ? 0.15
                : 0.1;
    if (
      !uncertain &&
      raw !== m.gesture &&
      m.samples >= 2 &&
      now - m.candidateSince >= settle
    ) {
      m.gesture = raw;
      m.since = m.candidateSince;
    }
    const moving =
        Math.hypot((aim.nx - m.nx) * w, (aim.ny - m.ny) * horizon) >
        Math.min(w, h) * 0.025,
      alpha = track
        ? 1 - Math.exp(-Math.min(dt, 0.14) * (moving ? 26 : 10))
        : 1;
    m.nx += (aim.nx - m.nx) * alpha;
    m.ny += (aim.ny - m.ny) * alpha;
    Object.assign(m, {
      cx: sample.cx,
      cy: sample.cy,
      scale: sample.scale,
      side: sample.side,
      seenAt: now,
      raw,
      sample,
    });
    handMemory.set(m.id, m);
    return m;
  }
  function updateDualGesture(tracks, now, dt) {
    const d = dualGesture,
      rawBoth =
        tracks.length === 2 &&
        tracks.every((m) => m.raw === "open") &&
        Math.hypot(
          (tracks[0].cx - tracks[1].cx) * tracks[0].sample.aspect,
          tracks[0].cy - tracks[1].cy,
        ) >
          Math.max(tracks[0].scale, tracks[1].scale) * 0.9;
    const confirmed = rawBoth && tracks.every((m) => m.gesture === "open"),
      pair = tracks
        .map((m) => m.id)
        .sort((a, b) => a - b)
        .join(":");
    if (d.latched) {
      if (rawBoth) d.releaseSince = null;
      else {
        if (d.releaseSince === null) d.releaseSince = now;
        const explicit = tracks.some((m) => m.raw !== "open");
        if (now - d.releaseSince >= (explicit ? 0.25 : 0.6)) {
          d.latched = false;
          d.releaseSince = null;
          d.hold = 0;
          d.pair = "";
          d.wasValid = false;
          d.fired = false;
        }
      }
      if (d.latched) {
        showHandHold(null);
        return {
          suppress: true,
          status: d.fired
            ? "齐放完成 · 收起双掌后可再次触发"
            : "齐放间隔中 · 收起双掌，稍后再试",
        };
      }
    }
    if (confirmed) {
      if (d.pair !== pair) {
        d.pair = pair;
        d.hold = Math.min(0.18, now - Math.max(...tracks.map((m) => m.since)));
        d.wasValid = false;
      } else if (d.wasValid) d.hold += Math.min(dt, 0.16);
      d.wasValid = true;
      d.lastValid = now;
      if (d.hold >= 0.8) {
        d.latched = true;
        d.releaseSince = null;
        d.fired = now - d.lastAt >= 7 && clock - lastFinale >= 2;
        if (d.fired) {
          finale();
          d.lastAt = now;
        }
        showHandHold(null);
        return {
          suppress: true,
          status: d.fired
            ? "齐放完成 · 收起双掌后可再次触发"
            : "齐放间隔中 · 收起双掌，稍后再试",
        };
      }
    } else {
      d.wasValid = false;
      if (d.lastValid === null || now - d.lastValid > 0.16) {
        d.hold = 0;
        d.pair = "";
      }
    }
    const waiting = rawBoth || d.hold > 0;
    showHandHold(waiting ? d.hold / 0.8 : null);
    return {
      suppress: waiting,
      status: waiting ? "双掌已就位 · 保持约 0.8 秒" : null,
    };
  }
  function processHands(result, now) {
    if (!Number.isFinite(now) || (lastHandsAt !== null && now <= lastHandsAt))
      return;
    if (story || textCloud?.kind === "love" || state.paused) {
      clearHandTracking();
      if (state.paused) setHandStatus("手势已暂停 · 继续演出后生效");
      return;
    }
    if (lastHandsAt !== null && now - lastHandsAt > handFreshness)
      clearHandTracking();
    const dt = lastHandsAt === null ? 0 : now - lastHandsAt;
    lastHandsAt = now;
    const measured = (result.landmarks || [])
      .slice(0, 2)
      .map((lm, i) => ({
        ...measureHand(lm, result.worldLandmarks?.[i]),
        side: result.handedness?.[i]?.[0]?.categoryName,
      }));
    const samples = measured
      .filter((s) => s.valid)
      .filter(
        (s, i, all) =>
          !all
            .slice(0, i)
            .some(
              (a) =>
                Math.hypot((s.cx - a.cx) * s.aspect, s.cy - a.cy) <
                Math.min(s.scale, a.scale) * 0.45,
            ),
      );
    const matches = matchHandTracks(samples, now),
      tracks = samples.map((s, i) => updateHandTrack(s, matches[i], now)),
      seen = new Set(tracks.map((m) => m.id));
    for (const [id, m] of handMemory)
      if (
        !seen.has(id) &&
        (now - m.seenAt > handFreshness || handMemory.size > 2)
      )
        handMemory.delete(id);
    handMarks = samples.map((s) => s.lm);
    const dual = updateDualGesture(tracks, now, dt),
      labels = [];
    const names = {
      open: "张掌 · 球形礼花",
      point: "食指 · 指向发射",
      peace: "比耶 · 双环星轨",
      pinch: "捏合 · 指尖火花",
      fingerheart: "交叉比心 · 双心花火",
      dj: "DJ · 霓虹音浪",
      thumbsup: "点赞 · 金色王冠",
      shaka: "六 · 碧海流光",
    };
    for (const m of tracks) {
      if (names[m.gesture]) labels.push(names[m.gesture]);
      if (
        m.raw !== m.gesture ||
        m.gesture === "rest" ||
        (dual.suppress && m.gesture === "open")
      )
        continue;
      const delay =
        {
          pinch: 0.09,
          point: 0.8,
          peace: 2.2,
          fingerheart: 2.4,
          dj: 2.8,
          thumbsup: 2.8,
          shaka: 2.6,
        }[m.gesture] ?? 1.6;
      if (now - (m.fires[m.gesture] ?? -Infinity) < delay) continue;
      m.fires[m.gesture] = now;
      const x = m.nx * w,
        y = m.ny * horizon;
      handBloom(m.gesture, x, y);
    }
    setHandStatus(
      dual.status ||
        (labels.length
          ? [...new Set(labels)].join(" · ")
          : samples.some((s) => handPose(s) !== "rest")
            ? "正在确认手势…"
            : measured.find((s) => !s.valid)?.reason ||
              "未检测到清晰手势 · 手掌或手背朝前，参照图解"),
    );
  }
  function drawHands() {
    if (cameraState !== "on" || state.paused || !$("skeletonInput").checked)
      return;
    const links = [
      [0, 5],
      [5, 9],
      [9, 13],
      [13, 17],
      [17, 0],
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [5, 6],
      [6, 7],
      [7, 8],
      [9, 10],
      [10, 11],
      [11, 12],
      [13, 14],
      [14, 15],
      [15, 16],
      [17, 18],
      [18, 19],
      [19, 20],
    ];
    ctx.strokeStyle = "rgba(206,221,233,.16)";
    ctx.lineWidth = 1;
    if (
      lastHandsAt === null ||
      performance.now() / 1000 - lastHandsAt > handFreshness
    )
      return;
    for (const lm of handMarks)
      for (const [a, b] of links) {
        ctx.beginPath();
        ctx.moveTo((1 - lm[a].x) * w, lm[a].y * horizon);
        ctx.lineTo((1 - lm[b].x) * w, lm[b].y * horizon);
        ctx.stroke();
      }
    ctx.strokeStyle = "rgba(237,206,145,.6)";
    for (const m of handMemory.values())
      if (m.seenAt === lastHandsAt && m.gesture !== "rest") {
        ctx.beginPath();
        ctx.arc(m.nx * w, m.ny * horizon, 9, 0, TAU);
        ctx.stroke();
      }
    ctx.strokeStyle = "rgba(206,221,233,.16)";
  }
  function frame(timestamp) {
    requestAnimationFrame(frame);
    const elapsed = lastFrame ? timestamp - lastFrame : 16.7;
    lastFrame = timestamp;
    if (document.hidden) return;
    // A busy 20–30 fps frame still advances in real time; hidden tabs never catch up.
    const dt =
      Math.min(elapsed / 1000, 0.1) *
      (state.slow && !phoenix && !story && textCloud?.kind !== "love"
        ? 0.28
        : 1);
    if (phoenix) {
      syncPhoenixAudio();
      if (!state.paused) advancePhoenixShow(dt, elapsed);
      updateMusicMix(timestamp);
      paintPhoenixShow();
      return;
    }
    if (state.quality === "auto" && !state.paused) {
      frameAverage = frameAverage * 0.97 + Math.min(elapsed, 100) * 0.03;
      if (frameAverage > 27) {
        if (++slowFrames > 70) {
          adaptive = Math.max(0.5, adaptive - 0.1);
          slowFrames = 0;
        }
      } else slowFrames = Math.max(0, slowFrames - 1);
    }
    if (!state.paused) {
      clock += dt;
      ordinaryComets = ordinaryComets.filter(
        (r) => clock - r.tailAt <= r.duration + 1.45,
      );
      advanceWishShow(dt);
      advanceStory(dt);
      updateShow(dt);
      for (let i = pending.length - 1; i >= 0; i--)
        if (pending[i].at <= clock) {
          const task = pending.splice(i, 1)[0];
          task.callback();
        }
    }
    const handInterval = Math.min(
      120,
      Math.max(compactControls ? 60 : 45, handDetectionCost * 3.2),
    );
    if (
      cameraState === "on" &&
      stream?.getTracks().some((track) => track.readyState === "ended")
    ) {
      stopCamera();
      notify("摄像头连接已中断，请点击“手势烟花”重新连接。");
    }
    if (
      cameraState === "on" &&
      !state.paused &&
      !story &&
      landmarker &&
      video.readyState >= 2 &&
      video.currentTime !== lastVideoTime &&
      timestamp - lastDetect >= handInterval
    ) {
      lastDetect = timestamp;
      lastVideoTime = video.currentTime;
      try {
        const start = performance.now(),
          result = landmarker.detectForVideo(video, timestamp);
        handDetectionCost =
          handDetectionCost * 0.7 + (performance.now() - start) * 0.3;
        processHands(result, timestamp / 1000);
      } catch {
        stopCamera();
        notify("手势识别已中断。可重新开启；点击模式仍可继续。");
      }
    }
    if (
      cameraState === "on" &&
      !state.paused &&
      lastHandsAt !== null &&
      timestamp / 1000 - lastHandsAt > handFreshness
    ) {
      clearHandTracking();
      setHandStatus("等待摄像头画面 · 请让手掌完整入镜");
    }
    updateMusicMix(timestamp);
    paint(dt);
  }
  addEventListener("resize", resize);
  addEventListener("pagehide", () => {
    stopCamera();
    pauseAllMusic();
    stopSoundVoices();
    if (audioController.context)
      audioController.context.suspend().catch(() => {});
  });
  document.addEventListener("visibilitychange", () => {
    lastFrame = 0;
    if (document.hidden) {
      pointer = null;
      clearHandTracking();
      syncAudioPlayback();
      if (audioController.context)
        audioController.context.suspend().catch(() => {});
    } else {
      if (audioController.context && state.sound && !state.paused)
        audioController.context.resume().catch(() => {});
      syncAudioPlayback();
    }
  });
  reduced.addEventListener("change", (event) => {
    if (event.matches) setAutoPlay(false);
  });
  restorePreferences();
  syncSoundUI();
  syncAppearance();
  resize();
  setViewMode(state.view, false);
  setAutoPlay(state.auto, false);
  requestAnimationFrame(frame);
  if (reduced.matches && !state.auto)
    notify(
      "已按减少动态效果偏好关闭自动演出。可点击夜空，或点击“自动关”开启。",
    );
}
