const avatarBtn = document.getElementById("avatar-btn");
const hitokoto = document.getElementById("hitokoto");

avatarBtn?.addEventListener("click", () => {
  avatarBtn.classList.toggle("is-flipped");
});

async function loadHitokoto() {
  try {
    const res = await fetch("https://v1.hitokoto.cn/?c=i&c=k&encode=json", {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = await res.json();
    const text = (data.hitokoto || "").trim();
    if (!text) return;
    const from = data.from ? ` — ${data.from}` : "";
    hitokoto.textContent = `${text}${from}`;
  } catch {
    /* keep fallback copy */
  }
}

loadHitokoto();
