import {describe,it,expect} from 'vitest';
import {messageRappel} from '../../supabase/functions/envoyer-rappels-hd/messages';
describe('notifications par tâche',()=>{
 const cles=['reveil','gratitude_matin','priere_matin','bible_matin','exercice','lecture_pro','priere_midi','predication','lecture_personnelle','bible_soir','gratitude_soir','priere_soir','coucher','culte_semaine','culte_dimanche'];
 it.each(['fr','en'])('nomme chaque activité, à chaque envoi, en %s',langue=>{
  const titres=new Set<string>();for(const cle of cles){const a=messageRappel(cle,langue,false),b=messageRappel(cle,langue,true);
   titres.add(a.title);expect(b.title).toBe(a.title);expect(a.body).toContain(a.title.replace('SÉNEVÉ · ',''));expect(b.body).toContain(a.title.replace('SÉNEVÉ · ',''));expect(b.body).not.toBe(a.body);
  }expect(titres.size).toBe(15);
 });
 it('ne publie aucun texte arbitraire ni privé',()=>{expect(JSON.stringify(messageRappel('MON JOURNAL PRIVÉ','fr',true))).not.toContain('MON JOURNAL PRIVÉ');});
 it('distingue les trois prières et les deux lectures bibliques',()=>{expect(messageRappel('priere_midi','fr',true).title).toContain('Prière de midi');expect(messageRappel('bible_soir','en',false).title).toContain('Evening Bible reading');});
});
