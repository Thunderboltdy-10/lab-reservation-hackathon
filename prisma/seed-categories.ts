import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
	"General",
	"General Organic",
	"General Inorganic",
	"Corrosive Solid",
	"Corrosive Water",
	"Flammable Water/Liquids",
	"Toxic Inorganic",
	"Oxidising Agent",
	"Bio",
	"potass",
	"Others",
	"Glassware",
	"Data Logger",
	"Sensors",
];

async function main() {
	console.log("Seeding equipment categories...");

	for (const name of DEFAULT_CATEGORIES) {
		await prisma.equipmentCategory.upsert({
			where: { name },
			update: {},
			create: { name },
		});
	}

	console.log("Categories seeded:", DEFAULT_CATEGORIES.length);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
