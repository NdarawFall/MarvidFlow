// --- GESTION DU SCRIPT HORODATÉ ---
        let isCustomScriptEnabled = false;
        let customScriptContent = '';

        const SAMPLE_SCRIPT_TEMPLATE = `[00:00 - 00:05]
Voix : Dans un monde où la vitesse fait toute la différence, seule l'audace fait la loi.
Visuel : Caméra rasante au ras du bitume. Un pickup rouge accélère et double les véhicules.

[00:05 - 00:10]
Voix : Deuxième souffle, nouvelle trajectoire.
Visuel : Travelling caméra fluide, switch moto en pleine course, virage serré.

[00:10 - 00:20]
Voix : L'altitude redéfinit l'horizon.
Visuel : Montée progressive vers les nuages, avion de ligne fendant le ciel au coucher de soleil.

[00:20 - 00:30]
Voix : Air Sénégal. Élevez vos ambitions.
Visuel : Rapprochement vitres de l'avion, fondu lumineux élégant et révélation du logo Air Sénégal.`;

        function openScriptModal() {
            const overlay = document.getElementById('scriptModalOverlay');
            const textarea = document.getElementById('customScriptInput');
            const toggle = document.getElementById('modalScriptToggle');
            const toggleLabel = document.getElementById('modalScriptToggleLabel');

            textarea.value = customScriptContent;
            toggle.checked = isCustomScriptEnabled;
            if (toggleLabel) {
                toggleLabel.textContent = isCustomScriptEnabled ? 'Actif' : 'Désactivé';
                toggleLabel.style.color = isCustomScriptEnabled ? '#ff4d5e' : 'var(--text-secondary)';
            }
            updateScriptStats();

            overlay.classList.add('open');
            setTimeout(() => textarea.focus(), 150);
        }

        function closeScriptModal() {
            const overlay = document.getElementById('scriptModalOverlay');
            overlay.classList.remove('open');
        }

        function handleScriptOverlayClick(e) {
            if (e.target.id === 'scriptModalOverlay') {
                closeScriptModal();
            }
        }

        // --- GESTION DU MODAL GUIDE IA EXTERNE ---
        const PROMPT_DOC_TEXT = `Tu es le Scénariste et Directeur Artistique de AutoFrame, un moteur de motion design vidéo 60 FPS basé sur Canvas 2D et GSAP.
Je souhaite créer une vidéo sur le sujet suivant :
« [INSÉRER LE SUJET DE LA VIDÉO ICI] »

Contraintes techniques de AutoFrame :
1. Format : [16:9 horizontal OU 9:16 vertical].
2. Durée totale : [ex: 15 secondes / 20 secondes / 30 secondes].
3. Style : [ex: Sport Broadcast, Minimaliste Tech, Growkaw Motivation, SaaS Explainer].
4. Règle anti-PowerPoint : Pas de barre de progression en haut, pas de badges d'écolier [Étape 1], design cinématographique épuré avec caméra dynamique.
5. Timing organique : Pas de découpage rigide (un hook de 2-3s, un cœur rythmé, une conclusion percutante).
6. Assets prévus : Mentionne les images, logos officiels, drapeaux ou cartes nécessaires.

Rédige-moi :
1. Le Prompt Général (synthèse en 2-3 phrases de l'angle éditorial et de la direction artistique).
2. Le Script Horodaté Détaillé respectant le format :
   [MM:SS - MM:SS] Scène X : [Nom de la Scène]
   Voix off : "[Texte exact mot pour mot]"
   Visuel : [Description précise des mouvements, animations de caméra, cartes, typographie cinétique]
   Assets : [Noms des images, logos ou illustrations à utiliser]`;

        function openDocModal() {
            const overlay = document.getElementById('docModalOverlay');
            const textarea = document.getElementById('promptDocTemplate');
            if (textarea) textarea.value = PROMPT_DOC_TEXT;
            if (overlay) overlay.classList.add('open');
        }

        function closeDocModal() {
            const overlay = document.getElementById('docModalOverlay');
            if (overlay) overlay.classList.remove('open');
        }

        function handleDocOverlayClick(e) {
            if (e.target.id === 'docModalOverlay') {
                closeDocModal();
            }
        }

        function copyDocPrompt() {
            const btn = document.getElementById('btnCopyPromptDoc');
            navigator.clipboard.writeText(PROMPT_DOC_TEXT).then(() => {
                if (btn) {
                    btn.innerHTML = '<span>✓ Copié !</span>';
                    btn.style.background = '#10b981';
                    setTimeout(() => {
                        btn.innerHTML = '<span>📋 Copier le Prompt</span>';
                        btn.style.background = '#dc2626';
                    }, 2500);
                }
            }).catch(() => {
                const textarea = document.getElementById('promptDocTemplate');
                if (textarea) {
                    textarea.select();
                    document.execCommand('copy');
                    alert('Prompt copié dans le presse-papier !');
                }
            });
        }

        function onScriptSwitchChange() {
            const toggle = document.getElementById('modalScriptToggle');
            const toggleLabel = document.getElementById('modalScriptToggleLabel');
            if (toggleLabel) {
                toggleLabel.textContent = toggle.checked ? 'Actif' : 'Désactivé';
                toggleLabel.style.color = toggle.checked ? '#ff4d5e' : 'var(--text-secondary)';
            }
        }

        function countTimestamps(text) {
            if (!text) return 0;
            const matches = text.match(/\[?\s*\d{1,2}:\d{2}\s*(?:-|à|to)\s*\d{1,2}:\d{2}\s*\]?/gi);
            return matches ? matches.length : 0;
        }

        function updateScriptStats() {
            const text = document.getElementById('customScriptInput').value;
            const lines = text ? text.split('\n').length : 0;
            const chars = text.length;
            const timings = countTimestamps(text);

            const linesEl = document.getElementById('scriptLinesCount');
            const charsEl = document.getElementById('scriptCharsCount');
            const timingsEl = document.getElementById('scriptTimestampsDetected');

            if (linesEl) linesEl.textContent = `${lines} ligne(s)`;
            if (charsEl) charsEl.textContent = `${chars} caractère(s)`;
            if (timingsEl) {
                timingsEl.textContent = `${timings} timing(s) détecté(s)`;
                timingsEl.style.color = timings > 0 ? '#ff4d5e' : 'var(--text-secondary)';
            }
        }

        function insertScriptSample() {
            const textarea = document.getElementById('customScriptInput');
            if (textarea.value.trim().length > 0) {
                if (!confirm('Remplacer le texte actuel par le modèle type de script horodaté ?')) {
                    return;
                }
            }
            textarea.value = SAMPLE_SCRIPT_TEMPLATE;
            document.getElementById('modalScriptToggle').checked = true;
            onScriptSwitchChange();
            updateScriptStats();
            textarea.focus();
        }

        function clearScriptText() {
            if (!confirm('Voulez-vous effacer l\'intégralité du script ?')) return;
            const textarea = document.getElementById('customScriptInput');
            textarea.value = '';
            updateScriptStats();
            textarea.focus();
        }

        function saveAndApplyScript() {
            const textarea = document.getElementById('customScriptInput');
            const toggle = document.getElementById('modalScriptToggle');
            const content = textarea.value.trim();

            if (content.length === 0) {
                isCustomScriptEnabled = false;
                customScriptContent = '';
            } else {
                isCustomScriptEnabled = toggle.checked || content.length > 0;
                customScriptContent = textarea.value;
            }

            renderScriptTriggerUI();
            closeScriptModal();
        }

        function disableScript() {
            isCustomScriptEnabled = false;
            renderScriptTriggerUI();
        }

        function renderScriptTriggerUI() {
            const btn = document.getElementById('btnToggleScriptModal');
            const label = document.getElementById('scriptBtnLabel');
            const banner = document.getElementById('scriptActiveBanner');
            const summary = document.getElementById('scriptBannerSummary');

            if (!btn || !label || !banner) return;

            const timings = countTimestamps(customScriptContent);

            if (isCustomScriptEnabled && customScriptContent.trim().length > 0) {
                btn.classList.add('active');
                label.textContent = 'Script : Actif ✓';
                banner.style.display = 'flex';
                if (summary) {
                    summary.textContent = `(${timings} timing(s) détecté(s) • ${customScriptContent.trim().length} caractères)`;
                }
            } else {
                btn.classList.remove('active');
                label.textContent = 'Script : Inactif';
                banner.style.display = 'none';
            }
        }
        // Helper pour coller un exemple de script horodaté directement dans la page
        function fillDirectSampleScript() {
            const scriptEl = document.getElementById('videoCustomScript');
            if (!scriptEl) return;
            scriptEl.value = `[00:00 - 00:03] Scène 1 : Le Hook / L'Élément Déclencheur
Voix off : "Voici l'annonce officielle qui va tout changer en 2026."
Visuel : Apparition cinétique du titre géant en blanc pur avec reflet néon cyan, slow push-in de caméra, halo volumétrique sombre.
Assets : logo_officiel.svg

[00:03 - 00:07] Scène 2 : Démonstration Chiffrée & Performance
Voix off : "Grâce à cette nouvelle architecture, les performances sont multipliées par dix."
Visuel : Entrée élastique d'une carte interface en verre dépoli (ratio 1:1), compteur dynamique qui grimpe de 0 à +142%, tracé laser électrique.
Assets : capture_dashboard.png

[00:07 - 00:10] Scène 3 : Conclusion & Appel à l'Action
Voix off : "Et toi, quel est ton avis ? Dis-le en commentaire !"
Visuel : Dézoom fluide, centrage géométrique de la carte finale avec bouton d'action haptique animé, fondu cinématographique au noir.`;
            updateCreationFormValidation();
            scriptEl.focus();
        }

        // State des assets uploadés
        const assetsState = {
            Images: [],
            Voix_Off: [],
            Musiques: [],
            Videos: []
        };

        // Validation dynamique du formulaire pour activation du bouton Créer
        
        // Toggle fluide du conteneur de script horodaté
        function toggleScriptBlock(active) {
            const wrapper = document.getElementById('scriptCollapsibleWrapper');
            const chk = document.getElementById('toggleScriptCheckbox');
            if (chk) chk.checked = active;
            if (wrapper) {
                if (active) {
                    wrapper.classList.add('open');
                    const scriptArea = document.getElementById('videoCustomScript');
                    if (scriptArea) setTimeout(() => scriptArea.focus(), 250);
                } else {
                    wrapper.classList.remove('open');
                }
            }
            updateCreationFormValidation();
        }

        function updateCreationFormValidation() {
            const promptEl = document.getElementById('videoPrompt');
            const scriptEl = document.getElementById('videoCustomScript');
            const btn = document.getElementById('btnSubmitGenerate');
            const hint = document.getElementById('creationValidationHint');
            const dot = document.getElementById('validationDot');
            const promptCounter = document.getElementById('promptCharCount');
            const scriptCounter = document.getElementById('scriptCharCount');
            const timingsCounter = document.getElementById('scriptTimingsCount');
            if (!btn) return;

            const promptText = promptEl ? promptEl.value.trim() : '';
            const promptLen = promptText.length;
            // Le prompt est la seule condition indispensable (dès 3 caractères)
            const hasPrompt = promptLen >= 3;

            const scriptText = scriptEl ? scriptEl.value.trim() : '';
            const scriptLen = scriptText.length;
            const detectedTimings = typeof countTimestamps === 'function' ? countTimestamps(scriptText) : 0;
            // Le script est 100% facultatif : s'il est fourni on l'utilise, sinon l'IA s'en charge
            const hasCustomScript = (scriptLen >= 10);

            customScriptContent = scriptText;
            isCustomScriptEnabled = hasCustomScript;

            // Compteur Prompt
            if (promptCounter) {
                if (hasPrompt) {
                    promptCounter.textContent = `${promptLen} caractères (Valide ✓)`;
                    promptCounter.style.color = '#ffffff';
                } else {
                    promptCounter.textContent = `${promptLen} / 3 caractères min`;
                    promptCounter.style.color = '#a3a3a3';
                }
            }

            // Compteur Script Horodaté (100% Facultatif)
            if (scriptCounter) {
                if (hasCustomScript) {
                    scriptCounter.textContent = `${scriptLen} caractères (Script manuel actif ✓)`;
                    scriptCounter.style.color = '#ffffff';
                } else {
                    scriptCounter.textContent = `Facultatif (L'IA génère le script automatiquement)`;
                    scriptCounter.style.color = '#a3a3a3';
                }
            }

            if (timingsCounter) {
                if (detectedTimings > 0) {
                    timingsCounter.textContent = `✓ ${detectedTimings} scène(s) horodatée(s) détectée(s)`;
                    timingsCounter.style.color = '#ffffff';
                } else {
                    timingsCounter.textContent = hasCustomScript ? `Scénarisation libre` : `Automatique par l'IA`;
                    timingsCounter.style.color = '#a3a3a3';
                }
            }

            // Assurer des valeurs par défaut si non encore sélectionnées
            if (!currentSelectedFormat) currentSelectedFormat = '16:9';
            if (!currentSelectedStyle) currentSelectedStyle = 'none';
            if (!currentAudioOption) currentAudioOption = 'full_mix';
            if (currentSubtitlesOption === null || currentSubtitlesOption === undefined) currentSubtitlesOption = true;

            // Le bouton s'active dès que le prompt est présent !
            const isReady = hasPrompt;

            if (isReady) {
                btn.disabled = false;
                if (hint) {
                    hint.textContent = hasCustomScript
                        ? 'Prompt et Script manuel détectés ! Prêt pour la génération IA.'
                        : 'Prompt prêt ! L\'IA va concevoir le script, la voix et la vidéo.';
                    hint.style.color = '#ffffff';
                }
                if (dot) dot.style.background = '#10b981';
            } else {
                btn.disabled = true;
                if (hint) {
                    hint.textContent = 'Écrivez votre prompt ou idée de vidéo pour commencer';
                    hint.style.color = '#a3a3a3';
                }
                if (dot) dot.style.background = 'rgba(255, 255, 255, 0.25)';
            }
        }

        // Bascule accordéon des sections pliables (pliées par défaut)
        function toggleCardSection(cardId) {
            const card = document.getElementById(cardId);
            if (!card) return;
            const body = card.querySelector('.card-collapsible-body');
            const isCollapsed = card.classList.contains('collapsed');
            if (isCollapsed) {
                card.classList.remove('collapsed');
                card.classList.add('open');
                if (body) body.style.display = 'block';
            } else {
                card.classList.remove('open');
                card.classList.add('collapsed');
                if (body) body.style.display = 'none';
            }
        }

        // Compteur de caractères du prompt et validation en temps réel
        const promptArea = document.getElementById('videoPrompt');
        if (promptArea) {
            promptArea.addEventListener('input', () => {
                updateCreationFormValidation();
            });
        }

        // Écouteur en temps réel sur le script horodaté
        const scriptArea = document.getElementById('videoCustomScript');
        if (scriptArea) {
            scriptArea.addEventListener('input', () => {
                updateCreationFormValidation();
            });
        }

        // Gestion du style de montage (Sans template sélectionné par défaut), format, audio et sous-titres
                // --- GESTION DU FOND DE BASE DE LA VIDÉO (UX ÉPURÉ, CADRE FIXE, COULEURS GLISSABLES SANS FERMETURE) ---
        let currentBackgroundType = 'white'; // 'white' | 'black' | 'gradient' | 'solid'
        let currentBackgroundColor = '#ffffff';
        let currentGradientColors = ['#ffffff', '#ff0033']; // 2 couleurs par défaut
        let currentGradientDirection = 'neon-tr-bl';
        let currentBackgroundGradient = 'linear-gradient(135deg, #ffffff, #ff0033)';

        function renderGradientStopsUI() {
            const container = document.getElementById('gradientStopsStack');
            const countText = document.getElementById('gradColorCountText');
            const btnAdd = document.getElementById('btnAddColorStop');
            if (!container) return;

            if (countText) countText.textContent = currentGradientColors.length;
            if (btnAdd) btnAdd.disabled = (currentGradientColors.length >= 4);

            container.innerHTML = '';
            const canDelete = currentGradientColors.length > 2;

            currentGradientColors.forEach((color, index) => {
                const chip = document.createElement('div');
                chip.className = 'gradient-stop-chip';
                const hexVal = color.replace('#', '').toUpperCase();

                chip.innerHTML = `
                    <span class="stop-num-label">#${index + 1}</span>
                    <input type="color" id="gradPicker_${index}" value="${color}" oninput="onGradientColorChange(${index}, this.value)" class="color-square-box" style="width:32px; height:28px;" title="Couleur #${index + 1}">
                    <div class="hex-input-wrap" style="height:28px; width:90px; padding: 0 6px;">
                        <span class="hex-prefix" style="font-size:11px;">#</span>
                        <input type="text" id="gradHex_${index}" value="${hexVal}" maxlength="6" oninput="onGradientHexChange(${index}, this.value)" class="hex-text-field" style="font-size:11px;">
                    </div>
                    ${canDelete ? `<button type="button" class="btn-remove-stop" onclick="removeGradientColorStop(${index})" title="Supprimer cette couleur" style="width:22px; height:22px; font-size:11px;">✕</button>` : `<span style="width:16px;"></span>`}
                `;
                container.appendChild(chip);
            });

            updateGradientCssString();
        }

        function addGradientColorStop() {
            if (currentGradientColors.length >= 4) return;
            const defaults = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981'];
            const nextColor = defaults[currentGradientColors.length] || '#3b82f6';
            currentGradientColors.push(nextColor);
            renderGradientStopsUI();
            updateLivePlayerBackground();
        }

        function removeGradientColorStop(index) {
            if (currentGradientColors.length <= 2) return;
            currentGradientColors.splice(index, 1);
            renderGradientStopsUI();
            updateLivePlayerBackground();
        }

        // IMPORTANT : Ne détruit PAS le DOM pendant le glisser/saisie pour ne pas fermer la palette native !
        function onGradientColorChange(index, val) {
            if (!val) return;
            currentGradientColors[index] = val;
            const hexInput = document.getElementById(`gradHex_${index}`);
            if (hexInput) hexInput.value = val.replace('#', '').toUpperCase();
            updateGradientCssString();
            updateLivePlayerBackground();
        }

        function onGradientHexChange(index, hex) {
            hex = hex.replace(/[^0-9A-Fa-f]/g, '');
            if (hex.length === 6) {
                const fullHex = '#' + hex;
                currentGradientColors[index] = fullHex;
                const picker = document.getElementById(`gradPicker_${index}`);
                if (picker) picker.value = fullHex;
                updateGradientCssString();
                updateLivePlayerBackground();
            }
        }

        function setGradientDirection(dir, btnEl) {
            currentGradientDirection = dir;
            document.querySelectorAll('.btn-grad-dir').forEach(b => b.classList.remove('active'));
            if (btnEl) btnEl.classList.add('active');
            updateGradientCssString();
            updateLivePlayerBackground();
        }

        function updateGradientCssString() {
            const colorsList = currentGradientColors.join(', ');
            const c1 = currentGradientColors[0] || '#ffffff';
            const c2 = currentGradientColors[1] || '#ff0033';
            const c3 = currentGradientColors[2] || (c1.toLowerCase() === '#ffffff' ? '#ffffff' : '#09090b');
            const c4 = currentGradientColors[3];

            if (currentGradientDirection.endsWith('deg')) {
                currentBackgroundGradient = `linear-gradient(${currentGradientDirection}, ${colorsList})`;
            } else if (currentGradientDirection === 'neon-tr-bl') {
                // Deux néons : coin supérieur droit et coin inférieur gauche
                if (c1.toLowerCase() === '#ffffff') {
                    currentBackgroundGradient = `radial-gradient(circle at 100% 0%, ${c2} 0%, transparent 65%), radial-gradient(circle at 0% 100%, ${c2} 0%, transparent 65%), #ffffff`;
                } else if (c4) {
                    currentBackgroundGradient = `radial-gradient(circle at 100% 0%, ${c1} 0%, transparent 60%), radial-gradient(circle at 0% 100%, ${c2} 0%, transparent 60%), radial-gradient(circle at 50% 50%, ${c3} 0%, transparent 55%), ${c4}`;
                } else {
                    currentBackgroundGradient = `radial-gradient(circle at 100% 0%, ${c1} 0%, transparent 65%), radial-gradient(circle at 0% 100%, ${c2} 0%, transparent 65%), ${c3}`;
                }
            } else if (currentGradientDirection === 'neon-tl-br') {
                // Deux néons : coin supérieur gauche et coin inférieur droit
                if (c1.toLowerCase() === '#ffffff') {
                    currentBackgroundGradient = `radial-gradient(circle at 0% 0%, ${c2} 0%, transparent 65%), radial-gradient(circle at 100% 100%, ${c2} 0%, transparent 65%), #ffffff`;
                } else if (c4) {
                    currentBackgroundGradient = `radial-gradient(circle at 0% 0%, ${c1} 0%, transparent 60%), radial-gradient(circle at 100% 100%, ${c2} 0%, transparent 60%), radial-gradient(circle at 50% 50%, ${c3} 0%, transparent 55%), ${c4}`;
                } else {
                    currentBackgroundGradient = `radial-gradient(circle at 0% 0%, ${c1} 0%, transparent 65%), radial-gradient(circle at 100% 100%, ${c2} 0%, transparent 65%), ${c3}`;
                }
            } else if (currentGradientDirection === 'neon-bottom') {
                // Néon demi-cercle centré en bas touchant les 2 coins inférieurs
                if (c1.toLowerCase() === '#ffffff') {
                    currentBackgroundGradient = `radial-gradient(ellipse 70% 60% at 50% 100%, ${c2} 0%, transparent 100%), #ffffff`;
                } else if (currentGradientColors.length >= 3) {
                    currentBackgroundGradient = `radial-gradient(ellipse 70% 60% at 50% 100%, ${c1} 0%, ${c2} 45%, transparent 100%), ${c3}`;
                } else {
                    currentBackgroundGradient = `radial-gradient(ellipse 70% 60% at 50% 100%, ${c2} 0%, transparent 100%), ${c1}`;
                }
            } else if (currentGradientDirection === 'neon-top') {
                // Néon demi-cercle centré en haut touchant les 2 coins supérieurs
                if (c1.toLowerCase() === '#ffffff') {
                    currentBackgroundGradient = `radial-gradient(ellipse 70% 60% at 50% 0%, ${c2} 0%, transparent 100%), #ffffff`;
                } else if (currentGradientColors.length >= 3) {
                    currentBackgroundGradient = `radial-gradient(ellipse 70% 60% at 50% 0%, ${c1} 0%, ${c2} 45%, transparent 100%), ${c3}`;
                } else {
                    currentBackgroundGradient = `radial-gradient(ellipse 70% 60% at 50% 0%, ${c2} 0%, transparent 100%), ${c1}`;
                }
            } else if (currentGradientDirection === 'neon-sides') {
                // Néons latéraux gauche & droite
                currentBackgroundGradient = `radial-gradient(ellipse 45% 75% at 0% 50%, ${c1} 0%, transparent 100%), radial-gradient(ellipse 45% 75% at 100% 50%, ${c2} 0%, transparent 100%), ${c3}`;
            } else if (currentGradientDirection === 'radial-center') {
                // Halo central
                currentBackgroundGradient = `radial-gradient(circle at 50% 50%, ${colorsList})`;
            } else {
                currentBackgroundGradient = `radial-gradient(circle at 100% 0%, ${c2} 0%, transparent 65%), radial-gradient(circle at 0% 100%, ${c2} 0%, transparent 65%), ${c1}`;
            }
            const gradSwatch = document.getElementById('bgRowGradientSwatch');
            if (gradSwatch) gradSwatch.style.background = currentBackgroundGradient;
        }

        function onSolidColorChanged(val) {
            if (!val) return;
            currentBackgroundColor = val;
            const hexInput = document.getElementById('solidHexInput');
            if (hexInput) hexInput.value = val.replace('#', '').toUpperCase();
            const solidSwatch = document.getElementById('bgRowSolidSwatch');
            if (solidSwatch) solidSwatch.style.background = val;
            updateLivePlayerBackground();
        }

        function onSolidHexInput(hex) {
            hex = hex.replace(/[^0-9A-Fa-f]/g, '');
            if (hex.length === 6) {
                const fullHex = '#' + hex;
                currentBackgroundColor = fullHex;
                const picker = document.getElementById('solidColorPicker');
                if (picker) picker.value = fullHex;
                const solidSwatch = document.getElementById('bgRowSolidSwatch');
                if (solidSwatch) solidSwatch.style.background = fullHex;
                updateLivePlayerBackground();
            }
        }

        function selectBackgroundType(type) {
            currentBackgroundType = type;

            ['auto', 'white', 'black', 'gradient', 'solid'].forEach(t => {
                const btn = document.getElementById(`bgRow_${t}`);
                if (btn) {
                    if (t === type) btn.classList.add('selected');
                    else btn.classList.remove('selected');
                }
            });

            const panelAuto = document.getElementById('panelAuto');
            const panelSolid = document.getElementById('panelSolid');
            const panelGradient = document.getElementById('panelGradient');

            if (panelAuto) {
                panelAuto.style.display = (type === 'auto') ? 'block' : 'none';
            }
            if (panelSolid) {
                if (type === 'solid') {
                    panelSolid.classList.remove('disabled-panel');
                } else {
                    panelSolid.classList.add('disabled-panel');
                }
            }
            if (panelGradient) {
                if (type === 'gradient') {
                    panelGradient.classList.remove('disabled-panel');
                } else {
                    panelGradient.classList.add('disabled-panel');
                }
            }

            if (type === 'auto') {
                currentBackgroundColor = '#000000';
            } else if (type === 'white') {
                currentBackgroundColor = '#ffffff';
            } else if (type === 'black') {
                currentBackgroundColor = '#000000';
            } else if (type === 'gradient') {
                renderGradientStopsUI();
            } else if (type === 'solid') {
                const picker = document.getElementById('solidColorPicker');
                if (picker && currentBackgroundColor) picker.value = currentBackgroundColor;
            }

            updateLivePlayerBackground();
        }

        function updateLivePlayerBackground() {
            const canvas = document.getElementById('monitorScreenCanvas');
            const headline = document.getElementById('mockStageHeadline');
            const subheadline = document.getElementById('mockStageSubheadline');
            const badge = document.getElementById('mockStageBadge');
            const card = document.getElementById('mockStageCard');
            if (!canvas) return;

            let appliedBg = '#000000';
            if (currentBackgroundType === 'auto') {
                appliedBg = 'radial-gradient(ellipse 75% 65% at 50% 25%, #1e1b4b 0%, #030712 100%)';
            } else if (currentBackgroundType === 'white') {
                appliedBg = '#ffffff';
            } else if (currentBackgroundType === 'black') {
                appliedBg = '#000000';
            } else if (currentBackgroundType === 'solid') {
                appliedBg = currentBackgroundColor || '#111827';
            } else if (currentBackgroundType === 'gradient') {
                appliedBg = currentBackgroundGradient;
            }

            canvas.style.background = appliedBg;

            // Détection de contraste adaptatif
            let isLight = false;
            if (currentBackgroundType === 'white') {
                isLight = true;
            } else if (currentBackgroundType === 'solid') {
                const hex = (currentBackgroundColor || '').replace('#', '');
                if (hex.length === 6) {
                    const r = parseInt(hex.slice(0, 2), 16);
                    const g = parseInt(hex.slice(2, 4), 16);
                    const b = parseInt(hex.slice(4, 6), 16);
                    isLight = (0.299 * r + 0.587 * g + 0.114 * b) > 140;
                }
            } else if (currentBackgroundType === 'gradient' && currentGradientColors.length > 0) {
                const firstHex = currentGradientColors[0].replace('#', '');
                if (firstHex.length === 6) {
                    const r = parseInt(firstHex.slice(0, 2), 16);
                    const g = parseInt(firstHex.slice(2, 4), 16);
                    const b = parseInt(firstHex.slice(4, 6), 16);
                    isLight = (0.299 * r + 0.587 * g + 0.114 * b) > 150;
                }
            }

            if (headline) headline.style.color = isLight ? '#09090b' : '#ffffff';
            if (subheadline) subheadline.style.color = isLight ? '#475569' : '#94a3b8';
            if (badge) {
                badge.style.color = isLight ? '#09090b' : '#ffffff';
                badge.style.background = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)';
                badge.style.borderColor = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.18)';
            }
            if (card) {
                card.style.background = isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(13, 17, 23, 0.85)';
                card.style.borderColor = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.12)';
                card.style.color = isLight ? '#09090b' : '#ffffff';
                card.style.boxShadow = isLight ? '0 10px 25px rgba(0, 0, 0, 0.08)' : '0 10px 25px rgba(0, 0, 0, 0.45)';
            }

            // Synchronisation du téléphone de prévisualisation des sous-titres
            const subCanvas = document.getElementById('subMonitorScreenCanvas');
            const subHeadline = document.getElementById('subMockHeadline');
            const subSubheadline = document.getElementById('subMockSubheadline');
            const subBadge = document.getElementById('subMockBadge');
            const subCard = document.getElementById('subMockCard');
            if (subCanvas) subCanvas.style.background = appliedBg;
            if (subHeadline) subHeadline.style.color = isLight ? '#09090b' : '#ffffff';
            if (subSubheadline) subSubheadline.style.color = isLight ? '#475569' : '#94a3b8';
            if (subBadge) {
                subBadge.style.color = isLight ? '#09090b' : '#ffffff';
                subBadge.style.background = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)';
                subBadge.style.borderColor = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.18)';
            }
            if (subCard) {
                subCard.style.background = isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(13, 17, 23, 0.85)';
                subCard.style.borderColor = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.12)';
                subCard.style.color = isLight ? '#09090b' : '#ffffff';
                subCard.style.boxShadow = isLight ? '0 10px 25px rgba(0, 0, 0, 0.08)' : '0 10px 25px rgba(0, 0, 0, 0.45)';
            }
        }

        let currentSelectedStyle = 'none';
        let currentSelectedFormat = '16:9';
        let currentAudioOption = 'full_mix';
        let currentSubtitlesOption = true;
        const currentChannelId = new URLSearchParams(window.location.search).get('channel') || '';
        // Suffixe aléatoire à 4 chiffres unique pour identifier et lier tous les assets d'une même vidéo autonome
        const sessionAssetSuffix = Math.floor(1000 + Math.random() * 9000).toString();

        
        async function initHeaderProfile() {
            const urlParams = new URLSearchParams(window.location.search);
            const channelId = urlParams.get('channel') || '';
            const clientParam = urlParams.get('client') || '';
            const fromParam = urlParams.get('from') || '';
            const referrer = document.referrer || '';

            const badge = document.getElementById('headerProfileBadge');
            const imgEl = document.getElementById('headerProfileAvatarImg');
            const fallbackEl = document.getElementById('headerProfileAvatarFallback');
            const tagEl = document.getElementById('headerProfileTag');
            const nameEl = document.getElementById('headerProfileName');
            const ringEl = document.getElementById('profileBadgeRing');

            if (!badge) return;

            // 1. Détection CLIENT (paramètre URL ?client=... OU provenance directe depuis monteur.html)
            if (clientParam || fromParam === 'monteur' || referrer.includes('monteur.html')) {
                let clientName = clientParam;
                let clientAvatarUrl = '';

                try {
                    const saved = sessionStorage.getItem('vibeeditor_active_client');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        if (!clientName && parsed.name) clientName = parsed.name;
                        if (parsed.avatarUrl) clientAvatarUrl = parsed.avatarUrl;
                    }
                } catch (e) {}

                if (!clientName || !clientAvatarUrl) {
                    try {
                        const res = await fetch('/api/clients');
                        if (res.ok) {
                            const data = await res.json();
                            const clients = data.clients || [];
                            const found = clientName ? clients.find(c => c.name === clientName) : clients[0];
                            if (found) {
                                clientName = found.name;
                                clientAvatarUrl = found.avatarUrl || '';
                            }
                        }
                    } catch (e) {}
                }

                if (clientName) {
                    badge.style.display = 'inline-flex';
                    ringEl.className = 'profile-badge-avatar-ring ring-client';
                    tagEl.className = 'profile-badge-tag tag-client';
                    tagEl.textContent = 'Client';
                    nameEl.textContent = clientName;
                    badge.title = 'Client : ' + clientName;

                    if (clientAvatarUrl) {
                        imgEl.src = clientAvatarUrl.startsWith('/') ? clientAvatarUrl : ('/' + clientAvatarUrl);
                        imgEl.style.display = 'block';
                        fallbackEl.style.display = 'none';
                    } else {
                        imgEl.style.display = 'none';
                        fallbackEl.style.display = 'flex';
                        fallbackEl.className = 'profile-badge-avatar-fallback fallback-client';
                        fallbackEl.textContent = clientName.charAt(0).toUpperCase();
                    }
                    return;
                }
            }

            // 2. Détection CHAÎNE (paramètre URL ?channel=... OU provenance depuis channel.html)
            if (channelId || fromParam === 'channel' || referrer.includes('channel.html')) {
                let chId = channelId;
                let chName = '';
                let chAvatar = '';
                let chPlatform = '';

                try {
                    const saved = sessionStorage.getItem('vibeeditor_active_channel');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        if (!chId && parsed.id) chId = parsed.id;
                        if (parsed.name) chName = parsed.name;
                        if (parsed.avatar) chAvatar = parsed.avatar;
                        if (parsed.platform) chPlatform = parsed.platform;
                    }
                } catch (e) {}

                if (!chName) {
                    try {
                        const res = await fetch('/api/channels');
                        if (res.ok) {
                            const chans = await res.json();
                            const found = chId ? chans.find(c => c.id === chId) : chans[0];
                            if (found) {
                                chName = found.name;
                                chAvatar = found.avatar || '';
                                chPlatform = found.platform || 'Chaîne';
                            }
                        }
                    } catch (e) {}
                }

                if (chName) {
                    badge.style.display = 'inline-flex';
                    ringEl.className = 'profile-badge-avatar-ring ring-channel';
                    tagEl.className = 'profile-badge-tag tag-channel';
                    tagEl.textContent = chPlatform || 'Chaîne';
                    nameEl.textContent = chName;
                    badge.title = 'Chaîne : ' + chName + (chPlatform ? ' (' + chPlatform + ')' : '');

                    if (chAvatar) {
                        imgEl.src = chAvatar.startsWith('/') ? chAvatar : ('/' + chAvatar);
                        imgEl.style.display = 'block';
                        fallbackEl.style.display = 'none';
                    } else {
                        imgEl.style.display = 'none';
                        fallbackEl.style.display = 'flex';
                        fallbackEl.className = 'profile-badge-avatar-fallback fallback-channel';
                        fallbackEl.textContent = chName.charAt(0).toUpperCase();
                    }
                    return;
                }
            }

            // 3. Ni client ni chaîne : ON NE MET RIEN
            badge.style.display = 'none';
        }

        function applyAppInitialDefaults() {
            renderStyleCards(DEFAULT_STYLES);
            renderGradientStopsUI();

            // 1. Format par défaut : 16:9 (rectangle)
            selectVideoFormat('16:9');

            // 2. Montage et piste audio par défaut : Sans audio
            selectAudioOption('none');
            loadElevenVoicesForCreateVideo();
            loadEdgeVoicesForCreateVideo();

            // 3. Modèles de sous-titres par défaut : Sans sous-titres
            selectSubtitlesOption(false);

            // 4. Fond de base par défaut : Décision IA
            selectBackgroundType('auto');
        }

        function selectVideoFormat(fmt) {
            currentSelectedFormat = fmt;
            ['16:9', '9:16', '1:1'].forEach(f => {
                const idSafe = f.replace(':', '_');
                const card = document.getElementById(`formatCard_${idSafe}`);
                if (card) {
                    if (f === fmt) card.classList.add('selected');
                    else card.classList.remove('selected');
                }
            });
            updateBgPlayerFormat(fmt);
            updateSubMockupFormat(fmt);
            updateCreationFormValidation();
        }

        function updateSubMockupFormat(fmt) {
            const subWrapper = document.getElementById('subMockupWrapper');
            if (!subWrapper) return;
            subWrapper.classList.remove('mode-landscape', 'mode-portrait', 'mode-square');
            if (fmt === '9:16') {
                subWrapper.classList.add('mode-portrait');
            } else if (fmt === '1:1') {
                subWrapper.classList.add('mode-square');
            } else {
                subWrapper.classList.add('mode-landscape');
            }
            updateLiveSubtitlePreview();
        }

        function updateBgPlayerFormat(fmt) {
            const wrapper = document.getElementById('androidMockupWrapper');
            if (!wrapper) return;
            wrapper.classList.remove('mode-landscape', 'mode-portrait', 'mode-square');
            if (fmt === '9:16') {
                wrapper.classList.add('mode-portrait');
            } else if (fmt === '1:1') {
                wrapper.classList.add('mode-square');
            } else {
                wrapper.classList.add('mode-landscape');
            }
        }

        function updateUploadBoxesVisibility(opt) {
            const boxVoice = document.getElementById('uploadBoxVoice');
            const boxMusic = document.getElementById('uploadBoxMusic');
            if (!boxVoice || !boxMusic) return;

            if (opt === 'voice_only') {
                boxVoice.style.display = 'flex';
                boxMusic.style.display = 'none';
            } else if (opt === 'music_only') {
                boxVoice.style.display = 'none';
                boxMusic.style.display = 'flex';
            } else if (opt === 'none') {
                boxVoice.style.display = 'none';
                boxMusic.style.display = 'none';
            } else {
                // full_mix ou par défaut
                boxVoice.style.display = 'flex';
                boxMusic.style.display = 'flex';
            }
        }

        function selectAudioOption(opt) {
            currentAudioOption = opt;
            const cards = {
                'voice_only': document.getElementById('audioCardVoiceOnly'),
                'music_only': document.getElementById('audioCardMusicOnly'),
                'full_mix': document.getElementById('audioCardFullMix'),
                'none': document.getElementById('audioCardNone')
            };
            Object.keys(cards).forEach(key => {
                if (cards[key]) {
                    if (key === opt) cards[key].classList.add('selected');
                    else cards[key].classList.remove('selected');
                }
            });
            updateUploadBoxesVisibility(opt);
            updateVoiceConfigBlockState(opt);
            updateCreationFormValidation();
        }

        // --- GESTION DU MOTEUR & SÉLECTEUR DE VOIX OFF DANS CREATE VIDEO (MODERNE AVEC DRAPEAUX & RECHERCHE) ---
        let currentVoiceSource = 'edge';
        let createElevenVoicesCache = {};
        let createEdgeVoicesCache = {};
        let elevenVoicesRawList = [];
        let edgeVoicesRawList = [];

        function getVoiceFlagUrl(voice) {
            const lang = ((voice && voice.language) || '').toLowerCase();
            const name = ((voice && voice.name) || '').toLowerCase();
            if (lang.includes('french') || lang.includes('français') || lang.includes('fr')) return 'https://flagcdn.com/fr.svg';
            if (lang.includes('english') || lang.includes('anglais') || lang.includes('en')) {
                if (name.includes('british') || name.includes('uk') || name.includes('london')) return 'https://flagcdn.com/gb.svg';
                if (name.includes('australian') || name.includes('au')) return 'https://flagcdn.com/au.svg';
                if (name.includes('canadian') || name.includes('ca')) return 'https://flagcdn.com/ca.svg';
                return 'https://flagcdn.com/us.svg';
            }
            if (lang.includes('spanish') || lang.includes('espagnol') || lang.includes('es')) return 'https://flagcdn.com/es.svg';
            if (lang.includes('german') || lang.includes('allemand') || lang.includes('de')) return 'https://flagcdn.com/de.svg';
            if (lang.includes('italian') || lang.includes('italien') || lang.includes('it')) return 'https://flagcdn.com/it.svg';
            if (lang.includes('portuguese') || lang.includes('portugais') || lang.includes('pt')) return 'https://flagcdn.com/pt.svg';
            if (lang.includes('japanese') || lang.includes('japonais') || lang.includes('ja')) return 'https://flagcdn.com/jp.svg';
            if (lang.includes('chinese') || lang.includes('chinois') || lang.includes('zh')) return 'https://flagcdn.com/cn.svg';
            if (lang.includes('arabic') || lang.includes('arabe') || lang.includes('ar')) return 'https://flagcdn.com/sa.svg';
            if (lang.includes('wolof') || name.includes('wolof') || name.includes('senegal')) return 'https://flagcdn.com/sn.svg';
            if (lang.includes('russian') || lang.includes('russe') || lang.includes('ru')) return 'https://flagcdn.com/ru.svg';
            if (lang.includes('dutch') || lang.includes('néerlandais') || lang.includes('nl')) return 'https://flagcdn.com/nl.svg';
            if (lang.includes('polish') || lang.includes('polonais') || lang.includes('pl')) return 'https://flagcdn.com/pl.svg';
            return 'https://flagcdn.com/us.svg';
        }

        function toggleVoiceDropdown(menuId) {
            const menu = document.getElementById(menuId);
            if (!menu) return;
            const isOpen = menu.classList.contains('open');
            // Fermer tous les menus ouverts
            document.querySelectorAll('.voice-dropdown-menu').forEach(m => m.classList.remove('open'));
            if (!isOpen) {
                menu.classList.add('open');
                // Focus sur l'input de recherche
                const searchInput = menu.querySelector('.voice-search-input');
                if (searchInput) {
                    setTimeout(() => searchInput.focus(), 60);
                }
            }
        }

        // Fermer les dropdowns quand on clique ailleurs
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.modern-voice-picker')) {
                document.querySelectorAll('.voice-dropdown-menu').forEach(m => m.classList.remove('open'));
            }
        });

        function filterVoicesList(engine) {
            if (engine === 'eleven') {
                const query = (document.getElementById('searchElevenInput').value || '').toLowerCase().trim();
                const filtered = elevenVoicesRawList.filter(v => 
                    (v.name || '').toLowerCase().includes(query) || 
                    (v.category || '').toLowerCase().includes(query)
                );
                renderVoiceRows('eleven', filtered);
            } else if (engine === 'edge') {
                const query = (document.getElementById('searchEdgeInput').value || '').toLowerCase().trim();
                const filtered = edgeVoicesRawList.filter(v => 
                    (v.name || '').toLowerCase().includes(query) || 
                    (v.language || '').toLowerCase().includes(query) ||
                    (v.gender || '').toLowerCase().includes(query)
                );
                renderVoiceRows('edge', filtered);
            }
        }

        function renderVoiceRows(engine, list) {
            const listContainer = document.getElementById(engine === 'eleven' ? 'listElevenItems' : 'listEdgeItems');
            const currentSelectedId = document.getElementById(engine === 'eleven' ? 'createVideoElevenVoiceSelect' : 'createVideoEdgeVoiceSelect').value;
            if (!listContainer) return;

            if (!list || list.length === 0) {
                listContainer.innerHTML = '<div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 12px;">Aucune voix trouvée</div>';
                return;
            }

            let html = '';
            list.forEach(v => {
                const isSel = v.id === currentSelectedId ? 'selected' : '';
                const flagUrl = getVoiceFlagUrl(v);
                const sub = v.category ? `${v.category === 'cloned' ? '✨ Voix clonée' : 'Officielle'}` : `${v.language || 'Neural'} ${v.gender ? '• ' + v.gender : ''}`;
                
                const previewBtnHtml = engine === 'eleven'
                    ? (v.previewUrl ? `<button type="button" class="btn-inline-preview" onclick="event.stopPropagation(); playDirectPreview('${v.previewUrl}')" title="Écouter un extrait">▶</button>` : '')
                    : `<button type="button" class="btn-inline-preview" onclick="event.stopPropagation(); playDirectEdgePreview('${v.id}')" title="Écouter cette voix">▶</button>`;

                html += `
                    <div class="voice-item-row ${isSel}" onclick="selectVoiceItem('${engine}', '${v.id}')">
                        <div class="voice-item-left">
                            <img class="voice-flag-img" src="${flagUrl}" alt="Flag">
                            <div class="voice-item-info">
                                <span class="voice-item-title">${v.name}</span>
                                <span class="voice-item-subtitle">${sub}</span>
                            </div>
                        </div>
                        <div class="voice-item-actions">
                            ${previewBtnHtml}
                        </div>
                    </div>
                `;
            });
            listContainer.innerHTML = html;
        }

        function selectVoiceItem(engine, voiceId) {
            const cache = engine === 'eleven' ? createElevenVoicesCache : createEdgeVoicesCache;
            const voice = cache[voiceId];
            if (!voice) return;

            if (engine === 'eleven') {
                document.getElementById('createVideoElevenVoiceSelect').value = voice.id;
                document.getElementById('nameElevenSelected').textContent = voice.name;
                document.getElementById('flagElevenSelected').src = getVoiceFlagUrl(voice);
                document.getElementById('badgeElevenSelected').textContent = voice.category || 'ElevenLabs';
                document.getElementById('dropdownEleven').classList.remove('open');
                updateElevenVoicePreviewBtn();
            } else {
                document.getElementById('createVideoEdgeVoiceSelect').value = voice.id;
                document.getElementById('nameEdgeSelected').textContent = voice.name;
                document.getElementById('flagEdgeSelected').src = getVoiceFlagUrl(voice);
                document.getElementById('badgeEdgeSelected').textContent = (voice.language || 'Neural').toUpperCase();
                document.getElementById('dropdownEdge').classList.remove('open');
            }

            // Rafraîchir les surbrillances
            if (engine === 'eleven') renderVoiceRows('eleven', elevenVoicesRawList);
            else renderVoiceRows('edge', edgeVoicesRawList);

            updateVoiceBadgeStatus();
        }

        function playDirectPreview(url) {
            if (!url) return;
            let audio = document.getElementById('createVideoAudioPreview');
            if (!audio) {
                audio = new Audio();
                audio.id = 'createVideoAudioPreview';
                document.body.appendChild(audio);
            }
            audio.src = url;
            audio.play().catch(e => console.warn('Erreur écoute voix:', e));
        }

        async function playDirectEdgePreview(voiceId) {
            if (!voiceId) return;
            try {
                const res = await fetch(`/api/edge/preview?voice=${encodeURIComponent(voiceId)}`);
                const data = await res.json();
                if (data.success && data.audioUrl) {
                    playDirectPreview(data.audioUrl + '?t=' + Date.now());
                } else {
                    alert(data.error || "Erreur de génération préécoute Edge");
                }
            } catch(e) {
                console.warn('Erreur préécoute Edge:', e);
            }
        }

        function selectVoiceSource(source) {
            currentVoiceSource = source;
            const cardEleven = document.getElementById('voiceChoiceCardEleven');
            const cardEdge = document.getElementById('voiceChoiceCardEdge');
            const cardCustom = document.getElementById('voiceChoiceCardCustom');
            const panelEleven = document.getElementById('voicePanelEleven');
            const panelEdge = document.getElementById('voicePanelEdge');
            const panelCustom = document.getElementById('voicePanelCustom');

            if (cardEleven) cardEleven.classList.toggle('selected', source === 'elevenlabs');
            if (cardEdge) cardEdge.classList.toggle('selected', source === 'edge');
            if (cardCustom) cardCustom.classList.toggle('selected', source === 'custom');

            if (panelEleven) panelEleven.style.display = source === 'elevenlabs' ? 'flex' : 'none';
            if (panelEdge) panelEdge.style.display = source === 'edge' ? 'flex' : 'none';
            if (panelCustom) panelCustom.style.display = source === 'custom' ? 'block' : 'none';

            // Mettre en pause tout extrait audio en cours
            const audioPreview = document.getElementById('createVideoAudioPreview');
            if (audioPreview) audioPreview.pause();

            updateVoiceBadgeStatus();
            updateUploadBoxesVisibility(currentAudioOption);
            updateCreationFormValidation();
        }

        function updateVoiceConfigBlockState(opt) {
            const disabledNotice = document.getElementById('voiceDisabledNotice');
            const container = document.getElementById('voiceInteractiveContainer');
            const badge = document.getElementById('voiceConfigBadgeStatus');
            const audioPreview = document.getElementById('createVideoAudioPreview');

            const isDisabled = (opt === 'music_only' || opt === 'none');

            if (disabledNotice) {
                disabledNotice.style.display = isDisabled ? 'flex' : 'none';
            }

            if (container) {
                if (isDisabled) {
                    container.style.opacity = '0.35';
                    container.style.pointerEvents = 'none';
                    if (audioPreview) audioPreview.pause();
                } else {
                    container.style.opacity = '1';
                    container.style.pointerEvents = 'auto';
                }
            }

            if (badge) {
                if (opt === 'music_only') {
                    badge.textContent = 'Désactivé (Option "Musique seulement" active)';
                    badge.style.color = '#ff9f1c';
                } else if (opt === 'none') {
                    badge.textContent = 'Désactivé (Option "Sans audio" active)';
                    badge.style.color = 'var(--text-muted)';
                } else {
                    badge.style.color = 'var(--text-muted)';
                    updateVoiceBadgeStatus();
                }
            }
        }

        function updateVoiceBadgeStatus() {
            const badge = document.getElementById('voiceConfigBadgeStatus');
            if (!badge) return;
            if (currentAudioOption === 'music_only' || currentAudioOption === 'none') return;

            if (currentVoiceSource === 'elevenlabs') {
                const select = document.getElementById('createVideoElevenVoiceSelect');
                const selectedText = select && select.selectedIndex >= 0 ? select.options[select.selectedIndex].text : 'ElevenLabs';
                badge.textContent = `ElevenLabs : ${selectedText}`;
            } else if (currentVoiceSource === 'edge') {
                const select = document.getElementById('createVideoEdgeVoiceSelect');
                const selectedVal = select ? select.value : 'fr-FR-HenriNeural';
                const v = createEdgeVoicesCache[selectedVal];
                const selectedText = v ? v.name : 'Henri (Français - Naturel)';
                badge.textContent = `Edge TTS (100% Gratuit) : ${selectedText}`;
            } else {
                badge.textContent = 'Mon propre fichier audio (Attribution des Médias)';
            }
        }

        async function loadElevenVoicesForCreateVideo() {
            try {
                const res = await fetch('/api/elevenlabs/voices');
                if (!res.ok) throw new Error("Impossible de charger les voix ElevenLabs");
                const data = await res.json();

                createElevenVoicesCache = {};
                elevenVoicesRawList = [];

                if (data.customVoices) {
                    data.customVoices.forEach(v => {
                        createElevenVoicesCache[v.id] = v;
                        elevenVoicesRawList.push(v);
                    });
                }
                if (data.defaultVoices) {
                    data.defaultVoices.forEach(v => {
                        createElevenVoicesCache[v.id] = v;
                        elevenVoicesRawList.push(v);
                    });
                }

                renderVoiceRows('eleven', elevenVoicesRawList);

                // Sélectionner la 1ère voix par défaut
                if (elevenVoicesRawList.length > 0) {
                    const savedVoice = localStorage.getItem('vibeeditor_elevenlabs_voice_id');
                    const initial = (savedVoice && createElevenVoicesCache[savedVoice]) ? savedVoice : elevenVoicesRawList[0].id;
                    selectVoiceItem('eleven', initial);
                }
            } catch(e) {
                const list = document.getElementById('listElevenItems');
                if (list) list.innerHTML = '<div style="padding:14px; color:#ff4444; font-size:12px;">Erreur chargement ElevenLabs (Vérifiez la clé)</div>';
            }
        }

        async function _old_loadElevenVoices() {
            const select = document.getElementById('createVideoElevenVoiceSelect');
            if (!select) return;
            select.innerHTML = '<option value="">Chargement des voix ElevenLabs...</option>';

            try {
                const res = await fetch('/api/elevenlabs/voices');
                if (!res.ok) throw new Error("Impossible de charger les voix ElevenLabs");
                const data = await res.json();

                createElevenVoicesCache = {};
                select.innerHTML = '';

                // Voix personnalisées
                if (data.customVoices && data.customVoices.length > 0) {
                    const grp = document.createElement('optgroup');
                    grp.label = `Mes Voix Créées (${data.customVoices.length})`;
                    data.customVoices.forEach(v => {
                        createElevenVoicesCache[v.id] = v;
                        const opt = document.createElement('option');
                        opt.value = v.id;
                        opt.textContent = `${v.name}`;
                        grp.appendChild(opt);
                    });
                    select.appendChild(grp);
                }

                // Voix officielles
                if (data.defaultVoices && data.defaultVoices.length > 0) {
                    const grp = document.createElement('optgroup');
                    grp.label = `Voix Officielles ElevenLabs (${data.defaultVoices.length})`;
                    data.defaultVoices.forEach(v => {
                        createElevenVoicesCache[v.id] = v;
                        const opt = document.createElement('option');
                        opt.value = v.id;
                        opt.textContent = `${v.name}`;
                        grp.appendChild(opt);
                    });
                    select.appendChild(grp);
                }

                updateElevenVoicePreviewBtn();
                updateVoiceBadgeStatus();
            } catch(e) {
                select.innerHTML = '<option value="">Erreur chargement ElevenLabs (Vérifiez votre clé dans Paramètres)</option>';
            }
        }

        async function loadEdgeVoicesForCreateVideo() {
            try {
                let data = null;
                const res = await fetch('/api/edge/voices');
                if (res.ok) data = await res.json();

                if (!data || !data.success) {
                    throw new Error("Impossible de récupérer les voix Edge TTS");
                }

                createEdgeVoicesCache = {};
                edgeVoicesRawList = [];

                if (data.frenchVoices) {
                    data.frenchVoices.forEach(v => {
                        createEdgeVoicesCache[v.id] = v;
                        edgeVoicesRawList.push(v);
                    });
                }
                if (data.englishVoices) {
                    data.englishVoices.slice(0, 30).forEach(v => {
                        createEdgeVoicesCache[v.id] = v;
                        edgeVoicesRawList.push(v);
                    });
                }

                renderVoiceRows('edge', edgeVoicesRawList);

                if (edgeVoicesRawList.length > 0) {
                    const savedEdge = localStorage.getItem('vibeeditor_edge_voice_id');
                    const initial = (savedEdge && createEdgeVoicesCache[savedEdge]) ? savedEdge : (createEdgeVoicesCache['fr-FR-HenriNeural'] ? 'fr-FR-HenriNeural' : edgeVoicesRawList[0].id);
                    selectVoiceItem('edge', initial);
                }
            } catch(e) {
                const list = document.getElementById('listEdgeItems');
                if (list) list.innerHTML = '<div style="padding:14px; color:#ff4444; font-size:12px;">Erreur chargement Edge TTS</div>';
            }
        }

        function updateElevenVoicePreviewBtn() {
            const select = document.getElementById('createVideoElevenVoiceSelect');
            const btn = document.getElementById('btnPreviewElevenCreate');
            const voice = select ? createElevenVoicesCache[select.value] : null;
            if (btn) {
                btn.style.display = (voice && voice.previewUrl) ? 'inline-flex' : 'none';
            }
            updateVoiceBadgeStatus();
        }

        async function playVoicePreviewCreate(engine) {
            if (engine === 'eleven') {
                const select = document.getElementById('createVideoElevenVoiceSelect');
                const voice = select ? createElevenVoicesCache[select.value] : null;
                if (!voice || !voice.previewUrl) return;
                playDirectPreview(voice.previewUrl);
            } else if (engine === 'edge') {
                const select = document.getElementById('createVideoEdgeVoiceSelect');
                const voiceId = select ? select.value : 'fr-FR-HenriNeural';
                const btn = document.getElementById('btnPreviewEdgeCreate');
                const origHtml = btn ? btn.innerHTML : '';
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = `<span style="font-size:11px;">⏳ Préécoute...</span>`;
                }
                try {
                    await playDirectEdgePreview(voiceId);
                } finally {
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = origHtml;
                    }
                }
            }
        }

        let currentSubtitleType = 'type-wordbyword';
        let currentSubtitleFont = 'font-poppins';
        let currentSubtitleCustomFont = '';
        let currentSubtitleBaseColorHex = '#ffffff';
        let currentSubtitleGlow = 'none';
        let currentSubtitleBg = 'none';
        let currentSubtitleBgColorHex = 'rgba(0, 0, 0, 0.75)';
        let currentSubtitleRadius = 'radius-none';
        let currentSubtitleAccentColor = '#ffe600';
        let currentSubtitlePos = 'pos-bottom';

        let subAnimInterval = null;
        let subActiveWordIdx = 0;
        const subPreviewWords = ["Chaque", "seconde", "compte", "ici"];

        // Liste exhaustive des polices installées sur Windows / PC par défaut
        const SYSTEM_PC_FONTS = [
            'Arial', 'Arial Black', 'Bahnschrift', 'Calibri', 'Cambria', 'Candara', 
            'Century Gothic', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 
            'Courier New', 'Franklin Gothic Medium', 'Gabriola', 'Georgia', 'Impact', 
            'Lucida Console', 'Lucida Sans Unicode', 'Microsoft Sans Serif', 'Montserrat', 
            'Palatino Linotype', 'Poppins', 'Segoe UI', 'Sitka', 'Sylfaen', 'Tahoma', 
            'Times New Roman', 'Trebuchet MS', 'Verdana'
        ];
        let detectedPcFonts = [...SYSTEM_PC_FONTS];

        // Détection dynamique des polices locales du PC si supporté par le navigateur
        async function initPcFontsList() {
            if ('queryLocalFonts' in window) {
                try {
                    const fonts = await window.queryLocalFonts();
                    const names = new Set(SYSTEM_PC_FONTS);
                    for (const f of fonts) {
                        if (f.family) names.add(f.family);
                    }
                    detectedPcFonts = Array.from(names).sort();
                } catch(e) {}
            }
        }
        initPcFontsList();

        function showPcFontsDropdown() {
            const dropdown = document.getElementById('subPcFontsDropdown');
            if (!dropdown) return;
            const input = document.getElementById('subCustomFontInput');
            filterPcFontsDropdown(input ? input.value : '');
            dropdown.style.display = 'block';
        }

        function hidePcFontsDropdown() {
            const dropdown = document.getElementById('subPcFontsDropdown');
            if (dropdown) dropdown.style.display = 'none';
        }

        function filterPcFontsDropdown(query) {
            const dropdown = document.getElementById('subPcFontsDropdown');
            if (!dropdown) return;
            const q = (query || '').toLowerCase().trim();
            const filtered = detectedPcFonts.filter(f => !q || f.toLowerCase().includes(q));

            if (filtered.length === 0) {
                dropdown.innerHTML = `<div style="padding: 8px 12px; font-size: 11px; color: var(--text-muted); text-align: center;">Aucune police trouvée. Appuyez sur Entrée pour appliquer "${query}".</div>`;
            } else {
                dropdown.innerHTML = filtered.map(f => `
                    <div class="pc-font-item" onclick="selectPcFontFromDropdown('${f.replace(/'/g, "\\'")}')" style="padding: 6px 10px; font-size: 12px; font-family: '${f}', sans-serif; cursor: pointer; border-radius: 4px; color: #f4f4f5; display: flex; justify-content: space-between; align-items: center; transition: background 0.15s ease;">
                        <span>${f}</span>
                        <span style="font-size: 9.5px; opacity: 0.5; font-family: monospace;">Système PC</span>
                    </div>
                `).join('');
                dropdown.querySelectorAll('.pc-font-item').forEach(item => {
                    item.onmouseenter = () => item.style.background = 'rgba(255, 255, 255, 0.1)';
                    item.onmouseleave = () => item.style.background = 'transparent';
                });
            }
            dropdown.style.display = 'block';
        }

        function selectPcFontFromDropdown(fontName) {
            const input = document.getElementById('subCustomFontInput');
            if (input) input.value = fontName;
            hidePcFontsDropdown();
            applyCustomSubtitleFont();
        }

        // Fermer le menu déroulant des polices au clic externe
        document.addEventListener('click', function(e) {
            const dropdown = document.getElementById('subPcFontsDropdown');
            const input = document.getElementById('subCustomFontInput');
            if (dropdown && dropdown.style.display !== 'none') {
                if (e.target !== input && !dropdown.contains(e.target)) {
                    dropdown.style.display = 'none';
                }
            }
        });

        function selectSubtitlesOption(hasSub) {
            currentSubtitlesOption = !!hasSub;
            const subYes = document.getElementById('subCardYes');
            const subNo = document.getElementById('subCardNo');
            const modelsContainer = document.getElementById('subtitlesModelsContainer');

            if (subYes && subNo) {
                if (currentSubtitlesOption) {
                    subYes.classList.add('selected');
                    subNo.classList.remove('selected');
                    if (modelsContainer) modelsContainer.style.display = 'flex';
                    startSubPreviewLoop();
                } else {
                    subYes.classList.remove('selected');
                    subNo.classList.add('selected');
                    if (modelsContainer) modelsContainer.style.display = 'none';
                }
            }
            updateLiveSubtitlePreview();
            updateCreationFormValidation();
        }

        function selectSubtitleType(typeKey, cardEl) {
            currentSubtitleType = typeKey;
            document.querySelectorAll('.subtitle-type-card').forEach(c => c.classList.remove('selected'));
            if (cardEl) cardEl.classList.add('selected');
            if (!currentSubtitlesOption) {
                selectSubtitlesOption(true);
            } else {
                updateLiveSubtitlePreview();
            }
        }

        function setSubtitleFontPreset(fontClass, fontName, btnEl) {
            currentSubtitleFont = fontClass;
            currentSubtitleCustomFont = '';
            document.querySelectorAll('#subFontGroup .btn-sub-param').forEach(b => b.classList.remove('active'));
            if (btnEl) btnEl.classList.add('active');
            const applyBtn = document.getElementById('btnApplyCustomFont');
            if (applyBtn) applyBtn.classList.remove('active');
            const label = document.getElementById('subFontSelectedLabel');
            if (label) label.textContent = fontName;
            updateLiveSubtitlePreview();
        }

        function applyCustomSubtitleFont() {
            const input = document.getElementById('subCustomFontInput');
            if (!input) return;
            const fontVal = input.value.trim();
            if (!fontVal) return;

            // Chargement automatique dynamique Google Fonts
            const cleanId = 'gfont-' + fontVal.toLowerCase().replace(/[^a-z0-9]/g, '-');
            if (!document.getElementById(cleanId)) {
                const link = document.createElement('link');
                link.id = cleanId;
                link.rel = 'stylesheet';
                link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontVal).replace(/%20/g, '+')}:wght@400;600;700;800;900&display=swap`;
                document.head.appendChild(link);
            }

            currentSubtitleFont = 'font-custom';
            currentSubtitleCustomFont = fontVal;

            document.querySelectorAll('#subFontGroup .btn-sub-param').forEach(b => b.classList.remove('active'));
            const applyBtn = document.getElementById('btnApplyCustomFont');
            if (applyBtn) applyBtn.classList.add('active');

            const label = document.getElementById('subFontSelectedLabel');
            if (label) label.textContent = fontVal;

            updateLiveSubtitlePreview();
        }

        function onSubtitleBaseColorHexInput(hex) {
            if (!hex.startsWith('#')) hex = '#' + hex;
            currentSubtitleBaseColorHex = hex;
            if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                const picker = document.getElementById('subBaseColorPicker');
                if (picker) picker.value = hex;
            }
            updateLiveSubtitlePreview();
        }

        function onSubtitleBaseColorPickerChange(hex) {
            currentSubtitleBaseColorHex = hex;
            const textInput = document.getElementById('subBaseColorHex');
            if (textInput) textInput.value = hex.toUpperCase();
            updateLiveSubtitlePreview();
        }

        function setSubtitleGlow(val, btnEl) {
            currentSubtitleGlow = val;
            if (btnEl && btnEl.parentElement) {
                btnEl.parentElement.querySelectorAll('.btn-sub-param').forEach(b => b.classList.remove('active'));
                btnEl.classList.add('active');
            }
            updateLiveSubtitlePreview();
        }

        function toggleSubtitleBg(btnEl) {
            if (currentSubtitleBg === 'none') {
                currentSubtitleBg = 'has-bg';
                if (btnEl) {
                    btnEl.textContent = 'Avec Fond';
                    btnEl.classList.remove('active');
                }
            } else {
                currentSubtitleBg = 'none';
                if (btnEl) {
                    btnEl.textContent = 'Sans Fond';
                    btnEl.classList.add('active');
                }
            }
            updateLiveSubtitlePreview();
        }

        function onSubtitleBgColorHexInput(hex) {
            if (!hex.startsWith('#')) hex = '#' + hex;
            if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                const picker = document.getElementById('subBgColorPicker');
                if (picker) picker.value = hex;
            }
            let r = parseInt(hex.slice(1, 3), 16) || 0;
            let g = parseInt(hex.slice(3, 5), 16) || 0;
            let b = parseInt(hex.slice(5, 7), 16) || 0;
            currentSubtitleBgColorHex = `rgba(${r}, ${g}, ${b}, 0.85)`;
            if (currentSubtitleBg === 'none') {
                currentSubtitleBg = 'has-bg';
                const btn = document.getElementById('btnToggleSubBg');
                if (btn) {
                    btn.textContent = 'Avec Fond';
                    btn.classList.remove('active');
                }
            }
            updateLiveSubtitlePreview();
        }

        function onSubtitleBgColorPickerChange(hex) {
            const textInput = document.getElementById('subBgColorHex');
            if (textInput) textInput.value = hex.toUpperCase();
            let r = parseInt(hex.slice(1, 3), 16) || 0;
            let g = parseInt(hex.slice(3, 5), 16) || 0;
            let b = parseInt(hex.slice(5, 7), 16) || 0;
            currentSubtitleBgColorHex = `rgba(${r}, ${g}, ${b}, 0.85)`;
            if (currentSubtitleBg === 'none') {
                currentSubtitleBg = 'has-bg';
                const btn = document.getElementById('btnToggleSubBg');
                if (btn) {
                    btn.textContent = 'Avec Fond';
                    btn.classList.remove('active');
                }
            }
            updateLiveSubtitlePreview();
        }

        function setSubtitleRadius(val, btnEl) {
            currentSubtitleRadius = val;
            if (btnEl && btnEl.parentElement) {
                btnEl.parentElement.querySelectorAll('.btn-sub-param').forEach(b => b.classList.remove('active'));
                btnEl.classList.add('active');
            }
            updateLiveSubtitlePreview();
        }

        function setSubtitlePos(val, btnEl) {
            currentSubtitlePos = val;
            if (btnEl && btnEl.parentElement) {
                btnEl.parentElement.querySelectorAll('.btn-sub-param').forEach(b => b.classList.remove('active'));
                btnEl.classList.add('active');
            }
            updateLiveSubtitlePreview();
        }

        function onSubtitleAccentColorHexInput(hex) {
            if (!hex.startsWith('#')) hex = '#' + hex;
            currentSubtitleAccentColor = hex;
            if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                const picker = document.getElementById('subAccentColorPicker');
                if (picker) picker.value = hex;
            }
            updateLiveSubtitlePreview();
        }

        function onSubtitleAccentColorPickerChange(hex) {
            currentSubtitleAccentColor = hex;
            const textInput = document.getElementById('subAccentColorHex');
            if (textInput) textInput.value = hex.toUpperCase();
            updateLiveSubtitlePreview();
        }

        function updateLiveSubtitlePreview() {
            const stageBox = document.getElementById('sub169Box');
            const stageContainer = document.getElementById('sub169Container');
            const subWrapper = document.getElementById('subMockupWrapper');
            const isPortrait = subWrapper && subWrapper.classList.contains('mode-portrait');
            const isSquare = subWrapper && subWrapper.classList.contains('mode-square');

            // Indicateur de position dynamique direct
            if (stageContainer) {
                stageContainer.className = `subtitle-container ${currentSubtitlePos}`;
                stageContainer.style.position = 'absolute';
                stageContainer.style.left = '50%';
                stageContainer.style.width = '90%';
                stageContainer.style.display = 'flex';
                stageContainer.style.justifyContent = 'center';
                stageContainer.style.alignItems = 'center';
                stageContainer.style.pointerEvents = 'none';
                stageContainer.style.zIndex = '10';

                if (currentSubtitlePos === 'pos-top') {
                    stageContainer.style.top = isPortrait ? '32px' : '16px';
                    stageContainer.style.bottom = 'auto';
                    stageContainer.style.transform = 'translateX(-50%)';
                } else if (currentSubtitlePos === 'pos-center') {
                    stageContainer.style.top = '50%';
                    stageContainer.style.bottom = 'auto';
                    stageContainer.style.transform = 'translate(-50%, -50%)';
                } else {
                    stageContainer.style.top = 'auto';
                    stageContainer.style.bottom = isPortrait ? '24px' : '14px';
                    stageContainer.style.transform = 'translateX(-50%)';
                }
            }

            // Génération du contenu HTML des mots avec animation et couleurs dynamiques réelles
            let wordsHtml = '';
            if (currentSubtitleType === 'type-standard') {
                wordsHtml = subPreviewWords.map(w => `<span class="word" style="color:${currentSubtitleBaseColorHex}; display:inline-block; transition:all 0.15s ease;">${w}</span>`).join(' ');
            } else {
                wordsHtml = subPreviewWords.map((w, idx) => {
                    const isActive = (idx === subActiveWordIdx);
                    if (isActive) {
                        return `<span class="word active" style="color: ${currentSubtitleAccentColor} !important; font-weight: 900; transform: scale(1.12); display: inline-block; transition: all 0.15s ease; text-shadow: 0 0 14px ${currentSubtitleAccentColor}, 0 2px 6px rgba(0,0,0,0.9);">${w}</span>`;
                    } else {
                        return `<span class="word" style="color: ${currentSubtitleBaseColorHex}; display: inline-block; transition: all 0.15s ease;">${w}</span>`;
                    }
                }).join(' ');
            }

            // Mise à jour de la boîte de rendu dans le téléphone
            if (stageBox) {
                const classes = ['subtitle-box', currentSubtitleType, currentSubtitleFont];
                if (currentSubtitleBg !== 'none') {
                    classes.push(currentSubtitleBg);
                    classes.push(currentSubtitleRadius);
                }
                stageBox.className = classes.join(' ');

                // Police d'écriture en temps réel
                if (currentSubtitleFont === 'font-poppins') {
                    stageBox.style.fontFamily = "'Poppins', sans-serif";
                    stageBox.style.fontWeight = '700';
                } else if (currentSubtitleFont === 'font-montserrat') {
                    stageBox.style.fontFamily = "'Montserrat', sans-serif";
                    stageBox.style.fontWeight = '800';
                } else if (currentSubtitleFont === 'font-custom' && currentSubtitleCustomFont) {
                    stageBox.style.fontFamily = `'${currentSubtitleCustomFont}', sans-serif`;
                    stageBox.style.fontWeight = '700';
                } else {
                    stageBox.style.fontFamily = "'Poppins', sans-serif";
                    stageBox.style.fontWeight = '700';
                }

                // Taille de police adaptative : réduite sur format debout pour tenir sur 1 ligne
                if (isPortrait) {
                    stageBox.style.fontSize = '7.5px';
                    stageBox.style.gap = '2.5px';
                } else if (isSquare) {
                    stageBox.style.fontSize = '8.5px';
                    stageBox.style.gap = '3px';
                } else {
                    stageBox.style.fontSize = '12px';
                    stageBox.style.gap = '4.5px';
                }

                stageBox.style.whiteSpace = 'nowrap';
                stageBox.style.display = 'inline-flex';
                stageBox.style.alignItems = 'center';
                stageBox.style.justifyContent = 'center';
                stageBox.style.lineHeight = '1.2';
                stageBox.style.boxSizing = 'border-box';

                // Fond (Background) & Arrondi en temps réel
                if (currentSubtitleBg !== 'none') {
                    stageBox.style.backgroundColor = currentSubtitleBgColorHex;
                    if (currentSubtitleRadius === 'radius-pill') {
                        stageBox.style.borderRadius = '999px';
                        stageBox.style.padding = isPortrait ? '2px 8px' : '4px 14px';
                    } else if (currentSubtitleRadius === 'radius-md') {
                        stageBox.style.borderRadius = '10px';
                        stageBox.style.padding = isPortrait ? '2px 6px' : '4px 10px';
                    } else if (currentSubtitleRadius === 'radius-sm') {
                        stageBox.style.borderRadius = '5px';
                        stageBox.style.padding = isPortrait ? '2px 5px' : '3px 8px';
                    } else {
                        stageBox.style.borderRadius = '0px';
                        stageBox.style.padding = isPortrait ? '2px 5px' : '3px 8px';
                    }
                } else {
                    stageBox.style.backgroundColor = 'transparent';
                    stageBox.style.borderRadius = '0px';
                    stageBox.style.padding = '0px';
                }

                stageBox.style.setProperty('--sub-base-color', currentSubtitleBaseColorHex);
                stageBox.style.setProperty('--sub-accent-color', currentSubtitleAccentColor);

                stageBox.innerHTML = wordsHtml;
            }
        }

        function startSubPreviewLoop() {
            if (subAnimInterval) clearInterval(subAnimInterval);
            subAnimInterval = setInterval(() => {
                if (currentSubtitleType === 'type-wordbyword') {
                    subActiveWordIdx = (subActiveWordIdx + 1) % subPreviewWords.length;
                    updateLiveSubtitlePreview();
                }
            }, 550);
        }
        startSubPreviewLoop();

        // --- LISTE OFFICIELLE DES STYLES (SANS EMOJIS, CARTES COMPACTES) ---
        const DEFAULT_STYLES = [
            {
                id: 'none',
                title: 'Sans Template',
                badge: 'Mode Libre',
                desc: 'Découpage libre et contrôle personnalisé de chaque piste audio & sous-titres.',
                tag: 'Sur-mesure',
                subTag: 'Contrôle total',
                isFreeMode: true
            },
            {
                id: 'Story_vox_style',
                title: 'Story Vox Style',
                badge: 'Infographie 2D',
                desc: 'Format explicatif visuel, infographies, schémas 2D animés et motion design journalistique.',
                tag: 'Style Vox',
                subTag: 'Infographie',
                image: '/01_Assets/Images/styles/template_story_vox_style.jpg'
            },
            {
                id: 'Saas_Motion_Design',
                title: 'SaaS Motion Design',
                badge: 'Produit & UI',
                desc: 'Présentation de produit logiciel, interface moderne et animation de fonctionnalités.',
                tag: 'SaaS Mockup',
                subTag: 'Product Tour',
                image: '/01_Assets/Images/styles/template_saas_motion_design.jpg'
            },
            {
                id: 'Stikman_history',
                title: 'Stikman History',
                badge: 'Storytelling',
                desc: 'Histoire contée, personnages dessinés, défilement cinématique (Ken Burns) & zooms dynamiques.',
                tag: 'Ken Burns',
                subTag: 'Storytelling',
                image: '/01_Assets/Images/styles/template_stikman_history.jpg'
            },
            {
                id: 'Iman_Gadzhi_Style',
                title: 'Iman Gadzhi Style',
                badge: 'Documentaire',
                desc: 'Esthétique documentaire sombre, découpages papier, zooms et storytelling business.',
                tag: 'Haute Finance',
                subTag: 'Documentaire',
                image: '/01_Assets/Images/styles/template_iman_gadzhi_style.jpg'
            },
            {
                id: 'trash_style',
                title: 'Trash Style',
                badge: 'Punk Edit',
                desc: 'Montage chaotique, punk edit, découpages papier & effets grunge énergiques.',
                tag: 'Trash / Chaos',
                subTag: 'Punk Edit',
                image: '/01_Assets/Images/styles/template_trash_style.jpg'
            }
        ];

        function escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function renderStyleCards(stylesList) {
            const container = document.getElementById('stylesCardsContainer');
            if (!container) return;
            const current = currentSelectedStyle || 'none';

            let html = '';
            stylesList.forEach(style => {
                const isSelected = (style.id === current) ? ' selected' : '';
                
                // Carte sans template : Icône de blocage et texte "Libre" uniquement
                if (style.isFreeMode || style.id === 'none') {
                    html += `
                    <div class="style-image-card free-mode-card${isSelected}" id="styleCard_${style.id}" data-style-id="${style.id}" onclick="selectMontageStyle('${style.id}')">
                        <div class="free-mode-center-content">
                            <div class="free-mode-ban-icon">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                </svg>
                            </div>
                            <span class="free-mode-label">Libre</span>
                        </div>
                        <div class="style-card-check">✓</div>
                    </div>`;
                } else {
                    // Carte avec image en arrière-plan et fondu noir en bas pour titre + description (sans étiquettes)
                    html += `
                    <div class="style-image-card${isSelected}" id="styleCard_${style.id}" data-style-id="${style.id}" onclick="selectMontageStyle('${style.id}')">
                        <img class="style-card-bg-img" src="${style.image}" alt="${escapeHtml(style.title)}" loading="lazy" onerror="this.onerror=null; this.src='/01_Assets/Images/styles/style_none.jpg'">
                        <div class="style-card-gradient-fade">
                            <span class="style-card-title">${escapeHtml(style.title)}</span>
                        </div>
                        <div class="style-card-check">✓</div>
                    </div>`;
                }
            });
            container.innerHTML = html;
        }

        function selectMontageStyle(styleId) {
            currentSelectedStyle = styleId;
            const selectEl = document.getElementById('montageStyleSelect');
            if (selectEl && selectEl.value !== styleId) {
                selectEl.value = styleId;
            }

            // Mettre à jour l'état visuel actif sur toutes les cartes de styles
            const cards = document.querySelectorAll('.style-image-card');
            cards.forEach(card => {
                if (card.dataset.styleId === styleId) {
                    card.classList.add('selected');
                } else {
                    card.classList.remove('selected');
                }
            });

            updateCreationFormValidation();
        }

        async function loadTemplatesFromApi() {
            try {
                const res = await fetch('/api/templates');
                if (!res.ok) return;
                const templates = await res.json();
                if (Array.isArray(templates) && templates.length > 0) {
                    const existingIds = new Set(DEFAULT_STYLES.map(s => s.id));
                    let updatedList = [...DEFAULT_STYLES];
                    let hasNew = false;
                    templates.forEach(t => {
                        if (!existingIds.has(t.id)) {
                            // Nettoyer les emojis du nom pour un design pro et épuré
                            const cleanName = (t.name || t.id).replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
                            updatedList.push({
                                id: t.id,
                                title: cleanName || t.id,
                                desc: t.desc || 'Template vidéo prêt pour la composition.',
                                image: t.image || '/01_Assets/Images/styles/style_none.jpg'
                            });
                            existingIds.add(t.id);
                            hasNew = true;
                        }
                    });

                    if (hasNew) {
                        renderStyleCards(updatedList);
                    }
                }
            } catch (e) {
                console.log('Utilisation de la liste des templates par défaut');
            }
        }

        function onAiEngineChanged(val) {
            try {
                localStorage.setItem('vibeeditor_preferred_ai', val);
            } catch(e) {}
        }

        function onMontageStyleChange(styleId) {
            selectMontageStyle(styleId);
        }

        document.addEventListener('DOMContentLoaded', applyAppInitialDefaults);
        window.addEventListener('load', async () => {
            initHeaderProfile();
            applyAppInitialDefaults();

            // Restauration du moteur IA préféré
            const savedAi = localStorage.getItem('vibeeditor_preferred_ai');
            if (savedAi && document.getElementById('selectAiEngine')) {
                document.getElementById('selectAiEngine').value = savedAi;
            }
            // Affichage des cartes de style avec Sans Template ("Libre") sélectionné par défaut
            renderStyleCards(DEFAULT_STYLES);
            renderGradientStopsUI();

            // 1. Format par défaut : 16:9 (rectangle)
            selectVideoFormat('16:9');

            // 2. Montage et piste audio par défaut : Sans audio
            selectAudioOption('none');

            // 3. Modèles de sous-titres par défaut : Sans sous-titres
            selectSubtitlesOption(false);

            // 4. Fond de base par défaut : Décision IA
            selectBackgroundType('auto');
            
            selectMontageStyle('none');
            await loadTemplatesFromApi();

            // Par défaut dans Format, Audio et Sous-titres, RIEN n'est sélectionné
            updateUploadBoxesVisibility('none');

            if (currentChannelId) {
                try {
                    const chanRes = await fetch('/api/channels');
                    if (chanRes.ok) {
                        const chans = await chanRes.json();
                        const found = chans.find(c => c.id === currentChannelId);
                        if (found) {
                            const badge = document.getElementById('storageTargetBadge');
                            if (badge) {
                                badge.textContent = `Chaîne : ${found.name || currentChannelId} (01_Assets/.../${currentChannelId}/)`;
                            }

                            // Utiliser la couleur primaire de la chaîne pour les sous-titres
                            if (found.colorPrimary) {
                                currentSubtitleAccentColor = found.colorPrimary;
                                const hexInput = document.getElementById('subAccentColorHex');
                                if (hexInput) hexInput.value = found.colorPrimary.toUpperCase();
                                const picker = document.getElementById('subAccentColorPicker');
                                if (picker) picker.value = found.colorPrimary;
                                const chanBadge = document.getElementById('subChannelColorBadge');
                                if (chanBadge) {
                                    chanBadge.style.display = 'inline-block';
                                    chanBadge.textContent = `Couleur ${found.name || 'Chaîne'} (${found.colorPrimary})`;
                                    chanBadge.style.color = found.colorPrimary;
                                    chanBadge.style.background = `${found.colorPrimary}25`;
                                }
                                updateLiveSubtitlePreview();
                            }
                        }
                    }
                } catch(e) {
                    console.error('Erreur chargement infos chaîne', e);
                }

                // Adapter les badges de sous-dossiers dans chaque zone d'upload pour la chaîne
                const sub = `${currentChannelId}/`;
                const bImgs = document.getElementById('pathBadgeImages');
                const bVoice = document.getElementById('pathBadgeVoice');
                const bMusic = document.getElementById('pathBadgeMusic');
                const bVideos = document.getElementById('pathBadgeVideos');
                if (bImgs) bImgs.textContent = `01_Assets/Images/${sub}`;
                if (bVoice) bVoice.textContent = `01_Assets/Voix_Off/${sub}`;
                if (bMusic) bMusic.textContent = `01_Assets/Musiques/${sub}`;
                if (bVideos) bVideos.textContent = `01_Assets/Videos/${sub}`;
            }

            // Démarrage de la boucle de prévisualisation live des sous-titres
            startSubPreviewLoop();

            // Bouton initialisé comme désactivé avec compteur à 0/120
            updateCreationFormValidation();
        });

        // Gestion de l'upload vers le serveur
        async function handleFileUpload(filesList, category) {
            if (!filesList || filesList.length === 0) return;

            for (const file of Array.from(filesList)) {
                // Pour les vidéos sans chaîne, ajouter le suffixe à 4 chiffres sur le nom de fichier
                let uploadFileName = file.name;
                if (!currentChannelId) {
                    const dotIndex = file.name.lastIndexOf('.');
                    if (dotIndex !== -1) {
                        const base = file.name.substring(0, dotIndex);
                        const ext = file.name.substring(dotIndex);
                        uploadFileName = `${base}-${sessionAssetSuffix}${ext}`;
                    } else {
                        uploadFileName = `${file.name}-${sessionAssetSuffix}`;
                    }
                }

                const reader = new FileReader();
                reader.onload = async () => {
                    const base64Data = reader.result.split(',')[1];
                    try {
                        const res = await fetch('/api/upload-asset', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                category,
                                channelId: currentChannelId,
                                filename: uploadFileName,
                                data: base64Data
                            })
                        });

                        const resData = await res.json();
                        if (resData.success) {
                            if (category === 'Voix_Off' || category === 'Musiques') {
                                assetsState[category] = [{ name: resData.filename, relativePath: resData.relativePath, size: file.size }];
                            } else {
                                assetsState[category].push({ name: resData.filename, relativePath: resData.relativePath, size: file.size });
                            }
                            renderCategoryList(category);
                        } else {
                            alert('Erreur upload : ' + (resData.error || 'Erreur inconnue'));
                        }
                    } catch (err) {
                        console.error('Erreur upload :', err);
                        const relPath = currentChannelId ? `01_Assets/${category}/${currentChannelId}/${uploadFileName}` : `01_Assets/${category}/${uploadFileName}`;
                        assetsState[category].push({ name: uploadFileName, relativePath: relPath, size: file.size });
                        renderCategoryList(category);
                    }
                };
                reader.readAsDataURL(file);
            }
        }

        function formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }

        function renderCategoryList(cat) {
            const listEl = document.getElementById(`list${cat === 'Voix_Off' ? 'Voice' : (cat === 'Musiques' ? 'Music' : cat)}`);
            if (!listEl) return;
            listEl.innerHTML = '';
            assetsState[cat].forEach((item, index) => {
                const chip = document.createElement('div');
                chip.className = 'file-chip';
                chip.innerHTML = `
                    <div class="file-chip-left">
                        <span style="font-size:11px; color:var(--text-muted);">#${index + 1}</span>
                        <span class="file-chip-name">${item.name}</span>
                        <span class="file-chip-meta">${formatBytes(item.size || 0)}</span>
                    </div>
                    <button class="btn-remove-file" onclick="removeAsset('${cat}', ${index})" title="Retirer">✕</button>
                `;
                listEl.appendChild(chip);
            });
        }

        function removeAsset(cat, index) {
            assetsState[cat].splice(index, 1);
            renderCategoryList(cat);
        }

        // Soumission de la création : redirection vers la page de process IA
        async function submitVideoCreation() {
            const btn = document.getElementById('btnSubmitGenerate');
            const prompt = document.getElementById('videoPrompt').value.trim();
            if (!prompt) {
                alert('Veuillez renseigner un prompt pour votre vidéo.');
                document.getElementById('videoPrompt').focus();
                return;
            }

            // Fallbacks par défaut automatiques et transparents (jamais de blocage)
            if (!currentSelectedFormat) currentSelectedFormat = '16:9';
            if (!currentSelectedStyle) currentSelectedStyle = 'none';
            if (!currentAudioOption) currentAudioOption = 'full_mix';
            if (currentSubtitlesOption === null || currentSubtitlesOption === undefined) currentSubtitlesOption = true;

            // Script horodaté optionnel via le switch
            const isScriptActive = Boolean(document.getElementById('toggleScriptCheckbox')?.checked);
            const scriptEl = document.getElementById('videoCustomScript');
            const customScript = isScriptActive && scriptEl ? scriptEl.value.trim() : '';
            const hasCustomScript = isScriptActive && customScript.length > 0;

            // Mise à jour des boutons : Réflexion active de l'IA sur le scénario et la DA
            btn.disabled = true;
            btn.innerHTML = `<span>🧠 Analyse du sujet et conception de la DA...</span>`;

            const btnRoadmap = document.getElementById('btnRoadmapTrigger');
            const btnRoadmapText = document.getElementById('btnRoadmapText');
            const btnRoadmapBadge = document.getElementById('btnRoadmapBadge');
            const btnRoadmapIcon = document.getElementById('btnRoadmapIcon');

            if (btnRoadmap) {
                btnRoadmap.disabled = true;
                btnRoadmap.style.cursor = 'wait';
                btnRoadmap.style.background = '#1e293b';
                btnRoadmap.style.color = '#93c5fd';
                btnRoadmap.style.border = '1.5px solid rgba(59, 130, 246, 0.7)';
                if (btnRoadmapIcon) btnRoadmapIcon.textContent = '🧠';
                if (btnRoadmapText) btnRoadmapText.textContent = "Réflexion IA en cours... Conception du scénario et découpage...";
                if (btnRoadmapBadge) btnRoadmapBadge.style.display = 'none';
            }

            let thinkStep = 0;
            const thinkStages = [
                '🧠 Gemini analyse le prompt et calibre la tonalité...',
                '🎨 Choix des contrastes, polices et arrière-plan...',
                '📐 Découpage séquentiel plan par plan et prompts d’assets...',
                '📋 Rédaction de la feuille de route sur-mesure...'
            ];
            const thinkingInterval = setInterval(() => {
                thinkStep = (thinkStep + 1) % thinkStages.length;
                btn.innerHTML = `<span>${thinkStages[thinkStep]}</span>`;
                if (btnRoadmapText) btnRoadmapText.textContent = thinkStages[thinkStep];
            }, 1200);

            const useTemplate = (currentSelectedStyle !== 'none');
            const channelId = currentChannelId;
            const subfolder = currentChannelId;

            // Nom automatique court, percutant et propre (2 à 3 mots-clés du sujet)
            const stopWordsList = new Set(['concois', 'cree', 'creer', 'creez', 'generer', 'genere', 'faire', 'fais', 'fait', 'animation', 'motion', 'design', 'video', 'clip', 'secondes', 'seconde', 'sec', 'pour', 'dans', 'avec', 'sur', 'au', 'aux', 'style', 'de', 'du', 'des', 'un', 'une', 'le', 'la', 'les', 'et', 'en', 'par', 'ce', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'moi', 'toi', 'lui', 'nous', 'vous', 'leur', 'je', 'tu', 'il', 'elle', 'on', 'ils', 'elles', 'me', 'te', 'se', 'qui', 'que', 'quoi', 'dont', 'ou', 'est', 'sont', 'comme', 'plus', 'tres', 'bien', 'dune', 'dun', 'afin', 'vers', 'sous', 'sans', 'tout', 'tous', 'toute', 'toutes', 'nouvelle', 'nouveau', 'presentation', 'presente', 'montre', 'montrer', 'illustre', 'affiche', 'donne', 'donner', 'part', 'dure', 'durant', 'temps', 'autour', 'produis', 'produire', 'realise', 'realiser']);
            const cleanPromptWords = prompt
                .toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, ' ')
                .trim()
                .split(/\s+/)
                .filter(w => w.length > 1 && !stopWordsList.has(w) && !/^\d+s?$/.test(w));
            
            let autoName = cleanPromptWords.slice(0, 3).join('_');
            if (!autoName || autoName.length < 2) {
                autoName = 'video_' + Date.now().toString().slice(-4);
            }

            // Format choisi par l'utilisateur
            const format = currentSelectedFormat || '16:9';

            // Inventaire exhaustif et rigoureux de TOUS les assets explicitement fournis par l'utilisateur
            const userUploadedAssets = [];
            Object.keys(assetsState).forEach(cat => {
                assetsState[cat].forEach(item => {
                    const cleanName = item.name;
                    const relPath = item.relativePath || (currentChannelId ? `01_Assets/${cat}/${currentChannelId}/${cleanName}` : `01_Assets/${cat}/${cleanName}`);
                    userUploadedAssets.push({
                        category: cat,
                        name: cleanName,
                        relativePath: relPath,
                        url: `/${relPath.replace(/\\/g, '/')}`,
                        size: item.size || 0
                    });
                });
            });

            const imageFiles = assetsState.Images.map(img => img.name);
            const voiceFile = assetsState.Voix_Off.length > 0 ? assetsState.Voix_Off[0].name : '';
            const musicFile = assetsState.Musiques.length > 0 ? assetsState.Musiques[0].name : '';

            const preferredAi = document.getElementById('selectAiEngine')?.value || 'kombo';

            let voiceEngine = 'edge';
            let voiceId = 'fr-FR-HenriNeural';
            if (currentVoiceSource === 'elevenlabs') {
                voiceEngine = 'elevenlabs';
                voiceId = document.getElementById('createVideoElevenVoiceSelect')?.value || '';
            } else if (currentVoiceSource === 'edge') {
                voiceEngine = 'edge';
                voiceId = document.getElementById('createVideoEdgeVoiceSelect')?.value || 'fr-FR-HenriNeural';
            }

            const payload = {
                fileName: autoName,
                prompt,
                preferredAi,
                voiceEngine,
                voiceId,
                voiceSource: currentVoiceSource,
                useTemplate,
                template: currentSelectedStyle,
                format,
                backgroundType: currentBackgroundType,
                backgroundColor: currentBackgroundColor,
                backgroundGradient: currentBackgroundGradient,
                gradientColors: currentGradientColors,
                audioSetup: currentAudioOption,
                subtitles: currentSubtitlesOption,
                subtitleType: currentSubtitlesOption ? currentSubtitleType : 'none',
                subtitleFont: currentSubtitleFont,
                subtitleCustomFont: currentSubtitleCustomFont,
                subtitleBaseColor: currentSubtitleBaseColorHex,
                subtitleGlow: currentSubtitleGlow,
                subtitleBg: currentSubtitleBg,
                subtitleBgColor: currentSubtitleBgColorHex,
                subtitleRadius: currentSubtitleRadius,
                subtitleAccentColor: currentSubtitleAccentColor,
                subtitlePosition: currentSubtitlePos,
                subfolder,
                channelId: channelId,
                userUploadedAssets: userUploadedAssets,
                hasUserAssets: userUploadedAssets.length > 0,
                images: imageFiles,
                hasUserImages: imageFiles.length > 0,
                hasUserVoice: Boolean(voiceFile),
                hasUserMusic: Boolean(musicFile),
                hasCustomScript: hasCustomScript,
                customScript: customScript,
                script: customScript,
                style: currentSelectedStyle,
                voiceover: voiceFile,
                music: musicFile,
                timestamp: Date.now()
            };

            // Mémoriser le payload en cours dans une variable globale de session
            window._currentPendingVideoPayload = payload;

            // Appel API pour générer la feuille de route dans le fichier unique 09_Pages/feuille_de_route.md
            try {
                const response = await fetch('/api/generate-roadmap', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const respText = await response.text();
                let result = null;
                try {
                    result = JSON.parse(respText);
                } catch (e) {
                    throw new Error(`Le serveur n'a pas renvoyé de JSON valide (${response.status}) : ${respText.slice(0, 100)}`);
                }

                clearInterval(thinkingInterval);

                if (!result.success) {
                    throw new Error(result.error || 'Erreur lors de la génération de la feuille de route.');
                }

                // Activer le bouton large de feuille de route avec mise en valeur visuelle
                if (btnRoadmap) {
                    btnRoadmap.disabled = false;
                    btnRoadmap.style.cursor = 'pointer';
                    btnRoadmap.style.background = 'linear-gradient(135deg, rgba(37, 99, 235, 0.25), rgba(16, 185, 129, 0.2))';
                    btnRoadmap.style.border = '1px solid rgba(59, 130, 246, 0.5)';
                    btnRoadmap.style.color = '#ffffff';
                    btnRoadmap.style.boxShadow = '0 0 25px rgba(37, 99, 235, 0.4)';
                    if (btnRoadmapIcon) btnRoadmapIcon.textContent = '📄';
                    if (btnRoadmapText) btnRoadmapText.textContent = 'Voir / Valider la Feuille de Route de Production';
                    if (btnRoadmapBadge) {
                        btnRoadmapBadge.style.display = 'inline-block';
                        btnRoadmapBadge.textContent = 'Prête';
                    }
                }

                // Réinitialiser le bouton Créer
                btn.disabled = false;
                btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span>Créer la vidéo</span>`;

                // Ouvrir automatiquement le Grand Modal pour validation/édition
                openRoadmapModal(result.content);

            } catch (err) {
                clearInterval(thinkingInterval);
                console.error('[Roadmap Error]:', err);
                showAppNotice(`Impossible de générer la feuille de route :\n${err.message}`, 'Génération Interrompue', 'error');
                btn.disabled = false;
                btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span>Créer la vidéo</span>`;
                if (btnRoadmap) {
                    btnRoadmap.disabled = true;
                    if (btnRoadmapText) btnRoadmapText.textContent = "Feuille de Route (Erreur lors de la génération)";
                }
            }
        }

        // =========================================================================
        // GESTION DU MODAL DE NOTIFICATION DESIGNÉ (REMPLACEMENT TOTAL DES ALERTS)
        // =========================================================================

        function showAppNotice(message, title = 'Notification', type = 'warning') {
            const overlay = document.getElementById('appNoticeModalOverlay');
            const msgEl = document.getElementById('appNoticeMessage');
            const titleEl = document.getElementById('appNoticeTitle');
            const iconEl = document.getElementById('appNoticeIconBox');
            if (!overlay || !msgEl) {
                console.warn(`[${title}]:`, message);
                return;
            }

            msgEl.textContent = String(message || '');
            if (titleEl) titleEl.textContent = title;

            if (iconEl) {
                if (type === 'error') {
                    iconEl.innerHTML = '✕';
                    iconEl.style.background = 'rgba(239, 68, 68, 0.15)';
                    iconEl.style.color = '#ef4444';
                } else if (type === 'success') {
                    iconEl.innerHTML = '✓';
                    iconEl.style.background = 'rgba(16, 185, 129, 0.15)';
                    iconEl.style.color = '#10b981';
                } else if (type === 'info') {
                    iconEl.innerHTML = 'ℹ️';
                    iconEl.style.background = 'rgba(59, 130, 246, 0.15)';
                    iconEl.style.color = '#3b82f6';
                } else {
                    iconEl.innerHTML = '⚠️';
                    iconEl.style.background = 'rgba(245, 158, 11, 0.15)';
                    iconEl.style.color = '#f59e0b';
                }
            }

            overlay.style.display = 'flex';
        }

        function closeAppNotice() {
            const overlay = document.getElementById('appNoticeModalOverlay');
            if (overlay) overlay.style.display = 'none';
        }

        function handleAppNoticeOverlayClick(e) {
            if (e.target && e.target.id === 'appNoticeModalOverlay') {
                closeAppNotice();
            }
        }

        // Remplacement universel de window.alert pour éradiquer tous les popups natifs
        window.alert = function(msg) {
            showAppNotice(msg, 'Information', 'warning');
        };

        // =========================================================================
        // GESTION DU GRAND MODAL FEUILLE DE ROUTE (ROADMAP PRODUCTION)
        // =========================================================================

        async function openRoadmapModal(preloadContent) {
            const overlay = document.getElementById('roadmapModalOverlay');
            const textarea = document.getElementById('roadmapEditorTextarea');
            const statusEl = document.getElementById('roadmapStatusIndicator');

            if (statusEl) statusEl.textContent = '';

            if (preloadContent && textarea) {
                textarea.value = preloadContent;
            } else if (textarea && (!textarea.value || textarea.value.trim().length === 0)) {
                try {
                    const resp = await fetch('/api/get-roadmap');
                    const data = await resp.json();
                    if (data && data.content) {
                        textarea.value = data.content;
                    }
                } catch (e) {
                    console.error('Erreur lecture feuille de route:', e);
                }
            }

            if (overlay) {
                overlay.classList.add('open');
                overlay.style.display = 'flex';
                overlay.style.opacity = '1';
                overlay.style.pointerEvents = 'auto';
                document.body.style.overflow = 'hidden';
            }
        }

        function closeRoadmapModal() {
            const overlay = document.getElementById('roadmapModalOverlay');
            if (overlay) {
                overlay.classList.remove('open');
                overlay.style.display = 'none';
                overlay.style.opacity = '0';
                overlay.style.pointerEvents = 'none';
                document.body.style.overflow = '';
            }
        }

        function handleRoadmapOverlayClick(e) {
            if (e.target && e.target.id === 'roadmapModalOverlay') {
                closeRoadmapModal();
            }
        }

        async function saveCurrentRoadmapChanges() {
            const textarea = document.getElementById('roadmapEditorTextarea');
            const statusEl = document.getElementById('roadmapStatusIndicator');
            if (!textarea) return;

            try {
                if (statusEl) statusEl.textContent = 'Enregistrement...';
                const resp = await fetch('/api/save-roadmap', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: textarea.value })
                });
                const res = await resp.json();
                if (res.success && statusEl) {
                    statusEl.textContent = '✓ Modifications enregistrées dans feuille_de_route.md !';
                    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3500);
                }
            } catch (err) {
                if (statusEl) statusEl.textContent = `❌ Erreur : ${err.message}`;
            }
        }

        function copyRoadmapContent() {
            const textarea = document.getElementById('roadmapEditorTextarea');
            const statusEl = document.getElementById('roadmapStatusIndicator');
            if (!textarea) return;

            navigator.clipboard.writeText(textarea.value).then(() => {
                if (statusEl) {
                    statusEl.textContent = '✓ Contenu copié dans le presse-papier !';
                    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
                }
            }).catch(() => {
                textarea.select();
                document.execCommand('copy');
                if (statusEl) statusEl.textContent = '✓ Contenu copié !';
            });
        }

        /**
         * Validation et lancement de la production :
         * 1. Sauvegarde et vide le fichier feuille_de_route.md pour la session suivante
         * 2. Stocke le payload dans localStorage
         * 3. Redirige vers video_processus.html
         */
        async function confirmRoadmapAndLaunchProduction() {
            const btnConfirm = document.getElementById('btnConfirmAndLaunchProduction');
            const textarea = document.getElementById('roadmapEditorTextarea');
            const payload = window._currentPendingVideoPayload;

            if (!payload) {
                showAppNotice('Aucune configuration vidéo en attente. Veuillez d’abord renseigner un prompt.', 'Information', 'warning');
                return;
            }

            if (btnConfirm) {
                btnConfirm.disabled = true;
                btnConfirm.innerHTML = `<span>Validation & Vidage de la feuille de route...</span>`;
            }

            try {
                const roadmapContent = textarea ? textarea.value : '';
                payload.roadmapContent = roadmapContent;

                // RÈGLE FORMELLE : Valider puis VIDER le fichier unique feuille_de_route.md
                await fetch('/api/validate-roadmap', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: roadmapContent })
                });

                // Sauvegarder dans localStorage pour la page de process
                localStorage.setItem('vibeeditor_pending_creation', JSON.stringify(payload));

                // Fermer le modal
                closeRoadmapModal();

                // Redirection vers video_processus.html
                const targetUrl = payload.channelId 
                    ? `video_processus.html?channel=${encodeURIComponent(payload.channelId)}` 
                    : 'video_processus.html';
                window.location.href = targetUrl;

            } catch (err) {
                console.error('Erreur confirmation roadmap:', err);
                showAppNotice(`Erreur lors de la validation : ${err.message}`, 'Erreur', 'error');
                if (btnConfirm) {
                    btnConfirm.disabled = false;
                    btnConfirm.innerHTML = `<span>Valider et Lancer la Production 🚀</span>`;
                }
            }
        }

        // Liaison globale impérative pour les handlers HTML et écouteurs directs
        window.openRoadmapModal = openRoadmapModal;
        window.closeRoadmapModal = closeRoadmapModal;
        window.handleRoadmapOverlayClick = handleRoadmapOverlayClick;
        window.saveCurrentRoadmapChanges = saveCurrentRoadmapChanges;
        window.copyRoadmapContent = copyRoadmapContent;
        window.confirmRoadmapAndLaunchProduction = confirmRoadmapAndLaunchProduction;

        // Écouteur direct sur le bouton large de déclenchement
        const btnRoadmapEl = document.getElementById('btnRoadmapTrigger');
        if (btnRoadmapEl) {
            btnRoadmapEl.addEventListener('click', (e) => {
                e.preventDefault();
                if (!btnRoadmapEl.disabled) {
                    openRoadmapModal();
                }
            });
            // RÈGLE : Le bouton démarre STRICTEMENT désactivé en attente du clic « Créer la vidéo »
            btnRoadmapEl.disabled = true;
            btnRoadmapEl.style.cursor = 'not-allowed';
            const btnBadge = document.getElementById('btnRoadmapBadge');
            if (btnBadge) btnBadge.style.display = 'none';
        }
