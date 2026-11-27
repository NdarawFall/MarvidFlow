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
const SFX_PY = path.resolve(__dirname, 'sfx.py');

// Création du dossier SFX s'il n'existe pas
if (!fs.existsSync(SFX_DIR)) {
    fs.mkdirSync(SFX_DIR, { recursive: true });
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
async function getOrFetchSfx(query, customOutPath = null) {
    const slug = slugify(query);
    const defaultMp3 = path.resolve(SFX_DIR, `${slug}.mp3`);
    const defaultWav = path.resolve(SFX_DIR, `${slug}.wav`);
    const targetPath = customOutPath || defaultMp3;

    // 1. Vérification du cache local
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 500) {
        return { path: targetPath, source: 'cache', title: slug };
    }
    if (!customOutPath) {
        if (fs.existsSync(defaultWav) && fs.statSync(defaultWav).size > 500) {
            return { path: defaultWav, source: 'cache', title: slug };
        }
        if (fs.existsSync(defaultMp3) && fs.statSync(defaultMp3).size > 500) {
            return { path: defaultMp3, source: 'cache', title: slug };
        }
    }

    // 2. Recherche Openverse (Real SFX)
    console.log(`🔍 [SFX] Recherche d'un son réel sur Openverse pour : "${query}"...`);
    const openverseMatch = await searchOpenverse(query);
    if (openverseMatch && openverseMatch.url) {
        try {
            console.log(`⬇️ [SFX Openverse] Téléchargement : "${openverseMatch.title}" (${openverseMatch.source})...`);
            await downloadFile(openverseMatch.url, targetPath);
            if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 500) {
                console.log(`✅ [SFX Openverse] Enregistré avec succès dans : ${path.basename(targetPath)}`);
                return { path: targetPath, source: 'openverse', title: openverseMatch.title };
            }
        } catch (downloadErr) {
            console.warn(`⚠️ [SFX Openverse] Échec du téléchargement (${downloadErr.message}). Bascule vers Earshot...`);
        }
    } else {
        console.log(`ℹ️ [SFX] Aucun résultat direct Openverse. Bascule vers la synthèse procédurale Earshot...`);
    }

    // 3. Fallback Earshot (Synthèse procédurale par code DSP)
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

    const batchArg = getArg('--batch');
    if (batchArg) {
        const items = batchArg.split(',').map(s => s.trim()).filter(Boolean);
        console.log(`🚀 [SFX] Téléchargement du lot :`, items);
        ensureSfxCollection(items).then(map => {
            console.log('✅ Lot de bruitages prêt :', map);
        }).catch(err => console.error(err));
    } else {
        const query = getArg('--query') || 'whoosh';
        const out = getArg('--out');
        getOrFetchSfx(query, out).then(info => {
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
