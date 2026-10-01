import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.resolve(__dirname, "../data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, "arclock.sqlite");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS commitments (
    id TEXT PRIMARY KEY,
    onchain_id TEXT,
    payer TEXT NOT NULL,
    recipient TEXT NOT NULL,
    verifier TEXT NOT NULL,
    amount TEXT NOT NULL,
    description TEXT NOT NULL,
    deadline INTEGER NOT NULL,
    conditions TEXT NOT NULL,       -- JSON array of strings
    verification_method TEXT NOT NULL, -- 'deterministic' | 'ai' | 'hybrid'
    status TEXT NOT NULL DEFAULT 'CREATED',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,
    commitment_id TEXT NOT NULL REFERENCES commitments(id),
    type TEXT NOT NULL,             -- 'url' | 'github' | 'tx_hash' | 'file' | 'text'
    value TEXT NOT NULL,
    content_hash TEXT,
    submitted_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS verifications (
    id TEXT PRIMARY KEY,
    commitment_id TEXT NOT NULL REFERENCES commitments(id),
    result TEXT NOT NULL,           -- 'PASS' | 'FAIL'
    checks TEXT NOT NULL,           -- JSON array of {name, passed, detail}
    verified_at TEXT NOT NULL
  );
`);
