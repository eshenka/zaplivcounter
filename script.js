class SwimEventParser {
    constructor() {
        this.participantStats = new Map();
        this.processedReports = [];
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
        this.processedReports = [];
        this.parseEvents(data);
        this.displayResults();
        this.displayReports();
    }

    parseEvents(data) {
        const lines = data.split('\n');
        let currentEvent = [];
        let inValidEvent = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('Заплыв на дно') || line.startsWith('Котячий заплыв')) {
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
        const lines = eventText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return false;
        
        const header = lines[0];
        
        if (header.startsWith('Заплыв на дно')) {
            const hasConductor = lines.some(line => line.includes('Проводящий:'));
            const hasParticipants = lines.some(line => line.includes('Участники:'));
            return hasConductor && hasParticipants;
        }
        
        if (header.startsWith('Котячий заплыв')) {
            const hasConductors = lines.some(line => line.includes('Сопровождающие:'));
            const hasParticipants = lines.some(line => line.includes('Участники:'));
            return hasConductors && hasParticipants;
        }
        
        return false;
    }

    parseEvent(eventText) {
        const lines = eventText.split('\n').map(l => l.trim()).filter(Boolean);
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
            if (line.includes('|') && !line.includes(':')) return;

            if (line.includes(':')) {
                const colonIndex = line.indexOf(':');
                const roleType = line.substring(0, colonIndex).trim();
                const participantsText = line.substring(colonIndex + 1).trim();

                const isConductor = roleType === 'Проводящий';
                this.parseParticipants(participantsText, isConductor, processedInThisEvent);
            }
        });
    }

    parseCatSwim(lines) {
        const processedInThisEvent = new Set();

        let conductors = [];
        let participants = [];

        lines.forEach(line => {
            if (!line.includes(':')) return;

            const [role, participantsText] = line.split(':').map(s => s.trim());

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
            if (lastSlashIndex === -1) return;

            const name = conductor.substring(0, lastSlashIndex).trim();

            const stats = this.participantStats.get(name);

            if (stats) {
                stats.kittenLedParticipants += participantCount;
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
                kittenParticipations: 0,
                kittenLedParticipants: 0
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
                kittenParticipations: 0,
                kittenLedParticipants: 0
            });
        }

        const stats = this.participantStats.get(name);

        if (isKittenConductor) {
            stats.kittenConductions += 1;
        } else {
            stats.kittenParticipations += 1;
        }
    }

    displayResults() {
        const tableBody = document.querySelector('#resultsTable tbody');
        tableBody.innerHTML = '';
        
        if (this.participantStats.size === 0) {
            const row = tableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 7;
            cell.className = 'empty-state';
            cell.textContent = 'Нет данных для отображения';
            return;
        }
        
        const activityWeekCheckbox = document.getElementById('activityWeek');
        const isActivityWeek = activityWeekCheckbox.checked;
        const multiplier = isActivityWeek ? 2 : 1;
        
        const sortedParticipants = Array.from(this.participantStats.entries())
            .sort((a, b) => a[0].localeCompare(b[0]));
        
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

            const klCell = row.insertCell();
            klCell.textContent = stats.kittenLedParticipants * multiplier;

            const kpCell = row.insertCell();
            kpCell.textContent = stats.kittenParticipations * multiplier;

            const isCell = row.insertCell();
            isCell.textContent = stats.participationsWithInfo;
        });
    }

    displayReports() {
        const reportsContainer = document.getElementById('reportsContent');
        
        if (this.processedReports.length === 0) {
            reportsContainer.textContent = 'Нет обработанных отчётов';
            return;
        }
        
        reportsContainer.textContent = this.processedReports.join('\n\n');
    }

    clearData() {
        document.getElementById('eventData').value = '';
        document.querySelector('#resultsTable tbody').innerHTML = '';
        this.participantStats.clear();
        this.processedReports = [];
        
        document.getElementById('reportsContent').textContent = 'Нет обработанных отчётов';
        
        const tableBody = document.querySelector('#resultsTable tbody');
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 7;
        cell.className = 'empty-state';
        cell.textContent = 'Введите данные о заплывах для получения статистики';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SwimEventParser();
    
    const tableBody = document.querySelector('#resultsTable tbody');
    const row = tableBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 7;
    cell.className = 'empty-state';
    cell.textContent = 'Введите данные о заплывах для получения статистики';
});