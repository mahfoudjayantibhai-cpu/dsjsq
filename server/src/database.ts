import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')

interface DB {
  users: any[]
  settings: any[]
  calculations: any[]
  snapshots: any[]
  tasks: any[]
  counters: { users: number; calculations: number; snapshots: number; tasks: number }
}

let db: DB

function loadDb(): DB {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  const file = path.join(DATA_DIR, 'db.json')
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  }
  const fresh: DB = {
    users: [], settings: [], calculations: [], snapshots: [], tasks: [],
    counters: { users: 0, calculations: 0, snapshots: 0, tasks: 0 }
  }
  saveDb(fresh)
  return fresh
}

function saveDb(data: DB) {
  fs.writeFileSync(path.join(DATA_DIR, 'db.json'), JSON.stringify(data, null, 2), 'utf-8')
}

// Initialize
db = loadDb()

// ===== Users =====
export function createUser(username: string, passwordHash: string) {
  const existing = db.users.find(u => u.username === username)
  if (existing) return null
  db.counters.users++
  const user = { id: db.counters.users, username, password_hash: passwordHash, created_at: new Date().toISOString() }
  db.users.push(user)
  db.settings.push({ user_id: user.id, default_platform_fee_rate: 0.006, default_return_rate: 0.05, default_misc_fee_rate: 0.01, default_shipping_fee: 4, default_loss_factor: 0.02 })
  saveDb(db)
  return user
}

export function findUserByUsername(username: string) {
  return db.users.find(u => u.username === username) || null
}

export function findUserById(id: number) {
  return db.users.find(u => u.id === id) || null
}

// ===== Settings =====
export function getUserSettings(userId: number) {
  return db.settings.find(s => s.user_id === userId) || null
}

export function updateUserSettings(userId: number, data: any) {
  let s = db.settings.find(s => s.user_id === userId)
  if (!s) {
    s = { user_id: userId }
    db.settings.push(s)
  }
  Object.assign(s, data, { updated_at: new Date().toISOString() })
  saveDb(db)
}

// ===== Calculations =====
export function saveCalculation(userId: number, name: string, input: any, result: any) {
  db.counters.calculations++
  db.calculations.push({
    id: db.counters.calculations,
    user_id: userId, name,
    input_data: JSON.stringify(input),
    result_data: JSON.stringify(result),
    created_at: new Date().toISOString()
  })
  saveDb(db)
}

// ===== Snapshots =====
export function getSnapshots(userId: number) {
  return db.snapshots.filter(s => s.user_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function saveSnapshot(userId: number, data: any) {
  const userSnaps = db.snapshots.filter(s => s.user_id === userId)
  if (userSnaps.length >= 10) {
    const oldest = userSnaps.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]
    db.snapshots = db.snapshots.filter(s => s.id !== oldest.id)
  }
  db.counters.snapshots++
  db.snapshots.push({
    id: db.counters.snapshots,
    user_id: userId,
    link_name: data.linkName,
    skus_data: JSON.stringify(data.skus),
    return_rate: data.returnRate,
    platform_fee_rate: data.platformFeeRate,
    misc_fee_rate: data.miscFeeRate,
    monthly_fixed_cost: data.monthlyFixedCost,
    total_profit: data.totalProfit,
    net_margin: data.netMargin,
    real_roi: data.realROI,
    actual_roi: data.actualROI,
    created_at: new Date().toISOString()
  })
  saveDb(db)
}

export function deleteSnapshot(snapshotId: number, userId: number) {
  db.snapshots = db.snapshots.filter(s => !(s.id === snapshotId && s.user_id === userId))
  saveDb(db)
}

// ===== Tasks =====
export function getTasks(userId: number) {
  return db.tasks.filter(t => t.user_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function createTask(userId: number, data: any) {
  db.counters.tasks++
  db.tasks.push({
    id: db.counters.tasks,
    user_id: userId,
    title: data.title,
    cron_expr: data.cronExpr || null,
    execute_at: data.executeAt || null,
    interval_value: data.intervalValue || null,
    interval_unit: data.intervalUnit || null,
    prompt: data.prompt,
    enabled: 1,
    created_at: new Date().toISOString()
  })
  saveDb(db)
}

export function updateTask(taskId: number, userId: number, data: any) {
  const task = db.tasks.find(t => t.id === taskId && t.user_id === userId)
  if (task) {
    if (data.title !== undefined) task.title = data.title
    if (data.prompt !== undefined) task.prompt = data.prompt
    if (data.enabled !== undefined) task.enabled = data.enabled ? 1 : 0
    saveDb(db)
  }
}

export function deleteTask(taskId: number, userId: number) {
  db.tasks = db.tasks.filter(t => !(t.id === taskId && t.user_id === userId))
  saveDb(db)
}

// ===== Admin Stats =====
export function getStats() {
  return {
    userCount: db.users.length,
    snapshotCount: db.snapshots.length,
    calcCount: db.calculations.length,
    taskCount: db.tasks.length
  }
}

export function getAllUsers() {
  return db.users.map(u => ({
    id: u.id,
    username: u.username,
    created_at: u.created_at,
    calc_count: db.calculations.filter(c => c.user_id === u.id).length
  })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function getAllSnapshots(limit = 20) {
  return db.snapshots
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
    .map(s => ({
      ...s,
      username: db.users.find(u => u.id === s.user_id)?.username || 'unknown',
      sku_count: JSON.parse(s.skus_data).length
    }))
}
