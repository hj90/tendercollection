import Link from 'next/link';
import type {Tender} from '../lib/types';
import {buyerPath,sourceLabels,tenderPath,typeLabels} from '../lib/urls';
import LocalDate from './LocalDate';

export default function TenderPreview({tender:t}:{tender:Tender}){
 const details=t.vendorPanelDetails;
 return <article className="panel-tender">
  <div className="panel-heading"><div className="badges"><span className="type-badge">{typeLabels[t.requestType]}</span><span>{sourceLabels[t.source]}</span><span>{t.reference??'No reference supplied'}</span></div><h2>{t.title}</h2><Link className="detail-buyer" href={buyerPath(t.buyer)}>{t.buyer} →</Link><div className="panel-actions"><a className="primary-link" href={t.sourceUrl} target="_blank" rel="noopener noreferrer">View original notice ↗</a><Link className="secondary-link" href={tenderPath(t)} target="_blank" rel="noopener noreferrer">Open full page ↗</Link></div></div>
  {t.requestType==='forward-notice'&&<p className="alert forward">Forward notice: this announces future procurement and is not open for submissions.</p>}
  <dl className="panel-facts"><div><dt>Contact</dt><dd>{t.contact?<>{t.contact.name&&<p>{t.contact.name}</p>}{t.contact.email&&<p>{t.contact.email}</p>}{t.contact.phone&&<p>{t.contact.phone}</p>}{!t.contact.name&&!t.contact.email&&!t.contact.phone&&t.contact.raw&&<p>{t.contact.raw}</p>}</>:'Not disclosed'}</dd></div><div><dt>{t.requestType==='forward-notice'?'Notice date':'Closing date'}</dt><dd><LocalDate iso={t.closingAt}/></dd></div>{details?.buyerReference&&<div><dt>Buyer reference</dt><dd>{details.buyerReference}</dd></div>}<div><dt>State</dt><dd>{t.state??'Not specified'}</dd></div></dl>
  <section className="panel-section"><h3>About this opportunity</h3><p className="description">{t.description||'No description supplied.'}</p></section>
  {details?.background&&<section className="panel-section"><h3>Background</h3><p className="description">{details.background}</p></section>}
  {details?.desiredOutcomes&&<section className="panel-section"><h3>Desired outcomes and requirements</h3><p className="description">{details.desiredOutcomes}</p></section>}
  {!!details?.buyerQuestions.length&&<section className="panel-section"><h3>Questions from the buyer</h3><ol>{details.buyerQuestions.map((question,i)=><li key={i}>{question}</li>)}</ol></section>}
  {!!details?.publicQuestions.length&&<section className="panel-section"><h3>Public questions and answers</h3><div className="qa-list">{details.publicQuestions.map((item,i)=><article key={i}><div className="qa-meta">Question {item.askedAt&&<LocalDate iso={item.askedAt}/>}</div><p>{item.question}</p>{item.answer&&<div className="qa-answer"><div className="qa-meta">Buyer answer {item.answeredAt&&<LocalDate iso={item.answeredAt}/>}</div><p>{item.answer}</p></div>}</article>)}</div></section>}
  {!!details?.updates.length&&<section className="panel-section"><h3>Updates from the buyer</h3><ol className="update-list">{[...details.updates].reverse().map((item,i)=><li key={i}>{item.at&&<LocalDate iso={item.at}/>}<p>{item.description}</p></li>)}</ol></section>}
  <section className="panel-section"><h3>Categories</h3><div className="categories">{t.categories.map(c=><span key={c}>{c}</span>)}</div></section>
 </article>;
}
