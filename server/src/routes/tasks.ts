import { Router, Response } from 'express'
import { getTasks, createTask, updateTask, deleteTask } from '../database.js'
import { AuthRequest, authMiddleware } from '../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

router.get('/', (req: AuthRequest, res: Response) => {
  res.json(getTasks(req.userId!))
})

router.post('/', (req: AuthRequest, res: Response) => {
  createTask(req.userId!, req.body)
  res.json({ success: true })
})

router.put('/:id', (req: AuthRequest, res: Response) => {
  updateTask(parseInt(req.params.id), req.userId!, req.body)
  res.json({ success: true })
})

router.delete('/:id', (req: AuthRequest, res: Response) => {
  deleteTask(parseInt(req.params.id), req.userId!)
  res.json({ success: true })
})

export default router
