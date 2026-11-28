/**
 * 07_Scripts/fetch_music.cjs
 * Téléchargeur de musiques d'ambiance 100% libres de droit et gratuites (Incompetech / Kevin MacLeod / CC-BY)
 * Permet d'alimenter automatiquement 01_Assets/Musiques/ selon l'émotion ou le genre de la vidéo !
 * 
 * Genres / Moods supportés :
 *   - 'tech' / 'saas'       : Pistes modernes, synthétiques, épurées pour produits & tutos
 *   - 'suspense' / 'tension': Documentaire, storytelling captivant, révélations
 *   - 'cinematic' / 'war' / 'documentary' / 'epic' : Orchestral dramatique, histoire, tension épique
 *   - 'dynamic' / 'sports'  : Énergie, percussions, tempo élevé pour shorts & top 10 foot
 *   - 'chill' / 'lofi'      : Ambiance détendue, fond sonore discret
 *   - 'funny' / 'meme'      : Vidéos courtes virales, humour, situations décalées
 * 
 * Usage CLI :
 *   node 07_Scripts/fetch_music.cjs --mood tech
 *   node 07_Scripts/fetch_music.cjs --mood sports
 *   node 07_Scripts/fetch_music.cjs "Sneaky Snitch"
 *   node 07_Scripts/fetch_music.cjs --list
 * 
 * Usage programmatique :
 *   const { fetchMusic, listCatalog } = require('./fetch_music.cjs');
 *   const track = await fetchMusic({ mood: 'tech' });
 *   console.log(track.localPath); // "01_Assets/Musiques/tech_ambiance.mp3"
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const MUSIC_DIR = path.join(ROOT_DIR, '01_Assets', 'Musiques');

if (!fs.existsSync(MUSIC_DIR)) {
    fs.mkdirSync(MUSIC_DIR, { recursive: true });
}

// Catalogue curaté de pistes cultes libres de droit Incompetech (Kevin MacLeod)
const CATALOG = [
    // --- TECH / SAAS / FUTURISTIC ---
    {
        id: 'tech_modern',
        title: 'Modern Jazz Samba',
        artist: 'Kevin MacLeod',
        genre: 'tech',
        mood: 'chill',
        bpm: 110,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Modern%20Jazz%20Samba.mp3'
    },
    {
        id: 'tech_wallpaper',
        title: 'Wallpaper',
        artist: 'Kevin MacLeod',
        genre: 'tech',
        mood: 'corporate',
        bpm: 120,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wallpaper.mp3'
    },
    {
        id: 'tech_take_a_chance',
        title: 'Take a Chance',
        artist: 'Kevin MacLeod',
        genre: 'tech',
        mood: 'dynamic',
        bpm: 125,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Take%20a%20Chance.mp3'
    },

    // --- SUSPENSE / TENSION / STORYTELLING ---
    {
        id: 'suspense_hitman',
        title: 'Hitman',
        artist: 'Kevin MacLeod',
        genre: 'suspense',
        mood: 'tension',
        bpm: 90,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hitman.mp3'
    },
    {
        id: 'suspense_scheming_weasel',
        title: 'Scheming Weasel',
        artist: 'Kevin MacLeod',
        genre: 'suspense',
        mood: 'curious',
        bpm: 115,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Scheming%20Weasel%20faster.mp3'
    },
    {
        id: 'suspense_sneaky_snitch',
        title: 'Sneaky Snitch',
        artist: 'Kevin MacLeod',
        genre: 'suspense',
        mood: 'mischief',
        bpm: 105,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Sneaky%20Snitch.mp3'
    },

    // --- DYNAMIC / SPORTS / ACTION (Top 10 Foot, Reels rythmés) ---
    {
        id: 'sports_volatile_reaction',
        title: 'Volatile Reaction',
        artist: 'Kevin MacLeod',
        genre: 'sports',
        mood: 'dynamic',
        bpm: 130,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Volatile%20Reaction.mp3'
    },
    {
        id: 'sports_the_builder',
        title: 'The Builder',
        artist: 'Kevin MacLeod',
        genre: 'sports',
        mood: 'upbeat',
        bpm: 120,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/The%20Builder.mp3'
    },

    // --- CHILL / EXPLAINER / LOFI ---
    {
        id: 'chill_carefree',
        title: 'Carefree',
        artist: 'Kevin MacLeod',
        genre: 'chill',
        mood: 'positive',
        bpm: 100,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3'
    },
    {
        id: 'chill_airport_lounge',
        title: 'Airport Lounge',
        artist: 'Kevin MacLeod',
        genre: 'chill',
        mood: 'relax',
        bpm: 95,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Airport%20Lounge.mp3'
    },
    {
        id: 'chill_local_forecast',
        title: 'Local Forecast',
        artist: 'Kevin MacLeod',
        genre: 'chill',
        mood: 'neutral',
        bpm: 105,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Local%20Forecast.mp3'
    },

    // --- CINEMATIC / DOCUMENTARY / WAR / EPIC ---
    {
        id: 'cinematic_the_escalation',
        title: 'The Escalation',
        artist: 'Kevin MacLeod',
        genre: 'cinematic',
        mood: 'war',
        tags: ['documentary', 'epic', 'dramatic', 'tension', 'historical', 'orchestral'],
        bpm: 100,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/The%20Escalation.mp3'
    },
    {
        id: 'cinematic_clash_defiant',
        title: 'Clash Defiant',
        artist: 'Kevin MacLeod',
        genre: 'cinematic',
        mood: 'epic',
        tags: ['war', 'action', 'battle', 'dramatic', 'orchestral'],
        bpm: 140,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Clash%20Defiant.mp3'
    },
    {
        id: 'cinematic_impact_lento',
        title: 'Impact Lento',
        artist: 'Kevin MacLeod',
        genre: 'documentary',
        mood: 'dramatic',
        tags: ['cinematic', 'war', 'tension', 'dark', 'orchestral'],
        bpm: 76,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Impact%20Lento.mp3'
    },
    {
        id: 'cinematic_impact_moderato',
        title: 'Impact Moderato',
        artist: 'Kevin MacLeod',
        genre: 'documentary',
        mood: 'urgent',
        tags: ['cinematic', 'tension', 'orchestral'],
        bpm: 112,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Impact%20Moderato.mp3'
    },
    {
        id: 'cinematic_hero_down',
        title: 'Hero Down',
        artist: 'Kevin MacLeod',
        genre: 'documentary',
        mood: 'somber',
        tags: ['war', 'emotional', 'memorial', 'cinematic', 'orchestral'],
        bpm: 72,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hero%20Down.mp3'
    },
    {
        id: 'cinematic_aftermath',
        title: 'Aftermath',
        artist: 'Kevin MacLeod',
        genre: 'documentary',
        mood: 'dark',
        tags: ['war', 'suspense', 'cinematic', 'bleak'],
        bpm: 80,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Aftermath.mp3'
    },

    // --- FUNNY / CARTOON / MEME ---
    {
        id: 'funny_monkeys_spinning',
        title: 'Monkeys Spinning Monkeys',
        artist: 'Kevin MacLeod',
        genre: 'funny',
        mood: 'playful',
        bpm: 110,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Monkeys%20Spinning%20Monkeys.mp3'
    },
    {
        id: 'funny_fluffing_duck',
        title: 'Fluffing a Duck',
        artist: 'Kevin MacLeod',
        genre: 'funny',
        mood: 'clumsy',
        bpm: 120,
        license: 'CC-BY 4.0 (Incompetech)',
        url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Fluffing%20a%20Duck.mp3'
    }
];

// Télécharge un fichier binaire avec gestion des redirections, vérification Content-Length et fallback curl
function downloadFile(url, destPath, redirects = 0) {
    if (redirects > 5) return Promise.reject(new Error(`Trop de redirections pour ${url}`));
    const tmpPath = `${destPath}.tmp.${Date.now()}`;
    return new Promise((resolve, reject) => {
        const fallbackCurl = (reasonErr) => {
            try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (e) {}
            const curlRes = spawnSync('curl.exe', ['-sSL', '--fail', '--retry', '2', '--max-time', '45', '-o', tmpPath, url], { encoding: 'utf8' });
            if (curlRes.status === 0 && fs.existsSync(tmpPath) && fs.statSync(tmpPath).size > 200000) {
                try {
                    if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
                    fs.renameSync(tmpPath, destPath);
                    return resolve(destPath);
                } catch (e) {
                    return reject(e);
                }
            }
            try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (e) {}
            return reject(reasonErr || new Error(`Échec téléchargement de ${url}`));
        };

        const req = https.get(url, {
            family: 4,
            timeout: 12000,
            headers: { 'User-Agent': 'MarvidFlow/1.0' }
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.resume();
                return downloadFile(res.headers.location, destPath, redirects + 1).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                res.resume();
                return fallbackCurl(new Error(`HTTP ${res.statusCode} lors du téléchargement de ${url}`));
            }
            const expectedBytes = parseInt(res.headers['content-length'] || '0', 10);
            let receivedBytes = 0;
            const fileStream = fs.createWriteStream(tmpPath);
            let done = false;
            const fail = (err) => {
                if (done) return;
                done = true;
                fileStream.close(() => fallbackCurl(err));
            };
            res.on('data', (chunk) => { receivedBytes += chunk.length; });
            res.setTimeout(18000, () => {
                res.destroy();
                fail(new Error(`Délai de flux dépassé pour ${url}`));
            });
            res.pipe(fileStream);
            fileStream.on('finish', () => {
                if (done) return;
                done = true;
                fileStream.close(() => {
                    if (expectedBytes > 0 && receivedBytes < expectedBytes * 0.98) {
                        return fallbackCurl(new Error(`Téléchargement incomplet (${receivedBytes}/${expectedBytes} octets)`));
                    }
                    try {
                        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
                        fs.renameSync(tmpPath, destPath);
                        resolve(destPath);
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            fileStream.on('error', fail);
            res.on('error', fail);
        });
        req.on('timeout', () => {
            req.destroy(new Error(`Timeout connexion HTTP pour ${url}`));
        });
        req.on('error', (err) => fallbackCurl(err));
    });
}

function isValidMp3(filePath) {
    try {
        if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 250000) return false;
        const fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(16);
        fs.readSync(fd, buf, 0, 16, 0);
        fs.closeSync(fd);
        const isId3 = buf.slice(0, 3).toString('ascii') === 'ID3';
        const isSync = buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0;
        if (!isId3 && !isSync) return false;
        const ff = require('@ffmpeg-installer/ffmpeg').path;
        const probe = spawnSync(ff, ['-v', 'error', '-i', filePath, '-t', '10', '-f', 'null', '-'], { encoding: 'utf8', timeout: 6000 });
        return probe.status === 0;
    } catch (e) {
        return false;
    }
}

// Recherche de vraies musiques CC0 / CC-BY sur Openverse (Jamendo / archives musicales libres)
function searchOpenverseMusic(query, { minDurationMs = 45000, exclude = [] } = {}) {
    return new Promise((resolve) => {
        if (!query || !String(query).trim()) return resolve([]);
        const cleanQ = encodeURIComponent(String(query).trim());
        const url = `https://api.openverse.org/v1/audio/?q=${cleanQ}&category=music&page_size=15`;
        const excl = new Set((exclude || []).map(x => path.basename(String(x || '')).toLowerCase()));
        const req = https.get(url, { timeout: 10000, headers: { 'User-Agent': 'MarvidFlow/1.0' } }, (res) => {
            if (res.statusCode !== 200) { res.resume(); return resolve([]); }
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => {
                try {
                    const data = JSON.parse(raw);
                    const results = (data.results || [])
                        .filter(r => r && r.url && (r.duration || 0) >= minDurationMs)
                        .filter(r => {
                            const safeFile = ((r.title || r.id || 'track').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) + '.mp3').toLowerCase();
                            return !excl.has(safeFile);
                        })
                        .map(r => ({
                            id: 'openverse_' + String(r.id || Date.now()).slice(0, 12),
                            title: (r.title || 'Openverse Track').slice(0, 60),
                            artist: r.creator || 'Openverse CC',
                            genre: 'openverse',
                            mood: String(query),
                            bpm: 100,
                            license: (r.license ? String(r.license).toUpperCase() : 'CC') + ' (Openverse)',
                            url: r.url,
                            durationSec: Math.round((r.duration || 0) / 1000)
                        }));
                    resolve(results);
                } catch (e) {
                    resolve([]);
                }
            });
        });
        req.on('timeout', () => { req.destroy(); resolve([]); });
        req.on('error', () => resolve([]));
    });
}

// Recherche et score une piste pertinente dans le catalogue sans boucler sur le même premier morceau
function findTrack(queryOrFilter, options = {}) {
    const exclude = new Set((options.exclude || []).map(x => path.basename(String(x || '')).toLowerCase()));
    const isExcluded = (t) => exclude.has((t.title.replace(/[^a-zA-Z0-9_-]/g, '_') + '.mp3').toLowerCase());
    const matchTags = (t, key) => Array.isArray(t.tags) && t.tags.some(tag => tag.toLowerCase() === key);

    const pool = CATALOG.filter(t => !isExcluded(t));
    const candidates = pool.length > 0 ? pool : CATALOG;

    if (typeof queryOrFilter === 'string') {
        const q = queryOrFilter.toLowerCase().trim();
        const tokens = q.split(/\s+/).filter(Boolean);
        let best = null;
        let bestScore = -1;
        for (const t of candidates) {
            let score = 0;
            if (t.id.toLowerCase() === q) score += 10;
            if (t.title.toLowerCase().includes(q)) score += 8;
            if (t.genre.toLowerCase() === q) score += 6;
            if (t.mood.toLowerCase() === q) score += 6;
            if (matchTags(t, q)) score += 5;
            for (const tok of tokens) {
                if (t.genre.toLowerCase().includes(tok)) score += 3;
                if (t.mood.toLowerCase().includes(tok)) score += 3;
                if (t.title.toLowerCase().includes(tok)) score += 2;
                if (Array.isArray(t.tags) && t.tags.some(tag => tag.toLowerCase().includes(tok))) score += 2;
            }
            if (score > bestScore) { bestScore = score; best = t; }
        }
        return bestScore > 0 ? best : null;
    }

    const { genre, mood, title } = queryOrFilter || {};
    if (title) {
        const q = title.toLowerCase();
        return candidates.find(t => t.title.toLowerCase().includes(q)) || null;
    }
    if (genre || mood) {
        const g = (genre || '').toLowerCase();
        const m = (mood || '').toLowerCase();
        const matches = candidates.filter(t =>
            (g && (t.genre === g || t.mood === g || matchTags(t, g))) ||
            (m && (t.mood === m || t.genre === m || matchTags(t, m)))
        );
        if (matches.length > 0) return matches[0];
    }
    return candidates[0];
}

// Télécharge la musique demandée (catalogue curaté ou recherche Openverse sur-mesure si requête thématique / exclusion)
async function fetchMusic(queryOrOptions = {}, options = {}) {
    let filter = queryOrOptions;
    let opts = options;

    if (typeof queryOrOptions === 'string') {
        filter = queryOrOptions;
    } else if (queryOrOptions && typeof queryOrOptions === 'object') {
        opts = { ...queryOrOptions, ...options };
    }

    const searchQuery = opts.query || (typeof filter === 'string' ? filter : (filter.mood || filter.genre || ''));
    let track = null;

    // Si une requête descriptive multi-mots ou --openverse est fournie, tenter Openverse en priorité pour un morceau unique adapté au sujet
    if (opts.openverse || (typeof searchQuery === 'string' && searchQuery.trim().split(/\s+/).length >= 2)) {
        const remoteTracks = await searchOpenverseMusic(searchQuery, { exclude: opts.exclude || [] });
        for (const rt of remoteTracks.slice(0, 4)) {
            const safeTitle = rt.title.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
            const fileName = `${safeTitle || rt.id}.mp3`;
            const destPath = path.join(MUSIC_DIR, fileName);
            const relPath = path.relative(ROOT_DIR, destPath).replace(/\\/g, '/');
            try {
                if (!(fs.existsSync(destPath) && isValidMp3(destPath) && !opts.force)) {
                    await downloadFile(rt.url, destPath);
                }
                if (isValidMp3(destPath)) {
                    const stat = fs.statSync(destPath);
                    return {
                        id: rt.id,
                        title: rt.title,
                        artist: rt.artist,
                        genre: rt.genre,
                        mood: rt.mood,
                        bpm: rt.bpm,
                        license: rt.license,
                        localPath: destPath,
                        relPath,
                        fromCache: false,
                        size: stat.size
                    };
                }
            } catch (e) {
                try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch (_) {}
            }
        }
    }

    track = findTrack(filter, { exclude: opts.exclude || [] });
    if (!track) {
        track = findTrack({ mood: opts.mood || 'documentary' }, { exclude: opts.exclude || [] }) || CATALOG[0];
    }

    const safeTitle = track.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeTitle}.mp3`;
    const destPath = path.join(MUSIC_DIR, fileName);
    const relPath = path.relative(ROOT_DIR, destPath).replace(/\\/g, '/');

    let fromCache = false;

    if (fs.existsSync(destPath) && !opts.force) {
        if (isValidMp3(destPath)) {
            fromCache = true;
        }
    }

    if (!fromCache) {
        await downloadFile(track.url, destPath);
        if (!isValidMp3(destPath)) {
            try { fs.unlinkSync(destPath); } catch (e) {}
            throw new Error(`Le fichier téléchargé pour "${track.title}" n'est pas un flux MP3 valide`);
        }
    }

    const stat = fs.statSync(destPath);

    return {
        id: track.id,
        title: track.title,
        artist: track.artist,
        genre: track.genre,
        mood: track.mood,
        bpm: track.bpm,
        license: track.license,
        localPath: destPath,
        relPath,
        fromCache,
        size: stat.size
    };
}

// Mode CLI
if (require.main === module) {
    const args = process.argv.slice(2);
    let mood = null;
    let genre = null;
    let list = false;
    let query = null;
    let force = false;
    let openverse = false;
    let exclude = [];

    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--mood' || a === '-m') {
            mood = args[++i];
        } else if (a === '--genre' || a === '-g') {
            genre = args[++i];
        } else if (a === '--query' || a === '-q') {
            query = args[++i];
        } else if (a === '--exclude' || a === '-x') {
            exclude = String(args[++i] || '').split(',').map(s => s.trim()).filter(Boolean);
        } else if (a === '--openverse') {
            openverse = true;
        } else if (a === '--list' || a === '-l') {
            list = true;
        } else if (a === '--force' || a === '-f') {
            force = true;
        } else if (!a.startsWith('-')) {
            query = a;
        }
    }

    if (list) {
        console.log(`\n🎵 CATALOGUE DE MUSIQUES LIBRES DE DROIT (INCOMPETECH / CC-BY) + RECHERCHE LIVE OPENVERSE :`);
        console.log(`==================================================================`);
        CATALOG.forEach((t, idx) => {
            console.log(`  ${idx + 1}. "${t.title}" — Genre: ${t.genre} | Mood: ${t.mood} | BPM: ${t.bpm}`);
        });
        console.log(`==================================================================\n`);
        process.exit(0);
    }

    (async () => {
        try {
            console.log(`\n==================================================`);
            console.log(`🎵 TÉLÉCHARGEMENT DE MUSIQUE LIBRE DE DROIT`);
            console.log(`==================================================`);

            const target = query || { mood: mood || genre || 'tech' };
            process.stdout.write(`⏳ Recherche et téléchargement d'une piste adaptée... `);

            const res = await fetchMusic(target, { force, openverse, exclude, query: query || undefined, mood: mood || undefined });
            console.log(`✅ [${res.fromCache ? 'CACHE' : 'TÉLÉCHARGÉ'}]`);
            console.log(`   🎼 Titre   : ${res.title} par ${res.artist}`);
            console.log(`   🏷️  Genre   : ${res.genre.toUpperCase()} | Ambiance: ${res.mood}`);
            console.log(`   📁 Fichier : ${res.relPath} (${Math.round(res.size / 1024)} Ko)`);
            console.log(`   ⚖️  Licence : ${res.license}`);
            console.log(`==================================================\n`);
        } catch (e) {
            console.error(`❌ Erreur:`, e.message);
            process.exit(1);
        }
    })();
}

module.exports = { fetchMusic, findTrack, searchOpenverseMusic, listCatalog: () => CATALOG, MUSIC_DIR };

