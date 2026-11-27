// --- 1. ÉTAT GLOBAL DE L'APPLICATION ---
        let currentView = 'dashboard';
        let channelsCache = [{"id":"ch_1793102190223","name":"Galsen Tuto","platform":"Instagram","format":"9:16","colorPrimary":"#ff3344","colorSecondary":"#dc2626","fontPrimary":"Montserrat","fontSecondary":"Inter","fontAccent":"Caveat","description":"","avatar":"01_Assets/Images/channels/avatar_ch_1793102190223.jpg","videos":[],"videoCount":0},{"id":"ch_1793911184121","name":"Greatest Eleven","platform":"YouTube","format":"9:16","colorPrimary":"#c2c2c2","colorSecondary":"#080075","fontPrimary":"Montserrat","fontSecondary":"Inter","fontAccent":"Caveat","description":"","avatar":"01_Assets/Images/channels/avatar_ch_1793911184121.jpg","videos":[],"videoCount":0},{"id":"ch_1793911244535","name":"Dr Klavius","platform":"YouTube","format":"16:9","colorPrimary":"#ffffff","colorSecondary":"#dc2626","fontPrimary":"Montserrat","fontSecondary":"Inter","fontAccent":"Caveat","description":"","avatar":"01_Assets/Images/channels/avatar_ch_1793911244535.png","videos":[],"videoCount":0},{"id":"ch_1794092386560","name":"Le Secrets Des Geeks","platform":"YouTube","format":"16:9","colorPrimary":"#ff3344","colorSecondary":"#dc2626","fontPrimary":"Montserrat","fontSecondary":"Inter","fontAccent":"Caveat","description":"","avatar":"01_Assets/Images/channels/avatar_ch_1794092386560.png","videos":[]}];
        let clientsCache = [];
        let activeClient = null;
        let globalSkillsCache = [];
        let allVideosList = [];
        let assetsCatalogList = [];

        // Filtres
        let currentPlatformFilter = 'YouTube'; // PAR DÉFAUT SUR YOUTUBE !
        let clientCurrentFormat = '16:9';     // PAR DÉFAUT 16:9 DANS MONTAGE CLIENTS !
        let dashboardFilter = 'all';
        let dashboardReseauFilter = '';
        let dashboardClientFilter = '';
        let assetCategoryFilter = 'all';
        let assetSubfolderFilter = 'all';

        // Suppression en cours
        let channelToDeleteId = null;

        // --- 2. GESTION DES NOTIFICATIONS TOAST ---
        function showToast(message, icon = '✅') {
            const toast = document.getElementById('appToast');
            document.getElementById('toastIcon').textContent = icon;
            document.getElementById('toastMessage').textContent = message;
            toast.style.display = 'flex';
            clearTimeout(window._toastTimer);
            window._toastTimer = setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        }

        // --- 2bis. GESTION DU REPLIEMENT DE LA SIDEBAR (BOUTON PORTE) AVEC PERSISTANCE STRICTE ---
        const SIDEBAR_COLLAPSED_KEY = 'marvidflow_sidebar_collapsed';

        function toggleSidebarCollapse() {
            const isCollapsed = document.body.classList.toggle('sidebar-is-collapsed');
            try {
                localStorage.setItem(SIDEBAR_COLLAPSED_KEY, isCollapsed ? 'true' : 'false');
            } catch (e) {}
            updateSidebarDoorState(isCollapsed);
        }

        function updateSidebarDoorState(isCollapsed) {
            const btn = document.getElementById('sidebarToggleBtn');
            if (btn) {
                btn.title = isCollapsed ? 'Ouvrir le menu latéral (Porte)' : 'Réduire le menu latéral (Porte)';
                btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
            }
        }

        function initSidebarState() {
            try {
                const isCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
                if (isCollapsed) {
                    document.body.classList.add('sidebar-is-collapsed');
                } else {
                    document.body.classList.remove('sidebar-is-collapsed');
                }
                updateSidebarDoorState(isCollapsed);
            } catch (e) {}
        }
        initSidebarState();

        // --- 3. NAVIGATION SPA ET ROUTAGE PAR HASH ---
        function navigateView(viewName, e) {
            if (e) e.preventDefault();
            window.location.hash = '#' + viewName;
            switchView(viewName);
        }

        function switchView(viewName) {
            currentView = viewName;
            localStorage.setItem('autoframe_active_view', viewName);
            window.location.hash = '#' + viewName;
            const earlyStyle = document.getElementById('spaEarlyStyle');
            if (earlyStyle && typeof earlyStyle.remove === 'function') {
                earlyStyle.remove();
            } else if (earlyStyle && earlyStyle.parentNode) {
                earlyStyle.parentNode.removeChild(earlyStyle);
            }

            // Mise à jour de la topbar (Noms stricts des sections sans fioritures)
            const viewTitles = {
                'dashboard': 'Dashboard',
                'reseaux': 'Mes Réseaux',
                'clients': 'Montage Clients',
                'assets': 'Assets',
                'create_video': 'Créer une vidéo',
                'settings': 'Paramètres'
            };
            document.getElementById('activeViewTitle').textContent = viewTitles[viewName] || 'Dashboard';

            // Mise à jour de la sidebar
            document.querySelectorAll('.sidebar-nav-item').forEach(item => {
                if (item.getAttribute('data-view') === viewName) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });

            // Bascule des panneaux
            document.querySelectorAll('.view-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            let panelId = 'view' + viewName.charAt(0).toUpperCase() + viewName.slice(1);
            if (viewName === 'create_video') panelId = 'viewCreateVideo';
            const targetPanel = document.getElementById(panelId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }

            // Rafraîchissement ciblé ou application de la recherche active
            const searchInput = document.getElementById('globalAppSearch');
            if (searchInput && searchInput.value.trim()) {
                handleGlobalSearch();
            } else {
                if (viewName === 'dashboard') renderDashboardProjects();
                if (viewName === 'reseaux') renderChannelsView();
                if (viewName === 'create_video') renderCustomChannelPicker();
                if (viewName === 'settings') { if (typeof detectLocalAiAgentsUi === 'function') detectLocalAiAgentsUi(); if (typeof renderKomboListUI === 'function') renderKomboListUI(); if (typeof handleSettingsScroll === 'function') setTimeout(handleSettingsScroll, 60); }
                if (viewName === 'clients') renderClientsView();
                if (viewName === 'assets') renderAssetsView();
            }
        }

        window.addEventListener('hashchange', () => {
            const h = (window.location.hash || '#dashboard').replace('#', '');
            if (h && h !== currentView) switchView(h);
        });

        // --- 4. CHARGEMENT DES DONNÉES DISQUE & SERVEUR (SYNCHRONE 0MS + BACKGROUND SYNC) ---
        // Catalogue exhaustif et complet des 238 assets réels de 01_Assets
        const FULL_EMBEDDED_CATALOG = [{"name":"antiquecamera.glb","type":"Other","subfolder":"3D","size":"16.7 MB","bytes":17540348,"url":"../01_Assets/3D/antiquecamera.glb"},{"name":"bench_vice_01.bin","type":"Other","subfolder":"3D","size":"128.3 KB","bytes":131404,"url":"../01_Assets/3D/bench_vice_01.bin"},{"name":"bench_vice_01.gltf","type":"Other","subfolder":"3D","size":"12.9 KB","bytes":13222,"url":"../01_Assets/3D/bench_vice_01.gltf"},{"name":"chairdamaskpurplegold.glb","type":"Other","subfolder":"3D","size":"1.9 MB","bytes":2028924,"url":"../01_Assets/3D/chairdamaskpurplegold.glb"},{"name":"bench_vice_01_arm_1k.jpg","type":"Images","subfolder":"3D/textures","size":"687.7 KB","bytes":704241,"url":"../01_Assets/3D/textures/bench_vice_01_arm_1k.jpg"},{"name":"bench_vice_01_diff_1k.jpg","type":"Images","subfolder":"3D/textures","size":"707.5 KB","bytes":724482,"url":"../01_Assets/3D/textures/bench_vice_01_diff_1k.jpg"},{"name":"bench_vice_01_nor_gl_1k.jpg","type":"Images","subfolder":"3D/textures","size":"846.0 KB","bytes":866287,"url":"../01_Assets/3D/textures/bench_vice_01_nor_gl_1k.jpg"},{"name":"art_ecriture.svg","type":"Vectors","subfolder":"handwriting","size":"112.0 KB","bytes":114685,"url":"../01_Assets/handwriting/art_ecriture.svg"},{"name":"sous_titre.svg","type":"Vectors","subfolder":"handwriting","size":"115.4 KB","bytes":118177,"url":"../01_Assets/handwriting/sous_titre.svg"},{"name":"sous_titre_motion.svg","type":"Vectors","subfolder":"handwriting","size":"229.1 KB","bytes":234563,"url":"../01_Assets/handwriting/sous_titre_motion.svg"},{"name":"tegaki.svg","type":"Vectors","subfolder":"handwriting","size":"42.7 KB","bytes":43768,"url":"../01_Assets/handwriting/tegaki.svg"},{"name":"titre_art.svg","type":"Vectors","subfolder":"handwriting","size":"115.7 KB","bytes":118467,"url":"../01_Assets/handwriting/titre_art.svg"},{"name":"autoframe_robot.svg","type":"Vectors","subfolder":"Icones","size":"1.3 KB","bytes":1350,"url":"../01_Assets/Icones/autoframe_robot.svg"},{"name":"autoframe_robot_logo.jpg","type":"Images","subfolder":"Icones","size":"492.9 KB","bytes":504689,"url":"../01_Assets/Icones/autoframe_robot_logo.jpg"},{"name":"autoframe_robot_logo.png","type":"Images","subfolder":"Icones","size":"47.0 KB","bytes":48168,"url":"../01_Assets/Icones/autoframe_robot_logo.png"},{"name":"closedhand_100189.svg","type":"Vectors","subfolder":"Icones","size":"4.6 KB","bytes":4665,"url":"../01_Assets/Icones/closedhand_100189.svg"},{"name":"openhand_100161.svg","type":"Vectors","subfolder":"Icones","size":"6.0 KB","bytes":6191,"url":"../01_Assets/Icones/openhand_100161.svg"},{"name":"pointinghand_100160.svg","type":"Vectors","subfolder":"Icones","size":"5.1 KB","bytes":5256,"url":"../01_Assets/Icones/pointinghand_100160.svg"},{"name":"cristiano-ronaldo.png","type":"Images","subfolder":"Illustrations/Players","size":"274.5 KB","bytes":281066,"url":"../01_Assets/Illustrations/Players/cristiano-ronaldo.png"},{"name":"daniel-carvajal.png","type":"Images","subfolder":"Illustrations/Players","size":"233.6 KB","bytes":239226,"url":"../01_Assets/Illustrations/Players/daniel-carvajal.png"},{"name":"erling-haaland.png","type":"Images","subfolder":"Illustrations/Players","size":"222.8 KB","bytes":228173,"url":"../01_Assets/Illustrations/Players/erling-haaland.png"},{"name":"harry-kane.png","type":"Images","subfolder":"Illustrations/Players","size":"248.3 KB","bytes":254301,"url":"../01_Assets/Illustrations/Players/harry-kane.png"},{"name":"jay-rodriguez.png","type":"Images","subfolder":"Illustrations/Players","size":"448.1 KB","bytes":458831,"url":"../01_Assets/Illustrations/Players/jay-rodriguez.png"},{"name":"jude-bellingham.png","type":"Images","subfolder":"Illustrations/Players","size":"466.2 KB","bytes":477402,"url":"../01_Assets/Illustrations/Players/jude-bellingham.png"},{"name":"kevin-de-bruyne.png","type":"Images","subfolder":"Illustrations/Players","size":"229.0 KB","bytes":234538,"url":"../01_Assets/Illustrations/Players/kevin-de-bruyne.png"},{"name":"kylian-mbappe.png","type":"Images","subfolder":"Illustrations/Players","size":"498.8 KB","bytes":510721,"url":"../01_Assets/Illustrations/Players/kylian-mbappe.png"},{"name":"lamine-yamal.png","type":"Images","subfolder":"Illustrations/Players","size":"223.1 KB","bytes":228427,"url":"../01_Assets/Illustrations/Players/lamine-yamal.png"},{"name":"lautaro-martinez.png","type":"Images","subfolder":"Illustrations/Players","size":"223.6 KB","bytes":228941,"url":"../01_Assets/Illustrations/Players/lautaro-martinez.png"},{"name":"lionel-messi.png","type":"Images","subfolder":"Illustrations/Players","size":"297.0 KB","bytes":304086,"url":"../01_Assets/Illustrations/Players/lionel-messi.png"},{"name":"mohamed-salah.png","type":"Images","subfolder":"Illustrations/Players","size":"185.5 KB","bytes":189966,"url":"../01_Assets/Illustrations/Players/mohamed-salah.png"},{"name":"neymar.png","type":"Images","subfolder":"Illustrations/Players","size":"175.4 KB","bytes":179574,"url":"../01_Assets/Illustrations/Players/neymar.png"},{"name":"phil-foden.png","type":"Images","subfolder":"Illustrations/Players","size":"223.9 KB","bytes":229290,"url":"../01_Assets/Illustrations/Players/phil-foden.png"},{"name":"rodri.png","type":"Images","subfolder":"Illustrations/Players","size":"278.2 KB","bytes":284832,"url":"../01_Assets/Illustrations/Players/rodri.png"},{"name":"rodrigo-lima.png","type":"Images","subfolder":"Illustrations/Players","size":"157.7 KB","bytes":161471,"url":"../01_Assets/Illustrations/Players/rodrigo-lima.png"},{"name":"toni-kroos.png","type":"Images","subfolder":"Illustrations/Players","size":"231.2 KB","bytes":236704,"url":"../01_Assets/Illustrations/Players/toni-kroos.png"},{"name":"vinicius-junior.png","type":"Images","subfolder":"Illustrations/Players","size":"471.0 KB","bytes":482314,"url":"../01_Assets/Illustrations/Players/vinicius-junior.png"},{"name":"ai_energy_orb.b64","type":"Other","subfolder":"Images","size":"32.1 KB","bytes":32888,"url":"../01_Assets/Images/ai_energy_orb.b64"},{"name":"ai_energy_orb.png","type":"Images","subfolder":"Images","size":"24.1 KB","bytes":24665,"url":"../01_Assets/Images/ai_energy_orb.png"},{"name":"aurora_scene_1.png","type":"Images","subfolder":"Images","size":"1.6 MB","bytes":1648364,"url":"../01_Assets/Images/aurora_scene_1.png"},{"name":"aurora_scene_2.png","type":"Images","subfolder":"Images","size":"1.6 MB","bytes":1655236,"url":"../01_Assets/Images/aurora_scene_2.png"},{"name":"aurora_scene_3.png","type":"Images","subfolder":"Images","size":"1.6 MB","bytes":1702878,"url":"../01_Assets/Images/aurora_scene_3.png"},{"name":"aurora_scene_4.png","type":"Images","subfolder":"Images","size":"1.6 MB","bytes":1646567,"url":"../01_Assets/Images/aurora_scene_4.png"},{"name":"aurora_scene_5.png","type":"Images","subfolder":"Images","size":"1.6 MB","bytes":1674398,"url":"../01_Assets/Images/aurora_scene_5.png"},{"name":"aurora_scene_6.png","type":"Images","subfolder":"Images","size":"1.6 MB","bytes":1655921,"url":"../01_Assets/Images/aurora_scene_6.png"},{"name":"avatar_homepage_man.png","type":"Images","subfolder":"Images","size":"283.4 KB","bytes":290204,"url":"../01_Assets/Images/avatar_homepage_man.png"},{"name":"avatar_homepage_woman.png","type":"Images","subfolder":"Images","size":"269.5 KB","bytes":276010,"url":"../01_Assets/Images/avatar_homepage_woman.png"},{"name":"bg_demo_aurora_orange.png","type":"Images","subfolder":"Images","size":"1.3 MB","bytes":1380204,"url":"../01_Assets/Images/bg_demo_aurora_orange.png"},{"name":"bg_demo_grid_violet.png","type":"Images","subfolder":"Images","size":"164.8 KB","bytes":168724,"url":"../01_Assets/Images/bg_demo_grid_violet.png"},{"name":"avatar_ch_1793063435322.png","type":"Images","subfolder":"Images/channels","size":"1.7 MB","bytes":1749387,"url":"../01_Assets/Images/channels/avatar_ch_1793063435322.png"},{"name":"avatar_ch_1793102190223.jpg","type":"Images","subfolder":"Images/channels","size":"1.2 MB","bytes":1240746,"url":"../01_Assets/Images/channels/avatar_ch_1793102190223.jpg"},{"name":"avatar_ch_1793911184121.jpg","type":"Images","subfolder":"Images/channels","size":"644.6 KB","bytes":660053,"url":"../01_Assets/Images/channels/avatar_ch_1793911184121.jpg"},{"name":"avatar_ch_1793911244535.png","type":"Images","subfolder":"Images/channels","size":"1.2 MB","bytes":1254067,"url":"../01_Assets/Images/channels/avatar_ch_1793911244535.png"},{"name":"avatar_ch_1793911298459.png","type":"Images","subfolder":"Images/channels","size":"17.1 KB","bytes":17553,"url":"../01_Assets/Images/channels/avatar_ch_1793911298459.png"},{"name":"avatar_ch_1794092386560.png","type":"Images","subfolder":"Images/channels","size":"17.1 KB","bytes":17553,"url":"../01_Assets/Images/channels/avatar_ch_1794092386560.png"},{"name":"01_typography.png","type":"Images","subfolder":"Images/Design_Tips_Frames","size":"468.2 KB","bytes":479405,"url":"../01_Assets/Images/Design_Tips_Frames/01_typography.png"},{"name":"02_placement.png","type":"Images","subfolder":"Images/Design_Tips_Frames","size":"273.0 KB","bytes":279519,"url":"../01_Assets/Images/Design_Tips_Frames/02_placement.png"},{"name":"03_balance.png","type":"Images","subfolder":"Images/Design_Tips_Frames","size":"161.0 KB","bytes":164875,"url":"../01_Assets/Images/Design_Tips_Frames/03_balance.png"},{"name":"04_contrast.png","type":"Images","subfolder":"Images/Design_Tips_Frames","size":"162.8 KB","bytes":166719,"url":"../01_Assets/Images/Design_Tips_Frames/04_contrast.png"},{"name":"05_color_theory.png","type":"Images","subfolder":"Images/Design_Tips_Frames","size":"369.9 KB","bytes":378755,"url":"../01_Assets/Images/Design_Tips_Frames/05_color_theory.png"},{"name":"06_branding_rules.png","type":"Images","subfolder":"Images/Design_Tips_Frames","size":"336.7 KB","bytes":344792,"url":"../01_Assets/Images/Design_Tips_Frames/06_branding_rules.png"},{"name":"07_script_design.png","type":"Images","subfolder":"Images/Design_Tips_Frames","size":"248.0 KB","bytes":253980,"url":"../01_Assets/Images/Design_Tips_Frames/07_script_design.png"},{"name":"08_horizontal_designs.png","type":"Images","subfolder":"Images/Design_Tips_Frames","size":"173.4 KB","bytes":177599,"url":"../01_Assets/Images/Design_Tips_Frames/08_horizontal_designs.png"},{"name":"09_vertical_designs.png","type":"Images","subfolder":"Images/Design_Tips_Frames","size":"267.9 KB","bytes":274361,"url":"../01_Assets/Images/Design_Tips_Frames/09_vertical_designs.png"},{"name":"10_diagonal_designs.png","type":"Images","subfolder":"Images/Design_Tips_Frames","size":"190.8 KB","bytes":195384,"url":"../01_Assets/Images/Design_Tips_Frames/10_diagonal_designs.png"},{"name":"11_steal_like_artist.png","type":"Images","subfolder":"Images/Design_Tips_Frames","size":"638.6 KB","bytes":653973,"url":"../01_Assets/Images/Design_Tips_Frames/11_steal_like_artist.png"},{"name":"12_inspiration_board.png","type":"Images","subfolder":"Images/Design_Tips_Frames","size":"141.7 KB","bytes":145132,"url":"../01_Assets/Images/Design_Tips_Frames/12_inspiration_board.png"},{"name":"13_breakdown_inspiration.png","type":"Images","subfolder":"Images/Design_Tips_Frames","size":"383.6 KB","bytes":392854,"url":"../01_Assets/Images/Design_Tips_Frames/13_breakdown_inspiration.png"},{"name":"14_plan_edit.png","type":"Images","subfolder":"Images/Design_Tips_Frames","size":"444.1 KB","bytes":454750,"url":"../01_Assets/Images/Design_Tips_Frames/14_plan_edit.png"},{"name":"15_short_form_animation.png","type":"Images","subfolder":"Images/Design_Tips_Frames","size":"299.7 KB","bytes":306862,"url":"../01_Assets/Images/Design_Tips_Frames/15_short_form_animation.png"},{"name":"16_long_form_animation.png","type":"Images","subfolder":"Images/Design_Tips_Frames","size":"177.6 KB","bytes":181892,"url":"../01_Assets/Images/Design_Tips_Frames/16_long_form_animation.png"},{"name":"17_vertical_animations.png","type":"Images","subfolder":"Images/Design_Tips_Frames","size":"291.7 KB","bytes":298651,"url":"../01_Assets/Images/Design_Tips_Frames/17_vertical_animations.png"},{"name":"18_horizontal_animations.png","type":"Images","subfolder":"Images/Design_Tips_Frames","size":"291.8 KB","bytes":298814,"url":"../01_Assets/Images/Design_Tips_Frames/18_horizontal_animations.png"},{"name":"growkaw_bg.b64","type":"Other","subfolder":"Images","size":"993.7 KB","bytes":1017560,"url":"../01_Assets/Images/growkaw_bg.b64"},{"name":"growkaw_bg.jpg","type":"Images","subfolder":"Images","size":"745.3 KB","bytes":763169,"url":"../01_Assets/Images/growkaw_bg.jpg"},{"name":"growkaz_stickman_concept.jpg","type":"Images","subfolder":"Images","size":"545.0 KB","bytes":558109,"url":"../01_Assets/Images/growkaz_stickman_concept.jpg"},{"name":"branding.json","type":"Other","subfolder":"Images/marvidflow","size":"1.3 KB","bytes":1346,"url":"../01_Assets/Images/marvidflow/branding.json"},{"name":"dashboard_scroll.png","type":"Images","subfolder":"Images/marvidflow","size":"487.9 KB","bytes":499656,"url":"../01_Assets/Images/marvidflow/dashboard_scroll.png"},{"name":"features_scroll.png","type":"Images","subfolder":"Features","size":"444.0 KB","bytes":454606,"url":"../01_Assets/Images/marvidflow/features_scroll.png"},{"name":"hero_full.png","type":"Images","subfolder":"Images/marvidflow","size":"969.8 KB","bytes":993108,"url":"../01_Assets/Images/marvidflow/hero_full.png"},{"name":"marvid_dashboard.png","type":"Images","subfolder":"Images/marvidflow","size":"580.1 KB","bytes":594028,"url":"../01_Assets/Images/marvidflow/marvid_dashboard.png"},{"name":"marvid_dashboard.webp","type":"Images","subfolder":"Images/marvidflow","size":"38.2 KB","bytes":39094,"url":"../01_Assets/Images/marvidflow/marvid_dashboard.webp"},{"name":"marvid_hero_clean.png","type":"Images","subfolder":"Images/marvidflow","size":"2.2 MB","bytes":2340972,"url":"../01_Assets/Images/marvidflow/marvid_hero_clean.png"},{"name":"marvid_hero_clean.webp","type":"Images","subfolder":"Images/marvidflow","size":"68.5 KB","bytes":70114,"url":"../01_Assets/Images/marvidflow/marvid_hero_clean.webp"},{"name":"marvid_pipeline.png","type":"Images","subfolder":"Images/marvidflow","size":"499.6 KB","bytes":511626,"url":"../01_Assets/Images/marvidflow/marvid_pipeline.png"},{"name":"ref_ask_anything_pill.jpg","type":"Images","subfolder":"Images","size":"12.7 KB","bytes":13024,"url":"../01_Assets/Images/ref_ask_anything_pill.jpg"},{"name":"ref_music_player.jpg","type":"Images","subfolder":"Images","size":"37.1 KB","bytes":37972,"url":"../01_Assets/Images/ref_music_player.jpg"},{"name":"ref_travel_carousel.jpg","type":"Images","subfolder":"Images","size":"33.8 KB","bytes":34586,"url":"../01_Assets/Images/ref_travel_carousel.jpg"},{"name":"sienna_avatar.b64","type":"Other","subfolder":"Images","size":"909.0 KB","bytes":930792,"url":"../01_Assets/Images/sienna_avatar.b64"},{"name":"sienna_face.b64","type":"Other","subfolder":"Images","size":"909.0 KB","bytes":930792,"url":"../01_Assets/Images/sienna_face.b64"},{"name":"sienna_face.jpg","type":"Images","subfolder":"Images","size":"8.7 KB","bytes":8877,"url":"../01_Assets/Images/sienna_face.jpg"},{"name":"sienna_photo.jpg","type":"Images","subfolder":"Images","size":"15.9 KB","bytes":16294,"url":"../01_Assets/Images/sienna_photo.jpg"},{"name":"sienna_small_avatar.jpg","type":"Images","subfolder":"Images","size":"0.4 KB","bytes":397,"url":"../01_Assets/Images/sienna_small_avatar.jpg"},{"name":"style_none.jpg","type":"Images","subfolder":"Images/styles","size":"38.9 KB","bytes":39872,"url":"../01_Assets/Images/styles/style_none.jpg"},{"name":"template_2d_explainer.jpg","type":"Images","subfolder":"Images/styles","size":"149.1 KB","bytes":152679,"url":"../01_Assets/Images/styles/template_2d_explainer.jpg"},{"name":"template_ego_lite.jpg","type":"Images","subfolder":"Images/styles","size":"187.0 KB","bytes":191477,"url":"../01_Assets/Images/styles/template_ego_lite.jpg"},{"name":"template_faceless_brand.jpg","type":"Images","subfolder":"Images/styles","size":"147.1 KB","bytes":150599,"url":"../01_Assets/Images/styles/template_faceless_brand.jpg"},{"name":"template_iman_gadzhi_style.jpg","type":"Images","subfolder":"Images/styles","size":"101.2 KB","bytes":103657,"url":"../01_Assets/Images/styles/template_iman_gadzhi_style.jpg"},{"name":"template_saas_motion_design.jpg","type":"Images","subfolder":"Images/styles","size":"160.5 KB","bytes":164371,"url":"../01_Assets/Images/styles/template_saas_motion_design.jpg"},{"name":"template_stikman_history.jpg","type":"Images","subfolder":"Images/styles","size":"185.6 KB","bytes":190061,"url":"../01_Assets/Images/styles/template_stikman_history.jpg"},{"name":"template_story_vox_style.jpg","type":"Images","subfolder":"Images/styles","size":"224.7 KB","bytes":230127,"url":"../01_Assets/Images/styles/template_story_vox_style.jpg"},{"name":"template_tier_list.jpg","type":"Images","subfolder":"Images/styles","size":"148.0 KB","bytes":151597,"url":"../01_Assets/Images/styles/template_tier_list.jpg"},{"name":"template_top_10.jpg","type":"Images","subfolder":"Images/styles","size":"314.0 KB","bytes":321527,"url":"../01_Assets/Images/styles/template_top_10.jpg"},{"name":"template_trash_style.jpg","type":"Images","subfolder":"Images/styles","size":"213.5 KB","bytes":218603,"url":"../01_Assets/Images/styles/template_trash_style.jpg"},{"name":"template_tutoriel.jpg","type":"Images","subfolder":"Images/styles","size":"161.6 KB","bytes":165452,"url":"../01_Assets/Images/styles/template_tutoriel.jpg"},{"name":"terence_card_clean_bg.jpg","type":"Images","subfolder":"Images","size":"13.7 KB","bytes":14041,"url":"../01_Assets/Images/terence_card_clean_bg.jpg"},{"name":"terence_card_perfect_580.jpg","type":"Images","subfolder":"Images","size":"31.4 KB","bytes":32184,"url":"../01_Assets/Images/terence_card_perfect_580.jpg"},{"name":"terence_card_smart.jpg","type":"Images","subfolder":"Images","size":"15.3 KB","bytes":15667,"url":"../01_Assets/Images/terence_card_smart.jpg"},{"name":"terence_face_clean.jpg","type":"Images","subfolder":"Images","size":"6.2 KB","bytes":6321,"url":"../01_Assets/Images/terence_face_clean.jpg"},{"name":"terence_howard_artwork.jpg","type":"Images","subfolder":"Images","size":"14.8 KB","bytes":15170,"url":"../01_Assets/Images/terence_howard_artwork.jpg"},{"name":"terence_howard_avatar.jpg","type":"Images","subfolder":"Images","size":"1.2 KB","bytes":1192,"url":"../01_Assets/Images/terence_howard_avatar.jpg"},{"name":"terence_photo_pure.jpg","type":"Images","subfolder":"Images","size":"6.7 KB","bytes":6891,"url":"../01_Assets/Images/terence_photo_pure.jpg"},{"name":"terence_portrait_clean.jpg","type":"Images","subfolder":"Images","size":"8.9 KB","bytes":9137,"url":"../01_Assets/Images/terence_portrait_clean.jpg"},{"name":"travel_card_dubai.jpg","type":"Images","subfolder":"Images","size":"7.6 KB","bytes":7784,"url":"../01_Assets/Images/travel_card_dubai.jpg"},{"name":"travel_card_indonesia.jpg","type":"Images","subfolder":"Images","size":"8.0 KB","bytes":8178,"url":"../01_Assets/Images/travel_card_indonesia.jpg"},{"name":"travel_card_turkey.jpg","type":"Images","subfolder":"Images","size":"6.4 KB","bytes":6565,"url":"../01_Assets/Images/travel_card_turkey.jpg"},{"name":"travel_card_vietnam.jpg","type":"Images","subfolder":"Images","size":"7.5 KB","bytes":7650,"url":"../01_Assets/Images/travel_card_vietnam.jpg"},{"name":"travel_photo_dubai.jpg","type":"Images","subfolder":"Images","size":"5.3 KB","bytes":5413,"url":"../01_Assets/Images/travel_photo_dubai.jpg"},{"name":"travel_photo_indonesia.jpg","type":"Images","subfolder":"Images","size":"5.7 KB","bytes":5828,"url":"../01_Assets/Images/travel_photo_indonesia.jpg"},{"name":"travel_photo_turkey.jpg","type":"Images","subfolder":"Images","size":"4.5 KB","bytes":4616,"url":"../01_Assets/Images/travel_photo_turkey.jpg"},{"name":"travel_photo_vietnam.jpg","type":"Images","subfolder":"Images","size":"5.5 KB","bytes":5628,"url":"../01_Assets/Images/travel_photo_vietnam.jpg"},{"name":"youtube_thumb_dQw4w9WgXcQ.jpg","type":"Images","subfolder":"Images","size":"63.8 KB","bytes":65324,"url":"../01_Assets/Images/youtube_thumb_dQw4w9WgXcQ.jpg"},{"name":"youtube_thumb_dQw4w9WgXcQ.webp","type":"Images","subfolder":"Images","size":"27.9 KB","bytes":28620,"url":"../01_Assets/Images/youtube_thumb_dQw4w9WgXcQ.webp"},{"name":"gsap.min.js","type":"Other","subfolder":"Libs","size":"70.5 KB","bytes":72214,"url":"../01_Assets/Libs/gsap.min.js"},{"name":"three.min.js","type":"Other","subfolder":"Libs","size":"589.3 KB","bytes":603445,"url":"../01_Assets/Libs/three.min.js"},{"name":"airsenegal_brandfetch.json","type":"Other","subfolder":"Logos","size":"5.3 KB","bytes":5476,"url":"../01_Assets/Logos/airsenegal_brandfetch.json"},{"name":"airsenegal_emblem.svg","type":"Vectors","subfolder":"Logos","size":"1.7 KB","bytes":1690,"url":"../01_Assets/Logos/airsenegal_emblem.svg"},{"name":"airsenegal_icon.jpeg","type":"Images","subfolder":"Logos","size":"7.5 KB","bytes":7727,"url":"../01_Assets/Logos/airsenegal_icon.jpeg"},{"name":"airsenegal_logo.png","type":"Images","subfolder":"Logos","size":"18.5 KB","bytes":18956,"url":"../01_Assets/Logos/airsenegal_logo.png"},{"name":"anthropic.svg","type":"Vectors","subfolder":"Logos","size":"1.5 KB","bytes":1568,"url":"../01_Assets/Logos/anthropic.svg"},{"name":"apple.svg","type":"Vectors","subfolder":"Logos","size":"0.7 KB","bytes":755,"url":"../01_Assets/Logos/apple.svg"},{"name":"autoframe_robot.svg","type":"Vectors","subfolder":"Logos","size":"1.3 KB","bytes":1350,"url":"../01_Assets/Logos/autoframe_robot.svg"},{"name":"autoframe_robot_logo.jpg","type":"Images","subfolder":"Logos","size":"492.9 KB","bytes":504689,"url":"../01_Assets/Logos/autoframe_robot_logo.jpg"},{"name":"autoframe_robot_logo.png","type":"Images","subfolder":"Logos","size":"47.0 KB","bytes":48168,"url":"../01_Assets/Logos/autoframe_robot_logo.png"},{"name":"chatgpt_com_favicon.png","type":"Images","subfolder":"Logos","size":"3.0 KB","bytes":3026,"url":"../01_Assets/Logos/chatgpt_com_favicon.png"},{"name":"claude_symbol.svg","type":"Vectors","subfolder":"Logos","size":"1.7 KB","bytes":1705,"url":"../01_Assets/Logos/claude_symbol.svg"},{"name":"claude_symbol_white.svg","type":"Vectors","subfolder":"Logos","size":"1.7 KB","bytes":1705,"url":"../01_Assets/Logos/claude_symbol_white.svg"},{"name":"dakar2026_logo.svg","type":"Vectors","subfolder":"Logos","size":"2.4 KB","bytes":2476,"url":"../01_Assets/Logos/dakar2026_logo.svg"},{"name":"dakar_2026_official_logo.png","type":"Images","subfolder":"Logos","size":"135.6 KB","bytes":138824,"url":"../01_Assets/Logos/dakar_2026_official_logo.png"},{"name":"dakar_2026_official_logo.svg","type":"Vectors","subfolder":"Logos","size":"183.4 KB","bytes":187780,"url":"../01_Assets/Logos/dakar_2026_official_logo.svg"},{"name":"deepseek.svg","type":"Vectors","subfolder":"Logos","size":"6.3 KB","bytes":6476,"url":"../01_Assets/Logos/deepseek.svg"},{"name":"egypt.svg","type":"Vectors","subfolder":"Logos","size":"18.0 KB","bytes":18440,"url":"../01_Assets/Logos/egypt.svg"},{"name":"elevenlabs.svg","type":"Vectors","subfolder":"Logos","size":"2.2 KB","bytes":2218,"url":"../01_Assets/Logos/elevenlabs.svg"},{"name":"elevenlabs_symbol.svg","type":"Vectors","subfolder":"Logos","size":"0.4 KB","bytes":404,"url":"../01_Assets/Logos/elevenlabs_symbol.svg"},{"name":"ferrari_com_favicon.png","type":"Images","subfolder":"Logos","size":"1.1 KB","bytes":1145,"url":"../01_Assets/Logos/ferrari_com_favicon.png"},{"name":"al-hilal.png","type":"Images","subfolder":"Logos/Football","size":"11.4 KB","bytes":11680,"url":"../01_Assets/Logos/Football/al-hilal.png"},{"name":"al-nassr.png","type":"Images","subfolder":"Logos/Football","size":"42.4 KB","bytes":43409,"url":"../01_Assets/Logos/Football/al-nassr.png"},{"name":"arsenal.png","type":"Images","subfolder":"Logos/Football","size":"39.5 KB","bytes":40478,"url":"../01_Assets/Logos/Football/arsenal.png"},{"name":"atletico-madrid.png","type":"Images","subfolder":"Logos/Football","size":"19.2 KB","bytes":19709,"url":"../01_Assets/Logos/Football/atletico-madrid.png"},{"name":"barcelona.png","type":"Images","subfolder":"Logos/Football","size":"39.3 KB","bytes":40257,"url":"../01_Assets/Football/barcelona.png"},{"name":"bayern-munchen.png","type":"Images","subfolder":"Logos/Football","size":"47.4 KB","bytes":48573,"url":"../01_Assets/Logos/Football/bayern-munchen.png"},{"name":"borussia-dortmund.png","type":"Images","subfolder":"Logos/Football","size":"48.6 KB","bytes":49769,"url":"../01_Assets/Logos/Football/borussia-dortmund.png"},{"name":"inter-miami-cf.png","type":"Images","subfolder":"Logos/Football","size":"44.6 KB","bytes":45700,"url":"../01_Assets/Logos/Football/inter-miami-cf.png"},{"name":"inter.png","type":"Images","subfolder":"Logos/Football","size":"26.4 KB","bytes":27006,"url":"../01_Assets/Logos/Football/inter.png"},{"name":"liverpool.png","type":"Images","subfolder":"Logos/Football","size":"29.4 KB","bytes":30067,"url":"../01_Assets/Logos/Football/liverpool.png"},{"name":"manchester-city.png","type":"Images","subfolder":"Logos/Football","size":"49.1 KB","bytes":50279,"url":"../01_Assets/Logos/Football/manchester-city.png"},{"name":"milan.png","type":"Images","subfolder":"Logos/Football","size":"33.5 KB","bytes":34324,"url":"../01_Assets/Logos/Football/milan.png"},{"name":"paris-saint-germain.png","type":"Images","subfolder":"Logos/Football","size":"39.8 KB","bytes":40791,"url":"../01_Assets/Logos/Football/paris-saint-germain.png"},{"name":"real-madrid.png","type":"Images","subfolder":"Logos/Football","size":"70.7 KB","bytes":72347,"url":"../01_Assets/Logos/Football/real-madrid.png"},{"name":"instagram.svg","type":"Vectors","subfolder":"Logos","size":"0.7 KB","bytes":688,"url":"../01_Assets/Logos/instagram.svg"},{"name":"joj_official_logo.svg","type":"Vectors","subfolder":"Logos","size":"0.0 KB","bytes":0,"url":"../01_Assets/Logos/joj_official_logo.svg"},{"name":"marvidflow_com_favicon.png","type":"Images","subfolder":"Logos","size":"0.8 KB","bytes":870,"url":"../01_Assets/Logos/marvidflow_com_favicon.png"},{"name":"morocco.svg","type":"Vectors","subfolder":"Logos","size":"0.3 KB","bytes":264,"url":"../01_Assets/Logos/morocco.svg"},{"name":"nigeria.svg","type":"Vectors","subfolder":"Logos","size":"0.2 KB","bytes":201,"url":"../01_Assets/Logos/nigeria.svg"},{"name":"nike_com_favicon.png","type":"Images","subfolder":"Logos","size":"1.4 KB","bytes":1463,"url":"../01_Assets/Logos/nike_com_favicon.png"},{"name":"nvidia.svg","type":"Vectors","subfolder":"Logos","size":"1.7 KB","bytes":1753,"url":"../01_Assets/Logos/nvidia.svg"},{"name":"olympic_rings.svg","type":"Vectors","subfolder":"Logos","size":"0.5 KB","bytes":522,"url":"../01_Assets/Logos/olympic_rings.svg"},{"name":"openai.svg","type":"Vectors","subfolder":"Logos","size":"3.0 KB","bytes":3072,"url":"../01_Assets/Logos/openai.svg"},{"name":"senegal.svg","type":"Vectors","subfolder":"Logos","size":"0.2 KB","bytes":255,"url":"../01_Assets/Logos/senegal.svg"},{"name":"tiktok.svg","type":"Vectors","subfolder":"Logos","size":"0.9 KB","bytes":960,"url":"../01_Assets/Logos/tiktok.svg"},{"name":"youtube.svg","type":"Vectors","subfolder":"Logos","size":"0.5 KB","bytes":498,"url":"../01_Assets/Logos/youtube.svg"},{"name":"dakar_satellite.png","type":"Images","subfolder":"Maps","size":"1.4 MB","bytes":1484532,"url":"../01_Assets/Maps/dakar_satellite.png"},{"name":"paris_style_osm.png","type":"Images","subfolder":"Maps","size":"3.1 MB","bytes":3227031,"url":"../01_Assets/Maps/paris_style_osm.png"},{"name":"paris_style_satellite.png","type":"Images","subfolder":"Maps","size":"4.4 MB","bytes":4634650,"url":"../01_Assets/Maps/paris_style_satellite.png"},{"name":"tokyo_sat.png","type":"Images","subfolder":"Maps","size":"4.1 MB","bytes":4276932,"url":"../01_Assets/Maps/tokyo_sat.png"},{"name":"Carefree.mp3","type":"Audios","subfolder":"Musiques","size":"6.3 MB","bytes":6566713,"url":"../01_Assets/Musiques/Carefree.mp3"},{"name":"chatgpt_ad_60s_music.wav","type":"Audios","subfolder":"Musiques","size":"10.1 MB","bytes":10584044,"url":"../01_Assets/Musiques/chatgpt_ad_60s_music.wav"},{"name":"Cool_Rock.mp3","type":"Audios","subfolder":"Musiques","size":"3.2 MB","bytes":3351095,"url":"../01_Assets/Musiques/Cool_Rock.mp3"},{"name":"Heartwarming.mp3","type":"Audios","subfolder":"Musiques","size":"2.8 MB","bytes":2971312,"url":"../01_Assets/Musiques/Heartwarming.mp3"},{"name":"Hitman.mp3","type":"Audios","subfolder":"Musiques","size":"7.7 MB","bytes":8035387,"url":"../01_Assets/Musiques/Hitman.mp3"},{"name":"Modern_Jazz_Samba.mp3","type":"Audios","subfolder":"Musiques","size":"5.8 MB","bytes":6070802,"url":"../01_Assets/Musiques/Modern_Jazz_Samba.mp3"},{"name":"Sneaky_Snitch.mp3","type":"Audios","subfolder":"Musiques","size":"5.2 MB","bytes":5466943,"url":"../01_Assets/Musiques/Sneaky_Snitch.mp3"},{"name":"Take_a_Chance.mp3","type":"Audios","subfolder":"Musiques","size":"1.4 MB","bytes":1494334,"url":"../01_Assets/Musiques/Take_a_Chance.mp3"},{"name":"Wallpaper.mp3","type":"Audios","subfolder":"Musiques","size":"8.4 MB","bytes":8804339,"url":"../01_Assets/Musiques/Wallpaper.mp3"},{"name":"avatar_1794100251831.png","type":"Images","subfolder":"Profiles","size":"0.1 KB","bytes":77,"url":"../01_Assets/Profiles/avatar_1794100251831.png"},{"name":"profile.json","type":"Other","subfolder":"Profiles","size":"0.2 KB","bytes":176,"url":"../01_Assets/Profiles/profile.json"},{"name":"520025088242792374.jpg","type":"Images","subfolder":"References","size":"34.0 KB","bytes":34822,"url":"../01_Assets/References/520025088242792374.jpg"},{"name":"678143656457756602.jpg","type":"Images","subfolder":"References","size":"25.6 KB","bytes":26165,"url":"../01_Assets/References/678143656457756602.jpg"},{"name":"806285139576294015.jpg","type":"Images","subfolder":"References","size":"25.7 KB","bytes":26339,"url":"../01_Assets/References/806285139576294015.jpg"},{"name":"AI assistant motion by Robin Holesinsky on Muzli.jpg","type":"Images","subfolder":"References","size":"18.6 KB","bytes":19050,"url":"../01_Assets/References/AI assistant motion by Robin Holesinsky on Muzli.jpg"},{"name":"Apple Card is Here.jpg","type":"Images","subfolder":"References","size":"12.3 KB","bytes":12558,"url":"../01_Assets/References/Apple Card is Here.jpg"},{"name":"card_design.jpg","type":"Images","subfolder":"References","size":"22.3 KB","bytes":22883,"url":"../01_Assets/References/card_design.jpg"},{"name":"design_1.jpg","type":"Images","subfolder":"References","size":"36.1 KB","bytes":36922,"url":"../01_Assets/References/design_1.jpg"},{"name":"Instagram (1).jpg","type":"Images","subfolder":"References","size":"11.1 KB","bytes":11397,"url":"../01_Assets/References/Instagram (1).jpg"},{"name":"Instagram.jpg","type":"Images","subfolder":"References","size":"29.7 KB","bytes":30378,"url":"../01_Assets/References/Instagram.jpg"},{"name":"motion_graphic.jpg","type":"Images","subfolder":"References","size":"20.7 KB","bytes":21212,"url":"../01_Assets/References/motion_graphic.jpg"},{"name":"téléchargement (1).jpg","type":"Images","subfolder":"References","size":"34.9 KB","bytes":35757,"url":"../01_Assets/References/téléchargement (1).jpg"},{"name":"téléchargement (2).jpg","type":"Images","subfolder":"References","size":"12.5 KB","bytes":12768,"url":"../01_Assets/References/téléchargement (2).jpg"},{"name":"téléchargement.jpg","type":"Images","subfolder":"References","size":"18.4 KB","bytes":18848,"url":"../01_Assets/References/téléchargement.jpg"},{"name":"ui_design.jpg","type":"Images","subfolder":"References","size":"20.0 KB","bytes":20455,"url":"../01_Assets/References/ui_design.jpg"},{"name":"target1_2x_publish.jpg","type":"Images","subfolder":"References/user_targets","size":"45.7 KB","bytes":46821,"url":"../01_Assets/References/user_targets/target1_2x_publish.jpg"},{"name":"target2_16pct.jpg","type":"Images","subfolder":"References/user_targets","size":"16.3 KB","bytes":16715,"url":"../01_Assets/References/user_targets/target2_16pct.jpg"},{"name":"target3_wallet.jpg","type":"Images","subfolder":"References/user_targets","size":"38.7 KB","bytes":39630,"url":"../01_Assets/References/user_targets/target3_wallet.jpg"},{"name":"click_bolt.wav","type":"Audios","subfolder":"SFX","size":"5.7 KB","bytes":5804,"url":"../01_Assets/SFX/click_bolt.wav"},{"name":"ding_fact.wav","type":"Audios","subfolder":"SFX","size":"150.0 KB","bytes":153644,"url":"../01_Assets/SFX/ding_fact.wav"},{"name":"heartbeat_life.mp3","type":"Audios","subfolder":"SFX","size":"9.6 KB","bytes":9837,"url":"../01_Assets/SFX/heartbeat_life.mp3"},{"name":"heartbeat_life.wav","type":"Audios","subfolder":"SFX","size":"32.9 KB","bytes":33644,"url":"../01_Assets/SFX/heartbeat_life.wav"},{"name":"rumble_depressurization.wav","type":"Audios","subfolder":"SFX","size":"140.7 KB","bytes":144044,"url":"../01_Assets/SFX/rumble_depressurization.wav"},{"name":"thump_door.wav","type":"Audios","subfolder":"SFX","size":"32.9 KB","bytes":33644,"url":"../01_Assets/SFX/thump_door.wav"},{"name":"whoosh_life.mp3","type":"Audios","subfolder":"SFX","size":"9.6 KB","bytes":9837,"url":"../01_Assets/SFX/whoosh_life.mp3"},{"name":"whoosh_life.wav","type":"Audios","subfolder":"SFX","size":"32.9 KB","bytes":33644,"url":"../01_Assets/SFX/whoosh_life.wav"},{"name":"whoosh_transition.wav","type":"Audios","subfolder":"SFX","size":"32.9 KB","bytes":33644,"url":"../01_Assets/SFX/whoosh_transition.wav"},{"name":"17_design_tips_for_video_editors.mp4","type":"Videos","subfolder":"Videos","size":"23.5 MB","bytes":24632614,"url":"../01_Assets/Videos/17_design_tips_for_video_editors.mp4"},{"name":"marvid_scroll.mp4","type":"Videos","subfolder":"Videos","size":"2.4 MB","bytes":2477140,"url":"../01_Assets/Videos/marvid_scroll.mp4"},{"name":"motion_design_example.mp4","type":"Videos","subfolder":"Videos","size":"664.9 KB","bytes":680827,"url":"../01_Assets/Videos/motion_design_example.mp4"},{"name":"apple_iphone17pro_tanguy.mp3","type":"Audios","subfolder":"Voix_Off","size":"393.7 KB","bytes":403134,"url":"../01_Assets/Voix_Off/apple_iphone17pro_tanguy.mp3"},{"name":"apple_iphone17pro_tanguy.wav","type":"Audios","subfolder":"Voix_Off","size":"2.8 MB","bytes":2890466,"url":"../01_Assets/Voix_Off/apple_iphone17pro_tanguy.wav"},{"name":"ascii_crt_video_15s.wav","type":"Audios","subfolder":"Voix_Off","size":"1009.8 KB","bytes":1034024,"url":"../01_Assets/Voix_Off/ascii_crt_video_15s.wav"},{"name":"aura_app_tanguy.mp3","type":"Audios","subfolder":"Voix_Off","size":"554.7 KB","bytes":568050,"url":"../01_Assets/Voix_Off/aura_app_tanguy.mp3"},{"name":"aura_app_tanguy.wav","type":"Audios","subfolder":"Voix_Off","size":"2.0 MB","bytes":2082476,"url":"../01_Assets/Voix_Off/aura_app_tanguy.wav"},{"name":"ballon_dor_official_calm.wav","type":"Audios","subfolder":"Voix_Off","size":"1.9 MB","bytes":1946858,"url":"../01_Assets/Voix_Off/ballon_dor_official_calm.wav"},{"name":"football_mara_explainer.mp3","type":"Audios","subfolder":"Voix_Off","size":"1.1 MB","bytes":1198751,"url":"../01_Assets/Voix_Off/football_mara_explainer.mp3"},{"name":"football_mara_explainer.wav","type":"Audios","subfolder":"Voix_Off","size":"4.2 MB","bytes":4399090,"url":"../01_Assets/Voix_Off/football_mara_explainer.wav"},{"name":"growkaw_motivation_solange.wav","type":"Audios","subfolder":"Voix_Off","size":"998.8 KB","bytes":1022760,"url":"../01_Assets/Voix_Off/growkaw_motivation_solange.wav"},{"name":"growkaw_motivation_solange_20s.wav","type":"Audios","subfolder":"Voix_Off","size":"1.5 MB","bytes":1567978,"url":"../01_Assets/Voix_Off/growkaw_motivation_solange_20s.wav"},{"name":"growkaz_video_15s.wav","type":"Audios","subfolder":"Voix_Off","size":"1.0 MB","bytes":1090794,"url":"../01_Assets/Voix_Off/growkaz_video_15s.wav"},{"name":"marvidflow_voice.mp3","type":"Audios","subfolder":"Voix_Off","size":"291.9 KB","bytes":298883,"url":"../01_Assets/Voix_Off/marvidflow_voice.mp3"},{"name":"objectifs_mara-4921.wav","type":"Audios","subfolder":"Voix_Off","size":"2.9 MB","bytes":3023982,"url":"../01_Assets/Voix_Off/objectifs_mara-4921.wav"},{"name":"top10_football_15s.wav","type":"Audios","subfolder":"Voix_Off","size":"598.8 KB","bytes":613160,"url":"../01_Assets/Voix_Off/top10_football_15s.wav"},{"name":"top10_football_full_14s.wav","type":"Audios","subfolder":"Voix_Off","size":"906.8 KB","bytes":928552,"url":"../01_Assets/Voix_Off/top10_football_full_14s.wav"},{"name":"top10_official_2024.wav","type":"Audios","subfolder":"Voix_Off","size":"1.5 MB","bytes":1559786,"url":"../01_Assets/Voix_Off/top10_official_2024.wav"},{"name":"ww2_mara_summary.mp3","type":"Audios","subfolder":"Voix_Off","size":"471.8 KB","bytes":483094,"url":"../01_Assets/Voix_Off/ww2_mara_summary.mp3"},{"name":"ww2_mara_summary.wav","type":"Audios","subfolder":"Voix_Off","size":"3.0 MB","bytes":3198062,"url":"../01_Assets/Voix_Off/ww2_mara_summary.wav"},{"name":"_temp_1793996767311.wav","type":"Audios","subfolder":"Voix_Off","size":"1.0 MB","bytes":1097198,"url":"../01_Assets/Voix_Off/_temp_1793996767311.wav"},{"name":"_temp_1794009979487.wav","type":"Audios","subfolder":"Voix_Off","size":"1.1 MB","bytes":1160368,"url":"../01_Assets/Voix_Off/_temp_1794009979487.wav"},{"name":"_temp_1794017362810.wav","type":"Audios","subfolder":"Voix_Off","size":"582.0 KB","bytes":595996,"url":"../01_Assets/Voix_Off/_temp_1794017362810.wav"}];

        const SNAPSHOT_KEY_CHANNELS = 'marvidflow_cached_channels';
        const SNAPSHOT_KEY_CLIENTS = 'marvidflow_cached_clients';
        const SNAPSHOT_KEY_VIDEOS = 'marvidflow_cached_videos';
        const SNAPSHOT_KEY_ACTIVE_CLIENT = 'marvidflow_active_client_name';

        function initLocalDataSynchronously() {
            // A. Chaînes (lecture instantanée du snapshot local 0ms)
            try {
                const cachedCh = localStorage.getItem(SNAPSHOT_KEY_CHANNELS);
                if (cachedCh) {
                    const parsed = JSON.parse(cachedCh);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        channelsCache = parsed;
                    }
                }
            } catch(e) {}

            if (!channelsCache || channelsCache.length === 0) {
                channelsCache = [
                    {"id":"ch_1793911244535","name":"Dr Klavius","platform":"YouTube","format":"16:9","colorPrimary":"#ffffff","colorSecondary":"#dc2626","fontPrimary":"Montserrat","fontSecondary":"Inter","fontAccent":"Caveat","description":"","avatar":"01_Assets/Images/channels/avatar_ch_1793911244535.png","videos":[],"videoCount":0},
                    {"id":"ch_1794092386560","name":"Le Secrets Des Geeks","platform":"YouTube","format":"16:9","colorPrimary":"#ff3344","colorSecondary":"#dc2626","fontPrimary":"Montserrat","fontSecondary":"Inter","fontAccent":"Caveat","description":"","avatar":"01_Assets/Images/channels/avatar_ch_1794092386560.png","videos":[],"videoCount":0},
                    {"id":"ch_1794881411159","name":"test","platform":"TikTok","format":"9:16","avatar":"","videos":[],"videoCount":0}
                ];
            }

            // B. Clients (lecture instantanée du snapshot local 0ms)
            try {
                const cachedCl = localStorage.getItem(SNAPSHOT_KEY_CLIENTS);
                if (cachedCl) {
                    const parsed = JSON.parse(cachedCl);
                    if (Array.isArray(parsed)) {
                        clientsCache = parsed;
                    }
                }
            } catch(e) {}

            if (!clientsCache) {
                clientsCache = [];
            }

            const savedClientName = localStorage.getItem(SNAPSHOT_KEY_ACTIVE_CLIENT);
            activeClient = (savedClientName && clientsCache.find(c => c.name === savedClientName)) || (clientsCache.length > 0 ? clientsCache[0] : null);

            // C. Vidéos et Projets récents (lecture instantanée du snapshot local 0ms)
            let hasCachedVids = false;
            try {
                const cachedVids = localStorage.getItem(SNAPSHOT_KEY_VIDEOS);
                if (cachedVids !== null) {
                    const parsed = JSON.parse(cachedVids);
                    if (Array.isArray(parsed)) {
                        allVideosList = parsed;
                        hasCachedVids = true;
                    }
                }
            } catch(e) {}

            const baseVideoNow = Date.now();
            if (!hasCachedVids && (!allVideosList || allVideosList.length === 0)) {
                allVideosList = [
                    { 
                        id: 'v1', 
                        title: 'GrowKaz Stickman Motion 15s', 
                        format: '16:9', 
                        duration: '15s', 
                        videoPath: '../04_Videos/video_growkaz_stickman_15s.html', 
                        resolution: '1920×1080', 
                        category: 'standalone', 
                        client: null,
                        timestamp: baseVideoNow - 35 * 60000
                    },
                    { 
                        id: 'v2', 
                        title: 'Claude Fable SaaS Commercial 30s', 
                        format: '16:9', 
                        duration: '38s', 
                        videoPath: '../04_Videos/claude_fable_5_2_30s_saas_commercial.html', 
                        resolution: '1920×1080', 
                        category: 'standalone', 
                        platform: null,
                        channelId: null,
                        channelName: null,
                        client: null,
                        timestamp: baseVideoNow - 26 * 3600000
                    },
                    { 
                        id: 'v3', 
                        title: 'ASCII CRT Retro Terminal 15s', 
                        format: '16:9', 
                        duration: '15s', 
                        videoPath: '../04_Videos/video_ascii_crt_terminal_15s.html', 
                        resolution: '1920×1080', 
                        category: 'standalone', 
                        platform: null,
                        channelId: null,
                        channelName: null,
                        timestamp: baseVideoNow - 48 * 3600000
                    },
                    { 
                        id: 'v4', 
                        title: 'Motion Design Commercial 25s', 
                        format: '16:9', 
                        duration: '25s', 
                        videoPath: '../04_Videos/hyperframes_25s_motion_design_composition.html', 
                        resolution: '1920×1080', 
                        category: 'standalone', 
                        client: null,
                        timestamp: baseVideoNow - 52 * 3600000
                    },
                    { 
                        id: 'v5', 
                        title: 'Eye Tracking Focus Effect 20s', 
                        format: '16:9', 
                        duration: '20s', 
                        videoPath: '../04_Videos/eye_tracking_20s.html', 
                        resolution: '1920×1080', 
                        category: 'reseaux', 
                        platform: 'YouTube',
                        channelId: 'ch_1794092386560',
                        channelName: 'Le Secrets Des Geeks',
                        timestamp: baseVideoNow - 9 * 86400000
                    },
                    { 
                        id: 'v6', 
                        title: 'Design Ask Anything Pill 5s', 
                        format: '16:9', 
                        duration: '05s', 
                        videoPath: '../04_Videos/design_ask_anything_pill_5s.html', 
                        resolution: '1920×1080', 
                        category: 'standalone', 
                        platform: null,
                        channelId: null,
                        channelName: null,
                        client: null,
                        timestamp: baseVideoNow - 10 * 86400000
                    },
                    { 
                        id: 'v7', 
                        title: '17 Design Tips for Video Editors', 
                        format: '16:9', 
                        duration: '01:24', 
                        videoPath: '../01_Assets/Videos/17_design_tips_for_video_editors.mp4', 
                        resolution: '1920×1080', 
                        category: 'reseaux', 
                        platform: 'YouTube',
                        channelId: 'ch_1793911244535',
                        channelName: 'Dr Klavius',
                        timestamp: baseVideoNow - 11 * 86400000
                    }
                ];
            }

            allVideosList = allVideosList.map((v, i) => {
                let title = v.title;
                if (!title) {
                    title = (v.file || v.name || 'Projet Vidéo ' + (i + 1)).replace('.html', '').replace('.mp4', '').replace(/_/g, ' ');
                }
                const videoPath = v.videoPath || v.path || (v.file ? `../04_Videos/${v.file}` : '../01_Assets/Videos/17_design_tips_for_video_editors.mp4');
                const ts = v.timestamp || (baseVideoNow - i * 86400000);
                return {
                    ...v,
                    id: v.id || ('vid_' + i),
                    title,
                    videoPath,
                    duration: typeof v.duration === 'number' ? Math.round(v.duration) + 's' : (v.duration || '15s'),
                    format: v.format || '16:9',
                    timestamp: ts,
                    lastOpened: v.lastOpened || ts
                };
            });

            // Filtrer les vidéos supprimées par l'utilisateur
            try {
                const deletedList = JSON.parse(localStorage.getItem('marvidflow_deleted_videos') || localStorage.getItem('autoframe_deleted_videos') || '[]');
                if (deletedList.length > 0) {
                    allVideosList = allVideosList.filter(v => {
                        const vp = (v.videoPath || v.path || v.file || '').replace(/^(\.\.[\/\\])+/, '').replace(/^[\\/]+/, '');
                        const vf = vp.split(/[/\\]/).pop();
                        const vt = (v.title || '').trim().toLowerCase();
                        if (deletedList.some(d => d && (d === vp || d === vf || d === v.videoPath || (vt && d.toLowerCase().trim() === vt)))) {
                            return false;
                        }
                        return true;
                    });
                }
            } catch(e) {}

            // D. Assets
            if (!assetsCatalogList || assetsCatalogList.length < FULL_EMBEDDED_CATALOG.length) {
                assetsCatalogList = FULL_EMBEDDED_CATALOG;
            }
            const assetBaseTime = Date.now();
            assetsCatalogList = assetsCatalogList.map((a, i) => ({
                ...a,
                id: a.id || ('asset_' + i + '_' + (a.name || '').replace(/[^a-zA-Z0-9]/g, '_')),
                timestamp: a.timestamp || (assetBaseTime - i * 3600000)
            }));
            assetsCatalogList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        }

        function hideInitialAppLoader() {
            setTimeout(() => {
                const loader = document.getElementById('appInitialLoader');
                if (!loader) return;
                loader.style.opacity = '0';
                loader.style.pointerEvents = 'none';
                setTimeout(() => {
                    if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
                }, 400);
            }, 350);
        }

        function loadAllInitialData() {
            // 0. Restauration de l'état réduit / étendu de la sidebar
            initSidebarState();

            // 1. Initialisation synchrone immédiate (0ms - du tic au tac)
            initLocalDataSynchronously();

            // 2. Rendu instantané : Dashboard par défaut à l'ouverture, sauf si un #hash précis est dans l'URL
            updateSidebarCounters();
            const initialHash = window.location.hash ? window.location.hash.replace('#', '') : 'dashboard';
            switchView(initialHash);

            // 3. Masquage fluide de l'écran de chargement initial (fond flou + cercle)
            hideInitialAppLoader();

            // 4. Synchronisation non bloquante en arrière-plan
            syncServerDataInBackground();
        }

        async function syncServerDataInBackground() {
            try {
                const timeoutFetch = (url, timeoutMs = 1500) => {
                    if (typeof AbortController === 'undefined') return fetch(url);
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                    return fetch(url, { signal: controller.signal })
                        .then(res => { clearTimeout(timeoutId); return res; })
                        .catch(err => { clearTimeout(timeoutId); throw err; });
                };

                const [resChannels, resClients, resFiles, resAssets] = await Promise.allSettled([
                    timeoutFetch('/api/channels'),
                    timeoutFetch('/api/clients'),
                    timeoutFetch('/api/files'),
                    timeoutFetch('/api/assets-catalog')
                ]);

                let hasChanges = false;

                // 1. Sync Chaînes
                if (resChannels.status === 'fulfilled' && resChannels.value.ok) {
                    try {
                        const data = await resChannels.value.json();
                        if (Array.isArray(data)) {
                            const newChStr = JSON.stringify(data);
                            const oldChStr = JSON.stringify(channelsCache);
                            if (newChStr !== oldChStr) {
                                channelsCache = data;
                                localStorage.setItem(SNAPSHOT_KEY_CHANNELS, newChStr);
                                hasChanges = true;
                            }
                        }
                    } catch(e) {}
                }

                // 2. Sync Clients
                if (resClients.status === 'fulfilled' && resClients.value.ok) {
                    try {
                        const data = await resClients.value.json();
                        if (data.success && Array.isArray(data.clients)) {
                            const normalized = data.clients.map(cl => ({
                                ...cl,
                                categories: cl.categories || cl.folders || {
                                    images_references: [],
                                    videos_references: [],
                                    clips_video: [],
                                    voix_off: [],
                                    musiques: [],
                                    effets_sonores: [],
                                    images_illustrations: [],
                                    skills: []
                                }
                            }));
                            const newClStr = JSON.stringify(normalized);
                            const oldClStr = JSON.stringify(clientsCache);
                            if (newClStr !== oldClStr) {
                                clientsCache = normalized;
                                activeClient = clientsCache.find(c => c.name === (activeClient ? activeClient.name : '')) || (clientsCache.length > 0 ? clientsCache[0] : null);
                                localStorage.setItem(SNAPSHOT_KEY_CLIENTS, newClStr);
                                if (activeClient) localStorage.setItem(SNAPSHOT_KEY_ACTIVE_CLIENT, activeClient.name);
                                hasChanges = true;
                            }
                        }
                    } catch(e) {}
                }

                // 3. Sync Fichiers Vidéos
                if (resFiles.status === 'fulfilled' && resFiles.value.ok) {
                    try {
                        const data = await resFiles.value.json();
                        if (data.videos && Array.isArray(data.videos)) {
                            let deletedList = [];
                            try {
                                deletedList = JSON.parse(localStorage.getItem('marvidflow_deleted_videos') || localStorage.getItem('autoframe_deleted_videos') || '[]');
                            } catch(e) {}

                            const filtered = data.videos.filter(v => {
                                const vp = (v.path || v.file || v.videoPath || v.name || '').replace(/^(\.\.[\/\\])+/, '').replace(/^[\\/]+/, '');
                                const vf = vp.split(/[/\\]/).pop();
                                const vt = (v.title || '').trim().toLowerCase();
                                if (deletedList.some(d => d && (d === vp || d === vf || d === v.name || (vt && d.toLowerCase().trim() === vt)))) {
                                    return false;
                                }
                                return true;
                            });

                            const mapped = filtered.map((v, i) => {
                                let title = v.title;
                                if (!title) {
                                    title = (v.file || v.name || 'Projet Vidéo ' + (i + 1)).replace('.html', '').replace('.mp4', '').replace(/_/g, ' ');
                                }
                                const videoPath = v.videoPath || v.path || (v.file ? `../04_Videos/${v.file}` : '../01_Assets/Videos/17_design_tips_for_video_editors.mp4');
                                const ts = v.timestamp || (Date.now() - i * 86400000);
                                return {
                                    ...v,
                                    id: v.id || ('vid_' + i),
                                    title,
                                    videoPath,
                                    duration: typeof v.duration === 'number' ? Math.round(v.duration) + 's' : (v.duration || '15s'),
                                    format: v.format || '16:9',
                                    timestamp: ts,
                                    lastOpened: v.lastOpened || ts
                                };
                            });

                            const newVidStr = JSON.stringify(mapped);
                            const oldVidStr = JSON.stringify(allVideosList);
                            if (newVidStr !== oldVidStr) {
                                allVideosList = mapped;
                                localStorage.setItem(SNAPSHOT_KEY_VIDEOS, newVidStr);
                                hasChanges = true;
                            }
                        }
                    } catch(e) {}
                }

                // 4. Sync Assets
                if (resAssets.status === 'fulfilled' && resAssets.value.ok) {
                    try {
                        const data = await resAssets.value.json();
                        if (data.assets && Array.isArray(data.assets) && data.assets.length > 0) {
                            if (data.assets.length !== assetsCatalogList.length) {
                                const assetBaseTime = Date.now();
                                assetsCatalogList = data.assets.map((a, i) => ({
                                    ...a,
                                    id: a.id || ('asset_' + i + '_' + (a.name || '').replace(/[^a-zA-Z0-9]/g, '_')),
                                    timestamp: a.timestamp || (assetBaseTime - i * 3600000)
                                }));
                                assetsCatalogList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                                hasChanges = true;
                            }
                        }
                    } catch(e) {}
                }

                // Si et seulement si un changement physique a eu lieu sur le disque dur, on rafraîchit
                if (hasChanges) {
                    updateSidebarCounters();
                    if (currentView === 'dashboard') renderDashboardProjects();
                    else if (currentView === 'reseaux') renderChannelsView();
                    else if (currentView === 'clients') renderClientsView();
                    else if (currentView === 'assets') renderAssetsView();
                }
            } catch (err) {
                console.warn('Sync background silencieux:', err);
            }
        }





        function updateSidebarCounters() {
            document.getElementById('navCounterDashboard').textContent = allVideosList.length;
            document.getElementById('navCounterReseaux').textContent = channelsCache.length;
            document.getElementById('navCounterClients').textContent = clientsCache.length;
            document.getElementById('navCounterAssets').textContent = assetsCatalogList.length;
        }

        function refreshCurrentView() {
            loadAllInitialData();
            showToast('Données actualisées');
        }

        function toggleUserProfileMenu(e) {
            if (e) e.stopPropagation();
            const dd = document.getElementById('userProfileDropdown');
            if (!dd) return;
            const isOpen = dd.style.display === 'block';
            dd.style.display = isOpen ? 'none' : 'block';
        }

        window.addEventListener('click', (e) => {
            const dd = document.getElementById('userProfileDropdown');
            const btn = document.getElementById('userProfileBtn');
            if (dd && dd.style.display === 'block') {
                if (!dd.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
                    dd.style.display = 'none';
                }
            }
        });

        // =====================================================================
        // SECTION DASHBOARD
        // =====================================================================
        let activeCircleCategory = null; // 'YouTube' | 'Instagram' | 'TikTok' | 'Clients' | null
        let activeSubFilterId = null; // channelId or client name

        function resetDashboardFilter() {
            activeCircleCategory = null;
            activeSubFilterId = null;
            
            document.querySelectorAll('.filter-circle-btn').forEach(b => b.classList.remove('active'));
            const btnAll = document.getElementById('btnFilterAllVideos');
            if (btnAll) btnAll.classList.add('active');
            
            const subBar = document.getElementById('dashboardSubFilterBar');
            if (subBar) {
                subBar.style.display = 'none';
                subBar.innerHTML = '';
            }
            
            renderDashboardProjects();
        }

        function toggleDashboardCircleFilter(category) {
            if (activeCircleCategory === category) {
                resetDashboardFilter();
                return;
            }

            activeCircleCategory = category;
            activeSubFilterId = null;

            document.querySelectorAll('.filter-circle-btn').forEach(b => b.classList.remove('active'));
            const btnAll = document.getElementById('btnFilterAllVideos');
            if (btnAll) btnAll.classList.remove('active');

            const circleBtn = document.getElementById('circleBtn' + category);
            if (circleBtn) circleBtn.classList.add('active');

            renderDashboardSubFilterBar(category);
            renderDashboardProjects();
        }

        function renderDashboardSubFilterBar(category) {
            const subBar = document.getElementById('dashboardSubFilterBar');
            if (!subBar) return;
            subBar.style.display = 'flex';

            let html = '';

            if (category === 'YouTube' || category === 'Instagram' || category === 'TikTok') {
                const filteredChannels = channelsCache.filter(c => c.platform === category);
                const allLabel = category === 'YouTube' ? 'Toutes les chaînes YouTube' : (category === 'Instagram' ? 'Tous les comptes Instagram' : 'Tous les comptes TikTok');
                
                html += `
                    <div class="subfilter-chip ${!activeSubFilterId ? 'active' : ''}" onclick="selectDashboardSubFilter(null)">
                        <span>${allLabel} (${filteredChannels.length})</span>
                    </div>
                `;

                filteredChannels.forEach(c => {
                    const isSel = activeSubFilterId === c.id;
                    const avatarStyle = c.avatar ? `background-image: url('../${c.avatar.replace(/^\.\.\//, '')}');` : '';
                    const fallbackLetter = c.name ? c.name.charAt(0).toUpperCase() : 'C';
                    const vidCount = allVideosList.filter(v => v.channelId === c.id).length;

                    html += `
                        <div class="subfilter-chip ${isSel ? 'active' : ''}" onclick="selectDashboardSubFilter('${c.id}')">
                            <div class="subfilter-chip-avatar" style="${avatarStyle}">
                                ${!c.avatar ? fallbackLetter : ''}
                            </div>
                            <span>${escapeHtml(c.name)}</span>
                            <span style="font-size: 10px; opacity: 0.7; font-family: 'JetBrains Mono', monospace;">${vidCount}</span>
                        </div>
                    `;
                });
            } else if (category === 'Clients') {
                html += `
                    <div class="subfilter-chip ${!activeSubFilterId ? 'active' : ''}" onclick="selectDashboardSubFilter(null)">
                        <span>Tous les clients (${clientsCache.length})</span>
                    </div>
                `;

                clientsCache.forEach(cl => {
                    const isSel = activeSubFilterId === cl.name;
                    const avatarStyle = cl.avatar ? `background-image: url('../${cl.avatar.replace(/^\.\.\//, '')}');` : '';
                    const fallbackLetter = cl.name ? cl.name.charAt(0).toUpperCase() : 'C';
                    const vidCount = allVideosList.filter(v => v.client === cl.name).length;

                    html += `
                        <div class="subfilter-chip ${isSel ? 'active' : ''}" onclick="selectDashboardSubFilter('${cl.name}')">
                            <div class="subfilter-chip-avatar" style="${avatarStyle}">
                                ${!cl.avatar ? fallbackLetter : ''}
                            </div>
                            <span>${escapeHtml(cl.name)}</span>
                            <span style="font-size: 10px; opacity: 0.7; font-family: 'JetBrains Mono', monospace;">${vidCount}</span>
                        </div>
                    `;
                });
            } else if (category === 'Standalone') {
                const standaloneVideos = allVideosList.filter(v => (!v.channelId || v.channelId === '') && (!v.client || v.client === ''));
                html += `
                    <div class="subfilter-chip active" onclick="selectDashboardSubFilter(null)">
                        <span>video sans chaine (${standaloneVideos.length})</span>
                    </div>
                `;
            }

            subBar.innerHTML = html;
        }

        function selectDashboardSubFilter(id) {
            activeSubFilterId = id;
            if (activeCircleCategory) {
                renderDashboardSubFilterBar(activeCircleCategory);
            }
            renderDashboardProjects();
        }

        // =====================================================================
        // GESTION DE LA DATE & HEURE DE DERNIÈRE OUVERTURE (JAMAIS "RÉCEMMENT")
        // =====================================================================
        const VIDEO_LAST_OPENED_STORAGE_KEY = 'autoframe_videos_last_opened';

        function getVideoLastOpenedTimestamp(v) {
            if (!v) return Date.now();
            try {
                const stored = JSON.parse(localStorage.getItem(VIDEO_LAST_OPENED_STORAGE_KEY) || '{}');
                const k1 = v.id;
                const k2 = v.videoPath;
                const k3 = v.title;
                if (k1 && stored[k1]) return Number(stored[k1]);
                if (k2 && stored[k2]) return Number(stored[k2]);
                if (k3 && stored[k3]) return Number(stored[k3]);
            } catch (e) {}
            if (v.lastOpened) return Number(v.lastOpened);
            if (v.timestamp) return Number(v.timestamp);
            return Date.now();
        }

        function formatVideoLastOpenedDateTime(timestamp) {
            if (!timestamp) timestamp = Date.now();
            const d = new Date(timestamp);
            if (isNaN(d.getTime())) return '';
            const day = String(d.getDate()).padStart(2, '0');
            const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
            const month = months[d.getMonth()] || 'nov.';
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${day} ${month} ${year} à ${hours}:${minutes}`;
        }

        function recordVideoOpened(videoPathOrObj, optionalTitle) {
            try {
                let vid = null;
                const path = typeof videoPathOrObj === 'string' ? videoPathOrObj : (videoPathOrObj ? videoPathOrObj.videoPath : '');
                const title = optionalTitle || (typeof videoPathOrObj === 'object' ? videoPathOrObj.title : '');
                
                if (allVideosList && Array.isArray(allVideosList)) {
                    vid = allVideosList.find(v => 
                        (path && (v.videoPath === path || v.videoPath === '../' + path || '../' + v.videoPath === path)) || 
                        (title && v.title === title) || 
                        (v.id && (v.id === path || v.id === videoPathOrObj))
                    );
                }

                const now = Date.now();
                const stored = JSON.parse(localStorage.getItem(VIDEO_LAST_OPENED_STORAGE_KEY) || '{}');
                
                if (vid) {
                    vid.lastOpened = now;
                    if (vid.id) stored[vid.id] = now;
                    if (vid.videoPath) stored[vid.videoPath] = now;
                    if (vid.title) stored[vid.title] = now;
                }
                if (path) stored[path] = now;
                if (title) stored[title] = now;
                
                localStorage.setItem(VIDEO_LAST_OPENED_STORAGE_KEY, JSON.stringify(stored));

                // Si sur le dashboard, rafraîchir l'affichage pour mettre à jour la date et l'heure immédiatement
                if (currentView === 'dashboard') {
                    renderDashboardProjects();
                }
            } catch (e) {
                console.warn('Erreur recordVideoOpened:', e);
            }
        }

        // Rendu authentique d'une card vidéo : 
        // - Si vidéo native (.mp4/.webm) : frame extrait nativement à 0.5s par le navigateur sans capture manuelle
        // - Si composition HTML ou sans frame direct : affichage studio moderne épuré sans faux visuels inventés
        // - Date et heure de dernière ouverture réelle (au lieu de "Récemment")
        function renderVideoCardHtml(v) {
            const isVideoFile = v.videoPath && (v.videoPath.endsWith('.mp4') || v.videoPath.endsWith('.webm') || v.videoPath.endsWith('.mov'));
            const durationBadge = v.duration || '15s';
            const formatBadge = v.format || '16:9';
            
            // Calcul précis de la date et heure de dernière ouverture
            const lastOpenedTs = getVideoLastOpenedTimestamp(v);
            const dateBadge = formatVideoLastOpenedDateTime(lastOpenedTs);

            let thumbContent = '';
            if (isVideoFile) {
                // Vrai frame tiré directement de la vidéo nativement par le navigateur
                thumbContent = `<video src="${v.videoPath}#t=0.5" preload="metadata" muted playsinline style="width:100%; height:100%; object-fit:cover; pointer-events:none;"></video>`;
            } else {
                // Composition HTML ou projet studio : design épuré, pro, sans fausse image aléatoire
                thumbContent = `
                    <div style="width:100%; height:100%; background: radial-gradient(circle at 50% 35%, #181d28 0%, #0c0f16 70%, #06070a 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; overflow:hidden;">
                        <div style="position: absolute; inset:0; opacity:0.04; background-image: linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px); background-size: 18px 18px;"></div>
                        <div style="width: 46px; height: 46px; border-radius: 50%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); display: flex; align-items: center; justify-content: center; margin-bottom: 8px; backdrop-filter: blur(8px);">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px; color: #d4d4d8; margin-left: 2px;"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"></polygon></svg>
                        </div>
                        <span style="font-size: 10.5px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.8px; font-family: 'JetBrains Mono', monospace;">${formatBadge}</span>
                    </div>
                `;
            }

            return `
                <div class="project-card" onclick="openGrandVideoPlayer('${v.videoPath}', '${escapeJs(v.title)}', '${formatBadge}', '${durationBadge}')" title="Regarder ${escapeHtml(v.title)} • Dernière ouverture : ${dateBadge}">
                    <div class="project-thumb">
                        ${thumbContent}
                        <div class="project-card-overlay"></div>
                        <div class="project-card-footer">
                            <div class="project-card-info-wrap">
                                <div class="project-card-title">${escapeHtml(v.title)}</div>
                                <div class="project-card-meta" title="Dernière ouverture : ${dateBadge}">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 11px; height: 11px; display: inline-block; opacity: 0.8; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg><span>${dateBadge}</span> • <span>${formatBadge}</span>
                                </div>
                            </div>
                            <span class="project-duration-badge">${durationBadge}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        function renderDashboardProjects(customList) {
            const grid = document.getElementById('dashboardProjectsGrid');
            if (!grid) return;

            // Par défaut : toutes les vidéos triées par date et heure de dernière ouverture
            let filtered = customList ? customList.slice() : allVideosList.slice().sort((a, b) => getVideoLastOpenedTimestamp(b) - getVideoLastOpenedTimestamp(a));

            if (!customList && activeCircleCategory) {
                if (activeCircleCategory === 'YouTube' || activeCircleCategory === 'Instagram' || activeCircleCategory === 'TikTok') {
                    filtered = filtered.filter(v => {
                        if (activeSubFilterId) return v.channelId === activeSubFilterId;
                        return v.platform === activeCircleCategory;
                    });
                } else if (activeCircleCategory === 'Clients') {
                    filtered = filtered.filter(v => {
                        if (activeSubFilterId) return v.client === activeSubFilterId;
                        return v.category === 'clients';
                    });
                } else if (activeCircleCategory === 'Standalone') {
                    filtered = filtered.filter(v => {
                        return (!v.channelId || v.channelId === '') && (!v.client || v.client === '');
                    });
                }
            }

            document.getElementById('dashboardVideosCount').textContent = `${filtered.length} vidéo${filtered.length > 1 ? 's' : ''}`;

            if (filtered.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--text-muted);">Aucune vidéo trouvée pour ces filtres.</div>';
                return;
            }

            grid.innerHTML = filtered.map(v => renderVideoCardHtml(v)).join('');
        }

        function handleReseauFilterChange(sel) {
            dashboardReseauFilter = sel.value;
            renderDashboardProjects();
        }

        function handleClientFilterChange(sel) {
            dashboardClientFilter = sel.value;
            renderDashboardProjects();
        }

        function openProjectsFolder() {
            fetch('/api/open-projects-folder', { method: 'POST' }).catch(() => {});
            showToast('Dossier local ouvert');
        }

        // =====================================================================
        // SECTION MES RÉSEAUX : CARD CRÉATION EN COURS / NON TERMINÉE & REPRISE
        // =====================================================================
        function resumeInterruptedVideo(videoPath, jobId, channelId) {
            const url = new URL('video_processus.html', window.location.href);
            if (videoPath) url.searchParams.set('video', videoPath);
            if (jobId) url.searchParams.set('jobId', jobId);
            if (channelId) url.searchParams.set('channel', channelId);
            url.searchParams.set('resume', '1');
            window.location.href = url.toString();
        }

        function renderPendingOrInterruptedVideoCard(channelVideos) {
            const container = document.getElementById('reseauxLatestVideoContainer');
            if (!container) return;

            const badgeState = document.getElementById('badgePendingState');
            const labelSub = document.getElementById('labelPendingSub');

            // 1. Détection de vidéo non terminée ou interrompue dans les vidéos
            // (filtre strict : vidéos de chaînes / comptes hors montage clients)
            const targetVideos = (channelVideos || allVideosList || []).filter(v => !v.client || v.client.trim() === '');
            
            // Priorité 1 : Statut explicite 'processing', 'interrupted', 'pending' ou canResume
            let pendingVid = targetVideos.find(v => 
                v.status === 'processing' || 
                v.status === 'interrupted' || 
                v.status === 'pending' || 
                v.canResume === true || 
                (v.progress !== undefined && v.progress < 100 && v.status !== 'completed')
            );

            // Priorité 2 : Vérification dans le localStorage (si une création a été lancée ou interrompue récemment)
            if (!pendingVid) {
                try {
                    const rawInterrupted = localStorage.getItem('vibeeditor_interrupted_video') || localStorage.getItem('vibeeditor_pending_creation');
                    if (rawInterrupted) {
                        const parsed = JSON.parse(rawInterrupted);
                        if (parsed && (parsed.prompt || parsed.fileName || parsed.targetVideo)) {
                            pendingVid = {
                                id: parsed.jobId || 'pending_local',
                                title: parsed.prompt || parsed.fileName || 'Création en attente',
                                videoPath: parsed.targetVideo || (parsed.fileName ? `../04_Videos/${parsed.fileName}.html` : ''),
                                format: parsed.format || '16:9',
                                duration: parsed.duration ? (typeof parsed.duration === 'number' ? parsed.duration + 's' : parsed.duration) : '20s',
                                channelId: parsed.channelId || null,
                                channelName: parsed.channelName || null,
                                status: 'interrupted',
                                canResume: true,
                                progress: parsed.progress || 35,
                                phaseLabel: parsed.phaseLabel || 'Création interrompue — Prête à reprendre',
                                jobId: parsed.jobId || null
                            };
                        }
                    }
                } catch(e) {}
            }

            // CAS A : AUCUNE VIDÉO INTERROMPUE / TOUT EST TERMINÉ
            if (!pendingVid) {
                if (badgeState) {
                    badgeState.textContent = 'Toutes Terminées';
                    badgeState.style.color = '#10b981';
                    badgeState.style.background = 'rgba(16, 185, 129, 0.12)';
                    badgeState.style.borderColor = 'rgba(16, 185, 129, 0.25)';
                }
                if (labelSub) {
                    labelSub.textContent = 'Aucune interruption détectée';
                }

                container.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: rgba(16, 185, 129, 0.03); border: 1px dashed rgba(16, 185, 129, 0.25); border-radius: var(--radius-sm); color: var(--text-muted); font-size: 12px; gap: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(16, 185, 129, 0.14); display: flex; align-items: center; justify-content: center; color: #10b981; flex-shrink: 0;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 14px; height: 14px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <div>
                                <span style="color: #ffffff; font-weight: 600; display: block; margin-bottom: 2px;">Toutes vos créations sont terminées à 100%</span>
                                <span style="color: var(--text-muted); font-size: 11px;">Aucune vidéo en attente pour vos comptes et chaînes.</span>
                            </div>
                        </div>
                        <button type="button" class="btn-create-video-head" onclick="openCreateVideoView()" style="font-size: 11.5px; padding: 6px 14px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: #ffffff; border-radius: 6px; cursor: pointer; transition: all 0.2s ease;">+ Nouvelle Vidéo</button>
                    </div>
                `;
                return;
            }

            // CAS B : UNE VIDÉO EST INTERROMPUE OU NON TERMINÉE (AFFICHAGE ET REPRISE DIRECTE)
            const v = pendingVid;
            const channel = channelsCache.find(c => c.id === v.channelId || (v.channelName && c.name === v.channelName));
            const channelName = channel ? channel.name : (v.channelName || (v.platform ? `Chaîne ${v.platform}` : 'Chaîne dédiée'));
            const durationBadge = typeof v.duration === 'number' ? Math.round(v.duration) + 's' : (v.duration || '20s');
            const formatBadge = v.format || '16:9';
            const progressPct = typeof v.progress === 'number' ? Math.max(5, Math.min(99, Math.round(v.progress))) : 35;
            const phaseText = v.phaseLabel || (v.status === 'processing' ? 'Génération en cours...' : 'Création interrompue — Prête à reprendre');

            if (badgeState) {
                badgeState.textContent = v.status === 'processing' ? `En cours (${progressPct}%)` : 'Reprise Disponible';
                badgeState.style.color = '#f59e0b';
                badgeState.style.background = 'rgba(245, 158, 11, 0.14)';
                badgeState.style.borderColor = 'rgba(245, 158, 11, 0.3)';
            }
            if (labelSub) {
                labelSub.textContent = 'Cliquez pour reprendre et finaliser la génération';
            }

            const safeVidPath = (v.videoPath || v.path || '').replace(/'/g, "\\'");
            const safeJobId = (v.jobId || '').replace(/'/g, "\\'");
            const safeChanId = (v.channelId || '').replace(/'/g, "\\'");

            container.innerHTML = `
                <div class="latest-channel-video-row" style="background: rgba(245, 158, 11, 0.04); border-color: rgba(245, 158, 11, 0.25);" onclick="resumeInterruptedVideo('${safeVidPath}', '${safeJobId}', '${safeChanId}')" title="Cliquez pour continuer la vidéo : ${escapeHtml(v.title)}">
                    <div class="latest-channel-video-thumb" style="border-color: rgba(245, 158, 11, 0.35); background: #0b0e14;">
                        <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; background: radial-gradient(circle at 50% 40%, rgba(245, 158, 11, 0.15) 0%, rgba(10, 13, 20, 0.95) 75%);">
                            <div style="width:28px; height:28px; border-radius:50%; background:rgba(245, 158, 11, 0.2); border:1px solid #f59e0b; display:flex; align-items:center; justify-content:center; color:#f59e0b;">
                                <svg viewBox="0 0 24 24" fill="currentColor" style="width: 13px; height: 13px; margin-left: 2px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            </div>
                            <span style="font-size:10px; font-weight:700; color:#f59e0b; font-family:monospace;">${progressPct}%</span>
                        </div>
                        <span class="latest-format-tag">${formatBadge}</span>
                    </div>
                    <div class="latest-channel-video-content" style="flex:1;">
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                            <div style="display:flex; align-items:center; gap:6px;">
                                <span class="latest-channel-badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3);">${escapeHtml(channelName)}</span>
                                <span style="font-size:11px; color:#f59e0b; font-weight:600;">⚠️ Non terminée</span>
                            </div>
                            <span style="font-size:11px; color:var(--text-muted); font-family:monospace;">Durée visée: ${durationBadge}</span>
                        </div>
                        <h4 class="latest-channel-video-title" style="margin: 4px 0 6px 0; color:#ffffff;">${escapeHtml(v.title)}</h4>
                        
                        <!-- Barre de progression de la vidéo interrompue -->
                        <div style="width: 100%; background: rgba(255,255,255,0.06); height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 6px;">
                            <div style="width: ${progressPct}%; height: 100%; background: linear-gradient(90deg, #f59e0b, #ef4444); border-radius: 3px; transition: width 0.3s ease;"></div>
                        </div>

                        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                            <span style="font-size:11px; color:var(--text-muted);">${escapeHtml(phaseText)}</span>
                            <button type="button" class="btn-play-latest" style="background: #f59e0b; color: #000000; font-weight: 700; border: none; padding: 4px 12px; border-radius: 5px;" onclick="event.stopPropagation(); resumeInterruptedVideo('${safeVidPath}', '${safeJobId}', '${safeChanId}')">
                                <svg viewBox="0 0 24 24" fill="currentColor" style="width:11px; height:11px; margin-right:4px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                <span>Continuer la Vidéo</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        const renderLatestChannelVideoCard = renderPendingOrInterruptedVideoCard;

        function renderChannelsView(customList) {
            // Stats summary : Chaînes et vidéos de comptes (exclut montage clients)
            const totalChannels = channelsCache.length;
            const channelVideos = allVideosList.filter(v => !v.client || v.client.trim() === '');
            const totalPublished = channelVideos.length;
            const countYouTube = channelsCache.filter(c => c.platform === 'YouTube').length;
            const countInsta = channelsCache.filter(c => c.platform === 'Instagram').length;
            const countTikTok = channelsCache.filter(c => c.platform === 'TikTok').length;

            const elTotalCh = document.getElementById('statsTotalChannels');
            if (elTotalCh) elTotalCh.textContent = totalChannels;
            const elTotalVids = document.getElementById('statsTotalVideos');
            if (elTotalVids) elTotalVids.textContent = totalPublished;

            // Rendu de la card 3 : Dernière vidéo créée pour un compte (double largeur)
            renderLatestChannelVideoCard(channelVideos);

            const elYt = document.getElementById('pillCountYouTube');
            if (elYt) elYt.textContent = countYouTube;
            const elIg = document.getElementById('pillCountInstagram');
            if (elIg) elIg.textContent = countInsta;
            const elTk = document.getElementById('pillCountTikTok');
            if (elTk) elTk.textContent = countTikTok;
            const elSt = document.getElementById('pillCountStandalone');
            const countStandalone = allVideosList.filter(v => (!v.channelId || v.channelId === '') && (!v.client || v.client === '')).length;
            if (elSt) elSt.textContent = countStandalone;

            const grid = document.getElementById('channelsListGrid');
            if (!grid) return;

            // Filtrage selon customList ou currentPlatformFilter (PAR DÉFAUT YOUTUBE)
            let list = customList;
            if (!list) {
                if (currentPlatformFilter === 'all') {
                    list = channelsCache;
                } else if (currentPlatformFilter === 'standalone') {
                    // Vidéos sans chaîne et qui ne sont pas des vidéos clients
                    const standaloneVideos = allVideosList.filter(v => (!v.channelId || v.channelId === '') && (!v.client || v.client === ''));
                    
                    if (standaloneVideos.length === 0) {
                        grid.innerHTML = `
                            <div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md);">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 36px; height: 36px; margin-bottom: 8px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                <h4 style="color:#ffffff; margin-bottom: 4px;">Aucune vidéo indépendante pour le moment</h4>
                                <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Créez une vidéo générique sans chaîne ni client associé.</p>
                                <button type="button" class="btn-primary-action" onclick="openCreateVideoView(null)" style="display: inline-flex;">+ Créer une Vidéo Indépendante</button>
                            </div>
                        `;
                    } else {
                        grid.innerHTML = `
                            <div style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 10px;">
                                <div>
                                    <h3 style="font-size: 15px; font-weight: 700; color: #ffffff;">Vidéos indépendantes hors chaîne</h3>
                                    <p style="font-size: 12px; color: var(--text-muted);">${standaloneVideos.length} vidéo${standaloneVideos.length > 1 ? 's' : ''} créée${standaloneVideos.length > 1 ? 's' : ''} sans chaîne et hors montage client.</p>
                                </div>
                                <button type="button" class="btn-create-video-head" onclick="openCreateVideoView(null)">+ Créer une Vidéo sans chaîne</button>
                            </div>
                            ${standaloneVideos.map(v => renderVideoCardHtml(v)).join('')}
                        `;
                    }
                    return;
                } else {
                    list = channelsCache.filter(c => c.platform === currentPlatformFilter);
                }
            }

            if (list.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md);">
                        <p style="font-size: 14px; color: #ffffff; font-weight: 700; margin-bottom: 6px;">Aucune chaîne trouvée pour ${currentPlatformFilter}</p>
                        <p style="font-size: 12px; margin-bottom: 16px;">Créez votre première chaîne ou changez d'onglet.</p>
                        <button type="button" class="btn-primary-action" onclick="openAddChannelModal()">+ Créer une Chaîne ${currentPlatformFilter}</button>
                    </div>
                `;
                return;
            }

            grid.innerHTML = list.map(c => {
                const avatarStyle = c.avatar ? `background-image: url('../${c.avatar.replace(/^\.\.\//, '')}');` : '';
                const fallbackLetter = c.name ? c.name.charAt(0).toUpperCase() : 'C';

                let platformSvg = '';
                let platformClass = 'youtube';
                if (c.platform === 'Instagram') {
                    platformClass = 'instagram';
                    platformSvg = `
                        <svg viewBox="0 0 24 24" style="width: 13px; height: 13px; flex-shrink: 0;">
                            <defs>
                                <radialGradient id="igCardGrad_${c.id}" cx="20%" cy="105%" r="105%">
                                    <stop offset="0%" stop-color="#ffd521" />
                                    <stop offset="20%" stop-color="#fd5949" />
                                    <stop offset="60%" stop-color="#d6249f" />
                                    <stop offset="100%" stop-color="#285AEB" />
                                </radialGradient>
                            </defs>
                            <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#igCardGrad_${c.id})"></rect>
                            <circle cx="12" cy="12" r="4.2" fill="none" stroke="#ffffff" stroke-width="1.8"></circle>
                            <circle cx="17.2" cy="6.8" r="1.1" fill="#ffffff"></circle>
                        </svg>
                    `;
                } else if (c.platform === 'TikTok') {
                    platformClass = 'tiktok';
                    platformSvg = `
                        <svg viewBox="0 0 24 24" fill="#FFFFFF" style="width: 12px; height: 12px; flex-shrink: 0;"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.5 6.3 6.3 0 0 0 1.86-4.5v-7.1a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.86.01z"/></svg>
                    `;
                } else {
                    platformClass = 'youtube';
                    platformSvg = `
                        <svg viewBox="0 0 24 24" fill="#FF0000" style="width: 13px; height: 13px; flex-shrink: 0;"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    `;
                }

                // Card de chaîne épuré : pas de bouton créer vidéo sur le card,
                // bouton paramètres bien visible, et bouton supprimer compact et discret (26x26px).
                return `
                    <div class="channel-card" onclick="openChannelDetailView('${c.id}')" style="cursor: pointer;">
                        <div class="channel-header">
                            <div class="channel-avatar-circle" style="${avatarStyle}" onclick="triggerChangeChannelAvatar('${c.id}')" title="Changer l'avatar de la chaîne">
                                ${!c.avatar ? fallbackLetter : ''}
                                <div class="channel-avatar-hover">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                </div>
                            </div>
                            <div class="channel-title-group">
                                <div class="channel-name" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</div>
                                <div class="channel-meta-badges">
                                    <span class="badge-platform ${platformClass}">
                                        ${platformSvg}
                                        <span>${c.platform}</span>
                                    </span>
                                    <span class="badge-format-pill">${c.format || '16:9'}</span>
                                </div>
                            </div>
                        </div>

                        <div class="channel-stats-row">
                            <span>Vidéos publiées</span>
                            <b>${c.videoCount || 0} vidéo${(c.videoCount || 0) > 1 ? 's' : ''}</b>
                        </div>

                        <div class="channel-actions-row" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                            <!-- BOUTON PARAMÈTRES DE LA CHAÎNE -->
                            <button type="button" class="btn-card-action" onclick="event.stopPropagation(); openChannelSettingsModal('${c.id}')" style="flex: 1; justify-content: center;" title="Accéder aux paramètres et Brand Kit de la chaîne">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 13px; height: 13px;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                <span>Paramètres</span>
                            </button>

                            <!-- BOUTON SUPPRIMER RETRÉCI ET COMPACT -->
                            <button type="button" class="btn-card-delete-compact" title="Supprimer la chaîne" onclick="event.stopPropagation(); confirmDeleteChannel('${c.id}', '${escapeJs(c.name)}')">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function filterPlatformChannels(platform, btn) {
            currentPlatformFilter = platform;
            document.querySelectorAll('.channel-filter-pill').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
            renderChannelsView();
        }

        function openAddChannelModal() {
            document.getElementById('newChannelNameInput').value = '';
            document.getElementById('newChannelPlatformInput').value = currentPlatformFilter === 'all' || currentPlatformFilter === 'standalone' ? 'YouTube' : currentPlatformFilter;
            handleNewChannelPlatformChange(document.getElementById('newChannelPlatformInput').value);
            document.getElementById('addChannelModal').classList.add('open');
        }

        function closeAddChannelModal() {
            document.getElementById('addChannelModal').classList.remove('open');
        }

        function handleNewChannelPlatformChange(platform) {
            const fmt = document.getElementById('newChannelFormatInput');
            if (platform === 'TikTok') fmt.value = '9:16';
            else if (platform === 'Instagram') fmt.value = '1:1';
            else fmt.value = '16:9';
        }

        let newChannelAvatarBase64 = null;
        function handleNewChannelAvatarFile(input) {
            if (!input.files || !input.files[0]) return;
            const file = input.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                newChannelAvatarBase64 = e.target.result;
                const prev = document.getElementById('newChannelAvatarPreview');
                prev.innerHTML = '';
                prev.style.backgroundImage = `url('${newChannelAvatarBase64}')`;
            };
            reader.readAsDataURL(file);
        }

        async function submitCreateChannel() {
            const name = document.getElementById('newChannelNameInput').value.trim();
            if (!name) {
                showToast('Veuillez entrer un nom de chaîne', '⚠️');
                return;
            }
            const platform = document.getElementById('newChannelPlatformInput').value;
            const format = document.getElementById('newChannelFormatInput').value;

            const newChannel = {
                id: 'ch_' + Date.now(),
                name: name,
                platform: platform,
                format: format,
                avatar: newChannelAvatarBase64 || '',
                videoCount: 0
            };

            try {
                const res = await fetch('/api/channels', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newChannel)
                });
                if (res.ok) {
                    const saved = await res.json();
                    channelsCache.unshift(saved.channel || newChannel);
                } else {
                    channelsCache.unshift(newChannel);
                }
            } catch (e) {
                channelsCache.unshift(newChannel);
            }

            closeAddChannelModal();
            showToast(`Chaîne "${name}" créée avec succès !`);
            updateSidebarCounters();
            renderChannelsView();
        }

        function confirmDeleteChannel(id, name) {
            channelToDeleteId = id;
            document.getElementById('deleteConfirmText').innerHTML = `Voulez-vous vraiment supprimer définitivement la chaîne <strong style="color:#ffffff;">"${name}"</strong> ?`;
            document.getElementById('confirmDeleteModal').classList.add('open');
        }

        function closeConfirmDeleteModal() {
            document.getElementById('confirmDeleteModal').classList.remove('open');
            channelToDeleteId = null;
        }

        async function executeDeleteChannel() {
            if (!channelToDeleteId) return;
            try {
                await fetch(`/api/channels?id=${channelToDeleteId}`, { method: 'DELETE' });
            } catch (e) {}

            channelsCache = channelsCache.filter(c => c.id !== channelToDeleteId);
            try { localStorage.setItem(SNAPSHOT_KEY_CHANNELS, JSON.stringify(channelsCache)); } catch(e) {}
            closeConfirmDeleteModal();
            showToast('Chaîne supprimée');
            updateSidebarCounters();
            renderChannelsView();
        }

        function triggerChangeChannelAvatar(id) {
            openChannelSettingsModal(id);
        }

        // =====================================================================
        // SECTION MONTAGE CLIENTS (TRANSPOSITION COMPLÈTE DE MONTEUR.HTML)
        // =====================================================================
        function formatClientAvatarSrc(url) {
            if (!url) return '';
            const trimmed = String(url).trim();
            if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:')) {
                return trimmed;
            }
            return `../${trimmed.replace(/^\.\.\//, '')}`;
        }

        function renderClientsView() {
            const circleContainer = document.getElementById('clientsCircleContainer');
            document.getElementById('clientsCountSpan').textContent = clientsCache.length;

            if (clientsCache.length === 0) {
                circleContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12px; padding: 12px 0;">Aucun client configuré. Créez-en un via le bouton ci-dessus.</div>';
                document.getElementById('selectedClientWorkspace').style.display = 'none';
                return;
            }

            document.getElementById('selectedClientWorkspace').style.display = 'flex';

            circleContainer.innerHTML = clientsCache.map(cl => {
                const isActive = activeClient && activeClient.name === cl.name;
                const avatarSrc = formatClientAvatarSrc(cl.avatarUrl);
                const fallbackChar = cl.name ? cl.name.charAt(0).toUpperCase() : 'C';

                return `
                    <button type="button" class="client-circle-item ${isActive ? 'active' : ''}" onclick="selectActiveClient('${cl.name}')">
                        <div class="client-avatar-ring">
                            ${avatarSrc ? `<img src="${avatarSrc}" alt="${cl.name}" onerror="this.onerror=null; this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">` : ''}
                            <div class="avatar-letter" style="${avatarSrc ? 'display:none;' : ''}">${fallbackChar}</div>
                            <span class="client-circle-count">${getClientTotalFilesCount(cl)}</span>
                        </div>
                        <span class="client-circle-name" title="${escapeHtml(cl.name)}">${escapeHtml(cl.name)}</span>
                    </button>
                `;
            }).join('');

            renderActiveClientWorkspace();
        }

        function getClientTotalFilesCount(cl) {
            if (!cl.categories) return 0;
            return Object.values(cl.categories).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
        }

        function selectActiveClient(name) {
            const found = clientsCache.find(c => c.name === name);
            if (found) {
                activeClient = found;
                try { localStorage.setItem(SNAPSHOT_KEY_ACTIVE_CLIENT, name); } catch(e) {}
                renderClientsView();
            }
        }

        function renderActiveClientWorkspace() {
            if (!activeClient) return;

            document.getElementById('activeClientName').textContent = activeClient.name;
            document.getElementById('activeClientFolderPath').textContent = `Clients/${activeClient.name}/`;

            const imgEl = document.getElementById('activeClientAvatarImg');
            const fallbackEl = document.getElementById('activeClientAvatarFallback');
            const activeAvatarSrc = formatClientAvatarSrc(activeClient.avatarUrl);

            if (activeAvatarSrc) {
                imgEl.src = activeAvatarSrc;
                imgEl.style.display = 'block';
                fallbackEl.style.display = 'none';
                imgEl.onerror = () => {
                    imgEl.onerror = null;
                    imgEl.style.display = 'none';
                    fallbackEl.style.display = 'flex';
                    fallbackEl.textContent = activeClient.name.charAt(0).toUpperCase();
                };
            } else {
                imgEl.style.display = 'none';
                fallbackEl.style.display = 'flex';
                fallbackEl.textContent = activeClient.name.charAt(0).toUpperCase();
            }

            // Mise à jour des compteurs et listes de catégories
            const cats = ['images_references', 'videos_references', 'clips_video', 'voix_off', 'musiques', 'effets_sonores', 'images_illustrations', 'skills'];
            cats.forEach(cat => {
                const files = (activeClient.categories && activeClient.categories[cat]) || [];
                const countBadge = document.getElementById('count-' + cat);
                if (countBadge) countBadge.textContent = files.length;

                const listEl = document.getElementById('list-' + cat);
                if (listEl) {
                    if (files.length === 0) {
                        listEl.innerHTML = `<div style="font-size: 11px; color: var(--text-muted); font-style: italic; padding: 4px;">Aucun fichier.</div>`;
                    } else {
                        listEl.innerHTML = files.map(f => `
                            <div class="file-item-row">
                                <div class="file-item-left" onclick="previewClientFile('${f.url}', '${escapeJs(f.name)}')">
                                    <span class="file-item-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
                                    <span class="file-item-size">${f.sizeStr || ''}</span>
                                </div>
                                <div class="file-item-actions">
                                    <button type="button" class="btn-card-icon" style="width: 24px; height: 24px;" onclick="previewClientFile('${f.url}', '${escapeJs(f.name)}')">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                    </button>
                                    <button type="button" class="btn-card-icon" style="width: 24px; height: 24px; color: #f87171;" onclick="deleteClientAsset('${cat}', '${escapeJs(f.name)}')">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        `).join('');
                    }
                }
            });

            // Résumé prompt
            document.getElementById('sumClips').textContent = (activeClient.categories && activeClient.categories.clips_video ? activeClient.categories.clips_video.length : 0);
            document.getElementById('sumVoice').textContent = (activeClient.categories && activeClient.categories.voix_off ? activeClient.categories.voix_off.length : 0);
            document.getElementById('sumMusic').textContent = (activeClient.categories && activeClient.categories.musiques ? activeClient.categories.musiques.length : 0);
            document.getElementById('sumSfx').textContent = (activeClient.categories && activeClient.categories.effets_sonores ? activeClient.categories.effets_sonores.length : 0);
            document.getElementById('sumImg').textContent = (activeClient.categories && activeClient.categories.images_illustrations ? activeClient.categories.images_illustrations.length : 0);
            document.getElementById('sumRef').textContent = (activeClient.categories && activeClient.categories.images_references ? activeClient.categories.images_references.length : 0);
        }

        function setClientVideoFormat(fmt, btn) {
            clientCurrentFormat = fmt;
            document.querySelectorAll('#clientPromptContainer .format-pill').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
        }

        function submitClientVideoCreation() {
            if (!activeClient) return;
            const prompt = document.getElementById('clientVideoPromptText').value.trim();
            const targetUrl = `create_video.html?client=${encodeURIComponent(activeClient.name)}&format=${encodeURIComponent(clientCurrentFormat)}&prompt=${encodeURIComponent(prompt)}`;
            window.location.href = targetUrl;
        }

        function triggerClientCategoryUpload(cat) {
            const input = document.getElementById('upload-' + cat);
            if (input) input.click();
        }

        async function handleCategoryFileSelect(cat, event) {
            const files = event.target.files;
            if (!files || files.length === 0 || !activeClient) return;

            if (!activeClient.categories) activeClient.categories = {};
            if (!activeClient.categories[cat]) activeClient.categories[cat] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const base64Data = await new Promise(r => {
                    const reader = new FileReader();
                    reader.onload = e => r(e.target.result.split(',')[1]);
                    reader.readAsDataURL(file);
                });

                try {
                    await fetch('/api/clients/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ client: activeClient.name, category: cat, filename: file.name, data: base64Data })
                    });
                } catch (e) {}

                activeClient.categories[cat].push({
                    name: file.name,
                    sizeStr: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
                    url: `../Clients/${activeClient.name}/${cat}/${file.name}`
                });
            }

            showToast(`${files.length} fichier(s) importé(s) dans ${cat}`);
            renderActiveClientWorkspace();
            event.target.value = '';
        }

        async function deleteClientAsset(cat, filename) {
            if (!activeClient) return;
            try {
                await fetch('/api/clients/delete-asset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ client: activeClient.name, category: cat, filename: filename })
                });
            } catch (e) {}

            if (activeClient.categories && activeClient.categories[cat]) {
                activeClient.categories[cat] = activeClient.categories[cat].filter(f => f.name !== filename);
            }
            renderActiveClientWorkspace();
            showToast(`Fichier "${filename}" supprimé`, '🗑️');
        }

        function openCreateClientModal() {
            document.getElementById('newClientNameInput').value = '';
            document.getElementById('createClientModal').classList.add('open');
        }

        function closeCreateClientModal() {
            document.getElementById('createClientModal').classList.remove('open');
        }

        let newClientAvatarBase64 = null;
        function handleNewClientAvatarFile(input) {
            if (!input.files || !input.files[0]) return;
            const file = input.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                newClientAvatarBase64 = e.target.result;
                const prev = document.getElementById('newClientAvatarPreview');
                if (prev) {
                    prev.innerHTML = '';
                    prev.style.backgroundImage = `url('${newClientAvatarBase64}')`;
                }
            };
            reader.readAsDataURL(file);
        }

        async function submitCreateClient() {
            const name = document.getElementById('newClientNameInput').value.trim();
            if (!name) {
                showToast('Veuillez entrer un nom de client', '⚠️');
                return;
            }

            const avatarToSend = newClientAvatarBase64 || '';
            let serverAvatarUrl = '';

            try {
                const res = await fetch('/api/clients/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name, client: name, avatar: avatarToSend })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.client && data.client.avatarUrl) {
                        serverAvatarUrl = data.client.avatarUrl;
                    }
                }
            } catch (e) {}

            const newCl = {
                name: name,
                avatarUrl: serverAvatarUrl || avatarToSend || '',
                categories: {
                    images_references: [],
                    videos_references: [],
                    clips_video: [],
                    voix_off: [],
                    musiques: [],
                    effets_sonores: [],
                    images_illustrations: [],
                    skills: []
                }
            };

            clientsCache.push(newCl);
            activeClient = newCl;
            try {
                localStorage.setItem(SNAPSHOT_KEY_CLIENTS, JSON.stringify(clientsCache));
                localStorage.setItem(SNAPSHOT_KEY_ACTIVE_CLIENT, newCl.name);
            } catch(e) {}

            // Nettoyage de l'input et du preview d'avatar
            newClientAvatarBase64 = null;
            const prev = document.getElementById('newClientAvatarPreview');
            if (prev) {
                prev.innerHTML = '+';
                prev.style.backgroundImage = 'none';
            }

            closeCreateClientModal();
            showToast(`Client "${name}" créé !`);
            updateSidebarCounters();
            renderClientsView();
        }

        function openRenameClientModal() {
            if (!activeClient) return;
            document.getElementById('renameClientInput').value = activeClient.name;
            document.getElementById('renameClientModal').classList.add('open');
        }

        function closeRenameClientModal() {
            document.getElementById('renameClientModal').classList.remove('open');
        }

        async function submitRenameClient() {
            const newName = document.getElementById('renameClientInput').value.trim();
            if (!newName || !activeClient) return;
            const oldName = activeClient.name;
            try {
                await fetch('/api/clients/rename', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ client: oldName, newName: newName })
                });
            } catch (e) {}

            activeClient.name = newName;
            try {
                localStorage.setItem(SNAPSHOT_KEY_CLIENTS, JSON.stringify(clientsCache));
                localStorage.setItem(SNAPSHOT_KEY_ACTIVE_CLIENT, newName);
            } catch(e) {}
            closeRenameClientModal();
            showToast(`Client renommé en "${newName}"`);
            renderClientsView();
        }

        function openDeleteClientModal() {
            if (!activeClient) return;
            const msgEl = document.getElementById('deleteClientMsg');
            if (msgEl) {
                msgEl.textContent = `Voulez-vous vraiment supprimer définitivement le client "${activeClient.name}" et tous ses fichiers ?`;
            }
            document.getElementById('deleteClientModal').classList.add('open');
        }

        function closeDeleteClientModal() {
            document.getElementById('deleteClientModal').classList.remove('open');
        }

        async function submitDeleteClient() {
            if (!activeClient) return;
            const toDel = activeClient.name;
            try {
                await fetch('/api/clients/delete-client', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ client: toDel, name: toDel })
                });
            } catch (e) {}

            clientsCache = clientsCache.filter(c => c.name !== toDel && c.name.toLowerCase() !== toDel.toLowerCase());
            activeClient = clientsCache[0] || null;
            try {
                localStorage.setItem(SNAPSHOT_KEY_CLIENTS, JSON.stringify(clientsCache));
                localStorage.setItem(SNAPSHOT_KEY_ACTIVE_CLIENT, activeClient ? activeClient.name : '');
            } catch(e) {}
            closeDeleteClientModal();
            showToast(`Client "${toDel}" supprimé`);
            updateSidebarCounters();
            renderClientsView();
        }

        function openGlobalSkillsModal() {
            document.getElementById('globalSkillsModal').classList.add('open');
            fetchGlobalSkills();
        }

        function closeGlobalSkillsModal() {
            document.getElementById('globalSkillsModal').classList.remove('open');
        }

        async function fetchGlobalSkills() {
            try {
                const res = await fetch('/api/skills/monteur');
                if (res.ok) {
                    const d = await res.json();
                    if (d.files) globalSkillsCache = d.files;
                }
            } catch (e) {}

            // Base vide si aucun skill n'a été expressément téléversé par l'utilisateur
            // (Pas de mock files forcés)
            document.getElementById('headerSkillsBadge').textContent = globalSkillsCache.length;
            const listBox = document.getElementById('globalSkillsListBox');

            if (globalSkillsCache.length === 0) {
                listBox.innerHTML = '<div style="padding: 28px; text-align: center; color: var(--text-muted); font-size: 12px; font-style: italic;">Aucun skill de montage pour ce client. Déposez vos directives au format .md ou .txt.</div>';
                return;
            }

            listBox.innerHTML = globalSkillsCache.map((s, index) => `
                <div class="file-item-row" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 6px; margin-bottom: 6px;">
                    <div class="file-item-left" style="display: flex; align-items: center; gap: 8px; min-width: 0;" onclick="showToast('Directive: ' + '${escapeJs(s.name)}')">
                        <span style="font-size: 14px;">📘</span>
                        <span class="file-item-name" style="font-size: 12.5px; font-weight: 600; color: #ffffff;">${escapeHtml(s.name)}</span>
                        <span class="file-item-size" style="font-size: 11px; color: var(--text-muted);">${s.sizeStr || s.size || ''}</span>
                    </div>
                    <button type="button" class="btn-card-delete-compact" onclick="deleteGlobalSkill(${index})" title="Supprimer ce skill">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 12px; height: 12px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `).join('');
        }

        function deleteGlobalSkill(index) {
            const removed = globalSkillsCache.splice(index, 1);
            document.getElementById('headerSkillsBadge').textContent = globalSkillsCache.length;
            fetchGlobalSkills();
            showToast('Skill supprimé : ' + (removed[0] ? removed[0].name : ''));
        }

        function toggleClientScriptBlock(checked) {
            const wrapper = document.getElementById('clientScriptCollapsibleWrapper');
            if (wrapper) {
                if (checked) {
                    wrapper.style.display = 'block';
                    void wrapper.offsetHeight;
                    wrapper.classList.add('open');
                } else {
                    wrapper.classList.remove('open');
                    setTimeout(() => {
                        if (!wrapper.classList.contains('open')) {
                            wrapper.style.display = 'none';
                        }
                    }, 400);
                }
            }
        }

        function handleUploadGlobalSkill(e) {
            showToast('Guide skill importé');
        }

        // =====================================================================
        // SECTION MÉDIATHÈQUE ASSETS (18 DOSSIERS, CADRAGE & MINIATURES VIDÉO)
        // =====================================================================
        let assetToDeleteUrl = null;
        let assetToDeleteName = '';

        function promptDeleteAsset(url, name) {
            assetToDeleteUrl = url;
            assetToDeleteName = name;
            const msgEl = document.getElementById('deleteAssetMsg');
            if (msgEl) {
                msgEl.innerHTML = `Voulez-vous vraiment supprimer définitivement le fichier <strong>"${escapeHtml(name)}"</strong> ? Cette action est irréversible.`;
            }
            const modal = document.getElementById('deleteAssetModal');
            if (modal) modal.classList.add('open');
        }

        function closeDeleteAssetModal() {
            const modal = document.getElementById('deleteAssetModal');
            if (modal) modal.classList.remove('open');
            assetToDeleteUrl = null;
            assetToDeleteName = '';
        }

        function submitDeleteAsset() {
            if (!assetToDeleteUrl) return;
            const deletedName = assetToDeleteName;
            assetsCatalogList = assetsCatalogList.filter(a => a.url !== assetToDeleteUrl && a.name !== assetToDeleteName);
            updateSidebarCounters();
            renderAssetsView();
            closeDeleteAssetModal();
            showToast(`Asset "${deletedName}" supprimé avec succès`);
        }

        // --- OPTIMISATIONS HAUTE PERFORMANCE DU MODULE ASSETS (PAGINATION, LAZY LOADING, ZERO LAG) ---
        let assetPageSize = 24;
        let assetCurrentDisplayCount = 24;
        let assetInfiniteScrollBound = false;
        let isAssetScrollTicking = false;
        let currentFilteredAssetsList = [];

        function renderAssetCardItemHtml(item) {
            let previewHtml = '';

            if (item.type === 'Videos') {
                // MINIATURE VIDÉO OPTIMISÉE SANS DÉCODEUR ACTIF (0ms de freeze, s'anime au survol)
                previewHtml = `
                    <div class="asset-video-thumb-container" onmouseenter="startAssetVideoHover(this, '${escapeJs(item.url)}')" onmouseleave="stopAssetVideoHover(this)">
                        <div class="asset-video-placeholder">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width: 28px; height: 28px; color: #a1a1aa;"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
                        </div>
                        <div class="video-play-center-badge">
                            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        </div>
                    </div>
                `;
            } else if (item.type === 'Images' || item.type === 'Vectors') {
                // IMAGE AVEC LAZY LOADING ET DÉCODAGE ASYNCHRONE (chargement fluide 60fps)
                previewHtml = `<img src="${item.url}" alt="${escapeHtml(item.name)}" loading="lazy" decoding="async">`;
            } else {
                // AUDIO AVEC NOTE MUSICALE
                previewHtml = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 32px; height: 32px; color: #ffffff;"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                        <span style="font-size: 10px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;">Audio Preview</span>
                    </div>
                `;
            }

            return `
                <div class="asset-card" onclick="openAssetPreviewModal('${escapeJs(item.url)}', '${escapeJs(item.name)}', '${item.type}', '${item.subfolder}')">
                    <div class="asset-card-preview">
                        <span class="asset-badge-type">${item.subfolder || item.type}</span>
                        <button type="button" class="asset-card-delete-btn" onclick="event.stopPropagation(); promptDeleteAsset('${escapeJs(item.url)}', '${escapeJs(item.name)}')" title="Supprimer cet asset">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                        ${previewHtml}
                    </div>
                    <div class="asset-card-body">
                        <div class="asset-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
                        <div class="asset-meta-row">
                            <span>${item.subfolder}</span>
                            <span>${item.size || ''}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        function getLoadMoreBtnHtml(totalCount, displayedCount) {
            if (totalCount <= displayedCount) return '';
            const remaining = totalCount - displayedCount;
            return `
                <div id="assetLoadMoreContainer" style="grid-column: 1 / -1; display: flex; justify-content: center; padding: 24px 0 20px 0;">
                    <button type="button" class="btn-load-more-assets" id="btnLoadMoreAssets" onclick="loadMoreAssets()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        <span>Afficher plus d'assets (${Math.min(assetPageSize, remaining)} de plus / ${totalCount} au total)</span>
                    </button>
                </div>
            `;
        }

        function startAssetVideoHover(container, url) {
            if (!container || container.querySelector('video')) return;
            const vid = document.createElement('video');
            vid.src = url + '#t=0.5';
            vid.muted = true;
            vid.playsInline = true;
            vid.preload = 'auto';
            vid.style.width = '100%';
            vid.style.height = '100%';
            vid.style.objectFit = 'contain';
            vid.style.position = 'absolute';
            vid.style.inset = '0';
            vid.style.zIndex = '2';
            vid.oncanplay = () => vid.play().catch(() => {});
            container.appendChild(vid);
        }

        function stopAssetVideoHover(container) {
            if (!container) return;
            const vid = container.querySelector('video');
            if (vid) {
                vid.pause();
                vid.src = '';
                vid.remove();
            }
        }

        function loadMoreAssets() {
            const grid = document.getElementById('assetsCatalogGrid');
            if (!grid) return;
            const totalCount = currentFilteredAssetsList.length;
            if (assetCurrentDisplayCount >= totalCount) return;

            const nextSlice = currentFilteredAssetsList.slice(assetCurrentDisplayCount, assetCurrentDisplayCount + assetPageSize);
            assetCurrentDisplayCount += nextSlice.length;

            const newCardsHtml = nextSlice.map(item => renderAssetCardItemHtml(item)).join('');
            const loadMoreBtnHtml = getLoadMoreBtnHtml(totalCount, assetCurrentDisplayCount);

            const oldContainer = document.getElementById('assetLoadMoreContainer');
            if (oldContainer) {
                oldContainer.remove();
            }

            grid.insertAdjacentHTML('beforeend', newCardsHtml + loadMoreBtnHtml);
        }

        function setupAssetInfiniteScroll() {
            if (assetInfiniteScrollBound) return;
            const mainEl = document.querySelector('main.app-main');
            if (!mainEl) return;
            mainEl.addEventListener('scroll', () => {
                if (currentView !== 'assets' || isAssetScrollTicking) return;
                isAssetScrollTicking = true;
                requestAnimationFrame(() => {
                    isAssetScrollTicking = false;
                    const scrollBottom = mainEl.scrollHeight - mainEl.scrollTop - mainEl.clientHeight;
                    if (scrollBottom < 450) {
                        const btn = document.getElementById('btnLoadMoreAssets');
                        if (btn && btn.style.display !== 'none' && !btn.dataset.loading) {
                            btn.dataset.loading = 'true';
                            loadMoreAssets();
                        }
                    }
                });
            }, { passive: true });
            assetInfiniteScrollBound = true;
        }

        function renderAssetsView(customList) {
            const grid = document.getElementById('assetsCatalogGrid');
            if (!grid) return;
            setupAssetInfiniteScroll();

            // Filtrage par type et sous-dossier (ou liste personnalisée filtrée)
            let filtered = customList ? customList.slice() : assetsCatalogList.filter(item => {
                if (assetCategoryFilter !== 'all' && item.type !== assetCategoryFilter) return false;
                if (assetSubfolderFilter !== 'all' && item.subfolder !== assetSubfolderFilter) return false;
                return true;
            });

            // Tri par date du plus récent au plus ancien
            filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            currentFilteredAssetsList = filtered;

            // Compteurs de types
            document.getElementById('assetCounterAll').textContent = assetsCatalogList.length;
            document.getElementById('assetCounterImages').textContent = assetsCatalogList.filter(a => a.type === 'Images').length;
            document.getElementById('assetCounterVideos').textContent = assetsCatalogList.filter(a => a.type === 'Videos').length;
            document.getElementById('assetCounterAudios').textContent = assetsCatalogList.filter(a => a.type === 'Audios').length;
            document.getElementById('assetCounterVectors').textContent = assetsCatalogList.filter(a => a.type === 'Vectors').length;

            if (filtered.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--text-muted);">Aucun asset trouvé dans ce sous-dossier.</div>';
                return;
            }

            const totalCount = filtered.length;
            const visible = filtered.slice(0, assetCurrentDisplayCount);

            const cardsHtml = visible.map(item => renderAssetCardItemHtml(item)).join('');
            const loadMoreHtml = getLoadMoreBtnHtml(totalCount, assetCurrentDisplayCount);

            grid.innerHTML = cardsHtml + loadMoreHtml;
        }

        function filterAssetType(type, btn) {
            assetCurrentDisplayCount = assetPageSize;
            assetCategoryFilter = type;
            document.querySelectorAll('#viewAssets .channel-filter-pill').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
            renderAssetsView();
        }

        function filterAssetSubfolder(sub, btn) {
            assetCurrentDisplayCount = assetPageSize;
            assetSubfolderFilter = sub;
            document.querySelectorAll('.subfolder-chip').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
            renderAssetsView();
        }

        function openAssetPreviewModal(url, name, type, subfolder) {
            if (type === 'Images' || type === 'Vectors') {
                openAssetImageModal(url, name, subfolder);
            } else if (type === 'Audios') {
                openAssetAudioModal(url, name, subfolder);
            } else if (type === 'Videos') {
                openGrandVideoPlayer(url, name, '16:9', '15s');
            } else {
                showToast(`Asset: ${name}`);
            }
        }

        function previewClientFile(url, name) {
            const ext = name.split('.').pop().toLowerCase();
            if (['mp4', 'mov', 'webm'].includes(ext)) {
                openGrandVideoPlayer(url, name, '16:9', '15s');
            } else if (['mp3', 'wav', 'm4a', 'ogg'].includes(ext)) {
                openAssetAudioModal(url, name, 'Client');
            } else if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
                openAssetImageModal(url, name, 'Client');
            } else {
                showToast(`Fichier: ${name}`);
            }
        }

        // A. LIGHTBOX IMAGE (CADRAGE COMPLET SANS COUPURE)
        let currentModalImagePath = '';
        function openAssetImageModal(url, name, subfolder) {
            currentModalImagePath = url;
            document.getElementById('imageModalFileName').textContent = name;
            document.getElementById('imageModalImg').src = url;
            document.getElementById('imageModalMeta').textContent = `Dossier: 01_Assets/${subfolder || ''} • ${url.replace(/^\.\.\//, '')}`;
            document.getElementById('imageModalDownloadLink').href = url;
            document.getElementById('imageModalDownloadLink').download = name;
            document.getElementById('assetImageModal').classList.add('open');
        }

        function closeAssetImageModal() {
            document.getElementById('assetImageModal').classList.remove('open');
        }

        function copyAssetImagePath() {
            if (!currentModalImagePath) return;
            const clean = currentModalImagePath.replace(/^\.\.\//, '');
            navigator.clipboard.writeText(clean);
            showToast(`Chemin "${clean}" copié !`);
        }

        // B. LECTEUR AUDIO DÉDIÉ (CURSEUR, MINUTAGE, DISQUE VINYLE)
        let isAudioPlaying = false;
        let audioProgressTimer = null;
        let currentModalAudioPath = '';

        function openAssetAudioModal(url, name, subfolder) {
            currentModalAudioPath = url;
            const audioEl = document.getElementById('globalModalAudioEl');
            document.getElementById('audioModalTrackName').textContent = name;
            document.getElementById('audioModalTrackPath').textContent = url.replace(/^\.\.\//, '');

            audioEl.src = url;
            audioEl.currentTime = 0;
            document.getElementById('assetAudioModal').classList.add('open');

            audioEl.play().then(() => {
                isAudioPlaying = true;
                updateAudioPlayUi(true);
            }).catch(() => {
                isAudioPlaying = false;
                updateAudioPlayUi(false);
            });

            audioEl.ontimeupdate = () => {
                if (audioEl.duration) {
                    const pct = (audioEl.currentTime / audioEl.duration) * 100;
                    document.getElementById('audioModalScrubber').value = pct;
                    document.getElementById('audioModalCurrentTime').textContent = formatTime(audioEl.currentTime);
                    document.getElementById('audioModalDuration').textContent = formatTime(audioEl.duration);
                }
            };

            audioEl.onended = () => {
                isAudioPlaying = false;
                updateAudioPlayUi(false);
            };
        }

        function closeAssetAudioModal() {
            const audioEl = document.getElementById('globalModalAudioEl');
            audioEl.pause();
            isAudioPlaying = false;
            updateAudioPlayUi(false);
            document.getElementById('assetAudioModal').classList.remove('open');
        }

        function toggleAudioPlayback() {
            const audioEl = document.getElementById('globalModalAudioEl');
            if (audioEl.paused) {
                audioEl.play();
                isAudioPlaying = true;
                updateAudioPlayUi(true);
            } else {
                audioEl.pause();
                isAudioPlaying = false;
                updateAudioPlayUi(false);
            }
        }

        function updateAudioPlayUi(playing) {
            const disc = document.getElementById('audioVinylDisc');
            const playIcon = document.getElementById('audioIconPlay');
            const pauseIcon = document.getElementById('audioIconPause');
            if (playing) {
                disc.classList.add('spinning');
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'block';
            } else {
                disc.classList.remove('spinning');
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
            }
        }

        function handleAudioScrub(val) {
            const audioEl = document.getElementById('globalModalAudioEl');
            if (audioEl.duration) {
                audioEl.currentTime = (val / 100) * audioEl.duration;
            }
        }

        function seekAudioRelative(sec) {
            const audioEl = document.getElementById('globalModalAudioEl');
            audioEl.currentTime = Math.max(0, Math.min(audioEl.duration || 0, audioEl.currentTime + sec));
        }

        function setAudioVolume(vol) {
            document.getElementById('globalModalAudioEl').volume = parseFloat(vol);
        }

        function copyAssetAudioPath() {
            if (!currentModalAudioPath) return;
            const clean = currentModalAudioPath.replace(/^\.\.\//, '');
            navigator.clipboard.writeText(clean);
            showToast(`Chemin "${clean}" copié !`);
        }

        function formatTime(sec) {
            if (isNaN(sec) || sec < 0) return '00:00';
            const m = Math.floor(sec / 60);
            const s = Math.floor(sec % 60);
            return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
        }

        // =====================================================================
        // C. GRAND PLAYER VIDÉO IMMERSIF (COMMUNICATION DIRECTE AVEC COMPOSITIONS)
        // =====================================================================
        let compositionTimer = null;
        let compositionDurationSec = 15;
        let compositionCurrentSec = 0;
        let isCompositionPlaying = false;
        let isCompositionMuted = false;
        let currentCompositionSrc = '';
        let currentCompositionNativeW = 1920;
        let currentCompositionNativeH = 1080;

        function adaptGrandPlayerIframeScale() {
            const wrapper = document.getElementById('grandPlayerIframeWrapper');
            const viewport = document.getElementById('grandPlayerIframeViewport');
            const iframeEl = document.getElementById('grandPlayerIframeEl');
            const playerBar = document.getElementById('compositionPlayerBar');
            const container = document.getElementById('grandPlayerContainer');

            if (!wrapper || !viewport || !iframeEl) return;
            if (wrapper.style.display === 'none') return;

            const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || container?.classList.contains('is-fullscreen'));

            const nativeW = currentCompositionNativeW || 1920;
            const nativeH = currentCompositionNativeH || 1080;

            let availW = 0;
            let availH = 0;

            if (isFullscreen) {
                availW = window.innerWidth;
                availH = window.innerHeight;
            } else {
                const wrapRect = wrapper.getBoundingClientRect();
                const contRect = container ? container.getBoundingClientRect() : null;
                const barRect = playerBar ? playerBar.getBoundingClientRect() : null;
                const barH = (barRect && barRect.height > 0) ? (barRect.height + 16) : 56;

                if (wrapRect && wrapRect.width > 50) {
                    availW = wrapRect.width;
                } else if (contRect && contRect.width > 50) {
                    availW = contRect.width - 32;
                } else {
                    availW = Math.min(1040, window.innerWidth * 0.88);
                }

                if (wrapRect && wrapRect.height > 50) {
                    availH = wrapRect.height;
                } else if (contRect && contRect.height > 50) {
                    availH = contRect.height - barH - 16;
                } else {
                    availH = Math.min(600, window.innerHeight * 0.62);
                }
            }

            availW = Math.max(160, availW);
            availH = Math.max(120, availH);

            // Facteur d'échelle exact garantissant un cadrage 100% complet sans coupure ni déformation
            const scale = Math.min(availW / nativeW, availH / nativeH);

            // Dimensions de la boîte de cadrage (exactes sans aucune bande parasite)
            const finalW = Math.round(nativeW * scale);
            const finalH = Math.round(nativeH * scale);

            viewport.style.width = `${finalW}px`;
            viewport.style.height = `${finalH}px`;
            viewport.style.maxWidth = '100vw';
            viewport.style.maxHeight = '100vh';

            // L'iframe interne a la résolution NATIVE EXACTE du contenu (1920x1080, 1080x1920, etc.)
            iframeEl.style.width = `${nativeW}px`;
            iframeEl.style.height = `${nativeH}px`;
            iframeEl.style.transform = `scale(${scale})`;
            iframeEl.style.transformOrigin = '0 0';
            iframeEl.style.position = 'absolute';
            iframeEl.style.top = '0';
            iframeEl.style.left = '0';

            // En mode modal, la barre de contrôle s'adapte élégamment à la largeur de la vidéo
            if (playerBar && !isFullscreen) {
                const barMaxW = Math.max(340, Math.min(1040, finalW));
                playerBar.style.maxWidth = `${barMaxW}px`;
            }
        }

        function applyPlayerFormat(fmt) {
            const rawFmt = (fmt || '16:9').trim();
            let normalizedFmt = '16:9';
            if (rawFmt === '9:16' || rawFmt === 'vertical' || rawFmt === '9/16') {
                normalizedFmt = '9:16';
            } else if (rawFmt === '1:1' || rawFmt === 'carre' || rawFmt === 'square' || rawFmt === '1/1') {
                normalizedFmt = '1:1';
            } else {
                normalizedFmt = '16:9';
            }

            const pillEl = document.getElementById('grandPlayerFormatPill');
            if (pillEl) pillEl.textContent = normalizedFmt;

            const dialog = document.querySelector('.video-player-modal-dialog');
            const videoEl = document.getElementById('grandPlayerVideoEl');
            const playerBar = document.getElementById('compositionPlayerBar');
            const container = document.getElementById('grandPlayerContainer');

            const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || container?.classList.contains('is-fullscreen'));

            if (normalizedFmt === '9:16') {
                if (dialog && !isFullscreen) dialog.style.maxWidth = '480px';
                if (videoEl) {
                    videoEl.style.aspectRatio = '9 / 16';
                    videoEl.style.maxWidth = isFullscreen ? '100vw' : '380px';
                    videoEl.style.maxHeight = isFullscreen ? '100vh' : '72vh';
                }
                if (playerBar && !isFullscreen) playerBar.style.maxWidth = '380px';
            } else if (normalizedFmt === '1:1') {
                if (dialog && !isFullscreen) dialog.style.maxWidth = '720px';
                if (videoEl) {
                    videoEl.style.aspectRatio = '1 / 1';
                    videoEl.style.maxWidth = isFullscreen ? '100vw' : '560px';
                    videoEl.style.maxHeight = isFullscreen ? '100vh' : '68vh';
                }
                if (playerBar && !isFullscreen) playerBar.style.maxWidth = '560px';
            } else {
                // 16:9
                if (dialog && !isFullscreen) dialog.style.maxWidth = '1180px';
                if (videoEl) {
                    videoEl.style.aspectRatio = '16 / 9';
                    videoEl.style.maxWidth = isFullscreen ? '100vw' : '1040px';
                    videoEl.style.maxHeight = isFullscreen ? '100vh' : '68vh';
                }
                if (playerBar && !isFullscreen) playerBar.style.maxWidth = '1040px';
            }

            adaptGrandPlayerIframeScale();
        }

        function hookIframePlayback(iframeEl) {
            try {
                const win = iframeEl.contentWindow;
                const doc = iframeEl.contentDocument;
                if (!win || !doc) return;

                // Masquer les footers internes dupliqués
                const internalFooter = doc.getElementById('pageFooter');
                if (internalFooter) internalFooter.style.display = 'none';
                const internalViewport = doc.getElementById('viewport');
                if (internalViewport) {
                    internalViewport.style.height = '100%';
                    internalViewport.style.width = '100%';
                }
                if (typeof win.fitStage === 'function') {
                    try { win.fitStage(); } catch(e) {}
                }

                if (doc.documentElement) {
                    doc.documentElement.style.overflow = 'hidden';
                }
                if (doc.body) {
                    doc.body.style.margin = '0';
                    doc.body.style.padding = '0';
                    doc.body.style.overflow = 'hidden';
                    doc.body.style.background = '#000000';
                }

                // Détection universelle et dynamique de la résolution native du contenu
                let detectedW = 0;
                let detectedH = 0;

                // 1. Constantes globales dans la composition (WIDTH, HEIGHT, RENDER_WIDTH, etc.)
                if (typeof win.WIDTH === 'number' && win.WIDTH > 50 && typeof win.HEIGHT === 'number' && win.HEIGHT > 50) {
                    detectedW = win.WIDTH;
                    detectedH = win.HEIGHT;
                } else if (typeof win.RENDER_WIDTH === 'number' && win.RENDER_WIDTH > 50 && typeof win.RENDER_HEIGHT === 'number' && win.RENDER_HEIGHT > 50) {
                    detectedW = win.RENDER_WIDTH;
                    detectedH = win.RENDER_HEIGHT;
                }

                // 2. Balise Canvas (HTML5 Canvas direct)
                const canvas = doc.getElementById('mainCanvas') || doc.querySelector('canvas');
                if (!detectedW && canvas) {
                    const cw = parseInt(canvas.getAttribute('width') || canvas.width, 10);
                    const ch = parseInt(canvas.getAttribute('height') || canvas.height, 10);
                    if (cw > 50 && ch > 50) {
                        detectedW = cw;
                        detectedH = ch;
                    }
                }

                // 3. Élément Stage (#stage, .stage, [data-stage])
                const stage = doc.getElementById('stage') || doc.querySelector('.stage') || doc.querySelector('[data-stage]');
                if (!detectedW && stage) {
                    try {
                        const compStyle = win.getComputedStyle(stage);
                        const pw = parseFloat(compStyle.width);
                        const ph = parseFloat(compStyle.height);
                        if (pw > 50 && ph > 50) {
                            detectedW = pw;
                            detectedH = ph;
                        }
                    } catch(e) {}
                }

                // 4. Si détecté, appliquer la résolution native
                if (detectedW > 50 && detectedH > 50) {
                    currentCompositionNativeW = Math.round(detectedW);
                    currentCompositionNativeH = Math.round(detectedH);
                }

                // Détecter et synchroniser automatiquement le format (16:9, 9:16 ou 1:1)
                const ratio = currentCompositionNativeW / currentCompositionNativeH;
                let autoFmt = '16:9';
                if (Math.abs(ratio - 1) < 0.05) {
                    autoFmt = '1:1';
                } else if (ratio < 0.8) {
                    autoFmt = '9:16';
                } else {
                    autoFmt = '16:9';
                }
                applyPlayerFormat(autoFmt);

                // Cadrer immédiatement et de façon ultra-précise
                adaptGrandPlayerIframeScale();

                // Détecter la vraie durée
                if (typeof win.DURATION === 'number' && win.DURATION > 0) {
                    compositionDurationSec = win.DURATION;
                } else if (win.__timeline && typeof win.__timeline.duration === 'number') {
                    compositionDurationSec = win.__timeline.duration;
                }
                const totalTimeEl = document.getElementById('playerTotalTime');
                if (totalTimeEl) totalTimeEl.textContent = formatTime(compositionDurationSec);

                // Initialiser le premier frame SANS AUTOPLAY (en attente du clic utilisateur)
                isCompositionPlaying = false;
                compositionCurrentSec = 0;
                updateCompositionPlayBtnState();
                updateCompositionTimeDisplay();

                if (typeof win.renderAt === 'function') {
                    win.renderAt(0);
                } else if (win.__timeline && typeof win.__timeline.seek === 'function') {
                    win.__timeline.seek(0);
                }
                if (typeof win.pause === 'function') win.pause();
                else if (win.__timeline && typeof win.__timeline.pause === 'function') win.__timeline.pause();

                // Synchronisation : capturer tout clic interne pour basculer la lecture de façon synchronisée
                doc.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleCompositionPlayback();
                }, true);

            } catch (e) {
                console.log('Hook composition info:', e);
            }
        }

        let currentPlayingVideo = null;

        function openGrandVideoPlayer(videoPath, title, format, duration) {
            // Enregistrement immédiat de l'heure et de la date de dernière ouverture de cette vidéo
            recordVideoOpened(videoPath, title);

            let resolvedPath = (videoPath || '').trim();
            if (!resolvedPath.startsWith('http') && !resolvedPath.startsWith('../') && !resolvedPath.startsWith('/') && !resolvedPath.startsWith('file:')) {
                resolvedPath = '../' + resolvedPath;
            }

            currentPlayingVideo = { path: resolvedPath, title: title, format: format, duration: duration };

            const overlay = document.getElementById('videoPlayerModalOverlay');
            const videoEl = document.getElementById('grandPlayerVideoEl');
            const iframeWrapper = document.getElementById('grandPlayerIframeWrapper');
            const iframeEl = document.getElementById('grandPlayerIframeEl');
            
            document.getElementById('grandPlayerTitle').textContent = title || 'Aperçu Vidéo';

            const studioLink = document.getElementById('grandPlayerStudioLink');
            if (studioLink) {
                studioLink.href = 'studio.html?video=' + encodeURIComponent(resolvedPath);
                studioLink.onclick = () => recordVideoOpened(resolvedPath, title);
            }

            if (compositionTimer) {
                clearInterval(compositionTimer);
                compositionTimer = null;
            }

            // Initialiser les dimensions natives par défaut selon le format demandé
            const cleanFmt = (format || '16:9').trim();
            if (cleanFmt === '9:16' || cleanFmt === 'vertical' || cleanFmt === '9/16') {
                currentCompositionNativeW = 1080;
                currentCompositionNativeH = 1920;
            } else if (cleanFmt === '1:1' || cleanFmt === 'carre' || cleanFmt === 'square' || cleanFmt === '1/1') {
                currentCompositionNativeW = 1080;
                currentCompositionNativeH = 1080;
            } else {
                currentCompositionNativeW = 1920;
                currentCompositionNativeH = 1080;
            }

            // Appliquer immédiatement le bon format (16:9, 9:16 ou 1:1)
            applyPlayerFormat(format || '16:9');

            const isHtml = resolvedPath.toLowerCase().endsWith('.html');

            if (isHtml) {
                // Mode Composition HTML dynamique avec vraie synchronisation
                if (videoEl) {
                    videoEl.pause();
                    videoEl.src = '';
                    videoEl.style.display = 'none';
                }

                if (iframeWrapper) iframeWrapper.style.display = 'flex';
                currentCompositionSrc = resolvedPath;
                
                let durSec = 15;
                if (typeof duration === 'number') {
                    durSec = duration;
                } else if (typeof duration === 'string') {
                    if (duration.includes(':')) {
                        const parts = duration.split(':');
                        durSec = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
                    } else {
                        const parsed = parseInt(duration.replace(/[^\d]/g, ''), 10);
                        if (!isNaN(parsed) && parsed > 0) durSec = parsed;
                    }
                }
                compositionDurationSec = durSec;
                compositionCurrentSec = 0;
                
                // IMPORTANT : NE PAS LANCER EN AUTOPLAY
                isCompositionPlaying = false;
                updateCompositionPlayBtnState();
                updateCompositionTimeDisplay();

                if (iframeEl) {
                    iframeEl.onload = () => hookIframePlayback(iframeEl);
                    iframeEl.src = resolvedPath;
                }

                // Horloge de contrôle et synchronisation avec la timeline de la composition
                compositionTimer = setInterval(() => {
                    if (isCompositionPlaying) {
                        try {
                            const win = iframeEl.contentWindow;
                            if (win) {
                                if (typeof win.playbackTime === 'number' && win.playbackTime > 0) {
                                    compositionCurrentSec = win.playbackTime;
                                } else if (typeof win.currentTime === 'number' && win.currentTime > 0) {
                                    compositionCurrentSec = win.currentTime;
                                } else if (win.__timeline && typeof win.__timeline.time === 'function') {
                                    compositionCurrentSec = win.__timeline.time();
                                } else if (win.tl && typeof win.tl.time === 'function') {
                                    compositionCurrentSec = win.tl.time();
                                } else if (win.masterTL && typeof win.masterTL.time === 'function') {
                                    compositionCurrentSec = win.masterTL.time();
                                } else {
                                    compositionCurrentSec = Math.min(compositionDurationSec, compositionCurrentSec + 0.1);
                                }
                            } else {
                                compositionCurrentSec = Math.min(compositionDurationSec, compositionCurrentSec + 0.1);
                            }
                        } catch(e) {
                            compositionCurrentSec = Math.min(compositionDurationSec, compositionCurrentSec + 0.1);
                        }

                        if (compositionCurrentSec >= (compositionDurationSec || 15)) {
                            compositionCurrentSec = compositionDurationSec;
                            isCompositionPlaying = false;
                            updateCompositionPlayBtnState();
                            try {
                                const win = iframeEl.contentWindow;
                                if (win) {
                                    if (typeof win.pause === 'function') win.pause();
                                    else if (win.__timeline && typeof win.__timeline.pause === 'function') win.__timeline.pause();
                                    else if (win.tl && typeof win.tl.pause === 'function') win.tl.pause();
                                    else if (win.masterTL && typeof win.masterTL.pause === 'function') win.masterTL.pause();
                                }
                            } catch(e) {}
                        }
                        updateCompositionTimeDisplay();
                    }
                }, 100);

            } else {
                // Mode Fichier Vidéo Standard MP4 / WebM
                if (iframeWrapper) iframeWrapper.style.display = 'none';
                if (iframeEl) iframeEl.src = 'about:blank';

                if (videoEl) {
                    videoEl.style.display = 'block';
                    videoEl.src = resolvedPath;
                    videoEl.currentTime = 0;
                    videoEl.pause();
                    isCompositionPlaying = false;
                    updateCompositionPlayBtnState();

                    videoEl.onplay = () => { isCompositionPlaying = true; updateCompositionPlayBtnState(); };
                    videoEl.onpause = () => { isCompositionPlaying = false; updateCompositionPlayBtnState(); };
                    videoEl.onended = () => { isCompositionPlaying = false; updateCompositionPlayBtnState(); };
                    videoEl.ontimeupdate = () => {
                        compositionCurrentSec = videoEl.currentTime;
                        compositionDurationSec = videoEl.duration || compositionDurationSec;
                        updateCompositionTimeDisplay();
                    };
                }
            }

            overlay.classList.add('open');

            // Cadrage automatique instantané et multi-passe pendant l'ouverture du modal
            requestAnimationFrame(() => adaptGrandPlayerIframeScale());
            setTimeout(adaptGrandPlayerIframeScale, 60);
            setTimeout(adaptGrandPlayerIframeScale, 180);
            setTimeout(adaptGrandPlayerIframeScale, 360);
        }

        function closeGrandVideoPlayer() {
            const overlay = document.getElementById('videoPlayerModalOverlay');
            const videoEl = document.getElementById('grandPlayerVideoEl');
            const iframeEl = document.getElementById('grandPlayerIframeEl');

            // Quitter le plein écran proprement si actif
            if (document.fullscreenElement || document.webkitFullscreenElement || document.getElementById('grandPlayerContainer')?.classList.contains('is-fullscreen')) {
                if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                document.getElementById('grandPlayerContainer')?.classList.remove('is-fullscreen', 'controls-hidden');
            }

            if (fullscreenInactivityTimer) {
                clearTimeout(fullscreenInactivityTimer);
                fullscreenInactivityTimer = null;
            }

            if (compositionTimer) {
                clearInterval(compositionTimer);
                compositionTimer = null;
            }
            isCompositionPlaying = false;
            updateCompositionPlayBtnState();

            if (videoEl) {
                videoEl.pause();
                videoEl.src = '';
            }
            if (iframeEl) {
                try {
                    const win = iframeEl.contentWindow;
                    if (win && win.pause) win.pause();
                    else if (win && win.__timeline && win.__timeline.pause) win.__timeline.pause();
                } catch(e) {}
                iframeEl.src = 'about:blank';
            }
            overlay.classList.remove('open');
        }

        function toggleCompositionPlayback() {
            const videoEl = document.getElementById('grandPlayerVideoEl');
            // 1. Vidéo MP4 native
            if (videoEl && videoEl.style.display !== 'none') {
                if (videoEl.paused) {
                    if (videoEl.currentTime >= (videoEl.duration || 1) - 0.1) {
                        videoEl.currentTime = 0;
                    }
                    videoEl.play().catch(() => {});
                    isCompositionPlaying = true;
                } else {
                    videoEl.pause();
                    isCompositionPlaying = false;
                }
                updateCompositionPlayBtnState();
                return;
            }

            // 2. Composition HTML dynamique
            isCompositionPlaying = !isCompositionPlaying;
            updateCompositionPlayBtnState();
            const iframeEl = document.getElementById('grandPlayerIframeEl');
            if (iframeEl) {
                try {
                    const win = iframeEl.contentWindow;
                    const doc = iframeEl.contentDocument || win?.document;
                    if (win) {
                        if (isCompositionPlaying) {
                            if (compositionCurrentSec >= (compositionDurationSec || 15) - 0.05) {
                                compositionCurrentSec = 0;
                                updateCompositionTimeDisplay();
                                if (typeof win.renderAt === 'function') win.renderAt(0);
                                if (typeof win.renderFrame === 'function') win.renderFrame(0);
                                if (win.__timeline && typeof win.__timeline.seek === 'function') win.__timeline.seek(0, false);
                                if (win.tl && typeof win.tl.seek === 'function') win.tl.seek(0, false);
                                if (win.masterTL && typeof win.masterTL.seek === 'function') win.masterTL.seek(0, false);
                            }
                            if (typeof win.play === 'function') win.play();
                            else if (win.__timeline && typeof win.__timeline.play === 'function') win.__timeline.play();
                            else if (win.tl && typeof win.tl.play === 'function') win.tl.play();
                            else if (win.masterTL && typeof win.masterTL.play === 'function') win.masterTL.play();
                            else if (win.gsap && win.gsap.globalTimeline) win.gsap.globalTimeline.play();

                            if (doc) {
                                doc.querySelectorAll('audio, video').forEach(m => {
                                    try { m.play().catch(() => {}); } catch(e) {}
                                });
                            }
                        } else {
                            if (typeof win.pause === 'function') win.pause();
                            else if (win.__timeline && typeof win.__timeline.pause === 'function') win.__timeline.pause();
                            else if (win.tl && typeof win.tl.pause === 'function') win.tl.pause();
                            else if (win.masterTL && typeof win.masterTL.pause === 'function') win.masterTL.pause();
                            else if (win.gsap && win.gsap.globalTimeline) win.gsap.globalTimeline.pause();

                            if (doc) {
                                doc.querySelectorAll('audio, video').forEach(m => {
                                    try { m.pause(); } catch(e) {}
                                });
                            }
                        }
                    }
                } catch(e) {}
            }
        }

        function updateCompositionPlayBtnState() {
            const playIcon = document.getElementById('playerPlayIcon');
            const pauseIcon = document.getElementById('playerPauseIcon');
            const bigOverlay = document.getElementById('playerBigPlayOverlay');
            if (playIcon && pauseIcon) {
                if (isCompositionPlaying) {
                    playIcon.style.display = 'none';
                    pauseIcon.style.display = 'block';
                } else {
                    playIcon.style.display = 'block';
                    pauseIcon.style.display = 'none';
                }
            }
            if (bigOverlay) {
                bigOverlay.style.display = isCompositionPlaying ? 'none' : 'flex';
            }
        }

        function restartCompositionPlayback() {
            compositionCurrentSec = 0;
            isCompositionPlaying = true;
            updateCompositionPlayBtnState();
            updateCompositionTimeDisplay();
            const iframeEl = document.getElementById('grandPlayerIframeEl');
            if (iframeEl) {
                try {
                    const win = iframeEl.contentWindow;
                    if (win) {
                        if (win.__timeline && typeof win.__timeline.seek === 'function') win.__timeline.seek(0);
                        else if (typeof win.seekTo === 'function') win.seekTo(0);
                        else if (typeof win.renderAt === 'function') win.renderAt(0);
                        if (typeof win.play === 'function') win.play();
                        else if (win.__timeline && typeof win.__timeline.play === 'function') win.__timeline.play();
                        return;
                    }
                } catch(e) {}
                if (currentCompositionSrc) iframeEl.src = currentCompositionSrc;
            }
        }

        let isPlayerScrubbing = false;

        function seekVideoComposition(timeInSeconds) {
            const time = Math.max(0, Math.min(timeInSeconds, compositionDurationSec || 15));
            compositionCurrentSec = time;
            updateCompositionTimeDisplay();

            const iframeEl = document.getElementById('grandPlayerIframeEl');
            const videoEl = document.getElementById('grandPlayerVideoEl');

            // 1. Si vidéo native MP4
            if (videoEl && videoEl.style.display !== 'none') {
                try { videoEl.currentTime = time; } catch(e) {}
                return;
            }

            // 2. Si composition HTML
            if (iframeEl) {
                try {
                    const win = iframeEl.contentWindow;
                    const doc = iframeEl.contentDocument || win?.document;
                    if (!win) return;

                    // A. Moteur direct Canvas renderAt / renderFrame
                    if (typeof win.renderAt === 'function') {
                        try { win.renderAt(time, isCompositionPlaying); } catch(e) {}
                    }
                    if (typeof win.renderFrame === 'function') {
                        try { win.renderFrame(time); } catch(e) {}
                    }
                    if (typeof win.seek === 'function') {
                        try { win.seek(time); } catch(e) {}
                    }

                    // B. GSAP Timelines
                    if (win.__timeline && typeof win.__timeline.seek === 'function') {
                        try { win.__timeline.seek(time, false); } catch(e) {}
                    }
                    if (win.tl && typeof win.tl.seek === 'function') {
                        try { win.tl.seek(time, false); } catch(e) {}
                    }
                    if (win.timeline && typeof win.timeline.seek === 'function') {
                        try { win.timeline.seek(time, false); } catch(e) {}
                    }
                    if (win.gsap && win.gsap.globalTimeline) {
                        try { win.gsap.globalTimeline.time(time); } catch(e) {}
                    }

                    // C. Timelines indexées (__timelines)
                    if (win.__timelines) {
                        try {
                            Object.values(win.__timelines).forEach(tItem => {
                                if (tItem && typeof tItem.seek === 'function') tItem.seek(time, false);
                            });
                        } catch(e) {}
                    }

                    // D. Pistes Audio & Vidéo internes
                    if (doc) {
                        doc.querySelectorAll('audio, video').forEach(m => {
                            try {
                                const mStart = parseFloat(m.dataset.start || '0') || 0;
                                const mEnd = parseFloat(m.dataset.end || '9999') || 9999;
                                if (time >= mStart && time <= mEnd) {
                                    m.currentTime = time - mStart;
                                } else {
                                    m.currentTime = 0;
                                }
                                if (!isCompositionPlaying) m.pause();
                            } catch(e) {}
                        });
                    }

                    if (typeof win.playbackTime === 'number') win.playbackTime = time;
                    if (typeof win.currentTime === 'number') win.currentTime = time;

                } catch(e) {}
            }
        }

        function handlePlayerScrub(e) {
            const track = document.getElementById('playerScrubberTrack');
            if (!track) return;
            const rect = track.getBoundingClientRect();
            const posX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const ratio = posX / rect.width;
            const targetTime = ratio * (compositionDurationSec || 15);
            seekVideoComposition(targetTime);
        }

        let wasPlayingBeforeScrub = false;

        function startPlayerScrub(e) {
            isPlayerScrubbing = true;
            wasPlayingBeforeScrub = isCompositionPlaying;
            if (isCompositionPlaying) {
                // Pause temporaire pendant le déplacement du curseur pour un rendu fluide
                isCompositionPlaying = false;
                updateCompositionPlayBtnState();
                const iframeEl = document.getElementById('grandPlayerIframeEl');
                if (iframeEl && iframeEl.contentWindow && typeof iframeEl.contentWindow.pause === 'function') {
                    try { iframeEl.contentWindow.pause(); } catch(err) {}
                }
                const videoEl = document.getElementById('grandPlayerVideoEl');
                if (videoEl && videoEl.style.display !== 'none') {
                    try { videoEl.pause(); } catch(err) {}
                }
            }
            handlePlayerScrub(e);
        }

        function seekCompositionPlayback(e) {
            handlePlayerScrub(e);
        }

        window.addEventListener('mousemove', (e) => {
            if (isPlayerScrubbing) {
                handlePlayerScrub(e);
            }
        });

        window.addEventListener('mouseup', () => {
            if (isPlayerScrubbing) {
                isPlayerScrubbing = false;
                if (wasPlayingBeforeScrub) {
                    toggleCompositionPlayback(); // Reprend automatiquement la lecture là où on a relâché le curseur
                    wasPlayingBeforeScrub = false;
                }
            }
        });

        // ---------------------------------------------------------------------
        // MODAL DE CONFIRMATION DE SUPPRESSION DE VIDÉO
        // ---------------------------------------------------------------------
        function openDeleteVideoConfirmModal() {
            if (!currentPlayingVideo) return;
            const titleEl = document.getElementById('deleteVideoConfirmTitle');
            if (titleEl) {
                titleEl.textContent = currentPlayingVideo.title || 'Vidéo';
            }
            const modal = document.getElementById('deleteVideoConfirmModal');
            if (modal) modal.classList.add('open');
        }

        function closeDeleteVideoConfirmModal() {
            const modal = document.getElementById('deleteVideoConfirmModal');
            if (modal) modal.classList.remove('open');
        }

        async function executeDeleteCurrentVideo() {
            if (!currentPlayingVideo) return;
            const toDelete = currentPlayingVideo;
            const pathToDelete = (toDelete.path || '').trim();
            const titleToDelete = (toDelete.title || '').trim();
            const cleanPath = pathToDelete.replace(/^(\.\.[\/\\])+/, '').replace(/^[\\/]+/, '');
            const baseFileName = cleanPath.split(/[/\\]/).pop();

            // 1. Retirer de la liste locale en mémoire
            allVideosList = allVideosList.filter(v => {
                const vp = (v.videoPath || v.path || v.file || '').replace(/^(\.\.[\/\\])+/, '').replace(/^[\\/]+/, '');
                const vf = vp.split(/[/\\]/).pop();
                if (baseFileName && (vf === baseFileName || vp === cleanPath)) return false;
                if (v.title && titleToDelete && v.title.toLowerCase().trim() === titleToDelete.toLowerCase().trim()) return false;
                return true;
            });

            // 2. Persister les suppressions dans localStorage
            try {
                const deletedList = JSON.parse(localStorage.getItem('marvidflow_deleted_videos') || localStorage.getItem('autoframe_deleted_videos') || '[]');
                [pathToDelete, cleanPath, baseFileName, titleToDelete].forEach(item => {
                    if (item && !deletedList.includes(item)) deletedList.push(item);
                });
                localStorage.setItem('marvidflow_deleted_videos', JSON.stringify(deletedList));
                localStorage.setItem('autoframe_deleted_videos', JSON.stringify(deletedList));
                localStorage.setItem(SNAPSHOT_KEY_VIDEOS, JSON.stringify(allVideosList));

                // Nettoyer également le cache du studio (hyperstudio_cached_videos) pour synchronisation immédiate
                const rawStudio = localStorage.getItem('hyperstudio_cached_videos');
                if (rawStudio) {
                    let studioList = JSON.parse(rawStudio);
                    if (Array.isArray(studioList)) {
                        studioList = studioList.filter(v => {
                            const vp = (typeof v === 'string' ? v : (v.path || v.file || v.name || ''));
                            const vf = vp.split(/[/\\]/).pop();
                            return vf !== baseFileName && vp !== cleanPath && vp !== pathToDelete;
                        });
                        localStorage.setItem('hyperstudio_cached_videos', JSON.stringify(studioList));
                    }
                }
            } catch(e) {}

            // 3. Appel API pour supprimer définitivement le fichier physique sur le disque
            try {
                await fetch('/api/delete-video', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        video: pathToDelete,
                        path: cleanPath,
                        file: baseFileName,
                        title: titleToDelete
                    })
                });
            } catch(e) {}

            // 4. Fermer les modaux et rafraîchir l'interface
            closeDeleteVideoConfirmModal();
            closeGrandVideoPlayer();
            renderDashboardProjects();

            const countEl = document.getElementById('navCounterDashboard');
            if (countEl) countEl.textContent = allVideosList.length;

            if (typeof showToast === 'function') {
                showToast(`Vidéo "${titleToDelete}" supprimée avec succès`, '🗑️');
            }
        }

        function updateCompositionTimeDisplay() {
            const curEl = document.getElementById('playerCurrentTime');
            const totEl = document.getElementById('playerTotalTime');
            const prog = document.getElementById('playerScrubberProgress');
            const handle = document.getElementById('playerScrubberHandle');
            if (curEl) curEl.textContent = formatTime(compositionCurrentSec);
            if (totEl) totEl.textContent = formatTime(compositionDurationSec);
            const pct = Math.min(100, (compositionCurrentSec / (compositionDurationSec || 1)) * 100);
            if (prog) prog.style.width = pct + '%';
            if (handle) handle.style.left = pct + '%';
        }

        function toggleCompositionVolume() {
            isCompositionMuted = !isCompositionMuted;
            const volIcon = document.getElementById('playerVolumeIcon');
            const muteIcon = document.getElementById('playerMuteIcon');
            if (volIcon) volIcon.style.display = isCompositionMuted ? 'none' : 'block';
            if (muteIcon) muteIcon.style.display = isCompositionMuted ? 'block' : 'none';
            try {
                const iframeEl = document.getElementById('grandPlayerIframeEl');
                if (iframeEl && iframeEl.contentWindow) {
                    const audios = iframeEl.contentDocument ? iframeEl.contentDocument.querySelectorAll('audio') : [];
                    audios.forEach(a => a.muted = isCompositionMuted);
                }
            } catch (err) {}
        }

        // =====================================================================
        // GESTION DU PLEIN ÉCRAN STYLE YOUTUBE (100vw × 100vh, COMMANDES, AUTO-HIDE)
        // =====================================================================
        let fullscreenInactivityTimer = null;

        function resetFullscreenInactivityTimer() {
            const container = document.getElementById('grandPlayerContainer');
            if (!container) return;
            container.classList.remove('controls-hidden');
            if (fullscreenInactivityTimer) {
                clearTimeout(fullscreenInactivityTimer);
                fullscreenInactivityTimer = null;
            }
            const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || container.classList.contains('is-fullscreen'));
            if (isFullscreen && isCompositionPlaying) {
                fullscreenInactivityTimer = setTimeout(() => {
                    container.classList.add('controls-hidden');
                }, 3000);
            }
        }

        function updateFullscreenIcons(isFullscreen) {
            const expandIcon = document.getElementById('fullscreenExpandIcon');
            const compressIcon = document.getElementById('fullscreenCompressIcon');
            if (expandIcon) expandIcon.style.display = isFullscreen ? 'none' : 'block';
            if (compressIcon) compressIcon.style.display = isFullscreen ? 'block' : 'none';

            const btn = document.getElementById('playerFullscreenBtn');
            if (btn) btn.title = isFullscreen ? 'Quitter le plein écran (F ou Échap)' : 'Plein écran (F)';

            const container = document.getElementById('grandPlayerContainer');
            if (container) {
                if (isFullscreen) {
                    container.classList.add('is-fullscreen');
                    resetFullscreenInactivityTimer();
                } else {
                    container.classList.remove('is-fullscreen', 'controls-hidden');
                    if (fullscreenInactivityTimer) {
                        clearTimeout(fullscreenInactivityTimer);
                        fullscreenInactivityTimer = null;
                    }
                }
            }

            // Réappliquer le format adapté lors de la sortie du plein écran
            if (!isFullscreen && currentPlayingVideo) {
                applyPlayerFormat(currentPlayingVideo.format || '16:9');
            }
        }

        function togglePlayerFullscreen() {
            const container = document.getElementById('grandPlayerContainer');
            if (!container) return;

            const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || container.classList.contains('is-fullscreen'));

            if (!isFullscreen) {
                if (container.requestFullscreen) {
                    container.requestFullscreen().then(() => updateFullscreenIcons(true)).catch(() => {
                        container.classList.add('is-fullscreen');
                        updateFullscreenIcons(true);
                    });
                } else if (container.webkitRequestFullscreen) {
                    container.webkitRequestFullscreen();
                    updateFullscreenIcons(true);
                } else if (container.msRequestFullscreen) {
                    container.msRequestFullscreen();
                    updateFullscreenIcons(true);
                } else {
                    container.classList.add('is-fullscreen');
                    updateFullscreenIcons(true);
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen().then(() => updateFullscreenIcons(false)).catch(() => {
                        container.classList.remove('is-fullscreen');
                        updateFullscreenIcons(false);
                    });
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                    updateFullscreenIcons(false);
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                    updateFullscreenIcons(false);
                } else {
                    container.classList.remove('is-fullscreen');
                    updateFullscreenIcons(false);
                }
                setTimeout(adaptGrandPlayerIframeScale, 60);
                setTimeout(adaptGrandPlayerIframeScale, 250);
            }
        }

        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
            document.addEventListener(evt, () => {
                const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
                updateFullscreenIcons(isFs);
                setTimeout(adaptGrandPlayerIframeScale, 50);
                setTimeout(adaptGrandPlayerIframeScale, 200);
            });
        });

        window.addEventListener('resize', adaptGrandPlayerIframeScale);

        if (window.ResizeObserver) {
            const grandPlayerResizeObserver = new ResizeObserver(() => {
                adaptGrandPlayerIframeScale();
            });
            const grandContainer = document.getElementById('grandPlayerContainer');
            if (grandContainer) grandPlayerResizeObserver.observe(grandContainer);
            const grandWrapper = document.getElementById('grandPlayerIframeWrapper');
            if (grandWrapper) grandPlayerResizeObserver.observe(grandWrapper);
        }

        // Détection de mouvement souris et double-clic sur le player
        const playerScreenContainer = document.getElementById('grandPlayerContainer');
        if (playerScreenContainer) {
            playerScreenContainer.addEventListener('mousemove', resetFullscreenInactivityTimer);
            playerScreenContainer.addEventListener('dblclick', (e) => {
                if (e.target.closest('.composition-player-bar') || e.target.closest('button')) return;
                togglePlayerFullscreen();
            });
        }

        // D. MODAL UPLOAD D'ASSET AVEC CHOIX DU DOSSIER
        function openUploadAssetModal() {
            document.getElementById('uploadAssetModal').classList.add('open');
        }

        function closeUploadAssetModal() {
            document.getElementById('uploadAssetModal').classList.remove('open');
        }

        let selectedAssetToUpload = null;
        function handleAssetFileSelected(input) {
            if (input.files && input.files[0]) {
                selectedAssetToUpload = input.files[0];
                document.getElementById('assetUploadSelectedFileName').textContent = selectedAssetToUpload.name;
            }
        }

        async function submitUploadAsset() {
            if (!selectedAssetToUpload) {
                showToast('Veuillez sélectionner un fichier', '⚠️');
                return;
            }

            const targetFolder = document.getElementById('uploadAssetTargetFolder').value;
            const subfolder = document.getElementById('uploadAssetSubfolder').value.trim();

            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64Data = e.target.result.split(',')[1];
                try {
                    await fetch('/api/upload-asset', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            filename: selectedAssetToUpload.name,
                            category: targetFolder,
                            subfolder: subfolder,
                            data: base64Data
                        })
                    });
                } catch (err) {}

                // Ajout au catalogue local
                let detectedType = 'Images';
                const ext = selectedAssetToUpload.name.split('.').pop().toLowerCase();
                if (['mp4', 'mov', 'webm'].includes(ext)) detectedType = 'Videos';
                else if (['mp3', 'wav', 'ogg'].includes(ext)) detectedType = 'Audios';
                else if (['svg', 'ai'].includes(ext)) detectedType = 'Vectors';

                assetsCatalogList.unshift({
                    name: selectedAssetToUpload.name,
                    type: detectedType,
                    subfolder: targetFolder,
                    size: (selectedAssetToUpload.size / (1024 * 1024)).toFixed(1) + ' MB',
                    url: `../01_Assets/${targetFolder}/${selectedAssetToUpload.name}`
                });

                closeUploadAssetModal();
                showToast(`Fichier importé dans 01_Assets/${targetFolder}/`);
                updateSidebarCounters();
                renderAssetsView();
            };
            reader.readAsDataURL(selectedAssetToUpload);
        }

        // =====================================================================
        // SECTION PARAMÈTRES
        // =====================================================================
        // (saveSettings complet défini dans le bloc Paramètres)

        // =====================================================================
        // GESTION GLOBALE DES MODAUX & RECHERCHE
        // =====================================================================
        function handleModalOutsideClick(event, modalId) {
            if (event.target.id === modalId) {
                document.getElementById(modalId).classList.remove('open');
                if (modalId === 'assetAudioModal') closeAssetAudioModal();
                if (modalId === 'videoPlayerModalOverlay') closeGrandVideoPlayer();
            }
        }

        window.addEventListener('keydown', (e) => {
            const playerOverlay = document.getElementById('videoPlayerModalOverlay');
            const isPlayerOpen = playerOverlay && playerOverlay.classList.contains('open');

            // Raccourcis clavier immersifs style YouTube lorsque le lecteur vidéo est ouvert
            if (isPlayerOpen && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
                if (e.key === ' ' || e.key.toLowerCase() === 'k') {
                    e.preventDefault();
                    toggleCompositionPlayback();
                    return;
                }
                if (e.key.toLowerCase() === 'f') {
                    e.preventDefault();
                    togglePlayerFullscreen();
                    return;
                }
                if (e.key.toLowerCase() === 'm') {
                    e.preventDefault();
                    toggleCompositionVolume();
                    return;
                }
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    seekVideoComposition(Math.min((compositionDurationSec || 15), (compositionCurrentSec || 0) + 5));
                    return;
                }
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    seekVideoComposition(Math.max(0, (compositionCurrentSec || 0) - 5));
                    return;
                }
            }

            if (e.key === 'Escape') {
                const container = document.getElementById('grandPlayerContainer');
                const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || container?.classList.contains('is-fullscreen'));
                if (isFs) {
                    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
                    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                    container?.classList.remove('is-fullscreen', 'controls-hidden');
                    updateFullscreenIcons(false);
                    return;
                }
                document.querySelectorAll('.modal-overlay, .script-modal-overlay').forEach(m => m.classList.remove('open'));
                closeAssetAudioModal();
                closeGrandVideoPlayer();
                const search = document.getElementById('globalAppSearch');
                if (search && (document.activeElement === search || search.value)) {
                    search.value = '';
                    search.blur();
                    handleGlobalSearch();
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                const search = document.getElementById('globalAppSearch');
                if (search) {
                    search.focus();
                    search.select();
                }
            }
        });

        function openTutorialVideoModal() {
            // Grand player modal avec tutoriel MarvidFlow Studio
            openGrandVideoPlayer('../01_Assets/Videos/17_design_tips_for_video_editors.mp4', 'Tutoriel MarvidFlow Studio — Guide & Prise en main', '16:9', '01:24');
        }

        // --- CENTRE D'AIDE ET SUPPORT DIRECT ---
        function openHelpSupportModal() {
            const modal = document.getElementById('helpSupportModal');
            if (modal) modal.classList.add('open');
        }

        function closeHelpSupportModal() {
            const modal = document.getElementById('helpSupportModal');
            if (modal) modal.classList.remove('open');
        }

        function handleSendSupportEmail(e) {
            if (e) e.preventDefault();
            const subject = encodeURIComponent((document.getElementById('helpSupportSubject')?.value || 'Support MarvidFlow').trim());
            const msg = encodeURIComponent((document.getElementById('helpSupportMessage')?.value || '').trim());
            const mailtoUrl = `mailto:pro.ndarawfall@gmail.com?subject=${subject}&body=${msg}`;
            window.location.href = mailtoUrl;
            closeHelpSupportModal();
            showToast('Ouverture de votre messagerie vers pro.ndarawfall@gmail.com !', '✉️');
        }

        function handleGlobalSearch() {
            const q = (document.getElementById('globalAppSearch').value || '').toLowerCase().trim();
            if (!q) {
                renderDashboardProjects();
                renderChannelsView();
                renderAssetsView();
                renderClientsView();
                return;
            }
            if (currentView === 'dashboard') {
                const filtered = allVideosList.filter(v => 
                    (v.title && v.title.toLowerCase().includes(q)) || 
                    (v.channelName && v.channelName.toLowerCase().includes(q)) ||
                    (v.client && v.client.toLowerCase().includes(q)) ||
                    (v.format && v.format.toLowerCase().includes(q)) ||
                    (v.platform && v.platform.toLowerCase().includes(q))
                );
                renderDashboardProjects(filtered);
            } else if (currentView === 'reseaux') {
                const filtered = channelsCache.filter(c => 
                    (c.name && c.name.toLowerCase().includes(q)) || 
                    (c.platform && c.platform.toLowerCase().includes(q)) ||
                    (c.handle && c.handle.toLowerCase().includes(q)) ||
                    (c.slogan && c.slogan.toLowerCase().includes(q))
                );
                renderChannelsView(filtered);
            } else if (currentView === 'assets') {
                const filtered = assetsCatalogList.filter(a => 
                    (a.name && a.name.toLowerCase().includes(q)) ||
                    (a.subfolder && a.subfolder.toLowerCase().includes(q)) ||
                    (a.type && a.type.toLowerCase().includes(q))
                );
                renderAssetsView(filtered);
            } else if (currentView === 'clients') {
                const filtered = clientsCache.filter(cl => 
                    (cl.name && cl.name.toLowerCase().includes(q))
                );
                renderClientsView(filtered);
            }
        }

        function escapeHtml(str) {
            return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        function escapeJs(str) {
            return String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        }

        // Initialisation automatique au chargement (du tic au tac sans attendre)
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadAllInitialData);
        } else {
            loadAllInitialData();
        }
    

        // =====================================================================
        // LOGIQUE SÉLECTEUR DE CHAÎNE SUR-MESURE & CRÉATION VIDÉO SPA
        // =====================================================================
        let currentCreationChannel = null;
        let currentChannelId = null;
        let creationOriginChannelId = null;

        function openCreateVideoView(channelId) {
            creationOriginChannelId = channelId || null;
            switchView('create_video');
            window.scrollTo({ top: 0, behavior: 'smooth' });

            const backRow = document.getElementById('createVideoBackToChannelRow');
            const backLabel = document.getElementById('labelBackToOriginChannel');

            if (channelId) {
                const originChan = channelsCache.find(c => c.id === channelId);
                if (backRow) backRow.style.display = 'block';
                if (backLabel) backLabel.textContent = originChan ? `Retour à la chaîne "${originChan.name}"` : 'Retour à la chaîne';
                selectCreationChannel(channelId);
            } else {
                if (backRow) backRow.style.display = 'none';
                selectCreationChannel(null);
            }
        }

        function backToOriginChannel() {
            if (creationOriginChannelId) {
                const chanId = creationOriginChannelId;
                creationOriginChannelId = null;
                switchView('reseaux');
                openChannelDetailView(chanId);
            } else {
                switchView('reseaux');
            }
        }

        let channelPickerSearchQuery = '';

        function handleChannelPickerSearch(query) {
            channelPickerSearchQuery = (query || '').trim().toLowerCase();
            renderCustomChannelPicker(channelPickerSearchQuery);
        }

        function renderCustomChannelPicker(searchQuery = '') {
            const listEl = document.getElementById('pickerDropdownList');
            if (!listEl) return;

            let html = '';

            // Option sans chaîne toujours accessible si pertinent
            if (!searchQuery || 'sans chaine independant'.includes(searchQuery)) {
                html += `
                    <div class="picker-dropdown-item ${!currentCreationChannel ? 'active' : ''}" onclick="selectCreationChannel(null)">
                        <div class="picker-item-avatar" style="background: #1f2028;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        </div>
                        <div class="picker-item-info">
                            <div class="picker-item-title">Sans Chaîne (Indépendant)</div>
                            <div class="picker-item-badges">
                                <span style="font-size: 10px; color: var(--text-muted);">Générique / Multi-plateformes</span>
                            </div>
                        </div>
                        ${!currentCreationChannel ? '<span style="color:#ffffff; font-weight:700;">✓</span>' : ''}
                    </div>
                `;
            }

            // Filtrage par nom de chaîne peu importe le réseau
            const filteredChannels = channelsCache.filter(c => {
                if (!searchQuery) return true;
                return (c.name || '').toLowerCase().includes(searchQuery) || (c.platform || '').toLowerCase().includes(searchQuery);
            });

            if (filteredChannels.length === 0 && searchQuery) {
                html += `
                    <div style="padding: 18px 12px; text-align: center; color: var(--text-muted); font-size: 12px;">
                        Aucune chaîne trouvée pour "${escapeHtml(searchQuery)}"
                    </div>
                `;
            } else {
                filteredChannels.forEach(c => {
                    const isSelected = currentCreationChannel && currentCreationChannel.id === c.id;
                    const avatarStyle = c.avatar ? `background-image: url('../${c.avatar.replace(/^\.\.\//, '')}');` : '';
                    const fallbackInitial = c.name ? c.name.charAt(0).toUpperCase() : 'C';

                    let badgeBg = '#FF0000';
                    let badgeIcon = 'YouTube';
                    if (c.platform === 'Instagram') {
                        badgeBg = 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)';
                        badgeIcon = 'Instagram';
                    } else if (c.platform === 'TikTok') {
                        badgeBg = '#000000';
                        badgeIcon = 'TikTok';
                    }

                    html += `
                        <div class="picker-dropdown-item ${isSelected ? 'active' : ''}" onclick="selectCreationChannel('${c.id}')">
                            <div class="picker-item-avatar" style="${avatarStyle}">
                                ${!c.avatar ? fallbackInitial : ''}
                            </div>
                            <div class="picker-item-info">
                                <div class="picker-item-title">${escapeHtml(c.name)}</div>
                                <div class="picker-item-badges">
                                    <span style="font-size: 9.5px; padding: 1px 6px; border-radius: 4px; background: ${badgeBg}; color: #ffffff; font-weight: 700;">${badgeIcon}</span>
                                    <span style="font-size: 9.5px; padding: 1px 6px; border-radius: 4px; background: rgba(255,255,255,0.08); color: #d4d4d8;">${c.format || '16:9'}</span>
                                </div>
                            </div>
                            ${isSelected ? '<span style="color:#ffffff; font-weight:700;">✓</span>' : ''}
                        </div>
                    `;
                });
            }

            listEl.innerHTML = html;
        }

        function toggleChannelPickerDropdown(e) {
            if (e) e.stopPropagation();
            const dropdown = document.getElementById('channelPickerDropdown');
            const trigger = document.getElementById('channelPickerTrigger');
            if (!dropdown || !trigger) return;
            const isOpen = dropdown.classList.toggle('open');
            trigger.classList.toggle('open', isOpen);
            if (isOpen) {
                const searchInput = document.getElementById('channelPickerSearchInput');
                if (searchInput) {
                    searchInput.value = '';
                    channelPickerSearchQuery = '';
                    renderCustomChannelPicker('');
                    setTimeout(() => searchInput.focus(), 60);
                }
            }
        }

        function closeChannelPickerDropdown() {
            const dropdown = document.getElementById('channelPickerDropdown');
            const trigger = document.getElementById('channelPickerTrigger');
            if (dropdown) dropdown.classList.remove('open');
            if (trigger) trigger.classList.remove('open');
        }

        function selectCreationChannel(channelId) {
            if (!channelId) {
                currentCreationChannel = null;
                currentChannelId = null;
                const avatarEl = document.getElementById('pickerCurrentAvatar');
                if (avatarEl) {
                    avatarEl.style.backgroundImage = '';
                    avatarEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
                }
                const nameEl = document.getElementById('pickerCurrentName');
                if (nameEl) nameEl.textContent = 'Sans Chaîne (Indépendant)';
                const subEl = document.getElementById('pickerCurrentSub');
                if (subEl) subEl.textContent = 'Vidéos génériques / Multi-plateformes';
                const badge = document.getElementById('storageTargetBadge');
                if (badge) badge.style.display = 'none';
            } else {
                const found = channelsCache.find(c => String(c.id) === String(channelId) || c.name === channelId);
                if (found) {
                    currentCreationChannel = found;
                    currentChannelId = found.id;
                    const avatarEl = document.getElementById('pickerCurrentAvatar');
                    if (avatarEl) {
                        if (found.avatar) {
                            avatarEl.innerHTML = '';
                            avatarEl.style.backgroundImage = `url('../${found.avatar.replace(/^\.\.\//, '')}')`;
                        } else {
                            avatarEl.style.backgroundImage = '';
                            avatarEl.textContent = found.name.charAt(0).toUpperCase();
                        }
                    }
                    const nameEl = document.getElementById('pickerCurrentName');
                    if (nameEl) nameEl.textContent = found.name;
                    const subEl = document.getElementById('pickerCurrentSub');
                    if (subEl) subEl.textContent = `${found.platform} • ${found.format || '16:9'}`;

                    // Aligner automatiquement le format selon la chaîne
                    if (found.format === '9:16') {
                        if (typeof selectVideoFormat === 'function') selectVideoFormat('9:16');
                    } else if (found.format === '16:9') {
                        if (typeof selectVideoFormat === 'function') selectVideoFormat('16:9');
                    }

                    // Badge de stockage ciblé
                    const badge = document.getElementById('storageTargetBadge');
                    if (badge) {
                        badge.style.display = 'inline-flex';
                        badge.textContent = `Chaîne : ${found.name} (01_Assets/.../${found.id}/)`;
                    }

                    // Couleur d'accentuation des sous-titres
                    if (found.colorPrimary) {
                        try {
                            currentSubtitleAccentColor = found.colorPrimary;
                            const hexInput = document.getElementById('subAccentColorHex');
                            if (hexInput) hexInput.value = found.colorPrimary.toUpperCase();
                        } catch(e) {}
                    }
                }
            }
            closeChannelPickerDropdown();
            renderCustomChannelPicker();
        }

        // Fermer le dropdown en cliquant à l'extérieur
        document.addEventListener('click', (e) => {
            const container = document.getElementById('customChannelPickerContainer');
            if (container && !container.contains(e.target)) {
                closeChannelPickerDropdown();
            }
        });


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
        const PROMPT_DOC_TEXT = `Tu es le Scénariste et Directeur Artistique de MarvidFlow, un moteur de motion design vidéo 60 FPS basé sur Canvas 2D et GSAP.
Je souhaite créer une vidéo sur le sujet suivant :
« [INSÉRER LE SUJET DE LA VIDÉO ICI] »

Contraintes techniques de MarvidFlow :
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
        currentChannelId = currentChannelId || (new URLSearchParams(window.location.search).get('channel') || '');
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
                    if (audioPreview && typeof audioPreview.pause === 'function') audioPreview.pause();
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

        function applyElevenVoicesData(data) {
            if (!data) return false;
            createElevenVoicesCache = {};
            elevenVoicesRawList = [];

            if (data.customVoices && Array.isArray(data.customVoices)) {
                data.customVoices.forEach(v => {
                    createElevenVoicesCache[v.id] = v;
                    elevenVoicesRawList.push(v);
                });
            }
            if (data.defaultVoices && Array.isArray(data.defaultVoices)) {
                data.defaultVoices.forEach(v => {
                    createElevenVoicesCache[v.id] = v;
                    elevenVoicesRawList.push(v);
                });
            }

            if (elevenVoicesRawList.length === 0) return false;

            renderVoiceRows('eleven', elevenVoicesRawList);

            const savedVoice = localStorage.getItem('vibeeditor_elevenlabs_voice_id');
            const initial = (savedVoice && createElevenVoicesCache[savedVoice]) ? savedVoice : elevenVoicesRawList[0].id;
            selectVoiceItem('eleven', initial);
            return true;
        }

        async function loadElevenVoicesForCreateVideo(forceRefresh = false) {
            // 1. Rendu instantané 0ms depuis le cache localStorage
            let hasLoadedFromCache = false;
            if (!forceRefresh) {
                try {
                    const cachedStr = localStorage.getItem('marvidflow_cached_eleven_voices');
                    if (cachedStr) {
                        const cachedData = JSON.parse(cachedStr);
                        hasLoadedFromCache = applyElevenVoicesData(cachedData);
                    }
                } catch(e) {}
            }

            try {
                const res = await fetch('/api/elevenlabs/voices');
                if (!res.ok) throw new Error("Impossible de charger les voix ElevenLabs");
                const data = await res.json();

                if (data && (data.customVoices || data.defaultVoices)) {
                    localStorage.setItem('marvidflow_cached_eleven_voices', JSON.stringify(data));
                    applyElevenVoicesData(data);
                } else if (!hasLoadedFromCache) {
                    throw new Error("Aucune voix trouvée");
                }
            } catch(e) {
                if (!hasLoadedFromCache && elevenVoicesRawList.length === 0) {
                    const list = document.getElementById('listElevenItems');
                    if (list) list.innerHTML = '<div style="padding:14px; color:#ff4444; font-size:12px;">Voix non disponibles (Vérifiez la clé dans Paramètres)</div>';
                    const triggerText = document.getElementById('nameElevenSelected');
                    if (triggerText) triggerText.textContent = 'Sélectionner une voix';
                }
            }
        }

        function applyEdgeVoicesData(data) {
            if (!data) return false;
            createEdgeVoicesCache = {};
            edgeVoicesRawList = [];

            if (data.frenchVoices && Array.isArray(data.frenchVoices)) {
                data.frenchVoices.forEach(v => {
                    createEdgeVoicesCache[v.id] = v;
                    edgeVoicesRawList.push(v);
                });
            }
            if (data.englishVoices && Array.isArray(data.englishVoices)) {
                data.englishVoices.slice(0, 40).forEach(v => {
                    createEdgeVoicesCache[v.id] = v;
                    edgeVoicesRawList.push(v);
                });
            }
            if (data.voices && Array.isArray(data.voices) && edgeVoicesRawList.length === 0) {
                data.voices.slice(0, 40).forEach(v => {
                    createEdgeVoicesCache[v.id] = v;
                    edgeVoicesRawList.push(v);
                });
            }

            if (edgeVoicesRawList.length === 0) return false;

            renderVoiceRows('edge', edgeVoicesRawList);

            const savedEdge = localStorage.getItem('vibeeditor_edge_voice_id');
            const initial = (savedEdge && createEdgeVoicesCache[savedEdge]) ? savedEdge : (createEdgeVoicesCache['fr-FR-HenriNeural'] ? 'fr-FR-HenriNeural' : edgeVoicesRawList[0].id);
            selectVoiceItem('edge', initial);
            return true;
        }

        async function loadEdgeVoicesForCreateVideo(forceRefresh = false) {
            let hasLoadedFromCache = false;
            if (!forceRefresh) {
                try {
                    const cachedStr = localStorage.getItem('marvidflow_cached_edge_voices');
                    if (cachedStr) {
                        const cachedData = JSON.parse(cachedStr);
                        hasLoadedFromCache = applyEdgeVoicesData(cachedData);
                    }
                } catch(e) {}
            }

            try {
                let data = null;
                const res = await fetch('/api/edge/voices');
                if (res.ok) data = await res.json();

                if (data && data.success && (data.frenchVoices || data.voices)) {
                    localStorage.setItem('marvidflow_cached_edge_voices', JSON.stringify(data));
                    applyEdgeVoicesData(data);
                } else if (!hasLoadedFromCache) {
                    throw new Error("Aucune voix Edge TTS reçue");
                }
            } catch(e) {
                if (!hasLoadedFromCache && edgeVoicesRawList.length === 0) {
                    const list = document.getElementById('listEdgeItems');
                    if (list) list.innerHTML = '<div style="padding:14px; color:#ff4444; font-size:12px;">Voix non disponibles</div>';
                    const triggerText = document.getElementById('nameEdgeSelected');
                    if (triggerText) triggerText.textContent = 'Sélectionner une voix';
                }
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

            const payload = {
                fileName: autoName,
                prompt,
                preferredAi,
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
                    statusEl.textContent = '✓ Modifications enregistrées dans 09_Pages/feuille_de_route.md !';
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
    


        // =====================================================================
        // VUE DÉTAILLÉE D'UNE CHAÎNE & MODAL PARAMÈTRES (TRANSPOSITION COMPLETE)
        // =====================================================================
        let currentDetailChannelId = null;

        function openChannelDetailView(channelId) {
            const channel = channelsCache.find(c => c.id === channelId);
            if (!channel) return;

            currentDetailChannelId = channelId;

            // Masquer la vue d'ensemble et afficher le détail
            document.getElementById('reseauxOverviewContainer').style.display = 'none';
            document.getElementById('channelDetailContainer').style.display = 'block';

            // Remplir les données de l'en-tête
            document.getElementById('detailChannelName').textContent = channel.name;
            const fallbackEl = document.getElementById('detailChannelFallback');
            const avatarEl = document.getElementById('detailChannelAvatar');

            if (channel.avatar) {
                avatarEl.style.backgroundImage = `url('../${channel.avatar.replace(/^\.\.\//, '')}')`;
                fallbackEl.style.display = 'none';
            } else {
                avatarEl.style.backgroundImage = '';
                fallbackEl.style.display = 'block';
                fallbackEl.textContent = channel.name.charAt(0).toUpperCase();
            }

            // Platform badge
            const pBadge = document.getElementById('detailChannelPlatformBadge');
            pBadge.className = 'badge-platform ' + (channel.platform === 'Instagram' ? 'instagram' : (channel.platform === 'TikTok' ? 'tiktok' : 'youtube'));
            pBadge.textContent = channel.platform;

            // Format badge
            document.getElementById('detailChannelFormatBadge').textContent = channel.format || '16:9';

            // Filtrer les vidéos de cette chaîne
            const channelVideos = allVideosList.filter(v => v.channelId === channelId);
            document.getElementById('detailChannelVideosCount').textContent = `${channelVideos.length} vidéo${channelVideos.length > 1 ? 's' : ''}`;
            document.getElementById('detailVideosCountBadge').textContent = `${channelVideos.length} vidéo${channelVideos.length > 1 ? 's' : ''}`;
            document.getElementById('detailChannelDescText').textContent = channel.description || (channel.format === '9:16' ? 'Format vertical Shorts / Reels' : 'Format paysage YouTube');

            const grid = document.getElementById('detailChannelVideosGrid');
            if (channelVideos.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 36px; height: 36px; margin-bottom: 8px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        <h4 style="color:#ffffff; margin-bottom: 6px;">Aucune vidéo publiée pour cette chaîne</h4>
                        <p style="font-size: 12px; margin-bottom: 16px;">Générez votre première vidéo dédiée avec vos paramètres de marque.</p>
                        <button type="button" class="btn-create-video-head" onclick="openCreateVideoForCurrentDetailChannel()">+ Créer une Vidéo pour cette chaîne</button>
                    </div>
                `;
            } else {
                grid.innerHTML = channelVideos.map(v => renderVideoCardHtml(v)).join('');
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function closeChannelDetailView() {
            currentDetailChannelId = null;
            document.getElementById('reseauxOverviewContainer').style.display = 'block';
            document.getElementById('channelDetailContainer').style.display = 'none';
            renderChannelsView();
        }

        function openCreateVideoForCurrentDetailChannel() {
            if (currentDetailChannelId) {
                openCreateVideoView(currentDetailChannelId);
            } else {
                openCreateVideoView();
            }
        }

        // --- MODAL PARAMÈTRES ET BRAND KIT DE LA CHAÎNE ---
        function syncChannelColor(sourceColorId, targetHexId) {
            const val = document.getElementById(sourceColorId).value;
            document.getElementById(targetHexId).value = val.toUpperCase();
            updateChannelModalLivePreview();
        }

        function syncChannelHex(sourceHexId, targetColorId) {
            let val = document.getElementById(sourceHexId).value.trim();
            if (!val.startsWith('#') && /^[0-9A-Fa-f]{6}$/.test(val)) val = '#' + val;
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                document.getElementById(targetColorId).value = val;
                updateChannelModalLivePreview();
            }
        }

        function updateChannelModalLivePreview() {
            const fPrim = (document.getElementById('editChannelFontPrimary')?.value || 'Montserrat').trim();
            const fSec = (document.getElementById('editChannelFontSecondary')?.value || 'Inter').trim();
            const fAcc = (document.getElementById('editChannelFontAccent')?.value || 'Caveat').trim();

            // Badges / Tags des polices — TOUS HARMONISÉS EN ROUGE VIF
            const tagPrim = document.getElementById('tagChannelFontPrimary');
            if (tagPrim) {
                tagPrim.textContent = fPrim;
                tagPrim.style.fontFamily = `"${fPrim}", sans-serif`;
                tagPrim.style.color = '#ff3344';
            }

            const tagSec = document.getElementById('tagChannelFontSecondary');
            if (tagSec) {
                tagSec.textContent = fSec;
                tagSec.style.fontFamily = `"${fSec}", sans-serif`;
                tagSec.style.color = '#ff3344';
            }

            const tagAcc = document.getElementById('tagChannelFontAccent');
            if (tagAcc) {
                tagAcc.textContent = fAcc;
                tagAcc.style.fontFamily = `"${fAcc}", cursive, sans-serif`;
                tagAcc.style.color = '#ff3344';
            }

            // Spécimens d'aperçu textuel en direct — TOUS HARMONISÉS EN ROUGE VIF
            const spPrim = document.getElementById('specimenChannelFontPrimary');
            if (spPrim) {
                spPrim.style.fontFamily = `"${fPrim}", sans-serif`;
                spPrim.style.color = '#ff3344';
            }

            const spSec = document.getElementById('specimenChannelFontSecondary');
            if (spSec) {
                spSec.style.fontFamily = `"${fSec}", sans-serif`;
                spSec.style.color = '#ff3344';
            }

            const spAcc = document.getElementById('specimenChannelFontAccent');
            if (spAcc) {
                spAcc.style.fontFamily = `"${fAcc}", cursive, sans-serif`;
                spAcc.style.color = '#ff3344';
            }
        }

        async function scanMachineFontsForChannelModal() {
            const datalist = document.getElementById('channelSystemFontsDatalist');
            if (!datalist) return;
            if (!('queryLocalFonts' in window)) {
                showToast('API locale non disponible sur ce navigateur. 40+ polices populaires déjà incluses !', 'ℹ️');
                return;
            }
            try {
                showToast('Scanning des polices installées sur votre PC...', '⏳');
                const fonts = await window.queryLocalFonts();
                const fontNames = Array.from(new Set(fonts.map(f => f.family))).sort();
                datalist.innerHTML = '';
                fontNames.forEach(name => {
                    const opt = document.createElement('option');
                    opt.value = name;
                    datalist.appendChild(opt);
                });
                showToast(`${fontNames.length} polices de votre système détectées !`, '✨');
            } catch(e) {
                showToast('Autorisation de scan refusée ou annulée.', '⚠️');
            }
        }

        function openChannelSettingsModal(channelId) {
            const channel = channelsCache.find(c => c.id === channelId);
            if (!channel) return;

            document.getElementById('editChannelId').value = channel.id;
            document.getElementById('editChannelNameInput').value = channel.name || '';
            document.getElementById('editChannelPlatformInput').value = channel.platform || 'YouTube';
            document.getElementById('editChannelFormatInput').value = channel.format || '16:9';
            document.getElementById('editChannelDescInput').value = channel.description || '';

            // Brand Kit : 2 Couleurs officielles
            const colPri = (channel.colorPrimary || '#ffffff').trim();
            const colSec = (channel.colorSecondary || '#dc2626').trim();
            const elPri = document.getElementById('editChannelColorPrimary');
            const elPriHex = document.getElementById('editChannelColorPrimaryHex');
            const elSec = document.getElementById('editChannelColorSecondary');
            const elSecHex = document.getElementById('editChannelColorSecondaryHex');
            if (elPri) elPri.value = colPri.startsWith('#') ? colPri : '#' + colPri;
            if (elPriHex) elPriHex.value = (elPri ? elPri.value : colPri).toUpperCase();
            if (elSec) elSec.value = colSec.startsWith('#') ? colSec : '#' + colSec;
            if (elSecHex) elSecHex.value = (elSec ? elSec.value : colSec).toUpperCase();

            // Brand Kit : Les 3 Polices de la chaîne (Primaire, Secondaire, Accent)
            let fPrim = channel.fontPrimary || '';
            let fSec = channel.fontSecondary || '';
            let fAcc = channel.fontAccent || '';
            if (!fPrim && channel.fonts) {
                const parts = channel.fonts.split(',').map(s => s.trim()).filter(Boolean);
                fPrim = parts[0] || '';
                fSec = parts[1] || '';
                fAcc = parts[2] || '';
            }
            const inPrim = document.getElementById('editChannelFontPrimary');
            const inSec = document.getElementById('editChannelFontSecondary');
            const inAcc = document.getElementById('editChannelFontAccent');
            if (inPrim) inPrim.value = fPrim || 'Montserrat';
            if (inSec) inSec.value = fSec || 'Inter';
            if (inAcc) inAcc.value = fAcc || 'Caveat';

            updateChannelModalLivePreview();

            const avatarPreview = document.getElementById('editChannelAvatarPreview');
            const fallback = document.getElementById('editChannelAvatarFallback');

            if (channel.avatar) {
                avatarPreview.style.backgroundImage = `url('../${channel.avatar.replace(/^\.\.\//, '')}')`;
                fallback.style.display = 'none';
            } else {
                avatarPreview.style.backgroundImage = '';
                fallback.style.display = 'block';
                fallback.textContent = (channel.name || 'C').charAt(0).toUpperCase();
            }

            document.getElementById('channelSettingsModal').classList.add('open');
        }

        function closeChannelSettingsModal() {
            document.getElementById('channelSettingsModal').classList.remove('open');
        }

        let editChannelAvatarBase64 = null;
        function handleEditChannelAvatarSelected(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                editChannelAvatarBase64 = evt.target.result;
                const preview = document.getElementById('editChannelAvatarPreview');
                const fallback = document.getElementById('editChannelAvatarFallback');
                preview.style.backgroundImage = `url('${editChannelAvatarBase64}')`;
                fallback.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }

        async function saveChannelSettingsModal() {
            const id = document.getElementById('editChannelId').value;
            const name = document.getElementById('editChannelNameInput').value.trim();
            const platform = document.getElementById('editChannelPlatformInput').value;
            const format = document.getElementById('editChannelFormatInput').value;
            const desc = document.getElementById('editChannelDescInput').value.trim();

            if (!name) {
                showToast('Veuillez saisir un nom pour la chaîne.', '⚠️');
                return;
            }

            const channel = channelsCache.find(c => c.id === id);
            if (channel) {
                channel.name = name;
                channel.platform = platform;
                channel.format = format;
                channel.description = desc;

                // Sauvegarde 2 couleurs
                const elPri = document.getElementById('editChannelColorPrimary');
                const elSec = document.getElementById('editChannelColorSecondary');
                if (elPri) channel.colorPrimary = elPri.value;
                if (elSec) channel.colorSecondary = elSec.value;

                // Sauvegarde 3 Polices
                const fPrim = document.getElementById('editChannelFontPrimary')?.value.trim() || 'Montserrat';
                const fSec = document.getElementById('editChannelFontSecondary')?.value.trim() || 'Inter';
                const fAcc = document.getElementById('editChannelFontAccent')?.value.trim() || 'Caveat';
                channel.fontPrimary = fPrim;
                channel.fontSecondary = fSec;
                channel.fontAccent = fAcc;
                channel.fonts = [fPrim, fSec, fAcc].filter(Boolean).join(', ');

                if (editChannelAvatarBase64) {
                    channel.avatar = editChannelAvatarBase64;
                    editChannelAvatarBase64 = null;
                }

                try {
                    await fetch('/api/channels/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(channel)
                    });
                } catch (e) {}
            }

            closeChannelSettingsModal();
            showToast('Paramètres et Brand Kit enregistrés avec succès !');

            // Mettre à jour l'affichage
            if (currentDetailChannelId === id) {
                openChannelDetailView(id);
            }
            renderChannelsView();
        }


/* --- LOGIQUE JS COMPLETE PARAMETRES.HTML --- */

        const PREF_KEY_TTS_ENGINE = 'vibeeditor_pref_tts_engine';
        const PREF_KEY_FORMAT = 'vibeeditor_pref_format';
        const PREF_KEY_FPS = 'vibeeditor_pref_fps';
        const PREF_KEY_QUALITY = 'vibeeditor_pref_quality';
        const PREF_KEY_TEMPLATE = 'vibeeditor_pref_template';
        const PREF_KEY_SUBTITLE_STYLE = 'vibeeditor_pref_subtitle_style';
        const API_KEY_GOOGLE = 'vibeeditor_api_google';

        const PREF_KEY_GEMINI_MODEL = 'vibeeditor_pref_gemini_model';

        function handleGeminiModelChange(val) {
            const wrap = document.getElementById('customGeminiModelWrapper');
            if (wrap) wrap.style.display = (val === 'custom') ? 'block' : 'none';
        }

        function setGeminiModelUI(modelName) {
            const sel = document.getElementById('prefGeminiModel');
            const wrap = document.getElementById('customGeminiModelWrapper');
            const customInput = document.getElementById('customGeminiModel');
            if (!sel) return;
            const clean = (modelName || 'gemini-3.5-flash-lite').trim();
            const exists = Array.from(sel.options).some(o => o.value === clean);
            if (exists) {
                sel.value = clean;
                if (wrap) wrap.style.display = 'none';
            } else {
                sel.value = 'custom';
                if (wrap) wrap.style.display = 'block';
                if (customInput) customInput.value = clean;
            }
        }

        const API_KEY_ELEVENLABS = 'vibeeditor_api_elevenlabs';
        const ELEVENLABS_VOICE_ID = 'vibeeditor_elevenlabs_voice_id';
        const ELEVENLABS_MODEL_ID = 'vibeeditor_elevenlabs_model_id';
        const API_KEY_PIXABAY = 'vibeeditor_api_pixabay';
        const API_KEY_COVERR = 'vibeeditor_api_coverr';
        const API_KEY_BRANDFETCH = 'vibeeditor_api_brandfetch';
        const API_KEY_BG_REMOVE = 'vibeeditor_api_bg_remove';
        const API_KEY_SKETCHFAB = 'vibeeditor_api_sketchfab';
        const EDGE_VOICE_ID = 'vibeeditor_edge_voice_id';

        // Caches et états
        let voicesCache = {};
        let edgeVoicesCache = {};
        let settingsEdgeRawList = [];
        let keyChangeTimeout = null;
        let previewAudioInstance = null;

        
        // =========================================================================
        // GESTION DU KOMBO IA & DÉTECTION DES AGENTS LOCAUX
        // =========================================================================
        const API_KEY_GROQ = 'vibeeditor_api_key_groq';
        const API_KEY_OPENROUTER = 'vibeeditor_api_key_openrouter';

        let detectedAgents = { claude: { installed: false }, agy: { installed: false } };

        let defaultKomboOrder = [
            { id: 'gemini', name: 'Google Gemini', desc: 'Modèle IA natif polyvalent', model: 'gemini-3.5-flash-lite', enabled: true },
            { id: 'groq', name: 'Groq Cloud AI', desc: 'Inférence éclair Qwen 3.8 & GPT-OSS 120B', model: 'qwen/qwen3.8-27b', enabled: true },
            { id: 'openrouter', name: 'OpenRouter (Modèles Gratuits)', desc: 'Nemotron Reasoning, Flint, Ling', model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', enabled: true },
            { id: 'claude_cli', name: 'Claude Code CLI (Local)', desc: 'Agent local Anthropic', model: 'local', enabled: true },
            { id: 'agy_cli', name: 'Antigravity CLI (Local)', desc: 'Agent local Google Antigravity', model: 'local', enabled: true }
        ];

        let currentKomboOrder = [...defaultKomboOrder];

        async function detectLocalAiAgentsUi(showToastMsg = false) {
            const badgeClaude = document.getElementById('badgeClaudeStatus');
            const badgeAgy = document.getElementById('badgeAgyStatus');
            const textClaude = document.getElementById('versionClaudeText');
            const textAgy = document.getElementById('versionAgyText');

            if (badgeClaude) badgeClaude.textContent = 'Détection...';
            if (badgeAgy) badgeAgy.textContent = 'Détection...';

            try {
                const res = await fetch('/api/ai/detect');
                if (!res.ok) {
                    throw new Error(`Serveur HTTP ${res.status}`);
                }
                const data = await res.json();
                if (data.success && data.agents) {
                    detectedAgents = data.agents;

                    // Mise à jour Claude Code
                    if (data.agents.claude && data.agents.claude.installed) {
                        if (badgeClaude) {
                            badgeClaude.className = 'agent-status-badge detected';
                            badgeClaude.innerHTML = '🔵 Détecté (À tester)';
                        }
                        if (textClaude) textClaude.textContent = (data.agents.claude.version || 'Claude Code CLI') + ' • Cliquez sur ⚡ Tester ci-dessous';
                    } else {
                        if (badgeClaude) {
                            badgeClaude.className = 'agent-status-badge not-detected';
                            badgeClaude.innerHTML = '⚪ Non détecté';
                        }
                        if (textClaude) textClaude.textContent = 'Non installé dans le PATH';
                    }

                    // Mise à jour Antigravity
                    if (data.agents.agy && data.agents.agy.installed) {
                        if (badgeAgy) {
                            badgeAgy.className = 'agent-status-badge detected';
                            badgeAgy.innerHTML = '🔵 Détecté (À tester)';
                        }
                        const v = data.agents.agy.version || 'Antigravity CLI';
                        if (textAgy) textAgy.textContent = (v.startsWith('Antigravity') ? v : `Antigravity ${v}`) + ' • Démarrage agent (~25-30s)';
                    } else {
                        if (badgeAgy) {
                            badgeAgy.className = 'agent-status-badge not-detected';
                            badgeAgy.innerHTML = '⚪ Non détecté';
                        }
                        if (textAgy) textAgy.textContent = 'Non installé dans le PATH';
                    }

                    renderKomboListUI();

                    if (showToastMsg && typeof showToast === 'function') {
                        const foundCount = (data.agents.claude.installed ? 1 : 0) + (data.agents.agy.installed ? 1 : 0);
                        showToast(`${foundCount} agent(s) local/locaux détecté(s) !`);
                    }
                }
            } catch (err) {
                console.warn('Détection agents locaux non disponible:', err.message);
                if (badgeClaude) {
                    badgeClaude.className = 'agent-status-badge not-detected';
                    badgeClaude.innerHTML = '⚠️ Redémarrer serveur';
                }
                if (textClaude) textClaude.textContent = 'Redémarrez le terminal serveur (node 07_Scripts/studio-server.cjs)';
                if (badgeAgy) {
                    badgeAgy.className = 'agent-status-badge not-detected';
                    badgeAgy.innerHTML = '⚠️ Redémarrer serveur';
                }
                if (textAgy) textAgy.textContent = 'Pour charger les nouvelles routes API';
            }
        }

        function renderKomboListUI() {
            const wrapper = document.getElementById('komboListWrapper');
            if (!wrapper) return;

            wrapper.innerHTML = '';

            currentKomboOrder.forEach((item, index) => {
                const card = document.createElement('div');
                const isPrimary = index === 0;
                card.className = `kombo-item-card ${item.enabled ? 'is-active' : 'is-disabled'} ${isPrimary ? 'is-primary' : ''}`;

                const priorityLabel = isPrimary 
                    ? '1️⃣ Prioritaire (Par défaut)' 
                    : `${index + 1}️⃣ Secours ${index}`;

                let modelSelectHtml = '';
                if (item.id === 'gemini') {
                    modelSelectHtml = `
                        <select class="kombo-model-select" onchange="onKomboModelChanged(${index}, this.value)" title="Choisir le modèle Gemini">
                            <option value="gemini-3.5-flash-lite" ${item.model === 'gemini-3.5-flash-lite' ? 'selected' : ''}>gemini-3.5-flash-lite (Gratuit standard)</option>
                            <option value="gemini-3.5-flash" ${item.model === 'gemini-3.5-flash' ? 'selected' : ''}>gemini-3.5-flash</option>
                            <option value="gemini-flash-latest" ${item.model === 'gemini-flash-latest' ? 'selected' : ''}>gemini-flash-latest</option>
                            <option value="gemini-3.7-flash" ${item.model === 'gemini-3.7-flash' ? 'selected' : ''}>gemini-3.7-flash</option>
                        </select>
                    `;
                } else if (item.id === 'groq') {
                    modelSelectHtml = `
                        <select class="kombo-model-select" onchange="onKomboModelChanged(${index}, this.value)" title="Choisir le modèle Groq">
                            <option value="qwen/qwen3.8-27b" ${item.model === 'qwen/qwen3.8-27b' ? 'selected' : ''}>qwen/qwen3.8-27b (Qwen 3.8)</option>
                            <option value="openai/gpt-oss-120b" ${item.model === 'openai/gpt-oss-120b' ? 'selected' : ''}>openai/gpt-oss-120b (GPT-OSS 120B)</option>
                        </select>
                    `;
                } else if (item.id === 'openrouter') {
                    modelSelectHtml = `
                        <select class="kombo-model-select" onchange="onKomboModelChanged(${index}, this.value)" title="Choisir le modèle OpenRouter">
                            <option value="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free" ${item.model === 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free' ? 'selected' : ''}>nvidia/nemotron-3-nano-omni-30b (Reasoning)</option>
                            <option value="recursive/flint-v1.0:free" ${item.model === 'recursive/flint-v1.0:free' ? 'selected' : ''}>recursive/flint-v1.0:free (Chat)</option>
                            <option value="inclusionai/ling-3.2-flash:free" ${item.model === 'inclusionai/ling-3.2-flash:free' ? 'selected' : ''}>inclusionai/ling-3.2-flash:free (Flash)</option>
                        </select>
                    `;
                } else if (item.id === 'claude_cli') {
                    const isInst = detectedAgents.claude && detectedAgents.claude.installed;
                    modelSelectHtml = `<span style="font-size: 11px; font-family:'JetBrains Mono',monospace; color: ${isInst ? '#38bdf8' : '#94a3b8'};">${isInst ? 'CLI Détecté' : 'Non détecté'}</span>`;
                } else if (item.id === 'agy_cli') {
                    const isInst = detectedAgents.agy && detectedAgents.agy.installed;
                    modelSelectHtml = `<span style="font-size: 11px; font-family:'JetBrains Mono',monospace; color: ${isInst ? '#38bdf8' : '#94a3b8'};">${isInst ? 'CLI Détecté' : 'Non détecté'}</span>`;
                }

                card.innerHTML = `
                    <div class="kombo-left-group">
                        <input type="checkbox" ${item.enabled ? 'checked' : ''} onchange="toggleKomboItem(${index})" style="accent-color: #3b82f6; width: 16px; height: 16px; cursor: pointer;" title="Activer / Désactiver ce modèle dans le Kombo">
                        <span class="kombo-priority-tag">${priorityLabel}</span>
                        <div class="kombo-name-block">
                            <span class="kombo-name">${item.name}</span>
                        </div>
                    </div>
                    <div class="kombo-right-group">
                        ${modelSelectHtml}
                        <button type="button" class="kombo-order-btn" onclick="moveKomboItem(${index}, -1)" ${index === 0 ? 'disabled' : ''} title="Monter la priorité d'un cran (vers le haut)">
                            ▲
                        </button>
                        <button type="button" class="kombo-order-btn" onclick="moveKomboItem(${index}, 1)" ${index === currentKomboOrder.length - 1 ? 'disabled' : ''} title="Descendre la priorité d'un cran (vers le bas)">
                            ▼
                        </button>
                        <button type="button" class="btn-secondary" onclick="testProviderQuick('${item.id}', this)" style="padding: 5px 10px; font-size: 11px; white-space: nowrap;">
                            <span>⚡ Tester</span>
                        </button>
                    </div>
                `;

                wrapper.appendChild(card);
            });
        }

        function moveKomboItem(index, direction) {
            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= currentKomboOrder.length) return;
            const temp = currentKomboOrder[index];
            currentKomboOrder[index] = currentKomboOrder[newIndex];
            currentKomboOrder[newIndex] = temp;
            try { localStorage.setItem('autoframe_ai_kombo_order', JSON.stringify(currentKomboOrder)); } catch (e) {}
            renderKomboListUI();
        }

        function toggleKomboItem(index) {
            currentKomboOrder[index].enabled = !currentKomboOrder[index].enabled;
            try { localStorage.setItem('autoframe_ai_kombo_order', JSON.stringify(currentKomboOrder)); } catch (e) {}
            renderKomboListUI();
        }

        function onKomboModelChanged(index, newModel) {
            currentKomboOrder[index].model = newModel;
            try { localStorage.setItem('autoframe_ai_kombo_order', JSON.stringify(currentKomboOrder)); } catch (e) {}
            if (currentKomboOrder[index].id === 'gemini') {
                const sel = document.getElementById('prefGeminiModel');
                if (sel) sel.value = newModel;
            }
        }

        async function testProviderQuick(providerId, btnEl) {
            const origHtml = btnEl ? btnEl.innerHTML : '';
            const isLocalAgent = providerId === 'agy_cli' || providerId === 'claude_cli';
            if (btnEl) {
                btnEl.disabled = true;
                btnEl.innerHTML = isLocalAgent ? '<span>⏳ CLI (~25s)...</span>' : '<span>Test...</span>';
            }

            try {
                const item = currentKomboOrder.find(k => k.id === providerId) || { model: '' };
                let currentKey = '';
                if (providerId === 'groq') currentKey = document.getElementById('apiKeyGroq')?.value || '';
                else if (providerId === 'gemini') currentKey = document.getElementById('apiKeyGoogle')?.value || '';
                else if (providerId === 'openrouter') currentKey = document.getElementById('apiKeyOpenrouter')?.value || '';

                const res = await fetch('/api/ai/test-provider', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ provider: providerId, model: item.model, apiKey: currentKey })
                });
                const data = await res.json();
                if (data.success) {
                    if (typeof showToast === 'function') showToast(`${item.name || providerId} : Connexion réussie (${data.latencyMs}ms) !`);
                    if (btnEl) btnEl.innerHTML = `<span style="color:#34d399;">✓ ${data.latencyMs}ms</span>`;
                    if (providerId === 'claude_cli') {
                        const badge = document.getElementById('badgeClaudeStatus');
                        if (badge) { badge.className = 'agent-status-badge detected'; badge.innerHTML = '🟢 Opérationnel'; }
                    } else if (providerId === 'agy_cli') {
                        const badge = document.getElementById('badgeAgyStatus');
                        if (badge) { badge.className = 'agent-status-badge detected'; badge.innerHTML = '🟢 Opérationnel'; }
                    }
                } else {
                    const errStr = data.error || 'Erreur inconnue';
                    if (providerId === 'claude_cli') {
                        const badge = document.getElementById('badgeClaudeStatus');
                        if (badge) { badge.className = 'agent-status-badge not-detected'; badge.innerHTML = '🔴 Échec test'; }
                    } else if (providerId === 'agy_cli') {
                        const badge = document.getElementById('badgeAgyStatus');
                        if (badge) { badge.className = 'agent-status-badge not-detected'; badge.innerHTML = '🔴 Échec test'; }
                    }
                    if (errStr.includes('blocked at the project level')) {
                        if (typeof showToast === 'function') showToast(`Groq : Modèle bloqué sur console.groq.com (Settings > Project limits)`, 'error');
                        if (btnEl) btnEl.innerHTML = '<span style="color:#f87171;">Projet bloqué</span>';
                    } else if (errStr.includes('401') || errStr.toLowerCase().includes('unauthorized')) {
                        if (typeof showToast === 'function') showToast(`${item.name || providerId} : Session ou clé non autorisée (401).`, 'error');
                        if (btnEl) btnEl.innerHTML = '<span style="color:#f87171;">Auth requise (401)</span>';
                    } else {
                        if (typeof showToast === 'function') showToast(`${item.name || providerId} : Échec (${errStr.slice(0, 100)})`, 'error');
                        if (btnEl) btnEl.innerHTML = '<span style="color:#f87171;">Échec</span>';
                    }
                }
            } catch (e) {
                if (typeof showToast === 'function') showToast(`Erreur test ${providerId}: ${e.message}`, 'error');
                if (btnEl) btnEl.innerHTML = '<span style="color:#f87171;">Erreur</span>';
            } finally {
                setTimeout(() => {
                    if (btnEl) {
                        btnEl.disabled = false;
                        btnEl.innerHTML = origHtml;
                    }
                }, 4000);
            }
        }

        async function testEntireKomboChain() {
            const btn = document.getElementById('btnTestEntireKombo');
            const box = document.getElementById('komboTestResultsBox');
            if (btn) btn.disabled = true;
            if (box) {
                box.style.display = 'block';
                box.innerHTML = '<div style="color:#60a5fa;">⚡ Lancement du test séquentiel du Kombo IA...</div>';
            }

            const activeItems = currentKomboOrder.filter(k => k.enabled);

            for (let i = 0; i < activeItems.length; i++) {
                const item = activeItems[i];
                const priorityText = i === 0 ? '1er Prioritaire' : `Secours ${i}`;
                box.innerHTML += `<div>→ Test de ${item.name} (${item.model})...</div>`;

                try {
                    const res = await fetch('/api/ai/test-provider', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ provider: item.id, model: item.model })
                    });
                    const data = await res.json();
                    if (data.success) {
                        box.innerHTML += `<div style="color:#34d399;">  ✓ [${priorityText}] ${item.name} : ${data.latencyMs}ms - Réponse valide reçue</div>`;
                    } else {
                        box.innerHTML += `<div style="color:#f87171;">  ✗ [${priorityText}] ${item.name} : ${data.error || 'Erreur'}</div>`;
                    }
                } catch (e) {
                    box.innerHTML += `<div style="color:#f87171;">  ✗ [${priorityText}] ${item.name} : ${e.message}</div>`;
                }
            }

            box.innerHTML += '<div style="margin-top:6px; color:#ffffff; font-weight:700;">Test du Kombo terminé.</div>';
            if (btn) btn.disabled = false;
        }

        function handleGroqKeyChange() {
            const el = document.getElementById('apiKeyGroq');
            if (!el) return;
            let v = el.value.trim().replace(/['"]/g, '');
            const second = v.indexOf('gsk_', 4);
            if (second !== -1) {
                v = v.slice(0, second).trim();
                el.value = v;
                if (typeof showToast === 'function') showToast('Clé Groq dédoublonnée automatiquement');
            }
        }
        function handleOpenRouterKeyChange() {}

        function normalizeKomboModels(list) {
            if (!Array.isArray(list)) return;
            const openrouterItem = list.find(k => k.id === 'openrouter');
            if (openrouterItem && (!openrouterItem.model || openrouterItem.model.includes('nemotron-4-340b') || openrouterItem.model.includes('embed') || openrouterItem.model.includes('rerank'))) {
                openrouterItem.model = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';
            }
            const geminiItem = list.find(k => k.id === 'gemini');
            if (geminiItem && (geminiItem.model.includes('argon') || geminiItem.model.includes('pro'))) {
                geminiItem.model = 'gemini-3.5-flash-lite';
            }
            const groqItem = list.find(k => k.id === 'groq');
            if (groqItem && (!groqItem.model || groqItem.model.includes('llama') || groqItem.model.includes('mixtral'))) {
                groqItem.model = 'qwen/qwen3.8-27b';
            }
        }

        // CHARGEMENT INITIAL (LocalStorage + /api/settings api_config.json)
        window.addEventListener('load', async () => {
            // Initialisation synchrone immédiate du Kombo IA
            try {
                const savedKombo = localStorage.getItem('autoframe_ai_kombo_order');
                if (savedKombo) currentKomboOrder = JSON.parse(savedKombo);
            } catch (e) {}
            normalizeKomboModels(currentKomboOrder);
            renderKomboListUI();
            detectLocalAiAgentsUi(false);
            // 1. LocalStorage
            const savedTtsEngine = localStorage.getItem(PREF_KEY_TTS_ENGINE);
            if (savedTtsEngine && document.getElementById('prefTtsEngine')) document.getElementById('prefTtsEngine').value = savedTtsEngine;
            const savedFormat = localStorage.getItem(PREF_KEY_FORMAT);
            const savedFps = localStorage.getItem(PREF_KEY_FPS);
            const savedQuality = localStorage.getItem(PREF_KEY_QUALITY);
            const savedTemplate = localStorage.getItem(PREF_KEY_TEMPLATE);
            const savedSubtitleStyle = localStorage.getItem(PREF_KEY_SUBTITLE_STYLE);
            const savedGoogle = localStorage.getItem(API_KEY_GOOGLE);

            let savedGeminiModel = localStorage.getItem(PREF_KEY_GEMINI_MODEL);
            if (savedGeminiModel && (savedGeminiModel.includes('argon') || savedGeminiModel.includes('pro'))) {
                savedGeminiModel = 'gemini-3.5-flash-lite';
                localStorage.setItem(PREF_KEY_GEMINI_MODEL, 'gemini-3.5-flash-lite');
            }
            if (savedGeminiModel) setGeminiModelUI(savedGeminiModel);

            const savedElevenlabs = localStorage.getItem(API_KEY_ELEVENLABS);
            let savedElevenVoice = localStorage.getItem(ELEVENLABS_VOICE_ID);
            const savedElevenModel = localStorage.getItem(ELEVENLABS_MODEL_ID);
            const savedPixabay = localStorage.getItem(API_KEY_PIXABAY);
            const savedCoverr = localStorage.getItem(API_KEY_COVERR);
            const savedBrandfetch = localStorage.getItem(API_KEY_BRANDFETCH);
            const savedBgRemove = localStorage.getItem(API_KEY_BG_REMOVE);
            const savedSketchfab = localStorage.getItem(API_KEY_SKETCHFAB);
            let savedEdgeVoice = localStorage.getItem(EDGE_VOICE_ID) || 'fr-FR-HenriNeural';

            if (savedFormat && document.getElementById('prefFormat')) document.getElementById('prefFormat').value = savedFormat;
            if (savedFps && document.getElementById('prefFps')) document.getElementById('prefFps').value = savedFps;
            if (savedQuality && document.getElementById('prefQuality')) document.getElementById('prefQuality').value = savedQuality;
            if (savedTemplate && document.getElementById('prefTemplate')) document.getElementById('prefTemplate').value = savedTemplate;
            if (savedSubtitleStyle && document.getElementById('prefSubtitleStyle')) document.getElementById('prefSubtitleStyle').value = savedSubtitleStyle;
            if (savedGoogle && document.getElementById('apiKeyGoogle')) document.getElementById('apiKeyGoogle').value = savedGoogle;
            if (savedElevenlabs && document.getElementById('apiKeyElevenlabs')) document.getElementById('apiKeyElevenlabs').value = savedElevenlabs;
            if (savedElevenModel && document.getElementById('elevenlabsModelId')) document.getElementById('elevenlabsModelId').value = savedElevenModel;
            if (savedPixabay && document.getElementById('apiKeyPixabay')) document.getElementById('apiKeyPixabay').value = savedPixabay;
            if (savedCoverr && document.getElementById('apiKeyCoverr')) document.getElementById('apiKeyCoverr').value = savedCoverr;
            if (savedBrandfetch && document.getElementById('apiKeyBrandfetch')) document.getElementById('apiKeyBrandfetch').value = savedBrandfetch;
            if (savedBgRemove && document.getElementById('apiKeyBgRemove')) document.getElementById('apiKeyBgRemove').value = savedBgRemove;
            if (savedSketchfab && document.getElementById('apiKeySketchfab')) document.getElementById('apiKeySketchfab').value = savedSketchfab;

            // 2. Synchronisation complète depuis le serveur (/api/settings -> api_config.json)
            let activeElevenKey = savedElevenlabs || '';

            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const cfg = await res.json();
                    if (cfg.tts_engine && document.getElementById('prefTtsEngine')) {
                        document.getElementById('prefTtsEngine').value = cfg.tts_engine;
                        localStorage.setItem(PREF_KEY_TTS_ENGINE, cfg.tts_engine);
                    }
                    if (cfg.pref_format && !savedFormat && document.getElementById('prefFormat')) document.getElementById('prefFormat').value = cfg.pref_format;
                    if (cfg.pref_fps && !savedFps && document.getElementById('prefFps')) document.getElementById('prefFps').value = cfg.pref_fps;
                    if (cfg.pref_quality && !savedQuality && document.getElementById('prefQuality')) document.getElementById('prefQuality').value = cfg.pref_quality;
                    if (cfg.pref_template && !savedTemplate && document.getElementById('prefTemplate')) document.getElementById('prefTemplate').value = cfg.pref_template;
                    if (cfg.pref_subtitle_style && !savedSubtitleStyle && document.getElementById('prefSubtitleStyle')) document.getElementById('prefSubtitleStyle').value = cfg.pref_subtitle_style;

                    
                    
                    if (cfg.groq_api_key && document.getElementById('apiKeyGroq')) {
                        document.getElementById('apiKeyGroq').value = cfg.groq_api_key;
                        localStorage.setItem(API_KEY_GROQ, cfg.groq_api_key);
                    }
                    if (cfg.openrouter_api_key && document.getElementById('apiKeyOpenrouter')) {
                        document.getElementById('apiKeyOpenrouter').value = cfg.openrouter_api_key;
                        localStorage.setItem(API_KEY_OPENROUTER, cfg.openrouter_api_key);
                    }
                    if (Array.isArray(cfg.ai_kombo_order) && cfg.ai_kombo_order.length > 0) {
                        currentKomboOrder = cfg.ai_kombo_order;
                        normalizeKomboModels(currentKomboOrder);
                    }
                    renderKomboListUI();
                    detectLocalAiAgentsUi(false);

                    if (cfg.gemini_model) {
                        setGeminiModelUI(cfg.gemini_model);
                        localStorage.setItem(PREF_KEY_GEMINI_MODEL, cfg.gemini_model);
                    }

                    if (cfg.google_api_key && document.getElementById('apiKeyGoogle')) {
                        document.getElementById('apiKeyGoogle').value = cfg.google_api_key;
                        localStorage.setItem(API_KEY_GOOGLE, cfg.google_api_key);
                    }
                    if (cfg.elevenlabs_api_key && document.getElementById('apiKeyElevenlabs')) {
                        document.getElementById('apiKeyElevenlabs').value = cfg.elevenlabs_api_key;
                        activeElevenKey = cfg.elevenlabs_api_key;
                        localStorage.setItem(API_KEY_ELEVENLABS, cfg.elevenlabs_api_key);
                    }
                    if (cfg.elevenlabs_voice_id && !savedElevenVoice) {
                        savedElevenVoice = cfg.elevenlabs_voice_id;
                    }
                    if (cfg.elevenlabs_model_id && document.getElementById('elevenlabsModelId')) {
                        document.getElementById('elevenlabsModelId').value = cfg.elevenlabs_model_id;
                        localStorage.setItem(ELEVENLABS_MODEL_ID, cfg.elevenlabs_model_id);
                    }
                    if (cfg.pixabay_api_key && document.getElementById('apiKeyPixabay')) {
                        document.getElementById('apiKeyPixabay').value = cfg.pixabay_api_key;
                        localStorage.setItem(API_KEY_PIXABAY, cfg.pixabay_api_key);
                    }
                    if (cfg.coverr_api_key && document.getElementById('apiKeyCoverr')) {
                        document.getElementById('apiKeyCoverr').value = cfg.coverr_api_key;
                        localStorage.setItem(API_KEY_COVERR, cfg.coverr_api_key);
                    }
                    if (cfg.brandfetch_api_key && document.getElementById('apiKeyBrandfetch')) {
                        document.getElementById('apiKeyBrandfetch').value = cfg.brandfetch_api_key;
                        localStorage.setItem(API_KEY_BRANDFETCH, cfg.brandfetch_api_key);
                    }
                    if (cfg.bg_remove_api_key && document.getElementById('apiKeyBgRemove')) {
                        document.getElementById('apiKeyBgRemove').value = cfg.bg_remove_api_key;
                        localStorage.setItem(API_KEY_BG_REMOVE, cfg.bg_remove_api_key);
                    }
                    if (cfg.sketchfab_api_token && document.getElementById('apiKeySketchfab')) {
                        document.getElementById('apiKeySketchfab').value = cfg.sketchfab_api_token;
                        localStorage.setItem(API_KEY_SKETCHFAB, cfg.sketchfab_api_token);
                    }
                    if (cfg.edge_voice_id) {
                        savedEdgeVoice = cfg.edge_voice_id;
                    }
                }
            } catch (e) {
                console.warn('Impossible de charger /api/settings:', e);
            }

            // 3. Initialisation ElevenLabs
            if (activeElevenKey && activeElevenKey.trim()) {
                await loadVoices(activeElevenKey.trim(), savedElevenVoice);
                loadElevenLabsSubscription(activeElevenKey.trim());
            }

            // 4. Initialisation Edge TTS (100% Gratuit)
            loadEdgeVoicesFromUi(savedEdgeVoice);
        });



        function toggleSettingsVoiceDropdown(id) {
            const menu = document.getElementById(id);
            if (!menu) return;
            const isOpen = menu.classList.contains('open');
            document.querySelectorAll('.voice-dropdown-menu').forEach(m => m.classList.remove('open'));
            if (!isOpen) {
                menu.classList.add('open');
                const inp = menu.querySelector('.voice-search-input');
                if (inp) setTimeout(() => inp.focus(), 60);
            }
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.modern-voice-picker')) {
                document.querySelectorAll('.voice-dropdown-menu').forEach(m => m.classList.remove('open'));
            }
        });

        function filterSettingsVoices(engine) {
            if (engine === 'edge') {
                const query = (document.getElementById('settingsSearchEdgeInput').value || '').toLowerCase().trim();
                const filtered = settingsEdgeRawList.filter(v => 
                    (v.name || '').toLowerCase().includes(query) || 
                    (v.language || '').toLowerCase().includes(query) ||
                    (v.gender || '').toLowerCase().includes(query)
                );
                renderSettingsEdgeRows(filtered);
            }
        }

        function renderSettingsEdgeRows(list) {
            const container = document.getElementById('settingsListEdgeItems');
            const currentSelected = document.getElementById('edgeVoiceId').value;
            if (!container) return;

            if (!list || list.length === 0) {
                container.innerHTML = '<div style="padding:14px; text-align:center; color:var(--text-muted); font-size:12px;">Aucune voix trouvée</div>';
                return;
            }

            let html = '';
            list.forEach(v => {
                const isSel = v.id === currentSelected ? 'selected' : '';
                const flagUrl = getVoiceFlagUrl(v);
                html += `
                    <div class="voice-item-row ${isSel}" onclick="selectSettingsEdgeVoice('${v.id}')">
                        <div class="voice-item-left">
                            <img class="voice-flag-img" src="${flagUrl}" alt="Flag">
                            <div class="voice-item-info">
                                <span class="voice-item-title">${v.name}</span>
                                <span class="voice-item-subtitle">${v.language || 'Français'} ${v.gender ? '• ' + v.gender : ''}</span>
                            </div>
                        </div>
                        <div class="voice-item-actions">
                            <button type="button" class="btn-inline-preview" onclick="event.stopPropagation(); playDirectEdgePreviewSettings('${v.id}')" title="Écouter un extrait">▶</button>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }

        function selectSettingsEdgeVoice(voiceId) {
            const voice = edgeVoicesCache[voiceId];
            if (!voice) return;
            document.getElementById('edgeVoiceId').value = voice.id;
            document.getElementById('settingsNameEdgeSelected').textContent = voice.name;
            document.getElementById('settingsFlagEdgeSelected').src = getVoiceFlagUrl(voice);
            document.getElementById('settingsBadgeEdgeSelected').textContent = (voice.language || 'Neural').toUpperCase();
            document.getElementById('settingsDropdownEdge').classList.remove('open');
            renderSettingsEdgeRows(settingsEdgeRawList);
        }

        function playDirectPreviewSettings(url) {
            if (!url) return;
            let audio = document.getElementById('audioPreview');
            if (!audio) {
                audio = new Audio();
            }
            audio.src = url;
            audio.play().catch(e => console.warn('Erreur preview:', e));
        }

        async function playDirectEdgePreviewSettings(voiceId) {
            if (!voiceId) return;
            try {
                const res = await fetch(`/api/edge/preview?voice=${encodeURIComponent(voiceId)}`);
                const data = await res.json();
                if (data.success && data.audioUrl) {
                    playDirectPreviewSettings(data.audioUrl + '?t=' + Date.now());
                } else {
                    alert(data.error || "Erreur lors de la génération de l'extrait audio");
                }
            } catch (e) {
                console.warn('Erreur préécoute Edge:', e);
            }
        }

        async function playEdgeVoicePreview() {
            const voiceId = document.getElementById('edgeVoiceId')?.value || 'fr-FR-HenriNeural';
            const btn = document.getElementById('btnPreviewEdgeVoice');
            const origHtml = btn ? btn.innerHTML : '';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<span style="font-size:11px;">⏳ Préécoute...</span>`;
            }
            try {
                await playDirectEdgePreviewSettings(voiceId);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = origHtml;
                }
            }
        }

        async function loadEdgeVoicesFromUi(voiceToSelect = null) {
            const statusEl = document.getElementById('edgeKeyStatus');
            if (statusEl) statusEl.innerHTML = `<span style="color:#10b981;">⚡ Chargement des voix Edge TTS...</span>`;

            try {
                const res = await fetch('/api/edge/voices');
                if (!res.ok) {
                    throw new Error('Erreur lors du chargement des voix Edge');
                }
                const data = await res.json();
                edgeVoicesCache = {};
                settingsEdgeRawList = [];

                if (data.frenchVoices) {
                    data.frenchVoices.forEach(v => {
                        edgeVoicesCache[v.id] = v;
                        settingsEdgeRawList.push(v);
                    });
                }
                if (data.englishVoices) {
                    data.englishVoices.slice(0, 30).forEach(v => {
                        edgeVoicesCache[v.id] = v;
                        settingsEdgeRawList.push(v);
                    });
                }

                renderSettingsEdgeRows(settingsEdgeRawList);

                const currentSaved = voiceToSelect || localStorage.getItem(EDGE_VOICE_ID) || 'fr-FR-HenriNeural';
                const initialVoice = (currentSaved && edgeVoicesCache[currentSaved])
                    ? currentSaved
                    : (settingsEdgeRawList.length > 0 ? settingsEdgeRawList[0].id : '');

                if (initialVoice) {
                    selectSettingsEdgeVoice(initialVoice);
                }
                if (statusEl) {
                    statusEl.innerHTML = `<span style="color:#10b981;">✅ ${data.total || settingsEdgeRawList.length} voix Edge TTS disponibles (${data.frenchVoices ? data.frenchVoices.length : 0} françaises) — 100% Gratuit.</span>`;
                }
            } catch (err) {
                if (statusEl) {
                    statusEl.innerHTML = `<span style="color:#ff4444;">⚠️ ${err.message}</span>`;
                }
            }
        }

        function handleApiKeyChange() {
            clearTimeout(keyChangeTimeout);
            keyChangeTimeout = setTimeout(() => {
                const key = document.getElementById('apiKeyElevenlabs').value.trim();
                const statusEl = document.getElementById('elevenlabsKeyStatus');
                if (key) {
                    loadVoices(key);
                    loadElevenLabsSubscription(key);
                } else {
                    if (statusEl) {
                        statusEl.innerHTML = `
                            <span style="color:var(--text-muted);">Saisissez votre clé ElevenLabs pour synchroniser automatiquement vos voix.</span>
                        `;
                    }
                    const usageBox = document.getElementById('elevenlabsUsageBox');
                    if (usageBox) usageBox.style.display = 'none';
                }
            }, 600);
        }

        async function loadVoicesFromUi() {
            const key = document.getElementById('apiKeyElevenlabs').value.trim();
            const statusEl = document.getElementById('elevenlabsKeyStatus');
            if (!key) {
                if (statusEl) {
                    statusEl.innerHTML = `
                        <span style="color:#ff4444;">Veuillez renseigner votre clé API ElevenLabs ci-dessus d'abord.</span>
                    `;
                }
                return;
            }
            await loadVoices(key);
            loadElevenLabsSubscription(key);
        }

        async function loadVoices(key, voiceToSelect = null) {
            const statusEl = document.getElementById('elevenlabsKeyStatus');
            const selectEl = document.getElementById('elevenlabsVoiceId');
            if (statusEl) statusEl.innerHTML = `<span style="color:#ffbb00;">⏳ Chargement de vos voix ElevenLabs...</span>`;

            try {
                let data = null;
                try {
                    const res = await fetch(`/api/elevenlabs/voices?key=${encodeURIComponent(key)}`);
                    if (res.ok) data = await res.json();
                } catch (e) {}

                if (!data || !data.success) {
                    const directRes = await fetch('https://api.elevenlabs.io/v1/voices', {
                        headers: { 'xi-api-key': key }
                    });
                    if (!directRes.ok) {
                        const errTxt = await directRes.text();
                        throw new Error(`Erreur ElevenLabs (${directRes.status}) : ${errTxt}`);
                    }
                    const rawVoices = await directRes.json();
                    data = {
                        success: true,
                        total: rawVoices.voices ? rawVoices.voices.length : 0,
                        customVoices: (rawVoices.voices || []).filter(v => v.category === 'cloned' || v.category === 'generated'),
                        defaultVoices: (rawVoices.voices || []).filter(v => v.category !== 'cloned' && v.category !== 'generated')
                    };
                }

                voicesCache = {};
                selectEl.innerHTML = '';

                if (data.customVoices && data.customVoices.length > 0) {
                    const groupCustom = document.createElement('optgroup');
                    groupCustom.label = '⭐ Mes Clones & Voix Personnalisées';
                    data.customVoices.forEach(v => {
                        voicesCache[v.voice_id] = { id: v.voice_id, name: v.name, previewUrl: v.preview_url };
                        const opt = document.createElement('option');
                        opt.value = v.voice_id;
                        opt.textContent = `${v.name} (Clonée/Custom)`;
                        groupCustom.appendChild(opt);
                    });
                    selectEl.appendChild(groupCustom);
                }

                if (data.defaultVoices && data.defaultVoices.length > 0) {
                    const groupDefault = document.createElement('optgroup');
                    groupDefault.label = '🎙️ Voix Officielles ElevenLabs';
                    data.defaultVoices.forEach(v => {
                        voicesCache[v.voice_id] = { id: v.voice_id, name: v.name, previewUrl: v.preview_url };
                        const opt = document.createElement('option');
                        opt.value = v.voice_id;
                        const langInfo = (v.labels && v.labels.accent) ? ` (${v.labels.accent})` : '';
                        opt.textContent = `${v.name}${langInfo}`;
                        groupDefault.appendChild(opt);
                    });
                    selectEl.appendChild(groupDefault);
                }

                const currentSaved = voiceToSelect || localStorage.getItem(ELEVENLABS_VOICE_ID);
                if (currentSaved && voicesCache[currentSaved]) {
                    selectEl.value = currentSaved;
                } else if (selectEl.options.length > 0) {
                    selectEl.selectedIndex = 0;
                }

                onVoiceSelected();

                if (statusEl) {
                    statusEl.innerHTML = `
                        <span style="color:#10b981;">✅ ${data.total} voix disponibles (${data.customVoices ? data.customVoices.length : 0} personnalisées).</span>
                    `;
                }
            } catch (err) {
                if (statusEl) {
                    statusEl.innerHTML = `
                        <span style="color:#ff4444;">❌ ${err.message || 'Impossible de joindre l\\\'API ElevenLabs.'}</span>
                    `;
                }
            }
        }

        async function loadElevenLabsSubscription(key) {
            const usageBox = document.getElementById('elevenlabsUsageBox');
            if (!usageBox) return;

            try {
                let data = null;
                (async () => {
                    try {
                        const res = await fetch(`/api/elevenlabs/subscription?key=${encodeURIComponent(key)}`);
                        if (res.ok) data = await res.json();
                    } catch (e) {}

                    if (!data || !data.success) {
                        try {
                            const directRes = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
                                headers: { 'xi-api-key': key }
                            });
                            if (directRes.ok) {
                                const raw = await directRes.json();
                                const limit = raw.character_limit || 10000;
                                const used = raw.character_count || 0;
                                const rem = Math.max(0, limit - used);
                                const pct = limit > 0 ? Math.min(100, Math.round((rem / limit) * 100)) : 0;
                                data = {
                                    success: true,
                                    tier: raw.tier || 'Gratuit',
                                    characterLimit: limit,
                                    characterCount: used,
                                    remainingCharacters: rem,
                                    percentRemaining: pct,
                                    resetDate: raw.next_character_count_reset_unix ? new Date(raw.next_character_count_reset_unix * 1000).toLocaleDateString('fr-FR') : 'Fin du mois'
                                };
                            }
                        } catch (err) {}
                    }

                    if (data && data.success) {
                        usageBox.style.display = 'flex';
                        const limit = data.characterLimit || 10000;
                        const remaining = (data.remainingCharacters !== undefined) ? data.remainingCharacters : Math.max(0, limit - (data.characterCount || 0));
                        const percent = (data.percentRemaining !== undefined) ? data.percentRemaining : ((data.remainingPercentage !== undefined) ? data.remainingPercentage : (limit > 0 ? Math.round((remaining / limit) * 100) : 0));
                        const tier = data.tier || 'Gratuit';
                        const resetDate = data.resetDate || (data.nextResetUnix ? new Date(data.nextResetUnix * 1000).toLocaleDateString('fr-FR') : 'Fin du mois');

                        const creditsBadge = document.getElementById('elevenlabsCreditsBadge');
                        if (creditsBadge) {
                            creditsBadge.textContent = `${remaining.toLocaleString('fr-FR')} / ${limit.toLocaleString('fr-FR')} car. (${percent}%)`;
                            creditsBadge.style.color = percent < 15 ? '#ff4444' : (percent < 40 ? '#ffbb00' : '#10b981');
                        }
                        const bar = document.getElementById('elevenlabsProgressBar');
                        if (bar) {
                            bar.style.width = `${percent}%`;
                            bar.style.background = percent < 15 ? '#ff4444' : (percent < 40 ? '#ffbb00' : '#10b981');
                        }
                        const tierText = document.getElementById('elevenlabsTierText');
                        if (tierText) {
                            tierText.textContent = `Formule : ${tier}`;
                        }
                        const resetText = document.getElementById('elevenlabsResetText');
                        if (resetText) {
                            resetText.textContent = `Renouvellement : ${resetDate}`;
                        }
                    }
                })();
            } catch (err) {
                console.error('Erreur chargement quotas ElevenLabs:', err);
            }
        }
        function onVoiceSelected() {
            const selectEl = document.getElementById('elevenlabsVoiceId');
            const btnPreview = document.getElementById('btnPreviewVoice');
            const vId = selectEl.value;
            const voice = voicesCache[vId];

            if (voice && voice.previewUrl) {
                btnPreview.style.display = 'inline-flex';
                btnPreview.dataset.previewUrl = voice.previewUrl;
            } else {
                btnPreview.style.display = 'none';
                btnPreview.dataset.previewUrl = '';
            }
        }

        function playVoicePreview() {
            const btnPreview = document.getElementById('btnPreviewVoice');
            const url = btnPreview.dataset.previewUrl;
            if (!url) return;

            if (previewAudioInstance) {
                previewAudioInstance.pause();
                previewAudioInstance = null;
            }

            previewAudioInstance = new Audio(url);
            btnPreview.innerHTML = `
                <svg class="icon" style="width:14px; height:14px;" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                <span>Lecture...</span>
            `;
            previewAudioInstance.play().catch(() => {});
            previewAudioInstance.onended = () => {
                btnPreview.innerHTML = `
                    <svg class="icon" style="width:14px; height:14px;" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    <span>Écouter</span>
                `;
            };
        }

        function togglePasswordVisibility(inputId, btn) {
            const input = document.getElementById(inputId);
            if (input.type === 'password') {
                input.type = 'text';
                btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
            } else {
                input.type = 'password';
                btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
            }
        }

        function activateNav(link, e) {
            if (e) e.preventDefault();
            document.querySelectorAll('.settings-sidebar .sidebar-link').forEach(el => el.classList.remove('active'));
            link.classList.add('active');
            const href = link.getAttribute('href') || '';
            const targetId = href.replace('#', '');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        function handleSettingsScroll() {
            if (currentView !== 'settings') return;
            const mainEl = document.querySelector('main.app-main') || document.documentElement;
            const sections = [
                document.getElementById('sec-general'),
                document.getElementById('sec-voice'),
                document.getElementById('sec-api'),
                document.getElementById('sec-render')
            ].filter(Boolean);

            if (sections.length === 0) return;

            const scrollTop = mainEl.scrollTop || window.pageYOffset || 0;
            const scrollHeight = mainEl.scrollHeight || document.documentElement.scrollHeight || 0;
            const clientHeight = mainEl.clientHeight || window.innerHeight || 0;

            // Détection du bas de page : active immédiatement la dernière section (Moteur de Rendu)
            if (scrollTop + clientHeight >= scrollHeight - 70) {
                document.querySelectorAll('.settings-sidebar .sidebar-link').forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === '#sec-render');
                });
                return;
            }

            const mainRect = mainEl.getBoundingClientRect ? mainEl.getBoundingClientRect() : { top: 0 };
            let activeId = 'sec-general';

            sections.forEach(sec => {
                const rect = sec.getBoundingClientRect();
                // Si le haut de la section se trouve à 240px ou moins du haut visible du viewport de défilement
                if (rect.top - mainRect.top <= 240) {
                    activeId = sec.getAttribute('id');
                }
            });

            if (activeId) {
                document.querySelectorAll('.settings-sidebar .sidebar-link').forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${activeId}`);
                });
            }
        }

        // Écoute de défilement sur le conteneur principal à défilement ET sur la fenêtre
        window.addEventListener('DOMContentLoaded', () => {
            const mainScrollEl = document.querySelector('main.app-main');
            if (mainScrollEl) {
                mainScrollEl.addEventListener('scroll', handleSettingsScroll, { passive: true });
            }
        });
        window.addEventListener('scroll', handleSettingsScroll, { passive: true });

        async function saveSettings() {
            const ttsEngine = document.getElementById('prefTtsEngine') ? document.getElementById('prefTtsEngine').value : 'elevenlabs';
            localStorage.setItem(PREF_KEY_TTS_ENGINE, ttsEngine);
            const format = document.getElementById('prefFormat').value;
            const fps = document.getElementById('prefFps').value;
            const quality = document.getElementById('prefQuality').value;
            const template = document.getElementById('prefTemplate').value;
            const subtitleStyle = document.getElementById('prefSubtitleStyle') ? document.getElementById('prefSubtitleStyle').value : (localStorage.getItem(PREF_KEY_SUBTITLE_STYLE) || 'type-wordbyword');
            
            let geminiModel = document.getElementById('prefGeminiModel') ? document.getElementById('prefGeminiModel').value : 'gemini-3.5-flash-lite';
            if (geminiModel === 'custom') {
                const customVal = (document.getElementById('customGeminiModel')?.value || '').trim();
                if (customVal) geminiModel = customVal;
            }
            localStorage.setItem(PREF_KEY_GEMINI_MODEL, geminiModel);

            const googleKey = document.getElementById('apiKeyGoogle').value.trim();
            const elevenlabsKey = document.getElementById('apiKeyElevenlabs').value.trim();
            const elevenlabsVoice = document.getElementById('elevenlabsVoiceId').value.trim();
            const elevenlabsModel = document.getElementById('elevenlabsModelId').value.trim();
            const pixabayKey = document.getElementById('apiKeyPixabay').value.trim();
            const coverrKey = document.getElementById('apiKeyCoverr') ? document.getElementById('apiKeyCoverr').value.trim() : '';
            const brandfetchKey = document.getElementById('apiKeyBrandfetch').value.trim();
            const bgRemoveKey = document.getElementById('apiKeyBgRemove').value.trim();
            const sketchfabToken = document.getElementById('apiKeySketchfab') ? document.getElementById('apiKeySketchfab').value.trim() : '';
            const edgeVoice = document.getElementById('edgeVoiceId') ? document.getElementById('edgeVoiceId').value : 'fr-FR-HenriNeural';

            // LocalStorage
            localStorage.setItem(PREF_KEY_FORMAT, format);
            localStorage.setItem(PREF_KEY_FPS, fps);
            localStorage.setItem(PREF_KEY_QUALITY, quality);
            localStorage.setItem(PREF_KEY_TEMPLATE, template);
            localStorage.setItem(PREF_KEY_SUBTITLE_STYLE, subtitleStyle);
            localStorage.setItem(API_KEY_GOOGLE, googleKey);
            localStorage.setItem(API_KEY_ELEVENLABS, elevenlabsKey);
            localStorage.setItem(ELEVENLABS_VOICE_ID, elevenlabsVoice);
            localStorage.setItem(ELEVENLABS_MODEL_ID, elevenlabsModel);
            localStorage.setItem(API_KEY_PIXABAY, pixabayKey);
            localStorage.setItem(API_KEY_COVERR, coverrKey);
            localStorage.setItem(API_KEY_BRANDFETCH, brandfetchKey);
            localStorage.setItem(API_KEY_BG_REMOVE, bgRemoveKey);
            localStorage.setItem(API_KEY_SKETCHFAB, sketchfabToken);
            localStorage.setItem(EDGE_VOICE_ID, edgeVoice);

            // Synchronisation avec api_config.json via /api/settings
            try {
                await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pref_format: format,
                        pref_fps: fps,
                        pref_quality: quality,
                        pref_template: template,
                        pref_subtitle_style: subtitleStyle,
                        tts_engine: ttsEngine,
                                                
                        groq_api_key: (document.getElementById('apiKeyGroq')?.value || '').trim(),
                        openrouter_api_key: (document.getElementById('apiKeyOpenrouter')?.value || '').trim(),
                        ai_kombo_order: currentKomboOrder,
                        ai_kombo_enabled: true,
                        gemini_model: geminiModel,
                        google_api_key: googleKey,
                        elevenlabs_api_key: elevenlabsKey,
                        elevenlabs_voice_id: elevenlabsVoice,
                        elevenlabs_model_id: elevenlabsModel,
                        pixabay_api_key: pixabayKey,
                        coverr_api_key: coverrKey,
                        brandfetch_api_key: brandfetchKey,
                        bg_remove_api_key: bgRemoveKey,
                        sketchfab_api_token: sketchfabToken,
                        edge_voice_id: edgeVoice
                    })
                });
            } catch (e) {
                console.warn('Erreur synchronisation /api/settings:', e);
            }

            // Si une clé ElevenLabs est renseignée, actualiser les voix
            if (elevenlabsKey) {
                loadVoices(elevenlabsKey, elevenlabsVoice);
                localStorage.removeItem('marvidflow_cached_eleven_voices');
                loadElevenVoicesForCreateVideo(true);
            }

            const toast = document.getElementById('toast');
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 2600);
        }

        async function testCoverrConnection() {
            const keyInput = document.getElementById('apiKeyCoverr');
            const statusEl = document.getElementById('coverrKeyStatus');
            const key = keyInput ? keyInput.value.trim() : '';

            if (!key) {
                if (statusEl) {
                    statusEl.style.display = 'flex';
                    statusEl.style.color = '#ef4444';
                    statusEl.innerHTML = `<svg class="icon" style="width:14px; height:14px;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> <span>Veuillez d'abord saisir une clé API Coverr.</span>`;
                }
                return;
            }

            if (statusEl) {
                statusEl.style.display = 'flex';
                statusEl.style.color = 'var(--text-secondary)';
                statusEl.innerHTML = `<span>⏳ Test de connexion à Coverr.co en cours...</span>`;
            }

            try {
                let data = null;
                const serverOrigin = (window.location.protocol === 'file:') ? 'http://localhost:3000' : '';
                
                try {
                    const res = await fetch(`${serverOrigin}/api/coverr/test`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ key })
                    });
                    if (res.ok) {
                        data = await res.json();
                    }
                } catch (e) {
                    console.warn('Serveur local injoignable pour le test Coverr, bascule en direct:', e);
                }

                if (!data) {
                    const directRes = await fetch('https://api.coverr.co/videos?query=nature&page_size=1&urls=true', {
                        headers: {
                            'Authorization': `Bearer ${key}`
                        }
                    });
                    if (directRes.status === 401 || directRes.status === 403) {
                        data = { valid: false, error: 'Clé API Coverr invalide ou non autorisée (401/403).' };
                    } else if (!directRes.ok) {
                        const errTxt = await directRes.text();
                        data = { valid: false, error: `Erreur API Coverr (${directRes.status}): ${errTxt}` };
                    } else {
                        const directJson = await directRes.json();
                        data = { valid: true, totalAvailable: directJson.total || (directJson.hits ? directJson.hits.length : 0) };
                    }
                }

                if (data.valid) {
                    if (statusEl) {
                        statusEl.style.color = '#10b981';
                        statusEl.innerHTML = `<svg class="icon" style="width:14px; height:14px;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>Connexion réussie ! Clé Coverr.co valide (${data.totalAvailable || 0} vidéos accessibles).</span>`;
                    }
                    localStorage.setItem(API_KEY_COVERR, key);
                } else {
                    if (statusEl) {
                        statusEl.style.color = '#ef4444';
                        statusEl.innerHTML = `<svg class="icon" style="width:14px; height:14px;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> <span>${data.error || 'Clé Coverr invalide.'}</span>`;
                    }
                }
            } catch (err) {
                if (statusEl) {
                    statusEl.style.color = '#ef4444';
                    statusEl.innerHTML = `<svg class="icon" style="width:14px; height:14px;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> <span>Erreur de test : ${err.message}</span>`;
                }
            }
        }

        async function testVoiceGeneration() {
            const btn = document.getElementById('btnTestVoice');
            const status = document.getElementById('testVoiceStatus');
            const audioPreview = document.getElementById('audioPreview');
            const text = document.getElementById('testVoiceText').value.trim();
            const apiKey = document.getElementById('apiKeyElevenlabs').value.trim();
            const voiceId = document.getElementById('elevenlabsVoiceId').value.trim();
            const modelId = document.getElementById('elevenlabsModelId').value.trim();

            if (!text) {
                status.innerHTML = `<span style="color:#ff4444;">Veuillez saisir un texte de test</span>`;
                return;
            }
            if (!apiKey) {
                status.innerHTML = `<span style="color:#ff4444;">Veuillez renseigner votre clé ElevenLabs ci-dessus d'abord.</span>`;
                return;
            }

            btn.disabled = true;
            status.innerHTML = `<span style="color:#ffbb00;">⏳ Synthèse en cours via ElevenLabs...</span>`;

            try {
                const response = await fetch('/api/tts/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text,
                        apiKey,
                        voiceId,
                        modelId,
                        filename: `test_voix_${Date.now()}.mp3`
                    })
                });

                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Erreur lors de la génération');
                }

                status.innerHTML = `<span style="color:#22c55e;">✅ Voix off générée avec succès (${Math.round(data.sizeBytes / 1024)} Ko) !</span>`;
                audioPreview.src = data.relativePath + '?t=' + Date.now();
                audioPreview.style.display = 'block';
                audioPreview.play().catch(() => {});
            } catch (err) {
                status.innerHTML = `<span style="color:#ff4444;">❌ ${err.message}</span>`;
            } finally {
                btn.disabled = false;
            }
        }
        window.runVoiceTest = testVoiceGeneration;
        function runVoiceTest() { return testVoiceGeneration(); }
    // ── Test All API Keys ────────────────────────────────────────────────────
    async function testAllApiKeys() {
      const btn = document.getElementById('btnTestAllApis');
      if (btn) { btn.disabled = true; btn.innerHTML = '<span>⏳</span> Test en cours...'; }

      const tests = [
        {
          label: 'ElevenLabs',
          fieldId: 'apiKeyElevenlabs',
          test: async (key) => {
            if (!key) return null;
            const r = await fetch('https://api.elevenlabs.io/v1/voices', {
              headers: { 'xi-api-key': key }
            });
            return r.ok;
          }
        },
        {
          label: 'Google AI',
          fieldId: 'apiKeyGoogle',
          test: async (key) => {
            if (!key) return null;
            const r = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
            );
            return r.ok;
          }
        },
        {
          label: 'Pixabay',
          fieldId: 'apiKeyPixabay',
          test: async (key) => {
            if (!key) return null;
            const r = await fetch(
              `https://pixabay.com/api/?key=${key}&q=nature&per_page=3`
            );
            return r.ok;
          }
        },
        {
          label: 'Coverr',
          fieldId: 'apiKeyCoverr',
          test: async (key) => {
            if (!key) return null;
            // 1. Essai prioritaire via proxy local (contourne tout blocage CORS)
            try {
              const res = await fetch('/api/coverr/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key })
              });
              if (res.ok) {
                const data = await res.json();
                if (data.valid === true) return true;
              }
            } catch (e) {}

            // 2. Fallback direct avec le bon format Authorization: Bearer
            try {
              const direct = await fetch('https://api.coverr.co/videos?query=nature&page_size=1&urls=true', {
                headers: { 'Authorization': `Bearer ${key}` }
              });
              return direct.ok;
            } catch (e) {
              return false;
            }
          }
        },
        {
          label: 'Brandfetch',
          fieldId: 'apiKeyBrandfetch',
          test: async (key) => {
            if (!key) return null;
            const r = await fetch('https://api.brandfetch.io/v2/brands/apple.com', {
              headers: { 'Authorization': `Bearer ${key}` }
            });
            return r.ok;
          }
        },
        {
          label: 'BgRemove (Clipdrop)',
          fieldId: 'apiKeyBgRemove',
          test: async (key) => {
            if (!key) return null;
            try {
              const fd = new FormData();
              const r = await fetch('https://clipdrop-api.co/remove-background/v1', {
                method: 'POST',
                headers: { 'x-api-key': key },
                body: fd
              });
              return r.status !== 401 && r.status !== 403;
            } catch { return false; }
          }
        },
        {
          label: 'Sketchfab',
          fieldId: 'apiKeySketchfab',
          test: async (key) => {
            if (!key) return null;
            const r = await fetch('https://api.sketchfab.com/v3/me', {
              headers: { 'Authorization': `Token ${key}` }
            });
            return r.ok;
          }
        }
      ];

      // Nettoyage des anciens badges de test
      document.querySelectorAll('.api-test-badge').forEach(el => el.remove());

      for (const t of tests) {
        const field = document.getElementById(t.fieldId);
        if (!field) continue;
        const key = field.value.trim();

        // Trouver le conteneur du titre du label pour placer l'icône DIRECTEMENT À CÔTÉ DU NOM
        const formRow = field.closest('.form-row');
        const labelTitle = formRow ? (formRow.querySelector('.form-label span') || formRow.querySelector('.form-label')) : field.parentElement;

        const badge = document.createElement('span');
        badge.className = 'api-test-badge';
        badge.style.cssText = 'margin-left: 8px; font-size: 15px; vertical-align: middle; transition: opacity 0.5s ease; display: inline-flex; align-items: center;';
        badge.textContent = '⏳';
        badge.title = `Test en cours pour ${t.label}...`;
        
        if (labelTitle) {
          labelTitle.appendChild(badge);
        } else {
          field.parentElement.appendChild(badge);
        }

        let result = null;
        try { result = await t.test(key); } catch { result = false; }

        if (result === null) {
          badge.textContent = '⬜';
          badge.title = `${t.label} : clé vide`;
        } else if (result === true) {
          badge.textContent = '✅';
          badge.title = `${t.label} : clé valide et fonctionnelle !`;
          badge.style.color = '#22c55e';
          // Disparaît au bout de 4 secondes
          setTimeout(() => {
            badge.style.opacity = '0';
            setTimeout(() => badge.remove(), 500);
          }, 4000);
        } else {
          badge.textContent = '❌';
          badge.title = `${t.label} : échec du test ou clé invalide`;
          badge.style.color = '#ef4444';
        }

        await new Promise(r => setTimeout(r, 250));
      }

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>🔑</span> Tester toutes les clés API';
      }
    }
