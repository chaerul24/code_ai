import { highlight } from "cli-highlight";
import chalk from "chalk";

export function highlightCode(code, lang) {
  return highlight(code, {
    language: lang || "plaintext",
    ignoreIllegals: true,
    theme: {
      keyword: chalk.yellow.bold,
      string: chalk.green,
      number: chalk.cyan,
      literal: chalk.magenta,
      comment: chalk.gray,
      built_in: chalk.blue,
    }
  });
}