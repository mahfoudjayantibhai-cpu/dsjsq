import express from 'express'
import bcrypt from 'bcryptjs'

const app = express()
app.use(express.json())

app.post('/api/auth/register', (req, res) => {
  console.log('body:', req.body)
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'missing fields' })
  const hash = bcrypt.hashSync(password, 10)
  res.json({ ok: true, hash: hash.substring(0, 15) })
})

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('ERR:', err)
  res.status(500).json({ error: err.message })
})

app.listen(3002, () => console.log('test server on 3002'))