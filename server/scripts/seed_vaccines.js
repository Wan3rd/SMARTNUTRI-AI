import prisma from '../lib/prisma.js';

const VACCINES = [
    { name: 'BCG', description: 'Bacille Calmette-Guérin (Tuberculosis)' },
    { name: 'Hepatitis B', description: 'Prevents Hepatitis B infection' },
    { name: 'Polio (IPV)', description: 'Inactivated Poliovirus Vaccine' },
    { name: 'Polio (OPV)', description: 'Oral Poliovirus Vaccine' },
    { name: 'Pentavalent', description: 'DTP-HepB-Hib combination' },
    { name: 'DTaP', description: 'Diphtheria, Tetanus, and acellular Pertussis' },
    { name: 'Hib', description: 'Haemophilus influenzae type b' },
    { name: 'PCV', description: 'Pneumococcal Conjugate Vaccine' },
    { name: 'Rotavirus', description: 'Prevents severe diarrhea caused by rotavirus' },
    { name: 'MMR', description: 'Measles, Mumps, and Rubella' },
    { name: 'Varicella', description: 'Chickenpox vaccine' },
    { name: 'Hepatitis A', description: 'Prevents Hepatitis A infection' },
    { name: 'HPV', description: 'Human Papillomavirus' },
    { name: 'Japanese Encephalitis', description: 'Prevents mosquito-borne JE virus' },
    { name: 'Influenza', description: 'Seasonal flu vaccine' },
    { name: 'Typhoid', description: 'Prevents typhoid fever' },
    { name: 'Meningococcal', description: 'Prevents meningitis' },
    { name: 'COVID-19', description: 'Coronavirus disease prevention' },
    { name: 'Tdap Booster', description: 'Tetanus, Diphtheria, and Pertussis (Booster)' },
    { name: 'Rabies', description: 'Anti-rabies immunization' },
    { name: 'Dengue', description: 'Prevents Dengue fever (e.g. Dengvaxia)' },
    { name: 'Yellow Fever', description: 'Required for international travel to certain areas' },
    { name: 'Cholera', description: 'Prevents cholera infection' }
];

async function main() {
    console.log('Seeding vaccination types...');
    for (const v of VACCINES) {
        await prisma.vaccination_types.upsert({
            where: { name: v.name },
            update: {},
            create: v,
        });
    }
    console.log('Seeding completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
