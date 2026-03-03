const params = new URLSearchParams(window.location.search);
const id = params.get("id");
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

const title = document.getElementById("review-title");
const category = document.getElementById("review-category");
const summary = document.getElementById("review-summary");
const date = document.getElementById("review-date");
const score = document.getElementById("review-score");
const coverBg = document.getElementById("review-cover-bg");
const details = document.getElementById("review-details");
const content = document.getElementById("review-content");
const articleHero = document.querySelector(".article-hero-covered");

const fmtDate = (iso) => {
  if (!iso || !iso.includes("-")) return "Date libre";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

const escapeHtml = (text) =>
  String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function ownerBadge(username, avatarUrl) {
  if (!username) return "";
  const avatar = avatarUrl
    ? `<img class="owner-avatar" src="${escapeHtml(avatarUrl)}" alt="Profil de ${escapeHtml(username)}" />`
    : `<span class="owner-avatar owner-avatar-fallback">@</span>`;
  return `<span class="owner-badge">${avatar}<span>@${escapeHtml(username)}</span></span>`;
}

function scoreToStars(value) {
  if (!Number.isFinite(value)) return "☆☆☆☆☆";
  const full = Math.max(0, Math.min(5, Math.round(value / 2)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function renderDetails(item) {
  if (!details) return;

  const entries = [
    { label: "Auteur", value: item.author },
    { label: "Réalisation", value: item.director },
    { label: "Studio / Développeur", value: item.studio },
    { label: "Année", value: item.releaseYear },
    { label: "Genre", value: item.genre }
  ].filter((entry) => String(entry.value || "").trim());

  details.innerHTML = "";
  if (!entries.length) {
    details.classList.add("hidden");
    if (articleHero) {
      articleHero.classList.remove("has-details");
      articleHero.classList.add("no-details");
    }
    return;
  }

  entries.forEach((entry) => {
    const node = document.createElement("span");
    node.className = "review-detail";
    node.innerHTML = `<strong>${escapeHtml(entry.label)} :</strong> ${escapeHtml(entry.value)}`;
    details.appendChild(node);
  });

  details.classList.remove("hidden");
  if (articleHero) {
    articleHero.classList.add("has-details");
    articleHero.classList.remove("no-details");
  }
}

function renderRichText(text) {
  let html = escapeHtml(text);
  html = html.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, "<strong>$1</strong>");
  html = html.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, "<em>$1</em>");
  html = html.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<span class="u-text">$1</span>');
  html = html.replace(/\[color=(#[0-9a-f]{3,8})\]([\s\S]*?)\[\/color\]/gi, '<span style="color:$1">$2</span>');
  html = html.replace(/\[size=(\d{1,2})\]([\s\S]*?)\[\/size\]/gi, '<span style="font-size:$1px">$2</span>');
  html = html.replace(/\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi, '<button class="spoiler-text" type="button">$1</button>');
  return html.replace(/\n/g, "<br>");
}

function bindSpoilers(root) {
  root.querySelectorAll(".spoiler-text").forEach((btn) => {
    btn.addEventListener("click", () => btn.classList.toggle("revealed"));
  });
}

function normalizeYouTubeEmbed(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${u.pathname.replace("/", "")}`;
    }
  } catch {
    return url;
  }
  return url;
}

function renderBlock(block) {
  const wrapper = document.createElement("div");
  wrapper.className = "media-item";

  if (block.type === "text") {
    wrapper.className = "review-text-block";
    const p = document.createElement("p");
    p.innerHTML = renderRichText(block.content || "");
    bindSpoilers(p);
    wrapper.appendChild(p);
    return block.content ? wrapper : null;
  }

  if (block.type === "image") wrapper.innerHTML = `<img src="${block.url}" alt="${escapeHtml(block.caption || "image")}" />`;
  if (block.type === "image-text-left" || block.type === "image-text-right") {
    wrapper.className = `media-item media-split ${block.type === "image-text-right" ? "reverse" : ""}`;
    const image = block.url ? `<img src="${block.url}" alt="${escapeHtml(block.caption || "image")}" />` : "";
    const text = block.content ? `<div class="media-split-text"><p>${renderRichText(block.content)}</p></div>` : "";
    wrapper.innerHTML = `<div class="media-split-image">${image}</div>${text}`;
    bindSpoilers(wrapper);
    return wrapper.innerHTML ? wrapper : null;
  }
  if (block.type === "two-images") {
    wrapper.className = "media-item media-two-images";
    const left = block.url
      ? `<figure><img src="${block.url}" alt="${escapeHtml(block.caption || "image")}" />${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ""}</figure>`
      : "";
    const right = block.url2
      ? `<figure><img src="${block.url2}" alt="${escapeHtml(block.caption2 || "image")}" />${block.caption2 ? `<figcaption>${escapeHtml(block.caption2)}</figcaption>` : ""}</figure>`
      : "";
    wrapper.innerHTML = `${left}${right}`;
    return wrapper.innerHTML ? wrapper : null;
  }
  if (block.type === "video") wrapper.innerHTML = `<video controls src="${block.url}"></video>`;
  if (block.type === "video-embed") {
    const embedUrl = normalizeYouTubeEmbed(block.url || "");
    wrapper.innerHTML = `<div class="video-wrap"><iframe src="${embedUrl}" title="video" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
  }
  if (block.type === "audio") wrapper.innerHTML = `<audio controls src="${block.url}"></audio>`;

  if (block.caption && block.type !== "text") {
    const cap = document.createElement("figcaption");
    cap.textContent = block.caption;
    wrapper.appendChild(cap);
  }
  return wrapper.innerHTML ? wrapper : null;
}

async function loadReview() {
  if (!id) {
    window.location.href = "index.html";
    return;
  }

  let item;
  try {
    item = await window.ReviewsStore.getById(id);
  } catch {
    window.location.href = "index.html";
    return;
  }

  document.title = `Review - ${item.title || "Sans titre"}`;
  title.textContent = item.title || "Sans titre";
  category.textContent = window.ReviewsStore.categories[item.category] || item.category || "Review";
  summary.textContent = item.summary || "Aucun résumé.";
  if (item.ownerId) {
    try {
      const profile = await window.ReviewsStore.getUserProfile(item.ownerId);
      item.ownerAvatar = profile?.avatarUrl || "";
    } catch {
      item.ownerAvatar = "";
    }
  }
  date.innerHTML = `Publié le ${fmtDate(item.date)}${item.ownerUsername ? ` · ${ownerBadge(item.ownerUsername, item.ownerAvatar)}` : ""}`;
  score.textContent = Number.isFinite(item.score) ? `${scoreToStars(item.score)} (${item.score}/10)` : "☆☆☆☆☆";
  if (coverBg) coverBg.src = item.cover || DEFAULT_COVER;
  renderDetails(item);
  document.documentElement.style.setProperty("--accent", item.accent || "#f25f29");

  content.innerHTML = "";
  if ((item.contentMode === "rich" || item.bodyHtml) && String(item.bodyHtml || "").trim()) {
    content.innerHTML = item.bodyHtml;
    bindSpoilers(content);
    return;
  }

  const blocks = Array.isArray(item.blocks) ? item.blocks : [];
  if (!blocks.length) {
    content.innerHTML = "<p>Aucun contenu detaille.</p>";
  } else {
    blocks.forEach((block) => {
      const node = renderBlock(block);
      if (node) content.appendChild(node);
    });
  }
}

loadReview();
