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
const exportBtn = document.getElementById("export-json");
const importInput = document.getElementById("import-json");
const filterButtons = document.querySelectorAll(".filter-btn");

const topList = document.getElementById("tops-manager-list");
const topForm = document.getElementById("top-form");
const topFormTitle = document.getElementById("top-form-title");
const newTopBtn = document.getElementById("new-top");
const cancelTopBtn = document.getElementById("cancel-top-form");
const addTopItemBtn = document.getElementById("add-top-item");
const topItemsList = document.getElementById("top-items-list");

const adminPassword = document.getElementById("admin-password");
const loginBtn = document.getElementById("admin-login");
const logoutBtn = document.getElementById("admin-logout");
const authStatus = document.getElementById("auth-status");

const DEFAULT_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'><defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#1a2a36'/><stop offset='1' stop-color='#243b4a'/></linearGradient></defs><rect width='1200' height='630' fill='url(#g)'/><text x='50%' y='50%' text-anchor='middle' fill='#b8c2cc' font-size='54' font-family='Arial, sans-serif'>Sans cover</text></svg>"
  );

let selectedFilter = "all";
let editingId = null;
let editingTopId = null;

const fmtDate = (iso) => {
  if (!iso || !iso.includes("-")) return "Date libre";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

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

  article.innerHTML = `
    <img src="${item.cover || DEFAULT_COVER}" alt="${item.title || "Review"}" />
    <div class="card-body">
      <p class="meta">${window.ReviewsStore.categories[item.category] || item.category} · ${fmtDate(item.date)}</p>
      <h3>${item.title || "Sans titre"}</h3>
      <p>${item.summary || "Aucun résumé."}</p>
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
  row.innerHTML = `
    <div>
      <strong>${item.title || "Sans titre"}</strong>
      <span>${window.ReviewsStore.categories[item.category] || item.category} · ${fmtDate(item.date)}</span>
    </div>
    <div class="row-actions">
      <button class="action-btn secondary" data-action="edit">Éditer</button>
      <button class="action-btn danger" data-action="delete">Supprimer</button>
    </div>
  `;

  row.querySelector('[data-action="edit"]').addEventListener("click", () => openForm(item));
  row.querySelector('[data-action="delete"]').addEventListener("click", async (event) => {
    event.stopPropagation();
    const ok = window.confirm(`Supprimer "${item.title || "Sans titre"}" ?`);
    if (!ok) return;
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
  row.innerHTML = `
    <div>
      <strong>${item.title || "Sans titre"}</strong>
      <span>${window.ReviewsStore.categories[item.category] || item.category || "Autre"}${item.year ? ` · ${item.year}` : ""}</span>
    </div>
    <div class="row-actions">
      <button class="action-btn secondary" data-action="edit-top">Éditer</button>
      <button class="action-btn danger" data-action="delete-top">Supprimer</button>
    </div>
  `;

  row.querySelector('[data-action="edit-top"]').addEventListener("click", () => openTopForm(item));
  row.querySelector('[data-action="delete-top"]').addEventListener("click", async () => {
    const ok = window.confirm(`Supprimer le top "${item.title || "Sans titre"}" ?`);
    if (!ok) return;
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
    return `<textarea class="block-content" rows="5" placeholder="Ton texte...">${block.content || ""}</textarea>`;
  }
  return `
    <input class="block-url" type="url" placeholder="URL" value="${block.url || ""}" />
    <input class="block-caption" type="text" placeholder="Légende (optionnel)" value="${block.caption || ""}" />
  `;
}

function readBlocks() {
  if (!blocksList) return [];
  const rows = [...blocksList.querySelectorAll(".block-item")];
  const blocks = [];

  rows.forEach((row) => {
    const type = row.querySelector(".block-type").value;
    if (type === "text") {
      const content = row.querySelector(".block-content")?.value.trim() || "";
      if (content) blocks.push({ type, content, url: "", caption: "" });
      return;
    }
    const url = row.querySelector(".block-url")?.value.trim() || "";
    const caption = row.querySelector(".block-caption")?.value.trim() || "";
    if (url) blocks.push({ type, content: "", url, caption });
  });

  return blocks;
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
  head.innerHTML = `<strong>${title}</strong><span>${scoreToStars(score)}${Number.isFinite(score) ? ` (${score}/10)` : ""}</span>`;
  previewBox.appendChild(head);

  const summaryNode = document.createElement("p");
  summaryNode.className = "media-note";
  summaryNode.textContent = summary;
  previewBox.appendChild(summaryNode);

  const flow = document.createElement("div");
  flow.className = "preview-flow";
  blocks.forEach((block) => {
    const node = document.createElement("div");
    node.className = "preview-block";
    if (block.type === "text") {
      node.textContent = block.content;
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

function createBlockRow(block = { type: "text", content: "", url: "", caption: "" }) {
  const row = document.createElement("div");
  row.className = "block-item";
  row.innerHTML = `
    <div class="block-head">
      <strong class="block-index">Bloc</strong>
      <select class="block-type">
        <option value="text">Texte</option>
        <option value="image">Image</option>
        <option value="video">Vidéo</option>
        <option value="video-embed">Vidéo embed</option>
        <option value="audio">Audio</option>
      </select>
      <div class="row-actions">
        <button type="button" class="action-btn secondary block-up">↑</button>
        <button type="button" class="action-btn secondary block-down">↓</button>
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

function createTopItemRow(item = { title: "", comment: "" }) {
  const row = document.createElement("div");
  row.className = "block-item";
  row.innerHTML = `
    <div class="block-head">
      <strong class="block-index">Item</strong>
      <div class="row-actions">
        <button type="button" class="action-btn secondary top-up">↑</button>
        <button type="button" class="action-btn secondary top-down">↓</button>
        <button type="button" class="action-btn danger top-delete">Supprimer</button>
      </div>
    </div>
    <div class="block-fields">
      <input class="top-title" type="text" placeholder="Titre" value="${item.title || ""}" />
      <input class="top-comment" type="text" placeholder="Commentaire (optionnel)" value="${item.comment || ""}" />
    </div>
  `;

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

function updateTopItemIndex() {
  if (!topItemsList) return;
  [...topItemsList.querySelectorAll(".block-item")].forEach((row, idx) => {
    const index = row.querySelector(".block-index");
    if (index) index.textContent = `Item ${idx + 1}`;
  });
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
  const rows = [...topItemsList.querySelectorAll(".block-item")];
  return rows
    .map((row) => ({
      title: row.querySelector(".top-title")?.value.trim() || "",
      comment: row.querySelector(".top-comment")?.value.trim() || ""
    }))
    .filter((item) => item.title);
}

async function renderAll() {
  let reviews = [];

  try {
    reviews = await window.ReviewsStore.getAll();
  } catch (error) {
    console.error(error);
    if (reviewsGrid || managerList) {
      window.alert(`Impossible de charger les reviews : ${error.message}`);
    }
    return;
  }

  reviews.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

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
    const tops = await window.ReviewsStore.getAllTops();
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
  form.elements.accent.value = item?.accent || "";
  form.elements.summary.value = item?.summary || "";

  setBlocks(item?.blocks || []);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeForm() {
  if (!form) return;
  editingId = null;
  form.reset();
  form.classList.add("hidden");
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = form.elements.title.value.trim() || "Sans titre";
    const nextId = editingId || window.ReviewsStore.slugify(title);
    const payload = {
      id: nextId,
      title,
      category: form.elements.category.value || "jeu",
      date: form.elements.date.value,
      score: form.elements.score.value === "" ? null : Number(form.elements.score.value),
      cover: form.elements.cover.value.trim(),
      accent: form.elements.accent.value.trim(),
      summary: form.elements.summary.value.trim(),
      blocks: readBlocks()
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
    const nextId = editingTopId || window.ReviewsStore.slugify(title);
    const payload = {
      id: nextId,
      title,
      category: topForm.elements.category.value || "autre",
      year: topForm.elements.year.value.trim(),
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

filterButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    selectedFilter = button.dataset.filter;
    await renderAll();
  });
});

if (exportBtn) {
  exportBtn.addEventListener("click", async () => {
    try {
      const data = await window.ReviewsStore.exportJson();
      const blob = new Blob([data], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "groszizou-reviews.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      window.alert(`Export impossible : ${error.message}`);
    }
  });
}

if (importInput) {
  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const count = await window.ReviewsStore.importJson(text);
      window.alert(`Import terminé : ${count} review(s).`);
      await renderAll();
    } catch (error) {
      window.alert(`Import impossible : ${error.message}`);
    } finally {
      importInput.value = "";
    }
  });
}

if (window.ReviewsStore.onAuthChanged && authStatus) {
  window.ReviewsStore.onAuthChanged(async (user) => {
    const unlocked = Boolean(user);
    authStatus.textContent = unlocked ? "Débloqué" : "Verrouillé";
    if (managerSection) {
      managerSection.classList.toggle("hidden", !unlocked);
    }
    if (unlocked) {
      await renderAll();
      await renderTopsManager();
    }
  });
}

if (loginBtn && adminPassword) {
  loginBtn.addEventListener("click", async () => {
    try {
      await window.ReviewsStore.unlockWithPassword(adminPassword.value);
      adminPassword.value = "";
      window.alert("Débloqué");
    } catch (error) {
      window.alert(`Mot de passe invalide : ${error.message}`);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await window.ReviewsStore.signOut();
      window.alert("Verrouillé");
    } catch (error) {
      window.alert(`Erreur : ${error.message}`);
    }
  });
}

if (blocksList) setBlocks([]);
if (topItemsList) setTopItems([]);
renderAll();
