# GUIDE COMPLET : CAMÉRA TRANSITION & CHORÉGRAPHIE DYNAMIQUE (2D / DOM / GSAP)

Ce guide explique à l'IA **quand** et **comment** bouger la caméra à l'intérieur d'une scène, quand déclencher une transition, et quels types de transitions employer selon la narration.

---

## 🎯 1. Règle Fondamentale : La Caméra suit la Psychologie du Spectateur

Une caméra ne bouge jamais au hasard. Elle simule l'œil d'un observateur humain :
- Elle se rapproche quand quelque chose devient **intime, crucial ou choquant**.
- Elle recule quand il faut **comprendre l'ensemble ou respirer**.
- Elle tourne la tête brusquement (whip-pan) quand **l'attention est captée par un nouvel élément**.

---

## 📐 1.bis. RÈGLES D'OR DU CADRAGE INTELLIGENT & TRACKING (ANTI-ZOOM BÊTE)

> ⚠️ **LOI ABSOLUE : INTERDICTION DU ZOOM AVEUGLE / BÊTE**
> Ne JAMAIS appliquer un zoom générique au milieu de l'écran (`scale: 1.2` centré à `50% 50%`) sans recalculer la position exacte du sujet. Si le sujet (carte, visage, métrique, logo, personnage) est décalé, un zoom aveugle **COUPERA LE SUJET** ou zoomera sur du vide !

### A. Règle du Centrage Optique & Marges de Sécurité (Safe Margins)
1. **Identifier la Cible Active (`targetX, targetY`)** :
   - Si la voix off parle d'une carte spécifique dans un comparatif ou un Top 10, le centre de cette carte devient la cible caméra.
   - Si un personnage réagit (panique, joie, focus), son visage devient la cible caméra.
2. **Calcul de Recadrage (DOM GSAP ou Canvas 2D)** :
   ```javascript
   // Formule universelle de recentrage caméra lors d'un zoom :
   // Pour amener (targetX, targetY) au centre de l'écran (960, 540) avec un zoom S :
   const camX = (960 - targetX) * (scale - 1);
   const camY = (540 - targetY) * (scale - 1);
   ```
   - **En GSAP DOM** : utiliser `transformOrigin: "${targetX}px ${targetY}px"` ou animer simultanément `x: targetOffsetX, y: targetOffsetY, scale: targetScale`.
   - **En Canvas 2D** :
     ```javascript
     ctx.save();
     ctx.translate(960, 540);
     ctx.scale(cam.zoom, cam.zoom);
     ctx.translate(-cam.targetX, -cam.targetY);
     // Rendu des éléments...
     ctx.restore();
     ```
3. **Marge de Respiration Obligatoire (80px – 120px)** :
   - L'élément zoomé doit **toujours** être contenu dans la safe-zone avec un minimum de **80px** de marge par rapport aux bords de l'écran.
   - **Interdiction formelle** de rogner le titre d'une carte, les pieds d'un personnage ou la bordure d'un conteneur.

### B. Tracking & Accompagnement Cinétique (Suivi de l'Action)
1. **Carousels & Top 10 Défilants** :
   - Lorsque les éléments défilent horizontalement ou verticalement, la caméra **ne doit pas rester statique**.
   - Elle effectue un travelling fluide (*smooth tracking dolly*) synchronisé avec le défilement pour accompagner l'élément actif, le stabiliser brièvement au centre pendant sa lecture, puis glisser vers le suivant.
2. **Personnages en Mouvement & Actions Dynamiques** :
   - Si un personnage court, avance ou bondit en l'air (ex: célébration de but, saut de joie), la caméra accompagne le vecteur d'action :
     - *Saut vertical* $\rightarrow$ Travelling vertical montant (tilt up) pour garder le personnage et ses bras levés dans le tiers supérieur sans qu'il sorte du haut de l'écran.
     - *Effondrement comique* $\rightarrow$ Pan doux vers le bas pour capturer l'expression de défaite sur le canapé.

### C. Zooms d'Expressions Faciales (Punch-In Émotionnel)
1. **Quand l'activer ?**
   - Dès qu'un personnage subit un électrochoc émotionnel : regard focus en haute tension, yeux écarquillés de panique, éclat de rire, seum après une défaite.
2. **Comment l'exécuter ?**
   - **Punch-in rapide** : `scale: 1.0` $\rightarrow$ `1.25 - 1.35`, centré sur la ligne des yeux / buste du personnage, durée `0.25s - 0.4s`, easing dynamique `power3.out`.
   - **Micro-maintien** : laisser respirer l'émotion 1.5s à 2.5s pendant que l'expression joue.
   - **Dézoom fluide** : retour doux vers `scale: 1.0` avec `power2.inOut` ou `sine.out`.

---

## 🔍 2. Quand Zoomer, Dézoomer ou Glisser ?

### A. Quand ZOOMER ?
| Type de Zoom | Quand l'utiliser ? | Paramètres GSAP Recommandés | Effet Psychologique |
| :--- | :--- | :--- | :--- |
| **Slow Push-In (Zoom Continu)** | **En permanence sur les plans longs (> 2.5s).** Dès qu'un personnage parle ou qu'un texte est affiché. | `scale: 1.0` $\rightarrow$ `1.06`, durée `3.0s - 6.0s`, `ease: "none"` ou `"sine.out"` | Élimine l'effet "image morte" et maintient l'attention sans distraire. |
| **Crash Zoom (Snap Zoom)** | **Sur un mot choc, un chiffre décisif ou une révélation.** (Ex: *"arrête de couper des plans"*, *"$4,800/mois"*). | `scale: 1.0` $\rightarrow$ `1.22`, centré sur le mot clé, durée `0.22s - 0.35s`, `ease: "power4.out"` ou `"back.out(1.4)"` | Crée un électrochoc visuel et force l'ancrage mémoriel. |
| **Macro Focus (Zoom Ciblé)** | **Pour pointer un détail technique précis** (ex: zoom sur la timeline ou sur une métrique). | `x, y` vers le point d'intérêt + `scale: 1.35`, durée `0.6s`, `ease: "power3.out"` | Guide l'œil exactement là où se trouve l'information sans ambiguïté. |

### B. Quand DÉZOOMER ?
| Type de Dézoom | Quand l'utiliser ? | Paramètres GSAP Recommandés | Effet Psychologique |
| :--- | :--- | :--- | :--- |
| **Pull-Back de Révélation** | **Après un zoom choc ou pour dévoiler le contexte.** (Ex: après avoir montré un chiffre, on dézoome pour montrer toute la carte). | `scale: 1.25` $\rightarrow$ `1.0`, durée `0.8s - 1.2s`, `ease: "power2.out"` | Sensation de soulagement et compréhension globale. |
| **Dézoom de Respiration** | **À la fin d'une démonstration intense, juste avant une conclusion.** | `scale: 1.05` $\rightarrow$ `0.98`, durée `1.5s`, `ease: "sine.inOut"` | Prépare l'esprit du spectateur à accueillir la synthèse ou le CTA. |

### C. Quand GLISSER (Pan & Dolly) ?
| Mouvement | Quand l'utiliser ? | Paramètres GSAP Recommandés |
| :--- | :--- | :--- |
| **Tracking Horizontal (Pan)** | Comparaison de 2 éléments (Avant / Après, Problème / Solution) ou passage d'une étape 1 à une étape 2. | `x: 0` $\rightarrow$ `-400px`, durée `0.8s - 1.4s`, `ease: "power2.inOut"` |
| **Pedestal Vertical** | Découverte d'un classement ou révélation de bas en haut (prestige / autorité). | `y: 200px` $\rightarrow$ `0px`, durée `1.0s`, `ease: "power3.out"` |

---

## ⚡ 3. Quand déclencher une Transition ?

Une transition ne s'insère **QUE** dans ces 3 cas précis :
1. **Changement d'idée narrative** : La voix off termine un argument et aborde le point suivant.
2. **Rupture de rythme** : Passage d'une phase lente d'explication à une phase rapide de résultats.
3. **Changement de décor / échelle** : Passage d'un gros plan sur un objet à une vue d'ensemble statistique.

> ⚠️ **Interdiction :** Ne jamais faire de transition au milieu d'une phrase de la voix off sans ponctuation forte (`.`, `!`).

---

## 🎬 4. Les 5 Grands Types de Transition (Catalogue Prêt à l'Emploi)

### 1. Whip Pan (Le Coup de Fouet Cinétique avec Flou SVG Déterministe)
> **Usage :** Transition ultra dynamique entre deux scènes avec flou de mouvement directionnel précis (axe X horizontal ou axe Y vertical).
```javascript
// Sortie Scène 1 à gauche à toute vitesse
tl.to("#scene1", { 
    x: -1920, 
    duration: 0.35, 
    ease: "power3.in" 
}, tOut);

// Flou de mouvement directionnel horizontal sur la caméra (SVG filter stdDeviation sur l'axe X)
tl.fromTo('#cameraBlurFilter', 
    { attr: { stdDeviation: '0,0' } }, 
    { attr: { stdDeviation: '28,0' }, duration: 0.16, ease: 'power2.in', yoyo: true, repeat: 1 }, 
    tOut
);
// Bruitage whoosh synchronisé
tl.call(() => playSfx('whoosh', 0.45), null, tOut);

// Entrée Scène 2 depuis la droite
tl.fromTo("#scene2", 
    { x: 1920 }, 
    { x: 0, duration: 0.45, ease: "power3.out" }, 
    tOut + 0.15
);
```

### 2. Zoom-Through Portal (Plongée dans l'Écran)
> **Usage :** La caméra zoome massivement dans un écran ou un bouton jusqu'à le traverser pour révéler la scène suivante.
```javascript
tl.to("#scene1", { 
    scale: 3.5, 
    opacity: 0, 
    duration: 0.6, 
    ease: "expo.in" 
}, tOut);

tl.fromTo("#scene2", 
    { scale: 0.4, opacity: 0 }, 
    { scale: 1.0, opacity: 1, duration: 0.7, ease: "power3.out" }, 
    tOut + 0.3
);
```

### 3. Directional Slide Masqué (Slide Épuré)
> **Usage :** Scènes corporate, finance, bento cards élégantes.
```javascript
// La scène 1 glisse et disparaît physiquement
tl.to("#scene1", { opacity: 0, y: -40, duration: 0.4, ease: "power2.in" }, tOut);
tl.set("#scene1", { display: "none", visibility: "hidden" }, tOut + 0.4);

// La scène 2 apparaît sans chevauchement
tl.set("#scene2", { display: "flex", visibility: "visible" }, tOut + 0.4);
tl.fromTo("#scene2", 
    { opacity: 0, y: 50 }, 
    { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, 
    tOut + 0.4
);
```

### 4. Flash Cut d'Impact (Choc Électrique)
> **Usage :** Révélation d'un chiffre monumental ou début du climax.
```javascript
// Flash blanc rapide 0.15s
tl.fromTo("#flashOverlay", 
    { opacity: 0 }, 
    { opacity: 0.9, duration: 0.08, ease: "power4.in" }, 
    tOut
);
tl.set("#scene1", { display: "none" }, tOut + 0.08);
tl.set("#scene2", { display: "flex" }, tOut + 0.08);
tl.to("#flashOverlay", { opacity: 0, duration: 0.25, ease: "power2.out" }, tOut + 0.08);
```

### 5. Cut Franc Invisible (Standard Éditorial)
> **Usage :** Deux scènes s'enchaînent exactement sur le beat musical ou sur un mot percutant sans aucun effet de fondu mou.
```javascript
tl.set("#scene1", { display: "none", visibility: "hidden" }, tCut);
tl.set("#scene2", { display: "flex", visibility: "visible" }, tCut);
```

---

## 🌪️ 4.bis. FLOU DE MOUVEMENT DE CAMÉRA DÉTERMINISTE 60 FPS (SVG `<feGaussianBlur>`)

> ⚠️ **POURQUOI LE CSS CLASSIQUE `filter: blur(...)` EST BANNI SUR LES TRANSITIONS CAMÉRA :**
> 1. **Omnidirectionnel & Artificiel** : Le blur CSS standard est circulaire. Au lieu de donner une traînée de vitesse cinématique (*streaks* horizontaux lors d'un whip pan), il rend l'image simplement myope et floue sur tous les axes.
> 2. **Lourd pour le GPU & Risque de Saccades** : Le blur CSS recalcule un raster bitmap complet à chaque frame sur des résolutions HD (1920x1080), causant des drops de FPS sous headless Chromium / Puppeteer.

### A. L'Architecture Déterministe SVG
Chaque composition MarvidFlow intègre un filtre SVG dynamique à accélération matérielle native :
```html
<svg style="position: absolute; width: 0; height: 0; overflow: hidden;" aria-hidden="true">
    <defs>
        <filter id="cameraMotionBlur">
            <feGaussianBlur id="cameraBlurFilter" in="SourceGraphic" stdDeviation="0,0" />
        </filter>
    </defs>
</svg>
```
Le conteneur maître `#cameraRig` est lié à ce filtre en CSS :
```css
#cameraRig {
    filter: url(#cameraMotionBlur);
    will-change: transform, filter;
}
```
Quand `stdDeviation="0,0"`, le filtre SVG a un overhead nul ($0$ ms).

### B. Les 3 Profils de Flou Directionnel GSAP
1. **Whip Pan Horizontal (Transitions de scènes gauche/droite)** :
   ```javascript
   tl.fromTo('#cameraBlurFilter',
       { attr: { stdDeviation: '0,0' } },
       { attr: { stdDeviation: '26,0' }, duration: 0.16, ease: 'power2.in', yoyo: true, repeat: 1 },
       tTransition
   );
   ```
2. **Whip Pan Vertical / Pedestal (Transitions haut/bas)** :
   ```javascript
   tl.fromTo('#cameraBlurFilter',
       { attr: { stdDeviation: '0,0' } },
       { attr: { stdDeviation: '0,22' }, duration: 0.16, ease: 'power2.in', yoyo: true, repeat: 1 },
       tTransition
   );
   ```
3. **Crash Zoom / Impact Choc (Accélération radiale)** :
   ```javascript
   tl.fromTo('#cameraBlurFilter',
       { attr: { stdDeviation: '0,0' } },
       { attr: { stdDeviation: '16,16' }, duration: 0.14, ease: 'power2.in', yoyo: true, repeat: 1 },
       tImpact
   );
   ```

### C. Helper Global Disponible dans le Runtime
Un helper global est disponible dans chaque page pour simplifier l'appel :
```javascript
window.applyCameraMotionBlur('horizontal', 0.32, tTransition, 26);
// Types acceptés : 'horizontal', 'vertical', 'zoom'
```

---

## 🎯 5. Règles de Suivi Contextuel : La Caméra Suit le Contenu

Ces règles s'appliquent **automatiquement** dès qu'un certain type de contenu apparaît à l'écran. L'IA doit les respecter sans qu'on le lui demande explicitement.

---

### A. RÈGLE : Suivi de Liste / Cards Séquentielles

> **Contexte :** La scène affiche une liste d'éléments ou des cards qui apparaissent l'une après l'autre (steps, features, bullets...).

**Comportement obligatoire :**
1. **Zoom centré sur la Card/item #1** dès son apparition (`scale: 1.0 → 1.18`, centré sur l'élément)
2. **Glissement fluide vers la Card/item #2** en suivant exactement le timing de son animation d'entrée
3. **Continuer** card par card en tracking
4. **Dézoom de révélation** après le dernier élément pour montrer l'ensemble (`scale: 1.18 → 1.0`, durée `1.2s`, `ease: "power2.out"`) — ou couper directement à la scène suivante

```javascript
// Exemple : liste de 3 cards, chaque card entre à t=2s, t=4s, t=6s
const cards = ["#card1", "#card2", "#card3"];
const cardPositions = [
    { x: 0,    y: -180 },   // position de card1 dans le stage
    { x: 0,    y: 0   },    // position de card2
    { x: 0,    y: 180 },    // position de card3
];
const cardTimes = [2.0, 4.0, 6.0];  // t d'apparition de chaque card

// Zoom sur card1 au moment de son apparition
tl.to("#stage", {
    scale: 1.18,
    y: -cardPositions[0].y * 0.18,  // compenser la translation pour centrer
    duration: 0.6, ease: "power3.out"
}, cardTimes[0]);

// Tracking card2 → glissement
tl.to("#stage", {
    y: -cardPositions[1].y * 0.18,
    duration: 0.7, ease: "power2.inOut"
}, cardTimes[1]);

// Tracking card3
tl.to("#stage", {
    y: -cardPositions[2].y * 0.18,
    duration: 0.7, ease: "power2.inOut"
}, cardTimes[2]);

// Dézoom final après la dernière card (+1.5s)
tl.to("#stage", {
    scale: 1.0, y: 0,
    duration: 1.2, ease: "power2.out"
}, cardTimes[2] + 1.5);
```

> ⚠️ **Règle absolue :** Le glissement de caméra vers une card doit coïncider **exactement** avec le début de l'animation d'entrée de cette card dans la timeline GSAP — jamais avant, jamais trop tard.

---

### B. RÈGLE : Suivi du Typing de Texte (Barre de Saisie / Terminal)

> **Contexte :** La scène affiche une barre de recherche, un champ de saisie, un terminal ou un effet "typewriter" où du texte se tape progressivement.

**Comportement obligatoire :**
1. **Zoom sur la partie gauche** de la barre dès le début du typing (`scale: 1.0 → 1.25`, `transformOrigin: "left center"` ou décalage `x` vers la gauche)
2. **Pan horizontal progressif vers la droite** en suivant le curseur de frappe (vitesse calée sur la durée totale du typing)
3. **Dézoom de révélation** une fois le texte entièrement tapé, pour montrer le résultat complet (`scale: 1.25 → 1.0`, durée `0.8s`, `ease: "power2.out"`)

```javascript
// Exemple : typing de 3s sur une barre de 600px de large, centré dans la scène
const typingStart = 5.0;    // t début du typing
const typingDur   = 3.0;    // durée de l'animation typewriter
const barWidth    = 600;    // largeur de la barre en px (espace vidéo interne)
const zoomScale   = 1.25;

// 1. Zoom + ancrage à gauche de la barre
tl.to("#stage", {
    scale: zoomScale,
    x: (barWidth * 0.25),   // décale vers la gauche pour centrer le début de la barre
    duration: 0.5,
    ease: "power3.out"
}, typingStart);

// 2. Pan vers la droite pendant tout le typing
tl.to("#stage", {
    x: -(barWidth * 0.25),  // arrive au bout droit de la barre
    duration: typingDur,
    ease: "none"            // linéaire pour suivre le curseur en temps réel
}, typingStart + 0.5);

// 3. Dézoom et recentrage après le dernier caractère
tl.to("#stage", {
    scale: 1.0,
    x: 0,
    duration: 0.8,
    ease: "power2.out"
}, typingStart + typingDur + 0.3);
```

> 💡 **Note :** Si la barre de saisie occupe toute la largeur de la scène, le pan peut être minimal (`±100px`). Adapter selon la largeur réelle de l'élément.

---

### C. RÈGLE : Split Screen Tutoriel (Webcam + Écran Partagé)

> **Contexte :** Vidéo tuto avec split screen : petite vignette webcam du créateur + grand cadre montrant son écran/ses explications.

**Comportement obligatoire selon le moment narratif :**

| Moment | Comportement Caméra | GSAP |
| :--- | :--- | :--- |
| **Créateur aborde un point important** (ton qui change, geste de main, pause) | Zoom rapide centré sur la **webcam** pour humaniser | `scale: 1.0 → 1.3`, centré sur la vignette webcam, `0.3s`, `ease: "power3.out"` |
| **Créateur passe à la démonstration écran** (il montre, clique, navigue) | Dézoom progressif pour montrer le split screen complet | `scale: 1.3 → 1.0`, `x/y → 0`, `0.8s`, `ease: "power2.out"` |
| **Point clé à l'écran** (highlight, curseur, encadré important) | Zoom ciblé vers la zone d'intérêt dans le cadre écran | Macro Focus : `scale: 1.0 → 1.35`, décalage `x/y` vers la zone, `0.5s`, `ease: "power3.out"` |
| **Fin du tutoriel / conclusion** | Pull-back pour montrer le résultat final dans le cadre écran | `scale: 1.35 → 1.0`, `x/y → 0`, `1.2s`, `ease: "power2.inOut"` |

```javascript
// Exemple : créateur parle à t=8s, montre son écran à t=12s, point clé à t=16s
const webcamEl = "#webcam-vignette";
const screenEl = "#screen-frame";

// t=8s — Zoom sur webcam (créateur parle d'un point important)
tl.to("#stage", {
    scale: 1.3,
    x: webcamOffsetX,  // décalage vers la position de la vignette webcam
    y: webcamOffsetY,
    duration: 0.3, ease: "power3.out"
}, 8.0);

// t=12s — Dézoom pour revenir au split screen complet
tl.to("#stage", {
    scale: 1.0, x: 0, y: 0,
    duration: 0.8, ease: "power2.out"
}, 12.0);

// t=16s — Zoom sur zone d'intérêt dans le cadre écran
tl.to("#stage", {
    scale: 1.35,
    x: keyAreaOffsetX,
    y: keyAreaOffsetY,
    duration: 0.5, ease: "power3.out"
}, 16.0);

// t=20s — Pull-back résultat final
tl.to("#stage", {
    scale: 1.0, x: 0, y: 0,
    duration: 1.2, ease: "power2.inOut"
}, 20.0);
```

> ⚠️ **Règle de rythme :** Le zoom sur la webcam doit être **rapide (< 0.4s)** pour simuler une coupe caméra TV. Le dézoom vers l'écran doit être **plus lent (0.8-1.2s)** pour laisser au spectateur le temps de se réorienter.

---

### D. RÈGLE : Élément Titre Fort ou Révélation Centrale

> **Contexte :** Un titre principal, une stat choc ou un mot clé se détache visuellement au centre de la scène.

**Comportement obligatoire :**
1. La scène arrive à `scale: 1.0` (vue normale)
2. Dès l'apparition de l'élément titre : **Slow Push-In automatique** vers lui (`scale: 1.0 → 1.07`, durée = durée d'affichage de l'élément, `ease: "none"`)
3. Si un **mot en particulier est choc** (chiffre, verbe d'action) : **Crash Zoom** instantané sur ce mot (`scale: 1.07 → 1.22`, `0.25s`, `ease: "power4.out"`) puis pull-back (`scale: 1.22 → 1.05`, `0.6s`)
4. À la sortie de la scène : retour à `scale: 1.0` via la transition choisie

```javascript
const tAppear = 3.0;     // t d'apparition du titre
const tStay   = 5.0;     // durée d'affichage
const tChoc   = 5.5;     // t du mot choc dans le titre

// Slow push-in pendant toute la durée d'affichage
tl.to("#stage", {
    scale: 1.07,
    duration: tStay, ease: "none"
}, tAppear);

// Crash zoom sur le mot choc
tl.to("#stage", {
    scale: 1.22,
    duration: 0.25, ease: "power4.out"
}, tChoc);

// Pull-back rapide
tl.to("#stage", {
    scale: 1.05,
    duration: 0.6, ease: "power2.out"
}, tChoc + 0.25);
```

---

## 📋 6. Tableau de Décision Rapide

| Contenu à l'écran | Mouvement de caméra |
| :--- | :--- |
| Titre / stat seul qui s'affiche | Slow Push-In automatique |
| Mot choc / chiffre décisif | Crash Zoom → Pull-Back |
| Liste / cards qui arrivent l'une après l'autre | Zoom card #1 → Tracking → Dézoom final |
| Barre de saisie / typing effect | Zoom gauche → Pan droit (linéaire) → Dézoom |
| Split screen : créateur parle | Zoom rapide sur webcam |
| Split screen : créateur montre l'écran | Dézoom pour split screen complet |
| Point d'intérêt dans le cadre écran | Macro Focus → Pull-Back |
| Fin de scène / respiration narrative | Dézoom de respiration (`scale → 0.98`) |
| Transition vers scène suivante | Choisir dans le catalogue §4 (Whip Pan, Zoom-Through, Slide, Flash, Cut) |

---

## 🚫 7. RÈGLE CRITIQUE : LOI DE DIVERSIFICATION SCÉNIQUE & ANTI-RÉPÉTITION

> ⚠️ **INTERDICTION FORMELLE DU COPIÉ-COLLÉ DE CHORÉGRAPHIE :**
> Une vidéo ne doit **JAMAIS** répéter le même schéma de caméra ou de transition sur deux scènes consécutives. 
> Ex: Faire un *Zoom-In sur carte gauche $\rightarrow$ Zoom-In sur carte droite* dans la Scène 2, puis refaire exactement la même chose dans la Scène 3 et la Scène 4 est **STRICTEMENT INTERDIT**.

### A. Règle des Identités Spatiales Distinctes
Chaque scène d'une vidéo doit avoir son propre profil de mouvement de caméra :
1. **Scène d'Ouverture (Hook / Intro)** : Élévation majestueuse, lent travelling avant (*Slow Push-In*) créant de la gravité et captant l'œil dès la première seconde.
2. **Scène Technique / Démonstration** : Travelling horizontal d'accompagnement (*Tracking Dolly*) avec stabilisation sur le sujet actif, suivi d'un cadrage macro précis sans mouvements parasites.
3. **Scène Dynamique / Comparatif** : Alternance de plans fixes stabilisés et de micro-mouvements angulaires (*Dutch Angle 2-4°*, légers basculements de perspective 3D).
4. **Scène Visuelle / Multimodale** : Mouvement organique flottant ou zoom d'immersion centré sur le cœur de l'élément visuel.
5. **Scène de Climax / Outro** : Grand dézoom de révélation continu (*Majestic Pull-Back*) sur 3 à 5 secondes qui donne de la respiration, de l'autorité et assoit le statut de la marque.

---

## ⏱️ 8. RÈGLE DE RYTHME & MODULATION DE VITESSE (PACING & TEMPS DE RESPIRATION)

> ⚠️ **INTERDICTION DU RYTHME MONOTONE OU SYSTÉMATIQUEMENT TROP RAPIDE :**
> Une vidéo où toutes les animations se jouent à toute vitesse en 0.3s-0.4s épuise le spectateur et rend le message incompréhensible. À l'inverse, une vidéo où tout est mou endort.
> **Le rythme DOIT MODULER** en fonction de critères objectifs :

### A. Les 4 Niveaux de Vitesse selon la Fonction
| Type de Moment | Durée Recommandée | Easing | Rôle Narratif |
| :--- | :--- | :--- | :--- |
| **Révélation de Titre & Cartes Principales** | **0.9s – 1.2s** | `power2.out` ou `expo.out` | **Majestueux & Lisible**. L'œil a le temps de voir l'élément s'installer sans précipitation. |
| **Temps de Lecture & Respiration (Plateau)** | **1.2s – 2.2s** | Caméra fixe ou dérive lente (`ease: "none"`) | **Absorption Cognitive**. Aucun élément ne bouge brusquement pendant que le spectateur lit ou écoute un argument clé. |
| **Choc, Mot Clé ou Chiffre Décisif** | **0.25s – 0.38s** | `power4.out` ou `back.out(1.4)` | **Électrochoc Visuel**. Snap Zoom ou punch élastique pour ancrer la métrique. |
| **Transitions entre Scènes** | **0.35s – 0.55s** | `power3.inOut` ou `expo.in` | **Liaison Cinétique**. Rapide et nette pour éviter les ventres mous. |

### B. Critères de Décision du Rythme
1. **Complexité du Contenu** : Plus une scène contient d'éléments d'information (schéma, code, tableau de chiffres, étapes de raisonnement), plus l'entrée doit être déliée et le temps de maintien long.
2. **Rythme Vocal** : Si la voix off marque une pause ou pose une affirmation solennelle, la caméra ralentit et glisse imperceptiblement. Si la voix accélère ou énumère, la caméra devient plus incisive.

---

## 🧠 9. INTERDICTION DES STORYBOARDS STÉRÉOTYPÉS (NON AUX GABARITS EN SÉRIE)

> ⚠️ **L'IA NE DOIT JAMAIS APPLIQUER UN STORYBOARD PRÉ-DÉTERMINÉ EN MODE « PILOTE AUTOMATIQUE » :**
> Il est interdit de plaquer automatiquement la même structure de scènes (ex: *Bento Grid $\rightarrow$ Fenêtre IDE de code $\rightarrow$ Orbe Multimodal*) sur toutes les vidéos SaaS ou tech.
> - **Obligation d'Analyse Spécifique** : L'IA doit concevoir la mise en scène selon le produit exact :
>   - S'il s'agit d'un produit orienté productivité : montrer un canvas collaboratif, des flux de travail réels, des intégrations d'outils.
>   - S'il s'agit d'un moteur de recherche ou d'un assistant conversationnel : montrer une interface de réponse structurée et fluide.
>   - S'il s'agit d'une infrastructure : visualiser des nœuds de réseau, des pipelines de latence, des graphes de clusters.
> - **Variété des Formats Visuels** : Alterner split-screens, cartes d'arguments asymétriques, visualisations de données, gros plans macro, et typographie cinétique pure.

---

## ✍️ 10. SYNCHRONISATION OBLIGATOIRE AVEC LA TYPOGRAPHIE CINÉTIQUE (`text_animation`)

> ⚠️ **COUPLAGE SYSTÉMATIQUE CAMÉRA $\leftrightarrow$ MOT PAR MOT :**
> - Ne JAMAIS afficher un titre avec un simple fondu global d'opacité en bloc (`opacity: 0 -> 1` sans animation textuelle).
> - Tout titre doit impérativement être découpé et animé **mot par mot** (`titleFadeWordsUp` avec stagger `0.10s–0.14s`) conformément au skill `text_animation`.
> - La caméra démarre son *Slow Push-In* au moment exact où le premier mot du titre s'anime, créant une parfaite synergie entre mouvement spatial et lecture textuelle.

---

## 🎥 11. RÈGLE DE MOTIVATION OBLIGATOIRE DE LA CAMÉRA (ZÉRO HYPER-AGITATION / ZÉRO MOUVEMENT GRATUIT)

> ⚠️ **LA SOBRIÉTÉ EST LE LUXE SUPRÊME : TOUT MOUVEMENT DE CAMÉRA DOIT AVOIR UNE JUSTIFICATION NARRATIVE PRÉCISE.**
> Il est formellement interdit de secouer, faire tourner ou zoomer la caméra « pour faire du mouvement » ou pour combler un vide.
>
> 1. **La Caméra a un But Narratif, Jamais du Cheet** :
>    - Si la caméra zoome (`scale: 1.0 -> 1.15`), c'est **exclusivement** pour isoler une métrique choquante ou attirer l'attention sur un détail critique.
>    - Si la caméra effectue un travelling latéral (`x: 0 -> -120`), c'est pour accompagner le regard vers une nouvelle carte qui vient de s'activer.
>    - Si la caméra effectue un dézoom (`scale: 1.15 -> 1.0`), c'est pour révéler une vue d'ensemble ou conclure majestueusement une séquence.
> 2. **Le Plateau de Respiration et de Stabilité (Holding Phase Obligatoire)** :
>    - Dès qu'un texte important, un terminal de code ou un bloc de données clé est affiché, la caméra **DOIT se stabiliser** (mouvement quasi nul : micro-dérive `scale < 0.02` ou vitesse `< 10px/s`).
>    - Le spectateur ne peut pas lire ni comprendre si le cadre tremble, pivote ou accélère sans raison.
> 3. **Interdiction Formelle du Slide sur Contenu Inerte (Cas du Code / IDE)** :
>    - **NE JAMAIS glisser la caméra sur du code statique** : Déplacer la caméra sur un bloc de code alors que le texte est inerte et ne bouge pas est un mouvement vide et parasite.
>    - Si la caméra se déplace vers du code ou suit un terminal, **le code DOIT IMPÉRATIVEMENT être en train de s'écrire ou de streamer en direct** (typewriter, streaming ligne par ligne, curseur lumineux actif).
> 4. **Interdiction des Schémas de Caméra Répétitifs d'une Scène à l'Autre** :
>    - Interdiction absolue de réutiliser la même chorégraphie sur deux scènes (ex: slide gauche puis slide droite répété en boucle). Chaque scène doit posséder une grammaire de caméra distincte (ex: lent push-in majestueux sur le hook, travelling horizontal stable sur benchmark, plongée 3D isométrique sur streaming de code, rotation d'arc spatial sur vision/voix, dézoom majestueux sur climax).
> 5. **Règle de Résolution & Zoom (SVG vs Matriciel PNG/JPEG)** :
>    - **Le SVG est vectoriel et infiniment scalable** : Un logo ou pictogramme en SVG vectoriel avec `viewBox` conserve des courbes parfaites au zoom.
>    - **Interdiction formelle de zoomer sur des images matricielles (PNG, JPEG)** : Un zoom sur un PNG/JPEG fait exploser la grille de pixels et dégrade la vidéo. Si un élément graphique ou logo doit être zoomé, il **DOIT impérativement être un SVG vectoriel**.

---

## ✂️ 12. RÈGLE DE SOBRIÉTÉ ÉDITORIALE DES TRANSITIONS & FONDU DE FIN

> 🎯 **LE SIMPLE "CUT" EST SOUVENT ROI — LA SOBRIÉTÉ ÉVITE LE SURJEU :**
> Il est inutile et contre-productif de forcer des transitions complexes à chaque changement de plan.
>
> 1. **Le Cut Franc comme Standard Éditorial** :
>    - Pour la majorité des enchaînements, un **simple cut direct**, un **J-cut** (la voix ou l'effet sonore de la scène suivante démarre 0.2s–0.3s avant l'image) ou un **L-cut** est le montage le plus percutant, propre et cinématographique.
>    - Cela évite d'alourdir la vidéo avec des acrobaties visuelles artificielles.
>
> 2. **Quand utiliser les Transitions Élaborées ? (SaaS Premium & Démos Tech)** :
>    - Réserver les transitions complexes et spectaculaires (*Object Zoom Portal*, *Whip Slide*, *Match Cut*, morphing) aux vidéos qui exigent un montage de qualité ultra-premium :
>      - Vidéos promotionnelles et lancements de produits **SaaS & Tech**.
>      - Démos d'interfaces produit dynamiques.
>      - Moments de bascule narrative majeure ou révélation d'un climax.
>
> 3. **Transitions Motivées par un Objet Réel de la Scène** :
>    - Si une transition dynamique est utilisée, elle doit s'appuyer sur un élément physique de la scène :
>      - **Zoom dans une lettre ou un mot-clé** : la caméra plonge dans la boucle d'un « O », d'un « A » ou d'un chiffre qui s'agrandit pour devenir la fenêtre de la scène suivante.
>      - **Élément en rotation & slide** : une étoile, un badge ou une icône effectue une rotation sur elle-même en grossissant, puis effectue un slide latéral pour balayer le cadre.
>      - **Écran ou conteneur d'interface** : un mockup d'ordinateur ou de téléphone s'étend pour devenir la scène suivante.
>
> 4. **Le Fondu Noir en Fin de Vidéo (Fade-to-Black / Outro)** :
>    - **En fin de vidéo, le fondu au noir est 100% autorisé et naturel** : Pour conclure l'histoire, un fondu au noir élégant ou un dézoom progressif s'éteignant doucement apporte la respiration finale nécessaire.
>    - Ce qui est banni, c'est le fondu noir mou *au milieu* de la vidéo entre deux scènes actives, car il casse le rythme. En conclusion, il est parfaitement adapté.
