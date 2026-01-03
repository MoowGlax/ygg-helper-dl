// popup.js - Gestion de l'interface popup

const STORAGE_KEY = 'ygg_timers';
const STATS_KEY = 'ygg_stats_wasted';
const TIMER_DURATION = 30; // secondes

document.addEventListener('DOMContentLoaded', () => {
    updateTimersList();
    updateStats();
    checkUpdateStatus();
    
    // Set version from manifest
    const manifest = chrome.runtime.getManifest();
    const versionEl = document.getElementById('appVersion');
    if (versionEl) {
        versionEl.innerText = `v${manifest.version}`;
    }
    
    // Mise à jour régulière
    setInterval(() => {
        updateTimersList();
        updateStats();
    }, 1000);

    // Easter egg credits
    document.getElementById('creditsLink').addEventListener('click', (e) => {
        chrome.tabs.create({ url: 'https://github.com/MoowGlax' });
    });

    // Clean all button
    document.getElementById('cleanAllBtn').addEventListener('click', () => {
        chrome.storage.local.remove(STORAGE_KEY, () => {
            updateTimersList();
        });
    });
    
    // Update link
    const updateLink = document.getElementById('updateLink');
    if (updateLink) {
        updateLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.storage.local.get(['ygg_update_available'], (result) => {
                if (result.ygg_update_available && result.ygg_update_available.url) {
                    chrome.tabs.create({ url: result.ygg_update_available.url });
                }
            });
        });
    }
});

function checkUpdateStatus() {
    chrome.storage.local.get(['ygg_update_available'], (result) => {
        const updateInfo = result.ygg_update_available;
        const banner = document.getElementById('updateBanner');
        const versionSpan = document.getElementById('newVersion');
        
        if (updateInfo && banner && versionSpan) {
            versionSpan.innerText = updateInfo.version;
            banner.style.display = 'flex';
        } else if (banner) {
            banner.style.display = 'none';
        }
    });
}

function updateStats() {
    chrome.storage.local.get([STATS_KEY], (result) => {
        const totalSeconds = result[STATS_KEY] || 0;
        const statsEl = document.getElementById('wastedTimeDisplay');
        if (statsEl) {
            statsEl.innerText = formatTime(totalSeconds);
        }
    });
}

function formatTime(totalSeconds) {
    if (totalSeconds < 60) return `${totalSeconds}s`;
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
}

function updateTimersList() {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
        const timers = result[STORAGE_KEY] || {};
        const container = document.getElementById('timersList');
        const countBadge = document.getElementById('activeCount');
        const now = Date.now();
        const timerIds = Object.keys(timers);

        // Séparation Actifs / En attente
        const activeTimers = [];
        const pendingTimers = [];

        timerIds.forEach(id => {
            if (timers[id].status === 'pending') {
                pendingTimers.push({ id, ...timers[id] });
            } else {
                activeTimers.push({ id, ...timers[id] });
            }
        });

        // Update badge counts
        countBadge.innerText = activeTimers.length;
        
        const pendingTitle = document.getElementById('pendingSectionTitle');
        const pendingList = document.getElementById('pendingList');
        const pendingCount = document.getElementById('pendingCount');

        if (pendingTimers.length > 0) {
            pendingTitle.style.display = 'flex';
            pendingCount.innerText = pendingTimers.length;
            renderPendingList(pendingTimers, pendingList);
        } else {
            pendingTitle.style.display = 'none';
            pendingList.innerHTML = '';
        }

        // Rendu des actifs
        if (activeTimers.length === 0 && pendingTimers.length === 0) {
            if (!container.querySelector('.empty-state')) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📂</div>
                        <p>Aucun téléchargement en cours</p>
                        <span class="empty-sub">Visitez une page de torrent pour commencer</span>
                    </div>`;
            }
        } else {
            // Si nous avons des timers, on supprime l'état vide si présent
            const emptyState = container.querySelector('.empty-state');
            if (emptyState) emptyState.remove();
            
            renderActiveList(activeTimers, container, now, timers);
        }
    });
}

function renderPendingList(list, container) {
    // Nettoyage rapide (ou diff différée si on voulait optimiser)
    container.innerHTML = '';
    
    list.forEach(item => {
        const card = document.createElement('div');
        card.className = 'timer-card pending';
        card.style.borderLeft = '4px solid #9b59b6'; // Violet
        card.innerHTML = `
             <div class="timer-header">
                <div class="timer-name" title="${item.name}">${item.name || 'Torrent #' + item.id}</div>
            </div>
            <div class="timer-footer">
                <span class="timer-status" style="color: #8e44ad">En attente...</span>
                <button class="action-btn" style="background-color: #8e44ad; cursor: pointer;">
                    <span>▶️ Démarrer</span>
                </button>
            </div>
        `;

        const btn = card.querySelector('.action-btn');
        btn.onclick = () => {
            // Force start via Background
            chrome.runtime.sendMessage({ action: "FORCE_START", tabId: item.tabId });
            btn.innerText = "Lancement...";
            btn.disabled = true;
        };

        container.appendChild(card);
    });
}

function renderActiveList(list, container, now, allTimers) {
    // Gestion du DOM (création/mise à jour)
    list.forEach(data => {
        const id = data.id;
        const timer = data;
        const elapsedSeconds = (now - timer.startTime) / 1000;
        const remaining = Math.max(0, TIMER_DURATION - elapsedSeconds);
        const progressPercent = Math.min(100, (elapsedSeconds / TIMER_DURATION) * 100);
        const isReady = remaining <= 0;

        let card = document.getElementById(`timer-${id}`);

        if (!card) {
            // Création de la carte si elle n'existe pas
            card = document.createElement('div');
            card.id = `timer-${id}`;
            card.className = 'timer-card';
            card.innerHTML = `
                <div class="timer-header">
                    <div class="timer-name" title="${timer.name}">${timer.name || 'Torrent #' + id}</div>
                </div>
                <div class="timer-progress-container">
                    <div class="timer-progress-bar" style="width: 0%"></div>
                </div>
                <div class="timer-footer">
                    <span class="timer-status">Calcul...</span>
                    <button class="action-btn" disabled>
                        <span>⏳ Patientez...</span>
                    </button>
                </div>
            `;
            container.appendChild(card);
        }

        // Mise à jour des éléments
        const progressBar = card.querySelector('.timer-progress-bar');
        const statusText = card.querySelector('.timer-status');
        const actionBtn = card.querySelector('.action-btn');

        progressBar.style.width = `${progressPercent}%`;

        if (isReady) {
            statusText.innerText = "Prêt à télécharger";
            statusText.style.color = "#2ecc71";
            
            if (!actionBtn.classList.contains('ready')) {
                actionBtn.classList.add('ready');
                actionBtn.disabled = false;
                actionBtn.style.backgroundColor = '';
                actionBtn.innerHTML = `<span>📥 Télécharger</span>`;
                
                // Gestionnaire de clic (une seule fois)
                actionBtn.onclick = () => {
                    actionBtn.innerHTML = `<span>🚀 Lancement...</span>`;
                    actionBtn.disabled = true;
                    
                    // Ajout stats aussi ici
                    chrome.runtime.sendMessage({ action: "ADD_WASTED_TIME" });

                    const finalName = (timer.name || "Torrent").endsWith('.torrent') ? (timer.name || "Torrent") : (timer.name || "Torrent") + '.torrent';

                    chrome.runtime.sendMessage({
                        action: "SCHEDULE_DOWNLOAD",
                        url: `https://www.yggtorrent.org/engine/download_torrent?id=${id}&token=${timer.token}`,
                        filename: finalName
                    });

                    setTimeout(() => {
                        chrome.runtime.sendMessage({ action: "TIMER_COMPLETED_CLEANUP", timerId: id });
                        // Supprimer visuellement après lancement
                        card.style.opacity = '0';
                        card.style.transform = 'translateX(100px)';
                        setTimeout(() => {
                            card.remove();
                            delete allTimers[id];
                            chrome.storage.local.set({ [STORAGE_KEY]: allTimers });
                        }, 300);
                    }, 500);
                };
            }
        } else {
            statusText.innerText = `Patience... ${Math.ceil(remaining)}s`;
            statusText.style.color = '#94a3b8';
            
            actionBtn.classList.remove('ready');
            actionBtn.disabled = true;
            actionBtn.style.backgroundColor = '#475569';
            actionBtn.innerHTML = `<span>⏳ ${Math.ceil(remaining)}s</span>`;
        }
    });

    // Nettoyage des cartes orphelines (qui ne sont plus dans la liste active)
    const currentCards = container.querySelectorAll('.timer-card');
    currentCards.forEach(card => {
        const id = card.id.replace('timer-', '');
        if (!list.find(t => t.id === id)) {
            card.remove();
        }
    });
}
