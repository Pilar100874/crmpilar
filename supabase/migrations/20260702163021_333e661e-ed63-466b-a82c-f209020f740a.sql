
-- Table: vis_visitors
CREATE TABLE public.vis_visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cpf TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vis_visitors TO authenticated;
GRANT ALL ON public.vis_visitors TO service_role;
ALTER TABLE public.vis_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read vis_visitors" ON public.vis_visitors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert vis_visitors" ON public.vis_visitors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update vis_visitors" ON public.vis_visitors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete vis_visitors" ON public.vis_visitors FOR DELETE TO authenticated USING (true);

-- Table: vis_contact_persons
CREATE TABLE public.vis_contact_persons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  whatsapp TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vis_contact_persons TO authenticated;
GRANT ALL ON public.vis_contact_persons TO service_role;
ALTER TABLE public.vis_contact_persons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read vis_contact_persons" ON public.vis_contact_persons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert vis_contact_persons" ON public.vis_contact_persons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update vis_contact_persons" ON public.vis_contact_persons FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete vis_contact_persons" ON public.vis_contact_persons FOR DELETE TO authenticated USING (true);

-- Table: vis_pending_visitors
CREATE TABLE public.vis_pending_visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID NOT NULL REFERENCES public.vis_visitors(id) ON DELETE CASCADE,
  contact_person_id UUID NOT NULL REFERENCES public.vis_contact_persons(id) ON DELETE CASCADE,
  contact_person_name TEXT NOT NULL,
  vehicle_plate TEXT,
  purpose TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'denied')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  authorized_at TIMESTAMP WITH TIME ZONE,
  authorized_by TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vis_pending_visitors TO authenticated;
GRANT ALL ON public.vis_pending_visitors TO service_role;
ALTER TABLE public.vis_pending_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read vis_pending_visitors" ON public.vis_pending_visitors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert vis_pending_visitors" ON public.vis_pending_visitors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update vis_pending_visitors" ON public.vis_pending_visitors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete vis_pending_visitors" ON public.vis_pending_visitors FOR DELETE TO authenticated USING (true);

-- Table: vis_access_records
CREATE TABLE public.vis_access_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID NOT NULL REFERENCES public.vis_visitors(id) ON DELETE CASCADE,
  contact_person_id UUID REFERENCES public.vis_contact_persons(id),
  contact_person_name TEXT NOT NULL,
  vehicle_plate TEXT,
  purpose TEXT,
  notes TEXT,
  entry_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  exit_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'inside' CHECK (status IN ('inside', 'exited'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vis_access_records TO authenticated;
GRANT ALL ON public.vis_access_records TO service_role;
ALTER TABLE public.vis_access_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read vis_access_records" ON public.vis_access_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert vis_access_records" ON public.vis_access_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update vis_access_records" ON public.vis_access_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete vis_access_records" ON public.vis_access_records FOR DELETE TO authenticated USING (true);

-- Indexes
CREATE INDEX idx_vis_visitors_cpf ON public.vis_visitors(cpf);
CREATE INDEX idx_vis_access_records_visitor_id ON public.vis_access_records(visitor_id);
CREATE INDEX idx_vis_access_records_status ON public.vis_access_records(status);
CREATE INDEX idx_vis_access_records_entry_date ON public.vis_access_records(entry_date);
CREATE INDEX idx_vis_pending_visitors_status ON public.vis_pending_visitors(status);

-- updated_at triggers (reuse existing public.update_updated_at_column if present)
CREATE OR REPLACE FUNCTION public.vis_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vis_visitors_updated_at
BEFORE UPDATE ON public.vis_visitors
FOR EACH ROW EXECUTE FUNCTION public.vis_touch_updated_at();

CREATE TRIGGER trg_vis_contact_persons_updated_at
BEFORE UPDATE ON public.vis_contact_persons
FOR EACH ROW EXECUTE FUNCTION public.vis_touch_updated_at();
