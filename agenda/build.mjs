import {build} from 'esbuild';
await build({entryPoints:['src/main.tsx'],bundle:true,outfile:'app.js',minify:true,jsx:'automatic',target:['es2022'],legalComments:'eof',define:{'process.env.NODE_ENV':'"production"'},...(process.env.AGENDA_DEPENDENCIES?{nodePaths:[process.env.AGENDA_DEPENDENCIES]}:{})});
