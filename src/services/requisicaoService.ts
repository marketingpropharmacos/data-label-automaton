import { getApiConfig } from "@/config/api";
import { Requisicao } from "@/types/requisicao";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Mapeia resposta da API para o formato da interface Requisicao
const mapearRequisicao = (data: any, index: number): Requisicao => ({
  id: data.id || data.nrRequisicao || String(index + 1),
  nrRequisicao: data.nrRequisicao || "",
  nomePaciente: data.nomePaciente || "",
  prefixoCRM: data.prefixoCRM || "",
  numeroCRM: data.numeroCRM || "",
  ufCRM: data.ufCRM || "",
  formula: data.formula || "",
  dataFabricacao: data.dataFabricacao || "",
  dataValidade: data.dataValidade || "",
  numeroRegistro: data.numeroRegistro || "",
  posologia: data.posologia || "",
  tipoUso: data.tipoUso || "",
  volume: data.volume || "",
  unidadeVolume: data.unidadeVolume || "",
  observacoes: data.observacoes || "",
});

export const buscarRequisicao = async (numeroRequisicao: string): Promise<ApiResponse<Requisicao[]>> => {
  const config = getApiConfig();
  
  try {
    const response = await fetch(`${config.serverUrl}/api/requisicao/${numeroRequisicao}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    
    // API pode retornar array ou objeto único
    const requisicoes = Array.isArray(data) ? data : [data];
    const mappedData = requisicoes.map((item, index) => mapearRequisicao(item, index));
    
    return { success: true, data: mappedData };
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
