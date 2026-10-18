import 'dotenv/config';
import { PrismaClient, Status } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const email = 'auth-test-b@example.com';
const password = 'AuthTestB123!';

async function main() {
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.$transaction(async (tx) => {
        const existing = await tx.user.findUnique({ where: { email } });
        if (existing && !(await bcrypt.compare(password, existing.password))) {
            throw new Error('Test email already exists with a different password; no data changed.');
        }

        const user = existing ?? await tx.user.create({
            data: { email, password: hashedPassword, name: 'Auth Test Student B', dailyGoal: 5 },
        });

        const words = [
            { word: 'Aurora', meaning: 'แสงเหนือ', status: Status.MASTERED, mistakeCount: 0 },
            { word: 'Compass', meaning: 'เข็มทิศ', status: Status.LEARNING, mistakeCount: 0 },
            { word: 'Glacier', meaning: 'ธารน้ำแข็ง', status: Status.LEARNING, mistakeCount: 2 },
        ];

        for (const word of words) {
            const found = await tx.vocabulary.findFirst({ where: { userId: user.id, word: word.word } });
            if (!found) {
                await tx.vocabulary.create({ data: { ...word, userId: user.id, partOfSpeech: 'n.' } });
            }
        }
    });
    console.log('Test account ready: auth-test-b@example.com (Auth Test Student B), daily goal 5.');
}

main()
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : 'Test seed failed');
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
