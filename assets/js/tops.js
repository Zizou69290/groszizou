const topsGrid = document.getElementById("tops-grid");
const menuToggle = document.getElementById("menu-toggle");
const menu = document.getElementById("menu");

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

  article.innerHTML = `
    <div class="card-body">
      <p class="meta">${window.ReviewsStore.categories[item.category] || item.category || "Autre"}${item.year ? ` · ${item.year}` : ""}</p>
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
    const tops = await window.ReviewsStore.getAllTops();
    topsGrid.innerHTML = "";
    tops.forEach((item) => topsGrid.appendChild(topCard(item)));
  } catch (error) {
    window.alert(`Impossible de charger les tops : ${error.message}`);
  }
}

renderTops();
