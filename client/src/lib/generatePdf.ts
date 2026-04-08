/*
 * generatePdf.ts — PDF Report Generator for COPSOQ II Dashboard
 * Pages: 1-Introdução, 2-Capa/KPIs, 3-Gráfico Dimensões, 4-Inventário, 5-Plano de Ação, 6-Tabela Detalhada
 * All paragraph text uses justified alignment via drawJustified helper.
 */

import jsPDF from "jspdf";
import { DimensionScore, CATEGORIES, Respondent, calcAllScores } from "./copsoq";
import { LOGO_BASE64 } from "./logoBase64";

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  primary:    [30, 64, 175] as [number, number, number],
  green:      [22, 163, 74] as [number, number, number],
  amber:      [217, 119, 6] as [number, number, number],
  red:        [220, 38, 38] as [number, number, number],
  greenBg:    [240, 253, 244] as [number, number, number],
  amberBg:    [255, 251, 235] as [number, number, number],
  redBg:      [254, 242, 242] as [number, number, number],
  dark:       [15, 23, 42] as [number, number, number],
  mid:        [71, 85, 105] as [number, number, number],
  light:      [148, 163, 184] as [number, number, number],
  border:     [226, 232, 240] as [number, number, number],
  bg:         [248, 250, 252] as [number, number, number],
  white:      [255, 255, 255] as [number, number, number],
};

type RGB = [number, number, number];

function riskColor(level: string): RGB {
  if (level === "green") return C.green;
  if (level === "amber") return C.amber;
  return C.red;
}
function riskBg(level: string): RGB {
  if (level === "green") return C.greenBg;
  if (level === "amber") return C.amberBg;
  return C.redBg;
}
function riskLabel(level: string): string {
  if (level === "green") return "Favorável";
  if (level === "amber") return "Atenção";
  return "Risco";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setFont(doc: jsPDF, style: "normal" | "bold" | "italic" = "normal", size = 10) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
}

function setColor(doc: jsPDF, rgb: RGB) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function drawRect(doc: jsPDF, x: number, y: number, w: number, h: number, fill: RGB, stroke?: RGB) {
  doc.setFillColor(fill[0], fill[1], fill[2]);
  if (stroke) {
    doc.setDrawColor(stroke[0], stroke[1], stroke[2]);
    doc.rect(x, y, w, h, "FD");
  } else {
    doc.setDrawColor(fill[0], fill[1], fill[2]);
    doc.rect(x, y, w, h, "F");
  }
}

function drawLine(doc: jsPDF, x1: number, y1: number, x2: number, y2: number, rgb: RGB, lw = 0.3) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(lw);
  doc.line(x1, y1, x2, y2);
}

function addFootersToAllPages(doc: jsPDF) {
  const totalPages = doc.internal.pages.length - 1;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawLine(doc, 14, H - 14, W - 14, H - 14, C.border, 0.3);
    setFont(doc, "normal", 7);
    setColor(doc, C.light);
    doc.text("COPSOQ II -- Avaliacao de Riscos Psicossociais -- NR-17", 14, H - 8);
    doc.text(`Pagina ${i} de ${totalPages}`, W - 14, H - 8, { align: "right" });
  }
}

function addPage(doc: jsPDF): number {
  doc.addPage();
  return doc.internal.pages.length - 1;
}

// ─── Justified text helper ──────────────────────────────────────────────────
// Distributes extra horizontal space between words to fill the full line width.
function drawJustified(
  doc: jsPDF,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number
): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  let cy = startY;
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const isLast = idx === lines.length - 1;
    if (isLast || !line.trim()) {
      doc.text(line, x, cy);
    } else {
      const words = line.trim().split(" ");
      if (words.length <= 1) {
        doc.text(line, x, cy);
      } else {
        const totalWordWidth = words.reduce((sum, w) => sum + doc.getTextWidth(w), 0);
        const gap = (maxWidth - totalWordWidth) / (words.length - 1);
        let wx = x;
        for (const word of words) {
          doc.text(word, wx, cy);
          wx += doc.getTextWidth(word) + gap;
        }
      }
    }
    cy += lineHeight;
  }
  return cy;
}

// ─── Group inventory helpers ─────────────────────────────────────────────────
interface GroupInventoryRow {
  groupValue: string;
  respondentCount: number;
  greenCount: number;
  amberCount: number;
  redCount: number;
  criticalDims: string[];
  attentionDims: string[];
}

function buildInventory(respondents: Respondent[], key: "empresa" | "setor" | "funcao"): GroupInventoryRow[] {
  const groups = new Map<string, Respondent[]>();
  for (const r of respondents) {
    const val = r[key] || "Não informado";
    if (!groups.has(val)) groups.set(val, []);
    groups.get(val)!.push(r);
  }
  return Array.from(groups.entries())
    .map(([groupValue, members]) => {
      const scores = calcAllScores(members);
      const critical = scores.filter((s) => s.riskLevel === "red");
      const attention = scores.filter((s) => s.riskLevel === "amber");
      return {
        groupValue,
        respondentCount: members.length,
        greenCount: scores.filter((s) => s.riskLevel === "green").length,
        amberCount: attention.length,
        redCount: critical.length,
        criticalDims: critical.map((s) => s.dimension.name),
        attentionDims: attention.map((s) => s.dimension.name),
      };
    })
    .sort((a, b) => b.redCount - a.redCount || b.amberCount - a.amberCount);
}

// ─── Actions map ─────────────────────────────────────────────────────────────
const ACTIONS_MAP: Record<string, { short: string; actions: string[] }> = {
  "Exigências Quantitativas": { short: "Redistribuição e dimensionamento da carga de trabalho", actions: ["Analisar distribuição de tarefas e identificar sobrecargas individuais ou setoriais.", "Revisar o dimensionamento do quadro de pessoal em relação ao volume de trabalho.", "Implementar ferramentas de gestão de demandas e priorização de tarefas.", "Estabelecer limites claros para horas extras e garantir períodos de recuperação."] },
  "Ritmo de Trabalho": { short: "Controle do ritmo e pausas regulares", actions: ["Revisar metas de produtividade e verificar compatibilidade com o tempo disponível.", "Introduzir pausas regulares obrigatórias durante a jornada (NR-17, item 17.6.3).", "Avaliar se sistemas de monitoramento eletrônico geram pressão excessiva."] },
  "Exigências Cognitivas": { short: "Adequação das demandas cognitivas e suporte técnico", actions: ["Avaliar a complexidade das tarefas em relação à qualificação dos trabalhadores.", "Oferecer treinamentos para reduzir a carga cognitiva por falta de domínio técnico.", "Garantir acesso a informações, manuais e suporte técnico durante as tarefas."] },
  "Exigências Emocionais": { short: "Suporte emocional e gestão do trabalho com público", actions: ["Implementar programa de suporte psicológico (PAE).", "Capacitar trabalhadores em técnicas de regulação emocional.", "Garantir pausas após atendimentos de alta carga emocional."] },
  "Influência no Trabalho": { short: "Ampliação da autonomia e participação nas decisões", actions: ["Implementar práticas de gestão participativa nas decisões que afetam o trabalho.", "Criar canais formais de sugestões e feedback ascendente.", "Delegar responsabilidades de acordo com a capacidade de cada trabalhador."] },
  "Possibilidades de Desenvolvimento": { short: "Plano de desenvolvimento e aprendizagem contínua", actions: ["Elaborar Plano Individual de Desenvolvimento (PID) para cada trabalhador.", "Oferecer oportunidades de treinamento, cursos e qualificação profissional.", "Criar programas de mentoria e job rotation."] },
  "Previsibilidade": { short: "Comunicação organizacional e transparência nas mudanças", actions: ["Estabelecer rotina de comunicação interna sobre decisões e mudanças futuras.", "Criar boletins informativos ou reuniões periódicas de alinhamento organizacional."] },
  "Transparência do Papel Laboral": { short: "Clareza de funções e responsabilidades", actions: ["Revisar e atualizar as descrições de cargos e funções.", "Realizar reuniões de alinhamento sobre expectativas de desempenho.", "Elaborar ou revisar os Procedimentos Operacionais Padrão (POPs)."] },
  "Recompensas": { short: "Reconhecimento e valorização profissional", actions: ["Implementar programas formais de reconhecimento.", "Revisar a política salarial para garantir equidade interna.", "Capacitar lideranças para práticas de feedback positivo."] },
  "Apoio Social de Superiores": { short: "Desenvolvimento de lideranças e suporte às equipes", actions: ["Capacitar lideranças em gestão de pessoas e escuta ativa.", "Estabelecer reuniões regulares de acompanhamento individual (one-on-one)."] },
  "Apoio Social de Colegas": { short: "Fortalecimento do trabalho em equipe", actions: ["Promover atividades de integração e fortalecimento do trabalho em equipe.", "Mediar conflitos interpessoais com apoio de RH ou mediador externo."] },
  "Qualidade da Liderança": { short: "Capacitação e desenvolvimento de lideranças", actions: ["Implementar programa de desenvolvimento de lideranças.", "Realizar avaliação 360° das lideranças, incluindo feedback das equipes."] },
  "Confiança Vertical": { short: "Construção de confiança entre gestão e trabalhadores", actions: ["Promover transparência nas decisões organizacionais.", "Garantir que compromissos assumidos pela gestão sejam cumpridos."] },
  "Justiça e Respeito": { short: "Equidade, ética e resolução justa de conflitos", actions: ["Revisar a política de distribuição de tarefas e oportunidades.", "Capacitar lideranças em gestão ética e resolução justa de conflitos."] },
  "Auto-eficácia": { short: "Fortalecimento da confiança e competência profissional", actions: ["Oferecer treinamentos alinhados às demandas do trabalho.", "Criar ambiente psicologicamente seguro para aprender com os erros."] },
  "Significado do Trabalho": { short: "Conexão entre o trabalho e seu propósito", actions: ["Comunicar a missão e valores da organização e sua conexão com cada função.", "Envolver os trabalhadores em projetos de melhoria com impacto visível."] },
  "Compromisso face ao Local de Trabalho": { short: "Engajamento e vínculo organizacional", actions: ["Investigar fatores de desengajamento e implementar ações de retenção.", "Criar oportunidades de crescimento interno e plano de carreira."] },
  "Satisfação no Trabalho": { short: "Melhoria das condições gerais de trabalho", actions: ["Realizar diagnóstico qualitativo para identificar as principais fontes de insatisfação.", "Implementar plano de ação com metas mensuráveis para melhoria dos fatores identificados."] },
  "Insegurança Laboral": { short: "Comunicação transparente sobre estabilidade", actions: ["Comunicar de forma clara a situação da empresa e as perspectivas de emprego.", "Evitar rumores sobre reestruturações ou demissões."] },
  "Saúde Geral": { short: "Promoção da saúde e vigilância epidemiológica", actions: ["Implementar programa de promoção da saúde.", "Garantir a realização dos exames periódicos conforme o PCMSO."] },
  "Conflito Trabalho-Família": { short: "Equilíbrio entre vida profissional e pessoal", actions: ["Revisar a política de horas extras e garantir que não sejam sistemáticas.", "Criar política de desconexão digital fora do horário de trabalho."] },
  "Problemas em Dormir": { short: "Gestão do estresse e higiene do sono", actions: ["Investigar fatores organizacionais que contribuem para problemas de sono.", "Encaminhar trabalhadores com queixas persistentes para avaliação médica."] },
  "Burnout": { short: "Prevenção e tratamento do esgotamento profissional", actions: ["Implementar programa de prevenção ao burnout.", "Garantir acesso a suporte psicológico e psiquiátrico.", "Capacitar lideranças para identificar sinais precoces de esgotamento."] },
  "Stress": { short: "Gestão do estresse ocupacional", actions: ["Realizar análise das principais fontes de estresse no trabalho.", "Implementar programa de gestão do estresse com técnicas de relaxamento."] },
  "Sintomas Depressivos": { short: "Suporte à saúde mental e encaminhamento especializado", actions: ["Garantir acesso a serviços de saúde mental via plano de saúde ou PAE.", "Implementar protocolo de acolhimento e encaminhamento para trabalhadores em crise."] },
  "Comportamentos Ofensivos": { short: "Prevenção ao assédio e violência no trabalho", actions: ["Implementar ou revisar a Política de Prevenção ao Assédio Moral e Sexual.", "Criar canal de denúncia confidencial e garantir investigação imparcial.", "Realizar treinamentos obrigatórios sobre assédio e violência no trabalho."] },
};

// ─── Main export function ─────────────────────────────────────────────────────
export interface PdfReportOptions {
  scores: DimensionScore[];
  totalRespondents: number;
  greenCount: number;
  amberCount: number;
  redCount: number;
  filters: { empresa: string; setor: string; funcao: string };
  empresas: string[];
  respondents: Respondent[];
  coverInfo?: {
    empresaNome: string;
    cnpj: string;
    dataRelatorio: string;
    responsavel: string;
  };
}



export async function generateCopsoqPdf(opts: PdfReportOptions): Promise<void> {
  const { scores, totalRespondents, greenCount, amberCount, redCount, filters, empresas, respondents, coverInfo } = opts;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();   // 210
  const H = doc.internal.pageSize.getHeight();  // 297

  const logoBase64 = LOGO_BASE64;

  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const empresaLabel = filters.empresa || (empresas.length === 1 ? empresas[0] : "Todas as empresas");

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 0 — CAPA PROFISSIONAL
  // ═══════════════════════════════════════════════════════════════════════════
  const EVOLUIR_GREEN: RGB = [30, 64, 175];
  const EVOLUIR_DARK: RGB = [15, 40, 120];

  // Fundo branco com barra verde no topo e rodapé
  drawRect(doc, 0, 0, W, H, C.white);
  // Barra superior verde
  drawRect(doc, 0, 0, W, 60, EVOLUIR_GREEN);
  // Barra inferior verde
  drawRect(doc, 0, H - 30, W, 30, EVOLUIR_GREEN);
  // Linha decorativa
  drawRect(doc, 0, 60, W, 3, EVOLUIR_DARK);

  // Logo EvoluirSST no topo
  if (logoBase64) {
    // Calcular posição centralizada para o logo
    const logoW = 80;
    const logoH = 28;
    const logoX = (W - logoW) / 2;
    doc.addImage(logoBase64, "PNG", logoX, 14, logoW, logoH);
  } else {
    setFont(doc, "bold", 20);
    setColor(doc, C.white);
    doc.text("EvoluirSST", W / 2, 35, { align: "center" });
  }

  // Título principal
  setFont(doc, "bold", 22);
  setColor(doc, EVOLUIR_DARK);
  const titleLines = doc.splitTextToSize("Relatório de Avaliação Psicossocial COPSOQ II", W - 40);
  let coverY = 90;
  titleLines.forEach((line: string) => {
    doc.text(line, W / 2, coverY, { align: "center" });
    coverY += 10;
  });

  // Subtítulo
  coverY += 4;
  setFont(doc, "normal", 12);
  setColor(doc, C.mid);
  doc.text("NR-17 · Metodologia COPSOQ II · Versão Portuguesa", W / 2, coverY, { align: "center" });

  // Linha divisória
  coverY += 12;
  drawLine(doc, 30, coverY, W - 30, coverY, [147, 197, 253] as RGB, 0.8);

  // Caixa com informações da empresa
  coverY += 16;
  const boxX = 30;
  const boxW = W - 60;
  const boxH = 70;
  drawRect(doc, boxX, coverY, boxW, boxH, [239, 246, 255] as RGB, EVOLUIR_GREEN);

  // Cabeçalho da caixa
  drawRect(doc, boxX, coverY, boxW, 10, EVOLUIR_GREEN);
  setFont(doc, "bold", 9);
  setColor(doc, C.white);
  doc.text("INFORMAÇÕES DO RELATÓRIO", W / 2, coverY + 7, { align: "center" });

  const infoY = coverY + 18;
  const labelX = boxX + 8;
  const valueX = boxX + 50;

  const infoRows = [
    { label: "Empresa Avaliada:", value: coverInfo?.empresaNome || empresaLabel },
    { label: "CNPJ:", value: coverInfo?.cnpj || "—" },
    { label: "Data do Relatório:", value: coverInfo?.dataRelatorio || dateStr },
    { label: "Responsável:", value: coverInfo?.responsavel || "—" },
  ];

  infoRows.forEach((row, i) => {
    const rowY = infoY + i * 13;
    setFont(doc, "bold", 9);
    setColor(doc, EVOLUIR_DARK);
    doc.text(row.label, labelX, rowY);
    setFont(doc, "normal", 9);
    setColor(doc, C.dark);
    doc.text(row.value, valueX, rowY);
    if (i < infoRows.length - 1) {
      drawLine(doc, labelX, rowY + 3, boxX + boxW - 8, rowY + 3, C.border, 0.2);
    }
  });

  // Rodapé da capa
  setFont(doc, "normal", 8);
  setColor(doc, C.white);
  doc.text("Segurança e Saúde no Trabalho", W / 2, H - 18, { align: "center" });
  setFont(doc, "normal", 7);
  doc.text("www.evoluirsst.com.br", W / 2, H - 11, { align: "center" });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — INTRODUÇÃO / METODOLOGIA (primeira página do relatório)
  // ═══════════════════════════════════════════════════════════════════════════
  addPage(doc);

  // Page header
  drawRect(doc, 0, 0, W, 16, C.primary);
  setFont(doc, "bold", 11);
  setColor(doc, C.white);
  doc.text("Introdução à Avaliação de Riscos Psicossociais", 14, 11);
  setFont(doc, "normal", 8);
  setColor(doc, [219, 234, 254] as RGB);
  doc.text("Metodologia COPSOQ II · NR-17", W - 14, 11, { align: "right" });

  let y = 24;

  // ── Section 1: Contextualização ──────────────────────────────────────────
  setFont(doc, "bold", 10);
  setColor(doc, C.dark);
  doc.text("1. Contextualização e Base Legal", 14, y);
  drawLine(doc, 14, y + 2, W - 14, y + 2, C.border, 0.3);
  y += 7;

  setFont(doc, "normal", 8);
  setColor(doc, C.dark);
  y = drawJustified(doc,
    "A avaliação dos riscos psicossociais no trabalho constitui obrigação legal estabelecida pela Norma Regulamentadora n.º 17 (NR-17), que trata de Ergonomia, e pela Portaria MTE n.º 1.419/2024, que incorpora explicitamente os fatores psicossociais relacionados ao trabalho como objeto de análise ergonômica. A NR-01 (atualizada pela mesma portaria) exige que o Programa de Gerenciamento de Riscos (PGR) contemple os riscos psicossociais identificados no ambiente laboral, com registro, avaliação e definição de medidas de controle.",
    14, y, W - 28, 4.5
  ) + 4;

  // ── Section 2: O Instrumento ─────────────────────────────────────────────
  setFont(doc, "bold", 10);
  setColor(doc, C.dark);
  doc.text("2. O Instrumento COPSOQ II", 14, y);
  drawLine(doc, 14, y + 2, W - 14, y + 2, C.border, 0.3);
  y += 7;

  setFont(doc, "normal", 8);
  setColor(doc, C.dark);
  y = drawJustified(doc,
    "O COPSOQ II (Copenhagen Psychosocial Questionnaire II) foi desenvolvido originalmente pelo Instituto Nacional de Saúde Ocupacional da Dinamarca (NIOH) e validado para a população portuguesa pelo Prof. Dr. Carlos Fernandes da Silva, da Universidade de Aveiro. O instrumento avalia de forma abrangente as condições psicossociais do trabalho, cobrindo desde as exigências laborais até indicadores de saúde e bem-estar. A versão aplicada nesta avaliação é a versão curta adaptada, composta por 41 itens distribuídos em 26 dimensões psicossociais, agrupadas em 8 categorias temáticas.",
    14, y, W - 28, 4.5
  ) + 4;

  // ── Section 3: Escala de Resposta ────────────────────────────────────────
  setFont(doc, "bold", 10);
  setColor(doc, C.dark);
  doc.text("3. Escala de Resposta", 14, y);
  drawLine(doc, 14, y + 2, W - 14, y + 2, C.border, 0.3);
  y += 7;

  setFont(doc, "normal", 8);
  setColor(doc, C.dark);
  y = drawJustified(doc,
    "Cada item do questionário é respondido em uma escala Likert de 5 pontos, com ancoragem variável conforme o conteúdo da pergunta: 1 = Nunca/Quase nunca (Nada/Quase nada); 2 = Raramente (Um pouco); 3 = Às vezes (Moderadamente); 4 = Frequentemente (Muito); 5 = Sempre (Extremamente).",
    14, y, W - 28, 4.5
  ) + 4;

  // ── Section 4: Tabulação ─────────────────────────────────────────────────
  setFont(doc, "bold", 10);
  setColor(doc, C.dark);
  doc.text("4. Método de Tabulação e Cálculo dos Escores", 14, y);
  drawLine(doc, 14, y + 2, W - 14, y + 2, C.border, 0.3);
  y += 7;

  setFont(doc, "normal", 8);
  setColor(doc, C.dark);
  y = drawJustified(doc,
    "A pontuação de cada dimensão é obtida pelo cálculo da média aritmética dos itens que a compõem. Para os itens com sentido invertido — aqueles em que a pontuação alta representa uma condição favorável (como Apoio Social, Satisfação no Trabalho e Possibilidades de Desenvolvimento) — a escala é revertida antes do cálculo, de modo que o resultado final sempre reflita o mesmo sentido: quanto maior o escore, maior a exposição ao risco. Os escores finais são comparados com os valores de referência da população portuguesa (N = 4.162 trabalhadores).",
    14, y, W - 28, 4.5
  ) + 4;

  // ── Section 5: Semáforo ──────────────────────────────────────────────────
  setFont(doc, "bold", 10);
  setColor(doc, C.dark);
  doc.text("5. Sistema de Classificação — Semáforo de Risco", 14, y);
  drawLine(doc, 14, y + 2, W - 14, y + 2, C.border, 0.3);
  y += 7;

  setFont(doc, "normal", 8);
  setColor(doc, C.dark);
  y = drawJustified(doc,
    "A classificação dos resultados segue o sistema de tercis (divisão da distribuição de referência em três partes iguais), com pontos de corte estabelecidos em 2,33 e 3,66:",
    14, y, W - 28, 4.5
  ) + 3;

  // Traffic light table
  const tlRows = [
    { label: "Situação Favorável (Verde)", range: "ate 2,33", interp: "Sem risco psicossocial significativo", action: "Manutenção e monitoramento periódico", color: C.green, bg: C.greenBg },
    { label: "Situação Intermédia (Âmbar)", range: "2,34 a 3,65", interp: "Atencao -- risco em desenvolvimento", action: "Medidas preventivas e reavaliação", color: C.amber, bg: C.amberBg },
    { label: "Risco para a Saúde (Vermelho)", range: "acima 3,66", interp: "Risco psicossocial para a saúde", action: "Medida de controle obrigatória no PGR", color: C.red, bg: C.redBg },
  ];

  const tlColX = [14, 62, 90, 140];
  const tlColW = [48, 28, 50, 58];
  const tlHeaders = ["Classificação", "Intervalo", "Interpretação", "Ação no PGR"];
  drawRect(doc, 14, y, W - 28, 6.5, C.primary);
  tlHeaders.forEach((h, i) => {
    setFont(doc, "bold", 7.5);
    setColor(doc, C.white);
    doc.text(h, tlColX[i] + (i === 0 ? 2 : tlColW[i] / 2), y + 4.5, { align: i === 0 ? "left" : "center" });
  });
  y += 6.5;

  tlRows.forEach((row) => {
    drawRect(doc, 14, y, W - 28, 8, row.bg, C.border);
    setFont(doc, "bold", 7.5);
    setColor(doc, row.color);
    doc.text(row.label, tlColX[0] + 2, y + 5);
    setFont(doc, "normal", 7.5);
    setColor(doc, C.dark);
    doc.text(row.range, tlColX[1] + tlColW[1] / 2, y + 5, { align: "center" });
    const interpLines = doc.splitTextToSize(row.interp, tlColW[2] - 2);
    doc.text(interpLines, tlColX[2] + 1, y + 3.5);
    const actionLines = doc.splitTextToSize(row.action, tlColW[3] - 2);
    doc.text(actionLines, tlColX[3] + 1, y + 3.5);
    y += 8;
  });

  y += 6;

  // Important note box
  drawRect(doc, 14, y, W - 28, 18, [239, 246, 255] as RGB, [191, 219, 254] as RGB);
  setFont(doc, "bold", 8);
  setColor(doc, C.primary);
  doc.text("Importante:", 18, y + 5);
  setFont(doc, "normal", 7.5);
  setColor(doc, C.dark);
  drawJustified(doc,
    "A unidade de análise e de decisão para o PGR é a dimensão individualmente, não a categoria temática. Mesmo que apenas uma dimensão de uma categoria esteja em Risco (Vermelho), ela já requer registro de medida de controle no PGR com responsável e prazo definidos.",
    18, y + 10, W - 36, 4
  );


  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — CAPA / KPIs / RESUMO POR CATEGORIA
  // ═══════════════════════════════════════════════════════════════════════════
  addPage(doc);

  // Header band
  drawRect(doc, 0, 0, W, 55, C.primary);

  setFont(doc, "bold", 18);
  setColor(doc, C.white);
  doc.text("Painel de Avaliacao Psicossocial", 14, 22);
  setFont(doc, "normal", 10);
  doc.text("NR-17 - Metodologia COPSOQ II - Versao Portuguesa", 14, 30);

  // Divider line inside header
  drawLine(doc, 14, 38, W - 14, 38, [147, 197, 253] as RGB, 0.4);
  setFont(doc, "normal", 9);
  setColor(doc, [219, 234, 254] as RGB);
  doc.text(`Gerado em ${dateStr}`, 14, 45);
  doc.text(`Empresa: ${empresaLabel}`, W - 14, 45, { align: "right" });

  // ── KPI cards ──────────────────────────────────────────────────────────────
  const cardY = 65;
  const cardH = 28;
  const cardW = (W - 28 - 9) / 4;
  const cards = [
    { label: "Respondentes", value: String(totalRespondents), sub: "Questionários válidos", color: C.primary, bg: [239, 246, 255] as RGB },
    { label: "Situação Favorável", value: String(greenCount), sub: "Dimensões sem risco", color: C.green, bg: C.greenBg },
    { label: "Situação Intermédia", value: String(amberCount), sub: "Dimensões de atenção", color: C.amber, bg: C.amberBg },
    { label: "Risco para a Saúde", value: String(redCount), sub: "Dimensões críticas", color: C.red, bg: C.redBg },
  ];
  cards.forEach((card, i) => {
    const x = 14 + i * (cardW + 3);
    drawRect(doc, x, cardY, cardW, cardH, card.bg, C.border);
    setFont(doc, "bold", 16);
    setColor(doc, card.color);
    doc.text(card.value, x + cardW / 2, cardY + 11, { align: "center" });
    setFont(doc, "bold", 7.5);
    setColor(doc, C.dark);
    doc.text(card.label, x + cardW / 2, cardY + 18, { align: "center" });
    setFont(doc, "normal", 6.5);
    setColor(doc, C.mid);
    doc.text(card.sub, x + cardW / 2, cardY + 23, { align: "center" });
  });

  // ── Section title ──────────────────────────────────────────────────────────
  y = cardY + cardH + 12;
  setFont(doc, "bold", 12);
  setColor(doc, C.dark);
  doc.text("Resumo por Categoria", 14, y);
  drawLine(doc, 14, y + 2, W - 14, y + 2, C.border, 0.3);
  y += 8;

  // ── Category summary table ─────────────────────────────────────────────────
  const catColW = [80, 28, 28, 28, 28] as const;
  const catHeaders = ["Categoria", "Favorável", "Atenção", "Risco", "Total"];
  const colX = [14, 94, 122, 150, 178];

  drawRect(doc, 14, y, W - 28, 7, C.bg, C.border);
  catHeaders.forEach((h, i) => {
    setFont(doc, "bold", 8);
    setColor(doc, C.mid);
    doc.text(h, colX[i] + (i === 0 ? 2 : catColW[i] / 2), y + 5, { align: i === 0 ? "left" : "center" });
  });
  y += 7;

  CATEGORIES.forEach((cat, ci) => {
    const catScores = scores.filter((s) => s.dimension.category === cat);
    if (catScores.length === 0) return;
    const g = catScores.filter((s) => s.riskLevel === "green").length;
    const a = catScores.filter((s) => s.riskLevel === "amber").length;
    const r = catScores.filter((s) => s.riskLevel === "red").length;
    const rowBg: RGB = ci % 2 === 0 ? C.white : C.bg;
    drawRect(doc, 14, y, W - 28, 7, rowBg, C.border);
    setFont(doc, "normal", 8);
    setColor(doc, C.dark);
    doc.text(cat, colX[0] + 2, y + 5);
    const vals = [g, a, r, catScores.length];
    const colors: RGB[] = [C.green, C.amber, C.red, C.mid];
    vals.forEach((v, i) => {
      setFont(doc, "bold", 8);
      setColor(doc, colors[i]);
      doc.text(String(v), colX[i + 1] + catColW[i + 1] / 2, y + 5, { align: "center" });
    });
    y += 7;
  });

  // ── Filters info ───────────────────────────────────────────────────────────
  y += 6;
  drawRect(doc, 14, y, W - 28, 14, [239, 246, 255] as RGB, [191, 219, 254] as RGB);
  setFont(doc, "bold", 8);
  setColor(doc, C.primary);
  doc.text("Filtros aplicados:", 18, y + 5);
  setFont(doc, "normal", 8);
  setColor(doc, C.dark);
  const filterParts = [
    `Empresa: ${filters.empresa || "Todas"}`,
    `Setor: ${filters.setor || "Todos"}`,
    `Função: ${filters.funcao || "Todas"}`,
  ];
  doc.text(filterParts.join("   ·   "), 18, y + 11);


  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3 — ALL DIMENSIONS BAR CHART
  // ═══════════════════════════════════════════════════════════════════════════
  addPage(doc);

  drawRect(doc, 0, 0, W, 16, C.primary);
  setFont(doc, "bold", 11);
  setColor(doc, C.white);
  doc.text("Resultados por Dimensão Psicossocial", 14, 11);
  setFont(doc, "normal", 8);
  setColor(doc, [219, 234, 254] as RGB);
  doc.text("Escala 1–5 · Limiares: ≤2,33 Favorável | 2,34–3,65 Atenção | ≥3,66 Risco", W - 14, 11, { align: "right" });

  y = 24;

  // Legend
  const legendItems = [
    { label: "Situação Favorável", color: C.green },
    { label: "Situação Intermédia", color: C.amber },
    { label: "Risco para a Saúde", color: C.red },
    { label: "Ref. Nacional", color: C.light },
  ];
  let lx = 14;
  legendItems.forEach((item) => {
    drawRect(doc, lx, y - 3, 8, 3.5, item.color);
    setFont(doc, "normal", 7);
    setColor(doc, C.mid);
    doc.text(item.label, lx + 10, y);
    lx += 10 + doc.getTextWidth(item.label) + 6;
  });
  y += 6;

  // Bar chart
  const barAreaX = 60;
  const barAreaW = W - barAreaX - 14;
  const barH = 5;
  const barGap = 1.8;
  const maxVal = 5;

  // Scale lines
  [1, 2, 3, 4, 5].forEach((v) => {
    const bx = barAreaX + (v / maxVal) * barAreaW;
    drawLine(doc, bx, y - 2, bx, y + scores.length * (barH + barGap) + 2, C.border, 0.2);
    setFont(doc, "normal", 6);
    setColor(doc, C.light);
    doc.text(String(v), bx, y - 3.5, { align: "center" });
  });

  // Threshold lines
  const threshLow = barAreaX + (2.33 / maxVal) * barAreaW;
  const threshHigh = barAreaX + (3.66 / maxVal) * barAreaW;
  const chartBottom = y + scores.length * (barH + barGap);
  drawLine(doc, threshLow, y - 2, threshLow, chartBottom + 2, C.amber, 0.4);
  drawLine(doc, threshHigh, y - 2, threshHigh, chartBottom + 2, C.red, 0.4);

  scores.forEach((s, i) => {
    const by = y + i * (barH + barGap);
    const barW = (s.score / maxVal) * barAreaW;
    const refW = (s.dimension.refMean / maxVal) * barAreaW;
    const color = riskColor(s.riskLevel);

    // Row bg
    if (i % 2 === 0) drawRect(doc, 14, by - 0.5, W - 28, barH + 1, C.bg);

    // Dimension name
    setFont(doc, "normal", 6.5);
    setColor(doc, C.dark);
    const name = s.dimension.name.length > 26 ? s.dimension.name.slice(0, 25) + "…" : s.dimension.name;
    doc.text(name, barAreaX - 2, by + barH - 1, { align: "right" });

    // Bar background
    drawRect(doc, barAreaX, by, barAreaW, barH, [241, 245, 249] as RGB);

    // Colored bar
    drawRect(doc, barAreaX, by, barW, barH, color);

    // Reference dot
    doc.setFillColor(C.light[0], C.light[1], C.light[2]);
    doc.circle(barAreaX + refW, by + barH / 2, 1, "F");

    // Score label
    setFont(doc, "bold", 6);
    setColor(doc, color);
    doc.text(s.score.toFixed(2), barAreaX + barW + 1.5, by + barH - 1);
  });

  y = chartBottom + 10;

  // Note
  drawRect(doc, 14, y, W - 28, 10, [239, 246, 255] as RGB, [191, 219, 254] as RGB);
  setFont(doc, "normal", 7);
  setColor(doc, C.mid);
  doc.text(
    "Os pontos cinzas representam a média de referência nacional portuguesa (N=4.162). As linhas tracejadas indicam os limiares de classificação.",
    18, y + 4
  );
  doc.text(
    "Para dimensões de risco direto (exigências, burnout, stress), pontuação alta = risco. Para dimensões protetoras (autonomia, apoio), pontuação baixa = risco.",
    18, y + 8
  );


  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4 — RISK INVENTORY BY GROUP
  // ═══════════════════════════════════════════════════════════════════════════
  addPage(doc);

  drawRect(doc, 0, 0, W, 16, C.primary);
  setFont(doc, "bold", 11);
  setColor(doc, C.white);
  doc.text("Inventário de Riscos por Grupo", 14, 11);
  setFont(doc, "normal", 8);
  setColor(doc, [219, 234, 254] as RGB);
  doc.text("Segmentação por Empresa · Setor · Função", W - 14, 11, { align: "right" });

  y = 22;

  const inventoryGroups: { label: string; key: "empresa" | "setor" | "funcao" }[] = [
    { label: "Por Empresa", key: "empresa" },
    { label: "Por Setor",   key: "setor" },
    { label: "Por Função",  key: "funcao" },
  ];

  for (const grp of inventoryGroups) {
    const rows = buildInventory(respondents, grp.key);
    if (rows.length === 0) continue;

    if (y > H - 60) { addPage(doc); y = 20; }
    drawRect(doc, 14, y, W - 28, 7, [239, 246, 255] as RGB, [191, 219, 254] as RGB);
    setFont(doc, "bold", 9);
    setColor(doc, C.primary);
    doc.text(grp.label, 17, y + 5);
    y += 10;

    const iCols = [52, 18, 20, 20, 20, 56] as const;
    const iColX = [14, 66, 84, 104, 124, 144];
    const iHeaders = ["Grupo", "N", "Favorável", "Atenção", "Risco", "Dimensões Críticas"];
    drawRect(doc, 14, y, W - 28, 6, [30, 64, 175] as RGB);
    iHeaders.forEach((h, i) => {
      setFont(doc, "bold", 7);
      setColor(doc, C.white);
      doc.text(h, iColX[i] + (i === 0 ? 2 : iCols[i] / 2), y + 4.2, { align: i === 0 ? "left" : "center" });
    });
    y += 6;

    rows.forEach((row, ri) => {
      if (y > H - 30) { addPage(doc); y = 20; }
      const rowH = row.criticalDims.length > 0 ? Math.max(7, 5 + row.criticalDims.length * 4) : 7;
      const rowBg: RGB = ri % 2 === 0 ? C.white : C.bg;
      drawRect(doc, 14, y, W - 28, rowH, rowBg, C.border);

      setFont(doc, "normal", 7.5);
      setColor(doc, C.dark);
      const gName = row.groupValue.length > 24 ? row.groupValue.slice(0, 23) + "…" : row.groupValue;
      doc.text(gName, iColX[0] + 2, y + 4.5);

      setFont(doc, "bold", 7.5);
      setColor(doc, C.mid);
      doc.text(String(row.respondentCount), iColX[1] + iCols[1] / 2, y + 4.5, { align: "center" });

      setFont(doc, "bold", 7.5);
      setColor(doc, C.green);
      doc.text(String(row.greenCount), iColX[2] + iCols[2] / 2, y + 4.5, { align: "center" });

      setColor(doc, C.amber);
      doc.text(String(row.amberCount), iColX[3] + iCols[3] / 2, y + 4.5, { align: "center" });

      setColor(doc, C.red);
      doc.text(String(row.redCount), iColX[4] + iCols[4] / 2, y + 4.5, { align: "center" });

      if (row.criticalDims.length > 0) {
        row.criticalDims.forEach((dim, di) => {
          setFont(doc, "normal", 6);
          setColor(doc, C.red);
          const dimShort = dim.length > 26 ? dim.slice(0, 25) + "…" : dim;
          doc.text(`• ${dimShort}`, iColX[5] + 1, y + 4 + di * 4);
        });
      } else if (row.amberCount > 0) {
        setFont(doc, "normal", 6);
        setColor(doc, C.amber);
        const firstAmber = row.attentionDims[0];
        const dimShort = firstAmber.length > 26 ? firstAmber.slice(0, 25) + "…" : firstAmber;
        doc.text(`△ ${dimShort}${row.attentionDims.length > 1 ? ` +${row.attentionDims.length - 1}` : ""}`, iColX[5] + 1, y + 4.5);
      } else {
        setFont(doc, "normal", 6);
        setColor(doc, C.green);
        doc.text("Todas favoráveis", iColX[5] + 1, y + 4.5);
      }

      y += rowH;
    });

    y += 6;
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 5 — ACTION PLAN (espaçamento corrigido)
  // ═══════════════════════════════════════════════════════════════════════════
  addPage(doc);

  drawRect(doc, 0, 0, W, 16, C.primary);
  setFont(doc, "bold", 11);
  setColor(doc, C.white);
  doc.text("Plano de Ação — Medidas de Controle", 14, 11);
  setFont(doc, "normal", 8);
  setColor(doc, [219, 234, 254] as RGB);
  doc.text("Ações recomendadas por dimensão em risco ou atenção · NR-17 / PGR", W - 14, 11, { align: "right" });

  y = 24;

  const actionDims = scores.filter((s) => s.riskLevel === "red" || s.riskLevel === "amber");

  if (actionDims.length === 0) {
    drawRect(doc, 14, y, W - 28, 14, C.greenBg, C.green);
    setFont(doc, "bold", 9);
    setColor(doc, C.green);
    doc.text("Nenhuma dimensão em situação de risco ou atenção.", 18, y + 6);
    setFont(doc, "normal", 8);
    setColor(doc, C.dark);
    doc.text("Todas as dimensões avaliadas estão em situação favorável. Mantenha o monitoramento periódico.", 18, y + 11);
    y += 20;
  } else {
    // Info banner
    drawRect(doc, 14, y, W - 28, 14, [239, 246, 255] as RGB, [191, 219, 254] as RGB);
    setFont(doc, "normal", 7);
    setColor(doc, C.mid);
    drawJustified(doc,
      "As ações abaixo são recomendações baseadas nas boas práticas de gestão de riscos psicossociais do COPSOQ II e da NR-17. Dimensões em Risco (Vermelho) requerem registro de medida de controle no PGR com responsável e prazo. Dimensões em Atenção (Âmbar) devem ser monitoradas com medidas preventivas.",
      18, y + 4, W - 36, 3.5
    );
    y += 18;

    // Red first, then amber
    const redDims = actionDims.filter((s) => s.riskLevel === "red");
    const amberDimsAction = actionDims.filter((s) => s.riskLevel === "amber");

    for (const group of [
      { label: "RISCO PARA A SAÚDE — Intervenção Prioritária", dims: redDims, color: C.red, bg: C.redBg },
      { label: "SITUAÇÃO INTERMÉDIA — Medidas Preventivas", dims: amberDimsAction, color: C.amber, bg: C.amberBg },
    ]) {
      if (group.dims.length === 0) continue;

      if (y > H - 40) { addPage(doc); y = 20; }

      setFont(doc, "bold", 8.5);
      setColor(doc, group.color);
      doc.text(`> ${group.label} (${group.dims.length})`, 14, y);
      drawLine(doc, 14, y + 2, W - 14, y + 2, group.color, 0.4);
      y += 8;

      for (const s of group.dims) {
        const info = ACTIONS_MAP[s.dimension.name];
        if (!info) continue;

        // Estimate height: header(8) + description(6) + actions(each ~6) + gap(6)
        const estimatedH = 14 + info.actions.length * 6 + 6;
        if (y + estimatedH > H - 20) { addPage(doc); y = 20; }

        // Dimension header
        drawRect(doc, 14, y, W - 28, 7, group.bg, group.color);
        setFont(doc, "bold", 8);
        setColor(doc, group.color);
        doc.text(s.dimension.name, 18, y + 5);
        setFont(doc, "normal", 7);
        setColor(doc, C.mid);
        doc.text(s.dimension.category, W - 18, y + 5, { align: "right" });
        y += 9;

        // Short description
        setFont(doc, "italic", 7.5);
        setColor(doc, C.mid);
        doc.text(`Estrategia: ${info.short}`, 18, y);
        y += 6;

        // Actions list — with proper spacing
        info.actions.forEach((action) => {
          if (y > H - 20) { addPage(doc); y = 20; }
          const actionLines = doc.splitTextToSize(`• ${action}`, W - 38);
          setFont(doc, "normal", 7);
          setColor(doc, C.dark);
          doc.text(actionLines, 22, y);
          y += actionLines.length * 4.5 + 2;
        });

        y += 5;
      }

      y += 5;
    }

    // Footer note
    if (y > H - 30) { addPage(doc); y = 20; }
    drawRect(doc, 14, y, W - 28, 16, C.bg, C.border);
    setFont(doc, "normal", 6.5);
    setColor(doc, C.mid);
    drawJustified(doc,
      "Nota: As ações acima são recomendações gerais baseadas na literatura de saúde ocupacional e nas diretrizes do COPSOQ II. A definição das medidas de controle definitivas deve considerar o contexto específico da organização, ser validada pelo SESMT ou profissional de SST responsável, e registrada formalmente no PGR com responsável, prazo e indicador de verificação.",
      18, y + 4, W - 36, 3.5
    );
    y += 20;
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 6 — DETAILED TABLE + METHODOLOGY
  // ═══════════════════════════════════════════════════════════════════════════
  addPage(doc);

  drawRect(doc, 0, 0, W, 16, C.primary);
  setFont(doc, "bold", 11);
  setColor(doc, C.white);
  doc.text("Tabela Detalhada de Dimensões", 14, 11);

  y = 24;

  // Table header
  const tCols = [60, 52, 22, 22, 28] as const;
  const tHeaders = ["Dimensão", "Categoria", "Pontuação", "Ref. Nac.", "Classificação"];
  const tColX = [14, 74, 126, 148, 170];

  drawRect(doc, 14, y, W - 28, 7, C.primary);
  tHeaders.forEach((h, i) => {
    setFont(doc, "bold", 7.5);
    setColor(doc, C.white);
    doc.text(h, tColX[i] + (i === 0 ? 2 : tCols[i] / 2), y + 5, { align: i === 0 ? "left" : "center" });
  });
  y += 7;

  scores.forEach((s, i) => {
    const rowBg: RGB = i % 2 === 0 ? C.white : C.bg;
    drawRect(doc, 14, y, W - 28, 6.5, rowBg, C.border);

    setFont(doc, "normal", 7.5);
    setColor(doc, C.dark);
    const dimName = s.dimension.name.length > 28 ? s.dimension.name.slice(0, 27) + "…" : s.dimension.name;
    doc.text(dimName, tColX[0] + 2, y + 4.5);

    setFont(doc, "normal", 6.5);
    setColor(doc, C.mid);
    const catName = s.dimension.category.length > 22 ? s.dimension.category.slice(0, 21) + "…" : s.dimension.category;
    doc.text(catName, tColX[1] + 2, y + 4.5);

    setFont(doc, "bold", 8);
    setColor(doc, riskColor(s.riskLevel));
    doc.text(s.score.toFixed(2), tColX[2] + tCols[2] / 2, y + 4.5, { align: "center" });

    setFont(doc, "normal", 7.5);
    setColor(doc, C.mid);
    doc.text(s.dimension.refMean.toFixed(2), tColX[3] + tCols[3] / 2, y + 4.5, { align: "center" });

    // Classification badge
    const badgeColor = riskColor(s.riskLevel);
    const badgeBg = riskBg(s.riskLevel);
    const badgeLabel = riskLabel(s.riskLevel);
    const badgeW = 22;
    const badgeX = tColX[4] + (tCols[4] - badgeW) / 2;
    drawRect(doc, badgeX, y + 1, badgeW, 4.5, badgeBg, badgeColor);
    setFont(doc, "bold", 6.5);
    setColor(doc, badgeColor);
    doc.text(badgeLabel, badgeX + badgeW / 2, y + 4.5, { align: "center" });

    y += 6.5;
  });

  // ── Methodology note ───────────────────────────────────────────────────────
  y += 8;
  if (y > H - 60) { addPage(doc); y = 20; }

  setFont(doc, "bold", 10);
  setColor(doc, C.dark);
  doc.text("Nota Metodológica", 14, y);
  drawLine(doc, 14, y + 2, W - 14, y + 2, C.border, 0.3);
  y += 8;

  setFont(doc, "normal", 7.5);
  setColor(doc, C.dark);
  y = drawJustified(doc,
    "O COPSOQ II (Copenhagen Psychosocial Questionnaire II) é um instrumento validado internacionalmente para avaliação de riscos psicossociais no trabalho. A versão portuguesa foi adaptada e validada por Carlos Fernandes da Silva (Universidade de Aveiro).",
    14, y, W - 28, 4.5
  ) + 3;

  y = drawJustified(doc,
    "Escala de resposta: Likert de 5 pontos (1 = Nunca/Quase nunca a 5 = Sempre, ou equivalente por dimensão).",
    14, y, W - 28, 4.5
  ) + 3;

  y = drawJustified(doc,
    "Classificacao semaforo (limiares baseados na distribuicao da populacao de referencia portuguesa, N=4.162): Situacao Favoravel (Verde): pontuacao ate 2,33 para dimensoes de risco direto; acima de 3,66 para dimensoes protetoras. Situacao Intermedia (Ambar): pontuacao entre 2,34 e 3,65. Risco para a Saude (Vermelho): pontuacao acima de 3,66 para dimensoes de risco direto; ate 2,33 para dimensoes protetoras.",
    14, y, W - 28, 4.5
  ) + 3;

  y = drawJustified(doc,
    "Este relatório foi gerado automaticamente pelo Painel COPSOQ II — Avaliação Psicossocial (NR-17). Os dados são processados localmente no navegador e não são transmitidos a servidores externos.",
    14, y, W - 28, 4.5
  );

  // Add footers to all pages dynamically
  addFootersToAllPages(doc);

  // ── Save ───────────────────────────────────────────────────────────────────
  const filename = `COPSOQ_II_Relatorio_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
