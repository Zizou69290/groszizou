const menuToggle = document.getElementById("menu-toggle");
const menu = document.getElementById("menu");

if (menuToggle && menu) {
  menuToggle.addEventListener("click", () => {
    menu.classList.toggle("open");
  });
}

const reviewsGrid = document.getElementById("reviews-grid");
const managerList = document.getElementById("manager-list");
const form = document.getElementById("review-form");
const formTitle = document.getElementById("form-title");
const addBtn = document.getElementById("new-review");
const cancelBtn = document.getElementById("cancel-form");
const addMediaBtn = document.getElementById("add-media");
const mediaList = document.getElementById("media-list");
const exportBtn = document.getElementById("export-json");
const importInput = document.getElementById("import-json");
const filterButtons = document.querySelectorAll(".filter-btn");

const adminEmail = document.getElementById("admin-email");
const adminPassword = document.getElementById("admin-password");
const loginBtn = document.getElementById("admin-login");
const logoutBtn = document.getElementById("admin-logout");
const authStatus = document.getElementById("auth-status");

const DEFAULT_COVER = "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'><defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#1a2a36'/><stop offset='1' stop-color='#243b4a'/></linearGradient></defs><rect width='1200' height='630' fill='url(#g)'/><text x='50%' y='50%' text-anchor='middle' fill='#b8c2cc' font-size='54' font-family='Arial, sans-serif'>Sans cover</text></svg>");

let selectedFilter = "all";
let editingId = null;

const fmtDate = (iso) => {
  if (!iso || !iso.includes("-")) return "Date libre";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

const formatScore = (score) => (Number.isFinite(score) ? `${score}/10` : "-");

function mediaRow(data = { type: "image", url: "", caption: "" }) {
  const row = document.createElement("div");
  row.className = "media-row";
  row.innerHTML = `
    <select class="media-type">
      <option value="image">image</option>
      <option value="video">video</option>
      <option value="video-embed">video-embed</option>
      <option value="audio">audio</option>
    </select>
    <input class="media-url" type="url" placeholder="URL" />
    <input class="media-caption" type="text" placeholder="Caption" />
    <button type="button" class="delete-media">X</button>
  `;

  row.querySelector(".media-type").value = data.type || "image";
  row.querySelector(".media-url").value = data.url || "";
  row.querySelector(".media-caption").value = data.caption || "";
  row.querySelector(".delete-media").addEventListener("click", () => row.remove());
  return row;
}

async function readMediaRows() {
  if (!mediaList) return [];
  const rows = [...mediaList.querySelectorAll(".media-row")];
  return rows
    .map((row) => ({
      type: row.querySelector(".media-type").value,
      url: row.querySelector(".media-url").value.trim(),
      caption: row.querySelector(".media-caption").value.trim()
    }))
    .filter((item) => item.url);
}

function setMediaRows(media) {
  if (!mediaList) return;
  mediaList.innerHTML = "";
  if (!media.length) {
    mediaList.appendChild(mediaRow());
    return;
  }
  media.forEach((item) => mediaList.appendChild(mediaRow(item)));
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
      <p>${item.summary || "Aucun resume."}</p>
      <div class="card-footer">
        <span class="score" style="color:${accent}">${formatScore(item.score)}</span>
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
      <button class="action-btn secondary" data-action="edit">Editer</button>
      <button class="action-btn danger" data-action="delete">Supprimer</button>
    </div>
  `;

  row.querySelector('[data-action="edit"]').addEventListener("click", () => openForm(item));
  row.querySelector('[data-action="delete"]').addEventListener("click", async (event) => {
    event.stopPropagation();
    const ok = window.confirm(`Supprimer \"${item.title || "Sans titre"}\" ?`);
    if (!ok) return;

    try {
      await window.ReviewsStore.remove(item.id);
      await renderAll();
    } catch (error) {
      window.alert(`Suppression impossible: ${error.message}`);
    }
  });

  return row;
}

async function renderAll() {
  let reviews = [];

  try {
    reviews = await window.ReviewsStore.getAll();
  } catch (error) {
    console.error(error);
    window.alert(`Impossible de charger les reviews: ${error.message}`);
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
  form.elements.body.value = item?.body || "";
  form.elements.tags.value = (item?.tags || []).join(", ");
  setMediaRows(item?.media || []);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeForm() {
  if (!form) return;
  editingId = null;
  form.reset();
  form.classList.add("hidden");
  if (mediaList) mediaList.innerHTML = "";
}

if (form) {
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
      body: form.elements.body.value.trim(),
      tags: form.elements.tags.value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      media: await readMediaRows()
    };

    try {
      await window.ReviewsStore.upsert(payload);
    } catch (error) {
      window.alert(`Sauvegarde impossible: ${error.message}`);
      return;
    }

    closeForm();
    await renderAll();
  });
}

if (addBtn) addBtn.addEventListener("click", () => openForm());
if (cancelBtn) cancelBtn.addEventListener("click", closeForm);
if (addMediaBtn && mediaList) addMediaBtn.addEventListener("click", () => mediaList.appendChild(mediaRow()));

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
      window.alert(`Export impossible: ${error.message}`);
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
      window.alert(`Import termine: ${count} review(s).`);
      await renderAll();
    } catch (error) {
      window.alert(`Import impossible: ${error.message}`);
    } finally {
      importInput.value = "";
    }
  });
}

if (window.ReviewsStore.onAuthChanged && authStatus) {
  window.ReviewsStore.onAuthChanged((user) => {
    authStatus.textContent = user ? `Connecte: ${user.email || "utilisateur"}` : "Non connecte";
  });
}

if (loginBtn && adminEmail && adminPassword) {
  loginBtn.addEventListener("click", async () => {
    try {
      await window.ReviewsStore.signIn(adminEmail.value.trim(), adminPassword.value);
      window.alert("Connexion OK");
    } catch (error) {
      window.alert(`Connexion impossible: ${error.message}`);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await window.ReviewsStore.signOut();
      window.alert("Deconnexion OK");
    } catch (error) {
      window.alert(`Deconnexion impossible: ${error.message}`);
    }
  });
}

if (mediaList) setMediaRows([]);
renderAll();
