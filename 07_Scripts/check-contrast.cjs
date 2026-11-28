/**
 * 07_Scripts/check-contrast.cjs
 * Vérificateur automatisé du contraste WCAG 2.1 des éléments texte dans une vidéo HTML/GSAP.
 *
 * Usage :
 *   node 07_Scripts/check-contrast.cjs 04_Videos/ma_video.html
 *   node 07_Scripts/check-contrast.cjs 04_Videos/ma_video.html --times 1.2,5.2,11.6,15.2,18.8
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

function parseArgs() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args[0].startsWith('--')) {
        console.error('Usage: node 07_Scripts/check-contrast.cjs <chemin_html_ou_url> [--times 1.0,4.5,...]');
        process.exit(1);
    }
    const target = args[0];
    let times = null;
    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--times' && args[i + 1]) {
            times = args[++i].split(',').map(Number).filter(n => !Number.isNaN(n));
        }
    }
    return { target, times };
}

function resolveTargetUrl(target) {
    if (/^https?:\/\//i.test(target)) return target;
    const rel = target.replace(/\\/g, '/').replace(/^\.\//, '');
    return `http://localhost:3000/${rel}`;
}

async function checkContrast() {
    const { target, times: cliTimes } = parseArgs();
    const url = resolveTargetUrl(target);

    const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    const executablePath = chromePaths.find(p => fs.existsSync(p));
    if (!executablePath) throw new Error('Chrome/Edge introuvable');

    const browser = await puppeteer.launch({
        executablePath,
        headless: true,
        protocolTimeout: 30000,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForFunction(() => window.__timeline && typeof window.__timeline.seek === 'function', { timeout: 10000 });

        const duration = await page.evaluate(() => window.__timeline.duration());
        const sampleTimes = cliTimes && cliTimes.length > 0
            ? cliTimes
            : [0.1, 0.25, 0.45, 0.65, 0.85, 0.94].map(f => Number((duration * f).toFixed(2)));

        console.log(`🎨 [check-contrast] Analyse WCAG 2.1 sur ${url} (durée=${duration}s) aux instants: ${sampleTimes.join(', ')}s`);

        const allIssues = [];
        let totalChecked = 0;

        for (const t of sampleTimes) {
            await page.evaluate((sec) => { window.__timeline.seek(sec); }, t);
            await new Promise(r => setTimeout(r, 80));

            const report = await page.evaluate(() => {
                function parseRgba(str) {
                    if (!str || str === 'transparent') return null;
                    const m = str.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
                    if (!m) return null;
                    return {
                        r: Number(m[1]),
                        g: Number(m[2]),
                        b: Number(m[3]),
                        a: m[4] !== undefined ? Number(m[4]) : 1
                    };
                }

                function parseHex(hex) {
                    const h = hex.replace('#', '').trim();
                    if (h.length === 3) {
                        return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16), a: 1 };
                    }
                    if (h.length === 6) {
                        return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
                    }
                    return null;
                }

                function extractBgCandidates(el) {
                    const colors = [];
                    let cur = el;
                    while (cur && cur.nodeType === 1) {
                        const cs = getComputedStyle(cur);
                        const bgImg = cs.backgroundImage;
                        if (bgImg && bgImg !== 'none' && bgImg.includes('gradient')) {
                            const matches = bgImg.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,6}/g) || [];
                            const parsed = matches.map(tok => tok.startsWith('#') ? parseHex(tok) : parseRgba(tok)).filter(Boolean);
                            if (parsed.length > 0) return parsed;
                        }
                        const bgCol = parseRgba(cs.backgroundColor);
                        if (bgCol && bgCol.a > 0.05) {
                            colors.push(bgCol);
                            if (bgCol.a >= 0.95) break;
                        }
                        cur = cur.parentElement;
                    }
                    if (colors.length === 0) return [{ r: 0, g: 0, b: 0, a: 1 }];
                    // Composite semi-transparent layers top-down onto the deepest opaque color (or black)
                    let base = colors[colors.length - 1].a >= 0.95 ? colors[colors.length - 1] : { r: 0, g: 0, b: 0, a: 1 };
                    for (let i = colors.length - 1; i >= 0; i--) {
                        const top = colors[i];
                        if (top.a >= 0.95) {
                            base = top;
                        } else {
                            base = {
                                r: Math.round(top.r * top.a + base.r * (1 - top.a)),
                                g: Math.round(top.g * top.a + base.g * (1 - top.a)),
                                b: Math.round(top.b * top.a + base.b * (1 - top.a)),
                                a: 1
                            };
                        }
                    }
                    return [base];
                }

                function luminance({ r, g, b }) {
                    const [rs, gs, bs] = [r, g, b].map(v => {
                        const c = v / 255;
                        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
                    });
                    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
                }

                function contrastRatio(c1, c2) {
                    const l1 = luminance(c1);
                    const l2 = luminance(c2);
                    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
                }

                function isElementVisible(el) {
                    let cur = el;
                    while (cur && cur.nodeType === 1) {
                        const cs = getComputedStyle(cur);
                        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.15) {
                            return false;
                        }
                        cur = cur.parentElement;
                    }
                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                }

                const issues = [];
                let checked = 0;
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                const seenParents = new Set();

                while (walker.nextNode()) {
                    const node = walker.currentNode;
                    const text = (node.textContent || '').trim();
                    if (!text) continue;
                    const el = node.parentElement;
                    if (!el || seenParents.has(el) || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
                    if (!isElementVisible(el)) continue;
                    seenParents.add(el);

                    const cs = getComputedStyle(el);
                    // Gradient text (-webkit-text-fill-color: transparent): check backgroundImage stops
                    let fgColors = [];
                    let bgStartEl = el;
                    if (cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)' && cs.backgroundImage && cs.backgroundImage.includes('gradient')) {
                        const matches = cs.backgroundImage.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,6}/g) || [];
                        fgColors = matches.map(tok => tok.startsWith('#') ? parseHex(tok) : parseRgba(tok)).filter(Boolean);
                        bgStartEl = el.parentElement || el;
                    } else {
                        const fg = parseRgba(cs.color);
                        if (fg) fgColors = [fg];
                    }
                    if (fgColors.length === 0) continue;

                    // Pour un texte sur gradient de fond, on vérifie le pire ratio entre les couleurs du texte et du fond
                    const bgCandidates = extractBgCandidates(bgStartEl);
                    let minRatio = Infinity;
                    for (const fg of fgColors) {
                        for (const bg of bgCandidates) {
                            const ratio = contrastRatio(fg, bg);
                            if (ratio < minRatio) minRatio = ratio;
                        }
                    }

                    const fontSize = parseFloat(cs.fontSize) || 16;
                    const fontWeight = parseInt(cs.fontWeight, 10) || 400;
                    const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
                    const minRequired = isLarge ? 3.0 : 4.5;

                    checked++;
                    if (minRatio < minRequired) {
                        issues.push({
                            text: text.slice(0, 45),
                            id: el.id || el.className || el.tagName,
                            ratio: Number(minRatio.toFixed(2)),
                            required: minRequired,
                            fontSize,
                            fg: cs.color,
                            bgSample: bgCandidates.map(c => `rgb(${c.r},${c.g},${c.b})`).join(' | ')
                        });
                    }
                }
                return { checked, issues };
            });

            totalChecked += report.checked;
            for (const iss of report.issues) {
                allIssues.push({ t, ...iss });
            }
        }

        if (allIssues.length === 0) {
            console.log(`✅ CONTRASTE VALIDÉ : ${totalChecked} vérifications d'éléments texte, 0 défaut WCAG AA.`);
        } else {
            console.log(`⚠️ ${allIssues.length} problème(s) de contraste détecté(s) sur ${totalChecked} vérifications :`);
            for (const iss of allIssues) {
                console.log(`  - [t=${iss.t}s] "${iss.text}" (${iss.id}) : ratio ${iss.ratio}:1 < ${iss.required}:1 | fg=${iss.fg} | bg=${iss.bgSample}`);
            }
            process.exitCode = 1;
        }
    } finally {
        await browser.close();
    }
}

checkContrast().catch(err => {
    console.error('Erreur check-contrast:', err);
    process.exit(1);
});
