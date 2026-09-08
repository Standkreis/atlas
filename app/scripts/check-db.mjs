// Creates a NEW disposable database only. Never resets or alters the developer/production database.
import pg from 'pg'
import { readdir, readFile } from 'node:fs/promises'
const url = new URL(process.env.DATABASE_URL ?? '')
if (!['localhost', '127.0.0.1', 'postgres'].includes(url.hostname) || !/^\/dex_check_[a-z0-9_]+$/.test(url.pathname)) throw new Error('DATABASE_URL must name a local dex_check_* disposable database')
const name = url.pathname.slice(1)
const adminUrl = new URL(url); adminUrl.pathname = '/postgres'
const admin = new pg.Client({ connectionString: adminUrl.toString() })
await admin.connect()
try { await admin.query(`CREATE DATABASE "${name}"`) } finally { await admin.end() }
const client = new pg.Client({ connectionString: url.toString() })
await client.connect()
try {
  for (const dir of (await readdir('prisma/migrations', { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()) {
    const sql = await readFile(`prisma/migrations/${dir}/migration.sql`, 'utf8')
    await client.query('BEGIN')
    try { await client.query(sql); await client.query('COMMIT') } catch (error) { await client.query('ROLLBACK'); throw error }
  }
  console.log(`Created disposable check database ${name} from checked-in SQL`)
} finally { await client.end() }
