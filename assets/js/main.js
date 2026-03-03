const menuToggle = document.getElementById("menu-toggle");
const menu = document.getElementById("menu");

if (menuToggle && menu) {
  menuToggle.addEventListener("click", () => {
    menu.classList.toggle("open");
  });
}

const reviewsGrid = document.getElementById("reviews-grid");
const managerSection = document.getElementById("manager");
const managerList = document.getElementById("manager-list");
const form = document.getElementById("review-form");
const formTitle = document.getElementById("form-title");
const addBtn = document.getElementById("new-review");
const cancelBtn = document.getElementById("cancel-form");
const blocksList = document.getElementById("blocks-list");
const addBlockButtons = document.querySelectorAll("[data-add-block]");
const previewBox = document.getElementById("review-preview");
const filterButtonsHost = document.querySelector(".filters");

const topList = document.getElementById("tops-manager-list");
const topForm = document.getElementById("top-form");
const topFormTitle = document.getElementById("top-form-title");
const newTopBtn = document.getElementById("new-top");
const cancelTopBtn = document.getElementById("cancel-top-form");
const addTopItemBtn = document.getElementById("add-top-item");
const topItemsList = document.getElementById("top-items-list");

const authUsername = document.getElementById("auth-username");
const authPassword = document.getElementById("auth-password");
const loginBtn = document.getElementById("auth-login");
const registerBtn = document.getElementById("auth-register");
const logoutBtn = document.getElementById("auth-logout");
const authStatus = document.getElementById("auth-status");

const toolColor = document.getElementById("tool-color");
const toolColorApply = document.getElementById("tool-color-apply");
const toolSize = document.getElementById("tool-size");
const toolSizeApply = document.getElementById("tool-size-apply");
const wrapToolButtons = document.querySelectorAll("[data-wrap-tag]");
const contentModeButtons = document.querySelectorAll("[data-content-mode]");
const blocksEditorSection = document.getElementById("blocks-editor-section");
const richEditorSection = document.getElementById("rich-editor-section");
const richEditor = document.getElementById("rich-editor");
const richCmdButtons = document.querySelectorAll("[data-rich-cmd]");
const richLinkBtn = document.getElementById("rich-link-btn");
const richImageBtn = document.getElementById("rich-image-btn");
const richVideoBtn = document.getElementById("rich-video-btn");
const richAudioBtn = document.getElementById("rich-audio-btn");
const richColsBtn = document.getElementById("rich-cols-btn");
const reviewBodyHtml = document.getElementById("review-body-html");
const metaAuthorRow = document.getElementById("meta-author-row");
const metaDirectorRow = document.getElementById("meta-director-row");
const metaStudioRow = document.getElementById("meta-studio-row");

const DEFAULT_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'><defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#1a2a36'/><stop offset='1' stop-color='#243b4a'/></linearGradient></defs><rect width='1200' height='630' fill='url(#g)'/><text x='50%' y='50%' text-anchor='middle' fill='#b8c2cc' font-size='54' font-family='Arial, sans-serif'>Sans cover</text></svg>"
  );

let selectedFilter = "all";
let editingId = null;
let editingTopId = null;
let cachedReviews = [];
let activeTextArea = null;
let editingAccent = "";
let currentContentMode = "blocks";
let currentUser = null;

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
    btn.addEventListener("click", () => {
      btn.classList.toggle("revealed");
    });
  });
}

function wrapSelection(openTag, closeTag) {
  if (!activeTextArea) return;
  const start = activeTextArea.selectionStart ?? 0;
  const end = activeTextArea.selectionEnd ?? 0;
  const value = activeTextArea.value;
  const selected = value.slice(start, end);
  const next = `${value.slice(0, start)}${openTag}${selected}${closeTag}${value.slice(end)}`;
  activeTextArea.value = next;
  activeTextArea.focus();
  activeTextArea.selectionStart = start + openTag.length;
  activeTextArea.selectionEnd = end + openTag.length;
  activeTextArea.dispatchEvent(new Event("input", { bubbles: true }));
}

function scoreToStars(score) {
  if (!Number.isFinite(score)) return "☆☆☆☆☆";
  const full = Math.max(0, Math.min(5, Math.round(score / 2)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function reviewCard(item) {
  const article = document.createElement("article");
  article.className = "review-card";
  article.dataset.type = item.category;
  article.tabIndex = 0;
  article.setAttribute("role", "link");
  const accent = item.accent || "#f25f29";
  const target = `review.html?id=${encodeURIComponent(item.id)}`;

  const ownerMeta = item.ownerUsername ? ` &middot; @${escapeHtml(item.ownerUsername)}` : "";
  article.innerHTML = `
    <img src="${item.cover || DEFAULT_COVER}" alt="${escapeHtml(item.title || "Review")}" />
    <div class="card-body">
      <p class="meta">${window.ReviewsStore.categories[item.category] || item.category} &middot; ${fmtDate(item.date)}${ownerMeta}</p>
      <h3>${escapeHtml(item.title || "Sans titre")}</h3>
      <p>${escapeHtml(item.summary || "Aucun résumé.")}</p>
      <div class="card-footer">
        <span class="score" style="color:${accent}">${scoreToStars(item.score)}${Number.isFinite(item.score) ? ` (${item.score}/10)` : ""}</span>
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

function managerRow(item) {
  const row = document.createElement("div");
  row.className = "manager-row";
  const ownerMeta = item.ownerUsername ? ` &middot; @${escapeHtml(item.ownerUsername)}` : "";
  row.innerHTML = `
    <div>
      <strong>${escapeHtml(item.title || "Sans titre")}</strong>
      <span>${window.ReviewsStore.categories[item.category] || item.category} &middot; ${fmtDate(item.date)}${ownerMeta}</span>
    </div>
    <div class="row-actions">
      <button class="action-btn secondary" data-action="edit">Éditer</button>
      <button class="action-btn danger" data-action="delete">Supprimer</button>
    </div>
  `;

  row.querySelector('[data-action="edit"]').addEventListener("click", () => openForm(item));
  row.querySelector('[data-action="delete"]').addEventListener("click", async () => {
    if (!window.confirm(`Supprimer "${item.title || "Sans titre"}" ?`)) return;
    try {
      await window.ReviewsStore.remove(item.id);
      await renderAll();
    } catch (error) {
      window.alert(`Suppression impossible : ${error.message}`);
    }
  });
  return row;
}

function topRow(item) {
  const row = document.createElement("div");
  row.className = "manager-row";
  const ownerMeta = item.ownerUsername ? ` &middot; @${escapeHtml(item.ownerUsername)}` : "";
  row.innerHTML = `
    <div>
      <strong>${escapeHtml(item.title || "Sans titre")}</strong>
      <span>${window.ReviewsStore.categories[item.category] || item.category || "Autre"}${item.year ? ` &middot; ${item.year}` : ""}${ownerMeta}</span>
    </div>
    <div class="row-actions">
      <button class="action-btn secondary" data-action="edit-top">Éditer</button>
      <button class="action-btn danger" data-action="delete-top">Supprimer</button>
    </div>
  `;

  row.querySelector('[data-action="edit-top"]').addEventListener("click", () => openTopForm(item));
  row.querySelector('[data-action="delete-top"]').addEventListener("click", async () => {
    if (!window.confirm(`Supprimer le top "${item.title || "Sans titre"}" ?`)) return;
    try {
      await window.ReviewsStore.removeTop(item.id);
      await renderTopsManager();
    } catch (error) {
      window.alert(`Suppression impossible : ${error.message}`);
    }
  });
  return row;
}

function updateBlockIndex() {
  if (!blocksList) return;
  [...blocksList.querySelectorAll(".block-item")].forEach((row, idx) => {
    const index = row.querySelector(".block-index");
    if (index) index.textContent = `Bloc ${idx + 1}`;
  });
}

function getBlockFieldsHtml(type, block) {
  if (type === "text") {
    return `<textarea class="block-content" rows="5" placeholder="Ton texte...">${escapeHtml(block.content || "")}</textarea>`;
  }
  if (type === "image-text-left" || type === "image-text-right") {
    return `
      <input class="block-url" type="url" placeholder="URL image" value="${escapeHtml(block.url || "")}" />
      <input class="block-caption" type="text" placeholder="Légende image (optionnel)" value="${escapeHtml(block.caption || "")}" />
      <textarea class="block-content" rows="5" placeholder="Texte à côté de l'image...">${escapeHtml(block.content || "")}</textarea>
    `;
  }
  if (type === "two-images") {
    return `
      <input class="block-url" type="url" placeholder="URL image gauche" value="${escapeHtml(block.url || "")}" />
      <input class="block-caption" type="text" placeholder="Légende image gauche (optionnel)" value="${escapeHtml(block.caption || "")}" />
      <input class="block-url-2" type="url" placeholder="URL image droite" value="${escapeHtml(block.url2 || "")}" />
      <input class="block-caption-2" type="text" placeholder="Légende image droite (optionnel)" value="${escapeHtml(block.caption2 || "")}" />
    `;
  }
  return `
    <input class="block-url" type="url" placeholder="URL" value="${escapeHtml(block.url || "")}" />
    <input class="block-caption" type="text" placeholder="Légende (optionnel)" value="${escapeHtml(block.caption || "")}" />
  `;
}

function readBlocks() {
  if (!blocksList) return [];
  return [...blocksList.querySelectorAll(".block-item")]
    .map((row) => {
      const type = row.querySelector(".block-type").value;
      if (type === "text") {
        const content = row.querySelector(".block-content")?.value.trim() || "";
        return content ? { type, content, url: "", caption: "" } : null;
      }
      if (type === "image-text-left" || type === "image-text-right") {
        const url = row.querySelector(".block-url")?.value.trim() || "";
        const caption = row.querySelector(".block-caption")?.value.trim() || "";
        const content = row.querySelector(".block-content")?.value.trim() || "";
        return url || content ? { type, content, url, caption } : null;
      }
      if (type === "two-images") {
        const url = row.querySelector(".block-url")?.value.trim() || "";
        const caption = row.querySelector(".block-caption")?.value.trim() || "";
        const url2 = row.querySelector(".block-url-2")?.value.trim() || "";
        const caption2 = row.querySelector(".block-caption-2")?.value.trim() || "";
        return url || url2 ? { type, content: "", url, caption, url2, caption2 } : null;
      }
      const url = row.querySelector(".block-url")?.value.trim() || "";
      const caption = row.querySelector(".block-caption")?.value.trim() || "";
      return url ? { type, content: "", url, caption } : null;
    })
    .filter(Boolean);
}

function renderPreview() {
  if (!previewBox || !form) return;
  const title = form.elements.title.value.trim() || "Sans titre";
  const summary = form.elements.summary.value.trim() || "Aucun résumé.";
  const score = form.elements.score.value === "" ? null : Number(form.elements.score.value);
  const blocks = readBlocks();

  previewBox.innerHTML = "";
  const head = document.createElement("div");
  head.className = "preview-head";
  head.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${scoreToStars(score)}${Number.isFinite(score) ? ` (${score}/10)` : ""}</span>`;
  previewBox.appendChild(head);

  const summaryNode = document.createElement("p");
  summaryNode.className = "media-note";
  summaryNode.textContent = summary;
  previewBox.appendChild(summaryNode);

  const flow = document.createElement("div");
  flow.className = "preview-flow";

  if (currentContentMode === "rich") {
    const html = getRichHtml();
    if (!html) {
      const empty = document.createElement("p");
      empty.className = "media-note";
      empty.textContent = "Commence à rédiger pour voir le rendu.";
      flow.appendChild(empty);
    } else {
      const node = document.createElement("div");
      node.className = "preview-block rich-preview";
      node.innerHTML = html;
      bindSpoilers(node);
      flow.appendChild(node);
    }
    previewBox.appendChild(flow);
    return;
  }

  blocks.forEach((block) => {
    const node = document.createElement("div");
    node.className = "preview-block";
    if (block.type === "text") {
      node.innerHTML = renderRichText(block.content);
      bindSpoilers(node);
    } else if (block.type === "image-text-left" || block.type === "image-text-right") {
      node.textContent = `${block.type === "image-text-left" ? "IMAGE GAUCHE + TEXTE" : "TEXTE + IMAGE DROITE"} · ${block.url || "Sans image"}`;
    } else if (block.type === "two-images") {
      node.textContent = `2 IMAGES · ${block.url || "Sans image gauche"} | ${block.url2 || "Sans image droite"}`;
    } else {
      node.textContent = `${block.type.toUpperCase()} · ${block.url}`;
      if (block.caption) {
        const cap = document.createElement("small");
        cap.textContent = ` (${block.caption})`;
        node.appendChild(cap);
      }
    }
    flow.appendChild(node);
  });
  if (!blocks.length) {
    const empty = document.createElement("p");
    empty.className = "media-note";
    empty.textContent = "Ajoute des blocs pour voir le rendu.";
    flow.appendChild(empty);
  }
  previewBox.appendChild(flow);
}

function getRichHtml() {
  const html = richEditor?.innerHTML || reviewBodyHtml?.value || "";
  return String(html || "").trim();
}

function setRichHtml(html) {
  const value = String(html || "");
  if (richEditor) richEditor.innerHTML = value;
  if (reviewBodyHtml) reviewBodyHtml.value = value;
}

function normalizeYouTubeEmbed(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${u.pathname.replace("/", "")}`;
  } catch {
    return url;
  }
  return url;
}

function setContentMode(mode) {
  currentContentMode = mode === "rich" ? "rich" : "blocks";
  if (blocksEditorSection) blocksEditorSection.classList.toggle("hidden", currentContentMode !== "blocks");
  if (richEditorSection) richEditorSection.classList.toggle("hidden", currentContentMode !== "rich");
  contentModeButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.contentMode === currentContentMode));
  renderPreview();
}

function configureMetaFields(category) {
  if (!form) return;

  const show = (el, visible) => {
    if (!el) return;
    el.classList.toggle("hidden", !visible);
  };

  const authorLabel = metaAuthorRow?.childNodes?.[0];
  const directorLabel = metaDirectorRow?.childNodes?.[0];
  const studioLabel = metaStudioRow?.childNodes?.[0];

  if (category === "film" || category === "serie") {
    show(metaAuthorRow, false);
    show(metaStudioRow, false);
    show(metaDirectorRow, true);
    if (directorLabel) directorLabel.textContent = "Réalisation";
  } else if (category === "jeu") {
    show(metaAuthorRow, false);
    show(metaDirectorRow, false);
    show(metaStudioRow, true);
    if (studioLabel) studioLabel.textContent = "Studio de développement";
  } else if (category === "livre") {
    show(metaDirectorRow, false);
    show(metaStudioRow, false);
    show(metaAuthorRow, true);
    if (authorLabel) authorLabel.textContent = "Auteur";
  } else if (category === "musique") {
    show(metaDirectorRow, false);
    show(metaStudioRow, false);
    show(metaAuthorRow, true);
    if (authorLabel) authorLabel.textContent = "Artiste";
  } else {
    show(metaAuthorRow, true);
    show(metaDirectorRow, true);
    show(metaStudioRow, true);
    if (authorLabel) authorLabel.textContent = "Auteur / Artiste";
    if (directorLabel) directorLabel.textContent = "Réalisation";
    if (studioLabel) studioLabel.textContent = "Studio / Développeur";
  }
}

function createBlockRow(block = { type: "text", content: "", url: "", caption: "" }) {
  const row = document.createElement("div");
  row.className = "block-item";
  row.innerHTML = `
    <div class="block-head">
      <strong class="block-index">Bloc</strong>
      <select class="block-type">
        <option value="text">Texte</option>
        <option value="image">Image</option>
        <option value="image-text-left">Image gauche + Texte droite</option>
        <option value="image-text-right">Texte gauche + Image droite</option>
        <option value="two-images">2 images côte à côte</option>
        <option value="video">Vidéo</option>
        <option value="video-embed">Vidéo embed</option>
        <option value="audio">Audio</option>
      </select>
      <div class="row-actions">
        <button type="button" class="action-btn secondary block-up">&uarr;</button>
        <button type="button" class="action-btn secondary block-down">&darr;</button>
        <button type="button" class="action-btn danger block-delete">Supprimer</button>
      </div>
    </div>
    <div class="block-fields"></div>
  `;

  const typeSelect = row.querySelector(".block-type");
  const fields = row.querySelector(".block-fields");
  const renderFields = () => {
    fields.innerHTML = getBlockFieldsHtml(typeSelect.value, block);
    fields.querySelectorAll("input,textarea").forEach((el) => {
      el.addEventListener("input", renderPreview);
      if (el.classList.contains("block-content")) {
        el.addEventListener("focus", () => {
          activeTextArea = el;
        });
      }
    });
  };

  typeSelect.value = block.type || "text";
  renderFields();
  typeSelect.addEventListener("change", () => {
    block.type = typeSelect.value;
    renderFields();
    renderPreview();
  });
  row.querySelector(".block-delete").addEventListener("click", () => {
    row.remove();
    updateBlockIndex();
    renderPreview();
  });
  row.querySelector(".block-up").addEventListener("click", () => {
    const prev = row.previousElementSibling;
    if (prev && blocksList) {
      blocksList.insertBefore(row, prev);
      updateBlockIndex();
      renderPreview();
    }
  });
  row.querySelector(".block-down").addEventListener("click", () => {
    const next = row.nextElementSibling;
    if (next && blocksList) {
      blocksList.insertBefore(next, row);
      updateBlockIndex();
      renderPreview();
    }
  });
  return row;
}

function setBlocks(blocks) {
  if (!blocksList) return;
  blocksList.innerHTML = "";
  if (!Array.isArray(blocks) || !blocks.length) {
    blocksList.appendChild(createBlockRow({ type: "text", content: "" }));
  } else {
    blocks.forEach((block) => blocksList.appendChild(createBlockRow(block)));
  }
  updateBlockIndex();
  renderPreview();
}

function topReviewOptions(selectedId = "") {
  const options = [`<option value="">Aucune review liée</option>`];
  cachedReviews.forEach((review) => {
    const selected = review.id === selectedId ? " selected" : "";
    options.push(`<option value="${review.id}"${selected}>${escapeHtml(review.title || "Sans titre")}</option>`);
  });
  return options.join("");
}

function updateTopItemIndex() {
  if (!topItemsList) return;
  [...topItemsList.querySelectorAll(".block-item")].forEach((row, idx) => {
    const index = row.querySelector(".block-index");
    if (index) index.textContent = `Item ${idx + 1}`;
  });
}

function createTopItemRow(item = { title: "", comment: "", reviewId: "" }) {
  const row = document.createElement("div");
  row.className = "block-item";
  row.innerHTML = `
    <div class="block-head">
      <strong class="block-index">Item</strong>
      <div class="row-actions">
        <button type="button" class="action-btn secondary top-up">&uarr;</button>
        <button type="button" class="action-btn secondary top-down">&darr;</button>
        <button type="button" class="action-btn danger top-delete">Supprimer</button>
      </div>
    </div>
    <div class="block-fields">
      <label>Review liée (optionnel)
        <select class="top-review">${topReviewOptions(item.reviewId || "")}</select>
      </label>
      <input class="top-title" type="text" placeholder="Titre" value="${escapeHtml(item.title || "")}" />
      <input class="top-comment" type="text" placeholder="Commentaire (optionnel)" value="${escapeHtml(item.comment || "")}" />
    </div>
  `;

  const reviewSelect = row.querySelector(".top-review");
  const titleInput = row.querySelector(".top-title");
  reviewSelect.addEventListener("change", () => {
    const match = cachedReviews.find((r) => r.id === reviewSelect.value);
    if (match && !titleInput.value.trim()) {
      titleInput.value = match.title || "";
    }
  });
  row.querySelector(".top-delete").addEventListener("click", () => {
    row.remove();
    updateTopItemIndex();
  });
  row.querySelector(".top-up").addEventListener("click", () => {
    const prev = row.previousElementSibling;
    if (prev && topItemsList) {
      topItemsList.insertBefore(row, prev);
      updateTopItemIndex();
    }
  });
  row.querySelector(".top-down").addEventListener("click", () => {
    const next = row.nextElementSibling;
    if (next && topItemsList) {
      topItemsList.insertBefore(next, row);
      updateTopItemIndex();
    }
  });
  return row;
}

function setTopItems(items) {
  if (!topItemsList) return;
  topItemsList.innerHTML = "";
  if (!items || !items.length) {
    topItemsList.appendChild(createTopItemRow());
  } else {
    items.forEach((item) => topItemsList.appendChild(createTopItemRow(item)));
  }
  updateTopItemIndex();
}

function readTopItems() {
  if (!topItemsList) return [];
  return [...topItemsList.querySelectorAll(".block-item")]
    .map((row) => ({
      reviewId: row.querySelector(".top-review")?.value || "",
      title: row.querySelector(".top-title")?.value.trim() || "",
      comment: row.querySelector(".top-comment")?.value.trim() || ""
    }))
    .filter((item) => item.title || item.reviewId);
}

function buildFilterButtons(reviews) {
  if (!filterButtonsHost) return;
  const categories = [...new Set(reviews.map((r) => r.category).filter(Boolean))];
  if (selectedFilter !== "all" && !categories.includes(selectedFilter)) {
    selectedFilter = "all";
  }
  filterButtonsHost.innerHTML = `<button class="filter-btn${selectedFilter === "all" ? " active" : ""}" data-filter="all">Tout</button>`;
  categories.forEach((cat) => {
    const name = window.ReviewsStore.categories[cat] || cat;
    filterButtonsHost.insertAdjacentHTML(
      "beforeend",
      `<button class="filter-btn${selectedFilter === cat ? " active" : ""}" data-filter="${cat}">${name}</button>`
    );
  });
  filterButtonsHost.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      filterButtonsHost.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      selectedFilter = button.dataset.filter;
      await renderAll();
    });
  });
}

async function renderAll() {
  let reviews = [];
  try {
    const options = managerList ? { ownerId: currentUser?.uid || "__none__" } : {};
    reviews = await window.ReviewsStore.getAll(options);
  } catch (error) {
    if (reviewsGrid || managerList) window.alert(`Impossible de charger les reviews : ${error.message}`);
    return;
  }

  reviews.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  cachedReviews = reviews;
  buildFilterButtons(reviews);

  if (reviewsGrid) {
    reviewsGrid.innerHTML = "";
    reviews
      .filter((item) => selectedFilter === "all" || item.category === selectedFilter)
      .forEach((item) => reviewsGrid.appendChild(reviewCard(item)));
  }
  if (managerList) {
    managerList.innerHTML = "";
    reviews.forEach((item) => managerList.appendChild(managerRow(item)));
  }
}

async function renderTopsManager() {
  if (!topList) return;
  try {
    const tops = await window.ReviewsStore.getAllTops({ ownerId: currentUser?.uid || "__none__" });
    topList.innerHTML = "";
    tops.forEach((item) => topList.appendChild(topRow(item)));
  } catch (error) {
    window.alert(`Impossible de charger les tops : ${error.message}`);
  }
}

function openForm(item = null) {
  if (!form) return;
  editingId = item ? item.id : null;
  form.classList.remove("hidden");
  formTitle.textContent = item ? "Modifier la review" : "Ajouter une review";
  form.elements.title.value = item?.title || "";
  form.elements.category.value = item?.category || "jeu";
  form.elements.date.value = item?.date || "";
  form.elements.score.value = Number.isFinite(item?.score) ? String(item.score) : "";
  form.elements.cover.value = item?.cover || "";
  form.elements.poster.value = item?.poster || "";
  editingAccent = item?.accent || "";
  form.elements.summary.value = item?.summary || "";
  form.elements.author.value = item?.author || "";
  form.elements.director.value = item?.director || "";
  form.elements.studio.value = item?.studio || "";
  form.elements.releaseYear.value = item?.releaseYear || "";
  form.elements.genre.value = item?.genre || "";
  configureMetaFields(form.elements.category.value || "jeu");
  setRichHtml(item?.bodyHtml || "");
  const nextMode = item?.contentMode || (item?.bodyHtml ? "rich" : "blocks");
  setContentMode(nextMode);
  setBlocks(item?.blocks || []);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeForm() {
  if (!form) return;
  editingId = null;
  editingAccent = "";
  form.reset();
  form.classList.add("hidden");
  setContentMode("blocks");
  setRichHtml("");
  if (blocksList) blocksList.innerHTML = "";
  renderPreview();
}

function openTopForm(item = null) {
  if (!topForm) return;
  editingTopId = item ? item.id : null;
  topForm.classList.remove("hidden");
  topFormTitle.textContent = item ? "Modifier un top" : "Ajouter un top";
  topForm.elements.title.value = item?.title || "";
  topForm.elements.category.value = item?.category || "autre";
  topForm.elements.year.value = item?.year || "";
  topForm.elements.cover.value = item?.cover || "";
  topForm.elements.subtitle.value = item?.subtitle || "";
  setTopItems(item?.items || []);
  topForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeTopForm() {
  if (!topForm) return;
  editingTopId = null;
  topForm.reset();
  topForm.classList.add("hidden");
  if (topItemsList) topItemsList.innerHTML = "";
}

if (form) {
  form.elements.title.addEventListener("input", renderPreview);
  form.elements.score.addEventListener("input", renderPreview);
  form.elements.summary.addEventListener("input", renderPreview);
  form.elements.category.addEventListener("change", () => configureMetaFields(form.elements.category.value || "jeu"));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = form.elements.title.value.trim() || "Sans titre";
    const selectedCategory = form.elements.category.value || "jeu";
    const authorValue = form.elements.author.value.trim();
    const directorValue = form.elements.director.value.trim();
    const studioValue = form.elements.studio.value.trim();
    const payload = {
      id: editingId || window.ReviewsStore.slugify(title),
      title,
      category: selectedCategory,
      date: form.elements.date.value,
      score: form.elements.score.value === "" ? null : Number(form.elements.score.value),
      cover: form.elements.cover.value.trim(),
      poster: form.elements.poster.value.trim(),
      accent: editingAccent,
      summary: form.elements.summary.value.trim(),
      author: selectedCategory === "livre" || selectedCategory === "musique" ? authorValue : "",
      director: selectedCategory === "film" || selectedCategory === "serie" ? directorValue : "",
      studio: selectedCategory === "jeu" ? studioValue : "",
      releaseYear: form.elements.releaseYear.value.trim(),
      genre: form.elements.genre.value.trim(),
      contentMode: currentContentMode,
      bodyHtml: currentContentMode === "rich" ? getRichHtml() : "",
      blocks: currentContentMode === "blocks" ? readBlocks() : []
    };
    try {
      await window.ReviewsStore.upsert(payload);
    } catch (error) {
      window.alert(`Sauvegarde impossible : ${error.message}`);
      return;
    }
    closeForm();
    await renderAll();
  });
}

if (topForm) {
  topForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = topForm.elements.title.value.trim() || "Sans titre";
    const payload = {
      id: editingTopId || window.ReviewsStore.slugify(title),
      title,
      category: topForm.elements.category.value || "autre",
      year: topForm.elements.year.value.trim(),
      cover: topForm.elements.cover.value.trim(),
      subtitle: topForm.elements.subtitle.value.trim(),
      items: readTopItems()
    };
    try {
      await window.ReviewsStore.upsertTop(payload);
    } catch (error) {
      window.alert(`Sauvegarde top impossible : ${error.message}`);
      return;
    }
    closeTopForm();
    await renderTopsManager();
  });
}

if (addBtn) addBtn.addEventListener("click", () => openForm());
if (cancelBtn) cancelBtn.addEventListener("click", closeForm);
addBlockButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!blocksList) return;
    blocksList.appendChild(createBlockRow({ type: btn.dataset.addBlock || "text" }));
    updateBlockIndex();
    renderPreview();
  });
});
if (newTopBtn) newTopBtn.addEventListener("click", () => openTopForm());
if (cancelTopBtn) cancelTopBtn.addEventListener("click", closeTopForm);
if (addTopItemBtn) {
  addTopItemBtn.addEventListener("click", () => {
    if (!topItemsList) return;
    topItemsList.appendChild(createTopItemRow());
    updateTopItemIndex();
  });
}

wrapToolButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tag = btn.dataset.wrapTag;
    if (!tag) return;
    wrapSelection(`[${tag}]`, `[/${tag}]`);
  });
});
if (toolColorApply) {
  toolColorApply.addEventListener("click", () => {
    wrapSelection(`[color=${toolColor?.value || "#f2f2ee"}]`, "[/color]");
  });
}
if (toolSizeApply) {
  toolSizeApply.addEventListener("click", () => {
    wrapSelection(`[size=${toolSize?.value || "16"}]`, "[/size]");
  });
}

contentModeButtons.forEach((btn) => {
  btn.addEventListener("click", () => setContentMode(btn.dataset.contentMode || "blocks"));
});

if (richEditor) {
  richEditor.addEventListener("input", () => {
    if (reviewBodyHtml) reviewBodyHtml.value = richEditor.innerHTML;
    renderPreview();
  });
}

richCmdButtons.forEach((btn) => {
  btn.addEventListener("mousedown", (event) => event.preventDefault());
  btn.addEventListener("click", () => {
    if (!richEditor) return;
    richEditor.focus();
    document.execCommand(btn.dataset.richCmd || "", false, null);
    renderPreview();
  });
});

if (richLinkBtn) {
  richLinkBtn.addEventListener("mousedown", (event) => event.preventDefault());
  richLinkBtn.addEventListener("click", () => {
    if (!richEditor) return;
    const url = window.prompt("URL du lien");
    if (!url) return;
    richEditor.focus();
    document.execCommand("createLink", false, url.trim());
    renderPreview();
  });
}

if (richImageBtn) {
  richImageBtn.addEventListener("mousedown", (event) => event.preventDefault());
  richImageBtn.addEventListener("click", () => {
    const url = window.prompt("URL de l'image");
    if (!url || !richEditor) return;
    richEditor.focus();
    document.execCommand("insertHTML", false, `<figure><img src="${escapeHtml(url.trim())}" alt="image" /></figure>`);
    renderPreview();
  });
}

if (richVideoBtn) {
  richVideoBtn.addEventListener("mousedown", (event) => event.preventDefault());
  richVideoBtn.addEventListener("click", () => {
    const url = window.prompt("URL vidéo (YouTube ou fichier vidéo)");
    if (!url || !richEditor) return;
    richEditor.focus();
    const cleaned = url.trim();
    const embed = normalizeYouTubeEmbed(cleaned);
    if (embed.includes("youtube.com/embed/")) {
      document.execCommand("insertHTML", false, `<div class="video-wrap"><iframe src="${escapeHtml(embed)}" title="video" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`);
    } else {
      document.execCommand("insertHTML", false, `<video controls src="${escapeHtml(cleaned)}"></video>`);
    }
    renderPreview();
  });
}

if (richAudioBtn) {
  richAudioBtn.addEventListener("mousedown", (event) => event.preventDefault());
  richAudioBtn.addEventListener("click", () => {
    const url = window.prompt("URL audio");
    if (!url || !richEditor) return;
    richEditor.focus();
    document.execCommand("insertHTML", false, `<audio controls src="${escapeHtml(url.trim())}"></audio>`);
    renderPreview();
  });
}

if (richColsBtn) {
  richColsBtn.addEventListener("mousedown", (event) => event.preventDefault());
  richColsBtn.addEventListener("click", () => {
    if (!richEditor) return;
    richEditor.focus();
    document.execCommand(
      "insertHTML",
      false,
      "<table><tbody><tr><td><p>Colonne 1</p></td><td><p>Colonne 2</p></td></tr></tbody></table><p></p>"
    );
    renderPreview();
  });
}

if (window.ReviewsStore.onAuthChanged) {
  window.ReviewsStore.onAuthChanged(async (user) => {
    const unlocked = Boolean(user);
    currentUser = unlocked ? window.ReviewsStore.getCurrentUser() : null;
    if (managerSection) managerSection.classList.toggle("hidden", !unlocked);
    if (logoutBtn) logoutBtn.classList.toggle("hidden", !unlocked);
    if (authStatus) {
      authStatus.textContent = unlocked
        ? `Connecté en tant que @${currentUser?.username || "utilisateur"}`
        : "Non connecté";
    }
    if (unlocked) {
      await renderAll();
      await renderTopsManager();
    } else {
      if (managerList) managerList.innerHTML = "";
      if (topList) topList.innerHTML = "";
    }
  });
}

if (loginBtn && authUsername && authPassword) {
  const login = async () => {
    try {
      await window.ReviewsStore.loginWithCredentials(authUsername.value, authPassword.value);
      authPassword.value = "";
    } catch (error) {
      window.alert(`Connexion impossible : ${error.message}`);
    }
  };
  loginBtn.addEventListener("click", login);
  authUsername.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      login();
    }
  });
  authPassword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      login();
    }
  });
}

if (registerBtn && authUsername && authPassword) {
  registerBtn.addEventListener("click", async () => {
    try {
      await window.ReviewsStore.registerWithCredentials(authUsername.value, authPassword.value);
      authPassword.value = "";
      window.alert("Compte créé. Tu es maintenant connecté.");
    } catch (error) {
      window.alert(`Inscription impossible : ${error.message}`);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await window.ReviewsStore.signOut();
    } catch (error) {
      window.alert(`Erreur : ${error.message}`);
    }
  });
}

if (blocksList) setBlocks([]);
if (topItemsList) setTopItems([]);
if (form) configureMetaFields(form.elements.category.value || "jeu");
setContentMode("blocks");
renderAll();





