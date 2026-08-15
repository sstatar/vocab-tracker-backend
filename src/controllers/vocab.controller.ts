import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';

const prisma = new PrismaClient();

/**
 * Create a new vocabulary entry for the authenticated user
 */
export const createVocab = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { word, meaning, partOfSpeech, example } = req.body;
    const userId = req.userId as string;

    const newVocab = await prisma.vocabulary.create({
      data: {
        word,
        meaning,
        partOfSpeech,
        example,
        userId,
      },
    });

    res.status(201).json(newVocab);
  } catch (error) {
    console.error('Create Vocab Error:', error);
    res.status(500).json({ error: 'Internal server error while creating vocabulary' });
  }
};

/**
 * Retrieve all vocabularies belonging to the authenticated user
 */
export const getVocabs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userVocabs = await prisma.vocabulary.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }, // Sort by newest first
    });

    res.status(200).json(userVocabs);
  } catch (error) {
    console.error('Fetch Vocabs Error:', error);
    res.status(500).json({ error: 'Internal server error while fetching vocabularies' });
  }
};

/**
 * Update a specific vocabulary (ensures ownership via userId)
 */
export const updateVocab = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId as string;
    const id = req.params.id as string;
    const { status, word, meaning, partOfSpeech, example } = req.body;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // 1. เช็กความปลอดภัยก่อนว่ามีสิทธิ์แก้ไหม
    const existingVocab = await prisma.vocabulary.findFirst({
      where: { id: id, userId: userId }
    });

    if (!existingVocab) {
      res.status(404).json({ message: "Vocabulary not found or unauthorized" });
      return;
    }

    // 2. ถ้ามีสิทธิ์ ค่อยสั่ง Update
    const updatedVocab = await prisma.vocabulary.update({
      where: { id: id },
      data: { status, word, meaning, partOfSpeech, example },
    });

    res.status(200).json(updatedVocab);
  } catch (error) {
    console.error("Error updating vocab:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Review a vocabulary and update Daily Goal & Streak
 */
export const reviewVocab = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId as string;
    const id = req.params.id as string;
    const { status } = req.body;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const existingVocab = await prisma.vocabulary.findFirst({
      where: { id: id, userId: userId }
    });

    if (!existingVocab) {
      res.status(404).json({ message: "Vocabulary not found or unauthorized" });
      return;
    }

    const updatedVocab = await prisma.vocabulary.update({
      where: { id: id },
      data: { status: status },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (user) {
      await prisma.dailyProgress.upsert({
        where: { userId_date: { userId: userId, date: today } },
        update: { reviewedCount: { increment: 1 } },
        create: { userId: userId, date: today, reviewedCount: 1 }
      });

      let newStreak = user.currentStreak;
      const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
      if (lastActive) lastActive.setHours(0, 0, 0, 0);

      if (!lastActive || lastActive.getTime() !== today.getTime()) {
        if (lastActive && lastActive.getTime() === yesterday.getTime()) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }

        await prisma.user.update({
          where: { id: userId },
          data: {
            currentStreak: newStreak,
            lastActiveDate: today
          }
        });
      }
    }

    res.status(200).json({ message: "Review recorded", vocab: updatedVocab });
  } catch (error) {
    console.error("Error in reviewVocab:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Delete a specific vocabulary (ensures ownership via userId)
 */
export const deleteVocab = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.userId as string;

    // Security check: Verify ownership before deleting
    const existingVocab = await prisma.vocabulary.findFirst({
      where: { id, userId }
    });

    if (!existingVocab) {
      res.status(404).json({ error: 'Vocabulary not found or unauthorized' });
      return;
    }

    await prisma.vocabulary.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Vocabulary deleted successfully' });
  } catch (error) {
    console.error('Delete Vocab Error:', error);
    res.status(500).json({ error: 'Internal server error while deleting vocabulary' });
  }
};

export const getVocabStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId as string;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // 1. ดึงสถิติคำศัพท์เหมือนเดิม
    const [totalVocabs, masteredVocabs, learningVocabs, needsReviewVocabs] = await Promise.all([
      prisma.vocabulary.count({ where: { userId: userId } }),
      prisma.vocabulary.count({ where: { userId: userId, status: 'MASTERED' } }),
      prisma.vocabulary.count({ where: { userId: userId, status: 'LEARNING' } }),
      prisma.vocabulary.count({ where: { userId: userId, status: 'NEEDS_REVIEW' } })
    ]);

    // 🌟 2. (ส่วนที่แก้เพิ่ม) หาวันที่ของวันนี้ เพื่อดึงเป้าหมายรายวัน
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        dailyProgresses: {
          where: { date: today } // ดึงเฉพาะประวัติของวันนี้
        }
      }
    });

    // 3. ส่งข้อมูลกลับไปให้หน้าเว็บ (เพิ่มตัวแปรใหม่เข้าไป)
    res.status(200).json({
      total: totalVocabs,
      mastered: masteredVocabs,
      learning: learningVocabs,
      needsReview: needsReviewVocabs,
      progressPercentage: totalVocabs === 0 ? 0 : Math.round((masteredVocabs / totalVocabs) * 100),

      // 🌟 ข้อมูลที่ Dashboard ต้องการเอาไปโชว์
      userName: user?.name || "User",
      streak: user?.currentStreak || 0,
      dailyGoal: user?.dailyGoal || 20,
      reviewedToday: user?.dailyProgresses[0]?.reviewedCount || 0
    });

  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
};