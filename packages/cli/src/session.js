const readline = require('readline');
const path = require('path');
const fs = require('fs');
const { c, formatBytes, formatSpeed, formatDuration, renderProgressBar } = require('./utils');

class TerminalSession {
  constructor({ roomCode, serverUrl, signaling, peerManager, transferManager, options = {} }) {
    this.roomCode = roomCode;
    this.serverUrl = serverUrl;
    this.signaling = signaling;
    this.peerManager = peerManager;
    this.transferManager = transferManager;
    this.options = options;

    this.rl = null;
    this.activeProgress = new Map(); // fileId -> string line
    this.autoSendFile = options.autoSendFile || null;
    this.hasAutoSent = false;
  }

  start() {
    this.printBanner();
    this.setupReadline();
    this.bindEvents();

    if (this.autoSendFile) {
      console.log(c.cyan(`\nQueued file for automatic sending: ${c.bold(this.autoSendFile)} (will send once a peer connects)`));
    }
  }

  printBanner() {
    console.clear();
    console.log(c.brand(`
  __  __            _   _                 _ 
 |  \\/  |          | | (_)               (_)
 | \\  / | __ _ _ __| |_ _ _ __   __ _ _ __ _ 
 | |\\/| |/ _\` | '__| __| | '_ \\ / _\` | '__| |
 | |  | | (_| | |  | |_| | | | | (_| | |  | |
 |_|  |_|\\__,_|_|   \\__|_|_| |_|\\__,_|_|  |_|
`));
    console.log(c.dim('  Direct P2P Encrypted File Transfer in your Terminal\n'));
    console.log(`  ${c.bold('Room Code:')}       ${c.yellow(c.bold(this.roomCode))}`);
    console.log(`  ${c.bold('Browser Link:')}    ${c.cyan(`${this.serverUrl}/room/${this.roomCode}`)}`);
    console.log(`  ${c.bold('Save Folder:')}     ${c.gray(path.resolve(this.transferManager.downloadDir))}`);
    console.log(`  ${c.bold('Auto-Accept:')}     ${this.transferManager.autoAccept ? c.green('Enabled') : c.yellow('Prompt')}`);
    console.log(c.dim('  ---------------------------------------------------------'));
    console.log(`  Type ${c.cyan('/help')} for available commands or ${c.cyan('/send <file>')} to send.\n`);
  }

  setupReadline() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: c.brand('martina> '),
    });

    this.rl.prompt();

    this.rl.on('line', (line) => {
      this.handleInput(line.trim());
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      this.shutdown();
    });
  }

  bindEvents() {
    // -- Signaling Events --------------------------------------------------
    this.signaling.on('room-state', async (msg) => {
      const peerList = (msg.peers || []).filter((p) => p !== this.signaling.peerId);
      if (peerList.length === 0) {
        this.log(c.dim('Waiting for peers to join...'));
      } else {
        this.log(c.green(`Found ${peerList.length} peer(s) in room. Connecting P2P...`));
        for (const peerId of peerList) {
          try {
            await this.peerManager.initiateConnection(peerId);
          } catch (err) {
            this.log(c.red(`Failed initiating connection to ${peerId}: ${err.message}`));
          }
        }
      }
    });

    this.signaling.on('user-joined', (msg) => {
      this.log(`\n${c.green('[+]')} Peer joined the room: ${c.bold(msg.peerId)} ${c.dim(`(Total peers: ${msg.peerCount})`)}`);
    });

    this.signaling.on('user-left', (msg) => {
      this.log(`\n${c.yellow('[-]')} Peer left the room: ${c.dim(msg.peerId)} ${c.dim(`(Total peers: ${msg.peerCount})`)}`);
      this.peerManager.closePeer(msg.peerId);
    });

    this.signaling.on('offer', async (msg) => {
      try {
        await this.peerManager.handleOffer(msg.from, msg.sdp);
      } catch (err) {
        this.log(c.red(`Failed handling offer from ${msg.from}: ${err.message}`));
      }
    });

    this.signaling.on('answer', async (msg) => {
      try {
        await this.peerManager.handleAnswer(msg.from, msg.sdp);
      } catch (err) {
        this.log(c.red(`Failed handling answer from ${msg.from}: ${err.message}`));
      }
    });

    this.signaling.on('ice-candidate', async (msg) => {
      try {
        await this.peerManager.handleIceCandidate(msg.from, msg.candidate);
      } catch {
        // ignore candidate handling error
      }
    });

    this.signaling.on('error', (err) => {
      this.log(c.red(`Signaling error: ${err.message || JSON.stringify(err)}`));
    });

    // -- Peer Events --------------------------------------------------------
    this.peerManager.on('peer-connected', (peerId) => {
      this.log(`\n${c.green('[OK]')} WebRTC P2P DataChannel connected with: ${c.bold(peerId)}! Ready to transfer.`);
      if (this.autoSendFile && !this.hasAutoSent) {
        this.hasAutoSent = true;
        setTimeout(() => this.triggerSendFile(this.autoSendFile, peerId), 500);
      }
    });

    this.peerManager.on('peer-disconnected', (peerId) => {
      this.log(`\n${c.gray('[X]')} WebRTC P2P DataChannel closed with: ${c.dim(peerId)}`);
    });

    // -- Transfer Events ----------------------------------------------------
    this.transferManager.on('send-started', ({ fileName, fileSize, recipients }) => {
      this.log(`\n${c.cyan('[UP]')} Starting transfer of ${c.bold(fileName)} (${formatBytes(fileSize)}) to ${recipients.length} peer(s)...`);
    });

    this.transferManager.on('send-progress', ({ fileId, fileName, bytesTransferred, fileSize, speed, eta, percent }) => {
      this.renderProgress('UPLOAD', fileId, fileName, bytesTransferred, fileSize, speed, eta, percent);
    });

    this.transferManager.on('send-completed', ({ fileName, fileSize, duration }) => {
      process.stdout.write('\r\x1b[K'); // clear line
      this.log(`${c.green('[OK]')} [UPLOAD COMPLETE] ${c.bold(fileName)} (${formatBytes(fileSize)}) sent in ${formatDuration(duration)}!`);
      this.rl.prompt(true);
    });

    this.transferManager.on('incoming-file', ({ fileId, fileName, fileSize, peerId, accept, decline }) => {
      if (this.transferManager.autoAccept) {
        this.log(`\n${c.magenta('[DOWN]')} Receiving incoming file: ${c.bold(fileName)} (${formatBytes(fileSize)}) from ${peerId}...`);
      } else {
        this.log(`\n${c.yellow('?')} [INCOMING FILE] ${c.bold(fileName)} (${formatBytes(fileSize)}) from ${peerId}`);
        this.rl.question(`  Accept this file? [Y/n] `, (answer) => {
          if (!answer || answer.trim().toLowerCase() === 'y') {
            accept();
          } else {
            decline();
          }
          this.rl.prompt();
        });
      }
    });

    this.transferManager.on('receive-progress', ({ fileId, fileName, bytesReceived, fileSize, speed, eta, percent }) => {
      this.renderProgress('DOWNLOAD', fileId, fileName, bytesReceived, fileSize, speed, eta, percent);
    });

    this.transferManager.on('receive-completed', ({ fileName, fileSize, destPath, duration }) => {
      process.stdout.write('\r\x1b[K'); // clear line
      this.log(`${c.green('[OK]')} [DOWNLOAD COMPLETE] ${c.bold(fileName)} (${formatBytes(fileSize)}) saved to ${c.cyan(destPath)} in ${formatDuration(duration)}!`);
      this.rl.prompt(true);
    });

    this.transferManager.on('send-cancelled', ({ fileName, peerId }) => {
      this.log(`\n${c.yellow('!')} Upload of ${fileName} was cancelled by ${peerId}.`);
    });

    this.transferManager.on('receive-cancelled', ({ fileName, peerId, reason }) => {
      this.log(`\n${c.yellow('!')} Download of ${fileName} cancelled: ${reason || 'peer cancelled'}.`);
    });

    this.transferManager.on('error', (err) => {
      this.log(`\n${c.red('Transfer error:')} ${err.message}`);
    });
  }

  renderProgress(type, fileId, fileName, currentBytes, totalBytes, speed, eta, percent) {
    const prefix = type === 'UPLOAD' ? c.cyan('[UP]') : c.magenta('[DOWN]');
    const bar = renderProgressBar(percent, 20);
    const speedStr = formatSpeed(speed);
    const etaStr = formatDuration(eta);
    const sizeStr = `${formatBytes(currentBytes)} / ${formatBytes(totalBytes)}`;

    const line = `\r${prefix} ${c.bold(fileName)}: ${bar} | ${c.yellow(speedStr)} | ETA ${etaStr} | ${c.dim(sizeStr)}`;
    process.stdout.write('\r\x1b[K' + line);
  }

  handleInput(input) {
    if (!input) return;

    // Handle slash commands
    if (input.startsWith('/')) {
      const [cmd, ...args] = input.split(' ');
      switch (cmd.toLowerCase()) {
        case '/send':
        case '/s':
          this.triggerSendFile(args.join(' '));
          break;

        case '/peers':
        case '/p':
          this.showPeers();
          break;

        case '/info':
        case '/i':
          this.showInfo();
          break;

        case '/help':
        case '/?':
          this.showHelp();
          break;

        case '/clear':
        case '/cls':
          this.printBanner();
          break;

        case '/exit':
        case '/quit':
        case '/q':
          this.shutdown();
          break;

        default:
          this.log(c.yellow(`Unknown command: ${cmd}. Type ${c.cyan('/help')} for a list of commands.`));
      }
      return;
    }

    // Direct path input (e.g. user dragged-and-dropped file or typed path)
    const cleaned = input.replace(/^["']|["']$/g, '');
    if (fs.existsSync(cleaned)) {
      this.triggerSendFile(cleaned);
    } else {
      this.log(c.yellow(`Command or file not recognized: "${input}". Type ${c.cyan('/help')} for help.`));
    }
  }

  triggerSendFile(filePathRaw, targetPeerId = null) {
    if (!filePathRaw) {
      this.log(c.yellow('Please specify a file path. Example: /send document.pdf'));
      return;
    }

    const cleaned = filePathRaw.trim().replace(/^["']|["']$/g, '');
    const resolved = path.resolve(cleaned);

    if (!fs.existsSync(resolved)) {
      this.log(c.red(`File not found: ${resolved}`));
      return;
    }

    const peers = this.peerManager.getConnectedPeers();
    if (peers.length === 0) {
      this.log(c.yellow('No peers currently connected via WebRTC. Share the room link and wait for someone to join!'));
      return;
    }

    try {
      this.transferManager.sendFile(resolved, targetPeerId);
    } catch (err) {
      this.log(c.red(`Failed sending file: ${err.message}`));
    }
  }

  showPeers() {
    const peers = this.peerManager.getConnectedPeers();
    console.log(c.bold('\nConnected Peers:'));
    if (peers.length === 0) {
      console.log(c.gray('  (No peers connected yet via WebRTC)'));
    } else {
      peers.forEach((p, idx) => {
        console.log(`  ${idx + 1}. ${c.green(p)} ${c.dim('(WebRTC DataChannel Open)')}`);
      });
    }
    console.log('');
  }

  showInfo() {
    console.log(c.bold('\nRoom Information:'));
    console.log(`  Room Code:       ${c.yellow(c.bold(this.roomCode))}`);
    console.log(`  Web URL:         ${c.cyan(`${this.serverUrl}/room/${this.roomCode}`)}`);
    console.log(`  Local Peer ID:   ${this.signaling.peerId}`);
    console.log(`  Download Folder: ${c.gray(path.resolve(this.transferManager.downloadDir))}`);
    console.log(`  Auto Accept:     ${this.transferManager.autoAccept ? c.green('Yes') : c.yellow('No')}`);
    console.log(`  Connected Peers: ${this.peerManager.getConnectedPeers().length}\n`);
  }

  showHelp() {
    console.log(c.bold('\nAvailable Commands:'));
    console.log(`  ${c.cyan('/send <filepath>')}   Send a file to all connected peers`);
    console.log(`  ${c.cyan('/peers')}             List all active WebRTC peers in this room`);
    console.log(`  ${c.cyan('/info')}              Display current room details & download folder`);
    console.log(`  ${c.cyan('/clear')}             Clear screen and display header banner`);
    console.log(`  ${c.cyan('/help')}              Show this help message`);
    console.log(`  ${c.cyan('/quit')}              Leave room and exit`);
    console.log(c.dim('\nTip: You can also drag & drop any file directly into this terminal and press Enter to send!\n'));
  }

  log(msg) {
    if (this.rl) {
      process.stdout.write('\r\x1b[K'); // clear current prompt line
      console.log(msg);
      this.rl.prompt(true);
    } else {
      console.log(msg);
    }
  }

  shutdown() {
    console.log(c.gray('\nDisconnecting and leaving room...'));
    this.peerManager.closeAll();
    this.signaling.close();
    if (this.rl) {
      this.rl.close();
    }
    process.exit(0);
  }
}

module.exports = { TerminalSession };
