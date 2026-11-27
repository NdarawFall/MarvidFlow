#!/usr/bin/env node
/**
 * BLENDER_TOOL.CJS
 * Utilitaire CLI d'arrière-plan pour convertir ou optimiser des modèles 3D en .GLB pour Three.js.
 * 
 * ⚠️ RÈGLE D'OR DE GOUVERNANCE :
 * L'IA a l'interdiction formelle et absolue de lancer ce script sans une demande explicite
 * formulée par l'utilisateur (ex: "convertis ce modèle avec Blender", "génère un GLB avec Blender").
 * Par défaut, tout le rendu 3D temps réel s'effectue directement dans le navigateur via Three.js.
 * 
 * Usage :
 *   node 07_Scripts/blender_tool.cjs info
 *   node 07_Scripts/blender_tool.cjs convert <fichier3d.obj|fbx|stl|blend> [sortie.glb]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function findBlenderExecutable() {
    if (process.env.BLENDER_PATH && fs.existsSync(process.env.BLENDER_PATH)) {
        return process.env.BLENDER_PATH;
    }

    // 1. Chemins WindowsApps & Program Files
    const localAppData = process.env.LOCALAPPDATA || '';
    const candidates = [
        path.join(localAppData, 'Microsoft', 'WindowsApps', 'blender.exe'),
        'C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe',
        'C:\\Program Files\\Blender Foundation\\Blender 3.6 LTS\\blender.exe',
        'C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe',
        'C:\\Program Files\\Blender Foundation\\Blender 4.1\\blender.exe',
        'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
        'C:\\Program Files\\Blender Foundation\\Blender 2.93\\blender.exe'
    ];

    for (const cand of candidates) {
        if (cand && fs.existsSync(cand)) return cand;
    }

    // 2. Recherche avec where.exe
    try {
        const whereRes = spawnSync('where.exe', ['blender'], { encoding: 'utf8' });
        if (whereRes.status === 0 && whereRes.stdout) {
            const lines = whereRes.stdout.trim().split(/\r?\n/);
            for (const l of lines) {
                const cleaned = l.trim();
                if (cleaned && fs.existsSync(cleaned)) return cleaned;
            }
        }
    } catch(e) {}

    // 3. Recherche générique dans Program Files
    const baseDir = 'C:\\Program Files\\Blender Foundation';
    if (fs.existsSync(baseDir)) {
        const subdirs = fs.readdirSync(baseDir);
        for (const sub of subdirs) {
            const p = path.join(baseDir, sub, 'blender.exe');
            if (fs.existsSync(p)) return p;
        }
    }

    return 'blender';
}

function showInfo() {
    const blenderPath = findBlenderExecutable();
    console.log('\n======================================================');
    console.log('🧊 BLENDER TOOL — MARVIDFLOW 3D PIPELINE');
    console.log('======================================================');
    if (blenderPath) {
        console.log(`✅ Exécutable Blender détecté : ${blenderPath}`);
        const ver = spawnSync(blenderPath, ['--version'], { encoding: 'utf8' });
        const firstLine = (ver.stdout || '').split('\n')[0].trim();
        console.log(`   Version : ${firstLine || 'Inconnue'}`);
    } else {
        console.log('⚠️ Aucun exécutable Blender trouvé automatiquement.');
        console.log('   Définissez la variable d\'environnement BLENDER_PATH si nécessaire.');
    }
    console.log('\n💡 Rappel de Gouvernance :');
    console.log('   Blender est déclenché UNIQUEMENT sur demande explicite de l\'utilisateur.');
    console.log('   Le rendu vidéo s\'effectue en temps réel à 60 FPS dans Three.js.\n');
}

function convertModel(inputFile, outputFile) {
    if (!inputFile) {
        console.error('❌ Erreur : veuillez spécifier un fichier 3D source.');
        process.exit(1);
    }

    const resolvedInput = path.resolve(inputFile);
    if (!fs.existsSync(resolvedInput)) {
        console.error(`❌ Fichier source introuvable : ${resolvedInput}`);
        process.exit(1);
    }

    const blenderExe = findBlenderExecutable();
    if (!blenderExe) {
        console.error('❌ Impossible d\'exécuter la conversion : Blender n\'est pas installé ou introuvable dans le PATH.');
        process.exit(1);
    }

    let targetGlb = outputFile;
    if (!targetGlb) {
        const base = path.basename(resolvedInput, path.extname(resolvedInput));
        targetGlb = path.resolve('01_Assets', '3D', `${base}.glb`);
    } else {
        targetGlb = path.resolve(targetGlb);
    }

    const scriptPath = path.resolve(__dirname, 'blender_export_glb.py');
    console.log(`\n🚀 Conversion 3D avec Blender CLI :`);
    console.log(`   Source : ${resolvedInput}`);
    console.log(`   Sortie : ${targetGlb}`);

    const args = [
        '--background',
        '--python', scriptPath,
        '--',
        resolvedInput,
        targetGlb
    ];

    const result = spawnSync(blenderExe, args, { encoding: 'utf8', stdio: 'inherit' });
    if (result.status !== 0) {
        console.error(`❌ Échec de la conversion Blender (code ${result.status})`);
        process.exit(result.status || 1);
    }

    if (fs.existsSync(targetGlb)) {
        const stats = fs.statSync(targetGlb);
        const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`\n🎉 Modèle .GLB prêt pour Three.js : ${targetGlb} (${sizeMb} Mo)`);
    }
}

// ROUTEUR CLI
const [cmd, arg1, arg2] = process.argv.slice(2);

switch (cmd) {
    case 'info':
        showInfo();
        break;
    case 'convert':
        convertModel(arg1, arg2);
        break;
    default:
        console.log('\nUsage :');
        console.log('  node 07_Scripts/blender_tool.cjs info');
        console.log('  node 07_Scripts/blender_tool.cjs convert <fichier.obj|fbx|stl|blend> [sortie.glb]\n');
        break;
}
