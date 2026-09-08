document.addEventListener('DOMContentLoaded', () => {
    // Tab Navigation
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

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
    
    function createPlayerRow(p) {
        playerCount++;
        const i = playerCount;
        const row = document.createElement('div');
        row.className = 'player-card';
        row.id = `player-row-${i}`;
        
        // Disable editing for Minh to always be proxy female? Or just let anyone change it.
        // If we want anyone to change it, we shouldn't hardcode disabled.
        
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

    window.updateActiveCount = function() {
        let activeCount = 0;
        let males = 0;
        let females = 0;
        for (let i = 1; i <= playerCount; i++) {
            if (document.getElementById(`p-active-${i}`).checked) {
                const name = document.getElementById(`p-name-${i}`).value.trim();
                if (name) {
                    activeCount++;
                    const isM = document.getElementById(`p-gender-${i}`).value === 'M';
                    const isProxy = (name.toLowerCase() === 'minh');
                    if (isM && !isProxy) males++;
                    else females++;
                }
            }
        }
        document.getElementById('player-count-badge').textContent = `${activeCount} Tham gia (Nam: ${males}, Nữ: ${females})`;
    };

    predefinedPlayers.forEach(p => {
        createPlayerRow(p);
    });

    document.getElementById('btn-add-player').addEventListener('click', () => {
        createPlayerRow({ name: "", gender: "M", proxy: false });
    });

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
        });
    }

    function getDbPath() {
        return 'acecup_events/' + (dateInput ? dateInput.value : 'default');
    }

    let currentDbRef = null;
    let lastStateString = '';

    function saveToFirebase() {
        if (currentDbRef && window.firebaseDB) {
            lastStateString = JSON.stringify(state);
            currentDbRef.set(state);
        }
    }

    function listenToFirebase() {
        if (!window.firebaseDB) return;
        
        if (currentDbRef) {
            currentDbRef.off();
        }
        lastStateString = ''; // Chắc chắn load lại giao diện dù dữ liệu giống nhau
        
        const path = getDbPath();
        currentDbRef = window.firebaseDB.ref(path);
        
        currentDbRef.on('value', (snapshot) => {
            const data = snapshot.val();
            const dataString = JSON.stringify(data || {});
            
            // Nếu dữ liệu giống y hệt state hiện tại (do chính client này vừa lưu), bỏ qua re-render
            if (dataString === lastStateString) {
                return;
            }
            lastStateString = dataString;

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
                if (lTableM) lTableM.innerHTML = '<tr><td colspan="7" class="text-center">Chưa có dữ liệu bốc thăm</td></tr>';
                const lTableF = document.querySelector('#leaderboard-table-female tbody');
                if (lTableF) lTableF.innerHTML = '<tr><td colspan="7" class="text-center">Chưa có dữ liệu bốc thăm</td></tr>';
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
                const isActive = document.getElementById(`p-active-${i}`).checked;
                if (!isActive) continue;
                
                const name = document.getElementById(`p-name-${i}`).value.trim();
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
            
            document.querySelector('[data-target="matches-tab"]').click();
        });
    });

    document.getElementById('btn-reset-draw').addEventListener('click', () => {
        requireAdmin(() => {
            if (confirm('Bạn có chắc chắn muốn hủy kết quả bốc thăm và xóa điểm?')) {
                state.rounds = [];
                state.matches = [];
                renderMatches();
                updateLeaderboard();
                saveToFirebase();
                document.querySelector('[data-target="players-tab"]').click();
            }
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

        // Thuật toán Tối ưu Toàn cục (Multi-restart Global Optimizer) - Đạt chuẩn công bằng 100%
        let bestSchedule = null;
        let minPenalty = Infinity;

        // Chạy tối ưu lặp 400 lần (< 20ms) để tìm lịch thi đấu có độ phạt thấp nhất (0 trùng đồng đội, 0 trùng đối thủ)
        for (let trial = 0; trial < 400; trial++) {
            let trialRounds = [];
            let partnerCounts = {}; // "mId-fId" -> count
            let oppCountsM = {}; // "m1-m2" -> count
            let oppCountsF = {}; // "f1-f2" -> count
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

                for (let attempt = 0; attempt < 40; attempt++) {
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
                            id: (r - 1) * 10 + i + 1,
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
                if (penalty === 0) break; // Tìm thấy lịch đấu hoàn hảo tuyệt đối!
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
        // Male acting as female
        return '<i class="ph-fill ph-gender-neuter gender-icon f" title="Nam đánh như Nữ"></i>';
    }

    function renderMatches() {
        const container = document.getElementById('rounds-container');
        if (state.rounds.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-calendar-x"></i>
                    <p>Chưa có lịch thi đấu. Hãy sang mục "Người chơi" để bốc thăm.</p>
                </div>`;
            return;
        }

        const isAnimating = window.isJustDrawn;
        window.isJustDrawn = false;
        const allNames = state.players.map(p => p.name);

        container.innerHTML = '';
        state.rounds.forEach((roundObj, rIndex) => {
            const rBlock = document.createElement('div');
            rBlock.className = 'round-block';
            
            let restingHTML = '';
            const resting = roundObj.resting || [];
            if (resting.length > 0) {
                const tags = resting.map(p => `<div class="resting-tag">${getGenderIcon(p)} ${p.name}</div>`).join('');
                restingHTML = `
                    <div class="resting-block">
                        <span><i class="ph ph-coffee"></i> Nghỉ vòng này:</span>
                        ${tags}
                    </div>
                `;
            }

            rBlock.innerHTML = `
                <div class="round-header">
                    <h3>Vòng ${rIndex + 1}</h3>
                    <div class="line"></div>
                </div>
                ${restingHTML}
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

                card.innerHTML = `
                    <div class="match-layout">
                        <div class="team-box team-left ${isT1Win ? 'winner' : ''}" id="team1-${match.id}">
                            <div class="player-tag">${getGenderIcon(match.team1.m)} ${t1m}</div>
                            <div class="player-tag">${getGenderIcon(match.team1.f)} ${t1f}</div>
                        </div>
                        
                        <div class="match-center">
                            <div class="vs-badge">VS</div>
                            <div class="score-control ${controlClass}">
                                <input type="number" class="score-input" id="s1-${match.id}" value="${match.score1}" min="0">
                                <span class="score-dash">-</span>
                                <input type="number" class="score-input" id="s2-${match.id}" value="${match.score2}" min="0">
                            </div>
                            <div style="display: flex; gap: 5px; width: 100%;">
                                <button class="btn-save-score ${controlClass}" onclick="saveMatch(${match.id})" style="flex: 1; justify-content: center; ${match.isFinished ? 'background: #4ade80; color: #000;' : ''}">
                                    <i class="ph-bold ${match.isFinished ? 'ph-pencil' : 'ph-check'}"></i> ${match.isFinished ? 'Sửa' : 'Lưu'}
                                </button>
                                ${match.isFinished ? `
                                <button class="btn-save-score ${controlClass}" onclick="clearMatchScore(${match.id})" style="flex: 0 0 auto; justify-content: center; padding: 6px 10px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border-color: rgba(239, 68, 68, 0.3);" title="Xóa điểm">
                                    <i class="ph-bold ph-trash"></i>
                                </button>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div class="team-box team-right ${isT2Win ? 'winner' : ''}" id="team2-${match.id}">
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
                            saveToFirebase(); // Save right after animation finishes
                        }
                    }, 600 + (index * 400));
                });
            }
        } else {
            saveToFirebase();
        }
    }

    window.clearMatchScore = function(matchId) {
        if (!confirm('Bạn có chắc chắn muốn xóa điểm trận này?')) return;
        
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
    };

    window.saveMatch = function(matchId) {
        const match = state.matches.find(m => m.id === matchId);
        if (!match) return;
        
        const s1 = parseInt(document.getElementById(`s1-${matchId}`).value);
        const s2 = parseInt(document.getElementById(`s2-${matchId}`).value);
        
        if (isNaN(s1) || isNaN(s2)) {
            alert('Vui lòng nhập điểm hợp lệ!');
            return;
        }
        
        match.score1 = s1;
        match.score2 = s2;
        match.isFinished = true;

        // Cập nhật đồng bộ vào state.rounds vì Firebase tách object reference khi load lại
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
        
        const card = document.getElementById(`match-card-${matchId}`);
        if(card) card.classList.add('finished');
        
        const t1 = document.getElementById(`team1-${matchId}`);
        const t2 = document.getElementById(`team2-${matchId}`);
        if(t1) t1.classList.remove('winner');
        if(t2) t2.classList.remove('winner');
        
        if (s1 > s2) {
            if(t1) t1.classList.add('winner');
        } else if (s2 > s1) {
            if(t2) t2.classList.add('winner');
        }
        
        updateLeaderboard();
        renderMatches();
        saveToFirebase();
    };

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
                    return bWins - aWins; // Người thắng đối đầu nhiều hơn xếp trên
                }

                const aDiff = h2h[a.p.id][b.p.id].diff;
                const bDiff = h2h[b.p.id][a.p.id].diff;
                if (aDiff !== bDiff) {
                    if (aDiff > bDiff) a.h2hWonTiebreak = true;
                    else b.h2hWonTiebreak = true;
                    return bDiff - aDiff; // Hiệu số đối đầu cao hơn xếp trên
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
                    noteHTML = '<span class="h2h-badge" title="Ưu tiên hơn nhờ thắng đối đầu trực tiếp"><i class="ph-bold ph-sword"></i> H2H</span>';
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
});
