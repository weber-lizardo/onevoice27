(function () {
  const { client, T_PART, escapeHtml, toast, friendlyError } = OV;
  let lista = [];
  let editId = null;

  OV.requireAuth(init);

  function init() {
    document.getElementById("app").innerHTML = `
      <h1>Participantes</h1>
      <form id="form" class="card">
        <h2 id="form-title">Novo participante</h2>
        <div class="grid">
          <label>Nome<input name="nome" required maxlength="120" autocomplete="off"></label>
          <label>Campo<input name="campo" maxlength="120" autocomplete="off" list="campos"></label>
          <div class="actions">
            <button type="submit" class="btn primary" id="salvar">Cadastrar</button>
            <button type="button" class="btn" id="cancelar" hidden>Cancelar</button>
          </div>
        </div>
        <datalist id="campos"></datalist>
      </form>
      <section class="card">
        <div class="toolbar">
          <label>Buscar<input id="busca" placeholder="Nome ou campo"></label>
          <span class="muted" id="total"></span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>Campo</th><th></th></tr></thead>
            <tbody id="tbody"><tr><td colspan="3" class="muted">Carregando…</td></tr></tbody>
          </table>
        </div>
      </section>`;

    const form = document.getElementById("form");
    form.addEventListener("submit", salvar);
    document.getElementById("cancelar").onclick = limpar;
    document.getElementById("busca").oninput = render;
    document.getElementById("tbody").addEventListener("click", onTableClick);
    carregar();
  }

  async function carregar() {
    const { data, error } = await client.from(T_PART).select("id,nome,campo").order("nome");
    if (error) return toast(friendlyError(error), "err");
    lista = data;
    const campos = [...new Set(lista.map((p) => p.campo).filter(Boolean))].sort();
    document.getElementById("campos").innerHTML = campos
      .map((c) => `<option value="${escapeHtml(c)}">`).join("");
    render();
  }

  function render() {
    const q = document.getElementById("busca").value.trim().toLowerCase();
    const rows = lista.filter(
      (p) => !q || p.nome.toLowerCase().includes(q) || (p.campo || "").toLowerCase().includes(q)
    );
    document.getElementById("total").textContent = `${rows.length} de ${lista.length}`;
    document.getElementById("tbody").innerHTML = rows.length
      ? rows.map((p) => `
        <tr>
          <td class="wrap">${escapeHtml(p.nome)}</td>
          <td class="wrap">${escapeHtml(p.campo)}</td>
          <td class="actions">
            <button class="btn small" data-edit="${p.id}">Editar</button>
            <button class="btn small danger" data-del="${p.id}">Excluir</button>
          </td>
        </tr>`).join("")
      : `<tr><td colspan="3" class="muted">Nenhum participante encontrado.</td></tr>`;
  }

  async function salvar(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const payload = { nome: f.get("nome").trim(), campo: f.get("campo").trim() };
    if (!payload.nome) return toast("Informe o nome.", "err");
    const btn = document.getElementById("salvar");
    btn.disabled = true;
    const q = editId
      ? client.from(T_PART).update(payload).eq("id", editId)
      : client.from(T_PART).insert(payload);
    const { error } = await q;
    btn.disabled = false;
    if (error) return toast(friendlyError(error), "err");
    toast(editId ? "Participante atualizado." : "Participante cadastrado.");
    limpar();
    carregar();
  }

  function limpar() {
    editId = null;
    const form = document.getElementById("form");
    form.reset();
    document.getElementById("form-title").textContent = "Novo participante";
    document.getElementById("salvar").textContent = "Cadastrar";
    document.getElementById("cancelar").hidden = true;
    form.nome.focus();
  }

  async function onTableClick(e) {
    const edit = e.target.dataset.edit;
    const del = e.target.dataset.del;
    if (edit) {
      const p = lista.find((x) => String(x.id) === edit);
      editId = p.id;
      const form = document.getElementById("form");
      form.nome.value = p.nome;
      form.campo.value = p.campo || "";
      document.getElementById("form-title").textContent = "Editar participante";
      document.getElementById("salvar").textContent = "Salvar";
      document.getElementById("cancelar").hidden = false;
      form.scrollIntoView({ behavior: "smooth" });
      form.nome.focus();
    }
    if (del) {
      const p = lista.find((x) => String(x.id) === del);
      if (!confirm(`Excluir "${p.nome}"?`)) return;
      const { error } = await client.from(T_PART).delete().eq("id", p.id);
      if (error) return toast(friendlyError(error), "err");
      toast("Participante excluído.");
      if (editId === p.id) limpar();
      carregar();
    }
  }
})();
