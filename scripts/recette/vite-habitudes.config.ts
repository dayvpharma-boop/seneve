import configuration from '../../vite.config';

export default {
 ...configuration,
 build:{...configuration.build,outDir:'dist-recette-hd',emptyOutDir:true,rollupOptions:{input:'recette-hd.html'}},
};
