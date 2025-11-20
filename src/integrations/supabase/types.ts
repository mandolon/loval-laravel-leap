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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          change_summary: string | null
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          project_id: string | null
          resource_id: string | null
          resource_type: string
          short_id: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          change_summary?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          project_id?: string | null
          resource_id?: string | null
          resource_type: string
          short_id?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          change_summary?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          project_id?: string | null
          resource_id?: string | null
          resource_type?: string
          short_id?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          message_type: string
          metadata: Json | null
          model: string | null
          referenced_files: string[] | null
          referenced_projects: string[] | null
          referenced_tasks: string[] | null
          short_id: string
          thread_id: string
          tokens_used: number | null
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          message_type: string
          metadata?: Json | null
          model?: string | null
          referenced_files?: string[] | null
          referenced_projects?: string[] | null
          referenced_tasks?: string[] | null
          short_id?: string
          thread_id: string
          tokens_used?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          model?: string | null
          referenced_files?: string[] | null
          referenced_projects?: string[] | null
          referenced_tasks?: string[] | null
          short_id?: string
          thread_id?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_threads: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          short_id: string
          title: string
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          short_id?: string
          title: string
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          short_id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_threads_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_threads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      building_codes: {
        Row: {
          chapter: string | null
          code_type: string
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          embedding: string | null
          fts: unknown
          id: string
          jurisdiction: string | null
          section: string
          short_id: string
          source_file: string | null
          title: string | null
          updated_at: string
          year: string
        }
        Insert: {
          chapter?: string | null
          code_type: string
          content: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          embedding?: string | null
          fts?: unknown
          id?: string
          jurisdiction?: string | null
          section: string
          short_id?: string
          source_file?: string | null
          title?: string | null
          updated_at?: string
          year: string
        }
        Update: {
          chapter?: string | null
          code_type?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          embedding?: string | null
          fts?: unknown
          id?: string
          jurisdiction?: string | null
          section?: string
          short_id?: string
          source_file?: string | null
          title?: string | null
          updated_at?: string
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_codes_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_read_receipts: {
        Row: {
          created_at: string
          id: string
          last_read_at: string
          last_read_message_id: string | null
          message_type: string
          project_id: string | null
          short_id: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_read_at?: string
          last_read_message_id?: string | null
          message_type: string
          project_id?: string | null
          short_id?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_read_at?: string
          last_read_message_id?: string | null
          message_type?: string
          project_id?: string | null
          short_id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_read_receipts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_read_receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_read_receipts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      detail_library_categories: {
        Row: {
          created_at: string | null
          id: string
          is_system_category: boolean | null
          name: string
          short_id: string
          slug: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_system_category?: boolean | null
          name: string
          short_id: string
          slug: string
          sort_order: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_system_category?: boolean | null
          name?: string
          short_id?: string
          slug?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      detail_library_files: {
        Row: {
          author_name: string | null
          category_id: string
          color_tag: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          filename: string
          filesize: number
          id: string
          mimetype: string
          scale: string | null
          short_id: string
          storage_path: string
          subfolder_id: string | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          author_name?: string | null
          category_id: string
          color_tag: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          filename: string
          filesize: number
          id?: string
          mimetype: string
          scale?: string | null
          short_id: string
          storage_path: string
          subfolder_id?: string | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          author_name?: string | null
          category_id?: string
          color_tag?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          filename?: string
          filesize?: number
          id?: string
          mimetype?: string
          scale?: string | null
          short_id?: string
          storage_path?: string
          subfolder_id?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detail_library_files_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "detail_library_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_library_files_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_library_files_subfolder_id_fkey"
            columns: ["subfolder_id"]
            isOneToOne: false
            referencedRelation: "detail_library_subfolders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_library_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      detail_library_items: {
        Row: {
          created_at: string | null
          filename: string
          filesize: number
          id: string
          mimetype: string
          parent_file_id: string
          short_id: string
          sort_order: number
          storage_path: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          filename: string
          filesize: number
          id?: string
          mimetype: string
          parent_file_id: string
          short_id: string
          sort_order?: number
          storage_path: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          filename?: string
          filesize?: number
          id?: string
          mimetype?: string
          parent_file_id?: string
          short_id?: string
          sort_order?: number
          storage_path?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detail_library_items_parent_file_id_fkey"
            columns: ["parent_file_id"]
            isOneToOne: false
            referencedRelation: "detail_library_files"
            referencedColumns: ["id"]
          },
        ]
      }
      detail_library_subfolders: {
        Row: {
          category_id: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          short_id: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          short_id?: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          short_id?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detail_library_subfolders_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "detail_library_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_library_subfolders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      drawing_pages: {
        Row: {
          background_image_path: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          drawing_id: string
          excalidraw_data: Json
          id: string
          name: string
          page_number: number
          short_id: string
          sort_order: number | null
          thumbnail_storage_path: string | null
          updated_at: string | null
        }
        Insert: {
          background_image_path?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          drawing_id: string
          excalidraw_data?: Json
          id?: string
          name?: string
          page_number: number
          short_id?: string
          sort_order?: number | null
          thumbnail_storage_path?: string | null
          updated_at?: string | null
        }
        Update: {
          background_image_path?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          drawing_id?: string
          excalidraw_data?: Json
          id?: string
          name?: string
          page_number?: number
          short_id?: string
          sort_order?: number | null
          thumbnail_storage_path?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drawing_pages_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_pages_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
        ]
      }
      drawing_scales: {
        Row: {
          created_at: string | null
          drawing_page_id: string
          id: string
          inches_per_scene_unit: number
          is_active: boolean | null
          scale_name: string
        }
        Insert: {
          created_at?: string | null
          drawing_page_id: string
          id?: string
          inches_per_scene_unit: number
          is_active?: boolean | null
          scale_name: string
        }
        Update: {
          created_at?: string | null
          drawing_page_id?: string
          id?: string
          inches_per_scene_unit?: number
          is_active?: boolean | null
          scale_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawing_scales_drawing_page_id_fkey"
            columns: ["drawing_page_id"]
            isOneToOne: false
            referencedRelation: "drawing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      drawings: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          name: string
          project_id: string
          short_id: string
          updated_at: string | null
          version_number: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          name: string
          project_id: string
          short_id?: string
          updated_at?: string | null
          version_number?: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          short_id?: string
          updated_at?: string | null
          version_number?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      file_annotations: {
        Row: {
          annotation_data: Json
          created_at: string | null
          created_by: string | null
          file_id: string
          id: string
          project_id: string
          updated_at: string | null
          version_number: number | null
        }
        Insert: {
          annotation_data: Json
          created_at?: string | null
          created_by?: string | null
          file_id: string
          id?: string
          project_id: string
          updated_at?: string | null
          version_number?: number | null
        }
        Update: {
          annotation_data?: Json
          created_at?: string | null
          created_by?: string | null
          file_id?: string
          id?: string
          project_id?: string
          updated_at?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "file_annotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_annotations_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_annotations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          download_count: number | null
          filename: string
          filesize: number | null
          folder_id: string
          id: string
          is_shareable: boolean | null
          mimetype: string | null
          parent_file_id: string | null
          project_id: string
          share_token: string | null
          short_id: string
          storage_path: string
          task_id: string | null
          updated_at: string | null
          uploaded_by: string | null
          version_number: number | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          download_count?: number | null
          filename: string
          filesize?: number | null
          folder_id: string
          id?: string
          is_shareable?: boolean | null
          mimetype?: string | null
          parent_file_id?: string | null
          project_id: string
          share_token?: string | null
          short_id?: string
          storage_path: string
          task_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          version_number?: number | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          download_count?: number | null
          filename?: string
          filesize?: number | null
          folder_id?: string
          id?: string
          is_shareable?: boolean | null
          mimetype?: string | null
          parent_file_id?: string | null
          project_id?: string
          share_token?: string | null
          short_id?: string
          storage_path?: string
          task_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "files_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_parent_file_id_fkey"
            columns: ["parent_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_system_folder: boolean | null
          name: string
          parent_folder_id: string | null
          path: string | null
          project_id: string
          short_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_system_folder?: boolean | null
          name: string
          parent_folder_id?: string | null
          path?: string | null
          project_id: string
          short_id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_system_folder?: boolean | null
          name?: string
          parent_folder_id?: string | null
          path?: string | null
          project_id?: string
          short_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          phase: string | null
          short_id: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          phase?: string | null
          short_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          phase?: string | null
          short_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          paid_amount: number | null
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          processing_fee_amount: number | null
          processing_fee_percent: number | null
          project_id: string
          short_id: string
          status: string
          submitted_to_names: string[] | null
          subtotal: number
          total: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          processing_fee_amount?: number | null
          processing_fee_percent?: number | null
          project_id: string
          short_id?: string
          status?: string
          submitted_to_names?: string[] | null
          subtotal: number
          total: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          processing_fee_amount?: number | null
          processing_fee_percent?: number | null
          project_id?: string
          short_id?: string
          status?: string
          submitted_to_names?: string[] | null
          subtotal?: number
          total?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          chunk_content: string
          chunk_index: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          embedding: string | null
          file_id: string | null
          file_name: string
          file_path: string
          fts: unknown
          id: string
          metadata: Json | null
          project_id: string | null
          short_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          chunk_content: string
          chunk_index: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          embedding?: string | null
          file_id?: string | null
          file_name: string
          file_path: string
          fts?: unknown
          id?: string
          metadata?: Json | null
          project_id?: string | null
          short_id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          chunk_content?: string
          chunk_index?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          embedding?: string | null
          file_id?: string | null
          file_name?: string
          file_path?: string
          fts?: unknown
          id?: string
          metadata?: Json | null
          project_id?: string | null
          short_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      links: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          project_id: string
          short_id: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          project_id: string
          short_id?: string
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          project_id?: string
          short_id?: string
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      model_annotations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          position: Json
          text: string
          updated_at: string | null
          version_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          position: Json
          text: string
          updated_at?: string | null
          version_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          position?: Json
          text?: string
          updated_at?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_annotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_annotations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      model_camera_views: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          position: Json
          target: Json
          updated_at: string | null
          version_id: string
          zoom: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          position: Json
          target: Json
          updated_at?: string | null
          version_id: string
          zoom: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          position?: Json
          target?: Json
          updated_at?: string | null
          version_id?: string
          zoom?: number
        }
        Relationships: [
          {
            foreignKeyName: "model_camera_views_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_camera_views_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      model_clipping_planes: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string | null
          plane_data: Json
          version_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string | null
          plane_data: Json
          version_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string | null
          plane_data?: Json
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_clipping_planes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_clipping_planes_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      model_dimensions: {
        Row: {
          created_at: string | null
          created_by: string | null
          dimension_data: Json
          id: string
          label: string | null
          version_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dimension_data: Json
          id?: string
          label?: string | null
          version_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dimension_data?: Json
          id?: string
          label?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_dimensions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_dimensions_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      model_files: {
        Row: {
          created_at: string
          file_id: string | null
          filename: string
          filesize: number
          id: string
          mimetype: string
          short_id: string
          storage_path: string
          version_id: string
        }
        Insert: {
          created_at?: string
          file_id?: string | null
          filename: string
          filesize: number
          id?: string
          mimetype: string
          short_id?: string
          storage_path: string
          version_id: string
        }
        Update: {
          created_at?: string
          file_id?: string | null
          filename?: string
          filesize?: number
          id?: string
          mimetype?: string
          short_id?: string
          storage_path?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_files_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      model_settings: {
        Row: {
          background: string
          id: string
          layers: Json
          notes: string | null
          show_axes: boolean
          show_grid: boolean
          updated_at: string
          version_id: string
        }
        Insert: {
          background?: string
          id?: string
          layers?: Json
          notes?: string | null
          show_axes?: boolean
          show_grid?: boolean
          updated_at?: string
          version_id: string
        }
        Update: {
          background?: string
          id?: string
          layers?: Json
          notes?: string | null
          show_axes?: boolean
          show_grid?: boolean
          updated_at?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_settings_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: true
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      model_versions: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_current: boolean
          project_id: string
          short_id: string
          updated_at: string
          version_number: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_current?: boolean
          project_id: string
          short_id?: string
          updated_at?: string
          version_number: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_current?: boolean
          project_id?: string
          short_id?: string
          updated_at?: string
          version_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_versions_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          project_id: string
          short_id: string
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          project_id: string
          short_id?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          project_id?: string
          short_id?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          content: string | null
          created_at: string
          id: string
          is_read: boolean | null
          project_id: string | null
          read_at: string | null
          short_id: string
          title: string
          type: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          action_url?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          project_id?: string | null
          read_at?: string | null
          short_id?: string
          title: string
          type: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          action_url?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          project_id?: string | null
          read_at?: string | null
          short_id?: string
          title?: string
          type?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_chat_messages: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          project_id: string
          referenced_files: string[] | null
          referenced_tasks: string[] | null
          reply_to_message_id: string | null
          short_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          project_id: string
          referenced_files?: string[] | null
          referenced_tasks?: string[] | null
          reply_to_message_id?: string | null
          short_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          project_id?: string
          referenced_files?: string[] | null
          referenced_tasks?: string[] | null
          reply_to_message_id?: string | null
          short_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_chat_messages_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_chat_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_chat_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "project_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          project_id: string
          short_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          project_id: string
          short_id?: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          project_id?: string
          short_id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: Json | null
          ai_identity: Json | null
          assessor_parcel_info: Json | null
          completed_tasks: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          due_date: string | null
          estimated_amount: number | null
          id: string
          name: string
          phase: string
          primary_client_address: Json | null
          primary_client_email: string | null
          primary_client_first_name: string | null
          primary_client_last_name: string | null
          primary_client_phone: string | null
          progress: number | null
          project_type: string | null
          secondary_client_address: Json | null
          secondary_client_email: string | null
          secondary_client_first_name: string | null
          secondary_client_last_name: string | null
          secondary_client_phone: string | null
          short_id: string
          status: string
          team_member_count: number | null
          total_tasks: number | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          address?: Json | null
          ai_identity?: Json | null
          assessor_parcel_info?: Json | null
          completed_tasks?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_amount?: number | null
          id?: string
          name: string
          phase?: string
          primary_client_address?: Json | null
          primary_client_email?: string | null
          primary_client_first_name?: string | null
          primary_client_last_name?: string | null
          primary_client_phone?: string | null
          progress?: number | null
          project_type?: string | null
          secondary_client_address?: Json | null
          secondary_client_email?: string | null
          secondary_client_first_name?: string | null
          secondary_client_last_name?: string | null
          secondary_client_phone?: string | null
          short_id?: string
          status?: string
          team_member_count?: number | null
          total_tasks?: number | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          address?: Json | null
          ai_identity?: Json | null
          assessor_parcel_info?: Json | null
          completed_tasks?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_amount?: number | null
          id?: string
          name?: string
          phase?: string
          primary_client_address?: Json | null
          primary_client_email?: string | null
          primary_client_first_name?: string | null
          primary_client_last_name?: string | null
          primary_client_phone?: string | null
          progress?: number | null
          project_type?: string | null
          secondary_client_address?: Json | null
          secondary_client_email?: string | null
          secondary_client_first_name?: string | null
          secondary_client_last_name?: string | null
          secondary_client_phone?: string | null
          short_id?: string
          status?: string
          team_member_count?: number | null
          total_tasks?: number | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_new_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_new_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_new_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_new_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_time: number | null
          assignees: string[] | null
          attached_files: string[] | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          due_date: string | null
          estimated_time: number | null
          id: string
          priority: string
          project_id: string
          short_id: string
          sort_order: number | null
          status: string
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          actual_time?: number | null
          assignees?: string[] | null
          attached_files?: string[] | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_time?: number | null
          id?: string
          priority?: string
          project_id: string
          short_id?: string
          sort_order?: number | null
          status?: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          actual_time?: number | null
          assignees?: string[] | null
          attached_files?: string[] | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_time?: number | null
          id?: string
          priority?: string
          project_id?: string
          short_id?: string
          sort_order?: number | null
          status?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_new_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_new_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_new_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_new_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          duration_hours: number
          entry_date: string
          id: string
          project_id: string
          short_id: string
          task_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          duration_hours: number
          entry_date?: string
          id?: string
          project_id: string
          short_id?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          duration_hours?: number
          entry_date?: string
          id?: string
          project_id?: string
          short_id?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          email_digest: boolean | null
          id: string
          metadata: Json | null
          notifications_enabled: boolean | null
          onboarding_completed: boolean | null
          short_id: string
          sidebar_collapsed: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_digest?: boolean | null
          id?: string
          metadata?: Json | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          short_id?: string
          sidebar_collapsed?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_digest?: boolean | null
          id?: string
          metadata?: Json | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          short_id?: string
          sidebar_collapsed?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string | null
          avatar_url: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string
          id: string
          is_admin: boolean
          last_active_at: string | null
          last_page_visited: string | null
          name: string
          phone: string | null
          short_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email: string
          id?: string
          is_admin?: boolean
          last_active_at?: string | null
          last_page_visited?: string | null
          name: string
          phone?: string | null
          short_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string
          id?: string
          is_admin?: boolean
          last_active_at?: string | null
          last_page_visited?: string | null
          name?: string
          phone?: string | null
          short_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_chat_messages: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          referenced_files: string[] | null
          referenced_tasks: string[] | null
          reply_to_message_id: string | null
          short_id: string
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          referenced_files?: string[] | null
          referenced_tasks?: string[] | null
          reply_to_message_id?: string | null
          short_id?: string
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          referenced_files?: string[] | null
          referenced_tasks?: string[] | null
          reply_to_message_id?: string | null
          short_id?: string
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_chat_messages_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_files: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          download_count: number | null
          filename: string
          filesize: number | null
          folder_id: string | null
          id: string
          is_shareable: boolean | null
          mimetype: string | null
          parent_file_id: string | null
          share_token: string | null
          short_id: string
          storage_path: string
          updated_at: string | null
          uploaded_by: string | null
          version_number: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          download_count?: number | null
          filename: string
          filesize?: number | null
          folder_id?: string | null
          id?: string
          is_shareable?: boolean | null
          mimetype?: string | null
          parent_file_id?: string | null
          share_token?: string | null
          short_id?: string
          storage_path: string
          updated_at?: string | null
          uploaded_by?: string | null
          version_number?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          download_count?: number | null
          filename?: string
          filesize?: number | null
          folder_id?: string | null
          id?: string
          is_shareable?: boolean | null
          mimetype?: string | null
          parent_file_id?: string | null
          share_token?: string | null
          short_id?: string
          storage_path?: string
          updated_at?: string | null
          uploaded_by?: string | null
          version_number?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_files_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_folders: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_system_folder: boolean | null
          name: string
          parent_folder_id: string | null
          path: string | null
          short_id: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_system_folder?: boolean | null
          name: string
          parent_folder_id?: string | null
          path?: string | null
          short_id?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_system_folder?: boolean | null
          name?: string
          parent_folder_id?: string | null
          path?: string | null
          short_id?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_folders_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "workspace_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_folders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          short_id: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          short_id?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          short_id?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          ai_instructions: string | null
          company_logo_url: string | null
          company_name: string | null
          created_at: string
          default_invoice_terms: number | null
          id: string
          metadata: Json | null
          short_id: string
          tax_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_instructions?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string
          default_invoice_terms?: number | null
          id?: string
          metadata?: Json | null
          short_id?: string
          tax_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_instructions?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string
          default_invoice_terms?: number | null
          id?: string
          metadata?: Json | null
          short_id?: string
          tax_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          short_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          short_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          short_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_detail_library_short_id: {
        Args: { prefix: string }
        Returns: string
      }
      generate_file_share_token: { Args: never; Returns: string }
      generate_short_id: { Args: { prefix: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_users_with_auth_data: {
        Args: never
        Returns: {
          avatar_url: string
          email: string
          id: string
          is_admin: boolean
          last_active_at: string
          last_page_visited: string
          last_sign_in_at: string
          name: string
          title: string
        }[]
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_team_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      search_knowledge_base:
        | {
            Args: {
              filter_project_id?: string
              filter_workspace_id: string
              match_count: number
              match_threshold: number
              query_embedding: string
            }
            Returns: {
              chunk_content: string
              chunk_index: number
              file_name: string
              file_path: string
              id: string
              similarity: number
            }[]
          }
        | {
            Args: {
              filter_workspace_id: string
              match_count: number
              match_threshold: number
              query_embedding: string
            }
            Returns: {
              chunk_content: string
              chunk_index: number
              file_name: string
              file_path: string
              id: string
              similarity: number
            }[]
          }
      workspace_has_no_members: {
        Args: { _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "team" | "consultant" | "client" | "admin"
      workspace_role: "team" | "consultant" | "client"
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
      app_role: ["team", "consultant", "client", "admin"],
      workspace_role: ["team", "consultant", "client"],
    },
  },
} as const
