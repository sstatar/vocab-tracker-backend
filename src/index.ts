import express, { Request, Response } from 'express';
import cors from 'cors';
import vocabRoutes from './routes/vocab.routes';
import authRoutes from './routes/auth.routes';

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Vocab Tracker API is running...' });
});

// Routes
app.use('/api/vocab', vocabRoutes);
app.use('/api/auth', authRoutes);

app.listen(port, () => {
  console.log(`[Server]: API is running at http://localhost:${port}`);
});