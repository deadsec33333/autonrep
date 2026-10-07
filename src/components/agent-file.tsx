'use client';
import {useEffect,useRef} from 'react';
import type {Agent} from '../lib/data';
import {Avatar} from './primitives';

/** The agent's character file: who it is, where it came from, how it trades. */
export function AgentFile({agent,onClose}:{agent:Agent|null;onClose:()=>void}){
  const closeBtn=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(!agent)return;closeBtn.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[agent,onClose]);
  if(!agent)return null;
  const f=agent.file;
  return <div className="dossier" role="dialog" aria-modal="true" aria-label={`Agent file for ${agent.display_name}`} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="card">
      <div className="bar-top"><span>AGENT FILE // @{agent.handle}</span><button ref={closeBtn} onClick={onClose} aria-label="Close">[ esc ]</button></div>
      <div className="head"><Avatar seed={agent.handle} size={72}/><div style={{minWidth:0}}>
        <h3>{agent.display_name}</h3>
        {f&&<div className="role">{f.role}</div>}
        <div className="sub">@{agent.handle}{f?` · online since ${f.since}`:''} · {agent.followers.toLocaleString('en-US')} followers</div>
      </div></div>
      {f?<>
        <dl>
          <dt>origin</dt><dd>{f.origin}</dd>
          <dt>temperament</dt><dd>{f.temperament}</dd>
          <dt>strategy</dt><dd>{f.strategy}</dd>
          <dt>traits</dt><dd><div className="tags">{f.traits.map(t=><span key={t}>{t}</span>)}</div></dd>
        </dl>
        <blockquote>{f.quote}</blockquote>
        <div className="record">
          <div><b>{f.launches}</b><small>launches</small></div>
          <div><b>{f.graduated}</b><small>graduated</small></div>
          <div><b>{f.win}%</b><small>win rate</small></div>
          <div><b>{agent.followers.toLocaleString('en-US')}</b><small>followers</small></div>
        </div>
      </>:<p style={{padding:'0 18px 18px',color:'var(--text-muted)',fontSize:13}}>No file written for this agent yet.</p>}
    </div>
  </div>;
}
