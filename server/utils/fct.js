/**
 * DOST-FNRI Philippine Food Composition Table (FCT) Mapping
 * This module maps common AI-detected food tags to localized nutritional values found in the Philippine FCT.
 * Values are typically per 100g of edible portion.
 */

const FCT_DATABASE = {
    // Top 20 most consumed Filipino pediatric foods (approximations based on FCT)
    "white rice": { calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, sugar_g: 0.1, sodium_mg: 1 },
    "fried rice": { calories: 163, protein_g: 3.5, carbs_g: 29, fat_g: 3.5, sugar_g: 0.5, sodium_mg: 200 },
    "chicken adobo": { calories: 215, protein_g: 18, carbs_g: 5, fat_g: 13, sugar_g: 1.5, sodium_mg: 550 },
    "pork adobo": { calories: 340, protein_g: 14, carbs_g: 5, fat_g: 29, sugar_g: 1.5, sodium_mg: 600 },
    "sinigang na baboy": { calories: 110, protein_g: 8, carbs_g: 4, fat_g: 7, sugar_g: 2, sodium_mg: 250 },
    "fried egg": { calories: 196, protein_g: 13.6, carbs_g: 1.5, fat_g: 14.8, sugar_g: 0, sodium_mg: 140 },
    "hotdog": { calories: 290, protein_g: 10, carbs_g: 4, fat_g: 26, sugar_g: 0, sodium_mg: 800 }, // Filipino style red hotdog
    "hot dog": { calories: 290, protein_g: 10, carbs_g: 4, fat_g: 26, sugar_g: 0, sodium_mg: 800 },
    "pandesal": { calories: 280, protein_g: 8, carbs_g: 52, fat_g: 4, sugar_g: 10, sodium_mg: 350 },
    "spaghetti": { calories: 158, protein_g: 5.8, carbs_g: 30, fat_g: 1.2, sugar_g: 5, sodium_mg: 300 }, // Filipino sweet style
    "pancit canton": { calories: 450, protein_g: 10, carbs_g: 60, fat_g: 20, sugar_g: 3, sodium_mg: 900 },
    "sopas": { calories: 110, protein_g: 4.5, carbs_g: 10, fat_g: 5.5, sugar_g: 1, sodium_mg: 280 }, // Macaroni soup
    "chicken tinola": { calories: 85, protein_g: 9, carbs_g: 2, fat_g: 4.5, sugar_g: 0.5, sodium_mg: 200 },
    "fried chicken": { calories: 250, protein_g: 15, carbs_g: 10, fat_g: 16, sugar_g: 0, sodium_mg: 350 },
    "siomai": { calories: 220, protein_g: 10, carbs_g: 18, fat_g: 12, sugar_g: 1, sodium_mg: 450 },
    "mango": { calories: 60, protein_g: 0.8, carbs_g: 15, fat_g: 0.4, sugar_g: 14, sodium_mg: 1 },
    "banana": { calories: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3, sugar_g: 12, sodium_mg: 1 }, // Lakatan
    "milk": { calories: 61, protein_g: 3.2, carbs_g: 4.8, fat_g: 3.3, sugar_g: 4.8, sodium_mg: 40 }, // Processed/Fortified liquid
    "powdered milk": { calories: 496, protein_g: 26, carbs_g: 38, fat_g: 27, sugar_g: 38, sodium_mg: 371 }, // Instant milk / Bear Brand
    "instant milk": { calories: 496, protein_g: 26, carbs_g: 38, fat_g: 27, sugar_g: 38, sodium_mg: 371 },
    "milk formula": { calories: 490, protein_g: 15, carbs_g: 55, fat_g: 25, sugar_g: 50, sodium_mg: 200 }, // Infant/Toddler Formula (Nido/Lactum)
    "boiled egg": { calories: 155, protein_g: 12.6, carbs_g: 1.1, fat_g: 10.6, sugar_g: 1.1, sodium_mg: 124 },
    "egg": { calories: 155, protein_g: 12.6, carbs_g: 1.1, fat_g: 10.6, sugar_g: 1.1, sodium_mg: 124 },
    "chicken": { calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, sugar_g: 0, sodium_mg: 74 }, // Generic boiled/roasted chicken
    "instant noodles": { calories: 450, protein_g: 9, carbs_g: 60, fat_g: 18, sugar_g: 3, sodium_mg: 1500 }, // Pancit Canton/Instant Ramen
};

/**
 * Attempts to map an AI detected English food tag to the local DOST-FNRI database.
 * If found, recalculates macros based on the detected weight.
 * If not found, uses the AI's standard estimation or a default block.
 * 
 * @param {Object} item - { name: 'White Rice', weight_g: 150 }
 * @param {Object} aiMacrosEsimtation - The raw estimation from the AI for fallback
 * @returns {Object} mapped item with localized macros
 */
export const mapToFCT = (item, aiMacrosEsimtation = null) => {
    // 1. If the item already has verified/user-edited macros, PRESERVE them!
    const hasValues = (
        (item.calories !== undefined && item.calories !== null && item.calories > 0) || 
        (item.protein_g !== undefined && item.protein_g !== null && item.protein_g > 0) || 
        (item.carbs_g !== undefined && item.carbs_g !== null && item.carbs_g > 0)
    );

    if (hasValues) {
        return {
            ...item,
            fct_matched: false,
            // Ensure values are numbers and rounded
            calories: Math.round(item.calories || 0),
            protein_g: Math.round((item.protein_g || 0) * 10) / 10,
            carbs_g: Math.round((item.carbs_g || 0) * 10) / 10,
            fat_g: Math.round((item.fat_g || 0) * 10) / 10,
            sugar_g: Math.round((item.sugar_g || 0) * 10) / 10,
            sodium_mg: Math.round(item.sodium_mg || 0)
        };
    }

    // 2. Otherwise, attempt to map to the FCT database using correct phrase matching
    const searchName = item.name.toLowerCase().trim();
    let fctKey = Object.keys(FCT_DATABASE).find(k => k === searchName);

    if (!fctKey) {
        // Robust word boundary match to prevent partial matching (e.g. "egg" in "eggplant" or "milk" in "milkshake")
        const matches = Object.keys(FCT_DATABASE).filter(key => {
            const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedKey}\\b`, 'i');
            return regex.test(searchName);
        });
        
        if (matches.length > 0) {
            // Sort by length in descending order to prioritize longer, more specific matches
            matches.sort((a, b) => b.length - a.length);
            fctKey = matches[0];
        }
    }

    const fctEntry = fctKey ? FCT_DATABASE[fctKey] : null;

    if (fctEntry) {
        // AI often hallucinates weight for volume measurements. Override standard units:
        let actualWeight = item.weight_g || 100;
        const unit = (item.serving_unit || '').toLowerCase();

        if (searchName.includes('rice')) {
            if (unit === 'cup') actualWeight = 160 * (item.measure_qty || 1); // 1 Cup cooked rice ~ 160g
            if (unit === 'sandok' || unit === 'spoon') actualWeight = 60 * (item.measure_qty || 1); // 1 Sandok ~ 60g
            if (unit === 'bowl') actualWeight = 160 * (item.measure_qty || 1); // 1 standard bowl ~ 1 cup
        }

        // Calculate based on actualWeight (FCT is per 100g)
        const ratio = actualWeight / 100;

        return {
            ...item,
            fct_matched: true,
            calories: Math.round(fctEntry.calories * ratio),
            protein_g: Math.round(fctEntry.protein_g * ratio * 10) / 10,
            carbs_g: Math.round(fctEntry.carbs_g * ratio * 10) / 10,
            fat_g: Math.round(fctEntry.fat_g * ratio * 10) / 10,
            sugar_g: Math.round(fctEntry.sugar_g * ratio * 10) / 10,
            sodium_mg: Math.round(fctEntry.sodium_mg * ratio)
        };
    }

    // 3. Fallback if not found in FCT but has AI generic estimation data
    if (item.macros_per_serving) {
        const qty = item.measure_qty || 1;
        return {
            ...item,
            fct_matched: false,
            calories: Math.round((item.macros_per_serving.calories || 0) * qty),
            protein_g: Math.round((item.macros_per_serving.protein_g || 0) * qty * 10) / 10,
            carbs_g: Math.round((item.macros_per_serving.carbs_g || 0) * qty * 10) / 10,
            fat_g: Math.round((item.macros_per_serving.fat_g || 0) * qty * 10) / 10,
            sugar_g: Math.round((item.macros_per_serving.sugar_g || 0) * qty * 10) / 10,
            sodium_mg: Math.round((item.macros_per_serving.sodium_mg || 0) * qty)
        };
    }

    // 4. Ultimate fallback if even AI data and verified data are missing
    return {
        ...item,
        fct_matched: false,
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        sugar_g: 0,
        sodium_mg: 0
    };
};

/**
 * Recalculates total macros for an entire verified meal using FCT mapping
 * @param {Array} verifiedItems - [{name: 'Rice', weight_g: 100}, ...]
 * @returns {Object} - The recalculated ai_analysis totals
 */
export const recalculateMealTotals = (verifiedItems, plate_waste = 100) => {
    const pwValue = parseInt(plate_waste);
    const wasteFactor = (isNaN(pwValue) ? 100 : pwValue) / 100;
    let total_calories = 0, total_protein = 0, total_carbs = 0, total_fat = 0, total_sugar = 0, total_sodium = 0;

    const mappedItems = verifiedItems.map(item => {
        const mapped = mapToFCT(item);
        total_calories += mapped.calories;
        total_protein += mapped.protein_g;
        total_carbs += mapped.carbs_g;
        total_fat += mapped.fat_g;
        total_sugar += mapped.sugar_g;
        total_sodium += mapped.sodium_mg;
        return mapped;
    });

    const total_calories_est = Math.round(total_calories * wasteFactor);
    const macros_est = {
        protein_g: Math.round(total_protein * wasteFactor * 10) / 10,
        carbs_g: Math.round(total_carbs * wasteFactor * 10) / 10,
        fat_g: Math.round(total_fat * wasteFactor * 10) / 10,
        sugar_g: Math.round(total_sugar * wasteFactor * 10) / 10,
        sodium_mg: Math.round(total_sodium * wasteFactor)
    };

    return {
        items: mappedItems,
        total_calories_est,
        macros_est,
        plate_waste,
        // For Parent UI consistency
        nutrition: {
            calories: total_calories_est,
            protein: macros_est.protein_g,
            carbs: macros_est.carbs_g,
            fat: macros_est.fat_g
        }
    };
};
