import cors from 'cors';
import express from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import readingsRoutes from './modules/readings/readings.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Sweety API is running successfully',
    service: 'Kenpath Sweety Backend',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/readings', readingsRoutes);
app.use('/api/reports', reportsRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error?.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'A record with these details already exists.' });
  }
  if (error?.message?.startsWith('JWT_SECRET must be')) {
    return res.status(500).json({ success: false, message: 'Authentication is not configured correctly.' });
  }
  console.error('Request failed unexpectedly.');
  return res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

export default app;
