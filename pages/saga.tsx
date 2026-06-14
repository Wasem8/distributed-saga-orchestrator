import { useState } from 'react'
import {
  SagaTransactionOrchestrator,
  SagaStepUI,
} from '../src/services/SagaOrchestrator'

const INITIAL_STEPS: SagaStepUI[] = [
  { id: 0, service: 'Billing API', action: 'Hold Amount $250.00', compensateLabel: 'RefundCharge ($250.00)', status: 'pending', log: '' },
  { id: 1, service: 'Inventory Service', action: 'Lock Physical SKU Items', compensateLabel: 'UnlockSKU', status: 'pending', log: '' },
  { id: 2, service: 'Logistics Endpoint', action: 'Generate Shipping Manifest', compensateLabel: 'ReclaimCourierBooking', status: 'pending', log: '' },
]

const STATUS_STYLE: Record<string, string> = {
  pending:      'border-gray-600 bg-gray-800 text-gray-400',
  running:      'border-blue-500 bg-blue-900 text-white animate-pulse',
  success:      'border-green-500 bg-green-900 text-white',
  failed:       'border-red-500 bg-red-900 text-white',
  compensating: 'border-yellow-400 bg-yellow-900 text-yellow-100 animate-pulse',
  compensated:  'border-orange-400 bg-orange-900 text-orange-100',
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

export default function SagaPage() {
  const [steps, setSteps] = useState<SagaStepUI[]>(INITIAL_STEPS)
  const [logs, setLogs] = useState<string[]>(['» Saga coordinator state initialized. Ready to process multi-service orders.'])
  const [failMode, setFailMode] = useState<'none' | 'billing' | 'logistics'>('none')
  const [running, setRunning] = useState(false)
  const [outcome, setOutcome] = useState<'idle' | 'success' | 'failed'>('idle')

  const updateStep = (id: number, patch: Partial<SagaStepUI>) =>
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))

  const addLog = (msg: string) =>
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])

  const reset = () => {
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'pending', log: '' })))
    setLogs(['» Saga coordinator state initialized. Ready to process multi-service orders.'])
    setOutcome('idle')
  }

  const runSaga = async () => {
    if (running) return;

    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'pending', log: '' })))
    setLogs(['» Saga coordinator state initialized. Ready to process multi-service orders.'])
    setOutcome('idle')
    setRunning(true)

    await delay(200)

    const orchestrator = new SagaTransactionOrchestrator()

    orchestrator.onStepUpdate = (index, status, log) => updateStep(index, { status, log })
    orchestrator.onLog = addLog

    orchestrator.registerStep(
      'Billing API',
      async () => {
        await delay(1000)
        if (failMode === 'billing') throw new Error('Credit limit exceeded / Payment declined')
      },
      async () => { await delay(800) }
    )

    orchestrator.registerStep(
      'Inventory Service',
      async () => { await delay(1000) },
      async () => { await delay(800) }
    )

    orchestrator.registerStep(
      'Logistics Endpoint',
      async () => {
        await delay(1000)
        if (failMode === 'logistics') throw new Error('Courier dispatch center unreachable')
      },
      async () => { await delay(800) }
    )

    const result = await orchestrator.runTransaction()
    setOutcome(result ? 'success' : 'failed')
    setRunning(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-mono">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">🔄 Distributed Saga Orchestrator</h1>
        <p className="text-gray-400 mt-1">ID: SAGA-ID-9104</p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-6">
        <p className="text-sm text-gray-400 mb-3">Inject Transaction Block Disruption:</p>
        <div className="flex flex-wrap gap-3">
          {(['none', 'billing', 'logistics'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setFailMode(mode)}
              disabled={running}
              className={`px-4 py-2 rounded border text-sm font-semibold transition ${
                failMode === mode ? 'bg-blue-600 border-blue-400 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              } disabled:opacity-50`}
            >
              {mode === 'none' && '✅ Success Flow'}
              {mode === 'billing' && '❌ Fail Billing'}
              {mode === 'logistics' && '❌ Fail Logistics'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {steps.map((step, idx) => (
          <div key={step.id} className="relative">
            <div className={`border-2 rounded-lg p-5 transition-all duration-300 ${STATUS_STYLE[step.status]}`}>
              <div className="text-xs uppercase tracking-widest mb-2 opacity-60">STEP {idx + 1}</div>
              <div className="text-xs font-bold uppercase mb-3 px-2 py-1 rounded inline-block bg-black bg-opacity-30">{step.status}</div>
              <div className="text-lg font-bold mb-3">{step.service}</div>
              <div className="text-xs text-gray-300 mb-1"><span className="opacity-60">Action: </span>{step.action}</div>
              <div className="text-xs text-orange-300"><span className="opacity-60">Compensate: </span>{step.compensateLabel}</div>
              {step.log && <div className="mt-3 text-xs opacity-80 border-t border-white border-opacity-10 pt-2">{step.log}</div>}
            </div>
            {idx < steps.length - 1 && <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-gray-500 text-xl">→</div>}
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-6">
        <button onClick={runSaga} disabled={running} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-3 rounded-lg font-bold text-sm transition">
          {running ? '⏳ Processing...' : '⚡ Place Atomic Checkout Order'}
        </button>
        <button onClick={reset} disabled={running} className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-4 py-3 rounded-lg text-sm transition">Reset</button>
      </div>

      {outcome !== 'idle' && (
        <div className={`rounded-lg p-4 mb-6 font-bold text-center text-lg border-2 ${outcome === 'success' ? 'bg-green-900 border-green-500 text-green-300' : 'bg-red-900 border-red-500 text-red-300'}`}>
          {outcome === 'success' ? '🟢 Saga completed successfully! All services committed.' : '🔴 Saga failed — compensating transactions executed.'}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-700 rounded-lg p-5">
        <h2 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">📋 Saga Coordinator Console Monitor</h2>
        <div className="h-52 overflow-y-auto space-y-1 text-sm font-mono">
          {logs.map((log, i) => (
            <div key={i} className={
              log.includes('❌') || log.includes('🔴') ? 'text-red-400' :
              log.includes('✅') || log.includes('🟢') ? 'text-green-400' :
              log.includes('↩️') || log.includes('✔') ? 'text-yellow-400' :
              log.includes('▶') ? 'text-blue-400' : 'text-gray-400'
            }>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}