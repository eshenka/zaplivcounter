/* ============================================================
   Универсальные парсеры для плашек-отчётов
   ============================================================ */

const REPORT_HEADERS = [
    'Подводная охота',
    'Помощь с нырком',
    'Котячий заплыв',
    'Заплыв на дно',
    'Пробный заплыв',
    'Прокачка ПУ',
    'Чистка'
];

function isAnyReportStart(line) {
    return REPORT_HEADERS.some(h => line.startsWith(h));
}

/* ---------- Утилита: разбор "Имя / ID" ---------- */
function parseNameAndId(text) {
    const lastSlashIndex = text.lastIndexOf('/');

    if (lastSlashIndex === -1) {
        return null;
    }

    const name = text.substring(0, lastSlashIndex).trim();
    const idRaw = text.substring(lastSlashIndex + 1).trim();
    const idMatch = idRaw.match(/^(\d+)/);
    const playerId = idMatch ? idMatch[1] : '';

    if (!name || !playerId) {
        return null;
    }

    return { name, playerId };
}

/* ---------- Утилита: создание карточки ---------- */
function createReportCard({ title, playerId, details }) {
    const card = document.createElement('div');
    card.className = 'report-card-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'report-check';
    checkbox.title = 'Отметить как зачтённое';
    checkbox.addEventListener('change', () => {
        card.classList.toggle('row-checked', checkbox.checked);
    });

    const body = document.createElement('div');
    body.className = 'report-card-body';

    if (title) {
        const nameDiv = document.createElement('div');
        nameDiv.className = 'report-card-name';

        nameDiv.appendChild(document.createTextNode(title));

        if (playerId) {
            const idSpan = document.createElement('span');
            idSpan.className = 'player-id';
            idSpan.textContent = `/ ${playerId}`;
            nameDiv.appendChild(idSpan);
        }

        body.appendChild(nameDiv);
    }

    if (details) {
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'report-card-details';
        detailsDiv.textContent = details;
        body.appendChild(detailsDiv);
    }

    card.appendChild(checkbox);
    card.appendChild(body);

    return card;
}

/* ---------- Утилита: пустое состояние ---------- */
function renderEmpty(container, text) {
    container.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = text;
    container.appendChild(empty);
}

/* ============================================================
   1. ПОДВОДНАЯ ОХОТА
   ============================================================ */
class UnderwaterHuntParser {
    constructor() {
        // Map: playerId -> { name, playerId, finds: [] }
        this.hunters = new Map();
    }

    parse(data) {
        this.hunters.clear();

        const lines = data.split('\n');
        let active = false;
        let currentHunter = null;

        for (const rawLine of lines) {
            const line = rawLine.trim();

            if (line.startsWith('Подводная охота')) {
                active = true;
                currentHunter = null;
                continue;
            }

            if (isAnyReportStart(line)) {
                active = false;
                currentHunter = null;
                continue;
            }

            if (!active) continue;

            if (line.startsWith('Охотник:')) {
                const text = line.substring('Охотник:'.length).trim();
                const parsed = parseNameAndId(text);

                if (!parsed) continue;

                currentHunter = parsed;

                if (!this.hunters.has(parsed.playerId)) {
                    this.hunters.set(parsed.playerId, {
                        name: parsed.name,
                        playerId: parsed.playerId,
                        finds: []
                    });
                }
                continue;
            }

            if (line.startsWith('Находка:') && currentHunter) {
                const findText = line.substring('Находка:'.length).trim();

                if (findText) {
                    const stats = this.hunters.get(currentHunter.playerId);
                    if (stats) stats.finds.push(findText);
                }
            }
        }
    }

    display() {
        const container = document.getElementById('underwaterContent');
        if (!container) return;

        if (this.hunters.size === 0) {
            renderEmpty(container, 'Нет данных о подводной охоте');
            return;
        }

        const sorted = Array.from(this.hunters.values())
            .sort((a, b) => a.name.localeCompare(b.name));

        container.innerHTML = '';

        sorted.forEach(hunter => {
            const card = createReportCard({
                title: hunter.name,
                playerId: hunter.playerId,
                details: hunter.finds.join(', ')
            });
            container.appendChild(card);
        });
    }

    clear() {
        this.hunters.clear();
        const container = document.getElementById('underwaterContent');
        if (container) renderEmpty(container, 'Нет данных о подводной охоте');
    }
}

/* ============================================================
   2. ПОМОЩЬ С НЫРКОМ
   ============================================================ */
class DiveHelpParser {
    constructor() {
        // Map: playerId -> { name, playerId, total: number }
        this.helpers = new Map();
    }

    parse(data) {
        this.helpers.clear();

        const lines = data.split('\n');
        let active = false;
        let currentHelper = null;

        for (const rawLine of lines) {
            const line = rawLine.trim();

            if (line.startsWith('Помощь с нырком')) {
                active = true;
                currentHelper = null;
                continue;
            }

            if (isAnyReportStart(line)) {
                active = false;
                currentHelper = null;
                continue;
            }

            if (!active) continue;

            if (line.startsWith('Относящий:')) {
                const text = line.substring('Относящий:'.length).trim();
                const parsed = parseNameAndId(text);

                if (!parsed) continue;

                currentHelper = parsed;

                if (!this.helpers.has(parsed.playerId)) {
                    this.helpers.set(parsed.playerId, {
                        name: parsed.name,
                        playerId: parsed.playerId,
                        total: 0
                    });
                }
                continue;
            }

            if (line.startsWith('Ныряющий:') && currentHelper) {
                const text = line.substring('Ныряющий:'.length).trim();

                const divers = text
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean);

                const stats = this.helpers.get(currentHelper.playerId);
                if (stats) {
                    stats.total += divers.length;
                }
            }
        }
    }

    display() {
        const container = document.getElementById('divehelpContent');
        if (!container) return;

        if (this.helpers.size === 0) {
            renderEmpty(container, 'Нет данных о помощи с нырком');
            return;
        }

        const sorted = Array.from(this.helpers.values())
            .sort((a, b) => a.name.localeCompare(b.name));

        container.innerHTML = '';

        sorted.forEach(helper => {
            const card = createReportCard({
                title: helper.name,
                playerId: helper.playerId,
                details: `Отнёс: ${helper.total}`
            });
            container.appendChild(card);
        });
    }

    clear() {
        this.helpers.clear();
        const container = document.getElementById('divehelpContent');
        if (container) renderEmpty(container, 'Нет данных о помощи с нырком');
    }
}

/* ============================================================
   3. ЧИСТКА
   ============================================================ */
class CleaningParser {
    constructor() {
        // Map: playerId -> { name, playerId, total: number }
        this.cleaners = new Map();
    }

    parse(data) {
        this.cleaners.clear();

        const lines = data.split('\n');
        let active = false;
        let currentCleaner = null;

        for (const rawLine of lines) {
            const line = rawLine.trim();

            if (line.startsWith('Чистка')) {
                active = true;
                currentCleaner = null;
                continue;
            }

            if (isAnyReportStart(line)) {
                active = false;
                currentCleaner = null;
                continue;
            }

            if (!active) continue;

            if (line.startsWith('Участник:')) {
                const text = line.substring('Участник:'.length).trim();
                const parsed = parseNameAndId(text);

                if (!parsed) continue;

                currentCleaner = parsed;

                if (!this.cleaners.has(parsed.playerId)) {
                    this.cleaners.set(parsed.playerId, {
                        name: parsed.name,
                        playerId: parsed.playerId,
                        total: 0
                    });
                }
                continue;
            }

            if (
                line.startsWith('Количество смешанных падали/мха') &&
                currentCleaner
            ) {
                // Суммируем все числа в строке
                const numbers = line.match(/\d+/g);

                if (numbers) {
                    const sum = numbers.reduce(
                        (acc, n) => acc + parseInt(n, 10),
                        0
                    );

                    const stats = this.cleaners.get(currentCleaner.playerId);
                    if (stats) stats.total += sum;
                }
            }
        }
    }

    display() {
        const container = document.getElementById('cleaningContent');
        if (!container) return;

        if (this.cleaners.size === 0) {
            renderEmpty(container, 'Нет данных о чистке');
            return;
        }

        const sorted = Array.from(this.cleaners.values())
            .sort((a, b) => a.name.localeCompare(b.name));

        container.innerHTML = '';

        sorted.forEach(cleaner => {
            const card = createReportCard({
                title: cleaner.name,
                playerId: cleaner.playerId,
                details: `Суммарно: ${cleaner.total}`
            });
            container.appendChild(card);
        });
    }

    clear() {
        this.cleaners.clear();
        const container = document.getElementById('cleaningContent');
        if (container) renderEmpty(container, 'Нет данных о чистке');
    }
}

/* ============================================================
   4. ПРОКАЧКА ПУ (как есть, вариант B)
   ============================================================ */
class PUParser {
    constructor() {
        // Map: playerId -> { name, playerId, records: [] }
        this.players = new Map();
    }

    parse(data) {
        this.players.clear();

        const lines = data.split('\n');
        let active = false;
        let headerLine = '';
        let currentPlayer = null;
        let currentRecordLine = '';

        for (const rawLine of lines) {
            const line = rawLine.trim();

            if (line.startsWith('Прокачка ПУ')) {
                active = true;
                headerLine = line;
                currentPlayer = null;
                currentRecordLine = '';
                continue;
            }

            if (isAnyReportStart(line)) {
                // закрываем предыдущий отчёт
                if (active && currentPlayer && currentRecordLine) {
                    this._pushRecord(currentPlayer, headerLine, currentRecordLine);
                }
                active = false;
                currentPlayer = null;
                currentRecordLine = '';
                continue;
            }

            if (!active) continue;

            // Строка "Имя / ID | число | комментарий"
            // Определим по наличию '|' и '/' — но осторожно,
            // чтобы не спутать с другими строками.
            if (line.includes('/') && line.includes('|')) {
                // Если уже был игрок — сохраняем предыдущую запись
                if (currentPlayer && currentRecordLine) {
                    this._pushRecord(currentPlayer, headerLine, currentRecordLine);
                }

                const parts = line.split('|').map(s => s.trim());

                if (parts.length >= 2) {
                    const parsed = parseNameAndId(parts[0]);

                    if (parsed) {
                        currentPlayer = parsed;

                        if (!this.players.has(parsed.playerId)) {
                            this.players.set(parsed.playerId, {
                                name: parsed.name,
                                playerId: parsed.playerId,
                                records: []
                            });
                        }

                        // Остальные части (число, комментарий) склеиваем
                        currentRecordLine = parts.slice(1).join(' | ');
                    }
                }
            }
        }

        // Закрываем последний отчёт
        if (active && currentPlayer && currentRecordLine) {
            this._pushRecord(currentPlayer, headerLine, currentRecordLine);
        }
    }

    _pushRecord(player, headerLine, recordLine) {
        const stats = this.players.get(player.playerId);
        if (!stats) return;

        // Формат строки: "Прокачка ПУ | 22.09.26 | 6 | скриншот ПУ"
        // Мы склеиваем headerLine без первой части (там уже есть "Прокачка ПУ")
        // и recordLine
        const dateMatch = headerLine.match(/\|\s*(.+)$/);
        const date = dateMatch ? dateMatch[1].trim() : '';

        stats.records.push(`${date} | ${recordLine}`);
    }

    display() {
        const container = document.getElementById('puContent');
        if (!container) return;

        if (this.players.size === 0) {
            renderEmpty(container, 'Нет данных о прокачке ПУ');
            return;
        }

        // Без сортировки — как удобнее
        container.innerHTML = '';

        for (const player of this.players.values()) {
            const card = createReportCard({
                title: player.name,
                playerId: player.playerId,
                details: player.records.join('\n')
            });
            container.appendChild(card);
        }
    }

    clear() {
        this.players.clear();
        const container = document.getElementById('puContent');
        if (container) renderEmpty(container, 'Нет данных о прокачке ПУ');
    }
}

/* ============================================================
   5. ПРОБНЫЙ ЗАПЛЫВ (как есть, блоками)
   ============================================================ */
class TrialSwimParser {
    constructor() {
        // Массив блоков: { title, playerId, details }
        this.blocks = [];
    }

    parse(data) {
        this.blocks = [];

        const lines = data.split('\n');
        let active = false;
        let currentBlock = null;

        for (const rawLine of lines) {
            const line = rawLine.trim();

            if (line.startsWith('Пробный заплыв')) {
                // Закрываем предыдущий блок
                if (currentBlock) {
                    this.blocks.push(currentBlock);
                }

                active = true;
                currentBlock = {
                    title: '',
                    playerId: '',
                    details: []
                };

                // Заголовок — сохраняем как есть
                currentBlock.details.push(line);
                continue;
            }

            if (isAnyReportStart(line)) {
                if (currentBlock) {
                    this.blocks.push(currentBlock);
                    currentBlock = null;
                }
                active = false;
                continue;
            }

            if (!active || !currentBlock) continue;

            if (line.startsWith('Принимающий:')) {
                const text = line.substring('Принимающий:'.length).trim();
                const parsed = parseNameAndId(text);

                if (parsed) {
                    currentBlock.title = parsed.name;
                    currentBlock.playerId = parsed.playerId;
                }

                currentBlock.details.push(line);
                continue;
            }

            if (line) {
                currentBlock.details.push(line);
            }
        }

        if (currentBlock) {
            this.blocks.push(currentBlock);
        }
    }

    display() {
        const container = document.getElementById('trialswimContent');
        if (!container) return;

        if (this.blocks.length === 0) {
            renderEmpty(container, 'Нет данных о пробных заплывах');
            return;
        }

        container.innerHTML = '';

        this.blocks.forEach(block => {
            const card = createReportCard({
                title: block.title || 'Пробный заплыв',
                playerId: block.playerId,
                details: block.details.join('\n')
            });
            container.appendChild(card);
        });
    }

    clear() {
        this.blocks = [];
        const container = document.getElementById('trialswimContent');
        if (container) renderEmpty(container, 'Нет данных о пробных заплывах');
    }
}