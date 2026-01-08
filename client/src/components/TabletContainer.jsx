import React, { useState } from 'react';
import TabletScreen from './TabletScreen';
import Pen from './Pen';

// Using public folder path.
const tabletImgPath = "/assets/tablet_bg.png";

const TabletContainer = ({ messages, stats }) => {
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
                />
            </div>

            {/* PEN - z-index 50 (Top) */}
            <Pen position={penPosition} />

        </div>
    );
};

export default TabletContainer;
