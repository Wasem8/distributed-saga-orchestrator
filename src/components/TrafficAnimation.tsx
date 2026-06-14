// src/components/TrafficAnimation.tsx
import React from 'react';

interface TrafficAnimationProps {
  activeServerId: string | null;
  triggerKey: number; // مفتاح لإعادة تشغيل الأنيميشن مع كل ضغطة زر
}

export default function TrafficAnimation({ activeServerId, triggerKey }: TrafficAnimationProps) {
  return (
    <div className="w-full bg-gray-900 border border-gray-800 rounded-xl p-8 flex flex-col items-center justify-center my-6 relative overflow-hidden">
      <div className="text-xs text-gray-500 uppercase tracking-widest mb-6">Live Traffic Ingress Simulation Router</div>
      
      <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-2xl relative gap-8 md:gap-0">
        
        {/* العقدة الرئيسية: موازن الأحمال */}
        <div className="z-10 bg-blue-600 border-2 border-blue-400 text-white font-bold p-5 rounded-2xl shadow-xl shadow-blue-900/40 text-center w-36 text-sm flex flex-col gap-1 items-center">
          <span className="text-xl">🎛️</span>
          <span>Load Balancer</span>
        </div>

        {/* شبكة مسارات الخطوط التنافسية والمتحركة */}
        <div className="flex-1 w-full md:w-auto h-40 md:h-48 flex flex-col justify-between relative px-6">
          
          {/* مسار السيرفر الأول (Node 1) */}
          <div className="w-full h-1 bg-gray-800 relative rounded-full">
            {activeServerId === 'srv-1' && (
              <div 
                key={`anim-1-${triggerKey}`}
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-green-400 rounded-full shadow-[0_0_12px_#4ade80]" 
                style={{ animation: 'flowForward 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards' }} 
              />
            )}
          </div>

          {/* مسار السيرفر الثاني (Node 2) */}
          <div className="w-full h-1 bg-gray-800 relative rounded-full">
            {activeServerId === 'srv-2' && (
              <div 
                key={`anim-2-${triggerKey}`}
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-purple-400 rounded-full shadow-[0_0_12px_#c084fc]" 
                style={{ animation: 'flowForward 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards' }} 
              />
            )}
          </div>

          {/* مسار السيرفر الثالث (Node 3) */}
          <div className="w-full h-1 bg-gray-800 relative rounded-full">
            {activeServerId === 'srv-3' && (
              <div 
                key={`anim-3-${triggerKey}`}
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-yellow-400 rounded-full shadow-[0_0_12px_#facc15]" 
                style={{ animation: 'flowForward 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards' }} 
              />
            )}
          </div>
        </div>

        {/* الواجهات المستهدفة (Nodes) المستوحاة من صورتك */}
        <div className="flex flex-col gap-4 z-10 w-32 text-xs font-bold">
          <div className={`p-3 rounded-xl border text-center transition-all duration-300 ${activeServerId === 'srv-1' ? 'bg-green-950/80 border-green-400 text-green-300 scale-105 shadow-md shadow-green-900/30' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>Node 1 (High)</div>
          <div className={`p-3 rounded-xl border text-center transition-all duration-300 ${activeServerId === 'srv-2' ? 'bg-purple-950/80 border-purple-400 text-purple-300 scale-105 shadow-md shadow-purple-900/30' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>Node 2 (Med)</div>
          <div className={`p-3 rounded-xl border text-center transition-all duration-300 ${activeServerId === 'srv-3' ? 'bg-yellow-950/80 border-yellow-400 text-yellow-300 scale-105 shadow-md shadow-yellow-900/30' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>Node 3 (Low)</div>
        </div>

      </div>

      <style jsx>{`
        @keyframes flowForward {
          0% { left: 0%; opacity: 1; transform: translateY(-50%) scale(1); }
          50% { transform: translateY(-50%) scale(1.3); }
          100% { left: 100%; opacity: 0.2; transform: translateY(-50%) scale(1); }
        }
      `}</style>
    </div>
  );
}