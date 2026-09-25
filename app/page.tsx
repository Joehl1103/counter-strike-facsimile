'use client';

import { getLocalPlaytestSide, isLocalFrameProfileEnabled, LocalFrameProfileCollector } from './local-playtest';
import { getClassicStatusMessage, getClassicRoundAssignment } from './classic-hud';
import { createClassicInteractionSamples, getInteractionSampleDuration, type InteractionSampleKey, type EquipmentSampleKey } from './classic-interaction-audio';
import { isMatchLifecycleQaEnabled, runMatchLifecycleReplay, type LifecycleReport, type LifecycleSnapshot } from './match-lifecycle-qa';
import { createClassicUspSamples, type ClassicUspEvent } from './classic-usp-audio';

import { CHARACTER_GRAVITY, stepCharacterMotion } from './character-motion.ts';
import { beginBotReload, stepBotReload, stepBotScope, stepBotGlock, stepBotSilencer, constrainBotShotDelay, type BotGlockBurst, type BotReload } from './bot-weapon-actions';

import { createBotObjectiveIntel, selectObjectiveResponder, OBJECTIVE_SIGHT_RANGE, OBJECTIVE_DROP_HEARING_RADIUS, OBJECTIVE_BEEP_HEARING_RADIUS, type ObjectiveIntel, type ObjectiveObservation } from './bot-objective-intel';

import { canAcquireBotContact, nearestVisibleContact } from './bot-perception';
import { createBotHearing, getSoundInvestigation, type BotSoundKind } from './bot-hearing';

import { createBotInventory, prepareBotInventory, switchExhaustedBotInventory, type BotInventory } from './bot-economy';

import { resolveBulletDamage } from './combat-damage';
import { resolveBlast, type ExplosiveKind, type BlastOwner } from './grenade-effects';
import { createBotShotState, getBotAimCone, intersectPlayerShot, nearestShotImpact } from './bot-shot-resolution';
import { createBotUtilityState, cancelBotUtility, stepBotUtility, canInsertUtility, consumeInsertedUtility, getBotUtilityVelocity, GRENADE_FUSE_SECONDS, GRENADE_GRAVITY, BOT_UTILITY_WINDUP_SECONDS, type BotUtilityState, type UtilityKind, type UtilityPosition } from './bot-utility';

import { tracePenetratingBullet, getPenetrationMaterial } from './weapon-penetration';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { JKH129_BUILD_IDENTITY } from 'virtual:jkh-129-build-identity';
import { createMountainPanoramaMesh, DESERT_MOUNTAIN_PANORAMA_TEXTURE_BYTES } from './desert-props';
import { createDust2Architecture } from './dust2-architecture';
import { DUST2_MAP, DUST2_GEOMETRY, getMapGroundHeight, getMapSupportHeight, getMapNavigationPath } from './dust2-map';
import { createWeaponSpecialActions, canCommitWeaponAction, SPECIAL_TIMINGS, advanceShotgunReload, getKnifeAttack, type ShotgunReloadPhase } from './weapon-special-actions';
import { createWeaponBallistics, createSeededRandom, sampleClassicSpread, type BallisticPose } from './weapon-ballistics';
import { createSimulationClock, createGameplayActions, type GameplayAction } from './simulation-clock';
import { createPlayerInputTimeline } from './player-input';
import { createPlayerMovement } from './player-physics';
import { hullGeometryBlocked, PLAYER_HULL, type PlayerCollisionWorld } from './player-collision';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  getPlayerCasingProfile,
  getPooledCasingSlot,
  PLAYER_CASING_CAPACITY,
  stepPlayerCasingMotion,
  type PlayerCasingMotion,
} from './casing-effects';
import {
  BOT_DEATH_HEARING_RADIUS,
  BOT_DEATH_THUD_COOLDOWN_MS,
  getCombatFeedbackSoundProfile,
  selectPlayerImpactCue,
  shouldEmitBotDeathThud,
  type PlayerImpactCue,
} from './combat-feedback';
import {
  getClassicRenderProfile,
  getRenderPixelRatio,
  type RenderQuality,
} from './render-quality';
import {
  CLASSIC_HORIZON_COLOR,
  CLASSIC_MICRO_BEVEL_MAX,
  CLASSIC_MICRO_BEVEL_MIN,
  createClassicDiffusePixelData,
  createClassicReliefPixelData,
  getClassicBoxFaceUv,
  createClassicSkyPixelData,
  getClassicWorldUvScale,
  getClassicStructuralProxyBounds,
  type ClassicMaterialFamily,
} from './classic-surface-profile';
import {
  applyEnvironmentSurfaceUv,
  createEnvironmentSurfaceLibrary,
  type EnvironmentSurfaceKind,
} from './environment-materials';
import {
  getGraphicsQaCloseCharacterReview,
  getGraphicsQaEquipmentReview,
  getGraphicsQaMotionPreset,
  getGraphicsQaPistolViewmodelReview,
  getGraphicsQaPrimaryViewmodelReview,
  getGraphicsQaPreset,
  GRAPHICS_QA_REVIEW_POSITION,
  GRAPHICS_QA_MOTION_CAMERA_POSITION,
  getGraphicsQaMotionPosition,
  SECONDARY_VIEWMODEL_QA_BOARD,
  type GraphicsQaCloseCharacterReview,
  type GraphicsQaMotionPose,
} from './graphics-qa';
import {
  installDustlineVisualTools,
  type VisualAssetPreviewRequest,
  type VisualFallFixtureOptions,
  type VisualReplayEvent,
} from './visual-toolkit';
import {
  inspectGraphicsBudget,
  inspectVisibleGeometryLoad,
} from './graphics-budget';
import { batchStaticVisualMeshes } from './static-visual-batching';
import { batchPrimaryWorldFirearmVisuals } from './world-firearm-batching';
import { clipSpectatorCameraBoom } from './spectator-camera';
import { canSkipBotRoundWait } from './skip-bot-round';
import { dispatchActualRoundStart } from './actual-round-start';
import { createWeaponSurfaceFinish, createWeaponWoodTexture } from './weapon-surface-materials';
import { preloadViewmodelSurface } from './viewmodel-surface';
import {
  configureViewmodelRenderLayer,
  enableViewmodelLighting,
  renderWorldWithViewmodelOverlay,
} from './viewmodel-render-pass';
import {
  createTexturedViewmodelArmFactory,
  getViewmodelVisualRecoilDepth,
  VIEWMODEL_ARM_POSES,
  VIEWMODEL_NEAR_PLANE,
} from './viewmodel-visuals';
import {
  createEquipmentFirstPersonModels,
  EQUIPMENT_VIEWMODEL_MOUNTS,
} from './equipment-viewmodel-visuals';
import {
  createSecondaryFirstPersonModel,
  createSecondaryWorldModel,
  SECONDARY_VIEWMODEL_FIRST_PERSON_MOUNTS,
  type ProceduralSecondaryFirstPersonKind,
  type SecondaryFirstPersonModel,
  type SecondaryWeaponActionParts,
} from './secondary-weapon-models';
import {
  applySecondaryReloadActionParts,
  resetSecondaryReloadActionParts,
} from './viewmodel-reload-visuals';
import { preloadAuthoredRifle, createAuthoredRifleViewmodel } from './authored-rifle-viewmodel';
import {
  preloadAuthoredCarbine, createAuthoredCarbineViewmodel,
  type AuthoredViewmodelTemplate, type AuthoredViewmodelController,
} from './authored-carbine-viewmodel';
import {
  preloadAuthoredPistol, createAuthoredPistolViewmodel,
} from './authored-pistol-viewmodel';
import {
  createPrimaryFirstPersonModel,
  createPrimaryWorldModel,
  PRIMARY_VIEWMODEL_FIRST_PERSON_MOUNTS,
  PRIMARY_WEAPON_KINDS,
  type PrimaryWeaponActionParts,
} from './primary-weapon-models';
import {
  getLocalLocomotionVelocity,
  getPlayerLocomotionPose,
} from './player-locomotion';
import {
  clearKeyboardPlaytestTapLatches,
  createKeyboardPlaytestTapLatches,
  latchKeyboardPlaytestTap,
  sampleKeyboardPlaytestInputs,
} from './keyboard-playtest-input';
import {
  createPlayerPresentationState,
  stepPlayerPresentation,
  type PlayerPresentationPose,
  type PlayerPresentationState,
} from './player-presentation';
import {
  advanceBotStridePhase,
  getBotLocomotionPose,
  stepBotBodyYaw,
  stepBotGroundVelocity,
  wrapBotAngle,
} from './bot-locomotion';
import {
  createBotAnimationPose,
  createBotAnimationState,
  writeBotAnimationPose,
  type BotAnimationPose,
  type BotAnimationState,
} from './bot-animation';
import {
  applySkinnedCharacterDeathPose,
  AUTHORED_CT_CHARACTER_ASSET_URL,
  createSkinnedCharacterInstance,
  disposeSkinnedCharacterInstance,
  preloadSkinnedCharacter,
  resetSkinnedCharacterDeathPose,
  sampleSkinnedCharacterPose,
  setSkinnedCharacterWeaponGrip,
  type SkinnedCharacterInstance,
  type SkinnedCharacterTemplate,
} from './skinned-character-visuals';
import {
  createCharacterLimbDeformationController,
  writeCharacterLimbFootPlanting,
  type CharacterLimbDeformationController,
} from './character-limb-deformation';
import {
  applyCharacterRigPose,
  applyCharacterRigWeaponGripTargets,
  applyCharacterRigWeaponAim,
  createCharacterRig,
  isCharacterRigVisualObject,
  setCharacterRigWeaponGripTargets,
  validateCharacterRigVisualOnly,
  type CharacterRig,
  type CharacterRigWeaponGripOutput,
} from './character-rig';
import {
  didObjectiveActionStart,
  getObjectiveActionSoundProfile,
  OBJECTIVE_ACTION_HEARING_RADIUS,
  OBJECTIVE_ACTION_SHARED_COOLDOWN_MS,
  shouldEmitBotObjectiveCue,
  type ObjectiveActionCue,
} from './objective-audio';
import {
  OPPONENT_RELOAD_HEARING_RADIUS,
  OPPONENT_RELOAD_SHARED_COOLDOWN_MS,
  shouldEmitOpponentReloadCue,
  type OpponentReloadCue,
} from './opponent-reload-audio';
import {
  BOT_DEATH_DURATION_SECONDS,
  getBotDeathVariant,
  LIVING_BOT_POSE,
  shouldAdvanceBotDeathPose,
  writeBotDeathPose,
  type BotDeathVariant,
  type MutableBotVisualPose,
} from './death-poses';
import {
  CHARACTER_CAPSULE_PROFILES,
  createFacetedHeadCueGeometry,
  createFacetedHeadGeometry,
  createFacetedLimbGeometry,
  createFacetedTorsoCueGeometry,
  createFacetedTorsoGeometry,
  CHARACTER_SHOULDER_PROFILE,
  getCharacterSidePalette,
  getCharacterSilhouetteCues,
  type CharacterCapsulePart,
} from './character-visuals';
import {
  getPlayerDeathCameraPose,
  getPlayerDeathCameraVariant,
  PLAYER_DEATH_CAMERA_DURATION_SECONDS,
  shouldAdvancePlayerDeathCamera,
  shouldUseSpectatorOrbit,
  type PlayerCameraPose,
  type PlayerDeathCameraVariant,
} from './player-death-camera';
import {
  getBulletMarkPlacement,
  getPersistentBulletMarkKind,
  getPersistentBulletMarkSlot,
  PERSISTENT_BULLET_MARK_CAPACITY,
  shouldSpawnPersistentBulletMark,
  type PersistentBulletMarkKind,
  type SurfaceImpactKind,
} from './surface-marks';
import {
  getCombatVisualMarkSize,
  getCombatVisualSurfaceProfile,
  getCombatVisualWeaponProfile,
} from './combat-visual-effects';
import {
  addMoney,
  advanceBotBlockedSeconds,
  advanceObjectiveProgress,
  advanceGrenadeFuse,
  ALLY_ENEMY_SPOTTED_CALLOUT_MS,
  ALLY_ENEMY_SPOTTED_CALLOUT_TEXT,
  ALLY_ENEMY_SPOTTED_COOLDOWN_MS,
  applyDamageSuppression,
  applyPlayerDamageTag,
  BOT_FOOTSTEP_HEARING_RADIUS,
  BOT_FOOTSTEP_SHARED_COOLDOWN_MS,
  BOMBSITES,
  canIssueBackupCall,
  canCycleFriendlySpectator,
  canEnemyFire,
  chooseHitConfirmation,
  chooseSpectatorTarget,
  canPlayerSpotEnemy,
  canDropFirearm,
  canPlayerDropBomb,
  canPickupFirearm,
  canPlayerPickupBomb,
  canPlayerDefuse,
  canPlayerPlant,
  canScopeWeapon,
  canStartPlayerReload,
  clearInputLatches,
  BUY_CUTOFF_SECONDS,
  BUY_DURATION_SECONDS,
  BUY_ZONE_RADIUS,
  canEnemyUseSquadIntel,
  createStarterSecondaryAmmo,
  decayDamageSuppression,
  decayPlayerDamageTag,
  decayShotPulse,
  ENEMY_COMBAT_PROFILES,
  EQUIPMENT_PRICES,
  FIREARMS,
  FRIENDLY_INTEL_RADIO_DELAY_SECONDS,
  formatRoundTime,
  createMatchState,
  getBotMovementDirections,
  getBotFootstepCadenceMs,
  getBotFirearmDropKind,
  getBotSide,
  getBombsiteAtPosition,
  getBuyBlockReason,
  getAxisAlignedBoxExitDistance,
  getCompletedRounds,
  getCrosshairGap,
  getDamageDirection,
  getDefuseDuration,
  getDisplayedRoundNumber,
  getEnemyBurstShotCooldown,
  getEnemyBurstSize,
  getEnemyCombatMovement,
  getEnemyFireCooldown,
  getEnemyEngagementRange,
  getEnemyMuzzleOffsetZ,
  getBotActiveBurstLimit,
  getBotReactionTime,
  getEnemyPreferredRange,
  getEnemyPursuitSpeed,
  WEAPON_HANDLING,
  getEnemyReloadDuration,
  getEligibleDroppedFirearm,
  getFlashBlindDuration,
  getFlashOverlayOpacity,
  getMatchRoundPhase,
  getMatchWinner,
  getNearestRouteWaypointIndex,
  getNextBotDifficulty,
  getNextFriendlySpectatorTarget,
  getPlayerKillReward,
  getPlayerDamageTagSpeedMultiplier,
  getPlayerDropTarget,
  getPistolBuyOption,
  getPlayerStanceEyeHeight,
  getPositionalAudioCue,
  getRadarHeadingDegrees,
  getRadarMapPosition,
  getReloadProgress,
  getRoundPlan,
  getRoundTransitionBrief,
  getRoundWinningSide,
  getServiceRifleForSide,
  getSideScores,
  getSideOnboarding,
  getStarterSecondaryForSide,
  getTeamForSide,
  getTeamEliminationEvent,
  getSmokeCloudOpacity,
  getSquadBackupTarget,
  getHitConfirmation,
  getWeaponBunnyHopSpeed,
  getWeaponEquipDelay,
  getWeaponFieldOfView,
  getWeaponMoveSpeed,
  getWeaponSensitivityMultiplier,
  isFirearmKind,
  isAtBotWaypoint,
  isPrimaryWeaponKind,
  isFirearmDropAvailable,
  isSecondaryWeaponKind,
  isSniperBoltCycling,
  isWeaponReady,
  shouldShowRadarContact,
  shouldEmitBotFootstep,
  PLAYER_CROUCH_OFFSET,
  PLAYER_SPAWNS,
  FIREARM_PICKUP_RADIUS,
  reloadMagazine,
  resolveFallDamage,
  resolveHitscanImpact,
  segmentIntersectsSmoke,
  prepareNextRound,
  recordRoundWinner,
  resolveArmorPurchase,
  resolveAmmoPurchase,
  resolveDefuseKitPurchase,
  sanitizeDroppedFirearmAmmo,
  normalizeBotDifficulty,
  shouldChooseEnemyMovement,
  shouldEmitAllyEnemySpottedCallout,
  shouldInterruptPlant,
  shouldAllyRespondToBackup,
  shouldAllyInvestigateIntel,
  shouldClearFriendlyIntelForElimination,
  shouldRetainLoadout,
  shouldRepeatFire,
  shouldResetEnemyTracking,
  shouldAutoUnscopeAfterCommittedShot,
  shouldAutoPrepareNextRound,
  settlePlayerRoundMoney,
  updateJumpButton,
  writeSniperBoltCyclePose,
  writeWeaponReloadPose,
  WEAPON_ACTION_SOUNDS,
  MATCH_WIN_SCORE,
  OBJECTIVE_REWARDS,
  REGULATION_ROUNDS,
  ROUND_DURATION_SECONDS,
  SECONDARY_WEAPON_KINDS,
  SQUAD_BACKUP_CALLOUT_MS,
  SQUAD_BACKUP_CALL_COOLDOWN_MS,
  SQUAD_BACKUP_TARGET_SEPARATION,
  type BotDifficulty,
  type BombsiteName,
  type BombState,
  type BotTeam,
  type BuyBlockReason,
  type DamageDirection,
  type EnemyCombatTargetId,
  type EnemyCombatMovement,
  type EnemyCombatProfile,
  type EnemyRole,
  type FirearmAmmo,
  type FirearmKind,
  type HitGroup,
  type MatchRoundPhase,
  type PlayerKillWeaponKind,
  type PrimaryWeaponKind,
  type SecondaryWeaponKind,
  type RoundEndEvent,
  type RoundPlan,
  type RoundTransitionBrief,
  type Side,
  type SniperBoltCyclePose,
  type WeaponKind,
  type WeaponReloadPose,
} from './game-rules';

type GameStatus =
  | 'briefing'
  | 'active'
  | 'round-won'
  | 'round-lost'
  | 'match-won'
  | 'match-lost';
type DeathCause = PlayerKillWeaponKind | 'bomb' | 'fall';
type FallCreditLedger = Readonly<{
  player: Readonly<{ kills: number; money: number }>;
  bots: readonly Readonly<{ id: number; team: BotTeam; kills: number; money: number }>[];
}>;
type FallDamageReceipt = Readonly<{
  buildIdentity: Readonly<{ schemaVersion: 1; revision: string; pageSha256: string }>;
  targetId: string;
  team: 'player' | BotTeam;
  cause: 'fall';
  fallCount: number;
  impactDownwardSpeed: number;
  healthDamage: number;
  before: Readonly<{ health: number; armor: number; helmet: boolean; alive: boolean }>;
  after: Readonly<{ health: number; armor: number; helmet: boolean; alive: boolean }>;
  killerId: null;
  creditLedger: Readonly<{
    before: FallCreditLedger;
    after: FallCreditLedger;
    playerDelta: Readonly<{ kills: number; money: number }>;
    botDeltas: readonly Readonly<{ id: number; team: BotTeam; kills: number; money: number }>[];
  }>;
  bombDropped: boolean;
  roundResult: string | null;
}>;
type ControlledFallFixture = Readonly<{
  name: 'safe' | 'damaging' | 'lethal';
  targetId: string;
  team: 'player' | BotTeam;
  setupAtMs: number;
  before: Readonly<{ health: number; armor: number; helmet: boolean; alive: boolean }>;
  after: () => Readonly<{ health: number; armor: number; helmet: boolean; alive: boolean }>;
}>;
type CompletedRoundReceipt = Readonly<{
  roundNumber: number;
  reason: string;
  score: Readonly<Record<Side, number>>;
  playerWon: boolean;
}>;
type QualitySetting = RenderQuality;
type CharacterAssetStatus = 'loading' | 'ready' | 'error';
type GraphicsBudgetSnapshotReason =
  | 'ready'
  | 'play-start'
  | 'round-prepared'
  | 'quality-change';


type EnemyAppearanceRefs = {
  clothMaterials: THREE.MeshStandardMaterial[];
  armorMaterials: THREE.MeshStandardMaterial[];
  accentMaterials: THREE.MeshStandardMaterial[];
  skinMaterials: THREE.MeshStandardMaterial[];
  sideCueMeshes: Record<Side, readonly THREE.Mesh[]>;
};

type GameSettings = {
  sensitivity: number;
  volume: number;
  quality: QualitySetting;
  difficulty: BotDifficulty;
};

type TouchInput = {
  setKey: (code: string, pressed: boolean) => void;
  setFiring: (pressed: boolean) => void;
  jump: () => void;
  reload: () => void;
  toggleScope: () => void;
  dropWeapon: () => void;
  cycleWeapon: () => void;
  cycleSpectator: () => void;
  callBackup: () => void;
  toggleBuy: () => void;
  setScoreboard: (visible: boolean) => void;
  start: () => void;
  pause: () => void;
};

type RadarContact = {
  id: string;
  team: BotTeam;
  x: number;
  z: number;
  hasBomb: boolean;
};

type RosterEntry = {
  id: number;
  name: string;
  alive: boolean;
  kills: number;
  deaths: number;
  hasBomb: boolean;
};

type NearbyFirearm = {
  kind: FirearmKind;
  magazine: number;
  reserve: number;
};

type BotDeathJointState = {
  px: number;
  py: number;
  pz: number;
  rx: number;
  ry: number;
  rz: number;
};

type BotDeathLimbState = {
  knee: number;
  ankle: number;
  elbow: number;
  plant: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  toeClearance: number;
};

type BotDeathPresentationState = {
  visualRootOffsetX: number;
  visualRootOffsetY: number;
  visualRootOffsetZ: number;
  visualRootPitch: number;
  visualRootRoll: number;
  leftThighPitch: number;
  rightThighPitch: number;
  leftShoulderPitch: number;
  rightShoulderPitch: number;
  pelvis: BotDeathJointState;
  lowerBody: BotDeathJointState;
  upperBody: BotDeathJointState;
  head: BotDeathJointState;
  leftThigh: BotDeathJointState;
  leftShin: BotDeathJointState;
  leftFoot: BotDeathJointState;
  leftShoulder: BotDeathJointState;
  leftForearm: BotDeathJointState;
  leftHand: BotDeathJointState;
  rightThigh: BotDeathJointState;
  rightShin: BotDeathJointState;
  rightFoot: BotDeathJointState;
  rightShoulder: BotDeathJointState;
  rightForearm: BotDeathJointState;
  rightHand: BotDeathJointState;
  leftLeg: BotDeathLimbState;
  rightLeg: BotDeathLimbState;
  leftArm: BotDeathLimbState;
  rightArm: BotDeathLimbState;
};

type PlayerDeathCameraState = {
  start: PlayerCameraPose;
  elapsedSeconds: number;
  variant: PlayerDeathCameraVariant;
};

type HudState = {
  health: number;
  armor: number;
  helmet: boolean;
  ammo: number;
  reserve: number;
  money: number;
  seconds: number;
  enemies: number;
  allies: number;
  friendlyAlive: number;
  status: GameStatus;
  ctScore: number;
  tScore: number;
  message: string;
  radioCallout: string | null;
  canCallBackup: boolean;
  roundTransition: RoundTransitionBrief | null;
  completedRoundReceipt: CompletedRoundReceipt | null;
  killFeed: string[];
  radarContacts: RadarContact[];
  radarPlayer: { x: number; z: number; yaw: number };
  bombPlanted: boolean;
  canDefuse: boolean;
  defuseProgress: number;
  hasDefuseKit: boolean;
  buyTime: number;
  buyBlockReason: BuyBlockReason | null;
  weaponName: string;
  bombState: BombState;
  bombsite: BombsiteName;
  plantProgress: number;
  spectating: { name: string; team: BotTeam } | null;
  deathCameraActive: boolean;
  canCycleSpectator: boolean;
  canSkipBotRoundWait: boolean;
  skippingBotRound: boolean;
  freezeSeconds: number;
  activeWeapon: WeaponKind;
  primaryWeapon: PrimaryWeaponKind | null;
  secondaryWeapon: SecondaryWeaponKind | null;
  magazineSize: number;
  ammoDisplay: 'firearm' | 'melee' | 'throwable' | 'objective';
  crosshairGap: number;
  playerKills: number;
  playerDeaths: number;
  playerAlive: boolean;
  enemyRoster: RosterEntry[];
  allyRoster: RosterEntry[];
  grenades: number;
  smokes: number;
  flashes: number;
  flashOpacity: number;
  scoped: boolean;
  canScope: boolean;
  canDropBomb: boolean;
  canDropWeapon: boolean;
  canRecoverBomb: boolean;
  nearbyFirearm: NearbyFirearm | null;
  roundNumber: number;
  roundPhase: MatchRoundPhase;
  playerSide: Side;
  playerHasBomb: boolean;
  canPlant: boolean;
  enemyDefuseProgress: number;
  reloading: boolean;
  reloadProgress: number;
  reloadWeaponName: string | null;
};

type Enemy = {
  id: number;
  team: BotTeam;
  side: Side;
  name: string;
  root: THREE.Group;
  skinned: SkinnedCharacterInstance;
  rig: CharacterRig;
  animationState: BotAnimationState;
  animationPose: BotAnimationPose;
  leftLegDeformationController: CharacterLimbDeformationController;
  rightLegDeformationController: CharacterLimbDeformationController;
  leftArmDeformationController: CharacterLimbDeformationController;
  rightArmDeformationController: CharacterLimbDeformationController;
  hitMeshes: THREE.Mesh[];
  health: number;
  armor: number;
  helmet: boolean;
  alive: boolean;
  profile: EnemyCombatProfile;
  fireCooldown: number;
  burstShotsRemaining: number;
  glockBurst: BotGlockBurst;
  movementDecisionTimer: number;
  combatMovement: EnemyCombatMovement;
  suppression: number;
  ammo: FirearmAmmo;
  primaryWeapon: FirearmKind;
  stowedPrimary: BotInventory['stowedPrimary'];
  money: number;
  secondaryWeapon: SecondaryWeaponKind;
  secondaryAmmo: FirearmAmmo;
  grenades: number;
  smokes: number;
  flashes: number;
  weaponModels: Record<FirearmKind, THREE.Group>;
  silencerModels: Record<'usp' | 'carbine', THREE.Mesh>;
  secondaryMuzzles: Record<SecondaryWeaponKind, readonly THREE.PointLight[]>;
  secondaryMuzzleIndex: number;
  activeSecondaryMuzzle: THREE.PointLight | null;
  blindUntilMs: number;
  reloadTimer: number;
  utility: BotUtilityState;
  shots: ReturnType<typeof createBotShotState>;
  special: ReturnType<typeof createWeaponSpecialActions>;
  route: THREE.Vector2[];
  waypointIndex: number;
  role: EnemyRole;
  homeSite: BombsiteName;
  guardPoint: THREE.Vector2;
  hasDefuseKit: boolean;
  plantProgress: number;
  kills: number;
  deaths: number;
  muzzleFlash: THREE.PointLight;
  sightTime: number;
  combatTargetId: EnemyCombatTargetId | null;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  appearance: EnemyAppearanceRefs;
  lastKnownOpponentPosition: THREE.Vector3;
  combatMemory: number;
  blockedSeconds: number;
  movementSpeed: number;
  verticalVelocity: number;
  grounded: boolean;
  motionResolvedThisTick: boolean;
  locomotionVelocityX: number;
  locomotionVelocityZ: number;
  locomotionPhase: number;
  bodyYaw: number;
  aimYaw: number;
  lastAccelerationX: number;
  lastAccelerationZ: number;
  locomotionCommanded: boolean;
  nextFootstepAtMs: number;
  deathElapsedSeconds: number;
  deathVariant: BotDeathVariant;
  deathPose: MutableBotVisualPose;
  deathPresentation: BotDeathPresentationState | null;
  weaponGripOutput: CharacterRigWeaponGripOutput;
};

type UtilityOwner =
  | Readonly<{ kind: 'player'; side: Side }>
  | Readonly<{ kind: 'bot'; side: Side; bot: Enemy }>;

type GrenadeProjectile = {
  kind: 'frag' | 'smoke' | 'flash';
  owner: UtilityOwner;
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  fuseRemaining: number;
};

type Collider = {
  box: THREE.Box3;
  mesh: THREE.Mesh;
};

type DroppedFirearm = {
  id: number;
  kind: FirearmKind;
  ammo: FirearmAmmo;
  group: THREE.Group;
  origin: 'enemy' | 'player';
  pickupAvailableAtMs: number;
};

const PLAYER_FIREARM_PICKUP_GRACE_MS = 750;
const ROUND_RESULT_REVIEW_MS = 3000;

const BOT_NAMES: Record<Side, readonly string[]> = {
  ct: ['Atlas', 'Mira', 'Gale', 'Holt', 'Flint'],
  t: ['Rook', 'Mako', 'Viper', 'Kestrel', 'Cobra'],
};

const INITIAL_SECONDARY = getStarterSecondaryForSide('ct');
const INITIAL_SECONDARY_AMMO = createStarterSecondaryAmmo('ct');

const createEmptyFirearmAmmo = (): Record<FirearmKind, FirearmAmmo> =>
  Object.fromEntries(
    (Object.keys(FIREARMS) as FirearmKind[]).map((kind) => [
      kind,
      { magazine: 0, reserve: 0 },
    ]),
  ) as Record<FirearmKind, FirearmAmmo>;

const INITIAL_HUD: HudState = {
  health: 100,
  armor: 0,
  helmet: false,
  ammo: INITIAL_SECONDARY_AMMO.magazine,
  reserve: INITIAL_SECONDARY_AMMO.reserve,
  money: 800,
  seconds: ROUND_DURATION_SECONDS,
  enemies: 5,
  allies: 4,
  friendlyAlive: 5,
  status: 'briefing',
  ctScore: 0,
  tScore: 0,
  message: 'OPERATION DUSTLINE',
  radioCallout: null,
  canCallBackup: false,
  roundTransition: null,
  completedRoundReceipt: null,
  killFeed: [],
  radarContacts: [],
  radarPlayer: { x: 0, z: 0, yaw: 0 },
  bombPlanted: false,
  canDefuse: false,
  defuseProgress: 0,
  hasDefuseKit: false,
  buyTime: 15,
  buyBlockReason: null,
  weaponName: FIREARMS[INITIAL_SECONDARY].label,
  bombState: 'carried',
  bombsite: 'A',
  plantProgress: 0,
  spectating: null,
  deathCameraActive: false,
  canCycleSpectator: false,
  canSkipBotRoundWait: false,
  skippingBotRound: false,
  freezeSeconds: 0,
  activeWeapon: INITIAL_SECONDARY,
  primaryWeapon: null,
  secondaryWeapon: INITIAL_SECONDARY,
  magazineSize: FIREARMS[INITIAL_SECONDARY].magazineSize,
  ammoDisplay: 'firearm',
  crosshairGap: 5,
  playerKills: 0,
  playerDeaths: 0,
  playerAlive: true,
  enemyRoster: BOT_NAMES.t.map((name, id) => ({
    id,
    name,
    alive: true,
    kills: 0,
    deaths: 0,
    hasBomb: id === 0,
  })),
  allyRoster: BOT_NAMES.ct.slice(0, 4).map((name, id) => ({
    id,
    name,
    alive: true,
    kills: 0,
    deaths: 0,
    hasBomb: false,
  })),
  grenades: 0,
  smokes: 0,
  flashes: 0,
  flashOpacity: 0,
  scoped: false,
  canScope: false,
  canDropBomb: false,
  canDropWeapon: false,
  canRecoverBomb: false,
  nearbyFirearm: null,
  roundNumber: 1,
  roundPhase: {
    kind: 'regulation',
    label: 'REGULATION',
    roundNumber: 1,
    roundLimit: REGULATION_ROUNDS,
    targetScore: MATCH_WIN_SCORE,
    overtimeNumber: null,
  },
  playerSide: 'ct',
  playerHasBomb: false,
  canPlant: false,
  enemyDefuseProgress: 0,
  reloading: false,
  reloadProgress: 0,
  reloadWeaponName: null,
};

const T_ATTACKER_SPAWNS: Array<[number, number]> = DUST2_MAP.teamSpawns.t.map(point => [...point]);

const CT_DEFENDER_ASSIGNMENTS: Array<{
  spawn: [number, number];
  guard: [number, number];
  site: BombsiteName;
  kit: boolean;
}> = [
  { spawn: [...DUST2_MAP.teamSpawns.ct[0]], guard: [0, -17], site: 'A', kit: false },
  { spawn: [...DUST2_MAP.teamSpawns.ct[1]], guard: [26.5, -25], site: 'A', kit: true },
  { spawn: [...DUST2_MAP.teamSpawns.ct[2]], guard: [22, -23], site: 'A', kit: false },
  { spawn: [...DUST2_MAP.teamSpawns.ct[3]], guard: [-28, -24], site: 'B', kit: true },
  { spawn: [...DUST2_MAP.teamSpawns.ct[4]], guard: [-23, -21], site: 'B', kit: false },
];

const DEFAULT_SETTINGS: GameSettings = {
  sensitivity: 1,
  volume: 0.72,
  quality: 'high',
  difficulty: 'recruit',
};

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);
  const restartRef = useRef<
    (newMatch: boolean, snapshotReason?: GraphicsBudgetSnapshotReason) => void
  >(() => undefined);
  const purchaseRef = useRef<(slot: string) => void>(() => undefined);
  const skipBotRoundRef = useRef<() => boolean>(() => false);
  const lifecycleReplayRef = useRef<() => void>(() => undefined);
  const [lifecycleQaAvailable, setLifecycleQaAvailable] = useState(false);
  const [lifecycleReport, setLifecycleReport] = useState<LifecycleReport | null>(null);
  const applySettingsRef = useRef<(settings: GameSettings) => void>(
    () => undefined,
  );
  const engineSettingsRef = useRef<GameSettings>(DEFAULT_SETTINGS);
  const characterTemplateRef = useRef<SkinnedCharacterTemplate | null>(null);
  const ctCharacterTemplateRef = useRef<SkinnedCharacterTemplate | null>(null);
  const viewmodelSurfaceRef = useRef<THREE.Texture | null>(null);
  const authoredRifleRef = useRef<THREE.Group | null>(null);
  const authoredCarbineRef = useRef<AuthoredViewmodelTemplate | null>(null);
  const authoredPistolRef = useRef<AuthoredViewmodelTemplate | null>(null);
  const touchInputRef = useRef<TouchInput>({
    setKey: () => undefined,
    setFiring: () => undefined,
    jump: () => undefined,
    reload: () => undefined,
    toggleScope: () => undefined,
    dropWeapon: () => undefined,
    cycleWeapon: () => undefined,
    cycleSpectator: () => undefined,
    callBackup: () => undefined,
    toggleBuy: () => undefined,
    setScoreboard: () => undefined,
    start: () => undefined,
    pause: () => undefined,
  });
  const [hud, setHud] = useState(INITIAL_HUD);
  const [locked, setLocked] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);
  const [damageDirection, setDamageDirection] = useState<DamageDirection | ''>(
    '',
  );
  const [buyOpen, setBuyOpen] = useState(false);
  const [scoreboardOpen, setScoreboardOpen] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [renderError, setRenderError] = useState('');
  const [controlNotice, setControlNotice] = useState('');
  const [characterAssetStatus, setCharacterAssetStatus] =
    useState<CharacterAssetStatus>('loading');
  const [characterLoadAttempt, setCharacterLoadAttempt] = useState(0);
  const [keyboardPlaytestAvailable, setKeyboardPlaytestAvailable] =
    useState(false);
  const [graphicsBudgetSnapshot, setGraphicsBudgetSnapshot] = useState('');
  const [frameProfileSnapshot, setFrameProfileSnapshot] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isLocalHost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    window.queueMicrotask(() => setLifecycleQaAvailable(
      isMatchLifecycleQaEnabled(window.location.search, window.location.hostname),
    ));
    window.queueMicrotask(() =>
      setKeyboardPlaytestAvailable(
        isLocalHost && params.get('keyboard-playtest') === '1',
      ),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      preloadSkinnedCharacter(),
      preloadSkinnedCharacter(AUTHORED_CT_CHARACTER_ASSET_URL, 'authored'),
      preloadViewmodelSurface(),
      preloadAuthoredRifle(),
      preloadAuthoredCarbine(),
      preloadAuthoredPistol(),
    ]).then(
      ([template, ctTemplate, surface, rifleAsset, carbineAsset, pistolAsset]) => {
        if (cancelled) return;
        characterTemplateRef.current = template;
        ctCharacterTemplateRef.current = ctTemplate;
        viewmodelSurfaceRef.current = surface;
        authoredRifleRef.current = rifleAsset;
        authoredCarbineRef.current = carbineAsset;
        authoredPistolRef.current = pistolAsset;
        setCharacterAssetStatus('ready');
      },
      () => {
        if (cancelled) return;
        characterTemplateRef.current = null;
        ctCharacterTemplateRef.current = null;
        viewmodelSurfaceRef.current = null;
        authoredRifleRef.current = null;
        authoredCarbineRef.current = null;
        authoredPistolRef.current = null;
        setCharacterAssetStatus('error');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [characterLoadAttempt]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem('dustline-settings');
        if (!stored) {
          if (window.matchMedia('(pointer: coarse)').matches) {
            const mobileDefaults = {
              ...DEFAULT_SETTINGS,
              quality: 'performance' as const,
            };
            engineSettingsRef.current = mobileDefaults;
            setSettings(mobileDefaults);
            applySettingsRef.current(mobileDefaults);
          }
          return;
        }
        const parsed = JSON.parse(stored) as Partial<GameSettings>;
        const storedSensitivity = Number(parsed.sensitivity);
        const storedVolume = Number(parsed.volume);
        const restored: GameSettings = {
          sensitivity: Number.isFinite(storedSensitivity)
            ? THREE.MathUtils.clamp(storedSensitivity, 0.45, 1.8)
            : DEFAULT_SETTINGS.sensitivity,
          volume: Number.isFinite(storedVolume)
            ? THREE.MathUtils.clamp(storedVolume, 0, 1)
            : DEFAULT_SETTINGS.volume,
          quality: parsed.quality === 'performance' ? 'performance' : 'high',
          difficulty: normalizeBotDifficulty(parsed.difficulty),
        };
        engineSettingsRef.current = restored;
        setSettings(restored);
        applySettingsRef.current(restored);
      } catch {
        window.localStorage.removeItem('dustline-settings');
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    const characterTemplate = characterTemplateRef.current;
    const ctCharacterTemplate = ctCharacterTemplateRef.current;
    const viewmodelSurface = viewmodelSurfaceRef.current;
    const authoredRifle = authoredRifleRef.current;
    const authoredCarbine = authoredCarbineRef.current;
    const authoredPistol = authoredPistolRef.current;
    if (
      !mount ||
      characterAssetStatus !== 'ready' ||
      !characterTemplate ||
      !ctCharacterTemplate ||
      !viewmodelSurface ||
      !authoredRifle ||
      !authoredCarbine ||
      !authoredPistol
    )
      return;
    const keyboardPlaytestInputEnabled =
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1') &&
      new URLSearchParams(window.location.search).get('keyboard-playtest') ===
        '1';

    const startingPlayerSide = getLocalPlaytestSide(window.location.search, window.location.hostname);
    const frameProfiler = isLocalFrameProfileEnabled(window.location.search, window.location.hostname)
      ? new LocalFrameProfileCollector() : null;
    const scene = new THREE.Scene();
    const initialRenderProfile = getClassicRenderProfile(
      engineSettingsRef.current.quality,
    );
    const fogColor = initialRenderProfile.fogColor;
    scene.background = new THREE.Color(CLASSIC_HORIZON_COLOR);
    scene.fog = new THREE.Fog(
      fogColor,
      initialRenderProfile.fogNear,
      initialRenderProfile.fogFar,
    );

    const camera = new THREE.PerspectiveCamera(
      74,
      mount.clientWidth / mount.clientHeight,
      VIEWMODEL_NEAR_PLANE,
      180,
    );
    camera.rotation.order = 'YXZ';
    const presentationCamera = new THREE.PerspectiveCamera(
      74,
      mount.clientWidth / mount.clientHeight,
      VIEWMODEL_NEAR_PLANE,
      180,
    );
    presentationCamera.rotation.order = 'YXZ';
    scene.add(camera);
    scene.add(presentationCamera);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      window.queueMicrotask(() => {
        setRenderError(
          'Dustline needs WebGL enabled in a modern browser to render the 3D arena.',
        );
      });
      return;
    }
    const syncRenderResolution = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      renderer.setPixelRatio(
        getRenderPixelRatio(
          engineSettingsRef.current.quality,
          window.devicePixelRatio,
        ),
      );
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    const syncPresentationCamera = () => {
      presentationCamera.fov = camera.fov;
      presentationCamera.aspect = camera.aspect;
      presentationCamera.near = camera.near;
      presentationCamera.far = camera.far;
      presentationCamera.position.copy(camera.position);
      presentationCamera.rotation.copy(camera.rotation);
      presentationCamera.updateProjectionMatrix();
    };
    const applyPlayerPresentationCamera = () => {
      if (!playerPresentationPose) return;
      presentationCamera.position.add(playerInterpolationOffset);
      const { cameraOffset, authoritativeYawRadians, cameraRoll } =
        playerPresentationPose;
      const sinYaw = Math.sin(authoritativeYawRadians);
      const cosYaw = Math.cos(authoritativeYawRadians);
      presentationCamera.position.x +=
        cameraOffset.x * cosYaw - cameraOffset.z * sinYaw;
      // camera already contains the legacy bob; replace only that Y component
      // with the new bounded presentation offset.
      presentationCamera.position.y +=
        cameraOffset.y - playerPresentationLegacyCameraY;
      presentationCamera.position.z +=
        -cameraOffset.x * sinYaw - cameraOffset.z * cosYaw;
      presentationCamera.rotation.z += cameraRoll;
    };
    const renderFrame = (displayMutation?: () => void) => {
      syncPresentationCamera();
      applyPlayerPresentationCamera();
      displayMutation?.();
      renderWorldWithViewmodelOverlay(renderer, scene, presentationCamera);
    };
    syncRenderResolution();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // ACES rolls off the top of the range so a sunlit wall keeps a visible
    // gradient across its face rather than clipping to a single flat value.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = initialRenderProfile.toneMappingExposure;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('aria-label', 'Dustline tactical arena');
    mount.appendChild(renderer.domElement);

    // Classic frame: one warm shadow caster plus restrained hemisphere fill.
    const hemisphereLight = new THREE.HemisphereLight(
      initialRenderProfile.hemisphereSkyColor,
      initialRenderProfile.hemisphereGroundColor,
      initialRenderProfile.hemisphereIntensity,
    );
    hemisphereLight.userData.persistent = true;
    enableViewmodelLighting(hemisphereLight);
    scene.add(hemisphereLight);

    const sun = new THREE.DirectionalLight(
      0xffefd8,
      initialRenderProfile.sunIntensity,
    );
    sun.userData.persistent = true;
    enableViewmodelLighting(sun);
    sun.position.set(-28, 40, 14);
    sun.castShadow = true;
    const shadowMapSize = Math.max(1, initialRenderProfile.shadowMapSize);
    sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 46;
    sun.shadow.camera.bottom = -46;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 92;
    sun.shadow.radius = 3;
    sun.shadow.bias = -0.00035;
    sun.shadow.normalBias = 0.025;
    scene.add(sun);

    const architectureDetailRoot = new THREE.Group();
    const decorativeDetailRoot = new THREE.Group();
    let staticEnvironmentBatching = {
      sourceMeshes: 0,
      batchedMeshes: 0,
      drawProxiesRemoved: 0,
    };
    const performanceOptionalDetails: THREE.Object3D[] = [];
    const characterRenderVariants: Array<{
      proxy: THREE.Mesh;
      smooth: THREE.Mesh;
    }> = [];
    scene.add(architectureDetailRoot, decorativeDetailRoot);

    let hasPublishedPostReadyBudget = false;
    const publishGraphicsBudget = (
      reason: GraphicsBudgetSnapshotReason,
      weaponAtSnapshot: WeaponKind | null = null,
    ) => {
      if (reason === 'ready' && hasPublishedPostReadyBudget) return;
      if (reason !== 'ready') hasPublishedPostReadyBudget = true;
      const budget = inspectGraphicsBudget(
        scene,
        engineSettingsRef.current.quality,
      );
      const architecture = inspectVisibleGeometryLoad(architectureDetailRoot);
      const decorative = inspectVisibleGeometryLoad(decorativeDetailRoot);
      const viewmodel = inspectVisibleGeometryLoad(presentationCamera);
      const snapshot = JSON.stringify({
        ...budget,
        snapshot: {
          reason,
          weaponAtSnapshot,
          viewmodelVisibleAtSnapshot: viewmodel.visibleDrawProxies > 0,
        },
        geometryBreakdown: {
          architecture,
          decorative,
          viewmodel,
          other: {
            visibleDrawProxies:
              budget.visibleDrawProxies -
              architecture.visibleDrawProxies -
              decorative.visibleDrawProxies -
              viewmodel.visibleDrawProxies,
            visibleTriangles:
              budget.visibleTriangles -
              architecture.visibleTriangles -
              decorative.visibleTriangles -
              viewmodel.visibleTriangles,
          },
        },
        staticEnvironmentBatching,
      });
      mount.dataset.graphicsBudget = snapshot;
      setGraphicsBudgetSnapshot(snapshot);
    };

    const registerCharacterRenderVariant = (
      proxy: THREE.Mesh,
      smooth: THREE.Mesh,
    ) => {
      smooth.name = `${proxy.name || 'character-part'}-retired-render`;
      smooth.raycast = () => undefined;
      smooth.visible = false;
      proxy.userData.smoothVisual = smooth;
      characterRenderVariants.push({ proxy, smooth });
    };

    const setCharacterHitEmissive = (mesh: THREE.Mesh, color: number) => {
      const enemy = mesh.userData.enemy as Enemy | undefined;
      enemy?.skinned.materials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial)
          material.emissive.setHex(color);
      });
    };

    const applyEngineSettings = (next: GameSettings) => {
      engineSettingsRef.current = next;
      const highQuality = next.quality === 'high';
      const profile = getClassicRenderProfile(next.quality);
      syncRenderResolution();
      renderer.shadowMap.enabled = highQuality;
      renderer.shadowMap.needsUpdate = true;
      sun.castShadow = highQuality;
      renderer.toneMappingExposure = profile.toneMappingExposure;
      hemisphereLight.color.setHex(profile.hemisphereSkyColor);
      hemisphereLight.groundColor.setHex(profile.hemisphereGroundColor);
      hemisphereLight.intensity = profile.hemisphereIntensity;
      sun.intensity = profile.sunIntensity;
      architectureDetailRoot.visible = true;
      decorativeDetailRoot.visible = highQuality;
      performanceOptionalDetails.forEach((detail) => {
        detail.visible = highQuality;
      });
      scene.fog = new THREE.Fog(
        profile.fogColor,
        profile.fogNear,
        profile.fogFar,
      );
      if (mount.dataset.visualQaReady === 'true')
        window.queueMicrotask(() => publishGraphicsBudget('quality-change'));
    };
    applySettingsRef.current = applyEngineSettings;
    applyEngineSettings(engineSettingsRef.current);

    const createClassicDiffuseTexture = (
      family: ClassicMaterialFamily,
      seed: number,
    ) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const context = canvas.getContext('2d');
      if (!context) return null;
      const imageData = context.createImageData(canvas.width, canvas.height);
      imageData.data.set(
        createClassicDiffusePixelData(
          family,
          seed,
          canvas.width,
          canvas.height,
        ),
      );
      context.putImageData(imageData, 0, 0);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = Math.min(
        8,
        renderer.capabilities.getMaxAnisotropy(),
      );
      return texture;
    };

    /**
     * Derives a normal map from the same raster the diffuse pass produced, so
     * sunlight varies across a surface instead of lighting every texel of a
     * wall identically. No extra art assets are introduced.
     */
    const createClassicReliefTexture = (
      family: ClassicMaterialFamily,
      seed: number,
    ) => {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) return null;
      const diffusePixels = createClassicDiffusePixelData(
        family,
        seed,
        size,
        size,
      );
      const reliefPixels = createClassicReliefPixelData(
        diffusePixels,
        size,
        size,
      );
      const imageData = context.createImageData(size, size);
      imageData.data.set(reliefPixels);
      context.putImageData(imageData, 0, 0);
      const texture = new THREE.CanvasTexture(canvas);
      // Normal maps hold vectors, not colour, so they stay in linear space.
      texture.colorSpace = THREE.NoColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = Math.min(
        8,
        renderer.capabilities.getMaxAnisotropy(),
      );
      texture.needsUpdate = true;
      return texture;
    };

    // Exactly six 256px structural diffuse textures; materials share these maps.
    const classicTextures = {
      plaster: createClassicDiffuseTexture('plaster', 5107),
      cutStone: createClassicDiffuseTexture('cutStone', 2767),
      darkMasonry: createClassicDiffuseTexture('darkMasonry', 4051),
      sand: createClassicDiffuseTexture('sand', 1729),
      timber: createClassicDiffuseTexture('timber', 6421),
      paintedOxidizedMetal: createClassicDiffuseTexture(
        'paintedOxidizedMetal',
        7919,
      ),
    } satisfies Record<ClassicMaterialFamily, THREE.CanvasTexture | null>;
    // Relief maps mirror the diffuse set one-for-one, derived from the same
    // seeds so the bumps line up exactly with the painted detail.
    const classicReliefTextures = {
      plaster: createClassicReliefTexture('plaster', 5107),
      cutStone: createClassicReliefTexture('cutStone', 2767),
      darkMasonry: createClassicReliefTexture('darkMasonry', 4051),
      sand: createClassicReliefTexture('sand', 1729),
      timber: createClassicReliefTexture('timber', 6421),
      paintedOxidizedMetal: createClassicReliefTexture(
        'paintedOxidizedMetal',
        7919,
      ),
    } satisfies Record<ClassicMaterialFamily, THREE.CanvasTexture | null>;
    const weaponSurfaceFinish = createWeaponSurfaceFinish(
      renderer.capabilities.getMaxAnisotropy(),
    );
    const gunWoodTexture = createWeaponWoodTexture();
    const configureDiffuseRepeat = (
      texture: THREE.Texture | null,
      repeatX: number,
      repeatY: number,
    ) => {
      if (!texture) return;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.needsUpdate = true;
    };
    // Object geometry carries the world-space repeat below; keeping shared maps
    // at one repeat prevents normalized UVs from swimming between wall sizes.
    configureDiffuseRepeat(classicTextures.sand, 1, 1);
    configureDiffuseRepeat(classicTextures.cutStone, 1, 1);
    configureDiffuseRepeat(classicTextures.darkMasonry, 1, 1);
    configureDiffuseRepeat(classicTextures.plaster, 1, 1);
    configureDiffuseRepeat(classicTextures.timber, 1, 1);
    configureDiffuseRepeat(classicTextures.paintedOxidizedMetal, 1, 1);
    configureDiffuseRepeat(gunWoodTexture, 1, 1);
    const scaleGeometryUv = (
      geometry: THREE.BufferGeometry,
      scale: readonly [number, number],
    ) => {
      const uv = geometry.getAttribute('uv');
      if (!uv) return;
      for (let index = 0; index < uv.count; index += 1) {
        uv.setXY(index, uv.getX(index) * scale[0], uv.getY(index) * scale[1]);
      }
      uv.needsUpdate = true;
    };
    const materialFamily = (
      material: THREE.Material,
    ): ClassicMaterialFamily | null => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return null;
      if (material.map === classicTextures.sand) return 'sand';
      if (material.map === classicTextures.cutStone) return 'cutStone';
      if (material.map === classicTextures.darkMasonry) return 'darkMasonry';
      if (material.map === classicTextures.plaster) return 'plaster';
      if (material.map === classicTextures.timber) return 'timber';
      if (material.map === classicTextures.paintedOxidizedMetal)
        return 'paintedOxidizedMetal';
      return null;
    };
    const applyWorldConsistentUv = (
      geometry: THREE.BufferGeometry,
      size: readonly [number, number, number],
      material: THREE.Material,
    ) => {
      const environmentSurface = material.userData.environmentSurface as
        | EnvironmentSurfaceKind
        | undefined;
      if (environmentSurface) {
        applyEnvironmentSurfaceUv(geometry, environmentSurface);
        return;
      }
      const family = materialFamily(material);
      if (!family) return;
      // Project each plane in local metres. A short end of a long wall must
      // have the same brick size as its front, and top faces use both spans.
      const positions = geometry.getAttribute('position');
      const normals = geometry.getAttribute('normal');
      const uv = geometry.getAttribute('uv');
      if (!positions || !normals || !uv) return;
      for (let index = 0; index < positions.count; index += 1) {
        const [u, v] = getClassicBoxFaceUv(
          family,
          size,
          [positions.getX(index), positions.getY(index), positions.getZ(index)],
          [normals.getX(index), normals.getY(index), normals.getZ(index)],
        );
        uv.setXY(index, u, v);
      }
      uv.needsUpdate = true;
    };
    const groundMaterial = new THREE.MeshStandardMaterial({
      map: classicTextures.sand,
      color: 0xd6be94,
      roughness: 1,
    });
    const groundGeometry = new THREE.PlaneGeometry(72, 72, 24, 24);
    scaleGeometryUv(
      groundGeometry,
      getClassicWorldUvScale('sand', [72, 72, 0]),
    );
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.21;
    ground.receiveShadow = true;
    ground.userData.surfaceImpactKind = 'sand' satisfies SurfaceImpactKind;
    scene.add(ground);

    const colliders: Collider[] = [];
    const colliderBoxesByMesh = new WeakMap<THREE.Object3D, THREE.Box3>();
    const obstacleMeshes: THREE.Mesh[] = [];
    const sand = new THREE.MeshStandardMaterial({
      map: classicTextures.sand,
      color: 0xd6be94,
      roughness: 0.96,
    });
    const environmentSurfaces = createEnvironmentSurfaceLibrary(
      renderer.capabilities.getMaxAnisotropy(),
    );
    environmentSurfaces.materials.cobblestone.color.setRGB(0.82, 0.67, 0.46);
    const cutStone = environmentSurfaces.materials.sandstoneBlocks;
    const darkSand = new THREE.MeshStandardMaterial({
      map: classicTextures.darkMasonry,
      color: 0xffffff,
      roughness: 0.96,
    });
    const plaster = environmentSurfaces.materials.weatheredPlaster;
    const wood = new THREE.MeshStandardMaterial({
      map: classicTextures.timber,
      color: 0xffffff,
      roughness: 0.95,
    });
    const metal = new THREE.MeshStandardMaterial({
      map: classicTextures.paintedOxidizedMetal,
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.08,
    });

    /**
     * Attaches the relief map that matches a material's diffuse family and
     * shares its UV transform, so the bumps stay locked to the painted detail
     * at every wall size.
     */
    const applySurfaceRelief = (
      material: THREE.MeshStandardMaterial,
      scale: number,
    ) => {
      const family = materialFamily(material);
      if (!family) return;
      const relief = classicReliefTextures[family];
      if (!relief) return;
      material.normalMap = relief;
      material.normalScale = new THREE.Vector2(scale, scale);
      material.needsUpdate = true;
    };

    // Ground and plaster carry the most screen area, so they get the clearest
    // relief; metal stays subtle because it is a smoother painted surface.
    applySurfaceRelief(sand, 0.85);
    applySurfaceRelief(darkSand, 0.8);
    applySurfaceRelief(wood, 0.7);
    applySurfaceRelief(metal, 0.35);

    const addBox = (
      position: [number, number, number],
      size: [number, number, number],
      material: THREE.Material,
      collision = true,
      visualMaterial: THREE.Material = material,
    ) => {
      // Keep an exact, hidden BoxGeometry proxy for simulation and a separate
      // micro-beveled shell for art. Only the proxy enters gameplay arrays.
      const proxyGeometry = new THREE.BoxGeometry(...size);
      applyWorldConsistentUv(proxyGeometry, size, material);
      const proxy = new THREE.Mesh(proxyGeometry, material);
      proxy.name = 'authoritative-structural-proxy';
      proxy.position.set(...position);
      proxy.visible = false;
      proxy.userData.authoritativeCollider = true;
      proxy.userData.surfaceImpactKind = (
        material === metal
          ? 'metal'
          : material === wood
            ? 'wood'
            : material === plaster
              ? 'plaster'
              : material === cutStone
                ? 'plaster'
                : 'sand'
      ) satisfies SurfaceImpactKind;
      scene.add(proxy);
      const radius = Math.min(
        CLASSIC_MICRO_BEVEL_MAX,
        Math.max(CLASSIC_MICRO_BEVEL_MIN, Math.min(...size) * 0.04),
      );
      const shellGeometry = visualMaterial === darkSand || visualMaterial === sand
        ? new THREE.BoxGeometry(...size)
        : new RoundedBoxGeometry(...size, 1, radius);
      applyWorldConsistentUv(shellGeometry, size, visualMaterial);
      const shell = new THREE.Mesh(shellGeometry, visualMaterial);
      shell.name = 'structural-micro-bevel-shell-visual-only';
      shell.position.set(...position);
      shell.castShadow = true;
      shell.receiveShadow = true;
      shell.raycast = () => undefined;
      shell.userData.visualOnly = true;
      architectureDetailRoot.add(shell);
      if (collision) {
        proxy.updateMatrixWorld(true);
        const bounds = getClassicStructuralProxyBounds(position, size);
        const box = new THREE.Box3(
          new THREE.Vector3(...bounds.min),
          new THREE.Vector3(...bounds.max),
        );
        colliders.push({ box, mesh: proxy });
        colliderBoxesByMesh.set(proxy, box);
        obstacleMeshes.push(proxy);
      }
      return proxy;
    };

    // Recreated Dust II: the same volumes feed visuals, collision and navigation.
    for (const [boxes, material, visualMaterial] of [
      [DUST2_GEOMETRY.walls, sand, cutStone], [DUST2_GEOMETRY.floors, darkSand, sand],
    ] as const) {
      for (const { min, max } of boxes) addBox(
        [(min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2],
        [max.x - min.x, max.y - min.y, max.z - min.z], material, true,
        boxes === DUST2_GEOMETRY.walls && min.z >= 18 ? plaster : visualMaterial,
      );
    }
    for (const { min, max, kind } of DUST2_MAP.solids) addBox(
      [(min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2],
      [max.x - min.x, max.y - min.y, max.z - min.z],
      kind === 'roof' ? cutStone : wood,
    );
    for (const ramp of DUST2_MAP.ramps) {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = ramp.minX + (positions.getX(i) + 0.5) * (ramp.maxX - ramp.minX);
        const z = ramp.minZ + (positions.getZ(i) + 0.5) * (ramp.maxZ - ramp.minZ);
        const t = ramp.axis === 'x' ? (x - ramp.minX) / (ramp.maxX - ramp.minX)
          : (z - ramp.minZ) / (ramp.maxZ - ramp.minZ);
        const y = positions.getY(i) > 0 ? ramp.startHeight + (ramp.endHeight - ramp.startHeight) * t : ramp.baseHeight;
        positions.setXYZ(i, x, y, z);
      }
      geometry.computeVertexNormals();
      applyWorldConsistentUv(geometry, [ramp.maxX - ramp.minX, 1, ramp.maxZ - ramp.minZ], sand);
      const mesh = new THREE.Mesh(geometry, sand);
      mesh.name = 'dust2-sloped-floor';
      mesh.receiveShadow = true;
      architectureDetailRoot.add(mesh);
      const proxy = new THREE.Mesh(geometry, darkSand);
      proxy.visible = false;
      proxy.userData.surfaceImpactKind = 'sand';
      scene.add(proxy);
      obstacleMeshes.push(proxy);
    }
    // Site paint uses original text rendering, not imported map artwork.
    for (const name of ['A', 'B'] as const) {
      const [x, z] = DUST2_MAP.sites[name];
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const context = canvas.getContext('2d')!;
      context.strokeStyle = context.fillStyle = '#a73522';
      context.lineWidth = 5;
      context.strokeRect(8, 8, 112, 112);
      context.font = 'bold 90px monospace';
      context.textAlign = 'center';
      context.fillText(name, 64, 94);
      const marker = new THREE.Mesh(new THREE.PlaneGeometry(4, 4),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }));
      marker.name = `classic-bombsite-${name.toLowerCase()}-paint-visual-only`;
      marker.userData.visualOnly = true;
      marker.raycast = () => undefined;
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(x, getMapGroundHeight(x, z) + 0.025, z);
      architectureDetailRoot.add(marker);
    }

    architectureDetailRoot.add(createDust2Architecture({
      stone: cutStone, plaster, timber: wood, metal, paving: environmentSurfaces.materials.cobblestone,
    }));

    mount.dataset.mountainPanoramaReady = 'loading';
    let mountainPanoramaLoadActive = true;
    let mountainPanorama: THREE.Mesh | null = null;
    const mountainPanoramaTexture = new THREE.TextureLoader().load(
      '/assets/environment/desert-mountain-panorama.png',
      (loadedTexture) => {
        if (!mountainPanoramaLoadActive) {
          loadedTexture.dispose();
          return;
        }
        if (mountainPanorama) mountainPanorama.visible = true;
        mount.dataset.mountainPanoramaReady = 'ready';
        publishGraphicsBudget('ready');
      },
      undefined,
      () => {
        if (!mountainPanoramaLoadActive) return;
        if (mountainPanorama) mountainPanorama.visible = false;
        mount.dataset.mountainPanoramaReady = 'error';
      },
    );
    mountainPanoramaTexture.name = 'desert-mountain-panorama';
    mountainPanoramaTexture.colorSpace = THREE.SRGBColorSpace;
    mountainPanoramaTexture.wrapS = THREE.MirroredRepeatWrapping;
    mountainPanoramaTexture.wrapT = THREE.ClampToEdgeWrapping;
    mountainPanoramaTexture.repeat.x = 2;
    mountainPanoramaTexture.generateMipmaps = true;
    mountainPanoramaTexture.minFilter = THREE.LinearMipmapLinearFilter;
    mountainPanoramaTexture.magFilter = THREE.LinearFilter;
    mountainPanoramaTexture.anisotropy = Math.min(
      8,
      renderer.capabilities.getMaxAnisotropy(),
    );
    mountainPanoramaTexture.userData.estimatedTextureBytes =
      DESERT_MOUNTAIN_PANORAMA_TEXTURE_BYTES;
    mountainPanorama = createMountainPanoramaMesh(mountainPanoramaTexture);
    mountainPanorama.visible = false;
    decorativeDetailRoot.add(mountainPanorama);

    // Everything currently under these roots is static environment art. Mark
    // that bounded set explicitly before dynamic bullet marks are attached.
    // The batching helper retains material identity and shadow/render state.
    [architectureDetailRoot, decorativeDetailRoot].forEach((root) => {
      root.traverse((object) => {
        if (
          object instanceof THREE.Mesh &&
          !(object instanceof THREE.InstancedMesh) &&
          !(object instanceof THREE.SkinnedMesh)
        ) {
          object.userData.visualOnly = true;
          object.userData.staticVisualBatch = true;
          object.userData.staticVisualBatchScope = root.uuid;
        }
      });
    });
    const architectureBatching = batchStaticVisualMeshes(
      architectureDetailRoot,
    );
    const decorativeBatching = batchStaticVisualMeshes(decorativeDetailRoot);
    staticEnvironmentBatching = {
      sourceMeshes:
        architectureBatching.sourceMeshes + decorativeBatching.sourceMeshes,
      batchedMeshes:
        architectureBatching.batchedMeshes + decorativeBatching.batchedMeshes,
      drawProxiesRemoved:
        architectureBatching.drawProxiesRemoved +
        decorativeBatching.drawProxiesRemoved,
    };

    const createBuyZoneMarker = (side: Side, color: number) => {
      const marker = new THREE.Mesh(
        new THREE.RingGeometry(BUY_ZONE_RADIUS - 0.09, BUY_ZONE_RADIUS, 64),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.52,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      marker.name = `buy-zone-${side}-ring-visual-only`;
      marker.userData.visualOnly = true;
      marker.raycast = () => undefined;
      const [x, z] = PLAYER_SPAWNS[side];
      marker.position.set(x, getMapGroundHeight(x, z) + 0.045, z);
      marker.rotation.x = -Math.PI / 2;
      marker.visible = false;
      scene.add(marker);
      return marker;
    };
    const buyZoneMarkers: Record<Side, THREE.Mesh> = {
      ct: createBuyZoneMarker('ct', 0x6eb9dd),
      t: createBuyZoneMarker('t', 0xd3a84c),
    };

    const bomb = new THREE.Group();
    const bombCase = new THREE.Mesh(
      new RoundedBoxGeometry(0.48, 0.18, 0.34, 3, 0.045),
      new THREE.MeshStandardMaterial({
        color: 0x242824,
        roughness: 0.7,
        metalness: 0.25,
      }),
    );
    bombCase.position.y = 0.12;
    bomb.add(bombCase);
    const bombDisplay = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.04, 0.13),
      new THREE.MeshBasicMaterial({ color: 0xb52f22 }),
    );
    bombDisplay.position.set(0, 0.225, 0);
    bomb.add(bombDisplay);
    const bombBeacon = new THREE.PointLight(0xe3472f, 0, 7, 2);
    bombBeacon.userData.transient = true;
    bombBeacon.position.y = 0.32;
    bomb.add(bombBeacon);
    bomb.position.set(0, 0.04, 0);
    bomb.visible = false;
    scene.add(bomb);

    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 256;
    skyCanvas.height = 256;
    const skyContext = skyCanvas.getContext('2d');
    if (skyContext) {
      const imageData = skyContext.createImageData(256, 256);
      imageData.data.set(createClassicSkyPixelData(9029, 256, 256));
      skyContext.putImageData(imageData, 0, 0);
    }
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    skyTexture.colorSpace = THREE.SRGBColorSpace;
    skyTexture.wrapS = THREE.RepeatWrapping;
    skyTexture.wrapT = THREE.ClampToEdgeWrapping;
    skyTexture.needsUpdate = true;
    const skyGeometry = new THREE.SphereGeometry(100, 32, 16);
    const skyMaterial = new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(skyGeometry, skyMaterial));

    const muzzleCanvas = document.createElement('canvas');
    muzzleCanvas.width = 128;
    muzzleCanvas.height = 128;
    const muzzleContext = muzzleCanvas.getContext('2d');
    if (muzzleContext) {
      const glow = muzzleContext.createRadialGradient(64, 64, 2, 64, 64, 58);
      glow.addColorStop(0, 'rgba(255,255,238,1)');
      glow.addColorStop(0.18, 'rgba(255,199,91,0.96)');
      glow.addColorStop(0.55, 'rgba(255,106,32,0.38)');
      glow.addColorStop(1, 'rgba(255,86,20,0)');
      muzzleContext.fillStyle = glow;
      muzzleContext.fillRect(0, 0, 128, 128);
      muzzleContext.save();
      muzzleContext.translate(64, 64);
      muzzleContext.fillStyle = 'rgba(255,224,147,0.9)';
      muzzleContext.beginPath();
      for (let point = 0; point < 16; point += 1) {
        const angle = (point / 16) * Math.PI * 2;
        const radius = point % 2 === 0 ? 54 : 13;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (point === 0) muzzleContext.moveTo(x, y);
        else muzzleContext.lineTo(x, y);
      }
      muzzleContext.closePath();
      muzzleContext.fill();
      muzzleContext.restore();
    }
    const muzzleTexture = new THREE.CanvasTexture(muzzleCanvas);
    muzzleTexture.colorSpace = THREE.SRGBColorSpace;

    const createMuzzleFlash = (
      color: number,
      profile: ReturnType<typeof getCombatVisualWeaponProfile>,
    ) => {
      const light = new THREE.PointLight(
        color,
        profile.muzzleIntensityMin,
        profile.muzzleRadius,
        2,
      );
      light.userData.transient = true;
      light.userData.muzzleIntensityMin = profile.muzzleIntensityMin;
      light.userData.muzzleIntensityMax = profile.muzzleIntensityMax;
      light.userData.muzzleSpriteScale = profile.muzzleSpriteScale;
      const flareMaterial = new THREE.SpriteMaterial({
        map: muzzleTexture,
        color,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const flare = new THREE.Sprite(flareMaterial);
      flare.scale.setScalar(profile.muzzleSpriteScale);
      flare.renderOrder = 8;
      flare.onBeforeRender = () => {
        const intensityMin = light.userData.muzzleIntensityMin as number;
        const intensityMax = light.userData.muzzleIntensityMax as number;
        const spriteScale = light.userData.muzzleSpriteScale as number;
        const intensityRange = intensityMax - intensityMin;
        const strength = THREE.MathUtils.clamp(
          (light.intensity - intensityMin) / intensityRange,
          0,
          1,
        );
        flareMaterial.opacity = strength;
        flare.scale.setScalar(spriteScale * (0.78 + strength * 0.42));
      };
      light.add(flare);
      return light;
    };
    const applyMuzzleFlashProfile = (
      light: THREE.PointLight,
      profile: ReturnType<typeof getCombatVisualWeaponProfile>,
    ) => {
      light.distance = profile.muzzleRadius;
      light.userData.muzzleIntensityMin = profile.muzzleIntensityMin;
      light.userData.muzzleIntensityMax = profile.muzzleIntensityMax;
      light.userData.muzzleSpriteScale = profile.muzzleSpriteScale;
    };
    const getMuzzleFadeFactor = (
      profile: ReturnType<typeof getCombatVisualWeaponProfile>,
      dtSeconds: number,
    ) => 1 - Math.exp((-dtSeconds * 4600) / profile.muzzleDurationMs);

    // Soft-chamfered hero models keep the old-school silhouette while worn
    // procedural finishes stop their broad surfaces from reading as toy blocks.
    const rifleDark = weaponSurfaceFinish.materials.metal;
    const rifleWood = new THREE.MeshStandardMaterial({
      map: gunWoodTexture,
      color: 0xffffff,
      roughness: 0.76,
    });
    const riflePolymer = weaponSurfaceFinish.materials.polymer;
    const gunHighlight = weaponSurfaceFinish.materials.accent;
    const pistolPolymer = weaponSurfaceFinish.materials.polymer;
    const createWorldFirearmMaterial = (
      name: string,
      source: THREE.MeshStandardMaterial,
      color: number,
      roughness: number,
      metalness: number,
      emissive: number,
      emissiveIntensity: number,
    ) => {
      const material = source.clone();
      material.name = `world-firearm-${name}`;
      material.color.setHex(color);
      material.roughness = roughness;
      material.metalness = metalness;
      material.emissive.setHex(emissive);
      material.emissiveMap = material.map;
      material.emissiveIntensity = emissiveIntensity;
      return material;
    };
    // World weapons project to only a few pixels at normal combat distance.
    // Their own neutral worn-metal palette keeps the receiver and hardware
    // separate from both faction torsos without changing the foreground gun.
    const worldFirearmMaterials = Object.freeze({
      polymer: createWorldFirearmMaterial(
        'polymer',
        riflePolymer,
        0x48514b,
        0.96,
        0.02,
        0x101310,
        0.12,
      ),
      metal: createWorldFirearmMaterial(
        'metal',
        rifleDark,
        0x767f78,
        0.86,
        0.08,
        0x252a25,
        0.17,
      ),
      accent: createWorldFirearmMaterial(
        'hardware',
        gunHighlight,
        0xc8c2aa,
        0.68,
        0.12,
        0x332f24,
        0.18,
      ),
      wood: createWorldFirearmMaterial(
        'wood',
        rifleWood,
        0xffffff,
        0.8,
        0,
        0x3b2818,
        0.18,
      ),
    });
    const createTaperedArmorPanel = (
      topWidth: number,
      bottomWidth: number,
      height: number,
      depth: number,
      bevel: number,
    ) => {
      const shape = new THREE.Shape();
      shape.moveTo(-bottomWidth / 2, -height / 2);
      shape.lineTo(bottomWidth / 2, -height / 2);
      shape.lineTo(topWidth / 2, height / 2);
      shape.lineTo(-topWidth / 2, height / 2);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: bevel,
        bevelThickness: bevel,
        curveSegments: 2,
      });
      geometry.translate(0, 0, -depth / 2);
      geometry.computeVertexNormals();
      return geometry;
    };
    const texturedViewmodelArmFactory = createTexturedViewmodelArmFactory(
      characterTemplate,
      viewmodelSurface,
    );
    const attachViewmodelArms = (kind: WeaponKind, root: THREE.Group) => {
      VIEWMODEL_ARM_POSES[kind].forEach((pose) => {
        root.add(texturedViewmodelArmFactory.create(pose).root);
      });
    };
    const primaryMuzzleColors: Readonly<Record<PrimaryWeaponKind, number>> = {
      rifle: 0xffad43,
      carbine: 0xffb85a,
      smg: 0xffbd59,
      shotgun: 0xffa83f,
      sniper: 0xffa13f,
    };
    const primaryViewModels = Object.fromEntries(
      PRIMARY_WEAPON_KINDS.map((kind) => {
        const model = kind === 'rifle'
          ? createAuthoredRifleViewmodel(authoredRifle, createMuzzleFlash(
              primaryMuzzleColors.rifle, getCombatVisualWeaponProfile('player', 'rifle'),
            ))
          : kind === 'carbine'
            ? createAuthoredCarbineViewmodel(authoredCarbine, createMuzzleFlash(
                primaryMuzzleColors.carbine, getCombatVisualWeaponProfile('player', 'carbine'),
              ))
          : createPrimaryFirstPersonModel(kind, {
          materials: {
            metal: rifleDark,
            wood: rifleWood,
            polymer: riflePolymer,
            accent: gunHighlight,
          },
          attachViewmodelArms: (root, primaryKind) =>
            attachViewmodelArms(primaryKind, root),
          createMuzzleFlash: (primaryKind) =>
            createMuzzleFlash(
              primaryMuzzleColors[primaryKind],
              getCombatVisualWeaponProfile('player', primaryKind),
            ),
        });
        presentationCamera.add(model.root);
        return [kind, model] as const;
      }),
    ) as Record<
      PrimaryWeaponKind,
      ReturnType<typeof createPrimaryFirstPersonModel>
    >;

    const secondaryViewModels = Object.fromEntries(
      SECONDARY_WEAPON_KINDS.map((kind) => {
        const model = kind === 'glock18'
          ? createAuthoredPistolViewmodel(authoredPistol, createMuzzleFlash(
              0xffc36a, getCombatVisualWeaponProfile('player', 'glock18'),
            ))
          : createSecondaryFirstPersonModel(kind, {
          materials: {
            body: pistolPolymer,
            metal: rifleDark,
            accent: gunHighlight,
          },
          attachViewmodelArms: (root, secondaryKind) =>
            attachViewmodelArms(secondaryKind, root),
          createMuzzleFlash: (secondaryKind) =>
            createMuzzleFlash(
              secondaryKind === 'deagle' ? 0xffa94b : 0xffc36a,
              getCombatVisualWeaponProfile('player', secondaryKind),
            ),
        });
        // The authored Glock carries its accepted camera-local mount.
        if (kind !== 'glock18') {
          const mount = SECONDARY_VIEWMODEL_FIRST_PERSON_MOUNTS[kind];
          model.root.position.set(...mount.position);
          model.root.rotation.set(...mount.rotation);
        }
        presentationCamera.add(model.root);
        return [kind, model] as const;
      }),
    ) as Record<
      SecondaryWeaponKind,
      SecondaryFirstPersonModel
    >;

    const grenadeBodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x4e5745,
      roughness: 0.84,
      metalness: 0.18,
    });
    const smokeBodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x9aa098,
      roughness: 0.76,
      metalness: 0.24,
    });
    const flashBodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4d1c8,
      roughness: 0.72,
      metalness: 0.28,
    });
    const equipmentViewModels = createEquipmentFirstPersonModels({
      knifeGripMaterial: rifleDark,
      throwableBodyMaterials: {
        grenade: grenadeBodyMaterial,
        smoke: smokeBodyMaterial,
        flash: flashBodyMaterial,
      },
      attachViewmodelArms: (kind, root) => attachViewmodelArms(kind, root),
    });
    const knife = equipmentViewModels.knife.root;
    const grenadeView = equipmentViewModels.grenade.root;
    const smokeView = equipmentViewModels.smoke.root;
    const flashView = equipmentViewModels.flash.root;
    const bombView = equipmentViewModels.bomb.root;
    Object.values(equipmentViewModels).forEach(({ root }) => {
      root.visible = false;
      presentationCamera.add(root);
    });
    presentationCamera.children.forEach(configureViewmodelRenderLayer);

    type WeaponView = {
      root: THREE.Group;
      basePosition: THREE.Vector3;
      baseRotation: THREE.Euler;
      actionParts?: PrimaryWeaponActionParts;
      authoredAnimation?: AuthoredViewmodelController;
      secondaryActionParts?: SecondaryWeaponActionParts;
      muzzle?: THREE.PointLight;
      muzzles?: readonly THREE.PointLight[];
      ejectionAnchor?: THREE.Object3D;
      ejectionAnchors?: readonly THREE.Object3D[];
    };
    const secondaryWeaponViews = Object.fromEntries(
      SECONDARY_WEAPON_KINDS.map((kind) => {
        const model = secondaryViewModels[kind];
        return [
          kind,
          {
            root: model.root,
            basePosition: model.root.position.clone(),
            baseRotation: model.root.rotation.clone(),
            muzzle: model.muzzle,
            muzzles: model.muzzles,
            ejectionAnchor: model.ejectionAnchors[0],
            ejectionAnchors: model.ejectionAnchors,
            secondaryActionParts: model.actionParts,
            authoredAnimation: model.authoredAnimation,
          },
        ];
      }),
    ) as Record<SecondaryWeaponKind, WeaponView>;
    const primaryWeaponViews = Object.fromEntries(
      PRIMARY_WEAPON_KINDS.map((kind) => {
        const model = primaryViewModels[kind];
        return [
          kind,
          {
            root: model.root,
            basePosition: model.root.position.clone(),
            baseRotation: model.root.rotation.clone(),
            actionParts: model.actionParts,
            authoredAnimation: model.authoredAnimation,
            muzzle: model.muzzle,
            ejectionAnchor: model.ejectionAnchor,
          },
        ];
      }),
    ) as Record<PrimaryWeaponKind, WeaponView>;
    const weaponViews: Record<WeaponKind, WeaponView> = {
      ...primaryWeaponViews,
      ...secondaryWeaponViews,
      knife: {
        root: knife,
        basePosition: new THREE.Vector3(
          ...EQUIPMENT_VIEWMODEL_MOUNTS.knife.position,
        ),
        baseRotation: knife.rotation.clone(),
      },
      grenade: {
        root: grenadeView,
        basePosition: new THREE.Vector3(
          ...EQUIPMENT_VIEWMODEL_MOUNTS.grenade.position,
        ),
        baseRotation: grenadeView.rotation.clone(),
      },
      smoke: {
        root: smokeView,
        basePosition: new THREE.Vector3(
          ...EQUIPMENT_VIEWMODEL_MOUNTS.smoke.position,
        ),
        baseRotation: smokeView.rotation.clone(),
      },
      flash: {
        root: flashView,
        basePosition: new THREE.Vector3(
          ...EQUIPMENT_VIEWMODEL_MOUNTS.flash.position,
        ),
        baseRotation: flashView.rotation.clone(),
      },
      bomb: {
        root: bombView,
        basePosition: new THREE.Vector3(
          ...EQUIPMENT_VIEWMODEL_MOUNTS.bomb.position,
        ),
        baseRotation: bombView.rotation.clone(),
      },
    };

    const resetPrimaryActionParts = (view: WeaponView) => {
      const { shotgunPump, sniperBolt } = view.actionParts ?? {};
      [shotgunPump, sniperBolt].forEach((part) => {
        if (!part) return;
        part.object.position.copy(part.basePosition);
        part.object.rotation.copy(part.baseRotation);
      });
    };

    type PlayerCasingSlot = PlayerCasingMotion;
    const playerCasingGeometry = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0, -0.023),
        new THREE.Vector2(0.01, -0.022),
        new THREE.Vector2(0.013, -0.019),
        new THREE.Vector2(0.011, -0.016),
        new THREE.Vector2(0.011, 0.018),
        new THREE.Vector2(0.009, 0.022),
        new THREE.Vector2(0, 0.023),
      ],
      12,
    );
    playerCasingGeometry.rotateZ(Math.PI / 2);
    const playerCasingMaterial = new THREE.MeshStandardMaterial({
      color: 0xc79b45,
      roughness: 0.38,
      metalness: 0.68,
    });
    const playerCasingMesh = new THREE.InstancedMesh(
      playerCasingGeometry,
      playerCasingMaterial,
      PLAYER_CASING_CAPACITY,
    );
    playerCasingMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    playerCasingMesh.frustumCulled = false;
    playerCasingMesh.castShadow = false;
    playerCasingMesh.receiveShadow = false;
    playerCasingMesh.visible = false;
    playerCasingMesh.raycast = () => undefined;
    scene.add(playerCasingMesh);

    const playerCasingSlots: PlayerCasingSlot[] = Array.from(
      { length: PLAYER_CASING_CAPACITY },
      () => ({
        active: false,
        ageSeconds: 0,
        lifetimeSeconds: 0.7,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        velocityX: 0,
        velocityY: 0,
        velocityZ: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        spinX: 0,
        spinY: 0,
        spinZ: 0,
        bounced: false,
      }),
    );
    let nextPlayerCasingSlot = 0;
    const playerCasingMatrix = new THREE.Matrix4();
    const playerCasingPosition = new THREE.Vector3();
    const playerCasingQuaternion = new THREE.Quaternion();
    const playerCasingScale = new THREE.Vector3();
    const playerCasingEuler = new THREE.Euler();
    const playerCasingEjectDirection = new THREE.Vector3();
    const playerCasingUpDirection = new THREE.Vector3();
    const playerCasingDepthDirection = new THREE.Vector3();
    const playerCasingWorldQuaternion = new THREE.Quaternion();

    const writePlayerCasingMatrix = (
      slotIndex: number,
      slot: PlayerCasingSlot,
    ) => {
      if (!slot.active) {
        playerCasingMatrix.makeScale(0, 0, 0);
      } else {
        playerCasingPosition.set(
          slot.positionX,
          slot.positionY,
          slot.positionZ,
        );
        playerCasingEuler.set(slot.rotationX, slot.rotationY, slot.rotationZ);
        playerCasingQuaternion.setFromEuler(playerCasingEuler);
        playerCasingScale.set(1, 1, 1);
        playerCasingMatrix.compose(
          playerCasingPosition,
          playerCasingQuaternion,
          playerCasingScale,
        );
      }
      playerCasingMesh.setMatrixAt(slotIndex, playerCasingMatrix);
    };

    const clearPlayerCasings = () => {
      playerCasingSlots.forEach((slot, slotIndex) => {
        slot.active = false;
        writePlayerCasingMatrix(slotIndex, slot);
      });
      nextPlayerCasingSlot = 0;
      playerCasingMesh.visible = false;
      playerCasingMesh.instanceMatrix.needsUpdate = true;
    };

    const spawnPlayerCasing = (weaponKind: FirearmKind, variantIndex = 0) => {
      const profile = getPlayerCasingProfile(weaponKind);
      const weaponView = weaponViews[weaponKind];
      const anchors =
        weaponView.ejectionAnchors ??
        (weaponView.ejectionAnchor ? [weaponView.ejectionAnchor] : []);
      const anchor = anchors[variantIndex % Math.max(1, anchors.length)];
      const slotIndex = getPooledCasingSlot(
        nextPlayerCasingSlot,
        PLAYER_CASING_CAPACITY,
      );
      if (!profile || !anchor || slotIndex === null) return;

      anchor.getWorldPosition(playerCasingPosition);
      anchor.getWorldQuaternion(playerCasingWorldQuaternion);
      const variation = ((nextPlayerCasingSlot * 37) % 7) / 6 - 0.5;
      playerCasingEjectDirection
        .set(1, 0, 0)
        .applyQuaternion(playerCasingWorldQuaternion)
        .multiplyScalar(profile.horizontalSpeed * (0.94 + variation * 0.12));
      playerCasingUpDirection
        .set(0, 1, 0)
        .applyQuaternion(playerCasingWorldQuaternion)
        .multiplyScalar(profile.upwardSpeed * (0.96 - variation * 0.08));
      playerCasingDepthDirection
        .set(0, 0, 1)
        .applyQuaternion(playerCasingWorldQuaternion)
        .multiplyScalar(variation * 0.34);

      const slot = playerCasingSlots[slotIndex];
      slot.active = true;
      slot.ageSeconds = 0;
      slot.lifetimeSeconds = profile.lifetimeSeconds;
      slot.positionX = playerCasingPosition.x;
      slot.positionY = playerCasingPosition.y;
      slot.positionZ = playerCasingPosition.z;
      slot.velocityX =
        playerCasingEjectDirection.x + playerCasingDepthDirection.x;
      slot.velocityY =
        playerCasingEjectDirection.y +
        playerCasingUpDirection.y +
        playerCasingDepthDirection.y;
      slot.velocityZ =
        playerCasingEjectDirection.z +
        playerCasingUpDirection.z +
        playerCasingDepthDirection.z;
      slot.rotationX = variation * Math.PI;
      slot.rotationY = nextPlayerCasingSlot * 0.61;
      slot.rotationZ = variation * -2.3;
      slot.spinX = profile.spinSpeed;
      slot.spinY = profile.spinSpeed * (0.48 + variation * 0.16);
      slot.spinZ = profile.spinSpeed * (-0.28 + variation * 0.1);
      slot.bounced = false;
      writePlayerCasingMatrix(slotIndex, slot);
      playerCasingMesh.visible = true;
      playerCasingMesh.instanceMatrix.needsUpdate = true;
      nextPlayerCasingSlot += 1;
    };

    const updatePlayerCasings = (dtSeconds: number) => {
      let changed = false;
      let activeCasings = 0;
      playerCasingSlots.forEach((slot, slotIndex) => {
        if (!slot.active) return;
        stepPlayerCasingMotion(slot, dtSeconds);
        if (slot.active) activeCasings += 1;
        writePlayerCasingMatrix(slotIndex, slot);
        changed = true;
      });
      if (changed) {
        playerCasingMesh.visible = activeCasings > 0;
        playerCasingMesh.instanceMatrix.needsUpdate = true;
      }
    };
    clearPlayerCasings();

    const showWeaponView = (selection: WeaponKind | null) => {
      Object.entries(weaponViews).forEach(([kind, view]) => {
        if (isPrimaryWeaponKind(kind as WeaponKind))
          resetPrimaryActionParts(view);
        view.root.visible = kind === selection;
      });
    };

    const createWorldFirearmModel = (kind: FirearmKind) => {
      const root = new THREE.Group();
      const definition = FIREARMS[kind];
      if (isSecondaryWeaponKind(kind)) {
        const model = createSecondaryWorldModel(kind, {
          createMuzzleFlash: (secondaryKind) =>
            createMuzzleFlash(
              secondaryKind === 'deagle' ? 0xffa94b : 0xffc36a,
              getCombatVisualWeaponProfile('bot', secondaryKind),
            ),
        });
        const modelMaterials = new Set<THREE.MeshStandardMaterial>();
        model.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial)
              modelMaterials.add(material);
          });
        });
        modelMaterials.forEach((material) => {
          const originalColor = material.color.getHex();
          const worldMaterial =
            originalColor === 0x4d5554
              ? worldFirearmMaterials.polymer
              : originalColor === 0xa9b0ae
                ? worldFirearmMaterials.accent
                : worldFirearmMaterials.metal;
          material.copy(worldMaterial);
          material.name = `${worldMaterial.name}-${kind}`;
        });
        root.add(model);
        root.name = `${definition.label} world firearm`;
        root.rotation.set(0.18, 0, Math.PI / 2);
        root.scale.setScalar(0.76);
        root.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = true;
          object.receiveShadow = true;
        });
        return root;
      }
      const metalMaterial = worldFirearmMaterials.metal.clone();
      const materials = {
        metal: metalMaterial,
        wood: worldFirearmMaterials.wood.clone(),
        polymer: worldFirearmMaterials.polymer.clone(),
        accent: kind === 'sniper' ? worldFirearmMaterials.accent.clone() : metalMaterial,
      };
      root.add(createPrimaryWorldModel(kind, materials));
      if (kind === 'carbine') root.userData.silencerSocket = root.children[0].userData.silencerSocket;
      root.name = `${definition.label} world firearm`;
      root.rotation.set(0.18, 0, Math.PI / 2);
      root.scale.setScalar(0.72);
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = true;
        object.receiveShadow = true;
      });
      batchPrimaryWorldFirearmVisuals(root, kind);
      return root;
    };

    const hitMeshes: THREE.Mesh[] = [];
    const enemies: Enemy[] = [];
    const allies: Enemy[] = [];
    const bots: Enemy[] = [];
    const enemyBodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x4e4b39,
      roughness: 0.9,
    });
    const enemyVestMaterial = new THREE.MeshStandardMaterial({
      color: 0x252924,
      roughness: 0.85,
    });
    const enemySkinMaterial = new THREE.MeshStandardMaterial({
      color: 0x8d6547,
      roughness: 0.9,
    });
    const createCharacterCapsuleGeometry = (
      part: CharacterCapsulePart,
      quality: QualitySetting,
    ) => {
      const profile = CHARACTER_CAPSULE_PROFILES[part];
      const detail = profile[quality];
      return new THREE.CapsuleGeometry(
        profile.radius,
        profile.length,
        detail.capSegments,
        detail.radialSegments,
      );
    };

    // Shared visual shells are deliberately faceted. Hit proxies below retain their
    // original dimensions/segments and remain the only gameplay raycast authority.
    const facetedTorsoGeometry = createFacetedTorsoGeometry();
    const facetedHeadGeometry = createFacetedHeadGeometry();
    const facetedLegGeometry = createFacetedLimbGeometry(0.13, 0.56);
    const facetedArmGeometry = createFacetedLimbGeometry(0.105, 0.42);
    const characterLimbOutputGeometries = new Set<THREE.BufferGeometry>();
    const facetedCueGeometries = {
      ctHead: createFacetedHeadCueGeometry('ct'),
      ctTorso: createFacetedTorsoCueGeometry('ct'),
      tHead: createFacetedHeadCueGeometry('t'),
      tTorso: createFacetedTorsoCueGeometry('t'),
    } as const;
    const proxyBodyGeometry = createCharacterCapsuleGeometry(
      'body',
      'performance',
    );
    const proxyVestGeometry = createCharacterCapsuleGeometry(
      'vest',
      'performance',
    );
    const proxyUpperLegGeometry = createCharacterCapsuleGeometry(
      'upperLeg',
      'performance',
    );
    const proxyLowerLegGeometry = createCharacterCapsuleGeometry(
      'lowerLeg',
      'performance',
    );
    const proxyUpperArmGeometry = createCharacterCapsuleGeometry(
      'upperArm',
      'performance',
    );
    const proxyForearmGeometry = createCharacterCapsuleGeometry(
      'forearm',
      'performance',
    );
    const proxyPalmGeometry = new RoundedBoxGeometry(0.14, 0.16, 0.1, 5, 0.04);
    const proxyPlateGeometry = createTaperedArmorPanel(
      0.44,
      0.5,
      0.42,
      0.1,
      0.018,
    );
    const proxyBackpackGeometry = createTaperedArmorPanel(
      0.46,
      0.54,
      0.62,
      0.2,
      0.026,
    );
    const proxyStrapGeometry = new RoundedBoxGeometry(
      0.065,
      0.62,
      0.035,
      3,
      0.016,
    );
    const proxyEarCoverGeometry = new THREE.SphereGeometry(0.105, 16, 10);
    const proxyShoulderGeometry = new THREE.SphereGeometry(
      CHARACTER_SHOULDER_PROFILE.radius,
      CHARACTER_SHOULDER_PROFILE.performance.widthSegments,
      CHARACTER_SHOULDER_PROFILE.performance.heightSegments,
    );

    const createEnemy = (id: number, x: number, z: number, team: BotTeam) => {
      const root = new THREE.Group();
      root.position.set(x, getMapGroundHeight(x, z), z);
      scene.add(root);
      const createProxy = (
        geometry: THREE.BufferGeometry,
        material: THREE.MeshStandardMaterial,
      ) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.visible = false;
        root.add(mesh);
        return mesh;
      };
      const linkVisual = (proxy: THREE.Mesh, visual: THREE.Mesh) => {
        visual.raycast = () => undefined;
        visual.visible = false;
        proxy.userData.smoothVisual = visual;
      };
      // Preserve the exact proxy transforms used for hit groups.
      const body = createProxy(proxyBodyGeometry, enemyBodyMaterial.clone());
      body.name = 'character-body-hit-proxy';
      body.position.y = 1.18;
      body.scale.z = 0.72;
      const vest = createProxy(proxyVestGeometry, enemyVestMaterial.clone());
      vest.name = 'character-vest-hit-proxy';
      vest.position.y = 1.36;
      vest.scale.z = 0.7;
      const waist = createProxy(
        new THREE.CylinderGeometry(0.25, 0.3, 0.32, 16),
        enemyBodyMaterial.clone(),
      );
      waist.name = 'character-waist-hit-proxy';
      waist.position.y = 0.93;
      waist.scale.z = 0.78;
      const head = createProxy(
        new THREE.SphereGeometry(0.25, 32, 20),
        enemySkinMaterial.clone(),
      );
      head.name = 'character-head-hit-proxy';
      head.position.y = 1.92;
      const headCover = createProxy(
        new THREE.SphereGeometry(
          0.276,
          24,
          16,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.58,
        ),
        enemyVestMaterial.clone(),
      );
      headCover.name = 'character-head-cover-hit-proxy';
      headCover.position.y = 1.94;
      const helmetBrim = createProxy(
        new THREE.CylinderGeometry(0.29, 0.29, 0.035, 24),
        enemyVestMaterial.clone(),
      );
      helmetBrim.position.set(0, 2.025, -0.025);
      helmetBrim.scale.z = 1.08;
      const chestPlate = createProxy(
        proxyPlateGeometry,
        enemyVestMaterial.clone(),
      );
      chestPlate.position.set(0, 1.4, -0.31);
      chestPlate.rotation.x = -0.08;
      const shoulderPads: THREE.Mesh[] = [];
      [-1, 1].forEach((side) => {
        const shoulderPad = createProxy(
          proxyShoulderGeometry,
          enemyVestMaterial.clone(),
        );
        shoulderPad.name = 'character-shoulder-' + side + '-hit-proxy';
        shoulderPad.position.set(side * 0.38, 1.55, 0);
        shoulderPad.scale.set(1.2, 0.7, 0.8);
        shoulderPads.push(shoulderPad);
      });
      const createLeg = (side: number) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.2, 0.78, 0);
        root.add(pivot);
        const upperLeg = new THREE.Mesh(
          proxyUpperLegGeometry,
          enemyBodyMaterial.clone(),
        );
        upperLeg.name = 'character-upper-leg-' + side + '-hit-proxy';
        upperLeg.position.y = -0.17;
        upperLeg.visible = false;
        pivot.add(upperLeg);
        const lowerLeg = new THREE.Mesh(
          proxyLowerLegGeometry,
          enemyBodyMaterial.clone(),
        );
        lowerLeg.name = 'character-lower-leg-' + side + '-hit-proxy';
        lowerLeg.position.set(0, -0.49, -0.025);
        lowerLeg.rotation.x = side * 0.035;
        lowerLeg.visible = false;
        pivot.add(lowerLeg);
        return { pivot, upperLeg, lowerLeg };
      };
      const leftLeg = createLeg(-1);
      const rightLeg = createLeg(1);
      const createArm = (side: number) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.4, 1.58, 0);
        pivot.rotation.set(1.08, 0, side * 0.14);
        root.add(pivot);
        const upperArm = new THREE.Mesh(
          proxyUpperArmGeometry,
          enemyBodyMaterial.clone(),
        );
        upperArm.name = 'character-upper-arm-' + side + '-visual-proxy';
        upperArm.position.y = -0.13;
        upperArm.visible = false;
        pivot.add(upperArm);
        const forearm = new THREE.Mesh(
          proxyForearmGeometry,
          enemyBodyMaterial.clone(),
        );
        forearm.name = 'character-forearm-' + side + '-visual-proxy';
        forearm.position.set(0, -0.39, -0.035);
        forearm.rotation.x = -0.18;
        forearm.visible = false;
        pivot.add(forearm);
        const hand = new THREE.Mesh(
          proxyPalmGeometry,
          enemySkinMaterial.clone(),
        );
        hand.position.set(0, -0.57, -0.07);
        hand.rotation.x = -0.2;
        hand.visible = false;
        pivot.add(hand);
        return { pivot, upperArm, forearm };
      };
      const leftArm = createArm(-1);
      const rightArm = createArm(1);
      const backpack = createProxy(
        proxyBackpackGeometry,
        enemyVestMaterial.clone(),
      );
      backpack.position.set(0, 1.34, 0.27);
      const strap = createProxy(proxyStrapGeometry, enemyVestMaterial.clone());
      strap.position.set(0.14, 1.43, -0.369);
      const earCover = createProxy(
        proxyEarCoverGeometry,
        enemyVestMaterial.clone(),
      );
      earCover.position.set(0.245, 1.98, 0.015);
      earCover.scale.set(0.55, 0.9, 0.72);

      // Seven shell meshes plus one active cue per side (eight draws maximum).
      const facetedTorso = new THREE.Mesh(
        facetedTorsoGeometry,
        enemyBodyMaterial.clone(),
      );
      facetedTorso.name = 'character-faceted-torso';
      facetedTorso.material.vertexColors = true;
      // Local to the rig's upperBody joint: preserve the old world center
      // (pelvis 1.05 + upperBody 0.28 + offset -0.05 = 1.28).
      facetedTorso.position.set(0, -0.05, 0);
      // Keep the shoulder plane broad in depth while the authored geometry
      // supplies the visible shoulder-to-waist taper.
      facetedTorso.scale.z = 0.96;
      facetedTorso.castShadow = true;
      const facetedHead = new THREE.Mesh(
        facetedHeadGeometry,
        enemySkinMaterial.clone(),
      );
      facetedHead.name = 'character-faceted-head';
      // Local to the rig's head joint (world y 1.91 + 0.01 = 1.92).
      facetedHead.position.set(0, 0.01, 0);
      facetedHead.castShadow = true;
      const facetedLeftLeg = new THREE.Mesh(
        facetedLegGeometry,
        enemyBodyMaterial.clone(),
      );
      facetedLeftLeg.name = 'character-faceted-left-leg';
      // Rig leftThigh is at (-0.34, pelvis y 1.05 - 0.08); this offset
      // restores the old authority pivot center (-0.2, 0.78).
      facetedLeftLeg.position.set(0.14, -0.19, 0);
      facetedLeftLeg.castShadow = true;
      const facetedRightLeg = new THREE.Mesh(
        facetedLegGeometry,
        enemyBodyMaterial.clone(),
      );
      facetedRightLeg.name = 'character-faceted-right-leg';
      facetedRightLeg.position.set(-0.14, -0.19, 0);
      facetedRightLeg.castShadow = true;
      const facetedLeftArm = new THREE.Mesh(
        facetedArmGeometry,
        enemyBodyMaterial.clone(),
      );
      facetedLeftArm.name = 'character-faceted-left-arm';
      // The compound arm is authored directly in shoulder/IK space. Keeping
      // this local transform neutral makes its rendered palm coincide with
      // the retained grip socket instead of inheriting the legacy proxy offset.
      facetedLeftArm.position.set(0, 0, 0);
      facetedLeftArm.castShadow = true;
      const facetedRightArm = new THREE.Mesh(
        facetedArmGeometry,
        enemyBodyMaterial.clone(),
      );
      facetedRightArm.name = 'character-faceted-right-arm';
      facetedRightArm.position.set(0, 0, 0);
      facetedRightArm.castShadow = true;
      [
        facetedHead,
        facetedLeftLeg,
        facetedRightLeg,
        facetedLeftArm,
        facetedRightArm,
      ].forEach((mesh) => {
        mesh.material.vertexColors = true;
      });

      const leftLegDeformationController =
        createCharacterLimbDeformationController(facetedLeftLeg, 'leg');
      const rightLegDeformationController =
        createCharacterLimbDeformationController(facetedRightLeg, 'leg');
      const leftArmDeformationController =
        createCharacterLimbDeformationController(facetedLeftArm, 'arm');
      const rightArmDeformationController =
        createCharacterLimbDeformationController(facetedRightArm, 'arm');
      characterLimbOutputGeometries.add(leftLegDeformationController.geometry);
      characterLimbOutputGeometries.add(rightLegDeformationController.geometry);
      characterLimbOutputGeometries.add(leftArmDeformationController.geometry);
      characterLimbOutputGeometries.add(rightArmDeformationController.geometry);
      const ctTorsoCue = new THREE.Mesh(
        facetedCueGeometries.ctTorso,
        enemyVestMaterial.clone(),
      );
      ctTorsoCue.name = 'character-ct-shoulder-radio';
      // High on the outer shoulder so the CT read survives a three-quarter
      // view at the 15 m matrix row.
      ctTorsoCue.position.set(0.4, 0.2, 0.02);
      ctTorsoCue.castShadow = true;
      const tTorsoCue = new THREE.Mesh(
        facetedCueGeometries.tTorso,
        enemyVestMaterial.clone(),
      );
      tTorsoCue.name = 'character-t-chest-rig';
      // A broad front plate is the T silhouette cue, kept just proud of the
      // ribcage's -Z face so it remains visible from front and quarter views.
      tTorsoCue.position.set(0, 0.07, -0.36);
      tTorsoCue.rotation.x = -0.08;
      tTorsoCue.castShadow = true;
      const ctHeadCue = new THREE.Mesh(
        facetedCueGeometries.ctHead,
        enemyVestMaterial.clone(),
      );
      ctHeadCue.name = 'character-ct-helmet-visor';
      ctHeadCue.position.set(0, 0.125, 0);
      ctHeadCue.castShadow = true;
      const tHeadCue = new THREE.Mesh(
        facetedCueGeometries.tHead,
        enemyVestMaterial.clone(),
      );
      tHeadCue.name = 'character-t-head-wrap';
      tHeadCue.position.set(0, 0.15, 0);
      tHeadCue.castShadow = true;

      linkVisual(body, facetedTorso);
      linkVisual(head, facetedHead);
      linkVisual(leftLeg.upperLeg, facetedLeftLeg);
      linkVisual(leftLeg.lowerLeg, facetedLeftLeg);
      linkVisual(rightLeg.upperLeg, facetedRightLeg);
      linkVisual(rightLeg.lowerLeg, facetedRightLeg);
      linkVisual(leftArm.upperArm, facetedLeftArm);
      linkVisual(leftArm.forearm, facetedLeftArm);
      linkVisual(rightArm.upperArm, facetedRightArm);
      linkVisual(rightArm.forearm, facetedRightArm);
      registerCharacterRenderVariant(body, facetedTorso);
      registerCharacterRenderVariant(head, facetedHead);
      registerCharacterRenderVariant(leftLeg.upperLeg, facetedLeftLeg);
      registerCharacterRenderVariant(rightLeg.upperLeg, facetedRightLeg);
      registerCharacterRenderVariant(leftArm.upperArm, facetedLeftArm);
      registerCharacterRenderVariant(rightArm.upperArm, facetedRightArm);
      [ctTorsoCue, tTorsoCue, ctHeadCue, tHeadCue].forEach((visual) => {
        visual.raycast = () => undefined;
      });
      vest.userData.smoothVisual = facetedTorso;
      waist.userData.smoothVisual = facetedTorso;
      shoulderPads.forEach((mesh) => {
        mesh.userData.smoothVisual = facetedTorso;
      });
      headCover.userData.smoothVisual = facetedHead;
      helmetBrim.userData.smoothVisual = facetedHead;
      chestPlate.userData.smoothVisual = facetedTorso;
      backpack.userData.smoothVisual = facetedTorso;
      strap.userData.smoothVisual = facetedTorso;
      earCover.userData.smoothVisual = facetedHead;

      const initialSide: Side = team === 'ally' ? 'ct' : 't';
      const initialPalette = getCharacterSidePalette(initialSide);
      const clothMaterials = [
        facetedTorso.material as THREE.MeshStandardMaterial,
        facetedLeftLeg.material as THREE.MeshStandardMaterial,
        facetedRightLeg.material as THREE.MeshStandardMaterial,
        facetedLeftArm.material as THREE.MeshStandardMaterial,
        facetedRightArm.material as THREE.MeshStandardMaterial,
        body.material as THREE.MeshStandardMaterial,
        vest.material as THREE.MeshStandardMaterial,
        waist.material as THREE.MeshStandardMaterial,
        ...shoulderPads.map(
          (mesh) => mesh.material as THREE.MeshStandardMaterial,
        ),
      ];
      const armorMaterials = [
        ctHeadCue.material as THREE.MeshStandardMaterial,
        tHeadCue.material as THREE.MeshStandardMaterial,
        chestPlate.material as THREE.MeshStandardMaterial,
        backpack.material as THREE.MeshStandardMaterial,
        strap.material as THREE.MeshStandardMaterial,
        earCover.material as THREE.MeshStandardMaterial,
      ];
      const accentMaterials = [
        ctTorsoCue.material as THREE.MeshStandardMaterial,
        tTorsoCue.material as THREE.MeshStandardMaterial,
      ];
      const skinMaterials = [
        facetedHead.material as THREE.MeshStandardMaterial,
        head.material as THREE.MeshStandardMaterial,
      ];
      clothMaterials.forEach((material) =>
        material.color.setHex(initialPalette.cloth),
      );
      armorMaterials.forEach((material) =>
        material.color.setHex(initialPalette.armor),
      );
      accentMaterials.forEach((material) =>
        material.color.setHex(initialPalette.accent),
      );
      skinMaterials.forEach((material) =>
        material.color.setHex(initialPalette.skin),
      );
      ctTorsoCue.visible = initialSide === 'ct';
      ctHeadCue.visible = initialSide === 'ct';
      tTorsoCue.visible = initialSide === 't';
      tHeadCue.visible = initialSide === 't';
      const appearance: EnemyAppearanceRefs = {
        clothMaterials,
        armorMaterials,
        accentMaterials,
        skinMaterials,
        sideCueMeshes: {
          ct: [ctHeadCue, ctTorsoCue],
          t: [tHeadCue, tTorsoCue],
        },
      };

      const initialInventory = createBotInventory(initialSide);
      const initialPrimary = initialInventory.weapon;
      const weaponModels = Object.fromEntries(
        (Object.keys(FIREARMS) as FirearmKind[]).map((kind) => [
          kind,
          createWorldFirearmModel(kind),
        ]),
      ) as Record<FirearmKind, THREE.Group>;
      (Object.keys(weaponModels) as FirearmKind[]).forEach((kind) => {
        const weaponModel = weaponModels[kind];
        weaponModel.name = `${FIREARMS[kind].label} enemy primary`;
        // The centered visual socket plus this authored model offset keeps a
        // two-handed stance balanced across the torso.
        weaponModel.position.set(-0.07, 0.18, 0.09);
        weaponModel.rotation.set(0, 0, 0);
        weaponModel.scale.setScalar(0.64);
        weaponModel.visible = kind === initialPrimary;
      });
      const createBotSilencerModel = (kind: 'usp' | 'carbine') => {
        const model = weaponModels[kind];
        model.updateMatrixWorld(true);
        let socket = model.userData.silencerSocket as THREE.Vector3 | undefined;
        if (kind === 'usp') model.traverse(object => {
          if (object instanceof THREE.PointLight)
            socket = model.worldToLocal(object.getWorldPosition(new THREE.Vector3()));
        });
        if (!socket) throw new Error(`Missing ${kind} world silencer socket`);
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.27, 10),
          worldFirearmMaterials.metal.clone());
        mesh.name = `${kind} bot silencer`;
        mesh.rotation.x = Math.PI / 2;
        mesh.position.copy(socket); mesh.position.z -= 0.12;
        mesh.visible = false;
        mesh.raycast = () => undefined;
        model.add(mesh);
        return mesh;
      };
      const silencerModels = { usp: createBotSilencerModel('usp'), carbine: createBotSilencerModel('carbine') };
      const secondaryMuzzles = Object.fromEntries(
        SECONDARY_WEAPON_KINDS.map((kind) => {
          const muzzles: THREE.PointLight[] = [];
          weaponModels[kind].traverse((object) => {
            if (object instanceof THREE.PointLight) muzzles.push(object);
          });
          return [kind, muzzles] as const;
        }),
      ) as unknown as Record<SecondaryWeaponKind, readonly THREE.PointLight[]>;
      const enemyMuzzleFlash = createMuzzleFlash(
        0xffa844,
        getCombatVisualWeaponProfile('bot', initialPrimary),
      );
      enemyMuzzleFlash.position.set(
        -0.07,
        0.18,
        // weaponSocket base z (-0.34) + this local offset preserves the
        // pre-rig world muzzle position for each long-gun kind.
        getEnemyMuzzleOffsetZ(initialPrimary) + 0.34,
      );
      const enemyHitGroups: ReadonlyArray<
        readonly [HitGroup, readonly THREE.Mesh[]]
      > = [
        ['head', [head, headCover]],
        ['torso', [body, vest, ...shoulderPads]],
        ['stomach', [waist]],
        [
          'leg',
          [
            leftLeg.upperLeg,
            leftLeg.lowerLeg,
            rightLeg.upperLeg,
            rightLeg.lowerLeg,
          ],
        ],
      ];
      const enemyHitMeshes = enemyHitGroups.flatMap(([, meshes]) => meshes);
      const skinned = createSkinnedCharacterInstance(
        initialSide === 'ct' ? ctCharacterTemplate : characterTemplate,
        initialSide,
      );
      skinned.visualRoot.name = `bot-${team}-${id}-skinned-visual`;
      scene.add(skinned.visualRoot);
      const rig = createCharacterRig({
        authorityRoot: root,
        fallbackVisuals: false,
        authoritativeObjects: [root],
        authoritativeHitMeshes: enemyHitMeshes,
        visualParts: {
          upperBody: [facetedTorso, ctTorsoCue, tTorsoCue],
          head: [facetedHead, ctHeadCue, tHeadCue],
          leftThigh: facetedLeftLeg,
          rightThigh: facetedRightLeg,
          leftShoulder: facetedLeftArm,
          rightShoulder: facetedRightArm,
          // Register these caller-owned subtrees during rig construction so
          // every mesh/light receives the visual-only no-raycast contract;
          // the explicit adds below keep the socket migration visible at the
          // post-creation attachment point.
          weaponSocket: [
            ...(Object.values(weaponModels) as THREE.Group[]),
            enemyMuzzleFlash,
          ],
        },
      });
      (Object.keys(weaponModels) as FirearmKind[]).forEach((kind) =>
        rig.weaponSocket.add(weaponModels[kind]),
      );
      rig.weaponSocket.add(enemyMuzzleFlash);
      setCharacterRigWeaponGripTargets(rig, initialPrimary);
      rig.visualRoot.position.copy(root.position);
      rig.visualRoot.rotation.y = root.rotation.y;
      if (!validateCharacterRigVisualOnly(rig))
        throw new Error(`Bot ${id} character rig contains raycastable visuals`);
      if (enemyHitMeshes.some((mesh) => isCharacterRigVisualObject(rig, mesh)))
        throw new Error(`Bot ${id} character rig contains a hit proxy`);
      (Object.keys(weaponModels) as FirearmKind[]).forEach((kind) =>
        skinned.weaponSocket.add(weaponModels[kind]),
      );
      skinned.weaponSocket.add(enemyMuzzleFlash);
      setSkinnedCharacterWeaponGrip(skinned, initialPrimary);
      skinned.visualRoot.position.copy(root.position);
      skinned.visualRoot.rotation.y = root.rotation.y;
      rig.visualRoot.visible = false;
      const enemy: Enemy = {
        id,
        team,
        side: initialSide,
        name: BOT_NAMES[initialSide][id],
        root,
        skinned,
        rig,
        animationState: createBotAnimationState(),
        animationPose: createBotAnimationPose(),
        leftLegDeformationController,
        rightLegDeformationController,
        leftArmDeformationController,
        rightArmDeformationController,
        hitMeshes: enemyHitMeshes,
        health: 100,
        armor: 0,
        helmet: false,
        alive: true,
        profile: ENEMY_COMBAT_PROFILES[id],
        fireCooldown: getEnemyFireCooldown(initialPrimary, Math.random()),
        burstShotsRemaining: 0,
        glockBurst: { targetId: null },
        movementDecisionTimer: 0.4 + Math.random() * 0.6,
        combatMovement: 'advance',
        suppression: 0,
        ammo: initialInventory.ammo,
        primaryWeapon: initialPrimary,
        stowedPrimary: null,
        money: initialInventory.money,
        secondaryWeapon: initialInventory.secondaryWeapon,
        secondaryAmmo: initialInventory.secondaryAmmo,
        grenades: 0, smokes: 0, flashes: 0,
        weaponModels,
        silencerModels,
        secondaryMuzzles,
        secondaryMuzzleIndex: 0,
        activeSecondaryMuzzle: null,
        blindUntilMs: 0,
        reloadTimer: 0,
        utility: createBotUtilityState(),
        shots: createBotShotState(16001 + id * 97 + (team === 'ally' ? 1009 : 0)),
        special: createWeaponSpecialActions(),
        route: [],
        waypointIndex: 0,
        role: id === 0 ? 'carrier' : 'escort',
        homeSite: id < 2 ? 'A' : 'B',
        guardPoint: new THREE.Vector2(),
        hasDefuseKit: false,
        plantProgress: 0,
        kills: 0,
        deaths: 0,
        muzzleFlash: enemyMuzzleFlash,
        sightTime: 0,
        combatTargetId: null,
        leftLeg: leftLeg.pivot,
        rightLeg: rightLeg.pivot,
        leftArm: leftArm.pivot,
        rightArm: rightArm.pivot,
        appearance,
        lastKnownOpponentPosition: new THREE.Vector3(),
        combatMemory: 0,
        blockedSeconds: 0,
        movementSpeed: 0,
        verticalVelocity: 0,
        grounded: true,
        motionResolvedThisTick: false,
        locomotionVelocityX: 0,
        locomotionVelocityZ: 0,
        locomotionPhase: 0,
        bodyYaw: root.rotation.y,
        aimYaw: root.rotation.y,
        lastAccelerationX: 0,
        lastAccelerationZ: 0,
        locomotionCommanded: false,
        nextFootstepAtMs: 0,
        deathElapsedSeconds: 0,
        deathVariant: getBotDeathVariant(id, team),
        deathPose: { ...LIVING_BOT_POSE },
        deathPresentation: null,
        weaponGripOutput: {
          leftElbowPitch: 0.38,
          rightElbowPitch: 0.38,
        },
      };
      enemyHitGroups.forEach(([hitGroup, meshes]) => {
        meshes.forEach((mesh) => {
          mesh.userData.enemy = enemy;
          mesh.userData.hitGroup = hitGroup;
          hitMeshes.push(mesh);
        });
      });
      bots.push(enemy);
      (team === 'ally' ? allies : enemies).push(enemy);
    };

    const syncBotSilencerVisuals = (bot: Enemy) => {
      for (const kind of ['usp', 'carbine'] as const)
        bot.silencerModels[kind].visible = bot.special.isSilenced(kind);
    };
    const resetBotMuzzleLights = (bot: Enemy) => {
      const profile = getCombatVisualWeaponProfile('bot', bot.primaryWeapon);
      applyMuzzleFlashProfile(bot.muzzleFlash, profile);
      bot.muzzleFlash.intensity = profile.muzzleIntensityMin;
      bot.activeSecondaryMuzzle = null;
      bot.secondaryMuzzleIndex = 0;
      for (const kind of SECONDARY_WEAPON_KINDS) {
        const secondaryProfile = getCombatVisualWeaponProfile('bot', kind);
        for (const muzzle of bot.secondaryMuzzles[kind]) {
          applyMuzzleFlashProfile(muzzle, secondaryProfile);
          muzzle.intensity = secondaryProfile.muzzleIntensityMin;
        }
      }
    };
    const emitBotMuzzleFlash = (bot: Enemy, silenced: boolean) => {
      if (silenced) {
        bot.muzzleFlash.intensity = 0;
        bot.activeSecondaryMuzzle = null;
        for (const kind of SECONDARY_WEAPON_KINDS)
          for (const muzzle of bot.secondaryMuzzles[kind]) muzzle.intensity = 0;
        return;
      }
      const kind = bot.primaryWeapon;
      const profile = getCombatVisualWeaponProfile('bot', kind);
      applyMuzzleFlashProfile(bot.muzzleFlash, profile);
      const intensity = profile.muzzleIntensityMax;
      bot.muzzleFlash.intensity = intensity;
      if (!isSecondaryWeaponKind(kind)) {
        bot.muzzleFlash.visible = true;
        bot.activeSecondaryMuzzle = null;
        return;
      }
      bot.muzzleFlash.visible = false;
      const muzzles = bot.secondaryMuzzles[kind];
      if (muzzles.length === 0) {
        bot.activeSecondaryMuzzle = null;
        return;
      }
      const muzzleIndex =
        kind === 'elite' && muzzles.length > 1
          ? bot.secondaryMuzzleIndex % muzzles.length
          : 0;
      bot.activeSecondaryMuzzle = muzzles[muzzleIndex];
      for (let index = 0; index < muzzles.length; index += 1) {
        muzzles[index].intensity = index === muzzleIndex ? intensity : 0;
      }
      if (kind === 'elite' && muzzles.length > 1) bot.secondaryMuzzleIndex += 1;
    };
    const setEnemyPrimaryModel = (enemy: Enemy, kind: FirearmKind) => {
      syncBotSilencerVisuals(enemy);
      (Object.keys(enemy.weaponModels) as FirearmKind[]).forEach(
        (candidate) => {
          enemy.weaponModels[candidate].visible = candidate === kind;
        },
      );
      resetBotMuzzleLights(enemy);
      applyMuzzleFlashProfile(
        enemy.muzzleFlash,
        getCombatVisualWeaponProfile('bot', kind),
      );
      enemy.muzzleFlash.visible = !isSecondaryWeaponKind(kind);
      enemy.muzzleFlash.position.set(
        -0.07,
        0.18,
        getEnemyMuzzleOffsetZ(kind) + 0.34,
      );
      setSkinnedCharacterWeaponGrip(enemy.skinned, kind);
    };

    const setEnemySideAppearance = (enemy: Enemy, side: Side) => {
      enemy.side = side;
      enemy.name = BOT_NAMES[side][enemy.id];
      if (enemy.skinned.side !== side) {
        const previous = enemy.skinned;
        const replacement = createSkinnedCharacterInstance(
          side === 'ct' ? ctCharacterTemplate : characterTemplate, side,
        );
        replacement.visualRoot.name = previous.visualRoot.name;
        replacement.visualRoot.position.copy(previous.visualRoot.position);
        replacement.visualRoot.quaternion.copy(previous.visualRoot.quaternion);
        replacement.visualRoot.visible = previous.visualRoot.visible;
        // Weapon assemblies and lights belong to the bot, not its faction skin.
        // Adding a child to the replacement removes it from the source array.
        // oxlint-disable-next-line unicorn/no-useless-spread
        for (const child of [...previous.weaponSocket.children])
          replacement.weaponSocket.add(child);
        setSkinnedCharacterWeaponGrip(replacement, enemy.primaryWeapon);
        scene.add(replacement.visualRoot);
        enemy.skinned = replacement;
        disposeSkinnedCharacterInstance(previous);
      }
      const palette = getCharacterSidePalette(side);
      enemy.appearance.clothMaterials.forEach((material) =>
        material.color.setHex(palette.cloth),
      );
      enemy.appearance.armorMaterials.forEach((material) =>
        material.color.setHex(palette.armor),
      );
      enemy.appearance.accentMaterials.forEach((material) =>
        material.color.setHex(palette.accent),
      );
      enemy.appearance.skinMaterials.forEach((material) =>
        material.color.setHex(palette.skin),
      );
      (Object.keys(enemy.appearance.sideCueMeshes) as Side[]).forEach(
        (candidate) => {
          enemy.appearance.sideCueMeshes[candidate].forEach((mesh) => {
            mesh.visible = candidate === side;
          });
        },
      );
      // Keep the cue contract explicit and deterministic for visual QA.
      enemy.root.userData.silhouetteCues = getCharacterSilhouetteCues(side);
    };

    T_ATTACKER_SPAWNS.forEach(([x, z], index) =>
      createEnemy(index, x, z, 'enemy'),
    );
    CT_DEFENDER_ASSIGNMENTS.slice(1).forEach(({ spawn }, index) =>
      createEnemy(index, spawn[0], spawn[1], 'ally'),
    );
    const readBotInventory = (bot: Enemy): BotInventory => ({
      money: bot.money, weapon: bot.primaryWeapon, ammo: { ...bot.ammo },
      stowedPrimary: bot.stowedPrimary && {...bot.stowedPrimary,ammo:{...bot.stowedPrimary.ammo}},
      secondaryWeapon: bot.secondaryWeapon,
      secondaryAmmo: { ...(isSecondaryWeaponKind(bot.primaryWeapon) ? bot.ammo : bot.secondaryAmmo) },
      armor: bot.armor, helmet: bot.helmet, hasDefuseKit: bot.hasDefuseKit,
      grenades: bot.grenades, smokes: bot.smokes, flashes: bot.flashes,
    });
    const applyBotInventory = (bot: Enemy, inventory: BotInventory) => {
      bot.money = inventory.money; bot.primaryWeapon = inventory.weapon;
      bot.stowedPrimary = inventory.stowedPrimary;
      bot.ammo = inventory.ammo; bot.secondaryWeapon = inventory.secondaryWeapon;
      bot.secondaryAmmo = inventory.secondaryAmmo; bot.armor = inventory.armor;
      bot.helmet = inventory.helmet; bot.hasDefuseKit = inventory.hasDefuseKit;
      bot.grenades = inventory.grenades; bot.smokes = inventory.smokes; bot.flashes = inventory.flashes;
    };
    const botReloads = new WeakMap<Enemy, BotReload>();
    const advanceBotWeapon = (bot: Enemy) => {
      const pending = botReloads.get(bot);
      if (pending) {
        const before = bot.ammo.magazine;
        const next = stepBotReload(bot.primaryWeapon, bot.ammo, pending, simulationNowMs);
        bot.ammo = next.ammo;
        if (next.ammo.magazine > before) emitOpponentReloadCue(bot, 'reloadCommit');
        if (next.state) botReloads.set(bot, next.state);
        else botReloads.delete(bot);
        bot.reloadTimer = next.state ? Math.max(0.001, (next.state.deadline - simulationNowMs) / 1000) : 0;
        return;
      }
      if (bot.ammo.magazine > 0) return;
      const switched = switchExhaustedBotInventory(readBotInventory(bot));
      if (switched) {
        bot.special.cancelPending(simulationNowMs);
        syncBotSilencerVisuals(bot);
        bot.glockBurst.targetId = null;
        applyBotInventory(bot, switched);
        bot.shots.resetWeapon(bot.primaryWeapon);
        setEnemyPrimaryModel(bot, bot.primaryWeapon);
        bot.burstShotsRemaining = 0;
        bot.fireCooldown = Math.max(bot.fireCooldown, WEAPON_HANDLING[bot.primaryWeapon].equipMs / 1000);
      }
      if (bot.ammo.magazine <= 0 && bot.ammo.reserve > 0) {
        const reload = beginBotReload(bot.primaryWeapon, bot.ammo, simulationNowMs);
        if (reload) {
          bot.special.cancelPending(simulationNowMs);
        syncBotSilencerVisuals(bot);
        bot.glockBurst.targetId = null;
          botReloads.set(bot, reload);
          bot.shots.resetWeapon(bot.primaryWeapon);
          bot.reloadTimer = (reload.deadline - simulationNowMs) / 1000;
          bot.burstShotsRemaining = 0;
          emitOpponentReloadCue(bot, 'reloadStart');
        }
      }
    };
    const backupCallTargets = allies.map(() => new THREE.Vector2());
    const syncBotRigToAuthority = (bot: Enemy) => {
      // The authority root remains the only hit-proxy transform owner. The
      // sibling copies only its world anchor and body yaw for presentation.
      bot.skinned.visualRoot.position.set(
        bot.root.position.x,
        bot.root.position.y,
        bot.root.position.z,
      );
      bot.skinned.visualRoot.rotation.set(0, bot.root.rotation.y, 0);
      bot.skinned.visualRoot.visible = bot.root.visible;
      bot.rig.visualRoot.visible = false;
    };
    const resetBotAnimationPresentation = (bot: Enemy) => {
      Object.assign(bot.animationState, createBotAnimationState());
      Object.assign(bot.animationPose, createBotAnimationPose());
      bot.leftLegDeformationController.reset();
      bot.rightLegDeformationController.reset();
      bot.leftArmDeformationController.reset();
      bot.rightArmDeformationController.reset();
      bot.animationPose.lowerBodyYaw = 0;
      syncBotRigToAuthority(bot);
      applyCharacterRigPose(bot.rig, bot.animationPose);
      applyCharacterRigWeaponAim(bot.rig, 0, bot.animationPose);
      applyCharacterRigWeaponGripTargets(bot.rig, bot.weaponGripOutput);
      sampleSkinnedCharacterPose(bot.skinned, bot.animationPose, {
        elapsedSeconds: 0,
      });
      bot.leftLegDeformationController.write({
        knee: bot.animationPose.leftKneePitch,
        ankle: bot.animationPose.leftAnklePitch,
      });
      writeCharacterLimbFootPlanting(bot.leftLegDeformationController, {
        groundY: bot.root.position.y,
        plant: bot.animationPose.leftFootPlant,
        swingOffsetZ: bot.animationPose.leftFootOffsetZ,
        toeClearance: bot.animationPose.leftToeClearance,
      });
      bot.rightLegDeformationController.write({
        knee: bot.animationPose.rightKneePitch,
        ankle: bot.animationPose.rightAnklePitch,
      });
      writeCharacterLimbFootPlanting(bot.rightLegDeformationController, {
        groundY: bot.root.position.y,
        plant: bot.animationPose.rightFootPlant,
        swingOffsetZ: bot.animationPose.rightFootOffsetZ,
        toeClearance: bot.animationPose.rightToeClearance,
      });
      bot.leftArmDeformationController.write({
        elbow: bot.weaponGripOutput.leftElbowPitch,
      });
      bot.rightArmDeformationController.write({
        elbow: bot.weaponGripOutput.rightElbowPitch,
      });
      sampleSkinnedCharacterPose(bot.skinned, bot.animationPose, {
        elapsedSeconds: simulationNowMs / 1000,
      });
      bot.rig.dominantGripTarget.visible = bot.alive;
      bot.rig.supportGripTarget.visible = bot.alive;
    };
    const applyBotAnimationPresentation = (bot: Enemy, dt: number) => {
      const profile = getCombatVisualWeaponProfile('bot', bot.primaryWeapon);
      const fireCue = THREE.MathUtils.clamp(
        bot.muzzleFlash.intensity / Math.max(profile.muzzleIntensityMax, 0.001),
        0,
        1,
      );
      const reloadDuration = getEnemyReloadDuration(bot.primaryWeapon);
      const reloadCue = THREE.MathUtils.clamp(
        bot.reloadTimer / Math.max(reloadDuration, 0.001),
        0,
        1,
      );
      const flashCue = THREE.MathUtils.clamp(
        (bot.utility.pending?.remainingSeconds ?? 0) / BOT_UTILITY_WINDUP_SECONDS,
        0,
        1,
      );
      const hitCue = THREE.MathUtils.clamp(bot.suppression, 0, 1);
      syncBotRigToAuthority(bot);
      writeBotAnimationPose(
        {
          dtSeconds: dt,
          velocity: {
            x: bot.locomotionVelocityX,
            z: bot.locomotionVelocityZ,
          },
          acceleration: {
            x: bot.lastAccelerationX,
            z: bot.lastAccelerationZ,
          },
          bodyYaw: bot.root.rotation.y,
          aimYaw: bot.aimYaw,
          aimPitch: 0,
          grounded: bot.grounded,
          phase: bot.locomotionPhase,
          actions: {
            fire: fireCue,
            reload: reloadCue,
            flash: flashCue,
            hit: hitCue,
          },
        },
        bot.animationState,
        bot.animationPose,
      );
      // visualRoot already carries the authority body yaw; applying it again
      // at lowerBody would double the turn.
      bot.animationPose.lowerBodyYaw = 0;
      applyCharacterRigPose(bot.rig, bot.animationPose);
      applyCharacterRigWeaponAim(
        bot.rig,
        wrapBotAngle(bot.aimYaw - bot.bodyYaw),
        bot.animationPose,
      );
      applyCharacterRigWeaponGripTargets(bot.rig, bot.weaponGripOutput);
      // Both feet share the pelvis ancestors; refresh them once for this pose.
      bot.rig.pelvis.updateWorldMatrix(true, false);
      bot.rig.leftThigh.updateWorldMatrix(false, false);
      bot.rig.rightThigh.updateWorldMatrix(false, false);
      bot.leftLegDeformationController.write({
        knee: bot.animationPose.leftKneePitch,
        ankle: bot.animationPose.leftAnklePitch,
      });
      writeCharacterLimbFootPlanting(bot.leftLegDeformationController, {
        groundY: bot.root.position.y,
        plant: bot.grounded ? bot.animationPose.leftFootPlant : 0,
        swingOffsetZ: bot.animationPose.leftFootOffsetZ,
        toeClearance: bot.animationPose.leftToeClearance,
      }, true);
      bot.rightLegDeformationController.write({
        knee: bot.animationPose.rightKneePitch,
        ankle: bot.animationPose.rightAnklePitch,
      });
      writeCharacterLimbFootPlanting(bot.rightLegDeformationController, {
        groundY: bot.root.position.y,
        plant: bot.grounded ? bot.animationPose.rightFootPlant : 0,
        swingOffsetZ: bot.animationPose.rightFootOffsetZ,
        toeClearance: bot.animationPose.rightToeClearance,
      }, true);
      bot.leftArmDeformationController.write({
        elbow: bot.weaponGripOutput.leftElbowPitch,
      });
      bot.rightArmDeformationController.write({
        elbow: bot.weaponGripOutput.rightElbowPitch,
      });
      // Both team loops use this helper after the live animation pose is ready.
      // Sample the served skinned body here so it cannot retain its bind pose.
      sampleSkinnedCharacterPose(bot.skinned, bot.animationPose, {
        elapsedSeconds: simulationNowMs / 1000,
      });
    };

    const captureBotDeathJoint = (
      joint: THREE.Object3D,
    ): BotDeathJointState => ({
      px: joint.position.x,
      py: joint.position.y,
      pz: joint.position.z,
      rx: joint.rotation.x,
      ry: joint.rotation.y,
      rz: joint.rotation.z,
    });

    const captureBotDeathPresentation = (
      bot: Enemy,
    ): BotDeathPresentationState => ({
      visualRootOffsetX: bot.rig.visualRoot.position.x - bot.root.position.x,
      visualRootOffsetY: bot.rig.visualRoot.position.y - bot.root.position.y,
      visualRootOffsetZ: bot.rig.visualRoot.position.z - bot.root.position.z,
      visualRootPitch: bot.rig.visualRoot.rotation.x,
      visualRootRoll: bot.rig.visualRoot.rotation.z,
      leftThighPitch: bot.rig.leftThigh.rotation.x,
      rightThighPitch: bot.rig.rightThigh.rotation.x,
      leftShoulderPitch: bot.rig.leftShoulder.rotation.x,
      rightShoulderPitch: bot.rig.rightShoulder.rotation.x,
      pelvis: captureBotDeathJoint(bot.rig.pelvis),
      lowerBody: captureBotDeathJoint(bot.rig.lowerBody),
      upperBody: captureBotDeathJoint(bot.rig.upperBody),
      head: captureBotDeathJoint(bot.rig.head),
      leftThigh: captureBotDeathJoint(bot.rig.leftThigh),
      leftShin: captureBotDeathJoint(bot.rig.leftShin),
      leftFoot: captureBotDeathJoint(bot.rig.leftFoot),
      leftShoulder: captureBotDeathJoint(bot.rig.leftShoulder),
      leftForearm: captureBotDeathJoint(bot.rig.leftForearm),
      leftHand: captureBotDeathJoint(bot.rig.leftHand),
      rightThigh: captureBotDeathJoint(bot.rig.rightThigh),
      rightShin: captureBotDeathJoint(bot.rig.rightShin),
      rightFoot: captureBotDeathJoint(bot.rig.rightFoot),
      rightShoulder: captureBotDeathJoint(bot.rig.rightShoulder),
      rightForearm: captureBotDeathJoint(bot.rig.rightForearm),
      rightHand: captureBotDeathJoint(bot.rig.rightHand),
      leftLeg: {
        knee: bot.animationPose.leftKneePitch,
        ankle: bot.animationPose.leftAnklePitch,
        elbow: 0,
        plant: bot.animationPose.leftFootPlant,
        offsetX: bot.animationPose.leftFootOffsetX,
        offsetY: bot.animationPose.leftFootOffsetY,
        offsetZ: bot.animationPose.leftFootOffsetZ,
        toeClearance: bot.animationPose.leftToeClearance,
      },
      rightLeg: {
        knee: bot.animationPose.rightKneePitch,
        ankle: bot.animationPose.rightAnklePitch,
        elbow: 0,
        plant: bot.animationPose.rightFootPlant,
        offsetX: bot.animationPose.rightFootOffsetX,
        offsetY: bot.animationPose.rightFootOffsetY,
        offsetZ: bot.animationPose.rightFootOffsetZ,
        toeClearance: bot.animationPose.rightToeClearance,
      },
      leftArm: {
        knee: 0,
        ankle: 0,
        elbow: bot.weaponGripOutput.leftElbowPitch,
        plant: 0,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        toeClearance: 0,
      },
      rightArm: {
        knee: 0,
        ankle: 0,
        elbow: bot.weaponGripOutput.rightElbowPitch,
        plant: 0,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        toeClearance: 0,
      },
    });

    const applyBotDeathJoint = (
      joint: THREE.Object3D,
      start: BotDeathJointState,
      pitch = 0,
      yaw = 0,
      roll = 0,
    ) => {
      joint.position.set(start.px, start.py, start.pz);
      joint.rotation.set(start.rx + pitch, start.ry + yaw, start.rz + roll);
    };

    const blendBotDeathInput = (start: number, target: number, eased: number) =>
      start + (target - start) * eased;

    const applyBotDeathVisualPose = (bot: Enemy) => {
      const start = bot.deathPresentation;
      if (!start) return;
      const pose = writeBotDeathPose(
        bot.deathElapsedSeconds,
        bot.deathVariant,
        bot.deathPose,
      );
      const progress = Math.min(
        1,
        Math.max(0, bot.deathElapsedSeconds / BOT_DEATH_DURATION_SECONDS),
      );
      const eased = progress * progress * (3 - 2 * progress);
      // Death is a render-only offset. The authority root remains at its
      // grounded anchor, while this sibling carries the fall and its joints.
      bot.rig.visualRoot.position.set(
        bot.root.position.x + start.visualRootOffsetX,
        bot.root.position.y + start.visualRootOffsetY + pose.rootY,
        bot.root.position.z + start.visualRootOffsetZ,
      );
      bot.rig.visualRoot.rotation.set(
        start.visualRootPitch + pose.rootPitch,
        bot.root.rotation.y,
        start.visualRootRoll + pose.rootRoll,
      );
      applyBotDeathJoint(bot.rig.pelvis, start.pelvis);
      applyBotDeathJoint(bot.rig.lowerBody, start.lowerBody);
      applyBotDeathJoint(bot.rig.upperBody, start.upperBody);
      applyBotDeathJoint(bot.rig.head, start.head, pose.headPitch);
      applyBotDeathJoint(
        bot.rig.leftThigh,
        start.leftThigh,
        pose.leftLegPitch +
          pose.leftHipPitch +
          start.leftThighPitch -
          start.leftThigh.rx,
        pose.leftHipYaw,
      );
      applyBotDeathJoint(
        bot.rig.rightThigh,
        start.rightThigh,
        pose.rightLegPitch +
          pose.rightHipPitch +
          start.rightThighPitch -
          start.rightThigh.rx,
        pose.rightHipYaw,
      );
      applyBotDeathJoint(bot.rig.leftShin, start.leftShin, pose.leftKneePitch);
      applyBotDeathJoint(
        bot.rig.rightShin,
        start.rightShin,
        pose.rightKneePitch,
      );
      applyBotDeathJoint(bot.rig.leftFoot, start.leftFoot, pose.leftAnklePitch);
      applyBotDeathJoint(
        bot.rig.rightFoot,
        start.rightFoot,
        pose.rightAnklePitch,
      );
      applyBotDeathJoint(
        bot.rig.leftShoulder,
        start.leftShoulder,
        pose.leftArmPitch -
          LIVING_BOT_POSE.leftArmPitch +
          start.leftShoulderPitch -
          start.leftShoulder.rx,
      );
      applyBotDeathJoint(
        bot.rig.rightShoulder,
        start.rightShoulder,
        pose.rightArmPitch -
          LIVING_BOT_POSE.rightArmPitch +
          start.rightShoulderPitch -
          start.rightShoulder.rx,
      );
      applyBotDeathJoint(
        bot.rig.leftForearm,
        start.leftForearm,
        pose.leftForearmPitch,
      );
      applyBotDeathJoint(
        bot.rig.rightForearm,
        start.rightForearm,
        pose.rightForearmPitch,
      );
      applyBotDeathJoint(bot.rig.leftHand, start.leftHand, pose.leftHandPitch);
      applyBotDeathJoint(
        bot.rig.rightHand,
        start.rightHand,
        pose.rightHandPitch,
      );

      // Deformation buffers use their retained bind snapshots. Feed them the
      // captured angles plus the same eased death offsets, then let the
      // existing plant solver keep a sole at the render-only ground plane.
      if (progress > 0) {
        // A fallen body keeps both rendered soles grounded. Leaving the
        // opposite foot in swing mode lets the corpse's rotated root carry
        // that limb below the visual ground plane, so this is presentation
        // contact only; authority roots and hit proxies remain unchanged.
        const leftPlantTarget = 1;
        const rightPlantTarget = 1;
        bot.leftLegDeformationController.write({
          knee: start.leftLeg.knee + pose.leftKneePitch,
          ankle: start.leftLeg.ankle + pose.leftAnklePitch,
        });
        writeCharacterLimbFootPlanting(bot.leftLegDeformationController, {
          plant: blendBotDeathInput(
            start.leftLeg.plant,
            leftPlantTarget,
            eased,
          ),
          swingOffsetZ: start.leftLeg.offsetZ,
          groundY: 0,
          toeClearance: blendBotDeathInput(
            start.leftLeg.toeClearance,
            0.04,
            eased,
          ),
        });
        bot.rightLegDeformationController.write({
          knee: start.rightLeg.knee + pose.rightKneePitch,
          ankle: start.rightLeg.ankle + pose.rightAnklePitch,
        });
        writeCharacterLimbFootPlanting(bot.rightLegDeformationController, {
          plant: blendBotDeathInput(
            start.rightLeg.plant,
            rightPlantTarget,
            eased,
          ),
          swingOffsetZ: start.rightLeg.offsetZ,
          groundY: 0,
          toeClearance: blendBotDeathInput(
            start.rightLeg.toeClearance,
            0.04,
            eased,
          ),
        });
        bot.leftArmDeformationController.write({
          elbow: start.leftArm.elbow + pose.leftForearmPitch,
        });
        bot.rightArmDeformationController.write({
          elbow: start.rightArm.elbow + pose.rightForearmPitch,
        });
      }
      sampleSkinnedCharacterPose(bot.skinned, bot.animationPose, {
        elapsedSeconds: simulationNowMs / 1000,
      });
      applySkinnedCharacterDeathPose(bot.skinned, pose);
    };

    const resetBotVisualPose = (bot: Enemy) => {
      resetSkinnedCharacterDeathPose(bot.skinned);
      bot.deathElapsedSeconds = 0;
      bot.deathVariant = getBotDeathVariant(bot.id, bot.team);
      writeBotDeathPose(0, bot.deathVariant, bot.deathPose);
      bot.deathPresentation = null;
      bot.locomotionVelocityX = 0;
      bot.locomotionVelocityZ = 0;
      bot.locomotionPhase = 0;
      bot.bodyYaw = bot.root.rotation.y;
      bot.aimYaw = bot.bodyYaw;
      bot.lastAccelerationX = 0;
      bot.lastAccelerationZ = 0;
      bot.locomotionCommanded = false;
      bot.movementSpeed = 0;
      bot.verticalVelocity = 0;
      bot.grounded = true;
      bot.motionResolvedThisTick = false;
      bot.root.position.y = getMapGroundHeight(bot.root.position.x, bot.root.position.z);
      bot.root.rotation.x = 0;
      bot.root.rotation.z = 0;
      bot.leftLeg.rotation.set(0, 0, 0);
      bot.rightLeg.rotation.set(0, 0, 0);
      resetBotAnimationPresentation(bot);
    };
    const beginBotDeathPose = (bot: Enemy) => {
      objectiveIntel.forget(objectiveBotId(bot));
      bot.deathElapsedSeconds = 0;
      bot.deathVariant = getBotDeathVariant(bot.id, bot.team);
      writeBotDeathPose(0, bot.deathVariant, bot.deathPose);
      bot.root.position.y = getMapGroundHeight(bot.root.position.x, bot.root.position.z);
      bot.root.rotation.x = 0;
      bot.root.rotation.z = 0;
      syncBotRigToAuthority(bot);
      bot.deathPresentation = captureBotDeathPresentation(bot);
      bot.locomotionVelocityX = 0;
      bot.locomotionVelocityZ = 0;
      bot.locomotionPhase = 0;
      bot.lastAccelerationX = 0;
      bot.lastAccelerationZ = 0;
      bot.locomotionCommanded = false;
      bot.movementSpeed = 0;
      bot.verticalVelocity = 0;
      bot.grounded = true;
      bot.motionResolvedThisTick = false;
      resetBotMuzzleLights(bot);
      bot.burstShotsRemaining = 0;
      bot.reloadTimer = 0;
      bot.sightTime = 0;
      (Object.keys(bot.weaponModels) as FirearmKind[]).forEach((kind) => {
        bot.weaponModels[kind].visible = kind === bot.primaryWeapon;
      });
      bot.muzzleFlash.visible = false;
      applyBotDeathVisualPose(bot);
      bot.root.visible = true;
      bot.skinned.visualRoot.visible = true;
    };
    const updateBotDeathPoses = (dt: number) => {
      bots.forEach((bot) => {
        if (bot.alive || !bot.root.visible) return;
        if (bot.deathElapsedSeconds >= BOT_DEATH_DURATION_SECONDS) return;
        bot.deathElapsedSeconds = Math.min(
          BOT_DEATH_DURATION_SECONDS,
          bot.deathElapsedSeconds + dt,
        );
        applyBotDeathVisualPose(bot);
      });
    };

    const applyGraphicsQaMotionPose = (
      bot: Enemy,
      pose: GraphicsQaMotionPose,
      index: number,
    ) => {
      // The QA anchor is presentation-only. Authority roots stay at their
      // round-reset locations so no hit proxy transform is changed.
      bot.root.visible = false;
      bot.skinned.visualRoot.position.set(...getGraphicsQaMotionPosition(index));
      bot.skinned.visualRoot.rotation.set(0, 0, 0);
      bot.skinned.visualRoot.visible = true;
      bot.deathPresentation = null;
      bot.deathElapsedSeconds = 0;

      Object.assign(bot.animationState, createBotAnimationState());
      Object.assign(bot.animationPose, createBotAnimationPose());
      bot.leftLegDeformationController.reset();
      bot.rightLegDeformationController.reset();
      bot.leftArmDeformationController.reset();
      bot.rightArmDeformationController.reset();
      writeBotAnimationPose(
        {
          // A zero delta makes each capture an independent, phase-locked
          // sample instead of allowing the render clock to advance it.
          dtSeconds: 0,
          velocity: { x: pose.velocity[0], z: -pose.velocity[1] },
          acceleration: { x: 0, z: 0 },
          bodyYaw: 0,
          aimYaw: pose.aim[0],
          aimPitch: pose.aim[1],
          grounded: true,
          phase: pose.stridePhase * Math.PI * 2,
          actions:
            pose.action === 'reload'
              ? { reload: 0.85 }
              : pose.action === 'recoil'
                ? { fire: 0.85 }
                : {},
        },
        bot.animationState,
        bot.animationPose,
      );
      bot.animationPose.lowerBodyYaw = 0;
      applyCharacterRigPose(bot.rig, bot.animationPose);
      applyCharacterRigWeaponAim(bot.rig, pose.aim[0], bot.animationPose);

      (Object.keys(bot.weaponModels) as FirearmKind[]).forEach((kind) => {
        bot.weaponModels[kind].visible =
          pose.kind !== 'death' && kind === bot.primaryWeapon;
      });
      bot.muzzleFlash.visible = false;
      bot.rig.dominantGripTarget.visible = pose.kind !== 'death';
      bot.rig.supportGripTarget.visible = pose.kind !== 'death';

      applyCharacterRigWeaponGripTargets(bot.rig, bot.weaponGripOutput);
      bot.leftLegDeformationController.write({
        knee: bot.animationPose.leftKneePitch,
        ankle: bot.animationPose.leftAnklePitch,
      });
      writeCharacterLimbFootPlanting(bot.leftLegDeformationController, {
        plant: bot.animationPose.leftFootPlant,
        swingOffsetZ: bot.animationPose.leftFootOffsetZ,
        toeClearance: bot.animationPose.leftToeClearance,
      });
      bot.rightLegDeformationController.write({
        knee: bot.animationPose.rightKneePitch,
        ankle: bot.animationPose.rightAnklePitch,
      });
      writeCharacterLimbFootPlanting(bot.rightLegDeformationController, {
        plant: bot.animationPose.rightFootPlant,
        swingOffsetZ: bot.animationPose.rightFootOffsetZ,
        toeClearance: bot.animationPose.rightToeClearance,
      });
      bot.leftArmDeformationController.write({
        elbow: bot.weaponGripOutput.leftElbowPitch,
      });
      bot.rightArmDeformationController.write({
        elbow: bot.weaponGripOutput.rightElbowPitch,
      });
      sampleSkinnedCharacterPose(bot.skinned, bot.animationPose, {
        elapsedSeconds: pose.timeSeconds,
      });
      if (pose.kind === 'death') {
        // Capture after the normal deformation/IK pass. This makes each QA
        // death sample a real neutral, contact, strafe, reload, or recoil
        // origin instead of a reset bind pose.
        bot.deathPresentation = captureBotDeathPresentation(bot);
        bot.deathElapsedSeconds =
          pose.deathProgress * BOT_DEATH_DURATION_SECONDS;
        applyBotDeathVisualPose(bot);
      }
    };
    const applyGraphicsQaCloseCharacterPose = (
      bot: Enemy,
      review: GraphicsQaCloseCharacterReview,
      index: number,
    ) => {
      const motionKind =
        review.pose === 'death'
          ? 'death'
          : review.name === 'locomotion'
            ? 'strafe'
            : review.pose === 'walk'
              ? 'run'
              : 'aim';
      const pose: GraphicsQaMotionPose = {
        kind: motionKind,
        label: `${review.name}-${review.pose}-${review.timeSeconds.toFixed(2)}`,
        timeSeconds: review.timeSeconds,
        velocity:
          review.name === 'locomotion'
            ? [2.2, 0]
            : review.pose === 'walk'
              ? [0, 2.2]
              : [0, 0],
        stridePhase: review.stridePhase,
        aim: [0, 0],
        deathProgress:
          review.pose === 'death'
            ? Math.min(1, review.timeSeconds / BOT_DEATH_DURATION_SECONDS)
            : 0,
        origin: review.pose === 'death' ? 'neutral' : undefined,
      };
      if (review.pose === 'death') bot.deathVariant = review.deathVariant;
      applyGraphicsQaMotionPose(bot, pose, index);

      if (review.pose === 'crouch') {
        Object.assign(bot.animationPose, {
          pelvisLift: -0.28,
          torsoLeanZ: -0.08,
          weaponSocketY: 1.2 - 0.28 - 0.08 * 0.08,
          leftHipPitch: 0.55,
          rightHipPitch: 0.55,
          leftKneePitch: -1.05,
          rightKneePitch: -1.05,
          leftAnklePitch: 0.5,
          rightAnklePitch: 0.5,
          leftFootPlant: 1,
          rightFootPlant: 1,
          leftFootOffsetZ: 0,
          rightFootOffsetZ: 0,
          leftToeClearance: 0.04,
          rightToeClearance: 0.04,
        });
        applyCharacterRigPose(bot.rig, bot.animationPose);
        applyCharacterRigWeaponAim(bot.rig, 0, bot.animationPose);
        applyCharacterRigWeaponGripTargets(bot.rig, bot.weaponGripOutput);
        bot.leftLegDeformationController.write({
          knee: bot.animationPose.leftKneePitch,
          ankle: bot.animationPose.leftAnklePitch,
        });
        writeCharacterLimbFootPlanting(bot.leftLegDeformationController, {
          plant: bot.animationPose.leftFootPlant,
          swingOffsetZ: bot.animationPose.leftFootOffsetZ,
          toeClearance: bot.animationPose.leftToeClearance,
        });
        bot.rightLegDeformationController.write({
          knee: bot.animationPose.rightKneePitch,
          ankle: bot.animationPose.rightAnklePitch,
        });
        writeCharacterLimbFootPlanting(bot.rightLegDeformationController, {
          plant: bot.animationPose.rightFootPlant,
          swingOffsetZ: bot.animationPose.rightFootOffsetZ,
          toeClearance: bot.animationPose.rightToeClearance,
        });
        bot.leftArmDeformationController.write({
          elbow: bot.weaponGripOutput.leftElbowPitch,
        });
        bot.rightArmDeformationController.write({
          elbow: bot.weaponGripOutput.rightElbowPitch,
        });
        sampleSkinnedCharacterPose(bot.skinned, bot.animationPose, {
          elapsedSeconds: review.timeSeconds,
        });
      }

      const baseX = review.subject === 'both' ? (index === 0 ? -0.62 : 0.62) : 0;
      bot.skinned.visualRoot.position.set(
        baseX + review.rootTravelMeters,
        GRAPHICS_QA_REVIEW_POSITION[1] - 1.68,
        GRAPHICS_QA_REVIEW_POSITION[2] - review.distanceMeters,
      );
      bot.skinned.visualRoot.rotation.set(
        0,
        review.angle === 'front'
          ? Math.PI
          : Math.PI + (bot.side === 't' ? -Math.PI / 4 : Math.PI / 4),
        0,
      );
      bot.skinned.visualRoot.scale.setScalar(1);
      // This inspection route intentionally retains the equipped world model
      // on every pose, including death, so hand/weapon separation stays visible.
      (Object.keys(bot.weaponModels) as FirearmKind[]).forEach((kind) => {
        bot.weaponModels[kind].visible = kind === bot.primaryWeapon;
      });
    };
    const combatOccluders: THREE.Object3D[] = [...obstacleMeshes, ...hitMeshes];
    const shotSurfaceMeshes: THREE.Object3D[] = [...obstacleMeshes, ground];

    const keys = new Set<string>();
    let keyboardPlaytestTapLatches = createKeyboardPlaytestTapLatches();
    const startingSecondary = getStarterSecondaryForSide('ct');
    const startingAmmo = createEmptyFirearmAmmo();
    startingAmmo[startingSecondary] = createStarterSecondaryAmmo('ct');
    const simulationClock = createSimulationClock();
    const gameplayActions = createGameplayActions();
    let simulationTickActive = false;
    const playerMovement = createPlayerMovement();
    const playerInput = createPlayerInputTimeline();
    const weaponSpecial = createWeaponSpecialActions();
    const weaponBallistics = createWeaponBallistics(1601);
    let spreadRandom = createSeededRandom(1602);
    const silencerVisuals = (['usp', 'carbine'] as const).map(kind => {
      const view = weaponViews[kind];
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.27, 10),
        new THREE.MeshStandardMaterial({ color: 0x242824, roughness: 0.8 }));
      mesh.name = `${kind}-silencer`;
      mesh.rotation.x = Math.PI / 2;
      view.root.updateMatrixWorld(true);
      const muzzlePosition = view.muzzle ? view.muzzle.getWorldPosition(new THREE.Vector3()) : view.root.getWorldPosition(new THREE.Vector3());
      mesh.position.copy(view.root.worldToLocal(muzzlePosition));
      mesh.position.z -= 0.12;
      mesh.visible = false;
      mesh.raycast = () => undefined;
      if (view.authoredAnimation && view.muzzle) {
        // This metre-sized effect mount follows the authored animated barrel.
        mesh.position.set(0, 0, -0.12);
        view.muzzle.add(mesh);
      } else {
        view.root.add(mesh);
      }
      configureViewmodelRenderLayer(mesh);
      return { kind, mesh };
    });
    const syncSilencerVisuals = () => silencerVisuals.forEach(({ kind, mesh }) => {
      mesh.visible = weaponSpecial.isSilenced(kind);
    });
    let movementNeedsSeed = true;
    const player = {
      position: new THREE.Vector3(0, getMapGroundHeight(0, 26) + 1.68, 26),
      velocity: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      health: 100,
      armor: 0,
      helmet: false,
      ammo: startingAmmo,
      activeWeapon: startingSecondary as WeaponKind,
      primaryWeapon: null as PrimaryWeaponKind | null,
      secondaryWeapon: startingSecondary as SecondaryWeaponKind | null,
      scoped: false,
      money: 800,
      nextShot: 0,
      equipReadyAtMs: 0,
      reload: null as {
        weapon: FirearmKind;
        startedAt: number;
        completesAt: number;
        shotgunPhase?: ShotgunReloadPhase;
      } | null,
      recoil: 0,
      damageSuppression: 0,
      damageTag: 0,
      shotPulse: 0,
      shotSide: 0,
      verticalVelocity: 0,
      grounded: true,
      crouched: false,
      crouchOffset: 0,
      landingRecoverySeconds: 0,
      locomotionPhase: 0,
      hasDefuseKit: false,
      grenades: 0,
      smokes: 0,
      flashes: 0,
    };
    let playerPresentationState: PlayerPresentationState =
      createPlayerPresentationState(
        player.yaw,
        player.pitch,
        player.locomotionPhase,
      );
    const previousPlayerFinalizedHorizontalVelocity = { x: 0, z: 0 };
    let playerPresentationPose: PlayerPresentationPose | null = null;
    let playerPresentationLegacyCameraY = 0;
    const playerInterpolationOffset = new THREE.Vector3();
    const resetPlayerPresentation = () => {
      playerPresentationState = createPlayerPresentationState(
        player.yaw,
        player.pitch,
        player.locomotionPhase,
      );
      previousPlayerFinalizedHorizontalVelocity.x = 0;
      previousPlayerFinalizedHorizontalVelocity.z = 0;
      playerPresentationPose = null;
      playerPresentationLegacyCameraY = 0;
    };
    const playerCombatEyePosition = player.position.clone();
    const reloadPose: WeaponReloadPose = {
      positionX: 0,
      positionY: 0,
      positionZ: 0,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
    };
    const sniperBoltCyclePose: SniperBoltCyclePose = {
      positionZ: 0,
      rotationZ: 0,
    };
    // The menu overlooks an empty corridor, clear of the staged spawn actors.
    camera.position.set(26, getMapGroundHeight(26, 4) + 1.68, 4);

    let status: GameStatus = 'briefing';
    let roundSeconds = ROUND_DURATION_SECONDS;
    let matchState = createMatchState(startingPlayerSide);
    let roundBotDifficulty: BotDifficulty =
      engineSettingsRef.current.difficulty;
    let playerKills = 0;
    let playerDeaths = 0;
    let message = 'OPERATION DUSTLINE';
    let killFeed: string[] = [];
    let bombState: BombState = 'carried';
    let roundPlan: RoundPlan = getRoundPlan(0, 'ct');
    let selectedBombsite: BombsiteName = roundPlan.targetSite;
    let bombCarrier: Enemy | null = enemies[0];
    let defuseProgress = 0;
    let canDefuse = false;
    let playerHasBomb = false;
    let playerPlantProgress = 0;
    let plantingSite: BombsiteName | null = null;
    let canPlant = false;
    let enemyDefuser: Enemy | null = null;
    let enemyDefuseProgress = 0;
    let nextBombBeep = 0;
    let freezeEnds = 0;
    let playerAlive = true;
    let playerDeathCamera: PlayerDeathCameraState | null = null;
    let spectatorPresentationPosition: THREE.Vector3 | null = null;
    let spectatedEnemy: Enemy | null = null;
    let spectateEnds = 0;
    let nextFootstepAt = 0;
    let nextAudibleBotFootstepAtMs = 0;
    let botFootstepCursor = 0;
    let touchPlaying = false;
    let wasPlaying = false;
    let firing = false;
    let triggerReady = true;
    let jumpReady = true;
    let dryFireArmed = true;
    let dropRequested = false;
    let lastShotgunShotAt = Number.NEGATIVE_INFINITY;
    // Keep each authored firearm's fire clip independent across weapon swaps.
    const lastAuthoredShotAt: Partial<Record<FirearmKind, number>> = {};
    const clearAuthoredShotClocks = () => {
      (Object.keys(lastAuthoredShotAt) as FirearmKind[]).forEach((kind) => {
        delete lastAuthoredShotAt[kind];
      });
    };
    let lastSniperShotAt = Number.NEGATIVE_INFINITY;
    let buyMenuOpen = false;
    let lastHudUpdate = 0;
    let lastFrame = performance.now();
    let simulationNowMs = 0;
    let playerBlindUntilMs = 0;
    let playerBlindDurationSeconds = 0;
    let squadIntelAge = Number.POSITIVE_INFINITY;
    let friendlyIntelCalloutAge = Number.POSITIVE_INFINITY;
    let friendlyIntelFreshnessAge = Number.POSITIVE_INFINITY;
    let friendlyIntelTargetId: number | null = null;
    let backupRequestAgeSeconds = Number.POSITIVE_INFINITY;
    let nextBackupCallAtMs = 0;
    const allyPreviousDirectContactIds = allies.map<number | null>(() => null);
    let nextAllyEnemySpottedCalloutAtMs = 0;
    let radioCalloutText: string | null = null;
    let radioCalloutUntilMs = 0;
    const clearBackupRequest = () => {
      backupRequestAgeSeconds = Number.POSITIVE_INFINITY;
    };
    const clearSquadRadioState = () => {
      clearBackupRequest();
      allyPreviousDirectContactIds.fill(null);
      nextAllyEnemySpottedCalloutAtMs = simulationNowMs;
      radioCalloutText = null;
      radioCalloutUntilMs = 0;
    };
    const objectiveIntel = createBotObjectiveIntel();
    const objectiveBotId = (bot: Enemy) => `${bot.team}:${bot.id}`;
    const getBotObjectiveIntel = (bot: Enemy) => objectiveIntel.get(objectiveBotId(bot), simulationNowMs);
    const botHearing = createBotHearing();
    const botHearingCursors = new Map<Enemy, number>();
    const nextBotHearingStep = new Map<Enemy, number>();
    let animationFrame = 0;
    let audioContext: AudioContext | null = null;
    const shotSoundBuffers = new Map<FirearmKind, AudioBuffer[]>();
    const combatFeedbackBuffers = new Map<PlayerImpactCue, AudioBuffer>();
    let botDeathThudBuffer: AudioBuffer | null = null;
    let landingCueBuffer: AudioBuffer | null = null;
    let shotSoundVariant = 0;
    let nextBodyImpactAtMs = 0;
    let nextBotDeathThudAtMs = 0;
    let nextBotObjectiveCueAtMs = 0;
    let nextOpponentReloadCueAtMs = 0;
    let damageFeedbackTimer: number | null = null;
    let roundTransition: RoundTransitionBrief | null = null;
    let completedRoundReceipt: CompletedRoundReceipt | null = null;
    let pendingRoundResult: {
      winnerSide: Side;
      reason: string;
      event: RoundEndEvent;
    } | null = null;
    const fallLandingCounts = new Map<string, number>();
    let fallDamageReceipts: FallDamageReceipt[] = [];
    let controlledFallFixture: ControlledFallFixture | null = null;
    let skipBotRoundRequested = false;
    let fastForwardTimer: number | null = null;
    let fastForwardClockActive = false;
    const pushKillFeed = (entry: string) => {
      killFeed = [entry, ...killFeed].slice(0, 4);
    };
    const grenadeProjectiles = new Set<GrenadeProjectile>();
    const disposeGrenadeProjectile = (projectile: GrenadeProjectile) => {
      grenadeProjectiles.delete(projectile);
      scene.remove(projectile.mesh);
      projectile.mesh.geometry.dispose();
      (projectile.mesh.material as THREE.Material).dispose();
    };
    const clearGrenadeProjectiles = () => {
      Array.from(grenadeProjectiles).forEach(disposeGrenadeProjectile);
    };
    const droppedFirearms = new Map<number, DroppedFirearm>();
    let nextDroppedFirearmId = 1;
    const explosionEffects = new Set<{
      mesh: THREE.Mesh;
      light: THREE.PointLight;
      startedAt: number;
    }>();
    const smokeClouds = new Set<{
      group: THREE.Group;
      geometry: THREE.SphereGeometry;
      material: THREE.MeshBasicMaterial;
      age: number;
    }>();
    const cleanupTimers = new Set<number>();
    let roundTransitionTimer: number | null = null;
    const clearRoundTransition = () => {
      if (roundTransitionTimer !== null)
        window.clearTimeout(roundTransitionTimer);
      roundTransitionTimer = null;
    };
    const activeTracers = new Set<THREE.Line>();
    const createSurfaceImpactTexture = (kind: SurfaceImpactKind) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      if (context) {
        const center = 32;
        const glow = context.createRadialGradient(
          center,
          center,
          1,
          center,
          center,
          kind === 'metal' ? 22 : 30,
        );
        const color =
          kind === 'metal'
            ? '255,210,118'
            : kind === 'wood'
              ? '126,81,45'
              : kind === 'plaster'
                ? '213,184,132'
                : '224,193,137';
        glow.addColorStop(0, `rgba(${color},0.95)`);
        glow.addColorStop(0.22, `rgba(${color},0.56)`);
        glow.addColorStop(1, `rgba(${color},0)`);
        context.fillStyle = glow;
        context.fillRect(0, 0, 64, 64);
        context.save();
        context.translate(center, center);
        context.strokeStyle = `rgba(${color},${kind === 'metal' ? 0.9 : 0.42})`;
        context.lineWidth = kind === 'metal' ? 1.4 : 2;
        const streaks = kind === 'metal' ? 9 : 6;
        for (let index = 0; index < streaks; index += 1) {
          const angle = index * 2.399 + (kind === 'wood' ? 0.35 : 0);
          const length = (kind === 'metal' ? 12 : 7) + ((index * 7) % 13);
          context.beginPath();
          context.moveTo(Math.cos(angle) * 3, Math.sin(angle) * 3);
          context.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
          context.stroke();
        }
        context.restore();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const surfaceImpactTextures: Record<
      SurfaceImpactKind,
      THREE.CanvasTexture
    > = {
      sand: createSurfaceImpactTexture('sand'),
      plaster: createSurfaceImpactTexture('plaster'),
      wood: createSurfaceImpactTexture('wood'),
      metal: createSurfaceImpactTexture('metal'),
    };
    const getSurfaceImpactKind = (object: THREE.Object3D) =>
      (['sand', 'plaster', 'wood', 'metal'].includes(
        object.userData.surfaceImpactKind,
      )
        ? object.userData.surfaceImpactKind
        : 'plaster') as SurfaceImpactKind;
    const surfaceImpactPool = Array.from({ length: 32 }, () => {
      const material = new THREE.SpriteMaterial({
        map: surfaceImpactTextures.sand,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      sprite.renderOrder = 4;
      scene.add(sprite);
      return {
        sprite,
        material,
        origin: new THREE.Vector3(),
        startedAtMs: 0,
        durationMs: 0,
        baseScale: 0,
        rise: 0,
      };
    });
    let nextSurfaceImpact = 0;
    const spawnSurfaceImpact = (
      hit: THREE.Intersection<THREE.Object3D>,
      shotDirection: THREE.Vector3,
      nowMs: number,
    ) => {
      const kind = getSurfaceImpactKind(hit.object);
      const visualProfile = getCombatVisualSurfaceProfile(kind);
      const slot = surfaceImpactPool[nextSurfaceImpact];
      nextSurfaceImpact = (nextSurfaceImpact + 1) % surfaceImpactPool.length;
      slot.material.map = surfaceImpactTextures[kind];
      slot.material.opacity = 1;
      slot.material.rotation = ((nextSurfaceImpact * 2.399) % 6.28) - 3.14;
      slot.material.needsUpdate = true;
      slot.origin.copy(hit.point).addScaledVector(shotDirection, -0.03);
      slot.sprite.position.copy(slot.origin);
      slot.startedAtMs = nowMs;
      slot.durationMs = visualProfile.impactLifetimeMs;
      slot.baseScale = visualProfile.impactScale;
      slot.rise = kind === 'metal' ? -0.08 : 0.18;
      slot.sprite.scale.setScalar(slot.baseScale);
      slot.sprite.visible = true;
    };
    const updateSurfaceImpacts = (nowMs: number) => {
      surfaceImpactPool.forEach((slot) => {
        if (!slot.sprite.visible) return;
        const progress = Math.min(
          1,
          Math.max(0, (nowMs - slot.startedAtMs) / slot.durationMs),
        );
        slot.material.opacity = (1 - progress) ** 1.45;
        slot.sprite.scale.setScalar(slot.baseScale * (1 + progress * 1.65));
        slot.sprite.position.copy(slot.origin);
        slot.sprite.position.y += slot.rise * progress;
        if (progress >= 1) slot.sprite.visible = false;
      });
    };
    const createBulletMarkTexture = (kind: PersistentBulletMarkKind) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      if (context) {
        const center = 32;
        const core = context.createRadialGradient(
          center,
          center,
          1,
          center,
          center,
          kind === 'metal' ? 15 : 22,
        );
        core.addColorStop(0, 'rgba(255,255,255,0.98)');
        core.addColorStop(
          kind === 'metal' ? 0.34 : 0.18,
          'rgba(255,255,255,0.9)',
        );
        core.addColorStop(0.58, 'rgba(255,255,255,0.34)');
        core.addColorStop(1, 'rgba(255,255,255,0)');
        context.fillStyle = core;
        context.fillRect(0, 0, 64, 64);
        context.save();
        context.translate(center, center);
        context.strokeStyle = 'rgba(255,255,255,0.68)';
        context.lineCap = 'round';
        context.lineWidth = kind === 'plaster' ? 2.1 : 1.4;
        const cracks = kind === 'metal' ? 5 : kind === 'wood' ? 7 : 9;
        for (let index = 0; index < cracks; index += 1) {
          const angle = index * 2.399 + (kind === 'wood' ? 0.42 : 0);
          const inner = kind === 'metal' ? 5 : 4;
          const length =
            kind === 'metal'
              ? 8 + ((index * 3) % 5)
              : kind === 'wood'
                ? 11 + ((index * 5) % 12)
                : 10 + ((index * 7) % 13);
          context.beginPath();
          context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
          context.lineTo(
            Math.cos(angle + (index % 2 ? 0.08 : -0.06)) * length,
            Math.sin(angle + (index % 2 ? 0.08 : -0.06)) * length,
          );
          context.stroke();
        }
        if (kind === 'metal') {
          context.strokeStyle = 'rgba(255,255,255,0.82)';
          context.lineWidth = 2;
          context.beginPath();
          context.arc(0, 0, 8, 0, Math.PI * 2);
          context.stroke();
        }
        context.restore();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      return texture;
    };
    const bulletMarkRoot = new THREE.Group();
    bulletMarkRoot.name = 'persistent-bullet-marks-visual-only';
    decorativeDetailRoot.add(bulletMarkRoot);
    const bulletMarkGeometry = new THREE.PlaneGeometry(1, 1);
    const bulletMarkColors: Readonly<Record<PersistentBulletMarkKind, number>> =
      {
        plaster: 0x3f352c,
        wood: 0x24170f,
        metal: 0x2a2c2a,
      };
    const createBulletMarkBatch = (kind: PersistentBulletMarkKind) => {
      const texture = createBulletMarkTexture(kind);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        color: bulletMarkColors[kind],
        transparent: true,
        opacity: kind === 'metal' ? 0.78 : 0.72,
        alphaTest: 0.18,
        depthTest: true,
        depthWrite: false,
        fog: true,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const mesh = new THREE.InstancedMesh(
        bulletMarkGeometry,
        material,
        PERSISTENT_BULLET_MARK_CAPACITY[kind],
      );
      mesh.name = `persistent-${kind}-bullet-marks`;
      mesh.count = 0;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.raycast = () => undefined;
      bulletMarkRoot.add(mesh);
      return { mesh, material, texture, cursor: 0 };
    };
    const bulletMarkBatches: Record<
      PersistentBulletMarkKind,
      ReturnType<typeof createBulletMarkBatch>
    > = {
      plaster: createBulletMarkBatch('plaster'),
      wood: createBulletMarkBatch('wood'),
      metal: createBulletMarkBatch('metal'),
    };
    const bulletMarkNormalMatrix = new THREE.Matrix3();
    const bulletMarkWorldNormal = new THREE.Vector3();
    const bulletMarkPosition = new THREE.Vector3();
    const bulletMarkScale = new THREE.Vector3();
    const bulletMarkQuaternion = new THREE.Quaternion();
    const bulletMarkTwist = new THREE.Quaternion();
    const bulletMarkMatrix = new THREE.Matrix4();
    const bulletMarkForward = new THREE.Vector3(0, 0, 1);
    const spawnPersistentBulletMark = (
      hit: THREE.Intersection<THREE.Object3D>,
      firearmKind: FirearmKind,
      kind: PersistentBulletMarkKind,
    ) => {
      if (!hit.face) return false;
      bulletMarkNormalMatrix.getNormalMatrix(hit.object.matrixWorld);
      bulletMarkWorldNormal
        .copy(hit.face.normal)
        .applyNormalMatrix(bulletMarkNormalMatrix);
      const visualProfile = getCombatVisualSurfaceProfile(kind);
      if (
        bulletMarkWorldNormal.length() <= visualProfile.normalAlignmentEpsilon
      )
        return false;
      const placement = getBulletMarkPlacement(
        [hit.point.x, hit.point.y, hit.point.z],
        [
          bulletMarkWorldNormal.x,
          bulletMarkWorldNormal.y,
          bulletMarkWorldNormal.z,
        ],
      );
      if (!placement) return false;
      const batch = bulletMarkBatches[kind];
      const capacity = PERSISTENT_BULLET_MARK_CAPACITY[kind];
      const slot = getPersistentBulletMarkSlot(batch.cursor, capacity);
      if (slot === null) return false;
      bulletMarkPosition.fromArray(placement.position);
      bulletMarkWorldNormal.fromArray(placement.normal);
      bulletMarkQuaternion.setFromUnitVectors(
        bulletMarkForward,
        bulletMarkWorldNormal,
      );
      bulletMarkTwist.setFromAxisAngle(
        bulletMarkForward,
        (batch.cursor * 2.399) % (Math.PI * 2),
      );
      bulletMarkQuaternion.multiply(bulletMarkTwist);
      const size = getCombatVisualMarkSize(firearmKind, kind);
      if (size === null) return false;
      bulletMarkScale.set(size, size, 1);
      bulletMarkMatrix.compose(
        bulletMarkPosition,
        bulletMarkQuaternion,
        bulletMarkScale,
      );
      batch.mesh.setMatrixAt(slot, bulletMarkMatrix);
      batch.mesh.count = Math.max(batch.mesh.count, slot + 1);
      batch.mesh.instanceMatrix.needsUpdate = true;
      batch.cursor += 1;
      return true;
    };
    const clearPersistentBulletMarks = () => {
      (Object.keys(bulletMarkBatches) as PersistentBulletMarkKind[]).forEach(
        (kind) => {
          const batch = bulletMarkBatches[kind];
          batch.cursor = 0;
          batch.mesh.count = 0;
        },
      );
    };
    const squadLastKnownPosition = new THREE.Vector3();
    const friendlyLastKnownEnemyPosition = new THREE.Vector3();
    const clearFriendlyIntel = () => {
      friendlyIntelCalloutAge = Number.POSITIVE_INFINITY;
      friendlyIntelFreshnessAge = Number.POSITIVE_INFINITY;
      friendlyIntelTargetId = null;
      friendlyLastKnownEnemyPosition.set(0, 0, 0);
    };

    const disposeDroppedFirearm = (drop: DroppedFirearm) => {
      scene.remove(drop.group);
      drop.group.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      });
      droppedFirearms.delete(drop.id);
    };

    const clearDroppedFirearms = () => {
      [...droppedFirearms.values()].forEach(disposeDroppedFirearm);
    };

    const getNearbyDroppedFirearm = (maximumDistance = FIREARM_PICKUP_RADIUS) => {
      const selectedDrop = getEligibleDroppedFirearm({
        drops: [...droppedFirearms.values()].map((drop) => ({
          id: drop.id,
          kind: drop.kind,
          pickupAvailableAtMs: drop.pickupAvailableAtMs,
          distance: Math.hypot(
            drop.group.position.x - player.position.x,
            drop.group.position.z - player.position.z,
          ),
        })),
        currentPrimary: player.primaryWeapon,
        currentSecondary: player.secondaryWeapon,
        simulationNowMs,
        maximumDistance,
      });

      if (selectedDrop === null) {
        return null;
      }

      return droppedFirearms.get(selectedDrop.id) ?? null;
    };

    const spawnFirearmDrop = ({
      kind,
      ammo,
      position,
      rotationY,
      origin,
      pickupAvailableAtMs,
    }: {
      kind: FirearmKind;
      ammo: FirearmAmmo;
      position: THREE.Vector3;
      rotationY: number;
      origin: DroppedFirearm['origin'];
      pickupAvailableAtMs: number;
    }) => {
      const snapshot = sanitizeDroppedFirearmAmmo(kind, ammo);
      const group = createWorldFirearmModel(kind);
      group.position.set(position.x, getMapSupportHeight(position.x, position.z, position.y) + 0.16, position.z);
      group.rotation.y = rotationY;
      scene.add(group);
      const drop: DroppedFirearm = {
        id: nextDroppedFirearmId,
        kind,
        ammo: snapshot,
        group,
        origin,
        pickupAvailableAtMs,
      };
      nextDroppedFirearmId += 1;
      droppedFirearms.set(drop.id, drop);
      if (droppedFirearms.size > enemies.length + 2) {
        const candidates = [...droppedFirearms.values()];
        const oldest =
          candidates.find(
            (candidate) =>
              candidate.origin === 'player' &&
              isFirearmDropAvailable(
                candidate.pickupAvailableAtMs,
                simulationNowMs,
              ),
          ) ??
          candidates.find((candidate) => candidate.origin === 'enemy') ??
          candidates[0];
        if (oldest) disposeDroppedFirearm(oldest);
      }
      return drop;
    };

    const spawnEnemyFirearmDrop = (enemy: Enemy) => {
      const firearmKind = getBotFirearmDropKind(enemy.stowedPrimary?.weapon ?? enemy.primaryWeapon);
      spawnFirearmDrop({
        kind: firearmKind,
        ammo: enemy.stowedPrimary?.ammo ?? enemy.ammo,
        position: enemy.root.position,
        rotationY: enemy.root.rotation.y + enemy.id * 0.19,
        origin: 'enemy',
        pickupAvailableAtMs: simulationNowMs,
      });
    };

    const emitActorSound = (
      side: Side, kind: BotSoundKind, position: THREE.Vector3,
      radius: number, memorySeconds: number,
    ) => botHearing.emit({ side, kind, position, radius, memorySeconds, nowMs: simulationNowMs });

    const hearOpponent = (bot: Enemy, hasDirectContact: boolean) => {
      const sound = botHearing.hear({
        side: bot.side, alive: bot.alive, position: bot.root.position,
        nowMs: simulationNowMs, afterId: botHearingCursors.get(bot) ?? 0,
      });
      if (!sound) return null;
      botHearingCursors.set(bot, sound.id);
      if (!hasDirectContact) {
        const memory = getSoundInvestigation(sound, bot.id, simulationNowMs);
        bot.lastKnownOpponentPosition.copy(memory.position);
        bot.combatMemory = memory.memorySeconds;
      }
      return sound;
    };

    const emitBotHearingFootstep = (bot: Enemy) => {
      if (!bot.grounded) return;
      if (!bot.alive || bot.movementSpeed <= 0.45 ||
        simulationNowMs < (nextBotHearingStep.get(bot) ?? 0)) return;
      emitActorSound(bot.side, 'footstep', bot.root.position, 18, 1.15);
      nextBotHearingStep.set(bot, simulationNowMs + getBotFootstepCadenceMs(bot.movementSpeed));
    };

    const classicUspBuffers = new Map<string, AudioBuffer>();
    const getClassicUspBuffer = (event: ClassicUspEvent, duration: number, variant = 0) => {
      const key = `${event}:${duration}:${variant}`;
      let buffer = classicUspBuffers.get(key);
      if (!buffer) {
        const data = createClassicUspSamples(event, audioContext!.sampleRate, duration, variant);
        buffer = audioContext!.createBuffer(1, data.length, audioContext!.sampleRate);
        buffer.getChannelData(0).set(data);
        classicUspBuffers.set(key, buffer);
      }
      return buffer;
    };
    const interactionBuffers = new Map<string, AudioBuffer>();
    const getInteractionBuffer = (
      key: InteractionSampleKey, duration = getInteractionSampleDuration(key), variant = 0,
    ) => {
      const cacheKey = `${key}:${duration}:${variant}`;
      let buffer = interactionBuffers.get(cacheKey);
      if (!buffer) {
        const samples = createClassicInteractionSamples(key, audioContext!.sampleRate, duration, variant);
        buffer = audioContext!.createBuffer(1, samples.length, audioContext!.sampleRate);
        buffer.getChannelData(0).set(samples);
        interactionBuffers.set(cacheKey, buffer);
      }
      return buffer;
    };
    const prepareShotSoundBuffers = () => {
      if (!audioContext || shotSoundBuffers.size > 0) return;
      (Object.keys(FIREARMS) as FirearmKind[]).forEach(weapon => {
        const duration = FIREARMS[weapon].feedback.sound.duration;
        shotSoundBuffers.set(weapon, [
          getInteractionBuffer(`${weapon}.fire`, duration, 0),
          getInteractionBuffer(`${weapon}.fire`, duration, 1),
        ]);
      });
    };

    const createSeededNoiseBuffer = (durationSeconds: number, seed: number) => {
      const context = audioContext!;
      const buffer = context.createBuffer(
        1,
        Math.ceil(context.sampleRate * durationSeconds),
        context.sampleRate,
      );
      const data = buffer.getChannelData(0);
      let noiseSeed = seed >>> 0;
      for (let index = 0; index < data.length; index += 1) {
        noiseSeed = (noiseSeed * 1664525 + 1013904223) >>> 0;
        const noise = (noiseSeed / 0xffffffff) * 2 - 1;
        const progress = index / data.length;
        data[index] = noise * (1 - progress) ** 1.8;
      }
      return buffer;
    };

    const prepareCombatFeedbackBuffers = () => {
      if (!audioContext) return;
      if (combatFeedbackBuffers.size === 0) {
        const cues: PlayerImpactCue[] = [
          'body-impact',
          'head-impact',
          'kill-impact',
          'headshot-kill-impact',
        ];
        cues.forEach((cue, index) => {
          const profile = getCombatFeedbackSoundProfile(cue);
          combatFeedbackBuffers.set(
            cue,
            createSeededNoiseBuffer(
              profile.durationSeconds,
              0x9e3779b9 + index * 0x85ebca6b,
            ),
          );
        });
      }
      botDeathThudBuffer ??= createSeededNoiseBuffer(0.145, 0x4a7c15d3);
    };

    const playPlayerImpactCue = (cue: PlayerImpactCue | null) => {
      const volume = engineSettingsRef.current.volume;
      if (!cue || volume <= 0) return;
      audioContext ??= new AudioContext();
      if (audioContext.state === 'suspended') void audioContext.resume();
      prepareCombatFeedbackBuffers();
      const buffer = player.activeWeapon === 'usp'
        ? getClassicUspBuffer('bodyImpact', getCombatFeedbackSoundProfile(cue).durationSeconds)
        : combatFeedbackBuffers.get(cue);
      if (!buffer) return;

      const profile = getCombatFeedbackSoundProfile(cue);
      const now = audioContext.currentTime;
      const noise = audioContext.createBufferSource();
      const highpass = audioContext.createBiquadFilter();
      const lowpass = audioContext.createBiquadFilter();
      const noiseGain = audioContext.createGain();
      highpass.type = 'highpass';
      highpass.frequency.value = profile.highpassHz;
      lowpass.type = 'lowpass';
      lowpass.frequency.value = profile.lowpassHz;
      noiseGain.gain.setValueAtTime(profile.noiseGain * volume, now);
      noiseGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + profile.durationSeconds,
      );
      noise.buffer = buffer;
      noise
        .connect(highpass)
        .connect(lowpass)
        .connect(noiseGain)
        .connect(audioContext.destination);
      noise.start(now);
      noise.stop(now + profile.durationSeconds);

      if (profile.toneGain <= 0) return;
      const tone = audioContext.createOscillator();
      const toneGain = audioContext.createGain();
      tone.type = cue.includes('head') ? 'sine' : 'triangle';
      tone.frequency.setValueAtTime(profile.toneStartHz, now);
      tone.frequency.exponentialRampToValueAtTime(
        profile.toneEndHz,
        now + profile.durationSeconds,
      );
      toneGain.gain.setValueAtTime(profile.toneGain * volume, now);
      toneGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + profile.durationSeconds,
      );
      tone.connect(toneGain).connect(audioContext.destination);
      tone.start(now);
      tone.stop(now + profile.durationSeconds);
    };

    const playBotDeathThud = (sourcePosition: THREE.Vector3) => {
      const volume = engineSettingsRef.current.volume;
      if (volume <= 0) return;
      const positionalCue = getPositionalAudioCue(
        sourcePosition.x,
        sourcePosition.z,
        player.position.x,
        player.position.z,
        player.yaw,
        BOT_DEATH_HEARING_RADIUS,
      );
      if (
        !shouldEmitBotDeathThud({
          active: status === 'active',
          listenerAlive: playerAlive,
          audible: positionalCue !== null,
          nowMs: simulationNowMs,
          nextDeathThudAtMs: nextBotDeathThudAtMs,
        }) ||
        !positionalCue
      )
        return;
      nextBotDeathThudAtMs = simulationNowMs + BOT_DEATH_THUD_COOLDOWN_MS;

      audioContext ??= new AudioContext();
      if (audioContext.state === 'suspended') void audioContext.resume();
      prepareCombatFeedbackBuffers();
      if (!botDeathThudBuffer) return;
      const startsAt = audioContext.currentTime + 0.028;
      const endsAt = startsAt + 0.145;
      const noise = audioContext.createBufferSource();
      const lowpass = audioContext.createBiquadFilter();
      const noiseGain = audioContext.createGain();
      const tone = audioContext.createOscillator();
      const toneGain = audioContext.createGain();
      const panner = audioContext.createStereoPanner();
      noise.buffer = botDeathThudBuffer;
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(520, startsAt);
      lowpass.frequency.exponentialRampToValueAtTime(120, endsAt);
      noiseGain.gain.setValueAtTime(
        0.085 * positionalCue.gain * volume,
        startsAt,
      );
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, endsAt);
      tone.type = 'triangle';
      tone.frequency.setValueAtTime(105, startsAt);
      tone.frequency.exponentialRampToValueAtTime(52, endsAt);
      toneGain.gain.setValueAtTime(
        0.02 * positionalCue.gain * volume,
        startsAt,
      );
      toneGain.gain.exponentialRampToValueAtTime(0.0001, endsAt);
      panner.pan.value = positionalCue.pan;
      noise.connect(lowpass).connect(noiseGain).connect(panner);
      tone.connect(toneGain).connect(panner);
      panner.connect(audioContext.destination);
      noise.start(startsAt);
      noise.stop(endsAt);
      tone.start(startsAt);
      tone.stop(endsAt);
    };

    const playShotSound = (weaponKind: FirearmKind) => {
      if (engineSettingsRef.current.volume <= 0) return;
      audioContext ??= new AudioContext();
      if (audioContext.state === 'suspended') void audioContext.resume();
      prepareShotSoundBuffers();
      const profile = FIREARMS[weaponKind].feedback.sound;
      const variants = shotSoundBuffers.get(weaponKind);
      if (!variants) return;
      const source = audioContext.createBufferSource();
      const highpass = audioContext.createBiquadFilter();
      const lowpass = audioContext.createBiquadFilter();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;
      highpass.type = 'highpass';
      highpass.frequency.value = profile.highpass;
      lowpass.type = 'lowpass';
      lowpass.frequency.value = profile.lowpass;
      const peakGain = Math.max(
        0.0001,
        profile.gain * engineSettingsRef.current.volume * (weaponSpecial.isSilenced(weaponKind) ? 0.35 : 1),
      );
      gain.gain.setValueAtTime(peakGain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);
      source.buffer = variants[shotSoundVariant % variants.length];
      shotSoundVariant += 1;
      source
        .connect(highpass)
        .connect(lowpass)
        .connect(gain)
        .connect(audioContext.destination);
      source.start(now);
      source.stop(now + profile.duration);
    };

    const playWeaponActionSound = (
      weaponKind: FirearmKind,
      action: keyof (typeof WEAPON_ACTION_SOUNDS)[FirearmKind],
      positionalCue: { pan: number; gain: number } | null = null,
    ) => {
      if (engineSettingsRef.current.volume <= 0) return;
      audioContext ??= new AudioContext();
      if (audioContext.state === 'suspended') void audioContext.resume();
      const profile = WEAPON_ACTION_SOUNDS[weaponKind][action];
      const now = audioContext.currentTime;
      const buffer = getInteractionBuffer(`${weaponKind}.${action}`, profile.duration);
      const noise = audioContext.createBufferSource();
      const highpass = audioContext.createBiquadFilter();
      const lowpass = audioContext.createBiquadFilter();
      const noiseGain = audioContext.createGain();
      const tone = audioContext.createOscillator();
      const toneGain = audioContext.createGain();
      const panner = audioContext.createStereoPanner();
      const output = audioContext.createGain();
      highpass.type = 'highpass';
      highpass.frequency.value = profile.highpass;
      lowpass.type = 'lowpass';
      lowpass.frequency.value = profile.lowpass;
      const volume = engineSettingsRef.current.volume;
      noiseGain.gain.setValueAtTime(profile.gain, now);
      noiseGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + profile.duration,
      );
      tone.type = action === 'dryFire' ? 'square' : 'triangle';
      tone.frequency.setValueAtTime(profile.toneFrequency, now);
      tone.frequency.exponentialRampToValueAtTime(
        Math.max(35, profile.toneFrequency * 0.62),
        now + profile.duration,
      );
      toneGain.gain.setValueAtTime(profile.gain * 0.34, now);
      toneGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + profile.duration,
      );
      panner.pan.value = positionalCue?.pan ?? 0;
      output.gain.value = (positionalCue?.gain ?? 1) * volume;
      noise.buffer = buffer;
      noise
        .connect(highpass)
        .connect(lowpass)
        .connect(noiseGain)
        .connect(panner);
      tone.connect(toneGain).connect(panner);
      panner.connect(output).connect(audioContext.destination);
      noise.onended = () => {
        noise.disconnect();
        tone.disconnect();
        highpass.disconnect();
        lowpass.disconnect();
        noiseGain.disconnect();
        toneGain.disconnect();
        panner.disconnect();
        output.disconnect();
      };
      noise.start(now);
      tone.start(now);
      noise.stop(now + profile.duration);
      tone.stop(now + profile.duration);
    };

    const emitOpponentReloadCue = (opponent: Enemy, cue: OpponentReloadCue) => {
      const distance = Math.hypot(
        opponent.root.position.x - player.position.x,
        opponent.root.position.z - player.position.z,
      );
      if (
        !shouldEmitOpponentReloadCue({
          active: status === 'active',
          sourceAlive: opponent.alive,
          listenerAlive: playerAlive,
          distance,
          nowMs: simulationNowMs,
          nextCueAtMs: nextOpponentReloadCueAtMs,
        })
      )
        return;
      const positionalCue = getPositionalAudioCue(
        opponent.root.position.x,
        opponent.root.position.z,
        player.position.x,
        player.position.z,
        player.yaw,
        OPPONENT_RELOAD_HEARING_RADIUS,
      );
      if (!positionalCue) return;
      nextOpponentReloadCueAtMs =
        simulationNowMs + OPPONENT_RELOAD_SHARED_COOLDOWN_MS;
      playWeaponActionSound(opponent.primaryWeapon, cue, positionalCue);
    };

    const playEnemyShotSound = (
      sourcePosition: THREE.Vector3,
      weaponKind: FirearmKind,
      silenced: boolean,
    ) => {
      audioContext ??= new AudioContext();
      if (audioContext.state === 'suspended') void audioContext.resume();
      const profile = FIREARMS[weaponKind].feedback.sound;
      const buffer = getInteractionBuffer(`${weaponKind}.fire`, profile.duration, 0);
      const deltaX = sourcePosition.x - player.position.x;
      const deltaZ = sourcePosition.z - player.position.z;
      const distance = Math.hypot(deltaX, deltaZ) || 1;
      const rightX = Math.cos(player.yaw);
      const rightZ = -Math.sin(player.yaw);
      const panAmount = THREE.MathUtils.clamp(
        (deltaX * rightX + deltaZ * rightZ) / distance,
        -1,
        1,
      );
      const source = audioContext.createBufferSource();
      const filter = audioContext.createBiquadFilter();
      const panner = audioContext.createStereoPanner();
      const gain = audioContext.createGain();
      filter.type = 'bandpass';
      filter.frequency.value = Math.sqrt(profile.highpass * profile.lowpass);
      filter.Q.value = weaponKind === 'sniper' ? 0.48 : 0.7;
      panner.pan.value = panAmount;
      gain.gain.value =
        Math.max(
          0.035,
          profile.gain *
            0.36 *
            (1 - distance / FIREARMS[weaponKind].noiseRadius),
        ) * engineSettingsRef.current.volume * (silenced ? 0.35 : 1);
      source.buffer = buffer;
      source
        .connect(filter)
        .connect(panner)
        .connect(gain)
        .connect(audioContext.destination);
      source.start();
      // Retain the shorter distant-shot duration while sharing the authored source.
      if (weaponKind !== 'usp') source.stop(audioContext.currentTime + Math.max(0.055, profile.duration * 0.72));
    };

    const showEnemyTracer = (
      enemy: Enemy,
      targetPosition: THREE.Vector3,
      hitTarget: boolean,
    ) => {
      const visualProfile = getCombatVisualWeaponProfile(
        'bot',
        enemy.primaryWeapon,
      );
      enemy.rig.visualRoot.updateMatrixWorld(true);
      const muzzle =
        isSecondaryWeaponKind(enemy.primaryWeapon) &&
        enemy.activeSecondaryMuzzle
          ? enemy.activeSecondaryMuzzle
          : enemy.muzzleFlash;
      const origin = muzzle.getWorldPosition(new THREE.Vector3());
      const target = targetPosition.clone();
      const geometry = new THREE.BufferGeometry().setFromPoints([
        origin,
        target,
      ]);
      const material = new THREE.LineBasicMaterial({
        color: hitTarget ? 0xffd181 : 0xb89a68,
        transparent: true,
        opacity: hitTarget ? 0.72 : 0.38,
        depthWrite: false,
        linewidth: visualProfile.tracerWidth,
      });
      const tracer = new THREE.Line(geometry, material);
      tracer.renderOrder = 4;
      scene.add(tracer);
      activeTracers.add(tracer);
      const tracerTimer = window.setTimeout(() => {
        scene.remove(tracer);
        activeTracers.delete(tracer);
        geometry.dispose();
        material.dispose();
        cleanupTimers.delete(tracerTimer);
      }, visualProfile.tracerLifetimeMs);
      cleanupTimers.add(tracerTimer);
    };

    const playEquipmentSound = (key: EquipmentSampleKey, position: THREE.Vector3 | null = null) => {
      const volume = engineSettingsRef.current.volume;
      if (volume <= 0) return;
      const positionalCue = position ? getPositionalAudioCue(
        position.x, position.z, player.position.x, player.position.z, player.yaw, 12,
      ) : { pan: 0, gain: 1 };
      if (!positionalCue) return;
      audioContext ??= new AudioContext();
      if (audioContext.state === 'suspended') void audioContext.resume();
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      const panner = audioContext.createStereoPanner();
      source.buffer = getInteractionBuffer(key);
      gain.gain.value = (key.startsWith('knife') ? 0.1 : 0.08) * volume * positionalCue.gain;
      panner.pan.value = positionalCue.pan;
      source.connect(gain).connect(panner).connect(audioContext.destination);
      source.onended = () => { source.disconnect(); gain.disconnect(); panner.disconnect(); };
      source.start();
    };

    const playBombBeep = () => {
      audioContext ??= new AudioContext();
      if (audioContext.state === 'suspended') void audioContext.resume();
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = getInteractionBuffer('bomb.beep');
      gain.gain.value = 0.09 * engineSettingsRef.current.volume;
      source.connect(gain).connect(audioContext.destination);
      source.onended = () => { source.disconnect(); gain.disconnect(); };
      source.start();
    };

    const playObjectiveActionCue = (
      cue: ObjectiveActionCue,
      positionalCue: { pan: number; gain: number } | null = null,
    ) => {
      const volume = engineSettingsRef.current.volume;
      if (volume <= 0) return;
      audioContext ??= new AudioContext();
      if (audioContext.state === 'suspended') void audioContext.resume();
      const profile = getObjectiveActionSoundProfile(cue);
      const buffer = getInteractionBuffer(`bomb.${cue}`, profile.durationSeconds);

      const now = audioContext.currentTime;
      const noise = audioContext.createBufferSource();
      const tone = audioContext.createOscillator();
      const highpass = audioContext.createBiquadFilter();
      const lowpass = audioContext.createBiquadFilter();
      const noiseGain = audioContext.createGain();
      const toneGain = audioContext.createGain();
      const panner = audioContext.createStereoPanner();
      const output = audioContext.createGain();
      noise.buffer = buffer;
      tone.type = cue.endsWith('-complete') ? 'square' : 'triangle';
      tone.frequency.setValueAtTime(profile.frequencyHz, now);
      tone.frequency.exponentialRampToValueAtTime(
        profile.frequencyHz * 0.84,
        now + profile.durationSeconds,
      );
      highpass.type = 'highpass';
      highpass.frequency.value = profile.highpassHz;
      lowpass.type = 'lowpass';
      lowpass.frequency.value = profile.lowpassHz;
      noiseGain.gain.setValueAtTime(profile.noiseGain, now);
      noiseGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + profile.durationSeconds,
      );
      toneGain.gain.setValueAtTime(profile.toneGain, now);
      toneGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + profile.durationSeconds,
      );
      panner.pan.value = positionalCue?.pan ?? 0;
      output.gain.value = (positionalCue?.gain ?? 1) * volume;
      noise
        .connect(highpass)
        .connect(lowpass)
        .connect(noiseGain)
        .connect(panner);
      tone.connect(toneGain).connect(panner);
      panner.connect(output).connect(audioContext.destination);
      noise.onended = () => {
        noise.disconnect();
        tone.disconnect();
        highpass.disconnect();
        lowpass.disconnect();
        noiseGain.disconnect();
        toneGain.disconnect();
        panner.disconnect();
        output.disconnect();
      };
      noise.start(now);
      tone.start(now);
      noise.stop(now + profile.durationSeconds);
      tone.stop(now + profile.durationSeconds);
    };

    const emitBotObjectiveActionCue = (
      cue: ObjectiveActionCue,
      source: THREE.Vector3,
      sourceAlive: boolean,
    ) => {
      if (sourceAlive && status === 'active' && cue.endsWith('-start'))
        emitActorSound(cue.startsWith('plant') ? 't' : 'ct', 'objective', source, 17, 0.45);
      const distance = Math.hypot(
        source.x - player.position.x,
        source.z - player.position.z,
      );
      if (
        !shouldEmitBotObjectiveCue({
          cue,
          active: status === 'active',
          sourceAlive,
          listenerAlive: playerAlive,
          distance,
          nowMs: simulationNowMs,
          nextCueAtMs: nextBotObjectiveCueAtMs,
        })
      )
        return;
      const positionalCue = getPositionalAudioCue(
        source.x,
        source.z,
        player.position.x,
        player.position.z,
        player.yaw,
        OBJECTIVE_ACTION_HEARING_RADIUS,
      );
      if (!positionalCue) return;
      if (cue.endsWith('-start'))
        nextBotObjectiveCueAtMs =
          simulationNowMs + OBJECTIVE_ACTION_SHARED_COOLDOWN_MS;
      playObjectiveActionCue(cue, positionalCue);
    };

    const playExplosionSound = (kind: 'frag' | 'bomb' = 'frag') => {
      audioContext ??= new AudioContext();
      if (audioContext.state === 'suspended') void audioContext.resume();
      const duration = 0.42;
      const buffer = getInteractionBuffer(`${kind}.detonate`, duration);
      const source = audioContext.createBufferSource();
      const filter = audioContext.createBiquadFilter();
      const gain = audioContext.createGain();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(620, audioContext.currentTime);
      filter.frequency.exponentialRampToValueAtTime(
        90,
        audioContext.currentTime + duration,
      );
      gain.gain.value = 0.7 * engineSettingsRef.current.volume;
      source.buffer = buffer;
      source.connect(filter).connect(gain).connect(audioContext.destination);
      source.start();
    };

    const playSmokePop = () => {
      audioContext ??= new AudioContext();
      if (audioContext.state === 'suspended') void audioContext.resume();
      const duration = 0.16;
      const buffer = getInteractionBuffer('smoke.detonate', duration);
      const source = audioContext.createBufferSource();
      const filter = audioContext.createBiquadFilter();
      const gain = audioContext.createGain();
      filter.type = 'bandpass';
      filter.frequency.value = 420;
      filter.Q.value = 0.55;
      gain.gain.value = 0.24 * engineSettingsRef.current.volume;
      source.buffer = buffer;
      source.connect(filter).connect(gain).connect(audioContext.destination);
      source.start();
    };

    const playFlashbangSound = () => {
      if (engineSettingsRef.current.volume <= 0) return;
      audioContext ??= new AudioContext();
      if (audioContext.state === 'suspended') void audioContext.resume();
      const now = audioContext.currentTime;
      const duration = 0.18;
      const buffer = getInteractionBuffer('flash.detonate', duration);
      const crack = audioContext.createBufferSource();
      const crackFilter = audioContext.createBiquadFilter();
      const crackGain = audioContext.createGain();
      crack.buffer = buffer;
      crackFilter.type = 'highpass';
      crackFilter.frequency.value = 1200;
      crackGain.gain.setValueAtTime(
        0.42 * engineSettingsRef.current.volume,
        now,
      );
      crackGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      crack
        .connect(crackFilter)
        .connect(crackGain)
        .connect(audioContext.destination);
      crack.start(now);

      const ring = audioContext.createOscillator();
      const ringGain = audioContext.createGain();
      ring.type = 'sine';
      ring.frequency.setValueAtTime(3600, now);
      ring.frequency.exponentialRampToValueAtTime(2300, now + 1.35);
      ringGain.gain.setValueAtTime(
        0.12 * engineSettingsRef.current.volume,
        now,
      );
      ringGain.gain.exponentialRampToValueAtTime(0.001, now + 1.35);
      ring.connect(ringGain).connect(audioContext.destination);
      ring.start(now);
      ring.stop(now + 1.36);
    };

    const playFootstep = (
      walking: boolean,
      positionalCue: { pan: number; gain: number } | null = null,
    ) => {
      if (engineSettingsRef.current.volume <= 0) return;
      audioContext ??= new AudioContext();
      if (audioContext.state === 'suspended') void audioContext.resume();
      const duration = 0.035;
      const buffer = audioContext.createBuffer(
        1,
        audioContext.sampleRate * duration,
        audioContext.sampleRate,
      );
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      const source = audioContext.createBufferSource();
      const filter = audioContext.createBiquadFilter();
      const panner = audioContext.createStereoPanner();
      const gain = audioContext.createGain();
      filter.type = 'lowpass';
      filter.frequency.value = 360;
      panner.pan.value = positionalCue?.pan ?? 0;
      gain.gain.value =
        (walking ? 0.025 : 0.06) *
        (positionalCue?.gain ?? 1) *
        engineSettingsRef.current.volume;
      source.buffer = buffer;
      source
        .connect(filter)
        .connect(panner)
        .connect(gain)
        .connect(audioContext.destination);
      source.start();
    };

    const playLandingCue = () => {
      const volume = engineSettingsRef.current.volume;
      if (volume <= 0) return;
      audioContext ??= new AudioContext();
      if (audioContext.state === 'suspended') void audioContext.resume();
      landingCueBuffer ??= createSeededNoiseBuffer(0.07, 0x6d2b79f5);
      const now = audioContext.currentTime;
      const source = audioContext.createBufferSource();
      const filter = audioContext.createBiquadFilter();
      const gain = audioContext.createGain();
      source.buffer = landingCueBuffer;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, now);
      gain.gain.setValueAtTime(0.055 * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      source.connect(filter).connect(gain).connect(audioContext.destination);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
      source.start(now);
      source.stop(now + 0.07);
    };

    const emitNextBotFootstep = () => {
      if (status !== 'active' || !playerAlive || bots.length === 0) return;
      for (let offset = 0; offset < bots.length; offset += 1) {
        const candidateIndex = (botFootstepCursor + offset) % bots.length;
        const bot = bots[candidateIndex];
        const distance = Math.hypot(
          bot.root.position.x - player.position.x,
          bot.root.position.z - player.position.z,
        );
        if (
          !bot.grounded || !shouldEmitBotFootstep({
            sourceAlive: bot.alive,
            listenerAlive: playerAlive,
            speed: bot.movementSpeed,
            distance,
            nowMs: simulationNowMs,
            botNextAtMs: bot.nextFootstepAtMs,
            sharedNextAtMs: nextAudibleBotFootstepAtMs,
          })
        )
          continue;
        const cue = getPositionalAudioCue(
          bot.root.position.x,
          bot.root.position.z,
          player.position.x,
          player.position.z,
          player.yaw,
          BOT_FOOTSTEP_HEARING_RADIUS,
        );
        if (!cue) continue;
        bot.nextFootstepAtMs =
          simulationNowMs + getBotFootstepCadenceMs(bot.movementSpeed);
        nextAudibleBotFootstepAtMs =
          simulationNowMs + BOT_FOOTSTEP_SHARED_COOLDOWN_MS;
        botFootstepCursor = (candidateIndex + 1) % bots.length;
        playFootstep(false, cue);
        return;
      }
    };

    const playerCollisionWorld: PlayerCollisionWorld = {
      boxes: colliders.map(({ box }) => box),
      ramps: DUST2_MAP.ramps,
      floorHeight: 0,
      actorBlocks: (x, feet, z, height) => bots.some(enemy =>
        enemy.alive && feet < enemy.root.position.y + PLAYER_HULL.standingHeight &&
        feet + height > enemy.root.position.y &&
        Math.hypot(enemy.root.position.x - x, enemy.root.position.z - z) < 0.82),
    };

    const movementEventTime = () => simulationTickActive ? simulationNowMs / 1000 :
      simulationClock.getTimeSeconds() + simulationClock.getAlpha() * 0.01 +
      Math.max(0, Math.min(0.05, (performance.now() - lastFrame) / 1000));
    const enqueueMovementControls = (atSeconds = movementEventTime(), codes: ReadonlySet<string> = keys) => {
      if (!playerAlive || status !== 'active' || simulationNowMs < freezeEnds) return;
      playerInput.controls(atSeconds, {
        strafe: Number(codes.has('KeyD')) - Number(codes.has('KeyA')),
        forward: Number(codes.has('KeyW')) - Number(codes.has('KeyS')),
        yaw: player.yaw,
        walking: keys.has('ShiftLeft') || keys.has('ShiftRight'),
        crouching: keys.has('ControlLeft') || keys.has('ControlRight'),
      });
    };

    const grenadeCollides = (x: number, y: number, z: number) =>
      colliders.some(
        ({ box }) =>
          x + 0.14 > box.min.x &&
          x - 0.14 < box.max.x &&
          y + 0.14 > box.min.y &&
          y - 0.14 < box.max.y &&
          z + 0.14 > box.min.z &&
          z - 0.14 < box.max.z,
      );

    const staticWorldCollides = (x: number, z: number, _radius = 0.38) =>
      hullGeometryBlocked(playerCollisionWorld, x, getMapGroundHeight(x, z), z, PLAYER_HULL.standingHeight);

    const getBotCollisionWorld = (bot: Enemy): PlayerCollisionWorld => ({
      boxes: playerCollisionWorld.boxes, ramps: playerCollisionWorld.ramps, floorHeight: playerCollisionWorld.floorHeight,
      actorBlocks: (x, feet, z, height) => bots.some(other => other !== bot && other.alive &&
        feet < other.root.position.y + PLAYER_HULL.standingHeight && feet + height > other.root.position.y &&
        Math.hypot(other.root.position.x - x, other.root.position.z - z) < 0.82) ||
        (playerAlive && feet < player.position.y - PLAYER_HULL.eyeHeight +
          (player.crouched ? PLAYER_HULL.crouchedHeight : PLAYER_HULL.standingHeight) &&
          feet + height > player.position.y - PLAYER_HULL.eyeHeight &&
          Math.hypot(player.position.x - x, player.position.z - z) < 0.82),
    });

    const probeBotMotion = (bot: Enemy, velocity: { x: number; z: number }, dt: number) =>
      stepCharacterMotion({ x: bot.root.position.x, feet: bot.root.position.y, z: bot.root.position.z,
        velocity, verticalVelocity: bot.verticalVelocity, grounded: bot.grounded },
      PLAYER_HULL.standingHeight, getBotCollisionWorld(bot), dt);

    const writeBotLocomotionVelocity = (
      enemy: Enemy,
      velocity: { x: number; z: number },
      dt: number,
    ) => {
      const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 0;
      enemy.lastAccelerationX = safeDt
        ? (velocity.x - enemy.locomotionVelocityX) / safeDt
        : 0;
      enemy.lastAccelerationZ = safeDt
        ? (velocity.z - enemy.locomotionVelocityZ) / safeDt
        : 0;
      enemy.locomotionVelocityX = velocity.x;
      enemy.locomotionVelocityZ = velocity.z;
      enemy.movementSpeed = Math.hypot(velocity.x, velocity.z);
    };

    const commitBotMotion = (
      enemy: Enemy, motion: ReturnType<typeof stepCharacterMotion>, dt: number,
    ) => {
      if (enemy.motionResolvedThisTick) return 0;
      enemy.motionResolvedThisTick = true;
      const startX = enemy.root.position.x;
      const startZ = enemy.root.position.z;
      enemy.root.position.set(motion.x, motion.feet, motion.z);
      enemy.verticalVelocity = motion.verticalVelocity;
      enemy.grounded = motion.grounded;
      writeBotLocomotionVelocity(enemy, motion.velocity, dt);
      commitBotFallDamage(enemy, motion.impactDownwardSpeed);
      const movedDistance = Math.hypot(motion.x - startX, motion.z - startZ);
      if (movedDistance >= 0.001 && Math.hypot(motion.velocity.x, motion.velocity.z) > 0.001) {
        enemy.bodyYaw = stepBotBodyYaw(enemy.bodyYaw,
          Math.atan2(motion.velocity.x, motion.velocity.z) + Math.PI, dt);
        enemy.root.rotation.y = enemy.bodyYaw;
      }
      return movedDistance;
    };

    const applyBotLocomotionDisplacement = (enemy: Enemy, velocity: { x: number; z: number }, dt: number) =>
      commitBotMotion(enemy, probeBotMotion(enemy, velocity, dt), dt);

    const stepBotAimYaw = (bot: Enemy, targetYaw: number, dt: number) => {
      bot.aimYaw = stepBotBodyYaw(bot.aimYaw, targetYaw, dt, 18, 14);
    };

    const botNavigation = new WeakMap<Enemy, {
      goal: [number, number]; points: Array<[number, number]>; expires: number;
    }>();
    const moveEnemyToward = (
      enemy: Enemy,
      target: THREE.Vector2,
      speed: number,
      dt: number,
    ) => {
      if (enemy.motionResolvedThisTick) return Math.hypot(target.x - enemy.root.position.x, target.y - enemy.root.position.z);
      enemy.locomotionCommanded = true;
      const startX = enemy.root.position.x;
      const startZ = enemy.root.position.z;
      let navigation = botNavigation.get(enemy);
      if (!navigation || Math.hypot(target.x - navigation.goal[0], target.y - navigation.goal[1]) > 1 ||
          simulationNowMs >= navigation.expires) {
        navigation = { goal: [target.x, target.y],
          points: getMapNavigationPath([startX, startZ], [target.x, target.y]),
          expires: simulationNowMs + 1500 };
        botNavigation.set(enemy, navigation);
      }
      while (navigation.points.length > 1 && Math.hypot(navigation.points[0][0] - startX, navigation.points[0][1] - startZ) < 0.35) {
        navigation.points.shift();
      }
      const waypoint = navigation.points[0];
      const delta = waypoint ? new THREE.Vector2(waypoint[0] - startX, waypoint[1] - startZ) : new THREE.Vector2();
      const distance = waypoint ? delta.length() : Math.hypot(target.x - startX, target.y - startZ);
      if (
        !waypoint || isAtBotWaypoint(
          { x: enemy.root.position.x, z: enemy.root.position.z },
          { x: target.x, z: target.y },
          0.01,
        )
      ) {
        const braking = stepBotGroundVelocity({
          weapon: enemy.primaryWeapon, scoped: enemy.special.snapshot().zoom !== 0, grounded: enemy.grounded,
          velocity: {
            x: enemy.locomotionVelocityX,
            z: enemy.locomotionVelocityZ,
          },
          desiredVelocity: { x: 0, z: 0 },
          dtSeconds: dt,
        });
        applyBotLocomotionDisplacement(enemy, braking.velocity, dt);
        if (!enemy.alive) return Number.POSITIVE_INFINITY;
        return distance;
      }
      const directions = getBotMovementDirections({
        deltaX: delta.x,
        deltaZ: delta.y,
        blockedSeconds: enemy.blockedSeconds,
        botId: enemy.id,
        waypointIndex: enemy.waypointIndex,
      });
      let acceptedMotion: ReturnType<typeof stepCharacterMotion> | null = null;
      for (const direction of directions) {
        const desiredVelocity = {
          x: direction.x * speed,
          z: direction.z * speed,
        };
        const movement = stepBotGroundVelocity({
          weapon: enemy.primaryWeapon, scoped: enemy.special.snapshot().zoom !== 0, grounded: enemy.grounded,
          velocity: {
            x: enemy.locomotionVelocityX,
            z: enemy.locomotionVelocityZ,
          },
          desiredVelocity,
          dtSeconds: dt,
        });
        const motion = probeBotMotion(enemy, movement.velocity, dt);
        if (Math.hypot(motion.x - startX, motion.z - startZ) >= 0.001) {
          acceptedMotion = motion;
          break;
        }
      }
      if (!acceptedMotion) {
        const braking = stepBotGroundVelocity({
          weapon: enemy.primaryWeapon, scoped: enemy.special.snapshot().zoom !== 0, grounded: enemy.grounded,
          velocity: { x: enemy.locomotionVelocityX, z: enemy.locomotionVelocityZ },
          desiredVelocity: { x: 0, z: 0 }, dtSeconds: dt,
        });
        acceptedMotion = probeBotMotion(enemy, braking.velocity, dt);
      }
      commitBotMotion(enemy, acceptedMotion, dt);
      if (!enemy.alive) return Number.POSITIVE_INFINITY;
      const movedDistance = Math.hypot(
        enemy.root.position.x - startX,
        enemy.root.position.z - startZ,
      );
      enemy.blockedSeconds = advanceBotBlockedSeconds(
        enemy.blockedSeconds,
        movedDistance,
        dt,
      );
      if (movedDistance < 0.001) enemy.movementDecisionTimer = 0;
      return Math.hypot(
        target.x - enemy.root.position.x,
        target.y - enemy.root.position.z,
      );
    };

    const getBallisticPose = (): BallisticPose => ({
      speed: Math.hypot(player.velocity.x, player.velocity.z),
      crouching: player.crouched, grounded: player.grounded, scoped: player.scoped,
      silenced: weaponSpecial.isSilenced(player.activeWeapon), burst: weaponSpecial.snapshot().burst,
    });
    const getCurrentSpread = () => isFirearmKind(player.activeWeapon)
      ? weaponBallistics.spread(player.activeWeapon, getBallisticPose()) : 0;
    const applyPlayerAim = () => {
      const punch = weaponBallistics.aim();
      camera.rotation.set(THREE.MathUtils.clamp(player.pitch + punch.pitch,
        -Math.PI / 2 + .08, Math.PI / 2 - .08), player.yaw + punch.yaw, 0);
      camera.updateMatrixWorld(true);
    };

    const getCurrentBuyBlockReason = () =>
      getBuyBlockReason({
        side: matchState.playerSide,
        x: player.position.x,
        z: player.position.z,
        roundSeconds,
        active: status === 'active',
        alive: playerAlive,
      });

    const getBuyBlockMessage = (reason: BuyBlockReason) => {
      if (reason === 'outside-buy-zone') return 'RETURN TO SPAWN TO BUY';
      if (reason === 'buy-period-ended') return 'BUY PERIOD HAS ENDED';
      if (reason === 'player-dead') return 'REQUISITIONS UNAVAILABLE';
      return 'ROUND IS NOT ACTIVE';
    };

    const showDamageFeedback = (sourcePosition: THREE.Vector3) => {
      setDamageDirection(
        getDamageDirection(
          sourcePosition.x,
          sourcePosition.z,
          player.position.x,
          player.position.z,
          player.yaw,
        ),
      );
      setDamageFlash(true);
      if (damageFeedbackTimer !== null) {
        window.clearTimeout(damageFeedbackTimer);
        cleanupTimers.delete(damageFeedbackTimer);
      }
      const damageTimer = window.setTimeout(() => {
        setDamageFlash(false);
        setDamageDirection('');
        damageFeedbackTimer = null;
        cleanupTimers.delete(damageTimer);
      }, 240);
      damageFeedbackTimer = damageTimer;
      cleanupTimers.add(damageTimer);
    };

    const publishHud = (now = performance.now()) => {
      // Passing zero forces important one-off state (kills and round endings)
      // through the normal 90 ms HUD throttle.
      if (now !== 0 && now - lastHudUpdate < 90) return;
      lastHudUpdate = now;
      const firearm = isFirearmKind(player.activeWeapon)
        ? FIREARMS[player.activeWeapon]
        : null;
      const firearmAmmo = isFirearmKind(player.activeWeapon)
        ? player.ammo[player.activeWeapon]
        : null;
      const sideScores = getSideScores(
        matchState.scores,
        matchState.playerSide,
      );
      const freezeSeconds = Math.max(0, (freezeEnds - simulationNowMs) / 1000);
      const canRecoverBomb = canPlayerPickupBomb({
        active: status === 'active',
        alive: playerAlive,
        playerSide: matchState.playerSide,
        bombState,
        playerHasBomb,
        distance: Math.hypot(
          bomb.position.x - player.position.x,
          bomb.position.z - player.position.z,
        ),
      });
      const bombDropAvailable = canPlayerDropBomb({
        active: status === 'active',
        alive: playerAlive,
        playerSide: matchState.playerSide,
        bombState,
        playerHasBomb,
        buyOpen: buyMenuOpen,
      });
      const canDropBomb = player.activeWeapon === 'bomb' && bombDropAvailable;
      const nearbyDrop =
        !playerAlive ||
        canDefuse ||
        canPlant ||
        canRecoverBomb ||
        bombState === 'planting'
          ? null
          : getNearbyDroppedFirearm();
      const flashRemaining = Math.max(
        0,
        (playerBlindUntilMs - simulationNowMs) / 1000,
      );
      const livingAllyCount = allies.filter((ally) => ally.alive).length;
      const deathCameraComplete =
        !playerAlive &&
        playerDeathCamera !== null &&
        shouldUseSpectatorOrbit(playerAlive, playerDeathCamera.elapsedSeconds);
      if (keyboardPlaytestInputEnabled) {
        renderer.domElement.dataset.botEconomy = JSON.stringify(
          bots.map(bot => ({ id: bot.id, team: bot.team, side: bot.side, alive: bot.alive, ...readBotInventory(bot) })),
        );
        renderer.domElement.dataset.botWeaponModes = JSON.stringify(bots.map(bot => ({
          id: bot.id, team: bot.team, alive: bot.alive, weapon: bot.primaryWeapon,
          ...bot.special.snapshot(), ready: bot.special.ready(bot.primaryWeapon, simulationNowMs),
          silencerVisible: (bot.primaryWeapon === 'usp' || bot.primaryWeapon === 'carbine') &&
            bot.silencerModels[bot.primaryWeapon].visible,
        })));
      }
      setHud({
        health: Math.max(0, Math.ceil(player.health)),
        armor: Math.max(0, Math.ceil(player.armor)),
        helmet: player.helmet,
        ammo:
          firearmAmmo?.magazine ??
          (player.activeWeapon === 'grenade'
            ? player.grenades
            : player.activeWeapon === 'smoke'
              ? player.smokes
              : player.activeWeapon === 'flash'
                ? player.flashes
                : 0),
        reserve: firearmAmmo?.reserve ?? 0,
        money: player.money,
        seconds: roundSeconds,
        enemies: enemies.filter((enemy) => enemy.alive).length,
        allies: livingAllyCount,
        friendlyAlive: (playerAlive ? 1 : 0) + livingAllyCount,
        status,
        ctScore: sideScores.ct,
        tScore: sideScores.t,
        message,
        radioCallout:
          playerAlive && simulationNowMs < radioCalloutUntilMs
            ? radioCalloutText
            : null,
        canCallBackup: canIssueBackupCall({
          active:
            status === 'active' &&
            (document.pointerLockElement === renderer.domElement ||
              touchPlaying),
          playerAlive,
          freezeSeconds,
          nowMs: simulationNowMs,
          nextCallAtMs: nextBackupCallAtMs,
          livingAllyCount,
        }),
        roundTransition,
        completedRoundReceipt,
        killFeed,
        radarContacts: bots.filter(bot => shouldShowRadarContact(bot)).map(bot => ({
          id: `${bot.team}-${bot.id}`, team: bot.team,
          x: bot.root.position.x, z: bot.root.position.z, hasBomb: bot === bombCarrier,
        })),
        radarPlayer: {
          x: player.position.x,
          z: player.position.z,
          yaw: player.yaw,
        },
        bombPlanted: bombState === 'planted',
        canDefuse,
        defuseProgress,
        hasDefuseKit: player.hasDefuseKit,
        buyTime: Math.min(
          BUY_DURATION_SECONDS,
          Math.max(0, roundSeconds - BUY_CUTOFF_SECONDS),
        ),
        buyBlockReason: getCurrentBuyBlockReason(),
        weaponName:
          firearm?.label ??
          (player.activeWeapon === 'grenade'
            ? 'FRAG GRENADE'
            : player.activeWeapon === 'smoke'
              ? 'SMOKE GRENADE'
              : player.activeWeapon === 'flash'
                ? 'FLASHBANG'
                : player.activeWeapon === 'bomb'
                  ? 'C4 DEVICE'
                  : 'FIELD KNIFE'),
        bombState,
        bombsite: selectedBombsite,
        plantProgress:
          matchState.playerSide === 't'
            ? playerHasBomb
              ? playerPlantProgress
              : (bombCarrier?.plantProgress ?? 0)
            : (bombCarrier?.plantProgress ?? 0),
        spectating:
          !playerAlive && spectatedEnemy
            ? { name: spectatedEnemy.name, team: spectatedEnemy.team }
            : null,
        deathCameraActive:
          !playerAlive &&
          playerDeathCamera !== null &&
          !shouldUseSpectatorOrbit(
            playerAlive,
            playerDeathCamera.elapsedSeconds,
          ),
        canCycleSpectator: canCycleFriendlySpectator({
          active: status === 'active',
          playerAlive,
          deathCameraComplete,
          interactionActive:
            document.pointerLockElement === renderer.domElement || touchPlaying,
          roundResultPending: pendingRoundResult !== null,
          livingAllyCount,
        }),
        canSkipBotRoundWait: canSkipBotRoundWait({
          botMatch: bots.length > 0,
          roundActive: status === 'active',
          playerAlive,
          freezeSeconds,
          alreadyRequested: skipBotRoundRequested,
        }),
        skippingBotRound: skipBotRoundRequested,
        freezeSeconds,
        activeWeapon: player.activeWeapon,
        primaryWeapon: player.primaryWeapon,
        secondaryWeapon: player.secondaryWeapon,
        magazineSize: firearm?.magazineSize ?? 0,
        ammoDisplay: firearm
          ? 'firearm'
          : player.activeWeapon === 'knife'
            ? 'melee'
            : player.activeWeapon === 'bomb'
              ? 'objective'
              : 'throwable',
        crosshairGap: getCrosshairGap(getCurrentSpread()),
        playerKills,
        playerDeaths,
        playerAlive,
        enemyRoster: enemies.map((enemy) => ({
          id: enemy.id,
          name: enemy.name,
          alive: enemy.alive,
          kills: enemy.kills,
          deaths: enemy.deaths,
          hasBomb: enemy === bombCarrier,
        })),
        allyRoster: allies.map((ally) => ({
          id: ally.id,
          name: ally.name,
          alive: ally.alive,
          kills: ally.kills,
          deaths: ally.deaths,
          hasBomb: ally === bombCarrier,
        })),
        grenades: player.grenades,
        smokes: player.smokes,
        flashes: player.flashes,
        flashOpacity: getFlashOverlayOpacity(
          flashRemaining,
          playerBlindDurationSeconds,
        ),
        scoped: player.scoped,
        canScope:
          playerAlive &&
          status === 'active' &&
          simulationNowMs >= freezeEnds &&
          isWeaponReady(simulationNowMs, player.equipReadyAtMs) &&
          !player.reload &&
          !buyMenuOpen &&
          !isSniperBoltCycling(
            player.activeWeapon,
            simulationNowMs,
            lastSniperShotAt,
          ) &&
          canScopeWeapon(player.activeWeapon),
        canDropBomb,
        canDropWeapon: canDropFirearm({
          active: status === 'active',
          alive: playerAlive,
          activeWeapon: player.activeWeapon,
          currentPrimary: player.primaryWeapon,
          currentSecondary: player.secondaryWeapon,
          reloading: player.reload !== null,
          buyOpen: buyMenuOpen,
        }),
        canRecoverBomb,
        nearbyFirearm: nearbyDrop
          ? {
              kind: nearbyDrop.kind,
              magazine: nearbyDrop.ammo.magazine,
              reserve: nearbyDrop.ammo.reserve,
            }
          : null,
        roundNumber: getDisplayedRoundNumber(
          sideScores.ct,
          sideScores.t,
          status === 'briefing' || status === 'active',
        ),
        roundPhase: getMatchRoundPhase(
          matchState.scores,
          status === 'briefing' || status === 'active',
        ),
        playerSide: matchState.playerSide,
        playerHasBomb,
        canPlant,
        enemyDefuseProgress,
        reloading: player.reload !== null,
        reloadProgress: player.reload
          ? getReloadProgress(
              player.reload.startedAt,
              player.reload.completesAt,
              simulationNowMs,
            )
          : 0,
        reloadWeaponName: player.reload
          ? FIREARMS[player.reload.weapon].label
          : null,
      });
    };

    const setScope = (requested: boolean, announce = true) => {
      const nextScoped =
        requested &&
        status === 'active' &&
        playerAlive &&
        simulationNowMs >= freezeEnds &&
        isWeaponReady(simulationNowMs, player.equipReadyAtMs) &&
        !player.reload &&
        !buyMenuOpen &&
        player.activeWeapon === 'sniper' &&
        !isSniperBoltCycling(
          player.activeWeapon,
          simulationNowMs,
          lastSniperShotAt,
        ) &&
        canScopeWeapon(player.activeWeapon);

      player.scoped = nextScoped;
      camera.fov = nextScoped && weaponSpecial.snapshot().zoom === 2 ? 10 : getWeaponFieldOfView(player.activeWeapon, nextScoped);
      camera.updateProjectionMatrix();
      syncPresentationCamera();
      showWeaponView(nextScoped ? null : player.activeWeapon);
      if (announce)
        message = nextScoped ? `AWP ZOOM ${weaponSpecial.snapshot().zoom === 2 ? '10' : '40'}` : 'AWP SCOPE RELEASED';
      publishHud(0);
    };

    const queueGameplayAction = (action: GameplayAction) => {
      if (status !== 'active' || !playerAlive ||
        !(document.pointerLockElement === renderer.domElement || touchPlaying)) return;
      gameplayActions.enqueue(action, movementEventTime());
    };
    const toggleScope = () => queueGameplayAction('secondary');
    const beginReload = () => queueGameplayAction('reload');

    const commitSecondary = () => {
      if (!playerAlive || status !== 'active' || simulationNowMs < freezeEnds ||
        !(document.pointerLockElement === renderer.domElement || touchPlaying) ||
        buyMenuOpen || player.reload || !isWeaponReady(simulationNowMs, player.equipReadyAtMs)) return;
      if (player.activeWeapon === 'knife') { shoot(false, true); return; }
      if (!weaponSpecial.secondary(player.activeWeapon, simulationNowMs)) return;
      const state = weaponSpecial.snapshot();
      syncSilencerVisuals();
      if (player.activeWeapon === 'sniper') setScope(state.zoom !== 0);
      else if (player.activeWeapon === 'glock18') message = state.burst ? 'BURST-FIRE MODE' : 'SEMI-AUTOMATIC MODE';
      else message = weaponSpecial.isSilenced(player.activeWeapon) ? 'ATTACHING SILENCER' : 'REMOVING SILENCER';
      publishHud(0);
    };

    const getDefaultCombatMessage = () =>
      matchState.playerSide === 'ct'
        ? 'ELIMINATE THE TERRORISTS'
        : 'TAKE THE DEVICE TO A OR B';

    const resetSniperBoltCycle = () => {
      lastSniperShotAt = Number.NEGATIVE_INFINITY;
      resetPrimaryActionParts(weaponViews.sniper);
    };

    const applyPrimaryActionParts = (
      kind: PrimaryWeaponKind,
      elapsedMs: number,
    ) => {
      const view = weaponViews[kind];
      resetPrimaryActionParts(view);
      if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return;
      if (kind === 'shotgun') {
        const pump = view.actionParts?.shotgunPump;
        if (!pump) return;
        const pumpProgress = THREE.MathUtils.clamp(
          elapsedMs / FIREARMS.shotgun.fireIntervalMs,
          0,
          1,
        );
        pump.object.position.z += Math.sin(pumpProgress * Math.PI) * 0.19;
        return;
      }
      if (kind === 'sniper') {
        const bolt = view.actionParts?.sniperBolt;
        if (!bolt) return;
        writeSniperBoltCyclePose(elapsedMs, sniperBoltCyclePose);
        bolt.object.position.z += sniperBoltCyclePose.positionZ;
        bolt.object.rotation.z += sniperBoltCyclePose.rotationZ;
      }
    };

    const applyWeaponReloadVisualPose = (
      view: WeaponView,
      weapon: FirearmKind,
      progress: number,
    ) => {
      if (view.authoredAnimation) return;
      writeWeaponReloadPose(weapon, progress, reloadPose);
      view.root.position.x += reloadPose.positionX;
      view.root.position.y += reloadPose.positionY;
      view.root.position.z += reloadPose.positionZ;
      view.root.rotation.x += reloadPose.rotationX;
      view.root.rotation.y += reloadPose.rotationY;
      view.root.rotation.z += reloadPose.rotationZ;
      applySecondaryReloadActionParts(view.secondaryActionParts, progress);
    };

    const removeRenderedReloadPose = () => {
      const activeView = weaponViews[player.activeWeapon];
      resetSecondaryReloadActionParts(activeView.secondaryActionParts);
      activeView.root.position.x -= reloadPose.positionX;
      activeView.root.position.y -= reloadPose.positionY;
      activeView.root.position.z -= reloadPose.positionZ;
      activeView.root.rotation.x -= reloadPose.rotationX;
      activeView.root.rotation.y -= reloadPose.rotationY;
      activeView.root.rotation.z -= reloadPose.rotationZ;
      writeWeaponReloadPose(null, 0, reloadPose);
    };

    const applyRenderedReloadPose = () => {
      removeRenderedReloadPose();
      const activeReload =
        player.reload?.weapon === player.activeWeapon ? player.reload : null;
      if (!activeReload) return;
      const activeView = weaponViews[player.activeWeapon];
      applyWeaponReloadVisualPose(
        activeView,
        activeReload.weapon,
        getReloadProgress(
          activeReload.startedAt,
          activeReload.completesAt,
          simulationNowMs,
        ),
      );
    };

    const cancelPlayerReload = (restoreCombatMessage = false) => {
      removeRenderedReloadPose();
      if (!player.reload) return false;
      player.reload = null;
      if (restoreCombatMessage) message = getDefaultCombatMessage();
      return true;
    };

    const resetWeaponViewRootPoses = () => {
      Object.values(weaponViews).forEach((view) => {
        view.root.position.copy(view.basePosition);
        view.root.rotation.copy(view.baseRotation);
        resetSecondaryReloadActionParts(view.secondaryActionParts);
        view.authoredAnimation?.sample({ nowMs: simulationNowMs });
      });
      clearAuthoredShotClocks();
    };

    const endRound = (
      winnerSide: Side,
      reason: string,
      event: RoundEndEvent,
    ) => {
      if (status !== 'active') return;
      objectiveIntel.clear();
      const skipRoundReview = skipBotRoundRequested;
      skipBotRoundRequested = false;
      clearRoundTransition();
      setScope(false, false);
      resetSniperBoltCycle();
      cancelPlayerReload();
      resetWeaponViewRootPoses();
      clearPlayerCasings();
      pendingRoundResult = null;
      clearDroppedFirearms();
      const bankBefore = player.money;
      const winnerTeam = getTeamForSide(matchState.playerSide, winnerSide);
      const playerWon = winnerTeam === 'player';
      matchState = recordRoundWinner(matchState, winnerTeam);
      player.money = settlePlayerRoundMoney({
        currentMoney: player.money,
        playerWon,
        event,
        lossStreak: matchState.lossStreaks.player,
      });
      bots.forEach((bot) => {
        const friendly = bot.team === 'ally';
        bot.money = settlePlayerRoundMoney({
          currentMoney: bot.money, playerWon: friendly ? playerWon : !playerWon,
          event, lossStreak: friendly ? matchState.lossStreaks.player : matchState.lossStreaks.opponent,
        });
      });
      roundTransition = getRoundTransitionBrief({
        matchAfterResult: matchState,
        winnerSide,
        event,
        bankBefore,
        bankAfter: player.money,
      });
      const matchWinner = getMatchWinner(matchState.scores);
      const sideScores = getSideScores(
        matchState.scores,
        matchState.playerSide,
      );
      completedRoundReceipt = {
        roundNumber: getCompletedRounds(matchState.scores),
        reason,
        score: sideScores,
        playerWon,
      };
      if (matchWinner === 'player') {
        status = 'match-won';
        message = `YOUR SQUAD WINS THE MATCH ${sideScores.ct}–${sideScores.t}`;
      } else if (matchWinner === 'opponent') {
        status = 'match-lost';
        message = `OPPONENTS WIN THE MATCH — FINAL ${sideScores.ct}–${sideScores.t}`;
      } else {
        status = playerWon ? 'round-won' : 'round-lost';
        message = reason;
      }
      touchPlaying = false;
      keyboardPlaytestTapLatches = clearKeyboardPlaytestTapLatches();
      firing = false;
      triggerReady = true;
      jumpReady = true;
      dropRequested = false;
      clearSquadRadioState();
      buyMenuOpen = false;
      setLocked(false);
      setBuyOpen(false);
      setScoreboardOpen(false);
      if (document.pointerLockElement === renderer.domElement)
        document.exitPointerLock();
      publishHud(0);
      if (shouldAutoPrepareNextRound(matchWinner)) {
        roundTransitionTimer = window.setTimeout(
          () => {
            roundTransitionTimer = null;
            if (status !== 'round-won' && status !== 'round-lost') return;
            restartRef.current(false, 'round-prepared');
          },
          skipRoundReview ? 0 : ROUND_RESULT_REVIEW_MS,
        );
      }
    };

    const resolveRoundEvent = (event: RoundEndEvent, reason: string) => {
      const winningSide = getRoundWinningSide(event, bombState);
      if (winningSide) endRound(winningSide, reason, event);
      return winningSide;
    };

    const resolveTeamElimination = () => {
      const friendlyAlive =
        (playerAlive ? 1 : 0) + allies.filter((ally) => ally.alive).length;
      const opponentsAlive = enemies.filter((enemy) => enemy.alive).length;
      const event = getTeamEliminationEvent(
        matchState.playerSide,
        friendlyAlive,
        opponentsAlive,
      );
      if (!event) return false;
      const eliminatedSide =
        event === 'ct-eliminated' ? 'CT' : 'T';
      const reason = `${eliminatedSide} SQUAD ELIMINATED`;
      const winner = getRoundWinningSide(event, bombState);
      if (!winner && bombState === 'planted') {
        message = 'BOMB LIVE — ROUND CONTINUES';
        publishHud(0);
        return false;
      }
      if (
        winner &&
        friendlyAlive === 0 &&
        opponentsAlive > 0 &&
        simulationNowMs < spectateEnds
      ) {
        pendingRoundResult = { winnerSide: winner, reason, event };
        message = spectatedEnemy
          ? `SPECTATING ${spectatedEnemy.name.toUpperCase()}`
          : reason;
        publishHud(0);
        return true;
      }
      if (winner) endRound(winner, reason, event);
      return Boolean(winner);
    };

    const attachBombToCarrier = (carrier: Enemy) => {
      objectiveIntel.clear();
      bombCarrier = carrier;
      carrier.role = 'carrier';
      carrier.root.add(bomb);
      bomb.position.set(0, 0.92, 0.28);
      bomb.rotation.set(0, 0, 0);
      bomb.visible = true;
      bombState = 'carried';
    };

    const dropBomb = (carrier: Enemy) => {
      if (
        bombCarrier !== carrier ||
        (bombState !== 'carried' && bombState !== 'planting')
      )
        return;
      scene.attach(bomb);
      bomb.position.y = getMapSupportHeight(bomb.position.x, bomb.position.z, bomb.position.y) + 0.12;
      bomb.rotation.set(0, 0, 0);
      objectiveIntel.clear();
      objectiveIntel.emitSound('dropped', bomb.position, simulationNowMs, OBJECTIVE_DROP_HEARING_RADIUS);
      bombState = 'dropped';
      bombCarrier = null;
      carrier.role = 'escort';
      carrier.plantProgress = 0;
      message = 'BOMB DROPPED — HOLD THE DEVICE';
      publishHud(0);
    };

    const equipFirearmAfterBombLoss = () => {
      if (player.activeWeapon !== 'bomb') return;
      const fallback =
        player.secondaryWeapon ?? player.primaryWeapon ?? 'knife';
      player.activeWeapon = fallback;
      player.equipReadyAtMs = simulationNowMs + getWeaponEquipDelay(fallback);
      player.nextShot = Math.max(player.nextShot, player.equipReadyAtMs);
      player.shotPulse = 0;
      firing = false;
      triggerReady = true;
      showWeaponView(fallback);
    };

    const placePlayerBombDrop = (tossForward = false) => {
      scene.attach(bomb);
      const dropDistance = tossForward ? 1.5 : 0;
      const dropX = player.position.x - Math.sin(player.yaw) * dropDistance;
      const dropZ = player.position.z - Math.cos(player.yaw) * dropDistance;
      const canTossForward = tossForward && !staticWorldCollides(dropX, dropZ);
      bomb.position.set(
        canTossForward ? dropX : player.position.x,
        getMapSupportHeight(canTossForward ? dropX : player.position.x, canTossForward ? dropZ : player.position.z, player.position.y) + 0.12,
        canTossForward ? dropZ : player.position.z,
      );
      bomb.rotation.set(0, 0, 0);
      bomb.visible = true;
      objectiveIntel.clear();
      objectiveIntel.emitSound('dropped', bomb.position, simulationNowMs, OBJECTIVE_DROP_HEARING_RADIUS);
      bombState = 'dropped';
      bombCarrier = null;
      playerHasBomb = false;
      playerPlantProgress = 0;
      plantingSite = null;
      canPlant = false;
      equipFirearmAfterBombLoss();
    };

    const dropPlayerBomb = () => {
      if (
        !canPlayerDropBomb({
          active: status === 'active',
          alive: playerAlive,
          playerSide: matchState.playerSide,
          bombState,
          playerHasBomb,
          buyOpen: buyMenuOpen,
        })
      )
        return false;
      placePlayerBombDrop(true);
      message = 'C4 DROPPED — SQUADMATE CAN RECOVER';
      publishHud(0);
      return true;
    };

    const commitPlant = (site: BombsiteName) => {
      const planterId = bombCarrier ? objectiveBotId(bombCarrier) : 'player';
      selectedBombsite = site;
      const [siteX, siteZ] = BOMBSITES[site];
      if (bombCarrier) {
        bombCarrier.plantProgress = 1;
        bombCarrier.role = 'escort';
      }
      scene.attach(bomb);
      bomb.position.set(siteX, getMapGroundHeight(siteX, siteZ) + 0.12, siteZ);
      bomb.rotation.set(0, 0, 0);
      bombState = 'planted';
      bombCarrier = null;
      playerHasBomb = false;
      playerPlantProgress = 0;
      plantingSite = null;
      canPlant = false;
      equipFirearmAfterBombLoss();
      enemyDefuser = null;
      enemyDefuseProgress = 0;
      objectiveIntel.clear();
      objectiveIntel.report({ observerId: planterId, kind: 'planted',
        position: bomb.position, source: 'own', observedAtMs: simulationNowMs });
      roundSeconds = 35;
      message = `BOMB PLANTED AT ${site}`;
      nextBombBeep = simulationNowMs;
      publishHud(0);
    };

    const finishBotPlant = () => {
      if (!bombCarrier) return;
      emitBotObjectiveActionCue(
        'plant-complete',
        bombCarrier.root.position,
        bombCarrier.alive,
      );
      bombCarrier.money = addMoney(bombCarrier.money, OBJECTIVE_REWARDS.plant);
      commitPlant(selectedBombsite);
    };

    const finishPlayerPlant = (site: BombsiteName) => {
      if (matchState.playerSide !== 't' || !playerHasBomb) return;
      playObjectiveActionCue('plant-complete');
      player.money = addMoney(player.money, OBJECTIVE_REWARDS.plant);
      commitPlant(site);
    };

    // Both actors reach this completion only after their normal progress/range
    // checks. Keeping the award and terminal state together also guards repeats.
    const completePlantedBombDefuse = (defuser: Enemy | null) => {
      if (status !== 'active' || bombState !== 'planted') return;
      objectiveIntel.clear();
      bombState = 'defused';
      bomb.visible = false;
      if (defuser) defuser.money = addMoney(defuser.money, OBJECTIVE_REWARDS.defuse);
      else player.money = addMoney(player.money, OBJECTIVE_REWARDS.defuse);
      resolveRoundEvent('bomb-defused', 'BOMB DEFUSED — COUNTER-TERRORISTS WIN');
    };

    const resetRound = (newMatch = false) => {
      simulationClock.resetDebt();
      gameplayActions.clear();
      fallLandingCounts.clear();
      fallDamageReceipts = [];
      controlledFallFixture = null;
      weaponSpecial.reset();
      syncSilencerVisuals();
      clearRoundTransition();
      skipBotRoundRequested = false;
      roundBotDifficulty = engineSettingsRef.current.difficulty;
      roundTransition = null;
      keys.clear();
      keyboardPlaytestTapLatches = clearKeyboardPlaytestTapLatches();
      if (newMatch) {
        matchState = createMatchState(startingPlayerSide);
        playerKills = 0;
        playerDeaths = 0;
        player.money = 800;
        playerAlive = false;
        bots.forEach((enemy) => {
          enemy.kills = 0;
          enemy.deaths = 0;
        });
      }
      const prepared = prepareNextRound(matchState);
      matchState = prepared.match;
      const matchTransition = prepared.transition;
      const economyReset = prepared.economyReset;
      if (prepared.startingMoney !== null)
        player.money = prepared.startingMoney;
      const keepLoadout =
        !newMatch &&
        !economyReset &&
        shouldRetainLoadout(playerAlive && player.health > 0);
      const retainedArmor = keepLoadout ? player.armor : 0;
      const retainedHelmet = keepLoadout && player.armor > 0 && player.helmet;
      const retainedPrimary = keepLoadout ? player.primaryWeapon : null;
      const retainedPrimaryAmmo = retainedPrimary
        ? { ...player.ammo[retainedPrimary] }
        : null;
      const retainedSecondary = keepLoadout ? player.secondaryWeapon : null;
      const retainedSecondaryAmmo = retainedSecondary
        ? { ...player.ammo[retainedSecondary] }
        : null;
      const retainedDefuseKit =
        keepLoadout && matchState.playerSide === 'ct' && player.hasDefuseKit;
      const retainedGrenades = keepLoadout ? player.grenades : 0;
      const retainedSmokes = keepLoadout ? player.smokes : 0;
      const retainedFlashes = keepLoadout ? player.flashes : 0;
      clearDroppedFirearms();
      clearPersistentBulletMarks();
      clearPlayerCasings();
      resetSniperBoltCycle();
      clearGrenadeProjectiles();
      explosionEffects.forEach(({ mesh, light }) => {
        scene.remove(mesh, light);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      explosionEffects.clear();
      smokeClouds.forEach(({ group, geometry, material }) => {
        scene.remove(group);
        geometry.dispose();
        material.dispose();
      });
      smokeClouds.clear();
      const [spawnX, spawnZ] = PLAYER_SPAWNS[matchState.playerSide];
      playerMovement.reset();
      playerInput.reset();
      movementNeedsSeed = true;
      playerInterpolationOffset.set(0, 0, 0);
      player.position.set(spawnX, getMapGroundHeight(spawnX, spawnZ) + PLAYER_HULL.eyeHeight, spawnZ);
      player.velocity.set(0, 0, 0);
      player.yaw = matchState.playerSide === 'ct' ? Math.PI : 0;
      player.pitch = 0;
      player.health = 100;
      player.armor = retainedArmor;
      player.helmet = retainedHelmet;
      (Object.keys(FIREARMS) as FirearmKind[]).forEach((kind) => {
        player.ammo[kind] = { magazine: 0, reserve: 0 };
      });
      const restoredSecondary = keepLoadout
        ? retainedSecondary
        : getStarterSecondaryForSide(matchState.playerSide);
      if (restoredSecondary)
        player.ammo[restoredSecondary] =
          retainedSecondaryAmmo ??
          createStarterSecondaryAmmo(matchState.playerSide);
      if (retainedPrimary && retainedPrimaryAmmo)
        player.ammo[retainedPrimary] = retainedPrimaryAmmo;
      cancelPlayerReload();
      resetWeaponViewRootPoses();
      player.primaryWeapon = retainedPrimary;
      player.secondaryWeapon = restoredSecondary;
      player.activeWeapon = retainedPrimary ?? restoredSecondary ?? 'knife';
      player.equipReadyAtMs = simulationNowMs;
      player.scoped = false;
      camera.fov = 74;
      camera.updateProjectionMatrix();
      syncPresentationCamera();
      dryFireArmed = true;
      player.recoil = 0;
      player.damageSuppression = 0;
      player.damageTag = 0;
      weaponBallistics.reset();
      spreadRandom = createSeededRandom(1602);
      player.shotPulse = 0;
      player.shotSide = 0;
      player.verticalVelocity = 0;
      player.grounded = true;
      player.crouched = false;
      player.crouchOffset = 0;
      player.landingRecoverySeconds = 0;
      player.locomotionPhase = 0;
      resetPlayerPresentation();
      player.hasDefuseKit = retainedDefuseKit;
      player.grenades = retainedGrenades;
      player.smokes = retainedSmokes;
      player.flashes = retainedFlashes;
      playerBlindUntilMs = 0;
      playerBlindDurationSeconds = 0;
      roundSeconds = ROUND_DURATION_SECONDS;
      killFeed = [];
      const roundIndex = getCompletedRounds(matchState.scores);
      const roundPhase = getMatchRoundPhase(matchState.scores, true);
      roundPlan = getRoundPlan(roundIndex, matchState.playerSide);
      selectedBombsite = roundPlan.targetSite;
      bombState = 'carried';
      bombCarrier = null;
      defuseProgress = 0;
      canDefuse = false;
      playerHasBomb =
        matchState.playerSide === 't' && roundPlan.carrier.kind === 'player';
      playerPlantProgress = 0;
      plantingSite = null;
      canPlant = false;
      enemyDefuser = null;
      enemyDefuseProgress = 0;
      nextBombBeep = 0;
      freezeEnds = simulationNowMs + 5000;
      playerAlive = true;
      playerDeathCamera = null;
      spectatorPresentationPosition = null;
      spectatedEnemy = null;
      spectateEnds = 0;
      pendingRoundResult = null;
      nextFootstepAt = 0;
      nextAudibleBotFootstepAtMs = 0;
      nextBodyImpactAtMs = 0;
      nextBotDeathThudAtMs = 0;
      nextBotObjectiveCueAtMs = 0;
      nextOpponentReloadCueAtMs = 0;
      botFootstepCursor = 0;
      squadIntelAge = Number.POSITIVE_INFINITY;
      squadLastKnownPosition.set(0, 0, 0);
      clearFriendlyIntel();
      clearSquadRadioState();
      nextBackupCallAtMs = simulationNowMs;
      backupCallTargets.forEach((target) => target.set(0, 0));
      objectiveIntel.clear();
      botHearing.clear();
      botHearingCursors.clear();
      nextBotHearingStep.clear();
      scene.attach(bomb);
      bomb.visible = false;
      buyMenuOpen = false;
      setBuyOpen(false);
      setScoreboardOpen(false);
      firing = false;
      triggerReady = true;
      jumpReady = true;
      dropRequested = false;
      showWeaponView(player.activeWeapon);
      message =
        matchTransition === 'halftime'
          ? `HALFTIME — YOU ARE ${matchState.playerSide === 'ct' ? 'CT' : 'T'}`
          : matchTransition === 'overtime-halftime'
            ? `${roundPhase.label} HALFTIME — YOU ARE ${matchState.playerSide === 'ct' ? 'CT' : 'T'} · $${player.money.toLocaleString('en-US')} RESET`
            : matchTransition === 'overtime' ||
                matchTransition === 'overtime-restart'
              ? `${roundPhase.label} — $${player.money.toLocaleString('en-US')} RESET`
              : matchState.playerSide === 'ct'
                ? `FREEZE TIME — ${roundPlan.approach.toUpperCase()} ATTACK EXPECTED AT ${selectedBombsite}`
                : `FREEZE TIME — ${roundPlan.approach.toUpperCase()} TAKE TO ${selectedBombsite}`;
      status = 'active';
      enemies.forEach((enemy, index) => {
        const assignment = CT_DEFENDER_ASSIGNMENTS[index];
        const planAssignment = roundPlan.assignments[index];
        const enemySide = getBotSide(matchState.playerSide, 'enemy');
        const [x, z] =
          matchState.playerSide === 'ct'
            ? T_ATTACKER_SPAWNS[index]
            : assignment.spawn;
        botNavigation.delete(enemy);
        enemy.root.position.set(x, getMapGroundHeight(x, z), z);
        enemy.root.visible = true;
        resetBotVisualPose(enemy);
        applyBotInventory(enemy, prepareBotInventory(readBotInventory(enemy), {
          side: enemySide, survived: !newMatch && !economyReset && enemy.alive && enemy.health > 0,
          resetMoney: newMatch ? 800 : prepared.startingMoney,
          roundIndex, rosterRoundIndex: roundIndex, botId: index,
          lossStreak: matchState.lossStreaks.opponent, assignedDefuseKit: assignment.kit,
        }));
        enemy.health = 100;
        enemy.alive = true;
        enemy.profile = ENEMY_COMBAT_PROFILES[index];
        setEnemyPrimaryModel(enemy, enemy.primaryWeapon);
        enemy.fireCooldown = getEnemyFireCooldown(
          enemy.primaryWeapon,
          Math.random(),
        );
        enemy.burstShotsRemaining = 0;
        enemy.movementDecisionTimer = 0.4 + Math.random() * 0.6;
        enemy.combatMovement = 'advance';
        enemy.suppression = 0;
        enemy.blindUntilMs = 0;
        enemy.reloadTimer = 0;
        botReloads.delete(enemy);
        enemy.role =
          matchState.playerSide === 'ct'
            ? planAssignment.role === 'carrier'
              ? 'carrier'
              : planAssignment.role === 'entry'
                ? 'hunter'
                : 'escort'
            : index === 1
              ? 'hunter'
              : 'defender';
        enemy.utility = createBotUtilityState();
        enemy.shots.reset();
        enemy.special.reset();
        syncBotSilencerVisuals(enemy);
        enemy.glockBurst.targetId = null;
        enemy.homeSite = assignment.site;
        enemy.guardPoint.set(...assignment.guard);
        enemy.plantProgress = 0;
        enemy.muzzleFlash.intensity = 0;
        enemy.sightTime = 0;
        enemy.combatTargetId = null;
        enemy.combatMemory = 0;
        enemy.lastKnownOpponentPosition.set(0, 0, 0);
        enemy.waypointIndex = 0;
        enemy.blockedSeconds = 0;
        enemy.movementSpeed = 0;
        enemy.verticalVelocity = 0;
        enemy.grounded = true;
        enemy.motionResolvedThisTick = false;
        enemy.locomotionVelocityX = 0;
        enemy.locomotionVelocityZ = 0;
        enemy.locomotionPhase = 0;
        enemy.bodyYaw = enemy.root.rotation.y;
        enemy.aimYaw = enemy.bodyYaw;
        enemy.lastAccelerationX = 0;
        enemy.lastAccelerationZ = 0;
        enemy.locomotionCommanded = false;
        enemy.nextFootstepAtMs = simulationNowMs + index * 70;
        if (matchState.playerSide === 'ct') {
          enemy.route = planAssignment.route.map(
            ([routeX, routeZ], waypointIndex, route) => {
              if (waypointIndex === route.length - 1) {
                if (planAssignment.role === 'carrier')
                  return new THREE.Vector2(routeX, routeZ);
                const angle = (index / enemies.length) * Math.PI * 2;
                return new THREE.Vector2(
                  routeX + Math.cos(angle) * 3.4,
                  routeZ + Math.sin(angle) * 3.4,
                );
              }
              return new THREE.Vector2(routeX, routeZ);
            },
          );
        } else {
          enemy.route = [enemy.guardPoint.clone()];
        }
        const initialLook = enemy.route.find(point => point.distanceTo(new THREE.Vector2(enemy.root.position.x, enemy.root.position.z)) > 0.1) ?? enemy.guardPoint;
        enemy.aimYaw = Math.atan2(initialLook.x - enemy.root.position.x, initialLook.y - enemy.root.position.z) + Math.PI;
        enemy.bodyYaw = enemy.aimYaw;
        enemy.root.rotation.y = enemy.bodyYaw;
        setEnemySideAppearance(enemy, enemySide);
        enemy.hitMeshes.forEach((mesh) => {
          setCharacterHitEmissive(mesh, 0x000000);
        });
      });
      allies.forEach((ally, index) => {
        const assignment = CT_DEFENDER_ASSIGNMENTS[index + 1];
        const planAssignment = roundPlan.assignments[index];
        const allySide = getBotSide(matchState.playerSide, 'ally');
        const [x, z] =
          matchState.playerSide === 'ct'
            ? assignment.spawn
            : T_ATTACKER_SPAWNS[index + 1];
        botNavigation.delete(ally);
        ally.root.position.set(x, getMapGroundHeight(x, z), z);
        ally.root.visible = true;
        resetBotVisualPose(ally);
        applyBotInventory(ally, prepareBotInventory(readBotInventory(ally), {
          side: allySide, survived: !newMatch && !economyReset && ally.alive && ally.health > 0,
          resetMoney: newMatch ? 800 : prepared.startingMoney,
          roundIndex, rosterRoundIndex: roundIndex + 1, botId: index,
          lossStreak: matchState.lossStreaks.player, assignedDefuseKit: assignment.kit,
        }));
        ally.health = 100;
        ally.alive = true;
        ally.profile = ENEMY_COMBAT_PROFILES[(index + 2) % allies.length];
        setEnemyPrimaryModel(ally, ally.primaryWeapon);
        ally.fireCooldown = getEnemyFireCooldown(
          ally.primaryWeapon,
          Math.random(),
        );
        ally.burstShotsRemaining = 0;
        ally.movementDecisionTimer = 0.5 + Math.random() * 0.7;
        ally.combatMovement = 'advance';
        ally.suppression = 0;
        ally.blindUntilMs = 0;
        ally.reloadTimer = 0;
        botReloads.delete(ally);
        ally.utility = createBotUtilityState();
        ally.shots.reset();
        ally.special.reset();
        syncBotSilencerVisuals(ally);
        ally.glockBurst.targetId = null;
        ally.role =
          planAssignment.role === 'entry'
            ? 'hunter'
            : planAssignment.role === 'carrier'
              ? 'carrier'
              : 'escort';
        ally.homeSite = assignment.site;
        ally.guardPoint.set(...assignment.guard);
        ally.plantProgress = 0;
        ally.muzzleFlash.intensity = 0;
        ally.sightTime = 0;
        ally.combatTargetId = null;
        ally.combatMemory = 0;
        ally.lastKnownOpponentPosition.set(0, 0, 0);
        ally.waypointIndex = 0;
        ally.blockedSeconds = 0;
        ally.movementSpeed = 0;
        ally.verticalVelocity = 0;
        ally.grounded = true;
        ally.motionResolvedThisTick = false;
        ally.locomotionVelocityX = 0;
        ally.locomotionVelocityZ = 0;
        ally.locomotionPhase = 0;
        ally.bodyYaw = ally.root.rotation.y;
        ally.aimYaw = ally.bodyYaw;
        ally.lastAccelerationX = 0;
        ally.lastAccelerationZ = 0;
        ally.locomotionCommanded = false;
        ally.nextFootstepAtMs = simulationNowMs + index * 70 + 35;
        if (matchState.playerSide === 'ct') {
          ally.role = 'defender';
          ally.route = [ally.guardPoint.clone()];
        } else {
          ally.route = planAssignment.route.map(
            ([routeX, routeZ], waypointIndex, route) => {
              if (waypointIndex === route.length - 1) {
                if (planAssignment.role === 'carrier')
                  return new THREE.Vector2(routeX, routeZ);
                const angle = (index / allies.length) * Math.PI * 2;
                return new THREE.Vector2(
                  routeX + Math.cos(angle) * 3.4,
                  routeZ + Math.sin(angle) * 3.4,
                );
              }
              return new THREE.Vector2(routeX, routeZ);
            },
          );
        }
        const initialLook = ally.route.find(point => point.distanceTo(new THREE.Vector2(ally.root.position.x, ally.root.position.z)) > 0.1) ?? ally.guardPoint;
        ally.aimYaw = Math.atan2(initialLook.x - ally.root.position.x, initialLook.y - ally.root.position.z) + Math.PI;
        ally.bodyYaw = ally.aimYaw;
        ally.root.rotation.y = ally.bodyYaw;
        setEnemySideAppearance(ally, allySide);
        ally.hitMeshes.forEach((mesh) => {
          setCharacterHitEmissive(mesh, 0x000000);
        });
      });
      if (matchState.playerSide === 'ct' && roundPlan.carrier.kind === 'bot')
        attachBombToCarrier(enemies[roundPlan.carrier.botId]);
      if (matchState.playerSide === 't' && roundPlan.carrier.kind === 'bot')
        attachBombToCarrier(allies[roundPlan.carrier.botId]);
      camera.position.copy(player.position);
      camera.rotation.set(0, player.yaw, 0);
      syncPresentationCamera();
      lastHudUpdate = 0;
      publishHud();
    };
    restartRef.current = (newMatch, snapshotReason = 'play-start') => {
      if (status !== 'active') {
        resetRound(newMatch);
      }
      publishGraphicsBudget(snapshotReason, player.activeWeapon);
    };

    const requestSkipBotRoundWait = () => {
      const freezeSeconds = Math.max(0, (freezeEnds - simulationNowMs) / 1000);
      if (
        !canSkipBotRoundWait({
          botMatch: bots.length > 0,
          roundActive: status === 'active',
          playerAlive,
          freezeSeconds,
          alreadyRequested: skipBotRoundRequested,
        })
      )
        return false;

      skipBotRoundRequested = true;
      setLocked(true);
      setBuyOpen(false);
      setScoreboardOpen(false);
      message = 'RESOLVING ROUND…';
      publishHud(0);

      if (pendingRoundResult) {
        const pending = pendingRoundResult;
        endRound(pending.winnerSide, pending.reason, pending.event);
      }
      return true;
    };
    skipBotRoundRef.current = requestSkipBotRoundWait;

    // Local-only fixed camera entry point for deterministic visual captures.
    // It never activates in production hosts and deliberately leaves touch
    // play disabled so the simulation and AI remain paused.
    const graphicsQaCloseCharacterReview = getGraphicsQaCloseCharacterReview(
      window.location.search,
      window.location.hostname,
    );
    const graphicsQaMotionPreset = getGraphicsQaMotionPreset(
      window.location.search,
      window.location.hostname,
    );
    const graphicsQaPistolViewmodelReview = getGraphicsQaPistolViewmodelReview(
      window.location.search,
      window.location.hostname,
    );
    const graphicsQaEquipmentReview = getGraphicsQaEquipmentReview(
      window.location.search,
      window.location.hostname,
    );
    const graphicsQaPrimaryViewmodelReview =
      getGraphicsQaPrimaryViewmodelReview(
        window.location.search,
        window.location.hostname,
      );
    const graphicsQaPreset = getGraphicsQaPreset(
      window.location.search,
      window.location.hostname,
    );
    if (graphicsQaCloseCharacterReview) {
      resetRound(false);
      Object.values(weaponViews).forEach((view) => {
        view.root.visible = false;
      });
      const reviewBots = [
        bots.find((bot) => bot.side === 't'),
        bots.find((bot) => bot.side === 'ct'),
      ].filter((bot): bot is Enemy => Boolean(bot) &&
        (graphicsQaCloseCharacterReview.subject === 'both' || bot?.side === graphicsQaCloseCharacterReview.subject));
      bots.forEach((bot) => {
        bot.root.visible = false;
        bot.skinned.visualRoot.visible = false;
      });
      reviewBots.forEach((bot, index) => {
        bot.primaryWeapon = bot.side === 't' ? 'rifle' : 'carbine';
        setEnemyPrimaryModel(bot, bot.primaryWeapon);
        applyGraphicsQaCloseCharacterPose(
          bot,
          graphicsQaCloseCharacterReview,
          index,
        );
      });
      player.position.set(...GRAPHICS_QA_REVIEW_POSITION);
      player.yaw = 0;
      player.pitch = 0;
      player.velocity.set(0, 0, 0);
      resetPlayerPresentation();
      camera.position.copy(player.position);
      applyPlayerAim();
      syncPresentationCamera();
      touchPlaying = false;
      window.queueMicrotask(() => setLocked(true));
    } else if (graphicsQaMotionPreset) {
      resetRound(false);
      const motionParams = new URLSearchParams(window.location.search);
      const requestedMotionStart = Number(motionParams.get('motion-start'));
      const motionStart = Number.isFinite(requestedMotionStart)
        ? Math.max(
            0,
            Math.min(
              graphicsQaMotionPreset.poses.length - 1,
              Math.floor(requestedMotionStart),
            ),
          )
        : 0;
      const motionSamples = graphicsQaMotionPreset.poses.slice(
        motionStart,
        motionStart + bots.length,
      );
      bots.forEach((bot, index) => {
        const pose = motionSamples[index];
        if (!pose) {
          bot.root.visible = false;
          bot.skinned.visualRoot.visible = false;
          return;
        }
        applyGraphicsQaMotionPose(bot, pose, index);
      });
      // Keep the camera fixed while leaving the gameplay camera as the sole
      // source of aim/raycast state. Viewmodel weapons are irrelevant here.
      Object.values(weaponViews).forEach((view) => {
        view.root.visible = false;
      });
      player.position.set(...GRAPHICS_QA_MOTION_CAMERA_POSITION);
      player.yaw = 0;
      player.pitch = 0;
      player.velocity.set(0, 0, 0);
      resetPlayerPresentation();
      camera.position.copy(player.position);
      applyPlayerAim();
      syncPresentationCamera();
      touchPlaying = false;
      window.queueMicrotask(() => setLocked(true));
    } else if (graphicsQaPreset) {
      resetRound(false);
      // Environment and viewmodel reviews need a clear sightline. Dedicated
      // character and movement reviews above keep their selected subjects.
      bots.forEach((bot) => {
        bot.root.visible = false;
        bot.skinned.visualRoot.visible = false;
      });
      if (
        graphicsQaPreset.name === 'primary' &&
        graphicsQaPrimaryViewmodelReview
      ) {
        Object.values(weaponViews).forEach((view) => {
          view.root.visible = false;
        });
        const {
          weapon: reviewWeapon,
          action,
          timeSeconds,
        } = graphicsQaPrimaryViewmodelReview;
        const reviewView = weaponViews[reviewWeapon];
        reviewView.root.position.copy(reviewView.basePosition);
        reviewView.root.rotation.copy(reviewView.baseRotation);
        if (reviewWeapon === 'carbine') {
          reviewView.root.scale.setScalar(1);
        } else {
          const reviewMount = PRIMARY_VIEWMODEL_FIRST_PERSON_MOUNTS[reviewWeapon];
          reviewView.root.scale.setScalar(reviewMount.scale);
        }
        reviewView.root.visible = true;
        applyPrimaryActionParts(
          reviewWeapon,
          action === 'fire' ? timeSeconds * 1000 : Number.POSITIVE_INFINITY,
        );
        if (reviewView.authoredAnimation) {
          reviewView.authoredAnimation.sample({
            nowMs: timeSeconds * 1000,
            reload: action === 'reload' ? { startedAt: 0, completesAt: FIREARMS[reviewWeapon].reloadMs } : null,
            equip: action === 'equip' ? { startedAt: 0, completesAt: getWeaponEquipDelay(reviewWeapon) } : null,
            fireStartedAtMs: action === 'fire' ? 0 : undefined,
          });
        }
        if (action === 'reload' && !reviewView.authoredAnimation) {
          const reloadProgress = THREE.MathUtils.clamp(
            (timeSeconds * 1000) / FIREARMS[reviewWeapon].reloadMs,
            0,
            1,
          );
          writeWeaponReloadPose(reviewWeapon, reloadProgress, reloadPose);
          reviewView.root.position.add(
            new THREE.Vector3(
              reloadPose.positionX,
              reloadPose.positionY,
              reloadPose.positionZ,
            ),
          );
          reviewView.root.rotation.x += reloadPose.rotationX;
          reviewView.root.rotation.y += reloadPose.rotationY;
          reviewView.root.rotation.z += reloadPose.rotationZ;
        } else if (action === 'fire') {
          const fireCue = Math.exp(-timeSeconds * 18);
          if (!reviewView.authoredAnimation) {
            reviewView.root.position.z += 0.045 * fireCue;
            reviewView.root.rotation.x -= 0.055 * fireCue;
          }
          if (reviewView.muzzle) {
            const profile = getCombatVisualWeaponProfile(
              'player',
              reviewWeapon,
            );
            reviewView.muzzle.intensity = THREE.MathUtils.lerp(
              profile.muzzleIntensityMax,
              profile.muzzleIntensityMin,
              getMuzzleFadeFactor(profile, timeSeconds),
            );
          }
        } else if (action === 'equip' && !reviewView.authoredAnimation) {
          const equipProgress = THREE.MathUtils.clamp(
            (timeSeconds * 1000) / getWeaponEquipDelay(reviewWeapon),
            0,
            1,
          );
          const drawAmount =
            1 - THREE.MathUtils.smoothstep(equipProgress, 0, 1);
          reviewView.root.position.y -= drawAmount * 0.28;
          reviewView.root.position.z += drawAmount * 0.12;
          reviewView.root.rotation.x += drawAmount * 0.14;
        }
      } else if (graphicsQaPreset.name === 'pistol') {
        Object.values(weaponViews).forEach((view) => {
          view.root.visible = false;
        });
        const pistolReview = graphicsQaPistolViewmodelReview ?? {
          weapon: 'usp' as const,
          action: 'idle' as const,
          timeSeconds: 0,
        };
        const pistolView = weaponViews[pistolReview.weapon];
        pistolView.root.position.copy(pistolView.basePosition);
        pistolView.root.rotation.copy(pistolView.baseRotation);
        if (!pistolView.authoredAnimation) {
          const mount = SECONDARY_VIEWMODEL_FIRST_PERSON_MOUNTS[
            pistolReview.weapon as ProceduralSecondaryFirstPersonKind
          ];
          pistolView.root.scale.setScalar(mount.scale);
        }
        resetSecondaryReloadActionParts(pistolView.secondaryActionParts);
        pistolView.root.visible = true;
        pistolView.authoredAnimation?.sample({
          nowMs: pistolReview.timeSeconds * 1000,
          reload: pistolReview.action === 'reload'
            ? { startedAt: 0, completesAt: FIREARMS[pistolReview.weapon].reloadMs }
            : null,
          equip: pistolReview.action === 'equip'
            ? { startedAt: 0, completesAt: getWeaponEquipDelay(pistolReview.weapon) }
            : null,
          fireStartedAtMs: pistolReview.action === 'fire' ? 0 : undefined,
        });
        if (pistolReview.action === 'reload' && !pistolView.authoredAnimation) {
          const progress = THREE.MathUtils.clamp(
            (pistolReview.timeSeconds * 1000) /
              FIREARMS[pistolReview.weapon].reloadMs,
            0,
            1,
          );
          applyWeaponReloadVisualPose(
            pistolView,
            pistolReview.weapon,
            progress,
          );
        } else if (pistolReview.action === 'fire') {
          const fireCue = Math.exp(-pistolReview.timeSeconds * 18);
          if (!pistolView.authoredAnimation) {
            pistolView.root.position.z += 0.045 * fireCue;
            pistolView.root.rotation.x -= 0.055 * fireCue;
          }
          pistolView.muzzle!.intensity = THREE.MathUtils.lerp(
            getCombatVisualWeaponProfile('player', pistolReview.weapon)
              .muzzleIntensityMax,
            getCombatVisualWeaponProfile('player', pistolReview.weapon)
              .muzzleIntensityMin,
            getMuzzleFadeFactor(
              getCombatVisualWeaponProfile('player', pistolReview.weapon),
              pistolReview.timeSeconds,
            ),
          );
        } else if (pistolReview.action === 'equip' && !pistolView.authoredAnimation) {
          const equipProgress = THREE.MathUtils.clamp(
            (pistolReview.timeSeconds * 1000) /
              getWeaponEquipDelay(pistolReview.weapon),
            0,
            1,
          );
          const drawAmount =
            1 - THREE.MathUtils.smoothstep(equipProgress, 0, 1);
          pistolView.root.position.y -= drawAmount * 0.28;
          pistolView.root.position.z += drawAmount * 0.12;
          pistolView.root.rotation.x += drawAmount * 0.14;
        }
      } else if (
        graphicsQaPreset.name === 'equipment' &&
        graphicsQaEquipmentReview
      ) {
        Object.values(weaponViews).forEach((view) => {
          view.root.visible = false;
        });
        const equipmentView = weaponViews[graphicsQaEquipmentReview.weapon];
        const equipmentMount =
          EQUIPMENT_VIEWMODEL_MOUNTS[graphicsQaEquipmentReview.weapon];
        equipmentView.root.position.copy(equipmentView.basePosition);
        equipmentView.root.rotation.copy(equipmentView.baseRotation);
        equipmentView.root.scale.setScalar(equipmentMount.scale);
        equipmentView.root.visible = true;
      } else if (graphicsQaPreset.name === 'secondary') {
        // Fit each complete assembly into the fixed local-only 3-by-2 board.
        Object.values(weaponViews).forEach((view) => {
          view.root.visible = false;
        });
        SECONDARY_WEAPON_KINDS.forEach((kind, index) => {
          const view = weaponViews[kind];
          const column = index % 3;
          const row = Math.floor(index / 3);
          view.root.visible = true;
          view.root.scale.setScalar(SECONDARY_VIEWMODEL_QA_BOARD.scale);
          view.root.position.set(
            SECONDARY_VIEWMODEL_QA_BOARD.columnStartX +
              column * SECONDARY_VIEWMODEL_QA_BOARD.columnSpacing,
            SECONDARY_VIEWMODEL_QA_BOARD.rowStartY -
              row * SECONDARY_VIEWMODEL_QA_BOARD.rowSpacing,
            SECONDARY_VIEWMODEL_QA_BOARD.z,
          );
          if (view.authoredAnimation) {
            const cellPosition = view.root.position.clone();
            view.root.position.set(0, 0, 0);
            view.root.scale.setScalar(1);
            view.root.rotation.copy(view.baseRotation);
            view.authoredAnimation.sample({ nowMs: 0 });
            const poseBounds = new THREE.Box3().setFromObject(view.root, true);
            const poseSize = poseBounds.getSize(new THREE.Vector3());
            const poseCenter = poseBounds.getCenter(new THREE.Vector3());
            const cellScale = 0.3 / Math.max(poseSize.x, poseSize.y);
            view.root.scale.setScalar(cellScale);
            view.root.position.copy(cellPosition).sub(poseCenter.multiplyScalar(cellScale));
            view.root.position.y -= 0.1;
          } else {
            view.root.rotation.set(
              ...SECONDARY_VIEWMODEL_FIRST_PERSON_MOUNTS[
                kind as ProceduralSecondaryFirstPersonKind
              ].rotation,
            );
          }
        });
      }
      player.position.set(...graphicsQaPreset.position);
      player.yaw = graphicsQaPreset.yaw;
      player.pitch = graphicsQaPreset.pitch;
      player.velocity.set(0, 0, 0);
      resetPlayerPresentation();
      camera.position.copy(player.position);
      applyPlayerAim();
      syncPresentationCamera();
      touchPlaying = false;
      window.queueMicrotask(() => setLocked(true));
    }

    const interruptPlayerPlant = () => {
      if (matchState.playerSide !== 't' || bombState !== 'planting') return;
      bombState = 'carried';
      playerPlantProgress = 0;
      plantingSite = null;
      canPlant = false;
    };

    const commitReload = () => {
      if (!isFirearmKind(player.activeWeapon)) return;
      const definition = FIREARMS[player.activeWeapon];
      const ammo = player.ammo[player.activeWeapon];
      if (
        !canStartPlayerReload({
          active: status === 'active',
          alive: playerAlive,
          buyOpen: buyMenuOpen,
          weaponReady: isWeaponReady(simulationNowMs, player.equipReadyAtMs),
          reloading: player.reload !== null,
          ammo,
          magazineSize: definition.magazineSize,
        })
      )
        return;
      interruptPlayerPlant();
      weaponSpecial.cancelPending(simulationNowMs);
      syncSilencerVisuals();
      setScope(false, false);
      if (player.activeWeapon === 'sniper') resetSniperBoltCycle();
      player.reload = {
        weapon: player.activeWeapon,
        startedAt: simulationNowMs,
        completesAt: simulationNowMs + (player.activeWeapon === 'shotgun' ? SPECIAL_TIMINGS.m3Start : definition.reloadMs),
        shotgunPhase: player.activeWeapon === 'shotgun' ? 'start' : undefined,
      };
      playWeaponActionSound(player.activeWeapon, 'reloadStart');
      weaponBallistics.resetWeapon(player.activeWeapon);
      message =
        definition.reloadMode === 'shell' ? 'LOADING SHELL' : 'RELOADING';
      publishHud(0);
    };

    const selectWeapon = (selection: WeaponKind) => {
      if (status !== 'active' || !playerAlive) return;
      if (selection === player.activeWeapon) return;
      if (
        isPrimaryWeaponKind(selection) &&
        player.primaryWeapon !== selection
      ) {
        message = `${FIREARMS[selection].label} NOT PURCHASED — PRESS B`;
        publishHud(0);
        return;
      }
      if (
        isSecondaryWeaponKind(selection) &&
        player.secondaryWeapon !== selection
      ) {
        message = `${FIREARMS[selection].label} NOT IN INVENTORY — PRESS B`;
        publishHud(0);
        return;
      }
      if (selection === 'grenade' && player.grenades <= 0) {
        message = 'NO FRAG GRENADE — PRESS B';
        publishHud(0);
        return;
      }
      if (selection === 'smoke' && player.smokes <= 0) {
        message = 'NO SMOKE GRENADE — PRESS B';
        publishHud(0);
        return;
      }
      if (selection === 'flash' && player.flashes <= 0) {
        message = 'NO FLASHBANG — PRESS B';
        publishHud(0);
        return;
      }
      if (
        selection === 'bomb' &&
        (matchState.playerSide !== 't' ||
          !playerHasBomb ||
          (bombState !== 'carried' && bombState !== 'planting'))
      ) {
        message = 'C4 DEVICE NOT IN YOUR INVENTORY';
        publishHud(0);
        return;
      }
      setScope(false, false);
      interruptPlayerPlant();
      cancelPlayerReload();
      if (player.activeWeapon === 'sniper') resetSniperBoltCycle();
      weaponSpecial.cancelPending(simulationNowMs);
      syncSilencerVisuals();
      player.activeWeapon = selection;
      clearAuthoredShotClocks();
      if (isFirearmKind(selection)) weaponBallistics.resetWeapon(selection);
      player.equipReadyAtMs = simulationNowMs + getWeaponEquipDelay(selection);
      player.nextShot = Math.max(player.nextShot, player.equipReadyAtMs);
      player.shotPulse = 0;
      showWeaponView(selection);
      message = isFirearmKind(selection)
        ? `${FIREARMS[selection].label} EQUIPPED`
        : selection === 'grenade'
          ? 'FRAG GRENADE READY'
          : selection === 'smoke'
            ? 'SMOKE GRENADE READY'
            : selection === 'flash'
              ? 'FLASHBANG READY'
              : selection === 'bomb'
                ? 'C4 DEVICE READY — HOLD FIRE AT A SITE'
                : 'FIELD KNIFE EQUIPPED';
      publishHud(0);
    };

    const cycleGrenadeSlot = () => {
      const grenades: WeaponKind[] = [];
      if (player.grenades > 0) grenades.push('grenade');
      if (player.smokes > 0) grenades.push('smoke');
      if (player.flashes > 0) grenades.push('flash');
      if (grenades.length === 0) {
        message = 'GRENADE SLOT EMPTY — PRESS B';
        publishHud(0);
        return;
      }
      const currentIndex = grenades.indexOf(player.activeWeapon);
      const nextIndex =
        currentIndex < 0 ? 0 : (currentIndex + 1) % grenades.length;
      selectWeapon(grenades[nextIndex]);
    };

    const dropPlayerFirearm = () => {
      if (
        !canDropFirearm({
          active: status === 'active',
          alive: playerAlive,
          activeWeapon: player.activeWeapon,
          currentPrimary: player.primaryWeapon,
          currentSecondary: player.secondaryWeapon,
          reloading: player.reload !== null,
          buyOpen: buyMenuOpen,
        }) ||
        !isFirearmKind(player.activeWeapon)
      )
        return;
      const kind = player.activeWeapon;
      const ammo = { ...player.ammo[kind] };
      weaponSpecial.cancelPending(simulationNowMs);
      syncSilencerVisuals();
      setScope(false, false);
      cancelPlayerReload();
      if (kind === 'sniper') resetSniperBoltCycle();
      spawnFirearmDrop({
        kind,
        ammo,
        position: player.position,
        rotationY: player.yaw,
        origin: 'player',
        pickupAvailableAtMs: simulationNowMs + PLAYER_FIREARM_PICKUP_GRACE_MS,
      });
      player.ammo[kind] = { magazine: 0, reserve: 0 };
      if (isPrimaryWeaponKind(kind)) player.primaryWeapon = null;
      else player.secondaryWeapon = null;
      const fallback =
        player.secondaryWeapon ?? player.primaryWeapon ?? 'knife';
      player.activeWeapon = fallback;
      player.equipReadyAtMs = simulationNowMs + getWeaponEquipDelay(fallback);
      player.nextShot = Math.max(player.nextShot, player.equipReadyAtMs);
      weaponBallistics.resetWeapon(kind);
      player.shotPulse = 0;
      firing = false;
      triggerReady = true;
      showWeaponView(fallback);
      message = `${FIREARMS[kind].label} DROPPED`;
      publishHud(0);
    };

    const processRequestedDrop = (playerRecoveredBomb = false) => {
      if (!dropRequested) return;
      dropRequested = false;
      const canDropBomb =
        !playerRecoveredBomb &&
        canPlayerDropBomb({
          active: status === 'active',
          alive: playerAlive,
          playerSide: matchState.playerSide,
          bombState,
          playerHasBomb,
          buyOpen: buyMenuOpen,
        });
      const canDropCurrentFirearm = canDropFirearm({
        active: status === 'active',
        alive: playerAlive,
        activeWeapon: player.activeWeapon,
        currentPrimary: player.primaryWeapon,
        currentSecondary: player.secondaryWeapon,
        reloading: player.reload !== null,
        buyOpen: buyMenuOpen,
      });
      const dropTarget = getPlayerDropTarget({
        activeWeapon: player.activeWeapon,
        canDropBomb,
        canDropFirearm: canDropCurrentFirearm,
      });
      if (dropTarget === 'bomb') dropPlayerBomb();
      else if (dropTarget === 'firearm') dropPlayerFirearm();
    };

    const purchase = (slot: string) => {
      if (!buyMenuOpen) return;
      const buyBlockReason = getCurrentBuyBlockReason();
      if (buyBlockReason) {
        buyMenuOpen = false;
        setBuyOpen(false);
        message = getBuyBlockMessage(buyBlockReason);
        publishHud(0);
        return;
      }
      const failPurchase = (reason: string) => {
        message = reason;
        publishHud(0);
      };
      const purchaseFirearm = (kind: FirearmKind) => {
        const definition = FIREARMS[kind];
        const currentWeapon =
          definition.slot === 'primary'
            ? player.primaryWeapon
            : player.secondaryWeapon;
        if (currentWeapon === kind)
          return failPurchase(`${definition.label} ALREADY EQUIPPED`);
        if (player.money < definition.price)
          return failPurchase('INSUFFICIENT FUNDS');
        if (currentWeapon) {
          spawnFirearmDrop({
            kind: currentWeapon,
            ammo: player.ammo[currentWeapon],
            position: player.position,
            rotationY: player.yaw,
            origin: 'player',
            pickupAvailableAtMs:
              simulationNowMs + PLAYER_FIREARM_PICKUP_GRACE_MS,
          });
          player.ammo[currentWeapon] = { magazine: 0, reserve: 0 };
        }
        player.money -= definition.price;
        if (isPrimaryWeaponKind(kind)) player.primaryWeapon = kind;
        else player.secondaryWeapon = kind;
        player.ammo[kind] = {
          magazine: definition.magazineSize,
          reserve: definition.purchaseReserve,
        };
        weaponBallistics.resetWeapon(kind);
        selectWeapon(kind);
        message = `${definition.label} ${definition.slot.toUpperCase()} PURCHASED`;
      };
      const purchaseAmmo = (kind: FirearmKind | null, slotLabel: string) => {
        if (!kind) return failPurchase(`PURCHASE A ${slotLabel} FIRST`);
        const transaction = resolveAmmoPurchase({
          kind,
          money: player.money,
          reserve: player.ammo[kind].reserve,
        });
        if (!transaction.purchased) {
          if (transaction.reason === 'already-full')
            return failPurchase('AMMUNITION FULL');
          return failPurchase(
            transaction.reason === 'insufficient-funds'
              ? 'INSUFFICIENT FUNDS'
              : 'PURCHASE UNAVAILABLE',
          );
        }
        player.money = transaction.money;
        player.ammo[kind].reserve = transaction.reserve;
        message = `${FIREARMS[kind].label} +${transaction.amount} AMMUNITION`;
      };
      const purchaseArmor = (kind: 'kevlar' | 'assault-suit') => {
        const transaction = resolveArmorPurchase({
          money: player.money,
          armor: player.armor,
          helmet: player.helmet,
          kind,
        });
        if (!transaction.purchased) {
          if (transaction.reason === 'already-equipped')
            return failPurchase(
              kind === 'kevlar'
                ? 'KEVLAR ALREADY EQUIPPED'
                : 'KEVLAR + HELMET ALREADY EQUIPPED',
            );
          return failPurchase(
            transaction.reason === 'insufficient-funds'
              ? 'INSUFFICIENT FUNDS'
              : 'PURCHASE UNAVAILABLE',
          );
        }
        player.money = transaction.money;
        player.armor = transaction.armor;
        player.helmet = transaction.helmet;
        message =
          kind === 'kevlar'
            ? 'KEVLAR EQUIPPED'
            : transaction.cost === EQUIPMENT_PRICES.helmet
              ? 'HELMET EQUIPPED'
              : transaction.cost === EQUIPMENT_PRICES.kevlar
                ? 'KEVLAR REFILLED'
                : 'KEVLAR + HELMET EQUIPPED';
      };
      if (slot === 'Digit1') {
        purchaseFirearm(getServiceRifleForSide(matchState.playerSide));
      } else if (slot === 'Digit2') {
        purchaseFirearm('smg');
      } else if (slot === 'Digit3') {
        purchaseFirearm('shotgun');
      } else if (slot === 'Digit0') {
        purchaseFirearm('sniper');
      } else if (slot.startsWith('Pistol')) {
        const pistolSlot = Number(slot.slice('Pistol'.length));
        const pistolKind = getPistolBuyOption(
          matchState.playerSide,
          pistolSlot,
        );
        if (!pistolKind) return failPurchase('PURCHASE UNAVAILABLE');
        purchaseFirearm(pistolKind);
      } else if (slot === 'Digit4') {
        purchaseArmor('kevlar');
      } else if (slot === 'KeyH') {
        purchaseArmor('assault-suit');
      } else if (slot === 'Digit5') {
        purchaseAmmo(player.primaryWeapon, 'PRIMARY');
      } else if (slot === 'KeyY') {
        purchaseAmmo(player.secondaryWeapon, 'SECONDARY');
      } else if (slot === 'Digit6') {
        const transaction = resolveDefuseKitPurchase({
          side: matchState.playerSide,
          money: player.money,
          hasDefuseKit: player.hasDefuseKit,
        });
        if (!transaction.purchased) {
          if (transaction.reason === 'wrong-side')
            return failPurchase('C4 DEVICE ALREADY ISSUED');
          if (transaction.reason === 'already-equipped')
            return failPurchase('DEFUSE KIT ALREADY EQUIPPED');
          return failPurchase(
            transaction.reason === 'insufficient-funds'
              ? 'INSUFFICIENT FUNDS'
              : 'PURCHASE UNAVAILABLE',
          );
        }
        player.money = transaction.money;
        player.hasDefuseKit = transaction.hasDefuseKit;
        message = 'DEFUSE KIT EQUIPPED';
      } else if (slot === 'Digit7') {
        if (player.grenades >= 1) return failPurchase('FRAG GRENADE SLOT FULL');
        if (player.money < EQUIPMENT_PRICES.grenade)
          return failPurchase('INSUFFICIENT FUNDS');
        player.money -= EQUIPMENT_PRICES.grenade;
        player.grenades = 1;
        message = 'FRAG GRENADE PURCHASED';
      } else if (slot === 'Digit8') {
        if (player.smokes >= 1) return failPurchase('SMOKE GRENADE SLOT FULL');
        if (player.money < EQUIPMENT_PRICES.smoke)
          return failPurchase('INSUFFICIENT FUNDS');
        player.money -= EQUIPMENT_PRICES.smoke;
        player.smokes = 1;
        message = 'SMOKE GRENADE PURCHASED';
      } else if (slot === 'Digit9') {
        if (player.flashes >= 1) return failPurchase('FLASHBANG SLOT FULL');
        if (player.money < EQUIPMENT_PRICES.flash)
          return failPurchase('INSUFFICIENT FUNDS');
        player.money -= EQUIPMENT_PRICES.flash;
        player.flashes = 1;
        message = 'FLASHBANG PURCHASED';
      } else {
        return;
      }
      publishHud(0);
    };
    purchaseRef.current = purchase;

    const toggleBuyMenu = () => {
      if (buyMenuOpen) {
        buyMenuOpen = false;
        setBuyOpen(false);
        message =
          matchState.playerSide === 'ct'
            ? 'ELIMINATE THE TERRORISTS'
            : 'TAKE THE DEVICE TO A OR B';
        publishHud(0);
        return;
      }
      const buyBlockReason = getCurrentBuyBlockReason();
      if (buyBlockReason) {
        message = getBuyBlockMessage(buyBlockReason);
        publishHud(0);
        return;
      }
      setScope(false, false);
      cancelPlayerReload();
      buyMenuOpen = true;
      setBuyOpen(true);
      message = 'BUY ZONE — SELECT EQUIPMENT';
      publishHud(0);
    };

    const completeReload = () => {
      if (!player.reload) return;
      const reload = player.reload;
      const weapon = reload.weapon;
      if (weapon === 'shotgun') {
        const next = advanceShotgunReload(reload.shotgunPhase!, player.ammo.shotgun,
          simulationNowMs, reload.completesAt);
        player.ammo.shotgun = next.ammo;
        if (next.inserted) playWeaponActionSound('shotgun', 'reloadCommit');
        if (next.complete) cancelPlayerReload();
        else player.reload = { weapon, shotgunPhase: next.phase,
          startedAt: reload.completesAt, completesAt: next.deadline };
        message = next.complete ? getDefaultCombatMessage() : next.phase === 'pump' ? 'M3 PUMP' : 'LOADING SHELL';
      } else {
        player.ammo[weapon] = reloadMagazine(player.ammo[weapon], FIREARMS[weapon].magazineSize);
        playWeaponActionSound(weapon, 'reloadCommit');
        cancelPlayerReload();
        message = getDefaultCombatMessage();
      }
      publishHud(0);
    };

    const beginPlayerDeathCamera = (seed: number) => {
      weaponBallistics.reset();
      spreadRandom = createSeededRandom(1602);
      weaponSpecial.cancelPending(simulationNowMs);
      syncSilencerVisuals();
      resetSniperBoltCycle();
      playerDeathCamera = {
        start: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
          pitch: camera.rotation.x,
          yaw: camera.rotation.y,
        },
        elapsedSeconds: 0,
        variant: getPlayerDeathCameraVariant(seed),
      };
    };

    const chooseSpectatedBot = (killer: Enemy | null = null) => {
      const selectedId = chooseSpectatorTarget({
        playerAlive,
        currentTargetId: spectatedEnemy
          ? `${spectatedEnemy.team}-${spectatedEnemy.id}`
          : null,
        allies: allies.map((ally) => ({
          id: `ally-${ally.id}`,
          team: 'ally',
          alive: ally.alive,
        })),
        enemies: enemies.map((enemy) => ({
          id: `enemy-${enemy.id}`,
          team: 'enemy',
          alive: enemy.alive,
        })),
        killerId: killer ? `${killer.team}-${killer.id}` : null,
      });
      spectatedEnemy =
        bots.find((bot) => `${bot.team}-${bot.id}` === selectedId) ?? null;
    };

    const cycleSpectatedBot = () => {
      const livingAllyCount = allies.filter((ally) => ally.alive).length;
      const deathCameraComplete =
        playerDeathCamera !== null &&
        shouldUseSpectatorOrbit(playerAlive, playerDeathCamera.elapsedSeconds);
      if (
        !canCycleFriendlySpectator({
          active: status === 'active',
          playerAlive,
          deathCameraComplete,
          interactionActive:
            document.pointerLockElement === renderer.domElement || touchPlaying,
          roundResultPending: pendingRoundResult !== null,
          livingAllyCount,
        })
      )
        return false;
      const selectedId = getNextFriendlySpectatorTarget({
        currentTargetId: spectatedEnemy
          ? `${spectatedEnemy.team}-${spectatedEnemy.id}`
          : null,
        allies: allies.map((ally) => ({
          id: `ally-${ally.id}`,
          team: 'ally',
          alive: ally.alive,
        })),
      });
      const nextAlly = allies.find(
        (ally) => ally.alive && `ally-${ally.id}` === selectedId,
      );
      if (!nextAlly) return false;
      spectatedEnemy = nextAlly;
      message = `SPECTATING ${nextAlly.name.toUpperCase()}`;
      publishHud(0);
      return true;
    };

    const getDeathCauseLabel = (cause: DeathCause) =>
      cause === 'fall'
        ? 'FALL'
        : cause === 'bomb'
          ? 'BLAST'
          : cause === 'grenade'
            ? 'FRAG'
            : cause === 'knife'
              ? 'KNIFE'
              : FIREARMS[cause].label;

    const beginSpectating = (killer: Enemy | null, cause: DeathCause = killer?.primaryWeapon ?? 'grenade', resolveRound = true) => {
      if (!playerAlive) return;
      setScope(false, false);
      beginPlayerDeathCamera(killer?.id ?? (cause === 'bomb' ? 29 : cause === 'fall' ? 23 : 17));
      playerAlive = false;
      resetPlayerPresentation();
      spectatorPresentationPosition = null;
      clearSquadRadioState();
      playerDeaths += 1;
      if (killer && cause !== 'bomb' && cause !== 'fall') {
        killer.kills += 1;
        killer.money = addMoney(killer.money, getPlayerKillReward(cause));
      }
      player.health = 0;
      player.velocity.set(0, 0, 0);
      player.damageSuppression = 0;
      player.damageTag = 0;
      player.shotPulse = 0;
      clearPlayerCasings();
      chooseSpectatedBot(killer);
      spectateEnds = simulationNowMs + 3000;
      pendingRoundResult = null;
      if (
        matchState.playerSide === 't' &&
        playerHasBomb &&
        bombState !== 'planted'
      ) {
        placePlayerBombDrop();
      }
      buyMenuOpen = false;
      setBuyOpen(false);
      pushKillFeed(
        `${killer?.name.toUpperCase() ?? (cause === 'bomb' ? 'BOMB' : cause === 'fall' ? 'WORLD' : 'YOU')}  [${getDeathCauseLabel(cause)}]  YOU`,
      );
      cancelPlayerReload();
      showWeaponView(null);
      message = spectatedEnemy
        ? `SPECTATING ${spectatedEnemy.name.toUpperCase()}`
        : 'YOUR SQUAD ELIMINATED';
      if (resolveRound) resolveTeamElimination();
      publishHud(0);
    };

    const eliminateEnemy = (
      enemy: Enemy,
      weapon: PlayerKillWeaponKind,
      weaponLabel: string,
      resolveRound = true,
    ) => {
      if (!enemy.alive) return;
      enemy.alive = false;
      cancelBotUtility(enemy.utility);
      enemy.special.cancelPending(simulationNowMs);
        syncBotSilencerVisuals(enemy);
        enemy.glockBurst.targetId = null;
      if (
        shouldClearFriendlyIntelForElimination(
          friendlyIntelTargetId,
          enemy.team,
          enemy.id,
        )
      )
        clearFriendlyIntel();
      enemy.movementSpeed = 0;
      enemy.verticalVelocity = 0;
      enemy.grounded = true;
      enemy.motionResolvedThisTick = false;
      enemy.deaths += 1;
      playerKills += 1;
      if (enemy === enemyDefuser) {
        enemyDefuser = null;
        enemyDefuseProgress = 0;
      }
      dropBomb(enemy);
      spawnEnemyFirearmDrop(enemy);
      beginBotDeathPose(enemy);
      playBotDeathThud(enemy.root.position);
      player.money = addMoney(player.money, getPlayerKillReward(weapon));
      pushKillFeed(`YOU  [${weaponLabel}]  ${enemy.name.toUpperCase()}`);
      message = `${enemies.filter((candidate) => candidate.alive).length} ${matchState.playerSide === 'ct' ? 'T' : 'DEFENDERS'} REMAIN`;
      if (resolveRound && enemies.every((candidate) => !candidate.alive)) {
        resolveTeamElimination();
      }
    };

    const eliminateBotWithCredit = (
      victim: Enemy,
      killer: Enemy | null,
      resolveRound = true,
      cause: DeathCause = killer?.primaryWeapon ?? 'bomb',
    ) => {
      if (!victim.alive) return;
      victim.alive = false;
      cancelBotUtility(victim.utility);
      victim.special.cancelPending(simulationNowMs);
        syncBotSilencerVisuals(victim);
        victim.glockBurst.targetId = null;
      if (
        shouldClearFriendlyIntelForElimination(
          friendlyIntelTargetId,
          victim.team,
          victim.id,
        )
      )
        clearFriendlyIntel();
      victim.movementSpeed = 0;
      victim.deaths += 1;
      if (killer && killer !== victim && killer.side !== victim.side && cause !== 'bomb' && cause !== 'fall') {
        killer.kills += 1;
        killer.money = addMoney(killer.money, getPlayerKillReward(cause));
      }
      if (victim === enemyDefuser) {
        enemyDefuser = null;
        enemyDefuseProgress = 0;
      }
      dropBomb(victim);
      spawnEnemyFirearmDrop(victim);
      beginBotDeathPose(victim);
      playBotDeathThud(victim.root.position);
      pushKillFeed(
        `${killer?.name.toUpperCase() ?? (cause === 'fall' ? 'WORLD' : 'BOMB')}  [${getDeathCauseLabel(cause)}]  ${victim.name.toUpperCase()}`,
      );
      if (spectatedEnemy === victim) chooseSpectatedBot(killer);
      if (
        victim.team === 'ally' &&
        !playerAlive &&
        allies.every((ally) => !ally.alive)
      )
        spectateEnds = simulationNowMs + 3000;
      if (resolveRound) resolveTeamElimination();
    };

    const captureFallCreditLedger = (): FallCreditLedger => Object.freeze({
      player: Object.freeze({ kills: playerKills, money: player.money }),
      bots: Object.freeze([...enemies, ...allies].map((bot) => Object.freeze({
        id: bot.id,
        team: bot.team,
        kills: bot.kills,
        money: bot.money,
      }))),
    });

    const fallCreditDeltas = (before: FallCreditLedger, after: FallCreditLedger) => Object.freeze({
      playerDelta: Object.freeze({
        kills: after.player.kills - before.player.kills,
        money: after.player.money - before.player.money,
      }),
      botDeltas: Object.freeze(after.bots.map((bot) => {
        const previous = before.bots.find((entry) => entry.id === bot.id && entry.team === bot.team);
        return Object.freeze({
          id: bot.id,
          team: bot.team,
          kills: bot.kills - (previous?.kills ?? 0),
          money: bot.money - (previous?.money ?? 0),
        });
      })),
    });

    const applyFallDamage = (
      targetId: string,
      team: 'player' | BotTeam,
      actor: { health: number; armor: number; helmet: boolean },
      alive: boolean,
      impactDownwardSpeed: number,
    ) => {
      if (!Number.isFinite(impactDownwardSpeed) || impactDownwardSpeed <= 0)
        return null;
      const fallCount = (fallLandingCounts.get(targetId) ?? 0) + 1;
      fallLandingCounts.set(targetId, fallCount);
      const before = Object.freeze({
        health: actor.health,
        armor: actor.armor,
        helmet: actor.helmet,
        alive,
      });
      const result = resolveFallDamage({
        health: actor.health,
        armor: actor.armor,
        helmet: actor.helmet,
        impactDownwardSpeed,
      });
      actor.health = result.health;
      return {
        targetId,
        team,
        fallCount,
        impactDownwardSpeed,
        before,
        result,
        creditLedgerBefore: captureFallCreditLedger(),
      };
    };

    const recordFallDamage = (
      application: NonNullable<ReturnType<typeof applyFallDamage>>,
      actor: { health: number; armor: number; helmet: boolean },
      alive: boolean,
      bombBefore: BombState,
    ) => {
      if (application.result.healthDamage <= 0) return;
      const creditLedgerAfter = captureFallCreditLedger();
      fallDamageReceipts = [...fallDamageReceipts, Object.freeze({
        buildIdentity: JKH129_BUILD_IDENTITY,
        targetId: application.targetId,
        team: application.team,
        cause: 'fall' as const,
        fallCount: application.fallCount,
        impactDownwardSpeed: application.impactDownwardSpeed,
        healthDamage: application.result.healthDamage,
        before: application.before,
        after: Object.freeze({
          health: actor.health,
          armor: actor.armor,
          helmet: actor.helmet,
          alive,
        }),
        killerId: null,
        creditLedger: Object.freeze({
          before: application.creditLedgerBefore,
          after: creditLedgerAfter,
          ...fallCreditDeltas(application.creditLedgerBefore, creditLedgerAfter),
        }),
        bombDropped:
          (bombBefore === 'carried' || bombBefore === 'planting') &&
          bombState === 'dropped',
        roundResult: completedRoundReceipt?.reason ?? pendingRoundResult?.reason ?? null,
      })];
    };

    const commitBotFallDamage = (bot: Enemy, impactDownwardSpeed: number) => {
      const application = applyFallDamage(
        `${bot.team}:${bot.id}`,
        bot.team,
        bot,
        bot.alive,
        impactDownwardSpeed,
      );
      if (!application) return false;
      const bombBefore = bombState;
      if (bot.health <= 0)
        eliminateBotWithCredit(bot, null, false, 'fall');
      recordFallDamage(application, bot, bot.alive, bombBefore);
      return !bot.alive;
    };

    const commitPlayerFallDamage = (impactDownwardSpeed: number) => {
      const application = applyFallDamage(
        'player',
        'player',
        player,
        playerAlive,
        impactDownwardSpeed,
      );
      if (!application) return false;
      const bombBefore = bombState;
      if (player.health <= 0) beginSpectating(null, 'fall', false);
      recordFallDamage(application, player, playerAlive, bombBefore);
      return !playerAlive;
    };

    const recordFallRoundResolution = () => {
      const roundResult = completedRoundReceipt?.reason ?? pendingRoundResult?.reason ?? null;
      if (!roundResult) return;
      fallDamageReceipts = fallDamageReceipts.map((receipt) =>
        receipt.roundResult === roundResult
          ? receipt
          : Object.freeze({ ...receipt, roundResult }));
    };

    const commitBotShot = (bot: Enemy, targetPosition: THREE.Vector3, speed: number, continuation = false) => {
      const silenced = bot.special.isSilenced(bot.primaryWeapon);
      const origin = bot.root.position.clone().add(new THREE.Vector3(0, 1.65, 0));
      const horizontalDistance = Math.hypot(targetPosition.x - origin.x, targetPosition.z - origin.z);
      const pitch = Math.atan2(targetPosition.y - 0.25 - origin.y, horizontalDistance);
      const directions = bot.shots.shot(bot.primaryWeapon, simulationNowMs, {
        grounded: bot.grounded, crouching: false, speed, scoped: bot.special.snapshot().zoom !== 0, silenced, burst: bot.special.snapshot().burst,
      }, bot.aimYaw, pitch, getBotAimCone(roundBotDifficulty, bot.profile.aimSkill, bot.suppression));
      const impacts = new Map<Enemy | null, { health: number; armor: number; helmet: boolean; healthDamage: number }>();
      let tracerEnd = origin.clone();
      let tracerHit = false;
      const shotRay = new THREE.Raycaster();
      shotRay.far = FIREARMS[bot.primaryWeapon].maximumRange;
      for (const [pellet, direction] of directions.entries()) {
        const rayDirection = new THREE.Vector3(direction.x, direction.y, direction.z);
        shotRay.set(origin, rayDirection);
        const savedNear = shotRay.near, savedFar = shotRay.far;
        let firstSegment = true;
        let result: ReturnType<typeof tracePenetratingBullet<{ victim: Enemy | null; hitGroup: HitGroup }>>;
        try {
          result = tracePenetratingBullet(bot.primaryWeapon, silenced, (near, far) => {
            shotRay.near = near; shotRay.far = far;
            const world = shotRay.intersectObjects(shotSurfaceMeshes, false)[0];
            const body = shotRay.intersectObjects(hitMeshes, false).find(hit => {
              const owner = hit.object.userData.enemy as Enemy;
              return owner?.alive && owner !== bot;
            });
            const characters: Array<{ distance: number; hitGroup: HitGroup; target: Enemy | null }> = [];
            if (body) characters.push({ distance: body.distance,
              hitGroup: body.object.userData.hitGroup as HitGroup, target: body.object.userData.enemy as Enemy });
            if (playerAlive) {
              const human = intersectPlayerShot(origin, direction,
                { x: player.position.x, y: player.position.y - PLAYER_HULL.eyeHeight, z: player.position.z },
                player.crouched ? PLAYER_HULL.crouchedHeight : PLAYER_HULL.standingHeight, near, far);
              if (human) characters.push({ ...human, target: null });
            }
            const hit = nearestShotImpact(world?.distance ?? null, characters, far);
            if (pellet === 0 && firstSegment) {
              tracerEnd = origin.clone().addScaledVector(rayDirection, hit.distance);
              tracerHit = hit.kind === 'target';
            }
            firstSegment = false;
            if (hit.kind === 'target') return { kind: 'target' as const,
              distance: hit.distance, hitGroup: hit.hitGroup,
              target: { victim: hit.target, hitGroup: hit.hitGroup } };
            if (hit.kind !== 'world' || !world) return null;
            const box = colliderBoxesByMesh.get(world.object);
            return { kind: 'world' as const, distance: world.distance,
              exitDistance: box ? getAxisAlignedBoxExitDistance(shotRay.ray.origin, shotRay.ray.direction, box.min, box.max) : null,
              material: getPenetrationMaterial(getSurfaceImpactKind(world.object)), collider: world.object };
          });
        } finally {
          shotRay.near = savedNear; shotRay.far = savedFar;
        }
        if (!result) continue;
        const { victim, hitGroup } = result.target;
        if ((victim?.side ?? matchState.playerSide) === bot.side) continue;
        const before = impacts.get(victim) ?? (victim ?? player);
        const damage = resolveBulletDamage(before, bot.primaryWeapon, hitGroup, result.damage);
        impacts.set(victim, { ...damage,
          healthDamage: (impacts.get(victim)?.healthDamage ?? 0) + damage.healthDamage });
      }
      bot.special.committedShot(bot.primaryWeapon, simulationNowMs, continuation);
      emitBotMuzzleFlash(bot, silenced);
      playEnemyShotSound(bot.root.position, bot.primaryWeapon, silenced);
      emitActorSound(bot.side, 'shot', bot.root.position,
        FIREARMS[bot.primaryWeapon].noiseRadius * (silenced ? 0.45 : 1), FIREARMS[bot.primaryWeapon].noiseMemory);
      showEnemyTracer(bot, tracerEnd, tracerHit);
      for (const [victim, damage] of impacts) {
        const actor = victim ?? player;
        actor.health = damage.health; actor.armor = damage.armor; actor.helmet = damage.helmet;
        if (victim) {
          suppressEnemy(victim, Math.min(1, damage.healthDamage / 40));
          if (victim.health <= 0) eliminateBotWithCredit(victim, bot, false);
        } else {
          player.damageSuppression = applyDamageSuppression(player.damageSuppression, damage.healthDamage);
          player.damageTag = applyPlayerDamageTag(player.damageTag, damage.healthDamage);
          showDamageFeedback(bot.root.position);
          if (player.health <= 0) beginSpectating(bot, bot.primaryWeapon, false);
        }
      }
      resolveTeamElimination();
    };

    const tryInsertGrenadeProjectile = (
      kind: UtilityKind, owner: UtilityOwner,
      origin: THREE.Vector3, velocity: THREE.Vector3,
    ) => {
      if (status !== 'active' ||
        ![...origin.toArray(), ...velocity.toArray()].every(Number.isFinite) ||
        !canInsertUtility(kind, Array.from(grenadeProjectiles, item => item.kind), smokeClouds.size)) return false;
      const mesh = new THREE.Mesh(
        kind === 'frag' ? new THREE.SphereGeometry(0.14, 10, 8)
          : new THREE.CylinderGeometry(0.1, 0.115, 0.28, 10),
        (kind === 'smoke' ? smokeBodyMaterial
          : kind === 'flash' ? flashBodyMaterial : grenadeBodyMaterial).clone(),
      );
      mesh.position.copy(origin);
      mesh.castShadow = true;
      scene.add(mesh);
      grenadeProjectiles.add({ kind, owner, mesh, velocity,
        fuseRemaining: GRENADE_FUSE_SECONDS[kind] });
      playEquipmentSound(`${kind}.throw`, origin);
      return true;
    };

    const throwGrenade = (now: number) => {
      const kind: UtilityKind = player.activeWeapon === 'smoke' ? 'smoke'
        : player.activeWeapon === 'flash' ? 'flash' : 'frag';
      const origin = camera.getWorldPosition(new THREE.Vector3());
      const direction = camera.getWorldDirection(new THREE.Vector3());
      origin.addScaledVector(direction, 0.62);
      const velocity = direction.multiplyScalar(12.5)
        .add(new THREE.Vector3(player.velocity.x, 3.4, player.velocity.z));
      if (!consumeInsertedUtility(player, kind, () => tryInsertGrenadeProjectile(
        kind, Object.freeze({ kind: 'player', side: matchState.playerSide }), origin, velocity,
      ))) return;
      player.nextShot = now + 850;
      firing = false;
      triggerReady = true;
      selectWeapon(player.secondaryWeapon ?? player.primaryWeapon ?? 'knife');
      message = kind === 'smoke' ? 'SMOKE OUT' : kind === 'flash' ? 'FLASHBANG OUT' : 'FRAG OUT';
      publishHud(0);
    };

    const throwBotUtility = (bot: Enemy, kind: UtilityKind, target: UtilityPosition) => {
      if (!bot.alive) return false;
      const origin = bot.root.position.clone().add(new THREE.Vector3(0, 1.55, 0));
      const offset = new THREE.Vector3(target.x - origin.x, 0, target.z - origin.z).normalize();
      origin.addScaledVector(offset, 0.5);
      const velocity = getBotUtilityVelocity(origin, target);
      if (!velocity) return false;
      return tryInsertGrenadeProjectile(kind,
        Object.freeze({ kind: 'bot', side: bot.side, bot }), origin,
        new THREE.Vector3(velocity.x, velocity.y, velocity.z));
    };

    const updateBotSilencer = (bot: Enemy, direct: boolean, utilityActive: boolean) => {
      stepBotSilencer(bot.special, {
        weapon: bot.primaryWeapon, now: simulationNowMs, active: status === 'active',
        alive: bot.alive, direct, memorySeconds: bot.combatMemory,
        reloadSeconds: bot.reloadTimer, utilityActive, fireCooldown: bot.fireCooldown,
        objectiveLocked: (bot === bombCarrier && bombState === 'planting') ||
          (bot === enemyDefuser && bombState === 'planted'),
      });
      syncBotSilencerVisuals(bot);
    };

    const updateBotScope = (bot: Enemy, direct: boolean, distance: number, utilityActive: boolean) =>
      stepBotScope(bot.special, {
        weapon: bot.primaryWeapon, now: simulationNowMs, active: status === 'active',
        alive: bot.alive, direct, blinded: simulationNowMs < bot.blindUntilMs,
        sightSeconds: bot.sightTime, distance, speed: bot.movementSpeed,
        reloadSeconds: bot.reloadTimer, utilityActive, fireCooldown: bot.fireCooldown,
        objectiveLocked: (bot === bombCarrier && bombState === 'planting') ||
          (bot === enemyDefuser && bombState === 'planted'),
      });

    const updateBotGlock = (bot: Enemy, targetId: EnemyCombatTargetId | null,
      direct: boolean, facing: boolean, distance: number, utilityActive: boolean) =>
      stepBotGlock(bot.special, bot.glockBurst, {
        weapon: bot.primaryWeapon, now: simulationNowMs, active: status === 'active',
        alive: bot.alive, direct, targetId, facing, distance,
        blinded: simulationNowMs < bot.blindUntilMs, sightSeconds: bot.sightTime,
        reloadSeconds: bot.reloadTimer, utilityActive, fireCooldown: bot.fireCooldown,
        magazine: bot.ammo.magazine,
        objectiveLocked: (bot === bombCarrier && bombState === 'planting') ||
          (bot === enemyDefuser && bombState === 'planted'),
      });

    const updateBotUtility = (bot: Enemy, direct: boolean, dt: number) => {
      // Memory was refreshed by direct sight/hearing before this adapter runs.
      // Resolve static map height once; the pending throw retains scalar coordinates.
      const position = bot.lastKnownOpponentPosition;
      const blocked = stepBotUtility(bot.utility, {
        dt, active: status === 'active', alive: bot.alive,
        blinded: simulationNowMs < bot.blindUntilMs, reloadSeconds: bot.reloadTimer,
        objectiveLocked: (bot === bombCarrier && bombState === 'planting') ||
          (bot === enemyDefuser && bombState === 'planted'),
        origin: bot.root.position,
        contact: { direct, sightSeconds: bot.sightTime, memorySeconds: bot.combatMemory,
          position: { x: position.x, y: getMapSupportHeight(position.x, position.z, position.y) + 0.16, z: position.z } },
        suppression: bot.suppression, inventory: bot,
      }, (kind, target) => throwBotUtility(bot, kind, target));
      if (blocked) {
        bot.burstShotsRemaining = 0;
        bot.fireCooldown = Math.max(bot.fireCooldown, 0.18);
      }
      return blocked;
    };

    const deploySmoke = (position: THREE.Vector3) => {
      if (smokeClouds.size >= 2) return; // In-flight reservations normally guarantee this.
      const geometry = new THREE.SphereGeometry(1, 12, 9);
      const material = new THREE.MeshBasicMaterial({
        color: 0x8b918a,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const group = new THREE.Group();
      const offsets: Array<[number, number, number, number]> = [
        [0, 1.15, 0, 1.55],
        [-1.15, 1.05, 0.2, 1.25],
        [1.1, 1.15, -0.15, 1.3],
        [-0.35, 1.8, -0.8, 1.2],
        [0.5, 1.85, 0.75, 1.16],
        [-0.75, 0.7, 0.85, 1.12],
        [0.85, 0.72, -0.82, 1.08],
      ];
      offsets.forEach(([x, y, z, scale]) => {
        const puff = new THREE.Mesh(geometry, material);
        puff.position.set(x, y, z);
        puff.scale.setScalar(scale);
        puff.renderOrder = 3;
        group.add(puff);
      });
      const groundProbe = new THREE.Raycaster(
        position.clone().add(new THREE.Vector3(0, 0.25, 0)),
        new THREE.Vector3(0, -1, 0),
        0,
        20,
      );
      const support = groundProbe.intersectObjects(obstacleMeshes, false)[0];
      group.position.set(
        position.x,
        (support?.point.y ?? 0) + 0.02,
        position.z,
      );
      group.scale.setScalar(0.18);
      scene.add(group);
      smokeClouds.add({ group, geometry, material, age: 0 });
      playSmokePop();
      message = 'SMOKE DEPLOYED — SIGHTLINE BLOCKED';
      publishHud(0);
    };

    const spawnExplosionEffect = (
      blastPosition: THREE.Vector3,
      now: number,
      intensity = 9,
      range = 15,
      color = 0xff8a35,
    ) => {
      const blastMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 14, 10),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.72,
          depthWrite: false,
        }),
      );
      blastMesh.position.copy(blastPosition);
      const blastLight = new THREE.PointLight(color, intensity, range, 2);
      blastLight.userData.transient = true;
      blastLight.position.copy(blastPosition);
      scene.add(blastMesh, blastLight);
      explosionEffects.add({
        mesh: blastMesh,
        light: blastLight,
        startedAt: now,
      });
    };

    const isBlastCovered = (origin: THREE.Vector3, target: THREE.Vector3) => {
      const direction = target.clone().sub(origin);
      const distance = direction.length();
      if (distance <= 0.001) return false;
      const obstruction = new THREE.Raycaster(origin, direction.normalize())
        .intersectObjects(obstacleMeshes, false)[0];
      return Boolean(obstruction && obstruction.distance < Math.max(0, distance - 0.25));
    };

    const applyBlastToActors = (kind: ExplosiveKind, origin: THREE.Vector3, owner: UtilityOwner | null) => {
      const ownerId = owner?.kind === 'player' ? 'player' : owner ? `${owner.bot.team}:${owner.bot.id}` : null;
      const source: BlastOwner | null = owner && ownerId ? { id: ownerId, side: owner.side } : null;
      const targets = [
        { id: 'player', side: matchState.playerSide, alive: playerAlive,
          health: player.health, armor: player.armor, helmet: player.helmet,
          position: player.position.clone().add(new THREE.Vector3(0, 1.1 - PLAYER_HULL.eyeHeight, 0)), bot: null },
        ...bots.map(bot => ({ id: `${bot.team}:${bot.id}`, side: bot.side, alive: bot.alive,
          health: bot.health, armor: bot.armor, helmet: bot.helmet,
          position: bot.root.position.clone().add(new THREE.Vector3(0, 1.1, 0)), bot })),
      ];
      const results = resolveBlast(kind, source, targets.map(target => ({ ...target,
        distance: origin.distanceTo(target.position), covered: isBlastCovered(origin, target.position),
      })));
      // Every damage outcome is computed before death/drop callbacks. The caller
      // alone settles the round after the complete blast population is applied.
      for (let index = 0; index < results.length; index++) {
        const result = results[index];
        if (result.healthDamage <= 0) continue;
        const target = targets[index].bot;
        if (target) {
          target.health = result.health;
          target.armor = result.armor;
          target.helmet = result.helmet;
          suppressEnemy(target, Math.min(1, result.healthDamage / 45));
          if (result.killed) {
            if (result.creditId === 'player') eliminateEnemy(target, 'grenade', 'FRAG', false);
            else eliminateBotWithCredit(target, owner?.kind === 'bot' ? owner.bot : null, false,
              kind === 'bomb' ? 'bomb' : 'grenade');
          }
        } else {
          player.health = result.health;
          player.armor = result.armor;
          player.helmet = result.helmet;
          showDamageFeedback(origin);
          if (result.killed) beginSpectating(owner?.kind === 'bot' ? owner.bot : null,
            kind === 'bomb' ? 'bomb' : 'grenade', false);
        }
      }
    };

    const hasClearWorldLine = (
      origin: THREE.Vector3,
      target: THREE.Vector3,
    ) => {
      const delta = target.clone().sub(origin);
      const distance = delta.length();
      if (distance < 0.001) return true;
      const obstruction = new THREE.Raycaster(
        origin,
        delta.normalize(),
      ).intersectObjects(obstacleMeshes, false)[0];
      return !obstruction || obstruction.distance >= distance - 0.12;
    };

    const applyPlayerBlind = (durationSeconds: number) => {
      if (durationSeconds <= 0) return;
      const nextUntil = simulationNowMs + durationSeconds * 1000;
      if (nextUntil <= playerBlindUntilMs) return;
      playerBlindUntilMs = nextUntil;
      playerBlindDurationSeconds = durationSeconds;
    };

    const suppressEnemy = (enemy: Enemy, intensity: number) => {
      enemy.suppression = Math.min(1, enemy.suppression + intensity);
      enemy.burstShotsRemaining = 0;
      enemy.combatMovement = 'retreat';
      enemy.movementDecisionTimer = 0.55 + Math.random() * 0.35;
      enemy.fireCooldown = Math.max(enemy.fireCooldown, 0.28);
    };

    const detonateGrenade = (projectile: GrenadeProjectile, now: number) => {
      if (!grenadeProjectiles.has(projectile)) return;
      const grenadeKind = projectile.kind;
      const grenadeOwner = projectile.owner;
      const blastPosition = projectile.mesh.position.clone();
      disposeGrenadeProjectile(projectile);
      if (grenadeKind === 'smoke') {
        deploySmoke(blastPosition);
        return;
      }
      if (grenadeKind === 'flash') {
        playFlashbangSound();
        spawnExplosionEffect(blastPosition, now, 13, 19, 0xfbf8e8);

        if (playerAlive) {
          const playerEye = playerCombatEyePosition.clone();
          const playerToFlash = blastPosition.clone().sub(playerEye);
          const playerDistance = playerToFlash.length();
          const playerForward = new THREE.Vector3(
            -Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch),
            -Math.cos(player.yaw) * Math.cos(player.pitch),
          );
          const playerDuration = getFlashBlindDuration({
            distance: playerDistance,
            viewDot:
              playerDistance <= 0.001
                ? 1
                : playerForward.dot(playerToFlash.normalize()),
            hasLineOfSight: hasClearWorldLine(blastPosition, playerEye),
          });
          applyPlayerBlind(playerDuration);
        }

        bots.forEach((target) => {
          if (!target.alive) return;
          const enemyEye = target.root.position
            .clone()
            .add(new THREE.Vector3(0, 1.65, 0));
          const enemyToFlash = blastPosition.clone().sub(enemyEye);
          const distance = enemyToFlash.length();
          const forward = new THREE.Vector3(
            -Math.sin(target.aimYaw),
            0,
            -Math.cos(target.aimYaw),
          );
          const duration = getFlashBlindDuration(
            {
              distance,
              viewDot:
                distance <= 0.001 ? 1 : forward.dot(enemyToFlash.normalize()),
              hasLineOfSight: hasClearWorldLine(blastPosition, enemyEye),
            },
          );
          if (duration <= 0) return;
          target.blindUntilMs = Math.max(
            target.blindUntilMs,
            simulationNowMs + duration * 1000,
          );
          target.sightTime = 0;
          target.burstShotsRemaining = 0;
          target.fireCooldown = Math.max(target.fireCooldown, duration + 0.12);
        });
        message = 'FLASHBANG DETONATED';
        publishHud(0);
        return;
      }
      playExplosionSound();
      spawnExplosionEffect(blastPosition, now);

      applyBlastToActors('frag', blastPosition, grenadeOwner);
      const roundResolved = resolveTeamElimination();
      if (!roundResolved && status === 'active') {
        message = !playerAlive && spectatedEnemy
          ? `SPECTATING ${spectatedEnemy.name.toUpperCase()}` : 'FRAG DETONATED';
        publishHud(0);
      }
    };

    const detonateBomb = (now: number) => {
      const blastPosition = bomb.getWorldPosition(new THREE.Vector3());
      objectiveIntel.clear();
      bombState = 'detonated';
      bombBeacon.intensity = 0;
      canDefuse = false;
      defuseProgress = 0;
      playExplosionSound('bomb');
      spawnExplosionEffect(blastPosition, now, 16, 26);
      bomb.visible = false;
      applyBlastToActors('bomb', blastPosition, null);
    };

    const raycaster = new THREE.Raycaster();
    const shoot = (burstContinuation = false, knifeStab = false) => {
      const now = simulationNowMs;
      if (!canCommitWeaponAction({
        active: status === 'active', alive: playerAlive,
        controlsActive: document.pointerLockElement === renderer.domElement || touchPlaying,
        buyOpen: buyMenuOpen, now, freezeEnds, equipReadyAt: player.equipReadyAtMs,
        nextShot: player.nextShot, specialReady: weaponSpecial.ready(player.activeWeapon, now),
        burstContinuation,
      })) return;
      if (player.activeWeapon === 'bomb') return;
      interruptPlayerPlant();
      const isKnife = player.activeWeapon === 'knife';
      const isGrenade = player.activeWeapon === 'grenade';
      const isSmoke = player.activeWeapon === 'smoke';
      const isFlash = player.activeWeapon === 'flash';
      if (isGrenade || isSmoke || isFlash) {
        throwGrenade(now);
        return;
      }
      const firearmKind = isFirearmKind(player.activeWeapon)
        ? player.activeWeapon
        : null;
      const definition = firearmKind ? FIREARMS[firearmKind] : null;
      const firearmAmmo = firearmKind ? player.ammo[firearmKind] : null;
      if (player.reload) {
        const canInterruptShellReload =
          firearmKind === 'shotgun' && (firearmAmmo?.magazine ?? 0) > 0;
        if (!canInterruptShellReload) return;
        cancelPlayerReload(true);
      }
      if (firearmAmmo && firearmAmmo.magazine <= 0) {
        if (firearmAmmo.reserve > 0) beginReload();
        else if (firearmKind && dryFireArmed) {
          dryFireArmed = false;
          player.nextShot = now + Math.max(180, definition!.fireIntervalMs);
          playWeaponActionSound(firearmKind, 'dryFire');
          message = `${definition!.label} EMPTY`;
          publishHud(0);
        }
        return;
      }

      const autoUnscopeAfterShot = shouldAutoUnscopeAfterCommittedShot(
        player.activeWeapon,
        player.scoped,
        firearmAmmo !== null,
      );
      if (firearmAmmo) {
        firearmAmmo.magazine -= 1;
        if (firearmKind === 'shotgun') lastShotgunShotAt = now;
        if (firearmKind === 'sniper') lastSniperShotAt = now;
      }
      weaponSpecial.committedShot(player.activeWeapon, now, burstContinuation);
      if (!burstContinuation) player.nextShot = now + (isKnife ? getKnifeAttack(knifeStab, false).cooldownMs :
        firearmKind === 'glock18' && weaponSpecial.snapshot().burst ? SPECIAL_TIMINGS.glockBurst : definition!.fireIntervalMs);
      const spread = getCurrentSpread();
      player.recoil = Math.min(
        definition?.recoil.maxPenalty ?? 0.12,
        player.recoil + (definition?.recoil.spreadKick ?? 0.075),
      );
      if (definition && firearmKind) {
        const recoilAdvance = weaponBallistics.shot(firearmKind, simulationNowMs, getBallisticPose());
        player.shotPulse = 1;
        player.shotSide = recoilAdvance.kick.yaw < 0 ? -1 : 1;
        const weaponView = weaponViews[firearmKind];
        if (weaponView.authoredAnimation) lastAuthoredShotAt[firearmKind] = now;
        weaponView.authoredAnimation?.sample({
          nowMs: now,
          fireStartedAtMs: lastAuthoredShotAt[firearmKind],
        });
        const muzzles =
          weaponView.muzzles ?? (weaponView.muzzle ? [weaponView.muzzle] : []);
        const muzzleIndex =
          firearmKind === 'elite' && muzzles.length > 1
            ? player.ammo.elite.magazine % muzzles.length
            : 0;
        const firedMuzzles =
          firearmKind === 'elite' && muzzles.length > 1
            ? [muzzles[muzzleIndex]]
            : muzzles;
        const visualProfile = getCombatVisualWeaponProfile(
          'player',
          firearmKind,
        );
        firedMuzzles.forEach((muzzle) => {
          applyMuzzleFlashProfile(muzzle, visualProfile);
          muzzle.intensity = weaponSpecial.isSilenced(firearmKind) ? 0 : visualProfile.muzzleIntensityMax;
        });
        playShotSound(firearmKind);
        spawnPlayerCasing(firearmKind, muzzleIndex);
      }
      if (isKnife) playEquipmentSound(knifeStab ? 'knife.stab' : 'knife.swing');
      emitActorSound(matchState.playerSide, 'shot', player.position,
        (definition?.noiseRadius ?? 5) * (weaponSpecial.isSilenced(player.activeWeapon) ? 0.45 : 1),
        definition?.noiseMemory ?? 0.5,
      );

      const impacts = new Map<
        Enemy,
        { damage: number; health: number; armor: number; helmet: boolean; headshot: boolean; mesh: THREE.Mesh }
      >();
      const pellets = definition?.pellets ?? 1;
      const surfaceHits: Array<{
        hit: THREE.Intersection<THREE.Object3D>;
        direction: THREE.Vector3;
      }> = [];
      const surfaceHitLimit = firearmKind === 'shotgun' ? 4 : 1;
      for (let pellet = 0; pellet < pellets; pellet += 1) {
        const aim = sampleClassicSpread(spread, spreadRandom);
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        raycaster.ray.direction
          .addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), aim.x)
          .addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1), aim.y)
          .normalize();
        const hit = raycaster
          .intersectObjects(hitMeshes, false)
          .find((candidate) => {
            const enemy = candidate.object.userData.enemy as Enemy;
            return enemy?.alive;
          });
        const wallHit = raycaster.intersectObjects(shotSurfaceMeshes, false)[0];
        const directImpact = resolveHitscanImpact({
          targetDistance: hit?.distance ?? null,
          worldDistance: wallHit?.distance ?? null,
          maximumDistance: isKnife ? getKnifeAttack(knifeStab, false).range : undefined,
        });
        let resolvedImpact = directImpact;
        let effectiveHit = hit;
        let bulletDamage: number | null = null;
        if (firearmKind) {
          const savedNear = raycaster.near;
          const savedFar = raycaster.far;
          try {
            const result = tracePenetratingBullet(firearmKind, weaponSpecial.isSilenced(firearmKind), (near, far) => {
              raycaster.near = near;
              raycaster.far = far;
              const targetHit = raycaster.intersectObjects(hitMeshes, false).find(candidate =>
                (candidate.object.userData.enemy as Enemy)?.alive);
              const surfaceHit = raycaster.intersectObjects(shotSurfaceMeshes, false)[0];
              // Surfaces win ties; friendly characters terminate the ray too.
              if (targetHit && (!surfaceHit || targetHit.distance < surfaceHit.distance)) return {
                kind: 'target' as const, distance: targetHit.distance,
                hitGroup: targetHit.object.userData.hitGroup as HitGroup, target: targetHit,
              };
              if (!surfaceHit) return null;
              const box = colliderBoxesByMesh.get(surfaceHit.object);
              return {
                kind: 'world' as const, distance: surfaceHit.distance,
                exitDistance: box ? getAxisAlignedBoxExitDistance(raycaster.ray.origin, raycaster.ray.direction, box.min, box.max) : null,
                material: getPenetrationMaterial(getSurfaceImpactKind(surfaceHit.object)),
                collider: surfaceHit.object,
              };
            });
            resolvedImpact = result ? 'target' : directImpact === 'world' ? 'world' : 'none';
            effectiveHit = result?.target;
            bulletDamage = result?.damage ?? null;
          } finally {
            raycaster.near = savedNear;
            raycaster.far = savedFar;
          }
        }
        if (
          directImpact === 'world' &&
          wallHit &&
          firearmKind &&
          surfaceHits.length < surfaceHitLimit
        )
          surfaceHits.push({
            hit: wallHit,
            direction: raycaster.ray.direction.clone(),
          });
        if (resolvedImpact !== 'target' || !effectiveHit) continue;
        const enemy = effectiveHit.object.userData.enemy as Enemy;
        if (enemy.team === 'ally') continue;
        const hitGroup = effectiveHit.object.userData.hitGroup as HitGroup;
        const headshot = !isKnife && hitGroup === 'head';
        const previous = impacts.get(enemy);
        const before = {
          health: previous?.health ?? enemy.health,
          armor: previous?.armor ?? enemy.armor,
          helmet: previous?.helmet ?? enemy.helmet,
        };
        const resolved = isKnife
          ? { ...before, health: Math.max(0, before.health - getKnifeAttack(knifeStab, true, Math.cos(player.yaw - enemy.bodyYaw) > 0.8).damage) }
          : resolveBulletDamage(before, firearmKind!, hitGroup, bulletDamage ?? 0);
        impacts.set(enemy, {
          health: resolved.health, armor: resolved.armor, helmet: resolved.helmet,
          damage: (previous?.damage ?? 0) + before.health - resolved.health,
          headshot: (previous?.headshot ?? false) || headshot,
          mesh: (previous?.mesh ?? effectiveHit.object) as THREE.Mesh,
        });
      }
      if (isKnife && impacts.size) player.nextShot = now + getKnifeAttack(knifeStab, true).cooldownMs;
      let persistentMarkSpawned = false;
      surfaceHits.forEach(({ hit: surfaceHit, direction }) => {
        spawnSurfaceImpact(surfaceHit, direction, simulationNowMs);
        const surface = getSurfaceImpactKind(surfaceHit.object);
        const markKind = getPersistentBulletMarkKind(surface);
        if (
          markKind &&
          firearmKind &&
          shouldSpawnPersistentBulletMark({
            impact: 'world',
            firearmKind,
            surface,
            alreadySpawned: persistentMarkSpawned,
          })
        )
          persistentMarkSpawned = spawnPersistentBulletMark(
            surfaceHit,
            firearmKind,
            markKind,
          );
      });

      const hitConfirmation = chooseHitConfirmation(
        Array.from(impacts, ([enemy, impact]) =>
          getHitConfirmation(
            impact.headshot,
            enemy.health - impact.damage <= 0,
          ),
        ),
      );
      const impactCue = selectPlayerImpactCue({
        confirmation: hitConfirmation,
        nowMs: simulationNowMs,
        nextBodyImpactAtMs,
      });
      nextBodyImpactAtMs = impactCue.nextBodyImpactAtMs;
      playPlayerImpactCue(impactCue.cue);
      impacts.forEach((impact, enemy) => {
        enemy.health = impact.health;
        enemy.armor = impact.armor;
        enemy.helmet = impact.helmet;
        if (enemy === enemyDefuser && enemyDefuseProgress > 0)
          enemyDefuseProgress = 0;
        suppressEnemy(enemy, Math.min(1, impact.damage / 34));
        setCharacterHitEmissive(impact.mesh, 0x7d1b11);
        const flashTimer = window.setTimeout(() => {
          setCharacterHitEmissive(impact.mesh, 0x000000);
          cleanupTimers.delete(flashTimer);
        }, 70);
        cleanupTimers.add(flashTimer);
        if (enemy.health <= 0)
          eliminateEnemy(
            enemy,
            isKnife ? 'knife' : firearmKind!,
            isKnife
              ? 'KNIFE'
              : `${definition!.label}${impact.headshot ? ' HS' : ''}`,
            false,
          );
      });
      resolveTeamElimination();
      if (autoUnscopeAfterShot) setScope(false, false);
      publishHud(0);
    };

    const issueBackupCall = () => {
      const livingAllyCount = allies.filter((ally) => ally.alive).length;
      if (
        !canIssueBackupCall({
          active:
            status === 'active' &&
            (document.pointerLockElement === renderer.domElement ||
              touchPlaying),
          playerAlive,
          freezeSeconds: Math.max(0, (freezeEnds - simulationNowMs) / 1000),
          nowMs: simulationNowMs,
          nextCallAtMs: nextBackupCallAtMs,
          livingAllyCount,
        })
      )
        return false;

      const reservedBackupTargets: Array<{ x: number; z: number }> = [];
      allies
        .filter((ally) => ally.alive)
        .forEach((ally) => {
          const target = getSquadBackupTarget(
            player.position.x,
            player.position.z,
            ally.id,
            (x, z) =>
              staticWorldCollides(x, z) ||
              allies.some(
                (other) =>
                  other !== ally &&
                  other.alive &&
                  Math.hypot(
                    other.root.position.x - x,
                    other.root.position.z - z,
                  ) < SQUAD_BACKUP_TARGET_SEPARATION,
              ) ||
              Math.hypot(player.position.x - x, player.position.z - z) < 0.82,
            reservedBackupTargets,
          );
          const assignedTarget = target ?? {
            x: ally.root.position.x,
            z: ally.root.position.z,
          };
          backupCallTargets[ally.id].set(assignedTarget.x, assignedTarget.z);
          reservedBackupTargets.push(assignedTarget);
        });
      backupRequestAgeSeconds = 0;
      nextBackupCallAtMs = simulationNowMs + SQUAD_BACKUP_CALL_COOLDOWN_MS;
      radioCalloutText = 'RADIO · NEED BACKUP — SQUAD REGROUPING';
      radioCalloutUntilMs = simulationNowMs + SQUAD_BACKUP_CALLOUT_MS;
      publishHud(0);
      return true;
    };

    let touchLookPointer: number | null = null;
    let lastTouchX = 0;
    let lastTouchY = 0;
    const releaseTransientInput = (pauseTouch = true) => {
      simulationClock.resetDebt();
      gameplayActions.clear();
      const released = clearInputLatches({
        keys,
        firing,
        triggerReady,
        dropRequested,
        touchLookPointer,
      });
      keys.clear();
      keyboardPlaytestTapLatches = clearKeyboardPlaytestTapLatches();
      firing = released.firing;
      triggerReady = released.triggerReady;
      jumpReady = true;
      dropRequested = released.dropRequested;
      touchLookPointer = released.touchLookPointer;
      dryFireArmed = true;
      weaponSpecial.cancelPending(simulationNowMs);
      syncSilencerVisuals();
      playerMovement.reset();
      playerInput.reset();
      movementNeedsSeed = true;
      playerInterpolationOffset.set(0, 0, 0);
      if (pauseTouch) touchPlaying = false;
      player.velocity.x = 0;
      player.velocity.z = 0;
      resetPlayerPresentation();
      buyMenuOpen = false;
      setBuyOpen(false);
      setScoreboardOpen(false);
      setLocked(false);
      setScope(false, false);
      cancelPlayerReload(true);
      publishHud(0);
    };
    const tryPlayerJump = () => {
      if (!(player.grounded && playerAlive && simulationNowMs >= freezeEnds &&
        status === 'active' &&
        (document.pointerLockElement === renderer.domElement || touchPlaying))) return false;
      return playerInput.jump(movementEventTime());
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        event.preventDefault();
        releaseTransientInput(true);
        if (document.pointerLockElement === renderer.domElement)
          document.exitPointerLock();
        return;
      }
      if (event.code === 'ArrowRight' && !event.repeat && cycleSpectatedBot()) {
        event.preventDefault();
        return;
      }
      if (event.code === 'KeyN') {
        if (!event.repeat && requestSkipBotRoundWait()) event.preventDefault();
        return;
      }
      if (event.code === 'KeyZ' && !event.repeat) {
        event.preventDefault();
        issueBackupCall();
        return;
      }
      if (keyboardPlaytestInputEnabled && touchPlaying && status === 'active')
        keyboardPlaytestTapLatches = latchKeyboardPlaytestTap(
          keyboardPlaytestTapLatches,
          event.code,
          performance.now(),
        );
      keys.add(event.code);
      enqueueMovementControls();
      if (event.code === 'KeyF') {
        firing = true;
        if (triggerReady) {
          triggerReady = false;
          queueGameplayAction('fire');
        }
      }
      if (event.code === 'Tab') {
        event.preventDefault();
        setScoreboardOpen(true);
      }
      if (event.code === 'KeyV' && !event.repeat) toggleScope();
      if (event.code === 'KeyR') beginReload();
      if (event.code === 'KeyB') toggleBuyMenu();
      if (event.code === 'KeyG' && !event.repeat) dropRequested = true;
      if (buyMenuOpen) {
        const shiftedPistolSlot =
          event.shiftKey && /^Digit[1-5]$/.test(event.code)
            ? `Pistol${event.code.slice(-1)}`
            : event.code;
        purchase(shiftedPistolSlot);
      } else if (event.code === 'Digit1') {
        if (player.primaryWeapon) selectWeapon(player.primaryWeapon);
        else {
          message = 'PRIMARY SLOT EMPTY — PRESS B';
          publishHud(0);
        }
      } else if (event.code === 'Digit2') {
        if (player.secondaryWeapon) selectWeapon(player.secondaryWeapon);
        else {
          message = 'SECONDARY SLOT EMPTY — PRESS B';
          publishHud(0);
        }
      } else if (event.code === 'Digit3') selectWeapon('knife');
      else if (event.code === 'Digit4') cycleGrenadeSlot();
      else if (event.code === 'Digit5') selectWeapon('bomb');
      if (event.code === 'Space') {
        event.preventDefault();
        const jumpButton = updateJumpButton(jumpReady, true, event.repeat);
        jumpReady = jumpButton.jumpReady;
        if (jumpButton.shouldJump) tryPlayerJump();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.code);
      enqueueMovementControls();
      if (event.code === 'KeyF') {
        firing = false;
        triggerReady = true;
        dryFireArmed = true;
      }
      if (event.code === 'Space')
        jumpReady = updateJumpButton(jumpReady, false).jumpReady;
      if (event.code === 'Tab') {
        event.preventDefault();
        setScoreboardOpen(false);
      }
    };
    const onMouseMove = (event: MouseEvent) => {
      if (
        document.pointerLockElement !== renderer.domElement ||
        status !== 'active' ||
        !playerAlive
      )
        return;
      const sensitivity = engineSettingsRef.current.sensitivity;
      const scopeSensitivity = getWeaponSensitivityMultiplier(
        player.activeWeapon,
        player.scoped,
      );
      player.yaw -= event.movementX * 0.0019 * sensitivity * scopeSensitivity;
      player.pitch -= event.movementY * 0.0019 * sensitivity * scopeSensitivity;
      player.pitch = THREE.MathUtils.clamp(
        player.pitch,
        -Math.PI / 2 + 0.08,
        Math.PI / 2 - 0.08,
      );
      enqueueMovementControls();
    };
    const onMouseDown = (event: MouseEvent) => {
      if (
        event.button === 2 &&
        document.pointerLockElement === renderer.domElement
      ) {
        event.preventDefault();
        toggleScope();
        return;
      }
      if (
        event.button === 0 &&
        document.pointerLockElement === renderer.domElement
      ) {
        firing = true;
        if (triggerReady) {
          triggerReady = false;
          queueGameplayAction('fire');
        }
      }
    };
    const onMouseUp = (event: MouseEvent) => {
      if (event.button === 0) {
        firing = false;
        triggerReady = true;
        dryFireArmed = true;
      }
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    const onPointerLockChange = () => {
      const isLocked = document.pointerLockElement === renderer.domElement;
      if (isLocked) {
        setControlNotice('');
        if (!touchPlaying) setLocked(true);
        renderer.domElement.focus();
        return;
      }
      if (!touchPlaying) releaseTransientInput(false);
    };
    const onPointerLockError = () => {
      if (touchPlaying) return;
      releaseTransientInput(false);
      setControlNotice(
        'Mouse capture was blocked. Click Deploy / Resume and allow mouse control to retry.',
      );
    };
    const onWindowBlur = () => {
      releaseTransientInput(true);
      if (document.pointerLockElement === renderer.domElement)
        document.exitPointerLock();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') onWindowBlur();
    };
    const onResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      syncPresentationCamera();
      syncRenderResolution();
    };

    const onCanvasPointerDown = (event: PointerEvent) => {
      if (
        event.pointerType !== 'touch' ||
        !touchPlaying ||
        !playerAlive ||
        event.clientX < window.innerWidth * 0.34
      )
        return;
      touchLookPointer = event.pointerId;
      lastTouchX = event.clientX;
      lastTouchY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onCanvasPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== touchLookPointer || !touchPlaying || !playerAlive)
        return;
      const sensitivity = engineSettingsRef.current.sensitivity;
      const scopeSensitivity = getWeaponSensitivityMultiplier(
        player.activeWeapon,
        player.scoped,
      );
      player.yaw -=
        (event.clientX - lastTouchX) * 0.0042 * sensitivity * scopeSensitivity;
      player.pitch -=
        (event.clientY - lastTouchY) * 0.0042 * sensitivity * scopeSensitivity;
      player.pitch = THREE.MathUtils.clamp(
        player.pitch,
        -Math.PI / 2 + 0.08,
        Math.PI / 2 - 0.08,
      );
      lastTouchX = event.clientX;
      lastTouchY = event.clientY;
      enqueueMovementControls();
    };
    const onCanvasPointerUp = (event: PointerEvent) => {
      if (event.pointerId === touchLookPointer) touchLookPointer = null;
    };

    touchInputRef.current = {
      setKey: (code, pressed) => {
        if (pressed) keys.add(code);
        else keys.delete(code);
        enqueueMovementControls();
      },
      setFiring: (pressed) => {
        firing = pressed;
        if (pressed && triggerReady) {
          triggerReady = false;
          queueGameplayAction('fire');
        } else if (!pressed) {
          triggerReady = true;
          dryFireArmed = true;
        }
      },
      jump: () => {
        tryPlayerJump();
      },
      reload: beginReload,
      toggleScope,
      dropWeapon: () => {
        dropRequested = true;
      },
      cycleWeapon: () => {
        const availableWeapons: WeaponKind[] = [];
        if (player.primaryWeapon) availableWeapons.push(player.primaryWeapon);
        if (player.secondaryWeapon)
          availableWeapons.push(player.secondaryWeapon);
        availableWeapons.push('knife');
        if (player.grenades > 0) availableWeapons.push('grenade');
        if (player.smokes > 0) availableWeapons.push('smoke');
        if (player.flashes > 0) availableWeapons.push('flash');
        if (
          playerHasBomb &&
          (bombState === 'carried' || bombState === 'planting')
        )
          availableWeapons.push('bomb');
        const currentIndex = availableWeapons.indexOf(player.activeWeapon);
        const nextWeapon =
          availableWeapons[(currentIndex + 1) % availableWeapons.length];
        selectWeapon(nextWeapon);
      },
      cycleSpectator: () => {
        cycleSpectatedBot();
      },
      callBackup: issueBackupCall,
      toggleBuy: toggleBuyMenu,
      setScoreboard: setScoreboardOpen,
      start: () => {
        touchPlaying = true;
        setControlNotice('');
        setLocked(true);
      },
      pause: () => releaseTransientInput(true),
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('pointerlockerror', onPointerLockError);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('resize', onResize);
    renderer.domElement.addEventListener('pointerdown', onCanvasPointerDown);
    renderer.domElement.addEventListener('pointermove', onCanvasPointerMove);
    renderer.domElement.addEventListener('pointerup', onCanvasPointerUp);
    renderer.domElement.addEventListener('pointercancel', onCanvasPointerUp);

    const updateGrenadeSimulation = (now: number, dt: number) => {
      for (const projectile of Array.from(grenadeProjectiles)) {
        if (status !== 'active') break;
        const { mesh, velocity } = projectile;
        velocity.y -= GRENADE_GRAVITY * dt;

        const nextX = mesh.position.x + velocity.x * dt;
        if (grenadeCollides(nextX, mesh.position.y, mesh.position.z))
          velocity.x *= -0.48;
        else mesh.position.x = nextX;

        const nextZ = mesh.position.z + velocity.z * dt;
        if (grenadeCollides(mesh.position.x, mesh.position.y, nextZ))
          velocity.z *= -0.48;
        else mesh.position.z = nextZ;

        const nextY = mesh.position.y + velocity.y * dt;
        const floor = getMapSupportHeight(mesh.position.x, mesh.position.z, mesh.position.y) + 0.16;
        if (nextY <= floor) {
          mesh.position.y = floor;
          velocity.y =
            Math.abs(velocity.y) > 1.2 ? Math.abs(velocity.y) * 0.42 : 0;
          velocity.x *= 0.78;
          velocity.z *= 0.78;
        } else if (grenadeCollides(mesh.position.x, nextY, mesh.position.z)) {
          velocity.y *= -0.38;
        } else {
          mesh.position.y = nextY;
        }

        mesh.rotation.x += velocity.z * dt * 1.8;
        mesh.rotation.z -= velocity.x * dt * 1.8;
        projectile.fuseRemaining = advanceGrenadeFuse(
          projectile.fuseRemaining,
          dt,
        );
        if (projectile.fuseRemaining <= 0) detonateGrenade(projectile, now);
      }
    };

    const updateExplosionEffects = (now: number) => {
      explosionEffects.forEach((effect) => {
        const progress = Math.min(1, (now - effect.startedAt) / 360);
        effect.mesh.scale.setScalar(1 + progress * 8.5);
        (effect.mesh.material as THREE.MeshBasicMaterial).opacity =
          (1 - progress) * 0.72;
        effect.light.intensity = (1 - progress) * 9;
        if (progress < 1) return;
        scene.remove(effect.mesh, effect.light);
        effect.mesh.geometry.dispose();
        (effect.mesh.material as THREE.Material).dispose();
        explosionEffects.delete(effect);
      });
    };

    const updateSmokeClouds = (dt: number) => {
      smokeClouds.forEach((cloud) => {
        cloud.age += dt;
        const density = getSmokeCloudOpacity(cloud.age);
        const bloom = Math.min(1, cloud.age / 0.65);
        cloud.group.scale.setScalar(0.18 + bloom * 0.82);
        cloud.material.opacity = density * 0.17;
        if (cloud.age < 13) return;
        scene.remove(cloud.group);
        cloud.geometry.dispose();
        cloud.material.dispose();
        smokeClouds.delete(cloud);
      });
    };

    let manualVisualReplayActive = false;
    let manualReplayRemainderMs = 0;
    const scheduleNextFrame = () => {
      if (skipBotRoundRequested && status === 'active' && !playerAlive) {
        fastForwardClockActive = true;
        fastForwardTimer = window.setTimeout(() => {
          fastForwardTimer = null;
          clock(lastFrame + 50);
        }, 0);
        return;
      }
      if (fastForwardClockActive) {
        fastForwardClockActive = false;
        lastFrame = performance.now();
      }
      animationFrame = requestAnimationFrame(clock);
    };

    let tickPresentation: (() => void) | undefined;
    const requestTickPresentation = (apply?: () => void) => { tickPresentation = apply; };
    const clock = (wallNow: number) => {
      const frameSeconds = Math.max(0, Math.min((wallNow - lastFrame) / 1000, 0.05));
      lastFrame = wallNow;
      // A prepared visual replay owns simulation advancement. The regular RAF
      // remains scheduled but does no work between explicit samples. The
      // replay adapter renders each requested sample synchronously.
      if (manualVisualReplayActive) {
        scheduleNextFrame();
        return;
      }
      const playing = status === 'active' &&
        (document.pointerLockElement === renderer.domElement || touchPlaying || skipBotRoundRequested);
      if (!playing) {
        simulationClock.resetDebt();
        gameplayActions.clear();
        runSimulationTick(0, simulationClock.getTimeSeconds(), simulationClock.getTimeSeconds(), wallNow);
      } else {
        simulationClock.advance(frameSeconds, (dt, start, end) => {
          simulationTickActive = true;
          try { runSimulationTick(dt, start, end, wallNow); }
          finally { simulationTickActive = false; }
          return status === 'active';
        });
      }
      if (playing && playerAlive && simulationNowMs >= freezeEnds) {
        const interpolatedPosition = playerMovement.getRenderPosition(player, simulationClock.getAlpha());
        playerInterpolationOffset.set(interpolatedPosition.x - player.position.x,
          interpolatedPosition.y - player.position.y, interpolatedPosition.z - player.position.z);
      }
      renderFrame(tickPresentation);
      if (frameProfiler) {
        const staticReview = Boolean(graphicsQaPreset || graphicsQaCloseCharacterReview || graphicsQaMotionPreset);
        const profile = frameProfiler.observe(wallNow, staticReview || (playing && simulationNowMs >= freezeEnds && !skipBotRoundRequested));
        if (profile) setFrameProfileSnapshot(JSON.stringify({
          ...profile,
          mode: staticReview ? 'static-visual-review' : 'normal-real-time-round',
          viewport: { width: renderer.domElement.clientWidth, height: renderer.domElement.clientHeight },
          quality: engineSettingsRef.current.quality,
          route: new URLSearchParams(window.location.search).get('visual-qa') ?? 'normal-round',
        }));
      }
      scheduleNextFrame();
    };
    // This developer-facing surface stays local to avoid publishing debug
    // controls. It is a thin adapter over the normal renderer and simulation,
    // not a second visual scene or a scripted screenshot substitute.
    const visualToolsLocalHost =
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1') &&
      new URLSearchParams(window.location.search).get('visual-tools') === '1';
    const setupControlledFallFixture = (options: VisualFallFixtureOptions) => {
      if (!visualToolsLocalHost) throw new Error('fall fixtures are localhost-only');
      const impactDownwardSpeed = {
        safe: 12.5,
        damaging: 18.5,
        lethal: 24.5,
      }[options.fixture];
      if (!Number.isFinite(impactDownwardSpeed)) throw new Error('unknown named fall fixture');
      if (options.actor === 'last-enemy' && options.fixture !== 'lethal')
        throw new Error('last-enemy fixture requires the named lethal impact');
      const carrierIsPlayer = options.actor === 'carrier' && playerHasBomb;
      const bot = options.actor === 'enemy'
        ? enemies[0]
        : options.actor === 'ally'
          ? allies[0]
          : options.actor === 'carrier'
            ? bombCarrier
            : options.actor === 'last-enemy'
              ? enemies[0]
              : null;
      if (options.actor === 'last-enemy' && bot) {
        enemies
          .filter((enemy) => enemy !== bot && enemy.alive)
          .forEach((enemy) => eliminateBotWithCredit(enemy, null, false, 'fall'));
      }
      if (options.actor !== 'player' && !carrierIsPlayer && !bot)
        throw new Error('named fall fixture actor is unavailable');
      keys.clear();
      gameplayActions.clear();
      firing = false;
      playerMovement.reset();
      playerInput.reset();
      movementNeedsSeed = true;
      freezeEnds = 0;
      const verticalVelocity = -(impactDownwardSpeed - CHARACTER_GRAVITY * 0.01);
      if (options.actor === 'player' || carrierIsPlayer) {
        const feet = getMapGroundHeight(player.position.x, player.position.z) + 0.05;
        player.position.y = feet + PLAYER_HULL.eyeHeight;
        player.velocity.set(0, 0, 0);
        player.verticalVelocity = verticalVelocity;
        player.grounded = false;
        player.crouched = false;
        player.landingRecoverySeconds = 0;
        const before = Object.freeze({
          health: player.health,
          armor: player.armor,
          helmet: player.helmet,
          alive: playerAlive,
        });
        controlledFallFixture = {
          name: options.fixture,
          targetId: 'player',
          team: 'player',
          setupAtMs: simulationNowMs,
          before,
          after: () => Object.freeze({
            health: player.health,
            armor: player.armor,
            helmet: player.helmet,
            alive: playerAlive,
          }),
        };
        return;
      }
      if (!bot) throw new Error('named fall fixture actor is unavailable');
      const feet = getMapGroundHeight(bot.root.position.x, bot.root.position.z) + 0.05;
      bot.root.position.y = feet;
      bot.verticalVelocity = verticalVelocity;
      bot.grounded = false;
      bot.motionResolvedThisTick = false;
      bot.locomotionVelocityX = 0;
      bot.locomotionVelocityZ = 0;
      bot.movementSpeed = 0;
      const before = Object.freeze({
        health: bot.health,
        armor: bot.armor,
        helmet: bot.helmet,
        alive: bot.alive,
      });
      controlledFallFixture = {
        name: options.fixture,
        targetId: `${bot.team}:${bot.id}`,
        team: bot.team,
        setupAtMs: simulationNowMs,
        before,
        after: () => Object.freeze({
          health: bot.health,
          armor: bot.armor,
          helmet: bot.helmet,
          alive: bot.alive,
        }),
      };
    };
    let visualPreviewWeapon: WeaponKind | null = graphicsQaPrimaryViewmodelReview?.weapon ?? graphicsQaPistolViewmodelReview?.weapon ?? graphicsQaEquipmentReview?.weapon ?? null;
    let visualReplayUsed = false;
    const visualSkeletonHelpers: THREE.SkeletonHelper[] = [];
    const clearVisualSkeletons = () => {
      for (const helper of visualSkeletonHelpers) {
        helper.removeFromParent();
        helper.dispose();
      }
      visualSkeletonHelpers.length = 0;
    };
    const visualToolkitCleanup = installDustlineVisualTools(window, {
      isLocalHost: visualToolsLocalHost,
      // This effect is entered only after the character, viewmodel texture,
      // and authored rifle preload Promise.all has resolved successfully.
      ready: async () => undefined,
      reset: (seed) => {
        if (visualReplayUsed || simulationClock.getTimeSeconds() > 0) {
          throw new Error('Reload the local page before starting another controlled replay.');
        }
        visualReplayUsed = true;
        clearVisualSkeletons();
        resetRound(false);
        visualPreviewWeapon = null;
        manualVisualReplayActive = true;
        manualReplayRemainderMs = 0;
        // The ballistics module resets to its fixed construction seed; this
        // per-shot random source is separately reset for reproducible spread.
        spreadRandom = createSeededRandom(seed);
        touchPlaying = true;
        setLocked(true);
        setControlNotice('');
      },
      advance: (milliseconds) => {
        manualReplayRemainderMs += Math.max(0, milliseconds);
        const ticks = Math.floor(manualReplayRemainderMs / 10);
        manualReplayRemainderMs -= ticks * 10;
        for (let tick = 0; tick < ticks && status === 'active'; tick += 1) {
          simulationClock.advance(0.01, (dt, start, end) => {
            simulationTickActive = true;
            try {
              runSimulationTick(dt, start, end, end * 1000);
            } finally {
              simulationTickActive = false;
            }
            return status === 'active';
          });
        }
        playerInterpolationOffset.set(0, 0, 0);
        renderFrame();
      },
      dispatch: (event: VisualReplayEvent) => {
        simulationTickActive = true;
        try {
        if (event.action === 'equip' && event.weapon) {
          visualPreviewWeapon = null;
          selectWeapon(event.weapon as WeaponKind);
        } else if (event.action === 'fire') {
          queueGameplayAction('fire');
        } else if (event.action === 'reload') {
          beginReload();
        } else if (event.action === 'move-start') {
          keys.add('KeyW');
          enqueueMovementControls();
        } else if (event.action === 'move-stop') {
          keys.delete('KeyW');
          enqueueMovementControls();
        } else if (event.action === 'pause') {
          releaseTransientInput(true);
        } else if (event.action === 'fall-fixture' && event.fallFixture) {
          setupControlledFallFixture(event.fallFixture);
        }
        } finally {
          simulationTickActive = false;
        }
        renderFrame();
      },
      previewAsset: (request: VisualAssetPreviewRequest) => {
        clearVisualSkeletons();
        // Route changes would rebuild the React scene and invalidate capture
        // setup. Existing visual-qa modes remain selectable through their URL.
        if (request.weapon && request.weapon in weaponViews) {
          visualPreviewWeapon = request.weapon as WeaponKind;
          Object.values(weaponViews).forEach((view) => { view.root.visible = false; });
          weaponViews[visualPreviewWeapon].root.visible = true;
        } else if (request.weapon) {
          visualPreviewWeapon = null;
          showWeaponView(player.activeWeapon);
        }
        if (request.skeleton) {
          const subjects: THREE.SkinnedMesh[] = [];
          const seenSkeletons = new Set<THREE.Skeleton>();
          scene.traverseVisible(object => {
            if (object instanceof THREE.SkinnedMesh && !seenSkeletons.has(object.skeleton)) {
              subjects.push(object);
              seenSkeletons.add(object.skeleton);
            }
          });
          for (const subject of subjects) {
            const bones = new Set(subject.skeleton.bones);
            const roots = subject.skeleton.bones.filter(bone => !bones.has(bone.parent as THREE.Bone));
            for (const root of roots) {
              const helper = new THREE.SkeletonHelper(root);
              helper.layers.mask = subject.layers.mask;
              helper.renderOrder = 1000;
              scene.add(helper);
              visualSkeletonHelpers.push(helper);
            }
          }
        }
        renderFrame();
      },
      snapshot: (replay) => {
        const skeletons: unknown[] = [];
        const materials: unknown[] = [];
        const inspectObject = (object: THREE.Object3D, scope: string) => {
          if (object instanceof THREE.SkinnedMesh && skeletons.length < 24) {
            skeletons.push(Object.freeze({
              scope,
              name: object.name,
              visible: object.visible,
              bones: object.skeleton.bones.length,
              pose: object.skeleton.bones.slice(0, 128).map(bone => ({
                name: bone.name,
                worldPosition: bone.getWorldPosition(new THREE.Vector3()).toArray(),
              })),
            }));
          }
          if (object instanceof THREE.Mesh && materials.length < 96) {
            const meshMaterials = Array.isArray(object.material)
              ? object.material : [object.material];
            meshMaterials.forEach((material) => {
              if (materials.length >= 96) return;
              materials.push(Object.freeze({
                scope,
                mesh: object.name,
                name: material.name,
                type: material.type,
                visible: object.visible,
              }));
            });
          }
        };
        const inspectBotSkeleton = (bot: Enemy) => {
          const meshes: THREE.SkinnedMesh[] = [];
          bot.skinned.model.traverse((object) => {
            if (object instanceof THREE.SkinnedMesh) meshes.push(object);
          });
          const primary = meshes.sort((first, second) =>
            first.skeleton.uuid.localeCompare(second.skeleton.uuid),
          )[0];
          return Object.freeze({
            ownerId: `${bot.team}:${bot.id}`,
            team: bot.team,
            alive: bot.alive,
            skeletonId: primary?.skeleton.uuid ?? null,
            meshName: primary?.name ?? null,
            visible: Boolean(bot.skinned.visualRoot.visible && primary?.visible),
            boneNames: Object.freeze(
              primary?.skeleton.bones.map((bone) => bone.name) ?? [],
            ),
            pose: Object.freeze(
              primary?.skeleton.bones.map((bone) =>
                Object.freeze({
                  name: bone.name,
                  worldPosition: bone.getWorldPosition(new THREE.Vector3()).toArray(),
                }),
              ) ?? [],
            ),
          });
        };
        // Viewmodel resources are the capture subject, so retain these first.
        presentationCamera.traverseVisible((object) => inspectObject(object, 'viewmodel'));
        scene.traverse((object) => inspectObject(object, 'scene'));
        const budget = inspectGraphicsBudget(scene, engineSettingsRef.current.quality);
        const viewmodelLoad = inspectVisibleGeometryLoad(presentationCamera);
        return Object.freeze({
          buildIdentity: JKH129_BUILD_IDENTITY,
          timestampMs: replay.timestampMs,
          deterministic: Object.freeze({
            seed: replay.seed,
            fixedStepMs: replay.stepMs,
            scope: 'scripted-input-and-weapon-rng' as const,
          }),
          scenarioState: Object.freeze({
            prepared: replay.prepared,
            paused: replay.paused,
            nextEvent: replay.nextEvent,
            dispatchedActions: replay.dispatchedActions,
          }),
          camera: Object.freeze({
            fov: presentationCamera.fov,
            position: Object.freeze([presentationCamera.position.x, presentationCamera.position.y, presentationCamera.position.z] as const),
            rotation: Object.freeze([presentationCamera.rotation.x, presentationCamera.rotation.y, presentationCamera.rotation.z] as const),
          }),
          viewport: Object.freeze({
            width: renderer.domElement.clientWidth,
            height: renderer.domElement.clientHeight,
            pixelRatio: renderer.getPixelRatio(),
          }),
          renderer: Object.freeze({
            quality: engineSettingsRef.current.quality,
            route: new URLSearchParams(window.location.search).get('visual-qa') ?? 'normal-round',
          }),
          light: Object.freeze({
            toneMapping: renderer.toneMapping,
            exposure: renderer.toneMappingExposure,
            outputColorSpace: renderer.outputColorSpace,
            lights: Object.freeze(scene.children.filter((object): object is THREE.Light => object instanceof THREE.Light).map(light => Object.freeze({
              type: light.type,
              visible: light.visible,
              intensity: light.intensity,
              color: light.color.getHexString(),
              position: light.position.toArray(),
              groundColor: light instanceof THREE.HemisphereLight ? light.groundColor.getHexString() : null,
            }))),
          }),
          graphicsBudget: budget,
          viewmodel: Object.freeze({
            activeWeapon: player.activeWeapon,
            previewWeapon: visualPreviewWeapon,
            reloading: player.reload !== null,
            action: Object.freeze({
              equipReadyAtMs: player.equipReadyAtMs,
              equipRemainingMs: Math.max(0, player.equipReadyAtMs - simulationNowMs),
              reload: player.reload && Object.freeze({
                weapon: player.reload.weapon,
                startedAtMs: player.reload.startedAt,
                completesAtMs: player.reload.completesAt,
              }),
            }),
            geometry: viewmodelLoad,
            arms: texturedViewmodelArmFactory.inspect(),
          }),
          runtime: Object.freeze({
            status,
            simulationNowMs,
            botPopulation: Object.freeze({
              enemiesLiving: enemies.filter((bot) => bot.alive).length,
              alliesLiving: allies.filter((bot) => bot.alive).length,
              totalLiving: bots.filter((bot) => bot.alive).length,
            }),
            controlledFallFixture: controlledFallFixture && Object.freeze({
              controlled: true,
              name: controlledFallFixture.name,
              targetId: controlledFallFixture.targetId,
              team: controlledFallFixture.team,
              setupAtMs: controlledFallFixture.setupAtMs,
              before: controlledFallFixture.before,
              after: controlledFallFixture.after(),
              fallCount: fallLandingCounts.get(controlledFallFixture.targetId) ?? 0,
              receipts: Object.freeze(
                fallDamageReceipts.filter(
                  (receipt) => receipt.targetId === controlledFallFixture?.targetId,
                ),
              ),
            }),
            fallDamageReceipts: Object.freeze(fallDamageReceipts),
            botSkeletons: Object.freeze(bots.map(inspectBotSkeleton)),
            player: Object.freeze({
              alive: playerAlive,
              position: Object.freeze([player.position.x, player.position.y, player.position.z] as const),
              velocity: Object.freeze([player.velocity.x, player.velocity.y, player.velocity.z] as const),
              activeWeapon: player.activeWeapon,
              ammo: isFirearmKind(player.activeWeapon) ? Object.freeze({ ...player.ammo[player.activeWeapon] }) : null,
            }),
          }),
          skeletons: Object.freeze(skeletons),
          materials: Object.freeze(materials),
        });
      },
      dispose: () => {
        clearVisualSkeletons();
        manualVisualReplayActive = false;
        manualReplayRemainderMs = 0;
        lastFrame = performance.now();
        releaseTransientInput(true);
      },
    });
    const canBotObservePosition = (observer: Enemy, position: THREE.Vector3, subject: Enemy | null, range: number) => {
      const eye = observer.root.position.clone().add(new THREE.Vector3(0, 1.65, 0));
      const direction = position.clone().sub(eye);
      const distance = direction.length();
      const forward = new THREE.Vector3(-Math.sin(observer.aimYaw), 0, -Math.cos(observer.aimYaw));
      const flat = new THREE.Vector3(direction.x, 0, direction.z).normalize();
      const preliminary = { alive: observer.alive, blinded: simulationNowMs < observer.blindUntilMs,
        distance, range, viewDot: distance < 0.001 ? 1 : forward.dot(flat), clearLine: true, smokeBlocked: false };
      if (!canAcquireBotContact(preliminary)) return false;
      raycaster.set(eye, direction.normalize());
      const obstruction = raycaster.intersectObjects(combatOccluders, false).find(hit => {
        const owner = hit.object.userData.enemy as Enemy | undefined;
        return hit.distance < distance && (!owner || (owner.alive && owner !== observer && owner !== subject));
      });
      const smokeBlocked = Array.from(smokeClouds).some(cloud => {
        if (getSmokeCloudOpacity(cloud.age) < 0.25) return false;
        const center = cloud.group.position.clone().add(new THREE.Vector3(0, 1.15, 0));
        return segmentIntersectsSmoke([eye.x, eye.y, eye.z], [position.x, position.y, position.z],
          [center.x, center.y, center.z], 3.15 * Math.min(1, cloud.age / 0.65));
      });
      return canAcquireBotContact({ ...preliminary, clearLine: !obstruction, smokeBlocked });
    };
    const findVisibleOpponent = (observer: Enemy, candidates: Array<{ id: EnemyCombatTargetId; bot: Enemy | null; position: THREE.Vector3; alive: boolean }>) => {
      const eye = observer.root.position.clone().add(new THREE.Vector3(0, 1.65, 0));
      return nearestVisibleContact(candidates.map(candidate => ({ ...candidate,
        distance: candidate.position.distanceTo(eye), visible: candidate.alive &&
          canBotObservePosition(observer, candidate.position, candidate.bot, getEnemyEngagementRange(observer.primaryWeapon)),
      })));
    };
    const updateObjectiveObservations = () => {
      const bots = [...enemies, ...allies];
      const observations: ObjectiveObservation[] = [];
      const kind = bombState === 'dropped' || bombState === 'planted' ? bombState
        : bombState === 'carried' || bombState === 'planting' ? 'carrier' : null;
      const carrierPosition = playerHasBomb && playerAlive ? player.position.clone().setY(player.position.y - 1.68)
        : bombCarrier?.alive ? bombCarrier.root.position.clone() : null;
      const position = kind === 'carrier' ? carrierPosition : kind ? bomb.position.clone() : null;
      if (kind && position) {
        const visiblePoint = position.clone().add(new THREE.Vector3(0, kind === 'carrier' ? 1.1 : 0, 0));
        for (const bot of bots) {
          if (!bot.alive || (kind === 'carrier' && bot === bombCarrier)) continue;
          if (canBotObservePosition(bot, visiblePoint, kind === 'carrier' ? bombCarrier : null, OBJECTIVE_SIGHT_RANGE)) {
            observations.push({ observerId: objectiveBotId(bot), kind, position,
              source: 'sight', observedAtMs: simulationNowMs });
          }
        }
      }
      objectiveIntel.update(simulationNowMs, [
        ...bots.map(bot => ({ id: objectiveBotId(bot), side: bot.side, alive: bot.alive, position: bot.root.position })),
        // Human planting can issue an explicit own-objective report; human sight
        // and sound never silently become automatic bot observations.
        { id: 'player', side: matchState.playerSide, alive: playerAlive, position: player.position, hearsObjectives: false },
      ], observations);
    };

    const canBotPickupDroppedBomb = (bot: Enemy) => bot.alive && bot.side === 't' && bombState === 'dropped' &&
      Math.hypot(bot.root.position.x - bomb.position.x, bot.root.position.z - bomb.position.z) < 1.15;
    const canBotDefusePlantedBomb = (bot: Enemy) => bot.alive && bot.side === 'ct' && bombState === 'planted' &&
      Math.hypot(bot.root.position.x - bomb.position.x, bot.root.position.z - bomb.position.z) <= 1.25;

    const moveBotObjective = (bot: Enemy, intel: ObjectiveIntel | null, retriever: Enemy | null, dt: number) => {
      if (!intel) return false;
      const target = new THREE.Vector2(intel.position.x, intel.position.z);
      if (intel.kind === 'dropped' && bot === retriever) {
        const distance = moveEnemyToward(bot, target, bot.team === 'ally' ? 1.75 : 1.65, dt);
        if (canBotPickupDroppedBomb(bot)) {
          const previousWaypointIndex = bot.waypointIndex;
          attachBombToCarrier(bot);
          bot.route = roundPlan.assignments[bot.id].route.map(([x, z]) => new THREE.Vector2(x, z));
          bot.waypointIndex = Math.max(previousWaypointIndex, getNearestRouteWaypointIndex(
            roundPlan.assignments[bot.id].route, { x: bot.root.position.x, z: bot.root.position.z }));
          bot.blockedSeconds = 0;
          message = `${bot.name.toUpperCase()} RECOVERED THE BOMB`;
        } else if (distance < 0.9) objectiveIntel.forget(objectiveBotId(bot));
        return true;
      }
      if (intel.kind !== 'planted') return false;
      if (bot === enemyDefuser) {
        if (!canBotDefusePlantedBomb(bot)) {
          enemyDefuseProgress = 0;
          if (moveEnemyToward(bot, target, 3.4, dt) < 0.9) objectiveIntel.forget(objectiveBotId(bot));
        } else {
          const next = advanceObjectiveProgress(enemyDefuseProgress, dt, getDefuseDuration(bot.hasDefuseKit), true);
          if (didObjectiveActionStart(enemyDefuseProgress > 0, next > 0))
            emitBotObjectiveActionCue('defuse-start', bot.root.position, bot.alive);
          enemyDefuseProgress = next;
          message = `${bot.name.toUpperCase()} DEFUSING — ${Math.floor(next * 100)}%`;
          if (next >= 1) {
            emitBotObjectiveActionCue('defuse-complete', bot.root.position, bot.alive);
            completePlantedBombDefuse(bot);
          }
        }
      } else {
        const squad = bot.team === 'ally' ? allies : enemies;
        const angle = (bot.id / squad.length) * Math.PI * 2;
        const guard = target.add(new THREE.Vector2(Math.cos(angle) * 3.8, Math.sin(angle) * 3.8));
        if (Math.hypot(bot.root.position.x - guard.x, bot.root.position.z - guard.y) > 1.2)
          moveEnemyToward(bot, guard, bot.side === 'ct' ? 2.4 : 1.25, dt);
      }
      return true;
    };
    const runSimulationTick = (dt: number, tickStartSeconds: number, tickEndSeconds: number, wallNow: number) => {
      const now = Math.round(tickEndSeconds * 1000);
      // A pose is valid only for the active simulation frame that produced it.
      // Clearing this render handoff prevents paused/death/spectator frames
      // from reusing the previous player's offsets.
      playerPresentationPose = null;
      playerPresentationLegacyCameraY = 0;
      const isPlaying =
        (document.pointerLockElement === renderer.domElement ||
          touchPlaying ||
          skipBotRoundRequested) &&
        status === 'active';
      if (!isPlaying || !playerAlive || simulationNowMs < freezeEnds) {
        playerMovement.reset();
        playerInput.reset();
        movementNeedsSeed = true;
        playerInterpolationOffset.set(0, 0, 0);
      }
      if (isPlaying && !wasPlaying && completedRoundReceipt) {
        completedRoundReceipt = null;
        publishHud(0);
      }
      wasPlaying = isPlaying;
      let activeDirectionalKeys: ReadonlySet<string> = keys;
      if (isPlaying && keyboardPlaytestInputEnabled && touchPlaying) {
        const sampledKeyboardInputs = sampleKeyboardPlaytestInputs({
          heldKeys: keys,
          latches: keyboardPlaytestTapLatches,
          nowMs: wallNow,
        });
        keyboardPlaytestTapLatches = sampledKeyboardInputs.latches;
        activeDirectionalKeys = sampledKeyboardInputs.activeCodes;
      }
      simulationNowMs = now;
      if (isPlaying) {
        weaponBallistics.advance(isFirearmKind(player.activeWeapon) ? player.activeWeapon : null, now, dt, firing);
        applyPlayerAim();
      }
      if (isPlaying) gameplayActions.drain(tickEndSeconds, action => {
        if (action === 'fire') shoot();
        else if (action === 'secondary') commitSecondary();
        else commitReload();
      });
      updateExplosionEffects(now);
      updateSurfaceImpacts(simulationNowMs);
      if (shouldAdvanceBotDeathPose(isPlaying, status)) updateBotDeathPoses(dt);
      if (isPlaying) {
        updateGrenadeSimulation(now, dt);
        updateSmokeClouds(dt);
        updatePlayerCasings(dt);
      }
      if (
        playerDeathCamera &&
        !playerAlive &&
        shouldAdvancePlayerDeathCamera(isPlaying, status)
      ) {
        playerDeathCamera.elapsedSeconds = Math.min(
          PLAYER_DEATH_CAMERA_DURATION_SECONDS,
          playerDeathCamera.elapsedSeconds + dt,
        );
      }
      const playerDeathCameraActive = Boolean(
        playerDeathCamera &&
        !playerAlive &&
        !shouldUseSpectatorOrbit(playerAlive, playerDeathCamera.elapsedSeconds),
      );
      const applyDeathOrSpectatorPresentation = () => {
        if (playerDeathCameraActive && playerDeathCamera) {
          const deathPose = getPlayerDeathCameraPose(
            playerDeathCamera.start,
            playerDeathCamera.elapsedSeconds,
            playerDeathCamera.variant,
          );
          presentationCamera.position.set(
            deathPose.x,
            deathPose.y,
            deathPose.z,
          );
          presentationCamera.rotation.set(
            deathPose.pitch,
            deathPose.yaw,
            deathPose.roll,
          );
          if (!spectatorPresentationPosition)
            spectatorPresentationPosition = new THREE.Vector3();
          spectatorPresentationPosition.copy(presentationCamera.position);
          return;
        }
        if (!playerAlive) {
          const [siteX, siteZ] = BOMBSITES[selectedBombsite];
          const target = spectatedEnemy?.alive
            ? spectatedEnemy.root.position
                .clone()
                .add(new THREE.Vector3(0, 1.4, 0))
            : new THREE.Vector3(siteX, 1.4, siteZ);
          const angle = now * 0.00035;
          const desiredCamera = target
            .clone()
            .add(
              new THREE.Vector3(
                Math.sin(angle) * 5.4,
                2.6,
                Math.cos(angle) * 5.4,
              ),
            );
          const safeDesiredCamera = clipSpectatorCameraBoom(
            target,
            desiredCamera,
            colliders,
          );
          desiredCamera.set(
            safeDesiredCamera.x,
            safeDesiredCamera.y,
            safeDesiredCamera.z,
          );
          if (!spectatorPresentationPosition)
            spectatorPresentationPosition = presentationCamera.position.clone();
          spectatorPresentationPosition.lerp(
            desiredCamera,
            1 - Math.exp(-dt * 4),
          );
          const safePresentationPosition = clipSpectatorCameraBoom(
            target,
            spectatorPresentationPosition,
            colliders,
          );
          spectatorPresentationPosition.set(
            safePresentationPosition.x,
            safePresentationPosition.y,
            safePresentationPosition.z,
          );
          presentationCamera.position.copy(spectatorPresentationPosition);
          presentationCamera.lookAt(target);
        }
      };
      (['ct', 't'] as const).forEach((side) => {
        buyZoneMarkers[side].visible =
          status === 'active' &&
          playerAlive &&
          roundSeconds > BUY_CUTOFF_SECONDS &&
          matchState.playerSide === side;
      });

      if (isPlaying && status !== 'active') {
        requestTickPresentation(
          !playerAlive ? applyDeathOrSpectatorPresentation : undefined,
        );
        return;
      }

      if (isPlaying && !playerAlive) {
        if (
          pendingRoundResult &&
          (skipBotRoundRequested || simulationNowMs >= spectateEnds)
        ) {
          const pending = pendingRoundResult;
          endRound(pending.winnerSide, pending.reason, pending.event);
        }
        if (pendingRoundResult || status !== 'active') {
          publishHud(wallNow);
          requestTickPresentation(applyDeathOrSpectatorPresentation);
            return;
        }
      }

      if (isPlaying && simulationNowMs < freezeEnds) {
        processRequestedDrop();
        if (
          playerAlive &&
          player.reload &&
          simulationNowMs >= player.reload.completesAt
        )
          completeReload();
        applyRenderedReloadPose();
        message = `FREEZE ${Math.ceil((freezeEnds - simulationNowMs) / 1000)} — ${roundPlan.approach.toUpperCase()} ${matchState.playerSide === 'ct' ? 'HOLD' : 'TAKE'} ${selectedBombsite}`;
        camera.position.copy(player.position);
        applyPlayerAim();
        publishHud(wallNow);
        requestTickPresentation(
          !playerAlive ? applyDeathOrSpectatorPresentation : undefined,
        );
        return;
      }

      if (isPlaying && freezeEnds > 0) {
        freezeEnds = 0;
        message =
          matchState.playerSide === 'ct'
            ? `ATTACKERS MOVING TOWARD SITE ${selectedBombsite}`
            : 'DEVICE LIVE — PLANT AT SITE A OR B';
        publishHud(0);
      }

      if (isPlaying) {
        const keyboardAimSpeed = 1.65 * dt;
        player.yaw +=
          (Number(activeDirectionalKeys.has('ArrowLeft')) -
            Number(activeDirectionalKeys.has('ArrowRight'))) *
          keyboardAimSpeed;
        player.pitch = THREE.MathUtils.clamp(
          player.pitch +
            (Number(activeDirectionalKeys.has('ArrowDown')) -
              Number(activeDirectionalKeys.has('ArrowUp'))) *
              keyboardAimSpeed,
          -Math.PI / 2 + 0.08,
          Math.PI / 2 - 0.08,
        );
        if ((message === 'ATTACHING SILENCER' || message === 'REMOVING SILENCER') &&
          weaponSpecial.ready(player.activeWeapon, simulationNowMs)) {
          message = getDefaultCombatMessage();
        }
        if (weaponSpecial.advance(simulationNowMs, player.activeWeapon)) setScope(weaponSpecial.snapshot().zoom !== 0, false);
        while (playerAlive && weaponSpecial.takeBurstShot(simulationNowMs, player.activeWeapon, player.ammo.glock18.magazine)) shoot(true);
        if (shouldRepeatFire(player.activeWeapon, firing)) shoot();
        if (status !== 'active') {
          requestTickPresentation(
            !playerAlive ? applyDeathOrSpectatorPresentation : undefined,
          );
            return;
        }
        roundSeconds -= dt;
        if (roundSeconds <= 0) {
          roundSeconds = 0;
          if (bombState === 'planted') {
            detonateBomb(now);
            resolveRoundEvent(
              'bomb-detonated',
              'BOMB DETONATED — TERRORISTS WIN',
            );
          } else {
            resolveRoundEvent(
              'time-expired',
              'TIME EXPIRED — COUNTER-TERRORISTS WIN',
            );
          }
          requestTickPresentation(
            !playerAlive ? applyDeathOrSpectatorPresentation : undefined,
          );
            return;
        }

        if (bombState === 'planted') {
          const bombDistance = Math.hypot(
            player.position.x - bomb.position.x,
            player.position.z - bomb.position.z,
          );
          canDefuse =
            playerAlive && matchState.playerSide === 'ct' && bombDistance < 3.1;
          const urgency = 1 - roundSeconds / 35;
          bombBeacon.intensity =
            1.2 + Math.sin(now * (0.007 + urgency * 0.018)) * 1.2;
          if (simulationNowMs >= nextBombBeep) {
            objectiveIntel.emitSound('planted', bomb.position, simulationNowMs, OBJECTIVE_BEEP_HEARING_RADIUS);
            playBombBeep();
            nextBombBeep = simulationNowMs + Math.max(190, 920 - urgency * 720);
          }
          if (
            canPlayerDefuse(
              matchState.playerSide,
              bombState,
              canDefuse,
              keys.has('KeyE'),
            )
          ) {
            const nextDefuseProgress = Math.min(
              1,
              defuseProgress + dt / getDefuseDuration(player.hasDefuseKit),
            );
            if (
              didObjectiveActionStart(
                defuseProgress > 0,
                nextDefuseProgress > 0,
              )
            )
              {
                emitActorSound(matchState.playerSide, 'objective', player.position, 17, 0.45);
                playObjectiveActionCue('defuse-start');
              }
            defuseProgress = nextDefuseProgress;
            message = `DEFUSING — ${Math.floor(defuseProgress * 100)}%`;
            if (defuseProgress >= 1) {
              playObjectiveActionCue('defuse-complete');
              completePlantedBombDefuse(null);
            }
          } else {
            defuseProgress = 0;
            if (matchState.playerSide === 't') {
              message =
                enemyDefuseProgress > 0
                  ? `DEFENDER DEFUSING — ${Math.floor(enemyDefuseProgress * 100)}%`
                  : enemyDefuser
                    ? 'DEFENDERS RETAKING'
                    : 'DEFEND THE DEVICE';
            } else if (canDefuse) message = 'HOLD E TO DEFUSE';
            else if (enemies.every((enemy) => !enemy.alive))
              message = 'SITE CLEAR — DEFUSE THE BOMB';
            else message = `BOMB PLANTED — REACH SITE ${selectedBombsite}`;
          }
        } else {
          canDefuse = false;
          bombBeacon.intensity = 0;
        }

        if (status !== 'active') {
          requestTickPresentation(
            !playerAlive ? applyDeathOrSpectatorPresentation : undefined,
          );
            return;
        }

        const buyBlockReason = getCurrentBuyBlockReason();
        if (buyMenuOpen && buyBlockReason) {
          buyMenuOpen = false;
          setBuyOpen(false);
          message = getBuyBlockMessage(buyBlockReason);
        }

        let playerIsPlanting = false;
        if (
          playerAlive &&
          matchState.playerSide === 't' &&
          playerHasBomb &&
          (bombState === 'carried' || bombState === 'planting')
        ) {
          const nearbySite = getBombsiteAtPosition(
            player.position.x,
            player.position.z,
          );
          canPlant = nearbySite !== null;
          const hasMovementIntent =
            activeDirectionalKeys.has('KeyW') ||
            activeDirectionalKeys.has('KeyA') ||
            activeDirectionalKeys.has('KeyS') ||
            activeDirectionalKeys.has('KeyD');
          const stationary =
            !hasMovementIntent && player.velocity.length() < 0.35;
          const activelyPlanting = canPlayerPlant({
            active: status === 'active',
            alive: playerAlive,
            playerSide: matchState.playerSide,
            bombState,
            playerHasBomb,
            bombsite: nearbySite,
            activeWeapon: player.activeWeapon,
            primaryFireHeld: firing,
            freezeSeconds: Math.max(0, (freezeEnds - simulationNowMs) / 1000),
            buyOpen: buyMenuOpen,
            weaponReady: isWeaponReady(simulationNowMs, player.equipReadyAtMs),
            stationary,
            grounded: player.grounded,
            reloading: player.reload !== null,
          });
          if (activelyPlanting && nearbySite) {
            if (plantingSite !== nearbySite) playerPlantProgress = 0;
            const wasPlanting = playerPlantProgress > 0;
            plantingSite = nearbySite;
            selectedBombsite = nearbySite;
            bombState = 'planting';
            const nextPlantProgress = advanceObjectiveProgress(
              playerPlantProgress,
              dt,
              3,
              true,
            );
            if (didObjectiveActionStart(wasPlanting, nextPlantProgress > 0)) {
              emitActorSound(matchState.playerSide, 'objective', player.position, 17, 0.45);
              playObjectiveActionCue('plant-start');
            }
            playerPlantProgress = nextPlantProgress;
            player.velocity.x = 0;
            player.velocity.z = 0;
            playerIsPlanting = true;
            message = `PLANTING AT ${nearbySite} — ${Math.floor(playerPlantProgress * 100)}%`;
            if (playerPlantProgress >= 1) finishPlayerPlant(nearbySite);
          } else if (bombState === 'planting') {
            interruptPlayerPlant();
            message = nearbySite
              ? player.activeWeapon === 'bomb'
                ? `HOLD FIRE — PLANT AT ${nearbySite}`
                : `PRESS 5 — EQUIP C4 AT ${nearbySite}`
              : 'TAKE THE DEVICE TO A OR B';
          } else if (nearbySite) {
            message =
              player.activeWeapon === 'bomb'
                ? `HOLD FIRE — PLANT AT ${nearbySite}`
                : `PRESS 5 — EQUIP C4 AT ${nearbySite}`;
          }
        } else {
          canPlant = false;
        }

        const playerBombDistance = Math.hypot(
          bomb.position.x - player.position.x,
          bomb.position.z - player.position.z,
        );
        const playerRecoveredBomb = canPlayerPickupBomb({
          active: status === 'active',
          alive: playerAlive,
          playerSide: matchState.playerSide,
          bombState,
          playerHasBomb,
          distance: playerBombDistance,
        });
        if (playerRecoveredBomb) {
          objectiveIntel.clear();
          bombState = 'carried';
          playerHasBomb = true;
          bombCarrier = null;
          playerPlantProgress = 0;
          plantingSite = null;
          canPlant = false;
          scene.attach(bomb);
          bomb.position.set(0, 0, 0);
          bomb.rotation.set(0, 0, 0);
          bomb.visible = false;
          message = 'C4 PICKED UP — PRESS 5 TO EQUIP';
          publishHud(0);
        }

        processRequestedDrop(playerRecoveredBomb);

        const nearbyFirearm = getNearbyDroppedFirearm();
        if (
          nearbyFirearm &&
          keys.has('KeyE') &&
          !buyMenuOpen &&
          !player.reload &&
          canPickupFirearm({
            active: status === 'active',
            alive: playerAlive,
            freezeSeconds: Math.max(0, (freezeEnds - simulationNowMs) / 1000),
            currentPrimary: player.primaryWeapon,
            currentSecondary: player.secondaryWeapon,
            candidate: nearbyFirearm.kind,
            distance: Math.hypot(
              nearbyFirearm.group.position.x - player.position.x,
              nearbyFirearm.group.position.z - player.position.z,
            ),
            objectiveInteractionAvailable:
              canDefuse || canPlant || playerIsPlanting || playerRecoveredBomb,
          })
        ) {
          if (isPrimaryWeaponKind(nearbyFirearm.kind))
            player.primaryWeapon = nearbyFirearm.kind;
          else player.secondaryWeapon = nearbyFirearm.kind;
          player.ammo[nearbyFirearm.kind] = { ...nearbyFirearm.ammo };
          disposeDroppedFirearm(nearbyFirearm);
          selectWeapon(nearbyFirearm.kind);
          message = `${FIREARMS[nearbyFirearm.kind].label} RECOVERED`;
          publishHud(0);
        }

        if (playerAlive) {
          if (player.reload && simulationNowMs >= player.reload.completesAt)
            completeReload();

          if (movementNeedsSeed || (keyboardPlaytestInputEnabled && touchPlaying)) {
            enqueueMovementControls(tickStartSeconds, activeDirectionalKeys);
            movementNeedsSeed = false;
          }
          let walking = playerInput.current().walking;
          let crouching = player.crouched;
          const tickInput = (() => {
            const controls = playerInput.sample(tickStartSeconds);
            walking = controls.walking;
            crouching = controls.crouching || (player.crouched && hullGeometryBlocked(
              playerCollisionWorld, player.position.x, player.position.y - PLAYER_HULL.eyeHeight,
              player.position.z, PLAYER_HULL.standingHeight));
            const magnitude = Math.max(1, Math.hypot(controls.strafe, controls.forward));
            const strafe = playerIsPlanting ? 0 : controls.strafe / magnitude;
            const forward = playerIsPlanting ? 0 : controls.forward / magnitude;
            const sin = Math.sin(controls.yaw);
            const cos = Math.cos(controls.yaw);
            return {
              wishDirection: { x: strafe * cos - forward * sin, z: -strafe * sin - forward * cos },
              maxSpeed: getWeaponMoveSpeed({ weapon: player.activeWeapon, walking, crouching, scoped: player.scoped }) *
                getPlayerDamageTagSpeedMultiplier(player.damageTag, player.grounded),
              jumpMaxSpeed: getWeaponBunnyHopSpeed(player.activeWeapon, player.scoped),
              crouching,
              jumpRequested: controls.jumpRequested,
            };
          })();
          const movementEvent = playerMovement.step(player, tickInput, playerCollisionWorld);
          if (movementEvent.landed) playLandingCue();
          if (!commitPlayerFallDamage(movementEvent.impactDownwardSpeed)) {

          player.crouchOffset = THREE.MathUtils.lerp(
            player.crouchOffset,
            player.crouched ? PLAYER_CROUCH_OFFSET : 0,
            1 - Math.exp(-dt * 13),
          );
          if (player.crouched) player.crouchOffset = Math.max(player.crouchOffset,
            PLAYER_HULL.eyeHeight - PLAYER_HULL.crouchedHeight + 0.02);
          playerCombatEyePosition.copy(player.position);
          playerCombatEyePosition.y = getPlayerStanceEyeHeight(
            player.position.y,
            player.crouchOffset,
          );
          const locomotionPose = getPlayerLocomotionPose({
            velocity: { x: player.velocity.x, z: player.velocity.z },
            yawRadians: player.yaw,
            phase: player.locomotionPhase,
            dtSeconds: dt,
            grounded: player.grounded,
            crouching,
            walking,
            landingRecoverySeconds: player.landingRecoverySeconds,
          });
          player.locomotionPhase = locomotionPose.phase;
          const finalizedHorizontalVelocity = {
            x: Number.isFinite(player.velocity.x) ? player.velocity.x : 0,
            z: Number.isFinite(player.velocity.z) ? player.velocity.z : 0,
          };
          const finalizedLocalVelocity = getLocalLocomotionVelocity(
            finalizedHorizontalVelocity,
            player.yaw,
          );
          const worldAccelerationX =
            dt > 0
              ? (finalizedHorizontalVelocity.x -
                  previousPlayerFinalizedHorizontalVelocity.x) /
                dt
              : 0;
          const worldAccelerationZ =
            dt > 0
              ? (finalizedHorizontalVelocity.z -
                  previousPlayerFinalizedHorizontalVelocity.z) /
                dt
              : 0;
          previousPlayerFinalizedHorizontalVelocity.x =
            finalizedHorizontalVelocity.x;
          previousPlayerFinalizedHorizontalVelocity.z =
            finalizedHorizontalVelocity.z;
          const sinYaw = Math.sin(player.yaw);
          const cosYaw = Math.cos(player.yaw);
          const finalizedLocalAcceleration = {
            forward: THREE.MathUtils.clamp(
              -(worldAccelerationX * sinYaw + worldAccelerationZ * cosYaw),
              -50,
              50,
            ),
            strafe: THREE.MathUtils.clamp(
              worldAccelerationX * cosYaw - worldAccelerationZ * sinYaw,
              -50,
              50,
            ),
          };
          const presentationFrame = stepPlayerPresentation(
            {
              dtSeconds: dt,
              localVelocity: finalizedLocalVelocity,
              localAcceleration: finalizedLocalAcceleration,
              grounded: player.grounded,
              walking,
              crouching,
              landingRecoverySeconds: player.landingRecoverySeconds,
              authoritativeYawRadians: player.yaw,
              authoritativePitchRadians: player.pitch,
              locomotionPhase: locomotionPose.phase,
            },
            playerPresentationState,
          );
          playerPresentationState = presentationFrame.state;
          playerPresentationPose = presentationFrame.pose;
          playerPresentationLegacyCameraY = locomotionPose.cameraY;
          camera.position.copy(playerCombatEyePosition);
          camera.position.y += locomotionPose.cameraY;
          // Keep the camera's aim transform authoritative for hitscan. Motion
          // pitch/roll belong on the viewmodel so a fixed crosshair never lies.
          applyPlayerAim();

          if (
            locomotionPose.footstepCrossed &&
            simulationNowMs >= nextFootstepAt
          ) {
            playFootstep(walking || crouching);
            if (!crouching)
              emitActorSound(matchState.playerSide, 'footstep', player.position, walking ? 9 : 18, walking ? 0.7 : 1.15);
            nextFootstepAt = simulationNowMs + 120;
          }
          player.recoil = THREE.MathUtils.lerp(
            player.recoil,
            0,
            1 - Math.exp(-dt * 18),
          );
          player.damageSuppression = decayDamageSuppression(
            player.damageSuppression,
            dt,
          );
          player.damageTag = decayPlayerDamageTag(player.damageTag, dt);
          const activeView = weaponViews[player.activeWeapon];
          const equipDuration = getWeaponEquipDelay(player.activeWeapon);
          const equipProgress = THREE.MathUtils.clamp(
            1 -
              Math.max(0, player.equipReadyAtMs - simulationNowMs) /
                equipDuration,
            0,
            1,
          );
          const equipEase = THREE.MathUtils.smoothstep(equipProgress, 0, 1);
          const drawAmount = activeView.authoredAnimation ? 0 : 1 - equipEase;
          const shotFeedback = !activeView.authoredAnimation && isFirearmKind(player.activeWeapon)
            ? FIREARMS[player.activeWeapon].feedback.viewKick
            : null;
          player.shotPulse = decayShotPulse(
            player.shotPulse,
            dt,
            shotFeedback?.recovery ?? 20,
          );
          removeRenderedReloadPose();
          activeView.root.position.set(
            activeView.basePosition.x +
              (activeView.authoredAnimation ? 0 : player.shotSide * player.shotPulse * 0.006) +
              presentationFrame.pose.viewmodelOffset.x,
            activeView.basePosition.y +
              presentationFrame.pose.viewmodelOffset.y +
              (shotFeedback?.up ?? 0) * player.shotPulse -
              drawAmount * 0.28,
            activeView.basePosition.z +
              (activeView.authoredAnimation ? 0 : getViewmodelVisualRecoilDepth(player.recoil)) *
                (player.activeWeapon === 'grenade' ||
                player.activeWeapon === 'smoke' ||
                player.activeWeapon === 'flash'
                  ? 0.45
                  : 1) +
              (shotFeedback?.back ?? 0) * player.shotPulse +
              drawAmount * 0.12 +
              presentationFrame.pose.viewmodelOffset.z,
          );
          activeView.root.rotation.set(
            activeView.baseRotation.x +
              (shotFeedback?.up ?? 0) * player.shotPulse * 1.4 +
              drawAmount * 0.14 +
              presentationFrame.pose.viewmodelPitch,
            activeView.baseRotation.y,
            activeView.baseRotation.z +
              player.shotSide * (shotFeedback?.roll ?? 0) * player.shotPulse +
              presentationFrame.pose.viewmodelRoll,
          );
          applyRenderedReloadPose();
          activeView.authoredAnimation?.sample({
            nowMs: simulationNowMs,
            reload: player.reload?.weapon === player.activeWeapon ? player.reload : null,
            equip: {
              startedAt: player.equipReadyAtMs - equipDuration,
              completesAt: player.equipReadyAtMs,
            },
            fireStartedAtMs: isFirearmKind(player.activeWeapon)
              ? lastAuthoredShotAt[player.activeWeapon]
              : undefined,
          });
          if (isPrimaryWeaponKind(player.activeWeapon)) {
            const actionElapsedMs =
              player.activeWeapon === 'shotgun'
                ? simulationNowMs - lastShotgunShotAt
                : player.activeWeapon === 'sniper'
                  ? simulationNowMs - lastSniperShotAt
                  : Number.POSITIVE_INFINITY;
            applyPrimaryActionParts(player.activeWeapon, actionElapsedMs);
          }
          (Object.keys(FIREARMS) as FirearmKind[]).forEach((kind) => {
            const weaponView = weaponViews[kind];
            const visualProfile = getCombatVisualWeaponProfile('player', kind);
            const muzzles =
              weaponView.muzzles ??
              (weaponView.muzzle ? [weaponView.muzzle] : []);
            muzzles.forEach((muzzle) => {
              muzzle.intensity = THREE.MathUtils.lerp(
                muzzle.intensity,
                visualProfile.muzzleIntensityMin,
                getMuzzleFadeFactor(visualProfile, dt),
              );
            });
          });
          }
        }

        const tBots = matchState.playerSide === 't' ? allies : enemies;
        const ctBots = matchState.playerSide === 'ct' ? allies : enemies;
        squadIntelAge += dt;
        friendlyIntelCalloutAge += dt;
        friendlyIntelFreshnessAge += dt;
        backupRequestAgeSeconds += dt;
        botHearing.prune(simulationNowMs);
        updateObjectiveObservations();
        const objectiveCandidates = (bots: Enemy[], defusing: boolean) => bots.map(bot => ({
          bot, id: objectiveBotId(bot), alive: bot.alive, position: bot.root.position,
          intel: getBotObjectiveIntel(bot), actionSeconds: defusing ? getDefuseDuration(bot.hasDefuseKit) : 0,
        }));
        const bombRetriever = selectObjectiveResponder(objectiveCandidates(tBots, false), 'dropped', simulationNowMs, 1)?.bot ?? null;
        const playerActivelyDefusing = matchState.playerSide === 'ct' && playerAlive && canDefuse && keys.has('KeyE');
        if (!playerActivelyDefusing) {
          if (!enemyDefuser?.alive || getBotObjectiveIntel(enemyDefuser)?.kind !== 'planted') {
            enemyDefuser = selectObjectiveResponder(objectiveCandidates(ctBots, true), 'planted', simulationNowMs, 3.4)?.bot ?? null;
            enemyDefuseProgress = 0;
          }
        } else {
          enemyDefuser = null;
          enemyDefuseProgress = 0;
        }

        let activeShooters = enemies.filter(
          (enemy) => enemy.alive && (enemy.burstShotsRemaining > 0 || enemy.special.snapshot().burstDeadlines.length > 0),
        ).length;
        const playerConfirmedSquadContactRef: {
          current: { enemy: Enemy; distance: number } | null;
        } = { current: null };

        enemies.forEach((enemy) => {
          if (status !== 'active' || !enemy.alive) return;
          enemy.motionResolvedThisTick = false;
          enemy.locomotionCommanded = false;
          const visualProfile = getCombatVisualWeaponProfile(
            'bot',
            enemy.primaryWeapon,
          );
          enemy.muzzleFlash.intensity = THREE.MathUtils.lerp(
            enemy.muzzleFlash.intensity,
            visualProfile.muzzleIntensityMin,
            getMuzzleFadeFactor(visualProfile, dt),
          );
          if (isSecondaryWeaponKind(enemy.primaryWeapon)) {
            const secondaryProfile = getCombatVisualWeaponProfile(
              'bot',
              enemy.primaryWeapon,
            );
            for (const muzzle of enemy.secondaryMuzzles[enemy.primaryWeapon]) {
              muzzle.intensity = THREE.MathUtils.lerp(
                muzzle.intensity,
                secondaryProfile.muzzleIntensityMin,
                getMuzzleFadeFactor(secondaryProfile, dt),
              );
            }
          }
          const contact = findVisibleOpponent(enemy, [
            { id: 'player', bot: null, position: playerCombatEyePosition.clone(), alive: playerAlive },
            ...allies.map(ally => ({ id: `ally:${ally.id}` as EnemyCombatTargetId, bot: ally, position: ally.root.position.clone().add(new THREE.Vector3(0, 1.35, 0)), alive: ally.alive })),
          ]);
          const targetBot: Enemy | null = contact?.bot ?? null;
          const targetPosition = contact?.position ?? enemy.lastKnownOpponentPosition.clone();
          const targetAlive = contact !== null;
          const toPlayer = new THREE.Vector3(
            targetPosition.x - enemy.root.position.x,
            0,
            targetPosition.z - enemy.root.position.z,
          );
          const distance = toPlayer.length();
          if (targetAlive && distance > 0.001)
            stepBotAimYaw(
              enemy,
              Math.atan2(toPlayer.x, toPlayer.z) + Math.PI,
              dt,
            );
          enemy.fireCooldown -= dt;
          enemy.movementDecisionTimer -= dt;
          enemy.suppression = Math.max(0, enemy.suppression - dt * 0.5);
          advanceBotWeapon(enemy);
          enemy.shots.advance(enemy.primaryWeapon, simulationNowMs, dt,
            enemy.burstShotsRemaining > 0 || enemy.special.snapshot().burstDeadlines.length > 0);
          const enemyEye = enemy.root.position
            .clone()
            .add(new THREE.Vector3(0, 1.65, 0));
          const sightDistance = enemyEye.distanceTo(targetPosition);
          const sightDirection = targetPosition
            .clone()
            .sub(enemyEye)
            .normalize();
          raycaster.set(enemyEye, sightDirection);
          const sightObstruction = raycaster.intersectObjects(
            obstacleMeshes,
            false,
          )[0];
          const bodyObstruction = raycaster
            .intersectObjects(hitMeshes, false)
            .find((candidate) => {
              const bodyOwner = candidate.object.userData.enemy as Enemy;
              return bodyOwner?.alive && bodyOwner !== enemy;
            });
          const smokeBlocked = Array.from(smokeClouds).some((cloud) => {
            if (getSmokeCloudOpacity(cloud.age) < 0.25) return false;
            const center = cloud.group.position
              .clone()
              .add(new THREE.Vector3(0, 1.15, 0));
            return segmentIntersectsSmoke(
              [enemyEye.x, enemyEye.y, enemyEye.z],
              [targetPosition.x, targetPosition.y, targetPosition.z],
              [center.x, center.y, center.z],
              3.15 * Math.min(1, cloud.age / 0.65),
            );
          });
          const forwardFacing = new THREE.Vector3(
            -Math.sin(enemy.aimYaw),
            0,
            -Math.cos(enemy.aimYaw),
          );
          const facingPlayer =
            distance < 2 ||
            forwardFacing.dot(toPlayer.clone().normalize()) > 0.9;
          const engagementRange = getEnemyEngagementRange(enemy.primaryWeapon);
          const blinded = simulationNowMs < enemy.blindUntilMs;
          const hasLineOfSight =
            (!sightObstruction || sightObstruction.distance > sightDistance) &&
            (!bodyObstruction ||
              bodyObstruction.distance > sightDistance ||
              bodyObstruction.object.userData.enemy === targetBot) &&
            !smokeBlocked;
          const playerViewDirection = new THREE.Vector3(
            -Math.sin(player.yaw) * Math.cos(player.pitch),
            Math.sin(player.pitch),
            -Math.cos(player.yaw) * Math.cos(player.pitch),
          );
          const playerToEnemy = enemyEye.clone().sub(playerCombatEyePosition);
          const playerSightDistance = playerToEnemy.length();
          const playerSightDirection = playerToEnemy.normalize();
          raycaster.set(playerCombatEyePosition, playerSightDirection);
          const playerSightObstruction = raycaster.intersectObjects(
            obstacleMeshes,
            false,
          )[0];
          const playerSightSmokeBlocked = Array.from(smokeClouds).some(
            (cloud) => {
              if (getSmokeCloudOpacity(cloud.age) < 0.25) return false;
              const center = cloud.group.position
                .clone()
                .add(new THREE.Vector3(0, 1.15, 0));
              return segmentIntersectsSmoke(
                [
                  playerCombatEyePosition.x,
                  playerCombatEyePosition.y,
                  playerCombatEyePosition.z,
                ],
                [enemyEye.x, enemyEye.y, enemyEye.z],
                [center.x, center.y, center.z],
                3.15 * Math.min(1, cloud.age / 0.65),
              );
            },
          );
          const effectiveCombatTargetId: EnemyCombatTargetId | null = targetAlive
            ? targetBot
              ? `ally:${(targetBot as Enemy).id}`
              : 'player'
            : null;
          if (
            canPlayerSpotEnemy({
              playerAlive,
              blinded: simulationNowMs < playerBlindUntilMs,
              hasLineOfSight:
                (!playerSightObstruction ||
                  playerSightObstruction.distance > playerSightDistance) &&
                !playerSightSmokeBlocked,
              distance: playerSightDistance,
              viewAlignment: playerViewDirection.dot(playerSightDirection),
            })
          ) {
            const playerConfirmedSquadContact =
              playerConfirmedSquadContactRef.current;
            const currentEnemyIsTracked = enemy.id === friendlyIntelTargetId;
            const candidateIsTracked =
              playerConfirmedSquadContact?.enemy.id === friendlyIntelTargetId;
            if (
              currentEnemyIsTracked ||
              (!candidateIsTracked &&
                (!playerConfirmedSquadContact ||
                  playerSightDistance < playerConfirmedSquadContact.distance ||
                  (playerSightDistance ===
                    playerConfirmedSquadContact.distance &&
                    enemy.id < playerConfirmedSquadContact.enemy.id)))
            )
              playerConfirmedSquadContactRef.current = {
                enemy,
                distance: playerSightDistance,
              };
          }
          if (
            shouldResetEnemyTracking(
              enemy.combatTargetId,
              effectiveCombatTargetId,
            )
          ) {
            enemy.combatTargetId = effectiveCombatTargetId;
            enemy.sightTime = 0;
            enemy.burstShotsRemaining = 0;
          }
          const seesPlayer =
            targetAlive &&
            !blinded &&
            distance < engagementRange &&
            hasLineOfSight &&
            (facingPlayer || enemy.combatMemory > 0);

          const receivedSquadIntel =
            !seesPlayer &&
            canEnemyUseSquadIntel(squadIntelAge, enemy.profile.memorySeconds);
          enemy.sightTime = seesPlayer
            ? enemy.sightTime + dt
            : Math.max(0, enemy.sightTime - dt * 2.5);
          const shouldEngage = seesPlayer;
          if (seesPlayer) {
            hearOpponent(enemy, true);
            enemy.lastKnownOpponentPosition.copy(targetPosition);
            enemy.combatMemory = enemy.profile.memorySeconds;
            if (
              effectiveCombatTargetId === 'player' && (squadIntelAge > 0.9 ||
              squadLastKnownPosition.distanceTo(targetPosition) > 4)
            ) {
              squadLastKnownPosition.copy(targetPosition);
              squadIntelAge = 0;
            }
          } else {
            enemy.combatMemory = Math.max(0, enemy.combatMemory - dt);
            enemy.burstShotsRemaining = 0;
            const heardOpponent = hearOpponent(enemy, false);
            if (!heardOpponent && receivedSquadIntel) {
              const calloutError = 0.65 + enemy.id * 0.12;
              enemy.lastKnownOpponentPosition
                .copy(squadLastKnownPosition)
                .add(
                  new THREE.Vector3(
                    Math.cos(enemy.id * 1.9) * calloutError,
                    0,
                    Math.sin(enemy.id * 1.9) * calloutError,
                  ),
                );
              enemy.combatMemory = Math.max(
                enemy.combatMemory,
                enemy.profile.memorySeconds - squadIntelAge,
              );
            }
          }
          const preparingUtility = updateBotUtility(enemy, seesPlayer, dt);
          updateBotSilencer(enemy, seesPlayer, preparingUtility);
          const botScope = updateBotScope(enemy, seesPlayer, distance, preparingUtility);
          const shouldInvestigate = !seesPlayer && enemy.combatMemory > 0;

          if (
            matchState.playerSide === 'ct' &&
            shouldInterruptPlant(
              enemy === bombCarrier,
              bombState === 'planting',
              shouldEngage,
              shouldInvestigate,
            )
          ) {
            bombState = 'carried';
            enemy.plantProgress = 0;
            message = shouldEngage
              ? 'BOMB PLANT INTERRUPTED — CARRIER ENGAGING'
              : 'BOMB PLANT INTERRUPTED — CARRIER SEARCHING';
          }

          if (preparingUtility || botScope.hold) {
            enemy.blockedSeconds = 0;
          } else if (shouldEngage) {
            if (enemy === enemyDefuser) enemyDefuseProgress = 0;
            if (
              shouldChooseEnemyMovement(
                enemy.movementDecisionTimer,
                enemy.burstShotsRemaining,
              )
            ) {
              enemy.combatMovement = getEnemyCombatMovement(
                distance,
                getEnemyPreferredRange(
                  enemy.primaryWeapon,
                  enemy.profile.preferredRange,
                ),
                Math.random(),
              );
              enemy.movementDecisionTimer = 0.65 + Math.random() * 0.95;
            }
            const forward = toPlayer.clone().normalize();
            const side = new THREE.Vector3(-forward.z, 0, forward.x);
            const movement = new THREE.Vector3();
            if (enemy.combatMovement === 'advance')
              movement
                .copy(forward)
                .multiplyScalar(0.82)
                .addScaledVector(side, 0.18);
            else if (enemy.combatMovement === 'retreat')
              movement
                .copy(forward)
                .multiplyScalar(-0.72)
                .addScaledVector(side, 0.24);
            else if (enemy.combatMovement === 'left')
              movement
                .copy(side)
                .multiplyScalar(-1)
                .addScaledVector(forward, 0.08);
            else if (enemy.combatMovement === 'right')
              movement.copy(side).addScaledVector(forward, 0.08);
            const combatSpeed = getEnemyPursuitSpeed(
              enemy.role,
              enemy.profile.aggression,
              enemy.suppression,
              enemy.burstShotsRemaining,
            );
            if (movement.lengthSq()) {
              movement.normalize();
              moveEnemyToward(
                enemy,
                new THREE.Vector2(
                  enemy.root.position.x + movement.x,
                  enemy.root.position.z + movement.z,
                ),
                combatSpeed,
                dt,
              );
            } else enemy.blockedSeconds = 0;
          } else if (shouldInvestigate) {
            if (enemy === enemyDefuser) enemyDefuseProgress = 0;
            const flankAngle = (enemy.id / enemies.length) * Math.PI * 2;
            const flankRadius = 0.8;
            const searchTarget = new THREE.Vector2(
              enemy.lastKnownOpponentPosition.x +
                Math.cos(flankAngle) * flankRadius,
              enemy.lastKnownOpponentPosition.z +
                Math.sin(flankAngle) * flankRadius,
            );
            const searchDistance = moveEnemyToward(
              enemy,
              searchTarget,
              getEnemyPursuitSpeed(
                enemy.role,
                enemy.profile.aggression,
                enemy.suppression,
                0,
              ),
              dt,
            );
            if (searchDistance < 0.9) enemy.combatMemory = 0;
          } else if (moveBotObjective(enemy, getBotObjectiveIntel(enemy), bombRetriever, dt)) {
            if (status !== 'active') return;
          } else if (enemy.side === 'ct') {
            if (Math.hypot(enemy.root.position.x - enemy.guardPoint.x, enemy.root.position.z - enemy.guardPoint.y) > 0.8)
              moveEnemyToward(enemy, enemy.guardPoint, 1.35, dt);
          } else if (enemy === bombCarrier && bombState === 'planting') {
            enemy.plantProgress = Math.min(1, enemy.plantProgress + dt / 3);
            message = `BOMB BEING PLANTED AT ${selectedBombsite} — ${Math.floor(enemy.plantProgress * 100)}%`;
            if (enemy.plantProgress >= 1) finishBotPlant();
          } else {
            const waypoint = enemy.route[enemy.waypointIndex];
            if (waypoint) {
              const waypointDistance = moveEnemyToward(
                enemy,
                waypoint,
                (enemy === bombCarrier ? 1.55 : 1.42) *
                  enemy.profile.aggression,
                dt,
              );
              if (waypointDistance < 1.1) enemy.waypointIndex += 1;
            } else if (enemy === bombCarrier && bombState === 'carried') {
              emitBotObjectiveActionCue(
                'plant-start',
                enemy.root.position,
                enemy.alive,
              );
              bombState = 'planting';
              enemy.plantProgress = 0;
              message = `BOMB BEING PLANTED AT ${selectedBombsite}`;
            }
          }

          if (!enemy.alive) return;

          if (!enemy.locomotionCommanded) {
            const braking = stepBotGroundVelocity({
              weapon: enemy.primaryWeapon, scoped: enemy.special.snapshot().zoom !== 0, grounded: enemy.grounded,
              velocity: {
                x: enemy.locomotionVelocityX,
                z: enemy.locomotionVelocityZ,
              },
              desiredVelocity: { x: 0, z: 0 },
              dtSeconds: dt,
            });
            applyBotLocomotionDisplacement(enemy, braking.velocity, dt);
          }
          if (!enemy.alive) return;
          if (!seesPlayer && enemy.movementSpeed > 0.08) {
            stepBotAimYaw(enemy, Math.atan2(enemy.locomotionVelocityX, enemy.locomotionVelocityZ) + Math.PI, dt);
          }
          emitBotHearingFootstep(enemy);
          const enemySpeed = enemy.movementSpeed;
          if (enemySpeed < 0.08)
            enemy.bodyYaw = stepBotBodyYaw(enemy.bodyYaw, enemy.aimYaw, dt);
          enemy.locomotionPhase = advanceBotStridePhase(
            enemy.locomotionPhase,
            enemySpeed,
            dt,
            enemy.grounded,
          );
          enemy.root.rotation.y = enemy.bodyYaw;
          // The root owns authoritative hit meshes. Keep it upright and
          // unpitched; all locomotion/action pose writes target the sibling rig.
          enemy.root.rotation.x = 0;
          enemy.root.rotation.z = 0;
          // Preserve the legacy authority-pivot writes for gameplay/hitbox
          // compatibility. QA never enters this live loop.
          const enemyLocomotionPose = getBotLocomotionPose({
            phase: enemy.locomotionPhase,
            speed: enemySpeed,
            acceleration: {
              x: enemy.lastAccelerationX,
              z: enemy.lastAccelerationZ,
            },
            aimYawDelta: wrapBotAngle(enemy.aimYaw - enemy.bodyYaw),
            grounded: enemy.grounded,
          });
          const enemyIdleSway =
            Math.sin(now * 0.0018 + enemy.id * 1.31) * 0.018;
          const enemyFireKick =
            THREE.MathUtils.clamp(
              enemy.muzzleFlash.intensity / visualProfile.muzzleIntensityMax,
              0,
              1,
            ) * 0.12;
          const enemyUtilityWindupProgress = preparingUtility
            ? 1 - (enemy.utility.pending?.remainingSeconds ?? 0) / BOT_UTILITY_WINDUP_SECONDS
            : 0;
          const enemyUtilityLift =
            Math.sin(enemyUtilityWindupProgress * Math.PI) * 0.42;
          enemy.leftLeg.rotation.x = enemyLocomotionPose.leftLegPitch;
          enemy.rightLeg.rotation.x = enemyLocomotionPose.rightLegPitch;
          enemy.leftArm.rotation.x =
            1.08 -
            enemyLocomotionPose.leftLegPitch * 0.16 +
            enemyIdleSway -
            enemyFireKick -
            enemyUtilityLift;
          enemy.rightArm.rotation.x =
            1.08 -
            enemyLocomotionPose.rightLegPitch * 0.16 -
            enemyIdleSway -
            enemyFireKick -
            enemyUtilityLift * 0.72;
          enemy.leftArm.rotation.y = enemyLocomotionPose.torsoAimYaw * 0.35;
          enemy.rightArm.rotation.y = enemyLocomotionPose.torsoAimYaw * 0.35;
          applyBotAnimationPresentation(enemy, dt);
          enemy.root.updateMatrixWorld(true);
          enemy.locomotionCommanded = false;

          const glockAction = updateBotGlock(enemy, contact?.id ?? null, seesPlayer, facingPlayer, distance, preparingUtility);
          if (glockAction.continuation && targetPosition) {
            enemy.ammo.magazine -= 1;
            commitBotShot(enemy, targetPosition, enemySpeed, true);
          }

          if (
            status === 'active' &&
            glockAction.canOpen &&
            botScope.canFire &&
            canEnemyFire({
              playerAlive: targetAlive,
              hasLineOfSight,
              blinded,
              inRange: distance < engagementRange,
              facingPlayer: facingPlayer || enemy.combatMemory > 0,
              sightSeconds: enemy.sightTime,
              reactionSeconds: getBotReactionTime(
                enemy.primaryWeapon, enemy.profile.reactionTime, roundBotDifficulty,
              ),
              fireCooldown: enemy.fireCooldown,
              reloadSeconds: enemy.reloadTimer,
              utilitySeconds: preparingUtility ? BOT_UTILITY_WINDUP_SECONDS : 0,
              hasMagazineAmmo: enemy.ammo.magazine > 0,
              burstShotsRemaining: enemy.burstShotsRemaining,
              activeShooters,
              activeBurstLimit: getBotActiveBurstLimit(roundBotDifficulty),
              carrierPlanting:
                enemy === bombCarrier && bombState === 'planting',
            })
          ) {
            if (enemy.burstShotsRemaining <= 0) {
              enemy.burstShotsRemaining = getEnemyBurstSize(
                enemy.primaryWeapon,
                Math.random(),
                distance,
              );
              activeShooters += 1;
            }
            if (enemy.primaryWeapon === 'glock18' && enemy.special.snapshot().burst)
              enemy.glockBurst.targetId = contact?.id ?? null;
            commitBotShot(enemy, targetPosition, enemySpeed);
            enemy.ammo.magazine -= 1;
            enemy.burstShotsRemaining -= 1;
            enemy.fireCooldown = constrainBotShotDelay(enemy.primaryWeapon,
              (enemy.burstShotsRemaining > 0
                ? getEnemyBurstShotCooldown(enemy.primaryWeapon, Math.random())
                : getEnemyFireCooldown(enemy.primaryWeapon, Math.random()) / enemy.profile.aggression), enemy.special.snapshot().burst);
            if (enemy.ammo.magazine <= 0) enemy.burstShotsRemaining = 0;
          }
        });

        const playerConfirmedSquadContact =
          playerConfirmedSquadContactRef.current;
        if (playerConfirmedSquadContact) {
          const contactWasReacquired =
            friendlyIntelTargetId !== playerConfirmedSquadContact.enemy.id ||
            friendlyIntelFreshnessAge > FRIENDLY_INTEL_RADIO_DELAY_SECONDS ||
            !Number.isFinite(friendlyIntelCalloutAge);
          if (contactWasReacquired) friendlyIntelCalloutAge = 0;
          friendlyIntelFreshnessAge = 0;
          friendlyIntelTargetId = playerConfirmedSquadContact.enemy.id;
          friendlyLastKnownEnemyPosition.copy(
            playerConfirmedSquadContact.enemy.root.position,
          );
        }

        let activeAllyShooters = allies.filter(
          (ally) => ally.alive && (ally.burstShotsRemaining > 0 || ally.special.snapshot().burstDeadlines.length > 0),
        ).length;
        allies.forEach((ally) => {
          if (status !== 'active' || !ally.alive) return;
          ally.motionResolvedThisTick = false;
          ally.locomotionCommanded = false;
          const visualProfile = getCombatVisualWeaponProfile(
            'bot',
            ally.primaryWeapon,
          );
          ally.muzzleFlash.intensity = THREE.MathUtils.lerp(
            ally.muzzleFlash.intensity,
            visualProfile.muzzleIntensityMin,
            getMuzzleFadeFactor(visualProfile, dt),
          );
          if (isSecondaryWeaponKind(ally.primaryWeapon)) {
            const secondaryProfile = getCombatVisualWeaponProfile(
              'bot',
              ally.primaryWeapon,
            );
            for (const muzzle of ally.secondaryMuzzles[ally.primaryWeapon]) {
              muzzle.intensity = THREE.MathUtils.lerp(
                muzzle.intensity,
                secondaryProfile.muzzleIntensityMin,
                getMuzzleFadeFactor(secondaryProfile, dt),
              );
            }
          }
          ally.fireCooldown -= dt;
          ally.movementDecisionTimer -= dt;
          ally.suppression = Math.max(0, ally.suppression - dt * 0.5);
          advanceBotWeapon(ally);
          ally.shots.advance(ally.primaryWeapon, simulationNowMs, dt,
            ally.burstShotsRemaining > 0 || ally.special.snapshot().burstDeadlines.length > 0);
          const contact = findVisibleOpponent(ally, enemies.map(enemy => ({
            id: `ally:${enemy.id}` as EnemyCombatTargetId, bot: enemy,
            position: enemy.root.position.clone().add(new THREE.Vector3(0, 1.35, 0)), alive: enemy.alive,
          })));
          const target = contact?.bot ?? undefined;
          const allyEye = ally.root.position
            .clone()
            .add(new THREE.Vector3(0, 1.65, 0));
          const targetPosition = target?.root.position
            .clone()
            .add(new THREE.Vector3(0, 1.35, 0));
          const toTarget = targetPosition
            ? targetPosition.clone().sub(allyEye)
            : new THREE.Vector3();
          const distance = toTarget.length();
          let hasLineOfSight = false;
          if (target && targetPosition) {
            const sightDirection = toTarget.clone().normalize();
            raycaster.set(allyEye, sightDirection);
            const sightObstruction = raycaster.intersectObjects(
              obstacleMeshes,
              false,
            )[0];
            const bodyObstruction = raycaster
              .intersectObjects(hitMeshes, false)
              .find((candidate) => {
                const bodyOwner = candidate.object.userData.enemy as Enemy;
                return bodyOwner?.alive && bodyOwner !== ally;
              });
            const smokeBlocked = Array.from(smokeClouds).some((cloud) => {
              if (getSmokeCloudOpacity(cloud.age) < 0.25) return false;
              const center = cloud.group.position
                .clone()
                .add(new THREE.Vector3(0, 1.15, 0));
              return segmentIntersectsSmoke(
                [allyEye.x, allyEye.y, allyEye.z],
                [targetPosition.x, targetPosition.y, targetPosition.z],
                [center.x, center.y, center.z],
                3.15 * Math.min(1, cloud.age / 0.65),
              );
            });
            hasLineOfSight =
              (!sightObstruction || sightObstruction.distance > distance) &&
              (!bodyObstruction ||
                bodyObstruction.distance > distance ||
                bodyObstruction.object.userData.enemy === target) &&
              !smokeBlocked;
          }
          const blinded = simulationNowMs < ally.blindUntilMs;
          const seesTarget =
            Boolean(target) &&
            !blinded &&
            hasLineOfSight &&
            distance < getEnemyEngagementRange(ally.primaryWeapon);
          const directContactId =
            seesTarget && target?.alive ? target.id : null;
          const previousDirectContactId =
            allyPreviousDirectContactIds[ally.id] ?? null;
          const shouldEmitEnemySpottedCallout =
            shouldEmitAllyEnemySpottedCallout({
              active: isPlaying && status === 'active',
              sourceAlive: ally.alive,
              targetAlive: Boolean(target?.alive),
              playerAlive,
              directContactId,
              previousDirectContactId,
              freezeSeconds: Math.max(0, (freezeEnds - simulationNowMs) / 1000),
              nowMs: simulationNowMs,
              nextCalloutAtMs: nextAllyEnemySpottedCalloutAtMs,
              radioBusy: simulationNowMs < radioCalloutUntilMs,
            });
          allyPreviousDirectContactIds[ally.id] = directContactId;
          if (shouldEmitEnemySpottedCallout) {
            radioCalloutText = ALLY_ENEMY_SPOTTED_CALLOUT_TEXT;
            radioCalloutUntilMs =
              simulationNowMs + ALLY_ENEMY_SPOTTED_CALLOUT_MS;
            nextAllyEnemySpottedCalloutAtMs =
              simulationNowMs + ALLY_ENEMY_SPOTTED_COOLDOWN_MS;
          }
          ally.sightTime = seesTarget
            ? ally.sightTime + dt
            : Math.max(0, ally.sightTime - dt * 2.5);

          ally.combatMemory = Math.max(0, ally.combatMemory - dt);
          hearOpponent(ally, seesTarget);
          if (seesTarget && targetPosition) {
            ally.lastKnownOpponentPosition.copy(targetPosition);
            ally.combatMemory = ally.profile.memorySeconds;
          }

          const preparingUtility = updateBotUtility(ally, seesTarget, dt);
          if (seesTarget && targetPosition)
            stepBotAimYaw(ally, Math.atan2(toTarget.x, toTarget.z) + Math.PI, dt);
          updateBotSilencer(ally, seesTarget, preparingUtility);
          const botScope = updateBotScope(ally, seesTarget, distance, preparingUtility);

          const allyObjectiveIntel = getBotObjectiveIntel(ally);
          const allyObjectiveLocked = ally === bombRetriever || allyObjectiveIntel?.kind === 'planted' ||
            ally === bombCarrier || (ally.side === 't' && allyObjectiveIntel?.kind === 'carrier');
          const shouldInvestigateFriendlyIntel = shouldAllyInvestigateIntel({
            hasDirectContact: seesTarget,
            objectiveLocked: allyObjectiveLocked,
            calloutAgeSeconds: friendlyIntelCalloutAge,
            freshnessAgeSeconds: friendlyIntelFreshnessAge,
            memorySeconds: ally.profile.memorySeconds,
          });
          const shouldRespondToBackup = shouldAllyRespondToBackup({
            hasDirectContact: seesTarget,
            objectiveLocked: allyObjectiveLocked,
            playerAlive,
            requestAgeSeconds: backupRequestAgeSeconds,
          });

          if (seesTarget && ally === enemyDefuser) enemyDefuseProgress = 0;
          if (seesTarget && ally === bombCarrier && bombState === 'planting') {
            bombState = 'carried';
            ally.plantProgress = 0;
            message = 'BOMB PLANT INTERRUPTED — CARRIER ENGAGING';
          }

          if (preparingUtility || botScope.hold) {
            ally.blockedSeconds = 0;
          } else if (seesTarget && targetPosition) {
            if (
              shouldChooseEnemyMovement(
                ally.movementDecisionTimer,
                ally.burstShotsRemaining,
              )
            ) {
              ally.combatMovement = getEnemyCombatMovement(
                distance,
                getEnemyPreferredRange(
                  ally.primaryWeapon,
                  ally.profile.preferredRange,
                ),
                Math.random(),
              );
              ally.movementDecisionTimer = 0.8 + Math.random();
            }
            const forward = toTarget.clone().setY(0).normalize();
            const side = new THREE.Vector3(-forward.z, 0, forward.x);
            const movement =
              ally.combatMovement === 'retreat'
                ? forward.multiplyScalar(-0.55)
                : ally.combatMovement === 'left'
                  ? side.multiplyScalar(-1)
                  : ally.combatMovement === 'right'
                    ? side
                    : forward.multiplyScalar(0.42);
            if (movement.lengthSq()) {
              movement.normalize();
              moveEnemyToward(
                ally,
                new THREE.Vector2(
                  ally.root.position.x + movement.x,
                  ally.root.position.z + movement.z,
                ),
                1.35,
                dt,
              );
            } else ally.blockedSeconds = 0;
          } else if (moveBotObjective(ally, allyObjectiveIntel, bombRetriever, dt)) {
            if (status !== 'active') return;
          } else if (ally === bombCarrier && bombState === 'planting') {
            ally.plantProgress = Math.min(1, ally.plantProgress + dt / 3);
            message = `${ally.name.toUpperCase()} PLANTING AT ${selectedBombsite}`;
            if (ally.plantProgress >= 1) finishBotPlant();
          } else if (!allyObjectiveLocked && ally.combatMemory > 0) {
            const searchDistance = moveEnemyToward(ally, new THREE.Vector2(
              ally.lastKnownOpponentPosition.x, ally.lastKnownOpponentPosition.z,
            ), 1.55, dt);
            if (searchDistance < 0.9) ally.combatMemory = 0;
          } else if (shouldRespondToBackup) {
            const backupTarget = backupCallTargets[ally.id];
            if (
              Math.hypot(
                ally.root.position.x - backupTarget.x,
                ally.root.position.z - backupTarget.y,
              ) > 0.85
            )
              moveEnemyToward(ally, backupTarget, 1.85, dt);
          } else if (shouldInvestigateFriendlyIntel) {
            const searchAngle = (ally.id / allies.length) * Math.PI * 2 + 0.37;
            const searchRadius = 1.45 + ally.id * 0.14;
            const searchTarget = new THREE.Vector2(
              friendlyLastKnownEnemyPosition.x +
                Math.cos(searchAngle) * searchRadius,
              friendlyLastKnownEnemyPosition.z +
                Math.sin(searchAngle) * searchRadius,
            );
            if (
              Math.hypot(
                ally.root.position.x - searchTarget.x,
                ally.root.position.z - searchTarget.y,
              ) > 0.85
            )
              moveEnemyToward(ally, searchTarget, 1.55, dt);
          } else if (ally.side === 't') {
            if (ally !== bombCarrier && allyObjectiveIntel?.kind === 'carrier') {
              const escortAngle = (ally.id / allies.length) * Math.PI * 2;
              const escortTarget = new THREE.Vector2(
                allyObjectiveIntel.position.x + Math.cos(escortAngle) * 3,
                allyObjectiveIntel.position.z + Math.sin(escortAngle) * 3,
              );
              if (
                Math.hypot(
                  ally.root.position.x - escortTarget.x,
                  ally.root.position.z - escortTarget.y,
                ) > 1.25
              )
                moveEnemyToward(ally, escortTarget, 1.75, dt);
            } else {
              const waypoint = ally.route[ally.waypointIndex];
              if (waypoint) {
                if (moveEnemyToward(ally, waypoint, 1.55, dt) < 1.1)
                  ally.waypointIndex += 1;
              } else if (ally === bombCarrier && bombState === 'carried') {
                emitBotObjectiveActionCue(
                  'plant-start',
                  ally.root.position,
                  ally.alive,
                );
                bombState = 'planting';
                ally.plantProgress = 0;
              }
            }
          } else if (ally.side === 'ct') {
            if (
              Math.hypot(
                ally.root.position.x - ally.guardPoint.x,
                ally.root.position.z - ally.guardPoint.y,
              ) > 0.9
            )
              moveEnemyToward(ally, ally.guardPoint, 1.35, dt);
          }

          if (!ally.alive) return;

          if (!ally.locomotionCommanded) {
            const braking = stepBotGroundVelocity({
              weapon: ally.primaryWeapon, scoped: ally.special.snapshot().zoom !== 0, grounded: ally.grounded,
              velocity: {
                x: ally.locomotionVelocityX,
                z: ally.locomotionVelocityZ,
              },
              desiredVelocity: { x: 0, z: 0 },
              dtSeconds: dt,
            });
            applyBotLocomotionDisplacement(ally, braking.velocity, dt);
          }
          if (!ally.alive) return;
          if (!seesTarget && ally.movementSpeed > 0.08) {
            stepBotAimYaw(ally, Math.atan2(ally.locomotionVelocityX, ally.locomotionVelocityZ) + Math.PI, dt);
          }
          emitBotHearingFootstep(ally);
          const allySpeed = ally.movementSpeed;
          if (allySpeed < 0.08)
            ally.bodyYaw = stepBotBodyYaw(ally.bodyYaw, ally.aimYaw, dt);
          ally.locomotionPhase = advanceBotStridePhase(
            ally.locomotionPhase,
            allySpeed,
            dt,
            ally.grounded,
          );
          ally.root.rotation.y = ally.bodyYaw;
          // Keep authoritative proxies upright and unpitched. The visual
          // rig receives the locomotion/action pose below.
          ally.root.rotation.x = 0;
          ally.root.rotation.z = 0;
          // Keep the old authority-pivot contract intact in production; the
          // visual-QA path is paused before this loop can execute.
          const allyLocomotionPose = getBotLocomotionPose({
            phase: ally.locomotionPhase,
            speed: allySpeed,
            acceleration: {
              x: ally.lastAccelerationX,
              z: ally.lastAccelerationZ,
            },
            aimYawDelta: wrapBotAngle(ally.aimYaw - ally.bodyYaw),
            grounded: ally.grounded,
          });
          const allyIdleSway = Math.sin(now * 0.0018 + ally.id * 1.31) * 0.018;
          const allyFireKick =
            THREE.MathUtils.clamp(
              ally.muzzleFlash.intensity / visualProfile.muzzleIntensityMax,
              0,
              1,
            ) * 0.12;
          ally.leftLeg.rotation.x = allyLocomotionPose.leftLegPitch;
          ally.rightLeg.rotation.x = allyLocomotionPose.rightLegPitch;
          ally.leftArm.rotation.x =
            1.08 -
            allyLocomotionPose.leftLegPitch * 0.16 +
            allyIdleSway -
            allyFireKick;
          ally.rightArm.rotation.x =
            1.08 -
            allyLocomotionPose.rightLegPitch * 0.16 -
            allyIdleSway -
            allyFireKick;
          ally.leftArm.rotation.y = allyLocomotionPose.torsoAimYaw * 0.35;
          ally.rightArm.rotation.y = allyLocomotionPose.torsoAimYaw * 0.35;
          applyBotAnimationPresentation(ally, dt);
          ally.root.updateMatrixWorld(true);
          ally.locomotionCommanded = false;
          const allyHorizontalDistance = Math.hypot(toTarget.x, toTarget.z);
          const allyFacingTarget =
            distance < 2 ||
            allyHorizontalDistance < 0.001 ||
            (-Math.sin(ally.aimYaw) * toTarget.x -
              Math.cos(ally.aimYaw) * toTarget.z) /
              allyHorizontalDistance >
              0.9;

          const glockAction = updateBotGlock(ally, contact?.id ?? null, seesTarget, allyFacingTarget, distance, preparingUtility);
          if (glockAction.continuation && targetPosition) {
            ally.ammo.magazine -= 1;
            commitBotShot(ally, targetPosition, allySpeed, true);
          }

          if (
            target &&
            targetPosition &&
            glockAction.canOpen &&
            botScope.canFire &&
            canEnemyFire({
              playerAlive: target.alive,
              hasLineOfSight,
              blinded,
              inRange: distance < getEnemyEngagementRange(ally.primaryWeapon),
              facingPlayer: allyFacingTarget,
              sightSeconds: ally.sightTime,
              reactionSeconds: getBotReactionTime(
                ally.primaryWeapon, ally.profile.reactionTime, roundBotDifficulty,
              ),
              fireCooldown: ally.fireCooldown,
              reloadSeconds: ally.reloadTimer,
              utilitySeconds: preparingUtility ? BOT_UTILITY_WINDUP_SECONDS : 0,
              hasMagazineAmmo: ally.ammo.magazine > 0,
              burstShotsRemaining: ally.burstShotsRemaining,
              activeShooters: activeAllyShooters,
              activeBurstLimit: getBotActiveBurstLimit(roundBotDifficulty),
              carrierPlanting: ally === bombCarrier && bombState === 'planting',
            })
          ) {
            if (ally.burstShotsRemaining <= 0) {
              ally.burstShotsRemaining = getEnemyBurstSize(
                ally.primaryWeapon,
                Math.random(),
                distance,
              );
              activeAllyShooters += 1;
            }
            if (ally.primaryWeapon === 'glock18' && ally.special.snapshot().burst)
              ally.glockBurst.targetId = contact?.id ?? null;
            commitBotShot(ally, targetPosition, allySpeed);
            ally.ammo.magazine -= 1;
            ally.burstShotsRemaining -= 1;
            ally.fireCooldown = constrainBotShotDelay(ally.primaryWeapon,
              ally.burstShotsRemaining > 0
                ? getEnemyBurstShotCooldown(ally.primaryWeapon, Math.random())
                : getEnemyFireCooldown(ally.primaryWeapon, Math.random()), ally.special.snapshot().burst);
            if (ally.ammo.magazine <= 0) ally.burstShotsRemaining = 0;
          }
        });
        resolveTeamElimination();
        recordFallRoundResolution();
        emitNextBotFootstep();
        publishHud(wallNow);
      }

      requestTickPresentation(!playerAlive ? applyDeathOrSpectatorPresentation : undefined);
    };
    let lifecycleReplayCancelled = false;
    let lifecycleReplayRunning = false;
    if (isMatchLifecycleQaEnabled(window.location.search, window.location.hostname)) {
      const snapshotLifecycle = (): LifecycleSnapshot => {
        const secondaryAmmo = player.secondaryWeapon ? player.ammo[player.secondaryWeapon] : null;
        return {
          status, scores: { ...matchState.scores }, side: matchState.playerSide,
          losses: { ...matchState.lossStreaks }, bank: player.money,
          botBanks: bots.map(bot => bot.money), bomb: bombState, bombVisible: bomb.visible,
          preparationPending: roundTransitionTimer !== null,
          receiptRound: completedRoundReceipt?.roundNumber ?? null,
          health: player.health, speed: player.velocity.length(), crouched: player.crouched,
          blind: playerBlindUntilMs > simulationNowMs, pressedKeys: keys.size,
          explosions: explosionEffects.size, roundSeconds,
          freezeSeconds: Math.max(0, (freezeEnds - simulationNowMs) / 1000),
          secondary: player.secondaryWeapon, magazine: secondaryAmmo?.magazine ?? 0,
          reserve: secondaryAmmo?.reserve ?? 0,
        };
      };
      lifecycleReplayRef.current = () => {
        if (lifecycleReplayRunning || status !== 'briefing') return;
        lifecycleReplayRunning = true;
        void runMatchLifecycleReplay({
          startMatch: () => dispatchActualRoundStart(status, restartRef.current),
          snapshot: snapshotLifecycle,
          resolve: event => { resolveRoundEvent(event, `LIFECYCLE FIXTURE: ${event}`); },
          plant: () => commitPlant('A'),
          detonate: () => {
            detonateBomb(simulationNowMs);
            resolveRoundEvent('bomb-detonated', 'BOMB DETONATED — TERRORISTS WIN');
          },
          defuse: () => {
            playObjectiveActionCue('defuse-complete');
            completePlantedBombDefuse(null);
          },
          dirtyResetState: () => {
            player.health = 37;
            player.velocity.set(1, 0, 2);
            player.crouched = true;
            playerBlindUntilMs = simulationNowMs + 10000;
            playerBlindDurationSeconds = 10;
            keys.add('KeyW');
          },
          wait: milliseconds => new Promise((resolve, reject) => {
            const timer = window.setTimeout(() => {
              cleanupTimers.delete(timer);
              if (lifecycleReplayCancelled) reject(new Error('Page replay disposed'));
              else resolve();
            }, milliseconds);
            cleanupTimers.add(timer);
          }),
          now: () => performance.now(),
        }, report => {
          if (!lifecycleReplayCancelled) setLifecycleReport(report);
        }).finally(() => { lifecycleReplayRunning = false; });
      };
    }

    scheduleNextFrame();
    publishHud(0);
    mount.dataset.characterAssetReady = 'true';
    mount.dataset.visualQaReady = 'true';
    publishGraphicsBudget('ready');
    const loadedBudgetTimer = window.setTimeout(() => {
      publishGraphicsBudget('ready');
      cleanupTimers.delete(loadedBudgetTimer);
    }, 1000);
    cleanupTimers.add(loadedBudgetTimer);

    return () => {
      visualToolkitCleanup();
      lifecycleReplayCancelled = true;
      lifecycleReplayRef.current = () => undefined;
      mountainPanoramaLoadActive = false;
      delete mount.dataset.mountainPanoramaReady;
      delete mount.dataset.characterAssetReady;
      delete mount.dataset.visualQaReady;
      delete mount.dataset.graphicsBudget;
      cancelAnimationFrame(animationFrame);
      if (fastForwardTimer !== null) window.clearTimeout(fastForwardTimer);
      clearRoundTransition();
      keyboardPlaytestTapLatches = clearKeyboardPlaytestTapLatches();
      cleanupTimers.forEach((timer) => window.clearTimeout(timer));
      activeTracers.forEach((tracer) => {
        scene.remove(tracer);
        tracer.geometry.dispose();
        (tracer.material as THREE.Material).dispose();
      });
      activeTracers.clear();
      clearDroppedFirearms();
      clearGrenadeProjectiles();
      bots.forEach((bot) => disposeSkinnedCharacterInstance(bot.skinned));
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('pointerlockerror', onPointerLockError);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener(
        'pointerdown',
        onCanvasPointerDown,
      );
      renderer.domElement.removeEventListener(
        'pointermove',
        onCanvasPointerMove,
      );
      renderer.domElement.removeEventListener('pointerup', onCanvasPointerUp);
      renderer.domElement.removeEventListener(
        'pointercancel',
        onCanvasPointerUp,
      );
      if (document.pointerLockElement === renderer.domElement)
        document.exitPointerLock();
      bulletMarkRoot.remove(...bulletMarkRoot.children);
      decorativeDetailRoot.remove(bulletMarkRoot);
      bulletMarkGeometry.dispose();
      (Object.keys(bulletMarkBatches) as PersistentBulletMarkKind[]).forEach(
        (kind) => {
          bulletMarkBatches[kind].material.dispose();
          bulletMarkBatches[kind].texture.dispose();
        },
      );
      for (const { kind, mesh } of silencerVisuals) {
        if (!weaponViews[kind].authoredAnimation) continue;
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      Object.values(weaponViews).forEach((view) => view.authoredAnimation?.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((object) => {
        if (object instanceof THREE.Sprite) {
          object.material.dispose();
          return;
        }
        if (!(object instanceof THREE.Mesh)) return;
        if (
          !texturedViewmodelArmFactory.ownsGeometry(object.geometry) &&
          !characterLimbOutputGeometries.has(object.geometry)
        )
          object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => {
          if (texturedViewmodelArmFactory.ownsMaterial(material)) return;
          const textureMaps = ['map' in material ? material.map : null];
          textureMaps.forEach((textureMap) => {
            if (textureMap instanceof THREE.Texture) textureMap.dispose();
          });
          material.dispose();
        });
      });
      characterLimbOutputGeometries.forEach((geometry) => geometry.dispose());
      // The controllers cloned these shared sources during bot setup, so no
      // scene mesh owns the originals by the time traversal cleanup runs.
      facetedLegGeometry.dispose();
      facetedArmGeometry.dispose();
      texturedViewmodelArmFactory.dispose();
      Object.values(worldFirearmMaterials).forEach((material) =>
        material.dispose(),
      );
      weaponSurfaceFinish.dispose();
      characterRenderVariants.length = 0;
      muzzleTexture.dispose();
      Object.values(surfaceImpactTextures).forEach((texture) =>
        texture.dispose(),
      );
      void audioContext?.close();
      restartRef.current = () => undefined;
      skipBotRoundRef.current = () => false;
      applySettingsRef.current = () => undefined;
      purchaseRef.current = () => undefined;
      touchInputRef.current = {
        setKey: () => undefined,
        setFiring: () => undefined,
        jump: () => undefined,
        reload: () => undefined,
        toggleScope: () => undefined,
        dropWeapon: () => undefined,
        cycleWeapon: () => undefined,
        cycleSpectator: () => undefined,
        callBackup: () => undefined,
        toggleBuy: () => undefined,
        setScoreboard: () => undefined,
        start: () => undefined,
        pause: () => undefined,
      };
    };
  }, [characterAssetStatus]);

  const updateSettings = (patch: Partial<GameSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      engineSettingsRef.current = next;
      applySettingsRef.current(next);
      window.localStorage.setItem('dustline-settings', JSON.stringify(next));
      return next;
    });
  };

  const deploy = () => {
    if (characterAssetStatus !== 'ready') return;
    const startRound = () => {
      dispatchActualRoundStart(hud.status, restartRef.current);
    };
    if (window.matchMedia('(pointer: coarse)').matches) {
      startRound();
      touchInputRef.current.start();
      return;
    }
    const canvas = mountRef.current?.querySelector('canvas');
    if (!canvas) {
      setControlNotice('The game canvas is unavailable. Reload to try again.');
      return;
    }
    setControlNotice('');
    try {
      void Promise.resolve(canvas.requestPointerLock())
        .then(() => {
          startRound();
          canvas.focus();
        })
        .catch(() => {
          setControlNotice(
            'Mouse capture was blocked. Click Deploy / Resume and allow mouse control to retry.',
          );
        });
    } catch {
      setControlNotice(
        'Mouse capture was blocked. Click Deploy / Resume and allow mouse control to retry.',
      );
    }
  };

  const startKeyboardPlaytest = () => {
    if (characterAssetStatus !== 'ready') return;
    dispatchActualRoundStart(hud.status, restartRef.current);
    touchInputRef.current.start();
    const canvas = mountRef.current?.querySelector('canvas');
    // The browser automation surface sends keypresses to the focused element.
    // Keep this explicit for keyboard QA without requesting pointer lock.
    canvas?.focus();
    window.requestAnimationFrame(() => canvas?.focus());
  };

  const classicStatusMessage = getClassicStatusMessage(
    hud.message, hud.playerHasBomb && hud.plantProgress > 0, hud.defuseProgress > 0,
  );
  const overlayTitle =
    hud.status === 'round-won'
      ? 'ROUND SECURED'
      : hud.status === 'round-lost'
        ? 'ROUND LOST'
        : hud.status === 'match-won'
          ? 'MISSION ACCOMPLISHED'
          : hud.status === 'match-lost'
            ? 'MISSION FAILED'
            : hud.status === 'active' && hud.freezeSeconds > 0
              ? 'FREEZE TIME'
              : locked
                ? ''
                : hud.status === 'active'
                  ? 'PAUSED'
                  : 'OPERATION DUSTLINE';
  const isRoundResult =
    hud.status === 'round-won' || hud.status === 'round-lost';
  const primaryDefinition = hud.primaryWeapon
    ? FIREARMS[hud.primaryWeapon]
    : null;
  const secondaryDefinition = hud.secondaryWeapon
    ? FIREARMS[hud.secondaryWeapon]
    : null;
  const pistolBuyOptions = [1, 2, 3, 4, 5]
    .map((slot) => {
      const kind = getPistolBuyOption(hud.playerSide, slot);
      return kind ? { slot, kind, definition: FIREARMS[kind] } : null;
    })
    .filter(
      (
        option,
      ): option is {
        slot: number;
        kind: SecondaryWeaponKind;
        definition: (typeof FIREARMS)[SecondaryWeaponKind];
      } => option !== null,
    );
  const serviceRifleDefinition =
    FIREARMS[getServiceRifleForSide(hud.playerSide)];
  const assaultSuitCost =
    hud.armor >= 100
      ? hud.helmet
        ? 0
        : EQUIPMENT_PRICES.helmet
      : hud.helmet
        ? EQUIPMENT_PRICES.kevlar
        : EQUIPMENT_PRICES.assaultSuit;
  const assaultSuitLabel =
    hud.armor >= 100 && !hud.helmet
      ? 'HELMET UPGRADE'
      : hud.helmet
        ? 'KEVLAR REFILL'
        : 'KEVLAR + HELMET';
  const sideOnboarding = getSideOnboarding(hud.playerSide);
  const playerScoreboardRow = (
    <tr key="player">
      <td>
        <i className="scoreboard-avatar">YOU</i>
        <b>YOU</b>
      </td>
      <td className={hud.playerAlive ? 'alive' : 'out'}>
        {hud.playerAlive ? (hud.playerHasBomb ? 'BOMB' : 'ALIVE') : 'OUT'}
      </td>
      <td>{hud.playerKills}</td>
      <td>{hud.playerDeaths}</td>
      <td>12</td>
    </tr>
  );
  const enemyScoreboardRows = hud.enemyRoster.map((enemy) => (
    <tr key={`enemy-${enemy.id}`} className={!enemy.alive ? 'eliminated' : ''}>
      <td>
        <i className="scoreboard-avatar">
          {String(enemy.id + 1).padStart(2, '0')}
        </i>
        <b>{enemy.name}</b>
      </td>
      <td className={enemy.alive ? 'alive' : 'out'}>
        {enemy.alive ? 'ALIVE' : 'OUT'}
      </td>
      <td>{enemy.kills}</td>
      <td>{enemy.deaths}</td>
      <td>{18 + enemy.id * 7}</td>
    </tr>
  ));
  const allyScoreboardRows = hud.allyRoster.map((ally) => (
    <tr key={`ally-${ally.id}`} className={!ally.alive ? 'eliminated' : ''}>
      <td>
        <i className="scoreboard-avatar">
          {String(ally.id + 1).padStart(2, '0')}
        </i>
        <b>{ally.name}</b>
      </td>
      <td className={ally.alive ? 'alive' : 'out'}>
        {ally.alive ? (ally.hasBomb ? 'BOMB' : 'ALIVE') : 'OUT'}
      </td>
      <td>{ally.kills}</td>
      <td>{ally.deaths}</td>
      <td>{16 + ally.id * 6}</td>
    </tr>
  ));
  const friendlyScoreboardRows = [playerScoreboardRow, ...allyScoreboardRows];

  return (
    <main
      className="game-shell"
      data-playtest-status={hud.status}
      data-playtest-round={hud.roundNumber}
      data-playtest-phase={hud.roundPhase.label}
      data-playtest-last-result={
        hud.completedRoundReceipt
          ? `${hud.completedRoundReceipt.playerWon ? 'won' : 'lost'}:${hud.completedRoundReceipt.roundNumber}`
          : undefined
      }
      data-playtest-last-result-score={
        hud.completedRoundReceipt
          ? `${hud.completedRoundReceipt.score.ct}-${hud.completedRoundReceipt.score.t}`
          : undefined
      }
      data-playtest-last-result-reason={
        hud.completedRoundReceipt?.reason || undefined
      }
      data-playtest-skip-bot-round={
        hud.skippingBotRound
          ? 'resolving'
          : hud.canSkipBotRoundWait
            ? 'available'
            : undefined
      }
      data-character-assets={characterAssetStatus}
      data-graphics-budget={graphicsBudgetSnapshot || undefined}
      data-frame-profile={frameProfileSnapshot || undefined}
    >
      {lifecycleQaAvailable && (
        <section aria-label="Local match lifecycle replay" style={{
          position: 'absolute', inset: '12px 12px auto auto', zIndex: 100,
          width: 'min(540px, calc(100% - 24px))', maxHeight: '70vh', overflow: 'auto',
          background: '#151a14', color: '#e4cf91', padding: 16, border: '1px solid #e4cf91',
        }}>
          <strong>LOCAL MATCH LIFECYCLE REPLAY</strong>
          <p>Scripted results through the real match code and three-second timers.
            This checks settlement and preparation; it does not simulate combat.</p>
          <button disabled={characterAssetStatus !== 'ready' || lifecycleReport !== null}
            onClick={() => lifecycleReplayRef.current()}>RUN MATCH LIFECYCLE REPLAY</button>
          <output>{lifecycleReport
            ? `${lifecycleReport.status.toUpperCase()} · ${lifecycleReport.checks} checks · ${lifecycleReport.progress}`
            : 'Ready when character assets finish loading.'}</output>
          {lifecycleReport?.error && <p role="alert">{lifecycleReport.error}</p>}
          {lifecycleReport && <details><summary>Lifecycle evidence JSON</summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 10 }}>{JSON.stringify(lifecycleReport, null, 2)}</pre>
          </details>}
        </section>
      )}
      <div
        ref={mountRef}
        className="game-canvas"
        aria-label="Dustline tactical FPS game view"
      />

      <div
        className="flash-overlay"
        style={{ opacity: hud.flashOpacity }}
        aria-hidden="true"
      />

      <div
        className={`damage-vignette ${damageFlash ? 'is-hit' : ''}`}
        aria-hidden="true"
      />
      {hud.scoped && (
        <div className="scope-overlay" aria-hidden="true">
          <span />
        </div>
      )}
      {damageDirection && (
        <div
          className={`damage-direction ${damageDirection}`}
          aria-hidden="true"
        >
          <span className="front" />
          <span className="right" />
          <span className="back" />
          <span className="left" />
        </div>
      )}

      <header className="round-bar" aria-label="Round information">
        <div className="team team-ct">
          <span className="team-mark">CT</span>
          <span>COUNTER-TERRORISTS</span>
        </div>
        <div className="score-block">
          <span className="score ct-score">{hud.ctScore}</span>
          <time>{formatRoundTime(hud.seconds)}</time>
          <span className="score t-score">{hud.tScore}</span>
          <small>
            {hud.roundPhase.label} · ROUND {hud.roundPhase.roundNumber} · FIRST
            TO {hud.roundPhase.targetScore}
          </small>
        </div>
        <div className="team team-t">
          <span>TERRORISTS</span>
          <span className="team-mark">T</span>
        </div>
      </header>

      <aside
        className="radar"
        aria-label={`Radar showing ${hud.friendlyAlive} squad members`}
      >
        <div className="radar-grid" />
        <span
          aria-hidden="true"
          className={`radar-player ${hud.playerSide}`}
          style={(() => {
            const position = getRadarMapPosition(
              hud.radarPlayer.x,
              hud.radarPlayer.z,
            );
            return {
              left: `${position.leftPercent}%`,
              top: `${position.topPercent}%`,
              transform: `translate(-50%, -50%) rotate(${getRadarHeadingDegrees(hud.radarPlayer.yaw)}deg)`,
            };
          })()}
        />
        {hud.radarContacts.map((contact) => {
          const position = getRadarMapPosition(contact.x, contact.z);
          return (
            <span
              key={contact.id}
              className={`radar-contact ${contact.team} ${contact.hasBomb ? 'has-bomb' : ''}`}
              style={{
                left: `${position.leftPercent}%`,
                top: `${position.topPercent}%`,
              }}
            />
          );
        })}
        {(
          Object.entries(BOMBSITES) as Array<[BombsiteName, [number, number]]>
        ).map(([name, [x, z]]) => {
          const position = getRadarMapPosition(x, z);
          return (
            <span
              key={name}
              className="radar-site"
              style={{
                left: `${position.leftPercent}%`,
                top: `${position.topPercent}%`,
              }}
            >
              {name}
            </span>
          );
        })}
      </aside>

      <div
        className={`objective-banner ${hud.bombPlanted ? 'bomb-live' : ''}`}
        aria-live="polite"
      >
        <span className="objective-pip" />
        {classicStatusMessage}
      </div>

      {hud.radioCallout && (
        <div className="radio-callout" aria-live="polite">
          {hud.radioCallout}
        </div>
      )}

      {locked && hud.buyTime > 0 && (
        <div
          className={`buy-zone-indicator ${hud.buyBlockReason ? 'blocked' : 'available'}`}
        >
          {hud.buyBlockReason === 'outside-buy-zone'
            ? 'RETURN TO SPAWN TO BUY'
            : hud.buyBlockReason
              ? 'REQUISITIONS LOCKED'
              : `BUY ZONE · B · ${formatRoundTime(hud.buyTime)}`}
        </div>
      )}

      {hud.playerAlive && hud.canDefuse && hud.bombPlanted && (
        <div className="defuse-panel in-range">
          <span>HOLD E — DEFUSE</span>
          <div className="defuse-track"><i style={{ width: `${hud.defuseProgress * 100}%` }} /></div>
        </div>
      )}
      {hud.playerAlive && hud.playerHasBomb && hud.bombState === 'planting' && (
        <div className="plant-panel">
          <span>PLANTING C4</span>
          <div className="plant-track"><i style={{ width: `${hud.plantProgress * 100}%` }} /></div>
        </div>
      )}

      {!hud.playerAlive && (
        <output className="spectator-banner" aria-live="polite">
          <small>
            {hud.deathCameraActive ? 'KILLED' : 'DEATH CAM'} ·{' '}
            {hud.spectating?.team.toUpperCase() ?? 'ROUND'}
          </small>
          <strong>
            {hud.spectating
              ? `${hud.deathCameraActive ? 'NEXT: ' : 'SPECTATING '}${hud.spectating.name.toUpperCase()}`
              : 'YOUR SQUAD ELIMINATED'}
          </strong>
          {!hud.deathCameraActive && hud.canCycleSpectator && (
            <small className="spectator-cycle-hint">
              ARROW RIGHT / NEXT — SQUADMATE
            </small>
          )}
        </output>
      )}

      {!hud.playerAlive &&
        (hud.canSkipBotRoundWait || hud.skippingBotRound) && (
          <button
            type="button"
            className="skip-bot-round"
            disabled={hud.skippingBotRound}
            aria-keyshortcuts="N"
            onClick={() => skipBotRoundRef.current()}
          >
            {hud.skippingBotRound ? (
              'RESOLVING ROUND…'
            ) : (
              <>
                SKIP TO NEXT ROUND <kbd>N</kbd>
              </>
            )}
          </button>
        )}

      {hud.killFeed.length > 0 && (
        <div className="kill-feed" aria-live="polite">
          {hud.killFeed.map((entry, index) => (
            <div key={`${entry}-${index}`}>{entry}</div>
          ))}
        </div>
      )}

      {hud.nearbyFirearm && hud.playerAlive && (
        <div className="pickup-prompt" aria-live="polite">
          {(
            isPrimaryWeaponKind(hud.nearbyFirearm.kind)
              ? hud.primaryWeapon
              : hud.secondaryWeapon
          )
            ? `SELECT ITS SLOT · G DROP CURRENT · E RECOVER ${FIREARMS[hud.nearbyFirearm.kind].label}`
            : `HOLD E TO RECOVER ${FIREARMS[hud.nearbyFirearm.kind].label} · ${String(hud.nearbyFirearm.magazine).padStart(2, '0')} / ${hud.nearbyFirearm.reserve}`}
        </div>
      )}

      {hud.playerAlive && !hud.scoped && (
        <div
          className="crosshair"
          style={
            { '--crosshair-gap': `${hud.crosshairGap}px` } as CSSProperties
          }
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
          <span />
        </div>
      )}

      <section className="status-hud" aria-label="Player status">
        <div className="status-item">
          <span className="status-icon">+</span>
          <strong>{hud.health}</strong>
          <small>HEALTH</small>
        </div>
        <div
          className="status-item armor"
          aria-label={`Armor ${hud.armor}${hud.helmet ? ', helmet equipped' : ''}`}
        >
          <span className="status-icon">{hud.helmet ? '◈' : '◇'}</span>
          <strong>{hud.armor}</strong>
          <small>{hud.helmet ? 'ARMOR · HELMET' : 'ARMOR'}</small>
        </div>
      </section>

      <section className="weapon-hud" aria-label="Weapon and ammunition">
        <span className="weapon-name">{hud.weaponName}</span>
        <div className="ammo-count">
          <strong>
            {hud.ammoDisplay === 'melee' || hud.ammoDisplay === 'objective'
              ? '--'
              : String(hud.ammo).padStart(2, '0')}
          </strong>
          <span>
            {hud.ammoDisplay === 'melee'
              ? 'MELEE'
              : hud.ammoDisplay === 'objective'
                ? 'DEVICE'
                : hud.ammoDisplay === 'throwable'
                  ? 'THROWABLE'
                  : `/ ${hud.reserve}`}
          </span>
        </div>
        {hud.ammoDisplay === 'firearm' &&
          (hud.reloading ? (
            <div className="reload-readout">
              <span>{hud.reloadWeaponName} RELOAD</span>
              <progress
                className="reload-track"
                aria-label={`${hud.reloadWeaponName ?? 'Weapon'} reload progress`}
                max={100}
                value={hud.reloadProgress * 100}
              />
            </div>
          ) : (
            <div className="ammo-track">
              {Array.from({ length: hud.magazineSize }, (_, index) => (
                <span key={index} className={index < hud.ammo ? 'live' : ''} />
              ))}
            </div>
          ))}
      </section>
      <div className="weapon-slots" aria-label="Available weapons">
        <span
          className={`${hud.activeWeapon === hud.primaryWeapon ? 'active' : ''} ${!hud.primaryWeapon ? 'locked' : ''}`}
        >
          <b>1</b> {primaryDefinition?.label ?? 'PRIMARY — BUY'}
        </span>
        <span
          className={`${hud.activeWeapon === hud.secondaryWeapon ? 'active' : ''} ${!hud.secondaryWeapon ? 'locked' : ''}`}
        >
          <b>2</b> {secondaryDefinition?.label ?? 'SECONDARY — BUY'}
        </span>
        <span className={hud.activeWeapon === 'knife' ? 'active' : ''}>
          <b>3</b> KNIFE
        </span>
        <span
          className={`${hud.activeWeapon === 'grenade' || hud.activeWeapon === 'smoke' || hud.activeWeapon === 'flash' ? 'active' : ''} ${hud.grenades + hud.smokes + hud.flashes <= 0 ? 'locked' : ''}`}
        >
          <b>4</b>{' '}
          {hud.grenades + hud.smokes + hud.flashes > 0
            ? `GRENADES ${hud.grenades + hud.smokes + hud.flashes}`
            : 'GRENADES — BUY'}
        </span>
        <span
          className={`${hud.activeWeapon === 'bomb' ? 'active' : ''} ${!hud.playerHasBomb ? 'locked' : ''}`}
        >
          <b>5</b> {hud.playerHasBomb ? 'C4' : 'C4 — SQUADMATE'}
        </span>
      </div>

      <div className="money">${hud.money.toLocaleString('en-US')}</div>
      {hud.playerHasBomb && (
        <div className="c4-indicator">
          C4 DEVICE
          {hud.activeWeapon === 'bomb'
            ? hud.canDropBomb
              ? ' · G DROP'
              : ' · EQUIPPED'
            : ' · 5 EQUIP'}
        </div>
      )}
      <div className="survivors">
        <b>{hud.friendlyAlive}</b> SQUAD · <b>{hud.enemies}</b> HOSTILES
      </div>

      {scoreboardOpen && (
        <section
          className={`scoreboard ${locked ? '' : 'menu-scoreboard'}`}
          aria-label="Match scoreboard"
        >
          <header className="scoreboard-heading">
            <div>
              <small>
                OPERATION DUSTLINE //{' '}
                {hud.roundPhase.kind === 'overtime'
                  ? `${hud.roundPhase.label} · FIRST TO ${hud.roundPhase.targetScore}`
                  : `MR15 · FIRST TO ${MATCH_WIN_SCORE}`}
              </small>
              <h2>MATCH STATUS</h2>
            </div>
            <div className="scoreboard-clock">
              <time>{formatRoundTime(hud.seconds)}</time>
              <span>
                {hud.roundPhase.label} · ROUND {hud.roundPhase.roundNumber} /{' '}
                {hud.roundPhase.roundLimit}
              </span>
              {!locked && (
                <button
                  type="button"
                  className="scoreboard-close"
                  onClick={() => setScoreboardOpen(false)}
                >
                  CLOSE
                </button>
              )}
            </div>
          </header>

          <div className="scoreboard-team scoreboard-ct">
            <div className="scoreboard-team-heading">
              <span>
                <b>CT</b> CT
              </span>
              <strong>{hud.ctScore}</strong>
            </div>
            <table>
              <thead>
                <tr>
                  <th>OPERATOR</th>
                  <th>STATUS</th>
                  <th>K</th>
                  <th>D</th>
                  <th>PING</th>
                </tr>
              </thead>
              <tbody>
                {hud.playerSide === 'ct'
                  ? friendlyScoreboardRows
                  : enemyScoreboardRows}
              </tbody>
            </table>
          </div>

          <div className="scoreboard-team scoreboard-t">
            <div className="scoreboard-team-heading">
              <span>
                <b>T</b> T
              </span>
              <strong>{hud.tScore}</strong>
            </div>
            <table>
              <thead>
                <tr>
                  <th>OPERATOR</th>
                  <th>STATUS</th>
                  <th>K</th>
                  <th>D</th>
                  <th>PING</th>
                </tr>
              </thead>
              <tbody>
                {hud.playerSide === 't'
                  ? friendlyScoreboardRows
                  : enemyScoreboardRows}
              </tbody>
            </table>
          </div>

          <footer>HOLD TAB TO VIEW // RELEASE TO RETURN</footer>
        </section>
      )}

      {locked && (
        <section className="touch-controls" aria-label="Touch game controls">
          <button
            type="button"
            className="touch-pause"
            aria-label="Pause game"
            onPointerDown={() => touchInputRef.current.pause()}
          >
            Ⅱ
          </button>
          <div className="touch-movement" aria-label="Movement pad">
            {[
              ['KeyW', '↑', 'forward'],
              ['KeyA', '←', 'left'],
              ['KeyS', '↓', 'back'],
              ['KeyD', '→', 'right'],
            ].map(([code, symbol, direction]) => (
              <button
                key={code}
                type="button"
                className={`move-${direction}`}
                aria-label={`Move ${direction}`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  touchInputRef.current.setKey(code, true);
                }}
                onPointerUp={() => touchInputRef.current.setKey(code, false)}
                onPointerCancel={() =>
                  touchInputRef.current.setKey(code, false)
                }
                onPointerLeave={() => touchInputRef.current.setKey(code, false)}
              >
                {symbol}
              </button>
            ))}
          </div>
          <div className="touch-actions">
            <button
              type="button"
              aria-label="Open buy menu"
              disabled={hud.buyBlockReason !== null}
              onPointerDown={() => touchInputRef.current.toggleBuy()}
            >
              BUY
            </button>
            <button
              type="button"
              aria-label="Show scoreboard"
              onPointerDown={() => touchInputRef.current.setScoreboard(true)}
              onPointerUp={() => touchInputRef.current.setScoreboard(false)}
              onPointerCancel={() => touchInputRef.current.setScoreboard(false)}
              onPointerLeave={() => touchInputRef.current.setScoreboard(false)}
            >
              SCORE
            </button>
            <button
              type="button"
              aria-label="Call available squadmates for backup"
              disabled={!hud.canCallBackup}
              onPointerDown={() => touchInputRef.current.callBackup()}
            >
              BACKUP
            </button>
            <button
              type="button"
              aria-label={
                hud.playerAlive ? 'Switch weapon' : 'Spectate next squadmate'
              }
              disabled={!hud.playerAlive && !hud.canCycleSpectator}
              onPointerDown={() => {
                if (hud.playerAlive) touchInputRef.current.cycleWeapon();
                else touchInputRef.current.cycleSpectator();
              }}
            >
              {hud.playerAlive ? '↻' : 'NEXT'}
            </button>
            <button
              type="button"
              aria-label="Reload"
              onPointerDown={() => touchInputRef.current.reload()}
            >
              R
            </button>
            <button
              type="button"
              aria-label="Jump"
              onPointerDown={() => touchInputRef.current.jump()}
            >
              JUMP
            </button>
            <button
              type="button"
              aria-label="Crouch"
              onPointerDown={(event) => {
                event.preventDefault();
                touchInputRef.current.setKey('ControlLeft', true);
              }}
              onPointerUp={() =>
                touchInputRef.current.setKey('ControlLeft', false)
              }
              onPointerCancel={() =>
                touchInputRef.current.setKey('ControlLeft', false)
              }
              onPointerLeave={() =>
                touchInputRef.current.setKey('ControlLeft', false)
              }
            >
              CROUCH
            </button>
            <button
              type="button"
              aria-label="Use, defuse, or recover weapon"
              onPointerDown={() => touchInputRef.current.setKey('KeyE', true)}
              onPointerUp={() => touchInputRef.current.setKey('KeyE', false)}
              onPointerCancel={() =>
                touchInputRef.current.setKey('KeyE', false)
              }
              onPointerLeave={() => touchInputRef.current.setKey('KeyE', false)}
            >
              USE
            </button>
            <button
              type="button"
              aria-label="Secondary weapon action"
              disabled={!hud.playerAlive || !['knife', 'glock18', 'usp', 'carbine', 'sniper'].includes(hud.activeWeapon)}
              onPointerDown={() => touchInputRef.current.toggleScope()}
            >
              {hud.activeWeapon === 'sniper' ? 'ZOOM' : hud.activeWeapon === 'knife' ? 'STAB' : 'MODE'}
            </button>
            <button
              type="button"
              aria-label={
                hud.canDropBomb
                  ? 'Drop selected C4 device'
                  : hud.canDropWeapon
                    ? 'Drop selected firearm'
                    : 'Drop unavailable'
              }
              disabled={!hud.canDropBomb && !hud.canDropWeapon}
              onPointerDown={() => touchInputRef.current.dropWeapon()}
            >
              {hud.canDropBomb
                ? 'DROP C4'
                : hud.canDropWeapon
                  ? 'DROP'
                  : 'NO DROP'}
            </button>
            <button
              type="button"
              className="touch-fire"
              aria-label="Fire weapon or plant selected C4"
              onPointerDown={(event) => {
                event.preventDefault();
                touchInputRef.current.setFiring(true);
              }}
              onPointerUp={() => touchInputRef.current.setFiring(false)}
              onPointerCancel={() => touchInputRef.current.setFiring(false)}
              onPointerLeave={() => touchInputRef.current.setFiring(false)}
            >
              FIRE
            </button>
          </div>
          <span className="touch-look-hint">DRAG RIGHT SIDE TO AIM</span>
        </section>
      )}

      {locked && buyOpen && (
        <section className="buy-menu" aria-label="Buy equipment menu">
          <div className="buy-heading">
            <span>FIELD REQUISITIONS</span>
            <time>0:{String(Math.ceil(hud.buyTime)).padStart(2, '0')}</time>
          </div>
          <div className="buy-section-label">SECONDARIES · SHIFT + 1–5</div>
          {pistolBuyOptions.map(({ slot, kind, definition }) => (
            <button
              key={kind}
              type="button"
              className="buy-row"
              onPointerDown={() => purchaseRef.current(`Pistol${slot}`)}
            >
              <kbd>⇧{slot}</kbd>
              <div>
                <b>{definition.label.toUpperCase()}</b>
                <small>
                  {definition.magazineSize} ROUND MAGAZINE ·{' '}
                  {kind === 'elite' ? 'DUAL WIELD' : 'SEMI-AUTOMATIC'}
                </small>
              </div>
              <strong>${definition.price.toLocaleString('en-US')}</strong>
            </button>
          ))}
          <div className="buy-section-label">PRIMARY · EQUIPMENT</div>
          <button
            type="button"
            className="buy-row"
            onPointerDown={() => purchaseRef.current('Digit1')}
          >
            <kbd>1</kbd>
            <div>
              <b>{serviceRifleDefinition.label} SERVICE RIFLE</b>
              <small>
                30 ROUND MAGAZINE ·{' '}
                {hud.playerSide === 'ct' ? 'STEADY' : 'HARD-HITTING'}
              </small>
            </div>
            <strong>
              ${serviceRifleDefinition.price.toLocaleString('en-US')}
            </strong>
          </button>
          <button
            type="button"
            className="buy-row"
            onPointerDown={() => purchaseRef.current('Digit2')}
          >
            <kbd>2</kbd>
            <div>
              <b>MP5</b>
              <small>30 ROUND MAGAZINE · AUTOMATIC</small>
            </div>
            <strong>${FIREARMS.smg.price.toLocaleString('en-US')}</strong>
          </button>
          <button
            type="button"
            className="buy-row"
            onPointerDown={() => purchaseRef.current('Digit3')}
          >
            <kbd>3</kbd>
            <div>
              <b>M3</b>
              <small>8 SHELLS · CLOSE RANGE</small>
            </div>
            <strong>${FIREARMS.shotgun.price.toLocaleString('en-US')}</strong>
          </button>
          <button
            type="button"
            className="buy-row"
            onPointerDown={() => purchaseRef.current('Digit0')}
          >
            <kbd>0</kbd>
            <div>
              <b>AWP</b>
              <small>10 ROUND MAGAZINE · TWO-STAGE SCOPE</small>
            </div>
            <strong>${FIREARMS.sniper.price.toLocaleString('en-US')}</strong>
          </button>
          <button
            type="button"
            className="buy-row"
            onPointerDown={() => purchaseRef.current('Digit4')}
          >
            <kbd>4</kbd>
            <div>
              <b>KEVLAR</b>
              <small>VEST · REFILLS ARMOR TO 100</small>
            </div>
            <strong>${EQUIPMENT_PRICES.kevlar}</strong>
          </button>
          <button
            type="button"
            className="buy-row"
            disabled={hud.armor >= 100 && hud.helmet}
            aria-disabled={hud.armor >= 100 && hud.helmet}
            onPointerDown={() => purchaseRef.current('KeyH')}
          >
            <kbd>H</kbd>
            <div>
              <b>{assaultSuitLabel}</b>
              <small>VEST + HEAD PROTECTION</small>
            </div>
            <strong>
              {assaultSuitCost > 0 ? `$${assaultSuitCost}` : 'OWNED'}
            </strong>
          </button>
          <button
            type="button"
            className="buy-row"
            onPointerDown={() => purchaseRef.current('Digit5')}
          >
            <kbd>5</kbd>
            <div>
              <b>{primaryDefinition?.label ?? 'PRIMARY'} AMMUNITION</b>
              <small>
                BUY {primaryDefinition?.ammoPurchaseAmount ?? 0} ROUNDS
              </small>
            </div>
            <strong>${primaryDefinition?.ammoPrice ?? 0}</strong>
          </button>
          <button
            type="button"
            className="buy-row"
            onPointerDown={() => purchaseRef.current('KeyY')}
          >
            <kbd>Y</kbd>
            <div>
              <b>{secondaryDefinition?.label ?? 'SECONDARY'} AMMUNITION</b>
              <small>
                BUY {secondaryDefinition?.ammoPurchaseAmount ?? 0} ROUNDS
              </small>
            </div>
            <strong>${secondaryDefinition?.ammoPrice ?? 0}</strong>
          </button>
          <button
            type="button"
            className="buy-row"
            disabled={hud.playerSide === 't'}
            aria-disabled={hud.playerSide === 't'}
            onPointerDown={() => purchaseRef.current('Digit6')}
          >
            <kbd>6</kbd>
            <div>
              <b>{hud.playerSide === 'ct' ? 'DEFUSE KIT' : 'C4 DEVICE'}</b>
              <small>
                {hud.playerSide === 'ct'
                  ? 'HALVES DEFUSE TIME'
                  : 'ISSUED — PLANT AT A OR B'}
              </small>
            </div>
            <strong>
              {hud.playerSide === 'ct'
                ? `$${EQUIPMENT_PRICES.defuseKit}`
                : 'ISSUED'}
            </strong>
          </button>
          <button
            type="button"
            className="buy-row"
            onPointerDown={() => purchaseRef.current('Digit7')}
          >
            <kbd>7</kbd>
            <div>
              <b>FRAG GRENADE</b>
              <small>THROWN BLAST UTILITY</small>
            </div>
            <strong>${EQUIPMENT_PRICES.grenade}</strong>
          </button>
          <button
            type="button"
            className="buy-row"
            onPointerDown={() => purchaseRef.current('Digit8')}
          >
            <kbd>8</kbd>
            <div>
              <b>SMOKE GRENADE</b>
              <small>BLOCKS ENEMY SIGHTLINES</small>
            </div>
            <strong>${EQUIPMENT_PRICES.smoke}</strong>
          </button>
          <button
            type="button"
            className="buy-row"
            onPointerDown={() => purchaseRef.current('Digit9')}
          >
            <kbd>9</kbd>
            <div>
              <b>FLASHBANG</b>
              <small>BLINDS EXPOSED COMBATANTS</small>
            </div>
            <strong>${EQUIPMENT_PRICES.flash}</strong>
          </button>
          <p>LEAVING SPAWN CLOSES MENU · PRESS B OR TAP BUY TO CLOSE</p>
        </section>
      )}

      {!locked && (
        <section className="briefing" aria-label="Game menu">
          <div className="briefing-card">
            <div className="briefing-kicker">DUSTLINE · de_dust2</div>
            {hud.status === 'active' &&
              hud.freezeSeconds > 0 &&
              hud.completedRoundReceipt && (
                <output
                  className="round-settlement"
                  aria-label="Previous round result"
                >
                  <small>
                    PREVIOUS RESULT · ROUND{' '}
                    {hud.completedRoundReceipt.roundNumber}
                  </small>
                  <b>
                    {hud.completedRoundReceipt.playerWon
                      ? 'ROUND SECURED'
                      : 'ROUND LOST'}{' '}
                    · CT {hud.completedRoundReceipt.score.ct}–
                    {hud.completedRoundReceipt.score.t} T
                  </b>
                  <span>{hud.completedRoundReceipt.reason}</span>
                </output>
              )}
            <h1>{overlayTitle}</h1>
            <p>
              {hud.status === 'briefing'
                ? `Dust II · Bomb defusal · 5 versus 5. First to ${MATCH_WIN_SCORE} rounds, with a side change at halftime.`
                : classicStatusMessage}
            </p>
            {isRoundResult && hud.roundTransition?.next && (
              <div className="round-settlement" aria-label="Next assignment">
                <small>NEXT ASSIGNMENT</small>
                <b>
                  {hud.roundTransition.next.transition === 'halftime'
                    ? 'HALFTIME · '
                    : hud.roundTransition.next.transition === 'overtime'
                      ? 'OVERTIME · '
                      : hud.roundTransition.next.transition ===
                          'overtime-halftime'
                        ? 'OVERTIME HALFTIME · '
                        : hud.roundTransition.next.transition ===
                            'overtime-restart'
                          ? 'NEXT OVERTIME · '
                          : ''}
                  {hud.roundTransition.next.faction} ·{' '}
                  {getClassicRoundAssignment(hud.roundTransition.next.playerSide,
                    hud.roundTransition.next.approach, hud.roundTransition.next.targetSite)}
                </b>
                <span>{hud.roundTransition.next.objective}</span>
                {hud.roundTransition.next.economyReset && (
                  <em>
                    {hud.roundTransition.next.phase.label} BANK · $
                    {hud.roundTransition.next.startingBank.toLocaleString(
                      'en-US',
                    )}
                  </em>
                )}
              </div>
            )}
            {hud.status === 'active' && hud.freezeSeconds > 0 && (
              <div className="phase-brief" aria-label="Freeze and buy phase">
                <small>PHASE READY</small>
                <b>
                  FREEZE {formatRoundTime(hud.freezeSeconds)} · BUY OPEN{' '}
                  {formatRoundTime(hud.buyTime)} · $
                  {hud.money.toLocaleString('en-US')}
                </b>
                <span>SPAWN ONLY · PRESS B AFTER DEPLOY</span>
              </div>
            )}
            {(hud.status === 'briefing' ||
              (hud.status === 'active' && hud.freezeSeconds > 0)) && (
              <p className="briefing-objective">
                <b>{sideOnboarding.faction}</b> — {sideOnboarding.objective}
              </p>
            )}
            {controlNotice && (
              <p className="control-notice" role="alert">
                {controlNotice}
              </p>
            )}
            <div className="mission-stats">
              {hud.roundTransition ? (
                <>
                  <span>
                    <b>
                      {hud.roundTransition.score.ct}–
                      {hud.roundTransition.score.t}
                    </b>{' '}
                    CT / T
                  </span>
                  <span>
                    <b>
                      +${hud.roundTransition.earned.toLocaleString('en-US')}
                    </b>{' '}
                    {hud.roundTransition.playerWon ? 'award' : 'loss bonus'}
                  </span>
                  <span>
                    <b>
                      ${hud.roundTransition.bankAfter.toLocaleString('en-US')}
                    </b>{' '}
                    {hud.roundTransition.next?.economyReset
                      ? 'reset bank'
                      : 'bank'}
                  </span>
                </>
              ) : hud.status === 'match-won' || hud.status === 'match-lost' ? (
                <>
                  <span>
                    <b>
                      {hud.ctScore}–{hud.tScore}
                    </b>{' '}
                    final
                  </span>
                  <span>
                    <b>
                      {hud.playerKills} / {hud.playerDeaths}
                    </b>{' '}
                    K / D
                  </span>
                  <span>
                    <b>{hud.roundNumber}</b> rounds
                  </span>
                </>
              ) : (
                <>
                  <span>
                    <b>{String(hud.enemies).padStart(2, '0')}</b> hostiles
                  </span>
                  <span>
                    <b>{formatRoundTime(hud.seconds)}</b> clock
                  </span>
                  <span>
                    <b>${hud.money.toLocaleString('en-US')}</b> funds
                  </span>
                </>
              )}
            </div>
            <details className="settings-reference">
              <summary>Settings</summary>
              <div className="settings-panel" aria-label="Game settings">
              <label>
                <span>
                  AIM <b>{settings.sensitivity.toFixed(2)}×</b>
                </span>
                <input
                  type="range"
                  min="0.45"
                  max="1.8"
                  step="0.05"
                  value={settings.sensitivity}
                  onChange={(event) =>
                    updateSettings({ sensitivity: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                <span>
                  AUDIO <b>{Math.round(settings.volume * 100)}%</b>
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.volume}
                  onChange={(event) =>
                    updateSettings({ volume: Number(event.target.value) })
                  }
                />
              </label>
              <button
                type="button"
                className="quality-toggle"
                aria-label={`Bot skill: ${settings.difficulty}. Applies next round.`}
                onClick={() =>
                  updateSettings({
                    difficulty: getNextBotDifficulty(settings.difficulty),
                  })
                }
              >
                BOT SKILL{' '}
                <b>
                  {settings.difficulty.toUpperCase()}
                  {hud.status === 'active' ? ' · NEXT' : ''}
                </b>
              </button>
              <button
                type="button"
                className="quality-toggle"
                onClick={() =>
                  updateSettings({
                    quality:
                      settings.quality === 'high' ? 'performance' : 'high',
                  })
                }
              >
                QUALITY <b>{settings.quality.toUpperCase()}</b>
              </button>
              </div>
            </details>
            <button
              type="button"
              className="deploy-button"
              onClick={deploy}
              disabled={characterAssetStatus !== 'ready'}
            >
              {characterAssetStatus === 'loading'
                ? 'LOADING OPERATORS'
                : characterAssetStatus === 'error'
                  ? 'OPERATOR LOAD FAILED'
                  : hud.status === 'briefing'
                    ? 'DEPLOY'
                    : hud.status === 'active'
                      ? hud.freezeSeconds > 0
                        ? 'ENTER BUY TIME'
                        : 'RESUME'
                      : hud.status === 'match-won' ||
                          hud.status === 'match-lost'
                        ? 'NEW MATCH'
                        : 'NEXT ROUND'}
            </button>
            {characterAssetStatus === 'error' && (
              <button
                type="button"
                className="scoreboard-review-button"
                onClick={() => {
                  setCharacterAssetStatus('loading');
                  setCharacterLoadAttempt((attempt) => attempt + 1);
                }}
              >
                RETRY OPERATOR ASSETS
              </button>
            )}
            {keyboardPlaytestAvailable && (
              <button
                type="button"
                className="scoreboard-review-button"
                onClick={startKeyboardPlaytest}
                disabled={characterAssetStatus !== 'ready'}
              >
                START KEYBOARD PLAYTEST
              </button>
            )}
            {hud.status !== 'briefing' && hud.status !== 'active' && (
              <button
                type="button"
                className="scoreboard-review-button"
                onClick={() => setScoreboardOpen(true)}
              >
                VIEW SCOREBOARD
              </button>
            )}
            <details className="control-reference">
              <summary>Controls</summary>
            <div className="controls">
              <span>
                <kbd>WASD</kbd> MOVE
              </span>
              <span>
                <kbd>MOUSE</kbd> AIM / FIRE
              </span>
              {keyboardPlaytestAvailable && (
                <span>
                  <kbd>ARROWS / F</kbd> AIM / FIRE
                </span>
              )}
              <span>
                <kbd>RMB / V</kbd> SECONDARY
              </span>
              <span>
                <kbd>R</kbd> RELOAD
              </span>
              <span>
                <kbd>B</kbd> BUY
              </span>
              <span>
                <kbd>⇧1—5</kbd> BUY SECONDARY
              </span>
              <span>
                <kbd>Y</kbd> SECONDARY AMMO
              </span>
              <span>
                <kbd>TAB</kbd> SCORE
              </span>
              <span>
                <kbd>Z</kbd> NEED BACKUP
              </span>
              <span>
                <kbd>1—5</kbd> WEAPONS
              </span>
              <span>
                <kbd>FIRE</kbd> PLANT SELECTED C4
              </span>
              <span>
                <kbd>E</kbd> DEFUSE / RECOVER WEAPON
              </span>
              <span>
                <kbd>G</kbd> DROP SELECTED ITEM
              </span>
              <span>
                <kbd>SHIFT</kbd> WALK
              </span>
              <span>
                <kbd>CTRL</kbd> CROUCH
              </span>
              <span>
                <kbd>SPACE</kbd> JUMP
              </span>
              <span>
                <kbd>ESC</kbd> PAUSE
              </span>
            </div>
            </details>
          </div>
        </section>
      )}

      {renderError && (
        <section className="render-error" role="alert">
          <strong>3D RENDERER UNAVAILABLE</strong>
          <p>{renderError}</p>
        </section>
      )}

      <div className="scanlines" aria-hidden="true" />
    </main>
  );
}
