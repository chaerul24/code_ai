export const confirmPrompt = (rl, question = "Lanjutkan?") => {
  return new Promise((resolve) => {
    rl.question(`${question} (Y/n): `, (answer) => {
      const val = answer.trim().toLowerCase();

      if (val === "" || val === "y" || val === "yes") {
        return resolve(true);
      }

      if (val === "n" || val === "no") {
        return resolve(false);
      }

      console.log("❌ Input tidak valid (Y/n)");
      resolve(confirmPrompt(rl, question));
    });
  });
};