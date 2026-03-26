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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      contratos: {
        Row: {
          actualizado_en: string
          creado_en: string
          estado: Database["public"]["Enums"]["estado_contrato"]
          fecha_fin: string
          fecha_inicio: string
          garante_id: string | null
          ia_analisis_raw: Json | null
          ia_analisis_resultado: Json | null
          ia_confianza: number | null
          id: string
          indice_ajuste: Database["public"]["Enums"]["indice_ajuste"]
          inquilino_id: string
          monto_actual: number
          monto_deposito: number | null
          monto_inicial: number
          organizacion_id: string
          periodo_ajuste_meses: number
          propiedad_id: string
          proxima_fecha_ajuste: string | null
          vencimiento_seguro_incendio: string | null
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_contrato"]
          fecha_fin: string
          fecha_inicio: string
          garante_id?: string | null
          ia_analisis_raw?: Json | null
          ia_analisis_resultado?: Json | null
          ia_confianza?: number | null
          id?: string
          indice_ajuste?: Database["public"]["Enums"]["indice_ajuste"]
          inquilino_id: string
          monto_actual: number
          monto_deposito?: number | null
          monto_inicial: number
          organizacion_id: string
          periodo_ajuste_meses?: number
          propiedad_id: string
          proxima_fecha_ajuste?: string | null
          vencimiento_seguro_incendio?: string | null
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_contrato"]
          fecha_fin?: string
          fecha_inicio?: string
          garante_id?: string | null
          ia_analisis_raw?: Json | null
          ia_analisis_resultado?: Json | null
          ia_confianza?: number | null
          id?: string
          indice_ajuste?: Database["public"]["Enums"]["indice_ajuste"]
          inquilino_id?: string
          monto_actual?: number
          monto_deposito?: number | null
          monto_inicial?: number
          organizacion_id?: string
          periodo_ajuste_meses?: number
          propiedad_id?: string
          proxima_fecha_ajuste?: string | null
          vencimiento_seguro_incendio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_garante_id_fkey"
            columns: ["garante_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_inquilino_id_fkey"
            columns: ["inquilino_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          actualizado_en: string
          contrato_id: string
          creado_en: string
          estado: Database["public"]["Enums"]["estado_documento"]
          id: string
          organizacion_id: string
          ruta_archivo: string | null
          tipo_documento: Database["public"]["Enums"]["tipo_documento"]
          verificado_por: string | null
        }
        Insert: {
          actualizado_en?: string
          contrato_id: string
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_documento"]
          id?: string
          organizacion_id: string
          ruta_archivo?: string | null
          tipo_documento: Database["public"]["Enums"]["tipo_documento"]
          verificado_por?: string | null
        }
        Update: {
          actualizado_en?: string
          contrato_id?: string
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_documento"]
          id?: string
          organizacion_id?: string
          ruta_archivo?: string | null
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"]
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_verificado_por_fkey"
            columns: ["verificado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      indices_ajuste: {
        Row: {
          anio: number
          creado_en: string
          id: string
          mes: number
          tipo_indice: Database["public"]["Enums"]["indice_ajuste"]
          valor_tasa: number
        }
        Insert: {
          anio: number
          creado_en?: string
          id?: string
          mes: number
          tipo_indice: Database["public"]["Enums"]["indice_ajuste"]
          valor_tasa: number
        }
        Update: {
          anio?: number
          creado_en?: string
          id?: string
          mes?: number
          tipo_indice?: Database["public"]["Enums"]["indice_ajuste"]
          valor_tasa?: number
        }
        Relationships: []
      }
      organizaciones: {
        Row: {
          actualizado_en: string
          configuracion: Json
          creado_en: string
          cuit: string | null
          direccion: string | null
          email: string | null
          id: string
          logo_url: string | null
          nombre: string
          plan: string
          plan_vence_en: string | null
          slug: string
          telefono: string | null
        }
        Insert: {
          actualizado_en?: string
          configuracion?: Json
          creado_en?: string
          cuit?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          nombre: string
          plan?: string
          plan_vence_en?: string | null
          slug: string
          telefono?: string | null
        }
        Update: {
          actualizado_en?: string
          configuracion?: Json
          creado_en?: string
          cuit?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          nombre?: string
          plan?: string
          plan_vence_en?: string | null
          slug?: string
          telefono?: string | null
        }
        Relationships: []
      }
      perfiles: {
        Row: {
          activo: boolean
          actualizado_en: string
          apellido: string
          avatar_url: string | null
          creado_en: string
          dni: string | null
          id: string
          nombre: string
          organizacion_id: string
          preferencias_notificacion: Json
          rol: Database["public"]["Enums"]["rol_usuario"]
          telefono: string | null
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          apellido: string
          avatar_url?: string | null
          creado_en?: string
          dni?: string | null
          id: string
          nombre: string
          organizacion_id: string
          preferencias_notificacion?: Json
          rol: Database["public"]["Enums"]["rol_usuario"]
          telefono?: string | null
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          apellido?: string
          avatar_url?: string | null
          creado_en?: string
          dni?: string | null
          id?: string
          nombre?: string
          organizacion_id?: string
          preferencias_notificacion?: Json
          rol?: Database["public"]["Enums"]["rol_usuario"]
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      propiedades: {
        Row: {
          actualizado_en: string
          barrio: string | null
          calle: string
          ciudad: string
          codigo_postal: string | null
          creado_en: string
          depto: string | null
          id: string
          inmobiliario_id: string | null
          numero: string
          organizacion_id: string
          piso: string | null
          propietario_id: string
          provincia: string
          tipo_propiedad: string
        }
        Insert: {
          actualizado_en?: string
          barrio?: string | null
          calle: string
          ciudad: string
          codigo_postal?: string | null
          creado_en?: string
          depto?: string | null
          id?: string
          inmobiliario_id?: string | null
          numero: string
          organizacion_id: string
          piso?: string | null
          propietario_id: string
          provincia?: string
          tipo_propiedad?: string
        }
        Update: {
          actualizado_en?: string
          barrio?: string | null
          calle?: string
          ciudad?: string
          codigo_postal?: string | null
          creado_en?: string
          depto?: string | null
          id?: string
          inmobiliario_id?: string | null
          numero?: string
          organizacion_id?: string
          piso?: string | null
          propietario_id?: string
          provincia?: string
          tipo_propiedad?: string
        }
        Relationships: [
          {
            foreignKeyName: "propiedades_inmobiliario_id_fkey"
            columns: ["inmobiliario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propiedades_organizacion_id_fkey"
            columns: ["organizacion_id"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propiedades_propietario_id_fkey"
            columns: ["propietario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      es_administrador: { Args: never; Returns: boolean }
      get_organizacion_id: { Args: never; Returns: string }
      get_rol_usuario: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_usuario"]
      }
      tiene_rol: {
        Args: { roles: Database["public"]["Enums"]["rol_usuario"][] }
        Returns: boolean
      }
    }
    Enums: {
      canal_notificacion: "email" | "whatsapp" | "push"
      concepto_pago:
        | "alquiler"
        | "expensas_ordinarias"
        | "expensas_extraordinarias"
        | "agua"
        | "electricidad"
        | "gas"
        | "municipal"
        | "otro"
      estado_contrato:
        | "borrador"
        | "activo"
        | "por_vencer"
        | "vencido"
        | "rescindido"
      estado_documento:
        | "pendiente"
        | "subido"
        | "verificado"
        | "rechazado"
        | "vencido"
      estado_notificacion: "en_cola" | "enviado" | "fallido" | "suprimido"
      estado_pago:
        | "pendiente"
        | "comprobante_subido"
        | "verificado"
        | "atrasado"
        | "disputado"
      estado_solicitud:
        | "abierto"
        | "clasificado"
        | "asignado"
        | "en_proceso"
        | "resuelto"
        | "cerrado"
      indice_ajuste: "ipc" | "icl" | "fijo"
      responsable_mantenimiento:
        | "inquilino"
        | "propietario"
        | "consorcio"
        | "indeterminado"
      rol_usuario:
        | "administrador"
        | "propietario"
        | "inquilino"
        | "inmobiliario"
      tipo_documento:
        | "contrato"
        | "dni_inquilino"
        | "dni_garante"
        | "escritura_garantia"
        | "informe_garantia"
        | "seguro_incendio"
        | "poliza_alternativa"
        | "ficha_garante"
        | "recibo_deposito"
        | "otro"
      tipo_notificacion:
        | "recordatorio_pago"
        | "pago_vencido"
        | "pago_vencido_garante"
        | "pago_recibido"
        | "aviso_ajuste"
        | "contrato_por_vencer"
        | "seguro_incendio_pendiente"
        | "documentos_faltantes"
        | "actualizacion_mantenimiento"
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
      canal_notificacion: ["email", "whatsapp", "push"],
      concepto_pago: [
        "alquiler",
        "expensas_ordinarias",
        "expensas_extraordinarias",
        "agua",
        "electricidad",
        "gas",
        "municipal",
        "otro",
      ],
      estado_contrato: [
        "borrador",
        "activo",
        "por_vencer",
        "vencido",
        "rescindido",
      ],
      estado_documento: [
        "pendiente",
        "subido",
        "verificado",
        "rechazado",
        "vencido",
      ],
      estado_notificacion: ["en_cola", "enviado", "fallido", "suprimido"],
      estado_pago: [
        "pendiente",
        "comprobante_subido",
        "verificado",
        "atrasado",
        "disputado",
      ],
      estado_solicitud: [
        "abierto",
        "clasificado",
        "asignado",
        "en_proceso",
        "resuelto",
        "cerrado",
      ],
      indice_ajuste: ["ipc", "icl", "fijo"],
      responsable_mantenimiento: [
        "inquilino",
        "propietario",
        "consorcio",
        "indeterminado",
      ],
      rol_usuario: [
        "administrador",
        "propietario",
        "inquilino",
        "inmobiliario",
      ],
      tipo_documento: [
        "contrato",
        "dni_inquilino",
        "dni_garante",
        "escritura_garantia",
        "informe_garantia",
        "seguro_incendio",
        "poliza_alternativa",
        "ficha_garante",
        "recibo_deposito",
        "otro",
      ],
      tipo_notificacion: [
        "recordatorio_pago",
        "pago_vencido",
        "pago_vencido_garante",
        "pago_recibido",
        "aviso_ajuste",
        "contrato_por_vencer",
        "seguro_incendio_pendiente",
        "documentos_faltantes",
        "actualizacion_mantenimiento",
      ],
    },
  },
} as const

// ── Aliases de conveniencia ───────────────────────────────────────────────────
export type Perfil           = Tables<'perfiles'>
export type Organizacion     = Tables<'organizaciones'>
export type Propiedad        = Tables<'propiedades'>
export type Contrato         = Tables<'contratos'>
export type Documento        = Tables<'documentos'>
export type IndiceAjusteRow  = Tables<'indices_ajuste'>

export type RolUsuario        = Enums<'rol_usuario'>
export type EstadoContrato    = Enums<'estado_contrato'>
export type EstadoDocumento   = Enums<'estado_documento'>
export type TipoDocumento     = Enums<'tipo_documento'>
export type IndiceAjusteTipo  = Enums<'indice_ajuste'>
