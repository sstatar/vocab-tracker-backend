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
    const id = req.params.id as string;
    const { word, meaning, partOfSpeech, example, status } = req.body;
    const userId = req.userId as string;

    // Security check: Find the vocab first to ensure it belongs to the requesting user
    const existingVocab = await prisma.vocabulary.findFirst({
      where: { id, userId }
    });

    if (!existingVocab) {
      res.status(404).json({ error: 'Vocabulary not found or unauthorized' });
      return;
    }

    const updatedVocab = await prisma.vocabulary.update({
      where: { id },
      data: {
        word,
        meaning,
        partOfSpeech,
        example,
        status,
      },
    });

    res.status(200).json(updatedVocab);
  } catch (error) {
    console.error('Update Vocab Error:', error);
    res.status(500).json({ error: 'Internal server error while updating vocabulary' });
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
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const [totalVocabs, masteredVocabs, learningVocabs, needsReviewVocabs] = await Promise.all([
      prisma.vocabulary.count({ where: { userId: userId } }),
      prisma.vocabulary.count({ where: { userId: userId, status: 'MASTERED' } }),
      prisma.vocabulary.count({ where: { userId: userId, status: 'LEARNING' } }),
      prisma.vocabulary.count({ where: { userId: userId, status: 'NEEDS_REVIEW' } }) // 🌟 เพิ่มสถานะนี้
    ]);

    res.status(200).json({
      total: totalVocabs,
      mastered: masteredVocabs,
      learning: learningVocabs,
      needsReview: needsReviewVocabs,
      progressPercentage: totalVocabs === 0 ? 0 : Math.round((masteredVocabs / totalVocabs) * 100)
    });

  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
};