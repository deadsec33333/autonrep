'use client';
import {createLucideIcon, type IconNode} from 'lucide-react';
// Approved reference paths, rendered with lucide-react. No substituted glyphs.
const nodes = {
  "feed": [
    [
      "path",
      {
        "key": "0",
        "d": "M4 6h16M4 12h16M4 18h10"
      }
    ]
  ],
  "term": [
    [
      "rect",
      {
        "key": "0",
        "x": "3",
        "y": "4",
        "width": "18",
        "height": "16",
        "rx": "2"
      }
    ],
    [
      "path",
      {
        "key": "1",
        "d": "m7 9 3 3-3 3M13 15h4"
      }
    ]
  ],
  "coins": [
    [
      "circle",
      {
        "key": "0",
        "cx": "9",
        "cy": "9",
        "r": "6"
      }
    ],
    [
      "path",
      {
        "key": "1",
        "d": "M15.5 9.2a6 6 0 1 1-6.3 6.3"
      }
    ]
  ],
  "agents": [
    [
      "rect",
      {
        "key": "0",
        "x": "5",
        "y": "7",
        "width": "14",
        "height": "12",
        "rx": "3"
      }
    ],
    [
      "path",
      {
        "key": "1",
        "d": "M12 3v4M9 12h.01M15 12h.01M9 16h6"
      }
    ]
  ],
  "activity": [
    [
      "path",
      {
        "key": "0",
        "d": "M3 12h4l3-8 4 16 3-8h4"
      }
    ]
  ],
  "bell": [
    [
      "path",
      {
        "key": "0",
        "d": "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"
      }
    ]
  ],
  "me": [
    [
      "circle",
      {
        "key": "0",
        "cx": "12",
        "cy": "8",
        "r": "4"
      }
    ],
    [
      "path",
      {
        "key": "1",
        "d": "M4 21a8 8 0 0 1 16 0"
      }
    ]
  ],
  "docs": [
    [
      "path",
      {
        "key": "0",
        "d": "M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2zM8 7h6"
      }
    ]
  ],
  "plus": [
    [
      "path",
      {
        "key": "0",
        "d": "M12 5v14M5 12h14"
      }
    ]
  ],
  "reply": [
    [
      "path",
      {
        "key": "0",
        "d": "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"
      }
    ]
  ],
  "heart": [
    [
      "path",
      {
        "key": "0",
        "d": "M19.5 12.6 12 20l-7.5-7.4A5 5 0 1 1 12 6a5 5 0 1 1 7.5 6.6z"
      }
    ]
  ],
  "chev": [
    [
      "path",
      {
        "key": "0",
        "d": "m6 9 6 6 6-6"
      }
    ]
  ],
  "brain": [
    ["circle",{"key":"0","cx":"12","cy":"12","r":"3"}],
    ["path",{"key":"1","d":"M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"}]
  ],
  "ext": [
    [
      "path",
      {
        "key": "0",
        "d": "M7 17 17 7M8 7h9v9"
      }
    ]
  ],
  "search": [
    [
      "circle",
      {
        "key": "0",
        "cx": "11",
        "cy": "11",
        "r": "7"
      }
    ],
    [
      "path",
      {
        "key": "1",
        "d": "m20 20-3.5-3.5"
      }
    ]
  ],
  "up": [
    [
      "path",
      {
        "key": "0",
        "d": "M12 19V5M5 12l7-7 7 7"
      }
    ]
  ]
};
const icons = Object.fromEntries(Object.entries(nodes).map(([name,node])=>[name,createLucideIcon(name,node as IconNode)]));
export type IconName = keyof typeof nodes;
export function Icon({name,size=24}:{name:IconName;size?:number}){const Component=icons[name]; return <Component size={size} strokeWidth={['plus','chev','ext','up','brain'].includes(name)?2:1.75} aria-hidden="true"/>;}
export function BrandMark(){return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 17c4 0 5-10 10-10s6 10 10 10" stroke="var(--wire)" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="7" r="3" fill="var(--accent)"/><circle cx="2.5" cy="17" r="1.6" fill="var(--text)"/><circle cx="21.5" cy="17" r="1.6" fill="var(--text)"/></svg>;}
