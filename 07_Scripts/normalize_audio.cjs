/**
 * 07_Scripts/normalize_audio.cjs
 * Normalisation sonore professionnelle EBU R128 (Standard YouTube, TikTok, Podcasts, Broadcast)
 * 100% LOCAL, SANS AUCUNE DÉPENDANCE EXTERNE (FFmpeg natif)
 * 
 * Avantages :
 * - Calibrage sonore parfait en 2 passes (zéro distorsion, zéro pompage dynamique)
 * - Supporte les fichiers AUDIO (.mp3, .wav, .m4a, .aac, .ogg) et VIDÉO (.mp4, .mov, .mkv)
 * - Pour les fichiers vidéo, la piste vidéo est copiée sans réencodage (-c:v copy, traitement en 1-2 sec)
 * 
 * Presets disponibles :
 * - youtube   : -14.0 LUFS, True Peak -1.0 dB, LRA 9.0 (Standard YouTube 2026)
 * - tiktok    : -16.0 LUFS, True Peak -1.0 dB, LRA 7.0 (Optimisé Shorts, Reels, TikTok)
 * - podcast   : -16.0 LUFS, True Peak -1.5 dB, LRA 11.0 (Voix claire et aérée)
 * - broadcast : -23.0 LUFS, True Peak -1.0 dB, LRA 7.0 (Standard Télévision EBU R128)
 * 
 * Exemples d'utilisation :
 *   1. Normaliser une voix off pour YouTube :
 *      node 07_Scripts/normalize_audio.cjs --input "01_Assets/Voix_Off/voix.mp3" --preset youtube
 * 
 *   2. Normaliser directement le son d'une vidéo MP4 sans toucher à l'image :
 *      node 07_Scripts/normalize_audio.cjs --input "08_Rendus/video.mp4" --preset tiktok --out "08_Rendus/video_mastered.mp4"
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

// Détection de FFmpeg
function getFfmpegPath() {
    try {
        const installer = require('@ffmpeg-installer/ffmpeg');
        if (installer && installer.path && fs.existsSync(installer.path)) {
            return installer.path;
        }
    } catch (e) {}

    try {
        execSync('ffmpeg -version', { stdio: 'ignore' });
        return 'ffmpeg';
    } catch (e) {}

    const candidates = [
        path.join(__dirname, '..', 'node_modules', '@ffmpeg-installer', 'win32-x64', 'ffmpeg.exe'),
        'C:\\ffmpeg\\bin\\ffmpeg.exe',
        'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe')
    ];
    for (const p of candidates) {
        if (p && fs.existsSync(p)) return p;
    }
    return null;
}

// Configuration des presets
const PRESETS = {
    youtube:   { lufs: -14.0, tp: -1.0, lra: 9.0, desc: 'YouTube Standard (-14 LUFS, TP -1.0dB)' },
    tiktok:    { lufs: -16.0, tp: -1.0, lra: 7.0, desc: 'TikTok / Shorts / Reels (-16 LUFS, TP -1.0dB)' },
    shorts:    { lufs: -16.0, tp: -1.0, lra: 7.0, desc: 'TikTok / Shorts / Reels (-16 LUFS, TP -1.0dB)' },
    reels:     { lufs: -16.0, tp: -1.0, lra: 7.0, desc: 'TikTok / Shorts / Reels (-16 LUFS, TP -1.0dB)' },
    podcast:   { lufs: -16.0, tp: -1.5, lra: 11.0, desc: 'Podcast / Voix Documentaire (-16 LUFS, TP -1.5dB)' },
    broadcast: { lufs: -23.0, tp: -1.0, lra: 7.0, desc: 'Télévision EBU R128 (-23 LUFS, TP -1.0dB)' }
};

function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        input: '',
        out: '',
        preset: 'youtube',
        lufs: null,
        tp: null,
        lra: null,
        ar: 48000,
        singlePass: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const next = args[i + 1];

        if ((arg === '--input' || arg === '-i') && next) { config.input = next; i++; }
        else if ((arg === '--out' || arg === '-o') && next) { config.out = next; i++; }
        else if ((arg === '--preset' || arg === '-p') && next) { config.preset = next.toLowerCase(); i++; }
        else if (arg === '--lufs' && next) { config.lufs = parseFloat(next); i++; }
        else if (arg === '--tp' && next) { config.tp = parseFloat(next); i++; }
        else if (arg === '--lra' && next) { config.lra = parseFloat(next); i++; }
        else if (arg === '--ar' && next) { config.ar = parseInt(next, 10) || 48000; i++; }
        else if (arg === '--single-pass') { config.singlePass = true; }
        else if (!config.input && !arg.startsWith('-')) { config.input = arg; }
    }

    const targetPreset = PRESETS[config.preset] || PRESETS.youtube;
    if (config.lufs === null) config.lufs = targetPreset.lufs;
    if (config.tp === null) config.tp = targetPreset.tp;
    if (config.lra === null) config.lra = targetPreset.lra;

    return config;
}

function isVideoFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.mp4', '.mov', '.mkv', '.webm', '.avi'].includes(ext);
}

async function runPass1(ffmpegPath, inputPath, targetLufs, targetTp, targetLra) {
    return new Promise((resolve, reject) => {
        const args = [
            '-hide_banner',
            '-i', inputPath,
            '-af', `loudnorm=I=${targetLufs}:TP=${targetTp}:LRA=${targetLra}:print_format=json`,
            '-vn',
            '-sn',
            '-f', 'null',
            '-'
        ];

        const proc = spawn(ffmpegPath, args);
        let stderrData = '';

        proc.stderr.on('data', chunk => { stderrData += chunk.toString(); });
        proc.on('close', code => {
            if (code !== 0 && !stderrData.includes('{')) {
                return reject(new Error(`Analyse Passe 1 échouée (code ${code}) : ${stderrData}`));
            }

            try {
                const jsonMatch = stderrData.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/);
                if (!jsonMatch) {
                    return reject(new Error("Impossible d'extraire les mesures audio de l'analyse loudnorm."));
                }
                const parsed = JSON.parse(jsonMatch[0]);
                resolve(parsed);
            } catch (err) {
                reject(new Error(`Erreur lors du décodage JSON de Passe 1 : ${err.message}`));
            }
        });
        proc.on('error', reject);
    });
}

async function runPass2(ffmpegPath, inputPath, outputPath, targetLufs, targetTp, targetLra, pass1Data, isVideo, sampleRate = 48000) {
    return new Promise((resolve, reject) => {
        const useLinear = pass1Data && !Number.isNaN(parseFloat(pass1Data.input_i)) && Number.isFinite(parseFloat(pass1Data.target_offset));
        const filterStr = useLinear
            ? `loudnorm=I=${targetLufs}:TP=${targetTp}:LRA=${targetLra}:measured_I=${pass1Data.input_i}:measured_TP=${pass1Data.input_tp}:measured_LRA=${pass1Data.input_lra}:measured_thresh=${pass1Data.input_thresh}:offset=${pass1Data.target_offset}:linear=true`
            : `loudnorm=I=${targetLufs}:TP=${targetTp}:LRA=${targetLra}`;

        const args = [
            '-y',
            '-hide_banner',
            '-i', inputPath,
            '-af', filterStr,
            '-ar', String(sampleRate)
        ];

        if (isVideo) {
            args.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k');
        } else {
            const ext = path.extname(outputPath).toLowerCase();
            if (ext === '.wav') {
                args.push('-c:a', 'pcm_s16le');
            } else {
                args.push('-c:a', 'libmp3lame', '-b:a', '192k');
            }
        }

        args.push(outputPath);

        const proc = spawn(ffmpegPath, args);
        let stderrData = '';
        proc.stderr.on('data', chunk => { stderrData += chunk.toString(); });

        proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`Erreur lors de la Passe 2 d'encodage (code ${code}) : ${stderrData}`));
        });
        proc.on('error', reject);
    });
}

async function main() {
    const config = parseArgs();

    if (!config.input) {
        console.error("❌ Erreur : Fichier d'entrée manquant.");
        console.log("Usage : node 07_Scripts/normalize_audio.cjs --input <audio_ou_video> [--preset youtube|tiktok|podcast] [--out destination]");
        process.exit(1);
    }

    const inputResolved = path.resolve(process.cwd(), config.input);
    if (!fs.existsSync(inputResolved)) {
        console.error(`❌ Fichier introuvable : ${inputResolved}`);
        process.exit(1);
    }

    const ffmpegPath = getFfmpegPath();
    if (!ffmpegPath) {
        console.error("❌ FFmpeg est introuvable. Veuillez l'installer ou vérifier node_modules/@ffmpeg-installer.");
        process.exit(1);
    }

    const isVideo = isVideoFile(inputResolved);
    const ext = path.extname(inputResolved);
    const baseName = path.basename(inputResolved, ext);
    const dir = path.dirname(inputResolved);

    if (!config.out) {
        config.out = path.join(dir, `${baseName}_normalized${ext}`);
    } else {
        config.out = path.resolve(process.cwd(), config.out);
        const parentDir = path.dirname(config.out);
        if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
    }

    console.log(`\n======================================================`);
    console.log(`🔊 NORMALISATION SONORE EBU R128 (Mastering Automatique)`);
    console.log(`📁 Fichier source : ${inputResolved}`);
    console.log(`🎯 Cible Preset   : ${config.preset.toUpperCase()} (${config.lufs} LUFS, True Peak ${config.tp} dB, LRA ${config.lra})`);
    console.log(`🎬 Type de flux   : ${isVideo ? 'VIDÉO (Piste vidéo copiée sans perte)' : 'AUDIO'}`);
    console.log(`💾 Fichier final  : ${config.out}`);
    console.log(`======================================================\n`);

    let pass1Data = null;
    if (!config.singlePass) {
        console.log(`📊 Étape 1/2 : Analyse audio acoustique en cours...`);
        pass1Data = await runPass1(ffmpegPath, inputResolved, config.lufs, config.tp, config.lra);
        console.log(`   - Volume mesuré d'origine : ${pass1Data.input_i} LUFS`);
        console.log(`   - True Peak mesuré        : ${pass1Data.input_tp} dB`);
        console.log(`   - Plage dynamique (LRA)   : ${pass1Data.input_lra} LU`);
        console.log(`   - Décalage de gain calculé: ${pass1Data.target_offset} dB`);
    } else {
        console.log(`⚡ Mode passe unique activé.`);
    }

    console.log(`\n🎛️ Étape 2/2 : Application du mastering EBU R128 linéaire (${config.ar} Hz)...`);
    await runPass2(ffmpegPath, inputResolved, config.out, config.lufs, config.tp, config.lra, pass1Data, isVideo, config.ar);

    console.log(`\n✅ Normalisation terminée avec succès !`);
    console.log(`✨ Le volume est maintenant parfaitement calibré à ${config.lufs} LUFS sans saturation.`);
    console.log(`📁 Fichier créé : ${config.out}\n`);
}

main().catch(err => {
    console.error(`\n❌ Erreur fatale : ${err.message}`);
    process.exit(1);
});
