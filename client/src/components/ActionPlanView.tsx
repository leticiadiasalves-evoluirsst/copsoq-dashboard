/*
 * ActionPlanView — Plano de Ação por Dimensão em Risco
 * Design: Structured Report / Institutional Analytics
 *
 * Exibe as ações recomendadas para cada dimensão classificada como
 * Risco (Vermelho) ou Atenção (Âmbar), baseadas nas boas práticas
 * de gestão de riscos psicossociais do COPSOQ II / NR-17.
 */

import { useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { type DimensionScore } from "@/lib/copsoq";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  ClipboardCheck,
  Info,
} from "lucide-react";

// ─── Recommended actions per dimension ───────────────────────────────────────
const DIMENSION_ACTIONS: Record<string, { short: string; actions: string[] }> = {
  "Exigências Quantitativas": {
    short: "Redistribuição e dimensionamento da carga de trabalho",
    actions: [
      "Realizar análise de distribuição de tarefas e identificar sobrecargas individuais ou setoriais.",
      "Revisar o dimensionamento do quadro de pessoal em relação ao volume de trabalho exigido.",
      "Implementar ferramentas de gestão de demandas (ex.: sistemas de tickets, priorização de tarefas).",
      "Estabelecer limites claros para horas extras e garantir períodos adequados de recuperação.",
      "Promover reuniões periódicas de alinhamento para redistribuição de demandas em picos de trabalho.",
    ],
  },
  "Ritmo de Trabalho": {
    short: "Controle do ritmo e pausas regulares",
    actions: [
      "Revisar metas de produtividade e verificar se são compatíveis com o tempo disponível.",
      "Introduzir pausas regulares obrigatórias durante a jornada (conforme NR-17, item 17.6.3).",
      "Avaliar se sistemas de monitoramento eletrônico de desempenho estão gerando pressão excessiva.",
      "Capacitar lideranças para identificar sinais de sobrecarga de ritmo nas equipes.",
      "Revisar processos e eliminar etapas desnecessárias que aumentam artificialmente o ritmo.",
    ],
  },
  "Exigências Cognitivas": {
    short: "Adequação das demandas cognitivas e suporte técnico",
    actions: [
      "Avaliar a complexidade das tarefas em relação à qualificação e experiência dos trabalhadores.",
      "Oferecer treinamentos e capacitações para reduzir a carga cognitiva associada à falta de domínio técnico.",
      "Revisar procedimentos operacionais para simplificar processos excessivamente complexos.",
      "Garantir acesso a informações, manuais e suporte técnico durante a execução das tarefas.",
      "Implementar rodízio de funções para reduzir a exposição prolongada a tarefas de alta demanda cognitiva.",
    ],
  },
  "Exigências Emocionais": {
    short: "Suporte emocional e gestão do trabalho com público",
    actions: [
      "Implementar programa de suporte psicológico (ex.: Programa de Assistência ao Empregado — PAE).",
      "Capacitar trabalhadores em técnicas de regulação emocional e comunicação não violenta.",
      "Estabelecer espaços de escuta ativa e supervisão de casos para trabalhadores que lidam com situações de sofrimento.",
      "Revisar a política de atendimento ao cliente/usuário para reduzir situações de conflito e violência.",
      "Garantir pausas após atendimentos de alta carga emocional (ex.: situações de luto, conflito, violência).",
    ],
  },
  "Influência no Trabalho": {
    short: "Ampliação da autonomia e participação nas decisões",
    actions: [
      "Implementar práticas de gestão participativa, com envolvimento dos trabalhadores nas decisões que afetam seu trabalho.",
      "Revisar o grau de supervisão e controle, reduzindo microgerenciamento onde possível.",
      "Criar canais formais de sugestões e feedback ascendente (ex.: caixas de sugestões, reuniões de equipe).",
      "Delegar responsabilidades de acordo com a capacidade e experiência de cada trabalhador.",
      "Promover autonomia na organização do próprio trabalho (sequência de tarefas, métodos, horários flexíveis).",
    ],
  },
  "Possibilidades de Desenvolvimento": {
    short: "Plano de desenvolvimento e aprendizagem contínua",
    actions: [
      "Elaborar Plano Individual de Desenvolvimento (PID) para cada trabalhador.",
      "Oferecer oportunidades de treinamento, cursos e qualificação profissional.",
      "Criar programas de mentoria e job rotation para ampliar o repertório de competências.",
      "Reconhecer e valorizar o aprendizado e o desenvolvimento de novas habilidades.",
      "Revisar as funções para incluir tarefas desafiadoras e com perspectiva de crescimento.",
    ],
  },
  "Previsibilidade": {
    short: "Comunicação organizacional e transparência nas mudanças",
    actions: [
      "Estabelecer rotina de comunicação interna sobre decisões, mudanças e planos futuros da organização.",
      "Garantir que informações relevantes para a execução do trabalho sejam repassadas com antecedência.",
      "Criar boletins informativos, murais ou reuniões periódicas de alinhamento organizacional.",
      "Envolver os trabalhadores no planejamento de mudanças que afetam diretamente suas funções.",
      "Revisar a política de comunicação interna para garantir clareza, regularidade e acessibilidade.",
    ],
  },
  "Transparência do Papel Laboral": {
    short: "Clareza de funções e responsabilidades",
    actions: [
      "Revisar e atualizar as descrições de cargos e funções, garantindo clareza sobre responsabilidades.",
      "Realizar reuniões individuais de alinhamento entre liderança e trabalhadores sobre expectativas de desempenho.",
      "Elaborar ou revisar os Procedimentos Operacionais Padrão (POPs) das funções.",
      "Garantir que cada trabalhador tenha acesso ao seu contrato de trabalho e às normas internas aplicáveis.",
      "Implementar avaliações de desempenho com critérios claros e previamente comunicados.",
    ],
  },
  "Recompensas": {
    short: "Reconhecimento e valorização profissional",
    actions: [
      "Implementar programas formais de reconhecimento (ex.: colaborador do mês, premiações por metas).",
      "Revisar a política salarial e de benefícios para garantir equidade interna e competitividade externa.",
      "Capacitar lideranças para práticas de feedback positivo e reconhecimento cotidiano.",
      "Criar oportunidades de promoção e progressão de carreira baseadas em critérios transparentes.",
      "Realizar pesquisas de clima organizacional para identificar lacunas na percepção de reconhecimento.",
    ],
  },
  "Apoio Social de Superiores": {
    short: "Desenvolvimento de lideranças e suporte às equipes",
    actions: [
      "Capacitar lideranças em gestão de pessoas, escuta ativa e suporte emocional às equipes.",
      "Implementar política de portas abertas para que trabalhadores possam acessar seus superiores.",
      "Estabelecer reuniões regulares de acompanhamento individual (one-on-one) entre líderes e liderados.",
      "Incluir indicadores de suporte às equipes nas avaliações de desempenho das lideranças.",
      "Promover treinamentos em liderança servidora e gestão humanizada.",
    ],
  },
  "Apoio Social de Colegas": {
    short: "Fortalecimento do trabalho em equipe e clima organizacional",
    actions: [
      "Promover atividades de integração e fortalecimento do trabalho em equipe.",
      "Revisar a organização do trabalho para identificar se há isolamento físico ou funcional de trabalhadores.",
      "Implementar programas de integração para novos colaboradores.",
      "Criar espaços de convivência e interação informal entre os trabalhadores.",
      "Mediar conflitos interpessoais de forma estruturada, com apoio de RH ou mediador externo.",
    ],
  },
  "Qualidade da Liderança": {
    short: "Capacitação e desenvolvimento de lideranças",
    actions: [
      "Implementar programa de desenvolvimento de lideranças com foco em habilidades interpessoais.",
      "Realizar avaliação 360° das lideranças, incluindo feedback das equipes lideradas.",
      "Capacitar gestores em planejamento do trabalho, delegação e gestão de conflitos.",
      "Estabelecer código de conduta para lideranças, com diretrizes claras sobre comportamentos esperados.",
      "Criar programa de coaching ou mentoria para líderes com resultados abaixo do esperado.",
    ],
  },
  "Confiança Vertical": {
    short: "Construção de confiança entre gestão e trabalhadores",
    actions: [
      "Promover transparência nas decisões organizacionais, comunicando os critérios e justificativas.",
      "Garantir que compromissos assumidos pela gestão sejam cumpridos de forma consistente.",
      "Criar mecanismos de participação dos trabalhadores em decisões que os afetam.",
      "Revisar práticas de monitoramento e controle que possam ser percebidas como desconfiança.",
      "Realizar pesquisas de clima com devolutiva transparente e plano de ação visível.",
    ],
  },
  "Justiça e Respeito": {
    short: "Equidade, ética e resolução justa de conflitos",
    actions: [
      "Revisar a política de distribuição de tarefas, benefícios e oportunidades para garantir equidade.",
      "Implementar ou revisar os canais de denúncia e ouvidoria interna.",
      "Capacitar lideranças em gestão ética e resolução justa de conflitos.",
      "Estabelecer procedimentos claros e transparentes para resolução de conflitos e reclamações.",
      "Realizar auditorias periódicas de equidade de gênero, raça e outras dimensões de diversidade.",
    ],
  },
  "Auto-eficácia": {
    short: "Fortalecimento da confiança e competência profissional",
    actions: [
      "Oferecer treinamentos e capacitações alinhados às demandas do trabalho.",
      "Implementar práticas de feedback construtivo e reconhecimento de conquistas.",
      "Criar ambiente psicologicamente seguro para que os trabalhadores possam errar e aprender.",
      "Revisar a complexidade das tarefas para garantir que sejam desafiadoras, mas alcançáveis.",
      "Promover programas de mentoria para trabalhadores com menor confiança em suas capacidades.",
    ],
  },
  "Significado do Trabalho": {
    short: "Conexão entre o trabalho e seu propósito",
    actions: [
      "Comunicar de forma clara a missão, visão e valores da organização e sua conexão com o trabalho de cada equipe.",
      "Promover encontros onde trabalhadores possam compartilhar o impacto positivo do seu trabalho.",
      "Revisar a organização do trabalho para reduzir tarefas percebidas como sem sentido ou redundantes.",
      "Envolver os trabalhadores em projetos de melhoria e inovação que gerem impacto visível.",
      "Reconhecer publicamente a contribuição de cada área para os resultados organizacionais.",
    ],
  },
  "Compromisso com o Local de Trabalho": {
    short: "Engajamento e pertencimento organizacional",
    actions: [
      "Realizar pesquisas de engajamento e agir sobre os resultados de forma transparente.",
      "Criar programas de reconhecimento e valorização da permanência e dedicação dos trabalhadores.",
      "Revisar as condições de trabalho (físicas, organizacionais e relacionais) que podem estar gerando desengajamento.",
      "Promover a participação dos trabalhadores em decisões estratégicas e projetos de melhoria.",
      "Investigar causas de rotatividade e absenteísmo como indicadores complementares de desengajamento.",
    ],
  },
  "Satisfação no Trabalho": {
    short: "Melhoria das condições gerais de trabalho",
    actions: [
      "Realizar diagnóstico qualitativo (entrevistas, grupos focais) para identificar as principais fontes de insatisfação.",
      "Revisar as condições físicas, organizacionais e relacionais do trabalho com base nos resultados.",
      "Implementar plano de ação com metas mensuráveis para melhoria dos fatores identificados.",
      "Garantir que as lideranças estejam capacitadas para identificar e responder a sinais de insatisfação.",
      "Reavaliar os resultados após 12 meses para verificar a eficácia das intervenções.",
    ],
  },
  "Insegurança Laboral": {
    short: "Comunicação transparente sobre estabilidade e perspectivas",
    actions: [
      "Comunicar de forma clara e transparente a situação da empresa e as perspectivas de emprego.",
      "Evitar rumores e incertezas prolongadas sobre reestruturações, demissões ou mudanças organizacionais.",
      "Oferecer programas de qualificação e recolocação em casos de reestruturação inevitável.",
      "Revisar contratos e condições de trabalho para reduzir a precariedade percebida.",
      "Criar canais de diálogo onde trabalhadores possam esclarecer dúvidas sobre sua situação profissional.",
    ],
  },
  "Saúde Geral": {
    short: "Promoção da saúde e vigilância epidemiológica",
    actions: [
      "Implementar programa de promoção da saúde (alimentação saudável, atividade física, saúde mental).",
      "Garantir a realização dos exames periódicos de saúde conforme o PCMSO.",
      "Investigar a relação entre as condições de trabalho e os indicadores de saúde identificados.",
      "Oferecer acesso a serviços de saúde mental (psicólogo, psiquiatra) via plano de saúde ou PAE.",
      "Monitorar indicadores de absenteísmo por doença e afastamentos relacionados à saúde.",
    ],
  },
  "Conflito Trabalho-Família": {
    short: "Equilíbrio entre vida profissional e pessoal",
    actions: [
      "Revisar a política de horas extras e garantir que não sejam sistemáticas ou compulsórias.",
      "Implementar ou ampliar políticas de flexibilidade de horário e trabalho remoto onde aplicável.",
      "Respeitar os períodos de descanso, férias e licenças previstas em lei.",
      "Capacitar lideranças para respeitar os limites entre o tempo de trabalho e o tempo pessoal dos trabalhadores.",
      "Criar política de desconexão digital fora do horário de trabalho.",
    ],
  },
  "Problemas em Dormir": {
    short: "Gestão do estresse e higiene do sono",
    actions: [
      "Investigar fatores organizacionais que possam estar contribuindo para os problemas de sono (ex.: turnos noturnos, horas extras, estresse elevado).",
      "Oferecer orientações sobre higiene do sono e manejo do estresse por meio de programas de bem-estar.",
      "Garantir que trabalhadores em turnos tenham escala compatível com a recuperação biológica.",
      "Encaminhar trabalhadores com queixas persistentes para avaliação médica no PCMSO.",
      "Revisar a carga de trabalho e o nível de estresse como possíveis causas subjacentes.",
    ],
  },
  "Burnout": {
    short: "Prevenção e tratamento do esgotamento profissional",
    actions: [
      "Implementar programa de prevenção ao burnout com foco na redução das exigências laborais e no aumento dos recursos disponíveis.",
      "Garantir acesso a suporte psicológico e psiquiátrico para trabalhadores em sofrimento.",
      "Revisar a carga de trabalho, o ritmo e as exigências emocionais como fatores contribuintes.",
      "Capacitar lideranças para identificar sinais precoces de esgotamento nas equipes.",
      "Implementar política de retorno gradual ao trabalho após afastamentos por burnout.",
    ],
  },
  "Stress": {
    short: "Gestão do estresse ocupacional",
    actions: [
      "Realizar análise das principais fontes de estresse no ambiente de trabalho (entrevistas, grupos focais).",
      "Implementar programa de gestão do estresse com técnicas de relaxamento, mindfulness e resiliência.",
      "Revisar os fatores organizacionais identificados como estressores (carga, conflitos, insegurança).",
      "Oferecer suporte psicológico individual e em grupo para trabalhadores com alto nível de estresse.",
      "Monitorar indicadores de saúde mental e absenteísmo como medidas de resultado das intervenções.",
    ],
  },
  "Sintomas Depressivos": {
    short: "Suporte à saúde mental e encaminhamento especializado",
    actions: [
      "Garantir acesso a serviços de saúde mental (psicólogo, psiquiatra) via plano de saúde ou PAE.",
      "Capacitar lideranças e trabalhadores para identificar e acolher colegas com sinais de sofrimento psíquico.",
      "Implementar protocolo de acolhimento e encaminhamento para trabalhadores em crise.",
      "Investigar fatores organizacionais que possam estar contribuindo para o sofrimento mental.",
      "Promover campanhas de conscientização sobre saúde mental e redução do estigma.",
    ],
  },
  "Comportamentos Ofensivos": {
    short: "Prevenção ao assédio e violência no trabalho",
    actions: [
      "Implementar ou revisar a Política de Prevenção ao Assédio Moral e Sexual, com divulgação ampla.",
      "Criar canal de denúncia confidencial e garantir investigação imparcial de todos os casos.",
      "Realizar treinamentos obrigatórios sobre assédio moral, sexual e violência no trabalho para todos os trabalhadores e lideranças.",
      "Aplicar medidas disciplinares proporcionais e consistentes em casos confirmados.",
      "Oferecer suporte psicológico às vítimas e acompanhar sua reintegração ao ambiente de trabalho.",
    ],
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function ActionCard({ score }: { score: DimensionScore }) {
  const info = DIMENSION_ACTIONS[score.dimension.name];
  const isRed = score.riskLevel === "red";

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden",
      isRed ? "border-red-200" : "border-amber-200"
    )}>
      {/* Header */}
      <div className={cn(
        "px-4 py-3 flex items-start justify-between gap-3",
        isRed ? "bg-red-50" : "bg-amber-50"
      )}>
        <div className="flex items-start gap-2.5">
          {isRed
            ? <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
            : <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          }
          <div>
            <p className={cn("font-semibold text-sm", isRed ? "text-red-800" : "text-amber-800")}>
              {score.dimension.name}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{score.dimension.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn(
            "text-sm font-bold",
            isRed ? "text-red-700" : "text-amber-700"
          )}>
            {score.score.toFixed(2)}
          </span>
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full border",
            isRed
              ? "bg-red-100 text-red-700 border-red-300"
              : "bg-amber-100 text-amber-700 border-amber-300"
          )}>
            {isRed ? "Risco" : "Atenção"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white px-4 py-3">
        {info ? (
          <>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Lightbulb size={13} className="text-blue-600 flex-shrink-0" />
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                {info.short}
              </p>
            </div>
            <ul className="space-y-1.5">
              {info.actions.map((action, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ClipboardCheck size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-slate-700 leading-relaxed">{action}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-xs text-slate-500 italic">
            Consulte um especialista em saúde ocupacional para definir as ações adequadas a esta dimensão.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ActionPlanView() {
  const { scores } = useDashboard();

  const redScores = useMemo(
    () => scores.filter((s) => s.riskLevel === "red"),
    [scores]
  );
  const amberScores = useMemo(
    () => scores.filter((s) => s.riskLevel === "amber"),
    [scores]
  );

  const hasAny = redScores.length > 0 || amberScores.length > 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
          Plano de Ação — Medidas de Controle
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Ações recomendadas para as dimensões classificadas como Risco ou Atenção, conforme NR-17 e NR-01 (PGR)
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <Info size={15} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800 leading-relaxed">
          As ações listadas abaixo são recomendações baseadas nas boas práticas de gestão de riscos psicossociais do COPSOQ II e da NR-17. Cada dimensão classificada como <strong>Risco (Vermelho)</strong> requer registro de medida de controle no PGR com responsável e prazo definidos. Dimensões em <strong>Atenção (Âmbar)</strong> devem ser monitoradas e, preferencialmente, contempladas com medidas preventivas.
        </p>
      </div>

      {!hasAny && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-4">
          <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Nenhuma dimensão em situação de risco ou atenção</p>
            <p className="text-xs text-green-700 mt-0.5">
              Todas as dimensões avaliadas estão em situação favorável. Mantenha o monitoramento periódico e as boas práticas atuais.
            </p>
          </div>
        </div>
      )}

      {/* Red — Risk */}
      {redScores.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600" />
            <h3 className="text-sm font-bold text-red-700 uppercase tracking-wide">
              Risco para a Saúde — Intervenção Prioritária ({redScores.length} {redScores.length === 1 ? "dimensão" : "dimensões"})
            </h3>
          </div>
          <div className="space-y-3">
            {redScores.map((s) => (
              <ActionCard key={s.dimension.id} score={s} />
            ))}
          </div>
        </div>
      )}

      {/* Amber — Attention */}
      {amberScores.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600" />
            <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wide">
              Situação Intermédia — Medidas Preventivas ({amberScores.length} {amberScores.length === 1 ? "dimensão" : "dimensões"})
            </h3>
          </div>
          <div className="space-y-3">
            {amberScores.map((s) => (
              <ActionCard key={s.dimension.id} score={s} />
            ))}
          </div>
        </div>
      )}

      {/* Footer note */}
      {hasAny && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-600">Nota:</strong> As ações acima são recomendações gerais baseadas na literatura de saúde ocupacional e nas diretrizes do COPSOQ II. A definição das medidas de controle definitivas deve considerar o contexto específico da organização, ser validada pelo SESMT ou profissional de segurança e saúde do trabalho responsável, e registrada formalmente no PGR com responsável, prazo e indicador de verificação.
          </p>
        </div>
      )}
    </div>
  );
}
