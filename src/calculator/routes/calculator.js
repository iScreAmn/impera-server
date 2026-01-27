import express from 'express';
import { submitCalculator } from '../controllers/calculatorController.js';

const router = express.Router();

/**
 * @route   POST /api/calculator/submit
 * @desc    Submit calculator form data
 * @access  Public
 */
router.post('/submit', submitCalculator);

/**
 * @route   GET /api/calculator/test
 * @desc    Test endpoint
 * @access  Public
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Calculator API is working',
    timestamp: new Date().toISOString()
  });
});

export default router;
