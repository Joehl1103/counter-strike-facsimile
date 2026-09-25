import { canTraverseMapSegment } from '../app/dust2-map.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  addMoney,
  advanceLandingRecovery,
  advanceBotBlockedSeconds,
  advanceObjectiveProgress,
  advanceSimulationTime,
  advanceGrenadeFuse,
  ALLY_ENEMY_SPOTTED_CALLOUT_MS,
  ALLY_ENEMY_SPOTTED_CALLOUT_TEXT,
  ALLY_ENEMY_SPOTTED_COOLDOWN_MS,
  applyArmorDamage,
  applyDamageSuppression,
  applyPlayerDamageTag,
  BOMB_PICKUP_RADIUS,
  BOT_DIFFICULTY_TUNING,
  BOT_FOOTSTEP_HEARING_RADIUS,
  BOT_FOOTSTEP_SHARED_COOLDOWN_MS,
  BODY_HITGROUP_DAMAGE_MULTIPLIERS,
  ATTACK_ROUTES,
  BOMBSITES,
  canIssueBackupCall,
  canEnemyFire,
  canCycleFriendlySpectator,
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
  CT_RETAKE_ROUTES,
  canEnemyStartBurst,
  canEnemyUseSquadIntel,
  chooseEnemyCombatTarget,
  createEnemyPrimaryAmmo,
  decayDamageSuppression,
  decayPlayerDamageTag,
  decayShotPulse,
  didPlayerLand,
  ENEMY_COMBAT_PROFILES,
  ENEMY_MAX_ACTIVE_BURSTS,
  ENEMY_PRIMARY_ROSTER,
  EQUIPMENT_PRICES,
  FIREARMS,
  FIREARM_ARMOR_RATIO_MULTIPLIERS,
  FRIENDLY_INTEL_MAX_FRESHNESS_SECONDS,
  FRIENDLY_INTEL_RADIO_DELAY_SECONDS,
  formatRoundTime,
  createMatchState,
  getBombsiteForRound,
  getBotBuyTier,
  getBotFootstepCadenceMs,
  getBotMovementDirections,
  getBotFirearmDropKind,
  getBotRoundFirearm,
  getBotRoundPrimaryWeapon,
  getBotSide,
  getBombsiteAtPosition,
  getBuyBlockReason,
  getCompletedRounds,
  getCrosshairGap,
  getDamageDirection,
  getDefuseDuration,
  getDisplayedRoundNumber,
  getEnemyCombatMovement,
  getEnemyBurstShotCooldown,
  getEnemyBurstSize,
  getExplosionDamage,
  getAxisAlignedBoxExitDistance,
  getFirearmDamage,
  getFirearmHitGroupMultiplier,
  getFlashBlindDuration,
  getFlashOverlayOpacity,
  getNextBotDifficulty,
  getNextFriendlySpectatorTarget,
  getHitConfirmation,
  getLossBonus,
  getMatchRoundPhase,
  getMatchTransition,
  getMatchWinner,
  getNearestRouteWaypointIndex,
  getOppositeSide,
  getPlayerKillReward,
  getPlayerDamageTagSpeedMultiplier,
  getPlayerDropTarget,
  getPlayerSideForRound,
  getPlayerStanceEyeHeight,
  getPositionalAudioCue,
  getRadarHeadingDegrees,
  getRadarMapPosition,
  getReloadProgress,
  getRoundTransitionBrief,
  getRoundWinReward,
  getRoundWinningSide,
  getRoundPlan,
  getSideScores,
  getSideOnboarding,
  getServiceRifleForSide,
  getTeamForSide,
  getTeamEliminationEvent,
  getEnemyFireCooldown,
  getEnemyEngagementRange,
  getEnemyMuzzleOffsetZ,
  getBotActiveBurstLimit,
  getBotReactionTime,
  getEnemyPreferredRange,
  getEnemyPrimaryWeapon,
  getEnemyPursuitSpeed,
  getEnemyReactionTime,
  getEnemyReloadDuration,
  getEligibleDroppedFirearm,
  getSmokeCloudOpacity,
  getSquadBackupFormationOffset,
  getSquadBackupTarget,
  getWeaponBunnyHopSpeed,
  getWeaponEquipDelay,
  getWeaponMoveSpeed,
  getWeaponFieldOfView,
  getWeaponSensitivityMultiplier,
  isFirearmKind,
  isAtBotWaypoint,
  isInsideBuyZone,
  isOpeningPistolRound,
  isPrimaryWeaponKind,
  isFirearmDropAvailable,
  isSniperBoltCycling,
  isWeaponReady,
  limitBunnyHopVelocity,
  MAX_DAMAGE_SUPPRESSION,
  MAX_PLAYER_DAMAGE_TAG,
  PLAYER_AIR_ACCELERATION,
  PLAYER_AIR_WISH_SPEED,
  OBJECTIVE_REWARDS,
  OVERTIME_HALF_ROUNDS,
  OVERTIME_ROUNDS,
  OVERTIME_START_MONEY,
  PLAYER_KILL_REWARDS,
  PLAYER_CROUCH_OFFSET,
  PLAYER_LANDING_RECOVERY_SECONDS,
  PLAYER_SPAWNS,
  FIREARM_PICKUP_RADIUS,
  REGULATION_HALF_ROUNDS,
  REGULATION_ROUNDS,
  ROUND_DURATION_SECONDS,
  S90_BOLT_CYCLE_DURATION_MS,
  SQUAD_BACKUP_CALLOUT_MS,
  SQUAD_BACKUP_CALL_COOLDOWN_MS,
  SQUAD_BACKUP_FORMATION_OFFSETS,
  SQUAD_BACKUP_REQUEST_SECONDS,
  SQUAD_BACKUP_TARGET_SEPARATION,
  reloadMagazine,
  reloadSingleShell,
  resolveHitscanImpact,
  prepareNextRound,
  recordRoundWinner,
  reloadEnemyPrimary,
  resolveArmorPurchase,
  resolveDefuseKitPurchase,
  normalizeBotDifficulty,
  segmentIntersectsSmoke,
  sanitizeDroppedFirearmAmmo,
  SECONDARY_WEAPON_KINDS,
  createStarterSecondaryAmmo,
  getPistolBuyOption,
  getStarterSecondaryForSide,
  isSecondaryWeaponKind,
  resolveAmmoPurchase,
  shouldChooseEnemyMovement,
  shouldInterruptPlant,
  shouldAllyRespondToBackup,
  shouldAllyInvestigateIntel,
  shouldClearFriendlyIntelForElimination,
  shouldIssueBotDefuseKit,
  shouldShowRadarContact,
  shouldEmitBotFootstep,
  shouldEmitAllyEnemySpottedCallout,
  shouldRetainLoadout,
  shouldRepeatFire,
  shouldResetEnemyTracking,
  shouldAutoUnscopeAfterCommittedShot,
  shouldAutoPrepareNextRound,
  settlePlayerRoundMoney,
  stepHorizontalVelocity,
  updateJumpButton,
  writeLandingViewPose,
  writeSniperBoltCyclePose,
  WEAPON_ACTION_SOUNDS,
  WEAPON_HANDLING,
  writeWeaponReloadPose,
  type LandingViewPose,
  type SniperBoltCyclePose,
  type WeaponReloadPose,
} from '../app/game-rules.ts';

void test('rounds alternate between both bombsites', () => {
  assert.deepEqual(
    Array.from({ length: 6 }, (_, round) => getBombsiteForRound(round)),
    ['A', 'B', 'A', 'B', 'A', 'B'],
  );
});

void test('MR15 regulation and repeatable MR3 overtime resolve correctly', () => {
  assert.equal(getMatchWinner({ player: 15, opponent: 14 }), null);
  assert.equal(getMatchWinner({ player: 16, opponent: 14 }), 'player');
  assert.equal(getMatchWinner({ player: 14, opponent: 16 }), 'opponent');
  assert.equal(getMatchWinner({ player: 15, opponent: 15 }), null);
  assert.equal(getMatchWinner({ player: 16, opponent: 15 }), null);
  assert.equal(getMatchWinner({ player: 18, opponent: 18 }), null);
  assert.equal(getMatchWinner({ player: 19, opponent: 15 }), 'player');
  assert.equal(getMatchWinner({ player: 19, opponent: 17 }), 'player');
  assert.equal(getMatchWinner({ player: 19, opponent: 18 }), null);
  assert.equal(getMatchWinner({ player: 21, opponent: 21 }), null);
  assert.equal(getMatchWinner({ player: 22, opponent: 18 }), 'player');
  assert.equal(getMatchWinner({ player: 22, opponent: 20 }), 'player');
});

void test('halftime swaps sides while preserving team identity', () => {
  const match = {
    ...createMatchState('ct'),
    scores: { player: 8, opponent: 7 },
    lossStreaks: { player: 3, opponent: 2 },
  };
  const prepared = prepareNextRound(match);
  assert.equal(prepared.transition, 'halftime');
  assert.equal(prepared.economyReset, true);
  assert.equal(prepared.startingMoney, 800);
  assert.equal(prepared.match.playerSide, 't');
  assert.deepEqual(prepared.match.scores, { player: 8, opponent: 7 });
  assert.deepEqual(prepared.match.lossStreaks, { player: 0, opponent: 0 });
  assert.equal(getCompletedRounds(prepared.match.scores), 15);
  assert.equal(getOppositeSide('ct'), 't');
});

void test('side scores map persistent teams into the active factions', () => {
  const scores = { player: 3, opponent: 1 };
  assert.deepEqual(getSideScores(scores, 'ct'), { ct: 3, t: 1 });
  assert.deepEqual(getSideScores(scores, 't'), { ct: 1, t: 3 });
  assert.equal(getTeamForSide('t', 't'), 'player');
  assert.equal(getTeamForSide('t', 'ct'), 'opponent');
});

void test('bot sides and team elimination remain correct through halftime', () => {
  assert.equal(getBotSide('ct', 'ally'), 'ct');
  assert.equal(getBotSide('ct', 'enemy'), 't');
  assert.equal(getBotSide('t', 'ally'), 't');
  assert.equal(getBotSide('t', 'enemy'), 'ct');
  assert.equal(getTeamEliminationEvent('ct', 3, 0), 't-eliminated');
  assert.equal(getTeamEliminationEvent('t', 3, 0), 'ct-eliminated');
  assert.equal(getTeamEliminationEvent('ct', 0, 2), 'ct-eliminated');
  assert.equal(getTeamEliminationEvent('t', 0, 2), 't-eliminated');
  assert.equal(getTeamEliminationEvent('ct', 0, 0), 't-eliminated');
  assert.equal(getTeamEliminationEvent('t', 0, 0), 't-eliminated');
  assert.equal(getRoundWinningSide('t-eliminated', 'planted'), null);
  assert.equal(getTeamEliminationEvent('ct', 2, 2), null);
});

void test('spectating deterministically prefers surviving squadmates', () => {
  const allies = [
    { id: 'ally-0', team: 'ally' as const, alive: true },
    { id: 'ally-1', team: 'ally' as const, alive: true },
  ];
  const enemies = [
    { id: 'enemy-0', team: 'enemy' as const, alive: true },
    { id: 'enemy-1', team: 'enemy' as const, alive: true },
  ];
  assert.equal(
    chooseSpectatorTarget({
      playerAlive: true,
      currentTargetId: 'ally-1',
      allies,
      enemies,
      killerId: 'enemy-0',
    }),
    null,
  );
  assert.equal(
    chooseSpectatorTarget({
      playerAlive: false,
      currentTargetId: 'enemy-1',
      allies,
      enemies,
      killerId: 'enemy-0',
    }),
    'ally-0',
  );
  assert.equal(
    chooseSpectatorTarget({
      playerAlive: false,
      currentTargetId: 'ally-1',
      allies,
      enemies,
      killerId: null,
    }),
    'ally-1',
  );
  assert.equal(
    chooseSpectatorTarget({
      playerAlive: false,
      currentTargetId: null,
      allies: allies.map((ally) => ({ ...ally, alive: false })),
      enemies,
      killerId: 'enemy-1',
    }),
    'enemy-1',
  );
  assert.equal(
    chooseSpectatorTarget({
      playerAlive: false,
      currentTargetId: null,
      allies: [],
      enemies: enemies.map((enemy) => ({ ...enemy, alive: false })),
      killerId: null,
    }),
    null,
  );
});

void test('manual spectating cycles only living squadmates in stable order', () => {
  const allies = [
    { id: 'ally-0', team: 'ally' as const, alive: true },
    { id: 'enemy-malformed', team: 'enemy' as const, alive: true },
    { id: 'ally-1', team: 'ally' as const, alive: false },
    { id: 'ally-2', team: 'ally' as const, alive: true },
  ];
  const snapshot = allies.map((candidate) => ({ ...candidate }));

  assert.equal(
    getNextFriendlySpectatorTarget({ currentTargetId: 'ally-0', allies }),
    'ally-2',
  );
  assert.equal(
    getNextFriendlySpectatorTarget({ currentTargetId: 'ally-2', allies }),
    'ally-0',
  );
  assert.equal(
    getNextFriendlySpectatorTarget({ currentTargetId: null, allies }),
    'ally-0',
  );
  assert.equal(
    getNextFriendlySpectatorTarget({
      currentTargetId: 'enemy-malformed',
      allies,
    }),
    'ally-0',
  );
  assert.equal(
    getNextFriendlySpectatorTarget({ currentTargetId: 'ally-1', allies }),
    'ally-0',
  );
  assert.deepEqual(allies, snapshot);
});

void test('manual spectator cycling requires two living squadmates', () => {
  assert.equal(
    getNextFriendlySpectatorTarget({
      currentTargetId: 'ally-0',
      allies: [{ id: 'ally-0', team: 'ally', alive: true }],
    }),
    null,
  );
  assert.equal(
    getNextFriendlySpectatorTarget({
      currentTargetId: null,
      allies: [{ id: 'ally-0', team: 'ally', alive: false }],
    }),
    null,
  );
});

void test('manual spectator readiness fails closed outside active orbit play', () => {
  const ready = {
    active: true,
    playerAlive: false,
    deathCameraComplete: true,
    interactionActive: true,
    roundResultPending: false,
    livingAllyCount: 2,
  };
  assert.equal(canCycleFriendlySpectator(ready), true);
  assert.equal(canCycleFriendlySpectator({ ...ready, active: false }), false);
  assert.equal(
    canCycleFriendlySpectator({ ...ready, playerAlive: true }),
    false,
  );
  assert.equal(
    canCycleFriendlySpectator({ ...ready, deathCameraComplete: false }),
    false,
  );
  assert.equal(
    canCycleFriendlySpectator({ ...ready, interactionActive: false }),
    false,
  );
  assert.equal(
    canCycleFriendlySpectator({ ...ready, roundResultPending: true }),
    false,
  );
  assert.equal(
    canCycleFriendlySpectator({ ...ready, livingAllyCount: 1 }),
    false,
  );
  assert.equal(
    canCycleFriendlySpectator({ ...ready, livingAllyCount: Number.NaN }),
    false,
  );
  assert.equal(
    canCycleFriendlySpectator({
      ...ready,
      livingAllyCount: Number.POSITIVE_INFINITY,
    }),
    false,
  );
});

void test('classic radar shows only living allies, never enemy sightings', () => {
  assert.equal(shouldShowRadarContact({team: 'ally', alive: true}), true);
  assert.equal(shouldShowRadarContact({team: 'ally', alive: false}), false);
  assert.equal(shouldShowRadarContact({team: 'enemy', alive: true}), false);
  assert.equal(shouldShowRadarContact({team: 'enemy', alive: false}), false);
});

void test('radar maps world positions into one bounded north-up coordinate system', () => {
  assert.deepEqual(getRadarMapPosition(0, 0), {
    leftPercent: 50,
    topPercent: 50,
  });
  assert.deepEqual(getRadarMapPosition(0, 26), {
    leftPercent: 50,
    topPercent: 79.12,
  });
  assert.deepEqual(getRadarMapPosition(0, -30), {
    leftPercent: 50,
    topPercent: 16.4,
  });
  const siteA = getRadarMapPosition(...BOMBSITES.A);
  assert.ok(Math.abs(siteA.leftPercent - 76.88) < 1e-9);
  assert.ok(Math.abs(siteA.topPercent - 20.88) < 1e-9);
  const siteB = getRadarMapPosition(...BOMBSITES.B);
  assert.ok(Math.abs(siteB.leftPercent - 20.88) < 1e-9);
  assert.ok(Math.abs(siteB.topPercent - 25.36) < 1e-9);
  assert.deepEqual(getRadarMapPosition(Number.NaN, 26), {
    leftPercent: 50,
    topPercent: 79.12,
  });
  const partiallyInvalid = getRadarMapPosition(-26, Number.NaN);
  assert.ok(Math.abs(partiallyInvalid.leftPercent - 20.88) < 1e-9);
  assert.equal(partiallyInvalid.topPercent, 50);
  assert.deepEqual(getRadarMapPosition(-10_000, 10_000), {
    leftPercent: 4,
    topPercent: 96,
  });

  for (const position of [
    getRadarMapPosition(Number.NaN, Number.POSITIVE_INFINITY),
    getRadarMapPosition(-10_000, 10_000),
  ]) {
    assert.equal(Number.isFinite(position.leftPercent), true);
    assert.equal(Number.isFinite(position.topPercent), true);
    assert.equal(position.leftPercent >= 4 && position.leftPercent <= 96, true);
    assert.equal(position.topPercent >= 4 && position.topPercent <= 96, true);
  }
});

void test('radar heading follows the camera convention and rejects invalid yaw', () => {
  assert.equal(getRadarHeadingDegrees(0), 0);
  assert.equal(getRadarHeadingDegrees(Math.PI / 2), -90);
  assert.equal(getRadarHeadingDegrees(-Math.PI / 2), 90);
  assert.equal(getRadarHeadingDegrees(Math.PI), -180);
  assert.equal(getRadarHeadingDegrees(-Math.PI), -180);
  assert.equal(getRadarHeadingDegrees(Math.PI * 2), 0);
  assert.equal(getRadarHeadingDegrees(Number.NaN), 0);
  assert.equal(getRadarHeadingDegrees(Number.POSITIVE_INFINITY), 0);
});

void test('round settlement updates team-owned loss streaks', () => {
  const initial = {
    ...createMatchState(),
    scores: { player: 2, opponent: 1 },
    lossStreaks: { player: 2, opponent: 1 },
  };
  const playerWin = recordRoundWinner(initial, 'player');
  assert.deepEqual(playerWin.scores, { player: 3, opponent: 1 });
  assert.deepEqual(playerWin.lossStreaks, { player: 0, opponent: 2 });
  const opponentWin = recordRoundWinner(playerWin, 'opponent');
  assert.deepEqual(opponentWin.scores, { player: 3, opponent: 2 });
  assert.deepEqual(opponentWin.lossStreaks, { player: 1, opponent: 0 });
});

void test('halftime occurs once and T wins remain player-team wins', () => {
  const match = {
    ...createMatchState('ct'),
    scores: { player: 8, opponent: 7 },
  };
  const halftime = prepareNextRound(match);
  assert.equal(halftime.transition, 'halftime');
  assert.equal(halftime.match.playerSide, 't');
  const afterTWin = recordRoundWinner(
    halftime.match,
    getTeamForSide(halftime.match.playerSide, 't'),
  );
  assert.deepEqual(afterTWin.scores, { player: 9, opponent: 7 });
  const nextRound = prepareNextRound(afterTWin);
  assert.equal(nextRound.transition, 'none');
  assert.equal(nextRound.match.playerSide, 't');
  assert.deepEqual(nextRound.match.scores, { player: 9, opponent: 7 });
});

void test('MR3 overtime swaps sides and resets the economy at each half', () => {
  const overtime = prepareNextRound({
    ...createMatchState('ct'),
    playerSide: 't',
    scores: { player: 15, opponent: 15 },
    lossStreaks: { player: 2, opponent: 1 },
  });
  assert.equal(overtime.transition, 'overtime');
  assert.equal(overtime.economyReset, true);
  assert.equal(overtime.startingMoney, OVERTIME_START_MONEY);
  assert.equal(overtime.match.playerSide, 't');
  assert.deepEqual(overtime.match.lossStreaks, { player: 0, opponent: 0 });

  const overtimeHalftime = prepareNextRound({
    ...overtime.match,
    scores: { player: 18, opponent: 15 },
    lossStreaks: { player: 2, opponent: 1 },
  });
  assert.equal(overtimeHalftime.transition, 'overtime-halftime');
  assert.equal(overtimeHalftime.startingMoney, OVERTIME_START_MONEY);
  assert.equal(overtimeHalftime.match.playerSide, 'ct');

  const nextOvertime = prepareNextRound({
    ...overtimeHalftime.match,
    scores: { player: 18, opponent: 18 },
    lossStreaks: { player: 1, opponent: 2 },
  });
  assert.equal(nextOvertime.transition, 'overtime-restart');
  assert.equal(nextOvertime.startingMoney, OVERTIME_START_MONEY);
  assert.equal(nextOvertime.match.playerSide, 'ct');
  assert.deepEqual(nextOvertime.match.lossStreaks, {
    player: 0,
    opponent: 0,
  });
});

void test('regulation and repeated overtime side boundaries stay deterministic', () => {
  const expectedSides = [
    [0, 'ct'],
    [14, 'ct'],
    [15, 't'],
    [29, 't'],
    [30, 't'],
    [32, 't'],
    [33, 'ct'],
    [35, 'ct'],
    [36, 'ct'],
    [38, 'ct'],
    [39, 't'],
    [41, 't'],
  ] as const;
  expectedSides.forEach(([completedRounds, side]) => {
    assert.equal(getPlayerSideForRound('ct', completedRounds), side);
    assert.equal(
      getPlayerSideForRound('t', completedRounds),
      getOppositeSide(side),
    );
  });

  assert.equal(getMatchTransition(14), 'none');
  assert.equal(getMatchTransition(15), 'halftime');
  assert.equal(getMatchTransition(16), 'none');
  assert.equal(getMatchTransition(30), 'overtime');
  assert.equal(
    getMatchTransition(30 + OVERTIME_HALF_ROUNDS),
    'overtime-halftime',
  );
  assert.equal(getMatchTransition(30 + OVERTIME_ROUNDS), 'overtime-restart');
  assert.equal(
    getMatchTransition(30 + OVERTIME_ROUNDS + OVERTIME_HALF_ROUNDS),
    'overtime-halftime',
  );
  assert.equal(
    getMatchTransition(30 + OVERTIME_ROUNDS * 2),
    'overtime-restart',
  );
});

void test('objective events preserve post-plant terminal priority', () => {
  assert.equal(getRoundWinningSide('ct-eliminated', 'carried'), 't');
  assert.equal(getRoundWinningSide('t-eliminated', 'carried'), 'ct');
  assert.equal(getRoundWinningSide('t-eliminated', 'planted'), null);
  assert.equal(getRoundWinningSide('time-expired', 'carried'), 'ct');
  assert.equal(getRoundWinningSide('time-expired', 'planted'), null);
  assert.equal(getRoundWinningSide('bomb-defused', 'defused'), 'ct');
  assert.equal(getRoundWinningSide('bomb-detonated', 'detonated'), 't');
});

void test('plant and defuse permissions follow side and objective state', () => {
  const allowed = {
    active: true,
    alive: true,
    playerSide: 't' as const,
    bombState: 'carried' as const,
    playerHasBomb: true,
    bombsite: 'A' as const,
    activeWeapon: 'bomb' as const,
    primaryFireHeld: true,
    freezeSeconds: 0,
    buyOpen: false,
    weaponReady: true,
    stationary: true,
    grounded: true,
    reloading: false,
  };
  assert.equal(canPlayerPlant(allowed), true);
  assert.equal(canPlayerPlant({ ...allowed, playerSide: 'ct' }), false);
  assert.equal(canPlayerPlant({ ...allowed, bombsite: null }), false);
  assert.equal(canPlayerPlant({ ...allowed, activeWeapon: 'usp' }), false);
  assert.equal(canPlayerPlant({ ...allowed, primaryFireHeld: false }), false);
  assert.equal(canPlayerPlant({ ...allowed, freezeSeconds: 0.1 }), false);
  assert.equal(canPlayerPlant({ ...allowed, stationary: false }), false);
  assert.equal(canPlayerPlant({ ...allowed, grounded: false }), false);
  assert.equal(canPlayerPlant({ ...allowed, bombState: 'planting' }), true);
  assert.equal(canPlayerPlant({ ...allowed, active: false }), false);
  assert.equal(canPlayerPlant({ ...allowed, alive: false }), false);
  assert.equal(canPlayerPlant({ ...allowed, playerHasBomb: false }), false);
  assert.equal(canPlayerPlant({ ...allowed, buyOpen: true }), false);
  assert.equal(canPlayerPlant({ ...allowed, weaponReady: false }), false);
  assert.equal(canPlayerPlant({ ...allowed, reloading: true }), false);
  assert.equal(canPlayerDefuse('ct', 'planted', true, true), true);
  assert.equal(canPlayerDefuse('t', 'planted', true, true), false);
  assert.equal(canPlayerDefuse('ct', 'carried', true, true), false);
});

void test('bombsite lookup and objective progress are deterministic', () => {
  assert.equal(getBombsiteAtPosition(...BOMBSITES.A), 'A');
  assert.equal(getBombsiteAtPosition(...BOMBSITES.B), 'B');
  assert.equal(getBombsiteAtPosition(0, 0), null);
  assert.equal(advanceObjectiveProgress(0, 1.5, 3, true), 0.5);
  assert.equal(advanceObjectiveProgress(0.5, 1.5, 3, true), 1);
  assert.equal(advanceObjectiveProgress(0.5, 1, 3, false), 0);
});

void test('round numbering distinguishes active and completed rounds', () => {
  assert.equal(getDisplayedRoundNumber(0, 0, true), 1);
  assert.equal(getDisplayedRoundNumber(2, 1, true), 4);
  assert.equal(getDisplayedRoundNumber(1, 0, false), 1);
  assert.equal(getDisplayedRoundNumber(5, 4, false), 9);
});

void test('round phases distinguish regulation from each overtime set', () => {
  assert.deepEqual(getMatchRoundPhase({ player: 0, opponent: 0 }, true), {
    kind: 'regulation',
    label: 'REGULATION',
    roundNumber: 1,
    roundLimit: REGULATION_ROUNDS,
    targetScore: 16,
    overtimeNumber: null,
  });
  assert.deepEqual(getMatchRoundPhase({ player: 14, opponent: 15 }, true), {
    kind: 'regulation',
    label: 'REGULATION',
    roundNumber: 30,
    roundLimit: REGULATION_ROUNDS,
    targetScore: 16,
    overtimeNumber: null,
  });
  assert.deepEqual(getMatchRoundPhase({ player: 16, opponent: 14 }, false), {
    kind: 'regulation',
    label: 'REGULATION',
    roundNumber: 30,
    roundLimit: REGULATION_ROUNDS,
    targetScore: 16,
    overtimeNumber: null,
  });
  assert.deepEqual(getMatchRoundPhase({ player: 15, opponent: 15 }, true), {
    kind: 'overtime',
    label: 'OVERTIME 1',
    roundNumber: 1,
    roundLimit: OVERTIME_ROUNDS,
    targetScore: 19,
    overtimeNumber: 1,
  });
  assert.deepEqual(getMatchRoundPhase({ player: 18, opponent: 15 }, true), {
    kind: 'overtime',
    label: 'OVERTIME 1',
    roundNumber: OVERTIME_HALF_ROUNDS + 1,
    roundLimit: OVERTIME_ROUNDS,
    targetScore: 19,
    overtimeNumber: 1,
  });
  assert.deepEqual(getMatchRoundPhase({ player: 18, opponent: 18 }, true), {
    kind: 'overtime',
    label: 'OVERTIME 2',
    roundNumber: 1,
    roundLimit: OVERTIME_ROUNDS,
    targetScore: 22,
    overtimeNumber: 2,
  });
});

void test('loss rewards escalate and all rewards obey the money cap', () => {
  assert.equal(getLossBonus(1), 1400);
  assert.equal(getLossBonus(3), 2400);
  assert.equal(getLossBonus(8), 3400);
  assert.deepEqual(OBJECTIVE_REWARDS, { plant: 300, defuse: 300 });
  assert.equal(getRoundWinReward('bomb-detonated'), 3500);
  assert.equal(getRoundWinReward('bomb-defused'), 3250);
  assert.equal(getRoundWinReward('ct-eliminated'), 3250);
  assert.equal(getRoundWinReward('t-eliminated'), 3250);
  assert.equal(getRoundWinReward('time-expired'), 3250);
  assert.equal(addMoney(15900, 300), 16000);
  assert.equal(addMoney(100, -300), 0);
  const postPlantMoney = addMoney(800, OBJECTIVE_REWARDS.plant);
  assert.equal(
    settlePlayerRoundMoney({
      currentMoney: postPlantMoney,
      playerWon: false,
      event: 'bomb-defused',
      lossStreak: 1,
    }),
    2500,
  );
  assert.equal(
    settlePlayerRoundMoney({
      currentMoney: 15_900,
      playerWon: true,
      event: 'bomb-detonated',
      lossStreak: 0,
    }),
    16_000,
  );
});

void test('round transition briefs preserve cap-aware settlement and next assignment', () => {
  const wonMatch = recordRoundWinner(createMatchState('ct'), 'player');
  const wonBrief = getRoundTransitionBrief({
    matchAfterResult: wonMatch,
    winnerSide: 'ct',
    event: 't-eliminated',
    bankBefore: 800,
    bankAfter: 4050,
  });
  assert.deepEqual(wonBrief.score, { ct: 1, t: 0 });
  assert.equal(wonBrief.playerWon, true);
  assert.equal(wonBrief.earned, 3250);
  assert.equal(wonBrief.bankAfter, 4050);
  assert.equal(wonBrief.terminal, false);
  assert.equal(wonBrief.next?.playerSide, 'ct');
  assert.equal(wonBrief.next?.startingBank, 4050);
  assert.deepEqual(
    {
      targetSite: wonBrief.next?.targetSite,
      approach: wonBrief.next?.approach,
    },
    {
      targetSite: getRoundPlan(1, 'ct').targetSite,
      approach: getRoundPlan(1, 'ct').approach,
    },
  );
  const lostMatch = recordRoundWinner(createMatchState('ct'), 'opponent');
  const lostBrief = getRoundTransitionBrief({
    matchAfterResult: lostMatch,
    winnerSide: 't',
    event: 'ct-eliminated',
    bankBefore: 800,
    bankAfter: 2200,
  });
  assert.deepEqual(lostBrief.score, { ct: 0, t: 1 });
  assert.equal(lostBrief.playerWon, false);
  assert.equal(lostBrief.earned, 1400);
  assert.equal(lostBrief.next?.playerSide, 'ct');

  const cappedBrief = getRoundTransitionBrief({
    matchAfterResult: wonMatch,
    winnerSide: 'ct',
    event: 't-eliminated',
    bankBefore: 15_900,
    bankAfter: 16_000,
  });
  assert.equal(cappedBrief.earned, 100);
});

void test('round transition briefs preview regulation and overtime resets', () => {
  const halftimeMatch = {
    ...createMatchState('ct'),
    scores: { player: 8, opponent: 7 },
  };
  const halftimeBrief = getRoundTransitionBrief({
    matchAfterResult: halftimeMatch,
    winnerSide: 't',
    event: 'ct-eliminated',
    bankBefore: 3600,
    bankAfter: 5000,
  });
  assert.deepEqual(halftimeBrief.score, { ct: 8, t: 7 });
  assert.equal(halftimeBrief.next?.transition, 'halftime');
  assert.equal(halftimeBrief.next?.economyReset, true);
  assert.equal(halftimeBrief.next?.playerSide, 't');
  assert.equal(halftimeBrief.next?.faction, 'T');
  assert.equal(halftimeBrief.next?.startingBank, 800);
  assert.deepEqual(halftimeBrief.next?.phase, {
    kind: 'regulation',
    label: 'REGULATION',
    roundNumber: 16,
    roundLimit: REGULATION_ROUNDS,
    targetScore: 16,
    overtimeNumber: null,
  });
  assert.deepEqual(
    {
      targetSite: halftimeBrief.next?.targetSite,
      approach: halftimeBrief.next?.approach,
    },
    {
      targetSite: getRoundPlan(REGULATION_HALF_ROUNDS, 't').targetSite,
      approach: getRoundPlan(REGULATION_HALF_ROUNDS, 't').approach,
    },
  );

  const overtimeBrief = getRoundTransitionBrief({
    matchAfterResult: {
      ...createMatchState('ct'),
      playerSide: 't',
      scores: { player: 15, opponent: 15 },
    },
    winnerSide: 'ct',
    event: 't-eliminated',
    bankBefore: 3600,
    bankAfter: 6850,
  });
  assert.equal(overtimeBrief.terminal, false);
  assert.equal(overtimeBrief.next?.transition, 'overtime');
  assert.equal(overtimeBrief.next?.economyReset, true);
  assert.equal(overtimeBrief.next?.startingBank, OVERTIME_START_MONEY);
  assert.equal(overtimeBrief.next?.phase.label, 'OVERTIME 1');
  assert.equal(overtimeBrief.next?.phase.roundNumber, 1);

  const terminalBrief = getRoundTransitionBrief({
    matchAfterResult: {
      ...createMatchState('ct'),
      playerSide: 't',
      scores: { player: 16, opponent: 14 },
    },
    winnerSide: 'ct',
    event: 't-eliminated',
    bankBefore: 12_000,
    bankAfter: 15_250,
  });
  assert.equal(terminalBrief.terminal, true);
  assert.equal(terminalBrief.earned, 3250);
  assert.equal(terminalBrief.next, null);
});

void test('simulation time advances only during active play', () => {
  let simulationMs = advanceSimulationTime(1000, 0.05, true);
  assert.equal(simulationMs, 1050);
  simulationMs = advanceSimulationTime(simulationMs, 30, false);
  assert.equal(simulationMs, 1050);
  simulationMs = advanceSimulationTime(simulationMs, -2, true);
  assert.equal(simulationMs, 1050);
  assert.equal(advanceSimulationTime(simulationMs, 0.3, true), 1350);
});

void test('each attack route terminates inside its selected bombsite', () => {
  for (const site of ['A', 'B'] as const) {
    const [siteX, siteZ] = BOMBSITES[site];
    ATTACK_ROUTES[site].forEach((route, variant) => {
      const [routeX, routeZ] = route.at(-1)!;
      assert.ok(
        Math.hypot(routeX - siteX, routeZ - siteZ) < 1,
        `${site} route ${variant} misses its bombsite`,
      );
    });
  }
});

void test('round plans deterministically vary direct and split attacks', () => {
  const plans = Array.from({ length: 6 }, (_, round) =>
    getRoundPlan(round, 'ct'),
  );
  const firstTPlan = getRoundPlan(REGULATION_HALF_ROUNDS, 't');
  const secondTPlan = getRoundPlan(REGULATION_HALF_ROUNDS + 1, 't');
  const thirdTPlan = getRoundPlan(REGULATION_HALF_ROUNDS + 2, 't');
  assert.deepEqual(
    plans.map(({ targetSite }) => targetSite),
    ['A', 'B', 'A', 'B', 'A', 'B'],
  );
  assert.deepEqual(
    plans.slice(0, 4).map(({ approach }) => approach),
    ['direct', 'direct', 'split', 'split'],
  );
  assert.deepEqual(getRoundPlan(3, 'ct'), getRoundPlan(3, 'ct'));
  assert.equal(plans[0].carrier.kind, 'bot');
  assert.equal(
    plans[0].assignments.filter(({ role }) => role === 'carrier').length,
    1,
  );
  assert.equal(
    plans[0].assignments.filter(({ role }) => role === 'entry').length,
    1,
  );
  assert.deepEqual(firstTPlan.carrier, { kind: 'bot', botId: 3 });
  assert.equal(
    firstTPlan.assignments.filter(({ role }) => role === 'carrier').length,
    1,
  );
  assert.deepEqual(secondTPlan.carrier, { kind: 'player' });
  assert.equal(
    secondTPlan.assignments.filter(({ role }) => role === 'carrier').length,
    0,
  );
  assert.deepEqual(thirdTPlan.carrier, { kind: 'bot', botId: 1 });
  assert.equal(
    thirdTPlan.assignments.find(({ botId }) => botId === 1)?.role,
    'carrier',
  );
  assert.deepEqual(
    [15, 16, 17, 18].map((round) => getRoundPlan(round, 't').carrier.kind),
    ['bot', 'player', 'bot', 'player'],
  );
  assert.deepEqual(getRoundPlan(-3, 't'), getRoundPlan(0, 't'));
  assert.equal(
    secondTPlan.assignments.filter(({ role }) => role === 'entry').length,
    1,
  );
  assert.deepEqual(
    plans[2].assignments.map(({ routeVariant }) => routeVariant),
    [0, 1, 0, 1, 0],
  );
  assert.deepEqual(
    [...new Set(plans[2].assignments.map(({ botId }) => botId))],
    [0, 1, 2, 3, 4],
  );
  const botCarrier = plans[2].carrier;
  assert.equal(botCarrier.kind, 'bot');
  if (botCarrier.kind === 'bot') {
    assert.equal(
      plans[2].assignments.find(({ botId }) => botId === botCarrier.botId)
        ?.routeVariant,
      0,
    );
  }
  assert.deepEqual(getRoundPlan(Number.NaN, 'ct'), getRoundPlan(0, 'ct'));
});

void test('every attack route variant clears the authoritative Dust II hull volumes', () => {
  for (const route of Object.values(ATTACK_ROUTES).flat()) {
    for (let i = 1; i < route.length; i++) {
      assert.ok(canTraverseMapSegment(route[i - 1], route[i]), JSON.stringify([route[i - 1], route[i]]));
    }
  }
});

void test('every planned bot carrier can reach and plant before time expires', () => {
  const spawns = [[0, 26], [-6, 26], [-3, 28], [3, 28], [6, 26]] as const;
  for (let round = 0; round < 8; round += 1) {
    const plan = getRoundPlan(round, 'ct');
    assert.equal(plan.carrier.kind, 'bot');
    if (plan.carrier.kind !== 'bot') continue;
    const carrierId = plan.carrier.botId;
    const route = plan.assignments[carrierId].route;
    const points = [spawns[carrierId], ...route];
    const distance = points.slice(1).reduce((total, point, index) => {
      const previous = points[index];
      return total + Math.hypot(point[0] - previous[0], point[1] - previous[1]);
    }, 0);
    const speed = 1.55 * ENEMY_COMBAT_PROFILES[carrierId].aggression;
    assert.ok(
      distance / speed + 3 < 90,
      `round ${round} carrier cannot complete its plant route`,
    );
  }
});

void test('blocked bot recovery is delayed, deterministic, and bounded', () => {
  const direct = getBotMovementDirections({
    deltaX: 0,
    deltaZ: 5,
    blockedSeconds: 0.34,
    botId: 1,
    waypointIndex: 2,
  });
  assert.deepEqual(direct, [{ x: 0, z: 1 }]);
  const recovering = getBotMovementDirections({
    deltaX: 0,
    deltaZ: 5,
    blockedSeconds: 0.35,
    botId: 1,
    waypointIndex: 2,
  });
  assert.equal(recovering.length, 3);
  assert.ok(recovering.every(({ x, z }) => Number.isFinite(x + z)));
  assert.deepEqual(
    recovering,
    getBotMovementDirections({
      deltaX: 0,
      deltaZ: 5,
      blockedSeconds: 0.35,
      botId: 1,
      waypointIndex: 2,
    }),
  );
  const flipped = getBotMovementDirections({
    deltaX: 0,
    deltaZ: 5,
    blockedSeconds: 0.8,
    botId: 1,
    waypointIndex: 2,
  });
  assert.equal(Math.sign(recovering[1].x), -Math.sign(flipped[1].x));
  assert.equal(advanceBotBlockedSeconds(0.3, 0, 0.2), 0.5);
  assert.equal(advanceBotBlockedSeconds(1.2, 0, 1), 1.25);
  assert.equal(advanceBotBlockedSeconds(0.7, 0.015, 0.1), 0);
  assert.equal(advanceBotBlockedSeconds(0.3, 0, -1), 0.3);
  assert.equal(isAtBotWaypoint({ x: 0, z: 0 }, { x: 1, z: 0 }, 1), true);
  assert.equal(isAtBotWaypoint({ x: 0, z: 0 }, { x: 1.001, z: 0 }, 1), false);
  assert.equal(
    getNearestRouteWaypointIndex(
      [
        [0, 0],
        [2, 0],
        [4, 0],
      ],
      { x: 1, z: 0 },
    ),
    1,
  );
  assert.equal(getNearestRouteWaypointIndex([], { x: 3, z: 4 }), 0);
});

void test('cross-site retake routes clear Dust II geometry', () => {
  for (const route of Object.values(CT_RETAKE_ROUTES)) {
    for (let i = 1; i < route.length; i++) {
      assert.ok(canTraverseMapSegment(route[i - 1], route[i]), JSON.stringify([route[i - 1], route[i]]));
    }
  }
});

void test('kit defenders can traverse every retake before detonation', () => {
  const starts = { A: [26.5, -25], B: [-28, -24] } as const;
  for (const home of ['A', 'B'] as const) {
    for (const target of ['A', 'B'] as const) {
      const route = CT_RETAKE_ROUTES[`${home}-${target}`];
      const points = [starts[home], ...route];
      const travelDistance = points.slice(1).reduce((total, point, index) => {
        const previous = points[index];
        return (
          total + Math.hypot(point[0] - previous[0], point[1] - previous[1])
        );
      }, 0);
      assert.ok(
        travelDistance / 3.4 + getDefuseDuration(true) < 35,
        `${home}-${target} retake cannot beat the bomb timer`,
      );
      assert.ok(
        Math.hypot(
          route.at(-1)![0] - BOMBSITES[target][0],
          route.at(-1)![1] - BOMBSITES[target][1],
        ) < 0.1,
      );
    }
  }
});

void test('round time is clamped and formatted for the HUD', () => {
  assert.equal(formatRoundTime(ROUND_DURATION_SECONDS), '1:45');
  assert.equal(formatRoundTime(8.2), '0:09');
  assert.equal(formatRoundTime(-4), '0:00');
});

void test('a defuse kit halves the interaction time', () => {
  assert.equal(getDefuseDuration(false), 10);
  assert.equal(getDefuseDuration(true), 5);
});

void test('a surviving player retains their loadout regardless of round result', () => {
  assert.equal(shouldRetainLoadout(true), true);
  assert.equal(shouldRetainLoadout(false), false);
});

void test('only non-terminal results prepare another round automatically', () => {
  assert.equal(shouldAutoPrepareNextRound(null), true);
  assert.equal(shouldAutoPrepareNextRound('player'), false);
  assert.equal(shouldAutoPrepareNextRound('opponent'), false);
});

void test('control release and side onboarding are deterministic', () => {
  const latched = {
    keys: new Set(['KeyW', 'KeyE']),
    firing: true,
    triggerReady: false,
    dropRequested: true,
    touchLookPointer: 8,
  };
  const cleared = clearInputLatches(latched);
  assert.equal(cleared.keys.size, 0);
  assert.equal(cleared.firing, false);
  assert.equal(cleared.triggerReady, true);
  assert.equal(cleared.dropRequested, false);
  assert.equal(cleared.touchLookPointer, null);
  assert.deepEqual(clearInputLatches(cleared), cleared);
  assert.match(getSideOnboarding('ct').objective, /defend Sites A and B/);
  assert.match(getSideOnboarding('ct').objective, /hold E.*defuse/);
  assert.match(getSideOnboarding('t').objective, /carry the C4/);
  assert.match(
    getSideOnboarding('t').objective,
    /press 5.*primary fire.*plant/,
  );
});

void test('weapon handling distinguishes mobility and equip commitment', () => {
  const speed = (weapon: keyof typeof WEAPON_HANDLING) =>
    getWeaponMoveSpeed({
      weapon,
      walking: false,
      crouching: false,
      scoped: false,
    });
  assert.ok(speed('knife') > speed('usp'));
  assert.ok(speed('usp') > speed('rifle'));
  assert.ok(speed('rifle') > speed('sniper'));
  assert.equal(speed('bomb'), speed('grenade'));
  assert.ok(getWeaponEquipDelay('bomb') > 0);
  assert.ok(
    getWeaponMoveSpeed({
      weapon: 'rifle',
      walking: true,
      crouching: false,
      scoped: false,
    }) < speed('rifle'),
  );
  assert.ok(
    getWeaponMoveSpeed({
      weapon: 'rifle',
      walking: false,
      crouching: true,
      scoped: false,
    }) <
      getWeaponMoveSpeed({
        weapon: 'rifle',
        walking: true,
        crouching: false,
        scoped: false,
      }),
  );
  assert.ok(
    getWeaponMoveSpeed({
      weapon: 'sniper',
      walking: false,
      crouching: false,
      scoped: true,
    }) < speed('sniper'),
  );
  Object.entries(WEAPON_HANDLING).forEach(([, handling]) => {
    assert.ok(handling.runSpeed > 0);
    assert.ok(handling.equipMs > 0);
  });
  assert.ok(getWeaponEquipDelay('sniper') > getWeaponEquipDelay('rifle'));
  assert.ok(getWeaponEquipDelay('rifle') > getWeaponEquipDelay('usp'));
  assert.ok(getWeaponEquipDelay('usp') > getWeaponEquipDelay('knife'));
  assert.equal(isWeaponReady(499, 500), false);
  assert.equal(isWeaponReady(500, 500), true);
  assert.equal(isWeaponReady(501, 500), true);
  assert.equal(
    getWeaponBunnyHopSpeed('rifle', false),
    WEAPON_HANDLING.rifle.runSpeed,
  );
  assert.equal(
    getWeaponBunnyHopSpeed('sniper', true),
    WEAPON_HANDLING.sniper.runSpeed *
      (WEAPON_HANDLING.sniper.scopedSpeedMultiplier ?? 1),
  );
  const crouchedRunSpeed = getWeaponMoveSpeed({
    weapon: 'rifle',
    walking: false,
    crouching: true,
    scoped: false,
  });
  const legalHopSpeed = WEAPON_HANDLING.rifle.runSpeed * 1.2;
  assert.ok(legalHopSpeed > crouchedRunSpeed * 1.7);
  assert.deepEqual(
    limitBunnyHopVelocity(
      { x: legalHopSpeed, z: 0 },
      getWeaponBunnyHopSpeed('rifle', false),
    ),
    { x: legalHopSpeed, z: 0 },
  );
});

void test('crouch lowers the authoritative player eye within a safe bound', () => {
  assert.equal(getPlayerStanceEyeHeight(1.68, 0), 1.68);
  assert.ok(Math.abs(getPlayerStanceEyeHeight(1.68, 0.275) - 1.405) < 1e-9);
  assert.equal(getPlayerStanceEyeHeight(1.68, PLAYER_CROUCH_OFFSET), 1.13);
  assert.equal(getPlayerStanceEyeHeight(1.68, -1), 1.68);
  assert.equal(getPlayerStanceEyeHeight(1.68, Number.NaN), 1.68);
  assert.equal(getPlayerStanceEyeHeight(1.68, Number.POSITIVE_INFINITY), 1.68);
  assert.equal(getPlayerStanceEyeHeight(Number.NaN, 0.2), 1.48);
  assert.equal(getPlayerStanceEyeHeight(0.2, PLAYER_CROUCH_OFFSET), 0);
});

void test('counter-strafing stops faster than releasing movement', () => {
  const velocity = { x: 0, z: 4 };
  const released = stepHorizontalVelocity({
    velocity,
    wishDirection: { x: 0, z: 0 },
    maxSpeed: 4.55,
    dtSeconds: 0.1,
    grounded: true,
  });
  const countered = stepHorizontalVelocity({
    velocity,
    wishDirection: { x: 0, z: -1 },
    maxSpeed: 4.55,
    dtSeconds: 0.1,
    grounded: true,
  });
  assert.ok(countered.z < released.z);
  assert.ok(released.z >= 0);
  assert.ok(Math.hypot(countered.x, countered.z) <= 4.55);
  assert.deepEqual(
    stepHorizontalVelocity({
      velocity,
      wishDirection: { x: 0, z: -1 },
      maxSpeed: 4.55,
      dtSeconds: 0,
      grounded: true,
    }),
    velocity,
  );
});

void test('ground movement applies classic friction before projected acceleration', () => {
  const released = stepHorizontalVelocity({
    velocity: { x: 3, z: 4 },
    wishDirection: { x: 0, z: 0 },
    maxSpeed: 5,
    dtSeconds: 0.05,
    grounded: true,
  });
  assert.ok(Math.abs(released.x - 2.4) < 1e-9);
  assert.ok(Math.abs(released.z - 3.2) < 1e-9);

  const accelerated = stepHorizontalVelocity({
    velocity: { x: 0, z: 0 },
    wishDirection: { x: 0, z: 1 },
    maxSpeed: 4.55,
    dtSeconds: 1 / 60,
    grounded: true,
  });
  assert.ok(Math.abs(accelerated.z - (10 * 4.55) / 60) < 1e-9);
  assert.equal(accelerated.x, 0);
});

void test('air strafing preserves momentum and may exceed weapon run speed', () => {
  const coasting = stepHorizontalVelocity({
    velocity: { x: 0, z: 4.55 },
    wishDirection: { x: 0, z: 0 },
    maxSpeed: 4.55,
    dtSeconds: 0.05,
    grounded: false,
  });
  assert.deepEqual(coasting, { x: 0, z: 4.55 });

  const strafed = stepHorizontalVelocity({
    velocity: { x: 0, z: 4.55 },
    wishDirection: { x: 1, z: 0 },
    maxSpeed: 4.55,
    dtSeconds: 0.05,
    grounded: false,
  });
  assert.ok(
    Math.abs(
      strafed.x - PLAYER_AIR_ACCELERATION * PLAYER_AIR_WISH_SPEED * 0.05,
    ) < 1e-9,
  );
  assert.equal(strafed.z, 4.55);
  assert.ok(Math.hypot(strafed.x, strafed.z) > 4.55);

  const diagonal = stepHorizontalVelocity({
    velocity: { x: 0, z: 0 },
    wishDirection: { x: 1, z: 1 },
    maxSpeed: 4.55,
    dtSeconds: 0.05,
    grounded: false,
  });
  assert.ok(
    Math.abs(
      Math.hypot(diagonal.x, diagonal.z) -
        PLAYER_AIR_ACCELERATION * PLAYER_AIR_WISH_SPEED * 0.05,
    ) < 1e-9,
  );
  assert.ok(Math.abs(diagonal.x - diagonal.z) < 1e-9);

  const parallel = stepHorizontalVelocity({
    velocity: { x: 0, z: 4.55 },
    wishDirection: { x: 0, z: 1 },
    maxSpeed: 4.55,
    dtSeconds: 0.05,
    grounded: false,
  });
  assert.deepEqual(parallel, { x: 0, z: 4.55 });
});

void test('air acceleration uses the capped wish speed at small timesteps', () => {
  const accelerated = stepHorizontalVelocity({
    velocity: { x: 0, z: 0 },
    wishDirection: { x: 1, z: 0 },
    maxSpeed: 4.55,
    dtSeconds: 0.005,
    grounded: false,
  });
  const expected = PLAYER_AIR_ACCELERATION * PLAYER_AIR_WISH_SPEED * 0.005;
  assert.ok(Math.abs(accelerated.x - expected) < 1e-9);
  assert.ok(Math.abs(accelerated.x - 0.0273) < 1e-9);
  assert.equal(accelerated.z, 0);
});

void test('horizontal movement sanitizes invalid inputs and bounds bunny speed', () => {
  assert.deepEqual(
    stepHorizontalVelocity({
      velocity: { x: Number.NaN, z: Number.POSITIVE_INFINITY },
      wishDirection: { x: Number.NaN, z: Number.NEGATIVE_INFINITY },
      maxSpeed: Number.NaN,
      dtSeconds: Number.NaN,
      grounded: false,
    }),
    { x: 0, z: 0 },
  );
  assert.deepEqual(
    stepHorizontalVelocity({
      velocity: { x: Number.MAX_VALUE, z: Number.MAX_VALUE },
      wishDirection: { x: 0, z: 0 },
      maxSpeed: 4.55,
      dtSeconds: 0.05,
      grounded: true,
    }),
    { x: 0, z: 0 },
  );
  assert.deepEqual(
    stepHorizontalVelocity({
      velocity: { x: 0, z: 0 },
      wishDirection: { x: 0, z: 1 },
      maxSpeed: 4.55,
      dtSeconds: Number.MAX_VALUE,
      grounded: true,
    }),
    stepHorizontalVelocity({
      velocity: { x: 0, z: 0 },
      wishDirection: { x: 0, z: 1 },
      maxSpeed: 4.55,
      dtSeconds: 0.05,
      grounded: true,
    }),
  );
  assert.deepEqual(limitBunnyHopVelocity({ x: 8.5, z: 0 }, 5), {
    x: 8.5,
    z: 0,
  });
  const limited = limitBunnyHopVelocity({ x: 12, z: 5 }, 5);
  assert.ok(Math.abs(Math.hypot(limited.x, limited.z) - 5.525) < 1e-9);
  assert.deepEqual(limitBunnyHopVelocity({ x: Number.NaN, z: 4 }, Number.NaN), {
    x: 0,
    z: 0,
  });
});

void test('jump input requires a release before another takeoff request', () => {
  const firstPress = updateJumpButton(true, true);
  assert.deepEqual(firstPress, { jumpReady: false, shouldJump: true });
  assert.deepEqual(updateJumpButton(firstPress.jumpReady, true, true), {
    jumpReady: false,
    shouldJump: false,
  });
  const released = updateJumpButton(firstPress.jumpReady, false);
  assert.deepEqual(released, { jumpReady: true, shouldJump: false });
  assert.deepEqual(updateJumpButton(released.jumpReady, true), firstPress);
});

void test('landing recovery timer remains bounded for camera presentation', () => {
  const landed = advanceLandingRecovery(0, 1 / 60, false, true);
  assert.equal(landed, PLAYER_LANDING_RECOVERY_SECONDS);
  assert.ok(
    Math.abs(advanceLandingRecovery(landed, 0.05, true, true) - 0.15) < 1e-9,
  );
  assert.equal(advanceLandingRecovery(landed, 0, true, true), landed);
  assert.equal(advanceLandingRecovery(landed, Number.NaN, true, true), landed);
  assert.equal(advanceLandingRecovery(landed, 1, true, true), 0);
  assert.equal(advanceLandingRecovery(landed, 0.05, true, false), 0);
  assert.equal(advanceLandingRecovery(-1, 0.05, true, true), 0);
  assert.equal(advanceLandingRecovery(0, 0.05, false, true, -1), 0);
  assert.equal(
    advanceLandingRecovery(0, 0.05, false, true, Number.NaN),
    PLAYER_LANDING_RECOVERY_SECONDS,
  );

});

void test('landing feedback triggers once and settles without camera state', () => {
  assert.equal(didPlayerLand(false, true), true);
  assert.equal(didPlayerLand(true, true), false);
  assert.equal(didPlayerLand(false, false), false);
  assert.equal(didPlayerLand(true, false), false);

  const pose: LandingViewPose = { positionY: 99, rotationX: 99 };
  assert.equal(
    writeLandingViewPose(PLAYER_LANDING_RECOVERY_SECONDS, pose),
    pose,
  );
  assert.equal(pose.positionY, -0.018);
  assert.equal(pose.rotationX, 0.022);
  const fullPositionY = Math.abs(pose.positionY);
  const fullRotationX = Math.abs(pose.rotationX);

  writeLandingViewPose(PLAYER_LANDING_RECOVERY_SECONDS / 2, pose);
  assert.ok(Math.abs(pose.positionY) < fullPositionY);
  assert.ok(Math.abs(pose.rotationX) < fullRotationX);
  assert.ok(Number.isFinite(pose.positionY));
  assert.ok(Number.isFinite(pose.rotationX));

  [0, -1, Number.NaN].forEach((remainingSeconds) => {
    writeLandingViewPose(remainingSeconds, pose);
    assert.deepEqual(pose, { positionY: 0, rotationX: 0 });
  });
  writeLandingViewPose(PLAYER_LANDING_RECOVERY_SECONDS, pose, 0);
  assert.deepEqual(pose, { positionY: 0, rotationX: 0 });
  writeLandingViewPose(PLAYER_LANDING_RECOVERY_SECONDS, pose, Number.NaN);
  assert.deepEqual(pose, { positionY: -0.018, rotationX: 0.022 });
});

void test('the sniper rewards deliberate scoped shots', () => {
  assert.equal(canScopeWeapon('sniper'), true);
  assert.equal(canScopeWeapon('rifle'), false);
  assert.equal(getWeaponFieldOfView('sniper', true), 40);
  assert.equal(getWeaponFieldOfView('rifle', true), 74);
  assert.equal(getWeaponSensitivityMultiplier('sniper', true), 0.46);
  assert.equal(getWeaponSensitivityMultiplier('sniper', false), 1);
});

void test('the S90 bolt cycle is bounded and enforces scoped-shot commitment', () => {
  const createPose = (): SniperBoltCyclePose => ({
    positionZ: 0,
    rotationZ: 0,
  });
  const restSamples = [
    Number.NEGATIVE_INFINITY,
    -1,
    0,
    S90_BOLT_CYCLE_DURATION_MS,
    S90_BOLT_CYCLE_DURATION_MS + 1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ];
  restSamples.forEach((elapsedMs) => {
    const pose = createPose();
    assert.equal(writeSniperBoltCyclePose(elapsedMs, pose), pose);
    assert.deepEqual(pose, createPose());
  });

  let moved = false;
  for (
    let elapsedMs = 1;
    elapsedMs < S90_BOLT_CYCLE_DURATION_MS;
    elapsedMs += 7
  ) {
    const pose = createPose();
    writeSniperBoltCyclePose(elapsedMs, pose);
    assert.ok(Number.isFinite(pose.positionZ));
    assert.ok(Number.isFinite(pose.rotationZ));
    assert.ok(pose.positionZ >= 0 && pose.positionZ <= 0.15);
    assert.ok(pose.rotationZ >= -0.55 && pose.rotationZ <= 0);
    moved ||= pose.positionZ > 0 || pose.rotationZ < 0;
  }
  assert.equal(moved, true);
  assert.ok(S90_BOLT_CYCLE_DURATION_MS < FIREARMS.sniper.fireIntervalMs);

  assert.equal(isSniperBoltCycling('sniper', 1_000, 1_000), true);
  assert.equal(
    isSniperBoltCycling(
      'sniper',
      1_000 + S90_BOLT_CYCLE_DURATION_MS - 0.001,
      1_000,
    ),
    true,
  );
  assert.equal(
    isSniperBoltCycling('sniper', 1_000 + S90_BOLT_CYCLE_DURATION_MS, 1_000),
    false,
  );
  assert.equal(isSniperBoltCycling('rifle', 1_001, 1_000), false);
  assert.equal(isSniperBoltCycling('sniper', -1, -1), false);
  assert.equal(isSniperBoltCycling('sniper', Number.NaN, 1_000), false);

  assert.equal(shouldAutoUnscopeAfterCommittedShot('sniper', true, true), true);
  assert.equal(
    shouldAutoUnscopeAfterCommittedShot('sniper', false, true),
    false,
  );
  assert.equal(
    shouldAutoUnscopeAfterCommittedShot('sniper', true, false),
    false,
  );
  (Object.keys(WEAPON_HANDLING) as Array<keyof typeof WEAPON_HANDLING>)
    .filter((weapon) => weapon !== 'sniper')
    .forEach((weapon) => {
      assert.equal(
        shouldAutoUnscopeAfterCommittedShot(weapon, true, true),
        false,
      );
    });
});

void test('firearm feedback profiles are valid and distinctly tuned', () => {
  const profileSignatures = Object.values(FIREARMS).map(({ feedback }) => {
    const { sound, viewKick } = feedback;
    assert.ok(sound.duration > 0);
    assert.ok(sound.highpass > 0 && sound.lowpass > sound.highpass);
    assert.ok(sound.gain > 0 && sound.bodyFrequency > 0);
    assert.ok(viewKick.back >= 0 && viewKick.up >= 0);
    assert.ok(viewKick.roll >= 0 && viewKick.recovery > 0);
    return JSON.stringify(feedback);
  });
  assert.equal(new Set(profileSignatures).size, Object.keys(FIREARMS).length);
  assert.ok(decayShotPulse(1, 0.1, 20) < 1);
  assert.equal(decayShotPulse(0, 0.1, 20), 0);
});

void test('weapon action sounds are complete, valid, and weapon-specific', () => {
  assert.deepEqual(Object.keys(WEAPON_ACTION_SOUNDS), Object.keys(FIREARMS));
  const weaponSignatures = Object.values(WEAPON_ACTION_SOUNDS).map(
    (actions) => {
      assert.deepEqual(Object.keys(actions), [
        'reloadStart',
        'reloadCommit',
        'dryFire',
      ]);
      Object.values(actions).forEach((profile) => {
        assert.ok(profile.duration > 0);
        assert.ok(profile.highpass > 0 && profile.lowpass > profile.highpass);
        assert.ok(profile.gain > 0 && profile.toneFrequency > 0);
      });
      return JSON.stringify(actions);
    },
  );
  assert.equal(new Set(weaponSignatures).size, Object.keys(FIREARMS).length);
});

void test('buy zones are side-specific and include their exact boundary', () => {
  for (const side of ['ct', 't'] as const) {
    const [x, z] = PLAYER_SPAWNS[side];
    assert.equal(isInsideBuyZone(side, x, z), true);
    assert.equal(isInsideBuyZone(side, x + BUY_ZONE_RADIUS, z), true);
    assert.equal(isInsideBuyZone(side, x + BUY_ZONE_RADIUS + 0.001, z), false);
  }
  assert.equal(isInsideBuyZone('t', ...PLAYER_SPAWNS.ct), false);
  assert.equal(isInsideBuyZone('ct', ...PLAYER_SPAWNS.t), false);
  assert.equal(isInsideBuyZone('ct', Number.NaN, 26), false);
});

void test('buy eligibility reports the first blocking match condition', () => {
  const [x, z] = PLAYER_SPAWNS.ct;
  const allowed = {
    side: 'ct' as const,
    x,
    z,
    roundSeconds: ROUND_DURATION_SECONDS,
    active: true,
    alive: true,
  };
  assert.equal(getBuyBlockReason(allowed), null);
  assert.equal(
    getBuyBlockReason({ ...allowed, active: false, alive: false }),
    'round-inactive',
  );
  assert.equal(getBuyBlockReason({ ...allowed, alive: false }), 'player-dead');
  assert.equal(
    getBuyBlockReason({ ...allowed, roundSeconds: BUY_CUTOFF_SECONDS }),
    'buy-period-ended',
  );
  assert.equal(
    ROUND_DURATION_SECONDS - BUY_CUTOFF_SECONDS,
    BUY_DURATION_SECONDS,
  );
  assert.equal(
    getBuyBlockReason({ ...allowed, x: x + BUY_ZONE_RADIUS + 0.1 }),
    'outside-buy-zone',
  );
});

void test('the firearm registry defines distinct primary roles', () => {
  assert.deepEqual(Object.keys(FIREARMS), [
    'rifle',
    'carbine',
    'smg',
    'shotgun',
    'sniper',
    'glock18',
    'usp',
    'p228',
    'deagle',
    'elite',
    'fiveseven',
  ]);
  assert.equal(FIREARMS.rifle.trigger, 'automatic');
  assert.equal(FIREARMS.carbine.trigger, 'automatic');
  assert.equal(FIREARMS.carbine.price, 3100);
  assert.equal(FIREARMS.rifle.price, 2500);
  assert.ok(FIREARMS.carbine.bodyDamage < FIREARMS.rifle.bodyDamage);
  assert.ok(
    FIREARMS.carbine.recoil.maxPenalty < FIREARMS.rifle.recoil.maxPenalty,
  );
  assert.equal(
    FIREARMS.smg.fireIntervalMs < FIREARMS.rifle.fireIntervalMs,
    true,
  );
  assert.equal(FIREARMS.shotgun.pellets, 9);
  assert.equal(FIREARMS.shotgun.reloadMode, 'shell');
  assert.equal(FIREARMS.sniper.magazineSize, 10);
  assert.equal(FIREARMS.sniper.trigger, 'semi');
  assert.ok(FIREARMS.sniper.scope);
  assert.equal(FIREARMS.usp.slot, 'secondary');
  assert.deepEqual(SECONDARY_WEAPON_KINDS, [
    'glock18',
    'usp',
    'p228',
    'deagle',
    'elite',
    'fiveseven',
  ]);
  assert.equal(isSecondaryWeaponKind('glock18'), true);
  assert.equal(isSecondaryWeaponKind('rifle'), false);
  assert.equal(isFirearmKind('smg'), true);
  assert.equal(isFirearmKind('knife'), false);
  assert.equal(isPrimaryWeaponKind('shotgun'), true);
  assert.equal(isPrimaryWeaponKind('sniper'), true);
  assert.equal(isPrimaryWeaponKind('usp'), false);
});

void test('firearm damage preserves range and weapon identity', () => {
  assert.equal(getFirearmDamage('rifle', 5, 'torso'), 35);
  assert.ok(getFirearmDamage('rifle', 5, 'head') > 100);
  assert.equal(getFirearmDamage('carbine', 5, 'torso'), 31);
  assert.ok(getFirearmDamage('carbine', 5, 'head') > 100);
  assert.equal(getFirearmDamage('shotgun', 2, 'torso') * 9, 171);
  assert.ok(getFirearmDamage('shotgun', 70, 'torso') * 9 < 50);
  assert.ok(
    getFirearmDamage('smg', 8, 'torso') > getFirearmDamage('smg', 50, 'torso'),
  );
  assert.equal(getFirearmDamage('sniper', 5, 'torso'), 114);
  assert.ok(getFirearmDamage('sniper', 95, 'torso') === 106);
});

void test('classic secondary arsenal preserves faction starters and buy slots', () => {
  assert.equal(getStarterSecondaryForSide('ct'), 'usp');
  assert.equal(getStarterSecondaryForSide('t'), 'glock18');
  assert.deepEqual(createStarterSecondaryAmmo('ct'), {
    magazine: 12,
    reserve: 24,
  });
  assert.deepEqual(createStarterSecondaryAmmo('t'), {
    magazine: 20,
    reserve: 40,
  });
  assert.deepEqual(
    [1, 2, 3, 4].map((slot) => getPistolBuyOption('ct', slot)),
    ['glock18', 'usp', 'p228', 'deagle'],
  );
  assert.equal(getPistolBuyOption('ct', 5), 'fiveseven');
  assert.equal(getPistolBuyOption('t', 5), 'elite');
  assert.equal(getPistolBuyOption('ct', 0), null);
  assert.equal(getPistolBuyOption('ct', 6), null);
  assert.equal(FIREARMS.glock18.price, 400);
  assert.equal(FIREARMS.usp.price, 500);
  assert.equal(FIREARMS.p228.price, 600);
  assert.equal(FIREARMS.deagle.price, 650);
  assert.equal(FIREARMS.elite.price, 800);
  assert.equal(FIREARMS.fiveseven.price, 750);
  for (const kind of SECONDARY_WEAPON_KINDS) {
    assert.equal(FIREARMS[kind].purchaseReserve, 0);
    assert.ok(FIREARMS[kind].ammoPurchaseAmount > 0);
  }
  assert.equal(FIREARMS.glock18.fireIntervalMs, 150);
  assert.equal(FIREARMS.deagle.fireIntervalMs, 300);
  assert.equal(FIREARMS.elite.reloadMs, 4500);
  assert.equal(
    resolveAmmoPurchase({ kind: 'usp', money: 25, reserve: 0 }).amount,
    12,
  );
  assert.deepEqual(
    resolveAmmoPurchase({ kind: 'deagle', money: 40, reserve: 34 }),
    {
      purchased: true,
      reason: 'purchased',
      cost: 40,
      amount: 1,
      money: 0,
      reserve: 35,
    },
  );
  assert.equal(
    resolveAmmoPurchase({ kind: 'glock18', money: 19, reserve: 0 }).reason,
    'insufficient-funds',
  );
});

void test('classic hitgroups reward precise aim and preserve falloff', () => {
  assert.deepEqual(BODY_HITGROUP_DAMAGE_MULTIPLIERS, {
    torso: 1,
    stomach: 1.25,
    leg: 0.75,
  });
  assert.equal(getFirearmHitGroupMultiplier('rifle', 'head'), 4);
  assert.equal(getFirearmHitGroupMultiplier('rifle', 'torso'), 1);
  assert.equal(getFirearmHitGroupMultiplier('rifle', 'stomach'), 1.25);
  assert.equal(getFirearmHitGroupMultiplier('rifle', 'leg'), 0.75);

  (
    [
      'rifle',
      'carbine',
      'smg',
      'shotgun',
      'sniper',
      ...SECONDARY_WEAPON_KINDS,
    ] as const
  ).forEach((weapon) => {
    assert.ok(
      getFirearmDamage(weapon, 5, 'head') >
        getFirearmDamage(weapon, 5, 'stomach'),
    );
  });
  assert.equal(getFirearmDamage('sniper', 5, 'leg'), 85.5);
  assert.equal(getFirearmDamage('sniper', 5, 'torso'), 114);

  const nearTorso = getFirearmDamage('rifle', 5, 'torso');
  const farTorso = getFirearmDamage('rifle', 55, 'torso');
  (['head', 'torso', 'stomach', 'leg'] as const).forEach((hitGroup) => {
    const near = getFirearmDamage('rifle', 5, hitGroup);
    const far = getFirearmDamage('rifle', 55, hitGroup);
    assert.ok(Math.abs(far / near - farTorso / nearTorso) < 1e-12);
  });
  assert.ok(
    getFirearmDamage('rifle', 5, 'head') >
      getFirearmDamage('rifle', 5, 'stomach'),
  );
  assert.ok(
    getFirearmDamage('rifle', 5, 'stomach') >
      getFirearmDamage('rifle', 5, 'torso'),
  );
  assert.ok(
    getFirearmDamage('rifle', 5, 'torso') > getFirearmDamage('rifle', 5, 'leg'),
  );
});

void test('hitscan impacts stop on the nearest eligible surface', () => {
  assert.equal(
    resolveHitscanImpact({ targetDistance: 4, worldDistance: 7 }),
    'target',
  );
  assert.equal(
    resolveHitscanImpact({ targetDistance: 7, worldDistance: 4 }),
    'world',
  );
  assert.equal(
    resolveHitscanImpact({ targetDistance: 4, worldDistance: 4 }),
    'world',
  );
  assert.equal(
    resolveHitscanImpact({ targetDistance: null, worldDistance: 9 }),
    'world',
  );
  assert.equal(
    resolveHitscanImpact({ targetDistance: null, worldDistance: null }),
    'none',
  );
  assert.equal(
    resolveHitscanImpact({
      targetDistance: Number.NaN,
      worldDistance: Number.POSITIVE_INFINITY,
    }),
    'none',
  );
  assert.equal(
    resolveHitscanImpact({
      targetDistance: 2.2,
      worldDistance: 2.1,
      maximumDistance: 2.25,
    }),
    'world',
  );
  assert.equal(
    resolveHitscanImpact({
      targetDistance: 2.3,
      worldDistance: 2.4,
      maximumDistance: 2.25,
    }),
    'none',
  );
});

void test('axis-aligned cover exit distance is finite and angle-aware', () => {
  const minimum = { x: -1, y: -1, z: -1 };
  const maximum = { x: 1, y: 1, z: 1 };
  assert.equal(
    getAxisAlignedBoxExitDistance(
      { x: 0, y: 0, z: -5 },
      { x: 0, y: 0, z: 1 },
      minimum,
      maximum,
    ),
    6,
  );
  assert.equal(
    getAxisAlignedBoxExitDistance(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      minimum,
      maximum,
    ),
    1,
  );
  const diagonalExit = getAxisAlignedBoxExitDistance(
    { x: -5, y: 0, z: -5 },
    { x: 1, y: 0, z: 1 },
    minimum,
    maximum,
  );
  assert.ok(diagonalExit !== null);
  assert.ok(Math.abs(diagonalExit - Math.sqrt(72)) < 1e-9);
  assert.equal(
    getAxisAlignedBoxExitDistance(
      { x: 0, y: 2, z: -5 },
      { x: 0, y: 0, z: 1 },
      minimum,
      maximum,
    ),
    null,
  );
  assert.equal(
    getAxisAlignedBoxExitDistance(
      { x: Number.NaN, y: 0, z: -5 },
      { x: 0, y: 0, z: 1 },
      minimum,
      maximum,
    ),
    null,
  );
});

void test('hit confirmation prioritizes decisive and accurate impacts', () => {
  assert.equal(getHitConfirmation(false, false), 'body');
  assert.equal(getHitConfirmation(true, false), 'headshot');
  assert.equal(getHitConfirmation(false, true), 'kill');
  assert.equal(getHitConfirmation(true, true), 'headshot-kill');
  assert.equal(chooseHitConfirmation([]), null);
  assert.equal(chooseHitConfirmation(['body', 'headshot']), 'headshot');
  assert.equal(chooseHitConfirmation(['headshot', 'kill']), 'kill');
  assert.equal(
    chooseHitConfirmation(['kill', 'body', 'headshot-kill']),
    'headshot-kill',
  );
});

void test('classic weapon classes award distinct elimination money', () => {
  assert.deepEqual(PLAYER_KILL_REWARDS, {
    rifle: 300,
    carbine: 300,
    smg: 600,
    shotgun: 900,
    sniper: 100,
    glock18: 300,
    usp: 300,
    p228: 300,
    deagle: 300,
    elite: 300,
    fiveseven: 300,
    knife: 1500,
    grenade: 300,
  });
  for (const [weapon, reward] of Object.entries(PLAYER_KILL_REWARDS)) {
    assert.equal(
      getPlayerKillReward(weapon as keyof typeof PLAYER_KILL_REWARDS),
      reward,
    );
  }
  const threeKillReward =
    getPlayerKillReward('smg') +
    getPlayerKillReward('shotgun') +
    getPlayerKillReward('grenade');
  assert.equal(threeKillReward, 1800);
  assert.equal(addMoney(15_800, threeKillReward), 16_000);
});

void test('magazine and shell reloads respect capacity and reserve', () => {
  assert.deepEqual(reloadMagazine({ magazine: 4, reserve: 10 }, 12), {
    magazine: 12,
    reserve: 2,
  });
  assert.deepEqual(reloadMagazine({ magazine: 4, reserve: 3 }, 12), {
    magazine: 7,
    reserve: 0,
  });
  assert.deepEqual(reloadSingleShell({ magazine: 3, reserve: 2 }, 8), {
    magazine: 4,
    reserve: 1,
  });
  assert.deepEqual(reloadSingleShell({ magazine: 8, reserve: 2 }, 8), {
    magazine: 8,
    reserve: 2,
  });
  assert.deepEqual(
    reloadMagazine({ magazine: 3, reserve: 10 }, FIREARMS.sniper.magazineSize),
    { magazine: 10, reserve: 3 },
  );
});

void test('reload progress is clamped and safe for invalid timestamps', () => {
  assert.equal(getReloadProgress(1_000, 2_000, 500), 0);
  assert.equal(getReloadProgress(1_000, 2_000, 1_500), 0.5);
  assert.equal(getReloadProgress(1_000, 2_000, 2_000), 1);
  assert.equal(getReloadProgress(1_000, 2_000, 4_000), 1);
  assert.equal(getReloadProgress(1_000, 1_000, 999), 0);
  assert.equal(getReloadProgress(1_000, 1_000, 1_000), 1);
  assert.equal(getReloadProgress(Number.NaN, 2_000, 1_500), 0);
  assert.equal(getReloadProgress(1_000, Number.POSITIVE_INFINITY, 1_500), 0);
});

void test('first-person reload poses are bounded, distinct, and reset cleanly', () => {
  const createPose = (): WeaponReloadPose => ({
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  });
  const values = (pose: WeaponReloadPose) => Object.values(pose);
  const firearms = Object.keys(FIREARMS) as Array<keyof typeof FIREARMS>;
  const signatures = new Set<string>();

  for (const weapon of firearms) {
    const pose = createPose();
    for (const sampleProgress of [0.25, 0.5, 0.75]) {
      assert.equal(writeWeaponReloadPose(weapon, sampleProgress, pose), pose);
      assert.ok(values(pose).every(Number.isFinite));
      assert.ok(pose.positionX >= -0.1 && pose.positionX <= 0);
      assert.ok(pose.positionY >= -0.22 && pose.positionY <= 0.2);
      assert.ok(pose.positionZ >= -0.02 && pose.positionZ <= 0.15);
      assert.ok(
        [pose.rotationX, pose.rotationY, pose.rotationZ].every(
          (value) => Math.abs(value) <= 0.4,
        ),
      );
    }
    writeWeaponReloadPose(weapon, 0.5, pose);
    signatures.add(
      values(pose)
        .map((value) => value.toFixed(4))
        .join(','),
    );

    for (const resetProgress of [
      -1,
      0,
      1,
      2,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      writeWeaponReloadPose(weapon, resetProgress, pose);
      assert.deepEqual(values(pose), [0, 0, 0, 0, 0, 0]);
    }
  }

  assert.equal(signatures.size, firearms.length);
  const neutralPose = createPose();
  writeWeaponReloadPose(null, 0.5, neutralPose);
  assert.deepEqual(values(neutralPose), [0, 0, 0, 0, 0, 0]);

  const shotgunPose = createPose();
  const riflePose = createPose();
  const sniperPose = createPose();
  writeWeaponReloadPose('shotgun', 0.5, shotgunPose);
  writeWeaponReloadPose('rifle', 0.5, riflePose);
  writeWeaponReloadPose('sniper', 0.5, sniperPose);
  assert.ok(shotgunPose.rotationZ < 0);
  assert.ok(riflePose.rotationZ > 0);
  assert.ok(sniperPose.positionY < riflePose.positionY);

  for (const weapon of SECONDARY_WEAPON_KINDS) {
    const pistolPose = createPose();
    writeWeaponReloadPose(weapon, 0.5, pistolPose);
    assert.ok(
      pistolPose.positionY === 0.2,
      `${weapon} reload should lift the visual root without moving its idle mount`,
    );
  }
});

void test('reload eligibility rejects interrupted and non-playable states', () => {
  const allowed = {
    active: true,
    alive: true,
    buyOpen: false,
    weaponReady: true,
    reloading: false,
    ammo: { magazine: 4, reserve: 8 },
    magazineSize: 12,
  };
  assert.equal(canStartPlayerReload(allowed), true);
  assert.equal(canStartPlayerReload({ ...allowed, active: false }), false);
  assert.equal(canStartPlayerReload({ ...allowed, alive: false }), false);
  assert.equal(canStartPlayerReload({ ...allowed, buyOpen: true }), false);
  assert.equal(canStartPlayerReload({ ...allowed, weaponReady: false }), false);
  assert.equal(canStartPlayerReload({ ...allowed, reloading: true }), false);
  assert.equal(
    canStartPlayerReload({ ...allowed, ammo: { magazine: 12, reserve: 8 } }),
    false,
  );
  assert.equal(
    canStartPlayerReload({ ...allowed, ammo: { magazine: 4, reserve: 0 } }),
    false,
  );
});

void test('holding fire repeats only automatic firearms', () => {
  assert.equal(shouldRepeatFire('rifle', true), true);
  assert.equal(shouldRepeatFire('smg', true), true);
  assert.equal(shouldRepeatFire('shotgun', true), false);
  assert.equal(shouldRepeatFire('usp', true), false);
  assert.equal(shouldRepeatFire('knife', true), false);
  assert.equal(shouldRepeatFire('flash', true), false);
  assert.equal(shouldRepeatFire('bomb', true), false);
  assert.equal(shouldRepeatFire('rifle', false), false);
});

void test('damage directions are relative to the direction the player faces', () => {
  assert.equal(getDamageDirection(0, -10, 0, 0, 0), 'front');
  assert.equal(getDamageDirection(10, 0, 0, 0, 0), 'right');
  assert.equal(getDamageDirection(0, 10, 0, 0, 0), 'back');
  assert.equal(getDamageDirection(-10, 0, 0, 0, 0), 'left');
  assert.equal(getDamageDirection(10, 0, 0, 0, -Math.PI / 2), 'front');
});

void test('positional audio cues provide bounded distance and stereo information', () => {
  assert.deepEqual(getPositionalAudioCue(0, 0, 0, 0, 0, 18), {
    pan: 0,
    gain: 1,
  });
  assert.equal(getPositionalAudioCue(9, 0, 0, 0, 0, 18)?.pan, 1);
  assert.equal(getPositionalAudioCue(-9, 0, 0, 0, 0, 18)?.pan, -1);
  assert.ok(Math.abs(getPositionalAudioCue(0, -9, 0, 0, 0, 18)!.pan) < 0.001);
  assert.ok(
    getPositionalAudioCue(4, 0, 0, 0, 0, 18)!.gain >
      getPositionalAudioCue(12, 0, 0, 0, 0, 18)!.gain,
  );
  assert.equal(getPositionalAudioCue(18, 0, 0, 0, 0, 18), null);
  assert.equal(getPositionalAudioCue(1, 0, 0, 0, Number.NaN, 18), null);
});

void test('bot footsteps require real movement and respect both cooldowns', () => {
  const allowed = {
    sourceAlive: true,
    listenerAlive: true,
    speed: 1.5,
    distance: 7,
    nowMs: 1_000,
    botNextAtMs: 900,
    sharedNextAtMs: 880,
  };
  assert.equal(shouldEmitBotFootstep(allowed), true);
  assert.equal(
    shouldEmitBotFootstep({ ...allowed, sourceAlive: false }),
    false,
  );
  assert.equal(
    shouldEmitBotFootstep({ ...allowed, listenerAlive: false }),
    false,
  );
  assert.equal(shouldEmitBotFootstep({ ...allowed, speed: 0.69 }), false);
  assert.equal(
    shouldEmitBotFootstep({
      ...allowed,
      distance: BOT_FOOTSTEP_HEARING_RADIUS,
    }),
    false,
  );
  assert.equal(
    shouldEmitBotFootstep({ ...allowed, botNextAtMs: 1_001 }),
    false,
  );
  assert.equal(
    shouldEmitBotFootstep({ ...allowed, sharedNextAtMs: 1_001 }),
    false,
  );
  assert.ok(BOT_FOOTSTEP_SHARED_COOLDOWN_MS >= 110);
});

void test('bot footstep cadence stays bounded across movement speeds', () => {
  assert.equal(getBotFootstepCadenceMs(0.7), 620);
  assert.equal(getBotFootstepCadenceMs(3.5), 420);
  assert.equal(getBotFootstepCadenceMs(99), 420);
  assert.equal(getBotFootstepCadenceMs(Number.NaN), 620);
  assert.ok(getBotFootstepCadenceMs(2.5) < getBotFootstepCadenceMs(1));
});

void test('grenade blast damage falls off smoothly to zero at its radius', () => {
  assert.equal(getExplosionDamage(0), 115);
  assert.ok(getExplosionDamage(3) > getExplosionDamage(6));
  assert.ok(getExplosionDamage(6) > 0);
  assert.equal(getExplosionDamage(9), 0);
  assert.equal(getExplosionDamage(20), 0);
  assert.equal(getExplosionDamage(0, 24, 500), 500);
  assert.ok(getExplosionDamage(12, 24, 500) > 0);
  assert.equal(getExplosionDamage(24, 24, 500), 0);
});

void test('grenade fuse advances only with simulated play time', () => {
  assert.equal(advanceGrenadeFuse(1.85, 0.25), 1.6);
  assert.equal(advanceGrenadeFuse(1.6, 0), 1.6);
  assert.equal(advanceGrenadeFuse(0.1, 0.25), 0);
});

void test('flashbang exposure rewards facing and proximity while respecting cover', () => {
  const direct = getFlashBlindDuration({
    distance: 0,
    viewDot: 1,
    hasLineOfSight: true,
  });
  const side = getFlashBlindDuration({
    distance: 4,
    viewDot: 0,
    hasLineOfSight: true,
  });
  const behind = getFlashBlindDuration({
    distance: 4,
    viewDot: -1,
    hasLineOfSight: true,
  });
  const far = getFlashBlindDuration({
    distance: 18,
    viewDot: 1,
    hasLineOfSight: true,
  });
  assert.equal(direct, 3.2);
  assert.ok(direct > side);
  assert.ok(side > behind);
  assert.ok(side > far);
  assert.equal(
    getFlashBlindDuration({
      distance: 2,
      viewDot: 1,
      hasLineOfSight: false,
    }),
    0,
  );
  assert.equal(
    getFlashBlindDuration({
      distance: 24,
      viewDot: 1,
      hasLineOfSight: true,
    }),
    0,
  );
  assert.equal(
    getFlashBlindDuration({
      distance: Number.NaN,
      viewDot: Number.NaN,
      hasLineOfSight: true,
    }),
    0,
  );
});

void test('flash overlay fades monotonically and expires cleanly', () => {
  const full = getFlashOverlayOpacity(3.2, 3.2);
  const half = getFlashOverlayOpacity(1.6, 3.2);
  const tail = getFlashOverlayOpacity(0.1, 3.2);
  assert.equal(full, 1);
  assert.ok(full > half);
  assert.ok(half > tail);
  assert.equal(getFlashOverlayOpacity(0, 3.2), 0);
  assert.equal(getFlashOverlayOpacity(1, 0), 0);
});

void test('firearm pickup requires an empty slot and yields to objectives', () => {
  const allowed = {
    active: true,
    alive: true,
    freezeSeconds: 0,
    currentPrimary: null,
    currentSecondary: null,
    candidate: 'rifle' as const,
    distance: FIREARM_PICKUP_RADIUS,
    objectiveInteractionAvailable: false,
  };
  assert.equal(canPickupFirearm(allowed), true);
  assert.equal(canPickupFirearm({ ...allowed, distance: 1.36 }), false);
  assert.equal(canPickupFirearm({ ...allowed, currentPrimary: 'smg' }), false);
  assert.equal(canPickupFirearm({ ...allowed, candidate: 'usp' }), true);
  assert.equal(
    canPickupFirearm({ ...allowed, candidate: 'usp', currentSecondary: 'usp' }),
    false,
  );
  assert.equal(canPickupFirearm({ ...allowed, alive: false }), false);
  assert.equal(canPickupFirearm({ ...allowed, active: false }), false);
  assert.equal(canPickupFirearm({ ...allowed, freezeSeconds: 0.1 }), false);
  assert.equal(
    canPickupFirearm({ ...allowed, objectiveInteractionAvailable: true }),
    false,
  );
});

void test('attacker bomb recovery is automatic on touching a dropped device', () => {
  const allowed = {
    active: true,
    alive: true,
    playerSide: 't' as const,
    bombState: 'dropped' as const,
    playerHasBomb: false,
    distance: BOMB_PICKUP_RADIUS,
  };
  const snapshot = { ...allowed };
  assert.equal(canPlayerPickupBomb({ ...allowed, distance: 0 }), true);
  assert.equal(canPlayerPickupBomb(allowed), true);
  assert.equal(canPlayerPickupBomb({ ...allowed, active: false }), false);
  assert.equal(canPlayerPickupBomb({ ...allowed, alive: false }), false);
  assert.equal(canPlayerPickupBomb({ ...allowed, playerSide: 'ct' }), false);
  assert.equal(
    canPlayerPickupBomb({ ...allowed, bombState: 'carried' }),
    false,
  );
  assert.equal(canPlayerPickupBomb({ ...allowed, playerHasBomb: true }), false);
  assert.equal(
    canPlayerPickupBomb({
      ...allowed,
      distance: BOMB_PICKUP_RADIUS + 0.001,
    }),
    false,
  );
  assert.equal(canPlayerPickupBomb({ ...allowed, distance: -1 }), false);
  assert.equal(
    canPlayerPickupBomb({ ...allowed, distance: Number.NaN }),
    false,
  );
  assert.equal(
    canPlayerPickupBomb({ ...allowed, distance: Number.POSITIVE_INFINITY }),
    false,
  );
  assert.deepEqual(allowed, snapshot);
});

void test('manual C4 drops require a living attacker carrying it', () => {
  const allowed = {
    active: true,
    alive: true,
    playerSide: 't' as const,
    bombState: 'carried' as const,
    playerHasBomb: true,
    buyOpen: false,
  };
  const snapshot = { ...allowed };
  assert.equal(canPlayerDropBomb(allowed), true);
  assert.equal(canPlayerDropBomb({ ...allowed, active: false }), false);
  assert.equal(canPlayerDropBomb({ ...allowed, alive: false }), false);
  assert.equal(canPlayerDropBomb({ ...allowed, playerSide: 'ct' }), false);
  assert.equal(canPlayerDropBomb({ ...allowed, bombState: 'planting' }), false);
  assert.equal(canPlayerDropBomb({ ...allowed, bombState: 'dropped' }), false);
  assert.equal(canPlayerDropBomb({ ...allowed, bombState: 'planted' }), false);
  assert.equal(canPlayerDropBomb({ ...allowed, bombState: 'defused' }), false);
  assert.equal(
    canPlayerDropBomb({ ...allowed, bombState: 'detonated' }),
    false,
  );
  assert.equal(canPlayerDropBomb({ ...allowed, playerHasBomb: false }), false);
  assert.equal(canPlayerDropBomb({ ...allowed, buyOpen: true }), false);
  assert.deepEqual(allowed, snapshot);
});

void test('a requested drop targets only the actively selected slot', () => {
  assert.equal(
    getPlayerDropTarget({
      activeWeapon: 'bomb',
      canDropBomb: true,
      canDropFirearm: true,
    }),
    'bomb',
  );
  assert.equal(
    getPlayerDropTarget({
      activeWeapon: 'rifle',
      canDropBomb: true,
      canDropFirearm: true,
    }),
    'firearm',
  );
  assert.equal(
    getPlayerDropTarget({
      activeWeapon: 'usp',
      canDropBomb: true,
      canDropFirearm: true,
    }),
    'firearm',
  );
  assert.equal(
    getPlayerDropTarget({
      activeWeapon: 'bomb',
      canDropBomb: false,
      canDropFirearm: true,
    }),
    null,
  );
  for (const activeWeapon of ['knife', 'grenade', 'smoke', 'flash'] as const) {
    assert.equal(
      getPlayerDropTarget({
        activeWeapon,
        canDropBomb: true,
        canDropFirearm: true,
      }),
      null,
    );
  }
  assert.equal(
    getPlayerDropTarget({
      activeWeapon: 'rifle',
      canDropBomb: true,
      canDropFirearm: false,
    }),
    null,
  );
});

void test('manual firearm drops require an uninterrupted held firearm', () => {
  const allowed = {
    active: true,
    alive: true,
    activeWeapon: 'sniper' as const,
    currentPrimary: 'sniper' as const,
    currentSecondary: null,
    reloading: false,
    buyOpen: false,
  };
  assert.equal(canDropFirearm(allowed), true);
  assert.equal(canDropFirearm({ ...allowed, activeWeapon: 'usp' }), false);
  assert.equal(canDropFirearm({ ...allowed, currentPrimary: null }), false);
  assert.equal(canDropFirearm({ ...allowed, reloading: true }), false);
  assert.equal(canDropFirearm({ ...allowed, buyOpen: true }), false);
});

void test('player-origin drop grace follows simulation time', () => {
  assert.equal(isFirearmDropAvailable(1750, 1749), false);
  assert.equal(isFirearmDropAvailable(1750, 1750), true);
  assert.equal(isFirearmDropAvailable(1750, 2500), true);
  assert.equal(isFirearmDropAvailable(Number.POSITIVE_INFINITY, 2500), false);
});

void describe('eligible dropped firearm selection', () => {
  void test('skips an occupied secondary for an overlapping primary', () => {
    const selected = getEligibleDroppedFirearm({
      drops: [
        { id: 1, kind: 'usp', pickupAvailableAtMs: 1000, distance: 0.5 },
        { id: 2, kind: 'rifle', pickupAvailableAtMs: 1000, distance: 0.5 },
      ],
      currentPrimary: null,
      currentSecondary: 'usp',
      simulationNowMs: 1000,
    });

    assert.equal(selected?.id, 2);
  });

  void test('skips an occupied primary for an overlapping secondary', () => {
    const selected = getEligibleDroppedFirearm({
      drops: [
        { id: 1, kind: 'rifle', pickupAvailableAtMs: 1000, distance: 0.5 },
        { id: 2, kind: 'usp', pickupAvailableAtMs: 1000, distance: 0.5 },
      ],
      currentPrimary: 'rifle',
      currentSecondary: null,
      simulationNowMs: 1000,
    });

    assert.equal(selected?.id, 2);
  });

  void test('respects pickup grace and pickup radius', () => {
    const selected = getEligibleDroppedFirearm({
      drops: [
        { id: 1, kind: 'rifle', pickupAvailableAtMs: 1001, distance: 0.1 },
        {
          id: 2,
          kind: 'carbine',
          pickupAvailableAtMs: 1000,
          distance: FIREARM_PICKUP_RADIUS + 0.001,
        },
        {
          id: 3,
          kind: 'shotgun',
          pickupAvailableAtMs: 1000,
          distance: FIREARM_PICKUP_RADIUS,
        },
      ],
      currentPrimary: null,
      currentSecondary: null,
      simulationNowMs: 1000,
    });

    assert.equal(selected?.id, 3);
  });

  void test('prefers the nearest eligible drop', () => {
    const selected = getEligibleDroppedFirearm({
      drops: [
        { id: 9, kind: 'rifle', pickupAvailableAtMs: 1000, distance: 0.4 },
        { id: 4, kind: 'carbine', pickupAvailableAtMs: 1000, distance: 0.5 },
      ],
      currentPrimary: null,
      currentSecondary: null,
      simulationNowMs: 1000,
    });

    assert.equal(selected?.id, 9);
  });

  void test('resolves equal distances by drop id', () => {
    const selected = getEligibleDroppedFirearm({
      drops: [
        { id: 9, kind: 'rifle', pickupAvailableAtMs: 1000, distance: 0.5 },
        { id: 4, kind: 'carbine', pickupAvailableAtMs: 1000, distance: 0.5 },
      ],
      currentPrimary: null,
      currentSecondary: null,
      simulationNowMs: 1000,
    });

    assert.equal(selected?.id, 4);
  });

  void test('returns no drop when every slot is occupied', () => {
    const selected = getEligibleDroppedFirearm({
      drops: [
        { id: 1, kind: 'rifle', pickupAvailableAtMs: 1000, distance: 0.2 },
        { id: 2, kind: 'usp', pickupAvailableAtMs: 1000, distance: 0.4 },
      ],
      currentPrimary: 'rifle',
      currentSecondary: 'usp',
      simulationNowMs: 1000,
    });

    assert.equal(selected, null);
  });
});

void test('dropped firearm ammunition is copied and bounded to its weapon', () => {
  const ammo = { magazine: 7, reserve: 43 };
  const snapshot = sanitizeDroppedFirearmAmmo('rifle', ammo);
  assert.deepEqual(snapshot, ammo);
  assert.notEqual(snapshot, ammo);
  assert.deepEqual(sanitizeDroppedFirearmAmmo('carbine', ammo), ammo);
  assert.deepEqual(
    sanitizeDroppedFirearmAmmo('shotgun', {
      magazine: 99,
      reserve: Number.POSITIVE_INFINITY,
    }),
    { magazine: 8, reserve: 0 },
  );
  assert.deepEqual(
    sanitizeDroppedFirearmAmmo('sniper', { magazine: 9, reserve: 99 }),
    { magazine: 9, reserve: 30 },
  );
});

void test('smoke blooms, persists, and fades at the end of its lifetime', () => {
  assert.equal(getSmokeCloudOpacity(-1), 0);
  assert.ok(getSmokeCloudOpacity(0.3) > 0);
  assert.equal(getSmokeCloudOpacity(1), 1);
  assert.ok(getSmokeCloudOpacity(12.5) < 1);
  assert.equal(getSmokeCloudOpacity(13), 0);
});

void test('smoke blocks only sight segments that cross its radius', () => {
  const start = [0, 1.6, 0] as const;
  const end = [10, 1.6, 0] as const;
  assert.equal(segmentIntersectsSmoke(start, end, [5, 1.6, 0], 2), true);
  assert.equal(segmentIntersectsSmoke(start, end, [5, 1.6, 3], 2), false);
  assert.equal(segmentIntersectsSmoke(start, end, [13, 1.6, 0], 2), false);
});

void test('enemy combat movement includes pauses and range-aware choices', () => {
  assert.equal(getEnemyCombatMovement(4, 11, 0.5), 'retreat');
  assert.equal(getEnemyCombatMovement(20, 11, 0.2), 'advance');
  assert.equal(getEnemyCombatMovement(12, 11, 0.2), 'hold');
  assert.equal(getEnemyCombatMovement(12, 11, 0.5), 'left');
  assert.equal(getEnemyCombatMovement(12, 11, 0.9), 'right');
});

void test('only a threatened bomb carrier interrupts an active plant', () => {
  assert.equal(shouldInterruptPlant(true, true, true, false), true);
  assert.equal(shouldInterruptPlant(true, true, false, true), true);
  assert.equal(shouldInterruptPlant(false, true, true, true), false);
  assert.equal(shouldInterruptPlant(true, false, true, true), false);
  assert.equal(shouldInterruptPlant(true, true, false, false), false);
});

void test('bot skill cycles through three persistent player-facing tiers', () => {
  assert.equal(getNextBotDifficulty('recruit'), 'standard');
  assert.equal(getNextBotDifficulty('standard'), 'veteran');
  assert.equal(getNextBotDifficulty('veteran'), 'recruit');
  assert.deepEqual(BOT_DIFFICULTY_TUNING, {
    recruit: {
      reactionTimeScale: 1.35,
      activeBurstLimit: 2,
    },
    standard: {
      reactionTimeScale: 1.1,
      activeBurstLimit: 2,
    },
    veteran: {
      reactionTimeScale: 1,
      activeBurstLimit: 3,
    },
  });
  assert.equal(normalizeBotDifficulty(undefined), 'recruit');
  assert.equal(normalizeBotDifficulty('recruit'), 'recruit');
  assert.equal(normalizeBotDifficulty('standard'), 'standard');
  assert.equal(normalizeBotDifficulty('veteran'), 'veteran');
  assert.equal(normalizeBotDifficulty('expert'), 'recruit');
  assert.equal(normalizeBotDifficulty(1), 'recruit');
});

void test('bot reaction and firing-lane tuning preserves the current difficulty presets', () => {
  assert.ok(
    Math.abs(getBotReactionTime('rifle', 0.2, 'recruit') - 0.27) <
      0.0001,
  );
  assert.ok(
    Math.abs(getBotReactionTime('rifle', 0.2, 'standard') - 0.22) <
      0.0001,
  );
  assert.equal(getBotReactionTime('rifle', 0.2, 'veteran'), 0.2);
  assert.ok(
    Math.abs(getBotReactionTime('sniper', 0.2, 'recruit') - 0.648) <
      0.0001,
  );
  assert.equal(getBotActiveBurstLimit('recruit'), 2);
  assert.equal(getBotActiveBurstLimit('standard'), 2);
  assert.equal(getBotActiveBurstLimit('veteran'), 3);

});

void test('bot skill burst limits give Recruit two fair firing lanes', () => {
  const readyToStartBurst = {
    playerAlive: true,
    hasLineOfSight: true,
    blinded: false,
    inRange: true,
    facingPlayer: true,
    sightSeconds: 1,
    reactionSeconds: 0.2,
    fireCooldown: 0,
    reloadSeconds: 0,
    utilitySeconds: 0,
    hasMagazineAmmo: true,
    burstShotsRemaining: 0,
    carrierPlanting: false,
  };
  assert.equal(
    canEnemyFire({
      ...readyToStartBurst,
      activeShooters: 0,
      activeBurstLimit: getBotActiveBurstLimit('recruit'),
    }),
    true,
  );
  assert.equal(
    canEnemyFire({
      ...readyToStartBurst,
      activeShooters: 1,
      activeBurstLimit: getBotActiveBurstLimit('recruit'),
    }),
    true,
  );
  assert.equal(
    canEnemyFire({
      ...readyToStartBurst,
      activeShooters: 2,
      activeBurstLimit: getBotActiveBurstLimit('recruit'),
    }),
    false,
  );
  assert.equal(
    canEnemyFire({
      ...readyToStartBurst,
      activeShooters: 2,
      activeBurstLimit: getBotActiveBurstLimit('veteran'),
    }),
    true,
  );
  assert.equal(
    canEnemyFire({
      ...readyToStartBurst,
      activeShooters: 3,
      activeBurstLimit: getBotActiveBurstLimit('veteran'),
    }),
    false,
  );
});

void test('enemy fire cadence varies by weapon', () => {
  assert.ok(Math.abs(getEnemyFireCooldown('rifle', 0) - 0.27504) < 0.0001);
  assert.ok(
    getEnemyFireCooldown('sniper', 0) > getEnemyFireCooldown('rifle', 1),
  );
});

void test('enemies use distinct reactions and short human-like bursts', () => {
  assert.equal(ENEMY_COMBAT_PROFILES.length, 5);
  assert.ok(
    new Set(ENEMY_COMBAT_PROFILES.map((profile) => profile.reactionTime)).size >
      1,
  );
  assert.ok(
    ENEMY_COMBAT_PROFILES.every(
      (profile) => profile.reactionTime >= 0.15 && profile.reactionTime <= 0.3,
    ),
  );
  assert.equal(getEnemyBurstSize('rifle', 0, 8), 3);
  assert.equal(getEnemyBurstSize('rifle', 1, 8), 5);
  assert.equal(getEnemyBurstSize('smg', 0, 24), 3);
  assert.equal(getEnemyBurstSize('smg', 1, 24), 5);
  assert.equal(getEnemyBurstSize('shotgun', 1, 8), 1);
  assert.equal(getEnemyBurstSize('sniper', 1, 24), 1);
  assert.ok(
    getEnemyBurstShotCooldown('smg', 0) < getEnemyBurstShotCooldown('rifle', 0),
  );
});

void test('each enemy squad fields one deterministic primary of every role', () => {
  assert.deepEqual(ENEMY_PRIMARY_ROSTER, ['rifle', 'smg', 'shotgun', 'sniper']);
  assert.equal(getServiceRifleForSide('t'), 'rifle');
  assert.equal(getServiceRifleForSide('ct'), 'carbine');
  for (let roundIndex = 0; roundIndex < 8; roundIndex += 1) {
    const tLoadout = Array.from({ length: 4 }, (_, enemyId) =>
      getEnemyPrimaryWeapon(roundIndex, enemyId, 't'),
    );
    const ctLoadout = Array.from({ length: 4 }, (_, enemyId) =>
      getEnemyPrimaryWeapon(roundIndex, enemyId, 'ct'),
    );
    assert.equal(new Set(tLoadout).size, 4);
    assert.equal(new Set(ctLoadout).size, 4);
    assert.equal(tLoadout.filter((kind) => kind === 'rifle').length, 1);
    assert.equal(tLoadout.includes('carbine'), false);
    assert.equal(ctLoadout.filter((kind) => kind === 'carbine').length, 1);
    assert.equal(ctLoadout.includes('rifle'), false);
    assert.equal(tLoadout.filter((kind) => kind === 'sniper').length, 1);
    assert.equal(ctLoadout.filter((kind) => kind === 'sniper').length, 1);
    assert.equal(
      getEnemyPrimaryWeapon(roundIndex, 2, 'ct'),
      getEnemyPrimaryWeapon(roundIndex, 2, 'ct'),
    );
  }
});

void test('bot loss streaks create one deterministic light-buy round', () => {
  assert.equal(getBotBuyTier(0), 'full');
  assert.equal(getBotBuyTier(1), 'eco');
  assert.equal(getBotBuyTier(2), 'full');
  assert.equal(getBotBuyTier(-1), 'full');
  assert.equal(getBotBuyTier(Number.NaN), 'full');

  const ecoLoadout = Array.from({ length: 4 }, (_, botId) =>
    getBotRoundPrimaryWeapon(3, botId, 1, 'ct'),
  );
  assert.deepEqual(ecoLoadout, ['shotgun', 'smg', 'shotgun', 'smg']);
  assert.equal(ecoLoadout.filter((kind) => kind === 'smg').length, 2);
  assert.equal(ecoLoadout.filter((kind) => kind === 'shotgun').length, 2);
  assert.equal(ecoLoadout.includes('rifle'), false);
  assert.equal(ecoLoadout.includes('sniper'), false);
  assert.equal(getBotRoundPrimaryWeapon(Number.NaN, -1, 1, 't'), 'smg');

  let match = createMatchState('ct');
  match = recordRoundWinner(match, 'player');
  assert.equal(getBotBuyTier(match.lossStreaks.opponent), 'eco');
  assert.equal(getBotBuyTier(match.lossStreaks.player), 'full');
  match = recordRoundWinner(match, 'player');
  assert.equal(getBotBuyTier(match.lossStreaks.opponent), 'full');

  const halftime = prepareNextRound({
    startingPlayerSide: 'ct',
    playerSide: 'ct',
    scores: { player: 8, opponent: 7 },
    lossStreaks: { player: 1, opponent: 1 },
  });
  assert.equal(halftime.transition, 'halftime');
  const postHalftimeLoadout = Array.from({ length: 4 }, (_, botId) =>
    getBotRoundPrimaryWeapon(
      REGULATION_HALF_ROUNDS,
      botId,
      halftime.match.lossStreaks.opponent,
      getBotSide(halftime.match.playerSide, 'enemy'),
    ),
  );
  assert.equal(new Set(postHalftimeLoadout).size, 4);
  assert.equal(
    postHalftimeLoadout.filter((kind) => kind === 'sniper').length,
    1,
  );
});

void test('both squads use pistols only for the opening round of each half', () => {
  assert.equal(isOpeningPistolRound(0), true);
  assert.equal(isOpeningPistolRound(REGULATION_HALF_ROUNDS), true);
  assert.equal(isOpeningPistolRound(REGULATION_ROUNDS), false);
  [
    -1,
    0.5,
    1,
    REGULATION_HALF_ROUNDS - 1,
    REGULATION_HALF_ROUNDS + 1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ].forEach((roundIndex) =>
    assert.equal(isOpeningPistolRound(roundIndex), false),
  );

  for (const matchRoundIndex of [0, REGULATION_HALF_ROUNDS]) {
    for (const side of ['ct', 't'] as const) {
      for (let botId = 0; botId < 4; botId += 1) {
        for (const lossStreak of [0, 1, 4]) {
          assert.equal(
            getBotRoundFirearm({
              matchRoundIndex,
              rosterRoundIndex: matchRoundIndex + (side === 'ct' ? 1 : 0),
              botId,
              lossStreak,
              side,
            }),
            getStarterSecondaryForSide(side),
          );
        }
      }
    }
  }

  for (const matchRoundIndex of [1, REGULATION_HALF_ROUNDS + 1]) {
    for (const side of ['ct', 't'] as const) {
      for (let botId = 0; botId < 4; botId += 1) {
        const rosterRoundIndex = matchRoundIndex + 1;
        assert.equal(
          getBotRoundFirearm({
            matchRoundIndex,
            rosterRoundIndex,
            botId,
            lossStreak: 0,
            side,
          }),
          getBotRoundPrimaryWeapon(rosterRoundIndex, botId, 0, side),
        );
      }
    }
  }

  assert.equal(
    getBotRoundFirearm({
      matchRoundIndex: 5,
      rosterRoundIndex: 5,
      botId: 3,
      lossStreak: 0,
      side: 't',
    }),
    'rifle',
  );
  assert.equal(
    getBotRoundFirearm({
      matchRoundIndex: 5,
      rosterRoundIndex: 5,
      botId: 3,
      lossStreak: 0,
      side: 'ct',
    }),
    'carbine',
  );
});

void test('bot firearm rounds preserve all weapon recovery', () => {
  for (const kind of SECONDARY_WEAPON_KINDS) {
    assert.equal(getBotFirearmDropKind(kind), kind);
  }
  for (const kind of [
    'rifle',
    'carbine',
    'smg',
    'shotgun',
    'sniper',
  ] as const) {
    assert.equal(getBotFirearmDropKind(kind), kind);
  }
});

void test('bot defuse kits require a designated CT full-buy round', () => {
  const designatedCt = {
    side: 'ct' as const,
    assignedKit: true,
    matchRoundIndex: 1,
    lossStreak: 0,
  };
  assert.equal(shouldIssueBotDefuseKit(designatedCt), true);
  assert.equal(
    shouldIssueBotDefuseKit({ ...designatedCt, matchRoundIndex: 2 }),
    true,
  );
  assert.equal(
    shouldIssueBotDefuseKit({ ...designatedCt, lossStreak: 2 }),
    true,
  );
  assert.equal(
    shouldIssueBotDefuseKit({ ...designatedCt, assignedKit: false }),
    false,
  );
  assert.equal(shouldIssueBotDefuseKit({ ...designatedCt, side: 't' }), false);
  for (const playerSide of ['ct', 't'] as const) {
    assert.equal(
      shouldIssueBotDefuseKit({
        ...designatedCt,
        side: getBotSide(playerSide, 'enemy'),
      }),
      playerSide === 't',
    );
    assert.equal(
      shouldIssueBotDefuseKit({
        ...designatedCt,
        side: getBotSide(playerSide, 'ally'),
      }),
      playerSide === 'ct',
    );
  }
  assert.equal(
    shouldIssueBotDefuseKit({ ...designatedCt, matchRoundIndex: 0 }),
    false,
  );
  assert.equal(
    shouldIssueBotDefuseKit({
      ...designatedCt,
      matchRoundIndex: REGULATION_HALF_ROUNDS,
    }),
    false,
  );
  assert.equal(
    shouldIssueBotDefuseKit({ ...designatedCt, lossStreak: 1 }),
    false,
  );
  for (const invalidRound of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(
      shouldIssueBotDefuseKit({
        ...designatedCt,
        matchRoundIndex: invalidRound,
      }),
      false,
    );
  }
  for (const invalidLoss of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(
      shouldIssueBotDefuseKit({ ...designatedCt, lossStreak: invalidLoss }),
      false,
    );
  }
  assert.equal(getDefuseDuration(true), 5);
  assert.equal(getDefuseDuration(false), 10);
});

void test('enemy ammunition and reloads obey the shared firearm registry', () => {
  for (const kind of [
    ...ENEMY_PRIMARY_ROSTER,
    'carbine',
    ...SECONDARY_WEAPON_KINDS,
  ] as const) {
    assert.deepEqual(createEnemyPrimaryAmmo(kind), {
      magazine: FIREARMS[kind].magazineSize,
      reserve: FIREARMS[kind].maxReserve,
    });
    assert.equal(getEnemyReloadDuration(kind), FIREARMS[kind].reloadMs / 1000);
  }
  assert.deepEqual(reloadEnemyPrimary('rifle', { magazine: 4, reserve: 12 }), {
    magazine: 16,
    reserve: 0,
  });
  assert.deepEqual(
    reloadEnemyPrimary('shotgun', { magazine: 4, reserve: 12 }),
    {
      magazine: 5,
      reserve: 11,
    },
  );
  assert.deepEqual(reloadEnemyPrimary('usp', { magazine: 0, reserve: 12 }), {
    magazine: 12,
    reserve: 0,
  });
});

void test('bot secondaries use explicit restrained combat handling', () => {
  assert.ok(Math.abs(getEnemyFireCooldown('usp', 0) - 0.144) < 0.0001);
  assert.equal(getEnemyBurstSize('usp', 0.5, 8), 1);
  assert.ok(Math.abs(getEnemyBurstShotCooldown('usp', 0) - 0.138) < 0.0001);
  assert.equal(getEnemyReloadDuration('usp'), 2.7);
  assert.equal(getEnemyEngagementRange('usp'), 30);
  assert.equal(getEnemyPreferredRange('usp', 11), 9);
  assert.equal(getEnemyReactionTime('usp', 0.2), 0.2);
  assert.equal(getEnemyMuzzleOffsetZ('usp'), -0.62);
});

void test('enemy weapon range and pursuit make contact dangerous but readable', () => {
  assert.ok(
    getEnemyEngagementRange('sniper') > getEnemyEngagementRange('rifle'),
  );
  assert.ok(getEnemyEngagementRange('rifle') > getEnemyEngagementRange('smg'));
  assert.ok(
    getEnemyEngagementRange('smg') > getEnemyEngagementRange('shotgun'),
  );
  assert.ok(
    getEnemyPreferredRange('sniper', 11) >
      getEnemyPreferredRange('shotgun', 11),
  );
  assert.ok(
    getEnemyPursuitSpeed('hunter', 1, 0, 0) >
      getEnemyPursuitSpeed('escort', 1, 0, 0),
  );
  assert.ok(
    getEnemyPursuitSpeed('escort', 1, 0, 3) <
      getEnemyPursuitSpeed('escort', 1, 0, 0),
  );
  assert.ok(getEnemyReactionTime('sniper', 0.2) > 0.4);
  assert.equal(getEnemyReactionTime('rifle', 0.2), 0.2);
});

void test('enemy fire always requires a fair visible contact', () => {
  const validContact = {
    playerAlive: true,
    hasLineOfSight: true,
    blinded: false,
    inRange: true,
    facingPlayer: true,
    sightSeconds: 0.4,
    reactionSeconds: 0.2,
    fireCooldown: 0,
    reloadSeconds: 0,
    utilitySeconds: 0,
    hasMagazineAmmo: true,
    burstShotsRemaining: 0,
    activeShooters: 2,
    carrierPlanting: false,
  };
  assert.equal(canEnemyFire(validContact), true);
  assert.equal(canEnemyFire({ ...validContact, hasLineOfSight: false }), false);
  assert.equal(canEnemyFire({ ...validContact, blinded: true }), false);
  assert.equal(canEnemyFire({ ...validContact, inRange: false }), false);
  assert.equal(canEnemyFire({ ...validContact, facingPlayer: false }), false);
  assert.equal(canEnemyFire({ ...validContact, sightSeconds: 0.1 }), false);
  assert.equal(canEnemyFire({ ...validContact, fireCooldown: 0.1 }), false);
  assert.equal(canEnemyFire({ ...validContact, reloadSeconds: 0.1 }), false);
  assert.equal(canEnemyFire({ ...validContact, utilitySeconds: 0.1 }), false);
  assert.equal(
    canEnemyFire({ ...validContact, hasMagazineAmmo: false }),
    false,
  );
  assert.equal(canEnemyFire({ ...validContact, activeShooters: 3 }), false);
  assert.equal(
    canEnemyFire({
      ...validContact,
      activeShooters: ENEMY_MAX_ACTIVE_BURSTS - 1,
      activeBurstLimit: ENEMY_MAX_ACTIVE_BURSTS,
    }),
    true,
  );
  assert.equal(
    canEnemyFire({
      ...validContact,
      activeShooters: ENEMY_MAX_ACTIVE_BURSTS,
      activeBurstLimit: ENEMY_MAX_ACTIVE_BURSTS,
    }),
    false,
  );
  assert.equal(
    canEnemyFire({
      ...validContact,
      activeShooters: ENEMY_MAX_ACTIVE_BURSTS,
      activeBurstLimit: ENEMY_MAX_ACTIVE_BURSTS,
      burstShotsRemaining: 1,
    }),
    true,
  );
  assert.equal(canEnemyFire({ ...validContact, carrierPlanting: true }), false);
});

void test('radar contacts require a direct sighting and expire at last-known position', () => {
  const visibleContact = {
    playerAlive: true,
    blinded: false,
    hasLineOfSight: true,
    distance: 30,
    viewAlignment: 0.7,
  };
  assert.equal(canPlayerSpotEnemy(visibleContact), true);
  assert.equal(
    canPlayerSpotEnemy({ ...visibleContact, hasLineOfSight: false }),
    false,
  );
  assert.equal(canPlayerSpotEnemy({ ...visibleContact, blinded: true }), false);
  assert.equal(
    canPlayerSpotEnemy({ ...visibleContact, viewAlignment: 0.1 }),
    false,
  );
  assert.equal(canPlayerSpotEnemy({ ...visibleContact, distance: 61 }), false);
});

void test('enemies commit to one movement decision during a burst', () => {
  assert.equal(shouldChooseEnemyMovement(-0.01, 0), true);
  assert.equal(shouldChooseEnemyMovement(-0.01, 3), false);
  assert.equal(shouldChooseEnemyMovement(0.2, 0), false);
});

void test('squad pressure has human communication and firing limits', () => {
  assert.equal(canEnemyUseSquadIntel(0.2, 5), false);
  assert.equal(canEnemyUseSquadIntel(0.45, 5), true);
  assert.equal(canEnemyUseSquadIntel(4.5, 5), false);
  assert.equal(canEnemyStartBurst(0), true);
  assert.equal(canEnemyStartBurst(1), true);
  assert.equal(canEnemyStartBurst(2), true);
  assert.equal(canEnemyStartBurst(3), false);
  assert.equal(canEnemyStartBurst(1, ENEMY_MAX_ACTIVE_BURSTS), true);
  assert.equal(canEnemyStartBurst(2, ENEMY_MAX_ACTIVE_BURSTS), false);
});

void test('backup radio calls require a live post-freeze squad and cooldown', () => {
  const ready = {
    active: true,
    playerAlive: true,
    freezeSeconds: 0,
    nowMs: 9000,
    nextCallAtMs: 9000,
    livingAllyCount: 1,
  };
  assert.equal(canIssueBackupCall(ready), true);
  assert.equal(canIssueBackupCall({ ...ready, active: false }), false);
  assert.equal(canIssueBackupCall({ ...ready, playerAlive: false }), false);
  assert.equal(canIssueBackupCall({ ...ready, freezeSeconds: 0.01 }), false);
  assert.equal(canIssueBackupCall({ ...ready, nowMs: 8999 }), false);
  assert.equal(canIssueBackupCall({ ...ready, livingAllyCount: 0 }), false);
  assert.equal(canIssueBackupCall({ ...ready, nowMs: Number.NaN }), false);
  assert.equal(
    canIssueBackupCall({ ...ready, nextCallAtMs: Number.NaN }),
    false,
  );
  assert.equal(
    canIssueBackupCall({ ...ready, freezeSeconds: Number.NaN }),
    false,
  );
  assert.equal(
    canIssueBackupCall({ ...ready, livingAllyCount: Number.NaN }),
    false,
  );
  assert.equal(SQUAD_BACKUP_CALL_COOLDOWN_MS, 8000);
  assert.equal(SQUAD_BACKUP_CALLOUT_MS, 2600);
});

void test('backup responses expire and preserve combat and objective priority', () => {
  const ready = {
    hasDirectContact: false,
    objectiveLocked: false,
    playerAlive: true,
    requestAgeSeconds: 0,
  };
  assert.equal(shouldAllyRespondToBackup(ready), true);
  assert.equal(
    shouldAllyRespondToBackup({
      ...ready,
      requestAgeSeconds: SQUAD_BACKUP_REQUEST_SECONDS - 0.001,
    }),
    true,
  );
  assert.equal(
    shouldAllyRespondToBackup({
      ...ready,
      requestAgeSeconds: SQUAD_BACKUP_REQUEST_SECONDS,
    }),
    false,
  );
  assert.equal(
    shouldAllyRespondToBackup({ ...ready, hasDirectContact: true }),
    false,
  );
  assert.equal(
    shouldAllyRespondToBackup({ ...ready, objectiveLocked: true }),
    false,
  );
  assert.equal(
    shouldAllyRespondToBackup({ ...ready, playerAlive: false }),
    false,
  );
  assert.equal(
    shouldAllyRespondToBackup({ ...ready, requestAgeSeconds: -0.001 }),
    false,
  );
  assert.equal(
    shouldAllyRespondToBackup({
      ...ready,
      requestAgeSeconds: Number.POSITIVE_INFINITY,
    }),
    false,
  );

  assert.deepEqual(
    Array.from({ length: 4 }, (_, allyId) =>
      getSquadBackupFormationOffset(allyId),
    ),
    SQUAD_BACKUP_FORMATION_OFFSETS,
  );
  assert.equal(new Set(SQUAD_BACKUP_FORMATION_OFFSETS.map(String)).size, 4);
  assert.equal(
    getSquadBackupFormationOffset(4),
    SQUAD_BACKUP_FORMATION_OFFSETS[0],
  );
  assert.equal(
    getSquadBackupFormationOffset(Number.NaN),
    SQUAD_BACKUP_FORMATION_OFFSETS[0],
  );

  assert.deepEqual(
    getSquadBackupTarget(10, 20, 0, () => false),
    {
      x: 8.1,
      z: 18.85,
    },
  );
  assert.deepEqual(
    getSquadBackupTarget(10, 20, 0, (x) => x < 10),
    { x: 11.9, z: 18.85 },
  );
  assert.equal(
    getSquadBackupTarget(10, 20, 0, () => true),
    null,
  );
  assert.equal(
    getSquadBackupTarget(Number.NaN, 20, 0, () => false),
    null,
  );
  const edgeTarget = getSquadBackupTarget(
    31,
    31,
    1,
    (x, z) => Math.abs(x) > 32 || Math.abs(z) > 32,
  );
  assert.ok(edgeTarget);
  assert.ok(Math.abs(edgeTarget.x) <= 32);
  assert.ok(Math.abs(edgeTarget.z) <= 32);

  const reservedTargets: Array<{ x: number; z: number }> = [];
  for (const allyId of [0, 1, 2]) {
    const target = getSquadBackupTarget(
      10,
      20,
      allyId,
      (x, z) => x === 8.1 && z === 18.85,
      reservedTargets,
    );
    assert.ok(target);
    assert.ok(
      reservedTargets.every(
        (reserved) =>
          Math.hypot(reserved.x - target.x, reserved.z - target.z) >=
          SQUAD_BACKUP_TARGET_SEPARATION,
      ),
    );
    reservedTargets.push(target);
  }
  assert.equal(reservedTargets.length, 3);
});

void test('ally contact radio emits once for a fresh fair sighting', () => {
  const ready = {
    active: true,
    sourceAlive: true,
    targetAlive: true,
    playerAlive: true,
    directContactId: 2,
    previousDirectContactId: null,
    freezeSeconds: 0,
    nowMs: 4500,
    nextCalloutAtMs: 4500,
    radioBusy: false,
  };
  assert.equal(shouldEmitAllyEnemySpottedCallout(ready), true);
  assert.equal(
    shouldEmitAllyEnemySpottedCallout({
      ...ready,
      previousDirectContactId: 2,
    }),
    false,
  );
  assert.equal(
    shouldEmitAllyEnemySpottedCallout({
      ...ready,
      previousDirectContactId: 1,
    }),
    true,
  );
  assert.equal(
    shouldEmitAllyEnemySpottedCallout({ ...ready, directContactId: null }),
    false,
  );
  assert.equal(
    shouldEmitAllyEnemySpottedCallout({ ...ready, sourceAlive: false }),
    false,
  );
  assert.equal(
    shouldEmitAllyEnemySpottedCallout({ ...ready, targetAlive: false }),
    false,
  );
  assert.equal(
    shouldEmitAllyEnemySpottedCallout({ ...ready, playerAlive: false }),
    false,
  );
  assert.equal(
    shouldEmitAllyEnemySpottedCallout({ ...ready, active: false }),
    false,
  );
  assert.equal(
    shouldEmitAllyEnemySpottedCallout({ ...ready, freezeSeconds: 0.001 }),
    false,
  );
  assert.equal(
    shouldEmitAllyEnemySpottedCallout({ ...ready, nowMs: 4499 }),
    false,
  );
  assert.equal(
    shouldEmitAllyEnemySpottedCallout({ ...ready, radioBusy: true }),
    false,
  );
  assert.equal(
    shouldEmitAllyEnemySpottedCallout({
      ...ready,
      directContactId: Number.NaN,
    }),
    false,
  );
  assert.equal(
    shouldEmitAllyEnemySpottedCallout({
      ...ready,
      previousDirectContactId: Number.NaN,
    }),
    false,
  );
  assert.equal(
    shouldEmitAllyEnemySpottedCallout({ ...ready, nowMs: Number.NaN }),
    false,
  );
  assert.equal(
    shouldEmitAllyEnemySpottedCallout({
      ...ready,
      nextCalloutAtMs: Number.POSITIVE_INFINITY,
    }),
    false,
  );
  assert.equal(ALLY_ENEMY_SPOTTED_CALLOUT_MS, 1800);
  assert.equal(ALLY_ENEMY_SPOTTED_COOLDOWN_MS, 4500);
  assert.equal(ALLY_ENEMY_SPOTTED_CALLOUT_TEXT, 'RADIO · ENEMY SPOTTED');
  assert.equal(
    /\d|SITE|LEFT|RIGHT|FRONT|BACK/.test(ALLY_ENEMY_SPOTTED_CALLOUT_TEXT),
    false,
  );
});

void test('player-confirmed squad intel is delayed, expiring, and objective-safe', () => {
  const ready = {
    hasDirectContact: false,
    objectiveLocked: false,
    calloutAgeSeconds: FRIENDLY_INTEL_RADIO_DELAY_SECONDS,
    freshnessAgeSeconds: 0,
    memorySeconds: 8,
  };
  assert.equal(shouldAllyInvestigateIntel(ready), true);
  assert.equal(
    shouldAllyInvestigateIntel({
      ...ready,
      calloutAgeSeconds: FRIENDLY_INTEL_RADIO_DELAY_SECONDS - 0.001,
    }),
    false,
  );
  assert.equal(
    shouldAllyInvestigateIntel({ ...ready, hasDirectContact: true }),
    false,
  );
  assert.equal(
    shouldAllyInvestigateIntel({ ...ready, objectiveLocked: true }),
    false,
  );
  assert.equal(
    shouldAllyInvestigateIntel({
      ...ready,
      freshnessAgeSeconds: FRIENDLY_INTEL_MAX_FRESHNESS_SECONDS - 0.001,
    }),
    true,
  );
  assert.equal(
    shouldAllyInvestigateIntel({
      ...ready,
      freshnessAgeSeconds: FRIENDLY_INTEL_MAX_FRESHNESS_SECONDS,
    }),
    false,
  );
  assert.equal(
    shouldAllyInvestigateIntel({
      ...ready,
      freshnessAgeSeconds: 2,
      memorySeconds: 2,
    }),
    false,
  );
  for (const invalid of [
    { calloutAgeSeconds: Number.NaN },
    { calloutAgeSeconds: Number.POSITIVE_INFINITY },
    { freshnessAgeSeconds: -0.001 },
    { freshnessAgeSeconds: Number.NaN },
    { freshnessAgeSeconds: Number.POSITIVE_INFINITY },
    { memorySeconds: Number.NaN },
    { memorySeconds: Number.POSITIVE_INFINITY },
    { memorySeconds: -1 },
  ])
    assert.equal(shouldAllyInvestigateIntel({ ...ready, ...invalid }), false);
});

void test('confirmed enemy deaths clear matching squad intel without id collisions', () => {
  assert.equal(shouldClearFriendlyIntelForElimination(2, 'enemy', 2), true);
  assert.equal(shouldClearFriendlyIntelForElimination(2, 'enemy', 1), false);
  assert.equal(shouldClearFriendlyIntelForElimination(2, 'ally', 2), false);
  assert.equal(shouldClearFriendlyIntelForElimination(null, 'enemy', 2), false);
});

void test('enemy targeting prefers real contact and resets tracking on switches', () => {
  assert.equal(
    chooseEnemyCombatTarget([
      {
        id: 'ally:1',
        kind: 'ally',
        alive: true,
        distance: 4,
        visible: false,
      },
      {
        id: 'player',
        kind: 'player',
        alive: true,
        distance: 8,
        visible: true,
      },
    ])?.id,
    'player',
  );
  assert.equal(
    chooseEnemyCombatTarget([
      {
        id: 'ally:1',
        kind: 'ally',
        alive: true,
        distance: 4,
        visible: true,
      },
      {
        id: 'player',
        kind: 'player',
        alive: true,
        distance: 8,
        visible: true,
      },
    ])?.id,
    'ally:1',
  );
  assert.equal(
    chooseEnemyCombatTarget([
      {
        id: 'ally:1',
        kind: 'ally',
        alive: true,
        distance: 4,
        visible: false,
      },
      {
        id: 'player',
        kind: 'player',
        alive: true,
        distance: 8,
        visible: false,
      },
    ]),
    null,
  );
  assert.equal(
    chooseEnemyCombatTarget([
      {
        id: 'player',
        kind: 'player',
        alive: true,
        distance: 8,
        visible: false,
      },
      {
        id: 'ally:2',
        kind: 'ally',
        alive: true,
        distance: 5,
        visible: true,
      },
    ])?.id,
    'ally:2',
  );
  assert.equal(
    chooseEnemyCombatTarget([
      {
        id: 'player',
        kind: 'player',
        alive: true,
        distance: 10,
        visible: true,
      },
      {
        id: 'ally:1',
        kind: 'ally',
        alive: true,
        distance: 8.59,
        visible: true,
      },
    ])?.id,
    'ally:1',
  );
  assert.equal(
    chooseEnemyCombatTarget([
      {
        id: 'player',
        kind: 'player',
        alive: true,
        distance: 10,
        visible: true,
      },
      { id: 'ally:1', kind: 'ally', alive: true, distance: 8.6, visible: true },
    ])?.id,
    'player',
  );
  assert.equal(
    chooseEnemyCombatTarget([
      {
        id: 'player',
        kind: 'player',
        alive: true,
        distance: 10,
        visible: true,
      },
      {
        id: 'ally:1',
        kind: 'ally',
        alive: true,
        distance: 8.61,
        visible: true,
      },
    ])?.id,
    'player',
  );
  assert.equal(
    chooseEnemyCombatTarget([
      {
        id: 'player',
        kind: 'player',
        alive: true,
        distance: 12,
        visible: true,
      },
      { id: 'ally:1', kind: 'ally', alive: true, distance: 9, visible: true },
      { id: 'ally:2', kind: 'ally', alive: true, distance: 4, visible: true },
      { id: 'ally:3', kind: 'ally', alive: true, distance: 6, visible: true },
    ])?.id,
    'ally:2',
  );
  const tiedCandidates = [
    {
      id: 'ally:10' as const,
      kind: 'ally' as const,
      alive: true,
      distance: 4,
      visible: true,
    },
    {
      id: 'ally:2' as const,
      kind: 'ally' as const,
      alive: true,
      distance: 4,
      visible: true,
    },
  ];
  const tiedSnapshot = tiedCandidates.map((candidate) => ({ ...candidate }));
  assert.equal(chooseEnemyCombatTarget(tiedCandidates)?.id, 'ally:2');
  assert.equal(
    chooseEnemyCombatTarget([...tiedCandidates].reverse())?.id,
    'ally:2',
  );
  assert.deepEqual(tiedCandidates, tiedSnapshot);
  assert.equal(
    chooseEnemyCombatTarget([
      {
        id: 'player',
        kind: 'player',
        alive: true,
        distance: 4,
        visible: false,
      },
      { id: 'ally:1', kind: 'ally', alive: true, distance: 3, visible: false },
    ]),
    null,
  );
  for (const candidate of [
    {
      id: 'player' as const,
      kind: 'player' as const,
      alive: false,
      distance: 4,
      visible: true,
    },
    {
      id: 'player' as const,
      kind: 'player' as const,
      alive: true,
      distance: -1,
      visible: true,
    },
    {
      id: 'player' as const,
      kind: 'player' as const,
      alive: true,
      distance: Number.NaN,
      visible: true,
    },
    {
      id: 'player' as const,
      kind: 'player' as const,
      alive: true,
      distance: Number.POSITIVE_INFINITY,
      visible: true,
    },
  ]) {
    assert.equal(chooseEnemyCombatTarget([candidate]), null);
  }
  assert.equal(shouldResetEnemyTracking('player', 'player'), false);
  assert.equal(shouldResetEnemyTracking(null, null), false);
  assert.equal(shouldResetEnemyTracking('ally:1', 'player'), true);
  assert.equal(shouldResetEnemyTracking('player', 'ally:1'), true);
  assert.equal(shouldResetEnemyTracking('ally:1', 'ally:2'), true);
  assert.equal(shouldResetEnemyTracking('ally:2', 'ally:2'), false);
  assert.equal(shouldResetEnemyTracking('ally:1', null), true);
  assert.equal(shouldResetEnemyTracking(null, 'player'), true);
  const trackingIds = [null, 'player', 'ally:1'] as const;
  for (const previous of trackingIds) {
    for (const next of trackingIds) {
      assert.equal(shouldResetEnemyTracking(previous, next), previous !== next);
    }
  }
});

void test('armor purchases preserve classic prices and upgrade transitions', () => {
  assert.deepEqual(EQUIPMENT_PRICES, {
    kevlar: 650,
    helmet: 350,
    assaultSuit: 1000,
    defuseKit: 200,
    grenade: 300,
    smoke: 300,
    flash: 200,
  });
  assert.deepEqual(
    resolveArmorPurchase({
      money: 650,
      armor: 25,
      helmet: false,
      kind: 'kevlar',
    }),
    {
      purchased: true,
      reason: 'purchased',
      cost: 650,
      money: 0,
      armor: 100,
      helmet: false,
    },
  );
  assert.equal(
    resolveArmorPurchase({
      money: 649,
      armor: 25,
      helmet: false,
      kind: 'kevlar',
    }).reason,
    'insufficient-funds',
  );
  assert.deepEqual(
    resolveArmorPurchase({
      money: 350,
      armor: 100,
      helmet: false,
      kind: 'assault-suit',
    }),
    {
      purchased: true,
      reason: 'purchased',
      cost: 350,
      money: 0,
      armor: 100,
      helmet: true,
    },
  );
  assert.equal(
    resolveArmorPurchase({
      money: 349,
      armor: 100,
      helmet: false,
      kind: 'assault-suit',
    }).reason,
    'insufficient-funds',
  );
  assert.deepEqual(
    resolveArmorPurchase({
      money: 1000,
      armor: 35,
      helmet: false,
      kind: 'assault-suit',
    }),
    {
      purchased: true,
      reason: 'purchased',
      cost: 1000,
      money: 0,
      armor: 100,
      helmet: true,
    },
  );
  assert.deepEqual(
    resolveArmorPurchase({
      money: 650,
      armor: 35,
      helmet: true,
      kind: 'assault-suit',
    }),
    {
      purchased: true,
      reason: 'purchased',
      cost: 650,
      money: 0,
      armor: 100,
      helmet: true,
    },
  );
  assert.equal(
    resolveArmorPurchase({
      money: 999,
      armor: 0,
      helmet: false,
      kind: 'assault-suit',
    }).reason,
    'insufficient-funds',
  );
  assert.equal(
    resolveArmorPurchase({
      money: 16_000,
      armor: 100,
      helmet: true,
      kind: 'assault-suit',
    }).reason,
    'already-equipped',
  );
});

void test('defuse-kit purchase is CT-only and charges the classic price', () => {
  assert.deepEqual(
    resolveDefuseKitPurchase({
      side: 'ct',
      money: 200,
      hasDefuseKit: false,
    }),
    {
      purchased: true,
      reason: 'purchased',
      cost: 200,
      money: 0,
      hasDefuseKit: true,
    },
  );
  assert.equal(
    resolveDefuseKitPurchase({
      side: 't',
      money: 16_000,
      hasDefuseKit: false,
    }).reason,
    'wrong-side',
  );
  assert.equal(
    resolveDefuseKitPurchase({
      side: 'ct',
      money: 199,
      hasDefuseKit: false,
    }).reason,
    'insufficient-funds',
  );
  assert.equal(
    resolveDefuseKitPurchase({
      side: 'ct',
      money: 16_000,
      hasDefuseKit: true,
    }).reason,
    'already-equipped',
  );
});

void test('classic armor applies weapon ratios only to protected hitgroups', () => {
  assert.deepEqual(FIREARM_ARMOR_RATIO_MULTIPLIERS, {
    rifle: 1.55,
    carbine: 1.4,
    smg: 1,
    shotgun: 1,
    sniper: 1.95,
    glock18: 1.05,
    usp: 1,
    p228: 1.25,
    deagle: 1.5,
    elite: 1.05,
    fiveseven: 1.5,
  });
  const unarmored = applyArmorDamage({
    health: 100,
    armor: 0,
    helmet: false,
    rawDamage: 36,
    source: 'bullet',
    weapon: 'rifle',
    hitGroup: 'torso',
  });
  assert.deepEqual(unarmored, {
    health: 64,
    armor: 0,
    helmet: false,
    healthDamage: 36,
    armorDamage: 0,
  });
  const armoredRifle = applyArmorDamage({
    health: 100,
    armor: 100,
    helmet: false,
    rawDamage: 36,
    source: 'bullet',
    weapon: 'rifle',
    hitGroup: 'torso',
  });
  assert.ok(Math.abs(armoredRifle.health - 72.1) < 0.0001);
  assert.ok(Math.abs(armoredRifle.armor - 95.95) < 0.0001);
  const armoredSmg = applyArmorDamage({
    health: 100,
    armor: 100,
    helmet: false,
    rawDamage: 36,
    source: 'bullet',
    weapon: 'smg',
    hitGroup: 'torso',
  });
  assert.equal(armoredSmg.health, 82);
  assert.equal(armoredSmg.armor, 91);
  assert.ok(armoredRifle.health < armoredSmg.health);
});

void test('helmet protects only heads while Kevlar excludes legs', () => {
  const bullet = {
    health: 100,
    armor: 100,
    rawDamage: 40,
    source: 'bullet' as const,
    weapon: 'smg' as const,
  };
  assert.equal(
    applyArmorDamage({ ...bullet, helmet: false, hitGroup: 'head' }).health,
    60,
  );
  assert.equal(
    applyArmorDamage({ ...bullet, helmet: true, hitGroup: 'head' }).health,
    80,
  );
  assert.equal(
    applyArmorDamage({ ...bullet, helmet: true, hitGroup: 'leg' }).health,
    60,
  );
  assert.equal(
    applyArmorDamage({ ...bullet, helmet: false, hitGroup: 'stomach' }).health,
    80,
  );
});

void test('armor depletion uses distinct bullet and explosion semantics', () => {
  const bullet = applyArmorDamage({
    health: 100,
    armor: 5,
    helmet: true,
    rawDamage: 40,
    source: 'bullet',
    weapon: 'smg',
    hitGroup: 'head',
  });
  assert.deepEqual(bullet, {
    health: 70,
    armor: 0,
    helmet: false,
    healthDamage: 30,
    armorDamage: 5,
  });
  const explosion = applyArmorDamage({
    health: 100,
    armor: 5,
    helmet: true,
    rawDamage: 40,
    source: 'explosion',
  });
  assert.deepEqual(explosion, {
    health: 65,
    armor: 0,
    helmet: false,
    healthDamage: 35,
    armorDamage: 5,
  });
});

void test('full armor uses the dedicated classic explosion formula', () => {
  assert.deepEqual(
    applyArmorDamage({
      health: 100,
      armor: 100,
      helmet: true,
      rawDamage: 40,
      source: 'explosion',
    }),
    {
      health: 80,
      armor: 90,
      helmet: true,
      healthDamage: 20,
      armorDamage: 10,
    },
  );
});

void test('armor damage sanitizes invalid values without going negative', () => {
  for (const rawDamage of [-10, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.deepEqual(
      applyArmorDamage({
        health: 100,
        armor: 50,
        helmet: true,
        rawDamage,
        source: 'explosion',
      }),
      {
        health: 100,
        armor: 50,
        helmet: true,
        healthDamage: 0,
        armorDamage: 0,
      },
    );
  }
  assert.equal(
    applyArmorDamage({
      health: 2,
      armor: 0,
      helmet: true,
      rawDamage: 10,
      source: 'explosion',
    }).health,
    0,
  );
});

void test('hostile bullet tagging briefly reduces grounded movement', () => {
  assert.equal(applyPlayerDamageTag(0, 0), 0);
  assert.equal(applyPlayerDamageTag(0.2, -10), 0.2);
  assert.equal(applyPlayerDamageTag(0.2, Number.NaN), 0.2);
  assert.equal(applyPlayerDamageTag(0.2, Number.POSITIVE_INFINITY), 0.2);

  const smgTag = applyPlayerDamageTag(0, 12);
  const rifleTag = applyPlayerDamageTag(0, 22);
  const shotgunTag = applyPlayerDamageTag(0, 32);
  const sniperTag = applyPlayerDamageTag(0, 70);
  assert.ok(Math.abs(smgTag - 0.172) < 0.0001);
  assert.ok(Math.abs(rifleTag - 0.232) < 0.0001);
  assert.ok(Math.abs(shotgunTag - 0.292) < 0.0001);
  assert.equal(sniperTag, MAX_PLAYER_DAMAGE_TAG);
  assert.equal(getPlayerDamageTagSpeedMultiplier(sniperTag, true), 0.6);
  assert.equal(getPlayerDamageTagSpeedMultiplier(sniperTag, false), 1);

  assert.equal(applyPlayerDamageTag(rifleTag, 5), rifleTag);
  assert.ok(applyPlayerDamageTag(rifleTag, 40) > rifleTag);
  const decayed = decayPlayerDamageTag(sniperTag, 0.25);
  assert.ok(decayed < sniperTag);
  assert.equal(decayPlayerDamageTag(decayed, 10), 0);
  assert.equal(decayPlayerDamageTag(sniperTag, 0), sniperTag);
  assert.equal(decayPlayerDamageTag(sniperTag, -1), sniperTag);
  assert.equal(decayPlayerDamageTag(sniperTag, Number.NaN), sniperTag);

  const rifleSpeed = getWeaponMoveSpeed({
    weapon: 'rifle',
    walking: false,
    crouching: false,
    scoped: false,
  });
  const taggedSpeed =
    rifleSpeed * getPlayerDamageTagSpeedMultiplier(rifleTag, true);
  assert.ok(taggedSpeed < rifleSpeed);
  assert.ok(taggedSpeed >= rifleSpeed * 0.6);
});

void test('incoming health damage creates bounded short-lived suppression', () => {
  assert.equal(applyDamageSuppression(0, 0), 0);
  assert.equal(applyDamageSuppression(0.04, -10), 0.04);
  assert.equal(applyDamageSuppression(0.04, Number.NaN), 0.04);
  assert.ok(applyDamageSuppression(0, 40) > applyDamageSuppression(0, 5));
  assert.equal(applyDamageSuppression(0.1, 100), MAX_DAMAGE_SUPPRESSION);

  const unarmored = applyArmorDamage({
    health: 100,
    armor: 0,
    helmet: false,
    rawDamage: 30,
    source: 'bullet',
    weapon: 'smg',
    hitGroup: 'torso',
  });
  const armored = applyArmorDamage({
    health: 100,
    armor: 100,
    helmet: false,
    rawDamage: 30,
    source: 'bullet',
    weapon: 'smg',
    hitGroup: 'torso',
  });
  assert.ok(
    applyDamageSuppression(0, 100 - armored.health) <
      applyDamageSuppression(0, 100 - unarmored.health),
  );

  const initial = applyDamageSuppression(0, 30);
  const decayed = decayDamageSuppression(initial, 0.25);
  assert.ok(decayed < initial);
  assert.equal(decayDamageSuppression(decayed, 10), 0);
  assert.equal(decayDamageSuppression(initial, -1), initial);
});

void test('crosshair display stays bounded for source cone values', () => {
  assert.equal(getCrosshairGap(-1),5);
  assert.equal(getCrosshairGap(0),5);
  assert.equal(getCrosshairGap(.01),7.6);
  assert.equal(getCrosshairGap(1),22);
});
