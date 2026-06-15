import React from 'react';
import { ServerNode } from '../services/LoadBalancer';

interface ServerCardProps {
  server: ServerNode;
  highlighted: boolean;
  onToggleHealth: (id: string) => void;
  onRemove: (id: string) => void;
  onWeightChange: (id: string, weight: number) => void;
  canRemove: boolean;
}

export default function ServerCard({
  server,
  highlighted,
  onToggleHealth,
  onRemove,
  onWeightChange,
  canRemove,
}: ServerCardProps) {
  return (
    <div
      className={`
        rounded-2xl border p-4
        bg-gradient-to-b from-gray-900 to-gray-950
        transition-all duration-300
        hover:-translate-y-1
        hover:border-cyan-700
        ${
          highlighted
            ? "border-yellow-500 ring-2 ring-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]"
            : "border-gray-850"
        }
        ${
          !server.isHealthy
            ? "opacity-50 border-red-950 bg-red-950/5"
            : ""
        }
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-cyan-400 text-sm truncate max-w-[120px]">
            {server.name}
          </h3>

          <button
            onClick={() => onToggleHealth(server.id)}
            className={`
              mt-2 px-2.5 py-0.5 rounded-full text-[9px]
              border font-bold tracking-wide transition-all
              ${
                server.isHealthy
                  ? "bg-green-950 text-green-400 border-green-900"
                  : "bg-red-950 text-red-400 border-red-900"
              }
            `}
          >
            ● {server.isHealthy ? "Healthy" : "Offline"}
          </button>
        </div>

        {canRemove && (
          <button
            onClick={() => onRemove(server.id)}
            className="text-gray-600 hover:text-red-400 text-xs p-1 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Metrics */}
      <div className="mt-4 space-y-2 text-xs font-mono">
        <div className="flex justify-between">
          <span className="text-gray-500">Active Conns</span>
          <span className="text-cyan-400 font-bold">{server.activeConnections}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Latency</span>
          <span className="text-amber-400 font-bold">{server.responseTime} ms</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Requests</span>
          <span className="text-green-400 font-bold">{server.processedRequests}</span>
        </div>
      </div>

      {/* Weight Input */}
      <div className="mt-3.5">
        <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
          Static Weight
        </label>
        <input
          type="number"
          min={1}
          max={10}
          value={server.weight}
          onChange={(e) =>
            onWeightChange(
              server.id,
              Math.max(1, Number(e.target.value))
            )
          }
          className="
            mt-1
            w-full
            bg-gray-850
            border
            border-gray-750
            rounded-lg
            p-1.5
            text-center
            text-xs
            font-mono
            text-gray-200
            focus:outline-none
            focus:border-cyan-500
          "
        />
      </div>

      {/* CPU Progress Bar */}
      <div className="mt-3.5">
        <div className="flex justify-between text-[10px] text-gray-500 font-mono">
          <span>CPU USAGE</span>
          <span className="font-bold">{server.cpuUsage}%</span>
        </div>

        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1">
          <div
            className={`
              h-full transition-all duration-500
              ${
                server.cpuUsage > 75
                  ? "bg-red-500"
                  : server.cpuUsage > 45
                  ? "bg-amber-500"
                  : "bg-green-500"
              }
            `}
            style={{
              width: `${server.cpuUsage}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}