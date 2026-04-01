import chalk from "chalk";
import { now } from "./time.js";

export const log = (type, message) => {
  const colors = {
    CREATE: chalk.cyan,
    INSTALL: chalk.yellow,
    RUN: chalk.blue,
    DONE: chalk.green,
    ERROR: chalk.red,
    INFO: chalk.gray
  };

  const color = colors[type] || chalk.white;

  console.log(`${chalk.gray(now())} ${color(`[${type}]`)} ${message}`);
};
