import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { RefreshCw, Printer, ArrowLeft, CheckSquare, Square, ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { FilaImpressaoItem, ImpressoraConfig } from "@/types/requisicao";
import { buscarFilaImpressao, marcarParaImpressao, buscarConfigImpressoras } from "@/services/filaImpressaoService";

const PrintQueue = () => {
  const [fila, setFila] = useState<FilaImpressaoItem[]>([]);
  const [impressoras, setImpressoras] = useState<ImpressoraConfig[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const [printerOpen, setPrinterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const { toast } = useToast();

  const makeKey = (item: FilaImpressaoItem) => `${item.nrRequisicao}-${item.serieRotulo}`;

  const carregarFila = useCallback(async () => {
    setIsLoading(true);
    const result = await buscarFilaImpressao();
    if (result.success && result.data) {
      setFila(result.data);
    } else {
      toast({ title: "Erro ao carregar fila", description: result.error, variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  const carregarImpressoras = useCallback(async () => {
    const result = await buscarConfigImpressoras();
    if (result.success && result.data) {
      setImpressoras(result.data);
      if (result.data.length > 0) {
        setSelectedPrinter(prev => prev || result.data![0].portaRede);
      }
    }
  }, []);

  useEffect(() => {
    carregarFila();
    carregarImpressoras();
  }, [carregarFila, carregarImpressoras]);

  const toggleItem = (key: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(fila.map(makeKey)));
  const deselectAll = () => setSelectedIds(new Set());

  const handleMarcar = async () => {
    if (selectedIds.size === 0) {
      toast({ title: "Nenhum rótulo selecionado", variant: "destructive" });
      return;
    }

    setIsMarking(true);
    const ids = Array.from(selectedIds).map(key => {
      const [nrRequisicao, serieRotulo] = key.split("-");
      return { nrRequisicao, serieRotulo };
    });

    const result = await marcarParaImpressao(ids);
    setIsMarking(false);

    if (result.success) {
      toast({ title: "Marcados para impressão", description: `${result.data?.atualizados || ids.length} rótulo(s) enviados.` });
      setSelectedIds(new Set());
      carregarFila();
    } else {
      toast({ title: "Erro", description: result.error, variant: "destructive" });
    }
  };

  const statusBadge = (status: number) => {
    switch (status) {
      case 0: return <Badge variant="outline">Pendente</Badge>;
      case 1: return <Badge variant="secondary">Em impressão</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const selectedPrinterConfig = impressoras.find(i => i.portaRede === selectedPrinter);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-primary">Fila de Impressão</h1>
              <p className="text-xs text-muted-foreground">Rótulos pendentes (FC12B00)</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={carregarFila} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4">
        {/* Printer selector + actions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-lg">Rótulos Pendentes</CardTitle>
                <CardDescription>{fila.length} item(ns) na fila • {selectedIds.size} selecionado(s)</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {impressoras.length > 0 && (
                  <Popover open={printerOpen} onOpenChange={setPrinterOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={printerOpen} className="w-[250px] h-9 text-xs justify-between">
                        <Printer className="h-3.5 w-3.5 mr-1 shrink-0" />
                        <span className="truncate">
                          {selectedPrinter
                            ? impressoras.find(i => i.portaRede === selectedPrinter)
                              ? `${impressoras.find(i => i.portaRede === selectedPrinter)!.nomePC} — ${selectedPrinter}`
                              : selectedPrinter
                            : "Selecione impressora"}
                        </span>
                        <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0 bg-popover z-50">
                      <Command>
                        <CommandInput placeholder="Pesquisar impressora..." />
                        <CommandList>
                          <CommandEmpty>Nenhuma impressora encontrada.</CommandEmpty>
                          <CommandGroup>
                            {impressoras
                              .filter((imp) => imp.portaRede && imp.portaRede.trim() !== "")
                              .map((imp, idx) => (
                                <CommandItem
                                  key={`${imp.portaRede}-${idx}`}
                                  value={`${imp.nomePC} ${imp.portaRede}`}
                                  onSelect={() => {
                                    setSelectedPrinter(imp.portaRede);
                                    setPrinterOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", selectedPrinter === imp.portaRede ? "opacity-100" : "opacity-0")} />
                                  {imp.nomePC} — {imp.portaRede}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                <Button variant="outline" size="sm" onClick={selectAll}>
                  <CheckSquare className="h-4 w-4 mr-1" /> Todos
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  <Square className="h-4 w-4 mr-1" /> Limpar
                </Button>
                <Button size="sm" onClick={handleMarcar} disabled={selectedIds.size === 0 || isMarking}>
                  <Printer className={`h-4 w-4 mr-1 ${isMarking ? "animate-pulse" : ""}`} />
                  {isMarking ? "Enviando..." : "Imprimir Selecionados"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedPrinterConfig && (
              <p className="text-xs text-muted-foreground mb-3">
                Dimensões: {selectedPrinterConfig.largura}×{selectedPrinterConfig.altura}mm • Tipo: {selectedPrinterConfig.tipoImpressora}
              </p>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Requisição</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>PC</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fila.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {isLoading ? "Carregando..." : "Nenhum rótulo pendente na fila."}
                    </TableCell>
                  </TableRow>
                ) : (
                  fila.map((item) => {
                    const key = makeKey(item);
                    return (
                      <TableRow key={key} data-state={selectedIds.has(key) ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(key)}
                            onCheckedChange={() => toggleItem(key)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.nrRequisicao}</TableCell>
                        <TableCell>{item.serieRotulo}</TableCell>
                        <TableCell className="text-sm">{item.dataCriacao}</TableCell>
                        <TableCell className="text-sm">{item.nomePC}</TableCell>
                        <TableCell>{statusBadge(item.status)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PrintQueue;
