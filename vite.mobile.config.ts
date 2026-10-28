import {mergeConfig} from 'vite';
import base from './vite.config';
export default mergeConfig(base,{
  base:'/',
  define:{
    'import.meta.env.VITE_SENEVE_MOBILE':JSON.stringify('1'),
    'import.meta.env.VITE_HABITUDES_DEFIS':JSON.stringify('true'),
    'import.meta.env.VITE_HABITUDES_COMPTEUR':JSON.stringify('true'),
    'import.meta.env.VITE_HABITUDES_RAPPELS':JSON.stringify('false'),
    'import.meta.env.VITE_HABITUDES_INSCRIPTION':JSON.stringify('fermee'),
  },
  build:{outDir:'dist-mobile'},
});

