// Rendre la fonction admin accessible depuis la console navigateur
window.corrigerTmdbIdFilmsExistants = corrigerTmdbIdFilmsExistants;
// 📌 Fonction ADMIN pour corriger les films existants sans tmdbId
async function corrigerTmdbIdFilmsExistants() {
    const activeCollection = getActiveCollection();
    const querySnapshot = await getDocs(activeCollection);
    let corrections = 0;
    for (const docSnap of querySnapshot.docs) {
        const film = docSnap.data();
        if (!film.tmdbId && film.nom) {
            // Recherche TMDB
            const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKeyTMDB}&query=${encodeURIComponent(film.nom)}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const match = data.results[0];
                await updateDoc(doc(filmsCollection, docSnap.id), { tmdbId: match.id });
                corrections++;
                console.log(`Corrigé: ${film.nom} => tmdbId ${match.id}`);
            }
        }
    }
    showNotification(`Correction terminée : ${corrections} films mis à jour.`);
}
// Pour lancer la correction, ouvrir la console et exécuter : corrigerTmdbIdFilmsExistants();
// 📌 Importation des modules Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc, getDoc, onSnapshot, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 📌 Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDlRIZy8uaXsNklAlj3RVBnUDEA3KJGbUU",
  authDomain: "watchparter.firebaseapp.com",
  databaseURL: "https://watchparter-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "watchparter",
  storageBucket: "watchparter.firebasestorage.app",
  messagingSenderId: "360660931923",
  appId: "1:360660931923:web:aaa12b6a3334ea692dbda6",
  measurementId: "G-MDJLTEH2ZP"
};

// 📌 Initialisation de Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const filmsCollection = collection(db, "films");
const filmsCourtsCollection = collection(db, "filmsCourts");
const datesCollection = collection(db, "dates");
const LOCAL_ASSET_PREFIX = typeof window !== "undefined" ? (window.WATCH_PARTER_ASSET_PREFIX || "") : "";
const localAsset = (name) => `${LOCAL_ASSET_PREFIX}${name}`;

function getSupersiteUsername() {
    const username = window.ReviewsStore?.getCurrentUser?.()?.username || "";
    return String(username).trim();
}

function requireSupersiteUsername() {
    const username = getSupersiteUsername();
    if (!username) {
        showNotification("Connecte-toi via le header SuperSite pour ajouter/voter.");
        return null;
    }
    return username;
}

// 📌 Mode actif : liste principale ou Watch Courter (films courts)
let currentMode = (typeof localStorage !== 'undefined' && localStorage.getItem('watchparter_mode')) || 'main';
function isCourterMode() {
    return currentMode === 'courter';
}
function getActiveCollection() {
    return isCourterMode() ? filmsCourtsCollection : filmsCollection;
}
function getActiveCollectionKey() {
    return isCourterMode() ? 'courter' : 'main';
}

// 📌 Clé API TMDB
const apiKeyTMDB = "db0d1dbaf15190e0a5574538dc4e579f"; // Remplace par ta clé API

// 📌 Endpoint serverless (Vercel API route) pour proxy Discord
const DISCORD_FUNCTION_URL = "/api/discord-share";

// Mapping des genres TMDB
const genreMap = {
    28: "Action",
    12: "Aventure",
    16: "Animation",
    35: "Comédie",
    80: "Crime",
    99: "Documentaire",
    18: "Drame",
    10751: "Familial",
    14: "Fantastique",
    36: "Histoire",
    27: "Horreur",
    10402: "Musique",
    9648: "Mystère",
    10749: "Romance",
    878: "Science-Fiction",
    10770: "Téléfilm",
    53: "Thriller",
    10752: "Guerre",
    37: "Western"
};

// 📌 Fonction pour récupérer l'affiche, les genres et la durée d'un film via TMDB
async function getFilmDetails(filmName) {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKeyTMDB}&query=${filmName}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            const film = data.results[0]; // On prend le premier résultat
            const genres = film.genre_ids.slice(0, 3).map(id => genreMap[id]).join(", "); // Récupère jusqu'à 3 genres
            const detailsUrl = `https://api.themoviedb.org/3/movie/${film.id}?api_key=${apiKeyTMDB}`;
            const detailsResponse = await fetch(detailsUrl);
            const detailsData = await detailsResponse.json();
            const hours = Math.floor(detailsData.runtime / 60);
            const minutes = detailsData.runtime % 60;
            const duration = detailsData.runtime ? `${hours}h ${minutes}min` : "";
            return {
                poster: `https://image.tmdb.org/t/p/w500${film.poster_path}`, // Retourne l'URL de l'affiche
                releaseDate: film.release_date ? `(${new Date(film.release_date).getFullYear()})` : "", // Retourne l'année de sortie
                genres: genres,
                duration: duration
            };
        } else {
            return {
                poster: "https://via.placeholder.com/500x750?text=Pas+d'affiche", // Image par défaut si pas d'affiche
                releaseDate: "",
                genres: "",
                duration: ""
            };
        }
    } catch (error) {
        console.error("❌ Erreur lors de la récupération de l'affiche :", error);
        return {
            poster: "https://via.placeholder.com/500x750?text=Erreur", // Image d'erreur
            releaseDate: "",
            genres: "",
            duration: ""
        };
    }
}

// 📌 Fonction pour afficher une notification
function showNotification(message) {
    const notificationContainer = document.getElementById("notificationContainer");
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = message;
    notificationContainer.appendChild(notification);

    // Afficher la notification
    setTimeout(() => {
        notification.classList.add("show");
    }, 10);

    // Masquer et supprimer la notification après 3 secondes
    setTimeout(() => {
        notification.classList.remove("show");
        notification.classList.add("hide");
        setTimeout(() => {
            notificationContainer.removeChild(notification);
        }, 500);
    }, 3000);
}

// 📌 Fonction pour charger les films depuis Firebase
async function chargerFilms() {
    console.log("🔄 Chargement des films...");
    try {
        const activeCollection = getActiveCollection();
        const collectionKey = getActiveCollectionKey();
        const querySnapshot = await getDocs(activeCollection);
        filmList.innerHTML = ""; // On vide la liste avant d'afficher

        const films = [];
        querySnapshot.forEach(doc => {
            films.push({ id: doc.id, collectionKey, ...doc.data() });
        });

        // Trier les films par date d'ajout (du plus récent au plus vieux)
        films.sort((a, b) => {
            // Si pas de champ 'ajouteLe', on considère 0 (vieux)
            const dateA = a.ajouteLe || 0;
            const dateB = b.ajouteLe || 0;
            return dateB - dateA;
        });

        // Ajout du filtre de recherche
        let searchValue = '';
        const searchInput = document.getElementById('filmListSearchInput');
        if (searchInput) searchValue = searchInput.value.trim().toLowerCase();

        films.forEach(film => {
            if (searchValue && !(film.nom || '').toLowerCase().includes(searchValue)) return;

            console.log("🎬 Film trouvé :", film.nom);

            const li = document.createElement("li");
            li.dataset.filmId = film.id;

            // Afficher l'affiche (wrap in poster-wrapper so overlays are positioned relative to the poster)
            const img = document.createElement("img");
            img.src = film.affiche || "https://via.placeholder.com/500x750?text=Pas+d'affiche";
            img.alt = `Affiche de ${film.nom}`;
            img.style.cursor = "pointer"; // Rendre le curseur cliquable

            const posterWrapper = document.createElement('div');
            posterWrapper.className = 'poster-wrapper';
            posterWrapper.appendChild(img);
            li.appendChild(posterWrapper);
            // Ajout du listener pour ouvrir la modale de détails
            img.addEventListener("click", () => showFilmModal(film));

            // Afficher le titre du film avec la date de sortie
            const span = document.createElement("span");
            span.textContent = `${film.nom} ${film.releaseDate}`;
            li.appendChild(span);

            // Afficher la durée et les genres du film
            const details = document.createElement("div");
            details.className = "details";
            details.textContent = `${film.duration} - ${film.genres}`;
            li.appendChild(details);

            // Ajouter l'image correspondante au pseudo (overlay, positioned inside poster-wrapper)
            const pseudoImg = document.createElement("img");
            pseudoImg.className = 'added-by-user-icon';
            let pseudoIcon = "";
            if (film.pseudo === "Antho") {
                pseudoIcon = localAsset("antho.png");
                pseudoImg.alt = "Antho";
            } else if (film.pseudo === "Claire") {
                pseudoIcon = localAsset("claire.png");
                pseudoImg.alt = "Claire";
            } else if (film.pseudo === "Nico") {
                pseudoIcon = localAsset("nico.png");
                pseudoImg.alt = "Nico";
            }
            if (pseudoIcon) {
                pseudoImg.src = pseudoIcon;
                posterWrapper.appendChild(pseudoImg);
            }

            // Conteneur pour les liens
            const linksContainer = document.createElement("div");
            linksContainer.className = "links";

            // Lien vers Letterboxd
            const letterboxdLink = document.createElement("a");
            letterboxdLink.href = `https://letterboxd.com/search/${encodeURIComponent(film.nom)}/`;
            letterboxdLink.textContent = "Letterboxd";
            letterboxdLink.target = "_blank";
            letterboxdLink.classList.add("letterboxd-link");
            linksContainer.appendChild(letterboxdLink);

            // Lien vers YouTube Trailer
            const youtubeLink = document.createElement("a");
            youtubeLink.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(film.nom + ' trailer vostfr')}`;
            youtubeLink.textContent = "Trailer";
            youtubeLink.target = "_blank";
            youtubeLink.classList.add("trailer-link");
            linksContainer.appendChild(youtubeLink);

            li.appendChild(linksContainer);

            // Bouton supprimer (overlay on poster)
            const deleteBtn = document.createElement("button");
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = "✖";
            deleteBtn.addEventListener("click", (e) => { e.stopPropagation(); supprimerFilm(film.id, film.collectionKey); });
            posterWrapper.appendChild(deleteBtn);
            filmList.appendChild(li);
        });

        console.log("✅ Films affichés !");
    } catch (error) {
        console.error("❌ Erreur lors du chargement des films :", error);
    }
}

// 📌 Fonction pour supprimer un film
async function supprimerFilm(id, collectionKey = getActiveCollectionKey()) {
    try {
        const targetCollection = collectionKey === 'courter' ? filmsCourtsCollection : filmsCollection;
        await deleteDoc(doc(targetCollection, id));
        console.log(`✅ Film supprimé : ${id}`);
        showNotification("Film supprimé avec succès !");
        chargerFilms(); // Recharge la liste
        loadFilmsForDuel(); // Rafraîchit le duel actif
    } catch (error) {
        console.error("❌ Erreur lors de la suppression :", error);
    }
}

// 📌 Fonction pour modifier un film
async function modifierFilm(id, collectionKey = getActiveCollectionKey()) {
    const nouveauNom = prompt("Entrez le nouveau nom du film :");
    if (nouveauNom) {
        try {
            const targetCollection = collectionKey === 'courter' ? filmsCourtsCollection : filmsCollection;
            const filmRef = doc(targetCollection, id);
            await updateDoc(filmRef, { nom: nouveauNom });
            console.log(`✅ Film modifié : ${id}`);
            chargerFilms(); // Recharge la liste
            loadFilmsForDuel(); // Rafraîchit le duel actif
        } catch (error) {
            console.error("❌ Erreur lors de la modification :", error);
        }
    }
}

// 📌 Fonction pour ajouter un film
async function ajouterFilm(nom, pseudo) {
    if (!nom.trim()) return; // Empêche d'ajouter un champ vide

    // Vérifier doublon (insensible à la casse, accents, espaces, parenthèses, tirets)
    function normalizeTitle(str) {
        return (str||'')
            .toLowerCase()
            .normalize('NFD').replace(/\p{Diacritic}/gu, '')
            .replace(/[^a-z0-9]/gi, '') // retire tout sauf lettres et chiffres
            .replace(/\s+/g, '');
    }
    const querySnapshot = await getDocs(filmsCollection);
    const films = [];
    querySnapshot.forEach(doc => {
        films.push({ id: doc.id, ...doc.data() });
    });
    const nomNormalise = normalizeTitle(nom);
    const doublon = films.some(film => normalizeTitle(film.nom) === nomNormalise);
    if (doublon) {
        showNotification("Film déjà dans la liste !");
        return;
    }

    try {
        console.log("➕ Tentative d'ajout :", nom);
        // Récupérer l'affiche via TMDB
        const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKeyTMDB}&query=${encodeURIComponent(nom)}`;
        const response = await fetch(url);
        const data = await response.json();
        let poster = "https://via.placeholder.com/500x750?text=Pas+d'affiche";
        let releaseDate = "";
        let genres = "";
        let duration = "";
        let tmdbId = undefined;
        if (data.results && data.results.length > 0) {
            const film = data.results[0];
            tmdbId = film.id;
            poster = film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : poster;
            releaseDate = film.release_date ? `(${new Date(film.release_date).getFullYear()})` : "";
            // Récupérer les genres et la durée via l'API détails
            const detailsUrl = `https://api.themoviedb.org/3/movie/${film.id}?api_key=${apiKeyTMDB}`;
            const detailsResponse = await fetch(detailsUrl);
            const detailsData = await detailsResponse.json();
            genres = (detailsData.genres||[]).slice(0, 3).map(g => g.name || genreMap[g.id] || "").join(", ");
            const hours = Math.floor((detailsData.runtime||0) / 60);
            const minutes = (detailsData.runtime||0) % 60;
            duration = detailsData.runtime ? `${hours}h ${minutes}min` : "";
        }
        // Ajouter le film avec l'affiche, le pseudo, la date d'ajout et le tmdbId dans Firestore
        await addDoc(activeCollection, { nom, affiche: poster, pseudo, releaseDate, genres, duration, ajouteLe: Date.now(), tmdbId });
        console.log("✅ Film ajouté avec succès !");
        showNotification("Film ajouté avec succès !");
        chargerFilms(); // Recharge la liste après l'ajout
        loadFilmsForDuel(); // Rafraîchit le duel pour le mode actif
    } catch (error) {
        console.error("❌ Erreur lors de l'ajout :", error);
    }
}

// 📌 Fonction pour choisir un film au hasard
function choisirFilmAleatoire() {
    const films = document.querySelectorAll("#filmList li");
    if (films.length === 0) {
        alert("Aucun film dans la liste !");
        return;
    }
    const filmAleatoire = films[Math.floor(Math.random() * films.length)];
    const filmName = filmAleatoire.querySelector("span").textContent; // Récupère uniquement le nom du film
    const randomFilmDisplay = document.getElementById("randomFilmDisplay");
    randomFilmDisplay.textContent = `Film choisi au hasard : ${filmName}`;
}

// 📌 Duel de films
let filmsDuel = [];
let currentPair = [];
let totalRounds = 0;
let currentRound = 0;
let duelVotes = [];

async function loadFilmsForDuel() {
    const activeCollection = getActiveCollection();
    const duelTitle = document.getElementById("duelTitle");
    if (duelTitle) {
        duelTitle.textContent = isCourterMode() ? "Duel Watch Courter" : "Duel de Films";
    }

    const querySnapshot = await getDocs(activeCollection);
    const collectionKey = getActiveCollectionKey();
    filmsDuel = querySnapshot.docs.map(doc => ({ id: doc.id, collectionKey, ...doc.data() }));
    // Initialiser les votes pour chaque film
    duelVotes = filmsDuel.map(f => ({ id: f.id, nom: f.nom, affiche: f.affiche, votes: 0 }));
    totalRounds = filmsDuel.length > 1 ? filmsDuel.length - 1 : 0;
    currentRound = 1;
    startDuel();
}

function startDuel() {
    const duelContainer = document.getElementById("duelContainer");
    // Ancien bloc gagnant (masqué)
    const duelWinner = document.getElementById("duelWinner");
    // Nouveau bloc gagnant minimaliste
    const duelWinnerSimple = document.getElementById("duelWinnerSimple");
    const winnerPosterSimple = document.getElementById("winnerPosterSimple");
    const winnerTitleSimple = document.getElementById("winnerTitleSimple");

    // Masquer le bouton de partage tant qu'il n'y a pas de gagnant final
    setShareButtonVisible(false);

    if (filmsDuel.length < 2) {
        duelContainer.style.display = "none";
        if (duelWinner) duelWinner.style.display = "none";
        if (duelWinnerSimple) duelWinnerSimple.style.display = "flex";
        const winner = filmsDuel[0];
        if (winner) {
            if (winnerPosterSimple) winnerPosterSimple.src = winner.affiche || "https://via.placeholder.com/500x750?text=Pas+d'affiche";
            if (winnerTitleSimple) winnerTitleSimple.textContent = winner.nom;
        } else {
            if (winnerPosterSimple) winnerPosterSimple.src = "";
            if (winnerTitleSimple) winnerTitleSimple.textContent = "Aucun film";
        }
        // Affichage du top 5 discret
        showTop5DuelWinners();
        return;
    }
    duelContainer.style.display = "flex";
    if (duelWinner) duelWinner.style.display = "none";
    if (duelWinnerSimple) duelWinnerSimple.style.display = "none";
    currentPair = [filmsDuel.pop(), filmsDuel.pop()];
    // Affiche le round actuel
    const duelRound = document.getElementById("duelRound");
    if (duelRound) {
        duelRound.textContent = `Round ${currentRound} / ${totalRounds}`;
    }
    displayDuelFilms();
}

function displayDuelFilms() {
    const [film1, film2] = currentPair;
    // Affiches
    document.getElementById("film1Poster").src = film1.affiche || "https://via.placeholder.com/500x750?text=Pas+d'affiche";
    document.getElementById("film2Poster").src = film2.affiche || "https://via.placeholder.com/500x750?text=Pas+d'affiche";

    // Génère le HTML des détails, genres, liens Letterboxd/Trailer
    function duelFilmDetailsHTML(film) {
        // Titre + date
        let html = `<div class='duel-title'>${film.nom} <span class='duel-date'>${film.releaseDate || ''}</span></div>`;
        // Durée + genres
        html += `<div class='duel-details'>${film.duration || ''}${film.genres ? ' - ' + film.genres : ''}</div>`;
        // Liens
        html += `<div class="links" style="display:flex;justify-content:center;gap:8px;margin-top:4px;">
            <a href="https://letterboxd.com/search/${encodeURIComponent(film.nom)}/" target="_blank" class="letterboxd-link">Letterboxd</a>
            <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(film.nom + ' trailer vostfr')}" target="_blank" class="trailer-link">Trailer</a>
        </div>`;
        return html;
    }
    document.getElementById("film1Title").innerHTML = duelFilmDetailsHTML(film1);
    document.getElementById("film2Title").innerHTML = duelFilmDetailsHTML(film2);

    // MODIF: désactiver l'ouverture de la modale depuis les affiches du duel (bug frequent)
    // Ajout effet visuel sélection/survol sur le bloc film (pas juste l'affiche)
    const film1Div = document.getElementById("film1");
    const film2Div = document.getElementById("film2");
    // Nettoie l'état
    film1Div.classList.remove("selected");
    film2Div.classList.remove("selected");

    // Désactiver l'effet visuel cadre vert/agrandissement au survol du film en duel
    film1Div.onmouseenter = null;
    film1Div.onmouseleave = null;
    film2Div.onmouseenter = null;
    film2Div.onmouseleave = null;

    // Limiter la zone de vote à l'affiche uniquement
    const film1PosterClickable = film1Div.querySelector('.film-poster-clickable');
    const film2PosterClickable = film2Div.querySelector('.film-poster-clickable');
    film1PosterClickable.style.cursor = 'pointer';
    film2PosterClickable.style.cursor = 'pointer';
    film1PosterClickable.onclick = (e) => {
        e.stopPropagation();
        film1Div.classList.add("selected");
        film2Div.classList.add("grayed-out");
        setTimeout(() => {
            film1Div.classList.remove("selected");
            film2Div.classList.remove("grayed-out");
            updateDuelVotes(currentPair[0].id);
            filmsDuel.unshift(currentPair[0]);
            currentRound++;
            startDuel();
        }, 500);
    };
    film2PosterClickable.onclick = (e) => {
        e.stopPropagation();
        film2Div.classList.add("selected");
        film1Div.classList.add("grayed-out");
        setTimeout(() => {
            film2Div.classList.remove("selected");
            film1Div.classList.remove("grayed-out");
            updateDuelVotes(currentPair[1].id);
            filmsDuel.unshift(currentPair[1]);
            currentRound++;
            startDuel();
        }, 500);
    };
}

function showTop5DuelWinners() {
    // Affiche le top 5 des films les plus votés sous le gagnant
    const duelWinnerSimple = document.getElementById("duelWinnerSimple");
    if (!duelWinnerSimple) return;
    let top5 = [...duelVotes].sort((a, b) => b.votes - a.votes).slice(0, 5); // 1 gagnant + 4 suivants
    // Ne pas afficher le premier (déjà affiché en grand)
    top5 = top5.slice(1, 5); // 4 affiches (2e à 5e)
    let top5Div = document.getElementById('duelTop5');
    if (!top5Div) {
        top5Div = document.createElement('div');
        top5Div.id = 'duelTop5';
        top5Div.style.marginTop = '10px';
        top5Div.style.opacity = '0.95';
        top5Div.style.fontSize = '0.93em';
        top5Div.style.textAlign = 'center';
        top5Div.style.display = 'flex';
        top5Div.style.flexDirection = 'row';
        top5Div.style.justifyContent = 'center';
        top5Div.style.alignItems = 'flex-start';
        duelWinnerSimple.appendChild(top5Div);
    }
    // Affiches non rognées (object-fit: contain), sans texte 'Top 5'
    top5Div.innerHTML = top5.map((f, i) => `
        <div>
            <img src='${f.affiche || "https://via.placeholder.com/70x105?text=Affiche"}' alt='affiche' class='duel-top5-img'>
        </div>
    `).join('');

    // Bouton de partage disponible quand les résultats sont prêts
    setShareButtonVisible(true);
}

function updateDuelVotes(winnerId) {
    const found = duelVotes.find(f => f.id === winnerId);
    if (found) found.votes++;
}



// 📌 Toggle Duel de Films en haut/masquer liste films
const toggleDuelBtn = document.getElementById("toggleDuelBtn");
const filmList = document.getElementById("filmList");
const duelWrapper = document.getElementById("bottomDuelWrapper");
const mainTopContainer = document.getElementById("mainTopContainer");
let duelMode = false;

function scrollToDuel() {
    duelWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showDuelOnTop() {
    duelWrapper.style.marginTop = '18px';
    mainTopContainer.insertAdjacentElement('afterend', duelWrapper);
    filmList.style.display = 'none';
    toggleDuelBtn.textContent = '◀️ Retour à la liste';
}

function showListOnTop() {
    mainTopContainer.insertAdjacentElement('afterend', filmList);
    filmList.style.display = '';
    toggleDuelBtn.textContent = isCourterMode() ? '⚔️ Duel Courter' : '⚔️ Duel de Films';
}

function updateModeUI() {
    const titleEl = document.getElementById('mainTitle');
    if (titleEl) {
        titleEl.textContent = isCourterMode() ? 'WATCH COURTER' : 'WATCH PARTER';
    }
    const toggleModeBtn = document.getElementById('toggleWatchCourterBtn');
    if (toggleModeBtn) {
        toggleModeBtn.textContent = isCourterMode() ? '🎬 Watch Parter' : '⏱️ Watch Courter';
    }
    if (!duelMode && toggleDuelBtn) {
        toggleDuelBtn.textContent = isCourterMode() ? '⚔️ Duel Courter' : '⚔️ Duel de Films';
    }
    const duelTitle = document.getElementById('duelTitle');
    if (duelTitle) {
        duelTitle.textContent = isCourterMode() ? 'Duel Watch Courter' : 'Duel de Films';
    }
    const filmInputField = document.getElementById('filmInput');
    if (filmInputField) {
        filmInputField.placeholder = isCourterMode() ? 'Film court / série' : 'Nom du film';
    }
}

function applyMode(newMode) {
    currentMode = newMode;
    try {
        localStorage.setItem('watchparter_mode', newMode);
    } catch (err) {
        console.warn('Impossible de stocker le mode', err);
    }
    updateModeUI();
    duelMode = false;
    showListOnTop();
    chargerFilms();
    loadFilmsForDuel();
}

toggleDuelBtn.addEventListener('click', function() {
    duelMode = !duelMode;
    if (duelMode) {
        showDuelOnTop();
    } else {
        showListOnTop();
    }
});

// 📌 Barre de recherche avec suggestions TMDB
const filmInput = document.getElementById('filmInput');
let suggestionBox = null;

// Ajout: fonction pour ajouter un film depuis une suggestion
async function ajouterFilmDepuisSuggestion(filmTMDB) {
    const pseudo = requireSupersiteUsername();
    if (!pseudo) return;
    // On récupère les détails du film via TMDB
    const url = `https://api.themoviedb.org/3/movie/${filmTMDB.id}?api_key=${apiKeyTMDB}&language=fr-FR`;
    const detailsResponse = await fetch(url);
    const detailsData = await detailsResponse.json();
    const genres = (detailsData.genres||[]).slice(0, 3).map(g => g.name).join(", ");
    const hours = Math.floor((detailsData.runtime||0) / 60);
    const minutes = (detailsData.runtime||0) % 60;
    const duration = detailsData.runtime ? `${hours}h ${minutes}min` : "";
    const targetCollection = getActiveCollection();
    await addDoc(targetCollection, {
        nom: filmTMDB.title,
        affiche: detailsData.poster_path ? `https://image.tmdb.org/t/p/w500${detailsData.poster_path}` : "https://via.placeholder.com/500x750?text=Pas+d'affiche",
        pseudo,
        releaseDate: filmTMDB.release_date ? `(${new Date(filmTMDB.release_date).getFullYear()})` : "",
        genres,
        duration,
        ajouteLe: Date.now(),
        tmdbId: filmTMDB.id
    });
    showNotification("Film ajouté avec succès !");
    chargerFilms();
    loadFilmsForDuel();
    filmInput.value = "";
    if (suggestionBox) suggestionBox.innerHTML = '';
}

filmInput.addEventListener('input', async function() {
    const query = filmInput.value.trim();
    if (!suggestionBox) {
        suggestionBox = document.createElement('ul');
        suggestionBox.className = 'film-suggestion-box';
        filmInput.parentNode.appendChild(suggestionBox);
    }
    if (!query) {
        suggestionBox.innerHTML = '';
        suggestionBox.style.display = 'none';
        return;
    }
    // Appel TMDB pour suggestions
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKeyTMDB}&query=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const data = await response.json();
    suggestionBox.innerHTML = '';
    suggestionBox.style.display = (data.results && data.results.length) ? 'block' : 'none';
    (data.results || []).forEach(film => {
        const li = document.createElement('li');
        li.textContent = `${film.title} ${film.release_date ? '(' + film.release_date.slice(0,4) + ')' : ''}`;
        li.addEventListener('mousedown', function(e) {
            e.preventDefault();
            ajouterFilmDepuisSuggestion(film);
        });
        suggestionBox.appendChild(li);
    });
});

filmInput.addEventListener('focus', function() {
    if (suggestionBox && suggestionBox.innerHTML) suggestionBox.style.display = 'block';
});

filmInput.addEventListener('blur', function() {
    setTimeout(() => {
        if (suggestionBox) suggestionBox.style.display = 'none';
    }, 120);
});

document.addEventListener('click', function(e) {
    if (suggestionBox && !filmInput.contains(e.target)) {
        suggestionBox.style.display = 'none';
    }
});

// 📌 Affichage grand format d'un film avec détails, synopsis, trailer et screenshots
let filmModal = null; // Keep this, though it's not strictly used anymore.

// Reference to the film detail modal elements
const filmDetailModal = document.getElementById("filmDetailModal");
const modalCloseBtn = filmDetailModal.querySelector(".film-modal-close");
const modalPosterContainer = document.getElementById("modalPosterContainer");
const modalPoster = document.getElementById("modalPoster");
const modalTitle = document.getElementById("modalTitle");
const modalDetails = document.getElementById("modalDetails");
const modalSynopsis = document.getElementById("modalSynopsis");
const modalCrew = document.getElementById("modalCrew");
const modalLinks = document.getElementById("modalLinks");
const modalAlternativePosters = document.getElementById("modalAlternativePosters");

const tabButtons = filmDetailModal.querySelectorAll(".tab-button");
const tabDetailsContent = document.getElementById("tab-details");
const tabPostersContent = document.getElementById("tab-posters");

async function showFilmModal(film) {
    if (!film || !film.tmdbId) {
        showNotification("Détails du film non disponibles.");
        return;
    }

    // Clear previous content
    modalPosterContainer.innerHTML = '';
    modalTitle.textContent = "";
    modalDetails.textContent = "";
    modalSynopsis.textContent = "";
    modalCrew.textContent = "";
    modalLinks.innerHTML = "";
    modalAlternativePosters.innerHTML = "";

    filmDetailModal.style.display = "flex"; // Show the modal
    openTab('details'); // Set initial tab

    try {
        // Fetch extended details from TMDB
        const detailsUrl = `https://api.themoviedb.org/3/movie/${film.tmdbId}?api_key=${apiKeyTMDB}&language=fr-FR&append_to_response=credits,videos,images&include_image_language=en,fr,es,de,it,ja,ko,zh,pt,ru,ar,null`;
        const response = await fetch(detailsUrl);
        const data = await response.json();

        // Check if there's a trailer available
        let trailerKey = null;
        if (data.videos && data.videos.results && data.videos.results.length > 0) {
            // Look for French or English trailer
            const trailer = data.videos.results.find(v => 
                (v.type === "Trailer" || v.type === "Teaser") && 
                v.site === "YouTube" && 
                (v.iso_639_1 === "fr" || v.iso_639_1 === "en")
            ) || data.videos.results.find(v => 
                (v.type === "Trailer" || v.type === "Teaser") && 
                v.site === "YouTube"
            );
            if (trailer) {
                trailerKey = trailer.key;
            }
        }

        // Display trailer if available, otherwise show poster
        if (trailerKey) {
            const iframe = document.createElement("iframe");
            iframe.className = "film-modal-trailer-iframe";
            iframe.src = `https://www.youtube.com/embed/${trailerKey}?rel=0`;
            iframe.frameBorder = "0";
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
            iframe.allowFullscreen = true;
            modalPosterContainer.appendChild(iframe);
        } else {
            // Use selected poster or default TMDB poster
            const img = document.createElement("img");
            img.id = "modalPoster";
            img.className = "film-modal-poster";
            img.src = film.affiche || (data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : "https://via.placeholder.com/500x750?text=Pas+d'affiche");
            img.alt = "Affiche du film";
            modalPosterContainer.appendChild(img);
        }
        
        // Line 1: Titre (Année) Réalisateur
        let titleLine = data.title || film.nom;
        if (data.release_date) {
            titleLine += ` (${new Date(data.release_date).getFullYear()})`;
        }
        if (data.credits && data.credits.crew) {
            const director = data.credits.crew.find(person => person.job === "Director");
            if (director) titleLine += ` ${director.name}`;
        }
        modalTitle.textContent = titleLine;

        // Line 2: Durée - Genres
        let detailsLine = [];
        if (data.runtime) {
            const hours = Math.floor(data.runtime / 60);
            const minutes = data.runtime % 60;
            detailsLine.push(`${hours}h ${minutes}min`);
        }
        if (data.genres && data.genres.length > 0) {
            detailsLine.push(data.genres.map(g => g.name).join(", "));
        }
        modalDetails.textContent = detailsLine.join(" - ");

        // Line 3: Synopsis
        modalSynopsis.textContent = data.overview || "Synopsis non disponible.";

        // Hide crew section (no longer needed)
        modalCrew.textContent = "";

        // Links (Letterboxd and Trailer)
        modalLinks.innerHTML = '';
        const letterboxdLink = document.createElement("a");
        letterboxdLink.href = `https://letterboxd.com/search/${encodeURIComponent(film.nom)}/`;
        letterboxdLink.textContent = "Letterboxd";
        letterboxdLink.target = "_blank";
        letterboxdLink.className = "letterboxd-link";
        modalLinks.appendChild(letterboxdLink);

        const trailerLink = document.createElement("a");
        trailerLink.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(film.nom + ' trailer vostfr')}`;
        trailerLink.textContent = "Trailer";
        trailerLink.target = "_blank";
        trailerLink.className = "trailer-link";
        modalLinks.appendChild(trailerLink);

        // Alternative Posters
        if (data.images && data.images.posters && data.images.posters.length > 0) {
            // Show posters from all countries (not only fr). Keep only tall posters (poster aspect).
            const posters = data.images.posters.filter(p => p.file_path && p.aspect_ratio < 1);
            // Clear previous
            modalAlternativePosters.innerHTML = '';

            posters.forEach(p => {
                const container = document.createElement('div');
                container.className = 'poster-option';

                const badge = document.createElement('span');
                badge.className = 'poster-lang-badge';
                badge.textContent = p.iso_639_1 ? p.iso_639_1.toUpperCase() : 'ORIG';

                const img = document.createElement("img");
                img.src = `https://image.tmdb.org/t/p/w500${p.file_path}`;
                img.alt = "Affiche alternative";
                img.title = `Cliquer pour utiliser cette affiche (${badge.textContent})`;
                img.className = "film-modal-screenshots-list-item";

                container.appendChild(badge);
                container.appendChild(img);

                container.addEventListener("click", async () => {
                    const targetCollection = film.collectionKey === 'courter' ? filmsCourtsCollection : filmsCollection;
                    await updateDoc(doc(targetCollection, film.id), { affiche: img.src });
                    showNotification("Affiche modifiée !");
                    closeFilmModal(); // Close modal after changing poster
                    chargerFilms(); // Reload film list to reflect change
                    loadFilmsForDuel();
                });

                modalAlternativePosters.appendChild(container);
            });
        }

    } catch (error) {
        console.error("Erreur lors du chargement des détails du film pour la modale:", error);
        showNotification("Impossible de charger les détails du film.");
    }
}

// Function to close modal and stop any playing video
function closeFilmModal() {
    filmDetailModal.style.display = "none";
    // Clear the poster container to stop any playing video
    modalPosterContainer.innerHTML = '';
}

// Close modal functionality
modalCloseBtn.addEventListener("click", () => {
    closeFilmModal();
});

filmDetailModal.addEventListener("click", (event) => {
    if (event.target === filmDetailModal) {
        closeFilmModal();
    }
});

function openTab(tabName) {
    // Hide all tab content
    document.querySelectorAll(".tab-content").forEach(tabContent => {
        tabContent.classList.remove("active");
    });
    // Deactivate all tab buttons
    document.querySelectorAll(".tab-button").forEach(tabButton => {
        tabButton.classList.remove("active");
    });

    // Show the selected tab content
    document.getElementById(`tab-${tabName}`).classList.add("active");
    // Activate the corresponding tab button
    document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add("active");
}

// Add event listeners to tab buttons
tabButtons.forEach(button => {
    button.addEventListener("click", () => {
        const tabName = button.dataset.tab;
        openTab(tabName);
    });
});


// === Lien DL dynamique (stocké sur Firestore) ===
// SUPPRIMÉ : toute la logique du bouton dlLinkBtn (plus de bouton, plus de code JS associé)

// 📌 Attente que la page soit chargée
document.addEventListener("DOMContentLoaded", () => {
    console.log("📜 Document chargé, initialisation...");
    
    const filmForm = document.getElementById("filmForm");
    const randomFilmBtn = document.getElementById("randomFilmBtn");
    const toggleWatchCourterBtn = document.getElementById("toggleWatchCourterBtn");
    const currentUserLabel = document.getElementById("watchparter-current-user");

    // Restaurer le mode (liste principale ou Watch Courter)
    const storedMode = localStorage.getItem('watchparter_mode');
    if (storedMode === 'courter') {
        currentMode = 'courter';
    }
    updateModeUI();

    // Charger les films au démarrage
    chargerFilms();

    // Charger les films pour le duel
    loadFilmsForDuel();

    if (toggleWatchCourterBtn) {
        toggleWatchCourterBtn.addEventListener('click', () => {
            const nextMode = isCourterMode() ? 'main' : 'courter';
            applyMode(nextMode);
        });
    }

    // 📌 Gestion du formulaire pour ajouter un film
    filmForm.addEventListener("submit", (event) => {
        event.preventDefault(); // Empêche le rechargement de la page
        const pseudo = requireSupersiteUsername();
        if (!pseudo) return;
        ajouterFilm(filmInput.value, pseudo);
        filmInput.value = ""; // Vide le champ après l'ajout
    });

    // 📌 Gestion du bouton pour choisir un film au hasard
    randomFilmBtn.addEventListener("click", choisirFilmAleatoire);

    const randomFilmDisplay = document.getElementById("randomFilmDisplay");

    function updateCurrentUserLabel() {
        if (!currentUserLabel) return;
        const username = getSupersiteUsername();
        currentUserLabel.textContent = username
            ? `Connecte : @${username}`
            : "Connecte-toi via le header SuperSite";
    }
    updateCurrentUserLabel();
    if (window.ReviewsStore?.onAuthChanged) {
        window.ReviewsStore.onAuthChanged(updateCurrentUserLabel);
    }

    // Ajout du champ de recherche au-dessus de la liste des films
    function addFilmListSearchBar() {
        if (document.getElementById('filmListSearchBar')) return;
        const searchBar = document.createElement('div');
        searchBar.id = 'filmListSearchBar';
        searchBar.style.display = 'flex';
        searchBar.style.alignItems = 'center';
        searchBar.style.gap = '8px';
        searchBar.style.margin = '0 0 8px 0';
        // Positionnement : dans le nouveau conteneur
        const searchBarContainer = document.getElementById('filmListSearchBarContainer');
        if (searchBarContainer) {
            searchBarContainer.appendChild(searchBar);
        }
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'filmListSearchInput';
        input.placeholder = 'Rechercher dans la liste...';
        input.style.padding = '6px 10px';
        input.style.borderRadius = '5px';
        input.style.border = '1.5px solid #28a745';
        input.style.background = '#23272b';
        input.style.color = '#e0e0e0';
        input.style.fontSize = '1em';
        input.style.width = '180px';
        input.addEventListener('input', chargerFilms);
        searchBar.appendChild(input);
    }

    addFilmListSearchBar();
});

// 📌 Chargement unique de html2canvas
let html2canvasPromise = null;
function ensureHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve();
    if (html2canvasPromise) return html2canvasPromise;
    html2canvasPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Impossible de charger html2canvas'));
        document.head.appendChild(script);
    });
    return html2canvasPromise;
}

// 📌 Attendre que les images soient chargées (évite les affiches manquantes sur iOS)
async function waitForImages(root) {
    const imgs = Array.from(root.querySelectorAll('img'));
    if (!imgs.length) return;
    await Promise.all(imgs.map(img => new Promise(resolve => {
        // Si déjà chargée
        if (img.complete && img.naturalWidth > 0) return resolve();
        // Forcer CORS anonyme quand l'URL n'est pas data:
        if (!img.src.startsWith('data:')) {
            img.crossOrigin = 'anonymous';
        }
        img.onload = () => resolve();
        img.onerror = () => resolve(); // on ignore les échecs pour ne pas bloquer
    })));
}

// Force un src et attend le décodage (utile après conversion en dataURL)
function setImageSrcAndWait(img, newSrc) {
    return new Promise(resolve => {
        if (img.src === newSrc && img.complete && img.naturalWidth > 0) return resolve();
        const cleanup = () => {
            img.removeEventListener('load', onLoad);
            img.removeEventListener('error', onError);
            resolve();
        };
        const onLoad = () => cleanup();
        const onError = () => cleanup();
        img.addEventListener('load', onLoad, { once: true });
        img.addEventListener('error', onError, { once: true });
        img.crossOrigin = 'anonymous';
        img.setAttribute('crossorigin', 'anonymous');
        img.src = newSrc;
        // Si déjà en cache, déclenche immédiatement
        if (img.complete && img.naturalWidth > 0) cleanup();
    });
}

// 📌 Convertit toutes les affiches du clone en dataURL pour éviter les blocages CORS (surtout iOS)
async function inlineImagesToDataURL(root) {
    const imgs = Array.from(root.querySelectorAll('img'));
    if (!imgs.length) return;
    await Promise.all(imgs.map(async (img) => {
        if (!img.src || img.src.startsWith('data:')) return;
        const originalSrc = img.src;
        img.crossOrigin = 'anonymous';
        img.setAttribute('crossorigin', 'anonymous');
        try {
            // Passe par l'API proxy pour éviter les blocages CORS (notamment iOS/Safari)
            const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(originalSrc)}`;
            const resp = await fetch(proxyUrl, { method: 'GET', cache: 'no-store' });
            if (!resp.ok) throw new Error(`proxy ${resp.status}`);
            const json = await resp.json();
            if (json && json.dataUrl) {
                await setImageSrcAndWait(img, json.dataUrl);
                return;
            }
        } catch (e) {
            // En cas d'échec, on laisse la source d'origine (html2canvas tentera avec useCORS)
            console.warn('Inline image failed via proxy', originalSrc, e);
        }
        // Fallback direct fetch + dataURL
        try {
            const directResp = await fetch(originalSrc, { mode: 'cors', cache: 'no-store' });
            if (!directResp.ok) throw new Error(`direct ${directResp.status}`);
            const blob = await directResp.blob();
            const dataUrl = await blobToBase64(blob);
            await setImageSrcAndWait(img, dataUrl);
            return;
        } catch (e) {
            console.warn('Inline image direct fetch failed', originalSrc, e);
        }
        // Dernier recours : pixel transparent pour éviter une image vide taintée
        await setImageSrcAndWait(img, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6C7QAAAABJRU5ErkJggg==');
    }));
}

// 📌 Récupère le pseudo sélectionné et son icône
function getSelectedVoterInfo() {
    const voter = getSupersiteUsername() || '';
    let icon = '';
    if (voter === 'Antho') icon = localAsset('antho.png');
    else if (voter === 'Claire') icon = localAsset('claire.png');
    else if (voter === 'Nico') icon = localAsset('nico.png');
    return { voter, icon };
}

// 📌 Capture le bloc des gagnants + top 5 et renvoie un canvas
async function captureWinnersCanvas() {
    await ensureHtml2Canvas();
    const element = document.getElementById('duelWinnerSimple');
    if (!element || element.style.display === 'none') {
        throw new Error('Aucun gagnant affiché');
    }

    // Créer un wrapper hors écran pour une largeur maîtrisée
    const elementWidth = element.scrollWidth || element.offsetWidth || 0;
    // Largeur plafonnée pour forcer une capture plus étroite
    const desiredWidth = Math.min(900, Math.max(760, elementWidth + 40));

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.top = '-9999px';
    wrapper.style.left = '-9999px';
    wrapper.style.width = `${desiredWidth}px`;
    wrapper.style.backgroundColor = '#16181a';
    wrapper.style.padding = '18px';
    wrapper.style.borderRadius = '8px';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.boxSizing = 'border-box';

    const clone = element.cloneNode(true);
    clone.style.display = 'flex';
    const shareBtnClone = clone.querySelector('#shareWinnersBtn');
    if (shareBtnClone) shareBtnClone.style.display = 'none';

    // Badge votant en haut à gauche (icône seule, sans fond)
    const { voter, icon } = getSelectedVoterInfo();
    if (voter && icon) {
        const badge = document.createElement('div');
        badge.style.position = 'absolute';
        badge.style.top = '8px';
        badge.style.left = '8px';
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = 'center';
        badge.style.padding = '0';
        badge.style.background = 'transparent';
        badge.style.border = 'none';
        badge.style.borderRadius = '0';
        badge.style.boxShadow = 'none';

        const img = document.createElement('img');
        img.src = icon;
        img.alt = voter;
        img.width = 52;
        img.height = 52;
        img.style.objectFit = 'contain';
        img.style.borderRadius = '10px';
        badge.appendChild(img);
        wrapper.appendChild(badge);
    }
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    // Attendre le chargement des affiches avant capture
    await waitForImages(wrapper);
    // Inline les images en dataURL pour iOS / CORS
    await inlineImagesToDataURL(wrapper);
    // Re-attendre après conversion (mobile pouvait capturer avant décodage)
    await waitForImages(wrapper);

    try {
        const canvas = await window.html2canvas(wrapper, {
            backgroundColor: '#16181a',
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: false,
            width: desiredWidth,
            imageTimeout: 12000
        });
        document.body.removeChild(wrapper);
        return canvas;
    } catch (err) {
        document.body.removeChild(wrapper);
        throw err;
    }
}

// 📌 Envoi de la capture sur Discord via Netlify Function (évite le CORS)
async function shareTopWinnersToDiscord() {
    try {
        const canvas = await captureWinnersCanvas();
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        if (!blob) throw new Error('Conversion en image échouée');
        const base64 = await blobToBase64(blob);

        const voter = getSupersiteUsername() || '';
        const voterLabel = voter ? `${voter} a voté` : '';

        const resp = await fetch(DISCORD_FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageBase64: base64,
                content: voterLabel ? `${voterLabel} · Résultats du duel 🎬` : 'Résultats du duel 🎬'
            })
        });
        if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(`Discord proxy ${resp.status}: ${txt}`);
        }
        showNotification('Capture envoyée sur Discord');
    } catch (err) {
        console.error(err);
        showNotification("Échec de l'envoi Discord");
    }
}

// 📌 Affiche ou masque le bouton de partage
function setShareButtonVisible(show) {
    const btn = document.getElementById('shareWinnersBtn');
    if (btn) btn.style.display = show ? 'inline-flex' : 'none';
}

// 📌 Convertit un blob en base64 (DataURL)
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// 📌 Télécharge la capture localement
async function captureTopWinners() {
    try {
        const canvas = await captureWinnersCanvas();
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `duel-top5-${Date.now()}.png`;
        link.click();
    } catch (err) {
        console.error('Erreur lors de la capture:', err);
        showNotification("Erreur lors de la capture d'écran");
    }
}

// Attachement des événements click aux boutons de capture/partage
document.addEventListener('DOMContentLoaded', function() {
    const captureBtn = document.getElementById('captureWinnersBtn');
    if (captureBtn) {
        captureBtn.addEventListener('click', captureTopWinners);
    }
    const shareBtn = document.getElementById('shareWinnersBtn');
    if (shareBtn) {
        shareBtn.style.display = 'none';
        shareBtn.addEventListener('click', shareTopWinnersToDiscord);
    }
});

// ===== FONCTIONNALITÉ BINGO =====

// Document Firebase unique partagé pour le bingo
const bingoDocRef = doc(db, "bingo", "global");
let bingoUnsubscribe = null; // Pour gérer le listener en temps réel

// Défis prédéfinis pour le bingo cinéma
const bingoChallenges = [
    "Film d'action", "Film français", "Film avant 2000", "Film Marvel",
    "Comédie romantique", "Film d'horreur", "Film d'animation", "Thriller",
    "Film avec Morgan Freeman", "Film Pixar", "Film de guerre", "Western",
    "Film musical", "Film en noir & blanc", "Trilogie", "Film oscarisé",
    "Film de super-héros", "Film avec twist", "Film biographique", "Science-fiction",
    "Film de gangsters", "Film catastrophe", "Film en costumes", "Documentaire",
    "Film culte", "Film des années 80", "Film asiatique", "Film d'espionnage",
    "Film romantique", "Film de zombies", "Film spatial", "Saga",
    "Film avec Tom Hanks", "Film de Spielberg", "Film de Tarantino", "Film de Nolan"
];

// État du bingo
let currentBingoGrid = [];
let bingoSize = 5;
let isEditMode = false;
let isSyncing = false; // Évite les boucles de synchronisation
let previousWinCount = 0; // Compte le nombre de combinaisons gagnantes précédentes

// Générer une nouvelle grille de bingo
function generateBingoGrid(size) {
    const totalCells = size * size;
    const shuffled = [...bingoChallenges].sort(() => Math.random() - 0.5);
    const grid = shuffled.slice(0, totalCells);
    
    return grid.map((challenge, index) => ({
        id: index,
        text: challenge,
        checked: false
    }));
}

// Afficher la grille de bingo
function displayBingoGrid() {
    const bingoGrid = document.getElementById("bingoGrid");
    if (!bingoGrid) return; // Protection si l'élément n'existe pas
    
    bingoGrid.className = `bingo-grid size-${bingoSize}`;
    bingoGrid.innerHTML = "";
    
    currentBingoGrid.forEach((cell, index) => {
        const cellDiv = document.createElement("div");
        cellDiv.className = "bingo-cell";
        if (cell.checked) cellDiv.classList.add("checked");
        
        if (isEditMode) {
            cellDiv.classList.add("edit-mode");
            const input = document.createElement("input");
            input.type = "text";
            input.value = cell.text;
            input.addEventListener("blur", () => {
                cell.text = input.value;
                saveBingoGrid();
            });
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    input.blur();
                }
            });
            cellDiv.appendChild(input);
        } else {
            cellDiv.textContent = cell.text;
            cellDiv.addEventListener("click", () => toggleBingoCell(index));
        }
        
        bingoGrid.appendChild(cellDiv);
    });
}

// Basculer l'état d'une case
function toggleBingoCell(index) {
    if (isEditMode) return;
    
    currentBingoGrid[index].checked = !currentBingoGrid[index].checked;
    
    displayBingoGrid();
    saveBingoGrid();
    checkBingoWin();
}

// Vérifier si le joueur a gagné
function checkBingoWin() {
    const size = bingoSize;
    let currentWinCount = 0;
    
    // Vérifier les lignes
    for (let row = 0; row < size; row++) {
        let lineComplete = true;
        for (let col = 0; col < size; col++) {
            if (!currentBingoGrid[row * size + col].checked) {
                lineComplete = false;
                break;
            }
        }
        if (lineComplete) {
            currentWinCount++;
        }
    }
    
    // Vérifier les colonnes
    for (let col = 0; col < size; col++) {
        let lineComplete = true;
        for (let row = 0; row < size; row++) {
            if (!currentBingoGrid[row * size + col].checked) {
                lineComplete = false;
                break;
            }
        }
        if (lineComplete) {
            currentWinCount++;
        }
    }
    
    // Vérifier les diagonales
    let diag1Complete = true;
    let diag2Complete = true;
    for (let i = 0; i < size; i++) {
        if (!currentBingoGrid[i * size + i].checked) diag1Complete = false;
        if (!currentBingoGrid[i * size + (size - 1 - i)].checked) diag2Complete = false;
    }
    if (diag1Complete) currentWinCount++;
    if (diag2Complete) currentWinCount++;
    
    // Afficher le GIF si on vient juste de compléter une nouvelle ligne/colonne/diagonale
    if (currentWinCount > previousWinCount) {
        showBingoWin();
    }
    
    // Mémoriser le nombre actuel pour la prochaine vérification
    previousWinCount = currentWinCount;
}

// Afficher le message de victoire avec animation GIF
function showBingoWin() {
    // Choisir un GIF aléatoire parmi les 5
    const bingoGifs = ["bingo1.gif", "bingo2.gif", "bingo3.gif", "bingo4.gif", "bingo5.gif"].map(localAsset);
    const randomGif = bingoGifs[Math.floor(Math.random() * bingoGifs.length)];
    
    // Créer une div overlay pour le GIF au milieu de l'écran
    const bingoOverlay = document.createElement("div");
    bingoOverlay.className = "bingo-win-overlay";
    
    const img = document.createElement("img");
    img.src = randomGif;
    img.alt = "BINGO Animation";
    img.className = "bingo-win-gif";
    
    bingoOverlay.appendChild(img);
    document.body.appendChild(bingoOverlay);
    
    // Supprimer le GIF après 4 secondes
    setTimeout(() => {
        bingoOverlay.remove();
    }, 4000);
}

// Sauvegarder la grille dans Firebase (document unique partagé)
async function saveBingoGrid() {
    if (isSyncing) return; // Évite les boucles de sauvegarde pendant la synchronisation
    
    try {
        const bingoData = {
            grid: currentBingoGrid,
            size: bingoSize,
            updatedAt: Date.now()
        };
        
        // Utiliser setDoc pour créer ou mettre à jour le document global
        await setDoc(bingoDocRef, bingoData);
    } catch (error) {
        console.error("Erreur lors de la sauvegarde du bingo:", error);
    }
}

// Charger la grille depuis Firebase et activer la synchronisation en temps réel
async function loadBingoGrid() {
    try {
        // Nettoyer l'ancien listener s'il existe
        if (bingoUnsubscribe) {
            bingoUnsubscribe();
        }
        
        // Charger la grille initiale
        const docSnap = await getDoc(bingoDocRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            isSyncing = true;
            currentBingoGrid = data.grid || [];
            bingoSize = data.size || 5;
            previousWinCount = 0; // Réinitialiser le compteur au chargement
            const sizeSelect = document.getElementById("bingoSizeSelect");
            if (sizeSelect) sizeSelect.value = bingoSize;
            displayBingoGrid();
            isSyncing = false;
        } else {
            // Créer une nouvelle grille si elle n'existe pas
            await createNewBingo();
        }
        
        // Activer la synchronisation en temps réel
        bingoUnsubscribe = onSnapshot(bingoDocRef, (doc) => {
            if (doc.exists() && !isSyncing) {
                const data = doc.data();
                isSyncing = true;
                currentBingoGrid = data.grid || [];
                bingoSize = data.size || 5;
                const sizeSelect = document.getElementById("bingoSizeSelect");
                if (sizeSelect) sizeSelect.value = bingoSize;
                displayBingoGrid();
                checkBingoWin();
                isSyncing = false;
            }
        });
        
    } catch (error) {
        console.error("Erreur lors du chargement du bingo:", error);
        await createNewBingo();
    }
}

// Créer une nouvelle grille
async function createNewBingo() {
    const sizeSelect = document.getElementById("bingoSizeSelect");
    bingoSize = sizeSelect ? parseInt(sizeSelect.value) : 5;
    currentBingoGrid = generateBingoGrid(bingoSize);
    previousWinCount = 0; // Réinitialiser le compteur pour la nouvelle grille
    displayBingoGrid();
    await saveBingoGrid();
}

// Réinitialiser les cases cochées
function resetBingo() {
    currentBingoGrid.forEach(cell => cell.checked = false);
    displayBingoGrid();
    saveBingoGrid();
    showNotification("Bingo réinitialisé !");
}

// Basculer le mode édition
function toggleEditMode() {
    isEditMode = !isEditMode;
    const editBtn = document.getElementById("editBingoBtn");
    editBtn.textContent = isEditMode ? "Terminer" : "Modifier Cases";
    editBtn.style.background = isEditMode ? "#ff6347" : "#28a745";
    displayBingoGrid();
    
    if (!isEditMode) {
        saveBingoGrid();
    }
}

// Afficher/masquer la section bingo
function toggleBingoSection() {
    const bingoSection = document.getElementById("bingoSection");
    const filmList = document.getElementById("filmList");
    const duelWrapper = document.getElementById("bottomDuelWrapper");
    const toggleBtn = document.getElementById("toggleBingoBtn");
    
    if (bingoSection.style.display === "none") {
        bingoSection.style.display = "flex";
        filmList.style.display = "none";
        duelWrapper.style.display = "none";
        toggleBtn.textContent = "🎯 Fermer Bingo";
        loadBingoGrid();
    } else {
        bingoSection.style.display = "none";
        filmList.style.display = "";
        duelWrapper.style.display = "";
        toggleBtn.textContent = "🎯 Bingo";
        isEditMode = false;
        // Nettoyer le listener quand on ferme le bingo
        if (bingoUnsubscribe) {
            bingoUnsubscribe();
            bingoUnsubscribe = null;
        }
    }
}

// Event listeners pour le bingo
document.addEventListener("DOMContentLoaded", () => {
    const toggleBingoBtn = document.getElementById("toggleBingoBtn");
    const editBingoBtn = document.getElementById("editBingoBtn");
    const bingoSizeSelect = document.getElementById("bingoSizeSelect");
    
    if (toggleBingoBtn) {
        toggleBingoBtn.addEventListener("click", toggleBingoSection);
    }
    
    if (editBingoBtn) {
        editBingoBtn.addEventListener("click", toggleEditMode);
    }
    
    if (bingoSizeSelect) {
        bingoSizeSelect.addEventListener("change", () => {
            if (confirm("Changer la taille de la grille ? La grille actuelle sera perdue.")) {
                createNewBingo();
                showNotification("Taille de grille modifiée !");
            } else {
                bingoSizeSelect.value = bingoSize;
            }
        });
    }
});
