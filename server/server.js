const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
// Server entry point for Campus PMES (Local & Cloud ready)
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const { ensureAdmin } = require('./ensureAdmin');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const departmentRoutes = require('./routes/departments');
const subjectRoutes = require('./routes/subjects');
const categoryRoutes = require('./routes/categories');
const assignmentRoutes = require('./routes/assignments');
const projectRoutes = require('./routes/projects');
const submissionRoutes = require('./routes/submissions');
const evaluationRoutes = require('./routes/evaluation');
const notificationRoutes = require('./routes/notifications');
const announcementRoutes = require('./routes/announcements');
const dashboardRoutes = require('./routes/dashboard');
const metaRoutes = require('./routes/meta');
const marksRoutes = require('./routes/marks');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Campus Project Management & Evaluation System (Campus PMES)',
    version: '1.1.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api', assignmentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', submissionRoutes);
app.use('/api', evaluationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/marks', marksRoutes);

// Production Static Assets (Azure / Single Service Deployment per SRS Section 10)
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDistPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 Route for undefined API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: `API route '${req.originalUrl}' not found.` });
});

// Global Error Handler (Section 6.5)
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'An internal server error occurred.'
  });
});

const PORT = process.env.PORT || 5000;

// Start server after connecting to database
const startServer = async () => {
  await connectDB();
  await ensureAdmin();
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Campus PMES Server running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`====================================================`);
  });
};

startServer();

module.exports = app;
