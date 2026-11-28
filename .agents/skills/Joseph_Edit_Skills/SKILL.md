---
name: Joseph_Edit_Skills
description: Règles de design et de direction artistique vidéo professionnelles (17 principes de design par Joseph / Ultimate Editors : typographie 80/20, placement règle des tiers, équilibre, contraste 4 leviers, palette 60/30/10, script-to-design, habillage short-form 9:16 et long-form 16:9).
---

# Skill : Video Design Mastery (Les 17 Règles d'Or du Montage Viral)

Ce skill formalise les **17 principes de design fondamentaux** enseignés par Joseph (*Ultimate Editors*). Il sert de directive stricte pour l'IA et les scripts de composition lors de la génération de scènes, de templates et d'animations vidéo.

---

## 📐 1. Typographie 80/20 (Dual-Font Pairing)
* **Règle absolue :** Ne jamais utiliser plus de **deux familles de polices** dans une vidéo.
* **Police Principale (80 % du contenu) :** Une police **Sans-Serif** moderne, géométrique et lisible (`Inter`, `Plus Jakarta Sans`, `Outfit`, `SF Pro Display`). Utilisée pour tous les sous-titres, les textes d'interfaces (UI), les légendes et le corps de texte.
* **Police Secondaire d'Accent (20 % du contenu) :** Une police **Script manuscrite** (`Caveat`, `Italianno`, `Tegaki`) ou **Serif éditoriale** (`Playfair Display`, `Instrument Serif`) en italique. Réservée exclusivement aux mots-clés d'impact, chiffres clés et révélations.
* **Formule CSS / HTML :**
  ```html
  <h2 class="title-sans">Comment créer une offre à <span class="highlight-script">7 Chiffres</span></h2>
  ```
* ⚡ **Règles Fondamentales d'Animation de Texte (Monopoliche vs Multipolice) :**
  * **Titre Monopoliche (1 seule police sur tout le texte, ex: *"Le Grand Écart Mondial"*) :** Animation par défaut **mot par mot** avec fondu vers le haut ou vers le bas (`titleFadeWordsUp` / `titleFadeWordsDown`). Le texte doit rester rigoureusement aligné sur sa ligne de base sans déformation ni saut de ligne.
  * **Titre Multipolice (Sans-Serif + Accent Script/Serif) :** ⚠️ **Interdiction absolue du découpage mot par mot**. Le titre doit impérativement entrer en **bloc entier** ou **ligne par ligne** (`titleMultiFontSlide`) pour préserver les rapports de baseline et la cohérence optique des deux polices.
  * **Sous-titres & Paragraphes :** Animation par défaut n°1 en **slide vers le haut** du texte entier (ou ligne par ligne avec conteneur masqué si multiligne) ; ou animation par défaut n°2 en **slide de droite à gauche mot par mot** (`subtitleWordsSlideRightToLeft`, où chaque mot glisse à sa place et s'y fige sans décaler les mots précédents). Voir `.agents/skills/My_Skills/text_animation/SKILL.md`.

---

* 🎨 **Règle Stricte des Couleurs Typographiques (2 Couleurs Max) :**
  * Ne jamais dépasser **2 couleurs** sur un même titre ou texte (ex: texte blanc avec 1 mot d'accent rouge, ou dégradé blanc vers rouge). Interdiction formelle des titres à 3 couleurs ou plus.

* 🚫 **INTERDICTION FORMELLE DE DESSINER DES LOGOS OU ICÔNES (Obligation d'Assets Officiels) :**
  * **L'IA NE DOIT JAMAIS DESSINER, INVENTER OU APPROXIMER UN LOGO OU UNE ICÔNE EN CODE** (aucun bricolage SVG fait maison, aucune approximation vectorielle, aucun tracé manuel).
  * **TOUS LES LOGOS** doivent être récupérés sous leur forme officielle via `node 07_Scripts/brandfetch.cjs <domaine>` (SVG vectoriel officiel ou PNG transparent HD) et stockés dans `01_Assets/Logos/`.
  * **TOUS LES DRAPEAUX** doivent être récupérés via `node 07_Scripts/fetch_flag.cjs <pays>` et stockés dans `01_Assets/Flags/`.
  * **TOUTES LES CARTES/LOCALISATIONS** doivent être générées via `node 07_Scripts/fetch_map.cjs` (Leaflet + capture Chrome headless) — **100% gratuit, sans watermark, sans clé API**.
    - Styles disponibles : `dark` (cinématique, défaut), `voyager` (élégant, voyage), `light` (minimaliste blanc), `satellite` (vue réelle HD), `osm` (technique, data)
    - Formats : 16:9 (1920×1080) ou 9:16 (1080×1920) avec `--format 9:16`
    - Pin animé optionnel avec `--pin`
  * **TOUTES LES ICÔNES SYSTÈME/UI** doivent provenir de bibliothèques officielles (Heroicons, Lucide, Phosphor, Material Icons) importées localement — **jamais dessinées à la main**.
  * **SI LE TÉLÉCHARGEMENT EST IMPOSSIBLE** : l'IA doit **S'ARRÊTER IMMÉDIATEMENT** et demander à l'utilisateur de fournir l'asset officiel. Aucune alternative "dessiné par l'IA" n'est tolérée.

---

## 🎯 2. Règle des Tiers & Point Focal Central
* **Grille 3x3 :** L'écran (16:9 ou 9:16) est découpé par deux lignes horizontales et deux lignes verticales.
* **Le Point Focal (Carré Central) :** Réservé obligatoirement au sujet principal (visage du présentateur, produit vedette, graphique pivot).
* **Les Zones Secondaires :**
  * Tiers inférieur : Sous-titres dynamiques et widgets UI d'accompagnement.
  * Tiers latéraux (gauche/droite) : Cartes d'illustrations, B-Roll, métriques.

---

## ⚖️ 3. Équilibre Spatial des Masses (Visual Balance)
* Quand deux éléments coexistent dans la même scène (ex: illustration + texte) :
  * **Disposition horizontale :** Répartir un élément dans la moitié gauche et un dans la moitié droite, alignés sur le même axe horizontal.
  * **Disposition verticale :** Un élément en moitié haute, un en moitié basse.
  * **Disposition diagonale :** Haut-gauche opposé à bas-droite (idéal pour dynamiser les scènes sans visage).
* **Interdiction :** Ne jamais entasser deux éléments majeurs dans le même quadrant sans contrepoids visuel.

---

## ⚡ 4. Contraste : Les 4 Leviers d'Attention
Pour forcer l'œil du spectateur à regarder l'élément clé en moins de 100 ms :
1. **Contraste de Couleur :** Fond sombre (`#09090b`) avec élément clair, ou fond blanc studio avec élément sombre.
2. **Contraste de Texture :** Fond lisse associé à un élément texturé à trame *halftone* (grain tramé 20%).
3. **Contraste d'Échelle :** L'élément principal doit être au moins 1.8x à 2.5x plus grand que les éléments secondaires.
4. **Contraste de Forme :** Isoler l'élément dans un conteneur géométrique (carte aux coins arrondis *squircle* 14-16px, badge pilule).

---

## 🎨 5. Règle Chromatique 60 / 30 / 10
Toute composition de scène doit respecter ces proportions exactes :
* **60 % — Couleur Dominante :** L'atmosphère générale ou la couleur de fond (ex: noir profond, bleu marine sombre, blanc studio).
* **30 % — Couleur Secondaire :** Les conteneurs, cartes d'interfaces, textes descriptifs et bordures (`hsl(var(--secondary))`, blanc ou zinc).
* **10 % — Couleur d'Accentuation :** Teinte ultra-saturée réservée aux boutons CTA, badges de conversion, flèches de pointage et mots d'impact (ex: vert néon `#22c55e`, cyan `#06b6d4`, orange feu `#f97316`).

---

## 🏢 6. Les 5 Paramètres de Marque Client
Avant de composer une vidéo pour une chaîne ou un client :
1. **Palette 60/30/10 :** Pipeter la couleur dominante des rushes du client et décliner les 3 nuances.
2. **Duo Typographique :** 1 Sans-Serif + 1 Script/Serif adaptées à la niche (tech, finance, storytelling, fitness).
3. **Système de Grille :** Grille stricte pour business/éducatif, cadrage asymétrique pour vlog/lifestyle.
4. **Rayon de Courbure (Border Radius) :** Fixer un rayon unique (vif 0px, moderne 12-16px, ou pilule 99px).
5. **Courbe d'Animation :** Fluidité cinématique (`power2.out`, 0.8s) ou rythme punchy (`back.out(1.5)`, 0.4s).

---

## 🧠 7. Logique Script-to-Design
Le texte prononcé dicte automatiquement la disposition graphique :
* **Le script évoque 1 seul concept :** $\rightarrow$ Placement plein centre, taille imposante, couleur d'accent (10%).
* **Le script compare 2 concepts :** $\rightarrow$ Écran divisé (Split Screen) symétrique 50/50, couleur d'accent attribuée uniquement au concept gagnant ou mis en avant.

---

## 🖥️ 8. Compositions Horizontales (16:9)
* **Objet + Texte :** Moitié gauche = Objet / Mockup, Moitié droite = Texte explicatif. Marges latérales rigoureusement identiques mesurées au pixel près.
* **Intégration sur rush vidéo réel :** Le sujet parlant occupe un côté de l'écran. L'autre côté reçoit un **flou gaussien d'arrière-plan + assombrissement (backdrop blur 16px + noir 40%)** pour y poser l'UI en toute lisibilité.
* **Mode Long-Form Premium :** Utiliser des fonds clairs texturés (*Light Mode Studio*) avec du texte sombre, universellement perçus comme plus luxueux.

---

## 📱 9. Compositions Verticales (9:16 Shorts / Reels)
* **Hiérarchie d'empilement vertical :**
  1. **Tiers Supérieur :** Visage / Sujet principal de la vidéo.
  2. **Tiers Inférieur (Haut) :** Sous-titres dynamiques mot-à-mot (style Hormozi ou minimaliste).
  3. **Tiers Inférieur (Bas) :** Cartes et notifications UI (Stripe, WhatsApp, etc.).
* **Règle d'or de largeur :** La largeur de la carte UI doit être **égale ou inférieure** à la largeur du bloc de sous-titres, jamais plus large !
* **Fond des Shorts (Shorts Backdrop) :** Combiner systématiquement :
  * Dégradé radial subtil.
  * Grille vectorielle en pointillés fins (*Grid Lines*).
  * Trame de matière *Halftone* (opacité 15-20%).
  * Éléments d'ambiance floutés aux coins opposés pour habiller les zones mortes.

---

## 🧩 10. Déconstruction des Calques (Assets + Effects + Animation)
Tout habillage vidéo professionnel se compose de 3 couches chronologiques :
1. **Couche Assets :** Fichiers bruts (texte SVG, mockup téléphone PNG détouré, icônes).
2. **Couche Effects :** Flou d'arrière-plan, ombre portée 3D (`box-shadow: 0 20px 40px rgba(...)`), lueur interne.
3. **Couche Animation :** Transition d'entrée GSAP (`scale: 0.9 -> 1`, `opacity: 0 -> 1`, `ease: "power3.inOut"`), suivi d'un léger flottement (*idle float*).

---

## 🎬 11. Rythme de Réalisation : Règle Anti-PowerPoint & Enchaînement Immédiat
* **Une vidéo n'est JAMAIS un diaporama statique :** L'attention d'un spectateur moderne s'effondre au bout de 2 à 3 secondes d'immobilité.
* **Coupure dès fin d'animation :** Dès que la dernière animation ou action explicative d'une scène se termine, la scène **COUPE et enchaîne immédiatement sur la scène suivante**. Ne jamais laisser une scène stagner passivement en attendant la fin d'un timer arbitraire.
* **Scène longue = Volonté pédagogique explicite :** Une scène ne doit durer plus de 10 secondes QUE si elle sert à décomposer pas-à-pas un mécanisme ou un raisonnement complexe en plusieurs étapes interactives.
* **Découpage asservi au Script :** Le nombre de scènes n'est jamais réduit artificiellement. C'est le flux du texte et la densité des idées qui commandent le découpage (en moyenne 1 changement de visuel ou d'angle toutes les 3 à 5 secondes).

---

## 🎯 12. Synchronisation Script-to-Screen (Illustration Immédiate du Mot Dit)
* **Illustration au mot près :** Dès qu'un mot ou concept est évoqué par le script (lieu, personne, chiffre, pièce mécanique, alarme, document, courriel, logo), il doit être **instantanément illustré à la seconde exacte** à l'écran :
  * Un chiffre $\rightarrow$ Compteur tabulaire géant animé ou Hero Stat.
  * Un lieu $\rightarrow$ Carte radar ou vue satellite vectorielle.
  * Une citation $\rightarrow$ Fiche verbatim avec guillemets et tampon officiel.
  * Une pièce ou incident $\rightarrow$ Schéma 2D en écorché, vue technique ou reconstitution 3D.
  * Une révélation de presse $\rightarrow$ Article avec coup de surligneur jaune Vox.
* **Interdiction des tunnels vides :** Aucun temps mort où la voix parle sans support graphique direct lié au propos.

---

## 📈 13. Physique des Animations d'Apparition : La Courbe en S (Slow-Fast-Slow)
* **Bannir les animations paresseuses :** Interdiction des simples fondus d'opacité (`fade-in`) ou des simples translations linéaires ennuyeuses.
* **La Courbe Signature (Départ lent $\rightarrow$ Accélération $\rightarrow$ Arrivée lente) :**
  * Toute apparition de composant doit suivre une courbe sigmoïde avec amorti velouté :
    ```javascript
    // Formule GSAP standard pour les entrées de composants et textes
    gsap.from(element, {
        y: 60,
        scale: 0.92,
        opacity: 0,
        duration: 1.2,
        ease: "power3.inOut" // Départ doux -> accélération centrale -> atterrissage feutré
    });
    ```
* **Richesse et Variété permanente :**
  * Alterner systématiquement entre :
    1. *Kinetic S-Curve* (Translation Y + Scale dynamique).
    2. *Masked Stagger Reveal* (Découpe d'overflow avec apparition mot-par-mot).
    3. *Blur-to-Focus Converge* (Flou gaussien qui se nettit à l'arrivée).
    4. *3D Spatial Flip-In* (Perspective 3D `rotateX` ou `rotateY`).
    5. *Kinetic Letter-Spacing* (Expansion puis resserrement des caractères).
    6. *Diagonal Clip-Path Reveal* (Volet tranchant en biseau).

---

## ⏱️ 14. Architecture Technique Vidéo & Studio Player (Règle de la Timeline Unique et Déterministe)
Pour garantir une lecture fluide (sans blocage à la lecture ni textes figés) et un scrubbing bidirectionnel instantané dans le Studio et lors du rendu vidéo :

1. **Règle Absolue : Zéro sous-timeline orpheline ou dynamique :**
   * **INTERDICTION FORMELLE** d'instancier des `const subTl = gsap.timeline()` non rattachées ou dynamiques à l'intérieur de fonctions `onUpdate`, `updateStepForTime` ou `step.play()`.
   * **TOUS les tweens** (entrées, boucles, sorties, caméras) doivent être attachés **directement à la timeline maîtresse `window.tl`** à leur timestamp absolu précis :
     ```javascript
     // OBLIGATOIRE : Rattachement direct sur window.tl au timestamp exact
     tl.from('#element', { y: 60, opacity: 0, duration: 1.2, ease: 'power3.inOut' }, 4.0);
     ```

2. **Déterminisme Absolu (Scrub & Seek-Safe) :**
   * L'appel `tl.seek(t)` doit être capable de reconstruire l'état visuel exact de la vidéo à la milliseconde près, en marche avant comme en marche arrière.
   * Les animations en boucle (`idle`) ne doivent pas être des boucles infinies non synchronisées : elles doivent être découpées en cycles déterministes sur la durée d'apparition de la scène (ex: 2 cycles de 2.5s pour une scène de 5s).

3. **Dégel du Ticker GSAP lors du Play (Contrat Studio Player) :**
   * En mode pause ou lors du scrubbing, le Studio gèle le ticker global GSAP (`gsap.globalTimeline.pause()`).
   * Tout objet `window.__timeline` doit défensivement réveiller le Ticker GSAP lors de l'appel à `.play()` :
     ```javascript
     window.__timeline = {
         duration: () => DURATION,
         seek: (t, isUserSeeking = false) => {
             updateHUDForTime(t);
             tl.seek(t, false);
             if (isUserSeeking && typeof window.syncAudioTimeline === 'function') {
                 window.syncAudioTimeline(t, false);
             }
         },
         pause: () => {
             tl.pause();
             if (typeof window.syncAudioTimeline === 'function') {
                 window.syncAudioTimeline(tl.time(), false);
             }
         },
         play: () => {
             // Réveil obligatoire de la timeline globale GSAP
             if (typeof gsap !== 'undefined' && gsap.globalTimeline && gsap.globalTimeline.paused()) {
                 gsap.globalTimeline.resume();
             }
             tl.play();
             if (typeof window.syncAudioTimeline === 'function') {
                 window.syncAudioTimeline(tl.time(), true);
             }
         }
     };
     ```

4. **Isolation DOM des scènes et slides :**
   * Chaque scène ou template d'animation possède son propre conteneur DOM dédié (`display: none; opacity: 0;`).
   * Le cycle de vie est piloté exclusivement par la timeline maîtresse :
     ```javascript
     tl.set('#demo_1', { display: 'flex', opacity: 1 }, 4.0);
     // ... tweens de la scène 1 ...
     tl.set('#demo_1', { display: 'none', opacity: 0 }, 9.0);
     ```

---

## 📁 Composants associés dans le projet
* Bibliothèque d'Animations de Textes (Entrées, Sorties, Boucles) : `02_Composants/Text animation/mes_animations_textes.html`
* Dual-Font Typography : `02_Composants/Text animation/dual_font_typography.html`
* Fond Texturé Shorts (Grille + Halftone) : `02_Composants/Background/short_textured_backdrop.html`
* Split-Screen Horizontal avec flou : `02_Composants/Split_Screen/horizontal_side_by_side.html`
* Empilement Vertical Sous-titre + UI : `02_Composants/Callouts_Badges/vertical_subtitle_ui_stack.html`
* Suite de Notifications Vidéo : `02_Composants/Callouts_Badges/shadcn_notification_toast.html`

---

## 🗞️ 15. Direction Artistique Documentaire Vox Explainer (Grammaire Papier & Contraste Élevé)
Inspiré des standards d'animation et de journalisme visuel Vox (*Vox Earworm*, *Borders*, *Explained*) :

1. **Le Fond Papier Vélin Lumineux (Beige clair virant au Blanc, JAMAIS de marron lourd) :**
   * **Fond obligatoire :** Papier vélin chaud ultra-lumineux (`#faf8f5` à `#f5f2eb`) avec grain papier subtil ou trame de presse légère (`opacity: 0.035`).
   * **Interdiction absolue des fonds marron chocolat, sépia lourd ou terreux sombre** qui assombrissent, alourdissent et ruinent la lisibilité.
   * **Contraste maximal :** Encre noir intense (`#111110`) et gris charbon chaud (`#26201b`) sur fond clair.

2. **La Palette d'Accentuation Documentaire Vox :**
   * **Jaune Surligneur Vox (`#ffe600` / `#fef08a`) :** Coup de marqueur fluide balayant les phrases clés d'un document ou d'une dépêche (`background-size: 0% 100% -> 100% 100%`).
   * **Rouge d'Impact & Tampons d'Archive (`#dc2626` / `#b91c1c`) :** Réservé aux ruptures historiques, déclarations, cibles militaires et tampons officiels (*TOP SECRET, DÉCRET, INVASION*).
   * **Bleu Diplomatique / Encre d'Archive (`#1d4ed8` / `#1e3a8a`) :** Pour les traités, citations solennelles et contre-offensives.

3. **Stickers Découpage Papier Blanc (`.vox-paper-cutout`) :**
   * Personnages historiques (Hitler, Churchill, De Gaulle, Staline), décorations, objets ou symboles détourés entourés d'une **bordure blanche physique façon papier découpé aux ciseaux** (`border: 4px solid #ffffff` ou `filter: drop-shadow(0 0 0 4px #ffffff) drop-shadow(0 10px 20px rgba(0,0,0,0.22))`).
   * Donnent l'impression d'éléments réels découpés dans un magazine ou une archive papier et posés sur la table d'animation.
   * Associés systématiquement à l'effet pendule de balancement doux.

4. **Bannissement Formel du Remplissage Parasite (Interdiction des Drapeaux Systématiques) :**
   * **INTERDICTION FORMELLE** d'insérer des rangées automatiques de drapeaux ou de badges génériques en bas de chaque écran sans justification narrative.
   * Un drapeau n'apparaît **QUE** si le propos évoque explicitement une nationalité, un changement d'allégeance ou une victoire symbolique (ex: drapeau rouge sur le Reichstag, signature d'un traité bilatéral).
   * Zéro encombrement visuel : chaque élément à l'écran doit porter une information indispensable.

---

## 🎭 16. Les Formats Visuels Vox Explainer (Image + Illustration + B-Roll Vidéo)
La mise en scène ne doit **JAMAIS** être un carrousel de slides ou de pavés textuels. Le montage Vox repose sur l'alternance rythmée de formats visuels riches :

1. **Ken Burns Plein Écran (Full Screen Archive) :**
   * Photographie d'archive en plein écran (1920x1080) avec animation continue de zoom lent (in 1.0 -> 1.10 ou out 1.12 -> 1.0) et dérive panoramique (pan), recouverte d'un grain vintage léger. Brise la monotonie des simples vignettes.
2. **B-Roll Vidéo Pur d'Archives / Cinéma (Sans Texte) :**
   * Extraits vidéo réels (avions bombardiers, chars en mouvement, défilés, ruines urbaines) intégrés en haute fluidité (60 FPS) via `yt-dlp` ou les banques intégrées (Coverr / Pixabay). Obligation d'inclure des séquences vidéo réelles dans tout documentaire historique.
3. **Sticker Papier Découpé & Effet Pendule (Personnage / Objet) :**
   * Illustration ou archive d'un personnage/objet détouré sur fond vert, entouré d'une bordure blanche papier (`.vox-paper-cutout`), suspendu par le haut et oscillant comme une cloche.
4. **Scène Carte Tactique 2D Animée :**
   * Cartographie d'état-major minimaliste sur papier vélin clair.
   * Flèches vectorielles d'assaut traçant en direct (`strokeDashoffset`), tenaille d'encerclement, lignes de front animées et cibles radar pulsantes.
5. **Scène Chiffre Clé Monumental & Échelle :**
   * Compteur tabulaire géant au centre de l'écran (ex: `8 000 000`, `300 000`) qui s'incrémente en direct, accompagné d'une jauge ou d'une phrase d'échelle concrète.
6. **Scène Document d'Archive Découpé & Surligné :**
   * Télétype, décret militaire ou coupure de presse d'époque avec scotch ou trombones.
   * Animation en direct du surligneur jaune Vox balayant la ligne au mot dit.
   * Tampon rouge claquant avec rebond élastique (`back.out(2)`).
7. **Règle de Brièveté Textuelle Absolue (Anti-Slide) :**
   * Le texte ne raconte JAMAIS l'histoire à la place de l'image. Il sert exclusivement de repère ponctuel (une date : `1ER SEPTEMBRE 1939`, un nom : `WINSTON CHURCHILL`, un titre choc : `DÉBÂCLE ÉCLAIR`). Jamais de pavés de phrases de 3 lignes !

---

## ⚡ 17. Physique, Cadence & Continuité Temporelle Vox
* **Compréhension Naturelle (Script Étoffé ou Animations Douces, Zéro Trou de Voix) :**
  * **Ne JAMAIS sacrifier la compréhension au détriment de la durée**, et **ne JAMAIS découper la voix off en trous artificiels** (ce qui casse le naturel et désynchronise le montage). Pour laisser au spectateur le temps d'assimiler : soit **allonger et enrichir le texte du script** dès la rédaction pour un débit naturel plus respiré, soit **épurer et adoucir les animations** avec moins d'éléments simultanés à l'écran.
  * **Audio Maîtrisé (Musique Adaptée & SFX Discrets)** : Choisir et télécharger une vraie musique adaptée au thème (`fetch_music.cjs --query "..."`, jamais toujours la même piste ni de synthèse bâclée) et maintenir les SFX très discrets sous la voix (`build_soundtrack.cjs`, `impact <= -30 dBFS`, `whoosh <= -33 dBFS`, `ui <= -36 dBFS`).
* **Continuité Temporelle Absolue (Zéro Écran Blanc ni Trou Temporel) :**
  * Le premier plan doit être visible dès **t = 0.00s pile**. Ne jamais démarrer à 0.5s ou 1.0s en laissant un écran vide.
  * Aucun trou temporel entre les plans : `shotsData[i].start = shotsData[i-1].end`.
  * La transition sortante d'un plan et l'arrivée du suivant se chevauchent de manière continue pour qu'à aucun millième de seconde l'écran ne devienne un fond blanc désert.
* **Concordance Parole / Image & Fidélité Chronologique :**
  * Si la voix cite Hitler, on montre Hitler ; dès qu'elle cite Pétain, on coupe vers Pétain.
  * **Âge & Époque Exacte obligatoires** : Lorsque le récit évoque la jeunesse, les débuts ou une date précise d'une personnalité (ex: *Elon Musk jeune / en 2008*), sourcer impérativement une **archive fidèle à cette date exacte** plutôt qu'un portrait moderne anachronique.
* **L'Effet Pendule Continu (*Pendulum Bell Sway*) :**
  * Les cartes, stickers et tirages photos sont ancrés en haut (`transform-origin: 50% 0%`) et oscillent continuellement (`rotate: -1.8deg <-> +1.8deg`, durée: 1.8s, `yoyo: true, repeat: -1`, avec flottement vertical `y: -4px <-> +4px`).
* **Logos Clés en Grand, Illustration Totale des Marques Citées, Card `cover` (`overflow: hidden`) & Carte SVG Sans Saccade :**
  * **Toujours illustrer les marques citées :** Dès que le script ou la voix nomme une entreprise/marque (ex: *eBay, PayPal, Compaq, NASA*), télécharger impérativement son logo officiel (`brandfetch.cjs`) et l'afficher en **grande taille lisible** ; si le logo n'existe pas ou si la mise en scène s'y oppose, assumer un design typographique éditorial propre (jamais de mention ignorée ou de logo bricolé).
  * **Aucune image coupée ni débordante dans sa card :** Tout portrait logé dans une card éditoriale doit être enfant direct de `.card { overflow: hidden; }` en `width: 100%; height: 100%; object-fit: cover;` avec zoom (`scale >= 1.05`), pour supprimer tout bord blanc/coupé latéral sans jamais sortir du cadre.
  * **Cartes animées fluides & tracés sans dérive :** Ne jamais appliquer `vector-effect: non-scaling-stroke` sur des centaines de polygones zoomés (pré-rastériser la carte de fond sur `<canvas>` 2× et ne garder que tracés + pins dans un `<svg>` léger au-dessus avec `ease: 'sine.out'`). Partager les exactes coordonnées `(cx, cy)` entre `<path>` et `<circle>`, dessiner les pins après le `<path>`, et répéter `svgOrigin` dans `fromVars` ET `toVars` de `fromTo()`.
  * **Fluidité vidéo CapCut (`<video>`) :** Jamais de filtre SVG plein écran (`filter: url(#...)`) ni `mix-blend-mode` sur `<video>`, garder les scènes cachées via `visibility: hidden` (pas `display: none`) et ré-encoder avec `-bf 0 -tune fastdecode -g 15 -movflags +faststart`.
  * **Hiérarchie Workflow / Écosystème :** Dans toute scène centrée sur un logo ou un hub produit, **afficher le logo/hub central EN PREMIER** (cœur du sujet), puis animer les connexions et les éléments périphériques **un par un** en cascade.
  * **Vérification du contraste WCAG :** Toujours passer la composition dans `node 07_Scripts/check-contrast.cjs <fichier.html>` avant livraison pour garantir un contraste lisible sur chaque scène.

---

## 📋 18. Système Obligatoire de Feuille de Route IA (Roadmap Unique & Pré-Validation)
Pour toute création de vidéo dans l'application MarvidFlow :

1. **Génération Systématique de la Feuille de Route :**
   * Dès que l'utilisateur clique sur « Créer la vidéo », l'IA génère impérativement une feuille de route détaillée dans le **fichier unique racine `feuille_de_route.md`**.
   * Cette feuille de route contient : le découpage précis plan par plan (3-5s), les formats visuels alternés, les B-rolls vidéo réels requis, et les **prompts d'images sur fond vert avec contour papier blanc découpé** pour génération dans Flow / Midjourney.
2. **Interface & Grand Modal d'Édition :**
   * En dessous du bouton « Créer », un bouton large passe en chargement (`⏳ Génération...`), puis s'active et s'illumine (`📄 Voir / Valider la Feuille de Route`).
   * Au clic, le Grand Modal affiche le contenu intégral éditable dans un textarea pour permettre à l'utilisateur de modifier librement le plan avant toute production.
3. **Contrat de Vidage du Fichier Unique :**
   * Il n'existe qu'un seul fichier `feuille_de_route.md`.
   * Dès que l'utilisateur clique sur **« Valider et Lancer la Production 🚀 »**, les modifications sont prises en compte et le fichier `feuille_de_route.md` est **immédiatement vidé / réinitialisé** afin d'être vierge et prêt pour la création suivante.



