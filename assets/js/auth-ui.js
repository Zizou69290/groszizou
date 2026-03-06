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

  function isMobileNav() {
    return Boolean(window.matchMedia && window.matchMedia("(max-width: 700px)").matches);
  }

  function syncMobileWatchParterMenu() {
    const menu = document.getElementById("menu");
    const parentLink = document.querySelector('.menu-item-has-submenu > a[href="watch-parter.html"], .menu-item-has-submenu > a[data-watch-parter-parent="1"]');
    if (!menu || !parentLink) return;

    if (!parentLink.dataset.originalText) parentLink.dataset.originalText = parentLink.textContent || "Watch Parter";
    if (!parentLink.dataset.originalHref) parentLink.dataset.originalHref = parentLink.getAttribute("href") || "watch-parter.html";
    parentLink.dataset.watchParterParent = "1";

    const mobile = isMobileNav();
    menu.classList.toggle("mobile-watchparter-mode", mobile);

    const courterLink = menu.querySelector('.menu-item-has-submenu .submenu a[href="watch-parter-courter.html"]');
    if (courterLink) {
      if (!courterLink.dataset.originalText) courterLink.dataset.originalText = courterLink.textContent || "Watchlist Courter";
      courterLink.textContent = mobile ? "Watch Courter" : courterLink.dataset.originalText;
    }

    if (mobile) {
      parentLink.textContent = "Watch Parter";
      parentLink.setAttribute("href", "watch-parter-watchlist.html");
      return;
    }

    parentLink.textContent = parentLink.dataset.originalText;
    parentLink.setAttribute("href", parentLink.dataset.originalHref);
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
      <div class="auth-popover-title">Connect\u00E9 en tant que ${escapeHtml(username || "utilisateur")}</div>
      <div class="auth-popover-actions">
        <a href="modifier.html" class="action-btn secondary">Mes contenus</a>
        <button id="auth-pop-logout" class="action-btn secondary">D\u00E9connexion</button>
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
    const usernameInput = slot.querySelector("#auth-pop-user");
    const passwordInput = slot.querySelector("#auth-pop-pass");

    const login = async () => {
      const username = usernameInput?.value || "";
      const password = passwordInput?.value || "";
      try {
        await window.ReviewsStore.loginWithCredentials(username, password);
        panelOpen = false;
      } catch (error) {
        window.alert(`Connexion impossible : ${error.message}`);
      }
    };

    if (loginBtn) loginBtn.addEventListener("click", login);

    if (registerBtn) {
      registerBtn.addEventListener("click", async () => {
        const username = usernameInput?.value || "";
        const password = passwordInput?.value || "";
        try {
          await window.ReviewsStore.registerWithCredentials(username, password);
          panelOpen = false;
        } catch (error) {
          window.alert(`Inscription impossible : ${error.message}`);
        }
      });
    }

    const onEnter = async (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      await login();
    };
    if (usernameInput) usernameInput.addEventListener("keydown", onEnter);
    if (passwordInput) passwordInput.addEventListener("keydown", onEnter);
  }

  function wireUserEvents() {
    const logoutButtons = [
      slot.querySelector("#auth-pop-logout"),
      slot.querySelector("#auth-mobile-logout")
    ].filter(Boolean);
    if (!logoutButtons.length) return;

    const handleLogout = async (event) => {
      event.preventDefault();
      try {
        await window.ReviewsStore.signOut();
        panelOpen = false;
      } catch (error) {
        window.alert(`D\u00E9connexion impossible : ${error.message}`);
      }
    };

    for (const button of logoutButtons) {
      button.addEventListener("click", handleLogout);
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
    syncMobileWatchParterMenu();
    const username = currentProfile?.username || currentUser?.username || "";
    const label = currentUser ? accountLabel(username) : "Connexion";
    const mobileShortcuts = currentUser
      ? `
      <div class="auth-mobile-shortcuts">
        <a href="modifier.html" class="auth-mobile-menu-link">Gestionnaire</a>
        <button id="auth-mobile-logout" type="button" class="auth-mobile-menu-link">D\u00E9connexion</button>
      </div>
    `
      : "";
    const mobileLoggedView = currentUser && isMobileNav();

    slot.innerHTML = `
      ${mobileLoggedView ? "" : `<button id="auth-nav-toggle" class="auth-nav-btn" type="button" aria-expanded="${panelOpen ? "true" : "false"}">
        ${label}
      </button>`}
      ${mobileLoggedView ? mobileShortcuts : ""}
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

  window.addEventListener("resize", () => {
    syncMobileWatchParterMenu();
    if (currentUser && isMobileNav()) panelOpen = false;
    render();
  });

  refreshProfile().then(render);
})();
