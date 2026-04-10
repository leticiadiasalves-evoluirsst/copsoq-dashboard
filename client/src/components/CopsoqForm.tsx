/*
 * CopsoqForm — Integrated COPSOQ II Questionnaire Form
 * Multi-step form with all 41 questions organized by sections
 * Supports both embedded (dashboard) and standalone (public) modes
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  QUESTIONNAIRE_SECTIONS,
  SCALE_OPTIONS,
  TOTAL_QUESTIONS,
  type ResponseScale,
} from "@/lib/copsoqQuestions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle2,
  ClipboardList,
  Building2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface CopsoqFormProps {
  /** Whether this is the standalone public page (no sidebar) */
  standalone?: boolean;
  /** Callback after successful submission (for dashboard integration) */
  onSubmitted?: () => void;
}

type FormStep = "intro" | "questions" | "review" | "success";

export default function CopsoqForm({ standalone = false, onSubmitted }: CopsoqFormProps) {
  // ─── State ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<FormStep>("intro");
  const [currentSection, setCurrentSection] = useState(0);
  const [empresa, setEmpresa] = useState("");
  const [setor, setSetor] = useState("");
  const [funcao, setFuncao] = useState("");
  const [nome, setNome] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [introError, setIntroError] = useState("");
  const [sectionErrors, setSectionErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const section = QUESTIONNAIRE_SECTIONS[currentSection];
  const totalSections = QUESTIONNAIRE_SECTIONS.length;

  // ─── Progress calculation ───────────────────────────────────────────────
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const progressPercent = useMemo(
    () => Math.round((answeredCount / TOTAL_QUESTIONS) * 100),
    [answeredCount]
  );

  // ─── Scroll to top on step/section change ───────────────────────────────
  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [step, currentSection]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const setAnswer = useCallback((questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setSectionErrors([]);
  }, []);

  const handleStartQuestions = useCallback(() => {
    if (!empresa.trim()) {
      setIntroError("Por favor, informe o nome da empresa.");
      return;
    }
    if (!setor.trim()) {
      setIntroError("Por favor, informe o setor.");
      return;
    }
    if (!funcao.trim()) {
      setIntroError("Por favor, informe o cargo/função.");
      return;
    }
    setIntroError("");
    setStep("questions");
    setCurrentSection(0);
  }, [empresa, setor, funcao]);

  const validateCurrentSection = useCallback((): boolean => {
    const unanswered = section.questions.filter((q) => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      setSectionErrors(unanswered.map((q) => q.id));
      toast.error(`Por favor, responda todas as perguntas desta seção. Faltam ${unanswered.length} resposta(s).`);
      return false;
    }
    setSectionErrors([]);
    return true;
  }, [section, answers]);

  const handleNextSection = useCallback(() => {
    if (!validateCurrentSection()) return;
    if (currentSection < totalSections - 1) {
      setCurrentSection((prev) => prev + 1);
    } else {
      setStep("review");
    }
  }, [currentSection, totalSections, validateCurrentSection]);

  const handlePrevSection = useCallback(() => {
    if (currentSection > 0) {
      setCurrentSection((prev) => prev - 1);
      setSectionErrors([]);
    } else {
      setStep("intro");
    }
  }, [currentSection]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const payload = {
        empresa: empresa.trim(),
        setor: setor.trim(),
        funcao: funcao.trim(),
        nome: nome.trim(),
        respostas: answers,
      };

      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || "Erro ao salvar resposta.");
      }

      toast.success("Questionário enviado com sucesso!");
      setStep("success");
      onSubmitted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar questionário.");
    } finally {
      setSubmitting(false);
    }
  }, [empresa, setor, funcao, nome, answers, onSubmitted]);

  const handleReset = useCallback(() => {
    setStep("intro");
    setCurrentSection(0);
    setEmpresa("");
    setSetor("");
    setFuncao("");
    setNome("");
    setAnswers({});
    setIntroError("");
    setSectionErrors([]);
  }, []);

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/questionario`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  // ─── Render helpers ─────────────────────────────────────────────────────
  const renderScaleOptions = (scale: ResponseScale, questionId: string) => {
    const options = SCALE_OPTIONS[scale];
    const hasError = sectionErrors.includes(questionId);
    return (
      <RadioGroup
        value={answers[questionId]?.toString() ?? ""}
        onValueChange={(val) => setAnswer(questionId, parseInt(val, 10))}
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3"
      >
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all duration-150 cursor-pointer text-sm",
              "hover:bg-primary/5 hover:border-primary/30",
              answers[questionId] === opt.value
                ? "bg-primary/10 border-primary/40 text-foreground font-medium ring-1 ring-primary/20"
                : "bg-white border-border text-muted-foreground",
              hasError && answers[questionId] === undefined
                ? "border-red-300 bg-red-50/30"
                : ""
            )}
          >
            <RadioGroupItem value={opt.value.toString()} />
            <span>{opt.label}</span>
          </label>
        ))}
      </RadioGroup>
    );
  };

  // ─── Wrapper ────────────────────────────────────────────────────────────
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (standalone) {
      return (
        <div className="min-h-screen bg-background">
          {/* Header */}
          <header className="bg-white border-b border-border sticky top-0 z-50">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
              <img
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663031272139/nMBkaAmAqguAoZSh.webp"
                alt="Evoluir SST"
                className="h-9 w-auto object-contain"
              />
              <div>
                <h1
                  className="text-base sm:text-lg font-bold text-foreground"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Avaliação Psicossocial
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Questionário COPSOQ II — Versão Portuguesa
                </p>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-border bg-white mt-8">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 text-center">
              <p className="text-xs text-muted-foreground">
                Metodologia COPSOQ II — Copenhagen Psychosocial Questionnaire
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Suas respostas são confidenciais e serão utilizadas exclusivamente para fins de avaliação psicossocial.
              </p>
            </div>
          </footer>
        </div>
      );
    }
    return <div className="space-y-6">{children}</div>;
  };

  // ─── STEP: Intro ────────────────────────────────────────────────────────
  if (step === "intro") {
    return (
      <Wrapper>
        <div ref={topRef} />
        {!standalone && (
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="text-2xl font-bold text-foreground"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
              >
                Questionário COPSOQ II
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Formulário integrado para avaliação psicossocial dos funcionários
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copiado!" : "Copiar link"}
            </Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardList size={20} className="text-primary" />
              </div>
              <div>
                <CardTitle
                  className="text-lg"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Bem-vindo(a) ao Questionário
                </CardTitle>
                <CardDescription>
                  Este questionário faz parte da avaliação dos riscos psicossociais no trabalho
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Sobre o questionário:</strong> O COPSOQ II (Copenhagen Psychosocial Questionnaire)
                é um instrumento validado internacionalmente para avaliar fatores psicossociais no ambiente de trabalho.
                O questionário contém <strong>{TOTAL_QUESTIONS} perguntas</strong> organizadas em{" "}
                <strong>{totalSections} seções</strong>. O tempo estimado de preenchimento é de 10 a 15 minutos.
              </p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Confidencialidade:</strong> Suas respostas são confidenciais e serão utilizadas
                exclusivamente para fins de avaliação e melhoria das condições de trabalho. O campo "Nome"
                é opcional.
              </p>
            </div>

            {/* Identification fields */}
            <div className="space-y-4">
              <h3
                className="text-base font-semibold text-foreground flex items-center gap-2"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
              >
                <Building2 size={16} className="text-primary" />
                Identificação
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="empresa" className="text-sm font-medium">
                    Empresa <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="empresa"
                    placeholder="Nome da empresa"
                    value={empresa}
                    onChange={(e) => { setEmpresa(e.target.value); setIntroError(""); }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setor" className="text-sm font-medium">
                    Setor <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="setor"
                    placeholder="Setor de atuação"
                    value={setor}
                    onChange={(e) => { setSetor(e.target.value); setIntroError(""); }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="funcao" className="text-sm font-medium">
                    Cargo/Função <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="funcao"
                    placeholder="Seu cargo ou função"
                    value={funcao}
                    onChange={(e) => { setFuncao(e.target.value); setIntroError(""); }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-sm font-medium">
                    Nome <span className="text-muted-foreground text-xs">(opcional)</span>
                  </Label>
                  <Input
                    id="nome"
                    placeholder="Seu nome (opcional)"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>
              </div>

              {introError && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle size={14} />
                  {introError}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleStartQuestions} className="gap-2">
                Iniciar Questionário
                <ChevronRight size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </Wrapper>
    );
  }

  // ─── STEP: Questions ────────────────────────────────────────────────────
  if (step === "questions") {
    return (
      <Wrapper>
        <div ref={topRef} />

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              Seção {currentSection + 1} de {totalSections}
            </span>
            <span className="text-muted-foreground">
              {answeredCount}/{TOTAL_QUESTIONS} perguntas respondidas ({progressPercent}%)
            </span>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
        </div>

        {/* Section card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {currentSection + 1}
              </div>
              <div>
                <CardTitle
                  className="text-lg"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {section.questions.map((q, idx) => (
              <div
                key={q.id}
                className={cn(
                  "p-4 rounded-lg border transition-colors",
                  answers[q.id] !== undefined
                    ? "bg-green-50/50 border-green-200/50"
                    : sectionErrors.includes(q.id)
                    ? "bg-red-50/50 border-red-200"
                    : "bg-white border-border"
                )}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span
                    className={cn(
                      "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                      answers[q.id] !== undefined
                        ? "bg-green-100 text-green-700"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {QUESTIONNAIRE_SECTIONS.slice(0, currentSection)
                      .reduce((sum, s) => sum + s.questions.length, 0) + idx + 1}
                  </span>
                  <p className="text-sm font-medium text-foreground leading-relaxed pt-0.5">
                    {q.text}
                  </p>
                </div>
                {renderScaleOptions(q.scale, q.id)}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={handlePrevSection} className="gap-1.5">
            <ChevronLeft size={16} />
            {currentSection === 0 ? "Voltar" : "Seção anterior"}
          </Button>
          <Button onClick={handleNextSection} className="gap-1.5">
            {currentSection < totalSections - 1 ? "Próxima seção" : "Revisar respostas"}
            <ChevronRight size={16} />
          </Button>
        </div>
      </Wrapper>
    );
  }

  // ─── STEP: Review ───────────────────────────────────────────────────────
  if (step === "review") {
    return (
      <Wrapper>
        <div ref={topRef} />

        <Card>
          <CardHeader>
            <CardTitle
              className="text-lg"
              style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
            >
              Revisão das Respostas
            </CardTitle>
            <CardDescription>
              Verifique suas informações antes de enviar o questionário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Identification summary */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Dados de Identificação</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Empresa:</span> <strong>{empresa}</strong></div>
                <div><span className="text-muted-foreground">Setor:</span> <strong>{setor}</strong></div>
                <div><span className="text-muted-foreground">Cargo/Função:</span> <strong>{funcao}</strong></div>
                <div><span className="text-muted-foreground">Nome:</span> <strong>{nome || "Não informado"}</strong></div>
              </div>
            </div>

            {/* Answers summary by section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Resumo por Seção</h4>
              {QUESTIONNAIRE_SECTIONS.map((sec, sIdx) => {
                const sectionAnswered = sec.questions.filter((q) => answers[q.id] !== undefined).length;
                const allAnswered = sectionAnswered === sec.questions.length;
                return (
                  <div
                    key={sIdx}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border text-sm",
                      allAnswered ? "bg-green-50/50 border-green-200/50" : "bg-red-50/50 border-red-200"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {allAnswered ? (
                        <CheckCircle2 size={16} className="text-green-600" />
                      ) : (
                        <AlertCircle size={16} className="text-red-500" />
                      )}
                      <span className="font-medium">{sec.title}</span>
                    </div>
                    <span className={cn("text-xs", allAnswered ? "text-green-600" : "text-red-500")}>
                      {sectionAnswered}/{sec.questions.length}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Total:</strong> {answeredCount} de {TOTAL_QUESTIONS} perguntas respondidas.
                {answeredCount < TOTAL_QUESTIONS && (
                  <span className="text-red-600 ml-1">
                    Atenção: há {TOTAL_QUESTIONS - answeredCount} pergunta(s) sem resposta.
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => {
              setStep("questions");
              setCurrentSection(totalSections - 1);
            }}
            className="gap-1.5"
          >
            <ChevronLeft size={16} />
            Voltar às perguntas
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || answeredCount < TOTAL_QUESTIONS}
            className="gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send size={16} />
                Enviar questionário
              </>
            )}
          </Button>
        </div>
      </Wrapper>
    );
  }

  // ─── STEP: Success ──────────────────────────────────────────────────────
  return (
    <Wrapper>
      <div ref={topRef} />
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h3
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
          >
            Questionário Enviado com Sucesso!
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Suas respostas foram registradas e serão utilizadas para a avaliação dos riscos
            psicossociais no ambiente de trabalho. Agradecemos a sua participação.
          </p>
          <div className="pt-4">
            <Button variant="outline" onClick={handleReset} className="gap-1.5">
              <ClipboardList size={16} />
              Responder novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    </Wrapper>
  );
}
