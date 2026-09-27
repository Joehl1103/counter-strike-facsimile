import { createMovementHarness as createPlayerMovement } from './player-movement-harness.ts';

import { MOVEMENT_STEP_SECONDS } from '../app/fixed-movement-clock.ts';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function replayFixedMovement(rate: number) {
  const movement = createPlayerMovement();
  const state = { position: { x: 0, y: 1.68, z: 0 }, velocity: { x: 0, z: 0 },
    verticalVelocity: 0, grounded: true, crouched: false, landingRecoverySeconds: 0 };
  let distance = 0;
  let runDistance = 0;
  let ticks = 0;
  for (let frame = 0; frame < rate * 2; frame++) {
    movement.advance(1 / rate, state, {
      wishDirection: { x: 0, z: frame < rate ? -1 : 0 },
      maxSpeed: 4.55, jumpMaxSpeed: 4.55, crouching: false,
    }, { boxes: [], ramps: [], floorHeight: 0, actorBlocks: () => false }, () => {
      distance += Math.hypot(state.velocity.x, state.velocity.z) * MOVEMENT_STEP_SECONDS;
      ticks++;
    });
    if (frame === rate - 1) runDistance = distance;
  }
  return { runDistance, releaseDistance: distance - runDistance, velocity: state.velocity, ticks };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify({
    kind: 'fixed-step-player-physics-horizontal-replay',
    originalFidelity: 'unverified',
    units: 'scene units; seconds',
    rows: [30, 60, 144].map(rateHz => ({ rateHz, ...replayFixedMovement(rateHz) })),
  }, null, 2));
}
