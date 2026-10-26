import * as THREE from "../../../vendor/three/build/three.module.js";
import { createCelestialEffects } from "./celestial.js";

const ease = (a, b, t) => THREE.MathUtils.smoothstep(t, a, b);
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 31.7) * 43758.5453;
  return x - Math.floor(x);
};

// Midpoint displacement preserves large channel bends beneath fine branching.
function channel(a, b, seed, amplitude, depth = 6) {
  let points = [a.clone(), b.clone()];
  for (let level = 0; level < depth; level++) {
    const next = [points[0]],
      jitter = amplitude * Math.pow(0.54, level);
    for (let i = 0; i < points.length - 1; i++) {
      const m = points[i].clone().lerp(points[i + 1], 0.5),
        n = seed + level * 113 + i * 7;
      m.add(
        new THREE.Vector3(
          hash(n) - 0.5,
          (hash(n + 1) - 0.5) * 0.45,
          hash(n + 2) - 0.5,
        ).multiplyScalar(jitter),
      );
      next.push(m, points[i + 1]);
    }
    points = next;
  }
  return points;
}
function boltGeometry(from, to, seed, radius) {
  const pos = [],
    arrival = [],
    energy = [],
    indices = [];
  let branches = 0;
  function tube(path, width, start, rank) {
    const count = path.length,
      sides = 5,
      base = pos.length / 3,
      normal = new THREE.Vector3(),
      side = new THREE.Vector3(),
      axis = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < count; i++) {
      const u = i / (count - 1),
        tangent = path[Math.min(count - 1, i + 1)]
          .clone()
          .sub(path[Math.max(0, i - 1)])
          .normalize();
      normal.crossVectors(tangent, axis).normalize();
      if (normal.lengthSq() < 0.1) normal.set(1, 0, 0);
      side.crossVectors(tangent, normal);
      const r =
        (rank === 2
          ? Math.max(0.003, width * 1.8 * (1 - 0.6 * u))
          : Math.max(0.002, width * (0.98 - 0.85 * Math.pow(u, 0.7)))) *
        (0.9 + 0.1 * hash(seed + i));
      for (let k = 0; k < sides; k++) {
        const angle = (k / sides) * Math.PI * 2,
          p = path[i]
            .clone()
            .addScaledVector(normal, Math.cos(angle) * r)
            .addScaledVector(side, Math.sin(angle) * r);
        pos.push(...p.toArray());
        arrival.push(start + u * (rank ? 0.06 : 0.12));
        energy.push(rank === 0 ? 1 : rank === 1 ? 0.65 : 0.34);
      }
      if (i)
        for (let k = 0; k < sides; k++) {
          const a = base + (i - 1) * sides + k,
            b = base + (i - 1) * sides + ((k + 1) % sides),
            c = base + i * sides + k,
            d = base + i * sides + ((k + 1) % sides);
          indices.push(a, b, c, b, d, c);
        }
    }
  }
  const main = channel(
    new THREE.Vector3(...from),
    new THREE.Vector3(...to),
    seed,
    4.8,
  );
  tube(main, radius, 0, 0);
  for (let j = 0; j < 13; j++) {
    const k = 5 + j * 4,
      p = main[k],
      end = p
        .clone()
        .add(
          new THREE.Vector3(
            (j % 2 ? 1 : -1) * (1.5 + hash(seed + j) * 4.5),
            -1.2 - hash(seed + j + 30) * 4.6,
            (hash(seed + j + 70) - 0.5) * 6,
          ),
        );
    const path = channel(p, end, seed + j * 71, 2.3, 4),
      born = (k / 64) * 0.12;
    tube(path, radius * 0.32, born, 1);
    branches++;
    for (let f = 0; f < 3; f++) {
      const index = 4 + f * 4,
        root = path[index],
        target = root
          .clone()
          .add(
            new THREE.Vector3(
              (hash(seed + j * 9 + f) - 0.5) * 2.8,
              -0.5 - hash(seed + j + f) * 1.8,
              (hash(seed + j + f + 81) - 0.5) * 2.4,
            ),
          );
      tube(
        channel(root, target, seed + j * 111 + f, 1.1, 3),
        radius * 0.105,
        born + (index / 16) * 0.06,
        2,
      );
      branches++;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute(
    "arrival",
    new THREE.Float32BufferAttribute(arrival, 1),
  );
  geometry.setAttribute("energy", new THREE.Float32BufferAttribute(energy, 1));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return { geometry, branches };
}
export function createDragonStage(scene, camera, footMotion) {
  const group = new THREE.Group();
  group.name = "V17 branched storm and mouth pressure waves";
  scene.add(group);
  const baseLights = [];
  scene.traverse((o) => {
    if (o.isLight && o.intensity > 0) baseLights.push([o, o.intensity]);
  });
  const celestial = createCelestialEffects(scene, camera, footMotion),
    bolts = [];
  const specs = [
    [9.69, [-9, 20, -26], [-6, -4, -19], 0.62],
    [9.91, [10, 23, -29], [8, -5, -21], 0.62],
    [10.44, [-7, 24, -18], [-5, -6, -14], 1.5],
    [10.49, [13, 22, -15], [8, -4, -8], 1.1],
    [10.61, [-15, 20, -7], [-10, -7, -1], 0.9],
    [10.76, [5, 27, -34], [2, -6, -31], 0.75],
    [11.34, [-10, 21, -27], [-3, -4, -22], 0.85],
    [11.52, [13, 25, -24], [6, -6, -16], 0.75],
    [11.79, [-15, 19, -38], [-9, -3, -34], 0.58],
  ];
  let branchCount = 0;
  for (let k = 0; k < specs.length; k++) {
    const [at, from, to, strength] = specs[k],
      built = boltGeometry(from, to, k * 397 + 41, k === 2 ? 0.031 : 0.021);
    branchCount += built.branches;
    const material = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: { age: { value: -1 }, power: { value: 0 } },
      vertexShader: `attribute float arrival,energy;varying float born,level;void main(){born=arrival;level=energy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying float born,level;uniform float age,power;void main(){if(age<born)discard;float tip=smoothstep(born,born+.012,age);gl_FragColor=vec4(mix(vec3(.7,1.9,4.8),vec3(5.5,7.,8.5),level),power*tip*(.45+.55*level));}`,
    });
    const mesh = new THREE.Mesh(built.geometry, material);
    mesh.frustumCulled = false;
    group.add(mesh);
    bolts.push({
      at,
      mesh,
      strength,
      center: new THREE.Vector3(...from).lerp(new THREE.Vector3(...to), 0.48),
    });
  }
  const lights = [
    new THREE.PointLight(0x8acbff, 0, 46, 2),
    new THREE.PointLight(0x589cff, 0, 43, 2),
  ];
  lights.forEach((light) => scene.add(light));
  const storm = {
    energy: 0,
    a: new THREE.Vector3(-6, 7, -16),
    b: new THREE.Vector3(8, 6, -9),
  };
  const axis = new THREE.Vector3(0, 0, 1),
    waves = [];
  for (let i = 0; i < 5; i++) {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { level: { value: 0 }, age: { value: 0 }, seed: { value: i } },
      vertexShader: `varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec2 p;uniform float level,age,seed;void main(){float a=atan(p.y,p.x),d=length(p)-(1.+.006*sin(a*8.+age*2.7+seed));float core=exp(-d*d/.00035),halo=exp(-d*d/.004)*.12;float mist=.65+.25*sin(a*5.-age*1.4+seed)*sin(a*13.+seed);gl_FragColor=vec4(.40,1.35,2.3,(core+halo)*mist*level);}`,
    });
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.82, 1.18, 192, 2),
      mat,
    );
    group.add(mesh);
    waves.push({ at: 8.32 + i * 0.23, mesh });
  }
  const charge = new THREE.Group();
  group.add(charge);
  const chargeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.8, 2.1, 4.3),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2,
      points = channel(
        new THREE.Vector3(Math.cos(a) * 0.6, Math.sin(a) * 0.55, 0),
        new THREE.Vector3(Math.cos(a) * 1.75, Math.sin(a) * 1.45, -0.9),
        700 + i,
        0.42,
        4,
      );
    const curve = new THREE.CatmullRomCurve3(points);
    charge.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, 64, 0.006, 4, false),
        chargeMat,
      ),
    );
  }
  return {
    storm,
    get stats() {
      return {
        bolts: bolts.length,
        branches: branchCount,
        levels: 3,
        waves: 5,
      };
    },
    update(t, enabled, head, mouth, direction, body, feet, frames) {
      group.visible = enabled;
      celestial.update(t, enabled, head, body, frames, feet);
      let total = 0,
        strongest = 0,
        next = 0;
      const stormWidth = 0.66 + 0.34 * ease(0.5, 1, camera.aspect);
      for (const bolt of bolts) {
        const age = t - bolt.at;
        // Fast leaders followed by distinct return strokes; no uniform glowing rod.
        const pulse = (at, decay) =>
          age >= at ? Math.exp(-(age - at) / decay) : 0;
        const power =
          age < 0 || age > 1.05
            ? 0
            : bolt.strength *
              (pulse(0.035, 0.055) +
                pulse(0.14, 0.095) * 0.95 +
                pulse(0.34, 0.12) * 0.57 +
                pulse(0.61, 0.16) * 0.21);
        bolt.mesh.scale.x = stormWidth;
        bolt.mesh.visible = power > 0.004;
        bolt.mesh.material.uniforms.age.value = age;
        bolt.mesh.material.uniforms.power.value = power;
        total += power;
        if (power > strongest) {
          next = strongest;
          storm.b.copy(storm.a);
          strongest = power;
          storm.a.copy(bolt.center);
          storm.a.x *= stormWidth;
        } else if (power > next) {
          next = power;
          storm.b.copy(bolt.center);
          storm.b.x *= stormWidth;
        }
      }
      storm.energy = Math.min(2.3, total);
      lights[0].position.copy(storm.a);
      lights[1].position.copy(storm.b);
      lights[0].intensity = strongest * 95;
      lights[1].intensity = next * 75;
      const chargeLevel = ease(8.2, 9.4, t) * (1 - ease(9.65, 10.2, t));
      charge.position.copy(head);
      charge.position.z += 0.6;
      charge.rotation.y = t * 0.13;
      chargeMat.opacity = chargeLevel * (0.24 + 0.17 * Math.sin(t * 21) ** 2);
      const radii = [];
      for (const w of waves) {
        const age = t - w.at,
          life =
            (ease(0, 0.12, age) * (1 - ease(1, 1.75, age))) /
            (1 + Math.max(0, age) * 1.15),
          radius = 0.26 + Math.max(0, age) * 3.9;
        w.mesh.visible = age >= 0 && age < 1.75;
        w.mesh.position
          .copy(mouth)
          .addScaledVector(direction, 0.12 + Math.max(0, age) * 1.15);
        w.mesh.quaternion.setFromUnitVectors(axis, direction);
        w.mesh.scale.setScalar(radius);
        w.mesh.material.uniforms.level.value = life * 0.66;
        w.mesh.material.uniforms.age.value = Math.max(0, age);
        if (w.mesh.visible) radii.push(radius);
      }
      document.body.dataset.dragonRoar = JSON.stringify({
        activeWaves: radii.length,
        radii,
        mouth: mouth.toArray(),
        jaw: ease(8.1, 8.45, t) * (1 - ease(9.1, 9.7, t)),
      });
      const reveal = ease(0.6, 5.2, t),
        dark = ease(9.35, 10.4, t) * (1 - ease(12, 13.1, t));
      for (const [light, power] of baseLights)
        light.intensity = power * (0.47 + 0.53 * reveal) * (1 - 0.25 * dark);
      scene.environmentIntensity = (0.38 + 0.32 * reveal) * (1 - 0.16 * dark);
      return storm;
    },
  };
}
