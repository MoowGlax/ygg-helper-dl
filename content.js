// content.js
(function() {
  // Regex pour trouver l'ID dans l'URL (ex: /torrent/film/video/123456-titre)
  const url = window.location.href;
  const match = url.match(/\/(\d+)-/);

  if (match && match[1]) {
    const torrentId = match[1];
    const downloadUrl = `https://www.yggtorrent.org/engine/download_torrent?id=${torrentId}`;

    createNotification(downloadUrl);
  }
})();

function createNotification(downloadUrl) {
  const reminder = document.createElement('div');
  reminder.id = 'ygg-helper-reminder';
  
  const text = document.createElement('span');
  text.innerText = "⚡ Torrent détecté !";
  text.style.marginRight = "15px";
  
  const downloadBtn = document.createElement('a');
  downloadBtn.href = downloadUrl;
  downloadBtn.innerText = "Télécharger maintenant";
  downloadBtn.className = 'ygg-download-btn';
  // Ouvrir dans le même onglet ou un nouveau ? Le téléchargement se lance généralement sans changer de page ou dans un nouvel onglet temporaire.
  // On laisse le comportement par défaut.

  const closeBtn = document.createElement('span');
  closeBtn.innerHTML = '&times;';
  closeBtn.className = 'ygg-close-btn';
  closeBtn.onclick = () => reminder.remove();

  reminder.appendChild(text);
  reminder.appendChild(downloadBtn);
  reminder.appendChild(closeBtn);

  document.body.appendChild(reminder);
}
