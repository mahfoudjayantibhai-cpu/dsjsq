import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import cookieParser from 'cookie-parser'

import authRoutes from './routes/auth.js'
import settingsRoutes from './routes/settings.js'
import calculatorRoutes from './routes/calculator.js'
import snapshotRoutes from './routes/snapshots.js'
import taskRoutes from './routes/tasks.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(cookieParser())

const clientDist = path.join(__dirname, '..', '..', 'dist')
app.use(express.static(clientDist))

app.get('/api/test', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/calculate', calculatorRoutes)
app.use('/api/snapshots', snapshotRoutes)
app.use('/api/tasks', taskRoutes)

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

app.listen(3007, () => console.log('step5 on 3007'))