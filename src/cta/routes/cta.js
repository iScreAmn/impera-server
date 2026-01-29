import express from 'express';
import { submitCta } from '../controllers/ctaController.js';

const router = express.Router();
router.post('/submit', submitCta);

export default router;
