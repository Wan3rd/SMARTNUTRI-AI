import React, { useState, useRef, useEffect } from 'react';
import { Clock, Calendar as CalendarIcon, ChevronDown, Check, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { 
    format, addDays, startOfWeek, isSameDay, parseISO 
} from 'date-fns';

export default function SmartTimePicker({ value, onChange, disabled }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Value parsing
    const selectedDate = value ? new Date(value) : new Date();
    const [currentWeek, setCurrentWeek] = useState(startOfWeek(selectedDate));
    
    const formattedDate = format(selectedDate, 'MMM d');
    const formattedTime = format(selectedDate, 'h:mm a');
    const isToday = isSameDay(new Date(), selectedDate);
    
    // Quick actions
    const setTimeOffset = (hoursOffset, daysOffset = 0) => {
        const now = new Date();
        now.setHours(now.getHours() + hoursOffset);
        now.setDate(now.getDate() + daysOffset);
        
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
        onChange(localISOTime);
        setIsOpen(false);
    };

    // --- CALENDAR LOGIC ---
    const nextWeek = () => setCurrentWeek(addDays(currentWeek, 7));
    const prevWeek = () => setCurrentWeek(addDays(currentWeek, -7));

    const handleDateClick = (day) => {
        const newDate = new Date(selectedDate);
        newDate.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
        
        const offset = newDate.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(newDate - offset)).toISOString().slice(0, 16);
        onChange(localISOTime);
    };

    const handleTimeChange = (val, type) => {
        let h = selectedDate.getHours();
        let m = selectedDate.getMinutes();
        
        if (type === 'hour') {
            const isPM = h >= 12;
            let newH = parseInt(val);
            if (newH === 12) newH = 0; 
            h = newH + (isPM ? 12 : 0);
        } else if (type === 'minute') {
            m = parseInt(val);
        } else if (type === 'ampm') {
            const isPM = h >= 12;
            if (val === 'PM' && !isPM) h += 12;
            if (val === 'AM' && isPM) h -= 12;
        }
        
        const newDate = new Date(selectedDate);
        newDate.setHours(h, m);
        
        const offset = newDate.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(newDate - offset)).toISOString().slice(0, 16);
        onChange(localISOTime);
    };

    const renderCells = () => {
        let days = [];
        let day = currentWeek;

        for (let i = 0; i < 7; i++) {
            const cloneDay = day;
            days.push(
                <button
                    type="button"
                    key={day.toString()}
                    onClick={() => handleDateClick(cloneDay)}
                    className={cn(
                        "w-7 h-7 mx-auto flex items-center justify-center rounded-full text-[11px] font-bold transition-all",
                        isSameDay(day, selectedDate) 
                            ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20" 
                            : "text-[var(--color-text-main)] hover:bg-gray-100 dark:hover:bg-white/10"
                    )}
                >
                    {format(day, 'd')}
                </button>
            );
            day = addDays(day, 1);
        }
        return <div className="grid grid-cols-7 gap-1 mt-1">{days}</div>;
    };

    // Current time states for the dropdowns
    const currentHour12 = selectedDate.getHours() % 12 || 12;
    const currentMinute = selectedDate.getMinutes();
    const currentAmPm = selectedDate.getHours() >= 12 ? 'PM' : 'AM';

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {/* Display Button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full h-[42px] px-3 rounded-lg border flex items-center justify-between transition-all outline-none",
                    isOpen 
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-4 ring-[var(--color-primary)]/10" 
                        : "border-[var(--color-divider)] bg-[var(--color-bg-card)] hover:border-[var(--color-primary)]/50",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            >
                <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-md", isToday ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]" : "bg-gray-100 dark:bg-white/10 text-gray-500")}>
                        <Clock size={14} />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--color-text-main)]">
                            {isToday ? 'Today, ' : `${formattedDate}, `} {formattedTime}
                        </span>
                    </div>
                </div>
                <ChevronDown size={16} className={cn("text-[var(--color-text-muted)] transition-transform duration-300", isOpen && "rotate-180 text-[var(--color-primary)]")} />
            </button>

            {/* Dropdown Popover */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-50 mt-2 w-[340px] max-w-[calc(100vw-2rem)] right-0 bg-[var(--color-bg-card)] rounded-2xl shadow-2xl border border-[var(--color-divider)] overflow-hidden flex flex-col"
                    >
                        {/* Quick Selection */}
                        <div className="p-3 bg-gray-50 dark:bg-white/5 border-b border-[var(--color-divider)]">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2 flex items-center gap-1.5">
                                <Zap size={10} className="text-amber-500" /> Quick Log
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => setTimeOffset(0)} className="py-2 px-2 bg-[var(--color-bg-card)] border border-[var(--color-divider)] rounded-lg text-[10px] font-black uppercase text-[var(--color-primary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all text-center">
                                    Right Now
                                </button>
                                <button type="button" onClick={() => setTimeOffset(-1)} className="py-2 px-2 bg-[var(--color-bg-card)] border border-[var(--color-divider)] rounded-lg text-[10px] font-black uppercase text-[var(--color-text-main)] hover:border-gray-400 transition-all text-center">
                                    1 Hour Ago
                                </button>
                                <button type="button" onClick={() => setTimeOffset(-2)} className="py-2 px-2 bg-[var(--color-bg-card)] border border-[var(--color-divider)] rounded-lg text-[10px] font-black uppercase text-[var(--color-text-main)] hover:border-gray-400 transition-all text-center">
                                    2 Hours Ago
                                </button>
                                <button type="button" onClick={() => setTimeOffset(0, -1)} className="py-2 px-2 bg-[var(--color-bg-card)] border border-[var(--color-divider)] rounded-lg text-[10px] font-black uppercase text-[var(--color-text-main)] hover:border-gray-400 transition-all text-center">
                                    Yesterday
                                </button>
                            </div>
                        </div>

                        {/* Custom Date & Time Planner */}
                        <div className="p-4 flex flex-col gap-4">
                            {/* Calendar Header */}
                            <div className="flex items-center justify-between px-1">
                                <button type="button" onClick={prevWeek} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft size={16} /></button>
                                <span className="text-xs font-black uppercase tracking-widest text-[var(--color-text-main)]">
                                    {format(addDays(currentWeek, 3), 'MMM yyyy')}
                                </span>
                                <button type="button" onClick={nextWeek} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"><ChevronRight size={16} /></button>
                            </div>

                            {/* Calendar Grid */}
                            <div>
                                <div className="grid grid-cols-7 mb-1">
                                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d, i) => (
                                        <div key={i} className="text-center text-[9px] font-black text-[var(--color-text-muted)] uppercase py-1">
                                            {d}
                                        </div>
                                    ))}
                                </div>
                                {renderCells()}
                            </div>

                            {/* Time Selector */}
                            <div className="flex items-center justify-center gap-2 pt-3 border-t border-[var(--color-divider)]">
                                <div className="flex items-center gap-1 bg-gray-50 dark:bg-black/20 p-1.5 rounded-xl border border-[var(--color-divider)]">
                                    <select 
                                        value={currentHour12} 
                                        onChange={(e) => handleTimeChange(e.target.value, 'hour')}
                                        className="appearance-none bg-transparent text-center text-sm font-black text-[var(--color-text-main)] outline-none cursor-pointer pl-2 pr-1"
                                    >
                                        {Array.from({length: 12}, (_, i) => i + 1).map(h => (
                                            <option key={h} value={h} className="bg-[var(--color-bg-page)] text-[var(--color-text-main)]">{h.toString().padStart(2, '0')}</option>
                                        ))}
                                    </select>
                                    <span className="text-sm font-black text-[var(--color-text-muted)]">:</span>
                                    <select 
                                        value={currentMinute} 
                                        onChange={(e) => handleTimeChange(e.target.value, 'minute')}
                                        className="appearance-none bg-transparent text-center text-sm font-black text-[var(--color-text-main)] outline-none cursor-pointer pl-1 pr-2"
                                    >
                                        {Array.from({length: 60}, (_, i) => i).map(m => (
                                            <option key={m} value={m} className="bg-[var(--color-bg-page)] text-[var(--color-text-main)]">{m.toString().padStart(2, '0')}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex bg-gray-50 dark:bg-black/20 p-1 rounded-xl border border-[var(--color-divider)]">
                                    <button 
                                        type="button" 
                                        onClick={() => handleTimeChange('AM', 'ampm')}
                                        className={cn("px-3 py-1 rounded-lg text-xs font-black transition-all", currentAmPm === 'AM' ? "bg-white dark:bg-zinc-800 text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]")}
                                    >
                                        AM
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => handleTimeChange('PM', 'ampm')}
                                        className={cn("px-3 py-1 rounded-lg text-xs font-black transition-all", currentAmPm === 'PM' ? "bg-white dark:bg-zinc-800 text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]")}
                                    >
                                        PM
                                    </button>
                                </div>
                            </div>
                            
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="mt-1 w-full py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-[var(--color-primary-hover)] transition-all flex justify-center items-center gap-2"
                            >
                                <Check size={14} /> Done
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
