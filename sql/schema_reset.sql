DO $$
    BEGIN
        -- Safety check
        RAISE EXCEPTION 'STOP: You are about to drop and recreate the schema. Remove this line to continue.';

        DROP SCHEMA IF EXISTS public CASCADE;
        CREATE SCHEMA public;
    END
$$;