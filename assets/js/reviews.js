window.ReviewsStore = (() => {
  const categories = {
    jeu: "Jeu video",
    film: "Film",
    serie: "Serie",
    musique: "Musique",
    livre: "Livre"
  };

  const collectionName = "reviews";
  let firebaseReady = false;
  let db;
  let storage;
  let auth;

  function ensureFirebase() {
    if (firebaseReady) return;

    if (!window.firebase) {
      throw new Error("Firebase SDK non charge");
    }

    const cfg = window.GROSZIZOU_FIREBASE_CONFIG || {};
    if (!cfg.apiKey || !cfg.projectId) {
      throw new Error("Config Firebase manquante (assets/js/firebase-config.js)");
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(cfg);
    }

    db = firebase.firestore();
    storage = firebase.storage();
    auth = firebase.auth();
    firebaseReady = true;
  }

  function slugify(value) {
    const result = String(value || "review")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    return result || `review-${Date.now()}`;
  }

  function normalize(review) {
    return {
      id: review.id || slugify(review.title),
      title: review.title || "Sans titre",
      category: review.category || "jeu",
      date: review.date || "",
      score: Number.isFinite(Number(review.score)) ? Number(review.score) : null,
      cover: review.cover || "",
      accent: review.accent || "",
      summary: review.summary || "",
      body: review.body || "",
      tags: Array.isArray(review.tags) ? review.tags : [],
      media: Array.isArray(review.media) ? review.media : [],
      updatedAt: Date.now()
    };
  }

  async function getAll() {
    ensureFirebase();
    const snap = await db.collection(collectionName).orderBy("updatedAt", "desc").get();
    return snap.docs.map((doc) => normalize({ id: doc.id, ...doc.data() }));
  }

  async function getById(id) {
    ensureFirebase();
    const doc = await db.collection(collectionName).doc(id).get();
    if (!doc.exists) throw new Error("Not found");
    return normalize({ id: doc.id, ...doc.data() });
  }

  function requireAuth() {
    ensureFirebase();
    if (!auth.currentUser) {
      throw new Error("Connecte-toi sur la page Modifier pour ecrire");
    }
  }

  async function upsert(review) {
    requireAuth();
    const normalized = normalize(review);
    await db.collection(collectionName).doc(normalized.id).set(normalized, { merge: true });
    return { ok: true, id: normalized.id };
  }

  async function remove(id) {
    requireAuth();
    await db.collection(collectionName).doc(id).delete();
    return { ok: true };
  }

  async function exportJson() {
    const all = await getAll();
    return JSON.stringify(all, null, 2);
  }

  async function importJson(text) {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("JSON must be an array");
    requireAuth();

    let count = 0;
    for (const item of parsed) {
      await upsert(item);
      count += 1;
    }
    return count;
  }

  async function uploadFile(file) {
    requireAuth();
    const safeName = String(file.name || "media.bin").replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `reviews/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const ref = storage.ref(path);
    await ref.put(file, { contentType: file.type || "application/octet-stream" });
    return ref.getDownloadURL();
  }

  async function signIn(email, password) {
    ensureFirebase();
    return auth.signInWithEmailAndPassword(email, password);
  }

  async function signOut() {
    ensureFirebase();
    return auth.signOut();
  }

  function onAuthChanged(callback) {
    ensureFirebase();
    return auth.onAuthStateChanged(callback);
  }

  function getCurrentUser() {
    ensureFirebase();
    return auth.currentUser;
  }

  return {
    categories,
    slugify,
    getAll,
    getById,
    upsert,
    remove,
    exportJson,
    importJson,
    uploadFile,
    signIn,
    signOut,
    onAuthChanged,
    getCurrentUser
  };
})();
