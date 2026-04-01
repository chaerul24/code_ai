import { spawn } from "child_process"
import fs from "fs/promises"
import path from "path"
import cliProgress from "cli-progress"
import { askAI } from "./ai.js"

// ===============================
// 🕒 TIME
// ===============================
function now() {
  const d = new Date()
  return `[${d.toTimeString().split(" ")[0]}]`
}

// ===============================
// 🎯 PROGRESS BAR
// ===============================
function createBar(label) {
  const bar = new cliProgress.SingleBar({
    format: `${label} |{bar}| {percentage}%`,
    barCompleteChar: "█",
    barIncompleteChar: "-"
  })

  bar.start(100, 0)
  return bar
}

// ===============================
// 🏷️ LABEL
// ===============================
function getLabel(cmd) {
  if (cmd.includes("create-project")) return "🚀 create project"
  if (cmd.includes("composer require")) return "📦 install breeze"
  if (cmd.includes("breeze:install")) return "🔐 setup auth"
  if (cmd.includes("npm install")) return "📦 npm install"
  if (cmd.includes("build")) return "⚡ build production"
  if (cmd.includes("migrate")) return "🗄️ migrate db"
  return "⚙️ processing"
}

// ===============================
// ⚙️ RUN COMMAND
// ===============================
async function run(cmd, cwd) {
  const label = getLabel(cmd)
  const bar = createBar(label)

  return new Promise((resolve) => {
    const child = spawn(cmd, {
      cwd,
      shell: true
    })

    let progress = 0

    child.stdout.on("data", () => {
      progress += 10
      if (progress > 90) progress = 90
      bar.update(progress)
    })

    child.stderr.on("data", () => {
      progress += 5
      if (progress > 90) progress = 90
      bar.update(progress)
    })

    child.on("close", () => {
      bar.update(100)
      bar.stop()
      resolve(true)
    })

    child.on("error", () => {
      bar.stop()
      console.log(`${now()} ❌ ERROR ${label}`)
      resolve(false)
    })
  })
}

// ===============================
// ⚡ BUILD PRODUCTION (TAILWIND)
// ===============================
async function runBuild(cwd) {
  const bar = createBar("⚡ build tailwind production")

  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", "build"], { cwd })

    child.stdout.on("data", (data) => {
      const text = data.toString()

      if (text.includes("building")) bar.update(30)
      if (text.includes("transforming")) bar.update(50)
      if (text.includes("rendering")) bar.update(70)
      if (text.includes("gzip")) bar.update(90)
      if (text.includes("built")) bar.update(100)
    })

    child.on("close", () => {
      bar.update(100)
      bar.stop()
      console.log(`${now()} ✅ build selesai`)
      resolve(true)
    })

    child.on("error", (err) => {
      bar.stop()
      reject(err)
    })
  })
}

// ===============================
// 📁 WRITE FILE
// ===============================
async function writeFileSafe(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content)
  console.log(`${now()} 📄 Created: ${filePath}`)
}

// ===============================
// 🧼 SANITIZE NAME
// ===============================
function sanitizeName(name) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "")
}

// ===============================
// 🚀 BACKGROUND PROCESS
// ===============================
function runDetached(cmd, cwd) {
  const parts = cmd.split(" ")

  const child = spawn(parts[0], parts.slice(1), {
    cwd,
    stdio: "ignore",
    detached: true
  })

  child.unref()
}

// ===============================
// 🤖 GENERATE VIEW (PRO STYLE)
// ===============================
async function generateView({ name, projectPath, prompt }) {
  console.log(`${now()} 🤖 generate ${name}`);

  const result = await askAI(prompt);

  let content = "";

  // ================================
  // 1. Ambil semua code block
  // ================================
  const codeBlocks = [...result.matchAll(/`(?:html|blade|php)?\s*([\s\S]*?)`/gi)];

  if (codeBlocks.length > 0) {
    // ambil block TERPANJANG (biasanya paling lengkap)
    content = codeBlocks
      .map(m => m[1].trim())
      .sort((a, b) => b.length - a.length)[0];
  }

  // ================================
  // 2. Fallback: ambil dari tag HTML pertama
  // ================================
  if (!content) {
    const match = result.match(/<(x-|div|section|main|html|body)[\s\S]*$/i);
    if (match) {
      content = match[0].trim();
    }
  }

  // ================================
  // 3. Bersihin sisa ` kalau ada
  // ================================
  content = content.replace(/`/g, "").trim();

  // ================================
  // 4. Validasi minimal HTML
  // ================================
  const isValid =
    /<\w+/.test(content) &&
    content.length > 20;

  if (!isValid) {
    console.log("⚠️ AI tidak menghasilkan HTML valid, pakai template default");

    ```
content = `
      ```

<x-app-layout>
  <div class="p-6">
    <h1 class="text-xl font-bold">${name}</h1>
  </div>
</x-app-layout>
    `.trim();
  }

  // ================================
  // 5. Path file
  // ================================
  const filePath = path.join(
    projectPath,
    "resources/views",
    `${name}.blade.php`
  );

  await writeFileSafe(filePath, content);

  console.log(`${now()} ✅ saved ${name}.blade.php`);
}

// ===============================
// 🚀 MAIN GENERATOR
// ===============================
export async function generateFullPOS(input = "pos-app") {
  const root = process.cwd()
  const name = sanitizeName(input)
  const projectPath = path.join(root, name)

  console.log(`\n${now()} 🚀 GENERATE POS (${name})\n`)

  // CREATE PROJECT
  await run(`composer create-project laravel/laravel ${name}`, root)

  // INSTALL BREEZE (TAILWIND)
  await run(`composer require laravel/breeze --dev`, projectPath)
  await run(`php artisan breeze:install blade`, projectPath)
  await run(`php artisan key:generate`, projectPath)

  // NPM INSTALL
  await run(`npm install`, projectPath)

  // BUILD PRODUCTION
  await runBuild(projectPath)

  // MIGRATE
  await run(`php artisan migrate`, projectPath)

  // OPTIMIZE
  await run(`php artisan config:cache`, projectPath)
  await run(`php artisan route:cache`, projectPath)
  await run(`php artisan view:cache`, projectPath)

  // ===============================
  // 🤖 AI VIEWS (PROFESSIONAL UI)
  // ===============================
console.log("typeof now:", typeof now);
console.log("typeof askAI:", typeof askAI);
await generateView({
  name: "login",
  projectPath,
  prompt: `
Buat file Blade Laravel bernama login.blade.php.

Gunakan:
- @extends('layouts.app')
- @section('title', 'Login')
- @section('content') dan @endsection

Desain:
- Halaman login modern, center (flex, min-h-screen, items-center, justify-center)
- Gunakan Tailwind CSS
- Gunakan Font Awesome untuk icon input

Form Login berisi:
- Input Email (dengan icon)
- Input Password (dengan icon)
- Checkbox "Remember Me"
- Tombol Login

Tambahan:
- Link ke halaman Register
- Validasi sederhana (required)
- Gunakan card style (shadow, rounded, padding)

Interaksi jQuery:
- Klik tombol login → tampilkan alert "Login submitted"
- Toggle show/hide password

Pastikan:
- Responsive
- Clean UI
- Siap dipakai di Laravel
`
})
await generateView({
  name: "register",
  projectPath,
  prompt: `
Buat file Blade Laravel bernama register.blade.php.

Gunakan:
- @extends('layouts.app')
- @section('title', 'Register')
- @section('content') dan @endsection

Desain:
- Halaman register modern, center (flex, min-h-screen, items-center, justify-center)
- Gunakan Tailwind CSS
- Gunakan Font Awesome

Form Register berisi:
- Input Nama
- Input Email
- Input Password
- Input Confirm Password
- Tombol Register

Tambahan:
- Link ke halaman Login
- Validasi sederhana (required)
- Card UI (shadow, rounded)

Interaksi jQuery:
- Validasi password & confirm password harus sama
- Jika tidak sama → tampilkan alert
- Toggle show/hide password

Styling:
- Clean, modern, responsive
- Gunakan spacing Tailwind yang rapi

Pastikan:
- Kode valid Blade Laravel
- Siap langsung dipakai
`
})


await generateView({
  name: "forgot-password",
  projectPath,
  prompt: `
Buat file Blade Laravel bernama forgot-password.blade.php.

Gunakan:
- @extends('layouts.app')
- @section('title', 'Forgot Password')
- @section('content') dan @endsection

Desain:
- Halaman center (flex, min-h-screen, items-center, justify-center)
- Gunakan Tailwind CSS
- Gunakan Font Awesome

Tampilan:
- Judul: "Forgot Password"
- Deskripsi: "Masukkan email untuk reset password"
- Card UI (shadow, rounded, padding)

Form:
- Input Email (dengan icon envelope)
- Tombol "Send Reset Link"

Tambahan:
- Link kembali ke halaman Login
- Validasi sederhana (required, email format)

Interaksi jQuery:
- Saat tombol diklik → tampilkan alert "Reset link sent to your email"
- Disable tombol setelah diklik (prevent double submit)

Teknis:
- Gunakan method POST
- Tambahkan @csrf
- Action bisa '#'

Styling:
- Clean, modern, responsive
- Gunakan Tailwind spacing yang rapi

Pastikan:
- Kode valid Blade Laravel
- Siap langsung dipakai
`
})

  await generateView({
  name: "layouts.app",
  projectPath,
  prompt: `
Buat file Blade Laravel bernama layouts/app.blade.php sebagai layout utama.

Gunakan struktur HTML lengkap:
- <!DOCTYPE html>
- <html>, <head>, <body>

Gunakan:
- @yield('title') untuk title halaman
- @yield('content') untuk isi utama

Tambahkan:
- Tailwind CSS (CDN)
- Font Awesome (CDN)
- jQuery (CDN)

Struktur layout:
1. Navbar (simple, responsive)
   - Logo / nama app di kiri
   - Menu: Dashboard, Profile di kanan

2. Container utama
   - Gunakan class Tailwind (max-w, mx-auto, padding)
   - Isi dengan @yield('content')

3. Footer sederhana

Tambahkan styling:
- Gunakan Tailwind (clean dan modern)
- Background abu-abu terang
- Card style untuk konten (opsional)

Tambahkan script:
- jQuery siap pakai
- @stack('scripts') sebelum </body>

Pastikan:
- Kode valid Blade Laravel
- Siap dipakai dengan @extends('layouts.app')
- Rapi dan mudah dibaca
`
})
await generateView({
  name: "dashboard",
  projectPath,
  prompt: `
Buat file Blade Laravel bernama dashboard.blade.php.

Gunakan:
- @extends('layouts.app')
- @section('content') dan @endsection

Isi halaman:
- Gunakan Tailwind CSS untuk styling
- Gunakan Font Awesome untuk icon
- Gunakan jQuery untuk interaksi sederhana

Tampilan:
- Header: "Dashboard"
- 3 card statistik (Users, Orders, Revenue)
- Setiap card ada icon Font Awesome
- Tambahkan tombol dengan efek klik pakai jQuery (alert atau console.log)

Struktur rapi dan modern (flex/grid Tailwind).
`
})

await generateView({
  name: "profile",
  projectPath,
  prompt: `
Buat file Blade Laravel bernama profile.blade.php.

Gunakan:
- @extends('layouts.app')
- @section('content') dan @endsection

Isi halaman:
- Halaman profil user sederhana
- Gunakan Tailwind CSS
- Gunakan Font Awesome untuk icon

Tampilan:
- Judul: "Profile"
- Card berisi:
  - Foto profil (placeholder)
  - Nama user
  - Email
- Tombol "Edit Profile"

Tambahkan interaksi jQuery:
- Klik tombol edit → tampil alert "Edit profile clicked"

Gunakan layout yang clean dan responsive.
`
})

  // RUN SERVER BACKGROUND
  console.log(`\n${now()} 🚀 starting server...\n`)
  runDetached("php artisan serve", projectPath)

  console.log(`🌐 http://localhost:8000`)
  console.log(`\n${now()} ✅ DONE\n`)
}