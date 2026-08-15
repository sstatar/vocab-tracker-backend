import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Start seeding...');

    // 1. สร้างรหัสผ่านแบบ Hash เพื่อความสมจริง
    const hashedPassword = await bcrypt.hash('password123', 10);

    // 2. สร้าง User สมมติ 1 คน (ใช้ upsert เพื่อให้รันไฟล์นี้ซ้ำกี่รอบก็ได้ โค้ดจะไม่พัง)
    const user = await prisma.user.upsert({
        where: { email: 'demo@example.com' },
        update: {},
        create: {
            email: 'demo@example.com',
            name: 'Demo Student',
            password: hashedPassword,
            dailyGoal: 20,
            currentStreak: 3, // จำลองว่ามีสตรีค 3 วันแล้ว
        },
    });

    console.log(`👤 Created/Found User: ${user.name} (Email: ${user.email})`);

    // 3. เตรียมชุดคำศัพท์จำลอง
    const vocabs = [
        { word: 'Accommodate', meaning: 'จัดหาที่พักให้, ปรับตัว', partOfSpeech: 'Verb', status: 'MASTERED', example: 'We can accommodate up to 50 guests.' },
        { word: 'Benevolent', meaning: 'เมตตา, ใจบุญ', partOfSpeech: 'Adjective', status: 'MASTERED', example: 'She is known for her benevolent acts.' },
        { word: 'Conundrum', meaning: 'ปัญหาที่ยากจะแก้ไข', partOfSpeech: 'Noun', status: 'NEEDS_REVIEW', example: 'The current economic conundrum is hard to solve.' },
        { word: 'Diligent', meaning: 'ขยันหมั่นเพียร', partOfSpeech: 'Adjective', status: 'LEARNING', example: 'He is a diligent student.' },
        { word: 'Eloquent', meaning: 'พูดจาฉะฉาน, มีโวหารดี', partOfSpeech: 'Adjective', status: 'NEEDS_REVIEW', example: 'She gave an eloquent speech.' },
        { word: 'Frugal', meaning: 'ประหยัด, มัธยัสถ์', partOfSpeech: 'Adjective', status: 'LEARNING', example: 'We must be frugal with our budget.' },
        { word: 'Gregarious', meaning: 'ชอบเข้าสังคม', partOfSpeech: 'Adjective', status: 'LEARNING', example: 'Dolphins are highly gregarious animals.' },
    ];

    // 4. ล้างคำศัพท์เก่าของ User คนนี้ออกก่อน (ถ้ามี) จะได้ไม่ซ้ำซ้อนเวลารันหลายรอบ
    await prisma.vocabulary.deleteMany({
        where: { userId: user.id },
    });

    // 5. นำคำศัพท์เข้าไปใน Database ทีละคำ
    for (const v of vocabs) {
        await prisma.vocabulary.create({
            data: {
                word: v.word,
                meaning: v.meaning,
                partOfSpeech: v.partOfSpeech,
                example: v.example,
                status: v.status as 'MASTERED' | 'LEARNING' | 'NEEDS_REVIEW',
                userId: user.id,
            },
        });
    }

    console.log(`📚 Seeded ${vocabs.length} vocabularies for user.`);
    console.log('✅ Seeding finished!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });