import fs from "fs";
import path from "path";

export const saveCode = (rl, code, lang) => {
  const extMap = {
    python: "py",
    javascript: "js",
    bash: "sh",
    php: "php"
  };

  const ext = extMap[lang] || "txt";

  return new Promise((resolve) => {
    rl.question(`\n💾 Mau disimpan? (y/N): `, (answer) => {
      if (answer.toLowerCase() !== "y") {
        console.log("❌ Tidak disimpan\n");
        return resolve();
      }

      const filename = `output_${Date.now()}.${ext}`;
      const filePath = path.join(process.cwd(), filename);

      fs.writeFileSync(filePath, code);

      console.log(`✅ Disimpan: ${filePath}\n`);
      resolve();
    });
  });
};
