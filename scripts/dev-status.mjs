import { getApiPort } from "./read-env.mjs";

const apiPort = getApiPort();

async function check(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return { up: res.ok, status: res.status };
  } catch (error) {
    return { up: false, error: error.message };
  }
}

const web = await check("http://127.0.0.1:3000");
const api = await check(`http://127.0.0.1:${apiPort}/api/v1/health`);

console.log("\n  UMQ dev status\n");
console.log(`  Web (3000): ${web.up ? "up" : "down"}`);
console.log(`  API (${apiPort}):  ${api.up ? "up" : "down"}`);

if (web.up && api.up) {
  console.log("\n  Both running — open http://localhost:3000/ar\n");
} else if (!web.up && !api.up) {
  console.log("\n  Start both: npm run dev\n");
} else {
  console.log("\n  Partial stack — run: pnpm dev:free-ports && npm run dev\n");
}

process.exit(web.up && api.up ? 0 : 1);
