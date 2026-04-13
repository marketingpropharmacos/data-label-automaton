import { PrintAgentConfig, PrinterCalibrationConfig, RotuloItem } from "@/types/requisicao";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AgentHealthResponse {
  status: string;
  impressora_padrao: string;
  sistema: string;
}

interface PrinterListResponse {
  impressoras: string[];
  padrao: string;
}

// Verificar se o agente está online
export const verificarAgente = async (url: string): Promise<ApiResponse<AgentHealthResponse>> => {
  try {
    const response = await fetch(`${url}/health`, {
      method: "GET",
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      return { success: false, error: "Agente não respondeu corretamente" };
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("[PrintAgent] Erro ao verificar agente:", error);
    return { success: false, error: "Não foi possível conectar ao agente de impressão" };
  }
};

// Listar impressoras disponíveis no PC do agente
export const listarImpressoras = async (url: string): Promise<ApiResponse<PrinterListResponse>> => {
  try {
    const response = await fetch(`${url}/impressoras`, {
      method: "GET",
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      return { success: false, error: "Falha ao listar impressoras" };
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("[PrintAgent] Erro ao listar impressoras:", error);
    return { success: false, error: "Não foi possível obter lista de impressoras" };
  }
};

// Imprimir etiqueta de teste
export const testeImpressaoAgente = async (url: string): Promise<ApiResponse<{ message: string }>> => {
  try {
    const response = await fetch(`${url}/teste`, {
      method: "POST",
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || "Falha na impressão de teste" };
    }
    
    const data = await response.json();
    return { success: data.success, data };
  } catch (error) {
    console.error("[PrintAgent] Erro ao imprimir teste:", error);
    return { success: false, error: "Não foi possível enviar teste para o agente" };
  }
};

// Diagnóstico PPLA - mostra comandos sem imprimir
export const diagnosticoPPLA = async (
  url: string,
  impressora: string,
  layoutTipo: string,
  calibracao: PrinterCalibrationConfig
): Promise<ApiResponse<{
  impressora_resolvida: string;
  layout: string;
  dims: { largura_mm: number; altura_mm: number; cols_max: number };
  calibracao_usada: PrinterCalibrationConfig;
  comandos_ppla: string[];
  comandos_raw: string;
  total_bytes: number;
}>> => {
  try {
    const response = await fetch(`${url}/diagnostico-ppla`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({
        impressora,
        layout_tipo: layoutTipo,
        calibracao,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || "Falha no diagnóstico" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("[PrintAgent] Erro no diagnóstico:", error);
    return { success: false, error: "Não foi possível obter diagnóstico do agente" };
  }
};





// Imprimir via ROTUTX RAW (bytes exatos do Fórmula Certa direto do banco → agente /raw)
export const imprimirViaRotutxRaw = async (
  serverUrl: string,
  nrRequisicao: string,
  serie: string,
  impressora: string,
  agentUrl: string,
  filial?: string,
): Promise<ApiResponse<{ message: string; tamanho_bytes?: number }>> => {
  try {
    // Passo 1: Buscar ROTUTX raw do banco via servidor
    const response = await fetch(`${serverUrl}/api/rotutx-raw`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ req: parseInt(nrRequisicao), filial: filial ? parseInt(filial) : 1, item: serie }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || "Falha ao buscar ROTUTX" };
    }

    const rotutxData = await response.json();
    if (!rotutxData.success || !rotutxData.dados_base64) {
      return { success: false, error: "ROTUTX não encontrado ou vazio" };
    }

    console.log(`[RAW] ROTUTX obtido: ${rotutxData.tamanho_bytes} bytes, modelo: ${rotutxData.tipo_modelo}`);
    console.log(`[RAW] Preview: ${rotutxData.preview?.substring(0, 100)}`);

    // Passo 2: Enviar bytes RAW direto para o agente via /raw
    const agentResponse = await fetch(`${agentUrl}/raw`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({
        impressora,
        dados_base64: rotutxData.dados_base64,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!agentResponse.ok) {
      const errorData = await agentResponse.json().catch(() => ({}));
      return { success: false, error: `Agente: ${errorData.error || 'Falha ao enviar RAW'}` };
    }

    const agentResult = await agentResponse.json();
    return {
      success: agentResult.success,
      data: {
        message: `ROTUTX RAW enviado! ${rotutxData.tamanho_bytes} bytes → impressora`,
        tamanho_bytes: rotutxData.tamanho_bytes,
      },
    };
  } catch (error) {
    console.error("[PrintAgent] Erro ao imprimir via ROTUTX RAW:", error);
    return { success: false, error: "Não foi possível imprimir via ROTUTX RAW" };
  }
};

// Imprimir via ROTUTX (método antigo - servidor envia para agente)
export const imprimirViaRotutx = async (
  serverUrl: string,
  nrRequisicao: string,
  filial: string,
  serie: string,
  item: string,
  impressora: string,
  agentUrl: string,
  calibracao?: PrinterCalibrationConfig
): Promise<ApiResponse<{ message: string }>> => {
  try {
    const response = await fetch(`${serverUrl}/api/imprimir-fc-v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({
        req: parseInt(nrRequisicao),
        filial: parseInt(filial),
        serie,
        item: parseInt(item),
        impressora,
        agente_url: agentUrl,
        calibracao: calibracao || {},
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 404) {
        return { success: false, error: "ROTUTX_NOT_FOUND" };
      }
      return { success: false, error: errorData.error || "Falha na impressão via ROTUTX" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("[PrintAgent] Erro ao imprimir via ROTUTX:", error);
    return { success: false, error: "Não foi possível imprimir via ROTUTX" };
  }
};

// Teste PPLA Direto - envia comandos PPLA capturados do Fórmula Certa direto para a impressora
export const testePplaDireto = async (
  url: string,
  impressora: string,
  pplaTexto: string
): Promise<ApiResponse<{ message: string; blocos: number; bytes_enviados: number }>> => {
  try {
    const response = await fetch(`${url}/teste-ppla-direto`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ impressora, ppla: pplaTexto }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || "Falha no teste PPLA direto" };
    }

    const data = await response.json();
    return { success: data.success, data };
  } catch (error) {
    console.error("[PrintAgent] Erro no teste PPLA direto:", error);
    return { success: false, error: "Não foi possível enviar PPLA direto para o agente" };
  }
};

export const imprimirViaAgente = async (
  config: PrintAgentConfig,
  rotulos: RotuloItem[],
  layoutTipo: string,
  farmacia: { nome: string; farmaceutico: string; crf: string }
): Promise<ApiResponse<{ impressos: number; erros?: string[] }>> => {
  try {
    const calibracao: PrinterCalibrationConfig = config.calibracao || {
      margem_c: 0,
      offset_r: -500,
      contraste: 12,
      fonte: 2,
      rotacao: 0,
      modo: 'dots',
    };

    const lineSpacingFactor = parseFloat(localStorage.getItem('label_editor_line_spacing') || '1.0') || 1.0;

    const payload = {
      impressora: config.impressora,
      layout_tipo: layoutTipo,
      farmacia,
      calibracao,
      rotulos: rotulos.map(r => ({
        id: r.id,
        nrRequisicao: r.nrRequisicao,
        nrItem: r.nrItem,
        nomePaciente: r.nomePaciente,
        nomeMedico: r.nomeMedico,
        prefixoCRM: String(r.prefixoCRM || ''),
        numeroCRM: String(r.numeroCRM || ''),
        ufCRM: String(r.ufCRM || ''),
        formula: r.formula,
        dataFabricacao: r.dataFabricacao,
        dataValidade: r.dataValidade,
        numeroRegistro: r.numeroRegistro,
        posologia: r.posologia,
        tipoUso: r.tipoUso,
        volume: r.volume,
        unidadeVolume: r.unidadeVolume,
        observacoes: r.observacoes,
        lote: r.lote,
        aplicacao: r.aplicacao,
        contem: r.contem,
        ph: r.ph,
        quantidade: r.quantidade,
        composicao: r.composicao,
        descricaoProduto: r.descricaoProduto,
        textoLivre: r.textoLivre,
        lineSpacingFactor: r.lineSpacingFactor ?? lineSpacingFactor,
        tipoItem: r.tipoItem,
        componentes: r.componentes,
      })),
    };

    const response = await fetch(`${config.agentUrl}/imprimir`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || "Falha na impressão via agente" };
    }

    const data = await response.json();
    return { 
      success: data.success, 
      data: { impressos: data.impressos || rotulos.length, erros: data.erros } 
    };
  } catch (error) {
    console.error("[PrintAgent] Erro ao imprimir via agente:", error);
    return { success: false, error: "Não foi possível enviar rótulos para o agente de impressão" };
  }
};
