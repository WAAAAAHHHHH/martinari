#!/usr/bin/env node

const { program } = require('commander');
const WebSocket = require('ws');
const http = require('http');

const SERVER_URL = process.env.MARTINARI_SERVER || 'http://localhost:3001';
const WS_URL = SERVER_URL.replace('http', 'ws');

program
  .name('martinari')
  .description('Martinari Headless CLI for P2P file transfers')
  .version('1.0.0');

program
  .command('receive')
  .description('Create a room and listen for incoming files')
  .action(async () => {
    console.log('Generating secure room...');
    
    const req = http.request(\${SERVER_URL}/api/rooms\, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const { code } = JSON.parse(data);
        console.log(\nRoom Created!);
        console.log(Share this link to receive files: \/room/\\n);
        
        console.log('Connecting to signaling server...');
        const ws = new WebSocket(\\/api/signaling\);
        
        ws.on('open', () => {
          console.log('Connected! Waiting for peers to join...');
          ws.send(JSON.stringify({
            type: 'join-room',
            payload: { roomCode: code }
          }));
        });

        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'peer-joined') {
            console.log([+] Peer joined: \);
            console.log(    (Full WebRTC handshakes are not yet implemented in this CLI skeleton));
          } else if (msg.type === 'peer-left') {
            console.log([-] Peer left: \);
          }
        });

        ws.on('close', () => {
          console.log('Disconnected from server.');
          process.exit(0);
        });
      });
    });

    req.on('error', (e) => {
      console.error(Failed to reach Martinari server: \);
    });

    req.end();
  });

program.parse();
