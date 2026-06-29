/**
 * Normalizes and stems an allergen or food word to handle plurals and suffix variations.
 */
export const normalizeAllergenTerm = (term) => {
    let t = String(term || '')
        .toLowerCase()
        .replace(/\ballergy\b/g, '')
        .replace(/\ballergies\b/g, '')
        .replace(/\ballergic\b/g, '')
        .replace(/\bto\b/g, '')
        .trim();
    
    // Stemming for English plurals
    if (t.endsWith('ies')) {
        t = t.slice(0, -3) + 'y'; // cherries -> cherry
    } else if (t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us') && !t.endsWith('is') && !t.endsWith('as')) {
        t = t.slice(0, -1); // eggs -> egg, peanuts -> peanut
    }
    return t;
};

/**
 * Dictionary mapping common allergen groups to their clinical and commercial derivatives.
 */
export const ALLERGEN_DERIVATIVES = {
    dairy: ['milk', 'butter', 'cheese', 'yogurt', 'whey', 'casein', 'lactose', 'cream', 'margarine', 'ghee', 'gelato', 'dairy', 'milk powder', 'condensed milk', 'buttermilk'],
    milk: ['milk', 'butter', 'cheese', 'yogurt', 'whey', 'casein', 'lactose', 'cream', 'margarine', 'ghee', 'gelato', 'dairy', 'milk powder', 'condensed milk', 'buttermilk'],
    gluten: ['wheat', 'barley', 'rye', 'semolina', 'spelt', 'flour', 'bread', 'pasta', 'noodle', 'crust', 'dough', 'gluten', 'wheat flour'],
    wheat: ['wheat', 'barley', 'rye', 'semolina', 'spelt', 'flour', 'bread', 'pasta', 'noodle', 'crust', 'dough', 'gluten', 'wheat flour'],
    peanut: ['peanut', 'groundnut', 'arachis', 'peanut butter', 'peanut oil'],
    egg: ['egg', 'mayonnaise', 'meringue', 'ovalbumin', 'custard', 'egg yolk', 'egg white'],
    soy: ['soy', 'tofu', 'tempeh', 'edamame', 'shoyu', 'miso', 'soya', 'soy sauce'],
    soya: ['soy', 'tofu', 'tempeh', 'edamame', 'shoyu', 'miso', 'soya', 'soy sauce'],
    fish: ['fish', 'salmon', 'tuna', 'cod', 'sardine', 'anchovy', 'mackerel', 'tilapia', 'trout', 'haddock', 'patis'],
    shellfish: ['shrimp', 'crab', 'lobster', 'prawn', 'mussel', 'oyster', 'clam', 'scallop', 'shrimp paste', 'bagoong'],
    'tree nut': ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut', 'chestnut', 'ginkgo nut', 'pine nut', 'coconut', 'shea nut'],
    sesame: ['sesame', 'tahini', 'sesame oil', 'sesame seed', 'til', 'gingelly'],
    mustard: ['mustard', 'mustard seed', 'mustard oil', 'mustard powder', 'dijon'],
    sulfite: ['sulfite', 'sulphite', 'sulfur dioxide', 'sodium bisulfite', 'wine', 'vinegar', 'dried fruit'],
    corn: ['corn', 'cornstarch', 'corn starch', 'corn syrup', 'maize', 'cornmeal', 'popcorn', 'polenta', 'hominy', 'corn oil'],
    celery: ['celery', 'celery seed', 'celery salt', 'celeriac'],
    lupin: ['lupin', 'lupine', 'lupin flour', 'lupin seed', 'lupin bean'],
    mollusc: ['squid', 'octopus', 'cuttlefish', 'abalone', 'snail', 'clam', 'mussel', 'oyster', 'scallop'],
    garlic: ['garlic', 'garlic powder', 'garlic oil', 'garlic salt', 'aioli'],
    onion: ['onion', 'onion powder', 'shallot', 'scallion', 'leek', 'chive'],
    chocolate: ['chocolate', 'cocoa', 'cacao', 'cocoa powder', 'cocoa butter', 'milo', 'chocolate syrup', 'fudge'],
    cocoa: ['chocolate', 'cocoa', 'cacao', 'cocoa powder', 'cocoa butter', 'milo', 'chocolate syrup', 'fudge'],
    strawberry: ['strawberry', 'strawberries', 'strawberry jam', 'strawberry syrup', 'strawberry extract'],
    'citrus fruit': ['citrus', 'lemon', 'lime', 'orange', 'grapefruit', 'tangerine', 'calamansi', 'pomelo', 'yuzu', 'mandarin', 'citric acid', 'lemon juice', 'lime juice', 'orange juice'],
    citrus: ['citrus', 'lemon', 'lime', 'orange', 'grapefruit', 'tangerine', 'calamansi', 'pomelo', 'yuzu', 'mandarin', 'citric acid', 'lemon juice', 'lime juice', 'orange juice'],
    kiwi: ['kiwi', 'kiwifruit', 'kiwi extract', 'kiwi jam'],
    pineapple: ['pineapple', 'pineapple juice', 'pineapple syrup', 'ananas'],
    honey: ['honey', 'honeycomb', 'honey syrup'],
    beef: ['beef', 'beef broth', 'beef stock', 'beef tallow', 'steak', 'veal'],
    chicken: ['chicken', 'chicken broth', 'chicken stock', 'poultry'],
    pork: ['pork', 'lard', 'bacon', 'ham', 'pork rind', 'chorizo', 'pork sausage', 'pepperoni'],
    'food dye': ['red 40', 'yellow 5', 'yellow 6', 'blue 1', 'blue 2', 'green 3', 'allura red', 'tartrazine', 'sunset yellow', 'carmine', 'cochineal', 'artificial color', 'food dye', 'food color'],
    additive: ['msg', 'monosodium glutamate', 'preservative', 'artificial flavor', 'carrageenan', 'sulfite', 'aspartame', 'sodium benzoate']
};

/**
 * Helper to determine if an allergen or derivative warning should be bypassed
 * based on clinical exceptions (e.g. eggplant bypass for egg, peanut butter bypass for butter/dairy).
 */
const isAllergyBypassed = (allergenOrDeriv, itemName) => {
    const lowerItem = String(itemName || '').toLowerCase();
    const lowerAllergen = String(allergenOrDeriv || '').toLowerCase();
    
    // 1. Eggplant Egg Bypass
    if (lowerAllergen === 'egg' && lowerItem.includes('eggplant')) {
        return true;
    }
    // 2. Butter Bypasses (Peanut butter, cocoa butter, butternut, shea butter are dairy-free despite "butter")
    if (lowerAllergen === 'butter' && (
        lowerItem.includes('peanut butter') ||
        lowerItem.includes('cocoa butter') ||
        lowerItem.includes('shea butter') ||
        lowerItem.includes('butternut')
    )) {
        return true;
    }
    // 3. Non-dairy Milk Bypasses (Coconut milk, Soy milk, Almond milk, etc. are dairy-free)
    if (lowerAllergen === 'milk' && (
        lowerItem.includes('coconut milk') || 
        lowerItem.includes('soy milk') || 
        lowerItem.includes('almond milk') || 
        lowerItem.includes('oat milk') || 
        lowerItem.includes('rice milk')
    )) {
        return true;
    }
    // 4. Cocoa butter Dairy/Milk Bypass (Cocoa butter is dairy-free)
    if ((lowerAllergen === 'milk' || lowerAllergen === 'dairy') && lowerItem.includes('cocoa butter')) {
        return true;
    }
    // 5. Buckwheat Wheat/Gluten Bypass (Buckwheat is gluten-free)
    if ((lowerAllergen === 'wheat' || lowerAllergen === 'gluten') && lowerItem.includes('buckwheat')) {
        return true;
    }
    return false;
};

/**
 * Evaluates a meal log against a set of nutrition rules.
 * @param {Object} mealLog - The incoming meal log object with ai_analysis
 * @param {Array} rules - Array of rule objects for the profile.
 * @param {Object} dailyTotals - Current cumulative macros for today BEFORE this meal
 * @returns {Object} result - Contains status ('compliant', 'flagged', 'pending') and details.
 */
export const checkCompliance = (mealLog, rules = [], dailyTotals = {}, allergies = []) => {
    const analysis = mealLog.nutritionist_review?.verified_analysis || mealLog.ai_analysis;

    if (!analysis) {
        return { status: 'pending', details: { reason: "Waiting for analysis" } };
    }

    const violations = [];
    let xaiMessages = [];

    // Allergy check
    const sanitizedAllergies = [];
    (allergies || []).forEach(a => {
        if (typeof a === 'string') {
            a.split(/[,/;]+/).forEach(sub => {
                const cleaned = normalizeAllergenTerm(sub);
                if (cleaned) sanitizedAllergies.push(cleaned);
            });
        } else if (a) {
            const cleaned = normalizeAllergenTerm(a);
            if (cleaned) sanitizedAllergies.push(cleaned);
        }
    });

    if (analysis.items) {
        analysis.items.forEach(item => {
            const itemName = String(item.name || '').toLowerCase();
            const itemWords = itemName.split(/\s+/).map(w => normalizeAllergenTerm(w));

            sanitizedAllergies.forEach(allergen => {
                // 1. Direct match: does the item contain the allergen term directly?
                const isSubstr = itemName.includes(allergen);
                const isWordMatch = itemWords.includes(allergen);
                const isBypassed = isAllergyBypassed(allergen, itemName);

                let isAllergic = (isSubstr || isWordMatch) && !isBypassed;

                // 2. Semantic derivative match: does the item contain any derivatives of the allergen?
                let matchedDerivative = null;
                if (!isAllergic && ALLERGEN_DERIVATIVES[allergen]) {
                    for (const deriv of ALLERGEN_DERIVATIVES[allergen]) {
                        const isDerivSubstr = itemName.includes(deriv);
                        const isDerivWordMatch = itemWords.includes(deriv);
                        const isDerivBypassed = isAllergyBypassed(deriv, itemName);

                        if ((isDerivSubstr || isDerivWordMatch) && !isDerivBypassed) {
                            isAllergic = true;
                            matchedDerivative = deriv;
                            break;
                        }
                    }
                }

                if (isAllergic) {
                    const warningLabel = matchedDerivative 
                        ? `Allergy Warning: ${allergen.toUpperCase()} (${matchedDerivative.toUpperCase()})`
                        : `Allergy Warning: ${allergen.toUpperCase()}`;
                    
                    violations.push({
                        rule: warningLabel,
                        category: 'Allergy',
                        actual: item.name,
                        limit: `Avoid ${allergen}`
                    });

                    const alertMsg = matchedDerivative
                        ? `CRITICAL ALLERGY ALERT: This meal contains ${item.name} (detected derivative: ${matchedDerivative.toUpperCase()}), which matches the child's recorded allergy to ${allergen.toUpperCase()}. Please do not serve this item.`
                        : `CRITICAL ALLERGY ALERT: This meal contains ${item.name}, which matches the child's recorded allergy to ${allergen.toUpperCase()}. Please do not serve this item.`;
                    
                    xaiMessages.push(alertMsg);
                }
            });
        });
    }

    if (rules && rules.length > 0) {
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
    }

    let score = calculateComplianceScore(rules, analysis, dailyTotals);
    
    // If there is any allergy violation, the compliance score is automatically 0 (critical safety violation)
    const hasAllergyViolation = violations.some(v => v.category === 'Allergy');
    if (hasAllergyViolation) {
        score = 0;
    }

    const suggestions = generateSuggestions(rules, analysis, dailyTotals);

    // Positive XAI for compliant meals
    if (violations.length === 0 && xaiMessages.length === 0) {
        const energyRule = rules.find(r => r.category?.toLowerCase() === 'calories');
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
        // Daily minimum targets (rule_type === 'min') are tracked on the dashboard progress bars and do not penalize individual meal compliance scores
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

    // Only skip zero checks for max rules, as a min rule with zero cumulative total is a violation
    if (rule.rule_type?.toLowerCase() === 'max' && cumulativeTotal === 0 && mealValue === 0) return;

    const limit = parseFloat(rule.rule_value);
    let isViolated = false;
    let deficit = 0;

    switch (rule.rule_type?.toLowerCase()) {
        case 'max':
            if (cumulativeTotal > limit) {
                isViolated = true;
                deficit = cumulativeTotal - limit;
            }
            break;
        case 'min':
            // Daily minimum targets are tracked via the dashboard progress bars and do not flag individual meals as violations
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
        if (rule.rule_type?.toLowerCase() === 'min') {
            xaiMessages.push(`Your cumulative intake of ${cumulativeTotal}${rule.rule_unit || ''} ${category} is below the minimum daily requirement of ${limit}${rule.rule_unit || ''} (deficit of ${deficit}${rule.rule_unit || ''}). Try adding ${category}-rich foods to your next meal.`);
        } else {
            const topItem = analysis.items?.sort((a, b) => b[getMacroKey(category)] - a[getMacroKey(category)])[0];
            if (topItem && getMacroKey(category)) {
                xaiMessages.push(`Your intake of ${cumulativeTotal}${rule.rule_unit || ''} ${category} exceeds the daily limit by ${deficit}${rule.rule_unit || ''}. The highest contributor in this meal was ${topItem.name} (${topItem[getMacroKey(category)]}${rule.rule_unit || ''}). Consider smaller portions for this item next time.`);
            } else {
                xaiMessages.push(`This meal pushes your daily ${category} to ${cumulativeTotal}${rule.rule_unit || ''}, exceeding your target limit of ${limit}.`);
            }
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

    // Only skip zero checks for max rules, as a min rule with zero cumulative total is a violation
    if (type === 'max' && cumulativeTotal === 0 && mealValue === 0) return;

    let isViolated = false;
    let deficit = 0;

    if (type === 'max' && cumulativeTotal > limit) {
        isViolated = true;
        deficit = cumulativeTotal - limit;
    } else if (type === 'min') {
        // Daily minimum targets are tracked via the dashboard progress bars and do not flag individual meals as violations
    }

    if (isViolated) {
        violations.push({
            rule: rule.rule_name,
            actual: `${cumulativeTotal}`,
            limit: `${type.toUpperCase()} ${limit}`
        });

        // XAI Feedback generation
        if (type === 'min') {
            xaiMessages.push(`Your cumulative ${category} intake of ${cumulativeTotal} is below the minimum daily target of ${limit} (deficit of ${deficit}).`);
        } else {
            const topItem = analysis.items?.sort((a, b) => b[getMacroKey(category)] - a[getMacroKey(category)])[0];
            if (topItem && getMacroKey(category)) {
                xaiMessages.push(`Your ${category} intake of ${cumulativeTotal} exceeds the ${limit} limit. The highest contributor was ${topItem.name} (${topItem[getMacroKey(category)]}). Consider substituting this item next time.`);
            } else {
                xaiMessages.push(`This meal pushes your daily ${category} to ${cumulativeTotal}, exceeding your target limit of ${limit}.`);
            }
        }
    }
}

/**
 * Re-validates all meal logs for a profile against the current rules.
 * This should be called when rules are updated/deleted.
 */
export const revalidateProfileLogs = async (prisma, profileId) => {
    const profile = await prisma.profiles.findUnique({
        where: { id: profileId },
        select: { allergies: true }
    });
    const allergies = profile?.allergies || [];

    const rules = await prisma.nutrition_rules.findMany({
        where: { profile_id: profileId }
    });

    const logs = await prisma.meal_logs.findMany({
        where: { profile_id: profileId },
        orderBy: { logged_at: 'asc' }
    });

    // Group logs by date to calculate daily totals
    const logsByDate = {};
    logs.forEach(log => {
        const dateStr = new Date(log.logged_at).toISOString().split('T')[0];
        if (!logsByDate[dateStr]) logsByDate[dateStr] = [];
        logsByDate[dateStr].push(log);
    });

    const updates = [];

    for (const date in logsByDate) {
        let dailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0 };
        const dayLogs = logsByDate[date];

        for (const log of dayLogs) {
            const result = checkCompliance(log, rules, dailyTotals, allergies);
            const analysis = log.nutritionist_review?.verified_analysis || log.ai_analysis;
            const kcal = analysis ? (analysis.total_calories_est || analysis.nutrition?.calories || 0) : 0;

            // Collect the update
            updates.push(prisma.meal_logs.update({
                where: { id: log.id },
                data: {
                    compliance_status: result.status,
                    compliance_score: result.compliance_score,
                    violation_details: result.details,
                    total_calories: log.total_calories || kcal || 0 // Keep existing or use calc fallback
                }
            }));

            // Update daily totals for the NEXT log of the same day
            if (analysis) {
                dailyTotals.calories += (log.total_calories || kcal || 0);
                dailyTotals.protein += (log.total_protein_g || analysis.macros_est?.protein_g || 0);
                dailyTotals.carbs += (log.total_carbs_g || analysis.macros_est?.carbs_g || 0);
                dailyTotals.fat += (log.total_fat_g || analysis.macros_est?.fat_g || 0);
                dailyTotals.sugar += (log.total_sugar_g || analysis.macros_est?.sugar_g || 0);
                dailyTotals.sodium += (log.total_sodium_mg || analysis.macros_est?.sodium_mg || 0);
            }
        }
    }

    // Run all updates in a transaction for efficiency
    if (updates.length > 0) {
        await prisma.$transaction(updates);
    }
    
    return updates.length;
};
