import prisma from '../lib/prisma.js';

const testManagement = async () => {
    try {
        console.log("--- TESTING RULE MANAGEMENT ---");

        // 1. Get a test profile
        const profile = await prisma.profiles.findFirst({ select: { id: true } });
        if (!profile) {
            console.log("No profiles found. Skipping test.");
            return;
        }
        const profileId = profile.id;
        console.log(`Using Profile ID: ${profileId}`);

        // 2. Add a test rule
        const nutritionist = await prisma.users.findFirst({
            where: { role: 'nutritionist' },
            select: { id: true }
        });
        if (!nutritionist) {
            console.log("No nutritionist found. Skipping test.");
            return;
        }
        const nutritionistId = nutritionist.id;

        console.log("Adding test rule...");
        const newRule = await prisma.nutrition_rules.create({
            data: {
                profile_id: profileId,
                nutritionist_id: nutritionistId,
                category: 'Sugar',
                rule_name: 'Test Rule',
                rule_definition: "Max 50g",
                rule_type: 'max',
                rule_value: 50,
                rule_unit: 'g'
            }
        });
        const ruleId = newRule.id;
        console.log(`Rule added with ID: ${ruleId}`);

        // 3. Delete the rule
        console.log("Deleting test rule...");
        const deletedRule = await prisma.nutrition_rules.deleteMany({
            where: {
                id: ruleId,
                nutritionist_id: nutritionistId
            }
        });

        if (deletedRule.count > 0) {
            console.log("PASS: Rule deleted successfully.");
        } else {
            console.log("FAIL: Rule not deleted.");
        }

        console.log("--- TESTS COMPLETE ---");

    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        await prisma.$disconnect();
    }
};

testManagement();
