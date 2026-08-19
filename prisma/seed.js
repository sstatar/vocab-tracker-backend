"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Start seeding...');
    const hashedPassword = await bcryptjs_1.default.hash('password123', 10);
    const user = await prisma.user.upsert({
        where: { email: 'demo@example.com' },
        update: {},
        create: {
            email: 'demo@example.com',
            name: 'Demo Student',
            password: hashedPassword,
            dailyGoal: 20
        },
    });
    console.log(`👤 Created/Found User: ${user.name} (Email: ${user.email})`);
    const vocabs = [
        { word: 'Accommodate', meaning: 'จัดหาที่พักให้, ปรับตัว', partOfSpeech: 'Verb', status: 'MASTERED', mistakeCount: 0, example: 'We can accommodate up to 50 guests.' },
        { word: 'Benevolent', meaning: 'เมตตา, ใจบุญ', partOfSpeech: 'Adjective', status: 'MASTERED', mistakeCount: 0, example: 'She is known for her benevolent acts.' },
        { word: 'Conundrum', meaning: 'ปัญหาที่ยากจะแก้ไข', partOfSpeech: 'Noun', status: 'LEARNING', mistakeCount: 1, example: 'The current economic conundrum is hard to solve.' },
        { word: 'Diligent', meaning: 'ขยันหมั่นเพียร', partOfSpeech: 'Adjective', status: 'LEARNING', mistakeCount: 0, example: 'He is a diligent student.' },
        { word: 'Eloquent', meaning: 'พูดจาฉะฉาน, มีโวหารดี', partOfSpeech: 'Adjective', status: 'LEARNING', mistakeCount: 2, example: 'She gave an eloquent speech.' },
        { word: 'Frugal', meaning: 'ประหยัด, มัธยัสถ์', partOfSpeech: 'Adjective', status: 'LEARNING', mistakeCount: 0, example: 'We must be frugal with our budget.' },
        { word: 'Gregarious', meaning: 'ชอบเข้าสังคม', partOfSpeech: 'Adjective', status: 'LEARNING', mistakeCount: 0, example: 'Dolphins are highly gregarious animals.' },
    ];
    await prisma.vocabulary.deleteMany({
        where: { userId: user.id },
    });
    for (const v of vocabs) {
        await prisma.vocabulary.create({
            data: {
                word: v.word,
                meaning: v.meaning,
                partOfSpeech: v.partOfSpeech,
                example: v.example,
                status: v.status,
                mistakeCount: v.mistakeCount,
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
