import { useState, useEffect } from "react";
import { Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { LayoutType } from "@/types/requisicao";
import {
  PrinterDefinition,
  FONTES_PPLA,
  getDefinitions,
  saveDefinition,
  resetDefinition,
  TipoImpressora,
  TipoFormulario,
  TipoModelo,
  Gabarito,
  CaracterPadrao,
  UnidadeMedida,
  Velocidade,
} from "@/types/printerDefinition";

const layoutNames: Record<LayoutType, string> = {
  A_PAC_PEQ: 'A.PAC.PEQ',
  AMP_CX: 'AMP.CX',
  AMP10: 'AMP10',
  A_PAC_GRAN: 'A.PAC.GRAN',
  TIRZ: 'TIRZ',
};

const PrinterDefinitions = () => {
  const { toast } = useToast();
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>('A_PAC_PEQ');
  const [definitions, setDefinitions] = useState(getDefinitions());
  const [def, setDef] = useState<PrinterDefinition>(definitions[selectedLayout]);

  useEffect(() => {
    setDef(definitions[selectedLayout]);
  }, [selectedLayout, definitions]);

  const updateDef = (partial: Partial<PrinterDefinition>) => {
    setDef(prev => ({ ...prev, ...partial }));
  };

  const updateMedidas = (partial: Partial<PrinterDefinition['medidas']>) => {
    setDef(prev => ({ ...prev, medidas: { ...prev.medidas, ...partial } }));
  };

  const handleSave = () => {
    saveDefinition(def);
    setDefinitions(prev => ({ ...prev, [selectedLayout]: { ...def } }));
    toast({ title: "Definição salva!", description: `${def.nome} atualizado com sucesso.` });
  };

  const handleReset = () => {
    const reset = resetDefinition(selectedLayout);
    setDef(reset);
    setDefinitions(prev => ({ ...prev, [selectedLayout]: reset }));
    toast({ title: "Definição resetada", description: `${layoutNames[selectedLayout]} restaurado para valores padrão.` });
  };

  return (
    <div className="space-y-4">
      {/* Seleção de layout (lista lateral estilo FC) */}
      <div className="flex gap-4">
        <Card className="w-48 shrink-0">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Definições</CardTitle>
          </CardHeader>
          <CardContent className="p-1">
            <div className="space-y-0.5">
              {(Object.keys(layoutNames) as LayoutType[]).map(key => (
                <button
                  key={key}
                  onClick={() => setSelectedLayout(key)}
                  className={`w-full text-left px-3 py-1.5 text-sm font-mono rounded transition-colors ${
                    selectedLayout === key
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'hover:bg-accent text-foreground'
                  }`}
                >
                  {layoutNames[key]}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Painel de Alteração (estilo FC) */}
        <Card className="flex-1">
          <CardHeader className="py-3 px-4 border-b border-border">
            <CardTitle className="text-base">Alteração — {def.nome}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-6">
              {/* Coluna 1: Definição + Impressora + Formulário + Modelo */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Definição</Label>
                  <Input value={def.nome} readOnly className="bg-muted font-mono text-sm h-8" />
                </div>

                <fieldset className="border border-border rounded p-2 space-y-1">
                  <legend className="text-xs font-semibold px-1">Impressora</legend>
                  <RadioGroup
                    value={def.impressora}
                    onValueChange={(v) => updateDef({ impressora: v as TipoImpressora })}
                    className="space-y-0.5"
                  >
                    {(['matricial', 'jato_de_tinta', 'laser', 'termica'] as const).map(tipo => (
                      <div key={tipo} className="flex items-center gap-2">
                        <RadioGroupItem value={tipo} id={`imp-${tipo}`} className="h-3.5 w-3.5" />
                        <Label htmlFor={`imp-${tipo}`} className="text-xs capitalize cursor-pointer">
                          {tipo === 'jato_de_tinta' ? 'Jato de Tinta' : tipo === 'termica' ? 'Térmica' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </fieldset>

                <fieldset className="border border-border rounded p-2 space-y-1">
                  <legend className="text-xs font-semibold px-1">Formulário</legend>
                  <RadioGroup
                    value={def.formulario}
                    onValueChange={(v) => updateDef({ formulario: v as TipoFormulario })}
                    className="space-y-0.5"
                  >
                    {([['continuo', 'Contínuo'], ['folha_solta', 'Folha Solta'], ['bobina', 'Bobina']] as const).map(([val, label]) => (
                      <div key={val} className="flex items-center gap-2">
                        <RadioGroupItem value={val} id={`form-${val}`} className="h-3.5 w-3.5" />
                        <Label htmlFor={`form-${val}`} className="text-xs cursor-pointer">{label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </fieldset>

                <fieldset className="border border-border rounded p-2 space-y-1">
                  <legend className="text-xs font-semibold px-1">Modelo</legend>
                  <RadioGroup
                    value={def.modelo}
                    onValueChange={(v) => updateDef({ modelo: v as TipoModelo })}
                    className="space-y-0.5"
                  >
                    {([['epson', 'Epson'], ['hp', 'Hp'], ['rima', 'Rima'], ['grafico', 'Gráfico'], ['personalizado', 'Personalizado']] as const).map(([val, label]) => (
                      <div key={val} className="flex items-center gap-2">
                        <RadioGroupItem value={val} id={`mod-${val}`} className="h-3.5 w-3.5" />
                        <Label htmlFor={`mod-${val}`} className="text-xs cursor-pointer">{label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </fieldset>
              </div>

              {/* Coluna 2: Gabarito + Caracter Padrão + Fonte */}
              <div className="space-y-4">
                <fieldset className="border border-border rounded p-2 space-y-1">
                  <legend className="text-xs font-semibold px-1">Gabarito</legend>
                  <RadioGroup
                    value={String(def.gabarito)}
                    onValueChange={(v) => updateDef({ gabarito: Number(v) as Gabarito })}
                    className="space-y-0.5"
                  >
                    {[6, 8, 12, 16].map(lpp => (
                      <div key={lpp} className="flex items-center gap-2">
                        <RadioGroupItem value={String(lpp)} id={`gab-${lpp}`} className="h-3.5 w-3.5" />
                        <Label htmlFor={`gab-${lpp}`} className="text-xs cursor-pointer">{lpp} LPP</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </fieldset>

                <fieldset className="border border-border rounded p-2 space-y-1">
                  <legend className="text-xs font-semibold px-1">Caracter padrão</legend>
                  <RadioGroup
                    value={String(def.caracterPadrao)}
                    onValueChange={(v) => updateDef({ caracterPadrao: Number(v) as CaracterPadrao })}
                    className="space-y-0.5"
                  >
                    {[
                      [5, '5 CPP (Expand.)'],
                      [10, '10 CPP'],
                      [12, '12 CPP'],
                      [17, '17 CPP'],
                      [20, '20 CPP'],
                    ].map(([val, label]) => (
                      <div key={val} className="flex items-center gap-2">
                        <RadioGroupItem value={String(val)} id={`cpp-${val}`} className="h-3.5 w-3.5" />
                        <Label htmlFor={`cpp-${val}`} className="text-xs cursor-pointer">{label as string}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </fieldset>

                <fieldset className="border border-border rounded p-2 space-y-2">
                  <legend className="text-xs font-semibold px-1">Fonte da Linha</legend>
                  <Select
                    value={String(def.fonte)}
                    onValueChange={(v) => updateDef({ fonte: Number(v) })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {FONTES_PPLA.map(f => (
                        <SelectItem key={f.id} value={String(f.id)} className="text-xs">
                          Fonte {f.id} ({f.tamanhoMM}) [{f.compatibilidade}]
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-[10px] text-muted-foreground">
                    Atual: <span className="font-semibold text-primary">Fonte {def.fonte} ({FONTES_PPLA[def.fonte]?.tamanhoMM})</span> — Rotação: {def.rotacaoFonte} Graus
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Rotação:</Label>
                    <Select
                      value={String(def.rotacaoFonte)}
                      onValueChange={(v) => updateDef({ rotacaoFonte: Number(v) })}
                    >
                      <SelectTrigger className="h-7 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="0" className="text-xs">0°</SelectItem>
                        <SelectItem value="1" className="text-xs">90°</SelectItem>
                        <SelectItem value="2" className="text-xs">180°</SelectItem>
                        <SelectItem value="3" className="text-xs">270°</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </fieldset>
              </div>

              {/* Coluna 3: Medidas */}
              <div className="space-y-3">
                <fieldset className="border border-border rounded p-3 space-y-2">
                  <legend className="text-xs font-semibold px-1">Medidas</legend>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Unidade de medida</Label>
                    <Select
                      value={def.medidas.unidade}
                      onValueChange={(v) => updateMedidas({ unidade: v as UnidadeMedida })}
                    >
                      <SelectTrigger className="h-7 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="pol" className="text-xs">pol</SelectItem>
                        <SelectItem value="mm" className="text-xs">mm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {([
                    ['largura', 'Largura'],
                    ['altura', 'Altura'],
                    ['margemSuperior', 'Margem Superior'],
                    ['margemEsquerda', 'Margem Esquerda'],
                    ['nCarreiras', 'Nº Carreiras'],
                    ['nLinhasEtiquetas', 'Nº Linhas Etiquetas'],
                    ['espacoEntreColunas', 'Espaço entre colunas'],
                    ['espacoEntreLinhas', 'Espaço entre linhas'],
                    ['saltoRabbit', 'Salto (Rabbit)'],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-xs">{label}</Label>
                      <Input
                        type="number"
                        step={key === 'largura' || key === 'altura' || key === 'saltoRabbit' ? '0.01' : '1'}
                        className="h-7 w-24 text-xs text-right font-mono"
                        value={def.medidas[key]}
                        onChange={(e) => updateMedidas({ [key]: Number(e.target.value) })}
                      />
                    </div>
                  ))}

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Velocidade</Label>
                    <Select
                      value={def.medidas.velocidade}
                      onValueChange={(v) => updateMedidas({ velocidade: v as Velocidade })}
                    >
                      <SelectTrigger className="h-7 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="MINIMA" className="text-xs">MÍNIMA</SelectItem>
                        <SelectItem value="MEDIA" className="text-xs">MÉDIA</SelectItem>
                        <SelectItem value="MAXIMA" className="text-xs">MÁXIMA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </fieldset>

                <div className="space-y-1 text-xs text-muted-foreground">
                  {def.medidas.unidade === 'pol' && (
                    <p>
                      ≈ {(def.medidas.largura * 25.4).toFixed(1)}mm × {(def.medidas.altura * 25.4).toFixed(1)}mm
                    </p>
                  )}
                  {def.medidas.unidade === 'mm' && (
                    <p>
                      ≈ {(def.medidas.largura / 25.4).toFixed(2)}pol × {(def.medidas.altura / 25.4).toFixed(2)}pol
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé: Impressão + Opções */}
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Impressão Local</Label>
                  <Input
                    value={def.impressaoLocal}
                    onChange={(e) => updateDef({ impressaoLocal: e.target.value })}
                    className="h-8 text-xs font-mono"
                    placeholder="LPT1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Impressão Rede</Label>
                  <Input
                    value={def.impressaoRede}
                    onChange={(e) => updateDef({ impressaoRede: e.target.value })}
                    className="h-8 text-xs font-mono"
                    placeholder="\\192.168.10.xxx\impressora"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Marca da Impressora</Label>
                <Input
                  value={def.marcaImpressora}
                  onChange={(e) => updateDef({ marcaImpressora: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="Argox, Zebra, etc."
                />
              </div>

              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="permitirSemComp"
                    checked={def.permitirImpressaoSemComponentes}
                    onCheckedChange={(c) => updateDef({ permitirImpressaoSemComponentes: !!c })}
                  />
                  <Label htmlFor="permitirSemComp" className="text-xs cursor-pointer">
                    Permitir Impressão sem componentes
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="usarGerenciador"
                    checked={def.usarGerenciadorImpressao}
                    onCheckedChange={(c) => updateDef({ usarGerenciadorImpressao: !!c })}
                  />
                  <Label htmlFor="usarGerenciador" className="text-xs cursor-pointer">
                    Usar Gerenciador Impressão (Recomendável)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="desconsiderarLocal"
                    checked={def.desconsiderarImpressaoLocal}
                    onCheckedChange={(c) => updateDef({ desconsiderarImpressaoLocal: !!c })}
                  />
                  <Label htmlFor="desconsiderarLocal" className="text-xs cursor-pointer">
                    Sempre desconsiderar a Impressão Local
                  </Label>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Resetar
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Salvar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrinterDefinitions;
