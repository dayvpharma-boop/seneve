"""Contrôle local d'un dossier éditorial ; ne publie et ne modifie aucune donnée.

Usage : python verifier_habitudes.py dossier.json [--publication]
Le mode publication échoue tant que les contrôles documentaires restent ouverts.
Une validation déclarée dans le JSON n'est pas une preuve d'autorisation humaine.
"""
import argparse
import json
import hashlib
from pathlib import Path

QUOTIDIENS = {'reveil', 'gratitude_matin', 'priere_matin', 'bible_matin', 'exercice', 'lecture_pro', 'priere_midi', 'predication', 'lecture_personnelle', 'bible_soir', 'gratitude_soir', 'priere_soir', 'coucher'}
HEBDOMADAIRES = {'culte_semaine', 'culte_dimanche'}


def approuve(v):
    return isinstance(v, dict) and v.get('statut') == 'approuve' and all(isinstance(v.get(k), str) and v[k].strip() for k in ['relecteur', 'date', 'preuve'])


def empreinte_fiche(f):
    champs = ['jour', 'titre', 'objectif', 'texte_pedagogique', 'question_reflexion', 'source', 'nature']
    contenu = json.dumps({k: f.get(k) for k in champs}, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(contenu.encode()).hexdigest()


def verifier(d):
    structure, attentes = [], []
    modeles = d.get('modeles', {})
    if d.get('langue') != 'fr' or d.get('duree_gratuite_jours') != 30:
        structure.append('Périmètre attendu : FR et 30 jours gratuits.')
    if set(modeles) != QUOTIDIENS | HEBDOMADAIRES:
        structure.append('Modèles attendus : 13 quotidiens et 2 groupes de cultes.')
    fiches = d.get('fiches', [])
    if not isinstance(fiches, list):
        return {'structure_valide': False, 'pret_publication': False, 'erreurs_structure': ['Fiches invalides.'], 'attentes_editoriales': []}
    jours = [f.get('jour') for f in fiches]
    if len(fiches) != 30 or any(type(j) is not int for j in jours) or set(jours) != set(range(1, 31)):
        structure.append('Les jours 1 à 30 doivent être présents exactement une fois.')
    identifiants = set()
    for f in fiches:
        jour = f.get('jour')
        activites = f.get('activites', {})
        if not isinstance(activites, dict) or set(activites) != QUOTIDIENS:
            structure.append(f'Jour {jour} : les 13 habitudes quotidiennes sont requises dans la trame.')
            continue
        for cle, identifiant in activites.items():
            if not isinstance(identifiant, str) or not identifiant or identifiant in identifiants:
                structure.append(f'Jour {jour} : identifiant absent ou partagé pour {cle}.')
            else:
                identifiants.add(identifiant)
        if not all(isinstance(f.get(k), str) and f[k].strip() for k in ['objectif', 'texte_pedagogique', 'source']):
            attentes.append(f'Jour {jour} : objectif, texte et source à compléter.')
        if not approuve(f.get('validation')) or f['validation'].get('empreinte_sha256') != empreinte_fiche(f):
            attentes.append(f'Jour {jour} : relecture et preuve de validation nécessaires.')
    for cle, modele in modeles.items():
        if not all(isinstance(modele.get(k), str) and modele[k].strip() for k in ['libelle', 'consigne_proposee', 'critere_propose', 'source']):
            attentes.append(f'{cle} : consigne, critère ou source incomplet.')
        if type(modele.get('obligatoire')) is not bool:
            attentes.append(f'{cle} : statut requis/adapté à décider.')
        if not approuve(modele.get('validation')):
            attentes.append(f'{cle} : proposition à relire.')
    offre = d.get('offre', {})
    if offre.get('coach') != 'non_inclus':
        structure.append('Coach IA : exclu de ce programme par décision du porteur.')
    if any(offre.get(k) not in ['inclus', 'non_inclus'] for k in ['medias', 'bilans']):
        attentes.append('Offre gratuite : périmètre médias et bilans à définir.')
    if not approuve(offre.get('validation')):
        attentes.append('Offre gratuite : catalogue à approuver.')
    priere = d.get('priere', {})
    if priere.get('droits_reproduction') != 'confirmes' or not approuve(priere.get('validation')) or not priere.get('reference_texte_autorise'):
        attentes.append('Amidah : droits et texte publiable à confirmer.')
    defis = d.get('defis', {})
    contenus = defis.get('contenus', [])
    if not contenus:
        attentes.append('Défis : contenus à rédiger.')
    ids_defis = set()
    for defi in contenus:
        identifiant = defi.get('defi_editorial_id')
        if not isinstance(identifiant, str) or not identifiant or identifiant in ids_defis:
            structure.append('Défi : identifiant absent ou partagé.')
        ids_defis.add(identifiant)
        debut, fin = defi.get('jour_debut'), defi.get('jour_fin')
        if type(debut) is not int or type(fin) is not int or not 1 <= debut <= fin <= 30:
            structure.append('Défi : période hors des 30 jours.')
        if not all(isinstance(defi.get(k), str) and defi[k].strip() for k in ['titre', 'objectif', 'invitation', 'critere_declaration_propose', 'source']):
            attentes.append(f'{identifiant} : texte ou source à compléter.')
        if not approuve(defi.get('validation')):
            attentes.append(f'{identifiant} : défi à relire.')
    if not approuve(defis.get('bilan_final', {}).get('validation')):
        attentes.append('Bilan final : texte et accès à approuver.')
    if not approuve(defis.get('validation')):
        attentes.append('Défis : contenu et rythme à approuver.')
    if not isinstance(d.get('programme_id'), str) or not d['programme_id'].strip() or type(d.get('version')) is not int or d['version'] < 1:
        attentes.append('Programme et version de publication à configurer.')
    if not approuve(d.get('validation_globale')):
        attentes.append('Validation globale et preuve de réception nécessaires.')
    return {'structure_valide': not structure, 'pret_publication': not structure and not attentes,
            'fiches': len(fiches), 'activites_distinctes': len(identifiants),
            'erreurs_structure': structure, 'attentes_editoriales': attentes}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('dossier', type=Path)
    parser.add_argument('--publication', action='store_true')
    args = parser.parse_args()
    resultat = verifier(json.loads(args.dossier.read_text()))
    print(json.dumps(resultat, ensure_ascii=False, indent=2))
    raise SystemExit(0 if resultat['structure_valide'] and (not args.publication or resultat['pret_publication']) else 1)
