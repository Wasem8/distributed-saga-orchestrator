import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { ServerNode } from "../services/LoadBalancer";
import { BarChart3 } from 'lucide-react';

interface Props {
  servers: ServerNode[];
}

export default function DistributionChart({ servers }: Props) {
  // تجهيز البيانات بالشكل الذي تتوقعه مكتبة Recharts
  const data = servers.map(srv => ({
    name: srv.name,
    requests: srv.processedRequests,
  }));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg flex flex-col h-[280px]">
      <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
        <BarChart3 className="w-4 h-4 text-cyan-400" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Real-Time Traffic Analytics
        </h3>
      </div>

      <div className="flex-1 w-full text-[10px] font-mono">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} />
            <YAxis stroke="#6b7280" fontSize={10} tickLine={false} allowDecimals={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', borderRadius: '8px' }}
              labelStyle={{ color: '#9ca3af', fontWeight: 'bold', fontSize: '11px' }}
              itemStyle={{ color: '#22d3ee', fontSize: '11px' }}
            />
            <Bar dataKey="requests" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={400}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="url(#barGradient)" />
              ))}
            </Bar>
            {/* تعريف التدرج اللوني للشريط ليظهر بشكل برّاق احترافي */}
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9}/>
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3}/>
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}