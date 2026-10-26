import*as e from"theatre/vendor/three/build/three.module.js";const B="varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",j=`precision highp float;
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
}`,q="varying vec2 vUv;uniform sampler2D base,cloud;void main(){vec4 c=texture2D(cloud,vUv);gl_FragColor=vec4(texture2D(base,vUv).rgb*(1.-c.a)+c.rgb,1.);}",L="varying vec2 vUv;uniform sampler2D source;void main(){vec3 c=texture2D(source,vUv).rgb;float l=max(c.r,max(c.g,c.b));float w=smoothstep(.78,2.1,l);gl_FragColor=vec4(c*w,1.);}",G="varying vec2 vUv;uniform sampler2D source;uniform vec2 direction;void main(){vec3 c=texture2D(source,vUv).rgb*.227027;c+=(texture2D(source,vUv+direction*1.384615).rgb+texture2D(source,vUv-direction*1.384615).rgb)*.316216;c+=(texture2D(source,vUv+direction*3.230769).rgb+texture2D(source,vUv-direction*3.230769).rgb)*.070270;gl_FragColor=vec4(c,1.);}",A=`varying vec2 vUv;uniform sampler2D source,bloom;uniform float time;void main(){vec3 c=texture2D(source,vUv).rgb+texture2D(bloom,vUv).rgb*.28;vec2 q=vUv-.5;float vignette=1.-.20*smoothstep(.20,.74,length(q));c*=vignette;gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;function V(n){const s={type:e.HalfFloatType,minFilter:e.LinearFilter,magFilter:e.LinearFilter,depthBuffer:!1},r=new e.WebGLRenderTarget(1,1,{...s,depthBuffer:!0,samples:4});r.depthTexture=new e.DepthTexture(1,1,e.UnsignedIntType);const c=new e.WebGLRenderTarget(1,1,s),l=new e.WebGLRenderTarget(1,1,s),v=new e.WebGLRenderTarget(1,1,s),d=new e.WebGLRenderTarget(1,1,s),g=new e.WebGLRenderTarget(1,1,s),U=new e.Scene,P=new e.OrthographicCamera(-1,1,1,-1,0,1),x=new e.Mesh(new e.PlaneGeometry(2,2));x.frustumCulled=!1,U.add(x);const m=(o,a,p=!1)=>new e.ShaderMaterial({vertexShader:B,fragmentShader:o,uniforms:a,depthTest:!1,depthWrite:!1,toneMapped:p}),t=m(j,{sceneColor:{value:r.texture},sceneDepth:{value:r.depthTexture},inverseProjection:{value:new e.Matrix4},cameraWorld:{value:new e.Matrix4},eye:{value:new e.Vector3},hero:{value:new e.Vector3},flashA:{value:new e.Vector3},flashB:{value:new e.Vector3},time:{value:0},storm:{value:0}}),T=m(q,{base:{value:r.texture},cloud:{value:c.texture}}),b=m(L,{source:{value:l.texture}}),i=m(G,{source:{value:null},direction:{value:new e.Vector2}}),y=m(A,{source:{value:l.texture},bloom:{value:g.texture},time:{value:0}},!0);let F="",S=7;const w=new e.Vector2;function u(o,a){x.material=o,n.setRenderTarget(a),n.render(U,P)}return{render(o,a,p,R,z){n.getDrawingBufferSize(w);const f=w.x,h=w.y,M=f+":"+h;if(M!==F){F=M,r.setSize(f,h),l.setSize(f,h);const C=Math.min(.5,768/f);c.setSize(Math.max(1,Math.round(f*C)),Math.max(1,Math.round(h*C)));for(const _ of[v,d,g])_.setSize(Math.max(1,Math.ceil(f/4)),Math.max(1,Math.ceil(h/4)))}const W=n.getRenderTarget();n.setRenderTarget(r),n.render(o,a),t.uniforms.inverseProjection.value.copy(a.projectionMatrixInverse),t.uniforms.cameraWorld.value.copy(a.matrixWorld),t.uniforms.eye.value.copy(a.position),t.uniforms.hero.value.copy(R),t.uniforms.time.value=p,t.uniforms.storm.value=z.energy,t.uniforms.flashA.value.copy(z.a),t.uniforms.flashB.value.copy(z.b);const D=p>=18.5;S=D?5:7,D||(u(t,c),u(T,l)),b.uniforms.source.value=D?r.texture:l.texture,y.uniforms.source.value=b.uniforms.source.value,u(b,v),i.uniforms.source.value=v.texture,i.uniforms.direction.value.set(1/v.width,0),u(i,d),i.uniforms.source.value=d.texture,i.uniforms.direction.value.set(0,1/v.height),u(i,g),y.uniforms.time.value=p,u(y,W)},dispose(){for(const o of[r,c,l,v,d,g])o.dispose();for(const o of[t,T,b,i,y])o.dispose();x.geometry.dispose()},get stats(){return{cloudSteps:40,cloudResolution:[c.width,c.height],passes:S,depthOcclusion:!0}}}}export{V as createDragonPipeline};
