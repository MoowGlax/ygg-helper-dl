// popup.js
// Version Firefox - Utilise browser.* API avec Promises

document.addEventListener('DOMContentLoaded', function () {
    // Tabs Logic
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // --- Download Logic ---
    const downloadBtn = document.getElementById('downloadBtn');
    const idInput = document.getElementById('torrentId');
    const statusDiv = document.getElementById('status');

    // Auto-detect ID - Firefox: utilise browser.tabs.query avec Promises
    browser.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
        if (tabs[0] && tabs[0].url) {
            const url = tabs[0].url;
            const match = url.match(/\/(\d+)-/);
            if (match && match[1]) {
                idInput.value = match[1];
                statusDiv.innerText = "✨ ID détecté automatiquement !";
                statusDiv.style.color = "#2ecc71";
            }
        }
    }).catch(function (error) {
        console.error("[YggHelper] Erreur tabs.query:", error);
    });

    downloadBtn.addEventListener('click', function () {
        const id = idInput.value.trim();
        if (!id) {
            statusDiv.innerText = "❌ Veuillez entrer un ID valide.";
            statusDiv.style.color = "#d9534f";
            return;
        }
        const downloadUrl = `https://www.yggtorrent.org/engine/download_torrent?id=${id}`;

        // Firefox: browser.tabs.create retourne une Promise
        browser.tabs.create({ url: downloadUrl }).then(function () {
            statusDiv.innerText = "✅ Téléchargement lancé !";
            statusDiv.style.color = "#2ecc71";
        }).catch(function (error) {
            console.error("[YggHelper] Erreur tabs.create:", error);
            statusDiv.innerText = "❌ Erreur lors du téléchargement";
            statusDiv.style.color = "#d9534f";
        });
    });

    // --- Passkey Logic ---
    const passkeyInput = document.getElementById('passkeyInput');
    const savePasskeyBtn = document.getElementById('savePasskeyBtn');
    const passkeyStatus = document.getElementById('passkeyStatus');

    // Load saved passkey - Firefox: browser.storage.local.get avec Promises
    browser.storage.local.get(['yggPasskey']).then(function (result) {
        if (result.yggPasskey) {
            passkeyInput.value = result.yggPasskey;
        }
    }).catch(function (error) {
        console.error("[YggHelper] Erreur storage.get:", error);
    });

    savePasskeyBtn.addEventListener('click', function () {
        const pk = passkeyInput.value.trim();
        if (pk) {
            // Firefox: browser.storage.local.set avec Promises
            browser.storage.local.set({ yggPasskey: pk }).then(function () {
                passkeyStatus.innerText = "✅ Passkey sauvegardé !";
                passkeyStatus.style.color = "#28a745";
                setTimeout(() => passkeyStatus.innerText = "", 3000);
            }).catch(function (error) {
                console.error("[YggHelper] Erreur storage.set:", error);
                passkeyStatus.innerText = "❌ Erreur de sauvegarde";
                passkeyStatus.style.color = "#d9534f";
            });
        } else {
            passkeyStatus.innerText = "❌ Passkey vide";
            passkeyStatus.style.color = "#d9534f";
        }
    });
});
