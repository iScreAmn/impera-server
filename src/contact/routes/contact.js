import express from 'express';
import { submitContact } from '../controllers/contactController.js';

const router = express.Router();

/**
 * @route   POST /api/contact/submit
 * @desc    Submit contact form data
 * @access  Public
 */
router.post('/submit', submitContact);

/**
 * @route   GET /api/contact/test
 * @desc    Test endpoint
 * @access  Public
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Contact API is working',
    timestamp: new Date().toISOString()
  });
});

export default router;
