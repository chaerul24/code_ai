import { streamAI } from "./ai.js"

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/)
  return match ? match[0] : null
}

export async function generatePlan(text) {
  let result = ""

  await streamAI(`
Kamu adalah AI planner developer.

WAJIB JSON ONLY

Format:
{
  "type": "plan",
  "steps": [
    {
      "name": "step",
      "command": "cmd",
      "description": "desc"
    }
  ]
}

User:
"${text}"
`, {
    onChunk: (c) => result += c
  })

  const json = extractJSON(result)
  if (!json) return null

  return JSON.parse(json)
}