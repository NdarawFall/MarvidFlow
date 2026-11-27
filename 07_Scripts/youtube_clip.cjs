/**
 * 07_Scripts/youtube_clip.cjs
 * Utilitaire pour inspecter, transcrire et extraire des vidéos YouTube
 * 
 * Fonctionnalités :
 * 1. Informations vidéo (--info <url>)
 * 2. Transcription horodatée (--transcript <url> [--lang fr|en])
 * 3. Téléchargement d'un extrait ou de la vidéo complète (--download <url> [--start HH:MM:SS] [--end HH:MM:SS] [--out <chemin>])
 * 4. Téléchargement de la miniature HD (--thumbnail <url> [--out <chemin>])
 * 
 * Utilise yt-dlp natif et le binaire FFmpeg embarqué de @ffmpeg-installer/ffmpeg
 */

const { spawn, execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Résolution de FFmpeg
function getFfmpegPath() {
    try {
        const installer = require('@ffmpeg-installer/ffmpeg');
        if (installer && installer.path && fs.existsSync(installer.path)) {
            return installer.path;
        }
    } catch (e) {}

    const localFfmpeg = path.join(__dirname, '..', 'node_modules', '@ffmpeg-installer', 'win32-x64', 'ffmpeg.exe');
    if (fs.existsSync(localFfmpeg)) return localFfmpeg;

    return 'ffmpeg';
}

// Nettoyage / normalisation d'URL YouTube
function sanitizeYoutubeUrl(url) {
    if (!url) return '';
    let cleaned = url.trim();
    // Support youtube.com/shorts/xxx -> youtube.com/watch?v=xxx
    const shortsMatch = cleaned.match(/youtube\.com\/shorts\/([a-zA-Z0-9_\-]+)/);
    if (shortsMatch) {
        return `https://www.youtube.com/watch?v=${shortsMatch[1]}`;
    }
    // youtu.be/xxx
    const youtuMatch = cleaned.match(/youtu\.be\/([a-zA-Z0-9_\-]+)/);
    if (youtuMatch) {
        return `https://www.youtube.com/watch?v=${youtuMatch[1]}`;
    }
    return cleaned;
}

// Récupération des métadonnées (titre, durée, miniature, etc.)
function getVideoInfo(url) {
    return new Promise((resolve, reject) => {
        const cleanUrl = sanitizeYoutubeUrl(url);
        if (!cleanUrl) return reject(new Error('URL YouTube invalide ou manquante'));

        const cmd = `yt-dlp --dump-json --no-warnings --no-playlist "${cleanUrl}"`;
        exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
            if (err) {
                return reject(new Error(`Erreur récupération info : ${err.message}`));
            }
            try {
                const info = JSON.parse(stdout);
                resolve({
                    id: info.id,
                    title: info.title,
                    duration: info.duration,
                    durationFormatted: formatSeconds(info.duration || 0),
                    uploader: info.uploader || info.channel || '',
                    thumbnail: info.thumbnail || '',
                    subtitles: Object.keys(info.subtitles || {}),
                    autoCaptions: Object.keys(info.automatic_captions || {}),
                    description: (info.description || '').slice(0, 300)
                });
            } catch (parseErr) {
                reject(new Error('Impossible d\'analyser la réponse de yt-dlp'));
            }
        });
    });
}

// Formatage secondes -> HH:MM:SS
function formatSeconds(sec) {
    const s = Math.floor(sec);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

// Récupération complète et export des données de la vidéo (titre, tags, stats, description, etc.)
function getVideoData({ url, outputPath = null }) {
    return new Promise((resolve, reject) => {
        const cleanUrl = sanitizeYoutubeUrl(url);
        if (!cleanUrl) return reject(new Error('URL YouTube invalide ou manquante'));

        const cmd = `yt-dlp --dump-json --no-warnings --no-playlist "${cleanUrl}"`;
        exec(cmd, { maxBuffer: 15 * 1024 * 1024 }, (err, stdout, stderr) => {
            if (err) {
                return reject(new Error(`Erreur récupération données : ${err.message}`));
            }
            try {
                const raw = JSON.parse(stdout);
                const data = {
                    id: raw.id,
                    title: raw.title,
                    description: raw.description || '',
                    uploader: raw.uploader || raw.channel || '',
                    uploaderId: raw.uploader_id || '',
                    channelUrl: raw.channel_url || '',
                    duration: raw.duration,
                    durationFormatted: formatSeconds(raw.duration || 0),
                    viewCount: raw.view_count || 0,
                    likeCount: raw.like_count || 0,
                    uploadDate: raw.upload_date || '',
                    tags: Array.isArray(raw.tags) ? raw.tags : [],
                    categories: Array.isArray(raw.categories) ? raw.categories : [],
                    thumbnail: raw.thumbnail || '',
                    webpageUrl: raw.webpage_url || cleanUrl,
                    fps: raw.fps || 30,
                    resolution: raw.resolution || (raw.width && raw.height ? `${raw.width}x${raw.height}` : '1080p')
                };

                let savedPath = null;
                let relPath = null;
                if (outputPath) {
                    const rootDir = path.resolve(__dirname, '..');
                    savedPath = path.isAbsolute(outputPath) ? outputPath : path.resolve(rootDir, outputPath);
                    const targetDir = path.dirname(savedPath);
                    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                    fs.writeFileSync(savedPath, JSON.stringify(data, null, 2), 'utf8');
                    relPath = path.relative(rootDir, savedPath).replace(/\\/g, '/');
                }

                resolve({
                    success: true,
                    data,
                    savedPath,
                    relativePath: relPath
                });
            } catch (parseErr) {
                reject(new Error('Impossible d\'analyser les données de yt-dlp'));
            }
        });
    });
}

// Parseur basique pour format VTT
function parseVttSubtitles(vttContent) {
    const lines = vttContent.replace(/\r\n/g, '\n').split('\n');
    const cues = [];
    let currentCue = null;

    const timeRegex = /((?:\d{2}:)?\d{2}:\d{2}[\.,]\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}[\.,]\d{3})/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('WEBVTT') || line.startsWith('NOTE')) continue;

        const timeMatch = line.match(timeRegex);
        if (timeMatch) {
            if (currentCue && currentCue.text) {
                cues.push(currentCue);
            }
            currentCue = {
                start: timeMatch[1].replace(',', '.'),
                end: timeMatch[2].replace(',', '.'),
                text: ''
            };
        } else if (currentCue) {
            const cleanText = line.replace(/<[^>]+>/g, '').trim();
            if (cleanText) {
                if (currentCue.text) currentCue.text += ' ' + cleanText;
                else currentCue.text = cleanText;
            }
        }
    }
    if (currentCue && currentCue.text) {
        cues.push(currentCue);
    }

    // Déduplication des répétitions VTT courantes de YouTube
    const deduplicated = [];
    let lastText = '';
    for (const cue of cues) {
        if (cue.text !== lastText) {
            deduplicated.push(cue);
            lastText = cue.text;
        }
    }
    return deduplicated;
}

// Récupération de la transcription
function getVideoTranscript(url, preferredLang = 'fr') {
    return new Promise((resolve, reject) => {
        const cleanUrl = sanitizeYoutubeUrl(url);
        if (!cleanUrl) return reject(new Error('URL YouTube invalide ou manquante'));

        const tempDir = os.tmpdir();
        const baseName = `yt_sub_${Date.now()}`;
        const outPattern = path.join(tempDir, `${baseName}.%(ext)s`);

        // Priorité : langue demandée, puis français, puis anglais
        const subLangs = `${preferredLang},fr,en,fr-orig,en-orig`;

        const args = [
            '--write-auto-subs',
            '--write-subs',
            '--sub-langs', subLangs,
            '--sub-format', 'vtt',
            '--skip-download',
            '--no-warnings',
            '--output', outPattern,
            cleanUrl
        ];

        const proc = spawn('yt-dlp', args);
        let stderrData = '';

        proc.stderr.on('data', d => { stderrData += d.toString(); });

        proc.on('close', code => {
            // Recherche du fichier .vtt généré dans tempDir
            const files = fs.readdirSync(tempDir);
            const subFile = files.find(f => f.startsWith(baseName) && f.endsWith('.vtt'));

            if (!subFile) {
                return resolve({
                    success: false,
                    message: 'Aucun sous-titre ni transcription automatique trouvée pour cette vidéo.',
                    cues: []
                });
            }

            const fullPath = path.join(tempDir, subFile);
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const cues = parseVttSubtitles(content);

                // Nettoyage du fichier temporaire
                try { fs.unlinkSync(fullPath); } catch (e) {}

                resolve({
                    success: true,
                    subtitleFile: subFile,
                    count: cues.length,
                    cues: cues
                });
            } catch (err) {
                reject(new Error(`Erreur lecture sous-titres : ${err.message}`));
            }
        });
    });
}

// Téléchargement direct de la miniature YouTube en haute résolution
function downloadThumbnail({ url, outputPath = null }) {
    return new Promise(async (resolve, reject) => {
        try {
            const cleanUrl = sanitizeYoutubeUrl(url);
            if (!cleanUrl) return reject(new Error('URL YouTube invalide'));

            let videoId = '';
            const matchV = cleanUrl.match(/[?&]v=([a-zA-Z0-9_\-]+)/);
            if (matchV) videoId = matchV[1];
            else {
                const matchShort = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_\-]+)/);
                if (matchShort) videoId = matchShort[1];
            }

            const assetsDir = path.join(__dirname, '..', '01_Assets', 'Images');
            if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

            let targetOut = outputPath;
            if (!targetOut) {
                targetOut = path.join(assetsDir, `youtube_thumb_${videoId || Date.now()}.jpg`);
            } else if (!path.isAbsolute(targetOut)) {
                targetOut = path.join(__dirname, '..', targetOut);
            }

            const targetDir = path.dirname(targetOut);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            console.log(`[YouTube Thumbnail] Téléchargement de la miniature pour : ${cleanUrl}`);

            const cmd = `yt-dlp --no-warnings --skip-download --write-thumbnail --convert-thumbnails jpg -o "${targetOut.replace(/\.jpg$/i, '')}" "${cleanUrl}"`;

            exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
                if (err) {
                    if (videoId) {
                        const https = require('https');
                        const cdnUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                        const file = fs.createWriteStream(targetOut);
                        https.get(cdnUrl, (res) => {
                            if (res.statusCode === 200) {
                                res.pipe(file);
                                file.on('finish', () => {
                                    file.close(() => {
                                        const rel = path.relative(path.join(__dirname, '..'), targetOut).replace(/\\/g, '/');
                                        return resolve({ success: true, localPath: targetOut, relativePath: rel, videoId });
                                    });
                                });
                            } else {
                                const fallbackUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                const fbFile = fs.createWriteStream(targetOut);
                                https.get(fallbackUrl, (fbRes) => {
                                    fbRes.pipe(fbFile);
                                    fbFile.on('finish', () => {
                                        fbFile.close(() => {
                                            const rel = path.relative(path.join(__dirname, '..'), targetOut).replace(/\\/g, '/');
                                            resolve({ success: true, localPath: targetOut, relativePath: rel, videoId });
                                        });
                                    });
                                }).on('error', reject);
                            }
                        }).on('error', reject);
                        return;
                    }
                    return reject(new Error(`Erreur téléchargement miniature : ${err.message}`));
                }

                if (fs.existsSync(targetOut)) {
                    const rel = path.relative(path.join(__dirname, '..'), targetOut).replace(/\\/g, '/');
                    return resolve({ success: true, localPath: targetOut, relativePath: rel, videoId });
                }

                const baseWithoutExt = targetOut.replace(/\.jpg$/i, '');
                const found = [baseWithoutExt + '.jpg', baseWithoutExt + '.webp', baseWithoutExt + '.png'].find(p => fs.existsSync(p));
                if (found) {
                    const rel = path.relative(path.join(__dirname, '..'), found).replace(/\\/g, '/');
                    return resolve({ success: true, localPath: found, relativePath: rel, videoId });
                }

                reject(new Error("La miniature n'a pas pu être trouvée après extraction."));
            });
        } catch (e) {
            reject(e);
        }
    });
}

// Téléchargement d'une vidéo complète ou d'un extrait précis
function downloadClip({ url, start, end, outputPath, format = 'mp4' }) {
    return new Promise((resolve, reject) => {
        const cleanUrl = sanitizeYoutubeUrl(url);
        if (!cleanUrl) return reject(new Error('URL YouTube invalide'));

        const ffmpegPath = getFfmpegPath();
        const rootDir = path.resolve(__dirname, '..');
        
        let targetOut = outputPath;
        if (!targetOut) {
            const outDir = path.join(rootDir, '01_Assets', 'Videos');
            if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
            const stamp = Date.now().toString().slice(-6);
            targetOut = path.join(outDir, `yt_clip_${stamp}.mp4`);
        } else if (!path.isAbsolute(targetOut)) {
            targetOut = path.resolve(rootDir, targetOut);
        }

        const outDir = path.dirname(targetOut);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        const args = [
            '--ffmpeg-location', ffmpegPath,
            '--no-playlist',
            '--no-warnings'
        ];

        // Extrait précis avec timestamps (ex: 00:01:10 ou 70)
        if (start || end) {
            const s = start || '0';
            const e = end || 'inf';
            args.push('--download-sections', `*${s}-${e}`);
            args.push('--force-keyframes-at-cuts');
        }

        // Format standardisé 1080p max en MP4
        args.push('-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best');
        args.push('--merge-output-format', 'mp4');
        args.push('-o', targetOut);
        args.push(cleanUrl);

        console.log(`[YouTube Clip] Téléchargement en cours vers : ${targetOut}`);
        if (start || end) {
            console.log(`[YouTube Clip] Extrait ciblé : de ${start || 'début'} à ${end || 'fin'}`);
        }

        const proc = spawn('yt-dlp', args);
        let logOutput = '';

        proc.stdout.on('data', d => {
            const str = d.toString();
            logOutput += str;
            // Affiche l'avancement pourcentage
            const match = str.match(/\[download\]\s+(\d+\.?\d*\%)/);
            if (match) {
                process.stdout.write(`\r[Téléchargement] ${match[1]}... `);
            }
        });

        proc.stderr.on('data', d => {
            logOutput += d.toString();
        });

        proc.on('close', code => {
            console.log('');
            if (code !== 0 && !fs.existsSync(targetOut)) {
                return reject(new Error(`yt-dlp a échoué (code ${code}). Logs : ${logOutput.slice(-400)}`));
            }
            resolve({
                success: true,
                filePath: targetOut,
                fileName: path.basename(targetOut),
                relativePath: path.relative(rootDir, targetOut).replace(/\\/g, '/')
            });
        });
    });
}

// Mode Ligne de Commande (CLI)
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(`
===============================================================
🎬 UTILITAIRE YOUTUBE CLIP & TRANSCRIPTION (MarvidFlow)
===============================================================
Usage :
  node 07_Scripts/youtube_clip.cjs --info <url>
  node 07_Scripts/youtube_clip.cjs --thumbnail <url> [--out <fichier.jpg>]
  node 07_Scripts/youtube_clip.cjs --data <url> [--out <fichier.json>]
  node 07_Scripts/youtube_clip.cjs --transcript <url> [--lang fr|en]
  node 07_Scripts/youtube_clip.cjs --download <url> [--start HH:MM:SS] [--end HH:MM:SS] [--out <fichier.mp4>]

Exemples :
  # 1. Télécharger la miniature HD
  node 07_Scripts/youtube_clip.cjs --thumbnail "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

  # 2. Exporter toutes les métadonnées (titre, tags, stats, description)
  node 07_Scripts/youtube_clip.cjs --data "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --out 01_Assets/Images/rickroll_data.json

  # 3. Lire la transcription pour repérer un moment précis
  node 07_Scripts/youtube_clip.cjs --transcript "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --lang en

  # 4. Télécharger un extrait précis de 15 secondes
  node 07_Scripts/youtube_clip.cjs --download "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --start 00:00:10 --end 00:00:25 --out 01_Assets/Videos/rickroll_clip.mp4
===============================================================
        `);
        process.exit(0);
    }

    const getArg = (flag) => {
        const idx = args.indexOf(flag);
        return (idx >= 0 && args[idx + 1]) ? args[idx + 1] : null;
    };

    const url = args.find(a => a.startsWith('http://') || a.startsWith('https://') || a.includes('youtube.com') || a.includes('youtu.be'));

    if (args.includes('--info')) {
        if (!url) {
            console.error('Erreur : veuillez fournir une URL YouTube.');
            process.exit(1);
        }
        getVideoInfo(url)
            .then(info => {
                console.log('\n--- Informations Vidéo ---');
                console.log(`Titre     : ${info.title}`);
                console.log(`Chaîne    : ${info.uploader}`);
                console.log(`Durée     : ${info.durationFormatted} (${info.duration}s)`);
                console.log(`Miniature : ${info.thumbnail}`);
                console.log(`Sous-titres dispo : ${info.subtitles.join(', ') || 'aucun'}`);
                console.log(`Auto-captions     : ${info.autoCaptions.slice(0, 8).join(', ') || 'aucune'}`);
            })
            .catch(err => {
                console.error(err.message);
                process.exit(1);
            });
    } else if (args.includes('--thumbnail') || args.includes('--thumb')) {
        if (!url) {
            console.error('Erreur : veuillez fournir une URL YouTube.');
            process.exit(1);
        }
        const out = getArg('--out');
        downloadThumbnail({ url, outputPath: out })
            .then(res => {
                console.log(`\n🎉 Miniature HD enregistrée : ${res.relativePath}`);
            })
            .catch(err => {
                console.error(`\n❌ Échec téléchargement miniature : ${err.message}`);
                process.exit(1);
            });
    } else if (args.includes('--data') || args.includes('--metadata') || args.includes('--json')) {
        if (!url) {
            console.error('Erreur : veuillez fournir une URL YouTube.');
            process.exit(1);
        }
        const out = getArg('--out');
        getVideoData({ url, outputPath: out })
            .then(res => {
                if (res.relativePath) {
                    console.log(`\n🎉 Données de la vidéo enregistrées dans : ${res.relativePath}`);
                } else {
                    console.log('\n--- Données Complètes de la Vidéo ---');
                    console.log(JSON.stringify(res.data, null, 2));
                }
            })
            .catch(err => {
                console.error(`\n❌ Échec extraction des données : ${err.message}`);
                process.exit(1);
            });
    } else if (args.includes('--transcript')) {
        if (!url) {
            console.error('Erreur : veuillez fournir une URL YouTube.');
            process.exit(1);
        }
        const lang = getArg('--lang') || 'fr';
        console.log(`\nRecherche de la transcription (${lang})...`);
        getVideoTranscript(url, lang)
            .then(res => {
                if (!res.success) {
                    console.log(`⚠️  ${res.message}`);
                    return;
                }
                console.log(`✅ ${res.count} segments trouvés :\n`);
                res.cues.forEach(c => {
                    console.log(`[${c.start} ➔ ${c.end}]  ${c.text}`);
                });
            })
            .catch(err => {
                console.error(err.message);
                process.exit(1);
            });
    } else if (args.includes('--download')) {
        if (!url) {
            console.error('Erreur : veuillez fournir une URL YouTube.');
            process.exit(1);
        }
        const start = getArg('--start');
        const end = getArg('--end');
        const out = getArg('--out');

        downloadClip({ url, start, end, outputPath: out })
            .then(res => {
                console.log(`\n🎉 Vidéo prête : ${res.relativePath}`);
            })
            .catch(err => {
                console.error(`\n❌ Échec : ${err.message}`);
                process.exit(1);
            });
    }
}

module.exports = {
    getVideoInfo,
    getVideoData,
    getVideoTranscript,
    downloadClip,
    downloadThumbnail
};
