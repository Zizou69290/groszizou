(() => {
  const slot = document.getElementById("auth-menu-slot");
  if (!slot || !window.ReviewsStore) return;

  let panelOpen = false;
  let currentUser = null;
  let currentProfile = null;
  let editState = { username: false, avatar: false, password: false };

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

  function renderGuestPanel() {
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

  function renderUserPanel() {
    const username = currentProfile?.username || currentUser?.username || "";
    const avatarUrl = currentProfile?.avatarUrl || currentUser?.avatarUrl || "";

    return `
      <div class="auth-popover-title">Mon profil</div>
      <p class="auth-popover-meta">${avatarMarkup(username, avatarUrl)}<span>${escapeHtml(username || "utilisateur")}</span></p>

      <div class="auth-edit-group">
        <label class="auth-popover-field">Nom d'utilisateur
          <input id="auth-pop-new-user" type="text" value="${escapeHtml(username)}" ${editState.username ? "" : "disabled"} />
        </label>
        ${editState.username ? `<label class="auth-popover-field">Mot de passe actuel
          <input id="auth-pop-name-pass" type="password" autocomplete="current-password" />
        </label>` : ""}
        <div class="auth-popover-actions">
          <button id="auth-toggle-name" class="action-btn secondary">${editState.username ? "Annuler" : "Changer le nom"}</button>
          ${editState.username ? '<button id="auth-save-name" class="action-btn">Valider</button>' : ""}
        </div>
      </div>

      <div class="auth-edit-group">
        <label class="auth-popover-field">Icone profil (URL)
          <input id="auth-pop-avatar" type="url" value="${escapeHtml(avatarUrl)}" placeholder="https://..." ${editState.avatar ? "" : "disabled"} />
        </label>
        <div class="auth-popover-actions">
          <button id="auth-toggle-avatar" class="action-btn secondary">${editState.avatar ? "Annuler" : "Changer d'icone"}</button>
          ${editState.avatar ? '<button id="auth-save-avatar" class="action-btn">Valider</button>' : ""}
        </div>
      </div>

      <div class="auth-edit-group">
        ${editState.password ? `
          <label class="auth-popover-field">Mot de passe actuel
            <input id="auth-pop-old-pass" type="password" autocomplete="current-password" />
          </label>
          <label class="auth-popover-field">Nouveau mot de passe
            <input id="auth-pop-new-pass" type="password" autocomplete="new-password" />
          </label>
          <label class="auth-popover-field">Confirmer le nouveau mot de passe
            <input id="auth-pop-new-pass-2" type="password" autocomplete="new-password" />
          </label>
        ` : ""}
        <div class="auth-popover-actions">
          <button id="auth-toggle-password" class="action-btn secondary">${editState.password ? "Annuler" : "Changer de mdp"}</button>
          ${editState.password ? '<button id="auth-save-password" class="action-btn">Valider</button>' : ""}
        </div>
      </div>

      <div class="auth-popover-actions">
        <a href="modifier.html" class="action-btn secondary">Mes contenus</a>
        <button id="auth-pop-logout" class="action-btn secondary">Deconnexion</button>
      </div>
    `;
  }

  function renderPanelContent() {
    return currentUser ? renderUserPanel() : renderGuestPanel();
  }

  async function refreshProfile() {
    currentUser = window.ReviewsStore.getCurrentUser();
    currentProfile = null;
    if (currentUser?.uid) {
      try {
        currentProfile = await window.ReviewsStore.getUserProfile(currentUser.uid);
      } catch {
        currentProfile = null;
      }
    }
  }

  function setEditMode(key, enabled) {
    editState[key] = enabled;
    if (enabled) {
      Object.keys(editState).forEach((k) => {
        if (k !== key) editState[k] = false;
      });
    }
    render();
  }

  function wireGuestEvents() {
    const loginBtn = slot.querySelector("#auth-pop-login");
    const registerBtn = slot.querySelector("#auth-pop-register");

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
  }

  function wireUserEvents() {
    const logoutBtn = slot.querySelector("#auth-pop-logout");
    const toggleNameBtn = slot.querySelector("#auth-toggle-name");
    const toggleAvatarBtn = slot.querySelector("#auth-toggle-avatar");
    const togglePasswordBtn = slot.querySelector("#auth-toggle-password");
    const saveNameBtn = slot.querySelector("#auth-save-name");
    const saveAvatarBtn = slot.querySelector("#auth-save-avatar");
    const savePasswordBtn = slot.querySelector("#auth-save-password");

    if (toggleNameBtn) toggleNameBtn.addEventListener("click", () => setEditMode("username", !editState.username));
    if (toggleAvatarBtn) toggleAvatarBtn.addEventListener("click", () => setEditMode("avatar", !editState.avatar));
    if (togglePasswordBtn) togglePasswordBtn.addEventListener("click", () => setEditMode("password", !editState.password));

    if (saveNameBtn) {
      saveNameBtn.addEventListener("click", async () => {
        const username = slot.querySelector("#auth-pop-new-user")?.value || "";
        const currentPassword = slot.querySelector("#auth-pop-name-pass")?.value || "";
        try {
          await window.ReviewsStore.changeCurrentUsername(username, currentPassword);
          await refreshProfile();
          setEditMode("username", false);
          window.alert("Nom d'utilisateur mis a jour.");
        } catch (error) {
          window.alert(`Mise a jour impossible : ${error.message}`);
        }
      });
    }

    if (saveAvatarBtn) {
      saveAvatarBtn.addEventListener("click", async () => {
        const avatarUrl = slot.querySelector("#auth-pop-avatar")?.value || "";
        try {
          await window.ReviewsStore.updateCurrentUserProfile({ avatarUrl });
          await refreshProfile();
          setEditMode("avatar", false);
          window.alert("Icone mise a jour.");
        } catch (error) {
          window.alert(`Mise a jour impossible : ${error.message}`);
        }
      });
    }

    if (savePasswordBtn) {
      savePasswordBtn.addEventListener("click", async () => {
        const currentPassword = slot.querySelector("#auth-pop-old-pass")?.value || "";
        const nextPassword = slot.querySelector("#auth-pop-new-pass")?.value || "";
        const confirmPassword = slot.querySelector("#auth-pop-new-pass-2")?.value || "";
        if (nextPassword !== confirmPassword) {
          window.alert("Les nouveaux mots de passe ne correspondent pas.");
          return;
        }
        try {
          await window.ReviewsStore.changeCurrentUserPassword(currentPassword, nextPassword);
          setEditMode("password", false);
          window.alert("Mot de passe mis a jour.");
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
    if (panel) panel.addEventListener("click", (event) => event.stopPropagation());

    if (!panelOpen) return;
    if (currentUser) wireUserEvents();
    else wireGuestEvents();
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
    panelOpen = false;
    render();
  });

  window.ReviewsStore.onAuthChanged(async () => {
    editState = { username: false, avatar: false, password: false };
    await refreshProfile();
    render();
  });

  refreshProfile().then(render);
})();
