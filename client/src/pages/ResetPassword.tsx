/*
 * ResetPassword — Página aberta pelo link enviado por e-mail (/reset-password?token=...)
 */

import { useState, useCallback, useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = useMemo(() => new URLSearchParams(search).get("token") || "", [search]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      if (password.length < 4) {
        setError("A senha deve ter pelo menos 4 caracteres.");
        return;
      }
      if (password !== confirm) {
        setError("As senhas não coincidem.");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as any).error || "Erro ao redefinir senha.");
        }
        setDone(true);
      } catch (err: any) {
        setError(err.message || "Erro ao redefinir senha.");
      } finally {
        setLoading(false);
      }
    },
    [token, password, confirm]
  );

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-sm mx-4 shadow-lg border border-border bg-white">
        <CardHeader className="text-center pb-2">
          <CardTitle
            className="text-xl font-bold"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
          >
            Redefinir senha
          </CardTitle>
          <CardDescription className="text-xs mt-1">
            Painel de Avaliação Psicossocial
          </CardDescription>
          <div className="flex justify-center mt-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {done ? (
                <CheckCircle2 size={18} className="text-primary" />
              ) : (
                <KeyRound size={18} className="text-primary" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-destructive">
                Link de redefinição inválido. Solicite um novo link na tela de login.
              </p>
              <Button className="w-full" onClick={() => setLocation("/login")}>
                Ir para o login
              </Button>
            </div>
          ) : done ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-foreground">
                Senha redefinida com sucesso. Agora você já pode entrar com a nova senha.
              </p>
              <Button className="w-full" onClick={() => setLocation("/login")}>
                Ir para o login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="mínimo 4 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  minLength={4}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={loading}
                  minLength={4}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-2" />
                    Salvando…
                  </>
                ) : (
                  "Salvar nova senha"
                )}
              </Button>
              <p className="text-center text-sm">
                <Link href="/login" className="text-primary hover:underline underline-offset-4">
                  Voltar para o login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
