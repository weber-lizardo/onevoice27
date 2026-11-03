// Painel de visualização (TV) - estilo quadro de voos de aeroporto.
(function () {
  const { cfg, client, T_TURNO, TURNO_SELECT, escapeHtml, fmtHora, fmtData, sameDay } = OV;

  const REFRESH_MS = cfg.REFRESH_MS || 5000;
  const PAGE_MS = cfg.PAGE_MS || 10000;
  const ROWS = cfg.ROWS_PER_PAGE || 10;
  const SOON_MS = (cfg.SOON_MINUTES ?? 15) * 60000;
  const DEMO = new URLSearchParams(location.search).has("demo");

  const el = (id) => document.getElementById(id);
  document.documentElement.style.setProperty("--rows", ROWS);

  let turnos = [];        // cache da última leitura
  let shown = new Set();  // ids já exibidos (para animar apenas os novos)
  let page = 0;
  let lastPageSwitch = Date.now();

  // ---------------------------------------------------------------- dados
  async function fetchTurnos() {
    if (DEMO) {
      turnos = demoData();
      setStatus(true, "Modo demonstração");
      render();
      return;
    }
    if (!client) {
      setStatus(false, "Configure o arquivo config.js");
      return;
    }
    const { data, error } = await client
      .from(T_TURNO)
      .select(TURNO_SELECT)
      .gt("horario_final", new Date().toISOString())
      .order("horario_inicial", { ascending: true })
      .order("id", { ascending: true })
      .limit(500);
    if (error) {
      setStatus(false, "Sem conexão — exibindo últimos dados");
      return; // mantém os dados anteriores na tela
    }
    turnos = data;
    setStatus(true, "Atualizado às " + new Date().toLocaleTimeString("pt-BR"));
    render();
  }

  function setStatus(ok, text) {
    el("status").className = ok ? "ok" : "err";
    el("status-text").textContent = text;
  }

  // ------------------------------------------------------------ renderização
  function render() {
    const now = new Date();
    const vigentes = turnos.filter((t) => new Date(t.horario_final) > now);
    const ativos = vigentes.filter((t) => new Date(t.horario_inicial) <= now);
    const proximos = vigentes.filter((t) => new Date(t.horario_inicial) > now);

    // Turnos ativos ficam fixos no topo; os próximos ocupam o restante,
    // alternando páginas caso não caibam na tela.
    const fixos = ativos.slice(0, ROWS);
    const vagas = ROWS - fixos.length;
    const pages = vagas > 0 ? Math.max(1, Math.ceil(proximos.length / vagas)) : 1;
    if (Date.now() - lastPageSwitch >= PAGE_MS) {
      page++;
      lastPageSwitch = Date.now();
    }
    if (page >= pages) page = 0;
    const visiveis = fixos.concat(vagas > 0 ? proximos.slice(page * vagas, (page + 1) * vagas) : []);

    el("page").textContent = pages > 1 ? `Página ${page + 1}/${pages}` : "";

    if (!visiveis.length) {
      el("rows").innerHTML = `<div class="empty">Nenhum turno de oração programado</div>`;
      shown = new Set();
      return;
    }

    const next = new Set();
    el("rows").innerHTML = visiveis.map((t) => {
      const ini = new Date(t.horario_inicial), fim = new Date(t.horario_final);
      const live = ini <= now;
      const soon = !live && ini - now <= SOON_MS;
      const key = t.id + ":" + page;
      next.add(key);
      const cls = ["row", live ? "live" : soon ? "soon" : "", shown.has(key) ? "" : "enter"].join(" ");
      const p1 = t.participante1 || {}, p2 = t.participante2 || {};
      const pct = live ? Math.min(100, ((now - ini) / (fim - ini)) * 100) : 0;
      const status = live ? "Em oração" : soon ? `Em ${Math.max(1, Math.ceil((ini - now) / 60000))} min` : "Agendado";
      return `
        <div class="${cls}">
          <div class="time">${dayTag(ini, now)}${fmtHora(ini)}</div>
          <div class="time">${dayTag(fim, now)}${fmtHora(fim)}</div>
          <div>${escapeHtml(p1.nome)}</div>
          <div class="campo">${escapeHtml(p1.campo)}</div>
          <div>${escapeHtml(p2.nome)}</div>
          <div class="campo">${escapeHtml(p2.campo)}</div>
          <div class="status">${status}</div>
          ${live ? `<div class="progress" style="width:${pct.toFixed(2)}%"></div>` : ""}
        </div>`;
    }).join("");
    shown = next;
  }

  // Mostra a data acima do horário quando não é hoje
  function dayTag(d, now) {
    return sameDay(d, now) ? "" : `<span class="day">${fmtData(d)}</span>`;
  }

  // ------------------------------------------------------------------ relógio
  const fmtDate = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  function tickClock() {
    const now = new Date();
    const p = (n) => String(n).padStart(2, "0");
    el("clock-time").innerHTML = `${p(now.getHours())}:${p(now.getMinutes())}<small>:${p(now.getSeconds())}</small>`;
    el("clock-date").textContent = fmtDate.format(now);
  }

  // ------------------------------------------------------- recursos de TV
  // Clique/tecla F = tela cheia; cursor some após 3s parado; tela não apaga.
  document.addEventListener("click", toggleFullscreen);
  document.addEventListener("keydown", (e) => { if (e.key === "f" || e.key === "F") toggleFullscreen(); });
  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  }
  let cursorTimer;
  document.addEventListener("mousemove", () => {
    document.body.classList.remove("hide-cursor");
    clearTimeout(cursorTimer);
    cursorTimer = setTimeout(() => document.body.classList.add("hide-cursor"), 3000);
  });
  async function keepAwake() {
    try { await navigator.wakeLock?.request("screen"); } catch (_) {}
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") keepAwake();
  });

  // --------------------------------------------------------------- demo
  function demoData() {
    if (demoData.cache) return demoData.cache;
    const nomes = [
      ["Ana Paula Souza", "Campo Central"], ["João Batista", "Campo Norte"],
      ["Maria Fernanda Lima", "Campo Sul"], ["Pedro Henrique", "Campo Leste"],
      ["Lucas Oliveira", "Campo Oeste"], ["Juliana Martins", "Campo Central"],
      ["Rafael Costa", "Campo Norte"], ["Débora Alves", "Campo Sul"],
      ["Samuel Rocha", "Campo Leste"], ["Raquel Pereira", "Campo Oeste"],
      ["Tiago Mendes", "Campo Central"], ["Priscila Gomes", "Campo Norte"],
    ].map(([nome, campo], i) => ({ id: i + 1, nome, campo }));
    const base = new Date();
    base.setMinutes(base.getMinutes() < 30 ? 0 : 30, 0, 0);
    const list = [];
    for (let i = 0; i < 24; i++) {
      const ini = new Date(base.getTime() + (i - 1) * 30 * 60000);
      const fim = new Date(ini.getTime() + 30 * 60000);
      list.push({
        id: i + 1,
        horario_inicial: ini.toISOString(),
        horario_final: fim.toISOString(),
        participante1: nomes[(i * 2) % nomes.length],
        participante2: nomes[(i * 2 + 1) % nomes.length],
      });
    }
    // uma segunda dupla em oração simultânea
    list.splice(2, 0, { ...list[1], id: 99, participante1: nomes[10], participante2: nomes[7] });
    return (demoData.cache = list);
  }

  // ---------------------------------------------------------------- início
  tickClock();
  fetchTurnos();
  keepAwake();
  setInterval(tickClock, 1000);
  setInterval(fetchTurnos, REFRESH_MS);
  // Reavalia situação/progresso a cada segundo para remover turnos
  // encerrados imediatamente, mesmo entre uma consulta e outra.
  setInterval(render, 1000);
})();
