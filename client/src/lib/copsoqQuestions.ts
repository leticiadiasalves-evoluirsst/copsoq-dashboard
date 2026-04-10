/*
 * COPSOQ II — Questionnaire Questions & Response Scales
 * Organized by dimension categories for the integrated form
 */

export type ResponseScale = "frequency" | "intensity" | "health";

export interface QuestionDef {
  id: string; // Q1..Q41
  text: string;
  scale: ResponseScale;
}

export interface QuestionSection {
  title: string;
  description: string;
  questions: QuestionDef[];
}

/** Response options for each scale type */
export const SCALE_OPTIONS: Record<ResponseScale, { label: string; value: number }[]> = {
  frequency: [
    { label: "Nunca/Quase nunca", value: 1 },
    { label: "Raramente", value: 2 },
    { label: "Às vezes", value: 3 },
    { label: "Frequentemente", value: 4 },
    { label: "Sempre", value: 5 },
  ],
  intensity: [
    { label: "Nada/Quase nada", value: 1 },
    { label: "Um pouco", value: 2 },
    { label: "Moderadamente", value: 3 },
    { label: "Muito", value: 4 },
    { label: "Extremamente", value: 5 },
  ],
  health: [
    { label: "Excelente", value: 5 },
    { label: "Muito boa", value: 4 },
    { label: "Boa", value: 3 },
    { label: "Razoável", value: 2 },
    { label: "Má", value: 1 },
  ],
};

/** All 41 COPSOQ II questions organized by section */
export const QUESTIONNAIRE_SECTIONS: QuestionSection[] = [
  {
    title: "Exigências Laborais",
    description: "Questões sobre as exigências do seu trabalho",
    questions: [
      { id: "Q1", text: "A sua carga de trabalho acumula-se por ser mal distribuída?", scale: "frequency" },
      { id: "Q2", text: "Com que frequência não tem tempo para completar todas as tarefas do seu trabalho?", scale: "frequency" },
      { id: "Q3", text: "Precisa trabalhar muito rapidamente?", scale: "frequency" },
      { id: "Q4", text: "O seu trabalho exige a sua atenção constante?", scale: "frequency" },
      { id: "Q5", text: "O seu trabalho exige que tome decisões difíceis?", scale: "frequency" },
      { id: "Q6", text: "O seu trabalho exige emocionalmente de você?", scale: "frequency" },
    ],
  },
  {
    title: "Organização do Trabalho e Conteúdo",
    description: "Questões sobre a organização e o conteúdo do seu trabalho",
    questions: [
      { id: "Q7", text: "Tem um elevado grau de influência no seu trabalho?", scale: "frequency" },
      { id: "Q8", text: "O seu trabalho exige que tenha iniciativa?", scale: "frequency" },
      { id: "Q9", text: "O seu trabalho permite aprender coisas novas?", scale: "frequency" },
      { id: "Q10", text: "No seu local de trabalho, é informado com antecedência sobre as decisões importantes, mudanças ou planos para o futuro?", scale: "frequency" },
      { id: "Q11", text: "Recebe toda a informação de que necessita para fazer bem o seu trabalho?", scale: "frequency" },
      { id: "Q12", text: "Sabe exatamente quais as suas responsabilidades?", scale: "frequency" },
      { id: "Q13", text: "O seu trabalho é reconhecido e apreciado pela gerência?", scale: "frequency" },
      { id: "Q14", text: "É tratado de forma justa no seu local de trabalho?", scale: "frequency" },
    ],
  },
  {
    title: "Relações Sociais e Liderança",
    description: "Questões sobre as relações no ambiente de trabalho",
    questions: [
      { id: "Q15", text: "Com que frequência tem ajuda e apoio do seu superior imediato?", scale: "frequency" },
      { id: "Q16", text: "Existe um bom ambiente de trabalho entre si e os seus colegas?", scale: "frequency" },
      { id: "Q17", text: "Oferece aos indivíduos e ao grupo boas oportunidades de desenvolvimento?", scale: "frequency" },
      { id: "Q18", text: "É bom no planejamento do trabalho?", scale: "frequency" },
      { id: "Q19", text: "A gerência confia nos seus funcionários para fazerem o seu trabalho bem?", scale: "frequency" },
      { id: "Q20", text: "Confia na informação que lhe é transmitida pela gerência?", scale: "frequency" },
      { id: "Q21", text: "Os conflitos são resolvidos de uma forma justa?", scale: "frequency" },
      { id: "Q22", text: "O trabalho é igualmente distribuído pelos funcionários?", scale: "frequency" },
    ],
  },
  {
    title: "Personalidade",
    description: "Questão sobre autoeficácia",
    questions: [
      { id: "Q23", text: "Sou sempre capaz de resolver problemas, se tentar o suficiente?", scale: "frequency" },
    ],
  },
  {
    title: "Valores no Local de Trabalho",
    description: "Questões sobre significado e compromisso com o trabalho",
    questions: [
      { id: "Q24", text: "O seu trabalho tem algum significado para si?", scale: "intensity" },
      { id: "Q25", text: "Sente que o seu trabalho é importante?", scale: "intensity" },
      { id: "Q26", text: "Sente que os problemas do seu local de trabalho são seus também?", scale: "intensity" },
    ],
  },
  {
    title: "Interface Trabalho-Indivíduo",
    description: "Questões sobre satisfação e segurança no trabalho",
    questions: [
      { id: "Q27", text: "Quão satisfeito está com o seu trabalho de uma forma global?", scale: "intensity" },
      { id: "Q28", text: "Sente-se preocupado em ficar desempregado?", scale: "intensity" },
    ],
  },
  {
    title: "Saúde e Bem-estar",
    description: "Questões sobre a sua saúde e bem-estar geral",
    questions: [
      { id: "Q29", text: "Em geral, sente que a sua saúde é:", scale: "health" },
      { id: "Q30", text: "Sente que o seu trabalho lhe exige muita energia que acaba por afetar a sua vida privada negativamente?", scale: "intensity" },
      { id: "Q31", text: "Sente que o seu trabalho lhe exige muito tempo que acaba por afetar a sua vida privada negativamente?", scale: "intensity" },
      { id: "Q32", text: "Acordou várias vezes durante a noite e depois não conseguia adormecer novamente?", scale: "intensity" },
      { id: "Q33", text: "Fisicamente exausto?", scale: "intensity" },
      { id: "Q34", text: "Emocionalmente exausto?", scale: "intensity" },
      { id: "Q35", text: "Irritado?", scale: "intensity" },
      { id: "Q36", text: "Ansioso?", scale: "intensity" },
      { id: "Q37", text: "Triste?", scale: "intensity" },
    ],
  },
  {
    title: "Comportamentos Ofensivos",
    description: "Questões sobre comportamentos ofensivos no trabalho",
    questions: [
      { id: "Q38", text: "Tem sido alvo de insultos ou provocações verbais?", scale: "frequency" },
      { id: "Q39", text: "Tem sido exposto a assédio sexual indesejado?", scale: "frequency" },
      { id: "Q40", text: "Tem sido exposto a ameaças de violência?", scale: "frequency" },
      { id: "Q41", text: "Tem sido exposto a violência física?", scale: "frequency" },
    ],
  },
];

/** Total number of questions */
export const TOTAL_QUESTIONS = QUESTIONNAIRE_SECTIONS.reduce(
  (sum, section) => sum + section.questions.length,
  0
);
