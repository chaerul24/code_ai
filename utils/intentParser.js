export const parseProjectIntent = (input) => {
  const text = input.toLowerCase();

  const frameworks = ["express", "laravel", "next", "react", "vue"];

  let type = null;
  let name = null;

  // 🔥 cari framework
  for (const fw of frameworks) {
    if (text.includes(fw)) {
      type = fw;
      break;
    }
  }

  // 🔥 ambil nama project
  // contoh: "buat project laravel bot_tele"
  const words = input.split(" ");

  for (let i = 0; i < words.length; i++) {
    if (frameworks.includes(words[i].toLowerCase())) {
      name = words[i + 1]; // ambil setelah framework
    }
  }

  // 🔥 fallback: cari kata setelah "buat"
  if (!name) {
    const idx = words.findIndex(w =>
      ["buat", "project"].includes(w.toLowerCase())
    );

    if (idx !== -1 && words[idx + 1]) {
      name = words[idx + 1];
    }
  }

  // default name
  if (!name) {
    name = `${type}-app`;
  }

  return { type, name };
};
