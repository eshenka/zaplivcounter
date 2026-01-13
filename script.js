class SwimEventParser {
    constructor() {
        this.participantStats = new Map();
        this.init();
    }

    init() {
        const processBtn = document.getElementById('processBtn');
        const clearBtn = document.getElementById('clearBtn');
        const activityWeekCheckbox = document.getElementById('activityWeek');
        
        processBtn.addEventListener('click', () => this.processData());
        clearBtn.addEventListener('click', () => this.clearData());
        
        activityWeekCheckbox.addEventListener('change', () => {
            if (this.participantStats.size > 0) {
                this.displayResults();
            }
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
        this.parseEvents(data);
        this.displayResults();
    }

    parseEvents(data) {
        const events = data.split(/\n\s*\n|\n(?=\w+[^:]*\|)/);
        
        events.forEach(event => {
            if (event.trim()) {
                this.parseEvent(event.trim());
            }
        });
    }

    parseEvent(eventText) {
        const lines = eventText.split('\n').map(l => l.trim()).filter(Boolean);
        const header = lines[0];

        if (header.startsWith('Котячий заплыв')) {
            this.parseCatSwim(lines);
            return;
        }

        this.parseRegularSwim(lines);
    }

    parseRegularSwim(lines) {
        const processedInThisEvent = new Set();

        lines.forEach(line => {
            if (line.includes('|') && !line.includes(':')) return;

            if (line.includes(':')) {
                const colonIndex = line.indexOf(':');
                const roleType = line.substring(0, colonIndex).trim();
                const participantsText = line.substring(colonIndex + 1).trim();

                const isConductor = roleType === 'Проводящий';
                const isKittenConductor = roleType === 'Сопровождающий';
                this.parseParticipants(participantsText, isConductor, processedInThisEvent);
            }
        });
    }

    parseCatSwim(lines) {
        const processedInThisEvent = new Set();

        lines.forEach(line => {
            if (!line.includes(':')) return;

            const [role, participantsText] = line.split(':').map(s => s.trim());

            if (role === 'Сопровождающие') {
                this.parseKittenParticipants(
                    participantsText,
                    true,
                    processedInThisEvent
                );
            }

            if (role === 'Участники') {
                this.parseKittenParticipants(
                    participantsText,
                    false,
                    processedInThisEvent
                );
            }
        });
    }

    parseParticipants(participantsText, isConductor = false, processedInThisEvent) {
        const participants = participantsText.split(',');
        
        participants.forEach(participant => {
            participant = participant.trim();
            if (participant) {
                this.processParticipant(participant, isConductor, processedInThisEvent);
            }
        });
    }

    processParticipant(participantText, isConductor = false, processedInThisEvent) {
        const lastSlashIndex = participantText.lastIndexOf('/');
        if (lastSlashIndex === -1) return;
        
        let name = participantText.substring(0, lastSlashIndex).trim();
        const idAndInfo = participantText.substring(lastSlashIndex + 1).trim();
        
        const hasAdditionalInfo = /\(.*\)/.test(idAndInfo);
        let additionalInfo = '';
        if (hasAdditionalInfo) {
            const match = idAndInfo.match(/\((.*?)\)/);
            additionalInfo = match ? match[1].trim() : '';
        }
        
        if (additionalInfo === 'гость') {
            return;
        }
        
        if (processedInThisEvent.has(name)) {
            if (hasAdditionalInfo && additionalInfo !== 'гость') {
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
        
        if (!this.participantStats.has(name)) {
            this.participantStats.set(name, {
                totalConductions: 0,
                totalParticipations: 0,
                participationsWithInfo: 0,
                kittenConductions: 0,
                kittenParticipations: 0
            });
        }
        
        const stats = this.participantStats.get(name);
        
        if (additionalInfo === 'ИС') {
            stats.totalConductions += 0;
            stats.totalParticipations += 0;
            stats.participationsWithInfo += 1;
            return;
        }
        
        if (isConductor) {
            stats.totalConductions += 1;
        } else {
            stats.totalConductions += 0;
        }
        
        if (isConductor) {
            stats.totalParticipations += 0;
        } else {
            stats.totalParticipations += 1;
        }
        
        if (hasAdditionalInfo && additionalInfo !== 'ИС') {
            stats.participationsWithInfo++;
        }
    }

    processKittenParticipant(participantText, isKittenConductor, processedInThisEvent) {
        const lastSlashIndex = participantText.lastIndexOf('/');
        if (lastSlashIndex === -1) return;

        const name = participantText.substring(0, lastSlashIndex).trim();

        if (processedInThisEvent.has(name)) return;
        processedInThisEvent.add(name);

        if (!this.participantStats.has(name)) {
            this.participantStats.set(name, {
                totalConductions: 0,
                totalParticipations: 0,
                participationsWithInfo: 0,
                kittenConductions: 0,
                kittenParticipations: 0
            });
        }

        const stats = this.participantStats.get(name);

        if (isKittenConductor) {
            stats.kittenConductions += 1;
        } else {
            stats.kittenParticipations += 1;
        }
    }

    parseKittenParticipants(participantsText, isKittenConductor, processedInThisEvent) {
        const participants = participantsText.split(',');

        participants.forEach(p => {
            const participant = p.trim();
            if (participant) {
                this.processKittenParticipant(
                    participant,
                    isKittenConductor,
                    processedInThisEvent
                );
            }
        });
    }

    displayResults() {
        const tableBody = document.querySelector('#resultsTable tbody');
        tableBody.innerHTML = '';
        
        if (this.participantStats.size === 0) {
            const row = tableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 6;
            cell.className = 'empty-state';
            cell.textContent = 'Нет данных для отображения';
            return;
        }
        
        const activityWeekCheckbox = document.getElementById('activityWeek');
        const isActivityWeek = activityWeekCheckbox.checked;
        const multiplier = isActivityWeek ? 2 : 1;
        
        const sortedParticipants = Array.from(this.participantStats.entries())
            .sort((a, b) => a[0].localeCompare(b[0]));;
        
        sortedParticipants.forEach(([name, stats]) => {
            const row = tableBody.insertRow();
            
            const nameCell = row.insertCell();
            nameCell.textContent = name;
            
            const baCell = row.insertCell();
            baCell.textContent = stats.totalConductions * multiplier;
            
            const bmCell = row.insertCell();
            bmCell.textContent = stats.totalParticipations * multiplier;
            
            const ksCell = row.insertCell();
            ksCell.textContent = stats.kittenConductions * multiplier;

            const kpCell = row.insertCell();
            kpCell.textContent = stats.kittenParticipations * multiplier;

            const isCell = row.insertCell();
            isCell.textContent = stats.participationsWithInfo;
        });
    }

    clearData() {
        document.getElementById('eventData').value = '';
        document.querySelector('#resultsTable tbody').innerHTML = '';
        this.participantStats.clear();
        
        // Add empty state message
        const tableBody = document.querySelector('#resultsTable tbody');
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 6;
        cell.className = 'empty-state';
        cell.textContent = 'Введите данные о заплывах для получения статистики';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SwimEventParser();
    
    const tableBody = document.querySelector('#resultsTable tbody');
    const row = tableBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 6;
    cell.className = 'empty-state';
    cell.textContent = 'Введите данные о заплывах для получения статистики';
});