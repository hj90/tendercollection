"use client";
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useSearchParams,useRouter,usePathname} from 'next/navigation';
import {filterListings,type Listing as ListingType,type SearchIndex} from '../lib/search';
import {buyerPath,tenderPath,typeLabels,sourceLabels} from '../lib/urls';
import LocalDate from './LocalDate';
export default function Listing({items,index,history=false}:{items:ListingType[];index:SearchIndex;history?:boolean}){
 const params=useSearchParams();const router=useRouter();const pathname=usePathname();const [now,setNow]=useState<number|null>(null);const [limit,setLimit]=useState(30);const [draft,setDraft]=useState(params.get('q')??'');
 useEffect(()=>{setNow(Date.now());const id=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(id)},[]);
 useEffect(()=>{setDraft(params.get('q')??'');setLimit(30)},[params]);
 function change(key:string,value:string){const next=new URLSearchParams(params.toString());value?next.set(key,value):next.delete(key);router.push(pathname+(next.size?'?'+next.toString():''),{scroll:false});}
 const results=useMemo(()=>filterListings(items,index,new URLSearchParams(params.toString()),now??Date.now(),history),[items,index,params,now,history]);
 const options=(key:'state'|'buyer'|'categories')=>[...new Set(items.flatMap(t=>key==='categories'?t.categories:[t[key]??'unknown']))].sort();
 const select=(key:string,label:string,values:string[],labels:Record<string,string>={})=><label>{label}<select value={params.get(key)??''} onChange={e=>change(key,e.target.value)}><option value="">All {label.toLowerCase()}</option>{values.map(v=><option key={v} value={v}>{labels[v]??v}</option>)}</select></label>;
 return <div className="workspace"><aside><div className="filter-heading"><h2>Refine your search</h2><button onClick={()=>router.push(pathname,{scroll:false})}>Reset</button></div>
 {select('state','States',options('state'),{unknown:'State not specified'})}{select('category','Categories',options('categories'))}{!history&&select('buyer','Buyers',options('buyer'))}{select('type','Request types',Object.keys(typeLabels),typeLabels)}{select('source','Sources',['vendorpanel','austender'],sourceLabels)}
 <label>Closing window<select value={params.get('window')??''} onChange={e=>change('window',e.target.value)}><option value="">Any time</option>{[7,14,30].map(n=><option key={n} value={n}>Within {n} days</option>)}</select></label>
 <p className="filter-note">Forward notices announce future work. They are excluded from closing-soon results.</p></aside>
 <section className="results"><form className="search" onSubmit={e=>{e.preventDefault();change('q',draft)}}><span aria-hidden="true">⌕</span><input aria-label="Search title, buyer and description" placeholder="Search tenders, buyers or keywords" value={draft} onChange={e=>setDraft(e.target.value)}/><button type="submit">Search</button></form>
 <div className="results-bar"><p aria-live="polite"><strong>{now===null?'—':results.length}</strong> {history?'current & archived records':'opportunities & notices'}</p><label>Sort by <select value={params.get('sort')??'newest'} onChange={e=>change('sort',e.target.value==='newest'?'':e.target.value)}><option value="newest">Newest published</option><option value="closing">Closing soonest</option></select></label></div>
 {now===null?<p className="empty">Checking closing dates…</p>:results.length===0?<div className="empty"><h2>No matching tenders</h2><p>Try another keyword or reset your filters.</p></div>:results.slice(0,limit).map(t=><article className={'tender-card '+(t.requestType==='forward-notice'?'forward':'')} key={t.source+t.id}>
 <div className="card-top"><Link className="buyer-link" href={buyerPath(t.buyer)}>{t.buyer}</Link><span className="state-tag">{t.state??'State not specified'}</span></div><h2><Link href={tenderPath(t)}>{t.title}</Link></h2>
 <div className="badges"><span className="type-badge">{typeLabels[t.requestType]}</span><span>{sourceLabels[t.source]}</span>{t.archivedAt&&<span className="archive-badge">Archived</span>}{!t.archivedAt&&t.closingAt&&Date.parse(t.closingAt)<=now&&<span>Closed</span>}</div>
 {t.requestType==='forward-notice'&&<p className="forward-note">Advance notice · not open for submissions</p>}
 <div className="categories">{t.categories.map(c=><span key={c}>{c}</span>)}</div>
 <div className="card-bottom"><div><span className="eyebrow">{t.requestType==='forward-notice'?'Source notice date':'Closes'}</span><LocalDate iso={t.closingAt} raw={t.closingAtRaw}/></div><a className="source-link" href={sourceUrl(t)} target="_blank" rel="noopener noreferrer">View source ↗</a></div></article>)}
 {now!==null&&results.length>limit&&<button className="load-more" onClick={()=>setLimit(limit+30)}>Show more ({results.length-limit} remaining)</button>}
 </section></div>;
}
// Links are supplied separately without full descriptions, contacts or change history.
function sourceUrl(t:ListingType){return (t as ListingType&{sourceUrl:string}).sourceUrl;}
