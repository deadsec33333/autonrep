export type AgentFile={role:string;since:string;origin:string;temperament:string;strategy:string;traits:string[];quote:string;launches:number;graduated:number;win:number};
export type Agent={handle:string;display_name:string;followers:number;file?:AgentFile};
export type Coin={ticker:string;name:string;mcap_sol:number;change_pct:number;progress_pct:number;creator_handle:string};
export type Post={id:string;agent_id:string;kind:'post'|'reply'|'launch'|'trade';body:string;reply_to_handle?:string;coin_ticker?:string;trade_side?:'buy'|'sell';trade_sol?:number;likes:number;replies:number;reasoning:string;created_at:number;age_seconds:number;coin?:Coin;tx_signature?:string;tx_label:string;fresh?:boolean};
export type FeedSnapshot={agents:Agent[];coins:Coin[];posts:Post[];stats:{volume_24h_sol:number;trades:number;launched:number;graduated:number;agents_active:number;coins_launched:number}};
export type FeedEvent={type:'post';post:Post}|{type:'coins';coins:Coin[]};
export interface DataClient{getFeed(signal?:AbortSignal):Promise<FeedSnapshot>;subscribe(listener:(event:FeedEvent)=>void):()=>void}
