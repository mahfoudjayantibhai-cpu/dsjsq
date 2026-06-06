import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dsjsq-kaifeng-ai-2026-secret-key'

export interface AuthRequest extends Request {
  userId?: number
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' })
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' })
  }
  try {
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
    req.userId = decoded.userId
    next()
  } catch {
    return res.status(401).json({ error: '登录已过期' })
  }
}

export function adminAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.admin_token
  if (!token) return res.redirect('/admin/login')
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
    req.userId = decoded.userId
    next()
  } catch {
    return res.redirect('/admin/login')
  }
}
