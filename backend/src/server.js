import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB } from './utils/db.js';
import { initBCVCron } from './utils/bcvUpdater.js';
import inventoryRoutes from './routes/inventory.js';
import salesRoutes from './routes/sales.js';
import registersRoutes from './routes/registers.js';
import creditsRoutes from './routes/credits.js';
import reportsRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';
import usersRoutes from './routes/users.js';

import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Init Database y Cron Jobs
initDB().then(() => {
    initBCVCron();
});

app.use('/api/auth', authRoutes);
console.log('Auth routes stack:', authRoutes.stack.map(l => l.route.path));
app.use('/api/users', usersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/registers', registersRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);

// Routes will be added here
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
