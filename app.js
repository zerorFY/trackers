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

const START_DATE = new Date(2026, 1, 22); // Feb 22, 2026 (Sunday)
const END_DATE = new Date(2026, 11, 31);  // Dec 31, 2026

let currentWeekOffset = 0;
let savedTotalScore = null;
let pinBuffer = '';
let pendingChanges = {}; // Track unsaved checkbox changes for current week

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

// ===== Password Lock =====

function initLockScreen() {
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
                        // Unlock
                        document.getElementById('lockOverlay').classList.add('unlocked');
                        setTimeout(() => {
                            document.getElementById('lockOverlay').style.display = 'none';
                            document.getElementById('mainApp').style.display = 'block';
                        }, 500);
                    } else {
                        // Wrong password
                        document.getElementById('lockError').textContent = 'Wrong password!';
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
}

function updatePinDots() {
    for (let i = 0; i < 4; i++) {
        const dot = document.getElementById('dot' + i);
        dot.classList.toggle('filled', i < pinBuffer.length);
    }
}

// ===== Watch Animation =====

function showWatchAnimation(newTotal) {
    const overlay = document.getElementById('watchModal');
    const stage1 = document.getElementById('watchStage1');
    const stage2 = document.getElementById('watchStage2');
    const fragmentCount = Math.min(newTotal, WATCH_GOAL);
    const remaining = WATCH_GOAL - fragmentCount;

    // Reset stages
    stage1.style.display = 'block';
    stage1.style.opacity = '1';
    stage2.style.display = 'none';
    stage2.style.opacity = '0';

    // Reset watch animation by re-inserting the element
    const assembleEl = stage1.querySelector('.watch-assemble');
    const parent = assembleEl.parentNode;
    const clone = assembleEl.cloneNode(true);
    parent.replaceChild(clone, assembleEl);

    // Update fragment info
    document.getElementById('modalFragmentCount').textContent = `${fragmentCount} / ${WATCH_GOAL}`;

    if (fragmentCount >= WATCH_GOAL) {
        document.getElementById('modalTitle').textContent = '🎉 CONGRATULATIONS! 🎉';
        document.getElementById('modalText').textContent =
            'Freya, you collected all 100 fragments! You earned your watch! 🎊';
    } else {
        document.getElementById('modalTitle').textContent = '✨ New Watch Fragment! ✨';
        document.getElementById('modalText').textContent =
            `Amazing job, Freya! ${remaining} more fragment${remaining !== 1 ? 's' : ''} to go!`;
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

    // Show overlay
    overlay.classList.add('active');

    // Fire confetti
    fireConfetti();

    // Add sparkles to watch
    setTimeout(() => {
        const sparkleContainer = document.getElementById('sparkleContainer') || clone.querySelector('.sparkle-container');
        addSparkles(sparkleContainer);
    }, 1200);

    // Transition: stage1 (watch assembles, ~2.5s) → stage2 (fragment info, 2s) → auto-close
    setTimeout(() => {
        // Fade from watch to fragment info
        stage1.style.opacity = '0';
        setTimeout(() => {
            stage1.style.display = 'none';
            stage2.style.display = 'block';
            setTimeout(() => { stage2.style.opacity = '1'; }, 50);
        }, 400);
    }, 2500);

    // Auto-dismiss after total ~7s (2.5s watch + 0.4s transition + 2s fragment + 2s hold)
    setTimeout(() => {
        overlay.classList.remove('active');
    }, 7000);
}

function addSparkles(container) {
    if (!container) return;
    const sparkles = ['✨', '⭐', '💫', '🌟', '✦', '✧'];
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
        spark.style.animationDelay = (0.2 + i * 0.12) + 's';
        container.appendChild(spark);
    });
}

function fireConfetti() {
    const container = document.getElementById('confettiContainer');
    container.innerHTML = '';
    const colors = ['#FFD700', '#C850C0', '#F5A0CB', '#E8D5F5', '#7B2D8E', '#FF69B4', '#FFA500'];

    for (let i = 0; i < 50; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + '%';
        c.style.animationDelay = Math.random() * 1.2 + 's';
        c.style.animationDuration = (2 + Math.random() * 2) + 's';
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        c.style.width = (6 + Math.random() * 10) + 'px';
        c.style.height = (6 + Math.random() * 10) + 'px';
        container.appendChild(c);
    }

    setTimeout(() => { container.innerHTML = ''; }, 5000);
}

// ===== Confirm Dialog =====

function showConfirmDialog() {
    document.getElementById('confirmDialog').classList.add('active');
}

function hideConfirmDialog() {
    document.getElementById('confirmDialog').classList.remove('active');
}

function onConfirmSave() {
    hideConfirmDialog();

    // Save the current pending data
    const weekData = loadWeekData(currentWeekOffset);

    // Apply pending changes
    for (const key in pendingChanges) {
        const [day, itemId] = key.split('|');
        weekData[day][itemId] = pendingChanges[key];
    }

    const oldScore = savedTotalScore;

    saveWeekData(currentWeekOffset, weekData);
    pendingChanges = {};

    // Update button state
    const btn = document.getElementById('confirmBtn');
    btn.classList.add('saved');
    btn.querySelector('.confirm-btn-text').textContent = 'Saved! ✨';
    btn.querySelector('.confirm-btn-icon').textContent = '🎉';

    setTimeout(() => {
        btn.classList.remove('saved');
        btn.querySelector('.confirm-btn-text').textContent = 'Confirm & Save';
        btn.querySelector('.confirm-btn-icon').textContent = '✅';
    }, 2000);

    // Re-render with saved data
    renderTracker(false);

    // Check if score increased -> show watch animation
    const newScore = calcTotalScore();
    if (newScore > oldScore) {
        setTimeout(() => showWatchAnimation(newScore), 400);
    }

    savedTotalScore = newScore;
}

// ===== Rendering =====

function renderTracker(keepPending) {
    const weekDates = getWeekDates(currentWeekOffset);
    const weekData = loadWeekData(currentWeekOffset);
    const startDate = weekDates[0];
    const endDate = weekDates[6];

    // Apply pending changes for display (if keeping)
    const displayData = JSON.parse(JSON.stringify(weekData));
    if (keepPending) {
        for (const key in pendingChanges) {
            const [day, itemId] = key.split('|');
            displayData[day][itemId] = pendingChanges[key];
        }
    }

    // Week label
    document.getElementById('weekLabel').textContent =
        `📅 Week ${currentWeekOffset + 1} · ${formatDate(startDate)} - ${formatDate(endDate)}`;

    const tbody = document.getElementById('trackerBody');
    tbody.innerHTML = '';

    // Item rows
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

    // Score row (based on display data)
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

    // Update header columns
    const ths = document.getElementById('headerRow').querySelectorAll('.day-header');
    ths.forEach((th, i) => {
        th.className = 'day-header' + (isToday(weekDates[i]) ? ' today-header' : '');
        th.querySelector('.day-name').textContent = DAY_NAMES[i];
        th.querySelector('.day-date').textContent = formatDate(weekDates[i]);
    });

    // Update total score display
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
    const key = `${day}|${itemId}`;
    pendingChanges[key] = e.target.checked;

    // Show hint
    document.getElementById('confirmHint').textContent =
        '📝 You have unsaved changes — press Confirm to save!';
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
    const diff = today.getTime() - start.getTime();
    return Math.max(0, Math.min(Math.floor(diff / (7 * 24 * 60 * 60 * 1000)), getMaxWeekOffset()));
}

// ===== Init =====

document.addEventListener('DOMContentLoaded', () => {
    // Init lock screen
    initLockScreen();

    currentWeekOffset = getCurrentWeekOffset();
    savedTotalScore = calcTotalScore();
    renderTracker(false);

    document.getElementById('prevWeek').addEventListener('click', prevWeek);
    document.getElementById('nextWeek').addEventListener('click', nextWeek);

    // Confirm button
    document.getElementById('confirmBtn').addEventListener('click', showConfirmDialog);

    // Confirm dialog buttons
    document.getElementById('dialogOk').addEventListener('click', onConfirmSave);
    document.getElementById('dialogCancel').addEventListener('click', hideConfirmDialog);

    // Close confirm dialog on overlay click
    document.getElementById('confirmDialog').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) hideConfirmDialog();
    });
});
