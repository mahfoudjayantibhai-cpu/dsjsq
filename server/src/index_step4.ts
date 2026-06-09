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
app.use('/api/settings', settingsRoutes)
app.use('/api/calculate', calculatorRoutes)
app.use('/api/snapshots', snapshotRoutes)
app.use('/api/tasks', taskRoutes)

app.set('views', path.join(__dirname, '..', 'views'))
app.set('view engine', 'ejs')

const clientDist = path.join(__dirname, '..', '..', 'dist')
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

app.listen(3006, () => console.log('step4 on 3006'))