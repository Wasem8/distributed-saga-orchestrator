import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { LoadBalancerSimulator, ServerNode, LBAlgorithm } from '../src/services/LoadBalancer';
import TrafficAnimation from '../src/components/TrafficAnimation';
import ServerCard from '../src/components/ServerCard';
import KPICard from '../src/components/KPICard';
import DistributionChart from '../src/components/DistributionChart';

// استيراد الأيقونات الاحترافية من Lucide
import { 
  Play, 
  Pause, 
  Zap, 
  PlusCircle, 
  RotateCcw, 
  Activity, 
  Cpu, 
  CpuIcon,
  Layers,
  Terminal
} from 'lucide-react';

interface LogMessage {
  id: string;
  timestamp: string;
  algorithm: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

const INITIAL_SERVERS: ServerNode[] = [
  { id: 'server-1', name: 'Server-A', weight: 3, activeConnections: 0, responseTime: 15, cpuUsage: 12, isHealthy: true, processedRequests: 0 },
  { id: 'server-2', name: 'Server-B', weight: 1, activeConnections: 0, responseTime: 40, cpuUsage: 8, isHealthy: true, processedRequests: 0 },
  { id: 'server-3', name: 'Server-C', weight: 2, activeConnections: 0, responseTime: 25, cpuUsage: 18, isHealthy: true, processedRequests: 0 },
];

export default function LoadBalancerPage() {
  const [servers, setServers] = useState<ServerNode[]>(INITIAL_SERVERS);
  const [algorithm, setAlgorithm] = useState<LBAlgorithm>('round-robin'); // تبدأ الآن بـ Round Robin بناءً على طلبك
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [rps, setRps] = useState<number>(3);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [triggerKey, setTriggerKey] = useState<number>(0);
  const [totalRequests, setTotalRequests] = useState<number>(0);
  const [logs, setLogs] = useState<LogMessage[]>([]);

  const lbRef = useRef(new LoadBalancerSimulator(INITIAL_SERVERS));
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lbRef.current.setServers(servers);
  }, [servers]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        handleRouteRequest();
      }, 1000 / rps);
    }
    return () => clearInterval(interval);
  }, [isPlaying, rps, algorithm]);

  // التمرير الصامت الداخلي لحماية الـ Viewport وسحب الشاشة
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    const metricsInterval = setInterval(() => {
      setServers(prev => prev.map(s => {
        if (!s.isHealthy) return s;
        const cpuDelta = Math.floor(Math.random() * 15) - 7;
        const latencyDelta = Math.floor(Math.random() * 9) - 4;
        const connDelta = s.activeConnections > 0 && Math.random() > 0.7 ? -1 : 0;

        return {
          ...s,
          cpuUsage: Math.max(5, Math.min(95, s.cpuUsage + cpuDelta)),
          responseTime: Math.max(10, Math.min(180, s.responseTime + latencyDelta)),
          activeConnections: Math.max(0, s.activeConnections + connDelta)
        };
      }));
    }, 1200);

    return () => clearInterval(metricsInterval);
  }, []);

  const addLog = (msg: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + `.${String(now.getMilliseconds()).padStart(3, '0')}`;
    const newLog: LogMessage = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: timeStr,
      algorithm: algorithm.replace(/-/g, ' ').toUpperCase(),
      message: msg,
      type
    };
    setLogs(prev => [...prev.slice(-49), newLog]);
  };

  const handleRouteRequest = () => {
    const target = lbRef.current.routeRequest(algorithm);
    if (target) {
      setActiveServerId(target.id);
      setTriggerKey(prev => prev + 1);
      setTotalRequests(prev => prev + 1);

      let logDetail = `Routed request to [${target.name}]`;
      if (algorithm === 'power-of-two-choices') {
        logDetail = `P2C evaluated nodes. Selected [${target.name}] with lowest active connections (${target.activeConnections}).`;
      } else if (algorithm === 'least-connections') {
        logDetail = `Least-Conn selected [${target.name}] with ${target.activeConnections} active connections.`;
      } else if (algorithm === 'latency-based') {
        logDetail = `Latency-Based selected [${target.name}] with fastest ping (${target.responseTime}ms).`;
      }

      addLog(logDetail, 'success');

      setServers(prev => prev.map(s => {
        if (s.id === target.id) {
          return {
            ...s,
            processedRequests: s.processedRequests + 1,
            activeConnections: s.activeConnections + 1,
            cpuUsage: Math.min(98, s.cpuUsage + 3)
          };
        }
        return s;
      }));
    } else {
      addLog("Routing failed: No healthy servers available!", "warning");
    }
  };

  const handleToggleHealth = (id: string) => {
    setServers(prev => prev.map(s => {
      if (s.id === id) {
        const nextState = !s.isHealthy;
        addLog(`Server [${s.name}] status manually changed to ${nextState ? 'ONLINE' : 'OFFLINE'}`, nextState ? 'info' : 'warning');
        return { ...s, isHealthy: nextState, activeConnections: 0 };
      }
      return s;
    }));
  };

  const handleWeightChange = (id: string, weight: number) => {
    setServers(prev => prev.map(s => {
      if (s.id === id) {
        addLog(`Updated weight for [${s.name}] to: ${weight}`, 'info');
        return { ...s, weight };
      }
      return s;
    }));
  };

  const handleRemoveServer = (id: string) => {
    const targetServer = servers.find(s => s.id === id);
    if (targetServer) addLog(`Removed node [${targetServer.name}] from mesh topology`, 'warning');
    setServers(prev => prev.filter(s => s.id !== id));
  };

  const handleAddServer = () => {
    if (servers.length >= 5) return;
    const nextId = `server-${Date.now()}`;
    const name = `Server-${String.fromCharCode(65 + servers.length)}`;
    const newServer: ServerNode = {
      id: nextId,
      name,
      weight: 1,
      activeConnections: 0,
      responseTime: 30,
      cpuUsage: 10,
      isHealthy: true,
      processedRequests: 0
    };
    setServers(prev => [...prev, newServer]);
    addLog(`Spawned new healthy infrastructure node: [${name}]`, 'info');
  };

  const handleReset = () => {
    setIsPlaying(false);
    setTotalRequests(0);
    setActiveServerId(null);
    setLogs([]);
    lbRef.current.reset(INITIAL_SERVERS);
    setServers(INITIAL_SERVERS);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-sans">
      <Head>
        <title>Dynamic Load Balancer Mesh</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* شريط التحكم العلوي مطعم بالأيقونات */}
        <header className="flex justify-between items-center pb-4 border-b border-gray-900">
          <div>
            <h1 className="text-xl font-black bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Architectural Load Balancer Simulator
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Interactive Multi-Algorithm Router Evaluation Map</p>
          </div>
          
          <div className="flex gap-2.5">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 ${isPlaying ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? 'Pause Simulation' : 'Start Simulation'}
            </button>
            <button onClick={handleRouteRequest} className="bg-gray-900 hover:bg-gray-850 border border-gray-800 text-xs font-bold px-4 py-2 rounded-xl text-gray-200 transition-colors flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Inject Request
            </button>
            <button 
              onClick={handleAddServer} 
              disabled={servers.length >= 5} 
              className="bg-cyan-950 text-cyan-400 border border-cyan-900 text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-20 transition-all flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Add Node
            </button>
            <button onClick={handleReset} className="bg-gray-900 hover:bg-gray-850 border border-gray-800 text-xs font-bold px-3 py-2 rounded-xl text-red-400 transition-colors flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </header>

        {/* كروت الـ KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard title="Total Transactions" value={totalRequests} color="text-indigo-400" />
          <KPICard title="Traffic Load Speed" value={`${rps} Req/s`} color="text-cyan-400" />
          <KPICard title="Current Strategy" value={algorithm.replace(/-/g, ' ').toUpperCase()} color="text-emerald-400" />
        </div>

        {/* لوحة التحكم بالإستراتيجية وسرعة التدفق مع إصلاح ألوان القائمة المنسدلة */}
        <div className="bg-gray-900 border border-gray-850 p-4 rounded-xl flex flex-wrap gap-6 items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-400">Balancing Policy:</span>
            <select 
              value={algorithm} 
              onChange={(e) => setAlgorithm(e.target.value as LBAlgorithm)}
              className="bg-gray-850 border border-gray-750 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 text-gray-200 font-medium cursor-pointer"
            >
              <option value="round-robin" className="bg-gray-900 text-gray-200">Round Robin</option>
              <option value="weighted-round-robin" className="bg-gray-900 text-gray-200">Weighted Round Robin</option>
              <option value="smooth-round-robin" className="bg-gray-900 text-gray-200">Smooth Round Robin (Nginx)</option>
              <option value="power-of-two-choices" className="bg-gray-900 text-gray-200">Power of Two Choices (P2C)</option>
              <option value="least-connections" className="bg-gray-900 text-gray-200">Least Connections</option>
              <option value="weighted-least-connections" className="bg-gray-900 text-gray-200">Weighted Least Connections</option>
              <option value="latency-based" className="bg-gray-900 text-gray-200">Latency Based</option>
              <option value="performance-based" className="bg-gray-900 text-gray-200">Performance Based (CPU)</option>
              <option value="adaptive-feedback" className="bg-gray-900 text-gray-200">Adaptive Feedback (Hybrid)</option>
              <option value="idle-join-queue" className="bg-gray-900 text-gray-200">Idle Join Queue</option>
              <option value="consistent-hashing" className="bg-gray-900 text-gray-200">Consistent Hashing</option>
              <option value="server-mesh" className="bg-gray-900 text-gray-200">Server Mesh (Random)</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-400">Flow Speed:</span>
            <input 
              type="range" min="1" max="12" value={rps} 
              onChange={(e) => setRps(parseInt(e.target.value))}
              className="w-28 accent-cyan-500 cursor-pointer"
            />
            <span className="text-xs font-mono font-bold bg-gray-850 px-2 py-0.5 rounded text-gray-300">{rps} RPS</span>
          </div>
        </div>

        {/* مشهد الخريطة الرادارية */}
        <div className="h-[450px]">
          <TrafficAnimation 
            servers={servers} 
            activeServerId={activeServerId} 
            triggerKey={triggerKey} 
          />
        </div>

        {/* شبكة بطاقات السيرفرات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.map(server => (
            <ServerCard
              key={server.id}
              server={server}
              highlighted={activeServerId === server.id}
              onToggleHealth={handleToggleHealth}
              onRemove={handleRemoveServer}
              onWeightChange={handleWeightChange}
              canRemove={servers.length > 1}
            />
          ))}
        </div>

        {/* لوحة التقارير والسجلات المزدوجة المتقدمة */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* الرسم البياني لـ Recharts */}
          <DistributionChart servers={servers} />

          {/* شاشة سجل العمليات الاحترافية بالـ Terminal Icon */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col h-[280px] shadow-md overflow-hidden">
            <div className="flex justify-between items-center mb-3 border-b border-gray-800 pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-green-400" />
                Live Event Logger Terminal
              </h3>
              <button 
                onClick={() => setLogs([])}
                className="text-[10px] bg-gray-850 hover:bg-gray-800 border border-gray-750 px-2 py-0.5 rounded text-gray-400 transition-colors"
              >
                Clear Logs
              </button>
            </div>

            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1.5 pr-2 max-h-[200px]"
            >
              {logs.length === 0 ? (
                <div className="text-gray-600 h-full flex items-center justify-center italic">
                  No core events emitted yet. Run simulation to stream frames...
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="leading-5 transition-all">
                    <span className="text-gray-500">[{log.timestamp}]</span>{' '}
                    <span className="text-indigo-400 font-bold">[{log.algorithm}]</span>{' '}
                    <span className={`
                      ${log.type === 'success' ? 'text-green-400' : ''}
                      ${log.type === 'warning' ? 'text-red-400 font-semibold' : ''}
                      ${log.type === 'info' ? 'text-cyan-400' : ''}
                    `}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}