import type { Side } from './game-rules.ts';

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** Select a starting side before ordinary match initialization, never mid-round. */
export function getLocalPlaytestSide(search: string, hostname: string): Side {
  const params = new URLSearchParams(search);
  return isLocalHost(hostname) && params.get('keyboard-playtest') === '1' &&
    params.get('playtest-side') === 't' ? 't' : 'ct';
}

export function isLocalFrameProfileEnabled(search: string, hostname: string): boolean {
  return isLocalHost(hostname) && new URLSearchParams(search).get('frame-profile') === '1';
}

export const FRAME_PROFILE_WARMUP_INTERVALS = 120;
export const FRAME_PROFILE_MEASURED_INTERVALS = 300;

export type FrameProfile = Readonly<{
  intervalsMs: readonly number[];
  meanFramesPerSecond: number;
  p95FrameMs: number;
  targetFramesPerSecond: 60;
  meetsTarget: boolean;
}>;

/** Observe real animation timestamps without changing or capping simulation time. */
export class LocalFrameProfileCollector {
  private previousTimestamp: number | null = null;
  private warmupIntervals = 0;
  private intervalsMs: number[] = [];
  private completed = false;

  observe(timestamp: number, eligible: boolean): FrameProfile | null {
    if (this.completed) return null;
    if (!eligible || !Number.isFinite(timestamp)) {
      this.previousTimestamp = null;
      return null;
    }
    const previousTimestamp = this.previousTimestamp;
    this.previousTimestamp = timestamp;
    if (previousTimestamp === null || timestamp <= previousTimestamp) return null;
    if (this.warmupIntervals < FRAME_PROFILE_WARMUP_INTERVALS) {
      this.warmupIntervals += 1;
      return null;
    }
    this.intervalsMs.push(timestamp - previousTimestamp);
    if (this.intervalsMs.length < FRAME_PROFILE_MEASURED_INTERVALS) return null;
    this.completed = true;
    const totalMs = this.intervalsMs.reduce((total, interval) => total + interval, 0);
    const sortedIntervals = [...this.intervalsMs].sort((first, second) => first - second);
    const meanFramesPerSecond = 1000 * this.intervalsMs.length / totalMs;
    return {
      intervalsMs: this.intervalsMs,
      meanFramesPerSecond,
      p95FrameMs: sortedIntervals[Math.ceil(sortedIntervals.length * 0.95) - 1],
      targetFramesPerSecond: 60,
      meetsTarget: meanFramesPerSecond >= 59.5,
    };
  }
}
