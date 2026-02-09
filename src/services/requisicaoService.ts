import { getApiConfig } from "@/config/api";
import { RotuloItem } from "@/types/requisicao";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Mapeia componente de kit
const mapearComponenteKit = (comp: any) => ({
  codigo: comp.codigo || "",
  nome: comp.nome || "",
  ph: comp.ph || "",
  lote: comp.lote || "",
  fabricacao: comp.fabricacao || "",
  validade: comp.validade || "",
  composicao: comp.composicao || "",
  aplicacao: comp.aplicacao || "",
});

// Mapeia cada fórmula da API para um rótulo
const mapearRotulo = (data: any): RotuloItem => ({
  id: data.id || `${data.nrRequisicao}-${data.nrItem || '0'}`,
  nrRequisicao: data.nrRequisicao || "",
  nrItem: data.nrItem || "0",
  nomePaciente: data.nomePaciente || "",
  prefixoCRM: data.prefixoCRM || "",
  numeroCRM: data.numeroCRM || "",
  ufCRM: data.ufCRM || "",
  nomeMedico: data.nomeMedico || "",
  formula: data.formula || "",
  dataFabricacao: data.dataFabricacao || "",
  dataValidade: data.dataValidade || "",
  numeroRegistro: data.numeroRegistro || "",
  posologia: data.posologia || "",
  tipoUso: data.tipoUso || "",
  volume: data.volume || "",
  unidadeVolume: data.unidadeVolume || "",
  observacoes: data.observacoes || "",
  lote: data.lote || "",
  aplicacao: data.aplicacao || "",
  contem: data.contem || "",
  ph: data.ph || "",
  quantidade: data.quantidade || "",
  composicao: data.composicao || "",
  descricaoProduto: data.descricaoProduto || "",
  // Novos campos para suporte a kits
  tipoItem: data.tipoItem || undefined,
  eSinonimo: data.eSinonimo || false,
  componentes: data.componentes ? data.componentes.map(mapearComponenteKit) : undefined,
});

export const buscarRequisicao = async (numeroRequisicao: string): Promise<ApiResponse<RotuloItem[]>> => {
  const config = getApiConfig();
  
  try {
    const response = await fetch(
      `${config.serverUrl}/api/requisicao/${numeroRequisicao}?filial=${config.codigoFilial}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || "Erro ao buscar requisição");
    }
    
    // API agora retorna array de fórmulas diretamente
    const rawData = result.data;
    const formulas = Array.isArray(rawData) ? rawData : [rawData];
    
    // DEBUG: Log dos dados brutos recebidos do backend
    console.log("[DEBUG] Dados brutos do backend:", formulas);
    formulas.forEach((item, idx) => {
      console.log(`[DEBUG] Item ${idx}: tipoItem=${item.tipoItem}, aplicacao="${item.aplicacao}", composicao="${item.composicao}"`);
    });
    
    // Mapeia cada fórmula preservando o nrItem original do backend
    const rotulos = formulas.map((item, index) => {
      const rotulo = mapearRotulo(item);
      // ID único para React (combina requisição, nrItem original e lote)
      rotulo.id = `${rotulo.nrRequisicao}-${rotulo.nrItem}-${rotulo.lote || index}`;
      // MANTÉM o nrItem original do backend (não sobrescreve!)
      
      // DEBUG: Log do rótulo mapeado
      console.log(`[DEBUG] Rótulo mapeado ${index}: tipoItem=${rotulo.tipoItem}, componentes=${rotulo.componentes?.length || 0}`);
      return rotulo;
    });
    
    return { success: true, data: rotulos };
  } catch (error) {
    console.error("Erro ao buscar requisição:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erro desconhecido ao conectar com o servidor" 
    };
  }
};

export const verificarConexao = async (): Promise<boolean> => {
  const config = getApiConfig();
  
  try {
    const response = await fetch(`${config.serverUrl}/api/health`, {
      method: "GET",
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
};

// ============================================
// FUNÇÕES DE IMPRESSÃO
// ============================================

export const verificarImpressora = async (caminho: string): Promise<ApiResponse<{ message: string }>> => {
  const config = getApiConfig();
  
  try {
    const response = await fetch(`${config.serverUrl}/api/verificar-impressora`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ caminho }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao verificar impressora",
    };
  }
};

export const imprimirTeste = async (caminho: string): Promise<ApiResponse<{ message: string }>> => {
  const config = getApiConfig();
  
  try {
    const response = await fetch(`${config.serverUrl}/api/imprimir-teste`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ caminho }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao imprimir teste",
    };
  }
};

export const imprimirRotulos = async (
  caminho: string,
  rotulos: RotuloItem[],
  layoutTipo: string,
  farmacia: { nome: string; farmaceutico: string; crf: string }
): Promise<ApiResponse<{ impressos: number; erros?: string[] }>> => {
  const config = getApiConfig();
  
  try {
    const response = await fetch(`${config.serverUrl}/api/imprimir`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({
        caminho,
        rotulos,
        layoutTipo,
        farmacia,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao imprimir rótulos",
    };
  }
};
