-- Fermeture réversible du catalogue technique, sans suppression d’historique.
-- TEST uniquement : rlojnuaajeubzlwofwhn.
begin;
update seneve.offers set actif=false where offre_id='HD_RECETTE_INSCRIPTION_FR_20261026_30J' and programme_id='HD_RECETTE_INSCRIPTION_FR_20261026';
update seneve.hd_programme_links set actif=false where programme_id='HD_RECETTE_INSCRIPTION_FR_20261026' and version=1 and langue='fr';
commit;
