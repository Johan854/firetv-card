# Fire TV Card (FR)

Carte Home Assistant pour vos **Fire TV** et **Android TV** (intégration *Android Debug Bridge*) :

- **Capture de l'écran** quand elle est possible (menus, YouTube…).
- **Tuile de l'appli en cours** quand la capture est bloquée par l'appli (Free TV / OQEE, Netflix, Prime Video, Disney+, Apple TV, Canal+…), avec le titre du programme quand le Fire TV le fournit.
- **Télécommande** : marche/arrêt, retour, accueil, lecture/pause (boutons de volume en option : `volume: true`).
- **Applis favorites** à lancer d'un appui.
- Plusieurs TV, style verre, thème clair/sombre automatique, nuance de couleur, éditeur visuel, textes en français.

## Installation (HACS)
HACS → ⋮ → Dépôts personnalisés → URL de ce dépôt, catégorie **Tableau de bord** → installer → recharger la page.

## Configuration
```yaml
type: custom:firetv-card
title: Fire TV
favorites: [oqee, netflix, prime, youtube]   # pour toutes les TV
tvs:
  - entity: media_player.fire_tv_192_168_1_41
    name: Salon
  - entity: media_player.fire_tv_suite
    name: Suite
    favorites: [netflix, disney]              # remplace la liste générale pour cette TV
  - entity: media_player.android_tv_192_168_1_57
    name: Salle de jeux
```

### Pourquoi certaines applis n'ont pas de capture
Les applis de streaming bloquent les captures d'écran pour protéger leurs vidéos. La capture de l'intégration est alors vide ou noire. La carte reconnaît l'appli grâce à son identifiant (`app_id`) et affiche une tuile à la place. Pour forcer la tuile sur une autre appli : `tile_apps: [youtube]`.

### Capture plus fréquente (facultatif)
La capture de l'intégration ADB se fait au mieux toutes les minutes. Pour une image toutes les 10 s, une automatisation peut enregistrer la capture dans un fichier, affiché par une caméra **Fichier local** :
```yaml
    screenshot_entity: camera.firetv_salon   # caméra « Fichier local »
```
La carte recharge la caméra toutes les `refresh` secondes (10 par défaut).

### Logos
Par défaut, la carte utilise des icônes. Pour vos propres logos, déposez des PNG dans `/config/www/image/logos/`, nommés d'après la clé de l'appli (`oqee.png`, `netflix.png`, `prime.png`, `disney.png`, `appletv.png`, `youtube.png`, `canal.png`…), puis :
```yaml
logos: true
logos_path: /local/image/logos/
```
Un logo manquant est remplacé par l'icône.

### Applis perso
```yaml
apps:
  - id: com.exemple.appli
    name: Mon appli
    color: "#e8902c"
    icon: mdi:star
    protected: true       # capture bloquée : toujours la tuile
    logo: /local/image/logos/mon-appli.png
```

### Photo de votre téléviseur (facultatif)
```yaml
    tv_picture: /local/image/tv.png
    screen_area: 3, 4, 94, 86   # position de l'écran dans la photo, en % : gauche, haut, largeur, hauteur
```

## Options
| Option | Description |
|---|---|
| `title` | Titre de la carte |
| `theme` | `auto`, `light` ou `dark` |
| `columns` | Nombre de colonnes (0 = automatique) |
| `nuance`, `nuance_perso`, `intensite` | Nuance de couleur commune à mes cartes |
| `favorites` | Applis favorites (clés ou identifiants Android) |
| `refresh` | Rechargement de la caméra de capture, en secondes |
| `logos`, `logos_path` | Logos perso |
| `tvs[].entity` | Entité `media_player` du Fire TV |
| `tvs[].screenshot_entity` | Caméra ou image de capture (facultatif) |
| `tvs[].use_screencap` | `false` pour ignorer la capture de l'intégration |
| `tvs[].volume` | `true` pour afficher les boutons de volume (masqués par défaut) |
| `tvs[].play_state` | `true` pour afficher « En lecture / En pause » (état ADB, souvent faux sur les applis de streaming) |
| `tvs[].tile_apps` | Applis toujours affichées en tuile |
| `tvs[].tv_picture`, `tvs[].screen_area` | Photo du téléviseur |
