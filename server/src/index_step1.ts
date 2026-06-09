import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(express.json())

app.get('/api/test', (_req, res) => {
  res.json({ ok: true })
})

// SPA fallback
const clientDist = path.join(__dirname, '..', '..', 'dist')
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

app.listen(3003, () => console.log('step1 on 3003'))