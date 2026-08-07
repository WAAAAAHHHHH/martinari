import fs from 'fs';
import https from 'https';

const users = ['aboredloner', 'mertisyoo', 'whyruevencheckinmyname'];

async function downloadPfps() {
  for (const user of users) {
    try {
      console.log(`Fetching ${user}...`);
      const res = await fetch(`https://www.instagram.com/${user}/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });
      const html = await res.text();
      
      const match = html.match(/<meta property="og:image" content="([^"]+)"/);
      if (match && match[1]) {
        let imgUrl = match[1].replace(/&amp;/g, '&');
        console.log(`Found image for ${user}`);
        
        // Download image
        await new Promise((resolve, reject) => {
          https.get(imgUrl, (res) => {
            if (res.statusCode !== 200) {
              reject(new Error(`Failed to download, status: ${res.statusCode}`));
              return;
            }
            const file = fs.createWriteStream(`packages/client/public/${user}.jpg`);
            res.pipe(file);
            file.on('finish', () => {
              file.close();
              resolve();
            });
          }).on('error', reject);
        });
      } else {
        console.log(`Could not find og:image for ${user}`);
      }
    } catch (e) {
      console.error(`Error for ${user}:`, e.message);
    }
  }
}

downloadPfps();
