const topsGrid = document.getElementById("tops-grid");
const menuToggle = document.getElementById("menu-toggle");
const menu = document.getElementById("menu");
const DEFAULT_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'><defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#1a2a36'/><stop offset='1' stop-color='#243b4a'/></linearGradient></defs><rect width='1200' height='630' fill='url(#g)'/><text x='50%' y='50%' text-anchor='middle' fill='#b8c2cc' font-size='54' font-family='Arial, sans-serif'>Sans cover</text></svg>"
  );

if (menuToggle && menu) {
  menuToggle.addEventListener("click", () => {
    menu.classList.toggle("open");
  });
}

function topCard(item) {
  const article = document.createElement("article");
  article.className = "review-card";
  article.tabIndex = 0;
  article.setAttribute("role", "link");
  const target = `top.html?id=${encodeURIComponent(item.id)}`;

  const ownerMeta = item.ownerUsername ? ` · @${item.ownerUsername}` : "";
  article.innerHTML = `
    <img src="${item.displayCover || item.cover || DEFAULT_COVER}" alt="${item.title || "Top"}" />
    <div class="card-body">
      <p class="meta">${window.ReviewsStore.categories[item.category] || item.category || "Autre"}${item.year ? ` · ${item.year}` : ""}${ownerMeta}</p>
      <h3>${item.title || "Sans titre"}</h3>
      <p>${item.subtitle || ""}</p>
      <div class="card-footer">
        <span class="score">${(item.items || []).length} item(s)</span>
        <span class="read-hint">Lire</span>
      </div>
    </div>
  `;

  article.addEventListener("click", () => {
    window.location.href = target;
  });
  article.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      window.location.href = target;
    }
  });

  return article;
}

async function renderTops() {
  if (!topsGrid) return;
  try {
    const [tops, reviews] = await Promise.all([window.ReviewsStore.getAllTops(), window.ReviewsStore.getAll()]);
    const reviewMap = new Map(reviews.map((r) => [r.id, r]));
    topsGrid.innerHTML = "";
    tops.forEach((item) => {
      if (!item.cover && Array.isArray(item.items) && item.items.length) {
        const first = item.items[0];
        const linked = first?.reviewId ? reviewMap.get(first.reviewId) : null;
        item.displayCover = linked?.cover || linked?.poster || "";
      }
      topsGrid.appendChild(topCard(item));
    });
  } catch (error) {
    window.alert(`Impossible de charger les tops : ${error.message}`);
  }
}

renderTops();
