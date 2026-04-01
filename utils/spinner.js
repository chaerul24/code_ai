export const createSpinner = (
  text = "Thinking...",
  options = {}
) => {
  const frames = [
    "⠋","⠙","⠹","⠸","⠼",
    "⠴","⠦","⠧","⠇","⠏"
  ];

  const speed = options.speed || 80;
  const color = options.color || "\x1b[36m"; // cyan default
  const reset = "\x1b[0m";

  let i = 0;
  let active = true;

  const interval = setInterval(() => {
    if (!active) return;

    const frame = frames[i++ % frames.length];

    process.stdout.write("\r");
    process.stdout.write(`${color}${frame}${reset} ${text}`);
  }, speed);

  // 🔥 stop function
  return () => {
    if (!active) return;

    active = false;
    clearInterval(interval);

    // bersihkan baris
    process.stdout.write("\r");
    process.stdout.clearLine(0);
  };
};
