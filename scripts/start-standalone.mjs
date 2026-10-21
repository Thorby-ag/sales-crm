// Runs the production build the same way the Docker image does (see Dockerfile).
import { spawn } from "node:child_process";
import { cpSync, existsSync } from "node:fs";

const dir = ".next/standalone";
if (!existsSync(`${dir}/server.js`)) {
  console.error("No standalone build found. Run `npm run build` first.");
  process.exit(1);
}

// The standalone server doesn't include public files or static assets; the image copies them too.
cpSync("public", `${dir}/public`, { recursive: true });
cpSync(".next/static", `${dir}/.next/static`, { recursive: true });

const server = spawn(process.execPath, ["server.js"], {
  cwd: dir,
  stdio: "inherit",
  env: { ...process.env, PORT: process.env.PORT ?? "3000", HOSTNAME: "0.0.0.0" },
});
server.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
