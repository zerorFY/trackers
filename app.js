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

// Start date: Feb 22, 2026 (Sunday)
const START_DATE = new Date(2026, 1, 22);
// End date: Dec 31, 2026
const END_DATE = new Date(2026, 11, 31);

let currentWeekOffset = 0;
let previousTotalScore = null; // Track previous score for animation trigger

// ===== Utility Functions =====

function getWeekStartDate(offset) {
    const d = new Date(START_DATE);
    d.setDate(d.getDate() + offset * 7);
    return d;
}

function getMaxWeekOffset() {
    const diff = END_DATE.getTime() - START_DATE.getTime();
    return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

function formatDate(date) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${m}/${d}`;
}

function formatDateFull(date) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function getWeekDates(offset) {
    const start = getWeekStartDate(offset);
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        dates.push(d);
    }
    return dates;
}

function getWeekKey(offset) {
    const start = getWeekStartDate(offset);
    return `week_${formatDateFull(start)}`;
}

function isToday(date) {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();
}

function isFutureDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d > today;
}

// ===== Data Persistence =====

function loadWeekData(offset) {
    const key = getWeekKey(offset);
    const stored = localStorage.getItem(key);
    if (stored) {
        return JSON.parse(stored);
    }
    const data = {};
    for (let day = 0; day < 7; day++) {
        data[day] = {};
        ITEMS.forEach(item => {
            data[day][item.id] = false;
        });
    }
    return data;
}

function saveWeekData(offset, data) {
    const key = getWeekKey(offset);
    localStorage.setItem(key, JSON.stringify(data));
}

// ===== Scoring =====

function calcDailyScore(dayData) {
    if (!dayData[MANDATORY_ITEM_ID]) return 0;
    let count = 0;
    ITEMS.forEach(item => {
        if (dayData[item.id]) count++;
    });
    return count >= REQUIRED_COUNT ? 1 : 0;
}

function calcTotalScore() {
    let total = BASE_SCORE;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxWeek = getMaxWeekOffset();

    for (let w = 0; w <= maxWeek; w++) {
        const weekDates = getWeekDates(w);
        // Skip weeks entirely in the future
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

// ===== Watch Fragment Animation =====

function showWatchFragmentModal(newTotal) {
    const overlay = document.getElementById('watchModal');
    const fragmentCount = Math.min(newTotal, WATCH_GOAL);
    const remaining = WATCH_GOAL - fragmentCount;

    // Update modal content
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
        if (i < fragmentCount - 1) {
            piece.classList.add('collected');
        } else if (i === fragmentCount - 1) {
            piece.classList.add('new');
        } else {
            piece.classList.add('empty');
        }
        grid.appendChild(piece);
    }

    // Show modal
    overlay.classList.add('active');

    // Fire confetti
    fireConfetti();
}

function closeWatchModal() {
    document.getElementById('watchModal').classList.remove('active');
}

function fireConfetti() {
    const container = document.getElementById('confettiContainer');
    container.innerHTML = '';
    const colors = ['#FFD700', '#C850C0', '#F5A0CB', '#E8D5F5', '#7B2D8E', '#FF69B4', '#FFA500'];

    for (let i = 0; i < 40; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDelay = Math.random() * 1 + 's';
        confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        confetti.style.width = (6 + Math.random() * 8) + 'px';
        confetti.style.height = (6 + Math.random() * 8) + 'px';
        container.appendChild(confetti);
    }

    // Clean up after animation
    setTimeout(() => { container.innerHTML = ''; }, 4000);
}

// ===== Rendering =====

function renderTracker() {
    const weekDates = getWeekDates(currentWeekOffset);
    const weekData = loadWeekData(currentWeekOffset);
    const startDate = weekDates[0];
    const endDate = weekDates[6];

    // Update week label
    document.getElementById('weekLabel').textContent =
        `📅 Week ${currentWeekOffset + 1} · ${formatDate(startDate)} - ${formatDate(endDate)}`;

    // Build table body
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
            cb.checked = weekData[day][item.id] || false;
            cb.dataset.day = day;
            cb.dataset.item = item.id;
            cb.addEventListener('change', onCheckboxChange);

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

        const score = calcDailyScore(weekData[day]);
        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'daily-score ' + (score ? 'earned' : 'not-earned');
        scoreSpan.textContent = score;
        td.appendChild(scoreSpan);
        scoreTr.appendChild(td);
    }

    tbody.appendChild(scoreTr);

    // Update header columns
    const headerRow = document.getElementById('headerRow');
    const ths = headerRow.querySelectorAll('.day-header');
    ths.forEach((th, i) => {
        th.className = 'day-header' + (isToday(weekDates[i]) ? ' today-header' : '');
        th.querySelector('.day-name').textContent = DAY_NAMES[i];
        th.querySelector('.day-date').textContent = formatDate(weekDates[i]);
    });

    // Update total score
    updateTotalScore();

    // Update week progress bar
    updateWeekProgress(weekData, weekDates);

    // Update watch progress bar
    updateWatchProgress();
}

function updateTotalScore() {
    const total = calcTotalScore();
    const el = document.getElementById('totalScore');
    const oldValue = parseInt(el.textContent) || 0;
    el.textContent = total;

    if (total !== oldValue) {
        el.classList.remove('pulse');
        void el.offsetWidth;
        el.classList.add('pulse');
    }

    // Check if score increased (for watch animation)
    if (previousTotalScore !== null && total > previousTotalScore) {
        // Score went up! Show watch fragment animation
        setTimeout(() => showWatchFragmentModal(total), 300);
    }
    previousTotalScore = total;
}

function updateWeekProgress(weekData, weekDates) {
    let earned = 0;
    let possible = 0;
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

function onCheckboxChange(e) {
    const day = parseInt(e.target.dataset.day);
    const itemId = e.target.dataset.item;
    const weekData = loadWeekData(currentWeekOffset);

    weekData[day][itemId] = e.target.checked;
    saveWeekData(currentWeekOffset, weekData);

    renderTracker();
}

function prevWeek() {
    if (currentWeekOffset > 0) {
        currentWeekOffset--;
        previousTotalScore = null; // Don't trigger animation on navigation
        renderTracker();
    }
}

function nextWeek() {
    const maxWeek = getMaxWeekOffset();
    if (currentWeekOffset < maxWeek) {
        currentWeekOffset++;
        previousTotalScore = null; // Don't trigger animation on navigation
        renderTracker();
    }
}

// ===== Determine current week =====

function getCurrentWeekOffset() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(START_DATE);
    start.setHours(0, 0, 0, 0);

    const diff = today.getTime() - start.getTime();
    const weekDiff = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
    return Math.max(0, Math.min(weekDiff, getMaxWeekOffset()));
}

// ===== Init =====

document.addEventListener('DOMContentLoaded', () => {
    currentWeekOffset = getCurrentWeekOffset();
    previousTotalScore = calcTotalScore(); // Initialize without triggering animation
    renderTracker();

    document.getElementById('prevWeek').addEventListener('click', prevWeek);
    document.getElementById('nextWeek').addEventListener('click', nextWeek);
    document.getElementById('closeWatchModal').addEventListener('click', closeWatchModal);

    // Close modal on overlay click
    document.getElementById('watchModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeWatchModal();
    });
});
