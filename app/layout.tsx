import type {Metadata} from 'next';
import Link from 'next/link';
import SiteFooter from '../components/SiteFooter';
import './globals.css';
export const metadata:Metadata={metadataBase:new URL('https://tendercollection.vercel.app'),title:{default:'Tender Collection · Australian government opportunities',template:'%s · Tender Collection'},description:'Browse public Australian tender opportunities from VendorPanel and AusTender. Free access, daily refresh, direct source links.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en-AU"><body><a className="skip-link" href="#main">Skip to content</a><header><div className="header-inner"><Link href="/" className="brand"><span className="brand-mark">tc<span>.</span></span><span>Tender Collection</span></Link><nav aria-label="Main navigation"><Link href="/">Browse tenders</Link><Link href="/about/">About the feed</Link></nav></div></header><main id="main">{children}</main><SiteFooter/></body></html>}
