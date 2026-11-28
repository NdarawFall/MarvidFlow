// --- 1. CONFIGURATION DES FORMATS (défaut, sera overridé par la vidéo) ---
        const FORMATS = {
            '16:9': { width: 1920, height: 1080, label: '16:9 • 1080p' },
            '9:16': { width: 1080, height: 1920, label: '9:16 • TikTok/Shorts' },
            '1:1':  { width: 1080, height: 1080, label: '1:1 • Carré' },
            '4:5':  { width: 1080, height: 1350, label: '4:5 • Portrait' },
            '21:9': { width: 2560, height: 1080, label: '21:9 • UltraWide' }
        };

        let currentFormatKey = '16:9';
        let currentFormat = FORMATS[currentFormatKey];
        let compositionFormatEl = document.getElementById('compositionFormat');

        // --- 2. ÉTAT DU LECTEUR ET CACHE LOCAL (0ms de flash au chargement) ---
        const FPS = 30;
        let duration = 0.0;
        let totalFrames = 0;
        let currentFrame = 0;
        let isPlaying = false;
        let playbackSpeed = 1.0;
        let isLooping = true;
        let animFrameId = null;
        let lastTimestamp = 0;

        const CACHE_KEY_VIDEOS = 'hyperstudio_cached_videos';
        const CACHE_KEY_RENDUS = 'hyperstudio_cached_rendus';
        const CACHE_KEY_ACTIVE = 'hyperstudio_cached_active_video';

        const urlParams = new URLSearchParams(window.location.search);
        const queryVideo = urlParams.get('video');
        let activeVideoPath = '';
        function normalizeVideoPath(p) {
            if (!p) return '';
            let s = String(p).trim().replace(/^(\.\.\/|\.\/|\/)+/, '');
            if (!s.includes('/') && !s.startsWith('04_Videos') && !s.startsWith('03_Chaines')) {
                s = '04_Videos/' + s;
            }
            return s;
        }
        if (queryVideo) {
            activeVideoPath = normalizeVideoPath(queryVideo);
            localStorage.setItem(CACHE_KEY_ACTIVE, activeVideoPath);
        } else {
            activeVideoPath = normalizeVideoPath(localStorage.getItem(CACHE_KEY_ACTIVE) || '');
        }
        let lastVideosJson = localStorage.getItem(CACHE_KEY_VIDEOS) || '';
        let lastRendusJson = localStorage.getItem(CACHE_KEY_RENDUS) || '';

        // DOM Elements
        const viewportWrapper = document.getElementById('viewportWrapper');
        const screenContainer = document.getElementById('screenContainer');
        const previewFrame = document.getElementById('previewFrame');
        const settingsFormatSelect = document.getElementById('settingsFormatSelect');
        const btnFullscreen = document.getElementById('btnFullscreen');
        const fullscreenIcon = document.getElementById('fullscreenIcon');
        const btnRefreshStudio = document.getElementById('btnRefreshStudio');
        const refreshIcon = document.getElementById('refreshIcon');
        const toastNotification = document.getElementById('toastNotification');
        const toastMessage = document.getElementById('toastMessage');

        // Timeline Elements
        const playhead = document.getElementById('playhead');
        const scrubberTrack = document.getElementById('scrubberTrack');
        const timecodeDisplay = document.getElementById('timecodeDisplay');
        const frameCounter = document.getElementById('frameCounter');
        const btnPlayPause = document.getElementById('btnPlayPause');
        const playIcon = document.getElementById('playIcon');
        const speedSelector = document.getElementById('speedSelector');
        const btnLoop = document.getElementById('btnLoop');

        // Panels
        const sidePanelRight = document.getElementById('sidePanelRight');
        const viewVideos = document.getElementById('viewVideos');
        const viewRendus = document.getElementById('viewRendus');
        const viewModifier = document.getElementById('viewModifier');
        const tabBtnVideos = document.getElementById('tabBtnVideos');
        const tabBtnRendus = document.getElementById('tabBtnRendus');
        const tabBtnModifier = document.getElementById('tabBtnModifier');
        const timelineContainer = document.getElementById('timelineContainer');
        const btnToggleCompositions = document.getElementById('btnToggleCompositions');
        const btnToggleTimeline = document.getElementById('btnToggleTimeline');
        const timelineHeaderBar = document.getElementById('timelineHeaderBar');

        // Settings Modal
        const settingsModal = document.getElementById('settingsModal');
        const btnOpenSettings = document.getElementById('btnOpenSettings');
        const btnCloseSettings = document.getElementById('btnCloseSettings');
        const btnCancelSettings = document.getElementById('btnCancelSettings');
        const btnSaveSettings = document.getElementById('btnSaveSettings');

        // Render Action
        const btnTriggerRender = document.getElementById('btnTriggerRender');
        const renderProgressBox = document.getElementById('renderProgressBox');
        const renderProgressBar = document.getElementById('renderProgressBar');
        const renderPercentText = document.getElementById('renderPercentText');
        const renderStatusTitle = document.getElementById('renderStatusTitle');
        const renderDetailText = document.getElementById('renderDetailText');

        // --- 3. ZERO BARRE NOIRE : LE CADRE ET LA VIDÉO NE FONT QU'UN ---
        function adaptViewerScale() {
            if (!viewportWrapper || !screenContainer || !previewFrame) return;

            const padding = 32; // Marge confortable autour de la vidéo
            const availW = Math.max(100, viewportWrapper.clientWidth - padding * 2);
            const availH = Math.max(100, viewportWrapper.clientHeight - padding * 2);

            // Calcul du ratio d'échelle exact
            const scale = Math.min(availW / currentFormat.width, availH / currentFormat.height);

            // Taille finale de la boîte du cadre (exactement égale à la taille de la vidéo !)
            const finalW = Math.round(currentFormat.width * scale);
            const finalH = Math.round(currentFormat.height * scale);

            screenContainer.style.width = `${finalW}px`;
            screenContainer.style.height = `${finalH}px`;

            // L'iframe a la résolution native du format sélectionné
            previewFrame.style.width = `${currentFormat.width}px`;
            previewFrame.style.height = `${currentFormat.height}px`;

            // L'iframe est mise à l'échelle pour correspondre à 100% au cadre sans 1 pixel de décalage
            previewFrame.style.transform = `scale(${scale})`;
            previewFrame.style.transformOrigin = `0 0`;
        }

        // Changement de format (comme CapCut)
        function setFormat(newFormatKey) {
            if (!FORMATS[newFormatKey]) return;
            currentFormatKey = newFormatKey;
            currentFormat = FORMATS[currentFormatKey];
            if (settingsFormatSelect) settingsFormatSelect.value = currentFormatKey;
            const quickSelect = document.getElementById('quickFormatSelect');
            if (quickSelect) quickSelect.value = currentFormatKey;
            if (compositionFormatEl) {
                compositionFormatEl.textContent = currentFormat.label;
            }
            adaptViewerScale();
        }

        settingsFormatSelect.addEventListener('change', (e) => setFormat(e.target.value));
        const quickFormatSelectEl = document.getElementById('quickFormatSelect');
        if (quickFormatSelectEl) {
            quickFormatSelectEl.addEventListener('change', (e) => setFormat(e.target.value));
        }

        // Observation des changements de taille de la fenêtre
        const resizeObserver = new ResizeObserver(() => adaptViewerScale());
        resizeObserver.observe(viewportWrapper);
        window.addEventListener('resize', adaptViewerScale);

        // --- 4. PLEIN ÉCRAN (FULLSCREEN) ---
        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                viewportWrapper.requestFullscreen().catch(err => {
                    console.log('Erreur plein écran :', err.message);
                });
            } else {
                document.exitFullscreen();
            }
        }

        btnFullscreen.addEventListener('click', toggleFullscreen);

        document.addEventListener('fullscreenchange', () => {
            const isFull = !!document.fullscreenElement;
            if (isFull) {
                fullscreenIcon.innerHTML = `<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>`;
            } else {
                fullscreenIcon.innerHTML = `<polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line>`;
            }
            setTimeout(adaptViewerScale, 100);
        });

        // --- 5. MOTEUR DU LECTEUR TIMELINE ---
        function updateTimelineUI() {
            if (totalFrames <= 0 || duration <= 0) {
                playhead.style.left = '0%';
                timecodeDisplay.textContent = '00:00:00 / 00:00:00';
                frameCounter.textContent = 'Frame 0 / 0';
                return;
            }
            const time = currentFrame / FPS;
            const progress = (currentFrame / totalFrames) * 100;
            playhead.style.left = `${Math.min(100, Math.max(0, progress))}%`;

            const min = Math.floor(time / 60).toString().padStart(2, '0');
            const sec = Math.floor(time % 60).toString().padStart(2, '0');
            const centi = Math.floor((time % 1) * 100).toString().padStart(2, '0');

            const tMin = Math.floor(duration / 60).toString().padStart(2, '0');
            const tSec = Math.floor(duration % 60).toString().padStart(2, '0');
            const tCenti = Math.floor((duration % 1) * 100).toString().padStart(2, '0');

                        timecodeDisplay.textContent = `${min}:${sec}:${centi} / ${tMin}:${tSec}:${tCenti}`;
            frameCounter.textContent = `Frame ${Math.floor(currentFrame)} / ${totalFrames}`;

            if (!isPlaying) {
                seekVideoInIframe(time);
            } else {
                syncAudioDuringPlayback(time);
            }
        }

        // Helper fluide (CapCut-grade) : ne décoder QUE les <video> dans [data-start, data-end] sans micro-seek 60fps
        function syncMediaVideoWindow(v, timeInSeconds, isNowPlaying) {
            try {
                v.autoplay = false;
                v.removeAttribute('autoplay');
                const vStart = parseFloat(v.dataset.start || '0') || 0;
                const vEnd = parseFloat(v.dataset.end || (duration || 9999).toString()) || 9999;
                const dur = (Number.isFinite(v.duration) && v.duration > 0)
                    ? v.duration
                    : (parseFloat(v.dataset.duration || '0') || 0);
                const rawOffset = Math.max(0, timeInSeconds - vStart);
                const targetOffset = (v.loop && dur > 0)
                    ? (rawOffset % dur)
                    : (dur > 0 ? Math.min(dur, rawOffset) : rawOffset);

                if (!isNowPlaying) {
                    if (!v.paused) v.pause();
                    if (Number.isFinite(targetOffset) && Math.abs((v.currentTime || 0) - targetOffset) > 0.02) {
                        v.currentTime = targetOffset;
                    }
                    return;
                }

                const inRange = (timeInSeconds >= vStart && timeInSeconds <= vEnd) && !(duration > 0 && timeInSeconds >= duration);
                if (!inRange) {
                    if (!v.paused) v.pause();
                    return;
                }

                if (Math.abs((v.playbackRate || 1) - playbackSpeed) > 0.01) {
                    v.playbackRate = playbackSpeed;
                }

                if (v.paused && !v.ended) {
                    if (Number.isFinite(targetOffset) && Math.abs((v.currentTime || 0) - targetOffset) > 0.12) {
                        v.currentTime = targetOffset;
                    }
                    v.play().catch(() => {});
                } else {
                    const diff = Math.abs((v.currentTime || 0) - targetOffset);
                    const wrappedDiff = (v.loop && dur > 0) ? Math.min(diff, Math.abs(dur - diff)) : diff;
                    if (wrappedDiff > 0.45 && Number.isFinite(targetOffset)) {
                        v.currentTime = targetOffset;
                    }
                }
            } catch (e) {}
        }

        // Synchronisation audio & vidéo fluide en cours de lecture continue (tolérance anti-saccade, zéro décodage hors-champ)
        function syncAudioDuringPlayback(timeInSeconds) {
            try {
                if (!previewFrame || !previewFrame.contentWindow) return;
                const win = previewFrame.contentWindow;
                const doc = previewFrame.contentDocument || win.document;
                if (win.tl && typeof win.tl.timeScale === 'function' && !win.tl.paused()) {
                    try {
                        if (Math.abs(win.tl.timeScale() - playbackSpeed) > 0.01) {
                            win.tl.timeScale(playbackSpeed);
                        }
                    } catch (e) {}
                }
                if (typeof win.renderAt === 'function') {
                    try { win.renderAt(timeInSeconds); } catch (e) {}
                }
                if (doc) {
                    const videos = doc.querySelectorAll('video');
                    videos.forEach(v => syncMediaVideoWindow(v, timeInSeconds, true));
                }
                if (typeof win.syncAudioTimeline === 'function') {
                    try { win.syncAudioTimeline(timeInSeconds, true); } catch (e) {}
                } else if (doc) {
                    const audios = doc.querySelectorAll('audio');
                    audios.forEach(a => {
                        try {
                            const aStart = parseFloat(a.dataset.start || '0') || 0;
                            const aEnd = parseFloat(a.dataset.end || (duration || 9999).toString()) || 9999;

                            // Couper si la video a atteint ou depasse la fin
                            if (timeInSeconds > aEnd || (duration > 0 && timeInSeconds >= duration)) {
                                if (!a.paused) a.pause();
                                return;
                            }

                            if (timeInSeconds >= aStart && timeInSeconds < aEnd) {
                                const aOffset = Math.max(0, timeInSeconds - aStart);
                                if (Math.abs((a.playbackRate || 1) - playbackSpeed) > 0.01) {
                                    a.playbackRate = playbackSpeed;
                                }
                                if (Math.abs(a.currentTime - aOffset) > 1.2) {
                                    a.currentTime = aOffset;
                                }
                                if (a.paused && !a.ended) {
                                    a.play().catch(() => {});
                                }
                            } else {
                                if (!a.paused) a.pause();
                            }
                        } catch (e) {}
                    });
                }
            } catch (e) {}
        }

        function getIframeTimeline() {
            try {
                if (!previewFrame || !previewFrame.contentWindow) return null;
                const win = previewFrame.contentWindow;
                if (win.__timeline && typeof win.__timeline.seek === 'function') {
                    return win.__timeline;
                }
                if (win.tl && typeof win.tl.seek === 'function') {
                    return win.tl;
                }
                if (win.timeline && typeof win.timeline.seek === 'function') {
                    return win.timeline;
                }
                if (win.__timelines) {
                    const vals = Object.values(win.__timelines);
                    if (vals.length > 0 && typeof vals[0].seek === 'function') {
                        return vals[0];
                    }
                }
                if (win.gsap && win.gsap.globalTimeline) {
                    return win.gsap.globalTimeline;
                }
            } catch (e) {}
            return null;
        }

        // --- VERROUILLAGE TOTAL ET ABSOLU DE L'IFRAME EN MODE PAUSE ---
        function freezeIframe(targetTime) {
            try {
                if (!previewFrame || !previewFrame.contentWindow) return;
                const win = previewFrame.contentWindow;
                const doc = previewFrame.contentDocument || win.document;
                const t = (typeof targetTime === 'number') ? targetTime : (currentFrame / FPS);

                if (typeof win.renderAt === 'function') {
                    try { win.renderAt(t); } catch (e) {}
                }

                // 1. Pauser et caler le Ticker GSAP global et les timelines
                if (win.gsap && win.gsap.globalTimeline) {
                    try {
                        win.gsap.globalTimeline.pause();
                        win.gsap.globalTimeline.time(t);
                    } catch (e) {}
                }

                const tl = getIframeTimeline();
                if (tl && tl !== win.gsap?.globalTimeline) {
                    try {
                        if (typeof tl.pause === 'function') tl.pause();
                        if (typeof tl.seek === 'function') tl.seek(t, false);
                    } catch (e) {}
                }

                if (win.__timelines) {
                    try {
                        Object.values(win.__timelines).forEach(tItem => {
                            if (tItem && typeof tItem.pause === 'function') tItem.pause();
                            if (tItem && typeof tItem.seek === 'function') tItem.seek(t, false);
                        });
                    } catch (e) {}
                }

                if (doc) {
                    // 2. Neutraliser et caler toutes les balises <video>
                    const videos = doc.querySelectorAll('video');
                    videos.forEach(v => {
                        try {
                            v.autoplay = false;
                            v.removeAttribute('autoplay');
                            if (!v.paused) v.pause();
                            const vStart = parseFloat(v.dataset.start || '0') || 0;
                            const vOffset = Math.max(0, t - vStart);
                            if (Number.isFinite(v.duration) && v.duration > 0) {
                                v.currentTime = Math.min(v.duration, vOffset);
                            } else if (Number.isFinite(vOffset)) {
                                v.currentTime = vOffset;
                            }
                        } catch (e) {}
                    });

                    // 3. Neutraliser et caler toutes les balises <audio>
                    const audios = doc.querySelectorAll('audio');
                    audios.forEach(a => {
                        try {
                            a.autoplay = false;
                            a.removeAttribute('autoplay');
                            if (!a.paused) a.pause();
                            const aStart = parseFloat(a.dataset.start || '0') || 0;
                            const aOffset = Math.max(0, t - aStart);
                            if (Number.isFinite(a.duration) && a.duration > 0) {
                                a.currentTime = Math.min(a.duration, aOffset);
                            } else if (Number.isFinite(aOffset)) {
                                a.currentTime = aOffset;
                            }
                        } catch (e) {}
                    });

                    // 4. Stopper toutes les animations CSS / Web Animations
                    if (typeof doc.getAnimations === 'function') {
                        doc.getAnimations().forEach(anim => {
                            try { anim.pause(); } catch (e) {}
                        });
                    }

                    // 5. Stopper les animations SVG SMIL
                    const svgs = doc.querySelectorAll('svg');
                    svgs.forEach(s => {
                        try {
                            if (typeof s.pauseAnimations === 'function') s.pauseAnimations();
                            if (typeof s.setCurrentTime === 'function') s.setCurrentTime(t);
                        } catch (e) {}
                    });
                }

                // 6. Interfaces standard personnalisées
                if (typeof win.pause === 'function') {
                    try { win.pause(); } catch (e) {}
                }
                if (typeof win.syncAudioTimeline === 'function') {
                    try { win.syncAudioTimeline(t, false); } catch (e) {}
                }
            } catch (e) {}
        }

        function seekVideoInIframe(timeInSeconds) {
            try {
                if (!previewFrame || !previewFrame.contentWindow) return;
                const win = previewFrame.contentWindow;
                const doc = previewFrame.contentDocument || win.document;

                if (win.tl && typeof win.tl.timeScale === 'function' && !win.tl.paused()) {
                    try {
                        if (Math.abs(win.tl.timeScale() - playbackSpeed) > 0.01) {
                            win.tl.timeScale(playbackSpeed);
                        }
                    } catch (e) {}
                }
                if (typeof win.renderAt === 'function') {
                    try { win.renderAt(timeInSeconds); } catch (e) {}
                }

                // 1. GSAP Timelines
                const tl = getIframeTimeline();
                if (tl) {
                    try {
                        tl.seek(timeInSeconds, false);
                        if (!isPlaying && typeof tl.pause === 'function') {
                            tl.pause();
                        }
                    } catch (e) {}
                }

                if (win.gsap && win.gsap.globalTimeline) {
                    try {
                        if (!isPlaying) {
                            win.gsap.globalTimeline.pause();
                            win.gsap.globalTimeline.time(timeInSeconds);
                        }
                    } catch (e) {}
                }

                if (win.__timelines) {
                    try {
                        Object.values(win.__timelines).forEach(tItem => {
                            if (tItem && typeof tItem.seek === 'function') {
                                tItem.seek(timeInSeconds, false);
                                if (!isPlaying && typeof tItem.pause === 'function') tItem.pause();
                            }
                        });
                    } catch (e) {}
                }

                if (doc) {
                    // 2. Synchronisation précise des vidéos HTML5 (décodage actif uniquement dans la fenêtre temporelle)
                    const videos = doc.querySelectorAll('video');
                    videos.forEach(v => syncMediaVideoWindow(v, timeInSeconds, isPlaying));

                    // 3. Synchronisation audio
                    if (typeof win.syncAudioTimeline === 'function') {
                        try { win.syncAudioTimeline(timeInSeconds, isPlaying); } catch (e) {}
                    } else {
                        const audios = doc.querySelectorAll('audio');
                        audios.forEach(a => {
                            try {
                                a.autoplay = false;
                                a.removeAttribute('autoplay');
                                const aStart = parseFloat(a.dataset.start || '0') || 0;
                                const aEnd = parseFloat(a.dataset.end || (duration || 9999).toString()) || 9999;
                                const aOffset = Math.max(0, timeInSeconds - aStart);

                                if (!isPlaying) {
                                    if (!a.paused) a.pause();
                                    if (Number.isFinite(a.duration) && a.duration > 0) {
                                        a.currentTime = Math.min(a.duration, aOffset);
                                    }
                                } else {
                                    const inRange = (timeInSeconds >= aStart && timeInSeconds <= aEnd);
                                    if (inRange) {
                                        if (Math.abs(a.currentTime - aOffset) > 1.2) {
                                            a.currentTime = aOffset;
                                        }
                                        if (a.paused && !a.ended) {
                                            a.play().catch(() => {});
                                        }
                                    } else {
                                        if (!a.paused) a.pause();
                                    }
                                }
                            } catch (e) {}
                        });
                    }

                    // 4. Synchronisation SVG SMIL
                    const svgs = doc.querySelectorAll('svg');
                    svgs.forEach(s => {
                        try {
                            if (isPlaying) {
                                if (typeof s.unpauseAnimations === 'function') s.unpauseAnimations();
                            } else {
                                if (typeof s.pauseAnimations === 'function') s.pauseAnimations();
                                if (typeof s.setCurrentTime === 'function') s.setCurrentTime(timeInSeconds);
                            }
                        } catch (e) {}
                    });
                }
            } catch (e) {}
        }

        function handleLoopRestart() {
            try {
                if (!previewFrame || !previewFrame.contentWindow) return;
                const win = previewFrame.contentWindow;
                const doc = previewFrame.contentDocument || win.document;

                // 1. Redemarrer la timeline GSAP maitresse via restart()
                //    restart() est plus fiable que seek(0)+play() pour les fromTo tweens
                //    car il reinitialise proprement l'etat interne des tweens.
                if (win.tl && typeof win.tl.restart === 'function') {
                    try { win.tl.restart(); } catch (e) {}
                } else if (win.__timeline) {
                    try {
                        if (typeof win.__timeline.seek === 'function') win.__timeline.seek(0, false);
                        if (typeof win.__timeline.play === 'function') win.__timeline.play();
                    } catch (e) {}
                } else {
                    const tl = getIframeTimeline();
                    if (tl) {
                        try {
                            if (typeof tl.restart === 'function') tl.restart();
                            else {
                                if (typeof tl.seek === 'function') tl.seek(0, false);
                                if (typeof tl.play === 'function') tl.play();
                            }
                        } catch (e) {}
                    }
                }

                // NE PAS toucher a gsap.globalTimeline.time(0) :
                // Cela resetterait le chrono racine de GSAP et casserait
                // la position de tl qu'on vient de relancer.
                // On se contente de s'assurer que le ticker global tourne.
                if (win.gsap && win.gsap.globalTimeline) {
                    try { win.gsap.globalTimeline.resume(); } catch (e) {}
                }

                if (win.__timelines) {
                    try {
                        Object.values(win.__timelines).forEach(tItem => {
                            if (tItem) {
                                if (typeof tItem.restart === 'function') tItem.restart();
                                else {
                                    if (typeof tItem.seek === 'function') tItem.seek(0, false);
                                    if (typeof tItem.play === 'function') tItem.play();
                                }
                            }
                        });
                    } catch (e) {}
                }

                // 2. Notifier explicitement le callback audio de l'iframe a t = 0
                if (typeof win.syncAudioTimeline === 'function') {
                    try { win.syncAudioTimeline(0, true); } catch (e) {}
                } else if (doc) {
                    const audios = doc.querySelectorAll('audio');
                    audios.forEach(a => {
                        try {
                            const aStart = parseFloat(a.dataset.start || '0') || 0;
                            const aEnd = parseFloat(a.dataset.end || (duration || 9999).toString()) || 9999;
                            if (0 >= aStart && 0 < aEnd) {
                                a.currentTime = 0;
                                a.play().catch(() => {});
                            } else {
                                if (!a.paused) a.pause();
                                a.currentTime = 0;
                            }
                        } catch (e) {}
                    });
                }

                // 3. Reinitialiser les balises <video> a t = 0 (demarrer uniquement celles actives a t=0)
                if (doc) {
                    const videos = doc.querySelectorAll('video');
                    videos.forEach(v => {
                        try {
                            v.currentTime = 0;
                            syncMediaVideoWindow(v, 0, true);
                        } catch (e) {}
                    });

                    if (typeof doc.getAnimations === 'function') {
                        doc.getAnimations().forEach(anim => {
                            try {
                                anim.currentTime = 0;
                                anim.play();
                            } catch (e) {}
                        });
                    }
                }
            } catch (e) {}
        }

        function step(timestamp) {
            if (!isPlaying || totalFrames <= 0) return;
            if (!lastTimestamp) lastTimestamp = timestamp;
            const delta = (timestamp - lastTimestamp) / 1000;
            lastTimestamp = timestamp;

            const framesToAdvance = delta * FPS * playbackSpeed;
            currentFrame += framesToAdvance;

            if (currentFrame >= totalFrames) {
                if (isLooping) {
                    currentFrame = 0;
                    handleLoopRestart();
                } else {
                    currentFrame = totalFrames;
                    pausePlayback();
                }
            }

            updateTimelineUI();
            if (isPlaying) {
                animFrameId = requestAnimationFrame(step);
            }
        }

        function startPlayback() {
            if (totalFrames <= 0 || !activeVideoPath) return;
            isPlaying = true;
            lastTimestamp = 0;
            playIcon.innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
            try {
                const win = previewFrame.contentWindow;
                if (win) {
                    const time = currentFrame / FPS;
                    if (win.gsap && win.gsap.globalTimeline) {
                        try { win.gsap.globalTimeline.resume(); } catch (e) {}
                    }
                    if (win.__timeline && typeof win.__timeline.play === 'function') {
                        try {
                            if (typeof win.__timeline.seek === 'function') {
                                win.__timeline.seek(time, false);
                            }
                            win.__timeline.play();
                        } catch (e) {}
                    } else {
                        if (typeof win.play === 'function') {
                            try { win.play(); } catch (e) {}
                        }
                        const tl = getIframeTimeline();
                        if (tl && typeof tl.play === 'function') {
                            try { tl.play(); } catch (e) {}
                        }
                    }
                    const doc = previewFrame.contentDocument || win.document;
                    if (typeof win.syncAudioTimeline === 'function') {
                        try { win.syncAudioTimeline(time, true); } catch (e) {}
                    } else if (doc) {
                        const audios = doc.querySelectorAll('audio');
                        audios.forEach(a => {
                            try {
                                const aStart = parseFloat(a.dataset.start || '0') || 0;
                                const aEnd = parseFloat(a.dataset.end || (duration || 9999).toString()) || 9999;
                                if (time >= aStart && time < aEnd) {
                                    const aOffset = Math.max(0, time - aStart);
                                    if (Math.abs(a.currentTime - aOffset) > 1.2) {
                                        a.currentTime = aOffset;
                                    }
                                    if (a.paused && !a.ended) a.play().catch(() => {});
                                } else {
                                    if (!a.paused) a.pause();
                                }
                            } catch (e) {}
                        });
                    }
                    if (doc) {
                        const videos = doc.querySelectorAll('video');
                        videos.forEach(v => syncMediaVideoWindow(v, time, true));
                        if (typeof doc.getAnimations === 'function') {
                            doc.getAnimations().forEach(anim => {
                                try { anim.play(); } catch (e) {}
                            });
                        }
                    }
                }
            } catch (e) {}
            animFrameId = requestAnimationFrame(step);
        }

        function pausePlayback() {
            isPlaying = false;
            cancelAnimationFrame(animFrameId);
            playIcon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
            freezeIframe(currentFrame / FPS);
        }

        function togglePlayPause() {
            if (totalFrames <= 0 || duration <= 0 || !activeVideoPath) {
                showToast('Aucune vidéo active dans le Studio');
                return;
            }
            if (isPlaying) {
                pausePlayback();
            } else {
                if (currentFrame >= totalFrames) currentFrame = 0;
                startPlayback();
            }
        }

        // Scrubber
        let isScrubbing = false;
        function handleScrub(e) {
            const rect = scrubberTrack.getBoundingClientRect();
            const posX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const progress = posX / rect.width;
            currentFrame = Math.round(progress * totalFrames);
            updateTimelineUI();
        }

        scrubberTrack.addEventListener('mousedown', (e) => {
            isScrubbing = true;
            pausePlayback();
            handleScrub(e);
        });

        window.addEventListener('mousemove', (e) => {
            if (isScrubbing) {
                if (isPlaying) pausePlayback();
                handleScrub(e);
            }
        });

        window.addEventListener('mouseup', () => {
            if (isScrubbing) {
                isScrubbing = false;
                freezeIframe(currentFrame / FPS);
            }
        });

        btnPlayPause.addEventListener('click', togglePlayPause);
        document.getElementById('btnJumpStart').addEventListener('click', () => {
            pausePlayback();
            currentFrame = 0;
            updateTimelineUI();
            freezeIframe(0);
        });
        document.getElementById('btnJumpEnd').addEventListener('click', () => {
            pausePlayback();
            currentFrame = totalFrames;
            updateTimelineUI();
            freezeIframe(duration);
        });
        document.getElementById('btnPrevFrame').addEventListener('click', () => {
            pausePlayback();
            currentFrame = Math.max(0, Math.floor(currentFrame) - 1);
            updateTimelineUI();
            freezeIframe(currentFrame / FPS);
        });
        document.getElementById('btnNextFrame').addEventListener('click', () => {
            pausePlayback();
            currentFrame = Math.min(totalFrames, Math.floor(currentFrame) + 1);
            updateTimelineUI();
            freezeIframe(currentFrame / FPS);
        });
        speedSelector.addEventListener('change', (e) => playbackSpeed = parseFloat(e.target.value));
        btnLoop.addEventListener('click', () => {
            isLooping = !isLooping;
            btnLoop.style.color = isLooping ? 'var(--primary)' : 'var(--text-muted)';
        });

        // Raccourcis clavier
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlayPause();
            } else if (e.code === 'KeyF') {
                e.preventDefault();
                toggleFullscreen();
            } else if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                refreshStudio();
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                currentFrame = Math.max(0, Math.floor(currentFrame) - 1);
                updateTimelineUI();
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                currentFrame = Math.min(totalFrames, Math.floor(currentFrame) + 1);
                updateTimelineUI();
            }
        });

        // --- ACTUALISATION RAPIDE DU STUDIO ET DE LA VIDÉO ---
        function showToast(message) {
            if (!toastNotification || !toastMessage) return;
            toastMessage.textContent = message;
            toastNotification.classList.add('show');
            setTimeout(() => {
                toastNotification.classList.remove('show');
            }, 2200);
        }

        async function refreshStudio() {
            if (refreshIcon) refreshIcon.classList.add('spinning');
            
            // 1. Recharger la liste des fichiers depuis le serveur
            await fetchWorkspaceFiles();

            // 2. Recharger l'iframe en forçant l'invalidation du cache
            const cacheBuster = '?t=' + Date.now();
            previewFrame.src = '/' + activeVideoPath.replace(/^\/+/, '') + cacheBuster;

            // 3. Réinitialiser la timeline au début
            currentFrame = 0;
            pausePlayback();
            updateTimelineUI();
            setTimeout(adaptViewerScale, 150);

            showToast('✓ Composition & fichiers actualisés !');

            setTimeout(() => {
                if (refreshIcon) refreshIcon.classList.remove('spinning');
            }, 650);
        }

        btnRefreshStudio.addEventListener('click', refreshStudio);

        // --- 6. GESTION DU VOLET DROIT UNIQUE (VIDÉOS, RENDUS & MODIFIER) ---
        let currentRightTab = 'videos';

        function openRightPanel(tab) {
            currentRightTab = tab;
            sidePanelRight.classList.remove('collapsed');
            if (btnToggleCompositions) btnToggleCompositions.classList.add('active');

            // Réinitialiser les affichages
            viewVideos.style.display = 'none';
            viewRendus.style.display = 'none';
            if (viewModifier) viewModifier.style.display = 'none';

            tabBtnVideos.classList.remove('active');
            tabBtnRendus.classList.remove('active');
            if (tabBtnModifier) tabBtnModifier.classList.remove('active');

            if (tab === 'videos') {
                viewVideos.style.display = 'flex';
                tabBtnVideos.classList.add('active');
            } else if (tab === 'rendus') {
                viewRendus.style.display = 'flex';
                tabBtnRendus.classList.add('active');
            } else if (tab === 'modifier') {
                if (viewModifier) viewModifier.style.display = 'flex';
                if (tabBtnModifier) tabBtnModifier.classList.add('active');
                renderModifierChat(activeVideoPath);
                const input = document.getElementById('chatModifierInput');
                if (input && !modifyingVideosSet.has(activeVideoPath)) setTimeout(() => input.focus(), 100);
            }
            setTimeout(adaptViewerScale, 350);
        }

        function closeRightPanel() {
            sidePanelRight.classList.add('collapsed');
            if (btnToggleCompositions) btnToggleCompositions.classList.remove('active');
            setTimeout(adaptViewerScale, 350);
        }

        window.closeRightPanel = closeRightPanel;
        window.switchRightPanelTab = function(tab) {
            openRightPanel(tab);
        };

        if (btnToggleCompositions) {
            btnToggleCompositions.addEventListener('click', () => {
                if (sidePanelRight.classList.contains('collapsed')) {
                    openRightPanel(currentRightTab || 'videos');
                } else {
                    closeRightPanel();
                }
            });
        }

        function toggleTimeline() {
            const isCollapsed = timelineContainer.classList.toggle('collapsed');
            document.getElementById('timelineChevron').style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
            setTimeout(adaptViewerScale, 350);
        }
        btnToggleTimeline.addEventListener('click', (e) => { e.stopPropagation(); toggleTimeline(); });
        timelineHeaderBar.addEventListener('click', toggleTimeline);

        // --- 7. MODAL PARAMÈTRES (si modal présent) ---
        if (btnCloseSettings) btnCloseSettings.addEventListener('click', () => settingsModal?.classList.remove('open'));
        if (btnCancelSettings) btnCancelSettings.addEventListener('click', () => settingsModal?.classList.remove('open'));
        if (btnSaveSettings) btnSaveSettings.addEventListener('click', () => {
            setFormat(settingsFormatSelect.value);
            settingsModal?.classList.remove('open');
        });

        const deleteModalEl = document.getElementById('deleteConfirmModal');
        if (deleteModalEl) {
            deleteModalEl.addEventListener('click', (e) => {
                if (e.target === deleteModalEl) closeDeleteModal();
            });
        }

        // --- 7b. GESTION DU CHAT DE MODIFICATION IA AVEC HISTORIQUE PERSISTANT ---
        const modifyingVideosSet = new Set();
        let currentGeminiModelName = localStorage.getItem('vibeeditor_pref_gemini_model') || 'gemini-3.5-flash-lite';

        // Synchroniser le nom du modèle depuis le serveur
        fetch('/api/settings').then(r => r.json()).then(cfg => {
            if (cfg && cfg.gemini_model) {
                currentGeminiModelName = cfg.gemini_model;
                localStorage.setItem('vibeeditor_pref_gemini_model', cfg.gemini_model);
                updateModifierModelBadge();
            }
        }).catch(() => {});

        function updateModifierModelBadge() {
            const el = document.getElementById('chatModifierModelName');
            if (el) el.textContent = currentGeminiModelName;
        }

        function getModifierChatKey(videoPath) {
            if (!videoPath) return null;
            const norm = videoPath.replace(/\\/g, '/').replace(/^\/+/, '');
            return 'vibeeditor_modchat_' + norm;
        }

        function getModifierChatHistory(videoPath) {
            const key = getModifierChatKey(videoPath);
            if (!key) return [];
            try {
                return JSON.parse(localStorage.getItem(key) || '[]');
            } catch (e) {
                return [];
            }
        }

        function saveModifierChatHistory(videoPath, history) {
            const key = getModifierChatKey(videoPath);
            if (!key) return;
            try {
                localStorage.setItem(key, JSON.stringify(history.slice(-30)));
            } catch (e) {}
        }

        window.clearModifierChatHistory = function() {
            if (!activeVideoPath) return;
            const key = getModifierChatKey(activeVideoPath);
            if (key) localStorage.removeItem(key);
            renderModifierChat(activeVideoPath);
            showToast("Historique de discussion effacé.");
        };

                // Rendu de l'historique de discussion
        function renderModifierChat(videoPath) {
            const messagesContainer = document.getElementById('chatModifierMessages');
            updateModifierModelBadge();
            if (!messagesContainer) return;

            messagesContainer.innerHTML = '';

            const history = videoPath ? getModifierChatHistory(videoPath) : [];

            // Affiche l'accueil minimaliste UNIQUEMENT si aucune discussion n'a eu lieu
            if (history.length === 0) {
                const emptyGreeting = document.createElement('div');
                emptyGreeting.id = 'chatModifierEmptyGreeting';
                emptyGreeting.style.cssText = 'text-align: center; margin: auto 0; padding: 28px 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; user-select: none;';
                emptyGreeting.innerHTML = `
                    <div style="font-size: 26px; line-height: 1; filter: drop-shadow(0 0 10px rgba(255,46,67,0.35));">🤖</div>
                    <div style="font-size: 13px; font-weight: 600; color: #ffffff; letter-spacing: -0.2px;">Assistant IA</div>
                    <div style="font-size: 11px; color: var(--text-muted); line-height: 1.4; max-width: 240px;">Posez vos questions ou décrivez les modifications souhaitées.</div>
                `;
                messagesContainer.appendChild(emptyGreeting);
            }

            if (!videoPath) return;

            history.forEach(item => {
                if (item.role === 'user') {
                    const uMsg = document.createElement('div');
                    uMsg.style.cssText = 'background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: var(--radius-sm); padding: 9px 12px; font-size: 12px; color: #fff; align-self: flex-end; max-width: 90%; word-break: break-word;';
                    uMsg.textContent = item.text;
                    messagesContainer.appendChild(uMsg);
                } else if (item.role === 'assistant') {
                    const aMsg = document.createElement('div');
                    aMsg.style.cssText = 'background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 9px 12px; font-size: 12px; color: var(--text-secondary); align-self: flex-start; max-width: 90%; word-break: break-word; line-height: 1.4;';
                    const mTag = item.model ? ' <span style="font-size:10px; color:#10b981; font-family:\'JetBrains Mono\', monospace;">(' + escapeHtml(item.model) + ')</span>' : '';
                    if (item.action === 'reply' || item.action === 'chat') {
                        aMsg.innerHTML = '🤖 <strong>Assistant :</strong>' + mTag + '<br><span style="color:rgba(255,255,255,0.9);">' + escapeHtml(item.text).replace(/\n/g, '<br>') + '</span>';
                    } else if (item.success) {
                        aMsg.innerHTML = '✅ <strong>Modification appliquée !</strong>' + mTag + '<br><span style="font-size:11px; color:rgba(255,255,255,0.7);">' + escapeHtml(item.text) + '</span>';
                    } else {
                        aMsg.innerHTML = '❌ <strong style="color:#ef4444;">Échec :</strong><br><span style="font-size:11px; color:#fca5a5;">' + escapeHtml(item.text) + '</span>';
                    }
                    messagesContainer.appendChild(aMsg);
                }
            });

            // Si cette vidéo est actuellement en cours de modification
            if (modifyingVideosSet.has(videoPath)) {
                const loadingMsg = document.createElement('div');
                loadingMsg.id = 'activeModifierAiLoader';
                loadingMsg.style.cssText = 'background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 9px 12px; font-size: 12px; color: var(--text-secondary); align-self: flex-start; max-width: 90%; word-break: break-word; display:flex; align-items:center; gap:8px;';
                loadingMsg.innerHTML = '<span class="scifi-pulse-dot"></span> <em>L\'IA analyse votre demande...</em>';
                messagesContainer.appendChild(loadingMsg);
            }

            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        window.sendChatModifierMessage = async function() {
            const input = document.getElementById('chatModifierInput');
            const messagesContainer = document.getElementById('chatModifierMessages');
            if (!input || !messagesContainer) return;

            const text = input.value.trim();
            if (!text) return;

            if (!activeVideoPath) {
                showToast("Veuillez d'abord sélectionner une vidéo.");
                return;
            }

            const currentVid = activeVideoPath;
            const currentVidName = currentVid.split('/').pop();

            if (modifyingVideosSet.has(currentVid)) {
                showToast("Une requête est déjà en cours de traitement.");
                return;
            }

            // Enregistrer le message utilisateur dans l'historique
            const history = getModifierChatHistory(currentVid);
            history.push({ role: 'user', text: text, time: Date.now() });
            saveModifierChatHistory(currentVid, history);

            // Message utilisateur DOM
            const userMsg = document.createElement('div');
            userMsg.style.cssText = 'background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: var(--radius-sm); padding: 9px 12px; font-size: 12px; color: #fff; align-self: flex-end; max-width: 90%; word-break: break-word;';
            userMsg.textContent = text;
            messagesContainer.appendChild(userMsg);

            input.value = '';
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            // Message d'attente IA DOM
            const aiMsg = document.createElement('div');
            aiMsg.style.cssText = 'background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 9px 12px; font-size: 12px; color: var(--text-secondary); align-self: flex-start; max-width: 90%; word-break: break-word; display:flex; align-items:center; gap:8px;';
            aiMsg.innerHTML = '<span class="scifi-pulse-dot"></span> <em>L\'IA analyse votre message pour <strong>' + escapeHtml(currentVidName) + '</strong>...</em>';
            messagesContainer.appendChild(aiMsg);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            // Activer l'overlay Sci-Fi
            setVideoModifyingState(currentVid, true, 'Instruction : « ' + (text.length > 50 ? text.slice(0, 50) + '...' : text) + ' »');

            try {
                const response = await fetch('/api/modify-video', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        videoPath: currentVid,
                        instruction: text
                    })
                });

                const resData = await response.json();
                if (!response.ok || resData.error) {
                    throw new Error(resData.error || "Erreur lors du traitement de la requête.");
                }

                const modelTag = resData.modelUsed ? ' <span style="font-size:10px; color:#10b981; font-family:\'JetBrains Mono\', monospace;">(' + escapeHtml(resData.modelUsed) + ')</span>' : '';

                if (resData.modified) {
                    // C'était une vraie modification de code
                    aiMsg.innerHTML = '✅ <strong>Modification appliquée !</strong>' + modelTag + '<br><span style="font-size:11px; color:rgba(255,255,255,0.7);">' + escapeHtml(resData.message || 'La vidéo a été mise à jour avec succès.') + '</span>';
                    showToast("Vidéo modifiée avec succès par l'IA !");

                    history.push({
                        role: 'assistant',
                        text: resData.message || 'La vidéo a été mise à jour avec succès.',
                        model: resData.modelUsed,
                        action: 'modify',
                        success: true,
                        time: Date.now()
                    });
                    saveModifierChatHistory(currentVid, history);

                    // Recharger la preview
                    if (previewFrame) {
                        const resolved = '/' + currentVid.replace(/^\/+/, '');
                        previewFrame.src = resolved + '?t=' + Date.now();
                    }

                    setTimeout(() => {
                        syncIframeTimelineDuration();
                        updateTimelineUI();
                    }, 600);
                } else {
                    // C'était une salutation, une question ou une discussion : Ne pas toucher à la vidéo
                    aiMsg.innerHTML = '🤖 <strong>Assistant :</strong>' + modelTag + '<br><span style="color:rgba(255,255,255,0.9); font-size:12px;">' + escapeHtml(resData.message).replace(/\n/g, '<br>') + '</span>';

                    history.push({
                        role: 'assistant',
                        text: resData.message,
                        model: resData.modelUsed,
                        action: 'reply',
                        success: true,
                        time: Date.now()
                    });
                    saveModifierChatHistory(currentVid, history);
                }

            } catch (err) {
                console.error('Erreur chat IA :', err);
                aiMsg.innerHTML = '❌ <strong style="color:#ef4444;">Échec :</strong><br><span style="font-size:11px; color:#fca5a5;">' + escapeHtml(err.message) + '</span>';
                showToast("Échec : " + err.message);

                history.push({
                    role: 'assistant',
                    text: err.message,
                    action: 'modify',
                    success: false,
                    time: Date.now()
                });
                saveModifierChatHistory(currentVid, history);
            } finally {
                setVideoModifyingState(currentVid, false);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        };

        // Synchronisation automatique de la durée réelle GSAP et du format de la vidéo chargée
        function syncIframeTimelineDuration() {
            try {
                const win = previewFrame.contentWindow;
                const doc = previewFrame.contentDocument || win?.document;
                const config = win?.VIDEO_CONFIG;

                // 1. Détection automatique du format d'affichage (Short 9:16 ou Standard 16:9)
                let detectedFormat = null;
                if (config && config.format && FORMATS[config.format]) {
                    detectedFormat = config.format;
                } else if (config && config.width && config.height) {
                    for (const [key, fmt] of Object.entries(FORMATS)) {
                        if (fmt.width === config.width && fmt.height === config.height) {
                            detectedFormat = key;
                            break;
                        }
                    }
                }

                const stage = doc?.getElementById('stage');
                if (!detectedFormat && stage) {
                    if (stage.dataset && stage.dataset.format && FORMATS[stage.dataset.format]) {
                        detectedFormat = stage.dataset.format;
                    } else if (stage.dataset && stage.dataset.width && stage.dataset.height) {
                        const w = parseInt(stage.dataset.width);
                        const h = parseInt(stage.dataset.height);
                        for (const [key, fmt] of Object.entries(FORMATS)) {
                            if (fmt.width === w && fmt.height === h) {
                                detectedFormat = key;
                                break;
                            }
                        }
                    } else {
                        const sw = stage.offsetWidth || parseInt(window.getComputedStyle(stage).width);
                        const sh = stage.offsetHeight || parseInt(window.getComputedStyle(stage).height);
                        if (sw > 0 && sh > 0) {
                            detectedFormat = (sh > sw) ? '9:16' : '16:9';
                        }
                    }
                }

                // Fallback sur le nom de fichier actif
                if (!detectedFormat && activeVideoPath) {
                    const fn = activeVideoPath.toLowerCase();
                    if (fn.includes('short') || fn.includes('tiktok') || fn.includes('reels') || fn.includes('9-16') || fn.includes('portrait')) {
                        detectedFormat = '9:16';
                    }
                }

                if (detectedFormat && detectedFormat !== currentFormatKey) {
                    setFormat(detectedFormat);
                }

                // 2. Synchronisation de la durée
                let newDur = null;
                if (config && config.duration && config.duration > 0) {
                    newDur = parseFloat(config.duration);
                }
                if (!newDur) {
                    const tl = getIframeTimeline();
                    if (tl) {
                        const dur = (typeof tl.duration === 'function') ? tl.duration() : tl.duration;
                        if (dur && dur > 0) newDur = dur;
                    }
                }
                if (!newDur && win?.tl) {
                    const dur = (typeof win.tl.duration === 'function') ? win.tl.duration() : win.tl.duration;
                    if (dur && dur > 0) newDur = dur;
                }
                if (!newDur && win?.DURATION) {
                    const dur = parseFloat(win.DURATION);
                    if (!isNaN(dur) && dur > 0) newDur = dur;
                }
                if (!newDur && win?.duration) {
                    const dur = parseFloat(win.duration);
                    if (!isNaN(dur) && dur > 0) newDur = dur;
                }
                if (!newDur && stage && stage.dataset && stage.dataset.duration) {
                    const dur = parseFloat(stage.dataset.duration);
                    if (!isNaN(dur) && dur > 0) newDur = dur;
                }

                if (newDur && newDur > 0) {
                    duration = Math.round(newDur * 10) / 10;
                    totalFrames = Math.round(duration * FPS);
                    updateTimelineUI();
                }

                updateTimelineTracksFromVideoConfig();
            } catch (e) {
                console.warn('Erreur syncIframeTimelineDuration:', e);
            }
        }

        // Hydratation dynamique des pistes du timeline depuis la configuration de la vidéo active
        function updateTimelineTracksFromVideoConfig() {
            try {
                const win = previewFrame.contentWindow;
                const config = win?.VIDEO_CONFIG;
                const videoTrackRow = document.getElementById('videoTrackRow');
                const subTrackRow = document.getElementById('subtitlesTrackRow');
                const voiceTrackRow = document.getElementById('voiceTrackRow');
                const musicTrackRow = document.getElementById('musicTrackRow');

                if (!videoTrackRow) return;
                videoTrackRow.innerHTML = '';
                if (subTrackRow) subTrackRow.innerHTML = '';
                if (voiceTrackRow) voiceTrackRow.innerHTML = '';
                if (musicTrackRow) musicTrackRow.innerHTML = '';

                if (!config) return;

                // 1. Scènes vidéo réelles (si template ou composition avec segments)
                if (Array.isArray(config.segments) && config.segments.length > 0 && duration > 0) {
                    config.segments.forEach((seg, idx) => {
                        const segStart = (seg.start !== undefined) ? seg.start : 0;
                        const segEnd = (seg.end !== undefined) ? seg.end : duration;
                        const leftPct = Math.min(100, Math.max(0, (segStart / duration) * 100));
                        const widthPct = Math.min(100 - leftPct, Math.max(2, ((segEnd - segStart) / duration) * 100));
                        const segLabel = seg.label || `Scène ${idx + 1}`;

                        const clip = document.createElement('div');
                        clip.className = 'track-clip clip-video';
                        clip.style.left = `${leftPct}%`;
                        clip.style.width = `${widthPct}%`;
                        clip.title = `${segLabel} (${segStart.toFixed(1)}s - ${segEnd.toFixed(1)}s)`;
                        clip.innerHTML = `<span class="clip-title">${segLabel}</span>`;
                        videoTrackRow.appendChild(clip);
                    });
                }

                // 2. Piste Sous-titres
                if (subTrackRow && config.options && config.options.showSubtitles) {
                    const subClip = document.createElement('div');
                    subClip.className = 'track-clip clip-sub';
                    subClip.style.left = '0%';
                    subClip.style.width = '100%';
                    subClip.title = 'Sous-titres dynamiques synchronisés';
                    subClip.innerHTML = `<span class="clip-title">Sous-titres actifs</span>`;
                    subTrackRow.appendChild(subClip);
                }

                // 3. Piste Voix off
                if (voiceTrackRow && config.audio && config.audio.voiceover) {
                    const vClip = document.createElement('div');
                    vClip.className = 'track-clip clip-voice';
                    vClip.style.left = '0%';
                    vClip.style.width = '100%';
                    const vName = config.audio.voiceover.split('/').pop() || 'Voix off';
                    vClip.title = `Voix off : ${vName}`;
                    vClip.innerHTML = `<span class="clip-title">${vName}</span>`;
                    voiceTrackRow.appendChild(vClip);
                }

                // 4. Piste Musique
                if (musicTrackRow && config.audio && config.audio.music) {
                    const mClip = document.createElement('div');
                    mClip.className = 'track-clip clip-music';
                    mClip.style.left = '0%';
                    mClip.style.width = '100%';
                    const mName = config.audio.music.split('/').pop() || 'Musique';
                    mClip.title = `Musique : ${mName}`;
                    mClip.innerHTML = `<span class="clip-title">${mName}</span>`;
                    musicTrackRow.appendChild(mClip);
                }
            } catch(e) {}
        }

        // --- GARDE-FOUS MULTIPLES SUR LE CHARGEMENT DE L'IFRAME ---
        function setupIframeGuards() {
            try {
                const win = previewFrame.contentWindow;
                if (win && win.HTMLMediaElement && !win.__hasMediaInterceptor) {
                    win.__hasMediaInterceptor = true;
                    const originalPlay = win.HTMLMediaElement.prototype.play;
                    win.HTMLMediaElement.prototype.play = function() {
                        if (!isPlaying) {
                            this.pause();
                            return Promise.resolve();
                        }
                        return originalPlay.apply(this, arguments);
                    };
                }
            } catch (e) {}

            freezeIframe(currentFrame / FPS);
            syncIframeTimelineDuration();

            // Répéter à des intervalles réguliers pour neutraliser tout démarrage autonome après chargement JS
            const freezeCheckpoints = [60, 150, 300, 600, 1000, 1500];
            freezeCheckpoints.forEach(delay => {
                setTimeout(() => {
                    if (!isPlaying) {
                        freezeIframe(currentFrame / FPS);
                        syncIframeTimelineDuration();
                    }
                }, delay);
            });
        }

        previewFrame.addEventListener('load', setupIframeGuards);

        // --- 8. FONCTIONS D'AFFICHAGE ET HYDRATATION UI ---
        function escapeHtml(text) {
            if (!text) return '';
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return String(text).replace(/[&<>"']/g, m => map[m]);
        }

        function renderVideoSkeletons() {
            const container = document.getElementById('videoListContainer');
            if (container) {
                container.innerHTML = `
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                `;
            }
        }

        function renderRendusSkeletons() {
            const rContainer = document.getElementById('rendusListContainer');
            if (rContainer) {
                rContainer.innerHTML = `
                    <div class="skeleton-card"></div>
                `;
            }
        }

        let currentVideoFilter = 'createur'; // 'createur' | 'client'
        let allWorkspaceVideos = [];

        function setVideoFilter(filter) {
            currentVideoFilter = filter;
            const btnCreateur = document.getElementById('subnavBtnCreateur');
            const btnClient = document.getElementById('subnavBtnClient');
            if (btnCreateur) btnCreateur.classList.toggle('active', filter === 'createur');
            if (btnClient) btnClient.classList.toggle('active', filter === 'client');
            renderVideosUI(allWorkspaceVideos, activeVideoPath);
        }

        function renderVideosUI(videos, preferredActivePath) {
            const container = document.getElementById('videoListContainer');
            if (!container) return;

            if (videos && Array.isArray(videos)) {
                allWorkspaceVideos = videos;
            }

            // Découpage en 2 collections : Créateurs vs Clients
            const createurVideos = (allWorkspaceVideos || []).filter(v => {
                const p = (typeof v === 'string' ? v : (v.path || v.file || '')).toLowerCase();
                const isCl = typeof v === 'object' && Boolean(v.isClient || v.clientName);
                return !isCl && !p.startsWith('clients/');
            });

            const clientVideos = (allWorkspaceVideos || []).filter(v => {
                const p = (typeof v === 'string' ? v : (v.path || v.file || '')).toLowerCase();
                const isCl = typeof v === 'object' && Boolean(v.isClient || v.clientName);
                return isCl || p.startsWith('clients/');
            });

            // Mise à jour des compteurs dans les badges des sous-menus
            const badgeCountCreateurs = document.getElementById('badgeCountCreateurs');
            if (badgeCountCreateurs) badgeCountCreateurs.textContent = createurVideos.length;

            const badgeCountClients = document.getElementById('badgeCountClients');
            if (badgeCountClients) badgeCountClients.textContent = clientVideos.length;

            // Sélection de la liste à afficher selon le filtre actif
            const displayVideos = (currentVideoFilter === 'client') ? clientVideos : createurVideos;

            if (!displayVideos || displayVideos.length === 0) {
                const emptyTitle = (currentVideoFilter === 'client') ? 'Aucune vidéo client' : 'Aucune vidéo créateur';
                const emptySub = (currentVideoFilter === 'client') 
                    ? 'Générez des vidéos pour vos clients depuis la page Monteur.' 
                    : 'Ajoutez ou générez des vidéos dans 04_Videos/ ou dans vos Chaînes.';

                container.innerHTML = `
                    <div class="empty-state">
                        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                        <div class="empty-state-title">${emptyTitle}</div>
                        <div class="empty-state-sub">${emptySub}</div>
                    </div>
                `;
                return;
            }

            const activeName = (preferredActivePath || activeVideoPath || '').split('/').pop();
            const chosenObj = displayVideos.find(v => (typeof v === 'string' ? v : v.file) === activeName) || displayVideos[0];
            const chosenName = typeof chosenObj === 'string' ? chosenObj : chosenObj.name;
            const targetPath = typeof chosenObj === 'string' ? (currentVideoFilter === 'client' ? `Clients/${chosenName}` : `04_Videos/${chosenName}`) : chosenObj.path;

            container.innerHTML = '';
            displayVideos.forEach((vidObj) => {
                const vidName = typeof vidObj === 'string' ? vidObj : vidObj.name;
                const vidPath = typeof vidObj === 'string' ? (currentVideoFilter === 'client' ? `Clients/${vidName}` : `04_Videos/${vidName}`) : vidObj.path;
                const isProcessing = (typeof vidObj === 'object' && vidObj.status === 'processing');
                
                const isClientItem = (typeof vidObj === 'object' && Boolean(vidObj.isClient || vidObj.clientName)) || vidPath.toLowerCase().startsWith('clients/');
                const clientTitle = (typeof vidObj === 'object' && vidObj.clientName) ? `👤 ${vidObj.clientName}` : '👤 Client';
                const channelLabel = isClientItem 
                    ? clientTitle 
                    : ((typeof vidObj === 'object' && vidObj.channelName) ? vidObj.channelName : (typeof vidObj === 'object' && !vidObj.isStandalone ? 'Chaîne' : 'Sans chaîne'));

                const isCurrentActive = (!isProcessing && (vidPath === targetPath || vidName === chosenName));

                const card = document.createElement('div');
                card.className = `item-card ${isCurrentActive ? 'active' : ''} ${isProcessing ? 'item-card-processing' : ''}`;
                card.setAttribute('data-src', vidPath);
                
                if (isProcessing) {
                    card.style.cursor = 'pointer';
                    const jobIdParam = (typeof vidObj === 'object' && vidObj.jobId) ? `&jobId=${encodeURIComponent(vidObj.jobId)}` : '';
                    card.onclick = () => window.location.href = `video_processus.html?video=${encodeURIComponent(vidPath)}${jobIdParam}`;
                } else {
                    card.onclick = () => selectVideo(card, vidPath);
                }

                // Détection intelligente du format et de la durée de la vidéo
                const videoFormat = (typeof vidObj === 'object' && vidObj.format) ? vidObj.format : ((vidName.includes('short') || vidName.includes('tiktok') || vidName.includes('reels') || vidName.includes('9-16')) ? '9:16' : '16:9');
                const videoDur = (typeof vidObj === 'object' && vidObj.duration) ? vidObj.duration : '';
                card.setAttribute('data-duration', videoDur);
                card.setAttribute('data-format', videoFormat);

                card.innerHTML = `
                    <div class="item-card-header">
                        <span class="item-title">${escapeHtml(vidName)}</span>
                        <div class="item-card-header-actions">
                            ${isProcessing ? `<span class="processing-dots-badge" title="Génération en cours..."><span class="p-dot"></span><span class="p-dot"></span><span class="p-dot"></span></span>` : `<span class="item-badge" style="background: rgba(255, 255, 255, 0.08); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2); font-family: 'JetBrains Mono', monospace;">${videoFormat}</span>`}
                            <button class="btn-delete-item" title="Supprimer la vidéo" onclick="deleteVideoItem(event, '${escapeHtml(vidPath)}')">
                                <svg class="icon" viewBox="0 0 24 24" style="width:13px; height:13px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div class="item-meta">
                        <span style="color:${isClientItem ? '#60a5fa' : (channelLabel === 'Sans chaîne' ? '#ef4444' : '#ffffff')}; font-weight:600;">${escapeHtml(channelLabel)}</span>
                        <span>•</span>
                        <span>${isProcessing ? 'Génération en cours...' : (videoDur ? videoDur + 's' : 'Prête')}</span>
                    </div>
                `;
                container.appendChild(card);
            });

            // Mettre à jour l'état actif sans recharger inutilement l'iframe si déjà chargée
            if (targetPath !== activeVideoPath || !previewFrame.src || previewFrame.src.endsWith('about:blank')) {
                activeVideoPath = targetPath;
                localStorage.setItem(CACHE_KEY_ACTIVE, targetPath);
                if (viewModifier && viewModifier.style.display === 'flex') renderModifierChat(activeVideoPath);
                document.getElementById('activeCompositionName').textContent = chosenName;
                const fnLower = chosenName.toLowerCase();
                const isShort = fnLower.includes('short') || fnLower.includes('tiktok') || fnLower.includes('reels') || fnLower.includes('9-16') || fnLower.includes('portrait');
                setFormat(isShort ? '9:16' : '16:9');
                const resolvedTarget = '/' + targetPath.replace(/^\/+/, '');
                if (!previewFrame.src.endsWith(targetPath) && !previewFrame.src.endsWith(resolvedTarget)) {
                    previewFrame.src = resolvedTarget;
                }
            }
        }

        function renderRendusUI(rendus) {
            const rContainer = document.getElementById('rendusListContainer');
            if (!rContainer) return;

            if (rendus && rendus.length > 0) {
                rContainer.innerHTML = '';
                rendus.forEach(rendu => {
                    const card = document.createElement('div');
                    card.className = 'item-card';
                    card.innerHTML = `
                        <div class="item-card-header">
                            <span class="item-title">${escapeHtml(rendu.name)}</span>
                            <span class="item-badge" style="background: rgba(255, 255, 255, 0.1); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2);">MP4</span>
                        </div>
                        <div class="item-meta">
                            <span>${rendu.size}</span>
                            <span>•</span>
                            <span>${rendu.date}</span>
                        </div>
                        <div style="display:flex; gap:8px; margin-top:8px; align-items:center;">
                            <a href="08_Rendus/${escapeHtml(rendu.name)}" target="_blank" style="flex:1; text-align:center; background:rgba(255,255,255,0.06); border:1px solid var(--border-subtle); padding:6px 8px; border-radius:4px; font-size:11px; color:#fff; text-decoration:none; transition:var(--transition-smooth);" onmouseover="this.style.background='rgba(255,255,255,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.06)'">Ouvrir la vidéo</a>
                            <button onclick="deleteVideoItem(event, '08_Rendus/' + '${escapeHtml(rendu.name)}')" title="Supprimer ce rendu MP4" style="background:rgba(220,38,38,0.15); border:1px solid rgba(220,38,38,0.3); color:#ff7b8a; padding:6px 10px; border-radius:4px; font-size:11px; cursor:pointer; display:flex; align-items:center; gap:5px; transition:var(--transition-smooth);" onmouseover="this.style.background='rgba(220,38,38,0.35)'" onmouseout="this.style.background='rgba(220,38,38,0.15)'">
                                <svg class="icon" viewBox="0 0 24 24" style="width:12px; height:12px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                <span>Supprimer</span>
                            </button>
                        </div>
                    `;
                    rContainer.appendChild(card);
                });
            } else {
                rContainer.innerHTML = `
                    <div class="empty-state">
                        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                        <div class="empty-state-title">Aucun rendu vidéo</div>
                        <div class="empty-state-sub">Cliquez sur « Lancer le Rendu MP4 » ci-dessus pour exporter la vidéo active.</div>
                    </div>
                `;
            }
        }

        // --- SÉLECTION D'UNE VIDÉO ---
        window.selectVideo = function(cardEl, videoSrc) {
            const checkSrc = (typeof cardEl === 'string') ? cardEl : videoSrc;
            if (checkSrc && modifyingVideosSet.has(checkSrc)) {
                showToast("Cette vidéo est actuellement en cours de modification par l'IA.");
                return;
            }
            // Tolérance d'appel selectVideo(path)
            if (typeof cardEl === 'string') {
                videoSrc = cardEl;
                cardEl = null;
            }
            if (!videoSrc) return;

            document.querySelectorAll('#videoListContainer .item-card').forEach(c => c.classList.remove('active'));
            let matchedCard = cardEl;
            if (matchedCard) {
                matchedCard.classList.add('active');
            } else {
                matchedCard = document.querySelector(`#videoListContainer .item-card[data-src="${videoSrc}"]`);
                if (matchedCard) matchedCard.classList.add('active');
            }
            activeVideoPath = videoSrc;
            localStorage.setItem(CACHE_KEY_ACTIVE, videoSrc);

            const fileName = videoSrc.split('/').pop();
            document.getElementById('activeCompositionName').textContent = fileName;

            // Détection automatique immédiate du format (Short 9:16 ou Paysage 16:9)
            let detectedFmt = matchedCard?.dataset?.format;
            if (!detectedFmt) {
                const fnLower = fileName.toLowerCase();
                detectedFmt = (fnLower.includes('short') || fnLower.includes('tiktok') || fnLower.includes('reels') || fnLower.includes('9-16') || fnLower.includes('portrait')) ? '9:16' : '16:9';
            }
            setFormat(detectedFmt);

            const resolvedSelect = '/' + videoSrc.replace(/^\/+/, '');
            if (!previewFrame.src.endsWith(videoSrc) && !previewFrame.src.endsWith(resolvedSelect)) {
                previewFrame.src = resolvedSelect;
            }

            currentFrame = 0;
            pausePlayback();

            // Détection de la durée réelle
            let detectedDuration = null;
            if (matchedCard && matchedCard.dataset && matchedCard.dataset.duration) {
                const parsed = parseFloat(matchedCard.dataset.duration);
                if (!isNaN(parsed) && parsed > 0) detectedDuration = parsed;
            }

            if (!detectedDuration) {
                if (fileName.includes('agency-showreel')) detectedDuration = 20.0;
                else if (fileName.includes('apple-story')) detectedDuration = 30.0;
                else if (fileName.includes('neon-motion')) detectedDuration = 5.0;
                else if (fileName.includes('index')) detectedDuration = 40.0;
                else if (fileName.includes('hyperframes-tutorial')) detectedDuration = 30.0;
                else if (fileName.includes('handwriting')) detectedDuration = 5.5;
                else detectedDuration = 20.0; // Fallback par défaut 20.0s (JAMAIS 4.0s)
            }

            duration = detectedDuration;
            totalFrames = Math.round(duration * FPS);

            updateTimelineUI();
            setTimeout(adaptViewerScale, 200);

            // Resynchronisations automatiques dès que le script de la vidéo est exécuté
            setTimeout(syncIframeTimelineDuration, 80);
            setTimeout(syncIframeTimelineDuration, 250);
            setTimeout(syncIframeTimelineDuration, 600);
            setTimeout(syncIframeTimelineDuration, 1200);
        };

        // --- CHARGEMENT DYNAMIQUE DES FICHIERS ET RENDUS (AVEC DÉDOUBLONNAGE ET CACHE) ---
        function filterOutDeletedVideos(list) {
            if (!Array.isArray(list)) return [];
            try {
                const delList = JSON.parse(localStorage.getItem('marvidflow_deleted_videos') || localStorage.getItem('autoframe_deleted_videos') || '[]');
                if (!Array.isArray(delList) || delList.length === 0) return list;
                return list.filter(v => {
                    const vp = (typeof v === 'string' ? v : (v.path || v.file || v.name || '')).trim();
                    const fn = vp.split(/[/\\]/).pop();
                    const title = (typeof v === 'object' && v.title) ? v.title.trim().toLowerCase() : '';
                    return !delList.some(d => {
                        if (!d) return false;
                        const dStr = String(d).trim();
                        const dFn = dStr.split(/[/\\]/).pop();
                        if (dFn && fn && dFn.toLowerCase() === fn.toLowerCase()) return true;
                        if (dStr && vp && (dStr === vp || vp.endsWith(dStr))) return true;
                        if (title && dStr.toLowerCase() === title) return true;
                        return false;
                    });
                });
            } catch(e) {
                return list;
            }
        }

        async function fetchWorkspaceFiles() {
            try {
                const res = await fetch('/api/files?t=' + Date.now(), { cache: 'no-store' });
                if (!res.ok) return;
                const data = await res.json();
                
                const rawVideos = data.videos || [];
                const videos = filterOutDeletedVideos(rawVideos);
                const rendus = data.rendus || [];
                const newVideosJson = JSON.stringify(videos);
                const newRendusJson = JSON.stringify(rendus);

                // Mettre à jour les vidéos seulement en cas de changement réel
                if (newVideosJson !== lastVideosJson || !document.querySelector('#videoListContainer .item-card')) {
                    lastVideosJson = newVideosJson;
                    localStorage.setItem(CACHE_KEY_VIDEOS, newVideosJson);
                    renderVideosUI(videos, activeVideoPath);
                }

                // Mettre à jour les rendus seulement en cas de changement réel
                if (newRendusJson !== lastRendusJson || !document.querySelector('#rendusListContainer .item-card')) {
                    lastRendusJson = newRendusJson;
                    localStorage.setItem(CACHE_KEY_RENDUS, newRendusJson);
                    renderRendusUI(rendus);
                }
            } catch (e) {
                console.warn('Erreur synchronisation workspace :', e);
            }
        }

        // --- HYDRATATION IMMÉDIATE (0ms) DÈS L'EXÉCUTION DU SCRIPT ---
        (function hydrateCacheImmediately() {
            try {
                // 1. Restaurer la vidéo active en mémoire
                if (activeVideoPath) {
                    const fileName = activeVideoPath.split('/').pop();
                    const nameEl = document.getElementById('activeCompositionName');
                    if (nameEl) nameEl.textContent = fileName;
                    if (previewFrame && activeVideoPath) previewFrame.src = '/' + activeVideoPath.replace(/^\/+/, '');
                }

                
            // Détection automatique du filtre actif (Client vs Créateur) depuis l'URL ou le chemin actif
            const urlQuery = new URLSearchParams(window.location.search);
            if (urlQuery.has('client') || (activeVideoPath && activeVideoPath.toLowerCase().startsWith('clients/'))) {
                currentVideoFilter = 'client';
                const btnCreateur = document.getElementById('subnavBtnCreateur');
                const btnClient = document.getElementById('subnavBtnClient');
                if (btnCreateur) btnCreateur.classList.remove('active');
                if (btnClient) btnClient.classList.add('active');
            }

            // 2. Restaurer la liste des vidéos
                let cachedVideos = null;
                if (lastVideosJson) {
                    try { cachedVideos = JSON.parse(lastVideosJson); } catch (e) {}
                }
                cachedVideos = filterOutDeletedVideos(cachedVideos);
                if (Array.isArray(cachedVideos) && cachedVideos.length > 0) {
                    renderVideosUI(cachedVideos, activeVideoPath);
                } else {
                    renderVideoSkeletons();
                }

                // 3. Restaurer la liste des rendus
                let cachedRendus = null;
                if (lastRendusJson) {
                    try { cachedRendus = JSON.parse(lastRendusJson); } catch (e) {}
                }
                if (Array.isArray(cachedRendus)) {
                    renderRendusUI(cachedRendus);
                } else {
                    renderRendusSkeletons();
                }
            } catch (e) {
                console.error('Erreur hydratation immédiate cache :', e);
            }
        })();

        // Lancer la synchro serveur sans attendre window.load
        fetchWorkspaceFiles();

        // --- 10. DÉCLENCHEMENT DU RENDU MP4 ---
        let renderPollInterval = null;

        btnTriggerRender.addEventListener('click', async () => {
            const fileName = activeVideoPath.split('/').pop();
            btnTriggerRender.disabled = true;
            btnTriggerRender.innerHTML = `<span>⏳ Rendu en cours...</span>`;
            renderProgressBox.classList.add('active');
            renderProgressBar.style.width = '10%';
            renderPercentText.textContent = '10%';
            renderStatusTitle.textContent = 'Démarrage du moteur de rendu...';
            renderDetailText.textContent = `Préparation de ${fileName}...`;

            try {
                const res = await fetch('/api/render', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ video: fileName })
                });

                if (!res.ok) {
                    const errData = await res.json();
                    alert(errData.error || 'Erreur lors du lancement du rendu');
                    resetRenderUI();
                    return;
                }

                // Polling régulier de l'état du rendu
                renderPollInterval = setInterval(pollRenderStatus, 800);
            } catch (err) {
                alert('Impossible de contacter le serveur pour le rendu. Assurez-vous que studio-server est lancé.');
                resetRenderUI();
            }
        });

        async function pollRenderStatus() {
            try {
                const res = await fetch('/api/render-status');
                if (!res.ok) return;
                const status = await res.json();

                renderProgressBar.style.width = `${status.progress}%`;
                renderPercentText.textContent = `${status.progress}%`;
                renderStatusTitle.textContent = status.statusText;
                
                if (status.logs && status.logs.length > 0) {
                    renderDetailText.textContent = status.logs[status.logs.length - 1];
                }

                if (!status.isRendering) {
                    clearInterval(renderPollInterval);
                    setTimeout(() => {
                        resetRenderUI();
                        fetchWorkspaceFiles(); // Rafraîchir les rendus générés
                    }, 1200);
                }
            } catch (e) {
                clearInterval(renderPollInterval);
                resetRenderUI();
            }
        }

        function resetRenderUI() {
            btnTriggerRender.disabled = false;
            btnTriggerRender.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                <span>Lancer le Rendu MP4</span>
            `;
            setTimeout(() => {
                renderProgressBox.classList.remove('active');
            }, 2500);
        }

        let pendingDeleteVideo = null;

        function deleteVideoItem(e, videoName) {
            e.stopPropagation();
            pendingDeleteVideo = videoName;
            const desc = document.getElementById('deleteConfirmDesc');
            const cleanName = videoName ? videoName.split('/').pop() : '';
            if (desc) {
                desc.innerHTML = `Êtes-vous sûr de vouloir supprimer définitivement <strong style="color:#ffffff;">« ${escapeHtml(cleanName)} »</strong> ? Cette action est irréversible.`;
            }
            const modal = document.getElementById('deleteConfirmModal');
            if (modal) modal.classList.add('open');
        }

        function closeDeleteModal() {
            pendingDeleteVideo = null;
            const modal = document.getElementById('deleteConfirmModal');
            if (modal) modal.classList.remove('open');
        }

        async function executeConfirmedDelete() {
            if (!pendingDeleteVideo) return;
            const videoName = pendingDeleteVideo;
            const btn = document.getElementById('btnExecuteDeleteVideo');
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Suppression...';
            }

            try {
                const res = await fetch('/api/delete-video', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
                    body: JSON.stringify({ video: videoName })
                });
                const data = await res.json();
                if (res.ok) {
                    showToast('✓ Vidéo supprimée avec succès');
                    closeDeleteModal();

                    const baseName = videoName.split('/').pop();

                    // Mettre à jour immédiatement allWorkspaceVideos et les badges de compteurs ("Moi" & "Clients") sans attendre
                    allWorkspaceVideos = (allWorkspaceVideos || []).filter(v => {
                        const vPath = typeof v === 'string' ? v : (v.path || v.file || v.name || '');
                        return vPath !== videoName && !vPath.endsWith('/' + baseName);
                    });
                    const createurVideos = allWorkspaceVideos.filter(v => {
                        const p = (typeof v === 'string' ? v : (v.path || v.file || '')).toLowerCase();
                        const isCl = typeof v === 'object' && Boolean(v.isClient || v.clientName);
                        return !isCl && !p.startsWith('clients/');
                    });
                    const clientVideos = allWorkspaceVideos.filter(v => {
                        const p = (typeof v === 'string' ? v : (v.path || v.file || '')).toLowerCase();
                        const isCl = typeof v === 'object' && Boolean(v.isClient || v.clientName);
                        return isCl || p.startsWith('clients/');
                    });
                    const badgeCountCreateurs = document.getElementById('badgeCountCreateurs');
                    if (badgeCountCreateurs) badgeCountCreateurs.textContent = createurVideos.length;
                    const badgeCountClients = document.getElementById('badgeCountClients');
                    if (badgeCountClients) badgeCountClients.textContent = clientVideos.length;

                    // Enregistrer également dans marvidflow_deleted_videos pour synchronisation bidirectionnelle Dashboard <-> Studio
                    try {
                        const delList = JSON.parse(localStorage.getItem('marvidflow_deleted_videos') || localStorage.getItem('autoframe_deleted_videos') || '[]');
                        [videoName, baseName].forEach(item => {
                            if (item && !delList.includes(item)) delList.push(item);
                        });
                        localStorage.setItem('marvidflow_deleted_videos', JSON.stringify(delList));
                        localStorage.setItem('autoframe_deleted_videos', JSON.stringify(delList));
                    } catch(e) {}

                    // Nettoyage immédiat du cache localStorage local pour éviter toute résurrection au reload
                    try {
                        const rawCached = localStorage.getItem(CACHE_KEY_VIDEOS);
                        if (rawCached) {
                            let cachedList = JSON.parse(rawCached);
                            if (Array.isArray(cachedList)) {
                                cachedList = cachedList.filter(v => {
                                    const vPath = typeof v === 'string' ? v : (v.path || v.file || v.name);
                                    return vPath !== videoName && !vPath.endsWith('/' + baseName);
                                });
                                lastVideosJson = JSON.stringify(cachedList);
                                localStorage.setItem(CACHE_KEY_VIDEOS, lastVideosJson);
                            }
                        }
                    } catch(e) {}

                    // Retrait visuel immédiat dans le DOM
                    const cardToDelete = document.querySelector(`#videoListContainer .item-card[data-src="${videoName}"]`) ||
                                         document.querySelector(`#videoListContainer .item-card[data-src*="${baseName}"]`);
                    if (cardToDelete) cardToDelete.remove();

                    // Nettoyage de l'URL et de la vidéo active si c'était celle supprimée
                    const currentActiveName = (activeVideoPath || '').split('/').pop();
                    const deletedName = videoName.split('/').pop();
                    if (activeVideoPath === videoName || currentActiveName === deletedName) {
                        activeVideoPath = '';
                        localStorage.removeItem(CACHE_KEY_ACTIVE);
                        // Nettoyer l'URL du navigateur pour empêcher que le paramètre ?video=deleted ne recharge la vidéo au reload
                        if (window.history && window.history.replaceState) {
                            window.history.replaceState({}, document.title, window.location.pathname);
                        }
                    }

                    // Synchronisation fraîche serveur
                    await fetchWorkspaceFiles();

                    // Basculer automatiquement sur la première vidéo disponible
                    const firstCard = document.querySelector('#videoListContainer .item-card');
                    if (firstCard) {
                        firstCard.click();
                    } else {
                        // Plus aucune vidéo restante
                        previewFrame.src = 'about:blank';
                        document.getElementById('activeCompositionName').textContent = 'Aucune vidéo';
                    }
                } else {
                    showToast('Erreur : ' + (data.error || 'Impossible de supprimer la vidéo'));
                    closeDeleteModal();
                }
            } catch (err) {
                showToast('Erreur réseau lors de la suppression de la vidéo');
                closeDeleteModal();
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Supprimer définitivement';
                }
            }
        }

        async function cancelCurrentRender() {
            if (!confirm('Voulez-vous vraiment interrompre le rendu en cours ?')) return;

            try {
                const res = await fetch('/api/cancel-render', { method: 'POST' });
                const data = await res.json();
                if (res.ok) {
                    showToast('⛔ Rendu arrêté avec succès');
                    clearInterval(renderPollInterval);
                    renderStatusTitle.textContent = 'Rendu arrêté';
                    renderDetailText.textContent = 'Le processus a été annulé.';
                    resetRenderUI();
                } else {
                    alert(data.error || 'Impossible d\'arrêter le rendu');
                }
            } catch (err) {
                alert('Erreur réseau lors de l\'annulation');
            }
        }

        // --- 11. INITIALISATION ---
        window.addEventListener('load', () => {
            adaptViewerScale();
            updateTimelineUI();
            fetchWorkspaceFiles();
        });

        // Instant Navigation Hover Prefetch : élimine toute latence de changement de page
        document.addEventListener('mouseover', function(e) {
            const a = e.target.closest('a[href]');
            if (!a) return;
            const href = a.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('javascript') || href.startsWith('http')) return;
            if (!a.dataset.prefetched) {
                a.dataset.prefetched = 'true';
                const link = document.createElement('link');
                link.rel = 'prefetch';
                link.href = href;
                document.head.appendChild(link);
            }
        }, { passive: true });
