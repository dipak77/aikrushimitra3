import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Language, UserProfile } from './types';
import { TRANSLATIONS } from './constants';
import { 
  Sprout, CloudSun, ScanLine, Mic, Droplets, ArrowLeft, Home, Store, 
  Wind, Camera, X, Wheat, Sun, MapPin, Clock, ArrowUpRight, 
  Landmark, ChevronRight, CheckCircle2, Loader2,  
  Bell, FileText, Smartphone, CloudRain, Thermometer, UserCircle,
  Share2, Save, MoreHorizontal, LayoutDashboard
} from 'lucide-react';
import { Button } from './components/Button';
import { analyzeCropDisease } from './services/geminiService';
import { GoogleGenAI, Modality, Blob as GenAIBlob } from '@google/genai';
import { clsx } from 'clsx';

// --- UTILS ---
const formatDate = () => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(15); 
  }
};

// --- HELPERS ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}
function createPCMChunk(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) int16[i] = data[i] * 32768;
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
}

// --- MOCK DATA ---
const MOCK_MARKET = [
  { name: 'Soyabean', price: 4850, trend: '+120', arrival: 'High', color: 'text-amber-300', bg: 'bg-amber-500/20', icon: Wheat },
  { name: 'Cotton', price: 7200, trend: '-50', arrival: 'Med', color: 'text-cyan-300', bg: 'bg-cyan-500/20', icon: CloudSun },
  { name: 'Onion', price: 1800, trend: '-200', arrival: 'High', color: 'text-pink-300', bg: 'bg-pink-500/20', icon: Sprout },
];
const MOCK_SCHEMES = [
  { id: 1, title: 'PM-Kisan', sub: '₹6000/Yr', status: 'OPEN', grad: 'from-blue-600 to-violet-600' },
  { id: 2, title: 'Fasal Bima', sub: 'Insurance', status: 'OPEN', grad: 'from-fuchsia-600 to-purple-600' },
  { id: 3, title: 'Solar Pump', sub: '90% Off', status: 'OPEN', grad: 'from-cyan-600 to-blue-600' },
];

// --- COMPONENTS ---

// 1. Sidebar (Desktop Glass Pill)
const Sidebar = ({ view, setView, lang }: { view: ViewState, setView: (v: ViewState) => void, lang: Language }) => {
  const t = TRANSLATIONS[lang];
  const items = [
    { id: 'DASHBOARD', icon: LayoutDashboard, label: t.menu_dashboard },
    { id: 'MARKET', icon: Store, label: t.menu_market },
    { id: 'WEATHER', icon: CloudSun, label: t.menu_weather },
    { id: 'DISEASE_DETECTOR', icon: ScanLine, label: t.menu_crop_doctor },
    { id: 'BLOG', icon: FileText, label: t.menu_knowledge },
  ];

  return (
    <div className="hidden lg:flex fixed left-6 top-6 bottom-6 w-24 flex-col z-50">
       <div className="glass-panel h-full rounded-[2.5rem] flex flex-col items-center py-8 shadow-[0_0_40px_rgba(79,70,229,0.2)] bg-slate-900/60 border border-white/10">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/40 mb-12 float-3d">
             <Sprout size={28} strokeWidth={2.5} />
          </div>
          <div className="flex-1 flex flex-col gap-6 w-full px-2">
             {items.map(item => {
               const active = view === item.id;
               return (
                 <button key={item.id} onClick={() => { setView(item.id as ViewState); triggerHaptic(); }}
                   className={clsx(
                     "w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-300 group relative",
                     active ? "bg-gradient-to-br from-white/10 to-transparent text-cyan-300 shadow-[inset_0_0_15px_rgba(6,182,212,0.1)] border border-white/10" : "text-slate-400 hover:bg-white/5 hover:text-white"
                   )}>
                    <item.icon size={24} strokeWidth={active ? 2.5 : 2} className={clsx("transition-transform group-hover:scale-110 duration-300", active && "text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]")} />
                    <span className="text-[10px] font-bold tracking-tight">{item.label.split(' ')[0]}</span>
                    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r-full shadow-[0_0_15px_#22d3ee]"></div>}
                 </button>
               );
             })}
          </div>
          <button onClick={() => { setView('VOICE_ASSISTANT'); triggerHaptic(); }} className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/30 flex items-center justify-center hover:scale-110 transition-transform active:scale-95 group relative overflow-hidden">
             <div className="absolute inset-0 bg-white/30 rounded-full animate-ping opacity-0 group-hover:opacity-30"></div>
             <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
             <Mic size={24} className="relative z-10" />
          </button>
       </div>
    </div>
  );
};

// 2. Mobile Floating Dock (Premium Glass)
const MobileNav = ({ view, setView }: { view: ViewState, setView: (v: ViewState) => void }) => {
  const navItems = [
    { id: 'DASHBOARD', icon: LayoutDashboard },
    { id: 'MARKET', icon: Store },
    { id: 'VOICE_ASSISTANT', icon: Mic, main: true },
    { id: 'DISEASE_DETECTOR', icon: ScanLine },
    { id: 'WEATHER', icon: CloudSun },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-[100] flex justify-center pointer-events-none px-4 mb-safe-bottom pt-6 bg-gradient-to-t from-[#020617] via-[#020617]/90 to-transparent">
      <div className="glass-panel pointer-events-auto p-1.5 rounded-[2.5rem] flex items-center gap-1 shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/10 w-full max-w-[350px] justify-between h-[4.5rem] bg-slate-900/80">
        {navItems.map((item) => {
           const isActive = view === item.id;
           if (item.main) {
             return (
               <button key={item.id} onClick={() => { setView(item.id as ViewState); triggerHaptic(); }} 
                 className="relative -top-8 w-16 h-16 bg-gradient-to-tr from-fuchsia-500 to-purple-600 rounded-full text-white flex items-center justify-center shadow-[0_10px_25px_rgba(192,38,211,0.5)] border-4 border-[#020617] active:scale-95 transition-all group overflow-hidden shrink-0 z-10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.4),transparent)]"></div>
                  <Mic size={28} className="relative z-10 drop-shadow-md" />
                  <div className="absolute inset-0 bg-white/30 rounded-full scale-0 group-active:scale-150 transition-transform opacity-50"></div>
               </button>
             );
           }
           return (
             <button key={item.id} onClick={() => { setView(item.id as ViewState); triggerHaptic(); }} 
               className={clsx(
                 "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 relative shrink-0",
                 isActive ? "text-cyan-300 bg-white/10 shadow-[inset_0_0_10px_rgba(6,182,212,0.2)]" : "text-slate-400 active:text-slate-200 active:scale-95"
               )}>
               <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} className={clsx(isActive && "drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]")} />
             </button>
           );
        })}
      </div>
    </div>
  );
};

// 3. Main Dashboard (Premium Layout)
const Dashboard = ({ lang, user, onNavigate }: any) => {
  const t = TRANSLATIONS[lang];
  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden hide-scrollbar pb-32 lg:pl-32 lg:pt-6 lg:pr-6 overscroll-y-contain scroll-smooth">
      <div className="w-full max-w-7xl mx-auto px-4 py-4 space-y-6 pt-safe-top">
        
        {/* Header - Premium */}
        <header className="flex justify-between items-start animate-enter mt-2">
           <div>
              <div className="flex items-center gap-2 mb-2 glass-panel w-fit px-3 py-1 rounded-full bg-slate-800/50">
                 <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_#4ade80]"></span>
                 <p className="text-green-400 font-bold text-[10px] uppercase tracking-widest">{t.live_system}</p>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-sm leading-tight mt-1">
                 {t.welcome_title} <br/>
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">{user.name.split(' ')[0]}</span>
              </h1>
              <p className="text-slate-400 font-medium text-xs mt-2 flex items-center gap-1.5">
                 <Clock size={12}/> {formatDate()}
              </p>
           </div>
           
           <button onClick={() => { onNavigate('PROFILE'); triggerHaptic(); }} className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="w-12 h-12 rounded-full glass-panel border border-white/20 flex items-center justify-center relative overflow-hidden">
                  <UserCircle className="text-slate-200 w-full h-full p-1" strokeWidth={1.5}/>
              </div>
           </button>
        </header>

        {/* Bento Grid Layout - Premium Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-auto">
           
           {/* Weather Card (Hero) */}
           <div onClick={() => { onNavigate('WEATHER'); triggerHaptic(); }} className="col-span-1 md:col-span-2 row-span-2 relative group cursor-pointer overflow-hidden rounded-[2.5rem] border border-white/10 text-white shadow-2xl shadow-purple-900/20 animate-enter delay-100 transition-all active:scale-[0.98]">
              {/* Card Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 to-purple-900/80 backdrop-blur-xl"></div>
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
              
              {/* 3D Sun */}
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-amber-400/30 rounded-full blur-[60px] animate-pulse"></div>
              <div className="absolute top-4 right-4 float-3d">
                  <Sun size={64} className="text-amber-300 drop-shadow-[0_0_30px_rgba(251,191,36,0.6)]" fill="rgba(251,191,36,0.5)"/>
              </div>

              <div className="relative p-6 z-10 min-h-[180px] flex flex-col justify-between h-full">
                 <div className="glass-panel w-fit px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 bg-black/20 border-white/10">
                    <MapPin size={10} className="text-cyan-300"/> {user.village}
                 </div>
                 
                 <div className="mt-4">
                    <h2 className="text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 drop-shadow-lg">28°</h2>
                    <p className="text-lg font-medium text-indigo-200 -mt-2 mb-4">Sunny & Clear</p>
                    
                    <div className="grid grid-cols-2 gap-3">
                       <div className="glass-panel p-2 rounded-xl flex items-center gap-2 bg-white/5">
                          <Wind size={16} className="text-cyan-300"/> 
                          <span className="font-bold text-sm">12 km/h</span>
                       </div>
                       <div className="glass-panel p-2 rounded-xl flex items-center gap-2 bg-white/5">
                          <Droplets size={16} className="text-blue-300"/> 
                          <span className="font-bold text-sm">45%</span>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Voice Assistant Promo */}
           <div onClick={() => { onNavigate('VOICE_ASSISTANT'); triggerHaptic(); }} className="col-span-1 md:col-span-1 row-span-2 glass-panel rounded-[2.5rem] p-6 relative overflow-hidden cursor-pointer group animate-enter delay-200 active:scale-[0.98] transition-all border border-white/10 bg-slate-900/40">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-20 h-full flex flex-col items-center justify-center text-center">
                 <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(6,182,212,0.15)] relative">
                    <div className="absolute inset-0 rounded-full border border-cyan-400/30 animate-[spin_4s_linear_infinite]"></div>
                    <Mic size={32} className="text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]"/>
                 </div>
                 <h3 className="text-lg font-black mb-1">{t.menu_voice}</h3>
                 <p className="text-slate-400 text-xs leading-relaxed mb-4 px-2">Ask about crops or market in your language.</p>
                 <button className="px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/30 w-full flex items-center justify-center gap-2">
                    Start Talk <ArrowUpRight size={14}/>
                 </button>
              </div>
           </div>

           {/* Crop Doctor - Compact Horizontal */}
           <div onClick={() => { onNavigate('DISEASE_DETECTOR'); triggerHaptic(); }} className="col-span-1 row-span-1 glass-panel rounded-[2.5rem] p-5 relative overflow-hidden cursor-pointer group animate-enter delay-300 active:scale-[0.98] transition-all bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-500/20 flex items-center justify-between">
              <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-emerald-500/20 blur-2xl rounded-full"></div>
              <div className="flex flex-col justify-center pl-1 z-10">
                 <h3 className="text-lg font-black text-white tracking-tight">{t.quick_action_doctor}</h3>
                 <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                    AI READY
                 </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 z-10 group-hover:rotate-6 transition-transform">
                 <ScanLine size={24}/>
              </div>
           </div>

            {/* Market (Wide) */}
            <div onClick={() => { onNavigate('MARKET'); triggerHaptic(); }} className="col-span-1 md:col-span-2 lg:col-span-1 row-span-1 glass-panel rounded-[2.5rem] p-5 relative overflow-hidden cursor-pointer group animate-enter delay-300 active:scale-[0.98] transition-all flex flex-col justify-center bg-slate-900/40 border border-white/10">
              <div className="flex justify-between items-center mb-3">
                 <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Store size={18} className="text-purple-400"/>
                    {t.menu_market}
                 </h3>
                 <ChevronRight size={16} className="text-slate-500"/>
              </div>
              <div className="flex gap-3 overflow-hidden">
                 {MOCK_MARKET.slice(0,2).map((m,i) => (
                    <div key={i} className="flex-1 glass-panel rounded-2xl p-2 flex flex-col items-center justify-center text-center bg-white/5 hover:bg-white/10 transition-colors">
                       <span className={`text-[9px] font-bold uppercase mb-1 ${m.color}`}>{m.name}</span>
                       <span className="font-black text-lg text-white">₹{m.price}</span>
                    </div>
                 ))}
              </div>
           </div>

        </div>

        {/* Schemes Carousel */}
        <div className="animate-enter delay-300 pb-24">
           <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Landmark size={20} className="text-fuchsia-400"/> 
                  {t.govt_schemes}
              </h3>
              <button onClick={triggerHaptic} className="text-xs font-bold text-slate-400 bg-white/5 px-3 py-1.5 rounded-full hover:bg-white/10 transition-all">View All</button>
           </div>
           
           <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-6 snap-x snap-mandatory px-2 -mx-2">
              {MOCK_SCHEMES.map(s => (
                 <div onClick={triggerHaptic} key={s.id} className="snap-center shrink-0 w-[85vw] md:w-[280px] h-36 rounded-[2.5rem] relative overflow-hidden cursor-pointer group active:scale-[0.98] transition-all shadow-lg shadow-black/30 border border-white/10">
                    <div className={`absolute inset-0 bg-gradient-to-br ${s.grad} opacity-90`}></div>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                    
                    {/* Decorative Circle */}
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
                    
                    <div className="absolute inset-0 p-6 flex flex-col justify-between text-white z-10">
                       <div className="flex justify-between items-start">
                          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10">
                              <Landmark size={20} className="text-white"/>
                          </div>
                          <span className="bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase border border-white/10 shadow-sm">{s.status}</span>
                       </div>
                       <div>
                          <h4 className="text-xl font-black leading-tight tracking-tight">{s.title}</h4>
                          <p className="text-white/80 font-medium text-xs mt-1">{s.sub}</p>
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
};

// 4. Immersive "Orb" Voice Assistant (Fullscreen Mobile 100dvh)
const VoiceAssistant = ({ lang, user, onBack }: any) => {
  const t = TRANSLATIONS[lang];
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const orbRef = useRef<HTMLDivElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  
  useEffect(() => { 
      return () => cleanup(); 
  }, []);

  const cleanup = () => {
    if(sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
    }
    if(audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    if(inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }
    if(animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
    }
    setStatus('idle');
  };

  const visualize = () => {
      if(!analyserRef.current || !orbRef.current) return;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      let sum = 0;
      for(let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      
      const scale = 1 + (avg / 40); 
      const opacity = 0.5 + (avg / 255);
      
      orbRef.current.style.transform = `scale(${scale})`;
      orbRef.current.style.opacity = `${opacity}`;
      orbRef.current.style.boxShadow = `0 0 ${avg * 2}px rgba(34, 211, 238, 0.6)`; 

      animationFrameRef.current = requestAnimationFrame(visualize);
  };

  const connect = async () => {
    if(status === 'connecting' || status === 'connected') return;
    triggerHaptic();
    setStatus('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { sampleRate: 16000, echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = ctx;
      nextStartTimeRef.current = ctx.currentTime;
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      analyser.connect(ctx.destination);
      
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      inputAudioContextRef.current = inputCtx;
      const inputSource = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      
      inputSource.connect(processor);
      processor.connect(inputCtx.destination);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: { 
            responseModalities: [Modality.AUDIO], 
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
            systemInstruction: `You are AI Krushi Mitra, a friendly and helpful Indian farming assistant.`
        },
        callbacks: {
           onopen: () => { 
              setStatus('connected'); 
              triggerHaptic();
              visualize(); 
           },
           onmessage: async (msg) => {
              const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audioData) {
                 const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
                 const source = ctx.createBufferSource();
                 source.buffer = buffer;
                 source.connect(analyser);
                 
                 const currentTime = ctx.currentTime;
                 if (nextStartTimeRef.current < currentTime) {
                     nextStartTimeRef.current = currentTime;
                 }
                 source.start(nextStartTimeRef.current);
                 nextStartTimeRef.current += buffer.duration;
              }
           },
           onclose: () => cleanup(),
           onerror: (err) => cleanup()
        }
      });
      
      sessionRef.current = await sessionPromise;
      
      processor.onaudioprocess = (e) => {
         if(!sessionRef.current) return;
         const inputData = e.inputBuffer.getChannelData(0);
         const blob = createPCMChunk(inputData);
         sessionRef.current.sendRealtimeInput({ media: blob });
      };

    } catch(e) { cleanup(); }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden h-[100dvh] w-full">
       {/* Cosmic Background */}
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-black to-black"></div>
       <div className="absolute top-[-20%] left-[-20%] w-[80vw] h-[80vw] bg-purple-600/20 blur-[100px] rounded-full"></div>
       <div className="absolute bottom-[-20%] right-[-20%] w-[80vw] h-[80vw] bg-cyan-600/20 blur-[100px] rounded-full"></div>

       {/* Top Bar */}
       <div className="absolute top-0 w-full p-6 pt-safe-top flex justify-between items-center z-50">
          <button onClick={() => { onBack(); triggerHaptic(); }} className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-90"><ArrowLeft/></button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel">
             <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]' : 'bg-red-500'}`}></div>
             <span className="text-xs font-bold text-white uppercase tracking-widest">{status === 'connected' ? 'Live' : 'Offline'}</span>
          </div>
       </div>

       {/* The ORB - Central Hero */}
       <div className="relative z-10 flex-1 flex items-center justify-center w-full">
          <div className="relative w-72 h-72 flex items-center justify-center">
             {status === 'connected' && (
                <>
                   <div className="absolute inset-0 rounded-full border border-cyan-500/30 scale-[1.3] animate-[spin_10s_linear_infinite]"></div>
                   <div className="absolute inset-0 rounded-full border border-purple-500/20 scale-[1.6] animate-[spin_15s_linear_infinite_reverse]"></div>
                   <div ref={orbRef} className="absolute inset-0 bg-cyan-500/30 rounded-full blur-3xl transition-transform duration-75 ease-out will-change-transform mix-blend-screen"></div>
                </>
             )}
             
             <button onClick={status === 'connected' ? cleanup : connect} className="relative z-20 w-40 h-40 rounded-full bg-black/50 border border-white/10 flex items-center justify-center shadow-[0_0_50px_rgba(79,70,229,0.3)] group transition-all duration-500 active:scale-95 touch-manipulation backdrop-blur-xl">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {status === 'connecting' ? <Loader2 size={48} className="text-cyan-500 animate-spin"/> : <Mic size={48} className={`transition-colors ${status === 'connected' ? 'text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,1)]' : 'text-slate-400 group-hover:text-white'}`}/>}
             </button>
          </div>
       </div>

       {/* Text */}
       <div className="mb-safe-bottom pb-12 text-center z-10 px-8 animate-enter delay-100">
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-4 tracking-tight">
             {status === 'connected' ? "I'm listening..." : t.voice_title}
          </h2>
          <p className="text-slate-400 text-lg max-w-xs mx-auto leading-relaxed">
             {status === 'connected' ? "Go ahead, ask me anything." : t.voice_desc}
          </p>
       </div>
    </div>
  );
};

// 5. Crop Doctor (Camera View)
const DiseaseDetector = ({ lang, onBack }: any) => {
  const t = TRANSLATIONS[lang];
  const [img, setImg] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: any) => {
     if(e.target.files?.[0]) {
        const reader = new FileReader();
        reader.onload = (ev) => {
           setImg(ev.target?.result as string);
           setAnalyzing(true);
           triggerHaptic();
           analyzeCropDisease(ev.target?.result as string, lang).then(res => {
              setResult(res);
              setAnalyzing(false);
              triggerHaptic();
           });
        }
        reader.readAsDataURL(e.target.files[0]);
     }
  };

  return (
    <div className="h-[100dvh] bg-black text-white flex flex-col overflow-hidden fixed inset-0 z-[200] w-full">
       <div className="p-5 pt-safe-top flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full pointer-events-none">
          <button onClick={() => { onBack(); triggerHaptic(); }} className="w-12 h-12 rounded-full glass-panel flex items-center justify-center active:scale-90 transition-all pointer-events-auto"><ArrowLeft/></button>
          <span className="font-mono text-[10px] text-emerald-400 tracking-[0.2em] uppercase glass-panel px-4 py-1.5 rounded-full">AI SCANNER</span>
          <div className="w-12"></div>
       </div>

       <div className="flex-1 relative flex flex-col items-center justify-center bg-black">
          {!img ? (
             <div onClick={() => { inputRef.current?.click(); triggerHaptic(); }} className="w-full h-full flex flex-col items-center justify-center cursor-pointer active:opacity-90 transition-opacity relative group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1),transparent)] opacity-40 group-hover:opacity-60 transition-opacity"></div>
                {/* Guidelines */}
                <div className="absolute w-64 h-64 border border-white/20 rounded-3xl">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 -mt-1 -ml-1 rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 -mt-1 -mr-1 rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 -mb-1 -ml-1 rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 -mb-1 -mr-1 rounded-br-xl"></div>
                </div>

                <div className="text-center z-10 relative mt-80">
                   <p className="font-bold text-2xl mb-2 drop-shadow-md tracking-tight">{t.take_photo}</p>
                   <p className="text-white/60 text-sm drop-shadow-md">Tap screen to capture</p>
                </div>

                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
             </div>
          ) : (
             <div className="w-full h-full relative flex flex-col">
                <div className="relative flex-1 overflow-hidden bg-black">
                   <img src={img} className="w-full h-full object-contain" />
                   {analyzing && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center z-20">
                         <div className="w-full h-1 bg-emerald-500 absolute top-1/2 animate-[scan_2s_ease-in-out_infinite] shadow-[0_0_30px_#10b981]"></div>
                         <div className="bg-black/40 px-6 py-3 rounded-2xl backdrop-blur-xl border border-white/10 flex flex-col items-center mt-32">
                             <Loader2 className="animate-spin text-emerald-400 mb-2" size={32}/>
                             <p className="font-mono text-emerald-400 text-xs tracking-widest">ANALYZING CROP...</p>
                         </div>
                      </div>
                   )}
                   <button onClick={() => { setImg(null); setResult(null); triggerHaptic(); }} className="absolute top-24 right-5 bg-black/50 p-3 rounded-full text-white backdrop-blur-md z-30 border border-white/20"><X/></button>
                </div>
                
                {result && !analyzing && (
                   <div className="absolute bottom-0 inset-x-0 bg-[#0a0a0a]/95 backdrop-blur-2xl rounded-t-[2.5rem] p-6 border-t border-white/10 animate-enter max-h-[70vh] overflow-y-auto pb-safe-bottom shadow-[0_-20px_60px_rgba(0,0,0,0.8)] z-30">
                      <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6"></div>
                      <div className="flex items-center gap-3 mb-6">
                         <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                             <CheckCircle2 size={24}/>
                         </div>
                         <div>
                             <h3 className="font-black text-xl text-white">Analysis Report</h3>
                             <p className="text-emerald-400 text-xs font-bold uppercase">Confidence: 98%</p>
                         </div>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-5 border border-white/5 mb-6">
                          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">{result}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                         <Button variant="secondary" onClick={triggerHaptic} icon={<Share2 size={18}/>}>Share</Button>
                         <Button variant="glow" onClick={triggerHaptic} icon={<Save size={18}/>}>Save</Button>
                      </div>
                   </div>
                )}
             </div>
          )}
          
          {/* Shutter Button (Bottom Fixed) */}
          {!img && (
              <div className="absolute bottom-10 inset-x-0 flex justify-center z-20 pb-safe-bottom pointer-events-none">
                  <button onClick={() => { inputRef.current?.click(); triggerHaptic(); }} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/10 backdrop-blur-sm active:scale-90 transition-transform pointer-events-auto shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                      <div className="w-16 h-16 bg-white rounded-full"></div>
                  </button>
              </div>
          )}
       </div>
    </div>
  );
};

// 6. Simple Page Layout
const SimpleView = ({ title, children, onBack }: any) => (
  <div className="h-full w-full flex flex-col lg:pl-32 lg:pt-6 lg:pr-6">
     <div className="px-5 py-4 pt-safe-top flex items-center gap-4 sticky top-0 z-20 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <button onClick={() => { onBack(); triggerHaptic(); }} className="w-10 h-10 rounded-full glass-panel flex items-center justify-center active:scale-90 transition-all text-white"><ArrowLeft size={20}/></button>
        <h1 className="text-xl font-black text-white tracking-tight">{title}</h1>
     </div>
     <div className="flex-1 overflow-y-auto hide-scrollbar p-5 pb-32 max-w-5xl mx-auto w-full">
        {children}
     </div>
  </div>
);

// --- APP ROOT ---
const App = () => {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [lang, setLang] = useState<Language>('mr');
  const [user] = useState<UserProfile>({ name: "Suresh Patil", village: "Satara", district: "Satara", landSize: "5 Acres", crop: "Soyabean" });

  const getView = () => {
    switch(view) {
       case 'DASHBOARD': return <Dashboard lang={lang} user={user} onNavigate={setView} />;
       case 'VOICE_ASSISTANT': return <VoiceAssistant lang={lang} user={user} onBack={() => setView('DASHBOARD')} />;
       case 'DISEASE_DETECTOR': return <DiseaseDetector lang={lang} onBack={() => setView('DASHBOARD')} />;
       case 'MARKET': 
         return <SimpleView title={TRANSLATIONS[lang].market_title} onBack={() => setView('DASHBOARD')}>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2">{MOCK_MARKET.map((m,i) => (
               <div key={i} onClick={triggerHaptic} className="glass-panel p-4 rounded-2xl flex items-center justify-between animate-enter active:scale-[0.98] transition-all bg-white/5 hover:border-cyan-500/30" style={{animationDelay: `${i*100}ms`}}>
                  <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-xl ${m.bg} flex items-center justify-center shadow-inner`}><m.icon size={24} className={m.color}/></div>
                     <div><h3 className="font-bold text-lg text-white">{m.name}</h3><p className="text-slate-400 text-xs font-bold">₹{m.price}/qt</p></div>
                  </div>
                  <span className={`font-black text-lg ${m.trend.includes('+') ? 'text-green-400' : 'text-red-400'}`}>{m.trend}</span>
               </div>
            ))}</div></SimpleView>;
       case 'WEATHER':
         return <SimpleView title={TRANSLATIONS[lang].weather_title} onBack={() => setView('DASHBOARD')}>
            <div onClick={triggerHaptic} className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-8 rounded-[2.5rem] text-center mb-6 shadow-2xl shadow-indigo-500/30 animate-enter relative overflow-hidden border border-white/10 active:scale-[0.99] transition-transform">
               <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-400/30 blur-3xl rounded-full"></div>
               <Sun size={80} className="mx-auto mb-4 text-amber-300 animate-[spin_20s_linear_infinite] drop-shadow-[0_0_20px_rgba(253,224,71,0.5)]"/>
               <h2 className="text-8xl font-black mb-1 tracking-tighter">28°</h2>
               <p className="text-xl font-bold opacity-90">Sunny Day • Satara</p>
            </div>
         </SimpleView>;
       default: return <Dashboard lang={lang} user={user} onNavigate={setView} />;
    }
  };

  return (
    <div className="flex h-[100dvh] w-full font-sans bg-transparent text-slate-100 selection:bg-cyan-500/30">
       {view !== 'VOICE_ASSISTANT' && <Sidebar view={view} setView={setView} lang={lang} />}
       <main className="flex-1 h-full relative z-0 w-full max-w-[100vw] overflow-hidden">
          {getView()}
       </main>
       {view !== 'VOICE_ASSISTANT' && <MobileNav view={view} setView={setView} />}
    </div>
  );
};

export default App;
