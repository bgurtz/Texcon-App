document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("printBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    window.print();
  });
});