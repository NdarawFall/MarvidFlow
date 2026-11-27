const fs = require('fs');
const path = require('path');

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ballon d'Or 2024 — Classement Officiel (16:9 Broadcast)</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,700;0,800;0,900;1,800;1,900&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
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
            width: 1920px;
            height: 1080px;
            position: relative;
            background: #02040a;
            overflow: hidden;
            aspect-ratio: 16 / 9;
            max-width: 100vw;
            max-height: 100vh;
            box-shadow: 0 40px 100px rgba(0, 0, 0, 0.98);
        }

        canvas {
            width: 100%;
            height: 100%;
            display: block;
        }
    </style>
</head>
<body>
    <div id="stage" data-duration="23.0">
        <canvas id="mainCanvas" width="1920" height="1080"></canvas>
    </div>

    <!-- Pistes Audio : Voix off officielle posée + Musique Beat Sportive -->
    <audio id="audioVoice" src="/01_Assets/Voix_Off/ballon_dor_official_calm.wav" preload="auto"></audio>
    <audio id="audioBgm" src="/01_Assets/Musiques/Hitman.mp3" preload="auto" loop></audio>

<script>
// ==============================================================================
// BROADCAST MOTION DESIGN — CLASSEMENT OFFICIEL BALLON D'OR (16:9 - 1920x1080)
// Moteur Canvas 2D Déterministe • Synchronisation Précise Voix Off
// Aucun bouton incrusté • Aucune barre PowerPoint • TV Broadcast Chyron Packaging
// ==============================================================================
const canvas = document.getElementById('mainCanvas');
const g = canvas.getContext('2d');
const audioVoice = document.getElementById('audioVoice');
const audioBgm = document.getElementById('audioBgm');

const DURATION = 23.0;
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
    inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
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

// -----------------------------------------------------------------------------
// LE CLASSEMENT OFFICIEL DU BALLON D'OR (SOURCE FRANCE FOOTBALL)
// Timings calibrés sur l'audio ballon_dor_official_calm.wav
// -----------------------------------------------------------------------------
const ballonDorTop10 = [
    {
        rank: 10,
        name: "HARRY KANE",
        club: "BAYERN MUNICH",
        country: "ANGLETERRE",
        accolade: "52 BUTS EN 2024 • CO-VAINQUEUR TROPHÉE GERD MÜLLER",
        badge: "SOULIER D'OR EUROPÉEN",
        themeColor: "#dc2626",
        glowColor: "rgba(220, 38, 38, 0.7)",
        playerImgSrc: "/01_Assets/Illustrations/Players/harry-kane.png",
        clubLogoSrc: "/01_Assets/Logos/Football/bayern-munchen.png",
        start: 2.1,
        end: 3.8
    },
    {
        rank: 9,
        name: "TONI KROOS",
        club: "REAL MADRID",
        country: "ALLEMAGNE",
        accolade: "DOUBLE CHAMPION : LIGUE DES CHAMPIONS & LIGA ESPAGNOLE",
        badge: "LE MAESTRO DE MADRID",
        themeColor: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.7)",
        playerImgSrc: "/01_Assets/Illustrations/Players/toni-kroos.png",
        clubLogoSrc: "/01_Assets/Logos/Football/real-madrid.png",
        start: 3.8,
        end: 5.4
    },
    {
        rank: 8,
        name: "LAMINE YAMAL",
        club: "FC BARCELONE",
        country: "ESPAGNE",
        accolade: "CHAMPION DE L'EURO 2024 & VAINQUEUR DU TROPHÉE KOPA",
        badge: "MEILLEUR JEUNE DU MONDE",
        themeColor: "#a855f7",
        glowColor: "rgba(168, 85, 247, 0.75)",
        playerImgSrc: "/01_Assets/Illustrations/Players/lamine-yamal.png",
        clubLogoSrc: "/01_Assets/Logos/Football/barcelona.png",
        start: 5.4,
        end: 7.2
    },
    {
        rank: 7,
        name: "LAUTARO MARTÍNEZ",
        club: "INTER MILAN",
        country: "ARGENTINE",
        accolade: "CHAMPION COPA AMÉRICA (BUTEUR EN FINALE) & SERIE A",
        badge: "CAPITAINE & MEILLEUR BUTEUR",
        themeColor: "#2563eb",
        glowColor: "rgba(37, 99, 235, 0.7)",
        playerImgSrc: "/01_Assets/Illustrations/Players/lautaro-martinez.png",
        clubLogoSrc: "/01_Assets/Logos/Football/inter.png",
        start: 7.2,
        end: 9.1
    },
    {
        rank: 6,
        name: "KYLIAN MBAPPÉ",
        club: "REAL MADRID",
        country: "FRANCE",
        accolade: "52 BUTS EN 2024 • CO-VAINQUEUR TROPHÉE GERD MÜLLER",
        badge: "SOULIER D'OR EUROPÉEN",
        themeColor: "#3b82f6",
        glowColor: "rgba(59, 130, 246, 0.8)",
        playerImgSrc: "/01_Assets/Illustrations/Players/kylian-mbappe.png",
        clubLogoSrc: "/01_Assets/Logos/Football/real-madrid.png",
        start: 9.1,
        end: 11.0
    },
    {
        rank: 5,
        name: "ERLING HAALAND",
        club: "MANCHESTER CITY",
        country: "NORVÈGE",
        accolade: "CHAMPION DE PREMIER LEAGUE & GOLDEN BOOT (27 BUTS)",
        badge: "LE CYBORG DE PREMIER LEAGUE",
        themeColor: "#0284c7",
        glowColor: "rgba(2, 132, 199, 0.8)",
        playerImgSrc: "/01_Assets/Illustrations/Players/erling-haaland.png",
        clubLogoSrc: "/01_Assets/Logos/Football/manchester-city.png",
        start: 11.0,
        end: 13.0
    },
    {
        rank: 4,
        name: "DANI CARVAJAL",
        club: "REAL MADRID",
        country: "ESPAGNE",
        accolade: "CHAMPION D'EUROPE, UCL & LIGA • BUTEUR EN FINALE UCL",
        badge: "LE LATÉRAL LE PLUS TITRÉ",
        themeColor: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.75)",
        playerImgSrc: "/01_Assets/Illustrations/Players/daniel-carvajal.png",
        clubLogoSrc: "/01_Assets/Logos/Football/real-madrid.png",
        start: 13.0,
        end: 14.9
    },
    {
        rank: 3,
        name: "JUDE BELLINGHAM",
        club: "REAL MADRID",
        country: "ANGLETERRE",
        accolade: "23 BUTS • VAINQUEUR DE LA LIGUE DES CHAMPIONS & LIGA",
        badge: "🥉 PODIUM MONDIAL #3",
        themeColor: "#d97706",
        glowColor: "rgba(217, 119, 6, 0.85)",
        playerImgSrc: "/01_Assets/Illustrations/Players/jude-bellingham.png",
        clubLogoSrc: "/01_Assets/Logos/Football/real-madrid.png",
        start: 14.9,
        end: 16.8
    },
    {
        rank: 2,
        name: "VINÍCIUS JÚNIOR",
        club: "REAL MADRID",
        country: "BRÉSIL",
        accolade: "MEILLEUR JOUEUR DE LA LIGUE DES CHAMPIONS 2024",
        badge: "🥈 PODIUM MONDIAL #2",
        themeColor: "#e2e8f0",
        glowColor: "rgba(226, 232, 240, 0.85)",
        playerImgSrc: "/01_Assets/Illustrations/Players/vinicius-junior.png",
        clubLogoSrc: "/01_Assets/Logos/Football/real-madrid.png",
        start: 16.8,
        end: 18.8
    },
    {
        rank: 1,
        name: "RODRI",
        club: "MANCHESTER CITY",
        country: "ESPAGNE",
        accolade: "VAINQUEUR DU BALLON D'OR 2024 & MEILLEUR JOUEUR DE L'EURO",
        badge: "🥇 VAINQUEUR DU BALLON D'OR 2024",
        themeColor: "#fbbf24",
        glowColor: "rgba(251, 191, 36, 0.95)",
        playerImgSrc: "/01_Assets/Illustrations/Players/rodri.png",
        clubLogoSrc: "/01_Assets/Logos/Football/manchester-city.png",
        start: 18.8,
        end: 22.1
    }
];

// Pré-chargement des images
ballonDorTop10.forEach(p => {
    p.playerImg = new Image();
    p.playerImg.src = p.playerImgSrc;
    p.clubLogoImg = new Image();
    p.clubLogoImg.src = p.clubLogoSrc;
});

// -----------------------------------------------------------------------------
// FOND CINÉMATIQUE BROADCAST SPORT (STADIUM LIGHTS & VOLUMETRIC GLOW)
// -----------------------------------------------------------------------------
function drawCinematicBackground(t, activeColor) {
    // 1. Dégradé radial sombre haute profondeur
    const bgGrad = g.createRadialGradient(960, 540, 200, 960, 540, 1300);
    bgGrad.addColorStop(0.0, '#0c1427');
    bgGrad.addColorStop(0.5, '#050812');
    bgGrad.addColorStop(1.0, '#010204');
    g.fillStyle = bgGrad;
    g.fillRect(0, 0, 1920, 1080);

    // 2. Projecteurs volumétriques animés
    g.save();
    g.filter = 'blur(60px)';
    g.globalAlpha = 0.28;

    // Faisceau principal gauche
    const angleL = Math.sin(t * 1.4) * 0.1;
    g.save();
    g.translate(250, -50);
    g.rotate(0.45 + angleL);
    const gradL = g.createLinearGradient(0, 0, 450, 1300);
    gradL.addColorStop(0.0, activeColor);
    gradL.addColorStop(1.0, 'transparent');
    g.fillStyle = gradL;
    g.fillRect(-150, 0, 300, 1500);
    g.restore();

    // Faisceau d'arrière-plan du joueur (droite)
    const angleR = Math.cos(t * 1.4) * 0.1;
    g.save();
    g.translate(1600, -50);
    g.rotate(-0.45 + angleR);
    const gradR = g.createLinearGradient(0, 0, -450, 1300);
    gradR.addColorStop(0.0, activeColor);
    gradR.addColorStop(1.0, 'transparent');
    g.fillStyle = gradR;
    g.fillRect(-150, 0, 300, 1500);
    g.restore();

    g.restore();

    // 3. Halo lumineux dynamique derrière le joueur
    g.save();
    const auraGrad = g.createRadialGradient(1450, 500, 50, 1450, 500, 550);
    auraGrad.addColorStop(0.0, activeColor);
    auraGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.4)');
    auraGrad.addColorStop(1.0, 'transparent');
    g.globalAlpha = 0.55;
    g.fillStyle = auraGrad;
    g.fillRect(800, 0, 1120, 1080);
    g.restore();
}

// -----------------------------------------------------------------------------
// SCÈNE D'INTRODUCTION ÉNERGIQUE (0.0s - 2.1s)
// "Voici le classement officiel du Ballon d'Or."
// -----------------------------------------------------------------------------
function drawIntroScene(t) {
    const p = clamp(t / 2.1, 0, 1);
    const zoom = 1.0 + (1 - ease.out(p)) * 0.12;

    g.save();
    g.translate(960, 540);
    g.scale(zoom, zoom);
    g.translate(-960, -540);

    g.textAlign = 'center';
    g.textBaseline = 'middle';

    // Badge Officiel Cérémonie
    const badgeW = 380;
    const badgeH = 50;
    roundRect(g, 960 - badgeW / 2, 360 - badgeH / 2, badgeW, badgeH, 25);
    g.fillStyle = 'rgba(251, 191, 36, 0.15)';
    g.fill();
    g.strokeStyle = '#fbbf24';
    g.lineWidth = 2;
    g.stroke();

    g.font = '800 20px "Montserrat", sans-serif';
    g.letterSpacing = '3px';
    g.fillStyle = '#fbbf24';
    g.fillText('⚽ FRANCE FOOTBALL • OFFICIEL', 960, 360);

    // Titre Géant "BALLON D'OR"
    g.font = '900 130px "Montserrat", sans-serif';
    g.letterSpacing = '-2px';
    g.fillStyle = '#ffffff';
    g.shadowColor = 'rgba(251, 191, 36, 0.85)';
    g.shadowBlur = 45;
    g.fillText('BALLON D\\'OR', 960, 500);

    // Sous-titre
    g.font = '900 44px "Montserrat", sans-serif';
    g.letterSpacing = '6px';
    g.fillStyle = '#fbbf24';
    g.shadowBlur = 20;
    g.fillText('LE TOP 10 OFFICIEL DU MONDE', 960, 600);

    g.restore();
}

// -----------------------------------------------------------------------------
// SCÈNE BROADCAST DU JOUEUR (ANIMATION TV CHYRON & SOCLE MASQUANT LA COUPE)
// -----------------------------------------------------------------------------
function drawPlayerScene(t, player) {
    const segT = t - player.start;
    const segDur = player.end - player.start;

    // Animation d'entrée : Glissement dynamique depuis la droite avec ressort
    const enterProgress = clamp(segT / 0.32, 0, 1);
    const enterSlideX = (1 - ease.out(enterProgress)) * 260;
    const enterFade = ease.out(enterProgress);

    // =========================================================================
    // 1. JOUEUR HAUTE RÉSOLUTION (À DROITE, NATUREL, AUCUNE DÉFORMATION)
    // =========================================================================
    const playerBaseX = 1420 + enterSlideX;
    const playerBaseY = 160;

    if (player.playerImg && player.playerImg.complete && player.playerImg.naturalWidth > 0) {
        g.save();
        g.globalAlpha = enterFade;

        // Micro-flottement subtil de caméra
        const floatY = Math.sin(t * 3.2) * 7;
        g.translate(playerBaseX, playerBaseY + floatY);

        // Ombre portée profonde
        g.shadowColor = 'rgba(0, 0, 0, 0.95)';
        g.shadowBlur = 40;
        g.shadowOffsetX = -20;
        g.shadowOffsetY = 20;

        const nw = player.playerImg.naturalWidth;
        const nh = player.playerImg.naturalHeight;
        const targetH = 800;
        const targetW = (nw / nh) * targetH;

        g.drawImage(player.playerImg, -targetW / 2, 0, targetW, targetH);
        g.restore();
    }

    // =========================================================================
    // 2. CARTE SOCLE BROACAST QUI CACHE COMPLÈTEMENT LE BAS COUPÉ DU JOUEUR
    // =========================================================================
    const cardX = 1100;
    const cardY = 820;
    const cardW = 720;
    const cardH = 180;

    g.save();
    g.globalAlpha = enterFade;

    // Fond glassmorphism TV élégant
    roundRect(g, cardX, cardY, cardW, cardH, 22);
    const cardGrad = g.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    cardGrad.addColorStop(0.0, 'rgba(12, 18, 34, 0.96)');
    cardGrad.addColorStop(1.0, 'rgba(4, 7, 15, 0.98)');
    g.fillStyle = cardGrad;
    g.fill();

    // Bordure néon avec halo aux couleurs du club
    g.strokeStyle = player.themeColor;
    g.lineWidth = 2.5;
    g.shadowColor = player.glowColor;
    g.shadowBlur = 18;
    g.stroke();
    g.shadowBlur = 0;

    // Logo officiel du club dans la carte
    if (player.clubLogoImg && player.clubLogoImg.complete && player.clubLogoImg.naturalWidth > 0) {
        const logoSize = 100;
        const logoX = cardX + 35;
        const logoY = cardY + (cardH - logoSize) / 2;

        // Cercle décoratif
        g.beginPath();
        g.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 10, 0, Math.PI * 2);
        g.fillStyle = 'rgba(255, 255, 255, 0.06)';
        g.fill();
        g.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        g.lineWidth = 1.2;
        g.stroke();

        g.drawImage(player.clubLogoImg, logoX, logoY, logoSize, logoSize);
    }

    // Textes dans la carte de socle
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';

    g.font = '900 40px "Montserrat", sans-serif';
    g.fillStyle = '#ffffff';
    g.fillText(player.name, cardX + 175, cardY + 72);

    g.font = '700 22px "Inter", sans-serif';
    g.letterSpacing = '1px';
    g.fillStyle = player.themeColor;
    g.fillText(\`\${player.club} • \${player.country}\`, cardX + 175, cardY + 115);

    g.font = '600 18px "Inter", sans-serif';
    g.fillStyle = 'rgba(255, 255, 255, 0.7)';
    g.fillText('CÉRÉMONIE BALLON D\\'OR • FRANCE FOOTBALL', cardX + 175, cardY + 152);

    g.restore();

    // =========================================================================
    // 3. SECTION GAUCHE : IDENTITÉ VISUELLE TV BROADCAST (CHYRON D'INFOS)
    // =========================================================================
    g.save();
    g.globalAlpha = enterFade;

    const leftX = 140;

    // Watermark Rank Chiffre Géant translucide
    g.font = '900 360px "Montserrat", sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillStyle = 'rgba(255, 255, 255, 0.035)';
    g.fillText(\`#\${player.rank}\`, leftX - 20, 160);

    // Badge Catégorie / Statut
    const badgeW = 380;
    const badgeH = 50;
    roundRect(g, leftX, 280, badgeW, badgeH, 25);
    g.fillStyle = (player.rank === 1) ? '#fbbf24' : (player.rank <= 3 ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)');
    g.shadowColor = (player.rank === 1) ? 'rgba(251, 191, 36, 0.85)' : 'transparent';
    g.shadowBlur = (player.rank === 1) ? 25 : 0;
    g.fill();
    g.shadowBlur = 0;

    g.strokeStyle = player.themeColor;
    g.lineWidth = 2;
    if (player.rank > 1) g.stroke();

    g.font = '900 20px "Montserrat", sans-serif';
    g.letterSpacing = '2px';
    g.fillStyle = (player.rank <= 3) ? '#000000' : player.themeColor;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(player.badge, leftX + badgeW / 2, 280 + badgeH / 2);

    // Rang Numéro Géant et Nom
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.font = '900 120px "Montserrat", sans-serif';
    g.letterSpacing = '-4px';
    g.fillStyle = player.themeColor;
    g.shadowColor = player.glowColor;
    g.shadowBlur = 32;
    g.fillText(\`#\${player.rank}\`, leftX, 470);
    g.shadowBlur = 0;

    g.font = '900 78px "Montserrat", sans-serif';
    g.letterSpacing = '-1px';
    g.fillStyle = '#ffffff';
    g.fillText(player.name, leftX + 240, 470);

    // Ligne Décorative Néon
    g.strokeStyle = player.themeColor;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(leftX, 515);
    g.lineTo(leftX + 780, 515);
    g.stroke();

    // Grande Description / Accolade Officielle
    g.font = '800 28px "Inter", sans-serif';
    g.letterSpacing = '0.5px';
    g.fillStyle = '#ffffff';
    g.fillText(player.accolade, leftX, 580);

    // Dossard et statut club
    g.font = '600 24px "Inter", sans-serif';
    g.letterSpacing = '1px';
    g.fillStyle = player.themeColor;
    g.fillText(\`\${player.club} • SAISON 2023 - 2024\`, leftX, 630);

    g.restore();
}

// -----------------------------------------------------------------------------
// SCÈNE DE FIN / OUTRO CALL TO ACTION (22.1s - 23.0s)
// -----------------------------------------------------------------------------
function drawOutroScene(t) {
    const fade = clamp((t - 22.1) / 0.9, 0, 1);
    g.save();
    g.fillStyle = \`rgba(0, 0, 0, \${fade * 0.95})\`;
    g.fillRect(0, 0, 1920, 1080);

    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '900 64px "Montserrat", sans-serif';
    g.fillStyle = '#fbbf24';
    g.fillText('RODRI MÉRITE-T-IL SON BALLON D\\'OR ?', 960, 500);

    g.font = '800 32px "Inter", sans-serif';
    g.fillStyle = '#ffffff';
    g.fillText('DONNE TON AVIS EN COMMENTAIRE ! 💬👇', 960, 590);
    g.restore();
}

// -----------------------------------------------------------------------------
// MOTEUR PRINCIPAL DE RENDU FRAME PAR FRAME
// -----------------------------------------------------------------------------
function renderFrame(t) {
    g.clearRect(0, 0, 1920, 1080);

    let activeColor = '#3b82f6';
    const activePlayer = ballonDorTop10.find(p => t >= p.start && t < p.end);
    if (activePlayer) {
        activeColor = activePlayer.themeColor;
    }

    // 1. Fond cinématographique
    drawCinematicBackground(t, activeColor);

    // 2. Rendu de la scène appropriée
    if (t < 2.1) {
        drawIntroScene(t);
    } else if (t >= 22.1) {
        drawOutroScene(t);
    } else if (activePlayer) {
        drawPlayerScene(t, activePlayer);
    }
}

// =============================================================================
// INTERFACE VIBEEDITOR STUDIO (CONTRAT DE LECTURE TIMELINE DÉTERMINISTE 23s)
// =============================================================================
window.renderAt = function(timeInSeconds) {
    playbackTime = clamp(timeInSeconds, 0, DURATION);
    renderFrame(playbackTime);
};

window.timelineSeek = function(timeInSeconds) {
    window.renderAt(timeInSeconds);
    if (audioVoice) {
        audioVoice.currentTime = Math.min(playbackTime, 22.1);
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
        if (audioVoice && audioVoice.paused && timeInSeconds < 22.1) {
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

    renderFrame(playbackTime);

    if (isPlaying) {
        rafId = requestAnimationFrame(loop);
    }
}

function play() {
    if (isPlaying) return;
    if (playbackTime >= DURATION) playbackTime = 0;
    isPlaying = true;
    lastTimestamp = 0;

    if (audioVoice && playbackTime < 22.1) {
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

// Premier rendu initial
window.renderAt(0);
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '../04_Videos/top10_football_15s.html'), html, 'utf-8');
console.log("✅ 04_Videos/top10_football_15s.html (Official Ballon d'Or 16:9 Broadcast) generated successfully!");
