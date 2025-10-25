// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import projectRoutes from './routes/projects';
import conversationRoutes from './routes/conversations';
import referenceRoutes from './routes/references';
import agentRoutes from './routes/agents';
import documentRoutes from './routes/documents';
import generatedDocumentsRoutes from './routes/generated-documents';
import sessionRoutes from './routes/sessions';
import sandboxRoutes from './routes/sandbox';
import canvasRoutes from './routes/canvas';
import researchRoutes from './routes/research';
import analysisChatRoutes from './routes/analysis-chat';
import analysisTemplatesRoutes from './routes/analysis-templates';
import sessionReviewRoutes from './routes/session-review';
import brainstormSessionsRoutes from './routes/brainstorm-sessions';
import { testConnection } from './services/supabase';

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    process.env.FRONTEND_URL || 'http://localhost:5173'
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/references', referenceRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/generated-documents', generatedDocumentsRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/sandbox', sandboxRoutes);
app.use('/api/canvas', canvasRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/analysis', analysisChatRoutes); // Phase 4.1
app.use('/api/analysis-templates', analysisTemplatesRoutes); // Phase 4.2
app.use('/api/session-review', sessionReviewRoutes); // Sandbox session review
app.use('/api/brainstorm-sessions', brainstormSessionsRoutes); // Brainstorm sessions

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('⚠️  Warning: Database connection failed');
    }

    app.listen(PORT, () => {
      console.log('\n🚀 AI Brainstorm Platform Backend');
      console.log(`📡 Server running on http://localhost:${PORT}`);
      console.log(`🗄️  Database: ${dbConnected ? '✓ Connected' : '✗ Not connected'}`);
      console.log(`🤖 8 AI Agents: Ready (5 Core + 3 Support)`);
      console.log(`\nEndpoints:`);
      console.log(`  GET  /health`);
      console.log(`  POST /api/projects`);
      console.log(`  GET  /api/projects/user/:userId`);
      console.log(`  POST /api/conversations/:projectId/message`);
      console.log(`  POST /api/references/upload`);
      console.log(`  POST /api/documents/upload`);
      console.log(`  POST /api/documents/folders`);
      console.log(`  GET  /api/agents/list`);
      console.log(`  GET  /api/agents/stats`);
      console.log(`  POST /api/sessions/start`);
      console.log(`  GET  /api/sessions/summary/:userId/:projectId`);
      console.log('\n✨ Ready to brainstorm!\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
// Force restart
// cache cleared
