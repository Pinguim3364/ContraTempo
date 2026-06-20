// variáveis principais de estado do jogo
let estado = {
    pontos: 0.0,
    gps: 0.1,
    upgNivel: 0,
    upgCusto: 10.0,
    token: '',
    tema: 'amoled',
    ultimoSaveTempo: Date.now()
};

// referências do dom
const dom = {
    pontos: document.getElementById('pontos-display'),
    gps: document.getElementById('gps-display'),
    countdown: document.getElementById('countdown'),
    menuBtn: document.getElementById('menu-btn'),
    sidebar: document.getElementById('sidebar'),
    themeSel: document.getElementById('theme-selector'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    closeSettings: document.getElementById('close-settings'),
    buyUpgBtn: document.getElementById('buy-upgrade-btn'),
    upgLevel: document.getElementById('upg-level'),
    upgCost: document.getElementById('upg-cost'),
    offlineModal: document.getElementById('offline-modal'),
    offlineText: document.getElementById('offline-text'),
    closeOffline: document.getElementById('close-offline'),
    saveIcon: document.getElementById('save-icon'),
    investArea: document.getElementById('investimentos-area'),
    tokenDisplay: document.getElementById('token-display'),
    copyTokenBtn: document.getElementById('copy-token-btn'),
    logs: document.getElementById('sys-logs')
};

// inicialização e login invisível
function iniciar() {
    let saveLocal = localStorage.getItem('waste_time_save');
    if (saveLocal) {
        try {
            let dados = JSON.parse(saveLocal);
            Object.assign(estado, dados);
            verificarGanhoOffline();
        } catch(e) {
            logSys("erro ao carregar save.");
        }
    } else {
        estado.token = gerarToken();
        logSys("novo token gerado.");
    }
    
    dom.tokenDisplay.value = estado.token;
    aplicarTema(estado.tema);
    dom.themeSel.value = estado.tema;
    atualizarUiUpg();
    verificarEvolucao();
    
    // inicia o loop fluido de renderização
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
    
    // auto-save a cada 10s
    setInterval(salvarJogo, 10000);
}

// gerador de hash simples para a conta invisível
function gerarToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// logger do sistema nas configurações
function logSys(msg) {
    let div = document.createElement('div');
    let data = new Date();
    div.innerText = `[${data.getHours()}:${data.getMinutes()}:${data.getSeconds()}] ${msg}`;
    dom.logs.prepend(div);
}

// lógica de cálculo offline capada em 24h
function verificarGanhoOffline() {
    let agora = Date.now();
    let diffMs = agora - estado.ultimoSaveTempo;
    let maxMs = 24 * 60 * 60 * 1000; // 24 horas
    
    if (diffMs > maxMs) diffMs = maxMs;
    
    if (diffMs > 60000) { // só mostra se ficou fora mais de 1 minuto
        let segundosFora = diffMs / 1000;
        let pontosGanhos = segundosFora * estado.gps;
        
        estado.pontos += pontosGanhos;
        
        let h = Math.floor(segundosFora / 3600);
        let m = Math.floor((segundosFora % 3600) / 60);
        let s = Math.floor(segundosFora % 60);
        
        dom.offlineText.innerText = `enquanto você esteve ${h}h ${m}m ${s}s fora, você ganhou ${pontosGanhos.toFixed(1)} pontos.`;
        dom.offlineModal.style.display = 'flex';
        logSys(`ganho offline: ${pontosGanhos.toFixed(1)}`);
    }
}

// validação matemática simulando um back-end (anti-cheat)
let lastValidPoints = estado.pontos;
let lastFrameTime = 0;

function validarIntegridade(deltaSegundos) {
    let ganhoEsperado = estado.gps * deltaSegundos;
    let ganhoReal = estado.pontos - lastValidPoints;
    
    // se o ganho no frame for absurdamente maior que o possível (f12 cheat)
    if (ganhoReal > ganhoEsperado * 2 && ganhoReal > 1) {
        logSys("anomalia detectada. corrigindo pontos.");
        estado.pontos = lastValidPoints + ganhoEsperado; // reverte a trapaça
    }
    lastValidPoints = estado.pontos;
}

// loop principal usando requestanimationframe para números fluidos
function gameLoop(tempoAtual) {
    let delta = tempoAtual - lastFrameTime;
    lastFrameTime = tempoAtual;
    
    let deltaSegundos = delta / 1000;
    estado.pontos += estado.gps * deltaSegundos;
    
    validarIntegridade(deltaSegundos);
    
    // atualiza tela
    dom.pontos.innerText = estado.pontos.toFixed(1);
    dom.gps.innerText = estado.gps.toFixed(1);
    
    // atualiza cronômetro para o próximo upgrade
    if (estado.pontos < estado.upgCusto) {
        let segRestantes = (estado.upgCusto - estado.pontos) / estado.gps;
        let m = Math.floor(segRestantes / 60);
        let s = Math.floor(segRestantes % 60);
        dom.countdown.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
        dom.countdown.innerText = "pronto!";
    }
    
    requestAnimationFrame(gameLoop);
}

// sistema de upgrades e matemática exponencial
dom.buyUpgBtn.addEventListener('click', () => {
    if (estado.pontos >= estado.upgCusto) {
        estado.pontos -= estado.upgCusto;
        estado.gps += 0.1;
        estado.upgNivel++;
        estado.upgCusto = estado.upgCusto * 1.3;
        
        atualizarUiUpg();
        verificarEvolucao();
        logSys(`upgrade comprado: nível ${estado.upgNivel}`);
    }
});

function atualizarUiUpg() {
    dom.upgLevel.innerText = estado.upgNivel;
    dom.upgCost.innerText = estado.upgCusto.toFixed(1);
}

function verificarEvolucao() {
    if (estado.upgNivel >= 5) {
        dom.investArea.style.display = 'block';
    }
}

// salvar e feedbacks visuais
function salvarJogo() {
    estado.ultimoSaveTempo = Date.now();
    localStorage.setItem('waste_time_save', JSON.stringify(estado));
    
    // pisca o ícone de nuvem
    dom.saveIcon.classList.add('saving');
    setTimeout(() => dom.saveIcon.classList.remove('saving'), 1000);
}

// interações de ui e menus
dom.menuBtn.addEventListener('click', () => {
    dom.sidebar.classList.toggle('open');
});

dom.settingsBtn.addEventListener('click', () => {
    dom.settingsModal.style.display = 'flex';
});

dom.closeSettings.addEventListener('click', () => {
    dom.settingsModal.style.display = 'none';
});

dom.closeOffline.addEventListener('click', () => {
    dom.offlineModal.style.display = 'none';
});

dom.themeSel.addEventListener('change', (e) => {
    estado.tema = e.target.value;
    aplicarTema(estado.tema);
    logSys(`tema alterado: ${estado.tema}`);
});

function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
}

dom.copyTokenBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(estado.token);
    logSys("token copiado para área de transferência.");
});

// roda o jogo
iniciar();
