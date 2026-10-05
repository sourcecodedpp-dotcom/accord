#!/usr/bin/env node
const { runCli } = require("../dist/cli.js");

runCli().catch((err) => {
  console.error("Accord CLI Error:", err.message);
  process.exit(1);
});
