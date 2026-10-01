const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// -- ANSI Colors -------------------------------------------------------------
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  bgGreen: '\x1b[42m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

const c = {
  bold: (t) => `${colors.bold}${t}${colors.reset}`,
  dim: (t) => `${colors.dim}${t}${colors.reset}`,
  green: (t) => `${colors.green}${t}${colors.reset}`,
  yellow: (t) => `${colors.yellow}${t}${colors.reset}`,
  red: (t) => `${colors.red}${t}${colors.reset}`,
  cyan: (t) => `${colors.cyan}${t}${colors.reset}`,
  magenta: (t) => `${colors.magenta}${t}${colors.reset}`,
  blue: (t) => `${colors.blue}${t}${colors.reset}`,
  gray: (t) => `${colors.gray}${t}${colors.reset}`,
  brand: (t) => `\x1b[38;2;99;102;241m${colors.bold}${t}${colors.reset}`, // Indigo
  accent: (t) => `\x1b[38;2;168;85;247m${colors.bold}${t}${colors.reset}`, // Purple
};

// -- Formatting --------------------------------------------------------------
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2);
  return `${val} ${units[i]}`;
}

function formatSpeed(bytesPerSec) {
  return `${formatBytes(bytesPerSec)}/s`;
}

function formatDuration(seconds) {
  if (seconds === undefined || seconds < 0 || !isFinite(seconds)) return '--';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return `${m}m ${s}s`;
}

function renderProgressBar(percent, width = 25) {
  const p = Math.max(0, Math.min(100, percent));
  const filled = Math.round((p / 100) * width);
  const empty = width - filled;
  const bar = '='.repeat(filled) + '-'.repeat(empty);
  return `[${c.cyan(bar)}] ${c.bold(p.toFixed(1))}%`;
}

function generateId(length = 12) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

function getSafeFilePath(destinationDir, fileName) {
  if (!fs.existsSync(destinationDir)) {
    fs.mkdirSync(destinationDir, { recursive: true });
  }

  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let targetPath = path.join(destinationDir, fileName);
  let counter = 1;

  while (fs.existsSync(targetPath)) {
    targetPath = path.join(destinationDir, `${base} (${counter})${ext}`);
    counter++;
  }

  return targetPath;
}

function parseRoomCode(input) {
  if (!input) return '';
  const trimmed = input.trim();
  // Check if user passed full URL e.g. https://martinari.com/room/ABC123
  const match = trimmed.match(/\/room\/([a-zA-Z0-9]{6})/i);
  if (match) {
    return match[1].toUpperCase();
  }
  // If user passed direct 6-char code
  return trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

module.exports = {
  c,
  colors,
  formatBytes,
  formatSpeed,
  formatDuration,
  renderProgressBar,
  generateId,
  getSafeFilePath,
  parseRoomCode,
};
