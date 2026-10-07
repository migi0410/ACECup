// ==========================================================================
// ACE CUP - BỘ KIỂM THỬ TỰ ĐỘNG TÍNH NĂNG XẾP HẠNG & ĐỐI ĐẦU (H2H TIEBREAK)
// ==========================================================================
const fs = require('fs');

// Đọc và trích xuất trực tiếp hàm calculateStandings từ app.js
const appJs = fs.readFileSync('app.js', 'utf8');
const startMarker = 'function calculateStandings() {';
const startIndex = appJs.indexOf(startMarker);
const endIndex = appJs.indexOf('function updateLeaderboard() {', startIndex);
if (startIndex === -1 || endIndex === -1) {
    console.error('Không tìm thấy hàm calculateStandings trong app.js!');
    process.exit(1);
}
const calcCode = appJs.substring(startIndex, endIndex);

function runStandings(players, matches) {
    const runner = new Function('state', `${calcCode} return calculateStandings();`);
    return runner({ players, matches });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failed++;
    }
}

console.log('===============================================================');
console.log('  KIỂM TRA BẢNG XẾP HẠNG VÀ CÔNG THỨC TÍNH ĐIỂM GIẢI ACE CUP');
console.log('===============================================================\n');

// --------------------------------------------------------------------------
// TEST 1: Phân định theo số trận thắng (Wins)
// --------------------------------------------------------------------------
console.log('--- TEST 1: Số trận thắng phân định thứ hạng cơ bản ---');
const p1 = [
    { id: 'm1', name: 'Nam 1', logicalGender: 'M' },
    { id: 'm2', name: 'Nam 2', logicalGender: 'M' },
    { id: 'f1', name: 'Nữ 1', logicalGender: 'F' },
    { id: 'f2', name: 'Nữ 2', logicalGender: 'F' }
];
const m1 = [
    { id: 1, isFinished: true, team1: { m: p1[0], f: p1[2] }, team2: { m: p1[1], f: p1[3] }, score1: 21, score2: 15 }
];
const res1 = runStandings(p1, m1);
assert(res1.males[0].p.id === 'm1' && res1.males[0].wins === 1, 'Nam 1 (1 thắng) xếp hạng 1');
assert(res1.males[1].p.id === 'm2' && res1.males[1].wins === 0, 'Nam 2 (0 thắng) xếp hạng 2');
assert(res1.females[0].p.id === 'f1' && res1.females[0].wins === 1, 'Nữ 1 (1 thắng) xếp hạng 1');
assert(res1.females[1].p.id === 'f2' && res1.females[1].wins === 0, 'Nữ 2 (0 thắng) xếp hạng 2');

// --------------------------------------------------------------------------
// TEST 2: Hai người bằng trận thắng -> Ưu tiên Đối Đầu Trực Tiếp (H2H)
// --------------------------------------------------------------------------
console.log('\n--- TEST 2: Hai người bằng trận thắng -> Xét Đối Đầu Trực Tiếp (H2H) ---');
// Nam A và Nam B cùng có 2 trận thắng.
// Trận A gặp B: A thắng B 21-19 (H2H: A thắng B!).
// Nam B thắng các trận khác rất đậm nên hiệu số của B (+30) áp đảo A (+3).
// LUẬT: A vẫn phải xếp TRÊN B vì thắng trận đối đầu trực tiếp!
const p2 = [
    { id: 'mA', name: 'A', logicalGender: 'M' },
    { id: 'mB', name: 'B', logicalGender: 'M' },
    { id: 'mC', name: 'C', logicalGender: 'M' },
    { id: 'mD', name: 'D', logicalGender: 'M' },
    { id: 'f1', name: 'F1', logicalGender: 'F' },
    { id: 'f2', name: 'F2', logicalGender: 'F' }
];
const m2 = [
    { id: 1, isFinished: true, team1: { m: p2[0], f: p2[4] }, team2: { m: p2[1], f: p2[5] }, score1: 21, score2: 19 }, // A thắng B
    { id: 2, isFinished: true, team1: { m: p2[0], f: p2[4] }, team2: { m: p2[2], f: p2[5] }, score1: 21, score2: 20 }, // A thắng C (A có 2 thắng, diff: +3)
    { id: 3, isFinished: true, team1: { m: p2[1], f: p2[4] }, team2: { m: p2[2], f: p2[5] }, score1: 21, score2: 5 },  // B thắng C
    { id: 4, isFinished: true, team1: { m: p2[1], f: p2[4] }, team2: { m: p2[3], f: p2[5] }, score1: 21, score2: 5 }   // B thắng D (B có 2 thắng, diff: +30)
];
const res2 = runStandings(p2, m2);
assert(res2.males[0].p.id === 'mA', 'A xếp trên B nhờ thắng đối đầu trực tiếp (dù hiệu số A +3 < B +30)');
assert(res2.males[0].h2hWonTiebreak === true, 'A nhận huy hiệu thắng đối đầu (h2hWonTiebreak = true)');
assert(res2.males[1].p.id === 'mB', 'B xếp sau A vì thua đối đầu trực tiếp');

// --------------------------------------------------------------------------
// TEST 3: Bằng trận thắng, đối đầu huề (hoặc chưa gặp) -> Xét Hiệu Số (+/-)
// --------------------------------------------------------------------------
console.log('\n--- TEST 3: Bằng trận thắng, đối đầu huề -> Xét Hiệu Số (+/-) ---');
const p3 = [
    { id: 'mA', name: 'A', logicalGender: 'M' },
    { id: 'mB', name: 'B', logicalGender: 'M' },
    { id: 'mC', name: 'C', logicalGender: 'M' },
    { id: 'mD', name: 'D', logicalGender: 'M' },
    { id: 'f1', name: 'F1', logicalGender: 'F' },
    { id: 'f2', name: 'F2', logicalGender: 'F' }
];
const m3 = [
    { id: 1, isFinished: true, team1: { m: p3[0], f: p3[4] }, team2: { m: p3[2], f: p3[5] }, score1: 21, score2: 11 }, // A: +10
    { id: 2, isFinished: true, team1: { m: p3[1], f: p3[4] }, team2: { m: p3[3], f: p3[5] }, score1: 21, score2: 16 }  // B: +5
];
const res3 = runStandings(p3, m3);
assert(res3.males[0].p.id === 'mA', 'A xếp trên B nhờ Hiệu số cao hơn (+10 so với +5)');
assert(res3.males[1].p.id === 'mB', 'B xếp hạng nhì');

// --------------------------------------------------------------------------
// TEST 4: Bằng trận thắng, bằng hiệu số -> Xét Tổng Điểm Ghi Được
// --------------------------------------------------------------------------
console.log('\n--- TEST 4: Bằng trận thắng, bằng hiệu số -> Xét Tổng Điểm Ghi Được ---');
const m4 = [
    { id: 1, isFinished: true, team1: { m: p3[0], f: p3[4] }, team2: { m: p3[2], f: p3[5] }, score1: 21, score2: 15 }, // A: +6, pts: 21
    { id: 2, isFinished: true, team1: { m: p3[1], f: p3[4] }, team2: { m: p3[3], f: p3[5] }, score1: 25, score2: 19 }  // B: +6, pts: 25
];
const res4 = runStandings(p3, m4);
assert(res4.males[0].p.id === 'mB', 'B xếp trên A nhờ Tổng điểm nhiều hơn (25 so với 21)');
assert(res4.males[1].p.id === 'mA', 'A xếp hạng nhì');

// --------------------------------------------------------------------------
// TEST 5: Vòng lặp 3 người (Circular Tie: A thắng B, B thắng C, C thắng A)
// --------------------------------------------------------------------------
console.log('\n--- TEST 5: Vòng lặp đối đầu 3 người (A > B > C > A) ---');
// A thắng B 21-19 (+2)
// B thắng C 21-5 (+16)
// C thắng A 21-15 (+6)
// Tổng trận thắng: mỗi người 1 thắng 1 thua.
// Hiệu số tổng:
// B: -2 + 16 = +14
// A: +2 - 6 = -4
// C: -16 + 6 = -10
// Chuẩn BWF: Khi 3 người đối đầu vòng tròn huề nhau (1-1), xét Hiệu số -> B (+14) > A (-4) > C (-10)
const p5 = [
    { id: 'mA', name: 'A', logicalGender: 'M' },
    { id: 'mB', name: 'B', logicalGender: 'M' },
    { id: 'mC', name: 'C', logicalGender: 'M' },
    { id: 'f1', name: 'F1', logicalGender: 'F' },
    { id: 'f2', name: 'F2', logicalGender: 'F' }
];
const m5 = [
    { id: 1, isFinished: true, team1: { m: p5[0], f: p5[3] }, team2: { m: p5[1], f: p5[4] }, score1: 21, score2: 19 },
    { id: 2, isFinished: true, team1: { m: p5[1], f: p5[3] }, team2: { m: p5[2], f: p5[4] }, score1: 21, score2: 5 },
    { id: 3, isFinished: true, team1: { m: p5[2], f: p5[3] }, team2: { m: p5[0], f: p5[4] }, score1: 21, score2: 15 }
];
const res5 = runStandings(p5, m5);
assert(res5.males[0].p.id === 'mB', 'B hạng 1 với Hiệu số +14');
assert(res5.males[1].p.id === 'mA', 'A hạng 2 với Hiệu số -4');
assert(res5.males[2].p.id === 'mC', 'C hạng 3 với Hiệu số -10');

// --------------------------------------------------------------------------
// TEST 6: Mô phỏng toàn bộ giải đấu thực tế 12 người (6 Nam, 6 Nữ) qua 5 vòng
// --------------------------------------------------------------------------
console.log('\n--- TEST 6: Mô phỏng giải đấu hoàn chỉnh (12 người, 15 trận, 5 vòng) ---');
const simPlayers = [
    { id: 'm1', name: 'Nguyễn Văn An', logicalGender: 'M' },
    { id: 'm2', name: 'Trần Văn Bình', logicalGender: 'M' },
    { id: 'm3', name: 'Lê Văn Cường', logicalGender: 'M' },
    { id: 'm4', name: 'Phạm Văn Dũng', logicalGender: 'M' },
    { id: 'm5', name: 'Hoàng Văn Em', logicalGender: 'M' },
    { id: 'm6', name: 'Vũ Văn Phúc', logicalGender: 'M' },
    { id: 'f1', name: 'Trần Thị Mai', logicalGender: 'F' },
    { id: 'f2', name: 'Lê Thị Hoa', logicalGender: 'F' },
    { id: 'f3', name: 'Phạm Thị Lan', logicalGender: 'F' },
    { id: 'f4', name: 'Nguyễn Thị Cúc', logicalGender: 'F' },
    { id: 'f5', name: 'Đỗ Thị Trúc', logicalGender: 'F' },
    { id: 'f6', name: 'Bùi Thị Đào', logicalGender: 'F' }
];

const simMatches = [
    { id: 1, round: 1, isFinished: true, team1: { m: simPlayers[0], f: simPlayers[6] }, team2: { m: simPlayers[1], f: simPlayers[7] }, score1: 21, score2: 17 },
    { id: 2, round: 1, isFinished: true, team1: { m: simPlayers[2], f: simPlayers[8] }, team2: { m: simPlayers[3], f: simPlayers[9] }, score1: 21, score2: 15 },
    { id: 3, round: 1, isFinished: true, team1: { m: simPlayers[4], f: simPlayers[10] }, team2: { m: simPlayers[5], f: simPlayers[11] }, score1: 19, score2: 21 },
    { id: 4, round: 2, isFinished: true, team1: { m: simPlayers[0], f: simPlayers[7] }, team2: { m: simPlayers[2], f: simPlayers[6] }, score1: 21, score2: 19 },
    { id: 5, round: 2, isFinished: true, team1: { m: simPlayers[1], f: simPlayers[8] }, team2: { m: simPlayers[4], f: simPlayers[11] }, score1: 21, score2: 12 },
    { id: 6, round: 2, isFinished: true, team1: { m: simPlayers[3], f: simPlayers[10] }, team2: { m: simPlayers[5], f: simPlayers[9] }, score1: 18, score2: 21 },
    { id: 7, round: 3, isFinished: true, team1: { m: simPlayers[0], f: simPlayers[8] }, team2: { m: simPlayers[5], f: simPlayers[6] }, score1: 21, score2: 16 },
    { id: 8, round: 3, isFinished: true, team1: { m: simPlayers[1], f: simPlayers[9] }, team2: { m: simPlayers[2], f: simPlayers[10] }, score1: 21, score2: 14 },
    { id: 9, round: 3, isFinished: true, team1: { m: simPlayers[3], f: simPlayers[11] }, team2: { m: simPlayers[4], f: simPlayers[7] }, score1: 21, score2: 16 },
    { id: 10, round: 4, isFinished: true, team1: { m: simPlayers[0], f: simPlayers[9] }, team2: { m: simPlayers[3], f: simPlayers[7] }, score1: 17, score2: 21 },
    { id: 11, round: 4, isFinished: true, team1: { m: simPlayers[1], f: simPlayers[10] }, team2: { m: simPlayers[5], f: simPlayers[8] }, score1: 15, score2: 21 },
    { id: 12, round: 4, isFinished: true, team1: { m: simPlayers[2], f: simPlayers[11] }, team2: { m: simPlayers[4], f: simPlayers[6] }, score1: 21, score2: 18 },
    { id: 13, round: 5, isFinished: true, team1: { m: simPlayers[0], f: simPlayers[10] }, team2: { m: simPlayers[4], f: simPlayers[9] }, score1: 21, score2: 13 },
    { id: 14, round: 5, isFinished: true, team1: { m: simPlayers[1], f: simPlayers[11] }, team2: { m: simPlayers[3], f: simPlayers[6] }, score1: 21, score2: 19 },
    { id: 15, round: 5, isFinished: true, team1: { m: simPlayers[2], f: simPlayers[7] }, team2: { m: simPlayers[5], f: simPlayers[8] }, score1: 16, score2: 21 }
];

const simRes = runStandings(simPlayers, simMatches);

console.log('\n🏆 BẢNG XẾP HẠNG NAM (MÔ PHỎNG THỰC TẾ):');
console.table(simRes.males.map((r, i) => ({
    Hạng: i + 1,
    Tên: r.p.name,
    Trận: r.matches,
    Thắng: r.wins,
    Thua: r.losses,
    'Hiệu Số': (r.diff > 0 ? '+' : '') + r.diff,
    'Tổng Điểm': r.pts,
    'Ưu Tiên H2H': r.h2hWonTiebreak ? '✓ THẮNG ĐỐI ĐẦU' : '-'
})));

console.log('\n🏆 BẢNG XẾP HẠNG NỮ (MÔ PHỎNG THỰC TẾ):');
console.table(simRes.females.map((r, i) => ({
    Hạng: i + 1,
    Tên: r.p.name,
    Trận: r.matches,
    Thắng: r.wins,
    Thua: r.losses,
    'Hiệu Số': (r.diff > 0 ? '+' : '') + r.diff,
    'Tổng Điểm': r.pts,
    'Ưu Tiên H2H': r.h2hWonTiebreak ? '✓ THẮNG ĐỐI ĐẦU' : '-'
})));

assert(simRes.males[0].p.name === 'Nguyễn Văn An', 'Nguyễn Văn An đoạt Cúp Vàng Nam (thắng đối đầu Vũ Văn Phúc)');
assert(simRes.males[0].h2hWonTiebreak === true, 'Nguyễn Văn An có huy hiệu H2H');
assert(simRes.males[1].p.name === 'Vũ Văn Phúc', 'Vũ Văn Phúc đoạt Huy chương Bạc Nam');
assert(simRes.females[0].p.name === 'Phạm Thị Lan', 'Phạm Thị Lan đoạt Cúp Vàng Nữ (5 trận toàn thắng)');

console.log('\n===============================================================');
console.log(`KẾT QUẢ TỔNG CỘNG: ${passed} PASS, ${failed} FAIL.`);
console.log('===============================================================');
