// content.js
// Timer Manager pour YggTorrent (v1.3 - Manual Trigger)
// Gestion manuelle si un timer est déjà en cours

const YggTimerManager = {
    timerSeconds: 30,
    storageKey: 'ygg_timers',
    ui: null,
    torrentId: null,

    init: async function() {
        this.torrentId = this.getTorrentId();
        
        if (this.torrentId) {
            console.log(`[YggHelper] Torrent ID trouvé: ${this.torrentId}`);
            this.handleTorrentPage(this.torrentId);
        } else {
            console.log("[YggHelper] Aucun ID de torrent trouvé sur cette page.");
        }
    },

    getTorrentId: function() {
        // 1. Priorité: Bouton de téléchargement officiel (caché ou visible)
        const downloadBtn = document.getElementById('download-timer-btn');
        if (downloadBtn && downloadBtn.dataset.torrentId) return downloadBtn.dataset.torrentId;

        // 2. Fallback: Formulaire de signalement
        const reportInput = document.querySelector('form#report-torrent input[name="target"]');
        if (reportInput && reportInput.value) return reportInput.value;

        // 3. Fallback: URL
        const match = window.location.href.match(/\/(\d+)-/);
        if (match && match[1]) return match[1];

        return null;
    },

    handleTorrentPage: async function(torrentId) {
        this.ui = this.createUI();
        document.body.appendChild(this.ui.container);

        // Ecoute des messages du Background/Popup (ex: Force Start)
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === "TRIGGER_START") {
                console.log("[YggHelper] Démarrage forcé reçu !");
                this.startActivePhase();
            }
        });

        // Vérifier si on a déjà un token valide en mémoire (rechargement de page)
        const storedData = await this.getStoredTimer(torrentId);
        
        if (storedData && storedData.token) {
            // Reprise d'un timer existant (pas besoin de demander la permission)
            this.startActivePhase();
        } else {
            // Nouveau timer : Demander au background si la voie est libre
            chrome.runtime.sendMessage({ action: "CAN_I_START" }, (response) => {
                if (response && response.canStart) {
                    // Voie libre -> Démarrage auto
                    this.startActivePhase();
                } else {
                    // Voie occupée -> Mode manuel
                    this.showManualStartButton();
                    // Enregistrer en "Pending" pour le popup
                    this.registerPendingStatus();
                }
            });
        }
    },

    registerPendingStatus: function() {
        const name = this.getTorrentName();
        chrome.runtime.sendMessage({ 
            action: "REGISTER_PENDING", 
            torrentId: this.torrentId,
            name: name
        });
    },

    getTorrentName: function() {
        let torrentName = "Torrent";
        // 1. Selecteur fiable (Modal de signalement)
        const reportName = document.querySelector('form#report-torrent strong');
        if (reportName) return reportName.innerText.trim();
        
        // 2. Fallback: Titre H1 (souvent absent maintenant)
        const h1 = document.querySelector('div.panel-heading h1');
        if (h1) return h1.innerText.trim();

        return torrentName;
    },

    showManualStartButton: function() {
        this.ui.btn.innerText = "▶️ Lancer le Timer";
        this.ui.btn.style.backgroundColor = '#8e44ad'; // Violet
        this.ui.btn.style.cursor = 'pointer';
        this.ui.btn.title = "Un autre téléchargement est en cours. Cliquez pour démarrer celui-ci.";
        
        this.ui.btn.onclick = (e) => {
            e.preventDefault();
            // Au clic, on force le démarrage (l'utilisateur prend la responsabilité)
            // On signale au background qu'on prend la main
            this.startActivePhase();
        };
    },

    startActivePhase: async function() {
        // Signaler qu'on démarre (verrouillage global)
        chrome.runtime.sendMessage({ action: "TIMER_STARTED" });

        const storedData = await this.getStoredTimer(this.torrentId);
        const now = Date.now();

        if (storedData && storedData.token) {
            const elapsed = (now - storedData.startTime) / 1000;
            if (elapsed >= this.timerSeconds) {
                this.updateUIReady(this.torrentId, storedData.token);
            } else {
                this.startCountdown(this.torrentId, storedData.token, this.timerSeconds - elapsed);
            }
        } else {
            this.startNewServerTimer(this.torrentId);
        }
    },

    startNewServerTimer: function(torrentId) {
        // Simulation du clic sur le vrai bouton pour générer le token via le site
        const realBtn = document.getElementById('download-timer-btn');
        
        if (realBtn) {
            // Méthode hybride : on clique virtuellement pour activer la logique du site, 
            // mais on intercepte la réponse via fetch pour plus de stabilité si possible,
            // ou on utilise l'API directe si le clic est trop complexe à intercepter.
            
            // Pour l'instant, on garde l'appel fetch direct qui fonctionnait, 
            // car simuler le clic implique de gérer les popups du site.
            // Si le fetch retourne 400, c'est souvent un souci de headers/cookies, 
            // mais ici on est dans le contexte de la page.
            
            this.ui.btn.innerText = "⏳ Initialisation...";
            
            fetch('/engine/start_download_timer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: `torrent_id=${torrentId}`
            })
            .then(r => r.json())
            .then(data => {
                if (!data.token) throw new Error("Token manquant");
                
                // LOG DEMANDÉ PAR L'UTILISATEUR
                const debugName = this.getTorrentName();
                console.log(`[YggHelper] Token trouvé pour "${debugName}":`, data.token);

                this.saveTimer(torrentId, data.token);
                this.startCountdown(torrentId, data.token, this.timerSeconds);
            })
            .catch(err => {
                console.error("[YggHelper] Erreur serveur:", err);
                this.ui.btn.innerText = "❌ Erreur (Clic manuel requis)";
                this.ui.btn.style.backgroundColor = '#c0392b';
                // Fallback: Si l'API échoue, on dit à l'utilisateur de cliquer sur le vrai bouton
                // Mais on reste propre.
                chrome.runtime.sendMessage({ action: "TIMER_CANCELLED" });
            });
        } else {
            // Pas de bouton trouvé, on tente quand même l'API
             this.startNewServerTimerFallback(torrentId);
        }
    },
    
    startNewServerTimerFallback: function(torrentId) {
         fetch('/engine/start_download_timer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: `torrent_id=${torrentId}`
            })
            .then(r => r.json())
            .then(data => {
                if (!data.token) throw new Error("Token manquant");
                this.saveTimer(torrentId, data.token);
                this.startCountdown(torrentId, data.token, this.timerSeconds);
            })
            .catch(err => {
                chrome.runtime.sendMessage({ action: "TIMER_CANCELLED" });
            });
    },

    startCountdown: function(torrentId, token, secondsLeft) {
        let remaining = secondsLeft;
        this.updateUITimer(remaining);

        const interval = setInterval(() => {
            remaining--;
            this.updateUITimer(remaining);

            if (remaining <= 0) {
                clearInterval(interval);
                this.updateUIReady(torrentId, token);
            }
        }, 1000);
    },

    updateUITimer: function(seconds) {
        if (seconds > 0) {
            this.ui.btn.innerText = `⏳ Patientez ${Math.ceil(seconds)}s...`;
            this.ui.btn.style.backgroundColor = '#3498db'; // Bleu
            this.ui.btn.style.cursor = 'wait';
            this.ui.btn.onclick = null; // Désactiver le clic pendant le compte à rebours
        }
    },

    updateUIReady: function(torrentId, token) {
        // Timer fini, on libère le verrou global pour que d'autres puissent lancer leur timer
        chrome.runtime.sendMessage({ action: "TIMER_FINISHED" });

        this.ui.btn.innerText = "📥 Télécharger";
        this.ui.btn.style.backgroundColor = '#27ae60'; // Vert
        this.ui.btn.style.cursor = 'pointer';
        this.ui.btn.style.pointerEvents = 'auto';
        this.ui.btn.classList.add('ready');
        
        this.ui.btn.onclick = (e) => {
            e.preventDefault();
            this.triggerDownload(torrentId, token);
        };
    },

    triggerDownload: function(torrentId, token) {
        this.ui.btn.innerText = "🚀 Lancement...";
        
        // Récupération du nom
        const torrentName = this.getTorrentName();

        // Ajout des stats "Temps perdu"
        chrome.runtime.sendMessage({ action: "ADD_WASTED_TIME" });

        const finalName = torrentName.endsWith('.torrent') ? torrentName : torrentName + '.torrent';

        chrome.runtime.sendMessage({
            action: "SCHEDULE_DOWNLOAD",
            url: `${window.location.origin}/engine/download_torrent?id=${torrentId}&token=${token}`,
            filename: finalName
        });

        setTimeout(() => { 
            this.ui.btn.innerText = "✅ Lancé"; 
            this.ui.btn.style.backgroundColor = '#7f8c8d';
            this.ui.btn.onclick = null;
        }, 1000);
    },

    // --- Stockage ---
    getStoredTimer: function(torrentId) {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], (result) => {
                const timers = result[this.storageKey] || {};
                resolve(timers[torrentId]);
            });
        });
    },

    saveTimer: function(torrentId, token) {
        const torrentName = this.getTorrentName();

        chrome.storage.local.get([this.storageKey], (result) => {
            const timers = result[this.storageKey] || {};
            timers[torrentId] = {
                token: token,
                startTime: Date.now(),
                name: torrentName
            };
            chrome.storage.local.set({ [this.storageKey]: timers });
        });
    },

    // --- UI ---
    createUI: function() {
        const container = document.createElement('div');
        container.id = 'ygg-helper-reminder';
        
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'ygg-content-wrapper';

        const title = document.createElement('div');
        title.className = 'ygg-title';
        title.innerHTML = '<span>⚡</span> Helper';
        
        const btn = document.createElement('a');
        btn.href = "#";
        btn.className = 'ygg-download-btn';
        btn.innerText = 'Connexion...';
        
        const close = document.createElement('div');
        close.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        close.className = 'ygg-close-btn';
        close.onclick = () => {
            container.remove();
            // Si on ferme, on libère potentiellement un verrou si on était en cours
            chrome.runtime.sendMessage({ action: "TIMER_CANCELLED" });
        };

        contentWrapper.appendChild(title);
        contentWrapper.appendChild(btn);
        
        container.appendChild(contentWrapper);
        container.appendChild(close);

        return { container, btn };
    }
};

YggTimerManager.init();
