import copy
import json
from pathlib import Path
import subprocess
import sys
import unittest

from verifier_habitudes import verifier

ROOT = Path(__file__).resolve().parents[2]
DOSSIER = ROOT / 'editorial/habitudes-defis/30-jours-fr-brouillon.json'


class ReceptionTrame(unittest.TestCase):
    def setUp(self):
        self.d = json.loads(DOSSIER.read_text())

    def test_trame_complete_mais_pas_contenu_approuve(self):
        r = verifier(self.d)
        self.assertTrue(r['structure_valide'])
        self.assertEqual((r['fiches'], r['activites_distinctes']), (30, 390))
        self.assertFalse(r['pret_publication'])
        self.assertTrue(any('Amidah' in x for x in r['attentes_editoriales']))

    def test_prieres_ne_partagent_pas_une_activite(self):
        a = self.d['fiches'][0]['activites']
        a['priere_midi'] = a['priere_matin']
        self.assertFalse(verifier(self.d)['structure_valide'])

    def test_une_priere_manquante_est_detectee(self):
        del self.d['fiches'][10]['activites']['priere_soir']
        self.assertFalse(verifier(self.d)['structure_valide'])

    def test_deux_fiches_du_meme_jour_ne_remplacent_pas_un_jour_manquant(self):
        self.d['fiches'][29]['jour'] = 1
        self.assertFalse(verifier(self.d)['structure_valide'])

    def test_des_libelles_ne_suffisent_pas_a_valider_les_consignes(self):
        copie = copy.deepcopy(self.d)
        for modele in copie['modeles'].values():
            modele['obligatoire'] = True
        r = verifier(copie)
        self.assertFalse(r['pret_publication'])
        self.assertTrue(any('proposition à relire' in x for x in r['attentes_editoriales']))

    def test_mode_publication_refuse_le_brouillon_et_ne_modifie_pas_le_fichier(self):
        avant = DOSSIER.read_bytes()
        r = subprocess.run([sys.executable, str(ROOT / 'scripts/editorial/verifier_habitudes.py'), str(DOSSIER), '--publication'], capture_output=True, text=True)
        self.assertEqual(r.returncode, 1)
        self.assertFalse(json.loads(r.stdout)['pret_publication'])
        self.assertEqual(DOSSIER.read_bytes(), avant)


if __name__ == '__main__':
    unittest.main()
