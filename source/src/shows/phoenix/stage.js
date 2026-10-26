import * as THREE from "../../../vendor/three/build/three.module.js";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (v) => {
  v = clamp(v, 0, 1);
  return v * v * (3 - 2 * v);
};
const ramp = (t, a, b) => smooth((t - a) / (b - a));
const rand = (n) => {
  const v = Math.sin(n * 127.1 + 73.9) * 43758.5453;
  return v - Math.floor(v);
};
const V = new THREE.Vector3(),
  P = new THREE.Vector3(),
  Q = new THREE.Quaternion(),
  S = new THREE.Vector3(),
  M = new THREE.Matrix4(),
  UP = new THREE.Vector3(0, 1, 0);

const flameVS = `attribute vec3 anchor;attribute vec3 seed;uniform float time,intensity,actorScale;uniform vec3 velocity;varying vec2 fuv;varying float life,noiseSeed;
void main(){fuv=uv;noiseSeed=seed.x*20.;float age=fract(time*(.7+seed.z*.6)+seed.x);life=sin(age*3.14159265);vec3 flow=vec3(0.,1.8,0.)-velocity*.25;vec3 p=anchor+flow*age*.48*actorScale;p+=vec3(sin(age*5.+seed.x*30.),0.,cos(age*6.+seed.x*20.))*.11*age*actorScale;vec4 mv=viewMatrix*vec4(p,1.);vec2 dir=(mat3(viewMatrix)*flow).xy;if(length(dir)<.1)dir=vec2(0,1);dir=normalize(dir);vec2 right=vec2(dir.y,-dir.x);float h=(.30+seed.y*.70)*actorScale*(.6+.4*life)*sqrt(intensity);float w=(.18+seed.z*.22)*actorScale;float bend=sin(time*5.+uv.y*5.+seed.x*40.)*uv.y*uv.y*h*.18;mv.xy+=right*(position.x*w+bend)+dir*uv.y*h;gl_Position=projectionMatrix*mv;}`;
const flameFS = `precision highp float;uniform float time,intensity;varying vec2 fuv;varying float life,noiseSeed;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){float y=fuv.y;float x=fuv.x-.5+sin(y*8.-time*6.+noiseSeed)*.10*y;float width=.48*pow(max(.001,1.-y),1.35);float shape=exp(-pow(x/max(.025,width),2.)*2.);float n=noise(vec2(x*7.+noiseSeed,y*7.-time*3.));float edge=pow(max(0.,sin(fuv.x*3.14159265)),1.3)*smoothstep(0.,.10,y);float alpha=shape*edge*(1.-smoothstep(.60,1.,y))*(.55+.45*n)*life*.30*min(1.5,intensity);if(alpha<.004)discard;vec3 red=vec3(1.,.025,.001);vec3 gold=vec3(1.,.30,.012);vec3 c=mix(gold,red,smoothstep(.10,.85,y));c+=vec3(.2,.16,.035)*pow(shape,5.)*(1.-smoothstep(.12,.30,y));gl_FragColor=vec4(c,alpha);}`;
function flameCloud(count) {
  const plane = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.index = plane.index;
  g.attributes.position = plane.attributes.position;
  g.attributes.uv = plane.attributes.uv;
  g.instanceCount = count;
  const anchors = new Float32Array(count * 3),
    seeds = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) seeds[i] = rand(i + 4);
  g.setAttribute(
    "anchor",
    new THREE.InstancedBufferAttribute(anchors, 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  g.setAttribute("seed", new THREE.InstancedBufferAttribute(seeds, 3));
  const material = new THREE.ShaderMaterial({
    vertexShader: flameVS,
    fragmentShader: flameFS,
    uniforms: {
      time: { value: 0 },
      intensity: { value: 1 },
      actorScale: { value: 1 },
      velocity: { value: new THREE.Vector3() },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(g, material);
  mesh.frustumCulled = false;
  return {
    mesh,
    anchors,
    update(t, intensity, scale, velocity) {
      material.uniforms.time.value = t;
      material.uniforms.intensity.value = intensity;
      material.uniforms.actorScale.value = scale;
      material.uniforms.velocity.value.copy(velocity);
      g.attributes.anchor.needsUpdate = true;
    },
  };
}

function eggPoint(u, v) {
  const theta = u * Math.PI * 2,
    phi = v * Math.PI;
  const y = Math.cos(phi);
  const radius = Math.sin(phi) * (1 - 0.14 * y);
  return new THREE.Vector3(
    Math.cos(theta) * radius * 1.18,
    y * 1.6,
    Math.sin(theta) * radius * 1.08,
  );
}
function createEgg(scene) {
  const group = new THREE.Group();
  group.name = "Burning egg - fractured shell";
  scene.add(group);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: { time: { value: 0 }, alpha: { value: 1 }, heat: { value: 1 } },
    vertexShader: `varying vec2 eUV;varying vec3 norm;void main(){eUV=uv;norm=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 eUV;varying vec3 norm;uniform float time,alpha,heat;vec2 hash(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}void main(){vec2 p=eUV*vec2(9,11);p+=vec2(sin(p.y*2.1),cos(p.x*1.9))*.22;vec2 i=floor(p),f=fract(p);float d1=10.,d2=10.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 b=vec2(float(x),float(y));float d=length(b+hash(i+b)-f);if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}float edge=d2-d1;float fissure=1.-smoothstep(.018,.070,edge);float halo=exp(-edge*14.);float light=.2+.6*max(0.,dot(norm,normalize(vec3(-.4,.6,1.))));vec3 obsidian=vec3(.028,.009,.006)*light;vec3 c=obsidian+vec3(1.,.22,.008)*halo*.40*heat+vec3(1.,.65,.12)*fissure*1.1*heat;gl_FragColor=vec4(c,alpha);}`,
  });
  const parts = [];
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 8; col++) {
      const g = new THREE.BufferGeometry(),
        pos = [],
        uv = [],
        idx = [];
      const steps = 4;
      let center = new THREE.Vector3();
      for (let y = 0; y <= steps; y++)
        for (let x = 0; x <= steps; x++) {
          const u = (col + x / steps) / 8,
            v = (row + y / steps) / 5;
          const wu = u + 0.028 * Math.sin(v * Math.PI * 5 + u * Math.PI * 6),
            wv = v + 0.022 * Math.sin(u * Math.PI * 8) * Math.sin(v * Math.PI);
          const p = eggPoint(wu, wv);
          center.add(p);
          pos.push(...p);
          uv.push(u, v);
        }
      center.divideScalar((steps + 1) ** 2);
      for (let i = 0; i < pos.length; i += 3) {
        pos[i] -= center.x;
        pos[i + 1] -= center.y;
        pos[i + 2] -= center.z;
      }
      for (let y = 0; y < steps; y++)
        for (let x = 0; x < steps; x++) {
          const a = y * (steps + 1) + x,
            b = a + steps + 1;
          idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
      const outer = (steps + 1) ** 2,
        oldIndices = [...idx];
      for (let i = 0; i < outer; i++) {
        const world = new THREE.Vector3(
          pos[i * 3],
          pos[i * 3 + 1],
          pos[i * 3 + 2],
        ).add(center);
        const n = world.clone().normalize().multiplyScalar(0.055);
        pos.push(pos[i * 3] - n.x, pos[i * 3 + 1] - n.y, pos[i * 3 + 2] - n.z);
        uv.push(uv[i * 2], uv[i * 2 + 1]);
      }
      for (let i = 0; i < oldIndices.length; i += 3)
        idx.push(
          oldIndices[i] + outer,
          oldIndices[i + 2] + outer,
          oldIndices[i + 1] + outer,
        );
      const rim = [];
      for (let x = 0; x <= steps; x++) rim.push(x);
      for (let y = 1; y <= steps; y++) rim.push(y * (steps + 1) + steps);
      for (let x = steps - 1; x >= 0; x--) rim.push(steps * (steps + 1) + x);
      for (let y = steps - 1; y > 0; y--) rim.push(y * (steps + 1));
      for (let i = 0; i < rim.length; i++) {
        const a = rim[i],
          b = rim[(i + 1) % rim.length];
        idx.push(a, b, a + outer, b, b + outer, a + outer);
      }
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      const shell = new THREE.Mesh(g, material);
      shell.position.copy(center);
      group.add(shell);
      parts.push({
        shell,
        center,
        direction: center.clone().normalize(),
        seed: rand(row * 8 + col),
        axis: new THREE.Vector3(
          rand(col + 44) - 0.5,
          rand(row + 90),
          rand(col + 80) - 0.5,
        ).normalize(),
      });
    }
  const fire = flameCloud(220);
  scene.add(fire.mesh);
  const eggAnchors = Array.from({ length: 220 }, (_, i) =>
      eggPoint(rand(i + 301), rand(i + 701)),
    ),
    stillVelocity = new THREE.Vector3();
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(1.2, 1.27, 96),
    new THREE.MeshBasicMaterial({
      color: 0xff7509,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.37;
  scene.add(halo);
  return {
    group,
    update(t) {
      const breakTime = Math.max(0, t - 2.72),
        fade = 1 - ramp(t, 4.6, 6.0);
      group.visible = t < 6;
      group.position.set(-2.6, 1.28 + 0.05 * Math.sin(t * 3), -4.1);
      group.rotation.y = t * 0.12;
      material.uniforms.time.value = t;
      material.uniforms.alpha.value = fade;
      material.uniforms.heat.value =
        1 + 0.6 * ramp(t, 1.6, 2.8) + 0.2 * Math.sin(t * 7);
      for (const p of parts) {
        const a = breakTime * (1 + 0.25 * p.seed);
        p.shell.position.copy(p.center).addScaledVector(p.direction, a * 2.4);
        p.shell.position.y += a * 0.65 - a * a * 0.75;
        p.shell.quaternion.setFromAxisAngle(p.axis, a * (0.7 + p.seed));
      }
      fire.mesh.visible = t < 5.4;
      for (let i = 0; i < 220; i++) {
        const p = eggAnchors[i],
          a = 1 + breakTime * 0.4;
        fire.anchors[i * 3] = p.x * a - 2.6;
        fire.anchors[i * 3 + 1] = p.y * a + 1.28;
        fire.anchors[i * 3 + 2] = p.z * a - 4.1;
      }
      fire.update(
        t,
        (1 + 0.4 * ramp(t, 1.5, 3)) * (1 - ramp(t, 4.2, 5.4)),
        1,
        stillVelocity,
      );
      halo.position.x = -2.6;
      halo.position.z = -4.1;
      halo.visible = t < 5.2;
      halo.scale.setScalar(1 + breakTime * 1.8);
      halo.material.opacity = 0.55 * (1 - ramp(t, 3.3, 5.2));
    },
  };
}

function featherGeometry() {
  const pos = [],
    col = [],
    uv = [],
    idx = [];
  const n = 16;
  for (let j = 0; j <= n; j++) {
    const u = j / n,
      w = 0.16 * Math.sin(Math.PI * u) ** 0.75;
    for (let side of [-1, 0, 1]) {
      pos.push(
        w * side,
        u,
        0.065 * Math.sin(Math.PI * u) + Math.abs(side) * 0.02,
      );
      uv.push((side + 1) * 0.5, u);
      col.push(
        1,
        side === 0 ? 0.82 : 0.34 + 0.3 * u,
        side === 0 ? 0.27 : 0.025,
      );
    }
  }
  for (let j = 0; j < n; j++)
    for (let k = 0; k < 2; k++) {
      const a = j * 3 + k;
      idx.push(a, a + 3, a + 1, a + 3, a + 4, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function createMeteors(scene) {
  const count = 64,
    segments = 15,
    meteor = new THREE.InstancedMesh(
      featherGeometry(),
      new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        toneMapped: false,
        vertexShader: `varying vec2 featherUV;void main(){featherUV=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec2 featherUV;void main(){float side=abs(featherUV.x-.5)*2.;float shaft=1.-smoothstep(.015,.07,side);float barbs=.5+.5*sin(featherUV.y*145.-side*15.);vec3 c=mix(vec3(1.,.09,.002),vec3(1.,.50,.04),1.-side);c+=vec3(.0,.12,.05)*barbs*.5+vec3(.3,.3,.15)*shaft;gl_FragColor=vec4(c,1.);}`,
      }),
      count,
    );
  meteor.frustumCulled = false;
  scene.add(meteor);
  const positions = new Float32Array(count * segments * 6 * 3),
    uvs = new Float32Array(count * segments * 6 * 2);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
  );
  geom.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  for (let i = 0; i < count * segments; i++)
    uvs.set([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1], i * 12);
  const trail = new THREE.Mesh(
    geom,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
      uniforms: { fade: { value: 1 } },
      vertexShader: `varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec2 v;uniform float fade;void main(){float a=pow(max(0.,1.-abs(v.x-.5)*2.),1.5)*fade;gl_FragColor=vec4(1.6,.35+.4*(1.-v.y),.025,a*.6);}`,
    }),
  );
  trail.frustumCulled = false;
  scene.add(trail);
  const meteorFire = flameCloud(count);
  scene.add(meteorFire.mesh);
  const data = Array.from({ length: count }, (_, i) => ({
    origin: new THREE.Vector3(
      -8 + rand(i + 70) * 16,
      12 + rand(i + 170) * 4,
      -4 + rand(i + 270) * 8,
    ),
    delay: rand(i + 20) * 1.1,
    v: new THREE.Vector3(
      (rand(i + 90) - 0.5) * 4.5,
      -5.5 - rand(i + 190) * 3.5,
      0.5 + rand(i + 290),
    ),
    size: 0.55 + rand(i + 370) * 0.8,
  }));
  const shock = new THREE.Mesh(
    new THREE.RingGeometry(0.994, 1.006, 128),
    new THREE.MeshBasicMaterial({
      color: 0xff8c19,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  shock.position.set(0, 3.8, 1.75);
  scene.add(shock);
  const point = new THREE.Vector3(),
    vel = new THREE.Vector3(),
    trailA = new THREE.Vector3(),
    trailB = new THREE.Vector3(),
    sideVector = new THREE.Vector3(),
    towardCamera = new THREE.Vector3(),
    fallVelocity = new THREE.Vector3(0, -7, 0);
  function position(i, age, out) {
    out.copy(data[i].origin).addScaledVector(data[i].v, age);
    out.y -= 0.6 * age * age;
    return out;
  }
  return {
    cache() {},
    update(t, camera) {
      meteor.visible =
        trail.visible =
        meteorFire.mesh.visible =
          t > 18.9 && t < 24.2;
      shock.visible = false;
      if (!meteor.visible) return;
      const fade = 1 - ramp(t, 22.1, 24.2);
      trail.material.uniforms.fade.value = fade;
      for (let i = 0; i < count; i++) {
        const age = t - 18.95 - data[i].delay,
          active = age >= 0 && age < 4.5;
        const a = Math.max(0, age);
        position(i, a, point);
        vel.copy(data[i].v);
        vel.y -= 1.2 * a;
        Q.setFromUnitVectors(UP, vel.normalize());
        const size = active ? data[i].size * ramp(a, 0, 0.1) * fade : 0;
        S.set(size, size, size);
        M.compose(point, Q, S);
        meteor.setMatrixAt(i, M);
        meteorFire.anchors[i * 3] = active ? point.x : 0;
        meteorFire.anchors[i * 3 + 1] = active ? point.y : -100;
        meteorFire.anchors[i * 3 + 2] = active ? point.z : 0;
        for (let j = 0; j < segments; j++) {
          const aa = Math.max(0, a - j * 0.035),
            bb = Math.max(0, a - (j + 1) * 0.035);
          position(i, aa, trailA);
          position(i, bb, trailB);
          sideVector
            .subVectors(trailB, trailA)
            .cross(towardCamera.subVectors(camera.position, trailA))
            .normalize()
            .multiplyScalar(active ? 0.11 * (1 - j / segments) * fade : 0);
          let off = (i * segments + j) * 18;
          for (let k = 0; k < 6; k++) {
            const p = k === 0 || k === 1 || k === 3 ? trailA : trailB,
              sign = k === 1 || k === 3 || k === 4 ? 1 : -1;
            positions[off++] = p.x + sideVector.x * sign;
            positions[off++] = p.y + sideVector.y * sign;
            positions[off++] = p.z + sideVector.z * sign;
          }
        }
      }
      meteor.instanceMatrix.needsUpdate = true;
      geom.attributes.position.needsUpdate = true;
      meteorFire.update(t, 1.2 * fade, 0.65, fallVelocity);
      const dt = t - 18.95;
      shock.visible = dt > 0 && dt < 1.2;
      shock.scale.setScalar(1 + Math.max(0, dt) * 9);
      shock.material.opacity = Math.max(0, 0.65 * (1 - dt / 1.2));
    },
  };
}

export function createFireTheatre(scene, actor, meshes) {
  const mesh = meshes.find((m) => m.isSkinnedMesh);
  if (!mesh) throw Error("全身火焰需要蒙皮角色");
  const buckets = { head: [], body: [], wing: [], tail: [], feet: [] };
  const skinI = mesh.geometry.attributes.skinIndex,
    skinW = mesh.geometry.attributes.skinWeight;
  for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
    let k = 0;
    for (let j = 1; j < 4; j++)
      if (skinW.getComponent(i, j) > skinW.getComponent(i, k)) k = j;
    const name = mesh.skeleton.bones[skinI.getComponent(i, k)].name;
    const type = /neck|head|crest|beak/i.test(name)
      ? "head"
      : /shoulder|elbow|wrist/.test(name)
        ? "wing"
        : /thigh|shin|foot/.test(name)
          ? "feet"
          : /pelvis|chest|source_root/.test(name)
            ? "body"
            : "tail";
    buckets[type].push(i);
  }
  const counts = { head: 120, body: 150, wing: 330, tail: 300, feet: 60 },
    indices = [];
  for (const [type, count] of Object.entries(counts)) {
    const b = buckets[type];
    for (let i = 0; i < count; i++)
      indices.push(
        b[
          Math.min(
            b.length - 1,
            Math.floor(rand(i + indices.length + 150) * b.length),
          )
        ] ?? 0,
      );
  }
  const fire = flameCloud(indices.length);
  fire.mesh.name = "Skinned surface flame emitters";
  scene.add(fire.mesh);
  const sparkCount = 650,
    sparkSeeds = new Float32Array(sparkCount * 3),
    sparkPos = new Float32Array(sparkCount * 3);
  for (let i = 0; i < sparkSeeds.length; i++) sparkSeeds[i] = rand(i + 900);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute(
    "position",
    new THREE.BufferAttribute(sparkPos, 3).setUsage(THREE.DynamicDrawUsage),
  );
  sg.setAttribute("seed", new THREE.BufferAttribute(sparkSeeds, 3));
  const sparks = new THREE.Points(
    sg,
    new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      uniforms: { time: { value: 0 } },
      vertexShader: `attribute vec3 seed;uniform float time;varying float a;void main(){float age=fract(time*.45+seed.x);vec3 p=position+vec3(sin(seed.x*50.)*.9,age*2.2,cos(seed.x*40.)*.8)*age;vec4 v=viewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp((2.+seed.y*3.)*20./max(5.,-v.z),1.,6.);a=(1.-age)*.8;}`,
      fragmentShader: `varying float a;void main(){float q=length(gl_PointCoord-.5)*2.;if(q>1.)discard;gl_FragColor=vec4(1.,.3,.015,pow(1.-q,2.)*a);}`,
    }),
  );
  sparks.frustumCulled = false;
  scene.add(sparks);
  const egg = createEgg(scene),
    meteors = createMeteors(scene);
  const light = new THREE.PointLight(0xff600a, 14, 16, 2);
  scene.add(light);
  let enabled = true;
  return {
    counts,
    setEnabled(v) {
      enabled = v;
    },
    cacheReleasePose() {
      meteors.cache(actor);
    },
    update(t, camera, root, velocity, scale) {
      egg.update(t);
      meteors.update(t, camera);
      const visible = enabled && t >= 2.94;
      fire.mesh.visible = sparks.visible = visible;
      const pulse = Math.exp(-(((t - 18.95) / 0.3) ** 2)),
        birth = ramp(t, 2.94, 3.4);
      const intensity = (1 + 0.35 * ramp(t, 16.2, 18.2) + 1.3 * pulse) * birth;
      if (visible) {
        for (let i = 0; i < indices.length; i++) {
          mesh.getVertexPosition(indices[i], V);
          mesh.localToWorld(V);
          P.copy(camera.position)
            .sub(V)
            .normalize()
            .multiplyScalar(0.035 * scale);
          V.add(P);
          fire.anchors[i * 3] = V.x;
          fire.anchors[i * 3 + 1] = V.y;
          fire.anchors[i * 3 + 2] = V.z;
        }
        fire.update(t, intensity, Math.max(0.16, scale), velocity);
        for (let i = 0; i < sparkCount; i++) {
          const k = (i * 13) % indices.length;
          sparkPos[i * 3] = fire.anchors[k * 3];
          sparkPos[i * 3 + 1] = fire.anchors[k * 3 + 1];
          sparkPos[i * 3 + 2] = fire.anchors[k * 3 + 2];
        }
        sg.attributes.position.needsUpdate = true;
        sparks.material.uniforms.time.value = t;
      }
      light.position.copy(root);
      light.intensity = enabled ? 9 + 3 * birth + 10 * pulse : 0;
    },
  };
}
