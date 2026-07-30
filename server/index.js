import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDb } from './db.js';
import router from './routes.js';
import { startWorker } from './worker.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', router);

// Root endpoint for health checks (Render/Cron)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.status(200).send('Albion Data Analyzer API is running. Frontend is hosted on Vercel.');
});

// Initialize database and start server
async function startServer() {
  try {
    // 1. Initialize SQLite Database
    await initDb();
    
    // 2. Start the Express Server
    app.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(`Backend server running on port: ${PORT}`);
      console.log(`API base URL: http://localhost:${PORT}/api`);
      console.log(`=========================================`);
    });

    // 3. Start Background price update worker
    await startWorker();
    
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
