import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Redis } from 'ioredis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATS_FILE = path.join(__dirname, '../../data/stats.json');

let redis: Redis | null = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
  redis.on('error', (err) => console.error('Redis Error:', err));
} else {
  // Ensure data dir exists for local file fallback
  if (!fs.existsSync(path.dirname(STATS_FILE))) {
    fs.mkdirSync(path.dirname(STATS_FILE), { recursive: true });
  }
}

let localTotalTransfers = 1711;
let localInitialized = false;

function initLocalFallback() {
  if (localInitialized) return;
  localInitialized = true;
  try {
    if (fs.existsSync(STATS_FILE)) {
      const data = fs.readFileSync(STATS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (typeof parsed.totalTransfers === 'number') {
        localTotalTransfers = parsed.totalTransfers;
      }
    } else {
      fs.writeFileSync(STATS_FILE, JSON.stringify({ totalTransfers: localTotalTransfers }));
    }
  } catch (err) {
    console.error('Failed to load local stats', err);
  }
}

export async function getTotalTransfers(): Promise<number> {
  if (redis) {
    try {
      const val = await redis.get('totalTransfers');
      if (val) return parseInt(val, 10);
      // Initialize if empty
      await redis.set('totalTransfers', 1711);
      return 1711;
    } catch (err) {
      console.error('Redis get error', err);
      return 1711;
    }
  } else {
    initLocalFallback();
    return localTotalTransfers;
  }
}

export async function incrementTotalTransfers(): Promise<number> {
  if (redis) {
    try {
      const val = await redis.incr('totalTransfers');
      return val;
    } catch (err) {
      console.error('Redis incr error', err);
      return 1711;
    }
  } else {
    initLocalFallback();
    localTotalTransfers++;
    try {
      fs.writeFileSync(STATS_FILE, JSON.stringify({ totalTransfers: localTotalTransfers }));
    } catch (err) {
      console.error('Failed to save local stats', err);
    }
    return localTotalTransfers;
  }
}
