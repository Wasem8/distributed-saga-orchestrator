import { useState, useCallback, useEffect, useRef } from 'react';
import Head from 'next/head';
import {
  SagaTransactionOrchestrator,
  SagaStepUI,
  SagaRunResult,
  StepStatus,
} from '../src/services/SagaOrchestrator';

// استيراد أيقونات لوسيد الاحترافية للمعمل
import { 
  GitMerge, 
  RotateCcw, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Activity, 
  Terminal, 
  ArrowRight,
  ShieldAlert,
  Server
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_LOG = '» Saga coordinator state initialized. Ready to process multi-service orders.';

const INITIAL_STEPS: SagaStepUI[] = [
  {
    id: 0,
    service: 'Billing API',
    action: 'Hold Amount $250.00',
    compensateLabel: 'RefundCharge ($250.00)',
    status: 'pending',
    log: '',
  },
  {
    id: 1,
    service: 'Inventory Service',
    action: 'Lock Physical SKU Items',
    compensateLabel: 'UnlockSKU',
    status: 'pending',
    log: '',
  },
  {
    id: 2,
    service: 'Logistics Endpoint',
    action: 'Generate Shipping Manifest',
    compensateLabel: 'ReclaimCourierBooking',
    status: 'pending',
    log: '',
  },
];

// ─── Status styles ────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<StepStatus, string> = {
  pending:              'border-gray-800 bg-gray-900/40 text-gray-400',
  running:              'border-blue-500 bg-blue-950/40 text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]',
  success:              'border-green-500 bg-green-950/20 text-white',
  failed:               'border-red-500 bg-red-950/30 text-white',
  compensating:         'border-amber-500 bg-amber-950/40 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
  compensated:          'border-orange-500 bg-orange-950/30 text-orange-100',
  compensation_failed:  'border-red-600 bg-red-950/70 text-red-200 ring-1 ring-red-500 animate-pulse',
};

const STATUS_LABEL: Record<StepStatus, string> = {
  pending:             'Pending',
  running:             'Processing',
  success:             'Success',
  failed:              'Failed',
  compensating:        'Compensating',
  compensated:         'Compensated',
  compensation_failed: 'Comp. Failed',
};

const STATUS_DOT: Record<StepStatus, string> = {
  pending:             'bg-gray-700',
  running:             'bg-blue-400 animate-ping',
  success:             'bg-green-400',
  failed:              'bg-red-400',
  compensating:        'bg-amber-400 animate-spin',
  compensated:         'bg-orange-400',
  compensation_failed: 'bg-red-600',
};

// Which direction the arrow between steps points — forward or backward (rollback)
function StepConnector({ isRollingBack }: { isRollingBack: boolean }) {
  return (
    <div className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 flex-col items-center gap-0.5">
      <ArrowRight
        className={`w-4 h-4 transition-all duration-500 ${
          isRollingBack ? 'text-orange-400 rotate-180' : 'text-gray-700'
        }`}
      />
      {isRollingBack && (
        <span className="text-[8px] text-orange-400 font-bold uppercase tracking-widest whitespace-nowrap bg-orange-950/60 border border-orange-900/50 px-1 rounded">
          rollback
        </span>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// ─── Component ────────────────────────────────────────────────────────────────
export default function SagaPage() {
  const [steps, setSteps] = useState<SagaStepUI[]>(INITIAL_STEPS);
  const [logs, setLogs] = useState<string[]>([INITIAL_LOG]);
  const [failStep, setFailStep] = useState<number | -1>(-1); 
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<'idle' | 'success' | 'failed'>('idle');
  const [lastResult, setLastResult] = useState<SagaRunResult | null>(null);

  // مرجع الـ Terminal لمنع سحب وحركة الـ Viewport برمجياً
  const consoleContainerRef = useRef<HTMLDivElement>(null);

  const isRollingBack = steps.some(
    (s) => s.status === 'compensating' || s.status === 'compensated' || s.status === 'compensation_failed'
  );

  // التمرير الصامت للمنظومة بدون التأثير على المتصفح
  useEffect(() => {
    if (consoleContainerRef.current) {
      const el = consoleContainerRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  const updateStep = useCallback((id: number, patch: Partial<SagaStepUI>) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s))),
    []
  );

  const addLog = useCallback((msg: string) =>
    setLogs((prev) =>
      [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-50)
    ),
    []
  );

  const reset = useCallback(() => {
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'pending', log: '', durationMs: undefined, attempts: undefined })));
    setLogs([INITIAL_LOG]);
    setOutcome('idle');
    setLastResult(null);
    setRunning(false);
  }, []);

  const runSaga = async () => {
    if (running) return;
    reset();
    setRunning(true);
    await delay(150);

    const orchestrator = new SagaTransactionOrchestrator();

    orchestrator.onStepUpdate = (index, status, log, meta) =>
      updateStep(index, { status, log, durationMs: meta?.durationMs, attempts: meta?.attempts });

    orchestrator.onLog = addLog;

    orchestrator.registerStep(
      'Billing API',
      async () => {
        await delay(1000);
        if (failStep === 0) throw new Error('Credit limit exceeded / Payment declined');
      },
      async () => { await delay(700); }
    );

    orchestrator.registerStep(
      'Inventory Service',
      async () => {
        await delay(1100);
        if (failStep === 1) throw new Error('SKU reservation conflict — stock unavailable');
      },
      async () => { await delay(700); }
    );

    orchestrator.registerStep(
      'Logistics Endpoint',
      async () => {
        await delay(1000);
        if (failStep === 2) throw new Error('Courier dispatch center unreachable');
      },
      async () => { await delay(700); }
    );

    const result = await orchestrator.runTransaction({ maxRetries: 1, stepTimeoutMs: 6000 });

    setLastResult(result);
    setOutcome(result.success ? 'success' : 'failed');
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 md:p-10 font-sans">
      <Head>
        <title>Saga Orchestrator Framework</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* الهيدر الاحترافي */}
        <div className="flex flex-wrap justify-between items-start pb-4 border-b border-gray-900 gap-4">
          <div>
            <h1 className="text-xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2.5">
              <GitMerge className="w-5 h-5 text-cyan-400" />
              Distributed Saga Transaction Orchestrator
            </h1>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              {lastResult ? lastResult.sagaId : 'CLUSTER NODE CLASSIFIER: SAGA-ID-9104'}
            </p>
          </div>
        </div>

        {/* ── لوحة الـ KPIs المتقدمة للسيرفر ───────────────────────────────── */}
        {lastResult && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
            {[
              { label: 'Total Sync Time', value: `${lastResult.totalDurationMs}ms`, icon: Clock, color: 'text-cyan-400' },
              { label: 'Mesh Executed', value: `${lastResult.stepsExecuted} / ${INITIAL_STEPS.length}`, icon: Activity, color: 'text-blue-400' },
              { label: 'Rollback Signals', value: String(lastResult.compensationsTriggered), icon: RotateCcw, color: 'text-amber-400' },
              { label: 'Critical Failures', value: String(lastResult.compensationFailures), icon: ShieldAlert, color: lastResult.compensationFailures > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-gray-900 border border-gray-850 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-mono">{stat.label}</div>
                  <div className={`text-base font-black font-mono ${stat.color}`}>{stat.value}</div>
                </div>
            
<stat.icon className={`w-5 h-5 ${stat.color} opacity-40`} />
              </div>
            ))}
          </div>
        )}

        {/* ── لوحة حقن الأخطاء المتناسقة ─────────────────────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-850 p-5 rounded-xl shadow-sm">
          <p className="text-[10px] text-gray-500 mb-3 uppercase tracking-widest font-mono">
            Inject Mesh Infrastructure Interruption:
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setFailStep(-1)}
              disabled={running}
              className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                failStep === -1
                  ? 'bg-green-950/60 border-green-600 text-green-400'
                  : 'bg-gray-850 border-gray-750 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              } disabled:opacity-40`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Nominal Success Flow
            </button>

            {INITIAL_STEPS.map((s) => (
              <button
                key={s.id}
                onClick={() => setFailStep(s.id)}
                disabled={running}
                className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                  failStep === s.id
                    ? 'bg-red-950/60 border-red-600 text-red-400'
                    : 'bg-gray-850 border-gray-750 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                } disabled:opacity-40`}
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Fail {s.service.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* ── الـ Progress Bar الأنيق ────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 px-1">
          {INITIAL_STEPS.map((_, idx) => {
            const step = steps[idx];
            const isActive = step.status === 'running' || step.status === 'compensating';
            const isDone = step.status === 'success';
            const isFailed = step.status === 'failed' || step.status === 'compensation_failed';
            const isComp = step.status === 'compensated';

            return (
              <div key={idx} className="flex items-center flex-1">
                <div
                  className={`h-1 rounded-full flex-1 transition-all duration-700 ${
                    isDone ? 'bg-green-500' :
                    isFailed ? 'bg-red-500' :
                    isComp ? 'bg-orange-400' :
                    isActive ? 'bg-blue-500 animate-pulse' : 'bg-gray-800'
                  }`}
                />
                <span className={`w-2 h-2 rounded-full mx-1.5 transition-all duration-300 ${
                  step.status === 'running' ? 'bg-blue-400 animate-ping' :
                  step.status === 'compensating' ? 'bg-amber-400 animate-pulse' :
                  STATUS_DOT[step.status]
                }`} />
              </div>
            );
          })}
        </div>

        {/* ── بطاقات الـ Steps الهندسية ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {steps.map((step, idx) => (
            <div key={step.id} className="relative group">
              <div
                className={`border border-gray-850 rounded-xl p-5 transition-all duration-300 ${STATUS_STYLE[step.status]}`}
              >
                <div className="flex items-start justify-between mb-3 border-b border-gray-800/40 pb-2">
                  <div className="text-[9px] uppercase tracking-widest text-gray-500 font-mono flex items-center gap-1">
                    <Server className="w-3 h-3 text-gray-500" /> Infrastructure Node 0{idx + 1}
                  </div>
                  {step.attempts && step.attempts > 1 && (
                    <span className="text-[9px] bg-amber-950 border border-amber-800 text-amber-400 px-2 py-0.5 rounded-lg font-mono">
                      Retry #{step.attempts - 1}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mb-3">
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[step.status]}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-gray-300">
                    {STATUS_LABEL[step.status]}
                  </span>
                </div>

                <div className="text-sm font-bold text-gray-100 mb-4">{step.service}</div>

                <div className="space-y-1.5 text-xs font-mono border-t border-gray-800/40 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Action:</span>
                    <span className="text-gray-300 text-right font-semibold">{step.action}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rollback:</span>
                    <span className="text-orange-400 text-right text-[11px] font-medium">{step.compensateLabel}</span>
                  </div>
                </div>

                {step.durationMs !== undefined && (
                  <div className="mt-4 text-[10px] text-gray-500 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-600" /> execution latency: {step.durationMs}ms
                  </div>
                )}

                {step.log && (
                  <div className="mt-3 text-[11px] font-mono text-red-400 bg-red-950/20 border border-red-900/40 rounded-lg p-2 leading-relaxed">
                    {step.log}
                  </div>
                )}
              </div>

              {idx < steps.length - 1 && (
                <StepConnector isRollingBack={isRollingBack} />
              )}
            </div>
          ))}
        </div>

        {/* ── أزرار التحكم والتشغيل ───────────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <button
            onClick={runSaga}
            disabled={running}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md shadow-blue-900/10 active:scale-98"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            {running ? 'Processing Transaction Cluster...' : 'Commit Atomic Checkout Order'}
          </button>
          <button
            onClick={reset}
            disabled={running}
            className="bg-gray-900 hover:bg-gray-850 disabled:opacity-40 border border-gray-800 text-gray-300 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Node
          </button>
        </div>

        {/* ── لافتة النتيجة النهائية للمحاكاة ──────────────────────────────────────────────────── */}
        {outcome !== 'idle' && (
          <div
            className={`rounded-xl p-4 font-bold text-center text-xs uppercase tracking-wider font-mono border transition-all animate-fade-in ${
              outcome === 'success'
                ? 'bg-green-950/40 border-green-700/60 text-green-400'
                : 'bg-red-950/40 border-red-700/60 text-red-400'
            }`}
          >
            {outcome === 'success'
              ? '✓ Saga Transaction Cluster Committed Successfully. Distributed States Synchronized.'
              : lastResult?.compensationFailures
              ? '🚨 Fatal: System Inconsistent. Saga Failed and Rollback Handlers Failed. Manual Overrides Crucial.'
              : '↩ Warning: Transaction Block Inverted. Saga Rolled Back via Compensation Interceptors.'}
          </div>
        )}

        {/* ── شاشة الـ Console المحدثة والمحمية من الـ Scroll ─────────────────────────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-850 rounded-xl p-5 shadow-inner">
          <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-500" />
              Saga Coordinator Console Monitor
            </h2>
            <span className="text-[10px] font-mono text-gray-600">{logs.length} / 50 frames</span>
          </div>
          
          {/* هنا تم ربط الـ Ref مع الـ scrollTop الداخلي لمنع قفز الشاشة للأبد */}
          <div 
            ref={consoleContainerRef}
            className="h-52 overflow-y-auto space-y-1.5 text-[11px] font-mono pr-1 scroll-smooth"
          >
            {logs.map((log, i) => (
              <div
                key={i}
                className={`leading-5 ${
                  log.includes('❌') || log.includes('🔴') || log.includes('🚨') ? 'text-red-400' :
                  log.includes('✅') || log.includes('🟢') ? 'text-green-400 font-medium' :
                  log.includes('↩') || log.includes('✔') || log.includes('Compensat') ? 'text-amber-400' :
                  log.includes('↻') || log.includes('Retry') ? 'text-orange-400' :
                  log.includes('▶') || log.includes('Starting') ? 'text-blue-400' : 'text-gray-500'
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}