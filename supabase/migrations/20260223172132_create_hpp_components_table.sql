CREATE TABLE public.catalog_hpp_components (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    catalog_id uuid NOT NULL,
    material_id uuid NOT NULL,
    quantity numeric NOT NULL DEFAULT 1,
    CONSTRAINT catalog_hpp_components_pkey PRIMARY KEY (id),
    CONSTRAINT catalog_hpp_components_catalog_id_fkey FOREIGN KEY (catalog_id) REFERENCES public.catalogs(id) ON DELETE CASCADE,
    CONSTRAINT catalog_hpp_components_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE
);

-- Berikan hak akses ke service_role (digunakan oleh server-side functions)
GRANT ALL ON TABLE public.catalog_hpp_components TO service_role;

-- Berikan hak akses ke anon dan authenticated (jika diperlukan RLS di masa depan)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.catalog_hpp_components TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.catalog_hpp_components TO authenticated;
