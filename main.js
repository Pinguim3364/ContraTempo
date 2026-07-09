// =========================================================
// CONTRATEMPO — main.js (PATCHED VERSION)
// Fixes: Rebirth=1Qa, Login=ComingSoon, No Music, Offline Bug
// =========================================================

const SAVE_KEY = 'contratempo_save_v1';
const REBIRTH_COST = 1e15;

// ---------- TRADUÇÕES ----------
const I18N = {
    pt: {
        clickBtn: 'CLIQUE PARA ACELERAR',
        upgrades: 'UPGRADES',
        pontos: 'PONTOS',
        pps: 'P/S',
        settings: 'CONFIGURAÇÕES',
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
        rebirthDesc: 'Perca tudo, mas ganhe +150% de pontos permanentemente, além de redução de custo e bônus de velocidade que aumentam a cada Renascimento.',
        rebirthConfirm: 'Tem certeza? Você perde TODOS os upgrades e pontos, mas ganha +150% de pontos, redução de custo dos upgrades e bônus de tempo permanentes.',
        offlineMessage: 'Você ficou fora por {time}, e ganhou {points} pontos!',
        comingSoon: 'EM BREVE' // ADDED
    },
    en: {
        clickBtn: 'CLICK TO BOOST',
        upgrades: 'UPGRADES',
        pontos: 'POINTS',
        pps: 'P/S',
        settings: 'SETTINGS',
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
        rebirthDesc: 'Lose everything, but gain +150% points permanently, plus cost reduction and speed bonuses that grow with each Rebirth.',
        rebirthConfirm: 'Are you sure? You lose ALL upgrades and points, but gain +150% points, upgrade cost reduction, and a permanent time bonus.',
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
    // Upgrade levels (initialized to 0)
    _gen1: 0,
    _gen2: 0,
    _gen3: 0,
    _gen4: 0,
    _expansao: 0,
    _rebirthUnlock: 0,
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
    {
        id: 'gen1', maxLevel: 999999,
        name: { pt: 'GERADOR', en: 'GENERATOR' },
        desc: { pt: '+1 P/S por upgrade.', en: '+1 P/S per upgrade.' },
        baseCost: 10, growth: 1,
        apply: (lvl) => { state._gen1 = lvl; recalcPps(); }
    },
    {
        id: 'gen2', maxLevel: 999999,
        name: { pt: 'DUPLICADOR', en: 'DUPLICATOR' },
        desc: { pt: '1.5x mais pontos/s.', en: '1.5x more points/s.' },
        baseCost: 3000, growth: 1.75,
        apply: (lvl) => { state._gen2 = lvl; recalcPps(); }
    },
    {
        id: 'gen3', maxLevel: 999999,
        name: { pt: 'AMPLIFICADOR', en: 'AMPLIFIER' },
        desc: { pt: '1.8x pontos a cada upgrade de Duplicador.', en: '1.8x points per Duplicator upgrade.' },
        baseCost: 100000, growth: 2,
        apply: (lvl) => { state._gen3 = lvl; recalcPps(); }
    },
    {
        id: 'expansao', maxLevel: 1,
        name: { pt: 'EXPANSÃO', en: 'EXPANSION' },
        desc: { pt: 'Desbloqueia mais upgrades.', en: 'Unlocks more upgrades.' },
        baseCost: 1000000, growth: 1,
        apply: (lvl) => { state._expansao = lvl; }
    },
    {
        id: 'gen4', maxLevel: 999999,
        name: { pt: 'CATALISADOR', en: 'CATALYST' },
        desc: { pt: '2.2x mais pontos a cada upgrade de Amplificador.', en: '2.2x more points per Amplifier upgrade.' },
        baseCost: 1000000000, growth: 2.5,
        apply: (lvl) => { state._gen4 = lvl; recalcPps(); }
    },
    {
        id: 'rebirthUnlock', maxLevel: 1,
        name: { pt: 'DESBLOQUEIO DE RENASCIMENTO', en: 'REBIRTH UNLOCK' },
        desc: { pt: 'Desbloqueia o sistema de Renascimento.', en: 'Unlocks the Rebirth system.' },
        baseCost: 10000000000000, growth: 1,
        apply: (lvl) => { state._rebirthUnlock = lvl; }
    },
];

function recalcPps() {
    const gen1Lvl = state._gen1 || 0;
    const gen2Lvl = state._gen2 || 0;
    const gen3Lvl = state._gen3 || 0;
    const gen4Lvl = state._gen4 || 0;

    // Base: +1 P/S per Gerador level
    let baseProd = new ExpantaNum(gen1Lvl);
    // Duplicador: 1.5x per level
    if (gen2Lvl > 0) baseProd = baseProd.mul(new ExpantaNum(1.5).pow(gen2Lvl));
    // Amplificador: 1.8x per Duplicador level owned
    if (gen3Lvl > 0) baseProd = baseProd.mul(new ExpantaNum(1.8).pow(Math.min(gen3Lvl, gen2Lvl) || gen3Lvl));
    // Catalisador: 2.2x per Amplificador level owned
    if (gen4Lvl > 0) baseProd = baseProd.mul(new ExpantaNum(2.2).pow(Math.min(gen4Lvl, gen3Lvl) || gen4Lvl));

    // Rebirth bonus: +150% points per rebirth (multiplicative stack)
    const rebirthPointsMult = new ExpantaNum(2.5).pow(state.rebirthCount);
    // Rebirth time bonus: 25% first rebirth, +0.5%/rebirth after, capped 75% -> boosts P/S output
    const timeBonusPct = getRebirthTimeBonusPct();
    const timeMult = new ExpantaNum(1 + timeBonusPct);

    let withRebirth = baseProd.mul(rebirthPointsMult).mul(timeMult);
    state.pps = state.basePps.add(withRebirth);
}

// ---------- BÔNUS DE RENASCIMENTO ----------
function getRebirthCostReductionPct() {
    if (state.rebirthCount <= 0) return 0;
    if (state.rebirthCount === 1) return 0.20;
    const pct = 0.20 + (state.rebirthCount - 1) * 0.005;
    return Math.min(pct, 0.50);
}

function getRebirthTimeBonusPct() {
    if (state.rebirthCount <= 0) return 0;
    if (state.rebirthCount === 1) return 0.25;
    const pct = 0.25 + (state.rebirthCount - 1) * 0.005;
    return Math.min(pct, 0.75);
}

function upgradeCost(upg) {
    const lvl = state.upgradeLevels[upg.id] || 0;
    const raw = new ExpantaNum(upg.baseCost).mul(new ExpantaNum(upg.growth).pow(lvl));
    const reduction = getRebirthCostReductionPct();
    if (reduction <= 0) return raw;
    return raw.mul(1 - reduction);
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
    UPGRADES.forEach((upg, idx) => {
        // Upgrades 5+ only show if upgrade 4 (Expansão) is purchased
        if (idx >= 4 && !state._expansao) return;
        
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
    if (!state._rebirthUnlock) return;

    state.points = state.points.sub(rebirthCostEN);
    triggerRebirthCutscene();

    setTimeout(() => {
        state.rebirthCount += 1;
        state.points = new ExpantaNum(0);
        state.upgradeLevels = {};
        state._gen1 = 0; state._gen2 = 0; state._gen3 = 0; state._gen4 = 0; state._expansao = 0; state._rebirthUnlock = 0;
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
    const available = !!state._rebirthUnlock && state.points.gte(rebirthCostEN);
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
const CHANGELOG_PT = `<h3 class="dev-subtitle">UPDATE v0.2.0</h3><p class="dev-text">Sistema de upgrades reformulado (Gerador, Duplicador, Amplificador, Expansão, Catalisador, Desbloqueio de Renascimento). Sistema de Renascimento com bônus crescentes de pontos, redução de custo e velocidade. Correção de bug que impedia a compra de upgrades em certos casos. Ícone de configurações redesenhado.</p>`;
const CHANGELOG_EN = `<h3 class="dev-subtitle">UPDATE v0.2.0</h3><p class="dev-text">Overhauled upgrade system (Generator, Duplicator, Amplifier, Expansion, Catalyst, Rebirth Unlock). Rebirth system with growing points, cost reduction, and speed bonuses. Fixed a bug preventing upgrade purchases in certain cases. Redesigned settings icon.</p>`;

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
const btnIds = ['btn-stats', 'btn-updates', 'btn-import-export', 'btn-about', 'btn-credits'];
btnIds.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('click', () => openDev(id.replace('btn-', '')));
});

const discordBtn = document.getElementById('btn-discord');
if(discordBtn) discordBtn.addEventListener('click', () => window.open('https://dsc.gg/contratempo', '_blank'));

const rebirthBtn = document.getElementById('rebirth-btn');
if(rebirthBtn) rebirthBtn.addEventListener('click', performRebirth);

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
    setTxt('settings-title', 'settings');
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