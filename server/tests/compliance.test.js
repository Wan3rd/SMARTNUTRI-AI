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

    console.log("--- TESTS COMPLETE ---");
};

runTests();
