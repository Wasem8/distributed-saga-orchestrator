// Types definitions matching the Lab requirements
export type StepStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'compensating'
  | 'compensated';

export interface SagaStepUI {
  id: number;
  service: string;
  action: string;
  compensateLabel: string;
  status: StepStatus;
  log: string;
}

export class SagaTransactionOrchestrator {
  private steps: {
    service: string;
    execute: () => Promise<void>;
    compensate: () => Promise<void>;
  }[] = [];

  onStepUpdate?: (stepIndex: number, status: StepStatus, log: string) => void;
  onLog?: (message: string) => void;

  registerStep(
    service: string,
    exec: () => Promise<void>,
    comp: () => Promise<void>
  ) {
    this.steps.push({ service, execute: exec, compensate: comp });
  }

  async runTransaction(): Promise<boolean> {
    const executed: number[] = [];

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];

      this.onStepUpdate?.(i, 'running', `Executing local transaction...`);
      this.onLog?.(`▶ Starting: ${step.service}`);

      try {
        await step.execute();
        
        executed.push(i);
        this.onStepUpdate?.(i, 'success', 'Completed ✅');
        this.onLog?.(`✅ Success: ${step.service}`);

      } catch (err: any) {
        const errorMsg = err?.message || 'Unknown error';
        this.onStepUpdate?.(i, 'failed', `Failed ❌ (${errorMsg})`);
        this.onLog?.(`❌ Failed: ${step.service} — Initiating backward recovery rollback...`);

        for (let j = executed.length - 1; j >= 0; j--) {
          const rollbackIndex = executed[j];
          const rollbackStep = this.steps[rollbackIndex];
          
          this.onStepUpdate?.(rollbackIndex, 'compensating', 'Rolling back local state...');
          this.onLog?.(`↩️ Compensating: ${rollbackStep.service}`);
          
          try {
            await rollbackStep.compensate();
            this.onStepUpdate?.(rollbackIndex, 'compensated', 'Rolled back ↩️');
            this.onLog?.(`✔ Compensated: ${rollbackStep.service}`);
          } catch (compErr) {
            this.onStepUpdate?.(rollbackIndex, 'failed', 'Compensate Failed 🚨');
            this.onLog?.(`🚨 CRITICAL: Compensation failed for ${rollbackStep.service}`);
          }
        }

        this.onLog?.('🔴 Saga workflow failed — all forward states evicted safely.');
        return false;
      }
    }

    this.onLog?.('🟢 Saga completed successfully! Global state committed.');
    return true;
  }
}