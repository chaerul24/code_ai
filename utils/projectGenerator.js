import fs from "fs";
import path from "path";
import { runCommand } from "./commandRunner.js";
import { log } from "./logger.js";

export const generateProject = async (type, name) => {

  const projectName = name || `${type}-app`;
  const projectPath = path.join(process.cwd(), projectName);

  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath);
  }

  log("CREATE", `${type} project: ${projectName}`);

  switch (type) {

    case "express":
      await runCommand(`cd ${projectPath} && npm init -y`);
      log("INSTALL", "install express...");
      await runCommand(`cd ${projectPath} && npm install express`);

      fs.writeFileSync(
        path.join(projectPath, "index.js"),
        `const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Hello World'));
app.listen(3000);`
      );
      break;

    case "next":
      log("INSTALL", "create next app...");
      await runCommand(`npx create-next-app@latest ${projectName}`);
      break;

    case "laravel":
      log("INSTALL", "create laravel...");
      await runCommand(`composer create-project laravel/laravel ${projectName}`);
      break;

    case "react":
      log("INSTALL", "create react...");
      await runCommand(`npx create-react-app ${projectName}`);
      break;

    case "vue":
      log("INSTALL", "create vue...");
      await runCommand(`npm create vue@latest ${projectName}`);
      break;

    default:
      log("ERROR", "Framework tidak dikenali");
      return;
  }

  log("DONE", `${projectName} ready`);
};
