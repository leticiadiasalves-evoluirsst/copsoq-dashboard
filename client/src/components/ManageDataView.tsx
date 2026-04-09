/*
 * ManageDataView — Data management screen for COPSOQ II Dashboard
 * Allows users to view and correct typos in empresa, setor, and funcao values
 */

import { useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Edit2, X, Check } from "lucide-react";
import { toast } from "sonner";

interface EditingState {
  field: "empresa" | "setor" | "funcao" | null;
  oldValue: string | null;
  newValue: string;
}

interface ConfirmState {
  field: "empresa" | "setor" | "funcao" | null;
  oldValue: string | null;
  newValue: string;
}

export default function ManageDataView() {
  const { empresas, setores, funcoes, respondents, renameEmpresa, renameSetor, renameFuncao } = useDashboard();
  const [editing, setEditing] = useState<EditingState>({ field: null, oldValue: null, newValue: "" });
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState>({ field: null, oldValue: null, newValue: "" });

  const getCountForValue = (field: "empresa" | "setor" | "funcao", value: string) => {
    return respondents.filter((r) => r[field] === value).length;
  };

  const handleStartEdit = (field: "empresa" | "setor" | "funcao", value: string) => {
    setEditing({ field, oldValue: value, newValue: value });
  };

  const handleCancelEdit = () => {
    setEditing({ field: null, oldValue: null, newValue: "" });
  };

  const handleConfirmRename = () => {
    if (!editing.field || !editing.oldValue || !editing.newValue.trim()) {
      toast.error("Valores inválidos");
      return;
    }

    if (editing.newValue === editing.oldValue) {
      toast.info("Nenhuma alteração foi feita");
      handleCancelEdit();
      return;
    }

    setConfirmDialog({
      field: editing.field,
      oldValue: editing.oldValue,
      newValue: editing.newValue.trim(),
    });
  };

  const handleApplyRename = () => {
    if (!confirmDialog.field || !confirmDialog.oldValue) return;

    const count = getCountForValue(confirmDialog.field, confirmDialog.oldValue);

    if (confirmDialog.field === "empresa") {
      renameEmpresa(confirmDialog.oldValue, confirmDialog.newValue);
    } else if (confirmDialog.field === "setor") {
      renameSetor(confirmDialog.oldValue, confirmDialog.newValue);
    } else if (confirmDialog.field === "funcao") {
      renameFuncao(confirmDialog.oldValue, confirmDialog.newValue);
    }

    toast.success(`"${confirmDialog.oldValue}" renomeado para "${confirmDialog.newValue}" em ${count} respondente(s)`);
    setEditing({ field: null, oldValue: null, newValue: "" });
    setConfirmDialog({ field: null, oldValue: null, newValue: "" });
  };

  const renderValuesList = (field: "empresa" | "setor" | "funcao", values: string[]) => {
    return (
      <div className="space-y-2">
        {values.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhum valor carregado</p>
        ) : (
          values.map((value) => {
            const count = getCountForValue(field, value);
            const isEditing = editing.field === field && editing.oldValue === value;

            return (
              <div
                key={value}
                className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
              >
                <div className="flex-1">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Input
                        value={editing.newValue}
                        onChange={(e) => setEditing({ ...editing, newValue: e.target.value })}
                        placeholder="Novo valor"
                        className="flex-1 h-8"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-foreground">{value}</p>
                      <p className="text-xs text-muted-foreground">{count} respondente(s)</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleConfirmRename}
                        className="h-8 w-8 p-0"
                        title="Confirmar"
                      >
                        <Check size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="h-8 w-8 p-0"
                        title="Cancelar"
                      >
                        <X size={16} />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStartEdit(field, value)}
                      className="h-8 w-8 p-0"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Gerenciar Dados</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Visualize e corrija erros de digitação nos dados carregados. As correções serão aplicadas a todos os respondentes com aquele valor.
        </p>
      </div>

      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="empresa">
            Empresas <span className="ml-2 text-xs bg-muted px-2 py-1 rounded">{empresas.length}</span>
          </TabsTrigger>
          <TabsTrigger value="setor">
            Setores <span className="ml-2 text-xs bg-muted px-2 py-1 rounded">{setores.length}</span>
          </TabsTrigger>
          <TabsTrigger value="funcao">
            Cargos/Funções <span className="ml-2 text-xs bg-muted px-2 py-1 rounded">{funcoes.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Empresas</CardTitle>
              <CardDescription>
                Clique no ícone de edição para corrigir erros de digitação. As correções serão aplicadas a todos os respondentes.
              </CardDescription>
            </CardHeader>
            <CardContent>{renderValuesList("empresa", empresas)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Setores</CardTitle>
              <CardDescription>
                Clique no ícone de edição para corrigir erros de digitação. As correções serão aplicadas a todos os respondentes.
              </CardDescription>
            </CardHeader>
            <CardContent>{renderValuesList("setor", setores)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funcao" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cargos/Funções</CardTitle>
              <CardDescription>
                Clique no ícone de edição para corrigir erros de digitação. As correções serão aplicadas a todos os respondentes.
              </CardDescription>
            </CardHeader>
            <CardContent>{renderValuesList("funcao", funcoes)}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmDialog.field} onOpenChange={() => setConfirmDialog({ field: null, oldValue: null, newValue: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar renomeação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja renomear <strong>"{confirmDialog.oldValue}"</strong> para <strong>"{confirmDialog.newValue}"</strong>?
              <br />
              <br />
              Esta ação afetará {getCountForValue(confirmDialog.field || "empresa", confirmDialog.oldValue || "")} respondente(s) e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyRename} className="bg-red-600 hover:bg-red-700">
              Confirmar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
