import React, { useState, useEffect, useRef } from 'react';

const TabletScreen = ({ messages, onPenMove }) => {
    const [queue, setQueue] = useState([]);
    const [completedLines, setCompletedLines] = useState([]);

    // Active Typing State
    const [currentMessage, setCurrentMessage] = useState(null);
    const [typingLine, setTypingLine] = useState('');

    // PAGE CLEAR STATE
    const [isClearing, setIsClearing] = useState(false);

    // RE-ENABLE CALIBRATION (New defaults for smaller pen) -- Removed in final, ensuring clean slate if needed
    // ...

    const lastMsgIdRef = useRef(null);
    const cursorRef = useRef(null);
    const bottomRef = useRef(null);
    const containerRef = useRef(null);

    // 0. INITIAL STARTUP MESSAGE REMOVED
    useEffect(() => {
        // Empty on start
        setQueue([]);
    }, []);

    // 1. INGESTION
    useEffect(() => {
        if (!messages || messages.length === 0) return;
        const latestMsg = messages[messages.length - 1];
        if (lastMsgIdRef.current === latestMsg.id) return;
        lastMsgIdRef.current = latestMsg.id;
        setQueue(prev => [...prev, latestMsg]);
    }, [messages]);

    // 2. DISPATCHER (With Page Clear Logic)
    useEffect(() => {
        // Only dispatch if not typing, not clearing, and have messages
        if (!currentMessage && queue.length > 0 && !isClearing) {

            // CHECK PAGE LIMIT (12 Lines)
            if (completedLines.length >= 12) {
                setIsClearing(true);

                // Wait for Glitch Animation (500ms) + Pen Parking (150ms)
                setTimeout(() => {
                    setCompletedLines([]); // Wipe Screen
                    setIsClearing(false);  // Resume
                }, 800); // Slightly longer than anim to ensure clean state
                return;
            }

            const next = queue[0];
            setQueue(prev => prev.slice(1));
            setCurrentMessage(next);
        }
    }, [queue, currentMessage, isClearing, completedLines]);

    // 3. ANIMATOR
    useEffect(() => {
        if (!currentMessage) return;

        let textToType = currentMessage.message || "";

        // HARD LIMIT: 38 Chars to prevent wrapping
        if (textToType.length > 38) {
            textToType = textToType.substring(0, 38) + "...";
        }

        let charIndex = 0;
        const speed = 30;

        const interval = setInterval(() => {
            const currentText = textToType.slice(0, charIndex + 1);
            setTypingLine(currentText);
            charIndex++;

            if (charIndex > textToType.length) {
                clearInterval(interval);

                setCompletedLines(prev => {
                    // Simply append, do not slice. The Dispatcher handles the clearing now.
                    return [...prev, textToType];
                });

                setTypingLine('');
                setCurrentMessage(null);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [currentMessage]);

    // 4. PEN TRACKING (FINAL CALIBRATION + PARKING)
    useEffect(() => {
        // USER PROVIDED CALIBRATION (X: 5, Y: -160)
        const calX = 5;
        const calY = -160;

        // Park if no message OR if clearing
        if (!currentMessage || isClearing) {
            // IDLE / PARKING STATE
            if (containerRef.current && onPenMove) {
                const rect = containerRef.current.getBoundingClientRect();

                // Calculate Tablet Dimensions based on known percentages
                // Screen Width is 72% of Tablet Width
                const tabletWidth = rect.width / 0.72;

                // Screen Left is 14.5% of Tablet Width
                // Tablet Left = Screen Left - (Tablet Width * 0.145)
                const tabletLeft = rect.left - (tabletWidth * 0.145);

                // Tablet Right Edge
                const tabletRight = tabletLeft + tabletWidth;

                // Park just outside the tablet right edge
                onPenMove({
                    x: tabletRight + 200,
                    y: rect.bottom - 100 + calY, // Rest lower down
                    isHidden: false,
                    duration: '150ms',     // HYPER FAST exit
                    easing: 'ease-in',     // Accelerate out
                    blur: '20px'           // HEAVY motion blur
                });
            }
            return;
        }

        // TYPING STATE
        if (!cursorRef.current || !onPenMove) return;
        const rect = cursorRef.current.getBoundingClientRect();

        // Simulate Handwriting Vertical Movement (Jitter)
        // Alternate up/down + random noise
        const strokeCycle = typingLine.length % 4; // 0, 1, 2, 3
        let jitterY = 0;
        if (strokeCycle === 0) jitterY = -4; // Up
        else if (strokeCycle === 1) jitterY = -2;
        else if (strokeCycle === 2) jitterY = 2; // Down
        else jitterY = 4;

        // Add a bit of random chaos
        jitterY += (Math.random() * 2 - 1);

        onPenMove({
            x: rect.left + calX,
            y: rect.top + calY + jitterY,
            isHidden: false,
            duration: '30ms',       // Ultra fast matching typing speed
            easing: 'linear',       // Precise
            blur: '0px'             // Sharp
        });
    }, [typingLine, currentMessage, isClearing, onPenMove]);

    return (
        <div ref={containerRef} className="w-full h-full flex flex-col justify-start px-2 py-2 relative">
            <style>{`
            .font-caveat {
                font-family: 'Caveat', cursive;
            }
            .text-neon-green {
                color: #00ff41;
                text-shadow: 0 0 2px rgba(0, 255, 65, 0.4); 
            }
        `}</style>
            {/* CONDITIONAL CLASS: glitch-active when clearing */}
            <div className={`flex-1 overflow-hidden flex flex-col justify-start pt-1 text-green-400 text-neon-green font-caveat ${isClearing ? 'glitch-active' : ''}`}>
                {completedLines.map((line, idx) => (
                    <div key={idx} className="text-lg md:text-xl leading-6 mb-0.5 opacity-90 truncate font-bold">
                        {line}
                    </div>
                ))}

                <div className="text-lg md:text-xl leading-6 font-bold truncate min-h-[1.5rem]">
                    {typingLine}
                    {/* Cursor can remain or be removed/changed for handwriting style */}
                    <span ref={cursorRef} className="opacity-0">|</span>
                </div>
            </div>
        </div>
    );
};

export default TabletScreen;
