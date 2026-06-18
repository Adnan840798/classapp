/**
 * Edge-compatible sliding-window rate limiter.
 *
 * Works without any external service (no Redis / KV required).
 * Runs inside Next.js Edge Middleware — the Map persists across requests
 * within the same edge worker instance, giving effective burst protection.
 *
 * Limitations:
 *  • State resets on worker cold-starts (acceptable for a class-app scale).
 *  • For production at scale, swap the Map for Upstash Redis.
 *
 * Usage:
 *   const result = rateLimit('auth', ip, { limit: 10, windowMs: 60_000 });
 *   if (!result.success) return rateLimitResponse(result);
 */

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // epoch ms
}

interface Entry {
  count: number;
  resetAt: number;
}

// One store per named "bucket" (auth, api, page, …)
const stores = new Map<string, Map<string, Entry>>();

function getStore(bucket: string): Map<string, Entry> {
  if (!stores.has(bucket)) stores.set(bucket, new Map());
  return stores.get(bucket)!;
}

// Purge expired entries every 2 minutes so the Map doesn't grow forever.
let lastPurge = Date.now();
function maybePurge() {
  const now = Date.now();
  if (now - lastPurge < 2 * 60 * 1000) return;
  lastPurge = now;
  for (const store of stores.values()) {
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }
}

/**
 * Check and increment a rate-limit counter.
 *
 * @param bucket   Logical group: 'auth' | 'api' | 'webhook' | 'page'
 * @param ip       Client identifier (IP address string)
 * @param limit    Max requests allowed in the window
 * @param windowMs Rolling window length in milliseconds
 */
export function rateLimit(
  bucket: string,
  ip: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  maybePurge();

  const store = getStore(bucket);
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, limit, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, limit, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, limit, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Build a user-friendly 429 HTML response with a live countdown,
 * proper Retry-After header, and rate-limit info headers.
 */
export function rateLimitResponse(result: RateLimitResult, pathname: string): Response {
  const retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000);

  if (pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({
        error: `Too many requests. Please try again in ${retryAfterSec} seconds.`,
        retryAfter: retryAfterSec,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
        },
      }
    );
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Too Many Requests — ClassApp</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: #0d0d10;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: linear-gradient(135deg, rgba(20,26,26,0.95), rgba(13,18,18,0.95));
      border: 1px solid rgba(16,185,129,0.25);
      border-radius: 1.25rem;
      padding: 2.5rem 2rem;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 0 0 1px rgba(16,185,129,0.1), 0 20px 60px rgba(0,0,0,0.5);
    }
    .icon {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.35rem;
      font-weight: 700;
      color: #a7f3d0;
      margin-bottom: 0.5rem;
    }
    p {
      font-size: 0.88rem;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .countdown-ring {
      position: relative;
      width: 96px;
      height: 96px;
      margin: 0 auto 1.5rem;
    }
    .countdown-ring svg { transform: rotate(-90deg); }
    circle.track { stroke: rgba(16,185,129,0.15); fill: none; stroke-width: 6; }
    circle.progress {
      stroke: hsl(160,84%,51%);
      fill: none;
      stroke-width: 6;
      stroke-linecap: round;
      transition: stroke-dashoffset 1s linear;
    }
    .countdown-num {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
      color: #a7f3d0;
    }
    .pill {
      display: inline-block;
      padding: 0.3rem 0.85rem;
      border-radius: 9999px;
      background: rgba(16,185,129,0.12);
      border: 1px solid rgba(16,185,129,0.25);
      color: #34d399;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 1.25rem;
    }
    .btn {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.65rem 1.5rem;
      border-radius: 0.625rem;
      background: linear-gradient(135deg, hsl(160,84%,45%), hsl(170,80%,38%));
      color: #fff;
      font-size: 0.85rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: none;
      opacity: 0.4;
      pointer-events: none;
      transition: opacity 0.3s;
    }
    .btn.ready { opacity: 1; pointer-events: auto; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🛡️</div>
    <div class="pill">429 — Rate Limited</div>
    <h1>Slow down a little!</h1>
    <p>Too many requests in a short time.<br/>
       Please wait before trying again — this keeps ClassApp fast and safe for everyone.</p>
 
    <div class="countdown-ring">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle class="track" cx="48" cy="48" r="42" />
        <circle class="progress" id="ring" cx="48" cy="48" r="42"
          stroke-dasharray="263.9"
          stroke-dashoffset="0" />
      </svg>
      <div class="countdown-num" id="num">${retryAfterSec}</div>
    </div>
 
    <p style="font-size:0.78rem;color:#64748b;">
      Path: <code style="color:#34d399">${pathname}</code>
    </p>

    <a class="btn" id="retryBtn" href="${pathname}">Try again</a>
  </div>

  <script>
    const total = ${retryAfterSec};
    let remaining = total;
    const circumference = 263.9;
    const ring = document.getElementById('ring');
    const num = document.getElementById('num');
    const btn = document.getElementById('retryBtn');

    const tick = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(tick);
        num.textContent = '0';
        ring.style.strokeDashoffset = circumference;
        btn.classList.add('ready');
        return;
      }
      num.textContent = remaining;
      ring.style.strokeDashoffset = circumference * (1 - remaining / total);
    }, 1000);
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 429,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Retry-After': String(retryAfterSec),
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    },
  });
}
