/*
 * UsersView — Gerenciamento de usuários (somente admin)
 */

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserCog, Trash2, Loader2, ShieldCheck, User, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface UserItem {
  id: number;
  username: string;
  is_admin: boolean;
  created_at: string;
}

export default function UsersView() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Alterar senha
  const [changePwdUser, setChangePwdUser] = useState<UserItem | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      toast.error("Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) return;
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error || "Erro ao criar usuário.");
      }
      toast.success(`Usuário "${newUsername.trim()}" criado com sucesso.`);
      setNewUsername("");
      setNewPassword("");
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuário.");
    } finally {
      setCreating(false);
    }
  }, [newUsername, newPassword, token, fetchUsers]);

  const handleDelete = useCallback(async () => {
    if (pendingDeleteId == null) return;
    setDeletingId(pendingDeleteId);
    setPendingDeleteId(null);
    try {
      const res = await fetch(`/api/users/${pendingDeleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error || "Erro ao excluir usuário.");
      }
      toast.success("Usuário excluído com sucesso.");
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir usuário.");
    } finally {
      setDeletingId(null);
    }
  }, [pendingDeleteId, token, fetchUsers]);

  const handleChangePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePwdUser || !newPwd) return;
    setChangingPwd(true);
    try {
      const res = await fetch(`/api/users/${changePwdUser.id}/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPwd }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error || "Erro ao alterar senha.");
      }
      toast.success(`Senha de "${changePwdUser.username}" alterada com sucesso.`);
      setChangePwdUser(null);
      setNewPwd("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar senha.");
    } finally {
      setChangingPwd(false);
    }
  }, [changePwdUser, newPwd, token]);

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
        >
          Usuários
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie os usuários com acesso ao painel administrativo
        </p>
      </div>

      {/* Criar novo usuário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo Usuário</CardTitle>
          <CardDescription>
            Usuários criados aqui podem acessar o painel mas não podem excluir respondentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="new-username">Usuário</Label>
              <Input
                id="new-username"
                type="text"
                placeholder="nome de usuário"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                disabled={creating}
                required
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="new-password">Senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={creating}
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={creating} className="w-full sm:w-auto">
                {creating ? (
                  <><Loader2 size={14} className="animate-spin mr-2" />Criando…</>
                ) : (
                  "Criar usuário"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lista de usuários */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuários Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhum usuário cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {u.is_admin ? (
                        <ShieldCheck size={15} className="text-primary" />
                      ) : (
                        <User size={15} className="text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.is_admin ? "Administrador" : "Usuário"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setChangePwdUser(u); setNewPwd(""); }}
                      className="gap-1.5 text-muted-foreground hover:text-foreground"
                      title="Alterar senha"
                    >
                      <KeyRound size={14} />
                    </Button>
                    {!u.is_admin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === u.id}
                        onClick={() => setPendingDeleteId(u.id)}
                        className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Excluir usuário"
                      >
                        {deletingId === u.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Alterar Senha */}
      <Dialog
        open={changePwdUser !== null}
        onOpenChange={(open) => { if (!open) { setChangePwdUser(null); setNewPwd(""); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha — {changePwdUser?.username}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="new-pwd">Nova Senha</Label>
              <Input
                id="new-pwd"
                type="password"
                placeholder="mínimo 4 caracteres"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                disabled={changingPwd}
                minLength={4}
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setChangePwdUser(null); setNewPwd(""); }}
                disabled={changingPwd}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={changingPwd || newPwd.length < 4}>
                {changingPwd ? (
                  <><Loader2 size={14} className="animate-spin mr-2" />Salvando…</>
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Exclusão */}
      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o acesso deste usuário ao painel permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
