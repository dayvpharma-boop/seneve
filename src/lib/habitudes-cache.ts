/** Réduit la copie de l'espace pour les inscriptions Habitudes & Défis (HD).
 * Décision du 29/10/2026 (« Lire et noter ») : la ligne du parcours HD reste dans la copie, pour que l'onglet
 * ne disparaisse pas après une actualisation sans réseau. Ses contenus, activités, états et horaires n'y sont jamais
 * copiés : la journée HD a sa propre copie réduite (habitudes-copie-jour), affichée par l'écran Habitudes.
 * Cette fonction n'accorde aucun droit de lecture : elle ne fait que réduire le cache.
 */
export function retirerHabitudesDuCache<T>(donnees:T):T|null{
 if(!donnees||typeof donnees!=='object')return donnees;
 const d=donnees as Record<string,unknown>;
 // Une identification échouée ne doit pas devenir une autorisation de copie.
 if(d.classificationCacheVerifiee===false)return null;
 if(!Array.isArray(d.habitudes)||d.habitudes.length===0)return donnees;
 if(!['parcours','contents','activities','states'].every(k=>Array.isArray(d[k])))return null;
 const hd=new Set(d.habitudes),tous=d.parcours as Record<string,unknown>[];
 if(!tous.length)return null;
 const autres=tous.filter(p=>!hd.has(p.enrollment_id));
 const contents=(d.contents as Record<string,unknown>[]).filter(c=>autres.some(p=>p.programme_id===c.programme_id&&String(p.version)===String(c.version)&&(c.langue==null||p.langue===c.langue)));
 const cids=new Set(contents.map(c=>c.content_id));
 const activities=(d.activities as Record<string,unknown>[]).filter(a=>cids.has(a.content_id));
 const aids=new Set(activities.map(a=>a.activity_id)),eids=new Set(autres.map(p=>p.enrollment_id));
 const states=(d.states as Record<string,unknown>[]).filter(e=>eids.has(e.enrollment_id)&&aids.has(e.activity_id));
 // Copie déjà réduite : même objet, pour ne pas la réécrire à chaque lecture.
 if(contents.length===(d.contents as unknown[]).length&&activities.length===(d.activities as unknown[]).length&&states.length===(d.states as unknown[]).length&&d.horairesHabitudes===undefined)return donnees;
 const {horairesHabitudes:_h,...reste}=d;void _h;
 return {...reste,contents,activities,states} as T;
}
