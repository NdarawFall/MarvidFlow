---
name: sound_design
description: Coupes basées sur les timestamps mot à mot (Whisper) avec marges avant/après, gestion des silences et pauses dramatiques, remapping des cues, puis sound design complet (SFX synchronisés, musique, ducking, niveaux, loudness -14 LUFS) pour vidéos longues et shorts dans VibeEditor.
---

# SOUND DESIGN & COUPES — VibeEditor

L'audio fait 50 % de la perception de qualité. Une vidéo moyenne avec un son propre paraît pro ; l'inverse est faux. Deux parties : **A. couper** (Whisper), **B. habiller** (SFX, musique, mix).

---
## PARTIE A — COUPER AVEC WHISPER

### A1. Principe
1. Transcrire la voix → liste de mots `{w, s, e}` (secondes).
2. Calculer les silences entre mots.
3. Garder les petites pauses (respiration, rythme), raccourcir les longues, jamais couper une attaque ou une queue de mot.
4. **Remapper tous les timings** (sous-titres, scènes, SFX) sur la nouvelle durée.
Une voix ElevenLabs n'a presque pas de silences parasites : on n'applique la coupe qu'aux voix enregistrées, ou pour resserrer des pauses de script. Si l'API fournit des timestamps natifs, ils sont plus précis que Whisper : les préférer.

### A2. Marges (la règle qui fait la différence)
- **Pré-roll** avant le début du mot : 80–120 ms (long) / 50–80 ms (short). Whisper donne souvent un `start` trop tardif de 50–150 ms ; les consonnes plosives (p, t, k, b, d, g) et les « s » faibles se font manger sinon.
- **Post-roll** après la fin du mot : 150–250 ms (long) / 90–140 ms (short). Les fins de mots (n, r, voyelles tenues) traînent.
- **Jamais** couper en plein mot, dans une liaison, ou entre deux mots collés (« qu'est-ce que », « c'est-à-dire »).
- Fondu de 10–15 ms sur chaque coupe (fade in/out) pour éviter les clics.
- Laisser une respiration naturelle (≥ 120 ms) avant un mot important : une voix sans respiration est fatigante.
- **Pause dramatique** : avant une chute, un chiffre, un « mais… » : garder 400–700 ms (long) / 250–400 ms (short). Elle est dans le script, pas un défaut.

| Preset | preRoll | postRoll | wordPause | sentencePause |
|---|---|---|---|---|
| Long (docu, tuto) | 0.10 | 0.18 | 0.45 | 0.80 |
| Short (rythmé) | 0.05 | 0.09 | 0.22 | 0.35 |
`wordPause` = pause max conservée entre deux mots d'une même phrase ; `sentencePause` = après `. ? ! …`. Au-delà, on coupe.

### A3. Code : liste de coupes + remapping des cues
```js
// 07_Scripts/lib/cutlist.cjs
function buildCutList(words,{preRoll=.10,postRoll=.18,wordPause=.45,sentencePause=.8,total=Infinity}={}){
  const segs=[]; let cur={s:Math.max(0,words[0].s-preRoll),e:words[0].e+postRoll};
  for(let i=1;i<words.length;i++){
    const a=words[i-1],b=words[i],gap=b.s-a.e;
    const allowed=/[.?!…]$/.test(a.w)?sentencePause:wordPause;
    if(gap<=allowed||gap<=preRoll+postRoll){cur.e=b.e+postRoll}      // pause conservée telle quelle
    else{segs.push(cur);cur={s:b.s-preRoll,e:b.e+postRoll}}             // on coupe ici
  }
  segs.push(cur); segs.forEach(g=>{g.e=Math.min(g.e,total)}); return segs;
}
function remapCues(words,segs){            // → nouvelles cues sur la durée raccourcie
  let acc=0; const m=segs.map(g=>{const o={...g,off:acc};acc+=g.e-g.s;return o});
  const cues=[];
  for(const w of words){
    const g=m.find(g=>w.s>=g.s-1e-3&&w.s<g.e); if(!g) continue;
    cues.push({...w,s:w.s-g.s+g.off,e:Math.min(w.e,g.e)-g.s+g.off});
  }
  return {cues,duration:acc,segs:m};
}
module.exports={buildCutList,remapCues};
```
Application FFmpeg sur un fichier voix (si plus de ~80 segments, passer par `-filter_complex_script`) :
```js
function ffmpegCutFilter(segs,fade=.012){
  const p=segs.map((g,i)=>`[0:a]atrim=${g.s.toFixed(3)}:${g.e.toFixed(3)},asetpts=PTS-STARTPTS,`+
    `afade=t=in:d=${fade},afade=t=out:st=${(g.e-g.s-fade).toFixed(3)}:d=${fade}[a${i}]`);
  return p.join(';')+';'+segs.map((_,i)=>`[a${i}]`).join('')+`concat=n=${segs.length}:v=0:a=1[out]`;
}
```
Si la vidéo contient un visage (jump cuts), utiliser les mêmes `segs` en `trim/setpts` vidéo et alterner un léger punch-in (100 % ↔ 108 %) à chaque coupe pour masquer le saut. Dans VibeEditor (timeline HTML), la coupe = remapper les temps ; la source média reste la même, seul l'ordre/les offsets changent.

### A4. Pièges Whisper → parades
| Problème | Parade |
|---|---|
| `start` trop tardif, mots mangés | Pré-roll obligatoire (A2) ; ne jamais couper à `start` exact |
| Hallucinations dans les silences/musique (phrases répétées) | Couper les silences avant transcription ou vérifier avec `ffmpeg -af silencedetect=noise=-35dB:d=0.3` ; rejeter un mot dont l'énergie est nulle |
| Les « euh », « hum » ne sont pas transcrits | Détecter par les trous : un trou de 0.25–0.6 s au milieu d'une phrase est souvent un filler ; le raccourcir sans toucher aux mots |
| Noms propres, mots wolof, anglicismes mal écrits | `initial_prompt` avec le vocabulaire du script ; forcer `language:'fr'` ; corriger l'affichage avec le script source, garder les timings Whisper |
| Timestamps non monotones | Trier, forcer `s[i] ≥ e[i-1]`, supprimer les mots de durée ≤ 0 |
| Mélange français/wolof | Alignement manuel ou découpage par phrase ; ne pas faire confiance au mot-à-mot |
| Voix + musique forte → mauvaise transcription | Transcrire la piste voix isolée, jamais le mix |
Toujours aligner le texte final sur le **script approuvé** (il est la vérité orthographique), Whisper n'apporte que le temps.

### A5. Où couper dans une vidéo
- Silence ≥ 0.35 s hors pause voulue → raccourcir (cf. presets).
- Faux départs, répétitions, « donc, euh » → supprimer le segment entier, de la fin du dernier mot propre au début du suivant, marges incluses.
- Débuter sur le premier mot (short : 0 ms de blanc avant la voix). Finir 0.3–0.5 s après le dernier mot (long) ou sur le dernier mot (short, boucle).
- Couper **sur l'action visuelle** ou le changement de phrase, pas au milieu d'une idée.
- Un cut visuel tombe au début d'un mot accentué ou sur un temps fort musical.

---
## PARTIE B — SOUND DESIGN

### B1. Les 4 couches
1. **Voix** — toujours dominante, mono → stéréo centrée, High-pass 80 Hz, léger de-ess si dur.
2. **Musique** — lit sous la voix, jamais en concurrence.
3. **SFX** — ponctuent l'image (transitions, textes, impacts).
4. **Ambiance** (optionnel) — textures très basses (foule, bureau, pluie), −30 dB.

### B2. Niveaux relatifs à la voix (RMS)
| Élément | Niveau | Remarque |
|---|---|---|
| Voix | 0 dB (réf.) | cible master −14 LUFS intégré, true peak ≤ −1 dBTP (`normalize_audio.cjs`) |
| Musique sous voix | −18 à −22 dB | long : −20 · short : −16 |
| Musique sans voix (intro/outro) | −8 à −12 dB | remonter en 0.8 s |
| Whoosh / transition | −12 dB | |
| Impact / hit (hooks, chiffres) | −6 dB | max 1 par scène |
| UI (pop, click, tick) | −16 dB | |
| Riser | −14 dB | 1–3 s avant un reveal |
| Ambiance | −30 dB | |
**Ducking** : la musique baisse de 10–14 dB pendant la voix (attaque 40 ms, relâchement 400–500 ms).

### B2.bis Calibrage Spécifique Vidéo Sans Voix Off (Musique Réelle + SFX Calibrés par True Peak)
> ⚠️ **PIÈGES CRITIQUES À ÉVITER IMPÉRATIVEMENT** :
> 1. **Qualité musicale** : Toujours utiliser une vraie musique instrumentale/cinématique (`node 07_Scripts/fetch_music.cjs --mood <war|dramatic|epic|somber|suspense|tech|sports|chill>`), **JAMAIS** de boucle synthétique basique `generate_music.py` sur un documentaire ou film cinématique.
> 2. **Bruitages & Scripts du projet** : Récupérer les SFX via `node 07_Scripts/fetch_sfx.cjs` (CC0/CC-BY propre ou Openverse) et assembler via **`node 07_Scripts/build_soundtrack.cjs --music ... --sfx cues.json --out ... --duration ...`**.
> 3. **Le piège du `mean_volume` sur les transitoires** : Un `click`, `ping` ou `impact` a 70–85 % de traîne silencieuse ; si l'on calibre son gain d'après son `mean_volume`, l'attaque explose jusqu'à `-0.3 dBFS` (+20 dB au-dessus d'un passage musical calme à `-21 dB`).
>
> **Règle d'Or de Mixage Instrumental (implémentée nativement dans `build_soundtrack.cjs`) :**
> 1. Normaliser la piste musicale cible d'abord (`--music-lufs -16`, `TP -2.0 dBTP`, `--music-start <sec>` sur le meilleur passage musical) avec fondu d'entrée (`0.4–1.0s`) et fondu de sortie (`2.2–2.8s`).
> 2. Calibrer chaque SFX **par son `max_volume` réel mesuré (`targetPeakDb - max_volume`)** et filtre passe-bas doux :
>    - **UI (`click-soft`, `typing`, `pop`, `chime`, `ping`)** : **`peak <= -22.5 dBFS`** (~ `-6.5 dB` sous le RMS musical — précision tactile sans claquement sec).
>    - **Transitions (`whoosh-short`, `whoosh-cinematic`, `riser`)** : **`peak <= -18.5 dBFS`** (~ `-2.5 dB` sous le RMS musical — souffle fluide).
>    - **Impacts (`impact-bass-1`, `impact-bass-2`, `heartbeat`, `rumble`)** : **`peak <= -15.0 dBFS`** (~ `+1 dB` max autour du RMS musical, passe-bas `3200 Hz` — assise grave maîtrisée sans jamais écraser la musique).
> 3. Contrôler par tranches de 10 s (`volumedetect`) qu'aucune tranche ne présente de pic agressif hors musique (`max_volume` sous `-2.0 dBFS` et écart crête/moyenne maîtrisé).

### B3. Quel SFX pour quel événement
| Événement visuel | SFX | Timing |
|---|---|---|
| Cut simple | rien, ou « tick » très léger | — |
| Transition whip / slide | whoosh court (0.2–0.4 s) | pic du son au milieu du mouvement |
| Zoom-through | whoosh grave + léger « air » | commence 100 ms avant |
| Mot-choc / slam | hit grave + clap | pile à la frame d'impact |
| Texte qui apparaît (cascade) | pops/ticks discrets | 1 son par mot max, jamais par lettre |
| Chiffre qui monte | tick rapide en boucle de pas | `ding` à la valeur finale |
| Capture article / photo | déclencheur photo ou papier | à l'apparition |
| Typewriter | frappe clavier | durée = durée de l'animation |
| Glitch / scramble | bruit numérique 0.3 s | synchro frame |
| Reveal important | riser 1–3 s puis hit | le hit tombe sur le reveal |
| Fin de chapitre | note courte / swell | — |
Règles : **jamais** deux fois le même fichier d'affilée (3 variantes minimum par type) ; varier le pitch de ±5 % ; pas plus de 3 SFX simultanés ; pas de SFX pendant une phrase clé sans raison ; pas de SFX sur chaque mot (fatigue). Un SFX qui devance l'image de 80–150 ms paraît plus « juste » qu'un SFX en retard.

**Aligner le pic du son sur l'événement** : chaque SFX du catalogue déclare l'instant de son pic.
```json
// 01_Assets/SFX/sfx_catalog.json
{ "whoosh_01": { "file": "whoosh_01.wav", "peak": 0.18, "dur": 0.42 },
  "hit_01":    { "file": "hit_01.wav",    "peak": 0.02, "dur": 0.9  } }
```
`startAt = tEvent − peak`.

### B4. Musique
- Choisir selon l'émotion : tension (docu, enquête), énergie (short, tech), calme (explication). Un seul morceau par séquence ; changer de morceau seulement aux changements de chapitre.
- **Caler les cuts sur les temps** : si un cut tombe à ± 120 ms d'un temps (BPM connu), le déplacer sur le temps.
- **Le silence est un SFX** : couper la musique 0.3–0.5 s avant un reveal puis frapper un hit rend le moment 2× plus fort.
- Ne jamais commencer la musique à froid : fade-in 0.5 s (long), 0.15 s (short). Fin : fade-out 1.5 s (long) ou coupe franche/boucle (short).
- Musique sans paroles sous la voix.

### B5. Particularités short vs long
| | Short | Long |
|---|---|---|
| Début | audio à 0 ms, hit ou voix immédiate | 1–2 s d'ambiance/riser acceptables |
| Densité SFX | 1 événement toutes les 1.5–3 s | 1 toutes les 4–8 s, plus subtil |
| Musique | plus forte (−16 dB), rythmée | discrète (−20 dB), évolutive |
| Fin | boucle : l'audio final se raccorde au début | outro 3–8 s avec swell |
| Silences | quasi aucun | pauses dramatiques assumées |

### B6. Manifeste audio (format proposé pour `render.cjs`)
```json
{
  "voice": "01_Assets/voice/scene.wav",
  "music": { "file": "01_Assets/Musiques/dark_01.mp3", "gain_db": -20, "duck_db": -12,
             "fade_in": 0.5, "fade_out": 1.5 },
  "sfx": [ { "id": "whoosh_01", "t": 4.20, "gain_db": -12 },
           { "id": "hit_01",    "t": 8.74, "gain_db": -6  } ],
  "target_lufs": -14
}
```
(à adapter à ce que `render.cjs` lit déjà ; l'important est que `t` = temps de la timeline après remapping).

### B7. Mix FFmpeg (voix + musique avec ducking + SFX + loudness)
```bash
ffmpeg -i voice.wav -i music.mp3 -i sfx1.wav -i sfx2.wav -filter_complex "
[0:a]highpass=f=80,asplit=2[v1][v2];
[1:a]volume=-20dB[m];
[m][v1]sidechaincompress=threshold=0.04:ratio=10:attack=40:release=450:makeup=1[md];
[2:a]adelay=4020|4020,volume=-12dB[s1];
[3:a]adelay=8720|8720,volume=-6dB[s2];
[v2][md][s1][s2]amix=inputs=4:normalize=0:duration=longest[mix];
[mix]loudnorm=I=-14:TP=-1:LRA=9[out]" -map "[out]" mix.wav
```
Générer `adelay` à partir du manifeste : `ms = Math.round((t − peak) * 1000)`. Si la voix est mono : `pan=stereo|c0=c0|c1=c0`.

### B8. Pièges
| Problème | Parade |
|---|---|
| Clics aux coupes | fondus 10–15 ms ; coupe au passage par zéro |
| Musique qui « pompe » | release ≥ 400 ms, ratio ≤ 10 |
| Voix noyée sur téléphone | tester en mono et petit haut-parleur ; couper 200–400 Hz de la musique (`equalizer=f=300:t=q:w=1:g=-4`) |
| Volume qui diffère entre vidéos | toujours `normalize_audio.cjs` en dernier, jamais avant le mix |
| SFX trop identiques | variantes + pitch ±5 % |
| Désynchro SFX après coupes | générer les SFX APRÈS le remapping des cues |
| Audio des `<video>` B-roll dans le rendu | `muted` sur les balises, tout passe par le mix FFmpeg |
| **Voix qui démarre bas et augmente (Bug `amix`)** | **NE JAMAIS utiliser `amix` pour assembler des clips voix séquentiels** sans `normalize=0`. Par défaut FFmpeg divise le gain par le nombre de flux actifs : à t=0 le volume est divisé par 5 (-14 dB), puis remonte artificiellement à chaque fin de réplique ! **Parade obligatoire : concaténer avec des tampons de silence parfaits (`concat=n=...:v=0:a=1`) via `07_Scripts/build_soundtrack.cjs`.** |

### B9. Checklist
- [ ] Marges pré/post-roll appliquées, aucun mot rogné (écouter les 5 premières coupes).
- [ ] Aucune pause > `sentencePause` hors pause dramatique voulue.
- [ ] Cues, sous-titres et SFX sur la timeline **raccourcie**.
- [ ] Ducking actif, musique jamais au-dessus de la voix.
- [ ] Pas deux SFX identiques consécutifs ; max 3 simultanés.
- [ ] Master −14 LUFS, true peak ≤ −1 dBTP.
- [ ] Short : son à 0 ms et fin qui boucle.
- [ ] Fondu de sortie musique systématique (2.0s à 2.5s) avant la fin de la vidéo.

---

### B10. RÈGLES DE PRÉCISION AUDIO ABSOLUE (VibeEditor Standards 2026)

#### 1. Volume de la Voix Off 100% Constant (Dès la Seconde Zéro)
- La voix off doit afficher une présence immédiate et pleine dès sa première attaque (`mean_volume: -18 à -22 dB`, `peak: -1 dBTP`).
- **Interdiction de rampe de montée involontaire** : Ne jamais appliquer de compression dynamique à fenêtre courte ou d'atténuation multi-pistes.
- Pour assembler plusieurs fichiers audio séquentiels sur une même timeline, utiliser impérativement :
  ```bash
  node 07_Scripts/build_soundtrack.cjs --clips '[{"file":"sc1.mp3","start":0.5},{"file":"sc2.mp3","start":4.4}]' --music "01_Assets/Musiques/track.mp3" --out "01_Assets/Audio_Mix/video_master_soundtrack.wav" --duration 20.0
  ```

#### 2. Ducking Musique vs Voix (Hiérarchie Sonore Parfaite)
- **Quand la voix parle** : La musique s'efface en arrière-plan à **−18 dB à −22 dB** par rapport à la voix (soit une baisse de 10 à 14 dB).
- **Quand la voix marque une pause (> 0.8s), en intro ou en outro** : La musique remonte doucement et avec élégance à **−10 dB à −12 dB**.
- Attaque : 40–50 ms (baisse réactive sans claquement). Relâchement : 400–500 ms (remontée imperceptible sans effet de pompage).

#### 3. Fondu de Sortie Musique Obligatoire (`afade=t=out`)
- **Toute musique de fond DOIT impérativement comporter un fondu de sortie progressif** sur les **2.0s à 2.5s** précédant la fin de la vidéo :
  `afade=t=out:st=${videoDuration - 2.2}:d=2.2`.
- **Zéro coupure nette ou brutale sur la musique**. L'outro doit s'éteindre dans le calme et la propreté.
