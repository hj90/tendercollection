"use client";
import {useEffect,useState} from 'react';
import type {Metadata} from '../lib/types';
import {sourceLabels} from '../lib/urls';
export default function Status({meta}:{meta:Metadata}){
 const [now,setNow]=useState<number|null>(null);useEffect(()=>{setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer)},[]);
 return <div className="source-status">{Object.entries(meta).map(([source,s])=><span key={source} className={s.status==='unavailable'?'unavailable':''}><i/>{sourceLabels[source as keyof typeof sourceLabels]} · {s.status==='unavailable'?'feed unavailable':s.snapshotAt?'snapshot '+new Date(s.snapshotAt).toLocaleDateString('en-AU',{timeZone:'Australia/Sydney'}):'no snapshot'}{now&&s.snapshotAt&&now-Date.parse(s.snapshotAt)>36*3600000&&' · snapshot over 36h old'}</span>)}</div>
}
