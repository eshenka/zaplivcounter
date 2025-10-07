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
        const lines = eventText.split('\n');
        const processedInThisEvent = new Set();
        
        lines.forEach(line => {
            line = line.trim();
            
            if (line.includes('|') && !line.includes(':')) {
                return;
            }
            
            if (line.includes(':')) {
                const colonIndex = line.indexOf(':');
                const roleType = line.substring(0, colonIndex).trim();
                const participantsText = line.substring(colonIndex + 1).trim();
                
                const isConductor = roleType === 'Проводящий';
                this.parseParticipants(participantsText, isConductor, processedInThisEvent);
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
                totalParticipations: 0,
                bmPoints: 0,
                participationsWithInfo: 0,
                conductorBonus: 0
            });
        }
        
        const stats = this.participantStats.get(name);
        
        if (additionalInfo === 'ИС') {
            stats.totalParticipations += 0;
            stats.bmPoints += 0;
            stats.participationsWithInfo += 1;
            return;
        }
        
        if (isConductor) {
            stats.totalParticipations += 2;
        } else {
            stats.totalParticipations += 1;
        }
        
        if (isConductor) {
            stats.bmPoints += 1.5;
        } else {
            stats.bmPoints += 1;
        }
        
        if (hasAdditionalInfo && additionalInfo !== 'ИС') {
            stats.participationsWithInfo++;
        }
    }

    displayResults() {
        const tableBody = document.querySelector('#resultsTable tbody');
        tableBody.innerHTML = '';
        
        if (this.participantStats.size === 0) {
            const row = tableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 4;
            cell.className = 'empty-state';
            cell.textContent = 'Нет данных для отображения';
            return;
        }
        
        const activityWeekCheckbox = document.getElementById('activityWeek');
        const isActivityWeek = activityWeekCheckbox.checked;
        const multiplier = isActivityWeek ? 2 : 1;
        
        const sortedParticipants = Array.from(this.participantStats.entries())
            .sort((a, b) => (b[1].bmPoints * multiplier) - (a[1].bmPoints * multiplier));
        
        sortedParticipants.forEach(([name, stats]) => {
            const row = tableBody.insertRow();
            
            const nameCell = row.insertCell();
            nameCell.textContent = name;
            
            const baCell = row.insertCell();
            baCell.textContent = stats.totalParticipations * multiplier;
            
            const bmCell = row.insertCell();
            bmCell.textContent = stats.bmPoints * multiplier;
            
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
        cell.colSpan = 4;
        cell.className = 'empty-state';
        cell.textContent = 'Введите данные о заплывах для получения статистики';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SwimEventParser();
    
    const tableBody = document.querySelector('#resultsTable tbody');
    const row = tableBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 4;
    cell.className = 'empty-state';
    cell.textContent = 'Введите данные о заплывах для получения статистики';
});