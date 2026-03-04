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
const articleMeta = document.querySelector(".article-meta");
const coverBg = document.getElementById("review-cover-bg");
const details = document.getElementById("review-details");
const content = document.getElementById("review-content");
const articleHero = document.querySelector(".article-hero-covered");
const linkActions = document.getElementById("review-link-actions");
const editLink = document.getElementById("review-edit-link");
const audioControls = document.getElementById("review-audio-controls");
const audioToggleBtn = document.getElementById("review-audio-toggle");
const audioProgressInput = document.getElementById("review-audio-progress");
const audioVolumeInput = document.getElementById("review-audio-volume");
let loadedReview = null;
let backgroundAudio = null;

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

function ownerBadge(username) {
  if (!username) return "";
  return `<span class="owner-badge"><span>${escapeHtml(username)}</span></span>`;
}

function isAdminUser(user) {
  return String(user?.username || "").trim().toLowerCase() === "admin";
}

function renderQuickActions(item) {
  if (!linkActions || !editLink) return;
  const currentUser = window.ReviewsStore?.getCurrentUser?.() || null;
  const canEdit = Boolean(
    item &&
    currentUser &&
    (isAdminUser(currentUser) || (item.ownerId && item.ownerId === currentUser.uid))
  );
  const links = Array.isArray(item?.externalLinks)
    ? item.externalLinks
      .map((entry) => ({
        label: String(entry?.label || "").trim(),
        url: String(entry?.url || "").trim()
      }))
      .filter((entry) => entry.label && entry.url)
    : [];

  linkActions.innerHTML = "";
  links.forEach((entry) => {
    const a = document.createElement("a");
    a.className = "action-btn secondary";
    a.href = entry.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = entry.label;
    linkActions.appendChild(a);
  });

  if (canEdit) {
    editLink.href = `modifier.html?edit=${encodeURIComponent(item.id)}`;
    editLink.classList.remove("hidden");
  } else {
    editLink.classList.add("hidden");
  }

  linkActions.classList.toggle("hidden", !linkActions.children.length);
  refreshHeroInfoLayout();
  alignAudioControlsToLastInfo();
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
    refreshHeroInfoLayout();
    alignAudioControlsToLastInfo();
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
  refreshHeroInfoLayout();
  alignAudioControlsToLastInfo();
}

function refreshHeroInfoLayout() {
  if (!articleHero) return;
  const hasDetails = Boolean(details && !details.classList.contains("hidden") && details.children.length);
  const hasQuickActions = Boolean(linkActions && !linkActions.classList.contains("hidden") && linkActions.children.length);
  articleHero.classList.toggle("has-extra-info", hasDetails || hasQuickActions);
}

function renderRichText(text) {
  let html = escapeHtml(text);
  const codeBlocks = [];
  html = html.replace(/\[code\]([\s\S]*?)\[\/code\]/gi, (_, code) => {
    const token = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre class="forum-code"><code>${code}</code></pre>`);
    return token;
  });
  html = html.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, "<strong>$1</strong>");
  html = html.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, "<em>$1</em>");
  html = html.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<span class="u-text">$1</span>');
  html = html.replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<span style="text-decoration:line-through">$1</span>');
  html = html.replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, '<blockquote class="forum-quote">$1</blockquote>');
  html = html.replace(/\[left\]([\s\S]*?)\[\/left\]/gi, '<div style="text-align:left">$1</div>');
  html = html.replace(/\[center\]([\s\S]*?)\[\/center\]/gi, '<div style="text-align:center">$1</div>');
  html = html.replace(/\[right\]([\s\S]*?)\[\/right\]/gi, '<div style="text-align:right">$1</div>');
  html = html.replace(/\[justify\]([\s\S]*?)\[\/justify\]/gi, '<div style="text-align:justify">$1</div>');
  html = html.replace(/\[color=(#[0-9a-f]{3,8})\]([\s\S]*?)\[\/color\]/gi, '<span style="color:$1">$2</span>');
  html = html.replace(/\[size=(\d{1,2})\]([\s\S]*?)\[\/size\]/gi, '<span style="font-size:$1px">$2</span>');
  html = html.replace(/\[mark=(#[0-9a-f]{3,8})\]([\s\S]*?)\[\/mark\]/gi, '<span style="background-color:$1;padding:0 .15em">$2</span>');
  html = html.replace(
    /\[url=(https?:\/\/[^\]\s]+)\]([\s\S]*?)\[\/url\]/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>'
  );
  html = html.replace(
    /\[url\](https?:\/\/[^\[]+)\[\/url\]/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  html = html.replace(/\[img\](https?:\/\/[^\[]+)\[\/img\]/gi, '<img src="$1" alt="image" />');
  html = html.replace(/\[hr\]/gi, "<hr>");
  html = html.replace(/\[list\]([\s\S]*?)\[\/list\]/gi, (_, inner) => {
    const items = String(inner || "")
      .split(/\[\*\]/i)
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length ? `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>` : "";
  });
  html = html.replace(/\[list=1\]([\s\S]*?)\[\/list\]/gi, (_, inner) => {
    const items = String(inner || "")
      .split(/\[\*\]/i)
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length ? `<ol>${items.map((item) => `<li>${item}</li>`).join("")}</ol>` : "";
  });
  html = html.replace(/\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi, '<button class="spoiler-text" type="button">$1</button>');
  html = html.replace(/\n/g, "<br>");
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`__CODE_BLOCK_${idx}__`, block);
  });
  return html;
}

function bindSpoilers(root) {
  root.querySelectorAll(".spoiler-text").forEach((btn) => {
    btn.addEventListener("click", () => btn.classList.toggle("revealed"));
  });
}

function normalizeYouTubeEmbed(url) {
  try {
    const u = new URL(url);
    const host = String(u.hostname || "").toLowerCase();
    const path = String(u.pathname || "");
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      if (u.searchParams.get("v")) {
        return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
      }
      if (host.includes("youtu.be")) {
        return `https://www.youtube.com/embed/${path.replace("/", "")}`;
      }
      if (path.startsWith("/shorts/")) {
        const id = path.split("/")[2] || "";
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (path.startsWith("/embed/")) {
        return `https://www.youtube.com/embed/${path.split("/")[2] || ""}`;
      }
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
  if (block.type === "video") {
    const embedUrl = normalizeYouTubeEmbed(block.url || "");
    if (embedUrl.includes("youtube.com/embed/")) {
      wrapper.innerHTML = `<div class="video-wrap"><iframe src="${embedUrl}" title="video" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
    } else {
      wrapper.innerHTML = `<video controls src="${block.url}"></video>`;
    }
  }
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

function teardownBackgroundAudio() {
  if (backgroundAudio) {
    backgroundAudio.pause();
    backgroundAudio.src = "";
    backgroundAudio = null;
  }
}

function alignAudioControlsToLastInfo() {
  if (!audioControls || !articleHero || audioControls.classList.contains("hidden")) return;
  const candidates = [linkActions, details, articleMeta].filter(
    (el) => el && !el.classList.contains("hidden") && (el.children?.length || el.textContent?.trim())
  );
  const anchor = candidates[0] || articleMeta;
  if (!anchor) return;

  const heroRect = articleHero.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  const controlsRect = audioControls.getBoundingClientRect();
  const anchorCenterY = anchorRect.top + anchorRect.height / 2 - heroRect.top;
  const nextTop = anchorCenterY - controlsRect.height / 2;
  const clampedTop = Math.max(10, Math.min(heroRect.height - controlsRect.height - 10, nextTop));

  audioControls.style.top = `${clampedTop}px`;
  audioControls.style.bottom = "auto";
}

function setupBackgroundAudio(item) {
  if (!audioControls || !audioToggleBtn || !audioVolumeInput || !audioProgressInput) return;
  teardownBackgroundAudio();

  const rawUrl = String(item?.bgMusic || "").trim();
  if (!rawUrl) {
    audioControls.classList.add("hidden");
    return;
  }

  const audio = new Audio(rawUrl);
  audio.preload = "auto";
  audio.loop = true;
  audio.volume = Math.max(0, Math.min(1, Number(audioVolumeInput.value || 45) / 100));
  backgroundAudio = audio;
  let seeking = false;

  const syncToggle = () => {
    audioToggleBtn.textContent = audio.paused ? "\u25B6" : "\u275A\u275A";
    audioToggleBtn.title = audio.paused ? "Lecture" : "Pause";
  };

  const tryAutoPlay = async () => {
    try {
      await audio.play();
    } catch {
      // Autoplay can be blocked by browser policy until user interaction.
    }
    syncToggle();
  };

  audioControls.classList.remove("hidden");
  requestAnimationFrame(alignAudioControlsToLastInfo);
  audioToggleBtn.onclick = async () => {
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        // Ignore and keep current UI state.
      }
    } else {
      audio.pause();
    }
    syncToggle();
  };
  audioVolumeInput.oninput = () => {
    audio.volume = Math.max(0, Math.min(1, Number(audioVolumeInput.value || 45) / 100));
  };
  audioProgressInput.value = "0";
  audioProgressInput.oninput = () => {
    seeking = true;
  };
  audioProgressInput.onchange = () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      seeking = false;
      return;
    }
    const ratio = Math.max(0, Math.min(100, Number(audioProgressInput.value || 0))) / 100;
    audio.currentTime = ratio * audio.duration;
    seeking = false;
  };

  audio.addEventListener("play", syncToggle);
  audio.addEventListener("pause", syncToggle);
  audio.addEventListener("timeupdate", () => {
    if (seeking) return;
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const ratio = (audio.currentTime / audio.duration) * 100;
    audioProgressInput.value = String(Math.max(0, Math.min(100, ratio)));
  });
  audio.addEventListener("ended", () => {
    audioProgressInput.value = "0";
  });
  syncToggle();
  tryAutoPlay();
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

  loadedReview = item;
  document.title = `SuperSite - Review - ${item.title || "Sans titre"}`;
  title.textContent = item.title || "Sans titre";
  category.textContent = window.ReviewsStore.categories[item.category] || item.category || "Review";
  summary.textContent = item.summary || "Aucun résumé.";
  date.innerHTML = `Publié le ${fmtDate(item.date)}${item.ownerUsername ? ` · ${ownerBadge(item.ownerUsername)}` : ""}`;
  score.textContent = Number.isFinite(item.score) ? `${scoreToStars(item.score)} (${item.score}/10)` : "☆☆☆☆☆";
  if (coverBg) coverBg.src = item.cover || DEFAULT_COVER;
  setupBackgroundAudio(item);
  renderDetails(item);
  renderQuickActions(item);
  alignAudioControlsToLastInfo();
  document.documentElement.style.setProperty("--accent", item.accent || "#f25f29");

  content.innerHTML = "";
  if ((item.contentMode === "rich" || item.bodyHtml) && String(item.bodyHtml || "").trim()) {
    content.classList.add("rich-content");
    content.innerHTML = item.bodyHtml;
    bindSpoilers(content);
    return;
  }
  content.classList.remove("rich-content");

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

if (window.ReviewsStore?.onAuthChanged) {
  window.ReviewsStore.onAuthChanged(() => {
    if (loadedReview) renderQuickActions(loadedReview);
  });
}

window.addEventListener("resize", () => {
  alignAudioControlsToLastInfo();
});

loadReview();
