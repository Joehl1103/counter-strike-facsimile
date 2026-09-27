import type { ActualRoundStartStatus } from './actual-round-start.ts';
import type { MatchTeam, RoundEndEvent, Side } from './game-rules.ts';

/** Explicit local fixtures exercise lifecycle effects, not combat or action duration. */
export function isMatchLifecycleQaEnabled(search: string, hostname: string): boolean {
  return (hostname === 'localhost' || hostname === '127.0.0.1') &&
    new URLSearchParams(search).get('lifecycle-qa') === '1';
}

export interface LifecycleSnapshot {
  status: ActualRoundStartStatus;
  scores: { player: number; opponent: number };
  side: Side;
  losses: { player: number; opponent: number };
  bank: number;
  botBanks: number[];
  bomb: string;
  bombVisible: boolean;
  preparationPending: boolean;
  receiptRound: number | null;
  health: number;
  speed: number;
  crouched: boolean;
  blind: boolean;
  pressedKeys: number;
  explosions: number;
  roundSeconds: number;
  freezeSeconds: number;
  secondary: string | null;
  magazine: number;
  reserve: number;
}

export interface LifecyclePageAdapter {
  startMatch(): void;
  snapshot(): LifecycleSnapshot;
  resolve(event: RoundEndEvent): void;
  plant(): void;
  detonate(): void;
  defuse(): void;
  dirtyResetState(): void;
  wait(milliseconds: number): Promise<void>;
  now(): number;
}

export interface LifecycleCheckpoint {
  scenario: string;
  round: number;
  stage: 'result' | 'duplicate' | 'prepared' | 'terminal';
  elapsedMs?: number;
  state: LifecycleSnapshot;
}

export interface LifecycleReport {
  status: 'running' | 'passed' | 'failed';
  progress: string;
  checks: number;
  checkpoints: LifecycleCheckpoint[];
  error?: string;
}

// The losing team's last win precedes the winning team's match point. This
// keeps every fixture legal and prevents accidentally ending a match early.
const alternatingRegulation: MatchTeam[] = Array.from({ length: 30 },
  (_, round) => round % 2 === 0 ? 'opponent' : 'player');

export const MATCH_LIFECYCLE_SCENARIOS: ReadonlyArray<{
  name: string;
  winners: readonly MatchTeam[];
  finalScore: readonly [number, number];
}> = [
  {
    name: 'regulation-16-14',
    winners: [...alternatingRegulation.slice(0, 28), 'player', 'player'],
    finalScore: [16, 14],
  },
  {
    name: 'mr3-19-17',
    winners: [...alternatingRegulation, 'player', 'player', 'player', 'opponent', 'opponent', 'player'],
    finalScore: [19, 17],
  },
  {
    name: 'repeat-overtime-20-22',
    winners: [...alternatingRegulation,
      'player', 'player', 'player', 'opponent', 'opponent', 'opponent',
      'opponent', 'opponent', 'opponent', 'player', 'player', 'opponent'],
    finalScore: [20, 22],
  },
];

export async function runMatchLifecycleReplay(
  page: LifecyclePageAdapter,
  publish: (report: LifecycleReport) => void,
): Promise<LifecycleReport> {
  const report: LifecycleReport = {
    status: 'running', progress: 'Starting production lifecycle replay', checks: 0, checkpoints: [],
  };
  const check = (condition: boolean, description: string) => {
    if (!condition) throw new Error(`${report.progress}: ${description}`);
    report.checks += 1;
  };
  const publishProgress = () => publish({ ...report, checkpoints: [...report.checkpoints] });

  try {
    for (const scenario of MATCH_LIFECYCLE_SCENARIOS) {
      report.progress = `${scenario.name}: start`;
      page.startMatch();
      const initial = page.snapshot();
      check(initial.status === 'active' && initial.scores.player === 0 &&
        initial.scores.opponent === 0 && initial.side === 'ct' && initial.bank === 800,
      'new match must start at CT, 0–0 and $800');
      const expectedScore = { player: 0, opponent: 0 };

      for (const [roundIndex, winner] of scenario.winners.entries()) {
        const round = roundIndex + 1;
        report.progress = `${scenario.name}: round ${round}/${scenario.winners.length}`;
        const before = page.snapshot();
        const winningSide = winner === 'player' ? before.side : before.side === 'ct' ? 't' : 'ct';
        const event: RoundEndEvent = winningSide === 'ct' ? 't-eliminated' : 'ct-eliminated';
        const resultStarted = page.now();

        // Both objective probes are part of the first regulation fixture, so
        // the next scenario still starts through a genuine terminal match.
        if (scenario.name === 'regulation-16-14' && round <= 2) {
          page.plant();
          page.resolve('t-eliminated');
          page.resolve('time-expired');
          const planted = page.snapshot();
          check(planted.status === 'active' && planted.bomb === 'planted' &&
            JSON.stringify(planted.scores) === JSON.stringify(before.scores),
          'planted bomb must survive T elimination and round time expiry');
          if (round === 1) page.detonate();
          else page.defuse();
        } else {
          page.resolve(event);
        }

        expectedScore[winner] += 1;
        const result = page.snapshot();
        check(result.scores.player === expectedScore.player &&
          result.scores.opponent === expectedScore.opponent && result.receiptRound === round,
        'settlement must record exactly one round and its receipt');
        const isTerminal = round === scenario.winners.length;
        check(result.status === (isTerminal
          ? winner === 'player' ? 'match-won' : 'match-lost'
          : winner === 'player' ? 'round-won' : 'round-lost'), 'result status');
        check(result.preparationPending === !isTerminal, 'only nonterminal results schedule preparation');
        report.checkpoints.push({ scenario: scenario.name, round, stage: 'result', state: result });

        page.resolve(event);
        const duplicate = page.snapshot();
        check(JSON.stringify(duplicate) === JSON.stringify(result),
          'duplicate result must not change score, money, receipt or pending preparation');
        report.checkpoints.push({ scenario: scenario.name, round, stage: 'duplicate', state: duplicate });
        publishProgress();

        if (isTerminal) {
          await page.wait(3200);
          const terminal = page.snapshot();
          check(terminal.status === result.status && !terminal.preparationPending &&
            JSON.stringify(terminal.scores) === JSON.stringify(result.scores),
          'terminal match must remain terminal beyond the result timer');
          check(terminal.scores.player === scenario.finalScore[0] &&
            terminal.scores.opponent === scenario.finalScore[1], 'fixture final score');
          report.checkpoints.push({ scenario: scenario.name, round, stage: 'terminal', state: terminal });
          continue;
        }

        // Seed only after settlement to test resetRound rather than endRound's
        // input cleanup. These are explicit fixture states in a paused game.
        page.dirtyResetState();
        const dirty = page.snapshot();
        check(dirty.health === 37 && dirty.speed > 0 && dirty.crouched &&
          dirty.blind && dirty.pressedKeys > 0, 'reset fixture must actually be dirty');
        while (page.snapshot().status !== 'active' && page.now() - resultStarted < 10000) {
          await page.wait(50);
        }
        const prepared = page.snapshot();
        const elapsedMs = page.now() - resultStarted;
        check(prepared.status === 'active' && !prepared.preparationPending && elapsedMs >= 2900,
          'real result timer must prepare the next round');
        check(prepared.receiptRound === round, 'preparation must preserve the completed receipt');
        check(prepared.health === 100 && prepared.speed === 0 && !prepared.crouched &&
          !prepared.blind && prepared.pressedKeys === 0 && prepared.explosions === 0,
        'preparation must clear damaged movement, blindness, input and explosion state');
        check(prepared.roundSeconds === 105 && prepared.freezeSeconds === 5, 'fresh round and freeze clocks');

        const expectedSide: Side = round < 15 ? 'ct' : round < 33 ? 't' : round < 39 ? 'ct' : 't';
        check(prepared.side === expectedSide, 'physical side after halftime/overtime boundary');
        const economyBoundary = round === 15 || (round >= 30 && round % 3 === 0);
        if (economyBoundary) {
          check(prepared.bank === (round === 15 ? 800 : 10000) &&
            prepared.losses.player === 0 && prepared.losses.opponent === 0,
          'half/overtime reset must restore starting money and loss streaks');
          check(prepared.secondary === (expectedSide === 'ct' ? 'usp' : 'glock18') &&
            prepared.magazine === (expectedSide === 'ct' ? 12 : 20), 'side starter inventory');
        } else {
          check(prepared.bank === result.bank, 'ordinary preparation must preserve the settled bank');
          check(prepared.secondary === result.secondary && prepared.magazine === result.magazine &&
            prepared.reserve === result.reserve, 'survivor ammunition must persist');
        }
        report.checkpoints.push({ scenario: scenario.name, round, stage: 'prepared', elapsedMs, state: prepared });
        publishProgress();
      }
    }
    report.status = 'passed';
    report.progress = '108 results completed through production settlement and real timers';
  } catch (error) {
    report.status = 'failed';
    report.error = error instanceof Error ? error.message : String(error);
  }
  publishProgress();
  return report;
}
