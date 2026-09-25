import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { getWeaponMoveSpeed, stepHorizontalVelocity } from '../app/game-rules.ts';

export const RATES = [30, 60, 144] as const;

// Isolated production velocity function; no claim to exercise browser collision,
// vertical movement, input handling, or the full game loop.
export function measureMovement(rate: number) {
  if (!Number.isInteger(rate) || rate < 20 || rate > 1000) {
    throw new Error('Rate must be an integer between 20 and 1000 Hz');
  }
  const dt = 1 / rate;
  const maxSpeed = getWeaponMoveSpeed({
    weapon: 'rifle', walking: false, crouching: false, scoped: false,
  });
  let velocity = { x: 0, z: 0 };
  let distance = 0;
  let runDistance = 0;
  let fullSpeedSeconds: number | null = null;
  let releaseSeconds: number | null = null;
  const samples = [];
  for (let step = 1; step <= 2 * rate; step++) {
    const running = step <= rate;
    velocity = stepHorizontalVelocity({
      velocity, wishDirection: { x: 0, z: running ? -1 : 0 },
      maxSpeed, dtSeconds: dt, grounded: true,
    });
    const speed = Math.hypot(velocity.x, velocity.z);
    distance += speed * dt;
    if (running && speed === maxSpeed && fullSpeedSeconds === null) {
      fullSpeedSeconds = step / rate;
    }
    if (step === rate) runDistance = distance;
    if (!running && speed === 0 && releaseSeconds === null) {
      releaseSeconds = (step - rate) / rate;
    }
    samples.push({ timeSeconds: step / rate, phase: running ? 'run' : 'release',
      velocity: { ...velocity }, speed, distance });
  }
  return { rateHz: rate, maxSpeed, runDistance, releaseDistance: distance - runDistance,
    fullSpeedSeconds, releaseSeconds, samples };
}

export function movementReport() {
  const rows = RATES.map(measureMovement);
  const base = rows[2];
  const hash = (relativePath: string) => createHash('sha256')
    .update(readFileSync(new URL(relativePath, import.meta.url))).digest('hex');
  return {
    schemaVersion: 1,
    kind: 'current-build-isolated-horizontal-velocity',
    referenceStatus: 'unmeasured',
    fidelityVerdict: 'unverified',
    sources: { 'app/game-rules.ts': hash('../app/game-rules.ts'),
      'scripts/measure-movement.ts': hash('./measure-movement.ts') },
    setup: { weapon: 'rifle', grounded: true, runSeconds: 1, releaseSeconds: 1,
      units: { distance: 'scene units', speed: 'scene units/second', time: 'seconds' },
      originalUnitConversion: null, collision: false, seed: null },
    rows,
    differencesFrom144Hz: rows.map(row => ({ rateHz: row.rateHz,
      runDistance: row.runDistance - base.runDistance,
      releaseDistance: row.releaseDistance - base.releaseDistance })),
    limitations: ['Not a browser FPS measurement or full player simulation',
      'No original CS 1.6 measurements or fidelity tolerance',
      'No collision, jump, crouch, stairs, ceiling, or input-event coverage'],
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${JSON.stringify(movementReport(), null, 2)}\n`);
}
