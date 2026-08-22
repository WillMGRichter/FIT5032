require('dotenv').config()
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { Client } = require('pg')

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  })

  await client.connect()

  const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  const seed = readFileSync(path.join(__dirname, 'seed.sql'), 'utf8')

  console.log('Applying schema...')
  await client.query(schema)
  console.log('Seeding data...')
  await client.query(seed)

  const { rows } = await client.query(
    `SELECT
       (SELECT count(*) FROM categories) AS categories,
       (SELECT count(*) FROM projects)   AS projects,
       (SELECT count(*) FROM plants)     AS plants,
       (SELECT count(*) FROM users)      AS users`
  )
  const counts = rows[0]
  console.log(
    `Done: ${counts.categories} categories, ${counts.projects} projects, ${counts.plants} plants, ${counts.users} users.`
  )

  await client.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
