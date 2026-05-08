import React from 'react';
import { cn } from '../../lib/utils';

const Button = React.forwardRef(({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
        primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-sm dark:text-gray-900',
        accent: 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-sm dark:text-gray-900',
        outline: 'border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white dark:hover:text-gray-900',
        ghost: 'text-[var(--color-text-muted)] hover:bg-gray-100 hover:text-[var(--color-text-main)] dark:hover:bg-white/5 dark:text-[var(--color-text-muted)] dark:hover:text-white',
    };

    const sizes = {
        sm: 'h-8 px-4 text-xs',
        md: 'h-10 px-6 text-sm',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10 p-2',
    };

    return (
        <button
            ref={ref}
            className={cn(
                'inline-flex items-center justify-center rounded-full font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-white cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        />
    );
});

Button.displayName = 'Button';

export { Button };
