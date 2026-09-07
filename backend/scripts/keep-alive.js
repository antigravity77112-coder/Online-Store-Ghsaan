#!/usr/bin/env node
/**
 * Ping API health endpoint to reset Supabase Free inactivity timer.
 * Usage: HEALTH_URL=https://your-api.example.com/api/health node scripts/keep-alive.js
 */
const url = process.env.HEALTH_URL || process.env.API_HEALTH_URL;
if (!url) {
  console.error('Set HEALTH_URL to your deployed GET /api/health endpoint');
  process.exit(1);
}

fetch(url)
  .then(async (res) => {
    const body = await res.text();
    console.log(res.status, body.slice(0, 200));
    if (!res.ok) process.exit(1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
