/**
 * Evaluates a meal log against a set of nutrition rules.
 * @param {Object} mealLog - The incoming meal log object with ai_analysis
 * @param {Array} rules - Array of rule objects for the profile.
 * @param {Object} dailyTotals - Current cumulative macros for today BEFORE this meal
 * @returns {Object} result - Contains status ('compliant', 'flagged', 'pending') and details.
 */
export const checkCompliance = (mealLog, rules, dailyTotals = {}) => {
    if (!rules || rules.length === 0) {
        return { status: 'compliant', details: null };
    }

    const analysis = mealLog.nutritionist_review?.verified_analysis || mealLog.ai_analysis;

    if (!analysis) {
        return { status: 'pending', details: { reason: "Waiting for analysis" } };
    }

    const violations = [];
    let xaiMessages = [];

    rules.forEach(rule => {
        try {
            if (rule.rule_type && rule.rule_value !== null) {
                evaluateStructuredRule(rule, analysis, dailyTotals, violations, xaiMessages);
            } else {
                evaluateLegacyRule(rule, analysis, dailyTotals, violations, xaiMessages);
            }
        } catch (e) {
            console.error(`Error checking rule ${rule.id}:`, e);
        }
    });

    const score = calculateComplianceScore(rules, analysis, dailyTotals);
    const suggestions = generateSuggestions(rules, analysis, dailyTotals);

    // Positive XAI for compliant meals
    if (violations.length === 0 && xaiMessages.length === 0) {
        const energyRule = rules.find(r => r.category.toLowerCase() === 'calories');
        if (energyRule) {
            const kcal = getActualValue('calories', analysis);
            xaiMessages.push(`Great choice! This meal (${kcal} kcal) is well within your daily energy target of ${energyRule.rule_value} kcal.`);
        } else {
            xaiMessages.push("Excellent meal choice! This log is fully compliant with all active nutrition rules.");
        }
    }

    return { 
        status: violations.length > 0 ? 'flagged' : 'compliant', 
        compliance_score: score,
        details: { 
            violations,
            xai_feedback: xaiMessages.join(" "),
            suggestions: suggestions
        } 
    };
};

/**
 * Calculates a compliance score from 0-100.
 */
function calculateComplianceScore(rules, analysis, dailyTotals) {
    if (!rules || rules.length === 0) return 100;
    
    let totalScore = 100;
    let weightPerRule = 100 / rules.length;

    rules.forEach(rule => {
        const category = (rule.category || '').toLowerCase();
        const mealValue = getActualValue(category, analysis) || 0;
        const currentDaily = dailyTotals[category] || 0;
        const cumulativeTotal = currentDaily + mealValue;
        const limit = parseFloat(rule.rule_value);

        if (rule.rule_type === 'max' && cumulativeTotal > limit) {
            const excessRatio = (cumulativeTotal - limit) / limit;
            const penalty = Math.min(weightPerRule, weightPerRule * excessRatio);
            totalScore -= penalty;
        }
        // Min rules could be added here for end-of-day scoring
    });

    return Math.max(0, Math.round(totalScore));
}

/**
 * Generates adaptive meal suggestions based on current intake.
 */
function generateSuggestions(rules, analysis, dailyTotals) {
    const suggestions = [];
    
    rules.forEach(rule => {
        const category = (rule.category || '').toLowerCase();
        const currentDaily = (dailyTotals[category] || 0) + (getActualValue(category, analysis) || 0);
        const limit = parseFloat(rule.rule_value);

        if (rule.rule_type === 'max' && currentDaily > limit * 0.8) {
            suggestions.push(`Approaching ${category} limit. For your next meal, try something low in ${category} like steamed vegetables or lean protein.`);
        }
        if (rule.rule_type === 'min' && currentDaily < limit * 0.5) {
            suggestions.push(`You're low on ${category} today. Consider adding ${category}-rich foods like ${category === 'protein' ? 'eggs or beans' : 'fruits'} to your next snack.`);
        }
    });

    return suggestions;
}

/**
 * Evaluates a structured rule mapping to specific analysis fields with cumulative logic via dailyTotals.
 */
function evaluateStructuredRule(rule, analysis, dailyTotals, violations, xaiMessages) {
    const category = (rule.category || '').toLowerCase();
    
    const mealValue = getActualValue(category, analysis) || 0;
    const currentDaily = dailyTotals[category] || 0;
    const cumulativeTotal = currentDaily + mealValue;

    if (cumulativeTotal === 0 && mealValue === 0) return;

    const limit = parseFloat(rule.rule_value);
    let isViolated = false;
    let deficit = 0;

    switch (rule.rule_type.toLowerCase()) {
        case 'max':
            if (cumulativeTotal > limit) {
                isViolated = true;
                deficit = cumulativeTotal - limit;
            }
            break;
        case 'min':
            // For minimum goals, we usually only flag at End of Day, 
            // but for realtime, maybe we just show progress.
            // Let's only flag "max" rules for immediate compliance warnings.
            break;
    }

    if (isViolated) {
        violations.push({
            rule: rule.rule_name,
            category: rule.category,
            actual: `${cumulativeTotal}${rule.rule_unit || ''}`,
            meal_addition: `${mealValue}${rule.rule_unit || ''}`,
            limit: `${rule.rule_type} ${limit}${rule.rule_unit || ''}`
        });

        // XAI Feedback generation
        const topItem = analysis.items?.sort((a, b) => b[getMacroKey(category)] - a[getMacroKey(category)])[0];
        
        if (topItem && getMacroKey(category)) {
            xaiMessages.push(`Your intake of ${cumulativeTotal}${rule.rule_unit || ''} ${category} exceeds the daily limit by ${deficit}${rule.rule_unit || ''}. The highest contributor in this meal was ${topItem.name} (${topItem[getMacroKey(category)]}${rule.rule_unit || ''}). Consider smaller portions for this item next time.`);
        } else {
            xaiMessages.push(`This meal pushes your daily ${category} to ${cumulativeTotal}${rule.rule_unit || ''}, exceeding your target limit of ${limit}.`);
        }
    }
}

/**
 * Helper to map category string to the item macro key
 */
function getMacroKey(category) {
    switch(category.toLowerCase()) {
        case 'calories': return 'calories';
        case 'protein': return 'protein_g';
        case 'carbs': return 'carbs_g';
        case 'fat': return 'fat_g';
        case 'sugar': return 'sugar_g';
        case 'sodium': return 'sodium_mg';
        default: return null;
    }
}

/**
 * Maps categories to fields in the AI analysis object.
 */
function getActualValue(category, analysis) {
    const macros = analysis.macros_est || {};

    switch (category) {
        case 'calories':
        case 'energy':
            return analysis.total_calories_est || null;
        case 'protein':
            return macros.protein_g || null;
        case 'carbs':
        case 'carbohydrates':
            return macros.carbs_g || null;
        case 'fat':
        case 'fats':
            return macros.fat_g || null;
        case 'sugar':
            return macros.sugar_g || null;
        case 'sodium':
            return macros.sodium_mg || null;
        default:
            return null;
    }
}

/**
 * Legacy evaluation logic for compatibility with existing string-based rules.
 */
function evaluateLegacyRule(rule, analysis, dailyTotals, violations, xaiMessages) {
    const ruleDefinition = typeof rule.rule_definition === 'string'
        ? rule.rule_definition
        : String(rule.rule_definition || '');

    const limitMatch = ruleDefinition.match(/(Max|Min)\s+(\d+)/i);
    if (!limitMatch) return;

    const type = limitMatch[1].toLowerCase();
    const limit = parseInt(limitMatch[2]);
    const category = (rule.category || '').toLowerCase();
    
    const mealValue = getActualValue(category, analysis) || 0;
    const currentDaily = dailyTotals[category] || 0;
    const cumulativeTotal = currentDaily + mealValue;

    if (cumulativeTotal === 0 && mealValue === 0) return;

    let isViolated = false;
    let deficit = 0;

    if (type === 'max' && cumulativeTotal > limit) {
        isViolated = true;
        deficit = cumulativeTotal - limit;
    }
    // Ignoring min for real-time flagging for now, unless end-of-day

    if (isViolated) {
        violations.push({
            rule: rule.rule_name,
            actual: `${cumulativeTotal}`,
            limit: `${type.toUpperCase()} ${limit}`
        });

        // XAI Feedback generation
        const topItem = analysis.items?.sort((a, b) => b[getMacroKey(category)] - a[getMacroKey(category)])[0];
        
        if (topItem && getMacroKey(category)) {
            xaiMessages.push(`Your ${category} intake of ${cumulativeTotal} exceeds the ${limit} limit. The highest contributor was ${topItem.name} (${topItem[getMacroKey(category)]}). Consider substituting this item next time.`);
        } else {
            xaiMessages.push(`This meal pushes your daily ${category} to ${cumulativeTotal}, exceeding your target limit of ${limit}.`);
        }
    }
}
