const dns = require('dns');

const baseRef = 'luvpdldpdjzjimdzzikbg';
const domain = 'supabase.co';

const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';

async function scan() {
  console.log(`Scanning variations of ${baseRef}.${domain}...`);
  const promises = [];

  for (let i = 0; i < baseRef.length; i++) {
    for (let char of alphabet) {
      if (char === baseRef[i]) continue;
      
      const newRef = baseRef.slice(0, i) + char + baseRef.slice(i + 1);
      const hostname = `${newRef}.${domain}`;
      
      promises.push(new Promise((resolve) => {
        dns.lookup(hostname, { family: 4 }, (err, address) => {
          if (!err && address) {
            console.log(`Found active domain: ${hostname} -> ${address}`);
            resolve(hostname);
          } else {
            resolve(null);
          }
        });
      }));
    }
  }

  const results = await Promise.all(promises);
  const found = results.filter(Boolean);
  console.log(`Scan finished. Found ${found.length} active matching domains.`);
}

scan();
