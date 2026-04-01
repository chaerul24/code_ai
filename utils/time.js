export const now = () => {
  const d = new Date();
  return `[${d.toTimeString().split(" ")[0]}]`;
};
