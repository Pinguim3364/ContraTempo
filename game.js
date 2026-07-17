/* ============================================================
   projeto "t" — game.js
   Toda quantidade de jogo (t, custos, ps, multiplicadores) é um
   ExpantaNum. Nunca usamos Number puro para essas grandezas,
   senão estouraríamos em Infinity ao passar de ~1.79e308.
   ============================================================ */

(function () {
  "use strict";

  var EN = ExpantaNum; // atalho

  /* ---------------- Sufixos customizados (K...Ce) ---------------- */
  // Cada posição = grupo de 3 zeros (10^3, 10^6, ...).
  var SUFFIXES = [
    "", "K", "M", "B", "T",
    "Qa", "Qi", "Sx", "Sp", "Oc", "No", "De",
    "Ude", "Dde", "Tde", "Qade", "Qide", "Sxde", "Spde", "Ocde", "Node",
    "Vg", "Uvg", "Dvg", "Tvg", "Qavg", "Qivg", "Sxvg", "Spvg", "Ocvg", "Novg",
    "Tg", "Utg", "Dtg", "Ttg", "Qatg", "Qitg", "Sxtg", "Sptg", "Octg", "Notg",
    "Qag", "Uqag", "Dqag", "Tqag", "Qaqag", "Qiqag", "Sxqag", "Spqag", "Ocqag", "Noqag",
    "Qig", "Uqig", "Dqig", "Tqig", "Qaqig", "Qiqig", "Sxqig", "Spqig", "Ocqig", "Noqig",
    "Sxg", "Usxg", "Dsxg", "Tsxg", "Qasxg", "Qisxg", "Sxsxg", "Spsxg", "Ocsxg", "Nosxg",
    "Spg", "Upg", "Dspg", "Tspg", "Qaspg", "Qispg", "Sxspg", "Spspg", "Ocspg", "Nospg",
    "Ocg", "Uocg", "Docg", "Tocg", "Qaocg", "Qiocg", "Sxocg", "Spocg", "Ococg", "Noocg",
    "Nog", "Unog", "Dnog", "Tnog", "Qanog", "Qinog", "Sxnog", "Spnog", "Ocnog", "Nonog",
    "Ce"
  ];
  var MAX_SUFFIX_INDEX = SUFFIXES.length - 1; // índice do "Ce"

  /**
   * Formata um ExpantaNum usando a tabela de sufixos do projeto.
   * Acima do Centilhão (10^306), cai para notação científica.
   */
  function formatT(en) {
    if (!(en instanceof EN)) en = new EN(en);
    if (en.sign < 0) return "-" + formatT(en.abs());
    if (en.isNaN && en.isNaN()) return "NaN";

    // Números "pequenos" (cabem em double) tratamos com log10 normal.
    var log10;
    try {
      log10 = en.log10().toNumber();
    } catch (e) {
      log10 = Infinity;
    }

    if (!isFinite(log10)) {
      return en.toString(); // fallback pra notação nativa da lib (tetration etc)
    }

    if (log10 < 3) {
      // abaixo de 1000: mostra com até 2 casas decimais, sem sufixo
      var num = en.toNumber();
      if (num < 100) return trimNum(num, 2);
      return trimNum(num, 0);
    }

    var groupIndex = Math.floor(log10 / 3);

    if (groupIndex > MAX_SUFFIX_INDEX) {
      // além do Centilhão -> notação científica "1.23e309"
      var mantissaExp = en.toExponential ? en.toExponential(2) : en.toString();
      return mantissaExp;
    }

    var suffix = SUFFIXES[groupIndex];
    var divisor = new EN(10).pow(groupIndex * 3);
    var mantissa = en.div(divisor).toNumber();

    return trimNum(mantissa, 2) + suffix;
  }

  function trimNum(n, decimals) {
    if (!isFinite(n)) return String(n);
    var s = n.toFixed(decimals);
    if (decimals > 0 && s.indexOf(".") !== -1) {
      s = s.replace(/0+$/, "").replace(/\.$/, "");
    }
    return s;
  }

  /* ---------------- Definição dos Upgrades ---------------- */
  // FdCdC = fator de crescimento do custo | FdCE = fator de crescimento do efeito

  var UPGRADES = [
    {
      id: "U0",
      name: "Existência",
      desc: "Começo automático do jogo gerando 0.1 t por segundo.",
      baseCost: null, // grátis, sempre ativo
      fdcdc: null,
      free: true,
      alwaysUnlocked: true
    },
    {
      id: "U1",
      name: "Pensamento",
      desc: "Aumenta o ganho de t por segundo.",
      baseCost: new EN(1),
      fdcdc: new EN(1.1),
      fdce: new EN(1.2),
      alwaysUnlocked: true
    },
    {
      id: "U2",
      name: "Ação",
      desc: "Libera o botão para você clicar manualmente.",
      baseCost: new EN(100),
      fdcdc: null,
      maxLevel: 1,
      alwaysUnlocked: true
    },
    {
      id: "U3",
      name: "Hábito",
      desc: "Clica na tela de forma automática. Começa em 1 CPS.",
      baseCost: new EN(563),
      fdcdc: new EN(1.3),
      requires: "U2",
      unlocksAt: "U2"
    },
    {
      id: "U4",
      name: "Visão",
      desc: "Libera novos upgrades bloqueados no jogo.",
      baseCost: new EN("2.1e3"),
      fdcdc: null,
      maxLevel: 1,
      alwaysUnlocked: true
    },
    {
      id: "U5",
      name: "Foco",
      desc: "Multiplica o seu ganho passivo total.",
      baseCost: new EN("783e3"),
      fdcdc: new EN(1.6),
      fdce: new EN(1.35),
      requires: "U4",
      unlocksAt: "U4"
    },
    {
      id: "U6",
      name: "Recomeço",
      desc: "Reseta o progresso por um multiplicador global. Sem limite de níveis.",
      baseCost: new EN("256e6"),
      fdcdc: null, // custo fixo de rebirth — não escalona como os outros
      isRebirth: true,
      rebirthMult: new EN(4.5),
      requires: "U4",
      unlocksAt: "U4"
    }
  ];

  /* ---------------- Estado ---------------- */

  var state = {
    t: new EN(0),
    levels: {},      // id -> nível comprado
    rebirths: 0,
    lastTick: Date.now(),
    theme: "dark",
    lang: "pt",
    popupsOn: true
  };

  UPGRADES.forEach(function (u) { state.levels[u.id] = u.free || u.alwaysUnlocked && u.id === "U0" ? (u.free ? 1 : 0) : 0; });
  state.levels["U0"] = 1; // Existência sempre "comprada"

  /* ---------------- Cálculos derivados ---------------- */

  function levelOf(id) { return state.levels[id] || 0; }

  function isUnlocked(u) {
    if (u.alwaysUnlocked) return true;
    if (u.unlocksAt) return levelOf(u.unlocksAt) > 0;
    return true;
  }

  function costOf(u) {
    if (u.free) return new EN(0);
    if (u.isRebirth) return u.baseCost; // custo fixo pra próximo rebirth (poderia escalar, mantemos fixo conforme spec)
    var lvl = levelOf(u.id);
    if (u.fdcdc === null) return u.baseCost; // upgrades "fixo" (U2, U4) custo único
    return u.baseCost.mul(u.fdcdc.pow(lvl));
  }

  function isMaxed(u) {
    if (u.maxLevel != null) return levelOf(u.id) >= u.maxLevel;
    return false;
  }

  // Base passiva (Existência) + Pensamento (U1) multiplicado por Foco (U5) e Rebirths (U6)
  function basePS() {
    var ps = new EN(0.1); // Existência
    var u1lvl = levelOf("U1");
    if (u1lvl > 0) {
      // cada nível soma um incremento crescente: efeito multiplicativo 1.2x acumulado
      var pensamentoBonus = new EN(1).sub(new EN(1)); // placeholder
      var mult = UPGRADES[1].fdce.pow(u1lvl); // 1.2^lvl
      ps = ps.mul(mult);
    }
    var u5lvl = levelOf("U5");
    if (u5lvl > 0) {
      var focoMult = UPGRADES[5].fdce.pow(u5lvl); // 1.35^lvl
      ps = ps.mul(focoMult);
    }
    if (state.rebirths > 0) {
      var rebirthMult = UPGRADES[6].rebirthMult.pow(state.rebirths); // 4.5^rebirths
      ps = ps.mul(rebirthMult);
    }
    return ps;
  }

  function clickValue() {
    // clique manual soma 1 t base (independe de PS), afetado por rebirth pra fazer sentido a fundo de jogo
    var base = new EN(1);
    if (state.rebirths > 0) {
      base = base.mul(UPGRADES[6].rebirthMult.pow(state.rebirths));
    }
    return base;
  }

  function autoClickCPS() {
    var lvl = levelOf("U3");
    if (lvl <= 0) return 0;
    // "Começa em 1 CPS", cada nível reduz o intervalo em 1ms (mín. 50ms = 20 CPS de teto)
    var intervalMs = Math.max(50, 1000 - (lvl - 1));
    return 1000 / intervalMs;
  }

  /* ---------------- Ações de compra ---------------- */

  function canAfford(u) {
    if (u.free) return false;
    return state.t.gte(costOf(u));
  }

  function buy(id) {
    var u = UPGRADES.filter(function (x) { return x.id === id; })[0];
    if (!u || u.free) return;
    if (!isUnlocked(u)) return;
    if (isMaxed(u)) return;

    if (u.isRebirth) {
      var cost = costOf(u);
      if (state.t.lt(cost)) return;
      doRebirth();
      return;
    }

    var cost = costOf(u);
    if (state.t.lt(cost)) return;

    state.t = state.t.sub(cost);
    state.levels[id] = levelOf(id) + 1;

    if (id === "U2") revealClickButton();
    if (id === "U3") startAutoClicker();

    renderUpgrades();
    saveGame();
  }

  function doRebirth() {
    var cost = costOf(UPGRADES[6]);
    state.t = state.t.sub(cost);
    state.rebirths += 1;
    // reset de progresso (mantém U0/U2/U4 desbloqueados conceitualmente, zera níveis escaláveis)
    state.t = new EN(0);
    state.levels["U1"] = 0;
    state.levels["U3"] = 0;
    state.levels["U5"] = 0;
    renderUpgrades();
    saveGame();
  }

  /* ---------------- Botão de clique manual ---------------- */

  var clickBtn = document.getElementById("click-btn");
  var counterZone = document.getElementById("counter-zone");
  var popupLayer = document.getElementById("popup-layer");

  function revealClickButton() {
    clickBtn.disabled = false;
  }

  clickBtn.addEventListener("click", function () {
    var gain = clickValue();
    state.t = state.t.add(gain);
    spawnPopup("+" + formatT(gain), false);
    bumpCounter();
    clickBtn.classList.remove("pulse");
    void clickBtn.offsetWidth; // reflow pra reiniciar animação
    clickBtn.classList.add("pulse");
    renderUpgrades();
  });

  var autoClickTimer = null;
  function startAutoClicker() {
    if (autoClickTimer) clearInterval(autoClickTimer);
    var cps = autoClickCPS();
    if (cps <= 0) return;
    var intervalMs = 1000 / cps;
    autoClickTimer = setInterval(function () {
      var gain = clickValue();
      state.t = state.t.add(gain);
      spawnPopup("+" + formatT(gain), false);
    }, intervalMs);
  }

  /* ---------------- Popups flutuantes ---------------- */

  var popupPool = [];
  function spawnPopup(text, isBoost) {
    if (!state.popupsOn) return;
    var el = document.createElement("span");
    el.className = "pop" + (isBoost ? " boost" : "");
    el.textContent = text;
    // leve variação horizontal pra não empilhar tudo exatamente igual
    var jitter = (Math.random() - 0.5) * 40;
    el.style.marginLeft = jitter + "px";
    popupLayer.appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 900);
  }

  function bumpCounter() {
    var counterEl = document.getElementById("t-value");
    counterEl.classList.remove("bump");
    void counterEl.offsetWidth;
    counterEl.classList.add("bump");
  }

  /* ---------------- Renderização ---------------- */

  var tValueEl = document.getElementById("t-value");
  var psValueEl = document.getElementById("ps-value");
  var upgradesList = document.getElementById("upgrades-list");

  var statRebirthsEl = document.getElementById("stat-rebirths");
  var statPsEl = document.getElementById("stat-ps");

  function renderCounter() {
    tValueEl.textContent = formatT(state.t);
    psValueEl.textContent = formatT(basePS());
    if (statRebirthsEl) statRebirthsEl.textContent = state.rebirths;
    if (statPsEl) statPsEl.textContent = formatT(basePS());
  }

  function renderUpgrades() {
    upgradesList.innerHTML = "";
    UPGRADES.forEach(function (u) {
      if (u.free) return; // Existência não vira card, é passiva desde o início
      var unlocked = isUnlocked(u);
      var maxed = isMaxed(u);
      var afford = unlocked && !maxed && canAfford(u);

      var card = document.createElement("button");
      card.type = "button";
      card.className = "upg-card" +
        (unlocked ? "" : " locked") +
        (afford ? " affordable" : "") +
        (maxed ? " maxed" : "");
      card.disabled = !unlocked || maxed;

      var lvl = levelOf(u.id);
      var costText = maxed ? "MAX" : formatT(costOf(u)) + " t";
      var levelText = u.isRebirth
        ? "Rebirths: " + state.rebirths
        : (u.maxLevel ? "" : "Nível " + lvl);

      card.innerHTML =
        '<span class="upg-id">' + u.id + '</span>' +
        '<span class="upg-name">' + u.name + '</span>' +
        '<span class="upg-desc">' + u.desc + '</span>' +
        (levelText ? '<span class="upg-level">' + levelText + '</span>' : '') +
        '<span class="upg-cost' + (afford || maxed ? '' : ' cant-afford') + '">' + costText + '</span>';

      card.addEventListener("click", function () {
        var beforeAfford = canAfford(u);
        if (!beforeAfford && !u.isRebirth) return;
        buy(u.id);
      });

      upgradesList.appendChild(card);
    });
  }

  /* ---------------- Tick principal (passivo) ---------------- */

  function tick() {
    var now = Date.now();
    var dtSeconds = (now - state.lastTick) / 1000;
    state.lastTick = now;
    if (dtSeconds > 0 && dtSeconds < 3600) {
      var gain = basePS().mul(dtSeconds);
      state.t = state.t.add(gain);
    }
    renderCounter();
    updateAffordability();
  }

  function updateAffordability() {
    // atualiza só classes de affordable sem re-renderizar tudo (performance)
    var cards = upgradesList.children;
    var idx = 0;
    UPGRADES.forEach(function (u) {
      if (u.free) return;
      var card = cards[idx];
      idx++;
      if (!card) return;
      var unlocked = isUnlocked(u);
      var maxed = isMaxed(u);
      var afford = unlocked && !maxed && canAfford(u);
      card.classList.toggle("affordable", afford);
      var costEl = card.querySelector(".upg-cost");
      if (costEl && !maxed) costEl.classList.toggle("cant-afford", !afford);
    });
  }

  setInterval(tick, 100);

  /* ---------------- Offline earnings ---------------- */

  function applyOfflineEarnings() {
    var raw = localStorage.getItem("t_game_save");
    if (!raw) return;
    try {
      var save = JSON.parse(raw);
      if (!save.lastTick) return;
      var elapsedSec = (Date.now() - save.lastTick) / 1000;
      if (elapsedSec > 5) {
        var ps = basePS();
        var earned = ps.mul(Math.min(elapsedSec, 60 * 60 * 24 * 3)); // cap 3 dias
        state.t = state.t.add(earned);
      }
    } catch (e) { /* ignore */ }
  }

  /* ---------------- Save / Load ---------------- */

  function saveGame() {
    var save = {
      t: state.t.toString(),
      levels: state.levels,
      rebirths: state.rebirths,
      lastTick: Date.now(),
      theme: state.theme,
      lang: state.lang,
      popupsOn: state.popupsOn
    };
    try {
      localStorage.setItem("t_game_save", JSON.stringify(save));
    } catch (e) { /* storage indisponível */ }
  }

  function loadGame() {
    var raw = localStorage.getItem("t_game_save");
    if (!raw) return;
    try {
      var save = JSON.parse(raw);
      if (save.t) state.t = new EN(save.t);
      if (save.levels) state.levels = save.levels;
      if (save.rebirths) state.rebirths = save.rebirths;
      if (save.theme) state.theme = save.theme;
      if (save.lang) state.lang = save.lang;
      if (typeof save.popupsOn === "boolean") state.popupsOn = save.popupsOn;
      state.levels["U0"] = 1;
      if (levelOf("U2") > 0) revealClickButton();
    } catch (e) { /* ignore corrupt save */ }
  }

  window.addEventListener("beforeunload", saveGame);
  setInterval(saveGame, 10000);

  /* ---------------- Tema (pílula claro/escuro) ---------------- */

  var themePillSettings = document.getElementById("theme-pill-settings");

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    saveGame();
  }

  themePillSettings.addEventListener("click", toggleTheme);

  /* ---------------- Toggle de popups (ON/OFF) ---------------- */

  var togglePopupsEl = document.getElementById("toggle-popups");
  function applyPopupsToggle() {
    togglePopupsEl.setAttribute("data-on", state.popupsOn ? "true" : "false");
  }
  togglePopupsEl.addEventListener("click", function () {
    state.popupsOn = !state.popupsOn;
    applyPopupsToggle();
    saveGame();
  });

  /* ---------------- Idioma (pílula PT/EN) — estrutura pronta ---------------- */

  var langPill = document.getElementById("lang-pill");
  function applyLang() {
    langPill.setAttribute("data-lang", state.lang);
    var opts = langPill.querySelectorAll(".lang-pill-opt");
    opts.forEach(function (o) {
      o.classList.toggle("active-lang", o.dataset.lang === state.lang);
    });
  }
  langPill.addEventListener("click", function () {
    state.lang = state.lang === "pt" ? "en" : "pt";
    applyLang();
    saveGame();
  });

  /* ---------------- Navegação entre telas ---------------- */

  var viewGame = document.getElementById("view-game");
  var viewSettings = document.getElementById("view-settings");

  document.getElementById("open-settings").addEventListener("click", function () {
    viewGame.classList.remove("view-active");
    viewSettings.classList.add("view-active");
  });

  document.getElementById("close-settings").addEventListener("click", function () {
    viewSettings.classList.remove("view-active");
    viewGame.classList.add("view-active");
  });

  /* ---------------- Reset de progresso ---------------- */

  var confirmOverlay = document.getElementById("confirm-overlay");
  document.getElementById("reset-save").addEventListener("click", function () {
    confirmOverlay.classList.add("open");
  });
  document.getElementById("confirm-cancel").addEventListener("click", function () {
    confirmOverlay.classList.remove("open");
  });
  document.getElementById("confirm-danger").addEventListener("click", function () {
    localStorage.removeItem("t_game_save");
    location.reload();
  });

  /* ---------------- Boot ---------------- */

  loadGame();
  applyOfflineEarnings();
  applyTheme();
  applyLang();
  applyPopupsToggle();
  if (levelOf("U2") > 0) revealClickButton();
  if (levelOf("U3") > 0) startAutoClicker();
  renderUpgrades();
  renderCounter();

})();
