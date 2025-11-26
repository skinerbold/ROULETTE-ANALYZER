import express from 'express';
import {
  getRouletteHistory,
  getRouletteMetadata,
  getAllRouletteMetadata
} from '../controllers/history.js';

const router = express.Router();

// GET /api/history/:rouletteId - Histórico de uma roleta
router.get('/history/:rouletteId', getRouletteHistory);

// GET /api/metadata/:rouletteId - Metadados de uma roleta
router.get('/metadata/:rouletteId', getRouletteMetadata);

// GET /api/metadata - Metadados de todas as roletas
router.get('/metadata', getAllRouletteMetadata);

export default router;
