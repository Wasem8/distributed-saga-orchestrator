// src/services/SagaOrchestrator.ts

export type StepStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'compensating'
  | 'compensated'
  | 'compensation_failed'; // NEW: حالة منفصلة للـ critical case

export interface SagaStepUI {
  id: number;
  service: string;
  action: string;
  compensateLabel: string;
  status: StepStatus;
  log: string;
  durationMs?: number; // NEW: تتبع زمن كل step
  attempts?: number;   // NEW: عدد محاولات الـ retry
}

export interface SagaRunResult {
  success: boolean;
  sagaId: string;
  totalDurationMs: number;
  stepsExecuted: number;
  compensationsTriggered: number;
  compensationFailures: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Races a promise against a timeout.
 * Rejects with a descriptive error if the timeout fires first.
 */
function withTimeout<T>(fn: () => Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label} did not respond within ${ms}ms`)), ms)
    ),
  ]);
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class SagaTransactionOrchestrator {
  private steps: {
    service: string;
    execute: () => Promise<void>;
    compensate: () => Promise<void>;
  }[] = [];

  /** Unique ID generated per orchestrator instance — useful for distributed tracing */
  readonly sagaId: string = `SAGA-ID-${Math.floor(Math.random() * 90000) + 10000}`;

  private startTime = 0;

  /** Called whenever a step's status or log changes */
  onStepUpdate?: (stepIndex: number, status: StepStatus, log: string, meta?: { durationMs?: number; attempts?: number }) => void;

  /** Called for each log line to be shown in the console monitor */
  onLog?: (message: string) => void;

  registerStep(
    service: string,
    exec: () => Promise<void>,
    comp: () => Promise<void>
  ) {
    this.steps.push({ service, execute: exec, compensate: comp });
  }

  /**
   * Run the full saga transaction.
   *
   * Improvements over the original:
   * 1. Retry each step up to `maxRetries` times before triggering compensation.
   * 2. Wrap each execute/compensate call with a configurable timeout.
   * 3. Track per-step duration and attempt count.
   * 4. Distinguish `compensation_failed` from regular `failed`.
   * 5. Return a rich `SagaRunResult` instead of a plain boolean.
   */
  async runTransaction(options?: {
    maxRetries?: number;   // default: 1 — retry once before rolling back
    stepTimeoutMs?: number; // default: 6000ms per step
  }): Promise<SagaRunResult> {
    const maxRetries = options?.maxRetries ?? 1;
    const stepTimeoutMs = options?.stepTimeoutMs ?? 6000;

    this.startTime = Date.now();

    const executed: number[] = [];
    let compensationsTriggered = 0;
    let compensationFailures = 0;

    this.onLog?.(`[${this.sagaId}] Transaction started — ${this.steps.length} steps registered.`);

    // ── Forward pass ─────────────────────────────────────────────────────────
    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      let lastError: Error | null = null;
      let succeeded = false;

      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        const isRetry = attempt > 1;
        const runLabel = isRetry ? `Retry #${attempt - 1}...` : 'Executing local transaction...';

        this.onStepUpdate?.(i, 'running', runLabel, { attempts: attempt });

        if (isRetry) {
          this.onLog?.(`↻ Retry #${attempt - 1}: ${step.service}`);
        } else {
          this.onLog?.(`▶ Starting: ${step.service}`);
        }

        const stepStart = Date.now();

        try {
          await withTimeout(step.execute, stepTimeoutMs, step.service);
          const durationMs = Date.now() - stepStart;

          executed.push(i);
          this.onStepUpdate?.(i, 'success', `Completed ✅ (${durationMs}ms)`, { durationMs, attempts: attempt });
          this.onLog?.(`✅ Success: ${step.service} — ${durationMs}ms`);
          succeeded = true;
          break; // no need to retry
        } catch (err: unknown) {
          lastError = err instanceof Error ? err : new Error(String(err));
          const durationMs = Date.now() - stepStart;

          if (attempt <= maxRetries) {
            this.onStepUpdate?.(i, 'running', `Failed, retrying... (${lastError.message})`, { durationMs, attempts: attempt });
            // small back-off before retry
            await new Promise((r) => setTimeout(r, 400 * attempt));
          }
        }
      }

      // All retries exhausted — begin backward compensation
      if (!succeeded && lastError) {
        const errorMsg = lastError.message;
        this.onStepUpdate?.(i, 'failed', `Failed ❌ (${errorMsg})`);
        this.onLog?.(`❌ Failed: ${step.service} — ${errorMsg}`);
        this.onLog?.(`↩ Initiating backward compensation rollback...`);

        for (let j = executed.length - 1; j >= 0; j--) {
          const rollbackIndex = executed[j];
          const rollbackStep = this.steps[rollbackIndex];
          compensationsTriggered++;

          this.onStepUpdate?.(rollbackIndex, 'compensating', 'Rolling back local state...');
          this.onLog?.(`↩ Compensating: ${rollbackStep.service}`);

          const compStart = Date.now();
          try {
            await withTimeout(rollbackStep.compensate, stepTimeoutMs, `${rollbackStep.service} compensation`);
            const compDuration = Date.now() - compStart;
            this.onStepUpdate?.(rollbackIndex, 'compensated', `Rolled back ↩ (${compDuration}ms)`, { durationMs: compDuration });
            this.onLog?.(`✔ Compensated: ${rollbackStep.service} — ${compDuration}ms`);
          } catch (compErr: unknown) {
            compensationFailures++;
            const compMsg = compErr instanceof Error ? compErr.message : String(compErr);
            // NEW: use dedicated status so UI can render it differently
            this.onStepUpdate?.(rollbackIndex, 'compensation_failed', `Compensation failed 🚨 (${compMsg})`);
            this.onLog?.(`🚨 CRITICAL: Compensation failed for ${rollbackStep.service} — ${compMsg}`);
          }
        }

        const totalDurationMs = Date.now() - this.startTime;
        this.onLog?.(`🔴 Saga failed — all forward states evicted. Duration: ${totalDurationMs}ms`);

        return {
          success: false,
          sagaId: this.sagaId,
          totalDurationMs,
          stepsExecuted: executed.length,
          compensationsTriggered,
          compensationFailures,
        };
      }
    }

    // ── All steps succeeded ──────────────────────────────────────────────────
    const totalDurationMs = Date.now() - this.startTime;
    this.onLog?.(`🟢 Saga completed successfully! Global state committed. Duration: ${totalDurationMs}ms`);

    return {
      success: true,
      sagaId: this.sagaId,
      totalDurationMs,
      stepsExecuted: executed.length,
      compensationsTriggered: 0,
      compensationFailures: 0,
    };
  }
}