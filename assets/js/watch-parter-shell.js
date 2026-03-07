function buildWatchParterAppMarkup() {
  return `
    <div id="mainTopContainer">
      <div id="topFormRow">
        <form id="filmForm">
          <input type="text" id="filmInput" placeholder="Nom du film" required>
        </form>
        <div id="filmListSearchBarContainer"></div>
      </div>
      <div class="watchparter-hidden-controls" aria-hidden="true">
        <button id="toggleWatchCourterBtn" type="button" class="duel-btn-green">Watch Courter</button>
        <button id="toggleDuelBtn" type="button" class="duel-btn-green">Duel de films</button>
        <button id="toggleBingoBtn" type="button" class="duel-btn-green">Bingo</button>
      </div>
    </div>

    <ul id="filmList"></ul>

    <div id="bottomDuelWrapper">
      <div id="duelContainer">
        <div id="duelHeader">
          <span id="duelTitle">Duel de films</span>
          <span id="duelRound"></span>
        </div>
        <div class="films-row">
          <div id="film1" class="film">
            <div class="film-poster-clickable">
              <img id="film1Poster" src="" alt="Affiche Film 1">
            </div>
            <div id="film1Title"></div>
          </div>
          <div id="film2" class="film">
            <div class="film-poster-clickable">
              <img id="film2Poster" src="" alt="Affiche Film 2">
            </div>
            <div id="film2Title"></div>
          </div>
        </div>
        <button id="randomFilmBtn">Film au hasard</button>
        <div id="randomFilmDisplay"></div>
      </div>
      <div id="duelWinnerSimple" style="display:none;">
        <img id="winnerPosterSimple" src="" alt="Affiche gagnant" />
        <div id="winnerTitleSimple"></div>
        <div id="duelTop5"></div>
        <button id="shareWinnersBtn" class="duel-btn-green" style="margin-top:8px;display:none;">Partager sur Discord</button>
      </div>
    </div>

    <div id="bingoSection" style="display:none;">
      <div id="bingoContainer">
        <h2 style="text-align:center;color:#28a745;margin-bottom:15px;">BINGO</h2>
        <div class="bingo-controls">
          <div class="bingo-control-group">
            <label>Taille de grille :</label>
            <select id="bingoSizeSelect">
              <option value="3">3x3</option>
              <option value="4">4x4</option>
              <option value="5" selected>5x5</option>
            </select>
          </div>
          <button id="editBingoBtn" class="bingo-btn">Modifier Cases</button>
        </div>
        <div id="bingoGrid" class="bingo-grid"></div>
      </div>
    </div>

    <div id="notificationContainer"></div>

    <div id="filmDetailModal" class="film-modal-overlay" style="display: none;">
      <div class="film-modal-content">
        <button class="film-modal-close">x</button>
        <div class="film-modal-tabs">
          <button class="tab-button active" data-tab="details">D&eacute;tails</button>
          <button class="tab-button" data-tab="posters">Affiches</button>
          <a id="modal-letterboxd-btn" class="tab-button tab-link-letterboxd" href="#" target="_blank" rel="noopener noreferrer">Letterboxd</a>
        </div>
        <div id="tab-details" class="tab-content active">
          <div class="film-modal-main-content">
            <div id="modalPosterContainer" class="film-modal-poster-container">
              <img id="modalPoster" class="film-modal-poster" src="" alt="Affiche du film">
            </div>
            <div class="film-modal-infos">
              <h2 id="modalTitle"></h2>
              <p id="modalDetails" class="film-modal-details"></p>
              <p id="modalSynopsis" class="film-modal-synopsis"></p>
              <p id="modalCrew" class="film-modal-crew"></p>
              <div id="modalLinks" class="film-modal-links" aria-hidden="true"></div>
            </div>
          </div>
        </div>
        <div id="tab-posters" class="tab-content">
          <div class="film-modal-screenshots-section">
            <h3 class="film-modal-screenshots-title">Affiches alternatives</h3>
            <div id="modalAlternativePosters" class="film-modal-screenshots-list"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderWatchParterShell() {
  const root = document.getElementById("watchparter-app-root");
  if (!root) return;
  root.innerHTML = buildWatchParterAppMarkup();
}

renderWatchParterShell();
