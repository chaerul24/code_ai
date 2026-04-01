import readline from "readline";
import chalk from "chalk";
import boxen from "boxen";
import { highlight } from "cli-highlight";
import { log } from "./logger.js";
import fs from "fs/promises";
import path from "path";
// ===============================
// CONFIG
// ===============================
const CONFIG = {
    model: "deepseek-coder:6.7b"
};
let history = [];

// ===============================
// LOADING
// ===============================
const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

let spinnerInterval = null;
let spinnerIndex = 0;
let startTime = 0;
let dotCount = 0;

function startLoading() {
    startTime = Date.now();

    spinnerInterval = setInterval(() => {
        const frame = frames[spinnerIndex++ % frames.length];
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        dotCount = (dotCount + 1) % 4;
        const dots = ".".repeat(dotCount);

        const text = `${frame} [${elapsed}s] Thinking${dots} `;

        process.stdout.write(
            "\r" + chalk.cyan(text.padEnd(process.stdout.columns - 1))
        );
    }, 80);
}

function stopLoading() {
    if (spinnerInterval) {
        clearInterval(spinnerInterval);
        spinnerInterval = null;
    }
    process.stdout.write("\r\x1b[K");
}

// ===============================
// 🤖 STREAM CHAT (UI MODE)
// ===============================
function askConfirm(question) {
    return new Promise((resolve) => {
        const rlConfirm = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rlConfirm.question(question + " ", (answer) => {
            rlConfirm.close();
            resolve(answer.toLowerCase() === "y");
        });
    });
}
export async function askAI(message) {
    history.push({ role: "user", content: message });

    console.log("");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    startLoading();

    const res = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
            model: CONFIG.model,
            messages: [history[history.length - 1]],
            stream: true,
            max_tokens: 1000,
        })
    });

    clearTimeout(timeout);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    let fullText = "";

    let mode = "text";
    let temp = "";
    let codeLang = "";
    let liveCode = "";
    let lastHeight = 0;

    let firstChunk = true;

    function clearLines(n) {
        for (let i = 0; i < n; i++) {
            readline.moveCursor(process.stdout, 0, -1);
            readline.clearLine(process.stdout, 0);
        }
    }

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (firstChunk) {
            stopLoading();
            firstChunk = false;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop();

        for (const part of parts) {
            if (!part.trim()) continue;

            try {
                const json = JSON.parse(part);
                const chunk = json.message?.content;
                if (!chunk) continue;

                fullText += chunk;

                for (let char of chunk) {
                    if (mode === "text") {
                        temp += char;

                        if (temp.endsWith("```")) {
                            process.stdout.write(temp.slice(0, -3));
                            temp = "";
                            mode = "lang";
                            continue;
                        }

                        if (temp.length > 2) {
                            process.stdout.write(temp[0]);
                            temp = temp.slice(1);
                        }
                    }

                    else if (mode === "lang") {
                        if (char === "\n") {
                            codeLang = temp.trim() || "plaintext";
                            temp = "";
                            liveCode = "";
                            mode = "code";
                        } else {
                            temp += char;
                        }
                    }

                    else if (mode === "code") {
                        liveCode += char;

                        const preview = liveCode
                            .replace(/```[a-z]*\n/, "")
                            .replace(/```$/, "");

                        // 🔥 langsung print tanpa highlight
                        readline.moveCursor(process.stdout, 0, -lastHeight);
                        readline.clearScreenDown(process.stdout);

                        process.stdout.write(preview + "\n");

                        lastHeight = preview.split("\n").length;

                        if (liveCode.endsWith("```")) {
                            mode = "text";

                            const finalCode = liveCode
                                .replace(/```[a-z]*\n/, "")
                                .replace(/```$/, "");

                            liveCode = "";
                            temp = "";
                            lastHeight = 0;
                        }
                    }
                }
            } catch { }
        }
    }

    if (temp && mode === "text") {
        process.stdout.write(temp);
    }

    console.log("\n");

    history.push({ role: "assistant", content: fullText });

    return fullText;
}

// ===============================
// ⚡ STREAM RAW (AGENT MODE)
// ===============================
export async function streamAI(prompt, { onChunk, onJSON } = {}) {
    const res = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: CONFIG.model,
            stream: true,
            messages: [
                {
                    role: "system",
                    content: "ONLY return valid JSON. No explanation. No repetition."
                },
                { role: "user", content: prompt }
            ]
        })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let fullText = "";
    let buffer = "";

    let jsonHandled = false; // 🔥 guard anti loop

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary;
        while ((boundary = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 1);

            if (!line.trim()) continue;

            try {
                const json = JSON.parse(line);
                const chunk = json.message?.content;
                if (!chunk) continue;

                fullText += chunk;

                // ===============================
                // 🔥 REALTIME OUTPUT
                // ===============================
                process.stdout.write(chunk);

                if (onChunk) onChunk(chunk);

                // ===============================
                // 🧠 JSON DETECTION (FIXED)
                // ===============================
                if (!jsonHandled) {
                    const possible = extractJSON(fullText);

                    if (isValidJSON(possible)) {
                        try {
                            const parsed = JSON.parse(possible);

                            jsonHandled = true; // 🚀 stop loop

                            if (onJSON) await onJSON(parsed);
                        } catch { }
                    }
                }

            } catch { }
        }
    }

    console.log("\n");

    return fullText;

}

// ===============================
// 🧼 JSON EXTRACT (lebih aman)
// ===============================
function extractJSON(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    ```
    if (start === -1 || end === -1 || end <= start) return null;

    return text.slice(start, end + 1);
    ```

}

// ===============================
// ✅ VALIDASI JSON UTUH
// ===============================
function isValidJSON(str) {
    if (!str) return false;

    ```
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
    ```

}
