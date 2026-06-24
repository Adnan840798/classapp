const { Resolver } = require('dns');
const resolver = new Resolver();

// Set the DNS server to Cloudflare (1.1.1.1)
resolver.setServers(['1.1.1.1']);

console.log('Querying Cloudflare DNS (1.1.1.1) directly for luvpdldpdjzjimdzzikbg.supabase.co...');
resolver.resolve4('luvpdldpdjzjimdzzikbg.supabase.co', (err, addresses) => {
  if (err) {
    console.error('❌ Cloudflare DNS query failed:', err.message);
  } else {
    console.log('✅ Cloudflare DNS query succeeded:', addresses);
  }
});
