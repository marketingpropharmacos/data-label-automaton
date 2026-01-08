import { getApiConfig } from "@/config/api";
import { RotuloItem } from "@/types/requisicao";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

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
    const rotulos = formulas.map(mapearRotulo);
    
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
