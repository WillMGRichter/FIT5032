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
  const table = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'action_plans'`,
  )
  if (table.rows.length === 0) {
    await pool.query(
      `CREATE TABLE action_plans (
         id           BIGSERIAL PRIMARY KEY,
         project_id   BIGINT       NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
         user_id      BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
         title        VARCHAR(160) NOT NULL,
         description  TEXT,
         due_date     DATE,
         is_suggested BOOLEAN      NOT NULL DEFAULT FALSE,
         completed    BOOLEAN      NOT NULL DEFAULT FALSE,
         completed_at TIMESTAMPTZ,
         created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
         updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
         CHECK (completed_at IS NULL OR completed = TRUE)
       )`,
    )
    await pool.query('CREATE INDEX idx_action_plans_user ON action_plans (user_id)')
    await pool.query(
      'CREATE INDEX idx_action_plans_project_user ON action_plans (project_id, user_id)',
    )
    console.log('Created action_plans table + indexes.')
  } else {
    console.log('action_plans table already exists.')
  }

  const column = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_name = 'project_participations' AND column_name = 'suggestions_generated'`,
  )
  if (column.rows.length === 0) {
    await pool.query(
      `ALTER TABLE project_participations
       ADD COLUMN suggestions_generated BOOLEAN NOT NULL DEFAULT FALSE`,
    )
    console.log('Added suggestions_generated column to project_participations.')
  } else {
    console.log('suggestions_generated column already exists.')
  }
}

run()
  .catch((err) => {
    console.error('Migration failed:', err.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())