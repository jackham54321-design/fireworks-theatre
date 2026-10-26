import * as THREE from "../../../vendor/three/build/three.module.js";

const vertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const cloudFragment = `precision highp float;
varying vec2 vUv;
uniform sampler2D sceneColor,sceneDepth;
uniform mat4 inverseProjection,cameraWorld;
uniform vec3 eye,hero,flashA,flashB;
uniform float time,storm;
float h(vec3 p){p=fract(p*.3183099+vec3(.11,.17,.23));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+1.),f.x),f.y),f.z);}
float density(vec3 p){
 float reveal=smoothstep(1.25,5.3,time);
 float baseTop=3.3-7.5*reveal;
 // Skip guaranteed empty air before evaluating four octaves of cloud noise.
 if(p.y>baseTop+5.&&p.y<12.5)return 0.;
 vec3 q=p*vec3(.24,.32,.24)+vec3(time*.035,-time*.014,0.);
 float broad=noise3(q*.53);
 float top=baseTop+(broad-.5)*8.;
 float bed=(1.-smoothstep(top-1.2,top+1.0,p.y)) * smoothstep(-9.,-5.5,p.y);
 float horizontal=(1.-smoothstep(17.,29.,abs(p.x+2.))) * smoothstep(-36.,-26.,p.z)*(1.-smoothstep(-5.,1.,p.z));
 float ceiling=smoothstep(12.5,17.,p.y)*(1.-smoothstep(21.,25.,p.y))*smoothstep(-43.,-30.,p.z)*(1.-smoothstep(-9.,-3.,p.z));
 if(bed*horizontal+ceiling<.0001)return 0.;
 float n=noise3(q)*.62+noise3(q*2.31+6.7)*.25+noise3(q*5.13)*.13;
 float billow=smoothstep(.36,.69,n);
 float cavity=1.-smoothstep(1.2,4.7,length((p-hero)*vec3(.75,1.,.7)));
 bed*=1.-cavity*smoothstep(1.75,3.7,time)*.82;
 float opening=(.50-.23*reveal)*bed*horizontal;
 float end=1.-smoothstep(16.0,18.5,time);
 return (opening+ceiling*.16)*billow*end;
}
void main(){
 if(time>=18.5){gl_FragColor=vec4(0.);return;}
 vec4 farPoint=inverseProjection*vec4(vUv*2.-1.,1.,1.);vec3 ray=normalize((cameraWorld*vec4(farPoint.xyz/farPoint.w,0.)).xyz);
 float depth=texture2D(sceneDepth,vUv).x;vec4 view=inverseProjection*vec4(vUv*2.-1.,depth*2.-1.,1.);
 float limit=depth>.99999?150.:length(view.xyz/view.w);
 vec3 inv=1./(ray+vec3(.000001));vec3 a=(vec3(-32,-9,-44)-eye)*inv,b=(vec3(32,25,2)-eye)*inv;
 vec3 lo=min(a,b),hi=max(a,b);float start=max(0.,max(lo.x,max(lo.y,lo.z))),end=min(limit,min(hi.x,min(hi.y,hi.z)));
 vec3 sum=vec3(0.);float trans=1.;
 if(end>start){
  float stepSize=(end-start)/40.;float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
  for(int i=0;i<40;i++){
   vec3 p=eye+ray*(start+(float(i)+jitter)*stepSize);float d=density(p);
   if(d>.003){
    float shadow=exp(-density(p+vec3(-1.3,1.9,1.1))*11.);
    float rim=pow(max(0.,dot(ray,normalize(vec3(-.4,.7,-.5)))),4.);
    vec3 light=mix(vec3(.005,.012,.022),vec3(.055,.090,.12),shadow)+rim*vec3(.020,.040,.065);
    float fa=1./(1.+dot(p-flashA,p-flashA)*.025),fb=1./(1.+dot(p-flashB,p-flashB)*.035);
    light+=storm*(fa+fb*.6)*vec3(.17,.38,.74);
    float alpha=1.-exp(-d*stepSize*1.45);sum+=trans*alpha*light;trans*=1.-alpha;
   }
   if(trans<.015)break;
  }
 }
 gl_FragColor=vec4(sum,1.-trans);
}`;
const combineFragment = `varying vec2 vUv;uniform sampler2D base,cloud;void main(){vec4 c=texture2D(cloud,vUv);gl_FragColor=vec4(texture2D(base,vUv).rgb*(1.-c.a)+c.rgb,1.);}`;
const brightFragment = `varying vec2 vUv;uniform sampler2D source;void main(){vec3 c=texture2D(source,vUv).rgb;float l=max(c.r,max(c.g,c.b));float w=smoothstep(.78,2.1,l);gl_FragColor=vec4(c*w,1.);}`;
const blurFragment = `varying vec2 vUv;uniform sampler2D source;uniform vec2 direction;void main(){vec3 c=texture2D(source,vUv).rgb*.227027;c+=(texture2D(source,vUv+direction*1.384615).rgb+texture2D(source,vUv-direction*1.384615).rgb)*.316216;c+=(texture2D(source,vUv+direction*3.230769).rgb+texture2D(source,vUv-direction*3.230769).rgb)*.070270;gl_FragColor=vec4(c,1.);}`;
const finalFragment = `varying vec2 vUv;uniform sampler2D source,bloom;uniform float time;void main(){vec3 c=texture2D(source,vUv).rgb+texture2D(bloom,vUv).rgb*.28;vec2 q=vUv-.5;float vignette=1.-.20*smoothstep(.20,.74,length(q));c*=vignette;gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

// HDR stays linear until the last pass. Clouds integrate only up to scene depth.
export function createDragonPipeline(renderer) {
  const options = {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
  };
  const sceneRT = new THREE.WebGLRenderTarget(1, 1, {
    ...options,
    depthBuffer: true,
    samples: 4,
  });
  sceneRT.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
  const clouds = new THREE.WebGLRenderTarget(1, 1, options),
    combined = new THREE.WebGLRenderTarget(1, 1, options),
    bright = new THREE.WebGLRenderTarget(1, 1, options),
    blurA = new THREE.WebGLRenderTarget(1, 1, options),
    blurB = new THREE.WebGLRenderTarget(1, 1, options);
  const postScene = new THREE.Scene(),
    postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
    quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  postScene.add(quad);
  const make = (fragmentShader, uniforms, toneMapped = false) =>
    new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
      toneMapped,
    });
  const cloud = make(cloudFragment, {
    sceneColor: { value: sceneRT.texture },
    sceneDepth: { value: sceneRT.depthTexture },
    inverseProjection: { value: new THREE.Matrix4() },
    cameraWorld: { value: new THREE.Matrix4() },
    eye: { value: new THREE.Vector3() },
    hero: { value: new THREE.Vector3() },
    flashA: { value: new THREE.Vector3() },
    flashB: { value: new THREE.Vector3() },
    time: { value: 0 },
    storm: { value: 0 },
  });
  const combine = make(combineFragment, {
      base: { value: sceneRT.texture },
      cloud: { value: clouds.texture },
    }),
    extract = make(brightFragment, { source: { value: combined.texture } }),
    blur = make(blurFragment, {
      source: { value: null },
      direction: { value: new THREE.Vector2() },
    }),
    finish = make(
      finalFragment,
      {
        source: { value: combined.texture },
        bloom: { value: blurB.texture },
        time: { value: 0 },
      },
      true,
    );
  let size = "",
    lastPasses = 7;
  const bufferSize = new THREE.Vector2();
  function pass(material, target) {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(postScene, postCamera);
  }
  return {
    render(scene, camera, time, head, storm) {
      renderer.getDrawingBufferSize(bufferSize);
      const w = bufferSize.x,
        h = bufferSize.y,
        key = w + ":" + h;
      if (key !== size) {
        size = key;
        sceneRT.setSize(w, h);
        combined.setSize(w, h);
        const scale = Math.min(0.5, 768 / w);
        clouds.setSize(
          Math.max(1, Math.round(w * scale)),
          Math.max(1, Math.round(h * scale)),
        );
        for (const rt of [bright, blurA, blurB])
          rt.setSize(
            Math.max(1, Math.ceil(w / 4)),
            Math.max(1, Math.ceil(h / 4)),
          );
      }
      const previous = renderer.getRenderTarget();
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, camera);
      cloud.uniforms.inverseProjection.value.copy(
        camera.projectionMatrixInverse,
      );
      cloud.uniforms.cameraWorld.value.copy(camera.matrixWorld);
      cloud.uniforms.eye.value.copy(camera.position);
      cloud.uniforms.hero.value.copy(head);
      cloud.uniforms.time.value = time;
      cloud.uniforms.storm.value = storm.energy;
      cloud.uniforms.flashA.value.copy(storm.a);
      cloud.uniforms.flashB.value.copy(storm.b);
      // Clouds have fully cleared before the charge; avoid two full-screen passes.
      const clear = time >= 18.5;
      lastPasses = clear ? 5 : 7;
      if (!clear) {
        pass(cloud, clouds);
        pass(combine, combined);
      }
      extract.uniforms.source.value = clear
        ? sceneRT.texture
        : combined.texture;
      finish.uniforms.source.value = extract.uniforms.source.value;
      pass(extract, bright);
      blur.uniforms.source.value = bright.texture;
      blur.uniforms.direction.value.set(1 / bright.width, 0);
      pass(blur, blurA);
      blur.uniforms.source.value = blurA.texture;
      blur.uniforms.direction.value.set(0, 1 / bright.height);
      pass(blur, blurB);
      finish.uniforms.time.value = time;
      pass(finish, previous);
    },
    dispose() {
      for (const rt of [sceneRT, clouds, combined, bright, blurA, blurB])
        rt.dispose();
      for (const mat of [cloud, combine, extract, blur, finish]) mat.dispose();
      quad.geometry.dispose();
    },
    get stats() {
      return {
        cloudSteps: 40,
        cloudResolution: [clouds.width, clouds.height],
        passes: lastPasses,
        depthOcclusion: true,
      };
    },
  };
}
