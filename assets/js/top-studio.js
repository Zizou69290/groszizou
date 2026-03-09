const menuToggle = document.getElementById("menu-toggle");
const menu = document.getElementById("menu");
const pageParams = new URLSearchParams(window.location.search);
const requestedEditTopId = String(pageParams.get("edit") || "").trim();

const topStudioCoverBg = document.getElementById("top-studio-cover-bg");
const topStudioTitleInput = document.getElementById("top-studio-title");
const topStudioSubtitleInput = document.getElementById("top-studio-subtitle");
const topStudioMetaForm = document.getElementById("top-studio-meta-form");
const topStudioItemsList = document.getElementById("top-studio-items-list");
const topStudioAddItemBtn = document.getElementById("top-studio-add-item");
const topStudioSaveDraftBtn = document.getElementById("top-studio-save-draft");
const topStudioSavePublishBtn = document.getElementById("top-studio-save-publish");
const topStudioDeleteBtn = document.getElementById("top-studio-delete");
const topStudioWorkspace = document.getElementById("top-studio-workspace");
const topStudioGuestNote = document.getElementById("top-studio-guest-note");
const topStudioEyebrow = document.getElementById("top-studio-eyebrow");

const DEFAULT_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'><defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#1a2a36'/><stop offset='1' stop-color='#243b4a'/></linearGradient></defs><rect width='1200' height='630' fill='url(#g)'/><text x='50%' y='50%' text-anchor='middle' fill='#b8c2cc' font-size='54' font-family='Arial, sans-serif'>Nouveau top</text></svg>"
  );
const TMDB_API_KEY = "db0d1dbaf15190e0a5574538dc4e579f";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const TMDB_AUTOCOMPLETE_MIN_CHARS = 2;
const IGDB_AUTOCOMPLETE_MIN_CHARS = 2;

let currentUser = null;
let editingTopId = requestedEditTopId || "";
let loadedTopSnapshot = null;
let pendingEditLoad = false;
let topFormDirty = false;
let cachedReviews = [];

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

function isAdminUser(user) {
  return String(user?.username || "").trim().toLowerCase() === "admin";
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function extractYear(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "";
}

function tmdbImageUrl(path, size = "w780") {
  if (!path) return "";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

function tmdbMediaTypeFromCategory(category) {
  return String(category || "").trim().toLowerCase() === "serie" ? "tv" : "movie";
}

function isGameCategory(category) {
  return String(category || "").trim().toLowerCase() === "jeu";
}

function getTmdbTitle(item) {
  return String(item?.title || item?.name || "").trim();
}

function getTmdbReleaseDate(item) {
  return String(item?.release_date || item?.first_air_date || "").trim();
}

async function searchTmdbTitles(query, mediaType) {
  const q = String(query || "").trim();
  if (!TMDB_API_KEY || q.length < TMDB_AUTOCOMPLETE_MIN_CHARS) return [];
  if (mediaType !== "movie" && mediaType !== "tv") return [];
  const url = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&language=fr-FR&query=${encodeURIComponent(q)}&include_adult=false`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("TMDB search failed");
  const data = await response.json();
  return (Array.isArray(data?.results) ? data.results : []).slice(0, 8).map((entry) => ({
    id: entry.id,
    mediaType,
    title: getTmdbTitle(entry),
    year: extractYear(getTmdbReleaseDate(entry)),
    poster: tmdbImageUrl(entry.poster_path, "w500"),
    cover: tmdbImageUrl(entry.backdrop_path, "w1280")
  }));
}

async function getTmdbDetails(id, mediaType) {
  if (!TMDB_API_KEY || !id) return {};
  const type = mediaType === "tv" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/${type}/${encodeURIComponent(id)}?api_key=${TMDB_API_KEY}&language=fr-FR&append_to_response=credits`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("TMDB details failed");
  const data = await response.json();
  const crew = Array.isArray(data?.credits?.crew) ? data.credits.crew : [];
  const directorNames = crew.filter((person) => person?.job === "Director" && person?.name).map((person) => person.name);
  const creators = Array.isArray(data?.created_by) ? data.created_by.filter((person) => person?.name).map((person) => person.name) : [];
  return {
    title: getTmdbTitle(data),
    year: extractYear(getTmdbReleaseDate(data)),
    poster: tmdbImageUrl(data?.poster_path, "w500"),
    cover: tmdbImageUrl(data?.backdrop_path, "w1280"),
    director: directorNames.join(", ") || creators.join(", ")
  };
}

async function searchIgdbGames(query) {
  const q = String(query || "").trim();
  if (q.length < IGDB_AUTOCOMPLETE_MIN_CHARS) return [];
  const response = await fetch(`/api/igdb?mode=search&q=${encodeURIComponent(q)}&limit=8`);
  if (!response.ok) throw new Error("IGDB search failed");
  const data = await response.json();
  const list = Array.isArray(data?.results) ? data.results : [];
  return list.map((entry) => ({
    id: entry.id,
    mediaType: "igdb_game",
    provider: "igdb",
    title: String(entry?.title || "").trim(),
    year: String(entry?.year || "").trim(),
    poster: String(entry?.poster || "").trim(),
    cover: String(entry?.cover || "").trim(),
    director: String(entry?.studio || "").trim()
  }));
}

async function getIgdbGameDetails(id) {
  if (!id) return {};
  const response = await fetch(`/api/igdb?mode=details&id=${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error("IGDB details failed");
  const data = await response.json();
  const entry = data?.details || {};
  return {
    title: String(entry?.title || "").trim(),
    year: String(entry?.year || "").trim(),
    poster: String(entry?.poster || "").trim(),
    cover: String(entry?.cover || "").trim(),
    director: String(entry?.studio || "").trim()
  };
}

function createTmdbAutocomplete(input, options = {}) {
  if (!(input instanceof HTMLInputElement)) return null;
  const host = input.parentElement;
  if (!(host instanceof HTMLElement)) return null;
  host.classList.add("has-tmdb-autocomplete");
  const list = document.createElement("ul");
  list.className = "tmdb-suggestion-box";
  list.hidden = true;
  host.appendChild(list);

  let requestId = 0;
  let timer = null;

  const hide = () => {
    list.innerHTML = "";
    list.hidden = true;
  };

  const render = (items = []) => {
    list.innerHTML = "";
    if (!items.length) {
      list.hidden = true;
      return;
    }
    items.forEach((item) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tmdb-suggestion-btn";
      btn.textContent = `${item.title || "Sans titre"}${item.year ? ` (${item.year})` : ""}`;
      btn.addEventListener("mousedown", async (event) => {
        event.preventDefault();
        hide();
        try {
          await options.onSelect?.(item);
        } catch {
          // Ignore select callback errors.
        }
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
    list.hidden = false;
  };

  input.addEventListener("input", () => {
    const query = String(input.value || "").trim();
    const category = String(options.getCategory?.() || "").trim().toLowerCase();
    const mediaType = options.getMediaType?.() || null;
    const isGame = isGameCategory(category);
    const minChars = isGame ? IGDB_AUTOCOMPLETE_MIN_CHARS : TMDB_AUTOCOMPLETE_MIN_CHARS;
    if ((!mediaType && !isGame) || query.length < minChars) {
      hide();
      return;
    }
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      const currentRequest = ++requestId;
      try {
        const results = isGame
          ? await searchIgdbGames(query)
          : await searchTmdbTitles(query, mediaType);
        if (currentRequest !== requestId) return;
        render(results);
      } catch {
        if (currentRequest !== requestId) return;
        hide();
      }
    }, 220);
  });

  input.addEventListener("focus", () => {
    if (list.innerHTML.trim()) list.hidden = false;
  });

  input.addEventListener("blur", () => {
    window.setTimeout(hide, 130);
  });

  return { hide };
}

function markTopFormDirty() {
  if (!topStudioWorkspace || topStudioWorkspace.classList.contains("hidden")) return;
  topFormDirty = true;
}

function refreshTopItemIndex() {
  if (!topStudioItemsList) return;
  const ordinalLabel = (position) => (position === 1 ? "1\u00E8re place" : `${position}\u00E8me place`);
  [...topStudioItemsList.querySelectorAll(".block-item")].forEach((row, idx) => {
    const index = row.querySelector(".block-index");
    if (index) index.textContent = ordinalLabel(idx + 1);
  });
}

function topReviewOptions(selectedId = "") {
  const options = [`<option value="">Aucune review li\u00E9e</option>`];
  cachedReviews.forEach((review) => {
    const selected = review.id === selectedId ? " selected" : "";
    options.push(`<option value="${review.id}"${selected}>${escapeHtml(review.title || "Sans titre")}</option>`);
  });
  return options.join("");
}

function getCategoryItemLabel(category) {
  const key = String(category || "").trim().toLowerCase();
  if (key === "film") return "Film";
  if (key === "serie") return "S\u00E9rie";
  if (key === "jeu") return "Jeu-vid\u00E9o";
  if (key === "livre") return "Livre";
  if (key === "musique") return "Musique";
  return "Item";
}

function getCategoryCreatorLabel(category) {
  const key = String(category || "").trim().toLowerCase();
  if (key === "jeu") return "Studio";
  if (key === "livre") return "Auteur";
  if (key === "musique") return "Artiste";
  return "R\u00E9alisation";
}

function getCreatorValueFromReview(review, category) {
  const key = String(category || "").trim().toLowerCase();
  if (key === "jeu") return String(review?.studio || review?.director || review?.author || "").trim();
  if (key === "livre") return String(review?.author || review?.director || review?.studio || "").trim();
  if (key === "musique") return String(review?.author || review?.studio || review?.director || "").trim();
  return String(review?.director || review?.studio || review?.author || "").trim();
}

function currentItemLabel() {
  return getCategoryItemLabel(topStudioMetaForm?.elements?.category?.value || "");
}

function updateAddItemButtonLabel() {
  if (!topStudioAddItemBtn) return;
  topStudioAddItemBtn.textContent = `+ ${currentItemLabel()}`;
}

function updateTopItemCategoryLabels() {
  if (!topStudioItemsList) return;
  const creatorLabel = getCategoryCreatorLabel(topStudioMetaForm?.elements?.category?.value || "");
  [...topStudioItemsList.querySelectorAll(".block-item")].forEach((row) => {
    const labelNode = row.querySelector(".top-title-label");
    if (labelNode) labelNode.textContent = "Nom";
    const input = row.querySelector(".top-title");
    if (input) input.placeholder = "Nom";
    const creatorNode = row.querySelector(".top-creator-label");
    if (creatorNode) creatorNode.textContent = creatorLabel;
    const creatorInput = row.querySelector(".top-director");
    if (creatorInput) creatorInput.placeholder = `Ex: ${creatorLabel}`;
  });
}

function refreshTopReviewSelectOptions() {
  if (!topStudioItemsList) return;
  [...topStudioItemsList.querySelectorAll(".top-review")].forEach((select) => {
    const current = select.value || "";
    select.innerHTML = topReviewOptions(current);
    select.value = current;
  });
}

function createTopItemRow(item = { title: "", comment: "", note: null, reviewId: "", poster: "", cover: "", releaseYear: "", director: "", tmdbId: "", tmdbMediaType: "" }) {
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
    <div class="block-fields top-studio-item-fields">
      <label><span class="label-row"><span class="field-label-text">Review li\u00E9e</span><span class="field-hint">optionnel</span></span>
        <select class="top-review">${topReviewOptions(item.reviewId || "")}</select>
      </label>
      <label><span class="label-row"><span class="field-label-text top-title-label">Nom</span><span class="field-hint">optionnel</span></span>
        <input class="top-title" type="text" placeholder="Nom" value="${escapeHtml(item.title || "")}" />
      </label>
      <label><span class="label-row"><span class="field-label-text">Affiche URL</span><span class="field-hint">optionnel</span></span>
        <input class="top-poster" type="url" placeholder="https://..." value="${escapeHtml(item.poster || "")}" />
      </label>
      <label><span class="label-row"><span class="field-label-text">Couverture URL</span><span class="field-hint">optionnel</span></span>
        <input class="top-cover" type="url" placeholder="https://..." value="${escapeHtml(item.cover || "")}" />
      </label>
      <label><span class="label-row"><span class="field-label-text">Note</span><span class="field-hint">optionnel</span></span>
        <input class="top-note" type="number" min="0" max="10" step="0.1" placeholder="/10" value="${Number.isFinite(Number(item.note)) ? escapeHtml(String(Number(item.note))) : ""}" />
      </label>
      <label><span class="label-row"><span class="field-label-text">Ann\u00E9e</span><span class="field-hint">optionnel</span></span>
        <input class="top-release-year" type="text" placeholder="Ex: 2024" value="${escapeHtml(item.releaseYear || "")}" />
      </label>
      <label><span class="label-row"><span class="field-label-text top-creator-label">${escapeHtml(getCategoryCreatorLabel(topStudioMetaForm?.elements?.category?.value || ""))}</span><span class="field-hint">optionnel</span></span>
        <input class="top-director" type="text" placeholder="Ex: ${escapeHtml(getCategoryCreatorLabel(topStudioMetaForm?.elements?.category?.value || ""))}" value="${escapeHtml(item.director || "")}" />
      </label>
      <label><span class="label-row"><span class="field-label-text">Commentaire</span><span class="field-hint">optionnel</span></span>
        <input class="top-comment" type="text" placeholder="Commentaire" value="${escapeHtml(item.comment || "")}" />
      </label>
      <input class="top-tmdb-id" type="hidden" value="${escapeHtml(item.tmdbId || "")}" />
      <input class="top-tmdb-media-type" type="hidden" value="${escapeHtml(item.tmdbMediaType || "")}" />
    </div>
  `;

  const reviewSelect = row.querySelector(".top-review");
  const titleInput = row.querySelector(".top-title");
  const posterInput = row.querySelector(".top-poster");
  const coverInput = row.querySelector(".top-cover");
  const noteInput = row.querySelector(".top-note");
  const releaseYearInput = row.querySelector(".top-release-year");
  const directorInput = row.querySelector(".top-director");
  const tmdbIdInput = row.querySelector(".top-tmdb-id");
  const tmdbMediaTypeInput = row.querySelector(".top-tmdb-media-type");
  const clearTopTmdbLink = () => {
    if (tmdbIdInput) tmdbIdInput.value = "";
    if (tmdbMediaTypeInput) tmdbMediaTypeInput.value = "";
  };

  reviewSelect?.addEventListener("change", () => {
    const match = cachedReviews.find((r) => r.id === reviewSelect.value);
    if (match) {
      titleInput.value = match.title || "";
      if (posterInput) posterInput.value = match.poster || "";
      if (coverInput) coverInput.value = match.cover || "";
      if (noteInput) noteInput.value = Number.isFinite(Number(match.score)) ? String(Number(match.score)) : "";
      if (releaseYearInput) releaseYearInput.value = match.releaseYear || extractYear(match.date);
      if (directorInput) directorInput.value = getCreatorValueFromReview(match, topStudioMetaForm?.elements?.category?.value || "");
    }
    clearTopTmdbLink();
    markTopFormDirty();
  });
  titleInput?.addEventListener("input", clearTopTmdbLink);

  const topItemAutocomplete = createTmdbAutocomplete(titleInput, {
    getCategory: () => topStudioMetaForm?.elements?.category?.value || "",
    getMediaType: () => {
      const category = topStudioMetaForm?.elements?.category?.value || "";
      if (!["film", "serie"].includes(String(category).trim().toLowerCase())) return null;
      return tmdbMediaTypeFromCategory(category);
    },
    onSelect: async (choice) => {
      const currentToken = Date.now() + Math.random();
      row.dataset.tmdbSelectionToken = String(currentToken);
      titleInput.value = choice.title || titleInput.value;
      if (posterInput) posterInput.value = choice.poster || posterInput.value;
      if (coverInput) coverInput.value = choice.cover || coverInput.value;
      if (releaseYearInput) releaseYearInput.value = choice.year || releaseYearInput.value;
      if (tmdbIdInput) tmdbIdInput.value = String(choice.id || "");
      if (tmdbMediaTypeInput) tmdbMediaTypeInput.value = choice.mediaType || "";
      try {
        const details = choice.provider === "igdb"
          ? await getIgdbGameDetails(choice.id)
          : await getTmdbDetails(choice.id, choice.mediaType);
        if (row.dataset.tmdbSelectionToken !== String(currentToken)) return;
        if (details.title) titleInput.value = details.title;
        if (details.poster && posterInput) posterInput.value = details.poster;
        if (details.cover && coverInput) coverInput.value = details.cover;
        if (details.year && releaseYearInput) releaseYearInput.value = details.year;
        if (details.director && directorInput) directorInput.value = details.director;
      } catch {
        // Keep base search values if TMDB details fail.
      }
      markTopFormDirty();
    }
  });

  row.querySelector(".top-delete")?.addEventListener("click", () => {
    topItemAutocomplete?.hide?.();
    row.remove();
    refreshTopItemIndex();
    markTopFormDirty();
  });
  row.querySelector(".top-up")?.addEventListener("click", () => {
    const prev = row.previousElementSibling;
    if (prev && topStudioItemsList) {
      topStudioItemsList.insertBefore(row, prev);
      refreshTopItemIndex();
      markTopFormDirty();
    }
  });
  row.querySelector(".top-down")?.addEventListener("click", () => {
    const next = row.nextElementSibling;
    if (next && topStudioItemsList) {
      topStudioItemsList.insertBefore(next, row);
      refreshTopItemIndex();
      markTopFormDirty();
    }
  });

  row.querySelectorAll("input,select,textarea").forEach((field) => {
    field.addEventListener("input", markTopFormDirty);
    field.addEventListener("change", markTopFormDirty);
  });

  return row;
}

function setTopItems(items) {
  if (!topStudioItemsList) return;
  topStudioItemsList.innerHTML = "";
  if (!items || !items.length) {
    topStudioItemsList.appendChild(createTopItemRow());
  } else {
    items.forEach((item) => topStudioItemsList.appendChild(createTopItemRow(item)));
  }
  refreshTopItemIndex();
  updateTopItemCategoryLabels();
}

function readTopItems() {
  if (!topStudioItemsList) return [];
  return [...topStudioItemsList.querySelectorAll(".block-item")]
    .map((row) => {
      const noteRaw = row.querySelector(".top-note")?.value;
      const parsedNote = noteRaw === "" || noteRaw === undefined ? null : Number(noteRaw);
      return {
        reviewId: row.querySelector(".top-review")?.value || "",
        title: row.querySelector(".top-title")?.value.trim() || "",
        comment: row.querySelector(".top-comment")?.value.trim() || "",
        note: Number.isFinite(parsedNote) ? parsedNote : null,
        poster: row.querySelector(".top-poster")?.value.trim() || "",
        cover: row.querySelector(".top-cover")?.value.trim() || "",
        releaseYear: row.querySelector(".top-release-year")?.value.trim() || "",
        director: row.querySelector(".top-director")?.value.trim() || "",
        tmdbId: row.querySelector(".top-tmdb-id")?.value.trim() || "",
        tmdbMediaType: row.querySelector(".top-tmdb-media-type")?.value.trim() || ""
      };
    })
    .filter((item) => item.title || item.reviewId);
}

function refreshHeroPreview() {
  if (!topStudioMetaForm || !topStudioCoverBg) return;
  const cover = String(topStudioMetaForm.elements.cover.value || "").trim();
  topStudioCoverBg.src = cover || DEFAULT_COVER;
}

function refreshDeleteButtonState() {
  if (!topStudioDeleteBtn) return;
  const canDelete = Boolean(editingTopId);
  topStudioDeleteBtn.classList.toggle("hidden", !canDelete);
  topStudioDeleteBtn.disabled = !canDelete;
}

async function loadTopReviewOptions() {
  if (!window.ReviewsStore?.getAll) return;
  try {
    const all = await window.ReviewsStore.getAll();
    cachedReviews = all.filter((review) => {
      const status = String(review?.status || "published").trim().toLowerCase();
      if (status === "published") return true;
      return Boolean(currentUser?.uid) && review.ownerId === currentUser.uid;
    });
  } catch {
    cachedReviews = [];
  }
  refreshTopReviewSelectOptions();
}

async function tryLoadEditTop() {
  if (!editingTopId || !currentUser || pendingEditLoad || !topStudioMetaForm) return;
  pendingEditLoad = true;
  let top = null;
  try {
    top = await window.ReviewsStore.getTopById(editingTopId);
  } catch (error) {
    window.alert(`Impossible de charger le top : ${error.message}`);
    pendingEditLoad = false;
    return;
  }
  const canEdit = isAdminUser(currentUser) || (top?.ownerId && top.ownerId === currentUser.uid);
  if (!canEdit) {
    window.alert("Ce top appartient \u00E0 un autre utilisateur.");
    window.location.href = `top.html?id=${encodeURIComponent(editingTopId)}`;
    pendingEditLoad = false;
    return;
  }
  loadedTopSnapshot = top;
  topStudioTitleInput.value = top?.title || "";
  topStudioSubtitleInput.value = top?.subtitle || "";
  topStudioMetaForm.elements.category.value = top?.category || "film";
  if (topStudioMetaForm.elements.year) topStudioMetaForm.elements.year.value = top?.year || "";
  topStudioMetaForm.elements.status.value = String(top?.status || "draft");
  topStudioMetaForm.elements.cover.value = top?.cover || "";
  setTopItems(top?.items || []);
  updateAddItemButtonLabel();
  updateTopItemCategoryLabels();
  if (topStudioEyebrow) {
    topStudioEyebrow.textContent = String(top?.status || "").trim().toLowerCase() === "published" ? "PUBLI\u00C9" : "BROUILLON";
  }
  document.title = `SuperSite - ${topStudioTitleInput.value.trim() || "Modifier top"}`;
  topFormDirty = false;
  refreshHeroPreview();
  pendingEditLoad = false;
}

function buildPayload(statusOverride = "") {
  if (!topStudioMetaForm) return null;
  const base = loadedTopSnapshot || {};
  const title = String(topStudioTitleInput?.value || "").trim() || "Sans titre";
  const status = statusOverride || String(topStudioMetaForm.elements.status.value || "draft");
  return {
    id: editingTopId || window.ReviewsStore.slugify(title),
    title,
    subtitle: String(topStudioSubtitleInput?.value || "").trim(),
    category: String(topStudioMetaForm.elements.category.value || "film"),
    status,
    year: String(topStudioMetaForm.elements.year?.value || "").trim(),
    cover: String(topStudioMetaForm.elements.cover.value || "").trim(),
    items: readTopItems(),
    ownerId: base.ownerId || "",
    ownerUsername: base.ownerUsername || ""
  };
}

async function saveTop(statusOverride = "") {
  if (!currentUser) {
    window.alert("Connexion requise pour sauvegarder.");
    return;
  }
  const payload = buildPayload(statusOverride);
  if (!payload) return;
  try {
    await window.ReviewsStore.upsertTop(payload);
    topFormDirty = false;
    window.location.href = `top.html?id=${encodeURIComponent(payload.id)}`;
  } catch (error) {
    window.alert(`Sauvegarde top impossible : ${error.message}`);
  }
}

async function deleteCurrentTop() {
  if (!editingTopId || !currentUser) return;
  const label = String(topStudioTitleInput?.value || loadedTopSnapshot?.title || "ce top").trim();
  const confirmed = window.confirm(`Supprimer d\u00E9finitivement le top "${label}" ?`);
  if (!confirmed) return;
  topStudioDeleteBtn.disabled = true;
  try {
    await window.ReviewsStore.removeTop(editingTopId);
    topFormDirty = false;
    window.location.href = "tops.html";
  } catch (error) {
    topStudioDeleteBtn.disabled = false;
    window.alert(`Suppression impossible : ${error.message}`);
  }
}

function toggleWorkspaceForAuth(user) {
  const unlocked = Boolean(user);
  currentUser = unlocked ? window.ReviewsStore.getCurrentUser() : null;
  if (topStudioWorkspace) topStudioWorkspace.classList.toggle("hidden", !unlocked);
  if (topStudioGuestNote) topStudioGuestNote.classList.toggle("hidden", unlocked);
}

if (topStudioMetaForm) {
  topStudioMetaForm.addEventListener("input", () => {
    markTopFormDirty();
    refreshHeroPreview();
  });
  topStudioMetaForm.addEventListener("change", () => {
    markTopFormDirty();
    refreshHeroPreview();
    updateAddItemButtonLabel();
    updateTopItemCategoryLabels();
    if (topStudioEyebrow) {
      const label = String(topStudioMetaForm.elements.status.value || "").trim().toLowerCase() === "published" ? "PUBLI\u00C9" : "BROUILLON";
      topStudioEyebrow.textContent = label;
    }
  });
}

if (topStudioTitleInput) {
  topStudioTitleInput.addEventListener("input", () => {
    markTopFormDirty();
    document.title = `SuperSite - ${topStudioTitleInput.value.trim() || "Nouveau top"}`;
  });
}

if (topStudioSubtitleInput) {
  topStudioSubtitleInput.addEventListener("input", markTopFormDirty);
}

if (topStudioAddItemBtn) {
  topStudioAddItemBtn.addEventListener("click", () => {
    if (!topStudioItemsList) return;
    topStudioItemsList.appendChild(createTopItemRow());
    refreshTopItemIndex();
    markTopFormDirty();
  });
}

if (topStudioSaveDraftBtn) {
  topStudioSaveDraftBtn.addEventListener("click", () => saveTop("draft"));
}

if (topStudioSavePublishBtn) {
  topStudioSavePublishBtn.addEventListener("click", () => saveTop("published"));
}

if (topStudioDeleteBtn) {
  topStudioDeleteBtn.addEventListener("click", deleteCurrentTop);
}

document.addEventListener("keydown", (event) => {
  const isSaveShortcut = (event.ctrlKey || event.metaKey) && String(event.key || "").toLowerCase() === "s";
  if (!isSaveShortcut) return;
  if (topStudioWorkspace?.classList.contains("hidden")) return;
  event.preventDefault();
  saveTop(String(topStudioMetaForm?.elements?.status?.value || "draft"));
});

window.addEventListener("beforeunload", (event) => {
  if (!topFormDirty) return;
  event.preventDefault();
  event.returnValue = "";
});

if (window.ReviewsStore?.onAuthChanged) {
  window.ReviewsStore.onAuthChanged(async (user) => {
    toggleWorkspaceForAuth(user);
    if (user) {
      await loadTopReviewOptions();
      await tryLoadEditTop();
      refreshDeleteButtonState();
    }
  });
}

toggleWorkspaceForAuth(window.ReviewsStore?.getCurrentUser?.());
setTopItems([]);
updateAddItemButtonLabel();
refreshHeroPreview();
refreshDeleteButtonState();
loadTopReviewOptions().then(() => tryLoadEditTop());
