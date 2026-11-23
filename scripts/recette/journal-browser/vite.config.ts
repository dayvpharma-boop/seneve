import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
const racine=fileURLToPath(new URL('./',import.meta.url));
export default defineConfig({root:racine,plugins:[react()],resolve:{alias:[
 {find:/^(?:@\/lib|\.)\/supabase$/,replacement:racine+'auth-fictif.ts'},
 {find:'@',replacement:fileURLToPath(new URL('../../../src',import.meta.url))},
]},build:{outDir:fileURLToPath(new URL('../../../dist-recette-journal',import.meta.url)),emptyOutDir:true}});
