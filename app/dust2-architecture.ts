import * as THREE from 'three';
import { DUST2_GEOMETRY, DUST2_MAP, getMapGroundHeight } from './dust2-map.ts';
import { applyEnvironmentSurfaceUv } from './environment-materials.ts';
import type { HullBox } from './player-collision.ts';

type ArchitectureMaterials = Readonly<{
  stone: THREE.MeshStandardMaterial;
  plaster: THREE.MeshStandardMaterial;
  timber: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  paving: THREE.MeshStandardMaterial;
}>;

/** Facade details share the existing solid footprint; gameplay retains its hulls. */
export function createDust2Architecture(
  materials: ArchitectureMaterials,
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'dust2-authored-architecture';
  const shutterMaterial = materials.timber.clone();
  shutterMaterial.color.multiplyScalar(0.42);
  const wornPaving = materials.paving.clone();
  wornPaving.vertexColors = true;
  wornPaving.transparent = true;
  wornPaving.depthWrite = false;
  wornPaving.name = 'dust-blended-paving';
  const addBox = (
    name: string,
    center: THREE.Vector3Tuple,
    size: THREE.Vector3Tuple,
    material: THREE.MeshStandardMaterial,
    parent: THREE.Object3D = root,
  ) => {
    const geometry = new THREE.BoxGeometry(...size);
    const family =
      material === materials.plaster
        ? 'weatheredPlaster'
        : material === materials.paving
          ? 'cobblestone'
          : 'sandstoneBlocks';
    if (
      material === materials.stone ||
      material === materials.plaster ||
      material === materials.paving
    )
      applyEnvironmentSurfaceUv(geometry, family);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...center);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.visualOnly = true;
    mesh.raycast = () => undefined;
    parent.add(mesh);
    return mesh;
  };
  const centerOf = (box: HullBox): THREE.Vector3Tuple => [
    (box.min.x + box.max.x) / 2,
    (box.min.y + box.max.y) / 2,
    (box.min.z + box.max.z) / 2,
  ];

  // Continuous base/cap courses articulate the corridor silhouette. Their tiny
  // visual overhang is below the player's collision clearance, like a bevel.
  for (const [index, box] of DUST2_GEOMETRY.walls.entries()) {
    const width = box.max.x - box.min.x;
    const depth = box.max.z - box.min.z;
    const [x, , z] = centerOf(box);
    addBox(
      `wall-${index}-parapet`,
      [x, box.max.y + 0.08, z],
      [width + 0.08, 0.24, depth + 0.08],
      materials.stone,
    );
    addBox(
      `wall-${index}-base-course`,
      [x, 0.38, z],
      [width + 0.045, 0.48, depth + 0.045],
      materials.stone,
    );
    addBox(
      `wall-${index}-upper-course`,
      [x, box.max.y - 0.42, z],
      [width + 0.035, 0.14, depth + 0.035],
      materials.stone,
    );
  }

  for (const [index, solid] of DUST2_MAP.solids.entries()) {
    if (solid.kind === 'roof') continue;
    const [x, y, z] = centerOf(solid);
    const width = solid.max.x - solid.min.x;
    const height = solid.max.y - solid.min.y;
    const depth = solid.max.z - solid.min.z;
    const alongX = width > depth;
    const span = alongX ? width : depth;
    const feature = new THREE.Group();
    feature.position.set(x, y, z);
    feature.rotation.y = alongX ? 0 : Math.PI / 2;
    root.add(feature);
    const thickness = alongX ? depth : width;
    const faceDepth = thickness / 2 + 0.012;
    for (const face of [-1, 1]) {
      for (const heightRatio of [-0.37, 0.37]) {
        addBox(
          `${solid.kind}-${index}-brace`,
          [0, height * heightRatio, face * faceDepth],
          [span * 0.96, 0.15, 0.06],
          materials.timber,
          feature,
        );
      }
      for (const side of [-1, 1]) {
        addBox(
          `${solid.kind}-${index}-edge`,
          [side * span * 0.46, 0, face * faceDepth],
          [0.14, height * 0.98, 0.07],
          materials.timber,
          feature,
        );
      }
      if (solid.kind === 'crate') {
        const diagonal = addBox(
          `crate-${index}-diagonal`,
          [0, 0, face * (faceDepth + 0.045)],
          [Math.hypot(span * 0.85, height * 0.78), 0.17, 0.065],
          materials.timber,
          feature,
        );
        diagonal.rotation.z = Math.atan2(height * 0.78, span * 0.85);
        const crossBrace = diagonal.clone();
        crossBrace.rotation.z *= -1;
        feature.add(crossBrace);
      } else {
        const diagonal = addBox(
          `door-${index}-diagonal`,
          [0, 0, face * (faceDepth + 0.04)],
          [Math.hypot(span * 0.84, height * 0.7), 0.16, 0.065],
          materials.timber,
          feature,
        );
        diagonal.rotation.z = Math.atan2(height * 0.7, span * 0.84);
        for (const hingeHeight of [-0.32, 0.3]) {
          addBox(
            `door-${index}-iron-hinge`,
            [0, height * hingeHeight, face * (faceDepth + 0.055)],
            [span * 0.86, 0.08, 0.04],
            materials.metal,
            feature,
          );
        }
        addBox(
          `door-${index}-iron-handle`,
          [span * 0.31, -0.05, face * (faceDepth + 0.095)],
          [0.08, 0.28, 0.065],
          materials.metal,
          feature,
        );
      }
    }
    if (solid.kind === 'crate')
      for (const side of [-1, 1]) {
        const endFace = new THREE.Group();
        endFace.position.x = side * (span / 2 + 0.035);
        endFace.rotation.y = Math.PI / 2;
        feature.add(endFace);
        for (const heightRatio of [-0.37, 0.37])
          addBox(
            `crate-${index}-end-rail`,
            [0, height * heightRatio, 0],
            [thickness * 0.96, 0.15, 0.06],
            materials.timber,
            endFace,
          );
        for (const edge of [-1, 1])
          addBox(
            `crate-${index}-end-edge`,
            [edge * thickness * 0.46, 0, 0],
            [0.14, height * 0.98, 0.065],
            materials.timber,
            endFace,
          );
        for (const slope of [-1, 1]) {
          const diagonal = addBox(
            `crate-${index}-end-diagonal`,
            [0, 0, 0.01],
            [Math.hypot(thickness * 0.85, height * 0.78), 0.17, 0.065],
            materials.timber,
            endFace,
          );
          diagonal.rotation.z =
            slope * Math.atan2(height * 0.78, thickness * 0.85);
        }
      }
  }

  // Recessed arched window silhouettes are attached to existing solid walls.
  // The dark opening is an inset facade treatment, never a traversable window.
  const windowPanel = (
    name: string,
    position: THREE.Vector3Tuple,
    yaw: number,
    width = 1.4,
  ) => {
    const feature = new THREE.Group();
    feature.name = name;
    feature.position.set(...position);
    feature.rotation.y = yaw;
    root.add(feature);
    const radius = width / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-radius, 0);
    shape.lineTo(radius, 0);
    shape.lineTo(radius, 1.15);
    shape.absarc(0, 1.15, radius, 0, Math.PI, false);
    shape.lineTo(-radius, 0);
    const opening = new THREE.Mesh(
      new THREE.ShapeGeometry(shape, 8),
      shutterMaterial,
    );
    opening.position.z = 0.045;
    opening.name = `${name}-recess`;
    feature.add(opening);
    addBox(
      `${name}-sill`,
      [0, -0.03, 0.025],
      [width + 0.28, 0.18, 0.18],
      materials.stone,
      feature,
    );
    for (const side of [-1, 1])
      addBox(
        `${name}-jamb`,
        [side * (radius + 0.075), 0.58, 0.02],
        [0.14, 1.2, 0.16],
        materials.stone,
        feature,
      );
    for (let segment = 0; segment < 9; segment++) {
      const angle = (Math.PI * (segment + 0.5)) / 9;
      const voussoir = addBox(
        `${name}-arch-stone`,
        [
          Math.cos(angle) * (radius + 0.065),
          1.15 + Math.sin(angle) * (radius + 0.065),
          0.02,
        ],
        [0.16, ((radius + 0.065) * Math.PI) / 9 + 0.02, 0.16],
        materials.stone,
        feature,
      );
      voussoir.rotation.z = angle;
    }
    for (const offset of [-0.32, 0, 0.32])
      addBox(
        `${name}-shutter`,
        [offset * width, 0.61, 0.08],
        [0.035, 1.16, 0.035],
        materials.metal,
        feature,
      );
  };
  // North A wall and long west wall, both on the inner faces of solid volumes.
  for (const x of [19.5, 24.5, 29.5])
    windowPanel(`a-wall-window-${x}`, [x, 3.25, -31.965], 0);
  for (const z of [-7, 2, 10])
    windowPanel(`long-window-${z}`, [22.035, 3.35, z], Math.PI / 2);
  for (const z of [-25, -17])
    windowPanel(`b-wall-window-${z}`, [-33.965, 2.65, z], Math.PI / 2);

  for (const z of [27.5, 30.5]) {
    windowPanel(`t-west-window-${z}`, [-9.965, 3.7, z], Math.PI / 2, 1.2);
    windowPanel(`t-east-window-${z}`, [9.965, 3.7, z], -Math.PI / 2, 1.2);
  }

  // Broken paving follows sampled ground heights through the principal routes.
  // The uneven edges expose the existing dust between worn stone sections.
  for (const [name, fromX, fromZ, toX, toZ, halfWidth] of [
    ['spawn-track', 0, 31, 0, 18, 2.9],
    ['top-mid-track', 0, 18, 0, 5, 2.3],
    ['long-track', 27, 11, 27, -14, 2.6],
    ['a-apron', 19, -26, 30, -26, 3.6],
  ] as const) {
    const segments = Math.ceil(Math.hypot(toX - fromX, toZ - fromZ));
    const direction = new THREE.Vector2(toX - fromX, toZ - fromZ).normalize();
    const positions: number[] = [],
      uvs: number[] = [],
      indices: number[] = [],
      colors: number[] = [];
    for (let step = 0; step <= segments; step++) {
      const fraction = step / segments;
      const x = THREE.MathUtils.lerp(fromX, toX, fraction);
      const z = THREE.MathUtils.lerp(fromZ, toZ, fraction);
      for (const side of [-1, 0, 1]) {
        const width =
          halfWidth * (0.84 + Math.sin(step * 1.9 + side * 2.4) * 0.12);
        const edgeX = x - direction.y * width * side;
        const edgeZ = z + direction.x * width * side;
        positions.push(edgeX, getMapGroundHeight(edgeX, edgeZ) + 0.018, edgeZ);
        uvs.push(edgeX / 2, edgeZ / 2);
        colors.push(1, 1, 1, side === 0 ? 0.96 : 0);
      }
      if (step < segments) {
        const start = step * 3;
        for (let strip = 0; strip < 2; strip++) {
          const corner = start + strip;
          indices.push(
            corner,
            corner + 1,
            corner + 3,
            corner + 1,
            corner + 4,
            corner + 3,
          );
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const paving = new THREE.Mesh(geometry, wornPaving);
    paving.name = name;
    paving.receiveShadow = true;
    root.add(paving);
  }

  // A thin surface overlay follows the already-walkable level corridor floors.
  // Sloped ramps keep their original surface so no flat plane crosses a ramp.
  for (const [name, x, y, z, width, depth] of [
    ['ct-paving', -1, 0.012, -22, 14, 10],
    ['mid-paving', -1, 0.012, -6, 7, 15],
    ['b-paving', -26, 1.012, -22, 12, 10],
    ['upper-paving', -24, 1.012, 6, 6, 9],
  ] as const) {
    addBox(name, [x, y, z], [width, 0.008, depth], materials.paving);
  }
  root.traverse((object) => {
    object.userData.visualOnly = true;
    object.raycast = () => undefined;
  });
  return root;
}
