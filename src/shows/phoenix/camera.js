import * as THREE from "../../../vendor/three/build/three.module.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (v) => {
  v = clamp(v, 0, 1);
  return v * v * v * (10 + v * (-15 + 6 * v));
};
const ramp = (t, a, b) => ease((t - a) / (b - a));
export function createAtmosphere(scene) {
  const group = new THREE.Group();
  group.name = "Layered dawn sky";
  scene.add(group);
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { lift: { value: 0 } },
    vertexShader: `varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 direction;uniform float lift;void main(){vec3 d=normalize(direction);float h=smoothstep(-.35,.85,d.y);vec3 col=mix(vec3(.055,.078,.12),vec3(.006,.014,.035),h);float halo=pow(max(0.,dot(d,normalize(vec3(-.08,.95,-.25)))),10.);col+=vec3(.16,.20,.25)*halo*(.15+.85*lift);gl_FragColor=vec4(col,1.);}`,
  });
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(160, 32, 20),
    skyMaterial,
  );
  sky.renderOrder = -20;
  group.add(sky);
  const clouds = [];
  for (let i = 0; i < 5; i++) {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        lift: { value: 0 },
        seed: { value: i * 7.13 },
      },
      vertexShader: `varying vec3 world;void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
      fragmentShader: `precision highp float;varying vec3 world;uniform float time,lift,seed;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){float v=0.,a=.5;for(int j=0;j<5;j++){v+=a*noise(p);p=mat2(.8,-.6,.6,.8)*p*2.07+3.1;a*=.5;}return v;}
    void main(){vec2 p=world.xz*.095+vec2(seed,time*.014);float n=fbm(p);float fine=fbm(p*2.7+8.);float density=smoothstep(.35,.69,n+.11*fine);float aperture=smoothstep(2.4,6.5,length(world.xz-vec2(0,1.75)));float edge=pow(clamp(1.-abs(n-.48)*6.,0.,1.),3.);vec3 cold=vec3(.09,.14,.23);vec3 warm=vec3(.40,.36,.27);vec3 col=mix(cold,warm,lift*.3)+edge*vec3(.23,.17,.075)*lift;float alpha=density*aperture*(.05+.10*lift);gl_FragColor=vec4(col,alpha);}`,
    });
    const cloud = new THREE.Mesh(new THREE.PlaneGeometry(105, 105), material);
    cloud.rotation.x = -Math.PI / 2;
    cloud.position.set(0, 10.5 + i * 3.25, 0);
    cloud.renderOrder = i;
    clouds.push(cloud);
    group.add(cloud);
  }
  return {
    group,
    update(t) {
      const lift = ramp(t, 20.5, 26.5);
      skyMaterial.uniforms.lift.value = lift;
      for (const c of clouds) {
        c.material.uniforms.time.value = t;
        c.material.uniforms.lift.value = lift;
      }
    },
  };
}

function flightCamera(camera, controls, t, aspect, altitude) {
  // Dance camera, with no underside ascent view.
  const reveal = ramp(t, 6.8, 9.2) * (1 - ramp(t, 10.5, 12.3));
  const climb = ramp(t, 11.6, 14.2);
  const position = new THREE.Vector3(
    7.6 - 2.3 * reveal - 6.3 * climb,
    6.1 - 1.1 * reveal - 5.0 * climb,
    16 - 1.5 * reveal - 4 * climb - 7 * ramp(t, 14.5, 17),
  );
  const target = new THREE.Vector3(0.3 * reveal, 0.8 + 1.2 * reveal, -0.4);
  if (t > 11.6) {
    const follow = Math.min(29, altitude * 0.75);
    target.lerp(new THREE.Vector3(0, follow, 1.75), climb);
  }
  camera.position.copy(position);
  controls.target.copy(target);
  controls.update();
}

export function cinematicCamera(camera, controls, t, aspect, altitude) {
  const portrait = aspect < 0.9;
  if (t < 5) {
    const k = ramp(t, 2.8, 5);
    camera.position.set(1.4 + 6.2 * k, 3.1 + 3 * k, 5.9 + 10.1 * k);
    controls.target.set(-2.6 * (1 - k), 1.2 + 0.6 * k, -4.1 + 3.7 * k);
  } else if (t < 20.5) {
    flightCamera(camera, controls, t - 5, aspect, altitude);
    controls.target.y += 1;
    const align = ramp(t, 14, 16.3),
      charge = ramp(t, 16.3, 18.1),
      release = ramp(t, 18.35, 19.75);
    camera.position.lerp(new THREE.Vector3(0, 3.7, 17.5 - charge), align);
    controls.target.lerp(new THREE.Vector3(0, 3.15, 1.55), align);
    camera.position.lerp(new THREE.Vector3(0, 6.9, 24.5), release);
    controls.target.lerp(new THREE.Vector3(0, 5.85, 1.55), release);
  } else {
    const bridge = ramp(t, 20.5, 22.2),
      wide = ramp(t, 23.2, 27),
      followLag = 1.4 * ramp(t, 20.8, 25.0);
    const heroPosition = new THREE.Vector3(
      4.3 + 4.2 * wide,
      altitude + 3.7 + 5.5 * wide - followLag,
      21 + 8 * wide,
    );
    const heroTarget = new THREE.Vector3(0, altitude + 0.55 - followLag, 1.75);
    camera.position.lerpVectors(
      new THREE.Vector3(0, 6.9, 24.5),
      heroPosition,
      bridge,
    );
    controls.target.lerpVectors(
      new THREE.Vector3(0, 5.85, 1.55),
      heroTarget,
      bridge,
    );
  }
  if (portrait) {
    camera.position
      .sub(controls.target)
      .multiplyScalar(Math.max(1, 0.98 / aspect))
      .add(controls.target);
  }
  controls.update();
}
