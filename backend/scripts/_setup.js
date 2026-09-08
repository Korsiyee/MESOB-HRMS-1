/**
 * Mesob HRMS — Full Setup Script
 * 1. Initializes MySQL DB (schema + seed) via bulk execution
 * 2. Creates MinIO bucket 'mesob-hrms' with structured folder layout
 *
 * Runs schema.sql as a single bulk multi-statement query to preserve
 * FK dependency order, then seed.sql the same way.
 */

const mysql  = require('mysql2/promise');
const Minio  = require('minio');
const fs     = require('fs').promises;
const path   = require('path');
require('dotenv').config();

const DB_HOST     = process.env.DB_HOST;
const DB_USER     = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME     = process.env.DB_NAME;

const MINIO_ENDPOINT   = process.env.MINIO_ENDPOINT;
const MINIO_PORT       = parseInt(process.env.MINIO_PORT || '9000', 10);
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
const MINIO_BUCKET     = 'mesob-hrms';

const log  = (msg) => process.stdout.write(`[INFO]  ${msg}\n`);
const ok   = (msg) => process.stdout.write(`[OK]    ${msg}\n`);
const warn = (msg) => process.stdout.write(`[WARN]  ${msg}\n`);
const fail = (msg) => process.stdout.write(`[ERROR] ${msg}\n`);
const sep  = ()    => process.stdout.write('='.repeat(70) + '\n');

// ─── MySQL Setup ───────────────────────────────────────────────────────────

async function initMySQL() {
  sep();
  log('MYSQL — Connecting and initializing database');
  sep();

  // Phase 1: connect without DB selected, create DB
  let conn;
  try {
    log(`Connecting to ${DB_HOST} as ${DB_USER}...`);
    conn = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
    });
    ok('Connected to MySQL server');

    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    ok(`Database '${DB_NAME}' created/verified`);
    await conn.end();
  } catch (e) {
    fail(`Cannot connect to MySQL: ${e.message}`);
    return false;
  }

  // Phase 2: reconnect with target DB, multipleStatements ON
  let mc;
  try {
    mc = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      multipleStatements: true,
      charset: 'UTF8MB4',
    });

    // ── Schema ──────────────────────────────────────────────────────────
    const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
    log(`Applying schema: ${schemaPath}`);
    const schemaSql = await fs.readFile(schemaPath, 'utf8');

    // Strip BOM if present, then strip all SQL comment lines (-- ...) which
    // contain box-drawing Unicode characters that confuse the MariaDB parser
    // when sent as a bulk multi-statement string.
    const cleanSchema = schemaSql
      .replace(/^\uFEFF/, '')                      // remove BOM
      .split('\n')
      .filter(line => !line.trimStart().startsWith('--')) // drop comment lines
      .join('\n');

    try {
      await mc.query(cleanSchema);
      ok('Schema applied successfully');
    } catch (e) {
      // errno 1050 = table already exists — not fatal with IF NOT EXISTS
      // errno 1061 = duplicate key name — not fatal
      // errno 1826 = duplicate FK name — not fatal
      if ([1050, 1061, 1826].includes(e.errno)) {
        warn(`Schema already partially applied (${e.message.split('\n')[0]}) — continuing`);
      } else {
        fail(`Schema error (errno ${e.errno}): ${e.message}`);
        return false;
      }
    }

    // ── Seed ────────────────────────────────────────────────────────────
    const seedPath = path.resolve(__dirname, '../../database/seed.sql');
    log(`Applying seed: ${seedPath}`);
    const seedSql = await fs.readFile(seedPath, 'utf8');
    const cleanSeed = seedSql.replace(/^\uFEFF/, '');

    try {
      await mc.query(cleanSeed);
      ok('Seed data applied successfully');
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY' || e.errno === 1062) {
        ok('Seed already present — duplicate entries skipped');
      } else {
        warn(`Seed warning (${e.errno}): ${e.message.split('\n')[0]}`);
      }
    }

    // ── Summary ──────────────────────────────────────────────────────────
    const [tables] = await mc.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [DB_NAME]
    );

    sep();
    ok(`Total tables in '${DB_NAME}': ${tables.length}`);
    log('All tables:');
    tables.forEach(t => log(`  • ${t.TABLE_NAME}`));

    // Key row counts
    const keyTables = [
      'Employees', 'Users', 'Departments', 'Positions',
      'ShiftDefinitions', 'leavePolicies', 'Holidays', 'Occupations',
    ];
    sep();
    log('KEY ROW COUNTS:');
    for (const t of keyTables) {
      try {
        const [[row]] = await mc.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
        log(`  ${t.padEnd(25)} ${String(row.n).padStart(4)} rows`);
      } catch { /* table may not exist */ }
    }

    return true;
  } catch (e) {
    fail(`MySQL init failed: ${e.message}`);
    return false;
  } finally {
    if (mc) await mc.end();
  }
}

// ─── MinIO Setup ───────────────────────────────────────────────────────────

async function initMinio() {
  sep();
  log('MINIO — Creating bucket and folder structure');
  sep();

  const client = new Minio.Client({
    endPoint:  MINIO_ENDPOINT,
    port:      MINIO_PORT,
    useSSL:    false,
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY,
  });

  // Connectivity
  try {
    await client.listBuckets();
    ok(`Connected to MinIO at ${MINIO_ENDPOINT}:${MINIO_PORT}`);
  } catch (e) {
    fail(`MinIO connection failed: ${e.message}`);
    return false;
  }

  // Create / verify bucket
  const exists = await client.bucketExists(MINIO_BUCKET);
  if (exists) {
    ok(`Bucket '${MINIO_BUCKET}' already exists`);
  } else {
    await client.makeBucket(MINIO_BUCKET, 'us-east-1');
    ok(`Bucket '${MINIO_BUCKET}' created`);
  }

  // Folder definitions — each maps to actual upload prefixes used in the app
  const folders = [
    {
      keep: 'employee-photos/.keep',
      desc: 'Employee profile photos  →  prefix: employee-photos/{mesob_id}/{ts}-{uuid}.ext',
    },
    {
      keep: 'employee-documents/.keep',
      desc: 'Employee ID documents    →  prefix: employee-documents/{mesob_id}/{ts}-{uuid}.ext',
    },
    {
      keep: 'face-images/.keep',
      desc: 'Face recognition images  →  prefix: face-images/{employee_uuid}/{ts}-{uuid}.ext  (7 per employee)',
    },
    {
      keep: 'leave-documents/.keep',
      desc: 'Leave request documents  →  prefix: {employee_uuid}/{leaveRequestUuid}/{docUuid}-{name}',
    },
    {
      keep: 'letter-templates/.keep',
      desc: 'HR-uploaded letter PDFs  →  prefix: letter-templates/{templateUuid}/{filename}',
    },
    {
      keep: 'letter-requests/.keep',
      desc: 'Generated letter PDFs    →  prefix: letter-requests/{requestUuid}/generated.pdf',
    },
    {
      keep: 'organization/.keep',
      desc: 'Org assets (logo etc.)   →  prefix: organization/logo/{ts}_{filename}',
    },
  ];

  log('Creating virtual folder structure:');
  for (const f of folders) {
    try {
      await client.putObject(
        MINIO_BUCKET,
        f.keep,
        Buffer.alloc(0),
        0,
        { 'Content-Type': 'application/x-directory' }
      );
      const folder = f.keep.replace('/.keep', '/');
      ok(`  📁 ${folder.padEnd(26)}  ${f.desc}`);
    } catch (e) {
      warn(`  Failed to create ${f.keep}: ${e.message}`);
    }
  }

  // Confirm listing
  sep();
  log(`Bucket '${MINIO_BUCKET}' object listing:`);
  await new Promise((resolve) => {
    const stream = client.listObjects(MINIO_BUCKET, '', true);
    stream.on('data',  obj  => log(`  ${obj.name}`));
    stream.on('error', e    => warn(`List error: ${e.message}`));
    stream.on('end',         resolve);
  });

  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────

(async () => {
  sep();
  log('MESOB HRMS — DATABASE & STORAGE INITIALIZATION');
  log(`Timestamp: ${new Date().toISOString()}`);
  sep();

  const dbOk    = await initMySQL();
  const minioOk = await initMinio();

  sep();
  log('FINAL SUMMARY');
  sep();
  log(`  MySQL  (${DB_NAME})  ${dbOk    ? '✓ OK' : '✗ FAILED'}`);
  log(`  MinIO  (${MINIO_BUCKET})    ${minioOk ? '✓ OK' : '✗ FAILED'}`);
  sep();

  if (dbOk && minioOk) {
    ok('Setup complete. Default admin:  username=admin  password=admin123');
    log('');
    log('⚠️  IMPORTANT: Additional migrations required!');
    log('   Run: npm run db:migrate:all');
    log('   This adds: Users columns, RBAC tables, Levels module');
    log('');
    log('   Or see DATABASE_MIGRATIONS.md for step-by-step guide');
  } else {
    fail('Setup had failures — review output above');
    process.exit(1);
  }
})();
