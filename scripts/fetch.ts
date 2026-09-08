import {readFile,writeFile,rename} from 'node:fs/promises';
import {parseVendorPanel} from '../lib/parsers/vendorpanel';
import {parseAusTender,enrichAusTender,AUSTENDER_USER_AGENT,noticeUrl} from '../lib/parsers/austender';
import {diffSnapshots,key} from '../lib/snapshot';
import {buyerInfo} from '../lib/normalise';
import type {Tender,ArchivedTender,Buyers,Metadata,Source,ParsedTender} from '../lib/types';
const now=new Date().toISOString();
const read=async<T,>(name:string):Promise<T>=>JSON.parse(await readFile(`data/${name}.json`,'utf8'));
const [active,archive,buyers,meta]=await Promise.all([read<Tender[]>('tenders'),read<ArchivedTender[]>('archive'),read<Buyers>('buyers'),read<Metadata>('meta')]);
const urls:Record<Source,string>={vendorpanel:'https://www.vendorpanel.com.au/PublicTendersRssV2.aspx?mode=all',austender:'https://www.tenders.gov.au/public_data/rss/rss.xml'};
const report:{at:string;sources:Record<string,unknown>}={at:now,sources:{}};
const snapshots:Partial<Record<Source,ParsedTender[]>>={};
await Promise.all((Object.keys(urls) as Source[]).map(async source=>{
 const warnings:string[]=[];const warn=(message:string)=>{warnings.push(message);console.warn(`WARNING [${source}] ${message}`);};
 try{
 const response=await fetch(urls[source],{headers:{'User-Agent':source==='austender'?AUSTENDER_USER_AGENT:'TenderCollection/1.0 (+https://tendercollection.vercel.app/about/; public RSS aggregator)','Accept':'application/rss+xml, application/xml, text/xml'},signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw new Error(`HTTP ${response.status}`);
 const xml=await response.text();if(xml.length>10_000_000)throw new Error('Unexpectedly large RSS response');
 const records=source==='vendorpanel'?parseVendorPanel(xml,buyers,warn):await enrichAusTender(parseAusTender(xml,warn),async url=>{
 noticeUrl(url);
 const page=await fetch(url,{headers:{'User-Agent':AUSTENDER_USER_AGENT,'Accept':'text/html'},redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!page.ok)throw new Error(`AusTender detail HTTP ${page.status}: ${url}`);
 const html=await page.text();if(html.length>2_000_000)throw new Error('Unexpectedly large AusTender detail page');
 return html;
 },warn);
 if(new Set(records.map(key)).size!==records.length)throw new Error('Duplicate feed identifiers');
 // An empty feed is too risky to treat as mass disappearance without operator review.
 if(!records.length)throw new Error('Empty source snapshot; retaining previous records');
 if(source==='vendorpanel'){
 const mapped=records.filter(t=>{const info=buyerInfo(t.buyer,t.closingAtRaw,buyers,()=>{});return info.mapped&&info.state!==null;}).length;
 console.log(`VendorPanel buyer-map state coverage: ${mapped}/${records.length} (${(100*mapped/records.length).toFixed(1)}%)`);
 if(mapped/records.length<.9)warn('Buyer-map state coverage below 90%; extend data/buyers.json');
 }
 snapshots[source]=records;
 // This timestamp describes the committed snapshot, not a claim of continuous freshness.
 // Routine successful polls go to an Actions artifact, avoiding timestamp-only commits.
 const current=active.filter(t=>t.source===source).map(({firstSeenAt,changes,...t})=>t).sort((a,b)=>key(a).localeCompare(key(b)));
 const sorted=[...records].sort((a,b)=>key(a).localeCompare(key(b)));
 if(JSON.stringify(current)!==JSON.stringify(sorted)||meta[source].status!=='ok')meta[source]={status:'ok',snapshotAt:now,message:null};
 report.sources[source]={status:'ok',lastSuccessfulFetchAt:now,count:records.length,warnings};
 console.log(`${source}: ${records.length} records`);
 }catch(error){
 const message=error instanceof Error?error.message:String(error);warn(`${message}; retaining previous snapshot.`);
 meta[source]={...meta[source],status:'unavailable',message:'Feed unavailable; previous snapshot retained. Check the source for current information.'};
 report.sources[source]={status:'unavailable',error:message,lastSuccessfulSnapshotAt:meta[source].snapshotAt,warnings};
 }
}));
const result=diffSnapshots(active,archive,snapshots,now);
for(const [name,data] of Object.entries({...result,meta})){
 const path=`data/${name}.json`;const output=JSON.stringify(data,null,2)+'\n';
 if(await readFile(path,'utf8')!==output){await writeFile(path+'.tmp',output);await rename(path+'.tmp',path);console.log(`Updated ${path}`);}
}
await writeFile('data/fetch-report.json',JSON.stringify(report,null,2)+'\n');
if(!Object.keys(snapshots).length){console.error('All feeds unavailable; snapshot retained.');process.exitCode=1;}
