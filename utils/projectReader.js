import fs from "fs";
import path from "path";

// folder/file yang di-skip
const ignore = ["node_modules", ".git", "package-lock.json"];

// ekstensi yang dibaca
const allowedExt = [".js", ".json", ".py", ".txt", ".md", ".html", ".css"];

// ===============================
// 📁 GET PROJECT (folder saja)
// ===============================
export const getProjects = (dir = process.cwd()) => {
  try {
    const files = fs.readdirSync(dir);

    return files.filter((file) => {
      const fullPath = path.join(dir, file);

      if (ignore.some(i => fullPath.includes(i))) return false;

      return fs.statSync(fullPath).isDirectory();
    });
  } catch (err) {
    console.error("Error:", err.message);
    return [];
  }
};

// ===============================
// 📄 READ PROJECT (isi file)
// ===============================
export const readProject = (dir = process.cwd()) => {
  let result = [];

  const walk = (current) => {
    let files;

    try {
      files = fs.readdirSync(current);
    } catch {
      return; // skip kalau tidak bisa dibaca
    }

    for (const file of files) {
      const fullPath = path.join(current, file);

      // skip ignored
      if (ignore.some(i => fullPath.includes(i))) continue;

      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(fullPath);
      } else {
        const ext = path.extname(file);

        if (!allowedExt.includes(ext)) continue;

        let content = "";
        try {
          content = fs.readFileSync(fullPath, "utf-8");
        } catch {
          continue;
        }

        result.push({
          path: fullPath,
          content: content.slice(0, 2000) // limit biar ringan
        });
      }
    }
  };

  walk(dir);

  return result;
};