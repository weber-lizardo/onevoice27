(function () {
  const {
    client, T_PART, T_TURNO, TURNO_SELECT, escapeHtml, toast, friendlyError,
    fmtHora, fmtDataHora, toLocalInput,
  } = OV;
  let participantes = [];
  let turnos = [];
  let editId = null;
  let duracaoMin = 60;

  OV.requireAuth(init);

  function init() {
    document.getElementById("app").innerHTML = `
      <h1>Turnos de oração</h1>
      <form id="form" class="card">
        <h2 id="form-title">Novo turno</h2>
        <div class="grid">
          <label>Horário inicial<input type="datetime-local" name="inicio" required></label>
          <label>Horário final<input type="datetime-local" name="fim" required></label>
          <label>Participante 1<select name="p1" required></select></label>
          <label>Participante 2<select name="p2" required></select></label>
        </div>
        <div class="actions" style="margin-top:12px">
          <button type="submit" class="btn primary" id="salvar">Cadastrar turno</button>
          <button type="button" class="btn" id="cancelar" hidden>Cancelar</button>
        </div>
      </form>
      <section class="card">
        <div class="toolbar">
          <label style="flex:0 0 auto;flex-direction:row;align-items:center;gap:6px">
            <input type="checkbox" id="mostrar-encerrados" style="width:auto"> Mostrar encerrados
          </label>
          <span class="muted" id="total"></span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Início</th><th>Fim</th><th>Participante 1</th><th>Campo</th>
              <th>Participante 2</th><th>Campo</th><th>Situação</th><th></th>
            </tr></thead>
            <tbody id="tbody"><tr><td colspan="8" class="muted">Carregando…</td></tr></tbody>
          </table>
        </div>
      </section>`;

    const form = document.getElementById("form");
    form.addEventListener("submit", salvar);
    // Ao escolher o início, sugere o fim mantendo a última duração usada
    form.inicio.addEventListener("change", () => {
      if (!form.inicio.value) return;
      const ini = new Date(form.inicio.value);
      const fim = form.fim.value ? new Date(form.fim.value) : null;
      if (!fim || fim <= ini) {
        form.fim.value = toLocalInput(new Date(ini.getTime() + duracaoMin * 60000).toISOString());
      }
    });
    document.getElementById("cancelar").onclick = limpar;
    document.getElementById("mostrar-encerrados").onchange = render;
    document.getElementById("tbody").addEventListener("click", onTableClick);
    carregar();
  }

  async function carregar() {
    const [p, t] = await Promise.all([
      client.from(T_PART).select("id,nome,campo").order("nome"),
      client.from(T_TURNO).select(TURNO_SELECT).order("horario_inicial"),
    ]);
    if (p.error) return toast(friendlyError(p.error), "err");
    if (t.error) return toast(friendlyError(t.error), "err");
    participantes = p.data;
    turnos = t.data;
    preencherSelects();
    render();
  }

  function preencherSelects() {
    const form = document.getElementById("form");
    const opts =
      `<option value="">Selecione…</option>` +
      participantes.map((p) =>
        `<option value="${p.id}">${escapeHtml(p.nome)}${p.campo ? " — " + escapeHtml(p.campo) : ""}</option>`
      ).join("");
    for (const sel of [form.p1, form.p2]) {
      const v = sel.value;
      sel.innerHTML = opts;
      sel.value = v;
    }
  }

  function render() {
    const now = new Date();
    const todos = document.getElementById("mostrar-encerrados").checked;
    const rows = turnos.filter((t) => todos || new Date(t.horario_final) > now);
    document.getElementById("total").textContent =
      `${rows.length} turno(s)` + (todos ? "" : " ativos ou futuros");
    document.getElementById("tbody").innerHTML = rows.length
      ? rows.map((t) => {
          const ini = new Date(t.horario_inicial), fim = new Date(t.horario_final);
          const live = ini <= now && now < fim, past = fim <= now;
          const tag = live ? '<span class="tag live">Em oração</span>'
            : past ? '<span class="tag past">Encerrado</span>'
            : '<span class="tag next">Agendado</span>';
          const p1 = t.participante1 || {}, p2 = t.participante2 || {};
          return `
          <tr class="${live ? "live" : past ? "past" : ""}">
            <td>${fmtDataHora(ini)}</td>
            <td>${fmtHora(fim)}</td>
            <td class="wrap">${escapeHtml(p1.nome)}</td>
            <td class="wrap">${escapeHtml(p1.campo)}</td>
            <td class="wrap">${escapeHtml(p2.nome)}</td>
            <td class="wrap">${escapeHtml(p2.campo)}</td>
            <td>${tag}</td>
            <td class="actions">
              <button class="btn small" data-edit="${t.id}">Editar</button>
              <button class="btn small danger" data-del="${t.id}">Excluir</button>
            </td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="8" class="muted">Nenhum turno cadastrado.</td></tr>`;
  }

  // Turnos existentes que compartilham participante e se sobrepõem no horário
  function conflitos(ini, fim, ids) {
    return turnos.filter((t) =>
      t.id !== editId &&
      new Date(t.horario_inicial) < fim && ini < new Date(t.horario_final) &&
      (ids.includes(t.participante1_id) || ids.includes(t.participante2_id))
    );
  }

  async function salvar(e) {
    e.preventDefault();
    const form = e.target;
    const ini = new Date(form.inicio.value);
    const fim = new Date(form.fim.value);
    const p1 = Number(form.p1.value), p2 = Number(form.p2.value);
    if (!(fim > ini)) return toast("O horário final deve ser maior que o inicial.", "err");
    if (p1 === p2) return toast("Selecione dois participantes diferentes.", "err");

    const c = conflitos(ini, fim, [p1, p2]);
    if (c.length) {
      const lista = c.map((t) =>
        `• ${fmtDataHora(t.horario_inicial)}–${fmtHora(t.horario_final)}: ` +
        `${t.participante1?.nome} / ${t.participante2?.nome}`).join("\n");
      if (!confirm("Atenção: participante já escalado em horário sobreposto:\n\n" + lista + "\n\nSalvar mesmo assim?")) return;
    }

    const payload = {
      horario_inicial: ini.toISOString(),
      horario_final: fim.toISOString(),
      participante1_id: p1,
      participante2_id: p2,
    };
    const btn = document.getElementById("salvar");
    btn.disabled = true;
    const { error } = editId
      ? await client.from(T_TURNO).update(payload).eq("id", editId)
      : await client.from(T_TURNO).insert(payload);
    btn.disabled = false;
    if (error) return toast(friendlyError(error), "err");

    duracaoMin = Math.round((fim - ini) / 60000);
    toast(editId ? "Turno atualizado." : "Turno cadastrado.");
    const eraNovo = !editId;
    limpar();
    // Facilita cadastrar turnos em sequência: próximo começa onde este terminou
    if (eraNovo) {
      form.inicio.value = toLocalInput(fim.toISOString());
      form.fim.value = toLocalInput(new Date(fim.getTime() + duracaoMin * 60000).toISOString());
    }
    carregar();
  }

  function limpar() {
    editId = null;
    const form = document.getElementById("form");
    form.reset();
    document.getElementById("form-title").textContent = "Novo turno";
    document.getElementById("salvar").textContent = "Cadastrar turno";
    document.getElementById("cancelar").hidden = true;
  }

  async function onTableClick(e) {
    const edit = e.target.dataset.edit;
    const del = e.target.dataset.del;
    const t = turnos.find((x) => String(x.id) === (edit || del));
    if (!t) return;
    if (edit) {
      editId = t.id;
      const form = document.getElementById("form");
      form.inicio.value = toLocalInput(t.horario_inicial);
      form.fim.value = toLocalInput(t.horario_final);
      form.p1.value = t.participante1_id;
      form.p2.value = t.participante2_id;
      document.getElementById("form-title").textContent = "Editar turno";
      document.getElementById("salvar").textContent = "Salvar alterações";
      document.getElementById("cancelar").hidden = false;
      form.scrollIntoView({ behavior: "smooth" });
    }
    if (del) {
      if (!confirm(`Excluir o turno de ${fmtDataHora(t.horario_inicial)}?`)) return;
      const { error } = await client.from(T_TURNO).delete().eq("id", t.id);
      if (error) return toast(friendlyError(error), "err");
      toast("Turno excluído.");
      if (editId === t.id) limpar();
      carregar();
    }
  }
})();
