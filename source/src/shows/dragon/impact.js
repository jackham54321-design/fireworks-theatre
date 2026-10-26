import * as THREE from "../../../vendor/three/build/three.module.js";

const smooth = (a, b, t) => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
const hash = (n) => {
  const x = Math.sin(n * 127.13 + 43.71) * 43758.5453;
  return x - Math.floor(x);
};
export const GLASS_IMPACT_TIME = 19.125;
export const GLASS_SNAPSHOT_TIME = GLASS_IMPACT_TIME;

// Radial stress fractures, clipped to the screen. Shared vertices leave no gaps
// before breakup; every shard is derived from the same deterministic fracture map.
export function buildGlassTriangles() {
  const center = [0.51, 0.49],
    radii = [0.085, 0.22, 0.43, 0.78, 1.6],
    rays = 17,
    rings = radii.map((radius, ring) =>
      Array.from({ length: rays }, (_, i) => {
        const a =
          (i / rays) * Math.PI * 2 +
          (hash(i + 93) - 0.5) * 0.16 +
          (hash(i + ring * 29) - 0.5) * 0.045;
        const r = radius * (0.83 + hash(i * 11 + ring * 67) * 0.32);
        return [center[0] + Math.cos(a) * r, center[1] + Math.sin(a) * r];
      }),
    );
  const faces = [];
  for (let i = 0; i < rays; i++)
    faces.push([center, rings[0][i], rings[0][(i + 1) % rays]]);
  for (let r = 1; r < rings.length; r++)
    for (let i = 0; i < rays; i++) {
      const j = (i + 1) % rays;
      faces.push(
        [rings[r - 1][i], rings[r][i], rings[r][j]],
        [rings[r - 1][i], rings[r][j], rings[r - 1][j]],
      );
    }
  function clip(poly, axis, bound, sign) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i],
        b = poly[(i + 1) % poly.length],
        insideA = (a[axis] - bound) * sign >= 0,
        insideB = (b[axis] - bound) * sign >= 0;
      if (insideA) out.push(a);
      if (insideA !== insideB) {
        const f = (bound - a[axis]) / (b[axis] - a[axis]);
        out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      }
    }
    return out;
  }
  const triangles = [];
  for (let poly of faces) {
    for (const [axis, bound, sign] of [
      [0, 0, 1],
      [0, 1, -1],
      [1, 0, 1],
      [1, 1, -1],
    ])
      poly = clip(poly, axis, bound, sign);
    for (let i = 1; i < poly.length - 1; i++) {
      const tri = [poly[0], poly[i], poly[i + 1]],
        area =
          Math.abs(
            (tri[1][0] - tri[0][0]) * (tri[2][1] - tri[0][1]) -
              (tri[2][0] - tri[0][0]) * (tri[1][1] - tri[0][1]),
          ) * 0.5;
      if (area > 1e-7) triangles.push(tri);
    }
  }
  return triangles;
}

const glassVertex = `
attribute vec2 cornerA,cornerB,cornerC;attribute vec4 shard;
uniform float age,aspect,reduced;varying vec2 imageUV;varying vec3 bary;varying float shardAge;
mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
mat3 rz(float a){float c=cos(a),s=sin(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}
void main(){
 bary=vec3(1.-position.x-position.y,position.x,position.y);imageUV=cornerA*bary.x+cornerB*bary.y+cornerC*bary.z;
 vec2 center=(cornerA+cornerB+cornerC)/3.;float z=1.8,tanHalf=.46630766;
 float t=max(0.,age);shardAge=t;
 vec2 unit=vec2(aspect,1.)*tanHalf*z;vec3 local=vec3((imageUV-center)*2.*unit,0.);
 float motion=mix(1.,.38,reduced),spin=t*(1.7+shard.z*3.6)*motion;
 vec3 p=rx(spin*(shard.w-.5))*ry(spin*(shard.y-.5))*rz(spin*(shard.z-.5))*local;
 vec2 radial=normalize((center-vec2(.51,.49))*vec2(aspect,1.)+vec2(.0001));
 p.xy+=(center*2.-1.)*unit+radial*(t*.15+t*t*.72)*( .45+shard.y)*motion;
 p.y-=t*t*.24*motion;
 // Carry the incoming dragon's measured ~7.65/s screen-scale velocity through
 // impact, then ease it into independent shard flight instead of stopping it.
 float momentum=z*.55*(1.-exp(-t*13.9));
 p.z=-z+min(2.5,momentum+(t*.72+t*t*1.15)*( .52+shard.z*.68))*motion;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;
const glassFragment = `
uniform sampler2D image;uniform float age;varying vec2 imageUV;varying vec3 bary;varying float shardAge;
void main(){
 float edgeDistance=min(bary.x,min(bary.y,bary.z));float edge=1.-smoothstep(0.,max(fwidth(edgeDistance)*1.5,.0004),edgeDistance);
 float front=smoothstep(0.,.055,age)*1.15;float reveal=1.-smoothstep(front-.035,front+.02,length(imageUV-vec2(.51,.49)));
 vec2 aberration=vec2(.0007,-.0004)*min(1.,shardAge*8.);
 vec3 c=vec3(texture2D(image,imageUV+aberration).r,texture2D(image,imageUV).g,texture2D(image,imageUV-aberration).b);
 c*=1.-.12*min(1.,shardAge*3.);c+=vec3(.36,.73,.90)*edge*reveal*(.80+.18*sin(imageUV.x*91.+imageUV.y*77.));
 float alpha=1.-smoothstep(.9,1.75,shardAge);gl_FragColor=vec4(c,alpha);
}`;

function glyphTexture(char, index) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 320;
  const c = canvas.getContext("2d");
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = '900 222px "Songti SC","STSong",serif';
  c.lineJoin = "round";
  c.shadowColor = "#1598ff";
  c.shadowBlur = 19;
  c.strokeStyle = "#2fa7e6";
  c.lineWidth = 9;
  c.strokeText(char, 160, 165);
  c.shadowBlur = 0;
  const gradient = c.createLinearGradient(0, 45, 0, 285);
  for (const [at, color] of [
    [0, "#f4ffff"],
    [0.24, "#bfeafa"],
    [0.46, "#37779d"],
    [0.5, "#f0ffff"],
    [0.7, "#83c6e0"],
    [1, "#183c5b"],
  ])
    gradient.addColorStop(at, color);
  c.fillStyle = gradient;
  c.fillText(char, 160, 165);
  c.strokeStyle = "#dcfaff";
  c.lineWidth = 1.2;
  c.strokeText(char, 160, 165);
  c.save();
  c.globalCompositeOperation = "source-atop";
  c.strokeStyle = "#dcffff";
  c.lineWidth = 2.3;
  for (let k = 0; k < 4; k++) {
    c.beginPath();
    for (let j = 0; j < 9; j++) {
      const x = 45 + j * 29,
        y = 55 + k * 60 + (hash(j + k * 11 + index * 47) - 0.5) * 36;
      j ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  }
  c.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createDragonImpact(renderer, camera) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const title = new THREE.Group();
  camera.add(title);
  title.position.z = -3.4;
  title.renderOrder = 9500;
  const glyphs = [],
    glyphTextures = [],
    titleGeometry = new THREE.PlaneGeometry(0.94, 0.94),
    materials = [];
  for (const [i, char] of [..."千钧雷霆"].entries()) {
    const texture = glyphTexture(char, i);
    glyphTextures.push(texture);
    const group = new THREE.Group();
    title.add(group);
    for (let layer = 3; layer >= 0; layer--) {
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        color: layer ? 0x28587d : 0xffffff,
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(titleGeometry, material);
      mesh.position.set(layer * 0.012, -layer * 0.014, -layer * 0.016);
      mesh.renderOrder = 9500 + (4 - layer);
      group.add(mesh);
      materials.push(material);
    }
    glyphs.push(group);
  }
  const arcsGeometry = new THREE.BufferGeometry(),
    arcPoints = [];
  for (let band = 0; band < 3; band++)
    for (let i = 0; i < 44; i++) {
      const x = -1.96 + (i / 44) * 3.92,
        nx = -1.96 + ((i + 1) / 44) * 3.92,
        y = (band - 1) * 0.37;
      arcPoints.push(
        x,
        y + (hash(i + band * 71) - 0.5) * 0.13,
        0.04,
        nx,
        y + (hash(i + 1 + band * 71) - 0.5) * 0.13,
        0.04,
      );
    }
  arcsGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(arcPoints, 3),
  );
  const arcMaterial = new THREE.LineBasicMaterial({
    color: 0xa5efff,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const arcs = new THREE.LineSegments(arcsGeometry, arcMaterial);
  arcs.renderOrder = 9510;
  title.add(arcs);
  const triangles = buildGlassTriangles(),
    geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
  );
  for (const [key, corner] of [
    ["cornerA", 0],
    ["cornerB", 1],
    ["cornerC", 2],
  ])
    geometry.setAttribute(
      key,
      new THREE.InstancedBufferAttribute(
        new Float32Array(triangles.flatMap((t) => t[corner])),
        2,
      ),
    );
  geometry.setAttribute(
    "shard",
    new THREE.InstancedBufferAttribute(
      new Float32Array(
        triangles.flatMap((_, i) => [
          hash(i + 1),
          hash(i + 51),
          hash(i + 93),
          hash(i + 137),
        ]),
      ),
      4,
    ),
  );
  geometry.instanceCount = triangles.length;
  const glassMaterial = new THREE.ShaderMaterial({
    vertexShader: glassVertex,
    fragmentShader: glassFragment,
    uniforms: {
      image: { value: null },
      age: { value: 0 },
      aspect: { value: 1 },
      reduced: { value: reduced ? 1 : 0 },
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const glassScene = new THREE.Scene(),
    glassCamera = new THREE.PerspectiveCamera(50, 1, 0.035, 8),
    glass = new THREE.Mesh(geometry, glassMaterial);
  glass.frustumCulled = false;
  glassScene.add(glass);
  let frame = null,
    size = "",
    disposed = false;
  const bufferSize = new THREE.Vector2();
  function update(time, width, height) {
    const envelope =
        smooth(10.13, 10.4, time) * (1 - smooth(11.94, 12.4, time)),
      pulse = time >= 10.44 ? Math.exp(-(time - 10.44) * 22) : 0,
      echo = time >= 10.61 ? Math.exp(-(time - 10.61) * 27) * 0.3 : 0;
    title.visible = envelope > 0.001;
    const tan = Math.tan((camera.fov * Math.PI) / 360),
      viewH = 2 * 3.4 * tan,
      viewW = viewH * camera.aspect,
      scale = Math.min(0.94, (viewW * 0.79) / 3.65, (viewH * 0.16) / 0.94);
    title.scale.setScalar(scale);
    title.position.y = -3.4 * tan * (height < 540 ? 0.31 : 0.39);
    glyphs.forEach((glyph, i) => {
      const arrive = smooth(10.13 + i * 0.035, 10.36 + i * 0.035, time),
        settle = (1 - arrive) * (1 - reduced * 0.7);
      glyph.position.set(
        (i - 1.5) * 0.87 + (i < 2 ? -1 : 1) * settle * 0.55,
        settle * 0.15,
        settle * 0.75,
      );
      glyph.rotation.set(
        -settle * 0.3,
        (i - 1.5) * settle * 0.25,
        (i % 2 ? 1 : -1) * settle * 0.12,
      );
      for (const mesh of glyph.children) {
        mesh.material.opacity = envelope * arrive;
        mesh.material.color.setScalar(
          mesh.position.z < 0 ? 0.48 : 1 + pulse * 0.75 + echo * 0.3,
        );
      }
    });
    arcs.material.opacity = envelope * (0.09 + (pulse + echo) * 0.62);
    document.body.dataset.dragonThunderTitle = JSON.stringify({
      revision: 29,
      active: title.visible,
      characters: 4,
      thicknessLayers: 4,
    });
  }
  return {
    update,
    needsCapture() {
      renderer.getDrawingBufferSize(bufferSize);
      return !frame || size !== bufferSize.x + ":" + bufferSize.y;
    },
    capture() {
      renderer.getDrawingBufferSize(bufferSize);
      const key = bufferSize.x + ":" + bufferSize.y;
      if (size !== key) {
        frame?.dispose();
        frame = new THREE.FramebufferTexture(bufferSize.x, bufferSize.y);
        frame.minFilter = frame.magFilter = THREE.LinearFilter;
        frame.generateMipmaps = false;
        frame.colorSpace = THREE.NoColorSpace;
        size = key;
        glassMaterial.uniforms.image.value = frame;
      }
      renderer.copyFramebufferToTexture(frame);
    },
    render(time, width, height) {
      if (disposed || time < GLASS_IMPACT_TIME || time > 21.3 || !frame) {
        document.body.dataset.dragonGlass = JSON.stringify({
          revision: 29,
          active: false,
        });
        return;
      }
      const age = time - GLASS_IMPACT_TIME;
      glassMaterial.uniforms.age.value = age;
      glassMaterial.uniforms.aspect.value = width / height;
      glassCamera.aspect = width / height;
      glassCamera.updateProjectionMatrix();
      const previous = renderer.autoClear;
      renderer.autoClear = false;
      renderer.render(glassScene, glassCamera);
      renderer.autoClear = previous;
      document.body.dataset.dragonGlass = JSON.stringify({
        revision: 29,
        active: true,
        age,
        shards: triangles.length,
        drawCalls: 1,
        snapshotTime: GLASS_SNAPSHOT_TIME,
        sound: "user-final-crash-v28",
      });
    },
    get stats() {
      return {
        revision: 29,
        glyphs: 4,
        glassShards: triangles.length,
        glassDrawCalls: 1,
        impactTime: GLASS_IMPACT_TIME,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      camera.remove(title);
      frame?.dispose();
      glassMaterial.dispose();
      geometry.dispose();
      titleGeometry.dispose();
      arcsGeometry.dispose();
      arcMaterial.dispose();
      for (const m of materials) m.dispose();
      for (const t of glyphTextures) t.dispose();
    },
  };
}
