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
      achievements: {
        Row: {
          created_at: string | null
          criteria: Json | null
          description: string | null
          icon: string | null
          id: string
          name: string
          points: number | null
          type: Database["public"]["Enums"]["achievement_type"] | null
        }
        Insert: {
          created_at?: string | null
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          points?: number | null
          type?: Database["public"]["Enums"]["achievement_type"] | null
        }
        Update: {
          created_at?: string | null
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          points?: number | null
          type?: Database["public"]["Enums"]["achievement_type"] | null
        }
        Relationships: []
      }
      chord_library: {
        Row: {
          barre: Json | null
          created_at: string | null
          difficulty: number | null
          fingers: Json | null
          id: string
          instrument: Database["public"]["Enums"]["chord_instrument"] | null
          name: string
          positions: Json | null
          svg_config: Json | null
          tags: string[] | null
        }
        Insert: {
          barre?: Json | null
          created_at?: string | null
          difficulty?: number | null
          fingers?: Json | null
          id?: string
          instrument?: Database["public"]["Enums"]["chord_instrument"] | null
          name: string
          positions?: Json | null
          svg_config?: Json | null
          tags?: string[] | null
        }
        Update: {
          barre?: Json | null
          created_at?: string | null
          difficulty?: number | null
          fingers?: Json | null
          id?: string
          instrument?: Database["public"]["Enums"]["chord_instrument"] | null
          name?: string
          positions?: Json | null
          svg_config?: Json | null
          tags?: string[] | null
        }
        Relationships: []
      }
      class_students: {
        Row: {
          class_id: string
          enrolled_at: string | null
          id: string
          is_active: boolean | null
          student_id: string
        }
        Insert: {
          class_id: string
          enrolled_at?: string | null
          id?: string
          is_active?: boolean | null
          student_id: string
        }
        Update: {
          class_id?: string
          enrolled_at?: string | null
          id?: string
          is_active?: boolean | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string | null
          id: string
          instrument: string
          is_active: boolean | null
          journey_id: string | null
          max_students: number | null
          name: string
          schedule: Json | null
          school_id: string
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instrument: string
          is_active?: boolean | null
          journey_id?: string | null
          max_students?: number | null
          name: string
          schedule?: Json | null
          school_id: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instrument?: string
          is_active?: boolean | null
          journey_id?: string | null
          max_students?: number | null
          name?: string
          schedule?: Json | null
          school_id?: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_classes_journey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      content_blocks: {
        Row: {
          block_type: Database["public"]["Enums"]["content_block_type"]
          content: Json | null
          created_at: string | null
          curated_by: string | null
          curation_status: Database["public"]["Enums"]["curation_status"] | null
          id: string
          render_data: Json | null
          school_id: string | null
          sort_order: number | null
          title: string | null
          topic_id: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          block_type: Database["public"]["Enums"]["content_block_type"]
          content?: Json | null
          created_at?: string | null
          curated_by?: string | null
          curation_status?:
            | Database["public"]["Enums"]["curation_status"]
            | null
          id?: string
          render_data?: Json | null
          school_id?: string | null
          sort_order?: number | null
          title?: string | null
          topic_id: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          block_type?: Database["public"]["Enums"]["content_block_type"]
          content?: Json | null
          created_at?: string | null
          curated_by?: string | null
          curation_status?:
            | Database["public"]["Enums"]["curation_status"]
            | null
          id?: string
          render_data?: Json | null
          school_id?: string | null
          sort_order?: number | null
          title?: string | null
          topic_id?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_blocks_curated_by_fkey"
            columns: ["curated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_blocks_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_blocks_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "content_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      content_topics: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty_level:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          dimension: Database["public"]["Enums"]["topic_dimension"] | null
          estimated_minutes: number | null
          id: string
          instrument: string | null
          pillar: Database["public"]["Enums"]["pillar_type"] | null
          prerequisites: string[] | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          dimension?: Database["public"]["Enums"]["topic_dimension"] | null
          estimated_minutes?: number | null
          id?: string
          instrument?: string | null
          pillar?: Database["public"]["Enums"]["pillar_type"] | null
          prerequisites?: string[] | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          dimension?: Database["public"]["Enums"]["topic_dimension"] | null
          estimated_minutes?: number | null
          id?: string
          instrument?: string | null
          pillar?: Database["public"]["Enums"]["pillar_type"] | null
          prerequisites?: string[] | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      generated_materials: {
        Row: {
          created_at: string | null
          downloaded_count: number | null
          edited_by: string | null
          file_url: string | null
          format: Database["public"]["Enums"]["material_format"] | null
          generated_at: string | null
          generation_config: Json | null
          html_content: string | null
          id: string
          is_draft: boolean | null
          journey_id: string | null
          page_count: number | null
          published_at: string | null
          school_id: string
          stage_id: string | null
          station_id: string | null
          status: Database["public"]["Enums"]["material_status"] | null
          title: string
          type: Database["public"]["Enums"]["material_type"] | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          downloaded_count?: number | null
          edited_by?: string | null
          file_url?: string | null
          format?: Database["public"]["Enums"]["material_format"] | null
          generated_at?: string | null
          generation_config?: Json | null
          html_content?: string | null
          id?: string
          is_draft?: boolean | null
          journey_id?: string | null
          page_count?: number | null
          published_at?: string | null
          school_id: string
          stage_id?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["material_status"] | null
          title: string
          type?: Database["public"]["Enums"]["material_type"] | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          downloaded_count?: number | null
          edited_by?: string | null
          file_url?: string | null
          format?: Database["public"]["Enums"]["material_format"] | null
          generated_at?: string | null
          generation_config?: Json | null
          html_content?: string | null
          id?: string
          is_draft?: boolean | null
          journey_id?: string | null
          page_count?: number | null
          published_at?: string | null
          school_id?: string
          stage_id?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["material_status"] | null
          title?: string
          type?: Database["public"]["Enums"]["material_type"] | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_materials_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_materials_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_materials_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_materials_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "journey_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_materials_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "journey_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_stages: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          journey_id: string
          name: string
          stage_number: number
          total_lessons: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          journey_id: string
          name: string
          stage_number: number
          total_lessons?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          journey_id?: string
          name?: string
          stage_number?: number
          total_lessons?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_stages_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_station_topics: {
        Row: {
          created_at: string | null
          dimension: Database["public"]["Enums"]["topic_dimension"]
          id: string
          is_included: boolean | null
          sort_order: number | null
          station_id: string
          topic_id: string | null
        }
        Insert: {
          created_at?: string | null
          dimension: Database["public"]["Enums"]["topic_dimension"]
          id?: string
          is_included?: boolean | null
          sort_order?: number | null
          station_id: string
          topic_id?: string | null
        }
        Update: {
          created_at?: string | null
          dimension?: Database["public"]["Enums"]["topic_dimension"]
          id?: string
          is_included?: boolean | null
          sort_order?: number | null
          station_id?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_station_topics_topic"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "content_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_station_topics_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "journey_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_stations: {
        Row: {
          created_at: string | null
          id: string
          lesson_end: number
          lesson_start: number
          name: string
          stage_id: string
          station_number: number
          station_type: Database["public"]["Enums"]["station_type"] | null
          topics: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lesson_end: number
          lesson_start: number
          name: string
          stage_id: string
          station_number: number
          station_type?: Database["public"]["Enums"]["station_type"] | null
          topics?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lesson_end?: number
          lesson_start?: number
          name?: string
          stage_id?: string
          station_number?: number
          station_type?: Database["public"]["Enums"]["station_type"] | null
          topics?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_stations_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "journey_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      journeys: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          instrument: string
          is_template: boolean | null
          methodology: string | null
          name: string
          school_id: string
          stages_config: Json | null
          status: Database["public"]["Enums"]["journey_status"] | null
          target_audience: Database["public"]["Enums"]["target_audience"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          instrument: string
          is_template?: boolean | null
          methodology?: string | null
          name: string
          school_id: string
          stages_config?: Json | null
          status?: Database["public"]["Enums"]["journey_status"] | null
          target_audience?:
            | Database["public"]["Enums"]["target_audience"]
            | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          instrument?: string
          is_template?: boolean | null
          methodology?: string | null
          name?: string
          school_id?: string
          stages_config?: Json | null
          status?: Database["public"]["Enums"]["journey_status"] | null
          target_audience?:
            | Database["public"]["Enums"]["target_audience"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journeys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journeys_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_logs: {
        Row: {
          class_id: string | null
          created_at: string | null
          date: string | null
          id: string
          journey_station_id: string | null
          lesson_number: number | null
          progress_notes: string | null
          rating: number | null
          status: Database["public"]["Enums"]["lesson_status"] | null
          student_id: string
          teacher_id: string | null
          topics_covered: string[] | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          journey_station_id?: string | null
          lesson_number?: number | null
          progress_notes?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["lesson_status"] | null
          student_id: string
          teacher_id?: string | null
          topics_covered?: string[] | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          journey_station_id?: string | null
          lesson_number?: number | null
          progress_notes?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["lesson_status"] | null
          student_id?: string
          teacher_id?: string | null
          topics_covered?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_logs_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_logs_journey_station_id_fkey"
            columns: ["journey_station_id"]
            isOneToOne: false
            referencedRelation: "journey_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_logs_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      material_blocks: {
        Row: {
          block_type: Database["public"]["Enums"]["material_block_type"]
          content: Json | null
          created_at: string | null
          id: string
          is_edited: boolean | null
          material_id: string
          original_content: Json | null
          render_data: Json | null
          sort_order: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          block_type: Database["public"]["Enums"]["material_block_type"]
          content?: Json | null
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          material_id: string
          original_content?: Json | null
          render_data?: Json | null
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          block_type?: Database["public"]["Enums"]["material_block_type"]
          content?: Json | null
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          material_id?: string
          original_content?: Json | null
          render_data?: Json | null
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_blocks_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "generated_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      repertoire: {
        Row: {
          artist: string | null
          backing_track_url: string | null
          chord_structure: Json | null
          chords: string[] | null
          cifra_source: string | null
          created_at: string | null
          curation_status: Database["public"]["Enums"]["curation_status"] | null
          difficulty: number | null
          genre: string | null
          id: string
          instruments: string[] | null
          is_public_domain: boolean | null
          key: string | null
          school_id: string | null
          title: string
          updated_at: string | null
          youtube_url: string | null
        }
        Insert: {
          artist?: string | null
          backing_track_url?: string | null
          chord_structure?: Json | null
          chords?: string[] | null
          cifra_source?: string | null
          created_at?: string | null
          curation_status?:
            | Database["public"]["Enums"]["curation_status"]
            | null
          difficulty?: number | null
          genre?: string | null
          id?: string
          instruments?: string[] | null
          is_public_domain?: boolean | null
          key?: string | null
          school_id?: string | null
          title: string
          updated_at?: string | null
          youtube_url?: string | null
        }
        Update: {
          artist?: string | null
          backing_track_url?: string | null
          chord_structure?: Json | null
          chords?: string[] | null
          cifra_source?: string | null
          created_at?: string | null
          curation_status?:
            | Database["public"]["Enums"]["curation_status"]
            | null
          difficulty?: number | null
          genre?: string | null
          id?: string
          instruments?: string[] | null
          is_public_domain?: boolean | null
          key?: string | null
          school_id?: string | null
          title?: string
          updated_at?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repertoire_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      scale_library: {
        Row: {
          created_at: string | null
          difficulty_level:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          id: string
          instrument_positions: Json | null
          intervals: string[] | null
          name: string
          notes: string[] | null
          vexflow_code: string | null
        }
        Insert: {
          created_at?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          id?: string
          instrument_positions?: Json | null
          intervals?: string[] | null
          name: string
          notes?: string[] | null
          vexflow_code?: string | null
        }
        Update: {
          created_at?: string | null
          difficulty_level?:
            | Database["public"]["Enums"]["difficulty_level"]
            | null
          id?: string
          instrument_positions?: Json | null
          intervals?: string[] | null
          name?: string
          notes?: string[] | null
          vexflow_code?: string | null
        }
        Relationships: []
      }
      schools: {
        Row: {
          city: string | null
          cnpj: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string | null
          plan: Database["public"]["Enums"]["plan_type"] | null
          primary_color: string | null
          secondary_color: string | null
          slug: string
          state: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
          plan?: Database["public"]["Enums"]["plan_type"] | null
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          state?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          plan?: Database["public"]["Enums"]["plan_type"] | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          state?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_schools_owner"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_achievements: {
        Row: {
          achievement_id: string
          id: string
          notified: boolean | null
          student_id: string
          unlocked_at: string | null
        }
        Insert: {
          achievement_id: string
          id?: string
          notified?: boolean | null
          student_id: string
          unlocked_at?: string | null
        }
        Update: {
          achievement_id?: string
          id?: string
          notified?: boolean | null
          student_id?: string
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_achievements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_progress: {
        Row: {
          current_lesson: number | null
          id: string
          journey_id: string
          stage_id: string | null
          started_at: string | null
          station_id: string | null
          status: Database["public"]["Enums"]["progress_status"] | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          current_lesson?: number | null
          id?: string
          journey_id: string
          stage_id?: string | null
          started_at?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["progress_status"] | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          current_lesson?: number | null
          id?: string
          journey_id?: string
          stage_id?: string | null
          started_at?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["progress_status"] | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "journey_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "journey_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          birth_date: string | null
          created_at: string | null
          current_stage: Json | null
          enrollment_date: string | null
          id: string
          instruments: string[] | null
          responsible_name: string | null
          responsible_phone: string | null
          school_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          current_stage?: Json | null
          enrollment_date?: string | null
          id?: string
          instruments?: string[] | null
          responsible_name?: string | null
          responsible_phone?: string | null
          school_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          current_stage?: Json | null
          enrollment_date?: string | null
          id?: string
          instruments?: string[] | null
          responsible_name?: string | null
          responsible_phone?: string | null
          school_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: Json | null
          direction: Database["public"]["Enums"]["whatsapp_direction"] | null
          id: string
          message_type: Database["public"]["Enums"]["whatsapp_msg_type"] | null
          phone: string
          related_student_id: string | null
          school_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["whatsapp_msg_status"] | null
        }
        Insert: {
          content?: Json | null
          direction?: Database["public"]["Enums"]["whatsapp_direction"] | null
          id?: string
          message_type?: Database["public"]["Enums"]["whatsapp_msg_type"] | null
          phone: string
          related_student_id?: string | null
          school_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["whatsapp_msg_status"] | null
        }
        Update: {
          content?: Json | null
          direction?: Database["public"]["Enums"]["whatsapp_direction"] | null
          id?: string
          message_type?: Database["public"]["Enums"]["whatsapp_msg_type"] | null
          phone?: string
          related_student_id?: string | null
          school_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["whatsapp_msg_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_related_student_id_fkey"
            columns: ["related_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          message_body: string
          name: string
          school_id: string
          trigger_type:
            | Database["public"]["Enums"]["whatsapp_trigger_type"]
            | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_body: string
          name: string
          school_id: string
          trigger_type?:
            | Database["public"]["Enums"]["whatsapp_trigger_type"]
            | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_body?: string
          name?: string
          school_id?: string
          trigger_type?:
            | Database["public"]["Enums"]["whatsapp_trigger_type"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      achievement_type: "milestone" | "challenge" | "streak" | "special"
      chord_instrument: "guitar" | "ukulele" | "bass"
      content_block_type:
        | "text"
        | "notation"
        | "chord_diagram"
        | "tablature"
        | "exercise"
        | "keyboard_diagram"
        | "scale_diagram"
        | "rhythm_pattern"
        | "tip"
        | "example"
      curation_status: "draft" | "review" | "approved" | "published"
      difficulty_level: "foundation" | "grow" | "advance" | "master"
      journey_status: "draft" | "active" | "archived"
      lesson_status: "present" | "absent" | "rescheduled"
      material_block_type:
        | "title"
        | "text"
        | "image"
        | "chord_diagram"
        | "notation"
        | "tablature"
        | "exercise"
        | "tip"
        | "qr_code"
        | "separator"
        | "badge"
      material_format: "pdf" | "html"
      material_status: "generating" | "ready" | "error"
      material_type:
        | "full_module"
        | "single_lesson"
        | "repertoire_sheet"
        | "exercise_sheet"
        | "theory_supplement"
      pillar_type:
        | "theoretical_foundations"
        | "instrument_practice"
        | "repertoire"
        | "improvisation_composition"
        | "auditory_development"
        | "evaluations_presentations"
      plan_type: "basic" | "premium"
      progress_status: "on_track" | "behind" | "ahead" | "stalled"
      station_type: "start" | "core" | "checkpoint" | "regular"
      subscription_status: "active" | "trial" | "suspended" | "cancelled"
      target_audience: "baby" | "kids" | "teen" | "adult"
      topic_dimension:
        | "theory"
        | "technique"
        | "rhythm"
        | "repertoire"
        | "auditory"
        | "evaluation"
      user_role: "owner" | "coordinator" | "teacher" | "student"
      whatsapp_direction: "inbound" | "outbound"
      whatsapp_msg_status: "queued" | "sent" | "delivered" | "read" | "failed"
      whatsapp_msg_type:
        | "alert"
        | "material"
        | "progress_report"
        | "reminder"
        | "manual"
      whatsapp_trigger_type:
        | "manual"
        | "absence"
        | "checkpoint"
        | "scheduled"
        | "enrollment"
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
      achievement_type: ["milestone", "challenge", "streak", "special"],
      chord_instrument: ["guitar", "ukulele", "bass"],
      content_block_type: [
        "text",
        "notation",
        "chord_diagram",
        "tablature",
        "exercise",
        "keyboard_diagram",
        "scale_diagram",
        "rhythm_pattern",
        "tip",
        "example",
      ],
      curation_status: ["draft", "review", "approved", "published"],
      difficulty_level: ["foundation", "grow", "advance", "master"],
      journey_status: ["draft", "active", "archived"],
      lesson_status: ["present", "absent", "rescheduled"],
      material_block_type: [
        "title",
        "text",
        "image",
        "chord_diagram",
        "notation",
        "tablature",
        "exercise",
        "tip",
        "qr_code",
        "separator",
        "badge",
      ],
      material_format: ["pdf", "html"],
      material_status: ["generating", "ready", "error"],
      material_type: [
        "full_module",
        "single_lesson",
        "repertoire_sheet",
        "exercise_sheet",
        "theory_supplement",
      ],
      pillar_type: [
        "theoretical_foundations",
        "instrument_practice",
        "repertoire",
        "improvisation_composition",
        "auditory_development",
        "evaluations_presentations",
      ],
      plan_type: ["basic", "premium"],
      progress_status: ["on_track", "behind", "ahead", "stalled"],
      station_type: ["start", "core", "checkpoint", "regular"],
      subscription_status: ["active", "trial", "suspended", "cancelled"],
      target_audience: ["baby", "kids", "teen", "adult"],
      topic_dimension: [
        "theory",
        "technique",
        "rhythm",
        "repertoire",
        "auditory",
        "evaluation",
      ],
      user_role: ["owner", "coordinator", "teacher", "student"],
      whatsapp_direction: ["inbound", "outbound"],
      whatsapp_msg_status: ["queued", "sent", "delivered", "read", "failed"],
      whatsapp_msg_type: [
        "alert",
        "material",
        "progress_report",
        "reminder",
        "manual",
      ],
      whatsapp_trigger_type: [
        "manual",
        "absence",
        "checkpoint",
        "scheduled",
        "enrollment",
      ],
    },
  },
} as const
