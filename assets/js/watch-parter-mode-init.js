function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isCourterModeEnabled(toggleModeBtn) {
  return /watch parter/i.test(String(toggleModeBtn?.textContent || ""));
}

function isDuelModeEnabled(toggleDuelBtn) {
  return /retour/i.test(String(toggleDuelBtn?.textContent || ""));
}

function isBingoModeEnabled(toggleBingoBtn) {
  return /fermer bingo/i.test(String(toggleBingoBtn?.textContent || ""));
}

async function setCourterMode(toggleModeBtn, targetEnabled) {
  if (!toggleModeBtn) return;
  if (isCourterModeEnabled(toggleModeBtn) === targetEnabled) return;
  toggleModeBtn.click();
  await delay(260);
}

async function setDuelMode(toggleDuelBtn, targetEnabled) {
  if (!toggleDuelBtn) return;
  if (isDuelModeEnabled(toggleDuelBtn) === targetEnabled) return;
  toggleDuelBtn.click();
  await delay(240);
}

async function setBingoMode(toggleBingoBtn, targetEnabled) {
  if (!toggleBingoBtn) return;
  if (isBingoModeEnabled(toggleBingoBtn) === targetEnabled) return;
  toggleBingoBtn.click();
  await delay(240);
}

async function applyRequestedWatchParterMode() {
  const requestedMode = String(document.body?.dataset?.watchParterMode || "").trim();
  if (!requestedMode) return;

  const toggleModeBtn = document.getElementById("toggleWatchCourterBtn");
  const toggleDuelBtn = document.getElementById("toggleDuelBtn");
  const toggleBingoBtn = document.getElementById("toggleBingoBtn");
  if (!toggleModeBtn || !toggleDuelBtn || !toggleBingoBtn) return;

  if (requestedMode === "watchlist") {
    await setBingoMode(toggleBingoBtn, false);
    await setDuelMode(toggleDuelBtn, false);
    await setCourterMode(toggleModeBtn, false);
    return;
  }

  if (requestedMode === "courter") {
    await setBingoMode(toggleBingoBtn, false);
    await setDuelMode(toggleDuelBtn, false);
    await setCourterMode(toggleModeBtn, true);
    return;
  }

  if (requestedMode === "duel") {
    await setBingoMode(toggleBingoBtn, false);
    await setCourterMode(toggleModeBtn, false);
    await setDuelMode(toggleDuelBtn, true);
    return;
  }

  if (requestedMode === "bingo") {
    await setDuelMode(toggleDuelBtn, false);
    await setCourterMode(toggleModeBtn, false);
    await setBingoMode(toggleBingoBtn, true);
  }
}

window.addEventListener("load", () => {
  applyRequestedWatchParterMode();
});
