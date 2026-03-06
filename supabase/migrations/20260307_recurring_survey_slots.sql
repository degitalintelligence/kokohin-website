DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'idx_survey_slots_unique_time'
    ) THEN
        CREATE UNIQUE INDEX idx_survey_slots_unique_time
            ON public.survey_slots(date, start_time, end_time)
            WHERE blackout = false;
    END IF;

    CREATE OR REPLACE FUNCTION public.create_recurring_survey_slots(dto jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql
    AS $func$
    DECLARE
        v_start_date date := (dto->>'start_date')::date;
        v_weeks int := COALESCE((dto->>'weeks_ahead')::int, 4);
        v_pattern text := COALESCE(dto->>'pattern', 'daily');
        v_days int[] := COALESCE(ARRAY(
            SELECT (jsonb_array_elements_text(dto->'days_of_week'))::int
        ), ARRAY[]::int[]);
        v_start_time time := (dto->>'start_time')::time;
        v_end_time time := (dto->>'end_time')::time;
        v_capacity int := COALESCE((dto->>'capacity')::int, 1);
        v_is_active boolean := COALESCE((dto->>'is_active')::boolean, true);
        d date;
        i int;
        created_count int := 0;
        skipped_conflicts int := 0;
    BEGIN
        IF v_start_date IS NULL OR v_start_time IS NULL OR v_end_time IS NULL THEN
            RAISE EXCEPTION 'Missing required fields';
        END IF;

        IF v_weeks <= 0 OR v_weeks > 52 THEN
            v_weeks := 4;
        END IF;

        FOR i IN 0..(v_weeks * 7 - 1) LOOP
            d := v_start_date + i;

            IF v_pattern = 'weekdays' THEN
                IF EXTRACT(ISODOW FROM d) IN (6,7) THEN
                    CONTINUE;
                END IF;
            ELSIF v_pattern = 'custom' THEN
                IF v_days IS NULL OR array_length(v_days,1) IS NULL THEN
                    CONTINUE;
                END IF;
                IF NOT (EXTRACT(ISODOW FROM d)::int = ANY(v_days)) THEN
                    CONTINUE;
                END IF;
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.survey_slots s
                WHERE s.date = d
                  AND s.blackout = false
                  AND NOT (s.end_time <= v_start_time OR s.start_time >= v_end_time)
            ) THEN
                skipped_conflicts := skipped_conflicts + 1;
                CONTINUE;
            END IF;

            INSERT INTO public.survey_slots (
                date, start_time, end_time, capacity, is_active, blackout
            ) VALUES (
                d, v_start_time, v_end_time, GREATEST(1, v_capacity), v_is_active, false
            );
            created_count := created_count + 1;
        END LOOP;

        RETURN jsonb_build_object(
            'created_count', created_count,
            'skipped_conflicts', skipped_conflicts
        );
    END;
    $func$;
END $$;

