# Lecture du jour — recette HD

Intégration des 30 lectures françaises et de leurs traductions anglaises déjà publiées sur la page publique Habitudes & Défis. Les deux fichiers sont repris à l’identique du commit main source, sans nouveau texte éditorial, import de corpus serveur ou reproduction de l’Amidah.

L’écran de journée affiche le texte correspondant au numéro de jour vérifié par l’API de recette, son objectif et sa question de réflexion. L’interface précise qu’il s’agit d’une adaptation pédagogique. Le texte est visible directement, sans formulaire de réponse, écriture ou validation automatique d’une activité. L’inscription connectée reste FR ; la présence d’une traduction ne crée pas un catalogue connecté EN.

La carte utilise la palette ivoire, vert et or du site, une typographie de lecture et une mise en page adaptée au téléphone. Une journée non reconnue ne reçoit aucun texte de remplacement.

Vérification : tests de journée, lecture API et historique ; contrôle TypeScript. L’assertion de journée confirme la présence du titre du jour 1 et l’absence d’appel de progression au chargement. Publication dans la version isolée seneve-test uniquement. La vérification authentifiée du rendu sur téléphone reste à faire.
