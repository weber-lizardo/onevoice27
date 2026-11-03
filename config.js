// Configuração do Supabase.
// Encontre estes valores em: Supabase Dashboard > Project Settings > API
// A chave "anon" é pública por natureza; a segurança é feita pelas
// políticas RLS definidas em supabase/schema.sql.
window.ONEVOICE_CONFIG = {
  SUPABASE_URL: "https://SEU-PROJETO.supabase.co",
  SUPABASE_ANON_KEY: "SUA-CHAVE-ANON",

  // Painel (TV)
  REFRESH_MS: 5000,          // intervalo de atualização dos dados
  PAGE_MS: 10000,            // troca de página quando há mais turnos que linhas
  ROWS_PER_PAGE: 10,         // linhas visíveis no painel
  SOON_MINUTES: 15,          // "EM BREVE" quando faltar até X minutos
};
