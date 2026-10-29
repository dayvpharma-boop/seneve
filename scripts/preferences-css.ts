import type {Plugin} from 'postcss';

/** Les valeurs par défaut sont les couleurs exactes déjà publiées.
 * Les palettes remplacent seulement les couleurs d’interface connues, jamais les images. */
const COULEURS:Record<string,string>={
  '#fff9ea':'papier','#f4eedf':'ivoire','#fcfaf5':'surface','#fff':'surface','#ffffff':'surface',
  '#f9f3e4':'doux','#f3edde':'carte','#eee8d9':'haut','#e8e2d3':'ligne','#e5dcbe':'ligne',
  '#1d1c13':'encre','#0a0907':'encre','#000':'encre','#000000':'encre','#1d1b19':'encre',
  '#4a463f':'secondaire','#755b00':'accent','#5d6246':'accent','#785d00':'sur-accent','#584400':'sur-accent','#3f2c00':'sur-accent',
  '#fed977':'or-doux','#ffe08f':'or-doux','#fff0c9':'or-pale','#c9a84c':'or','#ccc6bd':'contour','#8c836d':'contour',
  '#141310':'nuit','#12100c':'nuit','#1d1b18':'nuit-surface','#1c1a15':'nuit-surface',
  '#211f1c':'nuit-doux','#2b2a26':'nuit-haut','#363531':'nuit-ligne','#4e4638':'nuit-contour',
  '#e6e2dc':'nuit-texte','#d1c5b3':'nuit-secondaire','#ffd482':'nuit-accent','#e6c364':'nuit-accent',
  // Neutres crème et gris chauds des maquettes Stitch, reliés à la palette (passage au bleu lavande, 29/10/2026).
  '#fef9ea':'papier','#f8f4e4':'doux','#f2eedf':'doux','#f7f2e8':'doux','#ede8d9':'haut','#ece5d3':'carte',
  '#e7e2d4':'ligne','#e8e2d4':'ligne','#e7e2d6':'ligne','#dedacb':'ligne','#eae2d3':'ligne','#e3dccb':'ligne',
  '#fffdf6':'surface','#fffdf7':'surface','#fffdfa':'surface','#fffdf8':'surface',
  '#d0c5b2':'contour','#cac6bb':'contour','#7e7665':'contour','#7b776f':'contour','#7a7365':'contour',
  '#48473e':'secondaire','#4d4637':'secondaire','#59564f':'secondaire','#605e55':'secondaire','#514b41':'secondaire','#49453d':'secondaire',
  '#16140e':'encre','#151410':'encre','#1b1a17':'encre',
  '#e6c366':'or','#fed978':'or-doux','#ffdf90':'or-doux','#f3ead0':'or-pale','#fff3cd':'or-pale','#fdf3e7':'or-pale','#494643':'secondaire',
};
export function valeurCouleurs(value:string) {
  return value.replace(/#[\da-f]{3,8}\b/gi,hex=>{
    const role=COULEURS[hex.toLowerCase()];return role?`var(--palette-${role}, ${hex})`:hex;
  });
}
export function valeurTypographie(value:string) {
  if(value.includes('--texte-echelle'))return value;
  return value.replace(/(-?(?:\d*\.)?\d+)px\b/g,(px,n)=>Number(n)===0?px:`calc(${n}px * var(--texte-echelle, 1))`);
}
/** Mise à l’échelle du texte et de son interligne, sans agrandir les images ni les zones de mise en page. */
export function preferencesCss():Plugin {
  return {postcssPlugin:'seneve-preferences-visuelles',Once(root){root.walkDecls(decl=>{
    if(decl.prop==='content'||decl.value.includes('url(')||decl.prop.startsWith('--palette-')||decl.prop.startsWith('--echantillon-'))return;
    if(['font','font-size','line-height'].includes(decl.prop))decl.value=valeurTypographie(decl.value);
    decl.value=valeurCouleurs(decl.value);
  });}};
}
