---
name: design_composition
description: Psychologie et règles de composition vidéo pour VibeEditor — zones sûres 16:9/9:16/1:1, placement des textes et sous-titres, hiérarchie typographique, couleurs 60/30/10, split screens, couches de profondeur, point focal, lisibilité mobile, avec CSS responsive par format et pièges SVG/vidéo en rendu headless.
---

# DESIGN & COMPOSITION — VibeEditor

## 1. Principe central
Une scène = **une idée = un point focal = une hiérarchie à 3 niveaux**. Si le spectateur doit choisir où regarder, la scène est ratée. Le spectateur regarde sur un téléphone, parfois en plein soleil, souvent sans le son : la lisibilité prime sur l'esthétique.

Ordre d'attraction de l'œil (du plus fort au plus faible) : mouvement > visage/regard > contraste de luminosité > couleur saturée > grande taille > position haut-gauche. Ne mettre en mouvement QUE ce qui doit être lu.

### 🚫 RÈGLE ABSOLUE DE NON-CHEVAUCHEMENT (ZERO-COLLISION LAYOUT)
> **AUCUN ÉLÉMENT VISUEL NE DOIT JAMAIS SE CHEVAUCHER ACCIDENTELLEMENT DANS UNE VIDÉO.**
>
> 1. **Zéro collision involontaire** : Un texte, un titre, un sous-titre, un badge, une image, un modèle 3D Three.js, une carte Bento ou un bouton CTA ne doivent **JAMAIS se superposer ni se couper mutuellement**.
> 2. **Zone de Respiration Obligatoire (Safe Air Gap)** : Entre deux éléments verticaux ou horizontaux (ex: titre et modèle 3D, ou carte bento et sous-titres), un espace libre minimal de **32px à 48px** doit toujours être garanti.
> 3. **Architecture par Slots Indépendants** :
>    - Découper la scène en conteneurs Flexbox ou Grid structurels distincts.
>    - Si des éléments utilisent `position: absolute`, leurs boîtes englobantes (`bounding boxes`) et coordonnées doivent être strictement calibrées pour que leurs surfaces visibles ne se croisent **jamais** aux mêmes timestamps $t$.
> 4. **Seule Exception Autorisée** : Une superposition stylistique **pleinement assumée, délibérée et maîtrisée** (ex: texte d'arrière-plan géant semi-transparent derrière un sujet détouré en parallax, ou contenu imbriqué à l'intérieur même d'une Bento card dédiée). En dehors de ce cas spécifique, le chevauchement est considéré comme un défaut de conception critique.


## 2. Canvas, unité et zones sûres

### 📐 RÈGLE DU PADDING CADRE STANDARDISÉ (MARGES LATÉRALES & VERTICALES HARMONISÉES)
Les éléments de contenu ne doivent jamais coller aux bords de l'écran. Un cadre de sécurité permanent (`viewport frame`) verrouille les marges de façon symétrique et prévisible :

| Format | Résolution | Marge Latérale (Gauche / Droite) | Marge Verticale (Haut / Bas) | Padding Cadre Conteneur (`#viewport` ou `.content-frame`) |
| :--- | :--- | :--- | :--- | :--- |
| **16:9 Paysage** | 1920 × 1080 px | **80 px** (identique gauche & droite) | **60 px** (haut) / **70 px** (bas) | `padding: 60px 80px 70px 80px;` |
| **9:16 Vertical** | 1080 × 1920 px | **80 px** (identique gauche & droite) | **140 px** (haut UI) / **180 px** (bas UI) | `padding: 140px 80px 180px 80px;` |
| **1:1 Carré** | 1080 × 1080 px | **80 px** (identique gauche & droite) | **80 px** (haut & bas symétrique) | `padding: 80px;` |

> 💡 **Principe fondamental :** La marge latérale de **80px** est rigoureusement identique entre le format 16:9 et le format 9:16, assurant une largeur de respiration et un alignement latéral parfaitement homogène sur toutes les productions.
> En 9:16, les marges supérieure (140px) et inférieure (180px) protègent impérativement le contenu des surimpressions d'interface des applications mobiles (nom du créateur, recherche en haut, description, boutons like/partage et barre de scrub en bas).

Le canvas est fixe en pixels (jamais `vh/vw`, jamais `position:fixed`). On définit une unité `--u` = 1 % du petit côté (1080 px) : les tailles en `u` restent cohérentes entre formats.

```css
html[data-format="16x9"]{--W:1920px;--H:1080px;--u:10.8px;
  --safe-t:calc(var(--u)*5);--safe-b:calc(var(--u)*6);--safe-l:calc(var(--u)*9);--safe-r:calc(var(--u)*9);
  --title:calc(var(--u)*8);--sub:calc(var(--u)*5);--min:calc(var(--u)*2.8)}
html[data-format="9x16"]{--W:1080px;--H:1920px;--u:10.8px;
  --safe-t:calc(var(--u)*20);--safe-b:calc(var(--u)*40);--safe-l:calc(var(--u)*6);--safe-r:calc(var(--u)*13);
  --title:calc(var(--u)*9);--sub:calc(var(--u)*6.5);--min:calc(var(--u)*3.4)}
html[data-format="1x1"]{--W:1080px;--H:1080px;--u:10.8px;
  --safe-t:calc(var(--u)*6);--safe-b:calc(var(--u)*8);--safe-l:calc(var(--u)*7);--safe-r:calc(var(--u)*7);
  --title:calc(var(--u)*8);--sub:calc(var(--u)*5.5);--min:calc(var(--u)*3)}
html,body{margin:0;width:var(--W);height:var(--H);overflow:hidden;background:#000}
#stage{position:relative;width:var(--W);height:var(--H);overflow:hidden;background:var(--bg)}
.layer{position:absolute;inset:0}
.safe{position:absolute;top:var(--safe-t);bottom:var(--safe-b);left:var(--safe-l);right:var(--safe-r)}
```
**9:16** : les 20 % du haut (nom de compte, recherche) et les 22 % du bas (légende, boutons, barre) sont occupés par l'interface ; la colonne de droite (13 u ≈ 140 px) porte like/commentaire/partage. Rien d'important là.
**16:9** : respecter 5 % de marge (action safe) ; les sous-titres ne descendent jamais sous `--safe-b`.

## 3. Hiérarchie typographique
- **Niveau 1** : titre / mot-choc — `--title`, graisse 800–900, 1–6 mots.
- **Niveau 2** : sous-titre / info clé — `--sub`, graisse 600–700.
- **Niveau 3** : légende, source, date — jamais sous `--min` (illisible sur mobile).
- Ratio entre niveaux ≥ 1.5. Deux familles maximum (1 display + 1 texte). Interlignage titres 1.0–1.1, texte 1.25–1.4.
- Longueur de ligne : 9:16 → 18–26 caractères ; 16:9 → 32–42. 2 lignes maximum pour les sous-titres.
- Alignement : centré pour le hook et les mots-chocs ; aligné à gauche pour tout texte de lecture (listes, définitions).
- Contraste texte/fond ≥ 4.5:1 (≥ 7:1 pour les petites tailles). Texte sur image → toujours un scrim ou un contour, jamais « nu ».
```css
.scrim-b{background:linear-gradient(to top,rgba(0,0,0,.7),rgba(0,0,0,0) 55%)}
.t-stroke{-webkit-text-stroke:calc(var(--u)*.6) #000;paint-order:stroke fill}
.t-box{background:rgba(0,0,0,.55);border-radius:calc(var(--u)*1.4);padding:calc(var(--u)*.5) calc(var(--u)*1.4)}
```

## 4. Position des sous-titres
| Format | Zone | Détail |
|---|---|---|
| 9:16 | centre-bas, à ~60–66 % de la hauteur | au-dessus de la zone UI du bas, sous le visage du sujet. `top:60%` dans `.safe` |
| 16:9 | bas, ~10 u au-dessus du bord | `bottom:calc(var(--safe-b) + var(--u)*3)` |
| Si le sujet occupe cette zone | remonter à 50 % (9:16) ou passer en haut (16:9) | ne jamais couvrir une bouche ou un chiffre clé |
Un seul système de texte « parlé » à l'écran à la fois : si un titre apparaît, les sous-titres se déplacent ou se coupent.

## 5. Couleur
- **60 / 30 / 10** : 60 % neutre (fond), 30 % secondaire (cartes, surfaces), 10 % accent (mots-clés, chiffres, soulignements).
- Fond sombre : `#0B0B0F` ou `#101114`, pas du noir pur ; texte `#F5F5F7`, pas du blanc pur (fatigue + halos).
- UNE couleur d'accent par vidéo. Sémantique : rouge = danger/perte/urgence, vert = gain/validation, jaune/orange = attention, bleu = confiance/tech, violet = premium/IA.
- Chaînes finance : vert/or sur sombre. Docu : désaturé + 1 accent chaud. Tech/IA : sombre + néon cyan/violet. Shorts viraux : jaune vif + noir + blanc, saturation haute.
- Reproduire les couleurs de marque via `brandfetch.cjs` pour toute scène qui parle d'une entreprise.
- Contrer le soleil / les petits écrans : contraste franc, pas de gris sur gris, pas de fines polices claires.

### 5.1 Règles de Contraste Absolu & Lisibilité des Logos et Cartes
1. **Contraste Logos & Éléments Graphiques (Zéro Noir sur Sombre)** :
   - Vérifier impérativement le `fill` et les couleurs internes de tout logo SVG ou PNG.
   - **INTERDICTION FORMELLE** d'afficher un logo sombre/noir (ex: texte noir de NVIDIA, Apple noir, etc.) sur un fond ou une carte sombre (gris foncé, bleu nuit, noir).
   - Si le fond de la carte est sombre, le logo doit être clair/blanc (`filter: brightness(0) invert(1)` ou SVG adapté), OU la surface sous le logo doit être un réceptacle clair/blanc à haut contraste.
   - Si le fond de la vidéo est clair, le logo doit être sombre.
   - Ratio de contraste minimal : 4.5:1 pour le texte courant, 7:1 pour les logos et titrages clés.

2. **Illustration Systématique des Marques Évoquées, Taille Héroïque & Fallback Assumé (Règle Vidéo Générale)** :
   - **Tout nom de marque cité par le script/voix DOIT être illustré** : télécharger son logo officiel via `07_Scripts/brandfetch.cjs` (ex: *eBay, PayPal, Compaq, NASA*) et l'afficher **en grand et bien lisible** (`height: 44px–140px` / `width: 180px–450px`) afin que le spectateur l'identifie instantanément sans se demander *« c'est qui ? »*.
   - **Si logo indisponible ou incompatible avec le design** : utiliser un traitement éditorial typographique propre et assumé (texte seul stylisé) — **jamais** de logo dessiné/bricolé à la main ni de miniature timide `24px–32px`.

3. **Contention Stricte & Cadrage sans Tranches Coupées des Portraits en Card (`overflow: hidden`)** :
   - Lorsqu'un portrait ou visuel est présenté dans une card éditoriale, placer `<img ...>` **à l'intérieur DOM** de `.card { overflow: hidden; }` en **`width: 100%; height: 100%; object-fit: cover; object-position: center 14%;`** avec zoom léger (`scale: 1.05 -> 1.12`) : cela remplit toute la largeur du cadre (zéro tranche verticale de découpe visible sur les côtés) sans jamais dépasser les bordures.

3. **Design Lisse des Cartes (Zéro Bordure Colorée Artificielle)** :
   - Les cartes doivent être lisses, sobres et élégantes.
   - **INTERDICTION FORMELLE** d'ajouter des liserés ou bordures en couleur vive sur un côté, en haut ou en bas (pas de bandeau néon supérieur, pas de `border-left: 4px solid var(--accent)`).
   - Les contours de cartes doivent être neutres et discrets : un fin trait gris clair subtil (`border: 1px solid rgba(255, 255, 255, 0.1)` ou gris clair neutre).

4. **Harmonie et Contraste selon le Type de Fond (Blanc, Noir, Dégradé, Couleur unie)** :
   - **Fond Blanc (`#ffffff`)** : titrages sombres (`#09090b`), sous-titres gris ardoise (`#475569`), cartes blanches surélevées (`#ffffff` avec fine ombre `0 10px 30px rgba(0,0,0,0.06)` et bordure `rgba(0,0,0,0.08)`). Logos clairs proscrits : logos sombres/colorés uniquement.
   - **Fond Noir (`#000000`)** : titrages blanc pur (`#ffffff`), cartes sombres lisses (`#0d1117`), bordure subtile (`rgba(255,255,255,0.12)`). Tout logo sombre doit avoir un réceptacle blanc.
   - **Fond Dégradé** : gradient radial ou linéaire subtil et profond (ex: `radial-gradient(ellipse at 50% 20%, #1e2029 0%, #08080c 100%)`). Garantir un contraste de 7:1 sur toute la zone de texte.
   - **Fond Couleur unie** : adapter dynamiquement la couleur du texte et des cartes selon la luminance (`isColorLight`). Ne jamais forcer du blanc sur un fond jaune ou du noir sur un fond marine.

5. **🚫 INTERDICTION FORMELLE DE DESSINER DES LOGOS OU ICÔNES (Obligation d'Assets Officiels)** :
   - **L'IA NE DOIT JAMAIS DESSINER, INVENTER OU APPROXIMER UN LOGO OU UNE ICÔNE EN CODE** (aucun bricolage SVG fait maison, aucune approximation vectorielle, aucun tracé manuel de logo ou icône).
   - **TOUS LES LOGOS** de marques/entreprises doivent être récupérés sous leur forme officielle via `node 07_Scripts/brandfetch.cjs <domaine>` (SVG vectoriel officiel ou PNG transparent HD) et stockés dans `01_Assets/Logos/`.
   - **TOUS LES DRAPEAUX** nationaux doivent être récupérés via `node 07_Scripts/fetch_flag.cjs <pays>` et stockés dans `01_Assets/Flags/`.
   - **TOUTES LES CARTES/LOCALISATIONS** doivent être générées via `node 07_Scripts/fetch_map.cjs` (Leaflet + capture Chrome headless) et stockées dans `01_Assets/Maps/`.
   - **TOUTES LES ICÔNES SYSTÈME/UI** (flèches, coches, symboles, pictogrammes) doivent provenir de bibliothèques officielles importées localement (Heroicons, Lucide, Phosphor, Material Icons, Feather) — **JAMAIS dessinées à la main en SVG**.
   - **SI LE TÉLÉCHARGEMENT/GÉNÉRATION EST IMPOSSIBLE** : l'IA doit **S'ARRÊTER IMMÉDIATEMENT** et demander à l'utilisateur de fournir l'asset officiel. Aucune alternative "dessiné par l'IA" n'est tolérée, aucune approximation n'est acceptable.

## 6. Composition d'une scène : les 5 couches
1. `bg` — fond (dégradé, vidéo B-roll, carte). Toujours en lent mouvement (`scale 1→1.06–1.10` sur la durée de la scène, ease `none`).
2. `mid` — sujet / média principal (image détourée, capture web, logo, drapeau).
3. `fg` — éléments de profondeur (particules, formes floues, bords) — très discrets.
4. `ui` — texte, cartes, badges.
5. `fx` — vignette, grain, lueur, aberration (dernière couche, `pointer-events:none`).

Règles :
- Règle des tiers pour le sujet ; le regard du sujet regarde vers l'intérieur du cadre, le texte se place du côté qu'il regarde.
- Un visage : yeux sur la ligne du tiers supérieur, texte jamais sur le visage.
- Marges vides (≥ 8 u) : l'espace négatif est un outil, pas un manque.
- Proximité (Gestalt) : un chiffre et son unité sont collés ; un titre et sa source ne le sont pas.
- Une image fixe n'existe pas : toujours un Ken Burns (scale + pan 3–6 %).
- Profondeur : bg légèrement flou/sombre, sujet net, texte au-dessus. Parallax : fond ×0.6 de la vitesse du sujet.
- Vignette `radial-gradient(transparent 55%, rgba(0,0,0,.45))` + grain très léger (PNG tuilé, opacité .05–.08) pour unifier les sources hétérogènes (stock + captures + logos).

```html
<div id="stage" data-scene="s03">
  <div class="layer bg"><video src="…" muted playsinline></video></div>
  <div class="layer scrim-b"></div>
  <div class="layer mid"></div>
  <div class="layer safe ui"><h1 class="t t1"></h1><p class="t t2"></p></div>
  <div class="layer fx vignette"></div>
</div>
```
```js
// mouvement de fond permanent (jamais de plan statique)
tl.fromTo('.bg',{scale:1},{scale:1.08,duration:sceneDur,ease:'none',transformOrigin:'50% 40%'},t0);
```

## 7. Split screens
| Besoin | Layout | Ratio |
|---|---|---|
| Comparer A vs B | 50/50 + badge VS | 1:1 |
| Sujet + preuve | 60/40 (preuve = plus petit) | 3:2 |
| Réaction / commentaire | média 70 % + PIP 30 % en coin | 7:3 |
| Avant/après | 1 cadre + wipe vertical animé | — |
| Liste de 3 choix | triptyque | 1:1:1 |
- 16:9 → colonnes ; **9:16 → lignes** (haut/bas). Le panneau principal en haut.
- Gouttière 1.2 u, coins arrondis 2.2 u, chaque panneau avec son propre scrim et son label (1–2 mots, haut-gauche).
- Entrée : panneaux en `clipPath` (`inset(0 100% 0 0)` → `inset(0)`) décalés de 0.12 s ; le badge VS arrive en dernier avec un `slam`.
```css
.split{position:absolute;inset:var(--safe-t) var(--safe-r) var(--safe-b) var(--safe-l);display:grid;gap:calc(var(--u)*1.2)}
html[data-format="16x9"] .split{grid-template-columns:1fr 1fr}
html[data-format="9x16"] .split{grid-template-rows:1fr 1fr}
.panel{position:relative;overflow:hidden;border-radius:calc(var(--u)*2.2)}
.panel>.media{position:absolute;inset:0;object-fit:cover;width:100%;height:100%}
.vs{position:absolute;left:50%;top:50%;translate:-50% -50%;font:900 calc(var(--u)*6)/1 var(--display);
    background:var(--accent);color:#000;border-radius:50%;width:calc(var(--u)*11);height:calc(var(--u)*11);display:grid;place-items:center}
```
```js
tl.fromTo('.panel',{clipPath:'inset(0 100% 0 0 round 24px)'},{clipPath:'inset(0 0% 0 0 round 24px)',duration:.6,stagger:.12,ease:'expo.out'},t)
  .fromTo('.vs',{scale:0},{scale:1,duration:.35,ease:'back.out(2.2)'},t+.45);
```

## 8. Composition par type de scène
- **Hook (0–3 s)** : plein cadre, 1 mot-choc géant au centre-haut (9:16 : à 35 % de hauteur), mouvement immédiat, contraste maximal, zéro décor.
- **Chiffre** : le nombre à 2× la taille de tout le reste, unité plus petite alignée sur la ligne de base, label niveau 3 dessous, fond sobre.
- **Citation / preuve** : capture de l'article (`record_web.cjs`) à 85 % de la largeur, ombre portée, mot clé surligné avec `highlight`.
- **Lieu** : carte (`fetch_map.cjs`) avec zoom progressif, drapeau (`fetch_flag.cjs`) dans le coin, nom du lieu en niveau 1.
  - **Styles de carte disponibles (tous sans watermark, gratuits) :**
    - `dark` (défaut) : CartoDB Dark Matter — ambiance cinématique sombre, tech, premium
    - `voyager` : CartoDB Voyager — élégant, moderne, lifestyle, voyage, tourisme
    - `light` : CartoDB Positron — minimaliste blanc, fond vidéo clair, data viz épurée
    - `satellite` : Esri World Imagery — vue satellite réelle HD, immobilier, urbanisme, environnement
    - `osm` : OpenStreetMap Standard — technique, brut, data, open source
  - **Format** : 16:9 (1920×1080) par défaut, ou 9:16 (1080×1920) avec `--format 9:16`
  - **Pin animé** : option `--pin` pour ajouter un repère lumineux pulsant au centre
- **Entreprise** : logo vectoriel (`brandfetch.cjs`) centré sur fond de sa couleur de marque assombrie.
- **Personne** : image détourée (`remove_bg.cjs`) à gauche/droite, nom + rôle en niveau 2/3 de l'autre côté.
- **Liste** : 3 items max à l'écran, révélés un par un, l'item courant à 100 % et les autres à 45 %.
- **Fin / CTA** : texte court, un seul bouton visuel, rien dans la zone UI du bas.

## 9. Pièges techniques → parades
| Piège | Parade |
|---|---|
| `getBBox()` = 0 ou NaN → division par zéro | Ne jamais mesurer un élément `display:none` ; utiliser `visibility:hidden` + opacité, ou `pathLength="1"` pour les tracés |
| Rotation SVG autour de (0,0) ou décalage pin/ligne | NE JAMAIS combiner `transform="translate(x,y)"` avec `svgOrigin:'0 0'` sur un élément SVG animé, ET toujours répéter `svgOrigin` dans `fromVars` ET `toVars` d'un `fromTo()` (`fromTo(el, { scale: 0, svgOrigin: 'x y' }, { scale: 1, svgOrigin: 'x y' })` — sinon GSAP cuit une translation `-R, -R` dans la matrice!). Partager les coordonnées exactes `(x,y)` entre `<path>` et `<circle>`, dessiner les pins après les tracés, et vérifier `distance < 1.0 px` dans Chromium |
| Portrait ou cutout qui sort de sa card ou montre ses bords coupés | Placer `<img>` à l'intérieur de la `.card` avec `overflow: hidden`, `width:100%; height:100%; object-fit:cover; object-position:center 14%;` et zoom `scale: 1.06 -> 1.12` |
| Tracé carte SVG qui saccade au démarrage pendant un zoom | Retirer `vector-effect: non-scaling-stroke` des polygones de fond, pré-rastériser la carte sur `<canvas>` 2× avec `will-change: transform`, isoler tracés + pins dans un petit `<svg>` léger au-dessus et animer le tracé en `ease: 'sine.out'` (sans caler `renderAt` en dessous de `0.35s`) |
| Texte qui déborde (titres longs, 9:16) | `fitText` ci-dessous, puis couper à 2 lignes |
| `display:none` / filtres SVG ou `mix-blend-mode` sur `<video>` → lag & stutter | Maintien permanent en mémoire GPU : `visibility:hidden; opacity:0; pointer-events:none` (jamais `display:none`) ; **INTERDICTION** d'appliquer un `filter: url(#...)` SVG plein écran ou `mix-blend-mode` au-dessus d'une balise `<video>` ; encoder en H.264 sans B-frames (`-bf 0 -tune fastdecode -g 15 -movflags +faststart`) et mettre en pause toute `<video>` hors de sa fenêtre `[data-start, data-end]` |
| Vidéos B-roll désynchronisées en rendu | Piloter `video.currentTime` depuis la timeline (`onUpdate`) et attendre `seeked` ; `muted playsinline preload="auto"` ; l'audio vient du mixage FFmpeg, jamais de la balise |
| `object-fit` oublié → étirement | `object-fit:cover` partout sauf logos (`contain`) |
| Images énormes → rendu lent | `sharp` : max 2× la taille d'affichage, WebP/PNG |
| `backdrop-filter` en grand → lent | Limiter à 1–2 éléments ; sinon fond semi-opaque |
| Unités `vh/vw` ou `100%` de la fenêtre | Le canvas est fixe : tailles en `u` |
| Police absente au rendu | Inclure les polices en local (`@font-face`, fichiers dans `01_Assets`), `await document.fonts.ready` |
| Ombres/halos coupés | `overflow:visible` sur le parent animé ou marge interne |
```js
function fitText(el,maxW,maxH,{min=24,max=400}={}){
  let lo=min,hi=max; while(hi-lo>1){const m=(lo+hi)>>1; el.style.fontSize=m+'px';
    (el.scrollWidth<=maxW&&el.scrollHeight<=maxH)?lo=m:hi=m}
  el.style.fontSize=lo+'px';
}
```
(à appeler APRÈS `document.fonts.ready`, avant la construction de la timeline).

## 10. Psychologie : règles de décision
- **Contraste d'échelle** : l'important est 2–3× plus grand que le reste. Si tout est gros, rien n'est gros.
- **Rythme visuel** : ne jamais répéter le même layout 3 fois d'affilée (alterner plein cadre → split → carte → texte).
- **Densité** : > 12 mots à l'écran hors sous-titres = trop. Couper ou séparer en deux scènes.
- **Direction** : mouvement de gauche à droite = progression/futur ; droite à gauche = retour/passé ; montée = gain ; descente = perte. Aligner le mouvement avec le sens du récit.
- **Anticipation** : un léger mouvement inverse (3–5 %) avant tout mouvement important rend l'animation « physique ».
- **Cohérence** : mêmes marges, mêmes rayons, mêmes ombres, même accent dans toute la vidéo ; définir des variables CSS (`--accent`, `--bg`, `--ink`, `--radius`, `--display`) en tête de page.
- **Moins, mais mieux** : retirer un élément à chaque scène avant de valider.

## 11. Court vs long
| | Short 9:16 | Long 16:9 |
|---|---|---|
| Textes | gros, 1–4 mots, centrés | plus petits, hiérarchie riche |
| Sous-titres | permanents, karaoké, 2–3 mots | optionnels ou 2 lignes |
| Densité | 1 info / 1.5–3 s | 1 info / 4–8 s |
| Fond | saturé, mouvement fort | plus sobre, profondeur |
| Cadrage | sujet centré, plein cadre | règle des tiers, plus d'air |

## 12. Checklist avant rendu
- [ ] `data-format` posé sur `<html>` et variables `--u` utilisées partout.
- [ ] Rien d'important dans les zones UI (haut 20 %, bas 22 %, droite 13 u en 9:16).
- [ ] Un point focal par scène, niveau 1 ≥ 2× le niveau 3.
- [ ] Contraste vérifié (scrim/contour sur toute image).
- [ ] Aucun plan statique (zoom/pan permanent).
- [ ] Polices locales chargées, `fitText` appliqué aux titres variables.
- [ ] Aucun layout identique 3 fois de suite.
- [ ] Grilles de cartes (3 cards) rigoureusement centrées (`margin: 0 auto; justify-content: center;`).
- [ ] Scènes symétriques ou audio/voix : centrage horizontal absolu de TOUS les éléments (titre, badge, sous-titres avec `text-align: center; margin: 0 auto; align-self: center;`).
- [ ] Gradient text mot par mot : styles `-webkit-background-clip: text` appliqués aussi sur les inners (`.gradient, .gradient .w-inner`) pour éviter le texte transparent.
- [ ] Pas de slide/fondu répétitif : transitions alternées (3D tilt, masked wipe, blur snap, radial wipe).
- [ ] Tracés de courbes avec curseur synchronisé sub-pixel via `path.getPointAtLength()` (zéro saut de point).


---

## 13. Le Design System Vidéo Universel (Agnostique en Couleurs & Typographies)

Le but d'un Design System vidéo n'est pas d'imposer des couleurs ou des polices figées (chaque vidéo a son identité de marque ou son univers thématique propre), mais de garantir **des règles structurelles, d'espacement, d'échelle et de lisibilité qui assurent une cohérence parfaite et constante d'un bout à l'autre de la vidéo**.

### 13.1 Architecture en 3 Slots Verticaux Étanches (Slot Layout)
Pour empêcher tout chevauchement, chaque écran de vidéo est articulé autour de 3 zones fonctionnelles étanches :

```
┌────────────────────────────────────────────────────────┐
│  SLOT 1 : HEADER / ACCROCHE (20-25% hauteur)          │
│  [Badge thématique] + [Titre Principal / Hook choc]    │
├────────────────────────────────────────────────────────┤
│  SLOT 2 : HERO VISUEL / STAGE CENTRAL (50-55% hauteur) │
│  Modèle 3D Three.js / Image / Bento Card / Graphique    │
│  (Espace réservé garanti — aucun texte ne traverse)    │
├────────────────────────────────────────────────────────┤
│  SLOT 3 : CALLOUT & CALL TO ACTION (20-25% hauteur)    │
│  Sous-titre dynamique karaoké / Métrique / Bouton CTA  │
└────────────────────────────────────────────────────────┘
```

1. **Le Slot 1 (Haut)** ne descend jamais sous 25% de la hauteur totale.
2. **Le Slot 2 (Centre)** est centré géométriquement et dimensionné pour ne jamais empiéter sur le Slot 1 ni sur le Slot 3.
3. **Le Slot 3 (Bas)** est ancré dans la zone sécurisée inférieure.

### 13.2 Échelle d'Espacement Modulaire (Spacing Scale basée sur 8px)
Ne jamais utiliser de valeurs de marges ou de padding au hasard. Utiliser exclusivement l'échelle d'espacement standardisée :

- `gap-xs` = **8px** : Espace micro (entre icône et texte d'un badge).
- `gap-sm` = **16px** : Padding interne des badges, espace entre deux petits textes liés.
- `gap-md` = **24px** : Padding interne des cartes légères, marge entre titre et sous-titre immédiat.
- `gap-lg` = **32px** : Gouttière entre 2 cartes d'une grille Bento, séparation de blocs fonctionnels.
- `gap-xl` = **48px à 64px** : Respiration majeure entre le Header (Slot 1) et le Hero Visuel (Slot 2).
- `frame-margin` = **80px** : Marge extérieure standardisée du cadre de la vidéo (identique en 16:9 et 9:16).

### 13.3 Échelle Typographique Modulaire (Typographic Hierarchy Scale)
Sans imposer de police spécifique, toute vidéo doit respecter une hiérarchie proportionnelle stricte entre ses 3 niveaux de texte :

- **Niveau 1 — Titre Choc / Hook** : Taille de référence $\times 2.2$ à $\times 2.8$ par rapport au sous-titre (ex: 80px à 110px en 9:16, 64px à 84px en 16:9). Poids gras (800 ou 900). 1 à 6 mots maximum.
- **Niveau 2 — Sous-titre / Punchline** : Taille intermédiaire $\times 1.4$ à $\times 1.6$ par rapport au texte courant (ex: 42px à 54px en 9:16, 32px à 40px en 16:9). Poids semi-bold (600 ou 700).
- **Niveau 3 — Badges / Métriques / Légendes** : Taille de base $1\times$ (ex: 24px à 32px en 9:16, 18px à 24px en 16:9). Lisibilité absolue même sur écran réduit de smartphone.

### 13.4 Cohérence des Surfaces, Bordures et Rayons (Surface Consistency)
Toutes les cartes, conteneurs et encarts d'une même vidéo doivent partager les mêmes règles de finition :

1. **Rayon de Courbure Unique (`--radius-card`)** :
   - Choisir un rayon au départ de la vidéo et s'y tenir partout : soit arrondi moderne (**24px à 32px**), soit ultra-arrondi (**40px à 48px**). Ne jamais mélanger des cartes à coins pointus (4px) avec des cartes à 40px dans la même vidéo.
   - Les badges et pilules utilisent systématiquement le rayon plein (`border-radius: 999px`).
2. **Traitement Neutre des Bordures** :
   - Fin trait neutre et subtil : `border: 1px solid rgba(255, 255, 255, 0.12)` sur fond sombre, ou `border: 1px solid rgba(0, 0, 0, 0.08)` sur fond clair.
   - Bannissement des bordures criardes multicolores ou liserés latéraux épais non justifiés.
3. **Élévation et Découpage de Profondeur** :
   - Les cartes doivent se détacher nettement de l'arrière-plan grâce à un verre dépoli (`backdrop-filter: blur(20px)`) combiné à une ombre douce d'élévation (`box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15)`).

### 13.5 Cohérence Chromatique Structurelle (Règle 60-30-10 Agnostique)
Sans fixer de code hexadécimal obligatoire :
- **60% : Surface Dominante** (Fond studio clair ou fond cinéma sombre).
- **30% : Surfaces de Structure** (Fonds des cartes Bento, typographie principale blanche/noire, séparateurs).
- **10% : Accent Unique** (Une seule couleur vibrante pour les mots-chocs, le bouton CTA et les micro-jauges).
- **Règle Duo-Tone des Titres** : Jamais plus de 2 couleurs sur un même bloc de texte (ex: Couleur Principale + Couleur d'Accentuation).

## 14. Composants Modern UI (shadcn, Aceternity, Drapeaux vectoriels & Microlink)

### 14.1 Composants Modernes & Bento Grid (shadcn / Aceternity)
- **Cartes Bento & Glassmorphism** : Fond `bg-zinc-950/70` ou `rgba(9,9,11,0.75)`, bordure fine `border border-zinc-800/80`, biseau intérieur `shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]`, flou `backdrop-blur-xl`.
- **Bordure lumineuse dynamique** : classe `border-beam` (laser de lumière subtil qui contourne la carte).
- **Arrière-plans texturés légers** : classe `bg-dot-grid` ou `bg-line-grid` pour donner du relief sans surcharger le GPU.
- **Badges Pillules** : `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"><i data-lucide="sparkles" class="w-3.5 h-3.5"></i> EN DIRECT</span>`.
- **Fenêtres Mockup macOS** : En-tête avec 3 pastilles colorées (`bg-red-500/80`, `bg-yellow-500/80`, `bg-emerald-500/80`) et titre de fichier mono (`text-xs text-zinc-400 font-mono`).

### 14.2 Règle Stricte des Drapeaux Nationaux (Zéro Émoji Brut)
> **Sous Windows et les navigateurs Chromium, les émojis drapeaux Unicode s'affichent sous forme de 2 lettres laides (ex: "FR", "SN", "US").**
> **IL EST STRICTEMENT INTERDIT d'écrire des émojis drapeaux bruts dans le texte HTML.**
>
> **Utiliser exclusivement l'une des 2 méthodes vectorielles :**
> 1. **Flagcdn SVG / PNG (Recommandé)** : `<img src="https://flagcdn.com/fr.svg" class="w-7 h-5 rounded shadow-sm inline-block object-cover" alt="France">` (remplacer `fr` par le code pays à 2 lettres : `sn`, `us`, `gb`, `es`, `br`, etc.).
> 2. **Classes CSS Flag-Icons** : `<span class="fi fi-fr rounded-sm shadow-sm inline-block"></span>` ou `<span class="fi fi-sn fis inline-block"></span>`.

### 14.3 Captures de Vrais Sites Web (Microlink API)
Pour intégrer un vrai site web, profil ou dashboard en mockup sans capture manuelle :
`<img src="https://api.microlink.io?url=https://[DOMAINE]&screenshot=true&meta=false&embed=screenshot.url" class="rounded-xl border border-zinc-800 shadow-2xl">`.

### 14.4 Micro-Animations Fluides avec Anime.js
Pour animer des compteurs de chiffres, jauges ou ressorts géométriques :
```javascript
const aTl = anime.timeline({ autoplay: false });
aTl.add({
    targets: { val: 0 },
    val: 50000,
    round: 1,
    duration: 1200,
    easing: 'easeOutExpo',
    update: (a) => {
        const el = document.getElementById('monChiffre');
        if (el) el.textContent = Math.round(a.animations[0].currentValue).toLocaleString();
    }
});
window.__animeTimelines = window.__animeTimelines || [];
window.__animeTimelines.push(aTl);
```

---

## 15. Techniques Avancées d'Arrière-Plan Cinématique (`background_cinematics.md`)

> 📖 **Guide complet de référence :** Voir [.agents/skills/My_Skills/design_composition/background_cinematics.md](file:///c:/Users/ndara/heygen-new/.agents/skills/My_Skills/design_composition/background_cinematics.md)

L'arrière-plan fait partie intégrante de la mise en scène vidéo. Ne jamais se contenter d'un aplat noir vide ou d'une grille de points basique. Varier selon les 4 familles cinématiques :

1. **Dégradé Néon Liquide / Aurora Flouté Dynamique** :
   - Blobs de couleurs néon organiques (Cyan `#06b6d4`, Émeraude `#10a37f`, Violet `#8b5cf6`) avec `filter: blur(80px - 110px)` et opacité contenue (0.25 - 0.35).
   - Mouvement GSAP lent et sinusoïdal en continu (`duration: 12s - 20s`, `repeat: -1, yoyo: true`).
2. **Éléments Géométriques Diagonaux aux Coins Opposés (Effet Bokeh 35mm)** :
   - Deux formes vectorielles identiques (ex: étoiles 4 branches ou polygones) positionnées à cheval sur deux coins diagonalement opposés (ex: Haut-Gauche et Bas-Droite).
   - Partiellement hors-champ (50% masqué par les bords de scène).
   - Flou d'arrière-plan optique (`filter: blur(45px - 60px)`, opacité `0.18 - 0.25`).
   - Rotation lente et continue sur toute la vidéo (`rotation: 360` sur 20-30s, `ease: 'none'`). Apporte une profondeur 3D cinématique sans perturber la lisibilité du premier plan.
3. **Fond Uni Minimaliste & Haute Définition (Zinc Dark Shadcn `#09090b`)** :
   - Fond sombre luxueux texturé par une micro-vignette radiale (`radial-gradient(circle at 50% 50%, transparent 65%, rgba(0, 0, 0, 0.75) 100%)`).
   - Surfaces de cartes contrastées en verre dépoli (`rgba(15, 20, 32, 0.75)` avec `backdrop-filter: blur(20px)` et bordure `rgba(255, 255, 255, 0.08)`).
4. **Sub-Pixel Matrix & Fines Lignes Vectorielles** :
   - Grille ultra-fine 1px semi-transparente (`rgba(255, 255, 255, 0.04)`) avec masque radial au centre pour focaliser l'attention.

---

## 16. Diversité Stylistique des Cards & Animation Interne Décalée (Stagger)

### 16.1 Les 3 Familles Stylistiques de Cards selon le Contexte
Ne jamais produire des cartes clonées identiques. Choisir la typologie adaptée à la narration :

1. **Card Flat Minimaliste / Bento Nette** :
   - *Usage* : Données techniques, tableaux de bord épurés, comparaisons factuelles, keynotes blanc/noir purs.
   - *Style* : Fond aplat neutre (`#09090b` sur sombre, `#ffffff` sur clair), bordure ultra-fine sub-pixel (`1px solid rgba(255, 255, 255, 0.08)` ou `rgba(0, 0, 0, 0.06)`), zéro ombre lourde. Contraste de luminance maximal.
2. **Card 3D en Perspective (Tilt Spatial)** :
   - *Usage* : Présentation produit héroïque, SaaS innovant, cartes bancaires, badges de profil.
   - *Style* : `transform-style: preserve-3d`, angle de vue dynamique (`transform: perspective(1200px) rotateX(8deg) rotateY(-6deg)`), réagissant au travelling caméra.
3. **Card Élevée / Ombrée (Elevated Shadow Card)** :
   - *Usage* : Éléments mis en avant au premier plan, alertes, cartes de synthèse.
   - *Style* : Ombre portée diffuse multicouche (`box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.25), 0 4px 12px -2px rgba(0, 0, 0, 0.12)`).
   - *Règle d'or du contraste* : L'ombre ne doit JAMAIS salir ou noyer le texte des éléments voisins. Toujours conserver une zone de respiration de 32px minimum.

### 16.2 Règle Absolue d'Animation Interne Décalée (Stagger)
> 🚫 **INTERDICTION FORMELLE DE FAIRE APPARAÎTRE UNE CARD COMME UN BLOC FIGÉ MONOBLOC.**
> Une carte qui apparaît d'un coup avec tous ses textes et chiffres figés donne une sensation amateur et statique.

**Chorégraphie d'animation interne obligatoire (`stagger: 0.06s à 0.10s`) :**
1. **Entrée du conteneur Card** : Entrée en fondu/glissement léger (`y: 25 -> 0`, `opacity: 0 -> 1`, `duration: 0.5s`, `ease: 'expo.out'`).
2. **Badge / Tag / Icône d'en-tête** : Pop élastique (`scale: 0.7 -> 1`, `opacity: 0 -> 1`, `ease: 'back.out(1.8)'`).
3. **Titre & Label** : Dévoilement mot par mot (`splitWordsFadeUp` ou `x: -12 -> 0`, `opacity: 0 -> 1`).
4. **Métrique Chiffrée Clé** : Rolling counter animé de 0 à la valeur finale via target GSAP (`onUpdate: () => el.textContent = Math.round(val)`).
5. **Jauge / Barre de progression / Sparkline** : Déploiement dynamique de gauche à droite (`width: 0% -> target%` ou tracé SVG `strokeDashoffset`).
6. **Note / Description de pied** : Fondu enchaîné doux (`opacity: 0 -> 1`, `duration: 0.4s`).

---

## 17. Règle Anti-Scènes Mortes : Vitalité Cinématique Continue vs Plateau Cognitif Réfléchi

> 🚫 **INTERDICTION FORMELLE DES SCÈNES MORTES SANS VIE.**
> Une scène vidéo ne doit JAMAIS rester inerte et immobile. Le spectateur perçoit immédiatement l'absence de mouvement comme un arrêt sur image non désiré.

### 17.1 Les 3 Moteurs de Vie Continue Obligatoires
Dans toute scène active, au moins 2 de ces 3 moteurs doivent être en action :
1. **Dérive Caméra Continue (*Continuous Camera Drift*)** :
   - Un lent travelling de caméra imperceptible mais permanent : `scale: 1.0 -> 1.05` sur la durée de la scène, ou translation subtile `x: +30px` / `y: -15px`.
   - Donne la sensation cinématographique d'une caméra portée ou sur chariot fluide.
2. **Micro-Physique & Éclairages Vivants (*Ambient Motion*)** :
   - Orbes de lumière qui ondulent doucement (`sine.inOut`, `yoyo: true`).
   - Curseurs de code clignotants (`@keyframes blink`).
   - Particules flottantes lentes ou micro-oscillations d'icônes (`y: -6 -> +6px`).
3. **Apparition Séquentielle Cadencée** :
   - Les informations se déploient au fur et à mesure de l'écoute de la voix off, mot par mot, chiffre par chiffre.

### 17.2 Priorité à la Compréhension : Rythme Fluide, Écran Épuré & Exactitude Historique
- Ne jamais sacrifier la compréhension pour respecter un chrono arbitraire, MAIS **ne jamais insérer de coupures/trous de silence artificiels dans la voix off**.
- Pour laisser au spectateur le temps d'assimiler confortablement : soit **étoffer et allonger le script lui-même** de façon naturelle et fluide, soit concevoir des **animations plus douces avec moins d'éléments simultanés à l'écran** afin que la lecture reste naturelle en synchrone avec la narration continue.
- *Audio & Chronologie* : Télécharger une vraie musique adaptée au sujet (`fetch_music.cjs --query "..."`, jamais toujours le même morceau ni une musique générée approximative), garder les SFX strictement subordonnés à la voix (`<= -30 dBFS`), et vérifier que toute archive ou portrait correspond chronologiquement **à l'âge et à la date précise** mentionnés dans la scène.

---

## 18. Synchronisation Cognitive de l'Animation (Séquencée vs Simultanée) & Fonds SaaS Harmonisés

### 18.1 Animation Séquencée / Ordonnée vs Animation Simultanée d'Ensemble
L'animation visuelle obéit au fonctionnement cognitif du cerveau humain. Deux modes distincts doivent être appliqués selon le contexte :

1. **Le Mode Séquencé / Ordonné (Standard Absolu par Défaut — 90% des cas)** :
   - **Quand il y a une voix off** : L'animation visuelle DOIT suivre scrupuleusement la voix off (mot par mot, phrase par phrase). L'élément visuel (mot-clé, carte, métrique, diagramme) apparaît à l'instant où l'auditeur l'entend. L'œil confirme ce que l'oreille perçoit.
   - **Quand il n'y a pas de voix off** : L'animation DOIT suivre un ordre hiérarchique rigoureux de lecture humaine (de haut en bas, de gauche à droite : Titre d'accroche $\rightarrow$ Sujet / Carte Bento $\rightarrow$ Chiffre clé / Détail $\rightarrow$ Action / Conclusion).
   - **Scènes Workflow / Réseau / Écosystème** : Si la scène repose sur un **logo, produit ou hub central**, ce **sujet central DOIT apparaître EN PREMIER** ; les flux rayonnent ensuite depuis le centre et **les éléments périphériques s'affichent un par un** (jamais les satellites avant le cœur du débat).
   - **Raison neuro-visuelle** : Le regard humain ne peut lire et imprimer qu'une seule information à la fois. Si 4 éléments s'animent en même temps, le regard hésite, se fatigue et ne retient rien.

2. **Le Mode Simultané (L'Exception Ciblée d'Ambiance)** :
   - Tous les éléments d'une scène ne s'animent en même temps **QUE et UNIQUEMENT SI le spectateur n'a PAS besoin de comprendre chaque élément un par un**, mais perçoit une sensation globale, une énergie ou un motif de fond :
     * *Exemples légitimes* : Explosion de confettis, pluie ou constellation de particules, volée de logos partenaires en arrière-plan, grille ou trame de fond qui apparaît, cascade de lignes de code purement illustratives.
     * Tout élément porteur d'information clé ou de texte lisible doit être ordonné séquentiellement.

### 18.2 Conception des Fonds SaaS Harmonisés (`generate_bg.cjs`)
- **Couleur principale unie** : Fond sombre (`#09090b`, `#000000`) ou fond blanc pur studio (`#ffffff`).
- **Néons & Couleurs d'Harmonisation** :
  - Ne jamais projeter une couleur néon brute directement sur le fond sans transition douce (risque de démarcation dure ou d'effet "coup de pinceau").
  - Utiliser une **seconde couleur complémentaire ou analogue plus douce** autour du néon central (ex: néon rouge vif `#e11d48` enveloppé d'un halo rose dégradé adouci `#fb7185` avec un flou profond de 90px à 140px).
  - Cela permet de fondre la lumière de manière organique dans le fond blanc ou noir, sans aucun trait dur ni rupture visuelle.
