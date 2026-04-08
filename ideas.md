# Ideias de Design — Painel COPSOQ II

## Abordagem 1: Institutional Precision
<response>
<text>
**Design Movement:** Modernismo Institucional Europeu — inspirado em relatórios de saúde ocupacional nórdicos.

**Core Principles:**
- Clareza analítica acima de tudo: cada elemento existe para comunicar dados
- Hierarquia tipográfica rigorosa com contraste de peso
- Estrutura assimétrica: sidebar fixa à esquerda + área de conteúdo principal

**Color Philosophy:** Paleta fria e profissional. Azul-ardósia escuro (#1E3A5F) como cor primária institucional, com cinza-neutro (#F4F6F9) como fundo. As cores do semáforo (verde, amarelo, vermelho) são os únicos elementos cromáticos quentes, usados exclusivamente para indicadores de risco.

**Layout Paradigm:** Dashboard de duas colunas — sidebar de navegação fixa (240px) + área de conteúdo scrollável. Cards de métricas no topo, gráficos de barras horizontais abaixo.

**Signature Elements:**
- Barras de progresso tricolores (semáforo) para cada dimensão
- Tabela de referência nacional como linha pontilhada nos gráficos
- Cabeçalho com logo institucional e nome da empresa avaliada

**Interaction Philosophy:** Hover revela detalhes numéricos; filtros por empresa/setor/função atualizam todos os gráficos simultaneamente.

**Animation:** Transições suaves de 200ms; barras animam da esquerda para a direita no carregamento.

**Typography System:** DM Sans (corpo) + DM Serif Display (títulos de seção) — contraste entre serifa e sans-serif reforça a autoridade do documento.
</text>
<probability>0.07</probability>
</response>

## Abordagem 2: Clinical Dashboard
<response>
<text>
**Design Movement:** Data Visualization Clínica — inspirado em dashboards de saúde pública (OMS, NIOSH).

**Core Principles:**
- Dados como protagonistas: visualizações grandes e legíveis
- Semáforo tricolor como sistema visual central
- Comparação empresa vs. referência nacional em destaque

**Color Philosophy:** Fundo branco puro (#FFFFFF) com acentos em azul-cobalto (#2563EB). Verde (#16A34A), Amarelo (#CA8A04) e Vermelho (#DC2626) são usados apenas para classificação de risco — nunca decorativamente.

**Layout Paradigm:** Grid de cards responsivo com sidebar colapsável. Topo com KPIs resumidos (quantas dimensões em verde/amarelo/vermelho), seguido de gráfico radar geral e depois detalhamento por categoria.

**Signature Elements:**
- Gráfico radar/spider para visão geral das dimensões
- Cards com badge colorido de risco para cada dimensão
- Tabela comparativa empresa vs. referência nacional

**Interaction Philosophy:** Upload de arquivo Excel diretamente no painel; filtros dinâmicos por empresa, setor e função.

**Animation:** Fade-in progressivo dos cards; gráfico radar desenha-se ao carregar.

**Typography System:** IBM Plex Sans (todo o painel) — tipografia técnica que remete a documentos científicos e relatórios institucionais.
</text>
<probability>0.09</probability>
</response>

## Abordagem 3: Structured Report (ESCOLHIDA)
<response>
<text>
**Design Movement:** Relatório Técnico Estruturado — visual de documento analítico profissional com toques de data journalism.

**Core Principles:**
- Leitura linear e hierárquica: o painel conta uma história de cima para baixo
- Densidade informacional controlada: cada seção tem um propósito único
- Contraste tipográfico forte entre rótulos e valores

**Color Philosophy:** Fundo cinza-gelo (#F8FAFC) com cards brancos. Azul-marinho (#0F2D5E) como cor primária. Semáforo: Verde (#15803D), Âmbar (#B45309), Vermelho (#B91C1C) — tons dessaturados para seriedade profissional.

**Layout Paradigm:** Sidebar de navegação fixa (256px) + área principal com seções empilhadas. Topo da área principal exibe resumo executivo com contadores de dimensões por nível de risco.

**Signature Elements:**
- Barra horizontal tricolor (semáforo) para cada dimensão com valor numérico
- Linha de referência nacional tracejada nos gráficos
- Seção de upload com drag-and-drop para novos dados do Forms

**Interaction Philosophy:** Filtros por empresa/setor/função no topo; ao mudar o filtro, todos os indicadores atualizam com animação suave.

**Animation:** Barras crescem da esquerda; contadores animam de 0 ao valor final; transições de 300ms entre estados.

**Typography System:** Source Serif 4 (títulos e cabeçalhos de seção) + Source Sans 3 (dados e labels) — família tipográfica coesa da Adobe, com serifa para autoridade e sans-serif para legibilidade de dados.
</text>
<probability>0.08</probability>
</response>

---

## Decisão de Design

**Abordagem escolhida: Structured Report (Abordagem 3)**

Justificativa: O painel serve como ferramenta de análise técnica para profissionais de segurança do trabalho. A estrutura de relatório técnico com sidebar de navegação, semáforo tricolor e comparação com referência nacional atende diretamente às necessidades da metodologia COPSOQ II. A tipografia Source Serif 4 + Source Sans 3 confere autoridade documental sem ser excessivamente formal.
