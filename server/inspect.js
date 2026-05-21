import prisma from './lib/prisma.js';

async function main() {
    const profiles = await prisma.profiles.findMany({
        select: {
            id: true,
            child_name: true,
            allergies: true
        }
    });
    console.log("Profiles in DB:", JSON.stringify(profiles, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
