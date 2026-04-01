import { streamAI, askAI } from "./ai.js"
import { KEYWORDS } from "./keyword_agent.js"
import { generateFullPOS } from "./generate.js"

import { exec } from "child_process"
import util from "util"
import os from "os"

import { generatePlan } from "./planner.js"
import { executePlan } from "./executor.js"

const execAsync = util.promisify(exec)

// ===============================
let lastContext = null
let currentProject = null // 🔥 memory project

// ===============================
// 🧼 SANITIZE NAME
// ===============================
function sanitizeName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
}

// ===============================
// 🧠 EXTRACT JSON
// ===============================
function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/)
  return match ? match[0] : null
}

// ===============================
// 🧠 GET PROJECT NAME
// ===============================
async function getProjectName(text) {
  let match = text.match(/["']([^"']+)["']/)
  if (match) return sanitizeName(match[1])

  match = text.toLowerCase().match(/laravel\s+([a-z0-9-_]+)/)
  if (match) return sanitizeName(match[1])

  match = text.toLowerCase().match(/project\s+([a-z0-9-_]+)/)
  if (match) return sanitizeName(match[1])

  return "pos-app"
}

// ===============================
// 🧠 DETECT INTENT
// ===============================
async function detectIntent(text) {
  let resultText = ""

  try {
    await streamAI(`
WAJIB JSON ONLY

{"intent":"create_project","tech":"laravel","context":"pos","command":"","confidence":0.9}

Text:
"${text}"
`, {
      onChunk: (c) => resultText += c
    })

    const json = extractJSON(resultText)
    if (json) return JSON.parse(json)

    return null
  } catch {
    return null
  }
}

// ===============================
// ⚡ FALLBACK
// ===============================
function detectByKeyword(text) {
  const t = text.toLowerCase()

  if (
    KEYWORDS.laravel.some(k => t.includes(k)) &&
    KEYWORDS.action_create.some(k => t.includes(k))
  ) {
    return {
      intent: "create_project",
      tech: "laravel",
      context: "pos",
      confidence: 0.6
    }
  }

  return null
}

// ===============================
// ⚙️ RUN COMMAND
// ===============================
async function runCommand(cmd) {
  const blocked = ["rm -rf", "shutdown", "reboot"]

  if (blocked.some(b => cmd.includes(b))) {
    console.log("⛔ Command diblokir")
    return false
  }

  try {
    console.log(`\n⚙️ EXEC: ${cmd}\n`)

    const { stdout, stderr } = await execAsync(cmd, {
      cwd: process.cwd(),
      shell: true,
      maxBuffer: 1024 * 1024 * 10
    })

    if (stdout) console.log(stdout)
    if (stderr) console.error(stderr)

    return true
  } catch (err) {
    console.error("❌ Error:", err.message)
    return false
  }
}

// ===============================
// 🎯 MAIN AGENT
// ===============================
export async function runAgent(text) {
  console.log("🧠 Menganalisa intent...")

  const t = text.toLowerCase()

  // ===============================
  // 🔥 PRIORITAS: GENERATE (FIX BUG)
  // ===============================
  if (t.includes("generate") || t.includes("full")) {

    if (!currentProject) {
      return "❌ Belum ada project. Ketik dulu: buat project laravel"
    }

    console.log(`🚀 Generating project: ${currentProject}\n`)
    await generateFullPOS(currentProject)

    return `🔥 Project ${currentProject} berhasil dibuat!`
  }

  // ===============================
  // 🧠 DETECT INTENT
  // ===============================
  let intent = await detectIntent(text)

  if (!intent || !intent.intent) {
    console.log("⚠️ fallback keyword...\n")
    intent = detectByKeyword(text)
  }

  if (!intent) return "❌ Tidak memahami intent"

  console.log("📊 Intent:", intent, "\n")

  // ===============================
  // 🚀 CREATE PROJECT
  // ===============================
  if (intent.intent === "create_project") {
    const name = await getProjectName(text)

    currentProject = name // 🔥 SIMPAN PROJECT

    return `
🔥 Siap buat project: ${name}

📦 Info:
- OS: ${os.platform()}
- Path: ${process.cwd()}

👉 Perintah:
- "generate semua"
- "run composer create-project laravel/laravel ${name}"

💡 Aku bisa auto generate full project 😎
`
  }

  // ===============================
  // 🧠 AI PLANNER
  // ===============================
  const isPlannerIntent =
    t.includes("crud") ||
    t.includes("buat fitur") ||
    t.includes("buat module") ||
    t.includes("buat produk")

  if (isPlannerIntent) {
    console.log("🧠 Membuat plan...\n")

    const plan = await generatePlan(text)

    if (!plan) return "❌ Gagal membuat plan"

    console.log("📋 PLAN:", plan)

    const ok = await executePlan(plan)

    if (ok) return "🔥 Semua step berhasil!"
    else return "❌ Ada step gagal"
  }

  // ===============================
  // ⚙️ COMMAND
  // ===============================
  if (intent.intent === "run_command" && intent.command) {
    await runCommand(intent.command)
    return "⚙️ Command dijalankan"
  }

  // ===============================
  // ❓ DEFAULT
  // ===============================
  return await askAI(text)
}