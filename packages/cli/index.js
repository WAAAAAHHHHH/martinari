#!/usr/bin/env node

const { program } = require('commander');
const WebSocket = require('ws');
const http = require('http');

const SERVER_URL = process.env.MARTINARI_SERVER || 'http://localhost:3001';
const WS_URL = SERVER_URL.replace(/^http/, 'ws');

program
  .name('martinari')
  .description('Martinari Headless CLI for P2P file transfers')
  .version('1.0.0');

program
  .command('receive')
  .description('Create a room and listen for incoming files')
  .action(async () => {
    console.log('Generating secure room...');
    
    const url = new URL('/api/rooms', SERVER_URL);
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const { code, creatorToken } = JSON.parse(data);
          console.log('\nRoom Created!');
          console.log(`Share this link to receive files: ${SERVER_URL}/room/${code}\n`);
          
          console.log('Connecting to signaling server...');
          const ws = new WebSocket(`${WS_URL}/ws`);
          
          ws.on('open', () => {
            console.log('Connected! Waiting for peers to join...');
            ws.send(JSON.stringify({
              type: 'join',
              roomCode: code,
              peerId: 'cli-receiver',
              creatorToken
            }));
          });

          ws.on('message', (data) => {
            try {
              const msg = JSON.parse(data.toString());
              if (msg.type === 'user-joined') {
                console.log(`[+] Peer joined: ${msg.peerId}`);
                console.log('    (Full WebRTC handshakes are not yet implemented in this CLI skeleton)');
              } else if (msg.type === 'user-left') {
                console.log(`[-] Peer left: ${msg.peerId}`);
              }
            } catch (err) {
              // ignore
            }
          });

          ws.on('close', () => {
            console.log('Disconnected from server.');
            process.exit(0);
          });
        } catch (err) {
          console.error(`Failed to parse response: ${err.message}`);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`Failed to reach Martinari server: ${e.message}`);
    });

    req.end();
  });

program.parse();
