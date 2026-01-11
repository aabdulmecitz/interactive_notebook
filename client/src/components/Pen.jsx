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
        </motion.div>
    );
};

export default Pen;
