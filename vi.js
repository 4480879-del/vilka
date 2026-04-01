    console.log("📻 VILKA RADIO V23");

    function showVilkaSplash() { const s = document.getElementById('vilka-splash-screen'); if (s) s.classList.remove('hidden'); }
    function hideVilkaSplash() { const s = document.getElementById('vilka-splash-screen'); if (s) s.classList.add('hidden'); }

    const pb = new PocketBase('https://db.sotka.one');
    pb.beforeSend = function (url, options) { url += (url.includes('?') ? '&' : '?') + 'nocache=' + Date.now(); return { url, options }; };

    const savedTheme = localStorage.getItem('sotka_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
	
class LiveBoardService {
    constructor(crm) {
        this.crm = crm;
        this.app = crm.app;
        this.activeSubscriptions = [];
        this.liveInterval = null;
        this.expandedRaceId = null;
        this.currentLiveBoard = [];
        this.currentLiveStartList = [];
        this.liveCurrentTab = 'start';
        this.liveSortMode = 'absolute';
        this.openedRaceName = "";
        this.openedRaceDate = "";
    }

    formatMs(ms) { 
        if (!ms) return '-'; 
        let d = new Date(Date.UTC(0,0,0,0,0,0,ms)); 
        let h = d.getUTCHours(); 
        let m = d.getUTCMinutes().toString().padStart(2,'0'); 
        let s = d.getUTCSeconds().toString().padStart(2,'0'); 
        let mi = Math.floor(d.getUTCMilliseconds() / 10).toString().padStart(2,'0'); 
        return h > 0 ? `${h}:${m}:${s}.${mi}` : `${m}:${s}.${mi}`; 
    }

    cleanupLiveBoard() {
        if (this.liveInterval) { clearInterval(this.liveInterval); this.liveInterval = null; }
        this.activeSubscriptions.forEach(sub => pb.collection(sub.collection).unsubscribe(sub.topic));
        this.activeSubscriptions = [];
    }

    closeLiveBoard() { 
        this.cleanupLiveBoard();
        this.expandedRaceId = null; 
        const modal = document.getElementById('liveBoardModal');
        if (modal) modal.style.display = 'none'; 
    }

    // 🔥 1. ЖЕСТКОЕ ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
    switchLiveTab(t) { 
        this.liveCurrentTab = t; 
        document.querySelectorAll('[onclick*="switchLiveTab"]').forEach(btn => {
            if (btn.getAttribute('onclick').includes(`'${t}'`) || btn.getAttribute('onclick').includes(`"${t}"`)) {
                btn.classList.add('active');
                btn.style.background = 'var(--primary)';
                btn.style.color = '#000000';
            } else {
                btn.classList.remove('active');
                btn.style.background = '';
                btn.style.color = '';
            }
        });
        this.renderLiveBoard(); 
    }

    // 🔥 2. ЖЕСТКОЕ ПЕРЕКЛЮЧЕНИЕ СОРТИРОВКИ
    switchLiveSort(s) { 
        this.liveSortMode = s; 
        document.querySelectorAll('[onclick*="switchLiveSort"]').forEach(btn => {
            if (btn.getAttribute('onclick').includes(`'${s}'`) || btn.getAttribute('onclick').includes(`"${s}"`)) {
                btn.classList.add('active');
                btn.style.background = 'var(--primary)';
                btn.style.color = '#000000';
            } else {
                btn.classList.remove('active');
                btn.style.background = '';
                btn.style.color = '';
            }
        });
        this.renderLiveBoard(); 
    }

    renderLiveRow(b, rank, maxLaps = 0, leaderSplits = []) {
        let rowBg = 'transparent';
        if (rank === 1) rowBg = 'rgba(253, 224, 71, 0.25)'; 
        else if (rank === 2) rowBg = 'rgba(192, 192, 192, 0.12)'; 
        else if (rank === 3) rowBg = 'rgba(253, 186, 116, 0.25)'; 

        let myLapTimes = Array.isArray(b.lapTimes) ? b.lapTimes : [];
        let lapColumns = "";
        let previousTime = 0;

        for (let i = 0; i < maxLaps; i++) {
            if (i < myLapTimes.length && myLapTimes[i]) {
                let myTime = myLapTimes[i];
                let lapSplit = myTime - previousTime;
                previousTime = myTime;
                let leaderSplit = leaderSplits[i] || 0;
                
                let myTimeStr = this.formatMs(myTime); 
                let lapSplitStr = this.formatMs(lapSplit);

                if (lapSplit === leaderSplit && leaderSplit > 0) {
                    lapColumns += `<td style="padding:8px; border:1px solid var(--border); vertical-align:top; font-family:'Roboto Mono'; font-size:11px; text-align:left;">
                        <div style="font-weight:bold; color:var(--primary);">LIDER</div>
                        <div style="color:var(--text-main);">${myTimeStr}</div>
                        <div style="font-size:9px; color:var(--text-muted);">${lapSplitStr}</div>
                    </td>`;
                } else {
                    let gap = lapSplit - leaderSplit;
                    lapColumns += `<td style="padding:8px; border:1px solid var(--border); vertical-align:top; font-family:'Roboto Mono'; font-size:11px; text-align:left;">
                        <div style="font-weight:bold; color:var(--text-main);">${myTimeStr}</div>
                        <div style="font-size:9px; color:var(--text-muted);">${lapSplitStr}</div>
                        <div style="font-size:9px; color:var(--text-muted);">+${this.formatMs(gap)}</div>
                    </td>`;
                }
            } else {
                lapColumns += `<td style="padding:8px; border:1px solid var(--border); text-align:center; color:var(--border);">—</td>`;
            }
        }

        return `<tr style="background:${rowBg}; border-bottom: 1px solid var(--border);">
            <td style="padding:10px; text-align:center; font-weight:800; color:var(--text-main);">${rank}</td>
            <td style="padding:10px; text-align:center; font-weight:800; color:var(--text-main);">${b.bib || '-'}</td>
            <td style="padding:10px; text-align:left;">
                <div style="font-weight:800; font-size:13px; color:var(--text-main);">${b.name} <span style="font-weight:400; color:var(--text-muted);">${b.yob || ''}</span></div>
                <div style="font-size:10px; color:var(--text-muted);">${b.team || '-'}</div>
            </td>
            <td style="padding:10px; text-align:center; font-weight:bold; color:var(--text-main);">${myLapTimes.length}</td>
            <td style="padding:10px; font-weight:800; color:var(--primary); font-family:'Roboto Mono'; text-align:left;">${b.timeStr || '-'}</td>
            <td style="padding:10px; font-family:'Roboto Mono'; font-size:11px; color:var(--text-muted); text-align:left;">${b.startTime || '-'}</td>
            ${lapColumns}
        </tr>`;
    }

    renderStartRow(r) { 
        let timeStr = (r.actualStart && r.actualStart !== '-') ? `<span style="color:var(--success); font-weight:bold;">${r.actualStart}</span>` : `<span style="color:var(--text-muted);">${r.plannedStart || '-'}</span>`; 
        return `<tr style="border-bottom: 1px solid var(--border);">
            <td style="padding:12px 10px; text-align:center; font-weight:bold; color:var(--text-main);">${r.bib || '-'}</td>
            <td style="padding:12px 10px; text-align:left;">
                <div style="font-weight:800; font-size:13px; color:var(--text-main);">${r.name}</div>
                <div style="font-size:10px; color:var(--text-muted);">${r.team || '-'}</div>
            </td>
            <td style="padding:12px 10px; text-align:center;"><span style="background:var(--bg-surface-hover); color:var(--text-main); padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700;">${r.group || '-'}</span></td>
            <td style="padding:12px 10px; text-align:right; font-family:'Roboto Mono';">${timeStr}</td>
        </tr>`; 
    }

    async openLiveBoard(raceId, event) { 
        if (event) event.stopPropagation(); 
        this.cleanupLiveBoard(); 
        this.expandedRaceId = raceId; 
        
        document.getElementById('liveBoardModal').style.display = 'flex'; 
        const titleEl = document.getElementById('liveBoardTitle');
        titleEl.innerText = "СИНХРОНИЗАЦИЯ...";

        try {
            const raceData = await pb.collection('races').getOne(raceId, { requestKey: null, fetchOptions: { cache: 'no-store' } }); 
            this.openedRaceName = raceData.name;
            this.openedRaceDate = new Date(raceData.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
            
            titleEl.innerHTML = `
                <div style="display:flex; align-items:center; gap:15px; width:100%;">
                    <div style="display:flex; flex-direction:column; gap:2px; text-align:left;">
                        <span style="font-size:18px; font-weight:800; text-transform:uppercase; line-height:1.2; color:var(--text-main);">${this.openedRaceName}</span>
                        <span style="font-size:11px; color:var(--text-muted); font-family:'Roboto Mono'; font-weight:normal;">${this.openedRaceDate}</span>
                    </div>
                    <button class="pdf-download-btn" onclick="window.app.crm.liveService.exportToPDF()" style="background:var(--bg-surface-hover); border:1px solid var(--border); color:var(--text-main); padding:8px 12px; border-radius:6px; cursor:pointer; font-family:'Unbounded'; font-size:10px; font-weight:800; display:flex; align-items:center; gap:8px; margin-left:auto; transition:0.2s;">
                        📥 PDF
                    </button>
                </div>
            `;

            const isFinished = raceData.status === 'Finished';
            document.getElementById('liveBoardDot').style.display = isFinished ? 'none' : 'block';

            const rosters = await pb.collection('race_rosters').getFullList({ filter: `race_id = "${raceId}" && status != "canceled"`, expand: 'rider_id,rider_id.team_id,gruppetto_id', requestKey: null });
            this.currentLiveStartList = rosters.map(r => {
                let rider = r.expand?.rider_id; if (!rider) return null;
                let tName = rider.expand?.team_id?.name || 'Без команды';
                if (r.expand?.gruppetto_id) tName = `${tName} [G: ${r.expand.gruppetto_id.name}]`;
                return { bib: r.bib || '-', name: rider.first_name + ' ' + rider.last_name, yob: rider.yob || '', team: tName, group: r.final_cluster || rider.base_cluster || 'B', plannedStart: r.planned_start || '', actualStart: r.actual_start || '' };
            }).filter(Boolean).sort((a,b) => (a.plannedStart || '').localeCompare(b.plannedStart || ''));

            let lbData = raceData.live_board || [];
            if (typeof lbData === 'string') lbData = JSON.parse(lbData);
            
            this.currentLiveBoard = lbData.map(lb => {
                if (typeof lb.lapTimes === 'string') lb.lapTimes = JSON.parse(lb.lapTimes);
                let match = this.currentLiveStartList.find(sl => String(sl.bib) === String(lb.bib));
                if (match) { lb.yob = match.yob; lb.startTime = match.actualStart || match.plannedStart || '-'; }
                return lb;
            });

            this.liveCurrentTab = (isFinished || raceData.status === 'LIVE') ? 'result' : 'start';
            this.switchLiveTab(this.liveCurrentTab);

            if (!isFinished) { 
                pb.collection('races').subscribe(raceId, (e) => { if (e.action === 'update') this.openLiveBoard(raceId); });
                this.activeSubscriptions.push({ collection: 'races', topic: raceId });
            }
        } catch(e) { console.error(e); }
    }

    renderLiveBoard() {
        let container = document.getElementById('liveBoardTable');
        let isAbs = this.liveSortMode === 'absolute';
        let board = this.liveCurrentTab === 'result' ? this.currentLiveBoard : this.currentLiveStartList;

        let maxLaps = 0;
        let leaderSplits = [];
        if (this.liveCurrentTab === 'result') {
            maxLaps = Math.max(0, ...board.map(b => Array.isArray(b.lapTimes) ? b.lapTimes.length : 0));
            for (let i = 0; i < maxLaps; i++) {
                let splits = board.map(b => {
                    let times = b.lapTimes || [];
                    if (times[i]) return times[i] - (i > 0 ? times[i-1] : 0);
                    return null;
                }).filter(t => t !== null && t > 0);
                leaderSplits[i] = splits.length ? Math.min(...splits) : 0;
            }
        }

        // 🔥 ОБЯЗАТЕЛЬНЫЙ id="mainLiveTable" для PDF!
        let html = `<div style="width:100%; overflow-x:auto; padding-bottom:20px;"><table id="mainLiveTable" style="width:100%; border-collapse:collapse; white-space:nowrap; font-family:'Manrope'; font-size:12px; color:var(--text-main);">`;

        if (this.liveCurrentTab === 'result') {
            html += `<thead style="background:var(--bg-surface); position:sticky; top:0; z-index:5; box-shadow: 0 2px 5px rgba(0,0,0,0.1);"><tr><th style="padding:10px;">МЕСТО</th><th style="padding:10px;">BIB</th><th style="text-align:left; padding:10px;">ФИО</th><th style="padding:10px;">КРУГИ</th><th style="text-align:left; padding:10px;">РЕЗУЛЬТАТ</th><th style="text-align:left; padding:10px;">СТАРТ</th>`;
            for(let i=1; i<=maxLaps; i++) html += `<th style="text-align:left; padding:10px;">${i}</th>`;
            html += `</tr></thead><tbody>`;
            
            if (board.length === 0) html += `<tr><td colspan="20" style="text-align:center; padding:40px; color:var(--text-muted);">Ожидание результатов...</td></tr>`;
            else {
                if (isAbs) {
                    board.forEach((b, i) => html += this.renderLiveRow(b, i+1, maxLaps, leaderSplits));
                } else {
                    let groups = [...new Set(board.map(b => b.category || "Без группы"))].sort();
                    groups.forEach(grp => {
                        html += `<tr class="live-group-header"><td colspan="${6 + maxLaps}" style="padding:10px 8px; background:var(--bg-surface-hover); color:var(--primary); font-weight:bold; border:1px solid var(--border); font-family:'Unbounded'; text-transform:uppercase; font-size:11px;">ГРУППА: ${grp}</td></tr>`;
                        let grpItems = board.filter(b => (b.category || "Без группы") === grp);
                        grpItems.forEach((b, i) => html += this.renderLiveRow(b, i+1, maxLaps, leaderSplits));
                    });
                }
            }
        } else {
            html += `<thead style="background:var(--bg-surface); position:sticky; top:0; z-index:5; box-shadow: 0 2px 5px rgba(0,0,0,0.1);"><tr><th style="padding:12px;">BIB</th><th style="text-align:left; padding:12px;">ФИО</th><th style="padding:12px;">КАТЕГОРИЯ</th><th style="padding:12px; text-align:right;">СТАРТ</th></tr></thead><tbody>`;
            if (board.length === 0) html += `<tr><td colspan="4" style="text-align:center; padding:40px; color:var(--text-muted);">Старт-лист пуст</td></tr>`;
            else {
                if (isAbs) {
                    board.forEach(r => html += this.renderStartRow(r));
                } else {
                    let groups = [...new Set(board.map(r => r.group || r.category || "Без группы"))].sort();
                    groups.forEach(grp => {
                        html += `<tr class="live-group-header"><td colspan="4" style="padding:10px 8px; background:var(--bg-surface-hover); color:var(--primary); font-weight:bold; border:1px solid var(--border); font-family:'Unbounded'; text-transform:uppercase; font-size:11px;">ГРУППА: ${grp}</td></tr>`;
                        let grpItems = board.filter(r => (r.group || r.category || "Без группы") === grp);
                        grpItems.forEach(r => html += this.renderStartRow(r));
                    });
                }
            }
        }
        
        html += `</tbody></table></div>`;
        container.innerHTML = html;
    }

    // 🔥 ФИНАЛЬНЫЙ ЭКСПОРТ (БЕЗ ПУСТОТЫ + АВТОМАСШТАБ ПО ШИРИНЕ)
    async exportToPDF() {
        if (!window.html2pdf) return alert("⏳ Библиотека PDF еще загружается...");
        
        const originalTable = document.getElementById('mainLiveTable');
        if (!originalTable) return alert("❌ Таблица протокола не найдена!");

        const btn = document.querySelector('.pdf-download-btn');
        const oldBtnHtml = btn ? btn.innerHTML : '';
        if (btn) btn.innerHTML = '⏳ ЖДИТЕ...';

        // 1. Создаем видимый слой ПОВЕРХ всего экрана (чтобы браузер его точно отрисовал)
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: #ffffff; z-index: 1000000; padding: 40px;
            display: flex; flex-direction: column; align-items: center;
            overflow-x: hidden; overflow-y: auto; box-sizing: border-box;
        `;
        
        // Добавляем индикатор для пользователя
        const loader = document.createElement('div');
        loader.innerHTML = '<h2 style="color:#000; font-family:sans-serif; margin-bottom:20px;">📄 ФОРМИРУЕМ ПРОТОКОЛ...</h2>';
        overlay.appendChild(loader);

        // 2. Создаем контейнер-лист внутри оверлея
        const printArea = document.createElement('div');
        // Вычисляем ширину: берем реальную ширину таблицы, но не меньше стандартного листа
        const tableWidth = originalTable.scrollWidth;
        const printWidth = Math.max(1100, tableWidth + 60); 
        
        printArea.style.cssText = `
            width: ${printWidth}px; background: white; color: black;
            font-family: sans-serif; text-align: left;
        `;

        // 3. Рисуем шапку
        printArea.innerHTML = `
            <div style="margin-bottom: 20px; border-bottom: 3px solid black; padding-bottom: 10px;">
                <h1 style="margin: 0; font-size: 28px; text-transform: uppercase;">${this.openedRaceName || 'ПРОТОКОЛ'}</h1>
                <p style="margin: 5px 0 0 0; font-size: 16px; color: #333;">Официальные результаты • ${this.openedRaceDate}</p>
            </div>
        `;

        // 4. Клонируем и чистим таблицу
        const tableClone = originalTable.cloneNode(true);
        tableClone.style.width = '100%';
        tableClone.style.borderCollapse = 'collapse';
        tableClone.style.fontSize = '12px';
        
        tableClone.querySelectorAll('th, td').forEach(el => {
            el.style.border = '1px solid #ccc';
            el.style.padding = '8px 10px';
            el.style.color = 'black';
            el.style.backgroundColor = 'white';
            el.style.whiteSpace = 'nowrap';
        });
        
        // Убираем мелкие подписи разрывов, если они мешают (опционально)
        tableClone.querySelectorAll('div').forEach(div => div.style.color = 'black');

        printArea.appendChild(tableClone);
        overlay.appendChild(printArea);
        document.body.appendChild(overlay);

        // 5. Даем браузеру 300мс "проморгаться" и отрисовать этот слой
        await new Promise(r => setTimeout(r, 300));

        // 6. Настройки генерации
        const opt = {
            margin:       10,
            filename:     `protocol_${this.openedRaceName}.pdf`,
            image:        { type: 'jpeg', quality: 1 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true, 
                width: printWidth + 80 // Захватываем всю ширину контейнера
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        // 7. Запускаем магию
        try {
            await html2pdf().set(opt).from(printArea).save();
        } catch (err) {
            console.error(err);
            alert("Ошибка при создании PDF");
        } finally {
            // Удаляем белый слой и возвращаем кнопку в норму
            document.body.removeChild(overlay);
            if (btn) btn.innerHTML = oldBtnHtml;
        }
    }
}

class PelotonCRM {
    constructor(app) {
        this.app = app; 
        this.currentView = 'calendar';
        this.dataCalendar = []; this.dataTeam = { m: [], f: [] }; 
        this.dataMarket = { m: [], f: [] }; this.dataRatings = [];
        
        this.currentTab = 'm'; 
        this.sort = { field: 'points', dir: 'desc' };
        this.searchQuery = "";
        
        this.viewedTeamId = null; 
        this.editIndex = null;    
        
        this.openedEventId = null;
        this.openedEventName = "";
        this.openedEventType = "";
        this.raceRosterList = [];

        // 🔥 ВОТ ОНО! Инициализируем наш новый независимый сервис трансляций:
        this.liveService = new LiveBoardService(this); 
    }
    
    // ==========================================
    // ⚡ ФАСАД ДЛЯ ТРАНСЛЯЦИЙ (Здесь больше нет дубликатов!)
    // ==========================================
    cleanupLiveBoard() { this.liveService.cleanupLiveBoard(); }
    closeLiveBoard() { this.liveService.closeLiveBoard(); }
    openLiveBoard(raceId, event) { this.liveService.openLiveBoard(raceId, event); }
    switchLiveTab(t) { this.liveService.switchLiveTab(t); }
    switchLiveSort(s) { this.liveService.switchLiveSort(s); }
    
    // ==========================================
    // БАЗОВЫЕ МЕТОДЫ CRM
    // ==========================================
    getSortedList(sourceData) {
        if (!sourceData) return [];
        let list = [...(sourceData[this.currentTab] || [])];
        if (this.searchQuery) { 
            const q = this.searchQuery.toLowerCase(); 
            list = list.filter(p => ((p.name || '').toLowerCase().includes(q)) || ((p.surname || '').toLowerCase().includes(q))); 
        }
        return list.sort((a, b) => { 
            let vA = a[this.sort.field], vB = b[this.sort.field]; 
            if (typeof vA === 'string') vA = vA.toLowerCase(); 
            if (typeof vB === 'string') vB = vB.toLowerCase(); 
            if (this.sort.field === 'points' || this.sort.field === 'year') { vA = Number(vA)||0; vB = Number(vB)||0; } 
            return vA < vB ? (this.sort.dir === 'asc' ? -1 : 1) : (vA > vB ? (this.sort.dir === 'asc' ? 1 : -1) : 0); 
        });
    }

    setTab(tab) { this.currentTab = tab; this.renderUI(); }
    setSearch(query) { 
        this.searchQuery = query; 
        this.renderUI(); 
        const input = document.getElementById('pelotonSearchInput');
        if (input) {
            input.focus();
            const len = input.value.length;
            input.setSelectionRange(len, len);
        }
    }
    setSort(field) { 
        if (this.sort.field === field) this.sort.dir = this.sort.dir === 'asc' ? 'desc' : 'asc'; 
        else { this.sort.field = field; this.sort.dir = (field === 'points') ? 'desc' : 'asc'; } 
        this.renderUI(); 
    }
    setCalendarFilter(type) { this.calendarFilter = type; this.renderUI(); }
    setTeamGenderFilter(gender) { this.teamGenderFilter = gender; this.renderUI(); }
    setTeamSearch(query) { this.teamSearchQuery = query.toLowerCase(); }
	setArchiveYear(year) { this.archiveYear = parseInt(year); this.renderUI(); }
	// 🔥 ФУНКЦИЯ: ДОБАВИТЬ/УБРАТЬ ИЗ ИЗБРАННОГО
    async toggleBookmark(raceId, event) {
        if (event) event.stopPropagation(); // Чтобы клик по звездочке не открывал саму гонку
        if (!this.app.currentRider) return;

        // Достаем массив закладок
        let bookmarks = this.app.currentRider.bookmarks || [];
        if (typeof bookmarks === 'string') { try { bookmarks = JSON.parse(bookmarks); } catch(e) { bookmarks = []; } }
        if (!Array.isArray(bookmarks)) bookmarks = [];

        // Добавляем или удаляем
        if (bookmarks.includes(raceId)) {
            bookmarks = bookmarks.filter(id => id !== raceId);
        } else {
            bookmarks.push(raceId);
        }

        // Оптимистично обновляем интерфейс
        this.app.currentRider.bookmarks = bookmarks;
        this.renderUI();

        // Отправляем в базу
        try {
            await pb.collection('riders').update(this.app.currentRider.id, { bookmarks: bookmarks }, { requestKey: null });
        } catch(e) {
            console.error("Ошибка сохранения закладки:", e);
        }
    }

    switchView(view) {
        if (typeof this.cleanupLiveBoard === 'function') {
            this.cleanupLiveBoard();
        }
        const liveModal = document.getElementById('liveBoardModal');
        if (liveModal && liveModal.style.display === 'flex') {
            liveModal.style.display = 'none';
        }
        
        this.currentView = view;
        
        // 🔥 Обновляем иконку и текст в нашей новой красивой шапке справа
        const headerData = {
            'calendar': { icon: '📅', title: 'Календарь', sub: 'Гонки и тренировки' },
            'team': { icon: '👥', title: 'Моя команда', sub: 'Управление составом' },
            'market': { icon: '🔄', title: 'Трансферы', sub: 'Свободные агенты' },
            'rating': { icon: '🏆', title: 'Рейтинг', sub: 'Командный зачет' }
        };

        const hd = headerData[view];
        if (hd) {
            const hIcon = document.getElementById('crmHeaderAvatar');
            const hTitle = document.getElementById('crmHeaderTitle');
            const hSub = document.getElementById('crmHeaderSub');
            if (hIcon) hIcon.innerText = hd.icon;
            if (hTitle) hTitle.innerText = hd.title.toUpperCase();
            if (hSub) hSub.innerText = hd.sub;
        }

        // Перерисовываем левое меню, чтобы активная желтая полоска перепрыгнула на нужный пункт
        if (this.app && typeof this.app.renderPelotonsTab === 'function') {
            this.app.renderPelotonsTab();
        }

        // Грузим сам контент раздела
        this.loadData();
        
        // 🔥 Умное поведение для мобилок: открываем правую панель
        const ws = document.getElementById('pelotonWorkspace');
        if (ws && window.innerWidth <= 768) {
            ws.classList.add('mobile-open');
        }
    }

    async loadData() {
        const contentArea = document.getElementById('crmContentArea');
        if(!contentArea) return;
        contentArea.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;"><div class="spinner" style="width:40px; height:40px; border-width:4px; display:inline-block; border-color: var(--primary) transparent transparent transparent;"></div><div style="margin-top:15px; font-family:'Unbounded'; font-size:12px; color:var(--text-muted); font-weight:800;">СИНХРОНИЗАЦИЯ...</div></div>`;
        const currentFilterId = this.app.currentPelotonFilter || 'all';

        try {
            if (this.currentView === 'calendar') {
                let records = await pb.collection('races').getFullList({ sort: 'date', expand: 'race_type_id, creator_id, team_id', requestKey: null });
                let allRosters = [];
                try { allRosters = await pb.collection('race_rosters').getFullList({ fields: 'race_id,rider_id,status', requestKey: null }); } catch(e) {}
                
                const myTeamId = this.app.currentRider?.team_id;
                const myId = this.app.currentRider?.id;
                const roles = this.app.usersMap[this.app.currentRider?.email] || [];
                const isSuper = JSON.stringify(roles).includes('superadmin');

                records = records.filter(r => {
                    if (isSuper) return true; 
                    const amIRegistered = allRosters.some(roster => roster.race_id === r.id && roster.rider_id === myId && roster.status !== 'canceled');
                    if (amIRegistered) return true;
                    if (r.level === 'team') {
                        if (r.is_public) return true; 
                        return r.team_id === myTeamId; 
                    }
                    if (r.level === 'personal') return r.creator_id === myId; 
                    return true; 
                });

                if (currentFilterId !== 'all') {
                    records = records.filter(r => {
                        let pId = r.peloton_id; 
                        if (!pId) return false; 
                        if (Array.isArray(pId)) return pId.includes(currentFilterId); 
                        return pId === currentFilterId;
                    });
                }

                const rosterCounts = {};
                allRosters.forEach(r => {
                    if (r.status !== 'canceled') rosterCounts[r.race_id] = (rosterCounts[r.race_id] || 0) + 1;
                });

                this.dataCalendar = records.map(r => ({ 
                    id: r.id, 
                    name: r.name, 
                    rawDate: r.date, 
                    date: new Date(r.date).toLocaleString('ru-RU', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}), 
                    level: r.level || 'personal', 
                    is_public: r.is_public || false, 
                    distance: r.distance || 0, 
                    type: r.expand?.race_type_id?.name || 'Заезд', 
                    status: r.status, 
                    org: r.expand?.creator_id?.name || 'Организатор', 
                    creator_id: r.creator_id, 
                    expand: r.expand, 
                    rosterCount: rosterCounts[r.id] || 0,
                    // 🔥 Добавляем флаг: зарегистрирован ли я на эту гонку
                    isRegistered: allRosters.some(roster => roster.race_id === r.id && roster.rider_id === myId && roster.status !== 'canceled') 
                }));
            } 
            else if (this.currentView === 'team') {
                let targetTeamId = this.viewedTeamId || this.app.currentRider?.team_id;
                if (targetTeamId) {
                    const records = await pb.collection('riders').getFullList({ filter: `team_id = "${targetTeamId}"`, sort: '-rating', requestKey: null }); 
                    let m = [], f = [];
                    records.forEach(r => { 
                        const gStr = String(r.gender || 'M').toUpperCase().trim(); 
                        const p = { id: r.id, name: r.first_name, surname: r.last_name, year: r.yob, gender: gStr, group: r.base_cluster || 'B', points: r.rating || 0 }; 
                        if (gStr === 'F' || gStr === 'Ж') f.push(p); else m.push(p); 
                    }); 
                    this.dataTeam = { m, f };
                } else { this.dataTeam = { m: [], f: [] }; }
            }
            else if (this.currentView === 'market') {
                const oneTeam = Object.values(this.app.teamsMap).find(t => t.name && t.name.toUpperCase().includes('ONE TEAM'));
                const oneTeamId = oneTeam ? oneTeam.id : null;
                if (oneTeamId) {
                    const records = await pb.collection('riders').getFullList({ filter: `team_id = "${oneTeamId}"`, sort: '-rating', requestKey: null }); 
                    let m = [], f = [];
                    records.forEach(r => { 
                        const gStr = String(r.gender || 'M').toUpperCase().trim(); 
                        const p = { id: r.id, name: r.first_name, surname: r.last_name, year: r.yob, gender: gStr, group: r.base_cluster || 'B', points: r.rating || 0 }; 
                        if (gStr === 'F' || gStr === 'Ж') f.push(p); else m.push(p); 
                    }); 
                    this.dataMarket = { m, f };
                }
            }
            else if (this.currentView === 'rating') {
                let teams = await pb.collection('teams').getFullList({ sort: '-points', requestKey: null }); 
                if (currentFilterId !== 'all') {
                    teams = teams.filter(t => {
                        let pId = t.peloton_id; if (!pId) return false;
                        if (Array.isArray(pId)) return pId.includes(currentFilterId); return pId === currentFilterId;
                    });
                }
                this.dataRatings = teams.map(t => ({ id: t.id, name: t.name, points: t.points }));
            }
            this.renderUI();
        } catch(e) { contentArea.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--danger); font-family:'Unbounded';">ОШИБКА СЕТИ</div>`; }
    }

    renderUI() {
        const contentArea = document.getElementById('crmContentArea');
        let html = '';

        if (this.currentView === 'calendar') {
            const roles = this.app.usersMap[this.app.currentRider?.email] || [];
            const rStr = JSON.stringify(roles);
            const isAdmin = rStr.includes('admin') || rStr.includes('superadmin');
            const isCaptain = rStr.includes('captain');

            // 🔥 1. Вкладка по умолчанию теперь "ГОНКИ"
            this.calendarFilter = this.calendarFilter && this.calendarFilter !== 'all' ? this.calendarFilter : 'races';

            let subMenuHtml = `<div style="display:flex; gap:8px; margin-bottom: 20px; overflow-x:auto; scrollbar-width:none; padding-bottom:4px; -webkit-overflow-scrolling:touch;">`;
            if (isAdmin || isCaptain) {
                subMenuHtml += `<button style="background:var(--primary); color:#000; border:none; padding:8px 16px; border-radius:50px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; flex-shrink:0; transition:0.2s; box-shadow: 0 4px 10px rgba(255,193,7,0.3);" onclick="window.app.crm.openCreateEventModal()">+ СОЗДАТЬ</button>`;
                subMenuHtml += `<div style="width:1px; background:var(--border); margin:0 4px; flex-shrink:0;"></div>`;
            }

            // 🔥 ВКЛАДКИ
            const filters = [
                { id: 'races', name: 'ГОНКИ' },
                { id: 'team', name: 'КОМАНДНЫЕ' },
                { id: 'fav', name: '⭐ МОИ' }, // Переименовали
                { id: 'archive', name: '📦 АРХИВ' }
            ];

            filters.forEach(f => {
                const isActive = this.calendarFilter === f.id;
                const bg = isActive ? 'var(--text-main)' : 'transparent';
                const color = isActive ? 'var(--bg-body)' : 'var(--text-muted)';
                const border = isActive ? 'var(--text-main)' : 'var(--border)';
                subMenuHtml += `<button style="background:${bg}; color:${color}; border:1px solid ${border}; padding:8px 16px; border-radius:50px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; flex-shrink:0; transition:0.2s;" onclick="window.app.crm.setCalendarFilter('${f.id}')">${f.name}</button>`;
            });
            subMenuHtml += `</div>`;
            html += subMenuHtml;

            // 🔥 3. ЛОГИКА АРХИВА И ВЫБОР ГОДА
            const archiveEvents = this.dataCalendar.filter(ev => ev.status === 'Finished');
            let availableYears = [...new Set(archiveEvents.map(ev => new Date(ev.rawDate || ev.date).getFullYear()))].sort((a,b) => b - a);
            const currentRealYear = new Date().getFullYear();
            if (availableYears.length === 0) availableYears = [currentRealYear];
            if (!this.archiveYear) this.archiveYear = availableYears.includes(currentRealYear) ? currentRealYear : availableYears[0];

            if (this.calendarFilter === 'archive') {
                html += `
                <div style="margin-bottom: 25px;">
                    <select class="auth-input" style="width: auto; padding: 10px 20px; border-radius: 50px; background: var(--bg-surface-hover); border: 1px solid var(--primary); color: var(--primary); font-family: 'Unbounded'; font-size: 11px; font-weight: 800; cursor: pointer; outline: none; transition: 0.2s;" onchange="window.app.crm.setArchiveYear(this.value)">
                        ${availableYears.map(y => `<option value="${y}" ${this.archiveYear === y ? 'selected' : ''} style="background:var(--bg-body); color:var(--text-main);">СЕЗОН ${y}</option>`).join('')}
                    </select>
                </div>`;
            }

            // 🔥 УМНАЯ ФИЛЬТРАЦИЯ
            let eventsToRender = this.dataCalendar.filter(r => {
                const isFinished = r.status === 'Finished';
                
                if (this.calendarFilter === 'archive') {
                    if (!isFinished) return false;
                    return new Date(r.rawDate || r.date).getFullYear() === this.archiveYear;
                }
                
                // Скрываем все завершенные из актуальных вкладок
                if (isFinished) return false;

                if (this.calendarFilter === 'races') return r.level === 'peloton';
                if (this.calendarFilter === 'team') return r.level === 'team';
                
                // 🔥 НОВАЯ ЛОГИКА ВКЛАДКИ "МОИ"
                if (this.calendarFilter === 'fav') {
                    let bookmarks = this.app.currentRider?.bookmarks || [];
                    if (typeof bookmarks === 'string') { try { bookmarks = JSON.parse(bookmarks); } catch(e) { bookmarks = []; } }
                    if (!Array.isArray(bookmarks)) bookmarks = [];

                    const isBookmarked = bookmarks.includes(r.id);
                    const isMyRegistration = r.isRegistered;
                    const isCreator = r.creator_id === this.app.currentRider?.id;

                    return isBookmarked || isMyRegistration || isCreator;
                }
                return true;
            });

            // 🔥 5. СОРТИРОВКА (Архив от новых к старым, остальное хронологически)
            if (this.calendarFilter === 'archive') {
                eventsToRender.sort((a, b) => new Date(b.rawDate || b.date) - new Date(a.rawDate || a.date)); // По убыванию
            } else {
                eventsToRender.sort((a, b) => new Date(a.rawDate || a.date) - new Date(b.rawDate || b.date)); // По возрастанию
            }

            // 🔥 6. ГРУППИРОВКА И ОТРИСОВКА ПО МЕСЯЦАМ
            if (eventsToRender.length === 0) { 
                html += '<div style="text-align:center; padding:60px; color:var(--text-muted); font-family:\'Unbounded\'; border: 1px dashed var(--border); border-radius: 20px;">СОБЫТИЙ НЕ НАЙДЕНО</div>'; 
            } else {
                let currentMonth = '';
                let gridOpen = false;

                eventsToRender.forEach(r => {
                    let dObj = new Date(r.rawDate || r.date);
                    let monthName = dObj.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).toUpperCase();
                    
                    // Вставляем разделитель месяца
                    if (monthName !== currentMonth) {
                        if (gridOpen) { html += '</div>'; gridOpen = false; } // Закрываем предыдущую сетку
                        html += `<div style="font-family:'Unbounded'; font-weight:800; font-size:14px; color:var(--text-main); margin: 30px 0 15px 0; display:flex; align-items:center; gap:10px; opacity: 0.9;"><span style="display:inline-block; width:8px; height:8px; background:var(--primary); border-radius:50%; box-shadow: 0 0 10px var(--primary);"></span>${monthName}</div>`;
                        currentMonth = monthName;
                    }

                    if (!gridOpen) { html += '<div class="p-calendar-grid">'; gridOpen = true; } // Открываем новую сетку

                    // === ТВОЙ ОРИГИНАЛЬНЫЙ КОД КАРТОЧКИ ГОНКИ ===
                    let day = dObj.getDate();
                    let month = dObj.toLocaleString('ru-RU', { month: 'short' }).replace('.', '').toUpperCase();
                    let year = dObj.getFullYear();
                    let time = dObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    
                    let lvlTag = '';
                    if (r.level === 'peloton') lvlTag = `<span class="p-race-tag tag-peloton">ОФИЦИАЛЬНО</span>`;
                    else if (r.level === 'team') {
                        if (r.is_public) lvlTag = `<span class="p-race-tag" style="background:rgba(59,130,246,0.1); color:var(--info); border:1px solid var(--info);">ОТКРЫТАЯ КОМАНДНАЯ</span>`;
                        else lvlTag = `<span class="p-race-tag tag-team">КОМАНДА</span>`;
                    }
                    else lvlTag = `<span class="p-race-tag tag-personal">ЛИЧНОЕ</span>`;

                    let org = r.org; if (r.level === 'team' && r.expand?.team_id) org = `<b style="color:var(--info);">${r.expand.team_id.name}</b>`;
                    
                    let primaryHtml = '';
                    if (r.status === 'LIVE') {
                        primaryHtml = `<button class="p-btn-black btn-live" onclick="window.app.openLiveBoard('${r.id}', event)" style="width:100%; margin:0;"><div style="width:6px; height:6px; background:currentColor; border-radius:50%; animation: dot-pulse 1s infinite; display:inline-block; vertical-align:middle; margin-right:5px;"></div>LIVE ПРОТОКОЛ</button>`; 
                    } else if (r.status === 'Finished') {
                        primaryHtml = `<button class="p-btn-black btn-res" onclick="window.app.openLiveBoard('${r.id}', event)" style="width:100%; margin:0;">РЕЗУЛЬТАТЫ</button>`; 
                    } else if (r.status === 'Registration') {
                        primaryHtml = `<button class="p-btn-black btn-reg" onclick="window.app.crm.openRaceRoster('${r.id}', '${this.app.escapeHTML(r.name)}', '${r.type}')" style="width:100%; margin:0;">УЧАСТНИКИ / ЗАЯВКА</button>`; 
                    } else {
                        primaryHtml = `<div style="text-align:center; width:100%; font-size:10px; font-family:'Unbounded'; color:var(--text-muted); font-weight:800; padding:12px 0;">${r.status}</div>`; 
                    }

                    const baseBtnStyle = "height:32px; border-radius:8px; font-family:'Unbounded', sans-serif; font-size:10px; font-weight:800; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:0.2s; box-sizing:border-box;";
                    const iconBtnStyle = baseBtnStyle + " width:32px; padding:0;";
                    const textBtnStyle = baseBtnStyle + " padding:0 12px; gap:6px;";

                    let judgeBtn = '';
                    const isManagerOrJudge = JSON.stringify(roles).includes('admin') || JSON.stringify(roles).includes('superadmin') || JSON.stringify(roles).includes('judge');
                    if (isManagerOrJudge && (r.status === 'LIVE' || r.status === 'Finished')) {
                        judgeBtn = `<button style="${textBtnStyle} background:rgba(255,193,7,0.1); color:var(--warning); border:1px solid rgba(255,193,7,0.3);" onclick="window.open('https://sotka.one/repult?race_id=${r.id}', '_blank')">⚖️ СУДИТЬ</button>`;
                    }

                    let chatBtn = '';
                    const raceChat = window.app.chats.find(c => c.race_id === r.id);
                    if (raceChat) {
                        chatBtn = `<button style="${textBtnStyle} background:rgba(59,130,246,0.1); color:var(--info); border:1px solid rgba(59,130,246,0.3);" onclick="window.app.switchTab('chats'); window.app.openChat('${raceChat.id}')">💬 ЧАТ</button>`;
                    }

                    let deleteBtn = ''; let editBtn = '';
                    const isCreator = r.creator_id === this.app.currentRider?.id;
                    if ((isAdmin || isCreator) && (r.status === 'Registration' || r.status === 'Скоро')) {
                        editBtn = `<button style="${iconBtnStyle} background:rgba(255,193,7,0.1); color:var(--warning); border:1px solid rgba(255,193,7,0.3); font-size:14px;" title="Редактировать гонку" onclick="window.app.crm.openEditEventModal('${r.id}')">✏️</button>`;
                        deleteBtn = `<button style="${iconBtnStyle} background:rgba(255,51,102,0.1); color:var(--danger); border:1px solid rgba(255,51,102,0.3); font-size:14px;" title="Удалить гонку" onclick="window.app.crm.deleteRace('${r.id}')">🗑️</button>`;
                    }

                    let inviteBtn = '';
                    const isMyTeamEvent = r.level === 'team' && this.app.currentRider?.team_id === r.team_id;
                    if ((r.level === 'personal' && isCreator) || (r.level === 'team' && (isCreator || isAdmin || (isCaptain && isMyTeamEvent)))) {
                        const inviteTextRaw = `Привет! Приглашаю на тренировку «${r.name}» (${r.date}). Жми кнопку, чтобы добавиться в старт-лист:\n\n[ACTION:REGISTER:${r.id}]`;
                        const safeInviteText = encodeURIComponent(inviteTextRaw);
                        inviteBtn = `<button style="${textBtnStyle} background:rgba(168,85,247,0.1); color:#a855f7; border:1px solid rgba(168,85,247,0.3);" title="Скопировать инвайт" onclick="window.app.copyText(decodeURIComponent('${safeInviteText}'), 'Ссылка скопирована! Отправьте её в любой чат VILKA.')">🔗 ПРИГЛАСИТЬ</button>`;
                    }

                    let secondaryHtml = '';
                    if (inviteBtn || chatBtn || judgeBtn || editBtn || deleteBtn) {
                        secondaryHtml = `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">${inviteBtn}${chatBtn}${judgeBtn}${editBtn}${deleteBtn}</div>`;
                    }

                    // 🔥 ЛОГИКА ЗВЕЗДОЧКИ (ИЗБРАННОЕ)
                    let bookmarks = this.app.currentRider?.bookmarks || [];
                    if (typeof bookmarks === 'string') { try { bookmarks = JSON.parse(bookmarks); } catch(e) { bookmarks = []; } }
                    const isBookmarked = Array.isArray(bookmarks) && bookmarks.includes(r.id);

                    // Если в избранном - закрашенная звезда, если нет - пустой контур
                    const starIcon = isBookmarked 
                        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--primary)" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>` 
                        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
                    
                    const starBtn = `<button onclick="window.app.crm.toggleBookmark('${r.id}', event)" style="background:none; border:none; cursor:pointer; color:var(--text-muted); padding:0; margin-right:8px; display:inline-flex; align-items:center; transition:0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" title="В избранное">${starIcon}</button>`;

                    // 🔥 ОБНОВЛЕННАЯ КАРТОЧКА (добавили ${starBtn} перед ${lvlTag})
                    html += `<div class="p-race-card"><div class="p-race-header"><div class="p-race-date"><div class="p-race-day">${day}</div><div class="p-race-month">${month} ${year}</div></div><div class="p-race-tags">${starBtn}<span class="p-race-tag tag-type">${r.type}</span></div></div><div class="p-race-body"><h3 class="p-race-title">${r.name}</h3><div class="p-race-org"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> ${org}</div><div class="p-race-meta"><div class="p-meta-item"><span class="p-meta-label">Старт</span><span class="p-meta-value">${time}</span></div><div class="p-meta-item"><span class="p-meta-label">Дистанция</span><span class="p-meta-value">${r.distance} км</span></div><div class="p-meta-item"><span class="p-meta-label">Заявки</span><span class="p-meta-value">${r.rosterCount} чел.</span></div></div></div><div class="p-race-footer" style="display:flex; flex-direction:column;">${primaryHtml}${secondaryHtml}</div></div>`;
                });
                
                if (gridOpen) html += '</div>'; // Закрываем последнюю сетку
            }
        } 
        else if (this.currentView === 'team') {
            // === ОСТАВЛЯЕМ КАК БЫЛО ===
            let targetTeamId = this.viewedTeamId || this.app.currentRider?.team_id;
            let adminBarHtml = '';
            const roles = this.app.usersMap[this.app.currentRider?.email] || [];
            const rStr = JSON.stringify(roles);
            const isAdmin = rStr.includes('admin') || rStr.includes('superadmin');
            const isJudge = rStr.includes('judge');
            const isManager = isAdmin || isJudge || (rStr.includes('captain') && this.app.currentRider?.team_id === targetTeamId);
            
            if (isAdmin || isJudge) {
                let tOpts = '<option value="" disabled selected>-- Выберите команду --</option>';
                Object.values(this.app.teamsMap).sort((a,b)=>a.name.localeCompare(b.name)).forEach(t => { const sel = (t.id === targetTeamId) ? 'selected' : ''; tOpts += `<option value="${t.id}" ${sel}>${t.name}</option>`; });
                let delBtn = isAdmin ? `<button onclick="window.app.deleteCurrentTeam()" class="admin-btn admin-btn-danger">Удалить</button>` : '';
                let capBtn = isAdmin ? `<button onclick="document.getElementById('captainModal').style.display='flex'" class="admin-btn admin-btn-secondary">Капитан</button>` : '';
                let createBtn = isAdmin ? `<button onclick="document.getElementById('createTeamModal').style.display='flex'" class="admin-btn admin-btn-primary">+ Команда</button>` : '';
                adminBarHtml = `<div class="admin-bar open"><div class="admin-bar-header" onclick="this.parentElement.classList.toggle('open')"><h3>УПРАВЛЕНИЕ КОМАНДАМИ</h3><span style="color:var(--primary);">▼</span></div><div class="admin-bar-content"><div class="admin-controls-row"><select class="admin-select" onchange="window.app.crm.adminSwitchTeam(this.value)">${tOpts}</select>${createBtn} ${capBtn} ${delBtn}</div></div></div>`;
            }

            const totalPoints = [...this.dataTeam.m, ...this.dataTeam.f].reduce((sum, r) => sum + r.points, 0);
            let chatBtn = targetTeamId ? `<button class="p-btn" style="background:rgba(255,193,7,0.1); color:var(--primary); border:1px dashed var(--primary); height:100%;" onclick="window.app.openChatForTeam('${targetTeamId}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> КАНАЛ КОМАНДЫ</button>` : '';
            
            html += adminBarHtml;

            const myTeamObj = Object.values(this.app.teamsMap).find(t => t.id === targetTeamId);
            const myTeamName = myTeamObj ? myTeamObj.name : "МОЯ КОМАНДА";

            const canRename = isAdmin || (rStr.includes('captain') && this.app.currentRider?.team_id === targetTeamId);
            let renameBtnHtml = canRename ? `
                <button onclick="window.app.crm.renameTeam('${targetTeamId}', '${myTeamName}')" style="background: transparent; border: none; cursor: pointer; color: var(--text-muted); font-size: 16px; transition: 0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'" title="Изменить название">
                    ✏️
                </button>` : '';

            html += `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 25px;">
                <h2 style="margin: 0; font-size: 22px; color: var(--text-main); font-family: 'Unbounded', sans-serif; text-transform: uppercase;">${myTeamName}</h2>
                ${renameBtnHtml}
            </div>`;
            
            html += `<div class="p-team-dashboard active"><div class="p-stat-card"><div class="p-stat-title">Рейтинг команды</div><div class="p-stat-value highlight">${totalPoints} pts</div></div><div class="p-stat-card"><div class="p-stat-title">Состав (М/Ж)</div><div class="p-stat-value">${this.dataTeam.m.length} / ${this.dataTeam.f.length}</div></div><div class="p-stat-card" style="background:transparent; border:none; padding:0; box-shadow:none;">${chatBtn}</div></div>`;

            this.teamGenderFilter = this.teamGenderFilter || 'all';
            this.teamSearchQuery = this.teamSearchQuery || '';

            let rosterControlsHtml = `<div style="display:flex; gap:8px; margin-bottom: 20px; overflow-x:auto; scrollbar-width:none; padding-bottom:4px; -webkit-overflow-scrolling:touch; align-items:center;">`;
            
            if (isManager) {
                rosterControlsHtml += `<button style="background:var(--primary); color:#000; border:none; padding:8px 16px; border-radius:50px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; flex-shrink:0; transition:0.2s; box-shadow: 0 4px 10px rgba(255,193,7,0.3);" onclick="document.getElementById('inlineAddRow').style.display='table-row'">+ ДОБАВИТЬ ГОНЩИКА</button>`;
                rosterControlsHtml += `<div style="width:1px; background:var(--border); margin:0 4px; flex-shrink:0; height:20px;"></div>`;
            }

            const filters = [
                { id: 'all', name: 'ВСЕ' },
                { id: 'M', name: 'МУЖЧИНЫ' },
                { id: 'F', name: 'ЖЕНЩИНЫ' }
            ];

            filters.forEach(f => {
                const isActive = this.teamGenderFilter === f.id;
                const bg = isActive ? 'var(--text-main)' : 'transparent';
                const color = isActive ? 'var(--bg-body)' : 'var(--text-muted)';
                const border = isActive ? 'var(--text-main)' : 'var(--border)';
                rosterControlsHtml += `<button style="background:${bg}; color:${color}; border:1px solid ${border}; padding:8px 16px; border-radius:50px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; flex-shrink:0; transition:0.2s;" onclick="window.app.crm.setTeamGenderFilter('${f.id}')">${f.name}</button>`;
            });

            rosterControlsHtml += `<div style="margin-left:auto; flex-shrink:0;"><input type="text" placeholder="Поиск гонщика..." value="${this.teamSearchQuery}" style="background:var(--bg-surface-hover); border:1px solid var(--border); color:var(--text-main); padding:8px 16px; border-radius:50px; font-family:'Manrope'; font-size:11px; outline:none; transition:0.2s; min-width:180px;" oninput="window.app.crm.setTeamSearch(this.value); window.app.crm.renderFilteredRosterTable();"></div>`;
            rosterControlsHtml += `</div>`;
            
            html += rosterControlsHtml;
            html += '<div id="teamRosterTableContainer"></div>';

            this.renderFilteredRosterTable = () => {
                const tableContainer = document.getElementById('teamRosterTableContainer');
                if (!tableContainer) return;

                let filteredRoster = [...this.dataTeam.m, ...this.dataTeam.f];
                
                if (this.teamGenderFilter === 'M') {
                    filteredRoster = this.dataTeam.m;
                } else if (this.teamGenderFilter === 'F') {
                    filteredRoster = this.dataTeam.f;
                }
                
                if (this.teamSearchQuery) {
                    const q = this.teamSearchQuery;
                    filteredRoster = filteredRoster.filter(r => ((r.name || '').toLowerCase().includes(q)) || ((r.surname || '').toLowerCase().includes(q)));
                }

                filteredRoster.sort((a, b) => { 
                    let vA = a[this.sort.field], vB = b[this.sort.field]; 
                    if (typeof vA === 'string') vA = vA.toLowerCase(); 
                    if (typeof vB === 'string') vB = vB.toLowerCase(); 
                    if (this.sort.field === 'points' || this.sort.field === 'year') { vA = Number(vA)||0; vB = Number(vB)||0; } 
                    return vA < vB ? (this.sort.dir === 'asc' ? -1 : 1) : (vA > vB ? (this.sort.dir === 'asc' ? 1 : -1) : 0); 
                });

                tableContainer.innerHTML = this.buildRosterTable(filteredRoster, false);
            };

            setTimeout(() => { if(typeof this.renderFilteredRosterTable === 'function') this.renderFilteredRosterTable(); }, 10);
        }
        else if (this.currentView === 'market') { 
            // === ОСТАВЛЯЕМ КАК БЫЛО ===
            html += this.buildControlsRow();
            html += this.buildRosterTable(this.getSortedList(this.dataMarket), true); 
        }
        else if (this.currentView === 'rating') {
            // === ОСТАВЛЯЕМ КАК БЫЛО ===
            html += `<div class="p-table-container"><table class="p-roster-table"><thead><tr><th style="width:40px;">#</th><th>Команда</th><th style="width:70px; text-align:right;">Очки</th></tr></thead><tbody>`;
            
            this.dataRatings.forEach((t, i) => { 
                const isMine = t.id === this.app.currentRider?.team_id; 
                const bg = isMine ? 'background:var(--bg-surface-hover);' : ''; 
                
                html += `<tr style="${bg} cursor:pointer; transition:0.2s;" onclick="window.app.crm.toggleTeamRoster('${t.id}')" onmouseover="this.style.backgroundColor='var(--bg-surface-hover)'" onmouseout="this.style.backgroundColor='${isMine ? 'var(--bg-surface-hover)' : 'transparent'}'" title="Нажмите, чтобы увидеть состав">
                    <td><b style="color:var(--text-muted); font-family:'Roboto Mono';">${i+1}</b></td>
                    <td style="max-width: 140px; width: 100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
                            <b style="color:var(--text-main); font-family:'Unbounded'; font-size:13px; text-transform:uppercase; overflow:hidden; text-overflow:ellipsis;">${t.name}</b> 
                            <span id="icon-roster-${t.id}" style="color:var(--text-muted); font-size:10px; flex-shrink:0;">▼</span>
                        </div>
                    </td>
                    <td style="text-align:right;"><b style="color:var(--primary); font-size: 15px; font-family:'Roboto Mono';">${t.points}</b></td>
                </tr>`; 

                let teamRiders = Object.values(this.app.ridersMap).filter(r => r.team_id === t.id && r.email !== 'bot@sotka.one');
                teamRiders.sort((a,b) => (b.rating || 0) - (a.rating || 0));

                let ridersHtml = '';
                if (teamRiders.length === 0) {
                    ridersHtml = `<div style="padding:15px; text-align:center; color:var(--text-muted); font-size:12px; font-family:'Unbounded';">СОСТАВ ПУСТ</div>`;
                } else {
                    ridersHtml = `<div style="padding: 10px; display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px;">`;
                    teamRiders.forEach((r, idx) => {
                        ridersHtml += `<div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-body); padding:8px 10px; border-radius:8px; border:1px solid var(--border);">
                            <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
                                <span style="color:var(--text-muted); font-size:10px; font-family:'Roboto Mono'; font-weight:bold; flex-shrink:0;">${idx+1}.</span>
                                <span style="font-size:12px; font-weight:600; color:var(--text-main); cursor:pointer; transition:0.2s; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-main)'" onclick="event.stopPropagation(); window.app.openProfile('${r.id}', event)">${r.first_name} ${r.last_name}</span>
                            </div>
                            <b style="color:var(--primary); font-size:13px; font-family:'Roboto Mono'; flex-shrink:0; margin-left:10px;">${r.rating || 0}</b>
                        </div>`;
                    });
                    ridersHtml += `</div>`;
                }

                html += `<tr id="row-roster-${t.id}" style="display:none; background:rgba(0,0,0,0.1);"><td colspan="3" style="padding:0; border-bottom:2px solid var(--primary);">${ridersHtml}</td></tr>`;
            });
            html += '</tbody></table></div>';
        }
        
        contentArea.innerHTML = html;
    }

    // ==========================================
    // УПРАВЛЕНИЕ КОМАНДОЙ (ОСТАЛЬНОЕ)
    // ==========================================
    toggleTeamRoster(teamId) {
        const row = document.getElementById(`row-roster-${teamId}`);
        const icon = document.getElementById(`icon-roster-${teamId}`);
        if (row) {
            if (row.style.display === 'none') {
                row.style.display = 'table-row';
                if (icon) icon.innerText = '▲';
            } else {
                row.style.display = 'none';
                if (icon) icon.innerText = '▼';
            }
        }
    }

    buildControlsRow(extraBtn = '') {
        const mClass = this.currentTab === 'm' ? 'active' : ''; const fClass = this.currentTab === 'f' ? 'active' : '';
        return `<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:16px;"><div style="display:flex; gap:10px; flex-wrap:wrap;"><div style="display:flex; gap:10px; background:var(--bg-surface); padding:4px; border-radius:50px; border:1px solid var(--border);"><button class="crm-tab-btn ${mClass}" style="padding:8px 16px; border:none;" onclick="window.app.crm.setTab('m')">Мужчины (M)</button><button class="crm-tab-btn ${fClass}" style="padding:8px 16px; border:none;" onclick="window.app.crm.setTab('f')">Женщины (F)</button></div>${extraBtn}</div><div style="flex:1; display:flex; justify-content:flex-end;"><input type="text" id="pelotonSearchInput" class="auth-input" style="width:100%; max-width:300px; margin:0; padding:10px 16px; border-radius:50px;" placeholder="Поиск гонщика..." value="${this.searchQuery}" oninput="window.app.crm.setSearch(this.value)"></div></div>`;
    }

    buildRosterTable(list, isMarket = false) {
        const roles = this.app.usersMap[this.app.currentRider?.email] || [];
        const rStr = JSON.stringify(roles);
        const targetTeamId = this.viewedTeamId || this.app.currentRider?.team_id;
        const isManager = rStr.includes('admin') || rStr.includes('superadmin') || rStr.includes('judge') || (rStr.includes('captain') && this.app.currentRider?.team_id === targetTeamId);
        const isMyCaptain = rStr.includes('captain') && this.app.currentRider?.team_id;

        const sortIcon = (field) => this.sort.field === field ? (this.sort.dir === 'asc' ? '<span style="color:var(--primary)">▲</span>' : '<span style="color:var(--primary)">▼</span>') : '';
        
        let html = `<div class="p-table-container"><table class="p-roster-table"><thead><tr><th style="width: 100px;">Действие</th><th style="cursor:pointer;" onclick="window.app.crm.setSort('name')">Спортсмен ${sortIcon('name')}</th><th style="cursor:pointer;" onclick="window.app.crm.setSort('year')">Г.Р. ${sortIcon('year')}</th><th style="cursor:pointer;" onclick="window.app.crm.setSort('group')">Кластер ${sortIcon('group')}</th><th style="cursor:pointer;" onclick="window.app.crm.setSort('points')">Рейт. ${sortIcon('points')}</th></tr></thead><tbody>`;

        if (isManager && !isMarket) {
            let clusterOpts = `<option value="B">B</option><option value="A+">A+</option><option value="A">A</option><option value="C">C</option><option value="D">D</option><option value="E">E</option><option value="V">V</option><option value="O">O</option>`;
            html += `<tr class="inline-add-row" id="inlineAddRow" style="display:none;"><td colspan="5" style="padding: 16px;"><div class="inline-form-grid"><div style="display:flex; gap:8px;"><button id="submitBtn" class="p-btn-black" style="padding:8px; width:100%; margin:0;" onclick="window.app.crm.submitForm()">СОХРАНИТЬ</button></div><div style="display:flex; gap:8px;"><input type="text" id="newName" class="inline-input" placeholder="Имя *"><input type="text" id="newSurname" class="inline-input" placeholder="Фамилия *"></div><input type="number" id="newYear" class="inline-input" placeholder="Год *"><div style="display:flex; gap:8px;"><select id="newGender" class="inline-input"><option value="M" ${this.currentTab === 'm' ? 'selected' : ''}>М</option><option value="F" ${this.currentTab === 'f' ? 'selected' : ''}>Ж</option></select><select id="newCluster" class="inline-input">${clusterOpts}</select></div><div style="font-family:'Roboto Mono'; font-weight:bold; color:var(--text-muted); text-align:center;">- pts</div></div></td></tr>`;
        }

        if (list.length === 0) {
            html += `<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--text-muted); font-family:'Unbounded'; font-size:12px;">СПИСОК ПУСТ</td></tr>`;
        } else {
            list.forEach(p => {
                const isMe = this.app.currentRider?.id === p.id;
                const meBadge = isMe ? `<span style="background:var(--primary); color:#000; font-size:9px; padding:2px 6px; border-radius:4px; font-family:'Unbounded'; font-weight:bold; margin-left:6px;">Я</span>` : '';
                const msgBtn = (!isMe) ? `<div class="msg-icon-btn" title="Написать" onclick="window.app.startDirectChat('${p.id}'); window.app.switchTab('chats');"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>` : '';
                
                let act = '<span style="color:var(--text-muted); font-size:10px;">-</span>';
                
                if (isMarket) {
                    if ((isMyCaptain || isManager) && !isMe) {
                        act = `<button class="p-btn-black" style="padding: 6px 12px; width: auto; font-size: 9px; background: rgba(0, 230, 118, 0.1); color: var(--success); border: 1px dashed var(--success);" onclick="window.app.inviteToTeam('${p.id}')">ПРИГЛАСИТЬ</button>`;
                    } else { act = '<span style="color:var(--success); font-size:10px; font-weight:bold;">СВОБОДЕН</span>'; }
                } else if (isManager) {
                    act = `<div style="display:flex; gap:8px;"><button class="btn-edit" onclick="window.app.crm.openEditModal('${p.id}')">✎</button><button class="btn-del" onclick="window.app.crm.removePlayer('${p.id}')">✕</button></div>`;
                }

                html += `<tr><td>${act}</td><td><div style="display:flex; align-items:center;"><div style="font-weight:600; font-size:14px; cursor:pointer; transition:0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-main)'" onclick="window.app.openProfile('${p.id}')">${p.name} ${p.surname}</div>${meBadge}${msgBtn}</div></td><td><span style="color:var(--text-muted); font-family:'Roboto Mono';">${p.year}</span></td><td><span style="background:var(--bg-body); border:1px solid var(--border); padding:4px 8px; border-radius:6px; font-size:11px; font-weight:600; font-family:'Roboto Mono';">${p.gender} • ${p.group}</span></td><td><b style="color:var(--primary); font-size:14px; font-family:'Roboto Mono';">${p.points}</b></td></tr>`;
            });
        }
        html += '</tbody></table></div>';
        return html;
    }

    adminSwitchTeam(teamId) { this.viewedTeamId = teamId; this.switchView('team'); }
    
    async submitForm() {
        const btn = document.getElementById('submitBtn'), name = document.getElementById('newName').value.trim(), surname = document.getElementById('newSurname').value.trim(), year = document.getElementById('newYear').value.trim(), gender = document.getElementById('newGender').value, cluster = document.getElementById('newCluster').value;
        if (!name || !surname || !year || !gender) return alert("Заполните: Имя, Фамилия, Год рождения и Пол");
        if (year.length !== 4 || isNaN(Number(year))) return alert("Введите корректный год рождения (4 цифры)");
        btn.disabled = true; btn.innerText = "⌛"; 
        try {
            const targetTeamId = this.viewedTeamId || this.app.currentRider?.team_id;
            const data = { first_name: name, last_name: surname, yob: Number(year), gender: gender, base_cluster: cluster, team_id: targetTeamId, rating: 0 };
            if (this.editIndex) { await pb.collection('riders').update(this.editIndex, data, { requestKey: null }); } 
            else { await pb.collection('riders').create(data, { requestKey: null }); }
            this.cancelInlineEdit(); this.loadData(); 
        } catch(e) { alert("Ошибка сохранения"); } finally { btn.disabled = false; btn.innerText = "СОХРАНИТЬ"; }
    }

    openEditModal(id) { 
        if (this.editIndex === id) { this.cancelInlineEdit(); return; }
        const p = this.getSortedList(this.dataTeam).find(x => x.id === id); if(!p) return; 
        
        const row = document.getElementById('inlineAddRow');
        if (row) row.style.display = 'table-row';

        this.editIndex = p.id; 
        document.getElementById('newName').value = p.name; document.getElementById('newSurname').value = p.surname; 
        document.getElementById('newYear').value = p.year; document.getElementById('newGender').value = p.gender === 'Ж' || p.gender === 'F' ? 'F' : 'M';
        document.getElementById('newCluster').value = p.group.replace(/[^A-Z+]/g, '') || 'B';
        
        const btn = document.getElementById('submitBtn');
        btn.style.background = "var(--text-main)"; btn.style.color = "var(--bg-body)"; btn.innerText = "ОБНОВИТЬ";
    }

    cancelInlineEdit() {
        this.editIndex = null; 
        document.getElementById('newName').value = ''; document.getElementById('newSurname').value = ''; document.getElementById('newYear').value = '';
        
        const btn = document.getElementById('submitBtn');
        btn.style.background = "var(--primary)"; btn.style.color = "#000"; btn.innerText = "СОХРАНИТЬ";

        const row = document.getElementById('inlineAddRow');
        if (row) row.style.display = 'none';
    }

    async removePlayer(riderId) { 
        if(!confirm("Исключить спортсмена из команды и вернуть в свободные агенты?")) return; 
        const oneTeam = Object.values(this.app.teamsMap).find(t => t.name && t.name.toUpperCase().includes('ONE TEAM'));
        const oneTeamId = oneTeam ? oneTeam.id : null;
        
        if(!oneTeamId) return alert("Не найдена системная база ONE TEAM"); 
        try { await pb.collection('riders').update(riderId, { team_id: oneTeamId, transfer_request: "" }, { requestKey: null }); this.loadData(); } 
        catch(e) { alert("Ошибка удаления"); } 
    }
    
    async renameTeam(teamId, currentName) {
        const roles = this.app.usersMap[this.app.currentRider?.email] || [];
        const rStr = JSON.stringify(roles);
        const isAdmin = rStr.includes('admin') || rStr.includes('superadmin');
        const isCaptain = rStr.includes('captain') && this.app.currentRider?.team_id === teamId;
        
        if (!isAdmin && !isCaptain) {
            return alert("❌ Только капитан или администратор может менять название команды!");
        }

        const newName = prompt("Введите новое название команды:", currentName);
        if (!newName || newName.trim() === "" || newName === currentName) return;
        
        try {
            await pb.collection('teams').update(teamId, { name: newName.trim() }, { requestKey: null });
            
            const teamChats = this.app.chats.filter(c => c.team_id === teamId && (c.type === 'team_channel' || c.type === 'team'));
            for (let chat of teamChats) {
                await pb.collection('chats').update(chat.id, { name: newName.trim() }, { requestKey: null });
            }

            alert("✅ Название команды и канала успешно изменено!");
            location.reload(); 
        } catch(e) {
            console.error(e);
            alert("❌ Ошибка при переименовании.");
        }
    }

    // ==========================================
    // ГОНКИ И КАЛЕНДАРЬ
    // ==========================================
    async openRaceRoster(raceId, raceName, raceType) {
        if (!raceName || raceName.trim() === '') {
            const cached = this.dataCalendar.find(r => r.id === raceId);
            if (cached) {
                raceName = cached.name;
            } else {
                try { 
                    const r = await pb.collection('races').getOne(raceId, {requestKey:null}); 
                    raceName = r.name; 
                } catch(e) { raceName = 'СОРЕВНОВАНИЕ'; }
            }
        }

        const ws = document.getElementById('pelotonWorkspace');
        if (ws) ws.classList.add('mobile-open');

        this.openedEventId = raceId; this.openedEventName = raceName; this.openedEventType = raceType || "";
        const contentArea = document.getElementById('crmContentArea');
        contentArea.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;"><div class="spinner" style="width:40px; height:40px; border-width:4px; display:inline-block; border-color: var(--primary) transparent transparent transparent;"></div></div>`;
        const roles = this.app.usersMap[this.app.currentRider?.email] || []; const rStr = JSON.stringify(roles);
        const currentRace = this.dataCalendar.find(r => r.id === raceId);
        let isOrganizer = false;
        if (rStr.includes('superadmin')) isOrganizer = true;
        if (currentRace) {
            let userPelotons = Array.isArray(this.app.currentRider.peloton_id) ? this.app.currentRider.peloton_id : [this.app.currentRider.peloton_id];
            if (rStr.includes('admin') && (userPelotons.includes(currentRace.peloton_id) || this.app.currentRider.id === currentRace.creator_id)) isOrganizer = true;
            if (currentRace.judge_id === this.app.currentRider.id || rStr.includes('judge')) isOrganizer = true; 
        }
        try {
            const rosters = await pb.collection('race_rosters').getFullList({ filter: `race_id = "${raceId}"`, expand: 'rider_id,rider_id.team_id,gruppetto_id', requestKey: null });
            let combinedList = [];
            
            if (isOrganizer) {
                rosters.forEach(r => {
                    let rider = r.expand?.rider_id; if (!rider) return;
                    let tName = rider.expand?.team_id?.name || 'Без команды';
                    if (r.expand?.gruppetto_id) tName = `${tName} <span style="color:#a855f7; font-weight:800; font-size:10px;">[G: ${r.expand.gruppetto_id.name}]</span>`;
                    let gender = String(rider.gender || 'M').toUpperCase().trim(); let catCode = rider.base_cluster || 'B';
                    combinedList.push({ id: rider.id, name: rider.first_name, surname: rider.last_name, year: rider.yob, gender: gender, group: catCode, points: rider.rating || 0, team: tName, teamId: rider.team_id, isRegistered: true, recordId: r.id, plannedStart: r.planned_start, bib: r.bib || "" });
                });
                if (this.app.currentRider?.team_id) {
                    const teamRiders = await pb.collection('riders').getFullList({ filter: `team_id = "${this.app.currentRider.team_id}"`, sort: '-rating', requestKey: null });
                    teamRiders.forEach(rider => {
                        if (!combinedList.find(x => x.id === rider.id)) {
                            let gender = String(rider.gender || 'M').toUpperCase().trim(); let catCode = rider.base_cluster || 'B';
                            combinedList.push({ id: rider.id, name: rider.first_name, surname: rider.last_name, year: rider.yob, gender: gender, group: catCode, points: rider.rating || 0, team: this.app.teamsMap[this.app.currentRider.team_id]?.name || "", teamId: rider.team_id, isRegistered: false, recordId: null, plannedStart: null, bib: "" });
                        }
                    });
                }
            } else if (rStr.includes('captain') && this.app.currentRider?.team_id) {
                const teamRiders = await pb.collection('riders').getFullList({ filter: `team_id = "${this.app.currentRider.team_id}"`, sort: '-rating', requestKey: null });
                teamRiders.forEach(rider => {
                    let gender = String(rider.gender || 'M').toUpperCase().trim(); let catCode = rider.base_cluster || 'B';
                    let reg = rosters.find(x => x.rider_id === rider.id);
                    let tName = this.app.teamsMap[this.app.currentRider.team_id]?.name || "";
                    if (reg && reg.expand?.gruppetto_id) tName = `${tName} <span style="color:#a855f7; font-weight:800; font-size:10px;">[G: ${reg.expand.gruppetto_id.name}]</span>`;
                    combinedList.push({ id: rider.id, name: rider.first_name, surname: rider.last_name, year: rider.yob, gender: gender, group: catCode, points: rider.rating || 0, team: tName, teamId: rider.team_id, isRegistered: !!reg, recordId: reg ? reg.id : null, plannedStart: reg ? reg.planned_start : null, bib: reg ? reg.bib : "" });
                });
                
                rosters.forEach(r => {
                    if (combinedList.find(x => x.id === r.rider_id)) return; 
                    let rider = r.expand?.rider_id; if (!rider) return;
                    let rTeamName = rider.expand?.team_id?.name || 'Без команды';
                    if (r.expand?.gruppetto_id) rTeamName = `${rTeamName} <span style="color:#a855f7; font-weight:800; font-size:10px;">[G: ${r.expand.gruppetto_id.name}]</span>`;
                    combinedList.push({ id: rider.id, name: rider.first_name, surname: rider.last_name, year: rider.yob, gender: String(rider.gender || 'M').toUpperCase().trim(), group: rider.base_cluster || 'B', points: rider.rating || 0, team: rTeamName, teamId: rider.team_id, isRegistered: true, recordId: r.id, plannedStart: r.planned_start, bib: r.bib || "" });
                });
            } else if (this.app.currentRider) {
                const mp = this.app.currentRider; let reg = rosters.find(x => x.rider_id === mp.id);
                let gender = String(mp.gender || 'M').toUpperCase().trim(); let catCode = mp.base_cluster || 'B';
                let tName = this.app.teamsMap[mp.team_id]?.name || "Без команды";
                if (reg && reg.expand?.gruppetto_id) tName = `${tName} <span style="color:#a855f7; font-weight:800; font-size:10px;">[G: ${reg.expand.gruppetto_id.name}]</span>`;
                combinedList = [{ id: mp.id, name: mp.first_name, surname: mp.last_name, year: mp.yob, gender: gender, group: catCode, points: mp.rating || 0, team: tName, teamId: mp.team_id, isRegistered: !!reg, recordId: reg ? reg.id : null, plannedStart: reg ? reg.planned_start : null, bib: reg ? reg.bib : "" }];
                
                rosters.forEach(r => {
                    if (r.rider_id === mp.id) return;
                    let rider = r.expand?.rider_id; if (!rider) return;
                    let rTeamName = rider.expand?.team_id?.name || 'Без команды';
                    if (r.expand?.gruppetto_id) rTeamName = `${rTeamName} <span style="color:#a855f7; font-weight:800; font-size:10px;">[G: ${r.expand.gruppetto_id.name}]</span>`;
                    combinedList.push({ id: rider.id, name: rider.first_name, surname: rider.last_name, year: rider.yob, gender: String(rider.gender || 'M').toUpperCase().trim(), group: rider.base_cluster || 'B', points: rider.rating || 0, team: rTeamName, teamId: rider.team_id, isRegistered: true, recordId: r.id, plannedStart: r.planned_start, bib: r.bib || "" });
                });
            }
          
            combinedList.sort((a, b) => {
                if (a.isRegistered && !b.isRegistered) return -1;
                if (!a.isRegistered && b.isRegistered) return 1;
                if (a.isRegistered && b.isRegistered) {
                    if (a.gender !== b.gender) return a.gender.localeCompare(b.gender);
                    if (a.group !== b.group) return a.group.localeCompare(b.group);
                }
                let surnameA = a.surname || ''; let surnameB = b.surname || '';
                if (surnameA !== surnameB) return surnameA.localeCompare(surnameB);
                let nameA = a.name || ''; let nameB = b.name || '';
                return nameA.localeCompare(nameB);
            });

            this.raceRosterList = combinedList;

           let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h2 style="font-family:'Unbounded'; font-weight:800; font-size:18px; color:var(--text-main); margin:0;">ЗАЯВКА: ${raceName.toUpperCase()}</h2>
                <button style="background:var(--bg-body); color:var(--text-main); border:1px solid var(--border); padding:8px 16px; border-radius:50px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; transition:0.2s;" onmouseover="this.style.borderColor='var(--text-main)'" onmouseout="this.style.borderColor='var(--border)'" onclick="window.app.crm.switchView('calendar')">← НАЗАД</button>
            </div>`;
            
            let regBtnText = (rStr.includes('captain') || isOrganizer) ? "ЗАЯВИТЬ ВЫБРАННЫХ" : "ПОДАТЬ ЗАЯВКУ";
            
            // 🔥 ДЕЛАЕМ КНОПКИ В ЕДИНОМ СТИЛЕ ПИЛЮЛЬ (Как в календаре)
            html += `<div style="display:flex; gap:8px; margin-bottom: 20px; overflow-x:auto; scrollbar-width:none; padding-bottom:4px; -webkit-overflow-scrolling:touch;">`;
            if (isOrganizer) { 
                const btnStyle = "background:transparent; color:var(--text-muted); border:1px solid var(--border); padding:8px 16px; border-radius:50px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; flex-shrink:0; transition:0.2s;";
                
                html += `<button style="${btnStyle}" onmouseover="this.style.color='var(--text-main)'; this.style.borderColor='var(--text-main)';" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border)';" onclick="window.app.crm.generateBibs()">🔢 BIB-НОМЕРА</button>`;
                html += `<button style="${btnStyle}" onmouseover="this.style.color='var(--text-main)'; this.style.borderColor='var(--text-main)';" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border)';" onclick="window.app.crm.openWaveStartModal()">🌊 ВОЛНЫ (МАСС-СТАРТ)</button>`;
                html += `<button style="${btnStyle}" onmouseover="this.style.color='var(--text-main)'; this.style.borderColor='var(--text-main)';" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border)';" onclick="window.app.crm.generateITTStarts()">⏱ ITT-СТАРТЫ</button>`;
                html += `<button style="${btnStyle}" onmouseover="this.style.color='var(--text-main)'; this.style.borderColor='var(--text-main)';" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border)';" onclick="window.app.crm.triggerCsvImport('${raceId}')">📥 ИМПОРТ CSV</button>`;
                
                // Разделитель
                html += `<div style="width:1px; background:var(--border); margin:0 4px; flex-shrink:0;"></div>`;
                
                // Кнопка удаления (Красная при наведении)
                html += `<button style="background:transparent; color:var(--danger); border:1px solid rgba(255,51,102,0.3); padding:8px 16px; border-radius:50px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; flex-shrink:0; transition:0.2s;" onmouseover="this.style.background='rgba(255,51,102,0.1)';" onmouseout="this.style.background='transparent';" onclick="window.app.crm.deleteRace('${raceId}')">🗑️ УДАЛИТЬ ГОНКУ</button>`;
            }                
            html += `</div><div class="p-table-container"><table class="p-roster-table"><thead><tr><th style="width:100px;">Действие</th><th style="width:60px;">BIB</th><th>Имя</th><th>Команда</th><th style="width:80px;">ГР</th><th>Категория</th><th>Старт</th><th>Рейт.</th></tr></thead><tbody>`;
            if (combinedList.length === 0) { html += `<tr><td colspan="8" style="text-align:center; padding:40px; color:var(--text-muted); font-family:'Unbounded';">Нет гонщиков для заявки</td></tr>`; } 
            else {
                let currentCategory = null;
                let unregisteredHeaderShown = false; 
                
                combinedList.forEach(p => {
                    if (p.isRegistered) {
                        let catLabel = `[${p.gender}] ${p.group}`;
                        if (currentCategory !== catLabel) {
                            currentCategory = catLabel;
                            html += `<tr><td colspan="8" style="padding: 14px 10px; background: var(--bg-surface-hover); border-top: 2px solid var(--primary); border-bottom: 1px solid var(--border); color: var(--text-main); font-family: 'Unbounded'; font-weight: 800; font-size: 13px; text-transform: uppercase;">КАТЕГОРИЯ: <span style="color:var(--primary);">${catLabel}</span></td></tr>`;
                        }
                    } else {
                        if (!unregisteredHeaderShown) {
                            unregisteredHeaderShown = true;
                            html += `<tr><td colspan="8" style="padding: 30px 10px 10px; border-bottom: 1px solid var(--border); color: var(--text-muted); font-family: 'Unbounded'; font-weight: 800; font-size: 11px; text-transform: uppercase; text-align: center;">🔻 ДОСТУПНЫ ДЛЯ ЗАЯВКИ (КОМАНДА) 🔻</td></tr>`;
                        }
                    }

                    let bg = p.isRegistered ? 'background:var(--success-light);' : ''; let act = "";
                    
                    let canEditRow = false;
                    if (isOrganizer) {
                        canEditRow = true;
                    } else if (rStr.includes('captain') && p.teamId === this.app.currentRider.team_id) {
                        canEditRow = true; 
                    } else if (p.id === this.app.currentRider.id) {
                        canEditRow = true; 
                    }

                    if (canEditRow) {
                        act = p.isRegistered ? `<button class="btn-action" style="border:1px solid var(--danger); color:var(--danger); width:auto; padding:4px 10px; font-size:9px; border-radius:6px; font-family:'Unbounded';" onclick="window.app.crm.revokeRaceReg('${p.recordId}')">ОТОЗВАТЬ</button>` : `<input type="checkbox" class="mass-checkbox rider-check" value="${p.id}" style="width:18px; height:18px; accent-color:var(--primary); cursor:pointer;">`;
                    } else {
                        act = p.isRegistered ? `<span style="color:var(--success); font-weight:800; font-size:10px;">ЗАЯВЛЕН</span>` : `<span style="color:var(--text-muted); font-size:10px;">-</span>`;
                    }

                    let bibHtml = "-"; if (p.isRegistered) { let inputDisabled = isOrganizer ? "" : "disabled"; bibHtml = `<input type="text" style="width:40px; height:30px; text-align:center; background:transparent; border:1px solid var(--border); color:var(--primary); font-family:'Roboto Mono'; font-weight:bold; border-radius:4px;" value="${p.bib}" onchange="window.app.crm.updateBib('${p.recordId}', this.value, this)" ${inputDisabled}>`; }
                    let genderBadge = p.gender === 'F' ? '<span style="font-family:\'Unbounded\'; font-size:9px; font-weight:800; padding:2px 6px; border-radius:4px; background:var(--bg-body); border:1px solid var(--border); margin-right:6px; color:var(--danger);">Ж</span>' : '<span style="font-family:\'Unbounded\'; font-size:9px; font-weight:800; padding:2px 6px; border-radius:4px; background:var(--bg-body); border:1px solid var(--border); margin-right:6px;">М</span>';
                    let timeHtml = p.isRegistered && p.plannedStart ? `<b style="color:var(--text-muted); font-family:'Roboto Mono'; font-size:12px;">${p.plannedStart}</b>` : "-";

                    html += `<tr style="${bg}"><td>${act}</td><td>${bibHtml}</td><td><b style="font-size:13px;">${p.name} ${p.surname}</b></td><td><span style="color:var(--text-muted); font-size:11px;">${p.team}</span></td><td><span style="color:var(--text-muted); font-family:'Roboto Mono'; font-size:12px;">${p.year}</span></td><td>${genderBadge}<span style="font-size:11px; font-weight:600; font-family:'Roboto Mono';">${p.group}</span></td><td>${timeHtml}</td><td><b style="color:var(--primary); font-size:13px; font-family:'Roboto Mono';">${p.points}</b></td></tr>`;
                });
            }
            html += `</tbody></table></div>`; contentArea.innerHTML = html;
        } catch(e) { console.error(e); contentArea.innerHTML = '<div style="text-align:center; color:var(--danger); padding:40px;">Ошибка загрузки состава</div>'; }
    }

    async updateBib(recordId, newBib, inputEl) {
        if (!recordId) return;
        inputEl.style.backgroundColor = 'var(--success-light)';
        try {
            await pb.collection('race_rosters').update(recordId, { bib: newBib }, { requestKey: null });
            let p = this.raceRosterList.find(r => r.recordId === recordId);
            if (p) p.bib = newBib;
            setTimeout(() => { inputEl.style.backgroundColor = ''; }, 1000);
        } catch(e) { inputEl.style.backgroundColor = 'var(--danger-light)'; alert("Ошибка сохранения номера"); }
    }

    async submitMassRaceReg() {
        if (this.app.currentRider && this.app.currentRider.email && this.app.currentRider.email.startsWith('guest_')) {
            alert('Регистрация на гонку доступна только авторизованным спортсменам. Пожалуйста, войдите в свой аккаунт Сотка.');
            return; 
        }
        const checkedBoxes = document.querySelectorAll('input[type="checkbox"]:checked');
        const riderIds = Array.from(checkedBoxes).map(cb => cb.value).filter(val => val && val !== 'on');
        
        if (riderIds.length === 0) {
            alert("Пожалуйста, выберите хотя бы одного гонщика из списка!");
            return;
        }
        const currentRace = this.dataCalendar.find(r => r.id === this.openedEventId);
        if (currentRace && currentRace.level === 'peloton') {
            const invalidRiders = this.raceRosterList.filter(r => riderIds.includes(r.id) && r.group === 'O');
            if (invalidRiders.length > 0) {
                alert(`❌ Официальные гонки недоступны для любителей (Кластер O).\n\nСледующие участники не могут быть заявлены:\n${invalidRiders.map(r => r.name + ' ' + r.surname).join(', ')}`);
                return;
            }
        }

        try { 
            for(let id of riderIds) { 
                await pb.collection('race_rosters').create({ race_id: this.openedEventId, rider_id: id, status: 'registered' }, { requestKey: null }); 
            } 
            this.openRaceRoster(this.openedEventId, this.openedEventName, this.openedEventType); 
        } catch(e) { alert("Ошибка при заявке"); }
    }

    async revokeRaceReg(recordId) { 
        if(!confirm("Отозвать заявку этого гонщика?")) return; 
        try { 
            await pb.collection('race_rosters').delete(recordId, { requestKey: null }); 
            this.openRaceRoster(this.openedEventId, this.openedEventName, this.openedEventType); 
        } catch(e) { alert("Ошибка при отмене"); } 
    }

    async generateBibs() {
        if (!this.openedEventId) return;
        let sortedRiders = [...this.raceRosterList].filter(p => p.isRegistered);
        if (sortedRiders.length === 0) return alert("Нет подтвержденных заявок!");
        if (!confirm("Автоматически присвоить номера всем заявленным гонщикам?")) return;
        try {
            for (let i = 0; i < sortedRiders.length; i++) {
                let bibNum = (i + 1).toString();
                await pb.collection('race_rosters').update(sortedRiders[i].recordId, { bib: bibNum }, { requestKey: null });
            }
            alert("✅ Стартовые номера успешно присвоены!");
            this.openRaceRoster(this.openedEventId, this.openedEventName, this.openedEventType);
        } catch(e) { alert("❌ Ошибка при генерации номеров."); } 
    }

    async generateITTStarts() {
        if (!this.openedEventId) return;
        let sortedRiders = [...this.raceRosterList].filter(p => p.isRegistered);
        if (sortedRiders.length === 0) return alert("Нет подтвержденных заявок!");
        let startTimeStr = prompt("Введите время старта первого участника (ЧЧ:ММ:СС):", "10:00:00"); if (!startTimeStr) return;
        let intervalSec = parseInt(prompt("Введите интервал между стартами (в секундах):", "30")); if (isNaN(intervalSec) || intervalSec <= 0) return;

        try {
            let baseDate = new Date(); let parts = startTimeStr.split(':');
            baseDate.setHours(parseInt(parts[0] || 10), parseInt(parts[1] || 0), parseInt(parts[2] || 0), 0);
            for (let i = 0; i < sortedRiders.length; i++) {
                let time = new Date(baseDate.getTime() + (i * intervalSec * 1000));
                let timeString = time.toTimeString().split(' ')[0]; 
                await pb.collection('race_rosters').update(sortedRiders[i].recordId, { planned_start: timeString }, { requestKey: null });
            }
            await pb.collection('races').update(this.openedEventId, { status: 'LIVE' }, { requestKey: null });

            try {
                const raceChat = this.app.chats.find(c => c.race_id === this.openedEventId);
                const botRider = Object.values(this.app.ridersMap).find(r => r.email === 'bot@sotka.one');
                if (raceChat && botRider) {
                    await pb.collection('messages').create({
                        chat_id: raceChat.id,
                        sender_id: botRider.id,
                        text: `⏱ РАЗДЕЛКА ЗАПУЩЕНА!\n\nСтартовый протокол ITT сформирован. Участники уходят на дистанцию согласно расписанию. Результаты обновляются в LIVE-режиме.\n\n[ACTION:LIVE:${this.openedEventId}]`
                    }, { requestKey: null });
                }
            } catch(botErr) { }

            alert("✅ Расписание стартов сгенерировано! Гонка переведена в статус LIVE.");
            this.openRaceRoster(this.openedEventId, this.openedEventName, this.openedEventType);
        } catch(e) { alert("❌ Ошибка при генерации расписания."); }
    }

    openWaveStartModal() {
        let riders = [...this.raceRosterList].filter(p => p.isRegistered);
        if (riders.length === 0) return alert("В заявке нет участников!");
        
        let groups = {};
        riders.forEach(r => {
            const genderLabel = (r.gender === 'F' || r.gender === 'Ж') ? 'Ж' : 'М';
            const key = `${genderLabel}_${r.group}`; 
            if (!groups[key]) groups[key] = { gender: genderLabel, cluster: r.group, count: 0 };
            groups[key].count++;
        });

        let sortedKeys = Object.keys(groups).sort((a, b) => {
            if (groups[a].gender !== groups[b].gender) return groups[b].gender.localeCompare(groups[a].gender); 
            return groups[a].cluster.localeCompare(groups[b].cluster);
        });

        let container = document.getElementById('waveStartGroups'); 
        container.innerHTML = '';

        sortedKeys.forEach(key => {
            const g = groups[key];
            const color = g.gender === 'Ж' ? 'var(--danger)' : 'var(--primary)';
            
            container.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface-hover); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; margin-bottom: 8px;">
                    <div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
                        <div style="font-size: 13px; font-weight: 800; font-family: 'Unbounded'; color: var(--text-main); white-space: nowrap;">
                            <span style="color:${color}; margin-right:4px;">[${g.gender}]</span> Группа ${g.cluster}
                        </div>
                        <div style="font-size: 11px; color: var(--text-muted); font-family: 'Manrope', sans-serif;">
                            Участников: ${g.count}
                        </div>
                    </div>
                    <input type="text" id="wave-time-${key}" class="auth-input" 
                           style="width: 100px; margin: 0; background: var(--bg-body); border: 1px solid var(--border); color: var(--text-main); border-radius: 8px; padding: 8px 12px; font-family: 'Roboto Mono', monospace; font-size: 13px; text-align: center; font-weight: bold; outline: none; flex-shrink: 0;" 
                           placeholder="10:00:00">
                </div>`;
        });
        document.getElementById('waveStartModal').style.display = 'flex';
    }

    async applyWaveStarts() {
        let riders = [...this.raceRosterList].filter(p => p.isRegistered);
        let waveTimes = {}; 
        let hasTimes = false;

        const inputs = document.querySelectorAll('[id^="wave-time-"]');
        inputs.forEach(input => {
            let val = input.value.trim();
            if (val) {
                if (val.length === 5) val += ":00";
                const key = input.id.replace('wave-time-', '');
                waveTimes[key] = val;
                hasTimes = true;
            }
        });

        if (!hasTimes) return alert("Не указано ни одного времени!");
        const btn = document.getElementById('btn-save-waves'); 
        btn.disabled = true; btn.innerText = "СОХРАНЕНИЕ...";

        try {
            for (let rider of riders) {
                const genderLabel = (rider.gender === 'F' || rider.gender === 'Ж') ? 'Ж' : 'М';
                const key = `${genderLabel}_${rider.group}`;
                if (waveTimes[key]) {
                    await pb.collection('race_rosters').update(rider.recordId, { planned_start: waveTimes[key] }, { requestKey: null });
                }
            }
            
            await pb.collection('races').update(this.openedEventId, { status: 'LIVE' }, { requestKey: null });

            try {
                const raceChat = this.app.chats.find(c => c.race_id === this.openedEventId);
                const botRider = Object.values(this.app.ridersMap).find(r => r.email === 'bot@sotka.one');
                if (raceChat && botRider) {
                    await pb.collection('messages').create({
                        chat_id: raceChat.id,
                        sender_id: botRider.id,
                        text: `🏁 ПЕЛОТОН В ДВИЖЕНИИ!\n\nОрганизатор распределил участников по волнам. Время старта назначено. Открываем LIVE-протокол для отслеживания лидеров в реальном времени!\n\n[ACTION:LIVE:${this.openedEventId}]`
                    }, { requestKey: null });
                }
            } catch(botErr) { console.error("Бот не смог отправить анонс", botErr); }

            alert("✅ Волновые старты назначены! Бот отправил анонс в чат гонки.");
            document.getElementById('waveStartModal').style.display = 'none';
            this.openRaceRoster(this.openedEventId, this.openedEventName, this.openedEventType);
        } catch(e) { alert("❌ Ошибка сохранения"); } finally { btn.disabled = false; btn.innerText = "Назначить"; }
    }

// ==========================================
    // МАГИЯ СУПЕР-КОНСТРУКТОРА ГОНОК
    // ==========================================

    // Навигация по 4 шагам
    switchConstructorStep(step) {
        for (let i = 1; i <= 4; i++) {
            const btn = document.getElementById(`stepBtn${i}`);
            const content = document.getElementById(`stepContent${i}`);
            if (btn && content) {
                if (i === step) {
                    btn.classList.add('active');
                    btn.style.background = 'var(--primary)';
                    btn.style.color = '#000';
                    content.style.display = 'block';
                } else {
                    btn.classList.remove('active');
                    btn.style.background = 'transparent';
                    btn.style.color = 'var(--text-muted)';
                    content.style.display = 'none';
                }
            }
        }
        this.constructorStep = step;
        
        const btnPrev = document.getElementById('btnPrevStep');
        const btnNext = document.getElementById('btnNextStep');
        if (btnPrev) btnPrev.style.visibility = step === 1 ? 'hidden' : 'visible';
        if (btnNext) btnNext.style.display = step === 4 ? 'none' : 'block';
    }

    changeStep(dir) {
        let newStep = (this.constructorStep || 1) + dir;
        if (newStep < 1) newStep = 1;
        if (newStep > 4) newStep = 4;
        this.switchConstructorStep(newStep);
    }

    // Динамическая загрузка Кубков
    async onPelotonChange() {
        const pId = document.getElementById('evPeloton').value;
        const container = document.getElementById('dynamicCupsContainer');
        if (!container) return;
        
        if (!pId) { container.innerHTML = ''; return; }
        
        container.innerHTML = '<div style="font-size:10px; color:var(--primary); font-family:\'Unbounded\';">⏳ Ищем кубки...</div>';
        try {
            const cups = await pb.collection('cups').getFullList({ filter: `peloton_id="${pId}"`, requestKey: null });
            if (cups.length === 0) {
                container.innerHTML = '<div style="font-size:11px; color:var(--text-muted); font-style:italic;">К этой серии не привязаны кубки</div>';
                return;
            }
            
            let html = '<div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; margin-bottom:5px; font-weight:bold;">🏆 Идет в зачет кубков:</div><div style="display:flex; flex-direction:column; gap:8px; background:var(--bg-surface-hover); padding:12px; border-radius:8px; border:1px solid var(--border);">';
            cups.forEach(c => {
                html += `<label style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-main); cursor:pointer;"><input type="checkbox" class="cup-checkbox" value="${c.id}" style="width:16px; height:16px; accent-color:var(--primary);"> <b>${c.name}</b></label>`;
            });
            html += '</div>';
            container.innerHTML = html;
        } catch(e) { container.innerHTML = ''; }
    }

    // Управление мульти-дистанциями
    initDistances() {
        this.eventDistances = [{ id: Date.now(), name: 'Основная', length: '', elevation: '', laps: '' }];
        this.renderDistances();
    }

    addDistance() {
        this.eventDistances.push({ id: Date.now(), name: `Дистанция ${this.eventDistances.length + 1}`, length: '', elevation: '', laps: '' });
        this.renderDistances();
    }

    removeDistance(id) {
        if (this.eventDistances.length <= 1) return alert("Должна быть хотя бы одна дистанция!");
        this.eventDistances = this.eventDistances.filter(d => d.id !== id);
        this.renderDistances();
    }

    updateDistance(id, field, value) {
        const dist = this.eventDistances.find(d => d.id === id);
        if (dist) dist[field] = value;
    }

    renderDistances() {
        const container = document.getElementById('dynamicDistancesContainer');
        if (!container) return;
        
        let html = '';
        this.eventDistances.forEach((d, idx) => {
            html += `
            <div style="background: var(--bg-body); border: 1px solid var(--border); border-radius: 12px; padding: 15px; margin-bottom: 15px; position:relative;">
                ${this.eventDistances.length > 1 ? `<button onclick="window.app.crm.removeDistance(${d.id})" style="position:absolute; top:10px; right:10px; background:none; border:none; color:var(--danger); cursor:pointer; font-size:20px; line-height:1;">&times;</button>` : ''}
                <div style="font-size:11px; color:var(--primary); font-family:'Unbounded'; font-weight:800; margin-bottom:12px;">ДИСТАНЦИЯ ${idx + 1}</div>
                
                <input type="text" class="auth-input" style="width:100%; margin-bottom:10px; padding:12px; border-radius:8px; border:1px solid var(--border); background:var(--bg-surface); color:var(--text-main);" placeholder="Название (напр. Short 50km)" value="${d.name}" oninput="window.app.crm.updateDistance(${d.id}, 'name', this.value)">
                
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
                    <div><div style="font-size:9px; color:var(--text-muted); margin-bottom:4px;">Длина (км)</div><input type="number" class="auth-input" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:var(--bg-surface); color:var(--text-main);" placeholder="0" value="${d.length}" oninput="window.app.crm.updateDistance(${d.id}, 'length', this.value)"></div>
                    <div><div style="font-size:9px; color:var(--text-muted); margin-bottom:4px;">Набор (м)</div><input type="number" class="auth-input" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:var(--bg-surface); color:var(--text-main);" placeholder="0" value="${d.elevation}" oninput="window.app.crm.updateDistance(${d.id}, 'elevation', this.value)"></div>
                    <div><div style="font-size:9px; color:var(--text-muted); margin-bottom:4px;">Круги</div><input type="number" class="auth-input" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:var(--bg-surface); color:var(--text-main);" placeholder="1" value="${d.laps}" oninput="window.app.crm.updateDistance(${d.id}, 'laps', this.value)"></div>
                </div>
            </div>`;
        });
        
        html += `<button onclick="window.app.crm.addDistance()" style="background:transparent; border:1px dashed var(--primary); color:var(--primary); padding:15px; width:100%; border-radius:12px; font-family:'Unbounded'; font-size:12px; font-weight:800; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='rgba(255,193,7,0.1)'" onmouseout="this.style.background='transparent'">+ ДОБАВИТЬ ЕЩЕ ДИСТАНЦИЮ</button>`;
        container.innerHTML = html;
    }

    openCreateEventModal() {
        this.editEventId = null;
        
        // 🔥 1. БЕЗОПАСНО МЕНЯЕМ ЗАГОЛОВОК И КНОПКУ (Используем новые ID)
        const titleEl = document.getElementById('constructorTitle');
        if (titleEl) titleEl.innerText = 'НОВОЕ СОБЫТИЕ';
        
        const submitBtn = document.querySelector('#stepContent4 .p-btn-black');
        if (submitBtn) submitBtn.innerText = '🚀 ОПУБЛИКОВАТЬ ГОНКУ';
        
        // 🔥 2. СБРАСЫВАЕМ КОНСТРУКТОР И ДИСТАНЦИИ
        if (typeof this.switchConstructorStep === 'function') this.switchConstructorStep(1);
        if (typeof this.initDistances === 'function') this.initDistances();
        
        // 🔥 3. БЕЗОПАСНАЯ ОЧИСТКА ПОЛЕЙ
        const nameEl = document.getElementById('evName'); if (nameEl) nameEl.value = '';
        const statusEl = document.getElementById('evStatus'); if (statusEl) statusEl.value = 'Registration';
        const dateEl = document.getElementById('evDate'); if (dateEl) dateEl.value = '';
        const pubEl = document.getElementById('evIsPublic'); if (pubEl) pubEl.checked = false; 

        // 4. ЛОГИКА ДОСТУПОВ (Кто может создавать)
        const roles = this.app.usersMap[this.app.currentRider?.email] || []; 
        const rStr = JSON.stringify(roles); 
        const isAdmin = rStr.includes('superadmin') || rStr.includes('admin');

        let allowedPelotons = [];
        if (isAdmin) {
            allowedPelotons = Object.values(this.app.pelotonsMap);
        } else {
            const myTeam = this.app.teamsMap[this.app.currentRider?.team_id];
            if (myTeam && myTeam.peloton_id) {
                const teamPelotonIds = Array.isArray(myTeam.peloton_id) ? myTeam.peloton_id : [myTeam.peloton_id];
                allowedPelotons = teamPelotonIds.map(id => this.app.pelotonsMap[id]).filter(Boolean);
            }
        }

        // 5. ЗАГРУЗКА ПЕЛОТОНОВ
        const pelotonSelectEl = document.getElementById('evPeloton');
        if (pelotonSelectEl) {
            if (allowedPelotons.length === 0) {
                pelotonSelectEl.innerHTML = '<option value="" disabled selected>Нет доступных пелотонов</option>';
            } else {
                pelotonSelectEl.innerHTML = '<option value="" disabled selected>Выберите лигу/серию...</option>' + 
                    allowedPelotons.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            }
            
            // 🔥 Подвязываем автоматическую загрузку Кубков при выборе пелотона!
            pelotonSelectEl.onchange = () => { if (typeof this.onPelotonChange === 'function') this.onPelotonChange(); };
            pelotonSelectEl.value = '';
            if (typeof this.onPelotonChange === 'function') this.onPelotonChange(); // Очищаем кубки для новой гонки
        }

        const levelSelect = document.getElementById('evLevel'); 
        if (levelSelect) {
            levelSelect.innerHTML = '';
            if (isAdmin) levelSelect.innerHTML += `<option value="peloton">Официальная Гонка (Рейтинг)</option>`;
            if (this.app.currentRider.team_id) levelSelect.innerHTML += `<option value="team" selected>Командная Тренировка</option>`;
            levelSelect.innerHTML += `<option value="personal">Личный выезд (Без рейтинга)</option>`;
        }
        
        if (isAdmin) {
            pb.collection('users').getFullList({ filter: `role ~ "judge"`, requestKey:null }).then(judges => {
                const judgeEl = document.getElementById('evJudge');
                if (judgeEl) judgeEl.innerHTML = `<option value="">Не назначен (Или сужу сам)</option>` + judges.map(j => `<option value="${j.id}">${j.name}</option>`).join('');
            });
        }
        
        this.toggleEventFields(); 
        
        // 🔥 ОТКРЫВАЕМ НОВОЕ ОКНО КОНСТРУКТОРА
        const modal = document.getElementById('createEventModal');
        if (modal) modal.style.display = 'flex';
    }

    async openEditEventModal(raceId) {
        const race = this.dataCalendar.find(r => r.id === raceId);
        if (!race) return;
        this.editEventId = raceId;

        // 🔥 ИСПРАВЛЕННЫЕ СТРОКИ ДЛЯ РЕДАКТИРОВАНИЯ
        document.getElementById('constructorTitle').innerText = 'РЕДАКТИРОВАНИЕ ГОНКИ';
        const submitBtn = document.querySelector('#stepContent4 .p-btn-black');
        if (submitBtn) submitBtn.innerText = '💾 СОХРАНИТЬ ИЗМЕНЕНИЯ';

        this.switchConstructorStep(1);

        // Восстанавливаем дистанции
        if (race.distances && Array.isArray(race.distances) && race.distances.length > 0) {
            this.eventDistances = race.distances;
            // Убедимся, что у всех дистанций есть id для UI
            this.eventDistances.forEach(d => { if(!d.id) d.id = Date.now() + Math.random(); });
        } else {
            this.eventDistances = [{ id: Date.now(), name: 'Основная', length: race.distance || '', elevation: '', laps: '' }];
        }
        this.renderDistances();

        // Базовые поля
        const nameEl = document.getElementById('evName'); if(nameEl) nameEl.value = race.name || '';
        const statusEl = document.getElementById('evStatus'); if(statusEl) statusEl.value = race.status || 'Registration';
        const pubEl = document.getElementById('evIsPublic'); if(pubEl) pubEl.checked = race.is_public || false; 

        // Новые поля (Маршрут и Правила)
        const surfaceEl = document.getElementById('evSurface'); if(surfaceEl) surfaceEl.value = race.surface || 'road';
        const formatEl = document.getElementById('evFormat'); if(formatEl) formatEl.value = race.format || 'mass';
        const catEl = document.getElementById('evCatLogic'); if(catEl) catEl.value = race.category_logic || 'clusters';
        const ridersEl = document.getElementById('evMaxRiders'); if(ridersEl) ridersEl.value = race.max_riders || '';

        const roles = this.app.usersMap[this.app.currentRider?.email] || []; 
        const rStr = JSON.stringify(roles); 
        const isAdmin = rStr.includes('superadmin') || rStr.includes('admin');

        let allowedPelotons = [];
        if (isAdmin) allowedPelotons = Object.values(this.app.pelotonsMap);
        else {
            const myTeam = this.app.teamsMap[this.app.currentRider?.team_id];
            if (myTeam && myTeam.peloton_id) {
                const teamPelotonIds = Array.isArray(myTeam.peloton_id) ? myTeam.peloton_id : [myTeam.peloton_id];
                allowedPelotons = teamPelotonIds.map(id => this.app.pelotonsMap[id]).filter(Boolean);
            }
        }

        const pelotonSelectEl = document.getElementById('evPeloton');
        if (pelotonSelectEl) {
            if (allowedPelotons.length === 0) {
                pelotonSelectEl.innerHTML = '<option value="" disabled selected>Нет доступных пелотонов</option>';
            } else {
                pelotonSelectEl.innerHTML = '<option value="" disabled selected>Выберите лигу/серию...</option>' + 
                    allowedPelotons.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            }
            pelotonSelectEl.onchange = () => this.onPelotonChange();
        }

        try {
            const d = new Date(race.rawDate);
            const offset = d.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(d - offset)).toISOString().slice(0, 16);
            const dateEl = document.getElementById('evDate');
            if (dateEl) dateEl.value = localISOTime;
        } catch(e) {}

        const levelSelect = document.getElementById('evLevel'); 
        if (levelSelect) {
            levelSelect.innerHTML = '';
            if (isAdmin) levelSelect.innerHTML += `<option value="peloton">Официальная Гонка</option>`;
            if (this.app.currentRider.team_id) levelSelect.innerHTML += `<option value="team">Командная Тренировка</option>`;
            levelSelect.innerHTML += `<option value="personal">Личный выезд</option>`;
            levelSelect.value = race.level || 'personal';
        }

        let pIdStr = "";
        if (race.peloton_id) pIdStr = Array.isArray(race.peloton_id) ? race.peloton_id[0] : race.peloton_id;
        if (pelotonSelectEl) {
            pelotonSelectEl.value = pIdStr || '';
            await this.onPelotonChange(); // Загружаем кубки
            
            // Восстанавливаем галочки кубков, если они были
            if (race.cup_id && race.cup_id.length > 0) {
                setTimeout(() => {
                    const checkboxes = document.querySelectorAll('.cup-checkbox');
                    checkboxes.forEach(cb => {
                        if (race.cup_id.includes(cb.value)) cb.checked = true;
                    });
                }, 100);
            }
        }

        if (isAdmin) {
            const judges = await pb.collection('users').getFullList({ filter: `role ~ "judge"`, requestKey:null });
            const judgeEl = document.getElementById('evJudge');
            if(judgeEl) {
                judgeEl.innerHTML = `<option value="">Не назначен</option>` + judges.map(j => `<option value="${j.id}">${j.name}</option>`).join('');
                const fullRace = await pb.collection('races').getOne(raceId, {requestKey: null});
                if(fullRace.judge_id) judgeEl.value = fullRace.judge_id;
            }
        }
        
        this.toggleEventFields(); 
        document.getElementById('createEventModal').style.display = 'flex';
    }

    toggleEventFields() { 
        const lvl = document.getElementById('evLevel').value; 
        const isPeloton = (lvl === 'peloton');
        const isTeam = (lvl === 'team');
        
        document.getElementById('evType').style.display = isPeloton ? 'block' : 'none'; 
        document.getElementById('evPeloton').style.display = (isPeloton || isTeam) ? 'block' : 'none'; 
        document.getElementById('evJudge').style.display = isPeloton ? 'block' : 'none'; 
        
        if (document.getElementById('evAllowedTypesLabel')) document.getElementById('evAllowedTypesLabel').style.display = isPeloton ? 'block' : 'none';
        if (document.getElementById('evAllowedTypes')) document.getElementById('evAllowedTypes').style.display = isPeloton ? 'block' : 'none';
        
        if (document.getElementById('evIsPublicLabel')) document.getElementById('evIsPublicLabel').style.display = isTeam ? 'flex' : 'none';
    }

    async submitEvent() {
        try {
            // ==========================================
            // ШАГ 1: БЕЗОПАСНЫЙ СБОР ДАННЫХ ИЗ ФОРМЫ
            // ==========================================
            const nameEl = document.getElementById('evName');
            const name = nameEl ? nameEl.value.trim() : '';

            const dateEl = document.getElementById('evDate');
            const date = dateEl ? dateEl.value : '';

            const levelEl = document.getElementById('evLevel');
            const level = levelEl ? levelEl.value : 'personal';

            const statusEl = document.getElementById('evStatus');
            const status = statusEl ? statusEl.value : 'Registration';

            const pubEl = document.getElementById('evIsPublic');
            const isPublic = pubEl ? pubEl.checked : false;

            if (!name || !date) {
                if (typeof this.switchConstructorStep === 'function') this.switchConstructorStep(1);
                return alert("Укажите название и дату на 1 шаге!");
            }

            // ==========================================
            // ШАГ 2: НОВЫЕ ПОЛЯ (Дистанции и Кубки)
            // ==========================================
            const cleanedDistances = this.eventDistances ? this.eventDistances.map(d => ({
                name: d.name || 'Основная',
                length: Number(d.length) || 0,
                elevation: Number(d.elevation) || 0,
                laps: Number(d.laps) || 1
            })) : [];

            const cupCheckboxes = document.querySelectorAll('.cup-checkbox:checked');
            const cupIds = Array.from(cupCheckboxes).map(cb => cb.value);

            // ==========================================
            // ШАГ 3: ФОРМИРУЕМ JSON ДЛЯ БАЗЫ (PocketBase)
            // ==========================================
            const data = {
                name: name,
                date: new Date(date).toISOString(),
                level: level,
                status: status,
                is_public: isPublic,
                surface: document.getElementById('evSurface') ? document.getElementById('evSurface').value : 'road',
                format: document.getElementById('evFormat') ? document.getElementById('evFormat').value : 'mass',
                category_logic: document.getElementById('evCatLogic') ? document.getElementById('evCatLogic').value : 'clusters',
                max_riders: document.getElementById('evMaxRiders') ? (Number(document.getElementById('evMaxRiders').value) || 0) : 0,
                distances: cleanedDistances,
                
                // 🔥 Тот самый исправленный ID создателя!
                creator_id: pb.authStore.model.id
            };

            if (cupIds.length > 0) {
                data.cup_id = cupIds;
            } else if (this.editEventId) {
                data.cup_id = null;
            }

            if (level === 'peloton' || level === 'team') {
                const pelotonEl = document.getElementById('evPeloton');
                data.peloton_id = pelotonEl ? pelotonEl.value : null;
                if (!data.peloton_id && level === 'team') return alert("Выберите лигу!");
            }
            if (level === 'peloton') {
                const judgeEl = document.getElementById('evJudge');
                data.judge_id = judgeEl ? judgeEl.value : "";
            }
            if (level === 'team') {
                data.team_id = this.app.currentRider.team_id;
            }

            const btn = document.querySelector('#stepContent4 .p-btn-black');
            if (btn) { btn.innerText = '⏳ СОХРАНЯЕМ...'; btn.disabled = true; }

            // ==========================================
            // ШАГ 4: СОХРАНЕНИЕ + ЧАТЫ + БОТ
            // ==========================================
            if (this.editEventId) {
                const oldRace = this.dataCalendar.find(r => r.id === this.editEventId);
                await pb.collection('races').update(this.editEventId, data, { requestKey: null });
                alert("✅ Изменения сохранены!");

                // Бот при смене статуса
                if (oldRace && oldRace.status === 'Скоро' && status === 'Registration' && level === 'peloton') {
                    if (typeof this.sendBotRegistrationMessage === 'function') {
                        await this.sendBotRegistrationMessage(this.editEventId, data.name);
                    }
                }
            } else {
                // Создаем новую гонку
                const newRace = await pb.collection('races').create(data, { requestKey: null });

                if (level === 'peloton') {
                    try {
                        const d = new Date(data.date); 
                        const chatDate = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
                        let pIdStr = Array.isArray(data.peloton_id) ? data.peloton_id[0] : data.peloton_id;

                        const botRider = Object.values(this.app.ridersMap).find(r => r.email === 'bot@sotka.one');
                        let chatParts = [this.app.currentRider.id];
                        if (botRider) chatParts.push(botRider.id);

                        const chatName = data.name.toUpperCase() + " " + chatDate;

                        // СОЗДАЕМ ЧАТ ГОНКИ
                        const newChat = await pb.collection('chats').create({ 
                            type: 'global', 
                            name: chatName, 
                            peloton_id: pIdStr || "", 
                            race_id: newRace.id, 
                            participants: chatParts 
                        }, { requestKey: null });

                        // БОТ ПИШЕТ В ЧАТ
                        if (botRider && newChat) {
                            let msgText = status === 'Registration'
                                ? `🔥 ОТКРЫТА РЕГИСТРАЦИЯ!\n\nОрганизатор добавил в календарь новую гонку: **${data.name.toUpperCase()}**.\n\nУспейте занять место в пелотоне. Жмите кнопку ниже, чтобы подать заявку в один клик.\n\n[ACTION:REGISTER:${newRace.id}]`
                                : `📅 АНОНС ГОНКИ!\n\nОрганизатор добавил в календарь новую гонку: **${data.name.toUpperCase()}**.\n\nПодробности и кнопка регистрации появятся позже. Включайте уведомления и готовьте байки!`;
                            await pb.collection('messages').create({ chat_id: newChat.id, sender_id: botRider.id, text: msgText }, { requestKey: null });
                        }
                    } catch(err) { console.error("Ошибка создания чата/бота:", err); }
                }
                alert("✅ Событие успешно создано!");
            }

            // Закрываем окно и обновляем календарь
            const modal = document.getElementById('createEventModal');
            if (modal) modal.style.display = 'none';
            this.editEventId = null;
            this.loadData();

        } catch(e) {
            console.error(e);
            let errDetails = "Неизвестная ошибка";
            if (e.data && e.data.data) {
                errDetails = Object.keys(e.data.data).map(k => `Поле [${k}]: ${e.data.data[k].message}`).join('\n');
            } else if (e.message) {
                errDetails = e.message;
            }
            alert("❌ Ошибка сохранения:\n" + errDetails);
        } finally {
            const btn = document.querySelector('#stepContent4 .p-btn-black');
            if (btn) { btn.innerText = '🚀 ОПУБЛИКОВАТЬ ГОНКУ'; btn.disabled = false; }
        }
    }

    async sendBotRegistrationMessage(raceId, raceName) {
        try {
            const botRider = Object.values(this.app.ridersMap).find(r => r.email === 'bot@sotka.one');
            if (!botRider) return;
            const raceChat = this.app.chats.find(c => c.race_id === raceId);
            if (!raceChat) return;

            const msgText = "🔥 ОТКРЫТА РЕГИСТРАЦИЯ!\n\nОрганизатор открыл регистрацию на гонку: **" + raceName.toUpperCase() + "**.\n\nУспейте занять место в пелотоне. Жмите кнопку ниже, чтобы подать заявку в один клик.\n\n[ACTION:REGISTER:" + raceId + "]";

            await pb.collection('messages').create({
                chat_id: raceChat.id,
                sender_id: botRider.id,
                text: msgText
            }, { requestKey: null });
            
            await pb.collection('chats').update(raceChat.id, { updated: new Date().toISOString() }, { requestKey: null });
        } catch(e) { console.error("Ошибка отправки ботом", e); }
    }

    async deleteRace(raceId) {
        if (!confirm("⚠️ ВНИМАНИЕ! Вы точно хотите удалить эту гонку и все её заявки навсегда?")) return;
        try {
            await pb.collection('races').delete(raceId, { requestKey: null });
            alert("Гонка удалена.");
            this.switchView('calendar');
        } catch(e) { alert("Ошибка при удалении гонки"); }
    }

    // ==========================================
    // ИМПОРТ РЕЗУЛЬТАТОВ ИЗ CSV
    // ==========================================
    triggerCsvImport(raceId) {
        let fileInput = document.getElementById('csvImportInput');
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'csvImportInput';
            fileInput.accept = '.csv';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
        }
        fileInput.onchange = (e) => this.handleCsvFile(e, raceId);
        fileInput.click();
    }

    async handleCsvFile(event, raceId) {
        const file = event.target.files[0];
        if (!file) return;
        
        const contentArea = document.getElementById('crmContentArea');
        contentArea.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;"><div class="spinner" style="width:40px; height:40px; border-width:4px; display:inline-block; border-color: #a855f7 transparent transparent transparent;"></div><div style="margin-top:15px; font-family:'Unbounded'; font-size:12px; color:var(--text-main); font-weight:800; text-transform:uppercase;">Анализ CSV протокола...</div></div>`;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            await this.processCsvData(text, raceId);
        };
        reader.readAsText(file); 
        event.target.value = ''; 
    }

    parseTimeToMs(timeStr) {
        if (!timeStr || timeStr === '-' || timeStr.toLowerCase().includes('dnf') || timeStr.toLowerCase().includes('dsq')) return 0;
        let parts = timeStr.split(':');
        if (parts.length === 3) {
            let h = parseInt(parts[0]) || 0;
            let m = parseInt(parts[1]) || 0;
            let sParts = parts[2].split(/[.,]/); 
            let s = parseInt(sParts[0]) || 0;
            let ms = sParts[1] ? parseInt(sParts[1].padEnd(3, '0').slice(0,3)) : 0;
            return (h * 3600000) + (m * 60000) + (s * 1000) + ms;
        } else if (parts.length === 2) {
            let m = parseInt(parts[0]) || 0;
            let sParts = parts[1].split(/[.,]/);
            let s = parseInt(sParts[0]) || 0;
            let ms = sParts[1] ? parseInt(sParts[1].padEnd(3, '0').slice(0,3)) : 0;
            return (m * 60000) + (s * 1000) + ms;
        }
        return 0;
    }

    async processCsvData(csvText, raceId) {
        try {
            const lines = csvText.split(/\r?\n/);
            if (lines.length < 2) return alert("Файл пуст или имеет неверный формат!");

            const currentRace = await pb.collection('races').getOne(raceId, { requestKey: null });
            const raceDistance = currentRace.distance || 0;
            const rosters = await pb.collection('race_rosters').getFullList({ filter: `race_id="${raceId}"`, expand: 'rider_id,rider_id.team_id', requestKey: null });

            let liveBoard = [];
            let registeredCount = 0;
            let guestCount = 0;
            
            for (let i = 1; i < lines.length; i++) {
                let line = lines[i].trim();
                if (!line) continue;
                
                let cols = line.split(';'); 
                
                let bib = cols[1] ? cols[1].trim() : '';
                let name = cols[2] ? cols[2].trim() : '';
                let yob = cols[3] ? cols[3].trim() : '';
                let category = cols[4] ? cols[4].trim() : '';
                let team = cols[5] ? cols[5].trim() : '';
                let laps = parseInt(cols[6]) || 0;
                let timeStr = cols[7] ? cols[7].trim() : '';
                
                let timeMs = this.parseTimeToMs(timeStr);
                
                let speed = 0;
                if (raceDistance > 0 && timeMs > 0) {
                    speed = (raceDistance / (timeMs / 3600000)).toFixed(2);
                }

                let matchedRoster = rosters.find(r => r.bib === bib);
                if (!matchedRoster && name) {
                    matchedRoster = rosters.find(r => {
                        let rName = r.expand?.rider_id?.first_name + ' ' + r.expand?.rider_id?.last_name;
                        return rName.toLowerCase() === name.toLowerCase();
                    });
                }

                if (matchedRoster) {
                    registeredCount++;
                    let status = (timeStr.toLowerCase().includes('dnf') || timeStr === '') ? 'dnf' : 'finished';
                    
                    await pb.collection('race_rosters').update(matchedRoster.id, {
                        status: status,
                        time_ms: timeMs,
                        speed: Number(speed),
                        final_cluster: category || matchedRoster.final_cluster
                    }, { requestKey: null });

                    let rBase = matchedRoster.expand?.rider_id?.base_cluster || 'B';
                    
                    liveBoard.push({
                        baseCluster: rBase,
                        bib: bib || matchedRoster.bib,
                        category: category || matchedRoster.final_cluster || rBase,
                        lapTimes: timeMs > 0 ? [timeMs] : [], 
                        laps: laps,
                        name: name || (matchedRoster.expand?.rider_id?.first_name + ' ' + matchedRoster.expand?.rider_id?.last_name),
                        yob: yob || matchedRoster.expand?.rider_id?.yob || '',
                        recCluster: rBase,
                        speed: speed.toString(),
                        team: team || matchedRoster.expand?.team_id?.name || 'Без команды',
                        timeStr: timeStr || status.toUpperCase()
                    });
                } else {
                    guestCount++;
                    liveBoard.push({
                        baseCluster: 'O',
                        bib: bib,
                        category: category,
                        lapTimes: timeMs > 0 ? [timeMs] : [],
                        laps: laps,
                        name: name,
                        yob: yob,
                        recCluster: '-',
                        speed: speed.toString(),
                        team: team,
                        timeStr: timeStr
                    });
                }
            }

            await pb.collection('races').update(raceId, {
                status: 'Finished',
                live_board: liveBoard
            }, { requestKey: null });

            alert(`✅ Импорт завершен!\n\nОбновлено заявок: ${registeredCount}\nДобавлено гостей: ${guestCount}\nГонка переведена в статус "Finished".`);
            
            if (typeof window.app.openLiveBoard === 'function') {
                window.app.openLiveBoard(raceId);
            } else {
                this.switchView('calendar');
            }
            
        } catch(e) {
            console.error(e);
            alert("❌ Ошибка при чтении CSV. Убедитесь, что формат правильный (разделитель - точка с запятой).");
            this.openRaceRoster(raceId, this.openedEventName, this.openedEventType);
        }
    }
}

class TeamManagerService {
    constructor(app) {
        this.app = app;
    }

    // 1. Создание новой команды
    async createTeam() { 
        const input = document.getElementById('newTeamInput'); 
        const n = input.value.trim(); 
        if (!n) return; 
        try { 
            const pelotonId = this.app.currentPelotonFilter === 'all' ? "" : this.app.currentPelotonFilter;
            const newTeam = await pb.collection('teams').create({ name: n, points: 0, peloton_id: pelotonId }, { requestKey: null }); 
            
            document.getElementById('createTeamModal').style.display = 'none'; 
            input.value = ''; 
            
            // Обновляем карту команд в памяти
            const allTeams = await pb.collection('teams').getFullList({ sort: 'name', requestKey: null });
            this.app.teamsMap = {}; 
            allTeams.forEach(t => { this.app.teamsMap[t.id] = t; });
            
            this.app.crm.adminSwitchTeam(newTeam.id); 
            alert("✅ Команда успешно создана!");
        } catch (e) { alert("❌ Ошибка создания. Проверьте права доступа."); } 
    }

    // 2. Назначение капитана
    async assignCaptain() { 
        const email = document.getElementById('capEmailInput').value.trim(); 
        if(!email) return; 
        try { 
            const newCap = Object.values(this.app.ridersMap).find(r => r.email && r.email.toLowerCase() === email.toLowerCase());
            if (!newCap) return alert("❌ Гонщик с таким Email не найден в базе данных.");
            
            const targetTeamId = this.app.crm.viewedTeamId || this.app.currentRider.team_id;
            
            // Снимаем права со старых капитанов этой команды
            const teamRiders = Object.values(this.app.ridersMap).filter(r => r.team_id === targetTeamId);
            for (let oldCap of teamRiders) {
                if (oldCap.roles && oldCap.roles.includes('captain') && oldCap.id !== newCap.id) {
                    let newRoles = oldCap.roles.filter(r => r !== 'captain');
                    await pb.collection('riders').update(oldCap.id, { roles: newRoles }, { requestKey: null });
                }
            }

            // Выдаем права новому
            let newCapRoles = newCap.roles || [];
            if (!Array.isArray(newCapRoles)) newCapRoles = [newCapRoles];
            if (!newCapRoles.includes('captain')) newCapRoles.push('captain');
            
            await pb.collection('riders').update(newCap.id, { team_id: targetTeamId, roles: newCapRoles }, { requestKey: null }); 
            
            alert(`✅ Пользователь успешно назначен капитаном!`); 
            document.getElementById('captainModal').style.display = 'none'; 
            window.location.reload(true); 
        } catch(e) { 
            console.error(e); 
            alert("❌ Ошибка при назначении капитана."); 
        } 
    }

    // 3. Удаление команды
    async deleteTeam() { 
        const targetTeamId = this.app.crm.viewedTeamId || this.app.currentRider.team_id;
        const tName = this.app.teamsMap[targetTeamId]?.name || "Эту команду";
        if (!targetTeamId || !confirm(`⚠️ ВНИМАНИЕ! Удалить команду "${tName}" навсегда?`)) return; 
        
        try { 
            await pb.collection('teams').delete(targetTeamId, { requestKey: null }); 
            const allTeams = await pb.collection('teams').getFullList({ sort: 'name', requestKey: null });
            this.app.teamsMap = {}; 
            allTeams.forEach(t => { this.app.teamsMap[t.id] = t; });
            
            this.app.crm.viewedTeamId = null; 
            this.app.crm.switchView('team'); 
        } catch(e) { alert("❌ Ошибка удаления."); } 
    }

    // 4. Переименование команды
    async renameTeam(teamId, currentName) {
        const roles = this.app.usersMap[this.app.currentRider?.email] || [];
        const rStr = JSON.stringify(roles);
        const isAdmin = rStr.includes('admin') || rStr.includes('superadmin');
        const isCaptain = rStr.includes('captain') && this.app.currentRider?.team_id === teamId;
        
        if (!isAdmin && !isCaptain) return alert("❌ Только капитан или администратор может менять название команды!");

        const newName = prompt("Введите новое название команды:", currentName);
        if (!newName || newName.trim() === "" || newName === currentName) return;
        
        try {
            await pb.collection('teams').update(teamId, { name: newName.trim() }, { requestKey: null });
            const teamChats = this.app.chats.filter(c => c.team_id === teamId && (c.type === 'team_channel' || c.type === 'team'));
            for (let chat of teamChats) {
                await pb.collection('chats').update(chat.id, { name: newName.trim() }, { requestKey: null });
            }
            alert("✅ Название команды и канала успешно изменено!");
            location.reload(); 
        } catch(e) {
            console.error(e);
            alert("❌ Ошибка при переименовании.");
        }
    }

    // 5. Исключение гонщика
    async removePlayer(riderId) { 
        if(!confirm("Исключить спортсмена из команды и вернуть в свободные агенты?")) return; 
        const oneTeam = Object.values(this.app.teamsMap).find(t => t.name && t.name.toUpperCase().includes('ONE TEAM'));
        const oneTeamId = oneTeam ? oneTeam.id : null;
        if(!oneTeamId) return alert("❌ Не найдена системная база ONE TEAM"); 
        
        try { 
            await pb.collection('riders').update(riderId, { team_id: oneTeamId, transfer_request: "" }, { requestKey: null }); 
            this.app.crm.loadData(); 
        } catch(e) { alert("❌ Ошибка удаления"); } 
    }
}
    
class MessengerApp {
        constructor() {
            this.currentUser = null; this.currentRider = null;
            this.usersMap = {}; this.userIdMap = {}; this.ridersMap = {}; this.teamsMap = {}; this.pelotonsMap = {}; 
            this.chats = []; this.activeChatId = null; this.chatSessionToken = null; 
            this.profileChartInstance = null; this.modalChartInstance = null;
            this.unreadCounts = {};
            this.ROLE_WEIGHTS = { 'superadmin': 100, 'admin': 80, 'judge': 60, 'captain': 40, 'rider': 20 };
            this.editingMessageId = null; this.replyingToMessageId = null; this.forwardingMessage = null; this.contextMessageObj = null; 
            this.fileToDelete = false; 
            this.messagePage = 1; this.hasMoreMessages = true; this.isLoadingMessages = false;
            this.currentPelotonFilter = 'all';
            this.liveInterval = null; this.expandedRaceId = null; this.currentLiveBoard = []; this.currentLiveStartList = []; this.liveCurrentTab = 'start'; this.liveSortMode = 'absolute';
			// 🔥 Переменные для нового Web Audio API
            this.audioCtx = null; 
            this.sonarBuffer = null;
			this.crm = new PelotonCRM(this);
			this.teamManager = new TeamManagerService(this);
		}
		
		openLiveBoard(raceId, event) { 
        if (this.crm && this.crm.liveService) {
            this.crm.liveService.openLiveBoard(raceId, event); 
        }
    }
    
    switchLiveTab(t) { 
        if (this.crm && this.crm.liveService) this.crm.liveService.switchLiveTab(t); 
    }
    
    switchLiveSort(s) { 
        if (this.crm && this.crm.liveService) this.crm.liveService.switchLiveSort(s); 
    }

    closeLiveBoard() { 
        if (this.crm && this.crm.liveService) this.crm.liveService.closeLiveBoard(); 
    }
	
        copyText(text, msg) {
            navigator.clipboard.writeText(text).then(() => {
                alert(msg || "Ссылка скопирована!");
            }).catch(err => {
                console.error("Ошибка копирования: ", err);
                alert("Не удалось скопировать ссылку. Возможно, браузер блокирует доступ к буферу обмена.");
            });
        }
        copyChatLink(chatId) {
            const link = `${window.location.origin}${window.location.pathname}?chat=${chatId}`;
            this.copyText(link, "🔗 Ссылка на чат скопирована в буфер обмена!");
        }
        copyUserLink(userId) {
            const link = `${window.location.origin}${window.location.pathname}?user=${userId}`;
            if (typeof this.copyText === 'function') {
                this.copyText(link, "🔗 Ссылка на профиль скопирована в буфер обмена!");
            } else {
                navigator.clipboard.writeText(link).then(() => alert("🔗 Ссылка на профиль скопирована!"));
            }
        }
        getMotoSvg(size = 24) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a9 9 0 0 0-9 9v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a9 9 0 0 0-9-9Z"></path><path d="M3 12h18"></path><path d="M8 12v6"></path><path d="M16 12v6"></path></svg>`; }
getRadarSvg(size = 24) { 
            return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`; 
        }
        getReactSvg(key, size = 16) {
            const svgs = {
                'like': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="rgba(59,130,246,0.2)" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>`,
                'fire': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="rgba(255,143,0,0.2)" stroke="#FF8F00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`,
                'heart': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="rgba(255,51,102,0.2)" stroke="#ff3366" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
                'star': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="rgba(168,85,247,0.2)" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
            }; return svgs[key] || '';
        }
        
        escapeHTML(str) {
            if (!str) return '';
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        }
        linkify(text) {
            const pattern = "(https?:\\/\\/[^\\s\\x3C]+|\\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+(?:com|ru|one|net|org|me|io|su|info|biz|by|kz)\\b[^\\s\\x3C]*)";
            const urlRegex = new RegExp(pattern, "gi");
            
            return text.replace(urlRegex, (url) => {
                let cleanUrl = url;
                let punctuation = '';
                
                if (/[.,;:!?]$/.test(cleanUrl)) {
                    punctuation = cleanUrl.slice(-1);
                    cleanUrl = cleanUrl.slice(0, -1);
                }
                
                let hrefUrl = cleanUrl;
                if (!hrefUrl.startsWith('http://') && !hrefUrl.startsWith('https://')) {
                    hrefUrl = 'https://' + hrefUrl;
                }
                
                if (hrefUrl.includes('sotka.one')) {
                    if (hrefUrl.includes('?chat=') || hrefUrl.includes('?user=') || hrefUrl.includes('?team=')) {
                        return `<a href="${hrefUrl}" style="text-decoration: underline; font-weight: inherit; color: inherit;" onclick="event.preventDefault(); event.stopPropagation(); window.app.processDeepLink('${hrefUrl}');">${cleanUrl}</a>${punctuation}`;
                    } else {
                        return `<a href="${hrefUrl}" target="_self" style="text-decoration: underline; font-weight: inherit; color: inherit;" onclick="event.stopPropagation();">${cleanUrl}</a>${punctuation}`;
                    }
                } else {
                    return `<a href="${hrefUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; font-weight: inherit; color: inherit;" onclick="event.stopPropagation();">${cleanUrl}</a>${punctuation}`;
                }
            });
        }
// 🔥 ГЕНЕРАТОР ВНУТРЕННИХ ССЫЛОК НА КОМАНДУ
        getTeamLinkHtml(teamId, teamName, color = 'var(--text-muted)') {
            // Если команды нет или это Группетто (содержит HTML) — отдаем просто текст
            if (!teamId || !teamName || teamName === 'Без команды' || String(teamName).includes('<span') || String(teamName).includes('[G:')) {
                return `<span style="color:${color};">${teamName || 'Без команды'}</span>`;
            }
            
            // Формируем ссылку на внутренний дашборд Вилки
            const url = `${window.location.origin}${window.location.pathname}?public_team=${teamId}`;
            
            // Возвращаем красивую кликабельную ссылку
            return `<a href="${url}" target="_blank" style="color:${color}; text-decoration:none; cursor:pointer; transition:0.2s;" onmouseover="this.style.textDecoration='underline'; this.style.color='var(--primary)';" onmouseout="this.style.textDecoration='none'; this.style.color='${color}';" onclick="event.stopPropagation();">${teamName}</a>`;
        }

async renderChatCurtain(chat, canManage) {
            // 1. Ищем или создаем глобальный контейнер шторки под хедером
            let container = document.getElementById('curtainContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'curtainContainer';
                const header = document.getElementById('chatHeader');
                header.parentNode.insertBefore(container, header.nextSibling);
            }
            
            // Удаляем старую кнопку "ИНФО ▼", если она осталась в кэше
            const oldBtn = document.getElementById('curtainToggleBtn');
            if (oldBtn) oldBtn.remove();

            // 2. Парсим данные
            let data = chat.panel_data || { text: "", buttons: [] };
            if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e) { data = { text: "", buttons: [] }; } }

            // Запоминаем, была ли шторка открыта до перерисовки
            const wasOpen = document.getElementById('chatCurtainPanel')?.classList.contains('open');

            // 🔥 ДОСТАЕМ ИНФУ О ГОНКЕ (Если чат привязан к событию)
            let raceObj = null;
            if (chat.race_id) {
                try { raceObj = await pb.collection('races').getOne(chat.race_id, { requestKey: null }); } catch(e) {}
            }

let html = `<div id="chatCurtainPanel" class="chat-curtain"><div class="curtain-content" style="max-height: 80vh; overflow-y: auto; overscroll-behavior: contain;">`;
            
            // Кнопка редактирования для админов/создателей
            if (canManage) {
                html += `<button onclick="window.app.openCurtainEditModal()" style="float:right; background:none; border:1px solid var(--border); color:var(--text-muted); border-radius:4px; padding:4px 8px; font-size:10px; cursor:pointer; transition: 0.2s;" onmouseover="this.style.color='var(--primary)'; this.style.borderColor='var(--primary)';" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border)';">✎ Ред.</button>`;
            }

            // Изображение
            if (chat.panel_image) {
                const imgUrl = `${pb.baseUrl}/api/files/${chat.collectionId}/${chat.id}/${chat.panel_image}`;
                html += `<a href="${imgUrl}" target="_blank"><img src="${imgUrl}" class="curtain-image" alt="Обложка"></a>`;
            }

           // 1. Сначала готовим и выводим Кнопки (Интерактивная карта + Обычные кнопки)
            let mapBtnHtml = '';
            if (data.embed_code) {
                this.currentMapEmbed = data.embed_code; 
                mapBtnHtml = `<button class="btn-black" style="width:100%; background:var(--info); color:#fff; padding:14px; border-radius:8px; font-family:'Unbounded'; font-size:11px; font-weight:800; cursor:pointer; border:none; transition:0.2s; margin-bottom:15px; box-shadow: 0 4px 15px rgba(59,130,246,0.3);" onclick="window.app.openMapModal()">🗺️ ИНТЕРАКТИВНАЯ КАРТА</button>`;
            }

            if (mapBtnHtml || (data.buttons && data.buttons.length > 0)) {
                html += `<div class="curtain-buttons">`;
                html += mapBtnHtml;
                
                if (data.buttons) {
                    data.buttons.slice(0, 5).forEach(btn => {
                        const regMatch = btn.url.match(/\[ACTION:REGISTER:([a-zA-Z0-9_]+)\]/);
                        if (regMatch) {
                            const raceIdToRegister = regMatch[1];
                            html += `<button class="curtain-btn sync-btn-${raceIdToRegister}" style="background:var(--primary); color:#000 !important; border:none;" onclick="window.app.registerForRace('${raceIdToRegister}', this, event)">⚡ ${this.escapeHTML(btn.label)}</button>`;
                        } else {
                            const target = btn.blank ? '_blank' : '_self';
                            html += `<a href="${btn.url}" target="${target}" class="curtain-btn">${this.escapeHTML(btn.label)}</a>`;
                        }
                    });
                }
                html += `</div>`;
            }

            // 🔥 2. СИСТЕМНАЯ ДИНАМИЧЕСКАЯ КНОПКА ГОНКИ (Перенесли ВВЕРХ, под обычные кнопки)
            let dynamicRaceBtn = '';
            if (raceObj) {
                if (raceObj.status === 'Registration') {
                    dynamicRaceBtn = `<button class="btn-black sync-btn-${raceObj.id}" style="width:100%; background:var(--danger); color:#fff; padding:14px; border-radius:8px; font-family:'Unbounded'; font-size:11px; font-weight:800; cursor:pointer; border:none; transition:0.2s; margin-top:10px; margin-bottom:15px; box-shadow: 0 4px 15px rgba(255,51,102,0.3);" onclick="window.app.registerForRace('${raceObj.id}', this, event)">⚡ ЗАЯВИТЬСЯ НА ГОНКУ</button>`;
                } else if (raceObj.status === 'LIVE') {
                    dynamicRaceBtn = `<button class="btn-black" style="width:100%; background:var(--danger); color:#fff; padding:14px; border-radius:8px; font-family:'Unbounded'; font-size:11px; font-weight:800; cursor:pointer; border:none; transition:0.2s; margin-top:10px; margin-bottom:15px; box-shadow: 0 4px 15px rgba(255,51,102,0.3); display:flex; align-items:center; justify-content:center; gap:8px;" onclick="window.app.openLiveBoard('${raceObj.id}', event)"><div style="width:8px; height:8px; background:#fff; border-radius:50%; animation: dot-pulse 1s infinite;"></div> ХОД ГОНКИ (LIVE)</button>`;
                } else if (raceObj.status === 'Finished') {
                    dynamicRaceBtn = `<button class="btn-black" style="width:100%; background:var(--bg-surface-hover); color:var(--text-main); border:1px solid var(--border); padding:14px; border-radius:8px; font-family:'Unbounded'; font-size:11px; font-weight:800; cursor:pointer; transition:0.2s; margin-top:10px; margin-bottom:15px;" onclick="window.app.openLiveBoard('${raceObj.id}', event)">🏆 РЕЗУЛЬТАТЫ</button>`;
                } else if (raceObj.status === 'Скоро') {
                    dynamicRaceBtn = `<button class="btn-black" style="width:100%; background:var(--bg-surface-hover); color:var(--text-muted); border:1px dashed var(--border); padding:14px; border-radius:8px; font-family:'Unbounded'; font-size:11px; font-weight:800; cursor:not-allowed; margin-top:10px; margin-bottom:15px;" disabled>⏳ АНОНС (РЕГИСТРАЦИЯ СКОРО)</button>`;
                }
            }
            
            html += dynamicRaceBtn;

            // 3. А теперь выводим Текст (строго под ВСЕМИ кнопками)
            if (data.text) {
                html += `<div style="white-space: pre-wrap; margin-bottom: 10px;">${this.linkify(this.escapeHTML(data.text))}</div>`;
            }

            const isEmpty = !chat.panel_image && !data.text && (!data.buttons || data.buttons.length === 0) && !dynamicRaceBtn;

            // Если шторка пустая и мы не админ - прячем весь блок целиком
            if (isEmpty && !canManage) {
                container.style.display = 'none';
                container.innerHTML = '';
                return;
            } else {
                container.style.display = 'block';
                if (isEmpty && canManage) {
                    html += `<div style="color:var(--text-muted); font-size:11px; text-align:center; padding:10px;">Шторка пуста. Нажмите «Ред.» чтобы добавить информацию.</div>`;
                }
            }

            html += `</div></div>`; // Закрываем .curtain-content и .chat-curtain
            
            // Добавляем ту самую новую стильную полосу
            html += `
            <div id="curtainToggleBar" class="curtain-toggle-bar" onclick="window.app.toggleChatCurtain()">
                <span id="curtainToggleText">ИНФОРМАЦИЯ</span>
                <div id="curtainHandle" class="curtain-handle"></div>
            </div>`;

            container.innerHTML = html;

            // Если шторка была открыта, возвращаем ей классы
            if (wasOpen) {
                const panel = document.getElementById('chatCurtainPanel');
                const toggleText = document.getElementById('curtainToggleText');
                const handle = document.getElementById('curtainHandle');
                const bar = document.getElementById('curtainToggleBar');

                if (panel) panel.classList.add('open');
                if (bar) bar.classList.add('open');
                if (toggleText) {
                    toggleText.innerText = 'СВЕРНУТЬ';
                    toggleText.style.color = 'var(--primary)';
                }
                if (handle) handle.style.background = 'var(--primary)';
            }
        }

        toggleChatCurtain() {
            const panel = document.getElementById('chatCurtainPanel');
            const bar = document.getElementById('curtainToggleBar');
            const text = document.getElementById('curtainToggleText');
            
            if (panel && bar && text) {
                panel.classList.toggle('open');
                bar.classList.toggle('open');
                
                if (panel.classList.contains('open')) {
                    text.innerText = 'СВЕРНУТЬ';
                } else {
                    text.innerText = 'ИНФОРМАЦИЯ';
                }
            }
        }
		openMapModal() {
            const container = document.getElementById('mapEmbedContainer');
            if (this.currentMapEmbed) {
                // 🔥 Умный фикс: Насильно заставляем iframe занять 100% ширины и высоты модалки, 
                // затирая жесткие размеры (1200x700), которые отдает MapMagic
                let responsiveEmbed = this.currentMapEmbed
                    .replace(/width="[0-9%px]+"/i, 'width="100%"')
                    .replace(/height="[0-9%px]+"/i, 'height="100%"');
                
                container.innerHTML = responsiveEmbed;
                document.getElementById('mapEmbedModal').style.display = 'flex';
            }
        }
openCurtainEditModal() {
            if (!this.activeChatId) return;
            const chat = this.chats.find(c => c.id === this.activeChatId);
            if (!chat) return;

            let data = chat.panel_data || { text: "", buttons: [] };
            if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e) { data = { text: "", buttons: [] }; } }

            document.getElementById('curtainTextInput').value = data.text || '';
            // 🔥 Загружаем код карты
            document.getElementById('curtainEmbedInput').value = data.embed_code || '';
            document.getElementById('curtainImgInput').value = '';
            document.getElementById('curtainImgDelete').checked = false;

            // Генерируем 5 слотов для кнопок
            const container = document.getElementById('curtainButtonsContainer');
            container.innerHTML = '';
            
            for (let i = 0; i < 5; i++) {
                const btn = data.buttons[i] || { label: '', url: '', blank: true };
                container.innerHTML += `
                    <div style="background:rgba(0,0,0,0.1); padding:12px; border-radius:8px; border:1px solid var(--border);">
                        <div style="font-size:10px; color:var(--text-muted); margin-bottom:8px; font-weight:bold; font-family:'Unbounded';">КНОПКА ${i+1}</div>
                        <input type="text" id="curtainBtnLabel_${i}" class="auth-input" style="margin-bottom:8px; padding:8px 12px; font-size:12px; width:100%; box-sizing:border-box;" placeholder="Название (напр. 'Регламент')" value="${this.escapeHTML(btn.label)}">
                        <input type="text" id="curtainBtnUrl_${i}" class="auth-input" style="margin-bottom:10px; padding:8px 12px; font-size:12px; width:100%; box-sizing:border-box;" placeholder="Ссылка (https://...)" value="${btn.url}">
                        <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-main); cursor:pointer;">
                            <input type="checkbox" id="curtainBtnBlank_${i}" ${btn.blank ? 'checked' : ''} style="accent-color:var(--primary); width:16px; height:16px;"> Открывать в новой вкладке
                        </label>
                    </div>
                `;
            }

            document.getElementById('chatCurtainEditModal').style.display = 'flex';
        }

        closeCurtainEditModal() {
            document.getElementById('chatCurtainEditModal').style.display = 'none';
        }

        async saveChatCurtain() {
            const btnObj = document.getElementById('curtainSaveBtn');
            btnObj.innerText = 'СОХРАНЕНИЕ...';
            btnObj.disabled = true;

            try {
                // 🔥 1. Считываем СТАРЫЕ данные чата, чтобы не затереть скрытый таймер (expiresAt)
                let existingData = {};
                const chat = this.chats.find(c => c.id === this.activeChatId);
                if (chat && chat.panel_data) {
                    existingData = typeof chat.panel_data === 'string' ? JSON.parse(chat.panel_data) : chat.panel_data;
                }

                // 2. Собираем текст и кнопки из формы
                const text = document.getElementById('curtainTextInput').value.trim();
                const embedInput = document.getElementById('curtainEmbedInput');
                const embed_code = embedInput ? embedInput.value.trim() : '';
                
                const buttons = [];
                for (let i = 0; i < 5; i++) {
                    const label = document.getElementById(`curtainBtnLabel_${i}`).value.trim();
                    const url = document.getElementById(`curtainBtnUrl_${i}`).value.trim();
                    const blank = document.getElementById(`curtainBtnBlank_${i}`).checked;
                    if (label && url) buttons.push({ label, url, blank });
                }

                // 🔥 3. СКЛЕИВАЕМ старые данные с новыми (таймер не пропадет!)
                const panelData = { ...existingData, text, buttons, embed_code };
                const formData = new FormData();
                formData.append('panel_data', JSON.stringify(panelData));

                // 3. Обрабатываем картинку (удаление или сжатие новой)
                const imgInput = document.getElementById('curtainImgInput');
                const deleteImg = document.getElementById('curtainImgDelete').checked;

                if (deleteImg) {
                    formData.append('panel_image', ''); // PocketBase удалит файл, если передать пустую строку
                } else if (imgInput.files && imgInput.files[0]) {
                    let file = imgInput.files[0];
                    // Сжимаем картинку перед отправкой (используем нашу функцию из мессенджера)
                    if (file.type.startsWith('image/')) {
                        file = await this.compressImage(file, 2); 
                    }
                    formData.append('panel_image', file);
                }

                // 4. Отправляем запрос
                const updatedChat = await pb.collection('chats').update(this.activeChatId, formData, { requestKey: null });
                
                // 5. Обновляем локальные данные и перерисовываем шторку
                const chatIndex = this.chats.findIndex(c => c.id === this.activeChatId);
                if (chatIndex !== -1) {
                    this.chats[chatIndex] = updatedChat;
                }

                this.closeCurtainEditModal();
                
                // Пересчитываем права для немедленной перерисовки
                const myRole = this.getUserMaxRole();
                const isSuper = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['superadmin']; 
                const isAdmin = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['admin']; 
                const isCaptain = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['captain'] && updatedChat.team_id === this.currentRider.team_id; 
                const isCreator = (updatedChat.type === 'private' || updatedChat.type === 'gruppetto') && updatedChat.participants[0] === this.currentRider.id;
                const canManageChat = isSuper || isAdmin || isCaptain || isCreator;
                
                // Перерисовываем и открываем, чтобы показать результат
                this.renderChatCurtain(updatedChat, canManageChat);
                const panel = document.getElementById('chatCurtainPanel');
                const toggleText = document.getElementById('curtainToggleText');
                const handle = document.getElementById('curtainHandle');

                if (panel) panel.classList.add('open');
                if (toggleText) {
                    toggleText.innerText = 'СВЕРНУТЬ';
                    toggleText.style.color = 'var(--primary)';
                }
                if (handle) handle.style.background = 'var(--primary)';
                
                // 🔥 Вызываем сканер кнопок (Опционально, но я бы оставил)
                if (typeof this.syncRaceButtonsState === 'function') {
                    this.syncRaceButtonsState();
                }

            } catch (e) {
                console.error(e);
                alert("Ошибка при сохранении шторки. Проверьте права доступа.");
            } finally {
                btnObj.innerText = 'СОХРАНИТЬ';
                btnObj.disabled = false;
            }
        }
        async processDeepLink(urlStr) {
            try {
                const urlObj = new URL(urlStr);
                const tChat = urlObj.searchParams.get('chat');
                const tUser = urlObj.searchParams.get('user');
                const tTeam = urlObj.searchParams.get('team');

                if (tChat) {
                    if (tChat === 'newsfeed') this.openNewsFeed();
                    else { const cExists = this.chats.find(x => x.id === tChat); if (cExists) this.openChat(tChat); else alert("Чат не найден или у вас нет доступа."); }
                } else if (tUser) {
                    this.switchTab('chats'); await this.startDirectChat(tUser);
                } else if (tTeam) {
                    const tc = this.chats.find(c => c.team_id === tTeam && (c.type === 'team' || c.type === 'team_channel')); if (tc) this.openChat(tc.id); else alert("Чат команды не найден или скрыт.");
                }
            } catch(e) { console.error(e); }
        }

        toggleTheme() {
            const themes = ['dark', 'light', 'yellow']; const current = document.documentElement.getAttribute('data-theme'); let idx = themes.indexOf(current); if (idx === -1) idx = 0; const nextTheme = themes[(idx + 1) % themes.length];
            document.documentElement.setAttribute('data-theme', nextTheme); localStorage.setItem('sotka_theme', nextTheme);
            if (this.profileChartInstance) { let gridColor = nextTheme === 'dark' ? '#2a2c38' : (nextTheme === 'yellow' ? '#FFCA28' : '#e2e8f0'); this.profileChartInstance.options.scales.y.grid.color = gridColor; this.profileChartInstance.update(); }
            if (this.modalChartInstance) { let gridColor = nextTheme === 'dark' ? '#2a2c38' : (nextTheme === 'yellow' ? '#FFCA28' : '#e2e8f0'); this.modalChartInstance.options.scales.y.grid.color = gridColor; this.modalChartInstance.update(); }
        }

        switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            
            const targetTab = document.getElementById(`tab-${tabId}`);
            if (targetTab) targetTab.classList.add('active');
            
            const targetNav = document.getElementById(`nav-btn-${tabId}`);
            if (targetNav) targetNav.classList.add('active');
            
            if (tabId === 'profile') { if (this.currentRider && this.currentRider.id) this.renderProfileTab(this.currentRider.id); else document.getElementById('profileTabContent').innerHTML = `<div style="text-align:center; padding: 50px; color:var(--danger); font-family:'Unbounded';">ПРОФИЛЬ НЕ ЗАГРУЖЕН</div>`; }
            if (tabId === 'contacts') this.renderContactsTab('');
            if (tabId === 'pelotons') this.renderPelotonsTab();

            if (tabId === 'pelotons') {
                document.body.classList.add('peloton-mode');
                // 🔥 ФИКС: Принудительно скачиваем данные Пелотона, чтобы не было пустого экрана!
                if (this.crm) {
                    this.crm.loadData();
                }
            } else {
                document.body.classList.remove('peloton-mode');
            }
        }

        getUserMaxRole() {
            const roles = this.usersMap[this.currentRider?.email] || []; let maxWeight = 0; let topRole = 'rider';
            for (let r of roles) { if (this.ROLE_WEIGHTS[r] > maxWeight) { maxWeight = this.ROLE_WEIGHTS[r]; topRole = r; } } return topRole;
        }

        getCaptainByTeam(teamId) {
            // 🔥 Теперь ищем капитана прямо в таблице riders по новому полю roles
            return Object.values(this.ridersMap).find(r => r.team_id === teamId && r.roles && Array.isArray(r.roles) && r.roles.includes('captain')) || null;
        }

        async waitForTildaAuth(maxRetries = 20) { // 🔥 Увеличили время ожидания до 10 секунд
            for (let r = 0; r < maxRetries; r++) {
                let email = null;
                
                // 1. Проверяем глобальный объект Тильды (Тильда иногда прячет email в .info)
                if (window.t_member && window.t_member.email) email = window.t_member.email;
                if (!email && window.t_member && window.t_member.info && window.t_member.info.email) email = window.t_member.info.email;

                // 2. Ищем в localStorage (если стояла галочка "Запомнить меня")
                if (!email) {
                    try {
                        for (let i = 0; i < localStorage.length; i++) {
                            const k = localStorage.key(i);
                            if (k && k.startsWith('tilda_members_profile')) {
                                const val = JSON.parse(localStorage.getItem(k));
                                if (val && (val.login || val.email)) { email = val.login || val.email; break; }
                            }
                        }
                    } catch(e) {}
                }

                // 3. 🔥 НОВОЕ: Ищем в sessionStorage (если вошли без галочки "Запомнить")
                if (!email) {
                    try {
                        for (let i = 0; i < sessionStorage.length; i++) {
                            const k = sessionStorage.key(i);
                            if (k && k.startsWith('tilda_members_profile')) {
                                const val = JSON.parse(sessionStorage.getItem(k));
                                if (val && (val.login || val.email)) { email = val.login || val.email; break; }
                            }
                        }
                    } catch(e) {}
                }

                // Если нашли почту — сразу отдаем её
                if (email) return email.toLowerCase().trim();
                
                // Иначе ждем полсекунды и пробуем снова
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            return null; 
        }
        
        monitorTildaAuth(originalEmail) {
            const checkAuth = () => {
                let currentEmail = null;
                if (window.t_member && window.t_member.email) { currentEmail = window.t_member.email.toLowerCase().trim(); } 
                else { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('tilda_members_profile')) { try { const val = JSON.parse(localStorage.getItem(k)); currentEmail = (val.login || val.email).toLowerCase().trim(); } catch(e) {} } } }
                if (currentEmail !== originalEmail) { 
                    showVilkaSplash();
                    console.log("🔒 Сессия завершена. Перезагрузка..."); 
                    setTimeout(() => { window.location.reload(true); }, 400);
                }
            };
            document.body.addEventListener('click', () => setTimeout(checkAuth, 100));
            document.body.addEventListener('touchstart', () => setTimeout(checkAuth, 100));
            document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkAuth(); });
        }

        hideTildaWidget() {
            const style = document.createElement('style');
            style.innerHTML = `#tbase-widget-container, .tbase-widget-container, .t-login-widget, .t-member-widget, #t-member-widget, .tca-widget-profile, div[id^="t-member-widget"] { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; z-index: -99999 !important; }`;
            document.head.appendChild(style);
        }

        async updateOnlineStatus() {
            if(!this.currentRider) return;
            try { await pb.collection('riders').update(this.currentRider.id, { last_active: new Date().toISOString() }, { requestKey: null }); const allRiders = await pb.collection('riders').getFullList({ expand: 'team_id', requestKey: null }); allRiders.forEach(r => { this.ridersMap[r.id] = r; }); if (document.getElementById('tab-chats').classList.contains('active')) this.renderChatList(document.getElementById('chatSearch').value); } catch(e) {}
        }

        renderAvatar(riderId, avatarStyle, avatarLetter) {
            const r = this.ridersMap[riderId]; let dot = '';
            if (r && r.last_active) { const diff = Date.now() - new Date(r.last_active).getTime(); if (diff < 5 * 60 * 1000) dot = `<div style="width:12px; height:12px; background:var(--success); border-radius:50%; border:2px solid var(--bg-surface); position:absolute; bottom:-2px; right:-2px; z-index:2;"></div>`; }
            return `<div style="position:relative; display:inline-block; flex-shrink:0;" onclick="event.stopPropagation(); window.app.openProfile('${riderId}', event)"><div class="avatar clickable" style="${avatarStyle}" title="Открыть профиль">${avatarLetter}</div>${dot}</div>`;
        }

        // ==========================================
        // 🔥 ПУБЛИЧНАЯ ВИТРИНА КОМАНДЫ (ДЛЯ ГОСТЕЙ)
        // ==========================================
        async renderPublicTeamDashboard(teamId) {
            const container = document.getElementById('publicDashboardContainer');
            container.innerHTML = `<div style="display:flex; height:100vh; align-items:center; justify-content:center;"><div class="spinner" style="width:50px; height:50px; border-width:4px; border-color:var(--primary) transparent transparent transparent;"></div></div>`;
            try {
                // 1. Грузим данные команды
                const team = await pb.collection('teams').getOne(teamId, { requestKey: null });
                
                // 2. Грузим состав
                const roster = await pb.collection('riders').getFullList({ filter: `team_id="${teamId}"`, sort: '-rating', requestKey: null });
                const males = roster.filter(r => r.gender === 'M' || r.gender === 'М').length;
                const females = roster.filter(r => r.gender === 'F' || r.gender === 'Ж').length;
                const captain = roster.find(r => r.roles && r.roles.includes('captain'));
                const capName = captain ? `${captain.first_name} ${captain.last_name}` : 'Не назначен';
                
                // 3. Ищем публичный канал команды для новостей
                let teamChats = [];
                try {
                    teamChats = await pb.collection('chats').getFullList({ filter: `team_id="${teamId}" && type="team_channel"`, requestKey: null });
                } catch(e) {}
                
                let newsHtml = '<div style="color:var(--text-muted); font-size:12px; text-align:center; padding:30px; background:var(--bg-surface); border-radius:12px;">Публикаций пока нет</div>';
                if (teamChats.length > 0) {
                    const channelId = teamChats[0].id;
                    const msgs = await pb.collection('messages').getList(1, 10, { filter: `chat_id="${channelId}"`, sort: '-created', expand: 'sender_id', requestKey: null });
                    if (msgs.items.length > 0) {
                        newsHtml = msgs.items.map(m => {
                            const sender = m.expand?.sender_id;
                            const sName = sender ? `${sender.first_name} ${sender.last_name}` : 'Команда';
                            const date = new Date(m.created).toLocaleDateString('ru-RU', {day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'});
                            let text = m.text || '';
                            let title = text.split('\n')[0];
                            let body = text.split('\n').slice(1).join('\n');
                            
                            let fileHtml = '';
                            if (m.file && m.file.length > 0) {
                                let fName = Array.isArray(m.file) ? m.file[0] : m.file;
                                if (fName.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
                                    fileHtml = `<img src="${pb.baseUrl}/api/files/${m.collectionId}/${m.id}/${fName}" style="max-width:100%; border-radius:8px; margin-top:12px; max-height:400px; object-fit:cover; border:1px solid var(--border);">`;
                                }
                            }
                            return `
                            <div style="background:var(--bg-surface); padding:20px; border-radius:15px; margin-bottom:15px; border:1px solid var(--border); box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                                <div style="font-size:11px; color:var(--text-muted); margin-bottom:10px; font-family:'Roboto Mono';">${date} • ${sName}</div>
                                <div style="font-weight:800; font-family:'Unbounded'; font-size:16px; margin-bottom:8px; color:var(--text-main); line-height:1.3;">${this.escapeHTML(title)}</div>
                                <div style="font-size:14px; color:var(--text-main); white-space:pre-wrap; line-height:1.5; opacity:0.85;">${this.linkify(this.escapeHTML(body))}</div>
                                ${fileHtml}
                            </div>`;
                        }).join('');
                    }
                }
                
                // 4. Генерируем HTML Состава (Таблица)
                this.publicRosterData = roster;
                this.publicRosterSort = { field: 'rating', dir: 'desc' };

                let rosterHtml = `
                <div style="background:var(--bg-surface); border-radius:15px; border:1px solid var(--border); overflow:hidden; overflow-x:auto;">
                    <table style="width:100%; text-align:left; border-collapse:collapse;">
                        <thead>
                            <tr style="background:rgba(0,0,0,0.2); cursor:pointer;">
                                <th onclick="window.app.sortPublicRoster('name')" style="padding:15px 10px; font-size:11px; color:var(--text-muted); font-family:'Unbounded'; white-space:nowrap; transition:0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'">СПОРТСМЕН <span id="sort-name"></span></th>
                                <th onclick="window.app.sortPublicRoster('cat')" style="padding:15px 10px; font-size:11px; color:var(--text-muted); font-family:'Unbounded'; text-align:center; width:60px; white-space:nowrap; transition:0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'">КАТ. <span id="sort-cat"></span></th>
                                <th onclick="window.app.sortPublicRoster('rating')" style="padding:15px 10px; font-size:11px; color:var(--text-muted); font-family:'Unbounded'; text-align:left; width:80px; white-space:nowrap; transition:0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'">ОЧКИ <span id="sort-rating">▼</span></th>
                            </tr>
                        </thead>
                        <tbody id="publicRosterTbody">
                            ${this.generatePublicRosterRows()}
                        </tbody>
                    </table>
                </div>`;

               // 5. Собираем страницу
                // 🔥 ФИКС ЛОГИКИ: Меняем параметр на join_team
                const appUrl = `${window.location.origin}/vilka?join_team=${teamId}`;
                
                // 🔥 ФИКС ДИЗАЙНА: Вшиваем шрифты и темную тему прямо в дашборд
                container.innerHTML = `
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Unbounded:wght@700;800&family=Roboto+Mono:wght@700&display=swap');
                        
                        /* 🔥 Убиваем белый фон браузера навсегда */
                        body { background-color: #18181b !important; margin: 0 !important; }
                        
                        .public-dash-wrapper {
                            --bg-body: #18181b;
                            --bg-surface: #27272a;
                            --text-main: #f4f4f5;
                            --text-muted: #a1a1aa;
                            --primary: #ffc107;
                            --border: rgba(255,255,255,0.1);
                            --info: #3b82f6;
                            
                            background-color: var(--bg-body);
                            color: var(--text-main);
                            padding: 20px 0;
                            font-family: 'Manrope', sans-serif;
                        }
						/* 🔥 КАСТОМНЫЙ СКРОЛЛБАР В СТИЛЕ VILKA */
                        ::-webkit-scrollbar {
                            width: 8px; /* Ширина вертикального скролла */
                            height: 8px; /* Высота горизонтального скролла (если будет) */
                        }
                        ::-webkit-scrollbar-track {
                            background: #18181b; /* Цвет дорожки */
                        }
                        ::-webkit-scrollbar-thumb {
                            background: #3f3f46; /* Цвет ползунка (темно-серый) */
                            border-radius: 10px; /* Закругления */
                        }
                        ::-webkit-scrollbar-thumb:hover {
                            background: #ffc107; /* Желтый при наведении */
                        }
                        /* Для Firefox */
                        * {
                            scrollbar-width: thin;
                            scrollbar-color: #3f3f46 #18181b;
                        }
                    </style>

                    <div class="public-dash-wrapper">
                        <div id="publicTeamContent" style="max-width:800px; margin:0 auto; padding:20px;">
                            
                            <div style="text-align:center; padding:50px 20px; background:linear-gradient(180deg, rgba(255,193,7,0.05) 0%, var(--bg-surface) 100%); border-radius:20px; border:1px solid var(--border); margin-bottom:20px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                                <div style="width:90px; height:90px; border-radius:50%; background:var(--primary); color:#000; font-size:36px; font-family:'Unbounded'; font-weight:800; display:flex; align-items:center; justify-content:center; margin:0 auto 20px auto; box-shadow: 0 0 20px rgba(255,193,7,0.4);">
                                    ${team.name.charAt(0).toUpperCase()}
                                </div>
                                <h1 style="font-family:'Unbounded'; font-size:36px; font-weight:800; color:var(--text-main); margin:0 0 10px 0; text-transform:uppercase;">${this.escapeHTML(team.name)}</h1>
                                <div style="color:var(--text-muted); font-size:14px; margin-bottom:25px;">Капитан: <b style="color:var(--text-main);">${this.escapeHTML(capName)}</b></div>
                                
                                <a href="${appUrl}" target="_blank" style="display:inline-block; background:var(--primary); color:#000; font-family:'Unbounded'; font-size:14px; font-weight:800; padding:16px 40px; border-radius:50px; text-decoration:none; text-transform:uppercase; box-shadow:0 10px 25px rgba(255,193,7,0.3); transition:0.2s;">ВСТУПИТЬ В КОМАНДУ</a>
                            </div>
                            
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:40px;">
                                <div style="background:var(--bg-surface); padding:25px; border-radius:15px; border:1px solid var(--border); text-align:center;">
                                    <div style="font-size:10px; color:var(--text-muted); font-family:'Unbounded'; margin-bottom:8px;">СУММАРНЫЙ РЕЙТИНГ</div>
                                    <div style="font-size:28px; font-weight:800; color:var(--primary); font-family:'Unbounded';">${team.points||0} <span style="font-size:14px; color:var(--text-muted);">pts</span></div>
                                </div>
                                <div style="background:var(--bg-surface); padding:25px; border-radius:15px; border:1px solid var(--border); text-align:center;">
                                    <div style="font-size:10px; color:var(--text-muted); font-family:'Unbounded'; margin-bottom:8px;">УЧАСТНИКОВ</div>
                                    <div style="font-size:28px; font-weight:800; color:var(--text-main); font-family:'Unbounded';">${roster.length}</div>
                                </div>
                                <div style="background:var(--bg-surface); padding:25px; border-radius:15px; border:1px solid var(--border); text-align:center;">
                                    <div style="font-size:10px; color:var(--text-muted); font-family:'Unbounded'; margin-bottom:8px;">СОСТАВ (М / Ж)</div>
                                    <div style="font-size:28px; font-weight:800; color:var(--text-main); font-family:'Unbounded';">${males} <span style="color:var(--text-muted);">/</span> ${females}</div>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:30px;">
                                
                                <div>
                                    <h2 style="font-family:'Unbounded'; font-size:18px; color:var(--text-main); margin-bottom:20px; display:flex; align-items:center; gap:10px;">
                                        <span style="display:inline-block; width:10px; height:10px; background:var(--primary); border-radius:50%;"></span>
                                        НОВОСТИ КОМАНДЫ
                                    </h2>
                                    ${newsHtml}
                                </div>
                                
                                <div>
                                    <h2 style="font-family:'Unbounded'; font-size:18px; color:var(--text-main); margin-bottom:20px; display:flex; align-items:center; gap:10px;">
                                        <span style="display:inline-block; width:10px; height:10px; background:var(--info); border-radius:50%;"></span>
                                        ВЕЛОГОНЩИКИ
                                    </h2>
                                    ${rosterHtml}
                                </div>

                            </div>
                            
                            <div style="text-align:center; padding:40px; margin-top:40px; border-top:1px solid var(--border); color:var(--text-muted); font-size:11px; font-family:'Unbounded'; opacity:0.5;">
                                POWERED BY VILKA RADIO &bull; ЭКОСИСТЕМА SOTKA
                            </div>
                        </div>
                    </div>
                `;
				// 🔥 АБСОЛЮТНОЕ ОРУЖИЕ: Измеряем контент каждую секунду
                setInterval(() => {
                    const wrapper = document.querySelector('.public-dash-wrapper');
                    if (wrapper) {
                        // offsetHeight берет размер строго по контенту
                        const trueHeight = wrapper.offsetHeight;
                        if (trueHeight > 100) {
                            window.parent.postMessage({ type: 'vilka-resize', height: trueHeight }, '*');
                        }
                    }
                }, 1000); // 1000 мс = 1 секунда
                
            } catch(e) {
                console.error(e);
                container.innerHTML = `<div style="text-align:center; padding:50px; font-family:'Unbounded'; color:var(--danger);">ОШИБКА: Команда не найдена.</div>`;
            }
        }
		
		// Вспомогательная функция отрисовки строк
        generatePublicRosterRows() {
            if (!this.publicRosterData || this.publicRosterData.length === 0) {
                return '<tr><td colspan="3" style="padding:20px; text-align:center; color:var(--text-muted); font-size:12px;">Состав пуст</td></tr>';
            }
            return this.publicRosterData.map(r => {
                const name = this.escapeHTML(`${r.first_name} ${r.last_name}`);
                const cat = r.base_cluster || 'B';
                const rating = r.rating || 0;
                return `
                <tr style="border-bottom:1px solid var(--border); transition:0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                    <td style="padding:15px 10px; font-weight:bold; font-size:13px; color:var(--text-main);">${name}</td>
                    <td style="padding:15px 10px; text-align:center; font-size:12px; font-weight:bold; font-family:'Roboto Mono'; color:var(--text-muted);">${cat}</td>
                    <td style="padding:15px 10px; text-align:left; font-size:14px; font-weight:bold; font-family:'Roboto Mono'; color:var(--primary);">${rating}</td>
                </tr>`;
            }).join('');
        }

        // Вспомогательная функция сортировки таблицы при клике на заголовки
        sortPublicRoster(field) {
            if (this.publicRosterSort.field === field) {
                this.publicRosterSort.dir = this.publicRosterSort.dir === 'asc' ? 'desc' : 'asc';
            } else {
                this.publicRosterSort.field = field;
                this.publicRosterSort.dir = field === 'rating' ? 'desc' : 'asc';
            }
            
            this.publicRosterData.sort((a, b) => {
                let valA = a[field]; let valB = b[field];
                if (field === 'name') {
                    valA = `${a.first_name} ${a.last_name}`; valB = `${b.first_name} ${b.last_name}`;
                } else if (field === 'cat') {
                    valA = a.base_cluster || 'B'; valB = b.base_cluster || 'B';
                } else if (field === 'rating') {
                    valA = a.rating || 0; valB = b.rating || 0;
                }
                
                if (valA < valB) return this.publicRosterSort.dir === 'asc' ? -1 : 1;
                if (valA > valB) return this.publicRosterSort.dir === 'asc' ? 1 : -1;
                return 0;
            });
            
            document.getElementById('publicRosterTbody').innerHTML = this.generatePublicRosterRows();
            
            document.getElementById('sort-name').innerText = field === 'name' ? (this.publicRosterSort.dir === 'asc' ? '▲' : '▼') : '';
            document.getElementById('sort-cat').innerText = field === 'cat' ? (this.publicRosterSort.dir === 'asc' ? '▲' : '▼') : '';
            document.getElementById('sort-rating').innerText = field === 'rating' ? (this.publicRosterSort.dir === 'asc' ? '▲' : '▼') : '';
        }

        // 🔥 ОТПРАВКА ВЫСОТЫ ВО ВНЕШНИЙ IFRAME (ТИЛЬДА)
        sendIframeHeight() {
            const container = document.getElementById('publicDashboardContainer');
            if (container) {
                const height = container.scrollHeight;
                // Шлем сообщение сайту-родителю
                window.parent.postMessage({ type: 'vilka-resize', height: height }, '*');
            }
        }

        async init() {
            const urlParams = new URLSearchParams(window.location.search);
            
            // 🔥 ПЕРЕХВАТЧИК ПУБЛИЧНОЙ ВИТРИНЫ (РАБОТАЕТ БЕЗ АВТОРИЗАЦИИ)
            const publicTeamId = urlParams.get('public_team');
            if (publicTeamId) {
                hideVilkaSplash();
                // Стираем весь стандартный интерфейс Вилки (сайдбары, чаты)
                document.body.innerHTML = '<div id="publicDashboardContainer" style="width:100%; background:var(--bg-body); color:var(--text-main); overflow-x:hidden;"></div>';
                // Рисуем витрину и ПРЕРЫВАЕМ загрузку приложения
                await this.renderPublicTeamDashboard(publicTeamId);
                return; 
            }
			// 🔥 ВОССТАНАВЛИВАЕМ АНИМАЦИЮ РАДАРА
            if (!document.getElementById('radar-pulse-style')) {
                const style = document.createElement('style');
                style.id = 'radar-pulse-style';
                style.innerHTML = `
                    @keyframes radarPulseBtn {
                        0% { box-shadow: 0 0 0 0 rgba(255, 51, 102, 0.7); }
                        70% { box-shadow: 0 0 0 8px rgba(255, 51, 102, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(255, 51, 102, 0); }
                    }
                    .radar-pulse-anim { animation: radarPulseBtn 1.5s infinite !important; }
                `;
                document.head.appendChild(style);
            }

            const isSupportRequest = urlParams.get('support') === '1';
            const supportAdminId = "blf8xys1c833b3p"; 

            let email = await this.waitForTildaAuth();
            let guestId = localStorage.getItem('vilka_guest_id');
            let isGuest = false;

            if (isSupportRequest) {
                if (email) { try { this.currentRider = await pb.collection('riders').getFirstListItem(`email="${email}"`, { requestKey: null }); } catch(e) {} }
                
                if (!this.currentRider) {
                    isGuest = true;
                    if (guestId) { try { this.currentRider = await pb.collection('riders').getOne(guestId, { requestKey: null }); } catch(e) { guestId = null; } }
                    if (!guestId) {
                        const randomNum = Math.floor(1000 + Math.random() * 9000);
                        try {
                            this.currentRider = await pb.collection('riders').create({
                                first_name: "Гость", last_name: `#${randomNum}`, email: `guest_${Date.now()}@sotka.one`, base_cluster: "O"
                            }, { requestKey: null });
                            localStorage.setItem('vilka_guest_id', this.currentRider.id);
                        } catch(e) { console.error("Ошибка гостя", e); return; }
                    }
                }
            } else {
                if (!email) {
                    if (guestId) {
                        try { this.currentRider = await pb.collection('riders').getOne(guestId, { requestKey: null }); isGuest = true; } catch(e) { guestId = null; }
                    }
                    if (!guestId) {
                        hideVilkaSplash();
                        
                        // 1. ОФОРМЛЯЕМ ЛЕВУЮ ПАНЕЛЬ (Кнопка входа и поддержка)
                        document.getElementById('chatList').innerHTML = `
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center; gap: 15px; margin-top: 20px;">
                                <div style="color: var(--text-muted); font-size: 11px; font-weight: bold; text-transform: uppercase;">Для доступа к радио необходима авторизация</div>
                                
                                <a href="#openmembersbar" onclick="event.preventDefault(); const topBtn = document.querySelector('.sidebar-header a[href=\\'#openmembersbar\\']'); if(topBtn) topBtn.click();" style="background: var(--primary); color: #000; padding: 14px 20px; border-radius: 8px; font-family: 'Unbounded'; font-weight: 800; font-size: 11px; text-decoration: none; display: block; width: 100%; box-sizing: border-box; box-shadow: 0 4px 15px rgba(255, 193, 7, 0.2); transition: 0.2s;">ВОЙТИ В АККАУНТ</a>
                                
                                <a href="?support=1" style="color: var(--text-muted); font-size: 10px; text-decoration: underline; cursor: pointer; margin-top: 10px;" onclick="event.preventDefault(); window.history.replaceState({}, '', '?support=1'); window.location.reload();">Нужна помощь? Связаться с поддержкой</a>
                            </div>`; 
                            
                        // 2. ОЧИЩАЕМ ПРАВУЮ ПАНЕЛЬ (Стильная заглушка)
                        document.getElementById('messagesContainer').innerHTML = `
                            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-muted); font-family:'Unbounded';">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.2; margin-bottom:15px;">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                                </svg>
                                <div style="font-size:12px; opacity:0.3; letter-spacing: 2px;">VILKA RADIO</div>
                            </div>`;
                            
                        return; 
                    }
                } else {
                    this.monitorTildaAuth(email);
                    this.currentRider = await window.sotkaAuth.startAuthProcess(email);
                }
            }

            try {
                this.updateOnlineStatus(); setInterval(() => this.updateOnlineStatus(), 120000);

                const [allUsers, allRiders, allTeams, allPelotons] = await Promise.all([ pb.collection('users').getFullList({ requestKey: null }), pb.collection('riders').getFullList({ expand: 'team_id', requestKey: null }), pb.collection('teams').getFullList({ sort: 'name', requestKey: null }), pb.collection('pelotons').getFullList({ sort: 'name', requestKey: null }) ]);
                
                allUsers.forEach(u => { this.usersMap[u.email] = u.role || []; this.userIdMap[u.email] = u.id; }); 
                
                allRiders.forEach(r => { 
                    this.ridersMap[r.id] = r; 
                    // 🔥 СЛИВАЕМ роли из riders (captain) в общую память приложения
                    if (r.email && r.roles && Array.isArray(r.roles)) {
                        if (!this.usersMap[r.email]) this.usersMap[r.email] = [];
                        this.usersMap[r.email] = [...new Set([...this.usersMap[r.email], ...r.roles])];
                    }
                }); 
                
                allTeams.forEach(t => { this.teamsMap[t.id] = t; }); 
                allPelotons.forEach(p => { this.pelotonsMap[p.id] = p; });

                const myRole = this.getUserMaxRole(); const isManager = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['admin'];
                let createOpts = `<option value="">Без привязки (Глобально)</option>`; 
                allPelotons.forEach(p => { 
                    let canSee = false; if (isManager) canSee = true; else if (!p.is_private) canSee = true; else if (p.is_private && p.allowed_teams && Array.isArray(p.allowed_teams) && p.allowed_teams.includes(this.currentRider.team_id)) canSee = true;
                    if (canSee) { let lockText = p.is_private ? ' 🔒' : ''; createOpts += `<option value="${p.id}">${p.name}${lockText}</option>`; }
                }); 
                if(!isGuest) document.getElementById('groupPelotonSelect').innerHTML = createOpts;
                
                const myTeam = this.teamsMap[this.currentRider.team_id];
                if (myTeam && myTeam.peloton_id) { let dp = Array.isArray(myTeam.peloton_id) ? myTeam.peloton_id[0] : myTeam.peloton_id; if (this.pelotonsMap[dp]) { this.currentPelotonFilter = dp; document.getElementById('currentPelotonLabel').innerText = this.pelotonsMap[dp].name; } }

                await this.loadChats();
                
                hideVilkaSplash();
                
                setTimeout(async () => {
                    const tChat = urlParams.get('chat');
                    const tUser = urlParams.get('user');
                    const tTeam = urlParams.get('team');
                    const tJoin = urlParams.get('join_team'); // 🔥 НОВЫЙ ПАРАМЕТР

                    if (isSupportRequest) {
                        this.switchTab('chats');
                        await this.startDirectChat(supportAdminId);
                    }
                    else if (tJoin) {
                        // 🔥 ПРОВЕРКА НА ГОСТЯ: Отправляем в родную регистрацию
                        if (isGuest) {
                            alert("Для вступления в команду необходимо создать профиль гонщика SOTKA!");
                            // Перезагружаем Вилку, выключая публичный режим, но сохраняя ID команды
                            window.location.href = `${window.location.origin}/vilka?join_team=${tJoin}`; 
                            return;
                        }
                        
                        // 🔥 ЛОГИКА ПОДАЧИ ЗАЯВКИ (для тех, кто уже зарегистрирован)
                        const targetCaptain = this.getCaptainByTeam(tJoin);
                        if (targetCaptain) {
                            this.switchTab('chats');
                            await this.requestToJoinTeam(tJoin, targetCaptain.id);
                        } else {
                            alert("У этой команды пока нет назначенного капитана.");
                            this.openNewsFeed();
                        }
                    }
                    else if (tChat) {
                        if (tChat === 'newsfeed') this.openNewsFeed();
                        else { const cExists = this.chats.find(x => x.id === tChat); if (cExists) this.openChat(tChat); else alert("Чат не найден или закрыт."); }
                    } else if (tUser) {
                        this.switchTab('chats'); await this.startDirectChat(tUser);
                    } else if (tTeam) {
                        const tc = this.chats.find(c => c.team_id === tTeam && (c.type === 'team' || c.type === 'team_channel'));
                        if (tc) this.openChat(tc.id); else alert("Чат команды не найден.");
                    } else if (window.innerWidth > 768 && !isGuest) {
                        this.openNewsFeed();
                    }
                    
                    if (tChat || tUser || tTeam || tJoin || isSupportRequest) window.history.replaceState({}, document.title, window.location.pathname);
                }, 800);
                
                const msgInput = document.getElementById('messageInput');
                if (msgInput) { msgInput.addEventListener('input', function() { this.style.height = '46px'; this.style.height = Math.min(this.scrollHeight, 250) + 'px'; }); }
                
                const msgCont = document.getElementById('messagesContainer');
                msgCont.addEventListener('scroll', async (e) => { if (e.target.scrollTop === 0 && this.hasMoreMessages && !this.isLoadingMessages) await this.loadMoreMessages(); const scrollBottomBtn = document.getElementById('scrollBottomBtn'); if (e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight > 300) scrollBottomBtn.style.display = 'flex'; else scrollBottomBtn.style.display = 'none'; });

                setTimeout(() => this.runSystemMaintenance(), 3000);
                this.initNotifications();

                pb.collection('chats').subscribe('*', async (e) => { await this.loadChats(); if(e.record.id === this.activeChatId) this.renderPinnedMessage(); });
                pb.collection('messages').subscribe('*', async (e) => {
                    const msgChatId = Array.isArray(e.record.chat_id) ? e.record.chat_id[0] : e.record.chat_id;
                    // 🔥 Защита от массивов PocketBase
                    const actualSenderId = Array.isArray(e.record.sender_id) ? e.record.sender_id[0] : e.record.sender_id;

                    if (msgChatId === this.activeChatId) {
                        if (e.action === 'create') {
                            const container = document.getElementById('messagesContainer');
                            if(container) { 
                                try { 
                                    let rec = e.record; 
                                    if (rec.reply_to || rec.forwarded_from) rec = await pb.collection('messages').getOne(rec.id, { expand: 'reply_to,forwarded_from', requestKey: null }); 
                                    this.appendMessageHTML(rec, container, false); 
                                    this.markMessagesAsRead([rec]); 
                                    if (container.scrollHeight - container.scrollTop - container.clientHeight < 150) this.scrollToBottom(); 
                                } catch(err) {} 
                            }
                            
                            if (document.hidden) {
                                // Если свернут браузер -> играем звук + показываем карточку
                                this.triggerNotification(e.record, msgChatId);
                            } else if (actualSenderId !== this.currentRider.id) {
                                // Если чат открыт и это ЧУЖОЕ сообщение -> только играем звук
                                this.playIncomingSound();
                            }
                        } else if (e.action === 'update' || e.action === 'delete') { 
                            // 🔥 ФИКС: Амортизатор обновлений. Ждем 400мс, пока отметки "прочитано" проставятся
                            if (this.softRefreshTimeout) clearTimeout(this.softRefreshTimeout);
                            this.softRefreshTimeout = setTimeout(() => {
                                this.softRefreshMessages();
                            }, 400);
                        }
                    } else if (this.activeChatId === 'newsfeed') {
                        const chatObj = this.chats.find(c => c.id === msgChatId);
                        if (chatObj && chatObj.type === 'team_channel') this.openNewsFeed();
                    } else if (e.action === 'create' && actualSenderId !== this.currentRider.id) { 
                        // 🔥 ФИКС БЕЗОПАСНОСТИ: Проверяем, имею ли я отношение к этому чату (свернутому)
                        const targetChat = this.chats.find(c => c.id === msgChatId);
                        if (targetChat) {
                            this.unreadCounts[msgChatId] = (this.unreadCounts[msgChatId] || 0) + 1; 
                            const searchInp = document.getElementById('chatSearch');
                            this.renderChatList(searchInp ? searchInp.value : ''); 
                            this.triggerNotification(e.record, msgChatId); 
                        }
                    }
                });
                
                let wakeUpTimeout = null;
                const handleAppWakeUp = () => {
                    if (document.visibilityState !== 'visible') return;
                    if (wakeUpTimeout) clearTimeout(wakeUpTimeout);
                    wakeUpTimeout = setTimeout(() => { try { this.updateOnlineStatus(); this.loadChats(); if (this.activeChatId === 'newsfeed') this.openNewsFeed(); else if (this.activeChatId) this.softRefreshMessages(); } catch(e) { } }, 1500); 
                };
                document.addEventListener('visibilitychange', handleAppWakeUp);
                window.addEventListener('pageshow', handleAppWakeUp); 
            } catch(e) { document.getElementById('chatList').innerHTML = `<div style="padding:20px; text-align:center; color:var(--danger); font-size:12px;">Ошибка загрузки: ${e.message}</div>`; hideVilkaSplash(); }
        }
		
        renderPelotonsTab(filterText = "") {
            const container = document.getElementById('pelotonList'); 
            if (!container) return;

            // 1. Узнаем имя текущего пелотона
            let currentPName = "ВСЕ (ГЛОБАЛЬНО)";
            if (this.currentPelotonFilter !== 'all' && this.pelotonsMap[this.currentPelotonFilter]) {
                currentPName = this.pelotonsMap[this.currentPelotonFilter].name;
            }

            // 2. ФОРМИРУЕМ ШАПКУ ВЫБОРА ПЕЛОТОНА (Точная копия из Чатов)
            const pelotonSelectorHtml = `
                <div style="padding: 15px 20px 5px 20px; font-size: 10px; color: var(--text-muted); font-family: 'Unbounded'; font-weight: 800; text-transform: uppercase;">
                    ВЫБОР ПЕЛОТОНА:
                </div>
                <div style="padding: 0 20px 15px 20px; border-bottom: 1px solid var(--border);">
                    <div id="currentPelotonLabel_crm" onclick="window.app.openPelotonDropdown(event)" style="font-family: 'Unbounded'; font-weight: 800; font-size: 14px; color: var(--primary); cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                        ${this.escapeHTML(currentPName).toUpperCase()} <span style="font-size: 8px;">▼</span>
                    </div>
                </div>
            `;

            // 3. ФОРМИРУЕМ ВЕРТИКАЛЬНОЕ МЕНЮ РАЗДЕЛОВ (Стиль как у чатов)
            const currentView = this.crm?.currentView || 'calendar';
            const menuItems = [
                { id: 'calendar', icon: '📅', name: 'Календарь', desc: 'Гонки и тренировки' },
                { id: 'team', icon: '👥', name: 'Моя команда', desc: 'Управление составом' },
                { id: 'market', icon: '🔄', name: 'Трансферы', desc: 'Свободные агенты' },
                { id: 'rating', icon: '🏆', name: 'Рейтинг', desc: 'Командный зачет' }
            ];

            let menuHtml = `<div style="padding: 15px 20px 5px 20px; font-size: 10px; color: var(--text-muted); font-family: 'Unbounded'; font-weight: 800;">РАЗДЕЛЫ СИСТЕМЫ</div>`;

            menuItems.forEach(item => {
                const isActive = currentView === item.id ? 'active' : '';
                menuHtml += `
                    <div class="chat-item ${isActive}" onclick="window.app.switchCrmView('${item.id}'); window.app.renderPelotonsTab();" style="margin: 0 10px 2px 10px;">
                        <div class="avatar" style="background:var(--bg-surface-hover); color:var(--text-main); border-color:var(--border); font-size:18px;">${item.icon}</div>
                        <div class="chat-info">
                            <div class="chat-name" style="color:var(--text-main); font-family:'Unbounded'; font-size:12px;">${item.name.toUpperCase()}</div>
                            <div class="chat-preview" style="color:var(--text-muted);">${item.desc}</div>
                        </div>
                    </div>
                `;
            });

            // 4. ПЕРЕЗАПИСЫВАЕМ РОДИТЕЛЬСКИЙ КОНТЕЙНЕР
            const parent = container.parentElement;
            
            // Скрываем старую строку поиска и заголовок "Клубы и Лиги", если они остались
            const oldSearch = parent.querySelector('.search-box');
            if (oldSearch) oldSearch.style.display = 'none';
            const oldTitle = parent.querySelector('div[style*="КЛУБЫ И ЛИГИ"]');
            if (oldTitle) oldTitle.style.display = 'none';

            // Вставляем новый интерфейс
            parent.innerHTML = pelotonSelectorHtml + `<div class="chat-list" id="pelotonList">${menuHtml}</div>`;
            
            // Важно: вызываем создание воркспейса, если его еще нет
            this.ensureWorkspaceExists();
        }

        // Функция для работы строки поиска
        filterPelotons(val) {
            this.renderPelotonsTab(val);
        }

        ensureWorkspaceExists() {
            let ws = document.getElementById('pelotonWorkspace');
            if (!ws) {
                ws = document.createElement('div');
                ws.id = 'pelotonWorkspace';
                
                // 🔥 Мы вырезали старое меню (.crm-top-nav) и вставили стильную шапку (.chat-header)
                ws.innerHTML = `
                    <div class="crm-mobile-back" onclick="document.getElementById('pelotonWorkspace').classList.remove('mobile-open')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg> ВЫБОР РАЗДЕЛА
                    </div>

                    <div class="chat-header" style="display: flex; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--border); background: var(--bg-surface); z-index: 10; min-height: 65px; flex-shrink: 0;">
                        <div id="crmHeaderAvatar" class="avatar" style="background:var(--bg-surface-hover); border-color:var(--border); margin-right: 15px; font-size: 18px; color: var(--text-main);">📅</div>
                        <div class="chat-info" style="flex: 1;">
                            <div id="crmHeaderTitle" class="chat-name" style="font-family:'Unbounded'; font-size:15px; font-weight:800; color:var(--text-main); text-transform:uppercase;">КАЛЕНДАРЬ</div>
                            <div id="crmHeaderSub" class="chat-preview" style="color:var(--text-muted); font-size: 11px;">Гонки и тренировки</div>
                        </div>
                    </div>

                    <div class="crm-content" id="crmContentArea" style="padding-top: 20px; flex: 1; overflow-y: auto;">
                        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color: var(--text-muted); opacity: 0.5;">
                            <span class="spinner" style="width:40px; height:40px; border-width:4px;"></span>
                        </div>
                    </div>
                `;
                
                const mainChat = document.getElementById('mainChatArea');
                if (mainChat && mainChat.parentNode) {
                    mainChat.parentNode.insertBefore(ws, mainChat.nextSibling);
                }
            }
        }
        switchCrmView(view) {
            this.crm.switchView(view);
        }

        openChatForTeam(teamId) {
            // 🔥 ФИКС: Сначала жестко ищем именно публичный Канал команды
            let tc = this.chats.find(c => c.team_id === teamId && c.type === 'team_channel');
            
            // Если канала почему-то нет (удалили/скрыли), то как запасной вариант берем скрытый чат
            if (!tc) {
                tc = this.chats.find(c => c.team_id === teamId && c.type === 'team');
            }

            if (tc) { 
                this.switchTab('chats'); 
                this.openChat(tc.id); 
            } else {
                alert("Канал команды не найден. Обратитесь к организаторам.");
            }
        }

        setPeloton(id, name = 'ВСЕ (ГЛОБАЛЬНО)') { 
            this.currentPelotonFilter = id; 
            const lbl = document.getElementById('currentPelotonLabel');
            if (lbl) lbl.innerText = name; 
            
            this.renderChatList(document.getElementById('chatSearch') ? document.getElementById('chatSearch').value : "");
            
            if (document.body.classList.contains('peloton-mode')) {
                this.renderPelotonsTab(); 
                const ws = document.getElementById('pelotonWorkspace');
                if (ws) ws.classList.add('mobile-open');
                
                if (this.crm) this.crm.loadData();
            } else {
                this.switchTab('chats'); 
                if (this.activeChatId === 'newsfeed') this.openNewsFeed();
            }
        }

        async runSystemMaintenance() {
            try { 
                const myRole = this.getUserMaxRole(); 
                // Запускаем уборку только если зашел админ или суперадмин
                if (this.ROLE_WEIGHTS[myRole] < this.ROLE_WEIGHTS['admin']) return; 

                // --- 2. УБОРЩИК МУСОРА: УДАЛЕНИЕ ГОСТЕЙ (старше 24 часов) ---
                const oneDayAgo = new Date(); oneDayAgo.setDate(oneDayAgo.getDate() - 1);
                const dateString1 = oneDayAgo.toISOString().replace('T', ' ');
                
                // Ищем всех гонщиков-гостей старше 24 часов
                const oldGuests = await pb.collection('riders').getFullList({ filter: `email ~ "guest_" && created < "${dateString1}"`, requestKey: null });
                
                if (oldGuests.length > 0) {
                    console.log(`🧹 УБОРЩИК: найдено ${oldGuests.length} старых гостей. Начинаю очистку...`);
                    for (let guest of oldGuests) {
                        try {
                            // А. Сначала удаляем личные чаты (direct), которые этот гость создал с саппортом
                            const guestChats = await pb.collection('chats').getFullList({ filter: `type="direct" && participants ~ "${guest.id}"`, requestKey: null });
                            for (let chat of guestChats) {
                                await pb.collection('chats').delete(chat.id, { requestKey: null });
                            }
                            // Б. Безжалостно стираем самого гостя из базы
                            await pb.collection('riders').delete(guest.id, { requestKey: null });
                        } catch(err) { console.error(`Ошибка при удалении гостя ${guest.id}`, err); }
                    }
                    console.log(`✨ УБОРЩИК: База riders успешно очищена от призраков!`);
                }
            } catch(e) { console.error("Ошибка системного обслуживания:", e); }
        }

        getRoleBadge(riderId) {
            try {
                const rider = this.ridersMap[riderId]; if (!rider) return ''; 
                const email = rider.email; if (email === 'bot@sotka.one') return ''; 
                
                if (email && email.startsWith('guest_')) {
                    return `<span class="header-status-badge" style="background:rgba(255,51,102,0.1); color:var(--danger); border-color:var(--danger);">🆘 ЗАПРОС</span>`;
                }

                let roles = []; 
                if (email && email.trim() !== '') { roles = this.usersMap[email] || []; }
                
                // 🔥 БРОНЕБОЙНЫЙ ФИКС: Читаем роли, даже если база отдала обычную строку, а не массив
                if (rider.roles) { 
                    let rRoles = Array.isArray(rider.roles) ? rider.roles : [rider.roles];
                    roles = [...new Set([...roles, ...rRoles])]; 
                }

                const cluster = rider.base_cluster || 'B'; 
                
                const rStr = JSON.stringify(roles); 
                let badgeClass = 'role-rider'; 
                // 🔥 Умный выбор статуса: если кластер O, то Велосипедист
                let roleName = cluster === 'O' ? 'Велосипедист' : 'Гонщик';
                
                // Роли администрации и капитанов всё равно перекроют базовый статус
                if (rStr.includes('superadmin')) { roleName = 'Супер'; badgeClass = 'role-super'; } 
                else if (rStr.includes('admin')) { roleName = 'Орг'; badgeClass = 'role-admin'; } 
                else if (rStr.includes('judge')) { roleName = 'Судья'; badgeClass = 'role-judge'; } 
                else if (rStr.includes('captain')) { roleName = 'Капитан'; badgeClass = 'role-cap'; }
                // 🔥 Делаем кластер O нейтральным серым цветом, а остальные — желтым
                let clusterStyle = cluster === 'O' 
                    ? 'color:var(--text-main); border-color:var(--border); background:var(--bg-body);' 
                    : 'color:var(--primary); border-color:var(--primary); background:rgba(255,193,7,0.1);';
					
                return `<span class="header-status-badge ${badgeClass}">${roleName}</span><span class="header-status-badge" style="color:var(--primary); border-color:var(--primary); background:rgba(255,193,7,0.1);">${cluster}</span>`;
            } catch(e) { return ''; }
        }

        async loadUnreadCounts() {
            try {
                // Обнуляем счетчики
                this.chats.forEach(c => this.unreadCounts[c.id] = 0);

                // 🔥 ОДИН ЗАПРОС ВМЕСТО ДЕСЯТКОВ!
                // Запрашиваем до 500 непрочитанных сообщений по всем чатам разом.
                // fields: 'chat_id' делает ответ базы крошечным (только ID чатов).
                const res = await pb.collection('messages').getList(1, 500, {
                    filter: `sender_id != "${this.currentRider.id}" && read_by !~ "${this.currentRider.id}"`,
                    fields: 'chat_id',
                    requestKey: null
                });

                // Распределяем счетчики по чатам в памяти
                res.items.forEach(m => {
                    const cId = Array.isArray(m.chat_id) ? m.chat_id[0] : m.chat_id;
                    if (this.unreadCounts[cId] !== undefined) {
                        this.unreadCounts[cId]++;
                    } else {
                        this.unreadCounts[cId] = 1;
                    }
                });
            } catch (e) {
                console.error("Ошибка загрузки счетчиков", e);
            }
        }

        async loadChats() {
            try {
                const myRole = this.getUserMaxRole(); const isAdmin = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['admin']; let filterQuery = '';
                // 🔥 ДОБАВЛЕН type="radar" для всех!
                if (isAdmin) { filterQuery = `type="global" || type="team" || type="team_channel" || type="radar" || participants ~ "${this.currentRider.id}"`; } 
                else { const teamIdStr = this.currentRider.team_id ? `"${this.currentRider.team_id}"` : `""`; filterQuery = `type="global" || type="team_channel" || type="radar" || (type="team" && team_id=${teamIdStr}) || participants ~ "${this.currentRider.id}"`; }
                
                this.chats = await pb.collection('chats').getFullList({ filter: filterQuery, sort: '-updated', expand: 'participants,team_id', requestKey: null });
                
                if (this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['captain'] && this.currentRider.team_id) {
                    const myTeam = this.teamsMap[this.currentRider.team_id];
                    if (myTeam) {
                        const channelExists = this.chats.find(c => c.type === 'team_channel' && c.team_id === myTeam.id);
                        if (!channelExists) {
                            let pId = myTeam.peloton_id; if (pId && Array.isArray(pId)) pId = pId[0];
                            const newChan = await pb.collection('chats').create({ type: 'team_channel', name: myTeam.name, team_id: myTeam.id, peloton_id: pId || "", participants: [this.currentRider.id] }, { requestKey: null });
                            this.chats.push(newChan); 
                        }
                    }
                }

                await this.loadUnreadCounts(); this.renderChatList(document.getElementById('chatSearch').value);
            } catch(e) { }
        }


async openChat(chatId) {
        try {
            const chat = this.chats.find(c => c.id === chatId);
            if (!chat) return;

            this.activeChatId = chatId;
            this.unreadCounts[chatId] = 0;
            this.renderChatList(document.getElementById('chatSearch')?.value || "");
            this.cancelReplyEdit();
            this.removeFile();

            const sessionToken = Math.random();
            this.chatSessionToken = sessionToken;
            this.openChatMobile(); 

            document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
            const activeItem = document.getElementById(`chat-item-${chatId}`);
            if (activeItem) activeItem.classList.add('active');

            const chatName = this.getChatName(chat);
            document.getElementById('activeChatName').innerHTML = `${chatName} <button onclick="window.app.copyChatLink('${chatId}')" class="copy-link-btn">🔗</button>`;
            document.getElementById('chatHeader').style.display = 'flex';
            
            const container = document.getElementById('messagesContainer');
            container.innerHTML = `<div style="text-align:center; padding:40px;"><span class="spinner"></span></div>`; 
            
            await this.refreshCurrentChatMessages(chatId, sessionToken);
            
            // Права на управление шторкой
            const myRole = this.getUserMaxRole();
            const canManage = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['admin'] || (chat.participants && chat.participants[0] === this.currentRider.id);
            this.renderChatCurtain(chat, canManage);

        } catch (e) { console.error("Ошибка открытия чата", e); }
    }

    async refreshCurrentChatMessages(chatId, sessionToken) {
        try {
            this.messagePage = 1;
            const res = await pb.collection('messages').getList(1, 50, { 
                filter: `chat_id="${chatId}"`, 
                sort: '-created', 
                expand: 'reply_to,forwarded_from', 
                requestKey: null 
            });

            if (this.chatSessionToken !== sessionToken) return;

            const container = document.getElementById('messagesContainer');
            container.innerHTML = '';
            this.hasMoreMessages = res.items.length === 50;

            res.items.reverse().forEach(m => {
                this.appendMessageHTML(m, container, false);
            });

            this.markMessagesAsRead(res.items);
            this.scrollToBottom();
            this.syncRaceButtonsState(); 
        } catch(e) { console.error("Ошибка загрузки сообщений", e); }
    }

    appendMessageHTML(msg, container, prepend = false, isFeed = false) {
        const msgSenderId = Array.isArray(msg.sender_id) ? msg.sender_id[0] : msg.sender_id;
        const isMine = msgSenderId === this.currentRider.id;
        const sender = this.ridersMap[msgSenderId] || {first_name: 'Неизвестный', last_name: '', email: ''};
        const time = new Date(msg.created).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'});
        const isEdited = msg.created !== msg.updated;
        const isBot = sender.email === 'bot@sotka.one';

        const targetChat = this.chats.find(c => c.id === this.activeChatId);
        const isChannelPost = isFeed || (msg.expand?.chat_id?.type === 'team_channel') || (targetChat?.type === 'team_channel');

        // --- 1. ОБРАБОТКА ФАЙЛОВ ---
        let fileBlock = ''; 
        let fileName = Array.isArray(msg.file) ? msg.file[0] : msg.file;
        if (fileName && typeof fileName === 'string' && fileName.trim() !== '') {
            const fileUrl = `${pb.baseUrl}/api/files/${msg.collectionId}/${msg.id}/${fileName}`;
            const isImage = fileName.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i);
            if (isImage) { 
                if (isChannelPost) {
                    fileBlock = `<img src="${fileUrl}" style="float: left; width: 45%; min-width: 140px; max-width: 300px; margin: 0 15px 5px 0; border-radius: 8px; object-fit: cover; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 4px 10px rgba(0,0,0,0.2); cursor: pointer;" onclick="window.open('${fileUrl}', '_blank'); event.stopPropagation();">`;
                } else {
                    fileBlock = `<div style="margin-bottom:8px;"><a href="${fileUrl}" target="_blank" onclick="event.stopPropagation()"><img src="${fileUrl}" style="max-width:100%; max-height:250px; border-radius:8px; display:block;"></a></div>`;
                }
            } else { 
                fileBlock = `<div style="margin-bottom:8px; background:rgba(0,0,0,0.15); padding:10px 12px; border-radius:8px; display:flex; align-items:center; gap:10px; border:1px solid rgba(255,255,255,0.05);"><svg width="24" height="24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg><a href="${fileUrl}" target="_blank" onclick="event.stopPropagation()" style="color:inherit; font-size:12px; font-weight:600; text-decoration:none; word-break:break-all;">${fileName}</a></div>`; 
            }
        }

        // --- 2. ЛОГИКА БОТА ---
        if (isBot) {
            let rawText = msg.text || ''; 
            let botActionHtml = '';
            const regMatch = rawText.match(/\[ACTION:REGISTER:([a-zA-Z0-9_]+)\]/);
            if (regMatch) { 
                const rId = regMatch[1]; 
                rawText = rawText.replace(regMatch[0], ''); 
                botActionHtml = `<div style="margin-top: 15px; border-top: 1px dashed rgba(255, 255, 255, 0.1); padding-top: 15px;"><button class="btn-black sync-btn-${rId}" style="width: 100%; background: var(--primary); color: #000; font-family: 'Unbounded'; font-size: 12px; padding: 14px; border-radius: 8px; cursor: pointer; border: none; font-weight: 800;" onclick="window.app.registerForRace('${rId}', this, event)">⚡️ ЗАЯВИТЬСЯ НА ГОНКУ</button></div>`; 
            }
            const row = document.createElement('div'); 
            row.className = `message-row system-bot`; 
            row.id = `msg-${msg.id}`;
            row.innerHTML = `<div class="bot-bubble"><div class="bot-name">${this.getMotoSvg(18)} VILKA MOTO <span class="bot-badge">OFFICIAL</span></div><div class="bot-text">${this.linkify(this.escapeHTML(rawText.trim())).replace(/\n/g, '<br>')}</div>${fileBlock}${botActionHtml}<div class="bot-time">${time}</div></div>`;
            if (prepend) container.prepend(row); else container.appendChild(row);
            return; 
        }

        // --- 3. ОБЫЧНОЕ СООБЩЕНИЕ ---
        let senderBlock = !isMine ? `<div class="msg-sender-name clickable" onclick="event.stopPropagation(); window.app.openProfile('${msgSenderId}', event)">${sender.first_name} ${sender.last_name} ${this.getRoleBadge(msgSenderId)}</div>` : '';
        if (isFeed && msg.expand?.chat_id) {
            senderBlock = `<div style="font-size:11px; font-family:'Unbounded'; font-weight:800; color:var(--primary); margin-bottom:4px; text-transform:uppercase;">${msg.expand.chat_id.name}</div>` + senderBlock;
        }

        let forwardHtml = msg.expand?.forwarded_from ? `<div style="font-size:10px; color:var(--info); margin-bottom:5px;">↪️ Переслано от: ${msg.expand.forwarded_from.first_name}</div>` : '';
        let replyBlock = msg.expand?.reply_to ? `<div class="reply-quote" onclick="event.stopPropagation(); document.getElementById('msg-${msg.expand.reply_to.id}').scrollIntoView({behavior: 'smooth', block: 'center'})"><div class="reply-quote-name">${this.ridersMap[msg.expand.reply_to.sender_id]?.first_name || '...'}</div><div class="reply-quote-text">${msg.expand.reply_to.text || 'Вложение'}</div></div>` : '';

        // --- 4. КНОПКИ ДЕЙСТВИЙ (ACTION TAGS) ---
        let displayMsgText = msg.text || '';
        let actionButtonsHtml = '';

        // Трансферы
        const tMatch = displayMsgText.match(/\[ACTION:TRANSFER:([a-zA-Z0-9_]+):([a-zA-Z0-9_]+)\]/);
        if (tMatch) {
            const rId = tMatch[1]; const teamId = tMatch[2];
            displayMsgText = displayMsgText.replace(tMatch[0], '').trim();
            if (this.ridersMap[rId]?.team_id === teamId) actionButtonsHtml += `<div class="transfer-done" style="margin-top:10px; padding:8px; background:rgba(0,230,118,0.1); color:var(--success); border-radius:6px; font-size:10px; font-weight:800; border:1px dashed var(--success); text-align:center; font-family:'Unbounded';">✅ ТРАНСФЕР ВЫПОЛНЕН</div>`;
            else actionButtonsHtml += `<div style="margin-top:10px;"><button onclick="window.app.approveTransfer('${rId}', '${teamId}', '${msg.id}', this, event)" style="width:100%; background:var(--warning); color:#000; border:none; padding:10px; border-radius:6px; font-size:11px; font-family:'Unbounded'; font-weight:800; cursor:pointer;">🔄 ОДОБРИТЬ ТРАНСФЕР</button></div>`;
        }

        // Регистрация на гонки
        const regRegex = /\[ACTION:REGISTER:([a-zA-Z0-9_]+)(?::([^\]]+))?\]/g;
        displayMsgText = displayMsgText.replace(regRegex, (match, rId, wave) => {
            let btnText = wave ? `⚡️ ЗАЯВИТЬСЯ: ${wave.toUpperCase()}` : `⚡️ ЗАЯВИТЬСЯ НА ГОНКУ`;
            actionButtonsHtml += `<div style="margin-top:10px;"><button class="sync-btn-${rId}" data-wave="${wave||''}" style="width:100%; background:var(--primary); color:#000; border:none; padding:10px; border-radius:6px; font-size:11px; font-family:'Unbounded'; font-weight:800; cursor:pointer;" onclick="window.app.registerForRace('${rId}', this, event, ${wave ? `'${wave}'` : 'null'})">${btnText}</button></div>`;
            return '';
        });

        // LIVE и Оплата
        const liveMatch = displayMsgText.match(/\[ACTION:LIVE:([a-zA-Z0-9_]+)\]/);
        if (liveMatch) {
            actionButtonsHtml += `<div style="margin-top:10px;"><button style="width:100%; background:var(--danger); color:#fff; border:none; padding:10px; border-radius:6px; font-size:11px; font-family:'Unbounded'; font-weight:800; cursor:pointer;" onclick="window.app.openLiveBoard('${liveMatch[1]}', event)">🔴 LIVE ПРОТОКОЛ</button></div>`;
            displayMsgText = displayMsgText.replace(liveMatch[0], '');
        }

        const payRegex = /\[ACTION:PAY:([^\]]+):([^\]]+)\]/g;
        displayMsgText = displayMsgText.replace(payRegex, (match, url, label) => {
            actionButtonsHtml += `<div style="margin-top:10px;"><a href="${url}" target="_blank" style="display:block; width:100%; background:var(--success); color:#fff; padding:10px; border-radius:6px; font-size:11px; font-family:'Unbounded'; font-weight:800; text-align:center; text-decoration:none;">💳 ${label}</a></div>`;
            return '';
        });

        // --- 5. СБОРКА ТЕКСТА ---
        let textHtml = '';
        if (isChannelPost && displayMsgText) {
            let lines = displayMsgText.split('\n');
            textHtml = `<div style="font-family:'Unbounded'; font-size:14px; font-weight:800; color:var(--text-main); margin-bottom:6px;">${this.linkify(this.escapeHTML(lines[0]))}</div>`;
            if (lines.length > 1) textHtml += `<div style="font-size:13px; color:var(--text-main); white-space:pre-wrap; opacity:0.9;">${this.linkify(this.escapeHTML(lines.slice(1).join('\n')))}</div>`;
        } else {
            textHtml = `<div style="white-space:pre-wrap;">${this.linkify(this.escapeHTML(displayMsgText))}</div>`;
        }

        // --- 6. РЕАКЦИИ И ТИКИ ---
        let reactionsHtml = '';
        if (msg.reactions && typeof msg.reactions === 'object') {
            let tags = '';
            for (let [key, users] of Object.entries(msg.reactions)) {
                if (!users?.length) continue;
                tags += `<span class="reaction-tag ${users.includes(this.currentRider.id) ? 'voted' : ''}" onclick="event.stopPropagation(); window.app.submitContextReactionMock('${msg.id}', '${key}')">${this.getReactSvg(key, 12)} <span>${users.length}</span></span>`;
            }
            if (tags) reactionsHtml = `<div class="reactions-box">${tags}</div>`;
        }
        
        const ticks = isMine ? (msg.read_by?.length > 0 ? `<span style="color:#3b82f6;">✓✓</span>` : `<span>✓</span>`) : '';

        // --- 7. ВЫВОД ---
        const row = document.createElement('div');
        row.className = `message-row ${isMine ? 'mine' : 'theirs'}`;
        row.id = `msg-${msg.id}`;
        row.onclick = () => this.openMessageMenu(msg.id);
        row.innerHTML = `${senderBlock}<div class="message-bubble">${forwardHtml}${replyBlock}<div style="display:flow-root;">${fileBlock}${textHtml}</div>${actionButtonsHtml}<div class="msg-meta-row">${isEdited?'<span class="msg-edited">изм.</span>':''}<span>${time}</span>${ticks}</div></div>${reactionsHtml}`;
        
        if (prepend) container.prepend(row); else container.appendChild(row);
    }


        renderChatList(filterText = "") {
            const container = document.getElementById('chatList'); if (!container) return; container.innerHTML = '';
            
            // 1. СОЗДАЕМ ИЛИ ОБНОВЛЯЕМ ПАНЕЛЬ ФИЛЬТРОВ
            let filterBar = document.getElementById('chatFilterBar');
            if (!filterBar) {
                filterBar = document.createElement('div');
                filterBar.id = 'chatFilterBar';
                filterBar.style.cssText = 'display:flex; gap:4px; padding: 10px 15px; overflow-x:auto; scrollbar-width:none; border-bottom: 1px solid var(--border); background: var(--bg-surface); -webkit-overflow-scrolling:touch; flex-shrink: 0; align-items:center;';
                const searchBox = document.querySelector('.search-box');
                if (searchBox) searchBox.parentNode.insertBefore(filterBar, container);
            }

            if (!this.chatListFilter || this.chatListFilter === 'all') this.chatListFilter = 'direct';

            let filteredChats = [...this.chats];
            const myRole = this.getUserMaxRole(); const isManager = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['admin'];
            
            // Базовая фильтрация доступов
            filteredChats = filteredChats.filter(c => {
                let cPId = c.peloton_id ? (Array.isArray(c.peloton_id) ? c.peloton_id[0] : c.peloton_id) : null;
                if (cPId) {
                    const pelotonObj = this.pelotonsMap[cPId];
                    if (pelotonObj && pelotonObj.is_private) {
                        if (isManager) return true;
                        if (pelotonObj.allowed_teams && Array.isArray(pelotonObj.allowed_teams) && pelotonObj.allowed_teams.includes(this.currentRider.team_id)) return true; 
                        if (c.type === 'private' || c.type === 'direct' || c.type === 'team' || c.type === 'gruppetto') return true; 
                        return false; 
                    }
                }
                return true;
            });

            // Скрытие устаревших радаров
            filteredChats = filteredChats.filter(c => {
                if (c.type === 'radar') {
                    try {
                        let pData = c.panel_data || {};
                        if (typeof pData === 'string') pData = JSON.parse(pData);
                        let isExpired = false;
                        if (pData.expiresAt) {
                            if (Date.now() > new Date(pData.expiresAt).getTime()) isExpired = true;
                        } else {
                            const createdAt = new Date(c.created).getTime();
                            if (Date.now() > createdAt + (3 * 3600 * 1000)) isExpired = true;
                        }
                        if (isExpired && (!c.participants || !c.participants.includes(this.currentRider.id))) return false;
                    } catch(e) {}
                }
                return true;
            });

            if (this.currentPelotonFilter !== 'all') { 
                filteredChats = filteredChats.filter(c => { 
                    if (c.type === 'direct') return true; 
                    if ((c.type === 'private' || c.type === 'gruppetto') && !c.peloton_id) return true; 
                    let chatPId = c.peloton_id; if (!chatPId) return false; 
                    if (Array.isArray(chatPId)) return chatPId.includes(this.currentPelotonFilter); 
                    return chatPId === this.currentPelotonFilter; 
                }); 
            }

            const calcUnread = (typeFn) => filteredChats.filter(typeFn).reduce((sum, c) => sum + (this.unreadCounts[c.id] || 0), 0);
            const unreadClubs = calcUnread(c => c.type === 'team_channel' || c.type === 'team' || c.type === 'private' || c.type === 'gruppetto');
            const unreadRaces = calcUnread(c => c.type === 'global');
            const unreadDirect = calcUnread(c => c.type === 'direct');
            const unreadRadar = calcUnread(c => c.type === 'radar'); 
            const hasRadar = filteredChats.some(c => c.type === 'radar');

            const formatBadge = (num) => num > 0 ? `<span style="background:var(--danger); color:#fff; border-radius:10px; padding:2px 6px; margin-left:6px; font-size:9px; font-family:'Manrope';">${num}</span>` : '';

            // 🔥 ПАНЕЛЬ ФИЛЬТРОВ: ИЛИ УДАЛЕНИЕ, ИЛИ ОБЫЧНАЯ НАВИГАЦИЯ
            if (this.isSelectionMode) {
                const selCount = this.selectedChats ? this.selectedChats.size : 0;
                filterBar.innerHTML = `
                    <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                        <span style="font-family:'Unbounded'; font-weight:800; font-size:11px; color:var(--danger);">ВЫБРАНО: ${selCount}</span>
                        <div style="display:flex; gap:10px;">
                            <button onclick="window.app.toggleSelectionMode()" style="background:var(--bg-body); border:1px solid var(--border); color:var(--text-main); padding:6px 12px; border-radius:50px; font-size:9px; font-family:'Unbounded'; font-weight:bold; cursor:pointer;">ОТМЕНА</button>
                            <button id="bulkDeleteBtn" onclick="window.app.executeBulkAction()" style="background:var(--danger); color:#fff; border:none; padding:6px 12px; border-radius:50px; font-size:9px; font-family:'Unbounded'; font-weight:bold; cursor:pointer;" ${selCount === 0 ? 'disabled style="opacity:0.5;"' : ''}>УДАЛИТЬ</button>
                        </div>
                    </div>
                `;
            } else {
                const filters = [
                    { id: 'direct', name: 'ЛИЧНЫЕ' + formatBadge(unreadDirect) },
                    { id: 'clubs', name: 'КОМАНДЫ' + formatBadge(unreadClubs) },
                    { id: 'races', name: 'ГОНКИ' + formatBadge(unreadRaces) }
                ];
                if (hasRadar) filters.push({ id: 'radar', name: 'РАДАР' + formatBadge(unreadRadar), isRadar: true });

                let pillsHtml = '';
                filters.forEach(f => {
                    const isActive = this.chatListFilter === f.id;
                    let bg = isActive ? 'var(--text-main)' : 'var(--bg-body)';
                    let color = isActive ? 'var(--bg-body)' : 'var(--text-muted)';
                    let border = isActive ? 'var(--text-main)' : 'var(--border)';
                    let extraClass = '';
                    if (f.isRadar) { if (isActive) { bg = 'var(--danger)'; color = '#fff'; border = 'var(--danger)'; } else if (hasRadar) { color = 'var(--danger)'; border = 'var(--danger)'; extraClass = 'radar-pulse-anim'; } }
                    pillsHtml += `<button class="${extraClass}" style="background:${bg}; color:${color}; border:1px solid ${border}; padding:6px 10px; border-radius:50px; font-family:'Unbounded'; font-weight:800; font-size:9px; cursor:pointer; flex-shrink:0; transition:0.2s; display:flex; align-items:center;" onclick="window.app.setChatListFilter('${f.id}')">${f.name}</button>`;
                });
                
                // Добавляем иконку "Изменить" в конец фильтров
                pillsHtml += `<button style="background:transparent; color:var(--text-muted); border:none; padding:6px; margin-left:auto; cursor:pointer; display:flex; align-items:center;" onclick="window.app.toggleSelectionMode()" title="Изменить чаты">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>`;
                filterBar.innerHTML = pillsHtml;
            }

            let globalContacts = [];

            if (filterText) {
                const q = filterText.toLowerCase();
                filteredChats = filteredChats.filter(c => this.getChatName(c).toLowerCase().includes(q));
                const existingDirectPartnerIds = filteredChats.filter(c => c.type === 'direct').map(c => {
                    return c.expand?.participants?.find(p => p.id !== this.currentRider.id)?.id;
                }).filter(Boolean);
                globalContacts = Object.values(this.ridersMap).filter(r => {
                    if (r.id === this.currentRider.id || r.email === 'bot@sotka.one' || (r.email && r.email.startsWith('guest_'))) return false;
                    if (existingDirectPartnerIds.includes(r.id)) return false; 
                    return (r.first_name + ' ' + r.last_name).toLowerCase().includes(q);
                });
            } else {
                if (this.chatListFilter === 'clubs') {
                    filteredChats = filteredChats.filter(c => c.type === 'team_channel' || c.type === 'team' || c.type === 'private' || c.type === 'gruppetto');
                } else if (this.chatListFilter === 'races') {
                    filteredChats = filteredChats.filter(c => c.type === 'global');
                } else if (this.chatListFilter === 'direct') {
                    filteredChats = filteredChats.filter(c => c.type === 'direct');
                } else if (this.chatListFilter === 'radar') { 
                    filteredChats = filteredChats.filter(c => c.type === 'radar');
                }
            }

            // РЕНДЕР ЛЕНТЫ НОВОСТЕЙ
            if (!filterText && this.chatListFilter === 'clubs' && !this.isSelectionMode) {
                const feedActive = this.activeChatId === 'newsfeed' ? 'active' : '';
                const feedEl = document.createElement('div'); feedEl.className = `chat-item ${feedActive}`; feedEl.id = `chat-item-newsfeed`; 
                feedEl.onclick = () => window.app.openNewsFeed();
                const feedSub = this.currentPelotonFilter === 'all' ? "Публикации всех клубов" : "Новости этого пелотона";
                feedEl.innerHTML = `<div class="avatar" style="background:var(--primary); color:#000;">📰</div><div class="chat-info"><div class="chat-name" style="color:var(--primary);">ЛЕНТА НОВОСТЕЙ</div><div class="chat-preview" style="color:var(--text-muted)">${feedSub}</div></div>`; 
                container.appendChild(feedEl);
            }

            if (filteredChats.length === 0 && globalContacts.length === 0 && container.innerHTML === '') { 
                container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:11px; font-family:'Unbounded';">В ЧАТАХ НЕ НАЙДЕНО</div>`; 
            }

            if (filterText && filteredChats.length > 0) {
                const lbl = document.createElement('div');
                lbl.style.cssText = "font-size:10px; color:var(--text-muted); margin: 10px 20px 5px; font-family:'Unbounded'; font-weight:800;";
                lbl.innerText = "ЧАТЫ И КАНАЛЫ";
                container.appendChild(lbl);
            }

            // --- 🔥 ЛОГИКА ЗАКРЕПОВ И СОРТИРОВКИ ---
            let pinnedIds = this.currentRider?.pinned_chats || [];
            if (typeof pinnedIds === 'string') { try { pinnedIds = JSON.parse(pinnedIds); } catch(e) { pinnedIds = []; } }
            if (!Array.isArray(pinnedIds)) pinnedIds = [];

            const pinnedChats = [];
            const unpinnedChats = [];

            filteredChats.forEach(c => {
                if (pinnedIds.includes(c.id)) pinnedChats.push(c);
                else unpinnedChats.push(c);
            });

            pinnedChats.sort((a, b) => pinnedIds.indexOf(a.id) - pinnedIds.indexOf(b.id));
            const finalChatsToRender = [...pinnedChats, ...unpinnedChats];

            // ОТРИСОВКА САМИХ ЧАТОВ В ЛЕНТУ
            finalChatsToRender.forEach(c => {
                let rawName = this.getChatName(c) || "Чат"; 
                let name = this.escapeHTML(rawName); 
                let avatarLetter = rawName.charAt(0).toUpperCase();
                
                let avatarStyle = c.type === 'global' ? 'background:var(--danger-light); color:var(--danger); border-color:var(--danger);' : (c.type === 'team' ? 'background:rgba(59,130,246,0.1); color:var(--info); border-color:var(--info);' : (c.type === 'team_channel' ? 'background:rgba(255,193,7,0.1); color:var(--primary); border-color:var(--primary);' : ''));
                let subText = c.type === 'direct' ? 'Личные сообщения' : (c.type === 'team' ? 'Скрытый чат команды' : (c.type === 'private' ? 'Закрытая группа' : (c.type === 'team_channel' ? 'Публичный Канал команды' : 'Общий чат гонки')));
                let subColor = c.type === 'global' ? 'var(--danger)' : (c.type === 'team' ? 'var(--info)' : (c.type === 'team_channel' ? 'var(--primary)' : 'var(--text-muted)'));
                
                // Подсветка трансферов
                if (c.type === 'direct' && this.unreadCounts[c.id] > 0) {
                    if (c.expand?.last_message?.text?.includes('[ACTION:TRANSFER')) {
                        subText = '📩 НОВАЯ ЗАЯВКА';
                        subColor = 'var(--primary)';
                    }
                }

                if (c.type === 'gruppetto') {
                    avatarStyle = 'background:rgba(168,85,247,0.1); color:#a855f7; border-color:#a855f7;';
                    subText = 'Временная банда (Группетто)';
                    subColor = '#a855f7';
                    name = `<span style="background:rgba(168,85,247,0.15); color:#a855f7; padding:2px 5px; border-radius:4px; font-size:9px; font-family:'Unbounded'; margin-right:5px; border:1px solid rgba(168,85,247,0.3);">ГРУППЕТТО</span>${name}`;
                } else if (c.type === 'radar') {
                    avatarStyle = 'background:rgba(255,51,102,0.15); color:var(--danger); border-color:var(--danger);';
                    subText = 'Сигнал (Сбор / SOS)';
                    subColor = 'var(--danger)';
                    name = `<span class="radar-pulse-anim" style="background:var(--danger); color:#fff; padding:2px 5px; border-radius:4px; font-size:9px; font-family:'Unbounded'; margin-right:5px;">РАДАР</span>${name}`;
                    avatarLetter = typeof this.getRadarSvg === 'function' ? this.getRadarSvg(20) : '📡'; 
                }

                const activeClass = this.activeChatId === c.id ? 'active' : '';

                let avatarHtml = `<div class="avatar" style="${avatarStyle}">${avatarLetter}</div>`;
                if (c.type === 'direct' && c.expand && c.expand.participants) { 
                    const otherRider = c.expand.participants.find(p => p.id !== this.currentRider.id); 
                    if (otherRider) { 
                        if (otherRider.email === 'bot@sotka.one') avatarHtml = `<div class="avatar" style="background:var(--primary-light); color:var(--primary); border-color:var(--primary);">${this.getMotoSvg(20)}</div>`; 
                        else avatarHtml = this.renderAvatar(otherRider.id, avatarStyle, avatarLetter); 
                    } 
                }

                let rightControlsHtml = '';

                // 🔥 РЕЖИМ ВЫБОРА ИЛИ ОБЫЧНЫЙ РЕЖИМ
                if (this.isSelectionMode) {
                    if (!this.selectedChats) this.selectedChats = new Set();
                    const isChecked = this.selectedChats.has(c.id);
                    // Вместо бейджика рисуем чекбокс
                    rightControlsHtml = `<div style="display:flex; align-items:center;"><input type="checkbox" style="accent-color:var(--danger); width:18px; height:18px; pointer-events:none;" ${isChecked ? 'checked' : ''}></div>`;
                    
                    const el = document.createElement('div'); 
                    el.className = `chat-item ${isChecked ? 'active' : ''}`; // Подсвечиваем выбранное
                    if (isChecked) el.style.backgroundColor = 'rgba(255,51,102,0.1)'; // Красный оттенок выделения
                    el.id = `chat-item-${c.id}`; 
                    el.onclick = () => window.app.toggleChatSelection(c.id);
                    el.innerHTML = `${avatarHtml}<div class="chat-info"><div class="chat-name">${name}</div><div class="chat-preview" style="color:${subColor}">${subText}</div></div>${rightControlsHtml}`; 
                    container.appendChild(el);

                } else {
                    // ОБЫЧНЫЙ РЕЖИМ
                    const unreadCount = this.unreadCounts[c.id] || 0;
                    let badgeHtml = unreadCount > 0 ? `<div style="background: var(--info); color: #fff; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 20px; min-width: 20px; text-align: center; box-shadow: 0 2px 5px rgba(59,130,246,0.3); margin-left: auto;">${unreadCount}</div>` : '<div style="margin-left: auto;"></div>';

                    const isPinned = pinnedIds.includes(c.id);
                    const pinIconHtml = `<button onclick="window.app.togglePinChat('${c.id}', event)" style="background:none; border:none; padding:5px; margin-left:8px; cursor:pointer; opacity: ${isPinned ? '1' : '0.1'}; transition: 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${isPinned ? '1' : '0.1'}'" title="${isPinned ? 'Открепить' : 'Закрепить'}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="${isPinned ? 'var(--text-muted)' : 'none'}" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path><line x1="8.5" y1="15.5" x2="15.5" y2="8.5"></line></svg>
                    </button>`;

                    rightControlsHtml = `<div style="display:flex; align-items:center;">${badgeHtml}${pinIconHtml}</div>`;

                    const el = document.createElement('div'); el.className = `chat-item ${activeClass}`; el.id = `chat-item-${c.id}`; el.onclick = () => window.app.openChat(c.id);
                    el.innerHTML = `${avatarHtml}<div class="chat-info"><div class="chat-name">${name}</div><div class="chat-preview" style="color:${subColor}">${subText}</div></div>${rightControlsHtml}`; 
                    container.appendChild(el);
                }
            });

            // РЕНДЕР ГЛОБАЛЬНЫХ КОНТАКТОВ (Если ищем и не в режиме удаления)
            if (filterText && globalContacts.length > 0 && !this.isSelectionMode) {
                const lbl = document.createElement('div');
                lbl.style.cssText = "font-size:10px; color:var(--text-muted); margin: 15px 20px 5px; font-family:'Unbounded'; font-weight:800;";
                lbl.innerText = "ГЛОБАЛЬНЫЙ ПОИСК (ЛЮДИ)";
                container.appendChild(lbl);

                globalContacts.forEach(r => {
                    let rawName = r.first_name + ' ' + r.last_name; 
                    let name = this.escapeHTML(rawName); 
                    let avatarLetter = rawName.charAt(0).toUpperCase();
                    let subText = r.expand?.team_id?.name || 'Без команды';
                    
                    const el = document.createElement('div'); el.className = `chat-item`;
                    el.onclick = () => window.app.startDirectChat(r.id); 
                    let avatarHtml = this.renderAvatar(r.id, 'background:var(--bg-surface-hover); color:var(--text-main); border-color:var(--border);', avatarLetter);
                    el.innerHTML = `${avatarHtml}<div class="chat-info"><div class="chat-name">${name}</div><div class="chat-preview" style="color:var(--text-muted)">${subText}</div></div>`; 
                    container.appendChild(el);
                });
            }

            // ПОИСК ПО СООБЩЕНИЯМ В БАЗЕ
            if (filterText && !this.isSelectionMode) {
                const msgContainer = document.createElement('div');
                msgContainer.id = 'messageSearchResults';
                msgContainer.innerHTML = `<div style="text-align:center; padding:15px;"><span class="spinner" style="width:16px;height:16px;border-width:2px;border-color:var(--primary) transparent transparent transparent;"></span></div>`;
                container.appendChild(msgContainer);
                
                if (this.msgSearchTimeout) clearTimeout(this.msgSearchTimeout);
                this.msgSearchTimeout = setTimeout(() => {
                    this.searchMessagesInDB(filterText);
                }, 500); 
            }
        }
		
		// 🔥 ПОИСК ПО ТЕКСТУ СООБЩЕНИЙ В БАЗЕ
        async searchMessagesInDB(query) {
            const container = document.getElementById('messageSearchResults');
            if (!container) return;

            if (query.length < 3) {
                container.innerHTML = `<div style="padding:10px 20px; font-size:10px; color:var(--text-muted); text-align:center; font-family:'Unbounded';">Введите минимум 3 буквы для поиска в тексте</div>`;
                return;
            }

            try {
                const chatIds = this.chats.map(c => `chat_id="${c.id}"`).join(' || ');
                if (!chatIds) {
                    container.innerHTML = '';
                    return;
                }

                const safeQuery = query.replace(/"/g, '\\"');
                
                const res = await pb.collection('messages').getList(1, 15, {
                    filter: `text ~ "${safeQuery}" && (${chatIds})`,
                    sort: '-created',
                    expand: 'chat_id, sender_id',
                    requestKey: 'msg_search'
                });

                if (res.items.length === 0) {
                    container.innerHTML = `<div style="padding:10px 20px; font-size:10px; color:var(--text-muted); text-align:center; font-family:'Unbounded';">В сообщениях совпадений нет</div>`;
                    return;
                }

                let html = `<div style="font-size:10px; color:var(--text-muted); margin: 15px 20px 5px; font-family:'Unbounded'; font-weight:800; text-transform:uppercase;">НАЙДЕНО В СООБЩЕНИЯХ (${res.totalItems})</div>`;
                
                res.items.forEach(m => {
                    // 🔥 ФИКС: Берем полноценный чат из кэша приложения, где УЖЕ загружены все участники!
                    const cId = Array.isArray(m.chat_id) ? m.chat_id[0] : m.chat_id;
                    const chat = this.chats.find(c => c.id === cId) || m.expand?.chat_id;
                    const sender = m.expand?.sender_id;
                    
                    if (!chat || !sender) return;

                    const chatName = this.escapeHTML(this.getChatName(chat));
                    const senderName = this.escapeHTML(sender.first_name + ' ' + sender.last_name);
                    
                    let rawText = m.text || '';
                    let lowerText = rawText.toLowerCase();
                    let lowerQuery = query.toLowerCase();
                    let matchIdx = lowerText.indexOf(lowerQuery);
                    
                    let snippetText = rawText;
                    if (matchIdx > -1) {
                        let start = Math.max(0, matchIdx - 30);
                        let end = Math.min(rawText.length, matchIdx + query.length + 30);
                        snippetText = (start > 0 ? '...' : '') + rawText.substring(start, end) + (end < rawText.length ? '...' : '');
                    } else if (snippetText.length > 80) {
                        snippetText = snippetText.substring(0, 80) + '...';
                    }
                    
                    let safeSnippet = this.escapeHTML(snippetText);
                    let safeQueryRegex = this.escapeHTML(query).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const regex = new RegExp(`(${safeQueryRegex})`, 'gi');
                    let finalSnippet = safeSnippet.replace(regex, `<span style="background:var(--primary); color:#000; padding:0 2px; border-radius:4px; font-weight:bold;">$1</span>`);

                    html += `
                    <div class="chat-item" onclick="window.app.jumpToMessage('${chat.id}', '${m.id}')" style="align-items:flex-start; padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); border-radius:0; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='var(--bg-surface-hover)'" onmouseout="this.style.background='transparent'">
                        <div class="avatar" style="background:rgba(59,130,246,0.1); color:var(--info); width:36px; height:36px; font-size:14px; border-radius:8px; flex-shrink:0;">💬</div>
                        <div class="chat-info" style="flex:1; overflow:hidden;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                <div class="chat-name" style="font-size:11px; font-family:'Unbounded'; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${chatName}</div>
                                <div style="font-size:9px; color:var(--text-muted); flex-shrink:0; margin-left:10px;">${new Date(m.created).toLocaleDateString('ru-RU', {month:'short', day:'numeric'})}</div>
                            </div>
                            <div style="font-size:10px; color:var(--primary); margin-bottom:4px; font-weight:bold;">${senderName}:</div>
                            <div style="color:var(--text-muted); line-height:1.4; font-size:11px; word-wrap:break-word; display:block;">${finalSnippet}</div>
                        </div>
                    </div>`;
                });

                container.innerHTML = html;

            } catch(e) {
                if (e.name !== 'ClientResponseError') {
                    container.innerHTML = `<div style="padding:10px; color:var(--danger); font-size:10px; text-align:center;">Ошибка поиска</div>`;
                }
            }
        }

        // 🔥 ПЕРЕХОД К НАЙДЕННОМУ СООБЩЕНИЮ
        async jumpToMessage(chatId, msgId) {
            // Открываем нужный чат
            if (this.activeChatId !== chatId) {
                await this.openChat(chatId);
            } else if (window.innerWidth <= 768) {
                this.openChatMobile();
            }
            
            // Даем интерфейсу 0.5 сек на отрисовку сообщений
            setTimeout(() => {
                const el = document.getElementById(`msg-${msgId}`);
                if (el) {
                    // Плавно скроллим к сообщению
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Подсвечиваем его желтым на 2 секунды
                    el.style.backgroundColor = 'var(--primary-light)';
                    el.style.transition = 'background-color 0.5s';
                    setTimeout(() => el.style.backgroundColor = 'transparent', 2000);
                } else {
                    // Если сообщение старое и не влезло в последние 50 загруженных
                    alert("Сообщение найдено, но оно находится глубоко в истории. Прокрутите чат вверх, чтобы загрузить старые сообщения.");
                }
            }, 600);
        }

setChatListFilter(type) {
            this.chatListFilter = type;
            const searchInput = document.getElementById('chatSearch');
            
            // 🔥 УМНЫЙ СБРОС: Очищаем строку поиска при переключении вкладки
            if (searchInput) {
                searchInput.value = "";
            }
            
            // Рендерим чистый список чатов для выбранной вкладки (без старого запроса)
            this.renderChatList("");
        }
		
        getChatName(chat) { try { if (chat.type === 'team' || chat.type === 'team_channel') return chat.name || chat.expand?.team_id?.name || "Команда"; if (chat.type === 'direct') { const otherRider = chat.expand?.participants?.find(p => p.id !== this.currentRider.id); if (otherRider && otherRider.email === 'bot@sotka.one') return "VILKA MOTO"; return otherRider ? `${otherRider.first_name} ${otherRider.last_name}` : "Избранное (Я)"; } return chat.name || "Чат"; } catch (e) { return "Чат"; } }
        filterChats(val) { this.renderChatList(val); }
        openChatMobile() { if (window.innerWidth <= 768) document.getElementById('mainChatArea').classList.add('mobile-open'); }
        closeChatMobile() { document.getElementById('mainChatArea').classList.remove('mobile-open'); }
        openMobileCreateMenu() { document.getElementById('mobileCreateMenuModal').style.display = 'flex'; }

        renderContactsTab(filterText = "") {
            const container = document.getElementById('contactList'); if(!container) return; container.innerHTML = '';
            let all = Object.values(this.ridersMap).filter(r => r.id !== this.currentRider.id && r.email !== 'bot@sotka.one' && !(r.email && r.email.startsWith('guest_')));
            if (this.currentPelotonFilter !== 'all') { all = all.filter(r => { const rTeam = this.teamsMap[r.team_id]; if (!rTeam) return true; let tPeloton = rTeam.peloton_id; if (!tPeloton) return true; if (Array.isArray(tPeloton)) return tPeloton.includes(this.currentPelotonFilter); return tPeloton === this.currentPelotonFilter; }); }
            if (filterText) { const q = filterText.toLowerCase(); all = all.filter(r => r.first_name.toLowerCase().includes(q) || r.last_name.toLowerCase().includes(q)); }
            const getSortWeight = (rider) => { const roles = this.usersMap[rider.email] || []; const maxRoleWeight = Math.max(...roles.map(role => this.ROLE_WEIGHTS[role] || 20), 20); if (maxRoleWeight >= this.ROLE_WEIGHTS['admin']) return 1; if (maxRoleWeight >= this.ROLE_WEIGHTS['captain'] && rider.team_id === this.currentRider.team_id) return 2; if (rider.team_id && rider.team_id === this.currentRider.team_id) return 3; return 4; };
            all.sort((a, b) => { const wA = getSortWeight(a); const wB = getSortWeight(b); if (wA !== wB) return wA - wB; return a.last_name.localeCompare(b.last_name); });
            all.forEach(r => {
                const el = document.createElement('div'); 
                el.className = 'contact-item'; 
                el.onclick = () => { window.app.startDirectChat(r.id); window.app.switchTab('chats'); };
                
                // 🛡️ QA FIX: Экранируем данные пользователя перед вставкой в DOM
                const safeFirstName = this.escapeHTML(r.first_name);
                const safeLastName = this.escapeHTML(r.last_name);
                const safeTeamName = this.escapeHTML(r.expand?.team_id?.name || 'Без команды');
                const safeFirstChar = safeFirstName.charAt(0) || '?';

                el.innerHTML = `<div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
                    ${this.renderAvatar(r.id, 'width:40px; height:40px; font-size:16px; background:transparent;', safeFirstChar)}
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <div style="font-weight:600; font-size:14px; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${safeFirstName} ${safeLastName}</div>
                            <div style="color:var(--primary); display:flex; align-items:center; opacity: 0.8;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            </div>
                        </div>
                        <div style="font-size:11px; color:var(--text-muted); display:flex; gap:8px; align-items:center;">
                            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.getTeamLinkHtml(r.team_id, safeTeamName, 'var(--text-muted)')}</span> ${this.getRoleBadge(r.id)}
                        </div>
                    </div>
                </div>`;
                container.appendChild(el);
            });
        }
        filterContacts(val) { this.renderContactsTab(val); }

        async startDirectChat(targetRiderId) {
            document.getElementById('mobileCreateMenuModal').style.display = 'none';
            let existingChat = this.chats.find(c => c.type === 'direct' && (c.participants || []).includes(this.currentRider.id) && (c.participants || []).includes(targetRiderId));
            if (existingChat) { this.openChat(existingChat.id); } else { try { const newChat = await pb.collection('chats').create({ type: 'direct', name: 'Direct', participants: [this.currentRider.id, targetRiderId] }, { requestKey: null }); await this.loadChats(); this.openChat(newChat.id); } catch(e) { alert("Ошибка создания чата"); } }
        }

        openCreateGroupModal() {
            const roles = this.usersMap[this.currentRider.email] || []; const rStr = JSON.stringify(roles); const isManager = rStr.includes('admin') || rStr.includes('superadmin'); const isCap = rStr.includes('captain');
            // 🔥 ДОБАВЛЕН ВЫБОР ГРУППЕТТО
            let typeOpts = `<option value="private">Закрытая группа (По приглашению)</option><option value="gruppetto">Группетто (Временная команда до 9 чел.)</option>`;
            if (isManager) { typeOpts = `<option value="global">Общий чат (Для всех)</option><option value="team">Скрытый чат команды</option>` + typeOpts; } else if (isCap) { typeOpts = `<option value="team">Скрытый чат команды</option>` + typeOpts; }
            document.getElementById('groupTypeSelect').innerHTML = typeOpts; this.onGroupTypeChange(); document.getElementById('groupNameInput').value = ''; document.getElementById('groupPelotonSelect').value = this.currentPelotonFilter === 'all' ? '' : this.currentPelotonFilter; document.getElementById('createGroupModal').style.display = 'flex';
        }

        onGroupTypeChange() {
            const type = document.getElementById('groupTypeSelect').value; const tBox = document.getElementById('groupTeamBox'); const pCont = document.getElementById('groupPartContainer'); const pBox = document.getElementById('groupPartBox'); const pelotonSelect = document.getElementById('groupPelotonSelect');
            tBox.style.display = 'none'; pCont.style.display = 'none';
            if (pelotonSelect) { pelotonSelect.disabled = false; pelotonSelect.style.opacity = '1'; }
            if (type === 'team') {
                const roles = this.usersMap[this.currentRider.email] || []; const isManager = JSON.stringify(roles).includes('admin') || JSON.stringify(roles).includes('superadmin');
                if (isManager) { 
                    tBox.style.display = 'block'; let tOpts = Object.values(this.teamsMap).map(t => `<option value="${t.id}">${t.name}</option>`).join(''); document.getElementById('groupTeamSelect').innerHTML = tOpts; 
                    document.getElementById('groupTeamSelect').onchange = () => { const selTeamId = document.getElementById('groupTeamSelect').value; const selTeamObj = this.teamsMap[selTeamId]; if (pelotonSelect && selTeamObj && selTeamObj.peloton_id) { pelotonSelect.value = Array.isArray(selTeamObj.peloton_id) ? selTeamObj.peloton_id[0] : selTeamObj.peloton_id; } else if (pelotonSelect) { pelotonSelect.value = ''; } };
                }
                if (pelotonSelect) { pelotonSelect.disabled = true; pelotonSelect.style.opacity = '0.5'; let teamIdToUse = isManager ? document.getElementById('groupTeamSelect').value : this.currentRider.team_id; const teamObj = this.teamsMap[teamIdToUse]; if (teamObj && teamObj.peloton_id) { pelotonSelect.value = Array.isArray(teamObj.peloton_id) ? teamObj.peloton_id[0] : teamObj.peloton_id; } else { pelotonSelect.value = ''; } }
            } else if (type === 'private' || type === 'gruppetto') { // 🔥 ОБРАБОТКА ГРУППЕТТО
                pCont.style.display = 'flex'; let pList = Object.values(this.ridersMap).filter(r => r.id !== this.currentRider.id && r.email !== 'bot@sotka.one' && !(r.email && r.email.startsWith('guest_'))).sort((a,b) => a.last_name.localeCompare(b.last_name));
                pBox.innerHTML = pList.map(r => { const teamName = r.expand?.team_id?.name || 'Без команды'; return `<label class="group-part-label" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer; color:var(--text-main); font-size:13px; padding: 5px 0;"><div style="display:flex; align-items:center; gap:10px;"><input type="checkbox" class="group-part-cb" value="${r.id}" style="accent-color:var(--primary); width:16px; height:16px;"><span>${r.last_name} ${r.first_name}</span></div><span style="font-size:10px; color:var(--text-muted);">${teamName}</span></label>`}).join('');
            }
        }

        filterGroupParts(val) { const q = val.toLowerCase(); const labels = document.querySelectorAll('.group-part-label'); labels.forEach(lbl => { const text = lbl.querySelector('span').innerText.toLowerCase(); lbl.style.display = text.includes(q) ? 'flex' : 'none'; }); }

        async createGroupChat() {
            const name = document.getElementById('groupNameInput').value.trim(); const type = document.getElementById('groupTypeSelect').value; let pelotonId = document.getElementById('groupPelotonSelect').value; 
            if (!name) return alert('Введите название чата!');
            const btn = document.getElementById('btnCreateGroup'); btn.innerText = 'СОЗДАНИЕ...'; btn.disabled = true;
            let payload = { name: name, type: type, participants: [this.currentRider.id] }; 
            
            if (type === 'team') {
                const roles = this.usersMap[this.currentRider.email] || []; if (JSON.stringify(roles).includes('admin') || JSON.stringify(roles).includes('superadmin')) { payload.team_id = document.getElementById('groupTeamSelect').value; } else { payload.team_id = this.currentRider.team_id; }
                if(!payload.team_id) { btn.innerText = 'СОЗДАТЬ ЧАТ'; btn.disabled = false; return alert('Нет привязки к команде!'); }
                try { const teamData = await pb.collection('teams').getOne(payload.team_id); if (teamData && teamData.peloton_id) { pelotonId = Array.isArray(teamData.peloton_id) ? teamData.peloton_id[0] : teamData.peloton_id; } else { pelotonId = ""; } } catch (err) {}
            } else if (type === 'private' || type === 'gruppetto') { // 🔥 ЛИМИТЫ ГРУППЕТТО
                const checked = document.querySelectorAll('.group-part-cb:checked'); checked.forEach(cb => payload.participants.push(cb.value)); 
                if (type === 'gruppetto') {
                    if (payload.participants.length > 9) { btn.innerText = 'СОЗДАТЬ ЧАТ'; btn.disabled = false; return alert('В Группетто может быть максимум 9 участников!'); }
                    payload.captain = this.currentRider.id; // Назначаем создателя капитаном
                }
            }

            if (pelotonId) payload.peloton_id = pelotonId;

            try { const newChat = await pb.collection('chats').create(payload, { requestKey: null }); document.getElementById('createGroupModal').style.display = 'none'; await this.loadChats(); this.openChat(newChat.id); } catch(e) { alert('Ошибка создания группы'); } finally { btn.innerText = 'СОЗДАТЬ ЧАТ'; btn.disabled = false; }
        }

openCreateRadarModal() {
            document.getElementById('radarMessageInput').value = '';
            document.getElementById('radarLatInput').value = 'Поиск...';
            document.getElementById('radarLonInput').value = 'Поиск...';
            document.getElementById('radarCheckMapBtn').style.display = 'none';
            document.getElementById('createRadarModal').style.display = 'flex';
            
            // Как только открыли модалку - сразу ищем спутники!
            this.fetchRadarGPS();
        }
async joinRadar(chatId, event) {
            event.stopPropagation();
            const btn = event.currentTarget;
            btn.innerText = '⌛...';
            btn.disabled = true;
            
            try {
                const chat = this.chats.find(c => c.id === chatId);
                if (!chat) return;
                
                // Добавляем текущего гонщика в список участников
                const newParts = [...chat.participants, this.currentRider.id];
                await pb.collection('chats').update(chatId, { participants: newParts }, { requestKey: null });
                
                // Бот анонсирует в чате, что пришла помощь!
                const botRider = Object.values(this.ridersMap).find(r => r.email === 'bot@sotka.one');
                if (botRider) {
                    await pb.collection('messages').create({
                        chat_id: chatId,
                        sender_id: botRider.id,
                        text: `🙋‍♂️ Гонщик **${this.currentRider.first_name} ${this.currentRider.last_name}** откликнулся на сигнал радара!`
                    }, { requestKey: null });
                }
                
                await this.loadChats();
                this.openChat(chatId); // Перерисовываем шапку, чтобы кнопка пропала
                
            } catch(e) {
                alert('Ошибка сервера.');
                btn.innerText = 'ОШИБКА';
            }
        }
        fetchRadarGPS() {
            const latInput = document.getElementById('radarLatInput');
            const lonInput = document.getElementById('radarLonInput');
            
            latInput.value = 'Определение...';
            lonInput.value = 'Определение...';

            if (!navigator.geolocation) {
                latInput.value = ''; lonInput.value = '';
                alert("Ваш браузер не поддерживает GPS. Введите координаты вручную.");
                return;
            }

            navigator.geolocation.getCurrentPosition((position) => {
                // Округляем до 6 знаков (это точность до метра)
                const lat = position.coords.latitude.toFixed(6);
                const lon = position.coords.longitude.toFixed(6);
                
                latInput.value = lat;
                lonInput.value = lon;
                
                this.updateRadarMapLink();
                
                // Если гонщик правит координаты руками - сразу обновляем ссылку на предпросмотр
                latInput.oninput = () => this.updateRadarMapLink();
                lonInput.oninput = () => this.updateRadarMapLink();
                
            }, (error) => {
                latInput.value = ''; lonInput.value = '';
                alert("Не удалось поймать GPS. Введите координаты вручную из навигатора.");
            }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
        }

        updateRadarMapLink() {
            const lat = document.getElementById('radarLatInput').value.trim();
            const lon = document.getElementById('radarLonInput').value.trim();
            const checkBtn = document.getElementById('radarCheckMapBtn');
            
            // Если оба поля заполнены числами - показываем ссылку
            if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
                checkBtn.href = `https://yandex.ru/maps/?pt=${lon},${lat}&z=16&l=map`;
                checkBtn.style.display = 'inline-block';
            } else {
                checkBtn.style.display = 'none';
            }
        }

        async createRadar() {
            const type = document.getElementById('radarTypeSelect').value;
            const message = document.getElementById('radarMessageInput').value.trim();
            const latStr = document.getElementById('radarLatInput').value.trim();
            const lonStr = document.getElementById('radarLonInput').value.trim();
            const durationHours = parseInt(document.getElementById('radarDurationSelect').value) || 3; // 🔥 Берем часы
            const btn = document.getElementById('btnCreateRadar');
            
            if (!message) return alert('Опишите ситуацию!');
            if (!latStr || !lonStr || isNaN(latStr) || isNaN(lonStr)) return alert('Укажите корректные координаты (только числа)!');
            
            const lat = parseFloat(latStr);
            const lon = parseFloat(lonStr);

            btn.innerText = 'ОТПРАВКА СИГНАЛА...';
            btn.disabled = true;

            // 🔥 Вычисляем точное время, когда радар сгорит
            const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();

            const yandexMapUrl = `https://yandex.ru/maps/?pt=${lon},${lat}&z=16&l=map`;
            
            const panelData = {
                text: `Сигнал от: ${this.currentRider.first_name} ${this.currentRider.last_name}\nТип: ${type === 'sos' ? 'Нужна помощь' : 'Сбор'}\n\nКоординаты: ${lat.toFixed(6)}, ${lon.toFixed(6)}`,
                buttons: [
                    { label: '📍 ПОКАЗАТЬ НА КАРТЕ', url: yandexMapUrl, blank: true }
                ],
                expiresAt: expiresAt // 🔥 Зашиваем таймер в настройки
            };

            let payload = { 
                name: message, // 🔥 Убрали эмодзи, чтобы не ломался заголовок
                type: 'radar', 
                participants: [this.currentRider.id],
                peloton_id: this.currentPelotonFilter === 'all' ? "" : this.currentPelotonFilter,
                panel_data: JSON.stringify(panelData)
            };

            try { 
                const newChat = await pb.collection('chats').create(payload, { requestKey: null }); 
                
                const botRider = Object.values(this.ridersMap).find(r => r.email === 'bot@sotka.one');
                if (botRider) {
                    await pb.collection('messages').create({
                        chat_id: newChat.id,
                        sender_id: botRider.id,
                        text: `📡 Радар активирован! Он будет виден всем ${durationHours} ч.\n\n${message}\nОткройте «ИНФОРМАЦИЯ» (шторку сверху), чтобы проложить маршрут к точке.`,
                        is_announcement: true
                    }, { requestKey: null });
                }

                document.getElementById('createRadarModal').style.display = 'none'; 
                await this.loadChats(); 
                this.openChat(newChat.id); 
                
                const curtainPanel = document.getElementById('chatCurtainPanel');
                if (curtainPanel && !curtainPanel.classList.contains('open')) {
                    this.toggleChatCurtain();
                }

            } catch(e) { 
                alert('Ошибка создания радара'); 
            } finally { 
                btn.innerText = '🚀 ЗАПУСТИТЬ РАДАР'; btn.disabled = false; 
            }
        }

        async openNewsFeed() {
            this.activeChatId = 'newsfeed';
            this.openChatMobile();
            document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
            const activeItem = document.getElementById(`chat-item-newsfeed`); if (activeItem) activeItem.classList.add('active');
            
            const emptyMsg = document.getElementById('emptyChatMsg'); if (emptyMsg) emptyMsg.style.display = 'none';
            document.getElementById('inputWrapper').style.display = 'none'; 
            document.getElementById('chatHeader').style.display = 'flex'; 
            
            let ro = document.getElementById('readOnlyNotice');
            if (!ro) {
                ro = document.createElement('div'); ro.id = 'readOnlyNotice'; ro.style.cssText = 'padding: 15px; text-align: center; color: var(--text-muted); font-size: 12px; background: var(--bg-surface); border-top: 1px solid var(--border);';
                ro.innerText = 'Только для чтения. Писать может только Капитан.';
                document.getElementById('inputWrapper').parentNode.insertBefore(ro, document.getElementById('inputWrapper').nextSibling);
            }
            ro.style.display = 'none';

            const feedSubText = this.currentPelotonFilter === 'all' ? "Хроника всех клубов" : "Новости текущего пелотона";
            
            document.getElementById('activeChatName').innerHTML = `ЛЕНТА НОВОСТЕЙ КОМАНД <button onclick="window.app.copyChatLink('newsfeed')" title="Копировать ссылку" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:0 0 0 5px; vertical-align:middle; transition:0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></button>`;
            document.getElementById('activeChatAvatarContainer').innerHTML = `<div class="avatar" style="background:var(--primary); color:#000;">📰</div>`;
            document.getElementById('activeChatMeta').innerHTML = `<span style="color:var(--text-muted); font-size:10px; font-weight:bold; text-transform:uppercase;">${feedSubText}</span>`;
            document.getElementById('pinnedMessageBar').style.display = 'none';
            document.getElementById('deleteChatBtn').style.display = 'none';
            document.getElementById('leaveChatBtn').style.display = 'none';
            document.getElementById('editChatNameBtn').style.display = 'none';
            // 🔥 ФИКС: Жестко прячем и очищаем шторку от старого чата
            const curtain = document.getElementById('curtainContainer');
            if (curtain) { curtain.style.display = 'none'; curtain.innerHTML = ''; }
            const container = document.getElementById('messagesContainer');
            container.innerHTML = `<div style="text-align:center; padding:40px;"><span class="spinner" style="width:30px; height:30px; border-width:3px; display:inline-block;"></span></div>`;
            
            try {
                let channelChats = this.chats.filter(c => c.type === 'team_channel');
                if (this.currentPelotonFilter !== 'all') {
                    channelChats = channelChats.filter(c => {
                        let chatPId = c.peloton_id;
                        if (!chatPId) return false;
                        if (Array.isArray(chatPId)) return chatPId.includes(this.currentPelotonFilter);
                        return chatPId === this.currentPelotonFilter;
                    });
                }

                if (channelChats.length === 0) { container.innerHTML = `<div style="text-align:center; padding:50px; color:var(--text-muted); font-family:'Unbounded';">ПОКА НЕТ КАНАЛОВ</div>`; return; }
                
                let filters = channelChats.map(c => `chat_id="${c.id}"`).join(' || ');
                const res = await pb.collection('messages').getList(1, 40, { filter: `(${filters})`, sort: '-created', expand: 'reply_to,forwarded_from,chat_id', requestKey: null });
                
                container.innerHTML = '';
                if (res.items.length === 0) { container.innerHTML = `<div style="text-align:center; padding:50px; color:var(--text-muted); font-family:'Unbounded';">НОВОСТЕЙ ПОКА НЕТ</div>`; return; }
                
                res.items.reverse().forEach(m => { try { this.appendMessageHTML(m, container, false, true); } catch (err) { } });
                this.scrollToBottom(true);
this.syncRaceButtonsState();
            } catch(e) { container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger);">Ошибка загрузки ленты</div>`; }
        }

        async openChat(chatId) {
            try {
                if (this.activeChatId === chatId && window.innerWidth > 768) {
                    this.syncRaceButtonsState();
                    return; 
                }
				const chat = this.chats.find(c => c.id === chatId); if (!chat) return;
                this.activeChatId = chatId; this.unreadCounts[chatId] = 0; this.renderChatList(document.getElementById('chatSearch').value); this.cancelReplyEdit(); this.removeFile(); const sessionToken = Math.random(); this.chatSessionToken = sessionToken; this.openChatMobile(); 
                
                document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active')); const activeItem = document.getElementById(`chat-item-${chatId}`); if (activeItem) activeItem.classList.add('active');
                const emptyMsg = document.getElementById('emptyChatMsg'); if (emptyMsg) emptyMsg.style.display = 'none';
                document.getElementById('chatHeader').style.display = 'flex'; document.getElementById('messagesContainer').innerHTML = ''; 

                let chatName = this.getChatName(chat) || "Чат"; 
                document.getElementById('activeChatName').innerHTML = `${chatName} <button onclick="window.app.copyChatLink('${chatId}')" title="Копировать ссылку" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:0 0 0 5px; vertical-align:middle; transition:0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></button>`;
                
                let avatarContainer = document.getElementById('activeChatAvatarContainer'); 
                
                // 🔥 ФИКС ЭМОДЗИ: Берем первый символ правильно, даже если это сложный эмодзи
                let avatarLetter = [...chatName][0].toUpperCase();

                let avatarStyle = chat.type === 'global' ? 'background:var(--danger-light); color:var(--danger); border-color:var(--danger);' : (chat.type === 'team' ? 'background:rgba(59,130,246,0.1); color:var(--info); border-color:var(--info);' : (chat.type === 'team_channel' ? 'background:rgba(255,193,7,0.1); color:var(--primary); border-color:var(--primary);' : (chat.type === 'gruppetto' ? 'background:rgba(168,85,247,0.1); color:#a855f7; border-color:#a855f7;' : ''))); 

                // 🔥 ГРАФИЧЕСКАЯ ИКОНКА РАДАРА ДЛЯ ШАПКИ
                if (chat.type === 'radar') {
                    avatarStyle = 'background:rgba(255,51,102,0.15); color:var(--danger); border-color:var(--danger);';
                    avatarLetter = typeof this.getRadarSvg === 'function' ? this.getRadarSvg(24) : '📡';
                }

                if (chat.type === 'direct' && chat.expand && chat.expand.participants) {
                    const otherRider = chat.expand.participants.find(p => p.id !== this.currentRider.id);
                    if(otherRider) { if (otherRider.email === 'bot@sotka.one') avatarContainer.innerHTML = `<div class="avatar" style="background:var(--primary-light); color:var(--primary); border-color:var(--primary);">${this.getMotoSvg(24)}</div>`; else avatarContainer.innerHTML = this.renderAvatar(otherRider.id, '', avatarLetter); } else avatarContainer.innerHTML = `<div class="avatar">${avatarLetter}</div>`;
                } else { 
                    avatarContainer.innerHTML = `<div class="avatar" style="${avatarStyle}">${avatarLetter}</div>`; 
                }

                const deleteBtn = document.getElementById('deleteChatBtn'); const leaveBtn = document.getElementById('leaveChatBtn'); const editNameBtn = document.getElementById('editChatNameBtn');
                const myRole = this.getUserMaxRole(); const isSuper = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['superadmin']; const isAdmin = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['admin']; const isCaptain = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['captain'] && chat.type === 'team' && this.currentRider.team_id === chat.team_id; 
                
                // 🔥 Добавили права создателю радара
                const isCreator = (chat.type === 'private' || chat.type === 'gruppetto' || chat.type === 'radar') && (chat.captain === this.currentRider.id || (chat.participants && chat.participants[0] === this.currentRider.id));
                
                let isMyPelotonChat = false; const myTeam = this.teamsMap[this.currentRider.team_id]; const myP = myTeam && myTeam.peloton_id ? (Array.isArray(myTeam.peloton_id) ? myTeam.peloton_id[0] : myTeam.peloton_id) : null; const chatP = chat.peloton_id ? (Array.isArray(chat.peloton_id) ? chat.peloton_id[0] : chat.peloton_id) : null; if (myP && chatP && myP === chatP) isMyPelotonChat = true; const pelotonObj = this.pelotonsMap[chatP]; if (pelotonObj && pelotonObj.admin_id === this.userIdMap[this.currentRider.email]) isMyPelotonChat = true;
                const canManageChat = isSuper || (isAdmin && isMyPelotonChat) || isCaptain || isCreator;

                deleteBtn.style.display = 'none'; leaveBtn.style.display = 'none'; editNameBtn.style.display = 'none';
                if (canManageChat && chat.type !== 'team_channel' || chat.type === 'direct') deleteBtn.style.display = 'flex'; else if (chat.type === 'private' || chat.type === 'gruppetto' || chat.type === 'radar') leaveBtn.style.display = 'flex';
                if (canManageChat && chat.type !== 'direct' && chat.type !== 'team_channel') editNameBtn.style.display = 'block';

                let metaHtml = '';
                if (chat.type === 'direct') {
                    const otherRider = chat.expand?.participants?.find(p => p.id !== this.currentRider.id);
                    if (otherRider && otherRider.email === 'bot@sotka.one') metaHtml = `<span style="color:var(--primary); font-weight:bold; font-size:10px; text-transform:uppercase;">ОФИЦИАЛЬНЫЙ ИНФОРМАТОР</span>`; else if (otherRider) metaHtml = this.getRoleBadge(otherRider.id);
                } else if (chat.type === 'team') { metaHtml = `<span style="color:var(--info); font-weight:bold; font-size:10px; text-transform:uppercase;">Доступно команде</span>`; 
                } else if (chat.type === 'team_channel') { 
                    const captain = this.getCaptainByTeam(chat.team_id);
                    if (captain) { 
                        let joinBtn = '';
                        if (this.currentRider.team_id !== chat.team_id) { joinBtn = `<button onclick="window.app.requestToJoinTeam('${chat.team_id}', '${captain.id}')" style="background:var(--primary); color:#000; border:none; padding:4px 10px; border-radius:6px; font-size:9px; font-family:'Unbounded'; font-weight:800; cursor:pointer; margin-left:10px;">ВСТУПИТЬ В КОМАНДУ</button>`; }
                        metaHtml = `<div style="display:flex; align-items:center; flex-wrap: wrap; gap: 5px;"><span style="color:var(--text-muted); font-size:10px;">Капитан: <b>${captain.first_name} ${captain.last_name}</b> <svg onclick="window.app.startDirectChat('${captain.id}')" style="cursor:pointer; vertical-align:-3px; color:var(--primary); margin-left:5px;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></span>${joinBtn}</div>`; 
                    } 
                    else { metaHtml = `<span style="color:var(--primary); font-weight:bold; font-size:10px; text-transform:uppercase;">ПУБЛИЧНЫЙ КАНАЛ</span>`; }
                } else if (chat.type === 'private' || chat.type === 'gruppetto') { 
                    metaHtml = `<span style="color:var(--primary); font-weight:bold; font-size:10px; text-transform:uppercase; cursor:pointer;" onclick="window.app.openParticipantsModal()">Участников: ${chat.participants ? chat.participants.length : 0} ▾</span>`; 
                } else if (chat.type === 'radar') {
                    // 🔥 ДОБАВЛЯЕМ КНОПКУ "ОТКЛИКНУТЬСЯ", ЕСЛИ МЫ ЕЩЕ НЕ ТАМ
                    let radarAction = '';
                    if (!chat.participants.includes(this.currentRider.id)) {
                        radarAction = `<button onclick="window.app.joinRadar('${chat.id}', event)" style="background:var(--danger); color:#fff; border:none; padding:4px 10px; border-radius:6px; font-size:9px; font-family:'Unbounded'; font-weight:800; cursor:pointer; margin-left:10px; box-shadow:0 0 10px rgba(255,51,102,0.3); transition:0.2s;">🙋‍♂️ ОТКЛИКНУТЬСЯ</button>`;
                    }
                    metaHtml = `<div style="display:flex; align-items:center; flex-wrap:wrap; gap:5px;"><span class="radar-pulse-anim" style="color:var(--danger); font-weight:bold; font-size:10px; text-transform:uppercase; cursor:pointer; background:rgba(255,51,102,0.1); padding:2px 6px; border-radius:4px; border:1px solid rgba(255,51,102,0.3);" onclick="window.app.openParticipantsModal()">🚨 Сигнал Радара • Участников: ${chat.participants ? chat.participants.length : 0} ▾</span>${radarAction}</div>`;
                } else { 
                    metaHtml = `<span style="color:var(--danger); font-weight:bold; font-size:10px; text-transform:uppercase;">Видят все</span>`; 
                }
                document.getElementById('activeChatMeta').innerHTML = metaHtml;

                const inputWrap = document.getElementById('inputWrapper');
                let ro = document.getElementById('readOnlyNotice');
                if (!ro) { 
                    ro = document.createElement('div'); ro.id = 'readOnlyNotice'; ro.style.cssText = 'padding: 15px; text-align: center; color: var(--text-muted); font-size: 12px; background: var(--bg-surface); border-top: 1px solid var(--border);'; 
                    ro.innerText = 'Только для чтения. Писать может только Капитан.'; 
                    inputWrap.parentNode.insertBefore(ro, inputWrap.nextSibling); 
                }
                
                if (chat.type === 'team_channel') {
                    const isMyTeamCap = (this.currentRider.team_id === chat.team_id && this.ROLE_WEIGHTS[this.getUserMaxRole()] >= this.ROLE_WEIGHTS['captain']);
                    if (!isMyTeamCap && !isSuper) { inputWrap.style.display = 'none'; ro.style.display = 'block'; } 
                    else { inputWrap.style.display = 'flex'; ro.style.display = 'none'; }
                } else { inputWrap.style.display = 'flex'; ro.style.display = 'none'; }

                this.renderPinnedMessage(); 
                await this.refreshCurrentChatMessages(chatId, sessionToken, true);
                await this.renderChatCurtain(chat, canManageChat);
                
                // 🔥 ФИКС: Принудительно синхронизируем кнопки с базой ПРИ КАЖДОМ открытии чата
                setTimeout(() => {
                    this.syncRaceButtonsState();
                }, 100);
            } catch (e) {}
        }

        async requestToJoinTeam(targetTeamId, captainId) {
            await this.startDirectChat(captainId);
            const team = this.teamsMap[targetTeamId]; const teamName = team ? team.name : "вашу команду";
            const input = document.getElementById('messageInput');
            input.value = `Привет! Хочу перейти в ${teamName}. Одобришь трансфер? \n\n[ACTION:TRANSFER:${this.currentRider.id}:${targetTeamId}]`;
            input.style.height = '90px';
            input.focus();
        }
		async inviteToTeam(riderId) {
            const targetRider = this.ridersMap[riderId];
            if (!targetRider) return;
            const myTeam = this.teamsMap[this.currentRider.team_id];
            const teamName = myTeam ? myTeam.name : "нашу команду";
            
            await this.startDirectChat(riderId);
            
            const input = document.getElementById('messageInput');
            input.value = `Привет! Приглашаю тебя вступить в ${teamName}. Согласен? \n\n[ACTION:TRANSFER:${riderId}:${this.currentRider.team_id}]`;
            input.style.height = '90px';
            input.focus();
        }

        async renderPinnedMessage() {
            const chat = this.chats.find(c => c.id === this.activeChatId);
            const bar = document.getElementById('pinnedMessageBar'); const textEl = document.getElementById('pinnedMessageText'); const unpinBtn = document.getElementById('unpinBtn');
            if (chat && chat.pinned_message) {
                try {
                    const msg = await pb.collection('messages').getOne(chat.pinned_message, {requestKey: null}); let pinText = msg.text || (msg.file ? 'Вложение' : 'Закрепленное сообщение'); let btnHtml = '';
                    const regMatch = pinText.match(/\[ACTION:REGISTER:([a-zA-Z0-9_]+)\]/); if (regMatch) { const raceId = regMatch[1]; pinText = pinText.replace(regMatch[0], '').trim(); btnHtml = `<button class="sync-btn-${raceId}" style="background:var(--primary); color:#000; border:none; padding:4px 10px; border-radius:6px; font-size:10px; font-family:'Unbounded'; font-weight:800; cursor:pointer; margin-left:10px; flex-shrink:0;" onclick="window.app.registerForRace('${raceId}', this, event)">ЗАЯВИТЬСЯ</button>`; }
                    const liveMatch = pinText.match(/\[ACTION:LIVE:([a-zA-Z0-9_]+)\]/); if (liveMatch) { const raceId = liveMatch[1]; pinText = pinText.replace(liveMatch[0], '').trim(); btnHtml = `<button style="background:var(--danger); color:#fff; border:none; padding:4px 10px; border-radius:6px; font-size:10px; font-family:'Unbounded'; font-weight:800; cursor:pointer; margin-left:10px; flex-shrink:0; display:flex; align-items:center; gap:5px;" onclick="window.app.openLiveBoard('${raceId}', event)"><div style="width:6px; height:6px; background:#fff; border-radius:50%; animation: dot-pulse 1s infinite;"></div>LIVE</button>`; }
                    
                    textEl.style.display = 'flex'; textEl.style.alignItems = 'center'; textEl.innerHTML = `<span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;">${pinText}</span>${btnHtml}`; bar.style.display = 'flex';
                    
                    const myRole = this.getUserMaxRole(); const isSuper = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['superadmin']; const isAdmin = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['admin']; const isCaptain = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['captain'] && (chat.type === 'team' || chat.type === 'team_channel') && this.currentRider.team_id === chat.team_id; const isCreator = chat.type === 'private' && chat.participants && chat.participants[0] === this.currentRider.id;
                    let isMyP = false; const myTeam = this.teamsMap[this.currentRider.team_id]; const myP = myTeam && myTeam.peloton_id ? (Array.isArray(myTeam.peloton_id) ? myTeam.peloton_id[0] : myTeam.peloton_id) : null; const chatP = chat.peloton_id ? (Array.isArray(chat.peloton_id) ? chat.peloton_id[0] : chat.peloton_id) : null; if (myP && chatP && myP === chatP) isMyP = true;
                    
                    unpinBtn.style.display = (isSuper || (isAdmin && isMyP) || isCaptain || isCreator) ? 'block' : 'none';
                    bar.onclick = (e) => { if (e.target.id === 'unpinBtn' || e.target.tagName.toLowerCase() === 'button') return; const el = document.getElementById(`msg-${msg.id}`); if(el) { el.scrollIntoView({behavior: 'smooth', block: 'center'}); el.style.backgroundColor = 'var(--primary-light)'; setTimeout(() => el.style.backgroundColor = 'transparent', 1500); } else { this.scrollToBottom(); alert("Сообщение слишком старое, проскролльте вверх."); } };
                } catch(e) { bar.style.display = 'none'; }
            } else { bar.style.display = 'none'; }
        }

        async unpinMessage(event) { event.stopPropagation(); if (!confirm("Открепить сообщение?")) return; await pb.collection('chats').update(this.activeChatId, { pinned_message: null }, { requestKey: null }); this.renderPinnedMessage(); }
        async pinMessage(msgId) { await pb.collection('chats').update(this.activeChatId, { pinned_message: msgId }, { requestKey: null }); this.renderPinnedMessage(); }
        async editCurrentChatName() { if (!this.activeChatId) return; const chat = this.chats.find(c => c.id === this.activeChatId); if (!chat) return; const newName = prompt("Новое название чата:", chat.name); if (newName && newName.trim() !== "" && newName !== chat.name) { try { await pb.collection('chats').update(chat.id, { name: newName.trim() }, { requestKey: null }); document.getElementById('activeChatName').innerText = newName.trim(); this.loadChats(); } catch(e) { alert("Ошибка сохранения"); } } }
        async kickRider(riderId, event) { event.stopPropagation(); if(!confirm("Исключить гонщика из чата?")) return; const chat = this.chats.find(c => c.id === this.activeChatId); const newParts = chat.participants.filter(id => id !== riderId); try { await pb.collection('chats').update(this.activeChatId, { participants: newParts }, { requestKey: null }); this.openParticipantsModal(); this.loadChats(); } catch(e) { alert("Ошибка исключения"); } }

        openParticipantsModal() {
            const chat = this.chats.find(c => c.id === this.activeChatId); if (!chat || !chat.participants) return;
            const list = document.getElementById('participantsList'); list.innerHTML = '';
            const myRole = this.getUserMaxRole(); const canManageChat = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['admin'] || (chat.type === 'team' && this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['captain']) || ((chat.type === 'private' || chat.type === 'gruppetto') && chat.participants[0] === this.currentRider.id);
            
            chat.participants.forEach((riderId, index) => {
                const r = this.ridersMap[riderId]; if (!r || r.email === 'bot@sotka.one') return;
                const isCreatorUser = ((chat.type === 'private' || chat.type === 'gruppetto') && index === 0); const creatorBadge = isCreatorUser ? `<span style="background: rgba(255, 193, 7, 0.2); color: var(--primary); padding: 2px 6px; border-radius: 4px; font-size: 9px; font-family: 'Unbounded'; font-weight: 800;">КАПИТАН</span>` : '';
                let kickBtnHtml = ''; if (canManageChat && r.id !== this.currentRider.id) kickBtnHtml = `<button onclick="window.app.kickRider('${r.id}', event);" style="background:rgba(255,51,102,0.1); border:1px solid rgba(255,51,102,0.3); color:var(--danger); padding:5px 8px; border-radius:8px; cursor:pointer;">✕</button>`;

                const el = document.createElement('div'); el.className = 'contact-item';
                el.innerHTML = `<div style="display:flex; align-items:center; gap:12px; flex:1;">${this.renderAvatar(r.id, 'width:36px; height:36px; font-size:14px; background:transparent;', r.first_name.charAt(0))}<div><div style="font-weight:600; font-size:14px; color:var(--text-main); margin-bottom:4px;">${r.first_name} ${r.last_name}</div><div style="font-size:11px; color:var(--text-muted); display:flex; gap:8px; align-items:center;"><span>${r.expand?.team_id?.name || 'Без команды'}</span> ${this.getRoleBadge(r.id)} ${creatorBadge}</div></div></div><div style="display:flex; gap:10px; align-items:center;">${kickBtnHtml}</div>`;
                list.appendChild(el);
            });
            document.getElementById('addMembersToPrivateBtn').style.display = ((chat.type === 'private' || chat.type === 'gruppetto') && canManageChat) ? 'block' : 'none'; document.getElementById('participantsModal').style.display = 'flex';
        }

        openAddMembersModal() { 
            const chat = this.chats.find(c => c.id === this.activeChatId); 
            if (!chat) return; 
            
            document.getElementById('participantsModal').style.display = 'none'; 
            const currentParts = chat.participants || []; 
            let pList = Object.values(this.ridersMap)
                .filter(r => !currentParts.includes(r.id) && r.email !== 'bot@sotka.one' && !(r.email && r.email.startsWith('guest_')))
                .sort((a,b) => a.last_name.localeCompare(b.last_name)); 
            
            document.getElementById('addMembersList').innerHTML = pList.map(r => `
                <label class="add-member-label" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer; color:var(--text-main); font-size:13px; padding: 5px 0;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <input type="checkbox" class="add-member-cb" value="${r.id}" style="accent-color:var(--primary); width:16px; height:16px;">
                        <span>${this.escapeHTML(r.last_name)} ${this.escapeHTML(r.first_name)}</span>
                    </div>
                    <span style="font-size:10px; color:var(--text-muted);">${this.escapeHTML(r.expand?.team_id?.name || 'Без команды')}</span>
                </label>`).join(''); 
                
            document.getElementById('addMemberSearch').value = ''; 
            document.getElementById('addMembersModal').style.display = 'flex'; 
        }

        filterAddMembers(val) { 
            const q = val.toLowerCase(); 
            document.querySelectorAll('.add-member-label').forEach(lbl => { 
                lbl.style.display = lbl.innerText.toLowerCase().includes(q) ? 'flex' : 'none'; 
            }); 
        }

        async submitAddMembers() { 
            const checked = document.querySelectorAll('.add-member-cb:checked'); 
            if (checked.length === 0) return alert("Выберите участника"); 
            
            const chat = this.chats.find(c => c.id === this.activeChatId); 
            
            // 🔥 ПРОВЕРКА ЛИМИТА ПРИ ДОБАВЛЕНИИ НОВЫХ В ГРУППЕТТО
            if (chat.type === 'gruppetto' && (chat.participants.length + checked.length) > 9) {
                return alert(`В Группетто максимум 9 мест. Вы можете добавить еще не более ${9 - chat.participants.length} чел.`);
            }

            let newParts = [...chat.participants]; 
            checked.forEach(cb => newParts.push(cb.value)); 
            
            try { 
                await pb.collection('chats').update(this.activeChatId, { participants: newParts }, { requestKey: null }); 
                document.getElementById('addMembersModal').style.display = 'none'; 
                await this.loadChats(); 
                const updatedChat = this.chats.find(c => c.id === this.activeChatId); 
                document.getElementById('activeChatMeta').innerHTML = `<span style="color:var(--primary); font-weight:bold; font-size:10px; text-transform:uppercase; cursor:pointer;" onclick="window.app.openParticipantsModal()">Участников: ${updatedChat.participants.length} ▾</span>`; 
            } catch (e) { 
                alert("Ошибка добавления"); 
            } 
        }

        async refreshCurrentChatMessages(expectedChatId, sessionToken, showLoader = true) {
            if (!expectedChatId) return; const loader = document.getElementById('chatLoader'); if (loader && showLoader) loader.style.display = 'block';
            try {
                this.messagePage = 1; const res = await pb.collection('messages').getList(1, 50, { filter: `chat_id="${expectedChatId}"`, sort: '-created', expand: 'reply_to,forwarded_from', requestKey: null });
                if (this.chatSessionToken !== sessionToken) return;
                if (loader) loader.style.display = 'none'; const container = document.getElementById('messagesContainer'); if (!container) return;
                container.innerHTML = ''; this.hasMoreMessages = res.items.length === 50; res.items.reverse().forEach(m => { try { this.appendMessageHTML(m, container, false); } catch (err) { } });
                this.markMessagesAsRead(res.items); this.scrollToBottom();
            } catch(e) { if (loader) loader.style.display = 'none'; }
        }

        async loadMoreMessages() {
            this.isLoadingMessages = true; this.messagePage++; const loader = document.getElementById('chatLoader'); if(loader) loader.style.display = 'block';
            try {
                const res = await pb.collection('messages').getList(this.messagePage, 50, { filter: `chat_id="${this.activeChatId}"`, sort: '-created', expand: 'reply_to,forwarded_from', requestKey: null });
                const container = document.getElementById('messagesContainer'); const oldScrollHeight = container.scrollHeight;
                this.hasMoreMessages = res.items.length === 50; res.items.reverse().forEach(m => { try { this.appendMessageHTML(m, container, true); } catch (err) { } });
                container.scrollTop = container.scrollHeight - oldScrollHeight; this.markMessagesAsRead(res.items);
            } catch (e) { this.messagePage--; } finally { this.isLoadingMessages = false; if(loader) loader.style.display = 'none'; }
        }

        async softRefreshMessages() {
            if (!this.activeChatId) return; 
            const container = document.getElementById('messagesContainer'); 
            
            // 🔥 УМНЫЙ СКРОЛЛ: Проверяем, находимся ли мы в самом низу ДО удаления сообщений
            const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
            const currentScroll = container.scrollTop;
            
            const res = await pb.collection('messages').getList(1, this.messagePage * 50, { filter: `chat_id="${this.activeChatId}"`, sort: '-created', expand: 'reply_to,forwarded_from', requestKey: null });
            
            container.innerHTML = ''; 
            res.items.reverse().forEach(m => { try { this.appendMessageHTML(m, container, false); } catch (err) { } }); 
            
            // 🔥 Возвращаем скролл без дерганий
            if (isAtBottom) {
                this.scrollToBottom();
            } else {
                container.scrollTop = currentScroll;
            }
        }

        async markMessagesAsRead(messages) {
            const unread = messages.filter(m => m.sender_id !== this.currentRider.id && !(m.read_by || []).includes(this.currentRider.id));
            if (unread.length === 0) return;

            // 🔥 ФОНОВЫЙ РЕЖИМ С ПАУЗАМИ:
            // Откладываем тяжелую работу на полсекунды, чтобы история чата успела отрисоваться мгновенно
            setTimeout(async () => {
                for (let msg of unread) {
                    let rBy = msg.read_by || [];
                    if (!rBy.includes(this.currentRider.id)) {
                        rBy.push(this.currentRider.id);
                        try {
                            // Шлем запрос
                            await pb.collection('messages').update(msg.id, { read_by: rBy }, { requestKey: null });
                            // 🔥 Микро-пауза 50мс между запросами, чтобы дышал сетевой канал браузера!
                            await new Promise(r => setTimeout(r, 50));
                        } catch(e) { }
                    }
                }
            }, 500);
        }

        async openMessageMenu(msgId) {
            try {
                const msg = await pb.collection('messages').getOne(msgId, { requestKey: null }); this.contextMessageObj = msg;
                const msgSenderIdStr = Array.isArray(msg.sender_id) ? msg.sender_id[0] : msg.sender_id; if (this.ridersMap[msgSenderIdStr]?.email === 'bot@sotka.one') return; 
                
                const myRole = this.getUserMaxRole(); const isSuper = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['superadmin']; const isAdmin = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['admin']; const isMine = msg.sender_id === this.currentRider.id;
                const chat = this.chats.find(c => c.id === this.activeChatId); let isMyP = false;
                if (chat) { const chatP = chat.peloton_id ? (Array.isArray(chat.peloton_id) ? chat.peloton_id[0] : chat.peloton_id) : null; if (this.pelotonsMap[chatP]?.admin_id === this.userIdMap[this.currentRider.email]) isMyP = true; }

                const canDel = isSuper || (isAdmin && isMyP); const canManage = canDel || (this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['captain'] && (chat?.type === 'team' || chat?.type === 'team_channel') && this.currentRider.team_id === chat?.team_id) || (chat?.type === 'private' && chat?.participants[0] === this.currentRider.id);
                const isAnnounce = msg.is_announcement === true;

                document.getElementById('ctxBtnPin').style.display = canManage ? 'flex' : 'none'; document.getElementById('ctxBtnEdit').style.display = (isMine && !isAnnounce) ? 'flex' : 'none'; document.getElementById('ctxBtnDelete').style.display = ((isMine && !isAnnounce) || (canManage && (!isAnnounce || isSuper))) ? 'flex' : 'none'; document.getElementById('ctxMenuOverlay').style.display = 'flex';
            } catch(e) {}
        }

        closeContextMenu(e) { if(e) e.stopPropagation(); document.getElementById('ctxMenuOverlay').style.display = 'none'; this.contextMessageObj = null; }

        async submitContextReaction(key) {
            if(!this.contextMessageObj) return; const msgId = this.contextMessageObj.id; this.closeContextMenu();
            try {
                const msg = await pb.collection('messages').getOne(msgId, { requestKey: null }); let reactions = msg.reactions || {}; if (typeof reactions !== 'object') reactions = {};
                if (!reactions[key]) reactions[key] = []; const idx = reactions[key].indexOf(this.currentRider.id);
                if (idx > -1) { reactions[key].splice(idx, 1); if(reactions[key].length === 0) delete reactions[key]; } else { reactions[key].push(this.currentRider.id); }
                await pb.collection('messages').update(msgId, { reactions: reactions }, { requestKey: null });
            } catch(e) {}
        }
        async submitContextReactionMock(msgId, key) { this.contextMessageObj = {id: msgId}; await this.submitContextReaction(key); }

        ctxActionReply() { if(!this.contextMessageObj) return; const msgId = this.contextMessageObj.id; this.closeContextMenu(); this.prepareReply(msgId); }
        ctxActionForward() { if(!this.contextMessageObj) return; const msgId = this.contextMessageObj.id; this.closeContextMenu(); this.openForwardModal(msgId); }
        ctxActionPin() { if(!this.contextMessageObj) return; const msgId = this.contextMessageObj.id; this.closeContextMenu(); this.pinMessage(msgId); }
        
        async ctxActionEdit() { 
            if(!this.contextMessageObj) return; 
            const msg = this.contextMessageObj; 
            this.closeContextMenu(); 
            this.cancelReplyEdit(); 
            this.editingMessageId = msg.id; 
            this.fileToDelete = false; 
            
            let hasFile = msg.file && msg.file.length > 0;
            let delBtn = hasFile ? `<span onclick="window.app.fileToDelete = true; this.innerText='Будет удалено!'; this.style.color='var(--danger)';" style="margin-left:15px; font-size:10px; background:rgba(255,51,102,0.1); color:var(--danger); padding:3px 8px; border-radius:4px; cursor:pointer;">[🗑 Удалить фото]</span>` : '';
            
            const input = document.getElementById('messageInput'); 
            input.value = msg.text || ""; 
            input.focus(); 
            setTimeout(() => { input.style.height = '46px'; input.style.height = Math.min(input.scrollHeight, 250) + 'px'; }, 10);
            
            document.getElementById('replyEditTitle').innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Редактирование ${delBtn}`; 
            document.getElementById('replyEditText').innerText = msg.text || ""; 
            document.getElementById('replyEditBar').style.display = 'flex'; 
            document.getElementById('vIcon').style.display = 'none'; 
            document.getElementById('checkIcon').style.display = 'block'; 
        }

        async ctxActionDelete() { 
            if(!this.contextMessageObj) return; 
            const msgId = this.contextMessageObj.id; 
            this.closeContextMenu(); 
            
            if (confirm("Удалить сообщение для всех?")) { 
                // 🔥 ФИКС 1: Мгновенно скрываем сообщение с экрана еще до ответа сервера (для скорости)
                const el = document.getElementById(`msg-${msgId}`);
                if (el) el.remove();

                try { 
                    await pb.collection('messages').delete(msgId, { requestKey: null }); 
                } catch(e) { 
                    alert("Ошибка при удалении.");
                    this.softRefreshMessages(); // Если сервер выдал ошибку, возвращаем всё как было
                } 
            } 
        }

        async openForwardModal(msgId) { this.forwardingMessage = await pb.collection('messages').getOne(msgId, { requestKey: null }); document.getElementById('forwardSearch').value = ''; this.renderForwardList(''); document.getElementById('forwardModal').style.display = 'flex'; }
        
        renderForwardList(filterText = '') {
            const list = document.getElementById('forwardList'); let html = ''; let fChats = this.chats.filter(c => c.type !== 'direct'); if(filterText) fChats = fChats.filter(c => this.getChatName(c).toLowerCase().includes(filterText.toLowerCase()));
            if (fChats.length > 0) { 
                html += `<div style="font-size:10px; color:var(--text-muted); margin: 10px 0 5px 0; font-family:'Unbounded';">ВАШИ ЧАТЫ</div>`; 
                fChats.forEach(c => { 
                    // 🛡️ QA FIX: Экранируем название чата
                    const safeChatName = this.escapeHTML(this.getChatName(c));
                    html += `<div class="contact-item" onclick="window.app.forwardToChat('${c.id}')"><div style="font-weight:600; font-size:13px; color:var(--text-main);">${safeChatName}</div></div>`; 
                }); 
            }
            let fContacts = Object.values(this.ridersMap).filter(r => r.id !== this.currentRider.id && r.email !== 'bot@sotka.one' && !(r.email && r.email.startsWith('guest_'))); if(filterText) fContacts = fContacts.filter(r => (r.first_name + ' ' + r.last_name).toLowerCase().includes(filterText.toLowerCase()));
            if (fContacts.length > 0) { 
                html += `<div style="font-size:10px; color:var(--text-muted); margin: 15px 0 5px 0; font-family:'Unbounded';">ЛИЧНЫЕ КОНТАКТЫ</div>`; 
                fContacts.forEach(r => { 
                    // 🛡️ QA FIX: Экранируем имя контакта
                    const safeName = this.escapeHTML(r.first_name + ' ' + r.last_name);
                    html += `<div class="contact-item" onclick="window.app.forwardToUser('${r.id}')"><div style="font-weight:600; font-size:13px; color:var(--text-main);">${safeName}</div></div>`; 
                }); 
            }
            list.innerHTML = html;
        }
        async forwardToChat(chatId) {
            document.getElementById('forwardModal').style.display = 'none';
            try {
                const formData = new FormData(); formData.append('chat_id', chatId); formData.append('sender_id', this.currentRider.id); formData.append('text', this.forwardingMessage.text || ''); 
                let originalSenderId = this.forwardingMessage.sender_id; if (Array.isArray(originalSenderId)) originalSenderId = originalSenderId[0]; formData.append('forwarded_from', originalSenderId);

                let fName = this.forwardingMessage.file; if (Array.isArray(fName)) fName = fName[0];
                if (fName && typeof fName === 'string' && fName.trim() !== '') { const fileUrl = `${pb.baseUrl}/api/files/${this.forwardingMessage.collectionId}/${this.forwardingMessage.id}/${fName}`; const response = await fetch(fileUrl); const blob = await response.blob(); formData.append('file', blob, fName); }

                await pb.collection('messages').create(formData, { requestKey: null }); await pb.collection('chats').update(chatId, { updated: new Date().toISOString() }, { requestKey: null });
                if (this.activeChatId === chatId) { this.softRefreshMessages(); this.scrollToBottom(true); } else { alert('Успешно переслано!'); }
            } catch(e) { alert('Ошибка пересылки'); console.error(e); }
        }
        async forwardToUser(userId) {
            let chat = this.chats.find(c => c.type === 'direct' && c.participants.includes(this.currentRider.id) && c.participants.includes(userId));
            if (!chat) { chat = await pb.collection('chats').create({ type: 'direct', name: 'Direct', participants: [this.currentRider.id, userId] }, { requestKey: null }); await this.loadChats(); }
            this.forwardToChat(chat.id);
        }

        scrollToBottom(smooth = false) { 
            const c = document.getElementById('messagesContainer'); 
            if (!c) return;
            const lastMsg = c.lastElementChild;
            
            if (lastMsg && (this.activeChatId === 'newsfeed' || this.chats.find(ch => ch.id === this.activeChatId)?.type === 'team_channel')) {
                if (lastMsg.clientHeight > (c.clientHeight * 0.8)) { 
                    c.scrollTo({ top: lastMsg.offsetTop - 20, behavior: smooth ? 'smooth' : 'auto' }); 
                } else { 
                    c.scrollTo({ top: c.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); 
                }
            } else {
                c.scrollTo({ top: c.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); 
            }
            
            const btn = document.getElementById('scrollBottomBtn');
            if (btn) btn.style.display = 'none'; 
        }

        async prepareReply(msgId) { this.cancelReplyEdit(); this.replyingToMessageId = msgId; const msg = await pb.collection('messages').getOne(msgId, { requestKey: null }); const senderId = Array.isArray(msg.sender_id) ? msg.sender_id[0] : msg.sender_id; const sender = this.ridersMap[senderId] || {first_name: 'Кто-то'}; document.getElementById('replyEditTitle').innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg> Ответ для ${sender.first_name}`; document.getElementById('replyEditText').innerText = msg.text ? msg.text : 'Вложение'; document.getElementById('replyEditBar').style.display = 'flex'; document.getElementById('messageInput').focus(); }
        
        cancelReplyEdit() { this.editingMessageId = null; this.replyingToMessageId = null; this.fileToDelete = false; document.getElementById('replyEditBar').style.display = 'none'; const input = document.getElementById('messageInput'); input.value = ''; input.style.height = '46px'; document.getElementById('vIcon').style.display = 'block'; document.getElementById('checkIcon').style.display = 'none'; }
        
        handleFileSelect(inputElement) { const file = inputElement.files[0]; const previewBox = document.getElementById('filePreviewBox'); if (file) { document.getElementById('filePreviewName').innerText = file.name; previewBox.style.display = 'flex'; } else { this.removeFile(); } }
        removeFile() { document.getElementById('fileInput').value = ''; document.getElementById('filePreviewBox').style.display = 'none'; }
        
        async compressImage(file, maxSizeMB = 2) {
            return new Promise((resolve, reject) => {
                if (!file.type.startsWith('image/') || file.type === 'image/gif') return resolve(file); 
                const reader = new FileReader(); reader.readAsDataURL(file);
                reader.onload = event => {
                    const img = new Image(); img.src = event.target.result;
                    img.onload = () => {
                        const canvas = document.createElement('canvas'); let width = img.width; let height = img.height; const MAX_SIZE = 1920; 
                        if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                        canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
                        const maxBytes = maxSizeMB * 1024 * 1024;
                        const createBlob = (q) => { canvas.toBlob(blob => { 
                            if (blob.size > maxBytes && q > 0.1) { createBlob(q - 0.1); } 
                            else { resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' })); } 
                        }, 'image/jpeg', q); };
                        createBlob(0.9);
                    };
                };
                reader.onerror = error => reject(error);
            });
        }

        async sendMessage() {
            const input = document.getElementById('messageInput'); const fileInput = document.getElementById('fileInput'); const btnIcon = document.getElementById('sendBtnIcon'); const vIcon = document.getElementById('vIcon'); const compressingText = document.getElementById('filePreviewCompressing');
            let text = input.value.trim(); let file = fileInput.files[0];
            if ((!text && !file && !this.fileToDelete) || !this.activeChatId) return;
            
            if (this.editingMessageId) { 
                btnIcon.style.pointerEvents = 'none'; if (vIcon) vIcon.classList.add('v-fly'); const minAnim = new Promise(res => setTimeout(res, 800));
                try {
                    const updateData = new FormData();
                    updateData.append('text', text);
                    if (this.fileToDelete) { updateData.append('file', ''); }
                    if (file) {
                        if (file.type.startsWith('image/')) { 
                            if(compressingText) compressingText.style.display = 'inline'; 
                            file = await this.compressImage(file, 2); 
                            if(compressingText) compressingText.style.display = 'none'; 
                        }
                        updateData.append('file', file);
                    }
                    await pb.collection('messages').update(this.editingMessageId, updateData, { requestKey: null }); 
                    this.cancelReplyEdit(); this.removeFile();
                } catch(e) { alert("Ошибка сохранения"); } finally { await minAnim; btnIcon.style.pointerEvents = 'auto'; if (vIcon) vIcon.classList.remove('v-fly'); if(compressingText) compressingText.style.display = 'none'; }
                return; 
            }

            let isAnnouncement = false;
            if (text.toLowerCase().startsWith('/news')) {
                const roles = this.usersMap[this.currentRider.email] || [];
                if (JSON.stringify(roles).includes('judge') || JSON.stringify(roles).includes('admin') || JSON.stringify(roles).includes('superadmin')) { isAnnouncement = true; text = text.replace(/^\/news\s*/i, '').trim(); if (!text && !file) return alert("Уведомление не может быть пустым."); } else return alert("Команда /news доступна только Судьям!");
            }

            btnIcon.style.pointerEvents = 'none'; if (vIcon) vIcon.classList.add('v-fly'); const minAnim = new Promise(res => setTimeout(res, 800)); 
            try {
                if (file && file.type.startsWith('image/')) { if(compressingText) compressingText.style.display = 'inline'; file = await this.compressImage(file, 2); if(compressingText) compressingText.style.display = 'none'; }
                const formData = new FormData(); formData.append('chat_id', this.activeChatId); formData.append('sender_id', this.currentRider.id); formData.append('text', text); 
                if (isAnnouncement) formData.append('is_announcement', true); if (file) formData.append('file', file); if (this.replyingToMessageId) formData.append('reply_to', this.replyingToMessageId);
                await pb.collection('messages').create(formData, { requestKey: null }); await pb.collection('chats').update(this.activeChatId, { updated: new Date().toISOString() }, { requestKey: null });
                input.value = ''; input.style.height = '46px'; this.removeFile(); this.cancelReplyEdit(); input.focus();
            } catch(e) { alert("Ошибка отправки."); } finally { await minAnim; btnIcon.style.pointerEvents = 'auto'; if (vIcon) vIcon.classList.remove('v-fly'); if(compressingText) compressingText.style.display = 'none'; }
        }

        async initiateTransfer(riderId, oldTeamId) {
            const targetRider = this.ridersMap[riderId];
            if (!targetRider) return;
            const oldCap = this.getCaptainByTeam(oldTeamId);
            if (!oldCap) return alert("У текущей команды гонщика нет Капитана. Обратитесь к организаторам.");
            const myTeamName = this.teamsMap[this.currentRider.team_id]?.name || 'нашу команду';
            await this.startDirectChat(oldCap.id);
            const input = document.getElementById('messageInput');
            input.value = `Привет! Мы хотим перевести в ${myTeamName} гонщика ${targetRider.first_name} ${targetRider.last_name}. Отпустишь? \n\n[ACTION:TRANSFER:${riderId}:${this.currentRider.team_id}]`;
            input.style.height = '90px';
            input.focus();
            this.closeProfileModal();
        }

        async approveTransfer(riderId, newTeamId, msgId, btn, event) {
            event.stopPropagation();
            const rider = this.ridersMap[riderId];
            if (!rider) return alert("Гонщик не найден");
            
            const myRoleWeight = Math.max(...(this.usersMap[this.currentRider.email] || []).map(r => this.ROLE_WEIGHTS[r] || 20), 20);
            const isSuper = myRoleWeight >= this.ROLE_WEIGHTS['superadmin'];
            const isAdmin = myRoleWeight >= this.ROLE_WEIGHTS['admin'];
            
            // Находим ID системной команды ONE TEAM (Свободные агенты)
            const oneTeamObj = Object.values(this.teamsMap).find(t => t.name && t.name.toUpperCase().includes('ONE TEAM'));
            const oneTeamId = oneTeamObj ? oneTeamObj.id : null;

            // 🔥 Сценарий 1: Капитан ОТПУСКАЕТ своего гонщика (Твой старый функционал)
            const isReleasingCaptain = myRoleWeight >= this.ROLE_WEIGHTS['captain'] && this.currentRider.team_id === rider.team_id;
            
            // 🔥 Сценарий 2: Капитан ПРИНИМАЕТ заявку от свободного агента (из ONE TEAM)
            const isAcceptingCaptain = myRoleWeight >= this.ROLE_WEIGHTS['captain'] && this.currentRider.team_id === newTeamId && rider.team_id === oneTeamId;
            
            // 🔥 Сценарий 3: Свободный агент сам принимает приглашение (кнопка в его личке)
            const isSelfAcceptingInvite = this.currentRider.id === rider.id && rider.team_id === oneTeamId;
            
            if (!isSuper && !isAdmin && !isReleasingCaptain && !isAcceptingCaptain && !isSelfAcceptingInvite) {
                return alert("У вас нет прав на этот трансфер!\n\nОтпустить гонщика может только его текущий капитан. А принять без спроса можно только свободного агента из ONE TEAM.");
            }
            
            if (confirm(`Подтверждаете трансфер: ${rider.first_name} ${rider.last_name} ➔ ${this.teamsMap[newTeamId]?.name || 'новую команду'}?`)) {
                btn.innerText = "ОБРАБОТКА..."; 
                btn.style.pointerEvents = "none"; 
                btn.style.opacity = "0.7";
                
                try {
                    let updatePayload = { 
                        team_id: newTeamId,
                        transfer_request: "" // Очищаем поле запроса
                    };
                    
                    // Автоматически выдаем гоночный кластер (C) бывшим "просто велосипедистам" (O)
                    if (rider.base_cluster === 'O') {
                        updatePayload.base_cluster = 'C';
                    }

                    await pb.collection('riders').update(riderId, updatePayload, { requestKey: null });
                    
                    await this.updateOnlineStatus(); 
                    this.softRefreshMessages(); 
                    
                    btn.innerText = "✅ ОДОБРЕНО";
                    btn.style.background = "var(--success)";
                } catch (e) {
                    alert("Ошибка при сохранении трансфера в базе");
                    btn.innerText = "ОДОБРИТЬ ТРАНСФЕР"; 
                    btn.style.background = "var(--warning)";
                } finally {
                    btn.style.pointerEvents = "auto"; 
                    btn.style.opacity = "1";
                }
            }
        }
		
		createTeam() { this.teamManager.createTeam(); }
    assignCaptain() { this.teamManager.assignCaptain(); }
    deleteCurrentTeam() { this.teamManager.deleteTeam(); }
		
        async leaveCurrentChat() { 
            if (!this.activeChatId) return; 
            if (!confirm("Покинуть этот чат?")) return; 
            try { 
                const chat = this.chats.find(c => c.id === this.activeChatId); 
                const newParts = chat.participants.filter(id => id !== this.currentRider.id); 
                await pb.collection('chats').update(this.activeChatId, { participants: newParts }, { requestKey: null }); 
                this.activeChatId = null; 
                
                // Прячем всё лишнее
                document.getElementById('chatHeader').style.display = 'none'; 
                document.getElementById('inputWrapper').style.display = 'none'; 
                document.getElementById('pinnedMessageBar').style.display = 'none'; 
                
                // 🔥 ФИКС: Убираем шторку при выходе
                const curtain = document.getElementById('curtainContainer');
                if (curtain) { curtain.style.display = 'none'; curtain.innerHTML = ''; }
                
                // Обновляем список чатов слева (чтобы покинутый чат исчез)
                this.loadChats(); 
                
                // 🔥 УМНЫЙ РЕДИРЕКТ
                if (window.innerWidth > 768) {
                    // Если это ПК - красиво открываем Ленту новостей
                    if (typeof this.openNewsFeed === 'function') {
                        this.openNewsFeed();
                    } else {
                        document.getElementById('messagesContainer').innerHTML = `<div style="display:flex; height:100%; align-items:center; justify-content:center; color:var(--text-muted); font-family:'Unbounded';">ВЫБЕРИТЕ ЧАТ</div>`;
                    }
                } else {
                    // Если это мобилка - просто возвращаем в список чатов
                    document.getElementById('messagesContainer').innerHTML = ``;
                    this.closeChatMobile(); 
                }
                
            } catch(e) { alert("Ошибка выхода."); } 
        }
		
		// 🔥 ФУНКЦИЯ ЗАКРЕПЛЕНИЯ ЧАТОВ
        async togglePinChat(chatId, event) {
            if (event) event.stopPropagation(); // Чтобы клик не открывал сам чат
            if (!this.currentRider) return;

            // Достаем массив закрепов
            let pinned = this.currentRider.pinned_chats || [];
            if (typeof pinned === 'string') { try { pinned = JSON.parse(pinned); } catch(e) { pinned = []; } }
            if (!Array.isArray(pinned)) pinned = [];

            // Проверяем: открепить или закрепить?
            if (pinned.includes(chatId)) {
                pinned = pinned.filter(id => id !== chatId);
            } else {
                if (pinned.length >= 10) return alert("Можно закрепить максимум 10 чатов!");
                pinned.push(chatId);
            }

            // Оптимистично обновляем интерфейс (без ожидания ответа сервера для скорости)
            this.currentRider.pinned_chats = pinned;
            const searchInput = document.getElementById('chatSearch');
            this.renderChatList(searchInput ? searchInput.value : "");

            // Отправляем в базу
            try {
                await pb.collection('riders').update(this.currentRider.id, { pinned_chats: pinned }, { requestKey: null });
            } catch(e) {
                console.error("Ошибка закрепа:", e);
                alert("Ошибка синхронизации закрепа с сервером.");
            }
        }
		
		// 🔥 МАССОВОЕ УДАЛЕНИЕ: Включение/Выключение режима
        toggleSelectionMode() {
            this.isSelectionMode = !this.isSelectionMode;
            if (!this.selectedChats) this.selectedChats = new Set();
            this.selectedChats.clear(); // Очищаем выбор при входе/выходе
            const searchInput = document.getElementById('chatSearch');
            this.renderChatList(searchInput ? searchInput.value : "");
        }

        // 🔥 МАССОВОЕ УДАЛЕНИЕ: Выбор чата кликом
        toggleChatSelection(chatId) {
            if (!this.selectedChats) this.selectedChats = new Set();
            if (this.selectedChats.has(chatId)) {
                this.selectedChats.delete(chatId);
            } else {
                this.selectedChats.add(chatId);
            }
            // Перерисовываем список, чтобы показать галочку
            const searchInput = document.getElementById('chatSearch');
            this.renderChatList(searchInput ? searchInput.value : "");
        }

        // 🔥 МАССОВОЕ УДАЛЕНИЕ: Выполнение (Удаление или Выход)
        async executeBulkAction() {
            if (!this.selectedChats || this.selectedChats.size === 0) return;
            if (!confirm(`Удалить/покинуть выбранные чаты (${this.selectedChats.size} шт.)? Это действие нельзя отменить.`)) return;

            // Блокируем кнопку, показываем загрузку
            const btn = document.getElementById('bulkDeleteBtn');
            if (btn) { btn.innerText = 'УДАЛЕНИЕ...'; btn.disabled = true; btn.style.opacity = '0.5'; }

            const myRole = this.getUserMaxRole();
            const isSuper = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['superadmin'];
            const isAdmin = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['admin'];

            try {
                for (let chatId of this.selectedChats) {
                    const chat = this.chats.find(c => c.id === chatId);
                    if (!chat) continue;

                    let isMyP = false;
                    const chatP = chat.peloton_id ? (Array.isArray(chat.peloton_id) ? chat.peloton_id[0] : chat.peloton_id) : null;
                    if (this.pelotonsMap[chatP]?.admin_id === this.userIdMap[this.currentRider.email]) isMyP = true;

                    const isCaptain = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['captain'] && chat.type === 'team' && this.currentRider.team_id === chat.team_id;
                    const isCreator = (chat.type === 'private' || chat.type === 'gruppetto' || chat.type === 'radar') && (chat.captain === this.currentRider.id || (chat.participants && chat.participants[0] === this.currentRider.id));
                    
                    const canManageChat = isSuper || (isAdmin && isMyP) || isCaptain || isCreator;

                    // Умная логика: удаляем то, чем владеем, из остального просто выходим
                    if ((canManageChat && chat.type !== 'team_channel') || chat.type === 'direct') {
                        await pb.collection('chats').delete(chatId, { requestKey: null });
                    } else if (chat.participants) {
                        const newParts = chat.participants.filter(id => id !== this.currentRider.id);
                        await pb.collection('chats').update(chatId, { participants: newParts }, { requestKey: null });
                    }
                }
                
                // Если среди удаленных был открытый сейчас чат - очищаем правую панель
                if (this.selectedChats.has(this.activeChatId)) {
                    this.activeChatId = null;
                    document.getElementById('chatHeader').style.display = 'none';
                    document.getElementById('inputWrapper').style.display = 'none';
                    document.getElementById('pinnedMessageBar').style.display = 'none';
                    const curtain = document.getElementById('curtainContainer');
                    if (curtain) { curtain.style.display = 'none'; curtain.innerHTML = ''; }
                    
                    if (window.innerWidth > 768) {
                        document.getElementById('messagesContainer').innerHTML = `<div style="display:flex; height:100%; align-items:center; justify-content:center; color:var(--text-muted); font-family:'Unbounded';">ВЫБЕРИТЕ ЧАТ</div>`;
                    } else {
                        document.getElementById('messagesContainer').innerHTML = '';
                        this.closeChatMobile();
                    }
                }

                this.toggleSelectionMode(); // Выходим из режима выбора
                await this.loadChats(); // Обновляем список с сервера
                
            } catch(e) {
                console.error("Ошибка массового удаления", e);
                alert("Произошла ошибка при удалении чатов.");
                this.toggleSelectionMode();
                await this.loadChats();
            }
        }
		
        async deleteCurrentChat() { 
            if (!this.activeChatId) return; 
            if (!confirm("Удалить чат навсегда?")) return; 
            try { 
                const deletedChatId = this.activeChatId; // 🔥 Запомнили ID удаляемого чата
                
                await pb.collection('chats').delete(this.activeChatId, { requestKey: null }); 
                this.activeChatId = null; 
                
                // Прячем всё лишнее справа (Мгновенно)
                document.getElementById('chatHeader').style.display = 'none'; 
                document.getElementById('inputWrapper').style.display = 'none'; 
                document.getElementById('pinnedMessageBar').style.display = 'none'; 
                
                const curtain = document.getElementById('curtainContainer');
                if (curtain) { curtain.style.display = 'none'; curtain.innerHTML = ''; }
                
                // 🔥 ФИКС ЛАГА СЛЕВА: Мгновенно вырезаем чат из памяти и перерисовываем список
                this.chats = this.chats.filter(c => c.id !== deletedChatId);
                const searchInput = document.getElementById('chatSearch');
                this.renderChatList(searchInput ? searchInput.value : "");
                
                // 🔥 УМНЫЙ РЕДИРЕКТ
                if (window.innerWidth > 768) {
                    if (typeof this.openNewsFeed === 'function') {
                        this.openNewsFeed();
                    } else {
                        document.getElementById('messagesContainer').innerHTML = `<div style="display:flex; height:100%; align-items:center; justify-content:center; color:var(--text-muted); font-family:'Unbounded';">ВЫБЕРИТЕ ЧАТ</div>`;
                    }
                } else {
                    document.getElementById('messagesContainer').innerHTML = ``;
                    this.closeChatMobile(); 
                }
                
            } catch(e) { alert("Ошибка удаления."); } 
        }

        generateProfileHtml(rider, targetUserId, isModal = false) {
            const suffix = isModal ? 'modal' : 'tab'; 
            const tName = rider.expand?.team_id?.name || 'Без команды'; const catCode = rider.base_cluster || 'B'; 
            let roles = []; if (rider.email && rider.email.trim() !== '') { roles = this.usersMap[rider.email] || []; }
            const rStr = JSON.stringify(roles);
            
            // 🔥 СОБИРАЕМ ВСЕ КНОПКИ ДЕЙСТВИЙ В ОДИН БЛОК
            let actionButtons = '';
            
            // 1. Кнопка "Написать сообщение" (Только если это чужой профиль)
            if (rider.id !== this.currentRider?.id) {
                actionButtons += `<button onclick="window.app.closeProfileModal(); window.app.startDirectChat('${rider.id}')" style="width:100%; background:var(--primary); color:#000; border:none; padding:12px; border-radius:8px; font-family:'Unbounded'; font-size:11px; font-weight:800; cursor:pointer; transition:0.2s; box-shadow: 0 4px 15px rgba(255,193,7,0.3);">💬 НАПИСАТЬ СООБЩЕНИЕ</button>`;
            }

            // 2. Кнопка "Запросить трансфер" (Только для Капитанов при просмотре чужого гонщика)
            const myRoleWeight = Math.max(...(this.usersMap[this.currentRider?.email] || []).map(r => this.ROLE_WEIGHTS[r] || 20), 20);
            if (myRoleWeight >= this.ROLE_WEIGHTS['captain'] && this.currentRider?.team_id && this.currentRider?.team_id !== rider.team_id && rider.id !== this.currentRider?.id) {
                actionButtons += `<button onclick="window.app.initiateTransfer('${rider.id}', '${rider.team_id || ''}')" style="width:100%; background:rgba(255, 193, 7, 0.1); border: 1px dashed var(--warning); color:var(--warning); padding:10px; border-radius:8px; font-family:'Unbounded'; font-size:11px; font-weight:800; cursor:pointer; transition:0.2s;">🔄 ЗАПРОСИТЬ ТРАНСФЕР</button>`;
            }

            // 3. Кнопка "Поделиться" (Доступна всегда)
            actionButtons += `<button onclick="window.app.copyUserLink('${rider.id}')" style="width:100%; background:var(--bg-surface-hover); border: 1px solid var(--border); color:var(--text-main); padding:10px; border-radius:8px; font-family:'Unbounded'; font-size:11px; font-weight:800; cursor:pointer; transition:0.2s;">🔗 ПОДЕЛИТЬСЯ ПРОФИЛЕМ</button>`;

            let html = `
                <div class="dash-license-card" style="margin-bottom: 15px;">
                    <div class="dash-rider-info"><div class="dash-rider-name">${rider.first_name} ${rider.last_name}</div><div class="dash-rider-meta"><span class="dash-team-badge">${this.getTeamLinkHtml(rider.team_id, tName, 'currentColor')}</span><span>Г.Р.: ${rider.yob}</span><span>ПОЛ: ${(rider.gender||'M').toUpperCase()}</span>${this.getRoleBadge(rider.id)}</div></div>
                    <div class="dash-cluster"><div class="dash-cluster-label">КЛАСТЕР / ЛИГА</div><div class="dash-cluster-letter">${catCode}</div></div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                    ${actionButtons}
                </div>
                <div class="dash-stats-grid" id="profileStatsGrid-${rider.id}-${suffix}">
                    <div class="dash-stat-card"><div class="dash-stat-lbl">РЕЙТИНГ (ОЧКИ)</div><div class="dash-stat-val" style="color: var(--primary);"><span class="spinner" style="width:20px; height:20px; border-width:2px; display:inline-block;"></span></div></div>
                    <div class="dash-stat-card"><div class="dash-stat-lbl">ЗАВЕРШЕНО ГОНОК</div><div class="dash-stat-val">-</div></div>
                    <div class="dash-stat-card"><div class="dash-stat-lbl">НАКАТ В ГОНКАХ</div><div class="dash-stat-val">- <span style="font-size:14px; color:var(--text-muted);">км</span></div></div>
                    <div class="dash-stat-card"><div class="dash-stat-lbl">РЕКОРД СКОРОСТИ</div><div class="dash-stat-val">- <span style="font-size:14px; color:var(--text-muted);">км/ч</span></div></div>
                </div>
                <div><h3 class="dash-section-title"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> ДИНАМИКА РЕЙТИНГА</h3><div class="dash-chart-container"><canvas id="chart-${rider.id}-${suffix}"></canvas></div></div>
            `;
            if (rStr.includes('admin') && targetUserId) html += `<div id="orgLog-${rider.id}-${suffix}"></div>`;
            if (rStr.includes('judge') && targetUserId) html += `<div id="judgeLog-${rider.id}-${suffix}"></div>`;
            if (rStr.includes('captain') && rider.team_id) html += `<div id="capLog-${rider.id}-${suffix}"></div>`;
            html += `<div><h3 class="dash-section-title" style="margin-top:20px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg> ИСТОРИЯ РЕЗУЛЬТАТОВ</h3><div id="raceHistory-${rider.id}-${suffix}"></div></div>`;
            return html;
        }

        async fillProfileData(rider, targetUserId, isModal = false) {
            const suffix = isModal ? 'modal' : 'tab';
            try {
                const rosters = await pb.collection('race_rosters').getFullList({ filter: `rider_id="${rider.id}"`, expand: 'race_id', requestKey: null });
                let history = []; let totalDist = 0; let maxSpeed = 0;
                rosters.sort((a, b) => new Date(b.expand?.race_id?.date) - new Date(a.expand?.race_id?.date));
                rosters.forEach(r => { const race = r.expand?.race_id; if (!race) return; if (r.status === 'finished' || r.status === 'dnf') { history.push(r); if (r.status === 'finished') { totalDist += (race.distance || 0); if (r.speed && r.speed > maxSpeed) maxSpeed = r.speed; } } });
                
                document.getElementById(`profileStatsGrid-${rider.id}-${suffix}`).innerHTML = `<div class="dash-stat-card"><div class="dash-stat-lbl">РЕЙТИНГ (ОЧКИ)</div><div class="dash-stat-val" style="color: var(--primary);">${rider.rating || 0}</div></div><div class="dash-stat-card"><div class="dash-stat-lbl">ЗАВЕРШЕНО ГОНОК</div><div class="dash-stat-val">${history.filter(h => h.status==='finished').length}</div></div><div class="dash-stat-card"><div class="dash-stat-lbl">НАКАТ В ГОНКАХ</div><div class="dash-stat-val">${totalDist} <span style="font-size:14px; color:var(--text-muted);">км</span></div></div><div class="dash-stat-card"><div class="dash-stat-lbl">РЕКОРД СКОРОСТИ</div><div class="dash-stat-val">${maxSpeed > 0 ? maxSpeed.toFixed(2) : '-'} <span style="font-size:14px; color:var(--text-muted);">км/ч</span></div></div>`;

                if (history.length > 0) {
                    let hHtml = `<div class="dash-table-wrapper"><table class="dash-table"><thead><tr><th>Дата</th><th>Гонка</th><th>Время</th><th>Скорость</th><th>Очки</th><th>Статус</th></tr></thead><tbody>`;
                    history.forEach(h => { const rd = new Date(h.expand.race_id.date).toLocaleDateString('ru-RU', {day:'numeric', month:'short'}); const rn = h.expand.race_id.name; const ts = h.status === 'dnf' ? '-' : window.app.formatMs(h.time_ms); const ss = h.status === 'dnf' ? '-' : (h.speed ? h.speed.toFixed(2) : '-'); const pt = h.earned_points || 0; const statBadge = h.status === 'finished' ? `<span class="dash-status" style="background:rgba(0,230,118,0.1); color:var(--success); border:1px solid rgba(0,230,118,0.2);">ФИНИШ</span>` : `<span class="dash-status" style="background:rgba(255,51,102,0.1); color:var(--danger); border:1px solid rgba(255,51,102,0.2);">DNF</span>`; hHtml += `<tr><td style="color:var(--text-muted); font-size:11px;">${rd}</td><td><b>${rn}</b></td><td style="font-family:'Roboto Mono'; font-weight:bold;">${ts}</td><td style="font-family:'Roboto Mono';">${ss}</td><td><b style="color:var(--primary); font-family:'Roboto Mono';">+${pt}</b></td><td>${statBadge}</td></tr>`; });
                    hHtml += `</tbody></table></div>`; document.getElementById(`raceHistory-${rider.id}-${suffix}`).innerHTML = hHtml;
                    let cHist = [...history].reverse(); let lbls = ['Старт']; let pts = [0]; let sum = 0; cHist.forEach(h => { if(h.status === 'finished') { sum += (h.earned_points||0); lbls.push(new Date(h.expand.race_id.date).toLocaleDateString('ru-RU',{day:'numeric',month:'2-digit'})); pts.push(sum); } });
                    
                    const ctx = document.getElementById(`chart-${rider.id}-${suffix}`).getContext('2d'); 
                    if(isModal && this.modalChartInstance) this.modalChartInstance.destroy(); if(!isModal && this.profileChartInstance) this.profileChartInstance.destroy(); Chart.defaults.font.family = "'Manrope', sans-serif"; Chart.defaults.color = "#8a8d9b"; const current = document.documentElement.getAttribute('data-theme'); let gridColor = current === 'dark' ? '#2a2c38' : (current === 'yellow' ? '#FFCA28' : '#e2e8f0'); let newChart = new Chart(ctx, { type: 'line', data: { labels: lbls, datasets: [{ label: 'Рейтинг', data: pts, borderColor: '#FFC107', backgroundColor: 'rgba(255, 193, 7, 0.1)', fill: true, tension: 0.3, borderWidth: 3, pointBackgroundColor: '#FFC107', pointBorderColor: '#000', pointRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { border: { dash: [4, 4] }, grid: { color: gridColor }, beginAtZero: true }, x: { grid: { display: false } } } } });
                    if(isModal) this.modalChartInstance = newChart; else this.profileChartInstance = newChart;
                } else { document.getElementById(`chart-${rider.id}-${suffix}`).parentElement.innerHTML = '<div class="empty-state" style="padding:20px;text-align:center;color:var(--text-muted);">График появится после первой гонки</div>'; document.getElementById(`raceHistory-${rider.id}-${suffix}`).innerHTML = '<div class="empty-state" style="padding:20px;text-align:center;color:var(--text-muted);">Нет завершенных гонок</div>'; }
                
                let roles = [];
                if (rider.email && rider.email.trim() !== '') { roles = this.usersMap[rider.email] || []; }
                const rStr = JSON.stringify(roles);
                
                if (rStr.includes('admin') && targetUserId) {
                    const orgRaces = await pb.collection('races').getFullList({ filter: `creator_id="${targetUserId}"`, sort: '-date', requestKey: null });
                    if (orgRaces.length > 0) {
                        let orgHtml = `<div class="role-block"><div class="role-block-title" style="color:var(--warning);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> ЖУРНАЛ ОРГАНИЗАТОРА ИВЕНТОВ</div><div style="margin-bottom:15px;"><span style="color:var(--text-muted); font-size:12px;">Организовано гонок: <b style="color:var(--text-main);">${orgRaces.length}</b></span></div><div class="dash-table-wrapper"><table class="dash-table"><thead><tr><th>Дата</th><th>Название ивента</th><th>Уровень</th></tr></thead><tbody>`;
                        orgRaces.forEach(r => { const rd = new Date(r.date).toLocaleDateString('ru-RU', {day:'numeric', month:'short', year:'numeric'}); orgHtml += `<tr><td style="color:var(--text-muted); font-size:11px;">${rd}</td><td><b>${r.name}</b></td><td style="text-transform:uppercase; font-size:10px; color:var(--warning);">${r.level}</td></tr>`; });
                        orgHtml += `</tbody></table></div></div>`; document.getElementById(`orgLog-${rider.id}-${suffix}`).innerHTML = orgHtml;
                    }
                }
                if (rStr.includes('judge') && targetUserId) {
                    const judgeRaces = await pb.collection('races').getFullList({ filter: `judge_id~"${targetUserId}"`, sort: '-date', requestKey: null });
                    if (judgeRaces.length > 0) {
                        let jHtml = `<div class="role-block"><div class="role-block-title" style="color:#a855f7;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> ЖУРНАЛ СУДЕЙСТВА</div><div style="margin-bottom:15px;"><span style="color:var(--text-muted); font-size:12px;">Отработал главным судьей на гонках: <b style="color:var(--text-main);">${judgeRaces.length}</b></span></div><div class="dash-table-wrapper"><table class="dash-table"><thead><tr><th>Дата</th><th>Название гонки</th></tr></thead><tbody>`;
                        judgeRaces.forEach(r => { const rd = new Date(r.date).toLocaleDateString('ru-RU', {day:'numeric', month:'short', year:'numeric'}); jHtml += `<tr><td style="color:var(--text-muted); font-size:11px;">${rd}</td><td><b>${r.name}</b></td></tr>`; });
                        jHtml += `</tbody></table></div></div>`; document.getElementById(`judgeLog-${rider.id}-${suffix}`).innerHTML = jHtml;
                    }
                }
                if (rStr.includes('captain') && rider.team_id) {
                    const teamMembers = Object.values(this.ridersMap).filter(r => r.team_id === rider.team_id);
                    const totalTeamRating = teamMembers.reduce((sum, r) => sum + (r.rating || 0), 0);
                    teamMembers.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                    const top3Html = teamMembers.slice(0, 3).map((m, i) => `<div style="font-size:12px; color:var(--text-main); margin-top:4px;">${i+1}. ${m.first_name} ${m.last_name} <b style="color:var(--primary); margin-left:5px;">${m.rating||0} pts</b></div>`).join('');
                    
                    let cHtml = `<div class="role-block"><div class="role-block-title" style="color:var(--info);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l9 4.9V12c0 5.5-3.6 10.7-9 12-5.4-1.3-9-6.5-9-12V6.9L12 2z"></path></svg> СВОДКА КОМАНДЫ</div><div style="display:flex; gap:30px; flex-wrap:wrap;"><div><div style="font-size:10px; color:var(--text-muted); font-family:'Unbounded';">СОСТАВ</div><div style="font-size:18px; font-weight:bold; color:var(--text-main);">${teamMembers.length} чел.</div></div><div><div style="font-size:10px; color:var(--text-muted); font-family:'Unbounded';">СУММАРНЫЙ РЕЙТИНГ</div><div style="font-size:18px; font-weight:bold; color:var(--primary);">${totalTeamRating} pts</div></div><div style="flex:1; min-width:200px;"><div style="font-size:10px; color:var(--text-muted); font-family:'Unbounded'; margin-bottom:5px;">ТОП СОСТАВА</div>${top3Html}</div></div></div>`;
                    document.getElementById(`capLog-${rider.id}-${suffix}`).innerHTML = cHtml;
                }
            } catch(e) {}
        }

        async renderProfileTab(targetRiderId) { try { const content = document.getElementById('profileTabContent'); const rider = this.ridersMap[targetRiderId]; if (!rider) { content.innerHTML = `<div style="text-align:center; padding: 50px; color:var(--danger); font-family:'Unbounded';">ДАННЫЕ ПРОФИЛЯ НЕ ЗАГРУЖЕНЫ</div>`; return; } content.innerHTML = this.generateProfileHtml(rider, this.userIdMap[rider.email], false); this.fillProfileData(rider, this.userIdMap[rider.email], false); } catch(e) { console.error(e); } }
        async openProfile(targetRiderId, event) { if (event) event.stopPropagation(); const partModal = document.getElementById('participantsModal'); if (partModal) partModal.style.display = 'none'; const modal = document.getElementById('profileModal'); const content = document.getElementById('profileModalContent'); modal.style.display = 'flex'; const rider = this.ridersMap[targetRiderId]; if (!rider) { content.innerHTML = `<div style="text-align:center; padding: 50px; color:var(--danger); font-family:'Unbounded';">ОШИБКА ЗАГРУЗКИ ПРОФИЛЯ</div>`; return; } content.innerHTML = this.generateProfileHtml(rider, this.userIdMap[rider.email], true); this.fillProfileData(rider, this.userIdMap[rider.email], true); }
        closeProfileModal() { document.getElementById('profileModal').style.display = 'none'; if (this.modalChartInstance) { this.modalChartInstance.destroy(); this.modalChartInstance = null; } }
async syncRaceButtonsState() {
            if (!this.currentRider) return;
            const regBtns = document.querySelectorAll('[class*="sync-btn-"]');
            if (regBtns.length === 0) return;

            const raceIds = new Set();
            regBtns.forEach(btn => {
                const match = btn.className.match(/sync-btn-([a-zA-Z0-9_]+)/);
                if (match) raceIds.add(match[1]);
            });

            if (raceIds.size === 0) return;

            // 🔥 1. ЖЕСТКИЙ СБРОС (Желтая кнопка + ЧЕРНЫЙ текст)
            regBtns.forEach(b => {
                let wave = b.getAttribute('data-wave');
                b.innerHTML = wave ? `⚡️ ЗАЯВИТЬСЯ В ЗАЕЗД: ${wave.toUpperCase()}` : `⚡️ ЗАЯВИТЬСЯ НА ГОНКУ`;
                
                // Используем important, чтобы перебить любой CSS сайта
                b.style.setProperty('background', 'var(--primary)', 'important');
                b.style.setProperty('color', '#000000', 'important'); 
                
                b.style.border = 'none';
                b.style.pointerEvents = 'auto';
                b.style.display = 'block'; 
            });

            const filters = Array.from(raceIds).map(id => `race_id="${id}"`).join(' || ');
            
            try {
                // Идем в базу за свежими данными
                const myRegs = await pb.collection('race_rosters').getFullList({
                    filter: `rider_id="${this.currentRider.id}" && (${filters}) && status="registered"`,
                    fields: 'race_id,final_cluster',
                    requestKey: null,
                    fetchOptions: { cache: 'no-store' }
                });

                // 🔥 2. КРАСИМ В ЗЕЛЕНЫЙ (Полупрозрачный фон + ЗЕЛЕНЫЙ текст)
                myRegs.forEach(reg => {
                    const btnsToUpdate = document.querySelectorAll(`.sync-btn-${reg.race_id}`);
                    btnsToUpdate.forEach(b => {
                        let btnWave = b.getAttribute('data-wave');
                        
                        if (btnWave) {
                            if (reg.final_cluster === btnWave) {
                                b.innerHTML = `✅ ЗАЯВЛЕН: ${btnWave.toUpperCase()}`;
                                b.style.setProperty('background', 'rgba(0, 230, 118, 0.1)', 'important');
                                b.style.setProperty('color', 'var(--success)', 'important');
                                b.style.border = '1px dashed var(--success)';
                                b.style.pointerEvents = 'auto'; // 🔥 ТЕПЕРЬ КНОПКА КЛИКАБЕЛЬНАЯ
                                b.style.display = 'block';
                            } else {
                                b.style.display = 'none';
                            }
                        } else {
                            b.innerHTML = '✅ ВЫ УЖЕ ЗАЯВЛЕНЫ';
                            b.style.setProperty('background', 'rgba(0, 230, 118, 0.1)', 'important');
                            b.style.setProperty('color', 'var(--success)', 'important');
                            b.style.border = '1px dashed var(--success)';
                            b.style.pointerEvents = 'auto'; // 🔥 ТЕПЕРЬ КНОПКА КЛИКАБЕЛЬНАЯ
                        }
                    });
                });
            } catch (e) {
                console.error("Ошибка синхронизации кнопок:", e);
            }
        }
        async registerForRace(raceId, btn, event, wave = null) {
            event.stopPropagation(); if (!this.currentRider) return;
            
            if (this.currentRider.email && this.currentRider.email.startsWith('guest_')) {
                alert('Регистрация на гонку доступна только авторизованным спортсменам. Пожалуйста, войдите в свой аккаунт Сотка.');
                return;
            }
            const allBtns = document.querySelectorAll(`.sync-btn-${raceId}`); 
            allBtns.forEach(b => { b.innerText = '⌛ ОБРАБОТКА...'; b.style.opacity = '0.7'; b.style.pointerEvents = 'none'; });
            
            try {
                const race = await pb.collection('races').getOne(raceId, { requestKey: null }); 
                if (race.status !== 'Registration') { 
                    allBtns.forEach(b => { b.innerHTML = '⛔ РЕГИСТРАЦИЯ ЗАКРЫТА'; b.style.background = 'var(--danger-light)'; b.style.color = 'var(--danger)'; b.style.border = '1px solid var(--danger)'; }); 
                    return; 
                }
                
                if (race.level === 'peloton' && this.currentRider.base_cluster === 'O') {
                    alert("❌ Официальные гонки доступны только для спортсменов со статусом «Гонщик».\n\nПросто велосипедисты не могут участвовать в официальных стартах пелотона.");
                    await this.syncRaceButtonsState();
                    return;
                }

                // Запрашиваем всех зарегистрированных
                const existing = await pb.collection('race_rosters').getFullList({ filter: `race_id="${raceId}"`, requestKey: null }); 
                
                // 🔥 УМНАЯ ОТМЕНА ЗАЯВКИ: Ищем, зарегистрирован ли уже ЭТОТ спортсмен
                const myRegistration = existing.find(e => e.rider_id === this.currentRider.id);

                if (myRegistration) {
                    // Если заявка найдена, спрашиваем подтверждение
                    if (confirm("Вы уже заявлены на эту гонку. Хотите отозвать свою заявку?")) {
                        await pb.collection('race_rosters').delete(myRegistration.id, { requestKey: null });
                        // Уведомлять алертом не будем, кнопка сама красиво сменит цвет обратно на желтый
                    }
                    // Обязательно восстанавливаем кнопки в актуальное состояние (если отменил или отказался отменять)
                    await this.syncRaceButtonsState();
                    return; // Прерываем функцию, дальше регистрировать не нужно
                }
                
                // --- Дальше идет стандартная логика регистрации, если заявки не было ---
                
                const activeChat = this.chats.find(c => c.id === this.activeChatId);
                let gruppettoId = null;
                let ridersToRegister = [this.currentRider.id];

                if (activeChat && activeChat.type === 'gruppetto') {
                    let allowed = race.allowed_types || [];
                    if (!allowed.includes('gruppetto') && race.level === 'peloton') {
                        alert("❌ В этой гонке могут участвовать только официальные команды. Заявка для Группетто закрыта организатором.");
                        await this.syncRaceButtonsState();
                        return;
                    }

                    gruppettoId = activeChat.id;
                    if (activeChat.captain === this.currentRider.id) {
                        if (confirm(`Вы капитан. Заявить всё группетто "${activeChat.name}" на эту гонку?`)) {
                            ridersToRegister = activeChat.participants || [this.currentRider.id];
                        }
                    }
                }

                let registeredCount = 0;
                for (let rId of ridersToRegister) {
                    if (!existing.find(e => e.rider_id === rId)) {
                        let payload = { race_id: raceId, rider_id: rId, status: 'registered' };
                        if (gruppettoId) payload.gruppetto_id = gruppettoId;
                        
                        // Сохраняем волну
                        if (wave) payload.final_cluster = wave;

                        await pb.collection('race_rosters').create(payload, { requestKey: null });
                        registeredCount++;
                    }
                }

                if (ridersToRegister.length > 1) {
                    allBtns.forEach(b => { b.innerHTML = `✅ ЗАЯВЛЕНО: ${registeredCount} ЧЕЛ.`; b.style.background = 'var(--success)'; b.style.color = '#000'; });
                } else {
                    // Вызываем синхронизацию для одиночной регистрации
                    await this.syncRaceButtonsState();
                }
            } catch(e) { 
                alert("Ошибка связи с базой."); 
                await this.syncRaceButtonsState(); 
            }
        }

clusterValue(c) { if (c==='A+') return 6; if (c==='A') return 5; if (c==='B') return 4; if (c==='C') return 3; if (c==='D') return 2; if (c==='E') return 1; return 0; }
formatMs(ms) { if (!ms) return '-'; let d = new Date(Date.UTC(0,0,0,0,0,0,ms)); let h = d.getUTCHours(); let m = d.getUTCMinutes().toString().padStart(2,'0'); let s = d.getUTCSeconds().toString().padStart(2,'0'); let mi = Math.floor(d.getUTCMilliseconds() / 10).toString().padStart(2,'0'); if (h > 0) return `${h}:${m}:${s}.${mi}`; return `${m}:${s}.${mi}`; }
// 🔥 ВОЗВРАЩАЕМ СИСТЕМУ УВЕДОМЛЕНИЙ И ЗВУКОВ
    playIncomingSound() {
        if (this.audioCtx && this.sonarBuffer) {
            try {
                if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
                const source = this.audioCtx.createBufferSource();
                source.buffer = this.sonarBuffer;
                source.connect(this.audioCtx.destination);
                source.start(0);
            } catch(e) { console.error('Ошибка звука', e); }
        }
    }

    initNotifications() {
        if (!document.getElementById('toast-container')) { 
            const tc = document.createElement('div'); 
            tc.id = 'toast-container'; 
            tc.style.cssText = 'position:fixed; top:20px; right:20px; z-index:999999; display:flex; flex-direction:column; gap:10px; pointer-events:none;'; 
            document.body.appendChild(tc); 
        }
        
        const unlockAudioAndPush = async () => { 
            if (Notification.permission === 'default') Notification.requestPermission(); 
            try {
                if (!this.audioCtx) {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    this.audioCtx = new AudioContext();
                }
                if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();
                
                const oscillator = this.audioCtx.createOscillator();
                const gainNode = this.audioCtx.createGain();
                gainNode.gain.value = 0;
                oscillator.connect(gainNode);
                gainNode.connect(this.audioCtx.destination);
                oscillator.start(0);
                oscillator.stop(this.audioCtx.currentTime + 0.01);

                if (!this.sonarBuffer) {
                    const response = await fetch('https://db.sotka.one/api/files/79d0fa2vqtvp2n2/fs779p300dnxfic/freesound_community_sonar_ping_95840_gpzxcUTpxW.mp3?v=2');
                    const arrayBuffer = await response.arrayBuffer();
                    this.sonarBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
                }
            } catch(e) { console.error("Ошибка звука:", e); }
            document.body.removeEventListener('click', unlockAudioAndPush); 
            document.body.removeEventListener('touchstart', unlockAudioAndPush); 
        };
        document.body.addEventListener('click', unlockAudioAndPush); 
        document.body.addEventListener('touchstart', unlockAudioAndPush); 
    }

    async triggerNotification(msg, chatId) {
        const actualSenderId = Array.isArray(msg.sender_id) ? msg.sender_id[0] : msg.sender_id;
        if (actualSenderId === this.currentRider?.id) return;
        
        const notifKey = 'vilka_notif_' + msg.id;
        if (localStorage.getItem(notifKey)) return; 
        localStorage.setItem(notifKey, '1');
        setTimeout(() => localStorage.removeItem(notifKey), 5000);

        const targetChat = this.chats.find(c => c.id === chatId);
        if (!targetChat) return;

        try {
            let senderName = "Кто-то";
            const sender = this.ridersMap[actualSenderId];
            if (sender) senderName = sender.email === 'bot@sotka.one' ? "🤖 VILKA MOTO" : `${sender.first_name} ${sender.last_name}`; 
            
            const chatName = this.getChatName(targetChat);
            const textPreview = msg.text ? (msg.text.length > 40 ? msg.text.substring(0, 40) + '...' : msg.text) : '📎 Вложение';

            this.playIncomingSound();

            const tc = document.getElementById('toast-container');
            if (tc) {
                const toast = document.createElement('div');
                toast.style.cssText = 'background:var(--bg-surface); border:1px solid var(--border); border-left:4px solid var(--primary); padding:15px; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.5); color:var(--text-main); font-family:"Inter"; max-width:300px; pointer-events:auto; cursor:pointer; transform:translateX(120%); transition:transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);';
                toast.innerHTML = `<div style="font-size:10px; color:var(--text-muted); margin-bottom:4px; font-family:'Unbounded';">${chatName}</div><div style="font-size:13px; font-weight:bold; margin-bottom:2px;">${senderName}</div><div style="font-size:12px; color:var(--text-muted);">${textPreview}</div>`;
                toast.onclick = () => { 
                    window.app.switchTab('chats'); 
                    window.app.openChat(chatId); 
                    toast.style.transform = 'translateX(120%)'; 
                    setTimeout(() => toast.remove(), 300); 
                };
                tc.appendChild(toast); 
                setTimeout(() => toast.style.transform = 'translateX(0)', 10);
                setTimeout(() => { toast.style.transform = 'translateX(120%)'; setTimeout(() => toast.remove(), 300); }, 5000);
            }

            if (document.hidden && Notification.permission === "granted") {
                new Notification(chatName, { body: `${senderName}: ${textPreview}`, icon: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png', silent: true });
            }
        } catch(e) { console.error('Ошибка уведомления', e); }
    }

    // ==========================================
        // 🔥 УМНЫЙ ДРОПДАУН ВЫБОРА ПЕЛОТОНА
        // ==========================================

        initPelotonDropdown() {
            // 1. Динамически добавляем стили, адаптивные под светлую/темную тему Вилки
            if (!document.getElementById('peloton-dropdown-styles')) {
                const style = document.createElement('style');
                style.id = 'peloton-dropdown-styles';
                style.innerHTML = `
                    .peloton-dropdown-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 999; display: none; }
                    .peloton-dropdown-menu { position: absolute; width: 260px; background: var(--bg-surface); border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); border: 1px solid var(--border); z-index: 1000; display: none; flex-direction: column; overflow: hidden; font-family: 'Manrope', sans-serif; }
                    .peloton-dropdown-search { padding: 12px; border-bottom: 1px solid var(--border); }
                    .peloton-dropdown-search input { width: 100%; background: var(--bg-body); border: 1px solid var(--border); color: var(--text-main); padding: 10px 12px; border-radius: 8px; font-family: inherit; font-size: 13px; box-sizing: border-box; outline: none; transition: 0.2s; }
                    .peloton-dropdown-search input:focus { border-color: var(--primary); }
                    .peloton-dropdown-list { max-height: 300px; overflow-y: auto; padding: 8px 0; }
                    .peloton-dropdown-item { padding: 10px 16px; color: var(--text-main); font-size: 13px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 10px; font-weight: 500; }
                    .peloton-dropdown-item:hover { background: var(--bg-body); color: var(--text-main); }
                    .peloton-dropdown-item.active { color: var(--primary); background: rgba(255, 204, 0, 0.1); }
                    .peloton-dropdown-item .p-avatar { width: 24px; height: 24px; border-radius: 50%; background: var(--primary); color: #000; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; font-family: 'Unbounded'; flex-shrink: 0; }
                    /* Скроллбар для списка */
                    .peloton-dropdown-list::-webkit-scrollbar { width: 4px; }
                    .peloton-dropdown-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
                `;
                document.head.appendChild(style);
            }

            // 2. Создаем прозрачную подложку
            this.pOverlay = document.createElement('div');
            this.pOverlay.className = 'peloton-dropdown-overlay';
            this.pOverlay.onclick = () => this.closePelotonDropdown();

            // 3. Создаем само меню
            this.pMenu = document.createElement('div');
            this.pMenu.className = 'peloton-dropdown-menu';
            this.pMenu.innerHTML = `
                <div class="peloton-dropdown-search">
                    <input type="text" id="peloton-dropdown-input" placeholder="Найти пелотон..." oninput="window.app.renderPelotonDropdownList(this.value)">
                </div>
                <div class="peloton-dropdown-list" id="peloton-dropdown-list"></div>
            `;

            document.body.appendChild(this.pOverlay);
            document.body.appendChild(this.pMenu);
        }

        openPelotonDropdown(event) {
            if (!this.pMenu) this.initPelotonDropdown();

            // Вычисляем позицию кнопки, чтобы открыть меню ровно под ней
            const btnRect = event.currentTarget.getBoundingClientRect();
            this.pMenu.style.top = `${btnRect.bottom + 8}px`;
            
            // Если экран мобильный, центрируем или растягиваем, иначе крепим к левому краю кнопки
            if (window.innerWidth < 768) {
                this.pMenu.style.left = '50%';
                this.pMenu.style.transform = 'translateX(-50%)';
                this.pMenu.style.width = '90%';
            } else {
                this.pMenu.style.left = `${btnRect.left}px`;
                this.pMenu.style.transform = 'none';
                this.pMenu.style.width = '260px';
            }
            
            this.pOverlay.style.display = 'block';
            this.pMenu.style.display = 'flex';
            
            // Очищаем поиск и рендерим список
            document.getElementById('peloton-dropdown-input').value = '';
            this.renderPelotonDropdownList('');
            
            // Ставим фокус в строку поиска с небольшой задержкой (для мобилок)
            setTimeout(() => document.getElementById('peloton-dropdown-input').focus(), 100);
        }

        closePelotonDropdown() {
            if (this.pOverlay) {
                this.pOverlay.style.display = 'none';
                this.pMenu.style.display = 'none';
            }
        }

        renderPelotonDropdownList(query = '') {
            const listEl = document.getElementById('peloton-dropdown-list');
            if (!listEl) return;
            listEl.innerHTML = '';
            
            const q = query.toLowerCase().trim();
            
            // 1. Кнопка "ВСЕ (ГЛОБАЛЬНО)" - передаем 'all' вместо null!
            if ("все глобально".includes(q) || q === '') {
                 // Проверяем активность с учетом 'all'
                 const isActive = (!this.currentPelotonId || this.currentPelotonId === 'all') ? 'active' : '';
                 listEl.innerHTML += `
                    <div class="peloton-dropdown-item ${isActive}" onclick="window.app.selectPelotonFromDropdown('all')">
                        <div class="p-avatar" style="background: #3b82f6; color: #fff;">🌐</div>
                        ВСЕ (ГЛОБАЛЬНО)
                    </div>`;
            }

            // 2. Перебираем все пелотоны
            if (this.pelotonsMap) {
                let entries = [];
                if (typeof this.pelotonsMap.entries === 'function') {
                    entries = Array.from(this.pelotonsMap.entries());
                } else if (typeof this.pelotonsMap === 'object' && this.pelotonsMap !== null) {
                    entries = Object.entries(this.pelotonsMap);
                }
                
                for (let [id, p] of entries) {
                    if (p && p.name && p.name.toLowerCase().includes(q)) {
                        const isActive = (this.currentPelotonId === id) ? 'active' : '';
                        const firstLetter = p.name.charAt(0).toUpperCase();
                        listEl.innerHTML += `
                            <div class="peloton-dropdown-item ${isActive}" onclick="window.app.selectPelotonFromDropdown('${id}')">
                                <div class="p-avatar">${firstLetter}</div>
                                ${this.escapeHTML(p.name)}
                            </div>`;
                    }
                }
            }
        }

selectPelotonFromDropdown(pelotonId) {
            this.closePelotonDropdown();
            
            // Вызываем базовую логику приложения
            this.setPeloton(pelotonId); 
            
            // ПРИНУДИТЕЛЬНО обновляем текст в шапке
            const labelEl = document.getElementById('currentPelotonLabel');
            if (labelEl) {
                let pName = "ВСЕ (ГЛОБАЛЬНО)";
                
                // Если выбрали конкретный клуб (не 'all' и не null) - достаем его имя
                if (pelotonId && pelotonId !== 'all' && this.pelotonsMap) {
                    if (typeof this.pelotonsMap.get === 'function' && this.pelotonsMap.get(pelotonId)) {
                        pName = this.pelotonsMap.get(pelotonId).name;
                    } else if (this.pelotonsMap[pelotonId]) {
                        pName = this.pelotonsMap[pelotonId].name;
                    }
                }
                
                // Вставляем новое имя капсом и возвращаем стрелочку
                labelEl.innerHTML = `${pName.toUpperCase()} <span style="font-size: 8px;">▼</span>`;
            }
        }
		}


    class SotkaAuthManager {
        constructor() {
            this.email = null;
            this.foundRider = null;
            this.selectedRole = null; // 'racer' или 'cyclist'
        }

        capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(); }

        switchStep(stepId) {
            document.querySelectorAll('.sa-step').forEach(el => el.classList.remove('active'));
            document.getElementById(stepId).classList.add('active');
        }

        async loadTeamsToSelect() {
            try {
                // 1. Пытаемся понять, из какого пелотона пришел гонщик по URL ?chat=...
                const urlParams = new URLSearchParams(window.location.search);
                const chatId = urlParams.get('chat');
                const joinTeamId = urlParams.get('join_team');
                
                let targetPelotonId = null;

                if (chatId && chatId !== 'newsfeed') {
                    try {
                        const chatObj = await pb.collection('chats').getOne(chatId, { requestKey: null });
                        if (chatObj && chatObj.peloton_id) {
                            targetPelotonId = Array.isArray(chatObj.peloton_id) ? chatObj.peloton_id[0] : chatObj.peloton_id;
                        }
                    } catch(e) { console.warn("Не удалось прочитать чат из URL для умной формы"); }
                }

                // 2. Грузим все команды и все пелотоны
                const teams = await pb.collection('teams').getFullList({ sort: 'name', requestKey: null });
                const pelotons = await pb.collection('pelotons').getFullList({ requestKey: null });
                
                // Ищем системную команду ONE TEAM
                const oneTeam = teams.find(t => t.name.toUpperCase().includes('ONE TEAM'));
                const selectEl = document.getElementById('sa-create-team');
                
                // 🔥 ДОБАВЛЯЕМ ВЫБОР ПЕЛОТОНА В HTML (Если его там еще нет)
                let pelotonSelectEl = document.getElementById('sa-create-peloton');
                if (!pelotonSelectEl) {
                    const pelotonWrapper = document.createElement('div');
                    pelotonWrapper.innerHTML = `
                        <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 5px; margin-top: 15px; font-weight: bold;">ЛИГА / ПЕЛОТОН</div>
                        <select id="sa-create-peloton" class="auth-input" style="width: 100%; margin-bottom: 15px; background: var(--bg-body); color: var(--text-main); border: 1px solid var(--border); border-radius: 8px; padding: 12px;">
                            <option value="" disabled selected>Выберите лигу...</option>
                            ${pelotons.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                        </select>
                    `;
                    // Вставляем перед выбором команды
                    selectEl.parentNode.insertBefore(pelotonWrapper, selectEl);
                    pelotonSelectEl = document.getElementById('sa-create-peloton');
                    
                    // Вешаем слушатель: при смене пелотона перерисовываем список команд
                    pelotonSelectEl.addEventListener('change', () => {
                        this.renderTeamOptions(teams, oneTeam, pelotonSelectEl.value, joinTeamId);
                    });
                }

                // 3. Авто-выбор пелотона, если мы пришли из чата
                if (targetPelotonId) {
                    pelotonSelectEl.value = targetPelotonId;
                }

                // 4. Отрисовываем команды с учетом выбранного пелотона
                this.renderTeamOptions(teams, oneTeam, pelotonSelectEl.value, joinTeamId);
                
                this.oneTeamId = oneTeam ? oneTeam.id : null;
                this.allTeams = teams;
            } catch(e) {}
        }

        // Вспомогательная функция для отрисовки опций команд
        renderTeamOptions(allTeams, oneTeam, selectedPelotonId, preselectedTeamId) {
            const selectEl = document.getElementById('sa-create-team');
            if (!selectEl) return;

            let html = '<option value="">Нет команды (Свободный агент)</option>';
            
            if (oneTeam) {
                html += `<option value="${oneTeam.id}">Нейтральная команда ONE TEAM</option>`;
            }
            
            allTeams.forEach(t => {
                if (oneTeam && t.id === oneTeam.id) return;
                
                // 🔥 ФИЛЬТРУЕМ КОМАНДЫ ПО ВЫБРАННОМУ ПЕЛОТОНУ
                if (selectedPelotonId && t.peloton_id) {
                    const tPelotons = Array.isArray(t.peloton_id) ? t.peloton_id : [t.peloton_id];
                    if (!tPelotons.includes(selectedPelotonId)) return; // Скрываем команду, если она не в этой лиге
                }

                const sel = preselectedTeamId === t.id ? 'selected' : '';
                html += `<option value="${t.id}" ${sel}>Заявка в команду: ${t.name}</option>`;
            });
            
            selectEl.innerHTML = html;
            selectEl.disabled = false;
            selectEl.style.opacity = '1';
        }

        async startAuthProcess(email) {
            this.email = email.toLowerCase().trim();
            return new Promise(async (resolve) => {
                this.onAuthSuccess = resolve;
                try {
                    const rider = await pb.collection('riders').getFirstListItem(`email="${this.email}"`, { requestKey: null });
                    if (rider) return resolve(rider);
                } catch (e) {
                    await this.loadTeamsToSelect();
                    document.getElementById('sotka-auth-overlay').style.display = 'flex';
                    // 🔥 Запускаем окно выбора роли!
                    this.switchStep('sa-step-role');
                }
            });
        }

        // 🔥 НОВАЯ ФУНКЦИЯ: Обработка выбора роли
        chooseRole(roleType) {
            this.selectedRole = roleType;
            
            if (roleType === 'racer') {
                // Если гонщик - отправляем искать его карточку
                this.switchStep('sa-step-search'); 
            } else {
                // Если велосипедист - очищаем поля и сразу на экран создания
                document.getElementById('sa-create-lastname').value = '';
                document.getElementById('sa-create-firstname').value = '';
                document.getElementById('sa-create-lastname').disabled = false;
                document.getElementById('sa-create-firstname').disabled = false;
                
                // Прячем лишнюю информацию от любителей
                const teamWrapper = document.getElementById('sa-team-wrapper');
                if (teamWrapper) teamWrapper.style.display = 'none';
                
                const warningMsg = document.getElementById('sa-create-warning');
                if (warningMsg) warningMsg.style.display = 'none';
                
                this.switchStep('sa-step-create');
            }
        }

        async searchProfile() {
            const lNameRaw = document.getElementById('sa-search-lastname').value.trim();
            const fNameRaw = document.getElementById('sa-search-firstname').value.trim();
            if (!lNameRaw || !fNameRaw) return alert("Пожалуйста, введите Имя и Фамилию");

            const lName = this.capitalize(lNameRaw);
            const fName = this.capitalize(fNameRaw);

            this.switchStep('sa-step-loading');
            document.getElementById('sa-loading-text').innerText = "Поиск профиля...";

            try {
                const records = await pb.collection('riders').getFullList({ filter: `first_name="${fName}" && last_name="${lName}"`, expand: 'team_id', requestKey: null });
                if (records.length > 0) {
                    const availableRider = records.find(r => !r.email || r.email.trim() === '');
                    if (availableRider) {
                        this.foundRider = availableRider;
                        const tName = this.foundRider.expand?.team_id?.name || "Без команды";
                        document.getElementById('sa-verify-name').innerText = `${this.foundRider.first_name} ${this.foundRider.last_name}`;
                        document.getElementById('sa-verify-team').innerText = `Команда: ${tName}`;
                        this.switchStep('sa-step-verify');
                    } else {
                        const takenRider = records[0]; 
                        const emailParts = takenRider.email.split('@');
                        let hiddenEmail = takenRider.email;
                        if(emailParts.length === 2) hiddenEmail = emailParts[0].charAt(0) + '***@' + emailParts[1];
                        document.getElementById('sa-taken-name').innerText = `${takenRider.first_name} ${takenRider.last_name}`;
                        document.getElementById('sa-taken-email').innerText = hiddenEmail;
                        this.switchStep('sa-step-taken');
                    }
                } else {
                    // Переносим данные в форму создания
                    document.getElementById('sa-create-lastname').value = lName;
                    document.getElementById('sa-create-firstname').value = fName;
                    // Оставляем поля заблокированными, чтобы не опечатались
                    document.getElementById('sa-create-lastname').disabled = true;
                    document.getElementById('sa-create-firstname').disabled = true;
                    
                    // Показываем предупреждение и выбор команды (так как это гонщик)
                    const teamWrapper = document.getElementById('sa-team-wrapper');
                    if (teamWrapper) teamWrapper.style.display = 'block';
                    const warningMsg = document.getElementById('sa-create-warning');
                    if (warningMsg) warningMsg.style.display = 'block';

                    this.switchStep('sa-step-create');
                }
            } catch (e) {
                alert("Ошибка поиска. Попробуйте еще раз.");
                this.switchStep('sa-step-search');
            }
        }

        async verifyProfile() {
            const yobInput = document.getElementById('sa-verify-yob').value.trim();
            if (!yobInput) return alert("Введите год рождения");

            if (String(this.foundRider.yob) === yobInput) {
                this.switchStep('sa-step-loading');
                document.getElementById('sa-loading-text').innerText = "Связываем аккаунты...";
                try {
                    const updatedRider = await pb.collection('riders').update(this.foundRider.id, { email: this.email }, { requestKey: null });
                    this.finishAndClose(updatedRider);
                } catch(e) {
                    alert("Ошибка базы данных при обновлении");
                    this.switchStep('sa-step-verify');
                }
            } else { alert("Неверный год рождения. Доступ запрещен."); }
        }

        async createProfile() {
            const lNameRaw = document.getElementById('sa-create-lastname').value.trim();
            const fNameRaw = document.getElementById('sa-create-firstname').value.trim();
            const yob = document.getElementById('sa-create-yob').value.trim();
            const gender = document.getElementById('sa-create-gender').value;

            if (!lNameRaw || !fNameRaw) return alert("Введите Имя и Фамилию");
            if (!yob || yob.length !== 4) return alert("Введите корректный год рождения (4 цифры)");

            const lName = this.capitalize(lNameRaw);
            const fName = this.capitalize(fNameRaw);

            let selectedTeamId = document.getElementById('sa-create-team').value;
            // Достаем выбранный пелотон
            let selectedPelotonId = document.getElementById('sa-create-peloton') ? document.getElementById('sa-create-peloton').value : null;
            
            let finalTeamId = this.oneTeamId; 
            let transferReq = "";
            let startCluster = "C"; // Дефолт для Шоссе

            if (this.selectedRole === 'cyclist') {
                finalTeamId = null; 
                startCluster = "O";
            } else {
                if (selectedTeamId && selectedTeamId !== this.oneTeamId) {
                    transferReq = selectedTeamId;
                }
                
                // 🔥 МАГИЯ XCNEWS: Если выбран пелотон XCNEWS, не присваиваем дефолтный кластер
                if (selectedPelotonId) {
                    const pelotonObj = window.app.pelotonsMap[selectedPelotonId];
                    if (pelotonObj && pelotonObj.name.toUpperCase().includes('XCNEWS')) {
                        startCluster = ""; // Пустота!
                    }
                }
            }

            this.switchStep('sa-step-loading');
            document.getElementById('sa-loading-text').innerText = "Проверка базы...";

            try {
                if (this.selectedRole === 'cyclist') {
                    const existing = await pb.collection('riders').getFullList({ 
                        filter: `first_name="${fName}" && last_name="${lName}"`, expand: 'team_id', requestKey: null 
                    });

                    if (existing.length > 0) {
                        const availableRider = existing.find(r => !r.email || r.email.trim() === '');
                        if (availableRider) {
                            alert(`⚠️ Мы нашли карточку "${fName} ${lName}" в базе организаторов!\n\nВозможно, вас уже добавляли в протоколы. Система перенаправит вас на привязку профиля, чтобы сохранить ваши старые результаты и не создавать дубликат.`);
                            this.foundRider = availableRider;
                            const tName = this.foundRider.expand?.team_id?.name || "Без команды";
                            document.getElementById('sa-verify-name').innerText = `${this.foundRider.first_name} ${this.foundRider.last_name}`;
                            document.getElementById('sa-verify-team').innerText = `Команда: ${tName}`;
                            this.switchStep('sa-step-verify');
                            return; 
                        } else {
                            const takenRider = existing[0]; 
                            const emailParts = takenRider.email.split('@');
                            let hiddenEmail = takenRider.email;
                            if(emailParts.length === 2) hiddenEmail = emailParts[0].charAt(0) + '***@' + emailParts[1];
                            document.getElementById('sa-taken-name').innerText = `${takenRider.first_name} ${takenRider.last_name}`;
                            document.getElementById('sa-taken-email').innerText = hiddenEmail;
                            this.switchStep('sa-step-taken');
                            return; 
                        }
                    }
                }

                document.getElementById('sa-loading-text').innerText = "Регистрация...";

                // Создаем профиль
                const newRider = await pb.collection('riders').create({
                    first_name: fName, 
                    last_name: lName, 
                    yob: Number(yob), 
                    gender: gender, 
                    email: this.email, 
                    team_id: finalTeamId, 
                    transfer_request: transferReq, 
                    rating: 0, 
                    base_cluster: startCluster
                }, { requestKey: null });

                // 🔥 АВТО-ТРАНСФЕР: Отправляем заявку капитану
                if (transferReq) {
                    try {
                        const targetTeamObj = this.allTeams.find(t => t.id === transferReq);
                        const teamName = targetTeamObj ? targetTeamObj.name : "вашу команду";
                        
                        // Ищем капитана выбранной команды
                        const captains = await pb.collection('riders').getFullList({ 
                            filter: `team_id="${transferReq}" && roles~"captain"`, requestKey: null 
                        });
                        
                        if (captains.length > 0) {
                            const captain = captains[0];
                            // Создаем личный чат
                            const newChat = await pb.collection('chats').create({ 
                                type: 'direct', name: 'Direct', participants: [newRider.id, captain.id] 
                            }, { requestKey: null });
                            
                            // Отправляем сообщение от лица новичка
                            await pb.collection('messages').create({
                                chat_id: newChat.id,
                                sender_id: newRider.id,
                                text: `Привет! Я только что зарегистрировался в приложении и хочу выступать за ${teamName}. Одобришь мою заявку?\n\n[ACTION:TRANSFER:${newRider.id}:${transferReq}]`
                            }, { requestKey: null });
                        }
                    } catch(err) {
                        console.error("Ошибка авто-заявки:", err);
                    }
                }
                
                this.finishAndClose(newRider);
            } catch(e) {
                alert("Ошибка создания профиля");
                this.switchStep('sa-step-create');
            }
        }

        finishAndClose(riderObj) { document.getElementById('sotka-auth-overlay').style.display = 'none'; if (this.onAuthSuccess) this.onAuthSuccess(riderObj); }
        
        cancelVerify() { this.foundRider = null; document.getElementById('sa-verify-yob').value = ''; this.switchStep('sa-step-search'); }
        
        cancelCreate() { 
            document.getElementById('sa-create-yob').value = ''; 
            // Возвращаемся на правильный экран в зависимости от роли
            if (this.selectedRole === 'cyclist') {
                this.switchStep('sa-step-role');
            } else {
                this.switchStep('sa-step-search');
            }
        }
    }

// ==========================================
// 🔥 УМНАЯ ПОДСТАНОВКА КОМАНДЫ ПРИ РЕГИСТРАЦИИ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinTeamId = urlParams.get('join_team');

    if (joinTeamId) {
        // Запускаем "шпиона", который проверяет выпадающий список каждые полсекунды
        const checkTeamSelect = setInterval(() => {
            const teamSelect = document.getElementById('sa-create-team');
            
            // Если селект появился и в нем есть команды (больше одной опции)
            if (teamSelect && teamSelect.options.length > 1) {
                
                // Проверяем, есть ли нужная команда в списке
                const optionExists = Array.from(teamSelect.options).some(opt => opt.value === joinTeamId);
                
                if (optionExists) {
                    teamSelect.value = joinTeamId; // Выбираем её!
                    
                    // По желанию: можем подсветить поле, чтобы юзер заметил магию
                    teamSelect.style.border = "2px solid var(--primary)";
                    teamSelect.style.boxShadow = "0 0 10px rgba(255,193,7,0.3)";
                }
                
                clearInterval(checkTeamSelect); // Останавливаем шпиона
            }
        }, 500);
        
        // На всякий случай убиваем шпиона через 10 секунд, чтобы не висел в памяти
        setTimeout(() => clearInterval(checkTeamSelect), 10000);
    }
});

    // --- ГЛОБАЛЬНЫЙ ЗАПУСК ---
    window.sotkaAuth = new SotkaAuthManager();
    window.app = new MessengerApp();

    document.addEventListener('DOMContentLoaded', () => {
        window.app.init();
    });
    
    const appManifest = {
        "name": "VILKA RADIO", "short_name": "VILKA", "start_url": window.location.href.split('?')[0], "display": "standalone", "background_color": "#18181b", "theme_color": "#ffc107",
        "icons": [
            { "src": "https://cdn-icons-png.flaticon.com/512/2972/2972185.png", "sizes": "192x192", "type": "image/png" },
            { "src": "https://cdn-icons-png.flaticon.com/512/2972/2972185.png", "sizes": "512x512", "type": "image/png" }
        ]
    };
    const manifestBlob = new Blob([JSON.stringify(appManifest)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(manifestBlob);
    document.head.insertAdjacentHTML('beforeend', `<link rel="manifest" href="${manifestUrl}">`);
    document.head.insertAdjacentHTML('beforeend', `<meta name="theme-color" content="#ffc107">`);
    document.head.insertAdjacentHTML('beforeend', `<meta name="apple-mobile-web-app-capable" content="yes">`);
    document.head.insertAdjacentHTML('beforeend', `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`);
    document.head.insertAdjacentHTML('beforeend', `<link rel="apple-touch-icon" href="https://cdn-icons-png.flaticon.com/512/2972/2972185.png">`); 

    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });

    window.installPWA = async () => {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
        const isAndroid = /android/i.test(userAgent);
        
        const modal = document.getElementById('installGuideModal');
        const content = document.getElementById('installGuideContent');

        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                const btn = document.getElementById('installAppHeaderBtn');
                if(btn) btn.style.display = 'none';
            }
            deferredPrompt = null;
            return;
        } 
        
        let guideHtml = '';
        if (isIOS) {
            guideHtml = `
                <div style="background: var(--bg-body); padding: 15px; border-radius: 12px; border: 1px solid var(--border);">
                    <div style="display:flex; align-items:center; gap: 15px; margin-bottom: 20px;">
                        <div style="background: #fff; color: #007aff; padding: 10px; border-radius: 8px; flex-shrink:0;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg></div>
                        <span><b>Шаг 1:</b> В браузере Safari нажмите кнопку <b>«Поделиться»</b> (внизу по центру).</span>
                    </div>
                    <div style="display:flex; align-items:center; gap: 15px;">
                        <div style="background: #fff; color: #000; padding: 10px; border-radius: 8px; flex-shrink:0;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4" ry="4"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg></div>
                        <span><b>Шаг 2:</b> В появившемся меню прокрутите вниз и выберите <b>«На экран Домой»</b>.</span>
                    </div>
                </div>`;
        } else if (isAndroid) {
             guideHtml = `
                <div style="background: var(--bg-body); padding: 15px; border-radius: 12px; border: 1px solid var(--border);">
                    <div style="display:flex; align-items:center; gap: 15px; margin-bottom: 20px;">
                        <div style="background: #fff; color: #333; padding: 10px; border-radius: 8px; flex-shrink:0;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg></div>
                        <span><b>Шаг 1:</b> Откройте меню браузера (нажмите на <b>три точки ⋮</b> в правом верхнем углу).</span>
                    </div>
                    <div style="display:flex; align-items:center; gap: 15px;">
                        <div style="background: #fff; color: #000; padding: 10px; border-radius: 8px; flex-shrink:0;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg></div>
                        <span><b>Шаг 2:</b> Найдите и нажмите пункт <b>«Добавить на главный экран»</b> или <b>«Установить приложение»</b>.</span>
                    </div>
                </div>`;
        } else {
             guideHtml = `
                <div style="background: var(--bg-body); padding: 15px; border-radius: 12px; border: 1px solid var(--border);">
                    <div style="display:flex; align-items:center; gap: 15px; margin-bottom: 20px;">
                        <div style="background: #fff; color: #333; padding: 10px; border-radius: 8px; flex-shrink:0;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg></div>
                        <span><b>Шаг 1:</b> Откройте меню браузера Chrome (<b>три точки ⋮</b> в правом верхнем углу).</span>
                    </div>
                    <div style="display:flex; align-items:center; gap: 15px;">
                        <div style="background: #fff; color: #000; padding: 10px; border-radius: 8px; flex-shrink:0;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></div>
                        <span><b>Шаг 2:</b> Выберите пункт <b>«Сохранить и поделиться»</b> ➔ <b>«Установить страницу как приложение»</b>.</span>
                    </div>
                </div>`;
        }
        
        if (content && modal) {
            content.innerHTML = guideHtml;
            modal.style.display = 'flex';
        }
    };

    window.addEventListener('DOMContentLoaded', () => {
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            const btn = document.getElementById('installAppHeaderBtn');
            if(btn) btn.style.display = 'none';
        }
    });

    function initPullToRefresh() {
        let touchStartY = 0;
        let isPulling = false;

        const ptrIndicator = document.createElement('div');
        ptrIndicator.innerHTML = '<div style="background: var(--bg-surface); padding: 10px 20px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 10px; border: 1px solid var(--primary);"><span class="spinner" style="width: 14px; height: 14px; border-width: 2px; border-color: var(--primary) transparent transparent transparent;"></span> <span style="font-size: 12px; font-family:\'Unbounded\'; font-weight:800; color: var(--text-main);">ОБНОВЛЕНИЕ</span></div>';
        ptrIndicator.style.cssText = 'position: fixed; top: -60px; left: 0; width: 100%; display: flex; justify-content: center; z-index: 999999; transition: top 0.2s ease-out; pointer-events: none;';
        document.body.appendChild(ptrIndicator);

        document.addEventListener('touchstart', (e) => {
            const scrollContainer = e.target.closest('#chatList, #contactList, #messagesContainer, #crmContentArea, .modal-box, .p-table-container');
            if (scrollContainer && (scrollContainer.id === 'messagesContainer' || scrollContainer.classList.contains('modal-box'))) {
                isPulling = false; return;
            }
            let isAtTop = scrollContainer ? (scrollContainer.scrollTop <= 1) : (window.scrollY <= 1);
            if (isAtTop) { touchStartY = e.touches[0].clientY; isPulling = true; } else { isPulling = false; }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!isPulling) return;
            const pullDistance = e.touches[0].clientY - touchStartY;
            if (pullDistance > 30 && pullDistance < 200) ptrIndicator.style.top = '30px';
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!isPulling) return;
            if ((e.changedTouches[0].clientY - touchStartY) > 80) {
                if(typeof showVilkaSplash === 'function') showVilkaSplash();
                setTimeout(() => window.location.reload(true), 300);
            } else { ptrIndicator.style.top = '-60px'; }
            isPulling = false;
        });
    }

    function initSwipeGestures() {
        let touchStartX = 0; let touchStartY = 0;
        document.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; }, { passive: true });
        document.addEventListener('touchmove', (e) => {
            const chatArea = document.getElementById('mainChatArea');
            if (chatArea && chatArea.classList.contains('mobile-open')) {
                let diffX = e.touches[0].clientX - touchStartX; let diffY = Math.abs(e.touches[0].clientY - touchStartY);
                if (diffX > 10 && diffX > diffY) e.preventDefault();
            }
        }, { passive: false });
        document.addEventListener('touchend', (e) => {
            const chatArea = document.getElementById('mainChatArea');
            if (chatArea && chatArea.classList.contains('mobile-open') && (e.changedTouches[0].clientX - touchStartX) >= 90) {
                if (window.app && typeof window.app.closeChatMobile === 'function') window.app.closeChatMobile();
            }
        }, { passive: true });
    }

    function initConnectionMonitor() {
        const offlineBanner = document.createElement('div');
        offlineBanner.id = 'vilka-offline-banner';
        offlineBanner.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg> НЕТ ПОДКЛЮЧЕНИЯ К СЕРВЕРУ`;
        offlineBanner.style.cssText = 'position:fixed; top:0; left:0; width:100%; background:var(--danger); color:#fff; font-family:"Unbounded"; font-size:10px; font-weight:800; text-align:center; padding:6px; z-index:9999999; transform:translateY(-100%); transition:transform 0.3s; display:flex; justify-content:center; align-items:center; gap:8px;';
        document.body.appendChild(offlineBanner);

        let isOffline = false;
        async function runCheck() {
            let serverAlive = false;
            if (navigator.onLine) { try { serverAlive = (await fetch('https://db.sotka.one/api/health', { method: 'GET', cache: 'no-store' })).ok; } catch (e) {} }
            
            if (!serverAlive && !isOffline) {
                isOffline = true; offlineBanner.style.transform = 'translateY(0)';
                const sendBtn = document.getElementById('sendBtnIcon'); if(sendBtn) { sendBtn.style.opacity = '0.5'; sendBtn.style.pointerEvents = 'none'; }
            } else if (serverAlive && isOffline) {
                isOffline = false; offlineBanner.style.transform = 'translateY(-100%)';
                const sendBtn = document.getElementById('sendBtnIcon'); if(sendBtn) { sendBtn.style.opacity = '1'; sendBtn.style.pointerEvents = 'auto'; }
                if(window.app) window.app.softRefreshMessages();
            }
        }
        setInterval(runCheck, 5000);
        window.addEventListener('offline', runCheck); window.addEventListener('online', runCheck);
    }

    // 🔥 ЕДИНЫЙ БЛОК ЗАПУСКА СИСТЕМНЫХ ФУНКЦИЙ
    document.addEventListener('DOMContentLoaded', () => {
        initSwipeGestures();
        initConnectionMonitor();
    });