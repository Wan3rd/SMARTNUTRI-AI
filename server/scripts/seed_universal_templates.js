import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const UNIVERSAL_TEMPLATES = [
    {
        name: "Toddler Balanced Template (1-2 years)",
        matrix: [
            { meal_type: 'Breakfast', vegetables: '', fruit: '1/2 pc', milk: '1 cup', rice: '1/2 cup', meat: '1/2 exchange', fat: '1 tsp', sugar: '' },
            { meal_type: 'AM Snack',  vegetables: '', fruit: '1/2 pc', milk: '1/2 cup', rice: '1/4 cup', meat: '', fat: '', sugar: '' },
            { meal_type: 'Lunch',     vegetables: '1/2 cup', fruit: '', milk: '', rice: '1/2 cup', meat: '1 exchange', fat: '1 tsp', sugar: '' },
            { meal_type: 'PM Snack',  vegetables: '', fruit: '', milk: '1/2 cup', rice: '1/4 cup', meat: '', fat: '', sugar: '' },
            { meal_type: 'Dinner',    vegetables: '1/2 cup', fruit: '', milk: '', rice: '1/2 cup', meat: '1 exchange', fat: '1 tsp', sugar: '' },
        ]
    },
    {
        name: "Preschooler Balanced Template (3-5 years)",
        matrix: [
            { meal_type: 'Breakfast', vegetables: '', fruit: '1 pc', milk: '1 cup', rice: '1 cup', meat: '1 exchange', fat: '1 tsp', sugar: '' },
            { meal_type: 'AM Snack',  vegetables: '', fruit: '1 pc', milk: '', rice: '1/2 cup', meat: '', fat: '', sugar: '' },
            { meal_type: 'Lunch',     vegetables: '1/2 cup', fruit: '', milk: '', rice: '1 cup', meat: '1.5 exchanges', fat: '1 tsp', sugar: '' },
            { meal_type: 'PM Snack',  vegetables: '', fruit: '', milk: '1 cup', rice: '1/2 cup', meat: '', fat: '', sugar: '' },
            { meal_type: 'Dinner',    vegetables: '1/2 cup', fruit: '', milk: '', rice: '1 cup', meat: '1 exchange', fat: '1 tsp', sugar: '' },
        ]
    },
    {
        name: "Grade-Schooler Balanced Template (6-9 years)",
        matrix: [
            { meal_type: 'Breakfast', vegetables: '', fruit: '1 pc', milk: '1 cup', rice: '1.5 cups', meat: '1.5 exchanges', fat: '2 tsp', sugar: '' },
            { meal_type: 'AM Snack',  vegetables: '', fruit: '1 pc', milk: '', rice: '1 cup', meat: '', fat: '', sugar: '' },
            { meal_type: 'Lunch',     vegetables: '1 cup', fruit: '', milk: '', rice: '1.5 cups', meat: '2 exchanges', fat: '2 tsp', sugar: '' },
            { meal_type: 'PM Snack',  vegetables: '', fruit: '', milk: '1 cup', rice: '1 cup', meat: '', fat: '', sugar: '' },
            { meal_type: 'Dinner',    vegetables: '1 cup', fruit: '', milk: '', rice: '1.5 cups', meat: '1.5 exchanges', fat: '2 tsp', sugar: '' },
        ]
    }
];

async function main() {
    // 1. Clean up any previous portion templates with these names associated with specific nutritionist accounts (to clean up old seeds)
    const templateNames = UNIVERSAL_TEMPLATES.map(t => t.name);
    
    console.log("Cleaning up old custom-assigned templates with identical names...");
    const deletedCustom = await prisma.portion_templates.deleteMany({
        where: {
            template_name: { in: templateNames },
            nutritionist_id: { not: null }
        }
    });
    console.log(`Deleted ${deletedCustom.count} custom templates.`);

    // 2. Seed universal portion templates (nutritionist_id: null)
    for (const temp of UNIVERSAL_TEMPLATES) {
        const existing = await prisma.portion_templates.findFirst({
            where: {
                nutritionist_id: null,
                template_name: temp.name
            }
        });

        if (existing) {
            console.log(`Universal Template '${temp.name}' already exists. Skipping.`);
        } else {
            const created = await prisma.portion_templates.create({
                data: {
                    nutritionist_id: null,
                    template_name: temp.name,
                    matrix: temp.matrix
                }
            });
            console.log(`Seeded universal template: '${created.template_name}' successfully.`);
        }
    }
    console.log("All universal templates seeded successfully!");
}

main()
    .catch(e => console.error("Seeding failed:", e))
    .finally(async () => await prisma.$disconnect());
