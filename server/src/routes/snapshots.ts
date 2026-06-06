import { Router, Response } from 'express'
import { getSnapshots, saveSnapshot, deleteSnapshot } from '../database.js'
import { AuthRequest, authMiddleware } from '../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

router.get('/', (req: AuthRequest, res: Response) => {
  res.json(getSnapshots(req.userId!))
})

router.post('/', (req: AuthRequest, res: Response) => {
  saveSnapshot(req.userId!, req.body)
  res.json({ success: true })
})

router.delete('/:id', (req: AuthRequest, res: Response) => {
  deleteSnapshot(parseInt(req.params.id), req.userId!)
  res.json({ success: true })
})

export default router
