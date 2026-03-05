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
const year = document.getElementById("top-year");
const list = document.getElementById("top-items");
const cover = document.getElementById("top-cover");

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
  if (!Number.isFinite(score)) return "☆☆☆☆☆";
  const full = Math.max(0, Math.min(5, Math.round(score / 2)));
  return "★".repeat(full) + "☆".repeat(5 - full);
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

function renderLinkedReviewItem(item, index, review) {
  const li = document.createElement("li");
  li.className = "top-item";
  const link = document.createElement("a");
  link.className = "top-review-link";
  link.href = `review.html?id=${encodeURIComponent(review.id)}`;

  const poster = document.createElement("img");
  poster.className = "top-review-poster";
  poster.src = review.poster || review.cover || DEFAULT_POSTER;
  poster.alt = review.title || "Review";
  link.appendChild(poster);

  const content = document.createElement("div");
  content.className = "top-review-content";
  const h = document.createElement("h3");
  h.textContent = `${index + 1}. ${review.title || item.title || "Sans titre"}`;
  content.appendChild(h);

  const meta = document.createElement("p");
  meta.className = "top-review-meta";
  meta.textContent = window.ReviewsStore.categories[review.category] || review.category || "Autre";
  content.appendChild(meta);

  const score = document.createElement("p");
  score.className = "score";
  score.textContent = `${scoreToStars(review.score)}${Number.isFinite(review.score) ? ` (${review.score}/10)` : ""}`;
  content.appendChild(score);

  if (item.comment) {
    const comment = document.createElement("p");
    comment.className = "top-review-comment";
    comment.textContent = item.comment;
    content.appendChild(comment);
  }

  link.appendChild(content);
  li.appendChild(link);
  return li;
}

function renderManualItem(item, index) {
  const li = document.createElement("li");
  li.className = "top-item";
  const h = document.createElement("h3");
  h.textContent = `${index + 1}. ${item.title || "Sans titre"}`;
  li.appendChild(h);
  if (item.comment) {
    const p = document.createElement("p");
    p.textContent = item.comment;
    li.appendChild(p);
  }
  return li;
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

  document.title = `SuperSite - Top - ${top.title || "Sans titre"}`;
  title.textContent = top.title || "Sans titre";
  category.textContent = window.ReviewsStore.categories[top.category] || top.category || "Autre";
  subtitle.textContent = top.subtitle || "";
  year.innerHTML = `${top.year ? `Période : ${escapeHtml(top.year)}` : ""}${top.ownerUsername ? `${top.year ? " · " : ""}${ownerBadge(top.ownerUsername)}` : ""}`;

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
      topCover = linked?.cover || linked?.poster || "";
    }
    cover.src = topCover || DEFAULT_COVER;
    cover.alt = top.title || "Top";
  }

  list.innerHTML = "";
  (top.items || []).forEach((item, index) => {
    const linkedReview = item.reviewId ? reviewMap.get(item.reviewId) : null;
    if (linkedReview) {
      list.appendChild(renderLinkedReviewItem(item, index, linkedReview));
      return;
    }
    list.appendChild(renderManualItem(item, index));
  });

  if (!list.innerHTML) {
    list.innerHTML = "<li class='top-item'><p>Aucun item.</p></li>";
  }
}

loadTop();
