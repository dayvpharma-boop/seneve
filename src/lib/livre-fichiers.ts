import {supabase} from './supabase';

/** Livre PDF et livre audio (décision de Dr Justin du 04/11/2026) : coffre privé « livres », lisible
 * seulement par les acheteurs du format et de la langue (règle serveur seneve_061), ou un administrateur.
 * Chemins : pdf/<langue>/livre.pdf et audio/<langue>/<nn>.mp3. */
export type LangueLivre='fr'|'en';
export type MesLivres={pdf_fr:boolean;pdf_en:boolean;audio_fr:boolean;audio_en:boolean};
export const COFFRE_LIVRES='livres';
export const cheminPdf=(langue:LangueLivre)=>`pdf/${langue}/livre.pdf`;
export const cheminPiste=(langue:LangueLivre,nom:string)=>`audio/${langue}/${nom}`;
/** Nom de piste rangé dans le coffre : 01.mp3, 02.mp3… dans l'ordre choisi. */
export const nomPiste=(rang:number)=>`${String(rang).padStart(2,'0')}.mp3`;

export async function chargerMesLivres():Promise<MesLivres>{
 const r=await supabase.rpc('mes_livres');
 const d=r.data as Partial<MesLivres>|null;
 if(r.error||!d)throw r.error??Error('Accès indisponible');
 return {pdf_fr:d.pdf_fr===true,pdf_en:d.pdf_en===true,audio_fr:d.audio_fr===true,audio_en:d.audio_en===true};
}
/** Lien temporaire vers un fichier du coffre ; le serveur refuse si le compte n'a pas acheté ce format. */
export async function lienLivre(chemin:string,secondes:number):Promise<string>{
 const r=await supabase.storage.from(COFFRE_LIVRES).createSignedUrl(chemin,secondes);
 if(r.error||!r.data?.signedUrl)throw r.error??Error('Lien indisponible');
 return r.data.signedUrl;
}
export async function pistesAudio(langue:LangueLivre):Promise<string[]>{
 const r=await supabase.storage.from(COFFRE_LIVRES).list(`audio/${langue}`,{limit:200,sortBy:{column:'name',order:'asc'}});
 if(r.error)throw r.error;
 return (r.data??[]).map(f=>f.name).filter(n=>/^\d{2}\.mp3$/.test(n)).sort();
}
