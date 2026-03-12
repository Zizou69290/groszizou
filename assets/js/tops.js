const topsGrid = document.getElementById("tops-grid");
const topsFiltersHost = document.getElementById("tops-filters");
const topsSortSelect = document.getElementById("tops-sort");
const topsSearchInput = document.getElementById("tops-search");
const topsUserFilterSelect = document.getElementById("tops-user-filter");
const topsResetBtn = document.getElementById("tops-reset");
const topsResultsMeta = document.getElementById("tops-results-meta");
const quickCreateTopBtn = document.getElementById("quick-create-top");
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
let pendingSearchDebounce = null;
let suppressTopsUrlSync = false;
let currentUser = window.ReviewsStore?.getCurrentUser?.() || null;
const TOPS_SORT_MODES = new Set(["date-desc", "date-asc", "score-desc", "score-asc"]);

function normalizePublicationStatus(value) {
  return String(value || "").trim().toLowerCase() === "draft" ? "draft" : "published";
}

function formatScoreValue(score) {
  if (!Number.isFinite(Number(score))) return "";
  const value = Number(score);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function fmtTopDateFromTimestamp(ts) {
  const parsed = Number(ts);
  if (!Number.isFinite(parsed) || parsed <= 0) return "Date libre";
  const d = new Date(parsed);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function applyTopsListingStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const nextFilter = String(params.get("cat") || "all").trim() || "all";
  const nextSort = String(params.get("sort") || "date-desc").trim();
  const nextUser = String(params.get("user") || "all").trim() || "all";
  const nextSearch = String(params.get("q") || "");
  selectedTopFilter = nextFilter;
  selectedTopSort = TOPS_SORT_MODES.has(nextSort) ? nextSort : "date-desc";
  selectedTopUserFilter = nextUser;
  selectedTopSearch = nextSearch;
  if (topsSortSelect) topsSortSelect.value = selectedTopSort;
  if (topsUserFilterSelect) topsUserFilterSelect.value = selectedTopUserFilter;
  if (topsSearchInput) topsSearchInput.value = selectedTopSearch;
}

function syncTopsListingStateToUrl() {
  if (suppressTopsUrlSync) return;
  const params = new URLSearchParams(window.location.search);
  if (selectedTopFilter && selectedTopFilter !== "all") params.set("cat", selectedTopFilter);
  else params.delete("cat");
  if (selectedTopSort && selectedTopSort !== "date-desc") params.set("sort", selectedTopSort);
  else params.delete("sort");
  if (selectedTopUserFilter && selectedTopUserFilter !== "all") params.set("user", selectedTopUserFilter);
  else params.delete("user");
  const search = String(selectedTopSearch || "").trim();
  if (search) params.set("q", search);
  else params.delete("q");
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash || ""}`;
  window.history.replaceState(null, "", nextUrl);
}

function closeMenu() {
  if (!menu) return;
  menu.classList.remove("open");
  if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
}

if (menuToggle && menu) {
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.addEventListener("click", () => {
    const next = !menu.classList.contains("open");
    menu.classList.toggle("open", next);
    menuToggle.setAttribute("aria-expanded", next ? "true" : "false");
  });
  document.addEventListener("click", (event) => {
    if (!menu.classList.contains("open")) return;
    if (menu.contains(event.target) || menuToggle.contains(event.target)) return;
    closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

const activeMenuLink = document.querySelector(`.menu a[href="${window.location.pathname.split("/").pop() || "tops.html"}"]`);
if (activeMenuLink) activeMenuLink.setAttribute("aria-current", "page");

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
  const isDraft = normalizePublicationStatus(item.status) === "draft";
  article.classList.toggle("is-draft", isDraft);
  article.tabIndex = 0;
  article.setAttribute("role", "link");
  const target = `top.html?id=${encodeURIComponent(item.id)}`;

  const ownerMeta = item.ownerUsername ? `, par ${ownerBadge(item.ownerUsername)}` : "";
  const topDate = fmtTopDateFromTimestamp(item.updatedAt);
  const metaPrefix = isDraft ? "Brouillon" : "Publié";
  const avg = Number.isFinite(Number(item.averageScore)) ? Number(item.averageScore) : null;
  const avgDisplay = avg === null ? "☆☆☆☆☆" : `${"★".repeat(Math.max(0, Math.min(5, Math.round(avg / 2))))}${"☆".repeat(5 - Math.max(0, Math.min(5, Math.round(avg / 2))))} (${formatScoreValue(avg)}/10)`;
  article.innerHTML = `
    <img src="${item.displayCover || item.cover || DEFAULT_COVER}" alt="${item.title || "Top"}" />
    <div class="card-body">
      <p class="meta">${metaPrefix} le ${topDate}${ownerMeta}</p>
      <h3>${item.title || "Sans titre"}</h3>
      <p>${item.subtitle || ""}</p>
      <div class="card-footer">
        <span class="score">${avgDisplay}</span>
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
    .map((topItem) => {
      if (Number.isFinite(Number(topItem?.note))) return Number(topItem.note);
      const review = topItem?.reviewId ? reviewMap.get(topItem.reviewId) : null;
      return Number.isFinite(Number(review?.score)) ? Number(review.score) : null;
    })
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

function topCategoryLabelWithCount(category, count) {
  const labels = {
    film: count > 1 ? "Films" : "Film",
    serie: count > 1 ? "Séries" : "Série",
    livre: count > 1 ? "Livres" : "Livre",
    musique: count > 1 ? "Musiques" : "Musique",
    jeu: count > 1 ? "Jeux vidéo" : "Jeu vidéo"
  };
  const base = labels[category] || window.ReviewsStore?.categories?.[category] || category || "Autre";
  return `${base} (${count})`;
}

function buildTopFilterButtons(tops) {
  if (!topsFiltersHost) return;
  const categories = [...new Set(tops.map((t) => t.category).filter(Boolean))];
  const countByCategory = tops.reduce((acc, item) => {
    const key = String(item?.category || "");
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  if (selectedTopFilter !== "all" && !categories.includes(selectedTopFilter)) {
    selectedTopFilter = "all";
  }
  topsFiltersHost.innerHTML = `<button class="filter-btn${selectedTopFilter === "all" ? " active" : ""}" data-filter="all">Tout (${tops.length})</button>`;
  categories.forEach((cat) => {
    const count = Number(countByCategory[cat] || 0);
    const name = topCategoryLabelWithCount(cat, count);
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

function createListingState(message) {
  const node = document.createElement("div");
  node.className = "listing-state";
  node.textContent = message;
  return node;
}

function createSkeletonCard() {
  const article = document.createElement("article");
  article.className = "review-card skeleton";
  article.setAttribute("aria-hidden", "true");
  article.innerHTML = `
    <img alt="" src="${DEFAULT_COVER}" />
    <div class="card-body">
      <div class="skeleton-line meta"></div>
      <div class="skeleton-line title"></div>
      <div class="skeleton-line text"></div>
      <div class="skeleton-line text short"></div>
    </div>
  `;
  return article;
}

function renderListingLoadingState() {
  if (!topsGrid) return;
  topsGrid.innerHTML = "";
  for (let i = 0; i < 6; i += 1) {
    topsGrid.appendChild(createSkeletonCard());
  }
}

async function resetTopListingFilters() {
  selectedTopSort = "date-desc";
  selectedTopSearch = "";
  selectedTopFilter = "all";
  selectedTopUserFilter = "all";
  if (topsSortSelect) topsSortSelect.value = selectedTopSort;
  if (topsSearchInput) topsSearchInput.value = "";
  if (topsUserFilterSelect) topsUserFilterSelect.value = selectedTopUserFilter;
  await renderTops();
}

async function renderTops() {
  if (!topsGrid) return;
  renderListingLoadingState();
  if (topsResultsMeta) topsResultsMeta.textContent = "Chargement des contenus...";
  try {
    const [tops, reviews] = await Promise.all([
      window.ReviewsStore.getAllTops(currentUser ? {} : { status: "published" }),
      window.ReviewsStore.getAll(currentUser ? {} : { status: "published" })
    ]);
    const reviewMap = new Map(reviews.map((r) => [r.id, r]));
    const sortedTops = sortTops(tops, reviewMap);
    const listingVisibleTops = sortedTops.filter((item) => {
      const status = normalizePublicationStatus(item.status);
      if (status === "published") return true;
      return status === "draft" && Boolean(currentUser?.uid) && item.ownerId === currentUser.uid;
    });
    const facetedTops = listingVisibleTops
      .filter((item) => selectedTopUserFilter === "all" || normalizeUsernameValue(item.ownerUsername) === selectedTopUserFilter)
      .filter((item) => topMatchesSearch(item, selectedTopSearch));
    buildTopFilterButtons(facetedTops);
    buildTopUserFilterOptions(listingVisibleTops);

    topsGrid.innerHTML = "";
    const visibleTops = facetedTops
      .filter((item) => selectedTopFilter === "all" || item.category === selectedTopFilter);
    visibleTops.forEach((item) => {
      item.averageScore = getTopAverageScore(item, reviewMap);
      if (!item.cover && Array.isArray(item.items) && item.items.length) {
        const first = item.items[0];
        const linked = first?.reviewId ? reviewMap.get(first.reviewId) : null;
        item.displayCover = linked?.cover || linked?.poster || first?.cover || first?.poster || "";
      }
      topsGrid.appendChild(topCard(item));
    });
    if (!visibleTops.length) {
      topsGrid.appendChild(createListingState("Aucun top ne correspond à vos filtres."));
    }
    if (topsResultsMeta) {
      const count = visibleTops.length;
      const topLabel = count > 1 ? "tops" : "top";
      const dispoLabel = count > 1 ? "dispos" : "dispo";
      topsResultsMeta.textContent = `${count} super ${topLabel} ${dispoLabel}.`;
    }
    syncTopsListingStateToUrl();
  } catch (error) {
    window.alert(`Impossible de charger les tops : ${error.message}`);
    topsGrid.innerHTML = "";
    topsGrid.appendChild(createListingState("Impossible de charger les tops pour le moment."));
    if (topsResultsMeta) topsResultsMeta.textContent = "Erreur de chargement.";
  }
}

applyTopsListingStateFromUrl();

if (topsSortSelect) {
  topsSortSelect.value = selectedTopSort;
  topsSortSelect.addEventListener("change", async () => {
    selectedTopSort = topsSortSelect.value || "date-desc";
    await renderTops();
  });
}

if (topsSearchInput) {
  topsSearchInput.addEventListener("input", () => {
    selectedTopSearch = topsSearchInput.value || "";
    window.clearTimeout(pendingSearchDebounce);
    pendingSearchDebounce = window.setTimeout(() => {
      renderTops();
    }, 150);
  });
}

if (topsUserFilterSelect) {
  topsUserFilterSelect.addEventListener("change", async () => {
    selectedTopUserFilter = topsUserFilterSelect.value || "all";
    await renderTops();
  });
}

if (topsResetBtn) {
  topsResetBtn.addEventListener("click", () => {
    resetTopListingFilters();
  });
}

window.addEventListener("popstate", async () => {
  suppressTopsUrlSync = true;
  applyTopsListingStateFromUrl();
  await renderTops();
  suppressTopsUrlSync = false;
});

renderTops();

if (window.ReviewsStore?.onAuthChanged) {
  window.ReviewsStore.onAuthChanged((user) => {
    currentUser = user ? window.ReviewsStore.getCurrentUser() : null;
    if (quickCreateTopBtn) quickCreateTopBtn.classList.toggle("hidden", !Boolean(user));
    renderTops();
  });
}

if (quickCreateTopBtn) {
  quickCreateTopBtn.classList.toggle("hidden", !Boolean(window.ReviewsStore?.getCurrentUser?.()));
}
