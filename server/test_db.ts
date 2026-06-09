import { createUser, findUserByUsername } from './src/database.js'
import bcrypt from 'bcryptjs'

const hash = bcrypt.hashSync('1234', 10)
console.log('step1')
const user = createUser('test_diag2', hash)
console.log('step2:', JSON.stringify(user))