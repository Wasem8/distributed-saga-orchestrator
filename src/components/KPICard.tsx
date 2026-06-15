import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  color?: string;
}

export default function KPICard({
  title,
  value,
  color = "text-cyan-400",
}: KPICardProps) {
  return (
    <div className="bg-gray-900 border border-gray-850 rounded-xl p-4 shadow-sm">
      <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
        {title}
      </div>
      <div className={`text-2xl font-black mt-1.5 font-mono ${color}`}>
        {value}
      </div>
    </div>
  );
}