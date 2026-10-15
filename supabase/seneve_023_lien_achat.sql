-- SÉNEVÉ 023 — Carte « Et après ? » (décision de Dr Justin, 16/10/2026 : on continue, liens d'achat plus tard).
-- Appliquée le 16/10/2026 (nom de migration Supabase : seneve_020_lien_achat).
-- Lien public de la page d'achat Chariow, à renseigner quand Dr Justin le fournit. Vide = pas de bouton d'achat.
alter table seneve.offers add column if not exists lien_achat text
  check (lien_achat is null or lien_achat ~ '^https://');

-- 16/10/2026 00:24 — Dr Justin fournit https://mmkznvua.mychariow.com/prd_tzep7gqk.
-- Même forme pour les 12 offres ayant un numéro de produit Chariow (les 12 pages ont été ouvertes et vérifiées).
-- Livres papier : pas de produit Chariow, donc pas de lien.
update seneve.offers set lien_achat = 'https://mmkznvua.mychariow.com/' || chariow_product_id
 where chariow_product_id ~ '^prd_[a-z0-9]+$' and lien_achat is null;
