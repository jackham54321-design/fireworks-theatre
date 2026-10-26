// Continuous, planar cutout animation. No pose atlas stepping or optical flow.
const clamp = (x) => Math.max(0, Math.min(1, x)),
  smooth = (x) => {
    x = clamp(x);
    return x * x * (3 - 2 * x);
  },
  ramp = (a, b, x) => smooth((x - a) / (b - a));
const turnEase = (x) => {
  x = clamp(x);
  return x * x * x * (10 + x * (-15 + 6 * x));
};
export function facingAt(t, part = "shoulders") {
  const lead = part === "head" ? 0.15 : part === "tail" ? -0.14 : 0;
  // A single eased direction curve avoids concentrating the whole reversal
  // into the middle few frames of cos(pi * smoothstep(t)).
  if (t < 9) return 1 - 2 * turnEase((t - (6.9 - lead)) / 1.75);
  const start = part === "head" ? 9.98 : part === "tail" ? 10.23 : 10.1,
    end = part === "head" ? 11.42 : 11.6;
  return -1 + turnEase((t - start) / (end - start));
}
export function rigState(t) {
  return [
    facingAt(t),
    facingAt(t, "head"),
    facingAt(t, "tail"),
    ramp(3.9, 4.9, t) * (1 - 0.78 * ramp(10.8, 12.2, t)),
  ];
}
// Shared scene anchor for detached dream plumes, expressed in the rig's 2D plane.
export function tailPoint(i, a, t) {
  const [face, , tail] = rigState(t),
    front = 1 - tail * tail,
    phase = (t - 4.7) * 5.61;
  const angle =
      -tail * 1.05 +
      i * (0.32 - 0.06 * tail * tail) +
      Math.sin(phase * 0.71 + Math.abs(i) * 0.65) * 0.035 * tail +
      Math.sign(i) * Math.sin(phase * 0.45 + Math.abs(i) * 0.6) * 0.014 * front,
    length = 350 + 90 * tail * tail - Math.abs(i) * (10 + 10 * tail * tail);
  const end = { x: Math.sin(angle) * length, y: Math.cos(angle) * length };
  const c1 = { x: -tail * 90, y: 78 },
    c2 = {
      x: end.x * 0.8 - tail * 30 * tail * tail,
      y: end.y * 0.82 + 45 * tail * tail,
    },
    b = 1 - a;
  return {
    x:
      -82 * face +
      3 * b * b * a * c1.x +
      3 * b * a * a * c2.x +
      a * a * a * end.x,
    y: 72 + 3 * b * b * a * c1.y + 3 * b * a * a * c2.y + a * a * a * end.y,
  };
}
const vertex = `#version 300 es
precision highp float;precision highp int;
layout(location=0) in vec2 aUV;
uniform vec2 uViewport;uniform vec4 uPose;uniform vec4 uState;
uniform float uTime;uniform float uSide;uniform float uWeight;uniform float uRatio;uniform float uHorizon;uniform float uTrail;uniform float uFeather;
uniform sampler2D uContours;
uniform int uPart;uniform int uFront;uniform int uParticles;
out vec2 vUV;out float vAlpha;out float vBorn;out float vArrived;
out vec2 vBodySideUV;out vec2 vBodyFrontUV;out float vBodyBlend;
float sat(float x){return clamp(x,0.,1.);}float hash(float x){return fract(sin(x*127.1+311.7)*43758.5453);}
vec2 rot(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}
vec2 localPoint(vec2 uv){
 vec2 src=uv*vec2(768.,512.);float face=uState.x,head=uState.y,tail=uState.z,phase=(uTime-4.7)*5.61;
 if(uPart==0){
  float away=.5*(sqrt(face*face+.01)-uSide*face);
  vec2 p=(src-vec2(720.,450.))*(.62-.22*away);
  float reach=sat(length(p)/440.);float a=(.04+.33*sin(phase-.56*reach-.10*away))*uState.w;
  p=rot(p,a);p.x*=uSide;
  return p+vec2(-uSide*18.,-3.);
 }
 if(uPart==1){
  // Registered scanline coordinates give both paint views the same silhouette.
  // Morph geometry first; crossfade pigment only after the outlines coincide.
  float y=src.y,sy=y<160.?20.+y*.875:y,fy=y>280.?280.+(y-280.)*.84:y;
  float headMask=1.-smoothstep(110.,195.,y),direction=mix(face,head,headMask);
  float blend=1.-smoothstep(.18,.98,abs(direction)),hand=direction<0.?-1.:1.;
  vec4 side=texelFetch(uContours,ivec2(0,int(clamp(sy,0.,511.))),0);
  vec4 front=texelFetch(uContours,ivec2(1,int(clamp(fy,0.,511.))),0);
  float sa=(sy-280.)/200.,cx=sa<0.?mix(558.,595.,sat(-sa)):mix(558.,410.,sat(sa/.75));
  float left=(hand>0.?side.x-cx:cx-side.y)*.52,right=(hand>0.?side.y-cx:cx-side.x)*.52;
  float frontWidth=max(1.,395.-front.x)*.52;
  vec2 p=vec2(mix(mix(left,right,uv.x),mix(-frontWidth,frontWidth,uv.x),blend),(mix(sy,fy,blend)-280.)*.52);
  float a=(y-280.)/200.;
  // The neck leads; the hips and shoulder feather coverts follow.
  float center=a<0.?30.*head*sat(-a):-82.*face*sat(a);
  p.x+=center;
  p.x+=sin(uTime*3.6+a*4.)*2.0*smoothstep(.15,.8,a)*abs(face);
  vBodySideUV=vec2(mix(side.x,side.y,hand>0.?uv.x:1.-uv.x)/768.,sy/512.);
  vBodyFrontUV=vec2((395.-abs(mix(-frontWidth,frontWidth,uv.x)/.52))/768.,fy/512.);
  vBodyBlend=blend;
  return p;
 }
 float a=sat((src.y-12.)/490.),i=uFeather,front=1.-tail*tail;
 vec2 root=vec2(-82.*face,72.);
 float angle=-tail*1.05+i*(.32-.06*tail*tail)+sin(phase*.71+abs(i)*.65)*.035*tail+sign(i)*sin(phase*.45+abs(i)*.6)*.014*front;
 float length=350.+90.*tail*tail-abs(i)*(10.+10.*tail*tail);
 vec2 end=vec2(sin(angle),cos(angle))*length;
 vec2 c1=vec2(-tail*90.,78.),c2=vec2(end.x*.80-tail*30.*tail*tail,end.y*.82+45.*tail*tail);
 float b=1.-a;
 vec2 p=3.*b*b*a*c1+3.*b*a*a*c2+a*a*a*end;
 vec2 tangent=normalize(3.*b*b*c1+6.*b*a*(c2-c1)+3.*a*a*(end-c2)+vec2(0.,.00001));
 vec2 normal=vec2(tangent.y,-tangent.x);
 // Each plume has its own non-collapsing strip and never changes source pose.
 float width=(.39-.018*abs(i))*(i<0.?-1.:1.);
 p+=normal*(src.x-384.)*width;
 return root+p;
}
void main(){
 vUV=aUV;vBodySideUV=vec2(0.);vBodyFrontUV=vec2(0.);vBodyBlend=0.;float seed=hash(aUV.x*111.+aUV.y*813.+float(uPart)*57.);
 vec2 p=localPoint(aUV);
 // Arrival is anatomical: head, wings and finally the long tail.
 float rank=uPart==1?sat((p.y+130.)/220.)*.28:uPart==0?.18+sat(length(p)/450.)*.35:.43+sat((p.y-70.)/300.)*.57;
 vBorn=1.76+rank*.38+seed*.12;vArrived=2.55+rank*1.55+seed*.15;
 vec2 target=uPose.xy+rot(p*uPose.z,uPose.w);
 vAlpha=uWeight;
 if(uParticles==1){
  float age=uTime-uTrail,u=sat((age-vBorn)/(vArrived-vBorn)),s=u*u*(3.-2.*u);
  vec2 origin=vec2(uViewport.x*.5,uHorizon*.65),delta=target-origin,normal=normalize(vec2(-delta.y,delta.x)+vec2(.0001));
  target=mix(origin,target,s)+normal*sin(u*3.14159265)*(seed-.5)*115.*uPose.z;
  vAlpha*=smoothstep(vBorn,vBorn+.13,age)*(1.-smoothstep(vArrived-.05,vArrived+.36,age));
  if(uTrail>0.)vAlpha*=.18;
  gl_PointSize=(1.4+seed*.8)*uRatio;
 }
 gl_Position=vec4(target/uViewport*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);
}`;
const fragment = `#version 300 es
precision highp float;precision highp int;
uniform sampler2D uArt;uniform sampler2D uBodyArt;uniform vec4 uRect;uniform float uTime;uniform int uParticles;uniform int uFront;uniform int uPart;
in vec2 vUV;in float vAlpha;in float vBorn;in float vArrived;out vec4 outColor;
in vec2 vBodySideUV;in vec2 vBodyFrontUV;in float vBodyBlend;
vec4 premul(vec4 c){return vec4(c.rgb*c.a,c.a);}
void main(){
 vec2 uv=vUV;
 if(uFront==1){float center=uPart==1?395./768.:.5;uv.x=center-abs(uv.x-center);}
 vec4 c=texture(uArt,uRect.xy+clamp(uv,vec2(.002),vec2(.998))*uRect.zw);
 if(uPart==1){
  vec4 a=texture(uArt,uRect.xy+vBodySideUV*uRect.zw),b=texture(uBodyArt,vec2(vBodyFrontUV.x*.5,.5+vBodyFrontUV.y*.5));
  a.a=smoothstep(.08,.68,a.a);b.a=smoothstep(.08,.68,b.a);
  vec4 merged=mix(premul(a),premul(b),vBodyBlend);
  c=vec4(merged.rgb/max(merged.a,.00001),merged.a);
 }
 // Sharpen individual paint masks before blending; sharpening the blended mask
 // used to erase intermediate feather edges and then make them pop back in.
 float a=(uPart==1?c.a:smoothstep(.08,.68,c.a))*vAlpha;
 if(uParticles==1){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;a*=pow(1.-r,1.35)*.8;}
 else a*=smoothstep(vArrived-.26,vArrived+.20,uTime)*(.91+.07*sin(uTime*3.+vUV.y*15.));
 if(a<.001)discard;
 vec3 color=c.rgb*1.12+vec3(.025,.012,.002);
 outColor=vec4(color*a,a);
}`;
function shader(gl, type, s) {
  const v = gl.createShader(type);
  gl.shaderSource(v, s);
  gl.compileShader(v);
  if (!gl.getShaderParameter(v, gl.COMPILE_STATUS))
    throw Error(gl.getShaderInfoLog(v));
  return v;
}
export function createPhoenixRig(images) {
  const canvas = document.createElement("canvas"),
    gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      depth: false,
    });
  if (!gl) throw Error("This 2D review requires WebGL2");
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, shader(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const names = [
      "Viewport",
      "Pose",
      "State",
      "Time",
      "Side",
      "Weight",
      "Ratio",
      "Horizon",
      "Trail",
      "Part",
      "Front",
      "Particles",
      "Rect",
      "Art",
      "Feather",
      "BodyArt",
      "Contours",
    ],
    u = Object.fromEntries(
      names.map((n) => [n, gl.getUniformLocation(program, "u" + n)]),
    );
  const texture = (image) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image,
      );
      for (const [name, value] of [
        [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
        [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
        [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
        [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
      ])
        gl.texParameteri(gl.TEXTURE_2D, name, value);
      return t;
    },
    textures = images.map(texture);
  // Alpha is read once on initialization, never per animation frame. The narrow
  // contour table retargets paint without extra generated images or optical flow.
  const scan = document.createElement("canvas");
  scan.width = 768;
  scan.height = 512;
  const scanCtx = scan.getContext("2d", { willReadFrequently: true }),
    rows = [];
  for (const [source, cell] of [
    [0, 0],
    [1, 2],
  ]) {
    scanCtx.clearRect(0, 0, 768, 512);
    scanCtx.drawImage(
      images[source],
      (cell % 2) * 768,
      Math.floor(cell / 2) * 512,
      768,
      512,
      0,
      0,
      768,
      512,
    );
    const pixels = scanCtx.getImageData(0, 0, 768, 512).data,
      raw = [];
    for (let y = 0; y < 512; y++) {
      let left = 768,
        right = -1;
      for (let x = 0; x < 768; x++)
        if (pixels[(y * 768 + x) * 4 + 3] > 36) {
          left = Math.min(left, x);
          right = Math.max(right, x);
        }
      raw.push([left, right]);
    }
    for (let y = 0; y < 512; y++) {
      if (raw[y][1] < 0) {
        let k = 1;
        while (y - k >= 0 || y + k < 512) {
          const next =
            raw[Math.min(511, y + k)][1] >= 0
              ? raw[Math.min(511, y + k)]
              : raw[Math.max(0, y - k)];
          if (next[1] >= 0) {
            raw[y] = next;
            break;
          }
          k++;
        }
      }
    }
    rows.push(
      raw.map((_, y) => {
        const neighbours = raw.slice(Math.max(0, y - 2), Math.min(512, y + 3));
        return [
          Math.max(0, Math.min(...neighbours.map((n) => n[0])) - 2),
          Math.min(767, Math.max(...neighbours.map((n) => n[1])) + 2),
        ];
      }),
    );
  }
  const contourData = new Float32Array(2 * 512 * 4);
  for (let y = 0; y < 512; y++)
    for (let i = 0; i < 2; i++)
      contourData.set([...rows[i][y], 0, 0], (y * 2 + i) * 4);
  const contours = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, contours);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA32F,
    2,
    512,
    0,
    gl.RGBA,
    gl.FLOAT,
    contourData,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const grid = (nx, ny) => {
      const values = [];
      for (let y = 0; y < ny; y++)
        for (let x = 0; x < nx; x++)
          for (const [a, b] of [
            [x, y],
            [x + 1, y],
            [x, y + 1],
            [x + 1, y],
            [x + 1, y + 1],
            [x, y + 1],
          ])
            values.push(a / nx, b / ny);
      return values;
    },
    geometry = grid(44, 32),
    bodyGeometry = grid(32, 128),
    sparks = [];
  for (let y = 0; y < 28; y++)
    for (let x = 0; x < 42; x++) sparks.push((x + 0.5) / 42, (y + 0.5) / 28);
  const buffer = (values) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
      return b;
    },
    mesh = buffer(geometry),
    bodyMesh = buffer(bodyGeometry),
    points = buffer(sparks),
    vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(0);
  let lost = false;
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
  });
  return {
    render(t, view, pose, onlyPart = -1) {
      if (lost) return null;
      const ratio = Math.min(2, view.ratio);
      const width = Math.round(view.width * ratio),
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
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      const state = rigState(t);
      gl.uniform2f(u.Viewport, view.width, view.height);
      gl.uniform4f(u.Pose, pose.x, pose.y, pose.unit, pose.rotation);
      gl.uniform4fv(u.State, state);
      gl.uniform1f(u.Time, t);
      gl.uniform1f(u.Ratio, ratio);
      gl.uniform1f(u.Horizon, view.horizon);
      gl.uniform1i(u.Art, 0);
      gl.uniform1i(u.BodyArt, 1);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textures[1]);
      gl.uniform1i(u.Contours, 2);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, contours);
      // Each wing stays attached to its shoulder; body coverts conceal the roots.
      const plumes = [-2, 2, -1, 1, 0].map((i) => ({
        part: 2,
        side: 1,
        source: 2,
        cell: Math.abs(i) === 1 ? 1 : 0,
        weight: 1,
        front: i === 0 ? 1 : 0,
        feather: i,
      }));
      const layers = [
        { part: 0, side: -1, source: 0, cell: 1, weight: 1 },
        ...plumes,
        { part: 0, side: 1, source: 0, cell: 1, weight: 1 },
        { part: 1, side: 1, source: 0, cell: 0, weight: 1 },
      ];
      for (const particles of t < 4.7 ? [1, 0] : [0]) {
        gl.uniform1i(u.Particles, particles);
        for (const layer of layers) {
          if (
            layer.weight < 0.00001 ||
            (onlyPart >= 0 && layer.part !== onlyPart)
          )
            continue;
          const values = particles
            ? sparks
            : layer.part === 1
              ? bodyGeometry
              : geometry;
          gl.bindBuffer(
            gl.ARRAY_BUFFER,
            particles ? points : layer.part === 1 ? bodyMesh : mesh,
          );
          gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, textures[layer.source]);
          gl.uniform4f(
            u.Rect,
            (layer.cell % 2) * 0.5,
            Math.floor(layer.cell / 2) * 0.5,
            0.5,
            0.5,
          );
          gl.uniform1i(u.Part, layer.part);
          gl.uniform1i(u.Front, layer.front || 0);
          gl.uniform1f(u.Feather, layer.feather || 0);
          gl.uniform1f(u.Side, layer.side);
          gl.uniform1f(u.Weight, layer.weight * pose.opacity);
          gl.uniform1f(u.Trail, 0);
          gl.drawArrays(
            particles ? gl.POINTS : gl.TRIANGLES,
            0,
            values.length / 2,
          );
          if (particles)
            for (const trail of [0.04, 0.08]) {
              gl.uniform1f(u.Trail, trail);
              gl.drawArrays(gl.POINTS, 0, sparks.length / 2);
            }
        }
      }
      return canvas;
    },
  };
}
