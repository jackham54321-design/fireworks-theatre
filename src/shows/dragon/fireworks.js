import * as THREE from "../../../vendor/three/build/three.module.js";
const TAU = Math.PI * 2,
  hash = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

// The camera selects birth positions only. All subsequent trajectories remain in
// world space, so the dragon can pass in front and the orbit reveals parallax.
export function buildDragonFireworks(sampleCamera, aspect, compact) {
  const data = [],
    cues = [],
    color = new THREE.Color(),
    density = compact ? 0.62 : 1;
  let serial = 0;
  function add(
    p,
    v,
    at,
    life,
    hue,
    radius = 0.025,
    alpha = 0.8,
    drag = 0.65,
    gravity = 0.65,
    lag = 0,
  ) {
    color.setHSL(hue / 360, 0.91, 0.44);
    data.push(
      ...p.toArray(),
      ...v.toArray(),
      at,
      life,
      drag,
      gravity,
      radius,
      lag,
      alpha,
      hash(++serial),
      color.r,
      color.g,
      color.b,
    );
  }
  function frame(t, nx, ny, depth) {
    const shot = sampleCamera(t, aspect),
      eye = new THREE.Vector3(...shot.position),
      target = new THREE.Vector3(...shot.target),
      forward = target.sub(eye).normalize(),
      right = forward
        .clone()
        .cross(new THREE.Vector3(0, 1, 0))
        .normalize(),
      up = right.clone().cross(forward);
    const distance = new THREE.Vector3(...shot.target).distanceTo(eye) + depth,
      height = distance * Math.tan((shot.fov * Math.PI) / 360),
      width = height * aspect;
    return {
      point: eye
        .addScaledVector(forward, distance)
        .addScaledVector(right, nx * width)
        .addScaledVector(up, ny * height),
      forward,
      right,
      up,
      height,
      unit: Math.min(width * 0.38, height * 0.48),
    };
  }
  const vector = (f, x, y, z = 0) =>
    f.right
      .clone()
      .multiplyScalar(x)
      .addScaledVector(f.up, y)
      .addScaledVector(f.forward, z);
  function shell(at, x, y, power = 1, depth = 16, willow = false, hue = 41) {
    const f = frame(at, x, y, depth),
      radius = f.unit * power,
      count = Math.round((willow ? 180 : 150) * density);
    cues.push({
      at,
      family: willow ? "golden-willow" : "ice-gold-peony",
      depth,
      position: f.point.toArray(),
    });
    for (let i = 0; i < count; i++) {
      const seed = hash(i + at * 91),
        z = 1 - (2 * (i + 0.5)) / count,
        a = i * 2.399963,
        r = Math.sqrt(1 - z * z),
        speed = radius * (0.45 + seed * 0.58) * (willow ? 0.82 : 1.13),
        v = vector(
          f,
          Math.cos(a) * r * speed,
          Math.sin(a) * r * speed,
          z * speed * 0.84,
        ),
        life = willow ? 3.7 : 2.45;
      for (let tail = 0; tail < (willow ? 7 : 5); tail++)
        add(
          f.point,
          v,
          at,
          life + seed * 0.45,
          i % 9 === 0 ? 205 : hue,
          radius * (tail ? 0.0032 : 0.0051),
          tail ? 0.27 : 0.92,
          willow ? 0.34 : 0.62,
          radius * (willow ? 0.23 : 0.12),
          tail * 0.062,
        );
      if (i % 6 === 0)
        add(
          f.point.clone().addScaledVector(v, 0.48),
          v.clone().multiplyScalar(0.35),
          at + 0.72,
          1.5,
          hue + 5,
          radius * 0.004,
          0.72,
          0.7,
          radius * 0.18,
        );
    }
    for (let i = 0; i < 40 * density; i++) {
      const a = i * 2.3999,
        s = radius * (0.13 + hash(i) * 0.13);
      add(
        f.point,
        vector(f, Math.cos(a) * s, Math.sin(a) * s, (hash(i + 9) - 0.5) * s),
        at + 0.06,
        1.65,
        203,
        radius * 0.0055,
        0.8,
        0.8,
        radius * 0.12,
      );
    }
    const start = f.point.clone().addScaledVector(f.up, -f.height * 1.4),
      flight = 1.15,
      velocity = f.point.clone().sub(start).divideScalar(flight);
    for (let j = 0; j < 36; j++)
      add(
        start.clone().addScaledVector(velocity, (j * flight) / 36),
        vector(f, 0, 0.16),
        at - flight + (j * flight) / 36,
        0.6,
        hue,
        radius * 0.006,
        0.7,
        0.6,
        0.28,
      );
  }
  function fan(at, lanes, power, depth = 9) {
    for (const side of [-1, 1]) {
      const f = frame(at, side * 0.91, -0.94, depth);
      cues.push({ at, family: "ascending-gold-fan", depth });
      for (let lane = 0; lane < lanes; lane++)
        for (let i = 0; i < Math.round(19 * density); i++) {
          const a = (lane / (lanes - 1) - 0.5) * 0.74 - side * 0.18,
            s = f.height * (0.85 + hash(i + lane * 31) * 0.25) * power,
            v = vector(
              f,
              Math.sin(a) * s,
              Math.cos(a) * s,
              (hash(i + 33) - 0.5) * s * 0.25,
            );
          for (let tail = 0; tail < 4; tail++)
            add(
              f.point,
              v,
              at + lane * 0.025 + i * 0.012,
              2.0 + hash(i) * 0.45,
              37 + (lane % 3) * 6,
              f.unit * 0.0042,
              tail ? 0.22 : 0.88,
              0.6,
              f.height * 0.43,
              tail * 0.065,
            );
        }
    }
  }
  // Withheld opening, gold ascent, then negative space for the roar and thunder.
  shell(3.65, -0.75, 0.21, 0.72, 24, false);
  shell(4.25, 0.78, 0.34, 0.68, 27, false, 45);
  fan(4.6, 5, 0.73, 15);
  shell(5.65, -0.78, 0.4, 0.82, 25, true);
  shell(6.05, 0.8, 0.35, 0.72, 27, false, 204);
  shell(12.75, -0.77, 0.37, 0.83, 22, true);
  shell(13.15, 0.76, 0.28, 0.83, 26, true);
  fan(13.8, 5, 0.82, 12);
  // Three depth planes frame the final approach; the face keeps a clear centre.
  shell(15.5, -0.76, 0.35, 1.13, 24, true);
  shell(15.66, 0.76, 0.38, 1.13, 26, true);
  shell(16.3, -0.4, 0.77, 0.78, 32, false, 202);
  shell(16.46, 0.4, 0.77, 0.78, 32, false, 44);
  fan(16.15, 9, 1.1, 14);
  shell(17.3, -0.83, 0.15, 1.24, 18, true);
  shell(17.48, 0.83, 0.17, 1.24, 21, true);
  shell(18.1, -0.61, 0.63, 0.97, 29, true);
  shell(18.24, 0.61, 0.63, 0.97, 31, true);
  for (let i = 0; i < (compact ? 52 : 88); i++) {
    const at = 16.7 + hash(i + 101) * 2.2,
      side = i % 2 ? 1 : -1,
      f = frame(
        at,
        side * (0.7 + hash(i) * 0.31),
        -0.6 + hash(i + 9) * 1.25,
        -4,
      ),
      v = vector(f, side * 0.5, -1.1 - hash(i + 12) * 2.1, -1.4);
    for (let tail = 0; tail < 5; tail++)
      add(
        f.point,
        v,
        at,
        1.65 + hash(i + 20),
        i % 8 ? 42 : 205,
        0.024 + hash(i) * 0.018,
        tail ? 0.2 : 0.63,
        0.3,
        0.4,
        tail * 0.062,
      );
  }
  if (serial > 30000)
    throw Error("Dragon pyrotechnic particle budget exceeded");
  return { data: new Float32Array(data), count: serial, cues, compact };
}
const vertex = `attribute vec3 origin,velocity,shade;attribute vec4 timing,style;uniform float time;varying vec2 vUv;varying vec4 glow;
void main(){vUv=uv;glow=vec4(0.);float age=time-timing.x,a=age-style.y;if(a<0.||age>timing.y){gl_Position=vec4(3.,3.,0.,1.);return;}float drag=max(.001,timing.z),travel=(1.-exp(-drag*a))/drag;vec3 p=origin+velocity*travel+vec3(0.,-.5*timing.w*a*a,0.);vec3 speed=velocity*exp(-drag*a)+vec3(0.,-timing.w*a,0.);vec4 mv=viewMatrix*vec4(p,1.);vec2 direction=normalize((mat3(viewMatrix)*speed).xy+vec2(.0001)),normal=vec2(-direction.y,direction.x);float radius=max(style.x,-mv.z*.00033),reach=max(radius*3.,length(speed)*.036);mv.xy+=direction*(position.x-.35)*reach+normal*position.y*radius*2.5;gl_Position=projectionMatrix*mv;float fade=smoothstep(0.,.035,a)*pow(max(0.,1.-age/timing.y),.78);float quiet=1.-.94*smoothstep(7.1,7.9,time)*(1.-smoothstep(12.,12.6,time));float outro=1.-smoothstep(20.2,21.6,time);glow=vec4(shade*2.35,style.z*fade*quiet*outro);}`;
const fragment = `precision highp float;varying vec2 vUv;varying vec4 glow;uniform vec2 resolution,hero;void main(){if(glow.a<.002)discard;vec2 p=(vUv-.5)*2.;float core=exp(-dot(p,p)*10.),trail=exp(-p.y*p.y*18.)*(1.-smoothstep(.2,.95,abs(p.x)))*.65;float spark=core*1.5+trail+exp(-dot(p,p)*3.)*.10;vec2 delta=(gl_FragCoord.xy/resolution-hero)/vec2(.12,.19);float guard=mix(.10,1.,smoothstep(.4,1.15,length(delta)));float a=min(.95,spark*glow.a*guard);if(a<.002)discard;gl_FragColor=vec4(mix(glow.rgb,vec3(3.5,3.2,2.6),core*.32),a);}`;
export function createDragonFireworks(scene, sampleCamera) {
  const plane = new THREE.PlaneGeometry(2, 2),
    geometry = new THREE.InstancedBufferGeometry();
  geometry.index = plane.index;
  geometry.setAttribute("position", plane.attributes.position);
  geometry.setAttribute("uv", plane.attributes.uv);
  const uniforms = {
    time: { value: 0 },
    resolution: { value: new THREE.Vector2() },
    hero: { value: new THREE.Vector2() },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "V17 world-space dragon fireworks";
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  scene.add(mesh);
  let profile = "",
    score;
  const projected = new THREE.Vector3();
  return {
    update(t, camera, width, height, ratio, head) {
      const next = width + ":" + height;
      if (next !== profile) {
        if (score) geometry.dispose();
        profile = next;
        score = buildDragonFireworks(
          sampleCamera,
          width / height,
          width < 700 || height < 500,
        );
        const buffer = new THREE.InstancedInterleavedBuffer(score.data, 17);
        for (const [name, size, offset] of [
          ["origin", 3, 0],
          ["velocity", 3, 3],
          ["timing", 4, 6],
          ["style", 4, 10],
          ["shade", 3, 14],
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
      projected.copy(head).project(camera);
      uniforms.hero.value.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5);
      mesh.visible = t > 2.4 && t < 21.6;
    },
    get stats() {
      return {
        particles: score?.count ?? 0,
        cues: score?.cues.length ?? 0,
        worldSpace: true,
        drawCalls: 1,
        compact: score?.compact ?? false,
      };
    },
  };
}
