import readline from "readline";
import chalk from "chalk";
import figlet from "figlet";

import { now } from "./utils/time.js";
import { log } from "./utils/logger.js";
import { runAgent } from "./utils/agent.js"; // 🔥 pakai agent, bukan askAI

// ===============================
// CONFIG
// ===============================
const CONFIG = {
  agent: {
    maxSteps: 10
  }
};

// ===============================
// CLI SETUP
// ===============================
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ===============================
// CHAT LOOP
// ===============================
function startCLI() {
  console.log(chalk.cyan(`${now()} YOU > `));

  let buffer = [];
  let isProcessing = false;

  rl.removeAllListeners("line");

  rl.on("line", async (input) => {
    try {
      if (isProcessing) return;

      // ===============================
      // ENTER KOSONG → SUBMIT
      // ===============================
      if (input.trim() === "") {
        if (!buffer.length) {
          console.log(chalk.cyan(`${now()} YOU > `));
          return;
        }

        const fullInput = buffer.join("\n").trim();
        buffer = [];

        isProcessing = true;

        // ===============================
        // COMMAND
        // ===============================
        if (fullInput === "/help") {
          console.log(chalk.yellow(`
Commands:
  /help           → bantuan
  /exit           → keluar
`));
          isProcessing = false;
          console.log(chalk.cyan(`${now()} YOU > `));
          return;
        }

        if (fullInput === "/exit") {
          console.log(chalk.red("Bye 👋"));
          process.exit(0);
        }

        // ===============================
        // 🔥 RUN AGENT (INI INTINYA)
        // ===============================
        const response = await runAgent(fullInput);

        if (response) {
          console.log(chalk.green(`\n🤖 AI > \n${response}\n`));
        }

        isProcessing = false;
        console.log(chalk.cyan(`${now()} YOU > `));
        return;
      }

      // ===============================
      // MULTILINE INPUT
      // ===============================
      buffer.push(input);

    } catch (err) {
      isProcessing = false;
      log("ERROR", err.message);
      console.log(chalk.cyan(`${now()} YOU > `));
    }
  });
}

// ===============================
// START APP
// ===============================
const banner = figlet.textSync("Code AI", {
  font: "ANSI Shadow"
});

console.log(chalk.cyan(banner));
console.log("Created By Chaerul\n");

startCLI();