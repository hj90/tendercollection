"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {useSearchParams,useRouter,usePathname} from 'next/navigation';
import {categoryGroups,filterListings,listingParams,type Listing as ListingType,type SearchIndex} from '../lib/search';
import type {Tender} from '../lib/types';
import {buyerPath,tenderPath,typeLabels,sourceLabels} from '../lib/urls';
import LocalDate from './LocalDate';
import TenderPreview from './TenderPreview';

const itemKey=(t:{source:string;id:string})=>`${t.source}:${t.id}`;

export default function Listing({items,index,history=false,detailItems}:{items:ListingType[];index:SearchIndex;history?:boolean;detailItems?:Tender[]}){
 const params=useSearchParams();const router=useRouter();const pathname=usePathname();const [now,setNow]=useState<number|null>(null);const [limit,setLimit]=useState(30);const [draft,setDraft]=useState(params.get('q')??'');const [view,setView]=useState<'list'|'split'>('list');const [selected,setSelected]=useState<string|null>(null);const detailPanel=useRef<HTMLElement>(null);
 const filters=useMemo(()=>listingParams(new URLSearchParams(params.toString()),history),[params,history]);
 useEffect(()=>{if(!history&&!params.has('category'))router.replace(pathname+'?'+filters.toString(),{scroll:false});},[params,filters,history,router,pathname]);
 useEffect(()=>{setNow(Date.now());const id=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(id)},[]);
 useEffect(()=>{setDraft(params.get('q')??'');setLimit(30)},[params]);
 function change(key:string,value:string){const next=new URLSearchParams(filters.toString());value?next.set(key,value):next.delete(key);router.push(pathname+(next.size?'?'+next.toString():''),{scroll:false});}
 const results=useMemo(()=>filterListings(items,index,filters,now??Date.now(),history),[items,index,filters,now,history]);
 useEffect(()=>{if(view==='split'&&results.length&&!results.some(t=>itemKey(t)===selected))setSelected(itemKey(results[0]));},[view,results,selected]);
 const detailMap=useMemo(()=>new Map((detailItems??[]).map(t=>[itemKey(t),t])),[detailItems]);
 const selectedTender=selected?detailMap.get(selected):undefined;
 const options=(key:'state'|'buyer'|'categories')=>[...new Set(items.flatMap(t=>key==='categories'?t.categories:[t[key]??'unknown']))].sort();
 const select=(key:string,label:string,values:string[],labels:Record<string,string>={})=><label>{label}<select value={filters.get(key)??''} onChange={e=>change(key,e.target.value)}><option value={key==='category'?'all':''}>All {label.toLowerCase()}</option>{values.map(v=><option key={v} value={v}>{labels[v]??v}</option>)}</select></label>;
 const chips=[...filters.entries()].filter(([key,value])=>value&&key!=='sort'&&!(key==='category'&&value==='all'));
 const categoryLabels=Object.fromEntries(categoryGroups) as Record<string,string>;
 const chipLabel=(key:string,value:string)=>key==='category'?(value==='it'?'IT':categoryLabels[value]??value):key==='source'?sourceLabels[value as keyof typeof sourceLabels]??value:key==='type'?typeLabels[value]??value:key==='window'?`Closes within ${value} days`:key==='q'?`Search: ${value}`:value==='unknown'?'State not specified':value;
 function selectTender(key:string){if(view!=='split'||!window.matchMedia('(min-width: 901px)').matches)return;setSelected(key);requestAnimationFrame(()=>detailPanel.current?.scrollTo({top:0,behavior:'smooth'}));}
 const card=(t:ListingType)=>{const key=itemKey(t);const selectedCard=view==='split'&&key===selected;return <article className={'tender-card '+(t.requestType==='forward-notice'?'forward ':'')+(selectedCard?'selected-tender':'')} key={key} aria-current={selectedCard?'true':undefined} tabIndex={view==='split'?0:undefined} onClick={event=>{if((event.target as HTMLElement).closest('.buyer-link,.source-link'))return;selectTender(key)}} onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();selectTender(key)}}}>
  <div className="card-top"><Link className="buyer-link" href={buyerPath(t.buyer)}>{t.buyer}</Link><div className="card-closing"><span>{t.requestType==='forward-notice'?'Notice date':'Closing date'}</span><LocalDate iso={t.closingAt} raw={t.closingAtRaw}/></div></div>
  <div className="card-title-row"><h2><Link href={tenderPath(t)} onClick={event=>{if(view==='split'&&window.matchMedia('(min-width: 901px)').matches){event.preventDefault();selectTender(key)}}}>{t.title}</Link></h2><a className="source-link" href={sourceUrl(t)} target="_blank" rel="noopener noreferrer">View source ↗</a></div>
  <div className="card-subline"><span>{typeLabels[t.requestType]}</span><span>·</span><span>{t.state??'State not specified'}</span>{t.archivedAt&&<><span>·</span><span>Archived</span></>}{!t.archivedAt&&t.closingAt&&Date.parse(t.closingAt)<=now!&&<><span>·</span><span>Closed</span></>}</div>
  {t.requestType==='forward-notice'&&<p className="forward-note">Advance notice · not open for submissions</p>}
  {t.summary&&<p className="card-summary">{t.summary}</p>}
  <div className="categories"><span className="source-chip">{sourceLabels[t.source]}</span>{t.categories.map(c=><span key={c}>{c}</span>)}</div>
 </article>};
 return <div className="workspace horizontal-workspace"><section className="filter-panel" aria-label="Tender filters">
 <form className="search" onSubmit={e=>{e.preventDefault();change('q',draft)}}><span aria-hidden="true">⌕</span><input aria-label="Search title, buyer and description" placeholder="Search tenders, buyers or keywords" value={draft} onChange={e=>setDraft(e.target.value)}/><button type="submit">Search</button></form>
 <div className="filter-row">{select('state','States',options('state'),{unknown:'State not specified'})}{select('category','Categories',categoryGroups.map(([key])=>key),categoryLabels)}{!history&&select('buyer','Buyers',options('buyer'))}{select('type','Request types',Object.keys(typeLabels),typeLabels)}{select('source','Sources',['vendorpanel','austender','nsw'],sourceLabels)}
 <label>Closing window<select value={filters.get('window')??''} onChange={e=>change('window',e.target.value)}><option value="">Any time</option>{[7,14,30].map(n=><option key={n} value={n}>Within {n} days</option>)}</select></label></div>
 <div className="active-filters"><div className="filter-chips" aria-label="Active filters">{chips.map(([key,value])=><button className="filter-chip" key={key} onClick={()=>change(key,key==='category'?'all':'')} aria-label={`Remove ${chipLabel(key,value)} filter`}>{chipLabel(key,value)}<span aria-hidden="true">×</span></button>)}{!chips.length&&<span className="no-filters">All categories · no filters applied</span>}</div><button className="clear-filters" onClick={()=>router.push(pathname+'?category=all',{scroll:false})}>Clear all</button></div>
 </section><section className="results">
 <div className="results-bar"><p aria-live="polite"><strong>{now===null?'—':results.length}</strong> {history?'current & archived records':'opportunities & notices'}</p><div className="results-controls">{detailItems&&<div className="view-toggle" aria-label="Choose results view"><button aria-pressed={view==='list'} onClick={()=>setView('list')}>List</button><button aria-pressed={view==='split'} onClick={()=>setView('split')}>Split</button></div>}<label>Sort by <select value={params.get('sort')??'newest'} onChange={e=>change('sort',e.target.value==='newest'?'':e.target.value)}><option value="newest">Newest published</option><option value="closing">Closing soonest</option></select></label></div></div>
 {now===null?<p className="empty">Checking closing dates…</p>:results.length===0?<div className="empty"><h2>No matching tenders</h2><p>Try another keyword or reset your filters.</p></div>:view==='split'&&detailItems?<div className="split-results"><div className="split-list">{results.slice(0,limit).map(card)}{results.length>limit&&<button className="load-more" onClick={()=>setLimit(limit+30)}>Show more ({results.length-limit} remaining)</button>}</div><aside ref={detailPanel} className="split-detail" aria-live="polite">{selectedTender&&<TenderPreview tender={selectedTender}/>}</aside></div>:<>{results.slice(0,limit).map(card)}{results.length>limit&&<button className="load-more" onClick={()=>setLimit(limit+30)}>Show more ({results.length-limit} remaining)</button>}</>}
 </section></div>;
}
function sourceUrl(t:ListingType){return (t as ListingType&{sourceUrl:string}).sourceUrl;}
