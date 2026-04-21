import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import studiosRoutes from './routes/studios.routes.js';
import cookiesRoutes from './routes/cookies.routes.js';
import { startCronJobs } from './services/cron/jobScheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Basic Route for testing
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Gudang Kreatif Studio API is running!' });
});

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/studios', studiosRoutes);
app.use('/api/cookies', cookiesRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

app.listen(PORT, () => {
  console.log(`🚀 [Server] Backend Express berjalan di http://localhost:${PORT}`);
  
  // Menyalakan robot chron jobs
  startCronJobs();
});
