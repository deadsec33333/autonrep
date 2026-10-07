import type {DataClient} from './types';
// Deliberately fail closed until the backend's public views and Realtime contract are connected.
// Feed components import only DataClient; replacing this adapter requires no visual changes.
export const live:DataClient={async getFeed(){throw new Error('The live data connection has not been configured.')},subscribe(){return()=>{}}};
