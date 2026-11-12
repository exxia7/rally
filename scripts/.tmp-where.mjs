import fs from 'node:fs';
import { PNG } from 'pngjs';
const [a, b] = process.argv.slice(2).map((f) => PNG.sync.read(fs.readFileSync(f)));
let minx=1e9,miny=1e9,maxx=0,maxy=0;
for (let y=0;y<a.height;y++) for (let x=0;x<a.width;x++){const i=(y*a.width+x)*4; if(a.data[i]!==b.data[i]||a.data[i+1]!==b.data[i+1]||a.data[i+2]!==b.data[i+2]){minx=Math.min(minx,x);miny=Math.min(miny,y);maxx=Math.max(maxx,x);maxy=Math.max(maxy,y);}}
console.log(minx,miny,maxx,maxy);
