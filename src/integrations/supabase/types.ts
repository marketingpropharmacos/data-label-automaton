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
