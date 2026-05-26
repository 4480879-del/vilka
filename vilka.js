// 🔥 УБИЙЦА БАГА 100vh В PWA (С ОПТИМИЗАЦИЕЙ ЗАГРУЗКИ)
const calculateAppHeight = () => {
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
};

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(calculateAppHeight, 150); // Ждем 150мс, пока интерфейс "успокоится"
});
window.addEventListener('orientationchange', calculateAppHeight);

calculateAppHeight(); // Запускаем сразу при старте
setTimeout(calculateAppHeight, 500); // Страховочный пинок

	console.log("📻 VILKA RADIO V23");

    function showVilkaSplash() { const s = document.getElementById('vilka-splash-screen'); if (s) s.classList.remove('hidden'); }
    function hideVilkaSplash() { const s = document.getElementById('vilka-splash-screen'); if (s) s.classList.add('hidden'); }

    const pb = new PocketBase('https://vilka.sotka.one');
    pb.beforeSend = function (url, options) { url += (url.includes('?') ? '&' : '?') + 'nocache=' + Date.now(); return { url, options }; };

if (pb.authStore.isValid) {
        const authOverlay = document.getElementById('sotka-auth-overlay');
        if (authOverlay) {
            authOverlay.remove(); // Полностью удаляем из DOM
        }
    }


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
		this.liveDistanceFilter = 'all';
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
	
	// 🔥 МЕТОД ПЕРЕКЛЮЧЕНИЯ ФИЛЬТРА ДИСТАНЦИЙ
    setLiveDistanceFilter(dist) {
        this.liveDistanceFilter = dist;
        this.renderLiveBoard();
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

    // 🔥 ЖЕСТКОЕ ПЕРЕКЛЮЧЕНИЕ СОРТИРОВКИ (С ЦИКЛОМ ДЛЯ АБСОЛЮТА)
    switchLiveSort(s) { 
        // 1. Логика переключения
        if (s === 'absolute') {
            if (this.liveSortMode === 'absolute') this.liveSortMode = 'absolute_m';
            else if (this.liveSortMode === 'absolute_m') this.liveSortMode = 'absolute_f';
            else if (this.liveSortMode === 'absolute_f') this.liveSortMode = 'absolute_u';
            else this.liveSortMode = 'absolute';
        } else {
            this.liveSortMode = s; // category
        }

        // 2. Текст для кнопки
        let absText = "АБСОЛЮТ";
        if (this.liveSortMode === 'absolute_m') absText = "М 18+";
        if (this.liveSortMode === 'absolute_f') absText = "Ж 18+";
        if (this.liveSortMode === 'absolute_u') absText = "U Юность";

        // 3. Обновление визуального состояния кнопок
        document.querySelectorAll('[onclick*="switchLiveSort"]').forEach(btn => {
            let onclickVal = btn.getAttribute('onclick') || '';
            
            if (onclickVal.includes('absolute')) {
                btn.innerText = absText; // Меняем текст
                if (this.liveSortMode.startsWith('absolute')) {
                    btn.classList.add('active');
                    btn.style.background = 'var(--primary)';
                    btn.style.color = '#000000';
                } else {
                    btn.classList.remove('active');
                    btn.style.background = '';
                    btn.style.color = '';
                    btn.innerText = "АБСОЛЮТ"; // Сброс текста, если ушли в группы
                }
            } else if (onclickVal.includes('category')) {
                if (this.liveSortMode === 'category') {
                    btn.classList.add('active');
                    btn.style.background = 'var(--primary)';
                    btn.style.color = '#000000';
                } else {
                    btn.classList.remove('active');
                    btn.style.background = '';
                    btn.style.color = '';
                }
            }
        });
        
        this.renderLiveBoard(); 
    }

    renderLiveRow(b, rank, maxLaps = 0, leaderSplits = []) {
        // 🔥 1. ОПРЕДЕЛЯЕМ ЦВЕТ ФОНА ДЛЯ МЕДАЛИСТОВ
        let rowBg = 'transparent';
        if (rank === 1) rowBg = 'rgba(253, 224, 71, 0.25)'; 
        else if (rank === 2) rowBg = 'rgba(192, 192, 192, 0.12)'; 
        else if (rank === 3) rowBg = 'rgba(253, 186, 116, 0.25)'; 

        // 🔥 2. СЧИТАЕМ КРУГИ
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

        // 🔥 3. ЛОГИКА ЦВЕТА И РАЗМЕРА РЕЗУЛЬТАТА
        let timeStr = b.timeStr || "На трассе";
        let resColor = "var(--text-main)"; 
        let resWeight = "800";
        let resSize = "15px";

        if (timeStr === "DNF" || timeStr === "DSQ" || timeStr.includes("НЕТ СТАРТА")) {
            resColor = "var(--danger)";
        } else if (timeStr === "На трассе") {
            resColor = "var(--warning)";
        }

        // 🔥 4. ВЫВОД ГОТОВОЙ СКОРОСТИ И КЛАСТЕРА
        let speedHtml = '';
        if (b.speed && parseFloat(b.speed) > 0) {
            let speedVal = parseFloat(b.speed).toFixed(2);
            let clusterBadge = b.recCluster ? `<span style="background:var(--primary); color:#000; padding:2px 6px; border-radius:4px; font-size:9px; font-family:'Unbounded'; font-weight:800; margin-left:6px;">${b.recCluster}</span>` : '';
            
            speedHtml = `<div style="font-size:11px; color:var(--text-muted); font-family:'Roboto Mono'; margin-top:4px; font-weight:bold;">${speedVal} км/ч ${clusterBadge}</div>`;
        }

        // Заметки судьи
        let noteText = (typeof bibToNote !== 'undefined' && b.bib) ? (bibToNote[b.bib] || '') : '';
        let noteBadge = noteText ? `<span style="background:#ffc107; color:#000; padding:2px 6px; border-radius:4px; font-size:9px; margin-left:6px; font-weight:bold; text-transform:uppercase; display:inline-block; vertical-align:middle;">${noteText}</span>` : '';

        // 🔥 5. ДЕЛАЕМ ИМЯ КЛИКАБЕЛЬНЫМ (добавлен <b> тег с вызовом openProfile)
        // В LiveBoardService ID гонщика хранится прямо в объекте b (добавляется при парсинге в openLiveBoard)
        const riderIdSafe = b.id || b.rider_id || b.riderId || ''; 
        let nameHtml = b.name;
        
        if (riderIdSafe) {
            nameHtml = `<b style="cursor:pointer; transition:0.2s;" 
                           onmouseover="this.style.color='var(--primary)'" 
                           onmouseout="this.style.color=''" 
                           onclick="window.app.openProfile('${riderIdSafe}')" 
                           title="Открыть профиль">${b.name}</b>`;
        }

        return `<tr style="background:${rowBg}; border-bottom: 1px solid var(--border); transition:0.2s;" onmouseover="this.style.background='var(--bg-surface-hover)'" onmouseout="this.style.background='${rowBg}'">
            <td style="padding:10px; text-align:center; font-weight:800; color:var(--text-main);">${rank}</td>
            <td style="padding:10px; text-align:center; font-weight:800; color:var(--text-main); font-size:14px;">${b.bib || '-'}</td>
            <td style="padding:10px; text-align:left;">
                <div style="font-weight:800; font-size:14px; color:var(--text-main);">${nameHtml} <span style="font-weight:400; color:var(--text-muted); font-size:12px;">${b.yob || ''}</span> ${noteBadge}</div>
                <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">${b.category ? b.category + ' | ' : ''}${b.team || '-'}</div>
            </td>
            <td style="padding:10px; text-align:center; font-weight:bold; color:var(--text-main);">${myLapTimes.length}</td>
            <td style="padding:10px; text-align:left;">
                <div style="color:${resColor}; font-weight:${resWeight}; font-size:${resSize}; font-family:'Roboto Mono', monospace;">${timeStr}</div>
                ${speedHtml}
            </td>
            <td style="padding:10px; font-family:'Roboto Mono'; font-size:11px; color:var(--text-muted); text-align:left;">${b.startTime || '-'}</td>
            ${lapColumns}
        </tr>`;
    }

    renderStartRow(r) { 
        let timeStr = (r.actualStart && r.actualStart !== '-') ? `<span style="color:var(--success); font-weight:bold;">${r.actualStart}</span>` : `<span style="color:var(--text-muted);">${r.plannedStart || '-'}</span>`; 
        
        // 🔥 ДЕЛАЕМ ИМЯ КЛИКАБЕЛЬНЫМ (аналогично таблице результатов)
        const riderIdSafe = r.id || r.rider_id || r.riderId || '';
        let nameHtml = r.name;
        
        if (riderIdSafe) {
            nameHtml = `<b style="cursor:pointer; transition:0.2s;" 
                           onmouseover="this.style.color='var(--primary)'" 
                           onmouseout="this.style.color=''" 
                           onclick="window.app.openProfile('${riderIdSafe}')" 
                           title="Открыть профиль">${r.name}</b>`;
        }

        return `<tr style="border-bottom: 1px solid var(--border);">
            <td style="width:80px; padding:12px 10px; text-align:left; font-family:'Roboto Mono'; font-size: 14px;">${timeStr}</td>

            <td style="width:60px; padding:12px 10px; text-align:center; font-weight:bold; color:var(--text-main);">${r.bib || '-'}</td>
            
            <td style="padding:12px 10px; text-align:left; position: relative; overflow: hidden;">
                <div style="position: absolute; right: -5px; bottom: -5px; font-size: 38px; font-family: 'Unbounded'; font-weight: 900; color: var(--text-main); opacity: 0.04; pointer-events: none; white-space: nowrap; z-index: 0; text-transform: uppercase;">
                    ${r.team || ''}
                </div>
                <div style="position: relative; z-index: 1;">
                    <div style="font-weight:800; font-size:13px; color:var(--text-main);">${nameHtml}</div>
                    <div style="font-size:10px; color:var(--text-muted);">${r.team || '-'}</div>
                </div>
            </td>

            <td style="padding:12px 10px; text-align:center;">
                <span style="background:var(--bg-surface-hover); color:var(--text-main); padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700;">${r.group || '-'}</span>
            </td>
        </tr>`; 
    }

    async openLiveBoard(raceId, event) { 
        if (event) event.stopPropagation(); 
        this.cleanupLiveBoard(); 
        this.expandedRaceId = raceId; 
        this.liveDistanceFilter = 'all'; // Сбрасываем фильтр при новом открытии
        
        document.getElementById('liveBoardModal').style.display = 'flex'; 
        const titleEl = document.getElementById('liveBoardTitle');
        titleEl.innerText = "СИНХРОНИЗАЦИЯ...";

        try {
            // 1. Скачиваем базовую гонку ВМЕСТЕ С ПРАВИЛОМ
            const firstRace = await pb.collection('races').getOne(raceId, { 
                expand: 'rating_rule_id', 
                requestKey: null, 
                fetchOptions: { cache: 'no-store' } 
            }); 
            
            // 🔥 Сохраняем правило глобально для рендера
            this.currentRuleConfig = null;
            if (firstRace.expand && firstRace.expand.rating_rule_id) {
                let conf = firstRace.expand.rating_rule_id.config;
                this.currentRuleConfig = typeof conf === 'string' ? JSON.parse(conf) : conf;
            }
            
            // 2. УМНЫЙ ПОИСК ДРУГИХ ДИСТАНЦИЙ ЭТОГО ЖЕ ИВЕНТА
            // Вычленяем базовое имя (отрезаем то, что в квадратных скобках)
            const baseName = firstRace.name.includes('[') ? firstRace.name.split('[')[0].trim() : firstRace.name;
            
            // Ищем все гонки создателя на эту же дату (время создания совпадает до минуты)
            const sisterRaces = await pb.collection('races').getFullList({
                filter: `date = "${firstRace.date}" && creator_id = "${firstRace.creator_id}"`,
                requestKey: null
            });

            // Отбираем только те, у которых совпадает базовое имя
            let racesData = sisterRaces.filter(r => {
                const rBaseName = r.name.includes('[') ? r.name.split('[')[0].trim() : r.name;
                return rBaseName === baseName;
            });
            
            // Защита: если ничего не нашлось, оставляем только саму гонку
            if (racesData.length === 0) racesData = [firstRace];

            // 3. Формируем интерфейс шапки
            this.openedRaceName = baseName;
            this.openedRaceDate = new Date(firstRace.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
            
            let distText = "";
            if (racesData.length === 1) {
                distText = firstRace.distance ? `${firstRace.distance} КМ` : '';
                if (firstRace.laps && firstRace.laps > 1) distText += ` (${firstRace.laps} КР.)`;
            } else {
                distText = `${racesData.length} ДИСТАНЦИИ`;
            }
            this.openedRaceDistText = distText; 
            
            titleEl.innerHTML = `
                <div style="display:flex; align-items:center; gap:15px; width:100%;">
                    <div style="display:flex; flex-direction:column; gap:2px; text-align:left;">
                        <span style="font-size:18px; font-weight:800; text-transform:uppercase; line-height:1.2; color:var(--text-main);">${this.openedRaceName}</span>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <span style="font-size:11px; color:var(--text-muted); font-family:'Roboto Mono'; font-weight:normal;">${this.openedRaceDate}</span>
                            ${distText ? `<span style="font-size:10px; background:var(--bg-body); color:var(--primary); padding:2px 6px; border-radius:4px; font-weight:bold;">${distText}</span>` : ''}
                        </div>
                    </div>
                    <button class="excel-download-btn" onclick="window.app.crm.liveService.exportToExcel()" style="background:var(--bg-surface-hover); border:1px solid var(--border); color:var(--text-main); padding:8px 12px; border-radius:6px; cursor:pointer; font-family:'Unbounded'; font-size:10px; font-weight:800; display:flex; align-items:center; gap:8px; margin-left:auto; transition:0.2s;">
    📊 EXCEL
</button>
                </div>
            `;

            let anyFinished = false;
            let anyLive = false;
            this.currentLiveStartList = [];
            this.currentLiveBoard = [];

            // 4. СКАЧИВАЕМ ДАННЫЕ ВСЕХ НАЙДЕННЫХ ГОНОК
            const crmRef = (this.app && this.app.crm) || (window.app && window.app.crm);

            for (let raceData of racesData) {
                if (raceData.status === 'Finished') anyFinished = true;
                if (raceData.status === 'LIVE') anyLive = true;

                const rosters = await pb.collection('race_rosters').getFullList({ 
                    filter: `race_id = "${raceData.id}" && status != "canceled"`, 
                    expand: 'rider_id,rider_id.team_id,gruppetto_id', 
                    requestKey: null 
                });
                
                const rStartList = rosters.map(r => {
    const rider = r.expand?.rider_id;
    if (!rider) return null;

    let tName = "";
    try { 
        // 🔥 Обращаемся к методу из правильного класса!
        tName = crmRef.getRiderTeamNames(rider); 
    } catch (e) {}
    if (r.expand?.gruppetto_id) tName = `${tName} [G: ${r.expand.gruppetto_id.name}]`;

    // 🛠️ Используем raceData, так как внутри цикла for (let raceData of racesData) объект гонки называется так
    let displayCat = r.final_cluster || rider.base_cluster || 'B';
    try {
        const crm = (this.app && this.app.crm) || (window.app && window.app.crm);
        if (crm && typeof crm.getRaceCategory === 'function') {
            displayCat = crm.getRaceCategory(rider, raceData);
        }
    } catch (err) { console.warn("Live category error:", err); }

    return {		
        id: rider.id,
		bib: r.bib || '-', 
        name: `${rider.first_name} ${rider.last_name}`, 
        yob: rider.yob || '', 
        team: tName, 
        group: displayCat, 
        plannedStart: r.planned_start || '', 
        actualStart: r.actual_start || '', 
        distance: raceData.distance 
    };
}).filter(Boolean);

                this.currentLiveStartList.push(...rStartList);

                let lbData = raceData.live_board || [];
                if (typeof lbData === 'string') lbData = JSON.parse(lbData);
                
                let rBoard = lbData.map(lb => {
                    if (typeof lb.lapTimes === 'string') lb.lapTimes = JSON.parse(lb.lapTimes);
                    let match = rStartList.find(sl => String(sl.bib) === String(lb.bib));
                    if (match) { lb.yob = match.yob; lb.startTime = match.actualStart || match.plannedStart || '-'; lb.id = match.id;}
                    lb.distance = raceData.distance;
                    return lb;
                });
                
                this.currentLiveBoard.push(...rBoard);

                if (raceData.status !== 'Finished') { 
                    pb.collection('races').subscribe(raceData.id, (e) => { if (e.action === 'update') this.openLiveBoard(raceId); });
                    this.activeSubscriptions.push({ collection: 'races', topic: raceData.id });
                }
            }

            this.currentLiveStartList.sort((a,b) => (a.plannedStart || '').localeCompare(b.plannedStart || ''));

            document.getElementById('liveBoardDot').style.display = (!anyFinished && !anyLive) || anyFinished ? 'none' : 'block';

            // 🔥 УМНОЕ ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
            // Ищем, есть ли в протоколе хотя бы один реальный результат (пройден круг, финиш, DNF/DSQ и т.д.)
            const hasRealResults = this.currentLiveBoard.some(b => 
                b.laps > 0 || (b.timeStr && !['Start', 'На трассе', '⛔ НЕТ СТАРТА'].includes(b.timeStr))
            );
            
            // Включаем вкладку "Результаты" ТОЛЬКО если гонка завершена ИЛИ уже прилетела первая отсечка
            this.liveCurrentTab = (anyFinished || hasRealResults) ? 'result' : 'start';
            this.switchLiveTab(this.liveCurrentTab);

        } catch(e) { console.error(e); }
    }
	
    renderLiveBoard() {
        let container = document.getElementById('liveBoardTable');
        
        // 🔥 ГЕНЕРАЦИЯ КНОПОК ФИЛЬТРА ПО ДИСТАНЦИЯМ
        const distances = new Set();
        (this.liveCurrentTab === 'result' ? this.currentLiveBoard : this.currentLiveStartList).forEach(b => {
            if (b.distance !== undefined) distances.add(b.distance);
        });
        
        let filterHtml = '';
        const distArray = Array.from(distances).sort((a,b) => b - a);
        if (distArray.length > 1) {
            filterHtml += `<div style="display:flex; gap:6px; margin-bottom:15px; overflow-x:auto; padding-bottom:4px; -webkit-overflow-scrolling:touch;">`;
            
            const isActiveAll = this.liveDistanceFilter === 'all';
            filterHtml += `<button onclick="window.app.crm.liveService.setLiveDistanceFilter('all')" style="border:none; padding:6px 12px; border-radius:12px; font-size:10px; font-weight:bold; font-family:'Unbounded'; cursor:pointer; white-space:nowrap; transition:0.2s; box-shadow:0 2px 5px rgba(0,0,0,0.05); ${isActiveAll ? 'background:var(--primary); color:#000;' : 'background:var(--bg-surface-hover); color:var(--text-muted);'}">ВСЕ</button>`;
            
            distArray.forEach(d => {
                const isActive = this.liveDistanceFilter == d; 
                filterHtml += `<button onclick="window.app.crm.liveService.setLiveDistanceFilter(${d})" style="border:none; padding:6px 12px; border-radius:12px; font-size:10px; font-weight:bold; font-family:'Unbounded'; cursor:pointer; white-space:nowrap; transition:0.2s; box-shadow:0 2px 5px rgba(0,0,0,0.05); ${isActive ? 'background:var(--primary); color:#000;' : 'background:var(--bg-surface-hover); color:var(--text-muted);'}">${d} КМ</button>`;
            });
            filterHtml += `</div>`;
        }

        // Поддерживаем все виды абсолюта
        let isAbs = this.liveSortMode.startsWith('absolute');
        let board = this.liveCurrentTab === 'result' ? this.currentLiveBoard : this.currentLiveStartList;

        // 🔥 ПРИМЕНЕНИЕ ФИЛЬТРА ДИСТАНЦИЙ
        if (this.liveDistanceFilter && this.liveDistanceFilter !== 'all') {
            board = board.filter(b => b.distance == this.liveDistanceFilter);
        }

        // 🔥 ПРИМЕНЕНИЕ ФИЛЬТРА ПОД-АБСОЛЮТОВ (М / Ж / Дети)
        if (this.liveSortMode === 'absolute_m') {
            board = board.filter(b => {
                let cat = (b.category || b.group || "").toUpperCase();
                // Мужчины: не дети, не женщины
                return !cat.includes('U') && !cat.includes('F') && !cat.includes('Ж') && !cat.includes('ЖЕН');
            });
        } else if (this.liveSortMode === 'absolute_f') {
            board = board.filter(b => {
                let cat = (b.category || b.group || "").toUpperCase();
                // Женщины: не дети, есть F или Ж
                return !cat.includes('U') && (cat.includes('F') || cat.includes('Ж') || cat.includes('ЖЕН'));
            });
        } else if (this.liveSortMode === 'absolute_u') {
            board = board.filter(b => {
                let cat = (b.category || b.group || "").toUpperCase();
                // Дети: есть U
                return cat.includes('U');
            });
        }

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
// ========================================================
        // 🔥 УМНЫЙ РАСЧЕТ ДИАПАЗОНА СКОРОСТЕЙ (ТОЛЬКО ИЗ БАЗЫ ДАННЫХ)
        // ========================================================
        let ruleConfig = this.currentRuleConfig;

        const getSpeedRangeHtml = (grp) => {
            // Если правила в базе нет, или это дети (U) / ветераны (V) — ничего не выводим
            if (!ruleConfig || !ruleConfig.thresholds || grp === "Без группы" || grp.startsWith("U") || grp.startsWith("V")) return '';
            
            let gender = (grp.includes('F') || grp.includes('Ж') || grp.toLowerCase().includes('жен')) ? 'F' : 'M';
            let cluster = grp.charAt(0).toUpperCase(); 
            
            let t = ruleConfig.thresholds[gender];
            if (!t || t[cluster] === undefined) return '';

            // Вычисляем диапазон (сортируем пороги по убыванию)
            let sortedKeys = Object.keys(t).sort((a, b) => t[b] - t[a]);
            let cIdx = sortedKeys.indexOf(cluster);
            let minSpeed = t[cluster];
            let maxSpeed = cIdx > 0 ? t[sortedKeys[cIdx - 1]] : null;

            if (maxSpeed) {
                return ` <span style="color:var(--text-muted); font-size:10px; font-family:'Roboto Mono'; text-transform:none; margin-left:8px; font-weight:bold;">(${minSpeed} - ${maxSpeed} км/ч)</span>`;
            } else {
                return ` <span style="color:var(--text-muted); font-size:10px; font-family:'Roboto Mono'; text-transform:none; margin-left:8px; font-weight:bold;">(от ${minSpeed} км/ч)</span>`;
            }
        };
        // ========================================================
        // 🔥 ОБЯЗАТЕЛЬНЫЙ id="mainLiveTable" для PDF!
        let html = filterHtml + `<div style="width:100%; overflow-x:auto; padding-bottom:20px;"><table id="mainLiveTable" style="width:100%; border-collapse:collapse; white-space:nowrap; font-family:'Manrope'; font-size:12px; color:var(--text-main);">`;

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
                        html += `<tr class="live-group-header"><td colspan="${6 + maxLaps}" style="padding:10px 8px; background:var(--bg-surface-hover); color:var(--primary); font-weight:bold; border:1px solid var(--border); font-family:'Unbounded'; text-transform:uppercase; font-size:11px;">ГРУППА: ${grp}${getSpeedRangeHtml(grp)}</td></tr>`;
                        let grpItems = board.filter(b => (b.category || "Без группы") === grp);
                        grpItems.forEach((b, i) => html += this.renderLiveRow(b, i+1, maxLaps, leaderSplits));
                    });
                }
            }
        } else {
            html += `<thead style="background:var(--bg-surface); position:sticky; top:0; z-index:5; box-shadow: 0 2px 5px rgba(0,0,0,0.1);"><tr><th style="width:80px; text-align:left; padding:12px;">СТАРТ</th><th style="width:60px; padding:12px;">BIB</th><th style="text-align:left; padding:12px; width:100%;">ФИО</th><th style="padding:12px; white-space:nowrap;">КАТЕГОРИЯ</th></tr></thead><tbody>`;
            if (board.length === 0) html += `<tr><td colspan="4" style="text-align:center; padding:40px; color:var(--text-muted);">Старт-лист пуст</td></tr>`;
            else {
                if (isAbs) {
                    board.forEach(r => html += this.renderStartRow(r));
                } else {
                    let groups = [...new Set(board.map(r => r.group || r.category || "Без группы"))].sort((a, b) => b.localeCompare(a));
                    groups.forEach(grp => {
                        html += `<tr class="live-group-header"><td colspan="4" style="padding:10px 8px; background:var(--bg-surface-hover); color:var(--primary); font-weight:bold; border:1px solid var(--border); font-family:'Unbounded'; text-transform:uppercase; font-size:11px;">ГРУППА: ${grp}${getSpeedRangeHtml(grp)}</td></tr>`;
                        let grpItems = board.filter(r => (r.group || r.category || "Без группы") === grp);
                        grpItems.forEach(r => html += this.renderStartRow(r));
                    });
                }
            }
        }
        
        html += `</tbody></table></div>`;
        container.innerHTML = html;
    }
	
    async exportToExcel() {
        const table = document.getElementById('mainLiveTable');
        if (!table) return alert("❌ Таблица протокола не найдена!");

        let csvContent = "\uFEFF"; // BOM для идеальной кириллицы в Excel
        const rows = table.querySelectorAll('tr');

        rows.forEach(row => {
            let rowData = [];
            const cols = row.querySelectorAll('th, td');
            
            cols.forEach(col => {
                // 1. Берем видимый текст прямо с экрана (innerText автоматически игнорирует скрытые CSS элементы)
                let rawText = col.innerText || "";
                
                // 2. Разбиваем текст на строки (учитывая визуальные переносы в ячейке) и чистим пробелы
                let lines = rawText.split('\n').map(line => line.trim()).filter(line => line !== '');
                
                // 3. Убиваем полные дубликаты строк (спасает, если имя команды дублируется в верстке)
                let uniqueLines = [...new Set(lines)];
                
                // 4. Склеиваем обратно красивым разделителем
                let text = uniqueLines.join(' | ');
                
                // 5. Экранируем кавычки для CSV
                text = text.replace(/"/g, '""');
                rowData.push(`"${text}"`);
            });
            
            csvContent += rowData.join(';') + "\r\n";
        });

        // Берем имя гонки из контекста страницы
        const raceName = this.openedRaceName ? this.openedRaceName.replace(/[^a-zа-яё0-9]/gi, '_') : 'protocol';
        const fileName = `results_${raceName}.csv`;

        // Формируем и мгновенно скачиваем файл
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
        this.openedEventType = "";
        this.raceRosterList = [];

        // 🔥 ДОБАВЛЯЕМ КЭШ ДЛЯ ПОРЯДКА КАТЕГОРИЙ
        this.localCategoryOrder = {}; 

        // 🔥 ВОТ ОНО! Инициализируем наш новый независимый сервис трансляций:
        this.liveService = new LiveBoardService(this); 
    }

 // =========================================================
    // 🔥 МЕТОДЫ УПРАВЛЕНИЯ ПОРЯДКОМ КАТЕГОРИЙ
    // =========================================================
    async updateGroupOrder(raceId, catsJson, newIndex) {
        let catsArray = [];
        // Используем стандартный JSON.parse (без decodeURIComponent)
        try { catsArray = JSON.parse(catsJson); } catch(e) { return; }
        
        const idx = parseInt(newIndex);
        
        catsArray.forEach(catName => {
            if (isNaN(idx)) {
                delete this.localCategoryOrder[catName];
            } else {
                this.localCategoryOrder[catName] = idx;
            }
        });

        await this.saveCategoryOrderToDb(raceId);
    }

    async unmergeCategories(raceId, catsJson) {
        if (!confirm("Разделить эту объединенную группу обратно на исходные категории?")) return;

        let catsArray = [];
        try { catsArray = JSON.parse(catsJson); } catch(e) { return; }
        
        catsArray.forEach(catName => {
            delete this.localCategoryOrder[catName];
        });

        await this.saveCategoryOrderToDb(raceId);
    }

    async saveCategoryOrderToDb(raceId) {
        try {
            await pb.collection('races').update(raceId, { category_order: this.localCategoryOrder }, { requestKey: 'cat_order_update' });
            if (typeof this.renderFilteredRaceRosterTable === 'function') this.renderFilteredRaceRosterTable();
        } catch(e) {}
    }

    // 🔥 УМНАЯ СОРТИРОВКА СИЛЫ КАТЕГОРИИ
    getCatRank(cat) {
        if (!cat) return 9999;
        let rank = 0; let c = cat.toString().toUpperCase();
        
        // Чем меньше число, тем слабее гонщик (стартует раньше)
        if (c.includes('V')) rank += 100; else if (c.includes('U')) rank += 200; else if (c.includes('O')) rank += 300;
        else if (c.includes('E')) rank += 400; else if (c.includes('D')) rank += 500; else if (c.includes('C')) rank += 600;
        else if (c.includes('B')) rank += 700; else if (c.includes('A+')) rank += 900; else if (c.includes('A')) rank += 800;
        else rank += 1000;

        if (c.includes('F') || c.includes('Ж') || c.includes('W')) rank += 10; else rank += 20;

        const matchU = c.match(/U(\d+)/);
        if (matchU) rank += parseInt(matchU[1]); 
        else {
            const matchAge = c.match(/\d/);
            if (matchAge) rank += (9 - parseInt(matchAge[0])); else rank += 5;
        }
        return rank;
    }
	
	
	
	// ==========================================
    // 🔥 СЛОВАРИ ПОКРЫТИЙ И ФОРМАТОВ ГОНОК
    // ==========================================
    
    // 1. ТИП ПОКРЫТИЯ (Где проходит гонка)
    get RACE_SURFACES() {
        return {
            'road': 'ШОССЕ',
            'offroad': 'ГРУНТ',
            'track': 'ТРЕК',
            'indoor': 'ИНДОР'
        };
    }

    // 2. ФОРМАТ ГОНКИ (Как определяем победителя)
    get RACE_FORMATS() {
        return {
            'mass': 'ГРУППА',
            'itt': 'РАЗДЕЛКА',
            'ttt': 'КОМАНДА',
            'crit': 'ПО ОЧКАМ',
            'relay': 'ЭСТАФЕТА'
        };
    }
		
		// ==========================================
    // 🔥 ДЕФОЛТНЫЕ ПРАВИЛА РЕЙТИНГА И КЛАСТЕРОВ 
    // ==========================================
    get DEFAULT_RATING_RULES() {
        return {
            speed_thresholds: {
                road: { M: { "A+": 40.0, "A": 37.0, "B": 34.0, "C": 30.0, "D": 26.0 }, F: { "A+": 36.0, "A": 33.0, "B": 30.0, "C": 26.0, "D": 22.0 } },
                offroad: { M: { "A+": 25.0, "A": 22.0, "B": 19.0, "C": 16.0, "D": 13.0 }, F: { "A+": 22.0, "A": 19.0, "B": 16.0, "C": 13.0, "D": 10.0 } },
                track: { M: { "A+": 48.0, "A": 45.0, "B": 42.0, "C": 38.0, "D": 34.0 }, F: { "A+": 43.0, "A": 40.0, "B": 37.0, "C": 34.0, "D": 30.0 } },
                indoor: { M: { "A+": 42.0, "A": 39.0, "B": 36.0, "C": 32.0, "D": 28.0 }, F: { "A+": 38.0, "A": 35.0, "B": 32.0, "C": 28.0, "D": 24.0 } }
            },
            mass_start_banks: { "A+": 1000, "A": 800, "B": 600, "C": 400, "D": 200, "O": 200, "V": 400 }
        };
    }

        // 🔥 ГЕНЕРАТОР ИНТЕРФЕЙСА ПРАВИЛ РЕЙТИНГА
        initTaxonomyUI() {
            // Защита от дублирования при повторном открытии
            if (document.getElementById('evRatingRule')) return; 
            
            // Находим элемент логики категорий (он находится на вкладке 3. ПРАВИЛА)
            const catLogicEl = document.getElementById('evCatLogic');
            if (!catLogicEl) return;

            const wrapper = document.createElement('div');
			wrapper.id = 'ratingRuleWrapper';
            wrapper.style.marginBottom = '25px';
            wrapper.innerHTML = `
                <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; margin-bottom:5px; font-weight:bold;">Начисление очков рейтинга</div>
                <select id="evRatingRule" class="auth-input" style="width: 100%; margin-bottom: 8px; background: rgba(255, 193, 7, 0.05); color: var(--primary); border: 1px dashed var(--primary); border-radius: 8px; padding: 14px; font-family: 'Manrope', sans-serif; font-weight: bold; outline: none; transition: 0.2s;">
                    <option value="" selected>🌟 По умолчанию (Базовые)</option>
                </select>
                <div id="evRatingRuleDesc" style="font-size: 10px; color: var(--text-muted); font-family: 'Manrope', sans-serif; padding: 0 5px;">Будут использованы базовые (универсальные) правила начисления очков.</div>
            `;
            
            // Вставляем наш блок прямо ПЕРЕД заголовком "Принцип деления на категории"
            const labelEl = catLogicEl.previousElementSibling;
            catLogicEl.parentElement.insertBefore(wrapper, labelEl);

            // Динамическая смена описания при выборе правила
            document.getElementById('evRatingRule').addEventListener('change', (e) => {
                const opt = e.target.options[e.target.selectedIndex];
                const desc = opt.getAttribute('data-desc') || 'Будут использованы базовые (универсальные) правила начисления очков.';
                document.getElementById('evRatingRuleDesc').innerText = desc;
            });
        }
		
        // ==========================================
        // 🔥 УПРАВЛЕНИЕ МУЛЬТИ-ДИСТАНЦИЯМИ (В ОДНОЙ ГОНКЕ)
        // ==========================================
        initDistancesUI() {
        const container = document.getElementById('dynamicDistancesContainer');
        if (!container) return;
        
        const oldInputWrap = document.getElementById('evDist')?.parentElement;
        const oldLapsWrap = document.getElementById('evLaps')?.parentElement;
        
        if (oldInputWrap) oldInputWrap.style.display = 'none';
        if (oldLapsWrap) oldLapsWrap.style.display = 'none';

        this.activeDistances = []; 

        const evCatLogic = document.getElementById('evCatLogic');
        if (evCatLogic) {
            evCatLogic.style.display = 'none';
            if (evCatLogic.previousElementSibling) evCatLogic.previousElementSibling.style.display = 'none';
        }

        container.innerHTML = `
            <div style="margin-bottom: 15px; background: rgba(255,193,7,0.05); padding: 15px; border-radius: 8px; border: 1px dashed var(--primary);">
                <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; margin-bottom:5px; font-weight:bold;">Длина одного круга (км) *</div>
                <input type="number" id="evLapLength" class="auth-input" style="width:100%; border-radius:8px; border: 1px solid var(--border); background: var(--bg-body); color: var(--text-main); padding: 10px 14px; outline:none;" placeholder="Можно 0, если не важно" step="0.01" min="0">
            </div>

            <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; margin-bottom:5px; font-weight:bold;">Доступные дистанции / Заезды *</div>
            <div id="distancesTagsList" style="display:flex; flex-direction:column; gap:8px; margin-bottom:10px;"></div>
            
            <div style="display:flex; flex-wrap:wrap; gap:10px; align-items: flex-end; background: var(--bg-surface-hover); padding: 15px; border-radius: 8px; border: 1px solid var(--border);">
                <div style="flex: 2; min-width: 150px;">
                    <div style="font-size:9px; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase;">Название (напр. PRO)</div>
                    <input type="text" id="newDistNameInput" class="auth-input" style="width:100%; margin:0; border-radius:8px; padding: 10px; font-size:12px; outline:none;" placeholder="Напр. Лайт">
                </div>
                <div style="flex: 1; min-width: 80px;">
                    <div style="font-size:9px; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase;">Кругов</div>
                    <input type="number" id="newDistLapsInput" class="auth-input" style="width:100%; margin:0; border-radius:8px; padding: 10px; font-size:12px; outline:none;" placeholder="1" step="1" min="1">
                </div>
				<div style="flex: 1; min-width: 100px;">
                    <div style="font-size:9px; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase;">В экипаже</div>
                    <input type="number" id="newDistSquadInput" class="auth-input" style="width:100%; margin:0; border-radius:8px; padding: 10px; font-size:12px; outline:none;" placeholder="1" value="1" step="1" min="1" title="Количество человек в экипаже (1 = соло)">
                </div>

                <div style="flex: 2; min-width: 150px;">
                    <div style="font-size:9px; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase;">Деление на группы</div>
                    <select id="newDistCatLogicInput" class="auth-input" style="width:100%; margin:0; border-radius:8px; padding: 10px; font-size:12px; outline:none;">
                        <option value="clusters" selected>🚴 Кластеры (A+, A, B...)</option>
                        <option value="age">🎂 Возрастные (18-22...)</option>
                        <option value="mixed">🧬 Смешанные (AM, CF4...)</option>
                        <option value="absolute">🏆 Абсолют (без групп)</option>
                    </select>
                </div>

                <div style="flex: 3; min-width: 200px;">
                    <div style="font-size:9px; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase;">Правило рейтинга</div>
                    <select id="newDistRuleInput" class="auth-input" style="width:100%; margin:0; border-radius:8px; padding: 10px; font-size:12px; outline:none;">
                        <option value="">🌟 По умолчанию (Как у события)</option>
                    </select>
                </div>
                
                <button type="button" class="btn-black" onclick="window.app.crm.addDistanceObjTag(event)" style="padding:10px 15px; border-radius:8px; font-size:11px; height: 38px; flex-shrink: 0; width: 100%; background:var(--primary); color:#000; font-weight:bold; cursor:pointer; transition:0.2s;">+ ДОБАВИТЬ ДИСТАНЦИЮ</button>
            </div>
        `;
    }
	
        addDistanceObjTag(event) {
        if (event) event.preventDefault(); 

        const nameInput = document.getElementById('newDistNameInput');
        const lapsInput = document.getElementById('newDistLapsInput');
        const ruleInput = document.getElementById('newDistRuleInput');
        const catLogicInput = document.getElementById('newDistCatLogicInput');
        const squadInput = document.getElementById('newDistSquadInput');
        
        const name = nameInput.value.trim();
        const laps = parseInt(lapsInput.value);
        const ruleId = ruleInput.value;
        const catLogic = catLogicInput ? catLogicInput.value : 'clusters';
        const squadMax = squadInput && squadInput.value ? parseInt(squadInput.value) : 1;
        
        if (!name || !laps || laps < 1) return alert("Введите название и количество кругов!");
        
        let ruleName = "По умолчанию";
        if (ruleId && ruleInput.options[ruleInput.selectedIndex]) {
            ruleName = ruleInput.options[ruleInput.selectedIndex].text.replace(/\[.*?\] /, '');
        }
        
        let catName = "Кластеры";
        if (catLogicInput && catLogicInput.options[catLogicInput.selectedIndex]) {
            catName = catLogicInput.options[catLogicInput.selectedIndex].text.split(' ')[1]; 
        }
        
        const distId = 'd_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        
        this.activeDistances.push({ 
            id: distId, 
            name: name, 
            laps: laps, 
            rule_id: ruleId, 
            rule_name: ruleName,
            cat_logic: catLogic,
            cat_name: catName,
			squad_max: squadMax
        });
        
        nameInput.value = '';
        lapsInput.value = '';
        ruleInput.value = ''; 
        if (catLogicInput) catLogicInput.value = 'clusters';
        
        this.renderDistanceObjTags();
    }

        removeDistanceObjTag(distId) {
        this.activeDistances = this.activeDistances.filter(d => d.id !== distId);
        this.renderDistanceObjTags();
    }

    renderDistanceObjTags() {
        const list = document.getElementById('distancesTagsList');
        if (!list) return;
        const lapLength = parseFloat(document.getElementById('evLapLength').value) || 0;
        
        list.innerHTML = this.activeDistances.map(d => {
            const totalKm = lapLength > 0 ? (lapLength * d.laps).toFixed(2) + ' км' : `${d.laps} кр.`;
            const ruleBadge = d.rule_id 
                ? `<span style="background:rgba(0,0,0,0.2); padding:2px 6px; border-radius:4px; font-size:9px;">⚖️ ${this.app.escapeHTML(d.rule_name)}</span>` 
                : `<span style="background:rgba(0,0,0,0.1); padding:2px 6px; border-radius:4px; font-size:9px; opacity:0.7;">⚖️ Баз. правило</span>`;
            
            const catBadge = d.cat_name 
                ? `<span style="background:rgba(255,255,255,0.2); padding:2px 6px; border-radius:4px; font-size:9px; margin-left:4px;">👥 ${this.app.escapeHTML(d.cat_name)}</span>`
                : '';

            return `
            <div style="background:var(--primary); color:#000; padding:10px 12px; border-radius:8px; font-size:12px; font-weight:bold; display:flex; justify-content:space-between; align-items:center; gap:10px; width: 100%; margin-bottom: 8px;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="font-family:'Unbounded';">${this.app.escapeHTML(d.name)}</span> 
                    <span style="font-family:'Roboto Mono';">(${totalKm})</span>
                    ${catBadge}
                    ${ruleBadge}
                </div>
                <span style="cursor:pointer; background:rgba(0,0,0,0.1); width:24px; height:24px; border-radius:50%; display:flex; justify-content:center; align-items:center; transition:0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.3)'" onmouseout="this.style.background='rgba(0,0,0,0.1)'" onclick="window.app.crm.removeDistanceObjTag('${d.id}')">✕</span>
            </div>
            `;
        }).join('');
    }
	
		async loadCups(pelotonId, preselectedCupId = null) {
        const cupSelectEl = document.getElementById('evCup');
        if (!cupSelectEl) return;
        
        if (!pelotonId) {
            cupSelectEl.innerHTML = '<option value="">-- Вне кубка --</option>';
            cupSelectEl.disabled = true;
            return;
        }
        
        cupSelectEl.disabled = true;
        cupSelectEl.innerHTML = '<option value="">Загрузка кубков...</option>';
        
        try {
            const cups = await pb.collection('cups').getFullList({
                filter: `peloton_id = "${pelotonId}"`,
                sort: '-created',
                requestKey: null
            });
            
            let opts = '<option value="">-- Одиночная гонка (Без кубка) --</option>';
            cups.forEach(c => {
                const isSelected = (preselectedCupId === c.id) ? 'selected' : '';
                opts += `<option value="${c.id}" ${isSelected}>${c.name}</option>`;
            });
            
            cupSelectEl.innerHTML = opts;
            cupSelectEl.disabled = false;
        } catch (e) {
            console.error("Ошибка загрузки кубков:", e);
            cupSelectEl.innerHTML = '<option value="">Ошибка загрузки</option>';
        }
    }

        // 🔥 УНИВЕРСАЛЬНЫЙ СПИСОК ФОРМАТОВ (Больше не зависит от покрытия)
        updateDisciplineList(selectedFormat = '') {
            // В твоем коде select может называться evDiscipline или evFormat, страхуемся:
            const discSelect = document.getElementById('evDiscipline') || document.getElementById('evFormat');
            if (!discSelect) return;
            
            discSelect.innerHTML = '<option value="" disabled selected>Формат...</option>';
            
            for (const [key, name] of Object.entries(this.RACE_FORMATS)) {
                const sel = key === selectedFormat ? 'selected' : '';
                discSelect.innerHTML += `<option value="${key}" ${sel}>${name}</option>`;
            }
        }
	
		// 🔥 ЗАГРУЗЧИК ПРАВИЛ ИЗ БАЗЫ В ВЫПАДАЮЩИЙ СПИСОК
        async loadRatingRulesUI(selectedRuleId = '') {
            const ruleSelect = document.getElementById('evRatingRule');
            const descDiv = document.getElementById('evRatingRuleDesc');
            if (!ruleSelect) return;

            try {
                // Вытягиваем все правила. Сортируем сначала по типу, потом по названию
                const rules = await pb.collection('rating_rules').getFullList({ sort: 'type,name', requestKey: null });
                
                let html = '<option value="">🌟 Правила рейтинга: По умолчанию (Базовые)</option>';
                
                rules.forEach(r => {
                    const sel = r.id === selectedRuleId ? 'selected' : '';
                    const typeName = r.type === 'ind' ? 'Разделка' : 'Масс-старт';
                    const surfaceName = this.RACE_SURFACES[r.surface] || r.surface;
                    
                    html += `<option value="${r.id}" data-desc="${this.app.escapeHTML(r.description || '')}" ${sel}>[${surfaceName} | ${typeName}] ${this.app.escapeHTML(r.name)}</option>`;
                });
                
                ruleSelect.innerHTML = html;

                // Обновляем описание, если правило было предвыбрано (при редактировании гонки)
                if (selectedRuleId) {
                    const opt = ruleSelect.querySelector(`option[value="${selectedRuleId}"]`);
                    if (opt) descDiv.innerText = opt.getAttribute('data-desc') || 'Описание отсутствует';
                } else {
                    descDiv.innerText = 'Будут использованы базовые (универсальные) правила начисления очков.';
                }
                
                // 🔥 НОВОЕ: Дублируем загруженные опции в селект дистанций
                const distRuleSelect = document.getElementById('newDistRuleInput');
                if (distRuleSelect) {
                    distRuleSelect.innerHTML = html.replace('selected', ''); // Копируем HTML опций, снимая выделение
                }
                
            } catch (e) {
                console.error('Ошибка загрузки правил рейтинга', e);
            }
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
            list = list.filter(p => ((p.name || '').toLowerCase().includes(q)) || ((p.surname || '').toLowerCase().includes(q)) || ((p.team || '').toLowerCase().includes(q))); 
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
	setSurfaceFilter(type) { this.surfaceFilter = type; this.formatFilter = 'all'; this.renderUI(); }
    setFormatFilter(type) { this.formatFilter = type; this.renderUI(); }
    setTeamGenderFilter(gender) { this.teamGenderFilter = gender; this.renderUI(); }
    setTeamSearch(query) { this.teamSearchQuery = query.toLowerCase(); }
	setRosterSearch(query) { this.rosterSearchQuery = query; }
	setArchiveYear(year) { this.archiveYear = parseInt(year); this.renderUI(); }
	setRosterTeamFilter(mode) {
        this.rosterTeamFilter = mode;
        const btnAll = document.getElementById('btn-roster-all');
        const btnMyTeam = document.getElementById('btn-roster-myteam');
        
        if (btnAll && btnMyTeam) {
            const activeBg = 'var(--text-main)', activeColor = 'var(--bg-body)';
            const inactiveBg = 'transparent', inactiveColor = 'var(--text-muted)';
            
            btnAll.style.background = mode === 'all' ? activeBg : inactiveBg;
            btnAll.style.color = mode === 'all' ? activeColor : inactiveColor;
            
            btnMyTeam.style.background = mode === 'myteam' ? activeBg : inactiveBg;
            btnMyTeam.style.color = mode === 'myteam' ? activeColor : inactiveColor;
        }
        
        if (typeof this.renderFilteredRaceRosterTable === 'function') {
            this.renderFilteredRaceRosterTable();
        }
    }
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
        
        // 🔥 ДИНАМИЧЕСКОЕ ИМЯ КОМАНДЫ ДЛЯ ЗАГОЛОВКА (Поддержка мульти-клубов)
        let dynamicTeamName = 'Моя команда';
        if (view === 'team') {
            let tId = this.viewedTeamId;
            if (!tId && this.app.currentRider?.team_id) {
                const myTeams = Array.isArray(this.app.currentRider.team_id) ? this.app.currentRider.team_id : [this.app.currentRider.team_id];
                tId = myTeams.find(id => this.app.teamsMap[id]?.peloton_id === this.app.currentPelotonFilter) || myTeams[0];
            }
            if (tId && this.app.teamsMap[tId]) {
                dynamicTeamName = this.app.teamsMap[tId].name;
            }
        }

        const headerData = {
            'calendar': { icon: '📅', title: 'Календарь', sub: 'Гонки и тренировки' },
            'team': { icon: '👥', title: dynamicTeamName, sub: 'Управление составом' }, // 👈 Теперь тут будет реальное имя!
            'market': { icon: '🔄', title: 'Трансферы', sub: 'Свободные агенты' },
            'rating': { icon: '🏆', title: 'Рейтинг', sub: 'Командный зачет' },
            'rules': { icon: '⚙️', title: 'Библиотека правил', sub: 'Настройка начисления очков' }
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
                let records = await pb.collection('races').getFullList({ sort: 'date', expand: 'race_type_id, creator_id, team_id, cup_id, peloton_id, judge_id', requestKey: null });
                let allRosters = [];
                try { allRosters = await pb.collection('race_rosters').getFullList({ fields: 'race_id,rider_id,status', requestKey: null }); } catch(e) {}
                
                // 🔥 ПРАВИЛЬНЫЙ ПОИСК СУДЕЙ (КАК У ОРГАНИЗАТОРОВ)
                let judgeQueryIds = [];
                let judgeQueryEmails = [];
                
                records.forEach(r => {
                    let jObj = r.expand?.judge_id;
                    if (Array.isArray(jObj)) jObj = jObj[0];
                    if (jObj) {
                        judgeQueryIds.push(jObj.id);
                        if (jObj.email) judgeQueryEmails.push(jObj.email);
                    }
                });
                
                judgeQueryIds = [...new Set(judgeQueryIds)];
                judgeQueryEmails = [...new Set(judgeQueryEmails)];

                let judgesRiders = [];
                if (judgeQueryIds.length > 0 || judgeQueryEmails.length > 0) {
                    try {
                        let filters = [];
                        if (judgeQueryIds.length > 0) filters.push( ...judgeQueryIds.map(id => `user_id="${id}"`) );
                        if (judgeQueryEmails.length > 0) filters.push( ...judgeQueryEmails.map(email => `email="${email}"`) );
                        
                        const jFilters = filters.join(' || ');
                        judgesRiders = await pb.collection('riders').getFullList({ filter: jFilters, requestKey: null });
                    } catch(e) { console.warn("Не удалось подгрузить профили судей", e); }
                }

                const myId = this.app.currentRider?.id;
                const roles = this.app.usersMap[this.app.currentRider?.email] || [];
                const isSuper = JSON.stringify(roles).includes('superadmin');
                const myTeams = Array.isArray(this.app.currentRider?.team_id) ? this.app.currentRider.team_id : (this.app.currentRider?.team_id ? [this.app.currentRider.team_id] : []);

                // 🛡️ ПЕРВИЧНЫЙ ФИЛЬТР
                records = records.filter(r => {
                    if (isSuper) return true; 
                    const amIRegistered = allRosters.some(roster => roster.race_id === r.id && roster.rider_id === myId && roster.status !== 'canceled');
                    if (amIRegistered) return true; 
                    
                    if (r.level === 'team') {
                        if (r.is_public) return true;
                        return myTeams.includes(r.team_id);
                    }
                    if (r.level === 'personal') return r.creator_id === myId;
                    
                    if (r.level === 'peloton') {
                        let pId = r.peloton_id; 
                        if (Array.isArray(pId)) pId = pId[0]; 
                        if (pId && !this.app.pelotonsMap[pId]) return false; 
                    }
                    return true;
                });

                // 🗂️ ВТОРИЧНЫЙ ФИЛЬТР
                if (currentFilterId !== 'all') {
                    records = records.filter(r => {
                        let pId = r.peloton_id; 
                        if (!pId) return false; 
                        if (Array.isArray(pId)) return pId.includes(currentFilterId); 
                        return pId === currentFilterId;
                    });
                } else {
                    records = records.filter(r => {
                        if (r.level === 'peloton') {
                            let pId = r.peloton_id; 
                            if (Array.isArray(pId)) pId = pId[0];
                            const peloton = pId ? this.app.pelotonsMap[pId] : null;
                            
                            if (peloton && peloton.is_private === true) {
                                if (isSuper) return true; 
                                const amIRegistered = allRosters.some(roster => roster.race_id === r.id && roster.rider_id === myId && roster.status !== 'canceled');
                                if (!amIRegistered) return false; 
                            }
                        }
                        return true;
                    });
                }

                const rosterCounts = {};
                allRosters.forEach(r => { if (r.status !== 'canceled') rosterCounts[r.race_id] = (rosterCounts[r.race_id] || 0) + 1; });

                this.dataCalendar = records.map(r => {
                    let typeName = r.expand?.race_type_id?.name || 'ЗАЕЗД';
                    if (r.format && this.RACE_FORMATS[r.format]) {typeName = this.RACE_FORMATS[r.format];}
                    if (r.surface && this.RACE_SURFACES[r.surface]) {typeName = `${this.RACE_SURFACES[r.surface]} • ${typeName}`;}

                    let badgeBg = "var(--warning)"; 
                    let badgeColor = "#000";
                    let badgeText = typeName.toUpperCase();

                    if (r.level === 'peloton') {
                        badgeBg = "var(--primary)"; 
                        badgeColor = "#000";
                    } else if (r.level === 'team') {
                        badgeBg = "var(--info)"; 
                        badgeColor = "#fff";
                    }
                    
                    let orgName = 'Организатор';
                    if (r.level === 'peloton' && r.expand?.peloton_id) {
                        orgName = r.expand.peloton_id.name; 
                    } else if (r.expand?.creator_id) {
                        const creator = r.expand.creator_id;
                        if (creator.name) {
                            orgName = creator.name;
                        } else if (creator.first_name || creator.last_name) {
                            orgName = `${creator.first_name || ''} ${creator.last_name || ''}`.trim();
                        }
                    }
                    
                    // 🔥 НАЗНАЧЕНИЕ ИМЕНИ СУДЬИ
                    let finalJudgeName = 'Не назначен';
                    let finalJudgeRiderId = null;
                    
                    let jObj = r.expand?.judge_id;
                    if (Array.isArray(jObj)) jObj = jObj[0]; // На случай, если relation - массив

                    if (jObj) {
                        // 1. Сначала берем Имя из таблицы users (ровно как у организатора!)
                        finalJudgeName = jObj.name || jObj.username || jObj.email || 'Судья';

                        // 2. Теперь пытаемся найти карточку ГОНЩИКА, чтобы сделать чат кликабельным
                        const jRider = judgesRiders.find(jr => jr.user_id === jObj.id || jr.email === jObj.email);
                        
                        if (jRider) {
                            // Карточка найдена — перезаписываем на красивые Имя и Фамилию и даем ID для ссылки
                            finalJudgeName = `${jRider.first_name} ${jRider.last_name}`;
                            finalJudgeRiderId = jRider.id; 
                        }
                    }

                    return { 
                        id: r.id, name: r.name, rawDate: r.date, 
                        date: new Date(r.date).toLocaleString('ru-RU', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}), 
                        level: r.level || 'personal', is_public: r.is_public || false, 
                        distance: r.distance || 0, type: typeName, status: r.status, 
                        org: orgName, creator_id: r.creator_id,  
                        judge_id: r.judge_id,
                        judgeName: finalJudgeName,       // 👈 Передаем имя
                        judgeRiderId: finalJudgeRiderId, // 👈 Передаем ID для чата (если есть)
                        expand: r.expand, rosterCount: rosterCounts[r.id] || 0,
                        isRegistered: allRosters.some(roster => roster.race_id === r.id && roster.rider_id === myId && roster.status !== 'canceled'),
                        myRosterStatus: allRosters.find(roster => roster.race_id === r.id && roster.rider_id === myId)?.status || null,
                        surface: r.surface,
                        format: r.format,
                        cat_logic: r.cat_logic,
                        max_riders: r.max_riders || 0,
						category_order: r.category_order,
                        cupId: Array.isArray(r.cup_id) ? r.cup_id[0] : r.cup_id,
                        cupName: r.expand?.cup_id ? (Array.isArray(r.expand.cup_id) ? r.expand.cup_id[0].name : r.expand.cup_id.name) : null,
                        badgeBg: badgeBg,
                        badgeColor: badgeColor,
                        badgeText: badgeText
                    };
                });
            } 
            else if (this.currentView === 'team') {
                let targetTeamId = this.viewedTeamId;
                // 🔥 ЗАЩИТА: Добавлен `?` после this.app.currentRider
                if (!targetTeamId && this.app.currentRider?.team_id) {
                    const myTeams = Array.isArray(this.app.currentRider.team_id) ? this.app.currentRider.team_id : [this.app.currentRider.team_id];
                    targetTeamId = myTeams.find(id => this.app.teamsMap[id]?.peloton_id === currentFilterId) || myTeams[0];
                }

                if (targetTeamId) {
                    const records = await pb.collection('riders').getFullList({ filter: `team_id ~ "${targetTeamId}"`, sort: '-rating', requestKey: null }); 
                    let m = [], f = [];
                    records.forEach(r => { 
                        const gStr = String(r.gender || 'M').toUpperCase().trim(); 
const p = { id: r.id, name: r.first_name, surname: r.last_name, year: r.yob, gender: gStr, group: r.base_cluster || 'B', points: r.rating || 0, team: this.getRiderTeamNames(r) }; 
                        if (gStr === 'F' || gStr === 'Ж') f.push(p); else m.push(p); 
                    }); 
                    this.dataTeam = { m, f };
                } else { this.dataTeam = { m: [], f: [] }; }
            }
            else if (this.currentView === 'market') { 
                const oneTeam = Object.values(this.app.teamsMap).find(t => t.name && t.name.toUpperCase().includes('ONE TEAM'));
                const oneTeamId = oneTeam ? oneTeam.id : null;
                if (oneTeamId) {
                    const records = await pb.collection('riders').getFullList({ filter: `team_id ~ "${oneTeamId}"`, sort: '-rating', requestKey: null }); 
                    let m = [], f = [];
                    records.forEach(r => { 
                        const gStr = String(r.gender || 'M').toUpperCase().trim(); 
                        const p = { id: r.id, name: r.first_name, surname: r.last_name, year: r.yob, gender: gStr, group: r.base_cluster || 'B', points: r.rating || 0, team: this.getRiderTeamNames(r) };
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
            else if (this.currentView === 'rules') {
                const rulesList = await pb.collection('rating_rules').getFullList({ sort: 'type,name', requestKey: null });
                this.dataRules = rulesList;
            }
            this.renderUI();
        } catch(e) { 
            // 🔥 ВЫВОДИМ ОШИБКУ В КОНСОЛЬ ДЛЯ ДЕБАГА
            console.error("🔥 ОШИБКА СЕТИ В loadData:", e);
            contentArea.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--danger); font-family:'Unbounded';">ОШИБКА СЕТИ<div style="font-size:10px; font-family:'Manrope'; color:var(--text-muted); margin-top:10px;">${e.message || ''}</div></div>`; 
        }
    }
    renderUI() {
        const contentArea = document.getElementById('crmContentArea');
        let html = '';

        if (this.currentView === 'calendar') {
            const roles = this.app.usersMap[this.app.currentRider?.email] || [];
            const rStr = JSON.stringify(roles);
            const isAdmin = rStr.includes('admin') || rStr.includes('superadmin');
            const isCaptain = rStr.includes('captain');

            this.calendarFilter = this.calendarFilter && this.calendarFilter !== 'all' ? this.calendarFilter : 'races';

            let subMenuHtml = `<div style="display:flex; gap:8px; margin-bottom: 20px; overflow-x:auto; scrollbar-width:none; padding-bottom:4px; -webkit-overflow-scrolling:touch;">`;
            if (isAdmin || isCaptain) {
                subMenuHtml += `<button style="background:var(--primary); color:#000; border:none; padding:8px 16px; border-radius:50px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; flex-shrink:0; transition:0.2s; box-shadow: 0 4px 10px rgba(255,193,7,0.3);" onclick="window.app.crm.openCreateEventModal()">+ СОЗДАТЬ</button>`;
                subMenuHtml += `<div style="width:1px; background:var(--border); margin:0 4px; flex-shrink:0;"></div>`;
            }

            const filters = [
                { id: 'fav', name: '⭐ МОИ' },
                { id: 'races', name: 'ГОНКИ' },
                { id: 'team', name: 'КОМАНДНЫЕ' },
                { id: 'archive', name: 'РЕЗУЛЬТАТЫ' }
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

            let baseEvents = this.dataCalendar.filter(r => {
                const isFinished = r.status === 'Finished';
                
                if (this.calendarFilter === 'archive') {
                    if (!isFinished) return false;
                    return new Date(r.rawDate || r.date).getFullYear() === this.archiveYear;
                }
                if (isFinished) return false;
                if (this.calendarFilter === 'races') return r.level === 'peloton';
                if (this.calendarFilter === 'team') return r.level === 'team';
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

            // 💡 ЭТАП 2: УМНЫЕ КНОПКИ ПОКРЫТИЙ И ФОРМАТОВ
            const availableSurfaceIds = [...new Set(baseEvents.map(ev => ev.surface).filter(Boolean))];
            const availableFormatIds = [...new Set(baseEvents.map(ev => ev.format).filter(Boolean))];

            this.surfaceFilter = this.surfaceFilter || 'all';
            this.formatFilter = this.formatFilter || 'all';
            
            if (this.surfaceFilter !== 'all' && !availableSurfaceIds.includes(this.surfaceFilter)) this.surfaceFilter = 'all';
            if (this.formatFilter !== 'all' && !availableFormatIds.includes(this.formatFilter)) this.formatFilter = 'all';

            if (availableSurfaceIds.length > 0 || availableFormatIds.length > 0) {
                let filtersHtml = `<div style="display:flex; gap:8px; margin-bottom: 20px; overflow-x:auto; scrollbar-width:none; padding-bottom:4px; -webkit-overflow-scrolling:touch; align-items:center;">`;
                
                if (availableSurfaceIds.length > 0) {
                    const allSurfActive = this.surfaceFilter === 'all';
                    filtersHtml += `<button style="background:${allSurfActive ? 'rgba(255, 193, 7, 0.15)' : 'transparent'}; color:${allSurfActive ? 'var(--primary)' : 'var(--text-muted)'}; border:1px solid ${allSurfActive ? 'var(--primary)' : 'var(--border)'}; padding:6px 12px; border-radius:8px; font-family:'Unbounded'; font-weight:800; font-size:9px; cursor:pointer; flex-shrink:0; transition:0.2s;" onclick="window.app.crm.setSurfaceFilter('all')">ВСЕ ПОКРЫТИЯ</button>`;
                    
                    availableSurfaceIds.forEach(sId => {
                        const isActive = this.surfaceFilter === sId;
                        const bg = isActive ? 'rgba(255, 193, 7, 0.15)' : 'transparent';
                        const color = isActive ? 'var(--primary)' : 'var(--text-muted)';
                        const border = isActive ? 'var(--primary)' : 'var(--border)';
                        const sName = this.RACE_SURFACES[sId] || sId.toUpperCase(); 
                        
                        filtersHtml += `<button style="background:${bg}; color:${color}; border:1px solid ${border}; padding:6px 12px; border-radius:8px; font-family:'Unbounded'; font-weight:800; font-size:9px; cursor:pointer; flex-shrink:0; transition:0.2s;" onclick="window.app.crm.setSurfaceFilter('${sId}')">${sName}</button>`;
                    });
                }

                if (availableSurfaceIds.length > 0 && availableFormatIds.length > 0) {
                    filtersHtml += `<div style="width:1px; height:16px; background:var(--border); margin:0 4px; flex-shrink:0;"></div>`;
                }

                if (availableFormatIds.length > 0) {
                    availableFormatIds.forEach(fId => {
                        const isActive = this.formatFilter === fId;
                        const bg = isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent';
                        const color = isActive ? 'var(--info)' : 'var(--text-muted)';
                        const border = isActive ? 'var(--info)' : 'var(--border)';
                        const fName = this.RACE_FORMATS[fId] || fId.toUpperCase(); 
                        
                        const action = isActive ? 'all' : fId; 
                        filtersHtml += `<button style="background:${bg}; color:${color}; border:1px solid ${border}; padding:6px 12px; border-radius:8px; font-family:'Unbounded'; font-weight:800; font-size:9px; cursor:pointer; flex-shrink:0; transition:0.2s;" onclick="window.app.crm.setFormatFilter('${action}')">${fName}</button>`;
                    });
                }

                filtersHtml += `</div>`;
                html += filtersHtml;
            }

            // 💡 ЭТАП 3: ФИНАЛЬНАЯ ФИЛЬТРАЦИЯ
            let eventsToRender = baseEvents.filter(r => {
                if (this.surfaceFilter !== 'all' && r.surface !== this.surfaceFilter) return false;
                if (this.formatFilter !== 'all' && r.format !== this.formatFilter) return false;
                return true;
            });

            if (this.calendarFilter === 'archive') {
                eventsToRender.sort((a, b) => new Date(b.rawDate || b.date) - new Date(a.rawDate || a.date)); 
            } else {
                eventsToRender.sort((a, b) => new Date(a.rawDate || a.date) - new Date(b.rawDate || b.date)); 
            }

            if (eventsToRender.length === 0) { 
                html += '<div style="text-align:center; padding:60px; color:var(--text-muted); font-family:\'Unbounded\'; border: 1px dashed var(--border); border-radius: 20px;">СОБЫТИЙ НЕ НАЙДЕНО</div>'; 
            } else {
                let currentMonth = '';
                let gridOpen = false;

                eventsToRender.forEach(r => {
                    let dObj = new Date(r.rawDate || r.date);
                    let monthName = dObj.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).toUpperCase();
                    
                    if (monthName !== currentMonth) {
                        if (gridOpen) { html += '</div>'; gridOpen = false; } 
                        html += `<div style="font-family:'Unbounded'; font-weight:800; font-size:14px; color:var(--text-main); margin: 30px 0 15px 0; display:flex; align-items:center; gap:10px; opacity: 0.9;"><span style="display:inline-block; width:8px; height:8px; background:var(--primary); border-radius:50%; box-shadow: 0 0 10px var(--primary);"></span>${monthName}</div>`;
                        currentMonth = monthName;
                    }

                    if (!gridOpen) { html += '<div style="display:flex; flex-direction:column; gap:8px;">'; gridOpen = true; }

                    let day = dObj.getDate();
                    let monthNum = (dObj.getMonth() + 1).toString().padStart(2, '0');
                    let year = dObj.getFullYear();
                    let time = dObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

                    let org = r.org; if (r.level === 'team' && r.expand?.team_id) org = `<b style="color:var(--info);">${r.expand.team_id.name}</b>`;
                    
                    let cupHtml = '';
                    if (r.cupId && r.cupName) {
                        cupHtml = `<div onclick="window.app.crm.openCupStandings('${r.cupId}')" style="display:inline-flex; align-items:center; gap:5px; background:rgba(255,193,7,0.1); color:var(--primary); border:1px solid rgba(255,193,7,0.3); padding:4px 8px; border-radius:6px; font-size:9px; font-family:'Unbounded'; font-weight:800; cursor:pointer; margin-bottom:8px; transition:0.2s;" onmouseover="this.style.background='var(--primary)'; this.style.color='#000';" onmouseout="this.style.background='rgba(255,193,7,0.1)'; this.style.color='var(--primary)';">🏆 ${r.cupName.toUpperCase()} <span>→</span></div>`;
                    }
                    
                    // 🔥 ОПРЕДЕЛЯЕМ ПРАВА НА УПРАВЛЕНИЕ ЗАЯВКАМИ
                    const isCreator = r.creator_id === this.app.currentRider?.id;
                    const isAssignedJudge = r.judgeRiderId === this.app.currentRider?.id;
                    const isManagerOrJudge = JSON.stringify(roles).includes('admin') || JSON.stringify(roles).includes('superadmin') || JSON.stringify(roles).includes('judge');
                    const canManageRoster = isManagerOrJudge || isCreator || isAssignedJudge;

                    let primaryHtml = '';
                    if (r.status === 'LIVE') {
                        primaryHtml = `<button class="p-btn-black btn-live" onclick="window.app.openLiveBoard('${r.id}', event)" style="width:100%; margin:0;"><div style="width:6px; height:6px; background:currentColor; border-radius:50%; animation: dot-pulse 1s infinite; display:inline-block; vertical-align:middle; margin-right:5px;"></div>LIVE ПРОТОКОЛ</button>`; 
                    } else if (r.status === 'Finished') {
                        primaryHtml = `<button class="p-btn-black btn-res" onclick="window.app.openLiveBoard('${r.id}', event)" style="width:100%; margin:0;">РЕЗУЛЬТАТЫ</button>`; 
                    } else if (r.status === 'Registration') {
                        const isFull = r.max_riders > 0 && r.rosterCount >= r.max_riders;
                        
                        // 🔥 ФИКС: Админы и судьи игнорируют блокировку SOLD OUT
                        if (isFull && !r.isRegistered && !canManageRoster) {
                            primaryHtml = `<button class="p-btn-black" style="width:100%; margin:0; background: var(--bg-surface-hover); color: var(--text-muted); border: 1px solid var(--border); cursor: not-allowed;">МЕСТ НЕТ (SOLD OUT)</button>`; 
                        } else {
                            primaryHtml = `<button class="p-btn-black btn-reg" onclick="window.app.crm.openRaceRoster('${r.id}', '${this.app.escapeHTML(r.name)}', '${r.type}')" style="width:100%; margin:0;">УЧАСТНИКИ / ЗАЯВКА</button>`; 
                        }
                    } else {
                        primaryHtml = `<div style="text-align:center; width:100%; font-size:10px; font-family:'Unbounded'; color:var(--text-muted); font-weight:800; padding:12px 0;">${r.status}</div>`; 
                    }

                    const baseBtnStyle = "height:32px; border-radius:8px; font-family:'Unbounded', sans-serif; font-size:10px; font-weight:800; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:0.2s; box-sizing:border-box;";
                    const iconBtnStyle = baseBtnStyle + " width:32px; padding:0;";
                    const textBtnStyle = baseBtnStyle + " padding:0 12px; gap:6px;";

                    let judgeBtn = '';
                    if (isManagerOrJudge && (r.status === 'LIVE' || r.status === 'Finished')) {
                        judgeBtn = `<button style="${textBtnStyle} background:rgba(255,193,7,0.1); color:var(--warning); border:1px solid rgba(255,193,7,0.3);" onclick="window.open('https://sotka.one/repult?race_id=${r.id}', '_blank')">⚖️ СУДИТЬ</button>`;
                    }

                    // 🔥 НОВАЯ КНОПКА: Управление заявками для Лайва, Анонсов и Завершенных гонок
                    let manageRosterBtn = '';
                    if (canManageRoster && r.status !== 'Registration') {
                        manageRosterBtn = `<button style="${textBtnStyle} background:rgba(40,167,69,0.1); color:var(--success); border:1px solid rgba(40,167,69,0.3);" title="Управление заявками" onclick="window.app.crm.openRaceRoster('${r.id}', '${this.app.escapeHTML(r.name)}', '${r.type}')">👥 ЗАЯВКИ</button>`;
                    }

                    let chatBtn = '';
                    const raceChat = window.app.chats.find(c => c.race_id === r.id);
                    if (raceChat) {
                        chatBtn = `<button style="${textBtnStyle} background:rgba(59,130,246,0.1); color:var(--info); border:1px solid rgba(59,130,246,0.3);" onclick="window.app.switchTab('chats'); window.app.openChat('${raceChat.id}')">💬 ЧАТ</button>`;
                    }

                    let deleteBtn = ''; let editBtn = '';
                    if ((isAdmin || isCreator) && (r.status === 'Registration' || r.status === 'Скоро')) {
                        editBtn = `<button style="${iconBtnStyle} background:rgba(255,193,7,0.1); color:var(--warning); border:1px solid rgba(255,193,7,0.3); font-size:14px;" title="Редактировать гонку" onclick="window.app.crm.openEditEventModal('${r.id}')">✏️</button>`;
                        deleteBtn = `<button style="${iconBtnStyle} background:rgba(255,51,102,0.1); color:var(--danger); border:1px solid rgba(255,51,102,0.3); font-size:14px;" title="Удалить гонку" onclick="window.app.crm.deleteRace('${r.id}')">🗑️</button>`;
                    }

                    let inviteBtn = '';
                    const myTeamsForInvite = Array.isArray(this.app.currentRider?.team_id) ? this.app.currentRider.team_id : (this.app.currentRider?.team_id ? [this.app.currentRider.team_id] : []);
                    const rTeams = Array.isArray(r.team_id) ? r.team_id : (r.team_id ? [r.team_id] : []);
                    const isMyTeamEvent = r.level === 'team' && myTeamsForInvite.some(id => rTeams.includes(id));
                    
                    if ((r.level === 'personal' && isCreator) || (r.level === 'team' && (isCreator || isAdmin || (isCaptain && isMyTeamEvent)))) {
                        const inviteTextRaw = `Привет! Приглашаю на тренировку «${r.name}» (${r.date}). Жми кнопку, чтобы добавиться в старт-лист:\n\n[ACTION:REGISTER:${r.id}]`;
                        const safeInviteText = encodeURIComponent(inviteTextRaw);
                        inviteBtn = `<button style="${textBtnStyle} background:rgba(168,85,247,0.1); color:#a855f7; border:1px solid rgba(168,85,247,0.3);" title="Скопировать инвайт" onclick="window.app.copyText(decodeURIComponent('${safeInviteText}'), 'Ссылка скопирована! Отправьте её в любой чат VILKA.')">🔗 ПРИГЛАСИТЬ</button>`;
                    }

                    let posterBtn = '';
                    if (r.isRegistered) {
                        const pText = (r.status === 'Finished' || r.myRosterStatus === 'finished') ? '📸 РЕЗУЛЬТАТ' : '📸 Я В ДЕЛЕ';
                        posterBtn = `<button style="${textBtnStyle} background:var(--primary); color:#000; border:none; box-shadow:0 4px 10px rgba(255,193,7,0.3);" title="Создать постер для соцсетей" onclick="window.app.crm.generateRacePoster('${r.id}', '${this.app.currentRider?.id}')">${pText}</button>`;
                    }

                    let secondaryHtml = '';
                    // 🔥 ФИКС: Не забыли добавить manageRosterBtn в массив кнопок для отрисовки
                    if (posterBtn || inviteBtn || chatBtn || judgeBtn || manageRosterBtn || editBtn || deleteBtn) {
                        secondaryHtml = `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">${posterBtn}${inviteBtn}${chatBtn}${judgeBtn}${manageRosterBtn}${editBtn}${deleteBtn}</div>`;
                    }

                    let bookmarks = this.app.currentRider?.bookmarks || [];
                    if (typeof bookmarks === 'string') { try { bookmarks = JSON.parse(bookmarks); } catch(e) { bookmarks = []; } }
                    const isBookmarked = Array.isArray(bookmarks) && bookmarks.includes(r.id);

                    const starIcon = isBookmarked 
                        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--primary)" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>` 
                        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
                    
                    const starBtn = `<button onclick="window.app.crm.toggleBookmark('${r.id}', event)" style="background:none; border:none; cursor:pointer; color:var(--text-muted); padding:0; display:inline-flex; align-items:center; transition:0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" title="В избранное">${starIcon}</button>`;

                    const displayState = (window.app.expandedRaceId === r.id) ? 'block' : 'none';
                    const activeBg = (window.app.expandedRaceId === r.id) ? 'var(--bg-surface-hover)' : 'var(--bg-surface)';
                    const chevron = (window.app.expandedRaceId === r.id) ? '▲' : '▼';

                    // 🔥 ОТОБРАЖАЕМ СУДЬЮ (ИЛИ КАК ТЕКСТ, ИЛИ КАК КЛИКАБЕЛЬНЫЙ ЧАТ)
                    let judgeHtml = '<span style="color:var(--text-muted);">Не назначен</span>';
                    if (r.judgeRiderId) {
                        judgeHtml = `<span style="color:var(--info); cursor:pointer; font-weight:bold; transition:0.2s;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'" onclick="event.stopPropagation(); window.app.startDirectChat('${r.judgeRiderId}'); window.app.switchTab('chats');" title="Написать судье">${r.judgeName}</span>`;
                    } else if (r.judgeName !== 'Не назначен') {
                        judgeHtml = `<span style="color:var(--text-main); font-weight:bold;">${r.judgeName}</span>`;
                    }

                    if (!document.getElementById('calendar-mobile-fix')) {
                        document.head.insertAdjacentHTML('beforeend', `<style id="calendar-mobile-fix">@media(max-width: 600px) { .cal-hide-mob { display:none !important; } .cal-name-text { font-size:14px !important; } }</style>`);
                    }

                    html += `
                    <div class="calendar-accordion-item" style="background:${activeBg}; border:1px solid var(--border); border-radius:12px; overflow:hidden; transition:0.2s; margin-bottom:8px;">
                        
                        <div class="calendar-accordion-header" style="display:flex; align-items:center; padding:12px 16px; cursor:pointer;" onclick="
                            const body = this.nextElementSibling;
                            const isOpen = body.style.display === 'block';
                            document.querySelectorAll('.calendar-accordion-body').forEach(b => { b.style.display = 'none'; b.parentElement.style.background = 'var(--bg-surface)'; b.parentElement.querySelector('.chevron').innerText = '▼'; });
                            if (isOpen) {
                                body.style.display = 'none';
                                this.parentElement.style.background = 'var(--bg-surface)';
                                this.querySelector('.chevron').innerText = '▼';
                                window.app.expandedRaceId = null;
                            } else {
                                body.style.display = 'block';
                                this.parentElement.style.background = 'var(--bg-surface-hover)';
                                this.querySelector('.chevron').innerText = '▲';
                                window.app.expandedRaceId = '${r.id}';
                            }
                        ">
                            <div style="display:flex; align-items:center; gap:10px; flex-shrink:0; padding-right:15px;">
                                ${starBtn}
                                <div style="display:flex; align-items:baseline; gap:1px;">
    <b style="color:var(--text-main); font-family:'Roboto Mono'; font-size:28px; line-height:1; letter-spacing:-1px;">${day}</b>
    <span style="color:var(--text-muted); font-size:14px; font-family:'Roboto Mono'; font-weight:bold;">.${monthNum}</span>
</div>
                            </div>
                            
                            <div style="flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center; border-left: 1px solid rgba(255,255,255,0.05); padding-left:15px;">
                                <div class="cal-name-text" style="font-family:'Unbounded'; font-weight:800; font-size:16px; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:4px;">${r.name}</div>
                                <div style="font-family:'Unbounded'; font-size:10px; font-weight:800; color:var(--primary); text-transform:uppercase;">${r.type} ${cupHtml}</div>
                            </div>
                            
                            <div style="display:flex; align-items:center; gap:15px; flex-shrink:0; text-align:right;">
                                <div class="cal-hide-mob">
                                    <div style="font-family:'Roboto Mono'; font-weight:bold; font-size:14px; color:var(--text-main);">${r.distance} км</div>
                                    <div style="font-size:10px; color:var(--text-muted); font-family:'Unbounded'; margin-top:2px;">${r.rosterCount} заявки</div>
                                </div>
                                <span class="chevron" style="color:var(--text-muted); font-size:12px; margin-left:5px;">${chevron}</span>
                            </div>
                        </div>
                        
                        <div class="calendar-accordion-body" style="display:${displayState}; padding:0 16px 16px 16px; border-top:1px dashed var(--border); cursor:default;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; margin-bottom:15px;">
                                <div style="font-family:'Roboto Mono'; font-weight:bold; font-size:12px; color:var(--text-main);">
                                    ⏱ СТАРТ: ${time}
                                </div>
								<div style="font-size:11px; color:var(--text-muted); z-index:2; position:relative;">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--info)" stroke-width="2" style="vertical-align:middle; margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                    Судья: ${judgeHtml}
                                </div>
                            </div>
                            
                            <div style="display:flex; flex-direction:column; gap:8px;">
                                ${primaryHtml}
                                ${secondaryHtml}
                            </div>
                        </div>
                    </div>`;
                });
                if (gridOpen) html += '</div>';
            }
        }
        else if (this.currentView === 'team') {
            let targetTeamId = this.viewedTeamId;
            
            // 🔥 ФИКС: Создаем переменную в правильной области видимости!
            const currentFilterId = this.app.currentPelotonFilter || 'all';

            // ЗАЩИТА: Добавлен знак вопроса для безопасного чтения
            if (!targetTeamId && this.app.currentRider?.team_id) {
                const myTeams = Array.isArray(this.app.currentRider.team_id) ? this.app.currentRider.team_id : [this.app.currentRider.team_id];
                
                // УМНЫЙ ПОИСК: Безопасно извлекаем peloton_id, даже если это массив
                targetTeamId = myTeams.find(id => {
                    const t = this.app.teamsMap[id];
                    if (!t) return false;
                    const pId = Array.isArray(t.peloton_id) ? t.peloton_id[0] : t.peloton_id;
                    return pId === currentFilterId;
                }) || myTeams[0];
            }

            if (targetTeamId) {
                let adminBarHtml = '';
                const roles = this.app.usersMap[this.app.currentRider?.email] || [];
                const rStr = JSON.stringify(roles);
                const isAdmin = rStr.includes('admin') || rStr.includes('superadmin');
                const isJudge = rStr.includes('judge');
                
                const myTeams = Array.isArray(this.app.currentRider?.team_id) ? this.app.currentRider.team_id : (this.app.currentRider?.team_id ? [this.app.currentRider.team_id] : []);
                const isCaptain = rStr.includes('captain') && myTeams.includes(targetTeamId);
                const isManager = isAdmin || isJudge || isCaptain;
                
                if (isAdmin || isJudge) {
                    let tOpts = '<option value="" disabled selected>-- Выберите команду --</option>';
                    Object.values(this.app.teamsMap).sort((a,b)=>a.name.localeCompare(b.name)).forEach(t => { const sel = (t.id === targetTeamId) ? 'selected' : ''; tOpts += `<option value="${t.id}" ${sel}>${t.name}</option>`; });
                    let delBtn = isAdmin ? `<button onclick="window.app.deleteCurrentTeam()" class="admin-btn admin-btn-danger">Удалить</button>` : '';
                    let capBtn = isAdmin ? `<button onclick="document.getElementById('captainModal').style.display='flex'" class="admin-btn admin-btn-secondary">Капитан</button>` : '';
                    let createBtn = isAdmin ? `<button onclick="document.getElementById('createTeamModal').style.display='flex'" class="admin-btn admin-btn-primary">+ Команда</button>` : '';
                    adminBarHtml = `<div class="admin-bar open"><div class="admin-bar-header" onclick="this.parentElement.classList.toggle('open')"><h3>УПРАВЛЕНИЕ КОМАНДАМИ</h3><span style="color:var(--primary);">▼</span></div><div class="admin-bar-content"><div class="admin-controls-row"><select class="admin-select" onchange="window.app.crm.adminSwitchTeam(this.value)">${tOpts}</select>${createBtn} ${capBtn} ${delBtn}</div></div></div>`;
                }

                const totalPoints = [...this.dataTeam.m, ...this.dataTeam.f].reduce((sum, r) => sum + r.points, 0);
                let teamChat = this.app.chats.find(c => {
                    const cTeams = Array.isArray(c.team_id) ? c.team_id : (c.team_id ? [c.team_id] : []);
                    return cTeams.includes(targetTeamId) && c.type === 'team_channel';
                }) || this.app.chats.find(c => {
                    const cTeams = Array.isArray(c.team_id) ? c.team_id : (c.team_id ? [c.team_id] : []);
                    return cTeams.includes(targetTeamId) && c.type === 'team';
                });

                let chatBtn = teamChat ? `<button class="p-btn" style="background:rgba(255,193,7,0.1); color:var(--primary); border:1px dashed var(--primary); height:100%;" onclick="window.app.switchTab('chats'); window.app.openChat('${teamChat.id}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> КАНАЛ КОМАНДЫ</button>` : '';            
                html += adminBarHtml;

                const myTeamObj = this.app.teamsMap[targetTeamId];
                const myTeamName = myTeamObj ? myTeamObj.name : "МОЯ КОМАНДА";

                const canRename = isAdmin || isCaptain;
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
                        const q = this.teamSearchQuery.toLowerCase();
                        filteredRoster = filteredRoster.filter(r => ((r.name || '').toLowerCase().includes(q)) || ((r.surname || '').toLowerCase().includes(q)) || ((r.team || '').toLowerCase().includes(q)));
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
        }
        else if (this.currentView === 'market') { 
            html += this.buildControlsRow();
            html += this.buildRosterTable(this.getSortedList(this.dataMarket), true); 
        }
        else if (this.currentView === 'rating') {
            html += `<div class="p-table-container"><table class="p-roster-table"><thead><tr><th style="width:40px;">#</th><th>Команда</th><th style="width:70px; text-align:right;">Очки</th></tr></thead><tbody>`;
            
            const myTeams = Array.isArray(this.app.currentRider?.team_id) ? this.app.currentRider.team_id : (this.app.currentRider?.team_id ? [this.app.currentRider.team_id] : []);

            this.dataRatings.forEach((t, i) => { 
                const isMine = myTeams.includes(t.id); 
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

                let teamRiders = Object.values(this.app.ridersMap).filter(r => {
                    if (r.email === 'bot@sotka.one') return false;
                    const rTeams = Array.isArray(r.team_id) ? r.team_id : (r.team_id ? [r.team_id] : []);
                    return rTeams.includes(t.id);
                });
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
       
        else if (this.currentView === 'rules') {
            html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="font-family:'Unbounded'; font-size:18px; color:var(--text-main); margin:0; display:flex; align-items:center; gap:10px;"><span style="color:var(--primary);">⚙️</span> ПРАВИЛА РЕЙТИНГОВ</h2>
                <button class="p-btn-black" onclick="window.app.crm.openRuleModal()" style="width:auto; padding:10px 20px; margin:0;">+ СОЗДАТЬ ПРАВИЛО</button>
            </div>`;

            html += `<div class="dash-table-wrapper"><table class="dash-table"><thead><tr><th>Название</th><th>Покрытие / Формат</th><th>Описание</th><th style="width:80px; text-align:center;">Действия</th></tr></thead><tbody>`;
            
            if (!this.dataRules || this.dataRules.length === 0) {
                html += `<tr><td colspan="4" style="text-align:center; padding:40px; color:var(--text-muted); font-family:'Unbounded'; font-size:12px;">Библиотека правил пуста</td></tr>`;
            } else {
                this.dataRules.forEach(r => {
                    const sName = this.RACE_SURFACES[r.surface] || r.surface;
                    const tName = r.type === 'ind' ? 'РАЗДЕЛКА' : 'Группа';
                    html += `<tr style="transition:0.2s;" onmouseover="this.style.background='var(--bg-surface-hover)'" onmouseout="this.style.background='transparent'">
                        <td><b style="color:var(--text-main); font-size:13px;">${this.app.escapeHTML(r.name)}</b></td>
                        <td><span style="background:var(--bg-body); padding:4px 8px; border-radius:6px; border:1px solid var(--border); font-size:10px; font-weight:bold; color:var(--primary);">${sName} • ${tName}</span></td>
                        <td style="font-size:11px; color:var(--text-muted);">${this.app.escapeHTML(r.description)}</td>
                        <td style="text-align:center;">
                            <button onclick="window.app.crm.openRuleModal('${r.id}')" style="background:rgba(255,193,7,0.1); border:1px solid rgba(255,193,7,0.3); color:var(--warning); cursor:pointer; padding:6px; border-radius:6px; margin-right:4px; transition:0.2s;" title="Редактировать">✏️</button>
                            <button onclick="window.app.crm.deleteRule('${r.id}')" style="background:rgba(255,51,102,0.1); border:1px solid rgba(255,51,102,0.3); color:var(--danger); cursor:pointer; padding:6px; border-radius:6px; transition:0.2s;" title="Удалить">✕</button>
                        </td>
                    </tr>`;
                });
            }
            html += `</tbody></table></div>`;

            if (!document.getElementById('ruleEditModal')) {
                const m = document.createElement('div');
                m.id = 'ruleEditModal';
                m.className = 'modal-overlay';
                m.innerHTML = `
                <div class="modal-box" style="max-width:600px; max-height:90vh; display:flex; flex-direction:column;">
                    <h3 id="ruleModalTitle" style="color:var(--primary); margin-bottom:20px; font-family:'Unbounded';">ПРАВИЛО РЕЙТИНГА</h3>
                    <div style="overflow-y:auto; flex:1; padding-right:10px;">
                        <input type="hidden" id="ruleId">
                        
                        <label style="font-size:10px; color:var(--text-muted); font-family:'Unbounded';">НАЗВАНИЕ (ВИДЯТ ОРГАНИЗАТОРЫ)</label>
                        <input type="text" id="ruleName" class="auth-input" style="width:100%; margin-bottom:15px;" placeholder="Например: Шоссе ПРО (Масс-старт)">
                        
                        <label style="font-size:10px; color:var(--text-muted); font-family:'Unbounded';">КРАТКОЕ ОПИСАНИЕ</label>
                        <input type="text" id="ruleDesc" class="auth-input" style="width:100%; margin-bottom:15px;" placeholder="Как начисляются очки?">
                        
                        <div style="display:flex; gap:10px; margin-bottom:15px;">
    <div style="flex:1;">
        <label style="font-size:10px; color:var(--text-muted); font-family:'Unbounded';">МАТЕМАТИКА (БАЗА)</label>
        <select id="ruleType" class="auth-input" style="width:100%;" onchange="window.app.crm.fillRuleTemplate(true)">
            <option value="mass">Группа / Критериум (Банк очков)</option>
            <option value="ind">Индивидуальная / ITT (Множитель скорости)</option>
        </select>
    </div>
    <div style="flex:1;">
        <label style="font-size:10px; color:var(--text-muted); font-family:'Unbounded';">ПОКРЫТИЕ</label>
        <select id="ruleSurface" class="auth-input" style="width:100%;">
            <option value="road">Шоссе</option>
            <option value="offroad">Грунт</option>
            <option value="track">Трек</option>
            <option value="indoor">Индор</option>
        </select>
    </div>
</div>

                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                            <label style="font-size:10px; color:var(--text-muted); font-family:'Unbounded';">КОНФИГУРАЦИЯ (JSON)</label>
                            <span style="font-size:10px; color:var(--info); cursor:pointer; font-weight:bold; font-family:'Unbounded';" onclick="window.app.crm.fillRuleTemplate()">[ ВСТАВИТЬ ШАБЛОН ]</span>
                        </div>
                        <textarea id="ruleConfig" class="auth-input" style="width:100%; height:250px; font-family:'Roboto Mono', monospace; font-size:12px; line-height:1.4; resize:vertical; background:var(--bg-body);"></textarea>
                    </div>
                    
                    <div style="display:flex; gap:10px; margin-top:20px;">
                        <button class="btn-black" style="flex:1; background:var(--success); color:#000;" onclick="window.app.crm.saveRule()">💾 СОХРАНИТЬ</button>
                        <button class="btn-black" style="flex:1; background:var(--bg-body); color:var(--text-main); border:1px solid var(--border);" onclick="document.getElementById('ruleEditModal').style.display='none'">ОТМЕНА</button>
                    </div>
                </div>`;
                document.body.appendChild(m);
            }
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
        
        // 🔥 ФИКС: Умная проверка Капитанства
        const myTeams = Array.isArray(this.app.currentRider?.team_id) ? this.app.currentRider.team_id : (this.app.currentRider?.team_id ? [this.app.currentRider.team_id] : []);
        const targetTeamId = this.viewedTeamId || (myTeams.length > 0 ? myTeams.find(id => this.app.teamsMap[id]?.peloton_id === this.app.currentPelotonFilter) || myTeams[0] : null);
        
        const isManager = rStr.includes('admin') || rStr.includes('superadmin') || rStr.includes('judge') || (rStr.includes('captain') && myTeams.includes(targetTeamId));
        const isMyCaptain = rStr.includes('captain') && myTeams.length > 0;

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
        const btn = document.getElementById('submitBtn'), 
              name = document.getElementById('newName').value.trim(), 
              surname = document.getElementById('newSurname').value.trim(), 
              yearStr = document.getElementById('newYear').value.trim(), 
              gender = document.getElementById('newGender').value, 
              cluster = document.getElementById('newCluster').value;
              
        if (!name || !surname || !yearStr || !gender) return alert("Заполните: Имя, Фамилия, Год рождения и Пол");
        if (yearStr.length !== 4 || isNaN(Number(yearStr))) return alert("Введите корректный год рождения (4 цифры)");
        
        const year = Number(yearStr);
        
        btn.disabled = true; btn.innerText = "⌛"; 
        
        try {
            // 🔥 ФИКС 1: Вытаскиваем правильный ID команды (строку)
            const targetTeamId = this.viewedTeamId || (Array.isArray(this.app.currentRider?.team_id) ? this.app.currentRider?.team_id[0] : this.app.currentRider?.team_id);
            
            // ==========================================
            // 🔥 АБСОЛЮТНАЯ ЗАЩИТА ОТ ДУБЛИКАТОВ (ГЛОБАЛЬНАЯ ПРОВЕРКА)
            // ==========================================
            if (!this.editIndex) { // Проверяем на дубли ТОЛЬКО при создании нового гонщика
                try {
                    const existingRider = await pb.collection('riders').getFirstListItem(
                        `first_name="${name}" && last_name="${surname}" && yob=${year}`, 
                        { requestKey: null }
                    );

                    alert(`❌ ОШИБКА: Спортсмен уже существует!\n\nГонщик ${name} ${surname} (${year} г.р.) уже зарегистрирован в системе.\n\nСоздание дубликатов запрещено. Найдите его через поиск и отправьте запрос на ТРАНСФЕР.`);
                    
                    btn.disabled = false; btn.innerText = "СОХРАНИТЬ";
                    return; 
                } catch (searchErr) {
                    // Ошибка 404 (не найдено) означает, что дублей нет. Всё отлично!
                }
            }
            // ==========================================

            // 🔥 ФИКС 2: Отправляем team_id строго в виде МАССИВА
            const data = { first_name: name, last_name: surname, yob: year, gender: gender, base_cluster: cluster, team_id: [targetTeamId], rating: 0 };
            
            if (this.editIndex) { 
                // 🔥 ФИКС 3: ПРИ РЕДАКТИРОВАНИИ НЕ ТРОГАЕМ team_id ВООБЩЕ, чтобы не удалить гонщика из других клубов!
                delete data.team_id;
                await pb.collection('riders').update(this.editIndex, data, { requestKey: null }); 
            } else { 
                await pb.collection('riders').create(data, { requestKey: null }); 
            }
            
            this.cancelInlineEdit(); 
            this.loadData(); 
            
        } catch(e) { 
            console.error(e);
            alert("Ошибка сохранения"); 
        } finally { 
            btn.disabled = false; 
            btn.innerText = "СОХРАНИТЬ"; 
        }
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
        if(!confirm("Исключить спортсмена из этой команды?")) return; 
        
        // Узнаем, из какой команды мы его кикаем
        const targetTeamId = this.viewedTeamId || (Array.isArray(this.app.currentRider?.team_id) ? this.app.currentRider?.team_id[0] : this.app.currentRider?.team_id);
        const oneTeam = Object.values(this.app.teamsMap).find(t => t.name && t.name.toUpperCase().includes('ONE TEAM'));
        const oneTeamId = oneTeam ? oneTeam.id : null;
        
        if(!oneTeamId) return alert("Не найдена системная база ONE TEAM"); 
        
        try { 
            const rider = this.app.ridersMap[riderId];
            if (!rider) return;
            
            // Удаляем только текущую открытую команду
            let currentTeams = Array.isArray(rider.team_id) ? [...rider.team_id] : (rider.team_id ? [rider.team_id] : []);
            currentTeams = currentTeams.filter(id => id !== targetTeamId);
            
            // Если выгнали отовсюду - даем статус Свободного Агента (ONE TEAM)
            if (currentTeams.length === 0) currentTeams.push(oneTeamId);

            await pb.collection('riders').update(riderId, { team_id: currentTeams, transfer_request: "" }, { requestKey: null }); 
            this.loadData(); 
        } catch(e) { alert("Ошибка удаления"); } 
    }
    
    async renameTeam(teamId, currentName) {
        const roles = this.app.usersMap[this.app.currentRider?.email] || [];
        const rStr = JSON.stringify(roles);
        const isAdmin = rStr.includes('admin') || rStr.includes('superadmin');
        
        // 🔥 ФИКС: Проверка капитанства через массив
        const myTeams = Array.isArray(this.app.currentRider?.team_id) ? this.app.currentRider.team_id : (this.app.currentRider?.team_id ? [this.app.currentRider.team_id] : []);
        const isCaptain = rStr.includes('captain') && myTeams.includes(teamId);
        
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

// =========================================================
    // 🔥 МЕТОДЫ УПРАВЛЕНИЯ ПОРЯДКОМ КАТЕГОРИЙ
    // =========================================================
    async updateGroupOrder(raceId, catsJson, newIndex) {
        let catsArray = [];
        try { catsArray = JSON.parse(catsJson); } catch(e) { return; }
        
        const idx = parseInt(newIndex);
        
        catsArray.forEach(catName => {
            if (isNaN(idx)) {
                delete this.localCategoryOrder[catName];
            } else {
                this.localCategoryOrder[catName] = idx;
            }
        });

        await this.saveCategoryOrderToDb(raceId);
    }

    async unmergeCategories(raceId, catsJson) {
        if (!confirm("Разделить эту объединенную группу обратно на исходные категории?")) return;

        let catsArray = [];
        try { catsArray = JSON.parse(catsJson); } catch(e) { return; }
        
        catsArray.forEach(catName => {
            delete this.localCategoryOrder[catName];
        });

        await this.saveCategoryOrderToDb(raceId);
    }

    async saveCategoryOrderToDb(raceId) {
        try {
            // 🔥 ЕДИНСТВЕННЫЙ НУЖНЫЙ ФИКС: Если объект пустой, жестко пишем {}, чтобы PocketBase не сделал из него []
            const dataToSave = Object.keys(this.localCategoryOrder).length === 0 ? {} : this.localCategoryOrder;
            
            await pb.collection('races').update(raceId, { category_order: dataToSave }, { requestKey: 'cat_order_update' });
            
            // 🔥 СОХРАНЯЕМ В ЛОКАЛЬНЫЙ КЭШ КАЛЕНДАРЯ
            const cachedRace = this.dataCalendar.find(r => r.id === raceId);
            if (cachedRace) {
                cachedRace.category_order = JSON.parse(JSON.stringify(dataToSave));
            }

            if (typeof this.renderFilteredRaceRosterTable === 'function') this.renderFilteredRaceRosterTable();
        } catch(e) {}
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
        
        // =========================================================
        // 🔥 ЖЕЛЕЗОБЕТОННАЯ ЗАГРУЗКА ИНДЕКСОВ НАПРЯМУЮ ИЗ БАЗЫ
        // =========================================================
        this.localCategoryOrder = {};
        let freshRaceObj = null; // Сохраняем свежий объект для рендера
        try {
            // Принудительно отключаем кэш браузера, чтобы всегда получать свежие индексы!
            freshRaceObj = await pb.collection('races').getOne(raceId, { requestKey: null, fetchOptions: { cache: 'no-store' } });
            
            if (freshRaceObj && freshRaceObj.category_order) {
                let parsedOrder = typeof freshRaceObj.category_order === 'string' 
                    ? JSON.parse(freshRaceObj.category_order) 
                    : freshRaceObj.category_order;
                
                // 🔥 ФИКС: Если база вернула пустой массив [], принудительно превращаем его в объект {}
                this.localCategoryOrder = Array.isArray(parsedOrder) ? {} : (parsedOrder || {});
            }
        } catch(e) {
            console.error("Ошибка скачивания индексов категорий", e);
        }
        // =========================================================

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
                // 1. Добавляем тех, кто УЖЕ заявлен (из таблицы rosters)
                rosters.forEach(r => {
                    let rider = r.expand?.rider_id; if (!rider) return;
                    let tName = this.getRiderTeamNames(rider); // 🔥 УМНОЕ НАЗВАНИЕ
                    if (r.expand?.gruppetto_id) tName = `${tName} <span style="color:#a855f7; font-weight:800; font-size:10px;">[G: ${r.expand.gruppetto_id.name}]</span>`;
                    let gender = String(rider.gender || 'M').toUpperCase().trim(); let catCode = rider.base_cluster || 'B';
                    // 🔥 ДОБАВЛЕНО: is_paid
                    combinedList.push({ id: rider.id, name: rider.first_name, surname: rider.last_name, year: rider.yob, gender: gender, group: catCode, points: rider.rating || 0, team: tName, teamId: rider.team_id, isRegistered: true, recordId: r.id, plannedStart: r.planned_start, bib: r.bib || "", is_paid: r.is_paid || false, squad_name: r.squad_name || "" });
                });
                
                // 🛑 ЖЕЛЕЗОБЕТОННО ДОСТАЕМ ID ПЕЛОТОНА ГОНКИ НАПРЯМУЮ ИЗ БАЗЫ
                let racePelotonId = null;
                try {
                    const dbRace = await pb.collection('races').getOne(raceId, { requestKey: null });
                    racePelotonId = dbRace.peloton_id;
                } catch(e) {
                    racePelotonId = currentRace ? currentRace.peloton_id : null;
                }
                if (Array.isArray(racePelotonId)) racePelotonId = racePelotonId[0];

                // 🔥 2. Добавляем ОСТАЛЬНЫХ гонщиков системы для дозаявки
                Object.values(this.app.ridersMap).forEach(rider => {
                    if (rider.email === 'bot@sotka.one') return; 
                    if (rider.email && rider.email.startsWith('guest_')) return;
                    if (rider.first_name === 'Гость') return; 
                    if (rider.base_cluster === 'O') return; 

                    // 🛑 ЗАЩИТА ОТ КРОСС-ПЕЛОТОННОГО ПЕРЕСЕЧЕНИЯ ДЛЯ МУЛЬТИ-КОМАНД
                    const rTeams = Array.isArray(rider.team_id) ? rider.team_id : (rider.team_id ? [rider.team_id] : []);
                    let hasMatchingPeloton = rTeams.length === 0; // Свободные агенты могут заявляться везде
                    
                    for (let tId of rTeams) {
                        let tObj = this.app.teamsMap[tId];
                        if (tObj) {
                            // Превращаем peloton_id команды в полноценный массив
                            let teamPelotons = Array.isArray(tObj.peloton_id) ? tObj.peloton_id : (tObj.peloton_id ? [tObj.peloton_id] : []);
                            // Проверяем, входит ли пелотон гонки в список пелотонов команды
                            if (!racePelotonId || teamPelotons.includes(racePelotonId)) {
                                hasMatchingPeloton = true;
                                break;
                            }
                        }
                    }
                    
                    if (racePelotonId && rTeams.length > 0 && !hasMatchingPeloton) return;

                    // Если гонщика еще нет в combinedList (то есть он не заявлен)
                    if (!combinedList.find(x => x.id === rider.id)) {
                        let gender = String(rider.gender || 'M').toUpperCase().trim(); 
                        let catCode = rider.base_cluster || 'B';
                        let tName = this.getRiderTeamNames(rider); // 🔥 УМНОЕ НАЗВАНИЕ
                        
                        combinedList.push({ 
                            id: rider.id, name: rider.first_name, surname: rider.last_name, year: rider.yob, gender: gender, group: catCode, points: rider.rating || 0, team: tName, teamId: rider.team_id, isRegistered: false, recordId: null, plannedStart: null, bib: "", squad_name: r.squad_name || "" 
                        });
                    }
                });
            } else if (rStr.includes('captain') && this.app.currentRider?.team_id) {
                // 🔥 УМНЫЙ ВЫБОР КОМАНДЫ КАПИТАНА
                const myTeams = Array.isArray(this.app.currentRider.team_id) ? this.app.currentRider.team_id : [this.app.currentRider.team_id];
                const activeTeamId = myTeams.find(id => this.app.teamsMap[id]?.peloton_id === this.app.currentPelotonFilter) || myTeams[0];

                const teamRiders = await pb.collection('riders').getFullList({ filter: `team_id ~ "${activeTeamId}"`, sort: '-rating', requestKey: null });
                teamRiders.forEach(rider => {
                    let gender = String(rider.gender || 'M').toUpperCase().trim(); let catCode = rider.base_cluster || 'B';
                    let reg = rosters.find(x => x.rider_id === rider.id);
                    let tName = this.getRiderTeamNames(rider); // 🔥 УМНОЕ НАЗВАНИЕ
                    if (reg && reg.expand?.gruppetto_id) tName = `${tName} <span style="color:#a855f7; font-weight:800; font-size:10px;">[G: ${reg.expand.gruppetto_id.name}]</span>`;
                    // 🔥 ДОБАВЛЕНО is_paid: reg ? reg.is_paid : false
                    combinedList.push({ id: rider.id, name: rider.first_name, surname: rider.last_name, year: rider.yob, gender: gender, group: catCode, points: rider.rating || 0, team: tName, teamId: rider.team_id, isRegistered: !!reg, recordId: reg ? reg.id : null, plannedStart: reg ? reg.planned_start : null, bib: reg ? reg.bib : "", is_paid: reg ? reg.is_paid : false, squad_name: r.squad_name || "" });
                });
                
                rosters.forEach(r => {
                    if (combinedList.find(x => x.id === r.rider_id)) return; 
                    let rider = r.expand?.rider_id; if (!rider) return;
                    let rTeamName = this.getRiderTeamNames(rider); // 🔥 УМНОЕ НАЗВАНИЕ
                    if (r.expand?.gruppetto_id) rTeamName = `${rTeamName} <span style="color:#a855f7; font-weight:800; font-size:10px;">[G: ${r.expand.gruppetto_id.name}]</span>`;
                    // 🔥 ДОБАВЛЕНО is_paid: r.is_paid || false
                    combinedList.push({ id: rider.id, name: rider.first_name, surname: rider.last_name, year: rider.yob, gender: String(rider.gender || 'M').toUpperCase().trim(), group: rider.base_cluster || 'B', points: rider.rating || 0, team: rTeamName, teamId: rider.team_id, isRegistered: true, recordId: r.id, plannedStart: r.planned_start, bib: r.bib || "", is_paid: r.is_paid || false, squad_name: r.squad_name || "" });
                });
            } else if (this.app.currentRider) {
                const mp = this.app.currentRider; let reg = rosters.find(x => x.rider_id === mp.id);
                let gender = String(mp.gender || 'M').toUpperCase().trim(); let catCode = mp.base_cluster || 'B';
                let tName = this.getRiderTeamNames(mp); // 🔥 УМНОЕ НАЗВАНИЕ
                if (reg && reg.expand?.gruppetto_id) tName = `${tName} <span style="color:#a855f7; font-weight:800; font-size:10px;">[G: ${reg.expand.gruppetto_id.name}]</span>`;
                // 🔥 ДОБАВЛЕНО is_paid: reg ? reg.is_paid : false
                combinedList = [{ id: mp.id, name: mp.first_name, surname: mp.last_name, year: mp.yob, gender: gender, group: catCode, points: mp.rating || 0, team: tName, teamId: mp.team_id, isRegistered: !!reg, recordId: reg ? reg.id : null, plannedStart: reg ? reg.planned_start : null, bib: reg ? reg.bib : "", is_paid: reg ? reg.is_paid : false }];
                
                rosters.forEach(r => {
                    if (r.rider_id === mp.id) return;
                    let rider = r.expand?.rider_id; if (!rider) return;
                    let rTeamName = this.getRiderTeamNames(rider); // 🔥 УМНОЕ НАЗВАНИЕ
                    if (r.expand?.gruppetto_id) rTeamName = `${rTeamName} <span style="color:#a855f7; font-weight:800; font-size:10px;">[G: ${r.expand.gruppetto_id.name}]</span>`;
                    // 🔥 ДОБАВЛЕНО is_paid: r.is_paid || false
                    combinedList.push({ id: rider.id, name: rider.first_name, surname: rider.last_name, year: rider.yob, gender: String(rider.gender || 'M').toUpperCase().trim(), group: rider.base_cluster || 'B', points: rider.rating || 0, team: rTeamName, teamId: rider.team_id, isRegistered: true, recordId: r.id, plannedStart: r.planned_start, bib: r.bib || "", is_paid: r.is_paid || false, squad_name: r.squad_name || "" });
                });
            } else if (this.app.currentRider) {
                const mp = this.app.currentRider; let reg = rosters.find(x => x.rider_id === mp.id);
                let gender = String(mp.gender || 'M').toUpperCase().trim(); let catCode = mp.base_cluster || 'B';
                let tName = this.getRiderTeamNames(mp); // 🔥 УМНОЕ НАЗВАНИЕ
                if (reg && reg.expand?.gruppetto_id) tName = `${tName} <span style="color:#a855f7; font-weight:800; font-size:10px;">[G: ${reg.expand.gruppetto_id.name}]</span>`;
                combinedList = [{ id: mp.id, name: mp.first_name, surname: mp.last_name, year: mp.yob, gender: gender, group: catCode, points: mp.rating || 0, team: tName, teamId: mp.team_id, isRegistered: !!reg, recordId: reg ? reg.id : null, plannedStart: reg ? reg.planned_start : null, bib: reg ? reg.bib : "" }];
                
                rosters.forEach(r => {
                    if (r.rider_id === mp.id) return;
                    let rider = r.expand?.rider_id; if (!rider) return;
                    let rTeamName = this.getRiderTeamNames(rider); // 🔥 УМНОЕ НАЗВАНИЕ
                    if (r.expand?.gruppetto_id) rTeamName = `${rTeamName} <span style="color:#a855f7; font-weight:800; font-size:10px;">[G: ${r.expand.gruppetto_id.name}]</span>`;
                    combinedList.push({ id: rider.id, name: rider.first_name, surname: rider.last_name, year: rider.yob, gender: String(rider.gender || 'M').toUpperCase().trim(), group: rider.base_cluster || 'B', points: rider.rating || 0, team: rTeamName, teamId: rider.team_id, isRegistered: true, recordId: r.id, plannedStart: r.planned_start, bib: r.bib || "", squad_name: r.squad_name || "" });
                });
            }
          
            combinedList.sort((a, b) => {
                if (a.isRegistered && !b.isRegistered) return -1;
                if (!a.isRegistered && b.isRegistered) return 1;
                if (a.isRegistered && b.isRegistered) {
                    // 🔥 1. ПЕРВЫЙ ПРИОРИТЕТ: Кластеры от слабых (V/O/E) к сильным (A+)
                    const clusterWeights = { 'A+': 7, 'A': 6, 'B': 5, 'C': 4, 'D': 3, 'E': 2, 'O': 1, 'V': 0 };
                    let valA = clusterWeights[a.group] || 0;
                    let valB = clusterWeights[b.group] || 0;
                    
                    if (valA !== valB) return valA - valB; 

                    // 🔥 2. ВТОРОЙ ПРИОРИТЕТ: Внутри одного кластера делим по полу
                    // 'F' (Female) по алфавиту идет раньше 'M' (Male), поэтому девушки стартуют первыми в своем кластере.
                    // Если хочешь наоборот (чтобы мужчины первыми) — поменяй на: return b.gender.localeCompare(a.gender);
                    if (a.gender !== b.gender) return a.gender.localeCompare(b.gender);
                }
                
                // 3. ТРЕТИЙ ПРИОРИТЕТ: Внутри кластера и пола сортируем по алфавиту
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
            
            // 🔥 БЛОК УПРАВЛЕНИЯ ГОНКОЙ (Без кнопки удаления)
            html += `<div style="display:flex; gap:8px; margin-bottom: 20px; overflow-x:auto; scrollbar-width:none; padding-bottom:4px; -webkit-overflow-scrolling:touch;">`;
            if (isOrganizer) { 
                const btnStyle = "background:transparent; color:var(--text-muted); border:1px solid var(--border); padding:8px 16px; border-radius:50px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; flex-shrink:0; transition:0.2s;";
                
                html += `<button style="${btnStyle}" onmouseover="this.style.color='var(--text-main)'; this.style.borderColor='var(--text-main)';" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border)';" onclick="window.app.crm.generateBibs()">🔢 BIB-НОМЕРА</button>`;
                html += `<button style="${btnStyle}" onmouseover="this.style.color='var(--text-main)'; this.style.borderColor='var(--text-main)';" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border)';" onclick="window.app.crm.openWaveStartModal()">🌊 ВОЛНЫ (МАСС-СТАРТ)</button>`;
                html += `<button style="${btnStyle}" onmouseover="this.style.color='var(--text-main)'; this.style.borderColor='var(--text-main)';" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border)';" onclick="window.app.crm.generateITTStarts()">⏱ ITT-СТАРТЫ</button>`;
                html += `<button style="${btnStyle}" onmouseover="this.style.color='var(--text-main)'; this.style.borderColor='var(--text-main)';" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border)';" onclick="window.app.crm.triggerCsvImport('${raceId}')">📥 ИМПОРТ CSV</button>`;
                
                // 🔥 ФИКС: Новая кнопка ручного запуска LIVE (показываем только если гонка не завершена и еще не LIVE)
                if (currentRace && currentRace.status !== 'Finished' && currentRace.status !== 'LIVE') {
                    html += `<button style="background:rgba(255,51,102,0.1); color:var(--danger); border:1px solid rgba(255,51,102,0.3); padding:8px 16px; border-radius:50px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; flex-shrink:0; transition:0.2s; margin-left:10px;" onmouseover="this.style.background='var(--danger)'; this.style.color='#fff';" onmouseout="this.style.background='rgba(255,51,102,0.1)'; this.style.color='var(--danger)';" onclick="window.app.crm.startManualLiveRace('${raceId}')">🔴 СТАРТ ГОНКИ (LIVE)</button>`;
                }
				// 🔥 НОВАЯ КНОПКА: Финализация гонки (показываем только если гонка LIVE)
                if (currentRace && currentRace.status === 'LIVE') {
                    html += `<button style="background:rgba(0,230,118,0.1); color:var(--success); border:1px solid rgba(0,230,118,0.3); padding:8px 16px; border-radius:50px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; flex-shrink:0; transition:0.2s; margin-left:10px;" onmouseover="this.style.background='var(--success)'; this.style.color='#fff';" onmouseout="this.style.background='rgba(0,230,118,0.1)'; this.style.color='var(--success)';" onclick="window.app.crm.finalizeRaceProcess('${raceId}')">🏁 ЗАКРЫТЬ И РАСПРЕДЕЛИТЬ ОЧКИ</button>`;
                }
            }                
            html += `</div>`;

            // 🔥 СТРОКА ПОИСКА И ФИЛЬТР КОМАНДЫ
            this.rosterSearchQuery = ''; 
            this.rosterTeamFilter = 'all'; // Сбрасываем фильтр по умолчанию

            html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px; flex-wrap:wrap; gap:10px;">
                <div style="display:flex; background:var(--bg-surface-hover); border-radius:50px; padding:4px; border:1px solid var(--border);">
                    <button id="btn-roster-all" onclick="window.app.crm.setRosterTeamFilter('all')" style="background:var(--text-main); color:var(--bg-body); border:none; padding:6px 16px; border-radius:50px; font-family:'Unbounded', sans-serif; font-size:10px; font-weight:800; cursor:pointer; transition:0.2s;">ВСЕ</button>
                    <button id="btn-roster-myteam" onclick="window.app.crm.setRosterTeamFilter('myteam')" style="background:transparent; color:var(--text-muted); border:none; padding:6px 16px; border-radius:50px; font-family:'Unbounded', sans-serif; font-size:10px; font-weight:800; cursor:pointer; transition:0.2s;">МОЯ КОМАНДА</button>
                </div>
                <input type="text" placeholder="Поиск гонщика..." value="${this.rosterSearchQuery}" style="background:var(--bg-surface-hover); border:1px solid var(--border); color:var(--text-main); padding:8px 16px; border-radius:50px; font-family:'Manrope'; font-size:11px; outline:none; transition:0.2s; min-width:200px;" oninput="window.app.crm.setRosterSearch(this.value); window.app.crm.renderFilteredRaceRosterTable();">
            </div>`;

            // 🔥 КОНТЕЙНЕР ДЛЯ ДИНАМИЧЕСКОЙ ТАБЛИЦЫ
            html += `<div id="raceRosterTableContainer"></div>`;
            contentArea.innerHTML = html;

            // 🔥 МЕТОД ОТРИСОВКИ ТАБЛИЦЫ (С учетом слияния и починенной версткой)
            this.renderFilteredRaceRosterTable = () => {
                const tableContainer = document.getElementById('raceRosterTableContainer');
                if (!tableContainer) return;

                let filteredList = [...combinedList];
				// 💡 НОВЫЙ ФИЛЬТР: ТОЛЬКО МОЯ КОМАНДА
                if (this.rosterTeamFilter === 'myteam') {
                    const myTeams = Array.isArray(this.app.currentRider?.team_id) 
                        ? this.app.currentRider.team_id 
                        : (this.app.currentRider?.team_id ? [this.app.currentRider.team_id] : []);
                    
                    filteredList = filteredList.filter(p => {
                        const pTeams = Array.isArray(p.teamId) ? p.teamId : (p.teamId ? [p.teamId] : []);
                        // Оставляем гонщика, только если массивы команд пересекаются
                        return myTeams.some(id => pTeams.includes(id));
                    });
                }
                if (this.rosterSearchQuery) {
                    const q = this.rosterSearchQuery.toLowerCase();
                    filteredList = filteredList.filter(p => ((p.name || '').toLowerCase().includes(q)) || ((p.surname || '').toLowerCase().includes(q)) || ((p.team || '').toLowerCase().includes(q)));
                }

                // 🔥 ФИКС 3.2: ИСПОЛЬЗУЕМ СВЕЖИЕ ДАННЫЕ ГОНКИ ДЛЯ РАСЧЕТА КАТЕГОРИЙ (ИГНОРИРУЕМ СТАРЫЙ КЭШ)
                const raceObj = freshRaceObj || (typeof currentRace !== 'undefined' ? currentRace : null);
                
                filteredList.forEach(p => {
                    p.computedCat = p.group || 'B'; 
                    if (raceObj && typeof this.getRaceCategory === 'function') {
                        try { p.computedCat = this.getRaceCategory({ gender: p.gender, yob: p.year, base_cluster: p.group }, raceObj); } catch (e) {}
                    }
                });

                // 1. ЖЕЛЕЗОБЕТОННО ОТДЕЛЯЕМ ЗАЯВЛЕННЫХ ОТ НЕЗАЯВЛЕННЫХ
                const registeredRiders = filteredList.filter(r => r.isRegistered);
                const unregisteredRiders = filteredList.filter(r => !r.isRegistered);

                // 2. Группируем ТОЛЬКО ЗАЯВЛЕННЫХ по ИНДЕКСУ
                let groupedRosters = {};
                registeredRiders.forEach(p => {
                    let orderIndex = this.localCategoryOrder[p.computedCat];
                    if (orderIndex !== undefined && orderIndex !== null && orderIndex !== "") {
                        if (!groupedRosters[orderIndex]) groupedRosters[orderIndex] = { index: parseInt(orderIndex), originalCats: new Set(), riders: [] };
                        groupedRosters[orderIndex].originalCats.add(p.computedCat);
                        groupedRosters[orderIndex].riders.push(p);
                    } else {
                        if (!groupedRosters[p.computedCat]) groupedRosters[p.computedCat] = { index: 99999, originalCats: new Set([p.computedCat]), riders: [] };
                        groupedRosters[p.computedCat].riders.push(p);
                    }
                });

                // 3. Сортируем ГРУППЫ
                let groupsArray = Object.values(groupedRosters);
                groupsArray.sort((a, b) => {
                    if (a.index !== b.index) return a.index - b.index;
                    // Спортивная сортировка групп по умолчанию
                    const catA = Array.from(a.originalCats)[0];
                    const catB = Array.from(b.originalCats)[0];
                    return window.app.crm.getCatRank(catA) - window.app.crm.getCatRank(catB);
                });

                // 4. Сортируем ГОНЩИКОВ внутри групп
                groupsArray.forEach(group => {
                    group.riders.sort((a, b) => {
                        let timeA = a.plannedStart || "23:59:59";
                        let timeB = b.plannedStart || "23:59:59";
                        if (timeA !== timeB) return timeA.localeCompare(timeB);
                        let ptsA = a.points || 0; let ptsB = b.points || 0;
                        if (ptsA !== ptsB) return ptsA - ptsB; // Новички раньше
                        return (a.surname + a.name).localeCompare(b.surname + b.name);
                    });
                });

                // 5. Сортируем НЕЗАЯВЛЕННЫХ
                unregisteredRiders.sort((a, b) => {
                    if (a.computedCat !== b.computedCat) return window.app.crm.getCatRank(a.computedCat) - window.app.crm.getCatRank(b.computedCat);
                    let ptsA = a.points || 0; let ptsB = b.points || 0;
                    if (ptsA !== ptsB) return ptsA - ptsB;
                    return (a.surname + a.name).localeCompare(b.surname + b.name);
                });

                // ОТРИСОВКА
                let tableHtml = `<div class="p-table-container"><table class="p-roster-table"><thead><tr><th style="width:100px;">Действие</th><th style="width:60px;">BIB</th><th>Имя</th><th style="max-width: 140px;">Команда</th><th style="width:80px;">ГР</th><th>Категория</th><th>Старт</th><th>Рейт.</th></tr></thead><tbody>`;
                
                if (filteredList.length === 0) { 
                    tableHtml += `<tr><td colspan="8" style="text-align:center; padding:40px; color:var(--text-muted); font-family:'Unbounded';">Гонщики не найдены</td></tr>`; 
                } else {
                    
                    const generateRowHtml = (p) => {
                        let bg = p.isRegistered ? 'background:var(--success-light);' : ''; 
                        let act = "";
                        let canEditRow = (isOrganizer || p.id === (this.app.currentRider ? this.app.currentRider.id : null));
                        if (!canEditRow && typeof rStr !== 'undefined' && rStr.includes('captain')) {
                            const myTeams = Array.isArray(this.app.currentRider?.team_id) ? this.app.currentRider.team_id : [this.app.currentRider?.team_id];
                            const pTeams = Array.isArray(p.teamId) ? p.teamId : [p.teamId];
                            if (myTeams.some(id => pTeams.filter(Boolean).includes(id))) canEditRow = true;
                        }

                        if (canEditRow) {
                            act = p.isRegistered 
                                ? `<button class="btn-action" style="background:rgba(255,51,102,0.1); border:1px solid var(--danger); color:var(--danger); width:auto; padding:6px 12px; font-size:9px; border-radius:6px; font-family:'Unbounded'; font-weight:800; cursor:pointer; transition:0.2s;" onclick="window.app.crm.revokeRaceReg('${p.recordId}')">ОТОЗВАТЬ</button>` 
                                : `<button class="btn-action" style="background:var(--primary); border:1px solid var(--primary); color:#000; width:auto; padding:6px 12px; font-size:9px; border-radius:6px; font-family:'Unbounded'; font-weight:800; cursor:pointer; transition:0.2s;" onclick="window.app.crm.registerSingleRider('${p.id}', this, event)">ЗАЯВИТЬ</button>`;
                        } else {
                            act = p.isRegistered ? `<span style="color:var(--success); font-weight:800; font-size:10px;">ЗАЯВЛЕН</span>` : `<span style="color:var(--text-muted); font-size:10px;">-</span>`;
                        }

                        let genderBadge = "";
                        const catStr = String(p.computedCat || "");
                        if (!catStr.includes('[') && !catStr.includes('U')) {
                            genderBadge = p.gender === 'F' ? '<span style="font-family:\'Unbounded\'; font-size:9px; font-weight:800; padding:2px 6px; border-radius:4px; background:var(--bg-body); border:1px solid var(--border); margin-right:6px; color:var(--danger);">Ж</span>' : '<span style="font-family:\'Unbounded\'; font-size:9px; font-weight:800; padding:2px 6px; border-radius:4px; background:var(--bg-body); border:1px solid var(--border); margin-right:6px;">М</span>';
                        }

                        let bibHtml = "-"; 
                        if (p.isRegistered) { 
                            let inputDisabled = isOrganizer ? "" : "disabled";
                            bibHtml = `<input type="text" style="width:40px; height:30px; text-align:center; background:transparent; border:1px solid var(--border); color:var(--primary); font-family:'Roboto Mono'; font-weight:bold; border-radius:4px;" value="${p.bib || ''}" onchange="window.app.crm.updateBib('${p.recordId}', this.value, this)" ${inputDisabled}>`; 
                        }
						// 🔥 ЛОГИКА ВИЗУАЛИЗАЦИИ ОПЛАТЫ
                        let paidBadge = "";
                        if (p.isRegistered) {
                            // Кликать может только организатор
                            let paidAction = isOrganizer ? `onclick="window.app.crm.togglePaymentStatus('${p.recordId}', ${p.is_paid})"` : '';
                            let cursorStyle = isOrganizer ? 'cursor:pointer;' : 'cursor:default;';
                            
                            paidBadge = p.is_paid 
                                ? `<span ${paidAction} style="background:#e6f4ea; color:#28a745; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:800; ${cursorStyle} margin-left:8px; border:1px solid #c3e6cb; transition:0.2s; white-space:nowrap;" title="Нажмите, чтобы отменить оплату">₽ ОПЛ</span>`
                                : `<span ${paidAction} style="background:#f8d7da; color:#dc3545; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:800; ${cursorStyle} margin-left:8px; border:1px solid #f5c6cb; transition:0.2s; white-space:nowrap;" title="Нажмите, чтобы подтвердить оплату">₽ НЕ ОПЛ</span>`;
                        }
                        
                        let timeHtml = "-"; 
                        if (p.isRegistered) { 
                            let inputDisabled = isOrganizer ? "" : "disabled";
                            timeHtml = `<input type="text" style="width:70px; height:30px; text-align:center; background:transparent; border:1px solid var(--border); color:var(--text-main); font-family:'Roboto Mono'; font-weight:bold; border-radius:4px;" value="${p.plannedStart || ''}" placeholder="--:--" onchange="window.app.crm.updateStartTime('${p.recordId}', this.value, this)" ${inputDisabled}>`; 
                        }

                        // 🔥 ИНТЕРАКТИВНАЯ КАТЕГОРИЯ
                        let catHtml = `<span style="font-size:11px; font-weight:600; font-family:'Roboto Mono';">${p.computedCat}</span>`;
                        if (p.isRegistered) {
                            let inputDisabled = isOrganizer ? "" : "disabled";
                            catHtml = `<input type="text" style="width:70px; height:30px; text-align:center; background:transparent; border:1px solid var(--border); color:var(--text-main); font-family:'Roboto Mono'; font-weight:bold; border-radius:4px;" value="${p.computedCat}" onchange="window.app.crm.updateCategory('${p.recordId}', this.value, this)" ${inputDisabled}>`;
                        }

                        return `<tr style="${bg}"><td>${act}</td><td>${bibHtml}</td> <td><div style="display:flex; align-items:center; flex-wrap:nowrap;"><b style="font-size:13px; cursor:pointer; transition:0.2s; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color=''" onclick="window.app.openProfile('${p.id}')" title="Открыть профиль">${p.name} ${p.surname}</b> ${paidBadge}</div></td><td style="max-width: 140px; white-space: normal; line-height: 1.3; word-wrap: break-word;"><span style="color:var(--text-muted); font-size:11px;">${p.team}</span></td><td><span style="color:var(--text-muted); font-family:'Roboto Mono'; font-size:12px;">${p.year}</span></td><td><div style="display:flex; align-items:center;">${genderBadge}${catHtml}</div></td><td>${timeHtml}</td><td><b style="color:var(--primary); font-size:13px; font-family:'Roboto Mono';">${p.points}</b></td></tr>`;
                    };

                    // А. ОТРИСОВКА ЗАЯВЛЕННЫХ
                    groupsArray.forEach(group => {
                        const originalCatsArray = Array.from(group.originalCats).sort((a,b) => window.app.crm.getCatRank(a) - window.app.crm.getCatRank(b));
                        const groupName = originalCatsArray.join(' <span style="color:var(--text-muted);">+</span> ');
                        const currentInputValue = group.index === 99999 ? '' : group.index;
                        const isMergedGroup = originalCatsArray.length > 1;

                        let orderInputHtml = '';
                        if (isOrganizer) {
                            let unmergeBtnHtml = '';
                            
                            // Возвращаем оригинальное экранирование без URI кодировок
                            const catsJsonForUpdate = this.app.escapeHTML(JSON.stringify(originalCatsArray));
                            
                            if (isMergedGroup) {
                                unmergeBtnHtml = `<button onclick="window.app.crm.unmergeCategories('${raceObj.id}', '${catsJsonForUpdate}')" style="background:rgba(255,51,102,0.1); border:1px solid rgba(255,51,102,0.3); color:var(--danger); padding:4px 8px; border-radius:4px; font-size:9px; font-family:'Unbounded'; font-weight:bold; cursor:pointer; margin-right: 10px;" title="Разделить на отдельные категории">✂️ РАЗДЕЛИТЬ</button>`;
                            }
                            
                            orderInputHtml = `
                                <div style="display:flex; align-items:center;">
                                    ${unmergeBtnHtml}
                                    <span style="font-size:10px; color:var(--text-muted); margin-right: 8px;">Очередь:</span>
                                    <input type="number" value="${currentInputValue}" placeholder="-" onchange="window.app.crm.updateGroupOrder('${raceObj.id}', '${catsJsonForUpdate}', this.value)" style="width:40px; height:24px; text-align:center; background:var(--bg-body); border:1px solid var(--border); color:var(--primary); font-family:'Roboto Mono'; font-weight:bold; border-radius:4px; outline:none;">
                                </div>`;
                        }

                        tableHtml += `<tr><td colspan="8" style="padding:0; background:var(--bg-surface-hover); border-top: 2px solid var(--primary); border-bottom: 1px solid var(--border);">
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 10px;">
                                <div style="color:var(--text-main); font-family:'Unbounded'; font-weight:800; font-size:13px; text-transform:uppercase;">КАТЕГОРИЯ: <span style="color:var(--primary);">${groupName}</span></div>
                                ${orderInputHtml}
                            </div>
                        </td></tr>`;

                        group.riders.forEach(p => { tableHtml += generateRowHtml(p); });
                    });

                    // Б. ОТРИСОВКА НЕЗАЯВЛЕННЫХ В САМОМ НИЗУ
                    if (unregisteredRiders.length > 0) {
                        tableHtml += `<tr><td colspan="8" style="padding: 30px 10px 10px; border-bottom: 1px solid var(--border); color: var(--text-muted); font-family: 'Unbounded'; font-weight: 800; font-size: 11px; text-transform: uppercase; text-align: center;">🔻 ДОСТУПНЫ ДЛЯ ЗАЯВКИ 🔻</td></tr>`;
                        unregisteredRiders.forEach(p => { tableHtml += generateRowHtml(p); });
                    }
                }
                tableHtml += `</tbody></table></div>`; 
                tableContainer.innerHTML = tableHtml;
            };

            // Вызываем первичный рендер таблицы
            setTimeout(() => { if(typeof this.renderFilteredRaceRosterTable === 'function') this.renderFilteredRaceRosterTable(); }, 10);

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
	
	// ==========================================
    // 🔥 РУЧНОЕ УПРАВЛЕНИЕ СТАТУСОМ ОПЛАТЫ
    // ==========================================
    async togglePaymentStatus(recordId, currentStatus) {
        if (!recordId) return;
        
        const actionText = currentStatus ? "ОТМЕНИТЬ оплату" : "ПОДТВЕРДИТЬ оплату";
        if (!confirm(`Вы уверены, что хотите ${actionText} для этого участника?`)) return;

        const newStatus = !currentStatus;

        try {
            // 1. Сохраняем в базу PocketBase
            await pb.collection('race_rosters').update(recordId, { is_paid: newStatus }, { requestKey: null });

            // 2. Обновляем статус в локальном кэше
            let p = this.raceRosterList.find(r => r.recordId === recordId);
            if (p) p.is_paid = newStatus;

            // 3. Мгновенно перерисовываем только таблицу (без перезагрузки страницы)
            if (typeof this.renderFilteredRaceRosterTable === 'function') {
                this.renderFilteredRaceRosterTable();
            }
        } catch(e) { 
            console.error("Ошибка обновления статуса оплаты:", e);
            alert("Ошибка сети. Не удалось изменить статус оплаты."); 
        }
    }
	
	async updateStartTime(recordId, newTime, inputEl) {
        if (!recordId) return;
        inputEl.style.backgroundColor = 'var(--success-light)';
        try {
            let formattedTime = newTime.trim();
            // Умное форматирование: если ввели "10:00", делаем "10:00:00"
            if (formattedTime.length === 5 && formattedTime.includes(':')) {
                formattedTime += ':00';
            }
            
            // Сохраняем в базу
            await pb.collection('race_rosters').update(recordId, { planned_start: formattedTime }, { requestKey: null });
            
            // Обновляем в локальном массиве
            let p = this.raceRosterList.find(r => r.recordId === recordId);
            if (p) p.plannedStart = formattedTime;
            
            inputEl.value = formattedTime;
            
            // Через полсекунды снимаем зеленую подсветку и ПЕРЕРИСОВЫВАЕМ таблицу
            // чтобы гонщик автоматически перепрыгнул на новое место по времени!
            setTimeout(() => { 
                inputEl.style.backgroundColor = ''; 
                if (typeof this.renderFilteredRaceRosterTable === 'function') {
                    this.renderFilteredRaceRosterTable();
                }
            }, 500);
            
        } catch(e) { 
            inputEl.style.backgroundColor = 'var(--danger-light)'; 
            alert("Ошибка сохранения времени"); 
        }
    }

async updateCategory(recordId, newCat, inputEl) {
        if (!recordId) return;
        inputEl.style.backgroundColor = 'var(--success-light)';
        try {
            // Убираем префиксы типа [М] или [Ж], чтобы в базе хранился чистый кластер
            let formattedCat = newCat.replace(/\[.*?\]\s*/g, '').trim().toUpperCase();
            
            // Сохраняем итоговую категорию в заявку
            await pb.collection('race_rosters').update(recordId, { final_cluster: formattedCat }, { requestKey: null });
            
            // Обновляем в локальном кэше таблицы
            let p = this.raceRosterList.find(r => r.recordId === recordId);
            if (p) p.group = formattedCat;
            
            // Через полсекунды снимаем зеленую подсветку и ПЕРЕРИСОВЫВАЕМ таблицу, 
            // чтобы спортсмен автоматически перепрыгнул в нужную группу на экране!
            setTimeout(() => { 
                inputEl.style.backgroundColor = ''; 
                if (typeof this.renderFilteredRaceRosterTable === 'function') {
                    this.renderFilteredRaceRosterTable();
                }
            }, 500);
            
        } catch(e) { 
            inputEl.style.backgroundColor = 'var(--danger-light)'; 
            alert("Ошибка сохранения категории"); 
        }
    }

    // ==========================================
    // 🔥 ОДИНОЧНАЯ ЗАЯВКА ИЗ ТАБЛИЦЫ РОСТЕРА (БЕЗ ПЕРЕЗАГРУЗКИ)
    // ==========================================
    async registerSingleRider(riderId, btn, event) {
        if (event) event.stopPropagation();
        
        if (this.app.currentRider && this.app.currentRider.email && this.app.currentRider.email.startsWith('guest_')) {
            alert('Регистрация на гонку доступна только авторизованным спортсменам. Пожалуйста, войдите в свой аккаунт Сотка.');
            return; 
        }
        
        const currentRace = this.dataCalendar.find(r => r.id === this.openedEventId);
        
        // Проверка: любителям нельзя в официальные гонки
        if (currentRace && currentRace.level === 'peloton') {
            const targetRider = this.raceRosterList.find(r => r.id === riderId);
            if (targetRider && targetRider.group === 'O') {
                alert(`❌ Официальные гонки недоступны для любителей (Кластер O).`);
                return;
            }
        }

        // Анимация загрузки на самой кнопке
        const oldText = btn.innerText;
        btn.innerText = '⌛...';
        btn.disabled = true;
        btn.style.opacity = '0.7';

        try { 
            const newRecord = await pb.collection('race_rosters').create({ 
                race_id: this.openedEventId, 
                rider_id: riderId, 
                status: 'registered' 
            }, { requestKey: null }); 
            
            // 🔥 МАГИЯ ЗДЕСЬ: Обновляем статус гонщика локально, без запроса к БД
            let p = this.raceRosterList.find(r => r.id === riderId);
            if (p) {
                p.isRegistered = true;
                p.recordId = newRecord.id; // Запоминаем ID заявки, чтобы работала кнопка "Отозвать"
            }

            // Мгновенно перерисовываем только таблицу
            if (typeof this.renderFilteredRaceRosterTable === 'function') {
                this.renderFilteredRaceRosterTable();
            }
            
        } catch(e) { 
            console.error("Детали ошибки PB:", e);
            let detailedMsg = e.message;
            if (e.response && e.response.data) {
                detailedMsg += "\n\nДетали от сервера:\n" + JSON.stringify(e.response.data, null, 2);
            }
            alert(`❌ База данных отклонила запрос!\n\n${detailedMsg}`); 
            
            btn.innerText = oldText;
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }

    async revokeRaceReg(recordId) { 
        if(!confirm("Отозвать заявку этого гонщика?")) return; 
        try { 
            await pb.collection('race_rosters').delete(recordId, { requestKey: null }); 
            
            // 🔥 МАГИЯ ЗДЕСЬ: Снимаем статус локально
            let p = this.raceRosterList.find(r => r.recordId === recordId);
            if (p) {
                p.isRegistered = false;
                p.recordId = null;
                p.bib = "";
                p.plannedStart = null;
            }

            // Мгновенно перерисовываем только таблицу
            if (typeof this.renderFilteredRaceRosterTable === 'function') {
                this.renderFilteredRaceRosterTable();
            }
        } catch(e) { alert("Ошибка при отмене"); } 
    }

    async generateBibs() {
        if (!this.openedEventId) return;
        let sortedRiders = [...this.raceRosterList].filter(p => p.isRegistered);
        if (sortedRiders.length === 0) return alert("Нет подтвержденных заявок!");
        if (!confirm("Автоматически присвоить номера ВСЕМ заявленным гонщикам строго по ВРЕМЕНИ СТАРТА?")) return;

        // 🔥 ШАГ 1: Подготавливаем категории, чтобы знать их индекс (на случай совпадения времени)
        const raceObj = this.dataCalendar.find(r => r.id === this.openedEventId);
        sortedRiders.forEach(p => {
            p.computedCat = p.group || 'B';
            if (raceObj && typeof this.getRaceCategory === 'function') {
                try { p.computedCat = this.getRaceCategory({ gender: p.gender, yob: p.year, base_cluster: p.group }, raceObj); } catch(e) {}
            }
            // Определяем индекс группы для сортировки при равном времени
            let orderIndex = this.localCategoryOrder[p.computedCat];
            p.groupIndex = (orderIndex !== undefined && orderIndex !== null && orderIndex !== "") ? parseInt(orderIndex) : 99999;
        });

        // 🔥 ШАГ 2: ГЛОБАЛЬНАЯ СОРТИРОВКА ПО ВРЕМЕНИ СТАРТА (Ключевое исправление)
        sortedRiders.sort((a, b) => {
            let timeA = a.plannedStart || "23:59:59";
            let timeB = b.plannedStart || "23:59:59";
            
            // 1. Сначала строго по времени! Кто раньше едет, у того меньше BIB
            if (timeA !== timeB) return timeA.localeCompare(timeB); 
            
            // 2. Если время старта совпадает секунда-в-секунду - смотрим на приоритет группы
            if (a.groupIndex !== b.groupIndex) return a.groupIndex - b.groupIndex;
            
            // 3. Если время и группа совпадают - по очкам (новички раньше)
            let ptsA = a.points || 0; 
            let ptsB = b.points || 0;
            if (ptsA !== ptsB) return ptsA - ptsB; 
            
            // 4. В самом конце - по алфавиту
            return (a.surname + a.name).localeCompare(b.surname + b.name);
        });

        // 🔥 ШАГ 3: Раздаем номера 1, 2, 3...
        try {
            for (let i = 0; i < sortedRiders.length; i++) {
                let bibNum = (i + 1).toString();
                await pb.collection('race_rosters').update(sortedRiders[i].recordId, { bib: bibNum }, { requestKey: null });
            }
            alert("✅ Стартовые номера успешно присвоены строго по времени старта!");
            this.openRaceRoster(this.openedEventId, this.openedEventName, this.openedEventType);
        } catch(e) { 
            alert("❌ Ошибка при генерации номеров."); 
        } 
    }

async generateITTStarts() {
        if (!this.openedEventId) return;
        let sortedRiders = [...this.raceRosterList].filter(p => p.isRegistered);
        if (sortedRiders.length === 0) return alert("Нет подтвержденных заявок!");

        const raceObj = this.dataCalendar.find(r => r.id === this.openedEventId);
        
        sortedRiders.forEach(p => {
            p.computedCat = p.group || 'B';
            if (raceObj && typeof this.getRaceCategory === 'function') {
                try { p.computedCat = this.getRaceCategory({ gender: p.gender, yob: p.year, base_cluster: p.group }, raceObj); } catch(e) {}
            }
        });

        // 🔥 УМНАЯ СОРТИРОВКА ПЕРЕД РАЗДАЧЕЙ ВРЕМЕНИ
        let groupedRosters = {};
        sortedRiders.forEach(p => {
            let orderIndex = this.localCategoryOrder[p.computedCat];
            if (orderIndex !== undefined && orderIndex !== null && orderIndex !== "") {
                if (!groupedRosters[orderIndex]) groupedRosters[orderIndex] = { index: parseInt(orderIndex), originalCats: new Set(), riders: [] };
                groupedRosters[orderIndex].originalCats.add(p.computedCat);
                groupedRosters[orderIndex].riders.push(p);
            } else {
                if (!groupedRosters[p.computedCat]) groupedRosters[p.computedCat] = { index: 99999, originalCats: new Set([p.computedCat]), riders: [] };
                groupedRosters[p.computedCat].riders.push(p);
            }
        });

        let groupsArray = Object.values(groupedRosters);
        groupsArray.sort((a, b) => {
            if (a.index !== b.index) return a.index - b.index;
            const catA = Array.from(a.originalCats)[0];
            const catB = Array.from(b.originalCats)[0];
            return this.getCatRank(catA) - this.getCatRank(catB);
        });

        groupsArray.forEach(group => {
            group.riders.sort((a, b) => {
                let ptsA = a.points || 0;
                let ptsB = b.points || 0;
                if (ptsA !== ptsB) return ptsA - ptsB; // Новички (0) стартуют перед Элитой (1000)
                return (a.surname + a.name).localeCompare(b.surname + b.name);
            });
        });

        sortedRiders = groupsArray.flatMap(g => g.riders);

        let startTimeStr = prompt("Введите время старта первого участника (ЧЧ:ММ:СС):", "11:01:00"); if (!startTimeStr) return;
        let intervalSec = parseInt(prompt("Введите интервал между стартами (в секундах):", "60")); if (isNaN(intervalSec) || intervalSec <= 0) return;

        try {
            let baseDate = new Date(); let parts = startTimeStr.split(':');
            baseDate.setHours(parseInt(parts[0] || 10), parseInt(parts[1] || 0), parseInt(parts[2] || 0), 0);
            for (let i = 0; i < sortedRiders.length; i++) {
                let time = new Date(baseDate.getTime() + (i * intervalSec * 1000));
                let timeString = time.toTimeString().split(' ')[0]; 
                await pb.collection('race_rosters').update(sortedRiders[i].recordId, { planned_start: timeString }, { requestKey: null });
            }
            
            alert("✅ Расписание стартов сгенерировано!");
            this.openRaceRoster(this.openedEventId, this.openedEventName, this.openedEventType);
        } catch(e) { alert("❌ Ошибка при генерации расписания."); }
    }

   async openWaveStartModal() {
        let riders = [...this.raceRosterList].filter(p => p.isRegistered);
        if (riders.length === 0) return alert("В заявке нет участников!");

        const btn = document.activeElement;
        let originalText = "";
        if (btn && btn.tagName === 'BUTTON') {
            originalText = btn.innerText;
            btn.innerText = "ЗАГРУЗКА...";
            btn.disabled = true;
        }

        try {
            let raceObj = null;
            try { raceObj = await pb.collection('races').getOne(this.openedEventId); } catch (err) {}

            const catCalculator = (typeof this.getRaceCategory === 'function') ? this.getRaceCategory.bind(this) : 
                                  (window.app && typeof window.app.getRaceCategory === 'function' ? window.app.getRaceCategory.bind(window.app) : null);

            // 1. Считаем правильные категории
            riders.forEach(r => {
                r.tempCat = r.computedCat; // Сначала берем то, что уже посчитала таблица
                if (!r.tempCat) {
                    r.tempCat = r.group || 'B';
                    if (raceObj && catCalculator) {
                        try { r.tempCat = catCalculator({ gender: r.gender, yob: r.year, base_cluster: r.group }, raceObj); } catch (e) {}
                    }
                }
            });

            // 2. 🔥 ГРУППИРУЕМ ТАК ЖЕ, КАК В ТАБЛИЦЕ (с учетом ручных объединений)
            let groupedWaves = {};
            const orderMap = this.localCategoryOrder || {}; // Словарь объединений из UI

            riders.forEach(r => {
                let orderIndex = orderMap[r.tempCat];
                let groupKey;

                // Если категория объединена в общую волну (у нее есть номер очереди в таблице)
                if (orderIndex !== undefined && orderIndex !== null && orderIndex !== "") {
                    groupKey = `wave_${orderIndex}`;
                } else {
                    // Иначе она стартует сама по себе
                    groupKey = `cat_${r.tempCat}`;
                }

                if (!groupedWaves[groupKey]) {
                    groupedWaves[groupKey] = {
                        cats: new Set(),
                        count: 0,
                        isMerged: orderIndex !== undefined && orderIndex !== null && orderIndex !== "",
                        index: orderIndex !== undefined && orderIndex !== null && orderIndex !== "" ? parseInt(orderIndex) : 99999
                    };
                }
                groupedWaves[groupKey].cats.add(r.tempCat);
                groupedWaves[groupKey].count++;
            });

            // 3. Сортируем: сначала объединенные волны 1, 2, 3, затем одиночные по алфавиту
            let sortedKeys = Object.keys(groupedWaves).sort((a, b) => {
                let gwA = groupedWaves[a];
                let gwB = groupedWaves[b];
                if (gwA.index !== gwB.index) return gwA.index - gwB.index;
                const catA = Array.from(gwA.cats)[0];
                const catB = Array.from(gwB.cats)[0];
                return catA.localeCompare(catB);
            });

            let container = document.getElementById('waveStartGroups'); 
            container.innerHTML = '';

            sortedKeys.forEach(key => {
                const g = groupedWaves[key];
                
                // Формируем красивое название: "[М] 35-49 + [Ж] 35-49"
                const catsArray = Array.from(g.cats).sort(); 
                const groupName = catsArray.join(' <span style="color:var(--text-muted);">+</span> ');

                const badge = g.isMerged ? `<span style="background:rgba(255,51,102,0.1); color:var(--danger); padding:2px 6px; border-radius:4px; font-size:9px; margin-right:6px; font-weight:800;">ВОЛНА ${g.index}</span>` : '';
                const color = g.isMerged ? 'var(--text-main)' : 'var(--primary)';

                // Безопасно зашиваем массив категорий в HTML атрибут, чтобы функция сохранения знала, кому отдать это время
                const encodedCats = encodeURIComponent(JSON.stringify(catsArray));

                container.innerHTML += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface-hover); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; margin-bottom: 8px;">
                        <div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
                            <div style="font-size: 13px; font-weight: 800; font-family: 'Unbounded'; color: var(--text-main); white-space: normal; line-height: 1.4;">
                                ${badge}<span style="color:${color};">${groupName}</span>
                            </div>
                            <div style="font-size: 11px; color: var(--text-muted); font-family: 'Manrope', sans-serif;">
                                Участников: ${g.count}
                            </div>
                        </div>
                        <input type="text" id="wave-time-${key}" data-cats="${encodedCats}" class="auth-input" 
                               style="width: 100px; margin: 0; background: var(--bg-body); border: 1px solid var(--border); color: var(--text-main); border-radius: 8px; padding: 8px 12px; font-family: 'Roboto Mono', monospace; font-size: 13px; text-align: center; font-weight: bold; outline: none; flex-shrink: 0;" 
                               placeholder="10:00:00">
                    </div>`;
            });
            document.getElementById('waveStartModal').style.display = 'flex';
        } catch (err) {
            console.error(err);
            alert("Ошибка формирования волн");
        } finally {
            if (btn && btn.tagName === 'BUTTON') {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        }
    }
	
    async applyWaveStarts() {
        let riders = [...this.raceRosterList].filter(p => p.isRegistered);
        let timeAssignments = []; // Массив связок: [ {cats: ["[М] 35-49", "[Ж] 35-49"], time: "10:00:00"} ]
        let hasTimes = false;

        const inputs = document.querySelectorAll('[id^="wave-time-"]');
        inputs.forEach(input => {
            let val = input.value.trim();
            if (val) {
                if (val.length === 5) val += ":00";
                
                // Распаковываем категории, которые мы зашили в data-атрибут
                let catsArr = [];
                try {
                    catsArr = JSON.parse(decodeURIComponent(input.getAttribute('data-cats')));
                } catch(e) { console.error("Ошибка чтения категорий", e); }

                if (catsArr.length > 0) {
                    timeAssignments.push({ cats: catsArr, time: val });
                    hasTimes = true;
                }
            }
        });

        if (!hasTimes) return alert("Не указано ни одного времени!");
        const btn = document.getElementById('btn-save-waves'); 
        btn.disabled = true; btn.innerText = "СОХРАНЕНИЕ...";

        let raceObj = null;
        try { raceObj = await pb.collection('races').getOne(this.openedEventId); } catch(e) {}
        const catCalculator = (typeof this.getRaceCategory === 'function') ? this.getRaceCategory.bind(this) : 
                              (window.app && typeof window.app.getRaceCategory === 'function' ? window.app.getRaceCategory.bind(window.app) : null);

        try {
            for (let rider of riders) {
                // Вычисляем ту же самую категорию
                let computedCat = rider.computedCat;
                if (!computedCat) {
                    computedCat = rider.group || 'B';
                    if (raceObj && catCalculator) {
                        try { computedCat = catCalculator({ gender: rider.gender, yob: rider.year, base_cluster: rider.group }, raceObj); } catch (e) {}
                    }
                }

                // 🔥 Ищем, задал ли ты время для волны, в которой есть эта категория
                let assignedTime = null;
                for (let assignment of timeAssignments) {
                    if (assignment.cats.includes(computedCat)) {
                        assignedTime = assignment.time;
                        break;
                    }
                }

                if (assignedTime) {
                    await pb.collection('race_rosters').update(rider.recordId, { planned_start: assignedTime }, { requestKey: null });
                }
            }
            
            alert("✅ Волновые старты успешно сохранены!");
            document.getElementById('waveStartModal').style.display = 'none';
            this.openRaceRoster(this.openedEventId, this.openedEventName, this.openedEventType);
        } catch(e) { 
            alert("❌ Ошибка сохранения"); 
        } finally { 
            btn.disabled = false; btn.innerText = "Назначить"; 
        }
    }
	
	// 🔥 РУЧНОЙ ЗАПУСК ГОНКИ В РЕЖИМ LIVE
    async startManualLiveRace(raceId) {
        if (!confirm("🚀 Внимание! Перевести гонку в режим LIVE и закрыть регистрацию?\n\nВ чат гонки будет отправлено системное оповещение.")) return;

        try {
            // Меняем статус гонки на LIVE
            await pb.collection('races').update(raceId, { status: 'LIVE' }, { requestKey: null });

            try {
                const raceChat = this.app.chats.find(c => c.race_id === raceId);
                const botRider = Object.values(this.app.ridersMap).find(r => r.email === 'bot@sotka.one');
                if (raceChat && botRider) {
                    await pb.collection('messages').create({
                        chat_id: raceChat.id,
                        sender_id: botRider.id,
                        text: `⏱ ГОНКА ЗАПУЩЕНА!\n\nСтартовый протокол зафиксирован. Участники уходят на дистанцию согласно расписанию.\n\n[ACTION:LIVE:${raceId}]`
                    }, { requestKey: null });
                }
            } catch(botErr) { console.error("Ошибка отправки ботом", botErr); }

            alert("✅ Гонка успешно переведена в статус LIVE!");
            this.openRaceRoster(this.openedEventId, this.openedEventName, this.openedEventType);
            
            // Обновляем чаты, чтобы красные кнопки синхронизировались
            if (this.app && typeof this.app.loadChats === 'function') {
                this.app.loadChats();
            }
        } catch(e) {
            console.error("Ошибка старта:", e);
            alert("❌ Ошибка при запуске гонки.");
        }
    }

async finalizeRaceProcess(raceId) {
        if (!confirm("⚠️ ВНИМАНИЕ: Это действие перенесет результаты из Лайв-борда в профили спортсменов, начислит очки и подведет итоги Драфта. Продолжить?")) return;

        if (typeof showVilkaSplash === 'function') showVilkaSplash(); 

        try {
            // 1. Получаем гонку и её лайв-борд
            const race = await pb.collection('races').getOne(raceId, { expand: 'rating_rule_id', requestKey: null });
            let liveBoard = race.live_board;

            if (!liveBoard || !Array.isArray(liveBoard) || liveBoard.length === 0) {
                throw new Error("Лайв-борд пуст. Данных для переноса нет.");
            }

            // 🔥 МАГИЯ 1: Достаем правила начисления очков
            let pSys = {};
            if (race.expand?.rating_rule_id && race.expand.rating_rule_id.config) {
                let cfg = race.expand.rating_rule_id.config;
                pSys = typeof cfg === 'string' ? JSON.parse(cfg) : cfg;
            } else {
                pSys = this.app.DEFAULT_RATING_RULES || {
                    mass_start_banks: { 'A+': 1000, 'A': 800, 'B': 600, 'C': 400, 'D': 200, 'E': 200, 'O': 200, 'V': 400 },
                    decay_factor: 0.85
                };
            }

            const isMassStart = race.format === 'mass' || race.format === 'crit';
            const raceDistance = race.distance || 0;
            const multiplier = pSys.multiplier !== undefined ? parseFloat(pSys.multiplier) : 1.0;
            const isPerformance = (!pSys.calc_type || pSys.calc_type === 'performance');

            // 2. Получаем все заявки на эту гонку
            const rosters = await pb.collection('race_rosters').getFullList({
                filter: `race_id="${raceId}"`, expand: 'rider_id', requestKey: null
            });

            let updatedCount = 0;
            let clusterPositions = {}; // Отслеживаем занятые места в каждой категории

            // 3. Распаковываем JSON по гонщикам и считаем очки!
            for (let result of liveBoard) {
                let rosterEntry = rosters.find(r => r.bib && r.bib === result.bib);
                
                if (!rosterEntry && result.name) {
                    rosterEntry = rosters.find(r => {
                        if (!r.expand?.rider_id) return false;
                        const dbName = `${r.expand.rider_id.last_name} ${r.expand.rider_id.first_name}`.trim().toLowerCase();
                        const dbNameRev = `${r.expand.rider_id.first_name} ${r.expand.rider_id.last_name}`.trim().toLowerCase();
                        const resName = result.name.trim().toLowerCase();
                        return dbName === resName || dbNameRev === resName;
                    });
                }

                if (rosterEntry) {
                    const timeMs = result.lapTimes && result.lapTimes.length > 0 ? result.lapTimes[result.lapTimes.length - 1] : 0;
                    const status = (result.timeStr === 'DNF' || result.timeStr === 'DSQ') ? 'dnf' : 'finished';
                    const speed = parseFloat(result.speed) || 0;
                    const baseCluster = result.baseCluster || rosterEntry.expand?.rider_id?.base_cluster || 'B';
                    
                    let points = parseInt(result.points) || 0;

                    // 🔥 МАГИЯ 2: Если очков в JSON нет (скопировано во время LIVE), СЧИТАЕМ САМИ!
                    if (status === 'finished' && points === 0) {
                        if (isMassStart) {
                            if (!clusterPositions[baseCluster]) clusterPositions[baseCluster] = 1;
                            const position = clusterPositions[baseCluster]++; // Берем место и увеличиваем счетчик

                            let customBanks = pSys.banks || pSys.mass_start_banks || pSys.cluster_banks || { 'A+': 1000, 'A': 800, 'B': 600, 'C': 400, 'D': 200, 'E': 200, 'O': 200, 'V': 400 };
                            let baseBank = customBanks[baseCluster] || customBanks['C'] || 400;
                            let decay = pSys.decay_factor !== undefined ? parseFloat(pSys.decay_factor) : 0.85;
                            
                            points = Math.max(1, Math.round(baseBank * Math.pow(decay, position - 1)));
                        } else {
                            if (isPerformance && speed > 0) {
                                points = Math.round(raceDistance * speed * multiplier);
                            }
                        }
                    }

                    // Перезаписываем очки обратно в объект результата, чтобы сохранить в БД
                    result.points = points; 

                    // А) Обновляем заявку (race_rosters)
                    await pb.collection('race_rosters').update(rosterEntry.id, {
                        status: status,
                        time_ms: timeMs,
                        laps: result.laps || 1,
                        earned_points: points,
                        final_cluster: result.category,
                        speed: speed
                    }, { requestKey: null });

                    // Б) Обновляем глобальный рейтинг гонщика (riders)
                    if (status === 'finished' && rosterEntry.expand?.rider_id) {
                        const rider = rosterEntry.expand.rider_id;
                        let updatePayload = { rating: (rider.rating || 0) + points };
                        
                        // Поднимаем кластер, если он вырос
                        if (result.recCluster && result.recCluster !== '-') {
                            const clusterRanks = { 'O':0, 'E':1, 'D':2, 'C':3, 'B':4, 'A':5, 'A+':6, 'V':7 };
                            if (clusterRanks[result.recCluster] > (clusterRanks[rider.base_cluster] || 0)) {
                                updatePayload.base_cluster = result.recCluster;
                            }
                        }
                        
                        // Рейтинг по типу покрытия
                        const surfKey = `rating_${race.surface || 'road'}`;
                        if (rider[surfKey] !== undefined) {
                            updatePayload[surfKey] = rider[surfKey] + points;
                        }

                        await pb.collection('riders').update(rider.id, updatePayload, { requestKey: null });
                    }
                    updatedCount++;
                }
            }

            // 🔥 МАГИЯ 3: ОБНОВЛЕНИЕ РЕЙТИНГА КОМАНД (КЛУБОВ)
            try {
                const teamIdsToUpdate = [...new Set(rosters.map(r => r.expand?.rider_id?.team_id).flat().filter(Boolean))];
                for (let tId of teamIdsToUpdate) {
                    const teamRiders = await pb.collection('riders').getFullList({ filter: `team_id ~ "${tId}"`, requestKey: null });
                    const teamTotal = teamRiders.reduce((sum, r) => sum + (r.rating || 0), 0);
                    await pb.collection('teams').update(tId, { points: teamTotal }, { requestKey: null });
                }
            } catch(e) { console.warn("Командные очки не обновлены:", e); }

            // 4. ПОДВЕДЕНИЕ ИТОГОВ ДРАФТА
            try {
                const draftConfigs = await pb.collection('draft_configs').getFullList({ filter: `race_id="${raceId}"`, requestKey: null });
                if (draftConfigs.length > 0) {
                    const draftRosters = await pb.collection('draft_rosters').getFullList({ filter: `race_id="${raceId}"`, requestKey: null });
                    const updatedRaceRosters = await pb.collection('race_rosters').getFullList({ filter: `race_id="${raceId}"`, requestKey: null });

                    for (const dr of draftRosters) {
                        const teamRiders = [dr.rider_1, dr.rider_2, dr.rider_3].filter(Boolean);
                        let totalLaps = 0; let totalTime = 0;

                        for (const tId of teamRiders) {
                            const rRes = updatedRaceRosters.find(x => x.rider_id === tId);
                            if (rRes) {
                                totalLaps += (rRes.laps || 0);
                                totalTime += (rRes.time_ms || 0);
                            }
                        }
                        await pb.collection('draft_rosters').update(dr.id, { laps_sum: totalLaps, time_sum: totalTime }, { requestKey: null });
                    }
                    
                    // Выключаем турнир, чтобы появилась кнопка ИТОГОВЫЙ ПРОТОКОЛ
                    await pb.collection('draft_configs').update(draftConfigs[0].id, { is_active: false }, { requestKey: null });
                }
            } catch (draftErr) { console.warn("Драфт не обработан:", draftErr); }

            // 5. Меняем статус гонки на Завершена + ПЕРЕЗАПИСЫВАЕМ LIVE_BOARD С ПОДСЧИТАННЫМИ ОЧКАМИ
            await pb.collection('races').update(raceId, { status: 'Finished', live_board: liveBoard }, { requestKey: null });

            alert(`✅ ФИНАЛИЗАЦИЯ ЗАВЕРШЕНА!\n\nПеренесено результатов: ${updatedCount}.\nОчки рассчитаны и начислены.`);
            window.location.reload(); 

        } catch (err) {
            console.error("Ошибка финализации:", err);
            alert("❌ Ошибка: " + err.message);
        } finally {
            if (typeof hideVilkaSplash === 'function') hideVilkaSplash();
        }
    }
	
    async openCreateEventModal(dateStr = null) {
            this.editEventId = null;

            const titleEl = document.querySelector('#createEventModal h3');
            if (titleEl) titleEl.innerText = 'КОНСТРУКТОР ГОНКИ';
            
            const submitBtn = document.querySelector('#createEventModal button[onclick*="submitEvent()"]');
            if (submitBtn) submitBtn.innerText = '🚀 ОПУБЛИКОВАТЬ ГОНКУ';

            // 🔥 ЗАПУСКАЕМ НАШИ НОВЫЕ ИНТЕРФЕЙСЫ
            this.activeDistances = []; // Очищаем массив кругов при новой гонке
this.initDistancesUI();
            this.initTaxonomyUI();
            this.loadRatingRulesUI(''); 

            // Сброс полей ШАГ 1
            const nameEl = document.getElementById('evName');
            if (nameEl) nameEl.value = '';
            if (document.getElementById('evStatus')) document.getElementById('evStatus').value = 'Registration';
            
            const dateEl = document.getElementById('evDate');
            if (dateEl) {
                if (dateStr) {
                    try {
                        const d = new Date(dateStr);
                        d.setHours(10, 0, 0, 0); // По умолчанию ставим на 10:00 утра
                        const offset = d.getTimezoneOffset() * 60000;
                        dateEl.value = (new Date(d - offset)).toISOString().slice(0, 16);
                    } catch(e) { dateEl.value = ''; }
                } else {
                    dateEl.value = '';
                }
            }

            const roles = this.app.usersMap[this.app.currentRider?.email] || []; 
            const rStr = JSON.stringify(roles); 
            const isAdmin = rStr.includes('superadmin') || rStr.includes('admin');

            const levelSelect = document.getElementById('evLevel'); 
            if (levelSelect) {
				const myTeams = Array.isArray(this.app.currentRider?.team_id) ? this.app.currentRider.team_id : (this.app.currentRider?.team_id ? [this.app.currentRider.team_id] : []);
                levelSelect.innerHTML = '';
                if (isAdmin) levelSelect.innerHTML += `<option value="peloton">Официальная Гонка</option>`;
                if (myTeams.length > 0) levelSelect.innerHTML += `<option value="team">Командная Тренировка</option>`;
                levelSelect.innerHTML += `<option value="personal">Личный выезд</option>`;
                levelSelect.value = isAdmin ? 'peloton' : 'personal'; // В openEditEventModal тут будет race.level || 'personal';
            }

            // Сброс полей ШАГ 2
if (document.getElementById('evSurface')) document.getElementById('evSurface').value = 'road';
if (document.getElementById('evFormat')) document.getElementById('evFormat').value = 'mass';
if (document.getElementById('evLapLength')) document.getElementById('evLapLength').value = '';
            
            // Сброс полей ШАГ 3
            if (document.getElementById('evCatLogic')) document.getElementById('evCatLogic').value = 'clusters';
            if (document.getElementById('evMaxRiders')) document.getElementById('evMaxRiders').value = '';

            // Сброс полей ШАГ 4
            if (document.getElementById('evIsPublic')) document.getElementById('evIsPublic').checked = false; 

            // 🔥 ФИЛЬТР ПЕЛОТОНОВ ДЛЯ ПУБЛИКАЦИИ ГОНКИ
            const myId = this.app.currentRider?.id;
            const myUserId = pb.authStore.model?.id;
            const myRoles = this.app.usersMap[this.app.currentRider?.email] || [];
            const amISuper = JSON.stringify(myRoles).includes('superadmin');

            const pelotonsForPublish = Object.values(this.app.pelotonsMap).filter(p => {
                if (amISuper) return true; // Бог публикует везде
                if (p.admin_id) {
                    const adminIds = Array.isArray(p.admin_id) ? p.admin_id : [p.admin_id];
                    if (adminIds.includes(myId) || adminIds.includes(myUserId)) return true; // Админ только в своих
                }
                return false; // В чужие публичные лиги лезть нельзя!
            });

            // Пелотон
            const pelotonSelectEl = document.getElementById('evPeloton');
            if (pelotonSelectEl) {
                pelotonSelectEl.innerHTML = '<option value="" disabled selected>Выберите лигу...</option>' + 
                    pelotonsForPublish.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
                pelotonSelectEl.value = '';
				this.loadCups(null);
                pelotonSelectEl.onchange = (e) => {
                    this.loadCups(e.target.value);
                };
            }

            if (isAdmin) {
                // Асинхронно подтягиваем судей
                pb.collection('users').getFullList({ filter: `role ~ "judge"`, requestKey:null }).then(judges => {
                    const judgeEl = document.getElementById('evJudge');
                    if (judgeEl) {
judgeEl.innerHTML = `<option value="">Выберите Судью...</option>` + judges.map(j => `<option value="${j.id}">${j.name || j.username || 'Судья'}</option>`).join('');
                    }
                }).catch(e => {});

                if(document.getElementById('evAllowedTypes')) document.getElementById('evAllowedTypes').value = 'team,gruppetto';
            }
            
            // Включаем нужные поля
            this.toggleEventFields(); 
            
            // Открываем модалку на первом шаге
            if (typeof this.switchConstructorStep === 'function') this.switchConstructorStep(1);
            
            const modalEl = document.getElementById('createEventModal');
            if (modalEl) modalEl.style.display = 'flex';
        }

    async openEditEventModal(raceId) {
            const race = this.dataCalendar.find(r => r.id === raceId);
            if (!race) return;
            this.editEventId = raceId;

            const titleEl = document.querySelector('#createEventModal h3');
            if (titleEl) titleEl.innerText = 'РЕДАКТИРОВАНИЕ';
            
            const submitBtn = document.querySelector('#createEventModal button[onclick*="submitEvent()"]');
            if (submitBtn) submitBtn.innerText = '💾 СОХРАНИТЬ ИЗМЕНЕНИЯ';

            // 🔥 ЗАПУСКАЕМ ИНТЕРФЕЙСЫ (До загрузки данных!)
            this.initDistancesUI(); 
            this.initTaxonomyUI();

            // ШАГ 1: БАЗА
            const nameEl = document.getElementById('evName');
            if (nameEl) nameEl.value = race.name || '';
            
            if (document.getElementById('evStatus')) document.getElementById('evStatus').value = race.status || 'Registration';
            
            try {
                const d = new Date(race.rawDate);
                const offset = d.getTimezoneOffset() * 60000;
                const localISOTime = (new Date(d - offset)).toISOString().slice(0, 16);
                const dateEl = document.getElementById('evDate');
                if (dateEl) dateEl.value = localISOTime;
            } catch(e) {}

            const roles = this.app.usersMap[this.app.currentRider?.email] || []; 
            const rStr = JSON.stringify(roles); 
            const isAdmin = rStr.includes('superadmin') || rStr.includes('admin');

            const levelSelect = document.getElementById('evLevel'); 
            if (levelSelect) {
                // 🔥 ФИКС: Правильная проверка наличия команды
                const myTeams = Array.isArray(this.app.currentRider?.team_id) ? this.app.currentRider.team_id : (this.app.currentRider?.team_id ? [this.app.currentRider.team_id] : []);
                
                levelSelect.innerHTML = '';
                if (isAdmin) levelSelect.innerHTML += `<option value="peloton">Официальная Гонка</option>`;
                if (myTeams.length > 0) levelSelect.innerHTML += `<option value="team">Командная Тренировка</option>`;
                levelSelect.innerHTML += `<option value="personal">Личный выезд</option>`;
                levelSelect.value = race.level || 'personal'; // В openEditEventModal тут будет race.level || 'personal';
            }

            // ШАГ 2: МАРШРУТ И ФОРМАТ
if (document.getElementById('evSurface')) document.getElementById('evSurface').value = race.surface || 'road';

// 🔥 ТЕПЕРЬ СТРОГО БЕРЕМ ИЗ БАЗЫ БЕЗ КОСТЫЛЕЙ
let formatVal = race.format || 'mass'; 

if (document.getElementById('evFormat')) {
    document.getElementById('evFormat').value = formatVal;
}

            // ШАГ 4: ОРГАНИЗАЦИЯ
            if (document.getElementById('evIsPublic')) document.getElementById('evIsPublic').checked = race.is_public || false; 

            // ПОДТЯГИВАЕМ ПОЛНЫЕ ДАННЫЕ ИЗ БАЗЫ
try {
    const fullRace = await pb.collection('races').getOne(raceId, {requestKey: null});
    
    if(fullRace.surface && document.getElementById('evSurface')) document.getElementById('evSurface').value = fullRace.surface;
    if(fullRace.format && document.getElementById('evFormat')) document.getElementById('evFormat').value = fullRace.format;
    if(fullRace.laps && document.getElementById('evLaps')) document.getElementById('evLaps').value = fullRace.laps;
                if(fullRace.cat_logic && document.getElementById('evCatLogic')) document.getElementById('evCatLogic').value = fullRace.cat_logic;
                if(fullRace.max_riders && document.getElementById('evMaxRiders')) document.getElementById('evMaxRiders').value = fullRace.max_riders;
				if(fullRace.squad_max && document.getElementById('newDistSquadInput')) document.getElementById('newDistSquadInput').value = fullRace.squad_max;
                
                // 🔥 ЗАГРУЖАЕМ ДЛИНУ КРУГА И МАССИВ ДИСТАНЦИЙ
                if (document.getElementById('evLapLength')) {
                    let laps = fullRace.laps || 1;
                    let dist = fullRace.distance || 0;
                    let lapLen = (dist / laps).toFixed(2);
                    document.getElementById('evLapLength').value = lapLen > 0 ? lapLen : dist;
                }
                
                // Генерируем один точный тег для конкретной редактируемой гонки
                this.activeDistances = [{
                    id: 'd_edit_1',
                    name: (fullRace.name && fullRace.name.includes('[')) ? fullRace.name.split('[')[1].replace(']', '') : 'Основная',
                    laps: fullRace.laps || 1,
                    rule_id: fullRace.rating_rule_id || '',
                    rule_name: "Текущее правило",
                    cat_logic: fullRace.cat_logic || 'clusters',
                    cat_name: "Настройка",
                    squad_max: fullRace.squad_max || 1
					
                }];
                this.renderDistanceObjTags();
				// 🔥 ФИКС 1: ВОССТАНАВЛИВАЕМ НАСТРОЙКИ СЕЛЕКТОВ ИЗ БД
                if (document.getElementById('newDistCatLogicInput')) document.getElementById('newDistCatLogicInput').value = fullRace.cat_logic || 'clusters';
                if (document.getElementById('newDistLapsInput')) document.getElementById('newDistLapsInput').value = fullRace.laps || 1;
                
                setTimeout(() => {
                    if (document.getElementById('newDistRuleInput') && fullRace.rating_rule_id) {
                        document.getElementById('newDistRuleInput').value = fullRace.rating_rule_id;
                    }
                }, 500);

                // 🔥 ФИЛЬТР ПЕЛОТОНОВ ПРИ РЕДАКТИРОВАНИИ
                const myId = this.app.currentRider?.id;
                const myUserId = pb.authStore.model?.id;
                const myRoles = this.app.usersMap[this.app.currentRider?.email] || [];
                const amISuper = JSON.stringify(myRoles).includes('superadmin');

                const pelotonsForPublish = Object.values(this.app.pelotonsMap).filter(p => {
                    if (amISuper) return true;
                    if (p.admin_id) {
                        const adminIds = Array.isArray(p.admin_id) ? p.admin_id : [p.admin_id];
                        if (adminIds.includes(myId) || adminIds.includes(myUserId)) return true;
                    }
                    return false;
                });

                // Пелотон
                const pelotonSelectEl = document.getElementById('evPeloton');
                let pIdStr = "";
                if (pelotonSelectEl) {
                    pelotonSelectEl.innerHTML = '<option value="" disabled selected>Выберите лигу...</option>' + 
                        pelotonsForPublish.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
                        
                    if (fullRace.peloton_id) pIdStr = Array.isArray(fullRace.peloton_id) ? fullRace.peloton_id[0] : fullRace.peloton_id;
                    pelotonSelectEl.value = pIdStr;

                    // 🔥 Слушаем изменение пелотона при редактировании
                    pelotonSelectEl.onchange = (e) => {
                        this.loadCups(e.target.value);
                    };
                }

                // 🔥 Подгружаем Кубки для текущей гонки
                let cupIdStr = "";
                if (fullRace.cup_id) cupIdStr = Array.isArray(fullRace.cup_id) ? fullRace.cup_id[0] : fullRace.cup_id;
                this.loadCups(pIdStr, cupIdStr);
                
                // 🔥 Подгружаем библиотеку правил
                this.loadRatingRulesUI(fullRace.rating_rule_id || '');

                if (isAdmin) {
                    const judges = await pb.collection('users').getFullList({ filter: `role ~ "judge"`, requestKey:null });
                    const judgeEl = document.getElementById('evJudge');
                    if (judgeEl) {
                        judgeEl.innerHTML = `<option value="">Выберите Судью...</option>` + judges.map(j => `<option value="${j.id}">${j.name || j.username || 'Судья'}</option>`).join('');
                        if(fullRace.judge_id) judgeEl.value = fullRace.judge_id;
                    }

                    if(fullRace.allowed_types && document.getElementById('evAllowedTypes')) {
                        let aTypes = Array.isArray(fullRace.allowed_types) ? fullRace.allowed_types.join(',') : fullRace.allowed_types;
                        if(aTypes.includes('gruppetto')) document.getElementById('evAllowedTypes').value = 'team,gruppetto';
                        else document.getElementById('evAllowedTypes').value = 'team';
                    }
                }
            } catch(e) {
                console.error("Не удалось загрузить полные данные гонки", e);
            }
            
            this.toggleEventFields(); 
            
            if (typeof this.switchConstructorStep === 'function') this.switchConstructorStep(1);
            
            const modalEl = document.getElementById('createEventModal');
            if (modalEl) modalEl.style.display = 'flex';
        }

    toggleEventFields() { 
            const lvl = document.getElementById('evLevel').value; 
            const isPeloton = (lvl === 'peloton');
            const isTeam = (lvl === 'team');
            
            const oldType = document.getElementById('evType');
            if (oldType) oldType.style.display = 'none'; 
            
            // 🔥 ПРЯЧЕМ ИЛИ ПОКАЗЫВАЕМ БЛОК ПРАВИЛ РЕЙТИНГА
            const ruleWrap = document.getElementById('ratingRuleWrapper');
            if (ruleWrap) {
                ruleWrap.style.display = isPeloton ? 'block' : 'none'; 
            }
            
            document.getElementById('evPeloton').style.display = (isPeloton || isTeam) ? 'block' : 'none'; 
            document.getElementById('evJudge').style.display = isPeloton ? 'block' : 'none'; 
            
            if (document.getElementById('evAllowedTypesLabel')) document.getElementById('evAllowedTypesLabel').style.display = isPeloton ? 'block' : 'none';
            if (document.getElementById('evAllowedTypes')) document.getElementById('evAllowedTypes').style.display = isPeloton ? 'block' : 'none';
            
            if (document.getElementById('evIsPublicLabel')) document.getElementById('evIsPublicLabel').style.display = isTeam ? 'flex' : 'none';
        }

// 🔥 УПРАВЛЕНИЕ ШАГАМИ КОНСТРУКТОРА ГОНКИ
        changeStep(direction) {
            let nextStep = (this.currentStep || 1) + direction;
            if (nextStep < 1) nextStep = 1;
            if (nextStep > 4) nextStep = 4;
            this.switchConstructorStep(nextStep);
        }

        switchConstructorStep(step) {
            this.currentStep = step;
            
            // Переключаем видимость блоков контента и стили вкладок
            for (let i = 1; i <= 4; i++) {
                const content = document.getElementById(`stepContent${i}`);
                const btn = document.getElementById(`stepBtn${i}`);
                
                if (content) {
                    content.style.display = (i === step) ? 'block' : 'none';
                }
                
                if (btn) {
                    if (i === step) {
                        btn.classList.add('active');
                        btn.style.background = 'var(--primary)';
                        btn.style.color = '#000';
                        btn.style.borderColor = 'var(--primary)';
                    } else {
                        btn.classList.remove('active');
                        btn.style.background = 'transparent';
                        btn.style.color = 'var(--text-muted)';
                        btn.style.borderColor = 'var(--border)';
                    }
                }
            }
            
            // Скрываем/показываем нижние кнопки Назад и Далее
            const prevBtn = document.getElementById('btnPrevStep');
            const nextBtn = document.getElementById('btnNextStep');
            
            if (prevBtn) prevBtn.style.visibility = (step === 1) ? 'hidden' : 'visible';
            
            // На последнем шаге скрываем "ДАЛЕЕ", так как там появляется огромная кнопка "ОПУБЛИКОВАТЬ"
            if (nextBtn) nextBtn.style.display = (step === 4) ? 'none' : 'block';
        }

async submitEvent() {
        try {
            const nameEl = document.getElementById('evName');
            const dateEl = document.getElementById('evDate');
            const levelEl = document.getElementById('evLevel');
            const cupEl = document.getElementById('evCup');
            const cupId = (cupEl && cupEl.value) ? cupEl.value : null;
            
            const name = nameEl ? nameEl.value.trim() : '';
            const date = dateEl ? dateEl.value : '';
            const level = levelEl ? levelEl.value : 'personal';
            
            const surfaceEl = document.getElementById('evSurface');
            const formatEl = document.getElementById('evFormat');
            const maxRidersEl = document.getElementById('evMaxRiders');
            const statusEl = document.getElementById('evStatus');
            const isPublicEl = document.getElementById('evIsPublic');
            const ratingRuleEl = document.getElementById('evRatingRule');
            const lapLengthEl = document.getElementById('evLapLength'); 

            const surface = surfaceEl ? surfaceEl.value : 'road';
            const discipline = formatEl ? formatEl.value : 'mass';
            const maxRiders = maxRidersEl && maxRidersEl.value ? parseInt(maxRidersEl.value) : 0;
            const newStatus = statusEl ? statusEl.value : 'Registration';
            const isPublic = isPublicEl ? isPublicEl.checked : false;
            const ratingRuleId = (ratingRuleEl && ratingRuleEl.value) ? ratingRuleEl.value : ""; 
            const lapLengthStr = lapLengthEl ? lapLengthEl.value : '';
            const lapLength = lapLengthStr ? parseFloat(lapLengthStr) : 0; 

            const pelotonEl = document.getElementById('evPeloton');
            const allowedTypesEl = document.getElementById('evAllowedTypes');
            const judgeEl = document.getElementById('evJudge');

            const pelotonId = pelotonEl ? pelotonEl.value : '';
            const allowedTypesRaw = allowedTypesEl ? allowedTypesEl.value : 'team,gruppetto';
            const judgeId = judgeEl ? judgeEl.value : '';

            if (!name || !date) {
                if (typeof this.switchConstructorStep === 'function') this.switchConstructorStep(1);
                return alert("Укажите название и дату на шаге 1!");
            }
            
            if (isNaN(lapLength)) {
                if (typeof this.switchConstructorStep === 'function') this.switchConstructorStep(2);
                return alert("Укажите длину одного круга на шаге 2 (можно 0)!");
            }
            
            if (!this.activeDistances || this.activeDistances.length === 0) {
                if (typeof this.switchConstructorStep === 'function') this.switchConstructorStep(2);
                return alert("Пожалуйста, добавьте хотя бы одну дистанцию на шаге 2!");
            }

            // Пакет базовых данных (БЕЗ мусора, только то, что понимает PocketBase)
            const baseData = { 
                date: new Date(date).toISOString(), 
                level: level, 
                status: newStatus, 
                is_public: isPublic,
                surface: surface,
                format: discipline, 
                max_riders: maxRiders,
                cup_id: cupId,
                judge_id: judgeId
            };

            if (level === 'peloton') {
                if (!pelotonId) return alert("Выберите Лигу/Пелотон!");
                baseData.peloton_id = pelotonId;
                baseData.team_id = ""; 
                baseData.allowed_types = allowedTypesRaw ? allowedTypesRaw.split(',') : [];
            } else if (level === 'team') {
                if (!pelotonId) return alert("Выберите Лигу (в рамках которой создается тренировка)!");
                const myTeams = Array.isArray(this.app.currentRider?.team_id) ? this.app.currentRider.team_id : (this.app.currentRider?.team_id ? [this.app.currentRider.team_id] : []);
                const activeTeamId = myTeams.find(id => this.app.teamsMap[id]?.peloton_id === pelotonId) || myTeams[0];
                if (!activeTeamId) return alert("❌ У вас нет команды в выбранной Лиге!");
                
                baseData.peloton_id = pelotonId;
                baseData.team_id = activeTeamId; 
                baseData.allowed_types = [];
            } else {
                baseData.peloton_id = "";
                baseData.team_id = "";
                baseData.allowed_types = [];
            }

            if (this.editEventId) {
                // --- РЕЖИМ РЕДАКТИРОВАНИЯ ---
                
                // 1. ЗАПОМИНАЕМ СТАРЫЙ СТАТУС ПЕРЕД ОБНОВЛЕНИЕМ
                let oldStatus = '';
                try {
                    const oldRace = await pb.collection('races').getOne(this.editEventId, { requestKey: null });
                    oldStatus = oldRace.status;
                } catch(e) {}

                const distObj = this.activeDistances[0];
                let finalDist = 0; let finalLaps = 1; let finalRuleId = ratingRuleId; let finalCatLogic = 'clusters';

                // 🔥 ФИКС 2: БЕРЕМ АКТУАЛЬНЫЕ ДАННЫЕ ПРЯМО ИЗ ФОРМЫ (ИГНОРИРУЯ ТЕГИ ПРИ РЕДАКТИРОВАНИИ)
                const uiCatLogic = document.getElementById('newDistCatLogicInput') ? document.getElementById('newDistCatLogicInput').value : null;
                const uiRuleId = document.getElementById('newDistRuleInput') ? document.getElementById('newDistRuleInput').value : null;
                const uiLapsInput = document.getElementById('newDistLapsInput');
                const uiLaps = uiLapsInput && uiLapsInput.value ? parseInt(uiLapsInput.value) : null;
				const uiSquadInput = document.getElementById('newDistSquadInput');
                const uiSquad = uiSquadInput && uiSquadInput.value ? parseInt(uiSquadInput.value) : null;

                if (distObj) {
                    if (this.activeDistances.length === 1 && distObj.id === 'd_edit_1') {
                        // Это режим редактирования, берем свежие значения из инпутов!
                        finalCatLogic = uiCatLogic || distObj.cat_logic;
                        finalRuleId = uiRuleId !== null ? uiRuleId : distObj.rule_id;
                        finalLaps = uiLaps || distObj.laps || 1;
                        finalDist = lapLength > 0 ? lapLength * finalLaps : 0;
                    } else {
                        finalLaps = distObj.laps || 1;
                        finalDist = lapLength > 0 ? lapLength * finalLaps : 0;
                        if (distObj.rule_id) finalRuleId = distObj.rule_id;
                        if (distObj.cat_logic) finalCatLogic = distObj.cat_logic;
                    }
                } else {
                    finalCatLogic = uiCatLogic || 'clusters';
                    finalRuleId = uiRuleId || ratingRuleId;
                }

                let raceData = { 
                    ...baseData, 
                    name: name, 
                    distance: finalDist,
                    laps: finalLaps,
                    rating_rule_id: finalRuleId,
                    cat_logic: finalCatLogic,
					squad_max: uiSquad !== null ? uiSquad : (distObj ? distObj.squad_max : 1)
                };
                
                await pb.collection('races').update(this.editEventId, raceData, { requestKey: null });
                
                // 2. ЕСЛИ СТАТУС ИЗМЕНИЛСЯ СО "СКОРО" НА "REGISTRATION" — ПУБЛИКУЕМ!
                if (oldStatus === 'Скоро' && newStatus === 'Registration') {
                    try {
                        // Ищем чат, привязанный к этой гонке
                        const raceChat = this.app.chats.find(c => c.type === 'global' && c.race_id === this.editEventId);
                        const bot = await pb.collection('riders').getFirstListItem('email="bot@sotka.one"', { requestKey: null });
                        
                        if (raceChat && bot) {
                            // А. Добавляем кнопку в шторку чата
                            const panelData = {
                                text: "Выберите дистанцию для заявки:",
                                buttons: [{
                                    label: `ЗАЯВИТЬСЯ`,
                                    url: `[ACTION:REGISTER:${this.editEventId}]`,
                                    blank: false
                                }]
                            };
                            
                            await pb.collection('chats').update(raceChat.id, { 
                                panel_data: JSON.stringify(panelData),
                                updated: new Date().toISOString()
                            }, { requestKey: null });

                            // Б. Бот пишет радостное сообщение с кнопкой
                            const botText = `🔥 ОТКРЫТА РЕГИСТРАЦИЯ!\n\nОрганизатор открыл регистрацию на событие: **${name.toUpperCase()}**.\n\nВыберите заезд и подайте заявку в один клик:\n\n🏁 **${name}**\n[ACTION:REGISTER:${this.editEventId}]\n\n`;
                            
                            await pb.collection('messages').create({
                                chat_id: raceChat.id,
                                sender_id: bot.id,
                                text: botText,
                                is_announcement: true // Красивая красная рамочка
                            }, { requestKey: null });

                            // В. Отправляем PUSH умным способом
                            if (typeof this.app.sendPushNotification === 'function') {
                                let targetUserIds = [];
                                let shouldSendPush = true;

                                if (level === 'personal') {
                                    shouldSendPush = false;
                                } 
                                else if (level === 'team') {
                                    const teamId = baseData.team_id;
                                    const allowedRiders = Object.values(this.app.ridersMap).filter(r => {
                                        const rTeams = Array.isArray(r.team_id) ? r.team_id : (r.team_id ? [r.team_id] : []);
                                        return rTeams.includes(teamId);
                                    });
                                    targetUserIds = allowedRiders.map(r => r.user_id).filter(Boolean);
                                    if (targetUserIds.length === 0) targetUserIds = ['empty_team_push'];
                                } 
                                else if (level === 'peloton') {
                                    const targetPeloton = this.app.pelotonsMap[pelotonId];
                                    if (targetPeloton && targetPeloton.is_private) {
                                        const allowedRiders = Object.values(this.app.ridersMap).filter(r => {
                                            const rTeams = Array.isArray(r.team_id) ? r.team_id : (r.team_id ? [r.team_id] : []);
                                            return rTeams.some(tId => {
                                                const t = this.app.teamsMap[tId];
                                                const tPels = t ? (Array.isArray(t.peloton_id) ? t.peloton_id : [t.peloton_id]) : [];
                                                return tPels.includes(pelotonId);
                                            });
                                        });
                                        targetUserIds = allowedRiders.map(r => r.user_id).filter(Boolean);
                                        if (targetUserIds.length === 0) targetUserIds = ['empty_private_peloton'];
                                    }
                                }

                                if (shouldSendPush) {
                                    this.app.sendPushNotification(
                                        "🔥 ОТКРЫТА РЕГИСТРАЦИЯ!", 
                                        `На событие ${name.toUpperCase()} открыта подача заявок!`, 
                                        targetUserIds, 
                                        `https://vilka.sotka.one/?chat=${raceChat.id}`
                                    );
                                }
                            }
                        }
                    } catch(err) {
                        console.warn("Не удалось отправить сообщение об открытии регистрации:", err);
                    }
                }

                alert(`✅ Событие успешно обновлено!`);
                
            } else {
                // --- РЕЖИМ СОЗДАНИЯ С НУЛЯ ---
                const createdRaces = [];
                for (let distObj of this.activeDistances) {
                    let finalName = this.activeDistances.length > 1 ? `${name} [${distObj.name}]` : name;
                    let finalLaps = distObj.laps || 1;
                    let finalDist = lapLength > 0 ? lapLength * finalLaps : 0;
                    let finalRuleId = distObj.rule_id || ratingRuleId;
                    let finalCatLogic = distObj.cat_logic || 'clusters';

                    let raceData = { 
                        ...baseData, 
                        name: finalName, 
                        distance: finalDist,
                        laps: finalLaps,
                        rating_rule_id: finalRuleId,
                        cat_logic: finalCatLogic,
						squad_max: distObj.squad_max || 1
                    };
                    
                    const newRace = await pb.collection('races').create(raceData, { requestKey: null });
                    createdRaces.push(newRace);
                }

                if (level === 'peloton' && createdRaces.length > 0) {
                    const firstRaceId = createdRaces[0].id;
                    const d = new Date(date);
                    const chatDate = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
                    const chatName = `${name.toUpperCase()} ${chatDate} ${d.getFullYear()}`;

                    try {
                        const bot = await pb.collection('riders').getFirstListItem('email="bot@sotka.one"', { requestKey: null });
                        
                        let botText = "";
                        let panelButtons = [];
                        let isAnnounceFlag = false;

                        // ЕСЛИ РЕГИСТРАЦИЯ ОТКРЫТА
                        if (newStatus === 'Registration') {
                            isAnnounceFlag = true; 
                            botText = "🔥 ОТКРЫТА РЕГИСТРАЦИЯ!\n\nОрганизатор открыл регистрацию на событие: **" + name.toUpperCase() + "**.\n\nВыберите заезд и подайте заявку в один клик:\n\n";
                            
                            for (let r of createdRaces) {
                            botText += `🏁 **${r.name}**\n[ACTION:REGISTER:${r.id}]\n\n`;
                            
                            let btnText = 'ЗАЯВИТЬСЯ';
                            if (createdRaces.length > 1) {
                                const distMatch = r.name.match(/\[(.*?)\]/);
                                if (distMatch) btnText = `ЗАЯВКА: ${distMatch[1].toUpperCase()}`;
                            }

                            panelButtons.push({
                                label: btnText,
                                url: `[ACTION:REGISTER:${r.id}]`,
                                blank: false
                            });
                        }
                        } 
                        // ЕСЛИ ЭТО АНОНС (СКОРО)
                        else if (newStatus === 'Скоро') {
                            isAnnounceFlag = true; 
                            botText = "⏳ АНОНС СОБЫТИЯ!\n\nОрганизатор добавил в календарь событие: **" + name.toUpperCase() + "**.\n\nРегистрация пока закрыта. Следите за новостями в этом чате, мы сообщим, когда можно будет подать заявку!";
                        }

                        const panelData = {
                            text: newStatus === 'Скоро' ? "Регистрация скоро откроется." : "Выберите дистанцию для заявки:",
                            buttons: panelButtons
                        };

                        // 1. Создаем чат
                        const newChat = await pb.collection('chats').create({
                            type: 'global', name: chatName,
                            peloton_id: pelotonId, race_id: firstRaceId, participants: [bot.id],
                            panel_data: JSON.stringify(panelData) // 🔥 Сохраняем в БД!
                        }, { requestKey: null });

                        // 2. Отправляем сообщение от бота
                        if (botText) {
                            await pb.collection('messages').create({
                                chat_id: newChat.id,
                                sender_id: bot.id,
                                text: botText,
                                is_announcement: isAnnounceFlag 
                            }, { requestKey: null });
                        }
                        
                        await pb.collection('chats').update(newChat.id, { updated: new Date().toISOString() }, { requestKey: null });
                        
                    } catch (e) {
                        console.error("Ошибка создания чата или бота", e);
                    }
                    
                    if (judgeId) {
                        try {
                            const judgeRider = await pb.collection('riders').getFirstListItem(`email="${judgeId}"`, { requestKey: null });
                            await pb.collection('race_rosters').create({
                                race_id: firstRaceId, rider_id: judgeRider.id, status: 'judge'
                            }, { requestKey: null });
                        } catch (e) {}
                    }
                    
                    // В. Отправляем PUSH умным способом
                    if (typeof this.app.sendPushNotification === 'function') {
                        let targetUserIds = [];
                        let shouldSendPush = true;

                        if (level === 'personal') {
                            shouldSendPush = false;
                        } 
                        else if (level === 'team') {
                            const teamId = baseData.team_id;
                            const allowedRiders = Object.values(this.app.ridersMap).filter(r => {
                                const rTeams = Array.isArray(r.team_id) ? r.team_id : (r.team_id ? [r.team_id] : []);
                                return rTeams.includes(teamId);
                            });
                            targetUserIds = allowedRiders.map(r => r.user_id).filter(Boolean);
                            if (targetUserIds.length === 0) targetUserIds = ['empty_team_push'];
                        } 
                        else if (level === 'peloton') {
                            const targetPeloton = this.app.pelotonsMap[pelotonId];
                            
                            if (targetPeloton && targetPeloton.is_private) {
                                const allowedRiders = Object.values(this.app.ridersMap).filter(r => {
                                    const rTeams = Array.isArray(r.team_id) ? r.team_id : (r.team_id ? [r.team_id] : []);
                                    return rTeams.some(tId => {
                                        const t = this.app.teamsMap[tId];
                                        const tPels = t ? (Array.isArray(t.peloton_id) ? t.peloton_id : [t.peloton_id]) : [];
                                        return tPels.includes(pelotonId);
                                    });
                                });
                                targetUserIds = allowedRiders.map(r => r.user_id).filter(Boolean);
                                if (targetUserIds.length === 0) targetUserIds = ['empty_private_peloton'];
                            }
                        }

                        if (shouldSendPush) {
                            // При создании с нуля мы можем получить ID чата только если гонка уровня peloton
                            // (он создается выше).
                            let chatPushUrl = 'https://vilka.sotka.one';
                            try {
                                const createdChat = await pb.collection('chats').getFirstListItem(`race_id="${createdRaces[0].id}"`, { requestKey: null });
                                chatPushUrl = `https://vilka.sotka.one/?chat=${createdChat.id}`;
                            } catch(e) {}
                            
                            this.app.sendPushNotification(
                                "🔥 ОТКРЫТА РЕГИСТРАЦИЯ!", 
                                `На событие ${name.toUpperCase()} открыта подача заявок!`, 
                                targetUserIds, 
                                chatPushUrl
                            );
                        }
                    }
                }
                alert(`✅ Событие успешно опубликовано!\nСоздано заездов: ${createdRaces.length}`);
            }

            document.getElementById('createEventModal').style.display = 'none';
            this.loadData(); 
            
        } catch(e) { 
            console.error("Ошибка PocketBase:", e);
            let detailedMsg = e.message;
            if (e.response && e.response.data) detailedMsg += "\n" + JSON.stringify(e.response.data);
            alert("❌ Ошибка сохранения:\n" + detailedMsg); 
        }
    }
	
	async sendBotRegistrationMessage(raceId, raceName) {
        try {
            const botRider = Object.values(this.app.ridersMap).find(r => r.email === 'bot@sotka.one');
            if (!botRider) return;
            const raceChat = this.app.chats.find(c => c.race_id === raceId);
            if (!raceChat) return;

            // 🔥 1. ЗАПРАШИВАЕМ СТАТУС ГОНКИ ИЗ БАЗЫ
            const race = await pb.collection('races').getOne(raceId, { requestKey: null });

            let msgText = "";

            // 🔥 2. ВЫБИРАЕМ ТЕКСТ В ЗАВИСИМОСТИ ОТ СТАТУСА
            if (race.status === 'Registration') {
                msgText = "🔥 ОТКРЫТА РЕГИСТРАЦИЯ!\n\nОрганизатор открыл регистрацию на гонку: **" + raceName.toUpperCase() + "**.\n\nУспейте занять место в пелотоне. Жмите кнопку ниже, чтобы подать заявку в один клик.\n\n[ACTION:REGISTER:" + raceId + "]";
            } else if (race.status === 'Скоро') {
                msgText = "⏳ АНОНС СОБЫТИЯ!\n\nОрганизатор добавил в календарь событие: **" + raceName.toUpperCase() + "**.\n\nРегистрация пока закрыта. Следите за новостями в этом чате, мы сообщим, когда можно будет подать заявку!";
            } else {
                return; // Для статусов LIVE и Finished боту при создании писать не нужно
            }

            // 3. ОТПРАВЛЯЕМ СООБЩЕНИЕ
            await pb.collection('messages').create({
                chat_id: raceChat.id,
                sender_id: botRider.id,
                text: msgText,
                is_announcement: true // 🔥 Добавили этот флаг, чтобы сообщение было красивым (с рупором и рамкой)
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
    // 🔥 ДИНАМИЧЕСКИЙ КАЛЬКУЛЯТОР КЛАСТЕРОВ (ОБНОВЛЕН)
    // ==========================================
    getClusterBySpeed(speed, gender = 'M', surface = 'road', rules = null) {
        speed = parseFloat(speed); if (!speed || speed <= 0) return 'O';
        const activeRules = rules || this.DEFAULT_RATING_RULES;
        const gKey = (gender === 'F' || gender === 'Ж') ? 'F' : 'M';
        
        let thresholds;
        // 🔥 Проверяем: это новый формат правил (прямые пороги) или старый (по покрытиям)?
        if (activeRules.thresholds && activeRules.thresholds[gKey]) {
            thresholds = activeRules.thresholds[gKey];
        } else {
            // Поддержка старого формата для обратной совместимости
            thresholds = activeRules?.speed_thresholds?.[surface]?.[gKey];
            if (!thresholds) thresholds = activeRules?.speed_thresholds?.['road']?.[gKey] || this.DEFAULT_RATING_RULES.speed_thresholds.road[gKey];
        }

        // Сортируем пороги от самого быстрого к медленному
        const sortedThresholds = Object.entries(thresholds).sort((a, b) => b[1] - a[1]);
        
        for (let [clusterName, minSpeed] of sortedThresholds) {
            if (speed >= minSpeed) return clusterName;
        }
        return 'E'; // Резервный кластер, если ехал медленнее всех порогов
    }
	
	// ==========================================
    // 🔥 УМНОЕ ФОРМАТИРОВАНИЕ НАЗВАНИЙ КОМАНД (ЧЕРЕЗ ЗАПЯТУЮ)
    // ==========================================
    getRiderTeamNames(rider) {
        if (!rider || !rider.team_id) return 'ONE TEAM';
        
        // Превращаем team_id в массив
        const tIds = Array.isArray(rider.team_id) ? rider.team_id : [rider.team_id];
        if (tIds.length === 0) return 'ONE TEAM';
        
        // Ищем названия в карте команд и фильтруем пустые
        const names = tIds.map(id => {
            const team = this.app.teamsMap[id];
            return team ? team.name : null;
        }).filter(Boolean);
        
        // Склеиваем через запятую с пробелом
        return names.length > 0 ? names.join(', ') : 'ONE TEAM';
    }
	
	// 🔥 ГЕНЕРАТОР КАТЕГОРИЙ (С ИСТОРИЧЕСКОЙ ПАМЯТЬЮ ВОЗРАСТА)
    getRaceCategory(rider, race) {
        if (!rider || !race) return '???';
        
        // 1. Определяем логику (добавили поддержку русских слов на всякий случай)
        let logic = race.cat_logic || 'clusters';
        if (logic === 'Кластеры') logic = 'clusters';
        if (logic === 'Возрастные') logic = 'age';
        if (logic === 'Абсолют') logic = 'absolute';
        if (logic === 'Смешанные') logic = 'mixed';

        const g = (rider.gender === 'F' || rider.gender === 'Ж') ? 'F' : 'M';
        const rusG = g === 'M' ? 'М' : 'Ж';
        const cluster = rider.base_cluster || 'B';
        
        // Берем rawDate (формат базы данных) или date, чтобы дата парсилась всегда без ошибок
        const dStr = race.rawDate || race.date;
        const dObj = dStr ? new Date(dStr) : new Date();
        const raceYear = isNaN(dObj.getFullYear()) ? new Date().getFullYear() : dObj.getFullYear();
        
        const birthYear = parseInt(rider.yob || rider.year_of_birth || 1990);
        const age = raceYear - birthYear;

        let ageIdx = ""; let ageLabel = ""; let isJunior = false; let isVet = false;

        if (age < 18) {
            isJunior = true;
            if (age >= 16 && age <= 17) { ageIdx = "U18"; ageLabel = "16-17"; }
            else if (age >= 14 && age <= 15) { ageIdx = "U16"; ageLabel = "14-15"; }
            else if (age >= 12 && age <= 13) { ageIdx = "U14"; ageLabel = "12-13"; }
            else if (age >= 10 && age <= 11) { ageIdx = "U12"; ageLabel = "10-11"; }
            else { ageIdx = "U10"; ageLabel = "до 10"; }
        } else {
            if (age >= 18 && age <= 22) { ageIdx = "2"; ageLabel = "18-22"; }
            else if (age >= 23 && age <= 34) { ageIdx = "3"; ageLabel = "23-34"; }
            else if (age >= 35 && age <= 49) { ageIdx = "4"; ageLabel = "35-49"; }
            else if (age >= 50 && age <= 59) { ageIdx = "5"; ageLabel = "50-59"; if (g === 'F') isVet = true; } 
            else if (age >= 60 && age <= 69) { ageIdx = "6"; ageLabel = "60-69"; isVet = true; } 
            else if (age >= 70) { ageIdx = "7"; ageLabel = "70+"; isVet = true; }
        }

        if (logic === 'clusters') {
            if (isJunior) return `[${rusG}] ${ageIdx}`;
            return `[${rusG}] ${cluster}`;
        }
        if (logic === 'age') {
            if (isJunior) return `[${rusG}] ${ageIdx}`;
            return `[${rusG}] ${ageLabel}`;
        }
        if (logic === 'absolute') return 'АБСОЛЮТ';
        if (logic === 'mixed') {
            if (isJunior) return ageIdx + g;
            if (g === 'M') {
                if (isVet) return "VM" + ageIdx;
                if (cluster === 'A+') return "AM+";
                if (cluster === 'E') return "EM";
                return cluster + "M" + ageIdx;
            } else {
                if (isVet) return "VF" + ageIdx;
                if (cluster === 'A+') return "AF+";
                return cluster + "F" + ageIdx;
            }
        }
        return cluster;
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

    // ==========================================
    // 🔥 ГЛАВНЫЙ ИМПОРТЕР CSV И ВЫЧИСЛИТЕЛЬ ОЧКОВ
    // ==========================================
    async processCsvData(csvText, raceId) {
        try {
            const lines = csvText.split(/\r?\n/);
            if (lines.length < 2) return alert("Файл пуст или имеет неверный формат!");

            // 🔥 ШАГ 3.1: ЗАПРАШИВАЕМ ГОНКУ ВМЕСТЕ С ПРАВИЛОМ РЕЙТИНГА
            const currentRace = await pb.collection('races').getOne(raceId, { expand: 'peloton_id,rating_rule_id', requestKey: null });
            
            const isRegistrationPhase = currentRace.status === 'Registration' || currentRace.status === 'Скоро';
            const raceDistance = currentRace.distance || 0;
            
            // 🔥 ШАГ 3.2: ИЗВЛЕКАЕМ АКТИВНЫЕ ПРАВИЛА
            let activeRule = null;
            let ruleType = currentRace.format === 'itt' ? 'ind' : 'mass'; // Базовый фолбэк
            
            if (currentRace.expand?.rating_rule_id) {
                const dbRule = currentRace.expand.rating_rule_id;
                ruleType = dbRule.type || ruleType; // берем тип (mass / ind) из базы
                try {
                    activeRule = typeof dbRule.config === 'string' ? JSON.parse(dbRule.config) : dbRule.config;
                } catch(e) { console.error("Ошибка парсинга JSON правила", e); }
            }

            // Если правило не привязано, используем старую логику (настройки пелотона или дефолт)
            if (!activeRule) {
                let pelotonObj = currentRace.expand?.peloton_id;
                if (Array.isArray(pelotonObj)) pelotonObj = pelotonObj[0]; 
                
                let pelotonRules = this.DEFAULT_RATING_RULES;
                if (pelotonObj && pelotonObj.rating_rules) {
                    try { pelotonRules = typeof pelotonObj.rating_rules === 'string' ? JSON.parse(pelotonObj.rating_rules) : pelotonObj.rating_rules; } catch(e) { }
                }
                activeRule = pelotonRules;
            }

            const isMassStart = (ruleType !== 'ind' && ruleType !== 'itt');

            const rosters = await pb.collection('race_rosters').getFullList({ filter: `race_id="${raceId}"`, expand: 'rider_id,rider_id.team_id', requestKey: null });
            const oneTeamObj = Object.values(this.app.teamsMap).find(t => t.name && t.name.toUpperCase().includes('ONE TEAM'));
            const oneTeamId = oneTeamObj ? oneTeamObj.id : null;

            let liveBoard = []; let registeredCount = 0; let guestCount = 0;
            const separator = lines[0].includes(';') ? ';' : ',';

            // =========================================================
            // 🟢 РЕЖИМ 1: ПРЕДРЕГИСТРАЦИЯ (Заливка старт-листа до гонки)
            // =========================================================
            if (isRegistrationPhase) {
                for (let i = 1; i < lines.length; i++) {
                    let line = lines[i].trim(); if (!line) continue;
                    let cols = line.split(separator); 
                    
                    let bib = cols[1] ? cols[1].trim() : ''; 
                    let fullName = cols[2] ? cols[2].trim() : ''; 
                    let yob = cols[3] ? cols[3].trim() : '';
                    let category = cols[4] ? cols[4].trim() : ''; 
                    
                    if (!fullName) continue;

                    // 🛡️ Умная разбивка: в спорте обычно пишут "Фамилия Имя"
                    let nameParts = fullName.trim().split(/\s+/); 
                    let lastName = nameParts[0] || 'Неизвестно';
                    let firstName = nameParts.slice(1).join(' ') || '';

                    // Умный поиск команды
                    let teamNameCsv = cols[5] ? cols[5].trim() : '';
                    let assignedTeamId = oneTeamId;

                    if (teamNameCsv) {
                        const matchedTeam = Object.values(this.app.teamsMap).find(t => 
                            t.name && t.name.toLowerCase() === teamNameCsv.toLowerCase()
                        );
                        if (matchedTeam) assignedTeamId = matchedTeam.id;
                    }

                    // Умное определение пола
                    let guessedGender = 'M';
                    const ln = lastName.toLowerCase();
                    const fn = firstName.toLowerCase();
                    if (ln.endsWith('ва') || ln.endsWith('на') || ln.endsWith('ая') || ln.endsWith('ская') || ln.endsWith('ина')) {
                        guessedGender = 'F';
                    } else if ((fn.split(' ')[0].endsWith('а') || fn.split(' ')[0].endsWith('я')) && !['илья', 'никита', 'данила', 'савва', 'кузьма', 'фома', 'лука', 'миша', 'саша', 'коля', 'дима', 'леша'].includes(fn.split(' ')[0])) {
                        guessedGender = 'F';
                    }

                    let riderId = null;
                    let existingRider = Object.values(this.app.ridersMap).find(r => 
                        (r.first_name + ' ' + r.last_name).toLowerCase() === (firstName + ' ' + lastName).toLowerCase() ||
                        (r.last_name + ' ' + r.first_name).toLowerCase() === (lastName + ' ' + firstName).toLowerCase()
                    );

                    if (existingRider) {
                        riderId = existingRider.id;
                    } else {
                        try {
                            const newRider = await pb.collection('riders').create({
                                first_name: firstName, last_name: lastName, yob: parseInt(yob) || 1990,
                                // 🔥 ФИКС: Оборачиваем assignedTeamId в массив
                                gender: guessedGender, base_cluster: "O", team_id: assignedTeamId ? [assignedTeamId] : [], 
                                email: `guest_csv_${Date.now()}_${Math.random().toString(36).substring(2,6)}@sotka.one`, rating: 0
                            }, { requestKey: null });
                            riderId = newRider.id; this.app.ridersMap[riderId] = newRider; guestCount++;
                        } catch(e) { console.error("Ошибка автосоздания гостя", e); continue; }
                    }

                    let alreadyInRoster = rosters.find(r => r.rider_id === riderId);
                    
                    if (!alreadyInRoster && riderId) {
                        await pb.collection('race_rosters').create({
                            race_id: raceId, rider_id: riderId, bib: bib, final_cluster: category, status: 'registered'
                        }, { requestKey: null });
                        registeredCount++;
                    } else if (alreadyInRoster && bib && !alreadyInRoster.bib) {
                         await pb.collection('race_rosters').update(alreadyInRoster.id, { bib: bib }, { requestKey: null });
                    }
                }
                alert(`✅ Старт-лист успешно загружен!\n\nДобавлено новых заявок: ${registeredCount}\nИз них создано профилей гостей: ${guestCount}\nСтатус гонки остался открытым.`);
                this.openRaceRoster(raceId, this.openedEventName, this.openedEventType);
                return; 
            }

            // =========================================================
            // 🔴 РЕЖИМ 2: ПОДВЕДЕНИЕ ИТОГОВ (Гонка в статусе LIVE)
            // =========================================================
            for (let i = 1; i < lines.length; i++) {
                let line = lines[i].trim(); if (!line) continue;
                let cols = line.split(separator); 
                
                let bib = cols[1] ? cols[1].trim() : ''; let name = cols[2] ? cols[2].trim() : ''; let yob = cols[3] ? cols[3].trim() : '';
                let category = cols[4] ? cols[4].trim() : ''; let team = cols[5] ? cols[5].trim() : '';
                let laps = parseInt(cols[6]) || 0; let timeStr = cols[7] ? cols[7].trim() : '';
                
                let timeMs = this.parseTimeToMs(timeStr);
                let speed = (raceDistance > 0 && timeMs > 0) ? (raceDistance / (timeMs / 3600000)).toFixed(2) : 0;

                let matchedRoster = rosters.find(r => r.bib === bib);
                if (!matchedRoster && name) {
                    let nameParts = name.trim().split(/\s+/);
                    let tryName1 = (nameParts.slice(1).join(' ') + ' ' + nameParts[0]).toLowerCase();
                    let tryName2 = (nameParts[0] + ' ' + nameParts.slice(1).join(' ')).toLowerCase();
                    matchedRoster = rosters.find(r => {
                        let dbName = (r.expand?.rider_id?.first_name + ' ' + r.expand?.rider_id?.last_name).toLowerCase();
                        return dbName === tryName1 || dbName === tryName2;
                    });
                }

                let earnedPoints = 0;
                let currentCluster = matchedRoster?.expand?.rider_id?.base_cluster || 'O';
                let newCluster = currentCluster; 
                let riderGender = matchedRoster?.expand?.rider_id?.gender || 'M';
                let position = i; 

                // 🔥 ШАГ 3.3: ПРИМЕНЕНИЕ ДИНАМИЧЕСКИХ ПРАВИЛ ПРИ РАСЧЕТЕ ОЧКОВ
                if (isMassStart) {
                    // Читаем из нового JSON или из старой структуры
                    const clusterBanks = activeRule.banks || activeRule.mass_start_banks || this.DEFAULT_RATING_RULES.mass_start_banks;
                    const decay = activeRule.decay_factor || 0.85; // Степень затухания очков

                    let baseBank = clusterBanks[currentCluster] || clusterBanks['B'] || 400; // По умолчанию банк B, если кластер неизвестен
                    earnedPoints = Math.max(1, Math.round(baseBank * Math.pow(decay, position - 1)));

                    if (position <= 3) {
                        const upgrades = { 'O':'D', 'D':'C', 'C':'B', 'B':'A', 'A':'A+' };
                        if (upgrades[currentCluster]) newCluster = upgrades[currentCluster];
                    }
                } else {
                    if (speed > 0) {
                        const multiplier = activeRule.multiplier || 1.0;
                        earnedPoints = Math.round(parseFloat(speed) * raceDistance * multiplier);
                        // Передаем активное правило в калькулятор кластеров
                        newCluster = this.getClusterBySpeed(speed, riderGender, currentRace.surface, activeRule);
                    }
                }

                // 🛡️ Защита от качелей: Кластер не может упасть, только вырасти
                const clusterRanks = { 'O':0, 'E':1, 'D':2, 'C':3, 'B':4, 'A':5, 'A+':6, 'V':7 };
                if (clusterRanks[newCluster] <= clusterRanks[currentCluster]) {
                    newCluster = currentCluster; 
                }
                
                let generatedCategory = this.getRaceCategory(riderGender, yob, newCluster, currentRace.cat_logic);
                let finalDisplayCluster = category || generatedCategory;

                // Запись результатов
                if (matchedRoster) {
                    registeredCount++;
                    let status = (timeStr.toLowerCase().includes('dnf') || timeStr === '') ? 'dnf' : 'finished';
                    
                    await pb.collection('race_rosters').update(matchedRoster.id, { status: status, time_ms: timeMs, speed: Number(speed), earned_points: earnedPoints, final_cluster: finalDisplayCluster }, { requestKey: null });

                    if (status === 'finished') {
                        try {
                            const rData = matchedRoster.expand?.rider_id;
                            if (rData) {
                                let updatePayload = { rating: (rData.rating || 0) + earnedPoints, base_cluster: newCluster };
                                const surfKey = `rating_${currentRace.surface}`;
                                if (rData[surfKey] !== undefined) updatePayload[surfKey] = rData[surfKey] + earnedPoints;
                                await pb.collection('riders').update(rData.id, updatePayload, { requestKey: null });
                            }
                        } catch (err) {}
                    }

                    // 🔥 ФИКС: Умное извлечение названия команды при сохранении результатов
                    let finalTeamName = team;
                    if (!finalTeamName && matchedRoster.expand?.rider_id) {
                        finalTeamName = this.getRiderTeamNames(matchedRoster.expand.rider_id);
                    }
                    if (!finalTeamName) finalTeamName = 'Без команды';

                    liveBoard.push({ baseCluster: matchedRoster.expand?.rider_id?.base_cluster || 'B', bib: bib || matchedRoster.bib, category: finalDisplayCluster, lapTimes: timeMs > 0 ? [timeMs] : [], laps: laps, name: name || (matchedRoster.expand?.rider_id?.last_name + ' ' + matchedRoster.expand?.rider_id?.first_name), yob: yob || matchedRoster.expand?.rider_id?.yob || '', recCluster: newCluster, speed: speed.toString(), team: finalTeamName, timeStr: timeStr || status.toUpperCase(), points: earnedPoints });
                } else {
                    guestCount++;
                    liveBoard.push({ baseCluster: 'O', bib: bib, category: finalDisplayCluster, lapTimes: timeMs > 0 ? [timeMs] : [], laps: laps, name: name, yob: yob, recCluster: '-', speed: speed.toString(), team: team || 'Без команды', timeStr: timeStr, points: earnedPoints });
                }
            }

            await pb.collection('races').update(raceId, { status: 'Finished', live_board: liveBoard }, { requestKey: null });
            alert(`✅ Финишный протокол успешно загружен!\n\nОбновлено заявок: ${registeredCount}\nДобавлено гостей (без рейтинга): ${guestCount}\nГонка переведена в статус "Завершена". Очки и кластеры начислены по выбранным правилам.`);
            
            if (typeof window.app.openLiveBoard === 'function') window.app.openLiveBoard(raceId); else this.switchView('calendar');
            
        } catch(e) { 
            console.error(e);
            alert("❌ Ошибка при чтении CSV. Убедитесь, что формат правильный."); 
            this.openRaceRoster(raceId, this.openedEventName, this.openedEventType); 
        }
    }
	
	// ==========================================
        // 🔥 УПРАВЛЕНИЕ БИБЛИОТЕКОЙ ПРАВИЛ (СУПЕРАДМИН)
        // ==========================================
        openRuleModal(id = null) {
            const m = document.getElementById('ruleEditModal');
            if (!m) return;
            
            if (id) {
                const r = this.dataRules.find(x => x.id === id);
                if (!r) return;
                document.getElementById('ruleModalTitle').innerText = 'РЕДАКТИРОВАНИЕ ПРАВИЛА';
                document.getElementById('ruleId').value = r.id;
                document.getElementById('ruleName').value = r.name;
                document.getElementById('ruleDesc').value = r.description || '';
                document.getElementById('ruleType').value = r.type;
                document.getElementById('ruleSurface').value = r.surface;
                document.getElementById('ruleConfig').value = r.config;
            } else {
                document.getElementById('ruleModalTitle').innerText = 'НОВОЕ ПРАВИЛО';
                document.getElementById('ruleId').value = '';
                document.getElementById('ruleName').value = '';
                document.getElementById('ruleDesc').value = '';
                document.getElementById('ruleType').value = 'mass';
                document.getElementById('ruleSurface').value = 'road';
                this.fillRuleTemplate();
            }
            m.style.display = 'flex';
        }

        fillRuleTemplate(confirmOverwrite = false) {
            const configEl = document.getElementById('ruleConfig');
            if (confirmOverwrite && configEl.value.trim() !== '') {
                if (!confirm("Заменить текущую конфигурацию стандартным шаблоном для выбранного типа?")) return;
            }
            
            const type = document.getElementById('ruleType').value;
            let tpl = '';
            if (type === 'mass') {
                tpl = `{\n  "banks": {\n    "A+": 1000,\n    "A": 800,\n    "B": 600,\n    "C": 400,\n    "D": 200,\n    "O": 200,\n    "V": 400\n  },\n  "decay_factor": 0.85\n}`;
            } else {
                tpl = `{\n  "multiplier": 1.0,\n  "thresholds": {\n    "M": {\n      "A+": 40.0,\n      "A": 37.0,\n      "B": 34.0,\n      "C": 30.0,\n      "D": 26.0\n    },\n    "F": {\n      "A+": 36.0,\n      "A": 33.0,\n      "B": 30.0,\n      "C": 26.0,\n      "D": 22.0\n    }\n  }\n}`;
            }
            configEl.value = tpl;
        }

        async saveRule() {
            const id = document.getElementById('ruleId').value;
            const name = document.getElementById('ruleName').value.trim();
            const desc = document.getElementById('ruleDesc').value.trim();
            const type = document.getElementById('ruleType').value;
            const surface = document.getElementById('ruleSurface').value;
            const config = document.getElementById('ruleConfig').value.trim();

            if (!name) return alert("Введите название правила!");
            if (!config) return alert("Конфигурация не может быть пустой!");

            // 🔥 Защита: проверяем валидность JSON перед сохранением!
            try {
                JSON.parse(config);
            } catch (e) {
                return alert("❌ Ошибка в формате JSON!\nУбедитесь, что нет лишних запятых, а все ключи в двойных кавычках.\n\n" + e.message);
            }

            const data = { name, description: desc, type, surface, config };

            try {
                if (id) {
                    await pb.collection('rating_rules').update(id, data, { requestKey: null });
                    alert("✅ Правило обновлено!");
                } else {
                    await pb.collection('rating_rules').create(data, { requestKey: null });
                    alert("✅ Правило создано!");
                }
                document.getElementById('ruleEditModal').style.display = 'none';
                this.loadData(); // Перезагружаем список
            } catch(e) {
                console.error(e);
                alert("Ошибка сохранения в базу.");
            }
        }

        async deleteRule(id) {
            if (!confirm("⚠️ Вы уверены, что хотите удалить это правило? Гонки, привязанные к нему, перейдут на стандартный (базовый) расчет.")) return;
            try {
                await pb.collection('rating_rules').delete(id, { requestKey: null });
                this.loadData();
            } catch(e) {
                alert("Ошибка удаления!");
            }
        }
    // ==========================================
    // 🏆 КАЛЬКУЛЯТОР ИТОГОВ СЕРИИ / КУБКА
    // ==========================================
    async openCupStandings(cupId) {
        const modal = document.getElementById('cupStandingsModal');
        const titleEl = document.getElementById('cupStandingsTitle');
        const subEl = document.getElementById('cupStandingsSub');
        const contentEl = document.getElementById('cupStandingsContent');

        if (!modal || !contentEl) return;

        // Показываем окно загрузки
        modal.style.display = 'flex';
        contentEl.innerHTML = '<div style="text-align:center; padding: 50px;"><div class="spinner" style="width:40px; height:40px; border-width:4px; display:inline-block; border-color: var(--primary) transparent transparent transparent;"></div><div style="margin-top:15px; font-family:\'Unbounded\'; font-size:12px; color:var(--text-muted); font-weight:800;">СВОДИМ ПРОТОКОЛЫ...</div></div>';
        titleEl.innerText = 'ТУРНИРНАЯ ТАБЛИЦА';
        subEl.innerText = 'Запрашиваем базу данных...';

        try {
            // 1. Получаем информацию о Кубке
            const cup = await pb.collection('cups').getOne(cupId, { requestKey: null });
            titleEl.innerText = `🏆 ${cup.name.toUpperCase()}`;

            // 2. Ищем все завершенные гонки, привязанные к этому кубку
            const races = await pb.collection('races').getFullList({
                filter: `cup_id = "${cupId}" && status = 'Finished'`,
                sort: 'date',
                requestKey: null
            });

            if (races.length === 0) {
                subEl.innerText = 'Завершенных этапов: 0';
                contentEl.innerHTML = '<div style="text-align:center; padding:60px; color:var(--text-muted); font-family:\'Unbounded\'; font-size:12px; border: 1px dashed var(--border); border-radius: 20px;">Пока нет ни одного завершенного этапа для подсчета рейтинга.</div>';
                return;
            }

            subEl.innerText = `Завершено этапов: ${races.length}`;
            
            // Собираем ID этих гонок для запроса результатов
            const raceIds = races.map(r => r.id);
            const filterStr = raceIds.map(id => `race_id = "${id}"`).join(' || ');

            // 3. Запрашиваем протоколы (race_rosters) только для этих гонок
            const rosters = await pb.collection('race_rosters').getFullList({
                filter: `status = 'finished' && (${filterStr})`,
                expand: 'rider_id,rider_id.team_id',
                requestKey: null
            });

            // 4. 🧠 МАГИЯ ПОДСЧЕТА: Группируем и суммируем очки
            const standingsMap = {};

            rosters.forEach(r => {
                const rider = r.expand?.rider_id;
                if (!rider) return; // Если гонщик удален, пропускаем

                const riderId = rider.id;
                const points = r.earned_points || 0;

                if (!standingsMap[riderId]) {
                    // 🔥 ФИКС: Используем нашу умную функцию для извлечения имени
                    const teamName = this.getRiderTeamNames(rider); 
                    
                    standingsMap[riderId] = {
                        id: riderId,
                        name: `${rider.first_name} ${rider.last_name}`,
                        gender: String(rider.gender || 'M').toUpperCase().trim(),
                        cluster: rider.base_cluster || 'O',
                        team: teamName,
                        totalPoints: 0,
                        stagesCount: 0
                    };
                }

                // Плюсуем статистику
                standingsMap[riderId].totalPoints += points;
                standingsMap[riderId].stagesCount += 1;
            });

            // 5. Превращаем объект в массив и сортируем по убыванию очков
            let standingsArr = Object.values(standingsMap);
            standingsArr.sort((a, b) => b.totalPoints - a.totalPoints);

            // 6. Генерируем красивую HTML таблицу
            if (standingsArr.length === 0) {
                contentEl.innerHTML = '<div style="text-align:center; padding:60px; color:var(--text-muted); font-family:\'Unbounded\'; font-size:12px; border: 1px dashed var(--border); border-radius: 20px;">В завершенных этапах нет финишеров с очками.</div>';
                return;
            }

            let html = `<div class="p-table-container"><table class="p-roster-table" style="width: 100%;">
                <thead>
                    <tr>
                        <th style="width: 40px; text-align: center;">М</th>
                        <th>Спортсмен</th>
                        <th>Команда</th>
                        <th style="width: 60px; text-align: center;">Этапы</th>
                        <th style="width: 80px; text-align: right;">Очки</th>
                    </tr>
                </thead>
                <tbody>`;

            let rank = 1;
            let prevPoints = -1;

            standingsArr.forEach((s, index) => {
                // Если у людей равное количество очков, они делят одно место
                if (s.totalPoints !== prevPoints && index !== 0) {
                    rank = index + 1;
                }
                prevPoints = s.totalPoints;

                let medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `<b style="color:var(--text-muted); font-family:'Roboto Mono';">${rank}</b>`;
                
                html += `<tr style="transition:0.2s; cursor:pointer;" onmouseover="this.style.background='var(--bg-surface-hover)'" onmouseout="this.style.background='transparent'" onclick="window.app.openProfile('${s.id}')" title="Открыть профиль">
                    <td style="text-align: center; font-size: 16px;">${medal}</td>
                    <td>
                        <div style="font-weight:600; font-size:13px; color:var(--text-main);">${s.name}</div>
                        <div style="font-size:10px; color:var(--text-muted); font-family:'Roboto Mono'; margin-top: 2px;">Категория: ${s.cluster}</div>
                    </td>
                    <td><span style="color:var(--text-muted); font-size:11px;">${s.team}</span></td>
                    <td style="text-align: center;"><span style="background:var(--bg-surface); border:1px solid var(--border); padding:4px 8px; border-radius:12px; font-size:11px; font-weight:600; font-family:'Roboto Mono'; color: var(--primary);">${s.stagesCount}</span></td>
                    <td style="text-align: right;"><b style="color:var(--primary); font-size:16px; font-family:'Roboto Mono';">${s.totalPoints}</b></td>
                </tr>`;
            });

            html += `</tbody></table></div>`;
            contentEl.innerHTML = html;

        } catch (e) {
            console.error("Ошибка при подсчете кубка", e);
            contentEl.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--danger); font-family:'Unbounded';">ОШИБКА ЗАГРУЗКИ ИЛИ ПОДСЧЕТА</div>`;
        }
    }

// ==========================================
    // 📸 ГЕНЕРАТОР ФОТО-ПОСТЕРОВ ДЛЯ СОЦСЕТЕЙ
    // ==========================================
    async generateRacePoster(raceId, riderId = null) {
        // 🔥 ДЕЛАЕМ КАК ТЫ СКАЗАЛ: ПРОСТО И НАДЕЖНО БЕРЕМ ИЗ БАЗЫ
        let race;
        try {
            race = await pb.collection('races').getOne(raceId, { requestKey: null });
        } catch(e) {
            return alert("Гонка не найдена в базе данных.");
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.setAttribute('capture', 'environment'); 
        input.style.position = 'absolute';
        input.style.top = '-10000px';
        document.body.appendChild(input);

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) { document.body.removeChild(input); return; }

            // ГЛОБАЛЬНЫЙ СПИННЕР
            const loaderId = 'posterGlobalLoader';
            let loaderEl = document.getElementById(loaderId);
            if (!loaderEl) {
                loaderEl = document.createElement('div');
                loaderEl.id = loaderId;
                loaderEl.className = 'modal-overlay';
                loaderEl.style.display = 'flex';
                loaderEl.style.zIndex = '9999999';
                loaderEl.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center;"><div class="spinner" style="width:50px; height:50px; border-width:4px; border-color: var(--primary) transparent transparent transparent;"></div><div style="margin-top:20px; font-family:'Unbounded'; font-size:14px; color:var(--primary); font-weight:800; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">СОЗДАЕМ ИСТОРИЮ...</div></div>`;
                document.body.appendChild(loaderEl);
            } else {
                loaderEl.style.display = 'flex';
            }

            try {
                const imgUrl = URL.createObjectURL(file);
                const img = await this.loadImage(imgUrl);
                
                const canvas = document.createElement('canvas');
                canvas.width = 1080;
                canvas.height = 1920;
                const ctx = canvas.getContext('2d');

                // 4. Фон
                const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                const x = (canvas.width / 2) - (img.width / 2) * scale;
                const y = (canvas.height / 2) - (img.height / 2) * scale;
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                // 5. Градиент
                const gradient = ctx.createLinearGradient(0, canvas.height * 0.3, 0, canvas.height);
                gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
                gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.7)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const drawRoundRect = (ctx, x, y, w, h, r, fill, stroke) => {
                    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
                    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
                    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
                    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
                };

                // 6. Бейджи
                const badgeY = canvas.height - 580;
                ctx.font = 'bold 30px "Unbounded", sans-serif';
                ctx.textBaseline = 'middle';
                
                let displayType = (race.type || 'ГОНКА').toUpperCase();
                if (race.type === 'ind') displayType = 'ITT';
                if (race.type === 'mass') displayType = 'МАСС-СТАРТ';

                const distText = (race.distance || 0) + ' КМ';
                
                const typeW = ctx.measureText(displayType).width + 60;
                const distW = ctx.measureText(distText).width + 60;

                ctx.lineWidth = 2;
                drawRoundRect(ctx, 80, badgeY, typeW, 60, 30, 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.3)');
                drawRoundRect(ctx, 80 + typeW + 20, badgeY, distW, 60, 30, 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.3)');
                
                ctx.fillStyle = '#FFC107';
                ctx.textAlign = 'center';
                ctx.fillText(displayType, 80 + typeW/2, badgeY + 32);
                ctx.fillText(distText, 80 + typeW + 20 + distW/2, badgeY + 32);

                // 7. Название и ДАТА
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 95px "Unbounded", sans-serif';
                ctx.fillText((race.name || 'СОРЕВНОВАНИЕ').toUpperCase(), 80, canvas.height - 500);

                // 🔥 ПРОСТАЯ И НАДЕЖНАЯ ДАТА НАПРЯМУЮ ИЗ БД
                let fullDateText = "ДАТА НЕ УКАЗАНА";
                if (race.date) {
                    const d = new Date(race.date);
                    if (!isNaN(d.getTime())) {
                        const day = d.getDate();
                        const month = d.toLocaleDateString('ru-RU', { month: 'long' });
                        const year = d.getFullYear();
                        fullDateText = `${day} ${month} ${year}`.toUpperCase();
                    } else {
                        // Фолбэк: если в базе лежит просто текст (например, "Скоро")
                        fullDateText = race.date.toUpperCase();
                    }
                }
                
                ctx.fillStyle = '#FFC107'; 
                ctx.font = 'bold 38px "Unbounded", sans-serif';
                ctx.fillText(fullDateText, 80, canvas.height - 380);

                // 8. Результаты
                let shareText = '';
                let roster = null;
                if (riderId) {
                    try { roster = await pb.collection('race_rosters').getFirstListItem(`race_id="${race.id}" && rider_id="${riderId}"`, { expand: 'rider_id', requestKey: null }); } catch (e) {}
                }

                if (roster && roster.status === 'finished') {
                    let timeStr = 'DNF';
                    if (roster.time_ms > 0) {
                        const h = Math.floor(roster.time_ms / 3600000);
                        const m = Math.floor((roster.time_ms % 3600000) / 60000).toString().padStart(2, '0');
                        const s = Math.floor((roster.time_ms % 60000) / 1000).toString().padStart(2, '0');
                        timeStr = h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
                    }

                    const gridY = canvas.height - 280;
                    drawRoundRect(ctx, 80, gridY, 920, 160, 24, 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.2)');

                    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                    ctx.beginPath();
                    ctx.moveTo(80 + 920/3, gridY + 30); ctx.lineTo(80 + 920/3, gridY + 130);
                    ctx.moveTo(80 + 920*2/3, gridY + 30); ctx.lineTo(80 + 920*2/3, gridY + 130);
                    ctx.stroke();

                    ctx.fillStyle = '#8a8d9b';
                    ctx.font = 'bold 24px "Unbounded", sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('ВРЕМЯ', 80 + 920/6, gridY + 35);
                    ctx.fillText('ОЧКИ', 80 + 920/2, gridY + 35);
                    ctx.fillText('ГРУППА', 80 + 920*5/6, gridY + 35);

                    ctx.fillStyle = '#00e676';
                    ctx.font = 'bold 55px "Roboto Mono", monospace';
                    ctx.fillText(timeStr, 80 + 920/6, gridY + 85);
                    ctx.fillText('+' + (roster.earned_points || 0), 80 + 920/2, gridY + 85);
                    
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(roster.final_cluster || roster.expand?.rider_id?.base_cluster || 'O', 80 + 920*5/6, gridY + 85);

                    shareText = `Мой результат на ${race.name}: ${timeStr}. Протоколы в VILKA!`;
                } else {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 75px "Unbounded", sans-serif';
                    ctx.textAlign = 'left';
                    ctx.fillText('Я УЧАСТВУЮ! 🚀', 80, canvas.height - 240);
                    shareText = `Я в деле! Зарегистрировался на гонку ${race.name}. Жду на старте!`;
                }

                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.font = 'bold 28px "Unbounded", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('vilka.sotka.one', canvas.width/2, canvas.height - 60);

                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.90));
                const posterFile = new File([blob], `story_${Date.now()}.jpg`, { type: "image/jpeg" });
                
                if (this.app && this.app.currentRider) {
                    try {
                        const formData = new FormData();
                        const fresh = await pb.collection('riders').getOne(this.app.currentRider.id, { requestKey: null });
                        const oldStories = fresh.stories || [];
                        
       
                 if (oldStories.length >= 10) {
                            formData.append('stories-', oldStories[0]);
                        }
                        formData.append('stories', posterFile);

                        const updated = await pb.collection('riders').update(this.app.currentRider.id, formData);

                        this.app.currentRider = updated;
                        this.app.ridersMap[updated.id] = updated;

                        await new Promise(resolve => setTimeout(resolve, 500));

                        if (typeof this.app.renderProfileHeader === 'function') this.app.renderProfileHeader();
                        if (typeof this.app.renderChatList === 'function') this.app.renderChatList(document.getElementById('chatSearch')?.value || "");

                    } catch (uploadErr) {
                        console.error("Ошибка загрузки в базу:", uploadErr);
                        alert("История создана, но не загрузилась в профиль (проверьте интернет).");
                    }
                }

                loaderEl.style.display = 'none';

                const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
                this.showPosterPreviewModal(dataUrl, race, shareText);

            } catch (e) {
                console.error(e);
                alert("Ошибка генерации: " + e.message);
                loaderEl.style.display = 'none';
            }
            document.body.removeChild(input);
        };
        input.click();
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Не удалось загрузить картинку"));
            img.src = src;
        });
    }

    showPosterPreviewModal(dataUrl, race, shareText) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';
        overlay.style.zIndex = '10000000';
        overlay.innerHTML = `
            <div class="modal-box" style="padding: 0; overflow: hidden; max-width: 400px; width: 95vw; background: var(--bg-surface); border: 1px solid var(--border);">
                <div style="padding: 15px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface-hover);">
                    <h3 style="margin: 0; color: var(--text-main); font-family: 'Unbounded'; font-size: 14px;">ПОСТЕР ГОТОВ</h3>
                    <button id="closePosterBtn" style="background: none; border: none; color: var(--text-muted); font-size: 20px; cursor: pointer;">&times;</button>
                </div>
                <div style="padding: 20px; text-align: center; background: var(--bg-body);">
                    <img src="${dataUrl}" style="width: 100%; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); margin-bottom: 20px; max-height: 60vh; object-fit: contain;">
                    
                    <div style="display: flex; gap: 10px;">
                        <button id="sharePosterBtn" class="btn-black" style="flex: 1; padding: 14px; font-size: 12px; background: var(--primary); color: #000; border: none; box-shadow: 0 4px 15px rgba(255,193,7,0.3);">🚀 ПОДЕЛИТЬСЯ</button>
                        <button id="downloadPosterBtn" class="btn-black" style="flex: 1; padding: 14px; font-size: 12px; background: var(--bg-surface-hover); color: var(--text-main); border: 1px solid var(--border);">📥 СКАЧАТЬ</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('closePosterBtn').onclick = () => document.body.removeChild(overlay);

        document.getElementById('downloadPosterBtn').onclick = () => {
            const link = document.createElement('a');
            link.download = `vilka_poster_${race.id}.jpg`;
            link.href = dataUrl;
            link.click();
        };

        document.getElementById('sharePosterBtn').onclick = async () => {
            const arr = dataUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while(n--) { u8arr[n] = bstr.charCodeAt(n); }
            const file = new File([u8arr], `vilka_${race.id}.jpg`, { type: mime });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({ title: race.name, text: shareText, files: [file] });
                } catch(err) {
                    console.log("Пользователь отменил отправку");
                }
            } else {
                alert("Ваш браузер не поддерживает прямую отправку фото в соцсети. Воспользуйтесь кнопкой СКАЧАТЬ и выложите фото вручную.");
            }
        };
    }
	
	// ==========================================
    // 🗂️ ВЫЗОВ ШТОРКИ СОЗДАНИЯ ИСТОРИЙ (ПРЯМОЙ ЗАПРОС В БД)
    // ==========================================
    async openStoryCreatorMenu() {
        const modal = document.getElementById('storyCreatorModal');
        const listEl = document.getElementById('storyCreatorList');
        
        if (!modal || !listEl || !this.app.currentRider) return;

        // Показываем спиннер загрузки
        listEl.innerHTML = `<div style="text-align:center; padding:40px;"><span class="spinner" style="width:30px; height:30px; border-width:3px; display:inline-block; border-color: var(--primary) transparent transparent transparent;"></span></div>`;
        modal.style.display = 'flex';

        try {
            const myRegs = await pb.collection('race_rosters').getFullList({
                filter: `rider_id="${this.app.currentRider.id}" && status != "canceled"`,
                expand: 'race_id',
                requestKey: null
            });

            let myRaces = myRegs.map(reg => {
                let race = reg.expand?.race_id;
                if (race) {
                    race.myRosterStatus = reg.status; 
                    
                    // 🔥 1. ВОЗВРАЩАЕМ ГОД: Ручной парсинг даты из PocketBase (100% защита от ошибок iOS)
                    let fDate = "Дата не указана";
                    if (race.date && race.date.length >= 10) {
                        const [y, m, d] = race.date.substring(0, 10).split('-');
                        const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
                        const mIndex = parseInt(m, 10) - 1;
                        if (mIndex >= 0 && mIndex <= 11) {
                            fDate = `${parseInt(d, 10)} ${months[mIndex]} ${y}`; // Теперь год на месте!
                        }
                    }
                    race.formattedDate = fDate;

                    // 🔥 2. БЕРЕМ ФОРМАТ ИЗ НОВОГО СЛОВАРЯ
race.displayType = this.RACE_FORMATS[race.format] || 'ГОНКА';

                    return race;
                }
                return null;
            }).filter(Boolean);

            if (myRaces.length === 0) {
                listEl.innerHTML = `
                    <div style="text-align:center; padding:40px 20px; background:var(--bg-body); border-radius:16px; border:1px dashed var(--border);">
                        <div style="font-size:30px; margin-bottom:10px;">🚷</div>
                        <div style="color:var(--text-main); font-family:'Unbounded'; font-size:12px; margin-bottom:5px;">ВЫ ПОКА НЕ В ДЕЛЕ</div>
                        <div style="color:var(--text-muted); font-size:11px;">Заявитесь на любую гонку в календаре, чтобы создавать постеры.</div>
                    </div>`;
                return;
            }

            myRaces.sort((a, b) => new Date(b.date) - new Date(a.date));

            let html = '';
            myRaces.forEach(r => {
                const isFinished = (r.status === 'Finished' || r.myRosterStatus === 'finished');
                const statusBadge = isFinished 
                    ? `<span style="background:rgba(0,230,118,0.1); color:var(--success); border:1px solid rgba(0,230,118,0.3); padding:4px 8px; border-radius:6px; font-size:9px; font-weight:bold; font-family:'Unbounded';">🏁 РЕЗУЛЬТАТ</span>` 
                    : `<span style="background:rgba(255,193,7,0.1); color:var(--primary); border:1px solid rgba(255,193,7,0.3); padding:4px 8px; border-radius:6px; font-size:9px; font-weight:bold; font-family:'Unbounded';">🚀 ЖДУ СТАРТА</span>`;

                html += `
                <div onclick="document.getElementById('storyCreatorModal').style.display='none'; window.app.crm.generateRacePoster('${r.id}', '${this.app.currentRider.id}');" 
                     style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-body); border:1px solid var(--border); padding:16px; border-radius:16px; cursor:pointer; transition:0.2s; margin-bottom:10px;" 
                     onmouseover="this.style.borderColor='var(--primary)'; this.style.transform='translateY(-2px)';" 
                     onmouseout="this.style.borderColor='var(--border)'; this.style.transform='translateY(0)';">
                    
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <b style="color:var(--text-main); font-family:'Unbounded'; font-size:13px; text-transform:uppercase;">${r.name}</b>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <span style="color:var(--text-muted); font-size:10px; font-family:'Roboto Mono'; background:var(--bg-surface-hover); padding:2px 6px; border-radius:4px;">${r.formattedDate}</span>
                            <span style="color:var(--text-muted); font-size:10px; font-family:'Roboto Mono'; background:var(--bg-surface-hover); padding:2px 6px; border-radius:4px;">${r.displayType}</span>
                        </div>
                    </div>
                    <div>${statusBadge}</div>
                </div>`;
            });
            listEl.innerHTML = html;

        } catch (e) {
            console.error("Ошибка загрузки заявок для шторки:", e);
            listEl.innerHTML = `<div style="text-align:center; color:var(--danger); padding:20px; font-size:12px;">Ошибка загрузки данных.</div>`;
        }
    }

    
	
	// ==========================================
    // 🎞️ ПРОСМОТРЩИК ИСТОРИЙ (STORY VIEWER)
    // ==========================================
    async openStoryViewer(riderId) {
        const modal = document.getElementById('storyViewerModal');
        if (!modal) return;

        try {
            // Запрашиваем актуальные данные гонщика
            const rider = await pb.collection('riders').getOne(riderId, { requestKey: null });
            
            if (!rider.stories || rider.stories.length === 0) {
                // Если историй нет (например, удалил)
                if (rider.id === this.app.currentRider?.id) {
                    this.openStoryCreatorMenu();
                } else {
                    alert("У этого пользователя больше нет историй.");
                }
                return;
            }

            // Настраиваем состояние плеера
            this.currentStoryRider = rider;
            this.currentStoryIndex = 0;
            this.storyTimer = null;

            // Заполняем шапку
            document.getElementById('storyViewerName').innerText = `${rider.first_name} ${rider.last_name}`;
            document.getElementById('storyViewerAvatar').innerText = (rider.first_name[0] || '') + (rider.last_name[0] || '');

            modal.style.display = 'flex';
            this.renderStoryFrame();

        } catch (e) {
            console.error("Ошибка загрузки историй", e);
            alert("Не удалось загрузить истории.");
        }
    }

    renderStoryFrame() {
        const rider = this.currentStoryRider;
        if (!rider || !rider.stories) return this.closeStoryViewer();

        const stories = rider.stories;
        const index = this.currentStoryIndex;

        // Рисуем полоски прогресса
        const progressContainer = document.getElementById('storyProgressBarContainer');
        let barsHtml = '';
        for (let i = 0; i < stories.length; i++) {
            let bg = 'rgba(255,255,255,0.3)'; // Будущие (полупрозрачные)
            if (i < index) bg = '#fff'; // Просмотренные (белые)
            
            barsHtml += `
            <div style="flex: 1; height: 3px; background: ${bg}; border-radius: 3px; overflow: hidden; position: relative;">
                ${i === index ? '<div id="activeStoryProgress" style="position:absolute; top:0; left:0; height:100%; width:0%; background:#fff;"></div>' : ''}
            </div>`;
        }
        progressContainer.innerHTML = barsHtml;

        // Загружаем картинку
        const imgEl = document.getElementById('storyViewerImage');
        imgEl.src = pb.files.getUrl(rider, stories[index]);

        // 🔥 ПОКАЗЫВАЕМ ИЛИ ПРЯЧЕМ КНОПКИ УПРАВЛЕНИЯ
        const controls = document.getElementById('myStoryControls');
        if (controls) {
            controls.style.display = (rider.id === this.app.currentRider?.id) ? 'flex' : 'none';
        }

        // Запускаем анимацию и таймер (5 секунд на историю)
        this.startStoryTimer();
    }

    // ==========================================
    // 🗑️ УДАЛЕНИЕ ИСТОРИИ ИЗ POCKETBASE
    // ==========================================
    async deleteCurrentStory() {
        if (!this.currentStoryRider) return;
        if (!confirm("Удалить эту историю? Это действие нельзя отменить.")) return;

        // Останавливаем таймер, чтобы история не перелистнулась во время удаления
        if (this.storyTimer) clearInterval(this.storyTimer);

        const filename = this.currentStoryRider.stories[this.currentStoryIndex];
        const controls = document.getElementById('myStoryControls');
        if (controls) controls.style.opacity = '0.5';

        try {
            const formData = new FormData();
            // 🔥 В PocketBase удаление файла из массива делается добавлением минуса к имени поля
            formData.append('stories-', filename);
            
            const updated = await pb.collection('riders').update(this.currentStoryRider.id, formData);
            
            // Обновляем память приложения
            this.app.currentRider = updated;
            this.app.ridersMap[updated.id] = updated;
            this.currentStoryRider = updated;

            // Перерисовываем интерфейс (убираем кольцо, если историй 0)
            if (typeof this.app.renderProfileHeader === 'function') this.app.renderProfileHeader();
            if (typeof this.app.renderChatList === 'function') this.app.renderChatList(document.getElementById('chatSearch')?.value || "");

            // Проверяем, остались ли еще истории
            if (!updated.stories || updated.stories.length === 0) {
                this.closeStoryViewer(); // Закрываем вьювер, если удалили последнюю
            } else {
                // Если мы удалили последнюю в массиве, сдвигаем индекс назад
                if (this.currentStoryIndex >= updated.stories.length) {
                    this.currentStoryIndex = updated.stories.length - 1;
                }
                if (controls) controls.style.opacity = '1';
                this.renderStoryFrame(); // Перерисовываем соседнюю историю
            }
        } catch (e) {
            console.error("Ошибка удаления:", e);
            alert("Не удалось удалить историю.");
            if (controls) controls.style.opacity = '1';
            this.startStoryTimer(); // Если ошибка - запускаем таймер обратно
        }
    }

    startStoryTimer() {
        if (this.storyTimer) clearInterval(this.storyTimer);
        
        let progress = 0;
        const progressBar = document.getElementById('activeStoryProgress');
        
        this.storyTimer = setInterval(() => {
            progress += 2; // Шаг прогресса (100% за 5000мс = 5 сек)
            if (progressBar) progressBar.style.width = `${progress}%`;

            if (progress >= 100) {
                this.nextStory();
            }
        }, 100); // Обновляем каждые 100мс
    }

    nextStory() {
        if (!this.currentStoryRider) return;
        this.currentStoryIndex++;
        
        if (this.currentStoryIndex >= this.currentStoryRider.stories.length) {
            this.closeStoryViewer(); // Если истории закончились - закрываем
        } else {
            this.renderStoryFrame();
        }
    }

    prevStory() {
        if (!this.currentStoryRider) return;
        this.currentStoryIndex--;
        
        if (this.currentStoryIndex < 0) {
            this.currentStoryIndex = 0;
            this.renderStoryFrame(); // Просто перезапускаем первую
        } else {
            this.renderStoryFrame();
        }
    }

    closeStoryViewer() {
        if (this.storyTimer) clearInterval(this.storyTimer);
        document.getElementById('storyViewerModal').style.display = 'none';
        this.currentStoryRider = null;
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
            
            // 🔥 ФИКС: Умное извлечение активной команды
            const myTeams = Array.isArray(this.app.currentRider?.team_id) ? this.app.currentRider.team_id : (this.app.currentRider?.team_id ? [this.app.currentRider.team_id] : []);
            const targetTeamId = this.app.crm.viewedTeamId || (myTeams.length > 0 ? myTeams.find(id => this.app.teamsMap[id]?.peloton_id === this.app.currentPelotonFilter) || myTeams[0] : null);
            
            if (!targetTeamId) return alert("❌ Не удалось определить команду.");

            // Снимаем права со старых капитанов этой команды
            const teamRiders = Object.values(this.app.ridersMap).filter(r => {
                const rTeams = Array.isArray(r.team_id) ? r.team_id : (r.team_id ? [r.team_id] : []);
                return rTeams.includes(targetTeamId);
            });

            for (let oldCap of teamRiders) {
                if (oldCap.roles && oldCap.roles.includes('captain') && oldCap.id !== newCap.id) {
                    let newRoles = oldCap.roles.filter(r => r !== 'captain');
                    await pb.collection('riders').update(oldCap.id, { roles: newRoles }, { requestKey: null });
                }
            }

            // Выдаем права новому капитану и добавляем его в команду (если его там нет)
            let newCapRoles = newCap.roles || [];
            if (!Array.isArray(newCapRoles)) newCapRoles = [newCapRoles];
            if (!newCapRoles.includes('captain')) newCapRoles.push('captain');
            
            let newCapTeams = Array.isArray(newCap.team_id) ? [...newCap.team_id] : (newCap.team_id ? [newCap.team_id] : []);
            if (!newCapTeams.includes(targetTeamId)) newCapTeams.push(targetTeamId);
            
            await pb.collection('riders').update(newCap.id, { team_id: newCapTeams, roles: newCapRoles }, { requestKey: null }); 
            
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
        // 🔥 ФИКС: Умное извлечение активной команды
        const myTeams = Array.isArray(this.app.currentRider?.team_id) ? this.app.currentRider.team_id : (this.app.currentRider?.team_id ? [this.app.currentRider.team_id] : []);
        const targetTeamId = this.app.crm.viewedTeamId || (myTeams.length > 0 ? myTeams.find(id => this.app.teamsMap[id]?.peloton_id === this.app.currentPelotonFilter) || myTeams[0] : null);
        
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
        
        // 🔥 ФИКС: Проверка капитанства через массив
        const myTeams = Array.isArray(this.app.currentRider?.team_id) ? this.app.currentRider.team_id : (this.app.currentRider?.team_id ? [this.app.currentRider.team_id] : []);
        const isCaptain = rStr.includes('captain') && myTeams.includes(teamId);
        
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
        
        // 🔥 ФИКС: Узнаем, из какой команды мы его кикаем
        const myTeams = Array.isArray(this.app.currentRider?.team_id) ? this.app.currentRider.team_id : (this.app.currentRider?.team_id ? [this.app.currentRider.team_id] : []);
        const targetTeamId = this.app.crm.viewedTeamId || (myTeams.length > 0 ? myTeams.find(id => this.app.teamsMap[id]?.peloton_id === this.app.currentPelotonFilter) || myTeams[0] : null);

        if (!targetTeamId) return alert("❌ Не удалось определить команду для исключения.");

        try { 
            const rider = this.app.ridersMap[riderId];
            if (!rider) return;
            
            // Удаляем только текущую открытую команду
            let currentTeams = Array.isArray(rider.team_id) ? [...rider.team_id] : (rider.team_id ? [rider.team_id] : []);
            currentTeams = currentTeams.filter(id => id !== targetTeamId);
            
            // Если выгнали отовсюду - даем статус Свободного Агента (ONE TEAM)
            if (currentTeams.length === 0) currentTeams.push(oneTeamId);

            await pb.collection('riders').update(riderId, { team_id: currentTeams, transfer_request: "" }, { requestKey: null }); 
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
			this.emojiPickerOpen = false;
			this.cachedRaces = {};
			this.currentRaceContext = { raceId: null, rosterId: null, price: 0, title: '' };
			this.chatListFilter = 'races';
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
// 🔥 КОПИРОВАНИЕ ССЫЛКИ НА КАЛЕНДАРЬ (УПРОЩЕННЫЙ ВАРИАНТ)
        copyCalendarLink() {
            // Определяем, какой пелотон выбран (если 'all' или пустой - значит глобальный)
            const target = (this.currentPelotonFilter && this.currentPelotonFilter !== 'all') ? this.currentPelotonFilter : 'all';
            
            // Формируем красивую и короткую ссылку
            const link = `${window.location.origin}${window.location.pathname}?calendar=${target}`;
            
            this.copyText(link, "🔗 Ссылка на календарь скопирована!");
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
            }; 
            // 🔥 Если ключа нет в словаре (это любой другой смайл) — отдаем его как текст!
            return svgs[key] || `<span style="font-size:${size}px; line-height:1;">${key}</span>`;
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
            
            // Отсекаем знаки препинания в конце
            if (/[.,;:!?]$/.test(cleanUrl)) {
                punctuation = cleanUrl.slice(-1);
                cleanUrl = cleanUrl.slice(0, -1);
            }
            
            // Формируем полную кликабельную ссылку (с протоколом)
            let hrefUrl = cleanUrl;
            if (!hrefUrl.startsWith('http://') && !hrefUrl.startsWith('https://')) {
                hrefUrl = 'https://' + hrefUrl;
            }
            
            // 🔥 СОЗДАЕМ КРАСИВЫЙ ТЕКСТ ДЛЯ ОТОБРАЖЕНИЯ (displayUrl)
            let displayUrl = cleanUrl.replace(/^https?:\/\//i, ''); // Убираем префикс http(s)://
            if (displayUrl.length > 40) {
                // Если ссылка гигантская, оставляем начало, конец и "..." в середине
                displayUrl = displayUrl.substring(0, 25) + '...' + displayUrl.substring(displayUrl.length - 10);
            }
            
            // Возвращаем теги, заменяя вывод cleanUrl на displayUrl и добавляя word-break: break-word
            if (hrefUrl.includes('sotka.one')) {
                if (hrefUrl.includes('?chat=') || hrefUrl.includes('?user=') || hrefUrl.includes('?team=')) {
                    return `<a href="${hrefUrl}" style="word-break: break-word; text-decoration: underline; font-weight: inherit; color: inherit;" onclick="event.preventDefault(); event.stopPropagation(); window.app.processDeepLink('${hrefUrl}');">${displayUrl}</a>${punctuation}`;
                } else {
                    return `<a href="${hrefUrl}" target="_self" style="word-break: break-word; text-decoration: underline; font-weight: inherit; color: inherit;" onclick="event.stopPropagation();">${displayUrl}</a>${punctuation}`;
                }
            } else {
                return `<a href="${hrefUrl}" target="_blank" rel="noopener noreferrer" style="word-break: break-word; text-decoration: underline; font-weight: inherit; color: inherit;" onclick="event.stopPropagation();">${displayUrl}</a>${punctuation}`;
            }
        });
    }
	
	// 🔥 ВНУТРЕННИЙ ПРОСМОТРЩИК КАРТИНОК С ЗУМОМ
    openImageViewer(url, event) {
        if (event) event.stopPropagation();
        let viewer = document.getElementById('globalImageViewer');
        
        if (!viewer) {
            viewer = document.createElement('div');
            viewer.id = 'globalImageViewer';
            // Добавили touch-action: none, чтобы браузер не пытался зумить всю страницу
            viewer.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; height:100dvh; background:rgba(0,0,0,0.95); z-index:9999999; justify-content:center; align-items:center; flex-direction:column; backdrop-filter:blur(5px); overflow:hidden; touch-action:none;';
            viewer.innerHTML = `
                <div style="position:absolute; top:20px; right:20px; z-index:10;">
                    <button id="closeImageViewerBtn" style="background:rgba(255,255,255,0.2); border:none; width:44px; height:44px; border-radius:50%; color:#fff; font-size:28px; cursor:pointer; display:flex; justify-content:center; align-items:center; box-shadow:0 4px 15px rgba(0,0,0,0.5); transition:0.2s;">&times;</button>
                </div>
                <img id="globalImageViewerImg" src="" style="max-width:95vw; max-height:85vh; object-fit:contain; border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.5); transform-origin: center center; transition: transform 0.2s ease-out; cursor: grab;">
            `;
            
            document.body.appendChild(viewer);

            const img = document.getElementById('globalImageViewerImg');
            const closeBtn = document.getElementById('closeImageViewerBtn');

            // Переменные для физики зума и перемещения
            let scale = 1;
            let pointX = 0;
            let pointY = 0;
            let panning = false;
            let start = { x: 0, y: 0 };
            let startDistance = 0;
            let startScale = 1;

            const setTransform = () => {
                img.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
            };

            const resetZoom = () => {
                scale = 1; pointX = 0; pointY = 0;
                img.style.transition = 'transform 0.2s ease-out';
                setTransform();
            };

            // Закрытие при клике по фону
            viewer.onclick = (e) => {
                if (e.target.id === 'globalImageViewer') {
                    viewer.style.display = 'none';
                    resetZoom();
                }
            };

            closeBtn.onclick = (e) => {
                e.stopPropagation();
                viewer.style.display = 'none';
                resetZoom();
            };

            // Двойной клик/тап для сброса зума
            img.ondblclick = (e) => { e.stopPropagation(); resetZoom(); };

            // --- МЫШЬ (ДЛЯ ПК) ---
            img.onmousedown = (e) => {
                e.preventDefault();
                start = { x: e.clientX - pointX, y: e.clientY - pointY };
                panning = true;
                img.style.cursor = 'grabbing';
                img.style.transition = 'none';
            };
            viewer.onmouseup = () => { panning = false; img.style.cursor = 'grab'; };
            viewer.onmouseleave = () => { panning = false; img.style.cursor = 'grab'; };
            viewer.onmousemove = (e) => {
                if (!panning) return;
                pointX = (e.clientX - start.x);
                pointY = (e.clientY - start.y);
                setTransform();
            };
            viewer.onwheel = (e) => {
                e.preventDefault();
                img.style.transition = 'none';
                let xs = (e.clientX - pointX) / scale;
                let ys = (e.clientY - pointY) / scale;
                let delta = (e.wheelDelta ? e.wheelDelta : -e.deltaY);
                (delta > 0) ? (scale *= 1.1) : (scale /= 1.1);
                scale = Math.min(Math.max(0.5, scale), 5); // Лимиты: от 0.5x до 5x
                pointX = e.clientX - xs * scale;
                pointY = e.clientY - ys * scale;
                setTransform();
            };

            // --- ТАЧ (ДЛЯ СМАРТФОНОВ) ---
            viewer.addEventListener('touchstart', (e) => {
                img.style.transition = 'none';
                if (e.touches.length === 1) { // Один палец - перемещение
                    start = { x: e.touches[0].clientX - pointX, y: e.touches[0].clientY - pointY };
                    panning = true;
                } else if (e.touches.length === 2) { // Два пальца - зум
                    panning = false;
                    startDistance = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    startScale = scale;
                }
            }, { passive: false });

            viewer.addEventListener('touchmove', (e) => {
                e.preventDefault(); // Глушим скролл страницы на фоне
                if (e.touches.length === 1 && panning) {
                    pointX = e.touches[0].clientX - start.x;
                    pointY = e.touches[0].clientY - start.y;
                    setTransform();
                } else if (e.touches.length === 2) {
                    let currentDistance = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    scale = startScale * (currentDistance / startDistance);
                    scale = Math.min(Math.max(0.5, scale), 5);
                    setTransform();
                }
            }, { passive: false });

            viewer.addEventListener('touchend', (e) => {
                if (e.touches.length < 2) panning = false;
            });
        }
        
        // Перед каждым открытием новой картинки - сбрасываем зум и вставляем ссылку
        const img = document.getElementById('globalImageViewerImg');
        img.style.transition = 'none';
        img.style.transform = `translate(0px, 0px) scale(1)`;
        img.src = url;
        viewer.style.display = 'flex';
    }
	
// 🔥 УНИВЕРСАЛЬНЫЙ ПОЛУЧАТЕЛЬ ИМЕНИ КОМАНДЫ (МУЛЬТИ-КЛУБ)
        getRiderTeamName(rider) {
            if (!rider) return 'Без команды';
            const riderTeams = Array.isArray(rider.team_id) ? rider.team_id : (rider.team_id ? [rider.team_id] : []);
            if (riderTeams.length === 0) return 'Без команды';

            // Если выбран конкретный пелотон, ищем команду именно из него
            if (this.currentPelotonFilter && this.currentPelotonFilter !== 'all') {
                const activeTid = riderTeams.find(id => this.teamsMap[id] && this.teamsMap[id].peloton_id === this.currentPelotonFilter);
                if (activeTid) return this.teamsMap[activeTid].name;
            }
            
            // Если выбран "Все (Глобально)" или команда не найдена в текущем пелотоне
            return riderTeams.length === 1 ? (this.teamsMap[riderTeams[0]]?.name || 'Команда') : `Клубов: ${riderTeams.length}`;
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

        // 🔥 ФИКС: Уменьшаем max-height до 55vh, чтобы нижняя кнопка "СВЕРНУТЬ" НИКОГДА не уезжала за экран на мобилках!
        let html = `<div id="chatCurtainPanel" class="chat-curtain"><div class="curtain-content" style="max-height: 55vh; overflow-y: auto; overscroll-behavior: contain; padding-top:15px; position:relative;">`;
        
        // 🔥 Возвращаем аккуратную кнопку редактирования (без дублирования "Свернуть")
        if (canManage) {
            html += `<button onclick="window.app.openCurtainEditModal()" style="position:absolute; top:10px; right:10px; background:var(--bg-surface-hover); border:1px solid var(--border); color:var(--text-muted); border-radius:6px; padding:4px 8px; font-size:10px; cursor:pointer; transition: 0.2s; z-index:5;" onmouseover="this.style.color='var(--primary)'; this.style.borderColor='var(--primary)';" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border)';">✎ Ред.</button>`;
        }

        // Изображение
        if (chat.panel_image) {
            const imgUrl = `${pb.baseUrl}/api/files/${chat.collectionId}/${chat.id}/${chat.panel_image}`;
            html += `<a href="${imgUrl}" target="_blank"><img src="${imgUrl}" class="curtain-image" alt="Обложка"></a>`;
        }

        // Кнопка Карты
        let mapBtnHtml = '';
        if (data.embed_code) {
            this.currentMapEmbed = data.embed_code; 
            mapBtnHtml = `<button class="btn-black" style="width:100%; background:var(--info); color:#fff; padding:14px; border-radius:8px; font-family:'Unbounded'; font-size:11px; font-weight:800; cursor:pointer; border:none; transition:0.2s; margin-bottom:15px; box-shadow: 0 4px 15px rgba(59,130,246,0.3);" onclick="window.app.openMapModal()">🗺️ ИНТЕРАКТИВНАЯ КАРТА</button>`;
        }

        if (mapBtnHtml || (data.buttons && data.buttons.length > 0)) {
            // Если картинки нет, делаем отступ от кнопки "Ред."
            html += `<div class="curtain-buttons" style="${canManage && !chat.panel_image ? 'margin-top: 25px;' : ''}">`;
            html += mapBtnHtml;
            
            // Кастомные кнопки (Регламент, Треки и т.д.)
            if (data.buttons) {
                data.buttons.slice(0, 5).forEach(btn => {
                    const target = btn.blank ? '_blank' : '_self';
                    html += `<a href="${btn.url}" target="${target}" class="curtain-btn" style="margin-bottom:8px;">${this.escapeHTML(btn.label)}</a>`;
                });
            }
            html += `</div>`;
        }

        // Текст регламента (строго под ВСЕМИ кнопками)
        if (data.text) {
            // 1. Экранируем весь текст для защиты от зловредного кода (безопасность на первом месте)
            let safeText = this.escapeHTML(data.text);
            
            // 2. ВОЗВРАЩАЕМ наши разрешенные теги форматирования обратно к жизни
            safeText = safeText.replace(/&lt;b&gt;/gi, '<b>').replace(/&lt;\/b&gt;/gi, '</b>');
            safeText = safeText.replace(/&lt;i&gt;/gi, '<i>').replace(/&lt;\/i&gt;/gi, '</i>');
            safeText = safeText.replace(/&lt;u&gt;/gi, '<u>').replace(/&lt;\/u&gt;/gi, '</u>');
            safeText = safeText.replace(/&lt;br&gt;/gi, '<br>');
            
            html += `<div style="white-space: pre-wrap; margin-bottom: 10px; line-height: 1.5; font-size: 13px;">${this.linkify(safeText)}</div>`;
        }

        const isEmpty = !chat.panel_image && !data.text && (!data.buttons || data.buttons.length === 0);

        // Если шторка пустая и мы не админ - прячем весь блок целиком
        if (isEmpty && !canManage) {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        } else {
            container.style.display = 'block';
            if (isEmpty && canManage) {
                html += `<div style="color:var(--text-muted); font-size:11px; text-align:center; padding:20px 10px;">Шторка пуста. Нажмите «Ред.» чтобы добавить информацию.</div>`;
            }
        }

        html += `</div></div>`; // Закрываем .curtain-content и .chat-curtain
        
        // Нижняя полоса открытия (Твоя оригинальная)
        // 🔥 НОВЫЙ ДИЗАЙН ЯЗЫЧКА ШТОРКИ
        html += `
        <div id="curtainToggleBar" class="curtain-toggle-bar" onclick="window.app.toggleChatCurtain()" 
             style="cursor: pointer; background: var(--bg-surface-hover); border-top: 1px dashed var(--border); border-bottom: 1px solid var(--border); padding: 8px 0; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: 0.2s;"
             onmouseover="this.style.background='rgba(255, 193, 7, 0.05)';" 
             onmouseout="this.style.background='var(--bg-surface-hover)';">
            <div style="display: flex; align-items: center; gap: 8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                <span id="curtainToggleText" style="font-family: 'Unbounded'; font-size: 11px; font-weight: 800; color: var(--text-main); letter-spacing: 0.5px;">ИНФОРМАЦИЯ</span>
                <span id="curtainToggleChevron" style="color: var(--primary); font-size: 10px; transition: transform 0.3s;">▼</span>
            </div>
            <div id="curtainHandle" class="curtain-handle" style="margin-top: 6px; width: 40px; height: 4px; background: var(--border); border-radius: 2px;"></div>
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

        const textInput = document.getElementById('curtainTextInput');
        textInput.value = data.text || '';
        
        // 🔥 ВНЕДРЯЕМ СТИЛИ ДЛЯ БОЛЬШОГО ОКНА (ТОЛЬКО ОДИН РАЗ)
        if (!document.getElementById('fullscreen-curtain-style')) {
            const style = document.createElement('style');
            style.id = 'fullscreen-curtain-style';
            style.innerHTML = `
                /* Растягиваем само окно на 90% экрана */
                #chatCurtainEditModal > div { 
                    width: 90vw !important; 
                    max-width: 1200px !important; 
                    height: 90vh !important; 
                    max-height: 900px !important;
                    display: flex !important; 
                    flex-direction: column !important; 
                }
                /* Растягиваем текстовое поле, чтобы оно заняло всё свободное место */
                #curtainTextInput {
                    flex: 1 1 auto !important; 
                    min-height: 250px !important; 
                    resize: none !important; 
                    font-family: 'Inter', 'Manrope', sans-serif !important;
                    font-size: 14px !important;
                    line-height: 1.5 !important;
                    border-radius: 8px !important;
                }
            `;
            document.head.appendChild(style);
        }

        // 🔥 СОЗДАЕМ ПАНЕЛЬ ИНСТРУМЕНТОВ ДЛЯ ТЕКСТА
        if (!document.getElementById('curtainFormattingToolbar')) {
            const toolbar = document.createElement('div');
            toolbar.id = 'curtainFormattingToolbar';
            toolbar.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px; padding:8px 12px; background:var(--bg-surface-hover); border-radius:8px; border:1px solid var(--border);';
            toolbar.innerHTML = `
                <button type="button" onclick="window.app.formatCurtainText('<b>', '</b>')" style="background:var(--bg-body); border:1px solid var(--border); color:var(--text-main); cursor:pointer; font-weight:bold; font-size:14px; padding:4px 12px; border-radius:6px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">Ж</button>
                <button type="button" onclick="window.app.formatCurtainText('<i>', '</i>')" style="background:var(--bg-body); border:1px solid var(--border); color:var(--text-main); cursor:pointer; font-style:italic; font-size:14px; font-family:serif; padding:4px 12px; border-radius:6px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">К</button>
                <button type="button" onclick="window.app.formatCurtainText('<u>', '</u>')" style="background:var(--bg-body); border:1px solid var(--border); color:var(--text-main); cursor:pointer; text-decoration:underline; font-size:14px; padding:4px 12px; border-radius:6px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">Ч</button>
                <div style="width:1px; background:var(--border); margin:0 4px;"></div>
                <button type="button" onclick="window.app.formatCurtainText('• ', '')" style="background:var(--bg-body); border:1px solid var(--border); color:var(--text-main); cursor:pointer; font-size:12px; padding:4px 12px; border-radius:6px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">📑 Список</button>
                <button type="button" onclick="window.app.formatCurtainText('<br>', '')" style="background:var(--bg-body); border:1px solid var(--border); color:var(--text-main); cursor:pointer; font-size:12px; padding:4px 12px; border-radius:6px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">↵ Разрыв строки</button>
            `;
            // Вставляем панель прямо над текстовым полем
            textInput.parentNode.insertBefore(toolbar, textInput);

            // Глобальная функция для обработки кликов по тулбару
            window.app.formatCurtainText = function(startTag, endTag) {
                const ta = document.getElementById('curtainTextInput');
                const start = ta.selectionStart;
                const end = ta.selectionEnd;
                const sel = ta.value.substring(start, end);
                ta.value = ta.value.substring(0, start) + startTag + sel + endTag + ta.value.substring(end);
                ta.focus();
                // Ставим курсор внутрь тегов (если текст выделен, он оборачивается)
                ta.setSelectionRange(start + startTag.length, start + startTag.length + sel.length);
            };
        }

        // Загружаем код карты
        document.getElementById('curtainEmbedInput').value = data.embed_code || '';
        document.getElementById('curtainImgInput').value = '';
        const imgDel = document.getElementById('curtainImgDelete');
        if(imgDel) imgDel.checked = false;

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
                const myTeams = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);
                const isCaptain = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['captain'] && myTeams.includes(updatedChat.team_id); 
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
    const tc = this.chats.find(c => {
        const cTeams = Array.isArray(c.team_id) ? c.team_id : (c.team_id ? [c.team_id] : []);
        return cTeams.includes(tTeam) && (c.type === 'team' || c.type === 'team_channel');
    });
    if (tc) this.openChat(tc.id); else alert("Чат команды не найден или скрыт.");
}
            } catch(e) { console.error(e); }
        }

        toggleTheme() {
            // 🔥 Оставили только две темы
            const themes = ['dark', 'light']; 
            const current = document.documentElement.getAttribute('data-theme'); 
            let idx = themes.indexOf(current); 
            if (idx === -1) idx = 0; 
            const nextTheme = themes[(idx + 1) % themes.length];
            
            document.documentElement.setAttribute('data-theme', nextTheme); 
            localStorage.setItem('sotka_theme', nextTheme);
            
            if (this.profileChartInstance) { 
                let gridColor = nextTheme === 'dark' ? '#27272a' : '#e4e4e7'; 
                this.profileChartInstance.options.scales.y.grid.color = gridColor; 
                this.profileChartInstance.update(); 
            }
            if (this.modalChartInstance) { 
                let gridColor = nextTheme === 'dark' ? '#27272a' : '#e4e4e7'; 
                this.modalChartInstance.options.scales.y.grid.color = gridColor; 
                this.modalChartInstance.update(); 
            }
        }
		
		// ==========================================
    // 🔥 ДРАФТ: ЗАГРУЗКА БАЛАНСА
    // ==========================================
    async loadDraftWallet() {
        try {
            const wallet = await pb.collection('draft_wallets').getFirstListItem(`user_id="${pb.authStore.model.id}"`);
            const balances = wallet.balances || {};
            
            // Суммируем все ключи в JSON
            const total = Object.values(balances).reduce((a, b) => a + b, 0);
            
            document.getElementById('draftWalletBalance').innerText = total.toLocaleString('ru-RU');
            
            // Если хочешь показать детализацию (сколько каких Ватт)
            console.log("Детализация кошелька:", balances);
        } catch (err) {
            document.getElementById('draftWalletBalance').innerText = '0';
        }
    }
// ==========================================
    // 🔥 ДРАФТ: ЗАГРУЗКА ИСТОРИИ ТРАНЗАКЦИЙ (С ПАГИНАЦИЕЙ)
    // ==========================================
    async loadDraftHistory(append = false) {
        const container = document.getElementById('draftTxHistory');
        if (!container) return;

        // Если это первая загрузка (не подгрузка), сбрасываем счетчик страниц
        if (!append) {
            this.draftHistoryPage = 1;
            container.innerHTML = `<div style="text-align:center; padding:20px;"><span class="spinner" style="width:20px;height:20px;border-width:2px;display:inline-block;border-color:var(--primary) transparent transparent transparent;"></span></div>`;
        } else {
            this.draftHistoryPage++;
            // Превращаем кнопку в лоадер, чтобы не накликали дважды
            const oldBtn = document.getElementById('btnLoadMoreDraftHistory');
            if (oldBtn) oldBtn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;border-color:var(--primary) transparent transparent transparent;"></span> Загрузка...`;
        }
        
        try {
            // ID текущего системного пользователя
            const myUserId = pb.authStore.model.id;
            
            // Скачиваем операции для текущей страницы
            const res = await pb.collection('draft_transactions').getList(this.draftHistoryPage, 20, {
                filter: `sender_id="${myUserId}" || receiver_id="${myUserId}"`,
                sort: '-created', // От новых к старым
                requestKey: 'draft_history_' + this.draftHistoryPage // Уникальный ключ для пагинации
            });

            if (!append && res.items.length === 0) {
                container.innerHTML = `
                    <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; text-align: center;">
                        <div style="color: var(--text-muted); font-size: 12px;">Операций пока нет.</div>
                    </div>`;
                return;
            }

            let html = '';
            res.items.forEach(tx => {
                const isOutgoing = tx.sender_id === myUserId;
                
                // Находим имя второго участника
                const otherUserId = isOutgoing ? tx.receiver_id : tx.sender_id;
                let otherName = "Система / Магазин";
                
                if (otherUserId) {
                    const otherRider = Object.values(this.ridersMap).find(r => r.user_id === otherUserId || r.id === otherUserId);
                    if (otherRider) {
                        otherName = `${otherRider.first_name} ${otherRider.last_name}`;
                    }
                }

                // 🔥 УМНЫЙ ПАРСИНГ ОПИСАНИЯ ДЛЯ ДИЗАЙНА
                const sign = isOutgoing ? '-' : '+';
                const color = isOutgoing ? 'var(--text-main)' : 'var(--success)';
                
                let icon = isOutgoing 
                    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>` 
                    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`;
                
                let typeLabel = isOutgoing ? 'Перевод' : 'Пополнение';
                
                // Перехватываем транзакции Драфта по нашей метке
                if (tx.description && tx.description.includes('[DRAFT]')) {
                    typeLabel = 'Аналитика (Драфт)';
                    icon = `🏆`; // Ставим иконку кубка вместо стрелочки
                    tx.description = tx.description.replace('[DRAFT] ', ''); // Убираем технический тег для красоты
                    otherName = "Система VILKA"; // Переопределяем получателя, чтобы не было путаницы
                } else if (tx.description && tx.description.includes('T-Bank')) {
                    typeLabel = 'Банковский перевод';
                    icon = `💳`;
                }
                const dateStr = new Date(tx.created).toLocaleDateString('ru-RU', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});

                html += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:15px; margin-bottom:8px; transition:0.2s;" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:40px; height:40px; border-radius:50%; background:var(--bg-body); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            ${icon}
                        </div>
                        <div>
                            <div style="font-weight:800; font-size:12px; color:var(--text-main); font-family:'Unbounded';">${typeLabel}</div>
                            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${otherName} • ${dateStr}</div>
                            ${tx.description ? `<div style="font-size:10px; color:var(--text-muted); margin-top:4px; font-style:italic;">«${this.escapeHTML(tx.description)}»</div>` : ''}
                        </div>
                    </div>
                    <div style="font-family:'Roboto Mono'; font-weight:bold; font-size:16px; color:${color};">
                        ${sign}${tx.amount}
                    </div>
                </div>`;
            });
            
            // Если это следующая страница, удаляем старую кнопку и дописываем HTML в конец
            if (append) {
                const oldBtn = document.getElementById('btnLoadMoreDraftHistory');
                if (oldBtn) oldBtn.remove();
                container.innerHTML += html;
            } else {
                container.innerHTML = html;
            }

            // 🔥 Если мы скачали ровно 20 элементов, значит в базе могут быть еще старые переводы.
            // Добавляем красивую кнопку загрузки в самый низ
            if (res.items.length === 20) {
                container.innerHTML += `
                <button id="btnLoadMoreDraftHistory" onclick="window.app.loadDraftHistory(true)" style="width: 100%; background: transparent; border: 1px dashed var(--border); color: var(--text-muted); padding: 14px; border-radius: 12px; font-family: 'Unbounded'; font-size: 11px; font-weight: 800; cursor: pointer; transition: 0.2s; margin-top: 5px;" onmouseover="this.style.color='var(--primary)'; this.style.borderColor='var(--primary)';" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border)';">
                    ПОКАЗАТЬ ЕЩЕ
                </button>`;
            }

        } catch(e) {
            console.error("Ошибка загрузки истории:", e);
            if (!append) {
                container.innerHTML = `<div style="color:var(--danger); font-size:11px; text-align:center;">Ошибка загрузки истории</div>`;
            } else {
                const oldBtn = document.getElementById('btnLoadMoreDraftHistory');
                if (oldBtn) oldBtn.innerHTML = `Ошибка. Нажмите, чтобы повторить`;
            }
        }
    }

// ==========================================
    // 🔥 ДРАФТ: МОДАЛКА И ПОИСК ГОНЩИКОВ ДЛЯ ПЕРЕВОДА
    // ==========================================
    openDraftTransferModal() {
        // Очищаем все поля при открытии
        document.getElementById('transferRecipientId').value = '';
        document.getElementById('transferSearchInput').value = '';
        document.getElementById('transferAmountInput').value = '';
        document.getElementById('transferCommentInput').value = '';
        
        // Рисуем полный список гонщиков
        this.renderTransferRecipients(''); 
        
        document.getElementById('draftTransferModal').style.display = 'flex';
    }

    renderTransferRecipients(query) {
        const list = document.getElementById('transferRecipientList');
        if (!list) return;
        
        const q = query.toLowerCase().trim();
        // Берем всех гонщиков, кроме себя, бота и гостей
        let riders = Object.values(this.ridersMap).filter(r => r.id !== this.currentRider.id && r.email !== 'bot@sotka.one' && !(r.email && r.email.startsWith('guest_')));
        
        // Фильтруем по поиску (имя или фамилия)
        if (q) {
            riders = riders.filter(r => (r.first_name + ' ' + r.last_name).toLowerCase().includes(q) || (r.last_name + ' ' + r.first_name).toLowerCase().includes(q));
        }
        
        // Сортируем по алфавиту (по фамилии)
        riders.sort((a,b) => (a.last_name || '').localeCompare(b.last_name || ''));
        
        const selectedId = document.getElementById('transferRecipientId').value;
        
        if (riders.length === 0) {
            list.innerHTML = `<div style="text-align:center; padding:15px; font-size:11px; color:var(--text-muted); font-family:'Unbounded';">НИКТО НЕ НАЙДЕН</div>`;
            return;
        }
        
        let html = '';
        riders.forEach(r => {
            const isSelected = r.id === selectedId;
            const bg = isSelected ? 'rgba(255,193,7,0.15)' : 'transparent';
            const border = isSelected ? '1px solid var(--primary)' : '1px solid transparent';
            const name = this.escapeHTML((r.last_name || '') + ' ' + (r.first_name || ''));
            const team = this.escapeHTML(this.getRiderTeamName(r));
            const avatarChar = r.first_name ? r.first_name.charAt(0).toUpperCase() : '?';
            
            html += `
            <div class="contact-item" style="background:${bg}; border:${border}; padding: 8px 12px; margin-bottom:2px;" onclick="window.app.selectTransferRecipient('${r.id}')">
                <div style="display:flex; align-items:center; gap:10px;">
                    ${this.renderAvatar(r.id, 'width:32px; height:32px; font-size:12px; background:var(--bg-surface-hover);', avatarChar)}
                    <div>
                        <div style="font-weight:600; font-size:13px; color:var(--text-main);">${name}</div>
                        <div style="font-size:10px; color:var(--text-muted);">${team}</div>
                    </div>
                </div>
                ${isSelected ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''}
            </div>`;
        });
        
        list.innerHTML = html;
    }

    filterTransferRecipients(val) {
        this.renderTransferRecipients(val);
    }

    selectTransferRecipient(id) {
        // Запоминаем ID и перерисовываем список, чтобы показать красивую галочку
        document.getElementById('transferRecipientId').value = id;
        const searchInput = document.getElementById('transferSearchInput');
        this.renderTransferRecipients(searchInput.value);
    }
	
	// ==========================================
    // 🔥 ДРАФТ: ОПЛАТА УСЛУГ / ВЗНОСОВ НА ГОНКУ
    // ==========================================
    async payForService(amount, purpose) {
        // Защита от случайных нажатий
        if (!confirm(`Подтвердите списание:\n${amount} ВАТТ\nНазначение: ${purpose}`)) {
            return;
        }

        try {
            const response = await pb.send('/api/draft/pay', {
                method: 'POST',
                body: {
                    amount: amount,
                    purpose: purpose
                }
            });

            if (response.success) {
                alert(`✅ Успешно оплачено: ${amount} Ватт!`);
                // Обновляем баланс и историю на экране
                this.loadDraftWallet();
                this.loadDraftHistory();
            }
        } catch (error) {
            console.error("Ошибка оплаты:", error);
            alert(error.data?.message || "Произошла ошибка при оплате.");
        }
    }
	
	// ==========================================
    // 🔥 ДРАФТ: ПОПОЛНЕНИЕ ЧЕРЕЗ Т-БАНК
    // ==========================================
    async promptTopup() {
        const amount = prompt("💳 Введите сумму пополнения (руб):", "2500");
        if (!amount || isNaN(parseInt(amount))) return;

        // 🔥 Берем email напрямую из кэша Вилки на клиенте
        const userEmail = pb.authStore.model.email || "info@sotka.one";

        try {
            // Передаем и сумму, и почту на наш сервер
            const res = await pb.send('/api/draft/topup', {
                method: 'POST',
                body: { 
                    amount: parseInt(amount),
                    email: userEmail 
                }
            });

            if (res && res.paymentUrl) {
                // Если всё супер — летим на страницу банка!
                window.location.href = res.paymentUrl;
            } else {
                alert("Ошибка: Банк не вернул ссылку на оплату.");
            }
        } catch (err) {
            console.error("Ошибка инициализации платежа:", err);
            
            let errorMsg = "Произошла ошибка при создании платежа.";
            if (err.data && err.data.details) {
                errorMsg += `\nДетали: ${err.data.details}`;
            } else if (err.data && err.data.error) {
                errorMsg += `\n${err.data.error}`;
            }
            alert(errorMsg);
        }
    }
	
// ==========================================
    // 🔥 ДРАФТ: ВЫПОЛНЕНИЕ ПЕРЕВОДА (ОБРАЩЕНИЕ К API)
    // ==========================================
    async executeDraftTransfer() {
        const recipientId = document.getElementById('transferRecipientId').value;
        const amount = parseInt(document.getElementById('transferAmountInput').value);
        const comment = document.getElementById('transferCommentInput').value.trim();
        const btn = document.getElementById('btnExecuteTransfer');

        // Проверки на клиенте
        if (!recipientId) return alert("Выберите, кому перевести Ватты!");
        if (!amount || amount <= 0) return alert("Сумма должна быть больше 0!");

        // Блокируем кнопку, чтобы не нажали дважды (защита от дабл-клика)
        const oldText = btn.innerText;
        btn.innerText = 'ОБРАБОТКА...';
        btn.disabled = true;
        btn.style.opacity = '0.7';

        try {
            // Стучимся в наш секретный банковский эндпоинт
            const response = await pb.send('/api/draft/transfer', {
                method: 'POST',
                body: {
                    recipient_id: recipientId,
                    amount: amount,
                    comment: comment
                }
            });

            if (response.success) {
                alert("✅ Ватты успешно отправлены!");
                document.getElementById('draftTransferModal').style.display = 'none';
                
                // Мгновенно обновляем баланс на экране, чтобы юзер увидел списание
                this.loadDraftWallet();
				this.loadDraftHistory();
            }
        } catch (err) {
            console.error("Ошибка перевода:", err);
            // Если сервер PocketBase выкинул ошибку (например, нет денег), выводим её юзеру
            const errMsg = err.data?.message || "Ошибка перевода. Проверьте баланс или соединение.";
            alert("❌ " + errMsg);
        } finally {
            // Возвращаем кнопку в исходное состояние
            btn.innerText = oldText;
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }
	
	// ==========================================
    // 🔥 ДРАФТ: ФЭНТЕЗИ-ЛИГА (АНАЛИТИКА)
    // ==========================================

// 🔥 ЭКРАН ИТОГОВЫХ РЕЗУЛЬТАТОВ ДРАФТА (ЛИДЕРБОРД)
    async renderDraftResults(configId) {
        // Ставим якорь, чтобы новости не перекрывали экран
        this.activeChatId = 'draft';

        const container = document.getElementById('messagesContainer');
		const curtain = document.getElementById('curtainContainer');
        if (curtain) { curtain.style.display = 'none'; curtain.innerHTML = ''; }
        container.innerHTML = `<div style="text-align:center; padding:40px;"><span class="spinner" style="width:30px; height:30px; border-width:3px; display:inline-block;"></span></div>`;

        try {
            // 1. Получаем конфиг и данные гонки
            const conf = await pb.collection('draft_configs').getOne(configId, { expand: 'race_id', requestKey: null });
            const race = conf.expand?.race_id;

            // 2. Выкачиваем все заявки участников (дримтим) на эту гонку
            // Сортируем: 1. Сумма кругов (убыв.), 2. Время (возр.), 3. Дата заявки (возр.)
            const rosters = await pb.collection('draft_rosters').getFullList({
                filter: `race_id="${conf.race_id}"`,
                expand: 'owner_id,rider_1,rider_2,rider_3',
                sort: '-laps_sum,time_sum,created',
                requestKey: null
            });

            let listHtml = '';
            
            if (rosters.length === 0) {
                listHtml = `<div style="text-align:center; padding:40px; color:var(--text-muted); font-family:'Unbounded';">Заявок на этот турнир пока нет</div>`;
            } else {
                rosters.forEach((r, idx) => {
                    const manager = r.expand?.owner_id;
                    if (!manager) return;
                    
                    const mName = `${manager.first_name} ${manager.last_name}`;
                    const fChar = manager.first_name ? manager.first_name.charAt(0) : '?';
                    
                    // Медали для тройки лидеров
                    let rankBadge = `<div style="font-family:'Roboto Mono'; font-size:16px; font-weight:bold; color:var(--text-muted); width:30px; text-align:center;">${idx + 1}</div>`;
                    if (idx === 0) rankBadge = `<div style="font-size:20px; width:30px; text-align:center;">🥇</div>`;
                    if (idx === 1) rankBadge = `<div style="font-size:20px; width:30px; text-align:center;">🥈</div>`;
                    if (idx === 2) rankBadge = `<div style="font-size:20px; width:30px; text-align:center;">🥉</div>`;

                    // Данные результата (если laps_sum еще не заполнен в базе — показываем прочерки)
                    const hasResult = r.laps_sum !== undefined && r.laps_sum !== null && r.laps_sum > 0;
                    const laps = hasResult ? `${r.laps_sum} кр.` : '—';
                    const time = (hasResult && r.time_sum) ? this.formatMs(r.time_sum) : 'Ожидание';

                    const isMe = manager.id === this.currentRider.id;
                    const bgStyle = isMe ? 'background:rgba(255,193,7,0.05); border:1px solid var(--primary);' : 'background:var(--bg-surface); border:1px solid var(--border);';

                    // Список гонщиков, которых выбрал этот менеджер
                    const getShortName = (rider) => rider ? `${rider.first_name.charAt(0)}. ${rider.last_name}` : 'Н/Д';
const r1 = getShortName(r.expand?.rider_1);
const r2 = getShortName(r.expand?.rider_2);
const r3 = getShortName(r.expand?.rider_3);

                    listHtml += `
                        <div style="${bgStyle} border-radius:12px; padding:15px; margin-bottom:10px; display:flex; align-items:center; gap:12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                            ${rankBadge}
                            ${this.renderAvatar(manager.id, 'width:36px; height:36px; font-size:14px;', fChar)}
                            <div style="flex:1; min-width:0;">
                                <div style="font-family:'Unbounded'; font-weight:800; font-size:12px; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.escapeHTML(mName)}</div>
                                <div style="font-size:9px; color:var(--text-muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Состав: ${this.escapeHTML(r1)}, ${this.escapeHTML(r2)}, ${this.escapeHTML(r3)}</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-family:'Roboto Mono'; font-weight:bold; color:var(--primary); font-size:14px;">${laps}</div>
                                <div style="font-family:'Roboto Mono'; font-size:10px; color:var(--text-muted);">${time}</div>
                            </div>
                        </div>
                    `;
                });
            }

            // Итоговая сборка экрана результатов
            const html = `
                <div style="display:flex; flex-direction:column; height:100%;">
                    <div style="padding:15px 20px; border-bottom:1px solid var(--border); background:var(--bg-surface); display:flex; align-items:center; gap:15px; position:sticky; top:0; z-index:10;">
                        <button onclick="window.app.renderDraftLobby()" style="background:none; border:none; color:var(--text-main); font-size:20px; cursor:pointer;">←</button>
                        <div>
                            <div style="font-family:'Unbounded'; font-size:14px; font-weight:800; color:var(--text-main); text-transform:uppercase;">${this.escapeHTML(race?.name || 'Турнир')}</div>
                            <div style="font-size:11px; color:var(--text-muted);">Итоговый протокол аналитики</div>
                        </div>
                    </div>

                    <div style="padding:20px; overflow-y:auto; flex:1; max-width:800px; margin:0 auto; width:100%; box-sizing:border-box;">
                        <div style="text-align:center; margin-bottom:20px;">
                            <div style="font-size:32px; margin-bottom:5px;">🏁</div>
                            <div style="font-family:'Unbounded'; font-weight:800; font-size:11px; color:var(--text-muted);">РЕЙТИНГ АНАЛИТИКОВ</div>
                        </div>
                        ${listHtml}
                    </div>
                </div>
            `;

            container.innerHTML = html;

        } catch (e) {
            console.error("Ошибка загрузки результатов Драфта:", e);
            container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger);">Ошибка при формировании протокола</div>`;
        }
    }

    async renderDraftLobby() {
        this.switchTab('draft');
        
        // Принудительно открываем правое окно на мобилках
        const ws = document.getElementById('pelotonWorkspace');
        const mainChat = document.getElementById('mainChatArea');
        if (ws) ws.style.display = 'none';
        if (mainChat) mainChat.style.display = 'flex';
        this.openChatMobile(); 

        // Якорь, чтобы Лента новостей не перекрывала Драфт
        this.activeChatId = 'draft'; 

        const container = document.getElementById('messagesContainer');
        if (!container) return;

        document.getElementById('chatHeader').style.display = 'none';
        document.getElementById('inputWrapper').style.display = 'none';
        document.getElementById('pinnedMessageBar').style.display = 'none';
        const curtain = document.getElementById('curtainContainer');
        if (curtain) { curtain.style.display = 'none'; curtain.innerHTML = ''; }
        
        container.innerHTML = `<div style="text-align:center; padding:40px;"><span class="spinner" style="width:30px; height:30px; border-width:3px; display:inline-block;"></span></div>`;
		
        try {
            // Грузим ВСЕ турниры
            const configs = await pb.collection('draft_configs').getFullList({
                expand: 'race_id',
                sort: '-created'
            });

            // 🔥 ШАБЛОН ШАПКИ (ИСПОЛЬЗУЕМ ВЕЗДЕ)
            const headerHtml = `
                <div style="padding:15px 20px; border-bottom:1px solid var(--border); background:var(--bg-surface); display:flex; align-items:center; gap:15px; position:sticky; top:0; z-index:10;">
                    <button onclick="window.app.closeChatMobile()" style="background:none; border:none; color:var(--text-main); font-size:20px; cursor:pointer; padding:0 10px 0 0; display: ${window.innerWidth <= 768 ? 'block' : 'none'};">←</button>
                    
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:36px; height:36px; border-radius:12px; background:var(--primary); color:#000; display:flex; align-items:center; justify-content:center; font-size:18px;">🏆</div>
                        <div>
                            <div style="font-family:'Unbounded'; font-size:14px; font-weight:800; color:var(--text-main); text-transform:uppercase;">DRAFT ANALYTICS</div>
                            <div style="font-size:11px; color:var(--text-muted);">Фэнтези-лига</div>
                        </div>
                    </div>
                </div>
            `;

            if (configs.length === 0) {
                // Если турниров нет, всё равно рисуем шапку, чтобы юзер мог выйти!
                container.innerHTML = `
                    <div style="display:flex; flex-direction:column; height:100%;">
                        ${headerHtml}
                        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; color:var(--text-muted); font-family:'Unbounded';">
                            <div style="font-size: 40px; margin-bottom: 10px;">📉</div>
                            НЕТ ТУРНИРОВ
                            <div style="font-family: 'Manrope'; font-size: 12px; margin-top: 5px;">Спортивная аналитика пока закрыта.</div>
                        </div>
                    </div>`;
                return;
            }

            const myRosters = await pb.collection('draft_rosters').getFullList({
                filter: `owner_id="${this.currentRider.id}"`
            });
            const myRosterMap = {};
            myRosters.forEach(r => myRosterMap[r.race_id] = r);

            // Собираем HTML списка
            let html = `
                <div style="display:flex; flex-direction:column; height:100%;">
                    ${headerHtml}
                    <div style="padding: 20px; max-width: 600px; margin: 0 auto; width: 100%; box-sizing: border-box; flex: 1; overflow-y: auto;">
                        <div style="display: flex; flex-direction: column; gap: 15px;">
            `;

            configs.forEach(conf => {
                const race = conf.expand?.race_id;
                if (!race) return;
                
                const roster = myRosterMap[race.id];
                const dateStr = new Date(race.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
                
                const isRaceFinished = race.status === 'Finished' || !conf.is_active;
                let actionHtml = '';
                
                if (isRaceFinished) {
                    actionHtml = `
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--border);">
                            <button onclick="window.app.renderDraftResults('${conf.id}')" style="width:100%; background:var(--bg-surface-hover); color:var(--text-main); border:1px solid var(--border); padding:12px; border-radius:8px; font-family:'Unbounded'; font-size:11px; font-weight:800; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='var(--bg-surface-hover)'">🏆 ИТОГОВЫЙ ПРОТОКОЛ</button>
                        </div>
                    `;
                } else {
                    if (roster) {
                        actionHtml = `
                            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--border); display: flex; justify-content: space-between; align-items: center;">
                                <div style="font-size: 11px; color: var(--success); font-family:'Unbounded'; font-weight:800;">✅ КОМАНДА СОБРАНА</div>
                                <button onclick="window.app.renderDraftBuilder('${conf.id}')" style="background:var(--bg-surface-hover); color:var(--text-main); border:1px solid var(--border); padding:8px 16px; border-radius:8px; font-family:'Unbounded'; font-size:10px; font-weight:800; cursor:pointer;">ИЗМЕНИТЬ (-${conf.transfer_fee} Ватт)</button>
                            </div>
                        `;
                    } else {
                        actionHtml = `
                            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--border);">
                                <button onclick="window.app.renderDraftBuilder('${conf.id}')" style="width:100%; background:var(--primary); color:#000; border:none; padding:12px; border-radius:8px; font-family:'Unbounded'; font-size:11px; font-weight:800; cursor:pointer; box-shadow: 0 4px 15px rgba(255,193,7,0.3);">СОБРАТЬ КОМАНДУ</button>
                            </div>
                        `;
                    }
                }

                html += `
                    <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
                            <div style="font-family:'Unbounded'; font-size:14px; font-weight:800; color:var(--text-main); text-transform:uppercase;">${this.escapeHTML(race.name)}</div>
                            <div style="font-size:11px; color:${isRaceFinished ? 'var(--text-muted)' : 'var(--danger)'}; font-family:'Roboto Mono'; font-weight:bold;">${isRaceFinished ? 'Завершено' : 'LIVE'}</div>
                        </div>
                        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">Лимит стоимости: <span style="color:var(--text-main); font-family:'Roboto Mono'; font-weight:bold;">${conf.salary_cap} Ватт</span></div>
                        ${actionHtml}
                    </div>
                `;
            });

            html += `</div></div></div>`; // Закрываем все обертки
            container.innerHTML = html;

        } catch (e) {
            console.error("Ошибка загрузки Драфта:", e);
            container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger);">Ошибка загрузки данных турниров</div>`;
        }
    }
	
    async renderDraftBuilder(configId) {
		this.activeChatId = 'draft';
        const container = document.getElementById('messagesContainer');
		const curtain = document.getElementById('curtainContainer');
        if (curtain) { curtain.style.display = 'none'; curtain.innerHTML = ''; }
        container.innerHTML = `<div style="text-align:center; padding:40px;"><span class="spinner" style="width:30px; height:30px; border-width:3px; display:inline-block;"></span></div>`;

        try {
            // 1. Загружаем конфиг, гонку, и мой старый ростер (если есть)
            const conf = await pb.collection('draft_configs').getOne(configId, { expand: 'race_id' });
            const race = conf.expand?.race_id;
            
            let myRoster = null;
            try {
                myRoster = await pb.collection('draft_rosters').getFirstListItem(`owner_id="${this.currentRider.id}" && race_id="${race.id}"`);
            } catch(e) {} // Если нет заявки, будет 404

            // 2. Получаем стартовый лист этой гонки, чтобы собрать маркет
            const raceRosters = await pb.collection('race_rosters').getFullList({
                filter: `race_id="${race.id}" && status!="canceled"`,
                expand: 'rider_id'
            });

            // Формируем список доступных гонщиков с их ценами
            this.draftMarket = raceRosters.map(r => {
                const rider = r.expand?.rider_id;
                if (!rider) return null;
                const cluster = rider.base_cluster || 'B';
                const cost = conf.cluster_prices[cluster] || 0;
                return { ...rider, draftCost: cost, draftCluster: cluster };
            }).filter(Boolean).sort((a, b) => b.draftCost - a.draftCost); // Сортируем от дорогих к дешевым

            // 3. Инициализируем текущий выбор
            // Слот 1 всегда Я (или пустышка, если меня нет в стартовом листе)
            const meInMarket = this.draftMarket.find(r => r.id === this.currentRider.id);
            this.draftCurrentSelection = [
                meInMarket || null, // Слот 1
                null, // Слот 2
                null  // Слот 3
            ];

            // Если была старая заявка, подставляем гонщиков
            let isEditing = false;
            if (myRoster) {
                isEditing = true;
                this.draftCurrentSelection[1] = this.draftMarket.find(r => r.id === myRoster.rider_2) || null;
                this.draftCurrentSelection[2] = this.draftMarket.find(r => r.id === myRoster.rider_3) || null;
            }

            // 4. Рендерим интерфейс сборщика
            this.updateDraftBuilderUI(conf, isEditing);

        } catch(e) {
            console.error("Ошибка открытия сборщика Драфта:", e);
            container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger);">Ошибка сборщика</div>`;
        }
    }

    updateDraftBuilderUI(conf, isEditing) {
        const container = document.getElementById('messagesContainer');
        const race = conf.expand?.race_id;

        // 🔥 СОХРАНЯЕМ СОСТОЯНИЕ ПОИСКА (чтобы при клике на гонщика текст не стирался)
        let currentSearch = '';
        let searchWasFocused = false;
        const existingSearch = document.getElementById('draftSearchInput');
        if (existingSearch) {
            currentSearch = existingSearch.value;
            searchWasFocused = document.activeElement === existingSearch;
        }

        // Считаем текущие затраты
        let currentCost = 0;
        let selectedCount = 0;
        this.draftCurrentSelection.forEach(r => {
            if (r) {
                currentCost += r.draftCost;
                selectedCount++;
            }
        });

        const isOverCap = currentCost > conf.salary_cap;
        
        // Получаем баланс из DOM (загруженный loadDraftWallet)
        const currentBalanceStr = document.getElementById('draftWalletBalance').innerText.replace(/\D/g, '');
        const currentBalance = parseInt(currentBalanceStr) || 0;
        
        // Стоимость сохранения
        const feeToPay = isEditing ? conf.transfer_fee : currentCost;
        const canAfford = currentBalance >= feeToPay;
        const canSubmit = selectedCount === 3 && !isOverCap && canAfford;

        let btnState = 'disabled style="background:var(--bg-surface-hover); color:var(--text-muted);"';
        let btnText = 'СОБЕРИТЕ КОМАНДУ';
        
        if (selectedCount === 3) {
            if (isOverCap) {
                btnText = 'ПРЕВЫШЕН ЛИМИТ';
            } else if (!canAfford) {
                btnText = 'НЕДОСТАТОЧНО ВАТТ';
            } else {
                btnState = `style="background:var(--primary); color:#000; box-shadow: 0 4px 15px rgba(255,193,7,0.3);"`;
                btnText = isEditing ? `ОПЛАТИТЬ ШТРАФ (-${feeToPay}) И СОХРАНИТЬ` : `ЗАЯВИТЬ КОМАНДУ (-${feeToPay} ВАТТ)`;
            }
        }

        // Рендер слотов
        const renderSlot = (index, rider) => {
            if (rider) {
                const fChar = rider.first_name ? rider.first_name.charAt(0) : '?';
                return `
                    <div style="background:var(--bg-body); border:1px solid ${index === 0 ? 'var(--info)' : 'var(--border)'}; border-radius:12px; padding:10px; display:flex; align-items:center; gap:10px; position:relative;">
                        ${this.renderAvatar(rider.id, 'width:32px; height:32px; font-size:12px;', fChar)}
                        <div style="flex:1; min-width:0;">
                            <div style="font-size:11px; font-family:'Unbounded'; font-weight:800; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.escapeHTML(rider.first_name)} ${this.escapeHTML(rider.last_name)}</div>
                            <div style="font-size:10px; color:var(--text-muted);"><span style="color:var(--primary); border:1px solid var(--primary); padding:1px 4px; border-radius:4px; font-size:8px;">${rider.draftCluster}</span></div>
                        </div>
                        <div style="font-family:'Roboto Mono'; font-size:14px; font-weight:bold; color:var(--danger);">${rider.draftCost}</div>
                        ${index > 0 ? `<button onclick="window.app.draftRemoveRider(${index}, '${conf.id}', ${isEditing})" style="position:absolute; top:-5px; right:-5px; background:var(--danger); color:#fff; border:none; width:20px; height:20px; border-radius:50%; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>` : ''}
                    </div>
                `;
            } else {
                return `
                    <div style="background:rgba(255,255,255,0.02); border:1px dashed var(--border); border-radius:12px; padding:10px; height:54px; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:20px;">
                        +
                    </div>
                `;
            }
        };

        // Рендер маркета (добавляем классы и data-атрибуты для поиска)
        let marketHtml = '';
        this.draftMarket.forEach(rider => {
            if (this.draftCurrentSelection.find(r => r && r.id === rider.id)) return;

            const fChar = rider.first_name ? rider.first_name.charAt(0) : '?';
            const searchName = `${rider.first_name || ''} ${rider.last_name || ''}`.toLowerCase(); // Имя для скрытого поиска

            marketHtml += `
                <div class="draft-market-item" data-search="${this.escapeHTML(searchName)}" onclick="window.app.draftAddRider('${rider.id}', '${conf.id}', ${isEditing})" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border); cursor:pointer; transition:0.2s;" onmouseover="this.style.background='var(--bg-surface-hover)'" onmouseout="this.style.background='transparent'">
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${this.renderAvatar(rider.id, 'width:32px; height:32px; font-size:12px;', fChar)}
                        <div>
                            <div style="font-size:12px; font-weight:600; color:var(--text-main);">${this.escapeHTML(rider.first_name)} ${this.escapeHTML(rider.last_name)}</div>
                            <div style="font-size:9px; color:var(--text-muted);">Кластер ${rider.draftCluster}</div>
                        </div>
                    </div>
                    <div style="font-family:'Roboto Mono'; font-weight:bold; color:var(--primary); font-size:14px;">${rider.draftCost}</div>
                </div>
            `;
        });

        // Финальная сборка экрана (добавлено поле input)
        const html = `
            <div style="display:flex; flex-direction:column; height:100%;">
                
                <div style="padding:15px 20px; border-bottom:1px solid var(--border); background:var(--bg-surface); display:flex; align-items:center; gap:15px; position:sticky; top:0; z-index:10;">
                    <button onclick="window.app.renderDraftLobby()" style="background:none; border:none; color:var(--text-main); font-size:20px; cursor:pointer;">←</button>
                    <div>
                        <div style="font-family:'Unbounded'; font-size:14px; font-weight:800; color:var(--text-main); text-transform:uppercase;">${this.escapeHTML(race.name)}</div>
                        <div style="font-size:11px; color:var(--text-muted);">Сборка Дримтим</div>
                    </div>
                </div>

                <div style="padding:20px; overflow-y:auto; flex:1;">
                    
                    <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:16px; padding:15px; margin-bottom:20px; text-align:center;">
                        <div style="font-size:10px; font-family:'Unbounded'; color:var(--text-muted); margin-bottom:5px;">ЗАНЯТО БЮДЖЕТА</div>
                        <div style="font-size:24px; font-family:'Roboto Mono'; font-weight:bold; color:${isOverCap ? 'var(--danger)' : 'var(--primary)'};">
                            ${currentCost} <span style="font-size:14px; color:var(--text-muted);">/ ${conf.salary_cap}</span>
                        </div>
                        <div style="font-size:10px; color:var(--text-muted); margin-top:5px;">Ваш баланс: ${currentBalance} Ватт</div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:20px;">
                        ${renderSlot(0, this.draftCurrentSelection[0])}
                        ${renderSlot(1, this.draftCurrentSelection[1])}
                        ${renderSlot(2, this.draftCurrentSelection[2])}
                    </div>

                    <button id="btnSubmitDraft" onclick="window.app.submitDraftRoster('${conf.id}', ${isEditing})" class="btn-black" ${btnState} style="width:100%; border:none; padding:14px; border-radius:8px; font-family:'Unbounded'; font-size:11px; font-weight:800; cursor:pointer; margin-bottom:25px; transition:0.2s;">
                        ${btnText}
                    </button>

                    <div>
                        <div style="font-family:'Unbounded'; font-size:12px; color:var(--text-muted); margin-bottom:10px;">РЫНОК АТЛЕТОВ</div>
                        
                        <div style="margin-bottom: 12px;">
                            <input type="text" id="draftSearchInput" placeholder="🔍 Поиск гонщика..." class="auth-input" value="${this.escapeHTML(currentSearch)}" style="width:100%; margin:0; padding:12px; font-size:12px; border-radius:8px; background:var(--bg-body); color:var(--text-main); border:1px solid var(--border);" oninput="window.app.filterDraftMarket(this.value)">
                        </div>

                        <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; overflow:hidden;" id="draftMarketList">
                            ${marketHtml || '<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:11px;">Нет доступных гонщиков</div>'}
                            <div id="draftMarketEmpty" style="display:none; padding:20px; text-align:center; color:var(--text-muted); font-size:11px; font-family:'Unbounded';">Никого не найдено 🤷‍♂️</div>
                        </div>
                    </div>

                </div>
            </div>
        `;

        container.innerHTML = html;

        // 🔥 ВОССТАНАВЛИВАЕМ СОСТОЯНИЕ ПОИСКА
        if (currentSearch) {
            this.filterDraftMarket(currentSearch);
        }
        if (searchWasFocused) {
            setTimeout(() => {
                const inp = document.getElementById('draftSearchInput');
                if (inp) {
                    inp.focus();
                    // Ставим курсор в конец текста
                    inp.setSelectionRange(inp.value.length, inp.value.length);
                }
            }, 10);
        }
    }

// 🔥 ФУНКЦИЯ МГНОВЕННОГО ПОИСКА ПО РЫНКУ
    filterDraftMarket(query) {
        const q = query.toLowerCase().trim();
        const items = document.querySelectorAll('.draft-market-item');
        let visibleCount = 0;
        
        items.forEach(item => {
            const searchName = item.getAttribute('data-search') || '';
            if (searchName.includes(q)) {
                item.style.display = 'flex';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });
        
        // Показываем/скрываем заглушку "Никого не найдено"
        const emptyMsg = document.getElementById('draftMarketEmpty');
        if (emptyMsg) {
            emptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
        }
    }

    draftAddRider(riderId, configId, isEditing) {
        const rider = this.draftMarket.find(r => r.id === riderId);
        if (!rider) return;

        // Ищем пустой слот (начиная со второго, первый - Я)
        if (!this.draftCurrentSelection[1]) {
            this.draftCurrentSelection[1] = rider;
        } else if (!this.draftCurrentSelection[2]) {
            this.draftCurrentSelection[2] = rider;
        } else {
            alert("Команда уже заполнена! Удалите кого-то.");
            return;
        }

        // 🔥 ФИКС: Обязательно запрашиваем expand: 'race_id', чтобы не падала шапка интерфейса
        pb.collection('draft_configs').getOne(configId, { expand: 'race_id', requestKey: null }).then(conf => {
            this.updateDraftBuilderUI(conf, isEditing);
        });
    }

    draftRemoveRider(index, configId, isEditing) {
        if (index === 0) {
            alert("Вы не можете удалить себя из своей команды!");
            return;
        }
        this.draftCurrentSelection[index] = null;
        
        // 🔥 ФИКС: Также запрашиваем expand при удалении гонщика
        pb.collection('draft_configs').getOne(configId, { expand: 'race_id', requestKey: null }).then(conf => {
            this.updateDraftBuilderUI(conf, isEditing);
        });
    }

    async submitDraftRoster(configId, isEditing) {
        if (!this.draftCurrentSelection[0] || !this.draftCurrentSelection[1] || !this.draftCurrentSelection[2]) {
            return alert("Соберите полную команду из 3-х человек!");
        }

        const btn = document.getElementById('btnSubmitDraft');
        btn.innerText = 'ОБРАБОТКА...';
        btn.disabled = true;
        btn.style.opacity = '0.7';

        try {
            // 🔥 ФИКС: Запрашиваем конфиг вместе с названием гонки
            const conf = await pb.collection('draft_configs').getOne(configId, { expand: 'race_id', requestKey: null });
            
            let totalCost = 0;
            const snapshot = {};
            this.draftCurrentSelection.forEach((r, i) => {
                totalCost += r.draftCost;
                snapshot[`r${i+1}`] = r.draftCost;
            });

            if (totalCost > conf.salary_cap) {
                throw new Error("Превышен лимит зарплат!");
            }

            const feeToPay = isEditing ? conf.transfer_fee : totalCost;

            // 1. Списываем Ватты через API (передаем тег [DRAFT] для красивого отображения в истории)
            const payRes = await pb.send('/api/draft/pay', {
                method: 'POST',
                body: { amount: feeToPay, purpose: `[DRAFT] ${isEditing ? 'Перезаявка' : 'Взнос'}: ${conf.expand?.race_id?.name || 'Гонка'}` }
            });

            if (!payRes.success) throw new Error("Не удалось списать Ватты");

            // 2. Формируем Payload
            const payload = {
                race_id: conf.race_id,
                owner_id: this.currentRider.id,
                rider_1: this.draftCurrentSelection[0].id,
                rider_2: this.draftCurrentSelection[1].id,
                rider_3: this.draftCurrentSelection[2].id,
                snapshot_prices: JSON.stringify(snapshot),
                total_cost: totalCost, // Добавили сумму для надежности
                is_paid: true
            };

            // 3. Сохраняем или обновляем
            if (isEditing) {
                const existing = await pb.collection('draft_rosters').getFirstListItem(`owner_id="${this.currentRider.id}" && race_id="${conf.race_id}"`);
                await pb.collection('draft_rosters').update(existing.id, payload, { requestKey: null });
            } else {
                await pb.collection('draft_rosters').create(payload, { requestKey: null });
            }

            alert("✅ Дримтим успешно заявлена! Удачи на гонке!");
            
            // Обновляем кошелек и возвращаемся в Лобби
            this.loadDraftWallet();
            this.loadDraftHistory();
            this.renderDraftLobby();

        } catch (err) {
            console.error(err);
            // Умная обработка ошибки нехватки средств
            const errMsg = err.data?.message || err.message || "";
            if (errMsg.includes("Недостаточно Ватт")) {
                if (confirm("❌ На балансе недостаточно ВАТТ.\n\nПополнить счет прямо сейчас?")) {
                    this.promptTopup();
                }
            } else {
                alert(errMsg || "Произошла ошибка при сохранении заявки");
            }
            btn.innerText = 'ОШИБКА';
        } finally {
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }

        switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            
            const targetTab = document.getElementById(`tab-${tabId}`);
            if (targetTab) targetTab.classList.add('active');
            
            const targetNav = document.getElementById(`nav-btn-${tabId}`);
            if (targetNav) targetNav.classList.add('active');
            
            if (tabId === 'profile') { 
                if (this.currentRider && this.currentRider.id) {
                    this.renderProfileTab(this.currentRider.id); 
                } else {
                    document.getElementById('profileTabContent').innerHTML = `
                    <div style="text-align:center; padding: 60px 20px; color:var(--danger); font-family:'Unbounded';">
                        <div style="font-size: 40px; margin-bottom: 10px;">⚠️</div>
                        ПРОФИЛЬ НЕ ЗАГРУЖЕН
                        <div style="margin-top: 15px; font-size: 12px; color: var(--text-muted); font-family: 'Manrope'; line-height: 1.5;">
                            Произошел сбой авторизации или сессия устарела. Пожалуйста, выйдите из аккаунта и войдите заново.
                        </div>
                        <button onclick="if(window.sotkaAuth){window.sotkaAuth.logout();}else{localStorage.clear();window.location.reload();}" style="margin-top: 30px; background: var(--danger); color: #fff; border: none; padding: 14px 24px; border-radius: 8px; font-family: 'Unbounded'; font-size: 12px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 15px rgba(255,51,102,0.3); width: 100%;">
                            🚪 ВЫЙТИ ИЗ АККАУНТА
                        </button>
                    </div>`; 
                }
            }
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
			if (tabId === 'draft') {
            this.loadDraftWallet();
			this.loadDraftHistory();
        }
        }

        getUserMaxRole() {
            const roles = this.usersMap[this.currentRider?.email] || []; let maxWeight = 0; let topRole = 'rider';
            for (let r of roles) { if (this.ROLE_WEIGHTS[r] > maxWeight) { maxWeight = this.ROLE_WEIGHTS[r]; topRole = r; } } return topRole;
        }

        getCaptainByTeam(teamId) {
            return Object.values(this.ridersMap).find(r => {
                const rTeams = Array.isArray(r.team_id) ? r.team_id : (r.team_id ? [r.team_id] : []);
                return rTeams.includes(teamId) && r.roles && Array.isArray(r.roles) && r.roles.includes('captain');
            }) || null;
        }

        // 🔥 НОВАЯ СИСТЕМА ВХОДА POCKETBASE (AUTH-FIRST + ПРОГРЕССИВНЫЙ ГОСТЬ)
        async checkInitialAuth() {
        // 1. Проверяем, есть ли у нас живой токен
        if (pb.authStore.isValid) {
            try {
                // Пытаемся загрузить профиль
                this.currentRider = await pb.collection('riders').getFirstListItem(`user_id="${pb.authStore.model.id}"`, { requestKey: null });
                this.isGuest = false; 
                return true; 
            } catch (e) {
                hideVilkaSplash();
                document.getElementById('sotka-auth-overlay').style.display = 'flex';
                if (window.sotkaAuth && typeof window.sotkaAuth.switchStep === 'function') {
                    window.sotkaAuth.switchStep('sa-step-role'); 
                }
                
                // 🔥 ФИКС ФАТАЛЬНОГО БАГА (БЕЛОГО ЭКРАНА):
                // Если запрос к БД упал (нет сети, удален профиль), мы ОБЯЗАНЫ 
                // присвоить гостевую заглушку, иначе весь остальной код приложения рухнет!
                this.isGuest = true;
                this.currentRider = {
                    id: 'anonymous_guest',
                    first_name: 'Гость',
                    last_name: '',
                    email: 'guest@local',
                    base_cluster: 'O',
                    team_id: [],
                    roles: []
                };
                return false;
            }
        }
        
        // 2. Если токена изначально нет — значит человек Гость
        this.isGuest = true;
        
        // Пытаемся вспомнить гостя из памяти
        const savedGuestId = localStorage.getItem('vilka_guest_id');
        if (savedGuestId) {
            try {
                this.currentRider = await pb.collection('riders').getOne(savedGuestId, { requestKey: null });
                return true; 
            } catch(e) {
                localStorage.removeItem('vilka_guest_id');
            }
        }
        
        // Если ничего не помогло, создаем базового гостя
        this.currentRider = {
            id: 'anonymous_guest',
            first_name: 'Гость',
            last_name: '',
            email: 'guest@local',
            base_cluster: 'O',
            team_id: [],
            roles: []
        };
        
        return true;
    }
		// 🔥 ВЫЗОВ ОКНА АВТОРИЗАЦИИ ДЛЯ ГОСТЯ
        openLoginScreen() {
            const overlay = document.getElementById('sotka-auth-overlay');
            if (overlay) {
                overlay.style.display = 'flex';
                if (window.sotkaAuth && typeof window.sotkaAuth.switchStep === 'function') {
                    window.sotkaAuth.switchStep('sa-step-login');
                }
            }
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
        const r = this.ridersMap[riderId];
        let dot = '';
        if (r && r.last_active) {
            const diff = Date.now() - new Date(r.last_active).getTime();
            if (diff < 5 * 60 * 1000) dot = `<div style="width:12px; height:12px; background:var(--success); border-radius:50%; border:2px solid var(--bg-surface); position:absolute; bottom:-2px; right:-2px; z-index:2;"></div>`;
        }

        const hasStories = r && r.stories && r.stories.length > 0;
        const isMe = r && this.currentRider && r.id === this.currentRider.id;

        // 🔥 МАГИЯ АВАТАРОВ
        let avatarContent = avatarLetter;
        if (r && r.avatar) {
            // 1. Защита от массива (если в базе Max Select > 1)
            const fileName = Array.isArray(r.avatar) ? r.avatar[0] : r.avatar;
            
            // 2. Надежный метод PocketBase (пока без thumb, чтобы исключить ошибку сервера)
            const avatarUrl = pb.files.getURL(r, fileName, { 'thumb': '100x100f' });
            
            // 3. Умный fallback: картинка плавно проявится, а если ошибка - станет прозрачной
            avatarContent = `
                <div style="width:100%; height:100%; position:relative;">
                    <div class="avatar-fallback" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;">${avatarLetter}</div>
                    <img src="${avatarUrl}" 
                         onload="this.style.opacity='1';"
                         style="width:100%; height:100%; object-fit:cover; border-radius:50%; position:absolute; top:0; left:0; z-index:2; opacity:0; transition: opacity 0.3s;" 
                         onerror="this.style.opacity='0'; console.error('❌ Не удалось загрузить аватар. Ссылка:', this.src);">
                </div>`;
        }

        if (hasStories) {
            // Если есть истории — градиентное кольцо
            return `<div style="position:relative; display:inline-flex; flex-shrink:0; align-items:center; justify-content:center; padding:2px; background:linear-gradient(45deg, var(--primary), #FF5722, #a855f7); border-radius:50%; cursor:pointer; touch-action:manipulation;" onclick="event.stopPropagation(); if(window.app.crm) window.app.crm.openStoryViewer('${riderId}')">
                <div class="avatar" style="${avatarStyle}; border: 2px solid var(--bg-body) !important; margin: 0 !important; box-sizing: border-box !important; overflow: hidden; padding: 0;">${avatarContent}</div>
                ${dot}
            </div>`;
        } else {
            // Обычная аватарка (кликабельная)
            const clickAction = isMe ? `event.stopPropagation(); if(window.app.crm) window.app.crm.openStoryCreatorMenu()` : `event.stopPropagation(); window.app.openProfile('${riderId}')`;
            const title = isMe ? 'Создать историю' : 'Открыть профиль';
            
            return `<div style="position:relative; display:inline-flex; flex-shrink:0; cursor:pointer; touch-action:manipulation;" onclick="${clickAction}">
                <div class="avatar clickable" style="${avatarStyle}; overflow: hidden; padding: 0;" title="${title}">${avatarContent}</div>
                ${dot}
            </div>`;
        }
    }

// 🔥 ЗАГРУЗКА АВАТАРКИ "НА ЛЕТУ"
    triggerAvatarUpload() {
        // Проверяем, нет ли уже инпута (создаем 1 раз)
        let fileInput = document.getElementById('globalAvatarUploadInput');
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'globalAvatarUploadInput';
            fileInput.accept = 'image/jpeg, image/png, image/webp';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);

            // Обработчик выбора файла
            fileInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (!file) return;

                // Защита от гигантских файлов (лимит 5 МБ)
                if (file.size > 5 * 1024 * 1024) {
                    alert("⚠️ Файл слишком большой! Максимум 5 МБ.");
                    event.target.value = '';
                    return;
                }

                try {
                    // Визуальный отклик (можно повесить лоадер, но для начала просто затеним аватар)
                    const myAvatars = document.querySelectorAll('.avatar');
                    myAvatars.forEach(av => av.style.opacity = '0.5');

                    // Формируем пакет данных для PocketBase
                    const formData = new FormData();
                    formData.append('avatar', file);

                    // Отправляем на сервер (this.currentRider.id — это ID текущего юзера)
                    const updatedRider = await pb.collection('riders').update(this.currentRider.id, formData);
                    
                    // Обновляем локальную память
                    this.currentRider = updatedRider;
                    this.ridersMap[updatedRider.id] = updatedRider;

                    // Перерисовываем интерфейс (список чатов и текущий открытый таб)
                    this.renderChatList();
                    if (this.currentTab === 'profile') this.renderProfileTab();
                    
                    alert("✅ Аватарка успешно обновлена!");
                } catch (e) {
                    console.error("Ошибка загрузки аватара:", e);
                    alert("❌ Ошибка при загрузке аватара.");
                } finally {
                    // Возвращаем прозрачность и сбрасываем инпут
                    const myAvatars = document.querySelectorAll('.avatar');
                    myAvatars.forEach(av => av.style.opacity = '1');
                    event.target.value = '';
                }
            });
        }
        
        // Эмулируем клик по невидимому инпуту
        fileInput.click();
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
                
                // 2. Грузим состав (🔥 ФИКС: используем оператор ~ для массивов)
                const roster = await pb.collection('riders').getFullList({ filter: `team_id ~ "${teamId}"`, sort: '-rating', requestKey: null });
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
                const appUrl = `${window.location.origin}/?join_team=${teamId}`;
                
                // 🔥 ФИКС ДИЗАЙНА: Вшиваем шрифты и темную тему прямо в дашборд
                container.innerHTML = `
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Unbounded:wght@700;800&family=Roboto+Mono:wght@700&display=swap');
                        
                        /* 🔥 Возвращаем жесткий PWA-замок на body, чтобы события мыши не ломались */
                        html, body { 
                            background-color: #18181b !important; 
                            margin: 0 !important; 
                            overflow: hidden !important; 
                            height: 100vh !important;
                            width: 100vw !important;
                        }
                        
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
                            font-family: 'Manrope', sans-serif;

                            /* 🔥 ИДЕАЛЬНЫЙ СКРОЛЛ ВНУТРИ КОНТЕЙНЕРА */
                            height: 100vh;
                            width: 100%;
                            overflow-y: auto;
                            overflow-x: hidden;
                            -webkit-overflow-scrolling: touch; /* Плавный скролл для iOS */
                        }

                        /* 🔥 КАСТОМНЫЙ СКРОЛЛБАР ДЛЯ НАШЕГО КОНТЕЙНЕРА */
                        .public-dash-wrapper::-webkit-scrollbar {
                            width: 8px; 
                        }
                        .public-dash-wrapper::-webkit-scrollbar-track {
                            background: #18181b; 
                        }
                        .public-dash-wrapper::-webkit-scrollbar-thumb {
                            background: #3f3f46; 
                            border-radius: 10px; 
                        }
                        .public-dash-wrapper::-webkit-scrollbar-thumb:hover {
                            background: #ffc107; 
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
			// ==========================================
            // 🔥 ФИКС: КОМПАКТНОЕ ПРЕВЬЮ РЕДАКТИРОВАНИЯ (КАК В TELEGRAM)
            // ==========================================
            if (!document.getElementById('fix-message-input-style')) {
                const style = document.createElement('style');
                style.id = 'fix-message-input-style';
                style.innerHTML = `
                    /* 1. Защита основного поля ввода */
                    #messageInput {
                        max-height: 250px !important; 
                        overflow-y: auto !important; 
                        overscroll-behavior: contain !important; 
                    }
                    /* 2. Общая высота плашки редактирования */
                    #replyEditBar {
                        max-height: 65px !important; 
                        overflow: hidden !important;
                    }
                    /* 3. Магия обрезки текста до 2 строк с многоточием */
                    #replyEditText {
                        display: -webkit-box !important;
                        -webkit-line-clamp: 2 !important; /* Строго 2 строчки */
                        -webkit-box-orient: vertical !important;
                        overflow: hidden !important;
                        white-space: normal !important;
                        font-size: 11px !important;
                        line-height: 1.3 !important;
                        color: var(--text-muted) !important;
                    }
                `;
                document.head.appendChild(style);
            }
            // ==========================================
            // 🔥 ПЕРЕХВАТЧИК СБРОСА ПАРОЛЯ
            // ==========================================
            const resetToken = urlParams.get('token');
            if (resetToken) {
                console.log("Пойман токен сброса пароля!");
                window.history.replaceState({}, document.title, window.location.pathname);
                
                const checkExist = setInterval(() => {
                    const overlay = document.getElementById('sotka-auth-overlay');
                    if (overlay) {
                        clearInterval(checkExist); 
                        if (typeof hideVilkaSplash === 'function') hideVilkaSplash();
                        overlay.style.display = 'flex';
                        document.getElementById('sa-reset-token').value = resetToken;
                        if (window.sotkaAuth && typeof window.sotkaAuth.switchStep === 'function') {
                            window.sotkaAuth.switchStep('sa-step-new-password');
                        }
                    }
                }, 100); 
                setTimeout(() => clearInterval(checkExist), 5000); 
                return; 
            }

            // ==========================================
            // 🔥 ПЕРЕХВАТЧИК ВОЗВРАТА ОТ GOOGLE / YANDEX (OAUTH)
            // ==========================================
            const oauthState = urlParams.get('state');
            const oauthCode = urlParams.get('code');
            
            if (oauthState && oauthCode) {
                console.log("Пойман возврат от OAuth провайдера!");
                try {
                    const codeVerifier = localStorage.getItem('pb_auth_verifier');
                    if (!codeVerifier) {
                        console.log("Нет verifier в памяти, возможно это не OAuth возврат");
                    } else {
                        if (typeof showVilkaSplash === 'function') showVilkaSplash();
                        const savedProvider = localStorage.getItem('pb_auth_provider') || 'google'; 
                        
                        const authData = await pb.collection('users').authWithOAuth2Code(
                            savedProvider,
                            oauthCode,
                            codeVerifier,
                            'https://vilka.sotka.one/' 
                        );

                        console.log("OAuth успешно завершен!", authData);
                        localStorage.removeItem('pb_auth_verifier'); 
                        localStorage.removeItem('pb_auth_provider'); 
                        
                        try {
                            const userId = authData.record.id;
                            const userEmail = authData.record.email || "";
                            
                            let filterQuery = `user_id="${userId}"`;
                            if (userEmail) {
                                filterQuery = `user_id="${userId}" || email="${userEmail}"`;
                            }

                            const rider = await pb.collection('riders').getFirstListItem(filterQuery, { requestKey: null });
                            
                            if (!rider.user_id || rider.user_id !== userId) {
                                console.log("Выполнена авто-привязка профиля к новому user_id!");
                                await pb.collection('riders').update(rider.id, { user_id: userId });
                            }

                            window.sotkaAuth.finishAndClose(rider);
                            return; 
                        } catch (e) {
                            alert("✅ Вход выполнен!\n\nПрофиль гонщика не найден. Заполните карточку.");
                            const overlay = document.getElementById('sotka-auth-overlay');
                            if (overlay) overlay.style.display = 'flex';
                            if (window.sotkaAuth && typeof window.sotkaAuth.switchStep === 'function') {
                                window.sotkaAuth.switchStep('sa-step-role');
                            }
                            if (typeof hideVilkaSplash === 'function') hideVilkaSplash();
                            return;
                        }
                    }
                } catch (err) {
                    console.error("Ошибка завершения OAuth:", err);
                    alert("Сбой при входе: Аккаунт с такой почтой уже существует. Пожалуйста, используйте тот способ входа (Яндекс/Google/Почта), через который вы регистрировались изначально.");
                    pb.authStore.clear(); 
                    if (typeof hideVilkaSplash === 'function') hideVilkaSplash();
                    document.getElementById('sotka-auth-overlay').style.display = 'flex';
                    if (window.sotkaAuth && typeof window.sotkaAuth.switchStep === 'function') {
                        window.sotkaAuth.switchStep('sa-step-login');
                    }
                    return;
                }
            }
            
            // 🔥 ПЕРЕХВАТЧИК ПУБЛИЧНОЙ ВИТРИНЫ
            const publicTeamId = urlParams.get('public_team');
            if (publicTeamId) {
                if (typeof hideVilkaSplash === 'function') hideVilkaSplash();
                document.body.innerHTML = '<div id="publicDashboardContainer" style="width:100%; background:var(--bg-body); color:var(--text-main); overflow-x:hidden;"></div>';
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

            // ==========================================
            // 🔥 ЗАПУСКАЕМ ПРОВЕРКУ АВТОРИЗАЦИИ
            // ==========================================
            await this.checkInitialAuth();
            
            // 🔥 УМНОЕ ПРИВЕТСТВИЕ: Данные из базы пришли, рисуем текст!
            const welcomeEl = document.getElementById('splashGreeting');
            if (welcomeEl) {
                if (!this.isGuest && this.currentRider && this.currentRider.first_name) {
                    const splashName = this.currentRider.first_name.split(' ')[0].toUpperCase();
                    welcomeEl.innerHTML = `ПРИВЕТ<br>${this.escapeHTML(splashName)}!`;
                } else {
                    welcomeEl.innerHTML = `ПРИВЕТ<br>ВЕЛОГОНЩИК`;
                }
                // Запускаем красивую анимацию появления текста
                welcomeEl.style.animation = 'splashFadeInUp 0.6s forwards ease-out';
            }
            
            // ⏳ ТЕАТРАЛЬНАЯ ПАУЗА: Ждем 1.5 секунды, чтобы текст точно успели прочитать
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Если гость — прячем окно авторизации, пускаем в интерфейс
            if (this.isGuest) {
                if (typeof hideVilkaSplash === 'function') hideVilkaSplash();
                const authOverlay = document.getElementById('sotka-auth-overlay');
                if (authOverlay) authOverlay.style.display = 'none';
            }

            try {
                // Если мы НЕ гость — запускаем онлайн-трекер и PUSH-уведомления
                if (!this.isGuest) {
                    this.updateOnlineStatus(); 
                    setInterval(() => this.updateOnlineStatus(), 120000);
                    this.setupOneSignalPush();
                }

                // ==========================================
                // 🔥 1. БЫСТРЫЙ СТАРТ ИЗ КЭША (PWA)
                // ==========================================
                try {
                    const cached = localStorage.getItem('vilka_core_data');
                    if (cached) {
                        const data = JSON.parse(cached);
                        this.usersMap = data.usersMap || {};
                        this.userIdMap = data.userIdMap || {};
                        this.ridersMap = data.ridersMap || {};
                        this.teamsMap = data.teamsMap || {};
                        this.pelotonsMap = data.pelotonsMap || {};
                        
                        // Если кэш есть - мгновенно убираем заставку и пускаем в приложение!
                        if (typeof hideVilkaSplash === 'function') hideVilkaSplash();
                        if (!this.isGuest) this.renderProfileHeader();
                    }
                } catch(e) { console.warn("Кэш пуст или поврежден"); }

                // ==========================================
                // 🔥 2. СКАЧИВАНИЕ СВЕЖИХ ДАННЫХ (БРОНЕБОЙНО ЧЕРЕЗ allSettled)
                // ОПТИМИЗАЦИЯ: Приложение больше не падает при обрывах связи!
                // ==========================================
                const results = await Promise.allSettled([ 
    pb.collection('users').getFullList({ fields: 'id,email,role', requestKey: null }), 
    // Запрашиваем только нужные поля (без историй, паролей и лишних данных)
    pb.collection('riders').getFullList({ fields: 'id,first_name,last_name,email,team_id,base_cluster,gender,yob,rating,avatar,roles', requestKey: null }), 
    pb.collection('teams').getFullList({ fields: 'id,name,peloton_id,points', sort: 'name', requestKey: null }), 
    pb.collection('pelotons').getFullList({ fields: 'id,name,is_private,admin_id,allowed_teams,allowed_riders', sort: 'name', requestKey: null }),
    pb.collection('races').getFullList({ sort: '-date', expand: 'rating_rule_id', requestKey: null })
]);
                
                // Безопасно достаем данные: если скачалось — берем массив, если сбой сети — отдаем пустой массив []
                const allUsers = results[0].status === 'fulfilled' ? results[0].value : [];
                const allRiders = results[1].status === 'fulfilled' ? results[1].value : [];
                const allTeams = results[2].status === 'fulfilled' ? results[2].value : [];
                const allPelotons = results[3].status === 'fulfilled' ? results[3].value : [];
                const allRaces = results[4].status === 'fulfilled' ? results[4].value : [];

                // Тихо логируем ошибки в консоль, чтобы потом можно было отследить сбои
                results.forEach((res, i) => {
                    if (res.status === 'rejected') {
                        const tableNames = ['users', 'riders', 'teams', 'pelotons', 'races'];
                        console.warn(`⚠️ Микро-сбой связи. Не удалось загрузить ${tableNames[i]}:`, res.reason);
                    }
                });
                
                // Сохраняем скачанные гонки в глобальный календарь, чтобы LiveBoard мог их найти
                if (window.app && window.app.crm) {
                    window.app.crm.dataCalendar = allRaces;
                } else if (this.crm) {
                    this.crm.dataCalendar = allRaces;
                } else {
                    this.dataCalendar = allRaces;
                }
                
                allUsers.forEach(u => { this.usersMap[u.email] = u.role || []; this.userIdMap[u.email] = u.id; }); 

                const myRoleForFilter = this.getUserMaxRole();
                // 🔥 ФИКС 1: Снижаем порог до 'judge' (судья), чтобы Ника скачивала всех гонщиков
                const isSuperadminOrAdmin = this.ROLE_WEIGHTS[myRoleForFilter] >= this.ROLE_WEIGHTS['judge'];

                // 🧱 ЭТАП 1: ФИЛЬТРУЕМ ПЕЛОТОНЫ
                this.pelotonsMap = {};
                let createOpts = `<option value="">Без привязки (Глобально)</option>`;

                const myId = this.currentRider?.id;
                const myUserId = pb.authStore.model?.id;
                const roles = this.usersMap[this.currentRider?.email] || [];
                // 🔥 ФИКС 2: Разрешаем судьям видеть приватные пелотоны
                const isSuper = this.ROLE_WEIGHTS[myRoleForFilter] >= this.ROLE_WEIGHTS['judge'];
if (this.currentRider && !this.isGuest) {
    try {
        const myAllRosters = await pb.collection('race_rosters').getFullList({
            filter: `rider_id="${this.currentRider.id}"`,
            requestKey: null
        });
        
        // Превращаем массив в удобный словарь: { raceId_1: { ...rosterData }, raceId_2: { ...rosterData } }
        this.myRosters = {};
        myAllRosters.forEach(roster => {
            this.myRosters[roster.race_id] = roster;
        });
    } catch(e) {
        console.warn("Не удалось загрузить заявки гонщика", e);
        this.myRosters = {};
    }
}				

                allPelotons.forEach(p => {
                    let canSee = true; 
                    
                    if (p.is_private) {
                        canSee = false; 
                        if (isSuper) {
                            canSee = true; 
                        } else if (p.admin_id) {
                            const adminIds = Array.isArray(p.admin_id) ? p.admin_id : [p.admin_id];
                            if (adminIds.includes(myId) || adminIds.includes(myUserId)) {
                                canSee = true;
                            }
                        }
                        if (!canSee && p.allowed_teams) {
                            let aTeams = Array.isArray(p.allowed_teams) ? p.allowed_teams : [p.allowed_teams];
                            if (this.currentRider?.team_id && aTeams.includes(this.currentRider.team_id)) canSee = true;
                        }
                        if (!canSee && p.allowed_riders) {
                            let aRiders = Array.isArray(p.allowed_riders) ? p.allowed_riders : [p.allowed_riders];
                            if (myId && aRiders.includes(myId)) canSee = true;
                        }
                    }
                    
                    if (canSee) {
                        this.pelotonsMap[p.id] = p;
                        createOpts += `<option value="${p.id}">${p.name}</option>`;
                    }
                }); 
                
                if(!this.isGuest) {
                    const pelotonSelect = document.getElementById('groupPelotonSelect');
                    if(pelotonSelect) pelotonSelect.innerHTML = createOpts;
                }
                
                // 🧱 ЭТАП 2: ФИЛЬТРУЕМ КОМАНДЫ 
                this.teamsMap = {};
                allTeams.forEach(t => { 
                    let pId = Array.isArray(t.peloton_id) ? t.peloton_id[0] : t.peloton_id;
                    if (!pId || this.pelotonsMap[pId] || isSuperadminOrAdmin) {
                        this.teamsMap[t.id] = t; 
                    }
                }); 

                // 🧱 ЭТАП 3: ФИЛЬТРУЕМ ГОНЩИКОВ 
                this.ridersMap = {};
                allRiders.forEach(r => { 
                    // 🔥 ФИКС БАГА: Если team_id - массив, корректно ищем хотя бы одну общую команду
                    const rTeams = Array.isArray(r.team_id) ? r.team_id : (r.team_id ? [r.team_id] : []);
                    const isMyRider = r.id === this.currentRider?.id || r.email === 'bot@sotka.one';
                    const hasAllowedTeam = rTeams.length === 0 || rTeams.some(id => this.teamsMap[id]);
                    
                    if (hasAllowedTeam || isMyRider || isSuperadminOrAdmin) {
                        this.ridersMap[r.id] = r; 
                        if (r.email && r.roles && Array.isArray(r.roles)) {
                            if (!this.usersMap[r.email]) this.usersMap[r.email] = [];
                            this.usersMap[r.email] = [...new Set([...this.usersMap[r.email], ...r.roles])];
                        }
                    }
                });

                // ==========================================
                // 🔥 3. СОХРАНЯЕМ СВЕЖИЙ КЭШ ДЛЯ СЛЕДУЮЩЕГО ЗАПУСКА
                // ==========================================
                try {
                    localStorage.setItem('vilka_core_data', JSON.stringify({
                        usersMap: this.usersMap, userIdMap: this.userIdMap, 
                        ridersMap: this.ridersMap, teamsMap: this.teamsMap, pelotonsMap: this.pelotonsMap
                    }));
                } catch(e) { console.warn("Не удалось сохранить кэш (превышен лимит памяти)"); }

                this.currentPelotonFilter = 'all';
        const lbl = document.getElementById('currentPelotonLabel');
        if (lbl) {
            lbl.innerHTML = `ВСЕ (ГЛОБАЛЬНО) <span style="font-size: 8px;">▼</span>`;
        }

                await this.loadChats();
                this.renderProfileHeader(); 
                
                if (typeof hideVilkaSplash === 'function') hideVilkaSplash();
                
                setTimeout(async () => {
                    const tChat = urlParams.get('chat');
                    const tUser = urlParams.get('user');
                    const tTeam = urlParams.get('team');
                    const tJoin = urlParams.get('join_team'); 
                    const tPeloton = urlParams.get('peloton'); 
                    const tCalendar = urlParams.get('calendar');
                    const tJoinSquadId = urlParams.get('join_squad');
                    const tSquadName = urlParams.get('sname');
                    const tSquadRaceId = urlParams.get('squad_race');
                    const tSquadDistId = urlParams.get('squad_dist');					

if (tJoinSquadId && tSquadName && tSquadRaceId) {
                        if (this.isGuest) {
                            if (confirm(`Вас пригласили в экипаж «${decodeURIComponent(tSquadName)}»!\nДля участия необходимо войти в аккаунт SOTKA.`)) {
                                this.openLoginScreen();
                            }
                        } else {
                            sessionStorage.setItem('pending_squad_id', tJoinSquadId);
                            sessionStorage.setItem('pending_squad_name', decodeURIComponent(tSquadName));
                            sessionStorage.setItem('pending_squad_race', tSquadRaceId);
                            if (tSquadDistId) sessionStorage.setItem('pending_squad_dist', tSquadDistId);
                            
                            alert(`👋 Вас пригласили в экипаж «${decodeURIComponent(tSquadName)}»!\nСейчас откроется карточка гонки. Нажмите "Заявиться", чтобы подтвердить участие.`);
                            
                            // Открываем чат нужной гонки
                            const rChat = this.chats.find(c => c.race_id === tSquadRaceId);
                            if (rChat) {
                                this.chatListFilter = 'races';
                                this.openChat(rChat.id);
                            } else {
                                this.openPelotonCalendar();
                            }
                        }
                        window.history.replaceState({}, document.title, window.location.pathname);
                        return;
                    }
                    // ==========================================
                    // 🔥 1. ОТКРЫТИЕ КАЛЕНДАРЯ ПО КОРОТКОЙ ССЫЛКЕ
                    // ==========================================
                    
					if (tCalendar) {
                        // Устанавливаем пелотон, если он есть
                        if (tCalendar !== 'all' && this.pelotonsMap[tCalendar]) {
                            this.currentPelotonFilter = tCalendar;
                            const lbl = document.getElementById('currentPelotonLabel');
                            if (lbl) lbl.innerText = this.pelotonsMap[tCalendar].name;
                            const sel = document.getElementById('groupPelotonSelect');
                            if (sel) sel.value = tCalendar;
                        }
                        
                        // 🔥 ФИКС БАГА: Принудительно включаем вкладку "Гонки" слева
                        this.chatListFilter = 'races';
                        if (typeof this.renderChatList === 'function') this.renderChatList();
                        
                        // Открываем сам календарь
                        this.openPelotonCalendar();
                    }
                    // ==========================================
                    // 🔥 2. ПРИМЕНЕНИЕ ФИЛЬТРА ПЕЛОТОНА (для остальных ссылок)
                    // ==========================================
                    else if (tPeloton && this.pelotonsMap[tPeloton]) {
                        this.currentPelotonFilter = tPeloton;
                        const lbl = document.getElementById('currentPelotonLabel');
                        if (lbl) lbl.innerText = this.pelotonsMap[tPeloton].name;
                        const sel = document.getElementById('groupPelotonSelect');
                        if (sel) sel.value = tPeloton;
                        if (typeof this.renderChatList === 'function') this.renderChatList();
                    }

                    if (isSupportRequest) {
                        this.switchTab('chats');
                        await this.startDirectChat(supportAdminId);
                    }
                    else if (tJoin) {
                        if (this.isGuest) {
                            if (confirm("Для вступления в команду необходимо войти в аккаунт SOTKA. Перейти ко входу?")) {
                                this.openLoginScreen();
                            }
                            return;
                        }
                        
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
                        else { 
                            const cExists = this.chats.find(x => x.id === tChat); 
                            if (cExists) this.openChat(tChat); 
                            else alert("Чат не найден или закрыт."); 
                        }
                    } else if (tUser) {
                        if (this.isGuest) {
                            if (confirm("Для отправки личных сообщений необходимо авторизоваться. Войти в аккаунт?")) {
                                this.openLoginScreen();
                            }
                        } else {
                            this.switchTab('chats'); 
                            await this.startDirectChat(tUser);
                        }
                    } else if (tTeam && !tCalendar) {
                        const tc = this.chats.find(c => {
                            const cTeams = Array.isArray(c.team_id) ? c.team_id : (c.team_id ? [c.team_id] : []);
                            return cTeams.includes(tTeam) && (c.type === 'team' || c.type === 'team_channel');
                        });
                        if (tc) this.openChat(tc.id); else alert("Чат команды не найден.");
                    } else if (window.innerWidth > 768 && !tCalendar) {
                        this.openUpcomingRaceChat();
                    }
                    
                    // Очищаем строку браузера, добавив туда tCalendar
                    if (tChat || tUser || tTeam || tJoin || isSupportRequest || tPeloton || tCalendar) {
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                }, 800);
                
                const msgInput = document.getElementById('messageInput');
                if (msgInput) { msgInput.addEventListener('input', function() { this.style.height = '46px'; this.style.height = Math.min(this.scrollHeight, 250) + 'px'; }); }
                
                const msgCont = document.getElementById('messagesContainer');
                if (msgCont) {
                    msgCont.addEventListener('scroll', async (e) => { if (e.target.scrollTop === 0 && this.hasMoreMessages && !this.isLoadingMessages) await this.loadMoreMessages(); const scrollBottomBtn = document.getElementById('scrollBottomBtn'); if (scrollBottomBtn) { if (e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight > 300) scrollBottomBtn.style.display = 'flex'; else scrollBottomBtn.style.display = 'none'; } });
                }

                setTimeout(() => this.runSystemMaintenance(), 3000);
                this.initNotifications();

                pb.collection('chats').subscribe('*', async (e) => { await this.loadChats(); if(e.record.id === this.activeChatId) this.renderPinnedMessage(); });
                pb.collection('messages').subscribe('*', async (e) => {
                    const msgChatId = Array.isArray(e.record.chat_id) ? e.record.chat_id[0] : e.record.chat_id;
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
                                    this.scrollToBottom(true); 
                                } catch(err) {} 
                            }
                            
                            if (document.hidden && !this.isGuest) {
                                this.triggerNotification(e.record, msgChatId);
                            } else if (actualSenderId !== this.currentRider?.id && !this.isGuest) {
                                this.playIncomingSound();
                            }
                        } else if (e.action === 'update' || e.action === 'delete') { 
                            if (this.softRefreshTimeout) clearTimeout(this.softRefreshTimeout);
                            this.softRefreshTimeout = setTimeout(() => {
                                this.softRefreshMessages();
                            }, 400);
                        }
                        
                    } else if (this.activeChatId === 'newsfeed') {
                        const chatObj = this.chats.find(c => c.id === msgChatId);
                        if (chatObj && chatObj.type === 'team_channel' && e.action === 'create') {
                            const container = document.getElementById('messagesContainer');
                            if (container) {
                                try {
                                    let rec = e.record;
                                    if (rec.reply_to || rec.forwarded_from) rec = await pb.collection('messages').getOne(rec.id, { expand: 'reply_to,forwarded_from', requestKey: null }); 
                                    this.appendMessageHTML(rec, container, false);
                                    this.scrollToBottom(true);
                                } catch(err) {}
                            }
                        }
                    } else if (e.action === 'create' && actualSenderId !== this.currentRider?.id && !this.isGuest) { 
                        const targetChat = this.chats.find(c => c.id === msgChatId);
                        if (targetChat) {
                            this.unreadCounts[msgChatId] = (this.unreadCounts[msgChatId] || 0) + 1; 
                            const searchInp = document.getElementById('chatSearch');
                            this.renderChatList(searchInp ? searchInp.value : ''); 
                            this.triggerNotification(e.record, msgChatId); 
                        }
                    }   
                });
                
                pb.collection('riders').subscribe('*', async (e) => {
                    if (e.action === 'update' || e.action === 'create') {
                        this.ridersMap[e.record.id] = e.record;
                        if (this.currentRider && this.currentRider.id === e.record.id && !this.isGuest) {
                            this.currentRider = e.record;
                            if (typeof this.renderProfileHeader === 'function') this.renderProfileHeader();
                        }
                        const searchInp = document.getElementById('chatSearch');
                        if (typeof this.renderChatList === 'function') this.renderChatList(searchInp ? searchInp.value : "");
                    }
                });
				
				// ==========================================
                // 🔥 ЖИВАЯ СИНХРОНИЗАЦИЯ ЗАЯВОК И ВРЕМЕНИ СТАРТА
                // ==========================================
                pb.collection('race_rosters').subscribe('*', async (e) => {
                    // Проверяем, что изменение касается именно текущего юзера
                    if (this.currentRider && !this.isGuest && e.record.rider_id === this.currentRider.id) {
                        if (!this.myRosters) this.myRosters = {};
                        
                        if (e.action === 'create' || e.action === 'update') {
                            // Обновляем или добавляем заявку в наш мгновенный кэш
                            this.myRosters[e.record.race_id] = e.record;
                        } else if (e.action === 'delete') {
                            // Удаляем заявку из кэша, если гонщик выписался
                            delete this.myRosters[e.record.race_id];
                        }
                        
                        // Заставляем интерфейс мгновенно перерисоваться
                        const searchInp = document.getElementById('chatSearch');
                        if (typeof this.renderChatList === 'function') {
                            this.renderChatList(searchInp ? searchInp.value : "");
                        }
                        
                        // И заодно обновляем зеленые кнопки "Заявка/Оплачено", если гонка открыта
                        if (typeof this.syncRaceButtonsState === 'function') {
                            this.syncRaceButtonsState();
                        }

                        // 🔥 МГНОВЕННОЕ ОБНОВЛЕНИЕ ШАПКИ ОТКРЫТОГО ЧАТА (FIXED FOR VARIANT 2)
                        if (this.activeChatId) {
                            const activeChat = this.chats.find(c => c.id === this.activeChatId);
                            if (activeChat && activeChat.race_id === e.record.race_id) {
                                // 1. Получаем свежие даты
                                const dateObj = new Date(activeChat.raceObj.date);
                                const d = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).toUpperCase();
                                const t = dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                                
                                let dateCardValue = `${d}, ${t}`;
                                let dateCardLabel = `ОБЩИЙ СТАРТ`;
                                let dateCardColor = 'var(--info)';

                                // 2. Если это наша заявка — готовим данные для плитки
                                if (this.currentRider && e.record.rider_id === this.currentRider.id) {
                                    let bibTag = e.record.bib ? `№${e.record.bib}` : '';
                                    if (e.record.planned_start) {
                                        dateCardValue = `${e.record.planned_start} ${bibTag ? `(${bibTag})` : ''}`;
                                        dateCardLabel = `МОЙ СТАРТ`;
                                        dateCardColor = 'var(--success)';
                                    } else if (e.record.bib) {
                                        dateCardValue = `${d}, ${t} (${bibTag})`;
                                    }
                                }

                                // 3. Находим плитку даты в DOM и обновляем её точечно
                                const metaEl = document.getElementById('activeChatMeta');
                                if (metaEl) {
                                    const dateTile = metaEl.querySelector('div[style*="border-left"]');
                                    if (dateTile) {
                                        dateTile.style.borderLeftColor = dateCardColor;
                                        dateTile.querySelector('div:first-child').innerText = dateCardValue;
                                        dateTile.querySelector('div:last-child').innerText = dateCardLabel;
                                    } else {
                                        // Если вдруг плитки ещё не отрисованы — просто перезапускаем openChat
                                        this.openChat(this.activeChatId);
                                    }
                                }
                                
                                // 4. Синхронизируем кнопки (чтобы "Заявиться" сменилась на "Оплатить")
                                this.syncRaceButtonsState();
                            }
                        }
                    }
                });
                
                let wakeUpTimeout = null;
                const handleAppWakeUp = () => {
                    if (document.visibilityState !== 'visible') return;
                    if (wakeUpTimeout) clearTimeout(wakeUpTimeout);
                    wakeUpTimeout = setTimeout(() => { 
                        try { 
                            if (!this.isGuest) this.updateOnlineStatus(); 
                            this.loadChats(); 
                            if (this.activeChatId === 'newsfeed') this.openNewsFeed(); 
                            else if (this.activeChatId) this.softRefreshMessages(); 
                        } catch(e) { } 
                    }, 1500); 
                };
                document.addEventListener('visibilitychange', handleAppWakeUp);
                window.addEventListener('pageshow', handleAppWakeUp); 
                
            } catch(e) { 
                // Выводим красивое сообщение об ошибке с кнопкой перезагрузки
                document.getElementById('chatList').innerHTML = `
                    <div style="padding:20px; text-align:center; color:var(--text-muted); font-size:12px; font-family:'Roboto Mono'; margin-top:50px;">
                        <div style="font-size:24px; margin-bottom:10px;">📡</div>
                        Упс, нет связи с сервером<br>или слабый сигнал.<br><br>
                        <span style="color:var(--danger); font-size:10px;">(${e.message})</span><br><br>
                        <button onclick="window.location.reload()" style="padding:10px 20px; background:var(--primary); color:#000; border:none; border-radius:50px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; box-shadow: 0 4px 10px rgba(255, 204, 0, 0.3);">ПЕРЕЗАГРУЗИТЬ</button>
                    </div>
                `; 
                
                // 🔥 ПРИНУДИТЕЛЬНО РИСУЕМ ШАПКУ (чтобы не висели пустые кнопки App и Юзера)
                try {
                    // Временно ставим флаг гостя, чтобы шапка отрисовала кнопку Входа и скрыла лишнее
                    this.isGuest = true; 
                    if (typeof this.renderProfileHeader === 'function') {
                        this.renderProfileHeader();
                    }
                } catch(err) {
                    console.warn("Не удалось отрисовать аварийную шапку", err);
                }
                
                if (typeof hideVilkaSplash === 'function') hideVilkaSplash(); 
            }
            this.initEmojiPicker();
        }
		
		renderPelotonsTab(filterText = "") {
            const container = document.getElementById('pelotonList'); 
            if (!container) return;

            let currentPName = "ВСЕ (ГЛОБАЛЬНО)";
            if (this.currentPelotonFilter !== 'all' && this.pelotonsMap[this.currentPelotonFilter]) {
                currentPName = this.pelotonsMap[this.currentPelotonFilter].name;
            }

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

            const currentView = this.crm?.currentView || 'calendar';
            const menuItems = [
                { id: 'calendar', icon: '📅', name: 'Календарь', desc: 'Гонки и тренировки' },
                { id: 'team', icon: '👥', name: 'Моя команда', desc: 'Управление составом' },
                { id: 'market', icon: '🔄', name: 'Трансферы', desc: 'Свободные агенты' },
                { id: 'rating', icon: '🏆', name: 'Рейтинг', desc: 'Командный зачет' }
            ];

            // 🔥 ДОБАВЛЯЕМ ВКЛАДКУ ПРАВИЛ ДЛЯ СУПЕРАДМИНА
            const myRoleWeight = Math.max(...(this.usersMap[this.currentRider?.email] || []).map(r => this.ROLE_WEIGHTS[r] || 20), 20);
            if (myRoleWeight >= this.ROLE_WEIGHTS['superadmin']) {
                menuItems.push({ id: 'rules', icon: '⚙️', name: 'Правила', desc: 'Матрицы рейтингов' });
            }

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

            const parent = container.parentElement;
            
            const oldSearch = parent.querySelector('.search-box');
            if (oldSearch) oldSearch.style.display = 'none';
            const oldTitle = parent.querySelector('div[style*="КЛУБЫ И ЛИГИ"]');
            if (oldTitle) oldTitle.style.display = 'none';

            parent.innerHTML = pelotonSelectorHtml + `<div class="chat-list" id="pelotonList">${menuHtml}</div>`;
            
            this.ensureWorkspaceExists();
        }

        filterPelotons(val) {
            this.renderPelotonsTab(val);
        }

        ensureWorkspaceExists() {
            let ws = document.getElementById('pelotonWorkspace');
            if (!ws) {
                ws = document.createElement('div');
                ws.id = 'pelotonWorkspace';
                
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
                const myRole = this.getUserMaxRole(); 
                const isAdmin = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['admin']; 
                let filterQuery = '';
                
                // 🔥 ФИКС 1: Вытаскиваем массив команд
                const myTeams = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);

                if (isAdmin) { 
                    filterQuery = `type="global" || type="team" || type="team_channel" || type="radar" || participants ~ "${this.currentRider.id}"`; 
                } else { 
                    // 🔥 ФИКС 2: Динамически формируем запрос для ВСЕХ команд гонщика
                    const teamFilter = myTeams.length > 0 ? myTeams.map(id => `team_id ~ "${id}"`).join(' || ') : '1=0';
                    filterQuery = `type="global" || type="team_channel" || type="radar" || (type="team" && (${teamFilter})) || participants ~ "${this.currentRider.id}"`; 
                }
                
                const rawChats = await pb.collection('chats').getFullList({ filter: filterQuery, sort: '-updated', expand: 'participants,team_id', requestKey: null });
                
                // 🔥 АБСОЛЮТНАЯ ЗАЩИТА: Фильтруем приватные пелотоны СРАЗУ, чтобы они не попали в память!
                const isSuper = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['superadmin'];
                
                this.chats = rawChats.filter(c => {
                    let cPId = c.peloton_id ? (Array.isArray(c.peloton_id) ? c.peloton_id[0] : c.peloton_id) : null;
                    
                    if (cPId) {
                        const pelotonObj = this.pelotonsMap[cPId];
                        
                        // Если пелотона нет (удален или скрыт)
                        if (!pelotonObj) {
                            if (c.type === 'direct' || c.type === 'private' || c.type === 'gruppetto' || (c.participants && c.participants.includes(this.currentRider?.id))) return true;
                            return false; 
                        }

                        if (pelotonObj.is_private) {
                            if (isSuper) return true; // Бог видит всё
                            
                            // Является ли юзер админом ИМЕННО ЭТОГО пелотона?
                            let pAdminId = pelotonObj.admin_id ? (Array.isArray(pelotonObj.admin_id) ? pelotonObj.admin_id[0] : pelotonObj.admin_id) : null;
                            if (pAdminId === this.userIdMap[this.currentRider?.email]) return true;

                            // Проверка допусков команд и конкретных гонщиков
                            if (pelotonObj.allowed_teams && Array.isArray(pelotonObj.allowed_teams) && myTeams.some(id => pelotonObj.allowed_teams.includes(id))) return true; 
                            if (pelotonObj.allowed_riders && Array.isArray(pelotonObj.allowed_riders) && pelotonObj.allowed_riders.includes(this.currentRider?.id)) return true;
                            
                            // Прямое участие в личных/приватных чатах
                            if (c.type === 'private' || c.type === 'direct' || c.type === 'team' || c.type === 'gruppetto' || (c.participants && c.participants.includes(this.currentRider?.id))) return true; 
                            
                            return false; // ⛔ ЧУЖАКАМ НЕЛЬЗЯ! Блокируем чат на корню.
                        }
                    }
                    return true;
                });
                
                // 🔥 БРОНЕБОЙНЫЙ ФИКС: Замок от гонки потоков (Race Condition)
if (this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['captain'] && !this.isCheckingChannels) {
    this.isCheckingChannels = true; // Вешаем замок, чтобы другие потоки сюда не лезли
    try {
        for (let tId of myTeams) {
            const myTeam = this.teamsMap[tId];
            if (myTeam) {
                // 1. Ищем канал строго в БД, а не в локальном кэше this.chats
                let channelExists = false;
                try {
                    // Используем ~ для безопасного поиска (поддерживает и строки, и массивы)
                    await pb.collection('chats').getFirstListItem(`type="team_channel" && team_id~"${myTeam.id}"`, { requestKey: null });
                    channelExists = true;
                } catch (e) {
                    channelExists = false; // 404 Not Found -> канала реально нет
                }

                // 2. Создаем только если база подтвердила отсутствие
                if (!channelExists) {
                    try {
                        const newChan = await pb.collection('chats').create({ 
                            type: 'team_channel', 
                            name: myTeam.name, 
                            team_id: myTeam.id, // Оставляем как есть (без скобок)
                            peloton_id: myTeam.peloton_id || "", 
                            participants: [this.currentRider.id] 
                        }, { requestKey: null });
                        this.chats.push(newChan); 
                    } catch (createErr) {
                        console.error("Ошибка автосоздания канала:", createErr);
                    }
                }
            }
        }
    } finally {
        this.isCheckingChannels = false; // Снимаем замок в любом случае
    }
}

                // ==========================================
                // 🔥 ЭТАП 1: УМНАЯ СВЯЗКА ЧАТОВ И ГОНОК
                // ==========================================
                try {
                    // 1. Вытаскиваем все ID гонок из наших чатов
                    const raceIds = this.chats.filter(c => c.race_id).map(c => c.race_id);
                    
                    if (raceIds.length > 0) {
                        // 2. Делаем фильтр вида: id="123" || id="456"
                        const filterStr = raceIds.map(id => `id="${id}"`).join(' || ');
                        
                        // 3. Скачиваем ТОЛЬКО нужные гонки из таблицы races
                        const racesList = await pb.collection('races').getFullList({ 
                            filter: filterStr,
                            requestKey: null 
                        });
                        
                        // 4. Проходимся по чатам и кладем внутрь данные гонки
                        this.chats.forEach(c => {
                            if (c.race_id) {
                                c.raceObj = racesList.find(r => r.id === c.race_id) || null;
                            }
                        });
                    }
                } catch (err) {
                    console.warn("Ошибка подгрузки гонок для чатов:", err);
                }
                // ==========================================

                await this.loadUnreadCounts(); 
                this.renderChatList(document.getElementById('chatSearch').value);
            } catch(e) { }
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

async renderRegisterActionAsync(raceId, containerId) {
    try {
        let race = this.cachedRaces[raceId];
        if (!race) {
            race = await pb.collection('races').getOne(raceId, { requestKey: null });
            this.cachedRaces[raceId] = race;
        }

        // Вытаскиваем красивые данные для кнопки (Название и километраж)
        const distName = race.name; 
        const distLen = race.distance ? `${race.distance} км` : '';
        const btnText = distLen ? `🏁 ${this.escapeHTML(distName)} (${distLen})` : `🏁 ${this.escapeHTML(distName)}`;

        // Генерируем HTML одной кнопки
        let html = `
            <button class="sync-btn-${raceId}" data-custom-name="${this.escapeHTML(btnText)}" 
                style="width:100%; background:var(--bg-surface); color:var(--text-main); border:1px solid var(--border); padding:12px; border-radius:8px; font-size:11px; font-family:'Unbounded'; font-weight:800; cursor:pointer; transition:0.2s;" 
                onclick="window.app.registerForRace('${raceId}', this, event)">
                ${btnText}
            </button>
        `;

        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
            this.syncRaceButtonsState(); 
        }
    } catch (e) {
        console.error("Не удалось загрузить гонку", e);
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = `<span style="color:var(--danger); font-size:10px;">Ошибка загрузки гонки</span>`;
    }
}

// 🔥 УМНОЕ ФОРМАТИРОВАНИЕ ДАТЫ И ВРЕМЕНИ ДЛЯ СООБЩЕНИЙ
    formatMessageDate(dateString) {
        const d = new Date(dateString);
        const now = new Date();
        const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        // Если это сегодня
        if (d.toDateString() === now.toDateString()) {
            return time;
        }

        // Если это вчера
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) {
            return `Вчера, ${time}`;
        }

        // Если это раньше (например: 12 мая)
        const options = { day: 'numeric', month: 'short' };
        // Если сообщение из прошлого года, добавляем год
        if (d.getFullYear() !== now.getFullYear()) {
            options.year = 'numeric';
        }
        
        // Убираем точку после короткого месяца (зависит от браузера)
        let dateStr = d.toLocaleDateString('ru-RU', options).replace(/\.$/, '');
        return `${dateStr}, ${time}`;
    }

appendMessageHTML(msg, container, prepend = false, isFeed = false) {
        const msgSenderId = Array.isArray(msg.sender_id) ? msg.sender_id[0] : msg.sender_id;
        const isMine = msgSenderId === this.currentRider.id;
        const sender = this.ridersMap[msgSenderId] || {first_name: 'Неизвестный', last_name: '', email: ''};
        const time = this.formatMessageDate(msg.created);
        const isEdited = msg.created !== msg.updated;
        const isBot = sender.email === 'bot@sotka.one';

        const targetChat = this.chats.find(c => c.id === this.activeChatId);
        
        // 🔥 ВОТ ОНО: Проверяем флаг анонса
        const isAnnounce = msg.is_announcement === true; 
        
        // 🔥 Анонс теперь приравнивается к посту в канал (чтобы первая строчка стала заголовком)
        const isChannelPost = isFeed || (msg.expand?.chat_id?.type === 'team_channel') || (targetChat?.type === 'team_channel') || isAnnounce;

        // --- 1. ОБРАБОТКА ФАЙЛОВ ---
        let fileBlock = ''; 
        let fileName = Array.isArray(msg.file) ? msg.file[0] : msg.file;
        if (fileName && typeof fileName === 'string' && fileName.trim() !== '') {
            const fileUrl = `${pb.baseUrl}/api/files/${msg.collectionId}/${msg.id}/${fileName}`;
            const isImage = fileName.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i);
            if (isImage) {
                if (isChannelPost) {
            fileBlock = `<div style="margin: 12px 0;"><img src="${fileUrl}" style="width: 100%; max-height: 350px; border-radius: 12px; object-fit: cover; border: 1px solid rgba(255,255,255,0.05); cursor: pointer;" onclick="window.app.openImageViewer('${fileUrl}', event)"></div>`;
        } else {
                    fileBlock = `<div style="margin-bottom:8px;"><img src="${fileUrl}" style="max-width:100%; max-height:250px; border-radius:8px; display:block; cursor:pointer;" onclick="window.app.openImageViewer('${fileUrl}', event)"></div>`;
                }
            } else { 
                fileBlock = `<div style="margin-bottom:8px; background:rgba(0,0,0,0.15); padding:10px 12px; border-radius:8px; display:flex; align-items:center; gap:10px; border:1px solid rgba(255,255,255,0.05);"><svg width="24" height="24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg><a href="${fileUrl}" target="_blank" onclick="event.stopPropagation()" style="color:inherit; font-size:12px; font-weight:600; text-decoration:none; word-break:break-all;">${fileName}</a></div>`; 
            }
        }

        // --- 2. ЛОГИКА БОТА ---
        if (isBot) {
            let rawText = msg.text || ''; 
            let botActionHtml = '';
            
            let panelData = null;
            try {
                let pDataStr = msg.expand?.chat_id?.panel_data || targetChat?.panel_data;
                if (pDataStr) panelData = typeof pDataStr === 'string' ? JSON.parse(pDataStr) : pDataStr;
            } catch(e) {}
            
            const regRegex = /\[ACTION:REGISTER:([a-zA-Z0-9_]+)\]/g;
            rawText = rawText.replace(regRegex, (match, rId) => {
                let btnLabel = "⚡️ ЗАЯВИТЬСЯ НА ГОНКУ";
                if (panelData && panelData.buttons) {
                    const pbBtn = panelData.buttons.find(b => b.url && b.url.includes(rId));
                    if (pbBtn) {
                        let shortLabel = pbBtn.label.includes('[') ? pbBtn.label.split('[')[1].split(']')[0].trim() : pbBtn.label;
                        btnLabel = `⚡️ ${this.escapeHTML(shortLabel.toUpperCase())}`;
                    }
                }
                
                botActionHtml += `<div style="margin-top: 8px;"><button class="btn-black bot-btn sync-btn-${rId}" data-label="${btnLabel}" style="width: 100%; background: var(--primary); color: #000; font-family: 'Unbounded'; font-size: 12px; padding: 14px; border-radius: 8px; cursor: pointer; border: none; font-weight: 800; box-shadow: 0 4px 15px rgba(255, 193, 7, 0.3);" onclick="window.app.registerForRace('${rId}', this, event)">${btnLabel}</button></div>`;
                return ''; 
            });
            
            const liveMatch = rawText.match(/\[ACTION:LIVE:([a-zA-Z0-9_]+)\]/);
            if (liveMatch) {
                const rId = liveMatch[1];
                rawText = rawText.replace(liveMatch[0], '');
                botActionHtml += `<div style="margin-top: 15px; border-top: 1px dashed var(--border); padding-top: 15px;">
                    <button onclick="window.app.openLiveBoard('${rId}', event)" style="background:var(--text-main); color:var(--bg-body); border:none; padding:12px 20px; border-radius:8px; font-family:'Unbounded'; font-weight:800; font-size:11px; cursor:pointer; width:100%; transition:0.2s; display:flex; align-items:center; justify-content:center; gap:10px;">
                        <div style="width:8px; height:8px; background:var(--bg-body); border-radius:50%; animation: dot-pulse 1s infinite;"></div> 
                        ХОД ГОНКИ (LIVE)
                    </button>
                </div>`;
            }

            const row = document.createElement('div'); 
            row.className = `message-row system-bot`; 
            row.id = `msg-${msg.id}`;
            row.innerHTML = `<div class="bot-bubble"><div class="bot-name">${this.getMotoSvg(18)} VILKA MOTO <span class="bot-badge">OFFICIAL</span></div><div class="bot-text">${this.linkify(this.escapeHTML(rawText.trim())).replace(/\n/g, '<br>')}</div>${fileBlock}<div style="display:flex; flex-direction:column; gap:4px; margin-top:15px; border-top: 1px dashed rgba(255, 255, 255, 0.1); padding-top: 15px;">${botActionHtml}</div><div class="bot-time">${time}</div></div>`;
            
            if (prepend) container.prepend(row); else container.appendChild(row);
            return; 
        }

        // --- 3. ОБЫЧНОЕ СООБЩЕНИЕ ИЛИ АНОНС ---
        let senderBlock = '';

        if (isFeed && msg.expand?.chat_id) {
            // 🔥 КЛИКАБЕЛЬНАЯ ПЛАШКА ДЛЯ ЛЕНТЫ НОВОСТЕЙ
            let cName = this.escapeHTML(msg.expand.chat_id.name);
            let cId = msg.expand.chat_id.id;
            
            senderBlock = `
            <div style="margin-bottom: 8px; display: flex; z-index: 2; position: relative;">
                <div onclick="event.stopPropagation(); window.app.openChat('${cId}')" 
                     style="display: inline-flex; align-items: center; gap: 6px; background: var(--bg-surface-hover); border: 1px solid var(--border); padding: 4px 10px; border-radius: 8px; cursor: pointer; transition: 0.2s; color: var(--text-muted);" 
                     onmouseover="this.style.borderColor='var(--primary)'; this.style.color='var(--primary)';" 
                     onmouseout="this.style.borderColor='var(--border)'; this.style.color='var(--text-muted)';">
                    <span style="font-family: 'Unbounded'; font-weight: 800; font-size: 11px; text-transform: uppercase;">
                        📢 ${cName}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; flex-shrink: 0;">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                </div>
            </div>`;
        } else if (!isMine) {
            // Обычный чат: просто имя отправителя
            senderBlock = `<div class="msg-sender-name clickable" onclick="event.stopPropagation(); window.app.openProfile('${msgSenderId}', event)">${sender.first_name} ${sender.last_name} ${this.getRoleBadge(msgSenderId)}</div>`;
        }
		
        let forwardHtml = msg.expand?.forwarded_from ? `<div style="font-size:10px; color:var(--info); margin-bottom:5px;">↪️ Переслано от: ${msg.expand.forwarded_from.first_name}</div>` : '';
        let replyBlock = msg.expand?.reply_to ? `<div class="reply-quote" onclick="event.stopPropagation(); document.getElementById('msg-${msg.expand.reply_to.id}').scrollIntoView({behavior: 'smooth', block: 'center'})"><div class="reply-quote-name">${this.ridersMap[msg.expand.reply_to.sender_id]?.first_name || '...'}</div><div class="reply-quote-text">${msg.expand.reply_to.text || 'Вложение'}</div></div>` : '';

        // --- 4. КНОПКИ ДЕЙСТВИЙ (ACTION TAGS) ---
        let displayMsgText = msg.text || '';
        let actionButtonsHtml = '';

        const tMatch = displayMsgText.match(/\[ACTION:TRANSFER:([a-zA-Z0-9_]+):([a-zA-Z0-9_]+):?([A-Z]*)\]/);
        if (tMatch) {
            const rId = tMatch[1]; 
            const teamId = tMatch[2]; 
            const transferType = tMatch[3] || 'ANY'; 

            displayMsgText = displayMsgText.replace(tMatch[0], '').trim();
            
            const rTeams = Array.isArray(this.ridersMap[rId]?.team_id) ? this.ridersMap[rId].team_id : (this.ridersMap[rId]?.team_id ? [this.ridersMap[rId].team_id] : []);
            const myTeams = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);

            if (rTeams.includes(teamId)) {
                actionButtonsHtml += `<div class="transfer-done" style="margin-top:10px; padding:8px; background:rgba(255,255,255,0.1); color:var(--success); border-radius:6px; font-size:10px; font-weight:800; border:1px dashed var(--success); text-align:center; font-family:'Unbounded';">✅ ТРАНСФЕР ВЫПОЛНЕН</div>`;
            } else {
                const myRoleW = Math.max(...(this.usersMap[this.currentRider.email] || []).map(r => this.ROLE_WEIGHTS[r] || 20), 20);
                const isSuper = myRoleW >= this.ROLE_WEIGHTS['superadmin'];
                const isAdmin = myRoleW >= this.ROLE_WEIGHTS['admin'];
                const amIThisRider = this.currentRider.id === rId;
                const amINewCaptain = myRoleW >= this.ROLE_WEIGHTS['captain'] && myTeams.includes(teamId);
                const amIOldCaptain = myRoleW >= this.ROLE_WEIGHTS['captain'] && myTeams.some(id => rTeams.includes(id));
                
                let showButton = false;
                if (isSuper || isAdmin) showButton = true;
                else if (transferType === 'INVITE' && amIThisRider) showButton = true; 
                else if (transferType === 'REQUEST' && amINewCaptain) showButton = true; 
                else if (transferType === 'RELEASE' && amIOldCaptain) showButton = true; 
                else if (transferType === 'ANY') showButton = true;

                if (showButton) {
                    actionButtonsHtml += `<div style="margin-top:10px;"><button onclick="window.app.approveTransfer('${rId}', '${teamId}', '${msg.id}', this, event)" style="width:100%; background:var(--warning); color:#000; border:none; padding:10px; border-radius:6px; font-size:11px; font-family:'Unbounded'; font-weight:800; cursor:pointer;">🔄 ОДОБРИТЬ ТРАНСФЕР</button></div>`;
                } else {
                    actionButtonsHtml += `<div style="margin-top:10px; padding:8px; background:rgba(255,255,255,0.05); color:var(--text-muted); border-radius:6px; font-size:10px; font-weight:800; border:1px dashed var(--border); text-align:center; font-family:'Unbounded';">ОЖИДАНИЕ РЕШЕНИЯ</div>`;
                }
            }
        }

        let raceContainersToLoad = []; 
        const regRegex = /\[ACTION:REGISTER:([a-zA-Z0-9_]+)(?::([^\]]+))?\]/g;
        displayMsgText = displayMsgText.replace(regRegex, (match, rId, wave) => {
            const containerId = `reg-container-${msg.id}-${rId}`;
            raceContainersToLoad.push({ rId, containerId });
            actionButtonsHtml += `<div id="${containerId}" style="margin-top:10px;"><span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;border-color:var(--primary) transparent transparent transparent;"></span> Загрузка дистанций...</div>`;
            return '';
        });

        const liveMatch2 = displayMsgText.match(/\[ACTION:LIVE:([a-zA-Z0-9_]+)\]/);
        if (liveMatch2) {
            actionButtonsHtml += `<div style="margin-top:10px;"><button style="width:100%; background:var(--text-main); color:var(--bg-body); border:none; padding:10px; border-radius:6px; font-size:11px; font-family:'Unbounded'; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;" onclick="window.app.openLiveBoard('${liveMatch2[1]}', event)"><div style="width:6px; height:6px; background:var(--bg-body); border-radius:50%; animation: dot-pulse 1s infinite;"></div> ХОД ГОНКИ (LIVE)</button></div>`;
            displayMsgText = displayMsgText.replace(liveMatch2[0], '');
        }

        const payRegex = /\[ACTION:PAY:([^\]]+):([^\]]+)\]/g;
        displayMsgText = displayMsgText.replace(payRegex, (match, url, label) => {
            actionButtonsHtml += `<div style="margin-top:10px;"><a href="${url}" target="_blank" style="display:block; width:100%; background:var(--success); color:#fff; padding:10px; border-radius:6px; font-size:11px; font-family:'Unbounded'; font-weight:800; text-align:center; text-decoration:none;">💳 ${label}</a></div>`;
            return '';
        });

        // --- 5. СБОРКА ТЕКСТА И ФОРМАТИРОВАНИЕ ---
        let textHtml = '';
        if (isChannelPost && displayMsgText) {
            let lines = displayMsgText.split('\n');
            let titleColor = isAnnounce ? 'var(--danger)' : 'var(--text-main)';
            let titleIcon = isAnnounce ? '📢 ' : '';
            textHtml = `<div style="font-family:'Unbounded'; font-size:15px; font-weight:800; color:${titleColor}; margin-bottom:8px; line-height:1.3; text-transform:uppercase;">${titleIcon}${this.linkify(this.escapeHTML(lines[0]))}</div>`;
            if (lines.length > 1) textHtml += `<div style="font-size:13px; color:var(--text-main); white-space:pre-wrap; line-height:1.6;">${this.linkify(this.escapeHTML(lines.slice(1).join('\n')))}</div>`;
        } else {
            textHtml = `<div style="white-space:pre-wrap;">${this.linkify(this.escapeHTML(displayMsgText))}</div>`;
        }

        // --- 6. РЕАКЦИИ И ТИКИ ---
        let reactionsHtml = '';
        if (msg.reactions && typeof msg.reactions === 'object') {
            let tags = '';
            for (let [key, users] of Object.entries(msg.reactions)) {
                if (!users?.length) continue;
                tags += `<span class="reaction-tag ${users.includes(this.currentRider.id) ? 'voted' : ''}" onclick="event.stopPropagation(); window.app.submitContextReactionMock('${msg.id}', '${key}')">${this.getReactSvg(key, 18)} <span class="react-count">${users.length}</span></span>`;
            }
            if (tags) reactionsHtml = `<div class="reactions-box">${tags}</div>`;
        }
        
        let ticks = '';
        if (isMine) {
            let readArray = msg.read_by || [];
            if (typeof readArray === 'string') { try { readArray = JSON.parse(readArray); } catch(e) { readArray = []; } }
            const othersWhoRead = readArray.filter(id => id !== this.currentRider.id);
            ticks = othersWhoRead.length > 0 ? `<span style="color:#3b82f6; font-weight:bold; letter-spacing:-2px; margin-left:4px;">✓✓</span>` : `<span style="color:var(--text-muted); margin-left:4px;">✓</span>`;
        }

        // --- 7. ВЫВОД (РАЗДЕЛЯЕМ ЛЕНТУ И ЧАТ) ---
        const row = document.createElement('div');
        row.id = `msg-${msg.id}`;

        // 🔥 ПРОВЕРЯЕМ ПРАВА: Может ли юзер открыть меню для этого поста?
        let canManagePost = isMine;
        if (!canManagePost) {
            const myRoleW = Math.max(...(this.usersMap[this.currentRider?.email] || []).map(r => this.ROLE_WEIGHTS[r] || 20), 20);
            if (myRoleW >= this.ROLE_WEIGHTS['superadmin']) {
                canManagePost = true;
            } else if (isChannelPost) {
                const myTeams = Array.isArray(this.currentRider?.team_id) ? this.currentRider.team_id : (this.currentRider?.team_id ? [this.currentRider.team_id] : []);
                let postChat = isFeed ? msg.expand?.chat_id : targetChat;
                if (postChat && postChat.team_id) {
                    const chatTeams = Array.isArray(postChat.team_id) ? postChat.team_id : [postChat.team_id];
                    if (myRoleW >= this.ROLE_WEIGHTS['captain'] && myTeams.some(tId => chatTeams.includes(tId))) {
                        canManagePost = true;
                    }
                }
            }
        }

        if (isChannelPost) {
            // 🔥 ДИЗАЙН КАРТОЧКИ (ДЛЯ ЛЕНТЫ НОВОСТЕЙ И КАНАЛОВ)
            row.className = `message-row`;
            row.style.cssText = "width: 100%; max-width: 600px; margin: 0 auto 20px auto; padding: 0;";
            
            if (canManagePost) {
                row.style.cursor = 'pointer';
                row.onclick = () => this.openMessageMenu(msg.id);
            }

            // 🔥 СОЗДАЕМ КРУГЛУЮ КНОПКУ ПОДЕЛИТЬСЯ ДЛЯ ПОСТА (С ИКОНКОЙ)
            const postShareBtn = `
                <button onclick="event.stopPropagation(); window.app.sharePostDirectly('${msg.id}')" class="btn-circle-share" style="width: 28px; height: 28px; min-width: 28px; min-height: 28px; margin: 0; background: transparent; border: 1px solid var(--border); color: var(--text-muted); transition: 0.2s;" title="Поделиться" onmouseover="this.style.color='var(--info)'; this.style.borderColor='var(--info)'; this.style.background='rgba(59,130,246,0.1)';" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border)'; this.style.background='transparent';">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </button>
            `;
            
            row.innerHTML = `
            <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 16px; padding: 16px 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
                ${senderBlock}
                <div style="margin-top: 12px; display:flow-root;">
                    ${fileBlock}
                    ${textHtml}
                </div>
                ${actionButtonsHtml}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-size: 11px; color: var(--text-muted); font-family: 'Roboto Mono';">${time} ${isEdited ? '(изм.)' : ''}</div>
                    
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${reactionsHtml ? `<div style="margin-top: -5px;">${reactionsHtml}</div>` : ''}
                        <div style="margin-top: -5px;">${postShareBtn}</div>
                    </div>
                </div>
            </div>`;
        } else {
            // 💬 СТАРЫЙ ДИЗАЙН БАББЛОВ (ДЛЯ ЛИЧКИ И ГРУПП)
            row.className = `message-row ${isMine ? 'mine' : 'theirs'}`;
            row.onclick = () => this.openMessageMenu(msg.id);
            let bubbleStyle = isAnnounce ? 'border: 1px solid var(--danger); box-shadow: 0 4px 15px rgba(255, 51, 102, 0.15);' : '';
            row.innerHTML = `${senderBlock}<div class="message-bubble" style="${bubbleStyle}">${forwardHtml}${replyBlock}<div style="display:flow-root;">${fileBlock}${textHtml}</div>${actionButtonsHtml}<div class="msg-meta-row">${isEdited?'<span class="msg-edited">изм.</span>':''}<span>${time}</span>${ticks}</div></div>${reactionsHtml}`;
        }

        if (prepend) container.prepend(row); else container.appendChild(row);

        // --- 8. ЗАГРУЗКА РЕГИСТРАЦИОННЫХ БЛОКОВ ---
        if (raceContainersToLoad.length > 0) {
            setTimeout(() => { raceContainersToLoad.forEach(item => this.renderRegisterActionAsync(item.rId, item.containerId)); }, 50);
        }
    }

// 🔥 НОВЫЙ ПЕРСОНАЛИЗИРОВАННЫЙ ЗАГОЛОВОК И ФИКСЫ (С ПОДДЕРЖКОЙ ГОСТЕВОГО РЕЖИМА)
        renderProfileHeader() {
            const headerEl = document.querySelector('.sidebar-header');
            if (!headerEl || !this.currentRider) return;

            // ==========================================
            // 🔥 БРОНЕБОЙНЫЙ ФИКС АВТОЗАПОЛНЕНИЯ (РАБОТАЕТ И ДЛЯ ГОСТЕЙ)
            // ==========================================
            setTimeout(() => {
                const searchInp = document.getElementById('chatSearch');
                if (searchInp) {
                    searchInp.setAttribute('readonly', 'readonly'); // Блокируем для браузера
                    searchInp.value = ''; 
                    searchInp.setAttribute('autocomplete', 'new-password'); 
                    searchInp.setAttribute('data-lpignore', 'true'); 
                    // Снимаем блокировку через полсекунды, когда браузер "успокоится"
                    setTimeout(() => searchInp.removeAttribute('readonly'), 500);
                }
            }, 300);

            // ==========================================
            // 🔥 ВЕТКА 1: ЕСЛИ ЭТО ГОСТЬ (НЕ АВТОРИЗОВАН)
            // ==========================================
            if (this.isGuest) {
                headerEl.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0 5px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 38px; height: 38px; border-radius: 50%; background: var(--bg-surface-hover); border: 1px dashed var(--border); display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:18px;">👤</div>
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-family: 'Unbounded'; font-size: 13px; font-weight: 800; color: var(--text-main);">ГОСТЬ</span>
                                <span style="font-size: 10px; color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Только чтение</span>
                            </div>
                        </div>
                        <button onclick="window.app.openLoginScreen();" style="background: var(--primary); color: #000; border: none; border-radius: 8px; padding: 10px 16px; font-family: 'Unbounded'; font-size: 11px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 10px rgba(255,193,7,0.3); transition: 0.2s;">
                            ВОЙТИ В АККАУНТ
                        </button>
                    </div>
                `;
                
                // Скрываем нижнюю вкладку профиля для гостя
                const profileTabBtn = document.querySelector('.sidebar-footer a[onclick*="profile"]');
                if (profileTabBtn) profileTabBtn.style.display = 'none';
                
                return; // Прерываем выполнение, дальше гостю не нужно
            }

            // ==========================================
            // 🔥 ВЕТКА 2: ПОЛНОЦЕННЫЙ ГОНЩИК
            // ==========================================
            const f = this.currentRider.first_name ? this.currentRider.first_name.charAt(0).toUpperCase() : '';
            const l = this.currentRider.last_name ? this.currentRider.last_name.charAt(0).toUpperCase() : '';
            const initials = f + l;

            let teamName = 'Свободный агент';
            const myTeams = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);
            
            if (myTeams.length > 0) {
                if (this.currentPelotonFilter && this.currentPelotonFilter !== 'all') {
                    const activeTeamId = myTeams.find(id => this.teamsMap[id] && this.teamsMap[id].peloton_id === this.currentPelotonFilter);
                    if (activeTeamId) teamName = this.teamsMap[activeTeamId].name;
                    else teamName = myTeams.length === 1 ? (this.teamsMap[myTeams[0]]?.name || 'Команда') : `Клубов: ${myTeams.length}`;
                } else {
                    teamName = myTeams.length === 1 ? (this.teamsMap[myTeams[0]]?.name || 'Команда') : `Клубов: ${myTeams.length}`;
                }
            }

            const hasStories = this.currentRider.stories && this.currentRider.stories.length > 0;
            
            // 🔥 УМНАЯ АВАТАРКА С ПОДТЯГИВАНИЕМ ИЗ БАЗЫ
            let myAvatarHtml = this.renderAvatar(this.currentRider.id, 'width: 38px; height: 38px; font-size: 14px; background: var(--primary); color: #000;', initials);

            headerEl.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0 5px;">
                    <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="window.app.switchTab('profile')">
                        ${myAvatarHtml}
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-family: 'Unbounded'; font-size: 13px; font-weight: 800; color: var(--text-main); line-height: 1.2;">
                                ${this.escapeHTML(this.currentRider.first_name)} ${this.escapeHTML(this.currentRider.last_name)}
                            </span>
                            <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">
                                ${this.escapeHTML(teamName)}
                            </span>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button onclick="window.app.toggleTheme()" style="background: var(--bg-body); border: 1px solid var(--border); border-radius: 8px; width: 32px; height: 32px; display:flex; align-items:center; justify-content:center; color: var(--text-muted); cursor: pointer; transition: 0.2s;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                        </button>
                        
                        <button onclick="window.sotkaAuth.logout()" style="background: rgba(255, 51, 102, 0.1); border: 1px solid rgba(255, 51, 102, 0.2); border-radius: 8px; width: 32px; height: 32px; display:flex; align-items:center; justify-content:center; color: #ff3366; cursor: pointer; transition: 0.2s;" title="Выйти из аккаунта">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        </button>
                    </div>
                </div>
            `;

            const profileTabBtn = document.querySelector('.sidebar-footer a[onclick*="profile"]');
            if (profileTabBtn) profileTabBtn.style.display = 'none';

            setTimeout(() => {
                const searchInp = document.getElementById('chatSearch');
                if (searchInp) {
                    searchInp.value = ''; 
                    searchInp.setAttribute('autocomplete', 'new-password'); 
                    searchInp.setAttribute('data-lpignore', 'true'); 
                }
            }, 300); 
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

            if (!this.chatListFilter || this.chatListFilter === 'all') this.chatListFilter = 'races';

            let filteredChats = [...this.chats];
            const myRole = this.getUserMaxRole(); const isManager = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['admin'];
            
            

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

            const formatBadge = (num) => num > 0 ? `<span style="background:var(--danger); color:var(--bg-body); border-radius:10px; padding:2px 6px; margin-left:6px; font-size:9px; font-family:'Manrope';">${num}</span>` : '';

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
                    { id: 'clubs', name: 'НОВОСТИ' + formatBadge(unreadClubs) },
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
                
                if (isManager) {
                    pillsHtml += `<button style="background:transparent; color:var(--text-muted); border:none; padding:6px; margin-left:auto; cursor:pointer; display:flex; align-items:center;" onclick="window.app.toggleSelectionMode()" title="Изменить чаты">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>`;
                }
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

            // ==========================================
            // 🔥 РЕНДЕР ЛЕНТЫ НОВОСТЕЙ ВО ВКЛАДКЕ "НОВОСТИ" (бывшие КОМАНДЫ)
            // ==========================================
            if (!filterText && this.chatListFilter === 'clubs' && !this.isSelectionMode) {
                
                // Выводим ЛЕНТУ НОВОСТЕЙ на самом верху раздела
                const feedActive = this.activeChatId === 'newsfeed' ? 'active' : '';
                const feedEl = document.createElement('div'); feedEl.className = `chat-item ${feedActive}`; feedEl.id = `chat-item-newsfeed`; 
                feedEl.onclick = () => window.app.openNewsFeed();
                const feedSub = this.currentPelotonFilter === 'all' ? "Публикации всех клубов" : "Новости этого пелотона";
                feedEl.innerHTML = `
                    <div class="avatar" style="background:var(--primary); color:#000;">📰</div>
                    <div class="chat-info">
                        <div class="chat-name" style="color:var(--primary);">ЛЕНТА НОВОСТЕЙ</div>
                        <div class="chat-preview" style="color:var(--text-muted)">${feedSub}</div>
                    </div>
                    <button onclick="event.stopPropagation(); window.app.copyChatLink('newsfeed')" class="btn-circle-share" title="Поделиться">🔗</button>
                `; 
                container.appendChild(feedEl);
                
                // 🔥 Добавляем аккуратный пунктирный разделитель между Общей лентой и Каналами клубов
                const separator = document.createElement('div');
                separator.style.cssText = "margin: 8px 15px 12px; border-bottom: 1px dashed var(--border);";
                container.appendChild(separator);
            }

            // ==========================================
            // 🔥 РЕНДЕР СЛУЖБЫ ПОДДЕРЖКИ ВО ВКЛАДКЕ "ГОНКИ"
            // ==========================================
            // 🔥 ДОБАВЛЕНИЕ ПЛАШКИ ПОДДЕРЖКИ ПЕЛОТОНА
            if (!filterText && this.chatListFilter === 'races' && !this.isSelectionMode) {
                let supportTargetId = "blf8xys1c833b3p";
                let supportTitle = "СЛУЖБА ПОДДЕРЖКИ";
                let supportDesc = "Связь с администрацией VILKA";

                if (this.currentPelotonFilter && this.currentPelotonFilter !== 'all' && this.pelotonsMap[this.currentPelotonFilter]) {
                    const peloton = this.pelotonsMap[this.currentPelotonFilter];
                    const pAdminId = Array.isArray(peloton.admin_id) ? peloton.admin_id[0] : peloton.admin_id;
                    if (pAdminId) {
                        const adminRider = Object.values(this.ridersMap).find(r => r.user_id === pAdminId || r.id === pAdminId);
                        if (adminRider) {
                            supportTargetId = adminRider.id;
                            supportTitle = `АДМИН: ${peloton.name.toUpperCase()}`;
                            supportDesc = "Организационные вопросы";
                        }
                    }
                }

                // Стандартное поведение активной вкладки
                const supportActive = this.activeChatId === supportTargetId ? 'active' : '';
                const supportEl = document.createElement('div');
                supportEl.className = `chat-item ${supportActive}`;
                supportEl.id = `chat-item-${supportTargetId}`;
                
                if (this.currentRider?.id === supportTargetId) {
                    supportEl.onclick = () => alert("Это ваша линия поддержки! Гонщики, нажав сюда, откроют чат с вами.");
                    supportTitle += " (ЭТО ВЫ)";
                } else {
                    supportEl.onclick = () => window.app.startDirectChat(supportTargetId);
                }

                // Единая верстка аватара и текста (как у Ленты новостей)
                supportEl.innerHTML = `
                    <div class="avatar" style="background:var(--primary); color:#000;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                    </div>
                    <div class="chat-info">
                        <div class="chat-name" style="color:var(--primary);">${this.escapeHTML(supportTitle)}</div>
                        <div class="chat-preview" style="color:var(--text-muted)">${this.escapeHTML(supportDesc)}</div>
                    </div>
                `;
                container.appendChild(supportEl);

                // 🔥 Аккуратный пунктирный разделитель после системных кнопок
                const separator = document.createElement('div');
                separator.style.cssText = "margin: 8px 15px 12px; border-bottom: 1px dashed var(--border);";
                container.appendChild(separator);
            }
			// 🔥 ЗАРАНЕЕ СОЗДАЕМ КОНТЕЙНЕР АРХИВА (СРАЗУ ПОД ПОДДЕРЖКОЙ)
            if (!filterText && this.chatListFilter === 'races' && !this.isSelectionMode) {
                if (typeof this.isArchiveExpanded === 'undefined') this.isArchiveExpanded = false;

                const archiveWrapper = document.createElement('div');
                archiveWrapper.id = 'archiveRacesWrapper';
                archiveWrapper.style.display = 'none'; // Скрыт, пока не найдем хоть одну старую гонку
                
                const archBtn = document.createElement('div');
                archBtn.onclick = () => { 
                    this.isArchiveExpanded = !this.isArchiveExpanded; 
                    this.renderChatList(); 
                };
                archBtn.style.cssText = "padding:12px 20px; font-family:'Unbounded'; font-size:10px; font-weight:800; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; justify-content:space-between; border-bottom:1px dashed var(--border); margin-bottom:10px; background:var(--bg-surface-hover); transition:0.2s;";
                archBtn.onmouseover = () => archBtn.style.color = 'var(--text-main)';
                archBtn.onmouseout = () => archBtn.style.color = 'var(--text-muted)';
                archBtn.innerHTML = `
                    <span style="display:flex; align-items:center; gap:8px;">📦 АРХИВ ПРОШЕДШИХ ГОНОК</span>
                    <span style="transform: rotate(${this.isArchiveExpanded ? '180deg' : '0deg'}); transition:0.3s;">▼</span>
                `;
                archiveWrapper.appendChild(archBtn);
                
                const archiveContainer = document.createElement('div');
                archiveContainer.id = 'archiveRacesContainer';
                archiveContainer.style.display = this.isArchiveExpanded ? 'block' : 'none';
                archiveWrapper.appendChild(archiveContainer);

                container.appendChild(archiveWrapper);
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

            // 🔥 СТАЛО: Умная сортировка (Непрочитанные -> Истории -> Время/Даты) с учетом 7 дней
            const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
            const now = Date.now();

            unpinnedChats.sort((a, b) => {
                // 1. Высший приоритет: Непрочитанные сообщения
                const unreadA = (this.unreadCounts[a.id] || 0) > 0 ? 1 : 0;
                const unreadB = (this.unreadCounts[b.id] || 0) > 0 ? 1 : 0;
                if (unreadA !== unreadB) return unreadB - unreadA;

                // 2. Средний приоритет: Наличие активных историй
                const hasStoryBoost = (chat) => {
                    if (chat.type === 'direct' && chat.expand?.participants) {
                        const otherRider = chat.expand.participants.find(p => p.id !== this.currentRider.id);
                        if (otherRider && this.ridersMap[otherRider.id]?.stories?.length > 0) return 1; 
                    }
                    return 0; 
                };
                const boostA = hasStoryBoost(a);
                const boostB = hasStoryBoost(b);
                if (boostA !== boostB) return boostB - boostA;

                // 3. Логика для гонок: Предстоящие и недавние -> Архив
                if (this.chatListFilter === 'races' && a.type === 'global' && b.type === 'global') {
                    const dateA = new Date(a.raceObj?.date || 0).getTime();
                    const dateB = new Date(b.raceObj?.date || 0).getTime();
                    
                    const isFinA = a.raceObj?.status === 'Finished';
                    const isFinB = b.raceObj?.status === 'Finished';
                    
                    const isOldA = isFinA && !isNaN(dateA) && (now - dateA) > oneWeekMs;
                    const isOldB = isFinB && !isNaN(dateB) && (now - dateB) > oneWeekMs;

                    // Архивные (старше 7 дней) всегда улетают в самый низ в свою папку
                    if (isOldA !== isOldB) return isOldA ? 1 : -1;

                    // Если обе уже в архиве — сортируем их внутри папки (новые сверху)
                    if (isOldA && isOldB) return dateB - dateA;

                    // 🔥 ФИКС: Все остальные (и будущие, и недавние финиши) сортируем СТРОГО хронологически!
                    return dateA - dateB;
                }

                // 4. Базовый приоритет для остальных чатов: Хронология обновлений
                const dA = new Date(a.updated).getTime();
                const dB = new Date(b.updated).getTime();
                return dB - dA;
            });

            const finalChatsToRender = [...pinnedChats, ...unpinnedChats];

            // ОТРИСОВКА САМИХ ЧАТОВ В ЛЕНТУ
            finalChatsToRender.forEach(c => {
                let rawName = this.getChatName(c) || "Чат"; 
                let name = this.escapeHTML(rawName); 
                let avatarLetter = rawName.charAt(0).toUpperCase();
                
                // 🔥 ДЕЛАЕМ МИНИ-КАЛЕНДАРЬ ВМЕСТО БУКВЫ ДЛЯ ГОНОК
                if (c.type === 'global' && c.raceObj && c.raceObj.date) {
                    const dateObj = new Date(c.raceObj.date);
                    if (!isNaN(dateObj.getTime())) {
                        const day = dateObj.getDate();
                        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                        
                        avatarLetter = `
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1;">
                                <span style="font-size: 22px; font-weight: 800; font-family: 'Unbounded', sans-serif;">${day}</span>
                                <span style="font-size: 12px; font-weight: 700; opacity: 0.6; font-family: 'Roboto Mono', monospace; margin-top: 1px;">${month}</span>
                            </div>
                        `;
                    }
                }
                
                // 🔥 УМНАЯ РАСКРАСКА КРУЖКА (СЕРАЯ ДЛЯ ЗАВЕРШЕННЫХ ГОНОК)
                let avatarStyle = '';
                if (c.type === 'global') {
                    // Если гонка завершена — делаем кружок и текст серыми
                    if (c.raceObj && c.raceObj.status === 'Finished') {
                        avatarStyle = 'background:var(--bg-surface-hover); color:var(--text-muted); border-color:var(--border);';
                    } else {
                        // Активные гонки остаются красными
                        avatarStyle = 'background:var(--danger-light); color:var(--danger); border-color:var(--danger);';
                    }
                } else if (c.type === 'team') {
                    avatarStyle = 'background:rgba(59,130,246,0.1); color:var(--info); border-color:var(--info);';
                } else if (c.type === 'team_channel') {
                    avatarStyle = 'background:rgba(255,193,7,0.1); color:var(--primary); border-color:var(--primary);';
                }
                // 🔥 УМНЫЙ ПОДЗАГОЛОВОК ДЛЯ ЧАТОВ (АБСОЛЮТНО БЕЗОПАСНАЯ ВЕРСИЯ)
                let subText = 'Общий чат гонки';
                let subColor = 'var(--text-muted)';

                if (c.type === 'direct') { 
                    subText = 'Личные сообщения'; 
                } else if (c.type === 'team') { 
                    subText = 'Скрытый чат команды'; subColor = 'var(--info)'; 
                } else if (c.type === 'private') { 
                    subText = 'Закрытая группа'; 
                } else if (c.type === 'team_channel') { 
                    subText = 'Публичный Канал команды'; subColor = 'var(--primary)'; 
                } else if (c.type === 'global') {
                    try {
                        if (c.raceObj) {
                            // Вшитые словари: спасательный круг, если this.RACE_FORMATS недоступен
                            const safeFormats = this.RACE_FORMATS || { 'mass': 'Группа', 'itt': 'Разделка', 'ttt': 'Команда', 'crit': 'По очкам', 'relay': 'Эстафета' };
                            const safeSurfaces = this.RACE_SURFACES || { 'road': 'Шоссе', 'offroad': 'Грунт', 'indoor': 'Индор', 'track': 'Трек' };
                            
                            let formatName = c.raceObj.format ? (safeFormats[c.raceObj.format] || 'Заезд') : 'Заезд';
                            let surfaceName = c.raceObj.surface ? (safeSurfaces[c.raceObj.surface] || '') : '';
                            
                            // Склеиваем и делаем первую букву заглавной
                            let typeName = surfaceName ? `${surfaceName} • ${formatName}` : formatName;
                            if (typeName) {
                                subText = typeName.charAt(0).toUpperCase() + typeName.slice(1).toLowerCase();
                            }
                            
                            // Раскраска статуса
                            if (c.raceObj.status === 'LIVE' || c.raceObj.status === 'Registration') {
                                subColor = 'var(--danger)';
                            }
                        } else {
                            subColor = 'var(--danger)';
                        }
                    } catch(err) {
                        // Если случится невозможное, чаты не исчезнут, а выведут дефолт
                        subText = 'Общий чат гонки'; 
                        subColor = 'var(--danger)';
                        console.error('Ошибка в подписи:', err);
                    }
                }
                
                if (c.type === 'direct' && this.unreadCounts[c.id] > 0) {
                    if (c.expand?.last_message?.text?.includes('[ACTION:TRANSFER')) {
                        subText = '📩 НОВАЯ ЗАЯВКА';
                        subColor = 'var(--primary)';
                    }
                }

                if (c.type === 'gruppetto') {
                    avatarStyle = 'background:rgba(168,85,247,0.1); color:#a855f7; border-color:#a855f7 regular;';
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
                let isChecked = false; 

                if (this.isSelectionMode) {
                    if (!this.selectedChats) this.selectedChats = new Set();
                    isChecked = this.selectedChats.has(c.id);
                    rightControlsHtml = `<div style="display:flex; align-items:center;"><input type="checkbox" style="accent-color:var(--danger); width:18px; height:18px; pointer-events:none;" ${isChecked ? 'checked' : ''}></div>`;
                } else {
                    const unreadCount = this.unreadCounts[c.id] || 0;
                    let badgeHtml = unreadCount > 0 ? `<div style="background: var(--info); color: var(--bg-body); font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 20px; min-width: 20px; text-align: center; box-shadow: none; margin-left: auto;">${unreadCount}</div>` : '<div style="margin-left: auto;"></div>';

                    const isPinned = pinnedIds.includes(c.id);
                    const pinIconHtml = `<button onclick="window.app.togglePinChat('${c.id}', event)" style="background:none; border:none; padding:8px; margin-left:2px; cursor:pointer; opacity: ${isPinned ? '1' : '0.25'}; transition: 0.2s; display: flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${isPinned ? '1' : '0.25'}'" title="${isPinned ? 'Открепить' : 'Закрепить'}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="${isPinned ? 'var(--text-muted)' : 'none'}" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="17" x2="12" y2="22"></line>
                            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.68a2 2 0 0 1-1.11 1.87l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
                        </svg>
                    </button>`;

                    const shareIconHtml = `<button onclick="event.stopPropagation(); window.app.copyChatLink('${c.id}')" class="btn-circle-share" style="margin-left:8px;" title="Поделиться">🔗</button>`;

                    rightControlsHtml = `<div style="display:flex; align-items:center;">${badgeHtml}${shareIconHtml}${pinIconHtml}</div>`;
                }

                const el = document.createElement('div');
                el.className = `chat-item ${activeClass}`;
                el.id = `chat-item-${c.id}`;

                if (this.isSelectionMode && isChecked) {
                    el.className += ' active';
                    el.style.backgroundColor = 'rgba(255,51,102,0.1)';
                }

                if (this.isSelectionMode) {
                    el.onclick = () => window.app.toggleChatSelection(c.id);
                    el.innerHTML = `${avatarHtml}<div class="chat-info"><div class="chat-name">${name}</div><div class="chat-preview" style="color:${subColor}">${subText}</div></div>${rightControlsHtml}`; 
                
                } else if (c.raceObj) {
                    el.onclick = (e) => {
                        if (!e.target.closest('.race-accordion-body')) {
                            const body = el.querySelector('.race-accordion-body');
                            if (body) {
                                const isOpen = body.style.display === 'block';
                                document.querySelectorAll('.race-accordion-body').forEach(b => b.style.display = 'none');
                                
                                if (isOpen) {
                                    body.style.display = 'none';
                                    this.expandedRaceId = null;
                                } else {
                                    body.style.display = 'block';
                                    this.expandedRaceId = c.id;
                                }
                            }
                        }
                    };
                    
                    const r = c.raceObj;
                    const dObj = new Date(r.date);
                    const timeStr = dObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    const dateStr = dObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
                    const distStr = r.distance ? `${r.distance} км` : 'Дистанция не указана';
                    
                    // ==========================================
                    // 🔥 НОВАЯ ЛОГИКА: ПЕРСОНАЛИЗИРОВАННОЕ ВРЕМЯ И НОМЕР
                    // ==========================================
                    let startTimeHtml = `<div class="time-capsule time-general" style="flex-shrink: 0; white-space: nowrap;"><span class="time-icon">⏱️</span><span>${timeStr}</span></div>`;
                    
                    if (this.currentRider && !this.isGuest && this.myRosters && this.myRosters[r.id]) {
                        const myReg = this.myRosters[r.id];
                        
                        // Формируем стильную плашку для номера
                        let bibHtml = myReg.bib ? `<span style="background:var(--bg-body); border:1px solid var(--border); padding:2px 4px; border-radius:4px; margin-right:4px; color:var(--text-main);">№ ${myReg.bib}</span>` : '';
                        
                        if (myReg.planned_start) {
                            let personalTime = myReg.planned_start; 
                            startTimeHtml = `<div class="time-capsule time-personal" style="flex-shrink: 0; white-space: nowrap;">${bibHtml}<span class="time-icon">⚡</span><span>${personalTime}</span></div>`;
                        } else if (myReg.bib) {
                            // Если времени старта еще нет, но номер уже выдали
                            startTimeHtml = `<div class="time-capsule time-general" style="flex-shrink: 0; white-space: nowrap;">${bibHtml}<span class="time-icon">⏱️</span><span>${timeStr}</span></div>`;
                        }
                    }
                    
                    let dynamicBtn = '';
                    let startListBtn = '';

                    if (r.status === 'Registration') {
                        let customButtons = '';
                        try {
                            let pData = c.panel_data;
                            if (typeof pData === 'string') pData = JSON.parse(pData);
                            if (pData && pData.buttons && pData.buttons.length > 0) {
                                pData.buttons.forEach(b => {
                                    const m = b.url.match(/\[ACTION:REGISTER:([a-zA-Z0-9_]+)\]/);
                                    if (m) {
                                        let shortLabel = b.label;
                                        
                                        // Очищаем название для старых и новых форматов
                                        if (shortLabel.includes('[')) {
                                            shortLabel = shortLabel.split('[')[1].split(']')[0].trim(); // Для старых гонок
                                        } else if (shortLabel.includes('ЗАЯВКА:')) {
                                            shortLabel = shortLabel.replace('ЗАЯВКА:', '').trim(); // Для новых мульти-дистанций
                                        }
                                        
                                        const labelText = `⚡ ${this.escapeHTML(shortLabel.toUpperCase())}`;
                                        
                                        customButtons += `<button class="sidebar-btn sync-btn-${m[1]}" data-label="${labelText}" onclick="window.app.registerForRace('${m[1]}', this, event)" style="background:var(--danger); color:#fff; border:none; padding:10px; border-radius:8px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; transition:0.2s; display:flex; align-items:center; justify-content:center; margin-bottom:4px;">${labelText}</button>`;
                                    }
                                });
                            }
                        } catch(e) {}
                        
                        if (customButtons) {
                            dynamicBtn = `<div style="grid-column: 1 / -1; display:flex; flex-direction:column; margin-top:8px; border-top: 1px dashed var(--border); padding-top:10px;">${customButtons}</div>`;
                        } else {
                            dynamicBtn = `<button class="sidebar-btn sync-btn-${r.id}" data-label="⚡ ЗАЯВИТЬСЯ" onclick="window.app.registerForRace('${r.id}', this, event)" style="background:var(--primary); color:#000; border:none; padding:10px; border-radius:8px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; transition:0.2s; display:flex; align-items:center; justify-content:center; grid-column: 1 / -1; margin-top:8px; border-top: 1px dashed var(--border); padding-top:10px; box-shadow: 0 4px 15px rgba(255, 193, 7, 0.2);">⚡ ЗАЯВИТЬСЯ</button>`;
                        }
                        
                        startListBtn = `<button onclick="window.app.openLiveBoard('${r.id}', event)" style="background:var(--bg-surface-hover); color:var(--text-main); border:1px solid var(--border); padding:10px; border-radius:8px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; transition:0.2s; display:flex; align-items:center; justify-content:center;">📋 СТАРТ-ЛИСТ</button>`;
                    } else if (r.status === 'LIVE') {
                        dynamicBtn = `<button onclick="window.app.openLiveBoard('${r.id}', event)" style="background:var(--text-main); color:var(--bg-body); border:none; padding:10px; border-radius:8px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; transition:0.2s; display:flex; align-items:center; justify-content:center; gap:6px;"><div style="width:6px; height:6px; background:var(--bg-body); border-radius:50%; animation: dot-pulse 1s infinite;"></div>РЕЗУЛЬТАТЫ</button>`;
                    } else if (r.status === 'Finished') {
                        dynamicBtn = `<button onclick="window.app.openLiveBoard('${r.id}', event)" style="background:var(--bg-surface-hover); color:var(--text-main); border:1px solid var(--border); padding:10px; border-radius:8px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; transition:0.2s; display:flex; align-items:center; justify-content:center;">🏆 РЕЗУЛЬТАТЫ</button>`;
                    } else if (r.status === 'Скоро') {
                        dynamicBtn = `<button disabled style="background:var(--bg-surface-hover); color:var(--text-muted); border:1px dashed var(--border); padding:10px; border-radius:8px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:not-allowed; display:flex; align-items:center; justify-content:center;">⏳ АНОНС</button>`;
                    } else {
                        dynamicBtn = `<button onclick="window.app.openLiveBoard('${r.id}', event)" style="background:var(--bg-surface-hover); color:var(--text-main); border:1px solid var(--border); padding:10px; border-radius:8px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; transition:0.2s; display:flex; align-items:center; justify-content:center;">📋 ИНФОРМАЦИЯ</button>`;
                    }
                    
                    const displayState = (this.expandedRaceId === c.id) ? 'block' : 'none';

                    const accordionBody = `
                        <div class="race-accordion-body" style="display:${displayState}; width:100%; flex-basis:100%; margin-top:10px; padding-top:10px; border-top:1px dashed var(--border); cursor:default;">
                            
                            <div style="display:flex; align-items:center; justify-content:space-between; font-size:11px; color:var(--text-muted); margin-bottom:12px; font-family:'Roboto Mono';">
                                <span>📅 ${dateStr}</span>
                                ${startTimeHtml}
                                <span>🏁 ${distStr}</span>
                            </div>
                            
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                                <button onclick="window.app.openChat('${c.id}')" style="background:transparent; color:var(--text-main); border:1px solid var(--border); padding:10px; border-radius:8px; font-family:'Unbounded'; font-weight:800; font-size:10px; cursor:pointer; transition:0.2s; display:flex; align-items:center; justify-content:center;" onmouseover="this.style.background='var(--bg-surface-hover)'" onmouseout="this.style.background='transparent'">
    💬 ЧАТ ГОНКИ
</button>
                                
                                ${startListBtn}
                                ${dynamicBtn}
                            </div>
                        </div>
                    `;
                    
                    el.style.flexWrap = 'wrap'; 
                    el.innerHTML = `
                        ${avatarHtml}
                        <div class="chat-info">
                            <div class="chat-name">${name}</div>
                            <div class="chat-preview" style="color:${subColor}">${subText} • ${r.status || ''}</div>
                        </div>
                        ${rightControlsHtml}
                        ${accordionBody}
                    `;
                    
                } else {
                    el.onclick = () => window.app.openChat(c.id);
                    el.innerHTML = `${avatarHtml}<div class="chat-info"><div class="chat-name">${name}</div><div class="chat-preview" style="color:${subColor}">${subText}</div></div>${rightControlsHtml}`;
                }
                
                // 🔥 Инициализируем состояние Архива (чтобы он не закрывался сам по себе)
                if (typeof this.isArchiveExpanded === 'undefined') this.isArchiveExpanded = false;

                // 🔥 Проверяем: гонка завершена И прошло больше 7 дней?
                let isActuallyOld = false;
                if (c.raceObj && c.raceObj.date) {
                    const raceDate = new Date(c.raceObj.date).getTime();
                    if (!isNaN(raceDate) && (Date.now() - raceDate) > (7 * 24 * 60 * 60 * 1000)) {
                        isActuallyOld = true;
                    }
                }

                const isArchivedRace = this.chatListFilter === 'races' && 
                                       c.type === 'global' && 
                                       c.raceObj?.status === 'Finished' && 
                                       isActuallyOld && 
                                       !pinnedIds.includes(c.id);

                // 👇 НОВАЯ ЛОГИКА: Просто ищем заранее созданный наверху Архив
                const archiveWrapper = document.getElementById('archiveRacesWrapper');
                const archiveContainer = document.getElementById('archiveRacesContainer');

                if (isArchivedRace && archiveContainer) {
                    archiveWrapper.style.display = 'block'; // Включаем видимость папки Архива
                    archiveContainer.appendChild(el); // Кладем карточку старой гонки внутрь
                } else {
                    // Все активные гонки и закрепленные чаты идут в общий список (ниже Архива)
                    container.appendChild(el);
                }
            });

            if (filterText && globalContacts.length > 0 && !this.isSelectionMode) {
                const lbl = document.createElement('div');
                lbl.style.cssText = "font-size:10px; color:var(--text-muted); margin: 15px 20px 5px; font-family:'Unbounded'; font-weight:800;";
                lbl.innerText = "ГЛОБАЛЬНЫЙ ПОИСК (ЛЮДИ)";
                container.appendChild(lbl);

                globalContacts.forEach(r => {
                    let rawName = r.first_name + ' ' + r.last_name; 
                    let name = this.escapeHTML(rawName); 
                    let avatarLetter = rawName.charAt(0).toUpperCase();
                    let subText = this.getRiderTeamName(r);
                    
                    const el = document.createElement('div'); el.className = `chat-item`;
                    el.onclick = () => window.app.startDirectChat(r.id); 
                    let avatarHtml = this.renderAvatar(r.id, 'background:var(--bg-surface-hover); color:var(--text-main); border-color:var(--border);', avatarLetter);
                    el.innerHTML = `${avatarHtml}<div class="chat-info"><div class="chat-name">${name}</div><div class="chat-preview" style="color:var(--text-muted)">${subText}</div></div>`; 
                    container.appendChild(el);
                });
            }

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
                    container.innerHTML = `<div style="padding:10px; color:var(--danger); font-size:10px; text-align:center;">Ни чего не найдено</div>`;
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
		
        getChatName(chat) { 
            try { 
                // 🔥 ФИКС: Для гонок берем чистое название из привязанной гонки, без вшитой даты!
                if (chat.type === 'global' && chat.raceObj) {
                    return chat.raceObj.name.toUpperCase();
                }
                
                if (chat.type === 'team' || chat.type === 'team_channel') {
                    if (chat.name) return chat.name;
                    if (chat.expand?.team_id) {
                        const tExp = chat.expand.team_id;
                        return Array.isArray(tExp) ? tExp.map(t => t.name).join(', ') : tExp.name;
                    }
                    return "Команда";
                } 
                if (chat.type === 'direct') { 
                    const otherRider = chat.expand?.participants?.find(p => p.id !== this.currentRider.id); 
                    if (otherRider && otherRider.email === 'bot@sotka.one') return "VILKA MOTO"; 
                    return otherRider ? `${otherRider.first_name} ${otherRider.last_name}` : "Избранное (Я)"; 
                } 
                return chat.name || "Чат"; 
            } catch (e) { 
                return "Чат"; 
            } 
        }
        filterChats(val) { this.renderChatList(val); }
        openChatMobile() { if (window.innerWidth <= 768) document.getElementById('mainChatArea').classList.add('mobile-open'); }
        closeChatMobile() { document.getElementById('mainChatArea').classList.remove('mobile-open'); }
        openMobileCreateMenu() { 
            document.getElementById('mobileCreateMenuModal').style.display = 'flex'; 
            
            // 🔥 Показываем кнопку PUSH только админам
            const myRole = this.getUserMaxRole();
            const isAdmin = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['admin'];
            const pushBtn = document.getElementById('btnOpenPushMenu');
            if (pushBtn) pushBtn.style.display = isAdmin ? 'flex' : 'none';
        }

        // ==========================================
        // 🔥 ЛОГИКА МАССОВЫХ PUSH-РАССЫЛОК
        // ==========================================
        async openPushModal() {
            document.getElementById('mobileCreateMenuModal').style.display = 'none';
            document.getElementById('createPushModal').style.display = 'flex';
            document.getElementById('pushTitleInput').value = '';
            document.getElementById('pushMessageInput').value = '';
            document.getElementById('pushTargetType').value = 'peloton';
            this.onPushTargetChange();

            // 1. Заполняем список команд текущего пелотона
            let teamOpts = '';
            Object.values(this.teamsMap).forEach(t => {
                let pId = Array.isArray(t.peloton_id) ? t.peloton_id[0] : t.peloton_id;
                if (this.currentPelotonFilter === 'all' || pId === this.currentPelotonFilter) {
                    teamOpts += `<option value="${t.id}">${this.escapeHTML(t.name)}</option>`;
                }
            });
            document.getElementById('pushTargetTeam').innerHTML = teamOpts || '<option value="">Нет команд</option>';

            // 2. Заполняем список предстоящих и активных гонок
            document.getElementById('pushTargetRace').innerHTML = '<option value="">Загрузка гонок...</option>';
            try {
                let filterStr = `status != "Finished"`;
                if (this.currentPelotonFilter !== 'all') {
                    filterStr += ` && peloton_id="${this.currentPelotonFilter}"`;
                }
                const races = await pb.collection('races').getFullList({ filter: filterStr, sort: 'date', requestKey: null });
                let raceOpts = races.map(r => `<option value="${r.id}">${this.escapeHTML(r.name)} (${new Date(r.date).toLocaleDateString('ru-RU')})</option>`).join('');
                document.getElementById('pushTargetRace').innerHTML = raceOpts || '<option value="">Нет активных гонок</option>';
            } catch(e) {
                document.getElementById('pushTargetRace').innerHTML = '<option value="">Ошибка загрузки</option>';
            }
        }

        onPushTargetChange() {
            const type = document.getElementById('pushTargetType').value;
            document.getElementById('pushTargetTeam').style.display = type === 'team' ? 'block' : 'none';
            document.getElementById('pushTargetRace').style.display = type === 'race' ? 'block' : 'none';
        }

        async executeMassPush() {
            const title = document.getElementById('pushTitleInput').value.trim();
            const message = document.getElementById('pushMessageInput').value.trim();
            const type = document.getElementById('pushTargetType').value;
            
            if (!title || !message) return alert("Заполните заголовок и текст уведомления!");

            const btn = document.getElementById('btnSendPush');
            btn.innerText = 'СБОР АУДИТОРИИ...';
            btn.disabled = true;

            try {
                let targetUserIds = []; // ID гонщиков, кому шлем

                if (type === 'team') {
                    const teamId = document.getElementById('pushTargetTeam').value;
                    if (!teamId) throw new Error("Выберите команду");
                    // Находим всех гонщиков этой команды
                    targetUserIds = Object.values(this.ridersMap)
                        .filter(r => {
                            const rTeams = Array.isArray(r.team_id) ? r.team_id : (r.team_id ? [r.team_id] : []);
                            return rTeams.includes(teamId) && r.id !== this.currentRider.id;
                        })
                        .map(r => r.id);

                } else if (type === 'race') {
                    const raceId = document.getElementById('pushTargetRace').value;
                    if (!raceId) throw new Error("Выберите гонку");
                    // Выкачиваем ростер гонки
                    const rosters = await pb.collection(
'race_rosters').getFullList({ filter: `race_id="${raceId}"`, requestKey: null });
                    targetUserIds = rosters.map(r => r.rider_id).filter(id => id !== this.currentRider.id);

                } else {
                    // Весь пелотон
                    targetUserIds = Object.values(this.ridersMap).filter(r => {
                        if (r.id === this.currentRider.id || r.email === 'bot@sotka.one') return false;
                        if (this.currentPelotonFilter === 'all') return true;
                        
                        // Проверяем, состоит ли гонщик в команде этого пелотона
                        const rTeams = Array.isArray(r.team_id) ? r.team_id : (r.team_id ? [r.team_id] : []);
                        return rTeams.some(tId => {
                            const tObj = this.teamsMap[tId];
                            let pId = tObj && tObj.peloton_id ? (Array.isArray(tObj.peloton_id) ? tObj.peloton_id[0] : tObj.peloton_id) : null;
                            return pId === this.currentPelotonFilter;
                        });
                    }).map(r => r.id);
                }

                if (targetUserIds.length === 0) {
                    alert("В выбранном сегменте нет адресатов (или там только вы).");
                    btn.innerText = '🚀 ОТПРАВИТЬ PUSH';
                    btn.disabled = false;
                    return;
                }

                if (!confirm(`Отправить PUSH уведомление ${targetUserIds.length} гонщикам?`)) {
                    btn.innerText = '🚀 ОТПРАВИТЬ PUSH';
                    btn.disabled = false;
                    return;
                }

                btn.innerText = 'ОТПРАВКА...';
                // Ссылка по умолчанию кидает в приложение (на главную)
                await this.sendPushNotification(title, message, targetUserIds, 'https://vilka.sotka.one');

                alert(`Успешно! PUSH отправлен ${targetUserIds.length} спортсменам.`);
                document.getElementById('createPushModal').style.display = 'none';

            } catch (e) {
                console.error(e);
                alert("Ошибка отправки: " + (e.message || "Сбой системы"));
            } finally {
                btn.innerText = '🚀 ОТПРАВИТЬ PUSH';
                btn.disabled = false;
            }
        }

        renderContactsTab(filterText = "") {
            const container = document.getElementById('contactList'); if(!container) return; container.innerHTML = '';
            let all = Object.values(this.ridersMap).filter(r => r.id !== this.currentRider.id && r.email !== 'bot@sotka.one' && !(r.email && r.email.startsWith('guest_')));
            
            // 🔥 ФИКС 1: Фильтрация по пелотону (с учетом нескольких команд)
            if (this.currentPelotonFilter !== 'all') { 
                all = all.filter(r => { 
                    const rTeams = Array.isArray(r.team_id) ? r.team_id : (r.team_id ? [r.team_id] : []);
                    if (rTeams.length === 0) return true; // Оставляем одиночек
                    // Оставляем гонщика, если ХОТЯ БЫ ОДНА его команда принадлежит выбранному пелотону
                    return rTeams.some(tId => {
                        const rTeam = this.teamsMap[tId]; 
                        if (!rTeam) return true; 
                        let tPeloton = rTeam.peloton_id; 
                        if (!tPeloton) return true; 
                        if (Array.isArray(tPeloton)) return tPeloton.includes(this.currentPelotonFilter); 
                        return tPeloton === this.currentPelotonFilter; 
                    });
                }); 
            }
            
            if (filterText) { const q = filterText.toLowerCase(); all = all.filter(r => r.first_name.toLowerCase().includes(q) || r.last_name.toLowerCase().includes(q)); }
            
            // 🔥 ФИКС 2: Умная сортировка контактов (Капитаны моих команд - выше)
            const myTeams = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);
            
            const getSortWeight = (rider) => { 
                const roles = this.usersMap[rider.email] || []; 
                const maxRoleWeight = Math.max(...roles.map(role => this.ROLE_WEIGHTS[role] || 20), 20); 
                
                const rTeams = Array.isArray(rider.team_id) ? rider.team_id : (rider.team_id ? [rider.team_id] : []);
                // Проверяем, есть ли у нас с этим гонщиком хотя бы одна общая команда
                const isSameTeam = myTeams.some(id => rTeams.includes(id));
                
                if (maxRoleWeight >= this.ROLE_WEIGHTS['admin']) return 1; 
                if (maxRoleWeight >= this.ROLE_WEIGHTS['captain'] && isSameTeam) return 2; 
                if (isSameTeam) return 3; 
                return 4; 
            };
            
            all.sort((a, b) => { const wA = getSortWeight(a); const wB = getSortWeight(b); if (wA !== wB) return wA - wB; return a.last_name.localeCompare(b.last_name); });
            
            all.forEach(r => {
                const el = document.createElement('div'); 
                el.className = 'contact-item'; 
                el.onclick = () => { window.app.startDirectChat(r.id); window.app.switchTab('chats'); };
                
                const safeFirstName = this.escapeHTML(r.first_name);
                const safeLastName = this.escapeHTML(r.last_name);
                
                // 🔥 ФИКС 3: Используем нашу универсальную функцию имени команды!
                const safeTeamName = this.escapeHTML(this.getRiderTeamName(r));
                
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
        // 🔥 АБСОЛЮТНАЯ ЗАЩИТА ОТ ДВОЙНОГО КЛИКА (ПРЕДОТВРАЩАЕТ ДУБЛИ ЧАТОВ)
        if (this.isStartingDirectChat) return;
        this.isStartingDirectChat = true;

        try {
            const createMenu = document.getElementById('mobileCreateMenuModal');
            if (createMenu) createMenu.style.display = 'none';

            // ==========================================
            // 🔥 1. УМНЫЙ ПЕРЕХВАТ ГОСТЯ С ИСКЛЮЧЕНИЕМ ДЛЯ САППОРТА
            // ==========================================
            if (this.isGuest) {
                const supportAdminId = "blf8xys1c833b3p"; // ID твоего админа
                
                if (targetRiderId === supportAdminId) {
                    try {
                        let savedGuestId = localStorage.getItem('vilka_guest_id');
                        
                        if (!savedGuestId || this.currentRider.id === 'anonymous_guest') {
                            if (typeof showVilkaSplash === 'function') showVilkaSplash();
                            
                            const randomNum = Math.floor(1000 + Math.random() * 9000);
                            const newGuest = await pb.collection('riders').create({
                                first_name: "Гость", 
                                last_name: `#${randomNum}`, 
                                email: `guest_${Date.now()}@sotka.one`, 
                                base_cluster: "O"
                            }, { requestKey: null });
                            
                            localStorage.setItem('vilka_guest_id', newGuest.id);
                            this.currentRider = newGuest;
                            this.ridersMap[newGuest.id] = newGuest; 
                            
                            if (typeof hideVilkaSplash === 'function') hideVilkaSplash();
                        }
                    } catch(e) {
                        if (typeof hideVilkaSplash === 'function') hideVilkaSplash();
                        alert("Ошибка соединения с сервером поддержки.");
                        return;
                    }
                } else {
                    if (confirm("Для отправки сообщений необходимо войти в аккаунт SOTKA. Перейти ко входу?")) {
                        this.openLoginScreen();
                    }
                    return;
                }
            }

            // ==========================================
            // 🔥 2. ПОДГРУЗКА ПРОФИЛЯ СОБЕСЕДНИКА
            // ==========================================
            if (!this.ridersMap[targetRiderId]) {
                try {
                    const targetRider = await pb.collection('riders').getOne(targetRiderId, { requestKey: null });
                    this.ridersMap[targetRider.id] = targetRider;
                    
                    if (targetRider.email && targetRider.roles) {
                        this.usersMap[targetRider.email] = Array.isArray(targetRider.roles) ? targetRider.roles : [targetRider.roles];
                    }
                } catch (err) {
                    console.error("Не удалось найти профиль собеседника:", err);
                    alert("Пользователь не найден.");
                    return;
                }
            }

            // ==========================================
            // 🔥 3. ИЩЕМ ИЛИ СОЗДАЕМ ЧАТ (С БРОНЕБОЙНОЙ ПРОВЕРКОЙ БАЗЫ)
            // ==========================================
            // 3.1. Сначала ищем в локальном кэше (со строгой проверкой)
            let existingChat = this.chats.find(c => {
                if (c.type !== 'direct') return false;
                const parts = c.participants || [];
                // 🔥 Фикс чата с самим собой ("Избранное")
                if (targetRiderId === this.currentRider.id) {
                    return parts.length === 1 && parts[0] === this.currentRider.id; 
                }
                return parts.length === 2 && parts.includes(this.currentRider.id) && parts.includes(targetRiderId);
            });
            
            // 3.2. Если кэш отстал, делаем бронебойный запрос в базу
            if (!existingChat && navigator.onLine) {
                try {
                    const serverChats = await pb.collection('chats').getFullList({ 
                        filter: `type="direct" && participants~"${this.currentRider.id}" && participants~"${targetRiderId}"`, 
                        requestKey: null 
                    });
                    
                    existingChat = serverChats.find(c => {
                        const parts = c.participants || [];
                        if (targetRiderId === this.currentRider.id) {
                            return parts.length === 1 && parts[0] === this.currentRider.id;
                        }
                        return parts.length === 2 && parts.includes(this.currentRider.id) && parts.includes(targetRiderId);
                    });

                    if (existingChat && !this.chats.find(c => c.id === existingChat.id)) {
                        this.chats.push(existingChat); // Добавляем найденный чат в память
                    }
                } catch(dbErr) { console.warn("Ошибка проверки базы:", dbErr); }
            }

            if (existingChat) { 
                this.openChat(existingChat.id); 
            } else { 
                // 3.3. ТОЛЬКО ЕСЛИ ЧАТА ТОЧНО НЕТ НИГДЕ — СОЗДАЕМ НОВЫЙ
                try { 
                    let newParticipants = targetRiderId === this.currentRider.id ? [this.currentRider.id] : [this.currentRider.id, targetRiderId];

                    const newChat = await pb.collection('chats').create({ 
                        type: 'direct', 
                        name: 'Direct', 
                        participants: newParticipants,
                        peloton_id: "" 
                    }, { expand: 'participants', requestKey: null }); 
                    
                    this.chats.push(newChat);
                    this.renderChatList(document.getElementById('chatSearch')?.value || "");
                    this.openChat(newChat.id); 
                } catch(e) { 
                    console.error("Ошибка создания чата:", e);
                    alert("Ошибка создания чата"); 
                } 
            }
        } finally {
            // В самом конце ОБЯЗАТЕЛЬНО снимаем блокировку, чтобы кнопка снова работала
            this.isStartingDirectChat = false; 
        }
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
                if (pelotonSelect) { 
                    pelotonSelect.disabled = true; pelotonSelect.style.opacity = '0.5'; 
                    const myTeams = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);
                    const activeTeamId = myTeams.find(id => this.teamsMap[id]?.peloton_id === this.currentPelotonFilter) || myTeams[0];
                    let teamIdToUse = isManager ? document.getElementById('groupTeamSelect').value : activeTeamId; 
                    const teamObj = this.teamsMap[teamIdToUse]; 
                    if (teamObj && teamObj.peloton_id) { pelotonSelect.value = Array.isArray(teamObj.peloton_id) ? teamObj.peloton_id[0] : teamObj.peloton_id; } else { pelotonSelect.value = ''; } 
                }
            } else if (type === 'private' || type === 'gruppetto') { // 🔥 ОБРАБОТКА ГРУППЕТТО
            pCont.style.display = 'flex'; 
            let pList = Object.values(this.ridersMap).filter(r => r.id !== this.currentRider.id && r.email !== 'bot@sotka.one' && !(r.email && r.email.startsWith('guest_'))).sort((a,b) => a.last_name.localeCompare(b.last_name));
            
            pBox.innerHTML = pList.map(r => { 
                // 🔥 ФИКС: Используем наш универсальный метод получения названия команды
                const teamName = this.getRiderTeamName(r); 
                return `<label class="group-part-label" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer; color:var(--text-main); font-size:13px; padding: 5px 0;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <input type="checkbox" class="group-part-cb" value="${r.id}" style="accent-color:var(--primary); width:16px; height:16px;">
                        <span>${this.escapeHTML(r.last_name)} ${this.escapeHTML(r.first_name)}</span>
                    </div>
                    <span style="font-size:10px; color:var(--text-muted);">${this.escapeHTML(teamName)}</span>
                </label>`
            }).join('');
        }
        }

        filterGroupParts(val) { const q = val.toLowerCase(); const labels = document.querySelectorAll('.group-part-label'); labels.forEach(lbl => { const text = lbl.querySelector('span').innerText.toLowerCase(); lbl.style.display = text.includes(q) ? 'flex' : 'none'; }); }

        async createGroupChat() {
            const name = document.getElementById('groupNameInput').value.trim(); const type = document.getElementById('groupTypeSelect').value; let pelotonId = document.getElementById('groupPelotonSelect').value; 
            if (!name) return alert('Введите название чата!');
            const btn = document.getElementById('btnCreateGroup'); btn.innerText = 'СОЗДАНИЕ...'; btn.disabled = true;
            let payload = { name: name, type: type, participants: [this.currentRider.id] }; 
            
            if (type === 'team') {
                const roles = this.usersMap[this.currentRider.email] || []; 
                const myTeams = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);
                const activeTeamId = myTeams.find(id => this.teamsMap[id]?.peloton_id === this.currentPelotonFilter) || myTeams[0];
                if (JSON.stringify(roles).includes('admin') || JSON.stringify(roles).includes('superadmin')) { payload.team_id = document.getElementById('groupTeamSelect').value; } else { payload.team_id = activeTeamId; }
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
				
				// 🔥 ОТПРАВЛЯЕМ ГЛОБАЛЬНЫЙ PUSH ВСЕМУ ПЕЛОТОНУ!
                const pushTitle = type === 'sos' ? '🆘 СИГНАЛ SOS!' : '🚴 СБОР НА ПОКАТУШКУ';
                const pushMessage = `${this.currentRider.first_name} ${this.currentRider.last_name} передает: ${message}`;
                // Ссылка сразу откроет нужный чат радара при клике на пуш!
                const pushUrl = `https://vilka.sotka.one/?chat=${newChat.id}`;
                
                await this.sendPushNotification(pushTitle, pushMessage, [], pushUrl);

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
            const ws = document.getElementById('pelotonWorkspace');
            const mainChat = document.getElementById('mainChatArea');
            if (ws) ws.style.display = 'none';
            if (mainChat) mainChat.style.display = 'flex';
            this.activeChatId = 'newsfeed';
            
            // 🔥 АВТО-ПЕРЕКЛЮЧЕНИЕ НА ВКЛАДКУ "НОВОСТИ", если зашли по прямой ссылке
            if (this.chatListFilter !== 'clubs') {
                this.chatListFilter = 'clubs';
                this.renderChatList(document.getElementById('chatSearch')?.value || "");
            }
            
            // 🔥 ФИКС 1: Сбрасываем токен сессии, чтобы прервать фоновую загрузку старого чата!
            const sessionToken = Math.random();
            this.chatSessionToken = sessionToken;
            
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
            
            // 🔥 ФИКС 2: Прячем меню "Три точки" и старые кнопки (Ленте они не нужны)
            const headerActions = document.querySelector('.chat-header-actions');
            if (headerActions) headerActions.style.display = 'none';
            
            document.getElementById('activeChatName').innerHTML = `ЛЕНТА НОВОСТЕЙ КОМАНД <button onclick="window.app.copyChatLink('newsfeed')" title="Копировать ссылку" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:0 0 0 5px; vertical-align:middle; transition:0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></button>`;
            document.getElementById('activeChatAvatarContainer').innerHTML = `<div class="avatar" style="background:var(--primary); color:#000;">📰</div>`;
            document.getElementById('activeChatMeta').innerHTML = `<span style="color:var(--text-muted); font-size:10px; font-weight:bold; text-transform:uppercase;">${feedSubText}</span>`;
            document.getElementById('pinnedMessageBar').style.display = 'none';
            
            // 🔥 ФИКС 3: Прячем зеленую Инфо-плашку от предыдущего чата
            const staticInfoBanner = document.getElementById('staticInfoBanner');
            if (staticInfoBanner) staticInfoBanner.style.display = 'none';
            
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
                
                // 🔥 ФИКС 4: Если пока Лента грузилась, пользователь нажал на другой чат — отменяем отрисовку!
                if (this.chatSessionToken !== sessionToken) return;

                container.innerHTML = '';
                if (res.items.length === 0) { container.innerHTML = `<div style="text-align:center; padding:50px; color:var(--text-muted); font-family:'Unbounded';">НОВОСТЕЙ ПОКА НЕТ</div>`; return; }
                
                // 🔥 УБРАЛИ .reverse() — теперь самые свежие посты рендерятся первыми (сверху вниз)
                res.items.forEach(m => { try { this.appendMessageHTML(m, container, false, true); } catch (err) { } });
                
                // 🔥 СКРОЛЛ В САМЫЙ ВЕРХ: так как свежие посты теперь наверху, нам не нужно мотать вниз
                container.scrollTop = 0; 
                
                this.syncRaceButtonsState();
            } catch(e) { container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger);">Ошибка загрузки ленты</div>`; }
        }

// 🔥 ОТКРЫТИЕ КАЛЕНДАРЯ ВМЕСТО ЧАТА
        openPelotonCalendar() {
            this.activeChatId = 'calendar';
            this.openChatMobile();
            
            // Подсвечиваем активный пункт в списке
            document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
            const activeItem = document.getElementById(`chat-item-calendar`);
            if (activeItem) activeItem.classList.add('active');

            // Подготавливаем рабочее пространство (Workspace)
            this.ensureWorkspaceExists();
            const ws = document.getElementById('pelotonWorkspace');
            const mainChat = document.getElementById('mainChatArea');
            
            if (ws && mainChat) {
                // Прячем чат, показываем календарь
                mainChat.style.display = 'none';
                ws.style.display = 'flex';
                ws.classList.add('mobile-open');
                
                // Переключаем CRM в режим календаря
                if (this.crm) {
                    this.crm.switchView('calendar');
                }
            }
            
            // Скрываем шторку чата, если она была
            const curtain = document.getElementById('curtainContainer');
            if (curtain) curtain.style.display = 'none';
        }

// 🔥 АВТО-ОТКРЫТИЕ ЧАТА БЛИЖАЙШЕЙ ГОНКИ
        // 🔥 АВТО-ОТКРЫТИЕ ЧАТА БЛИЖАЙШЕЙ ГОНКИ (С ПРИОРИТЕТОМ LIVE)
        openUpcomingRaceChat() {
            // 1. ПРИОРИТЕТ 1: Ищем гонки в статусе LIVE
            const liveRaces = this.chats.filter(c => 
                c.type === 'global' && 
                c.raceObj && 
                c.raceObj.status === 'LIVE'
            );

            let targetChat = null;

            if (liveRaces.length > 0) {
                // Если есть гонки LIVE, сортируем и берем текущую
                liveRaces.sort((a, b) => new Date(a.raceObj.date).getTime() - new Date(b.raceObj.date).getTime());
                targetChat = liveRaces[0];
            } else {
                // 2. ПРИОРИТЕТ 2: Если LIVE нет, ищем ближайшие со статусом "Registration"
                const upcomingRaces = this.chats.filter(c => 
                    c.type === 'global' && 
                    c.raceObj && 
                    c.raceObj.status === 'Registration'
                );

                if (upcomingRaces.length > 0) {
                    // Сортируем по дате, чтобы найти самую ближайшую (первую по хронологии)
                    upcomingRaces.sort((a, b) => new Date(a.raceObj.date).getTime() - new Date(b.raceObj.date).getTime());
                    targetChat = upcomingRaces[0];
                }
            }

            if (targetChat) {
                // 3. Жестко переключаем левую панель на вкладку "ГОНКИ"
                this.chatListFilter = 'races';
                this.renderChatList(document.getElementById('chatSearch')?.value || "");

                // 4. Открываем сам чат
                this.openChat(targetChat.id);
            } else {
                // Если активных регистраций и LIVE гонок нет, падаем обратно на Календарь
                this.openPelotonCalendar();
            }
        }
       async openChat(chatId) {
        try {
            // 1. УПРАВЛЕНИЕ ВИДИМОСТЬЮ (Чат / Календарь)
            const ws = document.getElementById('pelotonWorkspace');
            const mainChat = document.getElementById('mainChatArea');
            if (ws) ws.style.display = 'none';
            if (mainChat) mainChat.style.display = 'flex';
            if (this.activeChatId === chatId && window.innerWidth > 768) {
                this.syncRaceButtonsState();
                return; 
            }

            // 2. БАЗОВЫЕ НАСТРОЙКИ СЕССИИ
            const chat = this.chats.find(c => c.id === chatId); if (!chat) return;
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
            
            const emptyMsg = document.getElementById('emptyChatMsg'); if (emptyMsg) emptyMsg.style.display = 'none';
            document.getElementById('chatHeader').style.display = 'flex'; 
            
            // Мгновенный лоадер при клике
            const msgContainer = document.getElementById('messagesContainer');
            msgContainer.innerHTML = `<div style="text-align:center; padding:40px;"><span class="spinner" style="width:30px; height:30px; border-width:3px; display:inline-block;"></span></div>`; 

            // 3. ПОДГОТОВКА ДАННЫХ ДЛЯ ШАПКИ
            let chatName = this.getChatName(chat) || "Чат"; 
            const nameEl = document.getElementById('activeChatName');
            const metaEl = document.getElementById('activeChatMeta');
            const avatarContainer = document.getElementById('activeChatAvatarContainer'); 
            
            let avatarLetter = [...chatName][0].toUpperCase();
            let avatarStyle = chat.type === 'global' ? 'background:var(--danger-light); color:var(--danger); border-color:var(--danger);' : (chat.type === 'team' ? 'background:rgba(59,130,246,0.1); color:var(--info); border-color:var(--info);' : (chat.type === 'team_channel' ? 'background:rgba(255,193,7,0.1); color:var(--primary); border-color:var(--primary);' : (chat.type === 'gruppetto' ? 'background:rgba(168,85,247,0.1); color:#a855f7; border-color:#a855f7;' : ''))); 

            if (chat.type === 'radar') {
                avatarStyle = 'background:rgba(255,51,102,0.15); color:var(--danger); border-color:var(--danger);';
                avatarLetter = typeof this.getRadarSvg === 'function' ? this.getRadarSvg(24) : '📡';
            }

            if (chat.type === 'direct' && chat.expand && chat.expand.participants) {
                const otherRider = chat.expand.participants.find(p => p.id !== this.currentRider.id);
                if(otherRider) { 
                    if (otherRider.email === 'bot@sotka.one') avatarContainer.innerHTML = `<div class="avatar" style="background:var(--primary-light); color:var(--primary); border-color:var(--primary);">${this.getMotoSvg(24)}</div>`; 
                    else avatarContainer.innerHTML = this.renderAvatar(otherRider.id, '', avatarLetter); 
                } else avatarContainer.innerHTML = `<div class="avatar">${avatarLetter}</div>`;
            } else { 
                avatarContainer.innerHTML = `<div class="avatar" style="${avatarStyle}">${avatarLetter}</div>`; 
            }

            // 4. ПРАВА ДОСТУПА
            const myRole = this.getUserMaxRole(); 
            const isSuper = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['superadmin']; 
            const isAdmin = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['admin']; 
            const myTeams = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);
            const isCaptain = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['captain'] && chat.type === 'team' && myTeams.includes(chat.team_id);
            const isCreator = (chat.type === 'private' || chat.type === 'gruppetto' || chat.type === 'radar') && (chat.captain === this.currentRider.id || (chat.participants && chat.participants[0] === this.currentRider.id));
            
            let isMyPelotonChat = false; 
            const chatP = chat.peloton_id ? (Array.isArray(chat.peloton_id) ? chat.peloton_id[0] : chat.peloton_id) : null; 
            const myTeamsForChat = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);
            if (chatP) {
                if (myTeamsForChat.some(tId => {
                    const t = this.teamsMap[tId]; 
                    const pId = t && t.peloton_id ? (Array.isArray(t.peloton_id) ? t.peloton_id[0] : t.peloton_id) : null;
                    return pId === chatP;
                })) isMyPelotonChat = true;
                const pelotonObj = this.pelotonsMap[chatP]; 
                if (pelotonObj && pelotonObj.admin_id === this.userIdMap[this.currentRider.email]) isMyPelotonChat = true;
            }
            const canManageChat = isSuper || (isAdmin && isMyPelotonChat) || isCaptain || isCreator;

            // 5. ПОДСЧЕТ УЧАСТНИКОВ
            let pCount = chat.participants ? chat.participants.length : 0;
            if (chat.type === 'global' && chat.race_id) {
                try {
                    const rosterInfo = await pb.collection('race_rosters').getList(1, 1, { 
                        filter: `race_id="${chat.race_id}"`, requestKey: 'header_count_' + chat.race_id 
                    });
                    pCount = rosterInfo.totalItems;
                } catch(e) {}
            } else if (chat.type === 'team' || chat.type === 'team_channel') {
                const teamMembers = Object.values(this.ridersMap).filter(r => {
                    const rTeams = Array.isArray(r.team_id) ? r.team_id : (r.team_id ? [r.team_id] : []);
                    const cTeams = Array.isArray(chat.team_id) ? chat.team_id : (chat.team_id ? [chat.team_id] : []);
                    return cTeams.some(id => rTeams.includes(id));
                });
                pCount = teamMembers.length;
            }

            // ==========================================
            // 🔥 6. ВЕРСТКА ШАПКИ (ВАРИАНТ 2 ДЛЯ ГОНОК)
            // ==========================================
            if (chat.type === 'global' && chat.raceObj) {
                if (avatarContainer) avatarContainer.style.display = 'none';

                const r = chat.raceObj;
                const dateObj = new Date(r.date);
                const d = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).toUpperCase();
                const t = dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                
                const safeFormats = this.RACE_FORMATS || { 'mass': 'Группа', 'itt': 'Разделка', 'ttt': 'Команда', 'crit': 'По очкам', 'relay': 'Эстафета' };
                const safeSurfaces = this.RACE_SURFACES || { 'road': 'Шоссе', 'offroad': 'Грунт', 'indoor': 'Индор', 'track': 'Трек' };
                let formatName = r.format ? (safeFormats[r.format] || 'Гонка') : 'Гонка';
                let surfaceName = r.surface ? (safeSurfaces[r.surface] || '') : '';
                let typeName = surfaceName ? `${surfaceName} • ${formatName}` : formatName;
                let distStr = r.distance ? `${r.distance} км` : '';
                let subtitleStr = distStr ? `${typeName} • ${distStr}` : typeName;

                let dateCardValue = `${d}, ${t}`;
                let dateCardLabel = `ОБЩИЙ СТАРТ`;
                let dateCardColor = 'var(--info)';

                let myRegContext = this.myRosters ? this.myRosters[r.id] : null;

                if (this.currentRider && !this.isGuest && myRegContext) {
                    let bibTag = myRegContext.bib ? `№${myRegContext.bib}` : '';
                    if (myRegContext.planned_start) {
                        dateCardValue = `${myRegContext.planned_start} ${bibTag ? `(${bibTag})` : ''}`;
                        dateCardLabel = `МОЙ СТАРТ`;
                        dateCardColor = 'var(--success)';
                    } else if (myRegContext.bib) {
                        dateCardValue = `${d}, ${t} (${bibTag})`;
                    }
                }

                let actionButtonsHtml = ''; 

                if (r.status === 'Registration') {
                    let regBtnText = '⚡ ЗАЯВИТЬСЯ';
                    let regBtnStyle = 'background: var(--primary); color: #000000; border: none; box-shadow: 0 4px 15px rgba(255, 193, 7, 0.3);';

                    if (myRegContext && myRegContext.is_paid) {
                        regBtnText = '✅ УЧАСТИЕ ПОДТВЕРЖДЕНО';
                        regBtnStyle = 'background: var(--bg-surface-hover); color: var(--text-main); border: 1px solid var(--border); box-shadow: none;';
                    } else if (myRegContext) {
                        regBtnText = '💳 ОПЛАТИТЬ ВЗНОС';
                        regBtnStyle = 'background: var(--primary); color: #000000; border: none; box-shadow: 0 4px 15px rgba(255, 193, 7, 0.3);';
                    }

                    actionButtonsHtml = `
                        <button class="sync-btn-${r.id}" onclick="window.app.registerForRace('${r.id}', this, event)" style="width: 100%; ${regBtnStyle} border-radius: 8px; height: 38px; font-family: 'Unbounded'; font-weight: 800; font-size: 11px; cursor: pointer; transition: 0.2s;">
                            ${regBtnText}
                        </button>
                    `;
                } else if (r.status === 'LIVE') {
                    actionButtonsHtml = `
                        <button onclick="window.app.openLiveBoard('${r.id}', event)" style="width: 100%; justify-content: center; background: var(--text-main); color: var(--bg-body); border: none; border-radius: 8px; height: 38px; font-family: 'Unbounded'; font-weight: 800; font-size: 11px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 8px;">
                            <div style="width:6px; height:6px; background:var(--bg-body); border-radius:50%; animation: dot-pulse 1s infinite;"></div> ХОД ГОНКИ (LIVE)
                        </button>
                    `;
                } else if (r.status === 'Finished') {
                    actionButtonsHtml = `
                        <button onclick="window.app.openLiveBoard('${r.id}', event)" style="width: 100%; justify-content: center; background: var(--bg-surface-hover); color: var(--text-main); border: 1px solid var(--border); border-radius: 8px; height: 38px; font-family: 'Unbounded'; font-weight: 800; font-size: 11px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 6px;">
                            🏆 РЕЗУЛЬТАТЫ
                        </button>
                    `;
                } else if (r.status === 'Скоро') {
                    actionButtonsHtml = `
                        <button disabled style="width: 100%; justify-content: center; background: var(--bg-surface-hover); color: var(--text-muted); border: 1px dashed var(--border); border-radius: 8px; height: 38px; font-family: 'Unbounded'; font-weight: 800; font-size: 11px; display: flex; align-items: center; cursor: not-allowed;">
                            ⏳ АНОНС
                        </button>
                    `;
                }

                nameEl.style.width = '100%';
                nameEl.innerHTML = `
                    <div style="display: flex; flex-direction: column; justify-content: center; padding: 4px 0 6px 0; width: 100%;">
                        <div style="font-family: 'Unbounded'; font-size: 14px; font-weight: 800; color: var(--text-main); white-space: normal; line-height: 1.3; text-transform: uppercase;">
                            ${chatName}
                        </div>
                        <div style="font-size: 11px; color: var(--text-muted); font-family: 'Manrope'; margin-top: 4px;">
                            ${subtitleStr}
                        </div>
                    </div>
                `;

                metaEl.style.display = 'block';
                metaEl.style.width = '100%';
                
                metaEl.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 10px; width: 100%; padding-bottom: 5px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <div style="background: var(--bg-body); border-radius: 8px; padding: 6px 10px; border-left: 3px solid ${dateCardColor}; border-top: 1px solid var(--border); border-right: 1px solid var(--border); border-bottom: 1px solid var(--border);">
                                <div style="font-family: 'Unbounded'; font-size: 11px; font-weight: 800; color: var(--text-main); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${dateCardValue}</div>
                                <div style="font-size: 9px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">${dateCardLabel}</div>
                            </div>
                            <div style="background: var(--bg-body); border-radius: 8px; padding: 6px 10px; border-left: 3px solid var(--danger); border-top: 1px solid var(--border); border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='var(--bg-surface-hover)'" onmouseout="this.style.background='var(--bg-body)'" onclick="window.app.openLiveBoard('${r.id}', event)">
                                <div style="font-family: 'Unbounded'; font-size: 11px; font-weight: 800; color: var(--text-main); margin-bottom: 2px;">${pCount} ЧЕЛ.</div>
                                <div style="font-size: 9px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">В старт-листе ➝</div>
                            </div>
                        </div>
                        ${actionButtonsHtml}
                    </div>
                `;

            } else {
                if (avatarContainer) avatarContainer.style.display = 'flex'; 
                nameEl.style.width = 'auto';
                metaEl.style.width = 'auto';

                let metaLine1 = ''; 
                let metaLine2 = ''; 
                let clickableNameHtml = chatName; // 🔥 По умолчанию просто текст

                if (chat.type === 'direct') {
                    const otherRider = chat.expand?.participants?.find(p => p.id !== this.currentRider.id);
                    if (otherRider && otherRider.email === 'bot@sotka.one') {
                        metaLine1 = `<span style="color:var(--primary); font-weight:bold; font-size:10px; text-transform:uppercase;">ОФИЦИАЛЬНЫЙ ИНФОРМАТОР</span>`;
                    } else if (otherRider) {
                        metaLine1 = this.getRoleBadge(otherRider.id);
                        // 🔥 Делаем ИМЯ кликабельным ссылкой на профиль
                        clickableNameHtml = `<span onclick="window.app.openProfile('${otherRider.id}')" style="cursor:pointer; transition:0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-main)'" title="Открыть профиль">${chatName}</span>`;
                    }
                } else if (chat.type === 'team') {
                    metaLine1 = `<span style="color:var(--info); font-weight:bold; font-size:10px; text-transform:uppercase;">КОМАНДНЫЙ ЧАТ</span>`;
                } else if (chat.type === 'team_channel') {
                    const captain = this.getCaptainByTeam(chat.team_id);
                    metaLine1 = captain ? `<span style="color:var(--text-muted); font-size:10px;">Капитан: <b>${captain.first_name} ${captain.last_name}</b></span>` : `<span style="color:var(--primary); font-weight:bold; font-size:10px; text-transform:uppercase;">ПУБЛИЧНЫЙ КАНАЛ</span>`;
                } else if (chat.type === 'radar') {
                    metaLine1 = `<span class="radar-pulse-anim" style="color:var(--danger); font-weight:bold; font-size:10px; text-transform:uppercase;">🚨 СИГНАЛ РАДАРА</span>`;
                }

                let pLabel = 'участников';
                if (chat.type === 'team' || chat.type === 'team_channel') pLabel = 'в команде';
                
                if (chat.type !== 'direct') {
                    metaLine2 = `<span style="color:var(--text-muted); font-size:11px; margin-top:2px; display:inline-block; cursor:pointer; transition:0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'" onclick="window.app.openParticipantsModal()">👥 ${pCount} ${pLabel} ▾</span>`;
                } else {
                    metaLine2 = `<span style="color:var(--text-muted); font-size:11px; margin-top:2px; display:inline-block;">👥 ${pCount} ${pLabel}</span>`;
                }

                // 🔥 Вставляем наше умное кликабельное имя
                nameEl.innerHTML = clickableNameHtml;
                if (metaLine1) {
                    metaEl.innerHTML = `${metaLine1}<br>${metaLine2}`;
                } else {
                    metaEl.innerHTML = metaLine2;
                }
            }

            // 7. МЕНЮ "ТРИ ТОЧКИ"
            const headerActions = document.querySelector('.chat-header-actions');
            if (headerActions) headerActions.style.display = 'block';

            const dropMenu = document.getElementById('chatDropdownMenu');
            let dropHtml = '';
            
            dropHtml += `<button onclick="window.app.focusChatSearch()"><span style="font-size:16px;">🔍</span> Поиск по чату</button>`;
            dropHtml += `<button onclick="window.app.copyChatLink('${chatId}')"><span style="font-size:16px;">🔗</span> Копировать ссылку</button>`;
            
            if (canManageChat && chat.type !== 'direct' && chat.type !== 'team_channel') {
                dropHtml += `<button onclick="window.app.editCurrentChatName()"><span style="font-size:16px;">✏️</span> Изменить название</button>`;
            }
            if (chat.type === 'private' || chat.type === 'gruppetto' || chat.type === 'radar') {
                dropHtml += `<button style="color: #ffc107;" onclick="window.app.leaveCurrentChat()"><span style="font-size:16px;">🚪</span> Покинуть чат</button>`;
            }
            if (canManageChat && chat.type !== 'team_channel' || chat.type === 'direct') {
                dropHtml += `<button class="text-danger" style="color: #ff3366;" onclick="window.app.deleteCurrentChat()"><span style="font-size:16px;">🗑️</span> Удалить для всех</button>`;
            }
            dropMenu.innerHTML = dropHtml;

            // 8. БЛОКИРОВКА ВВОДА (ДЛЯ ГОСТЕЙ И КАНАЛОВ)
            const inputWrap = document.getElementById('inputWrapper');
            let ro = document.getElementById('readOnlyNotice');
            if (!ro) { 
                ro = document.createElement('div'); ro.id = 'readOnlyNotice'; 
                inputWrap.parentNode.insertBefore(ro, inputWrap.nextSibling); 
            }
            
            const supportAdminId = "blf8xys1c833b3p";
            const isSupportChat = chat.type === 'direct' && chat.participants.includes(supportAdminId);

            if (this.isGuest && !isSupportChat) {
                inputWrap.style.display = 'none';
                ro.style.display = 'block';
                ro.style.cssText = 'padding: 20px; text-align: center; background: var(--bg-surface); border-top: 1px solid var(--border);';
                ro.innerHTML = `
                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px; font-family:'Inter';">Вы находитесь в гостевом режиме</div>
                    <button class="btn-black" onclick="window.app.openLoginScreen();" style="background:var(--primary); color:#000; border:none; padding:10px 20px; font-family:'Unbounded'; font-size:11px; font-weight:800; border-radius:8px; cursor:pointer; box-shadow: 0 4px 15px rgba(255,193,7,0.3); transition:0.2s;">ВОЙТИ В АККАУНТ ДЛЯ ОБЩЕНИЯ</button>
                `;
            } else if (chat.type === 'team_channel') {
                ro.style.cssText = 'padding: 15px; text-align: center; color: var(--text-muted); font-size: 12px; background: var(--bg-surface); border-top: 1px solid var(--border);'; 
                ro.innerText = 'Только для чтения. Писать может только Капитан.';
                const isMyTeamCap = (myTeams.includes(chat.team_id) && this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['captain']);
                if (!isMyTeamCap && !isSuper) { inputWrap.style.display = 'none'; ro.style.display = 'block'; } 
                else { inputWrap.style.display = 'flex'; ro.style.display = 'none'; }
            } else { 
                inputWrap.style.display = 'flex'; 
                ro.style.display = 'none'; 
            }

            // 9. ВОССТАНОВЛЕНИЕ ЧЕРНОВИКА И ЗАВЕРШЕНИЕ
            const msgInput = document.getElementById('messageInput');
            if (msgInput && inputWrap.style.display !== 'none') {
                const savedDraft = this.getDraft(chatId);
                msgInput.value = savedDraft;
                msgInput.style.height = '46px';
                if (savedDraft) msgInput.style.height = Math.min(msgInput.scrollHeight, 250) + 'px';
            }

            const containerMsg = document.getElementById('messagesContainer');
            if (chat.info_text) {
                containerMsg.innerHTML = `<div class="smart-info-banner"><span class="info-icon">💡</span><div>${this.linkify(this.escapeHTML(chat.info_text))}</div></div>`;
            }

            this.renderPinnedMessage(); 
            await this.refreshCurrentChatMessages(chatId, sessionToken, true);
            await this.renderChatCurtain(chat, canManageChat);
            
            setTimeout(() => { this.syncRaceButtonsState(); }, 100);
            
        } catch (e) { console.error("Ошибка при открытии чата:", e); }
    }
	
	focusChatSearch() {
        const menu = document.getElementById('chatDropdownMenu');
        if (menu) menu.classList.remove('show');
        
        // В мобильной версии сначала нужно открыть боковую панель со списком чатов
        if (window.innerWidth <= 768) {
            this.closeChatMobile();
        }
        
        const searchInput = document.getElementById('chatSearch');
        if (searchInput) {
            searchInput.focus();
            // Подсвечиваем поле ввода, чтобы привлечь внимание
            searchInput.style.boxShadow = '0 0 0 3px rgba(255, 193, 7, 0.3)';
            setTimeout(() => { searchInput.style.boxShadow = 'none'; }, 1500);
        }
    }
	
        async requestToJoinTeam(targetTeamId, captainId) {
            await this.startDirectChat(captainId);
            const team = this.teamsMap[targetTeamId]; const teamName = team ? team.name : "вашу команду";
            const input = document.getElementById('messageInput');
            input.value = `Привет! Хочу перейти в ${teamName}. Одобришь трансфер? \n\n[ACTION:TRANSFER:${this.currentRider.id}:${targetTeamId}:REQUEST]`;
            input.style.height = '90px';
            input.focus();
        }
		async inviteToTeam(riderId) {
            const targetRider = this.ridersMap[riderId];
            if (!targetRider) return;
            
            // 🔥 Ищем команду, от лица которой капитан шлет инвайт
            let targetTeamId = null;
            if (this.crm && this.crm.viewedTeamId) {
                targetTeamId = this.crm.viewedTeamId;
            } else {
                const myTeams = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);
                targetTeamId = myTeams.find(id => this.teamsMap[id]?.peloton_id === this.currentPelotonFilter) || myTeams[0];
            }

            const myTeam = this.teamsMap[targetTeamId];
            const teamName = myTeam ? myTeam.name : "нашу команду";
            
            await this.startDirectChat(riderId);
            const input = document.getElementById('messageInput');
            input.value = `Привет! Приглашаю тебя вступить в ${teamName}. Согласен? \n\n[ACTION:TRANSFER:${riderId}:${targetTeamId}:INVITE]`;
            input.style.height = '90px'; input.focus();
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
                    
                    const myRole = this.getUserMaxRole(); const isSuper = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['superadmin']; const isAdmin = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['admin']; 
                    // 🔥 ФИКС: Массивы
                    const myTeams = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);
                    const isCaptain = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['captain'] && (chat.type === 'team' || chat.type === 'team_channel') && myTeams.includes(chat.team_id); 
                    const isCreator = chat.type === 'private' && chat.participants && chat.participants[0] === this.currentRider.id;
                    let isMyP = false; 
                    const chatP = chat.peloton_id ? (Array.isArray(chat.peloton_id) ? chat.peloton_id[0] : chat.peloton_id) : null; 
                    const myTeamsForPin = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);
                    if (chatP && myTeamsForPin.some(tId => {
                        const t = this.teamsMap[tId]; 
                        const pId = t && t.peloton_id ? (Array.isArray(t.peloton_id) ? t.peloton_id[0] : t.peloton_id) : null;
                        return pId === chatP;
                    })) isMyP = true;
                    
                    unpinBtn.style.display = (isSuper || (isAdmin && isMyP) || isCaptain || isCreator) ? 'block' : 'none';
                    bar.onclick = (e) => { if (e.target.id === 'unpinBtn' || e.target.tagName.toLowerCase() === 'button') return; const el = document.getElementById(`msg-${msg.id}`); if(el) { el.scrollIntoView({behavior: 'smooth', block: 'center'}); el.style.backgroundColor = 'var(--primary-light)'; setTimeout(() => el.style.backgroundColor = 'transparent', 1500); } else { this.scrollToBottom(); alert("Сообщение слишком старое, проскролльте вверх."); } };
                } catch(e) { bar.style.display = 'none'; }
            } else { bar.style.display = 'none'; }
        }

        async unpinMessage(event) { event.stopPropagation(); if (!confirm("Открепить сообщение?")) return; await pb.collection('chats').update(this.activeChatId, { pinned_message: null }, { requestKey: null }); this.renderPinnedMessage(); }
        async pinMessage(msgId) { await pb.collection('chats').update(this.activeChatId, { pinned_message: msgId }, { requestKey: null }); this.renderPinnedMessage(); }
        async editCurrentChatName() { if (!this.activeChatId) return; const chat = this.chats.find(c => c.id === this.activeChatId); if (!chat) return; const newName = prompt("Новое название чата:", chat.name); if (newName && newName.trim() !== "" && newName !== chat.name) { try { await pb.collection('chats').update(chat.id, { name: newName.trim() }, { requestKey: null }); document.getElementById('activeChatName').innerText = newName.trim(); this.loadChats(); } catch(e) { alert("Ошибка сохранения"); } } }
        async kickRider(riderId, event) { event.stopPropagation(); if(!confirm("Исключить гонщика из чата?")) return; const chat = this.chats.find(c => c.id === this.activeChatId); const newParts = chat.participants.filter(id => id !== riderId); try { await pb.collection('chats').update(this.activeChatId, { participants: newParts }, { requestKey: null }); this.openParticipantsModal(); this.loadChats(); } catch(e) { alert("Ошибка исключения"); } }

        async openParticipantsModal() {
            const chat = this.chats.find(c => c.id === this.activeChatId); 
            if (!chat) return;

            const list = document.getElementById('participantsList'); 
            list.innerHTML = `<div style="text-align:center; padding:20px;"><span class="spinner"></span></div>`; 
            document.getElementById('participantsModal').style.display = 'flex';

            const myRole = this.getUserMaxRole(); 
            const myTeams = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);
            
            // Проверка прав на управление (удаление участников)
            const canManageChat = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['admin'] || 
                                ((chat.type === 'team' || chat.type === 'team_channel') && this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['captain'] && myTeams.includes(chat.team_id)) || 
                                ((chat.type === 'private' || chat.type === 'gruppetto') && chat.participants[0] === this.currentRider.id);

            let participantsToShow = [];

            try {
                // 1. ЛОГИКА ДЛЯ ГОНОК (берём из ростера)
                if (chat.type === 'global' && chat.race_id) {
                    const rosters = await pb.collection('race_rosters').getFullList({ 
                        filter: `race_id="${chat.race_id}"`, 
                        expand: 'rider_id',
                        requestKey: 'modal_roster_' + chat.race_id
                    });
                    participantsToShow = rosters.map(r => r.expand?.rider_id).filter(Boolean);
                } 
                // 2. ЛОГИКА ДЛЯ КОМАНД (фильтруем всех гонщиков по ID команды)
                else if (chat.type === 'team' || chat.type === 'team_channel') {
                    const cTeamId = Array.isArray(chat.team_id) ? chat.team_id[0] : chat.team_id;
                    participantsToShow = Object.values(this.ridersMap).filter(r => {
                        const rTeams = Array.isArray(r.team_id) ? r.team_id : (r.team_id ? [r.team_id] : []);
                        return rTeams.includes(cTeamId);
                    });
                } 
                // 3. ЛОГИКА ДЛЯ ПРИВАТОВ/РАДАРОВ (оставляем как было - по списку ID)
                else {
                    participantsToShow = (chat.participants || []).map(id => this.ridersMap[id]).filter(Boolean);
                }

                // Сортировка: сначала Капитаны, потом остальные по фамилии
                participantsToShow.sort((a, b) => {
                    const isCapA = a.roles?.includes('captain') ? 0 : 1;
                    const isCapB = b.roles?.includes('captain') ? 0 : 1;
                    if (isCapA !== isCapB) return isCapA - isCapB;
                    return (a.last_name || "").localeCompare(b.last_name || "");
                });

                // РЕНДЕРИНГ СПИСКА
                list.innerHTML = '';
                if (participantsToShow.length === 0) {
                    list.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px;">Список пуст</div>`;
                }

                participantsToShow.forEach((r) => {
                    if (r.email === 'bot@sotka.one') return; // Не показываем бота

                    const isCap = r.roles && r.roles.includes('captain');
                    const capBadge = isCap ? `<span style="background: rgba(255, 193, 7, 0.2); color: var(--primary); padding: 2px 6px; border-radius: 4px; font-size: 8px; font-family: 'Unbounded'; font-weight: 800; margin-left:5px;">КАПИТАН</span>` : '';
                    
                    let kickBtn = ''; 
                    if (canManageChat && r.id !== this.currentRider.id && (chat.type === 'private' || chat.type === 'gruppetto')) {
                        kickBtn = `<button onclick="window.app.kickRider('${r.id}', event);" style="background:rgba(255,51,102,0.1); border:1px solid rgba(255,51,102,0.3); color:var(--danger); padding:5px 8px; border-radius:8px; cursor:pointer;">✕</button>`;
                    }

                    const el = document.createElement('div'); 
                    el.className = 'contact-item';
                    el.style.cursor = 'default';
                    
                    const avatarInitials = (r.first_name ? r.first_name.charAt(0) : '?');

                    el.innerHTML = `
                        <div style="display:flex; align-items:center; gap:12px; flex:1;">
                            ${this.renderAvatar(r.id, 'width:36px; height:36px; font-size:14px;', avatarInitials)}
                            <div style="min-width:0; flex:1;">
                                <div style="font-weight:600; font-size:14px; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                    ${r.first_name} ${r.last_name} ${capBadge}
                                </div>
                                <div style="font-size:11px; color:var(--text-muted); display:flex; gap:8px; align-items:center;">
                                    <span>${this.getRiderTeamName(r)}</span> ${this.getRoleBadge(r.id)}
                                </div>
                            </div>
                        </div>
                        <div style="display:flex; gap:10px; align-items:center;">
                            ${kickBtn}
                        </div>
                    `;
                    list.appendChild(el);
                });

                // Показываем кнопку "Добавить участников" только для приватных групп
                document.getElementById('addMembersToPrivateBtn').style.display = ((chat.type === 'private' || chat.type === 'gruppetto') && canManageChat) ? 'block' : 'none';

            } catch (err) {
                console.error("Ошибка загрузки участников:", err);
                list.innerHTML = `<div style="text-align:center; color:var(--danger); padding:20px;">Ошибка загрузки данных</div>`;
            }
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
                    <span style="font-size:10px; color:var(--text-muted);">${this.escapeHTML(this.getRiderTeamName(r))}</span>
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
            // 🔥 Запрещаем фоновое обновление чатов, если открыт Драфт, Календарь или Лента
            if (!this.activeChatId || this.activeChatId === 'draft' || this.activeChatId === 'calendar' || this.activeChatId === 'newsfeed') return; 
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

                const myTeams = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);
                const canDel = isSuper || (isAdmin && isMyP); 
                const canManage = canDel || (this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['captain'] && (chat?.type === 'team' || chat?.type === 'team_channel') && myTeams.includes(chat?.team_id)) || (chat?.type === 'private' && chat?.participants[0] === this.currentRider.id);
                const isAnnounce = msg.is_announcement === true;

                document.getElementById('ctxBtnPin').style.display = canManage ? 'flex' : 'none'; document.getElementById('ctxBtnEdit').style.display = (isMine && !isAnnounce) ? 'flex' : 'none'; document.getElementById('ctxBtnDelete').style.display = ((isMine && !isAnnounce) || (canManage && (!isAnnounce || isSuper))) ? 'flex' : 'none'; document.getElementById('ctxMenuOverlay').style.display = 'flex';
            } catch(e) {}
        }

        closeContextMenu(e) { 
            if(e) e.stopPropagation(); 
            document.getElementById('ctxMenuOverlay').style.display = 'none'; 
            this.contextMessageObj = null; 
            
            // 🔥 Прячем пикер реакций
            const ctxEmojiContainer = document.getElementById('ctxEmojiPickerContainer');
            if (ctxEmojiContainer) ctxEmojiContainer.style.display = 'none';
        }

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
 // 🔥 НОВАЯ ФУНКЦИЯ: КОПИРОВАНИЕ ТЕКСТА
        ctxActionCopy() { 
            if(!this.contextMessageObj) return; 
            const msgText = this.contextMessageObj.text || ''; 
            this.closeContextMenu(); 
            
            if (msgText) {
                this.copyText(msgText, "Текст скопирован в буфер обмена!");
            } else {
                alert("В этом сообщении нет текста для копирования");
            }
        }
		
		// 🔥 НОВАЯ ФУНКЦИЯ: НАТИВНЫЙ ШЕРИНГ ПОСТА С КАРТИНКОЙ И FALLBACK
        async ctxActionShare() { 
            if(!this.contextMessageObj) return; 
            const msg = this.contextMessageObj; 
            this.closeContextMenu(); 
            
            let shareText = msg.text || "📎 Вложение";
            let shareTitle = "VILKA RADIO";
            let shareUrl = `${window.location.origin}${window.location.pathname}?chat=${this.activeChatId}`;

            // 🧠 ПАРСИНГ: Ищем внутри текста скрытые экшены (гонки)
            const regMatch = shareText.match(/\[ACTION:REGISTER:([a-zA-Z0-9_]+)\]/);
            if (regMatch) {
                const raceId = regMatch[1];
                shareText = shareText.replace(regMatch[0], '').trim();
                shareTitle = "Открыта регистрация!";
                shareUrl = `${window.location.origin}${window.location.pathname}?action=register&race_id=${raceId}`;
                shareText += `\n\n⚡️ Подать заявку в один клик:`;
            }

            const liveMatch = shareText.match(/\[ACTION:LIVE:([a-zA-Z0-9_]+)\]/);
            if (liveMatch) {
                shareText = shareText.replace(liveMatch[0], '').trim();
                shareTitle = "🔴 Трансляция гонки";
            }

            // 🖼 МАГИЯ ФАЙЛОВ: Ищем картинку в сообщении
            let filesArray = [];
            let fileName = Array.isArray(msg.file) ? msg.file[0] : msg.file;
            
            if (fileName && typeof fileName === 'string' && fileName.trim() !== '') {
                const isImage = fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                if (isImage) {
                    try {
                        const fileUrl = `${pb.baseUrl}/api/files/${msg.collectionId}/${msg.id}/${fileName}`;
                        // Скачиваем картинку
                        const response = await fetch(fileUrl);
                        const blob = await response.blob();
                        // Создаем объект File, который понимает navigator.share
                        const file = new File([blob], fileName, { type: blob.type });
                        filesArray.push(file);
                    } catch (e) {
                        console.error("Не удалось подготовить картинку для шаринга:", e);
                    }
                }
            }

            // 🌐 ВЫЗОВ НАТИВНОГО МЕНЮ ИЛИ FALLBACK
            const shareData = {
                title: shareTitle,
                text: shareText,
                url: shareUrl
            };

            // Если есть картинка и браузер поддерживает шаринг файлов
            if (filesArray.length > 0 && navigator.canShare && navigator.canShare({ files: filesArray })) {
                shareData.files = filesArray;
            }

            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                } catch (err) { 
                    console.log("Шеринг отменен или произошла ошибка:", err); 
                    // Если пользователь просто отменил, ничего не делаем.
                    // Если произошла реальная ошибка, можно вызвать Fallback.
                    if (err.name !== "AbortError") {
                         this.executeShareFallback(shareText, shareUrl);
                    }
                }
            } else {
                // 🛡️ FALLBACK ДЛЯ ПК (если navigator.share вообще нет)
                this.executeShareFallback(shareText, shareUrl);
            }
        }
		
		// 🔥 НОВАЯ ФУНКЦИЯ: БЫСТРЫЙ ШЕРИНГ ПРЯМО ИЗ ЛЕНТЫ НОВОСТЕЙ
        async sharePostDirectly(msgId) {
            try {
                // Скачиваем актуальные данные поста из базы
                const msg = await pb.collection('messages').getOne(msgId, { requestKey: null });
                // Присваиваем его в контекст приложения (эмулируем открытие меню)
                this.contextMessageObj = msg;
                // Вызываем нашу мощную функцию шеринга с картинками и ссылками
                this.ctxActionShare();
            } catch(e) {
                console.error("Ошибка подготовки шеринга:", e);
                alert("Не удалось загрузить данные для отправки.");
            }
        }

        // Вспомогательный метод для резервного копирования
        executeShareFallback(text, url) {
            const fallbackText = `${text}\n\n🔗 ${url}`;
            this.copyText(fallbackText, "Ваш браузер не поддерживает прямое окно 'Поделиться'.\n\nТекст поста и ссылка скопированы в буфер обмена! Вы можете вставить их в любой мессенджер.");
        }
		
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
            // 🔥 ЗАЩИТА ОТ ДВОЙНЫХ КЛИКОВ
            if (this.isForwardingDirectChat) return;
            this.isForwardingDirectChat = true;

            try {
                let chat = this.chats.find(c => {
                    if (c.type !== 'direct') return false;
                    const p = c.participants || [];
                    if (this.currentRider.id === userId) return p.length === 1 && p.includes(this.currentRider.id);
                    return p.length === 2 && p.includes(this.currentRider.id) && p.includes(userId);
                });
                
                if (!chat) { 
                    try {
                        // Строгая проверка в БД перед созданием
                        const dbChats = await pb.collection('chats').getFullList({
                            filter: `type="direct" && participants~"${this.currentRider.id}" && participants~"${userId}"`,
                            requestKey: null
                        });
                        
                        chat = dbChats.find(c => {
                            const p = c.participants || [];
                            if (this.currentRider.id === userId) return p.length === 1 && p[0] === this.currentRider.id;
                            return p.length === 2 && p.includes(this.currentRider.id) && p.includes(userId);
                        });
                        
                        if (!chat) {
                            const newParts = this.currentRider.id === userId ? [this.currentRider.id] : [this.currentRider.id, userId];
                            chat = await pb.collection('chats').create({ type: 'direct', name: 'Direct', participants: newParts }, { requestKey: null }); 
                        }
                        
                        if (chat && !this.chats.find(c => c.id === chat.id)) {
                            this.chats.push(chat);
                        }
                        await this.loadChats(); 
                    } catch(e) { console.error(e); }
                }
                
                if (chat) this.forwardToChat(chat.id);
            } finally {
                this.isForwardingDirectChat = false;
            }
        }

        scrollToBottom(smooth = false) {
        const container = document.getElementById('messagesContainer');
        if (!container) return;

        // 🔥 ФИКС: Проверяем, где мы находимся (Лента Новостей или Публичный Канал)
        const activeChat = this.chats.find(c => c.id === this.activeChatId);
        const isFeedOrChannel = this.activeChatId === 'newsfeed' || (activeChat && activeChat.type === 'team_channel');

        if (isFeedOrChannel && container.lastElementChild) {
            // ДЛЯ НОВОСТЕЙ: Скроллим так, чтобы верхний край последнего поста прилип к верху экрана
            container.lastElementChild.scrollIntoView({ 
                behavior: smooth ? 'smooth' : 'auto', 
                block: 'start' 
            });
        } else {
            // ДЛЯ ЛИЧНЫХ ЧАТОВ: Классический скролл в самый низ (к полю ввода)
            container.scrollTo({
                top: container.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto'
            });
        }
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
                
                // 1. Сохраняем сообщение в базу
                await pb.collection('messages').create(formData, { requestKey: null }); 
                
                // 🔥 УМНАЯ СИНХРОНИЗАЦИЯ ПЕЛОТОНА (SELF-HEALING)
                let chatUpdatePayload = { updated: new Date().toISOString() };
                const currentChatForSync = this.chats.find(c => c.id === this.activeChatId);
                
                if (currentChatForSync && (currentChatForSync.type === 'team_channel' || currentChatForSync.type === 'team') && currentChatForSync.team_id) {
                    const tId = Array.isArray(currentChatForSync.team_id) ? currentChatForSync.team_id[0] : currentChatForSync.team_id;
                    const actualTeam = this.teamsMap[tId];
                    
                    if (actualTeam) {
                        // 🔥 Заменили "" на null, чтобы PocketBase не ругался на пустые связи
                        let teamPeloton = actualTeam.peloton_id ? (Array.isArray(actualTeam.peloton_id) ? actualTeam.peloton_id[0] : actualTeam.peloton_id) : null;
                        let chatPeloton = currentChatForSync.peloton_id ? (Array.isArray(currentChatForSync.peloton_id) ? currentChatForSync.peloton_id[0] : currentChatForSync.peloton_id) : null;
                        
                        // Если пелотон команды не совпадает с пелотоном канала — чиним!
                        if (teamPeloton !== chatPeloton) {
                            chatUpdatePayload.peloton_id = teamPeloton;
                            currentChatForSync.peloton_id = teamPeloton; // Локальное обновление для скорости
                            console.log("🔄 Канал синхронизирован: привязан к пелотону", teamPeloton);
                        }
                    }
                }

                // 2. Обновляем время чата (и заодно исправляем пелотон, если он "отвалился")
                await pb.collection('chats').update(this.activeChatId, chatUpdatePayload, { requestKey: null });

                // 🔥 НОВОЕ: ОТПРАВЛЯЕМ PUSH-УВЕДОМЛЕНИЕ ДЛЯ ЛИЧНЫХ СООБЩЕНИЙ
                const currentChat = this.chats.find(c => c.id === this.activeChatId);
                if (currentChat && currentChat.type === 'direct') {
                    const otherRiderId = currentChat.participants.find(id => id !== this.currentRider.id);
                    if (otherRiderId) {
                        const pushTitle = `${this.currentRider.first_name} ${this.currentRider.last_name}`;
                        const pushText = text ? text : '📎 Отправил(а) вложение';
                        const pushUrl = `https://vilka.sotka.one/?chat=${this.activeChatId}`;
                        
                        this.sendPushNotification(pushTitle, pushText, [otherRiderId], pushUrl);
                    }
                }

                // 3. Очищаем интерфейс
                input.value = ''; input.style.height = '46px'; this.clearDraft(this.activeChatId); this.removeFile(); this.cancelReplyEdit(); input.focus();
            } catch(e) { alert("Ошибка отправки."); } finally { await minAnim; btnIcon.style.pointerEvents = 'auto'; if (vIcon) vIcon.classList.remove('v-fly'); if(compressingText) compressingText.style.display = 'none'; }
        }

        async initiateTransfer(riderId, oldTeamId) {
            const targetRider = this.ridersMap[riderId];
            if (!targetRider) return;
            const oldCap = this.getCaptainByTeam(oldTeamId);
            if (!oldCap) return alert("У текущей команды гонщика нет Капитана. Обратитесь к организаторам.");
            
            // 🔥 Ищем команду, от лица которой капитан делает запрос
            let myTargetTeam = null;
            if (this.crm && this.crm.viewedTeamId) {
                myTargetTeam = this.crm.viewedTeamId;
            } else {
                const myTeams = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);
                myTargetTeam = myTeams.find(id => this.teamsMap[id]?.peloton_id === this.currentPelotonFilter) || myTeams[0];
            }
            
            const myTeamName = this.teamsMap[myTargetTeam]?.name || 'нашу команду';
            await this.startDirectChat(oldCap.id);
            const input = document.getElementById('messageInput');
            input.value = `Привет! Мы хотим перевести в ${myTeamName} гонщика ${targetRider.first_name} ${targetRider.last_name}. Отпустишь? \n\n[ACTION:TRANSFER:${riderId}:${myTargetTeam}:RELEASE]`;
            input.style.height = '90px'; input.focus();
            this.closeProfileModal();
        }

        async approveTransfer(riderId, newTeamId, msgId, btn, event) {
            event.stopPropagation();
            const rider = this.ridersMap[riderId];
            if (!rider) return alert("Гонщик не найден");
            
            const myRoleWeight = Math.max(...(this.usersMap[this.currentRider.email] || []).map(r => this.ROLE_WEIGHTS[r] || 20), 20);
            const isSuper = myRoleWeight >= this.ROLE_WEIGHTS['superadmin'];
            const isAdmin = myRoleWeight >= this.ROLE_WEIGHTS['admin'];
            
            const oneTeamObj = Object.values(this.teamsMap).find(t => t.name && t.name.toUpperCase().includes('ONE TEAM'));
            const oneTeamId = oneTeamObj ? oneTeamObj.id : null;

            const myTeams = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);
            const rTeams = Array.isArray(rider.team_id) ? rider.team_id : (rider.team_id ? [rider.team_id] : []);

            const isReleasingCaptain = myRoleWeight >= this.ROLE_WEIGHTS['captain'] && myTeams.some(id => rTeams.includes(id));
            const isAcceptingCaptain = myRoleWeight >= this.ROLE_WEIGHTS['captain'] && myTeams.includes(newTeamId) && (rTeams.includes(oneTeamId) || rTeams.length === 0);
            const isSelfAcceptingInvite = this.currentRider.id === rider.id && (rTeams.includes(oneTeamId) || rTeams.length === 0);
            
            // 🔥 УМНАЯ ЛОГИКА: Гонщик может принять инвайт сам, если у него ЕЩЕ НЕТ команды в этом пелотоне
            const newTeamPeloton = this.teamsMap[newTeamId] ? (Array.isArray(this.teamsMap[newTeamId].peloton_id) ? this.teamsMap[newTeamId].peloton_id[0] : this.teamsMap[newTeamId].peloton_id) : null;
            let hasTeamInNewPeloton = false;
            if (newTeamPeloton) {
                hasTeamInNewPeloton = rTeams.some(tId => {
                    let pId = this.teamsMap[tId] ? (Array.isArray(this.teamsMap[tId].peloton_id) ? this.teamsMap[tId].peloton_id[0] : this.teamsMap[tId].peloton_id) : null;
                    return pId === newTeamPeloton;
                });
            }
            const isSelfAcceptingNewPeloton = this.currentRider.id === rider.id && !hasTeamInNewPeloton;

            if (!isSuper && !isAdmin && !isReleasingCaptain && !isAcceptingCaptain && !isSelfAcceptingInvite && !isSelfAcceptingNewPeloton) {
                return alert("У вас нет прав на этот трансфер!\n\nОтпустить гонщика может только его текущий капитан. Принять приглашение в новую лигу можно самостоятельно.");
            }
            
            if (confirm(`Подтверждаете трансфер: ${rider.first_name} ${rider.last_name} ➔ ${this.teamsMap[newTeamId]?.name || 'новую команду'}?`)) {
                btn.innerText = "ОБРАБОТКА..."; btn.style.pointerEvents = "none"; btn.style.opacity = "0.7";
                
                try {
                    let updatedTeams = [...rTeams];
                    
                    // Убираем старую команду из ТОГО ЖЕ пелотона, куда вступает гонщик
                    if (newTeamPeloton) {
                        updatedTeams = updatedTeams.filter(tId => {
                            let pId = this.teamsMap[tId] ? (Array.isArray(this.teamsMap[tId].peloton_id) ? this.teamsMap[tId].peloton_id[0] : this.teamsMap[tId].peloton_id) : null;
                            return pId !== newTeamPeloton;
                        });
                    }
                    
                    // Убираем ONE TEAM, если вступаем в реальный клуб
                    if (newTeamId !== oneTeamId) updatedTeams = updatedTeams.filter(tId => tId !== oneTeamId);
                    
                    // Добавляем новую команду
                    if (!updatedTeams.includes(newTeamId)) updatedTeams.push(newTeamId);

                    let updatePayload = { team_id: updatedTeams, transfer_request: "" };
                    if (rider.base_cluster === 'O') updatePayload.base_cluster = 'C';

                    // Сохраняем МАССИВ в PocketBase
                    await pb.collection('riders').update(riderId, updatePayload, { requestKey: null });
                    await this.updateOnlineStatus(); 
                    this.softRefreshMessages(); 
                    
                    btn.innerText = "✅ ОДОБРЕНО"; btn.style.background = "var(--success)";
                } catch (e) {
                    alert("Ошибка при сохранении трансфера");
                    btn.innerText = "ОДОБРИТЬ ТРАНСФЕР"; btn.style.background = "var(--warning)";
                } finally {
                    btn.style.pointerEvents = "auto"; btn.style.opacity = "1";
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
                    // Возвращаемся в чат ближайшей гонки
                    if (typeof this.openUpcomingRaceChat === 'function') {
                        this.openUpcomingRaceChat();
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

                    const myTeams = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);
                    const isCaptain = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['captain'] && chat.type === 'team' && myTeams.includes(chat.team_id);
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
                    // Возвращаемся в чат ближайшей гонки
                    if (typeof this.openUpcomingRaceChat === 'function') {
                        this.openUpcomingRaceChat();
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
            const catCode = rider.base_cluster || 'B'; 
            let roles = []; if (rider.email && rider.email.trim() !== '') { roles = this.usersMap[rider.email] || []; }
            const rStr = JSON.stringify(roles);
            
            // 🔥 МУЛЬТИ-КОМАНДЫ: Получаем массивы команд
            const myTeams = Array.isArray(this.currentRider?.team_id) ? this.currentRider.team_id : (this.currentRider?.team_id ? [this.currentRider.team_id] : []);
            const riderTeams = Array.isArray(rider.team_id) ? rider.team_id : (rider.team_id ? [rider.team_id] : []);
            
            // 🔥 МУЛЬТИ-КОМАНДЫ: Генерируем бейджики
            let teamsHtml = '<span class="dash-team-badge">Без команды</span>';
            if (riderTeams.length > 0) {
                teamsHtml = riderTeams.map(id => {
                    const tObj = this.teamsMap[id];
                    return tObj ? `<span class="dash-team-badge" style="margin-bottom:4px; display:inline-block; margin-right:4px;">${this.getTeamLinkHtml(id, tObj.name, 'currentColor')}</span>` : '';
                }).join('');
            }
            
            let actionButtons = '';
            if (rider.id !== this.currentRider?.id) {
                actionButtons += `<button onclick="window.app.closeProfileModal(); window.app.startDirectChat('${rider.id}')" style="width:100%; background:var(--primary); color:#000; border:none; padding:12px; border-radius:8px; font-family:'Unbounded'; font-size:11px; font-weight:800; cursor:pointer; transition:0.2s; box-shadow: 0 4px 15px rgba(255,193,7,0.3);">💬 НАПИСАТЬ СООБЩЕНИЕ</button>`;
            }
            const myRoleWeight = Math.max(...(this.usersMap[this.currentRider?.email] || []).map(r => this.ROLE_WEIGHTS[r] || 20), 20);
            
            // Кнопка Редактирования (Для Админов, Капитанов и самого гонщика)
            const isSuperOrAdmin = myRoleWeight >= this.ROLE_WEIGHTS['admin'];
            const isMyCaptain = myRoleWeight >= this.ROLE_WEIGHTS['captain'] && myTeams.some(id => riderTeams.includes(id));
            
            if (isSuperOrAdmin || isMyCaptain || rider.id === this.currentRider?.id) {
                actionButtons += `<button onclick="window.app.editProfileInModal('${rider.id}')" style="width:100%; background:var(--bg-surface-hover); border: 1px dashed var(--text-muted); color:var(--text-main); padding:10px; border-radius:8px; font-family:'Unbounded'; font-size:11px; font-weight:800; cursor:pointer; transition:0.2s;" onmouseover="this.style.borderColor='var(--primary)'; this.style.color='var(--primary)';" onmouseout="this.style.borderColor='var(--text-muted)'; this.style.color='var(--text-main)';">✏️ РЕДАКТИРОВАТЬ ПРОФИЛЬ</button>`;
            }

            if (myRoleWeight >= this.ROLE_WEIGHTS['captain'] && myTeams.length > 0 && !myTeams.some(id => riderTeams.includes(id)) && rider.id !== this.currentRider?.id) {
                // Запрос трансфера (пока используем первую команду капитана)
                actionButtons += `<button onclick="window.app.initiateTransfer('${rider.id}', '${myTeams[0]}')" style="width:100%; background:rgba(255, 193, 7, 0.1); border: 1px dashed var(--warning); color:var(--warning); padding:10px; border-radius:8px; font-family:'Unbounded'; font-size:11px; font-weight:800; cursor:pointer; transition:0.2s;">🔄 ЗАПРОСИТЬ ТРАНСФЕР</button>`;
            }
            actionButtons += `<button onclick="window.app.copyUserLink('${rider.id}')" style="width:100%; background:var(--bg-surface-hover); border: 1px solid var(--border); color:var(--text-main); padding:10px; border-radius:8px; font-family:'Unbounded'; font-size:11px; font-weight:800; cursor:pointer; transition:0.2s;">🔗 ПОДЕЛИТЬСЯ ПРОФИЛЕМ</button>`;

            // ДОСТАЕМ НОВЫЕ ДАННЫЕ (OFFROAD)
            const rRoad = rider.rating_road || 0; const cRoad = rider.cluster_road || 'O';
            const rTrack = rider.rating_track || 0; const cTrack = rider.cluster_track || 'O';
            const rOffroad = rider.rating_offroad || 0; const cOffroad = rider.cluster_offroad || 'O';
            const rIndoor = rider.rating_indoor || 0; const cIndoor = rider.cluster_indoor || 'O';
            
            // 🔥 ГЕНЕРИРУЕМ АВАТАР (Аккуратный, внутри карточки)
            const fChar = rider.first_name ? rider.first_name.charAt(0).toUpperCase() : '';
            const lChar = rider.last_name ? rider.last_name.charAt(0).toUpperCase() : '';
            let profileAvatarHtml = this.renderAvatar(rider.id, 'width: 60px; height: 60px; font-size: 20px; background: var(--primary); color: #000; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.1);', fChar + lChar);
            
            // Если это мой профиль - разрешаем менять фото по клику
            if (rider.id === this.currentRider?.id) {
                profileAvatarHtml = `<div onclick="window.app.triggerAvatarUpload()" style="cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px; transition:0.2s; position:relative; z-index:20;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" title="Изменить фото">
                    <div style="pointer-events: none;">${profileAvatarHtml}</div>
                    <span style="background:var(--bg-surface-hover); color:var(--text-main); border:1px solid var(--border); padding:2px 6px; border-radius:4px; font-size:8px; font-family:'Unbounded'; font-weight:800; margin-top:-10px; z-index:21;">📸 ИЗМЕН.</span>
                </div>`;
            }

            // 🔥 ЧИСТИМ КОМАНДУ (Открываем ссылку в новой вкладке/окне)
            let cleanTeamsHtml = 'БЕЗ КОМАНДЫ';
            if (typeof riderTeams !== 'undefined' && riderTeams.length > 0) {
                cleanTeamsHtml = riderTeams.map(id => {
                    const tObj = this.teamsMap[id];
                    // Добавили target="_blank" и убрали локальный onclick
                    return tObj ? `<a href="?public_team=${id}" target="_blank" style="color: var(--text-main); font-weight: 700; text-decoration: none; transition: 0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-main)'" title="Открыть профиль команды">${this.escapeHTML(tObj.name)}</a>` : '';
                }).filter(Boolean).join(', ');
            }

            // 🔥 КАРТОЧКА ЛИЦЕНЗИИ: Идеальный минимализм и косая полоса фоном
            let html = `
                <div class="dash-license-card" style="margin-bottom: 25px; padding: 20px; min-height: 110px; box-sizing: border-box; position: relative; border-radius: 12px; overflow: hidden; background: linear-gradient(105deg, var(--bg-surface) 75%, var(--bg-surface-hover) 75.2%); border: 1px solid var(--border); box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    
                    <div class="dash-rider-info" style="padding-right: 70px; position: relative; z-index: 2; text-align: left;">
                        <div class="dash-rider-name" style="font-size: 16px; margin-bottom: 8px; line-height: 1.2; word-wrap: break-word; font-weight: 800; color: var(--text-main);">
                            ${rider.first_name} ${rider.last_name}
                        </div>
                        
                        <div class="dash-rider-meta" style="display: flex; flex-direction: column; align-items: flex-start; gap: 8px; font-size: 10px; color: var(--text-muted); font-family: 'Unbounded'; text-transform: uppercase;">
                            
                            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px; line-height: 1;">
                                <span>${cleanTeamsHtml}</span>
                                <span style="width: 3px; height: 3px; background: var(--border); border-radius: 50%;"></span>
                                <span>${rider.yob}</span>
                                <span style="width: 3px; height: 3px; background: var(--border); border-radius: 50%;"></span>
                                <span>${(rider.gender || 'M').toUpperCase()}</span>
                            </div>
                            
                            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 2px;">
                                ${this.getRoleBadge(rider.id)}
                            </div>
                            
                        </div>
                    </div>
                    
                    <div style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); z-index: 10;">
                        ${profileAvatarHtml}
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 25px;">
                    ${actionButtons}
                </div>



                <div>
                    <h3 class="dash-section-title"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg> СПЕЦИАЛИЗАЦИЯ</h3>
                    
                    <div style="display:flex; flex-wrap:wrap; gap:15px; margin-bottom:20px;">
                        <div style="flex:1; min-width:240px; background:var(--bg-surface); padding:15px; border-radius:15px; border:1px solid var(--border);">
                            <div class="dash-chart-container" style="position: relative; height: 250px; width: 100%;">
                                <canvas id="radar-${rider.id}-${suffix}"></canvas>
                            </div>
                        </div>
                        
                        <div style="flex:1; min-width:240px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                            <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:15px; display:flex; flex-direction:column; justify-content:space-between;">
                                <div style="font-size:10px; color:var(--text-muted); font-family:'Unbounded'; font-weight:800; margin-bottom:5px;">ШОССЕ</div>
                                <div><span style="font-size:20px; font-weight:800; color:var(--text-main); font-family:'Roboto Mono';">${rRoad}</span><span style="font-size:10px; color:var(--text-muted);"> pts</span></div>
                                <div style="margin-top:5px;"><span style="background:rgba(255,193,7,0.1); color:var(--primary); font-size:11px; font-weight:800; padding:2px 8px; border-radius:6px; border:1px solid var(--primary);">Кластер ${cRoad}</span></div>
                            </div>
                            <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:15px; display:flex; flex-direction:column; justify-content:space-between;">
                                <div style="font-size:10px; color:var(--text-muted); font-family:'Unbounded'; font-weight:800; margin-bottom:5px;">ТРЕК</div>
                                <div><span style="font-size:20px; font-weight:800; color:var(--text-main); font-family:'Roboto Mono';">${rTrack}</span><span style="font-size:10px; color:var(--text-muted);"> pts</span></div>
                                <div style="margin-top:5px;"><span style="background:rgba(255,193,7,0.1); color:var(--primary); font-size:11px; font-weight:800; padding:2px 8px; border-radius:6px; border:1px solid var(--primary);">Кластер ${cTrack}</span></div>
                            </div>
                            <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:15px; display:flex; flex-direction:column; justify-content:space-between;">
                                <div style="font-size:10px; color:var(--text-muted); font-family:'Unbounded'; font-weight:800; margin-bottom:5px;">ГРУНТ / МТБ</div>
                                <div><span style="font-size:20px; font-weight:800; color:var(--text-main); font-family:'Roboto Mono';">${rOffroad}</span><span style="font-size:10px; color:var(--text-muted);"> pts</span></div>
                                <div style="margin-top:5px;"><span style="background:rgba(255,193,7,0.1); color:var(--primary); font-size:11px; font-weight:800; padding:2px 8px; border-radius:6px; border:1px solid var(--primary);">Кластер ${cOffroad}</span></div>
                            </div>
                            <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:15px; display:flex; flex-direction:column; justify-content:space-between;">
                                <div style="font-size:10px; color:var(--text-muted); font-family:'Unbounded'; font-weight:800; margin-bottom:5px;">ИНДОР</div>
                                <div><span style="font-size:20px; font-weight:800; color:var(--text-main); font-family:'Roboto Mono';">${rIndoor}</span><span style="font-size:10px; color:var(--text-muted);"> pts</span></div>
                                <div style="margin-top:5px;"><span style="background:rgba(255,193,7,0.1); color:var(--primary); font-size:11px; font-weight:800; padding:2px 8px; border-radius:6px; border:1px solid var(--primary);">Кластер ${cIndoor}</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dash-stats-grid" id="profileStatsGrid-${rider.id}-${suffix}">
                    <div class="dash-stat-card"><div class="dash-stat-lbl">ГЛОБАЛЬНЫЙ РЕЙТИНГ</div><div class="dash-stat-val" style="color: var(--primary);"><span class="spinner" style="width:20px; height:20px; border-width:2px; display:inline-block;"></span></div></div>
                    <div class="dash-stat-card"><div class="dash-stat-lbl">ЗАВЕРШЕНО ГОНОК</div><div class="dash-stat-val">-</div></div>
                    <div class="dash-stat-card"><div class="dash-stat-lbl">НАКАТ В ГОНКАХ</div><div class="dash-stat-val">- <span style="font-size:14px; color:var(--text-muted);">км</span></div></div>
                    <div class="dash-stat-card"><div class="dash-stat-lbl">РЕКОРД СКОРОСТИ</div><div class="dash-stat-val">- <span style="font-size:14px; color:var(--text-muted);">км/ч</span></div></div>
                </div>
                
                <div><h3 class="dash-section-title"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> ДИНАМИКА РЕЙТИНГА</h3><div class="dash-chart-container"><canvas id="chart-${rider.id}-${suffix}"></canvas></div></div>
            `;
            
            if (rStr.includes('admin') && targetUserId) html += `<div id="orgLog-${rider.id}-${suffix}"></div>`;
            if (rStr.includes('judge') && targetUserId) html += `<div id="judgeLog-${rider.id}-${suffix}"></div>`;
            if (rStr.includes('captain') && riderTeams.length > 0) html += `<div id="capLog-${rider.id}-${suffix}"></div>`;
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
                
                document.getElementById(`profileStatsGrid-${rider.id}-${suffix}`).innerHTML = `<div class="dash-stat-card"><div class="dash-stat-lbl">ГЛОБАЛЬНЫЙ РЕЙТИНГ</div><div class="dash-stat-val" style="color: var(--primary);">${rider.rating || 0}</div></div><div class="dash-stat-card"><div class="dash-stat-lbl">ЗАВЕРШЕНО ГОНОК</div><div class="dash-stat-val">${history.filter(h => h.status==='finished').length}</div></div><div class="dash-stat-card"><div class="dash-stat-lbl">НАКАТ В ГОНКАХ</div><div class="dash-stat-val">${totalDist} <span style="font-size:14px; color:var(--text-muted);">км</span></div></div><div class="dash-stat-card"><div class="dash-stat-lbl">РЕКОРД СКОРОСТИ</div><div class="dash-stat-val">${maxSpeed > 0 ? maxSpeed.toFixed(2) : '-'} <span style="font-size:14px; color:var(--text-muted);">км/ч</span></div></div>`;

                // 🔥 РАДАР СПЕЦИАЛИЗАЦИИ
                const radarCanvas = document.getElementById(`radar-${rider.id}-${suffix}`);
                if (radarCanvas) {
                    const ctxRadar = radarCanvas.getContext('2d');
                    const currentTheme = document.documentElement.getAttribute('data-theme'); 
                    const gridColor = currentTheme === 'dark' ? '#3f3f46' : (currentTheme === 'yellow' ? '#FFCA28' : '#e4e4e7');
                    const textColor = currentTheme === 'dark' ? '#a1a1aa' : '#52525b';
                    
                    const maxScore = Math.max(100, rider.rating_road || 0, rider.rating_track || 0, rider.rating_offroad || 0, rider.rating_indoor || 0) + 50;

                    new Chart(ctxRadar, {
                        type: 'radar',
                        data: {
                            labels: ['ШОССЕ', 'ТРЕК', 'ГРУНТ', 'ИНДОР'],
                            datasets: [{
                                label: 'Очки',
                                data: [rider.rating_road || 0, rider.rating_track || 0, rider.rating_offroad || 0, rider.rating_indoor || 0],
                                backgroundColor: 'rgba(255, 193, 7, 0.2)',
                                borderColor: '#ffc107',
                                pointBackgroundColor: '#ffc107',
                                pointBorderColor: '#000',
                                borderWidth: 2,
                                pointRadius: 4
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                                r: {
                                    angleLines: { color: gridColor },
                                    grid: { color: gridColor },
                                    pointLabels: { color: textColor, font: { family: "'Unbounded', sans-serif", size: 10, weight: 'bold' } },
                                    ticks: { display: false, max: maxScore, min: 0 }
                                }
                            }
                        }
                    });
                }

                if (history.length > 0) {
                    let hHtml = `<div class="dash-table-wrapper"><table class="dash-table"><thead><tr><th>Дата</th><th>Гонка</th><th>Покрытие</th><th>Время</th><th>Скорость</th><th>Очки</th><th>Статус</th></tr></thead><tbody>`;
                    history.forEach(h => { 
                        const rd = new Date(h.expand.race_id.date).toLocaleDateString('ru-RU', {day:'numeric', month:'short'}); 
                        const rn = h.expand.race_id.name; 
                        
                        // 🔥 БЕРЕМ ИКОНКИ ДЛЯ НОВЫХ ПОКРЫТИЙ
                        const surf = h.expand.race_id.surface;
                        let surfIcon = '🏁';
                        if(surf === 'road') surfIcon = '🛣';
                        else if(surf === 'track') surfIcon = '🏟';
                        else if(surf === 'offroad') surfIcon = '🌲'; // Мы оставили ключ offroad для Грунта
                        else if(surf === 'indoor') surfIcon = '💻';

                        const ts = h.status === 'dnf' ? '-' : window.app.formatMs(h.time_ms); 
                        const ss = h.status === 'dnf' ? '-' : (h.speed ? h.speed.toFixed(2) : '-'); 
                        const pt = h.earned_points || 0; 
                        const statBadge = h.status === 'finished' ? `<span class="dash-status" style="background:rgba(0,230,118,0.1); color:var(--success); border:1px solid rgba(0,230,118,0.2);">ФИНИШ</span>` : `<span class="dash-status" style="background:rgba(255,51,102,0.1); color:var(--danger); border:1px solid rgba(255,51,102,0.2);">DNF</span>`; 
                        
                        hHtml += `<tr><td style="color:var(--text-muted); font-size:11px;">${rd}</td><td><b>${rn}</b></td><td style="text-align:center;">${surfIcon}</td><td style="font-family:'Roboto Mono'; font-weight:bold;">${ts}</td><td style="font-family:'Roboto Mono';">${ss}</td><td><b style="color:var(--primary); font-family:'Roboto Mono';">+${pt}</b></td><td>${statBadge}</td></tr>`; 
                    });
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

                // 🔥 ФИКС ЗДЕСЬ: Умный поиск состава команды капитана (поддержка массивов)
                const riderTeams = Array.isArray(rider.team_id) ? rider.team_id : (rider.team_id ? [rider.team_id] : []);
                if (rStr.includes('captain') && riderTeams.length > 0) {
                    const mainTeamId = riderTeams[0]; // Берем первую команду как основную для вывода сводки
                    const teamMembers = Object.values(this.ridersMap).filter(r => {
                        const rTeamsLocal = Array.isArray(r.team_id) ? r.team_id : (r.team_id ? [r.team_id] : []);
                        return rTeamsLocal.includes(mainTeamId);
                    });
                    
                    const totalTeamRating = teamMembers.reduce((sum, r) => sum + (r.rating || 0), 0);
                    teamMembers.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                    const top3Html = teamMembers.slice(0, 3).map((m, i) => `<div style="font-size:12px; color:var(--text-main); margin-top:4px;">${i+1}. ${m.first_name} ${m.last_name} <b style="color:var(--primary); margin-left:5px;">${m.rating||0} pts</b></div>`).join('');
                    
                    let cHtml = `<div class="role-block"><div class="role-block-title" style="color:var(--info);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l9 4.9V12c0 5.5-3.6 10.7-9 12-5.4-1.3-9-6.5-9-12V6.9L12 2z"></path></svg> СВОДКА КОМАНДЫ</div><div style="display:flex; gap:30px; flex-wrap:wrap;"><div><div style="font-size:10px; color:var(--text-muted); font-family:'Unbounded';">СОСТАВ</div><div style="font-size:18px; font-weight:bold; color:var(--text-main);">${teamMembers.length} чел.</div></div><div><div style="font-size:10px; color:var(--text-muted); font-family:'Unbounded';">СУММАРНЫЙ РЕЙТИНГ</div><div style="font-size:18px; font-weight:bold; color:var(--primary);">${totalTeamRating} pts</div></div><div style="flex:1; min-width:200px;"><div style="font-size:10px; color:var(--text-muted); font-family:'Unbounded'; margin-bottom:5px;">ТОП СОСТАВА</div>${top3Html}</div></div></div>`;
                    document.getElementById(`capLog-${rider.id}-${suffix}`).innerHTML = cHtml;
                }
            } catch(e) {}
        }

        async renderProfileTab(targetRiderId) { 
            try { 
                const content = document.getElementById('profileTabContent'); 
                const rider = this.ridersMap[targetRiderId]; 
                if (!rider) { 
                    content.innerHTML = `
                    <div style="text-align:center; padding: 60px 20px; color:var(--danger); font-family:'Unbounded';">
                        ДАННЫЕ ПРОФИЛЯ НЕ ЗАГРУЖЕНЫ
                        <button onclick="if(window.sotkaAuth){window.sotkaAuth.logout();}else{localStorage.clear();window.location.reload();}" style="margin-top: 20px; background: var(--bg-surface-hover); color: var(--text-main); border: 1px solid var(--border); padding: 12px 24px; border-radius: 8px; font-family: 'Unbounded'; font-size: 11px; font-weight: 800; cursor: pointer; width: 100%;">
                            ВЫЙТИ И ПЕРЕЗАГРУЗИТЬ
                        </button>
                    </div>`; 
                    return; 
                } 
                content.innerHTML = this.generateProfileHtml(rider, this.userIdMap[rider.email], false); 
                this.fillProfileData(rider, this.userIdMap[rider.email], false); 
            } catch(e) { console.error(e); } 
        }
        async openProfile(targetRiderId, event) { 
        if (event) event.stopPropagation(); 
        
        const partModal = document.getElementById('participantsModal'); 
        if (partModal) partModal.style.display = 'none'; 
        
        const modal = document.getElementById('profileModal'); 
        const content = document.getElementById('profileModalContent'); 
        
        if (modal) {
            // Оставляем абсолютное оружие против слоев старт-листа
            modal.style.zIndex = '2147483647'; 
        }
        
        modal.style.display = 'flex'; 
        
        const rider = this.ridersMap[targetRiderId]; 
        if (!rider) { 
            content.innerHTML = `<div style="text-align:center; padding: 50px; color:var(--danger); font-family:'Unbounded';">ОШИБКА ЗАГРУЗКИ ПРОФИЛЯ</div>`; 
            return; 
        } 
        
        content.innerHTML = this.generateProfileHtml(rider, this.userIdMap[rider.email], true); 
        this.fillProfileData(rider, this.userIdMap[rider.email], true); 
    }
	
        closeProfileModal() { document.getElementById('profileModal').style.display = 'none'; if (this.modalChartInstance) { this.modalChartInstance.destroy(); this.modalChartInstance = null; } }

        // ==========================================
        // 🔥 ИНЛАЙН-РЕДАКТОР ПРОФИЛЯ В КАРТОЧКЕ
        // ==========================================
        editProfileInModal(riderId) {
            const rider = this.ridersMap[riderId];
            if (!rider) return;

            const myRoleWeight = Math.max(...(this.usersMap[this.currentRider?.email] || []).map(r => this.ROLE_WEIGHTS[r] || 20), 20);
            
            // Проверяем права доступа
            const isSuperOrAdmin = myRoleWeight >= this.ROLE_WEIGHTS['admin'];
            const isMyCaptain = myRoleWeight >= this.ROLE_WEIGHTS['captain'] && this.currentRider?.team_id === rider.team_id;
            
            // 🔥 Поле кластера будет видно Админам ИЛИ Капитанам команды этого гонщика
            const canEditCluster = isSuperOrAdmin || isMyCaptain;

            let clusterOpts = `<option value="A+">A+</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option><option value="V">V</option><option value="O">O</option>`;
            
            const formHtml = `
                <div id="inlineProfileEditForm" style="background:var(--bg-surface); padding:20px; border-radius:15px; border:1px solid var(--primary); margin-bottom:15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                    <div style="margin-bottom:15px; font-family:'Unbounded'; font-size:14px; font-weight:800; color:var(--primary);">✏️ РЕДАКТИРОВАНИЕ ПРОФИЛЯ</div>
                    
                    <label style="font-size:10px; color:var(--text-muted); font-family:'Unbounded';">ИМЯ И ФАМИЛИЯ</label>
                    <div style="display:flex; gap:10px; margin-bottom:12px; margin-top:5px;">
                        <input type="text" id="editProfName" class="auth-input" value="${this.escapeHTML(rider.first_name)}" placeholder="Имя" style="margin:0; width:100%;">
                        <input type="text" id="editProfSurname" class="auth-input" value="${this.escapeHTML(rider.last_name)}" placeholder="Фамилия" style="margin:0; width:100%;">
                    </div>
                    
                    <div style="display:flex; gap:10px; margin-bottom:20px;">
                        <div style="flex:1;">
                            <label style="font-size:10px; color:var(--text-muted); font-family:'Unbounded';">ГОД РОЖДЕНИЯ</label>
                            <input type="number" id="editProfYob" class="auth-input" value="${rider.yob}" placeholder="Год" style="margin:5px 0 0 0; width:100%;">
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:10px; color:var(--text-muted); font-family:'Unbounded';">ПОЛ</label>
                            <select id="editProfGender" class="auth-input" style="margin:5px 0 0 0; width:100%;">
                                <option value="M" ${rider.gender==='M'?'selected':''}>Мужской (M)</option>
                                <option value="F" ${rider.gender==='F'?'selected':''}>Женский (F)</option>
                            </select>
                        </div>
                    </div>

                    <div style="margin-bottom:20px; display: ${canEditCluster ? 'block' : 'none'};">
                        <label style="font-size:10px; color:var(--danger); font-family:'Unbounded';">КЛАСТЕР (ДЛЯ АДМИНОВ И КАПИТАНОВ)</label>
                        <select id="editProfCluster" class="auth-input" style="margin:5px 0 0 0; width:100%; border-color:var(--danger);">
                            ${clusterOpts.replace(`value="${rider.base_cluster}"`, `value="${rider.base_cluster}" selected`)}
                        </select>
                    </div>

                    <div style="display:flex; gap:10px;">
                        <button class="btn-black" onclick="window.app.saveProfileFromModal('${rider.id}', event)" style="flex:1; background:var(--success); color:#000; border:none; padding:12px; border-radius:8px; font-family:'Unbounded'; font-weight:800; cursor:pointer; transition:0.2s;">💾 СОХРАНИТЬ</button>
                        <button class="btn-black" onclick="window.app.openProfile('${rider.id}')" style="flex:1; background:var(--bg-body); color:var(--text-main); border:1px solid var(--border); padding:12px; border-radius:8px; font-family:'Unbounded'; font-weight:800; cursor:pointer; transition:0.2s;">ОТМЕНА</button>
                    </div>
                </div>
            `;

            const contentDiv = document.getElementById('profileModalContent');
            if (!contentDiv) return;
            const licenseCard = contentDiv.querySelector('.dash-license-card');
            if (licenseCard) {
                licenseCard.outerHTML = formHtml;
            }
        }

        async saveProfileFromModal(riderId, event) {
            const name = document.getElementById('editProfName').value.trim();
            const surname = document.getElementById('editProfSurname').value.trim();
            const yob = document.getElementById('editProfYob').value.trim();
            const gender = document.getElementById('editProfGender').value;
            const clusterEl = document.getElementById('editProfCluster');
            const avatarInput = document.getElementById('editProfAvatar'); // Вытягиваем файл фото

            if (!name || !surname || !yob) return alert('Заполните все обязательные поля!');

            const btn = event.currentTarget;
            const oldText = btn.innerText;
            btn.innerText = '⌛...';
            btn.disabled = true;

            try {
                // ==========================================
                // 🔥 БРОНЕБОЙНАЯ ЗАЩИТА ОТ ДУБЛЕЙ ПРИ РЕДАКТИРОВАНИИ
                // ==========================================
                try {
                    // Ищем, нет ли УЖЕ в базе ДРУГОГО гонщика с такими же ФИО и Г.Р. (id != riderId)
                    const existingRider = await pb.collection('riders').getFirstListItem(
                        `first_name="${name}" && last_name="${surname}" && yob=${Number(yob)} && id != "${riderId}"`, 
                        { requestKey: null }
                    );

                    // Если код дошел сюда — значит мы пытаемся переименовать человека в уже существующего гонщика
                    alert(`❌ ОШИБКА: Совпадение данных!\n\nГонщик ${name} ${surname} (${yob} г.р.) уже существует в базе данных.\n\nВы не можете переименовать этого спортсмена так, чтобы он стал дубликатом уже существующего. Используйте систему трансферов.`);
                    
                    btn.innerText = oldText;
                    btn.disabled = false;
                    return; // ⛔ Прерываем сохранение!
                } catch (searchErr) {
                    // Ошибка 404 означает, что других таких гонщиков нет. Всё отлично, продолжаем!
                }
                // ==========================================

                // 🔥 Переходим на FormData для поддержки файлов (аватарок)
                const formData = new FormData();
                formData.append('first_name', name);
                formData.append('last_name', surname);
                formData.append('yob', Number(yob));
                formData.append('gender', gender);

                // Обновляем кластер только если поле доступно
                if (clusterEl && clusterEl.parentElement.style.display !== 'none') {
                    formData.append('base_cluster', clusterEl.value);
                }

                // Сжимаем и прикрепляем аватарку (если юзер выбрал новое фото)
                if (avatarInput && avatarInput.files && avatarInput.files[0]) {
                    let file = avatarInput.files[0];
                    // Если у тебя есть функция compressImage, используем её, иначе отправляем как есть
                    if (file.type.startsWith('image/') && typeof this.compressImage === 'function') {
                        file = await this.compressImage(file, 1); 
                    }
                    formData.append('avatar', file);
                }

                // Отправляем пакет на сервер
                const updatedRider = await pb.collection('riders').update(riderId, formData, { requestKey: null });

                // Обновляем кэш Вилки
                this.ridersMap[riderId] = updatedRider;
                if (this.currentRider && this.currentRider.id === riderId) {
                    this.currentRider = updatedRider;
                    this.renderProfileHeader(); // Перерисовываем шапку профиля с новой аватаркой
                }

                // Перерисовываем список чатов, чтобы там тоже обновились кружочки аватарок
                const searchInput = document.getElementById('chatSearch');
                if (typeof this.renderChatList === 'function') {
                    this.renderChatList(searchInput ? searchInput.value : "");
                }

                alert('✅ Профиль успешно обновлен!');
                this.openProfile(riderId); // Перерисовываем карточку обратно
                
                if (this.crm && typeof this.crm.loadData === 'function') {
                    this.crm.loadData();
                }
            } catch (e) {
                alert('Ошибка при сохранении к БД!');
                console.error(e);
                btn.innerText = oldText;
                btn.disabled = false;
            }
        }

async syncRaceButtonsState() {
        if (!this.currentRider) return;
        const regBtns = document.querySelectorAll('[class*="sync-btn-"]');
        if (regBtns.length === 0) return;

        const raceIds = Array.from(new Set(Array.from(regBtns).map(btn => {
            const match = btn.className.match(/sync-btn-([a-zA-Z0-9_]+)/);
            return match ? match[1] : null;
        }).filter(Boolean)));

        if (raceIds.length === 0) return;

        try {
            // Скачиваем данные гонок и ВСЕ ростеры
            const filters = raceIds.map(id => `race_id="${id}"`).join(' || ');
            const raceFilters = raceIds.map(id => `id="${id}"`).join(' || ');
            
            const [racesList, allRosters] = await Promise.all([
                pb.collection('races').getFullList({ filter: raceFilters, requestKey: null }),
                pb.collection('race_rosters').getFullList({ filter: filters, requestKey: null, fetchOptions: { cache: 'no-store' } })
            ]);

            const myRole = this.getUserMaxRole();
            const isAdminOrJudge = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['judge'];

            regBtns.forEach(b => {
             const raceId = b.className.match(/sync-btn-([a-zA-Z0-9_]+)/)[1];
                const race = racesList.find(r => r.id === raceId);
                const wave = b.getAttribute('data-wave') || null;
                
                let myReg = null;
                if (wave) {
                    myReg = allRosters.find(r => r.race_id === raceId && r.rider_id === this.currentRider.id && r.status !== 'canceled' && r.final_cluster === wave);
                } else {
                    myReg = allRosters.find(r => r.race_id === raceId && r.rider_id === this.currentRider.id && r.status !== 'canceled');
                }

                // 🔥 ПРИОРИТЕТ 1: Я УЖЕ В СТАРТ-ЛИСТЕ (ОПЛАТИТЬ ИЛИ ПОДТВЕРЖДЕНО)
                if (myReg) {
                    let statusText = '';
                    if (myReg.is_paid) {
                        statusText = wave ? `✅ ОПЛАЧЕНО: ${wave.toUpperCase()}` : '✅ УЧАСТИЕ ПОДТВЕРЖДЕНО';
                        b.style.setProperty('background', 'var(--bg-surface-hover)', 'important');
                        b.style.setProperty('color', 'var(--text-main)', 'important');
                        b.style.setProperty('border', '1px solid var(--border)', 'important');
                        b.style.setProperty('box-shadow', 'none', 'important');
                    } else {
                        let customLabel = b.getAttribute('data-label');
                        statusText = customLabel && customLabel.includes(':') ? `💳 ОПЛАТИТЬ: ` + customLabel.split(':')[1].trim() : (wave ? `💳 ОПЛАТИТЬ: ${wave.toUpperCase()}` : '💳 ОПЛАТИТЬ ВЗНОС');
                        // ЦЕЛЕВОЕ ДЕЙСТВИЕ - КРИЧАЩИЙ ЖЕЛТЫЙ
                        b.style.setProperty('background', 'var(--primary)', 'important');
                        b.style.setProperty('color', '#000000', 'important');
                        b.style.setProperty('border', 'none', 'important');
                        b.style.setProperty('box-shadow', '0 4px 15px rgba(255, 193, 7, 0.3)', 'important');
                    }
                    b.innerHTML = statusText;
                    b.style.pointerEvents = 'auto'; // 🔥 ВКЛЮЧАЕМ КЛИКИ
                    b.style.display = 'block';
                    return; 
                }

                // 🔥 ПРИОРИТЕТ 2: СТАТУСЫ ГОНКИ (ЗАКРЫТО / SOLD OUT)
                if (race) {
                    if (race.status !== 'Registration') {
                        b.innerHTML = '⛔ РЕГИСТРАЦИЯ ЗАКРЫТА';
                        b.style.setProperty('background', 'var(--bg-surface-hover)', 'important');
                        b.style.setProperty('color', 'var(--text-muted)', 'important');
                        b.style.setProperty('border', '1px solid var(--border)', 'important');
                        b.style.setProperty('box-shadow', 'none', 'important');
                        b.style.pointerEvents = 'none'; // БЛОКИРУЕМ КЛИК
                        return;
                    }

                    const rosterCount = allRosters.filter(r => r.race_id === raceId && r.status !== 'canceled').length;
                    const isFull = race.max_riders > 0 && rosterCount >= race.max_riders;

                    if (isFull) {
                        if (isAdminOrJudge || race.creator_id === this.currentRider.id) {
                            b.innerHTML = '⚠️ ДОЗАЯВИТЬ (SOLD OUT)';
                            b.style.setProperty('background', 'var(--primary)', 'important');
                            b.style.setProperty('color', '#000000', 'important');
                            b.style.setProperty('border', 'none', 'important');
                            b.style.setProperty('box-shadow', '0 4px 15px rgba(255, 193, 7, 0.3)', 'important');
                            b.style.pointerEvents = 'auto';
                        } else {
                            b.innerHTML = '⛔ МЕСТ НЕТ (SOLD OUT)';
                            b.style.setProperty('background', 'var(--bg-surface-hover)', 'important');
                            b.style.setProperty('color', 'var(--text-muted)', 'important');
                            b.style.setProperty('border', '1px solid var(--border)', 'important');
                            b.style.setProperty('box-shadow', 'none', 'important');
                            b.style.pointerEvents = 'none';
                        }
                        return;
                    }
                }

                // 🔥 ПРИОРИТЕТ 3: НОВАЯ ЗАЯВКА
                let label = b.getAttribute('data-label') || '⚡️ ЗАЯВИТЬСЯ';
                if (wave && b.getAttribute('data-custom-name')) label = b.getAttribute('data-custom-name');
                
                // 🔥 КОМАНДНЫЕ ГОНКИ: ИНВАЙТ ИЛИ СОЗДАНИЕ
                const pendingSquadRace = sessionStorage.getItem('pending_squad_race');
                const pendingSquadName = sessionStorage.getItem('pending_squad_name');
                
                // 🔥 ЗАЩИТА: Смотрим и на лимит, и на формат (ttt = командная, relay = эстафета)
                const isTeamRace = race.squad_max > 1 || race.format === 'ttt' || race.format === 'relay';
                if (isTeamRace && !myReg && race.status === 'Registration') {
                    if (pendingSquadRace === raceId) {
                        label = `🤝 ВСТУПИТЬ: ${this.escapeHTML(pendingSquadName).toUpperCase()}`;
                        b.style.setProperty('background', '#a855f7', 'important');
                        b.style.setProperty('color', '#ffffff', 'important');
                        b.style.setProperty('box-shadow', '0 4px 15px rgba(168,85,247,0.3)', 'important');
                    } else {
                        label = `👥 СОБРАТЬ ЭКИПАЖ`;
                        b.style.setProperty('background', 'var(--primary)', 'important');
                        b.style.setProperty('color', '#000000', 'important');
                        b.style.setProperty('box-shadow', '0 4px 15px rgba(255, 193, 7, 0.3)', 'important');
                    }
                } else {
                    b.style.setProperty('background', 'var(--primary)', 'important');
                    b.style.setProperty('color', '#000000', 'important');
                    b.style.setProperty('box-shadow', '0 4px 15px rgba(255, 193, 7, 0.3)', 'important');
                }

                b.innerHTML = label;
                b.style.pointerEvents = 'auto';
                b.style.opacity = '1';
                b.style.display = 'block';
                b.style.setProperty('border', 'none', 'important');
                
                // ЦЕЛЕВОЕ ДЕЙСТВИЕ - КРИЧАЩИЙ ЖЕЛТЫЙ
                b.style.setProperty('background', 'var(--primary)', 'important');
                b.style.setProperty('color', '#000000', 'important');
                b.style.setProperty('border', 'none', 'important');
                b.style.setProperty('box-shadow', '0 4px 15px rgba(255, 193, 7, 0.3)', 'important');
            });
        } catch (e) {
            console.error("Ошибка синхронизации кнопок:", e);
        }
    }
	
        async registerForRace(raceId, btn, event, wave = null) {
        event.stopPropagation(); 
        if (!this.currentRider) return;
        
        if (this.isGuest || (this.currentRider.email && this.currentRider.email.startsWith('guest_'))) {
            if (confirm("Для регистрации на гонку необходимо войти в аккаунт SOTKA. Перейти ко входу?")) {
                this.openLoginScreen(); 
            }
            return;
        }

        const allBtns = document.querySelectorAll(`.sync-btn-${raceId}`); 
        allBtns.forEach(b => { b.innerText = '⌛ ОБРАБОТКА...'; b.style.opacity = '0.7'; b.style.pointerEvents = 'none'; });
        
        try {
            const [race, existing] = await Promise.all([
                pb.collection('races').getOne(raceId, { requestKey: null }),
                pb.collection('race_rosters').getFullList({ filter: `race_id="${raceId}"`, requestKey: null })
            ]);
            
            const myRegistration = existing.find(e => e.rider_id === this.currentRider.id && e.status !== 'canceled');

            // 🔥 ПРИОРИТЕТ 1: ЕСЛИ Я УЖЕ ЗАЯВЛЕН — РАЗРЕШАЕМ ОПЛАТУ!
            if (myRegistration) {
                if (myRegistration.is_paid) {
                    alert("✅ Ваше участие уже подтверждено и оплачено. До встречи на старте!");
                } else {
                    const price = race.price || 1500;
                    const title = race.name || "Гонка";
                    
                    this.currentRaceContext = { raceId: raceId, rosterId: myRegistration.id, price: price, title: title };
                    if(typeof this.ensureRaceModalExists === 'function') this.ensureRaceModalExists();

                    document.getElementById('modalRaceTitle').innerText = title;
                    document.getElementById('modalRacePrice').innerText = price;
                    document.getElementById('raceActionModal').style.display = 'flex';
                }
                await this.syncRaceButtonsState();
                return; 
            }

            // 🔥 ПРИОРИТЕТ 2: ЕСЛИ Я НЕ ЗАЯВЛЕН — ПРОВЕРЯЕМ СТАТУСЫ И ЛИМИТЫ
            if (race.status !== 'Registration') { 
                allBtns.forEach(b => { b.innerHTML = '⛔ РЕГИСТРАЦИЯ ЗАКРЫТА'; b.style.background = 'var(--danger-light)'; b.style.color = 'var(--danger)'; b.style.border = '1px solid var(--danger)'; }); 
                return; 
            }
            
            if (race.level === 'peloton' && this.currentRider.base_cluster === 'O') {
                alert("❌ Официальные гонки доступны только для спортсменов со статусом «Гонщик».");
                await this.syncRaceButtonsState();
                return;
            }

            const rosterCount = existing.filter(r => r.status !== 'canceled').length;
            const isFull = race.max_riders > 0 && rosterCount >= race.max_riders;
            
            const myRole = this.getUserMaxRole();
            const isAdminOrJudge = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['judge'] || race.creator_id === this.currentRider.id;

            if (isFull && !isAdminOrJudge) {
                alert(`❌ Извините, лимит участников (${race.max_riders} чел.) исчерпан. Мест больше нет.`);
                allBtns.forEach(b => { 
                    b.innerHTML = '⛔ МЕСТ НЕТ (SOLD OUT)'; 
                    b.style.setProperty('background', 'var(--bg-surface-hover)', 'important');
                    b.style.setProperty('color', 'var(--text-muted)', 'important');
                    b.style.border = '1px solid var(--border)';
                });
                return; 
            }
			
			// ==========================================
            // 🔥 ПРИОРИТЕТ 3: ЛОГИКА ЭКИПАЖЕЙ (SQUADS)
            // ==========================================
            let targetSquadId = null;
            let targetSquadName = null;
            let ridersToRegister = [this.currentRider.id];
            
            let maxSquadSize = race.squad_max || 1;
            // 🔥 ЗАЩИТА ОТ ДУРАКА: Если это TTT, но лимит забыли указать, ставим дефолт 4 человека
            if ((race.format === 'ttt' || race.format === 'relay') && maxSquadSize <= 1) {
                maxSquadSize = 4;
            }

            if (maxSquadSize > 1) {
                const pendingSquadId = sessionStorage.getItem('pending_squad_id');
                const pendingSquadName = sessionStorage.getItem('pending_squad_name');
                const pendingSquadRace = sessionStorage.getItem('pending_squad_race');

                if (pendingSquadId && pendingSquadRace === raceId) {
                    // АВТОБЛОКИРОВКА ИНВАЙТА, ЕСЛИ МЕСТ НЕТ
                    const currentSquadRosters = existing.filter(r => r.squad_id === pendingSquadId && r.status !== 'canceled');
                    if (currentSquadRosters.length >= maxSquadSize) {
                        alert(`⛔ Мест нет! Экипаж «${pendingSquadName}» уже полностью укомплектован (${maxSquadSize} из ${maxSquadSize} чел.)`);
                        sessionStorage.removeItem('pending_squad_id');
                        sessionStorage.removeItem('pending_squad_name');
                        sessionStorage.removeItem('pending_squad_race');
                        allBtns.forEach(b => { b.innerHTML = originalHtml; b.style.pointerEvents = 'auto'; });
                        return;
                    }
                    if (!confirm(`Вы перешли по приглашению.\nВступить в экипаж «${pendingSquadName}»?`)) {
                        allBtns.forEach(b => { b.innerHTML = originalHtml; b.style.pointerEvents = 'auto'; });
                        return;
                    }
                    targetSquadId = pendingSquadId;
                    targetSquadName = pendingSquadName;
                    
                    sessionStorage.removeItem('pending_squad_id');
                    sessionStorage.removeItem('pending_squad_name');
                    sessionStorage.removeItem('pending_squad_race');
                } 
                else {
                    // ИНВАЙТА НЕТ. Проверяем, Капитан ли мы?
                    const myTeams = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);
                    const isCaptain = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['captain'] && myTeams.length > 0;

                    if (isAdminOrJudge || isCaptain) {
                        // РЕЖИМ КАПИТАНА: Мгновенный сбор состава
                        this.openSquadBuilderModal(raceId, maxSquadSize, race.name, wave, null);
                        allBtns.forEach(b => { b.innerHTML = originalHtml; b.style.pointerEvents = 'auto'; b.style.opacity = '1'; });
                        return;
                    } else {
                        // РЕЖИМ РЯДОВОГО: Создание экипажа и генерация инвайта
                        const squadNameInput = prompt(`Эта гонка командная (Экипаж до ${maxSquadSize} чел).\n\nПридумайте название для вашего экипажа (Оно будет в протоколах):`);
                        if (!squadNameInput || !squadNameInput.trim()) {
                            allBtns.forEach(b => { b.innerHTML = originalHtml; b.style.pointerEvents = 'auto'; });
                            return;
                        }
                        targetSquadId = 'sq_' + Math.random().toString(36).substring(2, 8);
                        targetSquadName = squadNameInput.trim();
                        
                        const inviteUrl = `${window.location.origin}/?chat=${this.activeChatId}&join_squad=${targetSquadId}&sname=${encodeURIComponent(targetSquadName)}&squad_race=${raceId}`;
                        this.copyText(inviteUrl, `✅ Экипаж «${targetSquadName}» создан!\n\nИнвайт-ссылка скопирована в буфер обмена.\nОтправьте её напарникам (осталось мест: ${maxSquadSize - 1}).`);
                    }
                }
            }
            
            // Этап 3: Создаем новую заявку (Не оплачено)
            const activeChat = this.chats.find(c => c.id === this.activeChatId);
            let gruppettoId = null;
            let ridersToRegister = [this.currentRider.id];

            if (activeChat && activeChat.type === 'gruppetto') {
                let allowed = race.allowed_types || [];
                if (!allowed.includes('gruppetto') && race.level === 'peloton') {
                    alert("❌ В этой гонке могут участвовать только официальные команды. Заявка для Группетто закрыта.");
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
                if (!existing.find(e => e.rider_id === rId && e.status !== 'canceled')) {
                    let payload = { race_id: raceId, rider_id: rId, status: 'registered', is_paid: false };
                    if (gruppettoId) payload.gruppetto_id = gruppettoId;
                    if (wave) payload.final_cluster = wave;
                    
                    // 🔥 ПРИКРЕПЛЯЕМ ЭКИПАЖ
                    if (targetSquadId) {
                        payload.squad_id = targetSquadId;
                        payload.squad_name = targetSquadName;
                    }

                    await pb.collection('race_rosters').create(payload, { requestKey: null });
                    registeredCount++;
                }
            }

            if (ridersToRegister.length > 1) {
                alert(`✅ Заявлено ${registeredCount} чел. Не забудьте оплатить взнос.`);
            } else {
                alert("🚀 Вы добавлены в старт-лист! Нажмите кнопку еще раз, чтобы оплатить взнос и подтвердить участие.");
            }
            
            await this.syncRaceButtonsState();
            
        } catch(e) { 
            console.error("Ошибка в registerForRace:", e);
            alert("Ошибка: " + e.message); 
            await this.syncRaceButtonsState(); 
        }
    }
	
// ==========================================
    // 🔥 МЯГКАЯ РЕГИСТРАЦИЯ: ОПЛАТА И ОТМЕНА
    // ==========================================
    async confirmRacePayment() {
        const { rosterId, price, title } = this.currentRaceContext;
        
        if (confirm(`Списать ${price} Ватт за участие в "${title}"?`)) {
            try {
                // Вызываем смарт-кассу
                const response = await pb.send('/api/draft/pay', {
                    method: 'POST',
                    body: { amount: price, purpose: `Взнос: ${title}` }
                });

                if (response.success) {
                    // Ставим галочку ОПЛАЧЕНО в заявке
                    await pb.collection('race_rosters').update(rosterId, { is_paid: true }, { requestKey: null });
                    
                    document.getElementById('raceActionModal').style.display = 'none';
                    alert("💳 Оплачено! Ваше участие подтверждено.");
                    
                    await this.syncRaceButtonsState();
                    if (typeof this.loadDraftWallet === 'function') this.loadDraftWallet();
                    if (typeof this.loadDraftHistory === 'function') this.loadDraftHistory();
                }
            } catch (err) {
                console.error(err);
                
                // 🔥 ИЗМЕНЕНО: Умный перехват ошибки нехватки средств
                const errMsg = err.data?.message || "";
                const errCode = err.data?.error || "";
                
                if (errCode === "INSUFFICIENT_FUNDS" || errMsg.includes("Недостаточно Ватт")) {
                    // Бесшовный переход к эквайрингу
                    if (confirm("❌ На балансе недостаточно ВАТТ.\n\nПополнить счет прямо сейчас?")) {
                        document.getElementById('raceActionModal').style.display = 'none';
                        this.promptTopup(); // Дергаем метод пополнения Т-Банка
                    }
                } else {
                    // Дефолтный фолбэк для остальных системных ошибок
                    alert(errMsg || "Ошибка при оплате");
                }
            }
        }
    }

    async cancelRegistration() {
        if (confirm("Вы точно хотите отозвать свою заявку и покинуть старт-лист?")) {
            try {
                await pb.collection('race_rosters').delete(this.currentRaceContext.rosterId, { requestKey: null });
                document.getElementById('raceActionModal').style.display = 'none';
                alert("Заявка отменена.");
                await this.syncRaceButtonsState();
            } catch (err) {
                alert("Ошибка при удалении заявки.");
            }
        }
    }

async registerForDistance(raceId, distanceId, btn, event) {
        if (event) event.stopPropagation();
        if (!this.currentRider) return;

        if (this.isGuest || (this.currentRider.email && this.currentRider.email.startsWith('guest_'))) {
            if (confirm("Для регистрации необходимо войти в аккаунт SOTKA. Перейти ко входу?")) {
                this.openLoginScreen();
            }
            return;
        }

        const originalHtml = btn.innerHTML;
        btn.innerHTML = '⌛ ОБРАБОТКА...';
        btn.style.pointerEvents = 'none';

        try {
            const [race, allRaceRosters] = await Promise.all([
                pb.collection('races').getOne(raceId, { requestKey: null }),
                pb.collection('race_rosters').getFullList({ filter: `race_id="${raceId}"`, requestKey: null })
            ]);
            
            const myRegistration = allRaceRosters.find(e => e.rider_id === this.currentRider.id && e.distance_id === distanceId && e.status !== 'canceled');

            // 🔥 ПРИОРИТЕТ 1: ЕСЛИ УЖЕ ЗАЯВЛЕН — ПЕРЕХОДИМ К ОПЛАТЕ!
            if (myRegistration) {
                if (myRegistration.is_paid) {
                    alert("✅ Ваше участие на этой дистанции подтверждено и оплачено!");
                } else {
                    const price = race.price || 1500; 
                    let customName = btn.getAttribute('data-custom-name') || race.name || "Гонка";
                    customName = customName.replace('🏁 ', ''); 
                    
                    this.currentRaceContext = { raceId: raceId, rosterId: myRegistration.id, price: price, title: customName };
                    if(typeof this.ensureRaceModalExists === 'function') this.ensureRaceModalExists();
                    
                    document.getElementById('modalRaceTitle').innerText = customName;
                    document.getElementById('modalRacePrice').innerText = price;
                    document.getElementById('raceActionModal').style.display = 'flex';
                }
                await this.syncRaceButtonsState();
                return; 
            }

            // 🔥 ПРИОРИТЕТ 2: ЕСЛИ НЕТ ЗАЯВКИ — ПРОВЕРЯЕМ ЛИМИТЫ И СТАТУС
            if (race.status !== 'Registration') {
                alert("Регистрация закрыта");
                await this.syncRaceButtonsState();
                return;
            }

            const rosterCount = allRaceRosters.filter(r => r.status !== 'canceled').length;
            const isFull = race.max_riders > 0 && rosterCount >= race.max_riders;
            const myRole = this.getUserMaxRole();
            const isAdminOrJudge = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['judge'] || race.creator_id === this.currentRider.id;

            if (isFull && !isAdminOrJudge) {
                alert(`❌ Извините, лимит участников (${race.max_riders} чел.) исчерпан. Мест больше нет.`);
                btn.innerHTML = '⛔ МЕСТ НЕТ (SOLD OUT)'; 
                btn.style.setProperty('background', 'var(--bg-surface-hover)', 'important');
                btn.style.setProperty('color', 'var(--text-muted)', 'important');
                btn.style.border = '1px solid var(--border)';
                return; 
            }
			// 🔥 МАГИЯ ЭКИПАЖЕЙ ДЛЯ ДИСТАНЦИЙ
            let squadMax = race.squad_max || 1;
            if ((race.format === 'ttt' || race.format === 'relay') && squadMax <= 1) {
                squadMax = 4;
            }
            
            let finalSquadId = null;
            let finalSquadName = null;
            let ridersToRegister = [this.currentRider.id];

            if (squadMax > 1 && !myRegistration) {
                const pendingRaceId = sessionStorage.getItem('pending_squad_race');
                const pendingSquadId = sessionStorage.getItem('pending_squad_id');
                const pendingSquadName = sessionStorage.getItem('pending_squad_name');
                const pendingSquadDist = sessionStorage.getItem('pending_squad_dist');
                
                if (pendingRaceId === raceId && pendingSquadId && (!pendingSquadDist || pendingSquadDist === distanceId)) {
                    const currentRosters = allRaceRosters.filter(r => r.squad_id === pendingSquadId && r.status !== 'canceled');
                    if (currentRosters.length >= squadMax) {
                        alert(`⛔ Мест нет! Экипаж «${pendingSquadName}» уже полностью укомплектован (${squadMax} из ${squadMax} чел.)`);
                        sessionStorage.removeItem('pending_squad_race');
                        sessionStorage.removeItem('pending_squad_id');
                        sessionStorage.removeItem('pending_squad_name');
                        sessionStorage.removeItem('pending_squad_dist');
                        btn.innerHTML = originalHtml; btn.style.pointerEvents = 'auto';
                        return;
                    } 
                    if (!confirm(`Присоединиться к экипажу «${pendingSquadName}» на этой дистанции?`)) {
                        btn.innerHTML = originalHtml; btn.style.pointerEvents = 'auto'; return;
                    }
                    finalSquadId = pendingSquadId;
                    finalSquadName = pendingSquadName;
                    sessionStorage.removeItem('pending_squad_race');
                    sessionStorage.removeItem('pending_squad_id');
                    sessionStorage.removeItem('pending_squad_name');
                    sessionStorage.removeItem('pending_squad_dist');
                } 
                else {
                    const myTeams = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);
                    const isCaptain = this.ROLE_WEIGHTS[myRole] >= this.ROLE_WEIGHTS['captain'] && myTeams.length > 0;
                    
                    if (isAdminOrJudge || isCaptain) {
                        this.openSquadBuilderModal(raceId, squadMax, race.name, null, distanceId);
                        btn.innerHTML = originalHtml; btn.style.pointerEvents = 'auto'; return;
                    } else {
                        const squadName = prompt(`Это командная гонка (до ${squadMax} чел).\nВведите название вашего экипажа:`);
                        if (!squadName || squadName.trim() === '') {
                            btn.innerHTML = originalHtml; btn.style.pointerEvents = 'auto'; return;
                        }
                        finalSquadId = 'sq_' + Math.random().toString(36).substring(2, 8);
                        finalSquadName = squadName.trim();
                        
                        const inviteUrl = `${window.location.origin}/?chat=${this.activeChatId}&join_squad=${finalSquadId}&sname=${encodeURIComponent(finalSquadName)}&squad_race=${raceId}&squad_dist=${distanceId}`;
                        this.copyText(inviteUrl, `✅ Экипаж «${finalSquadName}» создан!\n\nСсылка-приглашение скопирована в буфер обмена. Отправьте её напарникам!`);
                    }
                }
            }

            // Этап 3: Создание заявки
            const activeChat = this.chats.find(c => c.id === this.activeChatId);
            let gruppettoId = null;
            let ridersToRegister = [this.currentRider.id];

            if (activeChat && activeChat.type === 'gruppetto') {
                let allowed = race.allowed_types || [];
                if (!allowed.includes('gruppetto') && race.level === 'peloton') {
                    alert("❌ Заявка для Группетто закрыта организатором.");
                    await this.syncRaceButtonsState();
                    return;
                }
                gruppettoId = activeChat.id;
                if (activeChat.captain === this.currentRider.id) {
                    if (confirm(`Вы капитан. Заявить всё группетто "${activeChat.name}" на эту дистанцию?`)) {
                        ridersToRegister = activeChat.participants || [this.currentRider.id];
                    }
                }
            }

            let registeredCount = 0;
            for (let rId of ridersToRegister) {
                const rExists = allRaceRosters.find(r => r.rider_id === rId && r.distance_id === distanceId && r.status !== 'canceled');
                
                if (!rExists) {
                    let payload = { race_id: raceId, rider_id: rId, distance_id: distanceId, status: 'registered', is_paid: false };
                    if (gruppettoId) payload.gruppetto_id = gruppettoId;
                    // 🔥 ПРИКРЕПЛЯЕМ ЭКИПАЖ
                    if (finalSquadId) { payload.squad_id = finalSquadId; payload.squad_name = finalSquadName; }
                    
                    await pb.collection('race_rosters').create(payload, { requestKey: null });
                    registeredCount++;
                }
            }

            if (ridersToRegister.length > 1) {
                alert(`✅ Заявлено ${registeredCount} чел. Нажмите кнопку еще раз, чтобы оплатить.`);
            } else {
                alert("🚀 Вы добавлены в старт-лист! Нажмите кнопку еще раз, чтобы оплатить взнос.");
            }

            await this.syncRaceButtonsState();
            
        } catch (e) {
            console.error("Ошибка в registerForDistance:", e);
            alert("Ошибка связи с базой данных: " + e.message);
            btn.innerHTML = originalHtml;
            btn.style.pointerEvents = 'auto';
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
		
		// ==========================================
        // 🔥 ГЛОБАЛЬНЫЕ ПУШ-УВЕДОМЛЕНИЯ (ONESIGNAL)
        // ==========================================
        async setupOneSignalPush() {
            if (!this.currentRider) return;

            window.OneSignalDeferred = window.OneSignalDeferred || [];
            window.OneSignalDeferred.push(async (OneSignal) => {
                // Привязываем устройство к ID гонщика в PocketBase
                await OneSignal.login(this.currentRider.id);

                // Теги для точечных рассылок
                OneSignal.User.addTags({
                    team_id: Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id.join(',') : (this.currentRider.team_id || 'none'),
                    cluster: this.currentRider.base_cluster || 'O'
                });

                // 🔥 ФИКС: Запрашиваем права на пуши у браузера!
                // Если пользователь еще не разрешал пуши, появится всплывающее окно
                await OneSignal.Notifications.requestPermission();
            });
        }

        async requestPushPermission() {
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            window.OneSignalDeferred.push(async (OneSignal) => {
                await OneSignal.Notifications.requestPermission();
            });
        }

        async sendPushNotification(title, message, targetUserIds = [], url = 'https://vilka.sotka.one') {
            const appId = "7cfc3fab-1eee-439b-b231-a7084e6398d5";
            const restApiKey = "os_v2_app_pt6d7ky65zbzxmrru4ee4y4y2vlqo547czpu5wefg32lll5se52flp3jimn6uceelylnhsewwwv3uiv4lcqpk7743gbbzxyql4h2y3q"; 

            const payload = {
                app_id: appId,
                headings: { "en": title, "ru": title },
                contents: { "en": message, "ru": message },
                url: url
            };

            // 🔥 ФИКС: Используем классический параметр OneSignal API для отправки по ID
            if (targetUserIds && targetUserIds.length > 0) {
                payload.include_external_user_ids = targetUserIds;
            } else {
                payload.included_segments = ["Subscribed Users"]; // Шлем вообще всем подписанным
            }

            try {
                // 🔥 ФИКС: Правильный URL для API рассылок
                const response = await fetch("https://onesignal.com/api/v1/notifications", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Basic ${restApiKey}`,
                        "Accept": "application/json"
                    },
                    body: JSON.stringify(payload)
                });
                
                const result = await response.json();
                
                // Выводим ответ OneSignal в консоль разработчика (F12)
                console.log("📡 Ответ OneSignal:", result);
                
                // Если OneSignal не нашел получателей — просто тихо пишем в консоль, не пугая юзера
                if (result.errors) {
                    console.warn("📡 OneSignal: Уведомление не отправлено (пользователь не подписан или ошибка):", result.errors);
                }
                
            } catch (error) {
                console.error("📡 Ошибка сети при отправке Push:", error);
                // Убрали alert("Сбой сети..."), чтобы при плохом интернете юзера не спамило ошибками
            }
        }
		
		// ==========================================
        // 🔥 ЛОГИКА ЧЕРНОВИКОВ (DRAFTS)
        // ==========================================
        saveDraft(chatId, text) {
            if (!chatId) return;
            let drafts = JSON.parse(localStorage.getItem('vilka_drafts') || '{}');
            if (!text || text.trim() === '') {
                delete drafts[chatId]; 
            } else {
                drafts[chatId] = text; 
            }
            localStorage.setItem('vilka_drafts', JSON.stringify(drafts));
        }

        getDraft(chatId) {
            if (!chatId) return '';
            let drafts = JSON.parse(localStorage.getItem('vilka_drafts') || '{}');
            return drafts[chatId] || '';
        }

        clearDraft(chatId) {
            if (!chatId) return;
            let drafts = JSON.parse(localStorage.getItem('vilka_drafts') || '{}');
            delete drafts[chatId];
            localStorage.setItem('vilka_drafts', JSON.stringify(drafts));
        }
		// ==========================================
        // 🔥 ЛОГИКА ЭМОДЗИ (EMOJI-MART)
        // ==========================================
        initEmojiPicker() {
            // Узнаем текущую тему Вилки (темная или светлая)
            const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
            
            // База эмодзи. Варианты: 'apple', 'twitter', 'google', 'facebook', 'native'
            // Twitter (Twemoji) - модно, современно, плоский дизайн как в Discord.
            // Apple - классический объемный глянец.
            const emojiSet = 'twitter'; 

            // 1. Инициализация пикера для текстового поля
            const mainContainer = document.getElementById('emojiPickerContainer');
            if (mainContainer && !this.mainEmojiPicker) {
                const pickerOptions = {
                    set: emojiSet,
                    theme: currentTheme,
                    locale: 'ru',
                    onEmojiSelect: (emoji) => {
                        const input = document.getElementById('messageInput');
                        input.value += emoji.native; // Вставляем сам символ в инпут
                        input.style.height = '46px'; 
                        input.style.height = Math.min(input.scrollHeight, 250) + 'px';
                        this.saveDraft(this.activeChatId, input.value);
                        input.focus();
                    }
                };
                this.mainEmojiPicker = new EmojiMart.Picker(pickerOptions);
                mainContainer.appendChild(this.mainEmojiPicker);
            }

            // 2. Инициализация пикера для МЕНЮ РЕАКЦИЙ
            const ctxContainer = document.getElementById('ctxEmojiPickerContainer');
            if (ctxContainer && !this.ctxEmojiPicker) {
                const ctxPickerOptions = {
                    set: emojiSet,
                    theme: currentTheme,
                    locale: 'ru',
                    onEmojiSelect: (emoji) => {
                        // Для реакций отправляем символ в базу
                        this.submitContextReaction(emoji.native); 
                        ctxContainer.style.display = 'none';
                    }
                };
                this.ctxEmojiPicker = new EmojiMart.Picker(ctxPickerOptions);
                ctxContainer.appendChild(this.ctxEmojiPicker);
            }

            // Закрытие при клике вне пикера
            document.addEventListener('click', (e) => {
                const container = document.getElementById('emojiPickerContainer');
                const btn = document.getElementById('emojiToggleBtn');
                if (this.emojiPickerOpen && container && !container.contains(e.target) && !btn.contains(e.target)) {
                    this.toggleEmojiPicker();
                }
            });
        }

        toggleEmojiPicker(event) {
            if (event) event.stopPropagation();
            const container = document.getElementById('emojiPickerContainer');
            if (!container) return;

            // 🔥 Инициализируем тяжелую либу ТОЛЬКО при первом клике на смайл!
            if (!this.mainEmojiPicker) {
                this.initEmojiPicker();
            }

            this.emojiPickerOpen = !this.emojiPickerOpen;
            container.style.display = this.emojiPickerOpen ? 'block' : 'none';
        }

        toggleCtxEmojiPicker(event) {
            if (event) event.stopPropagation();
            const container = document.getElementById('ctxEmojiPickerContainer');
            if (!container) return;

            const isHidden = container.style.display === 'none' || container.style.display === '';
            
            if (isHidden) {
                // 🔥 1. УБИВАЕМ СТАРЫЕ СТИЛИ, КОТОРЫЕ КИДАЛИ ПИКЕР НАВЕРХ
                container.style.bottom = 'auto';
                container.style.transform = 'none';
                container.style.marginBottom = '0';
                
                // 🔥 2. НАКЛАДЫВАЕМ ПИКЕР ПОВЕРХ КНОПОК
                // Родитель (ctxMenuBox) имеет padding: 20px. 
                container.style.top = '95px'; // Опускаем ровно под строку с базовыми эмодзи
                container.style.left = '20px'; // Учитываем левый отступ меню
                container.style.width = 'calc(100% - 40px)'; // Ширина меню минус отступы по краям
                container.style.zIndex = '9999';
                
                // Растягиваем саму библиотеку эмодзи
                const picker = container.querySelector('em-emoji-picker');
                if (picker) {
                    picker.style.width = '100%';
                    picker.style.height = '300px'; 
                }

                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        }
	}

async openSquadBuilderModal(raceId, squadMax, raceName, wave, distanceId) {
        let modal = document.getElementById('squadBuilderModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'squadBuilderModal';
            modal.className = 'modal-overlay';
            modal.style.zIndex = '10000000';
            document.body.appendChild(modal);
        }
        
        const myTeams = Array.isArray(this.currentRider.team_id) ? this.currentRider.team_id : (this.currentRider.team_id ? [this.currentRider.team_id] : []);
        
        // Отбираем гонщиков: соклубники капитана + он сам
        let availableRiders = Object.values(this.ridersMap).filter(r => {
            const rTeams = Array.isArray(r.team_id) ? r.team_id : (r.team_id ? [r.team_id] : []);
            return (rTeams.some(tId => myTeams.includes(tId)) || r.id === this.currentRider.id) && r.email !== 'bot@sotka.one' && !(r.email && r.email.startsWith('guest_'));
        });
        
        availableRiders.sort((a,b) => (a.last_name||'').localeCompare(b.last_name||''));
        
        const existingRosters = await pb.collection('race_rosters').getFullList({
            filter: distanceId ? `race_id="${raceId}" && distance_id="${distanceId}" && status!="canceled"` : `race_id="${raceId}" && status!="canceled"`,
            requestKey: null
        });
        const registeredIds = existingRosters.map(r => r.rider_id);
        
        let ridersHtml = '';
        availableRiders.forEach(r => {
            const isReg = registeredIds.includes(r.id);
            const disabled = isReg ? 'disabled' : '';
            const op = isReg ? '0.5' : '1';
            // Капитана выбираем по умолчанию
            const checked = r.id === this.currentRider.id && !isReg ? 'checked' : ''; 
            const bg = isReg ? 'var(--bg-surface)' : 'transparent';
            
            ridersHtml += `
                <label style="display:flex; align-items:center; gap:10px; padding:10px; border-bottom:1px solid var(--border); background:${bg}; opacity:${op}; cursor:${isReg ? 'not-allowed' : 'pointer'}; transition:0.2s;" onmouseover="if(!${isReg}) this.style.background='var(--bg-surface-hover)'" onmouseout="if(!${isReg}) this.style.background='transparent'">
                    <input type="checkbox" class="squad-builder-cb" value="${r.id}" ${disabled} ${checked} style="accent-color:var(--primary); width:18px; height:18px;">
                    <div style="flex:1;">
                        <div style="font-weight:600; font-size:13px; color:var(--text-main);">${this.escapeHTML(r.last_name + ' ' + r.first_name)}</div>
                        ${isReg ? `<div style="font-size:10px; color:var(--danger);">Уже заявлен</div>` : `<div style="font-size:10px; color:var(--text-muted);">${r.base_cluster || 'B'}</div>`}
                    </div>
                </label>
            `;
        });
        
        modal.innerHTML = `
            <div class="modal-box" style="max-width:500px; width:95%; max-height:90vh; display:flex; flex-direction:column; padding:0; overflow:hidden;">
                <div style="padding:15px 20px; border-bottom:1px solid var(--border); background:var(--bg-surface-hover); display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="margin:0; font-family:'Unbounded'; font-size:14px; color:var(--text-main); text-transform:uppercase;">СБОР ЭКИПАЖА</h3>
                        <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${this.escapeHTML(raceName)} (Макс. ${squadMax} чел.)</div>
                    </div>
                    <button onclick="document.getElementById('squadBuilderModal').style.display='none'" style="background:none; border:none; color:var(--text-muted); font-size:24px; cursor:pointer;">&times;</button>
                </div>
                
                <div style="padding:20px; overflow-y:auto; flex:1;">
                    <label style="font-size:10px; color:var(--text-muted); font-family:'Unbounded'; font-weight:800;">НАЗВАНИЕ ЭКИПАЖА *</label>
                    <input type="text" id="squadBuilderName" class="auth-input" style="width:100%; margin-top:5px; margin-bottom:20px;" placeholder="Например: Ракета">
                    
                    <label style="font-size:10px; color:var(--text-muted); font-family:'Unbounded'; font-weight:800;">ВЫБЕРИТЕ ГОНЩИКОВ (До ${squadMax})</label>
                    <div style="border:1px solid var(--border); border-radius:8px; margin-top:5px; max-height:300px; overflow-y:auto;">
                        ${ridersHtml || '<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:12px;">Нет доступных гонщиков</div>'}
                    </div>
                </div>
                
                <div style="padding:15px 20px; border-top:1px solid var(--border); background:var(--bg-surface);">
                    <button id="btnSubmitSquad" onclick="window.app.submitSquadBuilder('${raceId}', ${squadMax}, '${wave || ''}', '${distanceId || ''}')" style="width:100%; background:var(--primary); color:#000; border:none; padding:14px; border-radius:8px; font-family:'Unbounded'; font-size:12px; font-weight:800; cursor:pointer; box-shadow: 0 4px 15px rgba(255,193,7,0.3); transition:0.2s;">
                        ЗАЯВИТЬ ЭКИПАЖ
                    </button>
                </div>
            </div>
        `;
        
        const cbs = modal.querySelectorAll('.squad-builder-cb');
        cbs.forEach(cb => {
            cb.addEventListener('change', () => {
                const checkedCount = modal.querySelectorAll('.squad-builder-cb:checked').length;
                if (checkedCount > squadMax) {
                    cb.checked = false;
                    alert(`Максимальное количество участников в экипаже: ${squadMax}`);
                }
            });
        });
        
        modal.style.display = 'flex';
    }

    async submitSquadBuilder(raceId, squadMax, wave, distanceId) {
        const nameInput = document.getElementById('squadBuilderName').value.trim();
        if (!nameInput) return alert("Введите название экипажа!");
        
        const checked = document.querySelectorAll('.squad-builder-cb:checked');
        if (checked.length === 0) return alert("Выберите хотя бы одного гонщика!");
        if (checked.length > squadMax) return alert(`Максимум ${squadMax} гонщиков!`);
        
        const btn = document.getElementById('btnSubmitSquad');
        btn.innerText = 'ОБРАБОТКА...';
        btn.disabled = true;
        
        try {
            const newSquadId = 'sq_' + Math.random().toString(36).substring(2, 8);
            let registeredCount = 0;
            
            for (let cb of checked) {
                let payload = { 
                    race_id: raceId, 
                    rider_id: cb.value, 
                    status: 'registered', 
                    is_paid: false, 
                    squad_id: newSquadId, 
                    squad_name: nameInput 
                };
                if (wave && wave !== 'null') payload.final_cluster = wave;
                if (distanceId && distanceId !== 'null') payload.distance_id = distanceId;
                
                await pb.collection('race_rosters').create(payload, { requestKey: null });
                registeredCount++;
            }
            
            alert(`✅ Экипаж «${nameInput}» успешно заявлен! (${registeredCount} чел.)`);
            document.getElementById('squadBuilderModal').style.display = 'none';
            await this.syncRaceButtonsState();
            
            if (this.crm && typeof this.crm.loadData === 'function' && document.getElementById('raceRosterTableContainer')) {
                this.crm.loadData();
            }
            
        } catch(e) {
            console.error(e);
            alert("Ошибка при создании экипажа.");
            btn.innerText = 'ЗАЯВИТЬ ЭКИПАЖ';
            btn.disabled = false;
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
            const target = document.getElementById(stepId);
            if (target) target.classList.add('active');
            
            // Загружаем команды, если дошли до создания профиля
            if (stepId === 'sa-step-create' && (!this.allTeams || this.allTeams.length === 0)) {
                this.loadTeamsToSelect();
            }
        }

        async loadTeamsToSelect() {
            try {
                const teams = await pb.collection('teams').getFullList({ sort: 'name', requestKey: null });
                let pelotons = await pb.collection('pelotons').getFullList({ sort: 'name', requestKey: null });
                
                this.pelotonsMap = {};
                pelotons.forEach(p => { if (!p.is_private) this.pelotonsMap[p.id] = p; });

                this.allTeams = teams;
                this.allPelotons = pelotons;

                const oneTeam = teams.find(t => t.name.toUpperCase().includes('ONE TEAM'));
                this.oneTeamId = oneTeam ? oneTeam.id : null;

                // 🔥 Очищаем контейнер и создаем первую дефолтную строку
                const container = document.getElementById('sa-team-selections-container');
                if (container) {
                    container.innerHTML = '';
                    this.addTeamSelectionRow(); // Добавляем первую строку автоматически
                }
            } catch(e) {
                console.error("Ошибка инициализации списков:", e);
            }
        }
		
		// 🔥 НОВЫЙ МЕТОД: Добавление строки выбора лиги/команды
        addTeamSelectionRow(event) {
            if (event) event.preventDefault();
            const container = document.getElementById('sa-team-selections-container');
            if (!container) return;

            const rowId = 'row_' + Date.now() + Math.floor(Math.random() * 1000);
            
            const rowHtml = `
                <div class="sa-team-row" id="${rowId}" style="display:flex; gap:10px; margin-bottom:10px; align-items: flex-end; background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px; border: 1px solid var(--border);">
                    <div class="sa-input-group" style="flex:1; margin-bottom:0;">
                        <label class="sa-label">Лига / Пелотон</label>
                        <select class="sa-select sa-peloton-select" onchange="window.sotkaAuth.onRowPelotonChange(this)">
                            <option value="" disabled selected>-- Выберите --</option>
                            ${Object.values(this.pelotonsMap).map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="sa-input-group" style="flex:1; margin-bottom:0;">
                        <label class="sa-label">Команда</label>
                        <select class="sa-select sa-team-select" disabled style="opacity:0.4; cursor:not-allowed;">
                            <option value="">🔒 Выберите лигу...</option>
                        </select>
                    </div>
                    <button class="sa-btn" style="width: 40px; height: 46px; margin: 0; padding: 0; background: rgba(255,51,102,0.1); color: var(--danger); border: 1px solid rgba(255,51,102,0.3);" onclick="this.parentElement.remove()" title="Удалить">✕</button>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', rowHtml);
        }

        // 🔥 НОВЫЙ МЕТОД: Обработка изменения в конкретной строке
        onRowPelotonChange(selectElement) {
            const row = selectElement.closest('.sa-team-row');
            const teamSelect = row.querySelector('.sa-team-select');
            const selectedPelotonId = selectElement.value;

            if (!selectedPelotonId) {
                teamSelect.disabled = true;
                teamSelect.style.opacity = '0.4';
                teamSelect.style.cursor = 'not-allowed';
                teamSelect.innerHTML = '<option value="">🔒 Выберите лигу...</option>';
                return;
            }

            teamSelect.disabled = false;
            teamSelect.style.opacity = '1';
            teamSelect.style.cursor = 'pointer';

            let html = `<option value="${this.oneTeamId || ''}">Без команды (ONE TEAM)</option>`;
            
            const filtered = this.allTeams.filter(t => {
                if (!t.peloton_id || (this.oneTeamId && t.id === this.oneTeamId)) return false;
                const tPels = Array.isArray(t.peloton_id) ? t.peloton_id : [t.peloton_id];
                return tPels.includes(selectedPelotonId);
            });

            if (filtered.length > 0) {
                filtered.forEach(t => {
                    html += `<option value="${t.id}">Заявка: ${t.name}</option>`;
                });
            } else {
                html = `<option value="${this.oneTeamId || ''}">В этой лиге нет команд (только ONE TEAM)</option>`;
            }
            
            teamSelect.innerHTML = html;
        }
        
        async oauthAction(providerName) {
            try {
                this.switchStep('sa-step-loading');
                document.getElementById('sa-loading-text').innerText = `Связь с ${providerName}...`;

                const response = await fetch(`${pb.baseUrl}/api/collections/users/auth-methods`);
                const data = await response.json();
                
                const list = data.authProviders || data.providers || [];
                const p = list.find(x => x.name.toLowerCase() === providerName.toLowerCase());

                if (!p) throw new Error("Провайдер не найден на сервере.");

                pb.collection('users').providers = list; 
                pb.collection('users').authProviders = list;

                const authData = await pb.collection('users').authWithOAuth2({
                    provider: p.name,
                    codeVerifier: p.codeVerifier,
                    codeChallenge: p.codeChallenge,
                    codeChallengeMethod: p.codeChallengeMethod,
                    url: 'https://vilka.sotka.one/'
                });

                if (authData && authData.record) {
                    try {
                        const rider = await pb.collection('riders').getFirstListItem(`user_id="${authData.record.id}"`, { requestKey: null });
                        this.finishAndClose(rider);
                    } catch (e) {
                        this.switchStep('sa-step-role');
                    }
                }
            } catch (err) {
                console.error("OAuth Debug Error:", err);
                if (err.message && err.message.includes('providers')) {
                    const resp = await fetch(`${pb.baseUrl}/api/collections/users/auth-methods`);
                    const d = await resp.json();
                    const list = d.authProviders || d.providers || [];
                    const p = list.find(x => x.name.toLowerCase() === providerName.toLowerCase());
                    
                    if (p) {
                        localStorage.setItem('pb_auth_provider', p.name); 
                        localStorage.setItem('pb_auth_verifier', p.codeVerifier);
                        window.location.href = p.authUrl + 'https://vilka.sotka.one/';
                        return;
                    }
                }
                if (!err.isAbort) alert("Ошибка входа: " + (err.message || "Технический сбой"));
                this.switchStep('sa-step-login');
            }
        }

        renderTeamOptions(selectedPelotonId) {
            const selectEl = document.getElementById('sa-create-team');
            if (!selectEl) return;

            if (!selectedPelotonId) {
                selectEl.disabled = true;
                selectEl.style.opacity = '0.4';
                selectEl.style.cursor = 'not-allowed';
                selectEl.innerHTML = '<option value="">🔒 Выберите лигу выше...</option>';
                return;
            }

            selectEl.disabled = false;
            selectEl.style.opacity = '1';
            selectEl.style.cursor = 'pointer';

            let html = `<option value="${this.oneTeamId || ''}">Без команды (ONE TEAM)</option>`;
            
            const filtered = this.allTeams.filter(t => {
                if (!t.peloton_id || (this.oneTeamId && t.id === this.oneTeamId)) return false;
                const tPels = Array.isArray(t.peloton_id) ? t.peloton_id : [t.peloton_id];
                return tPels.includes(selectedPelotonId);
            });

            if (filtered.length > 0) {
                filtered.forEach(t => {
                    html += `<option value="${t.id}">Заявка в команду: ${t.name}</option>`;
                });
            } else {
                html = `<option value="${this.oneTeamId || ''}">В этой лиге нет команд (только ONE TEAM)</option>`;
            }
            
            selectEl.innerHTML = html;
        }

        // 🔥 СМАРТ-ЛОГИН: И вход, и регистрация в одной кнопке
        async login() {
            const email = document.getElementById('sa-login-email').value.trim();
            const pass = document.getElementById('sa-login-password').value.trim();
            
            if (!email || !pass) return alert("Пожалуйста, введите email и пароль");
            if (pass.length < 8) return alert("Пароль должен содержать минимум 8 символов");

            this.switchStep('sa-step-loading');
            document.getElementById('sa-loading-text').innerText = "Авторизация...";

            try {
                // 1. Пробуем войти как существующий юзер
                await pb.collection('users').authWithPassword(email, pass);
            } catch(e) {
                // 2. Если такого юзера нет - пробуем зарегистрировать
                try {
                    await pb.collection('users').create({
                        email: email, password: pass, passwordConfirm: pass, emailVisibility: true
                    }, { requestKey: null });
                    
                    await pb.collection('users').authWithPassword(email, pass);
                } catch(err) {
                    alert("Ошибка входа! Неверный пароль или этот Email уже занят.");
                    pb.authStore.clear(); 
                    this.switchStep('sa-step-login');
                    return;
                }
            }
            
            // Если дошли сюда — мы внутри. Проверяем наличие профиля гонщика.
            try {
                const rider = await pb.collection('riders').getFirstListItem(`user_id="${pb.authStore.model.id}"`, { requestKey: null });
                this.finishAndClose(rider);
            } catch (e) {
                // Если карточки нет — отправляем на онбординг!
                this.switchStep('sa-step-role');
            }
        }

        chooseRole(roleType) {
            this.selectedRole = roleType;
            
            if (roleType === 'racer') {
                this.switchStep('sa-step-search'); 
            } else {
                document.getElementById('sa-create-lastname').value = '';
                document.getElementById('sa-create-firstname').value = '';
                document.getElementById('sa-create-lastname').disabled = false;
                document.getElementById('sa-create-firstname').disabled = false;
                
                const teamWrapper = document.getElementById('sa-team-wrapper');
                if (teamWrapper) teamWrapper.style.display = 'none';
                
                const warningMsg = document.getElementById('sa-create-warning');
                if (warningMsg) warningMsg.style.display = 'none';

                this.switchStep('sa-step-create');
            }
        }

        async confirmNewPassword() {
            const token = document.getElementById('sa-reset-token').value;
            const pass1 = document.getElementById('sa-new-password').value.trim();
            const pass2 = document.getElementById('sa-new-password-confirm').value.trim();

            if (!pass1 || pass1.length < 8) return alert("Пароль должен содержать минимум 8 символов!");
            if (pass1 !== pass2) return alert("Пароли не совпадают! Проверьте правильность ввода.");

            this.switchStep('sa-step-loading');
            document.getElementById('sa-loading-text').innerText = "Сохранение пароля...";

            try {
                await pb.collection('users').confirmPasswordReset(token, pass1, pass2);
                alert("✅ Пароль успешно изменен! Теперь вы можете войти в систему.");
                
                document.getElementById('sa-new-password').value = '';
                document.getElementById('sa-new-password-confirm').value = '';
                this.switchStep('sa-step-login');
            } catch (e) {
                let realError = e.message;
                if (e.data && e.data.message) realError = e.data.message; 
                alert("Ответ от базы данных:\n" + realError + "\n\nПожалуйста, запросите новое письмо и попробуйте еще раз.");
                this.switchStep('sa-step-reset');
            }
        }

        async resetPassword() {
            const email = document.getElementById('sa-reset-email').value.trim().toLowerCase();
            if (!email) return alert("Пожалуйста, введите ваш Email");

            this.switchStep('sa-step-loading');
            document.getElementById('sa-loading-text').innerText = "Отправка письма...";

            try {
                await pb.collection('users').requestPasswordReset(email);
                alert("✅ Письмо для сброса пароля отправлено!\n\nПроверьте вашу почту (на всякий случай загляните в папку Спам).");
                document.getElementById('sa-reset-email').value = '';
                this.switchStep('sa-step-login');
            } catch(e) {
                alert("Ошибка! Возможно, этот Email не зарегистрирован в системе, или вы отправляете запросы слишком часто.");
                this.switchStep('sa-step-reset');
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
                        let tName = "Без команды";
                        if (this.foundRider.expand?.team_id) {
                            const tExp = this.foundRider.expand.team_id;
                            tName = Array.isArray(tExp) ? tExp.map(t => t.name).join(', ') : tExp.name;
                        }
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
                    document.getElementById('sa-create-lastname').value = lName;
                    document.getElementById('sa-create-firstname').value = fName;
                    document.getElementById('sa-create-lastname').disabled = true;
                    document.getElementById('sa-create-firstname').disabled = true;
                    
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
            if (String(this.foundRider.yob) !== yobInput) return alert("Год рождения не совпадает с тем, что указан в базе. Если вы уверены, что это ваш профиль, обратитесь в поддержку для корректировки данных.");

            this.switchStep('sa-step-loading');
            document.getElementById('sa-loading-text').innerText = "Привязка профиля...";

            try {
                if (pb.authStore.isValid) {
                    const currentUserId = pb.authStore.model.id;
                    const emailToSet = this.foundRider.email ? this.foundRider.email : pb.authStore.model.email;
                    
                    const updatedRider = await pb.collection('riders').update(this.foundRider.id, {
                        user_id: currentUserId,
                        email: emailToSet
                    }, { requestKey: null });

                    alert("✅ Профиль успешно привязан к вашему аккаунту!");
                    this.finishAndClose(updatedRider);
                } else {
                    alert("Сессия истекла! Пожалуйста, войдите в систему заново.");
                    this.switchStep('sa-step-login');
                }
            } catch(e) {
                console.error("Ошибка привязки:", e);
                alert("Ошибка! Не удалось привязать профиль.");
                this.switchStep('sa-step-verify');
            }
        }

        // 🔥 ОБНОВЛЕННЫЙ МЕТОД РЕГИСТРАЦИИ
        async createProfile() {
            const lNameRaw = document.getElementById('sa-create-lastname').value.trim();
            const fNameRaw = document.getElementById('sa-create-firstname').value.trim();
            const yob = document.getElementById('sa-create-yob').value.trim();
            const gender = document.getElementById('sa-create-gender').value;

            if (!lNameRaw || !fNameRaw) return alert("Введите Имя и Фамилию");
            if (!yob || yob.length !== 4) return alert("Введите корректный год рождения (4 цифры)");

            const lName = this.capitalize(lNameRaw);
            const fName = this.capitalize(fNameRaw);

            // 🔥 СОБИРАЕМ ВСЕ ВЫБРАННЫЕ КОМАНДЫ
            let requestedTeams = [];
            let startCluster = "C";

            if (this.selectedRole !== 'cyclist') {
                // Сканируем все селекты команд в дом-дереве
                document.querySelectorAll('.sa-team-select').forEach(sel => {
                    const val = sel.value;
                    // Игнорируем пустые, базовую ONE TEAM и дубликаты
                    if (val && val !== this.oneTeamId && !requestedTeams.includes(val)) {
                        requestedTeams.push(val);
                    }
                });

                // Проверяем все селекты пелотонов на предмет XCNEWS
                document.querySelectorAll('.sa-peloton-select').forEach(sel => {
                    const pId = sel.value;
                    if (pId && this.allPelotons) {
                        const pObj = this.allPelotons.find(p => p.id === pId);
                        if (pObj && pObj.name.toUpperCase().includes('XCNEWS')) {
                            startCluster = ""; // Пустота для МТБ
                        }
                    }
                });
            } else {
                startCluster = "O"; // Велосипедист
            }

            this.switchStep('sa-step-loading');
            document.getElementById('sa-loading-text').innerText = "Создание профиля...";

            try {
                if (!pb.authStore.isValid) {
                    alert("Сессия истекла! Пожалуйста, войдите в систему заново.");
                    this.switchStep('sa-step-login');
                    return;
                }

                // ... (тут твой стандартный код проверки на дубликаты велосипедиста) ...
                if (this.selectedRole === 'cyclist') {
                    const existing = await pb.collection('riders').getFullList({ 
                        filter: `first_name="${fName}" && last_name="${lName}"`, expand: 'team_id', requestKey: null 
                    });

                    if (existing.length > 0) {
                        const availableRider = existing.find(r => !r.email || r.email.trim() === '');
                        if (availableRider) {
                            alert(`⚠️ Мы нашли карточку "${fName} ${lName}" в базе организаторов!\n\nСистема перенаправит вас на привязку профиля.`);
                            this.foundRider = availableRider;
                            let tName = "Без команды";
                            if (this.foundRider.expand?.team_id) {
                                const tExp = this.foundRider.expand.team_id;
                                tName = Array.isArray(tExp) ? tExp.map(t => t.name).join(', ') : tExp.name;
                            }
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

                const userId = pb.authStore.model.id;
                const finalEmail = pb.authStore.model.email;

                // Создаем карточку (базово в ONE TEAM или пустую)
                const newRider = await pb.collection('riders').create({
                    first_name: fName, 
                    last_name: lName, 
                    yob: Number(yob), 
                    gender: gender, 
                    email: finalEmail, 
                    team_id: this.oneTeamId ? [this.oneTeamId] : [], 
                    transfer_request: requestedTeams.join(','), // Склеиваем все запросы в строку для базы
                    rating: 0, 
                    base_cluster: startCluster,
                    user_id: userId
                }, { requestKey: null });

                // 🔥 РАССЫЛАЕМ ЗАЯВКИ ВСЕМ КАПИТАНАМ
                if (requestedTeams.length > 0) {
                    for (let targetTeamId of requestedTeams) {
                        try {
                            const targetTeamObj = this.allTeams.find(t => t.id === targetTeamId);
                            const teamName = targetTeamObj ? targetTeamObj.name : "вашу команду";
                            
                            // 1. Выкачиваем всех гонщиков команды (базовый фильтр связи)
const teamRiders = await pb.collection('riders').getFullList({ 
    filter: `team_id ~ "${targetTeamId}"`, requestKey: null 
});

// 2. Ищем капитана с помощью JS (надежно обрабатывая массивы ролей)
const captains = teamRiders.filter(r => {
    let rRoles = r.roles || [];
    if (typeof rRoles === 'string') {
        try { rRoles = JSON.parse(rRoles); } catch(e) { rRoles = [rRoles]; }
    }
    if (!Array.isArray(rRoles)) rRoles = [rRoles];
    return rRoles.includes('captain');
});
                            
                            if (captains.length > 0) {
                                const captain = captains[0]; // Шлем первому найденному капитану
                                const newChat = await pb.collection('chats').create({ 
                                    type: 'direct', name: 'Direct', participants: [newRider.id, captain.id] 
                                }, { requestKey: null });
                                
                                await pb.collection('messages').create({
                                    chat_id: newChat.id,
                                    sender_id: newRider.id,
                                    text: `Привет! Я только что зарегистрировался в приложении и хочу выступать за ${teamName}. Одобришь мою заявку?\n\n[ACTION:TRANSFER:${newRider.id}:${targetTeamId}:REQUEST]`
                                }, { requestKey: null });
                            }
                        } catch(err) {
                            console.error(`Ошибка отправки заявки в команду ${targetTeamId}:`, err);
                        }
                    }
                }
                
                this.finishAndClose(newRider);
            } catch(e) {
                console.error(e);
                alert("Ошибка создания профиля.");
                this.switchStep('sa-step-create');
            }
        }
        
        logout() {
    // 🔥 1. Мгновенно перекрываем экран желтым сплешем (чтобы не было видно моргания интерфейса)
    const splash = document.getElementById('vilka-splash-screen');
    if (splash) {
        splash.style.opacity = '1';
        splash.style.visibility = 'visible';
        splash.style.display = 'flex';
    }

    // Твой старый код очистки...
    pb.authStore.clear();
    localStorage.removeItem('vilka_core_data');
    
    // Перезагрузка
    window.location.reload();
}

        finishAndClose(riderObj) { 
            document.getElementById('sotka-auth-overlay').style.display = 'none';
            localStorage.removeItem('vilka_guest_id'); 
            window.location.reload(); 
        }
        
        cancelVerify() { this.foundRider = null; document.getElementById('sa-verify-yob').value = ''; this.switchStep('sa-step-search'); }
        
        cancelCreate() { 
            document.getElementById('sa-create-yob').value = ''; 
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

   // ==========================================
    // 🔥 PULL-TO-REFRESH (СВАЙП ВНИЗ ДЛЯ ПЕРЕЗАГРУЗКИ)
    // ==========================================
    function initPullToRefresh() {
        let touchStartY = 0;
        let isPulling = false;

        const ptrIndicator = document.createElement('div');
        ptrIndicator.innerHTML = '<div style="background: var(--bg-surface); padding: 10px 20px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 10px; border: 1px solid var(--primary);"><span class="spinner" style="width: 14px; height: 14px; border-width: 2px; border-color: var(--primary) transparent transparent transparent;"></span> <span style="font-size: 12px; font-family:\'Unbounded\'; font-weight:800; color: var(--text-main);">ОБНОВЛЕНИЕ...</span></div>';
        ptrIndicator.style.cssText = 'position: fixed; top: -60px; left: 0; width: 100%; display: flex; justify-content: center; z-index: 999999; transition: top 0.2s ease-out; pointer-events: none;';
        document.body.appendChild(ptrIndicator);

        document.addEventListener('touchstart', (e) => {
            // 1. Находим ближайший скролл-контейнер под пальцем
            const scrollContainer = e.target.closest('#chatList, #messagesContainer, .p-table-container, .modal-box, #crmContentArea');
            
            // 2. Если мы внутри длинного списка (протокола) и он прокручен вниз хотя бы чуть-чуть
            // то Pull-to-Refresh ЗАПРЕЩЕН.
            if (scrollContainer && scrollContainer.scrollTop > 5) {
                isPulling = false;
                return;
            }
            
            // 3. Если мы не в контейнере или контейнер в самом верху (scrollTop === 0)
            touchStartY = e.touches[0].clientY;
            isPulling = true;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!isPulling) return;
            
            const currentY = e.touches[0].clientY;
            const pullDistance = currentY - touchStartY;

            // Если палец движется ВВЕРХ (обычный скролл вниз) — сразу выключаем логику пулла
            if (pullDistance < 0) {
                isPulling = false;
                return;
            }

            // Визуальный индикатор появляется только если потянули вниз реально ощутимо
            if (pullDistance > 50 && pullDistance < 200) {
                ptrIndicator.style.top = '30px';
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!isPulling) return;
            const pullDistance = e.changedTouches[0].clientY - touchStartY;
            
            // Порог срабатывания увеличил до 120px, чтобы исключить случайные дергания
            if (pullDistance > 120) {
                if(typeof showVilkaSplash === 'function') showVilkaSplash();
                setTimeout(() => window.location.reload(true), 300);
            } else {
                ptrIndicator.style.top = '-60px';
            }
            isPulling = false;
        }, { passive: true });
    }
	
    // ==========================================
    // 🔥 SWIPE-TO-CLOSE (СВАЙП ВПРАВО ДЛЯ ЗАКРЫТИЯ ЧАТА)
    // ==========================================
    function initSwipeGestures() {
        let touchStartX = 0; 
        let touchStartY = 0;
        
        document.addEventListener('touchstart', (e) => { 
            touchStartX = e.touches[0].clientX; 
            touchStartY = e.touches[0].clientY; 
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            const chatArea = document.getElementById('mainChatArea');
            // Если мы на мобилке и чат открыт
            if (chatArea && chatArea.classList.contains('mobile-open')) {
                const diffX = e.changedTouches[0].clientX - touchStartX; 
                const diffY = Math.abs(e.changedTouches[0].clientY - touchStartY);
                
                // Если жест был явным горизонтальным свайпом вправо (X > 80, а по Y сдвиг минимальный)
                if (diffX > 80 && diffY < 50) {
                    if (window.app && typeof window.app.closeChatMobile === 'function') {
                        window.app.closeChatMobile();
                    }
                }
            }
        }, { passive: true });
    }

    // ==========================================
    // 🔥 МОНИТОР ИНТЕРНЕТА
    // ==========================================
    function initConnectionMonitor() {
        const offlineBanner = document.createElement('div');
        offlineBanner.id = 'vilka-offline-banner';
        offlineBanner.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg> НЕТ ПОДКЛЮЧЕНИЯ К СЕРВЕРУ`;
        offlineBanner.style.cssText = 'position:fixed; top:0; left:0; width:100%; background:var(--danger); color:#fff; font-family:"Unbounded"; font-size:10px; font-weight:800; text-align:center; padding:6px; z-index:9999999; transform:translateY(-100%); transition:transform 0.3s; display:flex; justify-content:center; align-items:center; gap:8px;';
        document.body.appendChild(offlineBanner);

        let isOffline = false;
        async function runCheck() {
            let serverAlive = false;
            if (navigator.onLine) { try { serverAlive = (await fetch('https://vilka.sotka.one/api/health', { method: 'GET', cache: 'no-store' })).ok; } catch (e) {} }
            
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
	
	// ==========================================
    // 🔥 ГЛОБАЛЬНЫЙ ЗАПУСК СИСТЕМНЫХ ФУНКЦИЙ
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
        // initPullToRefresh();
        initSwipeGestures();
        initConnectionMonitor();

        // 👇 НОВЫЙ КОД: Перехват системного свайпа "Назад" от края экрана
        setTimeout(() => {
            if (window.app) {
                // Очищаем историю при старте, чтобы системный "Назад" не вел в Google
                history.replaceState({ page: 'main' }, "", window.location.pathname);

                // Перехватываем функцию открытия чата
                const originalOpenChat = window.app.openChat;
                window.app.openChat = function(chatId) {
                    // Добавляем фейковую страницу в историю браузера
                    history.pushState({ chatOpen: true }, "", "#chat");
                    // Открываем сам чат
                    if (originalOpenChat) originalOpenChat.apply(this, arguments);
                };

                // Перехватываем функцию личных сообщений
                const originalStartDirect = window.app.startDirectChat;
                window.app.startDirectChat = function(userId) {
                    history.pushState({ chatOpen: true }, "", "#chat");
                    if (originalStartDirect) originalStartDirect.apply(this, arguments);
                };

                // Слушаем системный жест "Назад" (кнопка телефона или свайп от края)
                window.addEventListener('popstate', (e) => {
                    const chatArea = document.getElementById('mainChatArea');
                    // Если мы нажали назад, хэш "#chat" пропал, а чат на экране всё еще открыт
                    if (window.location.hash !== '#chat' && chatArea && chatArea.classList.contains('mobile-open')) {
                        // Просто закрываем шторку, никуда не переходя!
                        if (typeof window.app.closeChatMobile === 'function') {
                            window.app.closeChatMobile();
                        }
                    }
                });
                
                // Перехватываем закрытие чата крестиком (чтобы тоже откатывать историю)
                const originalCloseChat = window.app.closeChatMobile;
                window.app.closeChatMobile = function() {
                    if (window.location.hash === '#chat') {
                        history.back(); // Это триггернет popstate и закроет чат чисто
                    } else {
                        if (originalCloseChat) originalCloseChat.apply(this, arguments);
                    }
                };
            }
        }, 1000); // Ждем секунду, пока window.app инициализируется
    });