/**
 * Frees dev ports (orphaned Node after Ctrl+C on Windows).
 * Usage:
 *   node scripts/free-dev-ports.mjs api   — API port only (terminal 1)
 *   node scripts/free-dev-ports.mjs web   — port 3000 only (terminal 2)
 *   node scripts/free-dev-ports.mjs       — both (before npm run dev)
 *   node scripts/free-dev-ports.mjs 4001  — explicit port(s)
 */
import { execSync } from "node:child_process";
import { getApiPort } from "./read-env.mjs";

const args = process.argv.slice(2);
const numericPorts = args
  .map((p) => Number(p))
  .filter((p) => Number.isInteger(p) && p > 0);

let PORTS;
if (numericPorts.length > 0) {
  PORTS = numericPorts;
} else if (args.includes("api")) {
  PORTS = [getApiPort()];
} else if (args.includes("web")) {
  PORTS = [3000];
} else {
  PORTS = [getApiPort(), 3000];
}

function freePortWindows(port) {
  try {
    const out = execSync(`netstat -ano -p tcp | findstr :${port}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts.at(-1);
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`Freed port ${port} (PID ${pid})`);
      } catch {
        // process already exited
      }
    }
  } catch {
    // port not in use
  }
}

function freePortUnix(port) {
  try {
    const out = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" });
    for (const pid of out.trim().split(/\s+/).filter(Boolean)) {
      try {
        process.kill(Number(pid), "SIGTERM");
        console.log(`Freed port ${port} (PID ${pid})`);
      } catch {
        // ignore
      }
    }
  } catch {
    // port not in use
  }
}

for (const port of PORTS) {
  if (process.platform === "win32") freePortWindows(port);
  else freePortUnix(port);
}

/** Windows may keep DLL handles briefly after taskkill (Prisma EPERM). */
if (process.platform === "win32" && PORTS.length > 0) {
  execSync("powershell -NoProfile -Command \"Start-Sleep -Milliseconds 800\"", {
    stdio: "ignore",
  });
}
