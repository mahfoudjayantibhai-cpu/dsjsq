import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

app.get('/api/test', (_req, res) => {
  res.json({ ok: true })
})

const clientDist = path.join(__dirname, '..', '..', 'dist')
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

app.listen(3004, () => console.log('step2 on 3004'))