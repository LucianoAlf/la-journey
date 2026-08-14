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
      backing_tracks: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          id: string
          metadata: Json | null
          repertoire_id: string
          source: string | null
          stem_type: string
          storage_path: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          metadata?: Json | null
          repertoire_id: string
          source?: string | null
          stem_type: string
          storage_path: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          metadata?: Json | null
          repertoire_id?: string
          source?: string | null
          stem_type?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "backing_tracks_repertoire_id_fkey"
            columns: ["repertoire_id"]
            isOneToOne: false
            referencedRelation: "repertoire"
            referencedColumns: ["id"]
          },
        ]
      }
      chord_library: {
        Row: {
          barre: Json | null
          caged_shape: string | null
          canonical_name: string | null
          created_at: string | null
          difficulty: number | null
          family: string | null
          fingers: Json | null
          has_barre: boolean | null
          id: string
          instrument: Database["public"]["Enums"]["chord_instrument"] | null
          name: string
          positions: Json | null
          quality: string | null
          root_note: string | null
          slash_type: string | null
          sort_order: number | null
          svg_config: Json | null
          tags: string[] | null
          voicing_position: string | null
        }
        Insert: {
          barre?: Json | null
          caged_shape?: string | null
          canonical_name?: string | null
          created_at?: string | null
          difficulty?: number | null
          family?: string | null
          fingers?: Json | null
          has_barre?: boolean | null
          id?: string
          instrument?: Database["public"]["Enums"]["chord_instrument"] | null
          name: string
          positions?: Json | null
          quality?: string | null
          root_note?: string | null
          slash_type?: string | null
          sort_order?: number | null
          svg_config?: Json | null
          tags?: string[] | null
          voicing_position?: string | null
        }
        Update: {
          barre?: Json | null
          caged_shape?: string | null
          canonical_name?: string | null
          created_at?: string | null
          difficulty?: number | null
          family?: string | null
          fingers?: Json | null
          has_barre?: boolean | null
          id?: string
          instrument?: Database["public"]["Enums"]["chord_instrument"] | null
          name?: string
          positions?: Json | null
          quality?: string | null
          root_note?: string | null
          slash_type?: string | null
          sort_order?: number | null
          svg_config?: Json | null
          tags?: string[] | null
          voicing_position?: string | null
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
          ai_metadata: Json | null
          block_type: Database["public"]["Enums"]["content_block_type"]
          content: Json | null
          created_at: string | null
          curated_by: string | null
          curation_status: Database["public"]["Enums"]["curation_status"] | null
          embedding: string | null
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
          ai_metadata?: Json | null
          block_type: Database["public"]["Enums"]["content_block_type"]
          content?: Json | null
          created_at?: string | null
          curated_by?: string | null
          curation_status?:
            | Database["public"]["Enums"]["curation_status"]
            | null
          embedding?: string | null
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
          ai_metadata?: Json | null
          block_type?: Database["public"]["Enums"]["content_block_type"]
          content?: Json | null
          created_at?: string | null
          curated_by?: string | null
          curation_status?:
            | Database["public"]["Enums"]["curation_status"]
            | null
          embedding?: string | null
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
          embedding: string | null
          estimated_minutes: number | null
          id: string
          instrument: string | null
          pillar: Database["public"]["Enums"]["pillar_type"] | null
          prerequisites: string[] | null
          slug: string
          source_document: string | null
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
          embedding?: string | null
          estimated_minutes?: number | null
          id?: string
          instrument?: string | null
          pillar?: Database["public"]["Enums"]["pillar_type"] | null
          prerequisites?: string[] | null
          slug: string
          source_document?: string | null
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
          embedding?: string | null
          estimated_minutes?: number | null
          id?: string
          instrument?: string | null
          pillar?: Database["public"]["Enums"]["pillar_type"] | null
          prerequisites?: string[] | null
          slug?: string
          source_document?: string | null
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
          is_template: boolean
          journey_id: string | null
          page_config: Json | null
          page_count: number | null
          published_at: string | null
          school_id: string
          stage_id: string | null
          station_id: string | null
          status: Database["public"]["Enums"]["material_status"] | null
          template_cover_url: string | null
          template_description: string | null
          template_instrument: string | null
          template_level: string | null
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
          is_template?: boolean
          journey_id?: string | null
          page_config?: Json | null
          page_count?: number | null
          published_at?: string | null
          school_id: string
          stage_id?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["material_status"] | null
          template_cover_url?: string | null
          template_description?: string | null
          template_instrument?: string | null
          template_level?: string | null
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
          is_template?: boolean
          journey_id?: string | null
          page_config?: Json | null
          page_count?: number | null
          published_at?: string | null
          school_id?: string
          stage_id?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["material_status"] | null
          template_cover_url?: string | null
          template_description?: string | null
          template_instrument?: string | null
          template_level?: string | null
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
      notation_library: {
        Row: {
          category: string
          clef: string
          created_at: string | null
          description: string | null
          difficulty: number | null
          id: string
          instrument: string | null
          key_signature: string | null
          name: string
          notation_data: Json
          render_data: Json | null
          sort_order: number | null
          subcategory: string | null
          tags: string[] | null
          time_signature: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          clef?: string
          created_at?: string | null
          description?: string | null
          difficulty?: number | null
          id?: string
          instrument?: string | null
          key_signature?: string | null
          name: string
          notation_data?: Json
          render_data?: Json | null
          sort_order?: number | null
          subcategory?: string | null
          tags?: string[] | null
          time_signature?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          clef?: string
          created_at?: string | null
          description?: string | null
          difficulty?: number | null
          id?: string
          instrument?: string | null
          key_signature?: string | null
          name?: string
          notation_data?: Json
          render_data?: Json | null
          sort_order?: number | null
          subcategory?: string | null
          tags?: string[] | null
          time_signature?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      repertoire: {
        Row: {
          artist: string | null
          backing_track_url: string | null
          bpm: number | null
          capo: number | null
          chord_structure: Json | null
          chords: string[] | null
          cifra_content: string | null
          cifra_source: string | null
          country: string | null
          created_at: string | null
          curated_by: string | null
          curation_status: Database["public"]["Enums"]["curation_status"] | null
          difficulty: number | null
          embedding: string | null
          genre: string | null
          gp_file_url: string | null
          id: string
          instruments: string[] | null
          is_public_domain: boolean | null
          key: string | null
          lyrics: string | null
          school_id: string | null
          sections: Json | null
          songsterr_id: number | null
          source_url: string | null
          spotify_url: string | null
          spotify_track_id: string | null
          spotify_track_name: string | null
          spotify_artist_name: string | null
          spotify_album_name: string | null
          spotify_album_year: string | null
          spotify_duration_ms: number | null
          spotify_cover_url_large: string | null
          spotify_cover_url_medium: string | null
          spotify_cover_url_small: string | null
          time_signature: string | null
          title: string
          updated_at: string | null
          youtube_url: string | null
          youtube_video_id: string | null
          youtube_title: string | null
          youtube_channel: string | null
          youtube_duration: string | null
          youtube_thumbnail_url: string | null
        }
        Insert: {
          artist?: string | null
          backing_track_url?: string | null
          bpm?: number | null
          capo?: number | null
          chord_structure?: Json | null
          chords?: string[] | null
          cifra_content?: string | null
          cifra_source?: string | null
          country?: string | null
          created_at?: string | null
          curated_by?: string | null
          curation_status?:
            | Database["public"]["Enums"]["curation_status"]
            | null
          difficulty?: number | null
          embedding?: string | null
          genre?: string | null
          gp_file_url?: string | null
          id?: string
          instruments?: string[] | null
          is_public_domain?: boolean | null
          key?: string | null
          lyrics?: string | null
          school_id?: string | null
          sections?: Json | null
          songsterr_id?: number | null
          source_url?: string | null
          spotify_url?: string | null
          spotify_track_id?: string | null
          spotify_track_name?: string | null
          spotify_artist_name?: string | null
          spotify_album_name?: string | null
          spotify_album_year?: string | null
          spotify_duration_ms?: number | null
          spotify_cover_url_large?: string | null
          spotify_cover_url_medium?: string | null
          spotify_cover_url_small?: string | null
          time_signature?: string | null
          title: string
          updated_at?: string | null
          youtube_url?: string | null
          youtube_video_id?: string | null
          youtube_title?: string | null
          youtube_channel?: string | null
          youtube_duration?: string | null
          youtube_thumbnail_url?: string | null
        }
        Update: {
          artist?: string | null
          backing_track_url?: string | null
          bpm?: number | null
          capo?: number | null
          chord_structure?: Json | null
          chords?: string[] | null
          cifra_content?: string | null
          cifra_source?: string | null
          country?: string | null
          created_at?: string | null
          curated_by?: string | null
          curation_status?:
            | Database["public"]["Enums"]["curation_status"]
            | null
          difficulty?: number | null
          embedding?: string | null
          genre?: string | null
          gp_file_url?: string | null
          id?: string
          instruments?: string[] | null
          is_public_domain?: boolean | null
          key?: string | null
          lyrics?: string | null
          school_id?: string | null
          sections?: Json | null
          songsterr_id?: number | null
          source_url?: string | null
          spotify_url?: string | null
          spotify_track_id?: string | null
          spotify_track_name?: string | null
          spotify_artist_name?: string | null
          spotify_album_name?: string | null
          spotify_album_year?: string | null
          spotify_duration_ms?: number | null
          spotify_cover_url_large?: string | null
          spotify_cover_url_medium?: string | null
          spotify_cover_url_small?: string | null
          time_signature?: string | null
          title?: string
          updated_at?: string | null
          youtube_url?: string | null
          youtube_video_id?: string | null
          youtube_title?: string | null
          youtube_channel?: string | null
          youtube_duration?: string | null
          youtube_thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repertoire_curated_by_fkey"
            columns: ["curated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
          default_body_font: string | null
          default_cover_font: string | null
          id: string
          logo_variants: Json
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
          default_body_font?: string | null
          default_cover_font?: string | null
          id?: string
          logo_variants?: Json
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
          default_body_font?: string | null
          default_cover_font?: string | null
          id?: string
          logo_variants?: Json
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
      school_cover_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          render_data: Json
          school_id: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          render_data?: Json
          school_id: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          render_data?: Json
          school_id?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_cover_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_cover_templates_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
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
      add_material_block: {
        Args: {
          p_after_order?: number
          p_block_type: Database["public"]["Enums"]["material_block_type"]
          p_content?: Json
          p_material_id: string
          p_render_data?: Json
          p_title?: string
        }
        Returns: string
      }
      classify_slash_chord: {
        Args: { chord_name: string; chord_quality: string }
        Returns: string
      }
      delete_material_block: { Args: { p_block_id: string }; Returns: boolean }
      get_material_with_blocks: {
        Args: { p_material_id: string }
        Returns: {
          block_content: Json
          block_id: string
          block_is_edited: boolean
          block_original_content: Json
          block_render_data: Json
          block_sort_order: number
          block_title: string
          block_type: Database["public"]["Enums"]["material_block_type"]
          generated_at: string
          generation_config: Json
          is_draft: boolean
          journey_name: string
          material_id: string
          material_status: Database["public"]["Enums"]["material_status"]
          material_title: string
          material_type: Database["public"]["Enums"]["material_type"]
          school_name: string
          stage_name: string
          station_name: string
          version: number
        }[]
      }
      get_my_school_id: { Args: never; Returns: string }
      get_stage_stations: {
        Args: { p_stage_id: string }
        Returns: {
          block_count: number
          lesson_end: number
          lesson_start: number
          station_id: string
          station_name: string
          station_number: number
          station_type: Database["public"]["Enums"]["station_type"]
          topic_count: number
        }[]
      }
      get_station_blocks: {
        Args: { p_station_id: string }
        Returns: {
          block_content: Json
          block_id: string
          block_order: number
          block_render_data: Json
          block_title: string
          block_type: Database["public"]["Enums"]["content_block_type"]
          topic_order: number
          topic_slug: string
          topic_title: string
        }[]
      }
      list_materials: {
        Args: { p_school_id?: string }
        Returns: {
          block_count: number
          generated_at: string
          id: string
          is_draft: boolean
          journey_name: string
          station_name: string
          status: Database["public"]["Enums"]["material_status"]
          title: string
          type: Database["public"]["Enums"]["material_type"]
          version: number
        }[]
      }
      match_content_blocks: {
        Args: {
          filter_difficulty?: Database["public"]["Enums"]["difficulty_level"]
          filter_dimension?: Database["public"]["Enums"]["topic_dimension"]
          filter_instrument?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          block_type: Database["public"]["Enums"]["content_block_type"]
          content: Json
          id: string
          render_data: Json
          similarity: number
          title: string
          topic_id: string
        }[]
      }
      match_content_topics: {
        Args: {
          filter_difficulty?: Database["public"]["Enums"]["difficulty_level"]
          filter_instrument?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          description: string
          difficulty_level: Database["public"]["Enums"]["difficulty_level"]
          dimension: Database["public"]["Enums"]["topic_dimension"]
          id: string
          instrument: string
          similarity: number
          title: string
        }[]
      }
      normalize_chord_name: { Args: { chord_name: string }; Returns: string }
      reorder_material_blocks: {
        Args: { p_block_ids: string[]; p_material_id: string }
        Returns: boolean
      }
      save_generated_material: {
        Args: {
          p_blocks?: Json
          p_generation_config?: Json
          p_journey_id: string
          p_school_id: string
          p_stage_id: string
          p_station_id: string
          p_title: string
          p_type?: Database["public"]["Enums"]["material_type"]
        }
        Returns: string
      }
      suggest_repertoire: {
        Args: { known_chords: string[]; max_results?: number }
        Returns: {
          artist: string
          chords: string[]
          difficulty: number
          genre: string
          id: string
          key: string
          match_percent: number
          title: string
          total_chords: number
        }[]
      }
      suggest_repertoire_partial: {
        Args: {
          known_chords: string[]
          max_results?: number
          min_match_percent?: number
        }
        Returns: {
          artist: string
          chords: string[]
          difficulty: number
          genre: string
          id: string
          key: string
          known_count: number
          match_percent: number
          missing_chords: string[]
          title: string
          total_chords: number
        }[]
      }
      update_embeddings_batch: {
        Args: { target_table: string; updates: Json }
        Returns: number
      }
      update_material_block: {
        Args: {
          p_block_id: string
          p_content?: Json
          p_render_data?: Json
          p_title?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      achievement_type: "milestone" | "challenge" | "streak" | "special"
      chord_instrument: "guitar" | "ukulele" | "bass" | "piano" | "cavaquinho"
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
        | "audio"
        | "video"
        | "columns"
        | "chord_diagram"
        | "notation"
        | "tablature"
        | "exercise"
        | "tip"
        | "qr_code"
        | "separator"
        | "badge"
        | "cover"
        | "chord_grid"
        | "keyboard"
        | "keyboard_grid"
        | "page_break"
        | "rhythm"
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
      chord_instrument: ["guitar", "ukulele", "bass", "piano", "cavaquinho"],
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
        "audio",
        "video",
        "columns",
        "chord_diagram",
        "notation",
        "tablature",
        "exercise",
        "tip",
        "qr_code",
        "separator",
        "badge",
        "cover",
        "chord_grid",
        "keyboard",
        "keyboard_grid",
        "page_break",
        "rhythm",
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
