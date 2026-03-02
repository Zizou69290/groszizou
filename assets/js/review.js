const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const DEFAULT_COVER = "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'><defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#1a2a36'/><stop offset='1' stop-color='#243b4a'/></linearGradient></defs><rect width='1200' height='630' fill='url(#g)'/><text x='50%' y='50%' text-anchor='middle' fill='#b8c2cc' font-size='54' font-family='Arial, sans-serif'>Sans cover</text></svg>");

const title = document.getElementById("review-title");
const category = document.getElementById("review-category");
const summary = document.getElementById("review-summary");
const date = document.getElementById("review-date");
const score = document.getElementById("review-score");
const cover = document.getElementById("review-cover");
const content = document.getElementById("review-content");
const tags = document.getElementById("review-tags");

const fmtDate = (iso) => {
  if (!iso || !iso.includes("-")) return "Date libre";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

function scoreToStars(value) {
  if (!Number.isFinite(value)) return "☆☆☆☆☆";
  const full = Math.max(0, Math.min(5, Math.round(value / 2)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function renderBlock(block) {
  const wrapper = document.createElement("div");
  wrapper.className = "media-item";

  if (block.type === "text") {
    wrapper.className = "review-text-block";
    const p = document.createElement("p");
    p.textContent = block.content || "";
    wrapper.appendChild(p);
    return block.content ? wrapper : null;
  }

  if (block.type === "image") {
    wrapper.innerHTML = `<img src="${block.url}" alt="${block.caption || "image"}" />`;
  }

  if (block.type === "video") {
    wrapper.innerHTML = `<video controls src="${block.url}"></video>`;
  }

  if (block.type === "video-embed") {
    wrapper.innerHTML = `<div class="video-wrap"><iframe src="${block.url}" title="video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
  }

  if (block.type === "audio") {
    wrapper.innerHTML = `<audio controls src="${block.url}"></audio>`;
  }

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
  date.textContent = `Publié le ${fmtDate(item.date)}`;
  score.textContent = Number.isFinite(item.score) ? `${scoreToStars(item.score)} (${item.score}/10)` : "☆☆☆☆☆";
  cover.src = item.cover || DEFAULT_COVER;
  cover.alt = item.title || "Review";

  document.documentElement.style.setProperty("--accent", item.accent || "#f25f29");

  content.innerHTML = "";
  const blocks = Array.isArray(item.blocks) ? item.blocks : [];
  if (!blocks.length) {
    content.innerHTML = "<p>Aucun contenu détaillé.</p>";
  } else {
    blocks.forEach((block) => {
      const node = renderBlock(block);
      if (node) content.appendChild(node);
    });
  }

  tags.innerHTML = "";
  (item.tags || []).forEach((tag) => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = tag;
    tags.appendChild(span);
  });
  if (!tags.innerHTML) {
    tags.innerHTML = "<span class='tag'>sans-tag</span>";
  }
}

loadReview();
