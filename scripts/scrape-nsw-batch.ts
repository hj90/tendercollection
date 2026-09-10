import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';

const start=Number(process.argv[2]);
const end=Number(process.argv[3]);
if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start)throw new Error('Usage: npm run scrape:nsw:batch -- <start index> <final index>');

type NSWJob={url?:string};
const listing=JSON.parse(await readFile('data/nsw-list.json','utf8')) as {jobs?:NSWJob[]};
if(!Array.isArray(listing.jobs))throw new Error('data/nsw-list.json does not contain a jobs array');

if(end>listing.jobs.length)throw new Error(`Final index ${end} exceeds ${listing.jobs.length} jobs in data/nsw-list.json`);
const jobs=listing.jobs.slice(start-1,end);
for(const [offset,job] of jobs.entries()){
 const index=start+offset;
 const match=job.url?.match(/\/prcOpportunity\/([^/?#]+)/i);
 if(!match){console.warn(`Skipping job ${index}: not a prcOpportunity URL`);continue;}
 const opportunityId=decodeURIComponent(match[1]);
 console.log(`Scraping job ${index}/${end}: ${opportunityId}`);
 await new Promise<void>((resolve,reject)=>{
  const child=spawn(process.execPath,['--import','tsx','scripts/scrape-nsw.ts',opportunityId],{stdio:'inherit',env:process.env});
  child.once('error',reject);
  child.once('exit',code=>code===0?resolve():reject(new Error(`scrape-nsw.ts failed for ${opportunityId} with exit code ${code}`)));
 });
}

console.log(`Finished NSW batch: jobs ${start}-${end} selected`);