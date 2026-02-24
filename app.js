// ===== Freya's Learning Tracker - App Logic =====

const ITEMS = [
    { id: '337', label: '337' },
    { id: 'tiantianpractice', label: '天天练' },
    { id: 'spark', label: '火花思维' },
    { id: 'elephant', label: '大象' },
    { id: 'reading30', label: '30分钟读书', mandatory: true },
    { id: 'math', label: '数学' },
    { id: 'readwithlora', label: '带Lora读书' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BASE_SCORE = 8;
const REQUIRED_COUNT = 4;
const MANDATORY_ITEM_ID = 'reading30';
const WATCH_GOAL = 100;
const PASSWORD = '0730';

const START_DATE = new Date(2026, 1, 22); // Feb 22, 2026
const END_DATE = new Date(2026, 11, 31);  // Dec 31, 2026

let currentWeekOffset = 0;
let savedTotalScore = null;
let pinBuffer = '';
let pendingChanges = {};

// ===== Modification Log =====
// Stored in localStorage as an array of {timestamp, weekOffset, day, dayDate, items, dailyScore}
const LOG_KEY = 'freya_modification_log';

function loadLog() {
    const stored = localStorage.getItem(LOG_KEY);
    return stored ? JSON.parse(stored) : [];
}

function saveLog(log) {
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
}

function addLogEntry(weekOffset, dayIndex, dayDate, weekData) {
    const log = loadLog();
    const checkedItems = ITEMS.filter(item => weekData[dayIndex][item.id]).map(item => item.label);
    const dailyScore = calcDailyScore(weekData[dayIndex]);

    log.push({
        timestamp: new Date().toISOString(),
        week: weekOffset + 1,
        day: DAY_NAMES[dayIndex],
        date: dayDate,
        items: checkedItems.join(', '),
        itemCount: checkedItems.length,
        dailyScore: dailyScore,
    });

    saveLog(log);
}

// ===== CSV Export =====

function exportCSV() {
    // Build full data: all weeks from start to current
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const maxWeek = getMaxWeekOffset();
    const rows = [];

    // Header
    const header = ['Date', 'Day', 'Week'];
    ITEMS.forEach(item => header.push(item.label));
    header.push('Items Done', 'Daily Score');
    rows.push(header);

    // Data rows
    for (let w = 0; w <= maxWeek; w++) {
        const weekDates = getWeekDates(w);
        if (weekDates[0] > today) break;

        const weekData = loadWeekData(w);
        for (let d = 0; d < 7; d++) {
            if (isFutureDate(weekDates[d])) continue;
            const row = [];
            row.push(formatDateFull(weekDates[d]));
            row.push(DAY_NAMES[d]);
            row.push(`Week ${w + 1}`);

            let count = 0;
            ITEMS.forEach(item => {
                const checked = weekData[d][item.id] ? 1 : 0;
                row.push(checked);
                if (checked) count++;
            });

            row.push(count);
            row.push(calcDailyScore(weekData[d]));
            rows.push(row);
        }
    }

    // Add summary row
    rows.push([]);
    rows.push(['Total Score (including base 8)', '', '', '', '', '', '', '', '', calcTotalScore()]);

    // Add modification log
    const log = loadLog();
    if (log.length > 0) {
        rows.push([]);
        rows.push(['=== Modification Log ===']);
        rows.push(['Timestamp', 'Week', 'Day', 'Date', 'Items Checked', 'Item Count', 'Score']);
        log.forEach(entry => {
            rows.push([
                entry.timestamp,
                `Week ${entry.week}`,
                entry.day,
                entry.date,
                entry.items,
                entry.itemCount,
                entry.dailyScore,
            ]);
        });
    }

    // Convert to CSV string
    const csvContent = rows.map(row =>
        row.map(cell => {
            const str = String(cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        }).join(',')
    ).join('\n');

    // Add BOM for Excel to recognize UTF-8
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Freya_Learning_Tracker_${formatDateFull(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ===== Utility Functions =====

function getWeekStartDate(offset) {
    const d = new Date(START_DATE);
    d.setDate(d.getDate() + offset * 7);
    return d;
}

function getMaxWeekOffset() {
    return Math.floor((END_DATE.getTime() - START_DATE.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

function formatDate(date) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatDateFull(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getWeekDates(offset) {
    const start = getWeekStartDate(offset);
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
    });
}

function getWeekKey(offset) {
    return `week_${formatDateFull(getWeekStartDate(offset))}`;
}

function isToday(date) {
    const t = new Date();
    return date.getFullYear() === t.getFullYear() &&
        date.getMonth() === t.getMonth() &&
        date.getDate() === t.getDate();
}

function isFutureDate(date) {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    return d > t;
}

// ===== Data Persistence =====

function loadWeekData(offset) {
    const stored = localStorage.getItem(getWeekKey(offset));
    if (stored) return JSON.parse(stored);
    const data = {};
    for (let day = 0; day < 7; day++) {
        data[day] = {};
        ITEMS.forEach(item => { data[day][item.id] = false; });
    }
    return data;
}

function saveWeekData(offset, data) {
    localStorage.setItem(getWeekKey(offset), JSON.stringify(data));
}

// ===== Scoring =====

function calcDailyScore(dayData) {
    if (!dayData[MANDATORY_ITEM_ID]) return 0;
    let count = 0;
    ITEMS.forEach(item => { if (dayData[item.id]) count++; });
    return count >= REQUIRED_COUNT ? 1 : 0;
}

function calcTotalScore() {
    let total = BASE_SCORE;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const maxWeek = getMaxWeekOffset();

    for (let w = 0; w <= maxWeek; w++) {
        const weekDates = getWeekDates(w);
        if (weekDates[0] > today) break;
        const weekData = loadWeekData(w);
        for (let day = 0; day < 7; day++) {
            if (!isFutureDate(weekDates[day])) {
                total += calcDailyScore(weekData[day]);
            }
        }
    }
    return total;
}

// ===== Password Dialog =====

function showPasswordDialog() {
    pinBuffer = '';
    updatePinDots();
    document.getElementById('lockError').textContent = '';
    document.getElementById('passwordOverlay').classList.add('active');
}

function hidePasswordDialog() {
    document.getElementById('passwordOverlay').classList.remove('active');
    pinBuffer = '';
    updatePinDots();
}

function initPasswordPad() {
    const numpad = document.querySelector('.numpad');
    numpad.addEventListener('click', (e) => {
        const btn = e.target.closest('.numpad-btn');
        if (!btn) return;
        const num = btn.dataset.num;

        if (num === 'clear') {
            pinBuffer = '';
            updatePinDots();
            document.getElementById('lockError').textContent = '';
        } else if (num === 'back') {
            pinBuffer = pinBuffer.slice(0, -1);
            updatePinDots();
            document.getElementById('lockError').textContent = '';
        } else {
            if (pinBuffer.length < 4) {
                pinBuffer += num;
                updatePinDots();

                if (pinBuffer.length === 4) {
                    if (pinBuffer === PASSWORD) {
                        hidePasswordDialog();
                        performSave();
                    } else {
                        document.getElementById('lockError').textContent = 'Wrong password! Try again.';
                        document.querySelectorAll('.pin-dot').forEach(d => d.classList.add('error'));
                        setTimeout(() => {
                            pinBuffer = '';
                            updatePinDots();
                            document.querySelectorAll('.pin-dot').forEach(d => d.classList.remove('error'));
                        }, 600);
                    }
                }
            }
        }
    });

    document.getElementById('cancelPassword').addEventListener('click', hidePasswordDialog);
    document.getElementById('passwordOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) hidePasswordDialog();
    });
}

function updatePinDots() {
    for (let i = 0; i < 4; i++) {
        document.getElementById('dot' + i).classList.toggle('filled', i < pinBuffer.length);
    }
}

// ===== Save Logic =====

function performSave() {
    const weekData = loadWeekData(currentWeekOffset);
    const weekDates = getWeekDates(currentWeekOffset);

    // Apply pending changes
    const changedDays = new Set();
    for (const key in pendingChanges) {
        const [day, itemId] = key.split('|');
        weekData[day][itemId] = pendingChanges[key];
        changedDays.add(parseInt(day));
    }

    const oldScore = savedTotalScore;

    saveWeekData(currentWeekOffset, weekData);

    // Log each changed day
    changedDays.forEach(d => {
        addLogEntry(currentWeekOffset, d, formatDateFull(weekDates[d]), weekData);
    });

    pendingChanges = {};

    // Update button
    const btn = document.getElementById('confirmBtn');
    btn.classList.add('saved');
    btn.querySelector('.confirm-btn-text').textContent = 'Saved! ✨';
    btn.querySelector('.confirm-btn-icon').textContent = '🎉';

    setTimeout(() => {
        btn.classList.remove('saved');
        btn.querySelector('.confirm-btn-text').textContent = 'Confirm & Save';
        btn.querySelector('.confirm-btn-icon').textContent = '✅';
    }, 2500);

    // Update hint
    document.getElementById('confirmHint').textContent =
        '📝 Check today\'s completed items, then press confirm to save!';

    renderTracker(false);

    // Check score change for animation
    const newScore = calcTotalScore();
    if (newScore > oldScore) {
        setTimeout(() => showWatchAnimation(newScore), 500);
    }

    savedTotalScore = newScore;
}

// ===== Watch Animation (~10 seconds, 4 phases) =====

function showWatchAnimation(newTotal) {
    const overlay = document.getElementById('watchModal');
    const phase1 = document.getElementById('watchPhase1');
    const phase2 = document.getElementById('watchPhase2');
    const phase3 = document.getElementById('watchPhase3');
    const phase4 = document.getElementById('watchPhase4');

    const fragmentCount = Math.min(newTotal, WATCH_GOAL);
    const remaining = WATCH_GOAL - fragmentCount;

    // Reset all
    [phase1, phase2, phase3, phase4].forEach(p => {
        p.style.display = 'none';
        p.style.opacity = '0';
    });

    // Phase 1: Star gathering
    phase1.style.display = 'block';
    setTimeout(() => { phase1.style.opacity = '1'; }, 50);
    createGatheringStars();

    // Fire confetti immediately
    fireConfetti();

    // Show overlay
    overlay.classList.add('active');

    // Update content for later phases
    document.getElementById('modalFragmentCount').textContent = `${fragmentCount} / ${WATCH_GOAL}`;
    document.getElementById('modalFragmentCount2').textContent = `${fragmentCount} / ${WATCH_GOAL} fragments`;

    if (fragmentCount >= WATCH_GOAL) {
        document.getElementById('modalTitle').textContent = '🎉 CONGRATULATIONS! 🎉';
        document.getElementById('modalText').textContent =
            'Freya, you collected all 100 fragments! You earned your watch! 🎊';
    } else {
        document.getElementById('modalTitle').textContent = '✨ New Watch Fragment! ✨';
        document.getElementById('modalText').textContent =
            `Amazing job, Freya! Only ${remaining} more fragment${remaining !== 1 ? 's' : ''} to go!`;
    }

    // Build fragment grid
    const grid = document.getElementById('fragmentGrid');
    grid.innerHTML = '';
    for (let i = 0; i < WATCH_GOAL; i++) {
        const piece = document.createElement('div');
        piece.className = 'fragment-piece';
        if (i < fragmentCount - 1) piece.classList.add('collected');
        else if (i === fragmentCount - 1) piece.classList.add('new');
        else piece.classList.add('empty');
        grid.appendChild(piece);
    }

    // Phase 2: Watch assembly (at 2.5s)
    setTimeout(() => {
        phase1.style.opacity = '0';
        setTimeout(() => {
            phase1.style.display = 'none';

            // Clone phase2's watch-assemble to reset CSS animations
            const assembleEl = phase2.querySelector('.watch-assemble');
            if (assembleEl) {
                const clone = assembleEl.cloneNode(true);
                assembleEl.parentNode.replaceChild(clone, assembleEl);
            }

            phase2.style.display = 'block';
            setTimeout(() => { phase2.style.opacity = '1'; }, 50);

            // Add sparkles at 1.5s into phase 2
            setTimeout(() => {
                const sc = document.getElementById('sparkleContainer') ||
                    phase2.querySelector('.sparkle-container');
                addSparkles(sc);
            }, 1500);
        }, 500);
    }, 2500);

    // Phase 3: Celebration (at 6.5s)
    setTimeout(() => {
        phase2.style.opacity = '0';
        setTimeout(() => {
            phase2.style.display = 'none';
            phase3.style.display = 'block';
            setTimeout(() => { phase3.style.opacity = '1'; }, 50);
            fireConfetti(); // Second confetti wave
        }, 500);
    }, 6500);

    // Phase 4: Fragment grid (at 9s)
    setTimeout(() => {
        phase3.style.opacity = '0';
        setTimeout(() => {
            phase3.style.display = 'none';
            phase4.style.display = 'block';
            setTimeout(() => { phase4.style.opacity = '1'; }, 50);
        }, 400);
    }, 9000);

    // Auto-dismiss at ~12s (fragment grid shows for ~2.5s)
    setTimeout(() => {
        overlay.classList.remove('active');
    }, 12000);
}

function createGatheringStars() {
    const burst = document.getElementById('starBurst');
    burst.innerHTML = '';
    const emojis = ['⭐', '✨', '💫', '🌟', '⭐', '✨', '💫', '🌟', '✦', '✧', '⭐', '✨'];
    const positions = [
        { sx: '-80px', sy: '-60px' }, { sx: '120px', sy: '-50px' },
        { sx: '-60px', sy: '100px' }, { sx: '100px', sy: '90px' },
        { sx: '0px', sy: '-90px' }, { sx: '-100px', sy: '20px' },
        { sx: '130px', sy: '30px' }, { sx: '40px', sy: '110px' },
        { sx: '-90px', sy: '-20px' }, { sx: '110px', sy: '-80px' },
        { sx: '-50px', sy: '60px' }, { sx: '80px', sy: '-30px' },
    ];

    positions.forEach((pos, i) => {
        const star = document.createElement('div');
        star.className = 'gathering-star';
        star.textContent = emojis[i % emojis.length];
        star.style.setProperty('--sx', pos.sx);
        star.style.setProperty('--sy', pos.sy);
        star.style.animationDelay = (i * 0.15) + 's';
        star.style.left = '50%';
        star.style.top = '50%';
        burst.appendChild(star);
    });
}

function addSparkles(container) {
    if (!container) return;
    container.innerHTML = '';
    const sparkles = ['✨', '⭐', '💫', '🌟', '✦', '✧', '💖', '🎀'];
    const positions = [
        { x: '10%', y: '20%', tx: '-30px', ty: '-40px' },
        { x: '85%', y: '15%', tx: '30px', ty: '-35px' },
        { x: '5%', y: '70%', tx: '-25px', ty: '30px' },
        { x: '90%', y: '75%', tx: '35px', ty: '25px' },
        { x: '50%', y: '5%', tx: '0px', ty: '-45px' },
        { x: '50%', y: '95%', tx: '0px', ty: '40px' },
        { x: '15%', y: '45%', tx: '-35px', ty: '0px' },
        { x: '88%', y: '50%', tx: '30px', ty: '5px' },
    ];

    positions.forEach((pos, i) => {
        const spark = document.createElement('div');
        spark.className = 'sparkle';
        spark.textContent = sparkles[i % sparkles.length];
        spark.style.left = pos.x;
        spark.style.top = pos.y;
        spark.style.setProperty('--tx', pos.tx);
        spark.style.setProperty('--ty', pos.ty);
        spark.style.animationDelay = (0.2 + i * 0.15) + 's';
        container.appendChild(spark);
    });
}

function fireConfetti() {
    const container = document.getElementById('confettiContainer');
    container.innerHTML = '';
    const colors = ['#FFD700', '#C850C0', '#F5A0CB', '#E8D5F5', '#7B2D8E', '#FF69B4', '#FFA500', '#FF1493'];

    for (let i = 0; i < 60; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + '%';
        c.style.animationDelay = Math.random() * 1.5 + 's';
        c.style.animationDuration = (2.5 + Math.random() * 2.5) + 's';
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        c.style.width = (6 + Math.random() * 10) + 'px';
        c.style.height = (6 + Math.random() * 10) + 'px';
        container.appendChild(c);
    }

    setTimeout(() => { container.innerHTML = ''; }, 6000);
}

// ===== Rendering =====

function renderTracker(keepPending) {
    const weekDates = getWeekDates(currentWeekOffset);
    const weekData = loadWeekData(currentWeekOffset);

    // Apply pending for display
    const displayData = JSON.parse(JSON.stringify(weekData));
    if (keepPending) {
        for (const key in pendingChanges) {
            const [day, itemId] = key.split('|');
            displayData[day][itemId] = pendingChanges[key];
        }
    }

    document.getElementById('weekLabel').textContent =
        `📅 Week ${currentWeekOffset + 1} · ${formatDate(weekDates[0])} - ${formatDate(weekDates[6])}`;

    const tbody = document.getElementById('trackerBody');
    tbody.innerHTML = '';

    ITEMS.forEach(item => {
        const tr = document.createElement('tr');

        const tdName = document.createElement('td');
        tdName.className = 'item-name' + (item.mandatory ? ' mandatory' : '');
        tdName.textContent = item.label;
        tr.appendChild(tdName);

        for (let day = 0; day < 7; day++) {
            const td = document.createElement('td');
            if (isToday(weekDates[day])) td.classList.add('today-col');

            const wrapper = document.createElement('label');
            wrapper.className = 'checkbox-wrapper';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = displayData[day][item.id] || false;
            cb.dataset.day = day;
            cb.dataset.item = item.id;
            cb.addEventListener('change', onCheckboxToggle);

            const checkmark = document.createElement('span');
            checkmark.className = 'checkmark';

            wrapper.appendChild(cb);
            wrapper.appendChild(checkmark);
            td.appendChild(wrapper);
            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    });

    // Score row
    const scoreTr = document.createElement('tr');
    scoreTr.className = 'score-row';

    const scoreLabel = document.createElement('td');
    scoreLabel.className = 'item-name';
    scoreLabel.innerHTML = '🏆 Score';
    scoreTr.appendChild(scoreLabel);

    for (let day = 0; day < 7; day++) {
        const td = document.createElement('td');
        if (isToday(weekDates[day])) td.classList.add('today-col');

        const score = calcDailyScore(displayData[day]);
        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'daily-score ' + (score ? 'earned' : 'not-earned');
        scoreSpan.textContent = score;
        td.appendChild(scoreSpan);
        scoreTr.appendChild(td);
    }

    tbody.appendChild(scoreTr);

    // Headers
    const ths = document.getElementById('headerRow').querySelectorAll('.day-header');
    ths.forEach((th, i) => {
        th.className = 'day-header' + (isToday(weekDates[i]) ? ' today-header' : '');
        th.querySelector('.day-name').textContent = DAY_NAMES[i];
        th.querySelector('.day-date').textContent = formatDate(weekDates[i]);
    });

    updateTotalScoreDisplay();
    updateWeekProgress(displayData, weekDates);
    updateWatchProgress();
}

function updateTotalScoreDisplay() {
    const total = calcTotalScore();
    const el = document.getElementById('totalScore');
    const oldValue = parseInt(el.textContent) || 0;
    el.textContent = total;

    if (total !== oldValue) {
        el.classList.remove('pulse');
        void el.offsetWidth;
        el.classList.add('pulse');
    }
}

function updateWeekProgress(weekData, weekDates) {
    let earned = 0, possible = 0;
    for (let day = 0; day < 7; day++) {
        if (!isFutureDate(weekDates[day])) {
            possible++;
            earned += calcDailyScore(weekData[day]);
        }
    }
    const pct = possible > 0 ? (earned / possible) * 100 : 0;
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressText').textContent = `${earned}/${possible} days`;
}

function updateWatchProgress() {
    const total = calcTotalScore();
    const pct = Math.min((total / WATCH_GOAL) * 100, 100);
    document.getElementById('watchProgressFill').style.width = pct + '%';
    document.getElementById('watchProgressText').textContent =
        `${Math.min(total, WATCH_GOAL)} / ${WATCH_GOAL} fragments collected`;
}

// ===== Event Handlers =====

function onCheckboxToggle(e) {
    const day = e.target.dataset.day;
    const itemId = e.target.dataset.item;
    pendingChanges[`${day}|${itemId}`] = e.target.checked;
    document.getElementById('confirmHint').textContent =
        '⚠️ You have unsaved changes — press Confirm to save!';
}

function prevWeek() {
    if (currentWeekOffset > 0) {
        pendingChanges = {};
        currentWeekOffset--;
        renderTracker(false);
    }
}

function nextWeek() {
    if (currentWeekOffset < getMaxWeekOffset()) {
        pendingChanges = {};
        currentWeekOffset++;
        renderTracker(false);
    }
}

function getCurrentWeekOffset() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(START_DATE); start.setHours(0, 0, 0, 0);
    return Math.max(0, Math.min(
        Math.floor((today - start) / (7 * 24 * 60 * 60 * 1000)),
        getMaxWeekOffset()
    ));
}

// ===== Init =====

document.addEventListener('DOMContentLoaded', () => {
    initPasswordPad();

    currentWeekOffset = getCurrentWeekOffset();
    savedTotalScore = calcTotalScore();
    renderTracker(false);

    document.getElementById('prevWeek').addEventListener('click', prevWeek);
    document.getElementById('nextWeek').addEventListener('click', nextWeek);

    // Confirm button → show password
    document.getElementById('confirmBtn').addEventListener('click', () => {
        if (Object.keys(pendingChanges).length === 0) {
            document.getElementById('confirmHint').textContent =
                '📝 No changes to save. Check some items first!';
            return;
        }
        showPasswordDialog();
    });

    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportCSV);
});
