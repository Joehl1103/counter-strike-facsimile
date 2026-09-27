import { getMapGroundHeight } from './dust2-map.ts';

export type GraphicsQaPresetName =
  | 'dust2-long-doors'
  | 'dust2-long'
  | 'dust2-a'
  | 'lane'
  | 'site-a'
  | 'site-b'
  | 'character'
  | 'pistol'
  | 'primary'
  | 'secondary'
  | 'equipment';

export type GraphicsQaPrimaryAction = 'idle' | 'equip' | 'fire' | 'reload';

export type GraphicsQaPrimaryViewmodelReview = Readonly<{
  name: 'primary';
  weapon: 'rifle' | 'carbine' | 'smg' | 'shotgun' | 'sniper';
  action: GraphicsQaPrimaryAction;
  /** Seconds since the selected action started, clamped for fixed captures. */
  timeSeconds: number;
}>;

export type GraphicsQaPistolViewmodelReview = Readonly<{
  name: 'pistol';
  weapon: 'glock18' | 'usp' | 'p228' | 'deagle' | 'elite' | 'fiveseven';
  action: GraphicsQaPrimaryAction;
  timeSeconds: number;
}>;

export type GraphicsQaEquipmentReview = Readonly<{
  name: 'equipment';
  weapon: 'knife' | 'grenade' | 'smoke' | 'flash' | 'bomb';
}>;

export type GraphicsQaCloseCharacterPose = 'idle' | 'walk' | 'crouch' | 'death';

export type GraphicsQaCloseCharacterReview = Readonly<{
  name: 'character-close' | 'locomotion';
  distanceMeters: 1.5 | 3 | 6;
  subject: 'both' | 'ct' | 't';
  angle: 'front' | 'three-quarter';
  pose: GraphicsQaCloseCharacterPose;
  /** Deterministic sample time, clamped to the four-second review pass. */
  timeSeconds: number;
  /** Horizontal root travel used only by the live locomotion review. */
  rootTravelMeters: number;
  /** Normalized deterministic gait phase derived from sample time. */
  stridePhase: number;
  /** Deterministic settled-pose selector used only by the death review. */
  deathVariant: 0 | 1 | 2 | 3;
}>;

/** A stable, gameplay-independent sample for reviewing character motion. */
export type GraphicsQaMotionKind = 'run' | 'strafe' | 'aim' | 'death';

export type GraphicsQaMotionPose = Readonly<{
  kind: GraphicsQaMotionKind;
  label: string;
  /** Seconds into the deterministic sample, useful for a screenshot label. */
  timeSeconds: number;
  /** Local horizontal velocity in metres/second: [right, forward]. */
  velocity: readonly [number, number];
  /** Normalized locomotion phase, kept explicit so callers need no clock. */
  stridePhase: number;
  /** Aim offsets in radians: [yaw, pitch]. */
  aim: readonly [number, number];
  /** Normalized death animation progress; 0 for living samples. */
  deathProgress: number;
  /** Optional retained action cue for death-origin coverage. */
  action?: 'reload' | 'recoil';
  /** Human-readable origin used by the death QA board. */
  origin?: 'neutral' | 'left-contact' | 'right-contact' | 'strafe';
}>;

export type GraphicsQaMotionPreset = Readonly<{
  name: 'movement';
  poses: readonly GraphicsQaMotionPose[];
}>;

export type GraphicsQaPreset = Readonly<{
  name: GraphicsQaPresetName;
  position: readonly [number, number, number];
  yaw: number;
  pitch: number;
}>;

/** Keep review cameras attached to the current map's support surfaces. */
function mapReviewPosition(x: number, z: number): readonly [number, number, number] {
  return Object.freeze([x, getMapGroundHeight(x, z) + 1.68, z] as const);
}

export const GRAPHICS_QA_REVIEW_POSITION = mapReviewPosition(0, 30);
export const GRAPHICS_QA_MOTION_CAMERA_POSITION = mapReviewPosition(0, 31.5);

export function getGraphicsQaMotionPosition(index: number): readonly [number, number, number] {
  const column = index % 4;
  const row = Math.floor(index / 4);
  const x = (column - 1.5) * 2.75;
  const z = 27 - row * 3;
  return Object.freeze([x, getMapGroundHeight(x, z), z] as const);
}

/** Fixed camera-local layout for the localhost all-secondary review board. */
export const SECONDARY_VIEWMODEL_QA_BOARD = Object.freeze({
  // QA-only framing: the compact arm assemblies need a little more room than
  // weapon-only silhouettes. Keep the center column just left of the
  // crosshair so neither row crosses the capture reticle.
  scale: 0.35,
  columnStartX: -0.51,
  columnSpacing: 0.35,
  rowStartY: -0.12,
  rowSpacing: 0.34,
  z: -1.4,
});

const PRESETS: Readonly<Record<GraphicsQaPresetName, GraphicsQaPreset>> = {
  'dust2-long-doors': Object.freeze({ name: 'dust2-long-doors', position: mapReviewPosition(11, 20), yaw: -Math.PI / 2, pitch: 0 }),
  'dust2-long': Object.freeze({ name: 'dust2-long', position: mapReviewPosition(26, 8), yaw: 0, pitch: 0 }),
  'dust2-a': Object.freeze({ name: 'dust2-a', position: mapReviewPosition(26, -24), yaw: -0.35, pitch: 0 }),
  lane: Object.freeze({
    name: 'lane',
    position: mapReviewPosition(0, 26),
    yaw: 0,
    pitch: 0,
  }),
  'site-a': Object.freeze({
    name: 'site-a',
    position: mapReviewPosition(28, -31),
    yaw: Math.PI,
    pitch: 0,
  }),
  'site-b': Object.freeze({
    name: 'site-b',
    position: mapReviewPosition(-26, -22),
    yaw: -Math.PI / 2,
    pitch: 0,
  }),
  character: Object.freeze({
    name: 'character',
    position: mapReviewPosition(-21, 20),
    yaw: 0,
    pitch: 0,
  }),
  // Production first-person framing for one readable pistol and both hands.
  pistol: Object.freeze({
    name: 'pistol',
    position: GRAPHICS_QA_REVIEW_POSITION,
    yaw: 0,
    pitch: 0,
  }),
  // One production-scale long gun at a time, with an optional frozen action
  // pose. This keeps geometry and hand contact large enough for close review.
  primary: Object.freeze({
    name: 'primary',
    position: GRAPHICS_QA_REVIEW_POSITION,
    yaw: 0,
    pitch: 0,
  }),
  // Fixed camera entry point for reviewing every compact secondary
  // viewmodel together. The page arranges the six camera-local models into a
  // 3-by-2 board while gameplay remains paused.
  secondary: Object.freeze({
    name: 'secondary',
    position: GRAPHICS_QA_REVIEW_POSITION,
    yaw: 0,
    pitch: 0,
  }),
  equipment: Object.freeze({
    name: 'equipment',
    position: GRAPHICS_QA_REVIEW_POSITION,
    yaw: 0,
    pitch: 0,
  }),
};

const MOTION_POSE_DESCRIPTORS: readonly GraphicsQaMotionPose[] = [
  // Run: four phase-locked samples make gait comparison deterministic.
  {
    kind: 'run',
    label: 'run-contact-left',
    timeSeconds: 0,
    velocity: [0, 4.2],
    stridePhase: 0,
    aim: [0, 0],
    deathProgress: 0,
  },
  {
    kind: 'run',
    label: 'run-mid-left',
    timeSeconds: 0.18,
    velocity: [0, 4.2],
    stridePhase: 0.25,
    aim: [0, 0],
    deathProgress: 0,
  },
  {
    kind: 'run',
    label: 'run-contact-right',
    timeSeconds: 0.36,
    velocity: [0, 4.2],
    stridePhase: 0.5,
    aim: [0, 0],
    deathProgress: 0,
  },
  {
    kind: 'run',
    label: 'run-mid-right',
    timeSeconds: 0.54,
    velocity: [0, 4.2],
    stridePhase: 0.75,
    aim: [0, 0],
    deathProgress: 0,
  },
  // Strafe uses the same phase grid and a signed lateral velocity.
  {
    kind: 'strafe',
    label: 'strafe-left',
    timeSeconds: 0,
    velocity: [-3.2, 0],
    stridePhase: 0,
    aim: [0, 0],
    deathProgress: 0,
  },
  {
    kind: 'strafe',
    label: 'strafe-left-recover',
    timeSeconds: 0.2,
    velocity: [-3.2, 0],
    stridePhase: 0.5,
    aim: [0, 0],
    deathProgress: 0,
  },
  {
    kind: 'strafe',
    label: 'strafe-right',
    timeSeconds: 0.4,
    velocity: [3.2, 0],
    stridePhase: 0,
    aim: [0, 0],
    deathProgress: 0,
  },
  {
    kind: 'strafe',
    label: 'strafe-right-recover',
    timeSeconds: 0.6,
    velocity: [3.2, 0],
    stridePhase: 0.5,
    aim: [0, 0],
    deathProgress: 0,
  },
  // Aim samples isolate weapon/upper-body look offsets from locomotion.
  {
    kind: 'aim',
    label: 'aim-center',
    timeSeconds: 0,
    velocity: [0, 0],
    stridePhase: 0,
    aim: [0, 0],
    deathProgress: 0,
  },
  {
    kind: 'aim',
    label: 'aim-high-right',
    timeSeconds: 0.25,
    velocity: [0, 0],
    stridePhase: 0,
    aim: [0.55, -0.24],
    deathProgress: 0,
  },
  {
    kind: 'aim',
    label: 'aim-low-left',
    timeSeconds: 0.5,
    velocity: [0, 0],
    stridePhase: 0,
    aim: [-0.55, 0.24],
    deathProgress: 0,
  },
  // Death samples are normalized, allowing any death-clip duration to be used.
  {
    kind: 'death',
    label: 'death-start',
    timeSeconds: 0,
    velocity: [0, 0],
    stridePhase: 0,
    aim: [0, 0],
    deathProgress: 0,
    origin: 'neutral',
  },
  {
    kind: 'death',
    label: 'death-collapse',
    timeSeconds: 0.3,
    velocity: [0, 4.2],
    stridePhase: 0,
    aim: [0, 0],
    deathProgress: 0.33,
    origin: 'left-contact',
  },
  {
    kind: 'death',
    label: 'death-fall',
    timeSeconds: 0.6,
    velocity: [0, 4.2],
    stridePhase: 0.5,
    aim: [0, 0],
    deathProgress: 0.66,
    action: 'recoil',
    origin: 'right-contact',
  },
  {
    kind: 'death',
    label: 'death-rest',
    timeSeconds: 0.9,
    velocity: [-3.2, 0],
    stridePhase: 0.5,
    aim: [0, 0],
    deathProgress: 1,
    action: 'reload',
    origin: 'strafe',
  },
];

const MOTION_POSES: readonly GraphicsQaMotionPose[] = Object.freeze(
  MOTION_POSE_DESCRIPTORS.map(
    (pose): GraphicsQaMotionPose =>
      Object.freeze({
        ...pose,
        velocity: Object.freeze([...pose.velocity]) as readonly [
          number,
          number,
        ],
        aim: Object.freeze([...pose.aim]) as readonly [number, number],
      }),
  ),
);

const MOVEMENT_PRESET: GraphicsQaMotionPreset = Object.freeze({
  name: 'movement',
  poses: MOTION_POSES,
});

export function getGraphicsQaPreset(
  search: string,
  hostname: string,
): GraphicsQaPreset | null {
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') return null;
  const name = new URLSearchParams(search).get('visual-qa');
  return name && name in PRESETS ? PRESETS[name as GraphicsQaPresetName] : null;
}

/** Local-only primary viewmodel/action selection for deterministic captures. */
export function getGraphicsQaPrimaryViewmodelReview(
  search: string,
  hostname: string,
): GraphicsQaPrimaryViewmodelReview | null {
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') return null;
  const params = new URLSearchParams(search);
  if (params.get('visual-qa') !== 'primary') return null;
  const requestedWeapon = params.get('weapon');
  const weapon =
    requestedWeapon === 'carbine' ||
    requestedWeapon === 'smg' ||
    requestedWeapon === 'shotgun' ||
    requestedWeapon === 'sniper'
      ? requestedWeapon
      : 'rifle';
  const requestedAction = params.get('action');
  const action: GraphicsQaPrimaryAction =
    requestedAction === 'equip' ||
    requestedAction === 'fire' ||
    requestedAction === 'reload'
      ? requestedAction
      : 'idle';
  const requestedTime = Number(params.get('time'));
  const defaultTime =
    action === 'fire'
      ? 0.04
      : action === 'reload'
        ? 1
        : action === 'equip'
          ? 0
          : 0;
  const timeSeconds =
    Number.isFinite(requestedTime) && params.has('time')
      ? Math.max(0, Math.min(4, requestedTime))
      : defaultTime;
  return Object.freeze({ name: 'primary', weapon, action, timeSeconds });
}

/** Local-only production pistol/action selection for deterministic captures. */
export function getGraphicsQaPistolViewmodelReview(
  search: string,
  hostname: string,
): GraphicsQaPistolViewmodelReview | null {
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') return null;
  const params = new URLSearchParams(search);
  if (params.get('visual-qa') !== 'pistol') return null;
  const requestedWeapon = params.get('weapon');
  const weapon =
    requestedWeapon === 'glock18' ||
    requestedWeapon === 'p228' ||
    requestedWeapon === 'deagle' ||
    requestedWeapon === 'elite' ||
    requestedWeapon === 'fiveseven'
      ? requestedWeapon
      : 'usp';
  const requestedAction = params.get('action');
  const action: GraphicsQaPrimaryAction =
    requestedAction === 'equip' ||
    requestedAction === 'fire' ||
    requestedAction === 'reload'
      ? requestedAction
      : 'idle';
  const requestedTime = Number(params.get('time'));
  const defaultTime =
    action === 'fire'
      ? 0.04
      : action === 'reload'
        ? 1.35
        : action === 'equip'
          ? 0
          : 0;
  const timeSeconds =
    Number.isFinite(requestedTime) && params.has('time')
      ? Math.max(0, Math.min(4, requestedTime))
      : defaultTime;
  return Object.freeze({ name: 'pistol', weapon, action, timeSeconds });
}

export function getGraphicsQaEquipmentReview(
  search: string,
  hostname: string,
): GraphicsQaEquipmentReview | null {
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') return null;
  const params = new URLSearchParams(search);
  if (params.get('visual-qa') !== 'equipment') return null;
  const requestedWeapon = params.get('weapon');
  const weapon =
    requestedWeapon === 'grenade' ||
    requestedWeapon === 'smoke' ||
    requestedWeapon === 'flash' ||
    requestedWeapon === 'bomb'
      ? requestedWeapon
      : 'knife';
  return Object.freeze({ name: 'equipment', weapon });
}

/**
 * Returns a full-scale two-team character review at a measured play distance.
 * `locomotion` adds deterministic root travel so screenshots at different
 * `time` values exercise moving foot contacts instead of a static pose board.
 */
export function getGraphicsQaCloseCharacterReview(
  search: string,
  hostname: string,
): GraphicsQaCloseCharacterReview | null {
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') return null;
  const params = new URLSearchParams(search);
  const name = params.get('visual-qa');
  if (name !== 'character-close' && name !== 'locomotion') return null;

  const distanceMeters = params.get('distance') === '6' ? 6 : params.get('distance') === '1.5' ? 1.5 : 3;
  const requestedSubject = params.get('subject');
  const subject = requestedSubject === 'ct' || requestedSubject === 't' ? requestedSubject : 'both';
  const angle =
    params.get('angle') === 'three-quarter' ? 'three-quarter' : 'front';
  const requestedPose = params.get('pose');
  const pose: GraphicsQaCloseCharacterPose =
    name === 'locomotion'
      ? 'walk'
      : requestedPose === 'walk' ||
          requestedPose === 'crouch' ||
          requestedPose === 'death'
        ? requestedPose
        : 'idle';
  const requestedTime = Number(params.get('time') ?? 0);
  const timeSeconds = Number.isFinite(requestedTime)
    ? Math.min(Math.max(requestedTime, 0), 4)
    : 0;
  const stridePhase = ((timeSeconds * 2.2) / 1.85) % 1;
  const rootTravelMeters = name === 'locomotion' ? (timeSeconds - 2) * 0.55 : 0;
  const requestedVariant = Number(params.get('variant'));
  const deathVariant =
    requestedVariant === 1 || requestedVariant === 2 || requestedVariant === 3
      ? requestedVariant
      : 0;

  return Object.freeze({
    name,
    distanceMeters,
    subject,
    angle,
    pose,
    timeSeconds,
    rootTravelMeters,
    stridePhase,
    deathVariant,
  });
}

/**
 * Returns the fixed movement review grid only for local visual-QA sessions.
 * It intentionally has no dependency on simulation state or wall-clock time.
 */
export function getGraphicsQaMotionPreset(
  search: string,
  hostname: string,
): GraphicsQaMotionPreset | null {
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') return null;
  return new URLSearchParams(search).get('visual-qa') === 'movement'
    ? MOVEMENT_PRESET
    : null;
}
