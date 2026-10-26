import configuration from '../../vite.config';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const racine=fileURLToPath(new URL('../../',import.meta.url));

export default {
 ...configuration,
 root:racine,
 cacheDir:path.join(racine,'.vite-cache-recette'),
 resolve:{...configuration.resolve,alias:{'@':path.join(racine,'src')}},
 test:{...configuration.test,setupFiles:[path.join(racine,'src/test/setup.ts')]},
 build:{...configuration.build,outDir:'dist-recette-hd',emptyOutDir:true,rollupOptions:{input:'recette-hd.html'}},
};
