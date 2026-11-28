---
name: montage_storytelling
description: Savoir-faire de monteur pour VibeEditor — hooks, structure et rétention (short et long), rythme de coupe, choix texte/image/vidéo/article/carte/chiffre pour illustrer, transitions motivées, plan de scènes JSON et checklist qualité.
---

# MONTAGE & STORYTELLING — VibeEditor

Le montage sert une seule chose : **garder le spectateur jusqu'à la fin**. Chaque plan doit répondre à « pourquoi maintenant, pourquoi ça ? ». Sans réponse, on le retire.

## 1. Le hook

### 1.1 Anatomie (0–3 s en short, 0–15 s en long)
1. **Image à t = 0** : du mouvement, un visuel fort. Jamais de noir, de logo, d'intro, de « Salut à tous », ni de « dans cette vidéo nous allons ».
2. **Voix dès 0–0.2 s.**
3. **Texte ≤ 6 mots**, mot-choc en `slam` ou `maskReveal` rapide.
4. **Une promesse ou une tension** claire avant 3 s (short) / 15 s (long) : le spectateur sait ce qu'il gagne ou ce qu'il risque.
5. SFX d'impact synchronisé sur le mot-choc (voir `sound_design`).

### 1.2 Formules (adapter au sujet)
| Type | Modèle |
|---|---|
| Chiffre choc | « Cette entreprise perd 3 milliards par jour. Personne n'en parle. » |
| Contre-pied | « Tout ce qu'on t'a dit sur X est faux. » |
| Boucle ouverte | « Il y a une raison pour laquelle X… et elle est pire que tu ne le crois. » |
| In medias res | Commencer sur l'instant le plus fort, puis « 3 jours plus tôt… » |
| Question à enjeu | « Et si ton téléphone t'écoutait vraiment ? » |
| Promesse + délai | « En 60 secondes, tu vas comprendre pourquoi… » |
| Interruption visuelle | Plan inattendu + texte en contradiction avec l'image |
Règles : spécifique > vague (« 3 milliards » > « beaucoup ») ; une seule idée ; pas de réponse dans le hook (on ouvre une boucle, on la ferme plus tard) ; le hook doit être vrai : le contenu tient la promesse.

## 2. Structure et rétention

### Long (8–20 min)
```
Hook (0–15 s) → Contexte / enjeux (15–45 s) → Chapitre 1 → … → Chapitre N → Paiement final → CTA (≤ 10 s)
```
- Un **mini-hook** à chaque début de chapitre ou toutes les 45–90 s : « mais ce n'est pas le plus grave », « et c'est là que tout bascule ».
- **Interruption de pattern** toutes les 20–30 s : changer de type de visuel (plein cadre → split → carte → graphique → capture).
- Courbe d'intensité : monter par paliers, pas en continu ; une respiration (plan calme, pause) avant chaque pic.
- Résumer l'enjeu vers 60 % de la vidéo (les gens décrochent au milieu).
- Fin : payer la promesse du hook explicitement, puis un seul CTA court.

### Short (15–45 s, idéal 25–35 s)
```
Hook (0–3 s) → Montée (3–20 s) → Chute / payoff (20–30 s) → Boucle ou CTA intégré
```
- Changement visuel **toutes les 1.5–3 s** (cut, zoom, changement de texte).
- Pas de CTA séparé : l'intégrer à la dernière phrase ; ou terminer sur une phrase qui se raccorde au début (boucle).
- Une seule idée. Si le script a deux idées, ce sont deux shorts.

## 3. Rythme de coupe
| | Short | Long |
|---|---|---|
| Durée moyenne d'un plan | 1.5–3 s | 4–8 s |
| Plan fixe max sans changement | 3 s | 8 s |
| Image fixe minimale | 1.2 s (avec Ken Burns) | 2 s |
| B-roll vidéo | 1.5–3 s | 2–5 s |
- Couper **sur le début d'un mot** ou sur un mot accentué ; un visuel qui illustre un mot apparaît **0.1–0.25 s avant** ce mot (le cerveau lit l'image puis entend le mot).
- **Priorité à la compréhension sans coupure de voix artificielle** : Ne jamais sacrifier la compréhension pour respecter un chrono arbitraire, ni hacher une voix off continue par des trous de silence artificiels. Pour donner le temps de comprendre : **allonger et développer naturellement le script narratif** ou **alléger les écrans (moins d'éléments, animations plus douces)** en parfaite synchro avec la voix continue.
- **Musique sur-mesure & SFX discrets** : Réfléchir à l'émotion exacte du récit et télécharger un vrai morceau adapté (`fetch_music.cjs --query "..."`, sans réutiliser la même boucle ni créer de synthèse médiocre) ; maintenir tous les SFX clairement en dessous de la voix (`<= -30 dBFS` sous `-14 LUFS`, via `build_soundtrack.cjs`).
- **J-cut / L-cut** : l'audio de la scène suivante démarre 150–300 ms avant l'image (ou inversement) pour fluidifier.
- Accélérer en approchant du climax (plans de plus en plus courts), ralentir pour la chute.
- Ne jamais couper dans un mouvement de fond d'une manière qui casse la direction (gauche→droite puis cut droite→gauche sans raison).

## 4. Illustrer : texte, image, vidéo, article, carte, chiffre
Règle d'or : **ne pas redire à l'écran ce qui est dit**. L'écran apporte ce que la voix ne peut pas : preuve, lieu, échelle, émotion, structure.

| Ce que dit la voix | Meilleure illustration | Outil |
|---|---|---|
| Un chiffre, un pourcentage, un prix | Compteur animé ou graphique | `counter`, `chart.js` |
| Une évolution dans le temps | Courbe / barres animées | `chart.js` |
| Un lieu, un pays, un trajet | Carte animée + drapeau | `fetch_map.cjs`, `fetch_flag.cjs` |
| Un club / équipe de football | Logo officiel HD PNG/SVG | `fetch_football_logo.cjs` |
| Une entreprise, une marque citée (voix/script) | **Toujours illustrer** par son logo officiel téléchargé et affiché en grand (ou typographie éditoriale assumée si logo absent) | `brandfetch.cjs` |
| Une affirmation à prouver / une source | Capture de l'article avec phrase surlignée | `record_web.cjs` + `highlight` |
| Une personne | Photo détourée ou archive **fidèle à l'âge et à la date exacte du récit** | `remove_bg.cjs`, `coverr.cjs` |
| Une action concrète (courir, payer, taper) | B-roll littéral | `coverr.cjs` |
| Un concept abstrait (inflation, peur, IA) | Métaphore visuelle, 3D, motion | `three` |
| Un mot-clé à retenir | Texte seul (1–4 mots) | `text_animation` |
| Une citation | Carte de citation, `typewriter` | `text_animation` |
| Une liste / des étapes | Liste révélée un item à la fois | `text_animation` |
| Une comparaison / duel / tuto | Split-Screen (50/50, Diagonale, Slider Avant/Après, Fond Flou Réf 2, Bandeau Incurvé Réf 3) | `02_Composants/Split_Screen/split_screen.css` |
| Un processus / un schéma | Tracé manuscrit ou diagramme | `build_video_handwriting.cjs` |
**Texte seul** : uniquement chiffres, noms propres, titres de chapitre, mots-clés (1–4 mots), citations. Jamais une phrase entière qui double la voix.
**Image fixe** : toujours animée (Ken Burns). Éviter les images génériques de banque d'images sans rapport : mieux vaut une carte, un chiffre ou un texte qu'un faux B-roll.
**B-roll** : choisir les 2 secondes les plus fortes du clip, pas le début ; ne jamais réutiliser le même clip ; privilégier les plans avec mouvement réel dirigé.
- **Contrat d'intégration HTML5 & Studio** :
  * **Détection & Nettoyage de Gel au Début (freezedetect)** : Tout clip vidéo téléchargé ou sourcé doit impérativement être vérifié via `ffmpeg -i <file> -vf freezedetect=n=-60dB:d=0.5 -f null -`. Si un gel statique initial est détecté (titre fixe, freeze d'intro de 1s à 4s), il est **OBLIGATOIRE** de couper le début avec `ffmpeg -ss <T_debut_mouvement> -i <file> -c:v libx264 -preset fast -crf 18 -movflags +faststart <trimmed>` pour que le mouvement de caméra soit immédiat dès la milliseconde 0.
  * **Maintien du Pipeline GPU (Zéro display: none)** : Ne jamais utiliser `display: none` sur les conteneurs `.scene` qui hébergent des balises `<video>`. En Chromium et Puppeteer, `display: none` détruit le cache de décodage GPU et provoque un freeze/stutter au changement de scène. Utiliser obligatoirement :
    `display: flex; position: absolute; inset: 0; visibility: hidden; opacity: 0; pointer-events: none;`
    et basculer `visibility: visible / hidden` via `syncSceneVisibility(t)` synchronisé avec la timeline GSAP.
  * Déclarer OBLIGATOIREMENT les attributs temporels natifs : `<video id="brollVideo" src="..." data-start="T0" data-end="T1" data-duration="DUR" muted loop playsinline preload="auto"></video>`.
  * En mode Studio (`isIframeMode === true`), le Studio pilote la vidéo à 100% de manière fluide et automatique. Le code JS de la composition a l'interdiction d'appeler `play()`, `pause()` ou de toucher à `currentTime`.
  * Bannir les teasers de promotion découpés en photos (diaporama) : n'utiliser que des prises de vue d'action réelle filmées en continu à 60 FPS.
  * Zéro étiquette factice (« LIVE BROADCAST », « DIRECT TV ») : laisser le lecteur épuré et propre.
- **Règle de Silence & Scrubbing de la Timeline** :
  * Si la consigne utilisateur demande « sans musique » ou « sans audio », la composition ne doit comporter AUCUNE balise `<audio>` et AUCUN déclenchement de son.
  * Pendant le déplacement du curseur (scrub / seek) de la timeline dans le Studio, le silence absolu doit être respecté : aucun son parasite ne doit jouer pendant le glissement.
- **Rythme Posé & Animations Déliées (Zéro Mouvement Rushé)** :
  * Ne jamais précipiter les éléments avec des durées trop courtes (bannir les animations à 0.3s-0.4s sur du contenu documentaire, corporate ou d'actualité).
  * Les titrages, punchlines et cartes doivent s'animer de manière majestueuse et lisible : durées de **0.9s à 1.2s** avec easing progressif (`power2.out`), stagger aéré (0.10s à 0.14s entre les mots), pour donner une sensation d'envergure et d'élégance.
**Preuve avant opinion** : quand on avance un fait contestable, montrer la source dans les 2 s.
Alterner les types : jamais 3 plans du même type d'affilée.

### 4.4 Montage Shorts pour Clients & Rushes Bruts (Dossier `10_Clients/`)
- **Rôle éditeur Short** : L'utilisateur exerce également en tant qu'éditeur de vidéos courtes (Shorts, Reels, TikTok).
- **Emplacement des rushes non montés** : Toutes les vidéos brutes et enregistrements non montés transmis par les clients sont centralisés dans le dossier racine `10_Clients/<nom_client>/`.
- **Confidentialité & Zéro Clutter Git** : Ce dossier est strictement exclu du suivi Git (seul `10_Clients/.gitkeep` et `README.md` sont conservés). Les médias volumineux et confidentiels des clients restent 100% locaux.
- **Workflow de montage pour clients** :
  1. Découpage dynamique des temps morts et des respirations inutiles.
  2. Habillage visuel vertical 9:16 percutant (typographie cinétique mot par mot, b-rolls d'illustration, zooms légers de recadrage).
  3. Export des compositions finales dans `04_Videos/` ou `03_Chaines/` sans jamais altérer les fichiers bruts d'origine dans `10_Clients/`.

## 5. Transitions
Principe : **80 % de cuts secs**. Une transition doit avoir une raison (changement de lieu, de temps, de chapitre, ou énergie).
| Transition | Quand | Durée |
|---|---|---|
| Cut sec | défaut, même idée | 0 |
| Match cut (forme/mouvement identique) | enchaîner deux idées liées | 0 |
| Whip (glissement + flou) | énergie, changement de sujet (short) | 0.25–0.35 s |
| Zoom-through | passage à un nouveau lieu/chapitre | 0.3–0.4 s |
| Wipe `clip-path` | comparaison, avant/après | 0.35–0.5 s |
| Glitch | tech, tension, rupture | 0.15–0.3 s |
| Fondu enchaîné | passage du temps, émotion | 0.5–0.8 s (long uniquement) |
| Fondu au noir | fin de séquence, deuil, chute | 0.6–1 s |
Short : 0.15–0.3 s ; long : 0.3–0.5 s. Une seule famille de transitions par vidéo (+ le cut). Chaque transition = un SFX (`sound_design`).

```css
.scene{position:absolute;inset:0;visibility:hidden;opacity:0}
```
```js
const T={
  cut:(tl,o,i,t)=>{tl.set(o,{autoAlpha:0},t).set(i,{autoAlpha:1},t)},
  whip:(tl,o,i,t,d=.3)=>{
    tl.set(i,{autoAlpha:1},t)
      .fromTo(o,{xPercent:0,filter:'blur(0px)'},{xPercent:-100,filter:'blur(20px)',duration:d,ease:'power3.inOut'},t)
      .fromTo(i,{xPercent:100,filter:'blur(20px)'},{xPercent:0,filter:'blur(0px)',duration:d,ease:'power3.inOut'},t)
      .set(o,{autoAlpha:0,xPercent:0,filter:'none'},t+d)},
  zoom:(tl,o,i,t,d=.35)=>{
    tl.fromTo(i,{autoAlpha:0,scale:.82},{autoAlpha:1,scale:1,duration:d,ease:'power3.out'},t)
      .to(o,{autoAlpha:0,scale:1.5,duration:d,ease:'power3.in'},t)
      .set(o,{scale:1},t+d)},
  wipe:(tl,o,i,t,d=.45)=>{
    tl.set(i,{autoAlpha:1,zIndex:10},t)
      .fromTo(i,{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0% 0 0)',duration:d,ease:'expo.inOut'},t)
      .set(o,{autoAlpha:0},t+d).set(i,{zIndex:1,clipPath:'none'},t+d)},
};
```
Les scènes sortante et entrante se chevauchent sur la durée `d` : prévoir que la scène entrante démarre ses animations internes à `t + d·0.6`.

## 6. Plan de scènes (contrat pour `ai_director.cjs`)
Le LLM doit d'abord produire ce plan, puis seulement le code :
```json
{
  "format": "9x16", "duration": 32, "style": "docu_sombre",
  "scenes": [
    { "id": "s01", "t0": 0.0, "t1": 2.8, "role": "hook",
      "voice": "Cette entreprise perd 3 milliards par jour.",
      "visual": { "type": "fullframe_text", "main": "3 MILLIARDS", "anim": "slam" },
      "bg": { "type": "broll", "query": "empty office night" },
      "transition_out": "cut", "sfx": [ { "id": "hit_01", "at": 0.35 } ] },
    { "id": "s02", "t0": 2.8, "t1": 6.0, "role": "proof",
      "visual": { "type": "web_capture", "url": "…", "highlight": "perd 3 milliards" },
      "transition_out": "whip", "sfx": [ { "id": "whoosh_01", "at": 5.8 } ] }
  ]
}
```
Champs `role` : `hook`, `context`, `escalation`, `proof`, `data`, `place`, `list`, `payoff`, `cta`. Contraintes à valider avant génération : durée moyenne des plans dans la fourchette du §3 ; pas 3 `visual.type` identiques d'affilée ; une scène `proof` après chaque affirmation chiffrée ; `hook` ≤ 3 s (short).

## 7. Style : adapter à la chaîne
| Style | Rythme | Transitions | Texte | Musique |
|---|---|---|---|---|
| Docu sombre (Vox/enquête) | moyen-lent | cuts, fondus, zoom-through | sobre, sérif/grotesque | tension, drones |
| Tech / IA / SaaS | rapide | whip, glitch, wipe | néon, mono, scramble | électro discret |
| Finance | moyen | cuts, wipe | chiffres géants, vert/or | calme, constante |
| Short viral | très rapide | cuts + whip | sous-titres karaoké, jaune | beat marqué |
| Storytelling | variable | fondus, J/L-cuts | minimal | émotionnelle |

## 8. Erreurs fréquentes
- Intro de 10 s avant le sujet → supprimer.
- Illustration littérale de chaque mot → illustrer l'idée, pas le mot.
- Même transition partout → monotonie.
- Texte long sur écran qui double la voix → ne garder que le mot-clé.
- Images génériques sans rapport → remplacer par donnée, carte ou texte.
- Aucun répit visuel → ajouter des plans calmes entre les pics.
- Promesse du hook jamais tenue → réécrire le hook ou le payoff.
- CTA répété 3 fois → un seul, court.
- Musique/SFX qui couvrent l'information clé → voir `sound_design`.
- Balise `<video>` sans attributs `data-start` / `data-end` → le Studio calcule un décalage depuis t=0 et gèle la vidéo ou la fait sauter à 60 Hz.
- Manipulation JS manuelle de la vidéo en mode Studio (`video.play()`, `currentTime`) → conflit destructeur avec la boucle du Studio.
- Teaser institutionnel utilisé comme B-roll → effet diaporama d'images fixes découpées, exiger une vraie vidéo d'action continue.
- Ajout d'étiquettes factices « LIVE BROADCAST » → AI slop strictement interdit.
- Révélation prématurée du produit en intro (spoiler logo / « X présente Y ») → Interdiction formelle de montrer le logo ou le nom du produit dès l'Acte 1 ; poser d'abord le décor, une atmosphère mystérieuse ou une question existentielle pour faire monter la tension dramatique avant la révélation.
- Fausse interface IA à base de « cartes marketing » → Dans une UI de chat (ChatGPT, SaaS), l'IA ne répond jamais avec des cartes multicolores factices. Exiger une vraie réponse : paragraphe limpide, tableau Markdown structuré, liste à puces et curseur de streaming clignotant.
- Barre de progression ou minuteur non sollicité → Ne jamais insérer de barre de progression (timeline line) en bas d'écran ni de timer dans les coins sauf demande explicite.

## 9. Checklist qualité avant rendu
- [ ] Hook : image forte à 0 s, voix à 0–0.2 s, promesse avant 3 s (short) / 15 s (long).
- [ ] Un changement visuel à la cadence cible (§3).
- [ ] Chaque affirmation chiffrée a une preuve ou un compteur à l'écran.
- [ ] Pas de plan statique, pas de layout répété 3 fois, pas de transition gratuite.
- [ ] Mini-hooks / pattern interrupts aux bons intervalles (long).
- [ ] Fin : promesse payée, CTA unique ≤ 10 s (long) ou intégré/boucle (short).
- [ ] Revoir la vidéo sans le son (le message passe-t-il ?), puis sans l'image (l'audio seul est-il clair ?).
- [ ] Durée totale = durée du script remappé, aucune scène vide en fin.
- [ ] B-roll vidéo : balise `<video>` avec `data-start`, `data-end`, `data-duration`, vraie séquence 60 FPS continue et zéro badge factice.
