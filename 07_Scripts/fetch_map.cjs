/**
 * 07_Scripts/fetch_map.cjs
 * Générateur de cartes géographiques haute définition SANS AUCUN WATERMARK
 * 100% gratuit et illimité (OpenStreetMap / CartoDB / Esri Satellite)
 * 
 * Usage CLI :
 *   node 07_Scripts/fetch_map.cjs --query "Paris, France" [--style satellite|osm] [--zoom 13] [--out 01_Assets/Maps/paris.png]
 *   node 07_Scripts/fetch_map.cjs --lat 48.8566 --lon 2.3522 --zoom 14 --style satellite
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const http = require('http');

// Détection de Chrome / Edge
function getChromePath() {
    const candidates = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    for (const p of candidates) {
        if (p && fs.existsSync(p)) return p;
    }
    return 'chrome';
}

// Géocodage Nominatim (OpenStreetMap - gratuit et sans clé)
function geocode(query) {
    return new Promise((resolve, reject) => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
        const options = {
            headers: {
                'User-Agent': 'MarvidFlow-Studio/1.0 (contact@marvidflow.local)'
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (!json || json.length === 0) {
                        return reject(new Error(`Lieu introuvable pour la recherche : « ${query} »`));
                    }
                    const item = json[0];
                    resolve({
                        name: item.display_name,
                        lat: parseFloat(item.lat),
                        lon: parseFloat(item.lon),
                        type: item.type
                    });
                } catch (e) {
                    reject(new Error(`Erreur analyse Nominatim : ${e.message}`));
                }
            });
        }).on('error', err => {
            reject(new Error(`Erreur réseau géocodage : ${err.message}`));
        });
    });
}

// Fournisseurs de cartes : Satellite HD (Esri) et Plan Standard (OpenStreetMap)
const TILE_STYLES = {
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        name: 'Esri World Imagery (Vue Satellite Réelle HD)'
    },
    osm: {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        name: 'OpenStreetMap Standard (Plan de Ville)'
    }
};

// Génération de la page HTML Leaflet isolée sans watermark
function generateMapHtml({ lat, lon, zoom = 13, style = 'satellite', pin = false, pinColor = '#ff3344', width = 1920, height = 1080 }) {
    const tileConfig = TILE_STYLES[style] || TILE_STYLES.satellite;

    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Map Render</title>
    <!-- Leaflet CSS & JS via CDN (unpkg / cdnjs) -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body, html {
            width: ${width}px;
            height: ${height}px;
            overflow: hidden;
            background: #000;
        }
        #map {
            width: ${width}px;
            height: ${height}px;
            background: #000;
        }
        /* SUPPRESSION RADICALE DE TOUS LES WATERMARKS, BOUTONS ET LOGOS */
        .leaflet-control-attribution,
        .leaflet-control-zoom,
        .leaflet-control {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
        }
        /* Style du PIN personnalisé si activé */
        .custom-pin {
            width: 24px;
            height: 24px;
            background: ${pinColor};
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 25px ${pinColor}, 0 4px 12px rgba(0,0,0,0.8);
            animation: pulsePin 2s infinite ease-in-out;
        }
        @keyframes pulsePin {
            0% { transform: scale(0.95); box-shadow: 0 0 10px ${pinColor}; }
            50% { transform: scale(1.15); box-shadow: 0 0 28px ${pinColor}; }
            100% { transform: scale(0.95); box-shadow: 0 0 10px ${pinColor}; }
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        const map = L.map('map', {
            attributionControl: false,
            zoomControl: false,
            preferCanvas: true
        }).setView([${lat}, ${lon}], ${zoom});

        L.tileLayer('${tileConfig.url}', {
            maxZoom: 19,
            subdomains: 'abcd'
        }).addTo(map);

        ${pin ? `
        const pinIcon = L.divIcon({
            className: 'custom-pin-wrap',
            html: '<div class="custom-pin"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        L.marker([${lat}, ${lon}], { icon: pinIcon }).addTo(map);
        ` : ''}

        // Signaler que les tuiles sont chargées
        window.__mapReady = false;
        let tilesLoaded = 0;
        let totalTiles = 0;

        map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) {
                layer.on('tileload', () => { tilesLoaded++; });
                layer.on('load', () => { window.__mapReady = true; });
            }
        });

        // Sécurité temps d'attente (max 2.2s)
        setTimeout(() => { window.__mapReady = true; }, 2200);
    </script>
</body>
</html>`;
}

// Rendu et capture d'écran via Chrome Headless
async function captureMap({ query, lat, lon, zoom = 12, style = 'dark', pin = false, pinColor = '#ff3344', width = 1920, height = 1080, outPath }) {
    let finalLat = lat;
    let finalLon = lon;
    let placeName = query || `${lat},${lon}`;

    if (query && (lat === undefined || lon === undefined)) {
        console.log(`[Map] Recherche des coordonnées pour « ${query} »...`);
        const geo = await geocode(query);
        finalLat = geo.lat;
        finalLon = geo.lon;
        placeName = geo.name;
        console.log(`[Map] Trouvé : ${placeName} (${finalLat}, ${finalLon})`);
    }

    if (finalLat === undefined || finalLon === undefined) {
        throw new Error('Coordonnées géographiques manquantes (lat/lon ou query requis)');
    }

    const rootDir = path.resolve(__dirname, '..');
    let targetOut = outPath;
    if (!targetOut) {
        const mapsDir = path.join(rootDir, '01_Assets', 'Maps');
        if (!fs.existsSync(mapsDir)) fs.mkdirSync(mapsDir, { recursive: true });
        const cleanName = (query || 'map').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
        targetOut = path.join(mapsDir, `map_${cleanName}_${style}.png`);
    } else if (!path.isAbsolute(targetOut)) {
        targetOut = path.resolve(rootDir, targetOut);
    }

    const outDir = path.dirname(targetOut);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    // Création du fichier HTML temporaire
    const htmlContent = generateMapHtml({
        lat: finalLat,
        lon: finalLon,
        zoom,
        style,
        pin,
        pinColor,
        width,
        height
    });

    const tempHtml = path.join(os.tmpdir(), `map_${Date.now()}.html`);
    fs.writeFileSync(tempHtml, htmlContent, 'utf8');

    const chromePath = getChromePath();
    console.log(`[Map] Capture de la carte (${width}x${height}, style: ${style}, zoom: ${zoom})...`);

    return new Promise((resolve, reject) => {
        // Commande Chrome Headless avec screenshot direct
        const args = [
            '--headless=new',
            '--disable-gpu',
            '--hide-scrollbars',
            `--window-size=${width},${height}`,
            '--virtual-time-budget=2800', // Laisse le temps aux tuiles réseau de se charger
            `--screenshot=${targetOut}`,
            `file://${tempHtml.replace(/\\/g, '/')}`
        ];

        const proc = spawn(chromePath, args);

        proc.on('close', (code) => {
            // Nettoyage du fichier HTML temporaire
            try { fs.unlinkSync(tempHtml); } catch (e) {}

            if (!fs.existsSync(targetOut)) {
                return reject(new Error(`La capture de la carte a échoué (code ${code})`));
            }

            console.log(`[Map] Carte enregistrée sans watermark avec succès : ${targetOut}`);
            resolve({
                success: true,
                filePath: targetOut,
                fileName: path.basename(targetOut),
                relativePath: path.relative(rootDir, targetOut).replace(/\\/g, '/'),
                lat: finalLat,
                lon: finalLon,
                placeName,
                width,
                height,
                style
            });
        });

        proc.on('error', err => {
            try { fs.unlinkSync(tempHtml); } catch (e) {}
            reject(new Error(`Impossible de lancer Chrome pour la capture : ${err.message}`));
        });
    });
}

// Mode CLI
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(`
================================================================
🗺️  GÉNÉRATEUR DE CARTES SANS WATERMARK (MarvidFlow)
================================================================
Usage :
  node 07_Scripts/fetch_map.cjs --query "<ville / pays>" [--style dark|voyager|satellite|osm] [--zoom 12] [--pin] [--out <chemin.png>]
  node 07_Scripts/fetch_map.cjs --lat <latitude> --lon <longitude> [--zoom 14]

Options :
  --style   : dark (défaut), voyager, satellite, light, osm
  --zoom    : Niveau de zoom (1 = monde entier, 12 = ville, 16 = rues). Défaut: 12
  --pin     : Ajoute un repère lumineux/animé au centre
  --format  : 16:9 (1920x1080) ou 9:16 (1080x1920)
  --out     : Fichier de sortie (par défaut dans 01_Assets/Maps/)

Exemples :
  node 07_Scripts/fetch_map.cjs --query "Paris, France" --style dark --zoom 13 --pin
  node 07_Scripts/fetch_map.cjs --query "Tokyo, Japon" --style satellite --zoom 11
  node 07_Scripts/fetch_map.cjs --query "Dakar, Sénégal" --style voyager --zoom 12
================================================================
        `);
        process.exit(0);
    }

    const getArg = (flag) => {
        const idx = args.indexOf(flag);
        return (idx >= 0 && args[idx + 1]) ? args[idx + 1] : null;
    };

    const query = getArg('--query') || getArg('-q');
    const lat = getArg('--lat') ? parseFloat(getArg('--lat')) : undefined;
    const lon = getArg('--lon') ? parseFloat(getArg('--lon')) : undefined;
    const style = getArg('--style') || 'satellite';
    const zoom = getArg('--zoom') ? parseInt(getArg('--zoom'), 10) : 13;
    const pin = args.includes('--pin');
    const format = getArg('--format') || '16:9';
    const isVertical = format === '9:16';
    const width = isVertical ? 1080 : 1920;
    const height = isVertical ? 1920 : 1080;
    const out = getArg('--out');

    captureMap({
        query,
        lat,
        lon,
        zoom,
        style,
        pin,
        width,
        height,
        outPath: out
    })
    .then(res => {
        console.log(`\n🎉 Carte prête dans : ${res.relativePath}`);
    })
    .catch(err => {
        console.error(`\n❌ Échec : ${err.message}`);
        process.exit(1);
    });
}

module.exports = {
    geocode,
    captureMap,
    TILE_STYLES
};
