import React, { useEffect } from 'react';
import { motion, useSpring, useTransform, useMotionValue, useVelocity } from 'framer-motion';
import handOverlay from '../assets/hand_overlay.png';

const penImgPath = handOverlay;

const Pen = ({ position }) => {
    // Motion Values for position
    const x = useSpring(position.x, { stiffness: 700, damping: 40 }); // Tighter spring
    const y = useSpring(position.y, { stiffness: 700, damping: 40 });

    // Velocity-based Skew (Mock Motion Blur)
    const xVelocity = useVelocity(x);
    // Skew based on speed: faster = more tilt
    // Range: -5000px/s -> 20deg skew
    const skewX = useTransform(xVelocity, [-2000, 0, 2000], [10, 0, -10]);
    // Opacity drop on very fast movement (Ghosting feel)
    const opacity = useTransform(xVelocity, [-3000, 0, 3000], [0.8, 1, 0.8]);

    useEffect(() => {
        // Update spring targets when props change
        x.set(position.x);
        y.set(position.y);
    }, [position.x, position.y, x, y]);

    return (
        <motion.div
            className="fixed pointer-events-none z-50 will-change-transform"
            style={{
                x,
                y,
                skewX, // Apply motion blur skew
                opacity,
                top: 0,
                left: 0,
                position: 'fixed' // Redundant but safe
            }}
        >
            <img
                src={penImgPath}
                alt="Pen"
                className="drop-shadow-2xl"
                style={{
                    width: '500px',
                    maxWidth: 'none',
                    height: 'auto',
                    minWidth: '500px'
                }}
            />
            {/* PEN TIP SPARK EFFECT */}
            <div
                className="absolute top-[170px] left-[1px] w-3 h-3 pointer-events-none z-[60]"
                style={{ transform: 'translate(-50%, -50%)' }}
            >
                {/* Main Core */}
                <div
                    className="absolute inset-0 rounded-full mix-blend-screen"
                    style={{
                        background: 'radial-gradient(circle, #ffffff 0%, #00f3ff 60%, transparent 100%)',
                        boxShadow: '0 0 5px #00f3ff, 0 0 10px #00f3ff',
                        animation: 'spark-pulse 0.05s infinite alternate'
                    }}
                ></div>

                {/* Particles */}
                <div className="particle p1"></div>
                <div className="particle p2"></div>
                <div className="particle p3"></div>
                <div className="particle p4"></div>
            </div>

            <style>{`
                @keyframes spark-pulse {
                    0% { transform: scale(0.8); opacity: 0.8; }
                    100% { transform: scale(1.2); opacity: 1; }
                }

                .particle {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 2px;
                    height: 2px;
                    background: #ffffff;
                    border-radius: 50%;
                    pointer-events: none;
                    opacity: 0;
                    box-shadow: 0 0 4px #00f3ff;
                }

                .p1 { animation: particle-fly-1 0.4s infinite linear; }
                .p2 { animation: particle-fly-2 0.5s infinite linear 0.1s; }
                .p3 { animation: particle-fly-3 0.3s infinite linear 0.05s; }
                .p4 { animation: particle-fly-4 0.45s infinite linear 0.2s; }

                @keyframes particle-fly-1 {
                    0% { transform: translate(0,0) scale(1); opacity: 1; }
                    100% { transform: translate(-10px, -10px) scale(0); opacity: 0; }
                }
                @keyframes particle-fly-2 {
                    0% { transform: translate(0,0) scale(1); opacity: 1; }
                    100% { transform: translate(12px, -5px) scale(0); opacity: 0; }
                }
                @keyframes particle-fly-3 {
                    0% { transform: translate(0,0) scale(1); opacity: 1; }
                    100% { transform: translate(-5px, 15px) scale(0); opacity: 0; }
                }
                @keyframes particle-fly-4 {
                    0% { transform: translate(0,0) scale(1); opacity: 1; }
                    100% { transform: translate(8px, 10px) scale(0); opacity: 0; }
                }
            `}</style>
        </motion.div>
    );
};

export default Pen;
