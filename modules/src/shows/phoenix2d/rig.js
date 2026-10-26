const M=t=>Math.max(0,Math.min(1,t)),O=t=>(t=M(t),t*t*(3-2*t)),F=(t,a,e)=>O((e-t)/(a-t)),D=t=>(t=M(t),t*t*t*(10+t*(-15+6*t)));function P(t,a="shoulders"){const e=a==="head"?.15:a==="tail"?-.14:0;if(t<9)return 1-2*D((t-(6.9-e))/1.75);const l=a==="head"?9.98:a==="tail"?10.23:10.1,c=a==="head"?11.42:11.6;return-1+D((t-l)/(c-l))}function V(t){return[P(t),P(t,"head"),P(t,"tail"),F(3.9,4.9,t)*(1-.78*F(10.8,12.2,t))]}function Y(t,a,e){const[l,,c]=V(e),s=1-c*c,A=(e-4.7)*5.61,x=-c*1.05+t*(.32-.06*c*c)+Math.sin(A*.71+Math.abs(t)*.65)*.035*c+Math.sign(t)*Math.sin(A*.45+Math.abs(t)*.6)*.014*s,g=350+90*c*c-Math.abs(t)*(10+10*c*c),T={x:Math.sin(x)*g,y:Math.cos(x)*g},y={x:-c*90,y:78},E={x:T.x*.8-c*30*c*c,y:T.y*.82+45*c*c},v=1-a;return{x:-82*l+3*v*v*a*y.x+3*v*a*a*E.x+a*a*a*T.x,y:72+3*v*v*a*y.y+3*v*a*a*E.y+a*a*a*T.y}}const z=`#version 300 es
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
}`,H=`#version 300 es
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
}`;function X(t,a,e){const l=t.createShader(a);if(t.shaderSource(l,e),t.compileShader(l),!t.getShaderParameter(l,t.COMPILE_STATUS))throw Error(t.getShaderInfoLog(l));return l}function q(t){const a=document.createElement("canvas"),e=a.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!0,depth:!1});if(!e)throw Error("This 2D review requires WebGL2");const l=e.createProgram();if(e.attachShader(l,X(e,e.VERTEX_SHADER,z)),e.attachShader(l,X(e,e.FRAGMENT_SHADER,H)),e.linkProgram(l),!e.getProgramParameter(l,e.LINK_STATUS))throw Error(e.getProgramInfoLog(l));e.useProgram(l);const c=["Viewport","Pose","State","Time","Side","Weight","Ratio","Horizon","Trail","Part","Front","Particles","Rect","Art","Feather","BodyArt","Contours"],s=Object.fromEntries(c.map(i=>[i,e.getUniformLocation(l,"u"+i)])),A=i=>{const r=e.createTexture();e.bindTexture(e.TEXTURE_2D,r),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,i);for(const[h,n]of[[e.TEXTURE_MIN_FILTER,e.LINEAR],[e.TEXTURE_MAG_FILTER,e.LINEAR],[e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE],[e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE]])e.texParameteri(e.TEXTURE_2D,h,n);return r},x=t.map(A),g=document.createElement("canvas");g.width=768,g.height=512;const T=g.getContext("2d",{willReadFrequently:!0}),y=[];for(const[i,r]of[[0,0],[1,2]]){T.clearRect(0,0,768,512),T.drawImage(t[i],r%2*768,Math.floor(r/2)*512,768,512,0,0,768,512);const h=T.getImageData(0,0,768,512).data,n=[];for(let o=0;o<512;o++){let u=768,f=-1;for(let m=0;m<768;m++)h[(o*768+m)*4+3]>36&&(u=Math.min(u,m),f=Math.max(f,m));n.push([u,f])}for(let o=0;o<512;o++)if(n[o][1]<0){let u=1;for(;o-u>=0||o+u<512;){const f=n[Math.min(511,o+u)][1]>=0?n[Math.min(511,o+u)]:n[Math.max(0,o-u)];if(f[1]>=0){n[o]=f;break}u++}}y.push(n.map((o,u)=>{const f=n.slice(Math.max(0,u-2),Math.min(512,u+3));return[Math.max(0,Math.min(...f.map(m=>m[0]))-2),Math.min(767,Math.max(...f.map(m=>m[1]))+2)]}))}const E=new Float32Array(2*512*4);for(let i=0;i<512;i++)for(let r=0;r<2;r++)E.set([...y[r][i],0,0],(i*2+r)*4);const v=e.createTexture();e.bindTexture(e.TEXTURE_2D,v),e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,2,512,0,e.RGBA,e.FLOAT,E),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);const _=(i,r)=>{const h=[];for(let n=0;n<r;n++)for(let o=0;o<i;o++)for(const[u,f]of[[o,n],[o+1,n],[o,n+1],[o+1,n],[o+1,n+1],[o,n+1]])h.push(u/i,f/r);return h},U=_(44,32),B=_(32,128),R=[];for(let i=0;i<28;i++)for(let r=0;r<42;r++)R.push((r+.5)/42,(i+.5)/28);const b=i=>{const r=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,r),e.bufferData(e.ARRAY_BUFFER,new Float32Array(i),e.STATIC_DRAW),r},I=b(U),L=b(B),C=b(R),S=e.createVertexArray();e.bindVertexArray(S),e.enableVertexAttribArray(0);let w=!1;return a.addEventListener("webglcontextlost",i=>{i.preventDefault(),w=!0}),{render(i,r,h,n=-1){if(w)return null;const o=Math.min(2,r.ratio),u=Math.round(r.width*o),f=Math.round(r.height*o);(a.width!==u||a.height!==f)&&(a.width=u,a.height=f),e.viewport(0,0,u,f),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.disable(e.DEPTH_TEST),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.useProgram(l),e.bindVertexArray(S);const m=V(i);e.uniform2f(s.Viewport,r.width,r.height),e.uniform4f(s.Pose,h.x,h.y,h.unit,h.rotation),e.uniform4fv(s.State,m),e.uniform1f(s.Time,i),e.uniform1f(s.Ratio,o),e.uniform1f(s.Horizon,r.horizon),e.uniform1i(s.Art,0),e.uniform1i(s.BodyArt,1),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,x[1]),e.uniform1i(s.Contours,2),e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,v);const N=[-2,2,-1,1,0].map(p=>({part:2,side:1,source:2,cell:Math.abs(p)===1?1:0,weight:1,front:p===0?1:0,feather:p})),G=[{part:0,side:-1,source:0,cell:1,weight:1},...N,{part:0,side:1,source:0,cell:1,weight:1},{part:1,side:1,source:0,cell:0,weight:1}];for(const p of i<4.7?[1,0]:[0]){e.uniform1i(s.Particles,p);for(const d of G){if(d.weight<1e-5||n>=0&&d.part!==n)continue;const W=p?R:d.part===1?B:U;if(e.bindBuffer(e.ARRAY_BUFFER,p?C:d.part===1?L:I),e.vertexAttribPointer(0,2,e.FLOAT,!1,8,0),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,x[d.source]),e.uniform4f(s.Rect,d.cell%2*.5,Math.floor(d.cell/2)*.5,.5,.5),e.uniform1i(s.Part,d.part),e.uniform1i(s.Front,d.front||0),e.uniform1f(s.Feather,d.feather||0),e.uniform1f(s.Side,d.side),e.uniform1f(s.Weight,d.weight*h.opacity),e.uniform1f(s.Trail,0),e.drawArrays(p?e.POINTS:e.TRIANGLES,0,W.length/2),p)for(const k of[.04,.08])e.uniform1f(s.Trail,k),e.drawArrays(e.POINTS,0,R.length/2)}}return a}}}export{q as createPhoenixRig,P as facingAt,V as rigState,Y as tailPoint};
