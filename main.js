// =========================================================
// CONTRATEMPO — main.js (PATCHED VERSION)
// Fixes: Rebirth=1Qa, Login=ComingSoon, No Music, Offline Bug
// =========================================================

const SAVE_KEY = 'contratempo_save_v1';
const REBIRTH_COST = 1e199;

// ---------- TRADUÇÕES ----------
const I18N = {
    pt: {
        clickBtn: 'CLIQUE PARA ACELERAR',
        upgrades: 'UPGRADES',
        pontos: 'PONTOS',
        pps: 'P/S',
        settings: 'CONFIGURAÇÕES',
        login: 'LOGIN',
        stats: 'ESTATÍSTICAS',
        somGraf: 'SONS E GRÁFICOS',
        modoLeve: 'MODO LEVE',
        popups: 'POPUPS',
        sfx: 'EFEITOS SONOROS',
        tremores: 'TREMORES',
        cutscenes: 'CUTSCENES',
        idioma: 'IDIOMA',
        misc: 'MISC',
        atualizacoes: 'ATUALIZAÇÕES',
        importExport: 'IMPORTAR/EXPORTAR SAVE',
        sobre: 'SOBRE O JOGO',
        creditos: 'CRÉDITOS',
        dropToast: 'CONTRATEMPO! O TEMPO ACABOU.',
        devText: 'Em desenvolvimento',
        max: 'MÁXIMO',
        nivel: 'NÍVEL',
        salvar: 'SALVAR',
        close: 'Fechar',
        rebirth: 'RENASCIMENTO',
        rebirthDesc: 'Resete o jogo e ganhe +1% de bônus por upgrade (exponencial)',
        rebirthConfirm: 'Tem certeza? Seus upgrades serão zerados, mas você ganha +1% permanente por cada upgrade que comprou.',
        offlineMessage: 'Você ficou fora por {time}, e ganhou {points} pontos!',
        comingSoon: 'EM BREVE' // ADDED
    },
    en: {
        clickBtn: 'CLICK TO BOOST',
        upgrades: 'UPGRADES',
        pontos: 'POINTS',
        pps: 'P/S',
        settings: 'SETTINGS',
        login: 'LOGIN',
        stats: 'STATISTICS',
        somGraf: 'SOUND & GRAPHICS',
        modoLeve: 'LIGHT MODE',
        popups: 'POPUPS',
        sfx: 'SOUND EFFECTS',
        tremores: 'SHAKE FX',
        cutscenes: 'CUTSCENES',
        idioma: 'LANGUAGE',
        misc: 'MISC',
        atualizacoes: 'UPDATES',
        importExport: 'IMPORT/EXPORT SAVE',
        sobre: 'ABOUT THE GAME',
        creditos: 'CREDITS',
        dropToast: 'CONTRATEMPO! TIME RAN OUT.',
        devText: 'Under development',
        max: 'MAX',
        nivel: 'LEVEL',
        salvar: 'SAVE',
        close: 'Close',
        rebirth: 'REBIRTH',
        rebirthDesc: 'Reset the game and gain +1% bonus per upgrade (exponential)',
        rebirthConfirm: 'Are you sure? Your upgrades will be reset, but you gain +1% permanently for each upgrade you bought.',
        offlineMessage: 'You were away for {time}, and earned {points} points!',
        comingSoon: 'COMING SOON' // ADDED
    },
};

// ---------- ESTADO GLOBAL ----------
const state = {
    points: new ExpantaNum(0),
    basePps: new ExpantaNum(1),
    pps: new ExpantaNum(1),
    stats: {
        maxMultiplier: 1.0,
        totalClicks: 0,
        totalDrops: 0,
        bestPoints: 0,
        totalUpgradesBought: 0,
    },
    rebirthCount: 0,
    rebirthMultiplier: 1,
    settings: {
        modoLeve: false,
        popups: true,
        sfx: true,
        tremores: true,
        cutscenes: true,
        lang: 'pt',
    },
    username: '',
    upgradeLevels: {},
};

function t(key) { return I18N[state.settings.lang][key] || key; }

// ---------- FORMATAÇÃO DE NÚMEROS GRANDES ----------
const SUFFIXES = [
    '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'De', 'Ude', 'Dde', 'Tde', 'Qade', 'Qide', 'Sxde', 'Spde', 'Ocde', 'Node',
    'Vg', 'Uvg', 'Dvg', 'Tvg', 'Qavg', 'Qivg', 'Sxvg', 'Spvg', 'Ocvg', 'Novg',
    'Tg', 'Utg', 'Dtg', 'Ttg', 'Qatg', 'Qitg', 'Sxtg', 'Sptg', 'Octg', 'Notg',
    'Qag', 'Uqag', 'Dqag', 'Tqag', 'Qaqag', 'Qiqag', 'Sxqag', 'Spqag', 'Ocqag', 'Noqag',
    'Qig', 'Uqig', 'Dqig', 'Tqig', 'Qaqig', 'Qiqig', 'Sxqig', 'Spqig', 'Ocqig', 'Noqig',
    'Sxg', 'Usxg', 'Dsxg', 'Tsxg', 'Qasxg', 'Qisxg', 'Sxsxg', 'Spsxg', 'Ocsxg', 'Nosxg',
    'Spg', 'Uspg', 'Dspg', 'Tspg', 'Qaspg', 'Qispg', 'Sxspg', 'Spspg', 'Ocspg', 'Nospg',
    'Ocg', 'Uocg', 'Docg', 'Tocg', 'Qaocg', 'Qiocg', 'Sxocg', 'Spocg', 'Ococg', 'Noocg',
    'Nog', 'Unog', 'Dnog', 'Tnog', 'Qanog', 'Qinog', 'Sxnog', 'Spnog', 'Ocnog', 'Nonog',
    'Ce'
];

function formatNumber(num) {
    const isExp = (typeof num === 'object' && num !== null && typeof num.toNumber === 'function');
    const value = isExp ? num : new ExpantaNum(num);

    if (value.lt(1000)) {
        const n = value.toNumber();
        return (isFinite(n) ? n : 0).toFixed(0);
    }

    // Max suffix tier this array supports (index 0 = '', last index = 'Ce')
    const maxTierValue = new ExpantaNum(1000).pow(SUFFIXES.length - 1);

    if (value.lt(maxTierValue.mul(1000))) {
        // Safe to work in log space without precision loss from toNumber()
        const log1000 = value.log10().toNumber() / 3;
        let idx = Math.floor(log1000);
        if (idx >= SUFFIXES.length) idx = SUFFIXES.length - 1;
        if (idx < 0) idx = 0;
        const n = value.div(new ExpantaNum(1000).pow(idx)).toNumber();
        const decimals = n >= 100 ? 0 : n >= 10 ? 1 : 2;
        return n.toFixed(decimals) + SUFFIXES[idx];
    }

    // Beyond suffix range: use ExpantaNum's own notation, never plain toNumber()
    return value.toString();
}

// ---------- DEFINIÇÃO DE UPGRADES ----------
const UPGRADES = [
    { id: 'gen1', name: { pt: 'GERADOR I', en: 'GENERATOR I' }, desc: { pt: 'Gera pontos constantes. +5 P/S.', en: 'Constant generation. +5 P/S.' }, baseCost: 50, growth: 1.50, maxLevel: 999, apply: (lvl) => { state._gen1 = lvl * 5; recalcPps(); } },
    { id: 'gen2', name: { pt: 'GERADOR II', en: 'GENERATOR II' }, desc: { pt: 'Multiplica Gerador I em ×1.3.', en: 'Multiplies Gen I by ×1.3.' }, baseCost: 300, growth: 1.75, maxLevel: 999, apply: (lvl) => { state._gen2 = lvl; recalcPps(); } },
    { id: 'gen3', name: { pt: 'GERADOR III', en: 'GENERATOR III' }, desc: { pt: 'Multiplica produção em ×1.8.', en: 'Multiplies output by ×1.8.' }, baseCost: 2000, growth: 1.95, maxLevel: 999, apply: (lvl) => { state._gen3 = lvl; recalcPps(); } },
    { id: 'gen4', name: { pt: 'GERADOR IV', en: 'GENERATOR IV' }, desc: { pt: 'Multiplica total em ×2.2.', en: 'Multiplies total by ×2.2.' }, baseCost: 15000, growth: 2.05, maxLevel: 999, apply: (lvl) => { state._gen4 = lvl; recalcPps(); } },
    { id: 'sincronia', name: { pt: 'SINCRONIA', en: 'SYNC' }, desc: { pt: '+1.5% do P/S total.', en: '+1.5% of total P/S.' }, baseCost: 800, growth: 1.40, maxLevel: 999, apply: (lvl) => { state._sincronia = lvl; recalcPps(); } },
    { id: 'nucleo', name: { pt: 'NÚCLEO TEMPORAL', en: 'TEMPORAL CORE' }, desc: { pt: 'Multiplica P/S em ×1.4.', en: 'Multiplies P/S by ×1.4.' }, baseCost: 50000, growth: 2.15, maxLevel: 999, apply: (lvl) => { state._nucleo = lvl; recalcPps(); } },
];

function recalcPps() {
    const gen1Lvl = state._gen1 || 0;
    const gen2Lvl = state._gen2 || 0;
    const gen3Lvl = state._gen3 || 0;
    const gen4Lvl = state._gen4 || 0;
    const sincroniaLvl = state._sincronia || 0;
    const nucleoLvl = state._nucleo || 0;
    
    let baseProd = new ExpantaNum(gen1Lvl);
    if (gen2Lvl > 0) baseProd = baseProd.mul(new ExpantaNum(1.3).pow(gen2Lvl));
    if (gen3Lvl > 0) baseProd = baseProd.mul(new ExpantaNum(1.8).pow(gen3Lvl));
    if (gen4Lvl > 0) baseProd = baseProd.mul(new ExpantaNum(2.2).pow(gen4Lvl));
    
    const syncFactor = new ExpantaNum(1 + 0.015 * sincroniaLvl);
    let withSync = baseProd.mul(syncFactor);
    let withNucleo = withSync.mul(new ExpantaNum(1.4).pow(nucleoLvl));
    let withRebirth = withNucleo.mul(new ExpantaNum(state.rebirthMultiplier));
    
    state.pps = state.basePps.add(withRebirth);
}

function upgradeCost(upg) {
    const lvl = state.upgradeLevels[upg.id] || 0;
    return Math.ceil(upg.baseCost * Math.pow(upg.growth, lvl));
}

function buyUpgrade(upg) {
    const lvl = state.upgradeLevels[upg.id] || 0;
    if (lvl >= upg.maxLevel) return;
    const cost = upgradeCost(upg);
    if (state.points.lt(cost)) return;
    
    state.points = state.points.sub(cost);
    state.upgradeLevels[upg.id] = lvl + 1;
    state.stats.totalUpgradesBought += 1;
    upg.apply(lvl + 1);
    playSfx('buy');
    renderUpgrades();
    updateTopStats();
    saveGame();
}

// ---------- REFERÊNCIAS DOM ----------
const pointsDisplay = document.getElementById('points-display');
const ppsDisplay = document.getElementById('pps-display');
const clickBtn = document.getElementById('click-boost');
const upgradesList = document.getElementById('upgrades-list');
const floatersContainer = document.getElementById('floaters');
const dropToast = document.getElementById('drop-toast');
const settingsBtn = document.getElementById('settings-btn');
const settingsOverlay = document.getElementById('settings-overlay');
const closeSettings = document.getElementById('close-settings');
const devOverlay = document.getElementById('dev-overlay');
const closeDev = document.getElementById('close-dev');
const devTitle = document.getElementById('dev-title');
const devBody = document.getElementById('dev-body');

// ---------- RENDER: UPGRADES ----------
function renderUpgrades() {
    upgradesList.innerHTML = '';
    UPGRADES.forEach((upg) => {
        const lvl = state.upgradeLevels[upg.id] || 0;
        const maxed = lvl >= upg.maxLevel;
        const cost = upgradeCost(upg);
        const affordable = !maxed && state.points.gte(cost);
        const lang = state.settings.lang;
        
        const card = document.createElement('div');
        card.className = 'upgrade-card' + (affordable ? ' affordable' : '') + (maxed ? ' maxed' : '');
        card.innerHTML = `
            <div class="upgrade-name">${upg.name[lang]}</div>
            <div class="upgrade-desc">${upg.desc[lang]}</div>
            <div class="upgrade-footer">
                <span class="upgrade-cost ${affordable ? '' : 'cant-afford'}">${maxed ? t('max') : formatNumber(cost) + ' PTS'}</span>
                <span class="upgrade-level">${t('nivel')} ${lvl}/${upg.maxLevel}</span>
            </div>
        `;
        if (!maxed) card.addEventListener('click', () => buyUpgrade(upg));
        upgradesList.appendChild(card);
    });
}

// ---------- RENDER: STATS ----------
function updateTopStats() {
    pointsDisplay.textContent = formatNumber(state.points);
    ppsDisplay.textContent = formatNumber(state.pps);
    const ppsBottom = document.getElementById('pps-display-bottom');
    if (ppsBottom) ppsBottom.textContent = 'P/S: ' + formatNumber(state.pps);
}

// ---------- FLOATERS ----------
function spawnFloater(text) {
    if (!state.settings.popups || !floatersContainer) return;
    const el = document.createElement('div');
    el.className = 'floater';
    el.textContent = text;
    el.style.left = (40 + Math.random() * 20) + '%';
    el.style.top = (30 + Math.random() * 30) + '%';
    floatersContainer.appendChild(el);
    setTimeout(() => el.remove(), 950);
}

// ---------- TOAST ----------
let toastTimeout = null;
function showDropToast(customMsg) {
    if (!dropToast) return;
    dropToast.textContent = customMsg || t('dropToast');
    dropToast.classList.remove('hidden');
    dropToast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => dropToast.classList.remove('show'), customMsg ? 4000 : 1800);
}

// ---------- SFX ----------
let audioCtx = null;
function playSfx(type) {
    if (!state.settings.sfx) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        if (type === 'click') { osc.frequency.value = 520; gain.gain.value = 0.05; } 
        else if (type === 'buy') { osc.frequency.value = 720; gain.gain.value = 0.06; } 
        else if (type === 'drop') { osc.frequency.value = 140; gain.gain.value = 0.08; } 
        else if (type === 'levelup') { osc.frequency.value = 880; gain.gain.value = 0.07; }
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.stop(audioCtx.currentTime + 0.16);
    } catch (e) {}
}

// ---------- REBIRTH SYSTEM ----------
function performRebirth() {
    const rebirthCostEN = new ExpantaNum(REBIRTH_COST);
    if (state.points.lt(rebirthCostEN)) return;

    state.points = state.points.sub(rebirthCostEN);
    triggerRebirthCutscene();

    setTimeout(() => {
        state.rebirthCount += 1;
        state.rebirthMultiplier = Math.pow(2, state.rebirthCount / 4);
        state.points = new ExpantaNum(0);
        state.upgradeLevels = {};
        state._gen1 = 0; state._gen2 = 0; state._gen3 = 0; state._gen4 = 0; state._sincronia = 0; state._nucleo = 0;
        recalcPps();
        renderUpgrades();
        updateTopStats();
        saveGame();
        playSfx('levelup');
    }, 1500);
}

function triggerRebirthCutscene() {
    if (!state.settings.cutscenes) return;
    const flash = document.createElement('div');
    flash.id = 'rebirth-flash';
    flash.style.cssText = `position:fixed;inset:0;background:white;opacity:0;z-index:999;pointer-events:none;`;
    document.body.appendChild(flash);

    const pointsEl = document.getElementById('points-display');
    let counter = 0;
    const countInterval = setInterval(() => {
        counter++;
        if(pointsEl) pointsEl.textContent = formatNumber(new ExpantaNum(Math.random() * 1e100).mul(new ExpantaNum(10).pow(Math.random() * 300)));
        if (counter > 40) {
            clearInterval(countInterval);
            flash.style.transition = 'opacity 0.5s';
            flash.style.opacity = '1';
            setTimeout(() => {
                flash.style.opacity = '0';
                if(pointsEl) pointsEl.textContent = '0';
                flash.remove();
            }, 500);
        }
    }, 30);
}

let rebirthWasAvailable = false;
function checkRebirthAvailable() {
    const rebirthBtn = document.getElementById('rebirth-btn');
    if (!rebirthBtn) return;
    const rebirthCostEN = new ExpantaNum(REBIRTH_COST);
    const available = state.points.gte(rebirthCostEN);
    if (available === rebirthWasAvailable) return; // avoid restarting animation every frame
    rebirthWasAvailable = available;
    rebirthBtn.classList.toggle('rebirth-hidden', !available);
    rebirthBtn.classList.toggle('rebirth-ready', available);
    rebirthBtn.textContent = t('rebirth') + ' (' + formatNumber(REBIRTH_COST) + ')';
}

// ---------- BLOQUEIO DE SELEÇÃO ----------
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
}, false);

// ---------- OVERLAYS ----------
function openOverlay(el) { if(el) el.classList.remove('hidden'); }
function closeOverlay(el) { if(el) el.classList.add('hidden'); }

if(settingsBtn) settingsBtn.addEventListener('click', () => openOverlay(settingsOverlay));
if(closeSettings) closeSettings.addEventListener('click', () => closeOverlay(settingsOverlay));
if(settingsOverlay) settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) closeOverlay(settingsOverlay); });

// ---------- CONTEÚDO DAS ABAS ----------
const CHANGELOG_PT = `<h3 class="dev-subtitle">UPDATE v0.1.0</h3><p class="dev-text">Correção de bugs, ajuste de Rebirth para 1 Qa e remoção de trilha sonora.</p>`;
const CHANGELOG_EN = `<h3 class="dev-subtitle">UPDATE v0.1.0</h3><p class="dev-text">Bug fixes, Rebirth adjusted to 1 Qa, soundtrack removed.</p>`;

function openDev(key) {
    closeOverlay(settingsOverlay);
    const lang = state.settings.lang;
    
    if (key === 'updates') {
        devTitle.textContent = t('atualizacoes');
        devBody.innerHTML = lang === 'pt' ? CHANGELOG_PT : CHANGELOG_EN;
    } 
    else if (key === 'stats') {
        devTitle.textContent = t('stats');
        devBody.innerHTML = `
            <div class="stats-grid">
                <div class="stats-row"><span>P/S Máximo</span><b>${formatNumber(state.pps)}</b></div>
                <div class="stats-row"><span>Pontos Totais</span><b>${formatNumber(state.points)}</b></div>
                <div class="stats-row"><span>Upgrades Comprados</span><b>${state.stats.totalUpgradesBought}</b></div>
                <div class="stats-row"><span>Renascimentos</span><b>${state.rebirthCount}</b></div>
            </div>
        `;
    } 
    // FIXED: Login now shows Coming Soon
    else if (key === 'login') {
        devTitle.textContent = t('login');
        devBody.innerHTML = `<p class="dev-text" style="font-size:18px;margin-top:20px;text-align:center;">${t('comingSoon')}</p>`;
    } 
    else if (key === 'about') {
        devTitle.textContent = t('sobre');
        devBody.innerHTML = `<p class="dev-text">CONTRATEMPO — v0.1.0 BETA.</p>`;
    } 
    else if (key === 'credits') {
        devTitle.textContent = t('creditos');
        devBody.innerHTML = `<p class="dev-text">Desenvolvido com HTML, CSS e JS puro.</p>`;
    } 
    else if (key === 'import-export') {
        devTitle.textContent = t('importExport');
        devBody.innerHTML = `
            <textarea id="save-textarea" class="text-input" rows="4"></textarea>
            <button class="menu-item" id="export-btn">EXPORTAR</button>
            <button class="menu-item" id="import-btn">IMPORTAR</button>
        `;
        setTimeout(() => {
            const exportBtn = document.getElementById('export-btn');
            const importBtn = document.getElementById('import-btn');
            const textarea = document.getElementById('save-textarea');
            if (exportBtn) exportBtn.addEventListener('click', () => { textarea.value = localStorage.getItem(SAVE_KEY) || ''; });
            if (importBtn) importBtn.addEventListener('click', () => {
                try {
                    const parsed = JSON.parse(textarea.value);
                    localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
                    loadGame(); renderUpgrades(); updateTopStats(); closeOverlay(devOverlay);
                    showDropToast(state.settings.lang === 'pt' ? 'Save importado com sucesso!' : 'Save imported successfully!');
                } catch (e) {
                    alert(state.settings.lang === 'pt' ? 'Save inválido.' : 'Invalid save.');
                }
            });
        }, 0);
    } 
    else {
        devTitle.textContent = t(key) || key.toUpperCase();
        devBody.innerHTML = `<p class="dev-text">${t('devText')}</p>`;
    }
    openOverlay(devOverlay);
}

if(closeDev) closeDev.addEventListener('click', () => closeOverlay(devOverlay));
if(devOverlay) devOverlay.addEventListener('click', (e) => { if (e.target === devOverlay) closeOverlay(devOverlay); });

// Event Listeners para botões do menu
const btnIds = ['btn-login', 'btn-stats', 'btn-updates', 'btn-import-export', 'btn-about', 'btn-credits'];
btnIds.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('click', () => openDev(id.replace('btn-', '')));
});

const discordBtn = document.getElementById('btn-discord');
if(discordBtn) discordBtn.addEventListener('click', () => window.open('https://dsc.gg/contratempo', '_blank'));

const rebirthBtn = document.getElementById('rebirth-btn');
if(rebirthBtn) rebirthBtn.addEventListener('click', performRebirth);

// ---------- CLICK TO BOOST ----------
if (clickBtn) {
    clickBtn.addEventListener('click', (e) => {
        state.stats.totalClicks += 1;
        // Click gives a burst equal to 1 second of current P/S (min 1 point)
        const clickGain = state.pps.gt(0) ? state.pps.clone() : new ExpantaNum(1);
        state.points = state.points.add(clickGain);
        spawnFloater('+' + formatNumber(clickGain));
        playSfx('click');
        updateTopStats();
    });
}

// ---------- TOGGLES ----------
function bindToggle(buttonId, key) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    const stateEl = btn.querySelector('.toggle-state');
    const render = () => {
        const val = state.settings[key];
        stateEl.textContent = val ? 'ON' : 'OFF';
        stateEl.classList.toggle('off', !val);
    };
    btn.addEventListener('click', () => { state.settings[key] = !state.settings[key]; render(); saveGame(); });
    render();
}

bindToggle('btn-modo-leve', 'modoLeve');
bindToggle('btn-popups', 'popups');
bindToggle('btn-sfx', 'sfx');
bindToggle('btn-tremores', 'tremores');
bindToggle('btn-cutscenes', 'cutscenes');

// ---------- IDIOMA ----------
const langPtBtn = document.getElementById('lang-pt');
const langEnBtn = document.getElementById('lang-en');

function renderLangButtons() {
    if(langPtBtn) langPtBtn.classList.toggle('lang-active', state.settings.lang === 'pt');
    if(langEnBtn) langEnBtn.classList.toggle('lang-active', state.settings.lang === 'en');
}

function setLang(lang) {
    state.settings.lang = lang;
    renderLangButtons();
    applyStaticTexts();
    renderUpgrades();
    updateTopStats();
    saveGame();
}

if(langPtBtn) langPtBtn.addEventListener('click', () => setLang('pt'));
if(langEnBtn) langEnBtn.addEventListener('click', () => setLang('en'));

// ---------- TEXTOS ESTÁTICOS ----------
function applyStaticTexts() {
    const setTxt = (id, key) => { const el = document.getElementById(id); if(el) el.textContent = t(key); };
    setTxt('upgrades-title', 'upgrades');
    setTxt('points-label', 'pontos');
    setTxt('pps-label', 'pps');
    if(clickBtn) clickBtn.textContent = t('clickBtn');
    setTxt('settings-title', 'settings');
    setTxt('btn-login', 'login');
    setTxt('section-som', 'somGraf');
    
    const modoLeveSpan = document.querySelector('#btn-modo-leve span'); if(modoLeveSpan) modoLeveSpan.textContent = t('modoLeve');
    const popupsSpan = document.querySelector('#btn-popups span'); if(popupsSpan) popupsSpan.textContent = t('popups');
    const sfxSpan = document.querySelector('#btn-sfx span'); if(sfxSpan) sfxSpan.textContent = t('sfx');
    const tremoresSpan = document.querySelector('#btn-tremores span'); if(tremoresSpan) tremoresSpan.textContent = t('tremores');
    const cutscenesSpan = document.querySelector('#btn-cutscenes span'); if(cutscenesSpan) cutscenesSpan.textContent = t('cutscenes');
    
    setTxt('lang-label', 'idioma');
    setTxt('section-misc', 'misc');
    setTxt('btn-updates', 'atualizacoes');
    setTxt('btn-import-export', 'importExport');
    setTxt('btn-about', 'sobre');
    setTxt('btn-credits', 'creditos');
    setTxt('btn-stats', 'stats');
    if(closeDev) closeDev.setAttribute('aria-label', t('close'));
}

// ---------- PERSISTÊNCIA ----------
function saveGame() {
    try {
        const data = {
            points: state.points.toString(),
            stats: state.stats,
            settings: state.settings,
            upgradeLevels: state.upgradeLevels,
            rebirthCount: state.rebirthCount,
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        localStorage.setItem('contratempo_last_save_time', Date.now().toString());
    } catch (e) {}
}

function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        
        state.points = new ExpantaNum(data.points || 0);
        state.stats = Object.assign(state.stats, data.stats || {});
        state.settings = Object.assign(state.settings, data.settings || {});
        state.upgradeLevels = data.upgradeLevels || {};
        state.rebirthCount = data.rebirthCount || 0;
        state.rebirthMultiplier = Math.pow(2, state.rebirthCount / 4);
        
        UPGRADES.forEach((upg) => {
            const lvl = state.upgradeLevels[upg.id] || 0;
            if (lvl > 0) upg.apply(lvl);
        });
        recalcPps();
        
        // Offline Gains
        const lastTimestamp = parseFloat(localStorage.getItem('contratempo_last_save_time')) || Date.now();
        const elapsedSeconds = (Date.now() - lastTimestamp) / 1000;
        
        if (elapsedSeconds > 5 && state.pps.gt(0)) {
            const offlinePoints = state.pps.mul(elapsedSeconds);
            state.points = state.points.add(offlinePoints);
            
            const hours = Math.floor(elapsedSeconds / 3600);
            const minutes = Math.floor((elapsedSeconds % 3600) / 60);
            const seconds = Math.floor(elapsedSeconds % 60);
            let timeStr = '';
            if (hours > 0) timeStr += hours + 'h ';
            if (minutes > 0) timeStr += minutes + 'm ';
            if (seconds > 0) timeStr += seconds + 's';
            
            const msgTemplate = t('offlineMessage');
            const message = msgTemplate.replace('{time}', timeStr.trim()).replace('{points}', formatNumber(offlinePoints));
            
            // FIXED: Use Toast instead of Floater for long messages
            showDropToast(message);
        }
    } catch (e) {}
}

setInterval(saveGame, 10000);
window.addEventListener('beforeunload', saveGame);

// ---------- GAME LOOP ----------
let lastFrame = performance.now();
function gameLoop(now) {
    const dt = (now - lastFrame) / 1000;
    lastFrame = now;
    if (state.pps.gt(0)) state.points = state.points.add(state.pps.mul(dt));
    checkRebirthAvailable();
    updateTopStats();
    requestAnimationFrame(gameLoop);
}

// ---------- INIT ----------
function init() {
    loadGame();
    renderLangButtons();
    applyStaticTexts();
    renderUpgrades();
    updateTopStats();
    requestAnimationFrame(gameLoop);
}
init();