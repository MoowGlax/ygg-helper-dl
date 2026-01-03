// background.js
// Service Worker pour YggTorrent Helper
// Gestion du verrouillage global (1 seul timer actif) et des stats

const STORAGE_KEY = 'ygg_timers';
const STATS_KEY = 'ygg_stats_wasted';
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 heure

// --- CONFIGURATION UPDATE ---
// Remplacez par votre repo: USER/REPO/BRANCH
const GITHUB_MANIFEST_URL = "https://raw.githubusercontent.com/MoowGlax/ygg-helper-dl/refs/heads/main/manifest.json";
const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 heures

// État global : Un seul timer peut être actif à la fois
let isTimerRunning = false;

// Au démarrage
chrome.runtime.onStartup.addListener(() => {
    checkForUpdates();
});

// À l'installation
chrome.runtime.onInstalled.addListener(() => {
    checkForUpdates();
});

// Check régulier
setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL);

async function checkForUpdates() {
    try {
        const response = await fetch(GITHUB_MANIFEST_URL);
        if (!response.ok) return;

        const remoteManifest = await response.json();
        const localManifest = chrome.runtime.getManifest();

        if (isNewerVersion(localManifest.version, remoteManifest.version)) {
            console.log(`[Update] Nouvelle version disponible: ${remoteManifest.version}`);
            
            // Stocker l'info de mise à jour
            chrome.storage.local.set({ 
                'ygg_update_available': {
                    version: remoteManifest.version,
                    url: "https://github.com/MoowGlax/ygg-helper-dl/releases"
                }
            });

            // Badge sur l'icône
            chrome.action.setBadgeText({ text: "NEW" });
            chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });
        } else {
            // Nettoyage si à jour
            chrome.storage.local.remove('ygg_update_available');
            chrome.action.setBadgeText({ text: "" });
        }
    } catch (e) {
        console.error("[Update] Erreur lors de la vérification:", e);
    }
}

function isNewerVersion(local, remote) {
    const v1 = local.split('.').map(Number);
    const v2 = remote.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
        const n1 = v1[i] || 0;
        const n2 = v2[i] || 0;
        if (n2 > n1) return true;
        if (n2 < n1) return false;
    }
    return false;
}

// Gestion des messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // Demande si on peut démarrer un timer
    if (request.action === "CAN_I_START") {
        sendResponse({ canStart: !isTimerRunning });
        return true; // Asynchrone
    }

    // Un onglet signale qu'il démarre un timer
    else if (request.action === "TIMER_STARTED") {
        isTimerRunning = true;
        console.log(`[Lock] Timer verrouillé par Tab ${sender.tab ? sender.tab.id : 'unknown'}`);
    }

    // Enregistrement d'un timer en attente (Pending)
    else if (request.action === "REGISTER_PENDING") {
        const timerId = request.torrentId;
        chrome.storage.local.get([STORAGE_KEY], (result) => {
            const timers = result[STORAGE_KEY] || {};
            // On ne met à jour que si pas déjà existant ou différent
            if (!timers[timerId] || timers[timerId].status !== 'pending') {
                timers[timerId] = {
                    status: 'pending',
                    name: request.name,
                    tabId: sender.tab.id,
                    addedAt: Date.now()
                };
                chrome.storage.local.set({ [STORAGE_KEY]: timers });
                console.log(`[Pending] Torrent ${timerId} mis en attente (Tab ${sender.tab.id})`);
            }
        });
    }

    // Force le démarrage d'un timer (depuis Popup)
    else if (request.action === "FORCE_START") {
        const targetTabId = request.tabId;
        if (targetTabId) {
            chrome.tabs.sendMessage(targetTabId, { action: "TRIGGER_START" });
            // On met à jour le statut immédiatement pour éviter le lag UI
            // (Le content script fera la mise à jour réelle avec le token plus tard)
        }
    }

    // Un onglet signale qu'il a fini ou annulé (libère le verrou)
    else if (request.action === "TIMER_FINISHED" || request.action === "TIMER_CANCELLED") {
        isTimerRunning = false;
        console.log(`[Lock] Timer libéré.`);
    }

    // Ajout du temps perdu (Statistique fun)
    else if (request.action === "ADD_WASTED_TIME") {
        addWastedTime(30); // Ajoute 30 secondes
    }

    // Gestion du téléchargement (Proxy)
    else if (request.action === "SCHEDULE_DOWNLOAD") {
        chrome.downloads.download({
            url: request.url,
            filename: request.filename,
            conflictAction: 'uniquify'
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error("Erreur téléchargement:", chrome.runtime.lastError);
            } else {
                console.log(`Téléchargement lancé: ${downloadId}`);
                // Le téléchargement a commencé, on considère le timer comme "fini" pour le verrouillage
                // (Même si en théorie il était déjà fini pour être cliquable)
                chrome.storage.local.set({ [LOCK_KEY]: false });
            }
        });
    }
});

// --- Gestion des Statistiques (Temps Perdu) ---
function addWastedTime(seconds) {
    chrome.storage.local.get([STATS_KEY], (result) => {
        const currentTotal = result[STATS_KEY] || 0;
        const newTotal = currentTotal + seconds;
        chrome.storage.local.set({ [STATS_KEY]: newTotal });
        console.log(`[Stats] Temps perdu total : ${newTotal}s`);
    });
}

// --- Nettoyage périodique du stockage ---
function cleanupStorage() {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
        const timers = result[STORAGE_KEY];
        if (!timers) return;

        const now = Date.now();
        let changed = false;

        for (const [id, data] of Object.entries(timers)) {
            // Nettoyer les vieux timers (> 1h)
            if (now - data.startTime > CLEANUP_INTERVAL) {
                delete timers[id];
                changed = true;
            }
        }

        if (changed) {
            chrome.storage.local.set({ [STORAGE_KEY]: timers });
        }
    });
}

setInterval(cleanupStorage, CLEANUP_INTERVAL);
