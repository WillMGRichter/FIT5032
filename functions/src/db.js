const { Pool } = require('pg')

let pool = null

function resolveSsl(connectionString) {
  if (process.env.DATABASE_SSL === 'true') return { rejectUnauthorized: false }
  if (process.env.DATABASE_SSL === 'false') return false
  const isLocal = /(^|@)(localhost|127\.0\.0\.1)/.test(connectionString)
  return isLocal ? false : { rejectUnauthorized: false }
}

function getPool() {
  if (pool) return pool

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured for cloud functions')
  }

  pool = new Pool({
    connectionString,
    ssl: resolveSsl(connectionString),
    max: 5,
    idleTimeoutMillis: 30000,
  })

  pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error.message)
  })

  return pool
}

function getQuery() {
  const active = getPool()
  return (sql, params) => active.query(sql, params)
}

module.exports = { getPool, getQuery }
