import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATS_FILE = path.join(__dirname, '../../data/stats.json');

// Ensure data dir exists
if (!fs.existsSync(path.dirname(STATS_FILE))) {
  fs.mkdirSync(path.dirname(STATS_FILE), { recursive: true });
}

let totalTransfers = 1437;

// Load initial
try {
  if (fs.existsSync(STATS_FILE)) {
    const data = fs.readFileSync(STATS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (typeof parsed.totalTransfers === 'number') {
      totalTransfers = parsed.totalTransfers;
    }
  } else {
    // Initial save
    fs.writeFileSync(STATS_FILE, JSON.stringify({ totalTransfers }));
  }
} catch (err) {
  console.error('Failed to load stats', err);
}

export function getTotalTransfers(): number {
  return totalTransfers;
}

export function incrementTotalTransfers(): number {
  totalTransfers++;
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify({ totalTransfers }));
  } catch (err) {
    console.error('Failed to save stats', err);
  }
  return totalTransfers;
}
