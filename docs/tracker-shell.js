const PAGE_PASSWORD = '123';
const PASSWORD_STORAGE_KEY = 'trackers_current_page_password';
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const pageName = document.body.dataset.person || 'Tracker';

document.body.innerHTML = `
    <main class="app-shell">
        <section class="topbar">
            <div>
                <p class="eyebrow">Weekly Check-in</p>
                <h1 id="pageTitle">${pageName}'s Tracker</h1>
            </div>
            <div class="week-card">
                <span class="week-label">Current Week</span>
                <strong id="weekRange">Loading...</strong>
            </div>
        </section>

        <section class="summary-strip" aria-label="Weekly summary">
            <div>
                <span class="summary-label">Done</span>
                <strong id="doneCount">0</strong>
            </div>
            <div>
                <span class="summary-label">Total</span>
                <strong id="totalCount">0</strong>
            </div>
            <div>
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
                <h2>Weekly Plan</h2>
                <span id="saveStatus" class="save-status">Connecting...</span>
            </div>
            <p id="errorMessage" class="error-message" hidden></p>

            <div class="table-wrap">
                <table class="tracker-table">
                    <thead>
                        <tr id="dayHeader">
                            <th class="item-col">Item</th>
                        </tr>
                    </thead>
                    <tbody id="trackerBody"></tbody>
                </table>
            </div>
        </section>
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
    header.innerHTML = '<th class="item-col">Item</th>';

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
    document.getElementById('saveStatus').textContent = canEdit ? 'Connected to Sheet' : 'Access needed';
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

render();
