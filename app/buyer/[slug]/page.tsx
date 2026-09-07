import {Suspense} from 'react';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {allTenders} from '../../../lib/data';
import {buyerSlug} from '../../../lib/urls';
import {compact,createIndex} from '../../../lib/search';
import Listing from '../../../components/Listing';
export const dynamicParams=false;
const buyers=[...new Set(allTenders.map(t=>t.buyer))];
export function generateStaticParams(){return buyers.map(b=>({slug:buyerSlug(b)}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return {title:buyers.find(b=>buyerSlug(b)===slug)}}
export default async function Buyer({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const buyer=buyers.find(b=>buyerSlug(b)===slug);if(!buyer)notFound();const items=allTenders.filter(t=>t.buyer===buyer);return <><Link className="back" href="/">← All tenders</Link><div className="intro"><div><p className="eyebrow">BUYER PROFILE</p><h1>{buyer}</h1><p>Current opportunities and archived notices from this buyer.</p></div></div><Suspense fallback={<p>Loading filters…</p>}><Listing items={items.map(compact)} index={createIndex(items)} history/></Suspense></>}
