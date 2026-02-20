export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      dim_laboratorio: {
        Row: {
          ativo: boolean
          created_at: string
          id_laboratorio: number
          id_loja_vinculada: number | null
          nome_laboratorio: string
          tipo: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id_laboratorio?: number
          id_loja_vinculada?: number | null
          nome_laboratorio: string
          tipo: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id_laboratorio?: number
          id_loja_vinculada?: number | null
          nome_laboratorio?: string
          tipo?: string
        }
        Relationships: []
      }
      dim_loja: {
        Row: {
          ativa: boolean
          created_at: string
          grupo: string
          loja_id: number
          loja_nome: string | null
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          grupo: string
          loja_id: number
          loja_nome?: string | null
        }
        Update: {
          ativa?: boolean
          created_at?: string
          grupo?: string
          loja_id?: number
          loja_nome?: string | null
        }
        Relationships: []
      }
      dim_planocontas: {
        Row: {
          caminho: string | null
          entra_dre: boolean
          folha: boolean | null
          natureza: string | null
          nome: string | null
          planocontas_id: number
          planocontaspaiid: number | null
          profundidade: number | null
          tipo: string | null
          tiporesultado: string | null
          updated_at: string
        }
        Insert: {
          caminho?: string | null
          entra_dre?: boolean
          folha?: boolean | null
          natureza?: string | null
          nome?: string | null
          planocontas_id: number
          planocontaspaiid?: number | null
          profundidade?: number | null
          tipo?: string | null
          tiporesultado?: string | null
          updated_at?: string
        }
        Update: {
          caminho?: string | null
          entra_dre?: boolean
          folha?: boolean | null
          natureza?: string | null
          nome?: string | null
          planocontas_id?: number
          planocontaspaiid?: number | null
          profundidade?: number | null
          tipo?: string | null
          tiporesultado?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      f_cmv_manipulados: {
        Row: {
          created_at: string
          custo_perdas_rateadas: number
          custo_total_final: number
          custo_total_insumos: number
          data: string
          id: number
          id_laboratorio: number
          id_loja_venda: number | null
        }
        Insert: {
          created_at?: string
          custo_perdas_rateadas?: number
          custo_total_final?: number
          custo_total_insumos?: number
          data: string
          id?: number
          id_laboratorio: number
          id_loja_venda?: number | null
        }
        Update: {
          created_at?: string
          custo_perdas_rateadas?: number
          custo_total_final?: number
          custo_total_insumos?: number
          data?: string
          id?: number
          id_laboratorio?: number
          id_loja_venda?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "f_cmv_manipulados_id_laboratorio_fkey"
            columns: ["id_laboratorio"]
            isOneToOne: false
            referencedRelation: "dim_laboratorio"
            referencedColumns: ["id_laboratorio"]
          },
        ]
      }
      f_dre_oficial: {
        Row: {
          ano: number
          categoria_dre: string
          created_at: string
          id: number
          id_laboratorio: number | null
          id_loja: number | null
          mes: number
          origem_dado: string
          valor: number
        }
        Insert: {
          ano: number
          categoria_dre: string
          created_at?: string
          id?: number
          id_laboratorio?: number | null
          id_loja?: number | null
          mes: number
          origem_dado: string
          valor?: number
        }
        Update: {
          ano?: number
          categoria_dre?: string
          created_at?: string
          id?: number
          id_laboratorio?: number | null
          id_loja?: number | null
          mes?: number
          origem_dado?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "f_dre_oficial_id_laboratorio_fkey"
            columns: ["id_laboratorio"]
            isOneToOne: false
            referencedRelation: "dim_laboratorio"
            referencedColumns: ["id_laboratorio"]
          },
        ]
      }
      f_mov_estoque_classificada: {
        Row: {
          alpha7_mov_id: number
          baixaestoque_motivoid: number | null
          baixaestoque_observacao: string | null
          categoria_dre_estoque: string | null
          codigo: string | null
          custo: number | null
          customedio: number | null
          datahora: string | null
          descricao_tipo: string | null
          entrada: boolean | null
          etl_loaded_at: string | null
          impacta_dre: boolean | null
          impacta_saldo_estoque: boolean | null
          natureza_estoque: string | null
          perdas_detalhe: string | null
          perdas_subtipo: string | null
          perdas_titulo: string | null
          qtd_sinalizada: number | null
          quantidade: number | null
          tipomovimentacaoestoqueid: number | null
          unidadenegocioid_destino: number | null
          unidadenegocioid_origem: number | null
          valor_cmv_sinalizado: number | null
        }
        Insert: {
          alpha7_mov_id: number
          baixaestoque_motivoid?: number | null
          baixaestoque_observacao?: string | null
          categoria_dre_estoque?: string | null
          codigo?: string | null
          custo?: number | null
          customedio?: number | null
          datahora?: string | null
          descricao_tipo?: string | null
          entrada?: boolean | null
          etl_loaded_at?: string | null
          impacta_dre?: boolean | null
          impacta_saldo_estoque?: boolean | null
          natureza_estoque?: string | null
          perdas_detalhe?: string | null
          perdas_subtipo?: string | null
          perdas_titulo?: string | null
          qtd_sinalizada?: number | null
          quantidade?: number | null
          tipomovimentacaoestoqueid?: number | null
          unidadenegocioid_destino?: number | null
          unidadenegocioid_origem?: number | null
          valor_cmv_sinalizado?: number | null
        }
        Update: {
          alpha7_mov_id?: number
          baixaestoque_motivoid?: number | null
          baixaestoque_observacao?: string | null
          categoria_dre_estoque?: string | null
          codigo?: string | null
          custo?: number | null
          customedio?: number | null
          datahora?: string | null
          descricao_tipo?: string | null
          entrada?: boolean | null
          etl_loaded_at?: string | null
          impacta_dre?: boolean | null
          impacta_saldo_estoque?: boolean | null
          natureza_estoque?: string | null
          perdas_detalhe?: string | null
          perdas_subtipo?: string | null
          perdas_titulo?: string | null
          qtd_sinalizada?: number | null
          quantidade?: number | null
          tipomovimentacaoestoqueid?: number | null
          unidadenegocioid_destino?: number | null
          unidadenegocioid_origem?: number | null
          valor_cmv_sinalizado?: number | null
        }
        Relationships: []
      }
      f_perdas_baixa: {
        Row: {
          alpha7_mov_id: number
          baixa_status: string | null
          baixaestoqueid: number | null
          customedio: number | null
          datahora: string | null
          item_status: string | null
          loaded_at: string | null
          motivoid: number | null
          observacao: string | null
          perdas_detalhe: string | null
          perdas_subtipo: string | null
          perdas_titulo: string | null
          quantidade: number | null
          unidadenegocioid: number | null
          valor_estimado: number | null
        }
        Insert: {
          alpha7_mov_id: number
          baixa_status?: string | null
          baixaestoqueid?: number | null
          customedio?: number | null
          datahora?: string | null
          item_status?: string | null
          loaded_at?: string | null
          motivoid?: number | null
          observacao?: string | null
          perdas_detalhe?: string | null
          perdas_subtipo?: string | null
          perdas_titulo?: string | null
          quantidade?: number | null
          unidadenegocioid?: number | null
          valor_estimado?: number | null
        }
        Update: {
          alpha7_mov_id?: number
          baixa_status?: string | null
          baixaestoqueid?: number | null
          customedio?: number | null
          datahora?: string | null
          item_status?: string | null
          loaded_at?: string | null
          motivoid?: number | null
          observacao?: string | null
          perdas_detalhe?: string | null
          perdas_subtipo?: string | null
          perdas_titulo?: string | null
          quantidade?: number | null
          unidadenegocioid?: number | null
          valor_estimado?: number | null
        }
        Relationships: []
      }
      f_vendas_itens: {
        Row: {
          cfop: string | null
          chave_acesso: string | null
          created_at: string
          data_emissao: string
          descricao_produto: string | null
          id: number
          id_embalagem: number | null
          id_laboratorio_origem: number | null
          id_loja: number | null
          id_venda: string
          numero_documento: string | null
          origem_dado: string
          quantidade: number
          tipo_documento: string | null
          tipo_produto: string
          valor_bruto: number
          valor_liquido: number
          valor_total: number
        }
        Insert: {
          cfop?: string | null
          chave_acesso?: string | null
          created_at?: string
          data_emissao: string
          descricao_produto?: string | null
          id?: number
          id_embalagem?: number | null
          id_laboratorio_origem?: number | null
          id_loja?: number | null
          id_venda: string
          numero_documento?: string | null
          origem_dado?: string
          quantidade?: number
          tipo_documento?: string | null
          tipo_produto: string
          valor_bruto?: number
          valor_liquido?: number
          valor_total?: number
        }
        Update: {
          cfop?: string | null
          chave_acesso?: string | null
          created_at?: string
          data_emissao?: string
          descricao_produto?: string | null
          id?: number
          id_embalagem?: number | null
          id_laboratorio_origem?: number | null
          id_loja?: number | null
          id_venda?: string
          numero_documento?: string | null
          origem_dado?: string
          quantidade?: number
          tipo_documento?: string | null
          tipo_produto?: string
          valor_bruto?: number
          valor_liquido?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "f_vendas_itens_id_laboratorio_origem_fkey"
            columns: ["id_laboratorio_origem"]
            isOneToOne: false
            referencedRelation: "dim_laboratorio"
            referencedColumns: ["id_laboratorio"]
          },
        ]
      }
      gerencial_lancamentos_ajuste: {
        Row: {
          categoria: string
          competencia: string
          created_at: string | null
          descricao: string | null
          id: number
          loja_id: number | null
          origem: string | null
          tipo: string
          valor: number
        }
        Insert: {
          categoria: string
          competencia: string
          created_at?: string | null
          descricao?: string | null
          id?: number
          loja_id?: number | null
          origem?: string | null
          tipo: string
          valor: number
        }
        Update: {
          categoria?: string
          competencia?: string
          created_at?: string | null
          descricao?: string | null
          id?: number
          loja_id?: number | null
          origem?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: []
      }
      in_itempedido: {
        Row: {
          created_at: string
          i_codigointegracao: string
          i_codigopedidointegracao: string
          i_idoutembalagem: number
          i_quantidade: number
          i_valortotal: number
          i_valorunitariobruto: number
          i_valorunitarioliquido: number
        }
        Insert: {
          created_at?: string
          i_codigointegracao: string
          i_codigopedidointegracao: string
          i_idoutembalagem: number
          i_quantidade: number
          i_valortotal: number
          i_valorunitariobruto: number
          i_valorunitarioliquido: number
        }
        Update: {
          created_at?: string
          i_codigointegracao?: string
          i_codigopedidointegracao?: string
          i_idoutembalagem?: number
          i_quantidade?: number
          i_valortotal?: number
          i_valorunitariobruto?: number
          i_valorunitarioliquido?: number
        }
        Relationships: []
      }
      map_baixa_motivo_subtipo: {
        Row: {
          categoria_dre_override: string | null
          comentario: string | null
          motivoid: number
          perdas_subtipo: string
          updated_at: string | null
        }
        Insert: {
          categoria_dre_override?: string | null
          comentario?: string | null
          motivoid: number
          perdas_subtipo: string
          updated_at?: string | null
        }
        Update: {
          categoria_dre_override?: string | null
          comentario?: string | null
          motivoid?: number
          perdas_subtipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      map_perdas_subtipo: {
        Row: {
          codigo: string
          perdas_detalhe_padrao: string | null
          perdas_subtipo: string
          status: string
          updated_at: string | null
        }
        Insert: {
          codigo: string
          perdas_detalhe_padrao?: string | null
          perdas_subtipo: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          codigo?: string
          perdas_detalhe_padrao?: string | null
          perdas_subtipo?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      map_tipo_mov_estoque: {
        Row: {
          categoria_dre_estoque: string
          codigo: string
          descricao: string | null
          impacta_dre: boolean
          impacta_saldo_estoque: boolean
          natureza_estoque: string
          observacao_regra: string | null
          sinal_quantidade: number
          sinal_valor_cmv: number
          status_mapeamento: string
          validado_em: string | null
        }
        Insert: {
          categoria_dre_estoque: string
          codigo: string
          descricao?: string | null
          impacta_dre: boolean
          impacta_saldo_estoque: boolean
          natureza_estoque: string
          observacao_regra?: string | null
          sinal_quantidade: number
          sinal_valor_cmv: number
          status_mapeamento?: string
          validado_em?: string | null
        }
        Update: {
          categoria_dre_estoque?: string
          codigo?: string
          descricao?: string | null
          impacta_dre?: boolean
          impacta_saldo_estoque?: boolean
          natureza_estoque?: string
          observacao_regra?: string | null
          sinal_quantidade?: number
          sinal_valor_cmv?: number
          status_mapeamento?: string
          validado_em?: string | null
        }
        Relationships: []
      }
      orcamento_rateio_loja: {
        Row: {
          ano: number
          created_at: string | null
          loja_id: number
          mes: number
          updated_at: string | null
          valor_rateio: number
        }
        Insert: {
          ano: number
          created_at?: string | null
          loja_id: number
          mes: number
          updated_at?: string | null
          valor_rateio: number
        }
        Update: {
          ano?: number
          created_at?: string | null
          loja_id?: number
          mes?: number
          updated_at?: string | null
          valor_rateio?: number
        }
        Relationships: []
      }
      out_documentofiscalpedido: {
        Row: {
          created_at: string
          io_integracaoconcluida: boolean
          o_cfop: string | null
          o_chaveacesso: string | null
          o_codigopedidointegracao: string | null
          o_datahoraemissao: string | null
          o_id: number
          o_numero: string | null
          o_serie: string | null
          o_tipodocumento: string | null
          o_valorprodutos: number | null
          o_valortotal: number | null
        }
        Insert: {
          created_at?: string
          io_integracaoconcluida?: boolean
          o_cfop?: string | null
          o_chaveacesso?: string | null
          o_codigopedidointegracao?: string | null
          o_datahoraemissao?: string | null
          o_id: number
          o_numero?: string | null
          o_serie?: string | null
          o_tipodocumento?: string | null
          o_valorprodutos?: number | null
          o_valortotal?: number | null
        }
        Update: {
          created_at?: string
          io_integracaoconcluida?: boolean
          o_cfop?: string | null
          o_chaveacesso?: string | null
          o_codigopedidointegracao?: string | null
          o_datahoraemissao?: string | null
          o_id?: number
          o_numero?: string | null
          o_serie?: string | null
          o_tipodocumento?: string | null
          o_valorprodutos?: number | null
          o_valortotal?: number | null
        }
        Relationships: []
      }
      out_embalagem: {
        Row: {
          created_at: string
          io_integracaoconcluida: boolean
          o_caminhoclassificacao: string | null
          o_codigobarras: string | null
          o_descricao: string | null
          o_id: number
          o_idclassificacao: number | null
          o_nomeclassificacaoprimeironivel: string | null
          o_nomeclassificacaosegundonivel: string | null
          o_nomeclassificacaoterceironivel: string | null
        }
        Insert: {
          created_at?: string
          io_integracaoconcluida?: boolean
          o_caminhoclassificacao?: string | null
          o_codigobarras?: string | null
          o_descricao?: string | null
          o_id: number
          o_idclassificacao?: number | null
          o_nomeclassificacaoprimeironivel?: string | null
          o_nomeclassificacaosegundonivel?: string | null
          o_nomeclassificacaoterceironivel?: string | null
        }
        Update: {
          created_at?: string
          io_integracaoconcluida?: boolean
          o_caminhoclassificacao?: string | null
          o_codigobarras?: string | null
          o_descricao?: string | null
          o_id?: number
          o_idclassificacao?: number | null
          o_nomeclassificacaoprimeironivel?: string | null
          o_nomeclassificacaosegundonivel?: string | null
          o_nomeclassificacaoterceironivel?: string | null
        }
        Relationships: []
      }
      planejamento_dre: {
        Row: {
          ano: number
          categoria: string
          created_at: string | null
          id: number
          loja_id: number
          mes: number
          valor: number
        }
        Insert: {
          ano?: number
          categoria: string
          created_at?: string | null
          id?: never
          loja_id: number
          mes: number
          valor?: number
        }
        Update: {
          ano?: number
          categoria?: string
          created_at?: string | null
          id?: never
          loja_id?: number
          mes?: number
          valor?: number
        }
        Relationships: []
      }
      raw_alpha_cmv_diario: {
        Row: {
          competencia: string
          created_at: string
          fonte: string
          id: number
          loja_id: number
          valor_cmv: number
        }
        Insert: {
          competencia: string
          created_at?: string
          fonte?: string
          id?: number
          loja_id: number
          valor_cmv: number
        }
        Update: {
          competencia?: string
          created_at?: string
          fonte?: string
          id?: number
          loja_id?: number
          valor_cmv?: number
        }
        Relationships: []
      }
      raw_alpha_cmv_diario_tipo: {
        Row: {
          competencia: string
          created_at: string
          fonte: string
          id: number
          is_manipulado: boolean
          loja_id: number
          valor_cmv: number
        }
        Insert: {
          competencia: string
          created_at?: string
          fonte?: string
          id?: number
          is_manipulado: boolean
          loja_id: number
          valor_cmv: number
        }
        Update: {
          competencia?: string
          created_at?: string
          fonte?: string
          id?: number
          is_manipulado?: boolean
          loja_id?: number
          valor_cmv?: number
        }
        Relationships: []
      }
      raw_alpha_dre_receita_diaria: {
        Row: {
          competencia: string
          created_at: string
          fonte: string
          id: number
          loja_id: number
          valor_receita_bruta: number
        }
        Insert: {
          competencia: string
          created_at?: string
          fonte?: string
          id?: number
          loja_id: number
          valor_receita_bruta: number
        }
        Update: {
          competencia?: string
          created_at?: string
          fonte?: string
          id?: number
          loja_id?: number
          valor_receita_bruta?: number
        }
        Relationships: []
      }
      raw_alpha_dre_receita_diaria_tipo: {
        Row: {
          competencia: string
          created_at: string
          fonte: string
          id: number
          is_manipulado: boolean
          loja_id: number
          valor_receita: number
        }
        Insert: {
          competencia: string
          created_at?: string
          fonte?: string
          id?: number
          is_manipulado: boolean
          loja_id: number
          valor_receita: number
        }
        Update: {
          competencia?: string
          created_at?: string
          fonte?: string
          id?: number
          is_manipulado?: boolean
          loja_id?: number
          valor_receita?: number
        }
        Relationships: []
      }
      raw_alpha_produto_classificacao: {
        Row: {
          classificacao_caminho: string | null
          classificacao_id: number | null
          created_at: string
          is_manipulado: boolean
          produto_id: number
        }
        Insert: {
          classificacao_caminho?: string | null
          classificacao_id?: number | null
          created_at?: string
          is_manipulado: boolean
          produto_id: number
        }
        Update: {
          classificacao_caminho?: string | null
          classificacao_id?: number | null
          created_at?: string
          is_manipulado?: boolean
          produto_id?: number
        }
        Relationships: []
      }
      raw_alpha_settlement_diario: {
        Row: {
          competencia: string
          created_at: string
          extra_json: Json | null
          fonte: string
          formapagamento_id: number
          formapagamento_nome: string | null
          formapagamento_tipo: string | null
          id: number
          loja_id: number
          valor: number
        }
        Insert: {
          competencia: string
          created_at?: string
          extra_json?: Json | null
          fonte?: string
          formapagamento_id: number
          formapagamento_nome?: string | null
          formapagamento_tipo?: string | null
          id?: number
          loja_id: number
          valor: number
        }
        Update: {
          competencia?: string
          created_at?: string
          extra_json?: Json | null
          fonte?: string
          formapagamento_id?: number
          formapagamento_nome?: string | null
          formapagamento_tipo?: string | null
          id?: number
          loja_id?: number
          valor?: number
        }
        Relationships: []
      }
      raw_alpha_unidade_negocio: {
        Row: {
          created_at: string
          loja_id: number
          nome: string | null
        }
        Insert: {
          created_at?: string
          loja_id: number
          nome?: string | null
        }
        Update: {
          created_at?: string
          loja_id?: number
          nome?: string | null
        }
        Relationships: []
      }
      raw_alpha_vendas: {
        Row: {
          competencia: string
          created_at: string | null
          data_emissao: string | null
          id: number
          loja_id: number
          numero_documento: string | null
          settlement_method: string | null
          valor_total: number | null
        }
        Insert: {
          competencia: string
          created_at?: string | null
          data_emissao?: string | null
          id?: number
          loja_id: number
          numero_documento?: string | null
          settlement_method?: string | null
          valor_total?: number | null
        }
        Update: {
          competencia?: string
          created_at?: string | null
          data_emissao?: string | null
          id?: number
          loja_id?: number
          numero_documento?: string | null
          settlement_method?: string | null
          valor_total?: number | null
        }
        Relationships: []
      }
      raw_healthcheck: {
        Row: {
          alpha_now: string | null
          created_at: string
          id: number
          source: string
        }
        Insert: {
          alpha_now?: string | null
          created_at?: string
          id?: number
          source: string
        }
        Update: {
          alpha_now?: string | null
          created_at?: string
          id?: number
          source?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_dre_estoque_diario: {
        Row: {
          categoria_dre_estoque: string | null
          dia: string | null
          qtd_movimentos: number | null
          valor_cmv: number | null
          valor_estimado_perdas_ou_ajuste: number | null
        }
        Relationships: []
      }
      v_dre_estoque_mensal: {
        Row: {
          categoria_dre_estoque: string | null
          mes: string | null
          qtd_movimentos: number | null
          valor_cmv: number | null
          valor_estimado_perdas_ou_ajuste: number | null
        }
        Relationships: []
      }
      v_dre_gerencial: {
        Row: {
          cmv_manipulado_real: number | null
          cmv_revenda: number | null
          cmv_total: number | null
          despesas_operacionais_loja: number | null
          impostos_sobre_vendas: number | null
          margem_servicos: number | null
          mes: string | null
          perdas_operacionais: number | null
          rateio_empreendimento: number | null
          rateio_marketing: number | null
          receita_bruta: number | null
          receita_liquida: number | null
          resultado_operacional: number | null
          unidade_id: number | null
          vale_compra: number | null
          verba_fornecedor: number | null
        }
        Relationships: []
      }
      v_dre_perdas_operacionais: {
        Row: {
          mes: string | null
          unidade: number | null
          valor_perdas: number | null
        }
        Relationships: []
      }
      v_dre_perdas_operacionais_v2: {
        Row: {
          mes: string | null
          perdas_subtipo: string | null
          unidade_id: number | null
          valor: number | null
        }
        Relationships: []
      }
      v_perdas_operacionais: {
        Row: {
          codigo: string | null
          mes: string | null
          perdas_subtipo: string | null
          qtd_linhas: number | null
          unidade_id: number | null
          valor_total: number | null
        }
        Relationships: []
      }
      v_perdas_operacionais_detalhe: {
        Row: {
          alpha7_mov_id: number | null
          baixaestoque_motivoid: number | null
          baixaestoque_observacao: string | null
          codigo: string | null
          custo: number | null
          customedio: number | null
          datahora: string | null
          descricao_tipo: string | null
          entrada: boolean | null
          etl_loaded_at: string | null
          perdas_detalhe: string | null
          perdas_subtipo: string | null
          perdas_titulo: string | null
          quantidade: number | null
          tipomovimentacaoestoqueid: number | null
          unidade_id: number | null
          unidadenegocioid_destino: number | null
          unidadenegocioid_origem: number | null
          valor_estimado: number | null
        }
        Insert: {
          alpha7_mov_id?: number | null
          baixaestoque_motivoid?: number | null
          baixaestoque_observacao?: string | null
          codigo?: string | null
          custo?: number | null
          customedio?: number | null
          datahora?: string | null
          descricao_tipo?: string | null
          entrada?: boolean | null
          etl_loaded_at?: string | null
          perdas_detalhe?: string | null
          perdas_subtipo?: never
          perdas_titulo?: string | null
          quantidade?: number | null
          tipomovimentacaoestoqueid?: number | null
          unidade_id?: never
          unidadenegocioid_destino?: number | null
          unidadenegocioid_origem?: number | null
          valor_estimado?: never
        }
        Update: {
          alpha7_mov_id?: number | null
          baixaestoque_motivoid?: number | null
          baixaestoque_observacao?: string | null
          codigo?: string | null
          custo?: number | null
          customedio?: number | null
          datahora?: string | null
          descricao_tipo?: string | null
          entrada?: boolean | null
          etl_loaded_at?: string | null
          perdas_detalhe?: string | null
          perdas_subtipo?: never
          perdas_titulo?: string | null
          quantidade?: number | null
          tipomovimentacaoestoqueid?: number | null
          unidade_id?: never
          unidadenegocioid_destino?: number | null
          unidadenegocioid_origem?: number | null
          valor_estimado?: never
        }
        Relationships: []
      }
      v_perdas_operacionais_mensal: {
        Row: {
          mes: string | null
          perdas_subtipo: string | null
          qtd_mov: number | null
          valor_estimado: number | null
        }
        Relationships: []
      }
      v_raw_alpha_vendas_validas: {
        Row: {
          competencia: string | null
          created_at: string | null
          data_emissao: string | null
          id: number | null
          loja_id: number | null
          numero_documento: string | null
          settlement_method: string | null
          valor_total: number | null
        }
        Insert: {
          competencia?: string | null
          created_at?: string | null
          data_emissao?: string | null
          id?: number | null
          loja_id?: number | null
          numero_documento?: string | null
          settlement_method?: string | null
          valor_total?: number | null
        }
        Update: {
          competencia?: string | null
          created_at?: string | null
          data_emissao?: string | null
          id?: number | null
          loja_id?: number | null
          numero_documento?: string | null
          settlement_method?: string | null
          valor_total?: number | null
        }
        Relationships: []
      }
      v_vendas_documentos: {
        Row: {
          data_emissao: string | null
          id_loja: number | null
          id_venda: string | null
          numero_documento: string | null
          settlement_method: string | null
          valor_total: number | null
        }
        Insert: {
          data_emissao?: string | null
          id_loja?: never
          id_venda?: never
          numero_documento?: string | null
          settlement_method?: string | null
          valor_total?: never
        }
        Update: {
          data_emissao?: string | null
          id_loja?: never
          id_venda?: never
          numero_documento?: string | null
          settlement_method?: string | null
          valor_total?: never
        }
        Relationships: []
      }
      v_vendas_itens_origem: {
        Row: {
          caminho_classificacao: string | null
          cfop: string | null
          chave_acesso: string | null
          competencia: string | null
          data_emissao: string | null
          descricao_produto: string | null
          dfe_id: string | null
          id_embalagem: number | null
          id_loja: number | null
          id_venda_item: string | null
          item_id: string | null
          numero_documento: string | null
          quantidade: number | null
          tipo_documento: string | null
          tipo_produto: string | null
          valor_bruto: number | null
          valor_liquido: number | null
          valor_total: number | null
        }
        Relationships: []
      }
      vw_compare_dre_dfc_diario: {
        Row: {
          competencia: string | null
          dfc_recebido: number | null
          diferenca: number | null
          dre_receita: number | null
          loja_id: number | null
        }
        Relationships: []
      }
      vw_dfc_gerencial_diario: {
        Row: {
          ajuste_entrada: number | null
          ajuste_saida: number | null
          competencia: string | null
          loja_id: number | null
          valor_gerencial: number | null
          valor_oficial: number | null
        }
        Relationships: []
      }
      vw_dre_diaria_simplificada: {
        Row: {
          cmv: number | null
          competencia: string | null
          loja_id: number | null
          lucro_bruto: number | null
          receita_bruta: number | null
        }
        Relationships: []
      }
      vw_dre_diaria_tipo: {
        Row: {
          cmv: number | null
          competencia: string | null
          is_manipulado: boolean | null
          loja_id: number | null
          lucro_bruto: number | null
          receita: number | null
        }
        Relationships: []
      }
      vw_dre_mensal_tipo: {
        Row: {
          cmv: number | null
          is_manipulado: boolean | null
          loja_id: number | null
          lucro_bruto: number | null
          mes: string | null
          receita: number | null
        }
        Relationships: []
      }
      vw_planocontas_dre_flags: {
        Row: {
          caminho: string | null
          entra_dre: boolean | null
          is_financeiro: boolean | null
          is_imposto: boolean | null
          natureza: string | null
        }
        Insert: {
          caminho?: string | null
          entra_dre?: boolean | null
          is_financeiro?: never
          is_imposto?: never
          natureza?: string | null
        }
        Update: {
          caminho?: string | null
          entra_dre?: boolean | null
          is_financeiro?: never
          is_imposto?: never
          natureza?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "operador"],
    },
  },
} as const
