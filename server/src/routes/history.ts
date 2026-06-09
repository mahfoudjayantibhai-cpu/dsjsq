import { Router, Response } from 'express'
import { getHistory, getHistoryById, deleteHistory, deleteAllHistory } from '../database.js'
import { AuthRequest, authMiddleware } from '../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

// 获取历史记录列表（支持时间范围筛选）
router.get('/', (req: AuthRequest, res: Response) => {
  const start = req.query.start as string | undefined
  const end = req.query.end as string | undefined
  const records = getHistory(req.userId!, start, end)
  res.json(records)
})

// 获取单条历史记录（用于回填跳转）
router.get('/:id', (req: AuthRequest, res: Response) => {
  const record = getHistoryById(parseInt(req.params.id), req.userId!)
  if (!record) {
    return res.status(404).json({ error: '记录不存在' })
  }
  res.json(record)
})

// 删除单条历史记录
router.delete('/:id', (req: AuthRequest, res: Response) => {
  deleteHistory(parseInt(req.params.id), req.userId!)
  res.json({ success: true })
})

// 清空全部历史记录
router.delete('/', (req: AuthRequest, res: Response) => {
  deleteAllHistory(req.userId!)
  res.json({ success: true })
})

export default router