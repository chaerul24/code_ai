import fs from "fs";
import path from "path";
import { exec } from "child_process";

// ===============================
// STATE
// ===============================
let cwd = process.cwd();
let memory = [];

// ===============================
// RUN COMMAND
// ===============================
function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd }, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(stdout || stderr);
    });
  });
}

// ===============================
// FILE SYSTEM
// ===============================
function readFile(file) {
  const full = path.join(cwd, file);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf-8");
}

function writeFile(file, content) {
  const full = path.join(cwd, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

// ===============================
// APPLY DIFF
// ===============================
function applyDiff(original, diff) {
  const lines = original.split("\n");
  const diffLines = diff.split("\n");

  let result = [...lines];

  diffLines.forEach((line) => {
    if (line.startsWith("- ")) {
      const target = line.slice(2);
      result = result.filter(l => l.trim() !== target.trim());
    }
    if (line.startsWith("+ ")) {
      result.push(line.slice(2));
    }
  });

  return result.join("\n");
}

// ===============================
// PARSE EXEC
// ===============================
function parseExec(text) {
  if (!text.includes("[EXEC]")) return null;

  const block = text.split("[EXEC]")[1];

  const type = block.match(/type:\s*(\w+)/)?.[1];
  const pathMatch = block.match(/path:\s*([^\n]+)/)?.[1];
  const command = block.match(/command:\s*([^\n]+)/)?.[1];

  const contentMatch = block.match(/content:\s*\|\s*([\s\S]*)/);
  const diffMatch = block.match(/diff:\s*\|\s*([\s\S]*)/);

  return {
    type,
    path: pathMatch,
    command,
    content: contentMatch?.[1]?.trim(),
    diff: diffMatch?.[1]?.trim()
  };
}

// ===============================
// EXECUTE ACTION
// ===============================
async function execute(execData, log) {
  switch (execData.type) {

    case "read":
      log("READ", execData.path);
      return readFile(execData.path) || "";

    case "write_file":
      writeFile(execData.path, execData.content || "");
      log("WRITE", execData.path);
      return "ok";

    case "edit_file":
      const original = readFile(execData.path) || "";
      const updated = applyDiff(original, execData.diff || "");
      writeFile(execData.path, updated);
      log("EDIT", execData.path);
      return "ok";

    case "run":
      log("RUN", execData.command);
      return await run(execData.command);

    case "search":
      return fs.readdirSync(cwd).join("\n");

    default:
      return "";
  }
}

// ===============================
// AI EXEC (NO OUTPUT)
// ===============================
async function askAIExec(prompt, askAI) {
  // pakai askAI tapi disable output
  return await askAI(prompt, { silent: true });
}

// ===============================
// MAIN AGENT LOOP (SILENT)
// ===============================
export async function runCodingAgent({
  askAI,
  log,
  task = "",
  maxSteps = 15
}) {
  let step = 0;
  let context = task;

  while (step < maxSteps) {
    step++;

    log("AGENT", `Step ${step}`);

    const prompt = `
Kamu adalah coding agent profesional.

TASK:
${context}

CURRENT DIR:
${cwd}

MEMORY:
${memory.join("\n")}

RULE:
- Gunakan [EXEC]
- Jangan jelaskan
- Fokus eksekusi
- Jika selesai → stop
`;

    // 🔥 PAKAI MODE SILENT
    const response = await askAIExec(prompt, askAI);

    const execData = parseExec(response);

    // ===============================
    // DONE
    // ===============================
    if (!execData) {
      log("DONE", "Selesai");
      break;
    }

    try {
      const result = await execute(execData, log);

      memory.push(`
[RESULT]
${result}
`);

      context += `\n${result}`;

    } catch (err) {
      log("ERROR", err);

      memory.push(`
[ERROR]
${err}
`);

      continue;
    }
  }

  if (step >= maxSteps) {
    log("STOP", "Max steps");
  }
}