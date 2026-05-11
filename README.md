# Preline — CRM de pré-vendas com IA (Vibe Coding / Full Stack)

**Preline** é o CRM para equipes de SDR: **workspaces** isolados, **funil em Kanban**, **campos personalizados**, **campanhas** com contexto + prompt, **mensagens geradas com Gemini** (Edge Function), **gatilho por etapa**, **validação de campos obrigatórios** ao mudar etapa, **envio simulado** (move o lead para *Tentando Contato*), **dashboard** e **histórico de atividades**.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 15.5.18 (App Router), React 19, Tailwind CSS 4, `@dnd-kit` (Kanban) |
| Backend / DB / Auth | Supabase (PostgreSQL + Auth) |
| API de IA | Google Gemini (`generate-lead-messages` Edge Function, TypeScript/Deno) |
| Hospedagem sugerida | Vercel (frontend) + Supabase (já configurado) |

## Repositório

- App web: pasta `web/`
- Banco e políticas: migrações aplicadas no projeto Supabase **CRM_SDR** (ref público: `hddlzopvercayocfpnpa`)

## Deploy na Vercel

Projeto **preline-crm** na equipe **f-kaues-projects**.

- **URL principal (domínio Vercel):** [https://preline-crm.vercel.app](https://preline-crm.vercel.app)
- **Redirect / legado:** `https://web-bice-sigma-91.vercel.app` continua nas URLs permitidas do Supabase para não quebrar links antigos.
- **Variáveis em Production:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**Supabase Auth:** `site_url` e redirect URLs apontam para **preline-crm.vercel.app** e localhost. O login é **manual** (sem pré-preenchimento ou auto-login).

## Configuração local (`web/`)

1. Copie variáveis:

   ```bash
   cd web
   cp .env.example .env.local
   ```

2. Preencha no `.env.local` (Settings → API no Supabase):

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (chave **anon** / publishable legada — nunca commite valores reais)

3. Instale e rode:

   ```bash
   npm install
   npm run dev
   ```

4. **Gemini na Edge Function** (obrigatório para IA):

   No painel Supabase: **Project Settings → Edge Functions → Secrets** adicione:

   - `GEMINI_API_KEY` — obtida em [Google AI Studio](https://aistudio.google.com/apikey) (API key do Gemini).
   - (Opcional) `GEMINI_MODEL` — padrão na função: `gemini-2.0-flash`.

   Sem esse segredo, mover lead / gerar mensagem retornará erro claro na UI.

5. **Auth**: se o projeto exigir confirmação de e-mail, desative temporariamente em Authentication → Providers → Email, ou confirme o usuário no painel, para testar o fluxo da prova.

## Arquitetura e decisões

### Multi-tenancy (workspace)

- Tabelas principais carregam `workspace_id`.
- `workspace_members` liga `auth.users` ao workspace com papel `admin` | `member`.
- **RLS** usa funções `SECURITY DEFINER` (`is_workspace_member`, `workspace_role`) para evitar vazamento de dados entre workspaces.
- Cookie HTTP-only `crm_workspace_id` escolhe o workspace ativo quando o usuário participa de vários.

### Funil e etapas

- Ao criar um workspace, um trigger insere etapas padrão (`base`, `mapped`, `trying_contact`, etc.).
- A etapa **Tentando Contato** usa `stage_key = trying_contact` para o RPC de envio simulado.

### Validação de transição

- RPC `move_lead_to_stage(lead, stage)` verifica `stage_required_fields` (campos padrão enum + customizados).
- Retorno JSON: `{ ok: false, missing: ["campo", ...] }` ou `{ ok: true }`.

### Integração LLM

- Edge Function `generate-lead-messages` valida o JWT do usuário e usa o cliente Supabase com o mesmo token (**RLS aplicada**).
- Monta prompt com contexto da campanha + instruções + snapshot do lead (incluindo custom fields).
- Modo `manual`: `{ leadId, campaignId, mode: "manual" }`.
- Modo gatilho: `{ leadId, mode: "triggers" }` — gera para **todas** as campanhas ativas cuja `trigger_stage_id` coincide com a etapa atual do lead.
- Resposta esperada do modelo: JSON `{ "messages": ["...", "...", "..."] }`.

### Histórico

- `lead_activities` registra criação, edição, mudança de etapa, geração e envio simulado.

## Funcionalidades (checklist da prova)

**Obrigatórios**

- [x] Cadastro / login (Supabase Auth)
- [x] Workspace + isolamento de dados + troca de workspace
- [x] Leads com campos padrão + campos personalizados por workspace
- [x] Kanban por etapa + mover lead (drag-and-drop)
- [x] Detalhe do lead + edição
- [x] Campanhas: nome, contexto, prompt, etapa gatilho opcional
- [x] Gerar 3 variações (configurável no prompt), regenerar, copiar, enviar (simulado → *Tentando Contato*)
- [x] Regras de campos obrigatórios por etapa
- [x] Dashboard com totais e distribuição por etapa
- [x] Edge Function + variáveis sensíveis no Supabase

**Diferenciais implementados**

- [x] Geração automática por etapa gatilho (ao mover ou após criar lead — chamada `triggers`)
- [x] Multi-workspace + criação extra em Configurações
- [x] RLS no PostgreSQL
- [x] Histórico de atividades no lead
- [x] Histórico de mensagens “enviadas” (`sent_messages`)

**Ainda não coberto (ideias para evolução)**

- [ ] Convite por e-mail com papéis (hoje só admin adiciona membro via política RLS; UI de convite não foi feita)
- [ ] Filtros avançados de leads / métricas de conversão
- [ ] Edição completa do funil (criar/renomear etapas na UI — hoje etapas vêm do seed; políticas já permitem CRUD em `pipeline_stages`)

## Entrega para avaliação

1. **Repositório GitHub** com histórico de commits.
2. **README** (este arquivo) + decisões técnicas.
3. **Deploy** (ex.: Vercel) com `.env` de produção.
4. **Vídeo** (até 10 min) — coloque o link no README ou envie junto: fluxo cadastro → lead → IA → envio simulado; cite RLS, RPC e Edge Function.

## Estrutura do banco (resumo)

- `workspaces`, `workspace_members`, `pipeline_stages`, `stage_required_fields`
- `custom_field_definitions`, `leads`, `lead_custom_values`
- `campaigns`, `lead_message_suggestions`, `sent_messages`, `lead_activities`

Migrações aplicadas via Supabase MCP: `001_initial_crm_schema`, `002_rls_and_helpers`, `003_rpc_move_and_send`.

---

**Autor:** entrega prova técnica — maio/2026.
