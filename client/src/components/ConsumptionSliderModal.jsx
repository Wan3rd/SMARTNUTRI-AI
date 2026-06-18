import React, { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, Utensils } from 'lucide-react';

const LabelMap = {
  0: 'None',
  25: 'A Little',
  50: 'Half',
  75: 'Mostly',
  100: 'Finished'
};

const EmojiMap = {
  0: '🍽️',      // Empty plate
  25: '🥣',     // A little
  50: '🥗',     // Half eaten
  75: '🍱',     // Mostly eaten
  100: '😋'     // Finished
};

const DescriptionMap = {
  0: 'No food was consumed.',
  25: 'A few bites were taken.',
  50: 'About half the plate was eaten.',
  75: 'Most of the meal was finished.',
  100: 'The plate was completely cleared!'
};

export default function ConsumptionSliderModal({ value, onChange, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [mounted, setMounted] = useState(false);
  const clipPathId = useId();

  // Sync state with parent prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalValue(value);
    }
  }, [isOpen, value]);

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  const handleConfirm = () => {
    onChange(localValue);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const currentLabel = LabelMap[value] || `${value}%`;

  const triggerButton = (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className={
        compact
          ? "w-full bg-[var(--color-bg-card)] text-xs font-black text-[var(--color-text-main)] uppercase border border-[var(--color-divider)] rounded-xl px-2.5 py-1.5 hover:border-[var(--color-primary)] outline-none transition-all text-left flex items-center justify-between shadow-sm cursor-pointer"
          : "w-full p-3 rounded-xl border-2 border-[var(--color-primary)]/30 bg-[var(--color-bg-card)] text-sm font-bold text-[var(--color-text-main)] hover:border-[var(--color-primary)]/60 focus:ring-4 focus:ring-[var(--color-primary)]/20 outline-none transition-all text-left flex items-center justify-between cursor-pointer"
      }
    >
      <span className="flex items-center gap-2">
        <span className="text-base">{EmojiMap[value] || '🍽️'}</span>
        <span>{currentLabel} ({value}%)</span>
      </span>
      <ChevronDown size={compact ? 14 : 16} className="text-[var(--color-text-muted)]" />
    </button>
  );

  if (!mounted) return triggerButton;

  return (
    <>
      {triggerButton}

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center overflow-hidden overscroll-none">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCancel}
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
              />

              {/* Modal Sheet / Dialog */}
              <motion.div
                initial={{ y: '100%', opacity: 0.5, scale: window.innerWidth >= 640 ? 0.95 : 1 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: '100%', opacity: 0.5, scale: window.innerWidth >= 640 ? 0.95 : 1 }}
                transition={{ type: 'spring', damping: 26, stiffness: 240 }}
                className="relative w-full max-h-[90vh] sm:max-w-md bg-[var(--color-bg-card)] rounded-t-[2.5rem] sm:rounded-[2.5rem] border-t sm:border border-[var(--color-divider)] shadow-2xl p-6 flex flex-col items-center gap-6 z-10 overflow-y-auto scrollbar-hide"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Mobile Drag/Indicator bar */}
                <div className="w-12 h-1 bg-[var(--color-divider)] rounded-full sm:hidden shrink-0 -mt-2 mb-2" />

                {/* Header */}
                <div className="w-full flex items-center justify-between pb-2 border-b border-[var(--color-divider)]">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-secondary)] dark:text-white flex items-center gap-1.5">
                    <Utensils size={14} className="text-[var(--color-primary)]" />
                    Meal Consumption
                  </h3>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="p-1.5 hover:bg-[var(--color-divider)]/40 rounded-full transition-all text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* SVG Plate Fill Visual */}
                <div className="relative flex flex-col items-center justify-center py-2">
                  <div className="relative w-36 h-36 flex items-center justify-center bg-[var(--color-bg-page)] rounded-full border-[6px] border-[var(--color-divider)] shadow-inner overflow-hidden">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="food-gradient" x1="0" y1="1" x2="0" y2="0">
                          <stop offset="0%" stopColor="var(--color-primary)" />
                          <stop offset="100%" stopColor="#34d399" />
                        </linearGradient>
                        <clipPath id={clipPathId}>
                          <motion.rect
                            x="0"
                            width="100"
                            animate={{ y: 100 - localValue, height: localValue }}
                            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                          />
                        </clipPath>
                      </defs>

                      {/* Plate inner background pattern (empty slate) */}
                      <circle cx="50" cy="50" r="44" fill="rgba(var(--color-divider-rgb, 120, 120, 120), 0.05)" />

                      {/* Food content visible through the clipPath */}
                      <g clipPath={`url(#${clipPathId})`}>
                        {/* Food base */}
                        <circle cx="50" cy="50" r="44" fill="url(#food-gradient)" />
                        
                        {/* Floating elements inside food (peas, carrots, corn) to represent meal composition */}
                        <circle cx="34" cy="46" r="2.5" fill="#fef08a" opacity="0.85" />
                        <circle cx="66" cy="54" r="3.5" fill="#fed7aa" opacity="0.85" />
                        <circle cx="48" cy="66" r="2.5" fill="#fca5a5" opacity="0.85" />
                        <circle cx="58" cy="34" r="2" fill="#fef08a" opacity="0.85" />
                        <circle cx="40" cy="74" r="3" fill="#fed7aa" opacity="0.85" />
                        <circle cx="62" cy="72" r="2" fill="#fca5a5" opacity="0.85" />
                        <circle cx="28" cy="58" r="3.5" fill="#a7f3d0" opacity="0.85" />
                        <circle cx="72" cy="42" r="2.5" fill="#a7f3d0" opacity="0.85" />
                        
                        {/* Extra veggies texture */}
                        <circle cx="44" cy="38" r="1.5" fill="#fcd34d" opacity="0.9" />
                        <circle cx="54" cy="50" r="2.5" fill="#fb923c" opacity="0.9" />
                        <circle cx="38" cy="58" r="2" fill="#f87171" opacity="0.9" />
                        <circle cx="50" cy="80" r="1.8" fill="#34d399" opacity="0.9" />
                      </g>

                      {/* Fine border representing the inner rim of the plate */}
                      <circle cx="50" cy="50" r="44" fill="none" stroke="var(--color-divider)" strokeWidth="0.5" opacity="0.3" />
                    </svg>

                    {/* Emoji visual helper in the center */}
                    <motion.div
                      key={localValue}
                      initial={{ scale: 0.5, rotate: -10 }}
                      animate={{ 
                        scale: localValue === 100 ? [1, 1.3, 1.2] : 1,
                        rotate: localValue === 100 ? [0, -10, 10, 0] : 0
                      }}
                      transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                      className="absolute inset-0 flex items-center justify-center text-4xl select-none z-10 filter drop-shadow-md pointer-events-none"
                    >
                      {EmojiMap[localValue] || '🍽️'}
                    </motion.div>
                  </div>

                  {/* Assessment Labels */}
                  <div className="text-center mt-5 space-y-1">
                    <motion.p 
                      key={localValue + '-label'}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-2xl font-black text-[var(--color-text-main)] dark:text-white uppercase tracking-tight leading-none"
                    >
                      {LabelMap[localValue]}
                    </motion.p>
                    <p className="text-xs font-black text-[var(--color-primary)] uppercase tracking-widest">
                      {localValue}% Eaten
                    </p>
                    <motion.p
                      key={localValue + '-desc'}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.7 }}
                      className="text-[10px] italic text-[var(--color-text-muted)] max-w-[280px] mx-auto leading-relaxed mt-1"
                    >
                      {DescriptionMap[localValue]}
                    </motion.p>
                  </div>
                </div>

                {/* Range Slider Track */}
                <div className="w-full px-2 space-y-4">
                  <div className="relative pt-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="25"
                      value={localValue}
                      onChange={(e) => setLocalValue(parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg bg-[var(--color-divider)] appearance-none cursor-pointer accent-[var(--color-primary)] outline-none"
                      style={{
                        background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${localValue}%, var(--color-divider) ${localValue}%, var(--color-divider) 100%)`
                      }}
                    />
                  </div>

                  {/* Snapped Labels */}
                  <div className="flex justify-between text-[8px] sm:text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">
                    {Object.entries(LabelMap).map(([pct, text]) => {
                      const isActive = localValue === parseInt(pct);
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setLocalValue(parseInt(pct))}
                          className={`focus:outline-none transition-all uppercase ${
                            isActive 
                              ? 'text-[var(--color-primary)] font-black scale-110' 
                              : 'hover:text-[var(--color-text-main)]'
                          }`}
                        >
                          {text} ({pct}%)
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Selection Chips */}
                <div className="w-full space-y-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                    Quick Picks
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[0, 25, 50, 75, 100].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setLocalValue(val)}
                        className={`py-2 rounded-xl text-xs font-black border-2 uppercase transition-all tracking-tighter cursor-pointer ${
                          localValue === val
                            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md shadow-[var(--color-primary)]/20 scale-[1.03]'
                            : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-divider)] hover:border-[var(--color-primary)]/50'
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="w-full grid grid-cols-2 gap-3 mt-1 pt-3 border-t border-[var(--color-divider)]">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="w-full py-3 rounded-2xl border-2 border-[var(--color-divider)] text-xs font-black uppercase text-[var(--color-text-muted)] hover:bg-[var(--color-divider)]/25 active:scale-[0.97] transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="w-full py-3 rounded-2xl bg-[var(--color-primary)] text-xs font-black uppercase text-white hover:opacity-90 active:scale-[0.97] transition-all shadow-lg shadow-[var(--color-primary)]/20 cursor-pointer"
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
