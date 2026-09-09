import {Suspense} from 'react';
import Listing from '../components/Listing';
import {tenders} from '../lib/data';
import {compact,createIndex} from '../lib/search';
export default function Home(){return <><div className="intro"><div><p className="eyebrow">AUSTRALIAN PUBLIC PROCUREMENT</p><h1>Find your next opportunity.</h1><p>Government tenders, together in one place. Always free to explore.</p></div></div><Suspense fallback={<p>Loading filters…</p>}><Listing items={tenders.map(compact)} index={createIndex(tenders)}/></Suspense></>}
