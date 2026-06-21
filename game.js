// ==================== FORMATAÇÃO ====================

function formatarNumero(num) {
    if (num >= 1e18) {
        return (num / 1e18).toFixed(2) + 'Qn';
    } else if (num >= 1e15) {
        return (num / 1e15).toFixed(2) + 'Qd';
    } else if (num >= 1e12) {
        return (num / 1e12).toFixed(2) + 'T';
    } else if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
        return (num / 1e3).toFixed(2) + 'K';
    } else {
        return num.toFixed(1);
    }
}

// ==================== ESTADO DO JOGO ====================

const gameState = {
    pontos: 0.0,
    gps: 0.1,
    totalUpgrades: 0,
    ganhoOffline: 0.0,
    upgrades: {
        1: { nivel: 0, desbloqueado: true },
        2: { nivel: 0, desbloqueado: false },
        3: { nivel: 0, desbloqueado: false }
    },
    ultimoSaveTempo: Date.now()
};

// ==================== CONFIGURAÇÕES ====================

const CONFIG = {
    CUSTO_INICIAL: 10.0,
    CUSTO_MULTIPLICADOR: 1.3,
    GANHO_INICIAL: 0.1,
    GANHO_MULTIPLICADOR: 1.5,
    UNLOCK_BRANCH2_PONTOS: 100.0,
    UNLOCK_BRANCH3_PONTOS: 500.0,
    MAX_HORAS_OFFLINE: 24,
    SAVE_INTERVALO_MS: 10000
};

// ==================== DOM REFS ====================

const dom = {
    pontosDisplay: document.getElementById('pontos-display'),
    gpsDisplay: document.getElementById('gps-display'),
    miniMenuBtn: document.getElementById('mini-menu-btn'),
    sidebar: document.getElementById('sidebar'),
    closeSidebar: document.getElementById('close-sidebar'),
    upgradesContainer: document.getElementById('upgrades-container'),
    offlineGainDisplay: document.getElementById('offline-gain'),
    totalUpgradesDisplay: document.getElementById('total-upgrades'),
    offlineModal: document.getElementById('offline-modal'),
    offlineText: document.getElementById('offline-text'),
    closeOffline: document.getElementById('close-offline'),
    toast: document.getElementById('toast'),
    saveIcon: document.getElementById('save-icon')
};

// ==================== INICIALIZAÇÃO ====================

function iniciar() {
    carregarSave();
    verificarGanhoOffline();
    atualizarUI();
    criarUpgrades();
    
    // Game loop
    let lastFrameTime = performance.now();
    requestAnimationFrame(function gameLoop(tempoAtual) {
        const delta = tempoAtual - lastFrameTime;
        lastFrameTime = tempoAtual;
        
        const deltaSegundos = delta / 1000;
        gameState.pontos += gameState.gps * deltaSegundos;
        
        atualizarUI();
        verificarDesbloqueios();
        
        requestAnimationFrame(gameLoop);
    });
    
    // Auto-save
    setInterval(salvarJogo, CONFIG.SAVE_INTERVALO_MS);
    
    // Event listeners
    setupEventListeners();
}

// ==================== SAVE & LOAD ====================

function carregarSave() {
    const save = localStorage.getItem('contratempo_save');
    if (save) {
        try {
            const dados = JSON.parse(save);
            Object.assign(gameState, dados);
        } catch (e) {
            console.error('Erro ao carregar save:', e);
        }
    }
}

function salvarJogo() {
    gameState.ultimoSaveTempo = Date.now();
    localStorage.setItem('contratempo_save', JSON.stringify(gameState));
    
    if (dom.saveIcon) {
        dom.saveIcon.classList.add('saving');
        setTimeout(() => dom.saveIcon.classList.remove('saving'), 600);
    }
}

// ==================== OFFLINE GAIN ====================

function verificarGanhoOffline() {
    const agora = Date.now();
    const diffMs = agora - gameState.ultimoSaveTempo;
    const maxMs = CONFIG.MAX_HORAS_OFFLINE * 60 * 60 * 1000;
    
    if (diffMs > 60000) {
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

// ==================== DESBLOQUEIOS ====================

function verificarDesbloqueios() {
    // Desbloquear Branch 2
    if (gameState.pontos >= CONFIG.UNLOCK_BRANCH2_PONTOS && !gameState.upgrades[2].desbloqueado) {
        gameState.upgrades[2].desbloqueado = true;
        mostrarToast('Branch 2 Desbloqueado!');
        criarUpgrades();
    }
    
    // Desbloquear Branch 3
    if (gameState.pontos >= CONFIG.UNLOCK_BRANCH3_PONTOS && !gameState.upgrades[3].desbloqueado) {
        gameState.upgrades[3].desbloqueado = true;
        mostrarToast('Branch 3 Desbloqueado!');
        criarUpgrades();
    }
}

// ==================== CRIAR UPGRADES ====================

function criarUpgrades() {
    if (!dom.upgradesContainer) return;
    
    dom.upgradesContainer.innerHTML = '';
    
    for (let branch = 1; branch <= 3; branch++) {
        if (!gameState.upgrades[branch].desbloqueado) {
            // Mostrar upgrade bloqueado
            const lockedDiv = document.createElement('div');
            lockedDiv.className = 'upgrade-btn locked';
            
            let textoDesbloqueio = '';
            if (branch === 2) {
                textoDesbloqueio = `Desbloqueado ao atingir ${formatarNumero(CONFIG.UNLOCK_BRANCH2_PONTOS)} pontos`;
            } else if (branch === 3) {
                textoDesbloqueio = `Desbloqueado ao atingir ${formatarNumero(CONFIG.UNLOCK_BRANCH3_PONTOS)} pontos`;
            }
            
            lockedDiv.innerHTML = `
                <span class="upgrade-name">Branch ${branch}</span>
                <span class="upgrade-cost" style="color: #666666;">${textoDesbloqueio}</span>
            `;
            dom.upgradesContainer.appendChild(lockedDiv);
            continue;
        }
        
        // Criar botão de upgrade
        const btn = document.createElement('button');
        btn.className = 'upgrade-btn';
        btn.dataset.branch = branch;
        
        const nivel = gameState.upgrades[branch].nivel;
        const custo = calcularCusto(branch);
        const ganho = calcularGanho(branch);
        const nomeUpgrade = getNomeUpgrade(branch);
        
        btn.innerHTML = `
            <span class="upgrade-name">${nomeUpgrade}</span>
            <div class="upgrade-info">
                <span class="upgrade-gain">+${formatarNumero(ganho)}/s</span>
                <span class="upgrade-cost">Custo: ${formatarNumero(custo)}</span>
                <span class="upgrade-status">${nivel > 0 ? '✓' : ''}</span>
            </div>
        `;
        
        if (gameState.pontos < custo) {
            btn.disabled = true;
        }
        
        btn.addEventListener('click', () => comprarUpgrade(branch));
        dom.upgradesContainer.appendChild(btn);
    }
}

// ==================== CÁLCULOS ====================

function calcularCusto(branch) {
    const nivel = gameState.upgrades[branch].nivel;
    const custo = CONFIG.CUSTO_INICIAL * Math.pow(CONFIG.CUSTO_MULTIPLICADOR, nivel);
    return Math.round(custo * 10) / 10;
}

function calcularGanho(branch) {
    const nivel = gameState.upgrades[branch].nivel;
    const ganho = CONFIG.GANHO_INICIAL * Math.pow(CONFIG.GANHO_MULTIPLICADOR, nivel);
    return Math.round(ganho * 100) / 100;
}

function getNomeUpgrade(branch) {
    const nomes = {
        1: '⭐ Branch 1',
        2: '💫 Branch 2',
        3: '✨ Branch 3'
    };
    return nomes[branch] || `Branch ${branch}`;
}

// ==================== COMPRA DE UPGRADE ====================

function comprarUpgrade(branch) {
    const custo = calcularCusto(branch);
    
    if (gameState.pontos >= custo) {
        gameState.pontos -= custo;
        gameState.upgrades[branch].nivel++;
        
        const ganho = calcularGanho(branch);
        gameState.gps += ganho;
        gameState.totalUpgrades++;
        
        mostrarToast(`+${ganho.toFixed(2)}/s`);
        salvarJogo();
        atualizarUI();
        criarUpgrades();
    }
}

// ==================== ATUALIZAÇÃO DE UI ====================

function atualizarUI() {
    // Pontos e GPS
    if (dom.pontosDisplay) {
        dom.pontosDisplay.innerText = formatarNumero(gameState.pontos);
    }
    if (dom.gpsDisplay) {
        dom.gpsDisplay.innerText = formatarNumero(gameState.gps);
    }
    
    // Stats
    if (dom.offlineGainDisplay) {
        dom.offlineGainDisplay.innerText = formatarNumero(gameState.ganhoOffline);
    }
    if (dom.totalUpgradesDisplay) {
        dom.totalUpgradesDisplay.innerText = gameState.totalUpgrades;
    }
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    // Mini menu
    if (dom.miniMenuBtn) {
        dom.miniMenuBtn.addEventListener('click', () => {
            dom.sidebar.classList.toggle('open');
        });
    }
    
    // Fechar sidebar
    if (dom.closeSidebar) {
        dom.closeSidebar.addEventListener('click', () => {
            dom.sidebar.classList.remove('open');
        });
    }
    
    // Fechar sidebar ao clicar fora
    document.addEventListener('click', (e) => {
        if (dom.sidebar && dom.sidebar.classList.contains('open')) {
            if (!dom.sidebar.contains(e.target) && !dom.miniMenuBtn.contains(e.target)) {
                dom.sidebar.classList.remove('open');
            }
        }
    });
    
    // Fechar modal offline
    if (dom.closeOffline) {
        dom.closeOffline.addEventListener('click', () => {
            dom.offlineModal.classList.remove('show');
        });
    }
}

// ==================== NOTIFICAÇÕES ====================

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
