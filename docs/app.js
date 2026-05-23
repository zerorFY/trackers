const PASSWORD_STORAGE_KEY = 'trackers_current_page_password';

const PEOPLE = [
    { name: 'Freya', href: 'freya/index.html', done: 0, total: 0, password: '123' },
    { name: 'Lora', href: 'lora/index.html', done: 0, total: 0, password: '123' },
    { name: 'Mia', href: 'mia/index.html', done: 0, total: 0, password: '123' },
    { name: 'Theodore', href: 'thedore/index.html', done: 0, total: 0, password: '123' },
    { name: 'Sophia', href: 'https://zerorfy.github.io/sophia-tracker/', done: 0, total: 0, password: '123' },
];

const passwordForm = document.getElementById('passwordForm');
const passwordInput = document.getElementById('passwordInput');
const passwordState = document.getElementById('passwordState');
const clearPasswordButton = document.getElementById('clearPassword');
const rankingBody = document.getElementById('rankingBody');
const sortByProgressButton = document.getElementById('sortByProgress');
const sortByDoneButton = document.getElementById('sortByDone');

let sortMode = 'progress';

function getSavedPassword() {
    return localStorage.getItem(PASSWORD_STORAGE_KEY) || '';
}

function setSavedPassword(password) {
    localStorage.setItem(PASSWORD_STORAGE_KEY, password.trim());
}

function clearSavedPassword() {
    localStorage.removeItem(PASSWORD_STORAGE_KEY);
}

function renderPasswordState() {
    passwordState.textContent = getSavedPassword() ? 'Password saved' : 'No password saved';
}

function getPeopleSummaries() {
    return PEOPLE.map(person => ({
        ...person,
        percent: person.total ? Math.round((person.done / person.total) * 100) : 0,
    }));
}

function sortForRanking(people, mode) {
    return [...people].sort((a, b) => {
        if (mode === 'done' && b.done !== a.done) return b.done - a.done;
        if (b.percent !== a.percent) return b.percent - a.percent;
        if (b.done !== a.done) return b.done - a.done;
        return a.name.localeCompare(b.name);
    });
}

function renderSortState() {
    sortByProgressButton.classList.toggle('active', sortMode === 'progress');
    sortByDoneButton.classList.toggle('active', sortMode === 'done');
    sortByProgressButton.setAttribute('aria-pressed', String(sortMode === 'progress'));
    sortByDoneButton.setAttribute('aria-pressed', String(sortMode === 'done'));
}

function renderRanking(rankedPeople) {
    rankingBody.innerHTML = '';

    rankedPeople.forEach((person, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><a href="${person.href}">${person.name}</a></td>
            <td>#${index + 1}</td>
            <td>
                <div class="ranking-progress">
                    <div class="progress-track" aria-hidden="true">
                        <div class="progress-fill" style="width: ${person.percent}%"></div>
                    </div>
                    <span>${person.percent}%</span>
                </div>
            </td>
            <td>${person.total ? `${person.done} / ${person.total}` : '-'}</td>
        `;
        rankingBody.appendChild(row);
    });
}

function renderDashboard() {
    const rankedPeople = sortForRanking(getPeopleSummaries(), sortMode);
    renderSortState();
    renderRanking(rankedPeople);
}

passwordForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!passwordInput.value.trim()) return;
    setSavedPassword(passwordInput.value);
    passwordInput.value = '';
    renderPasswordState();
});

clearPasswordButton.addEventListener('click', () => {
    clearSavedPassword();
    renderPasswordState();
});

sortByProgressButton.addEventListener('click', () => {
    sortMode = 'progress';
    renderDashboard();
});

sortByDoneButton.addEventListener('click', () => {
    sortMode = 'done';
    renderDashboard();
});

renderPasswordState();
renderDashboard();
