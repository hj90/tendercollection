import type {Tender} from './types';
export type Listing=Pick<Tender,'id'|'source'|'title'|'buyer'|'state'|'categories'|'requestType'|'closingAt'|'closingAtRaw'|'publishedAt'|'sourceUrl'> & {archivedAt?:string};
export type SearchIndex=Record<string,number[]>;
export const tokens=(s:string)=>[...new Set(s.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[])];
export function createIndex(items:Tender[]):SearchIndex {
 const index:SearchIndex={};items.forEach((t,i)=>tokens(`${t.title} ${t.buyer} ${t.description}`).forEach(word=>(index[word]??=[]).push(i)));return index;
}
export function compact(t:Tender&{archivedAt?:string}):Listing {
 const {id,source,title,buyer,state,categories,requestType,closingAt,closingAtRaw,publishedAt,sourceUrl,archivedAt}=t;
 return {id,source,title,buyer,state,categories,requestType,closingAt,closingAtRaw,publishedAt,sourceUrl,...(archivedAt?{archivedAt}:{})};
}
export const filterKeys=['q','state','category','buyer','type','source','window','sort'] as const;
export function filterListings(items:Listing[],index:SearchIndex,params:URLSearchParams,now:number,history=false) {
 const query=tokens(params.get('q')??'');const match=query.map(q=>new Set(Object.entries(index).filter(([word])=>word.startsWith(q)).flatMap(([,ids])=>ids)));
 const days=Number(params.get('window'));const closingView=[7,14,30].includes(days)||params.get('sort')==='closing';
 return items.map((t,i)=>({t,i})).filter(({t,i})=>{
 if(match.some(set=>!set.has(i)))return false;
 if(!history&&t.closingAt&&Date.parse(t.closingAt)<=now)return false;
 if(closingView&&(t.requestType==='forward-notice'||!t.closingAt||Date.parse(t.closingAt)<=now||t.archivedAt))return false;
 if([7,14,30].includes(days)&&Date.parse(t.closingAt!)>now+days*86400000)return false;
 return (!params.get('state')||(t.state??'unknown')===params.get('state'))&&(!params.get('category')||t.categories.includes(params.get('category')!))&&(!params.get('buyer')||t.buyer===params.get('buyer'))&&(!params.get('type')||t.requestType===params.get('type'))&&(!params.get('source')||t.source===params.get('source'));
 }).map(({t})=>t).sort((a,b)=>params.get('sort')==='closing'?(Date.parse(a.closingAt!)-Date.parse(b.closingAt!)):(Date.parse(b.publishedAt??'')||0)-(Date.parse(a.publishedAt??'')||0));
}
