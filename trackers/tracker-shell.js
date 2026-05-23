const PAGE_PASSWORD = '123';
const PASSWORD_STORAGE_KEY = 'trackers_current_page_password';
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const pageName = document.body.dataset.person || 'Tracker';

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

function getWeekDates() {
    const monday = getMonday(new Date());
    return DAY_NAMES.map((day, index) => ({
        day,
        date: addDays(monday, index),
    }));
}

function renderHeader() {
    const header = document.getElementById('dayHeader');
    header.innerHTML = '<th class="item-col">Item</th>';

    getWeekDates().forEach(({ day, date }) => {
        const th = document.createElement('th');
        th.innerHTML = `<span class="day-name">${day}</span><span class="day-date">${formatShortDate(date)}</span>`;
        header.appendChild(th);
    });
}

function renderEmpty() {
    document.getElementById('trackerBody').innerHTML =
        '<tr><td class="empty-row" colspan="8">This tracker shell is ready. Sheet data is not connected yet.</td></tr>';
}

function renderAccessState() {
    const canEdit = getSavedPassword() === PAGE_PASSWORD;
    document.getElementById('saveStatus').textContent = canEdit ? 'Password Ready' : 'Read Only';
    document.getElementById('saveStatus').className = `save-status ${canEdit ? 'saved' : ''}`.trim();
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
