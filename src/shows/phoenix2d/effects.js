// A deterministic, strictly planar pyrotechnic score. One instanced draw per frame.
const TAU = Math.PI * 2,
  clamp = (x) => Math.max(0, Math.min(1, x));
const hash = (x) => {
  const n = Math.sin(x * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};
function rgb(h, s = 0.88, l = 0.65) {
  h = (((h % 360) + 360) % 360) / 60;
  const c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs((h % 2) - 1)),
    m = l - c / 2;
  return [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][Math.floor(h)].map((n) => n + m);
}
export function buildPhoenixScore(view, poseAt, tailAt, rigAt) {
  const { width: w, height: h, horizon } = view,
    compact = w < 700 || h < 500,
    portrait = w < 700 && h > w,
    top = h < 530 ? 48 : 110,
    room = Math.max(110, horizon - top - 20),
    unit = Math.min(w / 1000, room / 320),
    density = compact ? 0.72 : 1;
  const particles = [],
    cues = [],
    size = Math.max(0.72, Math.sqrt(unit));
  let serial = 0;
  const add = (
    x,
    y,
    born,
    life,
    vx,
    vy,
    drag,
    gravity,
    hue,
    radius,
    trail = 0,
    alpha = 1,
    kind = 0,
  ) => {
    const seed = hash(++serial * 3.71),
      color = rgb(
        hue,
        0.78 + seed * 0.18,
        kind === 4 ? 0.5 : 0.61 + seed * 0.13,
      );
    particles.push(
      x,
      y,
      born,
      life,
      vx,
      vy,
      drag,
      gravity,
      ...color,
      alpha,
      radius,
      trail,
      seed,
      kind,
    );
  };
  const crowns = [];
  // Each feather is authored as a curved rachis, paired barbs and two fine eye
  // contours. Shared endpoints keep the growing firework filigree connected.
  function featherCrown(at, cx, cy, length, spread, life, strength) {
    crowns.push({ at, x: cx, y: cy, length, spread, life });
    const barbs = compact ? 14 : 21,
      steps = compact ? 3 : 4,
      eyeSteps = compact ? 24 : 36;
    for (let rank = 0; rank < 9; rank++) {
      const angle = ((rank - 4) / 4) * spread,
        L = length * (0.9 + 0.1 * Math.cos(angle)),
        W = L * 0.19,
        bend = Math.sin(rank * 2.4) * 0.11;
      const co = Math.cos(angle),
        si = Math.sin(angle),
        dx = Math.sin(angle) * 7 * unit,
        dy = (10 + Math.abs(rank - 4) * 1.3) * unit;
      const transform = (x, y) => ({
        x: cx + x * co - y * si,
        y: cy + x * si + y * co,
      });
      const spine = (u) => ({ x: Math.sin(Math.PI * u) * L * bend, y: -L * u });
      const line = (a, b, born, hue, alpha, radius) => {
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        if (length < 0.05) return;
        const tx = (b.x - a.x) / length,
          ty = (b.y - a.y) / length;
        for (const u of [0.22, 0.72]) {
          const seed = hash(a.x * 0.03 + a.y * 0.07 + u * 27),
            speed = (7 + seed * 12) * unit,
            jitter = (seed - 0.5) * 1.4 * size;
          add(
            a.x + (b.x - a.x) * u - ty * jitter,
            a.y + (b.y - a.y) * u + tx * jitter,
            born + u * 0.035,
            life,
            tx * speed + dx,
            ty * speed + dy,
            0.62,
            7 * unit,
            hue,
            (radius + 0.22) * size,
            0.14,
            alpha * strength * 1.6,
            1,
          );
        }
      };
      const launch = transform(0, 0),
        tip = transform(spine(0.98).x, spine(0.98).y);
      add(
        launch.x,
        launch.y,
        at - 0.15,
        0.93,
        tip.x - launch.x,
        tip.y - launch.y,
        0,
        0,
        42,
        1.1 * size,
        0.14,
        0.85,
        3,
      );
      for (let k = 2; k < 25; k++) {
        const u = k / 25,
          a = spine(u),
          b = spine((k + 1) / 25);
        line(
          transform(a.x, a.y),
          transform(b.x, b.y),
          at + u * 0.68 + Math.abs(rank - 4) * 0.025,
          43,
          0.68,
          0.66,
        );
      }
      for (let row = 0; row < barbs; row++)
        for (const side of [-1, 1]) {
          const u = 0.19 + (row / (barbs - 1)) * 0.76,
            a = spine(u - 0.095),
            b = spine(u),
            width =
              W * Math.pow(Math.sin(Math.PI * u), 0.78) * (0.45 + 0.55 * u);
          const end = { x: b.x + side * width, y: b.y + L * 0.012 },
            control = { x: a.x + side * width * 0.63, y: b.y + L * 0.045 },
            born = at + u * 0.68 + Math.abs(rank - 4) * 0.025;
          let previous = transform(a.x, a.y);
          for (let k = 1; k <= steps; k++) {
            const q = k / steps,
              v = 1 - q,
              next = transform(
                v * v * a.x + 2 * v * q * control.x + q * q * end.x,
                v * v * a.y + 2 * v * q * control.y + q * q * end.y,
              );
            line(
              previous,
              next,
              born,
              32 + (row % 5) * 4,
              0.39 + 0.23 * Math.sin(u * Math.PI),
              0.45 + u * 0.11,
            );
            previous = next;
          }
          if (row % 2 === 0) {
            const p = transform(end.x, end.y);
            add(
              p.x,
              p.y,
              born + 0.16,
              life * 0.86,
              dx + side * 12 * unit,
              dy + 4 * unit,
              0.45,
              8 * unit,
              row % 3 ? 43 : 155,
              0.8 * size,
              0.09,
              0.76 * strength,
              1,
            );
          }
        }
      const eye = spine(0.77);
      const eyeWorld = transform(eye.x, eye.y);
      add(
        eyeWorld.x,
        eyeWorld.y,
        at + 0.45,
        2.3,
        dx,
        dy,
        1,
        0,
        39,
        W * 1.1,
        0,
        0.035 * strength,
        4,
      );
      for (let ring = 0; ring < 2; ring++)
        for (let k = 0; k < eyeSteps; k++) {
          const oval = (a) =>
            transform(
              eye.x + Math.cos(a) * W * (ring ? 0.18 : 0.32),
              eye.y + Math.sin(a) * L * (ring ? 0.046 : 0.077),
            );
          line(
            oval((k / eyeSteps) * TAU),
            oval(((k + 1) / eyeSteps) * TAU),
            at + 0.55 + Math.abs(rank - 4) * 0.025,
            ring ? 157 : 45,
            ring ? 0.65 : 0.82,
            ring ? 0.62 : 0.54,
          );
        }
    }
  }
  function burst(at, nx, ny, power = 1, hue = 42, willow = false) {
    const x = nx * w,
      y = top + room * ny,
      r = Math.min(w * 0.17, room * 0.36) * power;
    cues.push({ at, x, y, r, hue, willow });
    if (at > 2) {
      const flight = 1.12 + hash(at) * 0.18,
        sx = x + (nx < 0.5 ? -1 : 1) * w * 0.035;
      add(
        sx,
        horizon + 6,
        at - flight,
        flight,
        x - sx,
        y - horizon - 6,
        0,
        0,
        hue,
        1.25 * size,
        0.105,
        1,
        3,
      );
    }
    add(x, y, at, 2.1, 0, 0, 1, 0, hue, r * 0.82, 0, 0.1, 4);
    const count = Math.round((willow ? 176 : 158) * density);
    for (let i = 0; i < count; i++) {
      const seed = hash(i * 4.7 + at * 9),
        a = TAU * (i / count + (seed - 0.5) * 0.006),
        speed = r * (0.18 + seed * 1.11) * (willow ? 0.91 : 1.3);
      const band = i % 5,
        petal = 1 + 0.055 * Math.cos(a * 9),
        life = (willow ? 3.8 : 2.3) + hash(i + at) * 0.65;
      add(
        x,
        y,
        at + hash(i * 7 + at) * 0.028,
        life,
        Math.cos(a) * speed * petal,
        Math.sin(a) * speed * petal,
        willow ? 0.52 : 0.86,
        (willow ? 30 : 18) * unit,
        hue + (band === 0 ? 9 : band === 1 ? -11 : 0),
        (0.75 + seed * 0.65) * size,
        willow ? 0.32 : 0.24,
        1.05,
        0,
      );
      if (i % 7 === 0) {
        const delay = 0.45 + hash(i + at) * 0.3,
          travel =
            (1 - Math.exp(-(willow ? 0.52 : 0.86) * delay)) /
            (willow ? 0.52 : 0.86),
          px = x + Math.cos(a) * speed * petal * travel,
          py =
            y +
            Math.sin(a) * speed * petal * travel +
            0.5 * (willow ? 30 : 18) * unit * delay * delay;
        for (let j = 0; j < 4; j++) {
          const angle = (j * TAU) / 4 + seed * TAU;
          add(
            px,
            py,
            at + delay,
            0.65 + seed * 0.45,
            Math.cos(angle) * 17 * unit,
            Math.sin(angle) * 17 * unit,
            0.9,
            12 * unit,
            hue + 8,
            0.9 * size,
            0.07,
            0.85,
            1,
          );
        }
      }
    }
    // A small jade/white pistil gives the shell a center and two readable scales.
    for (let i = 0; i < Math.round(42 * density); i++) {
      const a = TAU * hash(i * 9.3 + at),
        speed = r * (0.23 + hash(i + at * 9) * 0.27);
      add(
        x,
        y,
        at + 0.055,
        1.35 + hash(i + at) * 0.75,
        Math.cos(a) * speed,
        Math.sin(a) * speed,
        0.75,
        13 * unit,
        i % 4 === 0 ? 158 : hue + 5,
        0.9 * size,
        0.045,
        0.86,
        1,
      );
    }
  }
  // The opening bloom shares the existing shell's actual point of detonation.
  burst(1.78, 0.5, (horizon * 0.65 - top) / room, 1.03, 38);
  for (const q of [
    [4.85, 0.14, 0.3, 0.83, 43],
    [5.65, 0.88, 0.36, 0.72, 155],
    [7.6, 0.16, 0.17, 0.93, 38],
    [8.3, 0.88, 0.2, 0.92, 25],
    [9.8, 0.19, 0.46, 0.78, 153],
    [10.7, 0.83, 0.34, 0.78, 46],
    [12.18, 0.12, 0.26, 1.03, 38],
    [12.48, 0.32, 0.12, 0.9, 48],
    [12.48, 0.68, 0.12, 0.9, 48],
    [12.18, 0.88, 0.26, 1.03, 38],
    [13.48, 0.23, 0.42, 0.9, 42],
    [13.48, 0.77, 0.42, 0.9, 42],
  ])
    burst(...q, q[0] > 13);
  // Low fans rise in paired volleys, leaving the central ascent corridor open.
  for (const at of [3.95, 6.6, 9.15, 11.6])
    for (const side of [-1, 1]) {
      const x = w * (side < 0 ? 0.08 : 0.92),
        y = horizon - 4,
        count = Math.round(24 * density);
      for (let i = 0; i < count; i++) {
        const angle =
            -Math.PI / 2 + (i / (count - 1) - 0.5) * 0.83 - side * 0.13,
          speed = (100 + hash(i + at) * 70) * unit;
        add(
          x,
          y,
          at + i * 0.011,
          1.6 + hash(i + at) * 0.7,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          0.26,
          55 * unit,
          38 + (i % 3) * 8,
          0.86 * size,
          0.17,
          0.68,
          0,
        );
      }
    }
  function world(point, t) {
    const p = poseAt(t, w, h, horizon),
      c = Math.cos(p.rotation),
      s = Math.sin(p.rotation);
    return {
      x: p.x + (point.x * c - point.y * s) * p.unit,
      y: p.y + (point.x * s + point.y * c) * p.unit,
    };
  }
  const emergence = world({ x: 0, y: 74 }, 3.1);
  featherCrown(
    3.12,
    emergence.x,
    emergence.y,
    Math.min(room * 0.69, w * (portrait ? 0.39 : 0.285)),
    1.12,
    2.25,
    0.86,
  );
  featherCrown(
    11.63,
    w * 0.5,
    top + room * 0.88,
    Math.min(room * (portrait ? 0.82 : 0.89), w * (portrait ? 0.57 : 0.43)),
    portrait ? 0.98 : 1.22,
    3.05,
    1.0,
  );
  // A warm, localized ignition pulse supports the coronation without washing
  // out the bird or flashing the whole screen.
  add(
    w * 0.5,
    top + room * 0.53,
    11.62,
    1.3,
    0,
    0,
    1,
    0,
    37,
    room * 0.45,
    0,
    0.12,
    4,
  );
  for (let i = 0; i < 88; i++) {
    const a = (TAU * i) / 88,
      seed = hash(i * 3.2),
      speed = (45 + seed * 100) * unit;
    add(
      w * 0.5,
      top + room * 0.68,
      11.66 + seed * 0.04,
      1.6 + seed * 0.6,
      Math.cos(a) * speed,
      Math.sin(a) * speed,
      0.85,
      12 * unit,
      38 + (i % 3) * 5,
      1.0 * size,
      0.24,
      0.85,
      0,
    );
  }
  function wing(side, t, along) {
    const [face, , , flap] = rigAt(t),
      phase = (t - 4.7) * 5.61,
      away = 0.5 * (Math.sqrt(face * face + 0.01) - side * face),
      scale = 0.62 - 0.22 * away;
    let x = -660 * along * scale,
      y = -380 * along * scale;
    const reach = clamp(Math.hypot(x, y) / 440),
      a = (0.04 + 0.33 * Math.sin(phase - 0.56 * reach - 0.1 * away)) * flap,
      c = Math.cos(a),
      s = Math.sin(a);
    return { x: (x * c - y * s) * side - side * 18, y: x * s + y * c - 3 };
  }
  for (let k = 0; k < 370; k++) {
    const t = 4.25 + k * 0.02;
    if (t > 11.55) break;
    for (const side of [-1, 1])
      for (let lane = 0; lane < (compact ? 2 : 3); lane++) {
        const along = 0.83 + lane * 0.07,
          p = world(wing(side, t, along), t),
          previous = world(wing(side, t - 0.022, along), t - 0.022);
        add(
          p.x,
          p.y,
          t,
          1.55,
          previous.x - p.x,
          previous.y - p.y,
          side * 3 * unit,
          10 * unit,
          lane === 1 ? 151 : 34 + lane * 9,
          (lane === 0 ? 0.85 : 0.55) * size,
          0,
          lane === 1 ? 0.37 : 0.63,
          5,
        );
      }
  }
  // Birth anchors are sampled from the actual flight and rig, rather than from
  // the current frame. Seeking, pausing and resizing never reset a trail.
  for (let k = 0; k < 236; k++) {
    const t = 4.15 + k * 0.037,
      seed = hash(k * 8.1);
    if (t > 12.85) break;
    for (const side of [-1, 1])
      for (let j = 0; j < (compact ? 2 : 3); j++) {
        const p = world(wing(side, t, 0.77 + hash(k + j * 7) * 0.23), t),
          a = hash(k * 3 + j + side) * TAU;
        add(
          p.x,
          p.y,
          t,
          1.05 + seed * 0.65,
          Math.cos(a) * (11 + seed * 14) * unit,
          Math.sin(a) * 12 * unit + 10 * unit,
          0.45,
          12 * unit,
          j === 0 ? 151 : 37 + j * 7,
          (0.75 + seed * 0.7) * size,
          0.13,
          0.85,
          1,
        );
        if (j === 1 && k % 3 === 0)
          add(
            p.x,
            p.y,
            t,
            0.68 + seed * 0.22,
            side * 8 * unit,
            -(26 + seed * 20) * unit,
            0.65,
            -3 * unit,
            27 + seed * 17,
            (2.2 + seed * 1.3) * size,
            0.15,
            0.2,
            6,
          );
      }
    const i = (k % 5) - 2,
      p = world(tailAt(i, 0.82 + seed * 0.16, t), t);
    for (let j = 0; j < 2; j++)
      add(
        p.x,
        p.y,
        t,
        1.35 + seed * 0.65,
        (hash(k + j) - 0.5) * 30 * unit,
        (8 + seed * 22) * unit,
        0.65,
        14 * unit,
        j ? 42 : 23,
        0.7 * size,
        0.095,
        0.75,
        0,
      );
    if (k % 4 === 0)
      add(
        p.x,
        p.y,
        t,
        0.8,
        0,
        -23 * unit,
        0.6,
        -2 * unit,
        31,
        2.3 * size,
        0.14,
        0.15,
        6,
      );
  }
  // A coronation of nine gold sprays, timed to the symmetric launch.
  for (let i = 0; i < 9; i++) {
    const x = w * (0.12 + i * 0.095),
      at = 11.75 + Math.abs(i - 4) * 0.035;
    for (let j = 0; j < Math.round(24 * density); j++) {
      const a = -Math.PI / 2 + (hash(i * 43 + j) - 0.5) * 0.2,
        speed = (145 + hash(j * 7 + i) * 100) * unit;
      add(
        x,
        horizon - 3,
        at + j * 0.015,
        2.2 + hash(i + j) * 0.7,
        Math.cos(a) * speed,
        Math.sin(a) * speed,
        0.29,
        45 * unit,
        37 + (j % 4) * 5,
        0.88 * size,
        0.19,
        0.85,
        0,
      );
    }
  }
  // The final particulate afterglow follows the detached painted plumes.
  for (let i = 0; i < 24; i++) {
    const born = 11.85 + i * 0.095,
      anchor = world(
        tailAt((i % 5) - 2, 0.72 + hash(i * 4.2) * 0.23, born),
        born,
      ),
      plumeScale = Math.min(w / 800, h / 650, 1);
    for (let j = 0; j < Math.round(14 * density); j++) {
      const at = born + 0.3 + j * 0.2,
        age = at - born,
        x =
          anchor.x +
          (Math.sin(age * 0.7 + i * 1.3) * 14 +
            Math.sin(i * 3.1) * age * 3 +
            Math.sin(i * 2.39996) * age * age * 2.8) *
            plumeScale,
        y = anchor.y + (age * 13 + age * age * 0.9) * plumeScale;
      add(
        x,
        y,
        at,
        1.6 + hash(i + j) * 1.1,
        (hash(j * 7 + i) - 0.5) * 23 * unit,
        9 * unit,
        0.8,
        7 * unit,
        j % 5 ? 43 : 155,
        0.65 * size,
        0.06,
        0.55,
        1,
      );
    }
  }
  return {
    data: new Float32Array(particles),
    cues,
    crowns,
    count: particles.length / 16,
    compact,
  };
}

const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 aOrigin;layout(location=2) in vec4 aMotion;layout(location=3) in vec4 aColor;layout(location=4) in vec4 aStyle;
uniform vec2 uViewport;uniform float uTime;
out vec2 vUV;out vec4 vColor;out vec4 vStyle;out vec2 vScreen;
void main(){
 float age=uTime-aOrigin.z,life=aOrigin.w;vUV=aCorner;vColor=vec4(0.);vStyle=aStyle;vScreen=vec2(0.);
 if(age<0.||age>life){gl_Position=vec4(3.,3.,0.,1.);return;}
 float u=age/life,drag=max(.001,aMotion.z),d=(1.-exp(-drag*age))/drag;
 vec2 p=aOrigin.xy+aMotion.xy*d+vec2(0.,.5*aMotion.w*age*age),velocity=aMotion.xy*exp(-drag*age)+vec2(0.,aMotion.w*age);
 float fade=smoothstep(0.,.045,age)*pow(max(0.,1.-u),.62);
 if(aStyle.w==3.){float e=1.-pow(1.-u,1.12);p=aOrigin.xy+aMotion.xy*e;velocity=aMotion.xy/life*1.12*pow(max(.001,1.-u),.12);fade=smoothstep(0.,.08,age)*(1.-smoothstep(.93,1.,u));}
 vec2 direction=normalize(velocity+vec2(.0001,0.)),normal=vec2(-direction.y,direction.x);
 float radius=aStyle.x,reach=max(radius*3.8,length(velocity)*aStyle.y);
 if(aStyle.w==6.)reach=max(radius*9.,reach);
 if(aStyle.w==5.){p=aOrigin.xy+aMotion.xy*.5+aMotion.zw*age;direction=normalize(aMotion.xy+vec2(.0001));normal=vec2(-direction.y,direction.x);reach=length(aMotion.xy)*1.12;fade=smoothstep(0.,.045,age)*pow(1.-u,.8);}
 vec2 offset=direction*(aCorner.x-.55)*reach*.5+normal*aCorner.y*radius*3.;
 if(aStyle.w==5.)offset=direction*aCorner.x*reach*.5+normal*aCorner.y*radius*3.;
 if(aStyle.w==4.){offset=aCorner*radius;fade=exp(-age*1.65)*smoothstep(0.,.045,age)*(1.-smoothstep(.75,1.,u));}
 vScreen=p+offset;gl_Position=vec4(vScreen/uViewport*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);
 vColor=vec4(aColor.rgb,aColor.a*fade);vStyle=vec4(radius,reach,aStyle.z,aStyle.w);
}`;
const fragment = `#version 300 es
precision highp float;
in vec2 vUV;in vec4 vColor;in vec4 vStyle;in vec2 vScreen;
uniform vec4 uPhoenix;uniform vec2 uClip;uniform float uTime;
out vec4 color;
void main(){
 if(vColor.a<.002)discard;
 float x=(vUV.x-.55)*vStyle.y/max(1.,vStyle.x*3.),y=vUV.y*3.;
 float core=exp(-2.8*(x*x+y*y)),halo=exp(-.7*(x*x+y*y))*.20;
 float tail=exp(-vUV.y*vUV.y*18.)*smoothstep(-1.,-.65,vUV.x)*(1.-smoothstep(.38,.72,vUV.x))*.72;
 float spark=core*1.4+halo+tail;
 if(vStyle.w==1.){float cross=exp(-abs(x)*13.-abs(y)*2.8)+exp(-abs(x)*2.8-abs(y)*13.);spark=max(spark,cross*.55);spark*=.68+.32*pow(sin(uTime*8.+vStyle.z*60.),2.);}
 if(vStyle.w==4.)spark=exp(-dot(vUV,vUV)*4.)*(1.-smoothstep(.65,1.,length(vUV)));
 if(vStyle.w==5.)spark=exp(-vUV.y*vUV.y*10.)*(1.-smoothstep(.80,1.,abs(vUV.x)));
 if(vStyle.w==6.){
  float along=(vUV.x+1.)*.5,flutter=sin(along*8.-uTime*5.+vStyle.z*19.)*.12*(1.-along);
  float width=.10+.34*pow(max(0.,sin(along*3.14159265)),.8),edge=abs(vUV.y+flutter)/width;
  spark=exp(-edge*edge*3.)*smoothstep(0.,.14,along)*(1.-smoothstep(.52,1.,along));
 }
 float guard=smoothstep(uClip.x,uClip.x+25.,vScreen.y)*(1.-smoothstep(uClip.y,uClip.y+45.,vScreen.y));
 vec2 d=(vScreen-uPhoenix.xy)/max(vec2(1.),uPhoenix.zw);
 guard*=mix(.19,1.,smoothstep(.42,1.05,length(d)));
 float gather=smoothstep(10.55,10.95,uTime)*(1.-smoothstep(11.35,11.75,uTime));
 float a=clamp(spark*vColor.a*guard*(1.-.43*gather),0.,1.);if(a<.002)discard;
 vec3 hot=mix(vColor.rgb,vec3(1.,.96,.83),core*.62);
 color=vec4(hot*a,a);
}`;
function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw Error(gl.getShaderInfoLog(shader));
  return shader;
}
export function createPhoenixEffects(poseAt, tailAt, rigAt) {
  const canvas = document.createElement("canvas"),
    gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
    });
  if (!gl) throw Error("Phoenix effects require WebGL2");
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw Error(gl.getProgramInfoLog(program));
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
  const instances = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instances);
  for (let i = 1; i <= 4; i++) {
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 64, (i - 1) * 16);
    gl.vertexAttribDivisor(i, 1);
  }
  const uniform = Object.fromEntries(
    ["Viewport", "Time", "Phoenix", "Clip"].map((n) => [
      n,
      gl.getUniformLocation(program, "u" + n),
    ]),
  );
  let score = null,
    key = "",
    lost = false;
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
  });
  return {
    get stats() {
      return {
        particles: score?.count || 0,
        drawCalls: 1,
        compact: score?.compact || false,
      };
    },
    render(t, view, pose) {
      if (lost) return null;
      const next = [view.width, view.height, view.horizon].join(",");
      if (next !== key) {
        key = next;
        score = buildPhoenixScore(view, poseAt, tailAt, rigAt);
        gl.bindBuffer(gl.ARRAY_BUFFER, instances);
        gl.bufferData(gl.ARRAY_BUFFER, score.data, gl.STATIC_DRAW);
      }
      const ratio = Math.min(score.compact ? 1.5 : 2, view.ratio),
        width = Math.round(view.width * ratio),
        height = Math.round(view.height * ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform2f(uniform.Viewport, view.width, view.height);
      gl.uniform1f(uniform.Time, t);
      gl.uniform4f(
        uniform.Phoenix,
        pose.x,
        pose.y - 28 * pose.unit,
        130 * pose.unit,
        175 * pose.unit,
      );
      gl.uniform2f(uniform.Clip, view.height < 530 ? 42 : 96, view.horizon + 6);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, score.count);
      return canvas;
    },
  };
}
