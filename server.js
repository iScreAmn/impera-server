import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import contactRoutes from './src/contact/routes/contact.js';
import calculatorRoutes from './src/calculator/routes/calculator.js';
import questionRoutes from './src/question/routes/question.js';
import { verifyEmailConfig as verifyContactEmail } from './src/contact/services/emailService.js';
import { verifyEmailConfig as verifyCalculatorEmail } from './src/calculator/services/emailService.js';
import { verifyEmailConfig as verifyQuestionEmail } from './src/question/services/emailService.js';
import { getTelegramHealthDetails, sendTelegramMessage, verifyTelegramConfig } from './src/telegram/services/telegramClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error('WARNING: SMTP credentials not found in .env file!');
  console.error('Please create .env file with SMTP_USER and SMTP_PASS');
}

if (!process.env.ADMIN_EMAIL) {
  console.error('WARNING: ADMIN_EMAIL not found in .env file!');
  console.error('Emails will not be sent until ADMIN_EMAIL is configured');
}

if (process.env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_CHAT_ID) {
  console.error('WARNING: TELEGRAM_CHAT_ID not found in .env file!');
  console.error('Telegram messages will not be sent until TELEGRAM_CHAT_ID is configured');
}

const app = express();
const PORT = process.env.PORT || 3001;

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:3000'
];

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    const whitelist = allowedOrigins.length ? allowedOrigins : defaultOrigins;
    if (!origin) return callback(null, true);
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
    if (whitelist.includes(origin) || isLocal) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitStore = new Map();

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
};

const rateLimit = (req, res, next) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const current = rateLimitStore.get(ip);

  if (!current || now > current.expiresAt) {
    rateLimitStore.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.'
    });
  }

  current.count += 1;
  rateLimitStore.set(ip, current);
  return next();
};

app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Impera Design Server',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Impera Design Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health/email', async (req, res) => {
  const [contactOk, calculatorOk, questionOk] = await Promise.all([
    verifyContactEmail(),
    verifyCalculatorEmail(),
    verifyQuestionEmail()
  ]);

  res.json({
    success: contactOk && calculatorOk && questionOk,
    contact: contactOk,
    calculator: calculatorOk,
    question: questionOk,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health/telegram', async (req, res) => {
  const ok = await verifyTelegramConfig();
  res.json({
    success: ok,
    details: getTelegramHealthDetails(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health/telegram/send-test', async (req, res) => {
  try {
    const text = typeof req.query.text === 'string' ? req.query.text : '';
    const safeText = (text || 'ping').slice(0, 300);
    const result = await sendTelegramMessage(`<b>Impera Server:</b> ${safeText}`);
    res.json({
      success: true,
      result,
      details: getTelegramHealthDetails(),
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e?.message || String(e),
      details: getTelegramHealthDetails(),
      timestamp: new Date().toISOString()
    });
  }
});

app.use('/api', rateLimit);
app.use('/api/contact', contactRoutes);
app.use('/api/calculator', calculatorRoutes);
app.use('/api/question', questionRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`Impera Design Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('='.repeat(50));
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
  });
}

export default app;
