/**
 * SmartNutri-AI Nutrition Logic
 * Based on WHO/Schofield equations for Pediatric Nutrition
 */

/**
 * Calculates Basal Metabolic Rate (BMR) using Schofield equation for children (3-10 and 10-18 years)
 * @param {number} weight - Weight in kg
 * @param {number} height - Height in cm (converted to meters for BMI check slightly, but Schofield mainly uses Weight)
 * @param {number} age - Age in years
 * @param {string} gender - 'male' or 'female'
 */
export const calculateBMR = (weight, height, age, gender) => {
    // Schofield Equations (W = Weight in kg)
    // Source: FAO/WHO/UNU Expert Consultation (1985)

    if (age < 3) {
        // 0-3 years
        if (gender === 'male') return (0.167 * weight) + (15.174 * (height / 100)) - 617.6; // Not strictly Schofield, this is a placeholder for toddlers if needed, but usually we use:
        return (60.9 * weight) - 54; // Fallback simple W equation
    }

    if (age >= 3 && age < 10) {
        if (gender === 'male') {
            return (22.7 * weight) + 495;
        } else {
            return (22.5 * weight) + 499;
        }
    }

    if (age >= 10 && age < 18) {
        if (gender === 'male') {
            return (17.5 * weight) + 651;
        } else {
            return (12.2 * weight) + 746;
        }
    }

    // Adult fallback (Mifflin-St Jeor) if > 18
    if (gender === 'male') {
        return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
        return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
};

/**
 * Calculates Total Daily Energy Expenditure (TDEE)
 */
export const calculateTDEE = (bmr, activityLevel) => {
    const activityMultipliers = {
        'sedentary': 1.2,      // Little or no exercise
        'light': 1.375,        // Light exercise 1-3 days/week
        'moderate': 1.55,      // Moderate exercise 3-5 days/week
        'very_active': 1.725   // Hard exercise 6-7 days/week
    };

    return Math.round(bmr * (activityMultipliers[activityLevel] || 1.2));
};

/**
 * Calculates Macro targets based on TDEE (Standard Pediatric Ratios)
 * Protein: 10-30% (We'll use ~20%)
 * Carbs: 45-65% (We'll use ~50%)
 * Fat: 25-35% (We'll use ~30%)
 */
export const calculateMacros = (tdee) => {
    // Calorie values per gram: Protein=4, Carbs=4, Fat=9

    const proteinRatio = 0.20;
    const carbRatio = 0.50;
    const fatRatio = 0.30;

    return {
        calories: tdee,
        protein: Math.round((tdee * proteinRatio) / 4),
        carbs: Math.round((tdee * carbRatio) / 4),
        fat: Math.round((tdee * fatRatio) / 9),
        water: 8 // Glasses (Static recommendation for now, usually varies by age)
    };
};

export const getNutriMetrics = (profile) => {
    if (!profile) return null;

    const age = new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear();
    const bmr = calculateBMR(profile.weight_kg, profile.height_cm, age, profile.gender);
    const tdee = calculateTDEE(bmr, profile.activity_level);

    return calculateMacros(tdee);
};
