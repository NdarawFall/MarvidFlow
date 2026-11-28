---
name: gsap_templates
description: Bibliothèque de templates UI et composants motion design GSAP prêts à l'emploi (Bento cards 3D, cartes glassmorphism, metric cards avec compteurs SVG, boutons shimmer, badges pulsants, kinetic text reveals) avec styles CSS premium et timelines GSAP seek-safe testées pour le Studio.
---

# GSAP TEMPLATES & MOTION DESIGN LIBRARY — VibeEditor

Ce skill fournit à l'IA un **catalogue de composants UI prêts à l'assemblage (Lego Blocks)**.
L'IA a l'interdiction de concevoir des cartes, des boutons ou des métriques avec du CSS basique ou des animations GSAP plates (`fade-in` sur rectangle gris). Elle doit obligatoirement puiser dans ces templates standardisés pour garantir un rendu visuel haut de gamme digne des showcases GSAP et CodePen.

---

## 📐 Règles Fondamentales d'Assemblage

1. **Règle des 2 Couleurs Typographiques** :
   - Tout texte/titre utilise **au maximum 2 couleurs** (ex: texte blanc `#ffffff` + mot clé accent `#ef4444` ou `#f59e0b`).
2. **CSS Sub-Pixel & Profondeur** :
   - Ne jamais utiliser de bordures épaisses opaques. Utiliser des dégradés de bordure sub-pixel 1px : `border: 1px solid rgba(255, 255, 255, 0.08)`.
   - Superposer au moins 2 couches d'ombres portées (une ombre de contact nette + une ombre d'ambiance diffuse).
3. **Contrat Technique Studio** :
   - Tous les tweens s'intègrent dans la timeline maîtresse `tl` à un timestamp précis `t`.
   - Utiliser des easings dynamiques : `power3.out`, `expo.out`, ou `back.out(1.5)` pour les pops avec inertie.

---

## 🗂️ Catalogue des Composants

---

### 1. Bento Glass Card (3D Tilt & Glow d'Ambiance)
> **Usage :** Présentation d'un argument clé, d'un produit, d'une fonctionnalité ou d'une carte vedette.

#### Structure HTML :
```html
<div class="bento-card-wrapper" id="cardBento1">
    <div class="bento-card">
        <div class="card-glow"></div>
        <div class="card-inner">
            <div class="card-icon-box">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
            </div>
            <h3 class="card-title">Architecture <span class="highlight-accent">Temps Réel</span></h3>
            <p class="card-desc">Traitement sub-seconde des flux vectoriels avec synchronisation déterministe.</p>
        </div>
    </div>
</div>
```

#### CSS Premium :
```css
.bento-card-wrapper {
    perspective: 1200px;
    display: inline-block;
}

.bento-card {
    position: relative;
    width: 480px;
    padding: 32px;
    border-radius: 24px;
    background: radial-gradient(circle at 0% 0%, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 
        0 20px 50px rgba(0, 0, 0, 0.6),
        0 0 40px rgba(239, 68, 68, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(16px);
    overflow: hidden;
    transform-style: preserve-3d;
}

.card-glow {
    position: absolute;
    top: -50px;
    right: -50px;
    width: 180px;
    height: 180px;
    background: radial-gradient(circle, rgba(239, 68, 68, 0.35) 0%, transparent 70%);
    filter: blur(30px);
    pointer-events: none;
}

.card-icon-box {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.35);
    color: #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
}

.card-title {
    font-size: 26px;
    font-weight: 800;
    color: #ffffff;
    margin-bottom: 12px;
}

.card-title .highlight-accent {
    color: #ef4444;
}

.card-desc {
    font-size: 16px;
    line-height: 1.5;
    color: #94a3b8;
}
```

#### Timeline GSAP :
```javascript
// Entrée 3D percutante avec tilt et redressement fluide
tl.fromTo("#cardBento1 .bento-card", 
    { 
        opacity: 0, 
        y: 60, 
        rotateX: 18, 
        rotateY: -12, 
        scale: 0.9 
    }, 
    { 
        opacity: 1, 
        y: 0, 
        rotateX: 0, 
        rotateY: 0, 
        scale: 1, 
        duration: 0.9, 
        ease: "power3.out" 
    }, 
    t
);

// Révélation de l'icône avec rebond élastique
tl.fromTo("#cardBento1 .card-icon-box",
    { scale: 0, rotate: -30 },
    { scale: 1, rotate: 0, duration: 0.6, ease: "back.out(2)" },
    t + 0.2
);
```

---

### 2. Metric Counter Card (Chiffre animé & Micro-Courbe SVG)
> **Usage :** Chiffre choc, KPI financier, statistique, pourcentage de performance.

#### Structure HTML :
```html
<div class="metric-card" id="metricCard1">
    <div class="metric-header">
        <span class="metric-label">CROISSANCE ANNUELLE</span>
        <span class="metric-badge">+142%</span>
    </div>
    <div class="metric-number-row">
        <span class="metric-prefix">$</span>
        <span class="metric-val" id="metricVal1">0</span>
        <span class="metric-suffix">M</span>
    </div>
    <svg class="metric-chart" viewBox="0 0 300 80">
        <path class="chart-glow" d="M 10 70 Q 75 60 150 40 T 290 15" fill="none" stroke="rgba(239, 68, 68, 0.3)" stroke-width="8"/>
        <path class="chart-line" id="chartLine1" d="M 10 70 Q 75 60 150 40 T 290 15" fill="none" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/>
        <circle class="chart-dot" id="chartDot1" cx="290" cy="15" r="5" fill="#ffffff" stroke="#ef4444" stroke-width="3"/>
    </svg>
</div>
```

#### CSS Premium :
```css
.metric-card {
    width: 440px;
    padding: 28px;
    border-radius: 20px;
    background: #0d1117;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
}

.metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.metric-label {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: #64748b;
}

.metric-badge {
    padding: 4px 10px;
    border-radius: 100px;
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
    font-size: 13px;
    font-weight: 800;
}

.metric-number-row {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 52px;
    font-weight: 900;
    color: #ffffff;
    line-height: 1;
    margin-bottom: 20px;
}

.metric-prefix, .metric-suffix {
    color: #ef4444;
}

.metric-chart {
    width: 100%;
    height: 70px;
    overflow: visible;
}
```

#### Timeline GSAP (Compteur numérique + Tracé SVG) :
```javascript
// 1. Entrée de la carte
tl.fromTo("#metricCard1", 
    { opacity: 0, scale: 0.88, y: 30 },
    { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: "power2.out" },
    t
);

// 2. Compteur chiffré qui monte de 0 à 84
const counterObj = { val: 0 };
const valEl = document.getElementById("metricVal1");

tl.to(counterObj, {
    val: 84,
    duration: 1.4,
    ease: "power2.out",
    onUpdate: () => {
        valEl.innerText = Math.round(counterObj.val).toString();
    }
}, t + 0.2);

// 3. Tracé progressif de la courbe SVG
const chartLine = document.getElementById("chartLine1");
const pathLength = chartLine.getTotalLength();
gsap.set(chartLine, { strokeDasharray: pathLength, strokeDashoffset: pathLength });

tl.to(chartLine, {
    strokeDashoffset: 0,
    duration: 1.4,
    ease: "power2.out"
}, t + 0.2);

tl.fromTo("#chartDot1",
    { scale: 0, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" },
    t + 1.3
);
```

---

### 3. Shimmer Border Button (Bouton d'Action Haut de Gamme)
> **Usage :** Call to action, étape suivante, sélection d'une option.

#### Structure HTML :
```html
<div class="shimmer-btn-wrap" id="shimmerBtn">
    <div class="shimmer-border"></div>
    <button class="shimmer-btn">
        <span class="btn-text">DÉCOUVRIR LE SYSTÈME</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
    </button>
</div>
```

#### CSS Premium :
```css
.shimmer-btn-wrap {
    position: relative;
    display: inline-block;
    padding: 2px;
    border-radius: 100px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.08);
}

.shimmer-border {
    position: absolute;
    inset: -100%;
    background: conic-gradient(from 0deg, transparent 0 340deg, #ef4444 360deg);
    animation: rotateShimmer 3s linear infinite;
}

@keyframes rotateShimmer {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.shimmer-btn {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 36px;
    border-radius: 100px;
    background: #09090b;
    border: none;
    color: #ffffff;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0.8px;
    cursor: pointer;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
}

.shimmer-btn svg {
    color: #ef4444;
    transition: transform 0.3s ease;
}
```

#### Timeline GSAP :
```javascript
tl.fromTo("#shimmerBtn",
    { opacity: 0, scale: 0.7, y: 20 },
    { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: "back.out(1.8)" },
    t
);
tl.to("#shimmerBtn svg", { x: 4, duration: 0.3, repeat: 3, yoyo: true, ease: "sine.inOut" }, t + 0.6);
```

---

### 4. Pill Status Badge (Pulsing Glow)
> **Usage :** État d'un système, badge de confirmation, indicateur live.

#### Structure HTML :
```html
<div class="status-badge" id="statusBadge">
    <span class="pulse-dot">
        <span class="pulse-ring"></span>
    </span>
    <span class="badge-text">OPÉRATIONNEL • <span class="badge-highlight">LIVE</span></span>
</div>
```

#### CSS Premium :
```css
.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 18px;
    border-radius: 100px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    backdrop-filter: blur(10px);
}

.pulse-dot {
    position: relative;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ef4444;
}

.pulse-ring {
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 1.5px solid #ef4444;
    animation: pingRing 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes pingRing {
    0% { transform: scale(1); opacity: 0.9; }
    100% { transform: scale(2.6); opacity: 0; }
}

.badge-text {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 1.2px;
    color: #ffffff;
}

.badge-highlight {
    color: #ef4444;
}
```

---

### 5. Masked Split-Words Kinetic Title (Titre Cinématique Studio)
> **Usage :** Titre de scène majeur ou phrase d'accroche sans saut de ligne.

#### Structure HTML :
```html
<h1 class="split-kinetic-title" id="mainTitle">
    <span class="word-wrapper"><span class="word-inner">Le</span></span>
    <span class="word-wrapper"><span class="word-inner">Futur</span></span>
    <span class="word-wrapper"><span class="word-inner">de</span></span>
    <span class="word-wrapper"><span class="word-inner">la</span></span>
    <span class="word-wrapper"><span class="word-inner highlight-word">Création</span></span>
</h1>
```

#### CSS Premium :
```css
.split-kinetic-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 64px;
    font-weight: 900;
    color: #ffffff;
    line-height: 1.15;
    text-align: center;
}

.word-wrapper {
    display: inline-block;
    overflow: hidden;
    vertical-align: top;
    margin: 0 4px;
}

.word-inner {
    display: inline-block;
}

.highlight-word {
    color: #ef4444; /* Exactement 2 couleurs : blanc et rouge */
}
```

#### Timeline GSAP (Révélation masquée mot par mot fluide) :
```javascript
tl.fromTo("#mainTitle .word-inner", 
    { y: "115%", rotate: 4 },
    { 
        y: "0%", 
        rotate: 0, 
        duration: 0.85, 
        stagger: 0.08, 
        ease: "power3.out" 
    }, 
    t
);
```

---

## 🚀 Guide d'Utilisation Immédiate pour l'IA

Quand l'IA génère une vidéo avec des interfaces ou des cartes :
1. **Identifier le type d'élément** : Titre cinématique $\rightarrow$ Template 5 ; Chiffre/Stat $\rightarrow$ Template 2 ; Argumentation $\rightarrow$ Template 1 ; CTA $\rightarrow$ Template 3.
2. **Copier les blocs HTML et CSS exacts** en adaptant les libellés et l'accent couleur (`#ef4444`, `#f59e0b`, `#06b6d4`, etc.).
3. **Placer les séquences GSAP sur la timeline maîtresse `tl`**.

---

## ⚙️ Règle Infaillible de Rotation SVG (Roues, Engrenages, Objectifs, Cercles)

> [!CAUTION]
> **ZÉRO ROTATION SVG AVEC `transformOrigin` — UTILISER IMPÉRATIVEMENT `svgOrigin`** :
> Sur un élément SVG centré en `(0, 0)`, GSAP calcule `transformOrigin` par rapport au coin haut-gauche `(-R, -R)` de `.getBBox()` (ou `{0, 0}` si un parent est en `display: none`), injectant une orbite parasite pouvant dépasser 250 px ! Utiliser **`svgOrigin: '0 0'`** (ou `'cx cy'` en coordonnées SVG) qui force GSAP à écrire `transform="matrix(cos, sin, -sin, cos, 0, 0)"` avec **0.0 px de dérive**.

1. **Enveloppe Pivot Centrée sur `(0, 0)`** :
   ```html
   <g transform="translate(360, 420)">
       <g id="monEngrenage">
           <!-- Tout tracé centré mathématiquement autour de (0, 0) -->
           <circle cx="0" cy="0" r="170" .../>
       </g>
   </g>
   ```
2. **Tween GSAP avec `svgOrigin: '0 0'` OBLIGATOIRE (ou `'cx cy'` pour un élément direct)** :
   ```javascript
   tl.set('#monEngrenage', { svgOrigin: '0 0' }, 0)
     .to('#monEngrenage', {
         rotation: 360,
         svgOrigin: '0 0',
         duration: 2.0,
         ease: 'none'
     }, t);
   ```
3. **Dents / Pointillés Symétriques sur Circonférence ($2\pi R / N$)** :
   - Ne jamais choisir des `stroke-dasharray` arbitraires. Pour $N$ dents sur un cercle de rayon $R$, poser `step = (2 * Math.PI * R) / N`, puis `dash = step * 0.58` et `gap = step * 0.42` afin qu'aucune couture asymétrique ne déforme la rotation.


