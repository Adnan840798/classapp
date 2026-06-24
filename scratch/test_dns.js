const dns = require('dns');

const hostnames = [
  'ocdacnolqqiumgzlmprz.supabase.co',
  'luvpdldpdjzjimdzzikbg.supabase.co'
];

hostnames.forEach(hostname => {
  dns.lookup(hostname, (err, address, family) => {
    if (err) {
      console.error(`❌ DNS lookup failed for ${hostname}:`, err.message);
    } else {
      console.log(`✅ DNS lookup succeeded for ${hostname}: ${address} (IPv${family})`);
    }
  });
});
