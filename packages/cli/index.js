#!/usr/bin/env node

const { program } = require('commander');
const http = require('http');
const https = require('https');
const path = require('path');
const { SignalingClient } = require('./src/signaling');
const { PeerManager } = require('./src/peer');
const { TransferManager } = require('./src/transfer');
const { TerminalSession } = require('./src/session');
const { c, parseRoomCode, generateId } = require('./src/utils');

const DEFAULT_SERVER = process.env.MARTINARI_SERVER || 'http://localhost:3001';

async function apiRequest(urlStr, options = {}, bodyData = null) {
  const parsed = new URL(urlStr);
  const client = parsed.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(parsed, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400) {
            reject(new Error(parsedData.message || parsedData.error || `HTTP ${res.statusCode}`));
          } else {
            resolve(parsedData);
          }
        } catch (e) {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          } else {
            resolve(data);
          }
        }
      });
    });

    req.on('error', reject);

    if (bodyData) {
      req.setHeader('Content-Type', 'application/json');
      req.write(JSON.stringify(bodyData));
    }

    req.end();
  });
}

async function joinRoomAction(rawRoomCode, opts) {
  const serverUrl = (opts.server || DEFAULT_SERVER).replace(/\/+$/, '');
  const roomCode = parseRoomCode(rawRoomCode);

  if (!roomCode || roomCode.length !== 6) {
    console.error(c.red(`Error: Invalid room code "${rawRoomCode}". Martinari room codes are 6 alphanumeric characters.`));
    process.exit(1);
  }

  console.log(c.dim(`Connecting to Martinari at ${serverUrl}...`));

  // Check room status first
  try {
    const infoUrl = `${serverUrl}/api/rooms/${roomCode}${opts.key ? `?key=${encodeURIComponent(opts.key)}` : ''}`;
    const roomInfo = await apiRequest(infoUrl);
    if (!roomInfo.exists) {
      console.error(c.red(`Error: Room ${roomCode} does not exist or has expired.`));
      process.exit(1);
    }
  } catch (err) {
    console.error(c.red(`Could not verify room ${roomCode}: ${err.message}`));
    console.log(c.yellow('Attempting direct connection anyway...'));
  }

  const localPeerId = generateId(10);
  const signaling = new SignalingClient(serverUrl);

  try {
    await signaling.connect();
  } catch (err) {
    console.error(c.red(`Failed to connect to signaling server: ${err.message}`));
    process.exit(1);
  }

  const peerManager = new PeerManager(localPeerId, signaling);
  const transferManager = new TransferManager(peerManager, {
    downloadDir: opts.out ? path.resolve(opts.out) : path.join(process.cwd(), 'downloads'),
    autoAccept: opts.autoAccept !== false,
  });

  const session = new TerminalSession({
    roomCode,
    serverUrl,
    signaling,
    peerManager,
    transferManager,
    options: {
      autoSendFile: opts.send ? path.resolve(opts.send) : null,
    },
  });

  // Join the room on signaling server
  signaling.join(roomCode, localPeerId, {
    password: opts.password,
    creatorToken: opts.creatorToken,
    privateKey: opts.key,
  });

  session.start();
}

async function createRoomAction(opts) {
  const serverUrl = (opts.server || DEFAULT_SERVER).replace(/\/+$/, '');
  console.log(c.dim(`Requesting new room from ${serverUrl}...`));

  try {
    const payload = {
      password: opts.password || undefined,
      type: opts.broadcast ? 'broadcast' : 'normal',
      isPrivate: !!opts.private,
    };

    const res = await apiRequest(`${serverUrl}/api/rooms`, { method: 'POST' }, payload);
    const { code, creatorToken, privateKey } = res;

    console.log(c.green(`Room created successfully! Code: ${c.bold(code)}`));

    // Join the newly created room automatically
    await joinRoomAction(code, {
      ...opts,
      creatorToken,
      key: privateKey,
    });
  } catch (err) {
    console.error(c.red(`Failed to create room: ${err.message}`));
    process.exit(1);
  }
}

async function sendQuickAction(rawRoomCode, filePath, opts) {
  await joinRoomAction(rawRoomCode, {
    ...opts,
    send: filePath,
  });
}

// -- Commander Setup ---------------------------------------------------------

program
  .name('martina')
  .description('Direct P2P Encrypted File Transfer CLI')
  .version('1.0.0');

// Command: join / mjoin
program
  .command('join <roomCode>')
  .alias('mjoin')
  .description('Join an existing Martinari room and transfer files')
  .option('-s, --server <url>', 'Martinari server URL', DEFAULT_SERVER)
  .option('-p, --password <password>', 'Room password if required')
  .option('-k, --key <privateKey>', 'Private key for secret rooms')
  .option('-o, --out <directory>', 'Destination directory for downloaded files', './downloads')
  .option('--no-auto-accept', 'Ask confirmation before saving incoming files')
  .option('--send <filePath>', 'Automatically send this file once a peer connects')
  .action(joinRoomAction);

// Command: create / mcreate
program
  .command('create')
  .alias('mcreate')
  .description('Create a new Martinari room and wait for peers')
  .option('-s, --server <url>', 'Martinari server URL', DEFAULT_SERVER)
  .option('-p, --password <password>', 'Protect room with a password')
  .option('--private', 'Generate an unguessable private key link')
  .option('--broadcast', 'Create a broadcast-only room (creator can only send)')
  .option('-o, --out <directory>', 'Destination directory for downloaded files', './downloads')
  .option('--no-auto-accept', 'Ask confirmation before saving incoming files')
  .option('--send <filePath>', 'Automatically send this file once a peer connects')
  .action(createRoomAction);

// Command: send
program
  .command('send <roomCode> <filePath>')
  .description('Quickly join a room, send a file to connected peers')
  .option('-s, --server <url>', 'Martinari server URL', DEFAULT_SERVER)
  .option('-p, --password <password>', 'Room password if required')
  .option('-o, --out <directory>', 'Destination directory for downloaded files', './downloads')
  .action(sendQuickAction);

// Intelligent routing: if invoked as "mjoin <code>" or "mcreate" directly:
const binaryName = path.basename(process.argv[1] || '', path.extname(process.argv[1] || ''));
const firstArg = process.argv[2];

const KNOWN_COMMANDS = new Set(['join', 'mjoin', 'create', 'mcreate', 'send', 'help', '--help', '-h', '--version', '-V']);

if (binaryName === 'mjoin' && firstArg && !firstArg.startsWith('-')) {
  // Translate "mjoin ABC123" to "join ABC123"
  process.argv.splice(2, 0, 'join');
} else if (binaryName === 'mcreate') {
  process.argv.splice(2, 0, 'create');
} else if (firstArg && !KNOWN_COMMANDS.has(firstArg) && /^[a-zA-Z0-9]{6}$/.test(firstArg)) {
  // User typed "martina ABC123" -> treat as "martina join ABC123"
  process.argv.splice(2, 0, 'join');
}

program.parse(process.argv);
