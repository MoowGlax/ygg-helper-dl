# ⚡ YggTorrent Timer Bypass

![Version](https://img.shields.io/badge/version-1.0-blue.svg)
![Compatibility](https://img.shields.io/badge/browser-Chrome%20%7C%20Opera-red.svg)

Une extension web légère et rapide pour contourner le temps d'attente de téléchargement sur YggTorrent.

## 🚀 Fonctionnalités

- **Détection Automatique** : Détecte instantanément l'ID du torrent lorsque vous naviguez sur une page de téléchargement.
- **Bypass du Timer** : Génère un lien de téléchargement direct (`/engine/download_torrent?id=...`) sans attendre les 30 secondes.
- **Notification Intelligente** : Affiche une notification discrète en bas de page avec un bouton "Télécharger maintenant".
- **Interface Popup** : Permet de saisir manuellement un ID si nécessaire.
- **Mode Furtif** : Le code de l'extension est obfusqué pour plus de discrétion.

## 📦 Installation

Cette extension n'est pas disponible sur le Chrome Web Store. Vous devez l'installer manuellement (Mode Développeur).

1. **Télécharger le projet** :
   - Clonez ce dépôt ou téléchargez le fichier ZIP.
   
2. **Ouvrir le gestionnaire d'extensions** :
   - **Chrome** : Allez sur `chrome://extensions`
   - **Opera** : Allez sur `opera://extensions`

3. **Activer le Mode Développeur** :
   - Cochez la case ou activez l'interrupteur "Mode développeur" (généralement en haut à droite).

4. **Charger l'extension** :
   - Cliquez sur le bouton **"Charger l'extension non empaquetée"** (Load unpacked).
   - Sélectionnez le dossier racine de ce projet (`ygg_timer_bypass`).

## 🛠️ Utilisation

1. Naviguez simplement sur une page de torrent sur YggTorrent.
2. Une notification apparaîtra en bas à droite avec un bouton **"Télécharger maintenant"**.
3. Cliquez dessus pour lancer le téléchargement immédiatement.

Si la notification n'apparaît pas :
1. Cliquez sur l'icône de l'extension dans la barre d'outils.
2. L'ID devrait être pré-rempli.
3. Cliquez sur **"Télécharger sans attendre"**.

## ⚠️ Avertissement

Ce projet est à but éducatif uniquement. L'auteur n'est pas responsable de l'utilisation qui en est faite. Assurez-vous de respecter les conditions d'utilisation des sites que vous visitez.

## 📝 Licence

Distribué sous la licence MIT. Voir `LICENSE` pour plus d'informations.
