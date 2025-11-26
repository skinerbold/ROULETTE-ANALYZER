import express from 'express'
import * as historyController from '../controllers/history.controller.js'

const router = express.Router()

/**
 * GET /api/metadata
 * 
 * Retorna os metadados de todas as roletas
 * 
 * Exemplo:
 * GET /api/metadata
 */
router.get('/metadata', historyController.getAllMetadata)

/**
 * GET /api/metadata/:roulette_id
 * 
 * Retorna os metadados de uma roleta
 * 
 * Parâmetros:
 * - roulette_id (path): ID da roleta
 * 
 * Exemplo:
 * GET /api/metadata/lightning-roulette
 */
router.get('/metadata/:roulette_id', historyController.getMetadata)

/**
 * GET /api/history/:roulette_id
 * 
 * Retorna o histórico de números de uma roleta
 * 
 * Parâmetros:
 * - roulette_id (path): ID da roleta
 * - limit (query): Quantidade de números (50, 100, 200, 300, 500) - padrão: 100
 * 
 * Exemplo:
 * GET /api/history/lightning-roulette?limit=200
 */
router.get('/:roulette_id', historyController.getHistory)

export default router
