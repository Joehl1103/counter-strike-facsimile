import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CharacterSide } from './character-visuals.ts';

type UniformRegion =
  | 'shirt'
  | 'trousers'
  | 'vest'
  | 'boots'
  | 'skin'
  | 'mask'
  | 'eyes';
const PALETTES: Record<CharacterSide, Record<UniformRegion, number>> = {
  ct: {
    shirt: 0x465a6d,
    trousers: 0x3c4d5c,
    vest: 0x242c2b,
    boots: 0x242421,
    skin: 0xb88865,
    mask: 0x303b40,
    eyes: 0x111713,
  },
  t: {
    shirt: 0x66704c,
    trousers: 0x665943,
    vest: 0x423f30,
    boots: 0x292820,
    skin: 0xb78a66,
    mask: 0xa77956,
    eyes: 0x151612,
  },
};
const uniformCache = new WeakMap<
  THREE.BufferGeometry,
  Record<CharacterSide, THREE.BufferGeometry>
>();
function createClothTexture(): THREE.DataTexture {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  let seed = 73421;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const grain = seed / 0xffffffff;
      const weave = Math.sin(x * 0.09 + Math.sin(y * 0.045) * 2) * 5;
      const crease =
        Math.pow(Math.abs(Math.sin(y * 0.09 + Math.sin(x * 0.065) * 1.6)), 14) *
        18;
      const value = Math.round(232 + grain * 12 + weave - crease);
      const offset = (y * size + x) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.name = 'original-woven-cloth';
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
const uniformMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  map: createClothTexture(),
  roughness: 1,
  metalness: 0,
});
uniformMaterial.name = 'classic-cloth-and-webbing';

/** Original low-poly clothing, bound to the retained animation skeleton. */
function buildUniformGeometry(
  source: THREE.SkinnedMesh,
): Record<CharacterSide, THREE.BufferGeometry> {
  const boneIndex = (suffix: string) => {
    const index = source.skeleton.bones.findIndex(
      (bone) => bone.name === `mixamorig${suffix}`,
    );
    if (index < 0)
      throw new Error(`Uniform is missing skeleton bone ${suffix}`);
    return index;
  };
  const positionOf = (suffix: string) =>
    source.skeleton.bones[boneIndex(suffix)].getWorldPosition(
      new THREE.Vector3(),
    );
  const meshInverse = source.matrixWorld.clone().invert();
  const parts: THREE.BufferGeometry[] = [];
  const regions: UniformRegion[] = [];
  const add = (
    geometry: THREE.BufferGeometry,
    bone: string,
    region: UniformRegion,
  ) => {
    const part = geometry.index ? geometry.toNonIndexed() : geometry;
    part.applyMatrix4(meshInverse);
    const count = part.getAttribute('position').count;
    const indices = new Uint16Array(count * 4);
    const weights = new Float32Array(count * 4);
    const index = boneIndex(bone);
    for (let vertex = 0; vertex < count; vertex++) {
      indices[vertex * 4] = index;
      weights[vertex * 4] = 1;
    }
    part.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    part.setAttribute(
      'skinWeight',
      new THREE.Float32BufferAttribute(weights, 4),
    );
    const uv = part.getAttribute('uv');
    if (region !== 'shirt' && region !== 'trousers') {
      // Skin, rubber and webbing use a quiet patch of the same shared texture.
      for (let vertex = 0; vertex < count; vertex++) uv.setXY(vertex, 0.1, 0.1);
    }
    parts.push(part);
    for (let vertex = 0; vertex < count; vertex++) regions.push(region);
  };
  const ellipsoid = (
    center: THREE.Vector3,
    size: THREE.Vector3Tuple,
    bone: string,
    region: UniformRegion,
  ) => {
    const geometry = new THREE.SphereGeometry(1, 12, 8);
    geometry.scale(...size);
    geometry.translate(center.x, center.y, center.z);
    add(geometry, bone, region);
  };
  const box = (
    center: THREE.Vector3,
    size: THREE.Vector3Tuple,
    bone: string,
    region: UniformRegion,
  ) => {
    const [width, height, depth] = size;
    const radius = Math.min(width, height, depth) * 0.18;
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2 + radius, -height / 2);
    shape.lineTo(width / 2 - radius, -height / 2);
    shape.quadraticCurveTo(
      width / 2,
      -height / 2,
      width / 2,
      -height / 2 + radius,
    );
    shape.lineTo(width / 2, height / 2 - radius);
    shape.quadraticCurveTo(
      width / 2,
      height / 2,
      width / 2 - radius,
      height / 2,
    );
    shape.lineTo(-width / 2 + radius, height / 2);
    shape.quadraticCurveTo(
      -width / 2,
      height / 2,
      -width / 2,
      height / 2 - radius,
    );
    shape.lineTo(-width / 2, -height / 2 + radius);
    shape.quadraticCurveTo(
      -width / 2,
      -height / 2,
      -width / 2 + radius,
      -height / 2,
    );
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: depth - radius * 2,
      bevelEnabled: true,
      bevelSize: radius,
      bevelThickness: radius,
      bevelSegments: 1,
      steps: 1,
      curveSegments: 2,
    });
    // Extrusion bevel expands the profile; scale it back to the intended bounds.
    geometry.scale(
      width / (width + radius * 2),
      height / (height + radius * 2),
      1,
    );
    geometry.translate(0, 0, -depth / 2 + radius);
    geometry.translate(center.x, center.y, center.z);
    add(geometry, bone, region);
  };
  const limb = (
    startBone: string,
    endBone: string,
    top: number,
    bottom: number,
    region: UniformRegion,
  ) => {
    const start = positionOf(startBone);
    const end = positionOf(endBone);
    const direction = end.clone().sub(start);
    const geometry = new THREE.CylinderGeometry(
      bottom,
      top,
      direction.length() + 0.035,
      10,
      6,
    );
    const positions = geometry.getAttribute('position');
    const length = direction.length() + 0.035;
    const foldProfile = [1, 1.08, 0.98, 1.055, 0.94, 1.035, 1];
    for (let vertex = 0; vertex < positions.count; vertex++) {
      const ring = Math.round((0.5 - positions.getY(vertex) / length) * 6);
      const fold = foldProfile[Math.max(0, Math.min(6, ring))];
      positions.setX(vertex, positions.getX(vertex) * fold);
      positions.setZ(vertex, positions.getZ(vertex) * fold);
    }
    geometry.computeVertexNormals();
    geometry.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize(),
      ),
    );
    const center = start.clone().add(end).multiplyScalar(0.5);
    geometry.translate(center.x, center.y, center.z);
    add(geometry, startBone, region);
    ellipsoid(start, [top, top, top], startBone, region);
  };

  const hips = positionOf('Hips');
  const chest = positionOf('Spine2');
  ellipsoid(
    hips.clone().add(new THREE.Vector3(0, -0.06, 0)),
    [0.21, 0.16, 0.135],
    'Hips',
    'trousers',
  );
  ellipsoid(
    chest.clone().add(new THREE.Vector3(0, -0.13, 0)),
    [0.23, 0.255, 0.135],
    'Spine2',
    'shirt',
  );
  // Textile panels follow the chest curvature instead of forming armor slabs.
  const vestPanel = (face: number) => {
    const vertices: number[] = [],
      uvs: number[] = [];
    const rows = [-0.3, -0.23, -0.13, -0.035, 0.045];
    const point = (row: number, column: number) => {
      const y = rows[row];
      const radius = Math.sqrt(1 - ((y + 0.13) / 0.255) ** 2);
      const angle = (column / 6 - 0.5) * 1.95;
      return [
        chest.x + Math.sin(angle) * 0.233 * radius,
        chest.y + y,
        chest.z + face * (Math.cos(angle) * 0.139 * radius + 0.006),
      ];
    };
    for (let row = 0; row < rows.length - 1; row++) {
      for (let column = 0; column < 6; column++) {
        const corners = [
          [row, column],
          [row + 1, column],
          [row, column + 1],
          [row, column + 1],
          [row + 1, column],
          [row + 1, column + 1],
        ];
        if (face > 0) corners.reverse();
        for (const [cornerRow, cornerColumn] of corners) {
          vertices.push(...point(cornerRow, cornerColumn));
          uvs.push(cornerColumn / 6, cornerRow / 4);
        }
      }
    }
    const panel = new THREE.BufferGeometry();
    panel.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    panel.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    panel.computeVertexNormals();
    add(panel, 'Spine2', 'vest');
  };
  vestPanel(-1);
  vestPanel(1);
  for (const side of [-1, 1]) {
    box(
      chest.clone().add(new THREE.Vector3(side * 0.12, 0.065, -0.088)),
      [0.037, 0.13, 0.018],
      'Spine2',
      'vest',
    );
    for (const column of [0, 1]) {
      const x = side * (0.043 + column * 0.066);
      box(
        chest.clone().add(new THREE.Vector3(x, -0.19, -0.137)),
        [0.057, 0.12, 0.038],
        'Spine2',
        'vest',
      );
      box(
        chest.clone().add(new THREE.Vector3(x, -0.147, -0.16)),
        [0.061, 0.025, 0.014],
        'Spine2',
        'mask',
      );
    }
  }
  box(
    hips.clone().add(new THREE.Vector3(0, 0.03, 0)),
    [0.415, 0.06, 0.28],
    'Hips',
    'vest',
  );
  for (const side of ['Left', 'Right']) {
    limb(`${side}UpLeg`, `${side}Leg`, 0.117, 0.091, 'trousers');
    limb(`${side}Leg`, `${side}Foot`, 0.091, 0.075, 'trousers');
    const foot = positionOf(`${side}Foot`);
    // Connected ankle, instep and rounded toe. The sole follows the same
    // footprint, avoiding a separate rectangular block beneath each foot.
    const bootSections = [
      [0.086, 0.046, 0.155],
      [0.033, 0.058, 0.177],
      [-0.025, 0.062, 0.125],
      [-0.104, 0.063, 0.08],
      [-0.161, 0.051, 0.064],
      [-0.184, 0.026, 0.048],
    ];
    const bootRing = [
      [-0.7, 0],
      [-1, 0.13],
      [-1, 0.48],
      [-0.78, 0.85],
      [-0.36, 1],
      [0.36, 1],
      [0.78, 0.85],
      [1, 0.48],
      [1, 0.13],
      [0.7, 0],
    ];
    for (const sole of [false, true]) {
      const vertices: number[] = [],
        uvs: number[] = [];
      const bootPoint = (sectionIndex: number, ringIndex: number) => {
        const [z, width, height] = bootSections[sectionIndex];
        const [horizontal, vertical] = bootRing[ringIndex % bootRing.length];
        return [
          foot.x + horizontal * (width + (sole ? 0.003 : 0)),
          sole ? 0.009 + vertical * 0.022 : 0.027 + vertical * (height - 0.027),
          foot.z + z,
        ];
      };
      for (let section = 0; section < bootSections.length - 1; section++) {
        for (let ring = 0; ring < bootRing.length; ring++) {
          for (const [sectionIndex, ringIndex] of [
            [section, ring],
            [section, ring + 1],
            [section + 1, ring],
            [section + 1, ring],
            [section, ring + 1],
            [section + 1, ring + 1],
          ]) {
            vertices.push(...bootPoint(sectionIndex, ringIndex));
            uvs.push(
              ringIndex / bootRing.length,
              sectionIndex / (bootSections.length - 1),
            );
          }
        }
      }
      for (const section of [0, bootSections.length - 1]) {
        const ringOrder = Array.from(
          { length: bootRing.length },
          (_, index) => index,
        );
        if (section === 0) ringOrder.reverse();
        for (let corner = 1; corner < ringOrder.length - 1; corner++) {
          for (const ring of [
            ringOrder[0],
            ringOrder[corner],
            ringOrder[corner + 1],
          ]) {
            vertices.push(...bootPoint(section, ring));
            uvs.push(0.1, 0.1);
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.computeVertexNormals();
      add(geometry, `${side}Foot`, sole ? 'eyes' : 'boots');
    }
    const thigh = positionOf(`${side}UpLeg`).lerp(
      positionOf(`${side}Leg`),
      0.55,
    );
    thigh.x += side === 'Left' ? -0.078 : 0.078;
    box(thigh, [0.08, 0.16, 0.13], `${side}UpLeg`, 'trousers');
    limb(`${side}Arm`, `${side}ForeArm`, 0.081, 0.065, 'shirt');
    limb(`${side}ForeArm`, `${side}Hand`, 0.065, 0.047, 'shirt');
    const hand = positionOf(`${side}Hand`);
    const forearm = positionOf(`${side}ForeArm`);
    const handCenter = hand
      .clone()
      .add(hand.clone().sub(forearm).normalize().multiplyScalar(0.05));
    ellipsoid(handCenter, [0.055, 0.039, 0.049], `${side}Hand`, 'boots');
  }
  const head = positionOf('Head');
  const headCenter = head.clone().add(new THREE.Vector3(0, 0.078, 0.018));
  ellipsoid(
    positionOf('Neck').add(new THREE.Vector3(0, 0.008, 0)),
    [0.052, 0.058, 0.052],
    'Neck',
    'mask',
  );
  // A tapered jaw, cheek and crown profile gives the head human proportions.
  const skullRings = [
    [-0.1, 0.045, 0.057],
    [-0.077, 0.064, 0.072],
    [-0.025, 0.083, 0.082],
    [0.038, 0.082, 0.081],
    [0.078, 0.065, 0.063],
    [0.103, 0.022, 0.025],
  ];
  const skullPositions: number[] = [],
    skullUvs: number[] = [];
  const skullPoint = (ring: number, segment: number) => {
    const [y, width, depth] = skullRings[ring];
    const angle = (segment / 12) * Math.PI * 2;
    return [
      headCenter.x + Math.sin(angle) * width,
      headCenter.y + y,
      headCenter.z - Math.cos(angle) * depth,
    ];
  };
  for (let ringIndex = 0; ringIndex < skullRings.length - 1; ringIndex++) {
    for (let segmentIndex = 0; segmentIndex < 12; segmentIndex++) {
      for (const [ring, segment] of [
        [ringIndex, segmentIndex],
        [ringIndex + 1, segmentIndex],
        [ringIndex, segmentIndex + 1],
        [ringIndex, segmentIndex + 1],
        [ringIndex + 1, segmentIndex],
        [ringIndex + 1, segmentIndex + 1],
      ]) {
        skullPositions.push(...skullPoint(ring, segment));
        skullUvs.push(segment / 12, ring / 5);
      }
    }
  }
  const skull = new THREE.BufferGeometry();
  skull.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(skullPositions, 3),
  );
  skull.setAttribute('uv', new THREE.Float32BufferAttribute(skullUvs, 2));
  skull.computeVertexNormals();
  add(skull, 'Head', 'mask');
  // Flat eye openings sit ahead of the face, so the mask cannot occlude them
  // when viewed from the player's lower eye line.
  for (const side of [-1, 1]) {
    box(
      headCenter.clone().add(new THREE.Vector3(side * 0.031, 0.023, -0.081)),
      [0.049, 0.031, 0.013],
      'Head',
      'skin',
    );
    box(
      headCenter.clone().add(new THREE.Vector3(side * 0.031, 0.024, -0.09)),
      [0.03, 0.008, 0.006],
      'Head',
      'eyes',
    );
    box(
      headCenter.clone().add(new THREE.Vector3(side * 0.031, 0.04, -0.085)),
      [0.045, 0.009, 0.013],
      'Head',
      'vest',
    );
    ellipsoid(
      headCenter.clone().add(new THREE.Vector3(side * 0.083, -0.016, 0)),
      [0.013, 0.028, 0.021],
      'Head',
      'mask',
    );
  }
  ellipsoid(
    headCenter.clone().add(new THREE.Vector3(0, -0.008, -0.083)),
    [0.018, 0.029, 0.027],
    'Head',
    'mask',
  );
  box(
    headCenter.clone().add(new THREE.Vector3(0, -0.052, -0.073)),
    [0.045, 0.005, 0.008],
    'Head',
    'vest',
  );
  const helmet = new THREE.SphereGeometry(
    1,
    14,
    6,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.53,
  );
  helmet.scale(0.102, 0.07, 0.1);
  helmet.translate(headCenter.x, headCenter.y + 0.037, headCenter.z + 0.006);
  add(helmet, 'Head', 'vest');

  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error('Could not merge the classic uniform');
  parts.forEach((part) => part.dispose());
  const createSide = (side: CharacterSide) => {
    const geometry = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv', 'skinIndex', 'skinWeight'])
      geometry.setAttribute(name, merged.getAttribute(name));
    const colors: number[] = [];
    regions.forEach((region) => {
      const color = new THREE.Color(PALETTES[side][region]);
      // A restrained fixed cloth variation retains planar folds without a
      // borrowed armor texture or a shiny normal map.
      const shade = region === 'shirt' || region === 'trousers' ? 0.98 : 1;
      color.multiplyScalar(shade);
      colors.push(color.r, color.g, color.b);
    });
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.userData.classicUniform = side;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  };
  return { ct: createSide('ct'), t: createSide('t') };
}

/** Replace only the visual surface. Skeleton, inverse binds and clips survive. */
export function installClassicCharacterMesh(
  model: THREE.Group,
  side: CharacterSide,
): void {
  model.updateMatrixWorld(true);
  const meshes: THREE.SkinnedMesh[] = [];
  model.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh) meshes.push(object);
  });
  const body = meshes.find((mesh) => mesh.skeleton.bones.length > 20);
  if (!body)
    throw new Error('Classic uniform needs the animation body skeleton');
  let geometries = uniformCache.get(body.geometry);
  if (!geometries) {
    geometries = buildUniformGeometry(body);
    uniformCache.set(body.geometry, geometries);
  }
  body.userData.classicUniformGeometries = geometries;
  body.geometry = geometries[side];
  body.material = uniformMaterial;
  body.name = 'classic-uniform-skinned-body';
  for (const mesh of meshes) if (mesh !== body) mesh.removeFromParent();
}

export function setClassicCharacterSide(
  model: THREE.Group,
  side: CharacterSide,
): void {
  model.traverse((object) => {
    if (!(object instanceof THREE.SkinnedMesh)) return;
    const geometries = object.userData.classicUniformGeometries as
      | Record<CharacterSide, THREE.BufferGeometry>
      | undefined;
    if (geometries) object.geometry = geometries[side];
  });
}
