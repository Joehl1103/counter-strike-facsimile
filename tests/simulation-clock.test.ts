import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  createSimulationClock,
  createGameplayActions,
} from '../app/simulation-clock.ts';
import { createPlayerMovement } from '../app/player-physics.ts';
import { createPlayerInputTimeline } from '../app/player-input.ts';
import { createWeaponSpecialActions } from '../app/weapon-special-actions.ts';
import {
  advanceGrenadeFuse,
  advanceObjectiveProgress,
} from '../app/game-rules.ts';

function replay(rate: number) {
  const clock = createSimulationClock();
  const movement = createPlayerMovement();
  const inputs = createPlayerInputTimeline();
  const actions = createGameplayActions();
  const weapon = createWeaponSpecialActions();
  const world = {
    boxes: [],
    ramps: [],
    floorHeight: 0,
    actorBlocks: () => false,
  };
  const state = {
    position: { x: 0, y: 1.68, z: 0 },
    velocity: { x: 0, z: 0 },
    verticalVelocity: 0,
    grounded: true,
    crouched: false,
    landingRecoverySeconds: 0,
  };
  inputs.controls(0.013, {
    strafe: 0,
    forward: 1,
    yaw: 0,
    walking: false,
    crouching: false,
  });
  inputs.controls(0.927, {
    strafe: 0,
    forward: 0,
    yaw: 0,
    walking: false,
    crouching: false,
  });
  inputs.jump(0.483);
  actions.enqueue('secondary', 0);
  actions.enqueue('fire', 0.313);
  const shots: number[] = [];
  let ammo = 20,
    fuse = 1.5,
    objective = 0;
  const trace: unknown[] = [];
  for (let frame = 0; frame < rate * 2; frame++)
    clock.advance(1 / rate, (dt, start, end) => {
      const now = Math.round(end * 1000);
      actions.drain(end, (action) => {
        if (action === 'secondary') weapon.secondary('glock18', now);
        if (action === 'fire' && weapon.ready('glock18', now)) {
          ammo--;
          shots.push(now);
          weapon.committedShot('glock18', now);
        }
      });
      while (weapon.takeBurstShot(now, 'glock18', ammo)) {
        ammo--;
        shots.push(now);
      }
      const input = inputs.sample(start);
      movement.step(
        state,
        {
          wishDirection: { x: 0, z: -input.forward },
          maxSpeed: 4.55,
          jumpMaxSpeed: 4.55,
          crouching: input.crouching,
          jumpRequested: input.jumpRequested,
        },
        world,
      );
      fuse = advanceGrenadeFuse(fuse, dt);
      objective = advanceObjectiveProgress(objective, dt, 3, true);
      trace.push({
        time: end,
        position: { ...state.position },
        fuse,
        objective,
        ammo,
      });
    });
  return { trace, shots, ammo };
}

void test('shared production clock replays movement, burst, fuse and objective at 30/60/144 Hz', () => {
  const reference = replay(100);
  assert.equal(reference.trace.length, 200);
  assert.deepEqual(reference.shots, [320, 420, 520]);
  assert.equal(reference.ammo, 17);
  for (const rate of [30, 60, 144]) assert.deepEqual(replay(rate), reference);
});

void test('pause and round boundaries clear debt and actions without rewinding global time', () => {
  const clock = createSimulationClock();
  const actions = createGameplayActions();
  clock.advance(0.019, () => {});
  assert.equal(clock.getTimeSeconds(), 0.01);
  actions.enqueue('fire', 0.02);
  clock.resetDebt();
  actions.clear();
  assert.equal(
    clock.advance(0.001, () => assert.fail('pause debt')),
    0,
  );
  actions.drain(1, () => assert.fail('paused edge'));
  clock.advance(0.05, () => false);
  assert.equal(clock.getTimeSeconds(), 0.02);
  assert.equal(clock.getAlpha(), 0);
  assert.equal(
    clock.advance(0.05, () => {
      clock.resetDebt();
    }),
    1,
  );
  assert.equal(clock.getTimeSeconds(), 0.03);
  assert.equal(
    clock.advance(Infinity, () => assert.fail('invalid delta')),
    0,
  );
  assert.equal(
    clock.advance(5, () => {}),
    5,
  );
});

void test('page has one render boundary and one player step inside global gameplay tick', () => {
  const page = readFileSync(
    new URL('../app/page.tsx', import.meta.url),
    'utf8',
  );
  const start = page.indexOf('    const runSimulationTick =');
  const end = page.indexOf(
    '    scheduleNextFrame();\n    publishHud(0);',
    start,
  );
  const tick = page.slice(start, end);
  // The local toolkit has separate explicit renders; constrain this assertion
  // to the ordinary animation-frame loop, which still renders once.
  const frame = page.slice(page.indexOf('    const clock ='), page.indexOf('    // This developer-facing surface'));
  assert.equal((frame.match(/renderFrame\(/g) || []).length, 1);
  assert.doesNotMatch(
    tick,
    /renderFrame\(|scheduleNextFrame\(|playerMovement\.advance\(/,
  );
  for (const call of [
    'playerMovement.step(',
    'updateGrenadeSimulation(',
    'weaponSpecial.advance(',
    'advanceObjectiveProgress(',
    'enemies.forEach(',
    'allies.forEach(',
  ])
    assert.ok(tick.includes(call), call);
  assert.match(tick, /simulationNowMs = now/);
  assert.match(frame, /return status === 'active'/);
  assert.doesNotMatch(frame, /if \(!playerAlive\).*resetDebt/);
  for (const section of [
    ['const onKeyDown =', 'const onKeyUp ='],
    ['const onMouseDown =', 'const onMouseUp ='],
  ]) {
    const body = page.slice(page.indexOf(section[0]), page.indexOf(section[1]));
    assert.doesNotMatch(body, /\bshoot\(/);
    assert.match(body, /queueGameplayAction\('fire'\)/);
  }
});
