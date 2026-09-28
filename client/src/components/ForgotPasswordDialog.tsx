/*
 * ForgotPasswordDialog — Solicita o envio do e-mail de redefinição de senha
 */

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, MailCheck } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIdentifier?: string;
}

export default function ForgotPasswordDialog({ open, onOpenChange, initialIdentifier = "" }: Props) {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sentMessage, setSentMessage] = useState("");

  // Ao abrir, pré-preenche com o usuário digitado na tela de login
  useEffect(() => {
    if (open) {
      setIdentifier(initialIdentifier);
      setError("");
      setSentMessage("");
    }
  }, [open, initialIdentifier]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!identifier.trim()) return;
      setError("");
      setLoading(true);
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: identifier.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data as any).error || "Não foi possível enviar o e-mail.");
        }
        setSentMessage(
          (data as any).message ||
            "Se existir uma conta com este usuário ou e-mail cadastrado, enviaremos um link de redefinição de senha."
        );
      } catch (err: any) {
        setError(err.message || "Não foi possível enviar o e-mail.");
      } finally {
        setLoading(false);
      }
    },
    [identifier]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Esqueci minha senha</DialogTitle>
          <DialogDescription>
            Informe seu usuário ou e-mail cadastrado. Enviaremos um link para você criar uma nova senha.
          </DialogDescription>
        </DialogHeader>

        {sentMessage ? (
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
              <MailCheck size={18} className="text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground">{sentMessage}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              O link é válido por 1 hora. Verifique também a pasta de spam. Se sua conta não tiver e-mail cadastrado,
              peça ao administrador do painel para redefinir sua senha.
            </p>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="forgot-identifier">Usuário ou e-mail</Label>
              <Input
                id="forgot-identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                required
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !identifier.trim()}>
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-2" />
                    Enviando…
                  </>
                ) : (
                  "Enviar link"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
