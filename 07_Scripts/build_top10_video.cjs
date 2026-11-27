const fs = require('fs');
const path = require('path');

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Top 10 Football 2024/2025 — 15s Vertical Short (9:16)</title>
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
    <div id="stage" data-duration="15.0">
        <canvas id="mainCanvas" width="1080" height="1920"></canvas>
    </div>

    <!-- Pistes Audio : Voix off + Musique Beat Sport Kevin MacLeod (Hitman) -->
    <audio id="audioVoice" src="/01_Assets/Voix_Off/top10_football_full_14s.wav" preload="auto"></audio>
    <audio id="audioBgm" src="/01_Assets/Musiques/Hitman.mp3" preload="auto" loop></audio>

<script>
// ==============================================================================
// VIBEEDITOR 1.0 — TOP 10 FOOTBALL MONDIAL (15s / 9:16 VERTICAL 60 FPS)
// Moteur Canvas 2D Déterministe • Synchronisation Images Joueurs & Clubs
// ==============================================================================
const canvas = document.getElementById('mainCanvas');
const g = canvas.getContext('2d');
const audioVoice = document.getElementById('audioVoice');
const audioBgm = document.getElementById('audioBgm');

const DURATION = 15.0;
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

// -----------------------------------------------------------------------------
// CATALOGUE DES JOUEURS & CLUBS DU TOP 10 (IMAGES DÉTOURÉES & LOGOS OFFICIELS)
// -----------------------------------------------------------------------------
const top10Data = [
    {
        rank: 10,
        name: "NEYMAR JR",
        fullName: "Neymar da Silva Santos Júnior",
        country: "Brésil",
        flag: "🇧🇷",
        club: "Al-Hilal",
        stat: "79 BUTS EN SÉLECTION • GÉNIE DU DRIBBLE",
        badge: "MAGICIEN DU JEU",
        color: "#2563eb",
        colorGlow: "rgba(37, 99, 235, 0.6)",
        playerImgSrc: "/01_Assets/Illustrations/Players/neymar.png",
        clubLogoSrc: "/01_Assets/Logos/Football/al-hilal.png",
        start: 1.2,
        end: 2.5
    },
    {
        rank: 9,
        name: "C. RONALDO",
        fullName: "Cristiano Ronaldo dos Santos Aveiro",
        country: "Portugal",
        flag: "🇵🇹",
        club: "Al-Nassr",
        stat: "900+ BUTS EN CARRIÈRE • LÉGENDE VIVANTE",
        badge: "RECORD ABSOLU",
        color: "#f59e0b",
        colorGlow: "rgba(245, 158, 11, 0.6)",
        playerImgSrc: "/01_Assets/Illustrations/Players/cristiano-ronaldo.png",
        clubLogoSrc: "/01_Assets/Logos/Football/al-nassr.png",
        start: 2.5,
        end: 3.8
    },
    {
        rank: 8,
        name: "LIONEL MESSI",
        fullName: "Lionel Andrés Messi Cuccittini",
        country: "Argentine",
        flag: "🇦🇷",
        club: "Inter Miami CF",
        stat: "8x BALLON D'OR • 44 TROPHÉES MAJEURS",
        badge: "GOAT ÉTERNEL",
        color: "#ec4899",
        colorGlow: "rgba(236, 72, 153, 0.6)",
        playerImgSrc: "/01_Assets/Illustrations/Players/lionel-messi.png",
        clubLogoSrc: "/01_Assets/Logos/Football/inter-miami-cf.png",
        start: 3.8,
        end: 5.0
    },
    {
        rank: 7,
        name: "MOHAMED SALAH",
        fullName: "Mohamed Salah Hamed Mahrous Ghaly",
        country: "Égypte",
        flag: "🇪🇬",
        club: "Liverpool FC",
        stat: "211 BUTS POUR LIVERPOOL • ROI DE LA PREMIER LEAGUE",
        badge: "THE EGYPTIAN KING",
        color: "#ef4444",
        colorGlow: "rgba(239, 68, 68, 0.6)",
        playerImgSrc: "/01_Assets/Illustrations/Players/mohamed-salah.png",
        clubLogoSrc: "/01_Assets/Logos/Football/liverpool.png",
        start: 5.0,
        end: 6.2
    },
    {
        rank: 6,
        name: "K. DE BRUYNE",
        fullName: "Kevin De Bruyne",
        country: "Belgique",
        flag: "🇧🇪",
        club: "Manchester City",
        stat: "112 PASSES DÉCISIVES EN PREMIER LEAGUE",
        badge: "MAESTRO DE LA VISION",
        color: "#38bdf8",
        colorGlow: "rgba(56, 189, 248, 0.6)",
        playerImgSrc: "/01_Assets/Illustrations/Players/kevin-de-bruyne.png",
        clubLogoSrc: "/01_Assets/Logos/Football/manchester-city.png",
        start: 6.2,
        end: 7.5
    },
    {
        rank: 5,
        name: "HARRY KANE",
        fullName: "Harry Edward Kane",
        country: "Angleterre",
        flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
        club: "Bayern Munich",
        stat: "44 BUTS EN 2024 • SOULIER D'OR EUROPÉEN",
        badge: "BUTEUR D'ÉLITE",
        color: "#dc2626",
        colorGlow: "rgba(220, 38, 38, 0.6)",
        playerImgSrc: "/01_Assets/Illustrations/Players/harry-kane.png",
        clubLogoSrc: "/01_Assets/Logos/Football/bayern-munchen.png",
        start: 7.5,
        end: 8.8
    },
    {
        rank: 4,
        name: "J. BELLINGHAM",
        fullName: "Jude Victor William Bellingham",
        country: "Angleterre",
        flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
        club: "Real Madrid",
        stat: "23 BUTS • CHAMPION D'ESPAGNE & D'EUROPE",
        badge: "GOLDEN BOY SUPRÊME",
        color: "#f59e0b",
        colorGlow: "rgba(245, 158, 11, 0.6)",
        playerImgSrc: "/01_Assets/Illustrations/Players/jude-bellingham.png",
        clubLogoSrc: "/01_Assets/Logos/Football/real-madrid.png",
        start: 8.8,
        end: 10.2
    },
    {
        rank: 3,
        name: "ERLING HAALAND",
        fullName: "Erling Braut Haaland",
        country: "Norvège",
        flag: "🇳🇴",
        club: "Manchester City",
        stat: "90 BUTS EN 2 SAISONS • MACHINE À MARQUER",
        badge: "🥉 PODIUM MONDIAL #3",
        color: "#0284c7",
        colorGlow: "rgba(2, 132, 199, 0.7)",
        playerImgSrc: "/01_Assets/Illustrations/Players/erling-haaland.png",
        clubLogoSrc: "/01_Assets/Logos/Football/manchester-city.png",
        start: 10.2,
        end: 11.8
    },
    {
        rank: 2,
        name: "KYLIAN MBAPPÉ",
        fullName: "Kylian Mbappé Lottin",
        country: "France",
        flag: "🇫🇷",
        club: "Real Madrid",
        stat: "44 BUTS EN 2024 • FLASH 38 KM/H CHRONOMÉTRÉ",
        badge: "🥈 PODIUM MONDIAL #2",
        color: "#3b82f6",
        colorGlow: "rgba(59, 130, 246, 0.75)",
        playerImgSrc: "/01_Assets/Illustrations/Players/kylian-mbappe.png",
        clubLogoSrc: "/01_Assets/Logos/Football/real-madrid.png",
        start: 11.8,
        end: 13.4
    },
    {
        rank: 1,
        name: "VINÍCIUS JÚNIOR",
        fullName: "Vinícius José Paixão de Oliveira Júnior",
        country: "Brésil",
        flag: "🇧🇷",
        club: "Real Madrid",
        stat: "CHAMPION DE LA LIGUE DES CHAMPIONS • N°1 DU MONDE",
        badge: "🥇 MEILLEUR JOUEUR DU MONDE",
        color: "#fbbf24",
        colorGlow: "rgba(251, 191, 36, 0.9)",
        playerImgSrc: "/01_Assets/Illustrations/Players/vinicius-junior.png",
        clubLogoSrc: "/01_Assets/Logos/Football/real-madrid.png",
        start: 13.4,
        end: 14.8
    }
];

// Pré-chargement des images en mémoire
top10Data.forEach(item => {
    item.playerImg = new Image();
    item.playerImg.src = item.playerImgSrc;
    item.clubLogoImg = new Image();
    item.clubLogoImg.src = item.clubLogoSrc;
});

// -----------------------------------------------------------------------------
// DESSIN DU FOND STADIUM ÉNERGÉTIQUE (DARK SPORTS BROADCAST)
// -----------------------------------------------------------------------------
function drawStadiumBackground(t, activeColor) {
    // 1. Fond noir profond dégradé
    const bgGrad = g.createRadialGradient(540, 960, 200, 540, 960, 1100);
    bgGrad.addColorStop(0.0, '#0c1220');
    bgGrad.addColorStop(0.6, '#060911');
    bgGrad.addColorStop(1.0, '#020306');
    g.fillStyle = bgGrad;
    g.fillRect(0, 0, 1080, 1920);

    // 2. Projecteurs de stade dynamiques animés
    g.save();
    g.globalAlpha = 0.35;
    g.filter = 'blur(60px)';

    // Faisceau gauche
    const angleLeft = Math.sin(t * 1.5) * 0.15;
    g.save();
    g.translate(150, 0);
    g.rotate(0.35 + angleLeft);
    const gradBeamL = g.createLinearGradient(0, 0, 400, 1600);
    gradBeamL.addColorStop(0.0, activeColor || 'rgba(59, 130, 246, 0.7)');
    gradBeamL.addColorStop(1.0, 'transparent');
    g.fillStyle = gradBeamL;
    g.fillRect(-100, 0, 200, 1800);
    g.restore();

    // Faisceau droit
    const angleRight = Math.cos(t * 1.5) * 0.15;
    g.save();
    g.translate(930, 0);
    g.rotate(-0.35 + angleRight);
    const gradBeamR = g.createLinearGradient(0, 0, -400, 1600);
    gradBeamR.addColorStop(0.0, activeColor || 'rgba(245, 158, 11, 0.7)');
    gradBeamR.addColorStop(1.0, 'transparent');
    g.fillStyle = gradBeamR;
    g.fillRect(-100, 0, 200, 1800);
    g.restore();

    g.restore();

    // 3. Particules lumineuses flottantes
    g.save();
    for (let p = 0; p < 24; p++) {
        const px = ((p * 137.5) % 1080);
        const py = ((p * 229 + t * 45) % 1920);
        const pSize = 1.5 + (p % 4);
        const pAlpha = 0.15 + (Math.sin(t * 3 + p) * 0.1);
        g.fillStyle = activeColor || '#ffffff';
        g.globalAlpha = Math.max(0.05, pAlpha);
        g.beginPath();
        g.arc(px, py, pSize, 0, Math.PI * 2);
        g.fill();
    }
    g.restore();
}

// -----------------------------------------------------------------------------
// SCÈNE D'INTRO : HOOK VIRAL (0.0s - 1.2s)
// -----------------------------------------------------------------------------
function drawIntroScene(t) {
    const introProgress = clamp(t / 1.2, 0, 1);
    const zoom = 1.0 + (1 - ease.out(introProgress)) * 0.25;

    g.save();
    g.translate(540, 960);
    g.scale(zoom, zoom);
    g.translate(-540, -960);

    // Titre principal percutant
    g.textAlign = 'center';
    g.textBaseline = 'middle';

    // Badge haut
    const badgeW = 320;
    const badgeH = 54;
    roundRect(g, 540 - badgeW / 2, 720 - badgeH / 2, badgeW, badgeH, 27);
    g.fillStyle = 'rgba(245, 158, 11, 0.15)';
    g.fill();
    g.strokeStyle = '#f59e0b';
    g.lineWidth = 2;
    g.stroke();

    g.font = '800 20px "Montserrat", sans-serif';
    g.letterSpacing = '3px';
    g.fillStyle = '#f59e0b';
    g.fillText('⚽ ÉDITION 2024 / 2025', 540, 720);

    // Titre Géant "TOP 10"
    g.font = '900 130px "Montserrat", sans-serif';
    g.letterSpacing = '-3px';
    g.fillStyle = '#ffffff';
    g.shadowColor = 'rgba(245, 158, 11, 0.85)';
    g.shadowBlur = 40;
    g.fillText('TOP 10', 540, 870);

    // Sous-titre "MEILLEURS JOUEURS DU MONDE"
    g.font = '900 48px "Montserrat", sans-serif';
    g.letterSpacing = '-1px';
    g.fillStyle = '#f59e0b';
    g.shadowBlur = 25;
    g.fillText('MEILLEURS JOUEURS', 540, 980);

    g.font = '800 36px "Montserrat", sans-serif';
    g.letterSpacing = '6px';
    g.fillStyle = 'rgba(255, 255, 255, 0.9)';
    g.shadowBlur = 0;
    g.fillText('DU FOOTBALL MONDIAL', 540, 1045);

    // Badge Countdown
    roundRect(g, 540 - 240, 1160, 480, 60, 30);
    g.fillStyle = 'rgba(255, 255, 255, 0.08)';
    g.fill();
    g.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    g.lineWidth = 1.5;
    g.stroke();

    g.font = '700 20px "Inter", sans-serif';
    g.letterSpacing = '2px';
    g.fillStyle = '#ffffff';
    g.fillText('DU N°10 AU PODIUM ULTIME ⚡', 540, 1190);

    g.restore();
}

// -----------------------------------------------------------------------------
// CARTE D'UN JOUEUR DU TOP 10 (RANK 10 À 1)
// -----------------------------------------------------------------------------
function drawPlayerCard(t, player) {
    const segT = t - player.start;
    const segDur = player.end - player.start;
    const progress = clamp(segT / segDur, 0, 1);

    // Animation d'entrée : Glissement dynamique depuis la droite avec ressort
    const enterProgress = clamp(segT / 0.35, 0, 1);
    const enterSlide = (1 - ease.out(enterProgress)) * 400;

    // Halo lumineux dynamique derrière le joueur
    g.save();
    const haloGrad = g.createRadialGradient(680, 1100, 100, 680, 1100, 500);
    haloGrad.addColorStop(0.0, player.colorGlow);
    haloGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.2)');
    haloGrad.addColorStop(1.0, 'transparent');
    g.fillStyle = haloGrad;
    g.fillRect(200, 600, 880, 1000);
    g.restore();

    // 1. CHIFFRE GÉANT DU CLASSEMENT EN ARRIÈRE-PLAN (Ex: "#10", "#1")
    g.save();
    g.font = '900 360px "Montserrat", sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillStyle = 'rgba(255, 255, 255, 0.05)';
    g.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    g.lineWidth = 4;
    g.fillText(\`#\${player.rank}\`, 80, 320);
    g.strokeText(\`#\${player.rank}\`, 80, 320);
    g.restore();

    // 2. IMAGE DÉTOURÉE DU JOUEUR (PNG HAUTE RÉSOLUTION)
    if (player.playerImg && player.playerImg.complete && player.playerImg.naturalWidth > 0) {
        g.save();
        const playerX = 520 + enterSlide;
        const playerY = 720;
        const pScale = (player.rank === 1) ? 1.08 : 0.96; // Le N°1 est plus grand

        // Micro-flottement subtil
        const floatY = Math.sin(t * 4) * 12;

        g.translate(playerX, playerY + floatY);
        g.scale(pScale, pScale);

        // Ombre portée du joueur
        g.shadowColor = 'rgba(0, 0, 0, 0.9)';
        g.shadowBlur = 45;
        g.shadowOffsetX = -20;
        g.shadowOffsetY = 25;

        // Ratio d'aspect conservé pour ne jamais déformer le joueur
        const nw = player.playerImg.naturalWidth;
        const nh = player.playerImg.naturalHeight;
        const targetH = 920;
        const targetW = (nw / nh) * targetH;

        g.drawImage(player.playerImg, -targetW / 2, 0, targetW, targetH);
        g.restore();
    }

    // 3. OVERLAY D'INFORMATIONS DU JOUEUR (CARTOUCHE BASSE ET BADGES)
    g.save();

    // Badge de Podium spécial pour le Top 3
    g.font = '900 20px "Montserrat", sans-serif';
    g.letterSpacing = '2px';
    const badgeTextWidth = g.measureText(player.badge).width;

    if (player.rank <= 3) {
        const podW = Math.max(320, badgeTextWidth + 60);
        const podH = 52;
        roundRect(g, 90, 480, podW, podH, 26);
        g.fillStyle = (player.rank === 1) ? '#fbbf24' : (player.rank === 2 ? '#e2e8f0' : '#d97706');
        g.shadowColor = (player.rank === 1) ? 'rgba(251, 191, 36, 0.8)' : 'transparent';
        g.shadowBlur = (player.rank === 1) ? 20 : 0;
        g.fill();
        g.shadowBlur = 0;

        g.fillStyle = '#000000';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(player.badge, 90 + podW / 2, 480 + podH / 2);
    } else {
        // Badge Standard
        const bW = Math.max(260, badgeTextWidth + 50);
        const bH = 46;
        roundRect(g, 90, 480, bW, bH, 23);
        g.fillStyle = 'rgba(255, 255, 255, 0.08)';
        g.fill();
        g.strokeStyle = player.color;
        g.lineWidth = 2;
        g.stroke();

        g.font = '800 16px "Montserrat", sans-serif';
        g.letterSpacing = '2px';
        g.fillStyle = player.color;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(player.badge, 90 + bW / 2, 480 + bH / 2);
    }

    // Badge Numéro de Rank Lumineux
    const rankBadgeW = 120;
    const rankBadgeH = 64;
    roundRect(g, 90, 550, rankBadgeW, rankBadgeH, 18);
    g.fillStyle = player.color;
    g.shadowColor = player.colorGlow;
    g.shadowBlur = 25;
    g.fill();
    g.shadowBlur = 0;

    g.font = '900 38px "Montserrat", sans-serif';
    g.fillStyle = '#000000';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(\`#\${player.rank}\`, 90 + rankBadgeW / 2, 550 + rankBadgeH / 2);

    // 4. PANNEAU D'INFORMATIONS DU BAS (GLASSMORPHISM CARD)
    const cardY = 1420;
    const cardH = 260;
    roundRect(g, 70, cardY, 940, cardH, 32);
    g.fillStyle = 'rgba(12, 18, 32, 0.88)';
    g.fill();
    g.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    g.lineWidth = 1.5;
    g.stroke();

    // Bordure accentuée gauche aux couleurs du joueur/club
    g.save();
    roundRect(g, 70, cardY, 12, cardH, 6);
    g.fillStyle = player.color;
    g.fill();
    g.restore();

    // Logo du Club Officiel
    if (player.clubLogoImg && player.clubLogoImg.complete && player.clubLogoImg.naturalWidth > 0) {
        g.save();
        const logoSize = 100;
        const logoX = 110;
        const logoY = cardY + 35;
        // Cercle de fond pour le logo
        g.beginPath();
        g.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 10, 0, Math.PI * 2);
        g.fillStyle = 'rgba(255, 255, 255, 0.06)';
        g.fill();
        g.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        g.lineWidth = 1.2;
        g.stroke();

        g.drawImage(player.clubLogoImg, logoX, logoY, logoSize, logoSize);
        g.restore();
    }

    // Nom du Joueur
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.font = '900 56px "Montserrat", sans-serif';
    g.letterSpacing = '-0.5px';
    g.fillStyle = '#ffffff';
    g.shadowColor = 'rgba(0, 0, 0, 0.8)';
    g.shadowBlur = 15;
    g.fillText(player.name, 250, cardY + 80);

    // Club & Pays
    g.font = '700 24px "Inter", sans-serif';
    g.letterSpacing = '1px';
    g.fillStyle = player.color;
    g.shadowBlur = 0;
    g.fillText(\`\${player.club} • \${player.country.toUpperCase()}\`, 250, cardY + 122);

    // Barre de séparation subtile
    g.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(110, cardY + 160);
    g.lineTo(960, cardY + 160);
    g.stroke();

    // Statistique clé
    g.font = '700 22px "Inter", sans-serif';
    g.letterSpacing = '0.5px';
    g.fillStyle = '#f1f5f9';
    g.fillText(player.stat, 110, cardY + 208);

    g.restore();
}

// -----------------------------------------------------------------------------
// SCÈNE DE FIN / OUTRO CALL TO ACTION (14.8s - 15.0s)
// -----------------------------------------------------------------------------
function drawOutroScene(t) {
    const outroT = clamp((t - 14.8) / 0.2, 0, 1);
    g.save();
    g.fillStyle = \`rgba(0, 0, 0, \${outroT})\`;
    g.fillRect(0, 0, 1080, 1920);

    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '900 52px "Montserrat", sans-serif';
    g.fillStyle = '#fbbf24';
    g.fillText('QUI EST TON N°1 ?', 540, 930);

    g.font = '700 28px "Inter", sans-serif';
    g.fillStyle = '#ffffff';
    g.fillText('DONNE TON AVIS EN COMMENTAIRE ! 💬', 540, 1010);
    g.restore();
}

// -----------------------------------------------------------------------------
// HEADER SUPÉRIEUR ET BARRE DE PROGRESSION GLOBALE (0s à 15s)
// -----------------------------------------------------------------------------
function drawGlobalHeader(t) {
    const headerY = 100;
    g.save();

    // 1. Barre de progression supérieure dynamique
    const progressW = (t / DURATION) * 940;
    roundRect(g, 70, 70, 940, 8, 4);
    g.fillStyle = 'rgba(255, 255, 255, 0.15)';
    g.fill();

    // Barre active dorée avec reflet
    roundRect(g, 70, 70, progressW, 8, 4);
    const gradProg = g.createLinearGradient(70, 0, 70 + progressW, 0);
    gradProg.addColorStop(0.0, '#3b82f6');
    gradProg.addColorStop(0.5, '#f59e0b');
    gradProg.addColorStop(1.0, '#fbbf24');
    g.fillStyle = gradProg;
    g.shadowColor = 'rgba(245, 158, 11, 0.8)';
    g.shadowBlur = 12;
    g.fill();
    g.shadowBlur = 0;

    // 2. Tag Minimaliste "TOP 10 FOOTBALL"
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '800 20px "Montserrat", sans-serif';
    g.letterSpacing = '3px';
    g.fillStyle = 'rgba(255, 255, 255, 0.85)';
    g.fillText('✦ TOP 10 DU MONDE ✦', 540, headerY + 25);

    g.restore();
}

// -----------------------------------------------------------------------------
// FONCTION PRINCIPALE DE RENDU TEMPOREL (FRAME BY FRAME DÉTERMINISTE)
// -----------------------------------------------------------------------------
function renderFrame(t) {
    g.clearRect(0, 0, 1080, 1920);

    // Identification du segment actif
    let activeColor = '#3b82f6';
    const activePlayer = top10Data.find(p => t >= p.start && t < p.end);
    if (activePlayer) {
        activeColor = activePlayer.color;
    }

    // 1. Dessin de l'ambiance stade
    drawStadiumBackground(t, activeColor);

    // 2. Rendu de la scène appropriée
    if (t < 1.2) {
        drawIntroScene(t);
    } else if (t >= 14.8) {
        drawOutroScene(t);
    } else if (activePlayer) {
        drawPlayerCard(t, activePlayer);
    }

    // 3. En-tête global et timeline supérieure
    drawGlobalHeader(t);
}

// =============================================================================
// INTERFACE VIBEEDITOR STUDIO (CONTRAT DE LECTURE TIMELINE DÉTERMINISTE 15s)
// =============================================================================
window.renderAt = function(timeInSeconds) {
    playbackTime = clamp(timeInSeconds, 0, DURATION);
    renderFrame(playbackTime);
};

window.timelineSeek = function(timeInSeconds) {
    window.renderAt(timeInSeconds);
    if (audioVoice) {
        audioVoice.currentTime = Math.min(playbackTime, 14.5);
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
        if (audioVoice && audioVoice.paused && timeInSeconds < 14.5) {
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

    if (audioVoice && playbackTime < 14.5) {
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

// Premier rendu immédiat
window.renderAt(0);
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '../04_Videos/top10_football_15s.html'), html, 'utf-8');
console.log('✅ 04_Videos/top10_football_15s.html generated successfully!');

