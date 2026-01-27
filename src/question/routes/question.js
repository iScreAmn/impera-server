import express from 'express';
import { submitQuestion } from '../controllers/questionController.js';

const router = express.Router();

router.post('/submit', submitQuestion);

export default router;
