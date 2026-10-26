import configuration from '../../vite.config';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
// Galerie de recette visuelle HD : même chaîne de construction que le site, modules réseau remplacés par des données fictives.
const racine=fileURLToPath(new URL('../../',import.meta.url));
const g=path.join(racine,'scripts/recette/galerie');
export default {
 ...configuration,
 root:g,
 base:'./',
 cacheDir:path.join(racine,'.vite-cache-galerie'),
 resolve:{...configuration.resolve,alias:[
  {find:/^(@\/lib|\.)\/supabase$/,replacement:path.join(g,'supabase-fictif.ts')},
  {find:/^(@\/lib|\.)\/habitudes-jour-recette$/,replacement:path.join(g,'jour-fictif.ts')},
  {find:'@',replacement:path.join(racine,'src')},
 ]},
 build:{...configuration.build,outDir:path.join(racine,'dist-galerie-hd'),emptyOutDir:true,rollupOptions:{input:path.join(g,'galerie-hd.html')}},
};
