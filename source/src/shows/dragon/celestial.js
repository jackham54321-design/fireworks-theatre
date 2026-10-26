import * as THREE from "../../../vendor/three/build/three.module.js";

const ease = (a, b, t) => {
  const u = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const hash = (n) => {
  const x = Math.sin(n * 123.17 + 71.3) * 43758.5453;
  return x - Math.floor(x);
};
class ElectricPath extends THREE.Curve {
  constructor(points) {
    super();
    this.points = points;
  }
  getPoint(t, out = new THREE.Vector3()) {
    const u = t * (this.points.length - 1),
      i = Math.min(this.points.length - 2, Math.floor(u));
    return out.copy(this.points[i]).lerp(this.points[i + 1], u - i);
  }
}
export function createCelestialEffects(scene, camera, footMotion) {
  function pastFoot(t, index, out) {
    const k = Math.max(
        0,
        Math.min(footMotion.frames.length - 1, t * footMotion.fps),
      ),
      a = Math.floor(k),
      b = Math.min(a + 1, footMotion.frames.length - 1);
    return out
      .fromArray(footMotion.frames[a][index])
      .lerp(new THREE.Vector3(...footMotion.frames[b][index]), k - a);
  }
  const group = new THREE.Group();
  group.name = "V17 night-sky and claw-cloud detail";
  scene.add(group);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(145, 64, 40),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { time: { value: 0 }, level: { value: 1 } },
      vertexShader: `varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `precision highp float;varying vec2 v;uniform float time,level;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}void main(){float band=exp(-pow((v.y-(.53+.12*v.x+.025*sin(v.x*14.)))/.065,2.));float mist=.6*n(v*vec2(19.,8.)+time*.003)+.4*n(v*vec2(43.,15.));vec3 c=mix(vec3(.025,.060,.105),vec3(.008,.014,.042),smoothstep(.15,.85,v.y));c+=band*mist*vec3(.065,.085,.15);c+=exp(-pow((v.y-.40)/.15,2.))*vec3(.015,.028,.040);gl_FragColor=vec4(c*level*.18,1.);}`,
    }),
  );
  sky.position.set(0, 0, -12);
  group.add(sky);
  const farP = [],
    farC = [],
    farS = [];
  for (let i = 0; i < 950; i++) {
    const u = hash(i + 8100),
      band = i < 620;
    farP.push(
      (u - 0.5) * 150,
      band
        ? 22 + 10 * Math.sin(u * 4.4) + (hash(i + 8200) - 0.5) * 10
        : hash(i + 8200) * 70 - 15,
      -55 - hash(i + 8300) * 27,
    );
    const gold = hash(i + 8400) > 0.7;
    farC.push(...(gold ? [0.95, 0.75, 0.4] : [0.42, 0.69, 0.95]));
    farS.push(
      hash(i + 8600) > 0.95
        ? 3.0 + hash(i + 8500) * 1.8
        : 0.8 + hash(i + 8500) * 1.8,
    );
  }
  const farG = new THREE.BufferGeometry();
  farG.setAttribute("position", new THREE.Float32BufferAttribute(farP, 3));
  farG.setAttribute("color", new THREE.Float32BufferAttribute(farC, 3));
  farG.setAttribute("size", new THREE.Float32BufferAttribute(farS, 1));
  const farM = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, level: { value: 1 } },
    vertexShader: `attribute vec3 color;attribute float size;varying vec3 c;varying float a;uniform float time,level;void main(){c=color;a=level*(.45+.25*sin(time*.7+position.x*3.));vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=size;}`,
    fragmentShader: `varying vec3 c;varying float a;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(c,pow(1.-r,1.6)*a);}`,
  });
  group.add(new THREE.Points(farG, farM));
  const cloudShader = {
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      time: { value: 0 },
      level: { value: 0 },
      seed: { value: 0 },
      sea: { value: 0 },
    },
    vertexShader: `varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `precision highp float;varying vec2 v;uniform float time,level,seed,sea;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}void main(){vec2 q=(v-.5)*2.;float edge=pow(max(0.,1.-dot(q,q)),1.5);vec2 p=v*vec2(7.,3.)+vec2(seed,time*.09);float noise=.6*n(p)+.28*n(p*2.07)+.12*n(p*4.2);float core=smoothstep(.22,.73,noise);vec3 c=mix(vec3(.16,.38,.51),vec3(.68,.85,.87),core);c=mix(c,c*vec3(.25,.32,.40),sea);gl_FragColor=vec4(c,edge*core*level);}`,
  };
  const sea = [];
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.ShaderMaterial(cloudShader);
    mat.uniforms = THREE.UniformsUtils.clone(mat.uniforms);
    mat.uniforms.seed.value = 80 + i * 7;
    mat.uniforms.sea.value = 1;
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(46 + i * 7, 9 + i * 2),
      mat,
    );
    p.position.set((i - 1) * 18, -5 - i * 2, -38 - i * 9);
    group.add(p);
    sea.push(p);
  }
  const feet = [];
  for (let f = 0; f < 4; f++) {
    const root = new THREE.Group();
    root.name = "Claw cloud " + f;
    group.add(root);
    const puffs = [];
    for (let j = 0; j < 3; j++) {
      const mat = new THREE.ShaderMaterial(cloudShader);
      mat.uniforms = THREE.UniformsUtils.clone(mat.uniforms);
      mat.uniforms.seed.value = f * 17 + j * 4;
      const p = new THREE.Mesh(
        new THREE.PlaneGeometry(j ? 2.1 : 1.7, j ? 0.55 : 0.46),
        mat,
      );
      p.position.set(
        j === 1 ? -0.34 : j === 2 ? 0.3 : 0,
        j === 1 ? 0.04 : j === 2 ? -0.04 : 0,
        j === 1 ? -0.12 : j === 2 ? 0.14 : 0,
      );
      root.add(p);
      puffs.push(p);
    }
    const arcs = [];
    for (let j = 0; j < 2; j++) {
      const points = [];
      for (let i = 0; i <= 56; i++) {
        const a = (i / 56) * Math.PI * 0.95 + j * 2.7 + f * 0.4,
          r =
            0.58 +
            0.09 * Math.sin(a * 7 + f) +
            0.035 * (hash(i + f * 70 + j * 300) - 0.5);
        points.push(
          new THREE.Vector3(
            Math.cos(a) * r,
            0.045 * Math.sin(a * 5 + f) + 0.025,
            Math.sin(a) * r * 0.68,
          ),
        );
      }
      const curve = new ElectricPath(points);
      for (const halo of [false, true]) {
        const mat = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
          uniforms: {
            time: { value: 0 },
            level: { value: 0 },
            phase: { value: f * 0.9 + j * 2.2 },
            halo: { value: halo ? 1 : 0 },
          },
          vertexShader: `varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
          fragmentShader: `varying vec2 v;uniform float time,level,phase,halo;void main(){float flow=.18+.82*pow(.5+.5*sin(v.x*18.-time*5.+phase),5.);float edge=smoothstep(0.,.06,v.x)*(1.-smoothstep(.94,1.,v.x));vec3 c=mix(vec3(.60,1.5,2.3),vec3(.05,.35,.9),halo);gl_FragColor=vec4(c,level*flow*edge*mix(.90,.20,halo));}`,
        });
        const arc = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 112, halo ? 0.032 : 0.008, 4, false),
          mat,
        );
        root.add(arc);
        arcs.push(arc);
      }
    }
    feet.push({ root, puffs, arcs });
  }
  const count = 380,
    pos = new Float32Array(count * 3),
    colors = new Float32Array(count * 3),
    sizes = new Float32Array(count),
    alphas = new Float32Array(count),
    phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const gold = hash(i + 9300) > 0.48;
    colors.set(gold ? [1.25, 0.84, 0.29] : [0.32, 1.05, 1.5], i * 3);
    sizes[i] = 0.05 + hash(i + 9400) * 0.065;
    phase[i] = hash(i + 9500) * Math.PI * 2;
  }
  const starsG = new THREE.BufferGeometry();
  starsG.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  starsG.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  starsG.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  starsG.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
  starsG.setAttribute("phase", new THREE.BufferAttribute(phase, 1));
  const starsM = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      time: { value: 0 },
      level: { value: 0 },
      scale: { value: 1000 },
    },
    vertexShader: `attribute vec3 color;attribute float size,alpha,phase;varying vec3 c;varying float a;uniform float time,level,scale;void main(){c=color;a=alpha*level*(.35+.65*pow(.5+.5*sin(time*2.3+phase),3.));vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(size*scale/max(.5,-p.z),1.2,11.);}`,
    fragmentShader: `varying vec3 c;varying float a;void main(){vec2 q=(gl_PointCoord-.5)*2.;float r=length(q);if(r>1.)discard;float core=exp(-r*r*11.);float cross=(exp(-abs(q.x)*30.)+exp(-abs(q.y)*30.))*pow(1.-r,2.)*.30;gl_FragColor=vec4(c,(core+cross)*a);}`,
  });
  const stars = new THREE.Points(starsG, starsM);
  stars.frustumCulled = false;
  group.add(stars);
  const trailPos = new Float32Array(2 * 100 * 6),
    trailG = new THREE.BufferGeometry();
  trailG.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
  const trailM = new THREE.LineBasicMaterial({
    color: 0xb6d8d0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const trails = new THREE.LineSegments(trailG, trailM);
  trails.frustumCulled = false;
  group.add(trails);
  const warm = new THREE.PointLight(0xffd58e, 0, 16, 2),
    cool = new THREE.PointLight(0x6bccff, 0, 12, 2);
  scene.add(warm, cool);
  const p = new THREE.Vector3(),
    r = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0),
    zero = new THREE.Vector3();
  function bodySample(u, body, frames, angle, radius, out) {
    const k = u * (body.length - 1),
      i = Math.min(body.length - 2, Math.floor(k)),
      v = k - i;
    out.copy(body[i]).lerp(body[i + 1], v);
    q.copy(frames[i]).slerp(frames[i + 1], v);
    r.set(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius,
    ).applyQuaternion(q);
    out.add(r);
    return out;
  }
  return {
    update(t, enabled, head, body, frames, footPoints) {
      group.visible = enabled;
      const presence = ease(0, 0.7, t) * (1 - ease(18.2, 19.0, t)),
        cloudLevel = ease(0.1, 0.8, t) * (1 - ease(17.5, 18.5, t)),
        storm = ease(9.4, 10.5, t) * (1 - ease(12, 13, t));
      sky.material.uniforms.time.value = t;
      sky.material.uniforms.level.value = 1 - ease(20.5, 21.6, t) * 0.25;
      farM.uniforms.time.value = t;
      farM.uniforms.level.value = 0.9;
      for (const s of sea) {
        s.material.uniforms.time.value = t;
        s.material.uniforms.level.value =
          0.55 * (1 - ease(17, 19, t)) +
          0.15 * ease(19.7, 20.1, t) * (1 - ease(20.7, 21.6, t));
      }
      for (let i = 0; i < 4; i++) {
        const foot = feet[i];
        foot.root.visible = !!footPoints?.[i] && cloudLevel > 0;
        foot.root.position.copy(footPoints?.[i] ?? zero);
        foot.root.position.y -= 0.17;
        foot.root.scale.setScalar(i < 2 ? 1 : 0.92);
        for (let j = 0; j < foot.puffs.length; j++) {
          const cloud = foot.puffs[j];
          cloud.quaternion.copy(camera.quaternion);
          if (j) {
            pastFoot(Math.max(0, t - j * 0.12), i, p);
            cloud.position.copy(p).sub(footPoints[i]);
            cloud.position.y -= j * 0.045;
            cloud.position.z -= j * 0.1;
            cloud.scale.set(1 + 0.12 * Math.sin(t * 1.7 + i + j), 1, 1);
          } else {
            cloud.position.set(0, 0, 0);
            cloud.scale.set(1 + 0.06 * Math.sin(t * 2 + i), 1, 1);
          }
          cloud.material.uniforms.time.value = t;
          cloud.material.uniforms.level.value = cloudLevel * (j ? 0.29 : 0.68);
        }
        for (const arc of foot.arcs) {
          arc.material.uniforms.time.value = t;
          arc.material.uniforms.level.value = cloudLevel * (0.48 + 0.3 * storm);
        }
      }
      if (body?.length > 1 && frames?.length === body.length) {
        for (let i = 0; i < count; i++) {
          if (i < 352) {
            const u = (hash(i + 9600) + t * 0.085) % 1,
              angle = u * Math.PI * 5.5 + t * 0.7 + phase[i],
              radius = 0.9 + hash(i + 9700) * 0.6;
            bodySample(u, body, frames, angle, radius, p);
            alphas[i] = Math.pow(Math.sin(Math.PI * u), 0.45);
          } else {
            const a = phase[i] + t * 0.28;
            p.copy(head ?? zero).add(
              new THREE.Vector3(
                Math.cos(a) * (1.05 + hash(i) * 0.3),
                0.35 + Math.sin(a) * 0.82,
                Math.sin(a * 2) * 0.5,
              ),
            );
            alphas[i] = 0.4;
          }
          pos.set(p.toArray(), i * 3);
        }
        for (let line = 0; line < 2; line++)
          for (let i = 0; i < 100; i++) {
            const u = i / 100,
              v = (i + 1) / 100;
            bodySample(
              u,
              body,
              frames,
              u * Math.PI * 4.2 + t * 0.48 + line * Math.PI,
              0.78,
              p,
            );
            trailPos.set(p.toArray(), (line * 100 + i) * 6);
            bodySample(
              v,
              body,
              frames,
              v * Math.PI * 4.2 + t * 0.48 + line * Math.PI,
              0.78,
              p,
            );
            trailPos.set(p.toArray(), (line * 100 + i) * 6 + 3);
          }
        starsG.attributes.position.needsUpdate = true;
        starsG.attributes.alpha.needsUpdate = true;
        trailG.attributes.position.needsUpdate = true;
      }
      starsM.uniforms.time.value = t;
      starsM.uniforms.level.value = presence * (1.25 + 0.3 * storm);
      starsM.uniforms.scale.value =
        (innerHeight *
          Math.min(devicePixelRatio || 1, 1.5, 1800 / innerWidth)) /
        (2 * Math.tan((camera.fov * Math.PI) / 360));
      trailM.opacity = 0.018 * presence;
      warm.position.copy(head ?? zero).add(new THREE.Vector3(-2, 2, 3));
      warm.intensity = enabled ? 7 * presence : 0;
      cool.position.set(0, 0, 0);
      if (footPoints?.length)
        for (const point of footPoints) cool.position.add(point);
      cool.position.multiplyScalar(0.25);
      cool.position.y -= 0.35;
      cool.intensity = enabled ? 6 * cloudLevel : 0;
      document.body.dataset.dragonCelestial = JSON.stringify({
        feet: enabled && cloudLevel > 0 ? 4 : 0,
        stars: enabled && presence > 0 ? count : 0,
        cloudLevel: enabled ? cloudLevel : 0,
        presence: enabled ? presence : 0,
      });
    },
  };
}
