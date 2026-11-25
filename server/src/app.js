import cors from 'cors';
import express from 'express';

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

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

export default app;
