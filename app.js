// Pelipper Town Web Application Logic
document.addEventListener('DOMContentLoaded', () => {
    const data = window.PELIPPER_DATA || { species: [], villagers: [], items: [], stats: {} };
    
    // State
    const state = {
        currentTab: 'pokedex',
        searchQuery: '',
        selectedType: 'all',
        selectedJob: 'all',
        selectedGen: 'all',
        isShinyMode: false,
        activeSpeciesModal: null,
        selectedQuestCategory: 'all',
        questSearchQuery: '',
        selectedItemCategory: 'all',
        itemSearchQuery: '',
        megaSearchQuery: '',
        pokemonCurrentPage: 1,
        pokemonPageSize: 60
    };

    // DOM Elements
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const navTrack = document.getElementById('navTrack');
    const navContainer = document.getElementById('navContainer');
    const navScrollLeft = document.getElementById('navScrollLeft');
    const navScrollRight = document.getElementById('navScrollRight');

    const pokemonGrid = document.getElementById('pokemonGrid');
    const paginationTopControls = document.getElementById('paginationTopControls');
    const paginationBottomControls = document.getElementById('paginationBottomControls');
    const villagerGrid = document.getElementById('villagerGrid');
    const mountGrid = document.getElementById('mountGrid');
    const itemGrid = document.getElementById('itemGrid');
    const itemCatBtns = document.querySelectorAll('.item-cat-btn');
    const itemSearchInput = document.getElementById('itemSearchInput');
    const megaGrid = document.getElementById('megaGrid');
    const megaSearchInput = document.getElementById('megaSearchInput');
    const questGrid = document.getElementById('questGrid');
    const questSearchInput = document.getElementById('questSearchInput');
    const questCountBadge = document.getElementById('questCountBadge');
    const questCatBtns = document.querySelectorAll('.quest-cat-btn');
    const searchInput = document.getElementById('searchInput');
    const toggleShinyBtn = document.getElementById('toggleShinyBtn');
    const resultsCountEl = document.getElementById('resultsCount');
    const typePills = document.querySelectorAll('.filter-pill[data-type]');
    const jobPills = document.querySelectorAll('.filter-pill[data-job]');
    const genPills = document.querySelectorAll('.filter-pill[data-gen]');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    // Debounce Utility for fluid typing without main thread freeze
    function debounce(fn, delay = 160) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // Asset URL helper to ensure compatibility with GitHub Pages (relative paths)
    function fixAssetUrl(url) {
        if (!url) return 'assets/items/pokeball_stardew.png';
        if (url.startsWith('/assets/')) return url.slice(1);
        if (url.startsWith('/')) return '.' + url;
        return url;
    }

    // Lazy Tab Render Tracking
    const renderedTabs = new Set(['pokedex']);

    // Navigation Track Scroll Logic & Indicators
    function updateNavScrollIndicators() {
        if (!navContainer || !navTrack) return;
        const maxScroll = navContainer.scrollWidth - navContainer.clientWidth;
        const sl = navContainer.scrollLeft;
        const hasOverflow = maxScroll > 4;

        if (navScrollLeft) navScrollLeft.disabled = sl <= 2;
        if (navScrollRight) navScrollRight.disabled = sl >= maxScroll - 2;

        navTrack.classList.toggle('can-scroll-left', hasOverflow && sl > 4);
        navTrack.classList.toggle('can-scroll-right', hasOverflow && sl < maxScroll - 4);
    }

    if (navScrollLeft && navContainer) {
        navScrollLeft.addEventListener('click', () => {
            navContainer.scrollBy({ left: -260, behavior: 'smooth' });
        });
    }
    if (navScrollRight && navContainer) {
        navScrollRight.addEventListener('click', () => {
            navContainer.scrollBy({ left: 260, behavior: 'smooth' });
        });
    }

    if (navContainer) {
        navContainer.addEventListener('scroll', updateNavScrollIndicators, { passive: true });
        window.addEventListener('resize', updateNavScrollIndicators, { passive: true });

        // Natural horizontal scrolling with regular mouse wheel
        navContainer.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0 && navContainer.scrollWidth > navContainer.clientWidth) {
                e.preventDefault();
                navContainer.scrollLeft += e.deltaY * 0.85;
            }
        }, { passive: false });

        // Click & Drag to scroll for desktop users
        let isDown = false;
        let startX = 0;
        let sLeft = 0;
        navContainer.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX - navContainer.offsetLeft;
            sLeft = navContainer.scrollLeft;
            navContainer.style.cursor = 'grabbing';
        });
        window.addEventListener('mouseup', () => {
            if (isDown) {
                isDown = false;
                if (navContainer) navContainer.style.cursor = 'default';
            }
        });
        navContainer.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - navContainer.offsetLeft;
            const walk = (x - startX) * 1.4;
            navContainer.scrollLeft = sLeft - walk;
        });

        // Initialize scroll buttons
        setTimeout(updateNavScrollIndicators, 80);
    }

    // Header stats update
    document.getElementById('statTotalSpecies').textContent = data.stats.totalSpecies || data.species.length;
    document.getElementById('statTotalVillagers').textContent = data.stats.totalVillagers || data.villagers.length;
    document.getElementById('statTotalMounts').textContent = data.stats.rideableCount || 0;
    document.getElementById('statTotalItems').textContent = data.stats.totalItems || data.items.length;
    const statTotalQuests = document.getElementById('statTotalQuests');
    if (statTotalQuests) {
        statTotalQuests.textContent = data.stats.totalQuests || (data.quests ? data.quests.length : 58);
    }
    const statTotalMegas = document.getElementById('statTotalMegas');
    if (statTotalMegas) {
        statTotalMegas.textContent = data.stats.totalMegas || ((data.mega && data.mega.forms) ? data.mega.forms.length : 30);
    }

    // Translation helpers
    const JOB_NAMES_TH = {
        Water: '💧 รดน้ำ',
        Harvest: '🌾 เก็บเกี่ยว',
        Mine: '⛏️ ขุดแร่',
        ChopWood: '🪓 ตัดไม้',
        ClearBrush: '🌿 ถางหญ้า',
        Forage: '🍄 หาของป่า',
        AnimalCare: '🐮 เลี้ยงสัตว์',
        Fish: '🎣 ตกปลา',
        Tilling: '🌱 พรวนดิน',
        Haul: '📦 ขนส่ง'
    };

    // 1. Navigation Tab Switching with Auto-Center and Lazy Loading
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    function switchTab(tabId) {
        state.currentTab = tabId;
        navButtons.forEach(b => {
            const isActive = b.getAttribute('data-tab') === tabId;
            b.classList.toggle('active', isActive);
            if (isActive) {
                b.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        });
        tabPanels.forEach(panel => {
            const isActive = panel.id === `tab-${tabId}`;
            panel.classList.toggle('active', isActive);
            panel.style.display = isActive ? 'block' : 'none';
        });
        
        // Show/hide search panel based on tab
        const filterPanel = document.getElementById('filterPanel');
        if (filterPanel) {
            filterPanel.style.display = (tabId === 'pokedex' || tabId === 'villagers') ? 'flex' : 'none';
        }

        // Lazy Render: Only render on first visit or if needed
        if (!renderedTabs.has(tabId)) {
            renderedTabs.add(tabId);
            if (tabId === 'villagers') renderVillagers();
            else if (tabId === 'mounts') renderMounts();
            else if (tabId === 'items') renderItems();
            else if (tabId === 'mega') renderMega();
            else if (tabId === 'quests') renderQuests();
        } else {
            // Already rendered once; only re-filter if tab is pokedex or villagers
            if (tabId === 'pokedex') renderPokemon();
            else if (tabId === 'villagers') renderVillagers();
        }

        updateNavScrollIndicators();
    }

    // 2. Shiny Mode Toggle
    toggleShinyBtn.addEventListener('click', () => {
        state.isShinyMode = !state.isShinyMode;
        toggleShinyBtn.classList.toggle('active', state.isShinyMode);
        toggleShinyBtn.innerHTML = state.isShinyMode ? '✨ ร่างไชนี่ (เปิดอยู่)' : '✨ สลับดูไชนี่';
        if (state.currentTab === 'pokedex') renderPokemon();
        else if (state.currentTab === 'villagers') renderVillagers();
        else if (state.currentTab === 'mounts') renderMounts();
    });

    // 3. Filters & Debounced Search Handling
    const debouncedFilterPokemonOrVillagers = debounce(() => {
        if (state.currentTab === 'pokedex') renderPokemon();
        else if (state.currentTab === 'villagers') renderVillagers();
        else if (state.currentTab === 'items') renderItems();
    }, 150);

    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        state.pokemonCurrentPage = 1;
        debouncedFilterPokemonOrVillagers();
    });

    typePills.forEach(pill => {
        pill.addEventListener('click', () => {
            typePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.selectedType = pill.getAttribute('data-type');
            state.pokemonCurrentPage = 1;
            renderPokemon();
        });
    });

    jobPills.forEach(pill => {
        pill.addEventListener('click', () => {
            jobPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.selectedJob = pill.getAttribute('data-job');
            state.pokemonCurrentPage = 1;
            renderPokemon();
        });
    });

    genPills.forEach(pill => {
        pill.addEventListener('click', () => {
            genPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.selectedGen = pill.getAttribute('data-gen');
            state.pokemonCurrentPage = 1;
            renderPokemon();
        });
    });

    // Helper: Determine Gen from Dex
    function getGeneration(dex) {
        if (!dex || dex <= 0) return 'other';
        if (dex <= 151) return '1';
        if (dex <= 251) return '2';
        if (dex <= 386) return '3';
        if (dex <= 493) return '4';
        if (dex <= 649) return '5';
        if (dex <= 721) return '6';
        if (dex <= 809) return '7';
        if (dex <= 905) return '8';
        return '9';
    }

    // 4. Render Pokédex with Pagination
    function renderPokemon() {
        const filtered = data.species.filter(sp => {
            // Search
            if (state.searchQuery) {
                const matchName = sp.name.toLowerCase().includes(state.searchQuery);
                const matchId = sp.id.toLowerCase().includes(state.searchQuery);
                const matchTh = sp.descriptionTh && sp.descriptionTh.toLowerCase().includes(state.searchQuery);
                const matchType = sp.types.some(t => t.toLowerCase().includes(state.searchQuery));
                if (!matchName && !matchId && !matchTh && !matchType) return false;
            }

            // Type
            if (state.selectedType !== 'all') {
                if (!sp.types.some(t => t.toLowerCase() === state.selectedType.toLowerCase())) return false;
            }

            // Job
            if (state.selectedJob !== 'all') {
                if (!sp.jobs.some(j => j.toLowerCase() === state.selectedJob.toLowerCase())) return false;
            }

            // Gen
            if (state.selectedGen !== 'all') {
                const gen = getGeneration(sp.dex);
                if (gen !== state.selectedGen) return false;
            }

            return true;
        });

        const totalItems = filtered.length;
        const isAll = state.pokemonPageSize === 'all';
        const pageSize = isAll ? totalItems : state.pokemonPageSize;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

        if (state.pokemonCurrentPage > totalPages) state.pokemonCurrentPage = totalPages;
        if (state.pokemonCurrentPage < 1) state.pokemonCurrentPage = 1;

        const startIndex = (state.pokemonCurrentPage - 1) * pageSize;
        const endIndex = isAll ? totalItems : Math.min(startIndex + pageSize, totalItems);
        const displayList = filtered.slice(startIndex, endIndex);

        // Update Results Label
        if (totalItems === 0) {
            resultsCountEl.innerHTML = `<span style="color:#f87171;">ไม่พบโปเกมอนที่ตรงกับเงื่อนไขการค้นหา</span>`;
        } else if (isAll) {
            resultsCountEl.innerHTML = `พบ <strong>${totalItems}</strong> จากทั้งหมด ${data.species.length} ตัว <span style="color:#34d399;">(แสดงครบทุกตัวในหน้านี้)</span>`;
        } else {
            resultsCountEl.innerHTML = `พบ <strong>${totalItems}</strong> จากทั้งหมด ${data.species.length} ตัว (แสดงตัวที่ <strong>${startIndex + 1}–${endIndex}</strong> • หน้า <strong>${state.pokemonCurrentPage}</strong> / ${totalPages})`;
        }

        // Render Cards
        if (displayList.length === 0) {
            pokemonGrid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:48px 20px; background:var(--bg-card); border-radius:16px; border:1px dashed var(--border-color);">
                    <div style="font-size:2.5rem; margin-bottom:12px;">🔍</div>
                    <div style="font-size:1.1rem; color:var(--text-main); font-weight:700;">ไม่พบข้อมูลโปเกมอนที่ค้นหา</div>
                    <div style="font-size:0.85rem; color:var(--text-muted); margin-top:6px;">ลองเปลี่ยนคำค้นหา หรือรีเซ็ตฟิลเตอร์รุ่น/ธาตุ/งานฟาร์ม</div>
                </div>
            `;
        } else {
            pokemonGrid.innerHTML = displayList.map(sp => {
                const rawPortrait = (state.isShinyMode && sp.portraitShiny) ? sp.portraitShiny : (sp.portrait || 'assets/items/pokeball_stardew.png');
                const portrait = fixAssetUrl(rawPortrait);
                const typesHtml = sp.types.map(t => `<span class="type-tag type-${t}">${t}</span>`).join('');
                const jobsHtml = sp.jobs.slice(0, 3).map(j => `<span class="job-tag">${JOB_NAMES_TH[j] || j}</span>`).join('');
                const rideBadge = sp.isRideable ? `<span class="badge-ride">🏇 ขี่ได้</span>` : '';
                const dexFormatted = sp.dex ? `#${String(sp.dex).padStart(3, '0')}` : '---';

                return `
                    <div class="pokemon-card" data-id="${sp.id}">
                        <div class="card-top">
                            <span class="dex-number">${dexFormatted}</span>
                            <div class="card-badges">${rideBadge}</div>
                        </div>
                        <div class="card-image-box">
                            <img src="${portrait}" alt="${sp.name}" class="pokemon-portrait" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='assets/items/pokeball_stardew.png'" />
                        </div>
                        <div class="card-info">
                            <div class="pokemon-name">${sp.name}</div>
                            <div class="types-container">${typesHtml}</div>
                            <div class="pokemon-desc-snippet">${sp.descriptionTh || sp.descriptionEn || 'ไม่มีข้อมูลบรรยาย'}</div>
                            <div class="card-jobs">${jobsHtml || '<span style="font-size:0.7rem; color:var(--text-dim);">ไม่มีงานฟาร์ม</span>'}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Attach card click handlers
        pokemonGrid.querySelectorAll('.pokemon-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                const sp = data.species.find(s => s.id === id);
                if (sp) openModal(sp);
            });
        });

        // Render Pagination Controls UI
        renderPaginationUI(totalPages, totalItems, startIndex, endIndex);
    }

    function renderPaginationUI(totalPages, totalItems, startIndex, endIndex) {
        if (!paginationTopControls || !paginationBottomControls) return;

        const isAll = state.pokemonPageSize === 'all';
        const cur = state.pokemonCurrentPage;

        // Size selector HTML
        const sizeOptions = [30, 60, 120, 'all'];
        const sizeHtml = `
            <div class="page-size-bar">
                <span>แสดงหน้าละ:</span>
                ${sizeOptions.map(sz => {
                    const label = sz === 'all' ? `ทั้งหมด (${totalItems})` : `${sz} ตัว`;
                    const isActive = state.pokemonPageSize === sz ? 'active' : '';
                    return `<button class="page-size-btn ${isActive}" data-size="${sz}">${label}</button>`;
                }).join('')}
            </div>
        `;

        if (totalItems === 0) {
            paginationTopControls.innerHTML = '';
            paginationBottomControls.innerHTML = '';
            return;
        }

        // If 'all' is selected or only 1 page
        if (isAll || totalPages <= 1) {
            paginationTopControls.innerHTML = sizeHtml;
            paginationBottomControls.innerHTML = `
                <div class="pagination-wrapper" style="justify-content:center;">
                    ${sizeHtml}
                </div>
            `;
            attachPaginationEvents(totalPages);
            return;
        }

        // Generate Page Numbers with smart ellipsis
        let pageNumbers = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
        } else {
            pageNumbers.push(1);
            if (cur > 3) pageNumbers.push('...');
            const start = Math.max(2, cur - 1);
            const end = Math.min(totalPages - 1, cur + 1);
            for (let i = start; i <= end; i++) {
                if (!pageNumbers.includes(i)) pageNumbers.push(i);
            }
            if (cur < totalPages - 2) pageNumbers.push('...');
            if (!pageNumbers.includes(totalPages)) pageNumbers.push(totalPages);
        }

        const pagesHtml = `
            <div class="pagination-controls">
                <button class="page-btn nav-first" data-page="1" ${cur === 1 ? 'disabled' : ''} title="หน้าแรก">⏮️ หน้าแรก</button>
                <button class="page-btn nav-prev" data-page="${cur - 1}" ${cur === 1 ? 'disabled' : ''} title="ก่อนหน้า">◀️</button>
                ${pageNumbers.map(p => {
                    if (p === '...') return `<span style="padding:0 6px; color:var(--text-dim);">...</span>`;
                    return `<button class="page-btn num-btn ${p === cur ? 'active' : ''}" data-page="${p}">${p}</button>`;
                }).join('')}
                <button class="page-btn nav-next" data-page="${cur + 1}" ${cur === totalPages ? 'disabled' : ''} title="ถัดไป">▶️</button>
                <button class="page-btn nav-last" data-page="${totalPages}" ${cur === totalPages ? 'disabled' : ''} title="หน้าสุดท้าย">หน้าสุดท้าย ⏭️</button>
            </div>
        `;

        paginationTopControls.innerHTML = sizeHtml;
        paginationBottomControls.innerHTML = `
            <div class="pagination-wrapper">
                <div style="font-size:0.85rem; color:var(--text-muted);">
                    แสดงที่ <strong>${startIndex + 1}–${endIndex}</strong> จากทั้งหมด <strong>${totalItems}</strong> ตัว
                </div>
                ${pagesHtml}
                ${sizeHtml}
            </div>
        `;

        attachPaginationEvents(totalPages);
    }

    function attachPaginationEvents(totalPages) {
        // Page buttons click
        const allPageBtns = document.querySelectorAll('.page-btn[data-page]');
        allPageBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetPage = parseInt(btn.getAttribute('data-page'), 10);
                if (targetPage >= 1 && targetPage <= totalPages && targetPage !== state.pokemonCurrentPage) {
                    state.pokemonCurrentPage = targetPage;
                    renderPokemon();
                    const topTarget = document.getElementById('tab-pokedex');
                    if (topTarget) {
                        topTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });
        });

        // Page size buttons click
        const allSizeBtns = document.querySelectorAll('.page-size-btn[data-size]');
        allSizeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const sz = btn.getAttribute('data-size');
                state.pokemonPageSize = sz === 'all' ? 'all' : parseInt(sz, 10);
                state.pokemonCurrentPage = 1;
                renderPokemon();
            });
        });
    }

    // 5. Render Villagers & VS Seeker Teams
    function renderVillagers() {
        const filtered = data.villagers.filter(v => {
            if (!state.searchQuery) return true;
            return v.name.toLowerCase().includes(state.searchQuery) ||
                   v.partnerId.toLowerCase().includes(state.searchQuery) ||
                   v.theme.toLowerCase().includes(state.searchQuery);
        });

        villagerGrid.innerHTML = filtered.map(v => {
            const partnerSpecies = data.species.find(s => s.id.toLowerCase() === (v.partnerId || '').toLowerCase());
            let partnerPortrait = 'assets/items/pokeball_stardew.png';
            if (partnerSpecies) {
                const rawPartner = (state.isShinyMode && partnerSpecies.portraitShiny) ? partnerSpecies.portraitShiny : (partnerSpecies.portrait || 'assets/items/pokeball_stardew.png');
                partnerPortrait = fixAssetUrl(rawPartner);
            }
            const partnerDisplayName = partnerSpecies ? partnerSpecies.name : (v.partnerId || 'คู่หู');
            const villagerPortrait = fixAssetUrl(v.portrait || 'assets/items/pokeball_stardew.png');

            // Render VS Seeker tiers
            let vsTiersHtml = '';
            if (v.vsTeams && v.vsTeams.length > 0) {
                const tierLabels = ['Tier 1 (Lv 15)', 'Tier 2 (Lv 30)', 'Tier 3 (Lv 45)', 'Tier 4 (Lv 60)'];
                vsTiersHtml = v.vsTeams.map((team, idx) => `
                    <div class="vs-tier-row">
                        <span class="tier-label">${tierLabels[idx] || `Tier ${idx+1}`}</span>
                        <div class="tier-pokemon-list">
                            ${team.map(pokeId => {
                                const teamPoke = data.species.find(s => s.id.toLowerCase() === pokeId.toLowerCase());
                                const iconUrl = teamPoke ? fixAssetUrl((state.isShinyMode && teamPoke.portraitShiny) ? teamPoke.portraitShiny : teamPoke.portrait) : 'assets/items/pokeball_stardew.png';
                                const displayName = teamPoke ? teamPoke.name : pokeId;
                                return `<span class="mini-poke-badge" title="${displayName}" style="display:inline-flex; align-items:center; gap:5px;">
                                    <img src="${iconUrl}" style="width:20px; height:20px; image-rendering:pixelated;" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='assets/items/pokeball_stardew.png';" />
                                    <span>${displayName}</span>
                                </span>`;
                            }).join('')}
                        </div>
                    </div>
                `).join('');
            } else {
                vsTiersHtml = `<div style="font-size:0.8rem; color:var(--text-dim); padding:6px 0;">ไม่มีข้อมูลการแข่งขัน VS Seeker</div>`;
            }

            const partnerTypesHtml = partnerSpecies ? partnerSpecies.types.map(t => `<span class="type-tag type-${t}" style="font-size:0.68rem; padding:1px 6px;">${t}</span>`).join('') : '';

            return `
                <div class="villager-card">
                    <div class="villager-profile-top">
                        <div class="villager-portrait-frame">
                            <img src="${villagerPortrait}" class="villager-avatar" alt="${v.name}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='assets/items/pokeball_stardew.png'" />
                        </div>
                        <div class="villager-info-col">
                            <div class="villager-title-row">
                                <span class="villager-name">${v.name}</span>
                                ${v.marriageCandidate ? '<span class="marriage-pill">💕 จีบได้</span>' : ''}
                            </div>
                            <div class="villager-theme">${v.theme}</div>
                        </div>
                    </div>

                    <div class="partner-box">
                        <div class="partner-avatar-frame">
                            <img src="${partnerPortrait}" class="partner-portrait" alt="${partnerDisplayName}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='assets/items/pokeball_stardew.png'" />
                        </div>
                        <div class="partner-info">
                            <div class="partner-label">⭐ โปเกมอนคู่หูประจำตัว (Partner Pokémon)</div>
                            <div class="partner-name-row">
                                <span class="partner-name">${partnerDisplayName}</span>
                                <div class="partner-types">${partnerTypesHtml}</div>
                            </div>
                        </div>
                    </div>

                    <div class="vs-tiers-box">
                        <div class="vs-tiers-title">⚔️ ทีมต่อสู้ VS Seeker (4 ระดับความยาก)</div>
                        ${vsTiersHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    // 6. Render Mounts
    function renderMounts() {
        const mounts = data.species.filter(s => s.isRideable);
        mountGrid.innerHTML = mounts.map(m => {
            const ride = m.rideInfo || {};
            const speedBonusPercent = Math.round((ride.speedBonus || 0) * 100);
            const portrait = fixAssetUrl((state.isShinyMode && m.portraitShiny) ? m.portraitShiny : (m.portrait || 'assets/items/pokeball_stardew.png'));
            return `
                <div class="mount-card">
                    <div class="mount-header">
                        <img src="${portrait}" class="mount-portrait" alt="${m.name}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='assets/items/pokeball_stardew.png'" />
                        <div>
                            <div class="mount-title">${m.name}</div>
                            <div style="font-size:0.8rem; color:#f59e0b;">🏇 ความเร็ว +${speedBonusPercent}%</div>
                        </div>
                    </div>
                    <div class="mount-attrs">
                        <div class="mount-attr-item">
                            <span>ประเภทเสียงฝีเท้า:</span>
                            <strong>${ride.mountSound}</strong>
                        </div>
                        <div class="mount-attr-item">
                            <span>บินข้ามน้ำได้:</span>
                            <strong>${ride.canFly ? '✅ ได้' : '❌ ไม่ได้'}</strong>
                        </div>
                        <div class="mount-attr-item">
                            <span>ว่ายน้ำได้:</span>
                            <strong>${ride.canSwim ? '✅ ได้' : '❌ ไม่ได้'}</strong>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 7. Render Items (Rich Encyclopedia)
    function renderItems() {
        if (!itemGrid) return;
        const items = data.items || [];
        const cat = state.selectedItemCategory;
        const query = (state.itemSearchQuery || '').toLowerCase();

        const filtered = items.filter(it => {
            // Category filter
            if (cat !== 'all') {
                const c = (it.category || '').toLowerCase();
                if (cat === 'ball' && !c.includes('ball')) return false;
                if (cat === 'stone' && !c.includes('stone') && !c.includes('หิน')) return false;
                if (cat === 'catalyst' && !c.includes('catalyst') && !c.includes('สายเฉพาะ')) return false;
                if (cat === 'mint' && !c.includes('mint') && !c.includes('มิ้นต์')) return false;
                if (cat === 'slate' && !c.includes('slate') && !c.includes('plate') && !c.includes('ศิลา')) return false;
                if (cat === 'fossil' && !c.includes('fossil') && !c.includes('ฟอสซิล')) return false;
                if (cat === 'medicine' && !c.includes('medicine') && !c.includes('ยา') && !c.includes('candy') && !c.includes('ลูกอม')) return false;
                if (cat === 'key' && !c.includes('key') && !c.includes('สำคัญ') && !c.includes('เครื่องมือ') && !c.includes('ฟาร์ม')) return false;
            }

            // Search filter
            if (query) {
                const inNameTh = (it.nameTh || '').toLowerCase().includes(query);
                const inNameEn = (it.nameEn || '').toLowerCase().includes(query);
                const inDesc = (it.description || '').toLowerCase().includes(query);
                const inUsage = (it.usage || '').toLowerCase().includes(query);
                const inSource = (it.howToObtain || '').toLowerCase().includes(query);
                if (!inNameTh && !inNameEn && !inDesc && !inUsage && !inSource) return false;
            }

            return true;
        });

        itemGrid.innerHTML = filtered.map(it => `
            <div class="item-card">
                <div class="item-card-header">
                    <div class="item-sprite-box">
                        <img src="${fixAssetUrl(it.sprite)}" class="item-sprite" alt="${it.nameEn || it.nameTh}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='assets/items/pokeball_stardew.png';" />
                    </div>
                    <div class="item-title-box">
                        <div class="item-name-th">${it.nameTh || it.nameEn}</div>
                        <div class="item-name-en">${it.nameEn}</div>
                        <span class="item-category-tag">${it.category}</span>
                    </div>
                </div>
                <div class="item-desc-text">${it.description}</div>
                <div class="item-section-box">
                    <div class="item-section-label">⚡ ใช้ทำอะไรได้บ้าง:</div>
                    <div class="item-section-val">${it.usage}</div>
                </div>
                <div class="item-section-box">
                    <div class="item-section-label">🔍 วิธีได้รับ / แหล่งที่มา:</div>
                    <div class="item-section-val">${it.howToObtain}</div>
                </div>
            </div>
        `).join('');
    }

    // 7.5 Render Mega Evolutions (All 30 Mega Forms)
    function renderMega() {
        if (!megaGrid) return;
        const forms = (data.mega && data.mega.forms) || [];
        const query = (state.megaSearchQuery || '').toLowerCase();

        const filtered = forms.filter(m => {
            if (!query) return true;
            const inName = (m.displayName && m.displayName.toLowerCase().includes(query)) ||
                           (m.baseSpeciesId && m.baseSpeciesId.toLowerCase().includes(query));
            const inAbility = (m.specialAbility && m.specialAbility.toLowerCase().includes(query)) ||
                              (m.specialDescription && m.specialDescription.toLowerCase().includes(query));
            return inName || inAbility;
        });

        megaGrid.innerHTML = filtered.map(m => `
            <div class="mega-card">
                <div class="mega-card-header">
                    <div class="mega-portrait-box">
                        <img src="${fixAssetUrl(m.portrait)}" alt="${m.displayName}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='assets/items/pokeball_stardew.png';" />
                        <span class="mega-symbol-badge">MEGA</span>
                    </div>
                    <div class="mega-title-box">
                        <div class="mega-dex">#${String(m.dex).padStart(3, '0')} • ${m.baseSpeciesId.toUpperCase()}</div>
                        <div class="mega-name">${m.displayName}</div>
                        <div style="font-size:0.75rem; color:#94a3b8;">ขนาดเฟรมโมเดล: ${m.frameSize}px</div>
                    </div>
                </div>
                <div class="mega-ability-card">
                    <div class="mega-ability-title">
                        <span>🔮</span>
                        <span>${m.specialAbility}</span>
                    </div>
                    <div class="mega-ability-desc">${m.specialDescription}</div>
                </div>
                <div style="background:rgba(0,0,0,0.3); border-radius:8px; padding:8px 10px; font-size:0.78rem; display:flex; justify-content:space-between; align-items:center; border:1px solid rgba(249,115,22,0.2);">
                    <span style="color:#fdba74; font-weight:700;">💎 ไอเทมที่ใช้: <strong>กำไลเมก้า (Mega Band)</strong></span>
                    <span style="color:#94a3b8;">เงื่อนไข: <strong>เลเวล 50+</strong></span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#64748b; border-top:1px solid rgba(255,255,255,0.05); padding-top:8px;">
                    <span>HP & สเตตัส: <strong style="color:#34d399;">+25%</strong></span>
                    <span>เดินตาม: <strong style="color:#38bdf8;">+15%</strong></span>
                    <span>อบิลิตี้: <strong style="color:#fbbf24;">1.5x</strong></span>
                </div>
            </div>
        `).join('');
    }

    // 8. Render Quests (All 58 Quests)
    function renderQuests() {
        if (!questGrid) return;
        const quests = data.quests || [];
        const filtered = quests.filter(q => {
            const matchesCat = state.selectedQuestCategory === 'all' || q.category === state.selectedQuestCategory;
            if (!matchesCat) return false;
            if (!state.questSearchQuery) return true;
            const query = state.questSearchQuery.toLowerCase();
            const inTitle = (q.titleTh && q.titleTh.toLowerCase().includes(query)) ||
                            (q.titleEn && q.titleEn.toLowerCase().includes(query));
            const inReq = q.requester && q.requester.toLowerCase().includes(query);
            const inLoc = q.location && q.location.toLowerCase().includes(query);
            const inTargets = (q.targets || []).some(t => t.name.toLowerCase().includes(query) || (t.id && t.id.toLowerCase().includes(query)));
            return inTitle || inReq || inLoc || inTargets;
        });

        if (questCountBadge) {
            questCountBadge.textContent = `แสดง ${filtered.length} จากทั้งหมด ${quests.length} ภารกิจ`;
        }

        if (filtered.length === 0) {
            questGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding:50px 20px; color:var(--text-muted); background:var(--bg-card); border-radius:16px; border:1px solid var(--border-color);">
                    <div style="font-size:2.5rem; margin-bottom:10px;">🔍</div>
                    <div style="font-size:1.1rem; font-weight:700; color:var(--text-main);">ไม่พบเควสต์ที่ตรงกับคำค้นหา "${state.questSearchQuery}"</div>
                    <div style="font-size:0.85rem; margin-top:6px;">ลองเปลี่ยนหมวดหมู่หรือตรวจสอบตัวสะกดใหม่อีกครั้ง</div>
                </div>
            `;
            return;
        }

        const CAT_BADGES = {
            story: { label: '📖 เควสต์มิตรภาพ & เนื้อเรื่อง', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)', border: 'rgba(96, 165, 250, 0.3)' },
            mail: { label: '✉️ ภารกิจส่งจดหมาย (Mail Favor)', color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)', border: 'rgba(52, 211, 153, 0.3)' },
            league: { label: '⚔️ ลีกประลอง Pelican Town', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.3)' },
            legendary: { label: '🦅 สัตว์เทพในตำนาน & มิติ', color: '#f472b6', bg: 'rgba(244, 114, 182, 0.12)', border: 'rgba(244, 114, 182, 0.3)' }
        };

        questGrid.innerHTML = filtered.map(q => {
            const badge = CAT_BADGES[q.category] || { label: '📜 ภารกิจทั่วไป', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)', border: 'rgba(167, 139, 250, 0.3)' };

            // Targets HTML
            const targetsHtml = (q.targets || []).map(t => {
                const typesHtml = (t.types || []).map(tp => `<span class="type-tag type-${tp}" style="font-size:0.6rem; padding:1px 5px;">${tp}</span>`).join('');
                return `
                    <div class="quest-target-chip">
                        <img src="${fixAssetUrl(t.portrait)}" class="quest-target-avatar" alt="${t.name}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='assets/items/pokeball_stardew.png';" />
                        <div class="quest-target-details">
                            <div class="quest-target-name">${t.name} ${t.level ? `<span class="quest-target-lv">Lv.${t.level}</span>` : ''}</div>
                            ${typesHtml ? `<div class="quest-target-types">${typesHtml}</div>` : ''}
                            ${t.note ? `<div class="quest-target-note">${t.note}</div>` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            // Targets Year 2 (for League)
            let targetsY2Html = '';
            if (q.targetsY2 && q.targetsY2.length > 0) {
                targetsY2Html = `
                    <div style="margin-top:10px;">
                        <div style="font-size:0.75rem; font-weight:700; color:#fbbf24; margin-bottom:6px;">🌟 ทีมปีที่ 2 เป็นต้นไป (5 สมาชิกพัฒนาขั้นสุด):</div>
                        <div class="quest-targets-row">
                            ${q.targetsY2.map(t => `
                                <div class="quest-target-chip">
                                    <img src="${fixAssetUrl(t.portrait)}" class="quest-target-avatar" alt="${t.name}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='assets/items/pokeball_stardew.png';" />
                                    <div class="quest-target-details">
                                        <div class="quest-target-name">${t.name}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            // Steps
            const stepsHtml = (q.walkthrough || []).map((step, idx) => `
                <li class="quest-step-item">
                    <span class="step-num">${idx + 1}</span>
                    <span class="step-text">${step}</span>
                </li>
            `).join('');

            // Rewards
            const rewardsHtml = (q.rewards || []).map(r => `
                <div class="quest-reward-pill">
                    ${r.sprite ? `<img src="${fixAssetUrl(r.sprite)}" class="reward-sprite" alt="${r.name}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='assets/items/pokeball_stardew.png';" />` : '🎁'}
                    <span class="reward-name">${r.name}</span>
                    ${r.amount ? `<span class="reward-amount">${r.amount}</span>` : ''}
                </div>
            `).join('');

            return `
                <div class="quest-item-card" data-category="${q.category}">
                    <div class="quest-card-header">
                        <div class="quest-requester-wrap">
                            <img src="${fixAssetUrl(q.requesterPortrait)}" class="quest-requester-avatar" alt="${q.requester}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='assets/items/pokeball_stardew.png';" />
                            <div class="quest-requester-info">
                                <span class="quest-cat-pill" style="color:${badge.color}; background:${badge.bg}; border-color:${badge.border};">${badge.label}</span>
                                <h3 class="quest-title-th">${q.titleTh}</h3>
                                <div class="quest-title-en">${q.titleEn} • ${q.requester}</div>
                            </div>
                        </div>
                    </div>

                    <div class="quest-meta-strip">
                        <div class="quest-meta-row">
                            <span class="meta-label">🔓 เงื่อนไขปลดล็อก:</span>
                            <span class="meta-val">${q.unlock}</span>
                        </div>
                        <div class="quest-meta-row">
                            <span class="meta-label">📍 สถานที่ดำเนินเควสต์:</span>
                            <span class="meta-val">${q.location}</span>
                        </div>
                    </div>

                    ${(q.targets && q.targets.length > 0) ? `
                        <div class="quest-section-block">
                            <div class="quest-section-title">🎯 โปเกมอนหรือเป้าหมายที่เกี่ยวข้อง</div>
                            <div class="quest-targets-row">${targetsHtml}</div>
                            ${targetsY2Html}
                        </div>
                    ` : ''}

                    <div class="quest-section-block">
                        <div class="quest-section-title">📝 ขั้นตอนวิธีทำเควสต์</div>
                        <ul class="quest-steps-list">${stepsHtml}</ul>
                    </div>

                    <div class="quest-section-block">
                        <div class="quest-section-title">🏆 ของรางวัลที่จะได้รับ</div>
                        <div class="quest-rewards-row">${rewardsHtml}</div>
                    </div>

                    ${q.tips ? `
                        <div class="quest-tips-box">
                            <span class="tips-icon">💡</span>
                            <span class="tips-text"><strong>ข้อควรรู้ & คำแนะนำ:</strong> ${q.tips}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    // Quest category switching
    questCatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            questCatBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.selectedQuestCategory = btn.getAttribute('data-quest-cat');
            renderQuests();
        });
    });

    // Quest search input (debounced)
    if (questSearchInput) {
        const debouncedQuestSearch = debounce(() => renderQuests(), 160);
        questSearchInput.addEventListener('input', (e) => {
            state.questSearchQuery = e.target.value.trim();
            debouncedQuestSearch();
        });
    }

    // Item category switching
    itemCatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            itemCatBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.selectedItemCategory = btn.getAttribute('data-item-cat');
            renderItems();
        });
    });

    // Item search input (debounced)
    if (itemSearchInput) {
        const debouncedItemSearch = debounce(() => renderItems(), 160);
        itemSearchInput.addEventListener('input', (e) => {
            state.itemSearchQuery = e.target.value.trim();
            debouncedItemSearch();
        });
    }

    // Mega search input (debounced)
    if (megaSearchInput) {
        const debouncedMegaSearch = debounce(() => renderMega(), 160);
        megaSearchInput.addEventListener('input', (e) => {
            state.megaSearchQuery = e.target.value.trim();
            debouncedMegaSearch();
        });
    }

    // 9. Modal Detail Popup
    function openModal(sp) {
        state.activeSpeciesModal = sp;
        const rawPortrait = state.isShinyMode && sp.portraitShiny ? sp.portraitShiny : (sp.portrait || 'assets/items/pokeball_stardew.png');
        const portrait = fixAssetUrl(rawPortrait);
        const typesHtml = sp.types.map(t => `<span class="type-tag type-${t}">${t}</span>`).join('');
        const dexFormatted = sp.dex ? `#${String(sp.dex).padStart(3, '0')}` : '---';

        document.getElementById('modalPortrait').src = portrait;
        document.getElementById('modalDex').textContent = dexFormatted;
        document.getElementById('modalName').textContent = sp.name;
        document.getElementById('modalTypes').innerHTML = typesHtml;
        document.getElementById('modalDescTh').textContent = sp.descriptionTh || 'ไม่มีคำอธิบายภาษาไทย';
        document.getElementById('modalDescEn').textContent = sp.descriptionEn || '';

        // Stats bars
        const stats = sp.stats || {};
        const maxStat = 180;
        const statKeys = [
            { key: 'hp', label: 'HP' },
            { key: 'atk', label: 'ATK' },
            { key: 'def', label: 'DEF' },
            { key: 'spa', label: 'Sp.A' },
            { key: 'spd', label: 'Sp.D' },
            { key: 'spe', label: 'SPE' }
        ];

        document.getElementById('modalStatBars').innerHTML = statKeys.map(s => {
            const val = stats[s.key] || 0;
            const pct = Math.min(100, Math.round((val / maxStat) * 100));
            return `
                <div class="stat-row">
                    <span class="stat-label">${s.label}</span>
                    <span class="stat-val">${val}</span>
                    <div class="stat-bar-track">
                        <div class="stat-bar-fill" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('') + `
            <div style="display:flex; justify-content:space-between; margin-top:6px; font-weight:700; font-size:0.9rem; color:#60a5fa;">
                <span>Total Base Stats</span>
                <span>${stats.total || 0}</span>
            </div>
        `;

        // Jobs
        document.getElementById('modalJobs').innerHTML = (sp.jobs && sp.jobs.length > 0) ?
            sp.jobs.map(j => `<span class="job-tag" style="font-size:0.85rem; padding:4px 10px;">${JOB_NAMES_TH[j] || j}</span>`).join('') :
            '<span style="color:var(--text-dim);">ไม่มีงานฟาร์มที่รองรับ</span>';

        // Habitats
        const habitatsList = sp.habitats && sp.habitats.length > 0 ? sp.habitats.join(', ') : 'พบได้ตามเควสต์หรือกิจกรรมพิเศษ';
        const seasonsList = sp.seasons && sp.seasons.length > 0 ? sp.seasons.join(', ') : 'ทุกฤดูกาล';
        document.getElementById('modalHabitats').textContent = `${habitatsList} (ฤดู: ${seasonsList})`;

        // Evolutions
        if (sp.evolutions && sp.evolutions.length > 0) {
            document.getElementById('modalEvolutions').innerHTML = sp.evolutions.map(e => `
                <div style="background:rgba(255,255,255,0.04); padding:8px 12px; border-radius:8px; margin-bottom:6px;">
                    <strong style="color:#60a5fa; text-transform:capitalize;">${e.target}</strong>: ${e.conditions.join(', ') || 'เงื่อนไขพิเศษ'}
                </div>
            `).join('');
        } else {
            document.getElementById('modalEvolutions').innerHTML = '<span style="color:var(--text-dim);">ไม่มีร่างวิวัฒนาการเพิ่มเติม</span>';
        }

        modalOverlay.classList.add('active');
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
        state.activeSpeciesModal = null;
    }

    modalCloseBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal();
    });

    // Initial Render: only Pokédex is needed right away; other tabs lazily render on click!
    renderPokemon();
});
