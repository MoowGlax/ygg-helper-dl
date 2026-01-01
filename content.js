// content.js
// Intégration de TurboBlague (par Coronawalrus) et Timer Bypass (par MoowGlax)
// Version Universelle - Utilise browser.* API via polyfill (Chrome + Firefox)

(function() {
  const url = window.location.href;
  
  // ---------------------------------------------------------
  // 1. Timer Bypass Logic (Notification avec bouton de téléchargement direct)
  // ---------------------------------------------------------
  const match = url.match(/\/(\d+)-/);
  if (match && match[1]) {
    const torrentId = match[1];
    const downloadUrl = `https://www.yggtorrent.org/engine/download_torrent?id=${torrentId}`;
    createNotification(downloadUrl);
  }

  // ---------------------------------------------------------
  // 2. Magnet Bypass Logic (TurboBlague)
  // Permet de contourner la limite de téléchargement en générant un lien magnet
  // ---------------------------------------------------------
  
  // Vérifie si on est sur une page de détails de torrent (présence de la table d'infos)
  const infoTable = document.querySelector('table.informations');
  
  if (infoTable) {
    // On récupère le passkey stocké par l'utilisateur
    // Utilise browser.* (fonctionne sur Chrome via polyfill et Firefox nativement)
    browser.storage.local.get(['yggPasskey']).then(function(result) {
      if (result.yggPasskey) {
        injectMagnetLink(result.yggPasskey, infoTable);
      } else {
        console.log("[YggHelper] Passkey non configuré. Le bypass Magnet est désactivé.");
        promptPasskeyConfig();
      }
    }).catch(function(error) {
      console.error("[YggHelper] Erreur storage:", error);
    });
  }
})();

function createNotification(downloadUrl) {
  const reminder = document.createElement('div');
  reminder.id = 'ygg-helper-reminder';
  
  const text = document.createElement('span');
  text.innerText = "⚡ Torrent détecté !";
  text.style.marginRight = "15px";
  text.style.fontWeight = "bold";
  
  const downloadBtn = document.createElement('a');
  downloadBtn.href = downloadUrl;
  downloadBtn.innerText = "📥 Télécharger (Direct)";
  downloadBtn.className = 'ygg-download-btn';

  const closeBtn = document.createElement('span');
  closeBtn.innerHTML = '&times;';
  closeBtn.className = 'ygg-close-btn';
  closeBtn.onclick = () => reminder.remove();

  reminder.appendChild(text);
  reminder.appendChild(downloadBtn);
  reminder.appendChild(closeBtn);

  document.body.appendChild(reminder);
}

function promptPasskeyConfig() {
  const reminder = document.getElementById('ygg-helper-reminder');
  if (reminder) {
    const configMsg = document.createElement('div');
    configMsg.style.fontSize = '10px';
    configMsg.style.marginTop = '5px';
    configMsg.style.color = '#ccc';
    configMsg.innerHTML = "ℹ️ Configurez votre Passkey dans l'extension pour activer le Magnet Bypass.";
    
    // Insérer avant les boutons ou à la fin
    reminder.style.flexWrap = 'wrap'; // Permettre le retour à la ligne
    reminder.appendChild(configMsg);
  }
}

function injectMagnetLink(passKey, infoTable) {
  try {
    // Extraction du Nom : 1ère ligne, dernière colonne
    const nameRow = infoTable.querySelector('tr:first-child td:last-child');
    const name = nameRow ? nameRow.innerText.trim() : "Torrent";

    // Extraction du Hash : 5ème ligne, dernière colonne
    const hashRow = infoTable.querySelector('tr:nth-child(5) td:last-child');
    let hash = "";
    if (hashRow) {
      // On clone pour ne pas casser le DOM
      const clone = hashRow.cloneNode(true);
      // On supprime tous les enfants (éléments HTML) pour ne garder que le noeud texte
      Array.from(clone.children).forEach(c => c.remove());
      hash = clone.textContent.trim();
    }

    if (!hash || !passKey) return;

    // Construction de l'URL Tracker et du lien Magnet
    const trackerUrl = `http://tracker.p2p-world.net:8080/${passKey}/announce`;
    const magnetLink = `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(name)}&tr=${encodeURIComponent(trackerUrl)}`;

    console.log("[YggHelper] Magnet généré avec succès !");

    // 1. Injection dans la notification (si elle existe)
    const reminder = document.getElementById('ygg-helper-reminder');
    if (reminder) {
      const magnetBtn = document.createElement('a');
      magnetBtn.href = magnetLink;
      magnetBtn.innerHTML = "🧲 Magnet";
      magnetBtn.className = 'ygg-download-btn';
      magnetBtn.style.backgroundColor = '#d35400'; // Orange foncé pour distinguer
      magnetBtn.style.marginLeft = '10px';
      magnetBtn.title = "Bypass la limite de téléchargement";
      
      // Insérer avant le bouton de fermeture
      const closeBtn = reminder.querySelector('.ygg-close-btn');
      reminder.insertBefore(magnetBtn, closeBtn);
    }

    // 2. Injection dans la page (Méthode TurboBlague)
    // Remplace ou s'ajoute à côté du bouton de téléchargement officiel
    const originalBtn = document.getElementById('download-timer-btn') || document.querySelector('a[href*="download_torrent"]');
    
    if (originalBtn) {
      // On crée un nouveau bouton style "TurboBlague"
      const pageMagnetBtn = document.createElement('a');
      pageMagnetBtn.href = magnetLink;
      pageMagnetBtn.innerHTML = '<strong>🧲 Magnet Bypass (TurboBlague)</strong>';
      pageMagnetBtn.className = 'btn btn-danger'; // Classe CSS du site Ygg pour un bouton rouge
      pageMagnetBtn.style.marginTop = '10px';
      pageMagnetBtn.style.display = 'block';
      pageMagnetBtn.style.width = '100%';
      pageMagnetBtn.target = '_self';

      // On l'ajoute après le bouton original
      if (originalBtn.parentElement) {
        originalBtn.parentElement.appendChild(pageMagnetBtn);
      }
    }

  } catch (e) {
    console.error("[YggHelper] Erreur lors de l'injection du Magnet:", e);
  }
}
