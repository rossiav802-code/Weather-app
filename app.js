

const $ = id => document.getElementById(id);

const state = { apiKey:'', lat:null, lon:null };

const TEMPLATES = {

  masthead: () => `
    <div class="masthead">
      <div>
        <div class="title">Метео<span>журнал</span></div>
        <div class="sub">наблюдения &amp; сводки</div>
      </div>
      <div class="clock" id="clock">—</div>
    </div>
  `,

  setup: () => `
    <div class="card" id="setup">
      <div class="field">
        <label>Ключ OpenWeather API</label>
        <input type="text" id="apiKey" placeholder="вставьте ваш API-ключ" autocomplete="off">
        <div class="hint">Бесплатный ключ можно получить на
          <a href="https://openweathermap.org/api" target="_blank" rel="noopener">openweathermap.org/api</a>.
          Ключ хранится только в этой сессии.
        </div>
      </div>
      <div class="field">
        <label>Город (необязательно)</label>
        <input type="text" id="cityInput" placeholder="например: Москва" autocomplete="off">
        <div class="hint">Оставьте пустым, чтобы использовать геолокацию браузера.</div>
      </div>
      <div class="row-btns">
        <button class="primary" id="loadBtn">Загрузить сводку</button>
        <button id="geoBtn">Определить по геолокации</button>
      </div>
      <div class="error-msg hidden" id="errorMsg"></div>
    </div>
  `,

  dashboard: () => `
    <div class="hidden" id="dashboard">
      <div class="card">
        <div class="loc-row">
          <div class="loc-name" id="locName">—</div>
          <div class="loc-coords" id="locCoords">—</div>
        </div>
        <div class="updated" id="updated">—</div>

        <div class="hero">
          <div class="icon" id="heroIcon"></div>
          <div class="temp" id="heroTemp">—</div>
          <div class="meta">
            <div class="desc" id="heroDesc">—</div>
            <div class="feels" id="heroFeels">—</div>
          </div>
        </div>

        <div class="gauges" id="gauges"></div>

        <div class="section-label">Лента температур · 24 ч</div>
        <div class="chart-wrap">
          <svg id="chart" viewBox="0 0 600 190" preserveAspectRatio="xMidYMid meet"></svg>
        </div>

        <div class="section-label">Прогноз · 5 дней</div>
        <div class="days" id="days"></div>
      </div>
      <div class="footer-note">
        <button class="link" id="backBtn">← изменить город / ключ</button>
      </div>
    </div>
  `,

  gauge: (label, value) => `<div class="gauge"><div class="label">${label}</div><div class="val">${value}</div></div>`,

  dayCard: (dayLabel, iconMarkup, max, min) => `
    <div class="day-card">
      <div class="dname">${dayLabel}</div>
      ${iconMarkup}
      <div class="dmax">${max}°</div>
      <div class="dmin">${min}°</div>
    </div>
  `
};

function mount(){
  const app = $('app');
  app.innerHTML = `
    <div class="container">
      ${TEMPLATES.masthead()}
      ${TEMPLATES.setup()}
      ${TEMPLATES.dashboard()}
    </div>
  `;
}

function tickClock(){
  const now = new Date();
  const d = now.toLocaleDateString('ru-RU',{day:'2-digit',month:'long',year:'numeric'});
  const t = now.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
  $('clock').textContent = `${d} · ${t}`;
}

function iconSVG(code, size=56){
  const stroke = 'var(--brass)';
  const stroke2 = 'var(--sky)';
  const c = code ? code.slice(0,2) : '01';
  let inner = '';

  if(c==='01'){ // ясно
    inner = `<circle cx="28" cy="28" r="11" stroke="${stroke}" stroke-width="1.6" fill="none"/>
      ${[0,45,90,135,180,225,270,315].map(a=>{
        const r1=17,r2=23; const rad=a*Math.PI/180;
        const x1=28+r1*Math.cos(rad), y1=28+r1*Math.sin(rad);
        const x2=28+r2*Math.cos(rad), y2=28+r2*Math.sin(rad);
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1.4" stroke-linecap="round"/>`;
      }).join('')}`;
  } else if(c==='02'||c==='03'||c==='04'){ // облачно
    inner = `<circle cx="21" cy="24" r="8" stroke="${stroke}" stroke-width="1.4" fill="none" opacity="${c==='04'?0.35:0.9}"/>
      <path d="M14 34 a8 8 0 0 1 2-15.8 a10 10 0 0 1 19 2.3 a7 7 0 0 1 -1 15.5 z" stroke="${stroke2}" stroke-width="1.6" fill="none"/>`;
  } else if(c==='09'||c==='10'){ // дождь
    inner = `<path d="M14 26 a8 8 0 0 1 2-15.5 a10 10 0 0 1 19 2 a7 7 0 0 1 -1 15.3 z" stroke="${stroke2}" stroke-width="1.6" fill="none"/>
      ${[18,26,34].map(x=>`<line x1="${x}" y1="34" x2="${x-4}" y2="46" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round"/>`).join('')}`;
  } else if(c==='11'){ // гроза
    inner = `<path d="M14 24 a8 8 0 0 1 2-15.5 a10 10 0 0 1 19 2 a7 7 0 0 1 -1 15.3 z" stroke="${stroke2}" stroke-width="1.6" fill="none"/>
      <path d="M27 32 l-6 11 h6 l-4 9 l10-13 h-6 z" fill="${stroke}" stroke="none"/>`;
  } else if(c==='13'){ // снег
    inner = `<path d="M14 24 a8 8 0 0 1 2-15.5 a10 10 0 0 1 19 2 a7 7 0 0 1 -1 15.3 z" stroke="${stroke2}" stroke-width="1.6" fill="none"/>
      ${[19,28,37].map(x=>`<circle cx="${x}" cy="40" r="1.6" fill="${stroke}"/>`).join('')}`;
  } else { // дымка/туман
    inner = `${[18,26,34,42].map((y,i)=>`<line x1="10" y1="${y}" x2="46" y2="${y}" stroke="${stroke2}" stroke-width="1.5" stroke-linecap="round" opacity="${1-i*0.15}"/>`).join('')}`;
  }
  return `<svg viewBox="0 0 56 56" width="${size}" height="${size}">${inner}</svg>`;
}

function showError(msg){
  const el = $('errorMsg');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function clearError(){ $('errorMsg').classList.add('hidden'); }

function setButtonBusy(id, busyText, idleText){
  const btn = $(id);
  return {
    busy(){ btn.disabled = true; btn.textContent = busyText; },
    idle(){ btn.disabled = false; btn.textContent = idleText; }
  };
}

function bindEvents(){
  $('geoBtn').addEventListener('click', onGeoClick);
  $('loadBtn').addEventListener('click', onLoadClick);
  $('backBtn').addEventListener('click', onBackClick);
}

function onGeoClick(){
  clearError();
  if(!navigator.geolocation){ showError('Геолокация недоступна в этом браузере.'); return; }
  const ui = setButtonBusy('geoBtn', 'Определение...', 'Определить по геолокации');
  ui.busy();
  navigator.geolocation.getCurrentPosition(pos=>{
    state.lat = pos.coords.latitude; state.lon = pos.coords.longitude;
    ui.idle();
    loadWeather();
  }, err=>{
    ui.idle();
    showError('Не удалось получить геолокацию: ' + err.message);
  });
}

function onLoadClick(){
  clearError();
  const city = $('cityInput').value.trim();
  if(city){ geocodeCity(city); }
  else if(state.lat !== null){ loadWeather(); }
  else { showError('Укажите город или нажмите «Определить по геолокации».'); }
}

function onBackClick(){
  $('dashboard').classList.add('hidden');
  $('setup').classList.remove('hidden');
}

const REQUEST_TIMEOUT_MS = 15000;

async function fetchWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try{
    return await fetch(url, { signal: controller.signal });
  }catch(e){
    if(e.name === 'AbortError'){
      throw new Error('сервер не ответил за 15 секунд. Проверьте интернет-соединение или попробуйте позже.');
    }
    throw new Error('сетевая ошибка — запрос не дошёл до сервера (проверьте подключение к интернету).');
  }finally{
    clearTimeout(timer);
  }
}

async function geocodeCity(city){
  const key = $('apiKey').value.trim();
  if(!key){ showError('Введите API-ключ OpenWeather.'); return; }
  state.apiKey = key;
  clearError();
  const ui = setButtonBusy('loadBtn', 'Поиск города...', 'Загрузить сводку');
  ui.busy();
  try{
    const res = await fetchWithTimeout(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${key}`);
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if(!data.length){ showError('Город не найден. Проверьте написание.'); return; }
    state.lat = data[0].lat; state.lon = data[0].lon;
    await loadWeather();
  }catch(e){
    showError('Ошибка геокодирования: ' + e.message);
  }finally{
    ui.idle();
  }
}

async function loadWeather(){
  const key = $('apiKey').value.trim();
  if(!key){ showError('Введите API-ключ OpenWeather.'); return; }
  state.apiKey = key;
  clearError();
  const ui = setButtonBusy('loadBtn', 'Загрузка...', 'Загрузить сводку');
  ui.busy();
  try{
    const [curRes, fcRes] = await Promise.all([
      fetchWithTimeout(`https://api.openweathermap.org/data/2.5/weather?lat=${state.lat}&lon=${state.lon}&units=metric&lang=ru&appid=${key}`),
      fetchWithTimeout(`https://api.openweathermap.org/data/2.5/forecast?lat=${state.lat}&lon=${state.lon}&units=metric&lang=ru&appid=${key}`)
    ]);
    if(!curRes.ok){
      if(curRes.status===401) throw new Error('неверный API-ключ (может ещё не активирован — активация занимает до пары часов после регистрации).');
      throw new Error('HTTP ' + curRes.status);
    }
    if(!fcRes.ok) throw new Error('HTTP ' + fcRes.status);
    const current = await curRes.json();
    const forecast = await fcRes.json();
    renderDashboard(current, forecast);
  }catch(e){
    showError('Не удалось загрузить данные: ' + e.message);
  }finally{
    ui.idle();
  }
}

function renderDashboard(current, forecast){
  $('setup').classList.add('hidden');
  $('dashboard').classList.remove('hidden');

  $('locName').textContent = `${current.name}${current.sys && current.sys.country ? ', ' + current.sys.country : ''}`;
  $('locCoords').textContent = `${current.coord.lat.toFixed(2)}° / ${current.coord.lon.toFixed(2)}°`;
  $('updated').textContent = 'обновлено · ' + new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});

  $('heroIcon').innerHTML = iconSVG(current.weather[0].icon, 56);
  $('heroTemp').innerHTML = `${Math.round(current.main.temp)}<sup>°C</sup>`;
  $('heroDesc').textContent = current.weather[0].description;
  $('heroFeels').textContent = `ощущается как ${Math.round(current.main.feels_like)}°`;

  renderGauges(current);
  renderChart(forecast.list.slice(0,8));
  renderDays(forecast.list);
}

function renderGauges(current){
  const sunrise = new Date(current.sys.sunrise*1000).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
  const sunset = new Date(current.sys.sunset*1000).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
  const windDirs = ['С','ССВ','СВ','ВСВ','В','ВЮВ','ЮВ','ЮЮВ','Ю','ЮЮЗ','ЮЗ','ЗЮЗ','З','ЗСЗ','СЗ','ССЗ'];
  const windDir = windDirs[Math.round((current.wind.deg%360)/22.5)%16];

  const gaugesData = [
    ['Влажность', `${current.main.humidity}<small> %</small>`],
    ['Ветер', `${current.wind.speed.toFixed(1)}<small> м/с ${windDir}</small>`],
    ['Давление', `${Math.round(current.main.pressure*0.750062)}<small> мм рт.ст.</small>`],
    ['Видимость', `${(current.visibility/1000).toFixed(1)}<small> км</small>`],
    ['Восход', sunrise],
    ['Закат', sunset],
  ];
  $('gauges').innerHTML = gaugesData.map(([l,v]) => TEMPLATES.gauge(l,v)).join('');
}

function renderChart(points){
  const W=600, H=190, padL=36, padR=14, padT=16, padB=28;
  const temps = points.map(p=>p.main.temp);
  const min = Math.min(...temps), max = Math.max(...temps);
  const range = (max-min) || 1;
  const stepX = (W-padL-padR)/(points.length-1);

  const yFor = t => padT + (1 - (t-min)/range) * (H-padT-padB);
  const xFor = i => padL + i*stepX;

  let grid = '';
  for(let i=0;i<=3;i++){
    const y = padT + i*(H-padT-padB)/3;
    grid += `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="var(--line-soft)" stroke-width="1"/>`;
  }
  points.forEach((p,i)=>{
    grid += `<line x1="${xFor(i)}" y1="${padT}" x2="${xFor(i)}" y2="${H-padB}" stroke="var(--line-soft)" stroke-width="1" stroke-dasharray="2,3"/>`;
  });

  const pathD = points.map((p,i)=>`${i===0?'M':'L'} ${xFor(i)} ${yFor(p.main.temp)}`).join(' ');
  const areaD = pathD + ` L ${xFor(points.length-1)} ${H-padB} L ${xFor(0)} ${H-padB} Z`;

  const dots = points.map((p,i)=>`<circle cx="${xFor(i)}" cy="${yFor(p.main.temp)}" r="2.6" fill="var(--red)"/>`).join('');
  const labels = points.map((p,i)=>{
    const time = new Date(p.dt*1000).toLocaleTimeString('ru-RU',{hour:'2-digit'});
    return `<text x="${xFor(i)}" y="${H-8}" font-size="9" fill="var(--muted)" text-anchor="middle" font-family="JetBrains Mono, monospace">${time}</text>
            <text x="${xFor(i)}" y="${yFor(p.main.temp)-9}" font-size="10" fill="var(--parchment)" text-anchor="middle" font-family="JetBrains Mono, monospace">${Math.round(p.main.temp)}°</text>`;
  }).join('');

  $('chart').innerHTML = `
    ${grid}
    <path d="${areaD}" fill="var(--red)" opacity="0.06"/>
    <path d="${pathD}" fill="none" stroke="var(--red)" stroke-width="1.6"/>
    ${dots}
    ${labels}
  `;
}

function renderDays(list){
  const byDay = {};
  list.forEach(p=>{
    const day = new Date(p.dt*1000).toLocaleDateString('ru-RU',{weekday:'short'});
    const key = new Date(p.dt*1000).toDateString();
    if(!byDay[key]) byDay[key] = { day, temps:[], icon:p.weather[0].icon, noonDist:Infinity };
    byDay[key].temps.push(p.main.temp);
    const hour = new Date(p.dt*1000).getHours();
    const dist = Math.abs(hour-13);
    if(dist < byDay[key].noonDist){ byDay[key].noonDist = dist; byDay[key].icon = p.weather[0].icon; }
  });

  const keys = Object.keys(byDay).slice(0,5);
  $('days').innerHTML = keys.map(k=>{
    const d = byDay[k];
    const max = Math.round(Math.max(...d.temps));
    const min = Math.round(Math.min(...d.temps));
    return TEMPLATES.dayCard(d.day, iconSVG(d.icon, 26), max, min);
  }).join('');
}

function init(){
  mount();
  tickClock();
  setInterval(tickClock, 30000);
  bindEvents();
}

document.addEventListener('DOMContentLoaded', init);
