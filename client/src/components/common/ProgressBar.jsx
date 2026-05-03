import React from 'react';
import { cn } from '../../lib/utils';

const ProgressBar = React.forwardRef(({ value = 0, max = 100, className, indicatorColor, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
        <div
            ref={ref}
            className={cn(
                'h-2.5 w-full overflow-hidden rounded-full bg-gray-100',
                className
            )}
            {...props}
        >
            <div
                className={cn('h-full w-full flex-1 transition-all duration-500 ease-in-out', indicatorColor || 'bg-[var(--color-primary)]')}
                style={{ transform: `translateX(-${100 - percentage}%)` }}
            />
        </div>
    );
});
ProgressBar.displayName = 'ProgressBar';

export { ProgressBar };
