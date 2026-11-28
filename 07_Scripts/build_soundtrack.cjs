/**
 * 07_Scripts/build_soundtrack.cjs
 * Générateur et Mixeur Professionnel de Bande-Son Master pour VibeEditor & Render
 *
 * Fonctionnalités :
 * 1. Concaténation de segments voix avec silences parfaits (Concat Filter natif FFmpeg) :
 *    - PARADE ABSOLUE au bug FFmpeg `amix` divisor : zéro baisse de volume au début,
 *      le volume de la voix est 100% constant et stable dès la première seconde (-14 LUFS).
 * 2. Mixage de la musique d'ambiance (avec DUCKING sous voix, ou lit calibré LUFS en mode instrumental) :
 *    - Prise en charge de `--music-start <sec>` pour extraire le meilleur passage d'un vrai morceau.
 * 3. Mixage de bruitages SFX (`--sfx <json_or_file>`) calibrés par PEAK CIBLE (zéro explosion 0 dBFS) :
 *    - Chaque SFX est analysé (`volumedetect`) et calibré selon son `role` (`ui` | `whoosh` | `impact`)
 *      strictement par `max_volume` relatif au lit musical (jamais trompé par les traînes silencieuses).
 * 4. Fondu de sortie obligatoire (`afade=t=out`) + limitation douce + normalisation EBU R128 + MP3 192k / WAV 48kHz.
 *
 * Exemples d'utilisation :
 *   node 07_Scripts/build_soundtrack.cjs --voice v.mp3 --music m.mp3 --out mix.mp3 --duration 30
 *   node 07_Scripts/build_soundtrack.cjs --music m.mp3 --sfx cues.json --out mix.mp3 --duration 60 --also-wav
 */

const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');

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
        path.join(ROOT_DIR, 'node_modules', '@ffmpeg-installer', 'win32-x64', 'ffmpeg.exe'),
        'C:\\ffmpeg\\bin\\ffmpeg.exe',
        'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe'
    ];
    for (const p of candidates) {
        if (p && fs.existsSync(p)) return p;
    }
    return 'ffmpeg';
}

const ffmpeg = getFfmpegPath();

function probeAudio(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return { duration: 0, meanVolumeDb: -30, maxVolumeDb: -6 };
    try {
        const res = spawnSync(ffmpeg, ['-hide_banner', '-i', filePath, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
        const err = res.stderr || '';
        const dm = err.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
        const duration = dm ? parseFloat(dm[1]) * 3600 + parseFloat(dm[2]) * 60 + parseFloat(dm[3]) : 0;
        const meanM = err.match(/mean_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/);
        const maxM = err.match(/max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/);
        return {
            duration,
            meanVolumeDb: meanM ? parseFloat(meanM[1]) : -24.0,
            maxVolumeDb: maxM ? parseFloat(maxM[1]) : -1.0
        };
    } catch (e) {
        return { duration: 0, meanVolumeDb: -30, maxVolumeDb: -6 };
    }
}

function getAudioDuration(filePath) {
    return probeAudio(filePath).duration;
}

function parseJsonArg(raw) {
    if (!raw) return null;
    try {
        if (fs.existsSync(raw)) {
            return JSON.parse(fs.readFileSync(raw, 'utf8').replace(/^\uFEFF/, ''));
        }
        return JSON.parse(String(raw).replace(/^\uFEFF/, ''));
    } catch (e) {
        console.error('Erreur décodage JSON :', e.message);
        return null;
    }
}

function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        voice: '',
        clips: null,
        clipsJson: '',
        music: '',
        musicStart: 0,
        musicVol: 0.10,      // Niveau relatif discret sous la voix pré-normalisée (-19 dB + sidechain ducking)
        musicLufs: -16.0,    // Loudness cible de la musique en mode sans voix off
        sfx: null,
        sfxJson: '',
        out: '',
        alsoWav: false,
        alsoMp3: false,
        duration: 0,
        fadeOut: 2.2,
        fadeIn: 0.4,
        preset: 'youtube',
        lufs: null
    };

    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        const next = args[i + 1];
        if (a === '--voice' && next) { config.voice = next; i++; }
        else if (a === '--clips' && next) { config.clipsJson = next; i++; }
        else if (a === '--music' && next) { config.music = next; i++; }
        else if (a === '--music-start' && next) { config.musicStart = Math.max(0, parseFloat(next) || 0); i++; }
        else if (a === '--music-vol' && next) { config.musicVol = parseFloat(next); i++; }
        else if (a === '--music-lufs' && next) { config.musicLufs = parseFloat(next); i++; }
        else if (a === '--sfx' && next) { config.sfxJson = next; i++; }
        else if (a === '--out' && next) { config.out = next; i++; }
        else if (a === '--also-wav') { config.alsoWav = true; }
        else if (a === '--also-mp3') { config.alsoMp3 = true; }
        else if (a === '--duration' && next) { config.duration = parseFloat(next); i++; }
        else if (a === '--fade-out' && next) { config.fadeOut = parseFloat(next); i++; }
        else if (a === '--fade-in' && next) { config.fadeIn = parseFloat(next); i++; }
        else if (a === '--preset' && next) { config.preset = next.toLowerCase(); i++; }
        else if (a === '--lufs' && next) { config.lufs = parseFloat(next); i++; }
    }

    if (config.clipsJson) config.clips = parseJsonArg(config.clipsJson);
    if (config.sfxJson) config.sfx = parseJsonArg(config.sfxJson);

    return config;
}

function inferSfxRole(filePath) {
    const base = path.basename(filePath || '').toLowerCase();
    if (/impact|bass|thump|hit|boom|crash|explosion|heartbeat|rumble|ignite/.test(base)) return 'impact';
    if (/whoosh|swoosh|riser|swell|transition|wind/.test(base)) return 'whoosh';
    return 'ui';
}

function defaultTargetPeakDb(role, musicRefDb, hasVoice = false) {
    if (hasVoice) {
        // Voix pré-normalisée à -14 LUFS : les SFX restent strictement en retrait (16 à 22 dB sous la voix)
        // pour ponctuer l'image sans JAMAIS couvrir ou masquer la narration parlée.
        if (role === 'impact') return -30.0;
        if (role === 'whoosh') return -33.0;
        return -36.0;
    }
    // Mode musique seule (-16 LUFS par défaut) : les SFX restent SOUS le lit musical, jamais au-dessus
    if (role === 'impact') return musicRefDb - 4.0;   // Ex: -20.0 dBFS sur musique -16 LUFS
    if (role === 'whoosh') return musicRefDb - 7.0;   // Ex: -23.0 dBFS
    return musicRefDb - 10.0;                         // Ex: -26.0 dBFS (UI discret)
}

function resolveAssetPath(p, fallbackSubdir) {
    if (!p) return '';
    if (path.isAbsolute(p) && fs.existsSync(p)) return p;
    const fromCwd = path.resolve(process.cwd(), p);
    if (fs.existsSync(fromCwd)) return fromCwd;
    const fromRoot = path.resolve(ROOT_DIR, p);
    if (fs.existsSync(fromRoot)) return fromRoot;
    if (fallbackSubdir) {
        const fromSub = path.resolve(ROOT_DIR, '01_Assets', fallbackSubdir, p);
        if (fs.existsSync(fromSub)) return fromSub;
    }
    return '';
}

function encodeAudioFile(srcWav, destPath) {
    const ext = path.extname(destPath).toLowerCase();
    const args = ['-y', '-hide_banner', '-i', srcWav, '-ar', '48000', '-ac', '2'];
    if (ext === '.mp3') {
        args.push('-c:a', 'libmp3lame', '-b:a', '192k');
    } else {
        args.push('-c:a', 'pcm_s16le');
    }
    args.push(destPath);
    const res = spawnSync(ffmpeg, args, { encoding: 'utf8' });
    if (res.status !== 0) {
        throw new Error(`Erreur encodage (${destPath}): ${res.stderr}`);
    }
}

function normalizeTrack(srcPath, destPath, { preset = 'youtube', lufs = null, tp = -1.5 } = {}) {
    const normalizeScript = path.resolve(__dirname, 'normalize_audio.cjs');
    if (fs.existsSync(normalizeScript)) {
        const args = [normalizeScript, '--input', srcPath, '--out', destPath, '--preset', preset, '--tp', String(tp), '--ar', '48000'];
        if (lufs !== null && !Number.isNaN(lufs)) args.push('--lufs', String(lufs));
        const res = spawnSync('node', args, { stdio: 'inherit' });
        if (res.status === 0 && fs.existsSync(destPath)) return;
    }
    encodeAudioFile(srcPath, destPath);
}

function buildSfxFilterNodes({ cues, sfxStartInputIdx, totalVideoDur, musicRefDb, hasVoice = false }) {
    const statsCache = new Map();
    const inputs = [];
    const filterParts = [];
    const labels = [];

    cues.forEach((cue, i) => {
        const fullPath = resolveAssetPath(cue.file, 'SFX');
        if (!fullPath) {
            console.warn(`⚠️ [SFX] Fichier introuvable ignoré : ${cue.file}`);
            return;
        }
        if (!statsCache.has(fullPath)) {
            statsCache.set(fullPath, probeAudio(fullPath));
        }
        const st = statsCache.get(fullPath);
        if (st.duration <= 0) return;

        const startSec = Math.max(0, parseFloat(cue.start || 0));
        if (startSec >= totalVideoDur - 0.05) return;

        const availDur = Math.max(0.05, totalVideoDur - startSec - 0.05);
        const trimStart = Math.max(0, parseFloat(cue.trimStart || 0));
        const desiredDur = cue.maxDur ? Math.min(parseFloat(cue.maxDur), availDur) : Math.min(st.duration - trimStart, availDur);
        if (desiredDur <= 0.02) return;

        const role = String(cue.role || inferSfxRole(fullPath)).toLowerCase();
        const basePeak = defaultTargetPeakDb(role, musicRefDb, hasVoice);
        const rawOffset = parseFloat(cue.offsetDb || 0);
        // Sous voix off : interdit de relever un SFX au-dessus du plafond de sécurité, et atténuation supplémentaire sur SFX longs (> 0.65s)
        const safeOffset = hasVoice ? Math.min(0, rawOffset) : rawOffset;
        const longPenalty = (hasVoice && desiredDur > 0.65) ? -3.0 : 0.0;
        let targetPeakDb = (cue.peakDb !== undefined && cue.peakDb !== null)
            ? parseFloat(cue.peakDb)
            : basePeak + safeOffset + longPenalty;
        if (hasVoice) targetPeakDb = Math.min(-28.0, targetPeakDb);

        // Gain strict basé sur max_volume (max +4 dB pour ne jamais amplifier le souffle)
        const gainDb = Math.min(4.0, targetPeakDb - st.maxVolumeDb);

        const fadeIn = Math.min(desiredDur * 0.25, Math.max(0.005, parseFloat(cue.fadeIn ?? 0.008)));
        const fadeOut = Math.min(desiredDur * 0.45, Math.max(0.03, parseFloat(cue.fadeOut ?? 0.08)));
        const fadeOutStart = Math.max(0, desiredDur - fadeOut);
        const delayMs = Math.round(startSec * 1000);
        const lpHz = cue.lowpassHz ? `,lowpass=f=${parseInt(cue.lowpassHz, 10)}` : (role === 'impact' ? ',lowpass=f=3200' : ',lowpass=f=6500');

        const inIdx = sfxStartInputIdx + labels.length;
        const lbl = `sfx_${labels.length}`;
        inputs.push('-i', fullPath);
        filterParts.push(
            `[${inIdx}:a]aformat=sample_rates=48000:channel_layouts=stereo,` +
            `atrim=${trimStart.toFixed(3)}:${(trimStart + desiredDur).toFixed(3)},asetpts=PTS-STARTPTS` +
            `${lpHz},volume=${gainDb.toFixed(2)}dB,` +
            `afade=t=in:st=0:d=${fadeIn.toFixed(3)},afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeOut.toFixed(3)},` +
            `adelay=${delayMs}|${delayMs},apad[${lbl}]`
        );
        labels.push(`[${lbl}]`);
        console.log(`   🔊 SFX[${labels.length}] ${path.basename(fullPath)} @ ${startSec.toFixed(2)}s | role=${role} | targetPeak=${targetPeakDb.toFixed(1)}dBFS (gain ${gainDb >= 0 ? '+' : ''}${gainDb.toFixed(1)}dB)`);
    });

    return { inputs, filterParts, labels };
}

/**
 * Mixe plusieurs pistes sans perte ni pompage amix sur toute version de FFmpeg (y compris FFmpeg 2018 sans normalize=0) :
 * Chaque piste auxiliaire étant étendue par apad, amix voit un nombre constant d'entrées N sur toute la durée.
 */
function buildConstantMixExpr(labels, outLabel, withLimiter = true) {
    const n = labels.length;
    const post = withLimiter ? `,alimiter=limit=0.90:attack=5:release=60` : '';
    return `${labels.join('')}amix=inputs=${n}:duration=first:dropout_transition=0,volume=${n}.0${post}[${outLabel}]`;
}

async function buildSoundtrack() {
    const config = parseArgs();

    if (!config.out) {
        console.error('Usage: node 07_Scripts/build_soundtrack.cjs --out <output.{mp3|wav}> [--voice <v> | --clips <json>] [--music <m>] [--sfx <json>] [--duration 60]');
        process.exit(1);
    }

    const outResolved = path.resolve(config.out);
    const outDir = path.dirname(outResolved);
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    console.log('🎵 --- ASSEMBLAGE DE LA BANDE SON MASTER ---');
    console.log(`Sortie cible : ${outResolved}`);

    const musicResolved = config.music ? resolveAssetPath(config.music, 'Musiques') : '';
    const hasMusic = Boolean(musicResolved && fs.existsSync(musicResolved));
    const hasClips = Array.isArray(config.clips) && config.clips.length > 0;
    const voiceResolved = config.voice ? resolveAssetPath(config.voice, 'Voix_Off') : '';
    const hasSingleVoice = Boolean(voiceResolved && fs.existsSync(voiceResolved));
    const hasVoice = hasClips || hasSingleVoice;
    const sfxCues = Array.isArray(config.sfx) ? config.sfx : [];

    if (!hasVoice && !hasMusic && sfxCues.length === 0) {
        console.error('Erreur: Aucun fichier voix, musique ou SFX fourni.');
        process.exit(1);
    }

    const tempDir = path.resolve(ROOT_DIR, 'scratch');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const tempFiles = [];

    try {
        let finalVoiceWav = null;

        // 1. TRAITEMENT DE LA VOIX OFF (PARADE ABSOLUE AU BUG AMIX)
        if (hasVoice) {
            if (hasClips) {
                console.log(`🎙 Concaténation de ${config.clips.length} segments de voix avec silences parfaits...`);
                const clipsWithDur = config.clips.map((c, idx) => {
                    const fullPath = resolveAssetPath(c.file, 'Voix_Off');
                    if (!fullPath) throw new Error(`Fichier voix introuvable : ${c.file}`);
                    return { idx, path: fullPath, start: parseFloat(c.start || 0), duration: getAudioDuration(fullPath) };
                }).sort((a, b) => a.start - b.start);

                const inputs = [];
                const filterParts = [];
                const concatList = [];
                let currentTime = 0;

                clipsWithDur.forEach((c, i) => {
                    inputs.push('-i', c.path);
                    const gap = c.start - currentTime;
                    if (gap > 0.005) {
                        filterParts.push(`aevalsrc=0:d=${gap.toFixed(4)}:s=48000:c=stereo[sil_${i}]`);
                        concatList.push(`[sil_${i}]`);
                    }
                    filterParts.push(`[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo[clip_${i}]`);
                    concatList.push(`[clip_${i}]`);
                    currentTime = c.start + c.duration;
                });

                if (config.duration > currentTime) {
                    const endGap = config.duration - currentTime;
                    filterParts.push(`aevalsrc=0:d=${endGap.toFixed(4)}:s=48000:c=stereo[sil_end]`);
                    concatList.push(`[sil_end]`);
                }

                const concatFilter = `${filterParts.join(';')};${concatList.join('')}concat=n=${concatList.length}:v=0:a=1[voice_clean]`;
                finalVoiceWav = path.join(tempDir, `temp_voice_concat_${Date.now()}.wav`);
                tempFiles.push(finalVoiceWav);

                const res = spawnSync(ffmpeg, ['-y', ...inputs, '-filter_complex', concatFilter, '-map', '[voice_clean]', finalVoiceWav], { encoding: 'utf8' });
                if (res.status !== 0) throw new Error(`Erreur concaténation voix : ${res.stderr}`);
                console.log('✅ Piste voix assemblée avec volume 100% constant (zéro dégradation amix).');
            } else {
                console.log(`🎙 Utilisation de la voix off continue : ${voiceResolved}`);
                finalVoiceWav = voiceResolved;
            }
        }

        const totalVideoDur = config.duration > 0 ? config.duration : (finalVoiceWav ? getAudioDuration(finalVoiceWav) : getAudioDuration(musicResolved) || 20.0);
        const musicFadeStart = Math.max(0, totalVideoDur - config.fadeOut);
        const masterWavTmp = path.join(tempDir, `temp_master_${Date.now()}.wav`);
        tempFiles.push(masterWavTmp);

        // 2. BRANCHES DE MIXAGE
        if (finalVoiceWav && hasMusic) {
            console.log(`🎶 Mixage Voix (-14 LUFS pré-calibrée) + Musique duckée (${path.basename(musicResolved)}) + ${sfxCues.length} SFX discrets...`);
            // Pré-normaliser la voix à -14 LUFS AVANT le mixage afin d'éviter qu'un loudnorm post-mixage ne remonte les SFX/musique pendant les respirations !
            const normVoiceWav = path.join(tempDir, `temp_voice_norm_${Date.now()}.wav`);
            tempFiles.push(normVoiceWav);
            normalizeTrack(finalVoiceWav, normVoiceWav, { preset: config.preset, lufs: config.lufs ?? -14.0, tp: -1.5 });

            const mixParts = [
                `[0:a]aformat=sample_rates=48000:channel_layouts=stereo,apad,atrim=0:${totalVideoDur.toFixed(3)},asetpts=PTS-STARTPTS,asplit=2[v_mix][v_sc]`,
                `[1:a]aformat=sample_rates=48000:channel_layouts=stereo,aloop=loop=-1:size=2e+09,atrim=${config.musicStart.toFixed(3)}:${(config.musicStart + totalVideoDur).toFixed(3)},asetpts=PTS-STARTPTS,volume=${config.musicVol},afade=t=in:st=0:d=${config.fadeIn},afade=t=out:st=${musicFadeStart.toFixed(3)}:d=${config.fadeOut},apad[m_bed]`,
                `[m_bed][v_sc]sidechaincompress=threshold=0.015:ratio=3.5:attack=35:release=320[m_duck]`
            ];
            const sfxBuilt = buildSfxFilterNodes({ cues: sfxCues, sfxStartInputIdx: 2, totalVideoDur, musicRefDb: -26.0, hasVoice: true });
            const allParts = [...mixParts, ...sfxBuilt.filterParts];
            const mixLabels = ['[v_mix]', '[m_duck]', ...sfxBuilt.labels];
            allParts.push(buildConstantMixExpr(mixLabels, 'mix_final', true));

            const res = spawnSync(ffmpeg, ['-y', '-i', normVoiceWav, '-i', musicResolved, ...sfxBuilt.inputs, '-filter_complex', allParts.join(';'), '-map', '[mix_final]', '-ar', '48000', '-c:a', 'pcm_s16le', masterWavTmp], { encoding: 'utf8' });
            if (res.status !== 0) throw new Error(`Erreur mixage voix/musique/SFX : ${res.stderr}`);

        } else if (finalVoiceWav && !hasMusic) {
            if (sfxCues.length > 0) {
                console.log(`🎙 Mixage Voix pré-normalisée (-14 LUFS) + ${sfxCues.length} SFX discrets...`);
                const normVoiceWav = path.join(tempDir, `temp_voice_norm_${Date.now()}.wav`);
                tempFiles.push(normVoiceWav);
                normalizeTrack(finalVoiceWav, normVoiceWav, { preset: config.preset, lufs: config.lufs ?? -14.0, tp: -1.5 });

                const sfxBuilt = buildSfxFilterNodes({ cues: sfxCues, sfxStartInputIdx: 1, totalVideoDur, musicRefDb: -26.0, hasVoice: true });
                const mixLabels = ['[v]', ...sfxBuilt.labels];
                const allParts = [
                    `[0:a]aformat=sample_rates=48000:channel_layouts=stereo,apad,atrim=0:${totalVideoDur.toFixed(3)},asetpts=PTS-STARTPTS[v]`,
                    ...sfxBuilt.filterParts,
                    buildConstantMixExpr(mixLabels, 'mix_final', true)
                ];
                const res = spawnSync(ffmpeg, ['-y', '-i', normVoiceWav, ...sfxBuilt.inputs, '-filter_complex', allParts.join(';'), '-map', '[mix_final]', '-ar', '48000', '-c:a', 'pcm_s16le', masterWavTmp], { encoding: 'utf8' });
                if (res.status !== 0) throw new Error(`Erreur mixage voix/SFX : ${res.stderr}`);
            } else {
                console.log('🎛 Normalisation directe de la piste voix off...');
                normalizeTrack(finalVoiceWav, masterWavTmp, { preset: config.preset, lufs: config.lufs, tp: -1.5 });
            }

        } else if (hasMusic && !finalVoiceWav) {
            // Mode Musique Seule + SFX (Vidéo purement musicale / cinématique sans voix off)
            const musicTargetLufs = (config.lufs !== null && !Number.isNaN(config.lufs)) ? config.lufs : config.musicLufs;
            console.log(`🎼 Mode Instrumental : ${path.basename(musicResolved)} (start=${config.musicStart}s, dur=${totalVideoDur.toFixed(2)}s, cible=${musicTargetLufs} LUFS)`);

            // Étape A : découpe propre du meilleur passage musical + fondu in/out
            const slicedMusicWav = path.join(tempDir, `temp_music_slice_${Date.now()}.wav`);
            const normMusicWav = path.join(tempDir, `temp_music_norm_${Date.now()}.wav`);
            tempFiles.push(slicedMusicWav, normMusicWav);

            const sliceArgs = [
                '-y', '-hide_banner',
                '-ss', config.musicStart.toFixed(3),
                '-i', musicResolved,
                '-af', `aloop=loop=-1:size=2e+09,atrim=0:${totalVideoDur.toFixed(3)},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,afade=t=in:st=0:d=${config.fadeIn},afade=t=out:st=${musicFadeStart.toFixed(3)}:d=${config.fadeOut}`,
                '-ar', '48000', '-c:a', 'pcm_s16le',
                slicedMusicWav
            ];
            const sliceRes = spawnSync(ffmpeg, sliceArgs, { encoding: 'utf8' });
            if (sliceRes.status !== 0) throw new Error(`Erreur découpe musique : ${sliceRes.stderr}`);

            // Étape B : normalisation LUFS linéaire du lit musical AVANT d'ajouter les SFX
            normalizeTrack(slicedMusicWav, normMusicWav, { preset: config.preset, lufs: musicTargetLufs, tp: -2.0 });

            if (sfxCues.length > 0) {
                console.log(`🎚 Calibrage et mixage de ${sfxCues.length} bruitages SOUS le lit musical (${musicTargetLufs} LUFS)...`);
                const sfxBuilt = buildSfxFilterNodes({
                    cues: sfxCues,
                    sfxStartInputIdx: 1,
                    totalVideoDur,
                    musicRefDb: musicTargetLufs
                });
                if (sfxBuilt.labels.length > 0) {
                    const mixLabels = ['[m_bed]', ...sfxBuilt.labels];
                    const allParts = [
                        `[0:a]aformat=sample_rates=48000:channel_layouts=stereo[m_bed]`,
                        ...sfxBuilt.filterParts,
                        buildConstantMixExpr(mixLabels, 'mix_final', true)
                    ];
                    const mixRes = spawnSync(ffmpeg, ['-y', '-i', normMusicWav, ...sfxBuilt.inputs, '-filter_complex', allParts.join(';'), '-map', '[mix_final]', '-ar', '48000', '-c:a', 'pcm_s16le', masterWavTmp], { encoding: 'utf8' });
                    if (mixRes.status !== 0) throw new Error(`Erreur mixage musique+SFX : ${mixRes.stderr}`);
                } else {
                    fs.copyFileSync(normMusicWav, masterWavTmp);
                }
            } else {
                fs.copyFileSync(normMusicWav, masterWavTmp);
            }
        } else if (!hasMusic && !finalVoiceWav && sfxCues.length > 0) {
            // Mode SFX Seuls (Vidéo motion design sans voix off ni musique)
            console.log(`🔊 Mode SFX Seuls : mixage de ${sfxCues.length} bruitages sur piste silencieuse (${totalVideoDur.toFixed(2)}s)...`);
            const sfxBuilt = buildSfxFilterNodes({
                cues: sfxCues,
                sfxStartInputIdx: 0,
                totalVideoDur,
                musicRefDb: -8.0,
                hasVoice: false
            });
            if (sfxBuilt.labels.length > 0) {
                const silenceIdx = sfxBuilt.inputs.length / 2;
                const mixLabels = [`[${silenceIdx}:a]`, ...sfxBuilt.labels];
                const allParts = [
                    ...sfxBuilt.filterParts,
                    buildConstantMixExpr(mixLabels, 'mix_final', true)
                ];
                const res = spawnSync(
                    ffmpeg,
                    ['-y', ...sfxBuilt.inputs, '-f', 'lavfi', '-t', totalVideoDur.toFixed(3), '-i', 'anullsrc=r=48000:cl=stereo', '-filter_complex', allParts.join(';'), '-map', '[mix_final]', '-ar', '48000', '-c:a', 'pcm_s16le', masterWavTmp],
                    { encoding: 'utf8' }
                );
                if (res.status !== 0) throw new Error(`Erreur mixage SFX seuls : ${res.stderr}`);
            } else {
                const res = spawnSync(ffmpeg, ['-y', '-f', 'lavfi', '-t', totalVideoDur.toFixed(3), '-i', 'anullsrc=r=48000:cl=stereo', '-ar', '48000', '-c:a', 'pcm_s16le', masterWavTmp], { encoding: 'utf8' });
                if (res.status !== 0) throw new Error(`Erreur génération silence : ${res.stderr}`);
            }
        }

        // 3. Export final exact (.mp3 192k et/ou .wav 48kHz)
        encodeAudioFile(masterWavTmp, outResolved);
        const outExt = path.extname(outResolved).toLowerCase();
        if (config.alsoWav && outExt !== '.wav') {
            const wavCompanion = outResolved.replace(/\.[^.]+$/, '.wav');
            encodeAudioFile(masterWavTmp, wavCompanion);
        }
        if (config.alsoMp3 && outExt !== '.mp3') {
            const mp3Companion = outResolved.replace(/\.[^.]+$/, '.mp3');
            encodeAudioFile(masterWavTmp, mp3Companion);
        }

        const stats = probeAudio(outResolved);
        console.log(`\n✅ BANDE SON MASTER PRÊTE : ${outResolved}`);
        console.log(`   Durée : ${stats.duration.toFixed(2)}s | mean_volume : ${stats.meanVolumeDb} dB | max_volume : ${stats.maxVolumeDb} dB\n`);
    } finally {
        for (const f of tempFiles) {
            try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
        }
    }
}

buildSoundtrack().catch(err => {
    console.error('Erreur :', err);
    process.exit(1);
});
