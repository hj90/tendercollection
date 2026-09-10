import {mkdir,writeFile} from 'node:fs/promises';

const apiKey=process.env.ANAKIN_API_KEY;
const prcOpportunityId=process.argv[2];
if(!apiKey)throw new Error('ANAkin_API_KEY is required');
if(!prcOpportunityId||!/^[A-Za-z0-9-]+$/.test(prcOpportunityId))throw new Error('Usage: npm run scrape:nsw -- <prcOpportunityId>');

const headers={'X-API-Key':apiKey,'Content-Type':'application/json'};
const response=await fetch('https://api.anakin.io/v1/url-scraper',{method:'POST',headers,body:JSON.stringify({url:`https://buy.nsw.gov.au/prcOpportunity/${prcOpportunityId}`,country:'au',formats:['json'],generateJson:true})});
if(!response.ok)throw new Error(`Anakin submit failed: HTTP ${response.status} ${await response.text()}`);
const submitted=await response.json() as {jobId?:string};
if(!submitted.jobId)throw new Error('Anakin response did not include a jobId');

let result:Record<string,unknown>|undefined;
for(let attempt=0;attempt<60;attempt++){
 const poll=await fetch(`https://api.anakin.io/v1/url-scraper/${encodeURIComponent(submitted.jobId)}`,{headers});
 if(!poll.ok)throw new Error(`Anakin poll failed: HTTP ${poll.status} ${await poll.text()}`);
 result=await poll.json() as Record<string,unknown>;
 if(result.status==='completed'||result.status==='failed')break;
 await new Promise(resolve=>setTimeout(resolve,2000));
}
if(!result||result.status!=='completed')throw new Error(`Anakin scrape did not complete: ${JSON.stringify(result)}`);

const generatedJson=result.generatedJson;
if(!generatedJson||typeof generatedJson!=='object'||!('data' in generatedJson))throw new Error('Anakin completed without generatedJson.data');
const candidate=(generatedJson as {data:unknown}).data;
const data=typeof candidate==='string'?JSON.parse(candidate):candidate;
if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Anakin generatedJson.data is not a JSON object');
await mkdir('data/nsw',{recursive:true});
const path=`data/nsw/${prcOpportunityId}.json`;
await writeFile(path,JSON.stringify(data,null,2)+'\n');
console.log(`Saved ${path}`);