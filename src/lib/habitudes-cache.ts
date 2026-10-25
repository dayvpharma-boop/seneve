/** Exclut les inscriptions identifiées HD d'une copie de l'espace.
 * Cette fonction n'accorde aucun droit de lecture : elle ne fait que réduire le cache.
 */
export function retirerHabitudesDuCache<T>(donnees:T):T|null{
 if(!donnees||typeof donnees!=='object')return donnees;
 const d=donnees as Record<string,unknown>;
 if(!Array.isArray(d.habitudes)||d.habitudes.length===0)return donnees;
 if(!['parcours','contents','activities','states'].every(k=>Array.isArray(d[k])))return null;
 const hd=new Set(d.habitudes),parcours=(d.parcours as Record<string,unknown>[]).filter(p=>!hd.has(p.enrollment_id));
 if(!parcours.length)return null;
 const contents=(d.contents as Record<string,unknown>[]).filter(c=>parcours.some(p=>p.programme_id===c.programme_id&&String(p.version)===String(c.version)&&(c.langue==null||p.langue===c.langue)));
 const cids=new Set(contents.map(c=>c.content_id));
 const activities=(d.activities as Record<string,unknown>[]).filter(a=>cids.has(a.content_id));
 const aids=new Set(activities.map(a=>a.activity_id)),eids=new Set(parcours.map(p=>p.enrollment_id));
 const states=(d.states as Record<string,unknown>[]).filter(e=>eids.has(e.enrollment_id)&&aids.has(e.activity_id));
 return {...d,parcours,contents,activities,states,habitudes:[],fuseauHabitudes:undefined} as T;
}
