export function makeAcceptedRoseRuntime(asset, { onError = () => {} } = {}) {
  const model = asset.model,
    canvas = document.createElement("canvas");
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)),
    ease = (x) => {
      x = clamp(x);
      return x * x * (3 - 2 * x);
    },
    mix = (a, b, t) => a + (b - a) * t,
    TAU = Math.PI * 2;
  const I = () =>
    new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  function mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++)
        for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return o;
  }
  function tr(x, y, z) {
    const m = I();
    m[12] = x;
    m[13] = y;
    m[14] = z;
    return m;
  }
  function sc(s) {
    const m = I();
    m[0] = m[5] = m[10] = s;
    return m;
  }
  function rx(a) {
    const c = Math.cos(a),
      s = Math.sin(a);
    return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
  }
  function ry(a) {
    const c = Math.cos(a),
      s = Math.sin(a);
    return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
  }
  function rz(a) {
    const c = Math.cos(a),
      s = Math.sin(a);
    return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }
  const add = (a, b) => a.map((v, i) => v + b[i]),
    sub = (a, b) => a.map((v, i) => v - b[i]),
    scale = (a, s) => a.map((v) => v * s),
    dot = (a, b) => a.reduce((n, v, i) => n + v * b[i], 0),
    norm = (a) => scale(a, 1 / (Math.hypot(...a) || 1)),
    cross = (a, b) => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  function transform(m, p) {
    return [
      m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
      m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
      m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
    ];
  }
  function look(eye, target) {
    const z = norm(sub(eye, target)),
      x = norm(cross([0, 1, 0], z)),
      y = cross(z, x);
    return new Float32Array([
      x[0],
      y[0],
      z[0],
      0,
      x[1],
      y[1],
      z[1],
      0,
      x[2],
      y[2],
      z[2],
      0,
      -dot(x, eye),
      -dot(y, eye),
      -dot(z, eye),
      1,
    ]);
  }
  function perspective(fov, aspect, n = 0.1, f = 50) {
    const k = 1 / Math.tan(fov / 2);
    return new Float32Array([
      k / aspect,
      0,
      0,
      0,
      0,
      k,
      0,
      0,
      0,
      0,
      (f + n) / (n - f),
      -1,
      0,
      0,
      (2 * f * n) / (n - f),
      0,
    ]);
  }
  function ortho(l, r, b, t, n, f) {
    return new Float32Array([
      2 / (r - l),
      0,
      0,
      0,
      0,
      2 / (t - b),
      0,
      0,
      0,
      0,
      -2 / (f - n),
      0,
      -(r + l) / (r - l),
      -(t + b) / (t - b),
      -(f + n) / (f - n),
      1,
    ]);
  }

  const poses = new Float32Array(256 * 16 * 4);
  let mode = "b",
    dragYaw = 0,
    dragPitch = 0,
    gpu = null,
    failed = false,
    geometryCache = null,
    renderConfig = null;
  function put(id, m, open, alpha, kind, layer) {
    const k = id * 20;
    poses.set(m, k);
    poses.set([open, alpha, kind, layer], k + 16);
  }
  function rootAt(rank, time) {
    const approach = ease((time - 2) / 3),
      side = rank - 1;
    return mul(
      tr(
        side * 1.72 * (1 - approach * 0.06),
        -0.28 + (rank % 2) * 0.2 + approach * 0.12,
        -0.5 + rank * 0.35 + approach * 0.4,
      ),
      mul(rz(-side * 0.1), mul(ry(side * 0.24), sc(0.72))),
    );
  }
  const sideFadeStart = 5.2,
    sideFadeDuration = 0.72,
    sideFadeEnd = sideFadeStart + sideFadeDuration,
    scatterStart = sideFadeEnd + 0.16,
    centralSpeed = 2,
    emissionParts = Array.from({ length: 20 }, (_, i) =>
      Math.round((i * (model.petalCount - 1)) / 19),
    );
  function sideOpacityAt(time) {
    return time >= sideFadeEnd
      ? 0
      : 1 - ease((time - sideFadeStart) / sideFadeDuration);
  }
  function centralTimeAt(time) {
    return time <= scatterStart
      ? time
      : scatterStart + (time - scatterStart) * centralSpeed;
  }
  function emissionSlot(p) {
    return emissionParts.indexOf(model.parts.indexOf(p));
  }
  function releaseAt(rank, p) {
    const slot = emissionSlot(p);
    return (
      scatterStart +
      (rank === 1
        ? slot < 0
          ? p.layer * 0.11 + p.order * 0.03
          : ((slot * 9) % 20) * 0.105
        : 0)
    );
  }
  function emitsPetal(rank, p) {
    return rank === 1 && emissionSlot(p) >= 0;
  }
  function emissionDirection(rank, p) {
    // Separate screen-plane azimuths by 18 degrees, with interleaved near/far
    // depths. The camera-aligned sphere leaves space between projected rays.
    const slot = emissionSlot(p),
      z = 1 - (2 * (((slot * 7) % 20) + 0.5)) / 20,
      r = Math.sqrt(1 - z * z),
      angle = (slot / 20) * TAU + 0.15,
      local = [Math.cos(angle) * r, Math.sin(angle) * r, z];
    return norm(transform(rx(-Math.atan2(2.45, 10.7)), local));
  }
  function scenePoses(time, record = false) {
    const count = mode === "a" ? 1 : 3;
    for (let rank = 0; rank < count; rank++) {
      const rankTime = mode === "b" && rank === 1 ? centralTimeAt(time) : time,
        root =
          mode === "a"
            ? mul(ry(time * 0.19 + dragYaw), rx(dragPitch))
            : rootAt(rank, rankTime);
      for (let i = 0; i < model.parts.length; i++) {
        const p = model.parts[i],
          id = rank * model.parts.length + i,
          pivot = p.pivot,
          local = rankTime - releaseAt(rank, p),
          open = mode === "a" ? ease((time - 1.5 - p.layer * 0.055) / 5.3) : 1;
        // Both side roses dissolve as complete, anchored flowers. No side petal
        // detaches or rotates independently, including the stem, leaves and sepals.
        if (mode === "b" && rank !== 1) {
          put(
            id,
            mul(root, tr(...pivot)),
            1,
            sideOpacityAt(time),
            p.kind,
            p.layer,
          );
          continue;
        }
        if (mode === "a" || local < 0 || p.kind) {
          let alpha = 1;
          if (mode === "b" && p.kind)
            alpha = 1 - ease((rankTime - scatterStart) / 1.45);
          put(id, mul(root, tr(...pivot)), open, alpha, p.kind, p.layer);
          continue;
        }
        // Only twenty central petals fly; the other central petals fade in place.
        if (!emitsPetal(rank, p)) {
          put(
            id,
            mul(root, tr(...pivot)),
            1,
            1 - ease(local / 1.15),
            p.kind,
            p.layer,
          );
          continue;
        }
        // Keep the actual half-open surface at release. A brief scalar acceleration
        // eases the launch while its centre stays on one fixed 3D straight line.
        const release = releaseAt(rank, p),
          origin = transform(rootAt(rank, release), pivot),
          travel = local - 0.24 * (1 - Math.exp(-local / 0.24)),
          direction = emissionDirection(rank, p),
          speed = 0.92 + 0.16 * (0.5 + 0.5 * Math.sin(p.seed + rank)),
          pos = add(origin, scale(direction, travel * speed)),
          spin = mul(
            rz((i % 2 ? 1 : -1) * 0.17 * travel),
            mul(
              ry(Math.sin(p.seed) * 0.31 * travel),
              rx(Math.cos(p.seed) * 0.42 * travel),
            ),
          ),
          rotation = mul(rz(-(rank - 1) * 0.1), ry((rank - 1) * 0.24)),
          m = mul(tr(...pos), mul(rotation, mul(spin, sc(0.72))));
        const alpha = 1 - ease((local - 3.4) / 3.9);
        put(id, m, 1, alpha, p.kind, p.layer);
      }
    }
    return count;
  }

  const eye = [0, 2.1, 10.8],
    target = [0, -0.35, 0.1],
    distance = Math.hypot(2.45, 10.7),
    tilt = Math.atan2(2.45, 10.7),
    up = [0, Math.cos(tilt), -Math.sin(tilt)],
    back = [0, Math.sin(tilt), Math.cos(tilt)];
  function geometry() {
    if (geometryCache) return geometryCache;
    const binary = atob(asset.buffer),
      bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const vertices = new Float32Array(bytes.buffer, 0, model.vertexBytes / 4),
      levels = new Map();
    return (geometryCache = {
      bytes,
      vertices,
      indices(step) {
        if (levels.has(step)) return levels.get(step);
        const out = [];
        for (const p of model.parts) {
          const cols = p.kind === 0 ? 24 : 12,
            rows = p.kind === 0 ? 32 : p.kind === 1 ? 26 : 20,
            xs = [],
            ys = [];
          for (let x = 0; x < cols; x += step) xs.push(x);
          xs.push(cols);
          for (let y = 0; y < rows; y += step) ys.push(y);
          ys.push(rows);
          for (let y = 0; y < ys.length - 1; y++)
            for (let x = 0; x < xs.length - 1; x++) {
              const a = p.vertexStart + ys[y] * (cols + 1) + xs[x],
                b = p.vertexStart + ys[y] * (cols + 1) + xs[x + 1],
                c = p.vertexStart + ys[y + 1] * (cols + 1) + xs[x + 1],
                d = p.vertexStart + ys[y + 1] * (cols + 1) + xs[x];
              out.push(a, b, c, a, c, d);
            }
        }
        const indices = new Uint32Array(out);
        levels.set(step, indices);
        return indices;
      },
    });
  }
  let projectionCache = null;
  function viewportProjection(width, height, rect) {
    const key = [width, height, rect.x, rect.y, rect.width, rect.height].join(
      ":",
    );
    if (projectionCache?.key === key) return projectionCache.matrix;
    const m = I();
    m[0] = rect.width / width;
    m[5] = rect.height / height;
    m[12] = ((rect.x + rect.width * 0.5) / width) * 2 - 1;
    m[13] = 1 - ((rect.y + rect.height * 0.5) / height) * 2;
    const matrix = mul(
      m,
      mul(perspective(0.64, rect.width / rect.height), look(eye, target)),
    );
    projectionCache = { key, matrix };
    return matrix;
  }
  function project(point, width, height, rect) {
    const m = viewportProjection(width, height, rect),
      x = m[0] * point[0] + m[4] * point[1] + m[8] * point[2] + m[12],
      y = m[1] * point[0] + m[5] * point[1] + m[9] * point[2] + m[13],
      d = m[3] * point[0] + m[7] * point[1] + m[11] * point[2] + m[15];
    return {
      x: ((x / d) * 0.5 + 0.5) * width,
      y: (0.5 - (y / d) * 0.5) * height,
      scale: distance / d,
      depth: d,
    };
  }
  function arrival(rank, time) {
    if (!renderConfig?.arrivals) return 1;
    const born = renderConfig.births?.[rank];
    return renderConfig.births
      ? born === null
        ? 0
        : ease((renderConfig.age - born) / 0.22)
      : ease((time - rank * 0.65) / 0.55);
  }
  function sample(time, config) {
    renderConfig = config;
    mode = config.finale ? "f" : "b";
    if (!config.finale) {
      const count = scenePoses(time);
      if (config.arrivals)
        for (let rank = 0; rank < 3; rank++)
          for (let i = 0; i < model.parts.length; i++) {
            const k = (rank * model.parts.length + i) * 20,
              born = config.births?.[rank];
            poses[k + 16] = config.births
              ? born === null
                ? 0
                : ease((config.age - born) / 0.65)
              : ease((time - rank * 0.65) / 1.05);
            if (rank === 1) poses[k + 17] *= arrival(rank, time);
          }
      return count;
    }
    const unit = (2 * distance * Math.tan(0.32)) / config.height,
      unproject = (x, y, depth) =>
        add(
          add(eye, scale(back, -distance * depth)),
          add(
            [(x - config.width * 0.5) * unit * depth, 0, 0],
            scale(up, (config.height * 0.5 - y) * unit * depth),
          ),
        );
    config.flowerOpacity = [];
    config.hasFlights = false;
    for (let rank = 0; rank < 6; rank++) {
      const p = config.flowers[rank],
        pair = Math.min(rank, 5 - rank),
        born = config.births ? config.births[rank] : 40.9 + pair * 0.32,
        age = config.age ?? time + 13,
        release = (config.scatterAt ?? 50) + pair * 0.18,
        opening = born === null ? 0 : ease((age - born) / 0.65),
        birth = born === null ? 0 : ease((age - born) / 0.22),
        opacity = birth * (1 - ease((age - release - 0.18) / 0.62)),
        anchor = unproject(p.x, p.y, 1.12),
        size = ((p.size * 1.1) / 5.09) * unit * 1.12,
        rotation = mul(rx(-tilt), rz(Math.atan2(p.nx, p.ny))),
        root = mul(
          tr(...anchor),
          mul(rotation, mul(sc(size), tr(0, -0.82, 0))),
        ),
        emissions = Array.from(
          { length: 8 },
          (_, i) => (i * 5 + rank * 3) % model.petalCount,
        );
      config.flowerOpacity[rank] = opacity;
      for (let i = 0; i < model.parts.length; i++) {
        const q = model.parts[i],
          id = rank * model.parts.length + i,
          base = mul(root, tr(...q.pivot)),
          slot = emissions.indexOf(i),
          local = age - release - slot * 0.065;
        if (q.kind || slot < 0 || local < 0) {
          put(id, base, opening, opacity, q.kind, q.layer + 100);
          continue;
        }
        // The surface detaches from its exact held transform, then follows one
        // fixed 3D line toward the heart. A few depth lanes retain near/far detail.
        const phase = rank * 2.39996 + slot * 1.17,
          target = unproject(
            config.width * 0.5 + Math.sin(phase) * p.size * 0.1,
            (config.height < 540
              ? config.height * 0.45
              : config.height * 0.44) +
              Math.cos(phase) * p.size * 0.1,
            0.72 + (slot % 4) * 0.11,
          ),
          progress = ease(local / 2.9),
          origin = Array.from(base.slice(12, 15)),
          pos = origin.map((v, j) => mix(v, target[j], progress)),
          orientation = new Float32Array(base);
        orientation[12] = orientation[13] = orientation[14] = 0;
        const spin = mul(
            rz(Math.sin(phase) * progress * 0.8),
            mul(ry(Math.cos(phase) * progress * 0.65), rx(progress * 0.48)),
          ),
          alpha = birth * (1 - ease((local - 1.65) / 1.35));
        put(
          id,
          mul(tr(...pos), mul(spin, orientation)),
          1,
          alpha,
          q.kind,
          q.layer,
        );
        if (alpha > 0.003) config.hasFlights = true;
      }
    }
    return 6;
  }
  function makeGpu() {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    if (!gl) return null;
    function program(v, f) {
      const shader = (kind, s) => {
          const a = gl.createShader(kind);
          gl.shaderSource(a, s);
          gl.compileShader(a);
          if (!gl.getShaderParameter(a, gl.COMPILE_STATUS))
            throw Error(gl.getShaderInfoLog(a));
          return a;
        },
        p = gl.createProgram();
      gl.attachShader(p, shader(gl.VERTEX_SHADER, v));
      gl.attachShader(p, shader(gl.FRAGMENT_SHADER, f));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw Error(gl.getProgramInfoLog(p));
      return p;
    }
    const vertex = `#version 300 es
precision highp float;layout(location=0)in vec3 aOpen;layout(location=1)in vec3 aNormal;layout(location=2)in vec3 aClosed;layout(location=3)in vec3 aClosedNormal;layout(location=4)in vec2 aUv;layout(location=5)in float aPart;
uniform sampler2D uPoses;uniform int uOffset;uniform mat4 uVP;uniform mat4 uLightVP;out vec3 vWorld;out vec3 vNormal;out vec2 vUv;out vec4 vShadow;flat out vec3 vMaterial;
vec4 pose(int i){return texelFetch(uPoses,ivec2(i&255,i>>8),0);}void main(){int id=(int(aPart)+uOffset)*5;mat4 m=mat4(pose(id),pose(id+1),pose(id+2),pose(id+3));vec4 info=pose(id+4);vec3 p=mix(aClosed,aOpen,info.x);vWorld=(m*vec4(p,1.)).xyz;vNormal=mat3(m)*normalize(mix(aClosedNormal,aNormal,info.x));vUv=aUv;vMaterial=info.yzw;vShadow=uLightVP*vec4(vWorld,1.);gl_Position=uVP*vec4(vWorld,1.);}`;
    const fragment = `#version 300 es
precision highp float;in vec3 vWorld;in vec3 vNormal;in vec2 vUv;in vec4 vShadow;flat in vec3 vMaterial;uniform sampler2D uColor;uniform sampler2D uNormal;uniform sampler2D uShadow;uniform vec3 uEye;uniform float uDark;uniform int uPass;uniform int uWholeFlower;uniform vec2 uCss;uniform vec2 uPixels;uniform vec3 uClip;uniform vec4 uReadBoxes[6];uniform int uReadCount;uniform int uRoseParts;out vec4 color;
vec3 linear(vec3 c){return pow(c,vec3(2.2));}vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float shadow(vec3 n,vec3 l){vec3 p=vShadow.xyz/vShadow.w*.5+.5;if(any(lessThan(p,vec3(0.)))||any(greaterThan(p,vec3(1.))))return 1.;float z=p.z-max(.0012,.0025*(1.-max(0.,dot(n,l)))),s=0.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++)s+=z<texture(uShadow,p.xy+vec2(x,y)*1.6/1536.).r?1.:0.;return s/9.;}
void main(){bool attached=vMaterial.z>=100.;if((uRoseParts==1&&attached)||(uRoseParts==2&&!attached))discard;float alpha=uWholeFlower==1?1.:vMaterial.x;if(alpha<.005||(uPass==0&&alpha<.995)||(uPass==1&&alpha>=.995))discard;float kind=vMaterial.y,layer=mod(vMaterial.z,100.);vec3 n=normalize(gl_FrontFacing?vNormal:-vNormal),eye=normalize(uEye-vWorld),light=normalize(vec3(-3.8,6.,5.)),fill=normalize(vec3(4.,2.,-3.));
 if(kind<.5){vec3 bump=texture(uNormal,vUv).xyz*2.-1.;vec3 q1=dFdx(vWorld),q2=dFdy(vWorld);vec2 st1=dFdx(vUv),st2=dFdy(vUv);vec3 t=normalize(q1*st2.y-q2*st1.y),b=normalize(cross(n,t));n=normalize(n+t*bump.x*.36+b*bump.y*.36);}
 vec3 base=kind<.5?linear(texture(uColor,vec2(vUv.x,1.-vUv.y)).rgb):linear(mix(vec3(.19,.32,.11),vec3(.36,.45,.19),vUv.y));if(kind<.5){base*=1.-layer*.024;if(!gl_FrontFacing)base=mix(base,linear(vec3(.92,.66,.71)),.12);}else{float vein=pow(1.-abs(vUv.x*2.-1.),25.);base+=linear(vec3(.08,.10,.025))*vein;}
 float nl=max(0.,dot(n,light)),wrap=clamp((dot(n,light)+.25)/1.25,0.,1.),vis=shadow(n,light);float fibre=.5+.5*sin((vUv.x-.5)*(58.+vUv.y*19.)+sin(vUv.y*13.)*.6);vec3 diffuse=base*(.24+wrap*vis*1.02+max(0.,dot(n,fill))*.33);float trans=pow(max(0.,dot(-n,light)),2.)*(kind<.5?.25:.08);diffuse+=base*trans*(.3+.7*vis);
 float spec=pow(max(0.,dot(n,normalize(light+eye))),9.)*.027*vis;vec3 result=diffuse+vec3(1.,.84,.79)*spec;result*=.987+fibre*.013;result=pow(aces(result*1.03),vec3(1./2.2));vec2 screen=vec2(gl_FragCoord.x/uPixels.x*uCss.x,(1.-gl_FragCoord.y/uPixels.y)*uCss.y);float guard=smoothstep(uClip.x,uClip.x+uClip.z,screen.y)*(1.-smoothstep(uClip.y-uClip.z,uClip.y,screen.y));for(int i=0;i<6;i++){if(i>=uReadCount)break;vec4 box=uReadBoxes[i];vec2 d=max(abs(screen-box.xy)-box.zw,vec2(0.));guard=min(guard,clamp(length(d)/30.,.08,1.));}alpha*=guard;if(alpha<.003)discard;color=vec4(uWholeFlower==1?result*alpha:result,alpha);}`;
    const shadowFragment = `#version 300 es
precision highp float;flat in vec3 vMaterial;uniform int uWholeFlower;void main(){if(uWholeFlower==1)return;float h=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);if(vMaterial.x<h||vMaterial.x<.005)discard;}`;
    const bgVertex = `#version 300 es
precision highp float;out vec2 vUv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUv=p;gl_Position=vec4(p*2.-1.,1.,1.);}`;
    const bgFragment = `#version 300 es
precision highp float;in vec2 vUv;uniform float uDark;out vec4 color;void main(){float d=length((vUv-vec2(.46,.53))*vec2(1.,.7));vec3 warm=mix(vec3(.77,.735,.70),vec3(.53,.51,.51),d*.65);vec3 night=mix(vec3(.105,.10,.13),vec3(.027,.034,.055),d);color=vec4(mix(warm,night,uDark),1.);}`;
    const fadeFragment = `#version 300 es
precision highp float;in vec2 vUv;uniform sampler2D uLayer;uniform float uFade;out vec4 color;void main(){color=texture(uLayer,vUv);color*=uFade;}`;
    let pMain, pShadow, pBg, pFade;
    try {
      pMain = program(vertex, fragment);
      pShadow = program(vertex, shadowFragment);
      pBg = program(bgVertex, bgFragment);
      pFade = program(bgVertex, fadeFragment);
    } catch (e) {
      throw e;
    }
    const uniforms = (p) =>
        Object.fromEntries(
          [
            "uPoses",
            "uOffset",
            "uVP",
            "uLightVP",
            "uColor",
            "uNormal",
            "uShadow",
            "uEye",
            "uDark",
            "uPass",
            "uWholeFlower",
            "uCss",
            "uPixels",
            "uClip",
            "uReadBoxes",
            "uReadCount",
            "uRoseParts",
          ].map((k) => [k, gl.getUniformLocation(p, k)]),
        ),
      u = uniforms(pMain),
      us = uniforms(pShadow),
      ub = uniforms(pBg),
      uf = {
        layer: gl.getUniformLocation(pFade, "uLayer"),
        fade: gl.getUniformLocation(pFade, "uFade"),
      };
    const bytes = geometry().bytes,
      vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      bytes.subarray(0, model.vertexBytes),
      gl.STATIC_DRAW,
    );
    let offset = 0;
    [3, 3, 3, 3, 2, 1].forEach((size, i) => {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, size, gl.FLOAT, false, 60, offset * 4);
      offset += size;
    });
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      bytes.subarray(model.vertexBytes),
      gl.STATIC_DRAW,
    );
    function texture(
      unit,
      w,
      h,
      data,
      internal = gl.RGBA32F,
      format = gl.RGBA,
      type = gl.FLOAT,
    ) {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data);
      for (const q of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
        gl.texParameteri(gl.TEXTURE_2D, q, gl.NEAREST);
      for (const q of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
        gl.texParameteri(gl.TEXTURE_2D, q, gl.CLAMP_TO_EDGE);
      return t;
    }
    const poseTexture = texture(0, 256, 16, poses),
      shadowTexture = texture(
        3,
        1536,
        1536,
        null,
        gl.DEPTH_COMPONENT24,
        gl.DEPTH_COMPONENT,
        gl.UNSIGNED_INT,
      ),
      shadowFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.TEXTURE_2D,
      shadowTexture,
      0,
    );
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      throw Error("Shadow framebuffer unavailable");
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // Render both stationary side flowers opaquely, then fade this whole layer
    // once. Petal layers cannot accumulate opacity or change the flower's shape.
    const fadeLayer = {
      fbo: gl.createFramebuffer(),
      color: gl.createTexture(),
      depth: gl.createRenderbuffer(),
      width: 0,
      height: 0,
    };
    function prepareFadeLayer() {
      if (
        fadeLayer.width === canvas.width &&
        fadeLayer.height === canvas.height
      )
        return;
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, fadeLayer.color);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        canvas.width,
        canvas.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
      for (const q of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
        gl.texParameteri(gl.TEXTURE_2D, q, gl.LINEAR);
      for (const q of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
        gl.texParameteri(gl.TEXTURE_2D, q, gl.CLAMP_TO_EDGE);
      gl.bindRenderbuffer(gl.RENDERBUFFER, fadeLayer.depth);
      gl.renderbufferStorage(
        gl.RENDERBUFFER,
        gl.DEPTH_COMPONENT16,
        canvas.width,
        canvas.height,
      );
      gl.bindFramebuffer(gl.FRAMEBUFFER, fadeLayer.fbo);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        fadeLayer.color,
        0,
      );
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.RENDERBUFFER,
        fadeLayer.depth,
      );
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
        throw Error("Flower fade layer unavailable");
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      fadeLayer.width = canvas.width;
      fadeLayer.height = canvas.height;
    }
    function artwork(url, unit) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          const t = gl.createTexture();
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, t);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image,
          );
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MIN_FILTER,
            gl.LINEAR_MIPMAP_LINEAR,
          );
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          resolve(t);
        };
        image.onerror = reject;
        image.src = url;
      });
    }

    let ready = false,
      colorTexture,
      normalTexture,
      indexCount = model.indexCount,
      indexStep = 0;
    Promise.all([artwork(asset.color, 1), artwork(asset.normal, 2)])
      .then((images) => {
        [colorTexture, normalTexture] = images;
        ready = true;
        depthDirty = true;
      })
      .catch(() => {
        failed = true;
        depthDirty = true;
      });
    const lightVP = mul(
      ortho(-6, 6, -6, 6, 0.1, 25),
      look([-3.8, 6, 5], [0, -0.2, 0]),
    );
    function drawShadows(count, wholeSides) {
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
      gl.useProgram(pShadow);
      gl.uniform1i(us.uPoses, 0);
      gl.uniformMatrix4fv(us.uVP, false, lightVP);
      gl.uniformMatrix4fv(us.uLightVP, false, lightVP);
      gl.uniform1i(us.uWholeFlower, wholeSides ? 1 : 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
      gl.viewport(0, 0, 1536, 1536);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      for (let rank = 0; rank < count; rank++) {
        if (mode === "b" && (wholeSides ? rank === 1 : rank !== 1)) continue;
        gl.uniform1i(us.uOffset, rank * model.parts.length);
        gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_INT, 0);
      }
    }
    function draw(time, record = false) {
      if (!ready) return;
      const count = renderConfig.count;
      let eye, target;
      eye = [0, 2.1, 10.8];
      target = [0, -0.35, 0.1];
      const vp = viewportProjection(
        renderConfig.width,
        renderConfig.height,
        renderConfig.rect,
      );
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, poseTexture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        256,
        Math.ceil((count * model.parts.length * 5) / 256),
        gl.RGBA,
        gl.FLOAT,
        poses.subarray(
          0,
          Math.ceil((count * model.parts.length * 5) / 256) * 1024,
        ),
      );
      gl.bindVertexArray(vao);
      drawShadows(count, false);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(
        gl.SRC_ALPHA,
        gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA,
      );
      gl.useProgram(pMain);
      gl.uniform1i(u.uWholeFlower, 0);
      gl.uniform1i(u.uRoseParts, mode === "f" ? 1 : 0);
      gl.uniform1i(u.uPoses, 0);
      gl.uniform1i(u.uColor, 1);
      gl.uniform1i(u.uNormal, 2);
      gl.uniform1i(u.uShadow, 3);
      gl.uniformMatrix4fv(u.uVP, false, vp);
      gl.uniformMatrix4fv(u.uLightVP, false, lightVP);
      gl.uniform3fv(u.uEye, eye);
      gl.uniform1f(u.uDark, 0);
      gl.uniform2f(u.uCss, renderConfig.width, renderConfig.height);
      gl.uniform2f(u.uPixels, canvas.width, canvas.height);
      gl.uniform3f(
        u.uClip,
        renderConfig.clip.top,
        renderConfig.clip.bottom,
        renderConfig.clip.feather,
      );
      gl.uniform1i(u.uReadCount, renderConfig.boxes.length);
      gl.uniform4fv(u.uReadBoxes, renderConfig.boxData);
      [poseTexture, colorTexture, normalTexture, shadowTexture].forEach(
        (tex, i) => {
          gl.activeTexture(gl.TEXTURE0 + i);
          gl.bindTexture(gl.TEXTURE_2D, tex);
        },
      );
      if (mode !== "f" || renderConfig.hasFlights)
        for (let pass = 0; pass < 2; pass++) {
          gl.uniform1i(u.uPass, pass);
          gl.depthMask(pass === 0);
          for (let rank = 0; rank < count; rank++) {
            if (mode === "b" && rank !== 1) continue;
            gl.uniform1i(u.uOffset, rank * model.parts.length);
            gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_INT, 0);
          }
        }
      gl.depthMask(true);
      const sideAlpha = mode === "b" ? sideOpacityAt(time) : 0;
      if (sideAlpha > 0) {
        prepareFadeLayer();
        drawShadows(count, true);
        for (const rank of [0, 2]) {
          const opacity = sideAlpha * arrival(rank, time);
          if (opacity <= 0) continue;
          gl.bindFramebuffer(gl.FRAMEBUFFER, fadeLayer.fbo);
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.enable(gl.DEPTH_TEST);
          gl.useProgram(pMain);
          gl.uniform1i(u.uWholeFlower, 1);
          gl.uniform1i(u.uPass, 0);
          gl.disable(gl.BLEND);
          gl.depthMask(true);
          gl.uniform1i(u.uOffset, rank * model.parts.length);
          gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_INT, 0);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.disable(gl.DEPTH_TEST);
          gl.enable(gl.BLEND);
          gl.blendFuncSeparate(
            gl.ONE,
            gl.ONE_MINUS_SRC_ALPHA,
            gl.ONE,
            gl.ONE_MINUS_SRC_ALPHA,
          );
          gl.useProgram(pFade);
          gl.activeTexture(gl.TEXTURE4);
          gl.bindTexture(gl.TEXTURE_2D, fadeLayer.color);
          gl.uniform1i(uf.layer, 4);
          gl.uniform1f(uf.fade, opacity);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
      }
      if (mode === "f") {
        prepareFadeLayer();
        for (let rank = 0; rank < 6; rank++) {
          const opacity = renderConfig.flowerOpacity[rank];
          if (opacity <= 0) continue;
          gl.bindFramebuffer(gl.FRAMEBUFFER, fadeLayer.fbo);
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.enable(gl.DEPTH_TEST);
          gl.useProgram(pMain);
          gl.uniform1i(u.uRoseParts, 2);
          gl.uniform1i(u.uWholeFlower, 1);
          gl.uniform1i(u.uPass, 0);
          gl.disable(gl.BLEND);
          gl.depthMask(true);
          gl.uniform1i(u.uOffset, rank * model.parts.length);
          gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_INT, 0);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.disable(gl.DEPTH_TEST);
          gl.enable(gl.BLEND);
          gl.blendFuncSeparate(
            gl.ONE,
            gl.ONE_MINUS_SRC_ALPHA,
            gl.ONE,
            gl.ONE_MINUS_SRC_ALPHA,
          );
          gl.useProgram(pFade);
          gl.activeTexture(gl.TEXTURE4);
          gl.bindTexture(gl.TEXTURE_2D, fadeLayer.color);
          gl.uniform1i(uf.layer, 4);
          gl.uniform1f(uf.fade, opacity);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
      }

      canvas.dataset.renderer = "webgl2-shadowed-mesh";
      canvas.dataset.time = time.toFixed(3);
      const error = gl.getError();
      if (error) throw Error("Rose GPU drawing failed (" + error + ")");
    }

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      ready = false;
      gpu = null;
      failed = true;
      depthDirty = true;
    });
    canvas.addEventListener("webglcontextrestored", () => {
      failed = false;
      gpu = null;
      depthDirty = true;
    });
    return {
      render(time) {
        if (!ready) return false;
        const step = renderConfig.step;
        if (indexStep !== step) {
          gl.bindVertexArray(vao);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
          const data = geometry().indices(step);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
          indexCount = data.length;
          indexStep = step;
        }
        draw(time);
        return true;
      },
    };
  }

  const softwareCanvas = document.createElement("canvas"),
    sideSoftwareCanvas = document.createElement("canvas");
  let software = false;
  function render(time, config) {
    renderConfig = config;
    config.count = sample(time, config);
    const width = Math.max(1, Math.round(config.width * config.ratio)),
      height = Math.max(1, Math.round(config.height * config.ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    if (!gpu && !failed) {
      try {
        gpu = makeGpu();
        if (!gpu) failed = true;
      } catch (error) {
        failed = true;
        onError(error);
      }
    }
    if (gpu) {
      try {
        if (gpu.render(time)) {
          software = false;
          return canvas;
        }
      } catch (error) {
        gpu = null;
        failed = true;
        onError(error);
      }
    }
    // Canvas contexts cannot change type after a WebGL allocation. Use a fresh
    // software surface while textures load or after a lost WebGL context.
    softwareCanvas.width = width;
    softwareCanvas.height = height;
    const c = softwareCanvas.getContext("2d");
    if (c) {
      const geometryData = geometry(),
        indices = geometryData.indices(6),
        verts = geometryData.vertices,
        triangles = [];
      for (let rank = 0; rank < config.count; rank++)
        for (let i = 0; i < indices.length; i += 3) {
          const part = verts[indices[i] * 15 + 14],
            p = model.parts[part],
            k = (rank * model.parts.length + part) * 20,
            alpha = poses[k + 17];
          if (alpha < 0.003) continue;
          const m = poses.subarray(k, k + 16),
            open = poses[k + 16],
            points = [0, 1, 2].map((j) => {
              const n = indices[i + j] * 15,
                q = transform(
                  m,
                  [0, 1, 2].map((v) =>
                    mix(verts[n + 6 + v], verts[n + v], open),
                  ),
                );
              return {
                ...project(q, config.width, config.height, config.rect),
                q,
              };
            });
          if (points.some((p) => p.depth <= 0.1)) continue;
          const sy = points.reduce((n, p) => n + p.y, 0) / 3;
          if (sy < config.clip.top || sy > config.clip.bottom) continue;
          const normal = norm(
              cross(
                sub(points[1].q, points[0].q),
                sub(points[2].q, points[0].q),
              ),
            ),
            light = 0.35 + 0.6 * Math.abs(dot(normal, norm([-3.8, 6, 5])));
          triangles.push({
            attached: poses[k + 19] >= 100,
            points,
            depth: points.reduce((n, p) => n + p.depth, 0),
            alpha,
            rank,
            kind: p.kind,
            light,
          });
        }
      triangles.sort((a, b) => b.depth - a.depth);
      const paint = (surface, list, opaque = false) => {
        for (const q of list) {
          surface.globalAlpha = opaque ? 1 : q.alpha;
          surface.fillStyle = q.kind
            ? `hsl(99,35%,${18 + q.light * 20}%)`
            : `hsl(337,46%,${38 + q.light * 36}%)`;
          surface.beginPath();
          q.points.forEach((p, i) =>
            i
              ? surface.lineTo(p.x * config.ratio, p.y * config.ratio)
              : surface.moveTo(p.x * config.ratio, p.y * config.ratio),
          );
          surface.closePath();
          surface.fill();
        }
        surface.globalAlpha = 1;
      };
      paint(
        c,
        triangles.filter((q) =>
          mode === "f" ? !q.attached : mode !== "b" || q.rank === 1,
        ),
      );
      if (mode === "b")
        for (const rank of [0, 2]) {
          const alpha = sideOpacityAt(time) * arrival(rank, time);
          if (alpha <= 0) continue;
          sideSoftwareCanvas.width = width;
          sideSoftwareCanvas.height = height;
          const side = sideSoftwareCanvas.getContext("2d");
          paint(
            side,
            triangles.filter((q) => q.rank === rank),
            true,
          );
          c.globalAlpha = alpha;
          c.drawImage(sideSoftwareCanvas, 0, 0, width, height);
        }
      if (mode === "f")
        for (let rank = 0; rank < 6; rank++) {
          const alpha = config.flowerOpacity[rank];
          if (alpha <= 0) continue;
          sideSoftwareCanvas.width = width;
          sideSoftwareCanvas.height = height;
          const side = sideSoftwareCanvas.getContext("2d");
          paint(
            side,
            triangles.filter((q) => q.rank === rank && q.attached),
            true,
          );
          c.globalAlpha = alpha;
          c.drawImage(sideSoftwareCanvas, 0, 0, width, height);
        }
      c.globalAlpha = 1;
      c.save();
      c.globalCompositeOperation = "destination-in";
      const top = config.clip.top * config.ratio,
        bottom = config.clip.bottom * config.ratio,
        feather = config.clip.feather * config.ratio,
        guard = c.createLinearGradient(0, top, 0, bottom);
      guard.addColorStop(0, "#0000");
      guard.addColorStop(Math.min(0.49, feather / (bottom - top)), "#000");
      guard.addColorStop(Math.max(0.51, 1 - feather / (bottom - top)), "#000");
      guard.addColorStop(1, "#0000");
      c.fillStyle = guard;
      c.fillRect(0, 0, width, height);
      c.globalCompositeOperation = "destination-out";
      c.fillStyle = "#000";
      c.shadowColor = "#000";
      c.shadowBlur = 20 * config.ratio;
      for (const box of config.boxes) {
        c.globalAlpha = 0.92 * box.fade;
        c.fillRect(
          (box.x - box.rx) * config.ratio,
          (box.y - box.ry) * config.ratio,
          box.rx * 2 * config.ratio,
          box.ry * 2 * config.ratio,
        );
      }
      c.restore();
    }
    software = true;
    return softwareCanvas;
  }
  function prewarm() {
    if (gpu || failed) return;
    try {
      geometry();
      gpu = makeGpu();
      if (!gpu) failed = true;
    } catch (error) {
      failed = true;
      onError(error);
    }
  }
  return {
    model,
    canvas,
    poses,
    sample,
    geometry,
    project,
    render,
    prewarm,
    get software() {
      return software;
    },
    anchor(rank, time, width, height, rect) {
      return project(
        transform(rootAt(rank, time), [0, 0.82, 0]),
        width,
        height,
        rect,
      );
    },
    timing: { sideFadeStart, sideFadeEnd, scatterStart, centralSpeed },
    nativeSample(time) {
      mode = "b";
      return scenePoses(time);
    },
  };
}
