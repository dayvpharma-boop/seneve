import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {RecommandationsAdministration} from '@/components/RecommandationsAdministration';
import {RecommandationsHabitudes} from '@/components/RecommandationsHabitudes';
import {lienRecommandationValide,type Recommandation} from '@/lib/habitudes-recommandations-api';
const uid='10000000-0000-4000-8000-000000000001';
let rows:Recommandation[]=[];
const rpc=vi.fn(async(n:string,p?:Record<string,unknown>):Promise<{data:unknown;error:unknown}>=>{
 if(n==='staff_hd_recommandations')return {data:[...rows],error:null};
 if(n==='hd_recommandations')return {data:rows.filter(r=>r.etat==='publie'&&r.langue===p?.p_langue),error:null};
 const c=p!.p_contenu as Recommandation;
 const row={...c,id:p!.p_id as string,revision:Number(p!.p_revision)+1,validee_le:c.etat==='publie'?'2026-10-28T12:00:00Z':null};
 rows=[...rows.filter(x=>x.id!==row.id),row];return {data:row,error:null};
});
const transport={rpc};
beforeEach(()=>{rows=[];sessionStorage.clear();rpc.mockClear();});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
function remplir(){
 fireEvent.change(screen.getByLabelText('Titre'),{target:{value:'Mon livre conseillé'}});
 fireEvent.change(screen.getByLabelText('Auteur ou prédicateur'),{target:{value:'Auteur choisi'}});
 fireEvent.change(screen.getByLabelText('Lien du livre ou de la prédication'),{target:{value:'https://example.org/livre'}});
}
it('ajoute un brouillon, le modifie, le publie, puis le retire sans effacer sa fiche',async()=>{
 render(<RecommandationsAdministration authId={uid} transport={transport}/>);
 await screen.findByText(/Aucune recommandation enregistrée/);
 fireEvent.click(screen.getByRole('button',{name:'Ajouter un livre'}));remplir();
 expect(screen.getByRole('button',{name:'Publier la recommandation'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Enregistrer en brouillon'}));
 await screen.findByText('Brouillon enregistré.');expect(rows[0]?.etat).toBe('brouillon');
 fireEvent.click(await screen.findByRole('button',{name:'Modifier — Mon livre conseillé'}));
 expect(screen.getByLabelText('Titre')).toHaveValue('Mon livre conseillé');
 fireEvent.change(screen.getByLabelText('Catégorie'),{target:{value:'lecture_pro'}});
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Publier la recommandation'}));
 await screen.findByText('Recommandation publiée dans les lectures du jour.');expect(rows[0]?.categorie).toBe('lecture_pro');expect(rows[0]?.etat).toBe('publie');
 fireEvent.click(await screen.findByRole('button',{name:'Retirer — Mon livre conseillé'}));
 expect(rows[0]?.etat).toBe('publie');fireEvent.click(screen.getByRole('button',{name:'Confirmer le retrait'}));
 await screen.findByText('Recommandation retirée de l’affichage.');expect(rows).toHaveLength(1);expect(rows[0]?.etat).toBe('retire');
});
it('le bouton prédication sélectionne la bonne catégorie et un changement impose une nouvelle validation',async()=>{
 render(<RecommandationsAdministration authId={uid} transport={transport}/>);
 fireEvent.click(screen.getByRole('button',{name:'Ajouter une prédication'}));
 expect(screen.getByLabelText('Catégorie')).toHaveValue('predication');remplir();fireEvent.click(screen.getByRole('checkbox'));
 expect(screen.getByRole('button',{name:'Publier la recommandation'})).toBeEnabled();
 fireEvent.change(screen.getByLabelText('Titre'),{target:{value:'Mon enseignement'}});
 expect(screen.getByRole('button',{name:'Publier la recommandation'})).toBeDisabled();
});
it('reprend une demande après erreur réseau sans changer son identifiant',async()=>{
 const v=render(<RecommandationsAdministration authId={uid} transport={transport}/>);
 await screen.findByText(/Aucune recommandation enregistrée/);
 fireEvent.click(screen.getByRole('button',{name:'Ajouter un livre'}));remplir();
 rpc.mockRejectedValueOnce(Error('réseau'));fireEvent.click(screen.getByRole('button',{name:'Enregistrer en brouillon'}));
 await screen.findByRole('alert');const appel=rpc.mock.calls.find(x=>x[0]==='staff_hd_recommandation_enregistrer')![1];
 v.unmount();render(<RecommandationsAdministration authId={uid} transport={transport}/>);
 fireEvent.click(screen.getByRole('button',{name:'Réessayer l’enregistrement'}));await screen.findByText('Brouillon enregistré.');
 expect(rpc.mock.calls.filter(x=>x[0]==='staff_hd_recommandation_enregistrer')[1]![1]).toEqual(appel);expect(rows).toHaveLength(1);
});
it('le participant charge uniquement à l’ouverture et ouvrir le lien ne déclare aucune activité',async()=>{
 rows=[{id:'20000000-0000-4000-8000-000000000001',revision:1,categorie:'predication',titre:'Un enseignement choisi',auteur:'Prédicateur',langue:'fr',url:'https://example.org/message',description:'Pour réfléchir',acces:'gratuit',etat:'publie',validee_le:'2026-10-28T12:00:00Z'}];
 render(<RecommandationsHabitudes langue="fr" transport={transport}/>);expect(rpc).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:/Livres et prédications conseillés/}));
 const link=await screen.findByRole('link',{name:/Ouvrir la prédication/});
 expect(link).toHaveAttribute('href','https://example.org/message');expect(link).toHaveAttribute('rel','noopener noreferrer');
 expect(rpc.mock.calls.every(c=>c[0]==='hd_recommandations')).toBe(true);
 expect(screen.getByText(/Ouvrir un lien ne valide aucune activité/)).toBeInTheDocument();
});
it('une erreur de catalogue ne prétend pas qu’aucune recommandation n’existe',async()=>{
 rpc.mockRejectedValueOnce(Error('indisponible'));render(<RecommandationsHabitudes langue="en" transport={transport}/>);
 fireEvent.click(screen.getByRole('button',{name:/Recommended books/}));await screen.findByRole('alert');
 expect(screen.queryByText(/No recommendations have been/)).toBeNull();
});
it.each(['javascript:alert(1)','http://example.org','https://a:b@example.org','https://example.org/bonjour\n'])('refuse le lien %s',url=>{expect(lienRecommandationValide(url)).toBe(false);});
it('accepte un lien HTTPS avec paramètres',()=>{expect(lienRecommandationValide('https://www.youtube.com/watch?v=exemple')).toBe(true);});

