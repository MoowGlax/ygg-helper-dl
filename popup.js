document.addEventListener('DOMContentLoaded', function() {
  const downloadBtn = document.getElementById('downloadBtn');
  const idInput = document.getElementById('torrentId');
  const statusDiv = document.getElementById('status');

  // Tentative de détection automatique de l'ID si on est déjà sur la page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0] && tabs[0].url) {
      const url = tabs[0].url;
      // Regex pour trouver l'ID dans l'URL yggtorrent
      // Format typique: yggtorrent.org/torrent/film/video/123456-titre
      const match = url.match(/\/(\d+)-/);
      if (match && match[1]) {
        idInput.value = match[1];
        statusDiv.innerText = "✨ ID détecté automatiquement !";
        statusDiv.style.color = "#2ecc71";
      }
    }
  });

  downloadBtn.addEventListener('click', function() {
    const id = idInput.value.trim();

    if (!id) {
      statusDiv.innerText = "❌ Veuillez entrer un ID valide.";
      statusDiv.style.color = "#d9534f";
      return;
    }

    const downloadUrl = `https://www.yggtorrent.org/engine/download_torrent?id=${id}`;
    
    // Ouvrir le lien de téléchargement
    chrome.tabs.create({ url: downloadUrl });
    
    // Feedback visuel
    statusDiv.innerText = "✅ Téléchargement lancé !";
    statusDiv.style.color = "#2ecc71";
  });
});
