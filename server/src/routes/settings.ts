import { Router, Response } from 'express'
import { getUserSettings, updateUserSettings } from '../database.js'
import { AuthRequest, authMiddleware } from '../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

router.get('/', (req: AuthRequest, res: Response) => {
  const settings = getUserSettings(req.userId!)
  if (!settings) return res.json({})
  const { user_id, ...rest } = settings
  res.json(rest)
})

router.put('/', (req: AuthRequest, res: Response) => {
  updateUserSettings(req.userId!, req.body)
  res.json({ success: true })
})

export default router
