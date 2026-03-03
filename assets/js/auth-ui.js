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

  function accountLabel(username) {
    return username ? `${escapeHtml(username)}` : "Mon compte";
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

    return `
      <div class="auth-popover-title">Mon profil</div>
      <p class="auth-popover-meta"><span>${escapeHtml(username || "utilisateur")}</span></p>

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
    const label = currentUser ? accountLabel(username) : "Connexion";

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
    await refreshProfile();
    render();
  });

  refreshProfile().then(render);
})();
