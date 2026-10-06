document.addEventListener('DOMContentLoaded', () => {
    // Tab Navigation
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetEl = document.getElementById(btn.dataset.target);
            if (targetEl) targetEl.classList.add('active');
        });
    });

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

    // Custom Confirmation Dialog Modal
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

    // Initialize Player Inputs
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
            <div class="player-active-toggle" title="Tham gia hôm nay">
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
            showToast('Đã xóa VĐV khỏi danh sách', 'info');
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
            badge.textContent = `${activeCount} Tham gia (${males} Nam • ${females} Nữ)`;
        }
    };

    predefinedPlayers.forEach(p => {
        createPlayerRow(p, false);
    });

    document.getElementById('btn-add-player').addEventListener('click', () => {
        createPlayerRow({ name: "", gender: "M", proxy: false }, true);
        showToast('Đã thêm 1 dòng VĐV mới. Nhập tên và chọn giới tính.', 'info');
    });

    // Quick select all / deselect all
    const btnSelectAll = document.getElementById('btn-select-all');
    if (btnSelectAll) {
        btnSelectAll.addEventListener('click', () => {
            for (let i = 1; i <= playerCount; i++) {
                const cb = document.getElementById(`p-active-${i}`);
                if (cb) cb.checked = true;
            }
            updateActiveCount();
            showToast('Đã chọn tất cả VĐV tham gia', 'info');
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

    // Global state
    let state = {
        players: [],
        rounds: [],
        matches: []
    };

    let isAdmin = false;
    let pendingAdminAction = null;

    function requireAdmin(actionCallback) {
        if (isAdmin) {
            actionCallback();
            return;
        }
        pendingAdminAction = actionCallback;
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-error').style.display = 'none';
        document.getElementById('admin-modal').style.display = 'flex';
        document.getElementById('admin-password').focus();
    }

    document.getElementById('btn-cancel-admin').addEventListener('click', () => {
        document.getElementById('admin-modal').style.display = 'none';
        pendingAdminAction = null;
    });

    document.getElementById('btn-confirm-admin').addEventListener('click', () => {
        const pass = document.getElementById('admin-password').value;
        if (pass === 'dobe0808') {
            isAdmin = true;
            document.getElementById('admin-modal').style.display = 'none';
            if (pendingAdminAction) {
                pendingAdminAction();
                pendingAdminAction = null;
            }
        } else {
            document.getElementById('admin-error').style.display = 'block';
        }
    });

    // Enter key submit in admin modal
    const adminPassInput = document.getElementById('admin-password');
    if (adminPassInput) {
        adminPassInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('btn-confirm-admin').click();
            }
        });
    }

    const dateInput = document.getElementById('tournament-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        
        dateInput.addEventListener('change', () => {
            listenToFirebase();
        });
    }

    const btnRefresh = document.getElementById('btn-refresh');
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

    // Connection Status Indicator
    function updateConnectionStatus(isOnline, detail = '') {
        const pill = document.getElementById('db-status-pill');
        const text = document.getElementById('db-status-text');
        if (!pill || !text) return;
        
        if (isOnline) {
            pill.className = 'db-status-pill online';
            text.textContent = 'Đồng bộ Cloud';
            pill.title = 'Đang đồng bộ trực tuyến với Firebase Realtime Database';
        } else {
            pill.className = 'db-status-pill offline';
            text.textContent = 'Lưu trữ máy (Offline)';
            pill.title = 'Firebase tạm thời không kết nối được hoặc bị giới hạn quyền. Dữ liệu đang được lưu trữ an toàn ngay trên trình duyệt!';
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
            const rContainer = document.getElementById('rounds-container');
            if (rContainer) {
                rContainer.innerHTML = '<div class="empty-state"><i class="ph-fill ph-calendar-blank"></i><p>Chưa có dữ liệu bốc thăm</p></div>';
            }
            const lTableM = document.querySelector('#leaderboard-table-male tbody');
            if (lTableM) lTableM.innerHTML = '<tr><td colspan="8" class="text-center">Chưa có dữ liệu bốc thăm</td></tr>';
            const lTableF = document.querySelector('#leaderboard-table-female tbody');
            if (lTableF) lTableF.innerHTML = '<tr><td colspan="8" class="text-center">Chưa có dữ liệu bốc thăm</td></tr>';
            updateOverviewStats(0, 0, 0, '-');
        }
    }

    function saveToFirebase() {
        // Luôn luôn lưu vào LocalStorage tức thì để không bao giờ mất dữ liệu dù Firebase lỗi
        try {
            localStorage.setItem(getLocalStorageKey(), JSON.stringify(state));
        } catch (e) {
            console.error('LocalStorage write error:', e);
        }

        if (currentDbRef && window.firebaseDB) {
            lastStateString = JSON.stringify(state);
            currentDbRef.set(state).then(() => {
                updateConnectionStatus(true);
            }).catch(err => {
                console.warn('Firebase set error:', err);
                updateConnectionStatus(false, err.message);
            });
        }
    }

    function listenToFirebase() {
        const localDataStr = localStorage.getItem(getLocalStorageKey());
        if (localDataStr) {
            try {
                const localData = JSON.parse(localDataStr);
                loadStateData(localData);
            } catch(e) {}
        }

        if (!window.firebaseDB) {
            updateConnectionStatus(false, 'Chế độ lưu trữ Offline');
            return;
        }
        
        if (currentDbRef) {
            currentDbRef.off();
        }
        lastStateString = '';
        
        const path = getDbPath();
        currentDbRef = window.firebaseDB.ref(path);
        
        currentDbRef.on('value', (snapshot) => {
            updateConnectionStatus(true);
            const data = snapshot.val();
            const dataString = JSON.stringify(data || {});
            
            if (dataString === lastStateString) {
                return;
            }
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
            console.warn('Firebase read error (sẽ dùng LocalStorage):', error);
            updateConnectionStatus(false, error.message);
            if (localDataStr) {
                try { loadStateData(JSON.parse(localDataStr)); } catch(e) {}
            }
        });
    }

    // Load initial data
    listenToFirebase();

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
                errorMsg.textContent = `Không đủ người để xếp trận. Cần tối thiểu 2 Nam và 2 Nữ tham gia để tạo 1 trận đánh đôi. Hiện có ${logicalMales} Nam, ${logicalFemales} Nữ.`;
                errorMsg.style.display = 'block';
                return;
            }

            state.players = players;
            window.isJustDrawn = true;
            generateDraw();
            
            showToast(`Bốc thăm thành công! Tổng cộng ${state.matches.length} trận đấu.`, 'success');
            document.querySelector('[data-target="matches-tab"]').click();
        });
    });

    document.getElementById('btn-reset-draw').addEventListener('click', () => {
        requireAdmin(() => {
            showConfirm(
                'Hủy Bốc Thăm & Xóa Điểm',
                'Bạn có chắc chắn muốn hủy toàn bộ kết quả bốc thăm và xóa hết điểm số của ngày này? Thao tác này không thể hoàn tác.',
                () => {
                    state.rounds = [];
                    state.matches = [];
                    renderMatches();
                    updateLeaderboard();
                    saveToFirebase();
                    showToast('Đã hủy lịch thi đấu thành công.', 'info');
                    document.querySelector('[data-target="players-tab"]').click();
                }
            );
        });
    });

    // Thuật toán Tối ưu Toàn cục (Multi-restart Global Tournament Optimizer)
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

        // Chạy lặp tối ưu hóa 500 lần (< 25ms) tìm lịch thi đấu có 0 trùng đồng đội và 0 trùng đối thủ
        for (let trial = 0; trial < 500; trial++) {
            let trialRounds = [];
            let partnerCounts = {};
            let oppCountsM = {};
            let oppCountsF = {};
            let playerMatches = {};
            state.players.forEach(p => playerMatches[p.id] = 0);

            let penalty = 0;

            for (let r = 1; r <= totalRounds; r++) {
                // Đảm bảo số trận công bằng: sắp xếp người có số trận ít hơn lên trước
                let sortedM = [...males].sort((a, b) => (playerMatches[a.id] - playerMatches[b.id]) || (Math.random() - 0.5));
                let sortedF = [...females].sort((a, b) => (playerMatches[a.id] - playerMatches[b.id]) || (Math.random() - 0.5));

                let roundM = sortedM.slice(0, playingPairs);
                let roundF = sortedF.slice(0, playingPairs);
                let restingThisRound = [...sortedM.slice(playingPairs), ...sortedF.slice(playingPairs)];

                // Ghép đôi Nam - Nữ sao cho KHÔNG trùng lặp đồng đội
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

                // Phân bổ cặp đấu sao cho KHÔNG trùng lặp đối thủ cùng giới tính
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

                // Tính điểm phạt và cập nhật bộ đếm
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

            // Phạt nếu số trận chơi không đều
            let matchVals = Object.values(playerMatches);
            let variance = Math.max(...matchVals) - Math.min(...matchVals);
            penalty += variance * 5000;

            if (penalty < minPenalty) {
                minPenalty = penalty;
                bestSchedule = trialRounds;
                if (penalty === 0) break; // Lịch đấu hoàn hảo 100%
            }
        }

        state.rounds = bestSchedule;
        state.matches = [];
        state.rounds.forEach(r => {
            state.matches = state.matches.concat(r.matches);
        });

        renderMatches();
        updateLeaderboard();
    }

    function getGenderIcon(p) {
        if (p.gender === 'M' && !p.isProxy) return '<i class="ph-fill ph-gender-male gender-icon m"></i>';
        if (p.gender === 'F') return '<i class="ph-fill ph-gender-female gender-icon f"></i>';
        return '<i class="ph-fill ph-gender-neuter gender-icon f" title="Nam đánh suất Nữ"></i>';
    }

    function renderMatches() {
        const container = document.getElementById('rounds-container');
        if (!container) return;
        container.innerHTML = '';

        if (!state.rounds || state.rounds.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="ph-fill ph-calendar-blank"></i>
                    <p>Chưa có lịch thi đấu. Hãy sang mục "Người chơi" để bốc thăm.</p>
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
                    `<div class="resting-tag">${getGenderIcon(p)} ${p.name}</div>`
                ).join('');
                restingHtml = `
                    <div class="resting-block">
                        <span><i class="ph-fill ph-coffee"></i> Nghỉ vòng này:</span>
                        ${restTags}
                    </div>
                `;
            }

            rBlock.innerHTML = `
                <div class="round-header">
                    <h3>Vòng ${roundObj.round}</h3>
                    <div class="line"></div>
                </div>
                ${restingHtml}
            `;

            const matches = roundObj.matches || [];
            matches.forEach(match => {
                const card = document.createElement('div');
                card.className = `match-card ${match.isFinished ? 'finished' : ''}`;
                if (isAnimating) card.classList.add('draw-pending');
                card.id = `match-card-${match.id}`;
                
                const isT1Win = match.isFinished && match.score1 > match.score2;
                const isT2Win = match.isFinished && match.score2 > match.score1;

                const t1m = isAnimating ? `<span class="shuffle-text" data-real="${match.team1.m.name}">???</span>` : `<span>${match.team1.m.name}</span>`;
                const t1f = isAnimating ? `<span class="shuffle-text" data-real="${match.team1.f.name}">???</span>` : `<span>${match.team1.f.name}</span>`;
                const t2m = isAnimating ? `<span class="shuffle-text" data-real="${match.team2.m.name}">???</span>` : `<span>${match.team2.m.name}</span>`;
                const t2f = isAnimating ? `<span class="shuffle-text" data-real="${match.team2.f.name}">???</span>` : `<span>${match.team2.f.name}</span>`;
                
                const controlClass = isAnimating ? 'draw-hidden' : '';
                const courtNum = match.court || (((match.id - 1) % 3) + 1);

                card.innerHTML = `
                    <div class="match-meta-bar ${controlClass}">
                        <span class="court-badge"><i class="ph-bold ph-tennis-ball"></i> Trận ${match.id} • Sân ${courtNum}</span>
                        <span class="match-status-pill ${match.isFinished ? 'done' : ''}">
                            ${match.isFinished ? '<i class="ph-bold ph-check"></i> Đã có điểm' : 'Chưa thi đấu'}
                        </span>
                    </div>
                    <div class="match-layout">
                        <div class="team-box team-left ${isT1Win ? 'winner' : ''}" id="team1-${match.id}">
                            ${isT1Win ? '<span class="winner-chip"><i class="ph-bold ph-trophy"></i> THẮNG</span>' : ''}
                            <div class="player-tag">${getGenderIcon(match.team1.m)} ${t1m}</div>
                            <div class="player-tag">${getGenderIcon(match.team1.f)} ${t1f}</div>
                        </div>
                        
                        <div class="match-center">
                            <div class="vs-badge">VS</div>
                            <div class="score-control ${controlClass}">
                                <input type="number" class="score-input" id="s1-${match.id}" value="${match.score1}" min="0" placeholder="0">
                                <span class="score-dash">-</span>
                                <input type="number" class="score-input" id="s2-${match.id}" value="${match.score2}" min="0" placeholder="0">
                            </div>
                            <div style="display: flex; gap: 6px; width: 100%;">
                                <button class="btn-save-score ${controlClass}" onclick="saveMatch(${match.id})" style="flex: 1; justify-content: center; ${match.isFinished ? 'background: #10b981; color: #0b0f19;' : ''}">
                                    <i class="ph-bold ${match.isFinished ? 'ph-pencil' : 'ph-check'}"></i> ${match.isFinished ? 'Sửa' : 'Lưu'}
                                </button>
                                ${match.isFinished ? `
                                <button class="btn-save-score ${controlClass}" onclick="clearMatchScore(${match.id})" style="flex: 0 0 auto; justify-content: center; padding: 7px 10px; background: rgba(244, 63, 94, 0.15); color: #fb7185; border-color: rgba(244, 63, 94, 0.3);" title="Xóa điểm trận này">
                                    <i class="ph-bold ph-trash"></i>
                                </button>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div class="team-box team-right ${isT2Win ? 'winner' : ''}" id="team2-${match.id}">
                            ${isT2Win ? '<span class="winner-chip"><i class="ph-bold ph-trophy"></i> THẮNG</span>' : ''}
                            <div class="player-tag">${getGenderIcon(match.team2.m)} ${t2m}</div>
                            <div class="player-tag">${getGenderIcon(match.team2.f)} ${t2f}</div>
                        </div>
                    </div>
                `;
                rBlock.appendChild(card);
            });
            container.appendChild(rBlock);
        });
        
        if (isAnimating) {
            const pendingCards = document.querySelectorAll('.draw-pending');
            if (pendingCards.length > 0) {
                const shuffleInterval = setInterval(() => {
                    document.querySelectorAll('.draw-pending .shuffle-text').forEach(span => {
                        span.textContent = allNames[Math.floor(Math.random() * allNames.length)];
                    });
                }, 60);

                pendingCards.forEach((card, index) => {
                    setTimeout(() => {
                        card.classList.remove('draw-pending');
                        card.classList.add('draw-revealed');
                        
                        card.querySelectorAll('.shuffle-text').forEach(span => {
                            span.textContent = span.getAttribute('data-real');
                            span.classList.add('text-highlight');
                        });
                        
                        card.querySelectorAll('.draw-hidden').forEach(el => {
                            el.classList.remove('draw-hidden');
                        });
                        
                        if (index === pendingCards.length - 1) {
                            clearInterval(shuffleInterval);
                            saveToFirebase();
                        }
                    }, 500 + (index * 300));
                });
            }
        } else {
            saveToFirebase();
        }
    }

    window.clearMatchScore = function(matchId) {
        showConfirm(
            'Xóa Điểm Trận Đấu',
            'Bạn có chắc chắn muốn xóa điểm của trận đấu này?',
            () => {
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
            }
        );
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
            showToast('Vui lòng nhập điểm số hợp lệ cho cả 2 đội!', 'error');
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
        showToast(`Đã lưu điểm trận ${matchId} (${s1} - ${s2}) thành công!`, 'success');
    };

    function updateOverviewStats(total, finished, pending, topPlayers) {
        const totalEl = document.getElementById('stat-total-matches');
        const finEl = document.getElementById('stat-finished-matches');
        const penEl = document.getElementById('stat-pending-matches');
        const topEl = document.getElementById('stat-top-players');

        if (totalEl) totalEl.textContent = total;
        if (finEl) finEl.textContent = finished;
        if (penEl) penEl.textContent = pending;
        if (topEl) topEl.textContent = topPlayers;
    }

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

        // Xây dựng ma trận Đối đầu trực tiếp (Head-to-Head)
        const h2h = {};
        state.players.forEach(p1 => {
            h2h[p1.id] = {};
            state.players.forEach(p2 => {
                h2h[p1.id][p2.id] = { matches: 0, wins: 0, diff: 0, pts: 0 };
            });
        });

        let finishedMatchesCount = 0;

        state.matches.forEach(m => {
            if (m.isFinished) {
                finishedMatchesCount++;
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

                // Đối đầu giữa 2 bạn Nam cùng lượt
                addH2H(m.team1.m, m.team2.m, s1, s2);
                addH2H(m.team2.m, m.team1.m, s2, s1);

                // Đối đầu giữa 2 bạn Nữ cùng lượt
                addH2H(m.team1.f, m.team2.f, s1, s2);
                addH2H(m.team2.f, m.team1.f, s2, s1);
            }
        });

        // Hàm sắp xếp đa tầng: Thắng > Đối đầu trực tiếp (H2H) > Hiệu số tổng > Tổng điểm > Ít trận thua hơn
        const sortFn = (a, b) => {
            // 1. Số trận thắng
            if (b.wins !== a.wins) return b.wins - a.wins;

            // 2. Đối đầu trực tiếp (Head-to-head)
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

            // 3. Hiệu số điểm tổng
            if (b.diff !== a.diff) return b.diff - a.diff;

            // 4. Tổng điểm ghi được
            if (b.pts !== a.pts) return b.pts - a.pts;

            // 5. Ít trận thua hơn
            return a.losses - b.losses;
        };

        const males = Object.values(stats).filter(s => s.p.logicalGender === 'M').sort(sortFn);
        const females = Object.values(stats).filter(s => s.p.logicalGender === 'F').sort(sortFn);

        // Update Overview Stats
        const totalMatches = state.matches.length;
        const pendingMatches = totalMatches - finishedMatchesCount;
        let topSummary = '-';
        if (males.length > 0 && females.length > 0) {
            topSummary = `${males[0].p.name} (${males[0].wins}W) • ${females[0].p.name} (${females[0].wins}W)`;
        }
        updateOverviewStats(totalMatches, finishedMatchesCount, pendingMatches, topSummary);

        const tbodyM = document.querySelector('#leaderboard-table-male tbody');
        const tbodyF = document.querySelector('#leaderboard-table-female tbody');
        if (tbodyM) tbodyM.innerHTML = '';
        if (tbodyF) tbodyF.innerHTML = '';
        
        if (state.matches.length === 0) {
            if (tbodyM) tbodyM.innerHTML = '<tr><td colspan="8" class="text-center">Chưa có dữ liệu bốc thăm</td></tr>';
            if (tbodyF) tbodyF.innerHTML = '<tr><td colspan="8" class="text-center">Chưa có dữ liệu bốc thăm</td></tr>';
            return;
        }

        const renderRows = (sortedData, tbodyElement) => {
            if (!tbodyElement) return;
            sortedData.forEach((row, i) => {
                const tr = document.createElement('tr');
                let rankBadgeClass = 'rank-default';
                if (i === 0) rankBadgeClass = 'rank-1';
                else if (i === 1) rankBadgeClass = 'rank-2';
                else if (i === 2) rankBadgeClass = 'rank-3';
                
                let diffClass = 'stat-diff-zero';
                let diffText = '0';
                if (row.diff > 0) {
                    diffClass = 'stat-diff-pos';
                    diffText = `+${row.diff}`;
                } else if (row.diff < 0) {
                    diffClass = 'stat-diff-neg';
                    diffText = `${row.diff}`;
                }

                let noteHTML = '';
                if (row.h2hWonTiebreak) {
                    noteHTML = '<span class="h2h-badge" title="Ưu tiên hơn nhờ thắng trận đối đầu trực tiếp"><i class="ph-bold ph-sword"></i> H2H</span>';
                }

                tr.className = rankBadgeClass;
                tr.innerHTML = `
                    <td class="td-rank">
                        <span class="rank-badge">${i + 1}</span>
                    </td>
                    <td class="td-name">
                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 600;">
                            ${getGenderIcon(row.p)}
                            <span>${row.p.name}</span>
                        </div>
                    </td>
                    <td class="td-stat">${row.matches}</td>
                    <td class="td-stat stat-win">${row.wins}</td>
                    <td class="td-stat stat-loss">${row.losses}</td>
                    <td class="td-stat ${diffClass}">${diffText}</td>
                    <td class="td-stat" style="font-weight: 700;">${row.pts}</td>
                    <td class="td-notes">${noteHTML}</td>
                `;
                tbodyElement.appendChild(tr);
            });
        };

        renderRows(males, tbodyM);
        renderRows(females, tbodyF);
    }

    // Filter sub-tabs (All / Male / Female)
    const filterBtns = document.querySelectorAll('.filter-tab-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            const secM = document.getElementById('section-table-male');
            const secF = document.getElementById('section-table-female');

            if (filter === 'all') {
                if (secM) secM.style.display = 'block';
                if (secF) secF.style.display = 'block';
            } else if (filter === 'male') {
                if (secM) secM.style.display = 'block';
                if (secF) secF.style.display = 'none';
            } else if (filter === 'female') {
                if (secM) secM.style.display = 'none';
                if (secF) secF.style.display = 'block';
            }
        });
    });

    // ==========================================================================
    // TOURNAMENT PHOTO GALLERY & LIGHTBOX SYSTEM
    // ==========================================================================
    const tournamentPhotos = [
        {
            id: 1,
            src: 'assets/photo_1.jpg',
            title: 'Tập Thể ACE Cup Rạng Rỡ Nhận Thưởng & Huy Chương',
            category: 'awards',
            categoryName: 'Trao giải',
            desc: 'Toàn thể 12 VĐV cùng khoe huy chương và phần thưởng tại sân DE Badminton',
            aspect: 'portrait'
        },
        {
            id: 2,
            src: 'assets/photo_2.jpg',
            title: 'Đại Gia Đình DE Badminton Toả Sáng Trên Sân Đấu',
            category: 'awards',
            categoryName: 'Trao giải',
            desc: 'Khoảnh khắc rực rỡ và nụ cười chiến thắng của tất cả tay vợt ACE Cup',
            aspect: 'landscape'
        },
        {
            id: 3,
            src: 'assets/photo_3.jpg',
            title: 'Bộ Ba Cặp Đôi Đoạt Huy Chương ACE Cup',
            category: 'awards',
            categoryName: 'Trao giải',
            desc: 'Các cặp đôi xuất sắc nhất giải đấu cùng khoe huy chương Vàng - Bạc - Đồng',
            aspect: 'portrait'
        },
        {
            id: 4,
            src: 'assets/photo_4.jpg',
            title: 'Pha Đỡ Cầu Huyền Thoại "Full Giáp Nón Bảo Hiểm"',
            category: 'court',
            categoryName: 'Sân đấu',
            desc: 'Chiến thuật phòng thủ đỉnh cao có 1-0-2 khiến cả sân cười ngả nghiêng',
            aspect: 'portrait'
        },
        {
            id: 5,
            src: 'assets/photo_5.jpg',
            title: 'Năng Lượng Tràn Đầy Sau Loạt Trận Căng Thẳng',
            category: 'awards',
            categoryName: 'Trao giải',
            desc: 'Các tay vợt tạo dáng nhí nhảnh ăn mừng một ngày thi đấu bùng nổ',
            aspect: 'portrait'
        },
        {
            id: 6,
            src: 'assets/photo_6.jpg',
            title: 'Top 6 Tay Vợt Đoạt Huy Chương Danh Giá',
            category: 'awards',
            categoryName: 'Trao giải',
            desc: 'Nụ cười rạng rỡ của 6 VĐV xuất sắc nhất tại bục vinh danh DE Badminton',
            aspect: 'portrait'
        },
        {
            id: 7,
            src: 'assets/photo_7.jpg',
            title: 'Khoảnh Khắc Check-in Nhí Nhảnh Của Hội Anh Chị Em',
            category: 'court',
            categoryName: 'Sân đấu',
            desc: 'Không khí giao lưu ngập tràn tiếng cười và tinh thần thể thao đẹp mắt',
            aspect: 'landscape'
        },
        {
            id: 8,
            src: 'assets/photo_8.jpg',
            title: 'Sẵn Sàng Cho Trận Đấu Rực Lửa Tại Thảm Xanh',
            category: 'court',
            categoryName: 'Sân đấu',
            desc: 'Các VĐV hào hứng trước khi bước vào những ván đấu quyết định',
            aspect: 'landscape'
        },
        {
            id: 9,
            src: 'assets/photo_9.jpg',
            title: 'Huy Chương Vàng, Bạc, Đồng Hội Tụ Cùng Tỏa Sáng',
            category: 'awards',
            categoryName: 'Trao giải',
            desc: 'Những nỗ lực thi đấu hết mình đã được đền đáp xứng đáng',
            aspect: 'landscape'
        },
        {
            id: 10,
            src: 'assets/photo_10.jpg',
            title: 'Niềm Vui Nhân Đôi Cùng Phong Bì & Huy Chương',
            category: 'awards',
            categoryName: 'Trao giải',
            desc: 'Phần thưởng xứng đáng cho những nỗ lực bứt phá từng set cầu',
            aspect: 'portrait'
        },
        {
            id: 11,
            src: 'assets/photo_11.jpg',
            title: 'Hậu Trường Chilling Sau Khi Cháy Hết Mình',
            category: 'fun',
            categoryName: 'Hậu trường',
            desc: 'Khoảnh khắc quây quần tâm sự, nghỉ ngơi sau chuỗi trận nảy lửa',
            aspect: 'landscape'
        },
        {
            id: 12,
            src: 'assets/photo_12.jpg',
            title: 'Selfie Toàn Đội - Tình Bạn Bền Chặt Qua Từng Đường Cầu',
            category: 'fun',
            categoryName: 'Hậu trường',
            desc: 'Kỷ niệm khó phai của giải đấu giao lưu kết nối đam mê cầu lông',
            aspect: 'landscape'
        }
    ];

    let currentPhotoIndex = 0;
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxCategory = document.getElementById('lightbox-category');
    const lightboxCounter = document.getElementById('lightbox-counter');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');

    function openLightbox(index) {
        if (index < 0 || index >= tournamentPhotos.length) return;
        currentPhotoIndex = index;
        const photo = tournamentPhotos[currentPhotoIndex];
        
        if (lightboxImg) lightboxImg.src = photo.src;
        if (lightboxTitle) lightboxTitle.textContent = photo.title;
        if (lightboxCaption) lightboxCaption.textContent = photo.desc;
        if (lightboxCategory) {
            lightboxCategory.textContent = photo.categoryName;
            lightboxCategory.className = `lightbox-category ${photo.category}`;
        }
        if (lightboxCounter) lightboxCounter.textContent = `${currentPhotoIndex + 1} / ${tournamentPhotos.length}`;
        
        if (lightboxModal) {
            lightboxModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    function closeLightbox() {
        if (lightboxModal) {
            lightboxModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    function nextLightboxPhoto() {
        openLightbox((currentPhotoIndex + 1) % tournamentPhotos.length);
    }

    function prevLightboxPhoto() {
        openLightbox((currentPhotoIndex - 1 + tournamentPhotos.length) % tournamentPhotos.length);
    }

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxNext) lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); nextLightboxPhoto(); });
    if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); prevLightboxPhoto(); });
    
    if (lightboxModal) {
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) closeLightbox();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (!lightboxModal || lightboxModal.style.display !== 'flex') return;
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowRight') nextLightboxPhoto();
        else if (e.key === 'ArrowLeft') prevLightboxPhoto();
    });

    // Hero Image Card Click
    const heroImgCard = document.getElementById('hero-img-card');
    if (heroImgCard) {
        heroImgCard.addEventListener('click', () => {
            openLightbox(1); // photo_2.jpg
        });
    }

    // Podium Preview Image Click
    const podiumImgPreview = document.getElementById('podium-img-preview');
    if (podiumImgPreview) {
        podiumImgPreview.addEventListener('click', () => {
            openLightbox(8); // photo_9.jpg
        });
    }

    // Render Gallery
    const galleryGrid = document.getElementById('gallery-grid');
    const galleryFilterBtns = document.querySelectorAll('.gallery-filter-btn');

    function renderGallery(filter = 'all') {
        if (!galleryGrid) return;
        galleryGrid.innerHTML = '';

        const filtered = filter === 'all' 
            ? tournamentPhotos 
            : tournamentPhotos.filter(p => p.category === filter);

        filtered.forEach((photo) => {
            const originalIndex = tournamentPhotos.findIndex(p => p.id === photo.id);
            const card = document.createElement('div');
            card.className = 'gallery-card';
            card.setAttribute('data-category', photo.category);
            
            card.innerHTML = `
                <div class="gallery-card-thumb-wrap">
                    <span class="gallery-category-pill ${photo.category}">
                        <i class="ph-fill ${photo.category === 'awards' ? 'ph-trophy' : (photo.category === 'court' ? 'ph-tennis-ball' : 'ph-sparkle')}"></i>
                        ${photo.categoryName}
                    </span>
                    <img src="${photo.src}" alt="${photo.title}" class="gallery-card-thumb" loading="lazy">
                    <div class="gallery-card-overlay">
                        <div class="gallery-expand-icon">
                            <i class="ph-bold ph-arrows-out-simple"></i>
                        </div>
                    </div>
                </div>
                <div class="gallery-card-body">
                    <h4 class="gallery-card-title">${photo.title}</h4>
                    <p class="gallery-card-desc">${photo.desc}</p>
                </div>
            `;

            card.addEventListener('click', () => {
                openLightbox(originalIndex);
            });

            galleryGrid.appendChild(card);
        });

        // Update badge count
        const countBadge = document.getElementById('gallery-count-badge');
        if (countBadge) {
            countBadge.textContent = `${filtered.length} khoảnh khắc`;
        }
    }

    galleryFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            galleryFilterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderGallery(btn.dataset.filter);
        });
    });

    // Initial render of gallery
    renderGallery('all');
});

