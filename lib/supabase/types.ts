export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
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
          updated_at?: string
        }
      }
      shift_templates: {
        Row: {
          id: string
          workspace_id: string
          name: string
          day_of_week: number
          start_time: string
          end_time: string
          required_staff: number
          position: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          day_of_week: number
          start_time: string
          end_time: string
          required_staff?: number
          position?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          workspace_id?: string
          name?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          required_staff?: number
          position?: string | null
          active?: boolean
          updated_at?: string
        }
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
      }
    }
    Views: {}
    Functions: {
      get_user_workspace_id: {
        Args: {}
        Returns: string
      }
    }
    Enums: {}
  }
}

export type Workspace = Database['public']['Tables']['workspaces']['Row']
export type WorkspaceInsert = Database['public']['Tables']['workspaces']['Insert']
export type User = Database['public']['Tables']['users']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']
export type EmployeeInsert = Database['public']['Tables']['employees']['Insert']
export type ShiftTemplate = Database['public']['Tables']['shift_templates']['Row']
export type ShiftTemplateInsert = Database['public']['Tables']['shift_templates']['Insert']
export type SchedulePeriod = Database['public']['Tables']['schedule_periods']['Row']
export type Shift = Database['public']['Tables']['shifts']['Row']
export type ShiftInsert = Database['public']['Tables']['shifts']['Insert']
export type ShiftAssignment = Database['public']['Tables']['shift_assignments']['Row']
export type Availability = Database['public']['Tables']['availability']['Row']
