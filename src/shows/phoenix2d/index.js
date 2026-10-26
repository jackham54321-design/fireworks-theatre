// Pure rendering extracted from the existing 22s planar performance.
// Planar choreography with a continuously articulated painted 2D character.
import { createPhoenixRig, rigState, tailPoint } from "./rig.js";
import { createPhoenixEffects } from "./effects.js";
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
const ramp = (a, b, x) => smooth((x - a) / (b - a)),
  mix = (a, b, t) => a + (b - a) * t;
const hash = (x) => {
  const n = Math.sin(x * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};
export const DURATION = 22,
  ASCENT = 11.6;
function stage(width, height, horizon) {
  const portrait = width < 700 && height > width,
    top = height < 530 ? 112 : 106,
    bottom = horizon - (height < 530 ? 12 : 28),
    room = Math.max(110, bottom - top),
    size = Math.min(width * (portrait ? 0.68 : 0.7), room * 1.5 * 0.72);
  return { top, room, size, cy: (top + bottom) * 0.5 };
}
function knots(width, height, horizon) {
  const f = stage(width, height, horizon),
    small = width < 700,
    L = width * (small ? 0.54 : 0.36),
    R = width * (small ? 0.6 : 0.72),
    C = width * 0.5,
    Y = f.cy,
    H = f.room;
  return [
    [4.7, L, Y + H * 0.02],
    [6.2, mix(L, R, 0.54), Y - H * 0.12],
    [7.1, R, Y - H * 0.06],
    [
      7.75,
      small ? width * 0.55 : R + Math.min(width * 0.035, 35),
      Y - H * 0.19,
    ],
    [8.4, small ? width * 0.47 : R, Y - H * 0.32],
    [9.4, C + width * (small ? 0.015 : 0.07), Y - H * 0.12],
    [10.2, C - width * 0.07, Y + H * 0.05],
    [10.9, C - width * 0.035, Y - H * 0.02],
    [ASCENT, C, Y - H * 0.16],
  ];
}
function velocity(nodes, i, room) {
  if (i === 0) return [0, 0];
  if (i === nodes.length - 1) return [0, -room * 0.23];
  const p = nodes[i - 1],
    n = nodes[i + 1],
    d = n[0] - p[0];
  return [(n[1] - p[1]) / d, (n[2] - p[2]) / d];
}
function bankAt(t) {
  const nodes = [
    [4.7, 0],
    [5.9, -0.24],
    [7.1, 0],
    [7.75, 0.08],
    [8.4, 0],
    [9.4, -0.25],
    [10.2, 0],
    [10.9, -0.08],
    [ASCENT, 0],
  ];
  if (t <= nodes[0][0] || t >= ASCENT) return 0;
  let i = 0;
  while (t > nodes[i + 1][0]) i++;
  const a = nodes[i],
    b = nodes[i + 1],
    d = b[0] - a[0],
    u = (t - a[0]) / d;
  const tangent = (j) =>
    j === 0 || j === nodes.length - 1
      ? 0
      : (nodes[j + 1][1] - nodes[j - 1][1]) /
        (nodes[j + 1][0] - nodes[j - 1][0]);
  return (
    (2 * u ** 3 - 3 * u * u + 1) * a[1] +
    (u ** 3 - 2 * u * u + u) * d * tangent(i) +
    (-2 * u ** 3 + 3 * u * u) * b[1] +
    (u ** 3 - u * u) * d * tangent(i + 1)
  );
}
export function phoenixPose(t, width, height, horizon) {
  const f = stage(width, height, horizon),
    nodes = knots(width, height, horizon);
  let x = nodes[0][1],
    y = nodes[0][2];
  if (t >= ASCENT) {
    const a = t - ASCENT;
    x = width * 0.5;
    y = nodes.at(-1)[2] - f.room * (0.23 * a + 0.19 * a * a);
  } else if (t > 4.7) {
    let i = 0;
    while (i < nodes.length - 2 && t > nodes[i + 1][0]) i++;
    const a = nodes[i],
      b = nodes[i + 1],
      d = b[0] - a[0],
      u = clamp((t - a[0]) / d),
      u2 = u * u,
      u3 = u2 * u,
      av = velocity(nodes, i, f.room),
      bv = velocity(nodes, i + 1, f.room);
    x =
      (2 * u3 - 3 * u2 + 1) * a[1] +
      (u3 - 2 * u2 + u) * d * av[0] +
      (-2 * u3 + 3 * u2) * b[1] +
      (u3 - u2) * d * bv[0];
    y =
      (2 * u3 - 3 * u2 + 1) * a[2] +
      (u3 - 2 * u2 + u) * d * av[1] +
      (-2 * u3 + 3 * u2) * b[2] +
      (u3 - u2) * d * bv[1];
  }
  const rotation = bankAt(t);
  const size =
    f.size * (1 - 0.1 * ramp(4.5, 5.5, t) + 0.1 * ramp(10.4, ASCENT, t));
  return {
    x,
    y,
    size,
    unit: size / 768,
    rotation,
    opacity: ramp(1.68, 1.95, t),
    symmetric: t >= ASCENT,
  };
}
function phase(t) {
  return t >= DURATION
    ? ["谢幕", "凤影归于天穹，余光留在心间。"]
    : t < 1.8
      ? ["引火", "一簇星火，唤醒九天金羽。"]
      : t < 4.7
        ? ["聚形", "金翎燃起，浴火成凤。"]
        : t < 7.1
          ? ["振翼掠空", "双翼织光，星火随凤起舞。"]
          : t < 8.4
            ? ["回身弧舞", "回身一舞，万点金羽照夜空。"]
            : t < 10.2
              ? ["收翼掠回", "收翼掠回，再借一拍振翅腾起。"]
              : t < ASCENT
                ? ["展翼扶摇", "抬首，展翼，向着天穹。"]
                : t < 15
                  ? ["冲霄", "双翼齐平，九重金焰送凤冲霄。"]
                  : ["梦羽", "凤凰已远，梦幻凤羽仍在飘落。"];
}
function glow(ctx, x, y, r, hue, alpha) {
  if (alpha < 0.001) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, "#fff6cf");
  g.addColorStop(0.12, `hsla(${hue},100%,80%,.55)`);
  g.addColorStop(1, `hsla(${hue},100%,60%,0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}
function drawDream(ctx, t, view, art) {
  const scale = Math.min(view.width / 800, view.height / 650, 1);
  for (let i = 0; i < 24; i++) {
    const born = 11.85 + i * 0.095,
      life = 6.8,
      age = t - born;
    if (age < 0 || age > life) continue;
    const p = phoenixPose(born, view.width, view.height, view.horizon),
      anchor = tailPoint((i % 5) - 2, 0.72 + hash(i * 4.2) * 0.23, born),
      c = Math.cos(p.rotation),
      s = Math.sin(p.rotation);
    const x =
      p.x +
      (anchor.x * c - anchor.y * s) * p.unit +
      (Math.sin(age * 0.7 + i * 1.3) * 14 +
        Math.sin(i * 3.1) * age * 3 +
        Math.sin(i * 2.39996) * age * age * 2.8) *
        scale;
    const y =
      p.y +
      (anchor.x * s + anchor.y * c) * p.unit +
      (age * 13 + age * age * 0.9) * scale;
    const alpha = ramp(0, 0.35, age) * (1 - ramp(life - 2.5, life, age)) * 0.75,
      length =
        (43 + hash(i * 6) * 32) * scale * (0.25 + 0.75 * ramp(0, 0.7, age));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(Math.sin(age * 0.6 + i * 2.2) * 0.65);
    ctx.drawImage(
      art,
      (i % 2) * 768 + 240,
      0,
      288,
      512,
      -length * 0.28,
      -length * 0.8,
      length * 0.56,
      length,
    );
    ctx.restore();
    if (i % 4 === 0) glow(ctx, x, y, 7 * scale, 44, alpha * 0.2);
  }
}
function drawShell(ctx, t, view) {
  if (t > 2.25) return;
  const u = clamp(t / 1.78),
    x = view.width * 0.5,
    y = mix(view.horizon + 10, view.horizon * 0.65, 1 - (1 - u) ** 1.3),
    alpha = 1 - ramp(1.78, 2.15, t);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createLinearGradient(x, y, x, y + 60);
  g.addColorStop(0, "#fff5cf");
  g.addColorStop(1, "#ffb35100");
  ctx.strokeStyle = g;
  ctx.lineWidth = 1.1;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(x, y + 60 * u);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.restore();
  glow(ctx, x, y, 16, 35, alpha);
  if (t > 1.78) glow(ctx, x, y, 60, 36, Math.exp(-(t - 1.78) * 12) * 0.4);
}
function paintPhoenix(ctx, surface, view) {
  if (!surface) return;
  // Keep distant firework detail behind the painted feather silhouette.
  ctx.globalCompositeOperation = "destination-out";
  ctx.globalAlpha = 0.72;
  ctx.drawImage(surface, 0, 0, view.width, view.height);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 1;
  ctx.drawImage(surface, 0, 0, view.width, view.height);
}
export async function createPhoenixTheatre({
  canvas,
  onContextLost = () => {},
  signal,
  resolveAsset = (path) => new URL(path, import.meta.url).href,
}) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("平面舞台暂时无法开启");
  const images = await Promise.all(
    ["rig-flight.png", "rig-upright.png", "rig-feathers.png"].map(
      async (name) => {
        const response = await fetch(resolveAsset("./phoenix-review/" + name), {
          signal,
        });
        if (!response.ok) throw Error("凤羽暂时未能载入");
        const url = URL.createObjectURL(await response.blob()),
          image = new Image();
        try {
          image.src = url;
          await image.decode();
          signal?.throwIfAborted();
          return image;
        } finally {
          URL.revokeObjectURL(url);
        }
      },
    ),
  );
  const gpu = createPhoenixRig(images),
    effects = createPhoenixEffects(phoenixPose, tailPoint, rigState);
  let ready = true,
    key = "",
    last = "",
    surfaces = [];
  function render(
    t,
    width = innerWidth,
    height = innerHeight,
    pixelRatio = devicePixelRatio,
    horizon = height * (width < height ? 0.64 : 0.675),
  ) {
    if (!ready) return;
    const ratio = Math.min(
        pixelRatio || 1,
        width < 700 && height > width ? 1.5 : 1.7,
      ),
      next = [width, height, ratio, horizon].join(":");
    if (next !== key) {
      key = next;
      last = "";
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    const frame = key + ":" + t.toFixed(6);
    if (frame === last) return;
    last = frame;
    const view = { width, height, horizon, ratio },
      pose = phoenixPose(t, width, height, horizon);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "lighter";
    const accompaniment = effects.render(t, view, pose),
      bird = gpu.render(t, view, pose);
    if (!accompaniment || !bird) {
      ready = false;
      ctx.restore();
      onContextLost();
      throw Error("平面舞台暂时中断");
    }
    surfaces = [accompaniment, bird];
    ctx.drawImage(accompaniment, 0, 0, width, height);
    drawShell(ctx, t, view);
    if (t >= 1.68 && t < 16) paintPhoenix(ctx, bird, view);
    drawDream(ctx, t, view, images[2]);
    ctx.restore();
  }
  for (const t of [3, 7.5, 11.8, 17, 0]) {
    signal?.throwIfAborted();
    render(t);
    await new Promise(requestAnimationFrame);
  }
  return {
    render,
    get ready() {
      return ready;
    },
    phase,
    inspect() {
      return {
        dimension: "2d",
        viewportRevision: 18,
        duration: DURATION,
        renderer: "planar-webgl2",
        effects: effects.stats,
      };
    },
    dispose() {
      ready = false;
      for (const surface of surfaces)
        surface
          .getContext("webgl2")
          ?.getExtension("WEBGL_lose_context")
          ?.loseContext();
    },
  };
}
