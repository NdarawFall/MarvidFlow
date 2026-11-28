/**
 * GENERATE_VOICE.CJS — Générateur de Voix Off Ultra-Réalistes
 * Moteurs supportés :
 *  1. Edge TTS (Microsoft Neural TTS — 100% Gratuit, Illimité, Zéro clé API requise)
 *  2. ElevenLabs (Clé API requise)
 * 
 * Usage CLI :
 *   node 07_Scripts/generate_voice.cjs --text "Bienvenue" --engine edge --voice fr-FR-HenriNeural --out 01_Assets/Voix_Off/intro.mp3
 *   node 07_Scripts/generate_voice.cjs --text "Bienvenue" --engine elevenlabs --out 01_Assets/Voix_Off/intro.mp3
 *   node 07_Scripts/generate_voice.cjs --list-voices [--engine edge|elevenlabs]
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_PATH = process.env.VIBE_USER_DATA 
    ? path.join(process.env.VIBE_USER_DATA, 'api_config.json') 
    : path.join(__dirname, 'api_config.json');

// Lecture de la configuration sauvegardée
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        }
    } catch (e) {
        // silence
    }
    return {};
}

// Parse des arguments CLI simples (--key value)
function parseArgs() {
    const args = process.argv.slice(2);
    const params = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].substring(2);
            const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
            params[key] = val;
            if (val !== true) i++;
        }
    }
    return params;
}

function ensureDirExists(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * ==========================================
 * 1. EDGE TTS (MICROSOFT NEURAL VOICES - 100% GRATUIT)
 * ==========================================
 */

const CURATED_EDGE_FRENCH_VOICES = [
    { id: 'fr-FR-HenriNeural', name: 'Henri (Posé, Documentaire & Naturel)', language: 'French', gender: 'male', locale: 'fr-FR', isFeatured: true },
    { id: 'fr-FR-VivienneNeural', name: 'Vivienne (Claire, Chaleureuse & Expressive)', language: 'French', gender: 'female', locale: 'fr-FR', isFeatured: true },
    { id: 'fr-FR-RemyMultilingualNeural', name: 'Rémy (Multilingue & Dynamique)', language: 'French', gender: 'male', locale: 'fr-FR', isFeatured: true },
    { id: 'fr-FR-DeniseNeural', name: 'Denise (Posée & Professionnelle)', language: 'French', gender: 'female', locale: 'fr-FR', isFeatured: false },
    { id: 'fr-FR-EloiseNeural', name: 'Éloïse (Jeune & Pétillante)', language: 'French', gender: 'female', locale: 'fr-FR', isFeatured: false },
    { id: 'fr-CA-AntoineNeural', name: 'Antoine (Canadien / Québécois)', language: 'French (Canada)', gender: 'male', locale: 'fr-CA', isFeatured: false },
    { id: 'fr-CA-SylvieNeural', name: 'Sylvie (Canadienne / Québécoise)', language: 'French (Canada)', gender: 'female', locale: 'fr-CA', isFeatured: false },
    { id: 'fr-BE-CharlineNeural', name: 'Charline (Belge)', language: 'French (Belgium)', gender: 'female', locale: 'fr-BE', isFeatured: false },
    { id: 'fr-CH-ArianeNeural', name: 'Ariane (Suisse)', language: 'French (Switzerland)', gender: 'female', locale: 'fr-CH', isFeatured: false }
];

const CURATED_EDGE_ENGLISH_VOICES = [
    { id: 'en-US-ChristopherNeural', name: 'Christopher (Conversational & Engaging)', language: 'English', gender: 'male', locale: 'en-US', isFeatured: true },
    { id: 'en-US-JennyNeural', name: 'Jenny (Professional & Articulate)', language: 'English', gender: 'female', locale: 'en-US', isFeatured: true },
    { id: 'en-US-GuyNeural', name: 'Guy (Natural & Casual)', language: 'English', gender: 'male', locale: 'en-US', isFeatured: false },
    { id: 'en-US-AriaNeural', name: 'Aria (Dynamic & Expressive)', language: 'English', gender: 'female', locale: 'en-US', isFeatured: false },
    { id: 'en-GB-RyanNeural', name: 'Ryan (British Accent)', language: 'English (UK)', gender: 'male', locale: 'en-GB', isFeatured: false },
    { id: 'en-GB-SoniaNeural', name: 'Sonia (British Accent)', language: 'English (UK)', gender: 'female', locale: 'en-GB', isFeatured: false }
];

let _edgeVoicesCache = null;

async function fetchEdgeVoices() {
    if (_edgeVoicesCache) {
        return _edgeVoicesCache;
    }

    try {
        const pyScript = `import asyncio, edge_tts, json
try:
    v = asyncio.run(edge_tts.list_voices())
    print(json.dumps([{"id": x["ShortName"], "name": x["FriendlyName"], "gender": x["Gender"].lower(), "locale": x["Locale"], "language": x["LocaleName"]} for x in v]))
except Exception as e:
    print(json.dumps([]))`;

        const stdout = execFileSync('python', ['-c', pyScript], { encoding: 'utf8', timeout: 8000 });
        const allVoices = JSON.parse(stdout.trim() || '[]');

        if (allVoices.length > 0) {
            const french = allVoices.filter(v => (v.locale || '').toLowerCase().startsWith('fr'));
            const english = allVoices.filter(v => (v.locale || '').toLowerCase().startsWith('en'));
            const other = allVoices.filter(v => !v.locale.toLowerCase().startsWith('fr') && !v.locale.toLowerCase().startsWith('en'));

            _edgeVoicesCache = {
                success: true,
                voices: allVoices,
                frenchVoices: french.length > 0 ? french : CURATED_EDGE_FRENCH_VOICES,
                englishVoices: english.length > 0 ? english : CURATED_EDGE_ENGLISH_VOICES,
                otherVoices: other,
                total: allVoices.length,
                isFree: true
            };
            return _edgeVoicesCache;
        }
    } catch (e) {
        // En cas d'échec python, fallback immédiat sur la liste sélectionnée
    }

    _edgeVoicesCache = {
        success: true,
        voices: [...CURATED_EDGE_FRENCH_VOICES, ...CURATED_EDGE_ENGLISH_VOICES],
        frenchVoices: CURATED_EDGE_FRENCH_VOICES,
        englishVoices: CURATED_EDGE_ENGLISH_VOICES,
        otherVoices: [],
        total: CURATED_EDGE_FRENCH_VOICES.length + CURATED_EDGE_ENGLISH_VOICES.length,
        isFree: true
    };
    return _edgeVoicesCache;
}

async function generateEdgeTTS({ text, voiceId, outputPath, rate = '+0%', pitch = '+0Hz' }) {
    if (!text || !text.trim()) {
        throw new Error("Texte manquant pour la synthèse vocale Edge TTS");
    }

    const cfg = loadConfig();
    const voice = voiceId || cfg.edge_voice_id || 'fr-FR-HenriNeural';
    ensureDirExists(outputPath);

    // Exécution de edge-tts via Python
    const args = ['-m', 'edge_tts', '--voice', voice, '--text', text.trim(), '--write-media', outputPath];
    if (rate && rate !== '+0%') args.push('--rate', rate);
    if (pitch && pitch !== '+0Hz') args.push('--pitch', pitch);

    try {
        execFileSync('python', args, { encoding: 'utf8', timeout: 30000 });
        if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 100) {
            throw new Error("Le fichier audio Edge TTS n'a pas été créé ou est vide.");
        }
        return {
            success: true,
            engine: 'edge',
            voice,
            outputPath,
            sizeBytes: fs.statSync(outputPath).size
        };
    } catch (e) {
        throw new Error(`Erreur Edge TTS : ${e.message}`);
    }
}

/**
 * ==========================================
 * 2. ELEVENLABS API
 * ==========================================
 */

let _elevenVoicesCache = null;
let _elevenCacheKey = '';
let _elevenCacheTimestamp = 0;
const ELEVEN_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 heures de cache

const FALLBACK_ELEVEN_VOICES = [
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Calm & Natural)", category: "premade", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/21m00Tcm4TlvDq8ikWAM/df6788f9-5c96-470d-8312-aab3b3d8f50a.mp3", labels: { accent: "american", gender: "female" } },
    { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi (Confident)", category: "premade", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/AZnzlk1XvdvUeBnXmlld/506e7ce7-b08a-4370-9008-db230f822656.mp3", labels: { accent: "american", gender: "female" } },
    { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella (Soft & Gentle)", category: "premade", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/09d3b690-3b1a-45c1-8409-d5885c39a341.mp3", labels: { accent: "american", gender: "female" } },
    { id: "ErXwobaYiN019PkySvjV", name: "Antoni (Narrative & Warm)", category: "premade", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/ErXwobaYiN019PkySvjV/38d8f8f0-0417-48f4-b425-4c6e99e235e7.mp3", labels: { accent: "american", gender: "male" } },
    { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli (Emotional & Dynamic)", category: "premade", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/MF3mGyEYCl7XYWbV9V6O/d89be768-4504-4537-83eb-598d933e1467.mp3", labels: { accent: "american", gender: "female" } },
    { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh (Deep & Engaging)", category: "premade", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/TxGEqnHWrfWFTfGW9XjX/3a384317-10c0-4e45-a79a-471249e0e3fb.mp3", labels: { accent: "american", gender: "male" } },
    { id: "VR6AewLTigWG4nxSOuka", name: "Arnold (Crisp & Authoritative)", category: "premade", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/VR6AewLTigWG4nxSOuka/6429f55e-a0e2-4549-b54c-5353841a156e.mp3", labels: { accent: "american", gender: "male" } },
    { id: "pNInz6obpgDQGcFmaJgB", name: "Adam (Dominant & Pro)", category: "premade", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/pNInz6obpgDQGcFmaJgB/673417e2-4014-48e0-a937-29d3c52a0a54.mp3", labels: { accent: "american", gender: "male" } },
    { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam (Dynamic Storyteller)", category: "premade", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/yoZ06aMxZJJ28mfd3POQ/20e33425-f761-4fa1-840a-9d2979203ee3.mp3", labels: { accent: "american", gender: "male" } }
];

async function fetchElevenLabsVoices(apiKey, forceRefresh = false) {
    const key = apiKey || process.env.ELEVENLABS_API_KEY || loadConfig().elevenlabs_api_key;
    const now = Date.now();
    const cacheFile = path.join(__dirname, '.elevenlabs_voices_cache.json');

    // 1. Retour instantané depuis le cache (mémoire ou disque) si la clé n'a pas changé
    if (!forceRefresh && key) {
        if (_elevenVoicesCache && _elevenCacheKey === key && (now - _elevenCacheTimestamp < ELEVEN_CACHE_TTL)) {
            return _elevenVoicesCache;
        }
        if (fs.existsSync(cacheFile)) {
            try {
                const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
                if (cached.key === key && cached.data && (now - (cached.timestamp || 0) < ELEVEN_CACHE_TTL)) {
                    _elevenVoicesCache = cached.data;
                    _elevenCacheKey = key;
                    _elevenCacheTimestamp = cached.timestamp || now;
                    return _elevenVoicesCache;
                }
            } catch(e) {}
        }
    }

    if (!key) {
        return {
            success: true,
            customVoices: [],
            defaultVoices: FALLBACK_ELEVEN_VOICES,
            total: FALLBACK_ELEVEN_VOICES.length,
            isFallback: true,
            message: "Clé API ElevenLabs non renseignée dans Paramètres."
        };
    }

    try {
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
            headers: { 'xi-api-key': key },
            signal: AbortSignal.timeout(6000)
        });

        if (!response.ok) {
            throw new Error(`Erreur ElevenLabs [${response.status}]`);
        }

        const data = await response.json();
        const customVoices = (data.voices || []).filter(v => v.category === 'cloned' || v.category === 'generated');
        const defaultVoices = (data.voices || []).filter(v => v.category !== 'cloned' && v.category !== 'generated');

        const result = {
            success: true,
            customVoices,
            defaultVoices,
            total: (data.voices || []).length
        };

        _elevenVoicesCache = result;
        _elevenCacheKey = key;
        _elevenCacheTimestamp = now;
        try {
            fs.writeFileSync(cacheFile, JSON.stringify({ key, timestamp: now, data: result }), 'utf8');
        } catch(e) {}

        return result;
    } catch(err) {
        return {
            success: true,
            customVoices: [],
            defaultVoices: FALLBACK_ELEVEN_VOICES,
            total: FALLBACK_ELEVEN_VOICES.length,
            isFallback: true,
            error: err.message
        };
    }
}

async function fetchElevenLabsSubscription(apiKey) {
    const key = apiKey || process.env.ELEVENLABS_API_KEY || loadConfig().elevenlabs_api_key;
    if (!key) {
        throw new Error("Clé API ElevenLabs manquante.");
    }

    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: { 'xi-api-key': key }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ElevenLabs Subscription [${response.status}] : ${errorText}`);
    }

    const sub = await response.json();
    const characterCount = sub.character_count || 0;
    const characterLimit = sub.character_limit || 0;
    const remaining = Math.max(0, characterLimit - characterCount);
    const percentUsed = characterLimit > 0 ? Math.round((characterCount / characterLimit) * 100) : 0;

    return {
        success: true,
        tier: sub.tier || 'free',
        characterCount,
        characterLimit,
        remainingCharacters: remaining,
        percentRemaining: 100 - percentUsed,
        percentUsed,
        status: sub.status || 'active',
        nextResetUnix: sub.next_character_count_reset_unix || null
    };
}

async function generateElevenLabs({ text, apiKey, voiceId, modelId, outputPath, _retriedPremade = false }) {
    const key = apiKey || process.env.ELEVENLABS_API_KEY || loadConfig().elevenlabs_api_key;
    if (!key) {
        throw new Error("Clé API ElevenLabs manquante. Renseignez-la dans Paramètres.");
    }

    const voice = voiceId || loadConfig().elevenlabs_voice_id || 'JBFqnCBsd6RMkjVDRZzb';
    const model = modelId || loadConfig().elevenlabs_model_id || 'eleven_multilingual_v2';

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': key
        },
        body: JSON.stringify({
            text: text,
            model_id: model,
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        // Si la voix sélectionnée est une voix librairie payante (402), repli automatique sur voix premade George (multilingual_v2)
        if (response.status === 402 && !_retriedPremade && voice !== 'JBFqnCBsd6RMkjVDRZzb') {
            console.warn(`[ElevenLabs] Voix librairie (${voice}) non accessible en plan gratuit (402). Repli vers voix premade JBFqnCBsd6RMkjVDRZzb...`);
            return generateElevenLabs({ text, apiKey: key, voiceId: 'JBFqnCBsd6RMkjVDRZzb', modelId: model, outputPath, _retriedPremade: true });
        }
        throw new Error(`Erreur ElevenLabs [${response.status}] : ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    ensureDirExists(outputPath);
    fs.writeFileSync(outputPath, buffer);

    return {
        success: true,
        engine: 'elevenlabs',
        voice,
        model,
        outputPath,
        sizeBytes: buffer.length
    };
}

/**
 * ==========================================
 * 3. FONCTION PRINCIPALE UNIVERSELLE
 * ==========================================
 */
async function generateVoice(options) {
    const text = options.text;
    if (!text || !text.trim()) {
        throw new Error("Veuillez fournir un texte à lire via l'option --text");
    }

    const cfg = loadConfig();
    const requestedEngine = (options.engine || cfg.tts_engine || 'edge').toLowerCase();
    const engine = requestedEngine === 'heygen' ? 'edge' : requestedEngine;

    const defaultOut = path.join(ROOT_DIR, '01_Assets', 'Voix_Off', `voix_off_${Date.now()}.mp3`);
    const outputPath = options.out ? path.resolve(options.out) : defaultOut;

    if (engine === 'elevenlabs') {
        const apiKey = options.key || cfg.elevenlabs_api_key;
        if (!apiKey) {
            console.warn("[Voice] Clé ElevenLabs manquante. Bascule automatique sur Edge TTS (Gratuit)...");
            return await generateEdgeTTS({
                text,
                voiceId: options.voice || cfg.edge_voice_id || 'fr-FR-HenriNeural',
                outputPath
            });
        }
        return await generateElevenLabs({
            text,
            apiKey,
            voiceId: options.voice,
            modelId: options.model,
            outputPath
        });
    } else {
        return await generateEdgeTTS({
            text,
            voiceId: options.voice || cfg.edge_voice_id || 'fr-FR-HenriNeural',
            outputPath
        });
    }
}

// Mode CLI
if (require.main === module) {
    (async () => {
        try {
            const args = parseArgs();
            const requestedEngine = (args.engine || 'edge').toLowerCase();
            const engine = requestedEngine === 'heygen' ? 'edge' : requestedEngine;

            if (args['list-voices']) {
                if (engine === 'elevenlabs') {
                    console.log("🔍 Récupération des voix ElevenLabs...");
                    const { customVoices, defaultVoices } = await fetchElevenLabsVoices(args.key);
                    console.log(`\n✨ Mes Voix Créées (${customVoices.length}) :`);
                    customVoices.forEach(v => console.log(`  - [${v.id}] ${v.name} (${v.category})`));
                    console.log(`\n🎙️ Voix Par Défaut ElevenLabs (${defaultVoices.length}) :`);
                    defaultVoices.forEach(v => console.log(`  - [${v.id}] ${v.name}`));
                } else {
                    console.log("🔍 Récupération des voix Edge TTS (100% Gratuit)...");
                    const res = await fetchEdgeVoices();
                    console.log(`\n✨ Voix Françaises (${res.frenchVoices.length}) :`);
                    res.frenchVoices.forEach(v => console.log(`  - [${v.id}] ${v.name} (${v.gender})`));
                    console.log(`\n✨ Voix Anglaises (${res.englishVoices.length}) :`);
                    res.englishVoices.slice(0, 10).forEach(v => console.log(`  - [${v.id}] ${v.name} (${v.gender})`));
                    console.log(`\nTotal voix disponibles : ${res.total}`);
                }
                return;
            }

            if (!args.text) {
                console.log(`
Usage :
  node 07_Scripts/generate_voice.cjs --text "Texte à générer" [--engine edge|elevenlabs] [--out <fichier>] [--voice <id>]
  node 07_Scripts/generate_voice.cjs --list-voices [--engine edge|elevenlabs]
                `);
                return;
            }

            console.log(`🎙️ Génération de la voix off via ${engine.toUpperCase()}...`);
            const res = await generateVoice(args);
            console.log(`✅ Voix générée avec succès !`);
            console.log(`   Moteur  : ${res.engine}`);
            console.log(`   Voix    : ${res.voice}`);
            console.log(`   Fichier : ${res.outputPath}`);
            console.log(`   Taille  : ${Math.round(res.sizeBytes / 1024)} Ko`);
        } catch (err) {
            console.error(`❌ Erreur : ${err.message}`);
            process.exit(1);
        }
    })();
}

module.exports = {
    generateVoice,
    generateEdgeTTS,
    fetchEdgeVoices,
    generateElevenLabs,
    fetchElevenLabsVoices,
    fetchElevenLabsSubscription
};
