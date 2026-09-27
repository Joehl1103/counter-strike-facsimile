/**
 * Deterministic test/integration helpers for movement presentation isolation.
 *
 * A caller supplies the authoritative step and a read-only presentation
 * callback. The runner executes the same input trace twice and reports any
 * change to fields that presentation must never own.
 *
 * This module intentionally has no renderer, clock, timer, or random source.
 */

export const MOVEMENT_PRESENTATION_TRACE_DELTAS = [
  1 / 30,
  1 / 60,
  1 / 120,
] as const;

export type MovementTraceKind = 'bot' | 'player';

export type MovementPosition = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

export type MovementVelocity = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

/** The authoritative channels that a presentation pass must not mutate. */
export type MovementAuthoritativeSnapshot = Readonly<{
  position: MovementPosition;
  velocity: MovementVelocity;
  yawRadians: number;
  fireTimeMs: number | null;
  objectiveTimeMs: number | null;
  footstepTimeMs: number | null;
  rng: Readonly<{
    /** Number of authoritative random draws consumed so far. */
    consumed: number;
    /** Optional deterministic generator state, retained for exact replay checks. */
    state?: unknown;
  }>;
}>;

export type MovementTraceSample<
  Snapshot extends MovementAuthoritativeSnapshot,
> = Readonly<{
  dtSeconds: number;
  authoritative: Snapshot;
}>;

export type MovementPresentationTrace<
  Snapshot extends MovementAuthoritativeSnapshot,
  Pose,
> = Readonly<{
  kind: MovementTraceKind;
  withoutPresentation: readonly MovementTraceSample<Snapshot>[];
  withPresentation: readonly MovementTraceSample<Snapshot>[];
  presentation: readonly Pose[];
}>;

export type MovementTraceStep<
  State,
  Snapshot extends MovementAuthoritativeSnapshot,
> = (
  state: State,
  dtSeconds: number,
  frameIndex: number,
) => Readonly<{
  state: State;
  authoritative: Snapshot;
}>;

export type MovementPresentationTraceOptions<
  State,
  Snapshot extends MovementAuthoritativeSnapshot,
  Pose,
> = Readonly<{
  kind: MovementTraceKind;
  initialState: State;
  dtSeconds: readonly number[];
  cloneState: (state: State) => State;
  stepAuthoritative: MovementTraceStep<State, Snapshot>;
  /** Receives a snapshot, never the mutable simulation state. */
  computePresentation: (
    authoritative: Snapshot,
    dtSeconds: number,
    frameIndex: number,
  ) => Pose;
}>;

export type MovementInvariantField =
  | 'position'
  | 'velocity'
  | 'yawRadians'
  | 'fireTimeMs'
  | 'objectiveTimeMs'
  | 'footstepTimeMs'
  | 'rng';

export type MovementInvariantDifference = Readonly<{
  frameIndex: number;
  field: MovementInvariantField;
  expected: unknown;
  actual: unknown;
}>;

export type MovementInvariantReport = Readonly<{
  kind: MovementTraceKind;
  frameCount: number;
  equal: boolean;
  differences: readonly MovementInvariantDifference[];
}>;

const AUTHORITATIVE_FIELDS: readonly MovementInvariantField[] = [
  'position',
  'velocity',
  'yawRadians',
  'fireTimeMs',
  'objectiveTimeMs',
  'footstepTimeMs',
  'rng',
];

function readAuthoritativeField(
  snapshot: MovementAuthoritativeSnapshot,
  field: MovementInvariantField,
): unknown {
  switch (field) {
    case 'position':
      return snapshot.position;
    case 'velocity':
      return snapshot.velocity;
    case 'yawRadians':
      return snapshot.yawRadians;
    case 'fireTimeMs':
      return snapshot.fireTimeMs;
    case 'objectiveTimeMs':
      return snapshot.objectiveTimeMs;
    case 'footstepTimeMs':
      return snapshot.footstepTimeMs;
    case 'rng':
      return snapshot.rng;
  }
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left !== typeof right || left === null || right === null)
    return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    return (
      left.length === right.length &&
      left.every((value, index) => valuesEqual(value, right[index]))
    );
  }
  if (typeof left !== 'object' || typeof right !== 'object') return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(rightRecord, key) &&
        valuesEqual(leftRecord[key], rightRecord[key]),
    )
  );
}

/** Execute one deterministic trace with and without the presentation callback. */
export function runMovementPresentationTrace<
  State,
  Snapshot extends MovementAuthoritativeSnapshot,
  Pose,
>(
  options: MovementPresentationTraceOptions<State, Snapshot, Pose>,
): MovementPresentationTrace<Snapshot, Pose> {
  const run = (includePresentation: boolean) => {
    let state = options.cloneState(options.initialState);
    const trace: MovementTraceSample<Snapshot>[] = [];
    const poses: Pose[] = [];

    options.dtSeconds.forEach((dtSeconds, frameIndex) => {
      const step = options.stepAuthoritative(state, dtSeconds, frameIndex);
      state = step.state;
      trace.push({ dtSeconds, authoritative: step.authoritative });
      if (includePresentation) {
        poses.push(
          options.computePresentation(
            step.authoritative,
            dtSeconds,
            frameIndex,
          ),
        );
      }
    });
    return { trace, poses };
  };

  const withoutPresentation = run(false);
  const withPresentation = run(true);
  return {
    kind: options.kind,
    withoutPresentation: withoutPresentation.trace,
    withPresentation: withPresentation.trace,
    presentation: withPresentation.poses,
  };
}

/** Compare the simulation-owned channels frame by frame. */
export function compareMovementPresentationTrace<
  Snapshot extends MovementAuthoritativeSnapshot,
  Pose,
>(trace: MovementPresentationTrace<Snapshot, Pose>): MovementInvariantReport {
  const frameCount = Math.max(
    trace.withoutPresentation.length,
    trace.withPresentation.length,
  );
  const differences: MovementInvariantDifference[] = [];

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const expectedSample = trace.withoutPresentation[frameIndex];
    const actualSample = trace.withPresentation[frameIndex];
    if (!expectedSample || !actualSample) {
      differences.push({
        frameIndex,
        field: 'position',
        expected: expectedSample?.authoritative,
        actual: actualSample?.authoritative,
      });
      continue;
    }
    if (!valuesEqual(expectedSample.dtSeconds, actualSample.dtSeconds)) {
      differences.push({
        frameIndex,
        field: 'position',
        expected: expectedSample.dtSeconds,
        actual: actualSample.dtSeconds,
      });
    }
    const expected = expectedSample.authoritative;
    const actual = actualSample.authoritative;
    for (const field of AUTHORITATIVE_FIELDS) {
      const expectedValue = readAuthoritativeField(expected, field);
      const actualValue = readAuthoritativeField(actual, field);
      if (!valuesEqual(expectedValue, actualValue)) {
        differences.push({
          frameIndex,
          field,
          expected: expectedValue,
          actual: actualValue,
        });
      }
    }
  }

  return {
    kind: trace.kind,
    frameCount,
    equal: differences.length === 0,
    differences,
  };
}

/** Throw a concise error for integration tests that require the invariant. */
export function assertMovementPresentationInvariant(
  report: MovementInvariantReport,
): void {
  if (report.equal) return;
  const details = report.differences
    .map(({ frameIndex, field }) => `frame ${frameIndex} ${field}`)
    .join(', ');
  throw new Error(
    `${report.kind} movement presentation changed authoritative trace: ${details}`,
  );
}

export function formatMovementInvariantReport(
  report: MovementInvariantReport,
): string {
  return report.equal
    ? `${report.kind}: ${report.frameCount} frames invariant`
    : `${report.kind}: ${report.differences.length} differences (${report.differences
        .map(({ frameIndex, field }) => `frame ${frameIndex} ${field}`)
        .join(', ')})`;
}
