-- Migration: 20260306_create_survey_slots_and_bookings.sql
-- Creates survey_slots and survey_bookings tables for survey scheduling

DO $$
BEGIN
    -- 1. survey_slots table
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name   = 'survey_slots'
    ) THEN
        CREATE TABLE public.survey_slots (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            date date NOT NULL,
            start_time time NOT NULL,
            end_time time NOT NULL,
            capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
            is_active boolean NOT NULL DEFAULT true,
            blackout boolean NOT NULL DEFAULT false,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
    END IF;

    -- 2. survey_bookings table
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name   = 'survey_bookings'
    ) THEN
        CREATE TABLE public.survey_bookings (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            lead_id uuid NULL REFERENCES public.leads(id) ON DELETE SET NULL,
            name text NOT NULL,
            phone text NOT NULL,
            address text NULL,
            zone_id uuid NULL REFERENCES public.zones(id) ON DELETE SET NULL,
            slot_id uuid NOT NULL REFERENCES public.survey_slots(id) ON DELETE CASCADE,
            status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','reschedule_requested')),
            requested_slot_id uuid NULL REFERENCES public.survey_slots(id) ON DELETE SET NULL,
            notes text NULL,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
    END IF;

    -- 3. Helpful indexes
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_survey_slots_date'
    ) THEN
        CREATE INDEX idx_survey_slots_date ON public.survey_slots (date, start_time);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_survey_bookings_slot'
    ) THEN
        CREATE INDEX idx_survey_bookings_slot ON public.survey_bookings (slot_id, status);
    END IF;
END $$;

