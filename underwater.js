class UnderwaterHuntParser {
    constructor() {
        this.hunters = new Map();
    }

    parse(data) {
        this.hunters.clear();

        const lines = data.split('\n');

        let currentHunter = null;
        let currentReportActive = false;

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            const line = rawLine.trim();

            if (line.startsWith('Подводная охота')) {
                currentReportActive = true;
                currentHunter = null;
                continue;
            }

            if (this.isOtherReportStart(line)) {
                currentReportActive = false;
                currentHunter = null;
                continue;
            }

            if (!currentReportActive) {
                continue;
            }

            if (line.startsWith('Охотник:')) {
                const hunterText = line
                    .substring('Охотник:'.length)
                    .trim();

                const lastSlashIndex = hunterText.lastIndexOf('/');

                if (lastSlashIndex === -1) {
                    continue;
                }

                const name = hunterText
                    .substring(0, lastSlashIndex)
                    .trim();

                const idRaw = hunterText
                    .substring(lastSlashIndex + 1)
                    .trim();

                const idMatch = idRaw.match(/^(\d+)/);
                const playerId = idMatch ? idMatch[1] : '';

                if (!name || !playerId) {
                    continue;
                }

                currentHunter = { name, playerId };

                // Создаём запись игрока, если её ещё нет
                if (!this.hunters.has(playerId)) {
                    this.hunters.set(playerId, {
                        name: name,
                        playerId: playerId,
                        finds: []
                    });
                }

                continue;
            }

            if (line.startsWith('Находка:') && currentHunter) {
                const findText = line
                    .substring('Находка:'.length)
                    .trim();

                if (findText) {
                    const hunterStats = this.hunters.get(currentHunter.playerId);

                    if (hunterStats) {
                        hunterStats.finds.push(findText);
                    }
                }

                continue;
            }
        }
    }

    isOtherReportStart(line) {
        const otherReports = [
            'Помощь с нырком',
            'Котячий заплыв',
            'Заплыв на дно',
            'Пробный заплыв',
            'Прокачка ПУ',
            'Чистка'
        ];

        return otherReports.some(report => line.startsWith(report));
    }

    display() {
        const container = document.getElementById('underwaterContent');

        if (!container) {
            return;
        }

        container.innerHTML = '';

        if (this.hunters.size === 0) {
            const empty = document.createElement('div');

            empty.className = 'empty-state';
            empty.textContent = 'Нет данных о подводной охоте';

            container.appendChild(empty);

            return;
        }

        const sortedHunters = Array.from(this.hunters.values())
            .sort((a, b) => a.name.localeCompare(b.name));

        sortedHunters.forEach(hunter => {
            const card = document.createElement('div');

            card.className = 'underwater-card';

            const checkbox = document.createElement('input');

            checkbox.type = 'checkbox';
            checkbox.className = 'underwater-check';
            checkbox.title = 'Отметить как зачтённое';

            checkbox.addEventListener('change', () => {
                card.classList.toggle('row-checked', checkbox.checked);
            });

            const body = document.createElement('div');

            body.className = 'underwater-card-body';

            const nameDiv = document.createElement('div');

            nameDiv.className = 'underwater-card-name';

            const nameText = document.createTextNode(hunter.name);

            nameDiv.appendChild(nameText);

            const idSpan = document.createElement('span');

            idSpan.className = 'player-id';
            idSpan.textContent = `/ ${hunter.playerId}`;

            nameDiv.appendChild(idSpan);

            const findsDiv = document.createElement('div');

            findsDiv.className = 'underwater-card-finds';
            findsDiv.textContent = hunter.finds.join(', ');

            body.appendChild(nameDiv);
            body.appendChild(findsDiv);

            card.appendChild(checkbox);
            card.appendChild(body);

            container.appendChild(card);
        });
    }

    clear() {
        this.hunters.clear();

        const container = document.getElementById('underwaterContent');

        if (container) {
            container.innerHTML = '';

            const empty = document.createElement('div');

            empty.className = 'empty-state';
            empty.textContent = 'Нет данных о подводной охоте';

            container.appendChild(empty);
        }
    }
}