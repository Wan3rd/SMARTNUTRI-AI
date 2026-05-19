import React, { useEffect, useState } from 'react';
import { Clock, ShieldAlert, RefreshCw } from 'lucide-react';

export default function Maintenance() {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        // Count up elapsed seconds since landing here
        const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatElapsed = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
    };

    return (
        <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 font-sans overflow-hidden relative">
            {/* Animated background grid */}
            <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }} />

            {/* Glow blobs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative max-w-lg w-full text-center space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Icon */}
                <div className="inline-flex relative">
                    <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl animate-pulse" />
                    <div className="relative h-28 w-28 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl shadow-indigo-500/20 p-3">
                        <img src="/SmartNutri-logo.png" alt="SmartNutri" className="h-full w-full object-contain drop-shadow-lg" />
                    </div>
                </div>

                {/* Text */}
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                        System Unavailable
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                        Under <span className="text-indigo-400">Maintenance</span>
                    </h1>
                    <p className="text-zinc-400 font-medium leading-relaxed max-w-sm mx-auto">
                        SmartNutri-AI is currently undergoing scheduled maintenance to ensure the highest level of security and performance for your patients.
                    </p>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <div className="p-5 bg-zinc-900/80 backdrop-blur-md rounded-3xl border border-zinc-800 flex items-center gap-4">
                        <div className="h-11 w-11 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 shrink-0">
                            <Clock size={22} />
                        </div>
                        <div>
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Waiting</h3>
                            <p className="text-sm font-black text-white">{formatElapsed(elapsed)}</p>
                        </div>
                    </div>

                    <div className="p-5 bg-zinc-900/80 backdrop-blur-md rounded-3xl border border-zinc-800 flex items-center gap-4">
                        <div className="h-11 w-11 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 shrink-0">
                            <ShieldAlert size={22} />
                        </div>
                        <div>
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Status</h3>
                            <p className="text-sm font-black text-white">Admin Controlled</p>
                        </div>
                    </div>
                </div>

                {/* Retry Button */}
                <button
                    onClick={() => window.location.href = '/'}
                    className="group inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30"
                >
                    <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                    Try Again
                </button>

                {/* Footer */}
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                    Urgent issue?{' '}
                    <a href="mailto:support@smartnutri.ai" className="text-indigo-500 hover:text-indigo-400 transition-colors">
                        Contact Clinical Support
                    </a>
                </p>
            </div>
        </div>
    );
}
