import { getApiConfig } from "@/config/api";
import { Requisicao } from "@/types/requisicao";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const buscarRequisicao = async (numeroRequisicao: string): Promise<ApiResponse<Requisicao[]>> => {
  const config = getApiConfig();
  
  try {
    const response = await fetch(`${config.serverUrl}/api/requisicao/${numeroRequisicao}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
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
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
};
