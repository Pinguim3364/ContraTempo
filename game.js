// ==================== ESTADO DO JOGO ====================

const gameState = {
    // Pontos e taxa
    pontos: 0.0,
    gps: 0.1,
    
    // Branches com upgrade levels
    branches: {
        1: { nivel: 0, custo: 10.0, desbloqueado: true },
        2: { nivel: 0, custo: 0, desbloqueado: false },
        3: { nivel: 0, custo: 0, desbloqueado: false }
    },
    
    // Tema e salvamento
    tema: 'dark',
    ultimoSaveTempo: Date.now(),
    ultimoTempoOnline: Date.now(),
    
    // Estatísticas
    totalUpgrades: 0,
    ganhoOffline: 0.0
};

// ==================== CONFIGURAÇÕES ====================

const CONFIG = {
    CUSTO_INICIAL_BRANCH1: 10.0,
    MULTIPLICADOR_BRANCH1: 1.3,
    MULTIPLICADOR_BRANCH2: 1.5,
    MULTIPLICADOR_BRANCH3: 1.5,
    BOOST_BRANCH1: 0.1,
    GANHO_POR_UPGRADE: 0.1,
    MAX_HORAS_OFFLINE: 24,
    SAVE_INTERVALO_MS: 10000,
    UNLOCK_BRANCH2_NIVEL: 5,
    UNLOCK_BRANCH3_NIVEL: 10
};

// ==================== DOM REFS ====================

const dom = {
    // Header
    pontosDisplay: document.getElementById('pontos-display'),
    gpsDisplay: document.getElementById('gps-display'),
    
    // Sidebar
    menuBtn: document.getElementById('menu-btn'),
    sidebar: document.getElementById('sidebar'),
    
    // Theme
    themeSel: document.getElementById('theme-selector'),
    
    // Countdown
    countdown: document.getElementById('countdown'),
    
    // Upgrades (dinâmico)
    upgradeSections: {},
    
    // Stats
    totalUpgradesDisplay: document.getElementById('total-upgrades'),
    offlineGainDisplay: document.getElementById('offline-gain'),
    currentRateDisplay: document.getElementById('current-rate'),
    
    // Modal offline
    offlineModal: document.getElementById('offline-modal'),
    offlineText: document.getElementById('offline-text'),
    closeOffline: document.getElementById('close-offline'),
    
    // Save icon
    saveIcon: document.getElementById('save-icon'),
    
    // Toast
    toast: document.getElementById('toast')
};

// ==================== INICIALIZAÇÃO ====================

function iniciar() {
    carregarSave();
    aplicarTema(gameState.tema);
    verificarGanhoOffline();
    criarBotoes();
    atualizarUI();
    
    // Game loop
    let lastFrameTime = performance.now();
    requestAnimationFrame(function gameLoop(tempoAtual) {
        const delta = tempoAtual - lastFrameTime;
        lastFrameTime = tempoAtual;
        
        const deltaSegundos = delta / 1000;
        gameState.pontos += gameState.gps * deltaSegundos;
        
        atualizarUI();
        requestAnimationFrame(gameLoop);
    });
    
    // Auto-save
    setInterval(salvarJogo, CONFIG.SAVE_INTERVALO_MS);
    
    // Event listeners
    setupEventListeners();
}

// ==================== CARREGAMENTO & SALVAMENTO ====================

function carregarSave() {
    const save = localStorage.getItem('contratempo_save');
    if (save) {
        try {
            const dados = JSON.parse(save);
            Object.assign(gameState, dados);
            gameState.ultimoTempoOnline = Date.now();
        } catch (e) {
            console.error('Erro ao carregar save:', e);
        }
    }
}

function salvarJogo() {
    gameState.ultimoSaveTempo = Date.now();
    localStorage.setItem('contratempo_save', JSON.stringify(gameState));
    
    mostrarSaveIndicator();
}

function mostrarSaveIndicator() {
    if (dom.saveIcon) {
        dom.saveIcon.classList.add('saving');
        setTimeout(() => dom.saveIcon.classList.remove('saving'), 600);
    }
}

// ==================== GANHO OFFLINE ====================

function verificarGanhoOffline() {
    const agora = Date.now();
    const diffMs = agora - gameState.ultimoSaveTempo;
    const maxMs = CONFIG.MAX_HORAS_OFFLINE * 60 * 60 * 1000;
    
    if (diffMs > 60000) { // Mais de 1 minuto
        const tempoAplicado = Math.min(diffMs, maxMs);
        const segTotal = tempoAplicado / 1000;
        const ganho = segTotal * gameState.gps;
        
        gameState.pontos += ganho;
        gameState.ganhoOffline = ganho;
        
        const horas = Math.floor(segTotal / 3600);
        const minutos = Math.floor((segTotal % 3600) / 60);
        const segundos = Math.floor(segTotal % 60);
        
        exibirModalOffline(horas, minutos, segundos, ganho.toFixed(1));
    }
}

function exibirModalOffline(h, m, s, ganho) {
    if (dom.offlineText) {
        dom.offlineText.innerText = `Você estava offline por ${h}h ${m}m ${s}s\nGanhou ${ganho} pontos!`;
    }
    if (dom.offlineModal) {
        dom.offlineModal.classList.add('show');
    }
}

// ==================== CRIAÇÃO DE BOTÕES ====================

function criarBotoes() {
    // Limpar seção de upgrades
    const upgradesSection = document.getElementById('upgrades-section');
    if (!upgradesSection) return;
    
    const branchContainers = upgradesSection.querySelectorAll('.branch-container');
    
    branchContainers.forEach((container, branchIdx) => {
        const branchNum = branchIdx + 1;
        const grid = container.querySelector('.upgrades-grid');
        grid.innerHTML = ''; // Limpar
        
        // Determinar quantidade de upgrades
        const totalUpgrades = branchNum === 1 ? 10 : 10;
        
        for (let i = 0; i < totalUpgrades; i++) {
            const btn = document.createElement('button');
            const id = `upgrade-${branchNum}-${i}`;
            btn.id = id;
            btn.className = 'upgrade-card';
            btn.dataset.branch = branchNum;
            btn.dataset.level = i;
            
            // Calcular custo
            const custo = calcularCusto(branchNum, i);
            
            const html = `
                <div class="upgrade-header">
                    <span class="upgrade-num">${branchNum}.${i}</span>
                    <span class="upgrade-status">${i === 0 ? '⭐' : '🔓'}</span>
                </div>
                <div class="upgrade-info">
                    <p class="upgrade-name">${getNomeUpgrade(branchNum, i)}</p>
                    <p class="upgrade-cost">Custo: <span class="cost-value">${custo.toFixed(1)}</span></p>
                </div>
            `;
            
            btn.innerHTML = html;
            
            // Inicialmente desbloquear Branch 1
            if (branchNum === 1) {
                btn.classList.remove('upgrade-locked');
                btn.disabled = false;
            } else if ((branchNum === 2 && gameState.branches[1].nivel < CONFIG.UNLOCK_BRANCH2_NIVEL) ||
                       (branchNum === 3 && gameState.branches[2].nivel < CONFIG.UNLOCK_BRANCH3_NIVEL)) {
                btn.classList.add('upgrade-locked');
                btn.disabled = true;
            } else {
                btn.classList.remove('upgrade-locked');
                btn.disabled = false;
            }
            
            // Event listener
            btn.addEventListener('click', () => comprarUpgrade(branchNum, i));
            
            grid.appendChild(btn);
            dom.upgradeSections[id] = btn;
        }
    });
}

function calcularCusto(branch, nivel) {
    let custo = 0;
    
    if (branch === 1) {
        custo = CONFIG.CUSTO_INICIAL_BRANCH1 * Math.pow(CONFIG.MULTIPLICADOR_BRANCH1, nivel);
    } else if (branch === 2) {
        const custoBranch2Inicial = calcularCusto(1, CONFIG.UNLOCK_BRANCH2_NIVEL);
        custo = custoBranch2Inicial * Math.pow(CONFIG.MULTIPLICADOR_BRANCH2, nivel);
    } else if (branch === 3) {
        const custoBranch3Inicial = calcularCusto(2, CONFIG.UNLOCK_BRANCH3_NIVEL);
        custo = custoBranch3Inicial * Math.pow(CONFIG.MULTIPLICADOR_BRANCH3, nivel);
    }
    
    return Math.round(custo * 10) / 10; // Arredondar para 1 casa decimal
}

function getNomeUpgrade(branch, nivel) {
    const nomes = {
        1: [
            '🚀 Boost Inicial',
            '⚡ Acelerador',
            '🔥 Queimador',
            '💫 Multiplicador',
            '👑 Potência Máxima',
            '🌟 Ascensão',
            '💎 Cristal',
            '🎯 Precisão',
            '🌀 Vórtex',
            '∞ Infinitude'
        ],
        2: [
            '🌊 Onda Inicial',
            '🌪️ Tornado',
            '❄️ Congelamento',
            '🌈 Espectro',
            '🔮 Mistério',
            '🎨 Paleta',
            '🎭 Drama',
            '🎪 Espetáculo',
            '🎸 Harmonia',
            '🎻 Sinfonia'
        ],
        3: [
            '🪐 Órbita Inicial',
            '🌙 Lunática',
            '☄️ Meteoro',
            '🛸 UFO',
            '👽 Alienígena',
            '🔭 Telescópio',
            '🌌 Galáxia',
            '🚀 Jornada',
            '🛰️ Satélite',
            '⭐ Supernova'
        ]
    };
    
    return (nomes[branch] && nomes[branch][nivel]) || `Upgrade ${branch}.${nivel}`;
}

// ==================== COMPRA DE UPGRADES ====================

function comprarUpgrade(branch, nivel) {
    const custo = calcularCusto(branch, nivel);
    
    if (gameState.pontos >= custo) {
        gameState.pontos -= custo;
        gameState.branches[branch].nivel++;
        gameState.gps += CONFIG.GANHO_POR_UPGRADE;
        gameState.totalUpgrades++;
        
        // Verificar desbloqueios
        verificarDesbloqueios();
        
        // Animar
        mostrarToast(`+${CONFIG.GANHO_POR_UPGRADE}/s`);
        
        // Salvar
        salvarJogo();
        atualizarUI();
        criarBotoes();
    }
}

function verificarDesbloqueios() {
    // Branch 2 desbloqueado?
    if (gameState.branches[1].nivel >= CONFIG.UNLOCK_BRANCH2_NIVEL) {
        gameState.branches[2].desbloqueado = true;
    }
    
    // Branch 3 desbloqueado?
    if (gameState.branches[2].nivel >= CONFIG.UNLOCK_BRANCH3_NIVEL) {
        gameState.branches[3].desbloqueado = true;
    }
}

// ==================== ATUALIZAÇÃO DE UI ====================

function atualizarUI() {
    // Atualizar pontos
    if (dom.pontosDisplay) {
        dom.pontosDisplay.innerText = gameState.pontos.toFixed(1);
    }
    
    // Atualizar GPS
    if (dom.gpsDisplay) {
        dom.gpsDisplay.innerText = gameState.gps.toFixed(1);
    }
    
    // Atualizar countdown
    atualizarCountdown();
    
    // Atualizar stats
    if (dom.totalUpgradesDisplay) {
        dom.totalUpgradesDisplay.innerText = gameState.totalUpgrades;
    }
    if (dom.offlineGainDisplay) {
        dom.offlineGainDisplay.innerText = gameState.ganhoOffline.toFixed(1);
    }
    if (dom.currentRateDisplay) {
        dom.currentRateDisplay.innerText = gameState.gps.toFixed(1) + '/s';
    }
    
    // Atualizar barras de progresso
    for (let b = 1; b <= 3; b++) {
        const nivel = gameState.branches[b].nivel;
        const progresso = (nivel / 10) * 100;
        const progressBar = document.getElementById(`branch${b}-progress`);
        const progressText = document.getElementById(`branch${b}-level`);
        
        if (progressBar) progressBar.style.width = progresso + '%';
        if (progressText) progressText.innerText = `Nível ${nivel}/10`;
    }
    
    // Atualizar status dos botões
    atualizarStatusBotoes();
}

function atualizarCountdown() {
    // Próximo upgrade a ser completado
    let proximoCusto = Infinity;
    
    for (let b = 1; b <= 3; b++) {
        if (!gameState.branches[b].desbloqueado) continue;
        
        const nivel = gameState.branches[b].nivel;
        if (nivel < 10) {
            const custo = calcularCusto(b, nivel);
            proximoCusto = Math.min(proximoCusto, custo);
        }
    }
    
    if (gameState.pontos >= proximoCusto) {
        if (dom.countdown) dom.countdown.innerText = '✓ Pronto!';
    } else if (proximoCusto === Infinity) {
        if (dom.countdown) dom.countdown.innerText = '--:--';
    } else {
        const restante = proximoCusto - gameState.pontos;
        const segRestantes = gameState.gps > 0 ? restante / gameState.gps : Infinity;
        
        if (segRestantes < Infinity) {
            const m = Math.floor(segRestantes / 60);
            const s = Math.floor(segRestantes % 60);
            if (dom.countdown) {
                dom.countdown.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
        }
    }
}

function atualizarStatusBotoes() {
    for (let b = 1; b <= 3; b++) {
        for (let i = 0; i < 10; i++) {
            const btn = document.getElementById(`upgrade-${b}-${i}`);
            if (!btn) continue;
            
            // Verificar se branch está desbloqueado
            if (!gameState.branches[b].desbloqueado) {
                btn.classList.add('upgrade-locked');
                btn.disabled = true;
                continue;
            }
            
            // Verificar se já foi comprado todos nesse branch
            if (gameState.branches[b].nivel > i) {
                btn.classList.add('upgrade-locked');
                btn.disabled = true;
                continue;
            }
            
            // Verificar se é o próximo a comprar
            if (gameState.branches[b].nivel === i) {
                btn.classList.remove('upgrade-locked');
                btn.disabled = false;
            } else {
                btn.classList.add('upgrade-locked');
                btn.disabled = true;
            }
        }
    }
}

// ==================== EVENTOS ====================

function setupEventListeners() {
    // Menu
    if (dom.menuBtn) {
        dom.menuBtn.addEventListener('click', () => {
            dom.sidebar.classList.toggle('open');
        });
    }
    
    // Fechar sidebar ao clicar fora
    document.addEventListener('click', (e) => {
        if (dom.sidebar && dom.sidebar.classList.contains('open')) {
            if (!dom.sidebar.contains(e.target) && !dom.menuBtn.contains(e.target)) {
                dom.sidebar.classList.remove('open');
            }
        }
    });
    
    // Theme
    if (dom.themeSel) {
        dom.themeSel.addEventListener('change', (e) => {
            gameState.tema = e.target.value;
            aplicarTema(gameState.tema);
            salvarJogo();
        });
    }
    
    // Offline modal
    if (dom.closeOffline) {
        dom.closeOffline.addEventListener('click', () => {
            dom.offlineModal.classList.remove('show');
        });
    }
    
    // Sidebar actions
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const action = link.dataset.action;
            
            if (action === 'scroll-upgrades') {
                document.getElementById('upgrades-section').scrollIntoView({ behavior: 'smooth' });
            } else if (action === 'scroll-stats') {
                document.getElementById('stats-section').scrollIntoView({ behavior: 'smooth' });
            } else if (action === 'reset-game') {
                if (confirm('Tem certeza que quer resetar o jogo? Isso não pode ser desfeito!')) {
                    Object.assign(gameState, {
                        pontos: 0.0,
                        gps: 0.1,
                        branches: { 1: { nivel: 0, custo: 10.0, desbloqueado: true }, 2: { nivel: 0, custo: 0, desbloqueado: false }, 3: { nivel: 0, custo: 0, desbloqueado: false } },
                        totalUpgrades: 0,
                        ganhoOffline: 0.0
                    });
                    localStorage.removeItem('contratempo_save');
                    location.reload();
                }
            }
            
            dom.sidebar.classList.remove('open');
        });
    });
}

// ==================== TEMA ====================

function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
}

// ==================== TOAST ====================

function mostrarToast(mensagem) {
    if (dom.toast) {
        dom.toast.innerText = mensagem;
        dom.toast.classList.add('show');
        
        setTimeout(() => {
            dom.toast.classList.remove('show');
        }, 2000);
    }
}

// ==================== INICIAR ====================

document.addEventListener('DOMContentLoaded', iniciar);
