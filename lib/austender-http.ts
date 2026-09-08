import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {AUSTENDER_USER_AGENT,noticeUrl} from './parsers/austender';
const exec=promisify(execFile);
const FEED='https://www.tenders.gov.au/public_data/rss/rss.xml';
export async function getAusTenderText(url:string,warn:(s:string)=>void):Promise<string>{
 if(url!==FEED)noticeUrl(url);
 const accept=url===FEED?'application/rss+xml, application/xml, text/xml':'text/html';
 let body:string;
 try{
  const response=await fetch(url,{headers:{'User-Agent':AUSTENDER_USER_AGENT,'Accept':accept},redirect:'error',signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  body=await response.text();
 }catch(error){
  const cause=error instanceof Error?error.cause:undefined;
  const details=error instanceof Error?`${error.message}${cause?' ('+String(cause)+')':''}`:String(error);
  warn(`AusTender Node HTTP transport: ${details}. Retrying with curl and normal TLS verification.`);
  const result=await exec('curl',['--fail','--silent','--show-error','--max-time','40','--retry','2','--retry-delay','1','--max-filesize','10000000','--proto','=https','--user-agent',AUSTENDER_USER_AGENT,'--header',`Accept: ${accept}`,url],{timeout:125000,maxBuffer:10_000_000});
  body=result.stdout;
 }
 if(body.length>10_000_000)throw new Error('Unexpectedly large AusTender response');
 return body;
}
