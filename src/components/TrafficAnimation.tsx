import React from 'react';
import { ServerNode } from '../services/LoadBalancer';

interface TrafficAnimationProps {
  servers: ServerNode[];
  activeServerId: string | null;
  triggerKey: number;
}

export default function TrafficAnimation({
  servers,
  activeServerId,
  triggerKey,
}: TrafficAnimationProps) {
  const lbX = 220;
  const lbY = 220;
  const serverStartX = 760;

  const spacing = servers.length > 1 ? 320 / (servers.length - 1) : 0;

  return (
    <div className="w-full h-full relative bg-gray-950 rounded-2xl border border-gray-900 overflow-hidden min-h-[450px]">
      {/* Header */}
      <div className="absolute top-3 left-4 z-20">
        <div className="text-[11px] uppercase tracking-widest text-gray-500 font-bold">
          Live Traffic Topology
        </div>
      </div>

      {/* SVG Layer */}
      <svg viewBox="0 0 1000 450" className="absolute inset-0 w-full h-full">
        <defs>
          <filter id="packetGlow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connection Lines */}
        {servers.map((server, index) => {
          const y = 70 + spacing * index;
          const isActive = activeServerId === server.id;

          return (
            <g key={server.id}>
              <line
                x1={lbX + 40}
                y1={lbY}
                x2={serverStartX}
                y2={y}
                stroke={isActive ? '#60a5fa' : '#1e293b'}
                strokeWidth={isActive ? '3' : '2'}
                strokeDasharray={isActive ? 'none' : '6 6'}
                className="transition-all duration-300"
              />

              {isActive && (
                <circle
                  key={`${server.id}-${triggerKey}`}
                  r="8"
                  fill="#22c55e"
                  filter="url(#packetGlow)"
                >
                  <animateMotion
                    dur="700ms"
                    repeatCount="1"
                    fill="freeze"
                    path={`M ${lbX + 40} ${lbY} L ${serverStartX} ${y}`}
                  />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {/* Load Balancer Box UI */}
      <div
        className="
          absolute
          left-16
          top-1/2
          -translate-y-1/2
          z-10
          bg-blue-600
          border
          border-blue-400
          rounded-2xl
          px-6
          py-5
          shadow-xl
          shadow-blue-900/50
          text-center
          w-40
        "
      >
        <div className="text-3xl mb-1">🎛️</div>
        <div className="font-bold text-white text-sm">Load Balancer</div>
        <div className="text-[10px] text-blue-100 mt-1">Traffic Router</div>
      </div>

      {/* Nodes DOM Sidebar Over SVG */}
      <div
        className="
          absolute
          right-10
          top-1/2
          -translate-y-1/2
          flex
          flex-col
          z-10
          justify-between
          h-[350px]
        "
      >
        {servers.map((server, index) => {
          const active = activeServerId === server.id;

          return (
            <div
              key={server.id}
              className={`
                w-44
                rounded-xl
                border
                p-3
                transition-all
                duration-300
                ${
                  active
                    ? 'border-green-400 bg-green-950/40 scale-105 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                    : 'border-gray-800 bg-gray-900/80'
                }
                ${!server.isHealthy ? 'opacity-30 border-red-950 bg-gray-950' : ''}
              `}
            >
              <div className="font-bold text-white text-xs truncate">
                {server.name}
              </div>
              <div className="flex justify-between items-center mt-1.5 text-[10px] text-gray-400 font-mono">
                <span>W: {server.weight}</span>
                <span className={server.activeConnections > 0 ? 'text-cyan-400 font-bold' : ''}>
                  Conns: {server.activeConnections}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}