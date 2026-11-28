# Protocole Obligatoire de Scénarisation, Inventaire et Validation Préalable

> [!IMPORTANT]
> **RÈGLE CRITIQUE D'INTERACTION & DIRECTION ARTISTIQUE** :
> À toute demande de création vidéo formulée par l'utilisateur, l'IA a l'interdiction formelle de coder directement le fichier HTML/JS dans son premier message.
> L'IA doit obligatoirement effectuer la recherche requise, concevoir une vraie narration cinématographique, établir un **Inventaire Scénaristique Détaillé**, et le présenter à l'utilisateur pour validation ou ajustement **AVANT** de passer à l'action.

---

## 1. Pourquoi ce Protocole est Non-Négociable

1. **Éradication des "Vidéos Powerpoint Vides de Sens"** :
   Une vidéo n'est pas une succession de cartes sombres avec des phrases vagues. Chaque vidéo doit raconter une **histoire concrète, captivante et visuellement illustrée**, même lorsqu'il n'y a pas de voix off.
2. **Fin des Découpages Artificiels Rigides (Timing Organique)** :
   Interdiction formelle de découper systématiquement une vidéo en tranches uniformes (ex: 4 scènes de 15s). 
   Le rythme cinématographique est **organique et asymétrique** :
   - Un plan d'impact / hook peut durer **2 à 3 secondes**.
   - Une montée en tension peut durer **5 à 7 secondes**.
   - Un schéma explicatif ou un graphique technique peut durer **8 à 12 secondes**.
   - Une respiration avant le climax peut durer **2 secondes**.
3. **Les Visuels sont des Illustrations Réelles, Pas du Remplissage** :
   Les éléments à l'écran doivent illustrer concrètement le sujet via l'ensemble des compétences et outils du projet :
   - Objets 3D et environnements WebGL (`three.js`).
   - Schémas et mécaniques vectorielles animées (`SVG` interactif).
   - Visualisations de données dynamiques (`Chart.js`, jauges).
   - Cartographies et tracés (`TopoJSON`).
   - Sound design rythmique synchronisé (`sfx.py`, montées de tension, percussions).
4. **Entrées et Sorties Animées Obligatoires** :
   Tout élément visuel ou textuel doit avoir une cinématique d'entrée soignée (stagger, inertie élastique, lueur) ET une cinématique de sortie coordonnée. Zéro apparition brute ou disparition fantôme.

---

## 2. Structure Obligatoire de l'Inventaire Présenté à l'Utilisateur

Avant tout codage, l'IA doit structurer sa proposition comme suit :

### A. Pitch & Angle Éditorial
* **Thème précis et documenté** (recherché sur le web si nécessaire pour garantir la véracité des faits).
* **Émotion et arc dramatique** (Curiosité $\rightarrow$ Tension / Découverte $\rightarrow$ Climax $\rightarrow$ Impact final).

### B. Tableau de Découpage Séquentiel (Timings Organiques)
| Scène / Plan | Timecode | Durée | Narration Visuelle & Action | Outils & Visuels Utilisés | Sound Design (SFX) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **01. Le Hook** | `00:00 - 00:03` | 3s | Choc visuel immédiat, question centrale | Typo cinétique + objet 3D / SVG | Impact lourd + whoosh |
| **02. L'Élément Déclencheur** | `00:03 - 00:09` | 6s | Révélation d'un contraste saisissant | Schéma interactif vectoriel | Ticking + tension |
| **03. L'Accélération** | `00:09 - 00:13` | 4s | Succession rapide de données clés | Compteur dynamique + kinetic text | Glitch + blips numériques |
| ... | ... | ... | ... | ... | ... |

### C. Inventaire des Outils, Scripts & Assets Prévus
* **Audio & Musique** : Nom d'une vraie musique **spécifiquement sélectionnée et téléchargée pour ce sujet** (`fetch_music.cjs --query "..."`, jamais une piste recyclée par défaut ni une synthèse générique), BPM, moments clés de synchronisation, et calibrage SFX discret sous la voix (`build_soundtrack.cjs`).
* **Rythme & Compréhension** : Script narratif suffisamment développé pour rester naturel et fluide (zéro trou artificiel de voix off) OU animations douces et épurées pour laisser le temps de comprendre.
* **Techno visuelle** : 3D Three.js, SVG animé, Charts, particules, mockups.
* **Direction Artistique** : Palette 60/30/10 adaptée au sujet, polices 80/20.

---

## 3. Déclenchement de la Génération
* L'IA attend la confirmation ou les modifications demandées par l'utilisateur (*« C'est bon, tu peux générer »*, *« Change la scène 3 »*, etc.).
* Dès validation, l'IA génère la composition dans `04_Videos/` en respectant scrupuleusement le script validé.

