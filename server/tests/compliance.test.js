import { checkCompliance } from '../utils/compliance.js';

const mockAnalysis = {
    total_calories_est: 500,
    macros_est: {
        protein_g: 25,
        carbs_g: 40,
        fat_g: 15,
        sugar_g: 30,
        sodium_mg: 200
    }
};

const runTests = () => {
    console.log("--- RUNNING RULES ENGINE TESTS ---");

    // Test 1: Max Sugar Violation (Structured)
    const rule1 = { rule_name: "Limit Sugar", category: "Sugar", rule_type: "max", rule_value: 25, rule_unit: "g" };
    const result1 = checkCompliance({ ai_analysis: mockAnalysis }, [rule1]);
    console.log("Test 1 (Max Sugar 25g, Actual 30g):", result1.status === 'flagged' ? "PASS" : "FAIL", result1.details);

    // Test 2: Min Protein Compliance (Structured)
    const rule2 = { rule_name: "Min Protein", category: "Protein", rule_type: "min", rule_value: 20, rule_unit: "g" };
    const result2 = checkCompliance({ ai_analysis: mockAnalysis }, [rule2]);
    console.log("Test 2 (Min Protein 20g, Actual 25g):", result2.status === 'compliant' ? "PASS" : "FAIL");

    // Test 3: Legacy Rule Compatibility
    const rule3 = { rule_name: "Max Calories", category: "Calories", rule_definition: "Max 400 kcal" };
    const result3 = checkCompliance({ ai_analysis: mockAnalysis }, [rule3]);
    console.log("Test 3 (Legacy Max 400 kcal, Actual 500 kcal):", result3.status === 'flagged' ? "PASS" : "FAIL", result3.details);

    // Test 4: Multiple Rules
    const result4 = checkCompliance({ ai_analysis: mockAnalysis }, [rule1, rule2]);
    console.log("Test 4 (Sugar & Protein):", result4.status === 'flagged' ? "PASS" : "FAIL", "Violations:", result4.details?.violations?.length);

    // Test 5: Min Protein with 0g intake (Snack with no protein should NOT be flagged)
    const mockSnackAnalysis = {
        total_calories_est: 100,
        macros_est: {
            protein_g: 0,
            carbs_g: 20,
            fat_g: 0,
            sugar_g: 10,
            sodium_mg: 50
        }
    };
    const result5 = checkCompliance({ ai_analysis: mockSnackAnalysis }, [rule2]);
    console.log("Test 5 (Min Protein 20g, Actual 0g in Snack):", result5.status === 'compliant' ? "PASS" : "FAIL", "Score:", result5.compliance_score);

    // Test 6: Min Protein with 1g intake (Snack with minimal protein like Fita should NOT be flagged)
    const mockFitaSnackAnalysis = {
        total_calories_est: 120,
        macros_est: {
            protein_g: 1,
            carbs_g: 22,
            fat_g: 3,
            sugar_g: 8,
            sodium_mg: 90
        }
    };
    const result6 = checkCompliance({ ai_analysis: mockFitaSnackAnalysis }, [rule2]);
    console.log("Test 6 (Min Protein 20g, Actual 1g in Fita Snack):", result6.status === 'compliant' ? "PASS" : "FAIL", "Score:", result6.compliance_score);

    // Test 7: Comma-separated allergen parsing and matching
    const mockAllergyMeal = {
        ai_analysis: {
            items: [
                { name: "Peanut butter sandwich", calories: 300 },
                { name: "Eggplant lasagna", calories: 250 }
            ]
        }
    };
    // Child has allergies input as a single string "peanut, egg" plus "dairy"
    const allergiesTest = ["peanut, egg", "dairy"];
    const result7 = checkCompliance(mockAllergyMeal, [], {}, allergiesTest);
    console.log("Test 7 (Allergy check for 'peanut, egg' split, eggplant bypass):", 
        result7.status === 'flagged' && 
        result7.compliance_score === 0 && 
        result7.details.violations.length === 1 && 
        result7.details.violations[0].rule.includes("PEANUT") 
        ? "PASS" : "FAIL", 
        "Violations count:", result7.details?.violations?.length
    );

    // Test 8: Plural/capitalized allergy term and AI detected Fried Egg
    const mockEggMeal = {
        ai_analysis: {
            items: [
                { name: "Fried Egg", calories: 196 }
            ]
        }
    };
    const eggAllergiesTest = ["Eggs"];
    const result8 = checkCompliance(mockEggMeal, [], {}, eggAllergiesTest);
    console.log("Test 8 (Allergy check for 'Eggs' matching 'Fried Egg'):", 
        result8.status === 'flagged' && 
        result8.compliance_score === 0 && 
        result8.details.violations.length === 1 && 
        result8.details.violations[0].rule.includes("EGG") 
        ? "PASS" : "FAIL", 
        "Violations count:", result8.details?.violations?.length
    );

    // Test 9: Semantic Dairy Derivative check (Child allergic to 'Dairy', meal has 'Parmesan Cheese')
    const mockCheeseMeal = {
        ai_analysis: {
            items: [
                { name: "Parmesan Cheese", calories: 110 }
            ]
        }
    };
    const dairyAllergiesTest = ["Dairy"];
    const result9 = checkCompliance(mockCheeseMeal, [], {}, dairyAllergiesTest);
    console.log("Test 9 (Dairy allergy vs Parmesan Cheese - Semantic Derivative check):", 
        result9.status === 'flagged' && 
        result9.compliance_score === 0 && 
        result9.details.violations.length === 1 && 
        result9.details.violations[0].rule.includes("DAIRY") &&
        result9.details.violations[0].rule.includes("CHEESE")
        ? "PASS" : "FAIL", 
        "Violation:", result9.details?.violations?.[0]?.rule
    );

    // Test 10: Semantic Gluten Derivative check (Child allergic to 'Gluten', meal has 'French Bread')
    const mockBreadMeal = {
        ai_analysis: {
            items: [
                { name: "French Bread", calories: 150 }
            ]
        }
    };
    const glutenAllergiesTest = ["Gluten"];
    const result10 = checkCompliance(mockBreadMeal, [], {}, glutenAllergiesTest);
    console.log("Test 10 (Gluten allergy vs French Bread - Semantic Derivative check):", 
        result10.status === 'flagged' && 
        result10.compliance_score === 0 && 
        result10.details.violations.length === 1 && 
        result10.details.violations[0].rule.includes("GLUTEN") &&
        result10.details.violations[0].rule.includes("BREAD")
        ? "PASS" : "FAIL", 
        "Violation:", result10.details?.violations?.[0]?.rule
    );

    console.log("--- TESTS COMPLETE ---");
};

runTests();
