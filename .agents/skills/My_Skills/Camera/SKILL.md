---
name: Camera
description: Mouvements de caméra cinématographiques, transitions de scènes et navigation 3D Three.js en GSAP seek-safe (slow push-in, crash zoom, whip pan avec flou de mouvement SVG déterministe 60 FPS, pull-back, dolly parallaxe 3D, camera shake d'impact, orbital 3D, vertigo effect).
---

# CAMERA & DYNAMIC MOVEMENTS — VibeEditor

Ce skill est divisé en **deux guides spécialisés** :

1. 👉 **Transitions 2D, Cadrage & Mouvements dans la Scène : [`camera_transition.md`](./camera_transition.md)**
   - **Flou de Mouvement de Caméra Déterministe 60 FPS (SVG `<feGaussianBlur>`)** : Remplacement du CSS blur omnidirectionnel par un filtre SVG ultra-rapide piloté en GSAP (`#cameraBlurFilter` sur l'attribut `stdDeviation`). Permet des whip-pans horizontaux nets, verticaux ou des crash-zooms cinématiques avec zéro drop de framerate et scrubbing fluide.
   - **Règle d'Or du Cadrage & Zoom Intelligent** : Interdiction du zoom aveugle / centré par défaut. La caméra cible impérativement le sujet d'intérêt (card, visage, métrique, logo) avec marge de sécurité (80-120px) sans jamais couper le sujet.
   - **Tracking & Accompagnement cinétique** : Suivi fluide des carousels, défilements Top 10 et actions mobiles (saut, course) pour maintenir l'élément au cœur du regard.
   - **Zooms d'expressions faciales** : Punch-in cinématique ciblé sur les visages lors des réactions (choc, rire, tension) pour décupler l'impact émotionnel.
   - **Loi Absolue Anti-Répétition & Diversification** : Interdiction de répéter la même chorégraphie sur deux scènes consécutives. Chaque scène doit avoir une identité visuelle et spatiale propre.
   - **Modulation du Rythme (Pacing & Respiration)** : Distinguer les moments posés/majestueux (0.9s–1.2s + maintien 1.5s–2s pour absorption cognitive) des moments d'impacts rapides (0.25s–0.38s sur chiffres clés). Zéro animation monotone ou uniformément rushée.
   - **Interdiction des Storyboards Stéréotypés** : Ne jamais recycler automatiquement le schéma cliché (Bento $\rightarrow$ Code $\rightarrow$ Orbe) ; concevoir une narration visuelle originale adaptée au produit spécifique.
   - **Couplage Obligatoire avec `text_animation`** : Synchronisation obligatoire des mouvements de caméra avec l'apparition des titres animés **mot par mot** (`titleFadeWordsUp`).
   - Explique en détail **quand zoomer** (slow push-in, crash zoom, macro focus), **quand dézoomer** (pull-back, respiration), **quand glisser/pan** et **quand déclencher une transition**.
   - Contient le catalogue des **transitions cinématographiques** : Cut Franc (standard sobre et direct), J-Cut/L-Cut, Whip Pan cinétique, Zoom-Through Portal (zoom dans un objet/étoile/mot), Directional Slide et Flash Cut.
   - **Règle de Sobriété Éditoriale** : Ne pas surjouer les transitions partout. Un simple cut franc est souvent le plus propre ; réserver les transitions spectaculaires aux vidéos SaaS premium et démos tech.
   - **Fondu Noir d'Outro** : Le fondu noir est 100% légitime en fin de vidéo pour clore élégamment la séquence.

2. 👉 **Navigation & Espace 3D Three.js : [`camera_3D.md`](./camera_3D.md)**
   - Explique tout ce qui concerne les **scènes Three.js / WebGL**, les coordonnées spatiales ($X, Y, Z$), les angles d'Euler et la perspective.
   - Contient les **6 mouvements majeurs de caméra 3D** : Travelling orbital 360°, Dolly In avec profondeur, Effet Vertigo (Dolly Zoom), Dutch Angle roulis, Fly-Through de traversée et Shake 3D déterministe.
   - Intègre les règles d'éclairage studio daylight synchronisé et le respect strict des 4 fonds autorisés.

---

## 📐 Règle d'Or Technique (Seek-Safety & Déterminisme)

Tout mouvement de caméra (2D ou 3D) doit impérativement être piloté par la **timeline maîtresse GSAP (`tl`)** :
- **Interdiction formelle** de `requestAnimationFrame` autonome, de `setTimeout` ou d'oscillateurs aléatoires `Math.random()`.
- Les caméras doivent être prédictives et réversibles pour garantir un scrubbing parfait dans le Studio et un rendu frame-by-frame exact sous Puppeteer (`render.cjs`).
