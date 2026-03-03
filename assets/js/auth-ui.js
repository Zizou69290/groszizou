(() => {
  const slot = document.getElementById("auth-menu-slot");
  if (!slot || !window.ReviewsStore) return;

  let panelOpen = false;
  let currentUser = null;
  let currentProfile = null;

  const escapeHtml = (text) =>
    String(text || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  function avatarMarkup(username, avatarUrl) {
    if (avatarUrl) {
      return `<img class="auth-nav-avatar" src="${escapeHtml(avatarUrl)}" alt="Profil de ${escapeHtml(username || "utilisateur")}" />`;
    }
    const initial = String(username || "?").slice(0, 1).toUpperCase();
    return `<span class="auth-nav-avatar auth-nav-avatar-fallback">${escapeHtml(initial)}</span>`;
  }

  function closePanel() {
    panelOpen = false;
    render();
  }

  function renderPanelContent() {
    if (!currentUser) {
      return `
        <div class="auth-popover-title">Connexion</div>
        <label class="auth-popover-field">Nom d'utilisateur
          <input id="auth-pop-user" type="text" autocomplete="username" placeholder="ex: groszizou" />
        </label>
        <label class="auth-popover-field">Mot de passe
          <input id="auth-pop-pass" type="password" autocomplete="current-password" placeholder="Minimum 4 caracteres" />
        </label>
        <div class="auth-popover-actions">
          <button id="auth-pop-login" class="action-btn">Connexion</button>
          <button id="auth-pop-register" class="action-btn secondary">Creer un compte</button>
        </div>
      `;
    }

    const username = currentProfile?.username || currentUser.username || "";
    const avatarUrl = currentProfile?.avatarUrl || currentUser.avatarUrl || "";
    return `
      <div class="auth-popover-title">Mon profil</div>
      <p class="auth-popover-meta">@${escapeHtml(username || "utilisateur")}</p>
      <label class="auth-popover-field">Nom d'utilisateur
        <input id="auth-pop-new-user" type="text" value="${escapeHtml(username)}" />
      </label>
      <label class="auth-popover-field">Icone profil (URL)
        <input id="auth-pop-avatar" type="url" value="${escapeHtml(avatarUrl)}" placeholder="https://..." />
      </label>
      <div class="auth-popover-actions">
        <button id="auth-pop-save" class="action-btn secondary">Enregistrer</button>
        <a href="modifier.html" class="action-btn secondary">Mes contenus</a>
        <button id="auth-pop-logout" class="action-btn secondary">Deconnexion</button>
      </div>
    `;
  }

  function wireEvents() {
    const toggleBtn = slot.querySelector("#auth-nav-toggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        panelOpen = !panelOpen;
        render();
      });
    }

    const panel = slot.querySelector(".auth-popover");
    if (panel) {
      panel.addEventListener("click", (event) => event.stopPropagation());
    }

    const loginBtn = slot.querySelector("#auth-pop-login");
    const registerBtn = slot.querySelector("#auth-pop-register");
    const logoutBtn = slot.querySelector("#auth-pop-logout");
    const saveBtn = slot.querySelector("#auth-pop-save");

    if (loginBtn) {
      loginBtn.addEventListener("click", async () => {
        const username = slot.querySelector("#auth-pop-user")?.value || "";
        const password = slot.querySelector("#auth-pop-pass")?.value || "";
        try {
          await window.ReviewsStore.loginWithCredentials(username, password);
          panelOpen = false;
        } catch (error) {
          window.alert(`Connexion impossible : ${error.message}`);
        }
      });
    }

    if (registerBtn) {
      registerBtn.addEventListener("click", async () => {
        const username = slot.querySelector("#auth-pop-user")?.value || "";
        const password = slot.querySelector("#auth-pop-pass")?.value || "";
        try {
          await window.ReviewsStore.registerWithCredentials(username, password);
          panelOpen = false;
        } catch (error) {
          window.alert(`Inscription impossible : ${error.message}`);
        }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        const username = slot.querySelector("#auth-pop-new-user")?.value || "";
        const avatarUrl = slot.querySelector("#auth-pop-avatar")?.value || "";
        try {
          currentProfile = await window.ReviewsStore.updateCurrentUserProfile({ username, avatarUrl });
          currentUser = window.ReviewsStore.getCurrentUser();
          panelOpen = false;
          render();
          window.alert("Profil mis a jour.");
        } catch (error) {
          window.alert(`Mise a jour impossible : ${error.message}`);
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        try {
          await window.ReviewsStore.signOut();
          panelOpen = false;
        } catch (error) {
          window.alert(`Deconnexion impossible : ${error.message}`);
        }
      });
    }
  }

  function render() {
    const username = currentProfile?.username || currentUser?.username || "";
    const avatarUrl = currentProfile?.avatarUrl || currentUser?.avatarUrl || "";
    const label = currentUser ? avatarMarkup(username, avatarUrl) : "Connexion";

    slot.innerHTML = `
      <button id="auth-nav-toggle" class="auth-nav-btn" type="button" aria-expanded="${panelOpen ? "true" : "false"}">
        ${label}
      </button>
      ${panelOpen ? `<div class="auth-popover">${renderPanelContent()}</div>` : ""}
    `;
    wireEvents();
  }

  document.addEventListener("click", () => {
    if (!panelOpen) return;
    closePanel();
  });

  window.ReviewsStore.onAuthChanged(async () => {
    currentUser = window.ReviewsStore.getCurrentUser();
    currentProfile = null;
    if (currentUser?.uid) {
      try {
        currentProfile = await window.ReviewsStore.getUserProfile(currentUser.uid);
      } catch {
        currentProfile = null;
      }
    }
    render();
  });

  currentUser = window.ReviewsStore.getCurrentUser();
  render();
})();
