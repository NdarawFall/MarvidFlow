/**
 * STUDIO-SERVER.CJS — Serveur local avec support de rendu automatique
 * Gère les fichiers, le streaming statique et le déclenchement de rendu MP4.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

let PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
process.env.ACTIVE_STUDIO_PORT = String(PORT);
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'text/javascript; charset=UTF-8',
    '.cjs': 'text/javascript; charset=UTF-8',
    '.mjs': 'text/javascript; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

// État global du rendu
let renderState = {
    isRendering: false,
    videoName: null,
    progress: 0,
    statusText: 'Inactif',
    logs: []
};
let currentRenderProcess = null;

// Intégration du moteur Orchestrateur IA MarvidFlow & Nettoyage Scratch
const { runAiVideoPipeline } = require('./ai_director.cjs');
const { cleanupScratch, setVideoProcessLock } = require('./cleanup-scratch.cjs');

// Registre des tâches de création vidéo en cours
const activeCreationJobs = new Map();

// Détermination transparente du dossier de travail et de configuration :
// En mode bureau / packagé : utilise le dossier utilisateur (ex: Documents/AutoFrame ou AppData)
// En mode dev local : utilise le dossier racine du projet
const USER_DATA_DIR = process.env.VIBE_USER_DATA || ROOT_DIR;

// Initialiser les dossiers de données utilisateur essentiels
['Clients', '03_Chaines', '04_Videos', '08_Rendus'].forEach(folder => {
    const full = path.join(USER_DATA_DIR, folder);
    if (!fs.existsSync(full)) {
        try { fs.mkdirSync(full, { recursive: true }); } catch (e) {}
    }
});

function getResolvedConfigPath() {
    if (process.env.VIBE_USER_DATA) {
        const userDir = process.env.VIBE_USER_DATA;
        if (!fs.existsSync(userDir)) {
            try { fs.mkdirSync(userDir, { recursive: true }); } catch (e) {}
        }
        return path.join(userDir, 'api_config.json');
    }
    return path.join(ROOT_DIR, '07_Scripts', 'api_config.json');
}

const DEFAULT_CONFIG = {
    tts_engine: "elevenlabs",
    pref_format: "16:9",
    pref_fps: "60",
    pref_quality: "high",
    pref_template: "none",
    pref_subtitle_style: "type-wordbyword",
    gemini_model: "gemini-3.5-flash-lite",
    google_api_key: "",
    elevenlabs_api_key: "",
    elevenlabs_voice_id: "N2lVS1w4EtoT3dr4eOWO",
    elevenlabs_model_id: "eleven_multilingual_v2",
    pixabay_api_key: "",
    brandfetch_api_key: "",
    bg_remove_api_key: "",
    sketchfab_api_token: "",
    coverr_api_key: "",
    edge_voice_id: "fr-FR-HenriNeural",
    groq_api_key: "",
    groq_model: "llama-3.1-8b-instant",
    openrouter_api_key: "",
    openrouter_model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
};

// Initialisation automatique transparente sans aucune manipulation technique de l'utilisateur
const activeConfigPath = getResolvedConfigPath();
if (!fs.existsSync(activeConfigPath)) {
    try {
        fs.writeFileSync(activeConfigPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
        console.log('ℹ️  [AutoFrame] Configuration utilisateur initialisée :', activeConfigPath);
    } catch (err) {
        console.warn('⚠️  Impossible d\'initialiser la configuration utilisateur :', err.message);
    }
}

// -------------------------------------------------------------------------
// ÉTAT DE MISE À JOUR DE L'APPLICATION (ÉLECTRON & RELEASES GITHUB)
// -------------------------------------------------------------------------
let appUpdateState = {
    status: 'idle', // 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error'
    progress: 0,
    currentVersion: '1.0.0',
    latestVersion: null,
    releaseNotes: '',
    error: null
};

try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
    if (pkg.version) appUpdateState.currentVersion = pkg.version;
} catch (e) {}

global.setAppUpdateState = (newState) => {
    appUpdateState = { ...appUpdateState, ...newState };
};
global.getAppUpdateState = () => appUpdateState;

const server = http.createServer(async (req, res) => {
    const cleanUrl = req.url.split('?')[0];
    // Redirection racine immédiate
    if (cleanUrl === '/' || cleanUrl === '') {
        res.writeHead(302, { 'Location': '/09_Pages/home.html' });
        return res.end();
    }

    // Raccourcis de navigation directe
    if (cleanUrl === '/monteur' || cleanUrl === '/monteur.html') {
        res.writeHead(302, { 'Location': '/09_Pages/monteur.html' });
        return res.end();
    }
    if (cleanUrl === '/createur' || cleanUrl === '/createur.html' || cleanUrl === '/channels' || cleanUrl === '/channels.html') {
        res.writeHead(302, { 'Location': '/09_Pages/createur.html' });
        return res.end();
    }

    // -------------------------------------------------------------------------
    // API AUTO-UPDATE (GITHUB RELEASES & ELECTRON)
    // -------------------------------------------------------------------------
    if (cleanUrl === '/api/app/update-status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(appUpdateState));
        return;
    }

    if (cleanUrl === '/api/app/check-update' && req.method === 'POST') {
        if (typeof global.triggerElectronUpdateCheck === 'function') {
            global.triggerElectronUpdateCheck();
        }

        // Vérification directe sur l'API GitHub Releases
        appUpdateState.status = 'checking';
        const https = require('https');
        const reqOpts = {
            hostname: 'api.github.com',
            path: '/repos/NdarawFall/AutoFrame_Studio/releases/latest',
            headers: { 'User-Agent': 'AutoFrame-Desktop-App' }
        };

        const ghReq = https.get(reqOpts, (apiRes) => {
            let data = '';
            apiRes.on('data', chunk => data += chunk);
            apiRes.on('end', () => {
                try {
                    if (apiRes.statusCode === 200) {
                        const release = JSON.parse(data);
                        const latestTag = release.tag_name ? release.tag_name.replace(/^v/, '') : null;
                        appUpdateState.latestVersion = latestTag;
                        appUpdateState.releaseNotes = release.body || '';
                        appUpdateState.releaseUrl = release.html_url;

                        // Trouver l'URL directe du .exe dans les assets de la release
                        let exeAsset = null;
                        if (Array.isArray(release.assets)) {
                            exeAsset = release.assets.find(a => a.name && a.name.endsWith('.exe'));
                        }
                        appUpdateState.downloadUrl = exeAsset ? exeAsset.browser_download_url : release.html_url;

                        if (latestTag && latestTag !== appUpdateState.currentVersion) {
                            appUpdateState.status = 'available';
                        } else {
                            appUpdateState.status = 'up-to-date';
                        }
                    } else {
                        // Pas encore de release publiée
                        appUpdateState.status = 'up-to-date';
                    }
                } catch (e) {
                    appUpdateState.status = 'error';
                    appUpdateState.error = e.message;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(appUpdateState));
            });
        });

        ghReq.on('error', (err) => {
            appUpdateState.status = 'error';
            appUpdateState.error = err.message;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(appUpdateState));
        });
        return;
    }

    if (cleanUrl === '/api/app/install-update' && req.method === 'POST') {
        if (typeof global.triggerElectronInstallUpdate === 'function') {
            global.triggerElectronInstallUpdate();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Redémarrage et installation...' }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Mise à jour disponible dans l\'application de bureau installée.' }));
        return;
    }

    // -------------------------------------------------------------------------
    // API ESPACE MONTEUR & GESTIONNAIRE DE CLIENTS
    // -------------------------------------------------------------------------
    
    // Cache en mémoire pour accélérer instantanément les réponses API de l'espace Monteur
    let cachedClientsResponseJson = null;
    let cachedSkillsResponseJson = null;
    function invalidateClientsCache() { cachedClientsResponseJson = null; }
    function invalidateSkillsCache() { cachedSkillsResponseJson = null; }

    const CLIENT_SUBFOLDERS = [
        'images_references',
        'videos_references',
        'clips_video',
        'voix_off',
        'musiques',
        'effets_sonores',
        'images_illustrations',
        'skills'
    ];
    const clientsBasePath = path.join(USER_DATA_DIR, 'Clients');
    if (!fs.existsSync(clientsBasePath)) {
        try { fs.mkdirSync(clientsBasePath, { recursive: true }); } catch (e) {}
    }

    // API : Lister tous les clients et leurs sous-dossiers
    if (cleanUrl === '/api/clients' && req.method === 'GET') {
        try {
            const searchBaseDirs = [clientsBasePath];
            const rootClients = path.join(ROOT_DIR, 'Clients');
            if (!searchBaseDirs.includes(rootClients)) searchBaseDirs.push(rootClients);

            const clientsMap = new Map();

            for (const basePath of searchBaseDirs) {
                if (!fs.existsSync(basePath)) continue;
                const entries = fs.readdirSync(basePath, { withFileTypes: true });

                for (const entry of entries) {
                    if (!entry.isDirectory()) continue;
                    if (entry.name.startsWith('.') || entry.name.toLowerCase() === 'readme.md') continue;

                    const clientDirName = entry.name;
                    if (clientsMap.has(clientDirName.toLowerCase())) continue;

                    const clientDirPath = path.join(basePath, clientDirName);
                    const stat = fs.statSync(clientDirPath);

                    const foldersData = {};
                    let totalAssets = 0;

                    for (const sub of CLIENT_SUBFOLDERS) {
                        const subDirPath = path.join(clientDirPath, sub);
                        if (!fs.existsSync(subDirPath)) {
                            try { fs.mkdirSync(subDirPath, { recursive: true }); } catch (e) {}
                        }
                        const files = fs.readdirSync(subDirPath, { withFileTypes: true })
                            .filter(f => f.isFile() && !f.name.startsWith('.'))
                            .map(f => {
                                const fStat = fs.statSync(path.join(subDirPath, f.name));
                                return {
                                    name: f.name,
                                    size: fStat.size,
                                    mtime: fStat.mtime,
                                    ext: path.extname(f.name).toLowerCase(),
                                    relativeUrl: `Clients/${clientDirName}/${sub}/${f.name}`
                                };
                            });
                        foldersData[sub] = files;
                        totalAssets += files.length;
                    }

                    // Détecter l'avatar du client
                    let clientAvatarUrl = '';
                    const rootClientFiles = fs.readdirSync(clientDirPath, { withFileTypes: true });
                    for (const rf of rootClientFiles) {
                        if (rf.isFile()) {
                            const lowName = rf.name.toLowerCase();
                            if (lowName.startsWith('avatar_') || lowName === 'avatar.png' || lowName === 'avatar.jpg' || lowName === 'avatar.jpeg' || lowName === 'avatar.webp') {
                                clientAvatarUrl = `Clients/${clientDirName}/${rf.name}`;
                                break;
                            }
                        }
                    }

                    clientsMap.set(clientDirName.toLowerCase(), {
                        name: clientDirName,
                        createdAt: stat.birthtime || stat.mtime,
                        avatarUrl: clientAvatarUrl,
                        totalAssets,
                        folders: foldersData,
                        categories: foldersData
                    });
                }
            }

            const clientsList = Array.from(clientsMap.values());
            clientsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            return res.end(JSON.stringify({ success: true, clients: clientsList }));
        } catch (err) {
            console.error('Erreur GET /api/clients :', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message }));
        }
    }

    // API : Créer un nouveau client avec ses sous-dossiers
    if (cleanUrl === '/api/clients/create' && req.method === 'POST') {
        invalidateClientsCache();
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const rawName = (payload.name || payload.client || '').trim();
                const safeName = rawName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');

                if (!safeName) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Le nom du client est invalide.' }));
                }

                const targetClientDir = path.join(clientsBasePath, safeName);
                if (fs.existsSync(targetClientDir)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: `Le client "${safeName}" existe déjà.` }));
                }

                fs.mkdirSync(targetClientDir, { recursive: true });

                for (const sub of CLIENT_SUBFOLDERS) {
                    fs.mkdirSync(path.join(targetClientDir, sub), { recursive: true });
                }

                let savedAvatarUrl = '';
                if (payload.avatar && typeof payload.avatar === 'string' && payload.avatar.includes('base64,')) {
                    try {
                        const base64Data = payload.avatar.split('base64,')[1];
                        const avatarPath = path.join(targetClientDir, 'avatar.png');
                        fs.writeFileSync(avatarPath, Buffer.from(base64Data, 'base64'));
                        savedAvatarUrl = `Clients/${safeName}/avatar.png`;
                    } catch(e) {}
                }

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({
                    success: true,
                    client: {
                        name: safeName,
                        avatarUrl: savedAvatarUrl,
                        folders: CLIENT_SUBFOLDERS,
                        categories: {}
                    }
                }));
            } catch (err) {
                console.error('Erreur /api/clients/create :', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // API : Uploader un asset dans un des 5 sous-dossiers du client
    if (cleanUrl === '/api/clients/upload' && req.method === 'POST') {
        invalidateClientsCache();
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const clientName = (payload.client || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
                const category = (payload.category || '').trim();
                const rawFilename = (payload.filename || `asset_${Date.now()}`).trim();
                const safeFilename = path.basename(rawFilename).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                const base64Data = payload.data;

                if (!clientName || !category || !base64Data) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Paramètres client, category ou data manquants.' }));
                }

                if (!CLIENT_SUBFOLDERS.includes(category)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: `Catégorie "${category}" invalide.` }));
                }

                const targetDir = path.join(clientsBasePath, clientName, category);
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                const targetFilePath = path.join(targetDir, safeFilename);
                const buffer = Buffer.from(base64Data, 'base64');
                fs.writeFileSync(targetFilePath, buffer);

                const relativeUrl = `Clients/${clientName}/${category}/${safeFilename}`;
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({
                    success: true,
                    filename: safeFilename,
                    category,
                    client: clientName,
                    relativeUrl
                }));
            } catch (err) {
                console.error('Erreur /api/clients/upload :', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // API : Supprimer un asset d'un client
    if (cleanUrl === '/api/clients/delete-asset' && req.method === 'POST') {
        invalidateClientsCache();
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const clientName = (payload.client || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
                const category = (payload.category || '').trim();
                const filename = path.basename(payload.filename || '');

                const targetFilePath = path.join(clientsBasePath, clientName, category, filename);
                if (fs.existsSync(targetFilePath)) {
                    fs.unlinkSync(targetFilePath);
                }

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ success: true, filename }));
            } catch (err) {
                console.error('Erreur /api/clients/delete-asset :', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // API : Supprimer un client
    if (cleanUrl === '/api/clients/delete-client' && req.method === 'POST') {
        invalidateClientsCache();
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const rawClient = (payload.client || payload.name || '').trim();
                const clientName = rawClient.replace(/[^a-zA-Z0-9_\-]/g, '_');

                const searchBaseDirs = [clientsBasePath];
                const rootClients = path.join(ROOT_DIR, 'Clients');
                if (!searchBaseDirs.includes(rootClients)) searchBaseDirs.push(rootClients);

                let deleted = false;
                for (const basePath of searchBaseDirs) {
                    if (!fs.existsSync(basePath)) continue;
                    try {
                        const entries = fs.readdirSync(basePath, { withFileTypes: true });
                        for (const ent of entries) {
                            if (ent.isDirectory() && (ent.name === clientName || ent.name === rawClient || ent.name.toLowerCase() === clientName.toLowerCase() || ent.name.toLowerCase() === rawClient.toLowerCase())) {
                                const targetDir = path.join(basePath, ent.name);
                                fs.rmSync(targetDir, { recursive: true, force: true });
                                deleted = true;
                            }
                        }
                    } catch(e) {}
                }

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ success: true, client: clientName, deleted }));
            } catch (err) {
                console.error('Erreur /api/clients/delete-client :', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // API : Définir ou modifier la photo de profil du client (avatar rond avec suppression de l'ancien)
    if (cleanUrl === '/api/clients/avatar' && req.method === 'POST') {
        invalidateClientsCache();
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const clientName = (payload.client || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
                const base64Data = payload.data;
                const rawFilename = payload.filename || 'avatar.jpg';
                const ext = path.extname(rawFilename).toLowerCase() || '.jpg';

                if (!clientName || !base64Data) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Client ou données image manquantes.' }));
                }

                const clientDir = path.join(clientsBasePath, clientName);
                if (!fs.existsSync(clientDir)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: `Client "${clientName}" non trouvé.` }));
                }

                // Supprimer STRICTEMENT toute ancienne image d'avatar de ce client
                const existingFiles = fs.readdirSync(clientDir);
                for (const f of existingFiles) {
                    const low = f.toLowerCase();
                    if (low.startsWith('avatar_') || low === 'avatar.jpg' || low === 'avatar.png' || low === 'avatar.webp' || low === 'avatar.jpeg') {
                        try {
                            fs.unlinkSync(path.join(clientDir, f));
                            console.log(`[Client ${clientName}] Ancien avatar supprimé : ${f}`);
                        } catch (e) {}
                    }
                }

                // Enregistrer le nouvel avatar circulaire
                const newFilename = `avatar_${Date.now()}${ext}`;
                const newFilePath = path.join(clientDir, newFilename);
                fs.writeFileSync(newFilePath, Buffer.from(base64Data, 'base64'));

                const relativeUrl = `Clients/${clientName}/${newFilename}`;
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({
                    success: true,
                    client: clientName,
                    avatarUrl: relativeUrl
                }));
            } catch (err) {
                console.error('Erreur /api/clients/avatar :', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // API : Renommer un client
    if (cleanUrl === '/api/clients/rename' && req.method === 'POST') {
        invalidateClientsCache();
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const oldName = (payload.client || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
                const rawNewName = (payload.newName || '').trim();
                const newName = rawNewName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');

                if (!oldName || !newName) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Noms invalides.' }));
                }

                const oldDir = path.join(clientsBasePath, oldName);
                const newDir = path.join(clientsBasePath, newName);

                if (!fs.existsSync(oldDir)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: `Client "${oldName}" introuvable.` }));
                }

                if (oldName !== newName && fs.existsSync(newDir)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: `Le nom "${newName}" existe déjà.` }));
                }

                if (oldName !== newName) {
                    fs.renameSync(oldDir, newDir);
                }

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ success: true, oldName, newName }));
            } catch (err) {
                console.error('Erreur /api/clients/rename :', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // -------------------------------------------------------------------------
    // API PROFIL MONTEUR (AVATAR CIRCULAIRE & SUPPRESSION ANCIENNE IMAGE)
    // -------------------------------------------------------------------------
    const profileDir = path.join(ROOT_DIR, '01_Assets', 'Profiles');
    const profileJsonPath = path.join(profileDir, 'profile.json');

    if (cleanUrl === '/api/monteur/profile' && req.method === 'GET') {
        try {
            if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
            let profileData = {
                name: 'Ndaraw',
                role: 'Monteur Pro & Directeur Artistique',
                avatarUrl: ''
            };
            if (fs.existsSync(profileJsonPath)) {
                try {
                    profileData = Object.assign(profileData, JSON.parse(fs.readFileSync(profileJsonPath, 'utf8')));
                } catch (e) {}
            }
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ success: true, profile: profileData }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message }));
        }
    }

    if (cleanUrl === '/api/monteur/profile/avatar' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const base64Data = payload.data;
                const rawFilename = payload.filename || 'avatar.jpg';
                const ext = path.extname(rawFilename).toLowerCase() || '.jpg';

                if (!base64Data) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Données image manquantes' }));
                }

                if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

                // Supprimer STRICTEMENT toutes les anciennes images d'avatar
                const existingFiles = fs.readdirSync(profileDir);
                for (const file of existingFiles) {
                    if (file.startsWith('avatar_') || file === 'avatar.jpg' || file === 'avatar.png' || file === 'avatar.webp') {
                        try {
                            fs.unlinkSync(path.join(profileDir, file));
                            console.log(`[Profil Monteur] Ancienne image supprimée : ${file}`);
                        } catch (e) {}
                    }
                }

                // Enregistrer la nouvelle image d'avatar
                const newFilename = `avatar_${Date.now()}${ext}`;
                const newFilePath = path.join(profileDir, newFilename);
                fs.writeFileSync(newFilePath, Buffer.from(base64Data, 'base64'));

                const relativeUrl = `01_Assets/Profiles/${newFilename}`;

                // Mettre à jour le fichier profile.json
                let currentProfile = { name: 'Ndaraw', role: 'Monteur Pro & Directeur Artistique' };
                if (fs.existsSync(profileJsonPath)) {
                    try { currentProfile = JSON.parse(fs.readFileSync(profileJsonPath, 'utf8')); } catch (e) {}
                }
                currentProfile.avatarUrl = relativeUrl;
                currentProfile.updatedAt = new Date().toISOString();
                fs.writeFileSync(profileJsonPath, JSON.stringify(currentProfile, null, 2), 'utf8');

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ success: true, avatarUrl: relativeUrl, profile: currentProfile }));
            } catch (err) {
                console.error('Erreur /api/monteur/profile/avatar :', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    if (cleanUrl === '/api/monteur/profile/update' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
                let currentProfile = { name: 'Ndaraw', role: 'Monteur Pro & Directeur Artistique', avatarUrl: '' };
                if (fs.existsSync(profileJsonPath)) {
                    try { currentProfile = JSON.parse(fs.readFileSync(profileJsonPath, 'utf8')); } catch (e) {}
                }
                if (payload.name) currentProfile.name = payload.name.trim();
                if (payload.role) currentProfile.role = payload.role.trim();
                currentProfile.updatedAt = new Date().toISOString();
                fs.writeFileSync(profileJsonPath, JSON.stringify(currentProfile, null, 2), 'utf8');

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ success: true, profile: currentProfile }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // -------------------------------------------------------------------------
    // API SKILLS GLOBAUX DU MONTEUR (PDF & MARKDOWN .MD DANS 00_Skills/Monteur/)
    // -------------------------------------------------------------------------
    const monteurSkillsDir = path.join(ROOT_DIR, '00_Skills', 'Monteur');
    if (!fs.existsSync(monteurSkillsDir)) {
        try { fs.mkdirSync(monteurSkillsDir, { recursive: true }); } catch (e) {}
    }

    if (cleanUrl === '/api/skills/monteur' && req.method === 'GET') {
        if (cachedSkillsResponseJson) {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(cachedSkillsResponseJson);
        }
        try {
            if (!fs.existsSync(monteurSkillsDir)) fs.mkdirSync(monteurSkillsDir, { recursive: true });
            const files = fs.readdirSync(monteurSkillsDir, { withFileTypes: true })
                .filter(f => f.isFile() && !f.name.startsWith('.'))
                .map(f => {
                    const fStat = fs.statSync(path.join(monteurSkillsDir, f.name));
                    return {
                        name: f.name,
                        size: fStat.size,
                        mtime: fStat.mtime,
                        ext: path.extname(f.name).toLowerCase(),
                        relativeUrl: `00_Skills/Monteur/${f.name}`
                    };
                });
            files.sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
            const skillsOut = JSON.stringify({ success: true, files });
            cachedSkillsResponseJson = skillsOut;
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(skillsOut);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message }));
        }
    }

    if (cleanUrl === '/api/skills/monteur/upload' && req.method === 'POST') {
        invalidateSkillsCache();
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const rawFilename = (payload.filename || `skill_${Date.now()}.md`).trim();
                const safeFilename = path.basename(rawFilename).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                const base64Data = payload.data;

                if (!base64Data) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Données de fichier manquantes' }));
                }

                if (!fs.existsSync(monteurSkillsDir)) fs.mkdirSync(monteurSkillsDir, { recursive: true });
                const targetFilePath = path.join(monteurSkillsDir, safeFilename);
                fs.writeFileSync(targetFilePath, Buffer.from(base64Data, 'base64'));

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({
                    success: true,
                    filename: safeFilename,
                    relativeUrl: `00_Skills/Monteur/${safeFilename}`
                }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    if (cleanUrl === '/api/skills/monteur/delete' && req.method === 'POST') {
        invalidateSkillsCache();
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const filename = path.basename(payload.filename || '');
                const targetFilePath = path.join(monteurSkillsDir, filename);
                if (fs.existsSync(targetFilePath)) {
                    fs.unlinkSync(targetFilePath);
                }
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ success: true, filename }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    if (cleanUrl === '/api/skills/monteur/content' && req.method === 'GET') {
        try {
            const fileName = path.basename(parsedUrl.query.file || '');
            const targetFilePath = path.join(monteurSkillsDir, fileName);
            if (!fs.existsSync(targetFilePath)) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Fichier non trouvé' }));
            }
            const content = fs.readFileSync(targetFilePath, 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ success: true, filename: fileName, content }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message }));
        }
    }

    // 1. API pour lister les fichiers des dossiers
    if (cleanUrl === '/api/files' && req.method === 'GET') {
        const chainesDir = path.join(USER_DATA_DIR, '03_Chaines');
        const videosDir = path.join(ROOT_DIR, '04_Videos');
        const rendusDir = path.join(ROOT_DIR, '08_Rendus');
        const channelsPath = path.join(ROOT_DIR, '07_Scripts', 'channels.json');

        let channels = [];
        try {
            if (fs.existsSync(channelsPath)) {
                channels = JSON.parse(fs.readFileSync(channelsPath, 'utf8') || '[]');
            }
        } catch (e) {}

        let videos = [];
        let rendus = [];

        function readVideoMetadata(filePath) {
            let status = 'completed';
            let duration = 20.0;
            let format = '16:9';
            let progress = 100;
            let phaseLabel = 'Terminée';
            let canResume = false;
            let currentStep = '';
            try {
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const head = content.slice(0, 2000);
                    const statusMatch = head.match(/status:\s*["']([^"']+)["']/i);
                    if (statusMatch) status = statusMatch[1];
                    
                    // Duration from stage data-duration or VIDEO_CONFIG
                    const stageMatch = content.match(/<div[^>]*id=["']stage["'][^>]*data-duration=["']([0-9.]+)["']/i);
                    if (stageMatch) {
                        duration = parseFloat(stageMatch[1]);
                    } else {
                        const configMatch = content.match(/VIDEO_CONFIG\s*=\s*\{[^}]*duration:\s*([0-9.]+)/i);
                        if (configMatch) {
                            duration = parseFloat(configMatch[1]);
                        } else {
                            const durMatch = content.match(/duration:\s*([0-9.]+)/i);
                            if (durMatch) duration = parseFloat(durMatch[1]);
                        }
                    }

                    // Format
                    const fmtMatch = content.match(/format:\s*["']([^"']+)["']/i) || content.match(/data-format=["']([^"']+)["']/i);
                    if (fmtMatch) {
                        format = fmtMatch[1];
                    } else {
                        const fn = path.basename(filePath).toLowerCase();
                        if (fn.includes('short') || fn.includes('tiktok') || fn.includes('reels') || fn.includes('9-16') || fn.includes('portrait')) {
                            format = '9:16';
                        }
                    }

                    // Détection automatique du Checkpoint (.checkpoint.json) pour reprise
                    const checkpointPath = filePath.replace(/\.html$/i, '') + '.checkpoint.json';
                    if (fs.existsSync(checkpointPath)) {
                        try {
                            const cp = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
                            if (cp.status) status = cp.status;
                            if (cp.progress !== undefined) progress = cp.progress;
                            if (cp.phaseLabel) phaseLabel = cp.phaseLabel;
                            if (cp.currentStep) currentStep = cp.currentStep;
                            if (status === 'processing' || status === 'interrupted' || cp.canResume) {
                                canResume = true;
                                if (status === 'completed') status = 'interrupted';
                            }
                        } catch (e) {}
                    }
                }
            } catch (e) {}
            return { status, duration, format, progress, phaseLabel, canResume, currentStep };
        }

        try {
            // A. Vidéos sans chaîne (04_Videos)
            if (fs.existsSync(videosDir)) {
                const standalone = fs.readdirSync(videosDir).filter(f => f.endsWith('.html'));
                standalone.forEach(file => {
                    const fullPath = path.join(videosDir, file);
                    const meta = readVideoMetadata(fullPath);
                    videos.push({
                        name: file,
                        file: file,
                        path: `04_Videos/${file}`,
                        isStandalone: true,
                        channelId: null,
                        channelName: null,
                        status: meta.status,
                        duration: meta.duration,
                        format: meta.format,
                        progress: meta.progress,
                        phaseLabel: meta.phaseLabel,
                        canResume: meta.canResume,
                        currentStep: meta.currentStep
                    });
                });
            }

            // B. Vidéos des chaînes / Créateurs (03_Chaines/<channelId>/...)
            if (fs.existsSync(chainesDir)) {
                const chFolders = fs.readdirSync(chainesDir, { withFileTypes: true }).filter(d => d.isDirectory());
                chFolders.forEach(chDir => {
                    const chFolderFull = path.join(chainesDir, chDir.name);
                    const chVids = fs.readdirSync(chFolderFull).filter(f => f.endsWith('.html'));
                    const chMeta = channels.find(c => c.id === chDir.name || c.name === chDir.name);
                    const chName = chMeta ? chMeta.name : chDir.name;
                    chVids.forEach(file => {
                        const fullPath = path.join(chFolderFull, file);
                        const meta = readVideoMetadata(fullPath);
                        videos.push({
                            name: file,
                            file: file,
                            path: `03_Chaines/${chDir.name}/${file}`,
                            isStandalone: false,
                            isClient: false,
                            channelId: chDir.name,
                            channelName: chName,
                            status: meta.status,
                            duration: meta.duration,
                            format: meta.format,
                            progress: meta.progress,
                            phaseLabel: meta.phaseLabel,
                            canResume: meta.canResume,
                            currentStep: meta.currentStep
                        });
                    });
                });
            }

            // B-bis. Vidéos des Clients du Monteur (Clients/<clientName>/*.html)
            const clientsBaseDir = path.join(USER_DATA_DIR, 'Clients');
            if (fs.existsSync(clientsBaseDir)) {
                const clientFolders = fs.readdirSync(clientsBaseDir, { withFileTypes: true }).filter(d => d.isDirectory());
                clientFolders.forEach(cDir => {
                    const clientFolderFull = path.join(clientsBaseDir, cDir.name);
                    const cVids = fs.readdirSync(clientFolderFull).filter(f => f.endsWith('.html'));
                    cVids.forEach(file => {
                        const fullPath = path.join(clientFolderFull, file);
                        const meta = readVideoMetadata(fullPath);
                        videos.push({
                            name: file,
                            file: file,
                            path: `Clients/${cDir.name}/${file}`,
                            isStandalone: false,
                            isClient: true,
                            clientName: cDir.name,
                            channelId: cDir.name,
                            channelName: cDir.name,
                            status: meta.status,
                            duration: meta.duration,
                            format: meta.format,
                            progress: meta.progress,
                            phaseLabel: meta.phaseLabel,
                            canResume: meta.canResume,
                            currentStep: meta.currentStep
                        });
                    });
                });
            }

            // C. Rendus MP4 (08_Rendus)
            if (fs.existsSync(rendusDir)) {
                rendus = fs.readdirSync(rendusDir)
                    .filter(f => f.endsWith('.mp4'))
                    .map(name => {
                        const stats = fs.statSync(path.join(rendusDir, name));
                        return {
                            name,
                            size: Math.round(stats.size / 1024) + ' Ko',
                            date: stats.mtime.toLocaleTimeString()
                        };
                    });
            }
        } catch (e) {
            console.error('Erreur lecture dossiers :', e);
        }

        // B-bis. Inclure les créations en cours issues d'activeCreationJobs
        for (const [jId, job] of activeCreationJobs.entries()) {
            if (job.status === 'processing') {
                const isJobClient = Boolean(job.isClient || job.clientName);
                const vidPath = job.videoUrl || (isJobClient ? `Clients/${job.clientName}/${job.fileName}` : (job.channelId ? `03_Chaines/${job.channelId}/${job.fileName}` : `04_Videos/${job.fileName}`));
                const existingIdx = videos.findIndex(v => v.path === vidPath || (job.fileName && (v.name === job.fileName || v.name === `${job.fileName}.html`)));
                if (existingIdx !== -1) {
                    videos[existingIdx].status = 'processing';
                    videos[existingIdx].jobId = jId;
                    if (isJobClient) videos[existingIdx].isClient = true;
                } else {
                    const cleanName = job.fileName ? (job.fileName.endsWith('.html') ? job.fileName : `${job.fileName}.html`) : 'Vidéo en cours...';
                    videos.unshift({
                        name: cleanName,
                        file: cleanName,
                        path: vidPath.endsWith('.html') ? vidPath : `${vidPath}.html`,
                        isStandalone: !job.channelId && !isJobClient,
                        isClient: isJobClient,
                        clientName: job.clientName || null,
                        channelId: job.channelId || null,
                        channelName: job.channelName || null,
                        status: 'processing',
                        jobId: jId,
                        duration: job.duration || 20,
                        format: job.format || '16:9'
                    });
                }
            }
        }

        // Dédoublonnage strict par chemin unique
        const seenPaths = new Set();
        videos = videos.filter(v => {
            if (!v.path || seenPaths.has(v.path)) return false;
            seenPaths.add(v.path);
            return true;
        });

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
        return res.end(JSON.stringify({ videos, rendus }));
    }

    // 1-BIS. API pour lister les templates de 06_Templates
    if (cleanUrl === '/api/templates' && req.method === 'GET') {
        const tplDir = path.join(ROOT_DIR, '06_Templates');
        let templates = [];
        try {
            if (fs.existsSync(tplDir)) {
                const files = fs.readdirSync(tplDir).filter(f => f.endsWith('.html'));
                templates = files.map(file => {
                    const id = path.basename(file, '.html');
                    let name = id.replace(/_/g, ' ');
                    let desc = 'Template vidéo prêt pour la composition.';
                    let icon = '';
                    let image = '/01_Assets/Images/styles/template_stikman_history.jpg';
                    if (id === 'Story_vox_style') {
                        name = 'Story Vox Style';
                        desc = 'Format explicatif visuel, infographies, schémas 2D & motion design.';
                        icon = '';
                        image = '/01_Assets/Images/styles/template_story_vox_style.jpg';
                    } else if (id === 'Saas_Motion_Design') {
                        name = 'Saas Motion Design';
                        desc = 'Présentation produit logiciel, interface moderne et focus features.';
                        icon = '';
                        image = '/01_Assets/Images/styles/template_saas_motion_design.jpg';
                    } else if (id === 'Stikman_history') {
                        name = 'Stikman History';
                        desc = 'Storytelling immersif, effet Ken Burns & zooms dynamiques.';
                        icon = '';
                        image = '/01_Assets/Images/styles/template_stikman_history.jpg';
                    } else if (id === 'Iman_Gadzhi_Style') {
                        name = 'Iman Gadzhi Style';
                        desc = 'Esthétique documentaire sombre, découpages papier & storytelling business.';
                        icon = '';
                        image = '/01_Assets/Images/styles/template_iman_gadzhi_style.jpg';
                    } else if (id === 'trash_style') {
                        name = 'Trash Style';
                        desc = 'Montage chaotique, punk edit, découpages papier & effets grunge énergiques.';
                        icon = '';
                        image = '/01_Assets/Images/styles/template_trash_style.jpg';
                    }
                    return { id, name, file, desc, icon, image };
                });
            }
        } catch (e) {
            console.error('Erreur lecture templates :', e);
        }
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
        return res.end(JSON.stringify(templates));
    }

    // 2. API pour obtenir l'état du rendu
    if (cleanUrl === '/api/render-status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
        return res.end(JSON.stringify(renderState));
    }

    // 3. API pour lancer un rendu
    if (cleanUrl === '/api/render' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            let data = {};
            try { data = JSON.parse(body); } catch (e) {}
            const videoName = data.video || 'demo-video.html';

            if (renderState.isRendering) {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: 'Un rendu est déjà en cours' }));
            }

            renderState = {
                isRendering: true,
                videoName,
                progress: 5,
                statusText: `Vérification de l'environnement...`,
                logs: [`Démarrage du rendu pour : ${videoName}`]
            };

            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
            res.end(JSON.stringify({ message: 'Rendu démarré', video: videoName }));

            // Exécution asynchrone du rendu
            executeRender(videoName);
        });
        return;
    }

    // 4. API pour annuler un rendu en cours
    if (cleanUrl === '/api/cancel-render' && req.method === 'POST') {
        if (currentRenderProcess && renderState.isRendering) {
            try {
                if (process.platform === 'win32') {
                    exec(`taskkill /pid ${currentRenderProcess.pid} /T /F`);
                } else {
                    currentRenderProcess.kill('SIGKILL');
                }
            } catch (e) {}
            currentRenderProcess = null;
            renderState.isRendering = false;
            setVideoProcessLock(false, 'render');
            renderState.statusText = 'Rendu interrompu par l\'utilisateur';
            renderState.progress = 0;
            renderState.logs.push('⛔ Rendu arrêté.');
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
            return res.end(JSON.stringify({ success: true, message: 'Rendu annulé' }));
        }
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: 'Aucun rendu en cours' }));
    }

    // 5. API pour supprimer une vidéo (avec nettoyage channels.json et anti-cache)
    if (cleanUrl === '/api/delete-video' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                const rawTarget = decodeURIComponent(data.video || data.path || data.file || data.videoPath || data.id || '').trim();
                let videoTarget = rawTarget.replace(/^(\.\.[\/\\])+/, '').replace(/^(\.[\/\\])+/, '').replace(/^[\\/\\]+/, '');
                if (!videoTarget && !data.title) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    return res.end(JSON.stringify({ error: 'Chemin de vidéo manquant' }));
                }

                const baseFn = videoTarget ? path.basename(videoTarget) : '';
                let foundPath = null;

                // Dossiers candidats de recherche (dans ROOT_DIR et USER_DATA_DIR)
                const searchDirs = [ROOT_DIR];
                if (typeof USER_DATA_DIR !== 'undefined' && USER_DATA_DIR && USER_DATA_DIR !== ROOT_DIR) searchDirs.push(USER_DATA_DIR);

                if (videoTarget) {
                    for (const baseDir of searchDirs) {
                        const directPath = path.join(baseDir, videoTarget);
                        if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
                            foundPath = directPath;
                            break;
                        }
                        const inVideos = path.join(baseDir, '04_Videos', baseFn);
                        if (fs.existsSync(inVideos) && fs.statSync(inVideos).isFile()) {
                            foundPath = inVideos;
                            break;
                        }
                        const inRendus = path.join(baseDir, '08_Rendus', baseFn);
                        if (fs.existsSync(inRendus) && fs.statSync(inRendus).isFile()) {
                            foundPath = inRendus;
                            break;
                        }

                        // Recherche dans 03_Chaines
                        const chDir = path.join(baseDir, '03_Chaines');
                        if (fs.existsSync(chDir)) {
                            try {
                                const subs = fs.readdirSync(chDir);
                                for (const s of subs) {
                                    const cand = path.join(chDir, s, baseFn);
                                    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
                                        foundPath = cand;
                                        break;
                                    }
                                }
                            } catch(e) {}
                        }
                        if (foundPath) break;

                        // Recherche dans Clients
                        const clientsDir = path.join(baseDir, 'Clients');
                        if (fs.existsSync(clientsDir)) {
                            try {
                                const subs = fs.readdirSync(clientsDir);
                                for (const s of subs) {
                                    const cand = path.join(clientsDir, s, baseFn);
                                    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
                                        foundPath = cand;
                                        break;
                                    }
                                }
                            } catch(e) {}
                        }
                        if (foundPath) break;
                    }
                }

                const allowedExts = ['.html', '.mp4', '.webm', '.mov', '.mkv'];
                if (foundPath && allowedExts.includes(path.extname(foundPath).toLowerCase())) {
                    fs.unlinkSync(foundPath);

                    // Supprimer également le MP4 rendu associé si on a supprimé le HTML
                    if (foundPath.endsWith('.html') && baseFn) {
                        const mp4Name = baseFn.replace(/\.html$/, '.mp4');
                        for (const bDir of searchDirs) {
                            const possibleMp4 = path.join(bDir, '08_Rendus', mp4Name);
                            if (fs.existsSync(possibleMp4)) {
                                try { fs.unlinkSync(possibleMp4); } catch(e) {}
                            }
                        }
                    }

                    // Synchroniser channels.json (dans ROOT_DIR et USER_DATA_DIR)
                    searchDirs.forEach(bDir => {
                        try {
                            const chJsonPath = path.join(bDir, '07_Scripts', 'channels.json');
                            if (fs.existsSync(chJsonPath)) {
                                let channels = JSON.parse(fs.readFileSync(chJsonPath, 'utf8') || '[]');
                                let changed = false;
                                channels.forEach(ch => {
                                    if (ch.videos && Array.isArray(ch.videos)) {
                                        const initLen = ch.videos.length;
                                        ch.videos = ch.videos.filter(v => (v.file !== baseFn && v.name !== baseFn && v.path !== videoTarget));
                                        if (ch.videos.length !== initLen) {
                                            ch.videoCount = ch.videos.length;
                                            changed = true;
                                        }
                                    }
                                });
                                if (changed) fs.writeFileSync(chJsonPath, JSON.stringify(channels, null, 2), 'utf8');
                            }
                        } catch(e) {}
                    });

                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
                    });
                    return res.end(JSON.stringify({ success: true, message: 'Vidéo supprimée avec succès : ' + (baseFn || videoTarget) }));
                }

                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                return res.end(JSON.stringify({ success: true, message: 'Entrée vidéo retirée' }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // 5b. API pour lister les assets existants (rétro-compatibilité)
    if (cleanUrl === '/api/assets-files' && req.method === 'GET') {
        const assetsDir = path.join(ROOT_DIR, '01_Assets');
        const getFiles = (dir) => {
            try {
                if (!fs.existsSync(dir)) return [];
                return fs.readdirSync(dir, { withFileTypes: true })
                    .filter(d => !d.isDirectory())
                    .map(d => d.name);
            } catch (e) { return []; }
        };
        const result = {
            images: getFiles(path.join(assetsDir, 'Images')),
            maps: getFiles(path.join(assetsDir, 'Maps')),
            voixOff: getFiles(path.join(assetsDir, 'Voix_Off')),
            musiques: getFiles(path.join(assetsDir, 'Musiques')),
            videos: getFiles(path.join(assetsDir, 'Videos'))
        };
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
        return res.end(JSON.stringify(result));
    }

    // Cache mémoire ultra-rapide pour le catalogue d'assets (évite les fs.statSync à répétition)
    let _assetsCatalogCache = null;
    let _assetsCatalogCacheTime = 0;
    function invalidateAssetsCatalogCache() {
        _assetsCatalogCache = null;
        _assetsCatalogCacheTime = 0;
    }

    // 5b-bis. API Catalogue Complet d'Assets Récursif (Médiathèque Avancée)
    if (cleanUrl === '/api/assets-catalog' && req.method === 'GET') {
        try {
            // Réponse instantanée < 1ms si le cache est récent (< 30s)
            if (_assetsCatalogCache && (Date.now() - _assetsCatalogCacheTime < 30000)) {
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=15',
                    'X-Cache': 'HIT'
                });
                return res.end(_assetsCatalogCache);
            }

            const assetsDir = path.join(ROOT_DIR, '01_Assets');
            const formatBytes = (bytes) => {
                if (!bytes || bytes === 0) return '0 B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
            };

            const detectType = (ext) => {
                ext = (ext || '').toLowerCase();
                if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.avif'].includes(ext)) return 'image';
                if (['.mp4', '.webm', '.mov', '.avi', '.mkv'].includes(ext)) return 'video';
                if (['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(ext)) return 'audio';
                if (['.svg'].includes(ext)) return 'vector';
                return 'other';
            };

            const items = [];
            let totalBytes = 0;
            let counter = 0;

            const walk = (currentDir, relFromAssets = '') => {
                if (!fs.existsSync(currentDir)) return;
                const entries = fs.readdirSync(currentDir, { withFileTypes: true });

                for (const entry of entries) {
                    if (entry.name.startsWith('.') || entry.name === '.gitkeep') continue;
                    const fullPath = path.join(currentDir, entry.name);
                    const subRel = relFromAssets ? `${relFromAssets}/${entry.name}` : entry.name;

                    if (entry.isDirectory()) {
                        walk(fullPath, subRel);
                    } else if (entry.isFile()) {
                        try {
                            const stats = fs.statSync(fullPath);
                            const ext = path.extname(entry.name).toLowerCase();
                            const parts = subRel.split('/');
                            const category = parts[0] || 'Général';
                            const subfolder = parts.length > 2 ? parts.slice(1, -1).join('/') : '';
                            const type = detectType(ext);

                            totalBytes += stats.size;
                            counter++;

                            items.push({
                                id: `asset_${counter}_${path.basename(entry.name, ext)}`,
                                name: entry.name,
                                category: category,
                                subfolder: subfolder || 'Racine',
                                relativePath: `01_Assets/${subRel}`,
                                url: `/01_Assets/${subRel.split('/').map(encodeURIComponent).join('/')}`,
                                type: type,
                                ext: ext,
                                size: stats.size,
                                sizeFormatted: formatBytes(stats.size),
                                mtime: stats.mtime.toISOString()
                            });
                        } catch (err) {
                            // Ignorer les fichiers non lisibles
                        }
                    }
                }
            };

            walk(assetsDir, '');

            // Tri par date de modification descendante par défaut
            items.sort((a, b) => new Date(b.mtime) - new Date(a.mtime));

            // Agréger les catégories et sous-dossiers
            const catMap = {};
            items.forEach(it => {
                if (!catMap[it.category]) {
                    catMap[it.category] = {
                        name: it.category,
                        count: 0,
                        subfolders: new Set(),
                        types: new Set()
                    };
                }
                catMap[it.category].count++;
                if (it.subfolder && it.subfolder !== 'Racine') {
                    catMap[it.category].subfolders.add(it.subfolder);
                }
                catMap[it.category].types.add(it.type);
            });

            const categories = Object.keys(catMap).sort().map(cat => ({
                name: cat,
                count: catMap[cat].count,
                subfolders: Array.from(catMap[cat].subfolders).sort(),
                types: Array.from(catMap[cat].types)
            }));

            // Stats globales
            const stats = {
                totalCount: items.length,
                totalSize: totalBytes,
                totalSizeFormatted: formatBytes(totalBytes),
                imagesCount: items.filter(i => i.type === 'image').length,
                videosCount: items.filter(i => i.type === 'video').length,
                audiosCount: items.filter(i => i.type === 'audio').length,
                vectorsCount: items.filter(i => i.type === 'vector').length,
                othersCount: items.filter(i => i.type === 'other').length,
                categoriesCount: categories.length
            };

            const payload = JSON.stringify({
                success: true,
                stats,
                categories,
                items
            });
            _assetsCatalogCache = payload;
            _assetsCatalogCacheTime = Date.now();

            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=15',
                'X-Cache': 'MISS'
            });
            return res.end(payload);
        } catch (err) {
            console.error('Erreur assets-catalog :', err);
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ error: err.message }));
        }
    }

    // 5b-ter. API pour supprimer un asset dans 01_Assets
    if (cleanUrl === '/api/delete-asset' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { relativePath } = JSON.parse(body || '{}');
                if (!relativePath || typeof relativePath !== 'string') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Chemin relatif manquant' }));
                }

                // Normalisation et sécurisation absolue : doit résider strictement dans 01_Assets
                const normalized = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
                const targetPath = path.resolve(ROOT_DIR, normalized);
                const assetsBase = path.resolve(ROOT_DIR, '01_Assets');

                if (!targetPath.startsWith(assetsBase)) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Action non autorisée en dehors de 01_Assets' }));
                }

                if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
                    fs.unlinkSync(targetPath);
                    invalidateAssetsCatalogCache();
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                    return res.end(JSON.stringify({ success: true, message: 'Fichier supprimé avec succès' }));
                }

                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Fichier introuvable' }));
            } catch (err) {
                console.error('Erreur delete-asset :', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // 5c. API pour uploader un fichier directement dans 01_Assets
    if (cleanUrl === '/api/upload-asset' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const category = (payload.category || 'Images').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
                const subfolder = (payload.subfolder || payload.channelId || '').trim().replace(/[^a-zA-Z0-9_\-\/]/g, '_');
                const rawFilename = payload.filename || `asset_${Date.now()}`;
                const safeName = path.basename(rawFilename).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                const base64Data = payload.data;

                if (!base64Data) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Données base64 manquantes' }));
                }

                const targetDir = subfolder 
                    ? path.join(ROOT_DIR, '01_Assets', category, subfolder) 
                    : path.join(ROOT_DIR, '01_Assets', category);

                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

                const targetFilePath = path.join(targetDir, safeName);
                const buffer = Buffer.from(base64Data, 'base64');
                fs.writeFileSync(targetFilePath, buffer);

                const relativePath = subfolder 
                    ? `01_Assets/${category}/${subfolder}/${safeName}` 
                    : `01_Assets/${category}/${safeName}`;

                invalidateAssetsCatalogCache();

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                return res.end(JSON.stringify({ 
                    success: true, 
                    filename: safeName, 
                    category,
                    subfolder,
                    relativePath 
                }));
            } catch (err) {
                console.error('Erreur upload-asset :', err);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // 5c-bis. API pour détourer une image ou vidéo sur fond vert (Chroma Keying)
    if (cleanUrl === '/api/chroma-key' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body || '{}');
                const { removeGreenScreen } = require('./chroma_key.cjs');
                let targetInput = '';

                if (payload.filePath) {
                    targetInput = path.resolve(ROOT_DIR, payload.filePath);
                } else if (payload.data && payload.filename) {
                    const tempDir = path.join(ROOT_DIR, '01_Assets', 'Temp');
                    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
                    targetInput = path.join(tempDir, `green_${Date.now()}_${path.basename(payload.filename)}`);
                    fs.writeFileSync(targetInput, Buffer.from(payload.data, 'base64'));
                }

                if (!targetInput || !fs.existsSync(targetInput)) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    return res.end(JSON.stringify({ error: 'Fichier source introuvable pour le détourage' }));
                }

                const ext = path.extname(targetInput).toLowerCase();
                const isVid = ['.mp4', '.mov', '.webm'].includes(ext);
                const outCat = isVid ? 'Videos' : 'Images';
                const outDir = path.join(ROOT_DIR, '01_Assets', outCat);
                if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

                const outExt = isVid ? '.webm' : '.png';
                const outName = `${path.basename(targetInput, ext)}_detoure_${Date.now().toString().slice(-4)}${outExt}`;
                const outputPath = path.join(outDir, outName);

                const result = await removeGreenScreen(targetInput, outputPath, {
                    color: payload.color || '0x00FF00',
                    similarity: payload.similarity !== undefined ? payload.similarity : 0.32,
                    blend: payload.blend !== undefined ? payload.blend : 0.10
                });

                const relOutPath = `01_Assets/${outCat}/${outName}`;
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                return res.end(JSON.stringify({
                    success: true,
                    type: result.type,
                    outputPath: relOutPath,
                    filename: outName
                }));
            } catch (chromaErr) {
                console.error('Erreur chroma-key API :', chromaErr);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: chromaErr.message }));
            }
        });
        return;
    }

    // 5d. API pour démarrer la génération vidéo IA autonome en tâche de fond (Temps réel)
    if (cleanUrl === '/api/create-video-start' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

                const isChan = Boolean(data.channelId);
                const rawFn = data.fileName || ('video_' + Date.now().toString().slice(-4));
                const cleanFn = rawFn.endsWith('.html') ? rawFn : `${rawFn}.html`;
                const expectedPath = isChan ? `03_Chaines/${data.channelId}/${cleanFn}` : `04_Videos/${cleanFn}`;

                const jobState = {
                    id: jobId,
                    status: 'processing',
                    currentStep: 'step_init',
                    phaseLabel: 'Initialisation du pipeline IA...',
                    progress: 5,
                    steps: [],
                    logs: [
                        { time: new Date().toTimeString().split(' ')[0], text: '[SYSTEM] Démarrage du pipeline IA...', type: 'info' }
                    ],
                    videoUrl: expectedPath,
                    fileName: cleanFn,
                    channelId: data.channelId || null,
                    format: data.format || '16:9',
                    duration: data.duration || 20,
                    error: null
                };
                activeCreationJobs.set(jobId, jobState);

                // Lancement asynchrone autonome du pipeline IA (ne bloque pas le serveur HTTP)
                (async () => {
                    setVideoProcessLock(true, 'creation');
                    try {
                        const result = await runAiVideoPipeline(data, (stepId, phaseLabel, percent, logMsg, logType, extraData) => {
                            jobState.currentStep = stepId;
                            jobState.phaseLabel = phaseLabel;
                            jobState.progress = percent;
                            if (extraData && extraData.steps && Array.isArray(extraData.steps)) {
                                jobState.steps = extraData.steps;
                            }
                            jobState.logs.push({
                                time: new Date().toTimeString().split(' ')[0],
                                text: logMsg,
                                type: logType || 'info'
                            });
                        });

                        jobState.status = 'completed';
                        jobState.progress = 100;
                        jobState.phaseLabel = 'Vidéo prête à être montée !';
                        jobState.videoUrl = result.videoUrl;
                        jobState.fileName = result.fileName;
                        jobState.logs.push({
                            time: new Date().toTimeString().split(' ')[0],
                            text: `✓ Processus 100% terminé ! Accès au Studio prêt : ${result.videoUrl}`,
                            type: 'success'
                        });

                        // Nettoyage automatique du dossier scratch une fois la vidéo complètement créée
                        setVideoProcessLock(false, 'creation');
                        cleanupScratch({
                            logger: (msg) => {
                                jobState.logs.push({
                                    time: new Date().toTimeString().split(' ')[0],
                                    text: msg,
                                    type: 'info'
                                });
                            }
                        });
                    } catch (pipelineErr) {
                        setVideoProcessLock(false, 'creation');
                        console.error('[AiVideoPipeline Error]:', pipelineErr);
                        jobState.status = 'error';
                        jobState.error = pipelineErr.message;
                        jobState.logs.push({
                            time: new Date().toTimeString().split(' ')[0],
                            text: `❌ Erreur du pipeline : ${pipelineErr.message}`,
                            type: 'error'
                        });
                    }
                })();

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                return res.end(JSON.stringify({ 
                    success: true, 
                    jobId: jobId 
                }));
            } catch (err) {
                console.error('Erreur create-video-start :', err);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // 5d bis. API pour reprendre une création de vidéo interrompue (/api/create-video-resume)
    if (cleanUrl === '/api/create-video-resume' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                const videoTarget = data.video;
                if (!videoTarget) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    return res.end(JSON.stringify({ error: "Chemin vidéo manquant pour la reprise" }));
                }

                const fullDisk = path.resolve(ROOT_DIR, videoTarget);
                const checkpointPath = fullDisk.replace(/\.html$/i, '') + '.checkpoint.json';
                let resumePayload = { ...data, resume: true, targetVideo: videoTarget };

                if (fs.existsSync(checkpointPath)) {
                    try {
                        const cp = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
                        if (cp.payload) {
                            resumePayload = { ...cp.payload, ...data, resume: true, targetVideo: videoTarget };
                        }
                    } catch (e) {
                        console.warn("[Resume API] Erreur lecture checkpoint:", e.message);
                    }
                }

                const jobId = `job_resume_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                const jobState = {
                    id: jobId,
                    status: 'processing',
                    currentStep: 'step_resume',
                    phaseLabel: 'Reprise séquentielle de la création...',
                    progress: 25,
                    steps: [],
                    logs: [
                        { time: new Date().toTimeString().split(' ')[0], text: `[REPRISE] Reprise du pipeline séquentiel pour : ${videoTarget}`, type: 'info' }
                    ],
                    videoUrl: videoTarget,
                    fileName: path.basename(videoTarget),
                    channelId: data.channelId || resumePayload.channelId || null,
                    format: resumePayload.format || '16:9',
                    duration: resumePayload.duration || 20,
                    error: null
                };
                activeCreationJobs.set(jobId, jobState);

                // Lancement asynchrone du pipeline avec reprise
                (async () => {
                    setVideoProcessLock(true, 'creation');
                    try {
                        const result = await runAiVideoPipeline(resumePayload, (stepId, phaseLabel, percent, logMsg, logType, extraData) => {
                            jobState.currentStep = stepId;
                            jobState.phaseLabel = phaseLabel;
                            jobState.progress = percent;
                            if (extraData && extraData.steps && Array.isArray(extraData.steps)) {
                                jobState.steps = extraData.steps;
                            }
                            jobState.logs.push({
                                time: new Date().toTimeString().split(' ')[0],
                                text: logMsg,
                                type: logType || 'info'
                            });
                        });

                        jobState.status = 'completed';
                        jobState.progress = 100;
                        jobState.phaseLabel = 'Vidéo prête à être montée !';
                        jobState.videoUrl = result.videoUrl;
                        jobState.fileName = result.fileName;
                        jobState.logs.push({
                            time: new Date().toTimeString().split(' ')[0],
                            text: `✓ Processus 100% finalisé après reprise ! Accès au Studio prêt : ${result.videoUrl}`,
                            type: 'success'
                        });

                        // Nettoyage automatique du dossier scratch une fois la vidéo complètement créée
                        setVideoProcessLock(false, 'creation');
                        cleanupScratch({
                            logger: (msg) => {
                                jobState.logs.push({
                                    time: new Date().toTimeString().split(' ')[0],
                                    text: msg,
                                    type: 'info'
                                });
                            }
                        });
                    } catch (pipelineErr) {
                        setVideoProcessLock(false, 'creation');
                        console.error('[AiVideoPipeline Resume Error]:', pipelineErr);
                        jobState.status = 'error';
                        jobState.error = pipelineErr.message;
                        jobState.logs.push({
                            time: new Date().toTimeString().split(' ')[0],
                            text: `❌ Erreur lors de la reprise : ${pipelineErr.message}`,
                            type: 'error'
                        });
                    }
                })();

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ success: true, jobId }));
            } catch (err) {
                console.error('Erreur create-video-resume :', err);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // 5e. API pour suivre le statut et les logs en direct de la génération vidéo (/api/creation-status?jobId=...)
    if (req.url.startsWith('/api/creation-status') && req.method === 'GET') {
        const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
        const jobId = parsedUrl.searchParams.get('jobId');
        const videoParam = parsedUrl.searchParams.get('video');

        let job = null;
        if (jobId && activeCreationJobs.has(jobId)) {
            job = activeCreationJobs.get(jobId);
        } else if (videoParam) {
            // Recherche par chemin relatif de vidéo
            for (const j of activeCreationJobs.values()) {
                if (j.videoUrl === videoParam || j.fileName === videoParam) {
                    job = j;
                    break;
                }
            }
        }

        if (!job) {
            // Vérifier si le fichier HTML existe réellement sur le disque
            let diskExists = false;
            let resolvedUrl = videoParam || '';
            if (videoParam) {
                const fullDisk = path.resolve(ROOT_DIR, videoParam);
                diskExists = fs.existsSync(fullDisk);
                if (diskExists) {
                    let fileStatus = 'completed';
                    try {
                        const content = fs.readFileSync(fullDisk, 'utf8');
                        const statusMatch = content.match(/status:\s*["']([^"']+)["']/i);
                        if (statusMatch) fileStatus = statusMatch[1];
                    } catch (e) { }

                    const checkpointPath = fullDisk.replace(/\.html$/i, '') + '.checkpoint.json';
                    let checkpoint = null;
                    if (fs.existsSync(checkpointPath)) {
                        try { checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf8')); } catch (e) { }
                    }

                    if (fileStatus === 'processing' || (checkpoint && checkpoint.status === 'processing')) {
                        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                        return res.end(JSON.stringify({ 
                            success: true, 
                            status: 'interrupted', 
                            canResume: true,
                            currentStep: checkpoint?.currentStep || 'step_init',
                            progress: checkpoint?.progress || 35, 
                            phaseLabel: checkpoint?.phaseLabel || 'Création interrompue — Reprise possible',
                            steps: checkpoint?.steps || [],
                            videoUrl: resolvedUrl,
                            logs: checkpoint?.logs || [{ time: new Date().toTimeString().split(' ')[0], text: 'Création en attente de reprise. Cliquez sur "Reprendre la génération".', type: 'warning' }]
                        }));
                    } else {
                        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                        return res.end(JSON.stringify({ 
                            success: true, 
                            status: 'completed', 
                            progress: 100, 
                            phaseLabel: 'Vidéo prête',
                            videoUrl: resolvedUrl,
                            logs: [{ time: new Date().toTimeString().split(' ')[0], text: '✓ Vidéo prête sur le disque.', type: 'success' }]
                        }));
                    }
                }
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                return res.end(JSON.stringify({ 
                    success: false, 
                    status: 'not_found', 
                    progress: 0, 
                    phaseLabel: 'En attente du démarrage...',
                    error: 'Fichier vidéo ou tâche introuvable'
                }));
            }
        }

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
        return res.end(JSON.stringify({
            success: true,
            status: job.status,
            currentStep: job.currentStep,
            phaseLabel: job.phaseLabel,
            progress: job.progress,
            steps: job.steps || [],
            logs: job.logs,
            videoUrl: job.videoUrl,
            error: job.error
        }));
    }

    // 5f. API synchrone de génération (rétrocompatibilité)
    if (cleanUrl === '/api/create-video' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            setVideoProcessLock(true, 'creation');
            try {
                const data = JSON.parse(body || '{}');
                const result = await runAiVideoPipeline(data, (stepId, phaseLabel, percent, logMsg) => {
                    console.log(`[AI Pipeline ${percent}%] ${logMsg}`);
                });

                setVideoProcessLock(false, 'creation');
                cleanupScratch();

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                return res.end(JSON.stringify({ 
                    success: true, 
                    fileName: result.fileName, 
                    videoUrl: result.videoUrl 
                }));
            } catch (err) {
                setVideoProcessLock(false, 'creation');
                console.error('Erreur create-video synchrone :', err);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // 5e. API pour sauvegarder ou charger les clés & paramètres dans api_config.json
    
    // -------------------------------------------------------------------------
    // API KOMBO IA & DÉTECTION AGENTS LOCAUX (Claude Code, Antigravity, Groq, OpenRouter)
    // -------------------------------------------------------------------------
    if (cleanUrl === '/api/ai/detect' && req.method === 'GET') {
        try {
            const { detectLocalAiAgents } = require('./ai_kombo.cjs');
            const agents = detectLocalAiAgents();
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store, no-cache, must-revalidate'
            });
            return res.end(JSON.stringify({ success: true, agents }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, error: err.message }));
        }
    }

    if (cleanUrl === '/api/ai/test-provider' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { testSingleProvider } = require('./ai_kombo.cjs');
                const data = JSON.parse(body || '{}');
                const result = await testSingleProvider(data.provider, data);
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-store, no-cache, must-revalidate'
                });
                return res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    if (cleanUrl === '/api/settings') {
        const configPath = getResolvedConfigPath();

        if (req.method === 'GET') {
            try {
                let cfg = {};
                if (fs.existsSync(configPath)) {
                    cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                } else {
                    cfg = { ...DEFAULT_CONFIG };
                }
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                return res.end(JSON.stringify(cfg));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        }

        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    let existingCfg = {};
                    if (fs.existsSync(configPath)) {
                        existingCfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    } else {
                        existingCfg = { ...DEFAULT_CONFIG };
                    }
                    const incoming = JSON.parse(body || '{}');
                    const updated = { ...existingCfg, ...incoming };
                    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf8');

                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                    return res.end(JSON.stringify({ success: true, settings: updated }));
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    return res.end(JSON.stringify({ error: err.message }));
                }
            });
            return;
        }
    }

    // 5e0. API de Gestion de la Feuille de Route Unique (Roadmap IA avant création)
    if (cleanUrl === '/api/generate-roadmap' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body || '{}');
                const { generateRoadmap } = require('./roadmap_generator.cjs');
                const result = await generateRoadmap(payload);
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify(result));
            } catch (err) {
                console.error('Erreur generate-roadmap :', err);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    if (cleanUrl === '/api/save-roadmap' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                const { saveRoadmap } = require('./roadmap_generator.cjs');
                const result = saveRoadmap(data.content);
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify(result));
            } catch (err) {
                console.error('Erreur save-roadmap :', err);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    if (cleanUrl === '/api/validate-roadmap' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                const { validateAndClearRoadmap } = require('./roadmap_generator.cjs');
                const result = validateAndClearRoadmap(data.content);
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify(result));
            } catch (err) {
                console.error('Erreur validate-roadmap :', err);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    if (cleanUrl === '/api/get-roadmap' && req.method === 'GET') {
        try {
            const { getRoadmap } = require('./roadmap_generator.cjs');
            const result = getRoadmap();
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify(result));
        } catch (err) {
            console.error('Erreur get-roadmap :', err);
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ error: err.message }));
        }
    }

    // 5e1. API d'intégration Coverr.co (Recherche, Test & Téléchargement)
    if (req.url.startsWith('/api/coverr')) {
        const coverrModule = require('./coverr.cjs');

        // Test de clé API Coverr
        if (cleanUrl === '/api/coverr/test' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body || '{}');
                    const testResult = await coverrModule.testCoverrKey(data.key);
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                    return res.end(JSON.stringify(testResult));
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    return res.end(JSON.stringify({ valid: false, error: e.message }));
                }
            });
            return;
        }

        // Recherche de vidéos Coverr
        if (req.url.startsWith('/api/coverr/search') && req.method === 'GET') {
            try {
                const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
                const query = parsedUrl.searchParams.get('query') || 'nature';
                const page = parseInt(parsedUrl.searchParams.get('page') || '0', 10);
                const pageSize = parseInt(parsedUrl.searchParams.get('page_size') || '15', 10);
                const verticalParam = parsedUrl.searchParams.get('vertical');
                const isVertical = verticalParam !== null ? (verticalParam === 'true' || verticalParam === '1') : null;
                const apiKey = parsedUrl.searchParams.get('key') || '';

                const searchResults = await coverrModule.searchCoverrVideos(query, {
                    apiKey,
                    page,
                    pageSize,
                    isVertical
                });

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                return res.end(JSON.stringify(searchResults));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        }

        // Téléchargement d'une vidéo Coverr vers les assets locaux
        if (cleanUrl === '/api/coverr/download' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body || '{}');
                    if (!data.url) {
                        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        return res.end(JSON.stringify({ error: 'URL vidéo manquante' }));
                    }

                    const safeName = (data.filename || `coverr_${Date.now()}.mp4`).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                    const targetSubDir = data.channelId ? path.join('01_Assets', 'Videos', data.channelId) : path.join('01_Assets', 'Videos');
                    const targetFullDir = path.join(ROOT_DIR, targetSubDir);
                    const destPath = path.join(targetFullDir, safeName);

                    await coverrModule.downloadCoverrVideo(data.url, destPath);

                    const relativePath = path.relative(ROOT_DIR, destPath).replace(/\\/g, '/');

                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                    return res.end(JSON.stringify({
                        success: true,
                        message: 'Vidéo Coverr téléchargée avec succès dans les assets !',
                        path: relativePath,
                        filename: safeName
                    }));
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    return res.end(JSON.stringify({ error: e.message }));
                }
            });
            return;
        }
    }

    // 5e2. API pour gérer les chaînes utilisateur créées (channels.json & dossiers 03_Chaines)
    if (req.url.startsWith('/api/channels')) {
        const channelsPath = path.join(ROOT_DIR, '07_Scripts', 'channels.json');
        const chainesBaseDir = path.join(USER_DATA_DIR, '03_Chaines');
        if (!fs.existsSync(chainesBaseDir)) fs.mkdirSync(chainesBaseDir, { recursive: true });

        const readChannels = () => {
            let channels = [];
            try {
                if (fs.existsSync(channelsPath)) {
                    channels = JSON.parse(fs.readFileSync(channelsPath, 'utf8') || '[]');
                }
            } catch (e) {}

            // Mettre à jour en direct les vidéos depuis les dossiers 03_Chaines/<channelId>
            channels.forEach(ch => {
                const chFolder = path.join(chainesBaseDir, ch.id);
                if (fs.existsSync(chFolder)) {
                    const files = fs.readdirSync(chFolder).filter(f => f.endsWith('.html'));
                    ch.videoCount = files.length;
                    ch.videos = files.map(f => ({
                        file: f,
                        path: `03_Chaines/${ch.id}/${f}`,
                        title: f.replace(/\.html$/, '').replace(/[-_]/g, ' ')
                    }));
                } else {
                    fs.mkdirSync(chFolder, { recursive: true });
                    ch.videoCount = ch.videoCount || 0;
                    ch.videos = ch.videos || [];
                }
            });

            return channels;
        };

        const avatarsBaseDir = path.join(ROOT_DIR, '01_Assets', 'Images', 'channels');
        if (!fs.existsSync(avatarsBaseDir)) fs.mkdirSync(avatarsBaseDir, { recursive: true });

        const processChannelAvatars = (channelsList) => {
            channelsList.forEach(ch => {
                if (ch.avatar && typeof ch.avatar === 'string' && ch.avatar.startsWith('data:image/')) {
                    try {
                        const matches = ch.avatar.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
                        if (matches) {
                            const ext = (matches[1] === 'jpeg' ? 'jpg' : matches[1]).toLowerCase();
                            const fileName = `avatar_${ch.id}.${ext}`;
                            const filePath = path.join(avatarsBaseDir, fileName);
                            fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
                            ch.avatar = `01_Assets/Images/channels/${fileName}`;
                        }
                    } catch(e) {}
                }
            });
        };

        const writeChannels = (channels) => {
            processChannelAvatars(channels);
            fs.writeFileSync(channelsPath, JSON.stringify(channels, null, 2), 'utf8');
        };

        if (req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
            return res.end(JSON.stringify(readChannels()));
        }

        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body || '{}');
                    let channels = readChannels();

                    // Si c'est un tableau complet de remplacement
                    if (Array.isArray(data)) {
                        channels = data;
                        channels.forEach(ch => {
                            const dir = path.join(chainesBaseDir, ch.id);
                            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                        });
                    } else if (data.id) {
                        // Ajout ou mise à jour d'une chaîne
                        const existingIdx = channels.findIndex(c => c.id === data.id);
                        if (existingIdx >= 0) {
                            channels[existingIdx] = { ...channels[existingIdx], ...data };
                        } else {
                            channels.push(data);
                        }
                        const dir = path.join(chainesBaseDir, data.id);
                        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    }
                    writeChannels(channels);
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                    return res.end(JSON.stringify({ success: true, channels }));
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    return res.end(JSON.stringify({ error: err.message }));
                }
            });
            return;
        }

        if (req.method === 'DELETE') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
                    const queryId = parsedUrl.searchParams.get('id');
                    let targetId = queryId;
                    if (!targetId && body) {
                        try { targetId = JSON.parse(body).id; } catch(e){}
                    }

                    if (!targetId) {
                        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        return res.end(JSON.stringify({ error: 'ID de chaîne manquant' }));
                    }

                    let channels = readChannels();
                    channels = channels.filter(c => c.id !== targetId);
                    writeChannels(channels);

                    // Supprimer également le dossier de la chaîne dans 03_Chaines
                    const chFolder = path.join(chainesBaseDir, targetId);
                    if (fs.existsSync(chFolder)) {
                        fs.rmSync(chFolder, { recursive: true, force: true });
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                    return res.end(JSON.stringify({ success: true, channels }));
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    return res.end(JSON.stringify({ error: err.message }));
                }
            });
            return;
        }
    }

    // 5e3. API pour ouvrir directement l'explorateur Windows dans le dossier sécurisé AutoFrame (%APPDATA%/AutoFrame)
    if (cleanUrl === '/api/open-projects-folder') {
        const targetOpen = USER_DATA_DIR;
        const { exec } = require('child_process');
        if (process.platform === 'win32') {
            exec(`explorer "${targetOpen.replace(/\//g, '\\')}"`);
        } else if (process.platform === 'darwin') {
            exec(`open "${targetOpen}"`);
        } else {
            exec(`xdg-open "${targetOpen}"`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
        return res.end(JSON.stringify({ success: true, path: targetOpen }));
    }

    // 5f. API pour lister les voix ElevenLabs (créées et par défaut)
    if (req.url.startsWith('/api/elevenlabs/voices')) {
        const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
        let savedKey = '';
        try {
            const configPath = getResolvedConfigPath();
            if (fs.existsSync(configPath)) {
                savedKey = JSON.parse(fs.readFileSync(configPath, 'utf8')).elevenlabs_api_key || '';
            }
        } catch(e) {}
        const queryKey = parsedUrl.searchParams.get('key') || savedKey;

        const handleFetchVoices = async (keyToUse) => {
            try {
                const { fetchElevenLabsVoices } = require('./generate_voice.cjs');
                const result = await fetchElevenLabsVoices(keyToUse || savedKey);
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                return res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ success: true, customVoices: [], defaultVoices: [], isFallback: true, error: err.message }));
            }
        };

        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                let data = {};
                try { data = JSON.parse(body || '{}'); } catch (e) {}
                handleFetchVoices(data.apiKey || queryKey);
            });
            return;
        } else {
            handleFetchVoices(queryKey);
            return;
        }
    }

    // 5f-bis. API pour obtenir le statut et crédits restants ElevenLabs
    if (req.url.startsWith('/api/elevenlabs/subscription')) {
        const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
        let savedKey = '';
        try {
            const configPath = getResolvedConfigPath();
            if (fs.existsSync(configPath)) {
                savedKey = JSON.parse(fs.readFileSync(configPath, 'utf8')).elevenlabs_api_key || '';
            }
        } catch(e) {}
        const queryKey = parsedUrl.searchParams.get('key') || savedKey;

        const handleFetchSub = async (keyToUse) => {
            try {
                const { fetchElevenLabsSubscription } = require('./generate_voice.cjs');
                const result = await fetchElevenLabsSubscription(keyToUse || savedKey);
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                return res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        };

        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                let data = {};
                try { data = JSON.parse(body || '{}'); } catch (e) {}
                handleFetchSub(data.apiKey || queryKey);
            });
            return;
        } else {
            handleFetchSub(queryKey);
            return;
        }
    }

    // 5f-ter. API pour lister les voix Edge TTS (100% Gratuit)
    if (req.url.startsWith('/api/edge/voices')) {
        try {
            const { fetchEdgeVoices } = require('./generate_voice.cjs');
            const result = await fetchEdgeVoices();
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
            return res.end(JSON.stringify(result));
        } catch (err) {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ success: true, voices: [], frenchVoices: [], englishVoices: [], isFallback: true, error: err.message }));
        }
    }

    // 5f-quater. API pour prévisualiser/écouter une voix Edge TTS
    if (req.url.startsWith('/api/edge/preview')) {
        const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
        const voice = parsedUrl.searchParams.get('voice') || 'fr-FR-HenriNeural';
        const sampleText = parsedUrl.searchParams.get('text') || "Bonjour, ceci est un test de voix avec Edge TTS dans MarvidFlow.";
        
        try {
            const { generateEdgeTTS } = require('./generate_voice.cjs');
            const previewDir = path.join(ROOT_DIR, '01_Assets', 'Voix_Off', 'previews');
            if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });
            
            const safeVoice = voice.replace(/[^a-zA-Z0-9_\-]/g, '_');
            const previewFile = path.join(previewDir, `preview_edge_${safeVoice}.mp3`);
            
            // Générer seulement si pas encore en cache
            if (!fs.existsSync(previewFile) || fs.statSync(previewFile).size < 100) {
                await generateEdgeTTS({
                    text: sampleText,
                    voiceId: voice,
                    outputPath: previewFile
                });
            }

            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({
                success: true,
                voice,
                audioUrl: `/01_Assets/Voix_Off/previews/preview_edge_${safeVoice}.mp3`
            }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ error: err.message }));
        }
    }

    // 5g. API pour générer une voix off via Edge TTS ou ElevenLabs
    if (cleanUrl === '/api/tts/generate' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { generateVoice } = require('./generate_voice.cjs');
                const data = JSON.parse(body || '{}');
                const { text, apiKey, voiceId, modelId, filename, engine } = data;

                if (!text || !text.trim()) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    return res.end(JSON.stringify({ error: 'Texte manquant pour la voix off' }));
                }

                const safeName = filename 
                    ? path.basename(filename).replace(/[^a-zA-Z0-9_\-\.]/g, '_')
                    : `voix_off_${Date.now()}.mp3`;

                const outPath = path.join(ROOT_DIR, '01_Assets', 'Voix_Off', safeName);

                const result = await generateVoice({
                    text: text.trim(),
                    engine: engine || 'edge',
                    key: apiKey,
                    voice: voiceId,
                    model: modelId,
                    out: outPath
                });

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                return res.end(JSON.stringify({
                    success: true,
                    engine: result.engine || engine || 'edge',
                    voice: result.voice,
                    model: result.model,
                    filename: safeName,
                    relativePath: `01_Assets/Voix_Off/${safeName}`,
                    sizeBytes: result.sizeBytes
                }));
            } catch (err) {
                console.error('Erreur génération TTS :', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // 5h. API YouTube Clip & Transcription
    if (cleanUrl === '/api/youtube/info' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { getVideoInfo } = require('./youtube_clip.cjs');
                const data = JSON.parse(body || '{}');
                const info = await getVideoInfo(data.url);
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                return res.end(JSON.stringify({ success: true, info }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    if (cleanUrl === '/api/youtube/transcript' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { getVideoTranscript } = require('./youtube_clip.cjs');
                const data = JSON.parse(body || '{}');
                const result = await getVideoTranscript(data.url, data.lang || 'fr');
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                return res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    if (cleanUrl === '/api/youtube/download' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { downloadClip } = require('./youtube_clip.cjs');
                const data = JSON.parse(body || '{}');
                const result = await downloadClip({
                    url: data.url,
                    start: data.start,
                    end: data.end,
                    outputPath: data.out
                });
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                return res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    if (cleanUrl === '/api/youtube/thumbnail' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { downloadThumbnail } = require('./youtube_clip.cjs');
                const data = JSON.parse(body || '{}');
                const result = await downloadThumbnail({
                    url: data.url,
                    outputPath: data.out
                });
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                return res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    if (cleanUrl === '/api/youtube/data' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { getVideoData } = require('./youtube_clip.cjs');
                const data = JSON.parse(body || '{}');
                const result = await getVideoData({
                    url: data.url,
                    outputPath: data.out
                });
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                return res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // 5i. API Cartes (Maps HD sans watermark)
    if (cleanUrl === '/api/maps/generate' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { captureMap } = require('./fetch_map.cjs');
                const data = JSON.parse(body || '{}');
                const isVertical = data.format === '9:16';
                const width = isVertical ? 1080 : (data.width || 1920);
                const height = isVertical ? 1920 : (data.height || 1080);

                const result = await captureMap({
                    query: data.query,
                    lat: data.lat !== undefined ? parseFloat(data.lat) : undefined,
                    lon: data.lon !== undefined ? parseFloat(data.lon) : undefined,
                    zoom: data.zoom ? parseInt(data.zoom, 10) : 12,
                    style: data.style || 'dark',
                    pin: !!data.pin,
                    pinColor: data.pinColor || '#ff3344',
                    width,
                    height,
                    outPath: data.out
                });
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
                return res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // 5j. API de modification IA de la vidéo active (Assistant Chat Studio)
    if (cleanUrl === '/api/modify-video' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const payloadIn = JSON.parse(body || '{}');
                const videoPathRel = (payloadIn.videoPath || '').trim();
                const instruction = (payloadIn.instruction || '').trim();

                if (!videoPathRel) throw new Error("Paramètre 'videoPath' manquant.");
                if (!instruction) throw new Error("Paramètre 'instruction' manquant.");

                const fullPath = path.resolve(ROOT_DIR, videoPathRel);
                if (!fullPath.startsWith(ROOT_DIR)) throw new Error("Accès interdit hors du projet.");
                if (!fs.existsSync(fullPath)) throw new Error("Fichier introuvable : " + videoPathRel);

                const currentCode = fs.readFileSync(fullPath, 'utf8');

                // Chargement de la configuration API
                const apiCfg = (() => {
                    const cPath = getResolvedConfigPath();
                    if (fs.existsSync(cPath)) {
                        try { return JSON.parse(fs.readFileSync(cPath, 'utf8')); } catch (e) {}
                    }
                    return {};
                })();

                console.log("[Studio Chat] Message reçu sur " + videoPathRel + " : « " + instruction + " »");

                // Appel via le Kombo IA Multi-Modèles (Gemini, Groq, Claude Code CLI, OpenRouter, Antigravity)
                const { callAiKombo } = require('./ai_kombo.cjs');
                const systemPrompt = "Tu es l'assistant IA créatif et motion designer de AutoFrame pour le studio de montage vidéo.\n" +
                    "L'utilisateur s'adresse à toi dans l'interface de discussion dédiée à la vidéo en cours d'édition (" + path.basename(videoPathRel) + ").\n\n" +
                    "DÉCISION D'INTENTION CRUCIALE :\n" +
                    "1. TYPE 'reply' (Question, salutation, discussion, conseil ou explication) :\n" +
                    "   Exemples : « salut », « bonjour », « que fait cette vidéo ? », « c'est quoi GSAP ? », « propose-moi 3 idées d'accroche », « quelle est la durée ? », « comment ça marche ? »...\n" +
                    "   -> NE MODIFIE SURTOUT AUCUN CODE. Réponds amicalement, professionnellement et directement à sa question ou salutation dans le champ 'reply'.\n\n" +
                    "2. TYPE 'modify' (Demande concrète de modification, ajout, suppression, style ou animation sur la vidéo) :\n" +
                    "   Exemples : « change le fond en noir », « ajoute une animation de titre au début », « supprime le sous-titre », « mets le texte en rouge », « accélère l'intro »...\n" +
                    "   -> Applique les changements sur le code HTML fourni avec précision chirurgicale.\n" +
                    "   -> Conserve impérativement intacte l'interface window.__timeline (seek, pause, play, duration), les styles et la structure GSAP.\n" +
                    "   -> Fournis le code HTML complet modifié dans 'html', et explique brièvement ce que tu as fait dans 'reply'.\n\n" +
                    "RÉPONDS STRICTEMENT AU FORMAT JSON avec cette structure exacte :\n" +
                    "{\n" +
                    '  "action": "reply" ou "modify",\n' +
                    '  "reply": "Ton message explicatif ou ta reponse textuelle",\n' +
                    '  "html": "Le code HTML complet modifie UNIQUEMENT si action === \\"modify\\" (laisse null si action === \\"reply\\")"\n' +
                    "}";

                const userPrompt = "Code HTML actuel de la vidéo (" + videoPathRel + ") :\n---\n" +
                    currentCode + "\n---\n\nMessage de l'utilisateur :\n« " + instruction + " »";

                let parsedResult = null;
                let usedModel = "Kombo IA";
                try {
                    parsedResult = await callAiKombo(systemPrompt, userPrompt, 0.3);
                } catch (errKombo) {
                    console.error("[Studio Chat Kombo Error]:", errKombo.message);
                    throw errKombo;
                }

                const action = (parsedResult.action || 'reply').toLowerCase();
                const replyText = parsedResult.reply || "Réponse reçue.";
                const isModified = action === 'modify' && Boolean(parsedResult.html);

                if (isModified) {
                    let cleanCode = String(parsedResult.html).trim();
                    if (cleanCode.startsWith('```html')) cleanCode = cleanCode.replace(/^```html\s*/i, '');
                    else if (cleanCode.startsWith('```')) cleanCode = cleanCode.replace(/^```\s*/, '');
                    if (cleanCode.endsWith('```')) cleanCode = cleanCode.replace(/\s*```$/, '');

                    fs.writeFileSync(fullPath, cleanCode, 'utf8');
                    console.log("[Studio Chat] Fichier " + videoPathRel + " modifié et sauvegardé avec succès ! (" + usedModel + ")");
                } else {
                    console.log("[Studio Chat] Réponse conversationnelle (aucune modification du code) : " + replyText.slice(0, 80));
                }

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({
                    success: true,
                    action: action,
                    modified: isModified,
                    videoPath: videoPathRel,
                    modelUsed: usedModel,
                    message: replyText
                }));

            } catch (err) {
                console.error('[Studio Modify Error] :', err);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // 6. Gestion des requêtes de fichiers statiques
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') {
        reqPath = '/09_Pages/home.html';
    }

    // Réacheminement automatique des dossiers racine si demandés depuis 09_Pages
    if (reqPath.startsWith('/09_Pages/01_Assets/') || 
        reqPath.startsWith('/09_Pages/02_Composants/') || 
        reqPath.startsWith('/09_Pages/03_Chaines/') || 
        reqPath.startsWith('/09_Pages/04_Videos/') || 
        reqPath.startsWith('/09_Pages/05_Scenes/') || 
        reqPath.startsWith('/09_Pages/06_Templates/') || 
        reqPath.startsWith('/09_Pages/07_Scripts/') || 
        reqPath.startsWith('/09_Pages/08_Rendus/') || 
        reqPath.startsWith('/09_Pages/Clients/')) {
        reqPath = reqPath.replace('/09_Pages', '');
    }

    let filePath = path.join(ROOT_DIR, reqPath);

    // Vérifier dans les données utilisateur ou racine
    if (process.env.VIBE_USER_DATA) {
        const inUserData = path.join(process.env.VIBE_USER_DATA, reqPath);
        if (fs.existsSync(inUserData)) {
            filePath = inUserData;
        }
    }

    // Résolution intelligente : si non trouvé à la racine, vérifier dans 09_Pages/ (ex: /home.html ou /studio.html)
    if (!fs.existsSync(filePath)) {
        const inPages = path.join(ROOT_DIR, '09_Pages', reqPath);
        if (fs.existsSync(inPages)) {
            filePath = inPages;
        }
    }

        // Résolution intelligente : si non trouvé, vérifier dans 04_Videos/
    if (!fs.existsSync(filePath)) {
        const baseName = path.basename(reqPath);
        const inVideos = path.join(ROOT_DIR, '04_Videos', baseName);
        if (fs.existsSync(inVideos)) {
            filePath = inVideos;
        }
    }

const isInsideRoot = filePath.startsWith(ROOT_DIR);
    const isInsideUserData = Boolean(process.env.VIBE_USER_DATA && filePath.startsWith(process.env.VIBE_USER_DATA));
    if (!isInsideRoot && !isInsideUserData) {
        res.writeHead(403);
        return res.end('Accès interdit');
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            if (reqPath.startsWith('/api/')) {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=UTF-8', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ success: false, error: `Route API non trouvée : ${reqPath}` }));
            }
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
            return res.end(`404: Fichier non trouvé (${reqPath})`);
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        // Support HTTP 206 Partial Content pour audio et vidéo HTML5
        const range = req.headers.range;
        if (range && (ext === '.mp3' || ext === '.wav' || ext === '.mp4')) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
            const chunksize = (end - start) + 1;
            const fileStream = fs.createReadStream(filePath, { start, end });
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${stats.size}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*'
            });
            fileStream.pipe(res);
            return;
        }

        const isStaticMedia = ['.mp4', '.webm', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff2', '.ttf'].includes(ext);
        const cacheControl = isStaticMedia 
            ? 'public, max-age=86400, stale-while-revalidate=3600' 
            : 'no-cache, no-store, must-revalidate';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': stats.size,
            'Cache-Control': cacheControl,
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*'
        });

        if (req.method === 'HEAD') {
            return res.end();
        }

        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);
    });
});

function executeRender(videoName) {
    startNativeRender(videoName);
}

function startNativeRender(videoName) {
    setVideoProcessLock(true, 'render');
    renderState.statusText = 'Lancement de Chrome Headless & FFmpeg (Zéro Dépendance)...';
    renderState.progress = 20;
    renderState.logs.push('Démarrage de render.cjs...');

    const renderScript = path.join(ROOT_DIR, '07_Scripts', 'render.cjs');
    const child = spawn('node', [renderScript, videoName], { cwd: ROOT_DIR });
    currentRenderProcess = child;

    child.stdout.on('data', (d) => {
        const str = d.toString();
        renderState.logs.push(str.trim());
        
        // Détecter la progression dans la sortie console
        const match = str.match(/\[(\d+)%\]/);
        if (match) {
            renderState.progress = parseInt(match[1]);
            renderState.statusText = `Rendu en cours : ${renderState.progress}%`;
        }
    });

    child.stderr.on('data', (d) => {
        renderState.logs.push(d.toString().trim());
    });

    child.on('close', (code) => {
        currentRenderProcess = null;
        renderState.isRendering = false;
        setVideoProcessLock(false, 'render');
        if (code === 0) {
            renderState.progress = 100;
            renderState.statusText = 'Rendu terminé avec succès !';
            renderState.logs.push('✅ Rendu finalisé.');
            cleanupScratch({
                logger: (msg) => renderState.logs.push(msg)
            });
        } else {
            renderState.statusText = 'Échec du rendu (Code: ' + code + ')';
            renderState.logs.push('❌ Le processus s\'est arrêté avec code ' + code);
        }
    });
}

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        if (!process.env.IS_ELECTRON && PORT < 3010) {
            PORT++;
            process.env.ACTIVE_STUDIO_PORT = String(PORT);
            console.log(`ℹ️   Port occupé, tentative automatique sur le port ${PORT}...`);
            server.listen(PORT);
            return;
        }
        console.log(`ℹ️   Le port ${PORT} est déjà utilisé par une instance active. Connexion directe.`);
    } else {
        console.error('Erreur serveur HTTP :', err);
    }
});

server.listen(PORT, () => {
    const url = `http://localhost:${PORT}/09_Pages/home.html`;
    console.log(`\n======================================================`);
    console.log(`🎬  MARVIDFLOW STUDIO LANCÉ AVEC SUCCÈS !`);
    console.log(`👉  URL : ${url}`);
    console.log(`📁  Racine : ${ROOT_DIR}`);
    console.log(`⌨️   Appuyez sur [Ctrl + C] pour arrêter le serveur.`);
    console.log(`======================================================\n`);

    if (!process.env.IS_ELECTRON && !process.env.NO_BROWSER) {
        const startCmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
        exec(startCmd, (err) => {
            if (err) console.log(`Ouvrez manuellement votre navigateur sur ${url}`);
        });
    } else {
        console.log('🖥️   Mode Bureau Electron actif : affichage dans la fenêtre native.');
    }
});
