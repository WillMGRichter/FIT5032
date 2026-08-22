require('dotenv').config()
const app = require('./app')
const pool = require('./config/db')

const port = Number(process.env.PORT) || 3000

async function start() {
  try {
    await pool.query('SELECT 1')
    console.log('Connected to PostgreSQL.')
  } catch (error) {
    console.error('Unable to reach PostgreSQL:', error.message)
    process.exit(1)
  }

  app.listen(port, () => {
    console.log(`GreenLink API listening on http://localhost:${port}`)
  })
}

start()
