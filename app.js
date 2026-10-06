document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // 1. STATE & INITIALIZATION
    // ==========================================================================
    let state = {
        players: [],
        rounds: [],
        matches: []
    };

    // Admin authentication state with sessionStorage persistence
    let isAdmin = sessionStorage.getItem('acecup_is_admin') === 'true';
    let pendingAdminAction = null;

    // Active gender for standings view ('M' or 'F')
    let activeStandingsGender = 'M';

    // Toast Notification System
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'ph-info';
        if (type === 'success') icon = 'ph-check-circle';
        else if (type === 'error') icon = 'ph-warning-circle';
        
        toast.innerHTML = `<i class="ph-bold ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutToast 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    // Custom Confirmation Dialog
    function showConfirm(title, message, onConfirm) {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-msg');
        const okBtn = document.getElementById('btn-ok-confirm');
        const cancelBtn = document.getElementById('btn-cancel-confirm');
        
        if (!modal) {
            if (window.confirm(message)) onConfirm();
            return;
        }
        
        titleEl.textContent = title;
        msgEl.textContent = message;
        modal.style.display = 'flex';
        
        const cleanup = () => {
            modal.style.display = 'none';
            okBtn.onclick = null;
            cancelBtn.onclick = null;
        };
        
        okBtn.onclick = () => {
            cleanup();
            onConfirm();
        };
        cancelBtn.onclick = cleanup;
    }

    // ==========================================================================
    // 2. MOBILE-FIRST TAB NAVIGATION
    // ==========================================================================
    const navItems = document.querySelectorAll('.bottom-nav-item');
    const tabViews = document.querySelectorAll('.tab-view');

    function switchTab(targetTabId) {
        navItems.forEach(item => {
            if (item.dataset.target === targetTabId) item.classList.add('active');
            else item.classList.remove('active');
        });

        tabViews.forEach(view => {
            if (view.id === targetTabId) view.classList.add('active');
            else view.classList.remove('active');
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.switchTab = switchTab;

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            switchTab(item.dataset.target);
        });
    });

    // ==========================================================================
    // 3. ADMIN AUTHENTICATION & BOTTOM SHEET
    // ==========================================================================
    const adminSheetModal = document.getElementById('admin-sheet-modal');
    const adminSheetBackdrop = document.getElementById('admin-sheet-backdrop');
    const adminPasswordInput = document.getElementById('admin-password');
    const adminErrorEl = document.getElementById('admin-error');
    const btnCancelAdmin = document.getElementById('btn-cancel-admin');
    const btnConfirmAdmin = document.getElementById('btn-confirm-admin');
    const btnAdminToggle = document.getElementById('btn-admin-toggle');
    const adminBtnIcon = document.getElementById('admin-btn-icon');
    const adminBtnLabel = document.getElementById('admin-btn-label');

    function updateAdminUI() {
        if (!btnAdminToggle) return;
        if (isAdmin) {
            btnAdminToggle.classList.add('active-admin');
            adminBtnIcon.className = 'ph-fill ph-shield-check';
            adminBtnLabel.textContent = 'Admin ✓';
            btnAdminToggle.title = 'Bạn đang là Quản Trị Viên (Bấm để đăng xuất)';
        } else {
            btnAdminToggle.classList.remove('active-admin');
            adminBtnIcon.className = 'ph-bold ph-lock-key';
            adminBtnLabel.textContent = 'Admin';
            btnAdminToggle.title = 'Xác thực quyền Quản Trị Viên';
        }
    }

    function openAdminSheet(callback = null) {
        pendingAdminAction = callback;
        if (adminPasswordInput) adminPasswordInput.value = '';
        if (adminErrorEl) adminErrorEl.style.display = 'none';
        if (adminSheetModal) {
            adminSheetModal.style.display = 'flex';
            setTimeout(() => {
                if (adminPasswordInput) adminPasswordInput.focus();
            }, 150);
        }
    }

    function closeAdminSheet() {
        if (adminSheetModal) adminSheetModal.style.display = 'none';
        pendingAdminAction = null;
    }

    function verifyAdminPassword() {
        const pass = adminPasswordInput ? adminPasswordInput.value.trim() : '';
        if (pass === 'dobe0808') {
            isAdmin = true;
            sessionStorage.setItem('acecup_is_admin', 'true');
            updateAdminUI();
            closeAdminSheet();
            showToast('Xác thực quyền Admin thành công!', 'success');
            renderMatches();
            
            if (pendingAdminAction) {
                pendingAdminAction();
                pendingAdminAction = null;
            }
        } else {
            if (adminErrorEl) adminErrorEl.style.display = 'block';
            if (adminPasswordInput) {
                adminPasswordInput.classList.add('input-shake');
                setTimeout(() => adminPasswordInput.classList.remove('input-shake'), 400);
            }
        }
    }

    function requireAdmin(actionCallback) {
        if (isAdmin) {
            actionCallback();
            return;
        }
        openAdminSheet(actionCallback);
    }

    if (btnAdminToggle) {
        btnAdminToggle.addEventListener('click', () => {
            if (isAdmin) {
                showConfirm('Đăng Xuất Admin', 'Bạn có muốn thoát chế độ Quản Trị Viên không?', () => {
                    isAdmin = false;
                    sessionStorage.removeItem('acecup_is_admin');
                    updateAdminUI();
                    renderMatches();
                    showToast('Đã thoát chế độ Quản Trị Viên.', 'info');
                });
            } else {
                openAdminSheet();
            }
        });
    }

    if (btnCancelAdmin) btnCancelAdmin.addEventListener('click', closeAdminSheet);
    if (adminSheetBackdrop) adminSheetBackdrop.addEventListener('click', closeAdminSheet);
    if (btnConfirmAdmin) btnConfirmAdmin.addEventListener('click', verifyAdminPassword);

    if (adminPasswordInput) {
        adminPasswordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') verifyAdminPassword();
        });
    }

    updateAdminUI();

    // ==========================================================================
    // 4. DATE SELECTION & CLOUD / LOCAL SYNC
    // ==========================================================================
    const dateInput = document.getElementById('tournament-date');
    const heroDateDisplay = document.getElementById('hero-date-display');
    const btnRefresh = document.getElementById('btn-refresh');

    function formatDisplayDate(dateStr) {
        if (!dateStr) return 'Hôm nay';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    }

    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        if (heroDateDisplay) heroDateDisplay.textContent = formatDisplayDate(today);

        dateInput.addEventListener('change', () => {
            if (heroDateDisplay) heroDateDisplay.textContent = formatDisplayDate(dateInput.value);
            listenToFirebase();
        });
    }

    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            const icon = btnRefresh.querySelector('i');
            if (icon) {
                icon.style.animation = 'spin 0.5s linear';
                setTimeout(() => icon.style.animation = '', 500);
            }
            listenToFirebase();
            showToast('Đang làm mới dữ liệu giải đấu...', 'info');
        });
    }

    function updateConnectionStatus(isOnline) {
        const pill = document.getElementById('db-status-pill');
        const text = document.getElementById('db-status-text');
        if (!pill || !text) return;
        
        if (isOnline) {
            pill.className = 'db-status-pill online';
            text.textContent = 'Cloud';
            pill.title = 'Đang đồng bộ trực tuyến với Firebase Realtime Database';
        } else {
            pill.className = 'db-status-pill offline';
            text.textContent = 'Offline';
            pill.title = 'Chế độ lưu trữ Offline an toàn trên thiết bị';
        }
    }

    function getDbPath() {
        return 'acecup_events/' + (dateInput ? dateInput.value : 'default');
    }
    function getLocalStorageKey() {
        return 'acecup_events_' + (dateInput ? dateInput.value : 'default');
    }

    let currentDbRef = null;
    let lastStateString = '';

    function updateTournamentHeroState() {
        const stateChip = document.getElementById('tournament-state-chip');
        const stateText = document.getElementById('state-chip-text');
        const primaryCta = document.getElementById('hero-primary-cta');
        const ctaText = document.getElementById('hero-cta-text');
        const ctaIcon = document.getElementById('hero-cta-icon');

        if (!stateChip || !primaryCta) return;

        const totalMatches = state.matches ? state.matches.length : 0;
        const finishedMatches = state.matches ? state.matches.filter(m => m.isFinished).length : 0;

        if (totalMatches === 0) {
            // State: Before Draw
            stateChip.className = 'state-chip state-before';
            if (stateText) stateText.textContent = 'Sẵn sàng bốc thăm';
            if (ctaText) ctaText.textContent = 'Bốc Thăm Thi Đấu';
            if (ctaIcon) ctaIcon.className = 'ph-bold ph-shuffle';
            primaryCta.onclick = () => {
                switchTab('players-tab');
                const btnDraw = document.getElementById('btn-draw');
                if (btnDraw) btnDraw.scrollIntoView({ behavior: 'smooth' });
            };
        } else if (finishedMatches === totalMatches && totalMatches > 0) {
            // State: Tournament Finished
            stateChip.className = 'state-chip state-finished';
            if (stateText) stateText.textContent = 'Đã hoàn tất giải';
            if (ctaText) ctaText.textContent = 'Xem Bục Vinh Quang';
            if (ctaIcon) ctaIcon.className = 'ph-bold ph-trophy';
            primaryCta.onclick = () => switchTab('leaderboard-tab');
        } else {
            // State: Live Playing
            stateChip.className = 'state-chip state-live';
            if (stateText) stateText.textContent = `Đang đấu (${finishedMatches}/${totalMatches})`;
            if (ctaText) ctaText.textContent = 'Xem Trận Đang Đấu';
            if (ctaIcon) ctaIcon.className = 'ph-bold ph-sword';
            primaryCta.onclick = () => switchTab('matches-tab');
        }
    }

    function loadStateData(data) {
        if (data) {
            state = data;
            if (!state.players) state.players = [];
            if (!state.rounds) state.rounds = [];
            if (!state.matches) state.matches = [];
            
            window.isJustDrawn = false;
            renderMatches();
            updateLeaderboard();
        } else {
            state.players = [];
            state.rounds = [];
            state.matches = [];
            renderMatches();
            updateLeaderboard();
        }
        updateTournamentHeroState();
    }

    function saveToFirebase() {
        try {
            localStorage.setItem(getLocalStorageKey(), JSON.stringify(state));
        } catch (e) {
            console.error('LocalStorage error:', e);
        }

        if (currentDbRef && window.firebaseDB) {
            lastStateString = JSON.stringify(state);
            currentDbRef.set(state).then(() => {
                updateConnectionStatus(true);
            }).catch(err => {
                console.warn('Firebase sync warning:', err);
                updateConnectionStatus(false);
            });
        }
        updateTournamentHeroState();
    }

    function listenToFirebase() {
        const localDataStr = localStorage.getItem(getLocalStorageKey());
        if (localDataStr) {
            try {
                loadStateData(JSON.parse(localDataStr));
            } catch(e) {}
        }

        if (!window.firebaseDB) {
            updateConnectionStatus(false);
            return;
        }

        if (currentDbRef) currentDbRef.off();
        lastStateString = '';

        const path = getDbPath();
        currentDbRef = window.firebaseDB.ref(path);

        currentDbRef.on('value', (snapshot) => {
            updateConnectionStatus(true);
            const data = snapshot.val();
            const dataString = JSON.stringify(data || {});
            
            if (dataString === lastStateString) return;
            lastStateString = dataString;

            if (data) {
                try {
                    localStorage.setItem(getLocalStorageKey(), JSON.stringify(data));
                } catch(e) {}
                loadStateData(data);
            } else if (!localDataStr) {
                loadStateData(null);
            }
        }, (error) => {
            console.warn('Firebase error (fallback to local):', error);
            updateConnectionStatus(false);
            if (localDataStr) {
                try { loadStateData(JSON.parse(localDataStr)); } catch(e) {}
            }
        });
    }

    // ==========================================================================
    // 5. PLAYERS MANAGEMENT
    // ==========================================================================
    const playersList = document.getElementById('players-list');
    const predefinedPlayers = [
        { name: "Thọ", gender: "M", proxy: false },
        { name: "Phúc", gender: "M", proxy: false },
        { name: "Quân", gender: "M", proxy: false },
        { name: "Thống", gender: "M", proxy: false },
        { name: "Dũng", gender: "M", proxy: false },
        { name: "Nguyên", gender: "M", proxy: false },
        { name: "Minh", gender: "M", proxy: true },
        { name: "Quỳnh", gender: "F", proxy: false },
        { name: "Phương", gender: "F", proxy: false },
        { name: "Như", gender: "F", proxy: false },
        { name: "Lam", gender: "F", proxy: false },
        { name: "Trúc Anh", gender: "F", proxy: false }
    ];
    
    let playerCount = 0;

    function createPlayerRow(p, isCustom = false) {
        playerCount++;
        const i = playerCount;
        const row = document.createElement('div');
        row.className = 'player-card';
        row.id = `player-row-${i}`;
        
        row.innerHTML = `
            <div class="player-avatar ${p.gender === 'M' ? 'm-avatar' : 'f-avatar'}">
                <i class="ph-fill ${p.gender === 'M' ? 'ph-gender-male' : 'ph-gender-female'}" id="avatar-icon-${i}"></i>
            </div>
            <div class="player-details">
                <input type="text" class="player-input" id="p-name-${i}" placeholder="Tên VĐV ${i}" value="${p.name}" oninput="updateActiveCount()">
                <div class="player-options">
                    <div class="custom-select-wrapper">
                        <select id="p-gender-${i}" class="gender-select" onchange="updateGenderCheckbox(${i})">
                            <option value="M" ${p.gender === 'M' ? 'selected' : ''}>Nam</option>
                            <option value="F" ${p.gender === 'F' ? 'selected' : ''}>Nữ</option>
                        </select>
                    </div>
                    ${isCustom ? `
                        <button type="button" class="btn-remove-player" title="Xóa VĐV này" onclick="removePlayerRow(${i})">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="player-active-toggle" title="Tham gia thi đấu">
                <label class="switch">
                    <input type="checkbox" id="p-active-${i}" checked onchange="updateActiveCount()">
                    <span class="slider"></span>
                </label>
            </div>
        `;
        playersList.appendChild(row);
        updateActiveCount();
    }

    window.removePlayerRow = function(id) {
        const row = document.getElementById(`player-row-${id}`);
        if (row) {
            row.remove();
            updateActiveCount();
            showToast('Đã xóa VĐV', 'info');
        }
    };

    window.updateActiveCount = function() {
        let activeCount = 0;
        let males = 0;
        let females = 0;
        for (let i = 1; i <= playerCount; i++) {
            const activeEl = document.getElementById(`p-active-${i}`);
            const nameEl = document.getElementById(`p-name-${i}`);
            const genderEl = document.getElementById(`p-gender-${i}`);
            
            if (activeEl && activeEl.checked) {
                const name = nameEl ? nameEl.value.trim() : '';
                if (name) {
                    activeCount++;
                    const isM = genderEl ? genderEl.value === 'M' : true;
                    const isProxy = (name.toLowerCase() === 'minh');
                    if (isM && !isProxy) males++;
                    else females++;
                }
            }
        }
        const badge = document.getElementById('player-count-badge');
        if (badge) {
            badge.textContent = `${activeCount} VĐV (${males} Nam • ${females} Nữ)`;
        }
    };

    window.updateGenderCheckbox = function(id) {
        const gender = document.getElementById(`p-gender-${id}`).value;
        const icon = document.getElementById(`avatar-icon-${id}`);
        const avatarBox = icon.parentElement;
        
        if (gender === 'M') {
            icon.className = 'ph-fill ph-gender-male';
            avatarBox.className = 'player-avatar m-avatar';
        } else {
            icon.className = 'ph-fill ph-gender-female';
            avatarBox.className = 'player-avatar f-avatar';
        }
        updateActiveCount();
    };

    predefinedPlayers.forEach(p => createPlayerRow(p, false));

    const btnAddPlayer = document.getElementById('btn-add-player');
    if (btnAddPlayer) {
        btnAddPlayer.addEventListener('click', () => {
            createPlayerRow({ name: "", gender: "M", proxy: false }, true);
            showToast('Đã thêm 1 dòng VĐV mới.', 'info');
        });
    }

    const btnSelectAll = document.getElementById('btn-select-all');
    if (btnSelectAll) {
        btnSelectAll.addEventListener('click', () => {
            for (let i = 1; i <= playerCount; i++) {
                const cb = document.getElementById(`p-active-${i}`);
                if (cb) cb.checked = true;
            }
            updateActiveCount();
            showToast('Đã chọn tất cả VĐV', 'info');
        });
    }

    const btnDeselectAll = document.getElementById('btn-deselect-all');
    if (btnDeselectAll) {
        btnDeselectAll.addEventListener('click', () => {
            for (let i = 1; i <= playerCount; i++) {
                const cb = document.getElementById(`p-active-${i}`);
                if (cb) cb.checked = false;
            }
            updateActiveCount();
            showToast('Đã bỏ chọn tất cả VĐV', 'info');
        });
    }

    // ==========================================================================
    // 6. DRAW TOURNAMENT OPTIMIZER (500-TRIALS ZERO-COLLISION ALGORITHM)
    // ==========================================================================
    document.getElementById('btn-draw').addEventListener('click', () => {
        requireAdmin(() => {
            const errorMsg = document.getElementById('draw-error');
            errorMsg.style.display = 'none';
            
            const players = [];
            let logicalMales = 0;
            let logicalFemales = 0;
            
            for (let i = 1; i <= playerCount; i++) {
                const activeEl = document.getElementById(`p-active-${i}`);
                if (!activeEl || !activeEl.checked) continue;
                
                const nameEl = document.getElementById(`p-name-${i}`);
                const name = nameEl ? nameEl.value.trim() : '';
                if (!name) {
                    errorMsg.textContent = "Vui lòng nhập đầy đủ tên cho các VĐV tham gia.";
                    errorMsg.style.display = 'block';
                    return;
                }
                const gender = document.getElementById(`p-gender-${i}`).value;
                const isProxy = (name.toLowerCase() === 'minh');
                
                const isLogicalMale = gender === 'M' && !isProxy;
                if (isLogicalMale) logicalMales++;
                else logicalFemales++;
                
                players.push({
                    id: i,
                    name: name,
                    gender: gender,
                    isProxy: isProxy,
                    logicalGender: isLogicalMale ? 'M' : 'F',
                    matchesPlayed: 0
                });
            }

            if (logicalMales < 2 || logicalFemales < 2) {
                errorMsg.textContent = `Không đủ người để xếp trận. Cần tối thiểu 2 Nam và 2 Nữ. Hiện có: ${logicalMales} Nam, ${logicalFemales} Nữ.`;
                errorMsg.style.display = 'block';
                return;
            }

            state.players = players;
            window.isJustDrawn = true;
            generateDraw();
            
            showToast(`Bốc thăm thành công! Tổng cộng ${state.matches.length} trận đấu.`, 'success');
            switchTab('matches-tab');
        });
    });

    document.getElementById('btn-reset-draw').addEventListener('click', () => {
        requireAdmin(() => {
            showConfirm(
                'Hủy Bốc Thăm & Xóa Điểm',
                'Bạn có chắc chắn muốn hủy kết quả bốc thăm và xóa hết điểm số ngày hôm nay? Thao tác này không thể hoàn tác.',
                () => {
                    state.rounds = [];
                    state.matches = [];
                    renderMatches();
                    updateLeaderboard();
                    saveToFirebase();
                    showToast('Đã hủy lịch thi đấu thành công.', 'info');
                    switchTab('players-tab');
                }
            );
        });
    });

    function generateDraw() {
        state.rounds = [];
        state.matches = [];

        const males = state.players.filter(p => p.logicalGender === 'M');
        const females = state.players.filter(p => p.logicalGender === 'F');

        const maxPairs = Math.min(males.length, females.length);
        const playingPairs = Math.floor(maxPairs / 2) * 2;
        const numMatches = playingPairs / 2;

        if (numMatches === 0) return;

        const targetMatches = 12;
        const totalRounds = Math.ceil(targetMatches / numMatches);

        let bestSchedule = null;
        let minPenalty = Infinity;

        // 500-restart optimization loop to achieve 0 duplicate partners & 0 duplicate opponents
        for (let trial = 0; trial < 500; trial++) {
            let trialRounds = [];
            let partnerCounts = {};
            let oppCountsM = {};
            let oppCountsF = {};
            let playerMatches = {};
            state.players.forEach(p => playerMatches[p.id] = 0);

            let penalty = 0;

            for (let r = 1; r <= totalRounds; r++) {
                let sortedM = [...males].sort((a, b) => (playerMatches[a.id] - playerMatches[b.id]) || (Math.random() - 0.5));
                let sortedF = [...females].sort((a, b) => (playerMatches[a.id] - playerMatches[b.id]) || (Math.random() - 0.5));

                let roundM = sortedM.slice(0, playingPairs);
                let roundF = sortedF.slice(0, playingPairs);
                let restingThisRound = [...sortedM.slice(playingPairs), ...sortedF.slice(playingPairs)];

                // Pair Male-Female with minimum partner duplicates
                let roundPairs = [];
                let unassignedF = [...roundF];
                let shuffledM = [...roundM].sort(() => Math.random() - 0.5);

                for (let m of shuffledM) {
                    unassignedF.sort((a, b) => {
                        let countA = partnerCounts[`${m.id}-${a.id}`] || 0;
                        let countB = partnerCounts[`${m.id}-${b.id}`] || 0;
                        return (countA - countB) || (Math.random() - 0.5);
                    });
                    let chosenF = unassignedF.shift();
                    roundPairs.push({ m, f: chosenF });
                }

                // Match allocation with minimum opponent duplicates
                let bestRoundMatches = null;
                let minRoundOppCost = Infinity;

                for (let attempt = 0; attempt < 50; attempt++) {
                    let shuffledPairs = [...roundPairs].sort(() => Math.random() - 0.5);
                    let currentOppCost = 0;
                    let currentMatches = [];

                    for (let i = 0; i < numMatches; i++) {
                        let t1 = shuffledPairs[i * 2];
                        let t2 = shuffledPairs[i * 2 + 1];

                        let mKey = t1.m.id < t2.m.id ? `${t1.m.id}-${t2.m.id}` : `${t2.m.id}-${t1.m.id}`;
                        let fKey = t1.f.id < t2.f.id ? `${t1.f.id}-${t2.f.id}` : `${t2.f.id}-${t1.f.id}`;

                        let mOpp = oppCountsM[mKey] || 0;
                        let fOpp = oppCountsF[fKey] || 0;

                        currentOppCost += (mOpp * mOpp * 10) + (fOpp * fOpp * 10);
                        currentMatches.push({
                            id: (r - 1) * numMatches + i + 1,
                            court: i + 1,
                            round: r,
                            team1: t1,
                            team2: t2,
                            score1: '',
                            score2: '',
                            isFinished: false
                        });
                    }

                    if (currentOppCost < minRoundOppCost) {
                        minRoundOppCost = currentOppCost;
                        bestRoundMatches = currentMatches;
                        if (currentOppCost === 0) break;
                    }
                }

                bestRoundMatches.forEach(match => {
                    let t1 = match.team1;
                    let t2 = match.team2;

                    let pKey1 = `${t1.m.id}-${t1.f.id}`;
                    let pKey2 = `${t2.m.id}-${t2.f.id}`;
                    let pDup1 = partnerCounts[pKey1] || 0;
                    let pDup2 = partnerCounts[pKey2] || 0;
                    penalty += (pDup1 * 1000) + (pDup2 * 1000);

                    partnerCounts[pKey1] = pDup1 + 1;
                    partnerCounts[pKey2] = pDup2 + 1;

                    let mKey = t1.m.id < t2.m.id ? `${t1.m.id}-${t2.m.id}` : `${t2.m.id}-${t1.m.id}`;
                    let fKey = t1.f.id < t2.f.id ? `${t1.f.id}-${t2.f.id}` : `${t2.f.id}-${t1.f.id}`;
                    let oppM = oppCountsM[mKey] || 0;
                    let oppF = oppCountsF[fKey] || 0;
                    penalty += (oppM * 100) + (oppF * 100);

                    oppCountsM[mKey] = oppM + 1;
                    oppCountsF[fKey] = oppF + 1;

                    playerMatches[t1.m.id]++;
                    playerMatches[t1.f.id]++;
                    playerMatches[t2.m.id]++;
                    playerMatches[t2.f.id]++;
                });

                trialRounds.push({
                    round: r,
                    matches: bestRoundMatches,
                    resting: restingThisRound
                });
            }

            let matchVals = Object.values(playerMatches);
            let variance = Math.max(...matchVals) - Math.min(...matchVals);
            penalty += variance * 5000;

            if (penalty < minPenalty) {
                minPenalty = penalty;
                bestSchedule = trialRounds;
                if (penalty === 0) break;
            }
        }

        state.rounds = bestSchedule;
        state.matches = [];
        state.rounds.forEach(r => {
            state.matches = state.matches.concat(r.matches);
        });

        renderMatches();
        updateLeaderboard();
        updateTournamentHeroState();
    }

    function getGenderIcon(p) {
        if (p.gender === 'M' && !p.isProxy) return '<i class="ph-fill ph-gender-male gender-icon m"></i>';
        if (p.gender === 'F') return '<i class="ph-fill ph-gender-female gender-icon f"></i>';
        return '<i class="ph-fill ph-gender-neuter gender-icon f" title="Nam đánh suất Nữ"></i>';
    }

    // ==========================================================================
    // 7. MATCH CARDS & LARGE COURTSIDE STEPPERS
    // ==========================================================================
    function renderMatches() {
        const container = document.getElementById('rounds-container');
        if (!container) return;
        container.innerHTML = '';

        if (!state.rounds || state.rounds.length === 0) {
            container.innerHTML = `
                <div class="empty-state-box">
                    <div class="empty-state-icon">
                        <i class="ph-fill ph-sword"></i>
                    </div>
                    <h3 class="empty-state-title">Chưa có lịch thi đấu</h3>
                    <p class="empty-state-desc">Hãy điểm danh các tay vợt tham gia hôm nay và bấm "Bốc thăm" để tạo lịch đấu công bằng.</p>
                    <button class="empty-state-action" onclick="switchTab('players-tab')">
                        <i class="ph-bold ph-users-three"></i> Đến Danh Sách VĐV
                    </button>
                </div>
            `;
            return;
        }

        const isAnimating = window.isJustDrawn;
        window.isJustDrawn = false;
        const allNames = state.players.map(p => p.name);

        state.rounds.forEach(roundObj => {
            const rBlock = document.createElement('div');
            rBlock.className = 'round-block';

            let restingHtml = '';
            if (roundObj.resting && roundObj.resting.length > 0) {
                const restTags = roundObj.resting.map(p => 
                    `<span class="resting-pill">${getGenderIcon(p)} ${p.name}</span>`
                ).join('');
                restingHtml = `
                    <div class="resting-strip">
                        <span><i class="ph-fill ph-coffee"></i> Nghỉ vòng này:</span>
                        ${restTags}
                    </div>
                `;
            }

            rBlock.innerHTML = `
                <div class="round-header">
                    <span class="round-title">Vòng ${roundObj.round}</span>
                    <div class="round-line"></div>
                </div>
                ${restingHtml}
            `;

            const matches = roundObj.matches || [];
            matches.forEach(match => {
                const card = document.createElement('div');
                card.className = `match-card ${match.isFinished ? 'finished' : ''}`;
                if (isAnimating) card.classList.add('card-flipping');
                card.id = `match-card-${match.id}`;
                
                const isT1Win = match.isFinished && match.score1 > match.score2;
                const isT2Win = match.isFinished && match.score2 > match.score1;

                // Status chip definition
                let statusClass = 'waiting';
                let statusLabel = 'Chờ đấu';
                if (match.isFinished) {
                    statusClass = 'done';
                    statusLabel = 'Đã xong';
                } else if (match.score1 !== '' || match.score2 !== '') {
                    statusClass = 'playing';
                    statusLabel = 'Đang đấu';
                }

                const courtNum = match.court || (((match.id - 1) % 3) + 1);

                // Animated name ghosting if just drawn
                const t1m = isAnimating ? `<span class="shuffle-text shuffle-ghost" data-real="${match.team1.m.name}">???</span>` : match.team1.m.name;
                const t1f = isAnimating ? `<span class="shuffle-text shuffle-ghost" data-real="${match.team1.f.name}">???</span>` : match.team1.f.name;
                const t2m = isAnimating ? `<span class="shuffle-text shuffle-ghost" data-real="${match.team2.m.name}">???</span>` : match.team2.m.name;
                const t2f = isAnimating ? `<span class="shuffle-text shuffle-ghost" data-real="${match.team2.f.name}">???</span>` : match.team2.f.name;

                // Viewer vs Admin score display
                let scoreControlHtml = '';
                if (isAdmin) {
                    scoreControlHtml = `
                        <div class="stepper-control-row">
                            <div class="stepper-group">
                                <span class="stepper-team-label">T1</span>
                                <button type="button" class="stepper-btn" onclick="stepperStep(${match.id}, 1, -1)">-</button>
                                <input type="number" class="stepper-input" id="s1-${match.id}" value="${match.score1}" min="0" placeholder="0" oninput="markMatchPlaying(${match.id})">
                                <button type="button" class="stepper-btn" onclick="stepperStep(${match.id}, 1, 1)">+</button>
                            </div>

                            <span class="vs-pill">:</span>

                            <div class="stepper-group">
                                <span class="stepper-team-label">T2</span>
                                <button type="button" class="stepper-btn" onclick="stepperStep(${match.id}, 2, -1)">-</button>
                                <input type="number" class="stepper-input" id="s2-${match.id}" value="${match.score2}" min="0" placeholder="0" oninput="markMatchPlaying(${match.id})">
                                <button type="button" class="stepper-btn" onclick="stepperStep(${match.id}, 2, 1)">+</button>
                            </div>

                            <div class="stepper-actions">
                                <button class="btn-stepper-save" onclick="saveMatch(${match.id})" title="Lưu điểm số">
                                    <i class="ph-bold ph-check"></i> Lưu
                                </button>
                                ${match.isFinished ? `
                                <button class="btn-stepper-delete" onclick="clearMatchScore(${match.id})" title="Xóa điểm trận này">
                                    <i class="ph-bold ph-trash"></i>
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }

                card.innerHTML = `
                    <div class="match-meta-bar">
                        <span class="court-badge"><i class="ph-bold ph-tennis-ball"></i> Trận ${match.id} • Sân ${courtNum}</span>
                        <span class="match-status-chip ${statusClass}" id="chip-status-${match.id}">${statusLabel}</span>
                    </div>

                    <div class="match-arena">
                        <div class="team-box ${isT1Win ? 'winner' : ''}">
                            ${isT1Win ? '<span class="winner-tag">🏆 THẮNG</span>' : ''}
                            <div class="player-tag">${getGenderIcon(match.team1.m)} <span>${t1m}</span></div>
                            <div class="player-tag">${getGenderIcon(match.team1.f)} <span>${t1f}</span></div>
                        </div>

                        <div class="match-center-arena">
                            <span class="vs-pill">VS</span>
                            <div class="viewer-score-badge ${match.isFinished ? 'finished' : ''}">
                                <span class="score-val ${isT1Win ? 'high' : ''}">${match.isFinished ? match.score1 : '-'}</span>
                                <span class="score-divider">:</span>
                                <span class="score-val ${isT2Win ? 'high' : ''}">${match.isFinished ? match.score2 : '-'}</span>
                            </div>
                        </div>

                        <div class="team-box ${isT2Win ? 'winner' : ''}">
                            ${isT2Win ? '<span class="winner-tag">🏆 THẮNG</span>' : ''}
                            <div class="player-tag">${getGenderIcon(match.team2.m)} <span>${t2m}</span></div>
                            <div class="player-tag">${getGenderIcon(match.team2.f)} <span>${t2f}</span></div>
                        </div>
                    </div>

                    ${scoreControlHtml}
                `;
                rBlock.appendChild(card);
            });
            container.appendChild(rBlock);
        });

        // 3D Flip Card animation stagger
        if (isAnimating) {
            const flippingCards = document.querySelectorAll('.card-flipping');
            if (flippingCards.length > 0) {
                const shuffleInterval = setInterval(() => {
                    document.querySelectorAll('.shuffle-ghost').forEach(span => {
                        span.textContent = allNames[Math.floor(Math.random() * allNames.length)];
                    });
                }, 60);

                flippingCards.forEach((card, index) => {
                    setTimeout(() => {
                        card.querySelectorAll('.shuffle-text').forEach(span => {
                            span.textContent = span.getAttribute('data-real');
                            span.classList.remove('shuffle-ghost');
                        });

                        if (index === flippingCards.length - 1) {
                            clearInterval(shuffleInterval);
                            saveToFirebase();
                        }
                    }, 400 + (index * 250));
                });
            }
        } else {
            saveToFirebase();
        }
    }

    window.markMatchPlaying = function(matchId) {
        const chip = document.getElementById(`chip-status-${matchId}`);
        if (chip) {
            chip.className = 'match-status-chip playing';
            chip.textContent = 'Đang đấu';
        }
    };

    window.stepperStep = function(matchId, team, delta) {
        const inputId = team === 1 ? `s1-${matchId}` : `s2-${matchId}`;
        const input = document.getElementById(inputId);
        if (!input) return;
        let val = parseInt(input.value);
        if (isNaN(val)) val = 0;
        val += delta;
        if (val < 0) val = 0;
        input.value = val;
        markMatchPlaying(matchId);
    };

    window.saveMatch = function(matchId) {
        const match = state.matches.find(m => m.id === matchId);
        if (!match) return;

        const s1El = document.getElementById(`s1-${matchId}`);
        const s2El = document.getElementById(`s2-${matchId}`);
        if (!s1El || !s2El) return;

        const s1 = parseInt(s1El.value);
        const s2 = parseInt(s2El.value);

        if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
            showToast('Vui lòng nhập điểm hợp lệ cho 2 đội!', 'error');
            return;
        }

        match.score1 = s1;
        match.score2 = s2;
        match.isFinished = true;

        if (state.rounds) {
            state.rounds.forEach(r => {
                if (r.matches) {
                    const rMatch = r.matches.find(m => m.id === matchId);
                    if (rMatch) {
                        rMatch.score1 = s1;
                        rMatch.score2 = s2;
                        rMatch.isFinished = true;
                    }
                }
            });
        }

        updateLeaderboard();
        renderMatches();
        saveToFirebase();
        showToast(`Đã lưu kết quả trận ${matchId} (${s1} - ${s2})!`, 'success');
    };

    window.clearMatchScore = function(matchId) {
        showConfirm('Xóa Điểm Trận Đấu', 'Bạn có chắc chắn muốn xóa điểm của trận đấu này?', () => {
            const match = state.matches.find(m => m.id === matchId);
            if (!match) return;

            match.score1 = '';
            match.score2 = '';
            match.isFinished = false;

            if (state.rounds) {
                state.rounds.forEach(r => {
                    if (r.matches) {
                        const rMatch = r.matches.find(m => m.id === matchId);
                        if (rMatch) {
                            rMatch.score1 = '';
                            rMatch.score2 = '';
                            rMatch.isFinished = false;
                        }
                    }
                });
            }

            updateLeaderboard();
            renderMatches();
            saveToFirebase();
            showToast(`Đã xóa điểm trận ${matchId}.`, 'info');
        });
    };

    // ==========================================================================
    // 8. STANDINGS, TOP 3 PODIUM & STICKY TABLE
    // ==========================================================================
    function updateLeaderboard() {
        const stats = {};
        state.players.forEach(p => {
            stats[p.id] = { 
                p: p, 
                matches: 0, 
                wins: 0, 
                losses: 0, 
                diff: 0, 
                pts: 0,
                h2hWonTiebreak: false
            };
        });

        const h2h = {};
        state.players.forEach(p1 => {
            h2h[p1.id] = {};
            state.players.forEach(p2 => {
                h2h[p1.id][p2.id] = { matches: 0, wins: 0, diff: 0, pts: 0 };
            });
        });

        state.matches.forEach(m => {
            if (m.isFinished) {
                const s1 = parseInt(m.score1) || 0;
                const s2 = parseInt(m.score2) || 0;

                const addStats = (p, myScore, oppScore) => {
                    if (!stats[p.id]) return;
                    stats[p.id].matches++;
                    stats[p.id].pts += myScore;
                    stats[p.id].diff += (myScore - oppScore);
                    if (myScore > oppScore) stats[p.id].wins++;
                    else if (myScore < oppScore) stats[p.id].losses++;
                };

                const addH2H = (p1, p2, myScore, oppScore) => {
                    if (h2h[p1.id] && h2h[p1.id][p2.id]) {
                        h2h[p1.id][p2.id].matches++;
                        h2h[p1.id][p2.id].pts += myScore;
                        h2h[p1.id][p2.id].diff += (myScore - oppScore);
                        if (myScore > oppScore) h2h[p1.id][p2.id].wins++;
                    }
                };

                addStats(m.team1.m, s1, s2);
                addStats(m.team1.f, s1, s2);
                addStats(m.team2.m, s2, s1);
                addStats(m.team2.f, s2, s1);

                addH2H(m.team1.m, m.team2.m, s1, s2);
                addH2H(m.team2.m, m.team1.m, s2, s1);
                addH2H(m.team1.f, m.team2.f, s1, s2);
                addH2H(m.team2.f, m.team1.f, s2, s1);
            }
        });

        const sortFn = (a, b) => {
            // 1. Matches won
            if (b.wins !== a.wins) return b.wins - a.wins;

            // 2. Head-to-head (H2H)
            if (h2h[a.p.id] && h2h[a.p.id][b.p.id] && h2h[a.p.id][b.p.id].matches > 0) {
                const aWins = h2h[a.p.id][b.p.id].wins;
                const bWins = h2h[b.p.id][a.p.id].wins;
                if (aWins !== bWins) {
                    if (aWins > bWins) a.h2hWonTiebreak = true;
                    else b.h2hWonTiebreak = true;
                    return bWins - aWins;
                }

                const aDiff = h2h[a.p.id][b.p.id].diff;
                const bDiff = h2h[b.p.id][a.p.id].diff;
                if (aDiff !== bDiff) {
                    if (aDiff > bDiff) a.h2hWonTiebreak = true;
                    else b.h2hWonTiebreak = true;
                    return bDiff - aDiff;
                }
            }

            // 3. Point difference (+/-)
            if (b.diff !== a.diff) return b.diff - a.diff;

            // 4. Total points scored
            if (b.pts !== a.pts) return b.pts - a.pts;

            // 5. Least losses
            return a.losses - b.losses;
        };

        const males = Object.values(stats).filter(s => s.p.logicalGender === 'M').sort(sortFn);
        const females = Object.values(stats).filter(s => s.p.logicalGender === 'F').sort(sortFn);

        renderStandingsView(activeStandingsGender === 'M' ? males : females);
    }

    function renderStandingsView(sortedList) {
        const podiumContainer = document.getElementById('podium-view');
        const tbody = document.getElementById('standings-tbody');
        const tableTitle = document.getElementById('table-view-title');

        if (!podiumContainer || !tbody) return;

        if (tableTitle) {
            tableTitle.innerHTML = `<i class="ph-bold ph-list-numbers"></i> Danh sách chi tiết • Bảng ${activeStandingsGender === 'M' ? 'Nam' : 'Nữ'}`;
        }

        if (sortedList.length === 0) {
            podiumContainer.innerHTML = '';
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 24px; color: var(--text-muted);">Chưa có dữ liệu bốc thăm</td></tr>';
            return;
        }

        // Top 3 Podium
        const p1 = sortedList[0];
        const p2 = sortedList[1];
        const p3 = sortedList[2];

        let podiumHtml = '';
        if (p1) {
            podiumHtml = `
                <!-- 2nd Place (Silver) -->
                ${p2 ? `
                <div class="podium-step">
                    <div class="podium-avatar-wrap">
                        <div class="podium-avatar silver">
                            ${p2.p.name.charAt(0)}
                        </div>
                        <span class="podium-name">${p2.p.name}</span>
                        <span class="podium-stats"><span class="highlight-w">${p2.wins}W</span> • ${p2.diff >= 0 ? '+' : ''}${p2.diff}</span>
                    </div>
                    <div class="podium-pillar rank-2">
                        <span class="podium-rank-num">2</span>
                        <span class="podium-metal-label">Bạc</span>
                    </div>
                </div>
                ` : ''}

                <!-- 1st Place (Gold) -->
                <div class="podium-step">
                    <div class="podium-avatar-wrap">
                        <i class="ph-fill ph-crown podium-crown"></i>
                        <div class="podium-avatar gold">
                            ${p1.p.name.charAt(0)}
                        </div>
                        <span class="podium-name">${p1.p.name}</span>
                        <span class="podium-stats"><span class="highlight-w">${p1.wins}W</span> • ${p1.diff >= 0 ? '+' : ''}${p1.diff}</span>
                    </div>
                    <div class="podium-pillar rank-1">
                        <span class="podium-rank-num">1</span>
                        <span class="podium-metal-label">Vàng</span>
                    </div>
                </div>

                <!-- 3rd Place (Bronze) -->
                ${p3 ? `
                <div class="podium-step">
                    <div class="podium-avatar-wrap">
                        <div class="podium-avatar bronze">
                            ${p3.p.name.charAt(0)}
                        </div>
                        <span class="podium-name">${p3.p.name}</span>
                        <span class="podium-stats"><span class="highlight-w">${p3.wins}W</span> • ${p3.diff >= 0 ? '+' : ''}${p3.diff}</span>
                    </div>
                    <div class="podium-pillar rank-3">
                        <span class="podium-rank-num">3</span>
                        <span class="podium-metal-label">Đồng</span>
                    </div>
                </div>
                ` : ''}
            `;
        }
        podiumContainer.innerHTML = podiumHtml;

        // Standings Table (All players with sticky rank & name)
        tbody.innerHTML = '';
        sortedList.forEach((row, i) => {
            const tr = document.createElement('tr');
            
            let diffClass = row.diff > 0 ? 'diff-pos' : (row.diff < 0 ? 'diff-neg' : '');
            let diffText = row.diff > 0 ? `+${row.diff}` : `${row.diff}`;

            let noteHtml = '';
            if (row.h2hWonTiebreak) {
                noteHtml = '<span class="h2h-badge" title="Thắng trận đối đầu trực tiếp"><i class="ph-bold ph-sword"></i> H2H</span>';
            }

            tr.innerHTML = `
                <td class="td-sticky">
                    <div class="table-row-player">
                        <span class="rank-badge-table">${i + 1}</span>
                        ${getGenderIcon(row.p)}
                        <span class="player-name-cell">${row.p.name}</span>
                    </div>
                </td>
                <td>${row.matches}</td>
                <td class="stat-win">${row.wins}</td>
                <td class="stat-loss">${row.losses}</td>
                <td class="${diffClass}">${diffText}</td>
                <td style="font-weight: 700;">${row.pts}</td>
                <td>${noteHtml}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Segmented control switch listener
    const segBtnMale = document.getElementById('seg-btn-male');
    const segBtnFemale = document.getElementById('seg-btn-female');

    if (segBtnMale && segBtnFemale) {
        segBtnMale.addEventListener('click', () => {
            segBtnMale.classList.add('active');
            segBtnMale.setAttribute('aria-selected', 'true');
            segBtnFemale.classList.remove('active');
            segBtnFemale.setAttribute('aria-selected', 'false');
            activeStandingsGender = 'M';
            updateLeaderboard();
        });

        segBtnFemale.addEventListener('click', () => {
            segBtnFemale.classList.add('active');
            segBtnFemale.setAttribute('aria-selected', 'true');
            segBtnMale.classList.remove('active');
            segBtnMale.setAttribute('aria-selected', 'false');
            activeStandingsGender = 'F';
            updateLeaderboard();
        });
    }

    // ==========================================================================
    // 9. DEDICATED GALLERY (12 PHOTOS MASONRY GRID & SWIPEABLE LIGHTBOX)
    // ==========================================================================
    const tournamentPhotos = [
        {
            id: 1,
            src: 'assets/photo_1.jpg',
            title: 'Tập Thể ACE Cup Nhận Thưởng & Huy Chương',
            category: 'awards',
            categoryName: 'Trao giải',
            desc: 'Toàn thể 12 VĐV cùng khoe huy chương và phần thưởng tại sân DE Badminton.'
        },
        {
            id: 2,
            src: 'assets/photo_2.jpg',
            title: 'Đại Gia Đình DE Badminton Tỏa Sáng Trên Sân',
            category: 'awards',
            categoryName: 'Trao giải',
            desc: 'Nụ cười chiến thắng rực rỡ của tất cả tay vợt ACE Cup sau ngày thi đấu bùng nổ.'
        },
        {
            id: 3,
            src: 'assets/photo_3.jpg',
            title: 'Bộ Ba Cặp Đôi Đoạt Huy Chương ACE Cup',
            category: 'awards',
            categoryName: 'Trao giải',
            desc: 'Các cặp đôi xuất sắc nhất giải đấu cùng khoe huy chương Vàng - Bạc - Đồng.'
        },
        {
            id: 4,
            src: 'assets/photo_4.jpg',
            title: 'Pha Đỡ Cầu Huyền Thoại "Full Giáp Nón Bảo Hiểm"',
            category: 'court',
            categoryName: 'Sân đấu',
            desc: 'Chiến thuật phòng thủ độc lạ có 1-0-2 khiến cả sân cười ngả nghiêng.'
        },
        {
            id: 5,
            src: 'assets/photo_5.jpg',
            title: 'Năng Lượng Tràn Đầy Sau Loạt Trận Căng Thẳng',
            category: 'awards',
            categoryName: 'Trao giải',
            desc: 'Tạo dáng nhí nhảnh ăn mừng một ngày so tài kịch tính.'
        },
        {
            id: 6,
            src: 'assets/photo_6.jpg',
            title: 'Top 6 Tay Vợt Đoạt Huy Chương Danh Giá',
            category: 'awards',
            categoryName: 'Trao giải',
            desc: 'Nụ cười rạng rỡ của 6 VĐV xuất sắc nhất tại bục vinh danh DE Badminton.'
        },
        {
            id: 7,
            src: 'assets/photo_7.jpg',
            title: 'Check-in Nhí Nhảnh Của Hội Anh Chị Em',
            category: 'court',
            categoryName: 'Sân đấu',
            desc: 'Không khí giao lưu ngập tràn tiếng cười và tinh thần thể thao gắn kết.'
        },
        {
            id: 8,
            src: 'assets/photo_8.jpg',
            title: 'Sẵn Sàng Cho Trận Đấu Rực Lửa Tại Thảm Xanh',
            category: 'court',
            categoryName: 'Sân đấu',
            desc: 'Các VĐV hào hứng khởi động trước giờ bốc thăm thi đấu.'
        },
        {
            id: 9,
            src: 'assets/photo_9.jpg',
            title: 'Huy Chương Vàng, Bạc, Đồng Cùng Tỏa Sáng',
            category: 'awards',
            categoryName: 'Trao giải',
            desc: 'Những nỗ lực thi đấu hết mình đã được đền đáp xứng đáng.'
        },
        {
            id: 10,
            src: 'assets/photo_10.jpg',
            title: 'Niềm Vui Nhân Đôi Cùng Phong Bì & Huy Chương',
            category: 'awards',
            categoryName: 'Trao giải',
            desc: 'Phần thưởng ngọt ngào cho những nỗ lực bứt phá từng điểm số.'
        },
        {
            id: 11,
            src: 'assets/photo_11.jpg',
            title: 'Hậu Trường Chilling Sau Khi Cháy Hết Mình',
            category: 'fun',
            categoryName: 'Hậu trường',
            desc: 'Khoảnh khắc quây quần tâm sự, nghỉ ngơi sau chuỗi trận nảy lửa.'
        },
        {
            id: 12,
            src: 'assets/photo_12.jpg',
            title: 'Selfie Toàn Đội - Tình Bạn Bền Chặt',
            category: 'fun',
            categoryName: 'Hậu trường',
            desc: 'Kỷ niệm khó phai của giải đấu giao lưu kết nối đam mê cầu lông.'
        }
    ];

    let currentPhotoIndex = 0;
    let activeFilter = 'all';

    function renderMasonryGallery() {
        const grid = document.getElementById('gallery-masonry');
        if (!grid) return;
        grid.innerHTML = '';

        const filtered = activeFilter === 'all' 
            ? tournamentPhotos 
            : tournamentPhotos.filter(p => p.category === activeFilter);

        filtered.forEach(photo => {
            const originalIndex = tournamentPhotos.findIndex(p => p.id === photo.id);
            const card = document.createElement('div');
            card.className = 'gallery-photo-card';
            card.onclick = () => openLightbox(originalIndex);

            card.innerHTML = `
                <div class="gallery-img-wrap">
                    <img src="${photo.src}" alt="${photo.title}" loading="lazy">
                    <span class="gallery-card-badge">${photo.categoryName}</span>
                </div>
                <div class="gallery-card-caption">
                    <h4>${photo.title}</h4>
                    <p>${photo.desc}</p>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // Filter Chips Listener
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.dataset.filter;
            renderMasonryGallery();
        });
    });

    renderMasonryGallery();

    // Swipeable Lightbox Elements
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxCategory = document.getElementById('lightbox-category');
    const lightboxCounter = document.getElementById('lightbox-counter');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');
    const lightboxStage = document.getElementById('lightbox-stage');

    function openLightbox(index) {
        if (index < 0 || index >= tournamentPhotos.length) return;
        currentPhotoIndex = index;
        const photo = tournamentPhotos[currentPhotoIndex];

        if (lightboxImg) lightboxImg.src = photo.src;
        if (lightboxTitle) lightboxTitle.textContent = photo.title;
        if (lightboxCaption) lightboxCaption.textContent = photo.desc;
        if (lightboxCategory) lightboxCategory.textContent = photo.categoryName;
        if (lightboxCounter) lightboxCounter.textContent = `${currentPhotoIndex + 1} / ${tournamentPhotos.length}`;

        if (lightboxModal) {
            lightboxModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
    window.openLightbox = openLightbox;

    function closeLightbox() {
        if (lightboxModal) {
            lightboxModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    window.closeLightbox = closeLightbox;

    function nextPhoto() {
        openLightbox((currentPhotoIndex + 1) % tournamentPhotos.length);
    }

    function prevPhoto() {
        openLightbox((currentPhotoIndex - 1 + tournamentPhotos.length) % tournamentPhotos.length);
    }

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxNext) lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); nextPhoto(); });
    if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); prevPhoto(); });

    if (lightboxModal) {
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) closeLightbox();
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightboxModal || lightboxModal.style.display !== 'flex') return;
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowRight') nextPhoto();
        else if (e.key === 'ArrowLeft') prevPhoto();
    });

    // Touch Swipe Navigation for Courtside Phones
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;

    if (lightboxStage) {
        lightboxStage.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        lightboxStage.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            handleLightboxSwipe();
        }, { passive: true });
    }

    function handleLightboxSwipe() {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        // Require horizontal swipe dominant over vertical
        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX < 0) {
                // Swiped Left -> Next
                nextPhoto();
            } else {
                // Swiped Right -> Prev
                prevPhoto();
            }
        }
    }

    // Initial connection trigger
    listenToFirebase();
});
