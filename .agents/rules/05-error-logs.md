# Registre des Erreurs et Pièges Évités (Error Logs)

Ce document répertorie les erreurs, pièges et régressions commis par l'IA sur ce projet afin de ne plus jamais les reproduire.

---

## 📌 Consignes pour l'IA

1. **Consultation obligatoire** : L'IA doit toujours prendre en compte les leçons consignées ici avant de générer du code ou modifier la structure du projet.
2. **Auto-alimentation** : Dès qu'une erreur récurrente, un bug de conception ou une correction importante est soulevée par l'utilisateur ou constatée lors des tests, l'IA doit **immédiatement ajouter une entrée** dans ce document selon le modèle ci-dessous.

---

## 📝 Modèle d'entrée

```markdown
### [YYYY-MM-DD] — Titre court de l'erreur
* **Problème / Symptôme** : Ce qui ne fonctionnait pas ou ce qui a été mal fait.
* **Cause technique** : La raison pour laquelle l'erreur est survenue.
* **Règle à respecter impérativement** : Ce qu'il faut faire / ne pas faire pour l'éviter définitivement.
```

---

## 🗂️ Historique des Erreurs Recensées

### [2026-10-27] — Rigueur 2D : Géométrie des Ballons, Continuité du Terrain & Symétrie des Cartes
* **Problème / Symptôme** :
  1. Ballon de football 2D déformé avec des polygones mal placés et une physique de rebond molle.
  2. Scène 2 : terrain affiché sous forme d'un fragment partiel sans transition claire, avec lignes disjointes.
  3. Scène 2 (s=11) : cartes de tailles asymétriques, surcharge de couleurs et fond sans contraste franc.
  4. Scène 3 : remplacement brutal du terrain de football par un rectangle gris générique ("carré pourri") et passe mal alignée.
* **Cause technique** :
  - Manque de rigueur géométrique dans les polygones SVG et coordonnées calculées approximativement.
  - Rupture de continuité scénique : réinvention d'un conteneur différent pour chaque scène au lieu de réutiliser le même terrain de football.
  - Mauvaise gestion de la symétrie des cartes UI (largeurs et hauteurs disparates, couleurs non harmonisées).
* **Règle à respecter impérativement** :
  - **Géométrie SVG & Physique 2D** : Les objets emblématiques (comme un ballon de football) doivent être construits avec une géométrie vectorielle mathématiquement exacte (pentagone central régulier, pièces rayonnantes symétriques, ombrage sphérique 3D réaliste). L'animation de chute doit respecter la gravité (`power2.in`) avec squash & stretch franc à l'impact (`scaleX: 1.25, scaleY: 0.75`) et synchronisation de l'ombre au sol.
  - **Terrain de football** : Toujours partir du **rectangle vert pelouse** complet aux vraies proportions (~105m x 68m) avec bandes de tonte, puis animer les **lignes BLANCHES** à l'intérieur. Toutes les lignes doivent se toucher avec une précision millimétrique (périmètre fermé, médiane qui touche les deux bords, surfaces raccordées à la ligne de but).
  - **Continuité scénographique** : Si une vidéo traite d'un sujet comme le football, **réutiliser le MÊME terrain vert** d'une scène à l'autre plutôt que de basculer sur des boîtes grises disparates.
  - **Symétrie & Contraste des Cartes UI** : Deux cartes comparatives doivent être **rigoureusement jumelles** (mêmes dimensions en pixels, même padding, même border-radius). Leur fond doit trancher nettement avec le fond global de la vidéo et du terrain (fond sombre `#0f172a` sur vidéo blanche/verte), avec une palette de couleurs sobre et unifiée.
  - **Trajectoires vectorielles** : Les lignes de passe ou de tir doivent relier au pixel près les centres des pions/joueurs, avec animation du ballon qui roule réellement le long du vecteur.

---

### [2026-10-27] — Verrouillage et Neutralisation Totale des Animations et Balises Vidéo/Audio dans le Studio
* **Problème / Symptôme** : Des animations GSAP, vidéos HTML5 ou sons démarraient automatiquement sans appui sur "Play", ou reprenaient leur course folle pendant le déplacement du curseur de la timeline (scrubbing), écrasant le contrôle du Studio.
* **Cause technique** :
  1. Les timelines GSAP créées avec `paused: false` ou sans paramètre possèdent leur propre ticker 60 FPS autonome qui redémarrait dès un appel `seek()`.
  2. Les balises `<video>` et `<audio>` avec attribut `autoplay` ou déclenchées par script n'étaient pas interceptées par le Studio.
  3. `seekVideoInIframe()` ne mettait pas en pause les balises `<video>` ni `gsap.globalTimeline`.
* **Règle à respecter impérativement** :
  - **Dans `studio.html`** :
    - Utiliser `freezeIframe(targetTime)` pour forcer la pause de `win.gsap.globalTimeline`, de toute timeline active, de toutes les balises `<video>` et `<audio>`, des Web Animations (`doc.getAnimations()`) et des animations SVG SMIL.
    - Intercepter `HTMLMediaElement.prototype.play` dans l'iframe pour interdire formellement tout démarrage audio/vidéo tant que `isPlaying === false`.
    - Placer des gardes-fous répétés (à 60ms, 150ms, 300ms, 600ms, 1000ms, 1500ms) lors du chargement de l'iframe pour neutraliser tout script tiers asynchrone qui tenterait de lancer la lecture de son propre chef.
    - Lors du scrubbing (`handleScrub`, `mousedown`, `mousemove`, `mouseup`) et des sauts de frames, forcer l'état paused et geler immédiatement l'iframe à la position demandée.
  - **Dans les compositions HTML** :
    - Les timelines GSAP doivent être initialisées avec `{ paused: isIframeMode }` (`const isIframeMode = window.self !== window.top;`).
    - Exposer `window.__timeline` avec `seek(t)`, `play()`, `pause()`, et `duration()`.

---

### [2026-10-27] — Interdiction Formelle de Déclencher le Rendu Vidéo MP4 Sans Autorisation Explicite
* **Problème / Symptôme** : L'IA a lancé d'elle-même la commande de rendu `render.cjs` en arrière-plan sans que l'utilisateur ne l'ait expressément demandé.
* **Cause technique** : Zèle de l'IA voulant tester la chaîne complète jusqu'au fichier MP4.
* **Règle à respecter impérativement** :
  - **INTERDICTION STRICTE ET ABSOLUE DE DÉCLENCHER LE RENDU VIDÉO (`render.cjs` ou API de rendu)** sans l'ordre direct et explicite de l'utilisateur.
  - L'utilisateur effectue lui-même ses rendus directement depuis le Studio / Chrome via le bouton "Rendu", ou demande expressément à l'IA d'en lancer un par écrit.
  - L'IA doit uniquement créer et tester le code de la composition HTML dans `04_Videos/` ou `03_Chaines/`.

---

### [2026-10-27] — Débordement et Décalage du Cadre 16:9 dans le Player du Studio
* **Problème / Symptôme** : La composition vidéo HTML dépassait du cadre du lecteur et était tronquée/décentrée.
* **Cause technique** :
  1. Manque de `left: 50%; top: 50%;` sur `#stage` couplé à un `transform: translate(-50%, -50%)`, ce qui décalait le canvas de -960px et -540px vers le coin haut-gauche.
  2. Le lecteur du Studio applique déjà la résolution native (1920x1080) sur l'iframe et gère lui-même la mise à l'échelle via `previewFrame.style.transform = scale(...)`.
* **Règle à respecter impérativement** :
  - Dans les compositions vidéo HTML :
    - `#stage` doit avoir `position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 1920px; height: 1080px; overflow: hidden;`.
    - La fonction d'auto-scale `handleResize()` ne doit modifier que le facteur `scale()` en préservant scrupuleusement `translate(-50%, -50%)`.
    - `html, body` doivent avoir `width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden;`.

---

### [2026-10-26] — Auto-play spontané des compositions vidéo HTML (Handwriting & SVG)
* **Problème / Symptôme** : La vidéo démarrait et s'animait d'elle-même dans le Studio dès son chargement, sans que l'utilisateur n'ait cliqué sur "Play".
* **Cause technique** :
  1. Présence d'une boucle `previewLoop` avec `requestAnimationFrame` autonome active dès le chargement du script.
  2. Les balises SVG SMIL (`<animate>`) s'exécutent par défaut dès le chargement du DOM si elles ne sont pas figées.
* **Règle à respecter impérativement** :
  - **Ne jamais insérer de boucle d'animation automatique autonome (`requestAnimationFrame`)** dans les compositions vidéo HTML.
  - Le contrôle temporel doit être **100% passif et déterministe**, piloté uniquement par les appels `window.__timeline.seek(t)`.
  - Pour les SVG avec SMIL (`<animate>`), exécuter immédiatement `svg.pauseAnimations()` et `svg.setCurrentTime(0)` au chargement de la page.
  - Bannir les transitions CSS (`transition: all ...`) sur les propriétés directement interpolées par la timeline (pour garantir un rendu frame-by-frame exact à 60 FPS).

---

### [2026-10-26] — Emplacement des Skills vs Règles dans `.agents`
* **Problème / Symptôme** : Création d'un dossier `skills/` à l'intérieur de `.agents/`.
* **Cause technique** : Confusion sur l'emplacement réservé aux compétences personnalisées.
* **Règle à respecter impérativement** :
  - Le dossier `.agents/` est **strictement réservé aux règles** (`.agents/rules/`).
  - Aucun skill ne doit être placé dans `.agents/`. Tous les skills du projet doivent se trouver exclusivement dans [`00_Skills/`](../../00_Skills).

---

### [2026-10-26] — Bouton "Créer une Vidéo" dans les menus de navigation
* **Problème / Symptôme** : Le bouton "Créer une Vidéo" n'était pas situé en dernier à droite et n'avait pas sa couleur distinctive rouge.
* **Cause technique** : Ordre non uniforme des liens de navigation selon les pages.
* **Règle à respecter impérativement** :
  - Sur toutes les barres de menu et de navigation (`home.html`, `channels.html`, `channel.html`, `create_video.html`, `settings.html`, `studio.html`), le bouton **"Créer une Vidéo" doit TOUJOURS être positionné en dernier à droite**.
  - Son apparence doit obligatoirement avoir un **fond rouge (`#dc2626`)** et un **texte blanc (`#ffffff`)** avec les classes `.btn-create-video` ou `.btn-create-video-studio`.

---

### [2026-10-26] — Modal de confirmation affiché par défaut en bas de page
* **Problème / Symptôme** : Un modal de confirmation apparaissait en bas de la page `channel.html` dès son ouverture sans aucun clic.
* **Cause technique** : Omission des styles CSS pour `.modal-overlay` (`display: none`, `position: fixed`, etc.), laissant le modal dans le flux normal du document.
* **Règle à respecter impérativement** :
  - Tout modal personnalisé doit systématiquement avoir sa classe de base `.modal-overlay { display: none; position: fixed; inset: 0; ... }` et ne devenir visible que par ajout de la classe `.open` (`display: flex`).

---

### [2026-10-26] — Timecode et lecture fantôme dans le Studio sans vidéo chargée
* **Problème / Symptôme** : En ouvrant le Studio sans aucune vidéo active, le timecode affichait 40 secondes et appuyer sur Play faisait défiler le curseur sur un écran vide.
* **Cause technique** : Variables globales `duration` et `totalFrames` initialisées avec des valeurs en dur (`duration = 40.0; totalFrames = 1200;`) et timecode HTML hardcodé.
* **Règle à respecter impérativement** :
  - Sans vidéo active ou chargée, `duration` et `totalFrames` doivent valoir `0`.
  - Le timecode doit afficher `00:00:00 / 00:00:00` et `Frame 0 / 0`.
  - La fonction de lecture (`step`, `togglePlayPause`) doit bloquer tout défilement si `totalFrames <= 0` ou si aucune vidéo n'est chargée.

---

### [2026-10-26] — Ségrégation des vidéos avec chaîne (`03_Chaines/`) vs sans chaîne (`04_Videos/`)
* **Problème / Symptôme** : Toutes les vidéos étaient mélangées dans un seul dossier, rendant difficile la gestion par chaîne.
* **Cause technique** : Absence d'un dossier racine dédié aux chaînes utilisateurs.
* **Règle à respecter impérativement** :
  - Les vidéos rattachées à une chaîne sont enregistrées dans `03_Chaines/<channelId>/`.
  - Les vidéos rapides sans chaîne sont enregistrées dans `04_Videos/`.
  - L'API `/api/files` et les scripts doivent scanner les deux emplacements pour alimenter la bibliothèque du Studio et les filtres de la page chaînes.

---

### [2026-10-27] — Liste des vidéos vide dans le Studio (ReferenceError escapeHtml)
* **Problème / Symptôme** : L'utilisateur ouvre le Studio et ne voit aucune vidéo dans l'onglet "Mes Vidéos", l'écran reste noir ou sur skeleton.
* **Cause technique** :
  1. Utilisation de la fonction helper `escapeHtml(...)` dans le rendu JS (`renderVideosUI`, `renderRendusUI`) sans qu'elle ne soit définie dans le script de `studio.html`.
  2. L'erreur `ReferenceError: escapeHtml is not defined` interrompait silencieusement la boucle de construction des cartes vidéo et la sélection automatique dans le lecteur.
  3. Le panneau droit était masqué avec la classe `collapsed` par défaut et le bouton s'appelait "Compositions" au lieu de "Vidéos".
* **Règle à respecter impérativement** :
  - Toujours s'assurer que les fonctions utilitaires globales comme `escapeHtml` sont déclarées en tête de script dans **tous** les fichiers HTML qui l'utilisent.
  - Le volet latéral des vidéos du Studio doit être ouvert par défaut (`sidePanelRight` sans `collapsed`) et le bouton d'en-tête doit porter le libellé explicite **"Vidéos"**.

---

### [2026-10-27] — Absence d'audio dans le lecteur du Studio lors de la prévisualisation
* **Problème / Symptôme** : En jouant la vidéo HTML dans le Studio via le bouton "Play" ou la barre d'espace, les animations et sous-titres défilent mais aucun son / aucune voix off n'est audible.
* **Cause technique** :
  1. L'iframe du lecteur (`<iframe id="previewFrame">`) ne possédait pas l'attribut `allow="autoplay"`. Les navigateurs modernes (Chrome, Edge) bloquent strictement toute lecture sonore issue d'une iframe sans cette politique.
  2. Le moteur de lecture de `studio.html` (`startPlayback`) avançait le timecode et appelait `seek(t)` sur la timeline GSAP, mais n'ordonnait pas à l'élément `<audio>` ou à la fonction `window.play()` de l'iframe de démarrer la lecture.
  3. Le serveur local `studio-server.cjs` ne déclarait pas `.mp3` dans ses `MIME_TYPES` et ne gérait pas les en-têtes HTTP 206 Range (`Accept-Ranges: bytes`), bloquant le décodage et le streaming par le navigateur.
* **Règle à respecter impérativement** :
  - **Iframe de prévisualisation** : Toujours inclure `<iframe id="previewFrame" src="about:blank" allow="autoplay"></iframe>`.
  - **Contrôle audio Studio ↔ Iframe** : Lors du clic sur Play / Pause dans le Studio, notifier obligatoirement l'iframe (`win.play()`, `win.pause()`, et `win.syncAudioTimeline(time, isPlaying)`).
  - **Compositions vidéo HTML avec audio** : Exposer `window.syncAudioTimeline = (t, isPlaying) => ...` et veiller à ce que `tl.seek(t)` synchronise la piste audio de manière non-bloquante avec `audio.play().catch(() => {})`.
  - **Serveur local de développement** : Supporter obligatoirement les types MIME audio (`.mp3`: `audio/mpeg`, `.wav`: `audio/wav`) et le streaming partiel HTTP 206 (`Range: bytes=start-end`) indispensable pour les balises HTML5 `<audio>` et `<video>`.

---

### [2026-10-27] — Latence d'affichage des chaînes et des logos (Base64 lourd & attente window.load)
* **Problème / Symptôme** : Temps de latence perceptible au clic sur la page "Chaînes" et lors de l'ouverture d'une chaîne spécifique (logo et cartes qui tardent à apparaître).
* **Cause technique** :
  1. **Taille démesurée de `channels.json` (4 Mo)** : L'avatar d'une chaîne était stocké sous forme de chaîne Base64 brute 4K (~4 Mo) directement dans le fichier JSON. Chaque requête réseau et chaque `JSON.parse` bloquait le thread principal du navigateur.
  2. **Attente de l'événement `window.load`** : L'exécution du script attendait la fin du téléchargement complet des polices distantes Google Fonts avant de commencer à charger les données.
  3. **Requêtes séquentielles au lieu de parallèles** : `fetch('/api/channels')` puis `fetch('/api/files')` étaient appelés à la suite avec deux `await` au lieu d'un `Promise.all`.
  4. **Absence d'hydratation immédiate** : Les pages n'affichaient rien avant le retour de la requête réseau au lieu d'utiliser le cache `localStorage`.
* **Règle à respecter impérativement** :
  - **Jamais de gros Base64 dans les JSON de métadonnées** : Extraire automatiquement les avatars et images téléversés sous forme de fichiers réels dans `01_Assets/Images/channels/` et ne stocker que leur chemin relatif dans `channels.json`.
  - **Hydratation instantanée (0 ms)** : Toujours injecter immédiatement les données depuis `localStorage` dès la première ligne du `<script>`, puis rafraîchir en tâche de fond.
  - **Ne pas attendre `window.load`** pour les initialisations de données UI.
  - **Requêtes réseau parallèles** : Toujours regrouper les appels de données avec `Promise.all([fetch(...), fetch(...)])`.

---

### [2026-10-28] — Points d'Ancrage 2D SVG, Zooms Hors-Cadre & Éradication des Titrages Didactiques IA Slop
* **Problème / Symptôme** :
  1. Dans les animations 2D SVG (ex: aiguilles d'horloge), les éléments subissent des dérives ou volent dans tous les sens au lieu de pivoter autour du centre exact.
  2. Présence de zooms de caméra surdimensionnés sur des panneaux complets ou des cartes avec texte, coupant le texte hors de l'écran 9:16 ou débordant du cadre.
  3. Titres et badges au style "IA Slop" didactique et scolaire (ex: `[ PSYCHOLOGIE DU TEMPS ]`, `[ THÉORIE DE PAUL JANET ]`, `[ NEUROSCIENCES & COGNITION ]`, `[ L'ANTIDOTE PRATIQUE ]`) dégradant l'impact narratif et la crédibilité visuelle.
* **Cause technique** :
  1. En SVG standard, transformer un `<line>` vertical (`x1="160" x2="160"`) avec un `transform-origin: 160px 160px` ou `50% 50%` échoue car une ligne droite a une bounding-box de largeur 0 (`width: 0`). GSAP ou le moteur CSS calcule mal ou réinitialise le centre de rotation relatif.
  2. Un `scale` appliqué sur un conteneur UI plein écran dépasse la hauteur maximale autorisée de l'écran (1920px), rognant les textes en haut et en bas.
  3. L'IA générative produit par défaut des titres descriptifs façon PowerPoint/exposé scolaire plutôt que du storytelling percutant orienté rétention courte (Shorts).
* **Règle à respecter impérativement** :
  - **Points d'Ancrage SVG 100% Infaillibles** :
    - Encadrer tout élément rotatif SVG dans un groupe pivot maître : `<g transform="translate(centerX, centerY)">`.
    - Placer l'élément enfant relativement à `(0, 0)` : `<g id="secondHand"><line x1="0" y1="20" x2="0" y2="-120" ... /></g>`.
    - Dans GSAP, animer le groupe enfant avec `svgOrigin: "0 0"` (jamais `transformOrigin`, qui utilise le coin haut-gauche `(-R, -120)` de `getBBox()`). Zéro décalage, pivot mathématique absolu.
  - **Gestion Rapprochée / Zoom Caméra** :
    - Ne JAMAIS zoomer sur un bloc UI complet qui occupe déjà > 60% de la hauteur de l'écran sous peine de masquer du texte.
    - Pour mettre en valeur un détail (ex: une ligne spécifique), animer un highlight localisé (halo lumineux, bordure néon, scale localisé de 1.04 max) SANS zoom de conteneur global.
  - **Éradication Totale des Titrages IA Slop** :
    - Bannir formellement les pilules thématiques didactiques (`tag-pill`) du type `[ THEME ]`, `[ PSYCHOLOGIE DU TEMPS ]`, `[ THÉORIE DE X ]`.
    - Utiliser un copywriting viscéral, direct et axé sur le spectateur (ex: "À 8 ANS, L'ÉTÉ EST INFINI. À 30 ANS, L'ANNÉE S'ÉVAPORE.").

---

### [2026-10-28] — Reflow Typographique du Titre, Bâtons Parasites d'Horloge, Centrage Carte Finale & Charte 3 Couleurs
* **Problème / Symptôme** :
  1. En début de vidéo, le titre s'affiche sur 3 lignes puis repasse sur 2 lignes pendant l'animation avec un sursaut visuel très visible.
  2. Présence de traits parasites ("d'autres bâtons qui s'envolent") dans l'horloge vectorielle.
  3. Dans la scène finale, la carte de conclusion avec sous-titre apparaît décentrée vers le bas au lieu d'être au milieu de l'écran.
  4. Manque d'harmonie colorimétrique : multiplicité de couleurs changeant à chaque scène (jaune, bleu cyan, violet, vert).
* **Cause technique** :
  1. Utilisation de `scale: 0.92` et `letterSpacing: 0.04em` animés vers `-0.01em` sur un titre multiligne avec taille de police hétérogène (6.2rem et 0.72em). L'écartement temporaire forçait le dernier mot à passer à la ligne suivante avant de revenir en arrière (reflow intempestif).
  2. Présence d'un groupe `#s1SpeedRays` avec des balises `<line>` animées en rotation qui donnaient l'illusion de bâtons détachés volant dans l'horloge.
  3. Les éléments précédents de la scène (`.action-pillars-column`) étaient masqués avec `opacity: 0` sans `display: none`, occupant toute la hauteur et repoussant la carte finale vers le bas.
  4. Absence d'une charte stricte limitée à 3 couleurs uniques (60-30-10).
* **Règle à respecter impérativement** :
  - **Titres Cinétiques Sans Reflow** :
    - Définir une taille unique et homogène pour le titre (`font-size: 5.0rem`).
    - Structurer explicitement chaque ligne dans un `span` bloc : `<span class="title-line">` avec `display: block; white-space: nowrap;`.
    - Ne JAMAIS animer `scale` ou `letterSpacing` sur un titre multiligne textuel : n'animer que `opacity` et `y` (translation verticale).
  - **Horloge Vectorielle & Aiguilles Propres** :
    - Supprimer tout rayon ou trait parasite décentré (`speedRays`). L'horloge ne contient QUE les 3 aiguilles pures.
    - Toutes les aiguilles partent de `(0, 0)` : `x1="0" y1="0" x2="0" y2="-longueur"`.
    - Recouvrir l'axe `(0, 0)` par un capuchon solide (`circle r="13"`) pour qu'aucun ergot ou base d'aiguille ne dépasse.
    - Toutes les aiguilles tournent dès le début autour de l'axe central (`svgOrigin: "0 0"`).
  - **Centrage Absolu des Cartes de Révélation Finale** :
    - Encapsuler la carte et son sous-titre dans un conteneur positionné en absolu au centre géométrique du canvas : `position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);`.
  - **Charte Stricte des 3 Couleurs Max Uniques (Règle 60-30-10)** :
    - Toute vidéo doit utiliser strictement 3 couleurs du début à la fin :
      - 60% Couleur Primaire : Fond sombre `#0a0f1d`.
      - 30% Couleur Secondaire : Surfaces de cartes `#131b2e` / bordures `#1e293b`, texte `#ffffff` & `#94a3b8`.
      - 10% Couleur d'Accent UNIQUE : ex. Ambre Doré `#f59e0b` / `#fbbf24` pour TOUS les reflets, mots-clés, lueurs et icônes.

---

### [2026-11-02] — Fluidité Vidéo B-roll, Photos Réelles vs Icônes & Éradication des Captures Parasites Résiduelles
* **Problème / Symptôme** :
  1. La vidéo B-roll saccadait et présentait des sauts d'images ("ça montre une image... ensuite une autre... puis retour sur l'ancienne").
  2. Présence d'icônes ou de dessins stylisés non désirés au lieu de véritables photographies des infrastructures réelles (ex. Stade Abdoulaye Wade, Saly nautique, Stade Iba Mar Diop).
  3. Fichiers de captures d'écran et d'images intermédiaires laissés sur le disque après les vérifications de rendu (dossiers `scratch/screenshots/`, images parasites `.png`, `.jpg`).
* **Cause technique** :
  1. Téléchargement d'un segment de flux HLS YouTube avec stream copy (`-c copy`) sans ré-encodage, produisant des timestamps PTS/DTS discontinus et non-monotones + présence d'un tween GSAP `tl.to(video, { onUpdate })` qui forçait `play()` ou perturbait le décodeur matériel du navigateur 60 fois par seconde.
  2. Remplacement hâtif par des SVGs ou émojis alors que le brief requiert des infrastructures réelles identifiables.
  3. Scripts de test / vérification qui écrivaient des captures d'écran sur disque sans nettoyage immédiat.
* **Règle à respecter impérativement** :
  - **Encodage & Lecture Vidéo B-Roll Sans Saccade** :
    - Toujours ré-encoder les extraits vidéo téléchargés avec `libx264` à GOP court régulier (`-g 25`), timestamps monotones et `-movflags +faststart` pour un décodage matériel immédiat dans le navigateur.
    - Ne JAMAIS brancher un tween GSAP avec `onUpdate` qui boucle sur l'élément vidéo ou assigne continuellement `currentTime`. Utiliser un simple `tl.call(() => video.play(), null, startTime)` et `tl.call(() => video.pause(), null, endTime)`.
    - Dans les fonctions de seek de la timeline, ne corriger `currentTime` que si l'écart est supérieur à un seuil tolérant (`> 0.4s`) pour ne jamais interrompre le pipeline de décodage.
  - **Photos Réelles du Réel** :
    - Lorsque la vidéo traite de lieux, stades ou infrastructures existantes, télécharger et intégrer de véritables photos de haute qualité (formats 16:9 ou ratio soigné avec `object-fit: cover`) avec une entrée animée en reveal/scale.
  - **Éradication Totale des Captures Parasites Résiduelles** :
    - Tout script de capture ou de validation visuelle (Puppeteer / Chrome headless) doit OBLIGATOIREMENT supprimer tous les fichiers de capture et dossiers temporaires générés dès que la vérification est achevée.
    - ZÉRO fichier `.png`, `.jpg` ou sous-dossier de capture ne doit subsister dans `scratch/` ou dans le dépôt.

---

### [2026-11-02] — B-roll Continu vs Teaser Diaporama & Bannissement des Badges Factices ("LIVE BROADCAST" / AI Slop)
* **Problème / Symptôme** :
  1. La vidéo B-roll intégrée dans la composition paraissait saccadée et ressemblait à un diaporama de photos montées bout-à-bout plutôt qu'à une vraie vidéo continue en mouvement.
  2. Présence d'une étiquette décorative non demandée "LIVE BROADCAST" avec un point rouge clignotant sur le lecteur vidéo, qualifiée d'AI slop par l'utilisateur.
* **Cause technique** :
  1. Le clip source YouTube téléchargé provenait d'un teaser promotionnel officiel qui était en réalité un montage rapide de photographies fixes avec transitions rythmées (effet diaporama / slideshow cut), et non une séquence sportive filmée en prise de vue réelle continue.
  2. Zèle de l'IA ajoutant des badges décoratifs type "télé / direct" (`.video-corner-badge`) pour faire "habillage broadcast" sans aucune consigne de l'utilisateur.
* **Règle à respecter impérativement** :
  - **Sélection des Séquences B-roll** : Toujours vérifier la nature du clip vidéo source. Bannir impérativement les teasers de promotion constitués de diaporamas de photos ou de cuts ultra-rapides. Préférer impérativement des séquences sportives d'action réelle filmées en continu à 60 FPS (ex. course de sprint 100m, match, compétition en direct) avec mouvement physique fluide et continu de caméra et d'athlètes.
  - **Bannissement Absolu des Étiquettes Factices "LIVE BROADCAST" / AI Slop** : Ne JAMAIS ajouter de pastilles, badges ou mentions fictives ("LIVE", "LIVE BROADCAST", "DIRECT TV", faux logos de chaînes) non demandées par l'utilisateur. Laisser le lecteur vidéo épuré et propre, sans surcouche parasite.

---

### [2026-11-02] — Attributs Déclaratifs Obligatoires (`data-start`, `data-end`) sur les Balises `<video>` & Non-Ingérence du Code de Composition
* **Problème / Symptôme** :
  - La vidéo B-roll intégrée dans une composition HTML saccadait complètement dans le Studio, sautant d'une image à une autre ou restant figée sur la dernière frame comme un diaporama broken.
* **Cause technique** :
  1. Le moteur du Studio (`studio.html`) synchronise automatiquement toutes les balises `<video>` de l'iframe à chaque frame via `vStart = parseFloat(v.dataset.start || '0')`.
  2. En l'absence de l'attribut `data-start="23.0"`, `vStart` valait `0`. Lorsque la timeline du Studio atteignait la scène 4 (t = 24.0s), le Studio calculait un décalage de 24.0s (`timeInSeconds - 0`), ce qui dépassait la durée de la vidéo (15s). Le Studio forçait donc `v.currentTime = 24` (bridé à 15.017s) 60 fois par seconde.
  3. Simultanément, des appels `tl.call()` ou `__timeline.seek()` dans la composition tentaient de remettre `v.currentTime = 1.0s`. Les deux boucles se battaient à 60 Hz, forçant le décodeur matériel de Chrome à sauter perpétuellement entre 0s et 15s.
* **Règle à respecter impérativement** :
  - **Attributs Déclaratifs Obligatoires** : Toute balise `<video>` ou `<audio>` insérée dans une composition DOIT OBLIGATOIREMENT comporter ses bornes temporelles exactes :
    ```html
    <video id="brollVideo" src="..." data-start="23.0" data-end="35.0" data-duration="12.0" muted loop playsinline preload="auto"></video>
    ```
  - **Délégation Totale au Player (HyperFrames / Studio Contract)** :
    - En mode Studio (`isIframeMode === true`), le code de la composition ne doit JAMAIS appeler `video.play()`, `video.pause()` ni réassigner `video.currentTime`. Le Studio pilote automatiquement la lecture et les arrêts dès que la tête de lecture franchit `data-start` et `data-end`.
    - Les appels de secours (`tl.call`) ou les recalages fins ne doivent s'exécuter qu'en mode autonome (`if (!isIframeMode)`).

---

### [2026-11-27] — Rotation SVG Hors-Axe / Aléatoire (Roues, Engrenages, Objectifs) & Calibrage SFX Trop Fort
* **Problème / Symptôme** :
  1. Lors d'une animation de rotation sur des cercles, roues ou engrenages SVG (`#s1GearBig`, `#s1GearSmall`), les éléments quittaient leur axe géométrique central (dérive orbitale jusqu'à 298 px sur Chromium) au lieu de tourner proprement sur place, et les dents `stroke-dasharray` présentaient un joint asymétrique.
  2. Les effets sonores (`sfx.py` : `click`, `thump`, `whoosh`, `crash`, `heartbeat`) sonnaient beaucoup trop fort et agressifs par rapport à la musique de fond.
* **Cause technique** :
  1. Les tweens `tl.to('#rotor', { rotation: ... })` utilisaient `transformOrigin` (ou l'omettaient) au lieu de **`svgOrigin`** : sur un groupe SVG centré en `(0, 0)`, `getBBox()` démarre à `(-R, -R)`. GSAP interprète `transformOrigin: "0px 0px"` par rapport au coin haut-gauche de `getBBox()` (`(-220, -220)` sur `r=220`), et `"50% 50%"` échoue dès qu'un parent est en `display: none` (`getBBox() == {0,0,0,0}`), injectant dans les deux cas une translation orbitale parasite `(e, f)` dans la matrice SVG. De plus, `stroke-dasharray="36 22"` sur `r=220` ne divisait pas $2\pi R$ par un entier exact.
  2. **Musique synthétique "dégueulasse" & SFX toujours trop forts** : utilisation de `generate_music.py` (oscillateurs synthétiques basiques) au lieu d'une vraie musique instrumentale/orchestrale via `fetch_music.cjs`, mixage bricolé en Python dans `scratch/` au lieu d'utiliser/corriger `07_Scripts/build_soundtrack.cjs` + `fetch_sfx.cjs`, et calibration basée sur le `mean_volume` global des SFX (qui, à cause des traînes silencieuses, remontait les pics transitoires à `-0.3 dBFS`, soit **+20 dB au-dessus d'un passage musical calme à `-21 dB`**).
* **Règle à respecter impérativement** :
  - **Axe de Rotation Infaillible (0.0 px de dérive)** :
    - Tout objet rotatif SVG (roue, engrenage, objectif, aiguille, anneau) doit être centré mathématiquement sur `(0, 0)` à l'intérieur d'un groupe porteur `<g transform="translate(cx, cy)"><g id="rotor">...</g></g>`, et **CHAQUE** tween GSAP `rotation` DOIT utiliser **`svgOrigin: "0 0"`** (ou **`svgOrigin: "cx cy"`** en coordonnées user SVG si non enveloppé). **Interdiction absolue de `transformOrigin: "0px 0px"` ou `"50% 50%"` en CSS sur un élément SVG** : seul `svgOrigin` écrit `transform="matrix(..., 0, 0)"` indépendamment de `getBBox()` et de `display: none`.
    - Pour des crans/dents en pointillés, calculer impérativement un nombre entier exact de dents : `dash + gap = (2 * Math.PI * r) / N`.
    - Contrôler automatiquement `getBoundingClientRect()` et l'attribut SVG `transform` aux temps `t=0`, `t=mid`, `t=end` avant validation finale : le centre `(cx, cy)` de l'objet en rotation pure ne doit dériver d'aucun pixel.
  - **Musique Réelle & Pipeline Audio du Projet (`07_Scripts/`)** :
    - Toujours utiliser **`node 07_Scripts/fetch_music.cjs`** (vrais morceaux orchestraux/cinématiques/documentaires) et **`node 07_Scripts/fetch_sfx.cjs`** (bruitages réels CC0/CC-BY / Openverse avant le fallback adouci `sfx.py --peak 0.35`). **Ne jamais utiliser `generate_music.py`** sur un documentaire ou film cinématique.
    - Toujours assembler et mixer via **`node 07_Scripts/build_soundtrack.cjs`** (`--music`, `--music-start`, `--sfx <json>`, `--clips`/`--voice`, `--out`, `--also-wav`), jamais par script temporaire dans `scratch/`.
  - **Calibration SFX par True Peak Cible (Jamais par `mean_volume` Global)** :
    - Normaliser le lit musical cible d'abord (`-16 LUFS` sans voix off ; ducké `-18 à -22 dB` sous voix).
    - Calibrer chaque SFX par **`targetPeakDb - max_volume` mesuré** (jamais via `mean_volume` qui surestime les transitoires) : `ui` pic max **`-22.5 dBFS`**, `whoosh` pic max **`-18.5 dBFS`**, `impact` pic max **`-15.0 dBFS`**, passe-bas doux et limiteur `alimiter=limit=0.90`. Contrôler par tranches de 10s (`volumedetect`) qu'aucun pic SFX ne dépasse le niveau cible.

---

### [2026-11-27] — Débordement Portrait Hors Card, Décalage Ligne-à-Pin Carte, Lag Vidéo Studio & Logos Clés Trop Petits
* **Problème / Symptôme** :
  1. Scène 1 (Vox) : le portrait détouré sortait visuellement du cadre/card au lieu d'être contenu dedans.
  2. Scène 2 (Carte TopoJSON) : les lignes de trajectoire (`#mapArc1`, `#mapArc2`) ne touchaient pas exactement le centre des points cibles (`#pinPretoria`, `#pinKingston`, `#pinSilicon`), décalés en haut à gauche.
  3. Lecture des `<video>` saccadée / avec lags dans le Studio au lieu d'une fluidité instantanée type CapCut.
  4. Logos de marques clés (`PayPal`, `Twitter -> X`, `SpaceX`, `Tesla`) rendus trop petits dans les cartes.
* **Cause technique** :
  1. `<img class="s1-cutout">` avait été placé en élément frère à l'extérieur de `.s1-paper-card` (qui possédait `overflow: hidden`) avec une hauteur supérieure à la card.
  2. Les groupes pins possédaient `transform="translate(cx, cy)"` sur le nœud même animé par GSAP avec `svgOrigin: "0 0"`, décalant la transformation SVG des cercles par rapport aux sommets absolus des `<path>` du `<svg viewBox="0 0 1920 1080">`.
  3. Quatre goulets GPU/décodeur cumulés : (a) `filter: url(#cameraMotionBlur)` appliqué en permanence sur le `#cameraRig` 1920×1080 et `mix-blend-mode: multiply` plein écran au-dessus des `<video>` (désactive les plans matériels DirectComposition de Chrome), (b) `display: none` sur les scènes vidéo au lieu de `visibility: hidden`, (c) `studio.js` lançait toutes les `<video>` dès `t = 0` sans gérer leur fenêtre `[data-start, data-end]` dans `syncAudioDuringPlayback`, (d) clips H.264 avec B-frames ralentissant le scrub/loop.
  4. Tailles CSS timides (`30px–52px`) sur les logos au lieu d'une mise en avant héroïque.
* **Règle à respecter impérativement** :
  - **Contention stricte & Cadrage sans tranche coupée en Card** : Toute image/portrait destiné à une card éditoriale doit être placé **à l'intérieur DOM** de `.card { overflow: hidden; }` en `width: 100%; height: 100%; object-fit: cover; object-position: center 14%;` avec léger zoom (`scale: 1.06 -> 1.12`) afin que les bords coupés latéraux de la photo disparaissent au ras du cadre sans jamais déborder.
  - **Illustration Obligatoire des Marques Citées** : Chaque marque évoquée par la narration ou le script (eBay, PayPal, Compaq, NASA...) doit voir son logo officiel téléchargé (`brandfetch.cjs`) et affiché bien visible en grand (fallback typographique éditorial assumé uniquement si logo indisponible ou incompatible avec le design).
  - **Cartes SVG Sans Saccade au Démarrage** : Retirer `vector-effect: non-scaling-stroke` sur les polygones de fond, pré-rastériser la carte statique une fois sur `<canvas>` 2× avec `will-change: transform`, isoler tracés + pins dans un `<svg>` séparé et démarrer les tracés en `sine.out` (avec tolérance `renderAt` >= `0.35s`).
  - **Rigging SVG exact Pin ↔ Trajectoire** : Ne JAMAIS mélanger `transform="translate(cx, cy)"` et `svgOrigin: "0 0"` sur un élément animé GSAP ; poser directement `cx/cy` sans `translate` et répéter **`svgOrigin: "cx cy"` dans `fromVars` ET `toVars`** d'un `fromTo()` (sinon GSAP injecte `matrix(1,0,0,1,-R,-R)`!), partager exactement les sommets du `<path>`, peindre les pins après le tracé et valider `distance < 1.0 px` dans Chromium.
  - **Fluidité Vidéo CapCut** : Zéro filtre SVG ou `mix-blend-mode` sur le conteneur des `<video>` ; conserver les scènes en GPU avec `visibility: hidden` ; ré-encoder les B-rolls via `youtube_clip.cjs` en H.264 `-tune fastdecode -bf 0 -g 15 -movflags +faststart` ; ne décoder dans `studio.js` que les `<video>` dans leur fenêtre `[data-start, data-end]` sans micro-seek 60 FPS (tolérance `0.45s`).
  - **Logos Clés en Grand** : Afficher tout logo narrativement important en grand format (`height: 75px–130px` pour icône, `width: 220px–450px` pour wordmark).

### [2026-11-28] Pacing, Découpage Voix Off, SFX Trop Forts, Musique Répétée & Chronologie Portraits
* **Problèmes observés** :
  1. Le rythme initial (66s) était trop dense pour laisser digérer les scènes, mais **découper artificiellement la voix off avec des silences/trous forcés** rend le débit peu naturel et risque de désynchroniser parole et visuel.
  2. Les **SFX restaient trop forts** sous la voix (et couvraient la narration) car `build_soundtrack.cjs` appliquait un `loudnorm` global post-mixage remontant les SFX pendant les pauses, les plafonds étaient trop hauts (`-21` à `-28 dBFS`) et `ai_director.cjs` utilisait `playSfx(..., 0.5)`.
  3. `ai_director.cjs` utilisait toujours la même musique par défaut (ou ne téléchargeait pas de piste adaptée via recherche), et la musique générée synthétiquement était de qualité insuffisante.
  4. Portrait anachronique (~2015) utilisé en Scène 1 alors que la narration parlait de 2008/des débuts.
* **Règles à respecter impérativement** :
  - **Compréhension sans hacher la voix off** : Ne JAMAIS créer de trous artificiels dans la voix off. Pour laisser le temps de comprendre, soit **rallonger/étoffer le script naturel dès l'écriture**, soit **simplifier et adoucir les animations visuelles** avec moins d'éléments simultanés.
  - **SFX strictement subordonnés à la voix** : Dans `build_soundtrack.cjs`, pré-normaliser la voix à `-14 LUFS` **avant** le mixage, appliquer du ducking (`sidechaincompress`) sur la musique (`musicVol: 0.10`), et plafonner les SFX sous voix à **`-30 dBFS` (impact), `-33 dBFS` (whoosh), `-36 dBFS` (UI)** sans re-pompage loudnorm post-mix ; dans `ai_director.cjs`, brider `playSfx` (`<= 0.18`).
  - **Musique originale adaptée à chaque vidéo** : Toujours analyser le thème pour chercher et télécharger un vrai morceau cohérent via `fetch_music.cjs --query "..."` (Openverse CC + catalogue Incompetech avec exclusion de la piste précédente) au lieu de réutiliser toujours le même fichier ou de synthétiser une musique bâclée.
  - **Archives & Portraits fidèles à l'époque exacte** : Sourcer systématiquement un portrait/document correspondant à l'âge et à l'année citée (ex : `elon_2008_interview-7421.jpg` en scène d'ouverture 2008).


