const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const DEFAULT_COVER = "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'><defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#1a2a36'/><stop offset='1' stop-color='#243b4a'/></linearGradient></defs><rect width='1200' height='630' fill='url(#g)'/><text x='50%' y='50%' text-anchor='middle' fill='#b8c2cc' font-size='54' font-family='Arial, sans-serif'>Sans cover</text></svg>");

const title = document.getElementById("review-title");
const category = document.getElementById("review-category");
const summary = document.getElementById("review-summary");
const date = document.getElementById("review-date");
const score = document.getElementById("review-score");
const cover = document.getElementById("review-cover");
const body = document.getElementById("review-body");
const tags = document.getElementById("review-tags");
const media = document.getElementById("review-media");

const fmtDate = (iso) => {
  if (!iso || !iso.includes("-")) return "Date libre";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

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
  summary.textContent = item.summary || "Aucun resume.";
  date.textContent = `Publie le ${fmtDate(item.date)}`;
  score.textContent = Number.isFinite(item.score) ? `Note: ${item.score}/10` : "Note: -";
  cover.src = item.cover || DEFAULT_COVER;
  cover.alt = item.title || "Review";

  document.documentElement.style.setProperty("--accent", item.accent || "#f25f29");

  body.innerHTML = (item.body || "")
    .split("\n\n")
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join("");
  if (!body.innerHTML) {
    body.innerHTML = "<p>Aucun texte detaille.</p>";
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

  media.innerHTML = "";
  (item.media || []).forEach((entry) => {
    const wrap = document.createElement("figure");
    wrap.className = "media-item";

    if (entry.type === "image") {
      wrap.innerHTML = `<img src="${entry.url}" alt="${entry.caption || item.title || "media"}" />`;
    }

    if (entry.type === "video") {
      wrap.innerHTML = `<video controls src="${entry.url}"></video>`;
    }

    if (entry.type === "video-embed") {
      wrap.innerHTML = `<div class="video-wrap"><iframe src="${entry.url}" title="video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }

    if (entry.type === "audio") {
      wrap.innerHTML = `<audio controls src="${entry.url}"></audio>`;
    }

    if (entry.caption) {
      const cap = document.createElement("figcaption");
      cap.textContent = entry.caption;
      wrap.appendChild(cap);
    }

    if (wrap.innerHTML) {
      media.appendChild(wrap);
    }
  });
}

loadReview();
