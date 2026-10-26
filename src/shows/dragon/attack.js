import * as THREE from "../../../vendor/three/build/three.module.js";

const ease = (a, b, t) => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return u * u * u * (10 + u * (-15 + u * 6));
};

// A time-sampled overlay on the existing rig. Rotations preserve limb lengths;
// replay/seek starts from AnimationMixer's sampled pose, never the previous frame.
export function createDragonAttack(
  actor,
  head,
  headInverse,
  { enabled = true } = {},
) {
  const cheeks = addJawCheeks(actor);
  const safe = THREE.PropertyBinding.sanitizeNodeName,
    meshes = [],
    chains = [],
    colors = [];
  actor.traverse((o) => {
    if (o.isMesh && o.morphTargetInfluences?.length) {
      meshes.push(o);
      if (o.material?.name?.includes("burgundy"))
        colors.push({
          material: o.material,
          color: o.material.color.clone(),
          emissive: o.material.emissive?.clone(),
        });
    }
  });
  for (const [side, sign] of [
    ["L", 1],
    ["R", -1],
  ]) {
    const bones = [0, 1, 2].map((i) =>
      actor.getObjectByName(safe("fore_" + i + "." + side)),
    );
    if (bones.some((b) => !b)) throw Error("前爪骨骼缺失");
    let inverse;
    actor.traverse((o) => {
      if (o.isSkinnedMesh && !inverse) {
        const at = o.skeleton.bones.indexOf(bones[2]);
        if (at >= 0) inverse = o.skeleton.boneInverses[at].clone();
      }
    });
    const tip = new THREE.Vector3(sign * 1.1, -2.03, 3.27),
      bind = inverse.clone().invert(),
      restWrist = new THREE.Vector3().setFromMatrixPosition(bind),
      toe = tip.clone().sub(restWrist).normalize();
    const across = new THREE.Vector3(1, 0, 0)
        .addScaledVector(toe, -toe.x)
        .normalize(),
      back = toe.clone().cross(across).normalize();
    const sourceFrame = new THREE.Quaternion()
        .setFromRotationMatrix(new THREE.Matrix4().makeBasis(across, back, toe))
        .invert(),
      bindRotation = new THREE.Quaternion().setFromRotationMatrix(bind);
    chains.push({ bones, sign, inverse, tip, sourceFrame, bindRotation });
  }
  const matrix = new THREE.Matrix4(),
    basis = new THREE.Matrix4(),
    parentQ = new THREE.Quaternion(),
    worldQ = new THREE.Quaternion(),
    delta = new THREE.Quaternion();
  const forward = new THREE.Vector3(),
    up = new THREE.Vector3(),
    right = new THREE.Vector3(),
    shoulder = new THREE.Vector3(),
    elbow = new THREE.Vector3(),
    wrist = new THREE.Vector3();
  let last = { active: false, jaw: 0, reach: 0 },
    sampled = null;
  function restore() {
    if (!sampled) return;
    for (const [mesh, value] of sampled.morphs)
      mesh.morphTargetInfluences[0] = value;
    for (const [bone, q] of sampled.bones) bone.quaternion.copy(q);
    sampled = null;
    actor.updateMatrixWorld(true);
  }
  function turnWorld(bone, currentDirection, targetDirection) {
    bone.getWorldQuaternion(worldQ);
    bone.parent.getWorldQuaternion(parentQ);
    delta.setFromUnitVectors(currentDirection, targetDirection);
    bone.quaternion
      .copy(parentQ.invert().multiply(delta.multiply(worldQ)))
      .normalize();
    bone.updateWorldMatrix(false, true);
  }
  return {
    restore,
    apply(time) {
      sampled = {
        morphs: meshes.map((mesh) => [
          mesh,
          mesh.morphTargetInfluences[0] || 0,
        ]),
        bones: chains.flatMap((chain) =>
          chain.bones.map((bone) => [bone, bone.quaternion.clone()]),
        ),
      };
      const gather = enabled ? ease(16.65, 17.8, time) : 0,
        strike = enabled ? ease(18.04, 18.92, time) : 0,
        bite = enabled ? ease(17.0, 18.4, time) : 0;
      // All mouth surfaces share one pose, including the authored opening roar.
      // The procedural cheek mesh has no GLB animation channel of its own.
      const jaw = Math.min(
        1,
        Math.max(
          bite * 0.92,
          ...meshes
            .filter((mesh) => mesh !== cheeks)
            .map((mesh) => mesh.morphTargetInfluences[0] || 0),
        ),
      );
      for (const mesh of meshes) mesh.morphTargetInfluences[0] = jaw;
      for (const entry of colors) {
        entry.material.color.copy(entry.color);
        if (entry.emissive) entry.material.emissive.copy(entry.emissive);
      }
      if (gather > 0.00001) {
        basis.multiplyMatrices(head.matrixWorld, headInverse);
        forward.set(0, 0, 1).transformDirection(basis);
        up.set(0, 1, 0);
        right.crossVectors(up, forward).normalize();
        up.crossVectors(forward, right).normalize();
        for (const chain of chains) {
          const [upper, lower, paw] = chain.bones,
            original = chain.bones.map((b) => b.quaternion.clone());
          upper.getWorldPosition(shoulder);
          lower.getWorldPosition(elbow);
          paw.getWorldPosition(wrist);
          const a = shoulder.distanceTo(elbow),
            b = elbow.distanceTo(wrist),
            target = shoulder
              .clone()
              .addScaledVector(right, chain.sign * (0.68 + 0.06 * strike))
              .addScaledVector(up, 0.06)
              .addScaledVector(forward, 0.3 + strike * 0.65);
          const direction = target.clone().sub(shoulder),
            d = THREE.MathUtils.clamp(
              direction.length(),
              Math.abs(a - b) + 0.035,
              (a + b) * 0.985,
            );
          direction.normalize();
          target.copy(shoulder).addScaledVector(direction, d);
          const pole = right.clone().multiplyScalar(chain.sign);
          pole.addScaledVector(direction, -pole.dot(direction)).normalize();
          const cosine = THREE.MathUtils.clamp(
              (a * a + d * d - b * b) / (2 * a * d),
              -0.999,
              0.999,
            ),
            desiredElbow = shoulder
              .clone()
              .addScaledVector(direction, a * cosine)
              .addScaledVector(pole, a * Math.sqrt(1 - cosine * cosine));
          turnWorld(
            upper,
            elbow.clone().sub(shoulder).normalize(),
            desiredElbow.clone().sub(shoulder).normalize(),
          );
          lower.getWorldPosition(elbow);
          paw.getWorldPosition(wrist);
          turnWorld(
            lower,
            wrist.clone().sub(elbow).normalize(),
            target.clone().sub(elbow).normalize(),
          );
          // Constrain the full palm frame, including roll: fingers upright, palm toward
          // the viewer. A direction-only rotation leaves the imported wrist twist intact.
          matrix.makeBasis(right, forward.clone().negate(), up);
          worldQ
            .setFromRotationMatrix(matrix)
            .multiply(chain.sourceFrame)
            .multiply(chain.bindRotation);
          paw.parent.getWorldQuaternion(parentQ);
          paw.quaternion.copy(parentQ.invert().multiply(worldQ)).normalize();
          paw.updateWorldMatrix(false, true);
          chain.bones.forEach((bone, i) => {
            const solved = bone.quaternion.clone();
            bone.quaternion.copy(original[i]).slerp(solved, gather);
          });
          upper.updateWorldMatrix(false, true);
        }
      }
      last = {
        active: gather > 0.001 || bite > 0.001,
        jaw,
        reach: gather,
        strike,
      };
      document.body.dataset.dragonPounce = JSON.stringify(last);
      return last;
    },
    inspect() {
      return {
        revision: 29,
        ...last,
        maxJawWeight: 1,
        lateJawWeight: 0.92,
        limbLengthPreserved: true,
        palmFrame: "upright-facing-forward",
        cheekConnections: CHEEK_EDGES.length,
        cheekVertices: cheeks.geometry.attributes.position.count,
      };
    },
    dispose() {
      restore();
      for (const entry of colors) {
        entry.material.color.copy(entry.color);
        if (entry.emissive) entry.material.emissive.copy(entry.emissive);
      }
    },
  };
}

// Bridge only the rear and lateral split seams. The front lip remains an open
// mouth; each edge shares the original skin weights and the exact jaw morph.
const CHEEK_EDGES = [
  [106231, 106260],
  [106219, 106231],
  [106246, 106219],
  [106229, 106246],
  [106269, 106229],
  [106299, 106269],
  [106254, 106274],
  [106274, 106299],
  [106245, 106254],
  [106262, 106245],
  [106255, 106230],
  [106230, 106262],
  [106295, 106249],
  [106249, 106255],
  [106267, 106232],
  [106232, 106295],
  [106265, 106266],
  [106272, 106264],
  [9501, 25057],
  [25057, 37558],
  [106247, 106256],
  [106256, 106228],
  [106284, 106247],
  [106253, 106297],
  [106297, 106233],
  [106234, 106284],
  [106291, 106268],
  [106268, 106253],
  [106228, 106218],
  [106218, 106257],
  [37550, 106285],
  [106285, 106291],
  [106273, 106252],
  [106252, 106271],
  [106257, 106275],
  [106275, 106273],
  [106242, 106259],
  [106259, 106234],
  [106279, 106242],
  [106301, 106279],
  [106346, 106317],
  [106317, 106305],
  [106332, 106315],
  [106305, 106332],
  [106315, 106355],
  [106355, 106385],
  [106385, 106360],
  [106360, 106340],
  [106340, 106331],
  [106331, 106348],
  [106348, 106316],
  [106316, 106341],
  [106341, 106335],
  [106335, 106381],
  [106381, 106318],
  [106318, 106353],
  [106352, 106351],
  [106350, 106358],
  [92334, 79833],
  [79833, 64277],
  [106314, 106342],
  [106342, 106333],
  [106333, 106370],
  [106319, 106383],
  [106383, 106339],
  [106370, 106320],
  [106339, 106354],
  [106354, 106377],
  [106343, 106304],
  [106304, 106314],
  [106377, 106371],
  [106371, 92326],
  [106357, 106338],
  [106338, 106359],
  [106359, 106361],
  [106361, 106343],
  [106320, 106345],
  [106345, 106328],
  [106328, 106365],
  [106365, 106301],
];
function addJawCheeks(actor) {
  let skin;
  actor.traverse((o) => {
    if (o.isSkinnedMesh && o.geometry.attributes.position.count === 106386)
      skin = o;
  });
  if (!skin)
    throw Error("Dragon jaw topology does not match the authored cheek seam");
  const source = skin.geometry,
    position = source.attributes.position,
    delta = source.morphAttributes.position[0],
    uv = source.attributes.uv,
    si = source.attributes.skinIndex,
    sw = source.attributes.skinWeight;
  const p = [],
    d = [],
    tex = [],
    joints = [],
    weights = [],
    indices = [],
    open = [],
    rows = 4;
  for (const [a, b] of CHEEK_EDGES) {
    const base = p.length / 3;
    for (let row = 0; row < rows; row++)
      for (const id of [a, b]) {
        const u = row / (rows - 1),
          x = position.getX(id),
          y = position.getY(id),
          z = position.getZ(id),
          dx =
            delta.getX(id) * u - Math.sign(x) * Math.sin(u * Math.PI) * 0.012,
          dy = delta.getY(id) * u,
          dz = delta.getZ(id) * u;
        p.push(x, y, z);
        d.push(dx, dy, dz);
        open.push(x + dx, y + dy, z + dz);
        tex.push(uv.getX(id), uv.getY(id));
        joints.push(si.getX(id), si.getY(id), si.getZ(id), si.getW(id));
        weights.push(sw.getX(id), sw.getY(id), sw.getZ(id), sw.getW(id));
      }
    for (let row = 0; row < rows - 1; row++) {
      const k = base + row * 2;
      indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(open, 3));
  geometry.computeVertexNormals();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(tex, 2));
  geometry.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute(joints, 4),
  );
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(weights, 4),
  );
  geometry.morphAttributes.position = [new THREE.Float32BufferAttribute(d, 3)];
  geometry.morphTargetsRelative = true;
  const material = skin.material.clone();
  material.side = THREE.DoubleSide;
  material.normalMap = null;
  const cheek = new THREE.SkinnedMesh(geometry, material);
  cheek.name = "Anatomical jaw cheek connection";
  cheek.frustumCulled = false;
  skin.parent.add(cheek);
  cheek.bind(skin.skeleton, skin.bindMatrix);
  return cheek;
}
