"use client";
import {useState,useEffect} from 'react';
export default function RecordStatus({closingAt,archivedAt}:{closingAt:string|null;archivedAt:string|null}){
 const [closed,setClosed]=useState(false);useEffect(()=>{const update=()=>setClosed(Boolean(closingAt&&Date.parse(closingAt)<=Date.now()));update();const timer=setInterval(update,30000);return()=>clearInterval(timer)},[closingAt]);
 if(archivedAt)return <p className="alert">Archived record: this notice disappeared from a successful source snapshot. Check the source for its current status.</p>;
 if(closed)return <p className="alert">The listed closing date has passed. Check the source for any extension or outcome.</p>;
 return null;
}
