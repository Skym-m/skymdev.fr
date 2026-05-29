import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const saturnDir = path.resolve(rootDir, "..", "Saturn");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function prefixOutput(stream, label, target) {
  stream?.on("data", (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) target.write(`[${label}] ${line}\n`);
    }
  });
}

if (!existsSync(path.join(saturnDir, "package.json"))) {
  throw new Error(`Repo Saturn introuvable: ${saturnDir}`);
}

const children = [];

function start(label, cwd, command, args, env = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  children.push(child);
  prefixOutput(child.stdout, label, process.stdout);
  prefixOutput(child.stderr, label, process.stderr);

  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      process.stderr.write(
        `[dev] ${label} s'est arrêté (${signal ?? `code ${code ?? 0}`}).\n`,
      );
      stopChildren();
      process.exit(code ?? 1);
    }
  });

  return child;
}

let shuttingDown = false;

function stopChildren() {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed && child.exitCode === null) {
      child.kill("SIGTERM");
    }
  }
}

process.on("SIGINT", () => {
  stopChildren();
  process.exit(130);
});

process.on("SIGTERM", () => {
  stopChildren();
  process.exit(143);
});

process.stdout.write("[dev] skymdev.fr : http://localhost:3000\n");
process.stdout.write("[dev] Saturn web : http://localhost:3001\n");
process.stdout.write("[dev] Saturn API : http://localhost:3002\n");

start("saturn", saturnDir, pnpm, ["dev"], {
  SATURN_WEB_PORT: "3001",
  SATURN_API_PORT: "3002",
});

start("skymdev", rootDir, pnpm, ["exec", "next", "dev", "--port", "3000"]);
