import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'

import { getStats, getAllUsers, getAllSnapshots } from './database.js'
import authRoutes from './routes/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const JWT_SECRET = 'dsjsq-kaifeng-ai-2026-secret-key'

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.get('/api/test', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)

// ejs
app.set('views', path.join(__dirname, '..', 'views'))
app.set('view engine', 'ejs')

app.get('/admin', (_req, res) => {
  res.render('admin/index', {
    username: 'admin',
    stats: getStats(),
    users: getAllUsers(),
    snapshots: getAllSnapshots()
  })
})

const clientDist = path.join(__dirname, '..', '..', 'dist')
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

app.listen(3005, () => console.log('step3 on 3005'))