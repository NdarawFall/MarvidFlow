# Architecture de Référence du Projet VibeEditor

> [!IMPORTANT]
> **NATURE DU PROJET & PHILOSOPHIE UTILISATEUR** :
> 1. **Studio Web Local Autonome** : AutoFrame / MarvidFlow est un **studio de création vidéo web/local** propulsé par un serveur Node.js (`07_Scripts/studio-server.cjs`).
> 2. **Interface Studio Interactive** : L'accès, la création et la prévisualisation se font directement via le navigateur web sur `http://localhost:3000` (`npm start` ou `npm run studio`).
> 3. **Gestion Transparente des Paramètres & Clés API** :
>    - Toute la configuration se fait exclusivement à travers l'interface graphique du Dashboard SPA ([`09_Pages/home.html#settings`](../../09_Pages/home.html#settings)).
>    - Les clés et réglages sont persistés dans `07_Scripts/api_config.json` (qui reste strictement exclu de Git).
>    - Si une clé API est manquante lors d'une tentative de création vidéo, l'application le signale par une modale claire invitant l'utilisateur à coller sa clé dans l'écran des Paramètres.
> 4. **Organisation Stricte des Règles et des Skills** :
>    - Le dossier `.agents/rules/` est **strictement réservé aux règles de gouvernance de l'IA** (6 fichiers maîtres consolidés).
>    - Les skills et compétences spécialisées de l'agent résident dans `.agents/skills/` (dont `My_Skills/` pour les règles vidéo internes) et `00_Skills/`.
> 5. **Règle Stricte sur les Scripts Temporaires** :
>    - **JAMAIS** de script temporaire/jetable dans `07_Scripts/` ni à la racine du projet ! Le dossier `07_Scripts/` est réservé aux scripts permanents du moteur.
>    - Tout script temporaire/jetable pour des tests, manipulations ou contournements doit impérativement être créé dans le dossier `scratch/` ET être immédiatement supprimé après son exécution (aucun déchet résiduel).
> 6. **Maintien Continu de l'Architecture & Traçabilité des Fichiers** :
>    - Ce document de référence (`01-project-architecture.md`) DOIT être **systématiquement mis à jour** chaque fois qu'un fichier ou dossier **consistant et pérenne** est créé, déplacé, renommé ou supprimé (nouveaux modules, scripts permanents du moteur, dossiers d'assets pérennes, documentations dans `Docs/`).
>    - Les fichiers et dossiers éphémères/résiduels (contenus temporaires de `scratch/`, checkpoints intermédiaires nettoyés automatiquement) ne doivent pas y figurer.

---

## 1. Arborescence Globale du Projet

```text
heygen-new/
├── package.json                # Dépendances & scripts ("npm start", "npm run studio", "npm run render")
├── .agents/
│   ├── rules/                  # Règles strictes de gouvernance pour l'IA (6 fichiers maîtres consolidés)
│   │   ├── 01-project-architecture.md          # Architecture, arborescence complète, pages et stack
│   │   ├── 02-video-creation-matrix.md         # Matrice des 41 règles de création vidéo, DA, logos & 3D
│   │   ├── 03-scenarisation-and-validation.md  # Protocole de scénarisation et validation préalable
│   │   ├── 04-studio-and-rendering-contract.md # Contrat Studio, vidéo HTML5, B-Roll & politique de rendu
│   │   ├── 05-error-logs.md                    # Registre des erreurs évitées et post-mortems
│   │   └── 06-security-and-packaging-audit.md  # Audit de sécurité et packaging
│   └── skills/                 # Compétences et savoir-faire autonomes de l'IA
│       ├── My_Skills/          # Compétences vidéo avancées internes de MarvidFlow
│       │   ├── Camera/         # Mouvements de caméra 3D/2D, transitions et justification cinématique
│       │   ├── design_composition/ # Principes de design, contrastes, fonds dynamiques & néons
│       │   ├── gsap_templates/ # Templates GSAP déterministes et seek-safe
│       │   ├── hand_cursor/    # Interaction curseurs mains réalistes (open/closed/pointing)
│       │   ├── montage_storytelling/ # Récit, rythme et découpage de scènes
│       │   ├── sound_design/   # Mixage audio, bruitages SFX et normalisation LUFS
│       │   ├── text_animation/ # Typographie double (fashion/bold), apparition mot-à-mot
│       │   └── threejs_3d/     # Rendu 3D Three.js, caméra third-person, walk-cycle & zéro clipping
│       │       ├── SKILL.md                    # Règles principales 3D Three.js
│       │       └── image2threejs_pipeline.md   # Pipeline de modélisation 3D procédurale en code (img2threejs)
│       ├── hyperframes/        # Moteur HyperFrames de rendu vidéo HTML/CSS/JS
│       ├── hyperframes-animation/ # Bibliothèque de techniques d'animation
│       ├── Joseph_Edit_Skills/ # 17 règles de montage vidéo par Joseph / Ultimate Editors
│       └── media-use/          # Résolution et mixage de médias locaux et IA
├── 00_Skills/                  # Anciens modules de compétences pérennes
│   ├── tegaki_handwriting/     # Moteur d'animation d'écriture manuscrite vectorielle SVG
│   ├── video_design_mastery/   # Principes de design vidéo
│   ├── animation_2d_physics/   # Lois physiques du motion design
│   └── reconstruction_documentary/ # Guides de reconstitution documentaire
├── 01_Assets/                  # Bibliothèque statique et répertoires de stockage des médias
│   ├── 3D/                     # Modèles 3D locaux (.glb téléchargés via fetch_3d_model.cjs)
│   ├── Avatars/                # Portraits et présentateurs
│   ├── Audio_Mix/              # Bandes sonores finales mixées
│   ├── Captures/               # Captures d'écran UI, mockups et snapshots de sites web (PNG/WebP/MP4)
│   ├── Effets_Sonores/         # Bruitages d'impact et transitions (SFX : whoosh, pop, hit, pass)
│   ├── Flags/                  # Drapeaux nationaux vectoriels SVG / PNG
│   ├── Handwriting/            # Tracés SVG manuscrits générés par le skill Tegaki
│   ├── Icones/                 # Pictogrammes UI et icônes vectorielles
│   ├── Illustrations/          # Éléments graphiques, visuels d'habillage et portraits
│   │   └── Players/            # Portraits détourés de joueurs de foot (TheSportsDB)
│   ├── Images/                 # Visuels fixes (inclut /channels/ pour les logos de chaînes)
│   ├── Logos/                  # Logos officiels de marques récupérés via brandfetch.cjs
│   ├── Maps/                   # Cartes géographiques générées par fetch_map.cjs / stitch_map.cjs
│   ├── Musiques/               # Pistes audio d'ambiance et thèmes musicaux
│   ├── Videos/                 # Clips B-Roll et extraits vidéo
│   └── Voix_Off/               # Narrations vocales synthétisées (ElevenLabs / TTS)
├── 02_Composants/              # Briques UI et animations visuelles prêtes à l'emploi
│   ├── Audio_Visualizer/       # Barres de fréquences et ondes sonores réactives
│   ├── Background/             # Arrière-plans variés et textures
│   ├── Callouts_Badges/        # Badges, notifications toasts & stacks
│   ├── Card/                   # Cartes stylisées Shadcn
│   ├── Charts_Data/            # Graphiques de données animés (Chart.js / SVG)
│   ├── Counter/                # Compteurs numériques dynamiques (CountUp.js)
│   ├── Lower_Thirds/           # Bandeaux d'identification cinématiques
│   ├── Mockups_Devices/        # Gabarits d'écrans (iPhone, MacBook, navigateurs)
│   ├── Progress_Bar/           # Barres de progression et jauges temporelles
│   ├── Quotes_Citations/       # Encadrés de citation & avis clients
│   ├── Split_Screen/           # Écrans partagés modulaires
│   ├── Subtitle/               # Styles de sous-titrage dynamique mot-à-mot (style Hormozi)
│   ├── Text animation/         # Effets typographiques cinétiques
│   └── Visual_Effect/          # Effets visuels (halos, particules, reflets)
├── 03_Chaines/                 # [Organisationnel] Sous-dossiers de chaque chaîne (<channelId>/...)
├── 04_Videos/                  # [Éphémère] Compositions HTML finales autonomes (sans chaîne)
├── 05_Scenes/                  # [Éphémère] Scènes modulaires unitaires générées par l'IA
├── 06_Templates/               # Gabarits maîtres pour la production rapide
├── 07_Scripts/                 # Boîte à outils et moteurs exécutables du studio
│   ├── studio-server.cjs       # Serveur Node.js local de l'application Studio (port 3000)
│   ├── ai_director.cjs         # Moteur orchestrateur autonome de création vidéo par IA
│   ├── ai_kombo.cjs            # Module d'assemblage multi-sources vidéo et voix
│   ├── render.cjs              # Moteur de capture headless Puppeteer & rendu MP4 FFmpeg
│   ├── image2threejs.cjs       # Générateur procédural 3D Three.js sans GLB, extraction Sharp & prévisualisation
│   ├── fetch_3d_model.cjs      # Téléchargement de modèles 3D .glb réalistes (Poly Haven / Khronos)
│   ├── blender_tool.cjs        # Utilitaire CLI Blender d'exportation vers 01_Assets/3D/ (SUR DEMANDE EXPLICITE)
│   ├── blender_export_glb.py   # Script interne Blender CLI (bpy) d'optimisation et export glTF 2.0 binaire (.glb)
│   ├── generate_voice.cjs      # Synthèse vocale IA réaliste (ElevenLabs / Edge TTS)
│   ├── generate_music.py       # Génération de pistes musicales procédurales
│   ├── sfx.py                  # Moteur d'effets sonores et bruitages procéduraux
│   ├── fetch_sfx.cjs           # Moteur hybride de bruitages : recherche Openverse (CC0) et fallback procédural Earshot
│   ├── coverr.cjs              # Moteur de recherche et téléchargement de vidéos B-Roll HD/4K
│   ├── transcribe_subtitles.cjs# Calage temporel mot-à-mot des sous-titres
│   ├── brandfetch.cjs          # Extraction automatique de logos officiels de marques (SVG/PNG)
│   ├── fetch_map.cjs           # Génération de cartes géographiques et tracés d'itinéraires
│   ├── stitch_map.cjs          # Assemblage de tuiles cartographiques HD
│   ├── fetch_flag.cjs          # Téléchargement de drapeaux mondiaux HD
│   ├── fetch_football_logo.cjs # Téléchargement de logos de foot (football-logos.cc)
│   ├── fetch_sportsdb.cjs      # Téléchargement de portraits joueurs détourés & badges (TheSportsDB)
│   ├── fetch_music.cjs         # Téléchargement de musiques libres de droit (Incompetech)
│   ├── cut_silences.cjs        # Découpe automatique des silences (jump-cut) pour rushes Clients/
│   ├── detect_bad_takes.cjs    # Détection automatique des mauvaises prises et hésitations
│   ├── auto_reframe.cjs        # Recadrage automatique 16:9 -> 9:16 vertical (crop, blur, split)
│   ├── build_soundtrack.cjs    # Assemblage et mixage de bande-son master (voix stable, ducking musique, fondu de fin, -14 LUFS)
│   ├── normalize_audio.cjs     # Normalisation sonore professionnelle EBU R128 (-14 LUFS)
│   ├── remove_bg.cjs           # Détourage et suppression du fond d'images
│   ├── record_web.cjs          # Capture vidéo de pages web dynamiques
│   ├── chroma_key.cjs          # Incrustation sur fond vert / détourage vidéo
│   ├── youtube_clip.cjs        # Téléchargement d'extraits vidéo YouTube
│   ├── build_phone_video.cjs   # Générateur de vidéos mockup smartphone
│   ├── build_top10_video.cjs   # Générateur de vidéos format Top 10 vertical
│   ├── build_top10_16x9_video.cjs # Générateur de vidéos format Top 10 horizontal
│   ├── build_growkaw_video.cjs # Générateur automatisé de formats growth
│   ├── build_video_handwriting.cjs # Assemblage d'animations manuscrites
│   ├── build_ww2_documentary.cjs # Générateur autonome du documentaire Vox WW2 (11mn)
│   ├── roadmap_generator.cjs   # Générateur et gestionnaire de la feuille de route IA unique (feuille_de_route.md)
│   ├── build_icon.cjs          # Construction d'icônes 3D animées
│   ├── generate_bg.cjs         # Générateur universel d'arrière-plans animés (SaaS, gradients, waves, aurora, grid)
│   ├── generate_style_thumbnails.cjs # Générateur de vignettes de styles
│   ├── generate_all_style_thumbnails.cjs # Batch de vignettes de styles
│   ├── audit-build-security.cjs# Audit de conformité de sécurité et dépendances
│   ├── check-architecture.cjs  # Gardien automatisé de conformité de 01-project-architecture.md
│   ├── check-contrast.cjs      # Vérificateur automatisé du contraste WCAG 2.1 des compositions HTML
│   ├── cleanup-scratch.cjs     # Nettoyage automatique du dossier scratch/
│   ├── audio_sync_helper.js    # Synchronisation audio/vidéo fine
│   ├── channels.json           # Registre des chaînes créées
│   ├── api_config.json         # Stockage local des clés API (ignoré par Git)
│   └── api_config.example.json # Modèle de configuration des clés API
├── 08_Rendus/                  # [Éphémère] Sorties finales vidéo MP4 (ignoré par Git)
├── 09_Pages/                   # Interface utilisateur web du studio (Dashboard SPA, Studio Player)
│   ├── home.html               # Application SPA centrale (#dashboard, #reseaux, #clients, #assets, #create_video, #settings)
│   ├── studio.html             # Studio de montage (player, timeline, onglets Vidéos, Rendus)
│   ├── create_video.html       # Formulaire de brief et configuration de création vidéo
│   ├── video_processus.html    # Suivi visuel et terminal des étapes de fabrication de la vidéo
│   ├── createur.html           # Espace de travail dédié au créateur / persona
│   ├── monteur.html            # Espace de travail dédié au monteur vidéo
│   ├── growkaz_preview.html    # Prévisualisation des formats de croissance Growkaz
│   ├── shadcn_demo.html        # Vitrine et bac à sable des composants UI Shadcn
│   └── feuille_de_route.md     # Document unique de cadrage et feuille de route IA avant mise en production (vidé après validation)
├── Clients/                    # [Clients] Rushes & vidéos brutes non montées des clients (Short / Reel / TikTok)
│   ├── .gitkeep                # Dossier vide par défaut sur Git pour la confidentialité et le stockage
│   └── README.md               # Guide d'organisation des rushes par client
└── Docs/                       # Documentation officielle du projet, guides et captures d'écran
    ├── images/                          # Captures d'écran officielles du studio (dashboard, studio, clients, assets, reseaux, create_video)
    ├── DOCUMENTATION_CREATION_VIDEO.md  # Guide complet de création vidéo
    └── MARVIDFLOW_AI_COACH_SKILL.md     # Master prompt / Skill IA pour le brainstorming externe
```

---

## 2. Règle Stricte de Nommage des Fichiers & Suffixes Identiques

Afin d'éviter tout conflit et d'assurer une traçabilité totale entre une vidéo et ses médias :

### Cas 1 : Vidéo créée au sein d'une Chaîne (`03_Chaines/<channelId>/`)
* **Le fichier vidéo et TOUS ses assets dédiés doivent impérativement partager le même suffixe alphanumérique unique** (généré au départ, ex: `-12ABC`) :
  - Fichier vidéo HTML : `03_Chaines/ch_tech/story_nike-12ABC.html`
  - Image de la vidéo : `01_Assets/Images/ch_tech/chaussure-12ABC.png`
  - Voix off de la vidéo : `01_Assets/Voix_Off/ch_tech/narration-12ABC.mp3`
  - Sous-titres de la vidéo : `01_Assets/Voix_Off/ch_tech/subtitles-12ABC.json`
  - Musique de la vidéo : `01_Assets/Musiques/ch_tech/ambiance-12ABC.mp3`

### Cas 2 : Vidéo créée hors chaîne (Autonome dans `04_Videos/`)
* **Même règle avec un suffixe unique à 4 chiffres généré** (ex: `-2899`) :
  - Fichier vidéo HTML : `04_Videos/presentation_ia-2899.html`
  - Image liée : `01_Assets/Images/homme_bureau-2899.png`
  - Audio lié : `01_Assets/Voix_Off/voix_adam-2899.mp3`

---

## 3. Statut & Cycle de Vie du Fichier Vidéo

1. **Création préalable immédiate** : Dès la soumission d'une demande, le fichier HTML de destination est créé avec le statut `status: "processing"`.
2. **Affichage dans `channels.html` / `channel.html`** : La vidéo apparaît tout de suite avec le badge 🟡 *« En cours de création... »*.
3. **Redirection conditionnelle** :
   - Si `status === "processing"` : Le clic redirige vers [`09_Pages/video_processus.html?video=...`](../../09_Pages/video_processus.html) pour visualiser la progression en direct.
   - Si `status === "completed"` ou `"ready"` : Le clic ouvre la vidéo dans le lecteur interactif [`09_Pages/studio.html?video=...`](../../09_Pages/studio.html).

---

## 4. Tableau des Responsabilités par Dossier

| Dossier | Nature | Rôle Principal | Droit de Modification IA |
| :--- | :--- | :--- | :--- |
| **`.agents/rules/`** | Pérenne | Règles de gouvernance et contrats stricts de l'IA (6 fichiers). | Modification sur validation / audit. |
| **`.agents/skills/`**| Pérenne | Guides techniques, règles de caméra, DA, typographie et 3D Three.js. | Enrichissement continu lors de nouvelles fonctionnalités. |
| **`00_Skills/`** | Pérenne | Anciens guides et skills spécialisés réutilisables. | Lecture seule. |
| **`01_Assets/`** | Pérenne | Rangement de tous les médias utilisés par les vidéos (dont `3D/`). | Ajout de fichiers avec le suffixe unique. |
| **`02_Composants/`**| Pérenne | Éléments graphiques, transitions et briques HTML/CSS réutilisables. | Lecture et réutilisation dans les scènes. |
| **`03_Chaines/`** | Données | Dossiers personnels de chaque chaîne de l'utilisateur. | Création des vidéos finales de chaîne. |
| **`04_Videos/`** | Éphémère | Vidéos créées sans chaîne (autonomes). | Création de nouvelles vidéos avec suffixe à 4 chiffres. |
| **`05_Scenes/`** | Éphémère | Scènes modulaires unitaires générées par l'IA. | Écriture des scènes intermédiaires si multi-projets. |
| **`06_Templates/`** | Pérenne | Modèles maîtres de structures vidéo. | Lecture et duplication comme base de montage. |
| **`07_Scripts/`** | Pérenne | Moteurs d'orchestration et scripts utilitaires (`studio-server`, `ai_director`, `image2threejs`...). | Exécution et maintenance rigoureuse. |
| **`08_Rendus/`** | Éphémère | Sorties finales vidéo MP4. | Écriture exclusive par `render.cjs` **sur ordre explicite utilisateur**. |
| **`09_Pages/`** | Pérenne | Écrans et interfaces utilisateur du Studio web. | Maintenance et affichage UI. |
| **`Clients/`** | Données locales | Rushes et vidéos brutes non montées déposées par l'utilisateur pour ses clients. | Lecture par l'IA lors du montage, ignoré par Git. |
| **`Docs/`** | Pérenne | Documentation officielle du projet et guides utilisateurs. | Maintenance et enrichissement documentaire. |
