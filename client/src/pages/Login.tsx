import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Lock } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);
      try {
        await login(username, password, remember);
        setLocation("/");
      } catch (err: any) {
        setError(err.message || "Erro ao fazer login.");
      } finally {
        setLoading(false);
      }
    },
    [login, username, password, remember, setLocation]
  );

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-sm mx-4 shadow-lg border border-border bg-white">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663031272139/nMBkaAmAqguAoZSh.webp"
              alt="Evoluir SST"
              className="h-12 w-auto object-contain"
            />
          </div>
          <CardTitle
            className="text-xl font-bold"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
          >
            Painel de Avaliação Psicossocial
          </CardTitle>
          <CardDescription className="text-xs mt-1">
            NR-17 · Metodologia COPSOQ II — Versão Portuguesa
          </CardDescription>
          <p className="text-sm text-muted-foreground mt-2">Faça login para acessar o painel</p>
          <div className="flex justify-center mt-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock size={18} className="text-primary" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(v) => setRemember(v === true)}
                disabled={loading}
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                Lembrar senha
              </Label>
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Entrando…
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
