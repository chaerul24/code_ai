import { exec } from "child_process";
import { log } from "./logger.js";
import { createSpinner } from "./spinner.js";

const allowedCommands = [
  "npm install",
  "npm run",
  "npx",
  "composer create-project",
  "php artisan",
  "ls",
  "pwd"
];

export const runCommand = (cmd) => {
  return new Promise((resolve) => {

    const isAllowed = allowedCommands.some(c => cmd.startsWith(c));

    if (!isAllowed) {
      log("ERROR", "Command tidak diizinkan!");
      return resolve("❌ Command blocked");
    }

    log("RUN", cmd);

    // 🔥 start spinner
    const stopSpinner = createSpinner("Running...");

    exec(cmd, (error, stdout, stderr) => {

      // 🔥 stop spinner
      stopSpinner();

      if (error) {
        log("ERROR", error.message);
        return resolve(error.message);
      }

      if (stderr) {
        log("ERROR", stderr);
        return resolve(stderr);
      }

      log("DONE", "Command selesai");

      resolve(stdout);
    });
  });
};