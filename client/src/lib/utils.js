import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export function formatValue(value, precision = 'whole') {
    if (value === null || value === undefined) return '0';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return precision === 'decimal' ? num.toFixed(2) : Math.round(num).toString();
}

export function convertWeight(kg, system = 'metric') {
    if (!kg) return { value: 0, unit: system === 'metric' ? 'kg' : 'lbs' };
    if (system === 'metric') return { value: kg, unit: 'kg' };
    return { value: (kg * 2.20462).toFixed(1), unit: 'lbs' };
}

export function convertHeight(cm, system = 'metric') {
    if (!cm) return { value: 0, unit: system === 'metric' ? 'cm' : 'ft' };
    if (system === 'metric') return { value: cm, unit: 'cm' };
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches, unit: 'ft' };
}
