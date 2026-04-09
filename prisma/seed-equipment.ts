import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function parseQuantityAndUnit(qStr: string): { total: number, unitType: string } {
    const match = qStr.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)(?:\s*\(.*\))?$/);
    if (!match || !match[1] || !match[2]) return { total: parseInt(qStr) || 1, unitType: 'UNIT' };
    
    const val = parseFloat(match[1].replace(',', '.'));
    const unitRaw = match[2].toUpperCase();
    
    let unitType = 'UNIT';
    if (['ML', 'L', 'G', 'MG'].includes(unitRaw)) {
        unitType = unitRaw;
    } else if (unitRaw === 'BOX') {
        unitType = 'BOX';
    } else if (unitRaw === 'TABLETS') {
        unitType = 'TABLETS';
    } else if (qStr.toLowerCase().includes('ml')) {
        unitType = 'ML';
    } else if (qStr.toLowerCase().includes('g')) {
        unitType = 'G';
    }

    return { total: isNaN(val) ? 1 : Math.round(val), unitType };
}

async function main() {
    const dataPath = path.join(process.cwd(), 'seed-data.txt');
    const content = fs.readFileSync(dataPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);

    // Get labs
    const physicsLab = await prisma.lab.findFirst({ where: { name: { contains: 'physics', mode: 'insensitive' } } });
    const biologyLab = await prisma.lab.findFirst({ where: { name: { contains: 'biology', mode: 'insensitive' } } });

	if (!physicsLab || !biologyLab) {
		const missingLabs: string[] = [];
		if (!physicsLab) missingLabs.push("physics");
		if (!biologyLab) missingLabs.push("biology");
		throw new Error(`Required labs missing: ${missingLabs.join(", ")}`);
	}

    // Delete existing equipment
    await prisma.sessionEquipment.deleteMany({});
    await prisma.equipmentBooking.deleteMany({});
    await prisma.equipment.deleteMany({});

    for (const line of lines) {
        let category = 'General';
        let labId = physicsLab.id;
        let locationStr = 'Chem Lab';

        if (line.toLowerCase().includes('bio lab')) {
            labId = biologyLab.id;
            locationStr = 'Bio Lab';
        } else if (line.toLowerCase().includes('chem lab')) {
            labId = physicsLab.id;
            locationStr = 'Chem Lab';
        }

        const words = line.split(' ');
        
        // Very basic parsing since the format is irregular
        // We know location is at the end "Bio Lab" or "Chem Lab"
        const noLocation = line.replace(/Bio Lab/i, '').replace(/Chem Lab/i, '').trim();
        
        const tokens = noLocation.split(/\s+/);
        
        if (tokens.length < 3) continue;

        // Categories are usually first 1-2 words: "Bio", "General Organic", "General Inorganic", "Corrosive Solid", "Flammable Water/Liquids", "Toxic Inorganic", "Others", "Oxidising Agent"
        const possibleCategories = [
            "General Organic", "General Inorganic", "Corrosive Solid", "Corrosive Water", 
            "Flammable Water/Liquids", "Toxic Inorganic", "Oxidising Agent", "Bio", "potass", "Others"
        ];

        for (const cat of possibleCategories) {
            if (noLocation.startsWith(cat)) {
                category = cat;
                break;
            }
        }

        const afterCategory = noLocation.substring(category.length).trim();
        const parts = afterCategory.split(/\s+/);
        
        let casNumber = null;
        let quantityStr = '1 UNIT';
        let expiryDate = null;
        let name: string[] = [];
        let brand: string[] = [];

        // find date YYYY-MM-DD
        const dateIndex = parts.findIndex(p => /\d{4}-\d{2}-\d{2}/.test(p));
        if (dateIndex !== -1) {
            expiryDate = parts[dateIndex];
        }

        // find CAS (digits-digits-digits) or "n/a"
        // find Quantity (digits+g, ml, l)
        for (let i = 0; i < parts.length; i++) {
            const p = parts[i];
            if (!p) continue;
            if (/\d+-\d+-\d+/.test(p) && p !== expiryDate) {
                casNumber = p;
            } else if (/\d+(g|ml|l|mg)/i.test(p) || p === '100g(x2)') {
                quantityStr = p;
            }
        }

        // name is everything before cas or quantity
        let nameEndIndex = parts.length;
        if (casNumber) nameEndIndex = Math.min(nameEndIndex, parts.indexOf(casNumber));
        if (quantityStr !== '1 UNIT') nameEndIndex = Math.min(nameEndIndex, parts.indexOf(quantityStr));
        if (expiryDate) nameEndIndex = Math.min(nameEndIndex, parts.indexOf(expiryDate));
        
        // anything "n/a" in the first few parts is usually CAS
        const naIndex = parts.indexOf('n/a');
        if (naIndex !== -1 && naIndex < nameEndIndex) {
            nameEndIndex = naIndex;
        }

        name = parts.slice(0, nameEndIndex);

        // brand is anything after expiryDate, or after quantity if no expiry
        let brandStartIndex = parts.length;
        if (expiryDate) brandStartIndex = parts.indexOf(expiryDate) + 1;
        else if (quantityStr !== '1 UNIT') brandStartIndex = parts.indexOf(quantityStr) + 1;

        if (brandStartIndex < parts.length) {
            brand = parts.slice(brandStartIndex).filter(p => p !== 'n/a');
        }

        const nameStr = name.join(' ').replace(/^n\/a\s*/, '').trim() || 'Unknown';
        const brandStr = brand.join(' ').trim() || null;
        
        const { total, unitType } = parseQuantityAndUnit(quantityStr);

        let parsedDate = null;
        if (expiryDate) {
            parsedDate = new Date(expiryDate);
            if (isNaN(parsedDate.getTime())) parsedDate = null;
        }

        await prisma.equipment.create({
            data: {
                labId,
                category,
                name: nameStr,
                casNumber,
                total,
                unitType: unitType as any,
                expirationDate: parsedDate,
                brand: brandStr,
                location: locationStr
            }
        });
    }

    console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
