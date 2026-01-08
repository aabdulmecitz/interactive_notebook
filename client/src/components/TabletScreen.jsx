import React, { useState, useEffect, useRef } from 'react';

const TabletScreen = ({ messages, onPenMove }) => {
    const [queue, setQueue] = useState([]);
    const [completedLines, setCompletedLines] = useState([]);

    // Active Typing State
    const [currentMessage, setCurrentMessage] = useState(null);
    const [typingLine, setTypingLine] = useState('');

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

    // 2. DISPATCHER
    useEffect(() => {
        if (!currentMessage && queue.length > 0) {
            const next = queue[0];
            setQueue(prev => prev.slice(1));
            setCurrentMessage(next);
        }
    }, [queue, currentMessage]);

    // 3. ANIMATOR
    useEffect(() => {
        if (!currentMessage) return;

        const textToType = currentMessage.message || "";
        let charIndex = 0;
        const speed = 30;

        const interval = setInterval(() => {
            const currentText = textToType.slice(0, charIndex + 1);
            setTypingLine(currentText);
            charIndex++;

            if (charIndex > textToType.length) {
                clearInterval(interval);

                setCompletedLines(prev => {
                    const newHistory = [...prev, textToType];
                    if (newHistory.length > 12) return newHistory.slice(newHistory.length - 12);
                    return newHistory;
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

        if (!currentMessage) {
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

        onPenMove({
            x: rect.left + calX,
            y: rect.top + calY,
            isHidden: false,
            duration: '30ms',       // Ultra fast matching typing speed
            easing: 'linear',       // Precise
            blur: '0px'             // Sharp
        });
    }, [typingLine, currentMessage, onPenMove]); // Depend on currentMessage too

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [completedLines, typingLine]);

    return (
        <div ref={containerRef} className="w-full h-full flex flex-col justify-start px-2 py-2 relative">
            <style>{`
            .font-caveat {
                font-family: 'Caveat', cursive;
            }
            .text-neon-green {
                color: #00ff41;
                text-shadow: 0 0 2px rgba(0, 255, 65, 0.4); /* Less glow for handwriting opacity */
            }
        `}</style>

            <div className="flex-1 overflow-hidden flex flex-col justify-start pt-1 text-green-400 text-neon-green font-caveat">
                {completedLines.map((line, idx) => (
                    <div key={idx} className="text-xl md:text-2xl leading-tight mb-1 opacity-90 break-words font-bold">
                        {line}
                    </div>
                ))}

                <div className="text-xl md:text-2xl leading-tight font-bold break-words min-h-[2.5rem]">
                    {typingLine}
                    {/* Cursor can remain or be removed/changed for handwriting style */}
                    <span ref={cursorRef} className="opacity-0">|</span>
                </div>

                <div ref={bottomRef} />
            </div>
        </div>
    );
};

export default TabletScreen;
