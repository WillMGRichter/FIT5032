require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      },
)

async function run() {
  const column = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_name = 'users' AND column_name = 'interests'`,
  )
  if (column.rows.length > 0) {
    console.log('Column interests already exists on users.')
    return
  }
  await pool.query(
    `ALTER TABLE users ADD COLUMN interests JSONB NOT NULL DEFAULT '[]'`,
  )
  console.log('Added interests column to users.')
}

run()
  .catch((err) => {
    console.error('Migration failed:', err.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())