window.ReviewsStore = (() => {
  const categories = {
    jeu: "Jeu-vidéo",
    film: "Film",
    serie: "Série",
    musique: "Musique",
    livre: "Livre",
    autre: "Autre"
  };

  const reviewCollection = "reviews";
  const topCollection = "tops";
  const usersCollection = "users";
  const ADMIN_USERNAME = "admin";
  const USERNAME_RE = /^[a-z0-9._-]{3,24}$/;
  const STATUS_PUBLISHED = "published";
  const STATUS_DRAFT = "draft";

  let firebaseReady = false;
  let db;
  let auth;
  let cfg;

  function ensureFirebase() {
    if (firebaseReady) return;

    if (!window.firebase) {
      throw new Error("Firebase SDK non chargé");
    }

    cfg = window.GROSZIZOU_FIREBASE_CONFIG || {};
    if (!cfg.apiKey || !cfg.projectId) {
      throw new Error("Config Firebase manquante (assets/js/firebase-config.js)");
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(cfg);
    }

    db = firebase.firestore();
    auth = firebase.auth();
    firebaseReady = true;
  }

  function slugify(value) {
    const result = String(value || "item")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    return result || `${Date.now()}`;
  }

  function normalizeUsername(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeStatus(value) {
    return String(value || "").trim().toLowerCase() === STATUS_DRAFT ? STATUS_DRAFT : STATUS_PUBLISHED;
  }

  function usernameToEmail(username) {
    return `${username}@groszizou.local`;
  }

  function validateCredentials(username, password) {
    const cleanUsername = normalizeUsername(username);
    const cleanPassword = String(password || "");
    if (!USERNAME_RE.test(cleanUsername)) {
      throw new Error("Nom d'utilisateur invalide (3-24 caractères: a-z, 0-9, ., _, -)");
    }
    if (cleanPassword.length < 4) {
      throw new Error("Mot de passe trop court (minimum 4 caractères)");
    }
    return { username: cleanUsername, password: cleanPassword };
  }

  async function findProfileByUsername(username) {
    ensureFirebase();
    const clean = normalizeUsername(username);
    if (!clean) return null;
    const snap = await db.collection(usersCollection).where("lowerUsername", "==", clean).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const data = doc.data() || {};
    return {
      uid: doc.id,
      username: String(data.username || clean).trim().toLowerCase(),
      email: String(data.email || "")
    };
  }

  function readUsernameFromUser(user) {
    if (!user) return "";
    if (user.displayName) return normalizeUsername(user.displayName);
    const email = String(user.email || "");
    const atIndex = email.indexOf("@");
    if (atIndex > 0) return normalizeUsername(email.slice(0, atIndex));
    return "";
  }

  function getCurrentUser() {
    ensureFirebase();
    const user = auth.currentUser;
    if (!user) return null;
    return {
      uid: user.uid,
      username: readUsernameFromUser(user),
      email: user.email || ""
    };
  }

  function normalizeBlock(raw) {
    if (!raw || !raw.type) return null;
    const normalized = {
      type: raw.type,
      content: raw.content || "",
      url: raw.url || "",
      caption: raw.caption || ""
    };
    if ("url2" in raw) normalized.url2 = raw.url2 || "";
    if ("caption2" in raw) normalized.caption2 = raw.caption2 || "";
    return normalized;
  }

  function normalizeReview(review) {
    const blocks = Array.isArray(review.blocks)
      ? review.blocks.map(normalizeBlock).filter(Boolean)
      : [];
    const externalLinks = Array.isArray(review.externalLinks)
      ? review.externalLinks
        .map((entry) => ({
          label: String(entry?.label || "").trim(),
          url: String(entry?.url || "").trim()
        }))
        .filter((entry) => entry.label && entry.url)
      : [];

    return {
      id: review.id || slugify(review.title),
      title: review.title || "Sans titre",
      category: review.category || "jeu",
      date: review.date || "",
      score: Number.isFinite(Number(review.score)) ? Number(review.score) : null,
      cover: review.cover || "",
      poster: review.poster || "",
      accent: review.accent || "",
      summary: review.summary || "",
      author: review.author || "",
      director: review.director || "",
      studio: review.studio || "",
      releaseYear: review.releaseYear || "",
      genre: review.genre || "",
      bgMusic: review.bgMusic || "",
      status: normalizeStatus(review.status),
      ownerId: review.ownerId || "",
      ownerUsername: review.ownerUsername || "",
      contentMode: review.contentMode || (review.bodyHtml ? "rich" : "blocks"),
      bodyHtml: review.bodyHtml || "",
      externalLinks,
      blocks,
      updatedAt: typeof review.updatedAt === "number" ? review.updatedAt : Date.now()
    };
  }

  function normalizeTopItem(item) {
    if (!item) return null;
    const title = item.title || "";
    const reviewId = item.reviewId || "";
    if (!title && !reviewId) return null;
    return {
      title,
      comment: item.comment || "",
      reviewId
    };
  }

  function normalizeTop(top) {
    const items = Array.isArray(top.items)
      ? top.items.map(normalizeTopItem).filter(Boolean)
      : [];

    return {
      id: top.id || slugify(top.title),
      title: top.title || "Sans titre",
      subtitle: top.subtitle || "",
      category: top.category || "autre",
      year: top.year || "",
      status: normalizeStatus(top.status),
      ownerId: top.ownerId || "",
      ownerUsername: top.ownerUsername || "",
      items,
      updatedAt: typeof top.updatedAt === "number" ? top.updatedAt : Date.now()
    };
  }

  async function getUserProfile(uid) {
    ensureFirebase();
    if (!uid) return null;
    const doc = await db.collection(usersCollection).doc(uid).get();
    if (!doc.exists) return null;
    const data = doc.data() || {};
    return {
      uid,
      username: String(data.username || "").trim().toLowerCase()
    };
  }

  async function getProfilesByIds(ids) {
    ensureFirebase();
    const uniq = [...new Set((ids || []).filter(Boolean))];
    if (!uniq.length) return {};
    const out = {};
    await Promise.all(
      uniq.map(async (uid) => {
        const profile = await getUserProfile(uid);
        if (profile) out[uid] = profile;
      })
    );
    return out;
  }

  async function updateCurrentUserProfile(profilePatch = {}) {
    const current = requireAuth();
    const patch = {};
    if ("username" in profilePatch) {
      patch.username = normalizeUsername(profilePatch.username);
      if (!USERNAME_RE.test(patch.username)) {
        throw new Error("Nom d'utilisateur invalide (3-24 caractères: a-z, 0-9, ., _, -)");
      }
      try {
        const existing = await findProfileByUsername(patch.username);
        if (existing && existing.uid !== current.uid) {
          throw new Error("Nom d'utilisateur déjà utilisé");
        }
      } catch {
        // If rules block read on users collection, skip uniqueness check.
      }
    }
    if (!("username" in patch)) patch.username = current.username || "";
    patch.lowerUsername = patch.username;
    patch.email = current.email || auth.currentUser?.email || "";
    patch.updatedAt = Date.now();
    try {
      await db.collection(usersCollection).doc(current.uid).set(patch, { merge: true });
    } catch {
      // Optional persistence; auth profile remains source of truth.
    }
    if ("username" in patch) {
      await auth.currentUser.updateProfile({
        displayName: patch.username || current.username || ""
      });
    }
    const user = getCurrentUser();
    return {
      uid: current.uid,
      username: user?.username || patch.username || ""
    };
  }

  async function changeCurrentUsername(newUsername, currentPassword) {
    ensureFirebase();
    const current = requireAuth();
    const username = normalizeUsername(newUsername);
    const password = String(currentPassword || "");
    if (!USERNAME_RE.test(username)) {
      throw new Error("Nom d'utilisateur invalide (3-24 caractères: a-z, 0-9, ., _, -)");
    }
    if (!password) {
      throw new Error("Mot de passe actuel requis");
    }

    const emailProvider = firebase.auth.EmailAuthProvider;
    const currentEmail = auth.currentUser?.email || current.email || "";
    const credential = emailProvider.credential(currentEmail, password);
    await auth.currentUser.reauthenticateWithCredential(credential);

    await auth.currentUser.updateProfile({
      displayName: username,
      photoURL: auth.currentUser.photoURL || ""
    });

    try {
      const existing = await findProfileByUsername(username);
      if (existing && existing.uid !== current.uid) {
        throw new Error("Nom d'utilisateur déjà utilisé");
      }
    } catch {
      // ignore read errors due to rules
    }

    try {
      await db.collection(usersCollection).doc(current.uid).set(
        {
          username,
          lowerUsername: username,
          email: currentEmail,
          updatedAt: Date.now()
        },
        { merge: true }
      );
    } catch {
      // optional persistence
    }

    return getCurrentUser();
  }

  async function changeCurrentUserPassword(currentPassword, newPassword) {
    ensureFirebase();
    const current = requireAuth();
    const oldPwd = String(currentPassword || "");
    const nextPwd = String(newPassword || "");
    if (!oldPwd) {
      throw new Error("Mot de passe actuel requis");
    }
    if (nextPwd.length < 4) {
      throw new Error("Nouveau mot de passe trop court (minimum 4 caractères)");
    }

    const emailProvider = firebase.auth.EmailAuthProvider;
    const currentEmail = auth.currentUser?.email || current.email || "";
    const credential = emailProvider.credential(currentEmail, oldPwd);
    await auth.currentUser.reauthenticateWithCredential(credential);
    await auth.currentUser.updatePassword(nextPwd);
    return { ok: true };
  }

  function requireAuth() {
    ensureFirebase();
    const current = getCurrentUser();
    if (!current) {
      throw new Error("Connexion requise pour modifier");
    }
    return current;
  }

  function isAdminUser(user) {
    return normalizeUsername(user?.username || "") === ADMIN_USERNAME;
  }

  async function getAll(options = {}) {
    ensureFirebase();
    let query = db.collection(reviewCollection);
    if (options.ownerId) {
      query = query.where("ownerId", "==", options.ownerId);
    }
    const snap = await query.get();
    const normalized = snap.docs
      .map((doc) => normalizeReview({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const expectedStatus = options.status ? normalizeStatus(options.status) : "";
    if (expectedStatus) {
      return normalized.filter((item) => normalizeStatus(item.status) === expectedStatus);
    }
    return normalized;
  }

  async function getById(id) {
    ensureFirebase();
    const doc = await db.collection(reviewCollection).doc(id).get();
    if (!doc.exists) throw new Error("Not found");
    return normalizeReview({ id: doc.id, ...doc.data() });
  }

  async function upsert(review) {
    const current = requireAuth();
    const isAdmin = isAdminUser(current);
    const normalized = normalizeReview(review);
    const ref = db.collection(reviewCollection).doc(normalized.id);
    const existing = await ref.get();
    if (existing.exists) {
      const data = existing.data() || {};
      if (!isAdmin && data.ownerId && data.ownerId !== current.uid) {
        throw new Error("Cette review appartient à un autre utilisateur");
      }
      if (isAdmin && data.ownerId) {
        normalized.ownerId = data.ownerId;
        normalized.ownerUsername = data.ownerUsername || normalized.ownerUsername;
      }
    }
    if (!normalized.ownerId) {
      normalized.ownerId = current.uid;
      normalized.ownerUsername = current.username || "";
    }
    await ref.set(normalized, { merge: true });
    return { ok: true, id: normalized.id };
  }

  async function remove(id) {
    const current = requireAuth();
    const isAdmin = isAdminUser(current);
    const ref = db.collection(reviewCollection).doc(id);
    const existing = await ref.get();
    if (!existing.exists) return { ok: true };
    const data = existing.data() || {};
    if (!isAdmin && data.ownerId && data.ownerId !== current.uid) {
      throw new Error("Suppression impossible: cette review appartient à un autre utilisateur");
    }
    await ref.delete();
    return { ok: true };
  }

  async function getAllTops(options = {}) {
    ensureFirebase();
    let query = db.collection(topCollection);
    if (options.ownerId) {
      query = query.where("ownerId", "==", options.ownerId);
    }
    const snap = await query.get();
    const normalized = snap.docs
      .map((doc) => normalizeTop({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const expectedStatus = options.status ? normalizeStatus(options.status) : "";
    if (expectedStatus) {
      return normalized.filter((item) => normalizeStatus(item.status) === expectedStatus);
    }
    return normalized;
  }

  async function getTopById(id) {
    ensureFirebase();
    const doc = await db.collection(topCollection).doc(id).get();
    if (!doc.exists) throw new Error("Not found");
    return normalizeTop({ id: doc.id, ...doc.data() });
  }

  async function upsertTop(top) {
    const current = requireAuth();
    const isAdmin = isAdminUser(current);
    const normalized = normalizeTop(top);
    const ref = db.collection(topCollection).doc(normalized.id);
    const existing = await ref.get();
    if (existing.exists) {
      const data = existing.data() || {};
      if (!isAdmin && data.ownerId && data.ownerId !== current.uid) {
        throw new Error("Ce top appartient à un autre utilisateur");
      }
      if (isAdmin && data.ownerId) {
        normalized.ownerId = data.ownerId;
        normalized.ownerUsername = data.ownerUsername || normalized.ownerUsername;
      }
    }
    if (!normalized.ownerId) {
      normalized.ownerId = current.uid;
      normalized.ownerUsername = current.username || "";
    }
    await ref.set(normalized, { merge: true });
    return { ok: true, id: normalized.id };
  }

  async function removeTop(id) {
    const current = requireAuth();
    const isAdmin = isAdminUser(current);
    const ref = db.collection(topCollection).doc(id);
    const existing = await ref.get();
    if (!existing.exists) return { ok: true };
    const data = existing.data() || {};
    if (!isAdmin && data.ownerId && data.ownerId !== current.uid) {
      throw new Error("Suppression impossible: ce top appartient à un autre utilisateur");
    }
    await ref.delete();
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

  async function registerWithCredentials(username, password) {
    ensureFirebase();
    const valid = validateCredentials(username, password);
    try {
      const existing = await findProfileByUsername(valid.username);
      if (existing) {
        throw new Error("Nom d'utilisateur déjà utilisé");
      }
    } catch {
      // If rules block read on users collection, continue with auth-only creation.
    }
    const email = usernameToEmail(valid.username);
    const cred = await auth.createUserWithEmailAndPassword(email, valid.password);
    if (cred.user) {
      await cred.user.updateProfile({ displayName: valid.username });
      try {
        await db.collection(usersCollection).doc(cred.user.uid).set(
          {
            username: valid.username,
            lowerUsername: valid.username,
            email,
            createdAt: Date.now()
          },
          { merge: true }
        );
      } catch {
        // Optional persistence; auth profile remains source of truth.
      }
    }
    return { ok: true };
  }

  async function loginWithCredentials(username, password) {
    ensureFirebase();
    const valid = validateCredentials(username, password);
    let email = usernameToEmail(valid.username);
    try {
      const profile = await findProfileByUsername(valid.username);
      email = profile?.email || email;
    } catch {
      // If Firestore rules block anonymous reads, fallback to deterministic email.
    }
    return auth.signInWithEmailAndPassword(email, valid.password);
  }

  async function signOut() {
    ensureFirebase();
    return auth.signOut();
  }

  function onAuthChanged(callback) {
    ensureFirebase();
    return auth.onAuthStateChanged(callback);
  }

  return {
    categories,
    slugify,
    getAll,
    getById,
    upsert,
    remove,
    getAllTops,
    getTopById,
    upsertTop,
    removeTop,
    exportJson,
    importJson,
    registerWithCredentials,
    loginWithCredentials,
    getCurrentUser,
    getUserProfile,
    getProfilesByIds,
    updateCurrentUserProfile,
    changeCurrentUsername,
    changeCurrentUserPassword,
    signOut,
    onAuthChanged
  };
})();
