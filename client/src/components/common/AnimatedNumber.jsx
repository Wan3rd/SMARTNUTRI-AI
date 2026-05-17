import React, { useEffect, useState } from 'react';

export default function AnimatedNumber({ value, duration = 1000 }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // easeOutQuart
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            setDisplayValue(Math.floor(easeProgress * value));
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                setDisplayValue(value);
            }
        };
        window.requestAnimationFrame(step);
    }, [value, duration]);

    return <span>{displayValue}</span>;
}
