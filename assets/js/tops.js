const topsGrid = document.getElementById("tops-grid");
const topsFiltersHost = document.getElementById("tops-filters");
const topsSortSelect = document.getElementById("tops-sort");
const topsSearchInput = document.getElementById("tops-search");
const topsUserFilterSelect = document.getElementById("tops-user-filter");
const menuToggle = document.getElementById("menu-toggle");
const menu = document.getElementById("menu");
const DEFAULT_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'><defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#1a2a36'/><stop offset='1' stop-color='#243b4a'/></linearGradient></defs><rect width='1200' height='630' fill='url(#g)'/><text x='50%' y='50%' text-anchor='middle' fill='#b8c2cc' font-size='54' font-family='Arial, sans-serif'>Sans cover</text></svg>"
  );

let selectedTopSort = "date-desc";
let selectedTopSearch = "";
let selectedTopFilter = "all";
let selectedTopUserFilter = "all";

if (menuToggle && menu) {
  menuToggle.addEventListener("click", () => {
    menu.classList.toggle("open");
  });
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function ownerBadge(username) {
  if (!username) return "";
  return `<span class="owner-badge"><span>${escapeHtml(username)}</span></span>`;
}

function topCard(item) {
  const article = document.createElement("article");
  article.className = "review-card";
  article.tabIndex = 0;
  article.setAttribute("role", "link");
  const target = `top.html?id=${encodeURIComponent(item.id)}`;

  const ownerMeta = item.ownerUsername ? ` · ${ownerBadge(item.ownerUsername)}` : "";
  article.innerHTML = `
    <img src="${item.displayCover || item.cover || DEFAULT_COVER}" alt="${item.title || "Top"}" />
    <div class="card-body">
      <p class="meta">${window.ReviewsStore.categories[item.category] || item.category || "Autre"}${item.year ? ` · ${item.year}` : ""}${ownerMeta}</p>
      <h3>${item.title || "Sans titre"}</h3>
      <p>${item.subtitle || ""}</p>
      <div class="card-footer">
        <span class="score">${(item.items || []).length} item(s)</span>
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

function getTopPublicationTimestamp(item) {
  const updated = Number(item?.updatedAt);
  return Number.isFinite(updated) && updated > 0 ? updated : 0;
}

function getTopAverageScore(item, reviewMap) {
  const scores = (item.items || [])
    .map((topItem) => (topItem?.reviewId ? reviewMap.get(topItem.reviewId) : null))
    .map((review) => (Number.isFinite(Number(review?.score)) ? Number(review.score) : null))
    .filter((score) => score !== null);
  if (!scores.length) return null;
  const total = scores.reduce((sum, score) => sum + score, 0);
  return total / scores.length;
}

function sortTops(items, reviewMap) {
  const sorted = [...items];
  sorted.sort((a, b) => {
    const dateA = getTopPublicationTimestamp(a);
    const dateB = getTopPublicationTimestamp(b);
    const scoreA = getTopAverageScore(a, reviewMap);
    const scoreB = getTopAverageScore(b, reviewMap);
    if (selectedTopSort === "date-asc") return dateA - dateB;
    if (selectedTopSort === "score-desc") {
      const left = scoreA ?? Number.NEGATIVE_INFINITY;
      const right = scoreB ?? Number.NEGATIVE_INFINITY;
      if (left !== right) return right - left;
      return dateB - dateA;
    }
    if (selectedTopSort === "score-asc") {
      const left = scoreA ?? Number.POSITIVE_INFINITY;
      const right = scoreB ?? Number.POSITIVE_INFINITY;
      if (left !== right) return left - right;
      return dateB - dateA;
    }
    return dateB - dateA;
  });
  return sorted;
}

function normalizeSearchValue(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeUsernameValue(value) {
  return String(value || "").trim().toLowerCase();
}

function buildTopFilterButtons(tops) {
  if (!topsFiltersHost) return;
  const categories = [...new Set(tops.map((t) => t.category).filter(Boolean))];
  if (selectedTopFilter !== "all" && !categories.includes(selectedTopFilter)) {
    selectedTopFilter = "all";
  }
  topsFiltersHost.innerHTML = `<button class="filter-btn${selectedTopFilter === "all" ? " active" : ""}" data-filter="all">Tout</button>`;
  categories.forEach((cat) => {
    const name = window.ReviewsStore.categories[cat] || cat;
    topsFiltersHost.insertAdjacentHTML(
      "beforeend",
      `<button class="filter-btn${selectedTopFilter === cat ? " active" : ""}" data-filter="${cat}">${name}</button>`
    );
  });
  topsFiltersHost.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      topsFiltersHost.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      selectedTopFilter = button.dataset.filter || "all";
      await renderTops();
    });
  });
}

function buildTopUserFilterOptions(tops) {
  if (!topsUserFilterSelect) return;
  const users = [...new Set(tops.map((t) => normalizeUsernameValue(t.ownerUsername)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  if (selectedTopUserFilter !== "all" && !users.includes(selectedTopUserFilter)) {
    selectedTopUserFilter = "all";
  }
  topsUserFilterSelect.innerHTML = `<option value="all">Tous</option>`;
  users.forEach((username) => {
    const option = document.createElement("option");
    option.value = username;
    option.textContent = username;
    option.selected = selectedTopUserFilter === username;
    topsUserFilterSelect.appendChild(option);
  });
}

function topMatchesSearch(item, rawQuery) {
  const query = normalizeSearchValue(rawQuery);
  if (!query) return true;
  const haystack = [
    item?.title,
    item?.subtitle,
    item?.category,
    item?.year,
    item?.ownerUsername
  ]
    .map((value) => normalizeSearchValue(value))
    .join(" ");
  return haystack.includes(query);
}

async function renderTops() {
  if (!topsGrid) return;
  try {
    const [tops, reviews] = await Promise.all([
      window.ReviewsStore.getAllTops({ status: "published" }),
      window.ReviewsStore.getAll({ status: "published" })
    ]);
    const reviewMap = new Map(reviews.map((r) => [r.id, r]));
    const sortedTops = sortTops(tops, reviewMap);
    buildTopFilterButtons(sortedTops);
    buildTopUserFilterOptions(sortedTops);

    topsGrid.innerHTML = "";
    sortedTops
      .filter((item) => selectedTopFilter === "all" || item.category === selectedTopFilter)
      .filter((item) => selectedTopUserFilter === "all" || normalizeUsernameValue(item.ownerUsername) === selectedTopUserFilter)
      .filter((item) => topMatchesSearch(item, selectedTopSearch))
      .forEach((item) => {
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

if (topsSortSelect) {
  topsSortSelect.value = selectedTopSort;
  topsSortSelect.addEventListener("change", async () => {
    selectedTopSort = topsSortSelect.value || "date-desc";
    await renderTops();
  });
}

if (topsSearchInput) {
  topsSearchInput.addEventListener("input", async () => {
    selectedTopSearch = topsSearchInput.value || "";
    await renderTops();
  });
}

if (topsUserFilterSelect) {
  topsUserFilterSelect.addEventListener("change", async () => {
    selectedTopUserFilter = topsUserFilterSelect.value || "all";
    await renderTops();
  });
}

renderTops();
