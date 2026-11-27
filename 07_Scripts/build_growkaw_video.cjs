const fs = require('fs');
const path = require('path');

const bgB64 = fs.readFileSync(path.join(__dirname, '../01_Assets/Images/growkaw_bg.b64'), 'utf-8').trim();

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Growkaw Motivation — 20s Vertical Short (9:16)</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,700;0,800;0,900;1,800;1,900&family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            user-select: none;
        }
        html, body {
            width: 100%;
            height: 100%;
            background: #000000;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Montserrat', 'Inter', -apple-system, sans-serif;
            -webkit-font-smoothing: antialiased;
        }

        #stage {
            width: 1080px;
            height: 1920px;
            position: relative;
            background: #000000;
            overflow: hidden;
            aspect-ratio: 9 / 16;
            max-height: 100vh;
            max-width: calc(100vh * (9 / 16));
            box-shadow: 0 30px 80px rgba(0, 0, 0, 0.95);
        }

        canvas {
            width: 100%;
            height: 100%;
            display: block;
        }
    </style>
</head>
<body>
    <div id="stage" data-duration="20.0">
        <canvas id="mainCanvas" width="1080" height="1920"></canvas>
    </div>

    <!-- Voix off féminine Edge TTS (17.8s) & Musique d'ambiance -->
    <audio id="audioVoice" src="../01_Assets/Voix_Off/growkaw_motivation_solange_20s.wav" preload="auto"></audio>
    <audio id="audioBgm" src="../01_Assets/Musiques/Wallpaper.mp3" preload="auto" loop></audio>

<script>
// ==============================================================================
// VIBEEDITOR 1.0 — GROWKAW MOTIVATION SHORT (20s / 9:16 VERTICAL 60 FPS)
// Voix Off Féminine & Typographie Cinétique Mot-à-Mot
// ==============================================================================
const canvas = document.getElementById('mainCanvas');
const g = canvas.getContext('2d');
const audioVoice = document.getElementById('audioVoice');
const audioBgm = document.getElementById('audioBgm');

const DURATION = 20.0;
let isPlaying = false;
let playbackTime = 0;
let lastTimestamp = 0;
let rafId = null;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

const ease = {
    linear: t => t,
    out: t => 1 - Math.pow(1 - t, 3),
    snappy: t => 1 - Math.pow(1 - t, 4),
    inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    spring: t => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
};

function roundRect(ctx, x, y, w, h, r) {
    if (w <= 0 || h <= 0) return;
    r = Math.min(Math.max(0, r), Math.min(w / 2, h / 2));
    if (r <= 0) {
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        return;
    }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// Background Image cinématique haute résolution
const bgImg = new Image();
bgImg.src = 'data:image/jpeg;base64,${bgB64}';

// -----------------------------------------------------------------------------
// SEGMENTS CINÉTIQUES MOT-À-MOT (TIMINGS CALIBRÉS SUR LA VOIX OFF SOLANGE)
// DÉCOUPAGE RYTHMIQUE COURT & VIRAL (1.5s - 2.5s) POUR FORMAT REELS / SHORTS
// -----------------------------------------------------------------------------
const phraseSegments = [
    {
        start: 0.1,
        end: 2.8,
        label: "PHASE 01 : LE RÉVEIL",
        words: [
            { text: "CHAQUE", start: 0.15, end: 0.65, highlight: false, line: 0 },
            { text: "MATIN,", start: 0.65, end: 1.35, highlight: true, line: 0 },
            { text: "TU", start: 1.35, end: 1.75, highlight: false, line: 1 },
            { text: "AS", start: 1.75, end: 2.05, highlight: false, line: 1 },
            { text: "DEUX", start: 2.05, end: 2.45, highlight: true, line: 1 },
            { text: "CHOIX.", start: 2.45, end: 2.8, highlight: true, line: 1 }
        ]
    },
    {
        start: 2.85,
        end: 6.2,
        label: "PHASE 02 : LA DUALITÉ",
        words: [
            { text: "CONTINUER", start: 3.0, end: 3.7, highlight: false, line: 0 },
            { text: "DE", start: 3.7, end: 4.0, highlight: false, line: 0 },
            { text: "RÊVER,", start: 4.0, end: 4.6, highlight: false, line: 0 },
            { text: "OU", start: 4.7, end: 4.95, highlight: false, line: 1 },
            { text: "BÂTIR", start: 4.95, end: 5.5, highlight: true, line: 1 },
            { text: "TA", start: 5.5, end: 5.75, highlight: false, line: 1 },
            { text: "VIE.", start: 5.75, end: 6.2, highlight: true, line: 1 }
        ]
    },
    {
        start: 6.25,
        end: 9.8,
        label: "PHASE 03 : LA LOI DE L'EFFORT",
        words: [
            { text: "LA", start: 6.35, end: 6.6, highlight: false, line: 0 },
            { text: "DISCIPLINE", start: 6.6, end: 7.4, highlight: true, line: 0 },
            { text: "SILENCIEUSE", start: 7.4, end: 8.2, highlight: true, line: 1 },
            { text: "BAT", start: 8.2, end: 8.65, highlight: false, line: 2 },
            { text: "TOUJOURS", start: 8.65, end: 9.25, highlight: false, line: 2 },
            { text: "LE", start: 9.25, end: 9.45, highlight: false, line: 2 },
            { text: "TALENT.", start: 9.45, end: 9.8, highlight: true, line: 2 }
        ]
    },
    {
        start: 9.85,
        end: 12.1,
        label: "PHASE 04A : LES EXCUSES",
        words: [
            { text: "PENDANT", start: 10.0, end: 10.45, highlight: false, line: 0 },
            { text: "QU'ILS", start: 10.45, end: 10.85, highlight: false, line: 0 },
            { text: "CHERCHENT", start: 10.85, end: 11.45, highlight: false, line: 1 },
            { text: "DES", start: 11.45, end: 11.7, highlight: false, line: 1 },
            { text: "EXCUSES...", start: 11.7, end: 12.1, highlight: false, line: 1 }
        ]
    },
    {
        start: 12.15,
        end: 13.7,
        label: "PHASE 04B : L'ACTION SILENCIEUSE",
        words: [
            { text: "CONSTRUIS", start: 12.35, end: 13.0, highlight: true, line: 0 },
            { text: "DANS", start: 13.0, end: 13.25, highlight: false, line: 1 },
            { text: "L'OMBRE.", start: 13.25, end: 13.7, highlight: true, line: 1 }
        ]
    },
    {
        start: 13.75,
        end: 15.6,
        label: "PHASE 05A : LA VÉRITÉ",
        words: [
            { text: "RIEN", start: 13.85, end: 14.3, highlight: false, line: 0 },
            { text: "N'ARRIVE", start: 14.3, end: 14.9, highlight: false, line: 0 },
            { text: "PAR", start: 14.9, end: 15.2, highlight: false, line: 1 },
            { text: "HASARD.", start: 15.2, end: 15.6, highlight: true, line: 1 }
        ]
    },
    {
        start: 15.65,
        end: 17.7,
        label: "PHASE 05B : L'APPEL IMMÉDIAT",
        words: [
            { text: "FAIS", start: 15.8, end: 16.15, highlight: false, line: 0 },
            { text: "LE", start: 16.15, end: 16.35, highlight: false, line: 0 },
            { text: "PREMIER", start: 16.35, end: 16.85, highlight: true, line: 0 },
            { text: "PAS", start: 16.85, end: 17.15, highlight: false, line: 0 },
            { text: "MAINTENANT.", start: 17.15, end: 17.7, highlight: true, line: 1 }
        ]
    },
    {
        start: 17.75,
        end: 20.0,
        label: "OUTRO GROWKAW",
        words: [
            { text: "GROWKAW", start: 17.85, end: 18.8, highlight: true, line: 0 },
            { text: "DISCIPLINE", start: 18.8, end: 19.3, highlight: false, line: 1 },
            { text: "IS", start: 19.3, end: 19.5, highlight: false, line: 1 },
            { text: "FREEDOM.", start: 19.5, end: 20.0, highlight: true, line: 1 }
        ]
    }
];

// -----------------------------------------------------------------------------
// RENDU DE LA SCÈNE VERTICALE (1080 x 1920)
// -----------------------------------------------------------------------------
function drawGrowkawScene(t) {
    g.clearRect(0, 0, 1080, 1920);

    // 1. Fond noir de base
    g.fillStyle = '#000000';
    g.fillRect(0, 0, 1080, 1920);

    // 2. Image B-Roll avec travelling lent (Ken Burns effect) & micro-flottement
    if (bgImg.complete && bgImg.naturalWidth > 0) {
        g.save();
        const zoom = 1.05 + (t / DURATION) * 0.08;
        const panY = lerp(0, -50, t / DURATION);
        g.translate(540, 960 + panY);
        g.scale(zoom, zoom);
        g.drawImage(bgImg, -540, -960, 1080, 1920);
        g.restore();
    }

    // 3. Masque de gradation sombre cinématographique (Vignette & Contrast overlay)
    const darkGrad = g.createLinearGradient(0, 0, 0, 1920);
    darkGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.75)');
    darkGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.45)');
    darkGrad.addColorStop(0.70, 'rgba(0, 0, 0, 0.65)');
    darkGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.88)');
    g.fillStyle = darkGrad;
    g.fillRect(0, 0, 1080, 1920);

    // 4. Header minimaliste viral Growkaw
    const headerY = 190;
    g.save();
    g.textAlign = 'center';
    g.textBaseline = 'middle';

    // Badge capsule "DAILY MINDSET"
    const badgeW = 210;
    const badgeH = 46;
    roundRect(g, 540 - badgeW / 2, headerY - badgeH / 2, badgeW, badgeH, 23);
    g.fillStyle = 'rgba(255, 255, 255, 0.08)';
    g.fill();
    g.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    g.lineWidth = 1.2;
    g.stroke();

    g.font = '700 14px "Inter", sans-serif';
    g.letterSpacing = '2px';
    g.fillStyle = '#f59e0b'; // Ambre doré
    g.fillText('✦ DAILY MINDSET', 540, headerY);

    // Logo / Handle @GROWKAW
    g.font = '800 24px "Montserrat", sans-serif';
    g.letterSpacing = '4px';
    g.fillStyle = 'rgba(255, 255, 255, 0.9)';
    g.fillText('@GROWKAW', 540, headerY + 54);
    g.restore();

    // 5. Barre de progression supérieure dynamique
    const progressW = (t / DURATION) * 920;
    g.fillStyle = 'rgba(255, 255, 255, 0.15)';
    roundRect(g, 80, 80, 920, 6, 3);
    g.fill();
    g.fillStyle = '#f59e0b';
    roundRect(g, 80, 80, progressW, 6, 3);
    g.fill();

    // 6. TYPOGRAPHIE CINÉTIQUE STYLE GROWKAW MOT-À-MOT
    // Les mots s'allument, grandissent avec pop et restent lisibles
    const activeSegment = phraseSegments.find(s => t >= s.start && t < s.end) || phraseSegments[phraseSegments.length - 1];

    if (activeSegment) {
        const centerY = 960;
        const words = activeSegment.words;

        // Pré-mesure pour centrage automatique et découpe multi-lignes
        g.font = '900 60px "Montserrat", sans-serif';
        g.letterSpacing = '-0.5px';
        g.textAlign = 'center';
        g.textBaseline = 'middle';

        // Regroupement par ligne assignée
        const linesMap = {};
        for (const w of words) {
            const l = w.line || 0;
            if (!linesMap[l]) linesMap[l] = [];
            linesMap[l].push(w);
        }
        const lines = Object.keys(linesMap).sort((a, b) => Number(a) - Number(b)).map(k => linesMap[k]);

        const lineSpacing = 105;
        const startY = centerY - ((lines.length - 1) * lineSpacing) / 2;

        for (let l = 0; l < lines.length; l++) {
            const currentLine = lines[l];
            const currentLineY = startY + l * lineSpacing;

            // Mesure largeur totale de la ligne
            let totalLineWidth = 0;
            const wordWidths = [];
            const wordGaps = 22;

            for (let w = 0; w < currentLine.length; w++) {
                const ww = g.measureText(currentLine[w].text).width;
                wordWidths.push(ww);
                totalLineWidth += ww + (w > 0 ? wordGaps : 0);
            }

            // Clamping automatique pour que le texte ne dépasse JAMAIS les bords (max 880px)
            let lineScale = 1.0;
            const maxAllowedWidth = 880;
            if (totalLineWidth > maxAllowedWidth) {
                lineScale = maxAllowedWidth / totalLineWidth;
            }

            g.save();
            g.translate(540, currentLineY);
            if (lineScale < 1.0) {
                g.scale(lineScale, lineScale);
            }
            g.translate(-540, -currentLineY);

            let currentX = 540 - totalLineWidth / 2;

            for (let w = 0; w < currentLine.length; w++) {
                const word = currentLine[w];
                const ww = wordWidths[w];
                const wordCenterX = currentX + ww / 2;

                const isSpoken = t >= word.start;
                const isCurrentlyActive = t >= word.start && t <= word.end + 0.35;

                // Animation Pop élastique à l'apparition
                let popScale = 1.0;
                let wordAlpha = 0.28; // Translucide avant prononciation

                if (isCurrentlyActive) {
                    const wordTime = t - word.start;
                    popScale = 1.0 + Math.sin(clamp(wordTime / 0.35, 0, 1) * Math.PI) * 0.16;
                    wordAlpha = 1.0;
                } else if (isSpoken) {
                    popScale = 1.0;
                    wordAlpha = 0.95;
                }

                g.save();
                g.translate(wordCenterX, currentLineY);
                g.scale(popScale, popScale);
                g.globalAlpha = wordAlpha;

                // Boîte de surbrillance néon pour les mots clés actifs
                if (isCurrentlyActive && word.highlight) {
                    const padX = 20;
                    const padY = 12;
                    roundRect(g, -ww / 2 - padX, -40 - padY / 2, ww + padX * 2, 80 + padY, 16);
                    g.fillStyle = 'rgba(245, 158, 11, 0.28)';
                    g.fill();
                    g.strokeStyle = '#f59e0b';
                    g.lineWidth = 2.5;
                    g.stroke();
                }

                // Ombre portée profonde
                g.shadowColor = isCurrentlyActive ? 'rgba(245, 158, 11, 0.75)' : 'rgba(0, 0, 0, 0.9)';
                g.shadowBlur = isCurrentlyActive ? 32 : 16;
                g.shadowOffsetY = 6;

                // Couleur du texte : Jaune ambre doré si highlight & parlé, blanc éclatant sinon
                if (word.highlight && isSpoken) {
                    g.fillStyle = '#f59e0b';
                } else {
                    g.fillStyle = '#ffffff';
                }

                g.fillText(word.text, 0, 0);
                g.restore();

                currentX += ww + wordGaps;
            }

            g.restore();
        }
    }

    // 7. Footer Motivation (@Growkaw • Save this reel • Audio waves)
    const footerY = 1720;
    g.save();
    g.textAlign = 'center';
    g.textBaseline = 'middle';

    // Icône audio et égaliseur actif de la voix off
    const isVoiceSpeaking = t >= 0.1 && t <= 17.8;
    const waveY = footerY - 50;

    for (let i = -3; i <= 3; i++) {
        const bx = 540 + i * 16;
        let barH = 12;
        if (isVoiceSpeaking) {
            barH = 8 + Math.abs(Math.sin(t * 18 + i * 1.2)) * 26;
        }
        roundRect(g, bx - 3, waveY - barH / 2, 6, barH, 3);
        g.fillStyle = isVoiceSpeaking ? '#f59e0b' : 'rgba(255, 255, 255, 0.35)';
        g.shadowColor = isVoiceSpeaking ? 'rgba(245, 158, 11, 0.8)' : 'transparent';
        g.shadowBlur = 10;
        g.fill();
    }

    // Tagline footer
    g.font = '600 18px "Inter", sans-serif';
    g.letterSpacing = '1px';
    g.fillStyle = 'rgba(255, 255, 255, 0.65)';
    g.fillText('ENREGISTRE CE REEL POUR NE JAMAIS OUBLIER', 540, footerY);

    g.font = '800 20px "Montserrat", sans-serif';
    g.letterSpacing = '3px';
    g.fillStyle = '#ffffff';
    g.fillText('DISCIPLINE > MOTIVATION', 540, footerY + 38);
    g.restore();

    // 8. Fondu de fermeture (Outro fade-out sur les 2 dernières secondes)
    if (t >= 18.0) {
        const fadeOut = (t - 18.0) / 2.0;
        g.fillStyle = \`rgba(0, 0, 0, \${fadeOut})\`;
        g.fillRect(0, 0, 1080, 1920);
    }
}

// =============================================================================
// INTERFACE VIBEEDITOR STUDIO (CONTRAT DE LECTURE TIMELINE DÉTERMINISTE 20s)
// =============================================================================
window.renderAt = function(timeInSeconds) {
    playbackTime = clamp(timeInSeconds, 0, DURATION);
    drawGrowkawScene(playbackTime);
};

window.timelineSeek = function(timeInSeconds) {
    window.renderAt(timeInSeconds);
    if (audioVoice) {
        audioVoice.currentTime = Math.min(playbackTime, 17.8);
    }
    if (audioBgm) {
        audioBgm.currentTime = playbackTime % (audioBgm.duration || 60);
    }
};

window.syncAudioTimeline = function(timeInSeconds, playing) {
    window.renderAt(timeInSeconds);
    if (playing) {
        if (audioVoice && Math.abs(audioVoice.currentTime - timeInSeconds) > 0.15) {
            audioVoice.currentTime = timeInSeconds;
        }
        if (audioVoice && audioVoice.paused && timeInSeconds < 17.8) {
            audioVoice.play().catch(() => {});
        }
        if (audioBgm && audioBgm.paused) {
            audioBgm.play().catch(() => {});
        }
    } else {
        if (audioVoice && !audioVoice.paused) audioVoice.pause();
        if (audioBgm && !audioBgm.paused) audioBgm.pause();
    }
};

function loop(timestamp) {
    if (!isPlaying) return;
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    playbackTime += delta;
    if (playbackTime > DURATION) {
        playbackTime = DURATION;
        pause();
    }

    drawGrowkawScene(playbackTime);

    if (isPlaying) {
        rafId = requestAnimationFrame(loop);
    }
}

function play() {
    if (isPlaying) return;
    if (playbackTime >= DURATION) playbackTime = 0;
    isPlaying = true;
    lastTimestamp = 0;

    if (audioVoice && playbackTime < 17.8) {
        audioVoice.currentTime = playbackTime;
        audioVoice.play().catch(() => {});
    }
    if (audioBgm) {
        audioBgm.currentTime = playbackTime % (audioBgm.duration || 60);
        audioBgm.play().catch(() => {});
    }

    rafId = requestAnimationFrame(loop);
}

function pause() {
    isPlaying = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (audioVoice) audioVoice.pause();
    if (audioBgm) audioBgm.pause();
}

window.play = play;
window.pause = pause;
window.seek = function(t) { window.renderAt(t); };

window.addEventListener('DOMContentLoaded', () => {
    window.renderAt(0);
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        isPlaying ? pause() : play();
    }
});

// Initialisation au chargement de l'image de fond
bgImg.onload = function() {
    window.renderAt(0);
};
if (bgImg.complete) {
    window.renderAt(0);
}
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '../04_Videos/growkaw_motivation_20s.html'), html, 'utf-8');
console.log('✅ 04_Videos/growkaw_motivation_20s.html generated successfully!');
