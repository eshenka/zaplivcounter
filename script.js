class SwimEventParser {
    constructor() {
        this.participantStats = new Map();
        this.processedReports = [];
        this.underwaterParser = new UnderwaterHuntParser(); // ← добавить
        this.init();
    }

    init() {
        const processBtn = document.getElementById('processBtn');
        const clearBtn = document.getElementById('clearBtn');
        const showPlayerIdCheckbox = document.getElementById('showPlayerId');

        processBtn.addEventListener('click', () => this.processData());
        clearBtn.addEventListener('click', () => this.clearData());

        // Показывать / скрывать столбец ID
        showPlayerIdCheckbox.addEventListener('change', () => {
            this.togglePlayerIdColumn();
        });
    }

    processData() {
        const textArea = document.getElementById('eventData');
        const data = textArea.value.trim();

        if (!data) {
            alert('Пожалуйста, введите данные о заплывах');
            return;
        }

        this.participantStats.clear();
        this.processedReports = [];

        this.parseEvents(data);
        this.displayResults();
        this.displayReports();

        this.underwaterParser.parse(data);
        this.underwaterParser.display();
    }

    parseEvents(data) {
        const lines = data.split('\n');

        let currentEvent = [];
        let inValidEvent = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (
                line.startsWith('Заплыв на дно') ||
                line.startsWith('Котячий заплыв')
            ) {
                if (currentEvent.length > 0) {
                    const eventText = currentEvent.join('\n');

                    if (this.isValidEvent(eventText)) {
                        this.processedReports.push(eventText);
                        this.parseEvent(eventText);
                    }
                }

                currentEvent = [line];
                inValidEvent = true;

            } else if (inValidEvent) {
                const isNewReport = line.match(/^#\d+\s/);

                if (isNewReport && currentEvent.length > 0) {
                    const eventText = currentEvent.join('\n');

                    if (this.isValidEvent(eventText)) {
                        this.processedReports.push(eventText);
                        this.parseEvent(eventText);
                    }

                    currentEvent = [line];

                } else {
                    currentEvent.push(line);
                }
            }
        }

        if (currentEvent.length > 0) {
            const eventText = currentEvent.join('\n');

            if (this.isValidEvent(eventText)) {
                this.processedReports.push(eventText);
                this.parseEvent(eventText);
            }
        }
    }

    isValidEvent(eventText) {
        const lines = eventText
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean);

        if (lines.length === 0) {
            return false;
        }

        const header = lines[0];

        if (header.startsWith('Заплыв на дно')) {
            const hasConductor = lines.some(
                line => line.includes('Проводящий:')
            );

            const hasParticipants = lines.some(
                line => line.includes('Участники:')
            );

            return hasConductor && hasParticipants;
        }

        if (header.startsWith('Котячий заплыв')) {
            const hasConductors = lines.some(
                line => line.includes('Сопровождающие:')
            );

            const hasParticipants = lines.some(
                line => line.includes('Участники:')
            );

            return hasConductors && hasParticipants;
        }

        return false;
    }

    parseEvent(eventText) {
        const lines = eventText
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean);

        const header = lines[0];

        if (header.startsWith('Котячий заплыв')) {
            this.parseCatSwim(lines);
            return;
        }

        if (header.startsWith('Заплыв на дно')) {
            this.parseRegularSwim(lines);
            return;
        }
    }

    parseRegularSwim(lines) {
        const processedInThisEvent = new Set();

        lines.forEach(line => {
            if (line.includes('|') && !line.includes(':')) {
                return;
            }

            if (line.includes(':')) {
                const colonIndex = line.indexOf(':');

                const roleType = line
                    .substring(0, colonIndex)
                    .trim();

                const participantsText = line
                    .substring(colonIndex + 1)
                    .trim();

                const isConductor = roleType === 'Проводящий';

                this.parseParticipants(
                    participantsText,
                    isConductor,
                    processedInThisEvent
                );
            }
        });
    }

    parseCatSwim(lines) {
        const processedInThisEvent = new Set();

        let conductors = [];
        let participants = [];

        lines.forEach(line => {
            if (!line.includes(':')) {
                return;
            }

            const [role, participantsText] = line
                .split(':')
                .map(s => s.trim());

            if (role === 'Сопровождающие') {
                conductors = participantsText
                    .split(',')
                    .map(p => p.trim())
                    .filter(Boolean);
            }

            if (role === 'Участники') {
                participants = participantsText
                    .split(',')
                    .map(p => p.trim())
                    .filter(Boolean);
            }
        });

        conductors.forEach(conductor => {
            this.processKittenParticipant(
                conductor,
                true,
                processedInThisEvent
            );
        });

        participants.forEach(participant => {
            this.processKittenParticipant(
                participant,
                false,
                processedInThisEvent
            );
        });

        const participantCount = participants.length;

        conductors.forEach(conductor => {
            const lastSlashIndex = conductor.lastIndexOf('/');

            if (lastSlashIndex === -1) {
                return;
            }

            const name = conductor
                .substring(0, lastSlashIndex)
                .trim();

            const stats = this.participantStats.get(name);

            if (stats) {
                stats.kittenLedParticipants += participantCount;
            }
        });
    }

    parseParticipants(
        participantsText,
        isConductor = false,
        processedInThisEvent
    ) {
        const participants = participantsText.split(',');

        participants.forEach(participant => {
            participant = participant.trim();

            if (participant) {
                this.processParticipant(
                    participant,
                    isConductor,
                    processedInThisEvent
                );
            }
        });
    }

    processParticipant(
        participantText,
        isConductor = false,
        processedInThisEvent
    ) {
        const lastSlashIndex = participantText.lastIndexOf('/');

        if (lastSlashIndex === -1) {
            return;
        }

        // Имя игрока
        const name = participantText
            .substring(0, lastSlashIndex)
            .trim();

        // Всё после /
        // Например: 12345
        // или: 12345 (ИС)
        const idAndInfo = participantText
            .substring(lastSlashIndex + 1)
            .trim();

        // Извлекаем ID
        const idMatch = idAndInfo.match(/^(\d+)/);
        const playerId = idMatch ? idMatch[1] : '';

        // Дополнительная информация в скобках
        const hasAdditionalInfo = /\(.*\)/.test(idAndInfo);

        let additionalInfo = '';

        if (hasAdditionalInfo) {
            const match = idAndInfo.match(/\((.*?)\)/);

            additionalInfo = match
                ? match[1].trim()
                : '';
        }

        // Гостей не учитываем
        if (additionalInfo === 'гость') {
            return;
        }

        // Если игрок уже был обработан в этом событии
        if (processedInThisEvent.has(name)) {
            if (
                hasAdditionalInfo &&
                additionalInfo !== 'гость'
            ) {
                const stats = this.participantStats.get(name);

                if (additionalInfo === 'ИС') {
                    stats.participationsWithInfo += 1;
                } else {
                    stats.participationsWithInfo++;
                }
            }

            return;
        }

        processedInThisEvent.add(name);

        // Создаём статистику игрока
        if (!this.participantStats.has(name)) {
            this.participantStats.set(name, {
                playerId: playerId,

                totalConductions: 0,
                totalParticipations: 0,
                participationsWithInfo: 0,

                kittenConductions: 0,
                kittenParticipations: 0,
                kittenLedParticipants: 0
            });
        }

        const stats = this.participantStats.get(name);

        // Если ID появился позже — сохраняем его
        if (!stats.playerId && playerId) {
            stats.playerId = playerId;
        }

        // ИС
        if (additionalInfo === 'ИС') {
            stats.totalConductions += 0;
            stats.totalParticipations += 0;
            stats.participationsWithInfo += 1;

            return;
        }

        // Сбор заплыва
        if (isConductor) {
            stats.totalConductions += 1;
        } else {
            stats.totalConductions += 0;
        }

        // Посещение заплыва
        if (isConductor) {
            stats.totalParticipations += 0;
        } else {
            stats.totalParticipations += 1;
        }

        // Дополнительная информация
        if (
            hasAdditionalInfo &&
            additionalInfo !== 'ИС'
        ) {
            stats.participationsWithInfo++;
        }
    }

    processKittenParticipant(
        participantText,
        isKittenConductor,
        processedInThisEvent
    ) {
        const lastSlashIndex =
            participantText.lastIndexOf('/');

        if (lastSlashIndex === -1) {
            return;
        }

        // Имя
        const name = participantText
            .substring(0, lastSlashIndex)
            .trim();

        // ID
        const idAndInfo = participantText
            .substring(lastSlashIndex + 1)
            .trim();

        const idMatch = idAndInfo.match(/^(\d+)/);
        const playerId = idMatch ? idMatch[1] : '';

        // Не обрабатываем одного человека дважды
        if (processedInThisEvent.has(name)) {
            return;
        }

        processedInThisEvent.add(name);

        // Создаём статистику
        if (!this.participantStats.has(name)) {
            this.participantStats.set(name, {
                playerId: playerId,

                totalConductions: 0,
                totalParticipations: 0,
                participationsWithInfo: 0,

                kittenConductions: 0,
                kittenParticipations: 0,
                kittenLedParticipants: 0
            });
        }

        const stats = this.participantStats.get(name);

        // Если ID ещё не был сохранён
        if (!stats.playerId && playerId) {
            stats.playerId = playerId;
        }

        // Сопровождающий
        if (isKittenConductor) {
            stats.kittenConductions += 1;
        }

        // Участник
        else {
            stats.kittenParticipations += 1;
        }
    }

    displayResults() {
        const tableBody =
            document.querySelector('#resultsTable tbody');

        tableBody.innerHTML = '';

        if (this.participantStats.size === 0) {
            const row = tableBody.insertRow();
            const cell = row.insertCell();

            cell.colSpan = 9;
            cell.className = 'empty-state';
            cell.textContent =
                'Нет данных для отображения';

            return;
        }

        const sortedParticipants =
            Array.from(this.participantStats.entries())
                .sort((a, b) =>
                    a[0].localeCompare(b[0])
                );

        sortedParticipants.forEach(([name, stats]) => {
            const row = tableBody.insertRow();

            const checkCell = row.insertCell();

            checkCell.classList.add('check-column');

            const checkbox =
                document.createElement('input');

            checkbox.type = 'checkbox';
            checkbox.className = 'row-check';
            checkbox.title =
                'Отметить как просмотренное';

            checkbox.addEventListener('change', () => {
                row.classList.toggle(
                    'row-checked',
                    checkbox.checked
                );
            });

            checkCell.appendChild(checkbox);

            const nameCell = row.insertCell();

            nameCell.textContent = name;

            const idCell = row.insertCell();

            idCell.textContent =
                stats.playerId || '';

            idCell.classList.add(
                'player-id-column'
            );

            const baCell = row.insertCell();

            baCell.textContent =
                stats.totalConductions

            const bmCell = row.insertCell();

            bmCell.textContent =
                stats.totalParticipations

            const ksCell = row.insertCell();

            ksCell.textContent =
                stats.kittenConductions

            const klCell = row.insertCell();

            klCell.textContent =
                stats.kittenLedParticipants

            const kpCell = row.insertCell();

            kpCell.textContent =
                stats.kittenParticipations

            const isCell = row.insertCell();

            isCell.textContent =
                stats.participationsWithInfo;
        });

        this.togglePlayerIdColumn();
    }

    togglePlayerIdColumn() {
        const checkbox =
            document.getElementById('showPlayerId');

        const showId =
            checkbox ? checkbox.checked : true;

        document
            .querySelectorAll('.player-id-column')
            .forEach(cell => {
                cell.style.display =
                    showId ? '' : 'none';
            });
    }

    displayReports() {
        const reportsContainer =
            document.getElementById('reportsContent');

        if (this.processedReports.length === 0) {
            reportsContainer.textContent =
                'Нет обработанных отчётов';

            return;
        }

        reportsContainer.textContent =
            this.processedReports.join('\n\n');
    }

    clearData() {
        document.getElementById('eventData').value = '';

        document.querySelector(
            '#resultsTable tbody'
        ).innerHTML = '';

        this.participantStats.clear();
        this.processedReports = [];

        document.getElementById(
            'reportsContent'
        ).textContent =
            'Нет обработанных отчётов';

        this.underwaterParser.clear();

        const tableBody =
            document.querySelector(
                '#resultsTable tbody'
            );

        const row = tableBody.insertRow();

        const cell = row.insertCell();

        cell.colSpan = 9;
        cell.className = 'empty-state';

        cell.textContent =
            'Введите данные о заплывах для получения статистики';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SwimEventParser();

    const tableBody =
        document.querySelector(
            '#resultsTable tbody'
        );

    const row = tableBody.insertRow();

    const cell = row.insertCell();

    cell.colSpan = 9;
    cell.className = 'empty-state';

    cell.textContent =
        'Введите данные о заплывах для получения статистики';
});
