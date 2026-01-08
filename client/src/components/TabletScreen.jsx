import React, { useState, useEffect, useRef } from 'react';

const TabletScreen = ({ messages, onPenMove }) => {
    const [queue, setQueue] = useState([]);
    const [completedLines, setCompletedLines] = useState([]);

    // Active Typing State
    const [currentMessage, setCurrentMessage] = useState(null);
    const [typingLine, setTypingLine] = useState('');

    // PAGE CLEAR STATE
    const [isClearing, setIsClearing] = useState(false);

    // TRAVEL STATE (Sync Fix)
    const [isTraveling, setIsTraveling] = useState(false);

    // Overflow Flag
    const overflowRef = useRef(false);

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

            // START TRAVEL: Move pen first, then type
            setIsTraveling(true);
            setCurrentMessage(next);

            // Delay typing for 600ms to allow pen to arrive
            setTimeout(() => {
                setIsTraveling(false);
            }, 600);
        }
    }, [queue, currentMessage, isClearing, completedLines]);

    // 3. ANIMATOR
    useEffect(() => {
        if (!currentMessage || isTraveling) return; // Wait for travel to finish

        const textToType = currentMessage.message || "";
        // No hard limit. We rely on overflowRef now.

        // Reset overflow flag for new message
        overflowRef.current = false;

        let charIndex = 0;
        const speed = 30;

        const interval = setInterval(() => {
            // CHECK DYNAMIC OVERFLOW
            if (overflowRef.current) {
                clearInterval(interval);

                // Truncate the current visible line
                // Remove last few chars to fit ellipsis
                setTypingLine(prev => {
                    const truncated = prev.slice(0, -2) + "...";
                    // Commit the truncated line
                    setCompletedLines(c => [...c, truncated]);
                    return ''; // Clear typing line for next step (which is ending)
                });

                setCurrentMessage(null);
                setTypingLine('');
                return;
            }

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
    }, [currentMessage, isTraveling]); // Add isTraveling dependency

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

        if (!cursorRef.current || !onPenMove) return;
        const rect = cursorRef.current.getBoundingClientRect();

        // CHECK FOR VISUAL OVERFLOW
        if (containerRef.current) {
            const containerRight = containerRef.current.getBoundingClientRect().right;
            // Buffer of 20px
            if (rect.right > containerRight - 20) {
                overflowRef.current = true;
                // Do not update pen position if overflowing to avoid going off-screen
                // The Animator will catch this in next tick
                return;
            }
        }

        // TRAVELING STATE (New) - Smooth move to start position
        if (isTraveling) {
            onPenMove({
                x: rect.left + calX,
                y: rect.top + calY, // No jitter
                isHidden: false,
                duration: '500ms',  // Travel time
                easing: 'ease-out', // Smooth arrival
                blur: '4px'         // Slight motion blur
            });
            return;
        }

        // TYPING STATE (Jittery)
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
    }, [typingLine, currentMessage, isClearing, isTraveling, onPenMove]);

    return (
        <div ref={containerRef} className="w-full h-full flex flex-col justify-start px-2 py-2 relative">
            <style>{`
            .font-caveat {
                font-family: 'Caveat', cursive;
            }
            .text-neon-cyan {
                color: #00f3ff;
                text-shadow: 0 0 2px rgba(0, 243, 255, 0.4), 0 0 8px rgba(0, 243, 255, 0.2); 
            }
            
            @keyframes wetInkAnim {
                0% {
                    color: #ffffff;
                    text-shadow: 0 0 8px rgba(255, 255, 255, 0.9), 0 0 15px rgba(255, 255, 255, 0.6);
                }
                100% {
                    color: #00f3ff;
                    text-shadow: 0 0 2px rgba(0, 243, 255, 0.4), 0 0 8px rgba(0, 243, 255, 0.2);
                }
            }

            .wet-char {
                animation: wetInkAnim 0.6s ease-out forwards;
            }
        `}</style>
            {/* CONDITIONAL CLASS: glitch-active when clearing */}
            <div className={`flex-1 overflow-hidden flex flex-col justify-start pt-1 text-cyan-400 text-neon-cyan font-caveat ${isClearing ? 'glitch-active' : ''}`}>
                {completedLines.map((line, idx) => (
                    <div key={idx} className="text-lg md:text-xl leading-6 mb-0.5 opacity-90 truncate font-bold">
                        {line}
                    </div>
                ))}

                {/* Only show typing line if we have space (less than 12 lines) */}
                {completedLines.length < 12 && (
                    <div className="text-lg md:text-xl leading-6 font-bold truncate min-h-[1.5rem]">
                        {typingLine.split('').map((char, index) => (
                            <span key={index} className="wet-char">{char}</span>
                        ))}
                        {/* Cursor can remain or be removed/changed for handwriting style */}
                        <span ref={cursorRef} className="opacity-0">|</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TabletScreen;
