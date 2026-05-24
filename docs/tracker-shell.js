const PAGE_PASSWORD = '123';
const PASSWORD_STORAGE_KEY = 'trackers_current_page_password';
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const pageName = document.body.dataset.person || 'Tracker';

document.body.innerHTML = `
    <div class="page-pattern" aria-hidden="true"></div>

    <main class="app-shell">
        <section class="hero">
            <div class="hero-copy">
                <div class="hero-mascot mini-title-mascot" aria-hidden="true">
                    <div class="mascot">
                        <div class="ear ear-left"></div>
                        <div class="ear ear-right"></div>
                        <div class="face">
                            <div class="skull">☠</div>
                            <div class="eye eye-left"></div>
                            <div class="eye eye-right"></div>
                            <div class="blush blush-left"></div>
                            <div class="blush blush-right"></div>
                        </div>
                        <div class="tail"></div>
                    </div>
                </div>
                <h1 id="pageTitle">${pageName}'s Kuromi Week</h1>
                <p class="ribbon"><span>☠</span> Let's do our best! <span>♡</span></p>
            </div>

            <div class="week-card">
                <span class="calendar-icon" aria-hidden="true">▣</span>
                <span class="week-label">Current Week</span>
                <strong id="weekRange">Loading...</strong>
                <span class="mini-mascot" aria-hidden="true">☠</span>
            </div>
        </section>

        <section class="summary-strip" aria-label="Weekly summary">
            <div class="summary-card">
                <span class="summary-icon"><img src="../assets/item-3.png" alt=""></span>
                <span class="summary-label">Collected</span>
                <strong id="doneCount">0</strong>
            </div>
            <div class="summary-card">
                <span class="summary-icon"><img src="../assets/item-2.png" alt=""></span>
                <span class="summary-label">Missions</span>
                <strong id="totalCount">0</strong>
            </div>
            <div class="summary-card">
                <span class="summary-icon"><img src="../assets/item-4.png" alt=""></span>
                <span class="summary-label">Progress</span>
                <strong id="progressPct">0%</strong>
            </div>
        </section>

        <section id="accessGate" class="access-gate" hidden>
            <h2>Access Code</h2>
            <form id="accessForm" class="access-form">
                <input id="accessToken" type="password" autocomplete="current-password" placeholder="Enter access code">
                <button type="submit">Connect</button>
            </form>
        </section>

        <section class="tracker-panel">
            <div class="panel-header">
                <h2><span aria-hidden="true">🎀</span> This Week's Adventure</h2>
                <div class="panel-actions">
                    <button id="syncItemsBtn" class="sync-btn" type="button">更新 Items</button>
                    <button id="syncCheckinsBtn" class="sync-btn primary" type="button">同步打卡记录</button>
                    <span id="saveStatus" class="save-status">Local</span>
                </div>
            </div>
            <p id="errorMessage" class="error-message" hidden></p>

            <div class="table-wrap">
                <table class="tracker-table">
                    <thead>
                        <tr id="dayHeader">
                            <th class="item-col">Item ✨</th>
                        </tr>
                    </thead>
                    <tbody id="trackerBody"></tbody>
                </table>
            </div>
        </section>

        <div class="sticker-floor" aria-hidden="true">
            <span class="book-sticker"><img src="../assets/item-1.png" alt=""></span>
            <span class="bat-ribbon">♡──☠──♡</span>
            <span class="potion-sticker"><img src="../assets/item-4.png" alt=""></span>
        </div>
        <footer class="footer">Made with 💜 for ${pageName}</footer>
    </main>
`;

function getSavedPassword() {
    return localStorage.getItem(PASSWORD_STORAGE_KEY) || '';
}

function setSavedPassword(password) {
    localStorage.setItem(PASSWORD_STORAGE_KEY, password.trim());
}

function getMonday(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
}

function addDays(date, amount) {
    const d = new Date(date);
    d.setDate(d.getDate() + amount);
    return d;
}

function formatShortDate(date) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatFullDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getWeekDates() {
    const monday = getMonday(new Date());
    return DAY_NAMES.map((day, index) => ({
        day,
        date: addDays(monday, index),
    }));
}

function isToday(date) {
    return formatFullDate(new Date()) === formatFullDate(date);
}

function renderHeader() {
    const header = document.getElementById('dayHeader');
    header.innerHTML = '<th class="item-col">Item ✨</th>';

    getWeekDates().forEach(({ day, date }) => {
        const th = document.createElement('th');
        if (isToday(date)) th.classList.add('today');
        th.innerHTML = `<span class="day-name">${day}</span><span class="day-date">${formatShortDate(date)}</span>`;
        header.appendChild(th);
    });
}

function renderEmpty() {
    document.getElementById('trackerBody').innerHTML =
        '<tr><td class="empty-row" colspan="8">No tracker items found in the Items sheet.</td></tr>';
}

function renderAccessState() {
    const canEdit = getSavedPassword() === PAGE_PASSWORD;
    const accessGate = document.getElementById('accessGate');
    accessGate.hidden = canEdit;
    document.getElementById('saveStatus').textContent = canEdit ? 'Local copy' : 'Local empty';
    document.getElementById('saveStatus').className = `save-status ${canEdit ? 'saved' : 'error'}`.trim();
}

function render() {
    const weekDates = getWeekDates();
    document.getElementById('weekRange').textContent =
        `${formatShortDate(weekDates[0].date)} - ${formatShortDate(weekDates[6].date)}`;
    document.getElementById('doneCount').textContent = '0';
    document.getElementById('totalCount').textContent = '0';
    document.getElementById('progressPct').textContent = '0%';
    document.getElementById('pageTitle').textContent = `${pageName}'s Tracker`;
    document.title = `${pageName}'s Tracker`;
    renderHeader();
    renderEmpty();
    renderAccessState();
}

document.getElementById('accessForm').addEventListener('submit', event => {
    event.preventDefault();
    const password = document.getElementById('accessToken').value;
    if (!password.trim()) return;
    setSavedPassword(password);
    document.getElementById('accessToken').value = '';
    renderAccessState();
});

document.getElementById('syncItemsBtn').addEventListener('click', () => {
    document.getElementById('accessGate').hidden = false;
});

document.getElementById('syncCheckinsBtn').addEventListener('click', () => {
    document.getElementById('accessGate').hidden = false;
});

render();
