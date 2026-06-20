let estado = {
    pontos: 0.0,
    gps: 0.1,
    upgNivel: 0,
    upgCusto: 10.0,
    tema: 'amoled',
    ultimoSaveTempo: Date.now()
};

const dom = {
    pontos: document.getElementById('pontos-display'),
    gps: document.getElementById('gps-display'),
    countdown: document.getElementById('countdown'),
    menuBtn: document.getElementById('menu-btn'),
    sidebar: document.getElementById('sidebar'),
    themeSel: document.getElementById('theme-selector'),
    buyUpgBtn: document.getElementById('buy-upgrade-btn'),
    upgLevel: document.getElementById('upg-level'),
    upgCost: document.getElementById('upg-cost'),
    offlineModal: document.getElementById('offline-modal'),
    offlineText: document.getElementById('offline-text'),
    closeOffline: document.getElementById('close-offline'),
    saveIcon: document.getElementById('save-icon'),
    investArea: document.getElementById('investimentos-area')
};

function iniciar() {
    let saveLocal = localStorage.getItem('contratempo_save');
    if (saveLocal) {
        try {
            let dados = JSON.parse(saveLocal);
            Object.assign(estado, dados);
            verificarGanhoOffline();
        } catch(e) {}
    }
    
    aplicarTema(estado.tema);
    if(dom.themeSel) dom.themeSel.value = estado.tema;
    
    atualizarUiUpg();
    verificarEvolucao();
    
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
    setInterval(salvarJogo, 10000);
}

function verificarGanhoOffline() {
    let agora = Date.now();
    let diffMs = agora - estado.ultimoSaveTempo;
    let maxMs = 24 * 60 * 60 * 1000; 
    
    if (diffMs > maxMs) diffMs = maxMs;
    
    if (diffMs > 60000) { 
        let segTotal = diffMs / 1000;
        let pontosGanhos = segTotal * estado.gps;
        
        estado.pontos += pontosGanhos;
        
        let h = Math.floor(segTotal / 3600);
        let m = Math.floor((segTotal % 3600) / 60);
        let s = Math.floor(segTotal % 60);
        
        if(dom.offlineText) {
            dom.offlineText.innerText = `você ficou ${h}h, ${m}m e ${s}s fora, e ganhou ${pontosGanhos.toFixed(1)} pontos`;
        }
        if(dom.offlineModal) dom.offlineModal.style.display = 'flex';
    }
}

let lastValidPoints = estado.pontos;
let lastFrameTime = 0;

function validarIntegridade(deltaSegundos) {
    let ganhoEsperado = estado.gps * deltaSegundos;
    let ganhoReal = estado.pontos - lastValidPoints;
    
    if (ganhoReal > ganhoEsperado * 2 && ganhoReal > 1) {
        estado.pontos = lastValidPoints + ganhoEsperado; 
    }
    lastValidPoints = estado.pontos;
}

function gameLoop(tempoAtual) {
    let delta = tempoAtual - lastFrameTime;
    lastFrameTime = tempoAtual;
    
    let deltaSegundos = delta / 1000;
    estado.pontos += estado.gps * deltaSegundos;
    
    validarIntegridade(deltaSegundos);
    
    if(dom.pontos) dom.pontos.innerText = estado.pontos.toFixed(1);
    if(dom.gps) dom.gps.innerText = estado.gps.toFixed(1);
    
    if (estado.pontos < estado.upgCusto) {
        let segRestantes = (estado.upgCusto - estado.pontos) / estado.gps;
        let m = Math.floor(segRestantes / 60);
        let s = Math.floor(segRestantes % 60);
        if(dom.countdown) dom.countdown.innerText = `próximo upgrade em: ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
        if(dom.countdown) dom.countdown.innerText = "upgrade disponível!";
    }
    
    requestAnimationFrame(gameLoop);
}

if(dom.buyUpgBtn) {
    dom.buyUpgBtn.addEventListener('click', () => {
        if (estado.pontos >= estado.upgCusto) {
            estado.pontos -= estado.upgCusto;
            estado.gps += 0.1;
            estado.upgNivel++;
            estado.upgCusto = estado.upgCusto * 1.3;
            
            atualizarUiUpg();
            verificarEvolucao();
        }
    });
}

function atualizarUiUpg() {
    if(dom.upgLevel) dom.upgLevel.innerText = estado.upgNivel;
    if(dom.upgCost) dom.upgCost.innerText = estado.upgCusto.toFixed(1);
}

function verificarEvolucao() {
    if (estado.upgNivel >= 5 && dom.investArea) {
        dom.investArea.style.display = 'block';
    }
}

function salvarJogo() {
    estado.ultimoSaveTempo = Date.now();
    localStorage.setItem('contratempo_save', JSON.stringify(estado));
    
    if(dom.saveIcon) {
        dom.saveIcon.classList.add('saving');
        setTimeout(() => dom.saveIcon.classList.remove('saving'), 1000);
    }
}

if(dom.menuBtn) dom.menuBtn.addEventListener('click', () => dom.sidebar.classList.toggle('open'));
if(dom.closeOffline) dom.closeOffline.addEventListener('click', () => dom.offlineModal.style.display = 'none');

if(dom.themeSel) {
    dom.themeSel.addEventListener('change', (e) => {
        estado.tema = e.target.value;
        aplicarTema(estado.tema);
    });
}

function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
}

iniciar();
