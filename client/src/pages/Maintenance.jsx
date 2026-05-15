import React from 'react';
import { Wrench, Clock, ShieldAlert } from 'lucide-react';

export default function Maintenance() {
    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] flex items-center justify-center p-6 font-outfit">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
                {/* Icon Section */}
                <div className="relative inline-flex items-center justify-center">
                    <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                    <div className="relative h-24 w-24 rounded-3xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-blue-600 shadow-2xl">
                        <Wrench size={48} className="animate-bounce" />
                    </div>
                </div>

                {/* Text Content */}
                <div className="space-y-4">
                    <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight uppercase">
                        Clinical <span className="text-blue-600">Update</span>
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                        SmartNutri-AI is currently undergoing scheduled clinical data synchronization and maintenance to ensure the highest level of security for your patients.
                    </p>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="p-6 bg-white dark:bg-zinc-900/50 rounded-[2rem] border-2 border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
                            <Clock size={24} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest mb-1">Expected Back</h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">In approximately 2 hours.</p>
                        </div>
                    </div>
                </div>

                {/* Contact */}
                <div className="pt-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    Urgent clinical issues? <a href="mailto:support@smartnutri.ai" className="text-blue-600 border-b-2 border-blue-600/20">Contact Clinical Support</a>
                </div>
            </div>
        </div>
    );
}
