/**
 * 07_Scripts/roadmap_generator.cjs
 * Générateur et Gestionnaire de la Feuille de Route Unique MarvidFlow (Production IA)
 * 
 * RÈGLE D'OR : Un seul fichier unique "09_Pages/feuille_de_route.md".
 * 1. ZÉRO TEMPLATE DE SECOURS FIGÉ : L'IA réfléchit, analyse le sujet et conçoit elle-même le scénario et le découpage.
 * 2. Visualisation et édition directe dans le grand modal ou dans un éditeur.
 * 3. Validation par l'utilisateur -> transmission intégrale au pipeline de création puis réinitialisation.
 */

const fs = require('fs');
const path = require('path');
const { callAiKombo } = require('./ai_kombo.cjs');

const ROOT_DIR = path.resolve(__dirname, '..');
const ROADMAP_PATH = path.join(ROOT_DIR, '09_Pages', 'feuille_de_route.md');

/**
 * Transforme la structure générée par l'IA (JSON) en Markdown soigné et lisible
 */
function formatAiRoadmapToMarkdown(aiData, payload) {
    const prompt = payload.prompt || 'Sujet Vidéo';
    const format = payload.format || aiData.format || '16:9';
    const style = payload.style || payload.template || aiData.style || 'saas';
    const audioSetup = payload.audioSetup || 'full_mix';
    const nowStr = new Date().toLocaleString('fr-FR', { timeZone: 'UTC', dateStyle: 'full', timeStyle: 'medium' });

    const title = aiData.project_title || aiData.title || `${prompt} — Production Vidéo IA`;
    const concept = aiData.concept_summary || aiData.concept || aiData.pitch || `Concept créatif vidéo optimisé pour le format ${format} avec direction artistique ${style}.`;

    const isSaas = (style === 'saas' || /saas|claude|chatgpt|app|logiciel|tech|api|ia\b/i.test(prompt));
    const isVox = (style === 'vox' || style === 'documentaire' || /histoire|vox|guerre|siècle|archive/i.test(prompt));

    const visDir = aiData.visual_direction || {};
    let visualRules = Array.isArray(visDir.artistic_rules) ? visDir.artistic_rules : (Array.isArray(aiData.artistic_rules) ? aiData.artistic_rules : []);
    if (visualRules.length === 0) {
        if (isSaas) {
            visualRules = [
                'Interface moderne et épurée utilisant les codes shadcn/ui et le glassmorphism',
                'Hiérarchie visuelle 80/20 avec typographie épurée (Outfit pour les titres / chiffres, Inter pour les libellés)',
                'Animations fluides GSAP en courbes en S et compteurs dynamiques en direct (zéro artifice lourd)',
                'Cadence rythmée de 3 à 5 secondes par plan avec zéro écran blanc ni scène statique'
            ];
        } else if (isVox) {
            visualRules = [
                'Direction artistique documentaire Vox avec éléments détourés et texture d\'archives',
                'Hiérarchie visuelle 80/20 avec typographie épurée',
                'Rythme soutenu de 3 à 5 secondes par plan',
                'Continuité temporelle absolue démarrant à 0.00s pile'
            ];
        } else {
            visualRules = [
                'Direction artistique soignée et moderne adaptée au sujet',
                'Typographie épurée et hiérarchisée (maximum 2 familles de polices)',
                'Animations fluides et dynamiques avec transitions cinématiques',
                'Rythme soutenu de 3 à 5 secondes par plan'
            ];
        }
    }
    const colorPalette = visDir.color_palette || aiData.color_palette || 'Dominante 60% Obsidian (#090d16), Secondaire 30% Slate (#1e293b), Accent 10% Vif (#f59e0b)';

    // Normalisation des scènes
    const rawScenes = Array.isArray(aiData.scenes) ? aiData.scenes : [];
    let currentTime = 0;
    const scenes = rawScenes.map((sc, idx) => {
        const id = sc.scene_number || sc.id || (idx + 1);
        let dur = parseFloat(sc.duration_sec || sc.duration || 4.0);
        if (isNaN(dur) || dur < 2.0 || dur > 8.0) dur = 4.0;
        const start = sc.timecode ? sc.timecode.split(/[-–à]/)[0].trim() : `${currentTime.toFixed(1)}s`;
        const end = sc.timecode && sc.timecode.match(/[-–à]/) ? sc.timecode.split(/[-–à]/)[1].trim() : `${(currentTime + dur).toFixed(1)}s`;
        currentTime += dur;

        return {
            id,
            start,
            end,
            dur: `${dur.toFixed(1)}s`,
            format: sc.visual_format || sc.format || (isSaas ? 'Dashboard UI Glassmorphism' : 'Scène Visuelle Cinématique'),
            voiceover: sc.voice_over || sc.voiceover || sc.text || 'Texte de la voix off...',
            animation: sc.animation_active || sc.animation || (isSaas ? 'Entrée fluide GSAP + Compteur animé' : 'Zoom dynamique doux'),
            visualDesc: sc.visual_description || sc.visual || '',
            broll: sc.broll_suggestion || sc.broll || ''
        };
    });

    // Normalisation des assets nécessaires
    const rawAssets = Array.isArray(aiData.assets_needed) ? aiData.assets_needed : (Array.isArray(aiData.stickers_green_screen) ? aiData.stickers_green_screen : (Array.isArray(aiData.stickers) ? aiData.stickers : []));
    const assets = rawAssets.map((ast, idx) => {
        if (typeof ast === 'string') {
            return {
                role: `Composant Visuel ${idx + 1}`,
                desc: ast,
                integration: 'Intégration animée et harmonieuse dans la scène.'
            };
        }
        return {
            role: ast.role || `Composant Visuel ${idx + 1}`,
            desc: ast.visual_description || ast.prompt_en || ast.promptEn || ast.prompt || ast.desc || `${prompt} élément graphique`,
            integration: ast.integration || ast.usage || 'Apparition fluide avec effet d\'échelle ou translation.'
        };
    });

    // Normalisation des B-Rolls
    const rawBrolls = Array.isArray(aiData.brolls_needed) ? aiData.brolls_needed : (Array.isArray(aiData.brolls) ? aiData.brolls : []);
    const brolls = rawBrolls.map((br, idx) => {
        if (typeof br === 'string') {
            return { plan: `Plan ${idx + 1}`, query: br, desc: br };
        }
        return {
            plan: br.plan || (br.scene_number ? `Plan ${br.scene_number}` : `Plan ${idx + 1}`),
            query: br.search_query || br.query || br.keywords || `${prompt} b-roll`,
            desc: br.description || br.desc || 'Séquence vidéo réelle d\'ambiance 60 FPS.'
        };
    });

    // Normalisation sound design
    const snd = aiData.sound_design || {};
    const defaultMusic = isSaas ? 'Tech Synth Minimaliste & Percutant (118 BPM)' : 'Ambiance dynamique immersive (115 BPM)';
    const defaultSfx = isSaas ? ['Whoosh d’ouverture', 'Frappes de clavier subtiles', 'Bip de confirmation système', 'Riser final'] : ['Whoosh d’ouverture', 'Impact subtil', 'Carillon final'];
    const soundDesign = {
        musicGenre: snd.music_genre || snd.musicMood || defaultMusic,
        mixConfig: snd.audio_mix || 'Voix normalisée à -14 LUFS, Ducking musical -18 dB sous la voix, Fondu de sortie 2.5s',
        sfx: Array.isArray(snd.sound_effects) ? snd.sound_effects : (Array.isArray(snd.sfx) ? snd.sfx : defaultSfx)
    };

    return renderMarkdownDocument({
        title,
        concept,
        prompt,
        style,
        format,
        audioSetup,
        nowStr,
        visualRules,
        colorPalette,
        scenes,
        assets,
        brolls,
        soundDesign,
        payload: payload || {},
        visDir: visDir || {},
        isSaas,
        isVox
    });
}

/**
 * Assemblage final du document Markdown de la feuille de route
 */
function renderMarkdownDocument(params) {
    const {
        title,
        concept,
        prompt,
        style,
        format,
        audioSetup,
        nowStr,
        visualRules,
        colorPalette,
        scenes,
        assets = (params.assets || params.stickers || []),
        brolls,
        soundDesign,
        payload = {},
        visDir = {},
        isSaas = false,
        isVox = false
    } = params;

    let totalDurationSec = 0;
    scenes.forEach(s => {
        totalDurationSec += parseFloat(s.dur) || 4.0;
    });
    totalDurationSec = Math.max(5, Math.round(totalDurationSec));

    let scenesTable = `| N° | Timecode | Durée | Format Visuel Recommandé | Texte Voix Off (Percutant & Rythmé) | Animation Active |\n`;
    scenesTable += `| :--- | :--- | :---: | :--- | :--- | :--- |\n`;

    scenes.forEach(sc => {
        scenesTable += `| **${sc.id}** | \`${sc.start} - ${sc.end}\` | **${sc.dur}** | **${sc.format}** | ${sc.voiceover.replace(/\|/g, '-')} | \`${sc.animation}\` |\n`;
    });

    const assetsTitle = isSaas 
        ? '## 🖼️ 4. Assets & Composants Graphiques Requis'
        : (isVox ? '## 🖼️ 4. Documents & Visuels d\'Archives Requis' : '## 🖼️ 4. Éléments Graphiques & Visuels Requis');

    let assetsBlock = '';
    if (assets.length > 0) {
        assetsBlock = assets.map((ast, idx) => `
#### ${idx + 1}. ${ast.role}
* **Description visuelle** : ${ast.desc}
* **Intégration dans la scène** : ${ast.integration}
`).join('\n');
    } else {
        assetsBlock = isSaas 
            ? `* **Logo officiel** : Logo vectoriel SVG officiel intégré dans l'en-tête ou sur une carte d'interface.\n* **Composants d'interface** : Cartes glassmorphism, dashboard de métriques animées et terminal de code.`
            : `* **Éléments visuels** : Éléments vectoriels et compositions cinématiques adaptées au sujet.`;
    }

    let brollsBlock = brolls.map(br => `* **${br.plan}** : *${br.desc}* — Recherche : \`${br.query}\``).join('\n');

    let rulesBlock = visualRules.map((r, idx) => `${idx + 1}. **${r}**`).join('\n');
    let sfxList = Array.isArray(soundDesign.sfx) ? soundDesign.sfx.map(x => `\`${x}\``).join(', ') : 'Whoosh, Clavier, Swoosh';

    // Description et choix du fond d'écran
    const isUserBgFree = (!payload.backgroundType || payload.backgroundType === 'auto' || payload.backgroundType === 'libre' || payload.backgroundType === 'ai');
    let userBgDescription = 'Décision IA (Libre)';
    if (isUserBgFree) {
        if (visDir.background_choice && visDir.background_css) {
            userBgDescription = `Libre (Choix IA : ${visDir.background_choice} — CSS: ${visDir.background_css})`;
        } else if (visDir.background_css) {
            userBgDescription = `Libre (Choix IA — CSS: ${visDir.background_css})`;
        } else {
            userBgDescription = 'Libre (Ambiance et fond adaptés au sujet par l\'IA)';
        }
    } else if (payload.backgroundType === 'white') {
        userBgDescription = 'Fond blanc épuré (#ffffff)';
    } else if (payload.backgroundType === 'black') {
        userBgDescription = 'Fond noir profond (#000000)';
    } else if (payload.backgroundType === 'solid') {
        userBgDescription = `Fond uni (${payload.backgroundColor || '#111827'})`;
    } else if (payload.backgroundType === 'gradient') {
        const colors = Array.isArray(payload.gradientColors) && payload.gradientColors.length > 0
            ? payload.gradientColors.join(' vers ')
            : 'Blanc (#ffffff) vers Orange (#ff6600)';
        userBgDescription = `Dégradé personnalisé : ${colors} (${payload.backgroundGradient || 'linear-gradient'})`;
    }

    return `# 📋 FEUILLE DE ROUTE DE PRODUCTION IA — MARVIDFLOW
> **Document de cadrage unique généré par l'IA avant toute mise en production.**
> *Généré le : ${nowStr} (UTC)*  
> *Fichier unique : \`09_Pages/feuille_de_route.md\` — Modifiable directement par l'utilisateur.*

---

## 🎯 1. Spécifications Générales & Concept Créatif
* **Titre du Projet** : **${title}**
* **Sujet & Prompt** : « ${prompt} »
* **Concept & Vision** : ${concept}
* **Style Artistique** : **${String(style).toUpperCase()}**
* **Format & Ratio** : \`${format}\`
* **Arrière-plan & Fond Vidéo** : \`${userBgDescription}\`
* **Configuration Audio** : \`${audioSetup}\` (${soundDesign.mixConfig})
* **Durée Totale Estimée** : **${totalDurationSec}s** (${Math.floor(totalDurationSec / 60)} min ${totalDurationSec % 60}s)
* **Nombre de Séquences Découpées** : **${scenes.length} plans** (Cadence vive : 3 à 5s par plan, **zéro écran blanc**)

---

## 🎨 2. Direction Artistique & Palette Visuelle
${rulesBlock}
* **Palette Chromatique 60/30/10** : ${colorPalette}

---

## 🎬 3. Découpage Séquentiel Plan par Plan (Cadence 3-5s)
${scenesTable}

---

${assetsTitle}
*Éléments graphiques et visuels spécifiques conçus pour cette production :*
${assetsBlock}

---

## 📹 5. B-Rolls & Séquences Vidéos Requises
*Séquences dynamiques réelles à extraire via les banques intégrées (Coverr / Pixabay) ou \`07_Scripts/youtube_clip.cjs\` :*
${brollsBlock}

---

## 🔊 6. Conception Sonore & Voix Off
* **Style Musical Suggéré** : ${soundDesign.musicGenre}
* **Mixage & Normalisation** : ${soundDesign.mixConfig}
* **Effets Sonores (SFX Synchronisés)** : ${sfxList}

---

## ✅ 7. Validation & Mise en Production
* Vous pouvez modifier directement ce texte ou ajuster les répliques et timecodes ci-dessus.
* Cliquez sur **« Valider et Lancer la Production 🚀 »** dans l'application pour démarrer l'assemblage.
* Le présent fichier sera automatiquement réinitialisé dès la validation pour accueillir le prochain projet.
`;
}

/**
 * Extrait proprement une valeur CSS valide depuis une chaîne
 */
function extractCssValue(str) {
    if (!str || typeof str !== 'string') return '#090d16';
    const trimmed = str.trim();
    const cssPrefixMatch = trimmed.match(/CSS:\s*([^`*\n]+)/i);
    let candidate = cssPrefixMatch ? cssPrefixMatch[1].trim() : trimmed;
    const gradMatch = candidate.match(/(?:linear|radial)-gradient\([\s\S]+?\)(?=\s*(?:\)|$|;|\n))/i) 
                   || candidate.match(/(?:linear|radial)-gradient\([\s\S]+/i);
    if (gradMatch) {
        let grad = gradMatch[0].trim().replace(/[`*]/g, '').trim();
        let open = (grad.match(/\(/g) || []).length;
        let close = (grad.match(/\)/g) || []).length;
        while (close > open && grad.endsWith(')')) {
            grad = grad.slice(0, -1).trim();
            close--;
        }
        while (close < open) {
            grad += ')';
            close++;
        }
        return grad;
    }
    const hexMatch = candidate.match(/#[0-9a-fA-F]{3,8}/);
    if (hexMatch) return hexMatch[0];
    const rgbMatch = candidate.match(/rgba?\([^)]+\)/i);
    if (rgbMatch) return rgbMatch[0];
    return candidate.replace(/[`*]/g, '').trim();
}

/**
 * Décode et analyse le document Markdown de la feuille de route pour le transmettre au moteur de vidéo
 */
function parseRoadmapMarkdown(md) {
    if (!md || typeof md !== 'string' || md.length < 50) return null;

    const result = {
        title: '',
        prompt: '',
        concept: '',
        style: '',
        format: '16:9',
        audioSetup: 'full_mix',
        targetDuration: 20,
        theme: {
            primaryColor: '#090d16',
            secondaryColor: '#1e293b',
            accentColor: '#f59e0b',
            fontTitle: 'Outfit',
            fontBody: 'Inter'
        },
        scenes: [],
        stickers: [],
        brolls: [],
        soundDesign: {}
    };

    const titleMatch = md.match(/\*\s*\*\*Titre du Projet\*\*\s*:\s*\*\*?([^\n*]+)\*\*?/i);
    if (titleMatch) result.title = titleMatch[1].trim();

    const promptMatch = md.match(/\*\s*\*\*Sujet & Prompt\*\*\s*:\s*[«"']?([^\n»"']+)[»"']?/i);
    if (promptMatch) result.prompt = promptMatch[1].trim();

    const conceptMatch = md.match(/\*\s*\*\*Concept & Vision\*\*\s*:\s*([^\n]+)/i);
    if (conceptMatch) result.concept = conceptMatch[1].trim();

    const styleMatch = md.match(/\*\s*\*\*Style Artistique\*\*\s*:\s*\*\*?([^\n*]+)\*\*?/i);
    if (styleMatch) result.style = styleMatch[1].trim().toLowerCase();

    const formatMatch = md.match(/\*\s*\*\*Format & Ratio\*\*\s*:\s*`?([^\n`]+)`?/i);
    if (formatMatch) result.format = formatMatch[1].trim();

    const audioMatch = md.match(/\*\s*\*\*Configuration Audio\*\*\s*:\s*`?([^\n`]+)`?/i);
    if (audioMatch) result.audioSetup = audioMatch[1].trim();

    // Extraire l'arrière-plan décidé ou spécifié
    const bgMatch = md.match(/\*\s*\*\*Arrière-plan & Fond Vidéo\*\*\s*:\s*`?([^\n`]+)`?/i);
    if (bgMatch) {
        const rawBg = bgMatch[1].trim();
        const extractedCss = extractCssValue(rawBg);
        result.background = {
            global: extractedCss,
            description: rawBg
        };
    }

    // Extraire les scènes du tableau
    const lines = md.split('\n');
    let insideScenesTable = false;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.includes('## 🎬 3. Découpage Séquentiel') || trimmed.includes('Découpage Séquentiel Plan par Plan')) {
            insideScenesTable = true;
            return;
        }
        if (insideScenesTable && trimmed.startsWith('## ')) {
            insideScenesTable = false;
            return;
        }

        if (insideScenesTable && trimmed.startsWith('|') && trimmed.includes('|')) {
            const parts = trimmed.split('|').map(p => p.trim());
            if (parts.length >= 7 && /^\*\*(\d+)\*\*$/.test(parts[1])) {
                const id = parseInt(parts[1].replace(/\*/g, ''), 10);
                const tcStr = parts[2].replace(/[`\s]/g, '');
                const tcParts = tcStr.split(/[-–à]/);
                const timeStart = parseFloat(tcParts[0]) || 0;
                const timeEnd = parseFloat(tcParts[1]) || (timeStart + 4.0);
                const duration = Math.max(2.0, +(timeEnd - timeStart).toFixed(1));
                const visualFormat = parts[4].replace(/\*/g, '').trim();
                const voiceLine = parts[5].trim();
                const animation = parts[6].replace(/[`*]/g, '').trim();

                const headline = visualFormat || `Plan ${id}`;
                const concept = `${visualFormat} — ${animation}`;

                result.scenes.push({
                    id,
                    timeStart,
                    timeEnd,
                    duration,
                    visualFormat,
                    headline,
                    headlineAccent: '',
                    subtitle: visualFormat,
                    voiceLine,
                    concept,
                    animationActive: animation,
                    transitionOut: {
                        type: 'object_zoom_portal',
                        triggerElement: 'element_cle',
                        description: 'Transition cinématique'
                    }
                });
            }
        }
    });

    if (result.scenes.length > 0) {
        result.targetDuration = result.scenes[result.scenes.length - 1].timeEnd;
        result.narration = result.scenes.map(s => s.voiceLine).filter(Boolean).join(' ');
    }

    // Extraire les assets et éléments graphiques
    const assetBlocks = [...md.matchAll(/####\s*\d+\.\s*([^\n]+)[\s\S]*?(?:\*+Description visuelle\*+:\s*([^\n]+)[\s\S]*?\*+Intégration[^\n*]*\*+:\s*([^\n]+)|\*+Usage[^\n*]*\*+:\s*([^\n]+)[\s\S]*?```(?:text)?\s*([\s\S]*?)```)/gi)];
    assetBlocks.forEach(ab => {
        result.stickers.push({
            role: ab[1].trim(),
            desc: (ab[2] || ab[5] || '').trim(),
            integration: (ab[3] || ab[4] || '').trim(),
            usage: (ab[3] || ab[4] || '').trim(),
            promptEn: (ab[5] || ab[2] || '').trim()
        });
    });

    return result;
}

/**
 * Génère la feuille de route via l'IA (Kombo Multi-modèles) SANS AUCUN TEMPLATE STATIQUE DE SECOURS.
 * L'IA DOIT RÉFLÉCHIR ET PRODUIRE LE PLAN.
 */
async function generateRoadmap(payload) {
    let md = '';
    const promptText = payload.prompt || 'Vidéo de présentation';
    const styleText = payload.style || payload.template || 'saas';
    const formatText = payload.format || '16:9';
    const scriptText = payload.customScript || payload.script || '';

    // Détection de durée éventuelle dans le prompt (ex: "video de 5s", "10 secondes", "30s")
    let requestedDurationSec = 24;
    const durMatch = promptText.match(/(\d+)\s*(?:secondes?|secs?|s)\b/i);
    if (durMatch) {
        const parsed = parseInt(durMatch[1], 10);
        if (parsed >= 4 && parsed <= 120) {
            requestedDurationSec = parsed;
        }
    }

    // Description du fond d'écran choisi
    const isUserBgFree = (!payload.backgroundType || payload.backgroundType === 'auto' || payload.backgroundType === 'libre' || payload.backgroundType === 'ai');
    let userBgDescription = 'Libre (Décision IA)';
    let bgRule = '';
    let fallbackCss = '#090d16';

    if (isUserBgFree) {
        userBgDescription = 'Libre (L\'IA doit réfléchir et imaginer le fond le plus immersif et adapté au sujet)';
        bgRule = `3. MODE LIBRE POUR L'ARRIÈRE-PLAN :
   - L'utilisateur a laissé le choix du fond libre à l'IA. Tu DOIS impérativement réfléchir au sujet et décider d'un arrière-plan SUR-MESURE qui sublime la narration (ex: dégradé cosmique sombre pour l'astronomie, fond vélin chaud #faf8f5 pour l'histoire, verre anthracite sombre pour du SaaS/code, dégradé émeraude/or pour la finance, etc.).
   - INTERDICTION d'utiliser tout le temps le même fond ! Varie les styles, les dégradés et les textures en fonction du thème précis.
   - Renseigne impérativement dans "visual_direction" les champs "background_choice" (nom évocateur) et "background_css" (CSS valide, ex: linear-gradient(...) ou #faf8f5 ou #090d16).`;
    } else {
        if (payload.backgroundType === 'white') {
            userBgDescription = 'Fond blanc épuré (#ffffff)';
            fallbackCss = '#ffffff';
        } else if (payload.backgroundType === 'black') {
            userBgDescription = 'Fond noir profond (#000000)';
            fallbackCss = '#000000';
        } else if (payload.backgroundType === 'solid') {
            userBgDescription = `Fond uni (${payload.backgroundColor || '#111827'})`;
            fallbackCss = payload.backgroundColor || '#111827';
        } else if (payload.backgroundType === 'gradient') {
            const colors = Array.isArray(payload.gradientColors) && payload.gradientColors.length > 0
                ? payload.gradientColors.join(' vers ')
                : 'Blanc (#ffffff) vers Orange (#ff6600)';
            userBgDescription = `Dégradé personnalisé : ${colors} (${payload.backgroundGradient || 'linear-gradient'})`;
            fallbackCss = payload.backgroundGradient || 'linear-gradient(135deg, #ffffff 0%, #ff6600 100%)';
        }
        bgRule = `3. RESPECT DU FOND CHOISI PAR L'UTILISATEUR :
   - L'utilisateur a explicitement imposé : ${userBgDescription}.
   - Tu DOIS STRICTEMENT respecter ce fond et concevoir la palette chromatique 60/30/10 et le contraste des cartes pour s'harmoniser parfaitement avec lui.
   - Renseigne dans "visual_direction" : "background_choice": "${userBgDescription}", "background_css": "${fallbackCss}".`;
    }

    const systemPrompt = `Tu es le Directeur Artistique et Réalisateur en chef de MarvidFlow (expert vidéo motion design, formats SaaS Commercials et documentaires Vox).
Ta mission est de concevoir une FEUILLE DE ROUTE DE PRODUCTION VIDÉO (Production Roadmap) complète, créative et ultra-détaillée.

IMPORTANT: Tu dois STRICTEMENT retourner un objet JSON valide conforme au schéma suivant (sans texte conversationnel ni bloc de code englobant):
{
  "project_title": "Titre percutant de la vidéo",
  "concept_summary": "Résumé captivant du concept et de l'approche créative",
  "style": "${styleText}",
  "format": "${formatText}",
  "duration_total": ${requestedDurationSec},
  "visual_direction": {
    "style_name": "Nom du style visuel",
    "background_choice": "Description du fond visuel (imaginé par l'IA en mode Libre ou reprenant le choix utilisateur)",
    "background_css": "Valeur CSS valide pour background (ex: linear-gradient(135deg, #0f172a, #1e1b4b) ou #faf8f5 ou #090d16 ou #ffffff)",
    "artistic_rules": [
      "Règle 1 adaptée au sujet précis",
      "Règle 2 adaptée au sujet précis",
      "Règle 3 adaptée au sujet précis",
      "Règle 4 adaptée au sujet précis"
    ],
    "color_palette": "Palette 60/30/10 précise adaptée au sujet et au fond choisi (codes HEX et description)"
  },
  "scenes": [
    {
      "scene_number": 1,
      "timecode": "0.0s - 4.0s",
      "duration_sec": 4.0,
      "visual_format": "Format visuel adapté (ex: Dashboard UI Glassmorphism / Mockup Produit / Hero Stat / Terminal de Code)",
      "visual_description": "Description concrète et précise des visuels affichés à l'écran",
      "voice_over": "Texte exact de la voix off pour cette scène (court, percutant, humain, sans pavé de texte)",
      "animation_active": "Effet d'animation précis et adapté (ex: Entrée fluide GSAP en courbe S, compteur animé, révélation d'échelle)",
      "broll_suggestion": "Idée de vidéo réelle d'ambiance ou de contexte"
    }
  ],
  "assets_needed": [
    {
      "role": "Rôle de l'élément (ex: Logo officiel SVG Claude / Dashboard de métriques 10x / Terminal de code interactif)",
      "visual_description": "Description esthétique de l'élément visuel adapté au style",
      "integration": "Intégration et animation dans la scène (ex: Barre supérieure, carte héroïque, apparition centrale)"
    }
  ],
  "brolls_needed": [
    {
      "scene_number": 1,
      "search_query": "Mots-clés précis de recherche en anglais pour banques de vidéos (ex: developer coding dark room, modern tech workspace)",
      "description": "Description du plan vidéo réel"
    }
  ],
  "sound_design": {
    "music_genre": "Style musical suggéré (BPM, ambiance, instruments)",
    "audio_mix": "Voix normalisée à -14 LUFS, Ducking musical -18 dB sous la voix",
    "sound_effects": ["Whoosh d'ouverture", "Frappes de clavier", "Riser final"]
  }
}

RÈGLES D'OR DE RÉALISATION :
1. Découpe en séquences vives de 3 à 5 secondes chacune. Pour une durée totale de ${requestedDurationSec}s, génère le nombre approprié de plans (ex: pour 24s -> 6 plans de 4s ; pour 5s -> 1 à 2 plans vifs).
2. Le sujet exact est : "${promptText}". La vidéo doit être 100% pensée, personnalisée et rédigée autour de ce sujet précis.
3. ADAPTATION TOTALE AU STYLE :
   - Si le sujet est SaaS / Tech : La direction artistique DOIT être SaaS moderne (tokens shadcn/ui, glassmorphism, dashboards, chiffres clés, logos vectoriels). AUCUN sticker de personnage d'archive ni fond vert papier découpé !
   - Zéro animation mécanique forcée : l'animation doit servir la narration (courbes en S GSAP, compteurs de stats, transitions nettes).
${bgRule}
4. ZÉRO MUR DE TEXTE : Chaque réplique de voix off doit être concise, directe et naturelle.`;

    const userPrompt = `Conçois la feuille de route complète pour ce projet :
- Sujet / Prompt : "${promptText}"
- Style artistique : ${styleText}
- Format vidéo : ${formatText}
- Arrière-plan & fond vidéo choisi : ${userBgDescription}
- Configuration audio : ${payload.audioSetup || 'Mix complet (Voix + Musique)'}
- Script fourni par l'utilisateur : ${scriptText ? `"${scriptText}"` : 'Aucun (l’IA doit concevoir le scénario intégral)'}

Génère l'objet JSON complet :`;

    const preferredAi = payload.preferredAi || 'kombo';
    const aiResponse = await callAiKombo(systemPrompt, userPrompt, 0.7, preferredAi);

    if (aiResponse && typeof aiResponse === 'object' && Array.isArray(aiResponse.scenes) && aiResponse.scenes.length > 0) {
        console.log(`[Roadmap AI] Feuille de route générée avec succès via l'IA (${aiResponse.scenes.length} scènes).`);
        md = formatAiRoadmapToMarkdown(aiResponse, payload);
    } else if (typeof aiResponse === 'string' && aiResponse.includes('# 📋 FEUILLE DE ROUTE')) {
        md = aiResponse.trim().replace(/^```markdown\s*/i, '').replace(/```$/i, '').trim();
    } else {
        throw new Error("L'IA n'a pas retourné une structure de scènes valide pour la feuille de route.");
    }

    const targetDir = path.dirname(ROADMAP_PATH);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(ROADMAP_PATH, md, 'utf8');
    return {
        success: true,
        filePath: '09_Pages/feuille_de_route.md',
        fullPath: ROADMAP_PATH,
        content: md
    };
}

/**
 * Sauvegarde le contenu modifié de la feuille de route
 */
function saveRoadmap(content) {
    fs.writeFileSync(ROADMAP_PATH, content || '', 'utf8');
    return { success: true, filePath: '09_Pages/feuille_de_route.md' };
}

/**
 * Valide et vide le fichier unique feuille_de_route.md pour la session suivante
 */
function validateAndClearRoadmap(content) {
    if (content && content.trim().length > 0) {
        fs.writeFileSync(ROADMAP_PATH, content, 'utf8');
    }

    const emptyPlaceholder = `<!-- FEUILLE DE ROUTE RÉINITIALISÉE LE ${new Date().toISOString()} — EN ATTENTE DE LA PROCHAINE CRÉATION -->\n`;
    fs.writeFileSync(ROADMAP_PATH, emptyPlaceholder, 'utf8');

    return {
        success: true,
        cleared: true,
        filePath: '09_Pages/feuille_de_route.md'
    };
}

/**
 * Lit le contenu actuel de la feuille de route
 */
function getRoadmap() {
    if (!fs.existsSync(ROADMAP_PATH)) {
        return { success: true, content: '', exists: false };
    }
    const content = fs.readFileSync(ROADMAP_PATH, 'utf8');
    return { success: true, content, exists: true };
}

module.exports = {
    generateRoadmap,
    saveRoadmap,
    validateAndClearRoadmap,
    getRoadmap,
    parseRoadmapMarkdown,
    extractCssValue,
    ROADMAP_PATH
};
