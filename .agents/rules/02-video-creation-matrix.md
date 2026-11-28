# Matrice Complète de Création Vidéo, Direction Artistique & Règles d'Or

Ce document réunit l'ensemble des règles fondamentales de conception vidéo, de motion design et de direction artistique appliquées par l'IA.

---

## 1. Principes Fondamentaux & Règles d'Or (Les 25 Règles)

1. **Moteur d'Intelligence Artificielle** :
   - L'IA utilisée pour l'analyse narrative, la planification des outils et la génération du code est **Google Gemini**, configuré avec la clé **Google AI Studio** (`google_api_key` stockée dans `07_Scripts/api_config.json`).
2. **Pas de génération d'images par l'IA** :
   - **L'IA ne doit JAMAIS générer d'images.** Toutes les images d'illustration nécessaires doivent être **fournies au départ par l'utilisateur** via l'interface d'upload.
3. **Téléchargement externe & B-Roll strictement limité à YouTube** :
   - **Aucun autre B-Roll externe que YouTube** n'est autorisé.
   - Cette étape est entièrement **modulable et non-fixe** : elle n'est déclenchée que si le prompt ou les paramètres requièrent explicitement un extrait YouTube via `07_Scripts/youtube_clip.cjs`.
4. **Options Audio autorisées & Règle Anti-Saccade** :
   - Les 4 seules options audio autorisées sont :
     - `voice_only` : Voix off seulement (narration pure via ElevenLabs ou HeyGen).
     - `music_only` : Musique seulement (bande-son d'ambiance).
     - `full_mix` : **Mix avec tout** (Voix off + Musique de fond + Effets sonores SFX) — *Option par défaut*.
     - `none` : Sans audio (vidéo muette).
   - **Règle Anti-Saccade Audio** : Dans toute fonction `syncAudioTimeline(time, isPlaying)`, ne **JAMAIS** réassigner `audio.currentTime = expected` à chaque frame. Toujours vérifier la dérive : `if (Math.abs(audio.currentTime - expected) > 0.35) { audio.currentTime = expected; }`. Sinon le navigateur réinitialise le buffer audio 60 fois par seconde et le son devient haché/saccadé.
   - **Interdiction des Sous-Titres Non Demandés** : **Ne JAMAIS générer ni incruster de boîte ou conteneur de sous-titres** si l'utilisateur ne l'a pas explicitement demandé dans son prompt.
5. **Gestion et cloisonnement des Assets** :
   - **Assets d'une chaîne** : Dossier dédié portant le nom / ID de la chaîne (ex: `01_Assets/Images/<channelId>/`).
   - **Assets des vidéos autonomes** : Suffixe aléatoire identique à 4 chiffres (ex: `image_homme-2899.png`, `voiture_jaune-2899.mp4`).
   - **Rushes clients (`Clients/`)** : Sourcing direct des rushes non montés dans `Clients/<nom_client>/`.
6. **Emplacement de Création des Vidéos (`04_Videos/` ou `03_Chaines/`) & Rôle de `05_Scenes/`** :
   - Le fichier complet est enregistré **directement dans `04_Videos/<nom_video>.html` (vidéo autonome) ou `03_Chaines/<channelId>/<nom_video>.html` (vidéo de chaîne)**.
   - Ne pas polluer `05_Scenes/` avec des fichiers individuels `scene_1...html` sauf pour les projets multi-séquences (`05_Scenes/<nom_projet>/`).
7. **Barre de Progression Dynamique** :
   - Sur `video_processus.html`, la progression s'adapte en temps réel : $\text{Progression (\%)} = \text{round}\left(\frac{\text{Index Étape Active} + 1}{\text{Total d'Étapes Actives}} \times 100\right)$.
8. **Organisation de l'Application & Dossier `09_Pages/`** :
   - Toutes les pages web sont centralisées dans `09_Pages/` (`home.html`, `create_video.html`, `studio.html`, etc.).
   - Le serveur local (`07_Scripts/studio-server.cjs`) route automatiquement les requêtes vers `09_Pages/`.
9. **Interdiction d'Overlay Parasite (Progress Bar & Timecode dans la vidéo)** :
   - **Ne JAMAIS incruster de barre de progression (`progress bar`), timecode ou compteur de frames dans la composition vidéo.**
   - Le Studio dispose déjà de ses propres contrôles professionnels externes.
10. **Zéro Copie Visuelle — Créativité 100% Originale (Anti-Plagiat & Anti-Répétition)** :
    - **NE JAMAIS inspecter ou recopier paresseusement les fichiers HTML existants dans `04_Videos/` ou `03_Chaines/`** lors de la création d'une nouvelle vidéo.
    - **NE JAMAIS reproduire les mêmes scènes ou décors d'une vidéo à l'autre** (interdiction de refaire bureau/lampe, décompte blueprint avec cadran ou dominos).
    - Chaque nouvelle composition doit avoir sa propre direction artistique, ses propres scènes narratives, ses métaphores visuelles originales (labyrinthe, escalier d'énergie en lévitation, engrenages d'horlogerie, tir à l'arc néon, etc.) et sa typographie originale créée de A à Z.
11. **Interdiction des Titrages Didactiques, Badges "PowerPoint" & Textes aux 4 Coins** :
    - **Bannissement définitif des étiquettes scolaires et diaporama** : `[ Règle 01 ]`, `[ Chapitre 1 ]`, `[ Étape 01 ]`, `[ SCÈNE 1 : ... ]`, `[ SLIDE X ]`, conteneurs `.tag-pill`. L'IA réalise des **films et vidéos cinématographiques**, JAMAIS des présentations PowerPoint.
    - **Bannissement absolu des faux textes HUD aux 4 coins du cadre** (`.hud-telemetry`, `1080p`, `TEMPO 120 BPM`, `VIBE ENGINE`, badges debug). Les 4 coins du cadre doivent impérativement rester propres, aérés et dégagés.
12. **Interdiction du Fond "Cliché IA" Répétitif (Grille + Halo Sombre)** :
    - **Ne JAMAIS systématiser le même fond stéréotypé** : quadrillage de lignes transparentes (`.grid-backdrop`) avec halo radial flou vert/cyan.
    - Varier impérativement les textures, ambiances, aplats, grains argentiques et éclairages selon l'univers thématique de chaque vidéo.
13. **Mouvement de Caméra Continu & Cadrage Dynamique Sans Zoom Débordant** :
    - Pas de plans fixes statiques sans vie. Intégrer un travelling lent continu (`slow push-in` scale 1.0 -> 1.06).
    - Zooms tactiques ciblés (`scale: 1.35`) lors d'une action clé, puis dézoom fluide.
    - **Interdiction des zooms destructeurs qui coupent les textes ou débordent du cadre.** Lisibilité à 100% en permanence.
14. **Animations Différenciées par Typologie d'Élément** :
    - Bannir l'animation unique (fade-slide générique sur tout).
    - Titres : Kinetic typography, word-by-word reveal, tracking expand.
    - Sous-titres : Smooth fade-slide vertical, blur-to-focus cinématique.
    - Cartes UI : Roulis 3D perspective (`rotateX: 15deg`, `rotateY: -10deg`), pop élastique avec inertie (`back.out(1.5)`).
    - Icônes : Rotation élastique (`rotation: -25deg` vers `0deg`), cascades.
    - Graphiques & terrains : Tracé dynamique séquentiel (`strokeDashoffset`).
15. **Rigueur de la Physique 2D & Points d'Ancrage SVG Infaillibles (Zéro Dérive d'Axe)** :
    - Pour les objets en mouvement/rebond : séparer le conteneur de translation $Y$ (rebond, squash & stretch) de l'élément SVG interne (rotation axiale à `center center`). L'ombre au sol doit rester strictement au sol.
    - **LOI ABSOLUE DE ROTATION & ANCRAGE SVG (Roues, Engrenages, Objectifs, Aiguilles, Pins)** : Encapsuler impérativement dans un groupe pivot maître centré `<g transform="translate(cx, cy)"><g id="rotor">...</g></g>` où toute la géométrie est centrée sur `(0, 0)`, **ET passer explicitement `svgOrigin: "0 0"` (ou `svgOrigin: "cx cy"` sans groupe translate) dans CHAQUE `gsap.set` / `gsap.to` / `fromVars` ET `toVars` d'un `tl.fromTo()`** (car omettre `svgOrigin` dans le `fromVars` d'un `fromTo()` pousse GSAP à fixer un décalage permanent `(-R, -R)`!). **NE JAMAIS utiliser `transformOrigin: "0px 0px"` ni `"50% 50%"` en CSS sur un élément SVG** : seul **`svgOrigin`** utilise directement l'origine utilisateur SVG `(0, 0)` à `0.0 px` de dérive même sous `display: none`. Pour les dents en `stroke-dasharray`, forcer un diviseur entier exact de $2\pi R$. Vérifier par script que `(cx, cy)` via `getBoundingClientRect()` et la distance pin $\leftrightarrow$ tracé reste `< 1.0 px`.
16. **Charte Stricte : 3 Couleurs Max Uniques (Règle 60-30-10)** :
    - 60% Primaire (fond sombre / ambiance dominante), 30% Secondaire (surfaces `#131b2e`, bordures, texte blanc/gris), 10% Accent Unique (ex: Ambre Doré `#f59e0b` ou Cyan Électrique) appliqué aux dégradés, jauges et surbrillances.
17. **Typographie Stable (Zéro Reflow) & Centrage Carte Finale** :
    - Titres stables avec blocs `white-space: nowrap`. Ne jamais animer `scale` ou `letter-spacing` sur un titre multiligne pour éviter les sauts de ligne.
    - Carte finale de conclusion centrée au milieu absolu du viewport (`left: 50%; top: 50%; transform: translate(-50%, -50%);`).
18. **Isolation Stricte des Scènes (Zéro Superposition) & Interdiction de `!important` sur `#scene_1`** :
    - **NE JAMAIS mettre `!important` sur `#scene_1`** (bloque GSAP et fige la scène 1).
    - Masquage physique obligatoire lors des transitions : `tl.to('#scene_1', { opacity: 0, duration: 0.4 }, t - 0.4).set('#scene_1', { display: 'none', visibility: 'hidden' }, t)`.
    - Initialisation GSAP stricte à $t = 0$.
19. **Centrage Géométrique des Grilles de Cartes & Suivi SVG Sub-Pixel (`path.getPointAtLength`)** :
    - Conteneurs de cartes centrés avec `margin: 0 auto; justify-content: center; max-width: 1480px`.
    - Points traceurs sur courbes animés via `path.getPointAtLength(p * totalLength)`.
20. **Templates GSAP Standardisés & Assemblage Modulaire (Lego Blocks)** :
    - **Interdiction de concevoir des cartes, boutons ou compteurs "from scratch" avec du design médiocre.** L'IA doit obligatoirement puiser dans la bibliothèque de templates GSAP (`.agents/skills/My_Skills/gsap_templates/SKILL.md`) :
      - *Bento Glass Cards (3D Tilt & Glow)* pour les arguments et caractéristiques.
      - *Metric Counter Cards* avec chiffres animés et micro-courbes SVG tracées.
      - *Shimmer Buttons* avec onde lumineuse rotative.
      - *Split-Words Kinetic Titles* pour les titres majeurs.
    - Cartes animées de façon séquentielle une à une à la suite avec fondus directionnels et easings calibrés (`power3.out`, `back.out(1.5)`).
    - **Choix Musical Cinématique Réel (Interdiction du Synthé "Dégueulasse" hors fallback)** : Toujours privilégier une vraie musique instrumentale adaptée à l'émotion via **`node 07_Scripts/fetch_music.cjs --mood <war|dramatic|epic|somber|suspense|tech|sports|chill>`** (ou piste importée) et ne jamais recycler une boucle hors-sujet. Ne JAMAIS utiliser `generate_music.py` sur des documentaires/films cinématiques ou historiques (réservé uniquement aux fonds synthétiques minimalistes sans autre option).
21. **Intégration Vidéo HTML5 & B-Roll (Contrat Studio & Zéro Saccade)** :
    - Toute balise `<video>` DOIT comporter `data-start="T_DEBUT" data-end="T_FIN" data-duration="DUREE" muted loop playsinline preload="auto"`.
    - Non-ingérence JS en mode Studio (`isIframeMode === true`) : le Studio gère automatiquement `play()`, `pause()` et le scrubbing.
22. **Illustration Obligatoire de Toute Marque Citée & Interdiction de Dessiner un Logo** :
    - **Illustration systématique (Voix / Script → Écran)** : Dès qu'une vidéo cite une entreprise, marque ou institution (ex: *eBay, PayPal, Compaq, NASA, Tesla*), l'IA DOIT télécharger son logo officiel dans `01_Assets/Logos/` (`node 07_Scripts/brandfetch.cjs <domaine>` ou Iconify/Wikimedia) et **l'afficher en grand** pour que le spectateur le reconnaisse immédiatement. Si aucun logo officiel n'existe ou que la composition ne l'autorise pas, utiliser un traitement typographique sobre assumé (jamais de mention isolée sans contexte visuel ni d'approximation SVG dessinée par l'IA).
    - **L'IA ne doit JAMAIS dessiner ou inventer un logo de marque en code** (aucun bricolage ou approximation SVG faite maison). Si nécessaire, prévenir l'utilisateur si un logo introuvable doit être fourni.

23. **Règle Stricte des Couleurs de Texte & Titres à l'Écran (2 Couleurs Max)** :
    - **Le titre ou tout bloc de texte affiché à l'écran ne doit JAMAIS avoir plus de 2 couleurs.** Interdiction formelle d'utiliser 3 couleurs ou plus sur un même bloc typographique (bannissement du texte arc-en-ciel / multicolore).
    - **Palette typographique autorisée :**
      - Option A : **Texte bicolore contrasté** : Texte principal en blanc (ou teinte neutre) avec un mot-clé ou chiffre d'impact dans la couleur d'accent (ex: blanc + rouge, blanc + ambre, blanc + cyan).
      - Option B : **Dégradé bicolore** : Dégradé fluide entre 2 teintes uniquement (`background: linear-gradient(135deg, #ffffff 0%, #ef4444 100%)`).
    - Cette règle garantit un impact visuel net, professionnel et une lisibilité instantanée en moins de 100 ms.

24. **Bannissement Formel du Fond "Espace / Cosmique" en 3D & 4 Fonds Autorisés Uniquement** :
    - **INTERDICTION FORMELLE ET ABSOLUE** de générer des arrière-plans de type "espace", "cosmos", "galaxie", "particules cosmiques flottantes" ou halos sombres sci-fi sur les scènes 3D Three.js.
    - **Les 4 seuls types d'arrière-plans 3D autorisés sont :**
      1. **Fond Blanc Pur Studio** (`#ffffff` ou `#f8fafc`) avec ombre de contact douce (`contact shadow`) au sol — Style épuré Apple / Design produit haut de gamme.
      2. **Fond Noir Pur Minimaliste** (`#000000` ou `#050505` sans étoiles ni halos parasites) — Style cinéma OLED premium et contrasté.
      3. **Fond de Couleur Unie** (ex: vert menthe `#2a9d8f`, terracotta `#e07a5f`, bleu ardoise uni, crème chaud) — Style isométrique pop et contemporain.
      4. **Fond Dégradé Lumineux** (ex: dégradé doux vertical blanc vers gris perle `#ffffff` $\rightarrow$ `#e2e8f0`, ou dégradé clair pastel lumineux) — Ambiance studio daylight lumineuse et propre.
    - L'univers visuel 3D doit rester sobre, net, moderne et professionnel sans jamais tomber dans le cliché spatial.


25. **Design System Vidéo Universel, Padding Cadre Harmonisé (16:9 & 9:16) & Règle Anti-Chevauchement** :
    - **Zéro Chevauchement & Zéro Collision (Zero-Collision Layout)** : Un texte, une illustration, un sujet 2D/3D (comme la tête géante Stickman), un cadran, une carte Bento ou un bouton CTA ne doivent **JAMAIS se heurter, se chevaucher ou se couper accidentellement**. Chaque module a sa zone réservée avec un espace de respiration minimal de **48px à 120px** entre éléments distincts. Bannir tout contour rectangulaire massif qui enferme ou traverse les sujets visuels.
    - **Zéro Débordement de Texte & Largeur Dynamique des Conteneurs** : Tout texte logé dans un conteneur (bouton, card, pillule, badge, que ce soit en HTML ou Canvas 2D) **DOIT impérativement dimensionner sa largeur à son contenu** (`cardWidth = textWidth + padding * 2` avec au minimum 32px à 40px de marge interne de chaque côté). **Le texte ne doit sous aucun prétexte toucher ou déborder des limites de sa card.**
    - **Padding Cadre Harmonisé (80px Standard)** : Les marges de scène sont obligatoires et régulières quel que soit le format :
      - **16:9 Paysage (1920×1080)** : `padding: 60px 80px 70px 80px;` (marge latérale symétrique de 80px).
      - **9:16 Vertical (1080×1920)** : `padding: 140px 80px 180px 80px;` (même marge latérale de 80px + safe-zones UI plateformes).
    - **Design System Agnostique (Structure, Échelle et Cohérence sans imposer de couleur ou police)** :
      - *Architecture en 3 Slots verticaux* : Slot 1 (Haut / Hook), Slot 2 (Centre / Hero 3D ou Carte), Slot 3 (Bas / CTA ou Sous-titres).
      - *Spacing Scale modulaire* : basé sur une grille de 8px (8px, 16px, 24px, 32px, 48px, 64px, 80px). Zéro valeur au hasard.
      - *Hiérarchie Typographique à 3 niveaux* : Titre ($\\times 2.2$ à $\\times 2.8$ du sous-titre), Sous-titre ($\\times 1.4$ à $\\times 1.6$), Corps / Badges ($1\\times$).
      - *Rayon de courbure unique (`--radius-card`)* partagé par toutes les cartes de la vidéo (24px–32px ou 40px–48px). Badges à 999px.
      - *Règle 60-30-10 structurelle* : 60% surface neutre de fond, 30% cartes et structure, 10% accentuation unique. Maximum 2 couleurs par bloc de texte.

26. **Synchronisation Audio Stable & Anti-Saccades (Format MP3 & Zéro Seek en Pleine Lecture)** :
    - **Format Audio Obligatoire** : Toujours utiliser des fichiers audio compressés `.mp3` (192 kbps) mis en cache RAM intégrale par le navigateur. Bannir formellement les fichiers lourds `.wav` non compressés qui créent des stalls de streaming et des micro-coupures.
    - **Règle d'or de Lecture Continue (`playing === true`)** : **NE JAMAIS réassigner `audio.currentTime`** pour de simples micro-fluctuations d'horloge (< 1.2s). Réassigner `currentTime` pendant la lecture force Chromium à purger son buffer audio matériel, générant un micro-silence/saccade audible ! Ne réaligner en cours de lecture que si le drift dépasse **1.5 seconde** ou lors d'un saut explicite (`seek`).
    - **Pause & Scrubbing** : Lorsque l'utilisateur met en pause ou déplace manuellement le curseur de timeline, mettre à jour `audio.currentTime` immédiatement.

27. **Ancrage Physique Strict des Ombres Portées au Sol (Ground-Pinning & Zéro Ombre Flottante)** :
    - **L'Ombre reste au Sol** : Une ombre portée au sol doit **TOUJOURS rester ancrée sur le sol (`groundY = 820`)**.
    - **Zéro Rotation d'Ombre** : **INTERDICTION ABSOLUE** d'intégrer l'ombre à l'intérieur de la matrice de transformation (`ctx.rotate()`) d'un personnage qui saute ou pivote en l'air. L'ombre ne doit JAMAIS tourner avec le corps ni flotter dans les airs à l'envers sous les pieds d'un joueur en suspension ou lors d'un ciseau !
    - **Atténuation avec l'Altitude** : Lorsque le personnage s'élève en altitude, son ombre reste au sol à `(x, groundY)`, s'estompe en opacité (`alpha` décroît avec l'altitude) et diffuse en taille.

28. **Biomécanique & Cohérence Vectorielle du Geste Sportif (Retourné Acrobatique / Ciseau)** :
    - Pour toute figure acrobatique (ciseau retourné, bicyclette), la cinématique doit respecter l'orientation exacte du terrain et du but :
      - **Bascule de la Tête vers le But** : Si le but est à droite (+X), le joueur a le dos au but. Lors de l'impulsion, sa tête tombe **vers la droite** (rotation horaire du corps vers +X), et non vers la gauche à contresens.
      - **Trajectoire Horaire du Pied de Frappe ("Aiguille d'une Montre")** : Le pied de tir part d'en bas/gauche et effectue une rotation horaire de la gauche vers la droite pour fouetter le ballon et le catapulter vers la lucarne adverse.
      - **Retombée Complète & Atterrissage au Sol** : Un joueur en suspension ne doit JAMAIS rester figé en l'air après son tir ! Il retombe sur le terrain (altitude -> 0), atterrit sur le dos sur la pelouse (groundY = 820), amortit avec les bras puis célèbre au sol sur le gazon (buste redressé, poings levés au ciel) bien cadré sans chevauchement avec les bannières d'habillage.

29. **Ancrage Physique du Contact au Sol (Grounding Invariant & Zéro Vol en Course)** :
    - **Loi Inviolable du Contact au Sol** : Pour tout personnage debout, marchant ou courant sur la pelouse, **le pied d'appui (Stance Foot) DOIT obligatoirement être en contact direct avec la ligne de sol (`groundY = 820px`)**.
    - **Interdiction Formelle du "Vol en Courant"** :
      - Lors d'une course, l'altitude de vol est STRICTEMENT NULLE (`altitude = 0`). Le personnage court sur le gazon, et non dans les airs !
      - Calcul mathématique de l'origine : Avec un pivot de rotation au bassin (`translate(0, -65)`) et des jambes de hauteur 185px, la base au sol doit être `basePivotY = groundY - 120 = 700px` pour que les crampons touchent exactement la pelouse à `820px`.
    - **Cinématique d'Impulsion** : Le personnage ne peut décoller en altitude (> 0) qu'APRÈS sa phase d'appel au sol (flexion des genoux / impulsion musculaire).
    - **Cinématique d'Atterrissage** : Après tout saut ou figure aérienne, le personnage retombe au sol jusqu'à ce que son altitude revienne strictement à 0 sur la pelouse.

  * **Règle 30 : Fondu de Fin Obligatoire (Vidéo & Musique / Outro Fade Out)** :
    - **OBLIGATION SYSTÉMATIQUE SUR TOUTES LES VIDÉOS** : Chaque composition vidéo générée doit impérativement comporter un fondu de sortie (*Fade Out*) sur les 2.5 à 4 dernières secondes.
    - **Fondu Vidéo** : Fondu progressif vers le noir (`rgba(0, 0, 0, alpha)`) ou vers le blanc studio (`rgba(255, 255, 255, alpha)`) selon le mode, où `alpha = clamp((t - (duration - fadeTime)) / fadeTime, 0, 1)`.
    - **Fondu Audio Musical** : La piste musicale de fond (`audioBgm`) doit obligatoirement baisser son volume progressivement jusqu'à 0 (`audioBgm.volume = baseVol * clamp((duration - t) / fadeTime, 0, 1)`). Aucune vidéo ne doit se terminer par une coupure nette ou brutale du son ou de l'image.

  * **Règle 31 : Interdiction Stricte des Boutons Flottants dans le Vide (Une Vidéo n'est PAS un Site Web)** :
    - **BANNISSEMENT ABSOLU DES BOUTONS FLOTTANTS DANS LE VIDE** : Ne JAMAIS insérer de bouton d'action cliquable flottant au milieu du canvas (`<button>`, `<a>`, `.cta-action-pill`, *« Essayer maintenant → »*, *« Get Started »* flottant dans les airs).
    - Une vidéo n'est pas une landing page web interactive. Le spectateur regarde un film vidéo sur son écran ou son smartphone, il ne peut pas cliquer sur la vidéo.
    - **Seule exception autorisée** : Un bouton intégré organiquement à l'intérieur d'une maquette réaliste d'interface logicielle (ex: bouton dans une barre d'outils d'app). En dehors de ce cadre applicatif, aucun bouton n'est toléré.
    - **Pour les outros / fins de vidéo** : Afficher sobrement le branding officiel, le slogan, et l'URL textuelle épurée (ex: `chatgpt.com`), avec une typographie cinématographique nette.

  * **Règle 32 : Interdiction des Mentions de Bas de Page Web (« Tous droits réservés... »)** :
    - **BANNISSEMENT DES MENTIONS LÉGALES ET FOOTERS WEB** : Ne JAMAIS ajouter de mention textuelle de type footer de site internet (`© 2026 OpenAI. Tous droits réservés • Déploiement progressif...`).
    - Une vidéo n'a pas de footer web. Les bordures et le bas de l'écran doivent rester propres, aérés et cinématiques.

  * **Règle 33 : Interdiction Formelle des Étiquettes Marketing / Pill Badges** :
    - **ZÉRO ÉTIQUETTE AU-DESSUS DES TITRES** : Ne jamais ajouter de pilules marketing ou badges flottants au-dessus des titres (`.pill-badge`, *« NOUVELLE GÉNÉRATION DE MODÈLE »*, *« ARCHITECTURE COGNITIVE AVANCÉE »*, *« MULTIMODALITÉ OMNI »*, etc.).
    - Ces étiquettes créent un rendu lourd, scolaire et amateur. Les titres doivent s'affirmer seuls avec force, contraste et pureté.

  * **Règle 34 : Pureté du Logo Officiel (Zéro Cercle en Pointillés, Zéro Halo Flou)** :
    - **LOGO NET ET ÉPURÉ** : Présenter les logos officiels sous leur forme vectorielle SVG pure et tranchante.
    - **Interdiction Formelle** d'ajouter des anneaux orbitaux en pointillés qui tournent (`.logo-orbital-ring`), des cercles parasites ou de gros halos flous radiaux multicolores (`.logo-backlight`) derrière le logo. Le logo officiel doit briller par sa géométrie nette et son contraste, sans artifices kitsch.

  * **Règle 35 : Typographie Nette, Lisible & Haute Résolution (Zéro Flou ni Couleur Indéfinie)** :
    - **Interdiction des dégradés transparents cassés** : L'utilisation de `-webkit-background-clip: text` avec des dégradés complexes sur des conteneurs morcelés en `inline-block` produit des artefacts flous, grisâtres ou illisibles sous Chromium/Puppeteer.
    - **Contraste Absolu** : Utiliser un blanc pur tranchant (`#ffffff` ou `#f8fafc`) pour le texte principal, avec une couleur d'accent unique, vive et saturée (ex: vert émeraude OpenAI `#10a37f`, cyan vibrant) sur le mot clé d'impact.
    - **Positionnement Cinématographique** : Bannir l'empilement vertical centré systématique (logo en haut, titre au milieu, sous-titre en bas, tous centrés au même endroit). Composer avec la règle des tiers, l'asymétrie élégante et des hauteurs de ligne confortables.

  * **Règle 36 : Variété Scénaristique Obligatoire (Zéro Scènes Jumelles / Anti-Monotonie)** :
    - **INTERDICTION DES SCÈNES IDENTIQUES EN SÉRIE** : Il est interdit de produire une vidéo où toutes les scènes partagent le même layout (même fond bleu sombre, mêmes 3 ronds flous, même carte centrale).
    - Chaque scène doit surprendre le spectateur avec un cadrage et une structure graphique différente :
      - *Scène 1* : Révélation typographique héroïque et logo tranchant.
      - *Scène 2* : Visualisation cinétique de performance (benchmark en pleine largeur, métrique géante nette).
      - *Scène 3* : Workspace / flux de travail réel avec code haute lisibilité.
      - *Scène 4* : Espace immersif épuré (vision multimodale ou split-screen cinématique).
      - *Scène 5* : Climax sobre et mémorable avec signature de marque.

  * **Règle 37 : Typographie Dual-Font & Règle d'Unité du Nom de Marque** :
    - **Unité Stricte du Nom de Marque / Modèle** : Le nom d'un modèle ou d'une marque (ex: `ChatGPT Astra`) doit **toujours avoir la même police, la même graisse et la même couleur** (ex: les deux mots en Bold Sans noir ou blanc). Ne jamais appliquer deux polices différentes à l'intérieur du nom de marque lui-même.
    - **Le Dual-Font concerne UNIQUEMENT le texte narratif** :
      1. **Police Primaire Ultra-Bold** (`Plus Jakarta Sans` ou `Outfit` 800) pour l'ensemble du message.
      2. **Police Secondaire Light Fashion Italic** (`Instrument Serif` 400 italic) pour sublimer le mot clé d'impact dans les phrases (ex: *"Une nouvelle <span class="fashion">dimension</span>."*).
    - **Zéro Espacement Excessif** : Espacement compact naturel standard.

  * **Règle 38 : Résolution & Zoom : Vectoriel (SVG) vs Matriciel (PNG / JPEG)** :
    - **Le SVG est vectoriel et infiniment scalable** : Un logo ou pictogramme en SVG vectoriel avec `viewBox` conserve des courbes parfaites au zoom.
    - **Interdiction formelle de zoomer sur des images matricielles (PNG, JPEG)** : Un zoom sur un PNG/JPEG fait exploser la grille de pixels et dégrade la vidéo. Si un logo ou élément graphique doit être zoomé, il **DOIT impérativement être un SVG vectoriel pur**.


  * **Règle 39 : Motivation Absolue de la Caméra sur le Code & Zéro Mouvement Inutile** :
    - **Zéro slide sur du code inerte** : Il est strictement interdit de déplacer ou zoomer la caméra vers un bloc de code si ce code est statique et n'affiche aucune animation active. Si la caméra glisse ou zoome sur du code, le code DOIT impérativement être en train de s'écrire ou de streamer en direct (`typewriter`, streaming ligne par ligne, curseur lumineux actif).
    - **Diversification Radicale par Scène** : Chaque scène d'une vidéo doit avoir une signature de caméra unique, sans répéter les mêmes enchaînements d'une scène à l'autre.

  * **Règle 40 : Interdiction Formelle des Textes Explicatifs Parasites (« Show, Don't Tell »)** :
    - **BANNISSEMENT DES LABELS ET TEXTES EXPLICATIFS EN MODE POWERPOINT** : Il est strictement interdit d'afficher des bandeaux de texte, des badges ou des statuts HUD qui décrivent ce qui se passe à l'écran (ex: *« Chambre plongée dans l'obscurité »*, *« Lumière allumée »*, *« Le personnage se prépare »*, *« Scène 1 : Arrivée »*).
    - **Loi Fondamentale du Cinéma & de l'Animation** : La vidéo est un médium visuel pur. **L'action doit être montrée par la 3D, le mouvement, le jeu d'acteurs et la lumière**, et non racontée par du texte redondant comme un exposé scolaire.
    - **Seules exceptions** : Un titre de présentation officiel ou des sous-titres de voix off explicites. En dehors de cela, dans toute scène narrative, animation ou diorama 3D, **ZÉRO texte explicatif à l'écran**.

  * **Règle 41 : Règle de Non-Traversée d'Objets 3D, Biomécanique & Orientation du Regard** :
    - **ZÉRO CLIPPING À TRAVERS LE MOBILIER** : Il est formellement interdit qu'un personnage ou un animal traverse un meuble (table, canapé, lit, mur) en ligne droite. Les trajectoires doivent obligatoirement contourner les obstacles via des waypoints fluides, ou la scène doit offrir un couloir de passage dégagé.
    - **ZÉRO MARCHE EN RECULONS INVOLONTAIRE** : Tout être vivant 3D doit pivoter face à sa cible AVANT d'avancer, et courir dans le sens exact de son regard (`rotation.y` aligné sur le vecteur mouvement).
    - **BIOMÉCANIQUE DE L'ACCROUPISSEMENT / AGENOUILLEMENT** : Lorsqu'un personnage s'accroupit ou s'agenouille, les pieds restent ancrés au sol ou les tibias partent vers l'arrière sous les fesses. Les jambes entières ne doivent jamais pivoter en l'air vers l'avant.

   * **Règle 42 : Diversité & Motivation des Transitions Cinématiques entre Scènes** :
     - **BANNISSEMENT DU FONDU NOIR SYSTÉMATIQUE** : Il est strictement interdit d'appliquer le même fondu au noir fade-out standard sur toutes les transitions d'une vidéo.
     - **Transitions Motivées par les Éléments Réels de la Scène** :
       1. **Object Zoom Portal** : La caméra zoome violemment sur un élément central (ex: étoile, mot clé, pupille, logo, écran) qui grandit (scale 1.0 -> 15.0) et remplit l'écran pour dévoiler la scène suivante.
       2. **Whip Slide (Balayage Dynamique)** : Le mouvement rapide d'un objet (panneau, véhicule, flux de données) entraîne la scène dans un balayage directionnel rapide avec motion blur.
       3. **Match Cut (Continuité Morphologique)** : Raccord direct où l'objet final d'une scène possède la même forme ou couleur que l'objet initial de la scène suivante.
       4. **Hard Cut sur Beat** : Coupure nette instantanée sur un temps fort musical ou une punchline (zéro fondu mou).
       5. **J-Cut & L-Cut** : Décalage audio-visuel d'anticipation (l'audio de la scène suivante démarre 0.3s avant l'image, ou l'audio précédent déborde).
       6. **Cinematic Dissolve** : Fondu croisé subtil réservé aux scènes lentes et contemplatives.

   * **Règle 43 : Inventaire Outillage & Planification Interne en Mémoire (Zéro Fichier Résiduel)** :
     - **INVENTAIRE EN MÉMOIRE SANS DÉCHET** : Avant tout codage, l'IA effectue un inventaire ciblé des outils du projet (`07_Scripts/`) et des compétences requises. Aucun fichier temporaire ou déchet résiduel ne doit être laissé sur le disque.
     - **PAS D'ANALYSE AVEUGLE DE FICHIERS INUTILES** : L'IA ne doit pas analyser d'images ou d'assets si elle ne les utilise pas ou ne peut pas en tirer une information utile.
     - **SANITISATION MÉCANIQUE** : Tout code produit passe par le sanitizer automatique pour garantir l'absence totale de boutons web, d'étiquettes PowerPoint et de valeurs `NaN`.

   * **Règle 44 : Audio Mix Infaillible — Voix Constante, Équilibre SFX/Musique & Fondu Obligatoire** :
     - **Volume Voix Constant dès 0s (Parade au Bug `amix`)** : La voix off ne doit JAMAIS commencer faible pour monter ensuite. L'assemblage séquentiel de clips voix avec `amix` sans `normalize=0` divise le volume par le nombre d'entrées actives (atténuation jusqu'à -14 dB au début). **Obligation formelle d'assembler la voix avec `07_Scripts/build_soundtrack.cjs` (filtre `concat` natif avec tampons de silence parfaits)** pour un volume 100% stable dès la première milliseconde (-14 LUFS, True Peak -1.0 dBTP).
     - **Ducking Musique Automatique** : La musique de fond s'atténue de -10 à -14 dB (-18 à -22 dB sous la voix) dès que la voix parle, et remonte doucement (-10 à -12 dB) lors des pauses respiratoires (> 0.8s), de l'intro et de l'outro.
     - **Sources Musicales & Bruitages Réels Prioritaires** : Obtenir la musique via `node 07_Scripts/fetch_music.cjs` (`01_Assets/Musiques/`) et les bruitages via `node 07_Scripts/fetch_sfx.cjs` (catalogue CC0/CC-BY propre / Openverse avant fallback adouci `sfx.py --peak 0.35`).
     - **Outillage Unifié Obligatoire (`build_soundtrack.cjs` + `normalize_audio.cjs`)** : Toujours utiliser **`node 07_Scripts/build_soundtrack.cjs`** (avec `--clips`/`--voice`, `--music`, `--music-start`, `--sfx <json>`) plutôt que des scripts Python/FFmpeg jetables dans `scratch/`.
     - **Équilibre SFX vs Musique (Calibration par True Peak `max_volume`, Jamais par `mean_volume` Global)** : Les SFX percussifs ayant une traîne silencieuse qui baisse artificiellement `mean_volume` de 15 à 30 dB, calibrer impérativement chaque SFX par son **pic maximal mesuré (`targetPeakDb - max_volume`)** relativement au lit musical (`-16 LUFS` sans voix / `-18 à -22 dB` sous la voix) : `ui` (`click-soft`, `pop`, `chime`) pic max **`-22.5 dBFS`**, `whoosh` pic max **`-18.5 dBFS`**, `impact` (`impact-bass`, `heartbeat`) pic max **`-15.0 dBFS`** avec passe-bas doux et `alimiter=limit=0.90`.
     - **Fondu de Sortie Musique Obligatoire (`afade=t=out`)** : Toute piste musicale DOIT impérativement comporter un fondu de sortie progressif de 2.0s à 2.5s avant la fin de la vidéo, exportée en `.mp3` 192 kbps (`normalize_audio.cjs --ar 48000`). Aucune vidéo ne doit s'achever sur une coupure audio sèche.

   * **Règle 45 : Zéro Scène Morte — Vitalité Cinématique Continue vs Plateau Cognitif Réfléchi** :
     - **INTERDICTION FORMELLE DES SCÈNES MORTES SANS VIE** : Une scène vidéo ne doit jamais rester statique et figée.
     - **Moteurs de vie continue obligatoires** :
       1. *Dérive caméra continue (Continuous Drift)* : Travelling lent, push-in subtil (scale 1.0 -> 1.05) ou lent pan x/y permanent.
       2. *Micro-physique & éclairages vivants* : Orbes lumineuses oscillantes (`sine.inOut`), curseurs clignotants, oscillations douces d'éléments.
       3. *Apparition cinétique cadencée* : Révélation progressive mot par mot synchronisée sur la voix off.
     - **Exception unique autorisée : Le Plateau Cognitif ("Holding Phase")** : Uniquement pour ancrer l'attention sur un chiffre clé ou une punchline cruciale, la caméra peut marquer un plateau fixe temporaire (1.2s à 1.8s max), mais les lueurs et indicateurs d'ambiance restent vivants.

   * **Règle 46 : Diversité Stylistique des Cards & Animation Interne Décalée (Stagger)** :
     - **3 Styles de Cards selon le Contexte** :
       1. *Card Flat Minimaliste / Bento Nette* : Bordure ultra-fine (1px solid rgba(..., 0.08)), contraste maximal, fond neutre.
       2. *Card 3D en Perspective* : Relief spatial (`perspective(1200px) rotateX(...) rotateY(...)`), réagissant à la caméra.
       3. *Card Élevée / Ombrée (Elevated Shadow)* : Ombre portée diffuse multicouche (`box-shadow: 0 12px 32px rgba(...)`) avec respect absolu du contraste (zéro halo sombre baveux).
     - **INTERDICTION DE FAIRE APPARAÎTRE UNE CARD COMME UN BLOC FIGÉ MONOBLOC** :
       Chaque élément interne de la card (icône d'en-tête, badge, titre, métrique chiffrée, barre de progression/graphique, note) DOIT s'animer de manière décalée (`stagger: 0.06s à 0.10s` ou entrées séquencées).

   * **Règle 47 : Synchronisation Cognitive — Animation Ordonnée / Séquencée vs Animation Simultanée d'Ensemble** :
     - **Principe Fondamental** : Le mode d'animation dépend de la charge cognitive du spectateur et du scénario :
       1. **Mode Séquencé / Ordonné (Standard par défaut — 90% des scènes)** :
          - *Avec Voix Off* : L'animation DOIT suivre scrupuleusement la voix off. Chaque mot, carte, métrique ou graphique apparaît au moment exact où la voix le prononce. L'œil suit l'oreille.
          - *Sans Voix Off* : L'animation DOIT suivre un ordre hiérarchique logique de lecture humaine (de haut en bas, de gauche à droite : Titre d'accroche $\rightarrow$ Objet / Card principal $\rightarrow$ Détail / Métrique $\rightarrow$ Conclusion / CTA). Le cerveau ne peut comprendre qu'une idée à la fois.
       2. **Mode Simultané (Exception ciblée d'ambiance globale)** :
          - Les éléments s'animent tous en même temps **UNIQUEMENT et STRICTEMENT lorsque le spectateur n'a PAS besoin de comprendre chaque élément un par un**, mais perçoit une sensation d'ensemble ou une texture visuelle globale :
            * *Exemples autorisés* : explosion de confettis, nuage de particules, constellation d'arrière-plan, volée de logos partenaires secondaires en fond, cascade de données matricielles décoratives.
            * Tout élément porteur de sens doit obligatoirement être ordonné.




   * **Règle 48 : Intégration 3D Temps Réel & Garde Stricte Blender** :
     - **Rendu 3D temps réel par défaut via Three.js** : Tout élément ou scène 3D intégrée dans une composition vidéo utilise le moteur WebGL Three.js avec des modèles `.glb` / `.gltf` préexistants dans `01_Assets/3D/` (éclairage studio 3 points, fond transparent `alpha: true`, synchronisation GSAP pure sur la timeline maîtresse `tl` pour 60 FPS constants et scrubbing à 0ms).
     - **Garde stricte Blender** : **L'IA ne doit JAMAIS lancer ou appeler Blender (que ce soit via le MCP Blender 3.6 LTS ou le script Blender CLI `07_Scripts/blender_tool.cjs`) sans que l'utilisateur ne le demande explicitement** (ex: pour convertir un asset 3D lourd, décimer un maillage ou générer un modèle 3D sur demande). Par défaut, l'IA privilégie Three.js et les modèles déjà optimisés dans `01_Assets/3D/`.

   * **Règle 49 : Flou de Mouvement de Caméra & Transitions Whip Pan Déterministes (SVG Filter feGaussianBlur)** :
     - **Filtre SVG Directionnel Haute Performance** : Un filtre SVG `<filter id="cameraMotionBlur"><feGaussianBlur id="cameraBlurFilter" in="SourceGraphic" stdDeviation="0,0" /></filter>` est branché nativement sur le conteneur principal `#cameraRig` avec `will-change: transform, filter;`.
     - **Pilotage Déterministe sur la Timeline GSAP `tl`** : Lors d'une transition rapide (Whip Pan, Balayage de scène, Crash Zoom ou Secousse d'impact), le flou de mouvement DOIT être animé directement via l'attribut `stdDeviation` :
       * *Whip Pan Horizontal* (transition gauche/droite) : `tl.fromTo('#cameraBlurFilter', { attr: { stdDeviation: '0,0' } }, { attr: { stdDeviation: '26,0' }, duration: 0.16, ease: 'power2.in', yoyo: true, repeat: 1 }, tTransition);`
       * *Whip Pan Vertical / Pedestal* (transition haut/bas) : `tl.fromTo('#cameraBlurFilter', { attr: { stdDeviation: '0,0' } }, { attr: { stdDeviation: '0,22' }, duration: 0.16, ease: 'power2.in', yoyo: true, repeat: 1 }, tTransition);`
       * *Crash Zoom / Impact Choc* : `tl.fromTo('#cameraBlurFilter', { attr: { stdDeviation: '0,0' } }, { attr: { stdDeviation: '16,16' }, duration: 0.14, ease: 'power2.in', yoyo: true, repeat: 1 }, tImpact);`
     - **Synchronisation avec le Sound Design** : Accompagner systématiquement chaque whip-pan cinématique d'un whoosh sonore via `tl.call(() => playSfx('whoosh', 0.45), null, tTransition);`.
     - **Zéro Saccade & Déterminisme 100%** : Contrairement au CSS `blur()` omnidirectionnel lourd, le filtre SVG directionnel préserve la netteté perpendiculaire au mouvement, exploite l'accélération matérielle du navigateur et garantit un rendu image-par-image (`render.cjs`) parfaitement net et stable à 60 FPS.

   * **Règle 50 : Compréhension Avant le Chrono (Script Naturel ou Animations Douces, Zéro Trou de Voix)** :
     - **Zéro Coupure Artificielle de Voix Off** : Ne jamais sacrifier la compréhension pour une durée courte arbitraire, mais **interdiction formelle de hacher une voix off par des silences artificiels** (trous non naturels risquant un décalage audio/visuel).
     - **Deux Levers Naturels pour Laisser Assimiler** : Soit **rédiger et rallonger le script narratif dès le départ** avec des phrases fluides et posées couvrant naturellement la durée voulue, soit **alléger la densité visuelle et adoucir les animations** (moins d'éléments simultanés à l'écran) pour que le spectateur comprenne sans coupure de narration.

   * **Règle 51 : Exactitude Chronologique des Archives + Sélection Musicale Sur-Mesure & SFX Discrets** :
     - **Chronologie & Âge des Portraits** : Tout portrait ou photo d'archive DOIT correspondre à **la date et à l'âge exacts** mentionnés par la scène (ex: photo de jeunesse/2008 si la scène parle de 2008, jamais de portrait moderne anachronique).
     - **Fin des Musiques Répétées / Synthèses Bâclées** : Analyser le thème et l'émotion de chaque projet pour **télécharger une vraie musique adaptée et variée** (`07_Scripts/fetch_music.cjs --query "..."` via Openverse / catalogue Incompetech en excluant la piste précédente). Ne jamais générer une piste synthétique approximative quand une vraie musique adaptée est téléchargeable.
     - **SFX Subordonnés à la Voix (`build_soundtrack.cjs`)** : Sous voix off pré-normalisée à `-14 LUFS` (+ ducking `sidechaincompress` sur la musique), les SFX doivent rester strictement en retrait (`impact <= -30 dBFS`, `whoosh <= -33 dBFS`, `ui <= -36 dBFS`) pour ne jamais masquer la parole.

   * **Règle 52 : Hiérarchie d'Animation Workflow / Réseau (Sujet ou Logo Central d'Abord)** :
     - Dans toute scène de type *Workflow*, *Architecture*, *Écosystème* ou *Réseau* centrée sur un logo, un produit ou un sujet principal, **le hub/logo central DOIT impérativement apparaître EN PREMIER** (c'est le cœur du débat).
     - Les lignes de flux partent ensuite du centre vers l'extérieur (ou s'animent séquentiellement) et **les nœuds/éléments périphériques s'affichent un par un** en cascade rythmée, jamais avant le sujet central.

---

## 2. Boîte à Outils de l'IA (`07_Scripts/`)

| Script | Rôle | Commande |
| :--- | :--- | :--- |
| `studio-server.cjs` | Serveur local de l'application Studio (port 3000) | `node 07_Scripts/studio-server.cjs` |
| `check-contrast.cjs` | Vérificateur automatisé du contraste WCAG 2.1 des compositions HTML | `node 07_Scripts/check-contrast.cjs 04_Videos/<fichier>.html` |
| `ai_director.cjs` | Orchestrateur IA du pipeline complet de création | `node 07_Scripts/ai_director.cjs --prompt "..."` |
| `build_soundtrack.cjs` | Assemblage et mixage de bande-son master (voix stable, ducking musique, mixage SFX par True Peak, mode instrumental `--music-start`, fondu de fin, LUFS) | `node 07_Scripts/build_soundtrack.cjs --out <sortie.mp3> [--clips <json> \| --voice <v>] [--music <m>] [--sfx <json>]` |
| `render.cjs` | Rendu MP4 headless via Puppeteer et FFmpeg (**SUR DEMANDE EXPLICITE UNIQUEMENT**) | `node 07_Scripts/render.cjs <chemin_html> [format]` |
| `generate_voice.cjs` | Synthèse vocale IA ElevenLabs réaliste | `node 07_Scripts/generate_voice.cjs "<texte>" <sortie_mp3>` |
| `youtube_clip.cjs` | Recherche, extraction et transcription d'extraits vidéo YouTube | `node 07_Scripts/youtube_clip.cjs --download <url> --start 00:01:10 --end 00:01:25` |
| `transcribe_subtitles.cjs`| Calage temporel mot-à-mot des sous-titres | `node 07_Scripts/transcribe_subtitles.cjs <audio> <texte>` |
| `brandfetch.cjs` | Extraction de logos officiels de marques (SVG / PNG) | `node 07_Scripts/brandfetch.cjs <domaine>` |
| `fetch_map.cjs` | Génération de cartes géographiques HD sans watermark (5 styles: dark, voyager, light, satellite, osm) | `node 07_Scripts/fetch_map.cjs --query "Paris, France" [--style dark]` |
| `fetch_flag.cjs` | Téléchargement de drapeaux nationaux & territoriaux (SVG vectoriel & PNG gratuits) | `node 07_Scripts/fetch_flag.cjs <pays>` |
| `fetch_music.cjs` | Téléchargement de vraies musiques libres de droit (`war`, `dramatic`, `epic`, `somber`, `suspense`, `tech`, `sports`, `chill`) | `node 07_Scripts/fetch_music.cjs --mood <mood>` |
| `fetch_sfx.cjs` | Récupération de bruitages propres (CC0/CC-BY, Openverse, fallback `sfx.py --peak 0.35`) | `node 07_Scripts/fetch_sfx.cjs --batch "click-soft,whoosh-short,impact-bass-1"` |
| `normalize_audio.cjs` | Normalisation sonore 48 kHz aux normes broadcast (-14 LUFS) | `node 07_Scripts/normalize_audio.cjs --input <in> --out <out> --ar 48000` |
| `generate_bg.cjs` | Générateur universel d'arrière-plans animés (SaaS avec néons lissés, gradients, waves, aurora, grid) | `node 07_Scripts/generate_bg.cjs --style saas [--bg "#ffffff"] [--accent "#e11d48"]` |
| `remove_bg.cjs` | Détourage automatique d'images | `node 07_Scripts/remove_bg.cjs <image>` |
| `fetch_3d_model.cjs` | Téléchargement de modèles 3D réalistes (.glb/.gltf) avec fallback multi-sources | `node 07_Scripts/fetch_3d_model.cjs --query "<mot_cle>"` |
| `blender_tool.cjs` | Utilitaire CLI Blender pour exporter / convertir des modèles vers `01_Assets/3D/` (**DÉCLENCHÉ UNIQUEMENT SUR DEMANDE EXPLICITE**) | `node 07_Scripts/blender_tool.cjs convert <fichier> [sortie.glb]` |
| `blender_export_glb.py` | Script interne Blender CLI (`bpy`) d'optimisation et export glTF 2.0 binaire (.glb) | `blender --background --python 07_Scripts/blender_export_glb.py -- <in> <out>` |
