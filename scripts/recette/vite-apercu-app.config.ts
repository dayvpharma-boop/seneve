import configuration from '../../vite.config';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
// Aperçu de l'application entière (vraies routes, vrais styles) avec un compte fictif et sans réseau. Recette visuelle locale.
const racine=fileURLToPath(new URL('../../',import.meta.url));
const g=path.join(racine,'scripts/recette/galerie');
export default {
 ...configuration,
 cacheDir:path.join(racine,'.vite-cache-apercu'),
 resolve:{...configuration.resolve,alias:[
  {find:/^(@\/lib|\.)\/supabase$/,replacement:path.join(g,'app-supabase-fictif.ts')},
  {find:/^(@\/lib|\.)\/habitudes-jour-recette$/,replacement:path.join(g,'jour-fictif.ts')},
  {find:'@',replacement:path.join(racine,'src')},
 ]},
 build:{...configuration.build,outDir:path.join(racine,'dist-apercu/seneve'),emptyOutDir:true},
};
