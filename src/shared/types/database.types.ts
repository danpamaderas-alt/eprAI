/* eslint-disable */
// @ts-nocheck
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      "3d_materials_stock": {
        Row: {
          brand: string | null
          color_hex: string | null
          cost_per_kg: number | null
          id: string
          material_name: string
          remaining_grams: number
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          color_hex?: string | null
          cost_per_kg?: number | null
          id?: string
          material_name: string
          remaining_grams: number
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          color_hex?: string | null
          cost_per_kg?: number | null
          id?: string
          material_name?: string
          remaining_grams?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      account_movements: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string | null
          customer_id: string | null
          date: string | null
          description: string | null
          id: string
          movement_type: string
          origin_reference: string | null
        }
        Insert: {
          amount?: number
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          date?: string | null
          description?: string | null
          id?: string
          movement_type: string
          origin_reference?: string | null
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          date?: string | null
          description?: string | null
          id?: string
          movement_type?: string
          origin_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_movements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_movements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      business_units: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      client_gifts: {
        Row: {
          created_at: string | null
          customer_id: string
          delivery_date: string
          gift_type: string
          id: string
          message_tone: string
          notes: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          delivery_date: string
          gift_type: string
          id?: string
          message_tone: string
          notes?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          delivery_date?: string
          gift_type?: string
          id?: string
          message_tone?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_gifts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_gifts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      client_movements: {
        Row: {
          address: string | null
          amount: number
          concept: string | null
          created_at: string | null
          cuit: string | null
          customer_id: string | null
          description: string | null
          hint: string | null
          id: string
          type: string | null
        }
        Insert: {
          address?: string | null
          amount: number
          concept?: string | null
          created_at?: string | null
          cuit?: string | null
          customer_id?: string | null
          description?: string | null
          hint?: string | null
          id?: string
          type?: string | null
        }
        Update: {
          address?: string | null
          amount?: number
          concept?: string | null
          created_at?: string | null
          cuit?: string | null
          customer_id?: string | null
          description?: string | null
          hint?: string | null
          id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_movements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_movements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      colors: {
        Row: {
          created_at: string | null
          hex_code: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          hex_code?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          hex_code?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      companies: {

        Row: {
          address: string | null
          city: string | null
          commercial_name: string | null
          created_at: string | null
          default_currency: string | null
          email: string | null
          fiscal_condition: string | null
          id: string
          logo_url: string | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          tax_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          commercial_name?: string | null
          created_at?: string | null
          default_currency?: string | null
          email?: string | null
          fiscal_condition?: string | null
          id?: string
          logo_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          tax_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          commercial_name?: string | null
          created_at?: string | null
          default_currency?: string | null
          email?: string | null
          fiscal_condition?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          tax_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      custom_orders: {
        Row: {
          created_at: string | null
          customer_id: string | null
          delivery_date: string | null
          id: string
          order_type: string
          specifications: Json
          status: string | null
          total_price: number
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          delivery_date?: string | null
          id?: string
          order_type: string
          specifications: Json
          status?: string | null
          total_price: number
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          delivery_date?: string | null
          id?: string
          order_type?: string
          specifications?: Json
          status?: string | null
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      customer_debts: {
        Row: {
          address: string | null
          created_at: string | null
          cuit: string | null
          customer_id: string | null
          description: string | null
          id: string
          remaining_balance: number
          status: string | null
          total_amount: number
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          cuit?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          remaining_balance: number
          status?: string | null
          total_amount: number
        }
        Update: {
          address?: string | null
          created_at?: string | null
          cuit?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          remaining_balance?: number
          status?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_debts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_debts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          balance: number | null
          company: string | null
          company_id: string | null
          created_at: string | null
          cuit: string | null
          email: string | null
          id: string
          loyalty_points: number | null
          name: string
          notes: string | null
          phone: string | null
          portal_access: boolean | null
          is_supplier: boolean | null
          whatsapp_id: string | null
          email_primary: string | null
          instagram_handle: string | null
          facebook_id: string | null
          type: string
        }
        Insert: {
          address?: string | null
          balance?: number | null
          company?: string | null
          company_id?: string | null
          created_at?: string | null
          cuit?: string | null
          email?: string | null
          id?: string
          loyalty_points?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          portal_access?: boolean | null
          is_supplier?: boolean | null
          whatsapp_id?: string | null
          email_primary?: string | null
          instagram_handle?: string | null
          facebook_id?: string | null
          type: string
        }
        Update: {
          address?: string | null
          balance?: number | null
          company?: string | null
          company_id?: string | null
          created_at?: string | null
          cuit?: string | null
          email?: string | null
          id?: string
          loyalty_points?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          portal_access?: boolean | null
          is_supplier?: boolean | null
          whatsapp_id?: string | null
          email_primary?: string | null
          instagram_handle?: string | null
          facebook_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_interactions: {
        Row: {
          id: string
          customer_id: string
          company_id: string
          channel: string
          direction: string
          content: string
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          company_id: string
          channel: string
          direction: string
          content: string
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          company_id?: string
          channel?: string
          direction?: string
          content?: string
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points_history: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          order_id: string | null
          points_change: number
          reason: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          order_id?: string | null
          points_change: number
          reason: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          order_id?: string | null
          points_change?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_points_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      portal_users: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_users_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      deals: {

        Row: {
          client_id: string | null
          company_id: string | null
          created_at: string | null
          expected_revenue: number | null
          id: string
          notes: string | null
          status: string | null
          title: string
        }
        Insert: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string | null
          expected_revenue?: number | null
          id?: string
          notes?: string | null
          status?: string | null
          title: string
        }
        Update: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string | null
          expected_revenue?: number | null
          id?: string
          notes?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      debt_payments: {
        Row: {
          amount: number
          debt_id: string | null
          id: string
          payment_date: string | null
          payment_method: string
        }
        Insert: {
          amount: number
          debt_id?: string | null
          id?: string
          payment_date?: string | null
          payment_method: string
        }
        Update: {
          amount?: number
          debt_id?: string | null
          id?: string
          payment_date?: string | null
          payment_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "customer_debts"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {

        Row: {
          address: string
          company_id: string | null
          created_at: string | null
          customer_name: string
          id: string
          items_description: string
          notes: string | null
          phone: string | null
          status: string | null
          zone: string
        }
        Insert: {
          address: string
          company_id?: string | null
          created_at?: string | null
          customer_name: string
          id?: string
          items_description: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          zone: string
        }
        Update: {
          address?: string
          company_id?: string | null
          created_at?: string | null
          customer_name?: string
          id?: string
          items_description?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          zone?: string
        }
        Relationships: []
      }
      deportiva_inventario: {
        Row: {
          created_at: string
          estado: string | null
          id: number
          nombre: string
          precio: number
          stock_talles: Json | null
          stock_total: number
          tecnica_estampado: string
          tela: string
        }
        Insert: {
          created_at?: string
          estado?: string | null
          id?: never
          nombre: string
          precio?: number
          stock_talles?: Json | null
          stock_total?: number
          tecnica_estampado: string
          tela: string
        }
        Update: {
          created_at?: string
          estado?: string | null
          id?: never
          nombre?: string
          precio?: number
          stock_talles?: Json | null
          stock_total?: number
          tecnica_estampado?: string
          tela?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          company_id: string
          created_at: string | null
          description: string
          expense_date: string | null
          id: string
        }
        Insert: {
          amount?: number
          category: string
          company_id: string
          created_at?: string | null
          description: string
          expense_date?: string | null
          id?: string
        }
        Update: {
          amount?: number
          category?: string
          company_id?: string
          created_at?: string | null
          description?: string
          expense_date?: string | null
          id?: string
        }
        Relationships: []
      }
      inventario_central: {
        Row: {
          activo: boolean | null
          cantidad: number | null
          color: string | null
          estado_produccion: string | null
          id: number
          imagen_url: string | null
          precio: number | null
          producto_id: number | null
          sku: string | null
          talle: string | null
          tipo: string | null
        }
        Insert: {
          activo?: boolean | null
          cantidad?: number | null
          color?: string | null
          estado_produccion?: string | null
          id?: number
          imagen_url?: string | null
          precio?: number | null
          producto_id?: number | null
          sku?: string | null
          talle?: string | null
          tipo?: string | null
        }
        Update: {
          activo?: boolean | null
          cantidad?: number | null
          color?: string | null
          estado_produccion?: string | null
          id?: number
          imagen_url?: string | null
          precio?: number | null
          producto_id?: number | null
          sku?: string | null
          talle?: string | null
          tipo?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          color: string
          id: string
          last_updated: string | null
          product_id: string | null
          quantity: number
          size: string
        }
        Insert: {
          color: string
          id?: string
          last_updated?: string | null
          product_id?: string | null
          quantity?: number
          size: string
        }
        Update: {
          color?: string
          id?: string
          last_updated?: string | null
          product_id?: string | null
          quantity?: number
          size?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      movement_audit_log: {
        Row: {
          action: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          movement_id: string | null
          new_data: Json | null
          old_data: Json | null
        }
        Insert: {
          action?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          movement_id?: string | null
          new_data?: Json | null
          old_data?: Json | null
        }
        Update: {
          action?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          movement_id?: string | null
          new_data?: Json | null
          old_data?: Json | null
        }
        Relationships: []
      }
      mockup_templates: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          print_area_height_mm: number | null
          print_area_width_mm: number | null
          product_type: string
          template_image: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          print_area_height_mm?: number | null
          print_area_width_mm?: number | null
          product_type?: string
          template_image?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          print_area_height_mm?: number | null
          print_area_width_mm?: number | null
          product_type?: string
          template_image?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mockup_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      niches: {

        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string | null
          quantity: number
          subtotal: number | null
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          id?: string
          order_id?: string | null
          quantity: number
          subtotal?: number | null
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          id?: string
          order_id?: string | null
          quantity?: number
          subtotal?: number | null
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {

        Row: {
          activity_log: Json
          advance_payment: number | null
          business_unit: string
          company_id: string | null
          created_at: string | null
          current_balance: number | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          delivery_history: Json | null
          design_approved_at: string | null
          design_client_approved: boolean | null
          design_id: string | null
          design_product: string | null
          design_verdict: string | null
          due_date: string | null
          id: string
          internal_notes: string | null
          items: Json
          notes: Json
          paid_amount: number | null
          payments: Json
          photos: Json
          priority: string | null
          production_stage: string | null
          status: string | null
          total_amount: number | null
        }
        Insert: {
          activity_log?: Json
          advance_payment?: number | null
          business_unit: string
          company_id?: string | null
          created_at?: string | null
          current_balance?: number | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          delivery_history?: Json | null
          design_approved_at?: string | null
          design_client_approved?: boolean | null
          design_id?: string | null
          design_product?: string | null
          design_verdict?: string | null
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          items?: Json
          notes?: Json
          paid_amount?: number | null
          payments?: Json
          photos?: Json
          priority?: string | null
          production_stage?: string | null
          status?: string | null
          total_amount?: number | null
        }
        Update: {
          activity_log?: Json
          advance_payment?: number | null
          business_unit?: string
          company_id?: string | null
          created_at?: string | null
          current_balance?: number | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_history?: Json | null
          design_approved_at?: string | null
          design_client_approved?: boolean | null
          design_id?: string | null
          design_product?: string | null
          design_verdict?: string | null
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          items?: Json
          notes?: Json
          paid_amount?: number | null
          payments?: Json
          photos?: Json
          priority?: string | null
          production_stage?: string | null
          status?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      packaging_supplies: {
        Row: {
          company_id: string
          current_qty: number | null
          id: string
          item_name: string
          min_alert: number | null
        }
        Insert: {
          company_id: string
          current_qty?: number | null
          id?: string
          item_name: string
          min_alert?: number | null
        }
        Update: {
          company_id?: string
          current_qty?: number | null
          id?: string
          item_name?: string
          min_alert?: number | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      personalization_types: {

        Row: {
          base_price: number | null
          company_id: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          base_price?: number | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          base_price?: number | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      product_recipes: {
        Row: {
          created_at: string | null
          id: string
          material_id: string | null
          product_id: string | null
          quantity_required: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          material_id?: string | null
          product_id?: string | null
          quantity_required: number
        }
        Update: {
          created_at?: string | null
          id?: string
          material_id?: string | null
          product_id?: string | null
          quantity_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_recipes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          base_quantity: number | null
          color_id: string | null
          finished_quantity: number | null
          id: string
          product_id: string | null
          size_id: string | null
          stock_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          base_quantity?: number | null
          color_id?: string | null
          finished_quantity?: number | null
          id?: string
          product_id?: string | null
          size_id?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          base_quantity?: number | null
          color_id?: string | null
          finished_quantity?: number | null
          id?: string
          product_id?: string | null
          size_id?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      productos_3d: {
        Row: {
          categoria: string | null
          descripcion: string | null
          id: string
          imagen: string | null
          nombre: string
          precio: number
          stock: number | null
        }
        Insert: {
          categoria?: string | null
          descripcion?: string | null
          id?: string
          imagen?: string | null
          nombre: string
          precio: number
          stock?: number | null
        }
        Update: {
          categoria?: string | null
          descripcion?: string | null
          id?: string
          imagen?: string | null
          nombre?: string
          precio?: number
          stock?: number | null
        }
        Relationships: []
      }
      productos_textil: {
        Row: {
          categoria: string | null
          descripcion: string | null
          id: string
          imagen: string | null
          nombre: string
          precio: number
          stock: number | null
          tela: string | null
        }
        Insert: {
          categoria?: string | null
          descripcion?: string | null
          id?: string
          imagen?: string | null
          nombre: string
          precio: number
          stock?: number | null
          tela?: string | null
        }
        Update: {
          categoria?: string | null
          descripcion?: string | null
          id?: string
          imagen?: string | null
          nombre?: string
          precio?: number
          stock?: number | null
          tela?: string | null
        }
        Relationships: []
      }
      print_model_files: {
        Row: {
          company_id: string | null
          created_at: string | null
          file_name: string
          format: string | null
          id: string
          kind: string
          model_id: string
          printer_name: string | null
          size_bytes: number | null
          storage_path: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          file_name: string
          format?: string | null
          id?: string
          kind?: string
          model_id: string
          printer_name?: string | null
          size_bytes?: number | null
          storage_path: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          file_name?: string
          format?: string | null
          id?: string
          kind?: string
          model_id?: string
          printer_name?: string | null
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_model_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_model_files_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "print_models"
            referencedColumns: ["id"]
          },
        ]
      }
      print_filaments: {
        Row: {
          brand: string
          color_hex: string | null
          color_name: string | null
          company_id: string | null
          cost_per_kg: number | null
          created_at: string | null
          id: string
          material: string
          min_stock_g: number
          notes: string | null
          provider: string | null
          remaining_g: number
          spool_weight_g: number
          updated_at: string | null
        }
        Insert: {
          brand?: string
          color_hex?: string | null
          color_name?: string | null
          company_id?: string | null
          cost_per_kg?: number | null
          created_at?: string | null
          id?: string
          material?: string
          min_stock_g?: number
          notes?: string | null
          provider?: string | null
          remaining_g?: number
          spool_weight_g?: number
          updated_at?: string | null
        }
        Update: {
          brand?: string
          color_hex?: string | null
          color_name?: string | null
          company_id?: string | null
          cost_per_kg?: number | null
          created_at?: string | null
          id?: string
          material?: string
          min_stock_g?: number
          notes?: string | null
          provider?: string | null
          remaining_g?: number
          spool_weight_g?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_filaments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      print_jobs_3d: {
        Row: {
          actual_cost_total: number | null
          actual_notes: string | null
          actual_time_h: number | null
          actual_weight_g: number | null
          company_id: string | null
          completed_at: string | null
          created_at: string
          est_cost_total: number | null
          est_price_total: number | null
          est_time_h: number | null
          est_weight_g: number | null
          filament_id: string | null
          filament_label: string | null
          id: string
          inputs: Json
          model_id: string | null
          name: string
          printer_name: string | null
          quantity: number
          remito_id: string | null
          sale_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          actual_cost_total?: number | null
          actual_notes?: string | null
          actual_time_h?: number | null
          actual_weight_g?: number | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          est_cost_total?: number | null
          est_price_total?: number | null
          est_time_h?: number | null
          est_weight_g?: number | null
          filament_id?: string | null
          filament_label?: string | null
          id?: string
          inputs?: Json
          model_id?: string | null
          name?: string
          printer_name?: string | null
          quantity?: number
          remito_id?: string | null
          sale_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          actual_cost_total?: number | null
          actual_notes?: string | null
          actual_time_h?: number | null
          actual_weight_g?: number | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          est_cost_total?: number | null
          est_price_total?: number | null
          est_time_h?: number | null
          est_weight_g?: number | null
          filament_id?: string | null
          filament_label?: string | null
          id?: string
          inputs?: Json
          model_id?: string | null
          name?: string
          printer_name?: string | null
          quantity?: number
          remito_id?: string | null
          sale_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_jobs_3d_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_3d_filament_id_fkey"
            columns: ["filament_id"]
            isOneToOne: false
            referencedRelation: "print_filaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_3d_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "print_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_3d_remito_id_fkey"
            columns: ["remito_id"]
            isOneToOne: false
            referencedRelation: "remitos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_jobs_3d_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sublimation_jobs: {
        Row: {
          actual_cost_total: number | null
          actual_notes: string | null
          blank_id: string | null
          blank_label: string | null
          company_id: string | null
          completed_at: string | null
          created_at: string
          design_id: string | null
          est_cost_total: number | null
          est_price_total: number | null
          id: string
          inputs: Json
          name: string
          quantity: number
          remito_id: string | null
          sale_id: string | null
          size_label: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          actual_cost_total?: number | null
          actual_notes?: string | null
          blank_id?: string | null
          blank_label?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          design_id?: string | null
          est_cost_total?: number | null
          est_price_total?: number | null
          id?: string
          inputs?: Json
          name?: string
          quantity?: number
          remito_id?: string | null
          sale_id?: string | null
          size_label?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          actual_cost_total?: number | null
          actual_notes?: string | null
          blank_id?: string | null
          blank_label?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          design_id?: string | null
          est_cost_total?: number | null
          est_price_total?: number | null
          id?: string
          inputs?: Json
          name?: string
          quantity?: number
          remito_id?: string | null
          sale_id?: string | null
          size_label?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sublimation_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sublimation_jobs_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "sublimation_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sublimation_jobs_blank_id_fkey"
            columns: ["blank_id"]
            isOneToOne: false
            referencedRelation: "textile_blanks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sublimation_jobs_remito_id_fkey"
            columns: ["remito_id"]
            isOneToOne: false
            referencedRelation: "remitos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sublimation_jobs_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      print_models: {
        Row: {
          category: string
          company_id: string | null
          created_at: string | null
          estimated_grams: number | null
          estimated_time_hours: number | null
          id: string
          imagen: string | null
          infill: number | null
          layer_height: number | null
          link_descarga: string | null
          material: string | null
          name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          company_id?: string | null
          created_at?: string | null
          estimated_grams?: number | null
          estimated_time_hours?: number | null
          id?: string
          imagen?: string | null
          infill?: number | null
          layer_height?: number | null
          link_descarga?: string | null
          material?: string | null
          name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          company_id?: string | null
          created_at?: string | null
          estimated_grams?: number | null
          estimated_time_hours?: number | null
          id?: string
          imagen?: string | null
          infill?: number | null
          layer_height?: number | null
          link_descarga?: string | null
          material?: string | null
          name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_models_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sublimation_designs: {
        Row: {
          atribucion_requerida: boolean | null
          background: string | null
          bundle_count: number | null
          category: string
          company_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          designer: string | null
          dimensions: string | null
          dpi: number | null
          file_format: string | null
          file_size_mb: number | null
          id: string
          imagen: string | null
          license_date: string | null
          license_file: string | null
          license_type: string | null
          link_descarga: string | null
          name: string
          notes: string | null
          origin: string | null
          platform: string | null
          pod_nivel: string | null
          pod_permitido: boolean | null
          price: number | null
          project_dest: string | null
          purchase_date: string | null
          status: string
          tags: string | null
          updated_at: string | null
          url_original: string | null
          ventas_limit: number | null
        }
        Insert: {
          atribucion_requerida?: boolean | null
          background?: string | null
          bundle_count?: number | null
          category?: string
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          designer?: string | null
          dimensions?: string | null
          dpi?: number | null
          file_format?: string | null
          file_size_mb?: number | null
          id?: string
          imagen?: string | null
          license_date?: string | null
          license_file?: string | null
          license_type?: string | null
          link_descarga?: string | null
          name: string
          notes?: string | null
          origin?: string | null
          platform?: string | null
          pod_nivel?: string | null
          pod_permitido?: boolean | null
          price?: number | null
          project_dest?: string | null
          purchase_date?: string | null
          status?: string
          tags?: string | null
          updated_at?: string | null
          url_original?: string | null
          ventas_limit?: number | null
        }
        Update: {
          atribucion_requerida?: boolean | null
          background?: string | null
          bundle_count?: number | null
          category?: string
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          designer?: string | null
          dimensions?: string | null
          dpi?: number | null
          file_format?: string | null
          file_size_mb?: number | null
          id?: string
          imagen?: string | null
          license_date?: string | null
          license_file?: string | null
          license_type?: string | null
          link_descarga?: string | null
          name?: string
          notes?: string | null
          origin?: string | null
          platform?: string | null
          pod_nivel?: string | null
          pod_permitido?: boolean | null
          price?: number | null
          project_dest?: string | null
          purchase_date?: string | null
          status?: string
          tags?: string | null
          updated_at?: string | null
          url_original?: string | null
          ventas_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sublimation_designs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      textile_blanks: {
        Row: {
          color: string | null
          company_id: string | null
          cost_price: number
          created_at: string | null
          id: string
          imagen: string | null
          min_stock: number
          name: string
          notes: string | null
          provider: string | null
          size: string | null
          stock_qty: number
          type: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          cost_price?: number
          created_at?: string | null
          id?: string
          imagen?: string | null
          min_stock?: number
          name: string
          notes?: string | null
          provider?: string | null
          size?: string | null
          stock_qty?: number
          type?: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string | null
          cost_price?: number
          created_at?: string | null
          id?: string
          imagen?: string | null
          min_stock?: number
          name?: string
          notes?: string | null
          provider?: string | null
          size?: string | null
          stock_qty?: number
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "textile_blanks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number | null
          base_stock_qty: number | null
          category: string
          company_id: string | null
          cost: number | null
          cost_price: number | null
          created_at: string
          estimated_print_time: number | null
          finished_stock_qty: number | null
          finishing_type: string | null
          id: string
          image_path: string | null
          is_active: boolean | null
          location: string | null
          material_type: string | null
          minStock: number
          name: string
          niche_id: string | null
          notes: string | null
          price: number
          purchase_price: number | null
          sku: string
          status: string
          stock: number
          unit_cost_base: number | null
          variations: Json
          weight_grams: number | null
        }
        Insert: {
          base_price?: number | null
          base_stock_qty?: number | null
          category: string
          company_id?: string | null
          cost?: number | null
          cost_price?: number | null
          created_at?: string
          estimated_print_time?: number | null
          finished_stock_qty?: number | null
          finishing_type?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean | null
          location?: string | null
          material_type?: string | null
          minStock?: number
          name: string
          niche_id?: string | null
          notes?: string | null
          price?: number
          purchase_price?: number | null
          sku: string
          status?: string
          stock?: number
          unit_cost_base?: number | null
          variations?: Json
          weight_grams?: number | null
        }
        Update: {
          base_price?: number | null
          base_stock_qty?: number | null
          category?: string
          company_id?: string | null
          cost?: number | null
          cost_price?: number | null
          created_at?: string
          estimated_print_time?: number | null
          finished_stock_qty?: number | null
          finishing_type?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean | null
          location?: string | null
          material_type?: string | null
          minStock?: number
          name?: string
          niche_id?: string | null
          notes?: string | null
          price?: number
          purchase_price?: number | null
          sku?: string
          status?: string
          stock?: number
          unit_cost_base?: number | null
          variations?: Json
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {

        Row: {
          company_id: string | null
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          description: string | null
          id: string
          product_id: string | null
          quantity: number | null
          quote_id: string | null
          subtotal: number | null
          unit_price: number | null
        }
        Insert: {
          description?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
          quote_id?: string | null
          subtotal?: number | null
          unit_price?: number | null
        }
        Update: {
          description?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
          quote_id?: string | null
          subtotal?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          company_id: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          items: Json | null
          notes: string | null
          quote_number: string
          status: string | null
          total: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          quote_number: string
          status?: string | null
          total?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          quote_number?: string
          status?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      raw_materials: {

        Row: {
          brand: string | null
          category: string
          color: string | null
          company_id: string
          composition: string | null
          created_at: string | null
          id: string
          image_url: string | null
          min_stock_alert: number | null
          name: string
          stock_quantity: number | null
          supplier_code: string | null
          unit_measure: string
        }
        Insert: {
          brand?: string | null
          category: string
          color?: string | null
          company_id: string
          composition?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          min_stock_alert?: number | null
          name: string
          stock_quantity?: number | null
          supplier_code?: string | null
          unit_measure: string
        }
        Update: {
          brand?: string | null
          category?: string
          color?: string | null
          company_id?: string
          composition?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          min_stock_alert?: number | null
          name?: string
          stock_quantity?: number | null
          supplier_code?: string | null
          unit_measure?: string
        }
        Relationships: []
      }
      services: {

        Row: {
          category: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          price: number | null
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          price?: number | null
        }
        Update: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sizes: {

        Row: {
          created_at: string | null
          id: string
          label: string | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          label?: string | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      supplier_debts: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          description: string
          due_date: string
          id: string
          paid_amount: number | null
          status: string
          supplier_id: string | null
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string | null
          description: string
          due_date: string
          id?: string
          paid_amount?: number | null
          status?: string
          supplier_id?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          description?: string
          due_date?: string
          id?: string
          paid_amount?: number | null
          status?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_debts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {

        Row: {
          address: string | null
          category: string | null
          company_id: string
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      '3d_materials_stock': {
        Row: {
          brand: string | null
          color_hex: string | null
          cost_per_kg: number | null
          id: string
          material_name: string
          remaining_grams: number
          updated_at: string | null
        }
        Insert: {
          brand: string | null
          color_hex: string | null
          cost_per_kg: number | null
          id?: string
          material_name: string
          remaining_grams: number
          updated_at: string | null
        }
        Update: {
          brand?: string | null
          color_hex?: string | null
          cost_per_kg?: number | null
          id?: string
          material_name?: string
          remaining_grams?: number
          updated_at?: string | null
        }
      }
      clients: {
        Row: {
          company_id: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          company_id: string | null
          created_at?: string | null
          email: string | null
          id?: string
          name: string
          phone: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_clients_company_id",
            columns: ["company_id"],
            isOneToOne: false,
            referencedRelation: "companies",
            referencedColumns: ["id"],
          },
        ]
      }
      remitos: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          customer: string | null
          date: string
          id: string
          items: Json
          notes: string | null
          number: string
          order_id: string | null
          status: string
          total: number
          view_type: string
        }
        Insert: {
          address: string | null
          company_id: string
          created_at?: string
          customer: string | null
          date?: string
          id?: string
          items?: Json
          notes: string | null
          number: string
          order_id: string | null
          status?: string
          total?: number
          view_type?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          customer?: string | null
          date?: string
          id?: string
          items?: Json
          notes?: string | null
          number?: string
          order_id?: string | null
          status?: string
          total?: number
          view_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "remitos_company_id_fkey",
            columns: ["company_id"],
            isOneToOne: false,
            referencedRelation: "companies",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "remitos_order_id_fkey",
            columns: ["order_id"],
            isOneToOne: false,
            referencedRelation: "orders",
            referencedColumns: ["id"],
          },
        ]
      }
      reseller_transactions: {
        Row: {
          amount: number | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          reseller_id: string | null
          type: string | null
        }
        Insert: {
          amount?: number | null
          company_id: string | null
          created_at?: string | null
          description: string | null
          id?: string
          reseller_id: string | null
          type: string | null
        }
        Update: {
          amount?: number | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reseller_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_reseller_transactions_resellerid",
            columns: ["reseller_id"],
            isOneToOne: false,
            referencedRelation: "resellers",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "reseller_transactions_company_id_fkey",
            columns: ["company_id"],
            isOneToOne: false,
            referencedRelation: "companies",
            referencedColumns: ["id"],
          },
        ]
      }
      resellers: {
        Row: {
          balance: number | null
          company_id: string | null
          created_at: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          balance?: number | null
          company_id: string | null
          created_at?: string | null
          id?: string
          name: string
          phone: string | null
        }
        Update: {
          balance?: number | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_resellers_company_id",
            columns: ["company_id"],
            isOneToOne: false,
            referencedRelation: "companies",
            referencedColumns: ["id"],
          },
        ]
      }
      sales: {
        Row: {
          business_unit: string | null
          company_id: string | null
          created_at: string | null
          customer_id: string | null
          date: string | null
          id: string
          items: Json | null
          payment_method: string | null
          status: string | null
          total: number | null
          total_amount: number | null
        }
        Insert: {
          business_unit: string | null
          company_id: string | null
          created_at?: string | null
          customer_id: string | null
          date: string | null
          id?: string
          items: Json | null
          payment_method: string | null
          status?: string | null
          total: number | null
          total_amount?: number | null
        }
        Update: {
          business_unit?: string | null
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          date?: string | null
          id?: string
          items?: Json | null
          payment_method?: string | null
          status?: string | null
          total?: number | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_company_id_fkey",
            columns: ["company_id"],
            isOneToOne: false,
            referencedRelation: "companies",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "sales_customer_id_fkey",
            columns: ["customer_id"],
            isOneToOne: false,
            referencedRelation: "customers",
            referencedColumns: ["id"],
          },
        ]
      }
      stock_movements: {
        Row: {
          color_id: string | null
          created_at: string | null
          id: string
          product_id: string | null
          quantity: number
          reason: string | null
          size_id: string | null
        }
        Insert: {
          color_id: string | null
          created_at?: string | null
          id?: string
          product_id: string | null
          quantity?: number
          reason: string | null
          size_id: string | null
        }
        Update: {
          color_id?: string | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          reason?: string | null
          size_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_color_id_fkey",
            columns: ["color_id"],
            isOneToOne: false,
            referencedRelation: "colors",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey",
            columns: ["product_id"],
            isOneToOne: false,
            referencedRelation: "products",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "stock_movements_size_id_fkey",
            columns: ["size_id"],
            isOneToOne: false,
            referencedRelation: "sizes",
            referencedColumns: ["id"],
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string | null
          description: string | null
          id: string
          type: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          type?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_customer_balances"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      treasury: {

        Row: {
          amount: number
          business_unit: string | null
          category: string | null
          company_id: string | null
          created_at: string | null
          date: string | null
          description: string | null
          id: string
          notes: string | null
          payment_method: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          amount: number
          business_unit?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          amount?: number
          business_unit?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: []
      }
      worker_tasks: {
        Row: {
          company_id: string
          created_at: string | null
          description: string
          id: string
          price_per_unit: number
          quantity: number
          status: string
          worker_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description: string
          id?: string
          price_per_unit: number
          quantity: number
          status?: string
          worker_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string
          id?: string
          price_per_unit?: number
          quantity?: number
          status?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_tasks_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          name: string
          phone: string | null
          role: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          role: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_customer_balances: {
        Row: {
          company_id: string | null
          current_balance: number | null
          customer_id: string | null
          customer_name: string | null
          total_debt: number | null
          total_paid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_treasury_summary: {

        Row: {
          company_id: string | null
          net_balance: number | null
          total_expense: number | null
          total_income: number | null
        }
        Relationships: []
      }
    }
Functions: {
      adjust_blank_stock: {
        Args: { p_blank_id: string; p_delta: number }
        Returns: number
      }
      award_loyalty_points: {
        Args: { p_customer_id: string; p_points: number; p_reason: string; p_order_id?: string | null }
        Returns: undefined
      }
      create_order_atomic: {
        Args: {
          order_payload?: unknown
          p_order?: unknown
          p_items?: unknown[]
        }
Returns: unknown
      }
      consume_filament_grams: {
        Args: { p_filament_id: string; p_grams: number }
        Returns: number
      }
      delete_product_variation: {
        Args: {
          p_variant_id?: string
          p_product_id?: string
          p_variation_id?: string
        }
        Returns: undefined
      }
      increment_stock: {
        Args: { c_id: string; increment_by: number; p_id: string; s_id: string }
        Returns: undefined
      }
      process_pos_sale_atomic: {
        Args: {
          p_customer_id: string | null
          p_cart: unknown[]
          p_total: number
          p_payment_method: string
          p_company_id: string | null
        }
        Returns: string
      }
      process_sale_atomic: {
        Args: { customer_id_param: string; cart_items: unknown[]; total_amount_param: number }
        Returns: undefined
      }
      redeem_loyalty_points: {
        Args: { p_customer_id: string; p_points: number; p_reason: string }
        Returns: undefined
      }
      register_partial_delivery: {
        Args: {
          p_order_id?: string
          p_delivery_data?: unknown
          p_quantity?: number
          p_items_delivered?: unknown
          p_notes?: string | null
        }
Returns: undefined
      }
      register_delivery_v2: {
        Args: { p_order_id: string; p_deliveries: unknown; p_log_entry?: unknown }
        Returns: undefined
      }
      transform_to_finished: {
        Args: { p_variant_id: string; p_quantity: number }
        Returns: undefined
      }
      update_customer_balance: {
        Args: { amount_param: number; id_param: string }
        Returns: undefined
      }
      update_product_stock_atomic: {
        Args: {
          p_variant_id?: string
          p_field?: string
          p_delta?: number
          p_product_id?: string
          p_new_stock?: number
          p_variation_id?: string | null
        }
        Returns: undefined
      }
      upsert_stock: {
        Args: { p_product_id: string; p_size_id: string; p_color_id: string; p_quantity: number }
        Returns: undefined
      }
    }
  }
}
