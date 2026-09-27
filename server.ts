import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { seedDatabase } from './server/db/seed';
import { initSocketService } from './server/services/socketService';
import { authRouter } from './server/routes/authRoutes';
import { marketRouter } from './server/routes/marketRoutes';
import { entryRouter } from './server/routes/entryRoutes';
import { resultRouter } from './server/routes/resultRoutes';
import { walletRouter } from './server/routes/walletRoutes';
import { adminRouter } from './server/routes/adminRoutes';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});
initSocketService(io);

// Middleware
app.use(cors());
app.use(express.json());

// API health endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'MatkaVibe Demo Results & Prediction Arena',
    type: 'VIRTUAL_CREDIT_DEMO_ONLY',
    timestamp: new Date().toISOString()
  });
});

// Mount modular API routes
app.use('/api/auth', authRouter);
app.use('/api/markets', marketRouter);
app.use('/api/entries', entryRouter);
app.use('/api/results', resultRouter);
app.use('/api/admin/results', resultRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/admin', adminRouter);

// Simulated External Result API Endpoint for testing third-party integration
app.get('/api/external-result-api/latest', (_req, res) => {
  res.json({
    provider: 'Simulated National Results Provider API',
    status: 'ACTIVE',
    version: 'v2.1',
    note: 'Demo result provider feed for testing settlement and ingestion pipeline.',
    samplePayload: {
      openPana: '345',
      closePana: '450',
      openDigit: '2',
      closeDigit: '9',
      checksum: 'VERIFIED'
    }
  });
});

async function startServer() {
  // Initialize and seed database
  await seedDatabase();

  const isProduction = process.env.NODE_ENV === 'production';
  const PORT = process.env.PORT || 3000;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 MatkaVibe Demo Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
