#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const distCli = path.join(__dirname, "../dist/cli.js");

if (fs.existsSync(distCli)) {
  const { runCli } = require(distCli);
  runCli().catch((err) => {
    console.error("Accord CLI Error:", err.message);
    process.exit(1);
  });
} else {
  // If not bundled yet, run via tsx directly
  const { spawn } = require("child_process");
  const tsCli = path.join(__dirname, "../src/cli.ts");
  const tsxBin = path.resolve(__dirname, "../../../node_modules/.bin/tsx");
  const bin = fs.existsSync(tsxBin) ? tsxBin : "tsx";

  const child = spawn(bin, [tsCli, ...process.argv.slice(2)], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}
