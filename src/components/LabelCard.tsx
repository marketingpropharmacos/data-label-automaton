import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save, X } from "lucide-react";
import { RotuloItem, PharmacyConfig, LabelConfig, LayoutConfig, LabelFieldId } from "@/types/requisicao";
import PharmacyHeader from "./PharmacyHeader";

interface LabelCardProps {
  rotulo: RotuloItem;
  pharmacyConfig: PharmacyConfig;
  labelConfig: LabelConfig;
  layoutConfig: LayoutConfig;
  selected: boolean;
  onToggle: (id: string) => void;
  onUpdate?: (id: string, field: string, value: string) => void;
}

const LabelCard = ({ rotulo, pharmacyConfig, labelConfig, layoutConfig, selected, onToggle, onUpdate }: LabelCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");

  // Converter mm para pixels aproximados (96 DPI / 25.4mm)
  const mmToPx = (mm: number) => Math.round(mm * 3.78);
  
  // Tamanho do rótulo responsivo com máximo para caber no card
  const labelWidth = Math.min(mmToPx(labelConfig.larguraMM), 320);
  const labelHeight = Math.min(mmToPx(labelConfig.alturaMM), 220);
  
  const labelStyle = {
    width: `${labelWidth}px`,
    minHeight: `${labelHeight}px`,
    maxWidth: '100%',
  };

  // Extrair aplicação de observações se necessário
  const getAplicacao = (): string => {
    if (rotulo.aplicacao && rotulo.aplicacao.trim()) {
      return rotulo.aplicacao.trim().toUpperCase();
    }
    
    const obs = rotulo.observacoes || "";
    const patterns = [
      /APLIC(?:AÇÃO|ACAO)?[:\s]+([^\n,;]+)/i,
      /\b(IV|IM|SC|ID|EV|IDSC|ID\/SC|IM\/SC|SC\/IM)\b/i,
    ];
    
    for (const pattern of patterns) {
      const match = obs.match(pattern);
      if (match) {
        return match[1].trim().toUpperCase();
      }
    }
    
    return "";
  };

  // Remover aplicação de observações se foi extraída
  const getObservacoes = (): string => {
    let obs = rotulo.observacoes || "";
    
    if (!rotulo.aplicacao || !rotulo.aplicacao.trim()) {
      obs = obs.replace(/APLIC(?:AÇÃO|ACAO)?[:\s]+[^\n,;]+[,;\s]*/gi, "").trim();
    }
    
    return obs;
  };

  // Mapeamento de tipos de prescritores por código PFCRM
  // SEMPRE usar "DR." como prefixo, mantendo apenas o conselho diferenciado
  const tiposPrescritores: Record<string, { prefixo: string; conselho: string }> = {
    '1': { prefixo: 'DR.', conselho: 'CRM' },       // Médico
    '2': { prefixo: 'DR.', conselho: 'CRO' },       // Dentista
    '3': { prefixo: 'DR.', conselho: 'CRMV' },      // Veterinário
    '4': { prefixo: 'DR.', conselho: '' },          // Esteticista
    '5': { prefixo: 'DR.', conselho: 'CRP' },       // Psicóloga
    '6': { prefixo: 'DR.', conselho: 'CRF' },       // Farmacêutico
    '7': { prefixo: 'DR.', conselho: 'CRBM' },      // Biomédico
    '8': { prefixo: 'DR.', conselho: 'CRFA' },      // Fonoaudiólogo
    '9': { prefixo: 'DR.', conselho: 'CRN' },       // Nutricionista
    'A': { prefixo: 'DR.', conselho: 'CREFITO' },   // Fisioterapeuta
    'B': { prefixo: 'DR.', conselho: 'CREFITO' },   // Terapeuta Ocupacional
    'C': { prefixo: 'DR.', conselho: 'COREN' },     // Enfermeiro
    'D': { prefixo: 'DR.', conselho: 'RMS' },       // Registro Min. Saúde
    'E': { prefixo: 'DR.', conselho: 'CRBio' },     // Biólogo
    'F': { prefixo: 'DR.', conselho: 'CRO' },       // Dentista (alternativo)
  };

  // Detectar gênero pelo primeiro nome (heurística simples para português)
  const detectarGenero = (nome: string): 'M' | 'F' => {
    if (!nome) return 'M';
    const primeiroNome = nome.trim().split(' ')[0].toUpperCase();
    
    // Nomes femininos comuns que terminam em consoante ou outras letras
    const nomesFemininos = ['JEANNE', 'KAREN', 'MABEL', 'RAQUEL', 'SUELI', 'MIRIAM', 'LILIAN', 'VIVIAN', 'JAQUELIN'];
    if (nomesFemininos.includes(primeiroNome)) return 'F';
    
    // Nomes masculinos que terminam em 'A' (exceções)
    const nomesMasculinos = ['JOSUE', 'JOSHUA', 'LUCA', 'MICA', 'NIKITA', 'SASCHA'];
    if (nomesMasculinos.includes(primeiroNome)) return 'M';
    
    // Heurística: nomes terminados em 'A' geralmente são femininos
    if (primeiroNome.endsWith('A')) return 'F';
    
    return 'M';
  };

  const formatarPrescritor = () => {
    if (!rotulo.numeroCRM) return "";
    
    const codigo = (rotulo.prefixoCRM || '1').toUpperCase().trim();
    const tipo = tiposPrescritores[codigo] || { prefixo: 'DR.', conselho: 'CRM' };
    
    // Detecta gênero e ajusta prefixo
    const genero = detectarGenero(rotulo.nomeMedico);
    const prefixo = genero === 'F' ? 'DRA.' : 'DR.';
    const conselho = tipo.conselho;
    
    if (rotulo.nomeMedico) {
      if (conselho) {
        return `${prefixo} ${rotulo.nomeMedico.toUpperCase()} - ${conselho} ${rotulo.numeroCRM}/${rotulo.ufCRM}`;
      }
      return `${prefixo} ${rotulo.nomeMedico.toUpperCase()}`;
    }
    return `${conselho} ${rotulo.numeroCRM}/${rotulo.ufCRM}`;
  };

  const formatarDataCurta = (data: string) => {
    if (!data) return "";
    const partes = data.split('/');
    if (partes.length === 3) {
      return `${partes[1]}/${partes[2].slice(-2)}`;
    }
    return data;
  };

  const formatarFormula = (formula: string) => {
    if (!formula) return "";
    let nome = formula;
    if (nome.toUpperCase().startsWith("AMP ")) {
      nome = nome.substring(4);
    }
    return nome.toUpperCase();
  };

  // Remove prefixos de embalagem (AMP, FRS, FR, etc.) dos nomes de componentes de KIT
  const formatarNomeComponente = (nome: string): string => {
    if (!nome) return "";
    let limpo = nome.trim().toUpperCase();
    
    // Remove prefixos de embalagem comuns
    const prefixos = ["AMP ", "FRS ", "FR ", "BIS ", "ENV "];
    for (const prefixo of prefixos) {
      if (limpo.startsWith(prefixo)) {
        limpo = limpo.substring(prefixo.length);
        break;
      }
    }
    
    return limpo;
  };

  const formatarLote = () => {
    const lote = rotulo.lote || "";
    if (lote.includes('/')) return lote;
    const ano = formatarDataCurta(rotulo.dataFabricacao).split('/')[1] || "";
    return lote ? `${lote}/${ano}` : "";
  };

  // Normaliza a barra da requisição para usar exatamente os valores do backend
  const normalizeReqBarra = (nrReq: string, nrItem: string): string => {
    const req = (nrReq || "").trim();
    const barra = (nrItem || "0").trim();
    return `REQ:${req}-${barra}`;
  };

  // ============================================
  // REGRA DE EXCLUSÃO MÚTUA: composicao vs formula
  // - MESCLA: composicao tem valor TEXTUAL → mostrar SÓ composicao
  // - PRODUTO ÚNICO: composicao vazio ou numérico → mostrar SÓ formula
  // ============================================
  const isValidComposicao = (texto: string): boolean => {
    if (!texto || !texto.trim()) return false;
    // Ignorar se for apenas números, pontos, vírgulas ou ponto-vírgula (coordenadas, versões)
    // Exemplo de dados inválidos: "32.09;34.69;8.0.1"
    const apenasNumerosEPontuacao = /^[\d.,;\s]+$/.test(texto.trim());
    if (apenasNumerosEPontuacao) return false;
    return true;
  };

  // Verifica se é um KIT (tem componentes individuais)
  const isKit = (): boolean => {
    return rotulo.tipoItem === 'KIT' && 
           rotulo.componentes !== undefined && 
           rotulo.componentes.length > 0;
  };

  const isMescla = (): boolean => {
    // Se é KIT, não é mescla
    if (isKit()) return false;
    const composicao = (rotulo.composicao || "").trim();
    return isValidComposicao(composicao);
  };

  // Gerar texto formatado para componentes de um KIT
  const generateKitText = (): string => {
    if (!rotulo.componentes || rotulo.componentes.length === 0) return "";
    
    const lines: string[] = [];
    
    // Linha 1: Paciente (primeiro, conforme referência)
    if (rotulo.nomePaciente) lines.push(rotulo.nomePaciente.toUpperCase());
    
    // Linha 2: Prescritor
    const prescritor = formatarPrescritor();
    if (prescritor) lines.push(prescritor);
    
    // Linhas de componentes do kit (composição ou nome + metadados na linha seguinte)
    rotulo.componentes.forEach((comp) => {
      // Kit sinônimo: usa composição (observações do produto); Kit normal: usa nome do componente
      const nomeExibicao = rotulo.eSinonimo
        ? (comp.composicao || formatarNomeComponente(comp.nome))
        : formatarNomeComponente(comp.nome);
      lines.push(nomeExibicao);
      const metaLine: string[] = [];
      if (comp.ph) metaLine.push(`pH:${comp.ph}`);
      if (comp.lote) metaLine.push(`L:${comp.lote}`);
      if (comp.fabricacao) metaLine.push(`F:${formatarDataCurta(comp.fabricacao)}`);
      if (comp.validade) metaLine.push(`V:${formatarDataCurta(comp.validade)}`);
      if (comp.aplicacao) metaLine.push(`APLICAÇÃO:${comp.aplicacao}`);
      if (metaLine.length > 0) lines.push(metaLine.join("  "));
    });
    
    // Tipo de Uso + Aplicação (mesma linha)
    const aplicacao = getAplicacao();
    const tipoUso = rotulo.tipoUso?.toUpperCase() || "";
    const tipoUsoValido = /^\d+$/.test(tipoUso) ? "" : tipoUso;
    const usoApLine: string[] = [];
    if (tipoUsoValido) usoApLine.push(tipoUsoValido);
    if (aplicacao) usoApLine.push(`APLICAÇÃO:${aplicacao}`);
    if (usoApLine.length > 0) lines.push(usoApLine.join("  "));
    
    // Contém + Registro (mesma linha)
    const contemRegLine: string[] = [];
    if (rotulo.contem) contemRegLine.push(`CONTÉM: ${rotulo.contem}`);
    if (rotulo.numeroRegistro) contemRegLine.push(`REG:${rotulo.numeroRegistro}`);
    if (contemRegLine.length > 0) lines.push(contemRegLine.join("   "));
    
    return lines.join('\n');
  };

  // Gerar texto formatado inicial para edição - ordem padronizada
  const generateInitialText = (): string => {
    // Se é KIT, usa formatação específica
    if (isKit()) {
      return generateKitText();
    }
    
    const aplicacao = getAplicacao();
    const observacoes = getObservacoes();
    const mescla = isMescla();
    
    const lines: string[] = [];
    
    // Linha 1: Prescritor (primeiro porque é quem prescreveu)
    const prescritor = formatarPrescritor();
    if (prescritor) lines.push(prescritor);
    
    // Linha 2: Paciente
    if (rotulo.nomePaciente) lines.push(rotulo.nomePaciente.toUpperCase());
    
    // Linha 3: Composição OU Fórmula (exclusão mútua)
    if (mescla) {
      // MESCLA: mostra só os ativos
      lines.push(rotulo.composicao!.toUpperCase());
    } else {
      // PRODUTO ÚNICO: mostra só o nome do ativo
      const formula = formatarFormula(rotulo.formula);
      if (formula) lines.push(formula);
    }
    
    // Linha 4: Lote, Fabricação, Validade (em uma linha)
    const loteInfo: string[] = [];
    const lote = formatarLote();
    if (lote) loteInfo.push(`L: ${lote}`);
    if (rotulo.dataFabricacao) loteInfo.push(`F: ${formatarDataCurta(rotulo.dataFabricacao)}`);
    if (rotulo.dataValidade) loteInfo.push(`V: ${formatarDataCurta(rotulo.dataValidade)}`);
    if (loteInfo.length > 0) lines.push(loteInfo.join('  '));
    
    // Linha 5: pH, Aplicação, Contém (em uma linha)
    const infoLine: string[] = [];
    if (rotulo.ph) infoLine.push(`pH: ${rotulo.ph}`);
    if (aplicacao) infoLine.push(`APLICAÇÃO: ${aplicacao}`);
    if (rotulo.contem) infoLine.push(`CONT: ${rotulo.contem}`);
    if (infoLine.length > 0) lines.push(infoLine.join('  '));
    
    // Linha 6: Tipo de Uso
    const tipoUso = rotulo.tipoUso?.toUpperCase();
    if (tipoUso) lines.push(tipoUso);
    
    // Linha 7: Posologia (se existir)
    if (rotulo.posologia) lines.push(`POS: ${rotulo.posologia.toUpperCase()}`);
    
    // Linha 8: Observações e Registro
    if (observacoes) lines.push(`OBS: ${observacoes}`);
    if (rotulo.numeroRegistro) lines.push(`REG: ${rotulo.numeroRegistro}`);
    
    return lines.join('\n');
  };

  // Entrar no modo de edição
  const handleStartEdit = () => {
    const initialText = rotulo.textoLivre || generateInitialText();
    setEditText(initialText);
    setIsEditing(true);
  };

  // Salvar edição
  const handleSave = () => {
    onUpdate?.(rotulo.id, 'textoLivre', editText);
    setIsEditing(false);
  };

  // Cancelar edição
  const handleCancel = () => {
    setEditText("");
    setIsEditing(false);
  };

  // Duplo clique para editar
  const handleDoubleClick = () => {
    handleStartEdit();
  };

  // Obter conteúdo do campo (para modo visual)
  // Aplica regra de exclusão mútua: composicao vs formula
  const getFieldContent = (fieldId: LabelFieldId): React.ReactNode => {
    const config = layoutConfig.campoConfig[fieldId];
    if (!config?.visible) return null;

    const aplicacao = getAplicacao();
    const observacoes = getObservacoes();
    const mescla = isMescla();

    switch (fieldId) {
      case 'paciente':
        return rotulo.nomePaciente || "";
      case 'composicao':
        // MESCLA: mostra composição / PRODUTO ÚNICO: oculta (retorna vazio)
        return mescla ? rotulo.composicao!.toUpperCase() : "";
  case 'requisicao':
        return normalizeReqBarra(rotulo.nrRequisicao, rotulo.nrItem);
      case 'formula':
        // PRODUTO ÚNICO: mostra fórmula / MESCLA: oculta (retorna vazio)
        return mescla ? "" : formatarFormula(rotulo.formula);
      case 'lote':
        return `L: ${formatarLote() || "___"}`;
      case 'fabricacao':
        return `F: ${formatarDataCurta(rotulo.dataFabricacao)}`;
      case 'validade':
        return `V: ${formatarDataCurta(rotulo.dataValidade)}`;
      case 'ph':
        // Sempre exibir "pH:" mesmo sem valor - permite edição manual
        return `pH: ${rotulo.ph || ""}`;
      case 'tipoUso':
        // Filtrar valores numéricos (pH incorreto vindo da API)
        const tipoUsoValor = rotulo.tipoUso?.toUpperCase() || "";
        if (/^\d+$/.test(tipoUsoValor)) return "";
        return tipoUsoValor || "";
      case 'aplicacao':
        // Sempre exibir "APLICAÇÃO:" mesmo sem valor - permite edição manual
        return `APLICAÇÃO: ${aplicacao || ""}`;
      case 'contem':
        // Sempre exibir "CONTÉM:" mesmo sem valor - permite edição manual
        return `CONTÉM: ${rotulo.contem || ""}`;
      case 'registro':
        return rotulo.numeroRegistro ? `REG: ${rotulo.numeroRegistro}` : "";
      case 'medico':
        return formatarPrescritor();
      case 'posologia':
        // Sem prefixo "Pos:" - exibe só o conteúdo
        return rotulo.posologia ? rotulo.posologia.toUpperCase() : "";
      case 'observacoes':
        // Só exibe se tiver conteúdo (indica mescla)
        // Produto único não tem observação
        return observacoes ? observacoes.toUpperCase() : "";
      default:
        return "";
    }
  };

  const shouldRenderField = (fieldId: LabelFieldId): boolean => {
    const config = layoutConfig.campoConfig[fieldId];
    if (!config?.visible) return false;
    
    // Campos que sempre aparecem (para edição manual)
    const camposSempreVisiveis: LabelFieldId[] = ['ph', 'contem', 'aplicacao'];
    if (camposSempreVisiveis.includes(fieldId)) return true;
    
    const content = getFieldContent(fieldId);
    if (content === "" || content === null) return false;
    
    return true;
  };

  const getLineSpacing = (spacing?: string): string => {
    switch (spacing) {
      case 'compact': return 'gap-2';
      case 'wide': return 'gap-4';
      default: return 'gap-3';
    }
  };

  // Renderizar conteúdo de KIT (lista de componentes com metadados)
  const renderKitContent = () => {
    if (!rotulo.componentes || rotulo.componentes.length === 0) {
      return null;
    }

    const aplicacao = getAplicacao();
    const tipoUso = rotulo.tipoUso?.toUpperCase() || "";
    const tipoUsoValido = /^\d+$/.test(tipoUso) ? "" : tipoUso;
    
    return (
      <div className="p-2 space-y-0.5 overflow-hidden">
        {/* Paciente + Requisição (primeiro, conforme referência) */}
        <div className="flex justify-between text-[9px] leading-tight">
          <span className="font-bold uppercase">{rotulo.nomePaciente}</span>
          <span>{normalizeReqBarra(rotulo.nrRequisicao, rotulo.nrItem)}</span>
        </div>
        
        {/* Prescritor (segundo) */}
        <div className="text-[9px] leading-tight uppercase">{formatarPrescritor()}</div>
        
        {/* Lista de componentes do kit: composição/nome na linha, metadados na seguinte */}
        {rotulo.componentes.map((comp, idx) => (
          <div key={idx} className="mt-0.5">
            <div className="text-[9px] leading-tight font-semibold uppercase">
              {rotulo.eSinonimo
                ? (comp.composicao || formatarNomeComponente(comp.nome))
                : formatarNomeComponente(comp.nome)}
            </div>
            <div className="text-[9px] leading-tight flex flex-wrap gap-1">
              {comp.ph && <span>pH:{comp.ph}</span>}
              {comp.lote && <span>L:{comp.lote}</span>}
              {comp.fabricacao && <span>F:{formatarDataCurta(comp.fabricacao)}</span>}
              {comp.validade && <span>V:{formatarDataCurta(comp.validade)}</span>}
              {comp.aplicacao && <span>APLICAÇÃO:{comp.aplicacao}</span>}
            </div>
          </div>
        ))}
        
        {/* Tipo de Uso + Aplicação (mesma linha) */}
        {(tipoUsoValido || aplicacao) && (
          <div className="text-[9px] leading-tight uppercase">
            {tipoUsoValido}{tipoUsoValido && aplicacao ? '  ' : ''}{aplicacao ? `APLICAÇÃO:${aplicacao}` : ''}
          </div>
        )}
        
        {/* Contém + Registro (mesma linha) */}
        {(rotulo.contem || rotulo.numeroRegistro) && (
          <div className="text-[9px] leading-tight flex justify-between">
            {rotulo.contem && <span>CONTÉM: {rotulo.contem}</span>}
            {rotulo.numeroRegistro && <span>REG:{rotulo.numeroRegistro}</span>}
          </div>
        )}
      </div>
    );
  };

  // Renderizar conteúdo compacto (quando card não está selecionado)
  const renderCompactContent = () => {
    const prescritor = formatarPrescritor();
    const aplicacao = getAplicacao();
    const mescla = isMescla();
    
    // Determina conteúdo principal (composição para mescla, fórmula para item único)
    const conteudo = mescla 
      ? (rotulo.composicao || "").toUpperCase()
      : formatarFormula(rotulo.formula);
    
    // Truncar se muito longo
    const conteudoTruncado = conteudo.length > 60 
      ? conteudo.slice(0, 57) + "..." 
      : conteudo;
    
    return (
      <div className="p-2 space-y-0.5 overflow-hidden">
        {/* Linha 1: Paciente + REQ */}
        <div className="flex justify-between text-[10px] leading-tight">
          <span className="font-bold uppercase">{rotulo.nomePaciente}</span>
          <span className="text-[9px]">{normalizeReqBarra(rotulo.nrRequisicao, rotulo.nrItem)}</span>
        </div>
        
        {/* Linha 2: Prescritor */}
        {prescritor && (
          <div className="text-[9px] leading-tight uppercase">{prescritor}</div>
        )}
        
        {/* Linha 3: Fórmula/Composição truncada */}
        <div className="text-[9px] leading-tight uppercase">{conteudoTruncado}</div>
        
        {/* Linha 4: Aplicação + REG */}
        <div className="flex justify-between text-[8px] leading-tight">
          {aplicacao && <span className="uppercase">APLICAÇÃO: {aplicacao}</span>}
          {rotulo.numeroRegistro && <span>REG: {rotulo.numeroRegistro}</span>}
        </div>
      </div>
    );
  };

  // Renderizar conteúdo do rótulo baseado em texto livre ou layout
  const renderLabelContent = () => {
    // Se tem texto livre salvo, usa ele (sempre expandido)
    if (rotulo.textoLivre) {
      return (
        <div className="p-2 whitespace-pre-wrap font-mono text-[10px] leading-snug break-words overflow-hidden">
          {rotulo.textoLivre}
        </div>
      );
    }

    // Se NÃO está selecionado, mostra versão compacta
    if (!selected) {
      return renderCompactContent();
    }

    // Se é KIT, usa renderização específica
    if (isKit()) {
      return renderKitContent();
    }

    // Senão, usa o layout baseado em linhas (expandido)
    return (
      <div className="p-2 space-y-0.5 overflow-hidden">
        {layoutConfig.linhas.map((linha) => {
          const camposVisiveis = linha.campos.filter(shouldRenderField);
          if (camposVisiveis.length === 0) return null;

          return (
            <div 
              key={linha.id} 
              className="flex flex-wrap items-baseline gap-1 text-[10px] leading-snug"
            >
              {camposVisiveis.map((fieldId) => {
                const config = layoutConfig.campoConfig[fieldId];
                const content = getFieldContent(fieldId);
                
                return (
                  <span
                    key={fieldId}
                    className={`${config.bold ? 'font-bold' : ''} ${config.uppercase ? 'uppercase' : ''} break-words`}
                    style={{ fontSize: `${Math.min(config.fontSize, 11)}px` }}
                  >
                    {content}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className={`p-4 border-2 transition-all duration-200 ${selected ? 'border-secondary bg-accent/30 shadow-md' : 'border-dashed border-border bg-card hover:border-primary/50 hover:shadow-sm'}`}>
      <div className="flex items-start gap-4">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(rotulo.id)}
          className="mt-2 data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
        />
        
        <div className="flex-1">
          {/* Modo Edição - Textarea como bloco de notas */}
          {isEditing ? (
            <div className="space-y-3">
              <div 
                className="bg-white border border-border rounded overflow-hidden"
                style={{ ...labelStyle, minHeight: '200px' }}
              >
                <PharmacyHeader config={pharmacyConfig} compact />
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="border-0 rounded-none font-mono text-xs resize-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[150px]"
                  style={{ minHeight: '150px' }}
                  placeholder="Digite o conteúdo do rótulo..."
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
            /* Modo Visualização - Preview do Rótulo */
            <div className="relative group">
              <div 
                className="bg-white border border-border rounded overflow-hidden font-mono text-foreground cursor-pointer"
                style={{ ...labelStyle, minHeight: '180px' }}
                onDoubleClick={handleDoubleClick}
                title="Clique duas vezes para editar"
              >
                <PharmacyHeader config={pharmacyConfig} compact />
                {renderLabelContent()}
              </div>
              
              {/* Botão Editar - aparece no hover */}
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleStartEdit}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default LabelCard;
