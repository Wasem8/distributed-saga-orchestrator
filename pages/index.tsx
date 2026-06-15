import React from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { Layers, GitFork, ShieldCheck, Terminal } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center relative overflow-hidden font-sans">
      <Head>
        <title>Distributed Systems Lab</title>
      </Head>

      {/* تأثير شبكة الخلفية والخلفية المضيئة (Ambient Glow) لإعطاء عمق بصري */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="z-10 text-center max-w-2xl px-4 space-y-8">
        
        {/* العناوين الرئيسية المحدثة بتدرج لوني فخم */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 px-3 py-1 rounded-full text-xs font-mono text-cyan-400 shadow-inner">
            <Terminal className="w-3.5 h-3.5 animate-pulse" /> Status: Cluster Operational
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-b from-white via-gray-200 to-gray-500 bg-clip-text text-transparent tracking-tight">
            Distributed Systems Control Center
          </h1>
          <p className="text-xs md:text-sm text-gray-500 font-mono">
            Advanced Simulation Environments & Architecture Laboratory
          </p>
        </header>

        {/* شبكة البوابات المختبرية (Bento-Style Navigation Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full mt-4">
          
          {/* كارت معمل الـ Saga Orchestrator */}
          <div className="bg-gray-900/60 border border-gray-850 p-6 rounded-2xl flex flex-col justify-between hover:border-blue-500/40 hover:bg-gray-900 transition-all duration-300 group shadow-lg backdrop-blur-sm">
            <div className="text-left space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-950/50 border border-blue-900 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <GitFork className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-200 pt-2 group-hover:text-blue-400 transition-colors">
                Saga Orchestrator
              </h3>
              <p className="text-[11px] text-gray-500 font-mono leading-relaxed">
                Microservices transaction rollback coordinator simulation via compensating workflow maps.
              </p>
            </div>
            
            <Link href="/saga" className="mt-5">
              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-colors shadow-md shadow-blue-900/20">
                Open Orchestrator
              </button>
            </Link>
          </div>

          {/* كارت معمل الـ Load Balancer */}
          <div className="bg-gray-900/60 border border-gray-850 p-6 rounded-2xl flex flex-col justify-between hover:border-purple-500/40 hover:bg-gray-900 transition-all duration-300 group shadow-lg backdrop-blur-sm">
            <div className="text-left space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-950/50 border border-purple-900 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-gray-200 pt-2 group-hover:text-purple-400 transition-colors">
                Load Balancer Mesh
              </h3>
              <p className="text-[11px] text-gray-500 font-mono leading-relaxed">
                High-throughput routing matrix evaluation featuring 12 dynamic distribution algorithms.
              </p>
            </div>
            
            <Link href="/load-balancer" className="mt-5">
              <button className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-colors shadow-md shadow-purple-900/20">
                Open Mesh Map
              </button>
            </Link>
          </div>

        </div>

        {/* تذييل الصفحة الاحترافي الصغير */}
        <footer className="pt-6 flex justify-center items-center gap-1.5 text-[10px] text-gray-600 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Secure Sandbox Environment • v2.6.0
        </footer>

      </div>
    </div>
  );
}