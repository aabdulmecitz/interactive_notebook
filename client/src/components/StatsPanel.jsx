import React from 'react';

const StatsPanel = ({ stats }) => {
    return (
        <div className="flex items-center justify-between px-8 py-2 font-mono text-cyber-green text-sm bg-black/60 rounded-lg backdrop-blur-md border-t border-cyber-green/30 shadow-[0_0_10px_rgba(0,255,65,0.2)]">
            <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest">Viewers</span>
                <span className="text-xl font-bold cyber-glow">{stats?.viewers?.toLocaleString() || 0}</span>
            </div>

            <div className="h-8 w-px bg-cyber-green/30 mx-4"></div>

            <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest">Subs</span>
                <span className="text-xl font-bold cyber-glow">{stats?.subscribers?.toLocaleString() || 0}</span>
            </div>
        </div>
    );
};

export default StatsPanel;
