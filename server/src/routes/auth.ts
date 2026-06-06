import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import { createUser, findUserByUsername, findUserById } from '../database.js'
import { generateToken, AuthRequest, authMiddleware } from '../middleware/auth.js'

const router = Router()

router.post('/register', (req: AuthRequest, res: Response) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' })
  if (password.length < 4) return res.status(400).json({ error: '密码至少4位' })

  const existing = findUserByUsername(username)
  if (existing) return res.status(409).json({ error: '用户名已存在' })

  const hash = bcrypt.hashSync(password, 10)
  const user = createUser(username, hash)
  if (!user) return res.status(500).json({ error: '创建失败' })

  const token = generateToken(user.id)
  res.json({ token, userId: user.id, username })
})

router.post('/login', (req: AuthRequest, res: Response) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' })

  const user = findUserByUsername(username)
  if (!user) return res.status(401).json({ error: '用户名或密码错误' })

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' })
  }

  const token = generateToken(user.id)
  res.json({ token, userId: user.id, username })
})

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = findUserById(req.userId!)
  if (!user) return res.status(404).json({ error: '用户不存在' })
  const { password_hash, ...safe } = user
  res.json(safe)
})

export default router
