import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'

import { getStats, getAllUsers, getAllSnapshots } from './database.js'
import authRoutes from './routes/auth.js'
import settingsRoutes from './routes/settings.js'
import calculatorRoutes from './routes/calculator.js'
import snapshotRoutes from './routes/snapshots.js'
import taskRoutes from './routes/tasks.js'
import historyRoutes from './routes/history.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'dsjsq-kaifeng-ai-2026-secret-key'
const ADMIN_USER = process.env.ADMIN_USER || 'admin'
const ADMIN_PASS = process.env.ADMIN_PASS || 'kaifeng2026'

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Static files - serve built frontend
const clientDist = path.join(__dirname, '..', '..', 'dist')
app.use(express.static(clientDist))

app.get('/api/test', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/calculate', calculatorRoutes)
app.use('/api/snapshots', snapshotRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/history', historyRoutes)

// ===== Admin panel =====
app.set('views', path.join(__dirname, '..', 'views'))
app.set('view engine', 'ejs')

app.get('/admin/login', (_req, res) => {
  res.render('admin/login', { error: null })
})

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ role: 'admin', username }, JWT_SECRET, { expiresIn: '24h' })
    res.cookie('admin_token', token, { httpOnly: true, maxAge: 86400000 })
    return res.redirect('/admin')
  }
  res.render('admin/login', { error: '用户名或密码错误' })
})

app.get('/admin/logout', (_req, res) => {
  res.clearCookie('admin_token')
  res.redirect('/admin/login')
})

function adminGuard(req: any, res: any, next: any) {
  const token = req.cookies?.admin_token
  if (!token) return res.redirect('/admin/login')
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string; username: string }
    if (decoded.role !== 'admin') return res.redirect('/admin/login')
    req.adminUser = decoded.username
    next()
  } catch {
    res.clearCookie('admin_token')
    res.redirect('/admin/login')
  }
}

app.get('/admin', adminGuard, (req, res) => {
  res.render('admin/index', {
    username: (req as any).adminUser,
    stats: getStats(),
    users: getAllUsers(),
    snapshots: getAllSnapshots()
  })
})

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`\n  凯峰Ai · 拼多多运营计算器`)
  console.log(`  Server: http://localhost:${PORT}`)
  console.log(`  Admin:  http://localhost:${PORT}/admin\n`)
})

export default app
