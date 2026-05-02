"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

const LANDING_CSS = `
:root{
  --bg:        #0a0b0e;
  --bg-2:      #101117;
  --ink:       #f6f2ea;
  --ink-dim:   #b8b3a8;
  --ink-mute:  #6f6a60;
  --line:      rgba(246,242,234,0.08);
  --line-2:    rgba(246,242,234,0.14);

  --gold-1: #e9d4a3;
  --gold-2: #c19a5b;
  --gold-3: #8a6434;
  --gold-4: #f9eac8;
  --gold-glow: 234 195 120;

  --glass: rgba(246,242,234,0.04);
  --glass-strong: rgba(246,242,234,0.07);
  --glass-border: rgba(246,242,234,0.10);

  --status-intake: #7a93b8;
  --status-wait:   #c89a5b;
  --status-ready:  #b8a668;
  --status-submit: #8a9e7c;
  --status-proc:   #7ea39a;
  --status-transit:#6e8fb3;
  --status-done:   #6da57f;
}

.rift-landing, .rift-landing *{box-sizing:border-box}
.rift-landing{
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-inter-tight), 'Inter Tight', -apple-system, sans-serif;
  font-feature-settings: "ss01","cv11";
  -webkit-font-smoothing: antialiased;
  overflow-x:hidden;
  line-height:1.5;
  min-height: 100vh;
  position: relative;
}
.rift-landing .mono{font-family: var(--font-jetbrains-mono), 'JetBrains Mono', monospace; font-feature-settings: "ss02";}
.rift-landing .serif{font-family: var(--font-instrument-serif), 'Instrument Serif', serif; font-weight:400;}

.rift-landing a{ color: inherit; }

.rift-landing .page-bg{
  position:fixed; inset:0; z-index:-2; background: var(--bg);
}
.rift-landing .page-bg::before{
  content:""; position:absolute; inset:-20%;
  background:
    radial-gradient(60% 40% at 50% 0%, rgba(var(--gold-glow)/0.12), transparent 60%),
    radial-gradient(40% 30% at 85% 30%, rgba(var(--gold-glow)/0.06), transparent 70%),
    radial-gradient(50% 40% at 15% 70%, rgba(140,160,200,0.05), transparent 70%);
}
.rift-landing .grain{
  position:fixed; inset:0; z-index:-1; pointer-events:none; opacity:.35; mix-blend-mode:overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.90  0 0 0 0 0.82  0 0 0 0.12 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}

.rift-landing .wrap{ max-width:1280px; margin:0 auto; padding:0 32px; }

.rift-landing nav.top{
  position:sticky; top:0; z-index:50;
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  background: linear-gradient(180deg, rgba(10,11,14,0.85), rgba(10,11,14,0.4));
  border-bottom: 1px solid var(--line);
}
.rift-landing .nav-row{ display:flex; align-items:center; justify-content:space-between; padding:18px 0; }
.rift-landing .brand{ display:flex; align-items:center; gap:10px; font-weight:500; letter-spacing:-0.01em; font-size:18px; }
.rift-landing .brand-glyph{
  width:26px; height:26px; border-radius:7px;
  background-color: #0e0b08;
  background-image:
    linear-gradient(135deg, rgba(249,234,200,0.08) 0%, transparent 45%, rgba(138,100,52,0.14) 100%),
    url("data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28' fill='none'><defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%23f9eac8'/><stop offset='0.55' stop-color='%23e9d4a3'/><stop offset='1' stop-color='%23c19a5b'/></linearGradient></defs><path d='M10 4 L14 13 L17 15 L21 24' stroke='%23c19a5b' stroke-opacity='0.32' stroke-width='4.2' stroke-linecap='round' stroke-linejoin='round'/><path d='M10 4 L14 13 L17 15 L21 24' stroke='url(%23s)' stroke-width='2.3' stroke-linecap='round' stroke-linejoin='round'/></svg>");
  background-size: 100% 100%;
  background-repeat: no-repeat;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.08),
    inset 0 0 0 1px rgba(234,195,120,0.22),
    0 0 18px rgba(234,195,120,0.28);
  position:relative;
}
.rift-landing .nav-links{ display:flex; gap:28px; font-size:14px; color:var(--ink-dim); }
.rift-landing .nav-links a{ color:inherit; text-decoration:none; transition:color .2s; }
.rift-landing .nav-links a:hover{ color:var(--ink); }
.rift-landing .btn-ghost{
  font-size:14px; padding:8px 14px; color:var(--ink-dim);
  background:transparent; border:1px solid transparent; border-radius:999px;
  cursor:pointer; font-family:inherit; text-decoration:none;
  display:inline-flex; align-items:center; gap:8px;
}
.rift-landing .btn-ghost:hover{ color:var(--ink); border-color:var(--line-2); }

.rift-landing .btn-chrome{
  display:inline-flex; align-items:center; gap:10px;
  padding:11px 22px; border-radius:999px; border:none;
  color:#2a1d08; font-weight:500; font-size:14px; letter-spacing:-0.005em;
  cursor:pointer; font-family:inherit; text-decoration:none;
  position:relative; isolation:isolate;
  background: linear-gradient(135deg, var(--gold-4) 0%, var(--gold-1) 20%, var(--gold-2) 55%, var(--gold-1) 82%, var(--gold-4) 100%);
  background-size: 220% 220%;
  animation: chromeflow 7s ease-in-out infinite;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.65),
    inset 0 -1px 0 rgba(0,0,0,0.18),
    0 4px 20px -4px rgba(var(--gold-glow)/0.4),
    0 0 0 1px rgba(var(--gold-glow)/0.25);
  transition: transform .2s;
}
.rift-landing .btn-chrome:hover{ transform: translateY(-1px); }
.rift-landing .btn-chrome::before{
  content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
  background: linear-gradient(180deg, rgba(255,255,255,0.35), transparent 45%);
}
@keyframes chromeflow{
  0%,100%{ background-position: 0% 50%; }
  50%    { background-position: 100% 50%; }
}

.rift-landing .hero{ padding: 90px 0 60px; position:relative; min-height: 100vh; display:flex; align-items:center; }
.rift-landing .hero-grid{
  display:grid; grid-template-columns: 1fr 1.15fr; gap: 72px;
  align-items: center; width: 100%;
}
@media (max-width: 960px){ .rift-landing .hero-grid{ grid-template-columns: 1fr; gap: 48px; } }

.rift-landing .mini-demo{
  position: relative;
  border-radius: 14px;
  background: #05060a;
  border:1px solid var(--glass-border);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.05),
    0 40px 80px -30px rgba(0,0,0,0.9),
    0 0 1px rgba(var(--gold-glow)/0.25);
  overflow: hidden;
}
.rift-landing .mini-demo::before{
  content:""; position:absolute; inset:-1px; border-radius:inherit; padding:1px;
  background: linear-gradient(135deg, rgba(var(--gold-glow)/0.3), transparent 40%, transparent 60%, rgba(var(--gold-glow)/0.15));
  -webkit-mask: linear-gradient(#000,#000) content-box, linear-gradient(#000,#000);
  -webkit-mask-composite: xor; mask-composite: exclude;
  pointer-events:none; z-index:2;
}

.rift-landing .mini-chrome{
  display:flex; align-items:center; gap:10px;
  padding: 9px 12px;
  background: #0a0b0f;
  border-bottom: 1px solid var(--line);
}
.rift-landing .mini-chrome .dots{ display:flex; gap:5px; }
.rift-landing .mini-chrome .dots span{ width:9px; height:9px; border-radius:50%; background:#2a2d36;}
.rift-landing .mini-chrome .dots span:nth-child(1){ background:#3a2d2d;}
.rift-landing .mini-chrome .dots span:nth-child(2){ background:#3a352a;}
.rift-landing .mini-chrome .dots span:nth-child(3){ background:#2a3a2d;}
.rift-landing .mini-chrome .url{
  flex:1; padding: 4px 10px; border-radius: 6px;
  background: rgba(255,255,255,0.03); border:1px solid var(--line);
  font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size:10.5px; color:var(--ink-mute);
  display:flex; align-items:center; gap:6px;
  transition: color .3s;
}
.rift-landing .mini-chrome .url .lock{ opacity:0.6; }
.rift-landing .mini-chrome .url .path{ color: var(--ink-dim); }
.rift-landing .mini-chrome .url .crumb{ color: var(--gold-1); }

.rift-landing .mini-stage{
  position: relative;
  height: 440px;
  overflow: hidden;
}
.rift-landing .mini-screen{
  position:absolute; inset:0;
  padding: 16px 18px 18px;
  background: #05060a;
  opacity: 0; pointer-events:none;
  transform: translateX(24px);
  transition: opacity .45s ease, transform .5s cubic-bezier(.2,.6,.2,1);
}
.rift-landing .mini-screen.active{
  opacity:1; pointer-events:auto; transform:translateX(0);
}

.rift-landing .mini-listhead{
  display:flex; justify-content:space-between; align-items:baseline;
  padding-bottom: 12px; border-bottom:1px dashed var(--line);
  margin-bottom: 10px;
}
.rift-landing .mini-listtitle{ font-size:13px; font-weight:500; letter-spacing:-0.01em; }
.rift-landing .mini-listsub{ font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size:10px; color:var(--ink-mute); letter-spacing: 0.04em;}
.rift-landing .mini-listfilters{
  display:flex; gap:6px; margin-bottom: 12px;
  font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size:10px;
}
.rift-landing .mini-listfilters .f{
  padding: 3px 9px; border-radius: 999px;
  border:1px solid var(--line); color: var(--ink-mute);
  background: transparent; letter-spacing:0.04em;
}
.rift-landing .mini-listfilters .f.on{
  border-color: rgba(var(--gold-glow)/0.5);
  color: var(--gold-1);
  background: rgba(var(--gold-glow)/0.08);
}

.rift-landing .mini-caselist{ display:flex; flex-direction:column; gap:6px; }
.rift-landing .mini-caserow{
  display:grid; grid-template-columns: 1fr auto;
  gap: 10px; align-items:center;
  padding: 10px 12px; border-radius: 8px;
  border:1px solid transparent;
  background: rgba(255,255,255,0.015);
  cursor: pointer;
  transition: all .3s;
}
.rift-landing .mini-caserow:hover, .rift-landing .mini-caserow.hover{
  background: rgba(255,255,255,0.035);
  border-color: var(--line);
}
.rift-landing .mini-caserow.focused{
  border-color: rgba(var(--gold-glow)/0.45);
  background: rgba(var(--gold-glow)/0.05);
  box-shadow: 0 0 0 1px rgba(var(--gold-glow)/0.2), 0 0 18px -4px rgba(var(--gold-glow)/0.4);
}
.rift-landing .mini-caserow .cname{ font-size: 12.5px; font-weight: 500; letter-spacing:-0.01em; }
.rift-landing .mini-caserow .cmeta{ font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size:9.5px; color: var(--ink-mute); margin-top:2px; letter-spacing: 0.03em;}
.rift-landing .mini-caserow .camt{ text-align:right; font-family: var(--font-jetbrains-mono), 'JetBrains Mono', monospace; font-size: 11px; color: var(--ink-dim); }
.rift-landing .mini-caserow .cstatus{ font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size:9px; letter-spacing:0.06em; margin-top: 2px; color: var(--ink-mute); text-transform:uppercase; }

.rift-landing .mini-detail-back{
  display:inline-flex; align-items:center; gap:4px;
  font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size:10px; color: var(--ink-mute);
  margin-bottom: 10px; letter-spacing: 0.04em; cursor:pointer;
  padding: 2px 6px 2px 2px; border-radius: 4px;
}
.rift-landing .mini-detail-back:hover, .rift-landing .mini-detail-back.hover{ color: var(--ink-dim); background: rgba(255,255,255,0.03); }
.rift-landing .mini-card{
  position: relative;
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
}
.rift-landing .mini-head{
  display:flex; justify-content:space-between; align-items:center;
  padding-bottom: 12px; border-bottom:1px dashed var(--line);
  position: relative;
}
.rift-landing .mini-client{ font-size:14px; font-weight:500; letter-spacing:-0.01em; }
.rift-landing .mini-client .sub{ display:block; font-size:10px; color:var(--ink-mute); font-weight:400; margin-top:2px; font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; letter-spacing:0.03em;}
.rift-landing .mini-route{
  margin-top:12px; font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size:10.5px;
  color:var(--ink-dim); display:flex; align-items:center; gap:8px; flex-wrap:wrap;
}
.rift-landing .mini-route .arr{ color: var(--gold-2); }

.rift-landing .mini-pipe{ margin-top:14px; }
.rift-landing .mini-pipe-bar{ display:flex; gap:3px; height:5px; }
.rift-landing .mini-pipe-bar .s{ flex:1; border-radius:2px; background: rgba(255,255,255,0.05); transition: background .5s ease, box-shadow .5s;}
.rift-landing .mini-pipe-bar .s.on{
  background: linear-gradient(90deg, var(--gold-3), var(--gold-1));
}
.rift-landing .mini-pipe-bar .s.cur{
  box-shadow: 0 0 10px rgba(var(--gold-glow)/0.6);
}
.rift-landing .mini-pipe-label{
  margin-top:9px;
  display:flex; justify-content:space-between;
  font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size:9.5px; color:var(--ink-mute);
  letter-spacing:0.06em; text-transform:uppercase;
}
.rift-landing .mini-pipe-label .cur-status{
  color: var(--gold-1);
  transition: color .3s;
}
.rift-landing .mini-pipe-label .cur-status::before{
  content:""; display:inline-block; width:5px; height:5px; border-radius:50%;
  background: var(--gold-1); margin-right:6px;
  box-shadow: 0 0 6px rgba(var(--gold-glow)/0.7);
  animation: mini-pulse 1.6s ease-in-out infinite;
}
@keyframes mini-pulse{ 0%,100%{opacity:0.6;} 50%{opacity:1;} }

.rift-landing .mini-check{
  margin-top:14px; padding-top:12px; border-top:1px dashed var(--line);
  display:flex; flex-direction:column; gap:7px;
}

.rift-landing .status-pill{
  display:inline-flex; align-items:center; gap:6px;
  padding:3px 9px; border-radius:999px; font-size:10.5px; font-weight:500;
  font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; letter-spacing:0.02em;
  background: rgba(255,255,255,0.04);
  border:1px solid var(--line-2);
  color:var(--ink-dim);
  cursor: pointer; transition: background .2s, border-color .2s;
}
.rift-landing .status-pill:hover, .rift-landing .status-pill.hover{
  background: rgba(255,255,255,0.07);
  border-color: var(--line);
}
.rift-landing .status-pill .sdot{ width:6px; height:6px; border-radius:50%; background: var(--status-intake); }
.rift-landing .status-pill .caret{
  width: 8px; height: 8px; opacity: 0.6;
  transition: transform .2s;
}
.rift-landing .status-pill.open .caret{ transform: rotate(180deg); }

.rift-landing .status-menu{
  position:absolute; top: calc(100% + 6px); right: 0;
  min-width: 180px;
  padding: 4px;
  background: rgba(14,16,22,0.98); backdrop-filter: blur(12px);
  border:1px solid rgba(var(--gold-glow)/0.25);
  border-radius: 8px;
  box-shadow: 0 18px 36px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.4);
  z-index: 10;
  opacity: 0; transform: translateY(-6px) scale(0.96);
  transform-origin: top right;
  pointer-events:none;
  transition: opacity .18s ease, transform .18s cubic-bezier(.2,.8,.2,1);
}
.rift-landing .status-menu.open{
  opacity: 1; transform: translateY(0) scale(1); pointer-events:auto;
}
.rift-landing .status-menu-item{
  display:flex; align-items:center; gap:8px;
  padding: 7px 10px; border-radius: 5px;
  font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:0.03em;
  color: var(--ink-dim); cursor: pointer;
  transition: background .15s;
  position: relative;
}
.rift-landing .status-menu-item:hover, .rift-landing .status-menu-item.hover{
  background: rgba(255,255,255,0.05);
  color: var(--ink);
}
.rift-landing .status-menu-item .mdot{ width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.rift-landing .status-menu-item .mname{ flex:1; }
.rift-landing .status-menu-item .mcheck{
  width: 10px; height: 10px; opacity: 0; transition: opacity .2s;
  color: var(--gold-1);
}
.rift-landing .status-menu-item.current{ color: var(--ink); background: rgba(var(--gold-glow)/0.06); }
.rift-landing .status-menu-item.current .mcheck{ opacity: 1; }

.rift-landing .mini-check-item{
  display:grid;
  grid-template-columns: auto 1fr auto;
  align-items:center; gap:10px;
  padding: 8px 8px;
  border-radius: 7px;
  border: 1px solid transparent;
  font-size:11.5px; color:var(--ink-dim);
  transition: background .25s, border-color .25s;
  cursor: pointer;
}
.rift-landing .mini-check-item .mini-file{
  display:flex; align-items:center; gap:9px;
  min-width: 0;
}
.rift-landing .mini-check-item .mini-file-icon{
  width: 22px; height: 26px; flex-shrink:0;
  border-radius: 3px; background: linear-gradient(180deg, #1c1f27, #13151c);
  border: 1px solid var(--line);
  display:flex; align-items:flex-end; justify-content:center;
  padding-bottom: 3px;
  font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size: 7.5px;
  color: var(--ink-mute); letter-spacing: 0.04em;
  position: relative;
}
.rift-landing .mini-check-item .mini-file-icon::before{
  content:""; position:absolute; top:-1px; right:-1px;
  width: 6px; height: 6px;
  background: #05060a;
  border-left: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.rift-landing .mini-check-item.on .mini-file-icon{
  background: linear-gradient(180deg, #2a2418, #1a1610);
  border-color: rgba(var(--gold-glow)/0.35);
  color: var(--gold-1);
}
.rift-landing .mini-check-item .mini-file-meta{ display:flex; flex-direction:column; gap:1px; min-width: 0;}
.rift-landing .mini-check-item .mini-file-name{
  font-weight: 500; color: var(--ink-dim);
  font-size: 11.5px; letter-spacing: -0.005em;
  white-space: nowrap; overflow:hidden; text-overflow:ellipsis;
  transition: color .3s;
}
.rift-landing .mini-check-item.on .mini-file-name{ color: var(--ink); }
.rift-landing .mini-check-item .mini-file-sub{
  font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size: 9px;
  color: var(--ink-mute); letter-spacing: 0.04em;
}
.rift-landing .mini-check-item.hover{ background: rgba(255,255,255,0.03); border-color: var(--line); }
.rift-landing .mini-check-item.flash-in{
  animation: mini-flash-in .7s ease-out;
}
@keyframes mini-flash-in{
  0%   { background: rgba(var(--gold-glow)/0.15); border-color: rgba(var(--gold-glow)/0.4); }
  100% { background: transparent; border-color: transparent; }
}

.rift-landing .mini-check-box{
  width:16px; height:16px; border-radius:4px;
  border:1.5px solid var(--line-2);
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0; transition: all .4s;
}
.rift-landing .mini-check-box svg{ width:10px; height:10px; stroke:#2a1d08; stroke-width:3; fill:none;
  opacity:0; transition: opacity .3s;}
.rift-landing .mini-check-item.on .mini-check-box{
  background: linear-gradient(135deg, var(--gold-4), var(--gold-2));
  border-color: var(--gold-2);
  box-shadow: 0 0 10px rgba(var(--gold-glow)/0.35);
}
.rift-landing .mini-check-item.on .mini-check-box svg{ opacity:1; }

.rift-landing .mini-file-state{
  display:inline-flex; align-items:center; gap:4px;
  font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size:9px; letter-spacing: 0.06em;
  padding: 2px 7px; border-radius: 999px;
  color: var(--ink-mute);
  border:1px solid var(--line-2);
  background: transparent;
  transition: all .3s;
  white-space:nowrap;
}
.rift-landing .mini-file-state.received{
  color: var(--status-ready); border-color: rgba(78,164,130,0.4); background: rgba(78,164,130,0.08);
}
.rift-landing .mini-file-state.approved{
  color: var(--gold-1); border-color: rgba(var(--gold-glow)/0.45); background: rgba(var(--gold-glow)/0.1);
}
.rift-landing .mini-file-state::before{
  content:""; width:4px; height:4px; border-radius:50%; background: currentColor; opacity:.9;
}

.rift-landing .mini-notif{
  position: absolute; top: 12px; left: 12px; right: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(16,18,24,0.98); backdrop-filter: blur(12px);
  border: 1px solid rgba(var(--gold-glow)/0.4);
  box-shadow: 0 18px 36px -10px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.3);
  display:flex; align-items:center; gap: 10px;
  opacity: 0; transform: translateY(-14px);
  transition: all .4s cubic-bezier(.2,.8,.2,1);
  z-index: 12;
  pointer-events: none;
}
.rift-landing .mini-notif.show{ opacity: 1; transform: translateY(0); }
.rift-landing .mini-notif-avatar{
  width: 26px; height: 26px; border-radius: 50%;
  background: linear-gradient(135deg, #3a3527, #1c1a14);
  border: 1px solid rgba(var(--gold-glow)/0.4);
  display:flex; align-items:center; justify-content:center;
  font-size: 10px; font-weight: 600; color: var(--gold-1);
  letter-spacing: -0.02em;
  flex-shrink:0;
}
.rift-landing .mini-notif-body{ flex:1; min-width:0; line-height:1.35;}
.rift-landing .mini-notif-title{
  font-size: 11.5px; color: var(--ink); font-weight: 500;
  letter-spacing: -0.005em;
  white-space: nowrap; overflow:hidden; text-overflow:ellipsis;
}
.rift-landing .mini-notif-title b{ font-weight: 600; color: var(--gold-1); }
.rift-landing .mini-notif-sub{
  font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size: 9.5px;
  color: var(--ink-mute); letter-spacing: 0.04em;
  margin-top: 2px;
}
.rift-landing .mini-notif-dot{
  width: 7px; height: 7px; border-radius: 50%; background: var(--gold-1);
  box-shadow: 0 0 8px var(--gold-1);
  flex-shrink: 0;
  animation: mini-pulse 1.8s ease-in-out infinite;
}

.rift-landing .mini-doc-preview{
  position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -45%) scale(0.92);
  width: 260px; padding: 14px;
  background: #0c0e14;
  border: 1px solid rgba(var(--gold-glow)/0.35);
  border-radius: 10px;
  box-shadow: 0 40px 70px -20px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,0,0,0.5);
  opacity: 0; pointer-events: none;
  transition: opacity .25s, transform .3s cubic-bezier(.2,.8,.2,1);
  z-index: 14;
}
.rift-landing .mini-doc-preview.show{
  opacity: 1; transform: translate(-50%, -50%) scale(1);
}
.rift-landing .mini-doc-header{
  display:flex; justify-content:space-between; align-items:center;
  padding-bottom: 10px; border-bottom: 1px dashed var(--line);
  margin-bottom: 10px;
}
.rift-landing .mini-doc-title{
  font-size: 11.5px; font-weight: 500; color: var(--ink);
}
.rift-landing .mini-doc-close{
  font-family: var(--font-jetbrains-mono), 'JetBrains Mono', monospace; font-size: 10px;
  color: var(--ink-mute);
}
.rift-landing .mini-doc-page{
  height: 110px;
  background: linear-gradient(180deg, #f6f2ea, #ece6d6);
  border-radius: 4px;
  padding: 10px 12px;
  position: relative; overflow: hidden;
}
.rift-landing .mini-doc-page::before, .rift-landing .mini-doc-page::after{
  content:"";
  position: absolute; left: 10px; right: 10px; height: 4px; border-radius: 2px;
  background: rgba(30,24,14,0.25);
}
.rift-landing .mini-doc-page::before{ top: 14px; right: 40%; }
.rift-landing .mini-doc-page::after{ top: 26px; }
.rift-landing .mini-doc-lines{
  position:absolute; left: 10px; right: 10px; top: 42px; bottom: 28px;
  background:
    repeating-linear-gradient(
      to bottom,
      rgba(30,24,14,0.18) 0 3px,
      transparent 3px 11px
    );
  border-radius: 2px;
}
.rift-landing .mini-doc-sig{
  position:absolute; left: 10px; bottom: 8px; right: 10px; height: 14px;
  border-top: 1px solid rgba(30,24,14,0.35);
  font-family: 'Georgia', serif; font-style: italic; font-size: 11px;
  color: #3a2d10; padding-top: 1px;
}
.rift-landing .mini-doc-meta{
  margin-top: 10px;
  display:flex; justify-content:space-between;
  font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size:9px;
  color: var(--ink-mute); letter-spacing: 0.05em;
}
.rift-landing .mini-doc-approve{
  margin-top: 10px;
  width: 100%; padding: 7px 10px; border-radius: 6px;
  background: linear-gradient(180deg, var(--gold-2), var(--gold-4));
  color: #1a1206; border: 1px solid var(--gold-2);
  font-size: 11px; font-weight: 500;
  letter-spacing: -0.005em; cursor: pointer;
  box-shadow: 0 8px 18px -6px rgba(var(--gold-glow)/0.4), inset 0 1px 0 rgba(255,255,255,0.2);
  display:flex; align-items:center; justify-content:center; gap:6px;
  transition: transform .15s;
}
.rift-landing .mini-doc-approve.hover{ transform: scale(1.02); }

.rift-landing .mini-toast{
  position:absolute; left:50%; bottom:16px;
  transform: translate(-50%, 14px);
  padding: 7px 13px; border-radius: 8px;
  font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size:10.5px;
  color: var(--ink-dim); letter-spacing: 0.04em;
  background: rgba(16,18,24,0.96); backdrop-filter: blur(10px);
  border: 1px solid rgba(var(--gold-glow)/0.35);
  box-shadow: 0 14px 28px -10px rgba(0,0,0,0.7);
  display:flex; align-items:center; gap:8px;
  opacity:0; transition: all .4s;
  white-space:nowrap; z-index: 15;
}
.rift-landing .mini-toast.show{ opacity:1; transform: translate(-50%, 0); }
.rift-landing .mini-toast .d{ width:5px; height:5px; border-radius:50%; background: var(--status-done); box-shadow: 0 0 6px var(--status-done); }

.rift-landing .mini-cursor{
  position:absolute; width:20px; height:20px; z-index:20; pointer-events:none;
  top:0; left:0;
  transform: translate(28px, 38px);
  transition: transform 1.1s cubic-bezier(0.45, 0.05, 0.15, 1);
  will-change: transform;
  filter: drop-shadow(0 3px 8px rgba(0,0,0,0.8));
}
.rift-landing .mini-cursor svg{ width:100%; height:100%; display:block; }
.rift-landing .mini-cursor::before{
  content:""; position:absolute; left:2.5px; top:1.7px;
  width:0; height:0; border-radius:50%;
  border:1.5px solid rgba(var(--gold-glow)/0.9);
  transform: translate(-50%, -50%) scale(1);
  opacity:0;
  pointer-events:none;
}
.rift-landing .mini-cursor.clicking::before{ animation: mini-click-ring .5s ease-out; }
@keyframes mini-click-ring{
  0%   { width: 4px;  height: 4px;  opacity:1; }
  100% { width: 34px; height: 34px; opacity:0; }
}
.rift-landing .mini-cursor.clicking svg{ animation: mini-tap .25s ease-out; }
@keyframes mini-tap{
  0%   { transform: scale(1); }
  40%  { transform: scale(0.82); }
  100% { transform: scale(1); }
}

.rift-landing .mini-target{ position: relative; }
.rift-landing .mini-target::after{
  content:""; position:absolute; inset:-4px; border-radius:8px;
  border:1.5px solid rgba(var(--gold-glow)/0.7);
  background: rgba(var(--gold-glow)/0.06);
  box-shadow: 0 0 14px -2px rgba(var(--gold-glow)/0.5);
  pointer-events:none;
  animation: mini-target-pulse .7s ease-out;
}
@keyframes mini-target-pulse{
  0%   { opacity: 0; transform: scale(1.15); }
  60%  { opacity: 1; transform: scale(1); }
  100% { opacity: 1; transform: scale(1); }
}
.rift-landing .mini-target.mini-clicked::after{
  animation: mini-target-click .5s ease-out forwards;
}
@keyframes mini-target-click{
  0%   { opacity: 1; transform: scale(1); background: rgba(var(--gold-glow)/0.2); }
  100% { opacity: 0; transform: scale(1.08); }
}

.rift-landing .eyebrow{
  display:inline-flex; align-items:center; gap:10px;
  padding:6px 12px 6px 8px; border-radius:999px;
  background: var(--glass); border:1px solid var(--glass-border);
  font-size:12px; color:var(--ink-dim); letter-spacing:0.02em;
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
.rift-landing .eyebrow .pill{
  padding:2px 8px; border-radius:999px; font-size:11px; font-weight:500;
  color:#2a1d08;
  background: linear-gradient(135deg, var(--gold-4), var(--gold-2));
}
.rift-landing h1.hero-title{
  margin:22px 0 0; font-size: clamp(40px, 5.2vw, 72px);
  font-weight:400; letter-spacing:-0.035em; line-height:0.98;
  color: var(--ink);
}
.rift-landing h1.hero-title .chromed{
  background: linear-gradient(95deg, var(--gold-4) 0%, var(--gold-1) 30%, var(--gold-2) 55%, var(--gold-1) 75%, var(--gold-4) 100%);
  background-size: 220% 220%;
  background-clip: text; -webkit-background-clip: text;
  -webkit-text-fill-color: transparent; color:transparent;
  animation: chromeflow 8s ease-in-out infinite;
  font-family: var(--font-instrument-serif), 'Instrument Serif', serif; font-style:italic; font-weight:400;
}
.rift-landing .hero-sub{
  margin-top:22px; font-size:18px; color:var(--ink-dim); max-width: 580px;
  line-height:1.55;
}
.rift-landing .hero-cta{ display:flex; align-items:center; gap:14px; margin-top:32px; flex-wrap: wrap; }
.rift-landing .hero-meta{
  margin-top:28px; display:flex; gap:28px; font-size:13px; color:var(--ink-mute); flex-wrap: wrap;
}
.rift-landing .hero-meta .dot{ display:inline-block; width:5px; height:5px; border-radius:50%;
  background: var(--gold-2); margin-right:8px; vertical-align:middle;
  box-shadow: 0 0 8px rgba(var(--gold-glow)/0.6); }

.rift-landing section{ padding: 110px 0; position:relative; }
.rift-landing .sec-label{
  font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size:11px; color: var(--gold-2);
  letter-spacing:0.18em; text-transform:uppercase;
  display:flex; align-items:center; gap:12px;
}
.rift-landing .sec-label::before{
  content:""; width:28px; height:1px; background: var(--gold-2);
}
.rift-landing .sec-title{
  margin:16px 0 0; font-size: clamp(32px, 4.4vw, 56px);
  font-weight:400; letter-spacing:-0.028em; line-height:1.02;
  max-width: 720px;
}
.rift-landing .sec-title em{ font-family: var(--font-instrument-serif), 'Instrument Serif', serif; font-style:italic; color: var(--gold-1);}
.rift-landing .sec-sub{ margin-top:18px; color: var(--ink-dim); font-size:17px; max-width:560px; line-height:1.55;}

.rift-landing .feat-grid{
  margin-top: 56px;
  display:grid; grid-template-columns: repeat(3, 1fr); gap:18px;
}
.rift-landing .glass-card{
  position:relative;
  padding: 26px 24px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(246,242,234,0.045), rgba(246,242,234,0.015));
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  overflow:hidden;
  transition: transform .4s, border-color .4s;
}
.rift-landing .glass-card::before{
  content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
  background: linear-gradient(180deg, rgba(255,255,255,0.08), transparent 40%);
}
.rift-landing .glass-card::after{
  content:""; position:absolute; top:-1px; left:10%; right:10%; height:1px;
  background: linear-gradient(90deg, transparent, rgba(var(--gold-glow)/0.4), transparent);
  opacity: 0; transition: opacity .4s;
}
.rift-landing .glass-card:hover{ transform: translateY(-3px); border-color: rgba(var(--gold-glow)/0.2); }
.rift-landing .glass-card:hover::after{ opacity:1; }
.rift-landing .feat-num{
  font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size:11px; color: var(--gold-2);
  letter-spacing:0.1em;
}
.rift-landing .feat-h{ margin-top:14px; font-size:20px; font-weight:500; letter-spacing:-0.015em;}
.rift-landing .feat-b{ margin-top:8px; color: var(--ink-dim); font-size:14px; line-height:1.55;}
.rift-landing .feat-visual{
  margin-top:22px; height:92px; border-radius:10px;
  background: rgba(0,0,0,0.2); border:1px solid var(--line);
  display:flex; align-items:center; justify-content:center;
  position:relative; overflow:hidden;
}

.rift-landing .pipeline-viz{
  margin-top: 56px; padding: 32px; border-radius: 18px;
  background: linear-gradient(180deg, rgba(246,242,234,0.04), rgba(246,242,234,0.01));
  border:1px solid var(--glass-border);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
}
.rift-landing .pipe-stages{
  display:grid; grid-template-columns: repeat(7, 1fr); gap:6px;
  position:relative;
}
.rift-landing .pipe-stage{
  padding:16px 12px; border-radius:10px;
  background: rgba(255,255,255,0.02);
  border:1px solid var(--line);
  text-align:center;
  position:relative;
  transition: all .3s;
}
.rift-landing .pipe-stage.active{
  background: rgba(var(--gold-glow)/0.08);
  border-color: rgba(var(--gold-glow)/0.35);
  box-shadow: 0 0 20px -5px rgba(var(--gold-glow)/0.3);
}
.rift-landing .pipe-stage .n{ font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size:10px; color: var(--ink-mute);}
.rift-landing .pipe-stage.active .n{ color: var(--gold-1); }
.rift-landing .pipe-stage .nm{ font-size:12px; margin-top:6px; color: var(--ink); font-weight:500; }
.rift-landing .pipe-stage .ct{ font-family: var(--font-jetbrains-mono), 'JetBrains Mono',monospace; font-size:10px; color: var(--ink-mute); margin-top:4px;}

.rift-landing .stats-row{
  margin-top: 56px; display:grid; grid-template-columns: repeat(4, 1fr); gap:0;
  border-top:1px solid var(--line); border-bottom:1px solid var(--line);
}
.rift-landing .stat{
  padding: 32px 24px; border-right:1px solid var(--line);
}
.rift-landing .stat:last-child{ border-right:none; }
.rift-landing .stat .val{
  font-family: var(--font-instrument-serif), 'Instrument Serif', serif;
  font-size: 56px; letter-spacing:-0.025em; line-height:1;
  background: linear-gradient(95deg, var(--gold-4), var(--gold-1) 40%, var(--gold-2) 70%, var(--gold-4));
  background-size: 220% 220%;
  background-clip: text; -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: chromeflow 9s ease-in-out infinite;
}
.rift-landing .stat .lbl{ margin-top:10px; font-size:13px; color: var(--ink-dim); letter-spacing:0.01em;}

.rift-landing .quote-card{
  margin-top: 56px; padding: 48px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(246,242,234,0.055), rgba(246,242,234,0.01));
  border:1px solid var(--glass-border);
  backdrop-filter: blur(20px) saturate(150%);
  position:relative; overflow:hidden;
}
.rift-landing .quote-card::before{
  content:"\\201C";
  position:absolute; top:-40px; right:20px;
  font-family: var(--font-instrument-serif), 'Instrument Serif', serif; font-size:260px;
  color: rgba(var(--gold-glow)/0.1); line-height:1;
}
.rift-landing .quote-text{
  font-family: var(--font-instrument-serif), 'Instrument Serif', serif;
  font-size: 30px; letter-spacing:-0.015em; line-height:1.3;
  color: var(--ink); max-width: 760px; font-weight:400; position:relative;
}
.rift-landing .quote-meta{ margin-top:24px; display:flex; align-items:center; gap:14px; flex-wrap: wrap; }
.rift-landing .quote-av{
  width:42px; height:42px; border-radius:50%;
  background: linear-gradient(135deg, #3a3f4a, #1e2128);
  display:flex; align-items:center; justify-content:center;
  font-weight:600; color: var(--ink-dim); font-size:14px;
  border:1px solid var(--line-2);
}
.rift-landing .quote-name{ font-size:14px; color: var(--ink); font-weight:500;}
.rift-landing .quote-role{ font-size:12px; color: var(--ink-mute); }

.rift-landing .cta-block{
  padding: 80px 56px; border-radius: 28px; position:relative; overflow:hidden;
  background:
    radial-gradient(60% 70% at 50% 0%, rgba(var(--gold-glow)/0.18), transparent 70%),
    linear-gradient(180deg, rgba(246,242,234,0.04), rgba(246,242,234,0.01));
  border:1px solid var(--glass-border);
  backdrop-filter: blur(20px);
  text-align:center;
}
.rift-landing .cta-block h2{
  font-size: clamp(36px, 5vw, 64px); font-weight:400;
  letter-spacing:-0.03em; margin:0; line-height:1;
}
.rift-landing .cta-block h2 em{ font-family: var(--font-instrument-serif), 'Instrument Serif', serif; font-style:italic; color: var(--gold-1); }
.rift-landing .cta-block p{ margin: 18px auto 0; max-width: 460px; color: var(--ink-dim); font-size:16px; }
.rift-landing .cta-block .btn-chrome{ margin-top:32px; }

.rift-landing footer{
  padding: 40px 0 60px; border-top:1px solid var(--line); margin-top:110px;
  color: var(--ink-mute); font-size:13px;
}
.rift-landing .foot-row{ display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px;}
.rift-landing .foot-links{ display:flex; gap:24px; flex-wrap: wrap;}
.rift-landing .foot-links a{ color: var(--ink-mute); text-decoration:none; transition: color .2s;}
.rift-landing .foot-links a:hover{ color: var(--ink); }

@media (max-width: 860px){
  .rift-landing .feat-grid{ grid-template-columns: 1fr; }
  .rift-landing .stats-row{ grid-template-columns: 1fr 1fr; }
  .rift-landing .stat{ border-right:none; border-bottom:1px solid var(--line); }
  .rift-landing .pipe-stages{ grid-template-columns: repeat(3, 1fr); }
  .rift-landing .nav-links{ display:none; }
}
`;

export default function LandingPage() {
  const miniDemoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = miniDemoRef.current;
    if (!root) return;

    const stage = root.querySelector<HTMLDivElement>(".mini-stage");
    const cursor = root.querySelector<HTMLDivElement>(".mini-cursor");
    const listScreen = root.querySelector<HTMLDivElement>("#mini-list");
    const detailScreen = root.querySelector<HTMLDivElement>("#mini-detail");
    const crumb = root.querySelector<HTMLElement>("#mini-crumb");
    const rowChen = root.querySelector<HTMLDivElement>("#row-chen");
    const back = root.querySelector<HTMLDivElement>("#mini-back");
    const bar = root.querySelector<HTMLDivElement>("#mini-bar");
    const sdot = root.querySelector<HTMLElement>("#mini-sdot");
    const label = root.querySelector<HTMLElement>("#mini-status-label");
    const curText = root.querySelector<HTMLElement>("#mini-cur-text");
    const pill = root.querySelector<HTMLElement>("#mini-status-pill");
    const menu = root.querySelector<HTMLDivElement>("#mini-status-menu");
    const toast = root.querySelector<HTMLDivElement>("#mini-toast");
    const toastMsg = root.querySelector<HTMLElement>("#mini-toast-msg");
    const notif = root.querySelector<HTMLDivElement>("#mini-notif");
    const notifTitle = root.querySelector<HTMLElement>("#mini-notif-title");
    const notifSub = root.querySelector<HTMLElement>("#mini-notif-sub");
    const docPreview = root.querySelector<HTMLDivElement>("#mini-doc-preview");
    const docTitle = root.querySelector<HTMLElement>("#mini-doc-title");
    const docSig = root.querySelector<HTMLElement>("#mini-doc-sig");
    const docApprove = root.querySelector<HTMLButtonElement>("#mini-doc-approve");

    if (
      !stage || !cursor || !listScreen || !detailScreen || !crumb || !rowChen ||
      !back || !bar || !sdot || !label || !curText || !pill || !menu || !toast ||
      !toastMsg || !notif || !notifTitle || !notifSub || !docPreview || !docTitle ||
      !docSig || !docApprove
    ) return;

    const segs = Array.from(bar.querySelectorAll<HTMLDivElement>(".s"));
    const menuItems = Array.from(menu.querySelectorAll<HTMLDivElement>(".status-menu-item"));

    const mc3 = root.querySelector<HTMLDivElement>("#mc-3");
    const mc4 = root.querySelector<HTMLDivElement>("#mc-4");
    const mc3sub = root.querySelector<HTMLElement>("#mc-3-sub");
    const mc4sub = root.querySelector<HTMLElement>("#mc-4-sub");
    if (!mc3 || !mc4 || !mc3sub || !mc4sub) return;

    type Stage = { k: string; name: string; lbl: string; color: string; step: number };
    const stages: Stage[] = [
      { k: "wait",    name: "AWAITING",   lbl: "Awaiting",   color: "var(--status-wait)",    step: 1 },
      { k: "ready",   name: "READY",      lbl: "Ready",      color: "var(--status-ready)",   step: 2 },
      { k: "submit",  name: "SUBMITTED",  lbl: "Submitted",  color: "var(--status-submit)",  step: 3 },
      { k: "proc",    name: "PROCESSING", lbl: "Processing", color: "var(--status-proc)",    step: 4 },
      { k: "transit", name: "IN TRANSIT", lbl: "Transit",    color: "var(--status-transit)", step: 5 },
      { k: "done",    name: "WON",        lbl: "Won",        color: "var(--status-done)",    step: 6 },
    ];

    function setStage(i: number) {
      const st = stages[i];
      sdot!.style.background = st.color;
      label!.textContent = st.name;
      curText!.textContent = st.lbl;
      segs.forEach((el, idx) => {
        el.classList.toggle("on", idx <= st.step);
        el.classList.toggle("cur", idx === st.step);
      });
      menuItems.forEach((mi, idx) => mi.classList.toggle("current", idx === i));
    }

    function showToast(msg: string) {
      toastMsg!.textContent = msg;
      toast!.classList.add("show");
      setTimeout(() => toast!.classList.remove("show"), 2000);
    }
    function showNotif(title: string, sub: string) {
      notifTitle!.innerHTML = title;
      notifSub!.textContent = sub;
      notif!.classList.add("show");
    }
    function hideNotif() { notif!.classList.remove("show"); }
    function showDoc(title: string, sig: string) {
      docTitle!.textContent = title;
      docSig!.textContent = sig;
      docPreview!.classList.add("show");
    }
    function hideDoc() { docPreview!.classList.remove("show"); }
    function openMenu() { menu!.classList.add("open"); pill!.classList.add("open"); }
    function closeMenu() {
      menu!.classList.remove("open");
      pill!.classList.remove("open");
      menuItems.forEach(mi => mi.classList.remove("hover"));
    }

    function markReceived(item: HTMLDivElement) {
      item.classList.add("flash-in");
      setTimeout(() => item.classList.remove("flash-in"), 800);
      const stateEl = item.querySelector<HTMLElement>(".mini-file-state");
      if (stateEl) {
        stateEl.textContent = "Received";
        stateEl.className = "mini-file-state received";
      }
      if (item === mc3 && mc3sub) mc3sub.textContent = "FROM CLIENT · JUST NOW";
      if (item === mc4 && mc4sub) mc4sub.textContent = "FROM CLIENT · JUST NOW";
    }
    function markApproved(item: HTMLDivElement) {
      item.classList.add("on");
      const stateEl = item.querySelector<HTMLElement>(".mini-file-state");
      if (stateEl) {
        stateEl.textContent = "Approved";
        stateEl.className = "mini-file-state approved";
      }
    }

    function resetAll() {
      listScreen!.classList.add("active");
      detailScreen!.classList.remove("active");
      crumb!.textContent = "cases";
      setStage(0);
      [mc3, mc4].forEach(item => {
        if (!item) return;
        item.classList.remove("on", "flash-in");
        const stateEl = item.querySelector<HTMLElement>(".mini-file-state");
        if (stateEl) {
          stateEl.textContent = "Required";
          stateEl.className = "mini-file-state";
        }
      });
      mc3sub!.textContent = "AWAITING CLIENT UPLOAD";
      mc4sub!.textContent = "AWAITING CLIENT UPLOAD";
      rowChen!.classList.remove("focused", "hover");
      closeMenu();
      hideNotif();
      hideDoc();
      clearTarget();
      toast!.classList.remove("show");
    }
    function goToDetail() {
      listScreen!.classList.remove("active");
      detailScreen!.classList.add("active");
      crumb!.textContent = "cases / chen-margaret";
    }
    function goToList() {
      listScreen!.classList.add("active");
      detailScreen!.classList.remove("active");
      crumb!.textContent = "cases";
    }

    const TIP_X = 2.5;
    const TIP_Y = 1.66;
    let lastTarget: Element | null = null;

    function clearTarget() {
      if (lastTarget) {
        lastTarget.classList.remove("mini-target", "mini-clicked");
        lastTarget = null;
      }
    }
    function pointAt(el: Element, opts: { xFrac?: number; yFrac?: number } = {}) {
      const sRect = stage!.getBoundingClientRect();
      const tRect = el.getBoundingClientRect();
      if (tRect.width === 0 || tRect.height === 0) return null;
      const xFrac = opts.xFrac ?? 0.5;
      const yFrac = opts.yFrac ?? 0.5;
      const x = tRect.left - sRect.left + tRect.width * xFrac;
      const y = tRect.top - sRect.top + tRect.height * yFrac;
      const cx = Math.max(4, Math.min(sRect.width - 4, x));
      const cy = Math.max(4, Math.min(sRect.height - 4, y));
      return { x: cx, y: cy };
    }
    function moveTo(el: Element, opts: { xFrac?: number; yFrac?: number; noHighlight?: boolean } = {}) {
      const p = pointAt(el, opts);
      if (!p) return;
      cursor!.style.transform = `translate(${p.x - TIP_X}px, ${p.y - TIP_Y}px)`;
      clearTarget();
      if (!opts.noHighlight) {
        el.classList.add("mini-target");
        lastTarget = el;
      }
    }
    function moveToPoint(x: number, y: number) {
      cursor!.style.transform = `translate(${x - TIP_X}px, ${y - TIP_Y}px)`;
      clearTarget();
    }
    function click() {
      cursor!.classList.add("clicking");
      if (lastTarget) lastTarget.classList.add("mini-clicked");
      setTimeout(() => cursor!.classList.remove("clicking"), 500);
    }

    let running = true;
    let ts: number[] = [];
    const after = (ms: number, fn: () => void) => {
      const t = window.setTimeout(() => running && fn(), ms);
      ts.push(t);
    };
    const clearAll = () => { ts.forEach(id => clearTimeout(id)); ts = []; };

    const MOVE = 1100;
    const MOVE_MED = 800;
    const MOVE_SHORT = 550;
    const DWELL = 450;

    function scheduleStageChange(startT: number, stageIdx: number, toastMsgText: string) {
      let t = startT;
      after(t, () => moveTo(pill!, { xFrac: 0.55, yFrac: 0.5 }));
      t += MOVE;
      after(t, () => { click(); openMenu(); });
      t += 500;
      after(t, () => {
        const target = menuItems[stageIdx];
        target.classList.add("hover");
        moveTo(target, { xFrac: 0.5 });
      });
      t += MOVE_MED;
      after(t, () => {
        click();
        menuItems[stageIdx].classList.remove("hover");
        setStage(stageIdx);
        closeMenu();
        if (toastMsgText) showToast(toastMsgText);
      });
      t += DWELL + 150;
      return t;
    }

    type UploadCfg = {
      notifTitle: string; notifSub: string; row: HTMLDivElement;
      docTitle: string; docSig: string; approvedToast: string;
    };
    function scheduleClientUpload(startT: number, cfg: UploadCfg) {
      let t = startT;
      after(t, () => showNotif(cfg.notifTitle, cfg.notifSub));
      t += 350;
      after(t, () => markReceived(cfg.row));
      t += 900;
      after(t, () => hideNotif());
      t += 300;
      after(t, () => moveTo(cfg.row, { xFrac: 0.45, yFrac: 0.5 }));
      t += MOVE;
      after(t, () => { click(); showDoc(cfg.docTitle, cfg.docSig); });
      t += 550;
      after(t, () => {
        docApprove!.classList.add("hover");
        moveTo(docApprove!, { xFrac: 0.5, yFrac: 0.5 });
      });
      t += MOVE_SHORT + 200;
      after(t, () => {
        click();
        docApprove!.classList.remove("hover");
        markApproved(cfg.row);
        showToast(cfg.approvedToast);
      });
      t += 700;
      after(t, () => hideDoc());
      t += 300;
      return t;
    }

    function loop() {
      resetAll();
      let t = 700;
      after(50, () => moveToPoint(28, 38));

      after(t, () => {
        rowChen!.classList.add("hover");
        moveTo(rowChen!, { xFrac: 0.35, yFrac: 0.55 });
      });
      t += MOVE;
      after(t, () => { click(); rowChen!.classList.add("focused"); });
      t += DWELL + 50;
      after(t, () => {
        goToDetail();
        rowChen!.classList.remove("hover");
        clearTarget();
        moveToPoint(200, 60);
      });
      t += 450;

      t = scheduleClientUpload(t, {
        notifTitle: "Margaret Chen uploaded <b>Medallion LOA.pdf</b>",
        notifSub: "CLIENT PORTAL · JUST NOW",
        row: mc3!,
        docTitle: "Medallion LOA.pdf",
        docSig: "Margaret Chen",
        approvedToast: "Medallion LOA approved",
      });

      t += 200;
      t = scheduleStageChange(t, 1, "Status → READY_TO_SUBMIT");

      t += 200;
      t = scheduleClientUpload(t, {
        notifTitle: "Margaret Chen uploaded <b>Beneficiary Designation.pdf</b>",
        notifSub: "CLIENT PORTAL · JUST NOW",
        row: mc4!,
        docTitle: "Beneficiary Designation.pdf",
        docSig: "Margaret Chen",
        approvedToast: "Beneficiary form approved · All docs in",
      });

      t += 200;
      t = scheduleStageChange(t, 2, "Submitted to Schwab · ACK received");

      t += 300;
      t = scheduleStageChange(t, 3, "Custodian processing");
      t += 200;
      t = scheduleStageChange(t, 4, "Assets in transit");
      t += 200;
      t = scheduleStageChange(t, 5, "Case complete · 6-day cycle");

      t += 900;
      after(t, () => moveTo(back!, { xFrac: 0.4, yFrac: 0.5 }));
      t += MOVE;
      after(t, () => { click(); });
      t += 450;
      after(t, () => { goToList(); clearTarget(); moveToPoint(28, 38); });
      t += 1000;

      after(t, () => loop());
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !running) { running = true; clearAll(); loop(); }
        else if (!e.isIntersecting) { running = false; clearAll(); }
      });
    }, { threshold: 0.15 });
    io.observe(root);

    const initial = window.setTimeout(loop, 700);

    return () => {
      running = false;
      clearAll();
      clearTimeout(initial);
      io.disconnect();
    };
  }, []);

  return (
    <div className="rift-landing">
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
      <div className="page-bg" />
      <div className="grain" />

      {/* NAV */}
      <nav className="top">
        <div className="wrap nav-row">
          <div className="brand">
            <div className="brand-glyph" />
            <span>Rift</span>
            <span className="mono" style={{ color: "var(--ink-mute)", fontSize: 11, marginLeft: 6 }}>v1.4</span>
          </div>
          <div className="nav-links">
            <a href="#product">Product</a>
            <a href="#workflow">Workflow</a>
            <a href="#intelligence">Intelligence</a>
            <a href="#pricing">Pricing</a>
            <a href="#customers">Customers</a>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link className="btn-ghost" href="/login">Sign in</Link>
            <Link className="btn-chrome" href="/login">
              Book a demo
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6h6M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="hero">
        <div className="wrap">
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">
                <span className="pill">NEW</span>
                Custodian intelligence, now with state-based routing
              </span>

              <h1 className="hero-title">
                Every rollover,<br />
                <span className="chromed">on the rails.</span>
              </h1>

              <p className="hero-sub">
                Rift is rollover case management for independent RIAs — a structured pipeline that replaces the spreadsheet, the thread, and the sticky note for every 401(k), 403(b), and IRA in motion.
              </p>

              <div className="hero-cta">
                <Link className="btn-chrome" href="/login">
                  Book a demo
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6h6M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
                <a className="btn-ghost" style={{ border: "1px solid var(--line-2)", padding: "11px 18px" }} href="#workflow">See the workflow ↓</a>
              </div>

              <div className="hero-meta">
                <div><span className="dot" />SOC 2 Type II · In progress</div>
                <div><span className="dot" />25+ custodians mapped</div>
                <div><span className="dot" />Built for firms of 3–200</div>
              </div>
            </div>

            {/* Mini hero demo */}
            <div className="mini-demo" id="mini-demo" ref={miniDemoRef}>
              <div className="mini-chrome">
                <div className="dots"><span /><span /><span /></div>
                <div className="url" id="mini-url">
                  <svg className="lock" width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M3.5 5.5V4a2.5 2.5 0 015 0v1.5M2.5 5.5h7v5h-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  <span><span className="path">app.rift.co/</span><span className="crumb" id="mini-crumb">cases</span></span>
                </div>
              </div>

              <div className="mini-stage">
                {/* Screen 1: Case list */}
                <div className="mini-screen active" id="mini-list">
                  <div className="mini-listhead">
                    <div>
                      <div className="mini-listtitle">Active cases</div>
                      <div className="mini-listsub">LIVE · 4 OPEN · 2 NEED ATTENTION</div>
                    </div>
                    <div className="mini-listsub" id="mini-time">14:22 ET</div>
                  </div>

                  <div className="mini-listfilters">
                    <div className="f on">All</div>
                    <div className="f">Awaiting</div>
                    <div className="f">Ready</div>
                    <div className="f">In transit</div>
                  </div>

                  <div className="mini-caselist">
                    <div className="mini-caserow" id="row-chen">
                      <div>
                        <div className="cname">Margaret Chen</div>
                        <div className="cmeta">CASE-0184 · FIDELITY → SCHWAB · OPENED MAR 18</div>
                      </div>
                      <div>
                        <div className="camt">$412K</div>
                        <div className="cstatus" style={{ color: "var(--status-wait)" }}>Awaiting · 2 open items</div>
                      </div>
                    </div>
                    <div className="mini-caserow">
                      <div>
                        <div className="cname">David Okafor</div>
                        <div className="cmeta">CASE-0181 · EMPOWER → FIDELITY · OPENED MAR 17</div>
                      </div>
                      <div>
                        <div className="camt">$287K</div>
                        <div className="cstatus" style={{ color: "var(--status-transit)" }}>In transit · day 4</div>
                      </div>
                    </div>
                    <div className="mini-caserow">
                      <div>
                        <div className="cname">The Reyes Trust</div>
                        <div className="cmeta">CASE-0179 · VANGUARD → ALTRUIST · OPENED MAR 15</div>
                      </div>
                      <div>
                        <div className="camt">$1.2M</div>
                        <div className="cstatus" style={{ color: "var(--status-proc)" }}>Processing · custodian review</div>
                      </div>
                    </div>
                    <div className="mini-caserow">
                      <div>
                        <div className="cname">Priya Nair</div>
                        <div className="cmeta">CASE-0176 · PRINCIPAL → SCHWAB · OPENED MAR 12</div>
                      </div>
                      <div>
                        <div className="camt">$94K</div>
                        <div className="cstatus" style={{ color: "var(--status-ready)" }}>Ready · awaiting signature</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Screen 2: Case detail */}
                <div className="mini-screen" id="mini-detail">
                  <div className="mini-detail-back" id="mini-back">← Cases</div>
                  <div className="mini-card">
                    <div className="mini-head">
                      <div className="mini-client">
                        Margaret Chen <span style={{ color: "var(--gold-2)", fontSize: 11, marginLeft: 4 }}>★</span>
                        <span className="sub">CASE-0184 · $412K · OPENED MAR 18</span>
                      </div>
                      <div className="mini-status-wrap" style={{ position: "relative" }}>
                        <span className="status-pill" id="mini-status-pill">
                          <span className="sdot" id="mini-sdot" style={{ background: "var(--status-wait)" }} />
                          <span id="mini-status-label">AWAITING</span>
                          <svg className="caret" viewBox="0 0 10 10" fill="none"><path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </span>
                        <div className="status-menu" id="mini-status-menu">
                          <div className="status-menu-item current" data-stage="0"><span className="mdot" style={{ background: "var(--status-wait)" }} /><span className="mname">AWAITING</span><svg className="mcheck" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                          <div className="status-menu-item" data-stage="1"><span className="mdot" style={{ background: "var(--status-ready)" }} /><span className="mname">READY</span><svg className="mcheck" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                          <div className="status-menu-item" data-stage="2"><span className="mdot" style={{ background: "var(--status-submit)" }} /><span className="mname">SUBMITTED</span><svg className="mcheck" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                          <div className="status-menu-item" data-stage="3"><span className="mdot" style={{ background: "var(--status-proc)" }} /><span className="mname">PROCESSING</span><svg className="mcheck" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                          <div className="status-menu-item" data-stage="4"><span className="mdot" style={{ background: "var(--status-transit)" }} /><span className="mname">IN TRANSIT</span><svg className="mcheck" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                          <div className="status-menu-item" data-stage="5"><span className="mdot" style={{ background: "var(--status-done)" }} /><span className="mname">WON</span><svg className="mcheck" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                        </div>
                      </div>
                    </div>

                    <div className="mini-route">
                      Fidelity 401(k) <span className="arr">→</span> Schwab Traditional IRA
                    </div>

                    <div className="mini-pipe">
                      <div className="mini-pipe-bar" id="mini-bar">
                        <div className="s on" />
                        <div className="s on" />
                        <div className="s" />
                        <div className="s" />
                        <div className="s" />
                        <div className="s" />
                        <div className="s" />
                      </div>
                      <div className="mini-pipe-label">
                        <span>Intake</span>
                        <span className="cur-status" id="mini-cur-text">Awaiting</span>
                        <span>Complete</span>
                      </div>
                    </div>

                    <div className="mini-check">
                      <div className="mini-check-item on" id="mc-1">
                        <div className="mini-check-box"><svg viewBox="0 0 10 10"><path d="M2 5l2 2 4-5" /></svg></div>
                        <div className="mini-file">
                          <div className="mini-file-icon">PDF</div>
                          <div className="mini-file-meta">
                            <div className="mini-file-name">Client Authorization.pdf</div>
                            <div className="mini-file-sub">FROM CLIENT · MAR 18</div>
                          </div>
                        </div>
                        <span className="mini-file-state approved">Approved</span>
                      </div>
                      <div className="mini-check-item on" id="mc-2">
                        <div className="mini-check-box"><svg viewBox="0 0 10 10"><path d="M2 5l2 2 4-5" /></svg></div>
                        <div className="mini-file">
                          <div className="mini-file-icon">PDF</div>
                          <div className="mini-file-meta">
                            <div className="mini-file-name">Fidelity Statement Q1.pdf</div>
                            <div className="mini-file-sub">FROM CLIENT · MAR 18</div>
                          </div>
                        </div>
                        <span className="mini-file-state approved">Approved</span>
                      </div>
                      <div className="mini-check-item" id="mc-3">
                        <div className="mini-check-box"><svg viewBox="0 0 10 10"><path d="M2 5l2 2 4-5" /></svg></div>
                        <div className="mini-file">
                          <div className="mini-file-icon">PDF</div>
                          <div className="mini-file-meta">
                            <div className="mini-file-name" id="mc-3-name">Medallion LOA</div>
                            <div className="mini-file-sub" id="mc-3-sub">AWAITING CLIENT UPLOAD</div>
                          </div>
                        </div>
                        <span className="mini-file-state" id="mc-3-state">Required</span>
                      </div>
                      <div className="mini-check-item" id="mc-4">
                        <div className="mini-check-box"><svg viewBox="0 0 10 10"><path d="M2 5l2 2 4-5" /></svg></div>
                        <div className="mini-file">
                          <div className="mini-file-icon">PDF</div>
                          <div className="mini-file-meta">
                            <div className="mini-file-name" id="mc-4-name">Beneficiary Designation</div>
                            <div className="mini-file-sub" id="mc-4-sub">AWAITING CLIENT UPLOAD</div>
                          </div>
                        </div>
                        <span className="mini-file-state" id="mc-4-state">Required</span>
                      </div>
                    </div>

                    <div className="mini-notif" id="mini-notif">
                      <div className="mini-notif-avatar">MC</div>
                      <div className="mini-notif-body">
                        <div className="mini-notif-title" id="mini-notif-title">Margaret Chen uploaded <b>Medallion LOA.pdf</b></div>
                        <div className="mini-notif-sub" id="mini-notif-sub">CLIENT PORTAL · JUST NOW</div>
                      </div>
                      <div className="mini-notif-dot" />
                    </div>

                    <div className="mini-doc-preview" id="mini-doc-preview">
                      <div className="mini-doc-header">
                        <div className="mini-doc-title" id="mini-doc-title">Medallion LOA.pdf</div>
                        <div className="mini-doc-close">esc</div>
                      </div>
                      <div className="mini-doc-page">
                        <div className="mini-doc-lines" />
                        <div className="mini-doc-sig" id="mini-doc-sig">Margaret Chen</div>
                      </div>
                      <div className="mini-doc-meta">
                        <span>3 pages · 412 KB</span>
                        <span>NOTARIZED ✓</span>
                      </div>
                      <button className="mini-doc-approve" id="mini-doc-approve">
                        Mark approved
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mini-toast" id="mini-toast">
                  <span className="d" />
                  <span id="mini-toast-msg">Status updated</span>
                </div>

                <div className="mini-cursor" id="mini-cursor">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M3 2l7 18 3-8 8-3L3 2z" fill="#f6f2ea" stroke="#0a0b0e" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* WHY RIFT / FEATURES */}
      <section id="product">
        <div className="wrap">
          <div className="sec-label">Why Rift</div>
          <h2 className="sec-title">A structured pipeline <em>where a thread used to be.</em></h2>
          <p className="sec-sub">Spreadsheets track; Rift drives. Every case moves through seven disciplined stages, with checklists, tasks, and an audit log that nobody has to maintain by hand.</p>

          <div className="feat-grid">
            <div className="glass-card">
              <div className="feat-num">01 / PIPELINE</div>
              <div className="feat-h">Seven stages. Zero ambiguity.</div>
              <div className="feat-b">Intake → Awaiting Client → Ready → Submitted → Processing → In Transit → Complete. Advance a status, the checklist and activity log follow.</div>
              <div className="feat-visual">
                <svg width="100%" height="100%" viewBox="0 0 300 92" preserveAspectRatio="none">
                  <g transform="translate(20,46)">
                    <line x1="0" y1="0" x2="260" y2="0" stroke="rgba(246,242,234,0.08)" strokeWidth="2" strokeDasharray="3 5" />
                    <line x1="0" y1="0" x2="140" y2="0" stroke="url(#g1)" strokeWidth="2" />
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#8a6434" />
                        <stop offset="1" stopColor="#e9d4a3" />
                      </linearGradient>
                    </defs>
                  </g>
                  <g fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#b8b3a8">
                    <circle cx="20" cy="46" r="4" fill="#c19a5b" />
                    <circle cx="60" cy="46" r="4" fill="#c19a5b" />
                    <circle cx="100" cy="46" r="4" fill="#c19a5b" />
                    <circle cx="140" cy="46" r="4" fill="#c19a5b" />
                    <circle cx="180" cy="46" r="3.5" fill="none" stroke="rgba(246,242,234,0.2)" />
                    <circle cx="220" cy="46" r="3.5" fill="none" stroke="rgba(246,242,234,0.2)" />
                    <circle cx="260" cy="46" r="3.5" fill="none" stroke="rgba(246,242,234,0.2)" />
                  </g>
                </svg>
              </div>
            </div>

            <div className="glass-card" id="intelligence">
              <div className="feat-num">02 / INTELLIGENCE</div>
              <div className="feat-h">Custodian intel that remembers.</div>
              <div className="feat-b">25+ custodians mapped. Ask Claude how Schwab routes a Texas 401(k) — it cites your firm&apos;s own tribal knowledge and mailing rules.</div>
              <div className="feat-visual" style={{ flexDirection: "column", gap: 6, padding: "10px 16px", alignItems: "stretch" }}>
                <div style={{ fontSize: 9, color: "var(--gold-1)", fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>🔧 search_custodians(&quot;Schwab&quot;)</div>
                <div style={{ fontSize: 10, color: "var(--ink-dim)" }}>Medallion required over $250k. Mail to El Paso for TX clients.</div>
                <div style={{ fontSize: 9, color: "var(--ink-mute)", fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>3 firm notes · 12 citations</div>
              </div>
            </div>

            <div className="glass-card">
              <div className="feat-num">03 / AUDIT</div>
              <div className="feat-h">Immutable, not imaginary.</div>
              <div className="feat-b">Every status change, upload, and task completion is logged with actor and timestamp. Answer &quot;who did what and when&quot; in one click.</div>
              <div className="feat-visual" style={{ flexDirection: "column", gap: 4, padding: "10px 14px", alignItems: "stretch", fontSize: 10 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--ink-dim)" }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--gold-2)" }} />
                  <b style={{ color: "var(--ink)" }}>R. Medina</b> · CASE_CREATED <span style={{ color: "var(--ink-mute)", marginLeft: "auto", fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>10:24</span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--ink-dim)" }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--gold-2)" }} />
                  <b style={{ color: "var(--ink)" }}>O. Park</b> · FILE_UPLOADED <span style={{ color: "var(--ink-mute)", marginLeft: "auto", fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>09:02</span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--ink-dim)" }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--gold-2)" }} />
                  <b style={{ color: "var(--ink)" }}>System</b> · STATUS_CHANGED <span style={{ color: "var(--ink-mute)", marginLeft: "auto", fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>11:47</span>
                </div>
              </div>
            </div>

            <div className="glass-card">
              <div className="feat-num">04 / CHECKLISTS</div>
              <div className="feat-h">Paperwork, pre-packed.</div>
              <div className="feat-b">Per-case checklists with status buckets (Requested → Received → Reviewed). Attach documents in place; never hunt for an LOA again.</div>
              <div className="feat-visual" style={{ flexDirection: "column", padding: "10px 16px", alignItems: "stretch", gap: 5 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: "linear-gradient(135deg,var(--gold-4),var(--gold-2))" }} />
                  <span style={{ color: "var(--ink-mute)", textDecoration: "line-through" }}>Signed authorization</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: "linear-gradient(135deg,var(--gold-4),var(--gold-2))" }} />
                  <span style={{ color: "var(--ink-mute)", textDecoration: "line-through" }}>Statement (60d)</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, border: "1.5px solid var(--line-2)" }} />
                  <span style={{ color: "var(--ink-dim)" }}>Medallion LOA</span>
                </div>
              </div>
            </div>

            <div className="glass-card">
              <div className="feat-num">05 / ROLES</div>
              <div className="feat-h">Advisor &amp; Ops, not one person.</div>
              <div className="feat-b">Admins see it all. Advisors see their cases. Ops see theirs. Workload charts keep anyone from drowning quietly.</div>
              <div className="feat-visual" style={{ padding: "10px 16px", alignItems: "stretch" }}>
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 9, color: "var(--ink-mute)", display: "flex", justifyContent: "space-between" }}><span>R. Medina</span><span className="mono">12</span></div>
                  <div style={{ height: 5, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}><div style={{ width: "70%", height: "100%", background: "linear-gradient(90deg,var(--gold-3),var(--gold-1))" }} /></div>
                  <div style={{ fontSize: 9, color: "var(--ink-mute)", display: "flex", justifyContent: "space-between" }}><span>J. Liu</span><span className="mono">9</span></div>
                  <div style={{ height: 5, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}><div style={{ width: "52%", height: "100%", background: "linear-gradient(90deg,var(--gold-3),var(--gold-1))" }} /></div>
                  <div style={{ fontSize: 9, color: "var(--ink-mute)", display: "flex", justifyContent: "space-between" }}><span>O. Park · ops</span><span className="mono">18</span></div>
                  <div style={{ height: 5, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}><div style={{ width: "92%", height: "100%", background: "linear-gradient(90deg,var(--gold-3),var(--gold-1))" }} /></div>
                </div>
              </div>
            </div>

            <div className="glass-card">
              <div className="feat-num">06 / REMINDERS</div>
              <div className="feat-h">Nudges that don&apos;t nag.</div>
              <div className="feat-b">Automated reminder engine with 20-hour dedup. Configurable thresholds for stalled cases, missing docs, and overdue tasks. Dry-run before every send.</div>
              <div className="feat-visual" style={{ padding: "10px 16px", alignItems: "stretch", fontSize: 10, color: "var(--ink-dim)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Stalled · 7d</span><span className="mono" style={{ color: "var(--gold-1)" }}>ON</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Missing docs · 48h</span><span className="mono" style={{ color: "var(--gold-1)" }}>ON</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Overdue tasks · daily</span><span className="mono" style={{ color: "var(--gold-1)" }}>ON</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PIPELINE VIZ */}
      <section id="workflow">
        <div className="wrap">
          <div className="sec-label">The rollover pipeline</div>
          <h2 className="sec-title">From intake to complete <em>— one lane.</em></h2>
          <p className="sec-sub">Every stage has owners, exit criteria, and a dwell-time SLA. Watch a case move.</p>

          <div className="pipeline-viz">
            <div className="pipe-stages">
              <div className="pipe-stage" data-idx="0"><div className="n">01</div><div className="nm">Intake</div><div className="ct">4 cases</div></div>
              <div className="pipe-stage" data-idx="1"><div className="n">02</div><div className="nm">Awaiting</div><div className="ct">8 cases</div></div>
              <div className="pipe-stage" data-idx="2"><div className="n">03</div><div className="nm">Ready</div><div className="ct">3 cases</div></div>
              <div className="pipe-stage" data-idx="3"><div className="n">04</div><div className="nm">Submitted</div><div className="ct">5 cases</div></div>
              <div className="pipe-stage active" data-idx="4"><div className="n">05</div><div className="nm">Processing</div><div className="ct">6 cases</div></div>
              <div className="pipe-stage" data-idx="5"><div className="n">06</div><div className="nm">In Transit</div><div className="ct">4 cases</div></div>
              <div className="pipe-stage" data-idx="6"><div className="n">07</div><div className="nm">Complete</div><div className="ct">112 cases</div></div>
            </div>

            <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, fontSize: 10, color: "var(--ink-mute)", fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace" }}>
              <div>avg 2d</div><div>avg 4d</div><div>avg 1d</div><div>avg 1d</div><div>avg 5d</div><div>avg 3d</div><div>—</div>
            </div>
          </div>

          <div className="stats-row">
            <div className="stat"><div className="val">41%</div><div className="lbl">Reduction in rollover cycle time</div></div>
            <div className="stat"><div className="val">25+</div><div className="lbl">Custodians mapped, routed, and annotated</div></div>
            <div className="stat"><div className="val">0</div><div className="lbl">Cases lost to a dropped email thread</div></div>
            <div className="stat"><div className="val">3mo</div><div className="lbl">Typical time to firm-wide adoption</div></div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section id="customers" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <div className="quote-card">
            <p className="quote-text">Before Rift, we ran every rollover out of a shared inbox and a Google Sheet someone had to babysit. Now our ops lead actually has Fridays.</p>
            <div className="quote-meta">
              <div className="quote-av">RM</div>
              <div>
                <div className="quote-name">Rachel Medina</div>
                <div className="quote-role">Partner · Stoneridge Wealth · 14 advisors</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-mute)" }}>AUM</span>
                <span className="mono" style={{ fontSize: 14, color: "var(--gold-1)" }}>$1.8B</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" style={{ paddingBottom: 0 }}>
        <div className="wrap">
          <div className="cta-block">
            <h2>Put your rollovers <em>on the rails.</em></h2>
            <p>30-minute walkthrough. We&apos;ll load one of your live cases into a sandbox and move it through the pipeline with you.</p>
            <Link className="btn-chrome" href="/login" style={{ padding: "14px 28px", fontSize: 15 }}>
              Book a demo
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M3 6h6M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <div style={{ marginTop: 18, fontSize: 12, color: "var(--ink-mute)" }} className="mono">NO CARD · NO SALES LOOPS · 30 MIN</div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="wrap foot-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="brand-glyph" style={{ width: 20, height: 20 }} />
            <span>Rift · 2026</span>
            <span className="mono" style={{ color: "var(--ink-mute)", marginLeft: 10 }}>Made for independent RIAs</span>
          </div>
          <div className="foot-links">
            <a href="#product">Security</a>
            <a href="#product">Privacy</a>
            <a href="#workflow">Status</a>
            <a href="#product">Changelog</a>
            <Link href="/login">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
