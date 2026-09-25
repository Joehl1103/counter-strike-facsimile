const ISSUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const MAX_TITLE_LENGTH = 300;
const MAX_INSTRUCTIONS_LENGTH = 8_000;
const MAX_REASON_LENGTH = 1_000;
const MAX_OWNED_FILES = 50;
const MAX_PATH_LENGTH = 500;

function safeErrorMessage(error) {
  let message;
  if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }

  const cleanedMessage = message.replace(/[\u0000-\u001f\u007f]/g, " ").trim();

  if (cleanedMessage.length === 0) {
    return "Unknown error.";
  }

  return cleanedMessage.slice(0, 500);
}

function copyRuns(runs) {
  return structuredClone(runs);
}

function validateTask(task) {
  if (task === null || typeof task !== "object" || Array.isArray(task)) {
    throw new Error("The planner returned an invalid task.");
  }

  if (typeof task.issueId !== "string" || !ISSUE_ID_PATTERN.test(task.issueId)) {
    throw new Error("The planner returned an invalid issue ID.");
  }

  const hasValidTitle = typeof task.title === "string"
    && task.title.trim().length > 0
    && task.title.length <= MAX_TITLE_LENGTH;
  if (!hasValidTitle) {
    throw new Error("The planner returned an invalid task title.");
  }

  const haveValidInstructions = typeof task.instructions === "string"
    && task.instructions.trim().length > 0
    && task.instructions.length <= MAX_INSTRUCTIONS_LENGTH;
  if (!haveValidInstructions) {
    throw new Error("The planner returned invalid task instructions.");
  }

  const hasValidOwnedFiles = Array.isArray(task.ownedFiles)
    && task.ownedFiles.length > 0
    && task.ownedFiles.length <= MAX_OWNED_FILES;
  if (!hasValidOwnedFiles) {
    throw new Error("The planner returned an invalid owned-files list.");
  }

  const ownedFiles = [];
  for (const filePath of task.ownedFiles) {
    const isValidPathText = typeof filePath === "string"
      && filePath.trim().length > 0
      && filePath.length <= MAX_PATH_LENGTH;
    if (!isValidPathText) {
      throw new Error("The planner returned an invalid owned file path.");
    }

    const relativePath = filePath.trim();
    const pathParts = relativePath.split(/[\\/]/);
    const isAbsolutePath = relativePath.startsWith("/")
      || relativePath.startsWith("\\")
      || /^[A-Za-z]:[\\/]/.test(relativePath);
    const escapesParentDirectory = pathParts.includes("..");

    if (isAbsolutePath || escapesParentDirectory) {
      throw new Error("The planner returned an owned file path outside the project.");
    }

    ownedFiles.push(relativePath);
  }

  return {
    issueId: task.issueId,
    title: task.title.trim(),
    instructions: task.instructions.trim(),
    ownedFiles,
  };
}

export class FactoryEngine {
  constructor({ plan, launch, save, initialRuns = [], clock = () => new Date().toISOString() }) {
    if (typeof plan !== "function" || typeof launch !== "function" || typeof save !== "function") {
      throw new TypeError("FactoryEngine requires plan, launch, and save functions.");
    }

    if (typeof clock !== "function") {
      throw new TypeError("FactoryEngine clock must be a function.");
    }

    if (!Array.isArray(initialRuns)) {
      throw new TypeError("initialRuns must be an array.");
    }

    this.plan = plan;
    this.launch = launch;
    this.save = save;
    this.clock = clock;
    this.epoch = 0;
    this.planningPromise = null;
    this.state = {
      enabled: false,
      planning: false,
      runs: copyRuns(initialRuns),
      message: "Factory is Off.",
      updatedAt: this.clock(),
    };
  }

  snapshot() {
    return {
      enabled: this.state.enabled,
      planning: this.state.planning,
      runs: copyRuns(this.state.runs),
      message: this.state.message,
      updatedAt: this.state.updatedAt,
    };
  }

  setEnabled(enabled) {
    if (typeof enabled !== "boolean") {
      throw new TypeError("enabled must be a boolean.");
    }

    if (enabled === this.state.enabled) {
      return this.snapshot();
    }

    if (!enabled) {
      this.epoch += 1;
    }

    this.state.enabled = enabled;
    if (enabled) {
      this.state.message = "Factory is On.";
    } else {
      this.state.message = "Factory is Off; active workers will finish.";
    }
    this.touch();
    this.persistOrFailClosed();

    return this.snapshot();
  }

  tick() {
    if (this.planningPromise !== null) {
      return this.planningPromise;
    }

    if (!this.state.enabled || this.hasRunningWork()) {
      return Promise.resolve(this.snapshot());
    }

    const planningEpoch = this.epoch;
    this.state.planning = true;
    this.state.message = "Coordinator is selecting the next task.";
    this.touch();

    if (!this.persistOrFailClosed()) {
      this.state.planning = false;
      return Promise.resolve(this.snapshot());
    }

    const planningPromise = this.planAndMaybeLaunch(planningEpoch);
    this.planningPromise = planningPromise;

    return planningPromise;
  }

  finishRun(id, result) {
    const allowedStatuses = new Set(["completed", "blocked", "failed", "interrupted"]);
    if (typeof id !== "string" || !allowedStatuses.has(result?.status)) {
      throw new TypeError("finishRun requires a run ID and a terminal status.");
    }

    const matchingRunIndexes = [];
    for (const [index, run] of this.state.runs.entries()) {
      if (run.id === id) {
        matchingRunIndexes.push(index);
      }
    }

    if (matchingRunIndexes.length > 1) {
      throw new Error(`Run ID is ambiguous: ${id}`);
    }

    const runIndex = matchingRunIndexes[0] ?? -1;
    if (runIndex < 0) {
      throw new Error(`Unknown run: ${id}`);
    }

    const currentRun = this.state.runs[runIndex];
    if (currentRun.status !== "running" && currentRun.status !== "launching") {
      return this.snapshot();
    }

    const updatedRun = {
      ...currentRun,
      ...result,
      id: currentRun.id,
      issueId: currentRun.issueId,
      title: currentRun.title,
      status: result.status,
      finishedAt: this.clock(),
    };

    this.state.runs[runIndex] = updatedRun;
    if (result.message) {
      this.state.message = safeErrorMessage(result.message);
    } else {
      this.state.message = `Task ${id} ${result.status}.`;
    }
    this.touch();
    this.persistOrFailClosed();

    return this.snapshot();
  }

  async planAndMaybeLaunch(planningEpoch) {
    try {
      const result = await this.plan({ runs: this.snapshot().runs });

      if (!this.canUsePlan(planningEpoch)) {
        return this.snapshot();
      }

      if (result === null || typeof result !== "object" || Array.isArray(result)) {
        throw new Error("The planner returned an invalid response.");
      }

      if (result.task === null) {
        if (typeof result.reason === "string" && result.reason.trim().length > 0) {
          this.state.message = safeErrorMessage(result.reason).slice(0, MAX_REASON_LENGTH);
        } else {
          this.state.message = "Coordinator found no eligible task.";
        }
        return this.snapshot();
      }

      const task = validateTask(result.task);
      if (this.hasAttemptedIssue(task.issueId)) {
        throw new Error(`The planner selected ${task.issueId}, which already has a recorded run.`);
      }

      if (this.hasRunningWork()) {
        return this.snapshot();
      }

      const reservation = {
        id: `reservation-${task.issueId}-${this.clock()}`,
        issueId: task.issueId,
        title: task.title,
        status: "launching",
        startedAt: this.clock(),
      };

      this.state.runs.push(reservation);
      this.state.message = `Reserved ${task.issueId}; starting its worker.`;
      this.touch();

      if (!this.persistOrFailClosed()) {
        reservation.status = "failed";
        reservation.finishedAt = this.clock();
        reservation.message = this.state.message;
        return this.snapshot();
      }

      if (!this.canUsePlan(planningEpoch)) {
        return this.snapshot();
      }

      let launchedRun;
      try {
        launchedRun = this.launch(task);
      } catch (error) {
        this.markLaunchFailed(reservation.id, error);
        return this.snapshot();
      }

      if (launchedRun === null || typeof launchedRun !== "object" || Array.isArray(launchedRun)) {
        this.markLaunchFailed(reservation.id, new Error("Worker launcher returned an invalid run."));
        return this.snapshot();
      }

      if (typeof launchedRun.id !== "string" || launchedRun.id.trim().length === 0) {
        this.markLaunchFailed(reservation.id, new Error("Worker launcher returned an invalid run ID."));
        return this.snapshot();
      }

      const hasDuplicateRunId = this.state.runs.some((existingRun) => existingRun.id === launchedRun.id);
      if (hasDuplicateRunId) {
        this.markLaunchFailed(reservation.id, new Error("Worker launcher returned a duplicate run ID."));
        return this.snapshot();
      }

      const run = {
        ...launchedRun,
        issueId: task.issueId,
        title: task.title,
        status: "running",
        startedAt: launchedRun.startedAt ?? reservation.startedAt,
      };
      const reservationIndex = this.state.runs.findIndex((existingRun) => {
        return existingRun.id === reservation.id;
      });
      if (reservationIndex < 0) {
        throw new Error("The worker reservation disappeared before launch was recorded.");
      }

      this.state.runs[reservationIndex] = run;
      this.state.message = `Worker started for ${task.issueId}.`;
      this.touch();
      this.persistOrFailClosed();

      return this.snapshot();
    } catch (error) {
      if (this.canUsePlan(planningEpoch)) {
        this.state.enabled = false;
        this.state.message = `Dispatch stopped: ${safeErrorMessage(error)}`;
        this.touch();
        this.persistOrFailClosed();
      }

      return this.snapshot();
    } finally {
      this.state.planning = false;
      this.planningPromise = null;
      this.touch();
      this.persistOrFailClosed();
    }
  }

  markLaunchFailed(runId, error) {
    const run = this.state.runs.find((candidate) => candidate.id === runId);
    if (run !== undefined) {
      run.status = "failed";
      run.finishedAt = this.clock();
      run.message = `Worker launch failed: ${safeErrorMessage(error)}`;
    }

    this.state.enabled = false;
    this.state.message = `Dispatch stopped: ${safeErrorMessage(error)}`;
    this.touch();
    this.persistOrFailClosed();
  }

  canUsePlan(planningEpoch) {
    return this.state.enabled && this.epoch === planningEpoch;
  }

  hasAttemptedIssue(issueId) {
    for (const run of this.state.runs) {
      if (run.issueId === issueId) {
        return true;
      }
    }

    return false;
  }

  hasRunningWork() {
    return this.state.runs.some((run) => run.status === "running" || run.status === "launching");
  }

  touch() {
    this.state.updatedAt = this.clock();
  }

  persistOrFailClosed() {
    try {
      this.save(this.snapshot());
      return true;
    } catch (error) {
      this.state.enabled = false;
      this.state.message = `Dispatch stopped because state could not be saved: ${safeErrorMessage(error)}`;
      this.touch();
      return false;
    }
  }
}
