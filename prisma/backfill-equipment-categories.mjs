import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function hasEquipmentColumn(columnName) {
	const rows = await prisma.$queryRaw`
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = 'public'
			  AND table_name = 'Equipment'
			  AND column_name = ${columnName}
		) AS "exists"
	`;

	return Boolean(rows?.[0]?.exists);
}

async function main() {
	const hasLegacyCategoryColumn = await hasEquipmentColumn("category");
	const hasCategoryIdColumn = await hasEquipmentColumn("categoryId");

	if (!hasCategoryIdColumn) {
		throw new Error(
			'Expected "Equipment.categoryId" to exist before backfill.',
		);
	}

	if (!hasLegacyCategoryColumn) {
		console.log(
			'Legacy "Equipment.category" column not found. Category backfill skipped.',
		);
		return;
	}

	const rows = await prisma.$queryRaw`
		SELECT "id", BTRIM("category") AS "category", "categoryId"
		FROM "Equipment"
		WHERE "category" IS NOT NULL
		  AND BTRIM("category") <> ''
	`;

	const toBackfill = rows.filter((row) => row.category && !row.categoryId);
	if (toBackfill.length === 0) {
		console.log("No Equipment rows require category backfill.");
		return;
	}

	await prisma.$transaction(async (tx) => {
		const categoryCache = new Map();

		for (const row of toBackfill) {
			const categoryName = row.category;
			let category = categoryCache.get(categoryName);

			if (!category) {
				category = await tx.equipmentCategory.upsert({
					where: { name: categoryName },
					update: {},
					create: { name: categoryName },
				});
				categoryCache.set(categoryName, category);
			}

			await tx.equipment.updateMany({
				where: {
					id: row.id,
					categoryId: null,
				},
				data: {
					categoryId: category.id,
				},
			});
		}
	});

	console.log(`Backfilled categories for ${toBackfill.length} equipment rows.`);
}

main()
	.catch((error) => {
		console.error("Category backfill failed:", error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
