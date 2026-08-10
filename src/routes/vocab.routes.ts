import { Router } from 'express';
import { createVocab, getVocabs, updateVocab, deleteVocab, getVocabStats } from '../controllers/vocab.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

// Protected Vocabulary Routes (Require valid JWT token)
router.get('/stats', verifyToken, getVocabStats);
router.post('/', verifyToken, createVocab);
router.get('/', verifyToken, getVocabs);
router.put('/:id', verifyToken, updateVocab);
router.delete('/:id', verifyToken, deleteVocab);



export default router;