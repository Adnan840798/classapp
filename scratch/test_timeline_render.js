// scratch/test_timeline_render.js
// Hits the local dev server at localhost:3001/cr/timeline to inspect the SSR output/errors.

async function run() {
  const url = 'http://localhost:3001/cr/timeline';
  console.log(`Fetching SSR page: ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        // Pass the auth cookies and tenant cookies
        'Cookie': 'tenant_supabase_url=https%3A%2F%2Focdacnolqqiumgzlmprz.supabase.co; tenant_supabase_anon_key=sb_publishable_nEn8YyDUlVyFfYKpDuC7ew_tQuAyOOk; sb-classapp-auth-token=eyJhbGciOiJFUzI1NiIsImtpZCI6IjNkOWZkOWM5LWViMWEtNDc0YS1iNDgyLThhYjhkODZkYTAwYSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL29jZGFjbm9scXFpdW1nemxtcHJ6LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkNzk2N2NiNi00YzkxLTRiMTMtOTRjNi0yZjA4NTFlNTFiMTQiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzgzNjI5MzAyLCJpYXQiOjE3ODM2MjU3MDIsImVtYWlsIjoiY3JAY2xhc3NhcHAudGVzdCIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiYmF0Y2giOiIyMDIyIiwiZGVwYXJ0bWVudCI6IkNvbXB1dGVyIFNjaWVuY2UiLCJmdWxsX25hbWUiOiJKb2huIERvZSAoQ1IpIiwicm9sZSI6ImNyIiwidW5pdmVyc2l0eV9pZCI6IkNSLTAwMSJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzgzNjI1NzAyfV0sInNlc3Npb25faWQiOiJhZTUwODVkZS05MjE3LTRlMjYtOTRlNi1hM2NlNTY2MDQ0MTMiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.dFFOFdRUbOHucGcKE2H9A0Vf-_ZVsu1DJaUr_gkbBVeMM1z4WxUmsI_82SDJPG3ggs3u9QEO1eEcYjYk0ig8DQ'
      }
    });
    console.log(`Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    // Search for error patterns or display first 1000 characters
    if (res.status === 500) {
      console.log('--- 500 ERROR PAGE CONTENT ---');
      console.log(text.slice(0, 2000));
    } else {
      console.log('Rendered successfully!');
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
