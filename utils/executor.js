import { exec } from "child_process"
import util from "util"

const execAsync = util.promisify(exec)

export async function executePlan(plan) {
  console.log("\n⚙️ Menjalankan plan...\n")

  for (const [i, step] of plan.steps.entries()) {
    console.log(`🔹 ${i + 1}. ${step.name}`)
    console.log(`→ ${step.command}`)

    // 🔒 keamanan
    const allowed = ["php artisan", "composer", "npm"]

    if (!allowed.some(a => step.command.includes(a))) {
      console.log("⛔ Command tidak diizinkan\n")
      continue
    }

    try {
      await execAsync(step.command, { cwd: process.cwd() })
      console.log("✅ Success\n")
    } catch (err) {
      console.log("❌ Error:", err.message)
      return false
    }
  }

  return true
}