/*
 * COPSOQ II — Data Model & Scoring Logic
 * Based on: Copenhagen Psychosocial Questionnaire II, Portuguese Version
 * Reference: Carlos Fernandes da Silva, Universidade de Aveiro
 *
 * Scoring: Likert 1–5, average per dimension
 * Traffic light thresholds: ≤2.33 = Green, 2.34–3.65 = Amber, ≥3.66 = Red
 * NOTE: Interpretation direction varies by dimension (see isRiskDirect flag)
 */

export type RiskLevel = "green" | "amber" | "red";

export interface Dimension {
  id: string;
  name: string;
  category: string;
  questions: number[]; // 1-based question indices
  refMean: number; // national reference mean (Portuguese population)
  refSD: number;
  isRiskDirect: boolean; // true = high score = risk; false = high score = favorable
}

export interface Respondent {
  id: string | number;
  empresa: string;
  setor: string;
  funcao: string;
  nome: string;
  respostas: Record<string, number | null>; // Q1..Q41
}

export interface DimensionScore {
  dimension: Dimension;
  score: number;
  riskLevel: RiskLevel;
  respondentCount: number;
}

// ─── Question labels ────────────────────────────────────────────────────────
export const QUESTION_LABELS: Record<string, string> = {
  Q1: "A sua carga de trabalho acumula-se por ser mal distribuída?",
  Q2: "Com que frequência não tem tempo para completar todas as tarefas do seu trabalho?",
  Q3: "Precisa trabalhar muito rapidamente?",
  Q4: "O seu trabalho exige a sua atenção constante?",
  Q5: "O seu trabalho exige que tome decisões difíceis?",
  Q6: "O seu trabalho exige emocionalmente de você?",
  Q7: "Você tem liberdade para decidir como realizar as suas tarefas?",
  Q8: "O seu trabalho exige que tenha iniciativa?",
  Q9: "O seu trabalho permite aprender coisas novas?",
  Q10: "No seu local de trabalho, é informado com antecedência sobre as decisões importantes, mudanças ou planos para o futuro?",
  Q11: "Recebe toda a informação de que necessita para fazer bem o seu trabalho?",
  Q12: "Sabe exatamente quais as suas responsabilidades?",
  Q13: "O seu trabalho é reconhecido e apreciado pela gerência?",
  Q14: "É tratado de forma justa no seu local de trabalho?",
  Q15: "Com que frequência tem ajuda e apoio do seu superior imediato?",
  Q16: "Existe um bom ambiente de trabalho entre si e os seus colegas?",
  Q17: "Oferece aos indivíduos e ao grupo boas oportunidades de desenvolvimento?",
  Q18: "É bom no planejamento do trabalho?",
  Q19: "A gerência confia nos seus funcionários para fazerem o seu trabalho bem?",
  Q20: "Confia na informação que lhe é transmitida pela gerência?",
  Q21: "Os conflitos são resolvidos de uma forma justa?",
  Q22: "O trabalho é igualmente distribuído pelos funcionários?",
  Q23: "Sou sempre capaz de resolver problemas, se tentar o suficiente?",
  Q24: "O seu trabalho tem algum significado para si?",
  Q25: "Sente que o seu trabalho é importante?",
  Q26: "Sente que os problemas do seu local de trabalho são seus também?",
  Q27: "Quão satisfeito está com o seu trabalho de uma forma global?",
  Q28: "Sente-se preocupado em ficar desempregado?",
  Q29: "Em geral, sente que a sua saúde é:",
  Q30: "Sente que o seu trabalho lhe exige muita energia que acaba por afetar a sua vida privada negativamente?",
  Q31: "Sente que o seu trabalho lhe exige muito tempo que acaba por afetar a sua vida privada negativamente?",
  Q32: "Acordou várias vezes durante a noite e depois não conseguia adormecer novamente?",
  Q33: "Fisicamente exausto?",
  Q34: "Emocionalmente exausto?",
  Q35: "Irritado?",
  Q36: "Ansioso?",
  Q37: "Triste?",
  Q38: "Tem sido alvo de insultos ou provocações verbais?",
  Q39: "Tem sido exposto a assédio sexual indesejado?",
  Q40: "Tem sido exposto a ameaças de violência?",
  Q41: "Tem sido exposto a violência física?",
};

// ─── Dimensions definition ───────────────────────────────────────────────────
export const DIMENSIONS: Dimension[] = [
  // EXIGÊNCIAS LABORAIS
  {
    id: "exig_quantitativas",
    name: "Exigências Quantitativas",
    category: "Exigências Laborais",
    questions: [1, 2],
    refMean: 2.48,
    refSD: 0.86,
    isRiskDirect: true,
  },
  {
    id: "ritmo_trabalho",
    name: "Ritmo de Trabalho",
    category: "Exigências Laborais",
    questions: [3],
    refMean: 3.18,
    refSD: 1.0,
    isRiskDirect: true,
  },
  {
    id: "exig_cognitivas",
    name: "Exigências Cognitivas",
    category: "Exigências Laborais",
    questions: [4, 5],
    refMean: 3.79,
    refSD: 0.71,
    isRiskDirect: true,
  },
  {
    id: "exig_emocionais",
    name: "Exigências Emocionais",
    category: "Exigências Laborais",
    questions: [6],
    refMean: 3.42,
    refSD: 1.15,
    isRiskDirect: true,
  },
  // ORGANIZAÇÃO DO TRABALHO E CONTEÚDO
  {
    id: "influencia_trabalho",
    name: "Influência no Trabalho",
    category: "Organização do Trabalho e Conteúdo",
    questions: [7],
    refMean: 2.83,
    refSD: 0.89,
    isRiskDirect: false,
  },
  {
    id: "possib_desenvolvimento",
    name: "Possibilidades de Desenvolvimento",
    category: "Organização do Trabalho e Conteúdo",
    questions: [8, 9],
    refMean: 3.85,
    refSD: 0.81,
    isRiskDirect: false,
  },
  {
    id: "previsibilidade",
    name: "Previsibilidade",
    category: "Organização do Trabalho e Conteúdo",
    questions: [10, 11],
    refMean: 3.23,
    refSD: 0.92,
    isRiskDirect: false,
  },
  {
    id: "transparencia_papel",
    name: "Transparência do Papel Laboral",
    category: "Organização do Trabalho e Conteúdo",
    questions: [12],
    refMean: 4.19,
    refSD: 0.72,
    isRiskDirect: false,
  },
  {
    id: "recompensas",
    name: "Recompensas",
    category: "Organização do Trabalho e Conteúdo",
    questions: [13, 14],
    refMean: 3.71,
    refSD: 0.87,
    isRiskDirect: false,
  },
  // RELAÇÕES SOCIAIS E LIDERANÇA
  {
    id: "apoio_superiores",
    name: "Apoio Social de Superiores",
    category: "Relações Sociais e Liderança",
    questions: [15],
    refMean: 3.13,
    refSD: 0.97,
    isRiskDirect: false,
  },
  {
    id: "apoio_colegas",
    name: "Apoio Social de Colegas",
    category: "Relações Sociais e Liderança",
    questions: [16],
    refMean: 3.44,
    refSD: 0.77,
    isRiskDirect: false,
  },
  {
    id: "qualidade_lideranca",
    name: "Qualidade da Liderança",
    category: "Relações Sociais e Liderança",
    questions: [17, 18],
    refMean: 3.49,
    refSD: 0.93,
    isRiskDirect: false,
  },
  {
    id: "confianca_vertical",
    name: "Confiança Vertical",
    category: "Relações Sociais e Liderança",
    questions: [19, 20],
    refMean: 3.6,
    refSD: 0.6,
    isRiskDirect: false,
  },
  {
    id: "justica_respeito",
    name: "Justiça e Respeito",
    category: "Relações Sociais e Liderança",
    questions: [21, 22],
    refMean: 3.37,
    refSD: 0.81,
    isRiskDirect: false,
  },
  // PERSONALIDADE
  {
    id: "auto_eficacia",
    name: "Auto-eficácia",
    category: "Personalidade",
    questions: [23],
    refMean: 3.9,
    refSD: 0.67,
    isRiskDirect: false,
  },
  // VALORES NO LOCAL DE TRABALHO
  {
    id: "significado_trabalho",
    name: "Significado do Trabalho",
    category: "Valores no Local de Trabalho",
    questions: [24, 25],
    refMean: 4.03,
    refSD: 0.72,
    isRiskDirect: false,
  },
  {
    id: "compromisso_local",
    name: "Compromisso com o Local de Trabalho",
    category: "Valores no Local de Trabalho",
    questions: [26],
    refMean: 3.4,
    refSD: 0.9,
    isRiskDirect: false,
  },
  // INTERFACE TRABALHO-INDIVÍDUO
  {
    id: "satisfacao_trabalho",
    name: "Satisfação no Trabalho",
    category: "Interface Trabalho-Indivíduo",
    questions: [27],
    refMean: 3.37,
    refSD: 0.75,
    isRiskDirect: false,
  },
  {
    id: "inseguranca_laboral",
    name: "Insegurança Laboral",
    category: "Interface Trabalho-Indivíduo",
    questions: [28],
    refMean: 3.13,
    refSD: 1.47,
    isRiskDirect: true,
  },
  // SAÚDE E BEM-ESTAR
  {
    id: "saude_geral",
    name: "Saúde Geral",
    category: "Saúde e Bem-estar",
    questions: [29],
    refMean: 3.44,
    refSD: 0.91,
    isRiskDirect: false,
  },
  {
    id: "conflito_trabalho_familia",
    name: "Conflito Trabalho-Família",
    category: "Saúde e Bem-estar",
    questions: [30, 31],
    refMean: 2.67,
    refSD: 1.05,
    isRiskDirect: true,
  },
  {
    id: "problemas_dormir",
    name: "Problemas em Dormir",
    category: "Saúde e Bem-estar",
    questions: [32],
    refMean: 2.46,
    refSD: 1.05,
    isRiskDirect: true,
  },
  {
    id: "burnout",
    name: "Burnout",
    category: "Saúde e Bem-estar",
    questions: [33, 34],
    refMean: 2.7,
    refSD: 0.97,
    isRiskDirect: true,
  },
  {
    id: "stress",
    name: "Stress",
    category: "Saúde e Bem-estar",
    questions: [35, 36],
    refMean: 2.7,
    refSD: 0.9,
    isRiskDirect: true,
  },
  {
    id: "sintomas_depressivos",
    name: "Sintomas Depressivos",
    category: "Saúde e Bem-estar",
    questions: [37],
    refMean: 2.35,
    refSD: 0.91,
    isRiskDirect: true,
  },
  // COMPORTAMENTOS OFENSIVOS
  {
    id: "comportamentos_ofensivos",
    name: "Comportamentos Ofensivos",
    category: "Comportamentos Ofensivos",
    questions: [38, 39, 40, 41],
    refMean: 1.23,
    refSD: 0.48,
    isRiskDirect: true,
  },
];

export const CATEGORIES = [
  "Exigências Laborais",
  "Organização do Trabalho e Conteúdo",
  "Relações Sociais e Liderança",
  "Personalidade",
  "Valores no Local de Trabalho",
  "Interface Trabalho-Indivíduo",
  "Saúde e Bem-estar",
  "Comportamentos Ofensivos",
];

// ─── Scoring functions ────────────────────────────────────────────────────────

/** Traffic light thresholds */
const THRESHOLD_LOW = 2.33;
const THRESHOLD_HIGH = 3.66;

/**
 * Classify a score into a risk level.
 * For direct-risk dimensions: high score = red.
 * For inverse dimensions: high score = green.
 */
export function classifyRisk(score: number, isRiskDirect: boolean): RiskLevel {
  if (isRiskDirect) {
    if (score <= THRESHOLD_LOW) return "green";
    if (score >= THRESHOLD_HIGH) return "red";
    return "amber";
  } else {
    if (score >= THRESHOLD_HIGH) return "green";
    if (score <= THRESHOLD_LOW) return "red";
    return "amber";
  }
}

/** Convert text response to numeric value */
export function textToValue(text: string | null | undefined): number | null {
  if (!text) return null;
  const t = text.trim().toLowerCase();
  const freqMap: Record<string, number> = {
    "nunca/quase nunca": 1,
    "raramente": 2,
    "às vezes": 3,
    "frequentemente": 4,
    "sempre": 5,
  };
  const intensMap: Record<string, number> = {
    "nada/quase nada": 1,
    "um pouco": 2,
    "moderamente": 3,
    "moderadamente": 3,
    "muito": 4,
    "extremamente": 5,
  };
  const healthMap: Record<string, number> = {
    "má": 1,
    "razoável": 2,
    "boa": 3,
    "muito boa": 4,
    "excelente": 5,
  };
  return freqMap[t] ?? intensMap[t] ?? healthMap[t] ?? null;
}

/** Calculate average score for a dimension from a list of respondents */
export function calcDimensionScore(
  dimension: Dimension,
  respondents: Respondent[]
): DimensionScore {
  const values: number[] = [];
  for (const r of respondents) {
    const qValues: number[] = [];
    for (const qNum of dimension.questions) {
      const key = `Q${qNum}`;
      const val = r.respostas[key];
      if (val !== null && val !== undefined) {
        qValues.push(val);
      }
    }
    if (qValues.length > 0) {
      values.push(qValues.reduce((a, b) => a + b, 0) / qValues.length);
    }
  }
  const score =
    values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  return {
    dimension,
    score: Math.round(score * 100) / 100,
    riskLevel: values.length > 0 ? classifyRisk(score, dimension.isRiskDirect) : "green",
    respondentCount: values.length,
  };
}

/** Calculate all dimension scores for a set of respondents */
export function calcAllScores(respondents: Respondent[]): DimensionScore[] {
  return DIMENSIONS.map((d) => calcDimensionScore(d, respondents));
}

/** Parse raw Excel JSON data (from file upload) into Respondent[] */
export function parseExcelData(rows: Record<string, unknown>[]): Respondent[] {
  return rows
    .filter((row) => row["Id"] !== null && row["Id"] !== undefined)
    .map((row, idx) => {
      const respostas: Record<string, number | null> = {};
      // Questions are in columns: Q1=col21, Q2=col24, ... (every 3rd col from col 21)
      // In the Excel export, the question text is the column header
      // We'll map by question index
      const qKeys = Object.keys(row).filter(
        (k) =>
          !["Id", "Hora de início", "Hora de conclusão", "Email", "Nome",
            "Total de pontos", "Comentários do teste", "Hora de postagem da nota",
            "Empresa", "Pontos – Empresa", "Comentários – Empresa",
            "Setor", "Pontos – Setor", "Comentários – Setor",
            "Função", "Pontos – Função", "Comentários – Função",
            "Nome1", "Pontos – Nome1", "Comentários – Nome1"].includes(k) &&
          !k.startsWith("Pontos –") &&
          !k.startsWith("Comentários –")
      );
      qKeys.forEach((key, i) => {
        respostas[`Q${i + 1}`] = textToValue(row[key] as string);
      });
      return {
        id: (row["Id"] as string | number) ?? idx,
        empresa: (row["Empresa"] as string)?.trim() ?? "",
        setor: (row["Setor"] as string)?.trim() ?? "",
        funcao: (row["Função"] as string)?.trim() ?? (row["Função"] as string)?.trim() ?? "",
        nome: (row["Nome1"] as string)?.trim() ?? "",
        respostas,
      };
    });
}

/** Risk level labels in Portuguese */
export const RISK_LABELS: Record<RiskLevel, string> = {
  green: "Situação Favorável",
  amber: "Situação Intermédia",
  red: "Risco para a Saúde",
};

/** Risk level colors */
export const RISK_COLORS: Record<RiskLevel, string> = {
  green: "#15803d",
  amber: "#b45309",
  red: "#b91c1c",
};

export const RISK_BG_COLORS: Record<RiskLevel, string> = {
  green: "#f0fdf4",
  amber: "#fffbeb",
  red: "#fef2f2",
};
