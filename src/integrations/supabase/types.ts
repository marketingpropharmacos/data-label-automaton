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
      agentes_status: {
        Row: {
          atualizado_em: string | null
          hostname: string | null
          id: string
          nome: string
          status: string | null
          ultimo_ping: string | null
          url: string | null
          versao: string | null
        }
        Insert: {
          atualizado_em?: string | null
          hostname?: string | null
          id: string
          nome: string
          status?: string | null
          ultimo_ping?: string | null
          url?: string | null
          versao?: string | null
        }
        Update: {
          atualizado_em?: string | null
          hostname?: string | null
          id?: string
          nome?: string
          status?: string | null
          ultimo_ping?: string | null
          url?: string | null
          versao?: string | null
        }
        Relationships: []
      }
      cache_change_log: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          changed_at: string
          diff_summary: Json | null
          id: number
          new_checksum: string | null
          old_checksum: string | null
          period: string
          store_id: number | null
          table_name: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          changed_at?: string
          diff_summary?: Json | null
          id?: never
          new_checksum?: string | null
          old_checksum?: string | null
          period: string
          store_id?: number | null
          table_name: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          changed_at?: string
          diff_summary?: Json | null
          id?: never
          new_checksum?: string | null
          old_checksum?: string | null
          period?: string
          store_id?: number | null
          table_name?: string
        }
        Relationships: []
      }
      cache_cmv_manipulados: {
        Row: {
          checksum: string | null
          data: Json
          id: number
          period: string
          store_id: number
          synced_at: string
        }
        Insert: {
          checksum?: string | null
          data?: Json
          id?: never
          period: string
          store_id?: number
          synced_at?: string
        }
        Update: {
          checksum?: string | null
          data?: Json
          id?: never
          period?: string
          store_id?: number
          synced_at?: string
        }
        Relationships: []
      }
      cache_despesas: {
        Row: {
          checksum: string | null
          data: Json
          id: number
          period: string
          store_id: number
          synced_at: string
        }
        Insert: {
          checksum?: string | null
          data?: Json
          id?: never
          period: string
          store_id?: number
          synced_at?: string
        }
        Update: {
          checksum?: string | null
          data?: Json
          id?: never
          period?: string
          store_id?: number
          synced_at?: string
        }
        Relationships: []
      }
      cache_dfc: {
        Row: {
          checksum: string | null
          data: Json
          id: number
          mode: string
          period: string
          store_id: number
          synced_at: string
        }
        Insert: {
          checksum?: string | null
          data?: Json
          id?: never
          mode?: string
          period: string
          store_id?: number
          synced_at?: string
        }
        Update: {
          checksum?: string | null
          data?: Json
          id?: never
          mode?: string
          period?: string
          store_id?: number
          synced_at?: string
        }
        Relationships: []
      }
      cache_dfc_macro: {
        Row: {
          checksum: string | null
          data: Json
          id: number
          period: string
          synced_at: string
          umbrella: string
        }
        Insert: {
          checksum?: string | null
          data?: Json
          id?: never
          period: string
          synced_at?: string
          umbrella?: string
        }
        Update: {
          checksum?: string | null
          data?: Json
          id?: never
          period?: string
          synced_at?: string
          umbrella?: string
        }
        Relationships: []
      }
      cache_dre: {
        Row: {
          checksum: string | null
          data: Json
          id: number
          period: string
          store_id: number
          synced_at: string
        }
        Insert: {
          checksum?: string | null
          data?: Json
          id?: never
          period: string
          store_id?: number
          synced_at?: string
        }
        Update: {
          checksum?: string | null
          data?: Json
          id?: never
          period?: string
          store_id?: number
          synced_at?: string
        }
        Relationships: []
      }
      cache_metas_sugeridas: {
        Row: {
          ano: number
          colaborador_id: number
          detalhes: Json | null
          loja_id: number
          media_historica: number
          mes: number
          meses_considerados: number
          meses_total: number
          meta_sugerida: number
          updated_at: string
        }
        Insert: {
          ano: number
          colaborador_id: number
          detalhes?: Json | null
          loja_id: number
          media_historica?: number
          mes: number
          meses_considerados?: number
          meses_total?: number
          meta_sugerida?: number
          updated_at?: string
        }
        Update: {
          ano?: number
          colaborador_id?: number
          detalhes?: Json | null
          loja_id?: number
          media_historica?: number
          mes?: number
          meses_considerados?: number
          meses_total?: number
          meta_sugerida?: number
          updated_at?: string
        }
        Relationships: []
      }
      cache_remuneracao_variavel: {
        Row: {
          checksum: string | null
          data: Json
          id: number
          period: string
          store_id: number
          synced_at: string
        }
        Insert: {
          checksum?: string | null
          data?: Json
          id?: never
          period: string
          store_id?: number
          synced_at?: string
        }
        Update: {
          checksum?: string | null
          data?: Json
          id?: never
          period?: string
          store_id?: number
          synced_at?: string
        }
        Relationships: []
      }
      cache_rv_completo: {
        Row: {
          checksum: string | null
          data: Json
          id: number
          period: string
          store_id: number
          synced_at: string
        }
        Insert: {
          checksum?: string | null
          data?: Json
          id?: never
          period: string
          store_id?: number
          synced_at?: string
        }
        Update: {
          checksum?: string | null
          data?: Json
          id?: never
          period?: string
          store_id?: number
          synced_at?: string
        }
        Relationships: []
      }
      cache_sync_log: {
        Row: {
          endpoints: string[] | null
          error_details: Json | null
          errors: number | null
          finished_at: string | null
          frequency: string | null
          id: number
          mode: string
          periods: string[] | null
          records_unchanged: number | null
          records_updated: number | null
          started_at: string
          status: string
          stores_synced: number | null
        }
        Insert: {
          endpoints?: string[] | null
          error_details?: Json | null
          errors?: number | null
          finished_at?: string | null
          frequency?: string | null
          id?: never
          mode: string
          periods?: string[] | null
          records_unchanged?: number | null
          records_updated?: number | null
          started_at?: string
          status?: string
          stores_synced?: number | null
        }
        Update: {
          endpoints?: string[] | null
          error_details?: Json | null
          errors?: number | null
          finished_at?: string | null
          frequency?: string | null
          id?: never
          mode?: string
          periods?: string[] | null
          records_unchanged?: number | null
          records_updated?: number | null
          started_at?: string
          status?: string
          stores_synced?: number | null
        }
        Relationships: []
      }
      cache_vendas_colaborador: {
        Row: {
          checksum: string | null
          data: Json
          id: number
          period: string
          store_id: number
          synced_at: string
        }
        Insert: {
          checksum?: string | null
          data?: Json
          id?: never
          period: string
          store_id?: number
          synced_at?: string
        }
        Update: {
          checksum?: string | null
          data?: Json
          id?: never
          period?: string
          store_id?: number
          synced_at?: string
        }
        Relationships: []
      }
      calendario_feriados: {
        Row: {
          created_at: string
          data: string
          id: number
          nome: string
          tipo: string
          uf: string | null
        }
        Insert: {
          created_at?: string
          data: string
          id?: never
          nome: string
          tipo?: string
          uf?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          id?: never
          nome?: string
          tipo?: string
          uf?: string | null
        }
        Relationships: []
      }
      config_aliquotas_impostos: {
        Row: {
          aliquota_efetiva: number
          loja_id: number
          tipo_receita: string
          updated_at: string
          vigencia_inicio: string
        }
        Insert: {
          aliquota_efetiva?: number
          loja_id: number
          tipo_receita: string
          updated_at?: string
          vigencia_inicio?: string
        }
        Update: {
          aliquota_efetiva?: number
          loja_id?: number
          tipo_receita?: string
          updated_at?: string
          vigencia_inicio?: string
        }
        Relationships: []
      }
      config_empresa_tributario: {
        Row: {
          aliquota_inss_emp: number | null
          aliquota_rat: number | null
          aliquota_terceiros: number | null
          ativo: boolean | null
          id: string
          loja_id: number
          regime: string
          vigencia: string
        }
        Insert: {
          aliquota_inss_emp?: number | null
          aliquota_rat?: number | null
          aliquota_terceiros?: number | null
          ativo?: boolean | null
          id?: string
          loja_id: number
          regime: string
          vigencia: string
        }
        Update: {
          aliquota_inss_emp?: number | null
          aliquota_rat?: number | null
          aliquota_terceiros?: number | null
          ativo?: boolean | null
          id?: string
          loja_id?: number
          regime?: string
          vigencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_empresa_tributario_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "dim_loja"
            referencedColumns: ["loja_id"]
          },
        ]
      }
      config_shadow_mode: {
        Row: {
          ativado_em: string | null
          ativado_por: string | null
          ativo: boolean
          competencia: string
          id: string
        }
        Insert: {
          ativado_em?: string | null
          ativado_por?: string | null
          ativo?: boolean
          competencia: string
          id?: string
        }
        Update: {
          ativado_em?: string | null
          ativado_por?: string | null
          ativo?: boolean
          competencia?: string
          id?: string
        }
        Relationships: []
      }
      config_vr_vt_loja: {
        Row: {
          ativo: boolean | null
          id: string
          loja_id: number
          paga_vr: boolean | null
          paga_vt: boolean | null
          valor_dia_vr: number | null
          valor_dia_vt: number | null
          vigencia: string
        }
        Insert: {
          ativo?: boolean | null
          id?: string
          loja_id: number
          paga_vr?: boolean | null
          paga_vt?: boolean | null
          valor_dia_vr?: number | null
          valor_dia_vt?: number | null
          vigencia: string
        }
        Update: {
          ativo?: boolean | null
          id?: string
          loja_id?: number
          paga_vr?: boolean | null
          paga_vt?: boolean | null
          valor_dia_vr?: number | null
          valor_dia_vt?: number | null
          vigencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_vr_vt_loja_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "dim_loja"
            referencedColumns: ["loja_id"]
          },
        ]
      }
      dim_forma_recebimento: {
        Row: {
          ativo: boolean
          codigo: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          codigo: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          codigo?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
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
          is_cost_center: boolean
          loja_id: number
          loja_nome: string | null
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          grupo: string
          is_cost_center?: boolean
          loja_id: number
          loja_nome?: string | null
        }
        Update: {
          ativa?: boolean
          created_at?: string
          grupo?: string
          is_cost_center?: boolean
          loja_id?: number
          loja_nome?: string | null
        }
        Relationships: []
      }
      dim_modalidade_receita: {
        Row: {
          ativo: boolean
          codigo: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          codigo: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          codigo?: string
          nome?: string
          ordem?: number
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
      emprestimos_internos: {
        Row: {
          colaborador_id: number
          created_at: string | null
          data_concessao: string
          id: string
          loja_id: number
          observacao: string | null
          parcela_mensal: number
          saldo_devedor: number
          status: string | null
          valor_total: number
        }
        Insert: {
          colaborador_id: number
          created_at?: string | null
          data_concessao: string
          id?: string
          loja_id: number
          observacao?: string | null
          parcela_mensal: number
          saldo_devedor: number
          status?: string | null
          valor_total: number
        }
        Update: {
          colaborador_id?: number
          created_at?: string | null
          data_concessao?: string
          id?: string
          loja_id?: number
          observacao?: string | null
          parcela_mensal?: number
          saldo_devedor?: number
          status?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "emprestimos_internos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "rv_config_colaboradores"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "emprestimos_internos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "dim_loja"
            referencedColumns: ["loja_id"]
          },
        ]
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
      ferias_controle: {
        Row: {
          colaborador_id: number
          created_at: string | null
          data_fim_gozo: string | null
          data_inicio_gozo: string | null
          dias_direito: number | null
          dias_gozados: number | null
          dias_vendidos: number | null
          id: string
          periodo_aquisitivo_fim: string
          periodo_aquisitivo_inicio: string
          status: string | null
        }
        Insert: {
          colaborador_id: number
          created_at?: string | null
          data_fim_gozo?: string | null
          data_inicio_gozo?: string | null
          dias_direito?: number | null
          dias_gozados?: number | null
          dias_vendidos?: number | null
          id?: string
          periodo_aquisitivo_fim: string
          periodo_aquisitivo_inicio: string
          status?: string | null
        }
        Update: {
          colaborador_id?: number
          created_at?: string | null
          data_fim_gozo?: string | null
          data_inicio_gozo?: string | null
          dias_direito?: number | null
          dias_gozados?: number | null
          dias_vendidos?: number | null
          id?: string
          periodo_aquisitivo_fim?: string
          periodo_aquisitivo_inicio?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ferias_controle_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "rv_config_colaboradores"
            referencedColumns: ["colaborador_id"]
          },
        ]
      }
      folha_reclassificacao: {
        Row: {
          ativo: boolean
          conta_codigo: string
          nome_alpha7: string
          nome_correto: string
          sub_bloco_dfc: string
          sub_bloco_dre: string | null
          sub_order: number
        }
        Insert: {
          ativo?: boolean
          conta_codigo: string
          nome_alpha7: string
          nome_correto: string
          sub_bloco_dfc: string
          sub_bloco_dre?: string | null
          sub_order?: number
        }
        Update: {
          ativo?: boolean
          conta_codigo?: string
          nome_alpha7?: string
          nome_correto?: string
          sub_bloco_dfc?: string
          sub_bloco_dre?: string | null
          sub_order?: number
        }
        Relationships: []
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
      lb_action_items: {
        Row: {
          ai_confidence_score: number | null
          cancel_reason: string | null
          canceled_at: string | null
          co_owners: string[] | null
          completed_at: string | null
          completion_evidence: Json | null
          created_at: string
          decision_id: string | null
          description: string | null
          display_id: string
          due_date: string | null
          effort_estimate: string | null
          evidence_message_id: string | null
          evidence_transcript_segment_id: string | null
          id: string
          is_recurring: boolean
          origin_conversation_id: string | null
          origin_meeting_id: string | null
          origin_type: Database["public"]["Enums"]["lb_origin_type"]
          original_due_date: string | null
          owner_id: string | null
          priority: Database["public"]["Enums"]["lb_priority"]
          project_id: string | null
          recurrence_pattern: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["lb_action_status"]
          tags: string[] | null
          times_rescheduled: number
          title: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          workspace_id: string
        }
        Insert: {
          ai_confidence_score?: number | null
          cancel_reason?: string | null
          canceled_at?: string | null
          co_owners?: string[] | null
          completed_at?: string | null
          completion_evidence?: Json | null
          created_at?: string
          decision_id?: string | null
          description?: string | null
          display_id?: string
          due_date?: string | null
          effort_estimate?: string | null
          evidence_message_id?: string | null
          evidence_transcript_segment_id?: string | null
          id?: string
          is_recurring?: boolean
          origin_conversation_id?: string | null
          origin_meeting_id?: string | null
          origin_type?: Database["public"]["Enums"]["lb_origin_type"]
          original_due_date?: string | null
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["lb_priority"]
          project_id?: string | null
          recurrence_pattern?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["lb_action_status"]
          tags?: string[] | null
          times_rescheduled?: number
          title: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          workspace_id: string
        }
        Update: {
          ai_confidence_score?: number | null
          cancel_reason?: string | null
          canceled_at?: string | null
          co_owners?: string[] | null
          completed_at?: string | null
          completion_evidence?: Json | null
          created_at?: string
          decision_id?: string | null
          description?: string | null
          display_id?: string
          due_date?: string | null
          effort_estimate?: string | null
          evidence_message_id?: string | null
          evidence_transcript_segment_id?: string | null
          id?: string
          is_recurring?: boolean
          origin_conversation_id?: string | null
          origin_meeting_id?: string | null
          origin_type?: Database["public"]["Enums"]["lb_origin_type"]
          original_due_date?: string | null
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["lb_priority"]
          project_id?: string | null
          recurrence_pattern?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["lb_action_status"]
          tags?: string[] | null
          times_rescheduled?: number
          title?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lb_action_items_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "lb_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_action_items_evidence_message_id_fkey"
            columns: ["evidence_message_id"]
            isOneToOne: false
            referencedRelation: "lb_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_action_items_evidence_transcript_segment_id_fkey"
            columns: ["evidence_transcript_segment_id"]
            isOneToOne: false
            referencedRelation: "lb_transcript_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_action_items_origin_conversation_id_fkey"
            columns: ["origin_conversation_id"]
            isOneToOne: false
            referencedRelation: "lb_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_action_items_origin_meeting_id_fkey"
            columns: ["origin_meeting_id"]
            isOneToOne: false
            referencedRelation: "lb_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_action_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "lb_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_action_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "lb_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_action_items_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "lb_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_action_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "lb_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_ai_extraction_batches: {
        Row: {
          avg_confidence_score: number | null
          created_at: string
          id: string
          items_detected: number
          items_discarded: number
          items_edited: number
          items_validated: number
          model_version: string | null
          processing_time_ms: number | null
          source_id: string
          source_type: string
          workspace_id: string
        }
        Insert: {
          avg_confidence_score?: number | null
          created_at?: string
          id?: string
          items_detected?: number
          items_discarded?: number
          items_edited?: number
          items_validated?: number
          model_version?: string | null
          processing_time_ms?: number | null
          source_id: string
          source_type: string
          workspace_id: string
        }
        Update: {
          avg_confidence_score?: number | null
          created_at?: string
          id?: string
          items_detected?: number
          items_discarded?: number
          items_edited?: number
          items_validated?: number
          model_version?: string | null
          processing_time_ms?: number | null
          source_id?: string
          source_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lb_ai_extraction_batches_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "lb_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["lb_audit_action"]
          changes: Json | null
          created_at: string
          id: string
          ip_address: unknown
          target_id: string
          target_type: string
          user_agent: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["lb_audit_action"]
          changes?: Json | null
          created_at?: string
          id?: string
          ip_address?: unknown
          target_id: string
          target_type: string
          user_agent?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["lb_audit_action"]
          changes?: Json | null
          created_at?: string
          id?: string
          ip_address?: unknown
          target_id?: string
          target_type?: string
          user_agent?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lb_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "lb_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "lb_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_blockers: {
        Row: {
          action_item_id: string | null
          ai_confidence_score: number | null
          blocked_by_external: string | null
          blocked_by_team_id: string | null
          blocked_by_user_id: string | null
          created_at: string
          description: string | null
          id: string
          origin_conversation_id: string | null
          origin_meeting_id: string | null
          origin_type: Database["public"]["Enums"]["lb_origin_type"]
          project_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["lb_blocker_severity"]
          status: Database["public"]["Enums"]["lb_blocker_status"]
          title: string
          workspace_id: string
        }
        Insert: {
          action_item_id?: string | null
          ai_confidence_score?: number | null
          blocked_by_external?: string | null
          blocked_by_team_id?: string | null
          blocked_by_user_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          origin_conversation_id?: string | null
          origin_meeting_id?: string | null
          origin_type?: Database["public"]["Enums"]["lb_origin_type"]
          project_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["lb_blocker_severity"]
          status?: Database["public"]["Enums"]["lb_blocker_status"]
          title: string
          workspace_id: string
        }
        Update: {
          action_item_id?: string | null
          ai_confidence_score?: number | null
          blocked_by_external?: string | null
          blocked_by_team_id?: string | null
          blocked_by_user_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          origin_conversation_id?: string | null
          origin_meeting_id?: string | null
          origin_type?: Database["public"]["Enums"]["lb_origin_type"]
          project_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["lb_blocker_severity"]
          status?: Database["public"]["Enums"]["lb_blocker_status"]
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lb_blockers_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "lb_action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_blockers_blocked_by_team_id_fkey"
            columns: ["blocked_by_team_id"]
            isOneToOne: false
            referencedRelation: "lb_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_blockers_blocked_by_user_id_fkey"
            columns: ["blocked_by_user_id"]
            isOneToOne: false
            referencedRelation: "lb_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_blockers_origin_conversation_id_fkey"
            columns: ["origin_conversation_id"]
            isOneToOne: false
            referencedRelation: "lb_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_blockers_origin_meeting_id_fkey"
            columns: ["origin_meeting_id"]
            isOneToOne: false
            referencedRelation: "lb_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_blockers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "lb_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_blockers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "lb_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_conversations: {
        Row: {
          ai_processed_at: string | null
          channel_name: string | null
          created_at: string
          external_thread_id: string | null
          id: string
          is_monitored: boolean
          last_message_at: string | null
          message_count: number
          project_id: string | null
          source_id: string
          started_at: string | null
          workspace_id: string
        }
        Insert: {
          ai_processed_at?: string | null
          channel_name?: string | null
          created_at?: string
          external_thread_id?: string | null
          id?: string
          is_monitored?: boolean
          last_message_at?: string | null
          message_count?: number
          project_id?: string | null
          source_id: string
          started_at?: string | null
          workspace_id: string
        }
        Update: {
          ai_processed_at?: string | null
          channel_name?: string | null
          created_at?: string
          external_thread_id?: string | null
          id?: string
          is_monitored?: boolean
          last_message_at?: string | null
          message_count?: number
          project_id?: string | null
          source_id?: string
          started_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lb_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "lb_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_conversations_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lb_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "lb_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_decisions: {
        Row: {
          ai_confidence_score: number | null
          alternatives_considered: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_type: Database["public"]["Enums"]["lb_decision_type"] | null
          description: string | null
          display_id: string
          evidence_message_id: string | null
          evidence_transcript_segment_id: string | null
          id: string
          impact: Database["public"]["Enums"]["lb_impact_level"] | null
          origin_conversation_id: string | null
          origin_meeting_id: string | null
          origin_type: Database["public"]["Enums"]["lb_origin_type"]
          project_id: string | null
          reversibility: Database["public"]["Enums"]["lb_reversibility"] | null
          status: Database["public"]["Enums"]["lb_decision_status"]
          superseded_by_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          workspace_id: string
        }
        Insert: {
          ai_confidence_score?: number | null
          alternatives_considered?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_type?: Database["public"]["Enums"]["lb_decision_type"] | null
          description?: string | null
          display_id?: string
          evidence_message_id?: string | null
          evidence_transcript_segment_id?: string | null
          id?: string
          impact?: Database["public"]["Enums"]["lb_impact_level"] | null
          origin_conversation_id?: string | null
          origin_meeting_id?: string | null
          origin_type?: Database["public"]["Enums"]["lb_origin_type"]
          project_id?: string | null
          reversibility?: Database["public"]["Enums"]["lb_reversibility"] | null
          status?: Database["public"]["Enums"]["lb_decision_status"]
          superseded_by_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          workspace_id: string
        }
        Update: {
          ai_confidence_score?: number | null
          alternatives_considered?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_type?: Database["public"]["Enums"]["lb_decision_type"] | null
          description?: string | null
          display_id?: string
          evidence_message_id?: string | null
          evidence_transcript_segment_id?: string | null
          id?: string
          impact?: Database["public"]["Enums"]["lb_impact_level"] | null
          origin_conversation_id?: string | null
          origin_meeting_id?: string | null
          origin_type?: Database["public"]["Enums"]["lb_origin_type"]
          project_id?: string | null
          reversibility?: Database["public"]["Enums"]["lb_reversibility"] | null
          status?: Database["public"]["Enums"]["lb_decision_status"]
          superseded_by_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lb_decisions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "lb_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_decisions_evidence_message_id_fkey"
            columns: ["evidence_message_id"]
            isOneToOne: false
            referencedRelation: "lb_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_decisions_evidence_transcript_segment_id_fkey"
            columns: ["evidence_transcript_segment_id"]
            isOneToOne: false
            referencedRelation: "lb_transcript_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_decisions_origin_conversation_id_fkey"
            columns: ["origin_conversation_id"]
            isOneToOne: false
            referencedRelation: "lb_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_decisions_origin_meeting_id_fkey"
            columns: ["origin_meeting_id"]
            isOneToOne: false
            referencedRelation: "lb_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_decisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "lb_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_decisions_superseded_by_id_fkey"
            columns: ["superseded_by_id"]
            isOneToOne: false
            referencedRelation: "lb_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_decisions_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "lb_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_decisions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "lb_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_dependencies: {
        Row: {
          created_at: string
          dependency_external: string | null
          dependency_item_id: string | null
          dependency_team_id: string | null
          dependent_item_id: string
          due_date: string | null
          fulfilled_at: string | null
          id: string
          status: Database["public"]["Enums"]["lb_dependency_status"]
          type: Database["public"]["Enums"]["lb_dependency_type"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          dependency_external?: string | null
          dependency_item_id?: string | null
          dependency_team_id?: string | null
          dependent_item_id: string
          due_date?: string | null
          fulfilled_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["lb_dependency_status"]
          type?: Database["public"]["Enums"]["lb_dependency_type"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          dependency_external?: string | null
          dependency_item_id?: string | null
          dependency_team_id?: string | null
          dependent_item_id?: string
          due_date?: string | null
          fulfilled_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["lb_dependency_status"]
          type?: Database["public"]["Enums"]["lb_dependency_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lb_dependencies_dependency_item_id_fkey"
            columns: ["dependency_item_id"]
            isOneToOne: false
            referencedRelation: "lb_action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_dependencies_dependency_team_id_fkey"
            columns: ["dependency_team_id"]
            isOneToOne: false
            referencedRelation: "lb_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_dependencies_dependent_item_id_fkey"
            columns: ["dependent_item_id"]
            isOneToOne: false
            referencedRelation: "lb_action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_dependencies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "lb_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_evidence: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          evidenceable_id: string
          evidenceable_type: string
          file_url: string | null
          id: string
          message_id: string | null
          transcript_segment_id: string | null
          type: Database["public"]["Enums"]["lb_evidence_type"]
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          evidenceable_id: string
          evidenceable_type: string
          file_url?: string | null
          id?: string
          message_id?: string | null
          transcript_segment_id?: string | null
          type: Database["public"]["Enums"]["lb_evidence_type"]
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          evidenceable_id?: string
          evidenceable_type?: string
          file_url?: string | null
          id?: string
          message_id?: string | null
          transcript_segment_id?: string | null
          type?: Database["public"]["Enums"]["lb_evidence_type"]
        }
        Relationships: [
          {
            foreignKeyName: "lb_evidence_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "lb_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_evidence_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "lb_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_evidence_transcript_segment_id_fkey"
            columns: ["transcript_segment_id"]
            isOneToOne: false
            referencedRelation: "lb_transcript_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_follow_ups: {
        Row: {
          ai_confidence_score: number | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          origin_conversation_id: string | null
          origin_meeting_id: string | null
          origin_type: Database["public"]["Enums"]["lb_origin_type"]
          owner_id: string | null
          related_item_id: string
          related_item_type: string
          status: Database["public"]["Enums"]["lb_follow_up_status"]
          title: string
          workspace_id: string
        }
        Insert: {
          ai_confidence_score?: number | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          origin_conversation_id?: string | null
          origin_meeting_id?: string | null
          origin_type?: Database["public"]["Enums"]["lb_origin_type"]
          owner_id?: string | null
          related_item_id: string
          related_item_type: string
          status?: Database["public"]["Enums"]["lb_follow_up_status"]
          title: string
          workspace_id: string
        }
        Update: {
          ai_confidence_score?: number | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          origin_conversation_id?: string | null
          origin_meeting_id?: string | null
          origin_type?: Database["public"]["Enums"]["lb_origin_type"]
          owner_id?: string | null
          related_item_id?: string
          related_item_type?: string
          status?: Database["public"]["Enums"]["lb_follow_up_status"]
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lb_follow_ups_origin_conversation_id_fkey"
            columns: ["origin_conversation_id"]
            isOneToOne: false
            referencedRelation: "lb_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_follow_ups_origin_meeting_id_fkey"
            columns: ["origin_meeting_id"]
            isOneToOne: false
            referencedRelation: "lb_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_follow_ups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "lb_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_follow_ups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "lb_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_integrations: {
        Row: {
          config: Json | null
          created_at: string
          error_message: string | null
          id: string
          last_sync_at: string | null
          provider: Database["public"]["Enums"]["lb_integration_provider"]
          status: Database["public"]["Enums"]["lb_integration_status"]
          workspace_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          provider: Database["public"]["Enums"]["lb_integration_provider"]
          status?: Database["public"]["Enums"]["lb_integration_status"]
          workspace_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          provider?: Database["public"]["Enums"]["lb_integration_provider"]
          status?: Database["public"]["Enums"]["lb_integration_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lb_integrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "lb_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_meeting_participants: {
        Row: {
          external_name: string | null
          id: string
          meeting_id: string
          speaker_label: string | null
          user_id: string | null
        }
        Insert: {
          external_name?: string | null
          id?: string
          meeting_id: string
          speaker_label?: string | null
          user_id?: string | null
        }
        Update: {
          external_name?: string | null
          id?: string
          meeting_id?: string
          speaker_label?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lb_meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "lb_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_meeting_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "lb_users"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_meetings: {
        Row: {
          ai_processed_at: string | null
          created_at: string
          date: string
          duration_minutes: number | null
          id: string
          project_id: string | null
          recording_url: string | null
          source_id: string | null
          summary_long: string | null
          summary_short: string | null
          title: string
          transcript_status: Database["public"]["Enums"]["lb_transcript_status"]
          workspace_id: string
        }
        Insert: {
          ai_processed_at?: string | null
          created_at?: string
          date?: string
          duration_minutes?: number | null
          id?: string
          project_id?: string | null
          recording_url?: string | null
          source_id?: string | null
          summary_long?: string | null
          summary_short?: string | null
          title: string
          transcript_status?: Database["public"]["Enums"]["lb_transcript_status"]
          workspace_id: string
        }
        Update: {
          ai_processed_at?: string | null
          created_at?: string
          date?: string
          duration_minutes?: number | null
          id?: string
          project_id?: string | null
          recording_url?: string | null
          source_id?: string | null
          summary_long?: string | null
          summary_short?: string | null
          title?: string
          transcript_status?: Database["public"]["Enums"]["lb_transcript_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lb_meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "lb_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_meetings_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lb_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_meetings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "lb_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_messages: {
        Row: {
          content: string
          conversation_id: string
          external_author_name: string | null
          external_message_id: string | null
          has_extraction: boolean
          id: string
          sent_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          external_author_name?: string | null
          external_message_id?: string | null
          has_extraction?: boolean
          id?: string
          sent_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          external_author_name?: string | null
          external_message_id?: string | null
          has_extraction?: boolean
          id?: string
          sent_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lb_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "lb_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "lb_users"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_notifications: {
        Row: {
          body: string | null
          channel: Database["public"]["Enums"]["lb_notification_channel"]
          created_at: string
          id: string
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: Database["public"]["Enums"]["lb_notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          channel?: Database["public"]["Enums"]["lb_notification_channel"]
          created_at?: string
          id?: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: Database["public"]["Enums"]["lb_notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: Database["public"]["Enums"]["lb_notification_channel"]
          created_at?: string
          id?: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: Database["public"]["Enums"]["lb_notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lb_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "lb_users"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_organizations: {
        Row: {
          billing_info: Json | null
          created_at: string
          id: string
          name: string
          plan: Database["public"]["Enums"]["lb_plan_type"]
          settings: Json | null
          slug: string
        }
        Insert: {
          billing_info?: Json | null
          created_at?: string
          id?: string
          name: string
          plan?: Database["public"]["Enums"]["lb_plan_type"]
          settings?: Json | null
          slug: string
        }
        Update: {
          billing_info?: Json | null
          created_at?: string
          id?: string
          name?: string
          plan?: Database["public"]["Enums"]["lb_plan_type"]
          settings?: Json | null
          slug?: string
        }
        Relationships: []
      }
      lb_projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          start_date: string | null
          status: Database["public"]["Enums"]["lb_project_status"]
          target_end_date: string | null
          team_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["lb_project_status"]
          target_end_date?: string | null
          team_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["lb_project_status"]
          target_end_date?: string | null
          team_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lb_projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "lb_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "lb_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_risks: {
        Row: {
          ai_confidence_score: number | null
          created_at: string
          description: string | null
          id: string
          impact: Database["public"]["Enums"]["lb_impact_level"]
          mitigation_plan: string | null
          origin_conversation_id: string | null
          origin_meeting_id: string | null
          origin_type: Database["public"]["Enums"]["lb_origin_type"]
          owner_id: string | null
          probability: Database["public"]["Enums"]["lb_impact_level"]
          project_id: string | null
          status: Database["public"]["Enums"]["lb_risk_status"]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_confidence_score?: number | null
          created_at?: string
          description?: string | null
          id?: string
          impact?: Database["public"]["Enums"]["lb_impact_level"]
          mitigation_plan?: string | null
          origin_conversation_id?: string | null
          origin_meeting_id?: string | null
          origin_type?: Database["public"]["Enums"]["lb_origin_type"]
          owner_id?: string | null
          probability?: Database["public"]["Enums"]["lb_impact_level"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["lb_risk_status"]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_confidence_score?: number | null
          created_at?: string
          description?: string | null
          id?: string
          impact?: Database["public"]["Enums"]["lb_impact_level"]
          mitigation_plan?: string | null
          origin_conversation_id?: string | null
          origin_meeting_id?: string | null
          origin_type?: Database["public"]["Enums"]["lb_origin_type"]
          owner_id?: string | null
          probability?: Database["public"]["Enums"]["lb_impact_level"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["lb_risk_status"]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lb_risks_origin_conversation_id_fkey"
            columns: ["origin_conversation_id"]
            isOneToOne: false
            referencedRelation: "lb_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_risks_origin_meeting_id_fkey"
            columns: ["origin_meeting_id"]
            isOneToOne: false
            referencedRelation: "lb_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_risks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "lb_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "lb_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_risks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "lb_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_sources: {
        Row: {
          config: Json | null
          created_at: string
          external_id: string | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          name: string
          type: Database["public"]["Enums"]["lb_source_type"]
          workspace_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          external_id?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name: string
          type: Database["public"]["Enums"]["lb_source_type"]
          workspace_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          external_id?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name?: string
          type?: Database["public"]["Enums"]["lb_source_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lb_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "lb_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_status_events: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          reason: string | null
          to_status: string
          trackable_id: string
          trackable_type: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          to_status: string
          trackable_id: string
          trackable_type: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          to_status?: string
          trackable_id?: string
          trackable_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lb_status_events_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "lb_users"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_team_memberships: {
        Row: {
          id: string
          joined_at: string
          role_in_team: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role_in_team?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role_in_team?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lb_team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "lb_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_team_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "lb_users"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          lead_user_id: string | null
          name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          lead_user_id?: string | null
          name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          lead_user_id?: string | null
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lb_teams_lead_user_id_fkey"
            columns: ["lead_user_id"]
            isOneToOne: false
            referencedRelation: "lb_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_teams_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "lb_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_transcript_segments: {
        Row: {
          confidence: number | null
          end_time: number
          has_extraction: boolean
          id: string
          meeting_id: string
          speaker_label: string | null
          start_time: number
          text: string
          user_id: string | null
        }
        Insert: {
          confidence?: number | null
          end_time?: number
          has_extraction?: boolean
          id?: string
          meeting_id: string
          speaker_label?: string | null
          start_time?: number
          text: string
          user_id?: string | null
        }
        Update: {
          confidence?: number | null
          end_time?: number
          has_extraction?: boolean
          id?: string
          meeting_id?: string
          speaker_label?: string | null
          start_time?: number
          text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lb_transcript_segments_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "lb_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lb_transcript_segments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "lb_users"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_users: {
        Row: {
          auth_user_id: string
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          last_active_at: string | null
          name: string
          notification_preferences: Json | null
          organization_id: string
          role: Database["public"]["Enums"]["lb_user_role"]
          timezone: string | null
        }
        Insert: {
          auth_user_id: string
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          last_active_at?: string | null
          name: string
          notification_preferences?: Json | null
          organization_id: string
          role?: Database["public"]["Enums"]["lb_user_role"]
          timezone?: string | null
        }
        Update: {
          auth_user_id?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          last_active_at?: string | null
          name?: string
          notification_preferences?: Json | null
          organization_id?: string
          role?: Database["public"]["Enums"]["lb_user_role"]
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lb_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "lb_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lb_workspaces: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          settings: Json | null
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          settings?: Json | null
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          settings?: Json | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "lb_workspaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "lb_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lotacao_historico: {
        Row: {
          ativo: boolean | null
          colaborador_id: number
          created_at: string | null
          data_fim: string | null
          data_inicio: string
          id: string
          loja_id: number
          percentual: number | null
          setor: string | null
          setor_interno: string | null
        }
        Insert: {
          ativo?: boolean | null
          colaborador_id: number
          created_at?: string | null
          data_fim?: string | null
          data_inicio: string
          id?: string
          loja_id: number
          percentual?: number | null
          setor?: string | null
          setor_interno?: string | null
        }
        Update: {
          ativo?: boolean | null
          colaborador_id?: number
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string
          id?: string
          loja_id?: number
          percentual?: number | null
          setor?: string | null
          setor_interno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lotacao_historico_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "rv_config_colaboradores"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "lotacao_historico_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "dim_loja"
            referencedColumns: ["loja_id"]
          },
        ]
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
      metas_vendas_individuais: {
        Row: {
          ano: number
          colaborador_id: number
          created_by: string | null
          id: number
          loja_id: number
          mes: number
          meta_valor: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ano: number
          colaborador_id: number
          created_by?: string | null
          id?: never
          loja_id: number
          mes: number
          meta_valor?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          ano?: number
          colaborador_id?: number
          created_by?: string | null
          id?: never
          loja_id?: number
          mes?: number
          meta_valor?: number
          tipo?: string
          updated_at?: string
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
      perfil_vendas_diario: {
        Row: {
          ano_referencia: number
          dia_semana: number
          loja_id: number
          peso: number
          semana_mes: number
          updated_at: string
        }
        Insert: {
          ano_referencia: number
          dia_semana: number
          loja_id: number
          peso?: number
          semana_mes: number
          updated_at?: string
        }
        Update: {
          ano_referencia?: number
          dia_semana?: number
          loja_id?: number
          peso?: number
          semana_mes?: number
          updated_at?: string
        }
        Relationships: []
      }
      periodo_status: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          module: string
          period: string
          reopened_at: string | null
          reopened_by: string | null
          status: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          module?: string
          period: string
          reopened_at?: string | null
          reopened_by?: string | null
          status?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          module?: string
          period?: string
          reopened_at?: string | null
          reopened_by?: string | null
          status?: string
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
      pre_folha_linha: {
        Row: {
          adiantamento: number
          adicional_noturno: number
          aprovado_em: string | null
          aprovado_por: string | null
          assist_medica_desconto: number
          assist_medica_empresa: number
          assist_odonto_desconto: number
          assist_odonto_empresa: number
          base_calculo_inss: number | null
          colaborador_id: number
          comissoes: number
          competencia: string
          created_at: string
          custo_total_empresa: number
          dsr: number
          emprestimo_desconto: number
          faltas: number
          farmacia_desconto: number
          fgts: number
          gratificacao: number
          horas_extras: number
          id: string
          insalubridade: number
          inss_empregado: number
          inss_patronal: number
          irrf: number
          loja_id: number
          outros_descontos: number
          pensao_alimenticia: number
          periculosidade: number
          provisao_13: number
          provisao_13_encargos: number
          provisao_ferias: number
          provisao_ferias_encargos: number
          rat: number
          salario_base: number
          salario_bruto: number
          salario_liquido: number
          seguro_vida: number
          status: string
          terceiros: number
          total_beneficios_empresa: number
          total_descontos: number
          total_descontos_folha: number | null
          total_encargos_patronais: number
          total_provisoes: number
          updated_at: string
          vr_desconto: number
          vr_empresa: number
          vt_desconto: number
          vt_empresa: number
        }
        Insert: {
          adiantamento?: number
          adicional_noturno?: number
          aprovado_em?: string | null
          aprovado_por?: string | null
          assist_medica_desconto?: number
          assist_medica_empresa?: number
          assist_odonto_desconto?: number
          assist_odonto_empresa?: number
          base_calculo_inss?: number | null
          colaborador_id: number
          comissoes?: number
          competencia: string
          created_at?: string
          custo_total_empresa?: number
          dsr?: number
          emprestimo_desconto?: number
          faltas?: number
          farmacia_desconto?: number
          fgts?: number
          gratificacao?: number
          horas_extras?: number
          id?: string
          insalubridade?: number
          inss_empregado?: number
          inss_patronal?: number
          irrf?: number
          loja_id: number
          outros_descontos?: number
          pensao_alimenticia?: number
          periculosidade?: number
          provisao_13?: number
          provisao_13_encargos?: number
          provisao_ferias?: number
          provisao_ferias_encargos?: number
          rat?: number
          salario_base?: number
          salario_bruto?: number
          salario_liquido?: number
          seguro_vida?: number
          status?: string
          terceiros?: number
          total_beneficios_empresa?: number
          total_descontos?: number
          total_descontos_folha?: number | null
          total_encargos_patronais?: number
          total_provisoes?: number
          updated_at?: string
          vr_desconto?: number
          vr_empresa?: number
          vt_desconto?: number
          vt_empresa?: number
        }
        Update: {
          adiantamento?: number
          adicional_noturno?: number
          aprovado_em?: string | null
          aprovado_por?: string | null
          assist_medica_desconto?: number
          assist_medica_empresa?: number
          assist_odonto_desconto?: number
          assist_odonto_empresa?: number
          base_calculo_inss?: number | null
          colaborador_id?: number
          comissoes?: number
          competencia?: string
          created_at?: string
          custo_total_empresa?: number
          dsr?: number
          emprestimo_desconto?: number
          faltas?: number
          farmacia_desconto?: number
          fgts?: number
          gratificacao?: number
          horas_extras?: number
          id?: string
          insalubridade?: number
          inss_empregado?: number
          inss_patronal?: number
          irrf?: number
          loja_id?: number
          outros_descontos?: number
          pensao_alimenticia?: number
          periculosidade?: number
          provisao_13?: number
          provisao_13_encargos?: number
          provisao_ferias?: number
          provisao_ferias_encargos?: number
          rat?: number
          salario_base?: number
          salario_bruto?: number
          salario_liquido?: number
          seguro_vida?: number
          status?: string
          terceiros?: number
          total_beneficios_empresa?: number
          total_descontos?: number
          total_descontos_folha?: number | null
          total_encargos_patronais?: number
          total_provisoes?: number
          updated_at?: string
          vr_desconto?: number
          vr_empresa?: number
          vt_desconto?: number
          vt_empresa?: number
        }
        Relationships: [
          {
            foreignKeyName: "pre_folha_linha_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "rv_config_colaboradores"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "pre_folha_linha_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "dim_loja"
            referencedColumns: ["loja_id"]
          },
        ]
      }
      rateio_empreendimento_criterios: {
        Row: {
          ano: number
          created_at: string
          id: number
          loja_id: number
          loja_nome: string
          percentual: number
          updated_at: string
        }
        Insert: {
          ano: number
          created_at?: string
          id?: number
          loja_id: number
          loja_nome: string
          percentual?: number
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          id?: number
          loja_id?: number
          loja_nome?: string
          percentual?: number
          updated_at?: string
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
      raw_alpha_dfc_cartoes_convenio: {
        Row: {
          competencia: string
          created_at: string
          fonte: string
          id: number
          loja_id: number
          modalidade_id: number | null
          modalidade_nome: string | null
          qtd_titulos: number
          valor: number
        }
        Insert: {
          competencia: string
          created_at?: string
          fonte?: string
          id?: number
          loja_id: number
          modalidade_id?: number | null
          modalidade_nome?: string | null
          qtd_titulos?: number
          valor?: number
        }
        Update: {
          competencia?: string
          created_at?: string
          fonte?: string
          id?: number
          loja_id?: number
          modalidade_id?: number | null
          modalidade_nome?: string | null
          qtd_titulos?: number
          valor?: number
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
      role_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          id: number
          module: string
          role: string
          updated_at: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          id?: never
          module: string
          role: string
          updated_at?: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          id?: never
          module?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      rv_colaborador_movimentacoes: {
        Row: {
          colaborador_id: number
          created_at: string
          created_by: string | null
          data_evento: string
          id: number
          loja_anterior_id: number | null
          loja_nova_id: number | null
          observacao: string | null
          tipo_evento: string
        }
        Insert: {
          colaborador_id: number
          created_at?: string
          created_by?: string | null
          data_evento: string
          id?: never
          loja_anterior_id?: number | null
          loja_nova_id?: number | null
          observacao?: string | null
          tipo_evento: string
        }
        Update: {
          colaborador_id?: number
          created_at?: string
          created_by?: string | null
          data_evento?: string
          id?: never
          loja_anterior_id?: number | null
          loja_nova_id?: number | null
          observacao?: string | null
          tipo_evento?: string
        }
        Relationships: []
      }
      rv_config_colaboradores: {
        Row: {
          agencia: string | null
          assist_medica_colaborador: number | null
          assist_medica_empresa: number | null
          assist_odonto: number | null
          ativo: boolean
          banco: string | null
          carga_horaria_semanal: number | null
          cargo: string | null
          categoria: string | null
          cnpj_empresa: string | null
          colaborador_id: number
          conta_corrente: string | null
          cpf: string | null
          created_at: string
          data_admissao: string | null
          data_desligamento: string | null
          data_inativacao: string | null
          data_nascimento: string | null
          data_registro: string | null
          dependentes_irrf: number | null
          empresa_registro: string | null
          gratificacao_fixa: number | null
          gratificacao_habitual: boolean | null
          isento_vt: boolean | null
          laboratorio_id: number | null
          loja_origem_id: number
          meta_lab_tipo: string | null
          nome: string
          nome_completo: string | null
          rateado: boolean | null
          remuneracao_complementar: number | null
          rv_percentual_custom: number | null
          salario_base: number | null
          setor_interno: string | null
          setor_lab: string | null
          sindicato_associativo: boolean | null
          sindicato_valor: number | null
          situacao: string | null
          tipo: Database["public"]["Enums"]["rv_colaborador_tipo"]
          tipo_contrato: string | null
          usa_faixa_especial: boolean
          vale_dia_20: number | null
        }
        Insert: {
          agencia?: string | null
          assist_medica_colaborador?: number | null
          assist_medica_empresa?: number | null
          assist_odonto?: number | null
          ativo?: boolean
          banco?: string | null
          carga_horaria_semanal?: number | null
          cargo?: string | null
          categoria?: string | null
          cnpj_empresa?: string | null
          colaborador_id: number
          conta_corrente?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_desligamento?: string | null
          data_inativacao?: string | null
          data_nascimento?: string | null
          data_registro?: string | null
          dependentes_irrf?: number | null
          empresa_registro?: string | null
          gratificacao_fixa?: number | null
          gratificacao_habitual?: boolean | null
          isento_vt?: boolean | null
          laboratorio_id?: number | null
          loja_origem_id: number
          meta_lab_tipo?: string | null
          nome: string
          nome_completo?: string | null
          rateado?: boolean | null
          remuneracao_complementar?: number | null
          rv_percentual_custom?: number | null
          salario_base?: number | null
          setor_interno?: string | null
          setor_lab?: string | null
          sindicato_associativo?: boolean | null
          sindicato_valor?: number | null
          situacao?: string | null
          tipo?: Database["public"]["Enums"]["rv_colaborador_tipo"]
          tipo_contrato?: string | null
          usa_faixa_especial?: boolean
          vale_dia_20?: number | null
        }
        Update: {
          agencia?: string | null
          assist_medica_colaborador?: number | null
          assist_medica_empresa?: number | null
          assist_odonto?: number | null
          ativo?: boolean
          banco?: string | null
          carga_horaria_semanal?: number | null
          cargo?: string | null
          categoria?: string | null
          cnpj_empresa?: string | null
          colaborador_id?: number
          conta_corrente?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_desligamento?: string | null
          data_inativacao?: string | null
          data_nascimento?: string | null
          data_registro?: string | null
          dependentes_irrf?: number | null
          empresa_registro?: string | null
          gratificacao_fixa?: number | null
          gratificacao_habitual?: boolean | null
          isento_vt?: boolean | null
          laboratorio_id?: number | null
          loja_origem_id?: number
          meta_lab_tipo?: string | null
          nome?: string
          nome_completo?: string | null
          rateado?: boolean | null
          remuneracao_complementar?: number | null
          rv_percentual_custom?: number | null
          salario_base?: number | null
          setor_interno?: string | null
          setor_lab?: string | null
          sindicato_associativo?: boolean | null
          sindicato_valor?: number | null
          situacao?: string | null
          tipo?: Database["public"]["Enums"]["rv_colaborador_tipo"]
          tipo_contrato?: string | null
          usa_faixa_especial?: boolean
          vale_dia_20?: number | null
        }
        Relationships: []
      }
      rv_lab_deducoes: {
        Row: {
          colaborador_id: number
          competencia: string
          laboratorio_id: number
          organizacao: boolean
          reclamacoes: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          colaborador_id: number
          competencia: string
          laboratorio_id: number
          organizacao?: boolean
          reclamacoes?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          colaborador_id?: number
          competencia?: string
          laboratorio_id?: number
          organizacao?: boolean
          reclamacoes?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      rv_lab_metas: {
        Row: {
          ativo: boolean
          colaborador_id: number
          laboratorio_id: number
          meta_formulas_dia: number | null
          meta_producao: number | null
          meta_tipo: string
          setor: string
          valor_unitario: number | null
        }
        Insert: {
          ativo?: boolean
          colaborador_id: number
          laboratorio_id: number
          meta_formulas_dia?: number | null
          meta_producao?: number | null
          meta_tipo: string
          setor: string
          valor_unitario?: number | null
        }
        Update: {
          ativo?: boolean
          colaborador_id?: number
          laboratorio_id?: number
          meta_formulas_dia?: number | null
          meta_producao?: number | null
          meta_tipo?: string
          setor?: string
          valor_unitario?: number | null
        }
        Relationships: []
      }
      rv_lab_metas_diarias: {
        Row: {
          colaborador_id: number
          competencia: string
          data_dia: string
          id: number
          laboratorio_id: number
          meta_dia: number
          setor: string
          updated_at: string
        }
        Insert: {
          colaborador_id: number
          competencia: string
          data_dia: string
          id?: never
          laboratorio_id: number
          meta_dia?: number
          setor: string
          updated_at?: string
        }
        Update: {
          colaborador_id?: number
          competencia?: string
          data_dia?: string
          id?: never
          laboratorio_id?: number
          meta_dia?: number
          setor?: string
          updated_at?: string
        }
        Relationships: []
      }
      rv_lab_metas_vendas: {
        Row: {
          ano: number
          laboratorio_id: number
          mes: number
          meta_vendas: number
        }
        Insert: {
          ano: number
          laboratorio_id: number
          mes: number
          meta_vendas: number
        }
        Update: {
          ano?: number
          laboratorio_id?: number
          mes?: number
          meta_vendas?: number
        }
        Relationships: []
      }
      rv_lab_producao_diaria: {
        Row: {
          colaborador_id: number
          competencia: string
          created_at: string
          created_by: string | null
          data_lancamento: string
          formulas_dia: number
          id: number
          laboratorio_id: number
          observacao: string | null
          producao_itens: number
          setor: string
          updated_at: string
        }
        Insert: {
          colaborador_id: number
          competencia: string
          created_at?: string
          created_by?: string | null
          data_lancamento: string
          formulas_dia?: number
          id?: never
          laboratorio_id: number
          observacao?: string | null
          producao_itens?: number
          setor: string
          updated_at?: string
        }
        Update: {
          colaborador_id?: number
          competencia?: string
          created_at?: string
          created_by?: string | null
          data_lancamento?: string
          formulas_dia?: number
          id?: never
          laboratorio_id?: number
          observacao?: string | null
          producao_itens?: number
          setor?: string
          updated_at?: string
        }
        Relationships: []
      }
      rv_lancamentos_manuais: {
        Row: {
          colaborador_id: number
          competencia: string
          componente: Database["public"]["Enums"]["rv_componente_manual"]
          created_at: string
          created_by: string | null
          descricao: string | null
          id: number
          loja_id: number
          quantidade: number | null
          valor: number
        }
        Insert: {
          colaborador_id: number
          competencia: string
          componente: Database["public"]["Enums"]["rv_componente_manual"]
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: never
          loja_id: number
          quantidade?: number | null
          valor?: number
        }
        Update: {
          colaborador_id?: number
          competencia?: string
          componente?: Database["public"]["Enums"]["rv_componente_manual"]
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: never
          loja_id?: number
          quantidade?: number | null
          valor?: number
        }
        Relationships: []
      }
      rv_pec_metas: {
        Row: {
          ano: number
          created_at: string
          meta_percentual: number
          trimestre: number
        }
        Insert: {
          ano: number
          created_at?: string
          meta_percentual?: number
          trimestre: number
        }
        Update: {
          ano?: number
          created_at?: string
          meta_percentual?: number
          trimestre?: number
        }
        Relationships: []
      }
      saved_rotulos: {
        Row: {
          id: number
          item_id: string
          nr_requisicao: string
          saved_by: string | null
          texto_livre: string
          updated_at: string
        }
        Insert: {
          id?: never
          item_id: string
          nr_requisicao: string
          saved_by?: string | null
          texto_livre: string
          updated_at?: string
        }
        Update: {
          id?: never
          item_id?: string
          nr_requisicao?: string
          saved_by?: string | null
          texto_livre?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      tabela_inss: {
        Row: {
          aliquota: number | null
          ativo: boolean | null
          faixa: number
          id: string
          salario_ate: number | null
          salario_de: number | null
          vigencia: string
        }
        Insert: {
          aliquota?: number | null
          ativo?: boolean | null
          faixa: number
          id?: string
          salario_ate?: number | null
          salario_de?: number | null
          vigencia: string
        }
        Update: {
          aliquota?: number | null
          ativo?: boolean | null
          faixa?: number
          id?: string
          salario_ate?: number | null
          salario_de?: number | null
          vigencia?: string
        }
        Relationships: []
      }
      tabela_irrf: {
        Row: {
          aliquota: number | null
          ativo: boolean | null
          base_ate: number | null
          base_de: number | null
          deducao_fixa: number | null
          faixa: number
          id: string
          vigencia: string
        }
        Insert: {
          aliquota?: number | null
          ativo?: boolean | null
          base_ate?: number | null
          base_de?: number | null
          deducao_fixa?: number | null
          faixa: number
          id?: string
          vigencia: string
        }
        Update: {
          aliquota?: number | null
          ativo?: boolean | null
          base_ate?: number | null
          base_de?: number | null
          deducao_fixa?: number | null
          faixa?: number
          id?: string
          vigencia?: string
        }
        Relationships: []
      }
      user_loja_access: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          loja_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          loja_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          loja_id?: number
          user_id?: string
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
      vw_impostos_calculados: {
        Row: {
          aliquota_efetiva: number | null
          imposto_calculado: number | null
          loja_id: number | null
          mes: string | null
          tipo_receita: string | null
          valor_receita: number | null
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
      vw_receita_segmentada: {
        Row: {
          loja_id: number | null
          mes: string | null
          tipo_receita: string | null
          valor_receita: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_manage_rv_lab_meta_diaria: {
        Args: { _colaborador_id: number; _laboratorio_id: number }
        Returns: boolean
      }
      get_lab_colaboradores: {
        Args: { p_laboratorio_id: number }
        Returns: {
          ativo: boolean
          cargo: string
          cnpj_empresa: string
          colaborador_id: number
          empresa_registro: string
          laboratorio_id: number
          loja_origem_id: number
          meta_lab_tipo: string
          nome: string
          nome_completo: string
          rv_percentual_custom: number
          setor_lab: string
          tipo: string
        }[]
      }
      get_my_loja_ids: { Args: never; Returns: number[] }
      get_my_permissions: {
        Args: never
        Returns: {
          can_edit: boolean
          can_view: boolean
          id: number
          module: string
          role: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "role_permissions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_workspace_admin: { Args: { _workspace_id: string }; Returns: boolean }
      is_workspace_admin_or_manager: {
        Args: { _workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: { Args: { _workspace_id: string }; Returns: boolean }
      lb_ensure_workspace: {
        Args: {
          p_auth_user_id: string
          p_user_email: string
          p_user_name: string
        }
        Returns: Json
      }
      lb_generate_display_id: {
        Args: { prefix: string; seq_name: string }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "operador"
        | "lider"
        | "viewer"
        | "financeiro"
        | "operador_lab"
      lb_action_status:
        | "detected"
        | "pending_validation"
        | "validated"
        | "assigned"
        | "in_progress"
        | "blocked"
        | "waiting_input"
        | "in_review"
        | "done"
        | "done_unverified"
        | "canceled"
        | "archived"
      lb_audit_action:
        | "created"
        | "updated"
        | "deleted"
        | "validated"
        | "discarded"
        | "merged"
        | "reclassified"
        | "escalated"
        | "auto_approved"
      lb_blocker_severity: "critical" | "high" | "medium" | "low"
      lb_blocker_status: "active" | "resolving" | "resolved"
      lb_decision_status:
        | "proposed"
        | "active"
        | "superseded"
        | "reverted"
        | "archived"
      lb_decision_type: "strategic" | "tactical" | "operational" | "technical"
      lb_dependency_status: "pending" | "in_progress" | "fulfilled" | "broken"
      lb_dependency_type: "same_team" | "cross_team" | "external"
      lb_evidence_type:
        | "transcript_segment"
        | "message"
        | "url"
        | "file"
        | "commit"
        | "deploy"
        | "text_note"
      lb_follow_up_status: "pending" | "done" | "overdue" | "canceled"
      lb_impact_level: "high" | "medium" | "low"
      lb_integration_provider:
        | "slack"
        | "teams"
        | "google_meet"
        | "zoom"
        | "gmail"
        | "outlook"
        | "google_calendar"
        | "outlook_calendar"
        | "jira"
        | "linear"
        | "github"
        | "notion"
        | "webhook"
      lb_integration_status: "active" | "paused" | "error" | "disconnected"
      lb_notification_channel: "in_app" | "email" | "slack" | "teams"
      lb_notification_type:
        | "validation_needed"
        | "task_assigned"
        | "task_overdue"
        | "follow_up_due"
        | "blocker_escalation"
        | "decision_conflict"
        | "digest"
        | "mention"
      lb_origin_type: "meeting" | "conversation" | "decision" | "manual"
      lb_plan_type: "free" | "starter" | "professional" | "enterprise"
      lb_priority: "critical" | "high" | "medium" | "low"
      lb_project_status: "active" | "paused" | "completed" | "archived"
      lb_reversibility: "irreversible" | "costly" | "easy"
      lb_risk_status:
        | "identified"
        | "mitigating"
        | "mitigated"
        | "occurred"
        | "accepted"
      lb_source_type:
        | "slack_channel"
        | "teams_channel"
        | "google_meet"
        | "zoom"
        | "email_thread"
        | "manual_upload"
        | "webhook"
        | "google_chat"
        | "discord"
      lb_transcript_status:
        | "pending"
        | "processing"
        | "transcribed"
        | "completed"
        | "failed"
      lb_user_role: "admin" | "manager" | "member" | "viewer" | "guest"
      rv_colaborador_tipo:
        | "vendas"
        | "laboratorio"
        | "orcamentista"
        | "representante"
        | "lider"
        | "apoio"
        | "central"
        | "supervisao"
        | "estagiario"
      rv_componente_manual:
        | "orcamentista"
        | "revitalize"
        | "lab_producao"
        | "deducao_quebra_caixa"
        | "deducao_receita_344"
        | "deducao_glosa"
        | "deducao_inventario"
        | "bonus_nao_faltou_remove"
        | "zerado_admin"
        | "mkt"
        | "ajuste"
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
      app_role: [
        "admin",
        "operador",
        "lider",
        "viewer",
        "financeiro",
        "operador_lab",
      ],
      lb_action_status: [
        "detected",
        "pending_validation",
        "validated",
        "assigned",
        "in_progress",
        "blocked",
        "waiting_input",
        "in_review",
        "done",
        "done_unverified",
        "canceled",
        "archived",
      ],
      lb_audit_action: [
        "created",
        "updated",
        "deleted",
        "validated",
        "discarded",
        "merged",
        "reclassified",
        "escalated",
        "auto_approved",
      ],
      lb_blocker_severity: ["critical", "high", "medium", "low"],
      lb_blocker_status: ["active", "resolving", "resolved"],
      lb_decision_status: [
        "proposed",
        "active",
        "superseded",
        "reverted",
        "archived",
      ],
      lb_decision_type: ["strategic", "tactical", "operational", "technical"],
      lb_dependency_status: ["pending", "in_progress", "fulfilled", "broken"],
      lb_dependency_type: ["same_team", "cross_team", "external"],
      lb_evidence_type: [
        "transcript_segment",
        "message",
        "url",
        "file",
        "commit",
        "deploy",
        "text_note",
      ],
      lb_follow_up_status: ["pending", "done", "overdue", "canceled"],
      lb_impact_level: ["high", "medium", "low"],
      lb_integration_provider: [
        "slack",
        "teams",
        "google_meet",
        "zoom",
        "gmail",
        "outlook",
        "google_calendar",
        "outlook_calendar",
        "jira",
        "linear",
        "github",
        "notion",
        "webhook",
      ],
      lb_integration_status: ["active", "paused", "error", "disconnected"],
      lb_notification_channel: ["in_app", "email", "slack", "teams"],
      lb_notification_type: [
        "validation_needed",
        "task_assigned",
        "task_overdue",
        "follow_up_due",
        "blocker_escalation",
        "decision_conflict",
        "digest",
        "mention",
      ],
      lb_origin_type: ["meeting", "conversation", "decision", "manual"],
      lb_plan_type: ["free", "starter", "professional", "enterprise"],
      lb_priority: ["critical", "high", "medium", "low"],
      lb_project_status: ["active", "paused", "completed", "archived"],
      lb_reversibility: ["irreversible", "costly", "easy"],
      lb_risk_status: [
        "identified",
        "mitigating",
        "mitigated",
        "occurred",
        "accepted",
      ],
      lb_source_type: [
        "slack_channel",
        "teams_channel",
        "google_meet",
        "zoom",
        "email_thread",
        "manual_upload",
        "webhook",
        "google_chat",
        "discord",
      ],
      lb_transcript_status: [
        "pending",
        "processing",
        "transcribed",
        "completed",
        "failed",
      ],
      lb_user_role: ["admin", "manager", "member", "viewer", "guest"],
      rv_colaborador_tipo: [
        "vendas",
        "laboratorio",
        "orcamentista",
        "representante",
        "lider",
        "apoio",
        "central",
        "supervisao",
        "estagiario",
      ],
      rv_componente_manual: [
        "orcamentista",
        "revitalize",
        "lab_producao",
        "deducao_quebra_caixa",
        "deducao_receita_344",
        "deducao_glosa",
        "deducao_inventario",
        "bonus_nao_faltou_remove",
        "zerado_admin",
        "mkt",
        "ajuste",
      ],
    },
  },
} as const
