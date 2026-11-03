# OneVoice27 — Turnos de Oração

Sistema web estático (HTML + JavaScript, sem build) com banco **Supabase** para:

- **Cadastro de participantes** (`participantes.html`) — nome e campo.
- **Cadastro dos turnos/duplas de oração** (`turnos.html`) — horário inicial, horário final, participante 1 e participante 2.
- **Painel para TV** (`painel.html`) — quadro no estilo aeroporto, proporção 16:9, atualizado a cada 5 segundos.

## Painel (TV)

Colunas: `Início · Término · Participante 1 · Campo · Participante 2 · Campo · Situação`

- Consulta o Supabase a cada **5 segundos** e reavalia os horários a cada segundo.
- Turnos **encerrados são removidos** da tela automaticamente.
- Turnos **em andamento** ficam fixos no topo, em **destaque verde** com brilho e barra de progresso.
- Turnos que começam em até 15 minutos aparecem como **"Em X min"** (laranja).
- Se houver mais turnos do que cabem na tela, as próximas páginas alternam a cada 10 segundos.
- Layout travado em **16:9**: ocupa a TV inteira e mantém a proporção em qualquer resolução.
- Clique ou tecla **F** = tela cheia; o cursor some sozinho; a tela não entra em descanso (Wake Lock).
- Se a internet cair, continua mostrando os últimos dados (indicador vermelho no rodapé).
- `painel.html?demo=1` mostra dados fictícios para testar a TV sem banco.

Os ajustes (intervalos, linhas por página, minutos para "Em breve") ficam em `config.js`.

## Instalação

1. **Crie as tabelas**: no Supabase, abra *SQL Editor* e execute `supabase/schema.sql`.
   Ele cria `onevoice27_participantes` e `onevoice27_turno_oracao`, os relacionamentos e as regras de segurança.
2. **Configure as chaves**: em *Project Settings › API*, copie a *Project URL* e a chave *anon public* para `config.js`.
3. **Crie o usuário de cadastro**: em *Authentication › Users › Add user*, crie um usuário com e-mail e senha.
   As telas de cadastro pedem esse login; o painel da TV não precisa de login (somente leitura).
4. **Publique** a pasta em qualquer hospedagem estática (GitHub Pages, Netlify, Vercel, Cloudflare Pages)
   ou teste localmente:

   ```bash
   python3 -m http.server 8080
   ```

   e acesse `http://localhost:8080`.

## Estrutura do banco

| `onevoice27_participantes` | tipo |
|---|---|
| id | bigint (PK) |
| nome | text |
| campo | text |
| created_at | timestamptz |

| `onevoice27_turno_oracao` | tipo |
|---|---|
| id | bigint (PK) |
| horario_inicial | timestamptz |
| horario_final | timestamptz |
| participante1_id | bigint → participantes.id |
| participante2_id | bigint → participantes.id |
| created_at | timestamptz |

Regras: horário final > inicial; participantes 1 e 2 diferentes; não é possível excluir um participante
que esteja em algum turno. Ao cadastrar, o sistema avisa se algum participante já está em outro turno
no mesmo horário.

Os horários são gravados com fuso horário e exibidos no horário local do navegador, por isso
o relógio/fuso da TV deve estar correto.
