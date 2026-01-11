import React, { useState } from 'react';
import TabletScreen from './TabletScreen';
import Pen from './Pen';
import tabletBg from '../assets/tablet_bg.png';

const tabletImgPath = tabletBg;

const TabletContainer = ({ messages, stats, inkSettings }) => {
    const [penPosition, setPenPosition] = useState({ x: -200, y: -200, isHidden: true });

    return (
        // Main Container
        <div className="relative h-[100vh] w-auto aspect-[9/16] bg-black shadow-2xl flex items-center justify-center">

            {/* BACKGROUND IMAGE - z-index 1 (Bottom) */}
            <img
                src={tabletImgPath}
                alt="Background"
                className="absolute inset-0 w-full h-full object-contain z-[1]"
                onError={(e) => { e.target.style.display = 'none'; }}
            />

            {/* SCREEN AREA (TEXT) - z-index 20 (Middle) */}
            {/* FINAL CALIBRATED VALUES: Top: 24.5%, Left: 14.5%, W: 72%, H: 54.5% */}
            <div
                className="absolute z-[20] overflow-hidden"
                style={{
                    top: '24.5%',
                    left: '14.5%',
                    width: '72%',
                    height: '54.5%',
                }}
            >
                <TabletScreen
                    messages={messages}
                    onPenMove={setPenPosition}
                    inkSettings={inkSettings}
                />
            </div>

            {/* PEN - z-index 50 (Top) */}
            <Pen position={penPosition} />

            {/* LIVE DATA HUD - z-index 25 (Above text, below pen) */}
            <div
                className="absolute z-[25] flex justify-between items-start px-8 font-mono text-[10px] font-bold pointer-events-none opacity-80"
                style={{
                    top: '9%',        // Moved to TOP Bezel
                    left: '12%',
                    width: '76%',     // Wider to hug the corners
                    color: 'rgba(0, 243, 255, 0.6)',
                }}
            >
                <div className="flex flex-col items-center">
                    <span className="scramble-text tracking-widest text-[8px] mb-[-2px]">VIEWERS</span>
                    <span className="text-lg text-neon-cyan drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]">
                        {stats.viewers || 0}
                    </span>
                </div>

                {/* Decorative Center Element */}
                <div className="h-px w-8 bg-cyan-900/50 mt-2"></div>

                <div className="flex flex-col items-center">
                    <span className="scramble-text tracking-widest text-[8px] mb-[-2px]">SUBS</span>
                    <span className="text-lg text-neon-cyan drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]">
                        {stats.subscribers || 0}
                    </span>
                </div>
            </div>

        </div>
    );
};

export default TabletContainer;
