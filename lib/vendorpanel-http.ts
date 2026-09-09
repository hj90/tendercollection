import {parseVendorPanelPreview} from './parsers/vendorpanel-preview';
import {classify} from './normalise';
import type {ParsedTender,Tender} from './types';
const UA='Mozilla/5.0 (compatible; TenderCollection/1.0; +https://tendercollection.vercel.app/about/)';
export function vendorPanelPreviewUrl(t:{id:string;reference:string|null}){
 if(!/^[a-f0-9]{32}$/i.test(t.id)||!/^VP\d+$/i.test(t.reference??''))throw new Error('Invalid VendorPanel preview identifier');
 return `https://www.vendorpanel.com.au/PublicTenderPreviewPop.aspx?id=${t.id}s${t.reference!.slice(2)}`;
}
export async function getVendorPanelPreview(url:string){const parsed=new URL(url);if(parsed.origin!=='https://www.vendorpanel.com.au'||parsed.pathname!=='/PublicTenderPreviewPop.aspx'||![...parsed.searchParams.keys()].every(k=>k==='id'))throw new Error('Unexpected VendorPanel preview URL');
 const response=await fetch(url,{headers:{'User-Agent':UA,'Accept':'text/html'},redirect:'error',signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(`VendorPanel preview HTTP ${response.status}`);const body=await response.text();if(body.length>2_000_000)throw new Error('Unexpectedly large VendorPanel preview');return body;}
export async function enrichVendorPanel(records:ParsedTender[],previous:Tender[],fetcher=getVendorPanelPreview,warn:(s:string)=>void=console.warn){
 const old=new Map(previous.map(t=>[t.id,t.vendorPanelDetails]));let cursor=0;const output=[...records];
 await Promise.all(Array.from({length:Math.min(6,records.length)},async()=>{while(cursor<records.length){const i=cursor++;const t=records[i];try{const html=await fetcher(vendorPanelPreviewUrl(t));const {opportunityDescription,...details}=parseVendorPanelPreview(html);const description=opportunityDescription||t.description;output[i]={...t,description,requestType:classify(t.title,description),vendorPanelDetails:details};}catch(error){const prior=old.get(t.id);if(prior)output[i]={...t,vendorPanelDetails:prior};warn(`VendorPanel ${t.reference} public preview unavailable: ${error instanceof Error?error.message:String(error)}${prior?'; retained previous details':''}`);}}}));
 return output;
}
