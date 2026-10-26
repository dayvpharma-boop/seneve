// Remplace src/lib/supabase.ts dans la galerie de recette : aucun réseau, aucune donnée réelle.
const vide={data:null,error:{message:'galerie hors réseau'}};
const chaine:any=new Proxy({},{get:(_c,p)=>p==='then'?undefined:()=>chaine});
export const supabase:any={
 rpc:async()=>vide,
 from:()=>chaine,
 auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
};
