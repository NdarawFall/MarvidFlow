/**
 * TRANSCRIBE_SUBTITLES.CJS — Générateur et Convertisseur de Sous-Titres Multi-Styles
 * 
 * Permet de :
 * 1. Convertir et analyser un fichier audio (Voix-off) pour en extraire les sous-titres
 * 2. Générer des fichiers .srt, .json (mot-à-mot) et des composants HTML prêts pour le Studio
 * 3. Permettre à l'utilisateur de choisir parmi 5 styles visuels :
 *    - 'karaoke'  : Pop / TikTok (mot actif surligné et agrandi)
 *    - 'hormozi'  : Viral YouTube Shorts (gros texte jaune/vert percutant, contour noir)
 *    - 'doc'      : Netflix / Documentaire (capsule sombre givrée)
 *    - 'neon'     : Cyberpunk (glow violet/cyan néon)
 *    - 'minimal'  : Typographie pure blanche discrète
 * 
 * Usage CLI :
 *   node 05_Scripts/transcribe_subtitles.cjs "01_Assets/Voix_Off/ma_voix.mp3" --style hormozi
 *   node 05_Scripts/transcribe_subtitles.cjs "01_Assets/Voix_Off/sample_demo.vtt" --style karaoke
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const srtParser2 = require('srt-parser-2');

// Détection de FFmpeg embarqué dans le projet
function getFfmpegPath() {
    try {
        const installer = require('@ffmpeg-installer/ffmpeg');
        if (installer && installer.path && fs.existsSync(installer.path)) {
            return installer.path;
        }
    } catch (e) {}
    return 'ffmpeg';
}

const FFMPEG_BIN = getFfmpegPath();

// Styles disponibles
const STYLES = {
    karaoke: {
        cssClass: 'karaoke-style',
        label: 'Karaoké / Pop (TikTok/Reels)',
        isWordByWord: true
    },
    hormozi: {
        cssClass: 'hormozi-style',
        label: 'Hormozi / Impact (YouTube Shorts)',
        isWordByWord: true
    },
    doc: {
        cssClass: 'doc-style',
        label: 'Netflix / Documentaire',
        isWordByWord: false
    },
    neon: {
        cssClass: 'neon-style',
        label: 'Cyberpunk Néon',
        isWordByWord: true
    },
    minimal: {
        cssClass: 'minimal-style',
        label: 'Minimaliste Épuré',
        isWordByWord: false
    }
};

// Parser d'arguments CLI
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log(`\nUsage: node transcribe_subtitles.cjs <fichier_audio_ou_vtt_ou_srt> [options]`);
    console.log(`\nOptions :`);
    console.log(`  --style <name>     Style de sous-titres : karaoke (défaut), hormozi, doc, neon, minimal`);
    console.log(`  --output <dir>     Dossier de sortie (défaut: même dossier que la source)`);
    console.log(`\nExemples :`);
    console.log(`  node 05_Scripts/transcribe_subtitles.cjs 01_Assets/Voix_Off/sample_demo.mp3 --style hormozi`);
    console.log(`  node 05_Scripts/transcribe_subtitles.cjs 01_Assets/Voix_Off/sample_demo.vtt --style karaoke\n`);
    process.exit(0);
}

const inputFile = path.resolve(args[0]);
let chosenStyle = 'karaoke';
let outputDir = path.dirname(inputFile);

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--style' && args[i + 1]) chosenStyle = args[++i].toLowerCase();
    else if (args[i] === '--output' && args[i + 1]) outputDir = path.resolve(args[++i]);
}

if (!fs.existsSync(inputFile)) {
    console.error(`❌ Fichier introuvable : ${inputFile}`);
    process.exit(1);
}

if (!STYLES[chosenStyle]) {
    console.warn(`⚠️ Style inconnu "${chosenStyle}". Utilisation du style 'karaoke' par défaut.`);
    chosenStyle = 'karaoke';
}

console.log(`\n======================================================`);
console.log(`🎬  GÉNÉRATEUR DE SOUS-TITRES (MarvidFlow Studio)`);
console.log(`📄  Source : ${path.basename(inputFile)}`);
console.log(`🎨  Style  : ${STYLES[chosenStyle].label}`);
console.log(`======================================================\n`);

async function main() {
    const ext = path.extname(inputFile).toLowerCase();
    let cues = [];

    // Cas 1 : Fichier sous-titres existant (.srt ou .vtt)
    if (ext === '.srt' || ext === '.vtt') {
        cues = parseSubtitleFile(inputFile);
    } else {
        // Cas 2 : Fichier audio/vidéo -> Transcription Whisper locale
        cues = await transcribeAudio(inputFile);
    }

    if (!cues || cues.length === 0) {
        console.error('❌ Aucun texte extrait ou transcrit.');
        process.exit(1);
    }

    // Génération des fichiers de sortie
    const baseName = path.basename(inputFile, ext);
    const jsonPath = path.join(outputDir, `${baseName}_subtitles.json`);
    const srtPath = path.join(outputDir, `${baseName}.srt`);
    const htmlSnippetPath = path.join(outputDir, `${baseName}_subtitle_component.html`);

    // 1. JSON structuré (mot à mot avec timestamps)
    fs.writeFileSync(jsonPath, JSON.stringify({ style: chosenStyle, cues }, null, 2), 'utf8');
    console.log(`✅ JSON mot-à-mot généré : ${jsonPath}`);

    // 2. SRT standard
    const srtContent = generateSrt(cues);
    fs.writeFileSync(srtPath, srtContent, 'utf8');
    console.log(`✅ Fichier SRT généré     : ${srtPath}`);

    // 3. Composant HTML prêt pour la vidéo
    const htmlContent = generateHtmlSnippet(cues, chosenStyle);
    fs.writeFileSync(htmlSnippetPath, htmlContent, 'utf8');
    console.log(`✅ Composant HTML prêt    : ${htmlSnippetPath}`);

    console.log(`\n🎉 Génération terminée avec succès !`);
}

// Parsing des fichiers SRT ou VTT
function parseSubtitleFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const SrtParserClass = srtParser2.default || srtParser2;
    const parser = new SrtParserClass();
    const cleanContent = content.replace(/^WEBVTT[^\n]*\n+/i, '').replace(/-->/g, '-->');
    
    try {
        const raw = parser.fromSrt(cleanContent);
        return raw.map(item => ({
            start: timeStringToSeconds(item.startTime),
            end: timeStringToSeconds(item.endTime),
            text: item.text.replace(/<[^>]+>/g, '').trim(),
            words: splitTextIntoWords(item.text, timeStringToSeconds(item.startTime), timeStringToSeconds(item.endTime))
        }));
    } catch (e) {
        console.warn('Fallback parsing manuel des sous-titres...');
        return manualParseVtt(content);
    }
}

function timeStringToSeconds(str) {
    if (!str) return 0;
    const parts = str.replace(',', '.').split(':');
    if (parts.length === 3) {
        return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    }
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
}

function splitTextIntoWords(text, start, end) {
    const clean = text.replace(/<[^>]+>/g, '').trim();
    const words = clean.split(/\s+/).filter(Boolean);
    const duration = Math.max(0.2, end - start);
    const step = duration / words.length;

    return words.map((w, idx) => ({
        word: w,
        start: Math.round((start + idx * step) * 100) / 100,
        end: Math.round((start + (idx + 1) * step) * 100) / 100
    }));
}

function manualParseVtt(vtt) {
    const lines = vtt.split(/\r?\n/);
    const cues = [];
    let curStart = 0;
    let curEnd = 0;
    let curText = [];

    for (const line of lines) {
        const timeMatch = line.match(/(\d{2}:\d{2}[:\.]\d{2,3}|\d{2}:\d{2}:\d{2}[,\.]\d{2,3})\s*-->\s*(\d{2}:\d{2}[:\.]\d{2,3}|\d{2}:\d{2}:\d{2}[,\.]\d{2,3})/);
        if (timeMatch) {
            if (curText.length > 0) {
                const txt = curText.join(' ').trim();
                cues.push({ start: curStart, end: curEnd, text: txt, words: splitTextIntoWords(txt, curStart, curEnd) });
                curText = [];
            }
            curStart = timeStringToSeconds(timeMatch[1]);
            curEnd = timeStringToSeconds(timeMatch[2]);
        } else if (line.trim() && !line.startsWith('WEBVTT') && !line.match(/^\d+$/)) {
            curText.push(line.trim());
        }
    }
    if (curText.length > 0) {
        const txt = curText.join(' ').trim();
        cues.push({ start: curStart, end: curEnd, text: txt, words: splitTextIntoWords(txt, curStart, curEnd) });
    }
    return cues;
}

// Transcription locale via Whisper ONNX (@xenova/transformers)
async function transcribeAudio(audioPath) {
    console.log('🎙️  1. Conversion audio en format 16kHz mono (optimisé Whisper)...');
    const tempWav = path.join(path.dirname(audioPath), `_temp_${Date.now()}.wav`);
    
    try {
        execSync(`"${FFMPEG_BIN}" -y -i "${audioPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${tempWav}"`, { stdio: 'ignore' });
    } catch (e) {
        console.error('Erreur conversion FFmpeg :', e.message);
        throw e;
    }

    console.log('🤖 2. Chargement du modèle Whisper local (CPU)...');
    const { pipeline } = require('@xenova/transformers');
    const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');

    console.log('📝 3. Transcription et extraction des timestamps mot-à-mot...');
    const result = await transcriber(tempWav, {
        chunk_length_s: 30,
        return_timestamps: 'word'
    });

    try { fs.unlinkSync(tempWav); } catch (e) {}

    const chunks = result.chunks || [];
    const cues = [];

    // Si on a des chunks avec timestamps
    if (chunks.length > 0) {
        let sentenceWords = [];
        let sStart = chunks[0].timestamp[0] || 0;
        let sEnd = chunks[0].timestamp[1] || 1;

        chunks.forEach((chunk, i) => {
            const word = chunk.text.trim();
            const wStart = chunk.timestamp[0] ?? sEnd;
            const wEnd = chunk.timestamp[1] ?? (wStart + 0.3);

            sentenceWords.push({ word, start: wStart, end: wEnd });

            // Regrouper par petits paquets de 4-7 mots pour un sous-titre percutant
            if (sentenceWords.length >= 6 || word.endsWith('.') || word.endsWith('!') || word.endsWith('?') || i === chunks.length - 1) {
                const text = sentenceWords.map(sw => sw.word).join(' ');
                cues.push({
                    start: sentenceWords[0].start,
                    end: sentenceWords[sentenceWords.length - 1].end,
                    text,
                    words: sentenceWords
                });
                sentenceWords = [];
            }
        });
    } else {
        const fullText = result.text.trim();
        cues.push({
            start: 0,
            end: 5,
            text: fullText,
            words: splitTextIntoWords(fullText, 0, 5)
        });
    }

    return cues;
}

function generateSrt(cues) {
    function formatTime(sec) {
        const h = Math.floor(sec / 3600).toString().padStart(2, '0');
        const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(sec % 60).toString().padStart(2, '0');
        const ms = Math.floor((sec % 1) * 1000).toString().padStart(3, '0');
        return `${h}:${m}:${s},${ms}`;
    }

    return cues.map((c, i) => `${i + 1}\n${formatTime(c.start)} --> ${formatTime(c.end)}\n${c.text}\n`).join('\n');
}

function generateHtmlSnippet(cues, styleKey) {
    const styleInfo = STYLES[styleKey] || STYLES.karaoke;

    return `<!-- SOUS-TITRES HYPERSTUDIO (Style : ${styleInfo.label}) -->
<link rel="stylesheet" href="../02_Composants/Subtitle/subtitle.css">

<div class="subtitle-container">
  <div id="subtitleBox" class="subtitle-box ${styleInfo.cssClass}"></div>
</div>

<script>
  const subtitleCues = ${JSON.stringify(cues, null, 2)};
  const subBox = document.getElementById('subtitleBox');

  function updateSubtitles(t) {
    if (!subBox) return;

    // Trouver le bloc actif
    const activeCue = subtitleCues.find(c => t >= c.start && t <= c.end);

    if (!activeCue) {
      subBox.innerHTML = '';
      subBox.style.opacity = '0';
      return;
    }

    subBox.style.opacity = '1';

    // Rendu Mot-à-Mot dynamique (Karaoké, Hormozi, Néon)
    ${styleInfo.isWordByWord ? `
    let html = '';
    activeCue.words.forEach(w => {
      const isActive = (t >= w.start && t <= w.end);
      html += '<span class="word' + (isActive ? ' active' : '') + '">' + w.word + '</span> ';
    });
    subBox.innerHTML = html;
    ` : `
    // Rendu Phrase Complète (Netflix / Minimaliste)
    subBox.textContent = activeCue.text;
    `}
  }

  // Intégration dans la timeline
  if (window.__timeline && typeof window.__timeline.seek === 'function') {
    const prevSeek = window.__timeline.seek;
    window.__timeline.seek = function(t) {
      prevSeek(t);
      updateSubtitles(t);
    };
  }
</script>
`;
}

main().catch(err => {
    console.error('\n❌ Erreur dans le script de sous-titres :', err);
    process.exit(1);
});
