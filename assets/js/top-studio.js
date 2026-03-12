const menuToggle = document.getElementById("menu-toggle");
const menu = document.getElementById("menu");
const pageParams = new URLSearchParams(window.location.search);
const requestedEditTopId = String(pageParams.get("edit") || "").trim();

const topStudioCoverBg = document.getElementById("top-studio-cover-bg");
const topStudioTitleInput = document.getElementById("top-studio-title");
const topStudioSubtitleInput = document.getElementById("top-studio-subtitle");
const topStudioMetaForm = document.getElementById("top-studio-meta-form");
const topStudioItemsList = document.getElementById("top-studio-items-list");
const topStudioItemQueryInput = document.getElementById("top-studio-item-query");
const topStudioItemAddBtn = document.getElementById("top-studio-item-add");
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
const DEFAULT_POSTER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 900'><defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#1a2a36'/><stop offset='1' stop-color='#243b4a'/></linearGradient></defs><rect width='600' height='900' fill='url(#g)'/><text x='50%' y='50%' text-anchor='middle' fill='#b8c2cc' font-size='30' font-family='Arial, sans-serif'>Sans affiche</text></svg>"
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
let draggedTopItem = null;

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

function isTmdbCategory(category) {
  const key = String(category || "").trim().toLowerCase();
  return key === "film" || key === "serie" || key === "docu" || key === "documentaire";
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

async function getTmdbImageChoices(id, mediaType) {
  if (!TMDB_API_KEY || !id) return { posters: [], backdrops: [] };
  const type = mediaType === "tv" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/${type}/${encodeURIComponent(id)}/images?api_key=${TMDB_API_KEY}&include_image_language=fr,en,null`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("TMDB images failed");
  const data = await response.json();
  const posters = (Array.isArray(data?.posters) ? data.posters : [])
    .filter((img) => img?.file_path)
    .slice(0, 30)
    .map((img) => tmdbImageUrl(img.file_path, "w500"));
  const backdrops = (Array.isArray(data?.backdrops) ? data.backdrops : [])
    .filter((img) => img?.file_path)
    .slice(0, 30)
    .map((img) => tmdbImageUrl(img.file_path, "w1280"));
  return { posters, backdrops };
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

async function getIgdbImageChoices(id) {
  if (!id) return { posters: [], backdrops: [] };
  const response = await fetch(`/api/igdb?mode=images&id=${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error("IGDB images failed");
  const data = await response.json();
  return {
    posters: Array.isArray(data?.images?.posters) ? data.images.posters : [],
    backdrops: Array.isArray(data?.images?.backdrops) ? data.images.backdrops : []
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

function setupTopStudioItemAutocomplete() {
  if (!topStudioItemQueryInput) return;
  createTmdbAutocomplete(topStudioItemQueryInput, {
    getCategory: () => topStudioMetaForm?.elements?.category?.value || "",
    getMediaType: () => {
      const category = topStudioMetaForm?.elements?.category?.value || "";
      if (!["film", "serie"].includes(String(category).trim().toLowerCase())) return null;
      return tmdbMediaTypeFromCategory(category);
    },
    onSelect: async (choice) => {
      const item = {
        title: String(choice?.title || "").trim(),
        poster: String(choice?.poster || "").trim(),
        cover: String(choice?.cover || "").trim(),
        releaseYear: String(choice?.year || "").trim(),
        tmdbId: String(choice?.id || ""),
        tmdbMediaType: String(choice?.mediaType || "")
      };
      try {
        const details = choice.provider === "igdb"
          ? await getIgdbGameDetails(choice.id)
          : await getTmdbDetails(choice.id, choice.mediaType);
        if (details.title) item.title = details.title;
        if (details.poster) item.poster = details.poster;
        if (details.cover) item.cover = details.cover;
        if (details.year) item.releaseYear = details.year;
        if (details.director) item.director = details.director;
      } catch {
        // Keep base autocomplete values.
      }
      addTopItemCard(item);
      topStudioItemQueryInput.value = "";
      topStudioItemQueryInput.focus();
    }
  });
}

function markTopFormDirty() {
  if (!topStudioWorkspace || topStudioWorkspace.classList.contains("hidden")) return;
  topFormDirty = true;
}

function normalizeSearchValue(value) {
  return String(value || "").trim().toLowerCase();
}

function scoreToStars(score) {
  if (!Number.isFinite(Number(score))) return "";
  const value = Number(score);
  const full = Math.max(0, Math.min(5, Math.round(value / 2)));
  return "\u2605".repeat(full) + "\u2606".repeat(5 - full);
}

function formatScoreValue(score) {
  if (!Number.isFinite(Number(score))) return "";
  const value = Number(score);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function providerLabelForCategory(category) {
  if (isGameCategory(category)) return "IGDB";
  if (isTmdbCategory(category)) return "TMDB";
  return "";
}

function isIgdbMediaType(mediaType) {
  return String(mediaType || "").trim().toLowerCase().startsWith("igdb");
}

function normalizeTopFormItem(item = {}) {
  const noteValue = Number(item?.note);
  return {
    title: String(item?.title || "").trim(),
    comment: String(item?.comment || "").trim(),
    reviewId: String(item?.reviewId || "").trim(),
    poster: String(item?.poster || "").trim(),
    cover: String(item?.cover || "").trim(),
    releaseYear: String(item?.releaseYear || "").trim(),
    director: String(item?.director || "").trim(),
    tmdbId: String(item?.tmdbId || "").trim(),
    tmdbMediaType: String(item?.tmdbMediaType || "").trim(),
    note: Number.isFinite(noteValue) ? noteValue : null
  };
}

function openTopImagePicker(images, kindLabel, mode = "poster") {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-dialog studio-image-picker-dialog" role="dialog" aria-modal="true" aria-label="Choisir une image">
        <p class="confirm-title">Choisir ${kindLabel}</p>
        <div class="studio-image-picker-grid ${mode === "backdrop" ? "is-backdrop" : "is-poster"}"></div>
        <div class="confirm-actions">
          <button type="button" class="action-btn secondary" data-studio-picker-action="cancel">Annuler</button>
        </div>
      </div>
    `;
    const grid = overlay.querySelector(".studio-image-picker-grid");
    if (!grid) return resolve("");
    images.forEach((url) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "studio-image-choice";
      button.innerHTML = `<img src="${url}" alt="${kindLabel}" loading="lazy" />`;
      button.addEventListener("click", () => {
        cleanup();
        resolve(url);
      });
      grid.appendChild(button);
    });
    const cleanup = () => {
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
    };
    const close = () => {
      cleanup();
      resolve("");
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    overlay.querySelector('[data-studio-picker-action="cancel"]')?.addEventListener("click", close);
    document.addEventListener("keydown", onKeyDown);
    document.body.appendChild(overlay);
  });
}

function updateTopItemAssetButtons(row) {
  if (!row || !topStudioMetaForm) return;
  const category = String(topStudioMetaForm.elements.category?.value || "").trim().toLowerCase();
  const provider = providerLabelForCategory(category);
  const hasLinkedMedia = Boolean(row.querySelector(".top-tmdb-id")?.value);
  const posterValue = String(row.querySelector(".top-poster")?.value || "").trim();
  const coverValue = String(row.querySelector(".top-cover")?.value || "").trim();
  const posterBtn = row.querySelector(".top-item-poster-picker");
  const coverBtn = row.querySelector(".top-item-cover-picker");
  const posterFromProvider = provider === "IGDB"
    ? /images\.igdb\.com/i.test(posterValue)
    : /image\.tmdb\.org/i.test(posterValue);
  const coverFromProvider = provider === "IGDB"
    ? /images\.igdb\.com/i.test(coverValue)
    : /image\.tmdb\.org/i.test(coverValue);
  const enabled = Boolean(provider);
  if (posterBtn) {
    posterBtn.textContent = provider ? `Affiche via ${provider}${posterFromProvider ? " \u2713" : ""}` : "Affiche indisponible";
    posterBtn.disabled = !enabled || !hasLinkedMedia;
  }
  if (coverBtn) {
    coverBtn.textContent = provider ? `Couverture via ${provider}${coverFromProvider ? " \u2713" : ""}` : "Couverture indisponible";
    coverBtn.disabled = !enabled || !hasLinkedMedia;
  }
}

function updateAllTopItemAssetButtons() {
  if (!topStudioItemsList) return;
  [...topStudioItemsList.querySelectorAll(".top-form-item")].forEach((row) => {
    updateTopItemAssetButtons(row);
  });
}

async function ensureTopItemLinkedMedia(row) {
  if (!row || !topStudioMetaForm) return null;
  const savedId = String(row.querySelector(".top-tmdb-id")?.value || "").trim();
  const savedType = String(row.querySelector(".top-tmdb-media-type")?.value || "").trim();
  if (savedId) {
    return {
      id: savedId,
      mediaType: savedType || (isGameCategory(topStudioMetaForm.elements.category?.value) ? "igdb_game" : tmdbMediaTypeFromCategory(topStudioMetaForm.elements.category?.value)),
      provider: isIgdbMediaType(savedType) ? "igdb" : (isGameCategory(topStudioMetaForm.elements.category?.value) ? "igdb" : "tmdb")
    };
  }
  const title = String(row.querySelector(".top-title")?.value || "").trim();
  const category = String(topStudioMetaForm.elements.category?.value || "").trim().toLowerCase();
  if (!title) return null;
  try {
    if (isGameCategory(category)) {
      const results = await searchIgdbGames(title);
      const best = (results || []).find((entry) => String(entry.title || "").trim().toLowerCase() === title.toLowerCase()) || results[0];
      if (!best?.id) return null;
      row.querySelector(".top-tmdb-id").value = String(best.id || "");
      row.querySelector(".top-tmdb-media-type").value = String(best.mediaType || "igdb_game");
      return { id: String(best.id || ""), mediaType: String(best.mediaType || "igdb_game"), provider: "igdb" };
    }
    if (isTmdbCategory(category)) {
      const results = await searchTmdbTitles(title, tmdbMediaTypeFromCategory(category));
      const best = (results || []).find((entry) => String(entry.title || "").trim().toLowerCase() === title.toLowerCase()) || results[0];
      if (!best?.id) return null;
      row.querySelector(".top-tmdb-id").value = String(best.id || "");
      row.querySelector(".top-tmdb-media-type").value = String(best.mediaType || tmdbMediaTypeFromCategory(category));
      return { id: String(best.id || ""), mediaType: String(best.mediaType || tmdbMediaTypeFromCategory(category)), provider: "tmdb" };
    }
  } catch {
    return null;
  }
  return null;
}

function updateTopItemScoreDisplay(row) {
  if (!row) return;
  const noteInput = row.querySelector(".top-note");
  const scoreDisplay = row.querySelector(".top-score-display");
  if (!noteInput || !scoreDisplay) return;
  const raw = String(noteInput.value || "").trim();
  if (raw === "") {
    scoreDisplay.textContent = "";
    return;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    scoreDisplay.textContent = "";
    return;
  }
  scoreDisplay.textContent = `${scoreToStars(value)} (${formatScoreValue(value)}/10)`;
}

function topFormItemMeta(item) {
  const bits = [];
  if (item.releaseYear) bits.push(item.releaseYear);
  if (item.director) bits.push(item.director);
  return bits.join(" - ");
}

function refreshTopItemIndex() {
  if (!topStudioItemsList) return;
  [...topStudioItemsList.querySelectorAll(".top-form-item")].forEach((row, idx) => {
    const rank = row.querySelector(".top-poster-rank") || row.querySelector(".top-item-rank");
    if (rank) rank.textContent = String(idx + 1);
  });
}

function attachTopItemDragAndDrop(row) {
  if (!row || !topStudioItemsList) return;
  row.setAttribute("draggable", "true");
  row.addEventListener("dragstart", (event) => {
    draggedTopItem = row;
    row.classList.add("is-dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", "top-item");
    }
  });
  row.addEventListener("dragover", (event) => {
    if (!draggedTopItem || draggedTopItem === row) return;
    event.preventDefault();
    const rect = row.getBoundingClientRect();
    const shouldInsertAfter = event.clientY > rect.top + rect.height / 2;
    if (shouldInsertAfter) {
      topStudioItemsList.insertBefore(draggedTopItem, row.nextElementSibling);
    } else {
      topStudioItemsList.insertBefore(draggedTopItem, row);
    }
  });
  row.addEventListener("drop", (event) => {
    if (!draggedTopItem) return;
    event.preventDefault();
    refreshTopItemIndex();
    refreshHeroPreview();
    markTopFormDirty();
  });
  row.addEventListener("dragend", () => {
    row.classList.remove("is-dragging");
    draggedTopItem = null;
    refreshTopItemIndex();
  });
}

function addTopItemCard(item, options = {}) {
  if (!topStudioItemsList) return;
  const normalized = normalizeTopFormItem(item);
  if (!normalized.title && !normalized.reviewId) return;
  topStudioItemsList.appendChild(createTopItemRow(normalized));
  refreshTopItemIndex();
  refreshHeroPreview();
  if (options.markDirty !== false) markTopFormDirty();
}

async function fetchApiItemFromQuery(rawTitle) {
  const category = String(topStudioMetaForm?.elements?.category?.value || "").trim().toLowerCase();
  try {
    if (category === "jeu") {
      const results = await searchIgdbGames(rawTitle);
      const best = results[0];
      if (!best) return null;
      const details = await getIgdbGameDetails(best.id).catch(() => ({}));
      return {
        title: details.title || best.title || rawTitle,
        poster: details.poster || best.poster || "",
        cover: details.cover || best.cover || "",
        releaseYear: details.year || best.year || "",
        director: details.director || best.director || "",
        tmdbId: String(best.id || ""),
        tmdbMediaType: "igdb_game"
      };
    }
    if (category === "film" || category === "serie") {
      const mediaType = tmdbMediaTypeFromCategory(category);
      const results = await searchTmdbTitles(rawTitle, mediaType);
      const best = results[0];
      if (!best) return null;
      const details = await getTmdbDetails(best.id, best.mediaType).catch(() => ({}));
      return {
        title: details.title || best.title || rawTitle,
        poster: details.poster || best.poster || "",
        cover: details.cover || best.cover || "",
        releaseYear: details.year || best.year || "",
        director: details.director || "",
        tmdbId: String(best.id || ""),
        tmdbMediaType: String(best.mediaType || "")
      };
    }
  } catch {
    // Fallback handled by caller.
  }
  return null;
}

async function addTopItemFromQuery() {
  if (!topStudioItemQueryInput) return;
  const rawTitle = String(topStudioItemQueryInput.value || "").trim();
  if (!rawTitle) return;

  const normalizedCategory = String(topStudioMetaForm?.elements?.category?.value || "").trim().toLowerCase();
  const normalizedTitle = normalizeSearchValue(rawTitle);
  const linkedReview = cachedReviews.find((review) => {
    if (normalizeSearchValue(review?.title) !== normalizedTitle) return false;
    if (normalizedCategory === "autre") return true;
    return String(review?.category || "").trim().toLowerCase() === normalizedCategory;
  });

  if (linkedReview) {
    addTopItemCard({
      reviewId: linkedReview.id,
      title: linkedReview.title || rawTitle,
      poster: linkedReview.poster || linkedReview.cover || "",
      cover: linkedReview.cover || "",
      releaseYear: linkedReview.releaseYear || extractYear(linkedReview.date),
      director: String(linkedReview.director || linkedReview.studio || linkedReview.author || "").trim(),
      note: Number.isFinite(Number(linkedReview.score)) ? Number(linkedReview.score) : null,
      tmdbId: String(linkedReview.tmdbId || "").trim(),
      tmdbMediaType: String(linkedReview.tmdbMediaType || "").trim()
    });
  } else {
    const apiItem = await fetchApiItemFromQuery(rawTitle);
    if (apiItem) addTopItemCard(apiItem);
    else addTopItemCard({ title: rawTitle });
  }

  topStudioItemQueryInput.value = "";
  topStudioItemQueryInput.focus();
}

function createTopItemRow(item = { title: "", comment: "", note: null, reviewId: "", poster: "", cover: "", releaseYear: "", director: "", tmdbId: "", tmdbMediaType: "" }) {
  const normalized = normalizeTopFormItem(item);
  const meta = topFormItemMeta(normalized);
  const scoreText = Number.isFinite(Number(normalized.note))
    ? `${scoreToStars(Number(normalized.note))} (${formatScoreValue(Number(normalized.note))}/10)`
    : "";
  const row = document.createElement("div");
  row.className = "top-form-item top-item top-item-detail";
  row.innerHTML = `
    <div class="top-item-head">
      <span class="top-item-rank">1</span>
      <img class="top-item-poster-img" src="${escapeHtml(normalized.poster || DEFAULT_POSTER)}" alt="${escapeHtml(normalized.title || "Item")}" />
      <div class="top-item-main">
        <div class="top-item-title-row">
          <h3>${escapeHtml(normalized.title || "Sans titre")}</h3>
          <div class="top-form-item-actions row-actions">
            <button type="button" class="action-btn danger top-delete top-delete-icon" aria-label="Supprimer l'item" title="Supprimer l'item">&times;</button>
          </div>
        </div>
        <p class="top-item-meta">${escapeHtml(meta)}</p>
        <div class="top-item-fields">
          <div class="top-item-note">
            <label class="studio-meta-chip">
              <span>Note</span>
              <input class="top-note" type="number" min="0" max="10" step="0.1" placeholder="/10" value="${Number.isFinite(Number(normalized.note)) ? String(Number(normalized.note)) : ""}" />
            </label>
          </div>
          <p class="score top-score-display top-item-score">${escapeHtml(scoreText)}</p>
          <div class="top-item-asset top-item-asset-poster">
            <button type="button" class="action-btn secondary top-item-poster-picker">Affiche via TMDB</button>
            <label class="studio-meta-chip">
              <span>Affiche URL</span>
              <input class="top-poster" type="url" placeholder="https://..." value="${escapeHtml(normalized.poster)}" />
            </label>
          </div>
          <div class="top-item-asset top-item-asset-cover">
            <button type="button" class="action-btn secondary top-item-cover-picker">Couverture via TMDB</button>
            <label class="studio-meta-chip">
              <span>Couverture URL</span>
              <input class="top-cover" type="url" placeholder="https://..." value="${escapeHtml(normalized.cover)}" />
            </label>
          </div>
        </div>
      </div>
    </div>
    <input class="top-review-id" type="hidden" value="${escapeHtml(normalized.reviewId)}" />
    <input class="top-title" type="hidden" value="${escapeHtml(normalized.title)}" />
    <input class="top-comment" type="hidden" value="${escapeHtml(normalized.comment)}" />
    <input class="top-release-year" type="hidden" value="${escapeHtml(normalized.releaseYear)}" />
    <input class="top-director" type="hidden" value="${escapeHtml(normalized.director)}" />
    <input class="top-tmdb-id" type="hidden" value="${escapeHtml(normalized.tmdbId)}" />
    <input class="top-tmdb-media-type" type="hidden" value="${escapeHtml(normalized.tmdbMediaType)}" />
  `;

  row.querySelector(".top-delete")?.addEventListener("click", () => {
    row.remove();
    refreshTopItemIndex();
    refreshHeroPreview();
    markTopFormDirty();
  });
  const noteInput = row.querySelector(".top-note");
  const posterInput = row.querySelector(".top-poster");
  const coverInput = row.querySelector(".top-cover");
  const posterImage = row.querySelector(".top-item-poster-img");
  const posterPickerBtn = row.querySelector(".top-item-poster-picker");
  const coverPickerBtn = row.querySelector(".top-item-cover-picker");

  if (noteInput) {
    noteInput.addEventListener("input", () => {
      updateTopItemScoreDisplay(row);
      markTopFormDirty();
    });
  }

  if (posterInput) {
    posterInput.addEventListener("input", () => {
      if (posterImage) posterImage.src = posterInput.value.trim() || DEFAULT_POSTER;
      updateTopItemAssetButtons(row);
      refreshHeroPreview();
      markTopFormDirty();
    });
  }

  if (coverInput) {
    coverInput.addEventListener("input", () => {
      updateTopItemAssetButtons(row);
      refreshHeroPreview();
      markTopFormDirty();
    });
  }

  if (posterPickerBtn && posterInput) {
    posterPickerBtn.addEventListener("click", async () => {
      const linked = await ensureTopItemLinkedMedia(row);
      if (!linked?.id) {
        window.alert("Aucune source TMDB/IGDB trouv\u00E9e pour cet item.");
        return;
      }
      try {
        const useIgdb = linked.provider === "igdb" || isIgdbMediaType(linked.mediaType);
        const images = useIgdb
          ? await getIgdbImageChoices(linked.id)
          : await getTmdbImageChoices(linked.id, linked.mediaType);
        if (!Array.isArray(images.posters) || !images.posters.length) {
          window.alert("Aucune affiche disponible.");
          return;
        }
        const selected = await openTopImagePicker(images.posters || [], "une affiche", "poster");
        if (!selected) return;
        posterInput.value = selected;
        if (posterImage) posterImage.src = selected;
        updateTopItemAssetButtons(row);
        refreshHeroPreview();
        markTopFormDirty();
      } catch {
        window.alert("Impossible de charger les affiches.");
      }
    });
  }

  if (coverPickerBtn && coverInput) {
    coverPickerBtn.addEventListener("click", async () => {
      const linked = await ensureTopItemLinkedMedia(row);
      if (!linked?.id) {
        window.alert("Aucune source TMDB/IGDB trouv\u00E9e pour cet item.");
        return;
      }
      try {
        const useIgdb = linked.provider === "igdb" || isIgdbMediaType(linked.mediaType);
        const images = useIgdb
          ? await getIgdbImageChoices(linked.id)
          : await getTmdbImageChoices(linked.id, linked.mediaType);
        if (!Array.isArray(images.backdrops) || !images.backdrops.length) {
          window.alert("Aucune couverture disponible.");
          return;
        }
        const selected = await openTopImagePicker(images.backdrops || [], "une couverture", "backdrop");
        if (!selected) return;
        coverInput.value = selected;
        updateTopItemAssetButtons(row);
        refreshHeroPreview();
        markTopFormDirty();
      } catch {
        window.alert("Impossible de charger les couvertures.");
      }
    });
  }

  updateTopItemAssetButtons(row);
  attachTopItemDragAndDrop(row);

  return row;
}

function setTopItems(items) {
  if (!topStudioItemsList) return;
  topStudioItemsList.innerHTML = "";
  if (Array.isArray(items) && items.length) {
    items.forEach((item) => addTopItemCard(item, { markDirty: false }));
  }
  refreshTopItemIndex();
  refreshHeroPreview();
}

function readTopItems() {
  if (!topStudioItemsList) return [];
  return [...topStudioItemsList.querySelectorAll(".top-form-item")]
    .map((row) => {
      const noteRaw = row.querySelector(".top-note")?.value || "";
      const parsedNote = noteRaw === "" ? null : Number(noteRaw);
      return {
        reviewId: row.querySelector(".top-review-id")?.value || "",
        title: row.querySelector(".top-title")?.value || "",
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
  if (!topStudioCoverBg) return;
  const firstCard = topStudioItemsList?.querySelector(".top-form-item");
  const firstCover = String(firstCard?.querySelector(".top-cover")?.value || "").trim();
  const firstPoster = String(firstCard?.querySelector(".top-poster")?.value || "").trim();
  topStudioCoverBg.src = firstCover || firstPoster || loadedTopSnapshot?.cover || DEFAULT_COVER;
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
  if (topStudioItemQueryInput) topStudioItemQueryInput.value = "";
  setTopItems(top?.items || []);
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
  const status = statusOverride || "draft";
  const items = readTopItems();
  const derivedCover = String(items[0]?.cover || items[0]?.poster || base.cover || "").trim();
  return {
    id: editingTopId || window.ReviewsStore.slugify(title),
    title,
    subtitle: String(topStudioSubtitleInput?.value || "").trim(),
    category: String(topStudioMetaForm.elements.category.value || "film"),
    status,
    year: String(topStudioMetaForm.elements.year?.value || "").trim(),
    cover: derivedCover,
    items,
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
    updateAllTopItemAssetButtons();
  });
  topStudioMetaForm.addEventListener("change", () => {
    markTopFormDirty();
    refreshHeroPreview();
    updateAllTopItemAssetButtons();
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

if (topStudioItemAddBtn) {
  topStudioItemAddBtn.addEventListener("click", () => {
    addTopItemFromQuery();
  });
}
if (topStudioItemQueryInput) {
  topStudioItemQueryInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addTopItemFromQuery();
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
  saveTop("draft");
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
setupTopStudioItemAutocomplete();
refreshHeroPreview();
refreshDeleteButtonState();
loadTopReviewOptions().then(() => tryLoadEditTop());
