export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          twilio_phone_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          twilio_phone_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          twilio_phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          workspace_id: string
          email: string
          full_name: string | null
          role: 'owner' | 'manager' | 'employee'
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          email: string
          full_name?: string | null
          role?: 'owner' | 'manager' | 'employee'
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          workspace_id?: string
          email?: string
          full_name?: string | null
          role?: 'owner' | 'manager' | 'employee'
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'users_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          }
        ]
      }
      departments: {
        Row: {
          id: string
          workspace_id: string
          name: string
          color: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          color?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          workspace_id?: string
          name?: string
          color?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'departments_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          }
        ]
      }
      employees: {
        Row: {
          id: string
          workspace_id: string
          full_name: string
          phone: string
          email: string | null
          position: string | null
          active: boolean
          department_id: string | null
          availability_token: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          full_name: string
          phone: string
          email?: string | null
          position?: string | null
          active?: boolean
          department_id?: string | null
          availability_token?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          workspace_id?: string
          full_name?: string
          phone?: string
          email?: string | null
          position?: string | null
          active?: boolean
          department_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'employees_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employees_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          }
        ]
      }
      shift_templates: {
        Row: {
          id: string
          workspace_id: string
          name: string
          day_of_week: number
          days_of_week: number[] | null
          start_time: string
          end_time: string
          required_staff: number
          slots_required: number
          position: string | null
          active: boolean
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          day_of_week?: number
          days_of_week?: number[] | null
          start_time: string
          end_time: string
          required_staff?: number
          slots_required?: number
          position?: string | null
          active?: boolean
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          workspace_id?: string
          name?: string
          day_of_week?: number
          days_of_week?: number[] | null
          start_time?: string
          end_time?: string
          required_staff?: number
          slots_required?: number
          position?: string | null
          active?: boolean
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'shift_templates_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          }
        ]
      }
      schedule_periods: {
        Row: {
          id: string
          workspace_id: string
          start_date: string
          end_date: string
          status: 'draft' | 'active' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          start_date: string
          end_date: string
          status?: 'draft' | 'active' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          workspace_id?: string
          start_date?: string
          end_date?: string
          status?: 'draft' | 'active' | 'completed'
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'schedule_periods_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          }
        ]
      }
      schedule_entries: {
        Row: {
          id: string
          workspace_id: string
          period_id: string
          employee_id: string
          department_id: string | null
          date: string
          start_time: string | null
          end_time: string | null
          is_off: boolean
          needs_coverage: boolean
          coverage_note: string | null
          covered_by_employee_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          period_id: string
          employee_id: string
          department_id?: string | null
          date: string
          start_time?: string | null
          end_time?: string | null
          is_off?: boolean
          needs_coverage?: boolean
          coverage_note?: string | null
          covered_by_employee_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          workspace_id?: string
          period_id?: string
          employee_id?: string
          department_id?: string | null
          date?: string
          start_time?: string | null
          end_time?: string | null
          is_off?: boolean
          needs_coverage?: boolean
          coverage_note?: string | null
          covered_by_employee_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'schedule_entries_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_entries_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'schedule_entries_covered_by_employee_id_fkey'
            columns: ['covered_by_employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          }
        ]
      }
      shifts: {
        Row: {
          id: string
          workspace_id: string
          period_id: string
          template_id: string | null
          name: string
          date: string
          start_time: string
          end_time: string
          required_staff: number
          position: string | null
          status: 'open' | 'filling' | 'filled' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          period_id: string
          template_id?: string | null
          name: string
          date: string
          start_time: string
          end_time: string
          required_staff?: number
          position?: string | null
          status?: 'open' | 'filling' | 'filled' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          workspace_id?: string
          period_id?: string
          template_id?: string | null
          name?: string
          date?: string
          start_time?: string
          end_time?: string
          required_staff?: number
          position?: string | null
          status?: 'open' | 'filling' | 'filled' | 'cancelled'
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'shifts_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          }
        ]
      }
      shift_assignments: {
        Row: {
          id: string
          workspace_id: string
          shift_id: string
          employee_id: string
          status: 'pending' | 'confirmed' | 'declined' | 'cancelled'
          sms_sent_at: string | null
          responded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          shift_id: string
          employee_id: string
          status?: 'pending' | 'confirmed' | 'declined' | 'cancelled'
          sms_sent_at?: string | null
          responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          workspace_id?: string
          shift_id?: string
          employee_id?: string
          status?: 'pending' | 'confirmed' | 'declined' | 'cancelled'
          sms_sent_at?: string | null
          responded_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'shift_assignments_shift_id_fkey'
            columns: ['shift_id']
            isOneToOne: false
            referencedRelation: 'shifts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shift_assignments_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          }
        ]
      }
      availability: {
        Row: {
          id: string
          workspace_id: string
          employee_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          employee_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          day_of_week?: number
          start_time?: string
          end_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'availability_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_workspace_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience type exports
export type Workspace = Database['public']['Tables']['workspaces']['Row']
export type WorkspaceInsert = Database['public']['Tables']['workspaces']['Insert']
export type User = Database['public']['Tables']['users']['Row']
export type Department = Database['public']['Tables']['departments']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']
export type EmployeeInsert = Database['public']['Tables']['employees']['Insert']
export type ShiftTemplate = Database['public']['Tables']['shift_templates']['Row']
export type ShiftTemplateInsert = Database['public']['Tables']['shift_templates']['Insert']
export type SchedulePeriod = Database['public']['Tables']['schedule_periods']['Row']
export type ScheduleEntry = Database['public']['Tables']['schedule_entries']['Row']
export type Shift = Database['public']['Tables']['shifts']['Row']
export type ShiftInsert = Database['public']['Tables']['shifts']['Insert']
export type ShiftAssignment = Database['public']['Tables']['shift_assignments']['Row']
export type Availability = Database['public']['Tables']['availability']['Row']
