// pages/load-balancer.tsx
import { useState, useEffect, useMemo } from 'react';
import { LoadBalancerSimulator, ServerNode, LBAlgorithm } from '../src/services/LoadBalancer';
import TrafficAnimation from '../src/components/TrafficAnimation';

const INITIAL_SERVERS: ServerNode[] = [
  { id: 'srv-1', name: '💻 Server Node 01 (US-East Hub)', weight: 3, activeConnections: 0, responseTime: 12, cpuUsage: 15, isHealthy: true },
  { id: 'srv-2', name: '💻 Server Node 02 (EU-Central Hub)', weight: 2, activeConnections: 0, responseTime: 38, cpuUsage: 22, isHealthy: true },
  { id: 'srv-3', name: '💻 Server Node 03 (APAC-South Hub)', weight: 1, activeConnections: 0, responseTime: 85, cpuUsage: 10, isHealthy: true },
];

export default function LoadBalancerPage() {
  const [servers, setServers] = useState<ServerNode[]>(INITIAL_SERVERS);
  const [algorithm, setAlgorithm] = useState<LBAlgorithm>('round-robin');
  const [logs, setLogs] = useState<string[]>(['» Load balancer infrastructure online. Listening for ingress HTTP payloads.']);
  const [totalRequests, setTotalRequests] = useState(0);
  
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [animKey, setAnimKey] = useState(0);

  // حالة لتتبع عداد الأوزان الحية والمؤشر النشط في الـ UI
  const [weightStats, setWeightStats] = useState({ currentWeightCount: 0, currentIndex: 0 });

  const simulator = useMemo(() => new LoadBalancerSimulator(servers), []);

  useEffect(() => {
    const interval = setInterval(() => {
      setServers(prev => prev.map(srv => {
        if (!srv.isHealthy) return { ...srv, activeConnections: 0, cpuUsage: 0, responseTime: 0 };
        const delta = Math.floor(Math.random() * 3) - 1;
        const finalConns = Math.max(0, srv.activeConnections + delta);
        return {
          ...srv,
          activeConnections: finalConns,
          cpuUsage: Math.min(100, Math.max(8, Math.floor(finalConns * 12 + Math.random() * 10))),
          responseTime: Math.max(12, Math.floor(finalConns * 5 + Math.random() * 15))
        };
      }));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const handleIncomingRequest = () => {
    simulator.setServers(servers); 
    const targetServer = simulator.routeRequest(algorithm);
    
    // تحديث الإحصائيات فوراً لقراءتها في الواجهة
    setWeightStats(simulator.getWeightStats());
    
    setTotalRequests(prev => prev + 1);

    if (!targetServer) {
      setLogs(prev => [`[🚨 HTTP 503] DISPATCH ERROR: NO HEALTHY DOWNSTREAM NODES DETECTED!`, ...prev]);
      return;
    }

    setActiveServerId(targetServer.id);
    setAnimKey(prev => prev + 1);

    setServers(prev => prev.map(s => 
      s.id === targetServer.id 
        ? { ...s, activeConnections: s.activeConnections + 1, cpuUsage: Math.min(100, s.cpuUsage + 8) } 
        : s
    ));

    setLogs(prev => [
      `[📥 Ingress Packet #${totalRequests + 1}] Routed via [${algorithm.toUpperCase()}] ➔ Forwarded to ${targetServer.name}`,
      ...prev
    ]);
  };

  const toggleHealth = (id: string) => {
    setServers(prev => prev.map(s => s.id === id ? { ...s, isHealthy: !s.isHealthy } : s));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-mono">
      <div className="mb-6 border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
          🔄 Distributed Infrastructure: Load Balancer Studio
        </h1>
        <p className="text-gray-400 mt-1">محاكاة حركية تفاعلية لتوزيع الحمولات استناداً لمفاهيم المحاضرات الأكاديمية</p>
      </div>

      <TrafficAnimation activeServerId={activeServerId} triggerKey={animKey} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* كابينة التحكم البرمجية */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 h-fit shadow-xl">
          <h2 className="text-sm font-bold mb-4 text-blue-400 uppercase tracking-wider">⚙️ Routing Engine Controls</h2>
          
          <label className="text-xs text-gray-400 block mb-2">Select Balancing Strategy:</label>
          <select 
            value={algorithm} 
            onChange={(e) => setAlgorithm(e.target.value as LBAlgorithm)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="round-robin">Round-Robin (Static)</option>
            <option value="weighted-round-robin">Weighted Round-Robin (Static)</option>
            <option value="least-connections">Least Connections (Dynamic)</option>
            <option value="power-of-two">Power of Two Choices (Dynamic)</option>
            <option value="resource-aware">Resource-Aware [CPU] (Dynamic)</option>
          </select>

          <button 
            onClick={handleIncomingRequest}
            className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-white font-bold p-3.5 rounded-xl text-sm shadow-lg shadow-blue-900/40"
          >
            ⚡ Fire Aggregated HTTP Request
          </button>

          {/* عرض حالة الأوزان العامة لوضع الـ Weighted */}
          {algorithm === 'weighted-round-robin' && (
            <div className="mt-4 bg-gray-950 p-3 rounded-xl border border-gray-800 text-xs text-gray-400 space-y-1">
              <div className="font-bold text-yellow-400 mb-1">📊 WRR Engine Telemetry:</div>
              <div>Current Server Index Pointed: <span className="text-white font-bold">Node {weightStats.currentIndex + 1}</span></div>
              <div>Current Safe Request Count: <span className="text-white font-bold">{weightStats.currentWeightCount}</span></div>
            </div>
          )}

          <div className="mt-4 text-center text-xs text-gray-500 border-t border-gray-800 pt-3">
            Routed Traffic Packets: <span className="text-blue-400 font-bold">{totalRequests}</span>
          </div>
        </div>

        {/* لوحة عرض حالة السيرفرات */}
        <div className="lg:col-span-2 space-y-4">
          {servers.map((srv, idx) => {
            // حساب هل هذا السيرفر هو الذي عليه الدور حالياً في نظام الأوزان
            const isCurrentInWeight = algorithm === 'weighted-round-robin' && weightStats.currentIndex === idx;

            return (
              <div 
                key={srv.id} 
                className={`border rounded-2xl p-5 transition-all duration-300 bg-gray-900/70 ${
                  isCurrentInWeight ? 'border-yellow-500/60 ring-1 ring-yellow-500/30 shadow-lg shadow-yellow-950/10' : 'border-gray-800'
                } ${!srv.isHealthy && 'border-red-900/50 opacity-40 bg-red-950/5'}`}
              >
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-gray-200">{srv.name}</h3>
                      {/* شارة توضح الوزن الاستاتيكي بشكل بارز */}
                      <span className="bg-gray-800 border border-gray-700 text-gray-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        Config Weight: {srv.weight}
                      </span>
                    </div>
                    
                    {/* عرض الاستهلاك الحالي للوزن التنازلي بناءً على طلبك ذكي! */}
                    {algorithm === 'weighted-round-robin' && srv.isHealthy && (
                      <p className="text-xs mt-1">
                        {isCurrentInWeight ? (
                          <span className="text-yellow-400 font-bold animate-pulse">
                            ⚡ Active Token: Processing ({weightStats.currentWeightCount} / {srv.weight})
                          </span>
                        ) : (
                          <span className="text-gray-500">💤 Waiting Queue Turn</span>
                        )}
                      </p>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => toggleHealth(srv.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      srv.isHealthy ? 'bg-green-950 text-green-400 border-green-800/60' : 'bg-red-950 text-red-400 border-red-800/60'
                    }`}
                  >
                    {srv.isHealthy ? '🟢 HEALTHY' : '🔴 DEAD NODE'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center bg-gray-950/80 rounded-xl p-3 text-xs">
                  <div>
                    <div className="text-gray-500 mb-1">Active Connections</div>
                    <div className="font-bold text-sm text-blue-400">{srv.activeConnections}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Response Latency</div>
                    <div className="font-bold text-sm text-yellow-400">{srv.isHealthy ? `${srv.responseTime}ms` : '0ms'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">CPU Utilization</div>
                    <div className="font-bold text-sm text-purple-400">{srv.cpuUsage}%</div>
                  </div>
                </div>

                {srv.isHealthy && (
                  <div className="w-full bg-gray-800 h-1.5 rounded-full mt-4 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        srv.cpuUsage > 75 ? 'bg-red-500' : srv.cpuUsage > 45 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${srv.cpuUsage}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* الـ Console Monitor لمراقبة حركة بروكسي التوجيه */}
      <div className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-inner">
        <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">📋 Reverse Proxy Ingress Logs</h3>
        <div className="h-40 overflow-y-auto space-y-1 text-xs font-mono bg-gray-950 p-3 rounded-xl border border-gray-800">
          {logs.map((log, i) => (
            <div key={i} className={log.includes('🚨') ? 'text-red-400 font-bold' : log.includes('📥') ? 'text-green-400' : 'text-gray-400'}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}