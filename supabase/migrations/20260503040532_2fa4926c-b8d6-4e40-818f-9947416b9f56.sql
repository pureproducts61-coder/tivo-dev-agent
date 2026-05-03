DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='project_name_length') THEN
    ALTER TABLE public.projects ADD CONSTRAINT project_name_length CHECK (length(name) > 0 AND length(name) <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='project_description_length') THEN
    ALTER TABLE public.projects ADD CONSTRAINT project_description_length CHECK (description IS NULL OR length(description) <= 1000);
  END IF;
END $$;