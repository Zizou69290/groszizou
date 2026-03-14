const menuToggle = document.getElementById("menu-toggle");
const menu = document.getElementById("menu");

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

const currentPage = window.location.pathname.split("/").pop() || "index.html";
const directMatch = document.querySelector(`.menu a[href="${currentPage}"]`);
if (directMatch) directMatch.setAttribute("aria-current", "page");

const isWatchParterPage = currentPage === "watch-parter.html" || currentPage.startsWith("watch-parter-");
if (isWatchParterPage) {
  const parentLink = document.querySelector('.menu-item-has-submenu > a[href="watch-parter-watchlist.html"], .menu-item-has-submenu > a[href="watch-parter.html"]');
  if (parentLink) parentLink.setAttribute("aria-current", "page");
}
