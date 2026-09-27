import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  applyCharacterRigPose,
  applyCharacterRigWeaponAim,
  applyCharacterRigWeaponGripTargets,
  createCharacterRig,
  setCharacterRigWeaponGripTargets,
  type CharacterRig,
  type CharacterRigWeaponGripOutput,
  type CharacterRigWeaponGripTargets,
} from '../../app/character-rig.ts';
import {
  createBotAnimationPose,
  createBotAnimationState,
  writeBotAnimationPose,
  type BotAnimationInput,
  type BotAnimationPose,
  type BotAnimationState,
} from '../../app/bot-animation.ts';
import { createFacetedLimbGeometry } from '../../app/character-visuals.ts';
import {
  createCharacterLimbDeformationController,
  writeCharacterLimbFootPlanting,
  type CharacterLimbDeformationController,
} from '../../app/character-limb-deformation.ts';
import {
  createWorldFirearmMuzzleFlash,
  createWorldFirearmModel,
  type WorldFirearmMaterials,
} from '../../app/world-firearm-models.ts';
import { getCombatVisualWeaponProfile } from '../../app/combat-visual-effects.ts';
import {
  createSkinnedCharacterInstance,
  createSkinnedCharacterTemplate,
  disposeSkinnedCharacterInstance,
  sampleSkinnedCharacterPose,
  setSkinnedCharacterWeaponGrip,
  type SkinnedCharacterInstance,
  type SkinnedCharacterTemplate,
} from '../../app/skinned-character-visuals.ts';
import {
  getEnemyMuzzleOffsetZ,
  type FirearmKind,
  type SecondaryWeaponKind,
} from '../../app/game-rules.ts';

export const PRESENTATION_FIXTURE_ASSETS = [
  {
    path: 'public/assets/characters/ct-mpfb.glb',
    surface: 'authored',
    side: 'ct',
  },
  {
    path: 'public/assets/characters/vanguard.glb',
    surface: 'classic',
    side: 't',
  },
] as const;

export const PRESENTATION_FIXTURE_WEAPONS: readonly FirearmKind[] = [
  'rifle',
  'carbine',
  'smg',
  'shotgun',
  'sniper',
  'glock18',
  'usp',
  'p228',
];

export type PresentationFixtureBot = {
  root: THREE.Group;
  authorityRoot: THREE.Group;
  rig: CharacterRig;
  skinned: SkinnedCharacterInstance;
  skinnedMeshes: readonly THREE.SkinnedMesh[];
  animationState: BotAnimationState;
  animationPose: BotAnimationPose;
  weaponGripOutput: CharacterRigWeaponGripOutput;
  weaponGripTargets: CharacterRigWeaponGripTargets;
  weaponKind: FirearmKind;
  hitProxy: THREE.Mesh;
  muzzleFlash: THREE.PointLight;
  input: BotAnimationInput;
  legacyControllers?: {
    leftLeg: CharacterLimbDeformationController;
    rightLeg: CharacterLimbDeformationController;
    leftArm: CharacterLimbDeformationController;
    rightArm: CharacterLimbDeformationController;
  };
};

export type PresentationFixture = {
  scene: THREE.Scene;
  bots: PresentationFixtureBot[];
  assetEvidence: readonly {
    path: string;
    sha256: string;
    skinnedMeshes: number;
    vertices: number;
    triangles: number;
  }[];
  dispose: () => void;
};

const worldFirearmMaterials: WorldFirearmMaterials = {
  metal: new THREE.MeshStandardMaterial({
    color: 0x404449,
    metalness: 0.68,
    roughness: 0.38,
  }),
  wood: new THREE.MeshStandardMaterial({ color: 0x553d2f, roughness: 0.82 }),
  polymer: new THREE.MeshStandardMaterial({ color: 0x22262a, roughness: 0.72 }),
  accent: new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.5 }),
};

function readTexturelessGlb(path: string): {
  bytes: ArrayBuffer;
  sha256: string;
} {
  const source = readFileSync(new URL(`../../${path}`, import.meta.url));
  const jsonLength = source.readUInt32LE(12);
  const json = JSON.parse(source.subarray(20, 20 + jsonLength).toString()) as {
    materials?: {
      normalTexture?: unknown;
      emissiveTexture?: unknown;
      occlusionTexture?: unknown;
      pbrMetallicRoughness?: {
        baseColorTexture?: unknown;
        metallicRoughnessTexture?: unknown;
      };
    }[];
  };
  for (const material of json.materials ?? []) {
    delete material.normalTexture;
    delete material.emissiveTexture;
    delete material.occlusionTexture;
    if (material.pbrMetallicRoughness) {
      delete material.pbrMetallicRoughness.baseColorTexture;
      delete material.pbrMetallicRoughness.metallicRoughnessTexture;
    }
  }
  const jsonBytes = Buffer.from(JSON.stringify(json));
  const paddedJsonLength = Math.ceil(jsonBytes.length / 4) * 4;
  const binaryChunk = source.subarray(20 + jsonLength);
  const output = Buffer.alloc(20 + paddedJsonLength + binaryChunk.length, 0x20);
  source.copy(output, 0, 0, 12);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(paddedJsonLength, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  jsonBytes.copy(output, 20);
  binaryChunk.copy(output, 20 + paddedJsonLength);
  return {
    bytes: output.buffer.slice(
      output.byteOffset,
      output.byteOffset + output.byteLength,
    ),
    sha256: createHash('sha256').update(source).digest('hex'),
  };
}

async function loadTemplates(): Promise<{
  templates: readonly [SkinnedCharacterTemplate, SkinnedCharacterTemplate];
  evidence: PresentationFixture['assetEvidence'];
}> {
  const loaded = await Promise.all(
    PRESENTATION_FIXTURE_ASSETS.map(async (asset) => {
      const source = readTexturelessGlb(asset.path);
      const gltf = await new GLTFLoader().parseAsync(source.bytes, '');
      const template = createSkinnedCharacterTemplate(gltf, asset.surface);
      let skinnedMeshes = 0;
      let vertices = 0;
      let triangles = 0;
      template.scene.traverse((object) => {
        if (!(object instanceof THREE.SkinnedMesh)) {
          return;
        }
        skinnedMeshes += 1;
        const position = object.geometry.getAttribute('position');
        vertices += position.count;
        triangles += (object.geometry.index?.count ?? position.count) / 3;
      });
      return {
        template,
        evidence: {
          path: asset.path,
          sha256: source.sha256,
          skinnedMeshes,
          vertices,
          triangles,
        },
      };
    }),
  );
  return {
    templates: [loaded[0].template, loaded[1].template],
    evidence: [loaded[0].evidence, loaded[1].evidence],
  };
}

function createWeapon(kind: FirearmKind): THREE.Group {
  return createWorldFirearmModel(kind, {
    materials: worldFirearmMaterials,
    createSecondaryMuzzleFlash: (secondaryKind: SecondaryWeaponKind) => {
      let color = 0xffc36a;
      if (secondaryKind === 'deagle') {
        color = 0xffa94b;
      }
      const profile = getCombatVisualWeaponProfile('bot', secondaryKind);
      return createWorldFirearmMuzzleFlash(color, profile, null);
    },
  });
}

/** Test-only reconstruction of the pre-cleanup live presentation sequence. */
export function runLegacyBotPresentationFrame(
  bot: PresentationFixtureBot,
  input: BotAnimationInput,
  relativeAimYaw: number,
  elapsedSeconds: number,
): void {
  const controllers = bot.legacyControllers;
  if (!controllers) {
    throw new Error('Legacy buffer controllers were not retained.');
  }

  bot.skinned.visualRoot.position.set(
    bot.authorityRoot.position.x,
    bot.authorityRoot.position.y,
    bot.authorityRoot.position.z,
  );
  bot.skinned.visualRoot.rotation.set(0, bot.authorityRoot.rotation.y, 0);
  bot.skinned.visualRoot.visible = bot.authorityRoot.visible;
  bot.rig.visualRoot.visible = false;

  writeBotAnimationPose(input, bot.animationState, bot.animationPose);
  bot.animationPose.lowerBodyYaw = 0;
  applyCharacterRigPose(bot.rig, bot.animationPose);
  applyCharacterRigWeaponAim(bot.rig, relativeAimYaw, bot.animationPose);
  applyCharacterRigWeaponGripTargets(bot.rig, bot.weaponGripOutput);
  bot.rig.pelvis.updateWorldMatrix(true, false);
  bot.rig.leftThigh.updateWorldMatrix(false, false);
  bot.rig.rightThigh.updateWorldMatrix(false, false);

  controllers.leftLeg.write({
    knee: bot.animationPose.leftKneePitch,
    ankle: bot.animationPose.leftAnklePitch,
  });
  writeCharacterLimbFootPlanting(
    controllers.leftLeg,
    {
      groundY: bot.authorityRoot.position.y,
      plant: input.grounded ? bot.animationPose.leftFootPlant : 0,
      swingOffsetZ: bot.animationPose.leftFootOffsetZ,
      toeClearance: bot.animationPose.leftToeClearance,
    },
    true,
  );
  controllers.rightLeg.write({
    knee: bot.animationPose.rightKneePitch,
    ankle: bot.animationPose.rightAnklePitch,
  });
  writeCharacterLimbFootPlanting(
    controllers.rightLeg,
    {
      groundY: bot.authorityRoot.position.y,
      plant: input.grounded ? bot.animationPose.rightFootPlant : 0,
      swingOffsetZ: bot.animationPose.rightFootOffsetZ,
      toeClearance: bot.animationPose.rightToeClearance,
    },
    true,
  );
  controllers.leftArm.write({ elbow: bot.weaponGripOutput.leftElbowPitch });
  controllers.rightArm.write({ elbow: bot.weaponGripOutput.rightElbowPitch });
  sampleSkinnedCharacterPose(bot.skinned, bot.animationPose, {
    elapsedSeconds,
  });
}

export async function createBotPresentationFixture(
  options: { retainLegacyBuffers?: boolean } = {},
): Promise<PresentationFixture> {
  const { templates, evidence } = await loadTemplates();
  const scene = new THREE.Scene();
  const facetedLegGeometry = createFacetedLimbGeometry(0.13, 0.56);
  const facetedArmGeometry = createFacetedLimbGeometry(0.105, 0.42);
  const bots = PRESENTATION_FIXTURE_WEAPONS.map((weaponKind, index) => {
    const authorityRoot = new THREE.Group();
    authorityRoot.name = `presentation-authority-${index}`;
    scene.add(authorityRoot);
    const hitProxies = Array.from({ length: 11 }, (_, proxyIndex) => {
      const proxy = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 6),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      proxy.name = `presentation-hit-proxy-${index}-${proxyIndex}`;
      proxy.position.y = 0.25 + proxyIndex * 0.14;
      authorityRoot.add(proxy);
      return proxy;
    });
    const hitProxy = hitProxies[0];

    const leftLeg = new THREE.Mesh(
      facetedLegGeometry,
      new THREE.MeshBasicMaterial(),
    );
    const rightLeg = new THREE.Mesh(
      facetedLegGeometry,
      new THREE.MeshBasicMaterial(),
    );
    const leftArm = new THREE.Mesh(
      facetedArmGeometry,
      new THREE.MeshBasicMaterial(),
    );
    const rightArm = new THREE.Mesh(
      facetedArmGeometry,
      new THREE.MeshBasicMaterial(),
    );
    const rig = createCharacterRig({
      authorityRoot,
      fallbackVisuals: false,
      visualParts: {
        leftThigh: leftLeg,
        rightThigh: rightLeg,
        leftShoulder: leftArm,
        rightShoulder: rightArm,
      },
    });
    rig.visualRoot.visible = false;
    const side = index % 2 === 0 ? 'ct' : 't';
    const skinned = createSkinnedCharacterInstance(templates[index % 2], side);
    scene.add(skinned.visualRoot);
    const weaponKinds: readonly FirearmKind[] = [
      'rifle',
      'carbine',
      'smg',
      'shotgun',
      'sniper',
      'glock18',
      'usp',
      'p228',
      'deagle',
      'fiveseven',
      'elite',
    ];
    for (const kind of weaponKinds) {
      const weapon = createWeapon(kind);
      weapon.position.set(-0.07, 0.18, 0.09);
      weapon.scale.setScalar(0.64);
      weapon.rotation.set(0, 0, 0);
      weapon.visible = kind === weaponKind;
      skinned.weaponSocket.add(weapon);
    }
    const muzzleProfile = getCombatVisualWeaponProfile('bot', weaponKind);
    const muzzleFlash = createWorldFirearmMuzzleFlash(
      0xffa844,
      muzzleProfile,
      null,
    );
    muzzleFlash.position.set(
      -0.07,
      0.18,
      getEnemyMuzzleOffsetZ(weaponKind) + 0.34,
    );
    skinned.weaponSocket.add(muzzleFlash);
    const skinnedMeshes: THREE.SkinnedMesh[] = [];
    skinned.model.traverse((object) => {
      if (object instanceof THREE.SkinnedMesh) {
        skinnedMeshes.push(object);
      }
    });

    const weaponGripTargets = setCharacterRigWeaponGripTargets(
      rig,
      weaponKind,
    );
    setSkinnedCharacterWeaponGrip(skinned, weaponKind);
    const legacyControllers = options.retainLegacyBuffers
      ? {
          leftLeg: createCharacterLimbDeformationController(leftLeg, 'leg'),
          rightLeg: createCharacterLimbDeformationController(rightLeg, 'leg'),
          leftArm: createCharacterLimbDeformationController(leftArm, 'arm'),
          rightArm: createCharacterLimbDeformationController(rightArm, 'arm'),
        }
      : undefined;
    const phase = index * 0.73;
    return {
      root: authorityRoot,
      authorityRoot,
      rig,
      skinned,
      skinnedMeshes,
      animationState: createBotAnimationState(),
      animationPose: createBotAnimationPose(),
      weaponGripOutput: { leftElbowPitch: 0, rightElbowPitch: 0 },
      weaponGripTargets,
      weaponKind,
      hitProxy,
      muzzleFlash,
      legacyControllers,
      input: {
        dtSeconds: 1 / 60,
        velocity: { x: 0, z: 0 },
        acceleration: { x: 0, z: 0 },
        bodyYaw: phase,
        aimYaw: phase,
        grounded: true,
        phase,
      },
    } satisfies PresentationFixtureBot;
  });

  const disposableMaterials = new Set<THREE.Material>(
    Object.values(worldFirearmMaterials),
  );
  const disposableGeometries = new Set<THREE.BufferGeometry>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }
    disposableGeometries.add(object.geometry);
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      disposableMaterials.add(material);
    }
  });
  scene.traverse((object) => {
    if (object instanceof THREE.Sprite) {
      disposableMaterials.add(object.material);
    }
  });
  return {
    scene,
    bots,
    assetEvidence: evidence,
    dispose: () => {
      bots.forEach(({ skinned }) => disposeSkinnedCharacterInstance(skinned));
      disposableGeometries.forEach((geometry) => geometry.dispose());
      disposableMaterials.forEach((material) => material.dispose());
    },
  };
}
