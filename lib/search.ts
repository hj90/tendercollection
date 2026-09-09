import type {Tender} from './types';
export type Listing=Pick<Tender,'id'|'source'|'title'|'buyer'|'state'|'categories'|'requestType'|'closingAt'|'closingAtRaw'|'publishedAt'|'sourceUrl'> & {summary:string;archivedAt?:string};
export type SearchIndex=Record<string,number[]>;
export const tokens=(s:string)=>[...new Set(s.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[])];
export function createIndex(items:Tender[]):SearchIndex {
 const index:SearchIndex={};items.forEach((t,i)=>tokens(`${t.title} ${t.buyer} ${t.description}`).forEach(word=>(index[word]??=[]).push(i)));return index;
}
export function compact(t:Tender&{archivedAt?:string}):Listing {
 const {id,source,title,buyer,state,categories,requestType,closingAt,closingAtRaw,publishedAt,sourceUrl,archivedAt}=t;
 const clean=t.description.replace(/\s+/g,' ').trim();const summary=clean.length>300?clean.slice(0,297).trimEnd()+'…':clean;
 return {id,source,title,buyer,state,categories,requestType,closingAt,closingAtRaw,publishedAt,sourceUrl,summary,...(archivedAt?{archivedAt}:{})};
}
// Shared browsing groups sit above each source taxonomy. Original categories
// remain on records and tender pages.
export const categoryGroups = [
 ['it','IT & digital'],
 ['construction','Construction & infrastructure'],
 ['professional','Professional services'],
 ['transport','Transport, fleet & logistics'],
 ['health','Health & community'],
 ['environment','Environment, waste & water'],
 ['facilities','Facilities & property'],
 ['equipment','Equipment, materials & supplies'],
 ['education','Education & training'],
 ['communications','Communications, media & events'],
 ['agriculture','Agriculture & resources'],
 ['security','Security, defence & emergency'],
 ['other','Other'],
] as const;
export type CategoryGroup = typeof categoryGroups[number][0];
const categoryRules: Array<[Exclude<CategoryGroup,'other'>,RegExp]> = [
 ['it',/(?:\b(?:software|computer|data|digital|cloud|cyber|telecom|internet|information technology|communications devices|saas|platform)\b|\bit\s*&)/i],
 ['construction',/\b(?:building|construction|engineering|road|railway|tramway|civil|infrastructure|architecture|planning|trade|repairs?|maintenance)\b/i],
 ['professional',/\b(?:management|advisory|consult|business|administrative|financial|insurance|legal|economic analysis|project management|research|technical writing|hr services|recruitment)\b/i],
 ['transport',/\b(?:transport|vehicles?|fleet|freight|logistics|aviation|aircraft|marine|watercraft|parking|traffic)\b/i],
 ['health',/\b(?:health|medical|community|social services|laboratory|scientific|disability)\b/i],
 ['environment',/\b(?:environment|heritage|waste|landfill|water|sewage|horticulture|arboriculture|renewable)\b/i],
 ['facilities',/\b(?:property|real estate|cleaning|catering|hospitality|venue|furniture|facilities)\b/i],
 ['equipment',/\b(?:equipment|supplies|materials|tools|machinery|plant|electronic components|lighting|fuel|oil|chemicals|products)\b/i],
 ['education',/\b(?:education|training|development programs?)\b/i],
 ['communications',/\b(?:advertising|media|marketing|communications|audio visual|event|printing|photographic|public relations|exhibition)\b/i],
 ['agriculture',/\b(?:agriculture|farming|animal|crop|fishing|aquaculture|mining|quarrying|oil and gas)\b/i],
 ['security',/\b(?:security|defence|defense|military|fire|safety|emergency|police)\b/i],
];
export function categoryGroup(category:string):CategoryGroup {
 return categoryRules.find(([,rule])=>rule.test(category))?.[0]??'other';
}
export const isITCategory=(category:string)=>categoryGroup(category)==='it';
export function listingParams(params:URLSearchParams,history=false){
 const next=new URLSearchParams(params);if(!history&&!next.has('category'))next.set('category','it');return next;
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
 return (!params.get('state')||(t.state??'unknown')===params.get('state'))&&(!params.get('category')||params.get('category')==='all'||t.categories.some(category=>categoryGroup(category)===params.get('category')))&&(!params.get('buyer')||t.buyer===params.get('buyer'))&&(!params.get('type')||t.requestType===params.get('type'))&&(!params.get('source')||t.source===params.get('source'));
 }).map(({t})=>t).sort((a,b)=>params.get('sort')==='closing'?(Date.parse(a.closingAt!)-Date.parse(b.closingAt!)):(Date.parse(b.publishedAt??'')||0)-(Date.parse(a.publishedAt??'')||0));
}
