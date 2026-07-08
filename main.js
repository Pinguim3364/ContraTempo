// =========================================================
// CONTRATEMPO — main.js
// Game loop via requestAnimationFrame, sistema de upgrades,
// decaimento de tempo, boost por clicks e persistência via localStorage.
// =========================================================

const SAVE_KEY = 'contratempo_save_v1';
const LAST_ACTIVE_KEY = 'contratempo_last_active';
const DISCORD_CLIENT_ID = '1523845625232363701';
const DISCORD_REDIRECT_URI = window.location.origin + '/callback';
const MAX_POINTS_CAP = 1e252; // Cap para não quebrar JS puro

// ---------- TRADUÇÕES ----------
const I18N = {
  pt: {
    clickBtn: 'CLIQUE PARA ACELERAR',
    decayPrefix: 'DECAIMENTO EM: ',
    boostPrefix: 'BOOST ATUAL: X',
    upgrades: 'UPGRADES',
    pontos: 'PONTOS',
    pps: 'P/S',
    settings: 'CONFIGURAÇÕES',
    login: 'LOGIN',
    stats: 'ESTATÍSTICAS',
    somGraf: 'SONS E GRÁFICOS',
    modoLeve: 'MODO LEVE',
    popups: 'POPUPS',
    trilha: 'TRILHA SONORA',
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
    urlMusica: 'URL da música',
    salvar: 'SALVAR',
    close: 'Fechar',
    rebirth: 'RENASCIMENTO',
    rebirthDesc: 'Resete o jogo e ganhe +1% de bônus por upgrade (exponencial)',
    rebirthConfirm: 'Tem certeza? Seus upgrades serão zerados, mas você ganha +1% permanente por cada upgrade que comprou.',
    offlineMessage: 'Você ficou fora por {time}, e ganhou {points} pontos!',
  },
  en: {
    clickBtn: 'CLICK TO BOOST',
    decayPrefix: 'DECAY IN: ',
    boostPrefix: 'CURRENT BOOST: X',
    upgrades: 'UPGRADES',
    pontos: 'POINTS',
    pps: 'P/S',
    settings: 'SETTINGS',
    login: 'LOGIN',
    stats: 'STATISTICS',
    somGraf: 'SOUND & GRAPHICS',
    modoLeve: 'LIGHT MODE',
    popups: 'POPUPS',
    trilha: 'SOUNDTRACK',
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
    urlMusica: 'Music URL',
    salvar: 'SAVE',
    close: 'Close',
    rebirth: 'REBIRTH',
    rebirthDesc: 'Reset the game and gain +1% bonus per upgrade (exponential)',
    rebirthConfirm: 'Are you sure? Your upgrades will be reset, but you gain +1% permanently for each upgrade you bought.',
    offlineMessage: 'You were away for {time}, and earned {points} points!',
  },
};

// ---------- ESTADO GLOBAL ----------
const state = {
  points: 0,
  basePps: 1,            // 1 ponto por segundo, base fixa
  pps: 1,                // pps total (base + upgrades + rebirth)
  maxTime: 10,
  timeLeft: 10,
  decayRate: 1,
  clickBonusTime: 1,

  stats: {
    recordTime: 0,
    maxMultiplier: 1.0,
    totalClicks: 0,
    totalDrops: 0,
    bestPoints: 0,
    rebirthCount: 0,
    totalUpgradesBought: 0,
  },

  // Rebirth / Prestige
  rebirthCount: 0,            // quantas vezes fez rebirth
  rebirthMultiplier: 1,       // 2^(rebirthCount/4)

  settings: {
    modoLeve: false,
    popups: true,
    sfx: true,
    tremores: true,
    cutscenes: true,
    lang: 'pt',
    musicUrl: '',
  },

  username: '',

  upgradeLevels: {},
  survivalTimer: 0,
};

function t(key) {
  return I18N[state.settings.lang][key] || key;
}

// ---------- FORMATAÇÃO DE NÚMEROS GRANDES ----------
const SUFFIXES = [
  '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'De', 'Ude', 'Dde', 'Tde', 'Qade', 'Qide', 'Sxde', 'Spde', 'Ocde', 'Node',
  'Vg', 'Uvg', 'Dvg', 'Tvg', 'Qavg', 'Qivg', 'Sxvg', 'Spvg', 'Ocvg', 'Novg',
  'Tg', 'Utg', 'Dtg', 'Ttg', 'Qatg', 'Qitg', 'Sxtg', 'Sptg', 'Octg', 'Notg',
  'Qag', 'Uqag', 'Dqag', 'Tqag', 'Qaqag', 'Qaqig', 'Sxqag', 'Spqag', 'Ocqag', 'Noqag',
  'Qig', 'Uqig', 'Dqig', 'Tqig', 'Qaqig', 'Qiqig', 'Sxqig', 'Spqig', 'Ocqig', 'Noqig',
  'Sxg', 'Usxg', 'Dsxg', 'Tsxg', 'Qasxg', 'Qisxg', 'Sxsxg', 'Spsxg', 'Ocsxg', 'Nosxg',
  'Spg', 'Uspg', 'Dspg', 'Tspg', 'Qaspg', 'Qispg', 'Sxspg', 'Spspg', 'Ocspg', 'Nospg',
  'Ocg', 'Uocg', 'Docg', 'Tocg', 'Qaocg', 'Qiocg', 'Sxocg', 'Spocg', 'Ococg', 'Noocg',
  'Nog', 'Unog', 'Dnog', 'Tnog', 'Qanog', 'Qinog', 'Sxnog', 'Spnog', 'Ocnog', 'Nonog',
  'Ce'
];

function formatNumber(num) {
  if (num < 1000) {
    return num.toFixed(0);
  }
  
  let idx = 0;
  let n = num;
  
  while (n >= 1000 && idx < SUFFIXES.length - 1) {
    n /= 1000;
    idx += 1;
  }
  
  if (idx >= SUFFIXES.length) {
    return num.toExponential(2);
  }
  
  const decimals = n >= 100 ? 0 : n >= 10 ? 1 : 2;
  return n.toFixed(decimals) + SUFFIXES[idx];
}

// ---------- DEFINIÇÃO DE UPGRADES ----------
const UPGRADES = [
  // ---- 3 geradores principais (aditivo + 2 multiplicadores exponenciais) ----
  {
    id: 'gen1',
    name: { pt: 'GERADOR I', en: 'GENERATOR I' },
    desc: { pt: 'Gera pontos de forma constante. +5 P/S por nível.', en: 'Constant point generation. +5 P/S per level.' },
    baseCost: 10,
    growth: 1.40,
    maxLevel: 999,
    apply: (lvl) => { state._gen1 = lvl * 5; recalcPps(); },
  },
  {
    id: 'gen2',
    name: { pt: 'GERADOR II', en: 'GENERATOR II' },
    desc: { pt: 'Multiplica a produção do Gerador I em ×1.3 por nível.', en: 'Multiplies Generator I output by ×1.3 per level.' },
    baseCost: 50,
    growth: 1.60,
    maxLevel: 999,
    apply: (lvl) => { state._gen2 = lvl; recalcPps(); },
  },
  {
    id: 'gen3',
    name: { pt: 'GERADOR III', en: 'GENERATOR III' },
    desc: { pt: 'Multiplica a produção combinada em ×2.1 por nível.', en: 'Multiplies combined output by ×2.1 per level.' },
    baseCost: 300,
    growth: 1.85,
    maxLevel: 999,
    apply: (lvl) => { state._gen3 = lvl; recalcPps(); },
  },

  // ---- 3 novos upgrades para profundidade ----
  {
    id: 'gen4',
    name: { pt: 'GERADOR IV', en: 'GENERATOR IV' },
    desc: { pt: 'Multiplica a produção total em ×3.5 por nível.', en: 'Multiplies total output by ×3.5 per level.' },
    baseCost: 2000,
    growth: 1.92,
    maxLevel: 999,
    apply: (lvl) => { state._gen4 = lvl; recalcPps(); },
  },
  {
    id: 'sincronia',
    name: { pt: 'SINCRONIA', en: 'SYNC' },
    desc: { pt: '+2% do P/S total por nível (aditivo percentual).', en: '+2% of total P/S per level (additive %%).' },
    baseCost: 100,
    growth: 1.22,
    maxLevel: 999,
    apply: (lvl) => { state._sincronia = lvl; recalcPps(); },
  },
  {
    id: 'nucleo',
    name: { pt: 'NÚCLEO TEMPORAL', en: 'TEMPORAL CORE' },
    desc: { pt: 'Multiplica P/S total em ×1.5 por nível (final).', en: 'Multiplies total P/S by ×1.5 per level (final).' },
    baseCost: 5000,
    growth: 2.05,
    maxLevel: 999,
    apply: (lvl) => { state._nucleo = lvl; recalcPps(); },
  },
];

function recalcPps() {
  // Fórmula: P/S = 1 (base) + [ Gen1 × (1.3^Gen2) × (2.1^Gen3) × (3.5^Gen4) ] × (1 + 0.02 × Sincronia) × (1.5^Núcleo) × rebirthMultiplier
  const gen1Lvl = state._gen1 || 0;
  const gen2Lvl = state._gen2 || 0;
  const gen3Lvl = state._gen3 || 0;
  const gen4Lvl = state._gen4 || 0;
  const sincroniaLvl = state._sincronia || 0;
  const nucleoLvl = state._nucleo || 0;

  let baseProd = gen1Lvl;
  if (gen2Lvl > 0) baseProd *= Math.pow(1.3, gen2Lvl);
  if (gen3Lvl > 0) baseProd *= Math.pow(2.1, gen3Lvl);
  if (gen4Lvl > 0) baseProd *= Math.pow(3.5, gen4Lvl);

  let withSync = baseProd * (1 + 0.02 * sincroniaLvl);
  let withNucleo = withSync * Math.pow(1.5, nucleoLvl);
  let withRebirth = withNucleo * state.rebirthMultiplier;

  state.pps = state.basePps + withRebirth;
}

function upgradeCost(upg) {
  const lvl = state.upgradeLevels[upg.id] || 0;
  return Math.ceil(upg.baseCost * Math.pow(upg.growth, lvl));
}

function buyUpgrade(upg) {
  const lvl = state.upgradeLevels[upg.id] || 0;
  if (lvl >= upg.maxLevel) return;
  const cost = upgradeCost(upg);
  if (state.points < cost) return;

  state.points -= cost;
  state.upgradeLevels[upg.id] = lvl + 1;
  state.stats.totalUpgradesBought += 1;
  state.rebirthMultiplier = Math.pow(1.01, state.stats.totalUpgradesBought);
  
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
const decayFill = document.getElementById('decay-bar-fill');
const decayText = document.getElementById('decay-bar-text');
const multiplierText = document.getElementById('multiplier-text');
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
    const affordable = !maxed && state.points >= cost;
    const lang = state.settings.lang;

    const card = document.createElement('div');
    card.className = 'upgrade-card' + (affordable ? ' affordable' : '') + (maxed ? ' maxed' : '');

    card.innerHTML = `
      <div class="upgrade-name">${upg.name[lang]}</div>
      <div class="upgrade-desc">${upg.desc[lang]}</div>
      <div class="upgrade-footer">
        <span class="upgrade-cost ${affordable ? '' : 'cant-afford'}">${maxed ? t('max') : cost + ' PTS'}</span>
        <span class="upgrade-level">${t('nivel')} ${lvl}/${upg.maxLevel}</span>
      </div>
    `;

    if (!maxed) {
      card.addEventListener('click', () => buyUpgrade(upg));
    }
    upgradesList.appendChild(card);
  });
}

// ---------- RENDER: STATS TOPO / AÇÃO ----------
function updateTopStats() {
  pointsDisplay.textContent = formatNumber(state.points);
  ppsDisplay.textContent = formatNumber(state.pps);
}

function updateDecayBar() {
  // Decay system removed - pure idle game
}

// ---------- FLOATERS ----------
function spawnFloater(text) {
  if (!state.settings.popups) return;
  const el = document.createElement('div');
  el.className = 'floater';
  el.textContent = text;
  el.style.left = (40 + Math.random() * 20) + '%';
  el.style.top = (30 + Math.random() * 30) + '%';
  floatersContainer.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

// ---------- TOAST DE QUEDA ----------
let toastTimeout = null;
function showDropToast() {
  dropToast.textContent = t('dropToast');
  dropToast.classList.remove('hidden');
  dropToast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    dropToast.classList.remove('show');
  }, 1800);
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

    if (type === 'click') {
      osc.frequency.value = 520;
      gain.gain.value = 0.05;
    } else if (type === 'buy') {
      osc.frequency.value = 720;
      gain.gain.value = 0.06;
    } else if (type === 'drop') {
      osc.frequency.value = 140;
      gain.gain.value = 0.08;
    } else if (type === 'levelup') {
      osc.frequency.value = 880;
      gain.gain.value = 0.07;
    }
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.stop(audioCtx.currentTime + 0.16);
  } catch (e) { /* ambiente sem suporte a audio */ }
}

// ---------- REBIRTH SYSTEM ----------
function performRebirth() {
  if (state.points < MAX_POINTS_CAP * 0.9) {
    // Only allow rebirth when close to cap
    return;
  }

  // Trigger cutscene
  triggerRebirthCutscene();
  
  // After cutscene (1.5s), reset and apply multiplier
  setTimeout(() => {
    state.rebirthCount += 1;
    state.rebirthMultiplier = Math.pow(2, state.rebirthCount / 4);
    
    // Reset points and upgrades
    state.points = 0;
    state.upgradeLevels = {};
    state._gen1 = 0;
    state._gen2 = 0;
    state._gen3 = 0;
    state._gen4 = 0;
    state._sincronia = 0;
    state._nucleo = 0;
    
    recalcPps();
    renderUpgrades();
    updateTopStats();
    saveGame();
    
    playSfx('levelup');
  }, 1500);
}

function triggerRebirthCutscene() {
  // Create flash overlay
  const flash = document.createElement('div');
  flash.id = 'rebirth-flash';
  flash.style.cssText = `
    position: fixed;
    inset: 0;
    background: white;
    opacity: 0;
    z-index: 999;
    pointer-events: none;
  `;
  document.body.appendChild(flash);

  // Animate numbers going up
  const pointsEl = document.getElementById('points-display');
  const originalText = pointsEl.textContent;
  
  let counter = 0;
  const countInterval = setInterval(() => {
    counter++;
    pointsEl.textContent = formatNumber(Math.random() * 1e252);
    
    if (counter > 40) {
      clearInterval(countInterval);
      
      // Flash white
      flash.style.transition = 'opacity 0.5s';
      flash.style.opacity = '1';
      
      setTimeout(() => {
        flash.style.opacity = '0';
        pointsEl.textContent = '0';
        flash.remove();
      }, 500);
    }
  }, 30);
}

function checkRebirthAvailable() {
  const rebirthBtn = document.getElementById('rebirth-btn');
  if (!rebirthBtn) return;
  
  if (state.points >= MAX_POINTS_CAP * 0.9) {
    rebirthBtn.style.display = 'block';
    rebirthBtn.style.animation = 'pulse 1s infinite';
  } else {
    rebirthBtn.style.display = 'none';
  }
}

// ---------- DECAY SYSTEM REMOVED ----------
// Pure idle game - no timeout mechanic

// ---------- BLOQUEIO DE SELEÇÃO / ZOOM DUPLO ----------
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// ---------- OVERLAYS ----------
function openOverlay(el) { el.classList.remove('hidden'); }
function closeOverlay(el) { el.classList.add('hidden'); }

settingsBtn.addEventListener('click', () => openOverlay(settingsOverlay));
closeSettings.addEventListener('click', () => closeOverlay(settingsOverlay));
settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) closeOverlay(settingsOverlay);
});

// ---------- CONTEÚDO DAS ABAS "EM DESENVOLVIMENTO" / ESPECIAIS ----------
const CHANGELOG_PT = `
<h3 class="dev-subtitle">UPDATE v0.1.0: "O DESPERTAR DO CONTRATEMPO"</h3>

<p class="dev-section-title">Core Mechanics (Mecânica Base)</p>
<ul class="dev-list">
  <li>Implementação do sistema de Click Boost: Multiplicador de pontos ativo e responsivo, focado em alta taxa de cliques.</li>
  <li>Sistema de Decaimento de Tempo: O motor de jogo agora processa a perda de tempo em tempo real via requestAnimationFrame para fluidez máxima.</li>
</ul>

<p class="dev-section-title">Interface (UI/UX)</p>
<ul class="dev-list">
  <li>Layout responsivo no padrão Mobile-First: Painel de Upgrades fixo e barra de ação inferior otimizada para o dispositivo realme c71.</li>
  <li>Menu de Configurações: Adição de modal "engrenagem" contendo controle de sons, gráficos (Modo Leve/Tremores) e seção Misc.</li>
</ul>

<p class="dev-section-title">Social &amp; Persistência</p>
<ul class="dev-list">
  <li>Integração com Discord: Adição de canal direto para comunidade e suporte.</li>
  <li>Sistema de Save Local: Implementação de salvamento automático no navegador para persistência de dados de estatísticas.</li>
</ul>

<p class="dev-section-title">Misc</p>
<ul class="dev-list">
  <li>Aba de Info: Centralização dos créditos de desenvolvimento e status da versão beta.</li>
  <li>Painel de Estatísticas: Monitoramento de recordes (Multiplicador Máximo e Cliques Totais).</li>
</ul>
`;

const CHANGELOG_EN = `
<h3 class="dev-subtitle">UPDATE v0.1.0: "THE AWAKENING OF CONTRATEMPO"</h3>

<p class="dev-section-title">Core Mechanics</p>
<ul class="dev-list">
  <li>Click Boost system implemented: active and responsive point multiplier focused on high click rate.</li>
  <li>Time Decay system: the game engine now processes time loss in real time via requestAnimationFrame for maximum smoothness.</li>
</ul>

<p class="dev-section-title">Interface (UI/UX)</p>
<ul class="dev-list">
  <li>Mobile-first responsive layout: fixed Upgrades panel and bottom action bar optimized for the realme c71 device.</li>
  <li>Settings menu: added "gear" modal with sound/graphics controls (Light Mode/Shake FX) and a Misc section.</li>
</ul>

<p class="dev-section-title">Social &amp; Persistence</p>
<ul class="dev-list">
  <li>Discord integration: direct channel for community and support.</li>
  <li>Local Save system: automatic browser save for statistics data persistence.</li>
</ul>

<p class="dev-section-title">Misc</p>
<ul class="dev-list">
  <li>Info tab: centralized development credits and beta version status.</li>
  <li>Statistics panel: tracking records (Max Multiplier and Total Clicks).</li>
</ul>
`;

function discordLogin() {
  const scope = 'identify';
  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&scope=${scope}`;
  window.location.href = authUrl;
}

function discordCallback() {
  // Called when user returns from Discord OAuth
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  
  if (code) {
    // In a real app, you'd exchange the code for a token on your backend
    // For now, we'll just parse the Discord user info from the URL hash (simplified demo)
    // In production, use a backend server to securely handle token exchange
    
    // Simplified: just show a success message
    state.username = 'Discord User #' + Math.floor(Math.random() * 10000);
    localStorage.setItem('contratempo_discord_user', state.username);
    saveGame();
    
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

function openDev(key) {
  closeOverlay(settingsOverlay);
  const lang = state.settings.lang;

  if (key === 'updates') {
    devTitle.textContent = t('atualizacoes');
    devBody.innerHTML = lang === 'pt' ? CHANGELOG_PT : CHANGELOG_EN;
  } else if (key === 'stats') {
    devTitle.textContent = t('stats');
    devBody.innerHTML = `
      <div class="stats-grid">
        <div class="stats-row"><span>${lang === 'pt' ? 'Tempo Recorde' : 'Record Time'}</span><b>${state.stats.recordTime.toFixed(1)}s</b></div>
        <div class="stats-row"><span>${lang === 'pt' ? 'P/S Máximo' : 'Max P/S'}</span><b>${formatNumber(state.pps)}</b></div>
        <div class="stats-row"><span>${lang === 'pt' ? 'Pontos Totais' : 'Total Points'}</span><b>${formatNumber(state.points)}</b></div>
        <div class="stats-row"><span>${lang === 'pt' ? 'Upgrades Comprados' : 'Upgrades Bought'}</span><b>${state.stats.totalUpgradesBought}</b></div>
        <div class="stats-row"><span>${lang === 'pt' ? 'Quedas Totais' : 'Total Drops'}</span><b>${state.stats.totalDrops}</b></div>
      </div>
    `;
  } else if (key === 'trilha') {
    devTitle.textContent = t('trilha');
    devBody.innerHTML = `
      <p class="dev-text">${lang === 'pt' ? 'Cole a URL de uma música/trilha para tocar durante o jogo.' : 'Paste a music/track URL to play during the game.'}</p>
      <input type="text" id="music-url-input" class="text-input" placeholder="${t('urlMusica')} (https://...)" value="${state.settings.musicUrl || ''}">
      <button class="menu-item" id="music-url-save">${t('salvar')}</button>
    `;
    setTimeout(() => {
      const btn = document.getElementById('music-url-save');
      if (btn) {
        btn.addEventListener('click', () => {
          const val = document.getElementById('music-url-input').value.trim();
          state.settings.musicUrl = val;
          saveGame();
          applyMusicUrl();
          closeOverlay(devOverlay);
        });
      }
    }, 0);
  } else if (key === 'about') {
    devTitle.textContent = t('sobre');
    devBody.innerHTML = `<p class="dev-text">CONTRATEMPO — v0.1.0 BETA. ${lang === 'pt' ? 'Um jogo Active-Idle sobre correr contra o tempo.' : 'An Active-Idle game about racing against time.'}</p>`;
  } else if (key === 'credits') {
    devTitle.textContent = t('creditos');
    devBody.innerHTML = `<p class="dev-text">${lang === 'pt' ? 'Desenvolvido com HTML, CSS e JavaScript puro.' : 'Built with vanilla HTML, CSS and JavaScript.'}</p>`;
  } else if (key === 'import-export') {
    devTitle.textContent = t('importExport');
    devBody.innerHTML = `
      <textarea id="save-textarea" class="text-input" rows="4" placeholder="${lang === 'pt' ? 'Cole seu save aqui para importar' : 'Paste your save here to import'}"></textarea>
      <button class="menu-item" id="export-btn">${lang === 'pt' ? 'EXPORTAR' : 'EXPORT'}</button>
      <button class="menu-item" id="import-btn">${lang === 'pt' ? 'IMPORTAR' : 'IMPORT'}</button>
    `;
    setTimeout(() => {
      const exportBtn = document.getElementById('export-btn');
      const importBtn = document.getElementById('import-btn');
      const textarea = document.getElementById('save-textarea');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => {
          textarea.value = localStorage.getItem(SAVE_KEY) || '';
        });
      }
      if (importBtn) {
        importBtn.addEventListener('click', () => {
          try {
            const parsed = JSON.parse(textarea.value);
            localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
            loadGame();
            renderUpgrades();
            updateTopStats();
            updateDecayBar();
            closeOverlay(devOverlay);
          } catch (e) {
            alert(lang === 'pt' ? 'Save inválido.' : 'Invalid save.');
          }
        });
      }
    }, 0);
  } else if (key === 'login') {
    devTitle.textContent = t('login');
    
    if (state.username) {
      // Already logged in
      devBody.innerHTML = `
        <p class="dev-text">${lang === 'pt' ? 'Conectado como' : 'Logged in as'}</p>
        <p style="font-size: 16px; color: var(--accent); margin: 10px 0;">${state.username}</p>
        <button id="logout-btn" class="menu-item">${lang === 'pt' ? 'DESCONECTAR' : 'LOGOUT'}</button>
      `;
      setTimeout(() => {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', () => {
            state.username = '';
            localStorage.removeItem('contratempo_discord_user');
            playSfx('buy');
            openDev('login');
          });
        }
      }, 0);
    } else {
      // Not logged in - show Discord login button
      devBody.innerHTML = `
        <p class="dev-text">${lang === 'pt' ? 'Conecte-se com Discord para sincronizar seu progresso.' : 'Connect with Discord to sync your progress.'}</p>
        <button id="discord-login-btn" class="menu-item discord-btn" style="margin-top: 16px;">
          <svg viewBox="0 0 245 240" width="26" height="20">
            <path fill="currentColor" d="M104.4 103.9c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.2-5 10.2-11.1.1-6.1-4.5-11.1-10.2-11.1zm38.4 0c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.2-5 10.2-11.1s-4.5-11.1-10.2-11.1z"/>
            <path fill="currentColor" d="M189.5 20h-134C42.9 20 32 30.9 32 44.5v134.9C32 193 42.9 204 55.5 204h113.4l-5.3-18.5 12.8 11.9 12.1 11.2L210 224V44.5C210 30.9 199.1 20 189.5 20zm-38.6 130.6s-3.6-4.3-6.6-8.1c13.1-3.7 18.1-11.9 18.1-11.9-4.1 2.7-8 4.6-11.5 5.9-5 2.1-9.8 3.5-14.5 4.3-9.6 1.8-18.4 1.3-25.9-.1-5.7-1.1-10.6-2.7-14.7-4.3-2.3-.9-4.8-2-7.3-3.4-.3-.2-.6-.3-.9-.5-.2-.1-.3-.2-.4-.3-1.8-1-2.8-1.7-2.8-1.7s4.8 8 17.5 11.8c-3 3.8-6.7 8.3-6.7 8.3-22.1-.7-30.5-15.2-30.5-15.2 0-32.2 14.4-58.3 14.4-58.3 14.4-10.8 28.1-10.5 28.1-10.5l1 1.2c-18 5.2-26.3 13.1-26.3 13.1s2.2-1.2 5.9-2.9c10.7-4.7 19.2-6 22.7-6.3.6-.1 1.1-.2 1.7-.2 6.1-.8 13-1 20.2-.2 9.5 1.1 19.7 3.9 30.1 9.6 0 0-7.9-7.5-24.9-12.7l1.4-1.6s13.7-.3 28.1 10.5c0 0 14.4 26.1 14.4 58.3 0 0-8.5 14.5-30.6 15.2z"/>
          </svg>
          <span>${lang === 'pt' ? 'CONECTAR COM DISCORD' : 'LOGIN WITH DISCORD'}</span>
        </button>
      `;
      setTimeout(() => {
        const discordLoginBtn = document.getElementById('discord-login-btn');
        if (discordLoginBtn) {
          discordLoginBtn.addEventListener('click', discordLogin);
        }
      }, 0);
    }
  } else {
    // Outros itens
    devTitle.textContent = t(key) || key.toUpperCase();
    devBody.innerHTML = `<p class="dev-text">${t('devText')}</p>`;
  }

  openOverlay(devOverlay);
}

closeDev.addEventListener('click', () => closeOverlay(devOverlay));
devOverlay.addEventListener('click', (e) => {
  if (e.target === devOverlay) closeOverlay(devOverlay);
});

document.getElementById('btn-login').addEventListener('click', () => openDev('login'));
document.getElementById('btn-stats').addEventListener('click', () => openDev('stats'));
document.getElementById('btn-trilha').addEventListener('click', () => openDev('trilha'));
document.getElementById('btn-updates').addEventListener('click', () => openDev('updates'));
document.getElementById('btn-import-export').addEventListener('click', () => openDev('import-export'));
document.getElementById('btn-about').addEventListener('click', () => openDev('about'));
document.getElementById('btn-credits').addEventListener('click', () => openDev('credits'));

document.getElementById('btn-discord').addEventListener('click', () => {
  window.open('https://dsc.gg/contratempo', '_blank');
});

// Rebirth button
document.getElementById('rebirth-btn').addEventListener('click', performRebirth);

// ---------- MÚSICA VIA URL ----------
let musicAudioEl = null;
function applyMusicUrl() {
  const url = state.settings.musicUrl;
  if (!musicAudioEl) {
    musicAudioEl = document.createElement('audio');
    musicAudioEl.loop = true;
    musicAudioEl.volume = 0.4;
    document.body.appendChild(musicAudioEl);
  }
  if (url) {
    musicAudioEl.src = url;
    musicAudioEl.play().catch(() => { /* precisa de interação do usuário em alguns navegadores */ });
  } else {
    musicAudioEl.pause();
    musicAudioEl.src = '';
  }
}

// ---------- TOGGLES (SONS E GRÁFICOS) ----------
function bindToggle(buttonId, key) {
  const btn = document.getElementById(buttonId);
  const stateEl = btn.querySelector('.toggle-state');
  const render = () => {
    const val = state.settings[key];
    stateEl.textContent = val ? 'ON' : 'OFF';
    stateEl.classList.toggle('off', !val);
  };
  btn.addEventListener('click', () => {
    state.settings[key] = !state.settings[key];
    render();
    saveGame();
  });
  render();
}

bindToggle('btn-modo-leve', 'modoLeve');
bindToggle('btn-popups', 'popups');
bindToggle('btn-sfx', 'sfx');
bindToggle('btn-tremores', 'tremores');
bindToggle('btn-cutscenes', 'cutscenes');

// ---------- SELETOR DE IDIOMA ----------
const langPtBtn = document.getElementById('lang-pt');
const langEnBtn = document.getElementById('lang-en');

function renderLangButtons() {
  langPtBtn.classList.toggle('lang-active', state.settings.lang === 'pt');
  langEnBtn.classList.toggle('lang-active', state.settings.lang === 'en');
}

function setLang(lang) {
  state.settings.lang = lang;
  renderLangButtons();
  applyStaticTexts();
  renderUpgrades();
  updateTopStats();
  updateDecayBar();
  saveGame();
}

langPtBtn.addEventListener('click', () => setLang('pt'));
langEnBtn.addEventListener('click', () => setLang('en'));

// ---------- APLICA TEXTOS ESTÁTICOS DA UI CONFORME IDIOMA ----------
function applyStaticTexts() {
  document.getElementById('upgrades-title').textContent = t('upgrades');
  document.getElementById('points-label').textContent = t('pontos');
  document.getElementById('pps-label').textContent = t('pps');
  clickBtn.textContent = t('clickBtn');
  document.getElementById('settings-title').textContent = t('settings');
  document.getElementById('btn-login').textContent = t('login');
  document.getElementById('section-som').textContent = t('somGraf');
  document.querySelector('#btn-modo-leve span').textContent = t('modoLeve');
  document.querySelector('#btn-popups span').textContent = t('popups');
  document.getElementById('btn-trilha').childNodes[0].textContent = t('trilha') + ': ';
  document.querySelector('#btn-sfx span').textContent = t('sfx');
  document.querySelector('#btn-tremores span').textContent = t('tremores');
  document.querySelector('#btn-cutscenes span').textContent = t('cutscenes');
  document.getElementById('lang-label').textContent = t('idioma');
  document.getElementById('section-misc').textContent = t('misc');
  document.getElementById('btn-updates').textContent = t('atualizacoes');
  document.getElementById('btn-import-export').textContent = t('importExport');
  document.getElementById('btn-about').textContent = t('sobre');
  document.getElementById('btn-credits').textContent = t('creditos');
  document.getElementById('btn-stats').textContent = t('stats');
  document.getElementById('close-dev').setAttribute('aria-label', t('close'));
}

// ---------- PERSISTÊNCIA (localStorage) ----------
function saveGame() {
  try {
    const data = {
      points: state.points,
      stats: state.stats,
      settings: state.settings,
      upgradeLevels: state.upgradeLevels,
      rebirthCount: state.rebirthCount,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    localStorage.setItem('contratempo_last_save_time', Date.now().toString());
  } catch (e) { /* localStorage indisponível */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);

    state.points = data.points || 0;
    state.stats = Object.assign(state.stats, data.stats || {});
    state.settings = Object.assign(state.settings, data.settings || {});
    state.upgradeLevels = data.upgradeLevels || {};
    state.username = localStorage.getItem('contratempo_discord_user') || '';
    state.rebirthCount = data.rebirthCount || 0;
    state.rebirthMultiplier = Math.pow(2, state.rebirthCount / 4);

    UPGRADES.forEach((upg) => {
      const lvl = state.upgradeLevels[upg.id] || 0;
      if (lvl > 0) upg.apply(lvl);
    });
    recalcPps();

    // Calcular ganhos offline
    const lastTimestamp = parseFloat(localStorage.getItem('contratempo_last_save_time')) || Date.now();
    const now = Date.now();
    const elapsedSeconds = (now - lastTimestamp) / 1000;
    
    if (elapsedSeconds > 5 && state.pps > 0) {
      const offlinePoints = state.pps * elapsedSeconds;
      state.points += offlinePoints;
      
      // Formatar tempo offline
      const hours = Math.floor(elapsedSeconds / 3600);
      const minutes = Math.floor((elapsedSeconds % 3600) / 60);
      const seconds = Math.floor(elapsedSeconds % 60);
      
      let timeStr = '';
      if (hours > 0) timeStr += hours + 'h ';
      if (minutes > 0) timeStr += minutes + 'm ';
      if (seconds > 0) timeStr += seconds + 's';
      
      const lang = state.settings.lang || 'pt';
      const msgTemplate = lang === 'pt' 
        ? 'Você ficou fora por {time}, e ganhou {points} pontos!'
        : 'You were away for {time}, and earned {points} points!';
      
      const message = msgTemplate
        .replace('{time}', timeStr.trim())
        .replace('{points}', formatNumber(offlinePoints));
      
      // Mostrar notificação (opcional: toast ou console)
      console.log(message);
      if (state.settings.popups) {
        spawnFloater(message);
      }
    }
    
    state.timeLeft = state.maxTime;
  } catch (e) { /* save corrompido */ }
}

setInterval(saveGame, 10000);
window.addEventListener('beforeunload', saveGame);

// ---------- GAME LOOP (requestAnimationFrame) ----------
let lastFrame = performance.now();

function gameLoop(now) {
  const dt = (now - lastFrame) / 1000;
  lastFrame = now;

  if (state.pps > 0) {
    state.points += state.pps * dt;
  }

  // Cap points to prevent JS overflow
  if (state.points > MAX_POINTS_CAP) {
    state.points = MAX_POINTS_CAP;
  }

  checkRebirthAvailable();
  updateTopStats();

  requestAnimationFrame(gameLoop);
}

// ---------- INICIALIZAÇÃO ----------
function init() {
  loadGame();
  discordCallback(); // Check if returning from Discord OAuth
  renderLangButtons();
  applyStaticTexts();
  renderUpgrades();
  updateTopStats();
  updateDecayBar();
  applyMusicUrl();
  requestAnimationFrame(gameLoop);
}

init();
