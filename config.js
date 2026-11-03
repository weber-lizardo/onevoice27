// Configuração do Supabase.
// Encontre estes valores em: Supabase Dashboard > Project Settings > API
// A chave "anon" é pública por natureza; a segurança é feita pelas
// políticas RLS definidas em supabase/schema.sql.
window.ONEVOICE_CONFIG = {
  SUPABASE_URL: "https://dwjseiqsqjcafkflowkd.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_Y4h7hTCWM1zg7v1SFcdwKg_2aVTEZlH",

  // Painel (TV)
  REFRESH_MS: 5000,          // intervalo de atualização dos dados
  PAGE_MS: 10000,            // troca de página quando há mais turnos que linhas
  ROWS_PER_PAGE: 10,         // linhas visíveis no painel
  SOON_MINUTES: 15,          // "EM BREVE" quando faltar até X minutos
};
