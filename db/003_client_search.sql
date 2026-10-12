-- Additive only. Existing client and financial rows are never modified.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE FUNCTION public.ivone_client_name(text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
 SELECT regexp_replace(lower(translate(trim($1),
 'ÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäåéèêëíìîïóòôõöúùûüçñ',
 'AAAAAAEEEEIIIIOOOOOUUUUCNaaaaaaeeeeiiiiooooouuuucn')), '\s+', ' ', 'g')
$$;
CREATE INDEX clientes_name_search_gin ON public.clientes USING gin (public.ivone_client_name(full_name) gin_trgm_ops);
CREATE INDEX clientes_name_search_order ON public.clientes (public.ivone_client_name(full_name) text_pattern_ops,id);
COMMIT;
