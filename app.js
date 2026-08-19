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
        let pastPartners = {};
        let pastOpponents = {};
        
        function markOpponent(id1, id2) {
            if (!pastOpponents[id1]) pastOpponents[id1] = {};
            if (!pastOpponents[id2]) pastOpponents[id2] = {};
            pastOpponents[id1][id2] = true;
            pastOpponents[id2][id1] = true;
        }
        
        const males = state.players.filter(p => p.logicalGender === 'M');
        const females = state.players.filter(p => p.logicalGender === 'F');

        const maxPairs = Math.min(males.length, females.length);
        const playingPairs = Math.floor(maxPairs / 2) * 2;
        const numMatches = playingPairs / 2;
        
        if (numMatches === 0) return;
        
        const targetMatches = 12;
        const totalRounds = Math.ceil(targetMatches / numMatches);

        for (let r = 1; r <= totalRounds; r++) {

            let sortedMales = [...males].sort((a, b) => {
                if (a.matchesPlayed !== b.matchesPlayed) return a.matchesPlayed - b.matchesPlayed;
                return Math.random() - 0.5;
            });
            let sortedFemales = [...females].sort((a, b) => {
                if (a.matchesPlayed !== b.matchesPlayed) return a.matchesPlayed - b.matchesPlayed;
                return Math.random() - 0.5;
            });

            let selectedMales = sortedMales.slice(0, playingPairs);
            let selectedFemales = sortedFemales.slice(0, playingPairs);
            
            let restingMales = sortedMales.slice(playingPairs);
            let restingFemales = sortedFemales.slice(playingPairs);
            let restingThisRound = [...restingMales, ...restingFemales];
            
            selectedMales.forEach(p => p.matchesPlayed++);
            selectedFemales.forEach(p => p.matchesPlayed++);

            let maxAttempts = 200;
            let validPairing = false;
            let pairs = [];
            
            while (!validPairing && maxAttempts > 0) {
                maxAttempts--;
                let mShuffle = [...selectedMales].sort(() => Math.random() - 0.5);
                let fShuffle = [...selectedFemales].sort(() => Math.random() - 0.5);
                
                pairs = [];
                let duplicate = false;
                for (let i = 0; i < playingPairs; i++) {
                    let m = mShuffle[i];
                    let f = fShuffle[i];
                    if (pastPartners[m.id] && pastPartners[m.id][f.id]) {
                        duplicate = true;
                        break;
                    }
                    pairs.push({ m, f });
                }
                
                if (!duplicate) {
                    validPairing = true;
                    for (let p of pairs) {
                        if(!pastPartners[p.m.id]) pastPartners[p.m.id] = {};
                        if(!pastPartners[p.f.id]) pastPartners[p.f.id] = {};
                        pastPartners[p.m.id][p.f.id] = true;
                        pastPartners[p.f.id][p.m.id] = true;
                    }
                }
            }
            
            if (!validPairing && pairs.length < playingPairs) {
                let mShuffle = [...selectedMales].sort(() => Math.random() - 0.5);
                let fShuffle = [...selectedFemales].sort(() => Math.random() - 0.5);
                pairs = [];
                for (let i = 0; i < playingPairs; i++) {
                    pairs.push({ m: mShuffle[i], f: fShuffle[i] });
                }
            }
            
            let validMatches = false;
            let matchAttempts = 200;
            let roundMatches = [];
            
            while (!validMatches && matchAttempts > 0) {
                matchAttempts--;
                let pairShuffle = [...pairs].sort(() => Math.random() - 0.5);
                let duplicateOpponent = false;
                roundMatches = [];
                
                for (let i = 0; i < numMatches; i++) {
                    let t1 = pairShuffle[i * 2];
                    let t2 = pairShuffle[i * 2 + 1];
                    
                    // Chỉ check Nam vs Nam và Nữ vs Nữ để tăng tỉ lệ xếp lịch thành công
                    if (
                        (pastOpponents[t1.m.id] && pastOpponents[t1.m.id][t2.m.id]) ||
                        (pastOpponents[t1.f.id] && pastOpponents[t1.f.id][t2.f.id])
                    ) {
                        duplicateOpponent = true;
                        break;
                    }
                    
                    roundMatches.push({
                        id: (r - 1) * 10 + i + 1,
                        round: r,
                        team1: t1,
                        team2: t2,
                        score1: '',
                        score2: '',
                        isFinished: false
                    });
                }
                
                if (!duplicateOpponent) {
                    validMatches = true;
                    for (let match of roundMatches) {
                        markOpponent(match.team1.m.id, match.team2.m.id);
                        markOpponent(match.team1.f.id, match.team2.f.id);
                    }
                }
            }
            
            if (!validMatches) {
                let pairShuffle = [...pairs].sort(() => Math.random() - 0.5);
                roundMatches = [];
                for (let i = 0; i < numMatches; i++) {
                    let match = {
                        id: (r - 1) * 10 + i + 1,
                        round: r,
                        team1: pairShuffle[i * 2],
                        team2: pairShuffle[i * 2 + 1],
                        score1: '',
                        score2: '',
                        isFinished: false
                    };
                    roundMatches.push(match);
                    markOpponent(match.team1.m.id, match.team2.m.id);
                    markOpponent(match.team1.f.id, match.team2.f.id);
                }
            }
            
            state.rounds.push({
                matches: roundMatches,
                resting: restingThisRound
            });
            state.matches = state.matches.concat(roundMatches);
        }
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
                            ${!match.isFinished ? `
                                <button class="btn-save-score ${controlClass}" onclick="saveMatch(${match.id})">
                                    <i class="ph-bold ph-check"></i> Lưu điểm
                                </button>
                            ` : `<div class="status-done ${controlClass}"><i class="ph-fill ph-check-circle"></i> Đã xong</div>`}
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
        saveToFirebase();
    };

    function updateLeaderboard() {
        const stats = {};
        state.players.forEach(p => {
            stats[p.id] = { p: p, matches: 0, wins: 0, losses: 0, diff: 0, pts: 0 };
        });

        state.matches.forEach(m => {
            if (m.isFinished) {
                const addStats = (playerId, myScore, oppScore) => {
                    stats[playerId].matches++;
                    stats[playerId].pts += myScore;
                    stats[playerId].diff += (myScore - oppScore);
                    if (myScore > oppScore) stats[playerId].wins++;
                    else if (myScore < oppScore) stats[playerId].losses++;
                };

                addStats(m.team1.m.id, m.score1, m.score2);
                addStats(m.team1.f.id, m.score1, m.score2);
                addStats(m.team2.m.id, m.score2, m.score1);
                addStats(m.team2.f.id, m.score2, m.score1);
            }
        });

        const males = [];
        const females = [];
        
        Object.values(stats).forEach(s => {
            if (s.p.logicalGender === 'M') males.push(s);
            else females.push(s);
        });

        const sortFn = (a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (b.diff !== a.diff) return b.diff - a.diff;
            return b.pts - a.pts;
        };

        males.sort(sortFn);
        females.sort(sortFn);

        const tbodyM = document.querySelector('#leaderboard-table-male tbody');
        const tbodyF = document.querySelector('#leaderboard-table-female tbody');
        tbodyM.innerHTML = '';
        tbodyF.innerHTML = '';
        
        if (state.matches.length === 0) {
            tbodyM.innerHTML = '<tr><td colspan="7" class="text-center">Chưa có dữ liệu bốc thăm</td></tr>';
            tbodyF.innerHTML = '<tr><td colspan="7" class="text-center">Chưa có dữ liệu bốc thăm</td></tr>';
            return;
        }

        const renderRows = (sortedData, tbodyElement) => {
            sortedData.forEach((row, i) => {
                const tr = document.createElement('tr');
                let rankClass = '';
                if (i === 0) rankClass = 'rank-1';
                else if (i === 1) rankClass = 'rank-2';
                else if (i === 2) rankClass = 'rank-3';
                
                tr.innerHTML = `
                    <td class="${rankClass}">${i + 1}</td>
                    <td>${getGenderIcon(row.p)} ${row.p.name}</td>
                    <td>${row.matches}</td>
                    <td>${row.wins}</td>
                    <td>${row.losses}</td>
                    <td>${row.diff > 0 ? '+' + row.diff : row.diff}</td>
                    <td>${row.pts}</td>
                `;
                tbodyElement.appendChild(tr);
            });
        };

        renderRows(males, tbodyM);
        renderRows(females, tbodyF);
    }
});
