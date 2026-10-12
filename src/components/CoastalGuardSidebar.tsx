import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle2, ChevronRight, Crosshair, MessageSquare, Shield, Siren, Users, X, MapPin, FileText, Settings, Send, Search, Activity, Phone, Lightbulb, Volume2, RotateCcw, AlertOctagon, Download } from 'lucide-react';
import { FleetVessel } from '../data/coastalGuardFleet';
import { fetchChatMessages, fetchSafetyAlerts, SafetyAlert, ChatMessage } from '../services/backend';
import { HardwareState, ThemeMode } from '../types';

interface Props {
  theme: ThemeMode;
  fleet: FleetVessel[];
  isOpen: boolean;
  hardware: HardwareState;
  onClose: () => void;
  onSelectVessel: (vessel: FleetVessel) => void;
  onFocusVessel: (vessel: FleetVessel) => void;
  onBroadcast: (message: string, target?: FleetVessel | null) => void | Promise<void>;
  onViewIMBL: () => void;
  onStartDraw: (shape: 'polygon' | 'rectangle' | 'circle') => void;
  onClearGeofence: () => void;
  onHardwareTest: (type: 'LED' | 'BUZZER' | 'ALARM' | 'RESET' | 'EMERGENCY') => void;
  onNotify: (message: string, type?: 'info' | 'warn' | 'error' | 'success') => void;
}

type Tab = 'COMMAND' | 'FLEET' | 'ALERTS' | 'COMMS' | 'ZONES' | 'REPORTS';
const TABS: Tab[] = ['COMMAND', 'FLEET', 'ALERTS', 'COMMS', 'ZONES', 'REPORTS'];

const listItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.045 } } };

export const CoastalGuardSidebar: React.FC<Props> = ({ theme, fleet, isOpen, hardware, onClose, onSelectVessel, onFocusVessel, onBroadcast, onViewIMBL, onStartDraw, onClearGeofence, onHardwareTest, onNotify }) => {
  const [tab, setTab] = useState<Tab>('COMMAND');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [target, setTarget] = useState<FleetVessel | null>(null);
  const [acked, setAcked] = useState<Set<string>>(new Set());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [serverAlerts, setServerAlerts] = useState<SafetyAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState('');
  const isLight = theme === 'light';
  const panel = isLight ? 'bg-white/94 border-sky-200 text-slate-800' : 'bg-[#030e1b]/95 border-slate-800 text-slate-100';
  const card = isLight ? 'bg-white/80 border-sky-100' : 'bg-[#061526]/85 border-slate-800/90';
  const muted = isLight ? 'text-slate-500' : 'text-slate-400';
  const filtered = useMemo(() => fleet.filter(v => `${v.boat} ${v.fisherman} ${v.deviceId}`.toLowerCase().includes(search.toLowerCase())), [fleet, search]);
  const counts = { safe: fleet.filter(v => v.status === 'SAFE').length, warning: fleet.filter(v => v.status === 'WARNING').length, critical: fleet.filter(v => v.status === 'CRITICAL').length, sos: fleet.filter(v => v.status === 'SOS').length, offline: fleet.filter(v => v.status === 'OFFLINE').length };
  const statusClass = (s: FleetVessel['status']) => ({ SAFE:'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', WARNING:'text-yellow-300 bg-yellow-500/10 border-yellow-500/30', CRITICAL:'text-orange-300 bg-orange-500/10 border-orange-500/30', SOS:'text-red-300 bg-red-500/15 border-red-500/40 animate-pulse', OFFLINE:'text-slate-400 bg-slate-500/10 border-slate-500/30' }[s]);
  const alertVessels = fleet.filter(v => v.status !== 'SAFE' && v.status !== 'OFFLINE');
  const priority = fleet.filter(v => v.status === 'SOS' || v.status === 'CRITICAL' || v.status === 'WARNING');

  // Poll the dedicated chat backend only while the Communications tab is open.
  // Fleet/GPS status continues using the original backend.
  useEffect(() => {
    if (tab !== 'COMMS' || !isOpen) return;
    let active = true;
    const loadMessages = async () => {
      try {
        setChatLoading(true);
        const rows = await fetchChatMessages();
        if (active) { setChatMessages(rows.slice(0, 40).reverse()); setChatError(''); }
      } catch (err) {
        if (active) setChatError(err instanceof Error ? err.message : 'Chat backend unavailable');
      } finally { if (active) setChatLoading(false); }
    };
    void loadMessages();
    const timer = window.setInterval(() => void loadMessages(), 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [tab, isOpen]);

  // Load persisted backend incidents into the Alerts tab, not just the popup.
  useEffect(() => {
    if (tab !== 'ALERTS' || !isOpen) return;
    let active = true;
    const loadAlerts = async () => {
      try {
        setAlertsLoading(true);
        const rows = await fetchSafetyAlerts();
        if (active) { setServerAlerts(rows); setAlertsError(''); }
      } catch (err) {
        if (active) setAlertsError(err instanceof Error ? err.message : 'Unable to load server alerts');
      } finally { if (active) setAlertsLoading(false); }
    };
    void loadAlerts();
    const timer = window.setInterval(() => void loadAlerts(), 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [tab, isOpen]);

  // Keep the selected broadcast target in sync with the live fleet (device may drop out).
  useEffect(() => { if (target && !fleet.some(v => v.id === target.id)) setTarget(null); }, [fleet, target]);

  const toggleAck = (v: FleetVessel) => {
    setAcked(prev => {
      const next = new Set(prev);
      if (next.has(v.id)) next.delete(v.id); else next.add(v.id);
      return next;
    });
    onNotify(acked.has(v.id) ? `Alert for ${v.boat} re-opened` : `Alert for ${v.boat} acknowledged`, acked.has(v.id) ? 'info' : 'success');
  };

  const contactVessel = (v: FleetVessel) => { setTarget(v); setTab('COMMS'); onFocusVessel(v); };

  const send = async () => {
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    try { await onBroadcast(text, target); setMessage(''); } finally { setSending(false); }
  };

  const generateReport = () => {
    const now = new Date();
    const rows = fleet.map(v => `${v.id},${v.boat},${v.fisherman},${v.deviceId},${v.status},${v.lat.toFixed(5)},${v.lng.toFixed(5)},${v.speed},${v.battery},${v.zone.replace(/,/g, ' ')},${v.lastSeen}`);
    const body = [
      'SAFESEA ASTRA - COASTAL GUARD OPERATIONAL REPORT',
      `Generated: ${now.toLocaleString()}`,
      `Total vessels: ${fleet.length} | Safe: ${counts.safe} | Warning: ${counts.warning} | Critical: ${counts.critical} | SOS: ${counts.sos} | Offline: ${counts.offline}`,
      '',
      'id,boat,fisherman,device,status,lat,lng,speed_kts,battery_pct,zone,last_seen',
      ...rows,
    ].join('\n');
    const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `safesea-report-${now.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    onNotify('Operational report downloaded', 'success');
  };

  const hwButtons: { key: 'LED' | 'BUZZER' | 'ALARM' | 'RESET'; label: string; Icon: typeof Lightbulb; cls: string; active: boolean }[] = [
    { key: 'LED', label: 'LED', Icon: Lightbulb, cls: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30', active: hardware.ledTestActive },
    { key: 'BUZZER', label: 'Buzzer', Icon: Volume2, cls: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30', active: hardware.buzzerTestActive },
    { key: 'ALARM', label: 'Alarm', Icon: Siren, cls: 'bg-orange-500/10 text-orange-300 border-orange-500/30', active: hardware.alarmTestActive },
    { key: 'RESET', label: 'Reset', Icon: RotateCcw, cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30', active: false },
  ];

  return <aside aria-hidden={!isOpen} inert={!isOpen} className={`fixed top-14 bottom-0 left-0 z-[995] w-[350px] max-w-[100vw] sm:w-[390px] ${panel} backdrop-blur-2xl border-r shadow-2xl transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'}`}>
    <div className="px-4 py-3 border-b border-slate-700/30 flex items-center justify-between">
      <div><div className="text-[11px] font-black tracking-[.18em] text-cyan-400">COASTAL GUARD</div><div className="text-sm font-extrabold">Command & Fleet Management</div></div>
      <button type="button" aria-label="Close sidebar" onClick={onClose} className="p-2 rounded-xl border border-slate-700/40 hover:bg-slate-700/20"><X className="w-4 h-4" /></button>
    </div>
    <div role="tablist" className="grid grid-cols-3 border-b border-slate-700/30 text-[9px] font-bold">
      {TABS.map(t => <button type="button" role="tab" aria-selected={tab===t} key={t} onClick={() => setTab(t)} className={`py-2.5 relative ${tab===t ? 'text-cyan-400 bg-cyan-500/5' : muted}`}>
        {t}
        {tab===t && <motion.span layoutId="sidebar-tab-underline" className="absolute left-0 right-0 bottom-0 h-0.5 bg-cyan-400" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
      </button>)}
    </div>
    <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
      <AnimatePresence mode="wait">
      <motion.div key={tab} variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0, y: -6, transition: { duration: .12 } }} className="space-y-3">

      {tab === 'COMMAND' && <>
        <motion.div variants={listItem} className="grid grid-cols-2 gap-2">
          {[['TOTAL',fleet.length,'text-cyan-300'],['ONLINE',fleet.length-counts.offline,'text-emerald-300'],['WARNING',counts.warning,'text-yellow-300'],['CRITICAL',counts.critical,'text-orange-300'],['SOS',counts.sos,'text-red-300'],['OFFLINE',counts.offline,'text-slate-400']].map(([a,b,c]) => <div className={`${card} border rounded-2xl p-3`} key={a as string}><div className={`text-[9px] uppercase tracking-wider ${muted}`}>{a}</div><div className={`text-xl font-black ${c}`}>{b}</div></div>)}
        </motion.div>
        <motion.section variants={listItem} className={`${card} border rounded-2xl p-3`}><div className="flex items-center justify-between mb-2"><h3 className="font-extrabold text-xs flex items-center gap-2"><Shield className="w-4 h-4 text-cyan-400"/>Command Status</h3><span className="text-[9px] text-emerald-400 font-bold">SYSTEM ONLINE</span></div><div className={`text-[10px] ${muted}`}>Fleet telemetry, emergency events and operational zones are under Coastal Guard command.</div></motion.section>
        <motion.section variants={listItem} className={`${card} border rounded-2xl p-3`}><div className="font-extrabold text-xs mb-2 flex items-center gap-2"><Siren className="w-4 h-4 text-red-400"/>Priority Incidents</div>{priority.map(v=><button type="button" key={v.id} onClick={()=>onFocusVessel(v)} className="w-full text-left flex items-center justify-between p-2 rounded-xl hover:bg-white/5 border-b border-slate-700/20"><div><div className="text-[11px] font-bold">{v.boat} · {v.fisherman}</div><div className={`text-[9px] ${muted}`}>{v.zone} · {v.lastSeen}</div></div><span className={`px-2 py-1 rounded-full border text-[8px] font-black ${statusClass(v.status)}`}>{v.status}</span></button>)}{priority.length===0&&<div className={`text-[10px] ${muted}`}>No priority incidents.</div>}</motion.section>
        <motion.div variants={listItem} className="grid grid-cols-2 gap-2"><button type="button" onClick={onViewIMBL} className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-[10px] font-bold">⌁ Full IMBL</button><button type="button" onClick={()=>setTab('FLEET')} className="p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-[10px] font-bold">View Fleet</button></motion.div>

        {/* Hardware controls: these handlers existed in App but had no buttons. */}
        <motion.section variants={listItem} className={`${card} border rounded-2xl p-3`}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-extrabold text-xs flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-400"/>Hardware Control</div>
            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${hardware.serialConnected ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' : 'text-slate-400 border-slate-500/30 bg-slate-500/10'}`}>{hardware.serialConnected ? 'ESP32 LINKED' : 'NOT CONNECTED'}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {hwButtons.map(({ key, label, Icon, cls, active }) => <button type="button" key={key} onClick={() => onHardwareTest(key)} className={`p-2 rounded-xl border text-[9px] font-bold flex flex-col items-center gap-1 ${cls} ${active ? 'ring-2 ring-current animate-pulse' : ''}`}><Icon className="w-4 h-4"/>{label}</button>)}
          </div>
          <button type="button" aria-pressed={hardware.emergencyActive} onClick={() => onHardwareTest('EMERGENCY')} className={`w-full mt-2 p-2.5 rounded-xl border text-[10px] font-black tracking-wide flex items-center justify-center gap-2 ${hardware.emergencyActive ? 'bg-red-600 text-white border-red-400 fx-emergency' : 'bg-red-500/10 text-red-300 border-red-500/40'}`}>
            <AlertOctagon className="w-4 h-4"/>{hardware.emergencyActive ? 'EMERGENCY ACTIVE · TAP TO CLEAR' : 'TRIGGER EMERGENCY'}
          </button>
          {!hardware.serialConnected && <div className={`mt-2 text-[9px] ${muted}`}>Commands still drive the browser alarm; connect the ESP32 from the top bar to send them to hardware.</div>}
        </motion.section>
      </>}

      {tab === 'FLEET' && <><motion.div variants={listItem} className="relative"><Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search boat, fisherman, device" className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900/40 border border-slate-700/50 text-xs outline-none focus:border-cyan-400 transition-colors"/>{search && <button type="button" aria-label="Clear search" onClick={()=>setSearch('')} className="absolute right-2 top-2 p-0.5 rounded-full text-slate-400"><X className="w-3.5 h-3.5"/></button>}</motion.div>{filtered.length===0 && <motion.div variants={listItem} className={`text-[10px] text-center py-6 ${muted}`}>No vessels match "{search}".</motion.div>}{filtered.map(v=><motion.button variants={listItem} type="button" key={v.id} onClick={()=>onSelectVessel(v)} className={`${card} border rounded-2xl p-3 w-full text-left hover:border-cyan-500/40 transition-all`}><div className="flex items-center justify-between"><div className="font-extrabold text-xs">{v.boat}</div><span className={`px-2 py-1 rounded-full border text-[8px] font-black ${statusClass(v.status)}`}>{v.status}</span></div><div className={`grid grid-cols-2 gap-1 mt-2 text-[9px] ${muted}`}><span>Fisherman: <b className="text-inherit">{v.fisherman}</b></span><span>Device: <b className="text-inherit">{v.deviceId}</b></span><span>Speed: {v.speed} kts</span><span>Battery: {v.battery}%</span></div><div className="mt-2 flex gap-1"><span className="text-[8px] px-2 py-1 rounded-lg bg-slate-500/10">{v.zone}</span><span className="ml-auto text-[8px] text-cyan-400 flex items-center gap-1"><MapPin className="w-3 h-3"/>Locate</span></div></motion.button>)}</>}

      {tab === 'ALERTS' && <>
        <motion.div variants={listItem} className={`${card} border rounded-2xl p-3`}>
          <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 font-extrabold text-xs"><Bell className="w-4 h-4 text-yellow-400"/>Alert Operations</div><span className={`text-[9px] ${alertsError ? 'text-rose-300' : 'text-emerald-300'}`}>{alertsError ? 'SERVER ERROR' : alertsLoading ? 'SYNCING…' : `LIVE · ${serverAlerts.length}`}</span></div>
          <div className={`mt-1 text-[9px] ${muted}`}>Server incidents refresh every 5 seconds. Fleet status alerts are shown below too.</div>
          {alertsError && <div className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-[9px] text-rose-200">Could not load persisted alerts: {alertsError}</div>}
        </motion.div>
        {serverAlerts.map(a => {
          const critical = /SOS|EMERGENCY|CRITICAL|CROSSED|BOUNDARY/i.test(`${a.type} ${a.severity}`);
          return <motion.div variants={listItem} key={`server-${a.id}`} className={`${card} border rounded-2xl p-3 ${critical ? 'border-rose-500/40' : 'border-amber-500/30'}`}>
            <div className="flex items-start justify-between gap-2"><div><b className="text-xs">{a.type || 'SAFETY ALERT'}</b><div className={`text-[9px] mt-1 ${muted}`}>{a.boatName || a.fishermanName || a.deviceId || 'Unknown vessel'} · {a.deviceId || 'No device ID'}</div></div><span className={`text-[8px] font-black px-2 py-1 rounded-full border ${critical ? 'text-red-300 bg-red-500/10 border-red-500/30' : 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30'}`}>{a.severity || 'WARNING'}</span></div>
            <p className="text-[10px] mt-2 whitespace-pre-wrap break-words">{a.message}</p>
            <div className={`text-[8px] mt-2 ${muted}`}>{a.timestamp ? new Date(a.timestamp).toLocaleString() : 'Time unavailable'}{a.distanceMeters !== undefined ? ` · ${Math.round(a.distanceMeters)} m from boundary` : ''}</div>
            {a.latitude !== undefined && a.longitude !== undefined && <a className="inline-block mt-2 text-[9px] font-bold text-cyan-300 underline" href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`} target="_blank" rel="noreferrer">VIEW LOCATION</a>}
          </motion.div>;
        })}
        {serverAlerts.length === 0 && !alertsLoading && !alertsError && <motion.div variants={listItem} className={`text-[10px] text-center py-4 ${muted}`}>No persisted server alerts yet.</motion.div>}
        <motion.div variants={listItem} className={`${card} border rounded-2xl p-3`}><div className="font-extrabold text-xs mb-2">Fleet status alerts</div>{alertVessels.length===0 && <div className={`text-[10px] text-center py-3 ${muted}`}>No vessels currently in warning, critical, or SOS status.</div>}{alertVessels.map(v=>{const isAck=acked.has(v.id); return <div key={`fleet-${v.id}`} className={`${card} border rounded-xl p-2 mb-2 ${isAck?'opacity-60':''}`}><div className="flex justify-between"><div><b className="text-xs">{v.boat}</b>{isAck && <span className="ml-2 text-[8px] font-black text-emerald-400">ACKNOWLEDGED</span>}<div className={`text-[9px] ${muted}`}>{v.fisherman} · {v.zone}</div></div><span className={`text-[8px] font-black px-2 py-1 rounded-full border h-fit ${statusClass(v.status)}`}>{v.status}</span></div><div className="flex gap-2 mt-2"><button type="button" onClick={()=>onFocusVessel(v)} className="flex-1 p-2 rounded-lg bg-cyan-500/10 text-cyan-300 text-[9px] font-bold">LOCATE</button><button type="button" onClick={()=>contactVessel(v)} className="flex-1 p-2 rounded-lg bg-red-500/10 text-red-300 text-[9px] font-bold">CONTACT</button><button type="button" aria-pressed={isAck} aria-label={isAck?'Re-open alert':'Acknowledge alert'} title={isAck?'Re-open alert':'Acknowledge alert'} onClick={()=>toggleAck(v)} className={`p-2 rounded-lg ${isAck?'bg-emerald-500 text-white':'bg-emerald-500/10 text-emerald-300'}`}><CheckCircle2 className="w-3.5 h-3.5"/></button></div></div>})}</motion.div>
      </>}

      {tab === 'COMMS' && <><motion.section variants={listItem} className={`${card} border rounded-2xl p-3`}><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 font-extrabold text-xs"><MessageSquare className="w-4 h-4 text-cyan-400"/>Fisherman Messages</div><span className={`text-[8px] ${chatError ? 'text-rose-300' : 'text-emerald-300'}`}>{chatError ? 'CHAT OFFLINE' : chatLoading ? 'SYNCING…' : 'LIVE · 5s'}</span></div>{chatError && <div className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-[9px] text-rose-200">Unable to load chat messages: {chatError}. Check the chat service and CORS settings.</div>}<div className="mt-2 max-h-48 overflow-y-auto space-y-2 pr-1">{chatMessages.length === 0 && !chatError && <div className={`py-4 text-center text-[9px] ${muted}`}>No messages received yet. New fisherman messages appear here automatically.</div>}{chatMessages.map((m) => { const fromFisherman = String(m.senderType || '').toUpperCase() === 'FISHERMAN' || (m.senderId !== 'COASTAL_GUARD' && m.senderType !== 'COASTAL_GUARD'); return <div key={m.id} className={`rounded-xl border p-2 ${fromFisherman ? 'border-amber-500/25 bg-amber-500/5' : 'border-cyan-500/20 bg-cyan-500/5'}`}><div className="flex items-center justify-between gap-2"><b className="text-[9px]">{fromFisherman ? (m.fishermanName || m.senderName || m.deviceId || m.senderId) : 'Coastal Guard'}</b><span className={`text-[8px] ${muted}`}>{m.timestamp ? new Date(m.timestamp).toLocaleString() : 'Time unavailable'}</span></div><div className="mt-1 text-[10px] whitespace-pre-wrap break-words">{m.message}</div>{fromFisherman && <button type="button" onClick={() => { const id = m.deviceId || m.senderId; const vessel = fleet.find(v => v.deviceId === id || v.id === id); if (vessel) { setTarget(vessel); onFocusVessel(vessel); } else { setTarget({ id, deviceId: id, boat: m.boatName || 'Unknown vessel', fisherman: m.fishermanName || m.senderName || id, phone: '', lat: Number(m.latitude || 0), lng: Number(m.longitude || 0), speed: 0, heading: 0, status: 'OFFLINE', lastSeen: m.timestamp || 'unknown', zone: 'Unknown', battery: 0 } as FleetVessel); } setMessage(''); }} className="mt-2 rounded-lg border border-cyan-500/30 px-2 py-1 text-[8px] font-bold text-cyan-300">Reply to fisherman</button>}</div>})}</div></motion.section><motion.section variants={listItem} className={`${card} border rounded-2xl p-3`}><div className="flex items-center gap-2 font-extrabold text-xs"><MessageSquare className="w-4 h-4 text-cyan-400"/>Command Broadcast</div>
        <div className="mt-2 flex items-center gap-2 text-[9px]"><span className={muted}>To:</span><span className="px-2 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-bold">{target ? `${target.boat} · ${target.fisherman}` : 'ALL FLEET'}</span>{target && <button type="button" onClick={()=>setTarget(null)} className="text-[9px] text-slate-400 underline px-1">send to all</button>}</div>
        <textarea value={message} maxLength={500} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{ if ((e.ctrlKey||e.metaKey) && e.key==='Enter') send(); }} placeholder="Type safety instruction or maritime alert... (Ctrl+Enter to send)" className="w-full mt-2 h-24 p-3 rounded-xl bg-slate-950/30 border border-slate-700/50 text-xs outline-none focus:border-cyan-400 transition-colors resize-none"/><div className={`text-right text-[8px] ${muted}`}>{message.length}/500</div><button type="button" disabled={!message.trim()||sending} onClick={send} className="w-full mt-1 p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-extrabold disabled:opacity-40 flex items-center justify-center gap-2"><Send className={`w-3.5 h-3.5 ${sending?'animate-pulse':''}`}/>{sending ? 'Sending…' : target ? 'Send to Vessel' : 'Broadcast to Fleet'}</button></motion.section><motion.div variants={listItem} className={`${card} border rounded-2xl p-3`}><div className="font-extrabold text-xs mb-2 flex items-center gap-2"><Users className="w-4 h-4 text-cyan-400"/>Direct Contact</div>{fleet.filter(v=>v.status!=='OFFLINE').map(v=><div key={v.id} className={`w-full flex items-center justify-between py-1.5 border-b border-slate-700/20 ${target?.id===v.id?'text-cyan-300':''}`}><button type="button" onClick={()=>contactVessel(v)} className="flex-1 flex items-center justify-between text-left px-1 py-1 rounded-lg"><span className="text-[10px] font-bold">{v.fisherman} · {v.boat}</span><ChevronRight className="w-3.5 h-3.5 text-slate-500"/></button>{v.phone && <a href={`tel:${v.phone.replace(/\s/g,'')}`} aria-label={`Call ${v.fisherman}`} title={`Call ${v.phone}`} className="ml-1 p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300"><Phone className="w-3.5 h-3.5"/></a>}</div>)}</motion.div></>}

      {tab === 'ZONES' && <><motion.section variants={listItem} className={`${card} border rounded-2xl p-3`}><div className="font-extrabold text-xs flex items-center gap-2"><Crosshair className="w-4 h-4 text-cyan-400"/>Operational Zones</div><div className={`text-[9px] mt-1 ${muted}`}>Create zones for fishing operations, restricted waters and temporary safety corridors. The sidebar closes on small screens so you can draw on the map.</div><div className="grid grid-cols-3 gap-2 mt-3"><button type="button" onClick={()=>{onStartDraw('polygon'); if (window.innerWidth<640) onClose();}} className="p-2 rounded-xl bg-cyan-500/10 text-cyan-300 text-[9px] font-bold">Polygon</button><button type="button" onClick={()=>{onStartDraw('rectangle'); if (window.innerWidth<640) onClose();}} className="p-2 rounded-xl bg-indigo-500/10 text-indigo-300 text-[9px] font-bold">Rectangle</button><button type="button" onClick={()=>{onStartDraw('circle'); if (window.innerWidth<640) onClose();}} className="p-2 rounded-xl bg-pink-500/10 text-pink-300 text-[9px] font-bold">Circle</button></div><div className="grid grid-cols-2 gap-2 mt-2"><button type="button" onClick={onViewIMBL} className="p-2 rounded-xl bg-rose-500/10 text-rose-300 text-[9px] font-bold">Fixed IMBL</button><button type="button" onClick={onClearGeofence} className="p-2 rounded-xl bg-slate-500/10 text-slate-300 text-[9px] font-bold">Clear Custom</button></div></motion.section><motion.section variants={listItem} className={`${card} border rounded-2xl p-3 space-y-2`}><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Alert thresholds</div><div className="flex justify-between text-[10px]"><span>Warning</span><b className="text-yellow-300">500 m</b></div><div className="flex justify-between text-[10px]"><span>Critical</span><b className="text-orange-300">250 m</b></div><div className="flex justify-between text-[10px]"><span>Rapid / Emergency</span><b className="text-red-300">100 m</b></div></motion.section></>}

      {tab === 'REPORTS' && <><motion.section variants={listItem} className={`${card} border rounded-2xl p-3`}><div className="flex items-center gap-2 font-extrabold text-xs"><FileText className="w-4 h-4 text-cyan-400"/>Command Reports</div><div className="grid grid-cols-2 gap-2 mt-3">{[['Fleet status','Live'],['SOS incidents',String(counts.sos)],['Critical alerts',String(counts.critical)],['Offline devices',String(counts.offline)]].map(([a,b])=><div key={a} className="p-2 rounded-xl bg-slate-500/5 border border-slate-700/20"><div className={`text-[8px] ${muted}`}>{a}</div><b className="text-xs">{b}</b></div>)}</div><button type="button" onClick={generateReport} className="w-full mt-3 p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-[9px] font-bold flex items-center justify-center gap-2"><Download className="w-3.5 h-3.5"/>Generate Operational Report (CSV)</button></motion.section><motion.section variants={listItem} className={`${card} border rounded-2xl p-3`}><div className="font-extrabold text-xs flex items-center gap-2"><Settings className="w-4 h-4 text-slate-400"/>Command Settings</div><div className={`text-[9px] mt-1 ${muted}`}>Role-based access, notification rules, fleet configuration and server connection will be managed here.</div></motion.section></>}

      </motion.div>
      </AnimatePresence>
    </div>
  </aside>;
};
