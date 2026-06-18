import { spawn } from "node:child_process";

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, dryRun?: boolean, verbose?: boolean }} opts
 */
export async function run(command, args, opts = {}) {
  const line = `${command} ${args.map(shellQuote).join(" ")}`;
  if (opts.dryRun) {
    console.log(`[dry-run] ${line}`);
    return { code: 0, stdout: "", stderr: "" };
  }

  if (opts.verbose) {
    console.log(`> ${line}`);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => {
      const s = d.toString();
      stdout += s;
      if (opts.verbose) process.stdout.write(s);
    });
    child.stderr?.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      if (opts.verbose) process.stderr.write(s);
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

/** @param {string} s */
function shellQuote(s) {
  if (/^[A-Za-z0-9_./:-]+$/.test(s)) return s;
  return `"${s.replace(/"/g, '\\"')}"`;
}

/**
 * @param {string} cmd
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, dryRun?: boolean, verbose?: boolean }} opts
 */
export async function runShell(cmd, opts = {}) {
  if (opts.dryRun) {
    console.log(`[dry-run] ${cmd}`);
    return { code: 0, stdout: "", stderr: "" };
  }
  if (opts.verbose) console.log(`> ${cmd}`);

  const shell = process.platform === "win32" ? "cmd.exe" : "sh";
  const shellArgs =
    process.platform === "win32" ? ["/d", "/s", "/c", cmd] : ["-lc", cmd];

  return new Promise((resolve, reject) => {
    const child = spawn(shell, shellArgs, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

/**
 * @param {string} command
 * @param {string[]} args
 */
export async function commandExists(command, args = ["--version"]) {
  try {
    const r = await run(command, args, { verbose: false });
    return r.code === 0;
  } catch {
    return false;
  }
}
