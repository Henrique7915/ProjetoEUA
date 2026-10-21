# Viagem da Galera ✈️🌴🍁

App de navegador (PWA, instala no celular) para um grupo de amigos planejar uma viagem junto: **Flórida + Canadá**, mas serve para qualquer destino.

Ninguém precisa criar conta: quem cria a viagem recebe um **código/link de convite**, manda no grupo e cada pessoa entra escolhendo o próprio nome.

## O que tem

| Aba | O que faz |
| --- | --- |
| **Início** | Contagem regressiva, cidades, quem está no grupo, seus próximos passos da checklist, enquetes esperando seu voto, ideias mais votadas, seu saldo, câmbio do dia e novidades da galera. Durante a viagem, mostra o plano de hoje. |
| **Ideias** | Cole qualquer link (Airbnb, Booking, parque, restaurante, TikTok, YouTube, Google Maps) e ele vira um card com foto e título. Categoria sugerida automaticamente, 👍/👎, comentários, status (ideia → aprovado → reservado), preço por pessoa ou total, endereço no mapa e código da reserva. Filtros por situação, categoria e cidade. No Android dá para usar **Compartilhar → Viagem** direto de outros apps. |
| **Roteiro** | Um cartão por dia com a cidade, o clima (previsão quando faltar até 15 dias; antes disso, como foi nos mesmos dias do ano passado), hospedagem com check-in/out e os horários. Exporta tudo para o calendário do celular (.ics). |
| **Mapa** | Todas as ideias com endereço, coloridas por categoria, filtráveis por dia. Botão "Como chegar". |
| **Gastos** | Estilo Splitwise: quem pagou, em qual moeda (USD, CAD, BRL, EUR), divisão igual ou por valores, saldo de cada um e o **mínimo de pagamentos para acertar**. A aba *Previsto* soma as ideias aprovadas com preço e mostra o orçamento por pessoa. |
| **Checklist** | Já vem com o básico para EUA + Canadá (passaporte, visto, eTA, seguro, reservas, eSIM...). Itens "de cada um" (cada pessoa marca o seu) ou "do grupo" (com responsável e prazo). |
| **Enquetes** | "Qual mês vamos?", "Disney ou Universal?". Uma ou várias opções, encerrar e reabrir. |
| **Câmbio** | Conversor com a cotação do dia e o IOF + spread do seu cartão. |
| **Guia** | Visto americano, eTA do Canadá (só vale chegando de avião!), passaporte, seguro, cartão/IOF, gorjeta e impostos, carro e pedágio, eSIM e tomada, clima e furacões, parques e Receita na volta. Com links oficiais. |
| **Grupo** | Convite por link, QR code e WhatsApp, pessoas (cor e emoji), dados da viagem e cidades com datas. |
| **Ajustes** | 5 temas (Oceano, Pôr do sol, Bordo, Floresta e Noite/escuro), exportar roteiro (.ics), planilha de gastos (.csv) e backup (.json), apagar viagem. |

Tudo sincroniza entre os celulares em tempo real e o app abre sem internet com a última cópia salva.

## Stack

Vite + React + TypeScript + Tailwind, Leaflet/OpenStreetMap, Supabase (Postgres com RLS + Realtime) e Vercel (site + função `/api/preview` que lê a foto e o título dos links). Visual baseado no app Calendário Mulher (cards arredondados, navegação inferior, folhas que sobem de baixo, Plus Jakarta Sans).

Serviços gratuitos sem chave: Open-Meteo (clima), Frankfurter/BCE (câmbio, com open.er-api de reserva), Nominatim/OpenStreetMap (endereços).

```bash
npm install
npm run dev        # http://localhost:5173 (modo local se não houver .env.local)
npm test           # contas, links, .ics e as regras do banco num Postgres em memória
npm run build
```

Sem as variáveis do Supabase, o app roda em **modo local**: os dados ficam só no navegador (abas diferentes se enxergam, o que ajuda a simular a galera).

## Como funciona o acesso (sem login)

- `trip_create` (RPC) gera um código aleatório de 12 caracteres e cadastra a primeira pessoa.
- O app manda o código no cabeçalho `x-trip-code` de toda requisição. As políticas RLS de todas as tabelas `trip_*` só liberam as linhas cuja `trip_id` é a da viagem desse código. Sem código (ou com código errado) não se lê nem se grava nada.
- O "login" é escolher o nome na lista; fica salvo no aparelho.
- As mudanças chegam aos outros por um canal de *broadcast* do Supabase Realtime, que só avisa "a tabela X mudou". Os dados em si sempre vêm pela API, passando pelo RLS.

Quem tem o código pode ver e editar a viagem, então ele deve ficar só no grupo.

## Colocar no ar

### 1. Supabase

As tabelas usam o prefixo `trip_` (mais a tabela `trips`) e podem morar num projeto que já tem outras coisas.

1. Em **SQL Editor**, rode [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) (ou `supabase db push`).
2. Em **Project Settings > API**, copie a **Project URL** e a chave **publishable/anon**.

### 2. Vercel

1. **Add New > Project** e importe este repositório (Vite é detectado pelo `vercel.json`).
2. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Deploy. No celular, abra o site e use **Adicionar à tela de início**.

## Estrutura

| Pasta | O que tem |
| --- | --- |
| `src/screens/` | Telas |
| `src/components/` | Peças de interface (folhas, cards de ideia, formulário de gasto, menu) |
| `src/data/` | Tipos, acesso ao Supabase/modo local, estado compartilhado e cálculos derivados |
| `src/lib/` | Datas, dinheiro (divisão e acerto), câmbio, clima, mapa, links, .ics e exportação |
| `src/content/` | Categorias, cidades, checklist inicial, temas e textos do guia |
| `api/preview.js` | Função da Vercel que lê og:title/og:image dos links (só endereços públicos) |
| `supabase/` | Migração e o stub de `auth` usado nos testes |
| `tests/` | Vitest + PGlite |
