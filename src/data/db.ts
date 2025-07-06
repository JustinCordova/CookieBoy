import { Database } from "bun:sqlite";

const db = new Database("cookieboy.sqlite");

// Create tables if they don't exist
// Cookies: userId, amount
// Inventories: userId, itemId, quantity
// DailyClaims: userId, lastClaim (timestamp)
db.run(`CREATE TABLE IF NOT EXISTS cookies (
  userId TEXT PRIMARY KEY,
  amount INTEGER NOT NULL
)`);

db.run(`CREATE TABLE IF NOT EXISTS inventories (
  userId TEXT NOT NULL,
  itemId TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  PRIMARY KEY (userId, itemId)
)`);

db.run(`CREATE TABLE IF NOT EXISTS daily_claims (
  userId TEXT PRIMARY KEY,
  lastClaim INTEGER NOT NULL
)`);

// --- Cookies ---
export function getCookies(userId: string): number {
  const row = db
    .query("SELECT amount FROM cookies WHERE userId = ?")
    .get(userId);
  return row ? row.amount : 0;
}

export function setCookies(userId: string, amount: number) {
  db.run(
    "INSERT OR REPLACE INTO cookies (userId, amount) VALUES (?, ?)",
    userId,
    amount
  );
}

// --- Inventories ---
export function getInventory(userId: string): Record<string, number> {
  const rows = db
    .query("SELECT itemId, quantity FROM inventories WHERE userId = ?")
    .all(userId);
  const inv: Record<string, number> = {};
  for (const row of rows) {
    inv[row.itemId] = row.quantity;
  }
  return inv;
}

export function setInventoryItem(
  userId: string,
  itemId: string,
  quantity: number
) {
  db.run(
    "INSERT OR REPLACE INTO inventories (userId, itemId, quantity) VALUES (?, ?, ?)",
    userId,
    itemId,
    quantity
  );
}

// --- Daily Claims ---
export function getLastClaim(userId: string): number {
  const row = db
    .query("SELECT lastClaim FROM daily_claims WHERE userId = ?")
    .get(userId);
  return row ? row.lastClaim : 0;
}

export function setLastClaim(userId: string, timestamp: number) {
  db.run(
    "INSERT OR REPLACE INTO daily_claims (userId, lastClaim) VALUES (?, ?)",
    userId,
    timestamp
  );
}

// --- Leaderboard ---
export function getTopCookies(
  limit: number = 5
): { userId: string; amount: number }[] {
  return db
    .query("SELECT userId, amount FROM cookies ORDER BY amount DESC LIMIT ?")
    .all(limit);
}
