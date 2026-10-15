-- SÉNEVÉ 023 — Carte « Et après ? » (décision de Dr Justin, 16/10/2026 : on continue, liens d'achat plus tard).
-- Appliquée le 16/10/2026 (nom de migration Supabase : seneve_020_lien_achat).
-- Lien public de la page d'achat Chariow, à renseigner quand Dr Justin le fournit. Vide = pas de bouton d'achat.
alter table seneve.offers add column if not exists lien_achat text
  check (lien_achat is null or lien_achat ~ '^https://');
