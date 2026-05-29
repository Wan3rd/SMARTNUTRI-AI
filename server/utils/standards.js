/**
 * Nutritional and Growth Standards (PDRI & WHO)
 */

// Philippine Dietary Reference Intakes (PDRI) 2015 Summary for Children (Energy & Protein)
// Reference: FNRI-DOST
const PDRI_ENERGY_PROTEIN = {
    '1-2': { male: { energy: 1000, protein: 12 }, female: { energy: 920, protein: 11 } },
    '3-5': { male: { energy: 1350, protein: 18 }, female: { energy: 1260, protein: 18 } },
    '6-9': { male: { energy: 1600, protein: 28 }, female: { energy: 1470, protein: 27 } },
    '10-12': { male: { energy: 2060, protein: 43 }, female: { energy: 1980, protein: 45 } },
};

/**
 * Gets energy and protein targets based on age and gender.
 * @param {number} age - Age in years.
 * @param {string} gender - 'male' or 'female'.
 * @returns {Object} { energy, protein }
 */
export const getPDRITargets = (age, gender) => {
    const g = (gender && String(gender).toLowerCase() === 'male') ? 'male' : 'female';

    if (age >= 1 && age <= 2) return PDRI_ENERGY_PROTEIN['1-2'][g];
    if (age >= 3 && age <= 5) return PDRI_ENERGY_PROTEIN['3-5'][g];
    if (age >= 6 && age <= 9) return PDRI_ENERGY_PROTEIN['6-9'][g];
    if (age >= 10 && age <= 12) return PDRI_ENERGY_PROTEIN['10-12'][g];

    return null;
};

// WHO Growth Standards (Simplified Z-Score Benchmarks for Weight-for-Age)
// Median Weight (kg) for Age (Months)
const WHO_WFA_MEDIAN = {
    male: {
        '24': 12.2,
        '36': 14.3,
        '48': 16.3,
        '60': 18.3,
        '72': 20.5,
    },
    female: {
        '24': 11.5,
        '36': 13.9,
        '48': 16.1,
        '60': 18.2,
        '72': 20.2,
    }
};

/**
 * Gets median weight for age based on WHO standards.
 * @param {number} ageMonths - Age in months.
 * @param {string} gender - 'male' or 'female'.
 * @returns {number|null} 
 */
export const getWHOMedianWeight = (ageMonths, gender) => {
    const g = (gender && String(gender).toLowerCase() === 'male') ? 'male' : 'female';
    const nearestMonth = Object.keys(WHO_WFA_MEDIAN[g]).reduce((prev, curr) => {
        return (Math.abs(curr - ageMonths) < Math.abs(prev - ageMonths) ? curr : prev);
    });

    return WHO_WFA_MEDIAN[g][nearestMonth] || null;
};

// More categories can be added (Sugar limits, Sodium, etc.)
export const GLOBAL_LIMITS = {
    ADDED_SUGAR_MAX_PERCENT: 10, // Max 10% of total energy from added sugars (WHO)
    SODIUM_MAX_MG: {
        '1-3': 1500,
        '4-8': 1900,
        '9-13': 2200
    },
    IRON_MIN_MG: {
        '1-3': 7,
        '4-8': 10,
        '9-13': 8
    },
    CALCIUM_MIN_MG: {
        '1-3': 700,
        '4-8': 1000,
        '9-13': 1300
    },
    FIBER_MIN_G: (age) => Math.min(age + 5, 25), // Standard "Age + 5" rule, max 25g
    WATER_MIN_ML: {
        '1-3': 1300,
        '4-8': 1700,
        '9-13': 2400
    }
};
