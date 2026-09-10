import {rename,writeFile} from 'node:fs/promises';

const apiKey=process.env.ANAKIN_API_KEY;
const headers={'X-API-Key':apiKey??'','Content-Type':'application/json'};
const baseUrl='https://buy.nsw.gov.au/opportunity/search?query=&categories=&types=&area=&page=';
if(!apiKey)throw new Error('ANAkin_API_KEY is required');

type NSWJob={url?:string;[key:string]:unknown};
type NSWPage={jobs?:NSWJob[];pageTitle?:string;pageType?:string;totalJobs?:number;[key:string]:unknown};
type AnakinResult={status?:string;generatedJson?:{data?:unknown};[key:string]:unknown};

async function scrapePage(page:number):Promise<NSWPage>{
 const submit=await fetch('https://api.anakin.io/v1/url-scraper',{method:'POST',headers,body:JSON.stringify({url:baseUrl+page,country:'au',formats:['json'],generateJson:true})});
 if(!submit.ok)throw new Error(`Anakin submit failed for page ${page}: HTTP ${submit.status} ${await submit.text()}`);
 const submitted=await submit.json() as {jobId?:string};
 if(!submitted.jobId)throw new Error(`Anakin response for page ${page} did not include a jobId`);
 let result:AnakinResult|undefined;
 for(let attempt=0;attempt<60;attempt++){
  const poll=await fetch(`https://api.anakin.io/v1/url-scraper/${encodeURIComponent(submitted.jobId)}`,{headers});
  if(!poll.ok)throw new Error(`Anakin poll failed for page ${page}: HTTP ${poll.status} ${await poll.text()}`);
  result=await poll.json() as AnakinResult;
  if(result.status==='completed'||result.status==='failed')break;
  await new Promise(resolve=>setTimeout(resolve,2000));
 }
 if(!result||result.status!=='completed')throw new Error(`Anakin scrape failed for page ${page}: ${JSON.stringify(result)}`);
 const data=result.generatedJson?.data;
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error(`Anakin page ${page} has no generatedJson.data object`);
 return data as NSWPage;
}

console.log('Processing page 1');
const first=await scrapePage(1);
if(!Array.isArray(first.jobs)||typeof first.totalJobs!=='number')throw new Error('NSW page 1 did not contain jobs and totalJobs');
const jobs:NSWJob[]=[];
const seen=new Set<string>();
const add=(page:NSWPage)=>{
 for(const job of page.jobs??[]){
  const key=typeof job.url==='string'?job.url:JSON.stringify(job);
  if(!seen.has(key)){seen.add(key);jobs.push(job);}
 }
};
const save=async()=>{
 const output={...first,jobs,totalJobs};
 await writeFile('data/nsw-list.json.tmp',JSON.stringify(output,null,2)+'\n');
 await rename('data/nsw-list.json.tmp','data/nsw-list.json');
};
add(first);
const totalJobs=first.totalJobs;
const pageSize=first.jobs.length;
if(!pageSize)throw new Error('NSW page 1 contained no jobs');
await save();
const lastPage=Math.ceil(totalJobs/pageSize);
for(let page=2;page<=lastPage&&jobs.length<totalJobs;page++){
 console.log(`Processing page ${page}`);
 const current=await scrapePage(page);
 const before=jobs.length;add(current);
 if(jobs.length===before){console.warn(`NSW pagination stopped making progress at page ${page}`);break;}
 await save();
}
if(jobs.length!==totalJobs)console.warn(`NSW pagination ended with ${jobs.length} of ${totalJobs} jobs`);
console.log(`Saved data/nsw-list.json with ${jobs.length} of ${totalJobs} jobs`);