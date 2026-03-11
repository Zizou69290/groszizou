const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const menuToggle = document.getElementById("menu-toggle");
const menu = document.getElementById("menu");

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

const activeMenuLink = document.querySelector('.menu a[href="tops.html"]');
if (activeMenuLink) activeMenuLink.setAttribute("aria-current", "page");

const title = document.getElementById("top-title");
const category = document.getElementById("top-category");
const subtitle = document.getElementById("top-subtitle");
const topDate = document.getElementById("top-date");
const topDetails = document.getElementById("top-details");
const topEditLink = document.getElementById("top-edit-link");
const list = document.getElementById("top-items");
const cover = document.getElementById("top-cover-bg");
const topViewDetailsBtn = document.getElementById("top-view-details");
const topViewPosterBtn = document.getElementById("top-view-poster");
const topDiscordShareBtn = document.getElementById("top-discord-share");
let loadedTop = null;
let loadedReviewMap = new Map();
let selectedTopItemsView = "poster";
let topDiscordSharePending = false;
let loadedTopCoverUrl = "";

const DEFAULT_POSTER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 900'><defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#1a2a36'/><stop offset='1' stop-color='#243b4a'/></linearGradient></defs><rect width='600' height='900' fill='url(#g)'/><text x='50%' y='50%' text-anchor='middle' fill='#b8c2cc' font-size='30' font-family='Arial, sans-serif'>Sans affiche</text></svg>"
  );
const DEFAULT_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'><defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#1a2a36'/><stop offset='1' stop-color='#243b4a'/></linearGradient></defs><rect width='1200' height='630' fill='url(#g)'/><text x='50%' y='50%' text-anchor='middle' fill='#b8c2cc' font-size='54' font-family='Arial, sans-serif'>Sans cover</text></svg>"
  );

function scoreToStars(score) {
  if (!Number.isFinite(score)) return "\u2606\u2606\u2606\u2606\u2606";
  const full = Math.max(0, Math.min(5, Math.round(score / 2)));
  return "\u2605".repeat(full) + "\u2606".repeat(5 - full);
}

function fmtDateFromTimestamp(ts) {
  const parsed = Number(ts);
  if (!Number.isFinite(parsed) || parsed <= 0) return "Date libre";
  const d = new Date(parsed);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function normalizeTopItemsView(value) {
  return String(value || "").trim().toLowerCase() === "details" ? "details" : "poster";
}

function applyTopItemsViewFromUrl() {
  const urlView = new URLSearchParams(window.location.search).get("view");
  selectedTopItemsView = normalizeTopItemsView(urlView);
}

function syncTopItemsViewToUrl() {
  const query = new URLSearchParams(window.location.search);
  if (selectedTopItemsView === "poster") query.set("view", "poster");
  else query.delete("view");
  const nextQuery = query.toString();
  const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash || ""}`;
  window.history.replaceState(null, "", nextUrl);
}

function renderTopItemsViewButtons() {
  if (topViewDetailsBtn) {
    const isActive = selectedTopItemsView === "details";
    topViewDetailsBtn.classList.toggle("active", isActive);
    topViewDetailsBtn.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
  if (topViewPosterBtn) {
    const isActive = selectedTopItemsView === "poster";
    topViewPosterBtn.classList.toggle("active", isActive);
    topViewPosterBtn.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
  if (list) list.classList.toggle("top-items-view-posters", selectedTopItemsView === "poster");
}

function itemScoreText(score) {
  if (!Number.isFinite(Number(score))) return "";
  const value = Number(score);
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${scoreToStars(value)} (${rounded}/10)`;
}

function creatorLabelForCategory(category) {
  const key = String(category || "").trim().toLowerCase();
  if (key === "jeu") return "Studio";
  if (key === "livre") return "Auteur";
  if (key === "musique") return "Artiste";
  return "R\u00E9alisation";
}

function creatorValueForCategory(category, source = {}) {
  const key = String(category || "").trim().toLowerCase();
  if (key === "jeu") return String(source?.studio || source?.director || source?.author || "").trim();
  if (key === "livre") return String(source?.author || source?.director || source?.studio || "").trim();
  if (key === "musique") return String(source?.author || source?.studio || source?.director || "").trim();
  return String(source?.director || source?.studio || source?.author || "").trim();
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

function isAdminUser(user) {
  return String(user?.username || "").trim().toLowerCase() === "admin";
}

function renderTopQuickActions(top) {
  if (!topEditLink) return;
  const currentUser = window.ReviewsStore?.getCurrentUser?.() || null;
  const canEdit = Boolean(
    top &&
    currentUser &&
    (isAdminUser(currentUser) || (top.ownerId && top.ownerId === currentUser.uid))
  );
  if (canEdit) {
    topEditLink.href = `top-studio.html?edit=${encodeURIComponent(top.id)}`;
    topEditLink.classList.remove("hidden");
  } else {
    topEditLink.classList.add("hidden");
  }
}

function computeTopAverageScore(top, reviewMap) {
  const scores = (top?.items || [])
    .map((item) => {
      if (Number.isFinite(Number(item?.note))) return Number(item.note);
      const linked = item?.reviewId ? reviewMap.get(item.reviewId) : null;
      return Number.isFinite(Number(linked?.score)) ? Number(linked.score) : null;
    })
    .filter((value) => value !== null);
  if (!scores.length) return null;
  const total = scores.reduce((sum, value) => sum + value, 0);
  return total / scores.length;
}

function sanitizeShareImageUrl(raw) {
  const value = String(raw || "").trim();
  if (!value || value.startsWith("data:")) return "";
  return value;
}

function findTopDirector(top, reviewMap) {
  const items = Array.isArray(top?.items) ? top.items : [];
  for (const item of items) {
    const linked = item?.reviewId ? reviewMap.get(item.reviewId) : null;
    const linkedDirector = creatorValueForCategory(linked?.category || top?.category || "", linked || {});
    if (linkedDirector) return linkedDirector;
    const manualDirector = String(item?.director || "").trim();
    if (manualDirector) return manualDirector;
  }
  return "";
}

async function shareTopToDiscord(top) {
  if (!top || topDiscordSharePending) return;
  topDiscordSharePending = true;
  if (topDiscordShareBtn) {
    topDiscordShareBtn.disabled = true;
    topDiscordShareBtn.textContent = "Envoi...";
  }

  try {
    const avg = computeTopAverageScore(top, loadedReviewMap);
    const response = await fetch("/api/discord-share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "top",
        title: String(top.title || "Sans titre").trim(),
        summary: String(top.subtitle || "").trim(),
        coverUrl: sanitizeShareImageUrl(loadedTopCoverUrl || top.cover || ""),
        year: String(top.year || "").trim(),
        director: findTopDirector(top, loadedReviewMap),
        score: Number.isFinite(Number(avg)) ? Number(avg) : null,
        url: `${window.location.origin}/top.html?id=${encodeURIComponent(top.id || id || "")}`
      })
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Endpoint /api/discord-share indisponible en local. Utilise la version déployée pour ce bouton.");
      }
      const message = await response.text();
      throw new Error(message || `Erreur ${response.status}`);
    }

    window.alert("Partagé sur Discord.");
  } catch (error) {
    window.alert(`Partage Discord impossible : ${error.message}`);
  } finally {
    topDiscordSharePending = false;
    if (topDiscordShareBtn) {
      topDiscordShareBtn.disabled = false;
      topDiscordShareBtn.textContent = "Partager sur Discord";
    }
  }
}

function renderTopDetails(top, averageScore = null) {
  if (!topDetails) return;
  const entries = [
    {
      label: "Note moyenne",
      value: Number.isFinite(Number(averageScore))
        ? `${scoreToStars(Number(averageScore))} (${Number(averageScore).toFixed(1)}/10)`
        : ""
    }
  ].filter((entry) => String(entry.value || "").trim());
  topDetails.innerHTML = "";
  if (!entries.length) {
    topDetails.classList.add("hidden");
    return;
  }
  entries.forEach((entry) => {
    const node = document.createElement("span");
    node.className = "review-detail";
    node.innerHTML = `<strong>${escapeHtml(entry.label)} :</strong> ${escapeHtml(entry.value)}`;
    topDetails.appendChild(node);
  });
  topDetails.classList.remove("hidden");
}

function renderLinkedReviewItem(item, index, review) {
  if (selectedTopItemsView === "poster") {
    const li = document.createElement("li");
    li.className = "top-item top-item-poster";
    const link = document.createElement("a");
    link.className = "top-poster-card";
    link.href = `review.html?id=${encodeURIComponent(review.id)}`;

    const rank = document.createElement("span");
    rank.className = "top-poster-rank";
    rank.textContent = String(index + 1);
    link.appendChild(rank);

    const poster = document.createElement("img");
    poster.className = "top-poster-image";
    poster.src = review.poster || review.cover || DEFAULT_POSTER;
    poster.alt = review.title || "Review";
    link.appendChild(poster);

    const content = document.createElement("div");
    content.className = "top-poster-content";
    const h = document.createElement("h3");
    h.textContent = review.title || item.title || "Sans titre";
    content.appendChild(h);

    const metaBits = [];
    const linkedYear = String(review?.releaseYear || item?.releaseYear || "").trim();
    if (linkedYear) metaBits.push(linkedYear);
    const linkedCreatorValue = creatorValueForCategory(review?.category || "", review) || String(item?.director || "").trim();
    if (linkedCreatorValue) metaBits.push(linkedCreatorValue);
    if (metaBits.length) {
      const meta = document.createElement("p");
      meta.className = "top-poster-meta";
      meta.textContent = metaBits.join(" - ");
      content.appendChild(meta);
    }

    if (item.comment) {
      const comment = document.createElement("p");
      comment.className = "top-poster-comment";
      comment.textContent = item.comment;
      content.appendChild(comment);
    }

    const linkedScore = Number.isFinite(Number(item?.note)) ? Number(item.note) : review.score;
    const linkedScoreText = itemScoreText(linkedScore);
    if (linkedScoreText) {
      const score = document.createElement("p");
      score.className = "score";
      score.textContent = linkedScoreText;
      content.appendChild(score);
    }

    link.appendChild(content);
    li.appendChild(link);
    return li;
  }

  const li = document.createElement("li");
  li.className = "top-item";
  const link = document.createElement("a");
  link.className = "top-review-link";
  link.href = `review.html?id=${encodeURIComponent(review.id)}`;

  const rank = document.createElement("span");
  rank.className = "top-item-rank";
  rank.textContent = String(index + 1);
  link.appendChild(rank);

  const poster = document.createElement("img");
  poster.className = "top-review-poster";
  poster.src = review.poster || review.cover || DEFAULT_POSTER;
  poster.alt = review.title || "Review";
  link.appendChild(poster);

  const content = document.createElement("div");
  content.className = "top-review-content";
  const h = document.createElement("h3");
  const detailParts = [review.title || item.title || "Sans titre"];
  const linkedYear = String(review?.releaseYear || item?.releaseYear || "").trim();
  if (linkedYear) detailParts.push(linkedYear);
  const linkedCreatorValue = creatorValueForCategory(review?.category || "", review) || String(item?.director || "").trim();
  if (linkedCreatorValue) detailParts.push(linkedCreatorValue);
  h.innerHTML = `<strong>${escapeHtml(detailParts[0])}</strong>${detailParts.length > 1 ? ` | ${escapeHtml(detailParts.slice(1).join(" | "))}` : ""}`;
  content.appendChild(h);

  if (item.comment) {
    const comment = document.createElement("p");
    comment.className = "top-review-comment";
    comment.textContent = item.comment;
    content.appendChild(comment);
  }

  const linkedScore = Number.isFinite(Number(item?.note)) ? Number(item.note) : review.score;
  const linkedScoreText = itemScoreText(linkedScore);
  if (linkedScoreText) {
    const score = document.createElement("p");
    score.className = "score";
    score.textContent = linkedScoreText;
    content.appendChild(score);
  }

  link.appendChild(content);
  li.appendChild(link);
  return li;
}

function renderManualItem(item, index, topCategory = "") {
  if (selectedTopItemsView === "poster") {
    const li = document.createElement("li");
    li.className = "top-item top-item-poster";
    const wrapper = document.createElement("div");
    wrapper.className = "top-poster-card top-poster-card-static";

    const rank = document.createElement("span");
    rank.className = "top-poster-rank";
    rank.textContent = String(index + 1);
    wrapper.appendChild(rank);

    const poster = document.createElement("img");
    poster.className = "top-poster-image";
    poster.src = item.poster || DEFAULT_POSTER;
    poster.alt = item.title || "Media";
    wrapper.appendChild(poster);

    const content = document.createElement("div");
    content.className = "top-poster-content";
    const h = document.createElement("h3");
    h.textContent = item.title || "Sans titre";
    content.appendChild(h);

    const metaBits = [];
    const manualYear = String(item?.releaseYear || "").trim();
    if (manualYear) metaBits.push(manualYear);
    const manualCreatorValue = String(item?.director || "").trim();
    if (manualCreatorValue) metaBits.push(manualCreatorValue);
    if (metaBits.length) {
      const meta = document.createElement("p");
      meta.className = "top-poster-meta";
      meta.textContent = metaBits.join(" - ");
      content.appendChild(meta);
    }

    if (item.comment) {
      const comment = document.createElement("p");
      comment.className = "top-poster-comment";
      comment.textContent = item.comment;
      content.appendChild(comment);
    }

    const manualScoreText = itemScoreText(item?.note);
    if (manualScoreText) {
      const score = document.createElement("p");
      score.className = "score";
      score.textContent = manualScoreText;
      content.appendChild(score);
    }

    wrapper.appendChild(content);
    li.appendChild(wrapper);
    return li;
  }

  const li = document.createElement("li");
  li.className = "top-item";
  const wrapper = document.createElement("div");
  wrapper.className = "top-review-link top-manual-entry";

  const rank = document.createElement("span");
  rank.className = "top-item-rank";
  rank.textContent = String(index + 1);
  wrapper.appendChild(rank);

  const poster = document.createElement("img");
  poster.className = "top-review-poster";
  poster.src = item.poster || DEFAULT_POSTER;
  poster.alt = item.title || "Media";
  wrapper.appendChild(poster);

  const content = document.createElement("div");
  content.className = "top-review-content";
  const h = document.createElement("h3");
  const detailParts = [item.title || "Sans titre"];
  const manualYear = String(item?.releaseYear || "").trim();
  if (manualYear) detailParts.push(manualYear);
  const manualCreatorValue = String(item?.director || "").trim();
  if (manualCreatorValue) detailParts.push(manualCreatorValue);
  h.innerHTML = `<strong>${escapeHtml(detailParts[0])}</strong>${detailParts.length > 1 ? ` | ${escapeHtml(detailParts.slice(1).join(" | "))}` : ""}`;
  content.appendChild(h);

  if (item.comment) {
    const p = document.createElement("p");
    p.className = "top-review-comment";
    p.textContent = item.comment;
    content.appendChild(p);
  }

  const manualScoreText = itemScoreText(item?.note);
  if (manualScoreText) {
    const score = document.createElement("p");
    score.className = "score";
    score.textContent = manualScoreText;
    content.appendChild(score);
  }
  wrapper.appendChild(content);
  li.appendChild(wrapper);
  return li;
}

function renderTopItems(top, reviewMap) {
  if (!list) return;
  list.innerHTML = "";
  renderTopItemsViewButtons();
  (top?.items || []).forEach((item, index) => {
    const linkedReview = item.reviewId ? reviewMap.get(item.reviewId) : null;
    if (linkedReview) {
      list.appendChild(renderLinkedReviewItem(item, index, linkedReview));
      return;
    }
    list.appendChild(renderManualItem(item, index, top?.category || ""));
  });
  if (!list.innerHTML) {
    list.innerHTML = "<li class='top-item'><p>Aucun item.</p></li>";
  }
}

async function loadTop() {
  if (!id) {
    window.location.href = "tops.html";
    return;
  }

  let top;
  try {
    top = await window.ReviewsStore.getTopById(id);
  } catch {
    window.location.href = "tops.html";
    return;
  }

  loadedTop = top;
  document.title = `SuperSite - Top - ${top.title || "Sans titre"}`;
  title.textContent = top.title || "Sans titre";
  category.textContent = window.ReviewsStore.categories[top.category] || top.category || "Autre";
  subtitle.textContent = top.subtitle || "";

  const reviewMap = new Map();
  try {
    const allReviews = await window.ReviewsStore.getAll({ status: "published" });
    allReviews.forEach((review) => reviewMap.set(review.id, review));
  } catch {
    // On continue sans liaison.
  }

  if (cover) {
    let topCover = top.cover || "";
    if (!topCover && Array.isArray(top.items) && top.items.length) {
      const first = top.items[0];
      const linked = first?.reviewId ? reviewMap.get(first.reviewId) : null;
      topCover = linked?.cover || linked?.poster || first?.cover || first?.poster || "";
    }
    loadedTopCoverUrl = topCover || "";
    cover.src = topCover || DEFAULT_COVER;
  }

  if (topDate) {
    topDate.innerHTML = `Publié le ${fmtDateFromTimestamp(top.updatedAt)}${top.ownerUsername ? ` - ${ownerBadge(top.ownerUsername)}` : ""}`;
  }
  const avg = computeTopAverageScore(top, reviewMap);
  renderTopDetails(top, avg);
  renderTopQuickActions(top);
  loadedReviewMap = reviewMap;
  renderTopItems(top, reviewMap);
}

if (window.ReviewsStore?.onAuthChanged) {
  window.ReviewsStore.onAuthChanged(() => {
    if (loadedTop) renderTopQuickActions(loadedTop);
  });
}

if (topViewDetailsBtn) {
  topViewDetailsBtn.addEventListener("click", () => {
    if (selectedTopItemsView === "details") return;
    selectedTopItemsView = "details";
    syncTopItemsViewToUrl();
    if (loadedTop) renderTopItems(loadedTop, loadedReviewMap);
  });
}

if (topViewPosterBtn) {
  topViewPosterBtn.addEventListener("click", () => {
    if (selectedTopItemsView === "poster") return;
    selectedTopItemsView = "poster";
    syncTopItemsViewToUrl();
    if (loadedTop) renderTopItems(loadedTop, loadedReviewMap);
  });
}

applyTopItemsViewFromUrl();
renderTopItemsViewButtons();
if (topDiscordShareBtn) {
  topDiscordShareBtn.addEventListener("click", () => {
    if (!loadedTop) return;
    shareTopToDiscord(loadedTop);
  });
}
loadTop();

