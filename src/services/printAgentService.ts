import { PrintAgentConfig, RotuloItem } from "@/types/requisicao";

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

// Imprimir rótulos via agente HTTP
export const imprimirViaAgente = async (
  config: PrintAgentConfig,
  rotulos: RotuloItem[],
  layoutTipo: string,
  farmacia: { nome: string; farmaceutico: string; crf: string }
): Promise<ApiResponse<{ impressos: number; erros?: string[] }>> => {
  try {
    const payload = {
      impressora: config.impressora,
      layout_tipo: layoutTipo,
      farmacia,
      rotulos: rotulos.map(r => ({
        id: r.id,
        nrRequisicao: r.nrRequisicao,
        nrItem: r.nrItem,
        nomePaciente: r.nomePaciente,
        nomeMedico: r.nomeMedico,
        prefixoCRM: r.prefixoCRM,
        numeroCRM: r.numeroCRM,
        ufCRM: r.ufCRM,
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
      })),
    };

    const response = await fetch(`${config.agentUrl}/imprimir`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
