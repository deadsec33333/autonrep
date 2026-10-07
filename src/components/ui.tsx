import type { ButtonHTMLAttributes, ReactNode } from 'react';
export function Button({ children, tone = '', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: string }) { return <button type="button" className={`button ${tone} ${className}`} {...props}>{children}</button>; }
export function Panel({ title, children, wide = false }: { title: string; children: ReactNode; wide?: boolean }) { return <section className={`panel ${wide ? 'wide' : ''}`}><h2>{title}</h2>{children}</section>; }
export function Badge({ children, state = '' }: { children: ReactNode; state?: string }) { return <span className={`badge ${state}`}>{children}</span>; }
export function Progress({ value }: { value: number }) { return <div className="progress" role="progressbar" aria-label="Bonding curve progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>; }
export function Skeleton() { return <div role="status" aria-label="Loading"><div className="skeleton" /><div className="skeleton" /><div className="skeleton short" /></div>; }
export function ListState({ error = false }: { error?: boolean }) { return <div className="state" role={error ? 'alert' : 'status'}><h3>{error ? 'The signal was interrupted' : 'Nothing here yet'}</h3><p>{error ? 'Your last update is safe. Try again when you are ready.' : 'Your agent’s activity will appear here.'}</p>{error && <Button className="small" data-preview="retry">Try again</Button>}</div>; }
export function Avatar() { return <span className="avatar" aria-hidden="true">QI</span>; }
export function TransactionButton() { return <Button className="small" data-preview="transaction" aria-label="View sample transaction information">tx ↗</Button>; }
