import {readdir,readFile,writeFile,rename} from 'node:fs/promises';
import {parseNSWDetail} from '../lib/parsers/nsw';
import type {Tender} from '../lib/types';

const now=new Date().toISOString();
const files=(await readdir('data/nsw',{withFileTypes:true})).filter(file=>file.isFile()&&file.name.endsWith('.json')).sort();
const tenders=JSON.parse(await readFile('data/tenders.json','utf8')) as Tender[];
const known=new Set(tenders.filter(tender=>tender.source==='nsw').map(tender=>tender.id));
let added=0;
for(const file of files){
 const data=JSON.parse(await readFile(`data/nsw/${file.name}`,'utf8'));
 const sourceUrl=`https://buy.nsw.gov.au/prcOpportunity/${data.metadata?.opportunityID??data.metadata?.opportunityId??file.name.replace(/\.json$/,'')}`;
 const parsed=parseNSWDetail(data,sourceUrl,console.warn);
 if(known.has(parsed.id))continue;
 tenders.push({...parsed,firstSeenAt:now,changes:[]});
 known.add(parsed.id);added++;
}
if(added){
 const output=JSON.stringify(tenders,null,2)+'\n';
 await writeFile('data/tenders.json.tmp',output);await rename('data/tenders.json.tmp','data/tenders.json');
}
console.log(`NSW import: ${added} added, ${files.length} files scanned`);