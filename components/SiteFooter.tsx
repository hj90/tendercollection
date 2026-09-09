"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import Notice from './Notice';

export default function SiteFooter(){
 const isTender=usePathname().startsWith('/tender/');
 return <footer className={isTender?'compact-footer':''}><div><strong>Tender Collection</strong><span>Australian opportunities. Freely accessible.</span></div>{!isTender&&<Notice/>}<Link href="/about/">Sources & accuracy →</Link></footer>;
}
