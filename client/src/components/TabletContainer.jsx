import React, { useState, useEffect } from 'react';
import TabletScreen from './TabletScreen';
import Pen from './Pen';

// Using public folder path.
const tabletImgPath = "/assets/tablet_bg.png";

const TabletContainer = ({ messages, stats }) => {
    const [penPosition, setPenPosition] = useState({ x: -200, y: -200, isHidden: true });

    // Debug State
    const [debugMsg, setDebugMsg] = useState("Initializing...");
    const [msgCount, setMsgCount] = useState(0);

    useEffect(() => {
        setMsgCount(messages.length);
        if (messages.length > 0) {
            setDebugMsg(`Last: ${messages[messages.length - 1].message}`);
        } else {
            setDebugMsg("Waiting for messages...");
        }
    }, [messages]);

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
            <div
                className="absolute z-[20] overflow-hidden"
                style={{
                    top: '15%',
                    left: '10%',
                    width: '80%',
                    height: '70%',
                }}
            >
                <TabletScreen
                    messages={messages}
                    onPenMove={setPenPosition}
                />
            </div>

            {/* PEN - z-index 50 (Top) */}
            <Pen position={penPosition} />

            {/* DEBUG OVERLAY - z-index 100 (Topmost) - Keeping small debug for user assurance */}
            <div className="absolute top-0 left-0 z-[100] bg-black/90 p-2 text-green-400 font-mono text-xs opacity-50 hover:opacity-100 pointer-events-auto border-b border-r border-green-500">
                <p className="font-bold">SYSTEM READY</p>
                <p>MSG: {msgCount}</p>
            </div>

        </div>
    );
};

export default TabletContainer;
