import * as THREE from "../../../vendor/three/build/three.module.js";

const TAU = Math.PI * 2;
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const mix = (a, b, t) => a + (b - a) * t;

// All births are fixed in world space. Camera motion reveals their depth;
// replay, paused frames and viewport rebuilds never integrate a second clock.
export function buildPhoenixFireworks(
  sampleCamera,
  aspect = 16 / 9,
  compact = false,
) {
  const records = new Float32Array(45000 * 18),
    cues = [],
    color = new THREE.Color();
  let serial = 0;
  const density = compact ? 0.67 : 1;
  function add(
    p,
    v,
    born,
    life,
    hue,
    radius = 0.025,
    alpha = 0.8,
    drag = 0.65,
    gravity = 0.65,
    kind = 0,
    lag = 0,
  ) {
    const seed = hash(++serial * 2.39);
    color.setHSL((((hue % 360) + 360) % 360) / 360, 0.82, 0.64);
    if (serial > 45000)
      throw Error("Phoenix firework score exceeds its particle budget");
    let o = (serial - 1) * 18;
    records[o++] = p.x;
    records[o++] = p.y;
    records[o++] = p.z;
    records[o++] = v.x;
    records[o++] = v.y;
    records[o++] = v.z;
    records[o++] = born;
    records[o++] = life;
    records[o++] = drag;
    records[o++] = gravity;
    records[o++] = radius;
    records[o++] = lag;
    records[o++] = alpha;
    records[o++] = kind;
    records[o++] = color.r;
    records[o++] = color.g;
    records[o++] = color.b;
    records[o] = seed;
  }
  function frame(t, nx, ny, depth = 10) {
    const camera = sampleCamera(t),
      distance = camera.position.distanceTo(camera.target) + depth;
    const forward = camera.target.clone().sub(camera.position).normalize();
    const right = forward
        .clone()
        .cross(new THREE.Vector3(0, 1, 0))
        .normalize(),
      up = right.clone().cross(forward);
    const height =
        (distance * Math.tan(THREE.MathUtils.degToRad(35 / 2))) /
        (camera.zoom ?? 1),
      width = height * aspect;
    const point = camera.position
      .clone()
      .addScaledVector(forward, distance)
      .addScaledVector(right, nx * width)
      .addScaledVector(up, ny * height);
    return {
      point,
      right,
      up,
      forward,
      unit: Math.min(width * 0.36, height * 0.4),
      width,
      height,
    };
  }
  function vector(f, x, y, z = 0) {
    return f.right
      .clone()
      .multiplyScalar(x)
      .addScaledVector(f.up, y)
      .addScaledVector(f.forward, z);
  }
  function shell(at, nx, ny, power = 1, hue = 43, willow = false, depth = 12) {
    const f = frame(at, nx, ny, depth),
      radius = f.unit * power;
    cues.push({
      at,
      family: willow ? "gold-willow" : "chrysanthemum",
      depth,
      position: f.point.toArray(),
    });
    const count = Math.round((willow ? 178 : 146) * density),
      life = willow ? 3.8 : 2.65;
    for (let i = 0; i < count; i++) {
      const seed = hash(i * 4.7 + at * 9),
        z = 1 - (2 * (i + 0.5)) / count,
        a = i * 2.39996323,
        r = Math.sqrt(1 - z * z);
      const speed = radius * (0.42 + seed * 0.64) * (willow ? 0.76 : 1.08);
      const v = vector(
        f,
        Math.cos(a) * r * speed,
        Math.sin(a) * r * speed,
        z * speed * 0.85,
      );
      // Hot peony tips, then fine fading, gravity-bent gold willow strands.
      for (let trail = 0; trail < (willow ? 7 : 5); trail++)
        add(
          f.point,
          v,
          at,
          life + seed * 0.55,
          hue + (i % 7 === 0 ? 16 : 0),
          radius * (trail ? 0.0042 : 0.0064),
          trail ? 0.38 : 0.93,
          willow ? 0.4 : 0.67,
          willow ? radius * 0.23 : radius * 0.14,
          trail === 0 && i % 9 === 0 ? 1 : 0,
          trail * 0.061,
        );
      if (i % 5 === 0) {
        const p = f.point.clone().addScaledVector(v, 0.35);
        add(
          p,
          v.clone().multiplyScalar(0.48),
          at + 0.62,
          1.35,
          seed > 0.78 ? 156 : hue + 8,
          radius * 0.0055,
          0.78,
          0.85,
          radius * 0.16,
          1,
        );
      }
    }
    // Two small jade/white pistils provide a different spatial scale and hue.
    for (let i = 0; i < Math.round(48 * density); i++) {
      const a = TAU * hash(i * 9.3 + at),
        z = hash(i + at) * 2 - 1,
        s = radius * (0.15 + hash(i + 71) * 0.16);
      add(
        f.point,
        vector(f, Math.cos(a) * s, Math.sin(a) * s, z * s),
        at + 0.075,
        2.0,
        i % 3 ? 154 : 48,
        radius * 0.007,
        0.85,
        0.8,
        radius * 0.13,
        1,
      );
    }
    // A coherent rising shell and a restrained local ignition, no screen flash.
    const flight = 1.18,
      start = f.point
        .clone()
        .addScaledVector(f.up, -f.height * 1.1)
        .addScaledVector(f.right, nx * 0.6);
    const velocity = f.point.clone().sub(start).divideScalar(flight);
    for (let j = 0; j < 20; j++)
      add(
        start.clone().addScaledVector(velocity, (j * flight) / 20),
        new THREE.Vector3(0, 0.13, 0),
        at - flight + (j * flight) / 20,
        0.6,
        hue,
        radius * 0.009,
        0.65,
        0.5,
        0.2,
        1,
      );
    add(
      f.point,
      new THREE.Vector3(),
      at,
      0.45,
      hue,
      radius * 0.36,
      0.045,
      1,
      0,
      3,
    );
  }
  // Birth, lateral dance, mirrored return. The central character stays readable.
  for (const q of [
    [2.93, -0.58, 0.12, 0.9, 38, false, 13],
    [3.18, 0.62, 0.34, 0.83, 45, false, 18],
    [5.25, -0.72, 0.43, 0.92, 43, true, 15],
    [6.1, 0.75, 0.19, 0.83, 155, false, 11],
    [7.75, -0.66, 0.57, 1.03, 40, false, 18],
    [8.5, 0.73, 0.46, 1.0, 29, true, 13],
    [9.8, -0.76, 0.06, 0.83, 155, false, 10],
    [10.7, 0.71, 0.4, 0.93, 46, false, 17],
    [12.1, -0.69, 0.47, 1.03, 40, true, 16],
    [12.7, 0.73, 0.15, 0.9, 44, false, 12],
    [14.1, -0.74, 0.39, 0.82, 43, false, 18],
    [14.4, 0.75, 0.4, 0.82, 154, false, 18],
  ])
    shell(...q);

  function fans(at, count = 7, strength = 1, depth = 7) {
    for (const side of [-1, 1]) {
      const f = frame(at, side * 0.88, -0.9, depth),
        lanes = count;
      cues.push({
        at,
        family: "paired-comet-fan",
        depth,
        position: f.point.toArray(),
      });
      for (let lane = 0; lane < lanes; lane++) {
        const angle = mix(-0.42, 0.42, lane / (lanes - 1)) - side * 0.2;
        for (let k = 0; k < Math.round(22 * density); k++) {
          const speed =
            f.height * (0.87 + hash(k * 11 + lane) * 0.3) * strength;
          const v = vector(
            f,
            Math.sin(angle) * speed,
            Math.cos(angle) * speed,
            (hash(k + lane) - 0.5) * speed * 0.28,
          );
          for (let trail = 0; trail < 3; trail++)
            add(
              f.point,
              v,
              at + k * 0.013 + lane * 0.028,
              2.0 + hash(k) * 0.5,
              37 + (lane % 3) * 8,
              f.unit * 0.0053,
              trail ? 0.3 : 0.83,
              0.58,
              f.height * 0.46,
              0,
              trail * 0.06,
            );
        }
      }
    }
  }
  for (const at of [4.25, 7.0, 10.3, 13.3]) fans(at, 5, 0.8, 7);

  // Nine curved gold feathers with jade eyes form a three-dimensional crown.
  // Shared barbs/shaft endpoints preserve the 2D show's filigree vocabulary.
  function crown(at) {
    const f = frame(at, 0, -0.12, 13),
      length = Math.min(f.height * 1.24, f.width * 1.16),
      barbs = compact ? 12 : 19;
    cues.push({
      at,
      family: "nine-feather-coronation",
      depth: 13,
      position: f.point.toArray(),
    });
    for (let rank = 0; rank < 9; rank++) {
      const angle = (rank - 4) * 0.2,
        L = length * (0.89 + 0.11 * Math.cos(angle)),
        W = L * 0.13;
      const depth = (rank - 4) ** 2 * -0.1;
      const point = (x, y) =>
        f.point
          .clone()
          .add(
            vector(
              f,
              x * Math.cos(angle) + y * Math.sin(angle),
              y * Math.cos(angle) - x * Math.sin(angle),
              depth + Math.sin((y / L) * Math.PI) * 0.65,
            ),
          );
      const spine = (u) => [
        Math.sin(u * Math.PI) * L * 0.055 * Math.sin(rank * 2.4),
        L * u,
      ];
      function line(a, b, born, hue = 43, alpha = 0.77) {
        for (const u of [0.15, 0.45, 0.75]) {
          const p = a.clone().lerp(b, u),
            v = vector(
              f,
              (rank - 4) * 0.015,
              0.04,
              (hash(rank + u) - 0.5) * 0.06,
            );
          add(
            p,
            v,
            born + u * 0.035,
            3.5,
            hue,
            L * 0.0032,
            alpha,
            0.65,
            L * 0.035,
            1,
          );
        }
      }
      for (let k = 0; k < 28; k++) {
        const a = spine(k / 28),
          b = spine((k + 1) / 28);
        line(
          point(...a),
          point(...b),
          at + (k / 28) * 0.58 + Math.abs(rank - 4) * 0.018,
        );
      }
      for (let row = 0; row < barbs; row++)
        for (const side of [-1, 1]) {
          const u = 0.18 + (row / (barbs - 1)) * 0.77,
            a = spine(u - 0.1),
            b = spine(u),
            width = W * Math.sin(u * Math.PI) ** 0.76;
          const end = [b[0] + side * width, b[1] - 0.012 * L],
            control = [a[0] + side * width * 0.65, b[1] - 0.05 * L];
          let prev = point(...a);
          for (let k = 1; k <= 4; k++) {
            const t = k / 4,
              v = 1 - t,
              next = point(
                v * v * a[0] + 2 * v * t * control[0] + t * t * end[0],
                v * v * a[1] + 2 * v * t * control[1] + t * t * end[1],
              );
            line(
              prev,
              next,
              at + u * 0.58 + Math.abs(rank - 4) * 0.018,
              34 + (row % 4) * 5,
              0.54,
            );
            prev = next;
          }
        }
      const eye = spine(0.78),
        n = compact ? 22 : 32;
      for (let ring = 0; ring < 2; ring++)
        for (let k = 0; k < n; k++) {
          const p = (a) =>
            point(
              eye[0] + Math.cos(a) * W * (ring ? 0.26 : 0.47),
              eye[1] + Math.sin(a) * L * (ring ? 0.035 : 0.06),
            );
          line(
            p((k / n) * TAU),
            p(((k + 1) / n) * TAU),
            at + 0.47 + Math.abs(rank - 4) * 0.018,
            ring ? 156 : 47,
            0.9,
          );
        }
    }
  }
  crown(18.72);
  for (const q of [
    [18.93, -0.77, 0.28, 1.28, 42, true, 19],
    [19.11, 0.77, 0.28, 1.28, 42, true, 19],
    [19.68, -0.45, 0.68, 0.85, 155, false, 23],
    [19.86, 0.45, 0.68, 0.85, 155, false, 23],
    [21.0, -0.79, 0.12, 1.15, 39, true, 13],
    [21.18, 0.79, 0.12, 1.15, 44, true, 13],
    [22.35, -0.67, 0.49, 1.18, 42, true, 18],
    [22.55, 0.67, 0.49, 1.18, 155, false, 18],
    [23.55, -0.36, 0.56, 0.93, 45, true, 22],
    [23.72, 0.36, 0.56, 0.93, 45, true, 22],
  ])
    shell(...q);
  fans(18.86, 9, 1.1, 8);
  fans(21.22, 7, 1.14, 5);

  // Sparse warm foreground comets pass beside the lens, not across the face.
  for (let i = 0; i < (compact ? 46 : 76); i++) {
    const at = 20.85 + hash(i * 3.7) * 3.65,
      side = i % 2 ? 1 : -1,
      f = frame(at, side * (0.66 + hash(i) * 0.35), -0.5 + hash(i + 9), -5);
    const v = vector(
      f,
      side * (0.1 + hash(i) * 0.45),
      -1.2 - hash(i + 40) * 2.2,
      -0.4,
    );
    for (let lag = 0; lag < 6; lag++)
      add(
        f.point,
        v,
        at,
        1.6 + hash(i + 20),
        i % 6 ? 43 : 156,
        0.025 + hash(i + 8) * 0.025,
        lag ? 0.22 : 0.65,
        0.32,
        0.3,
        1,
        lag * 0.058,
      );
  }
  return {
    data: records.subarray(0, serial * 18),
    count: serial,
    cues,
    compact,
  };
}

const vertex = `attribute vec3 origin,velocity;attribute vec4 timing,style,shade;
uniform float time;varying vec2 vUV;varying vec4 vColor;varying float vKind;
void main(){
 float age=time-timing.x,life=timing.y;vUV=uv;vColor=vec4(0.);vKind=style.w;
 if(age<style.y||age>life){gl_Position=vec4(3.,3.,0.,1.);return;}
 float a=age-style.y,drag=max(.001,timing.z),d=(1.-exp(-drag*a))/drag;
 vec3 p=origin+velocity*d+vec3(0.,-.5*timing.w*a*a,0.);
 vec3 speed=velocity*exp(-drag*a)+vec3(0.,-timing.w*a,0.);
 vec4 mv=viewMatrix*vec4(p,1.);vec2 direction=(mat3(viewMatrix)*speed).xy;
 direction=normalize(direction+vec2(.0001));vec2 normal=vec2(-direction.y,direction.x);
 float radius=style.x,width=max(radius,-mv.z*.00042);
 float reach=max(width*3.,length(speed)*.045);
 vec2 offset=direction*(position.x-.35)*reach+normal*position.y*width*2.6;
 if(style.w==3.)offset=position.xy*radius;
 mv.xy+=offset;gl_Position=projectionMatrix*mv;
 float fade=smoothstep(0.,.035,a)*pow(max(0.,1.-age/life),.72);
 float quiet=1.-.72*smoothstep(15.9,16.7,time)*(1.-smoothstep(18.1,18.75,time));
 float outro=1.-smoothstep(25.3,27.,time);
 vColor=vec4(shade.rgb,style.z*fade*quiet*outro);
}`;
const fragment = `precision highp float;varying vec2 vUV;varying vec4 vColor;varying float vKind;
uniform vec2 resolution,hero;uniform float time;
void main(){
 if(vColor.a<.002)discard;
 vec2 p=(vUV-.5)*2.;float core=exp(-dot(p,p)*9.);
 float halo=exp(-dot(p,p)*2.8)*.18;
 float trail=exp(-p.y*p.y*16.)*(1.-smoothstep(.2,.95,abs(p.x)))*.72;
 float spark=core*1.7+halo+trail;
 if(vKind==1.)spark+=.24*(exp(-abs(p.x)*32.-abs(p.y)*3.)+exp(-abs(p.y)*32.-abs(p.x)*3.));
 if(vKind==3.)spark=exp(-dot(p,p)*4.)*.38;
 vec2 screen=gl_FragCoord.xy/resolution;
 vec2 delta=(screen-hero)/vec2(.115,.18);
 float guard=mix(.24,1.,smoothstep(.45,1.1,length(delta)));
 float a=min(.98,spark*vColor.a*guard);if(a<.002)discard;
 vec3 hot=mix(vColor.rgb,vec3(1.,.94,.74),core*.55);
 gl_FragColor=vec4(hot,a);
}`;

export function createPhoenixFireworks(scene, sampleCamera) {
  const geometry = new THREE.InstancedBufferGeometry(),
    plane = new THREE.PlaneGeometry(2, 2);
  geometry.index = plane.index;
  geometry.setAttribute("position", plane.attributes.position);
  geometry.setAttribute("uv", plane.attributes.uv);
  const uniforms = {
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(1280, 720) },
    hero: { value: new THREE.Vector2(0.5, 0.5) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "Phoenix world-space pyrotechnic score";
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  scene.add(mesh);
  let score = null,
    profile = "";
  const projected = new THREE.Vector3();
  return {
    update(t, camera, width, height, ratio, root) {
      const next = [
        width,
        height,
        width < 700 || height < 500,
        camera.zoom,
      ].join(":");
      if (next !== profile) {
        // Release the previous profile's GPU buffer/VAO before replacing attributes.
        if (score) geometry.dispose();
        profile = next;
        score = buildPhoenixFireworks(
          sampleCamera,
          width / height,
          width < 700 || height < 500,
        );
        const buffer = new THREE.InstancedInterleavedBuffer(score.data, 18);
        for (const [name, size, offset] of [
          ["origin", 3, 0],
          ["velocity", 3, 3],
          ["timing", 4, 6],
          ["style", 4, 10],
          ["shade", 4, 14],
        ])
          geometry.setAttribute(
            name,
            new THREE.InterleavedBufferAttribute(buffer, size, offset),
          );
        geometry.instanceCount = score.count;
      }
      uniforms.time.value = t;
      uniforms.resolution.value.set(
        Math.round(width * ratio),
        Math.round(height * ratio),
      );
      projected.copy(root).project(camera);
      uniforms.hero.value.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5);
      mesh.visible = t > 1.7 && t < 27;
    },
    get stats() {
      return {
        revision: 1,
        particles: score?.count ?? 0,
        drawCalls: 1,
        cues: score?.cues.length ?? 0,
        depthLayers: 3,
        worldSpace: true,
        compact: score?.compact ?? false,
      };
    },
  };
}
