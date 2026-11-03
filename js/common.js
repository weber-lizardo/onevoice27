// Utilitários compartilhados entre as páginas.
(function () {
  const cfg = window.ONEVOICE_CONFIG || {};

  const T_PART = "onevoice27_participantes";
  const T_TURNO = "onevoice27_turno_oracao";

  const TURNO_SELECT =
    "id, horario_inicial, horario_final, participante1_id, participante2_id," +
    " participante1:onevoice27_participantes!onevoice27_turno_p1_fkey(id,nome,campo)," +
    " participante2:onevoice27_participantes!onevoice27_turno_p2_fkey(id,nome,campo)";

  function configured() {
    return (
      cfg.SUPABASE_URL &&
      cfg.SUPABASE_ANON_KEY &&
      !cfg.SUPABASE_URL.includes("SEU-PROJETO") &&
      !cfg.SUPABASE_ANON_KEY.includes("SUA-CHAVE")
    );
  }

  let client = null;
  if (configured() && window.supabase && window.supabase.createClient) {
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  const pad = (n) => String(n).padStart(2, "0");

  function fmtHora(d) {
    d = d instanceof Date ? d : new Date(d);
    return pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function fmtData(d) {
    d = d instanceof Date ? d : new Date(d);
    return pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
  }
  function fmtDataHora(d) {
    d = d instanceof Date ? d : new Date(d);
    return fmtData(d) + "/" + d.getFullYear() + " " + fmtHora(d);
  }
  function sameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
  // ISO (UTC) -> valor para <input type="datetime-local"> no fuso local
  function toLocalInput(iso) {
    const d = new Date(iso);
    return (
      d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      "T" + pad(d.getHours()) + ":" + pad(d.getMinutes())
    );
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function friendlyError(err) {
    if (!err) return "Erro desconhecido.";
    const msg = err.message || String(err);
    if (err.code === "23503") return "Este participante está vinculado a um ou mais turnos. Remova-o dos turnos antes de excluir.";
    if (/onevoice27_turno_horario_chk/.test(msg)) return "O horário final deve ser maior que o horário inicial.";
    if (/onevoice27_turno_dupla_chk/.test(msg)) return "Selecione dois participantes diferentes.";
    if (/row-level security/i.test(msg)) return "Sem permissão. Faça login novamente.";
    return msg;
  }

  function toast(text, kind) {
    let box = document.getElementById("toast");
    if (!box) {
      box = document.createElement("div");
      box.id = "toast";
      document.body.appendChild(box);
    }
    box.textContent = text;
    box.className = "show " + (kind || "ok");
    clearTimeout(box._t);
    box._t = setTimeout(() => (box.className = ""), 4000);
  }

  function configWarning() {
    return (
      '<div class="card warn"><h2>Configuração pendente</h2>' +
      "<p>Edite o arquivo <code>config.js</code> com a URL e a chave <em>anon</em> do seu projeto Supabase " +
      "e execute o script <code>supabase/schema.sql</code> no SQL Editor.</p></div>"
    );
  }

  // Exige login (Supabase Auth, e-mail e senha) nas páginas de cadastro.
  async function requireAuth(onReady) {
    const main = document.getElementById("app");
    if (!client) {
      main.innerHTML = configWarning();
      return;
    }
    const { data } = await client.auth.getSession();
    if (data.session) {
      renderUser(data.session.user);
      onReady();
      return;
    }
    main.innerHTML =
      '<form id="login" class="card login">' +
      "<h2>Entrar</h2>" +
      '<label>E-mail<input type="email" name="email" required autocomplete="username"></label>' +
      '<label>Senha<input type="password" name="password" required autocomplete="current-password"></label>' +
      '<button type="submit" class="btn primary">Entrar</button>' +
      '<p class="muted">Usuários são criados em Supabase &gt; Authentication &gt; Users.</p>' +
      "</form>";
    document.getElementById("login").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const { data, error } = await client.auth.signInWithPassword({
        email: f.get("email"),
        password: f.get("password"),
      });
      if (error) return toast("Falha no login: " + error.message, "err");
      renderUser(data.user);
      onReady();
    });
  }

  function renderUser(user) {
    const slot = document.getElementById("user-slot");
    if (!slot) return;
    slot.innerHTML =
      '<span class="muted">' + escapeHtml(user.email) + "</span> " +
      '<button class="btn small" id="logout">Sair</button>';
    document.getElementById("logout").onclick = async () => {
      await client.auth.signOut();
      location.reload();
    };
  }

  window.OV = {
    cfg, client, T_PART, T_TURNO, TURNO_SELECT, configured,
    fmtHora, fmtData, fmtDataHora, sameDay, toLocalInput, escapeHtml,
    friendlyError, toast, requireAuth, configWarning,
  };
})();
