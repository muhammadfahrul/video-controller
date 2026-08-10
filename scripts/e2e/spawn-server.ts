/**
 * Helper: spawn server process di port tertentu dengan isolated working directory.
 *
 * Usage:
 *   const proc = await spawnServer({ port: 53331, name: 'room-001' });
 *   await waitForServerReady(53331);
 *   // ... test ...
 *   await proc.stop();
 */
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface SpawnServerOptions {
  port: number;
  /** Unique name untuk isolated working directory (e.g. 'room-001'). */
  name: string;
  /** Billing enabled (default true). */
  billingEnabled?: boolean;
  /** YouTube API key (default empty). */
  youtubeApiKey?: string;
  /** Root project directory (auto-detected). */
  projectRoot?: string;
}

export interface ServerHandle {
  proc: ChildProcess;
  port: number;
  name: string;
  dataDir: string;
  stop: () => Promise<void>;
}

function detectProjectRoot(): string {
  // scripts/e2e/dist/ (compiled) or scripts/e2e/ (ts source) -> project root
  // Go up until we find package.json with name 'video-controller'
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name === 'video-controller') return dir;
      } catch {}
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback to 3 levels up
  return path.resolve(__dirname, '..', '..', '..');
}

export async function spawnServer(opts: SpawnServerOptions): Promise<ServerHandle> {
  const projectRoot = opts.projectRoot ?? detectProjectRoot();
  const serverDist = path.join(projectRoot, 'server', 'dist', 'index.js');

  if (!fs.existsSync(serverDist)) {
    throw new Error(
      `Server build not found at ${serverDist}. Run 'npm run build:server' first.`
    );
  }

  // Isolated working dir per server -> separate SQLite DB.
  const dataDir = path.join(projectRoot, '.e2e-data', `server-${opts.name}`);
  fs.mkdirSync(dataDir, { recursive: true });

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(opts.port),
    BILLING_ENABLED: opts.billingEnabled === false ? 'false' : 'true',
    YOUTUBE_API_KEY: opts.youtubeApiKey ?? '',
    NODE_ENV: 'test',
  };

  const proc = spawn('node', [serverDist], {
    cwd: dataDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Capture stdout/stderr untuk debugging
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];
  proc.stdout?.on('data', (chunk) => {
    const line = chunk.toString();
    stdoutLines.push(line);
    if (process.env.E2E_VERBOSE) {
      console.log(`[server:${opts.name}]`, line.trim());
    }
  });
  proc.stderr?.on('data', (chunk) => {
    const line = chunk.toString();
    stderrLines.push(line);
    if (process.env.E2E_VERBOSE) {
      console.error(`[server:${opts.name}]`, line.trim());
    }
  });

  return {
    proc,
    port: opts.port,
    name: opts.name,
    dataDir,
    async stop() {
      return new Promise<void>((resolve) => {
        if (proc.killed) {
          resolve();
          return;
        }
        proc.once('exit', () => resolve());
        proc.kill('SIGTERM');
        // Force kill after 3s
        setTimeout(() => {
          if (!proc.killed) proc.kill('SIGKILL');
        }, 3000);
      });
    },
  };
}

/**
 * Wait until server is ready (responds to HTTP request).
 * Returns when /api/health/live returns 200, or throws after timeout.
 */
export async function waitForServerReady(port: number, timeoutMs = 10_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      // Try both possible health endpoints
      const endpoints = [`/api/health/live`, `/api/health`, `/health/live`, `/health`];
      for (const path of endpoints) {
        try {
          const res = await fetch(`http://127.0.0.1:${port}${path}`);
          if (res.ok) return;
        } catch {
          // Try next endpoint
        }
      }
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server on port ${port} did not become ready within ${timeoutMs}ms`);
}
