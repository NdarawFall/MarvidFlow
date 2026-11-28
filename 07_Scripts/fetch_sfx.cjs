/**
 * FETCH_SFX.CJS — Moteur Audio Hybride de Bruitages (SFX) pour MarvidFlow
 * 
 * 1. Recherche et téléchargement de vrais bruitages libres de droits (CC0 / Freesound) via l'API Openverse
 * 2. Fallback automatique "Earshot" : synthèse procédurale par code DSP (07_Scripts/sfx.py) en cas de panne réseau ou son introuvable.
 * 
 * Usage CLI :
 *   node 07_Scripts/fetch_sfx.cjs --query "keyboard"
 *   node 07_Scripts/fetch_sfx.cjs --query "whoosh" --out 01_Assets/SFX/whoosh.mp3
 *   node 07_Scripts/fetch_sfx.cjs --batch "whoosh,pop,click,ding,keyboard"
 *   node 07_Scripts/fetch_sfx.cjs --list
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const SFX_DIR = path.resolve(ROOT_DIR, '01_Assets', 'SFX');
const BUNDLED_SFX_DIR = path.resolve(ROOT_DIR, '.agents', 'skills', 'media-use', 'audio', 'assets', 'sfx');
const SFX_PY = path.resolve(__dirname, 'sfx.py');

function getFfmpegPath() {
    try {
        const installer = require('@ffmpeg-installer/ffmpeg');
        if (installer && installer.path && fs.existsSync(installer.path)) return installer.path;
    } catch (e) {}
    return 'ffmpeg';
}

function isValidAudioFile(filePath) {
    try {
        if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 800) return false;
        const ff = getFfmpegPath();
        const res = spawnSync(ff, ['-v', 'error', '-i', filePath, '-f', 'null', '-'], { encoding: 'utf8', timeout: 5000 });
        if (res.error) return fs.statSync(filePath).size > 2000;
        return res.status === 0;
    } catch (e) {
        return false;
    }
}

// Création du dossier SFX s'il n'existe pas
if (!fs.existsSync(SFX_DIR)) {
    fs.mkdirSync(SFX_DIR, { recursive: true });
}

// Catalogue local CC0/CC-BY déjà inclus dans .agents/skills/media-use/audio/assets/sfx/
const BUNDLED_RECIPES = [
    ['whoosh-cinematic', 'whoosh-cinematic.mp3'],
    ['cinematic whoosh', 'whoosh-cinematic.mp3'],
    ['whoosh-short', 'whoosh-short.mp3'],
    ['whoosh', 'whoosh-short.mp3'],
    ['swoosh', 'whoosh-short.mp3'],
    ['swipe', 'whoosh-short.mp3'],
    ['transition', 'whoosh-short.mp3'],
    ['impact-bass-2', 'impact-bass-2.mp3'],
    ['impact-bass-1', 'impact-bass-1.mp3'],
    ['impact', 'impact-bass-1.mp3'],
    ['thump', 'impact-bass-1.mp3'],
    ['hit', 'impact-bass-1.mp3'],
    ['bass', 'impact-bass-2.mp3'],
    ['boom', 'impact-bass-2.mp3'],
    ['riser', 'riser.mp3'],
    ['swell', 'riser.mp3'],
    ['click-soft', 'click-soft.mp3'],
    ['tick', 'click-soft.mp3'],
    ['clock', 'click-soft.mp3'],
    ['gear', 'click-soft.mp3'],
    ['click', 'click.mp3'],
    ['tap', 'click-soft.mp3'],
    ['button', 'click.mp3'],
    ['key-press', 'key-press.mp3'],
    ['typing', 'typing.mp3'],
    ['keyboard', 'typing.mp3'],
    ['clack', 'click-soft.mp3'],
    ['pop', 'pop.mp3'],
    ['bubble', 'pop.mp3'],
    ['badge', 'pop.mp3'],
    ['chime', 'chime.mp3'],
    ['ding', 'chime.mp3'],
    ['bell', 'chime.mp3'],
    ['notification', 'notification.mp3'],
    ['ping', 'ping.mp3'],
    ['radar', 'ping.mp3'],
    ['sonar', 'ping.mp3'],
    ['glitch-2', 'glitch-2.mp3'],
    ['glitch-3', 'glitch-3.mp3'],
    ['glitch', 'glitch-1.mp3'],
    ['sparkle', 'sparkle.mp3'],
    ['error', 'error.mp3']
];

function matchBundledSfx(query) {
    if (!fs.existsSync(BUNDLED_SFX_DIR)) return null;
    const q = String(query || '').toLowerCase().trim();
    for (const [key, filename] of BUNDLED_RECIPES) {
        if (q === key || q.includes(key)) {
            const candidate = path.join(BUNDLED_SFX_DIR, filename);
            if (fs.existsSync(candidate)) {
                return { filename, fullPath: candidate, title: `${key} (Bundled CC0/CC-BY)` };
            }
        }
    }
    return null;
}

// Dictionnaire de mapping vers les recettes de synthèse procédurale Earshot (sfx.py)
const EARSHOT_RECIPES = {
    'whoosh': 'whoosh',
    'swoosh': 'whoosh',
    'swipe': 'whoosh',
    'transition': 'whoosh',
    'fly': 'whoosh',
    'pop': 'pop',
    'bubble': 'pop',
    'appear': 'pop',
    'badge': 'pop',
    'click': 'click',
    'tap': 'click',
    'button': 'click',
    'cursor': 'click',
    'mouse': 'click',
    'select': 'click',
    'clack': 'clack',
    'keyboard': 'clack',
    'type': 'clack',
    'key': 'clack',
    'ding': 'ding',
    'bell': 'ding',
    'chime': 'ding',
    'notification': 'ding',
    'success': 'ding',
    'validate': 'ding',
    'thump': 'thump',
    'impact': 'thump',
    'bass': 'thump',
    'drop': 'thump',
    'hit': 'thump',
    'crash': 'crash',
    'break': 'crash',
    'shatter': 'crash',
    'explosion': 'crash',
    'rumble': 'rumble',
    'earthquake': 'rumble',
    'vibration': 'rumble',
    'creak': 'creak',
    'door': 'creak',
    'step': 'step',
    'footstep': 'step',
    'walk': 'step',
    'quindar': 'quindar',
    'beep': 'quindar',
    'telemetry': 'quindar',
    'radar': 'quindar',
    'ignite': 'ignite',
    'fire': 'ignite',
    'heartbeat': 'heartbeat',
    'pulse': 'heartbeat'
};

/**
 * Nettoie une chaîne pour en faire un nom de fichier propre
 */
function slugify(text) {
    return String(text || '')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '_')
        .replace(/^-+|-+$/g, '') || 'sfx';
}

/**
 * Télécharge un fichier depuis une URL vers une destination locale
 */
function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, { headers: { 'User-Agent': 'MarvidFlow/1.0 (Openverse SFX Client)' }, timeout: 10000 }, (res) => {
            // Suivi des redirections éventuelles (301, 302)
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} lors du téléchargement de ${url}`));
            }
            const fileStream = fs.createWriteStream(destPath);
            res.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                resolve(destPath);
            });
            fileStream.on('error', (err) => {
                fs.unlink(destPath, () => {});
                reject(err);
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Délai d\'attente dépassé (timeout 10s)'));
        });
    });
}

/**
 * Recherche un son réel sur l'API Openverse (Freesound / Wikimedia / Creative Commons)
 */
async function searchOpenverse(query) {
    try {
        const endpoint = `https://api.openverse.org/v1/audio/?q=${encodeURIComponent(query)}&page_size=8`;
        const res = await fetch(endpoint, {
            headers: { 'User-Agent': 'MarvidFlow/1.0 (Creative Commons Audio Search)' },
            signal: AbortSignal.timeout(5000)
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data || !Array.isArray(data.results) || data.results.length === 0) return null;

        // On filtre de préférence les sons courts (< 7 secondes) pour avoir de vrais SFX percutants
        const candidates = data.results.filter(item => {
            if (!item.url) return false;
            if (item.duration && item.duration > 8000) return false; // Ignorer les pistes de plus de 8s
            return true;
        });

        const selected = candidates.length > 0 ? candidates[0] : data.results[0];
        if (!selected || !selected.url) return null;

        return {
            title: selected.title || query,
            url: selected.url,
            duration: selected.duration ? selected.duration / 1000 : null,
            license: selected.license,
            source: selected.source || 'Openverse'
        };
    } catch (e) {
        return null;
    }
}

/**
 * Synthétise un son par code pur (DSP Earshot / Python sfx.py)
 */
function generateEarshotSfx(recipeType, destPath) {
    try {
        if (!fs.existsSync(SFX_PY)) return false;
        const { execFileSync } = require('child_process');
        execFileSync('python', [SFX_PY, '--type', recipeType, '--out', destPath], {
            encoding: 'utf-8',
            timeout: 8000
        });
        return fs.existsSync(destPath) && fs.statSync(destPath).size > 100;
    } catch (e) {
        console.warn(`[Earshot] Erreur génération: ${e.message}`);
        return false;
    }
}

/**
 * Trouve le mot-clé Earshot correspondant à une requête
 */
function matchEarshotRecipe(query) {
    const q = query.toLowerCase();
    for (const [key, recipe] of Object.entries(EARSHOT_RECIPES)) {
        if (q.includes(key)) return recipe;
    }
    return 'whoosh'; // Fallback par défaut
}

/**
 * Fonction maîtresse : Récupère ou génère un effet sonore
 * @param {string} query - Nom ou mot-clé (ex: "keyboard", "whoosh", "camera_click")
 * @param {string} [customOutPath] - Chemin optionnel de destination
 * @returns {Promise<{path: string, source: 'cache'|'openverse'|'earshot', title: string}>}
 */
async function getOrFetchSfx(query, customOutPath = null, options = {}) {
    const { force = false, preferOpenverse = false } = options || {};
    const slug = slugify(query);
    const defaultMp3 = path.resolve(SFX_DIR, `${slug}.mp3`);
    const defaultWav = path.resolve(SFX_DIR, `${slug}.wav`);
    const targetPath = customOutPath || defaultMp3;

    // 1. Vérification du cache local valide (unless --force)
    if (!force) {
        if (isValidAudioFile(targetPath)) {
            return { path: targetPath, source: 'cache', title: slug };
        }
        if (!customOutPath) {
            if (isValidAudioFile(defaultMp3)) {
                return { path: defaultMp3, source: 'cache', title: slug };
            }
            if (isValidAudioFile(defaultWav)) {
                return { path: defaultWav, source: 'cache', title: slug };
            }
        }
    }

    // 2. Catalogue local curé haute propreté (sauf si preferOpenverse explicite)
    if (!preferOpenverse) {
        const bundled = matchBundledSfx(query);
        if (bundled) {
            const bundledOut = customOutPath || defaultMp3;
            fs.copyFileSync(bundled.fullPath, bundledOut);
            if (isValidAudioFile(bundledOut)) {
                console.log(`✅ [SFX Bundled CC0/CC-BY] "${query}" -> ${path.basename(bundledOut)} (depuis ${bundled.filename})`);
                return { path: bundledOut, source: 'bundled', title: bundled.title };
            }
        }
    }

    // 3. Recherche Openverse (Real SFX)
    console.log(`🔍 [SFX] Recherche d'un son réel sur Openverse pour : "${query}"...`);
    const openverseMatch = await searchOpenverse(query);
    if (openverseMatch && openverseMatch.url) {
        try {
            console.log(`⬇️ [SFX Openverse] Téléchargement : "${openverseMatch.title}" (${openverseMatch.source})...`);
            await downloadFile(openverseMatch.url, targetPath);
            if (isValidAudioFile(targetPath)) {
                console.log(`✅ [SFX Openverse] Enregistré avec succès dans : ${path.basename(targetPath)}`);
                return { path: targetPath, source: 'openverse', title: openverseMatch.title };
            }
            try { fs.unlinkSync(targetPath); } catch (e) {}
            console.warn(`⚠️ [SFX Openverse] Fichier audio invalide ou vide. Bascule vers fallback...`);
        } catch (downloadErr) {
            console.warn(`⚠️ [SFX Openverse] Échec du téléchargement (${downloadErr.message}). Bascule vers fallback...`);
        }
    } else {
        console.log(`ℹ️ [SFX] Aucun résultat direct Openverse. Bascule vers fallback...`);
    }

    // Fallback catalogue curé si preferOpenverse avait échoué
    if (preferOpenverse) {
        const bundled = matchBundledSfx(query);
        if (bundled) {
            const bundledOut = customOutPath || defaultMp3;
            fs.copyFileSync(bundled.fullPath, bundledOut);
            if (isValidAudioFile(bundledOut)) {
                console.log(`✅ [SFX Bundled CC0/CC-BY] Fallback propre : ${path.basename(bundledOut)}`);
                return { path: bundledOut, source: 'bundled', title: bundled.title };
            }
        }
    }

    // 4. Fallback Earshot (Synthèse procédurale adoucie par code DSP)
    const recipe = matchEarshotRecipe(query);
    const earshotTarget = targetPath.endsWith('.mp3') ? targetPath.replace(/\.mp3$/, '.wav') : targetPath;
    console.log(`⚡ [SFX Earshot] Synthèse procédurale DSP (recette: "${recipe}")...`);
    const generated = generateEarshotSfx(recipe, earshotTarget);
    if (generated) {
        console.log(`✅ [SFX Earshot] Effet synthétisé avec succès par code : ${path.basename(earshotTarget)}`);
        return { path: earshotTarget, source: 'earshot', title: `${recipe} (Earshot DSP)` };
    }

    throw new Error(`Impossible d'obtenir le bruitage pour : "${query}"`);
}

/**
 * Assure la disponibilité d'une liste de bruitages pour un projet vidéo
 * @param {string[]} names - Liste de noms (ex: ['whoosh', 'pop', 'click', 'ding'])
 * @returns {Promise<Record<string, string>>} Dictionnaire clé -> chemin relatif utilisable en HTML
 */
async function ensureSfxCollection(names = ['whoosh', 'pop', 'click', 'ding']) {
    const result = {};
    for (const name of names) {
        try {
            const res = await getOrFetchSfx(name);
            const relPath = path.relative(path.resolve(ROOT_DIR, '04_Videos'), res.path).replace(/\\/g, '/');
            result[name] = relPath.startsWith('.') ? relPath : `../${relPath}`;
        } catch (e) {
            console.warn(`[SFX Collection] Avertissement pour ${name}:`, e.message);
        }
    }
    return result;
}

// Support CLI
if (require.main === module) {
    const args = process.argv.slice(2);
    const getArg = (flag) => {
        const idx = args.indexOf(flag);
        return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
    };

    if (args.includes('--list')) {
        console.log('\n📦 Recettes de synthèse procédurale Earshot intégrées :');
        console.log(Object.keys(EARSHOT_RECIPES).join(', '));
        process.exit(0);
    }

    const force = args.includes('--force') || args.includes('-f');
    const preferOpenverse = args.includes('--openverse');
    const batchArg = getArg('--batch');
    if (batchArg) {
        const items = batchArg.split(',').map(s => s.trim()).filter(Boolean);
        console.log(`🚀 [SFX] Récupération du lot :`, items);
        (async () => {
            const map = {};
            for (const name of items) {
                const res = await getOrFetchSfx(name, null, { force, preferOpenverse });
                const relPath = path.relative(path.resolve(ROOT_DIR, '04_Videos'), res.path).replace(/\\/g, '/');
                map[name] = relPath.startsWith('.') ? relPath : `../${relPath}`;
            }
            console.log('✅ Lot de bruitages prêt :', map);
        })().catch(err => { console.error(err); process.exit(1); });
    } else {
        const query = getArg('--query') || 'whoosh';
        const out = getArg('--out');
        getOrFetchSfx(query, out, { force, preferOpenverse }).then(info => {
            console.log(`\n🎉 Bruitage disponible :`, info);
        }).catch(err => {
            console.error('❌ Erreur:', err.message);
            process.exit(1);
        });
    }
}

module.exports = {
    getOrFetchSfx,
    ensureSfxCollection,
    matchEarshotRecipe,
    SFX_DIR
};
