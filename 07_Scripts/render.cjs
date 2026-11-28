/**
 * RENDER.CJS — Moteur de rendu 100% natif (ZÉRO node_modules)
 * Contrôle Chrome Headless via le protocole CDP natif et encode avec FFmpeg
 */
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Détection d'un navigateur Chromium (Chrome, Edge, Brave)
function getChromePath() {
    const candidates = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
        'C:\\Program Files\\Chromium\\Application\\chrome.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Chromium', 'Application', 'chrome.exe')
    ];
    for (const p of candidates) {
        if (p && fs.existsSync(p)) return p;
    }
    try {
        const stdout = execSync('where chrome || where msedge || where brave', { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
        const firstLine = stdout.split(/\r?\n/)[0]?.trim();
        if (firstLine && fs.existsSync(firstLine)) return firstLine;
    } catch (e) {}
    return null;
}

// Détection de FFmpeg (priorité 64-bit avec support asar unpack)
function getFfmpegPath() {
    try {
        const installer = require('@ffmpeg-installer/ffmpeg');
        if (installer && installer.path) {
            let p = installer.path;
            if (p.includes('app.asar')) {
                const unpacked = p.replace('app.asar', 'app.asar.unpacked');
                if (fs.existsSync(unpacked)) return unpacked;
            }
            if (fs.existsSync(p)) return p;
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
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'),
        'C:\\Program Files (x86)\\FastPCTools\\Fast Screen Recorder\\ffmpeg.exe'
    ];
    for (const p of candidates) {
        if (p && fs.existsSync(p)) return p;
    }
    return null;
}

const CHROME_PATH = getChromePath();
const FFMPEG_PATH = getFfmpegPath();

// Fichier cible passé en paramètre ou par défaut
const targetVideoParam = process.argv[2] || 'demo-video.html';
let HTML_FILE = path.resolve(__dirname, '..', targetVideoParam);
if (!fs.existsSync(HTML_FILE)) {
    HTML_FILE = path.resolve(__dirname, '..', '04_Videos', targetVideoParam);
}
if (!fs.existsSync(HTML_FILE)) {
    HTML_FILE = path.resolve(__dirname, '..', '03_Chaines', targetVideoParam);
}
const OUTPUT_DIR = path.resolve(__dirname, '..', '08_Rendus');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const baseVideoName = path.basename(targetVideoParam);
const OUTPUT_FILE = path.resolve(OUTPUT_DIR, baseVideoName.replace(/\.html$/i, '.mp4'));
const FPS = 30;

const { cleanupScratch, setVideoProcessLock } = require('./cleanup-scratch.cjs');

async function main() {
    setVideoProcessLock(true, 'render');
    console.log(`\n======================================================`);
    console.log(`🎬  DÉMARRAGE DU RENDU VIDÉO (Mode Zéro Dépendance)`);
    console.log(`📄  Source : ${HTML_FILE}`);
    console.log(`📦  Destination : ${OUTPUT_FILE}`);
    console.log(`======================================================\n`);

    if (!fs.existsSync(HTML_FILE)) {
        throw new Error(`Fichier HTML introuvable : ${HTML_FILE}`);
    }
    if (!CHROME_PATH) {
        throw new Error(`Navigateur Chromium introuvable. Installez Google Chrome, Microsoft Edge ou Brave pour le moteur de rendu vidéo.`);
    }
    if (!FFMPEG_PATH) {
        throw new Error(`FFmpeg introuvable. Installez FFmpeg ou ajoutez-le au PATH.`);
    }

    console.log(`🔧 FFmpeg détecté : ${FFMPEG_PATH}`);
    console.log('🚀 1. Lancement de Chrome Headless...');

    const tempProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-render-'));
    const chrome = spawn(CHROME_PATH, [
        '--headless=new',
        '--remote-debugging-port=0',
        '--disable-gpu',
        '--no-first-run',
        '--hide-scrollbars',
        '--window-size=1920,1080',
        '--user-data-dir=' + tempProfile
    ]);

    const wsBrowserUrl = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Délai dépassé pour la connexion Chrome CDP')), 15000);
        const onData = data => {
            const text = data.toString();
            const match = text.match(/DevTools listening on (ws:\/\/[^\s]+)/);
            if (match) {
                clearTimeout(timeout);
                resolve(match[1]);
            }
        };
        chrome.stderr.on('data', onData);
        if (chrome.stdout) chrome.stdout.on('data', onData);
        chrome.on('error', reject);
    });

    const browserWs = new WebSocket(wsBrowserUrl);
    await new Promise(r => browserWs.onopen = r);

    let msgId = 1;
    function send(method, params = {}, sessionId = null) {
        return new Promise((resolve, reject) => {
            const id = msgId++;
            const payload = { id, method, params };
            if (sessionId) payload.sessionId = sessionId;

            const handler = (evt) => {
                const res = JSON.parse(evt.data);
                if (res.id === id) {
                    browserWs.removeEventListener('message', handler);
                    if (res.error) reject(new Error(res.error.message));
                    else resolve(res.result);
                }
            };
            browserWs.addEventListener('message', handler);
            browserWs.send(JSON.stringify(payload));
        });
    }

    // Créer la page
    const target = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });

    await send('Page.enable', {}, sessionId);
    await send('Runtime.enable', {}, sessionId);
    await send('Emulation.setDeviceMetricsOverride', {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        mobile: false
    }, sessionId);

    console.log('📄 2. Chargement de la page HTML de la vidéo...');
    const fileUrl = `file:///${HTML_FILE.replace(/\\/g, '/')}`;

    const loadPromise = new Promise(resolve => {
        const handler = (evt) => {
            const msg = JSON.parse(evt.data);
            if (msg.method === 'Page.loadEventFired') {
                browserWs.removeEventListener('message', handler);
                resolve();
            }
        };
        browserWs.addEventListener('message', handler);
    });

    await send('Page.navigate', { url: fileUrl }, sessionId);
    await loadPromise;
    await new Promise(r => setTimeout(r, 600));

    // Détection de la durée
    const evalResult = await send('Runtime.evaluate', {
        expression: `(() => {
            if (window.__timeline && typeof window.__timeline.duration === 'function') {
                const d = window.__timeline.duration();
                if (d && d > 0) return d;
            }
            if (window.__timelines) {
                const vals = Object.values(window.__timelines);
                if (vals.length > 0 && typeof vals[0].duration === 'function') {
                    const d = vals[0].duration();
                    if (d && d > 0) return d;
                }
            }
            const stage = document.getElementById('stage');
            if (stage && stage.dataset.duration) {
                const d = parseFloat(stage.dataset.duration);
                if (!isNaN(d) && d > 0) return d;
            }
            return 4;
        })()`,
        returnByValue: true
    }, sessionId);

    const DURATION = evalResult.result.value || 4;
    const TOTAL_FRAMES = Math.round(FPS * DURATION);
    console.log(`⏱️  Durée détectée : ${DURATION}s (${TOTAL_FRAMES} frames @ ${FPS} FPS)`);

    console.log('🎥 3. Démarrage du processus FFmpeg...');
    const ffmpeg = spawn(FFMPEG_PATH, [
        '-y',
        '-f', 'image2pipe',
        '-vcodec', 'png',
        '-r', `${FPS}`,
        '-i', '-',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        OUTPUT_FILE
    ]);

    let ffmpegErrLog = '';
    ffmpeg.stderr.on('data', d => {
        const text = d.toString();
        ffmpegErrLog += text;
        if (text.includes('Error') || text.includes('error') || text.includes('failed')) {
            console.error('\n[FFmpeg Error]:', text.trim());
        }
    });

    ffmpeg.stdin.on('error', err => {
        console.error('\n[FFmpeg stdin error]:', err.message);
    });

    console.log(`⏱️  4. Capture des ${TOTAL_FRAMES} frames...`);
    const startTime = Date.now();

    for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
        const timeInSeconds = frame / FPS;

        await send('Runtime.evaluate', {
            expression: `(() => {
                if (window.__timeline && typeof window.__timeline.seek === 'function') {
                    window.__timeline.seek(${timeInSeconds});
                } else if (window.__timelines) {
                    const vals = Object.values(window.__timelines);
                    if (vals.length > 0 && typeof vals[0].seek === 'function') {
                        vals[0].seek(${timeInSeconds});
                    }
                }
            })()`
        }, sessionId);

        const snap = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
        const buf = Buffer.from(snap.data, 'base64');
        
        const canWrite = ffmpeg.stdin.write(buf);
        if (!canWrite) {
            await new Promise(r => ffmpeg.stdin.once('drain', r));
        }

        if (frame % 15 === 0 || frame === TOTAL_FRAMES - 1) {
            const percent = Math.round(((frame + 1) / TOTAL_FRAMES) * 100);
            process.stdout.write(`\r   Progression : [${percent}%] Frame ${frame + 1}/${TOTAL_FRAMES} (t = ${timeInSeconds.toFixed(2)}s)`);
        }
    }

    console.log('\n📦 5. Finalisation du fichier MP4...');
    ffmpeg.stdin.end();

    await new Promise(resolve => ffmpeg.on('close', resolve));
    browserWs.close();
    chrome.kill();

    // Muxing audio si une piste master existe (WAV, MP3 ou balise <audio> déclarée dans le HTML)
    const possibleAudioTracks = [
        path.resolve(__dirname, '..', '01_Assets', 'Audio_Mix', baseVideoName.replace(/\.html$/i, '_master_soundtrack.wav')),
        path.resolve(__dirname, '..', '01_Assets', 'Audio_Mix', baseVideoName.replace(/\.html$/i, '_master_soundtrack.mp3')),
        path.resolve(__dirname, '..', '01_Assets', 'Audio_Mix', 'air_senegal_master_soundtrack.wav')
    ];
    try {
        const htmlRaw = fs.readFileSync(HTML_FILE, 'utf8');
        const audioSrcMatches = htmlRaw.match(/<audio[^>]+src=["']([^"']+)["']/ig) || [];
        for (const tag of audioSrcMatches) {
            const m = tag.match(/src=["']([^"']+)["']/i);
            if (m && m[1] && !m[1].startsWith('http') && !m[1].startsWith('data:')) {
                const resolvedAudio = path.resolve(path.dirname(HTML_FILE), m[1]);
                if (!possibleAudioTracks.includes(resolvedAudio)) {
                    possibleAudioTracks.push(resolvedAudio);
                }
            }
        }
    } catch (e) {}
    let matchedAudio = possibleAudioTracks.find(p => fs.existsSync(p));

    if (matchedAudio) {
        console.log(`\n🎵 Muxing de la bande son master : ${path.basename(matchedAudio)}...`);
        const tempMux = OUTPUT_FILE.replace(/\.mp4$/i, '_with_audio.mp4');
        const muxCmd = `"${FFMPEG_PATH}" -y -i "${OUTPUT_FILE}" -i "${matchedAudio}" -c:v copy -c:a aac -b:a 192k -shortest "${tempMux}"`;
        try {
            execSync(muxCmd, { stdio: 'ignore' });
            if (fs.existsSync(tempMux)) {
                fs.copyFileSync(tempMux, OUTPUT_FILE);
                fs.unlinkSync(tempMux);
                console.log(`🔊 Audio intégré avec succès dans le fichier MP4 final !`);
            }
        } catch (e) {
            console.warn(`Avertissement muxing audio:`, e.message);
        }
    }

    setTimeout(() => {
        try { fs.rmSync(tempProfile, { recursive: true, force: true }); } catch (e) {}
    }, 1500);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ SUCCÈS ! Vidéo créée en ${elapsed}s :`);
    console.log(`   👉 ${OUTPUT_FILE}\n`);

    // Libération du verrou et nettoyage automatique des résidus temporaires (scratch)
    setVideoProcessLock(false, 'render');
    cleanupScratch();
}

main().catch(err => {
    setVideoProcessLock(false, 'render');
    console.error('Erreur :', err);
    process.exit(1);
});
