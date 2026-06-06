import { Router, Response } from 'express'
import { saveCalculation } from '../database.js'
import { AuthRequest, authMiddleware } from '../middleware/auth.js'
import { calcBaoBenROI, calcListingROI, calcPricing, calcProfit, calcAdROI, calcPriceStrategy } from '../services/calculations.js'

const router = Router()
router.use(authMiddleware)

router.post('/roi', (req: AuthRequest, res: Response) => {
  const result = calcBaoBenROI(req.body)
  saveCalculation(req.userId!, 'roi', req.body, result)
  res.json(result)
})

router.post('/pricing', (req: AuthRequest, res: Response) => {
  const result = calcPricing(req.body)
  saveCalculation(req.userId!, 'pricing', req.body, result)
  res.json(result)
})

router.post('/profit', (req: AuthRequest, res: Response) => {
  const result = calcProfit(req.body)
  saveCalculation(req.userId!, 'profit', req.body, result)
  res.json(result)
})

router.post('/ad-roi', (req: AuthRequest, res: Response) => {
  const result = calcAdROI(req.body)
  saveCalculation(req.userId!, 'ad-roi', req.body, result)
  res.json(result)
})

router.post('/strategy', (req: AuthRequest, res: Response) => {
  const result = calcPriceStrategy(req.body)
  saveCalculation(req.userId!, 'strategy', req.body, result)
  res.json(result)
})

router.post('/listing-roi', (req: AuthRequest, res: Response) => {
  const result = calcListingROI(req.body)
  saveCalculation(req.userId!, 'listing-roi', req.body, result)
  res.json(result)
})

export default router
