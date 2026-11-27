/**
 * AI_DIRECTOR.CJS — Moteur Orchestrateur Autonome de Création Vidéo IA (AutoFrame)
 * 
 * Architecture séquentielle et résiliente par étapes concrètes :
 * 1. Initialisation du projet vidéo HTML & Plan narratif découpé (Storyboard avec timecodes stricts).
 * 2. Gestion de la Voix Off (génération TTS ElevenLabs/HeyGen ou fichier fourni) & Pose directe sur la timeline.
 * 3. Gestion & Téléchargement des Assets (logos vectoriels, drapeaux, cartes, captures web, blasons, chroma key).
 * 4. Découpage et Génération Scène par Scène (Animations & Transitions GSAP avec synchronisation mot-à-mot sur les paroles).
 *    -> Sauvegarde après chaque scène dans un Checkpoint (.checkpoint.json). En cas de blocage ou interruption,
 *       le pipeline reprend exactement à la scène suivante sans tout recommencer !
 * 5. Sous-titres dynamiques mot-à-mot (style Hormozi) & Finalisation complète.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec, execFile } = require('child_process');
const { fetchFlag } = require('./fetch_flag.cjs');
const { parseRoadmapMarkdown, getRoadmap, extractCssValue } = require('./roadmap_generator.cjs');
const { ensureSfxCollection } = require('./fetch_sfx.cjs');

/**
 * Télécharge un logo vectoriel SVG officiel depuis Iconify Logos API si non disponible localement
 */
function downloadIconifySvg(iconName, destPath) {
    return new Promise((resolve) => {
        const url = `https://api.iconify.design/logos/${iconName}.svg`;
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (data && data.includes('<svg')) {
                        fs.writeFileSync(destPath, data, 'utf8');
                        resolve(true);
                        return;
                    }
                    resolve(false);
                });
            } else {
                resolve(false);
            }
        }).on('error', () => resolve(false));
    });
}

/**
 * Télécharge un logo vectoriel SVG depuis Iconify Simple-Icons (3000+ marques tech et mondiales)
 */
function downloadIconifySimpleIcon(iconName, destPath) {
    return new Promise((resolve) => {
        const url = `https://api.iconify.design/simple-icons/${iconName}.svg`;
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (data && data.includes('<svg')) {
                        fs.writeFileSync(destPath, data, 'utf8');
                        resolve(true);
                        return;
                    }
                    resolve(false);
                });
            } else {
                resolve(false);
            }
        }).on('error', () => resolve(false));
    });
}

function execAsync(cmd, timeout = 25000) {
    return new Promise((resolve) => {
        exec(cmd, { timeout }, (err, stdout, stderr) => {
            if (err) return resolve({ success: false, err });
            resolve({ success: true, stdout, stderr });
        });
    });
}

const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_PATH = process.env.VIBE_USER_DATA
    ? path.join(process.env.VIBE_USER_DATA, 'api_config.json')
    : path.join(ROOT_DIR, '07_Scripts', 'api_config.json');

// Helper pour charger les directives des skills de conception et physique 2D (00_Skills/ et .agents/skills/)
function loadSkillsDirectives() {
    try {
        const skillsDir = path.join(ROOT_DIR, '00_Skills');
        const agentSkillsDir = path.join(ROOT_DIR, '.agents', 'skills');

        const josephPath = path.join(agentSkillsDir, 'Joseph_Edit_Skills', 'SKILL.md');
        const legacyDesignPath = path.join(skillsDir, 'video_design_mastery', 'SKILL.md');
        const designSkillPath = fs.existsSync(josephPath) ? josephPath : legacyDesignPath;

        const physicsSkillPath = path.join(skillsDir, 'animation_2d_physics', 'SKILL.md');
        let text = '';
        if (fs.existsSync(designSkillPath)) {
            text += '\n=== DIRECTIVES SKILL: JOSEPH EDIT SKILLS (17 Règles d\'Or) ===\n' + fs.readFileSync(designSkillPath, 'utf8') + '\n';
        }
        if (fs.existsSync(physicsSkillPath)) {
            text += '\n=== DIRECTIVES SKILL: ANIMATION 2D & PHYSIQUE GÉOMÉTRIQUE ===\n' + fs.readFileSync(physicsSkillPath, 'utf8') + '\n';
        }

        const handCursorPath = path.join(agentSkillsDir, 'hand_cursor_interaction', 'SKILL.md');
        if (fs.existsSync(handCursorPath)) {
            text += '\n=== DIRECTIVES SKILL: HAND CURSOR INTERACTION (Curseurs Mains Réalistes) ===\n' + fs.readFileSync(handCursorPath, 'utf8') + '\n';
        }

        const mySkillsDir = path.join(agentSkillsDir, 'My_Skills');
        if (fs.existsSync(mySkillsDir)) {
            for (const sub of fs.readdirSync(mySkillsDir)) {
                const subSkillPath = path.join(mySkillsDir, sub, 'SKILL.md');
                if (fs.existsSync(subSkillPath)) {
                    text += `\n=== DIRECTIVES SKILL: ${sub.toUpperCase()} ===\n` + fs.readFileSync(subSkillPath, 'utf8') + '\n';
                }
            }
        }
        return text;
    } catch (e) {
        console.warn('Erreur chargement skills:', e.message);
        return '';
    }
}

// Helper pour inspecter et charger les consignes du template sélectionné (06_Templates/)
function loadTemplateDirectives(chosenTemplate) {
    if (!chosenTemplate || chosenTemplate === 'none' || chosenTemplate === 'libre') return null;
    try {
        const templatesDir = path.join(ROOT_DIR, '06_Templates');
        if (!fs.existsSync(templatesDir)) return null;
        const files = fs.readdirSync(templatesDir);
        const norm = chosenTemplate.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = files.find(f => {
            const fNorm = f.toLowerCase().replace(/\.html$/i, '').replace(/[^a-z0-9]/g, '');
            return fNorm === norm || fNorm.includes(norm) || norm.includes(fNorm);
        });
        if (found) {
            const content = fs.readFileSync(path.join(templatesDir, found), 'utf8');
            const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/i);
            const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            return {
                fileName: found,
                styleSnippet: styleMatch ? styleMatch[1].trim() : '',
                htmlSnippet: bodyMatch ? bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').trim() : ''
            };
        }
    } catch (e) {
        console.warn('Erreur chargement template:', e.message);
    }
    return null;
}

// Helper pour charger les clés API
function loadApiConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        }
    } catch (e) {
        console.error('Erreur lecture api_config.json:', e);
    }
    return {};
}

// Extraction précise de la durée audio via FFmpeg
function getAudioDuration(filePath) {
    return new Promise((resolve) => {
        try {
            if (!filePath || !fs.existsSync(filePath)) return resolve(null);
            const ffmpegPath = require('@ffmpeg-installer/ffmpeg')?.path || 'ffmpeg';
            execFile(ffmpegPath, ['-i', filePath], (err, stdout, stderr) => {
                const text = (stderr || '') + (stdout || '');
                const m = text.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d+)/);
                if (m) {
                    const sec = parseFloat(m[1]) * 3600 + parseFloat(m[2]) * 60 + parseFloat(m[3]);
                    return resolve(Math.round(sec * 100) / 100);
                }
                resolve(null);
            });
        } catch (e) {
            resolve(null);
        }
    });
}

// Détection de la clarté d'une couleur (pour contraste automatique)
function isColorLight(colorStr) {
    if (!colorStr) return false;
    const clean = colorStr.toLowerCase().trim();
    if (clean === '#ffffff' || clean === 'white' || clean.includes('#f8') || clean.includes('#fa') || clean.includes('#f1') || clean.includes('#f5')) return true;
    if (clean === '#000000' || clean === 'black') return false;
    const m = clean.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/);
    if (m) {
        const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        return luma > 140;
    }
    return false;
}

// Appel sécurisé à Google Gemini API (Multi-modèles, IPv4 forcé, timeout, retry)
// Appel IA via le Kombo Multi-Modèles (Gemini, Groq, OpenRouter, Claude Code CLI, Antigravity)
const { callAiKombo } = require('./ai_kombo.cjs');
async function callGeminiAPI(systemPrompt, userPrompt, temperature = 0.7, preferredAi = null) {
    return await callAiKombo(systemPrompt, userPrompt, temperature, preferredAi);
}

// Extraction d'un slug court, clair et pertinent (2 à 3 mots clés du sujet)
function extractCleanSlug(text, maxWords = 3) {
    if (!text || typeof text !== 'string') return 'video';
    const stopWords = new Set([
        'concois', 'cree', 'creer', 'creez', 'generer', 'genere', 'faire', 'fais', 'fait', 'animation', 'motion', 'design',
        'video', 'clip', 'secondes', 'seconde', 'sec', 'pour', 'dans', 'avec', 'sur', 'au',
        'aux', 'style', 'de', 'du', 'des', 'un', 'une', 'le', 'la', 'les', 'et', 'en', 'par',
        'ce', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
        'moi', 'toi', 'lui', 'nous', 'vous', 'leur', 'je', 'tu', 'il', 'elle', 'on', 'ils', 'elles', 'me', 'te', 'se',
        'qui', 'que', 'quoi', 'dont', 'ou', 'est', 'sont', 'comme', 'plus', 'tres', 'bien',
        'dune', 'dun', 'afin', 'vers', 'sous', 'sans', 'tout', 'tous', 'toute', 'toutes',
        'nouvelle', 'nouveau', 'presentation', 'presente', 'montre', 'montrer', 'illustre', 'affiche', 'donne', 'donner',
        'part', 'dure', 'durant', 'temps', 'autour', 'produis', 'produire', 'realise', 'realiser'
    ]);
    const clean = text
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s_-]/g, ' ')
        .replace(/[-_\s]+/g, ' ')
        .trim();

    let words = clean.split(' ').filter(w => w.length > 1 && !stopWords.has(w) && !/^\d+s?$/.test(w));
    if (words.length === 0) {
        words = clean.split(' ').filter(w => w.length > 2);
    }
    const finalWords = words.slice(0, Math.min(words.length, Math.max(2, maxWords)));
    return (finalWords.length > 0 ? finalWords.join('_') : 'video').slice(0, 35);
}

function sanitizeFilename(name) {
    return extractCleanSlug(name, 3);
}

// Création récursive de dossiers
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Découpage déterministe d'un script horodaté en scènes précises
function parseTimestampedScript(scriptText, fallbackDuration = 18.0) {
    if (!scriptText || typeof scriptText !== 'string') return [];
    
    const blockRegex = /\[?\s*(\d{1,2}):(\d{2})\s*(?:-|à|to)\s*(\d{1,2}):(\d{2})\s*\]?([\s\S]*?)(?=\[?\s*\d{1,2}:\d{2}\s*(?:-|à|to)\s*\d{1,2}:\d{2}|$)/gi;
    const matches = [...scriptText.matchAll(blockRegex)];
    
    if (matches.length > 0) {
        return matches.map((m, idx) => {
            const startSec = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
            const endSec = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
            const body = (m[5] || '').trim();
            
            let voice = '';
            let visual = '';
            const lines = body.split('\n');
            lines.forEach(l => {
                const tr = l.trim();
                if (/^(?:voix|voice|narrateur)\s*:/i.test(tr)) {
                    voice += (voice ? ' ' : '') + tr.replace(/^(?:voix|voice|narrateur)\s*:\s*/i, '').trim();
                } else if (/^(?:visuel|visual|scene|ecran|titre)\s*:/i.test(tr)) {
                    visual += (visual ? ' ' : '') + tr.replace(/^(?:visuel|visual|scene|ecran|titre)\s*:\s*/i, '').trim();
                } else if (tr && !voice) {
                    voice = tr;
                } else if (tr && !visual) {
                    visual = tr;
                }
            });
            
            return {
                id: idx + 1,
                timeStart: startSec,
                timeEnd: Math.max(endSec, startSec + 1.5),
                duration: Math.max(endSec - startSec, 1.5),
                voiceLine: voice || body,
                visualConcept: visual || voice || body
            };
        });
    }
    return [];
}

// Gestion des Checkpoints (persistance de l'état de création séquentielle)
function getCheckpointPath(videoPath) {
    const fullPath = path.isAbsolute(videoPath) ? videoPath : path.resolve(ROOT_DIR, videoPath);
    return fullPath.replace(/\.html$/i, '') + '.checkpoint.json';
}

function loadCheckpoint(checkpointPath) {
    try {
        if (fs.existsSync(checkpointPath)) {
            return JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
        }
    } catch (e) {
        console.warn("[Checkpoint] Erreur lecture checkpoint:", e.message);
    }
    return null;
}

function saveCheckpoint(checkpointPath, data) {
    try {
        ensureDir(path.dirname(checkpointPath));
        fs.writeFileSync(checkpointPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error("[Checkpoint] Erreur sauvegarde checkpoint:", e.message);
    }
}

// Constructeur de scène de secours (fallback résilient en cas d'indisponibilité de l'API)
function buildFallbackScene(sceneIndex, totalScenes, scenePlan, format, accentColor, availableAssetsList) {
    const isFirstScene = (sceneIndex === 1);
    const start = scenePlan.timeStart || 0;
    const end = scenePlan.timeEnd || (start + 5);
    const dur = end - start;
    const headline = scenePlan.headline || `SCÈNE ${sceneIndex}`;
    const headlineAccent = scenePlan.headlineAccent || '';
    const subtitle = scenePlan.subtitle || '';
    
    const logoAsset = availableAssetsList.find(a => a.includes('Logo officiel'))?.match(/"([^"]+)"/)?.[1];
    const flagAsset = availableAssetsList.find(a => a.includes('Drapeau national'))?.match(/"([^"]+)"/)?.[1];
    const mapAsset = availableAssetsList.find(a => a.includes('Carte géographique'))?.match(/"([^"]+)"/)?.[1];

    let mediaHtml = '';
    if (logoAsset) {
        mediaHtml = `<img src="${logoAsset}" class="scene-logo-${sceneIndex}" alt="Logo" style="max-height:85px; margin-top:20px; filter:drop-shadow(0 10px 25px rgba(0,0,0,0.45));">`;
    } else if (flagAsset) {
        mediaHtml = `<img src="${flagAsset}" class="scene-flag-${sceneIndex}" alt="Flag" style="width:110px; height:auto; margin-top:20px; border-radius:8px; box-shadow:0 12px 25px rgba(0,0,0,0.4);">`;
    } else if (mapAsset) {
        mediaHtml = `<img src="${mapAsset}" class="scene-map-${sceneIndex}" alt="Map" style="width:70%; max-height:360px; object-fit:cover; border-radius:14px; margin-top:20px; box-shadow:0 18px 35px rgba(0,0,0,0.5);">`;
    } else {
        mediaHtml = `
        <div class="scene-graphic-${sceneIndex}" style="margin-top:24px;">
            <svg width="72" height="72" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="42" stroke="${accentColor}" stroke-width="4" stroke-dasharray="6 6"/>
                <circle cx="50" cy="50" r="28" fill="${accentColor}" fill-opacity="0.15"/>
                <polygon points="45,38 62,50 45,62" fill="${accentColor}"/>
            </svg>
        </div>`;
    }

    const htmlContent = `
        <div class="scene-container" id="scene_${sceneIndex}">
            <div class="scene-content-${sceneIndex}">
                <h2 class="scene-title-${sceneIndex}">
                    <span class="title-main">${headline}</span>
                    ${headlineAccent ? `<span class="title-accent" style="color:${accentColor};">${headlineAccent}</span>` : ''}
                </h2>
                ${subtitle ? `<p class="scene-sub-${sceneIndex}">${subtitle}</p>` : ''}
                ${mediaHtml}
            </div>
        </div>`;

    const customCss = `
        #scene_${sceneIndex} {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
        }
        .scene-content-${sceneIndex} {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            max-width: 900px;
            width: 100%;
        }
        .scene-title-${sceneIndex} {
            font-family: var(--font-title);
            font-size: ${format === '9:16' ? '3.8rem' : '4.4rem'};
            font-weight: 900;
            text-transform: uppercase;
            line-height: 1.08;
            letter-spacing: -0.02em;
            margin-bottom: 16px;
        }
        .scene-sub-${sceneIndex} {
            font-size: 1.4rem;
            color: var(--text-muted);
            max-width: 780px;
            line-height: 1.45;
        }`;

    const outTime = Math.max(start + 0.5, end - 0.4);
    const gsapTimelineCode = `
        // --- SCÈNE ${sceneIndex} (${start.toFixed(1)}s -> ${end.toFixed(1)}s) ---
        ${isFirstScene ? `
        tl.set('#scene_${sceneIndex}', { display: 'flex', opacity: 1, visibility: 'visible', pointerEvents: 'auto' }, 0);
        tl.from('#scene_${sceneIndex} .scene-title-${sceneIndex}', { y: 50, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.1);
        ${subtitle ? `tl.from('#scene_${sceneIndex} .scene-sub-${sceneIndex}', { y: 25, opacity: 0, duration: 0.6, ease: 'power2.out' }, 0.35);` : ''}
        tl.from('#scene_${sceneIndex} img, #scene_${sceneIndex} svg', { scale: 0.85, opacity: 0, duration: 0.7, ease: 'back.out(1.5)' }, 0.4);
        ` : `
        tl.set('#scene_${sceneIndex}', { display: 'flex', opacity: 0, visibility: 'visible', pointerEvents: 'auto' }, ${start});
        tl.to('#scene_${sceneIndex}', { opacity: 1, duration: 0.35, ease: 'power2.out' }, ${start});
        tl.from('#scene_${sceneIndex} .scene-title-${sceneIndex}', { y: 40, opacity: 0, duration: 0.7, ease: 'power3.out' }, ${(start + 0.15).toFixed(2)});
        ${subtitle ? `tl.from('#scene_${sceneIndex} .scene-sub-${sceneIndex}', { y: 20, opacity: 0, duration: 0.5, ease: 'power2.out' }, ${(start + 0.35).toFixed(2)});` : ''}
        tl.from('#scene_${sceneIndex} img, #scene_${sceneIndex} svg', { scale: 0.88, opacity: 0, duration: 0.6, ease: 'back.out(1.4)' }, ${(start + 0.4).toFixed(2)});
        `}
        ${sceneIndex < totalScenes ? `
        tl.to('#scene_${sceneIndex}', { opacity: 0, y: -20, duration: 0.35, ease: 'power2.in' }, ${outTime.toFixed(2)});
        tl.set('#scene_${sceneIndex}', { display: 'none', visibility: 'hidden', pointerEvents: 'none' }, ${end.toFixed(2)});
        ` : ''}
    `;

    return {
        htmlContent,
        customCss,
        gsapTimelineCode
    };
}

// =========================================================================
// INVENTAIRE EN MÉMOIRE DES OUTILS ET SKILLS DU PROJET (ZÉRO FICHIER RÉSIDUEL)
// =========================================================================
function inspectRelevantToolsAndSkills(prompt, customScript = '') {
    const text = (prompt + ' ' + customScript).toLowerCase();
    const tools = [];
    const skills = [];
    let visualStrategy = 'motion_design_vectoriel';

    // 1. 3D WebGL / Procédural / Modèles
    if (/3d|three\.?js|maison|chambre|personnage|walk|salon|voiture|smartphone 3d|isometric|objet 3d/i.test(text)) {
        tools.push('image2threejs.cjs (génération procédurale 3D sans GLB, zéro latence, rig natif GSAP)');
        skills.push('threejs_3d (caméra third-person over-the-shoulder, CatmullRomCurve3, zéro collision/clipping, pas de fond cosmos)');
        visualStrategy = '3d_immersion';
    } else if (/modele 3d|gltf|glb|poly haven|khronos/i.test(text)) {
        tools.push('fetch_3d_model.cjs (téléchargement GLB photoréaliste)');
        visualStrategy = '3d_gltf';
    }

    // 2. Logos officiels de marques
    if (/logo|marque|apple|nike|tesla|google|meta|amazon|rolex|spotify|netflix|stripe|openai/i.test(text)) {
        tools.push('brandfetch.cjs (logos officiels vectoriels SVG)');
        skills.push('design_composition (pas de cercle pixelisé ni de halo destructeur sur les logos)');
    }

    // 3. Cartes et géographie
    if (/carte|map|satellite|géographie|pays|ville|trajet|itinéraire|france|paris|tokyo/i.test(text)) {
        tools.push('fetch_map.cjs & stitch_map.cjs (cartographie satellite HD)');
    }

    // 4. Captures d'écrans web réelles
    if (/https?:\/\/|[a-z0-9-]+\.(?:com|io|fr|app|ai|dev)/i.test(text) || /dashboard|saas|interface/i.test(text)) {
        tools.push('record_web.cjs (captures d\'écrans HD de vrais sites web)');
        visualStrategy = 'saas_mockup';
    }

    // 5. Sound Design & Rythme
    if (!/sans son|muet|none/i.test(text)) {
        tools.push('sfx.py (sound design percutant, whooshes, impacts rythmés aux transitions)');
        skills.push('sound_design');
    }

    // 6. Typographie & Mouvements de Caméra
    skills.push('text_animation (double typographie fashion light + bold, révélation mot par mot cinématique)');
    skills.push('Camera (mouvements justifiés, règle des tiers, transitions motivées portal/zoom/slide)');

    return {
        tools,
        skills,
        visualStrategy
    };
}

// =========================================================================
// NETTOYEUR / LINTER AUTOMATIQUE DE SCÈNE (GARDE-FOU MÉCANIQUE RÈGLES 40 & 41)
// =========================================================================
function sanitizeSceneCode(codeObj, sceneIndex) {
    if (!codeObj) return codeObj;
    let html = codeObj.htmlContent || '';
    let css = codeObj.customCss || '';
    let js = codeObj.gsapTimelineCode || '';

    // Règle 40 : Suppression des étiquettes / badges didactiques PowerPoint
    html = html.replace(/\[\s*(?:étape|scène|scene|règle|regle|chapitre|slide)\s*\d*\s*[:\-]?\s*[^\]]*\]/gi, '');
    html = html.replace(/<span[^>]*class="[^"]*tag-pill[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '');
    html = html.replace(/<div[^>]*class="[^"]*hud-telemetry[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

    // Règle 41 : Suppression des faux boutons d'action web (c'est une vidéo, pas un site)
    html = html.replace(/<button[^>]*>\s*(?:commencer|sign up|s'inscrire|en savoir plus|cliquez ici|télécharger|start free|get started|demo)[\s\S]*?<\/button>/gi, '');

    // FIX CRITIQUE GSAP : Nettoyer toute redéclaration locale de timeline orpheline qui gèlerait l'animation
    js = js.replace(/(?:const|let|var)\s+tl\s*=\s*gsap\.timeline\([^)]*\);?/g, '// [Master timeline reused]');
    js = js.replace(/window\.tl\s*=\s*tl;?/g, '');
    js = js.replace(/tl\.pause\(\);?/g, '');

    // Sécurité NaN dans le code GSAP
    if (js.includes('NaN')) {
        console.warn(`[Sanitizer] Détection de NaN dans le code GSAP scène ${sceneIndex}, nettoyage.`);
        js = js.replace(/\bNaN\b/g, '0');
    }

    return {
        htmlContent: html,
        customCss: css,
        gsapTimelineCode: js
    };
}

// Génération individuelle d'une scène par Gemini avec synchronisation stricte sur la voix
async function generateSceneCodeWithGemini({
    sceneIndex,
    totalScenes,
    scenePlan,
    theme,
    baseBg,
    isLight = false,
    format,
    width,
    height,
    accentColor,
    availableAssetsList,
    skillsDirectives,
    templateDirectives,
    preferredAi = null
}) {
    const isFirstScene = (sceneIndex === 1);
    const transitionType = scenePlan.transitionOut?.type || (sceneIndex < totalScenes ? 'object_zoom_portal' : 'cinematic_dissolve');
    const transitionTrigger = scenePlan.transitionOut?.triggerElement || 'element-cle';

    const systemPrompt = `Tu es l'Expert Motion Designer et Réalisateur Vidéo en chef de AutoFrame.
Tu dois concevoir et coder la Scène ${sceneIndex}/${totalScenes} d'une composition vidéo hautement dynamique, captivante et cinématique (style Vox / SaaS Commercial).

${skillsDirectives ? `DIRECTIVES SKILLS OFFICIELS :\n${skillsDirectives}\n` : ''}

RÈGLES D'OR DE RÉALISATION ET DESIGN :
1. ZÉRO ÉTIQUETTE POWERPOINT & ZÉRO BOUTON WEB FACTICE (RÈGLES 40 & 41) :
   - Interdiction FORMELLE des badges didactiques : [ Étape 01 ], [ Scène X ], .tag-pill, ou faux textes HUD.
   - Ne JAMAIS placer de faux boutons cliquables interactifs (<button>Commencer</button>). Une vidéo est un film, pas un site web.
2. ZÉRO MUR DE TEXTE & ZÉRO BULLE DE CHAT BAVARDE :
   - Une vidéo n'est pas un article de blog. INTERDICTION formelle d'afficher des paragraphes entiers ou des pavés de lecture !
   - Le texte affiché à l'écran doit faire au maximum 3 à 7 mots : un mot d'impact, un grand chiffre clé (Hero Stat), ou un badge court.
3. TYPOGRAPHIE ET COULEURS SUR LE FOND VIDÉO (JOSEPH EDIT SKILLS) :
   - Fond de scène actif : ${baseBg}
   ${isLight ? `
   - THÈME CLAIR ACTIF : Le texte principal DOIT impérativement être FONCÉ (#09090b ou #18181b) pour assurer une lisibilité parfaite. Zéro texte blanc invisible sur fond clair !
   - Couleur d'accentuation : ${accentColor} (pour les mots-clés ou chiffres mis en avant).
   ` : `
   - THÈME SOMBRE ACTIF : Le texte principal DOIT être BLANC (#ffffff).
   - Couleur d'accentuation : ${accentColor}.
   `}
   - Maximum 2 polices : 1 Sans-serif moderne (Plus Jakarta Sans ou Outfit) + 1 Accent (Playfair Display italique ou Caveat).
4. ANIMATION ET INTÉGRATION DES ÉLÉMENTS GRAPHIQUES & LOGOS :
   - Adapte le style visuel au thème demandé :
     * Thèmes SaaS / Tech / Produit : Éléments vectoriels nets, glassmorphism, lueurs douces (glow) et apparitions fluides sans artifice kitch.
     * Thèmes Vox / Éditorial : Stickers découpés avec bordure papier blanche et texture vélin si le brief le spécifie.
   - Liberté d'animation : Privilégie des micro-mouvements organiques (respiration, lévitation subtile, parallax ou scale progressif), sans forcer un balancement mécanique unique.
5. CURSEUR MAIN INTERACTIF (HAND CURSOR INTERACTION) :
   - Si une interaction humaine (clic, pointage, déplacement d'un élément) intervient, utilise les SVG officiels :
     * 01_Assets/Icones/pointinghand_100160.svg (pour un clic ou pointage centré)
     * 01_Assets/Icones/openhand_100161.svg / closedhand_100189.svg (pour une saisie ou un déplacement)
6. ICÔNES VECTORIELLES LUCIDE & LOGOS OFFICIELS (100% DISPONIBLES EN DIRECT) :
   - Tu disposes de la librairie complète **Lucide Icons** chargée dans la page !
   - Utilise simplement : `<i data-lucide="zap"></i>` ou toute autre icône de la suite : `sparkles`, `check`, `shield-check`, `trending-up`, `terminal`, `cpu`, `rocket`, `layers`, `activity`, `database`, `lock`, `play`, `star`, `code`, `box`, `arrow-right`, `globe`, `bar-chart-2`, etc.
   - Tu peux leur donner des classes Tailwind de taille et couleur : `class="w-6 h-6 text-emerald-400 stroke-[2]"` ou `class="w-5 h-5 text-indigo-400 inline-block mr-2"`.
   - Tu disposes aussi de **Iconify Web Component** pour les logos officiels : `<iconify-icon icon="logos:claude-icon" width="28"></iconify-icon>`, `<iconify-icon icon="logos:openai-icon" width="28"></iconify-icon>`, `<iconify-icon icon="logos:stripe" width="32"></iconify-icon>`, etc.
   - RÈGLE D'OR DESIGN SAAS : Pour chaque métrique, badge de statut, bouton d'action ou liste de bénéfices, ACCOMPAGNE TOUJOURS le texte d'une icône Lucide ou d'un logo officiel. Zéro texte nu sans hiérarchie visuelle !
7. CARTES ET COMPOSANTS UI :
   ${isLight ? `
   - Cartes claires modernes en verre dépoli (background: rgba(255, 255, 255, 0.90); backdrop-filter: blur(16px); border: 1px solid rgba(0, 0, 0, 0.10); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08); color: #09090b;).
   ` : `
   - Cartes sombres modernes en verre dépoli (background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.40); color: #ffffff;).
   `}
8. ANIMATIONS S-CURVE GSAP & DÉPLACEMENT CONTINU :
   - Apparitions fluides avec courbe en S (ease: "power3.out" ou "back.out(1.7)").
   - Entrées séquencées (stagger: 0.1s) des éléments internes d'une carte, JAMAIS un bloc figé d'un seul coup.
   - Dérive continue de caméra (slow push-in scale 1.0 -> 1.05) et micro-mouvements d'arrière-plan.
9. RÈGLES CAPITALES THÈMES SAAS / TECH / IA (CHATGPT, CLAUDE, NOTION, API, CRM) :
   - INTERDICTION FORMELLE ET ABSOLUE de concevoir un simulateur de chat bavard ou des bulles de messages dialogue (ex: 'Comment puis-je vous aider ? / Optimise mon code'). C'est ennuyeux, anti-cinématique et strictement interdit !
   - CE QU'IL FAUT CONCEVOIR :
     * Intégration soignée du LOGO OFFICIEL de la marque (dans la barre de navigation, au centre en révélation héroïque ou sur une carte d'interface moderne).
     * Un DASHBOARD DE MÉTRIQUES EXPLOSIVES (Hero Stats en grille 2 ou 3 colonnes) : ex: '⚡ 10x Faster', '🚀 99.9% Accuracy', '📊 12ms Latency' avec compteurs animés GSAP ou Anime.js.
     * Des cartes de flux ou de performance vivantes (barres de progression néon, badges 'PROD-READY', pastilles d'état vertes pulsantes).
     * Si du code ou prompt est montré : un terminal dark moderne ultra-compact (3 lignes max avec syntax highlighting et curseur clignotant).
10. SOUND DESIGN ET BRUITAGES SFX (OPENVERSE & SYNTHÈSE EARSHOT) :
   - Tu disposes de la fonction audio globale `playSfx(nom, volume)` connectée directement dans la timeline GSAP !
   - Utilise les bruitages pour rythmer et donner vie aux transitions et interactions :
     * `tl.call(() => playSfx('whoosh', 0.4), null, <timecode>);` lors d'une transition rapide ou entrée de carte.
     * `tl.call(() => playSfx('pop', 0.5), null, <timecode>);` lors de l'apparition d'un badge ou pastille.
     * `tl.call(() => playSfx('click', 0.4), null, <timecode>);` lors d'un clic de curseur main sur un bouton.
     * `tl.call(() => playSfx('ding', 0.5), null, <timecode>);` lors de l'affichage d'un chiffre clé ou validation.
     * `tl.call(() => playSfx('keyboard', 0.35), null, <timecode>);` lors de l'affichage de code ou frappe terminal.
   - Les bruitages sont automatiquement pré-chargés et joués au millième de seconde près sans latence.
11. GESTION DU TEMPS & TIMELINE MAÎTRESSE :
   - Début à ${scenePlan.timeStart}s. Si scène 1 : visible immédiatement dès t=0s.
   - Sortie à ${scenePlan.timeEnd}s : exécuter la transition cinématique "${transitionType}".
   - tl.set('#scene_${sceneIndex}', { display: 'none', visibility: 'hidden', pointerEvents: 'none' }, ${scenePlan.timeEnd});
   - RÈGLE CAPITAL TIMELINE GSAP : NE JAMAIS DÉCLARER "const tl = ..." ou "let tl = ...". La timeline maîtresse 'tl' est DÉJÀ active globalement ! Attache directement tes tweens à 'tl' (ex: tl.from(...), tl.to(...), tl.set(...)).

Réponds UNIQUEMENT par un objet JSON valide avec 3 champs :
{
  "htmlContent": "<div class='scene-container' id='scene_${sceneIndex}'>...</div>",
  "customCss": "#scene_${sceneIndex} { ... }",
  "gsapTimelineCode": "..."
}`;

    const userPrompt = `Génère le code complet de la Scène ${sceneIndex}/${totalScenes} :
- Type de scène : ${scenePlan.type || 'Séquence cinématique'}
- Tranche horaire : de ${scenePlan.timeStart}s à ${scenePlan.timeEnd}s (Durée : ${(scenePlan.timeEnd - scenePlan.timeStart).toFixed(1)}s)
- Voix off correspondante : "${scenePlan.voiceLine || scenePlan.subtitle || ''}"
- Titre : "${scenePlan.headline || ''}"
- Mot-clé accent : "${scenePlan.headlineAccent || ''}"
- Sous-titre : "${scenePlan.subtitle || ''}"
- Concept visuel : "${scenePlan.concept || ''}"
- Transition de sortie : ${transitionType} sur ${transitionTrigger}
- Format : ${format} (${width}x${height})
- Arrière-plan de la vidéo : ${baseBg}
- Thème de contraste : ${isLight ? 'Clair (texte foncé #09090b, cartes blanches translucides)' : 'Sombre (texte blanc #ffffff, cartes sombres)'}
- Couleur accent : ${accentColor}
- Assets disponibles à intégrer si pertinents :
${availableAssetsList.join('\n') || '- Générer des éléments vectoriels SVG.'}

Réponds UNIQUEMENT en JSON.`;

    const res = await callGeminiAPI(systemPrompt, userPrompt, 0.7, preferredAi);
    if (res && res.htmlContent && res.gsapTimelineCode) {
        return sanitizeSceneCode(res, sceneIndex);
    }
    throw new Error(`Réponse Gemini incomplète pour la scène ${sceneIndex}`);
}

/**
 * MOTEUR PRINCIPAL D'EXÉCUTION DU PIPELINE (PAR ÉTAPES SÉQUENTIELLES AVEC CHECKPOINTING)
 * @param {object} payload - Données du formulaire create_video.html
 * @param {function} onProgress - Callback (stepId, phaseLabel, percent, logMsg, logType, extraData)
 */
async function runAiVideoPipeline(payload, onProgress = () => { }) {
    const startTime = Date.now();
    const prompt = (payload.prompt || '').trim();
    const channelId = (payload.channelId || payload.channel || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    const isChannel = Boolean(channelId);
    const format = ['16:9', '9:16', '1:1'].includes(payload.format) ? payload.format : '16:9';
    const preferredAi = payload.preferredAi || null;

    // Détection de durée demandée dans le brief (ex: "20 secondes", "30s", "15 sec")
    let promptDuration = null;
    const durMatch = prompt.match(/(\d+)\s*(?:secondes?|secs?|s)\b/i);
    if (durMatch) {
        const parsed = parseInt(durMatch[1], 10);
        if (parsed >= 4 && parsed <= 120) {
            promptDuration = parsed;
        }
    }

    // Prise en compte du script horodaté fourni par l'utilisateur
    const customScript = (payload.customScript || payload.script || '').trim();
    const hasCustomScript = Boolean(payload.hasCustomScript || customScript.length > 0);

    // Extraction et liaison stricte des assets explicitement fournis par l'utilisateur
    const userUploadedAssets = Array.isArray(payload.userUploadedAssets) ? payload.userUploadedAssets : [];

    // Détection de durée depuis le dernier timestamp du script si non précisée dans le prompt
    if (!promptDuration && hasCustomScript) {
        const tsMatches = [...customScript.matchAll(/\[?\s*(\d{1,2}):(\d{2})\s*(?:-|à|to)\s*(\d{1,2}):(\d{2})\s*\]?/gi)];
        if (tsMatches.length > 0) {
            const lastMatch = tsMatches[tsMatches.length - 1];
            const endMinutes = parseInt(lastMatch[3], 10) || 0;
            const endSeconds = parseInt(lastMatch[4], 10) || 0;
            const calculatedDuration = endMinutes * 60 + endSeconds;
            if (calculatedDuration >= 4 && calculatedDuration <= 180) {
                promptDuration = calculatedDuration;
            }
        }
    }

    // Préfixe relatif des assets selon l'emplacement du fichier généré
    const assetPrefix = isChannel ? '../../01_Assets' : '../01_Assets';

    let suffix = '';
    if (isChannel) {
        suffix = channelId.includes('_') ? '_' + channelId.split('_').pop() : '-ch';
    } else {
        const rand4 = Math.floor(1000 + Math.random() * 9000);
        suffix = `-${rand4}`;
    }

    let baseRawName = extractCleanSlug(prompt, 3);
    if (!baseRawName || baseRawName === 'video' || baseRawName.length < 3) {
        baseRawName = extractCleanSlug(payload.fileName || '', 3);
    }
    if (!baseRawName || baseRawName === 'video') baseRawName = `video_${Date.now().toString().slice(-4)}`;
    baseRawName = baseRawName.replace(/\.html$/i, '');
    let finalFileName = `${baseRawName}${suffix}.html`;

    // Détection du mode Client vs Créateur / Chaîne
    const isClient = Boolean(payload.isClient || payload.clientName);
    const clientName = payload.clientName || '';

    // Chemins cibles
    const baseProjectDir = ROOT_DIR;
    let videosTargetDir = isClient
        ? path.join(baseProjectDir, 'Clients', clientName)
        : (isChannel
            ? path.join(baseProjectDir, '03_Chaines', channelId)
            : path.join(baseProjectDir, '04_Videos'));
    ensureDir(videosTargetDir);
    let finalFilePath = path.join(videosTargetDir, finalFileName);
    let relVideoPath = isClient
        ? `Clients/${clientName}/${finalFileName}`
        : (isChannel
            ? `03_Chaines/${channelId}/${finalFileName}`
            : `04_Videos/${finalFileName}`);

    // Prise en charge de la reprise d'une vidéo interrompue
    if (payload.resume && payload.targetVideo) {
        relVideoPath = payload.targetVideo;
        finalFilePath = path.resolve(ROOT_DIR, relVideoPath);
        finalFileName = path.basename(finalFilePath);
        videosTargetDir = path.dirname(finalFilePath);
    }

    const checkpointPath = getCheckpointPath(finalFilePath);
    let checkpoint = loadCheckpoint(checkpointPath);
    if (checkpoint && checkpoint.payload) {
        payload = { ...checkpoint.payload, ...payload };
    }
    if (!checkpoint) {
        checkpoint = {
            version: 1,
            status: 'processing',
            targetVideo: relVideoPath,
            fileName: finalFileName,
            channelId: channelId || null,
            payload: { ...payload },
            plan: null,
            voice: { done: false, path: '', duration: 0 },
            assets: { done: false, downloaded: {} },
            scenes: [],
            subtitles: { done: false, cues: [] },
            currentStep: 'step_init',
            progress: 5,
            logs: []
        };
    }

    // Dimensions
    let width = 1920, height = 1080;
    if (format === '9:16') { width = 1080; height = 1920; }
    else if (format === '1:1') { width = 1080; height = 1080; }

    const audioSetup = payload.audioSetup || 'full_mix';
    const hasVoice = (audioSetup === 'voice_only' || audioSetup === 'full_mix');
    const hasMusic = (audioSetup === 'music_only' || audioSetup === 'full_mix');
    const showSubtitles = payload.subtitles !== false && hasVoice;

    const chosenTemplate = payload.template || payload.style;
    const isUsingTemplate = Boolean(chosenTemplate && chosenTemplate !== 'none' && chosenTemplate !== 'libre');
    const normPromptPre = prompt.toLowerCase();
    const hasWebCapturePre = Boolean(prompt.match(/https?:\/\/[^\s\)\],;]+/i) || prompt.match(/\b([a-zA-Z0-9-]+\.(?:com|io|fr|org|net|co|ai|dev|app|tech|me))\b/i));
    const hasBrandPre = /logo|marque|apple|nike|tesla|google|meta|amazon|rolex|spotify|netflix|adidas|porsche|ferrari|bmw|audi/i.test(normPromptPre);
    const hasFlagPre = /france|français|japon|japan|usa|états-unis|suisse|switzerland|allemagne|germany|brésil|brazil|chine|china|italie|italy|espagne|spain|royaume-uni|angleterre|canada|maroc|algérie|sénégal|drapeau|pays|nation/i.test(normPromptPre);
    const hasMapPre = /carte|map|satellite|géographie|territoire|capitale|ville|localisation/i.test(normPromptPre);

    // CONSTRUCTION DE LA MATRICE VÉRIDIQUE DES ÉTAPES SÉQUENTIELLES (ZÉRO FAKE STEP)
    const pipelineSteps = [
        {
            id: 'step_init',
            title: isChannel ? `1. Initialisation du Projet ("${channelId}")` : "1. Initialisation du Projet Vidéo",
            desc: `Fichier "${finalFileName}" (${format}) et découpage du plan narratif.`
        },
        {
            id: 'step_voice',
            title: "2. Voix Off & Calage sur la Timeline",
            desc: hasVoice ? "Synthèse vocale IA ElevenLabs et mesure exacte via FFmpeg." : "Configuration sans voix off."
        },
        {
            id: 'step_assets',
            title: "3. Téléchargement & Indexation des Assets",
            desc: "Récupération des logos officiels, blasons, drapeaux, cartes et médias."
        },
        {
            id: 'step_scenes',
            title: "4. Conception Scène par Scène (Animations & Transitions)",
            desc: "Génération séquentielle ordonnée synchronisée mot-à-mot avec la voix off."
        },
        {
            id: 'step_final',
            title: "5. Sous-titres Mot-à-Mot & Finalisation Studio",
            desc: "Assemblage final complet et transition vers le Studio de montage."
        }
    ];

    const logAndSaveStep = (stepId, phaseLabel, percent, logMsg, logType = 'info') => {
        checkpoint.currentStep = stepId;
        checkpoint.phaseLabel = phaseLabel;
        checkpoint.progress = percent;
        checkpoint.lastUpdated = Date.now();
        checkpoint.logs = checkpoint.logs || [];
        checkpoint.logs.push({
            time: new Date().toTimeString().split(' ')[0],
            text: logMsg,
            type: logType
        });
        saveCheckpoint(checkpointPath, checkpoint);
        onProgress(stepId, phaseLabel, percent, logMsg, logType, { steps: pipelineSteps });
    };

    // =========================================================================
    // ÉTAPE 1 : INITIALISATION DU FICHIER VIDÉO HTML & DU PLAN DE SCÈNES
    // =========================================================================
    logAndSaveStep('step_init', 'Initialisation du projet vidéo...', 8, `Création / vérification du fichier vidéo : ${finalFileName}`, 'info');

    if (!fs.existsSync(finalFilePath)) {
        const initialDraftHtml = `<!DOCTYPE html>
<!-- STATUT TEMPORAIRE : CRÉATION EN COURS PAR L'IA -->
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>${baseRawName}</title>
</head>
<body>
    <script>
        window.VIDEO_CONFIG = {
            id: "vid_${Date.now()}",
            title: "${(prompt.slice(0, 40) || baseRawName).replace(/"/g, '\\"')}",
            suffix: "${suffix}",
            status: "processing",
            processUrl: "video_processus.html?video=${encodeURIComponent(relVideoPath)}",
            createdAt: ${Date.now()},
            format: "${format}",
            duration: ${(promptDuration || 20.0).toFixed(1)}
        };
        var VIDEO_CONFIG = window.VIDEO_CONFIG;
    </script>
</body>
</html>`;
        fs.writeFileSync(finalFilePath, initialDraftHtml, 'utf8');
    }

    let skillsDirectives = loadSkillsDirectives();
    if (isClient && clientName) {
        const clientSkillsDir = path.join(ROOT_DIR, 'Clients', clientName, 'skills');
        if (fs.existsSync(clientSkillsDir)) {
            try {
                const sFiles = fs.readdirSync(clientSkillsDir).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
                sFiles.forEach(sf => {
                    const c = fs.readFileSync(path.join(clientSkillsDir, sf), 'utf8');
                    skillsDirectives += `\n\n--- DIRECTIVES SPÉCIFIQUES DU CLIENT ${clientName} (${sf}) ---\n${c.slice(0, 3000)}`;
                });
            } catch (e) {}
        }
    }
    let templateDirectives = isUsingTemplate ? loadTemplateDirectives(chosenTemplate) : null;

    let plan = checkpoint.plan;

    // VÉRIFICATION PRIORITAIRE : Feuille de route validée par l'utilisateur
    if (!plan) {
        let roadmapContent = payload.roadmapContent;
        if (!roadmapContent || typeof roadmapContent !== 'string' || roadmapContent.length < 50) {
            const currentRoadmap = getRoadmap();
            if (currentRoadmap && currentRoadmap.exists && currentRoadmap.content && currentRoadmap.content.length > 50 && !currentRoadmap.content.startsWith('<!-- FEUILLE DE ROUTE RÉINITIALISÉE')) {
                roadmapContent = currentRoadmap.content;
            }
        }

        if (roadmapContent) {
            try {
                const parsedRoadmap = parseRoadmapMarkdown(roadmapContent);
                if (parsedRoadmap && parsedRoadmap.scenes && parsedRoadmap.scenes.length > 0) {
                    plan = parsedRoadmap;
                    logAndSaveStep('step_init', 'Plan narratif issu de la feuille de route validée !', 18, `Feuille de route appliquée : "${plan.title}" (${plan.scenes.length} scènes découpées)`, 'success');
                }
            } catch (rmErr) {
                console.warn("[Roadmap Parse Warning]:", rmErr.message);
            }
        }
    }

    if (plan && plan.scenes && plan.scenes.length > 0) {
        logAndSaveStep('step_init', 'Plan narratif restauré depuis le point de contrôle', 15, `[Reprise] Plan existant réutilisé : "${plan.title}" (${plan.scenes.length} scènes)`, 'success');
    } else {
        // Inventaire dynamique en mémoire des outils du projet sans fichier résiduel
        const discoveredResources = inspectRelevantToolsAndSkills(prompt, customScript);
        logAndSaveStep('step_init', 'Inventaire en mémoire des outils & conception narrative...', 12, 
            `Outils sélectionnés : ${discoveredResources.tools.join(', ') || 'Motion design vectoriel natif'}. Compétences : ${discoveredResources.skills.join(', ')}`, 'info');

        const parsedScriptScenes = hasCustomScript ? parseTimestampedScript(customScript, promptDuration || 20.0) : [];

        const systemPrompt = `Tu es le Directeur Créatif et Motion Designer en chef de AutoFrame.
Tu dois analyser le brief utilisateur, intégrer les outils et skills du projet sélectionnés en mémoire, et concevoir un plan narratif original, asymétrique et cinématographique.

${discoveredResources.tools.length > 0 ? `OUTILS DU PROJET SÉLECTIONNÉS EN MÉMOIRE POUR CE BRIEF :\n- ${discoveredResources.tools.join('\n- ')}\n` : ''}
${discoveredResources.skills.length > 0 ? `SKILLS ET COMPÉTENCES MOBILISÉES :\n- ${discoveredResources.skills.join('\n- ')}\n` : ''}
${skillsDirectives ? `DIRECTIVES SKILLS OFFICIELS :\n${skillsDirectives}\n` : ''}

RÈGLES MAÎTRESSES DE CONCEPTION & TRANSITIONS (ANTI-RÉPÉTITION) :
1. DÉCOUPAGE ORGANIQUE ASYMÉTRIQUE :
   - BANNISSEMENT ABSOLU des découpages rigides uniformes (ex: 4 scènes égales de 5 secondes).
   - Le rythme cinématographique varie naturellement :
     * Hook d'accroche : 2.0s à 3.5s intenses.
     * Démonstration / Tension narrative : 5.0s à 8.0s.
     * Respiration ou Climax : 3.0s à 4.0s.
2. FIN DU STORYBOARD CLICHÉ (PAS DE TITRE/SOUS-TITRE OBLIGATOIRE SUR TOUT) :
   - Une scène d'action, de visite 3D ou d'illustration pure DOIT être visuelle (zéro titre parasite, zéro sous-titre si l'image parle d'elle-même).
   - Les titres sont réservés aux scènes d'accroche ou de conclusion percutante.
3. TRANSITIONS MOTIVÉES ENTRE SCÈNES (CHAMP "transitionOut" OBLIGATOIRE) :
   Pour chaque scène vers la suivante, choisis une transition cinématographique spécifique et motivée :
   * "object_zoom_portal" : Zoom plongeant rapide sur un objet (logo, mot clé, étoile, œil, écran) qui grandit (scale 1.0 -> 15.0) et dévoile la scène suivante.
   * "whip_slide" : Balayage directionnel énergique entraîné par le déplacement rapide d'un objet.
   * "match_cut" : Raccord visuel direct basé sur la continuité géométrique ou colorimétrique d'une forme.
   * "hard_cut" : Coupure nette instantanée sur un temps fort musical ou une phrase percutante.
   * "j_cut" / "l_cut" : Décalage audio-visuel d'anticipation.
   * "cinematic_dissolve" : Fondu croisé réservé aux scènes lentes et contemplatives.
   INTERDICTION d'utiliser un simple fondu noir fade-out standard sur toutes les scènes !
4. CHARTE 60-30-10 & COULEURS : 60% fond, 30% surfaces/texte secondaire, 10% une seule couleur d'accent vive signature.
5. ZÉRO ÉTIQUETTE POWERPOINT & ZÉRO BOUTON WEB : Pas de conteneurs didactiques, pas de faux boutons d'action.
6. ZÉRO SCÈNE MORTE SANS VIE : Chaque scène doit posséder une impulsion continue (dérive caméra, micro-mouvements). Les éléments de cards sont animés en séquence décalée.
7. AUDIO & FONDU MUSICAL : Voix stable et immédiate dès 0s, ducking de la musique et fondu de fin obligatoire sur la musique.

Réponds UNIQUEMENT par un objet JSON valide avec cette structure exacte :
{
  "title": "Titre percutant de la vidéo",
  "slug": "2 a 3 mots cles courts (ex: saas_dashboard, rolex_submariner)",
  "pitch": "Résumé en une phrase",
  "targetDuration": ${(promptDuration || 20.0).toFixed(1)},
  "visualStrategy": "${discoveredResources.visualStrategy}",
  "background": {
    "type": "black",
    "global": "#000000",
    "textMain": "#ffffff",
    "textMuted": "#94a3b8"
  },
  "theme": {
    "primaryColor": "#000000",
    "secondaryColor": "#111116",
    "accentColor": "#f59e0b",
    "fontTitle": "Outfit",
    "fontBody": "Inter"
  },
  "narration": "Texte complet de la voix off narrative en français",
  "toolsNeeded": {
    "voiceTts": true,
    "brandLogo": false,
    "brandDomain": "",
    "map": false,
    "mapQuery": "",
    "mapStyle": "dark",
    "flag": false,
    "country": "",
    "threeJsProcedural": ${discoveredResources.visualStrategy === '3d_immersion'}
  },
  "scenes": [
    {
      "id": 1,
      "type": "cinematic_hook",
      "timeStart": 0.0,
      "timeEnd": 3.5,
      "headline": "TITRE OU VIDE SI SCÈNE PUREMENT VISUELLE",
      "headlineAccent": "MOT-CLÉ OU VIDE",
      "subtitle": "Sous-titre ou vide",
      "voiceLine": "Texte dit par la voix off pendant cette tranche horaire",
      "concept": "Concept visuel fort et description de l'action",
      "transitionOut": {
        "type": "object_zoom_portal",
        "triggerElement": "element_cle",
        "description": "La caméra plonge dans l'élément central pour ouvrir la scène 2"
      }
    }
  ]
}`;

        const userPromptText = `PROJET VIDÉO À STRUCTURER :
- Brief : "${prompt}"
- Format : ${format} (${width}x${height})
- Durée ciblée : ${promptDuration ? promptDuration + ' secondes' : '15 à 20 secondes'}
- Audio : ${audioSetup}
- Style : ${chosenTemplate || 'Libre'}
- Chaîne : ${channelId || 'Aucune'}

${hasCustomScript ? `
SCRIPT HORODATÉ FOURNI PAR L'UTILISATEUR :
"""
${customScript}
"""
Veille à ce que chaque scène dans "scenes" reprenne exactement les tranches de temps et paroles du script !
` : ''}`;

        try {
            plan = await callGeminiAPI(systemPrompt, userPromptText, 0.7, preferredAi);
        } catch (geminiError) {
            console.warn("[Plan Gen Fallback]:", geminiError.message);
            let fallbackNarration = `${prompt}. Découvrez cette histoire fascinante en quelques secondes.`;
            if (hasCustomScript) {
                const voiceLines = customScript.split('\n')
                    .filter(l => /^(?:voix|voice|narrateur)\s*:/i.test(l.trim()))
                    .map(l => l.replace(/^(?:voix|voice|narrateur)\s*:\s*/i, '').trim());
                if (voiceLines.length > 0) fallbackNarration = voiceLines.join(' ');
            }

            plan = {
                title: prompt.slice(0, 45) || baseRawName,
                slug: baseRawName,
                pitch: prompt || 'Composition vidéo dynamique',
                targetDuration: promptDuration || 20.0,
                visualStrategy: discoveredResources.visualStrategy,
                background: { type: payload.backgroundType || 'black', global: '#000000', textMain: '#ffffff', textMuted: '#94a3b8' },
                theme: { primaryColor: '#000000', secondaryColor: '#121217', accentColor: '#f59e0b', fontTitle: 'Outfit', fontBody: 'Inter' },
                narration: fallbackNarration,
                toolsNeeded: {
                    voiceTts: hasVoice,
                    brandLogo: /logo|marque|apple|nike|tesla|google|meta|amazon|rolex/i.test(prompt),
                    brandDomain: /nike/i.test(prompt) ? 'nike.com' : (/rolex/i.test(prompt) ? 'rolex.com' : (/apple/i.test(prompt) ? 'apple.com' : '')),
                    map: /carte|map|pays|ville|paris|tokyo|france/i.test(prompt),
                    mapQuery: 'Paris, France',
                    flag: /suisse|france|japon|etats-unis|usa|bresil|allemagne|chine/i.test(prompt),
                    country: 'France',
                    threeJsProcedural: discoveredResources.visualStrategy === '3d_immersion'
                },
                scenes: [
                    { 
                        id: 1, 
                        type: "cinematic_hook",
                        timeStart: 0.0, 
                        timeEnd: 4.0, 
                        headline: "DÉCOUVREZ L'HISTOIRE", 
                        headlineAccent: "L'HISTOIRE", 
                        subtitle: "Ce que personne n'avait anticipé", 
                        voiceLine: fallbackNarration.slice(0, 60), 
                        concept: "Accroche visuelle et typographique percutante",
                        transitionOut: { type: "object_zoom_portal", triggerElement: "logo_central", description: "Zoom avant dynamique dans le symbole" }
                    },
                    { 
                        id: 2, 
                        type: "dynamic_tension",
                        timeStart: 4.0, 
                        timeEnd: 11.0, 
                        headline: "L'IMPACT FONDAMENTAL", 
                        headlineAccent: "FONDAMENTAL", 
                        subtitle: "Une transformation radicale", 
                        voiceLine: fallbackNarration.slice(60, 120), 
                        concept: "Démonstration visuelle et schémas dynamiques",
                        transitionOut: { type: "whip_slide", triggerElement: "flux_donnees", description: "Balayage rapide vers la conclusion" }
                    },
                    { 
                        id: 3, 
                        type: "concluding_climax",
                        timeStart: 11.0, 
                        timeEnd: (promptDuration || 16.0), 
                        headline: "LE FUTUR COMMENCE", 
                        headlineAccent: "MAINTENANT", 
                        subtitle: "La conclusion incontournable", 
                        voiceLine: fallbackNarration.slice(120), 
                        concept: "Conclusion cinématique avec call-to-action signature",
                        transitionOut: { type: "cinematic_dissolve", triggerElement: "fond", description: "Fondu final élégant" }
                    }
                ]
            };
        }

        // Si l'utilisateur avait fourni un script horodaté rigoureux, forcer les scènes découpées
        if (parsedScriptScenes.length > 0 && plan && Array.isArray(plan.scenes)) {
            plan.scenes = parsedScriptScenes.map((ps, idx) => {
                const existing = plan.scenes[idx] || {};
                return {
                    id: ps.id,
                    timeStart: ps.timeStart,
                    timeEnd: ps.timeEnd,
                    duration: ps.duration,
                    headline: existing.headline || ps.visualConcept.slice(0, 35) || `SCÈNE ${ps.id}`,
                    headlineAccent: existing.headlineAccent || '',
                    subtitle: existing.subtitle || ps.visualConcept,
                    voiceLine: ps.voiceLine,
                    concept: ps.visualConcept || existing.concept || ''
                };
            });
        }

        checkpoint.plan = plan;
        saveCheckpoint(checkpointPath, checkpoint);
        logAndSaveStep('step_init', 'Plan narratif validé avec succès !', 22, `Plan validé : "${plan.title}" (${plan.scenes.length} scènes découpées)`, 'success');
    }

    // =========================================================================
    // ÉTAPE 2 : GESTION DE LA VOIX OFF & CALAGE TIMELINE
    // =========================================================================
    let generatedVoiceRelPath = '';
    let voiceDurationSeconds = plan.targetDuration || 18.0;

    if (hasVoice) {
        if (checkpoint.voice && checkpoint.voice.done && checkpoint.voice.path && fs.existsSync(path.resolve(ROOT_DIR, checkpoint.voice.path))) {
            generatedVoiceRelPath = checkpoint.voice.path;
            voiceDurationSeconds = checkpoint.voice.duration || 18.0;
            logAndSaveStep('step_voice', 'Voix off déjà existante (Reprise)', 38, `[Reprise] Voix off réutilisée : ${generatedVoiceRelPath} (${voiceDurationSeconds.toFixed(1)}s)`, 'success');
        } else if (payload.hasUserVoice && payload.voiceover) {
            logAndSaveStep('step_voice', 'Indexation de la voix off fournie...', 28, `Utilisation du fichier audio fourni : ${payload.voiceover}`, 'info');
            generatedVoiceRelPath = isClient
                ? `Clients/${clientName}/voix_off/${payload.voiceover}`
                : (isChannel
                    ? `${assetPrefix}/Voix_Off/${channelId}/${payload.voiceover}`
                    : `${assetPrefix}/Voix_Off/${payload.voiceover}`);

            const fullVoicePath = path.resolve(ROOT_DIR, generatedVoiceRelPath);
            const exactDur = await getAudioDuration(fullVoicePath);
            if (exactDur) voiceDurationSeconds = exactDur;
            checkpoint.voice = { done: true, path: generatedVoiceRelPath, duration: voiceDurationSeconds };
            saveCheckpoint(checkpointPath, checkpoint);
            logAndSaveStep('step_voice', 'Voix off fournie indexée et mesurée !', 38, `Durée mesurée : ${voiceDurationSeconds.toFixed(1)}s`, 'success');
        } else {
            logAndSaveStep('step_voice', 'Synthèse vocale IA ElevenLabs...', 28, `07_Scripts/generate_voice.cjs : génération de la narration vocale...`, 'info');
            try {
                const voiceDir = isChannel ? path.join(ROOT_DIR, '01_Assets', 'Voix_Off', channelId) : path.join(ROOT_DIR, '01_Assets', 'Voix_Off');
                ensureDir(voiceDir);
                const voiceFile = `narration_${baseRawName}${suffix}.mp3`;
                const fullVoicePath = path.join(voiceDir, voiceFile);

                const { generateElevenLabs } = require('./generate_voice.cjs');
                const ttsRes = await generateElevenLabs({
                    text: plan.narration,
                    outputPath: fullVoicePath
                });

                if (ttsRes && fs.existsSync(fullVoicePath)) {
                    generatedVoiceRelPath = isChannel
                        ? `${assetPrefix}/Voix_Off/${channelId}/${voiceFile}`
                        : `${assetPrefix}/Voix_Off/${voiceFile}`;

                    const exactDur = await getAudioDuration(fullVoicePath);
                    if (exactDur && exactDur > 2.0) {
                        voiceDurationSeconds = exactDur;
                    } else {
                        const wordsCount = (plan.narration || '').split(/\s+/).length;
                        voiceDurationSeconds = Math.max(8.0, Math.round((wordsCount / 2.5) * 10) / 10);
                    }
                    checkpoint.voice = { done: true, path: generatedVoiceRelPath, duration: voiceDurationSeconds };
                    saveCheckpoint(checkpointPath, checkpoint);
                    logAndSaveStep('step_voice', 'Voix off générée et mesurée avec succès !', 38, `Voix générée : ${voiceFile} (${voiceDurationSeconds.toFixed(1)}s)`, 'success');
                }
            } catch (voiceErr) {
                console.warn("[Voice TTS Warning] :", voiceErr.message);
                logAndSaveStep('step_voice', 'Voix off synthétisée en mode résilient.', 38, `Mode résilient : ${voiceErr.message}`, 'warning');
            }
        }
    }

    // Durée totale calibrée
    let totalVideoDuration = hasVoice
        ? Math.max(8.0, Math.ceil(voiceDurationSeconds + 1.0))
        : (promptDuration || plan.targetDuration || 20.0);

    checkpoint.totalVideoDuration = totalVideoDuration;
    saveCheckpoint(checkpointPath, checkpoint);

    // Musique d'ambiance
    let musicRelPath = '';
    if (hasMusic) {
        const defaultMusicFile = path.join(ROOT_DIR, '01_Assets', 'Musiques', 'Fresh___Funky.mp3');
        if (payload.music) {
            musicRelPath = isChannel ? `${assetPrefix}/Musiques/${channelId}/${payload.music}` : `${assetPrefix}/Musiques/${payload.music}`;
        } else if (fs.existsSync(defaultMusicFile)) {
            musicRelPath = `${assetPrefix}/Musiques/Fresh___Funky.mp3`;
        }
    }

    // =========================================================================
    // ÉTAPE 3 : GESTION DES ASSETS & TÉLÉCHARGEMENTS
    // =========================================================================
    let downloadedLogoPath = '';
    let downloadedFlagPath = '';
    let downloadedMapPath = '';
    let downloadedWebCapturePath = '';
    const downloadedFootballLogos = [];

    if (checkpoint.assets && checkpoint.assets.done) {
        downloadedLogoPath = checkpoint.assets.downloaded?.logo || '';
        downloadedFlagPath = checkpoint.assets.downloaded?.flag || '';
        downloadedMapPath = checkpoint.assets.downloaded?.map || '';
        downloadedWebCapturePath = checkpoint.assets.downloaded?.web || '';
        logAndSaveStep('step_assets', 'Assets déjà indexés (Reprise)', 50, `[Reprise] Médias et logos déjà disponibles.`, 'info');
    } else {
        logAndSaveStep('step_assets', 'Vérification et récupération des assets nécessaires...', 42, `Inspection des logos, cartes géographiques et drapeaux...`, 'info');

        // Capture Web
        let detectedUrl = null;
        let detectedDomain = null;
        const urlMatch = prompt.match(/https?:\/\/[^\s\)\],;]+/i);
        if (urlMatch) {
            detectedUrl = urlMatch[0];
            try { detectedDomain = new URL(detectedUrl).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) { }
        } else {
            const domainMatch = prompt.match(/\b([a-zA-Z0-9-]+\.(?:com|io|fr|org|net|co|ai|dev|app|tech|me))\b/i);
            if (domainMatch) {
                detectedDomain = domainMatch[1].toLowerCase();
                detectedUrl = `https://${detectedDomain}`;
            }
        }

        if (detectedUrl) {
            try {
                const webSlug = extractCleanSlug(detectedDomain || 'website', 2);
                const webImgName = `web_${webSlug}${suffix}.png`;
                const webImgDir = isChannel ? path.join(ROOT_DIR, '01_Assets', 'Images', channelId) : path.join(ROOT_DIR, '01_Assets', 'Images');
                ensureDir(webImgDir);
                const webImgFull = path.join(webImgDir, webImgName);
                if (!fs.existsSync(webImgFull)) {
                    const recordScript = path.join(ROOT_DIR, '07_Scripts', 'record_web.cjs').replace(/\\/g, '/');
                    const safeWebImgFull = webImgFull.replace(/\\/g, '/');
                    await execAsync(`node "${recordScript}" --url "${detectedUrl}" --mode image --out "${safeWebImgFull}"`, 35000);
                }
                if (fs.existsSync(webImgFull)) {
                    downloadedWebCapturePath = isChannel ? `${assetPrefix}/Images/${channelId}/${webImgName}` : `${assetPrefix}/Images/${webImgName}`;
                    logAndSaveStep('step_assets', 'Capture HD du site web prête !', 44, `Capture enregistrée : ${downloadedWebCapturePath}`, 'success');
                }
            } catch (webErr) {
                console.warn("Erreur record_web :", webErr.message);
            }
        }

        // =========================================================================
        // LOGOS DE MARQUES & PRODUITS : Moteur de résolution universel et dynamique
        // (Zéro dictionnaire restrictif : scan local + Iconify Logos + Simple-Icons + Brandfetch / Google Favicons HD)
        // =========================================================================
        let brandDomain = plan.toolsNeeded?.brandDomain || detectedDomain;
        const brandAliases = {
            'chatgpt': 'chatgpt.com',
            'openai': 'openai.com',
            'claude': 'anthropic.com',
            'anthropic': 'anthropic.com'
        };

        const localLogosDir = path.join(ROOT_DIR, '01_Assets', 'Logos');
        const promptWords = normPromptPre.toLowerCase().split(/[^a-z0-9_-]+/).filter(w => w.length >= 3);
        const stopWords = new Set(['cree', 'creer', 'video', 'style', 'pour', 'avec', 'dans', 'sur', 'une', 'des', 'les', 'par', 'fait', 'fais', 'montre', 'intro', 'presentation', 'tout', 'tous']);

        // 1. Scan dynamique des logos déjà présents localement dans 01_Assets/Logos/
        if (fs.existsSync(localLogosDir)) {
            const existingFiles = fs.readdirSync(localLogosDir);
            for (const word of promptWords) {
                if (stopWords.has(word)) continue;
                const match = existingFiles.find(f => {
                    const base = f.toLowerCase().replace(/\.[^.]+$/, '');
                    return base === word || base === `${word}_symbol` || base === `${word}_logo` || base.startsWith(word + '_') || base.endsWith('_' + word);
                });
                if (match) {
                    downloadedLogoPath = `${assetPrefix}/Logos/${match}`;
                    logAndSaveStep('step_assets', `Logo officiel "${word}" détecté localement !`, 46, `Logo : ${downloadedLogoPath}`, 'success');
                    break;
                }
            }
        }

        // 2. Si non trouvé localement, identifier le domaine ou le nom de la marque
        if (!downloadedLogoPath) {
            if (!brandDomain) {
                for (const word of promptWords) {
                    if (brandAliases[word]) {
                        brandDomain = brandAliases[word];
                        break;
                    }
                }
            }
            if (!brandDomain) {
                const candidateBrand = promptWords.find(w => !stopWords.has(w) && w.length >= 4);
                if (candidateBrand) {
                    brandDomain = `${candidateBrand}.com`;
                }
            }
        }

        // 3. Téléchargement universel : Iconify logos + Simple-Icons (3000+ marques) + Brandfetch (Google Favicons 256px)
        if (!downloadedLogoPath && (brandDomain || promptWords.length > 0)) {
            const candidateSlugs = [];
            if (brandDomain) {
                candidateSlugs.push(brandDomain.replace(/\..+$/, '').toLowerCase().replace(/[\s_]/g, '-'));
            }
            promptWords.filter(w => !stopWords.has(w)).forEach(w => {
                if (!candidateSlugs.includes(w)) candidateSlugs.push(w);
            });

            // A. Essai direct Iconify Logos puis Simple-Icons
            for (const cSlug of candidateSlugs) {
                const targetSvgPath = path.join(ROOT_DIR, '01_Assets', 'Logos', `${cSlug}.svg`);
                try {
                    let ok = await downloadIconifySvg(cSlug, targetSvgPath);
                    if (!ok) {
                        ok = await downloadIconifySimpleIcon(cSlug, targetSvgPath);
                    }
                    if (ok && fs.existsSync(targetSvgPath)) {
                        downloadedLogoPath = `${assetPrefix}/Logos/${cSlug}.svg`;
                        logAndSaveStep('step_assets', `Logo vectoriel SVG officiel "${cSlug}" téléchargé !`, 47, `Logo : ${downloadedLogoPath}`, 'success');
                        break;
                    }
                } catch (e) { }
            }

            // B. Si toujours pas trouvé, appeler brandfetch.cjs (Iconify + Google Favicons 256px pour TOUS les domaines)
            if (!downloadedLogoPath && brandDomain) {
                try {
                    const brandScript = path.join(ROOT_DIR, '07_Scripts', 'brandfetch.cjs').replace(/\\/g, '/');
                    await execAsync(`node "${brandScript}" ${brandDomain}`, 15000);
                    const slug = brandDomain.replace(/\.com$|\.net$|\.org$|\.io$|\.app$|\.so$/, '').toLowerCase().replace(/[\s_]/g, '-');
                    const cleanDomain = brandDomain.replace(/\./g, '_');

                    const candidates = [
                        path.join(ROOT_DIR, '01_Assets', 'Logos', `${slug}.svg`),
                        path.join(ROOT_DIR, '01_Assets', 'Logos', `${slug}_symbol.svg`),
                        path.join(ROOT_DIR, '01_Assets', 'Logos', `${slug}.png`),
                        path.join(ROOT_DIR, '01_Assets', 'Logos', `${cleanDomain}_favicon.png`),
                        path.join(ROOT_DIR, '01_Assets', 'Logos', `${slug}_favicon.png`)
                    ];
                    for (const cand of candidates) {
                        if (fs.existsSync(cand)) {
                            downloadedLogoPath = `${assetPrefix}/Logos/${path.basename(cand)}`;
                            logAndSaveStep('step_assets', 'Logo officiel récupéré !', 48, `Logo : ${downloadedLogoPath}`, 'success');
                            break;
                        }
                    }
                } catch (e) {
                    console.warn("Erreur brandfetch:", e.message);
                }
            }
        }

        // Blasons de Football
        try {
            const { fetchFootballLogo } = require('./fetch_football_logo.cjs');
            const footballClubs = ['real madrid', 'manchester city', 'bayern munich', 'barcelona', 'barça', 'inter', 'ac milan', 'psg', 'arsenal', 'liverpool', 'chelsea', 'juventus', 'dortmund'];
            const fullPromptAndScript = (normPromptPre + ' ' + (customScript || '').toLowerCase());
            for (const clubName of footballClubs) {
                if (fullPromptAndScript.includes(clubName)) {
                    try {
                        const fbRes = await fetchFootballLogo(clubName);
                        if (fbRes && fbRes.localPath && fs.existsSync(path.join(ROOT_DIR, fbRes.localPath))) {
                            const clubSlug = path.basename(fbRes.localPath);
                            downloadedFootballLogos.push({ name: clubName, path: `${assetPrefix}/Logos/Football/${clubSlug}` });
                        }
                    } catch (e) { }
                }
            }
        } catch (e) { }

        // Drapeaux
        let flagTarget = plan.toolsNeeded?.country;
        if (!flagTarget) {
            const flagKeywords = ['france', 'japon', 'japan', 'usa', 'états-unis', 'suisse', 'switzerland', 'allemagne', 'germany', 'brésil', 'italie', 'espagne', 'canada', 'maroc', 'sénégal'];
            for (const fk of flagKeywords) {
                if (new RegExp(`\\b${fk}\\b`, 'i').test(normPromptPre)) { flagTarget = fk; break; }
            }
        }
        if (flagTarget) {
            try {
                const flagRes = await fetchFlag(flagTarget);
                if (flagRes && (flagRes.svgPath || flagRes.pngPath)) {
                    downloadedFlagPath = `${assetPrefix}/Flags/${path.basename(flagRes.svgPath || flagRes.pngPath)}`;
                    logAndSaveStep('step_assets', 'Drapeau officiel prêt !', 48, `Drapeau : ${downloadedFlagPath}`, 'success');
                }
            } catch (e) { }
        }

        // Cartes
        let mapQuery = plan.toolsNeeded?.mapQuery;
        let mapStyle = plan.toolsNeeded?.mapStyle || 'dark';
        if (!mapQuery && /carte|map|satellite|géographie|pays|territoire|capitale|ville/i.test(normPromptPre)) {
            mapQuery = flagTarget || prompt.split(/[,:.]/)[0];
        }
        if (mapQuery) {
            try {
                const mapOut = path.join(ROOT_DIR, '01_Assets', 'Maps', `map_${sanitizeFilename(mapQuery)}${suffix}.png`);
                ensureDir(path.dirname(mapOut));
                if (!fs.existsSync(mapOut)) {
                    const safeMapScript = path.join(ROOT_DIR, '07_Scripts', 'fetch_map.cjs').replace(/\\/g, '/');
                    const safeMapOut = mapOut.replace(/\\/g, '/');
                    await execAsync(`node "${safeMapScript}" --query "${mapQuery}" --style "${mapStyle}" --out "${safeMapOut}"`, 25000);
                }
                if (fs.existsSync(mapOut)) {
                    downloadedMapPath = `${assetPrefix}/Maps/${path.basename(mapOut)}`;
                    logAndSaveStep('step_assets', 'Carte géographique prête !', 50, `Carte satellite : ${downloadedMapPath}`, 'success');
                }
            } catch (e) { }
        }

        checkpoint.assets = {
            done: true,
            downloaded: {
                logo: downloadedLogoPath,
                flag: downloadedFlagPath,
                map: downloadedMapPath,
                web: downloadedWebCapturePath,
                footballLogos: downloadedFootballLogos
            }
        };
        saveCheckpoint(checkpointPath, checkpoint);
    }

    // Liste des assets formatée pour les prompts des scènes
    const availableAssetsList = [];
    if (downloadedWebCapturePath) availableAssetsList.push(`- Capture HD du site : "${downloadedWebCapturePath}"`);
    if (downloadedLogoPath) availableAssetsList.push(`- Logo officiel de marque disponible : "${downloadedLogoPath}" -> Intègre ce logo de manière élégante et adaptée au style de la scène (dans l'en-tête, sur une carte d'interface, au centre en révélation héroïque ou en signature visuelle).`);
    if (downloadedFlagPath) availableAssetsList.push(`- Drapeau national : "${downloadedFlagPath}"`);
    if (downloadedMapPath) availableAssetsList.push(`- Carte géographique : "${downloadedMapPath}"`);
    downloadedFootballLogos.forEach(fb => availableAssetsList.push(`- Blason club "${fb.name}" : "${fb.path}"`));
    userUploadedAssets.forEach(u => availableAssetsList.push(`- Asset utilisateur [${u.category}] : "${u.url}"`));

    // Couleurs & Design
    const userBgType = payload.backgroundType;
    const isAiDecidedBg = (!userBgType || userBgType === 'auto' || userBgType === 'ai' || userBgType === 'libre');
    let stageBackgroundCss = '#090d16';
    let isLight = false;

    if (isAiDecidedBg) {
        stageBackgroundCss = extractCssValue(plan.background?.global || '#090d16');
        const cssLower = stageBackgroundCss.toLowerCase();
        isLight = isColorLight(stageBackgroundCss) || cssLower.includes('#ffffff') || cssLower.includes('#faf8f5') || cssLower.includes('#f4f0e6');
    } else if (userBgType === 'white') {
        stageBackgroundCss = '#faf8f5';
        isLight = true;
    } else if (userBgType === 'black') {
        stageBackgroundCss = '#000000';
        isLight = false;
    } else if (userBgType === 'solid') {
        stageBackgroundCss = payload.backgroundColor || '#111827';
        isLight = isColorLight(stageBackgroundCss);
    } else if (userBgType === 'gradient') {
        stageBackgroundCss = extractCssValue(payload.backgroundGradient || 'linear-gradient(135deg, #ffffff 0%, #ff6600 100%)');
        const gradColors = Array.isArray(payload.gradientColors) && payload.gradientColors.length > 0
            ? payload.gradientColors
            : ['#ffffff', '#ff6600'];
        const hasLight = gradColors.some(c => {
            const hex = String(c).toLowerCase().trim();
            return hex === '#ffffff' || hex === '#fff' || isColorLight(hex);
        });
        isLight = hasLight || stageBackgroundCss.toLowerCase().includes('#ffffff') || stageBackgroundCss.toLowerCase().includes('#fff');
    } else {
        stageBackgroundCss = extractCssValue(plan.background?.global || '#090d16');
        isLight = isColorLight(stageBackgroundCss);
    }

    let baseBg = extractCssValue(stageBackgroundCss);
    const mainTextColor = isLight ? '#09090b' : '#ffffff';
    const mutedTextColor = isLight ? '#475569' : '#94a3b8';
    const cardBgColor = isLight ? 'rgba(255, 255, 255, 0.90)' : '#0d1117';
    const cardBorderColor = isLight ? 'rgba(0, 0, 0, 0.10)' : 'rgba(255, 255, 255, 0.12)';
    const accentColor = (Array.isArray(payload.gradientColors) && payload.gradientColors[1]) || plan.theme?.accentColor || '#f59e0b';
    const fontTitle = plan.theme?.fontTitle || payload.font || 'Outfit';
    const fontBody = plan.theme?.fontBody || payload.font || 'Inter';

    // =========================================================================
    // PRÉPARATION DU SOUND DESIGN SFX (OPENVERSE & SYNTHÈSE EARSHOT)
    // =========================================================================
    let sfxMap = {};
    try {
        logAndSaveStep('step_assets', 'Préparation du Sound Design (Openverse & Earshot)...', 48, 'Mise en cache des bruitages haute fidélité...', 'info');
        sfxMap = await ensureSfxCollection(['whoosh', 'pop', 'click', 'ding', 'keyboard']);
    } catch (sfxErr) {
        console.warn('[AI Director] Avertissement SFX:', sfxErr.message);
    }

    // =========================================================================
    // ÉTAPE 4 : DÉCOUPAGE ET GÉNÉRATION SCÈNE PAR SCÈNE (AVEC REPRISE)
    // =========================================================================
    checkpoint.scenes = Array.isArray(checkpoint.scenes) ? checkpoint.scenes : [];
    const totalScenes = plan.scenes && plan.scenes.length ? plan.scenes.length : 3;

    // Calibrer les timecodes de chaque scène sur la durée totale réelle
    const sceneSlice = totalVideoDuration / totalScenes;
    plan.scenes.forEach((sc, idx) => {
        if (sc.timeStart === undefined || sc.timeStart === null) {
            sc.timeStart = Math.round(idx * sceneSlice * 10) / 10;
        }
        if (sc.timeEnd === undefined || sc.timeEnd === null) {
            sc.timeEnd = Math.round((idx + 1) * sceneSlice * 10) / 10;
        }
    });

    for (let sIdx = 0; sIdx < totalScenes; sIdx++) {
        const scNum = sIdx + 1;
        const currentScPlan = plan.scenes[sIdx];
        const scenePercent = Math.min(92, Math.round(52 + (sIdx / totalScenes) * 38));

        if (checkpoint.scenes[sIdx] && checkpoint.scenes[sIdx].done) {
            logAndSaveStep('step_scenes', `Scène ${scNum}/${totalScenes} déjà prête (Reprise)`, scenePercent, `[Reprise] Scène ${scNum} validée : "${currentScPlan.headline || ''}"`, 'info');
            continue;
        }

        logAndSaveStep('step_scenes', `Génération de la scène ${scNum}/${totalScenes}...`, scenePercent, `Conception motion design de la scène ${scNum} [${currentScPlan.timeStart}s -> ${currentScPlan.timeEnd}s] calée sur la voix off...`, 'info');

        let sceneCode = null;
        try {
            sceneCode = await generateSceneCodeWithGemini({
                sceneIndex: scNum,
                totalScenes,
                scenePlan: currentScPlan,
                theme: plan.theme,
                baseBg,
                isLight,
                format,
                width,
                height,
                accentColor,
                availableAssetsList,
                skillsDirectives,
                templateDirectives,
                preferredAi
            });
        } catch (scErr) {
            console.warn(`[Scene ${scNum} Fallback] :`, scErr.message);
            sceneCode = buildFallbackScene(scNum, totalScenes, currentScPlan, format, accentColor, availableAssetsList);
        }

        if (!sceneCode || !sceneCode.htmlContent) {
            sceneCode = buildFallbackScene(scNum, totalScenes, currentScPlan, format, accentColor, availableAssetsList);
        }

        // Sanitisation
        let safeSceneHtml = (sceneCode.htmlContent || '').replace(/style=(["'])(.*?)\1/gi, (match, quote, styleStr) => {
            return `style=${quote}${styleStr.replace(/!important/gi, '')}${quote}`;
        });
        let safeSceneCss = (sceneCode.customCss || '').replace(/!important/gi, '');

        checkpoint.scenes[sIdx] = {
            id: scNum,
            timeStart: currentScPlan.timeStart,
            timeEnd: currentScPlan.timeEnd,
            headline: currentScPlan.headline,
            htmlContent: safeSceneHtml,
            customCss: safeSceneCss,
            gsapTimelineCode: sceneCode.gsapTimelineCode || '',
            done: true
        };

        saveCheckpoint(checkpointPath, checkpoint);
        logAndSaveStep('step_scenes', `Scène ${scNum}/${totalScenes} générée avec succès !`, scenePercent + 2, `✓ Scène ${scNum} intégrée et synchronisée sur les paroles de la voix off.`, 'success');
    }

    // =========================================================================
    // ÉTAPE 5 : SOUS-TITRES DYNAMIQUES MOT-À-MOT & FINALISATION
    // =========================================================================
    logAndSaveStep('step_final', 'Synchronisation des sous-titres et assemblage final...', 93, `Calcul de la synchronisation mot-à-mot et écriture du fichier vidéo...`, 'info');

    let subtitleCues = [];
    if (showSubtitles) {
        const rawText = plan.narration || `${prompt}. Composition créée avec AutoFrame.`;
        const speechStart = 0.35;
        const speechEnd = Math.max(speechStart + 1.2, voiceDurationSeconds - 0.25);
        const availableDuration = speechEnd - speechStart;

        const sentences = rawText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [rawText];
        const allSegments = [];

        sentences.forEach(sent => {
            const trimmed = sent.trim();
            if (!trimmed) return;
            const words = trimmed.split(/\s+/).filter(Boolean);
            if (words.length <= 5) {
                allSegments.push(words);
            } else {
                let idx = 0;
                while (idx < words.length) {
                    const remaining = words.length - idx;
                    let chunkSize = 4;
                    if (remaining === 5) chunkSize = 3;
                    allSegments.push(words.slice(idx, idx + chunkSize));
                    idx += chunkSize;
                }
            }
        });

        const charWeight = (w) => Math.max(w.length, 2);
        const totalChars = allSegments.reduce((acc, seg) => acc + seg.reduce((a, w) => a + charWeight(w), 0), 0);
        let currentSec = speechStart;

        allSegments.forEach(groupWords => {
            const groupChars = groupWords.reduce((a, w) => a + charWeight(w), 0);
            const groupRatio = groupChars / totalChars;
            const groupDuration = groupRatio * availableDuration;
            const groupStart = Math.round(currentSec * 100) / 100;
            const groupEnd = Math.round((currentSec + groupDuration) * 100) / 100;

            let runningWordTime = groupStart;
            const wordsWithTiming = groupWords.map(w => {
                const wRatio = charWeight(w) / groupChars;
                const wDur = groupDuration * wRatio;
                const wStart = Math.round(runningWordTime * 100) / 100;
                const wEnd = Math.round((runningWordTime + wDur) * 100) / 100;
                runningWordTime += wDur;
                return { word: w, start: wStart, end: wEnd };
            });

            subtitleCues.push({
                start: groupStart,
                end: groupEnd,
                text: groupWords.join(' '),
                words: wordsWithTiming
            });

            currentSec = groupEnd;
        });
    }

    // Configuration des styles de sous-titres
    const subPos = payload.subtitlePosition || 'bottom';
    let subPosCss = 'bottom: 70px;';
    if (subPos === 'top') subPosCss = 'top: 80px;';
    else if (subPos === 'center') subPosCss = 'top: 50%; transform: translate(-50%, -50%);';

    const subFont = payload.subtitleCustomFont || payload.subtitleFont || 'Inter';
    const subBaseColor = payload.subtitleBaseColor || (isLight ? '#000000' : '#ffffff');
    const subAccentColor = payload.subtitleAccentColor || accentColor;
    const subBg = payload.subtitleBg !== false;
    const subBgColor = payload.subtitleBgColor || (isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(0, 0, 0, 0.85)');
    const subRadius = payload.subtitleRadius !== undefined ? payload.subtitleRadius : 8;
    const subGlow = Boolean(payload.subtitleGlow);
    const subType = payload.subtitleType || 'type-wordbyword';

    const subBgStyle = subBg ? `background: ${subBgColor};`: 'background: transparent;';
    const subGlowStyle = subGlow ? `text-shadow: 0 0 16px ${subAccentColor};`: '';

    // Rassemblement du code de toutes les scènes générées
    const allScenesHtml = checkpoint.scenes.map(s => s.htmlContent).join('\n');
    const allScenesCss = checkpoint.scenes.map(s => s.customCss).join('\n');
    const allScenesGsap = checkpoint.scenes.map(s => s.gsapTimelineCode).join('\n');

    const finalHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>${plan.title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800;900&family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@1,600;1,700&family=JetBrains+Mono:wght@600;700;800&family=Montserrat:wght@800;900&display=swap" rel="stylesheet">
    <!-- GSAP 3.12.5 -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
    <!-- AnimeJS 3.2.2 (Support universel micro-animations, ressorts & compteurs) -->
    <script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Flag Icons CSS (Drapeaux vectoriels parfaits partout sans lettres brutes) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/css/flag-icons.min.css"/>
    <!-- Lucide Icons (Composants graphiques shadcn / UI) -->
    <script src="https://unpkg.com/lucide@latest"></script>
    <!-- Iconify Web Component (200 000+ logos & icônes officielles) -->
    <script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>
    <script>
        // Configuration Tailwind avec Design Tokens shadcn/ui
        if (typeof tailwind !== 'undefined') {
            tailwind.config = {
                darkMode: 'class',
                theme: {
                    extend: {
                        colors: {
                            border: "hsl(var(--border))",
                            background: "hsl(var(--background))",
                            foreground: "hsl(var(--foreground))",
                            card: {
                                DEFAULT: "hsl(var(--card))",
                                foreground: "hsl(var(--card-foreground))"
                            },
                            primary: {
                                DEFAULT: "hsl(var(--primary))",
                                foreground: "hsl(var(--primary-foreground))"
                            },
                            muted: {
                                DEFAULT: "hsl(var(--muted))",
                                foreground: "hsl(var(--muted-foreground))"
                            },
                            accent: {
                                DEFAULT: "hsl(var(--accent))",
                                foreground: "hsl(var(--accent-foreground))"
                            }
                        },
                        borderRadius: {
                            lg: "var(--radius)",
                            md: "calc(var(--radius) - 2px)",
                            sm: "calc(var(--radius) - 4px)"
                        }
                    }
                }
            };
        }
    </script>
    <style>
        :root {
            /* Design Tokens Officiels shadcn/ui */
            --background: ${isLight ? '0 0% 100%' : '240 10% 3.9%'};
            --foreground: ${isLight ? '240 10% 3.9%' : '0 0% 98%'};
            --card: ${isLight ? '0 0% 100%' : '240 10% 4.9%'};
            --card-foreground: ${isLight ? '240 10% 3.9%' : '0 0% 98%'};
            --primary: ${isLight ? '240 10% 3.9%' : '0 0% 98%'};
            --primary-foreground: ${isLight ? '0 0% 98%' : '240 5.9% 10%'};
            --muted: ${isLight ? '240 4.8% 95.9%' : '240 3.7% 15.9%'};
            --muted-foreground: ${isLight ? '240 3.8% 46.1%' : '240 5% 64.9%'};
            --border: ${isLight ? '240 5.9% 90%' : '240 3.7% 15.9%'};
            --radius: 0.75rem;

            --bg-base: ${baseBg};
            --text-main: ${mainTextColor};
            --text-muted: ${mutedTextColor};
            --card-bg: ${cardBgColor};
            --card-border: ${cardBorderColor};
            --accent: ${accentColor};
            --font-title: '${fontTitle}', sans-serif;
            --font-body: '${fontBody}', sans-serif;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            user-select: none;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
        }

        *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }

        html, body {
            width: 100%;
            height: 100%;
            overflow: hidden !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
            background: #000000;
            font-family: var(--font-body);
            color: var(--text-main);
        }

        /* EFFETS ACETERNITY & MAGIC UI (Poids Plume CSS) */
        .bg-dot-grid {
            background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
            background-size: 28px 28px;
        }
        .bg-line-grid {
            background-image: linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
            background-size: 40px 40px;
        }
        .border-beam {
            position: relative;
            overflow: hidden;
        }
        .border-beam::after {
            content: '';
            position: absolute;
            inset: 0;
            border: 1px solid transparent;
            border-radius: inherit;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%) border-box;
            -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
        }
        .text-shimmer {
            background: linear-gradient(110deg, #a1a1aa 40%, #ffffff 50%, #a1a1aa 60%);
            background-size: 200% 100%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: text-shimmer-run 3.5s ease-in-out infinite;
        }
        @keyframes text-shimmer-run {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }

        /* CADRE MAÎTRE DU STAGE */
        #stage {
            width: ${width}px;
            height: ${height}px;
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            overflow: hidden !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
            background: var(--bg-base);
        }

        /* NORMALISATION LUCIDE ICONS & ICONIFY */
        [data-lucide], svg.lucide {
            display: inline-block;
            vertical-align: middle;
            stroke-width: 2;
        }
        iconify-icon {
            display: inline-block;
            vertical-align: middle;
        }

        /* CAMÉRA GLOBALE (Travelling continu) */
        #cameraRig {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            transform-origin: center center;
        }

        /* SOUS-TITRES DYNAMIQUES (Style Hormozi) */
        #subtitlesTrack {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            ${subPosCss}
            z-index: 999;
            display: flex;
            justify-content: center;
            align-items: center;
            pointer-events: none;
            width: 90%;
            max-width: 1100px;
        }

        .subtitle-box {
            font-family: '${subFont}', sans-serif;
            font-size: ${format === '9:16' ? '2.4rem' : '2.6rem'};
            font-weight: 800;
            color: ${subBaseColor};
            padding: 12px 24px;
            border-radius: ${subRadius}px;
            ${subBgStyle}
            ${subGlowStyle}
            text-align: center;
            line-height: 1.25;
            letter-spacing: -0.01em;
            display: inline-block;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
            opacity: 0;
            transition: opacity 0.04s ease-out;
        }

        .sub-word {
            display: inline-block;
            margin: 0 4px;
            color: ${subBaseColor};
            font-size: 1em;
            transform: none !important;
            transition: color 0.08s ease;
        }

        .sub-word.active-word {
            color: ${subAccentColor} !important;
            font-weight: 800;
        }

        /* STRUCTURE DES SCÈNES */
        .scene-container {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            visibility: hidden;
            display: none;
            pointer-events: none;
        }
        #scene_1 {
            opacity: 1;
            visibility: visible;
            display: flex;
            pointer-events: auto;
        }

        /* STYLES DE TOUTES LES SCÈNES */
        ${allScenesCss}
    </style>
</head>
<body>

    <div id="stage" data-duration="${totalVideoDuration.toFixed(1)}" data-fps="30" data-width="${width}" data-height="${height}">
        
        <div id="cameraRig">
            ${allScenesHtml}
        </div>

        ${showSubtitles ? `
        <div id="subtitlesTrack">
            <div class="subtitle-box" id="subtitleBox"></div>
        </div>` : ''}

        ${generatedVoiceRelPath ? `<audio id="voiceTrack" src="${generatedVoiceRelPath}" preload="auto"></audio>` : ''}
        ${musicRelPath ? `<audio id="musicTrack" src="${musicRelPath}" preload="auto" loop></audio>` : ''}

    </div>

    <script>
        window.VIDEO_CONFIG = {
            id: "vid_${Date.now()}",
            title: "${plan.title.replace(/"/g, '\\"')}",
            prompt: "${prompt.replace(/"/g, '\\"')}",
            suffix: "${suffix}",
            status: "completed",
            format: "${format}",
            duration: ${totalVideoDuration.toFixed(1)},
            fps: 30,
            audio: {
                voiceover: "${generatedVoiceRelPath}",
                music: "${musicRelPath}",
                musicVolume: 0.15,
                setup: "${audioSetup}"
            },
            styling: {
                titleFont: "'${fontTitle}', sans-serif",
                subtitleFont: "'${fontBody}', sans-serif",
                accentColor: "${accentColor}"
            },
            options: {
                showSubtitles: ${showSubtitles},
                subtitleType: "${payload.subtitleType || 'type-wordbyword'}",
                subtitleFont: "${payload.subtitleCustomFont || payload.subtitleFont || 'Inter'}",
                subtitleBaseColor: "${payload.subtitleBaseColor || (isLight ? '#000000' : '#ffffff')}",
                subtitleAccentColor: "${payload.subtitleAccentColor || accentColor}",
                subtitleGlow: ${Boolean(payload.subtitleGlow)},
                subtitleBg: ${Boolean(payload.subtitleBg)},
                subtitleBgColor: "${payload.subtitleBgColor || (isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(0, 0, 0, 0.85)')}",
                subtitleRadius: "${payload.subtitleRadius || '8'}",
                subtitlePosition: "${payload.subtitlePosition || 'bottom'}",
                showTitles: true
            },
            subtitleCues: ${JSON.stringify(subtitleCues)},
            subtitles: ${JSON.stringify(subtitleCues)},
            segments: [
                ${(plan.scenes || []).map((sc, i) => `{
                    id: ${sc.id || i + 1},
                    image: "${downloadedWebCapturePath || downloadedLogoPath || ''}",
                    label: "${(sc.headline || '').replace(/"/g, '\\"')}",
                    start: ${sc.timeStart !== undefined ? sc.timeStart : Math.round((i * totalVideoDuration / (plan.scenes.length || 3)) * 10) / 10},
                    end: ${sc.timeEnd !== undefined ? sc.timeEnd : Math.round(((i + 1) * totalVideoDuration / (plan.scenes.length || 3)) * 10) / 10},
                    title: "${(sc.headline || '').replace(/"/g, '\\"')}",
                    subtitle: "${(sc.subtitle || '').replace(/"/g, '\\"')}"
                }`).join(',\n                ')}
            ]
        };
        var VIDEO_CONFIG = window.VIDEO_CONFIG;

        const isIframeMode = window.self !== window.top;
        const stage = document.getElementById('stage');
        const cameraRig = document.getElementById('cameraRig');
        const voiceAudio = document.getElementById('voiceTrack');
        const musicAudio = document.getElementById('musicTrack');
        const subtitleBox = document.getElementById('subtitleBox');

        function handleResize() {
            if (isIframeMode) return;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const scale = Math.min(vw / ${width}, vh / ${height}) * 0.95;
            stage.style.transform = \`translate(-50%, -50%) scale(\${scale})\`;
        }
        window.addEventListener('resize', handleResize);
        handleResize();

        window.__animeTimelines = [];
        try { if (window.lucide) lucide.createIcons(); } catch(e) {}
        setTimeout(() => { try { if (window.lucide) lucide.createIcons(); } catch(e) {} }, 50);

        // SYSTÈME DE SOUND DESIGN HYBRIDE (Openverse & Earshot)
        window.SFX_MAP = ${JSON.stringify(sfxMap || {})};
        window.playSfx = function(name, volume = 0.5) {
            try {
                const map = window.SFX_MAP || {};
                const src = map[name] || \`../01_Assets/SFX/\${name}.mp3\`;
                const audio = new Audio(src);
                audio.volume = Math.min(1, Math.max(0, volume));
                audio.play().catch(() => {});
            } catch(e) {}
        };

        const tl = gsap.timeline({ paused: false });
        window.tl = tl;

        // Continuous Camera Motion
        tl.to(cameraRig, { scale: 1.05, duration: ${totalVideoDuration.toFixed(1)}, ease: "none" }, 0);

        // Animations GSAP des scènes
        try {
            ${allScenesGsap}
        } catch(e) {
            console.error("Erreur GSAP :", e);
        }

        // Dégel et lancement garanti de la timeline maîtresse
        if (typeof gsap !== 'undefined' && gsap.globalTimeline && gsap.globalTimeline.paused()) {
            gsap.globalTimeline.resume();
        }
        if (!isIframeMode) {
            tl.play();
        }

        // Moteur de sous-titres
        const cues = VIDEO_CONFIG.subtitles || [];
        const isWordByWord = ('${subType}' === 'type-wordbyword');

        if (subtitleBox && cues.length > 0) {
            cues.forEach(cue => {
                tl.call(() => {
                    renderSubtitleGroup(cue);
                }, null, cue.start);

                if (isWordByWord && cue.words && cue.words.length > 0) {
                    cue.words.forEach(w => {
                        tl.call(() => {
                            highlightWord(w.word);
                        }, null, w.start);
                    });
                }

                tl.call(() => {
                    hideSubtitleGroup();
                }, null, cue.end);
            });
        }

        function renderSubtitleGroup(cue) {
            if (!subtitleBox) return;
            if (!isWordByWord) {
                subtitleBox.textContent = cue.text;
                subtitleBox.style.opacity = '1';
                return;
            }
            subtitleBox.innerHTML = '';
            (cue.words || []).forEach(wObj => {
                const sp = document.createElement('span');
                sp.className = 'sub-word';
                sp.dataset.word = wObj.word;
                sp.textContent = wObj.word + ' ';
                subtitleBox.appendChild(sp);
            });
            subtitleBox.style.opacity = '1';
        }

        function highlightWord(wordText) {
            if (!subtitleBox || !isWordByWord) return;
            const spans = subtitleBox.querySelectorAll('.sub-word');
            spans.forEach(sp => {
                if (sp.dataset.word === wordText) {
                    sp.classList.add('active-word');
                }
            });
        }

        function hideSubtitleGroup() {
            if (subtitleBox) subtitleBox.style.opacity = '0';
        }

        // Synchronisation audio
        let audioContext = null;
        let isAudioPlaying = false;

        function initAudioContext() {
            if (!audioContext) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) audioContext = new AudioCtx();
            }
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }
        }

        window.syncAudioTimeline = function(timeInSeconds, isPlaying) {
            initAudioContext();
            if (voiceAudio && voiceAudio.src) {
                if (isPlaying) {
                    if (timeInSeconds < voiceAudio.duration) {
                        voiceAudio.currentTime = timeInSeconds;
                        voiceAudio.play().catch(() => {});
                    } else {
                        voiceAudio.pause();
                    }
                } else {
                    voiceAudio.pause();
                    voiceAudio.currentTime = timeInSeconds;
                }
            }

            if (musicAudio && musicAudio.src) {
                musicAudio.volume = VIDEO_CONFIG.audio.musicVolume || 0.15;
                if (isPlaying) {
                    musicAudio.currentTime = timeInSeconds % (musicAudio.duration || 100);
                    musicAudio.play().catch(() => {});
                } else {
                    musicAudio.pause();
                    musicAudio.currentTime = timeInSeconds % (musicAudio.duration || 100);
                }
            }
        };

        function startStandaloneAudio() {
            if (isIframeMode) return;
            initAudioContext();
            if (voiceAudio) voiceAudio.play().catch(() => {});
            if (musicAudio) {
                musicAudio.volume = VIDEO_CONFIG.audio.musicVolume || 0.15;
                musicAudio.play().catch(() => {});
            }
        }

        if (!isIframeMode) {
            window.addEventListener('click', () => {
                initAudioContext();
                if (tl.paused()) {
                    tl.play();
                    startStandaloneAudio();
                }
            }, { once: true });
            startStandaloneAudio();
        }

        window.__timeline = {
            duration: () => ${totalVideoDuration.toFixed(1)},
            seek: (t, isUserSeeking = false) => {
                tl.seek(t, false);
                if (window.__animeTimelines && window.__animeTimelines.length > 0) {
                    window.__animeTimelines.forEach(atl => {
                        try { atl.seek(t * 1000); } catch(e) {}
                    });
                }
                if (isUserSeeking) {
                    window.syncAudioTimeline(t, false);
                }
            },
            pause: () => {
                tl.pause();
                if (window.__animeTimelines && window.__animeTimelines.length > 0) {
                    window.__animeTimelines.forEach(atl => {
                        try { atl.pause(); } catch(e) {}
                    });
                }
                window.syncAudioTimeline(tl.time(), false);
            },
            play: () => {
                if (typeof gsap !== 'undefined' && gsap.globalTimeline && gsap.globalTimeline.paused()) {
                    gsap.globalTimeline.resume();
                }
                tl.play();
                if (window.__animeTimelines && window.__animeTimelines.length > 0) {
                    window.__animeTimelines.forEach(atl => {
                        try { atl.play(); } catch(e) {}
                    });
                }
                window.syncAudioTimeline(tl.time(), true);
            }
        };
    </script>
</body>
</html>`;

    fs.writeFileSync(finalFilePath, finalHtml, 'utf8');

    // Assemblage automatique de la bande-son master (_master_soundtrack.wav) pour render.cjs et le Studio
    if (hasVoice || hasMusic) {
        try {
            const masterSoundtrackDir = path.join(ROOT_DIR, '01_Assets', 'Audio_Mix');
            ensureDir(masterSoundtrackDir);
            const masterSoundtrackPath = path.join(masterSoundtrackDir, finalFileName.replace(/\.html$/i, '_master_soundtrack.wav'));

            const voiceFullPath = (hasVoice && generatedVoiceRelPath)
                ? path.join(ROOT_DIR, generatedVoiceRelPath.replace(/^\.\.\//, ''))
                : (payload.voiceover ? path.join(ROOT_DIR, '01_Assets', 'Voix_Off', payload.voiceover) : '');

            const musicFullPath = (hasMusic && musicRelPath)
                ? path.join(ROOT_DIR, musicRelPath.replace(/^\.\.\//, ''))
                : '';

            const buildSoundtrackScript = path.join(__dirname, 'build_soundtrack.cjs');
            if (fs.existsSync(buildSoundtrackScript) && (fs.existsSync(voiceFullPath) || fs.existsSync(musicFullPath))) {
                let cmd = `node "${buildSoundtrackScript}" --out "${masterSoundtrackPath}" --duration ${totalVideoDuration.toFixed(2)} --fade-out 2.2`;
                if (fs.existsSync(voiceFullPath)) cmd += ` --voice "${voiceFullPath}"`;
                if (fs.existsSync(musicFullPath)) cmd += ` --music "${musicFullPath}"`;
                execSync(cmd, { stdio: 'ignore' });
                console.log(`[AI Director] Bande-son master assemblée avec succès : ${path.basename(masterSoundtrackPath)}`);
            }
        } catch (audioMuxErr) {
            console.warn('[AI Director] Avertissement assemblage soundtrack master :', audioMuxErr.message);
        }
    }

    checkpoint.status = 'completed';
    checkpoint.progress = 100;
    saveCheckpoint(checkpointPath, checkpoint);

    logAndSaveStep('step_final', 'Composition 100% prête pour le Studio !', 100, `✓ Vidéo finalisée : ${relVideoPath}. Accès au Studio prêt.`, 'success');

    return {
        success: true,
        fileName: finalFileName,
        filePath: finalFilePath,
        videoUrl: relVideoPath,
        duration: totalVideoDuration,
        title: plan.title
    };
}

module.exports = {
    runAiVideoPipeline,
    parseTimestampedScript,
    getCheckpointPath,
    loadCheckpoint
};
