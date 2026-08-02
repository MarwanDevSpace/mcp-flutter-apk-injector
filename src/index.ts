#!/usr/bin/env node
import { runServer } from "./server.js";

runServer().catch((err) => {
  process.stderr.write(`Fatal error: ${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
