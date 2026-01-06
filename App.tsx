
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Language, UserProfile, ChatMessage, BlogPost, BlogSection, FAQ } from './types';
import { TRANSLATIONS } from './constants';
import { 
  Sprout, CloudSun, ScanLine, Mic, Droplets, ArrowLeft, User, Home, Store, 
  Wind, Camera, X, Send, Wheat, Sun, MapPin, Calendar, ArrowUpRight, 
  Landmark, CalendarClock, Newspaper, Radio, BookOpen, Info, Bookmark, 
  Share2, MessageSquare, TrendingUp, AlertTriangle, ChevronRight, 
  CheckCircle2, Activity, Zap, Leaf, Loader2, Gauge, Thermometer, Droplet,
  Volume2, VolumeX, UserCircle, Clock, Facebook, Twitter, MessageCircle,
  Search, Menu, MoreVertical, AudioLines, MicOff, Waves, Download, Play, Pause, Save, History, RefreshCw,
  Settings, HelpCircle, Info as InfoIcon, Timer, Sparkles, Mic2, Bell, ShieldCheck, 
  CloudRain, Zap as Lightning, Sunrise, Sunset, Globe, Lightbulb
} from 'lucide-react';
import { Button } from './components/Button';
import { getAIFarmingAdvice, analyzeCropDisease } from './services/geminiService';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from '@google/genai';

// --- AUDIO HELPERS ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createPCMChunk(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const getLangCode = (lang: Language) => {
  switch (lang) {
    case 'mr': return 'mr-IN';
    case 'hi': return 'hi-IN';
    case 'en': return 'en-US';
    default: return 'en-US';
  }
};

const speak = (text: string, lang: Language, onEnd?: () => void) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = getLangCode(lang);
  utterance.rate = 0.9;
  utterance.pitch = 1.0; 
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
};

// --- MOCK CONTENT ---
const MOCK_BLOGS: BlogPost[] = [
  {
    id: 'smart-farming-2025',
    title: 'Smart Farming Tools 2025: आधुनिक तंत्रज्ञानाचा वापर',
    category: 'तंत्रज्ञान',
    date: 'April 27, 2025',
    author: 'AI Krushi Mitra',
    image: 'https://images.unsplash.com/photo-1594398901394-4e34939a4fd0?q=80&w=1200',
    intro: 'भारतीय शेतीला सुधारण्याच्या दिशेने विविध तंत्रज्ञानांचा वापर होऊ लागला आहे. या लेखामध्ये आपण पाहणार आहोत की कशी आधुनिक यंत्रे शेतकऱ्यांचे काम सोपे करत आहेत.',
    sections: [
      {
        heading: 'ड्रोन: शेतीचा नवा डोळा',
        content: 'ड्रोन तंत्रज्ञानामुळे फवारणी आणि पिकांच्या आरोग्याची देखरेख करणे कमालीचे सोपे झाले आहे.',
        image: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=1200'
      }
    ],
    conclusion: 'भविष्य हे स्मार्ट शेतीचेच आहे.'
  }
];

const MOCK_MARKET_DATA = [
  { name: 'Soyabean', price: 4850, trend: '+120', arrival: '1200 Qt', color: 'text-emerald-500' },
  { name: 'Cotton (Kapas)', price: 7200, trend: '-50', arrival: '850 Qt', color: 'text-rose-500' },
  { name: 'Tur (Pigeon Pea)', price: 10400, trend: '+300', arrival: '400 Qt', color: 'text-emerald-500' },
  { name: 'Wheat', price: 2450, trend: '+10', arrival: '2200 Qt', color: 'text-emerald-500' },
  { name: 'Onion', price: 1800, trend: '-200', arrival: '5000 Qt', color: 'text-rose-500' }
];

const MOCK_SCHEMES = [
  { id: 1, title: 'PM-Kisan Samman Nidhi', benefit: '₹6,000 yearly', deadline: 'Open', image: 'https://images.unsplash.com/photo-1590682680393-024294026367?q=80&w=600' },
  { id: 2, title: 'Pradhan Mantri Fasal Bima', benefit: 'Crop Insurance', deadline: '31 Aug 2025', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=600' },
  { id: 3, title: 'Drip Irrigation Subsidy', benefit: '80% Subsidy', deadline: 'Ongoing', image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=600' }
];

// --- UI COMPONENTS ---

const Header = ({ onBack, title, rightAction }: { onBack?: () => void, title?: string, rightAction?: React.ReactNode }) => (
  <header className="sticky top-0 z-[60] glass-card px-6 py-4 flex items-center justify-between border-b border-slate-200/50">
    <div className="flex items-center gap-4">
      {onBack && (
        <button onClick={onBack} className="p-2.5 bg-slate-100/80 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-90">
          <ArrowLeft size={20}/>
        </button>
      )}
      <span className="text-xl font-black italic tracking-tighter">
        <span className="text-emerald-600">AI Krushi</span>
        <span className="text-slate-900"> Mitra</span>
      </span>
    </div>
    <div className="flex items-center gap-3">
      {rightAction}
    </div>
  </header>
);

const MarketView = ({ lang, onBack }: any) => {
  const t = TRANSLATIONS[lang];
  return (
    <div className="h-full bg-slate-50 overflow-y-auto pb-32 animate-slide-up">
       <Header onBack={onBack} />
       <div className="p-6 max-w-4xl mx-auto space-y-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-10 rounded-[3rem] shadow-2xl">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
             <div className="relative z-10">
                <h2 className="text-4xl font-black mb-2 tracking-tighter">{t.market_rate}</h2>
                <div className="flex items-center gap-2 font-bold opacity-80 bg-white/10 w-fit px-4 py-1.5 rounded-full backdrop-blur-sm">
                   <Calendar size={16}/> {t.today}: 27 April, 2025
                </div>
             </div>
          </div>

          <div className="grid gap-5">
             {MOCK_MARKET_DATA.map((item, idx) => (
               <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
                  <div className="flex items-center gap-5">
                     <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                        <Wheat size={28}/>
                     </div>
                     <div>
                        <h4 className="text-xl font-black text-slate-800 tracking-tight">{item.name}</h4>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.2em] mt-1">{t.arrival}: {item.arrival}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <div className="text-2xl font-black text-slate-900 tracking-tight">₹{item.price.toLocaleString()}</div>
                     <div className={`text-sm font-bold flex items-center justify-end gap-1 mt-1 ${item.color}`}>
                        {item.trend.startsWith('+') ? <TrendingUp size={16}/> : <TrendingUp size={16} className="rotate-180"/>}
                        {item.trend}
                     </div>
                  </div>
               </div>
             ))}
          </div>
       </div>
    </div>
  );
};

const WeatherView = ({ lang, onBack }: any) => {
  const t = TRANSLATIONS[lang];
  return (
    <div className="h-full bg-slate-50 overflow-y-auto pb-32 animate-slide-up">
       <Header onBack={onBack} />
       <div className="p-6 max-w-4xl mx-auto space-y-8">
          <div className="bg-gradient-to-br from-sky-400 to-indigo-600 p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full -mr-20 -mt-20 blur-[80px] group-hover:scale-110 transition-transform duration-1000"></div>
             <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                <div>
                   <div className="flex items-center gap-2 text-sm font-black opacity-80 uppercase tracking-[0.2em] mb-4">
                      <MapPin size={16}/> Baramati, Maharashtra
                   </div>
                   <div className="flex items-center gap-6">
                      <h2 className="text-9xl font-black tracking-tighter">28°</h2>
                      <div className="space-y-1">
                         <div className="text-3xl font-black">Sunny</div>
                         <div className="text-lg opacity-80 font-bold">निरभ्र आकाश</div>
                      </div>
                   </div>
                </div>
                <div className="flex flex-wrap gap-4">
                   <div className="glass-card bg-white/10 p-5 rounded-3xl flex flex-col items-center gap-2">
                      <Droplets className="text-sky-200"/>
                      <span className="font-black text-xl">45%</span>
                      <span className="text-[10px] font-bold uppercase opacity-60">Humidity</span>
                   </div>
                   <div className="glass-card bg-white/10 p-5 rounded-3xl flex flex-col items-center gap-2">
                      <Wind className="text-indigo-200"/>
                      <span className="font-black text-xl">12kph</span>
                      <span className="text-[10px] font-bold uppercase opacity-60">Wind</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex items-center gap-8 group">
             <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/5">
                <ShieldCheck size={40}/>
             </div>
             <div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">{t.spray_advice}</h3>
                <p className="text-lg text-slate-500 font-medium leading-relaxed">
                   {lang === 'mr' ? 'आरं पाटील, आज फवारणीसाठी लय भारी हवा आहे. वारा कमी आहे आणि पाऊस पण नाहीये. नक्की फायदा होईल!' : t.safe_to_spray}
                </p>
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {[
               { day: 'Mon', temp: '29°', icon: Sun, label: 'Sunny' },
               { day: 'Tue', temp: '27°', icon: CloudSun, label: 'Cloudy' },
               { day: 'Wed', temp: '25°', icon: CloudRain, label: 'Rain' },
               { day: 'Thu', temp: '28°', icon: Lightning, label: 'Storm' },
             ].map((day, i) => (
               <div key={i} className="bg-white p-6 rounded-3xl text-center border border-slate-100 hover:border-emerald-300 transition-all hover:shadow-lg">
                  <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-4">{day.day}</p>
                  <day.icon className="mx-auto text-sky-500 mb-4" size={32}/>
                  <p className="text-2xl font-black text-slate-800">{day.temp}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{day.label}</p>
               </div>
             ))}
          </div>
       </div>
    </div>
  );
};

// --- SCHEMES VIEW ---
const SchemesView = ({ lang, onBack }: { lang: Language, onBack: () => void }) => {
  const t = TRANSLATIONS[lang];
  return (
    <div className="h-full bg-slate-50 overflow-y-auto pb-32 animate-slide-up">
       <Header onBack={onBack} />
       <div className="p-6 max-w-4xl mx-auto space-y-8">
          <div className="bg-slate-900 text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-20 -mt-20 blur-[80px]"></div>
             <div className="relative z-10">
                <h2 className="text-4xl font-black mb-2 tracking-tighter">{t.schemes}</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Government Benefits for Farmers</p>
             </div>
          </div>

          <div className="grid gap-6">
             {MOCK_SCHEMES.map((scheme) => (
               <div key={scheme.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 group hover:border-emerald-500 hover:shadow-xl transition-all duration-500">
                  <div className="flex flex-col md:flex-row">
                     <div className="md:w-64 h-48 overflow-hidden">
                        <img src={scheme.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={scheme.title} />
                     </div>
                     <div className="p-8 flex-1 flex flex-col justify-between">
                        <div>
                           <div className="flex justify-between items-start mb-4">
                              <h3 className="text-2xl font-black text-slate-900 leading-tight">{scheme.title}</h3>
                              <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">{scheme.deadline}</span>
                           </div>
                           <p className="text-slate-500 font-bold flex items-center gap-2 mb-6">
                              <Zap className="text-amber-500" size={18}/> {scheme.benefit}
                           </p>
                        </div>
                        <Button variant="outline" size="sm" className="w-fit">{t.apply}</Button>
                     </div>
                  </div>
               </div>
             ))}
          </div>
       </div>
    </div>
  );
};

// --- AGRI BLOG ---
const AgriBlog = ({ lang, onBack }: { lang: Language, onBack: () => void }) => {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  return (
    <div className="h-full bg-slate-50 overflow-y-auto pb-32 animate-slide-up">
       <Header onBack={selectedPost ? () => setSelectedPost(null) : onBack} />
       {!selectedPost ? (
         <div className="p-8 max-w-7xl mx-auto space-y-12">
           <div className="flex flex-col md:flex-row justify-between items-end gap-6">
              <div>
                 <h2 className="text-5xl font-black tracking-tighter text-slate-900 mb-2">शेतीचा ज्ञानकोश</h2>
                 <p className="text-slate-500 font-bold">नवीन तंत्रज्ञान आणि प्रयोगांची माहिती</p>
              </div>
              <div className="flex gap-2">
                 {['नवीन', 'लोकप्रिय', 'तंत्रज्ञान'].map(tag => (
                   <span key={tag} className="px-5 py-2.5 bg-white rounded-2xl border border-slate-200 text-sm font-bold cursor-pointer hover:bg-emerald-600 hover:text-white transition-colors">
                     {tag}
                   </span>
                 ))}
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {MOCK_BLOGS.map(post => (
               <div key={post.id} onClick={() => setSelectedPost(post)} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 cursor-pointer group hover:-translate-y-3 hover:shadow-2xl transition-all duration-500">
                  <div className="h-64 overflow-hidden relative">
                    <img src={post.image} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt={post.title} />
                    <div className="absolute top-4 left-4 px-4 py-2 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">{post.category}</div>
                  </div>
                  <div className="p-8 space-y-4">
                     <h3 className="text-2xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors leading-tight">{post.title}</h3>
                     <p className="text-slate-500 font-medium line-clamp-2 leading-relaxed">{post.intro}</p>
                     <div className="flex items-center gap-3 pt-4 border-t border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <UserCircle size={16}/> {post.author} • <Clock size={16}/> {post.date}
                     </div>
                  </div>
               </div>
             ))}
           </div>
         </div>
       ) : (
         <div className="max-w-4xl mx-auto bg-white min-h-screen p-8 md:p-16 space-y-12 animate-in fade-in zoom-in duration-500">
            <div className="space-y-6">
               <span className="px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase tracking-widest inline-block">{selectedPost.category}</span>
               <h1 className="text-5xl md:text-7xl font-black leading-[1.1] text-slate-900 tracking-tighter">{selectedPost.title}</h1>
               <div className="flex items-center gap-6 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                  <span className="flex items-center gap-2"><User size={14}/> {selectedPost.author}</span>
                  <span className="flex items-center gap-2"><Calendar size={14}/> {selectedPost.date}</span>
               </div>
            </div>
            
            <img src={selectedPost.image} className="w-full h-[500px] object-cover rounded-[3.5rem] shadow-2xl" alt="Post" />
            
            <div className="prose prose-xl prose-emerald max-w-none">
               <p className="text-2xl leading-relaxed text-slate-600 italic font-medium border-l-8 border-emerald-500 pl-8 mb-12">{selectedPost.intro}</p>
               {selectedPost.sections.map((s, i) => (
                 <div key={i} className="space-y-8 mb-16">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">{s.heading}</h2>
                    <p className="text-xl leading-relaxed text-slate-500 font-medium">{s.content}</p>
                    {s.image && <img src={s.image} className="w-full rounded-[3rem] shadow-xl" alt="Section" />}
                 </div>
               ))}
            </div>

            <div className="bg-slate-900 text-white p-12 rounded-[3.5rem] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl"></div>
               <h3 className="text-3xl font-black mb-6 flex items-center gap-3"><Lightbulb className="text-amber-400"/> निष्कर्ष</h3>
               <p className="text-xl font-medium text-slate-300 leading-relaxed italic">{selectedPost.conclusion}</p>
               <button className="mt-10 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-500 transition-colors flex items-center gap-3">
                  लेख शेअर करा <Share2 size={18}/>
               </button>
            </div>
         </div>
       )}
    </div>
  );
};

// --- VOICE ASSISTANT ---
const VoiceAssistant = ({ lang, user, onBack }: { lang: Language, user: UserProfile, onBack: () => void }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userTranscription, setUserTranscription] = useState('');
  const [aiTranscription, setAiTranscription] = useState('');
  const [timer, setTimer] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<any>(null);
  const shouldBeActiveRef = useRef<boolean>(false);
  const timerRef = useRef<any>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, userTranscription, aiTranscription]);

  useEffect(() => {
    if (isActive) timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);
    else { clearInterval(timerRef.current); setTimer(0); }
    return () => clearInterval(timerRef.current);
  }, [isActive]);

  const stopSession = () => {
    shouldBeActiveRef.current = false;
    if (sessionRef.current) { 
        try {
            sessionRef.current.close(); 
        } catch (e) {
            console.error("Error closing session:", e);
        }
        sessionRef.current = null; 
    }
    
    // Stop microphone stream tracks
    if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
    }

    if (audioContextInRef.current) {
        try { audioContextInRef.current.close(); } catch(e) {}
        audioContextInRef.current = null;
    }
    if (audioContextOutRef.current) {
        try { audioContextOutRef.current.close(); } catch(e) {}
        audioContextOutRef.current = null;
    }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setIsActive(false);
    setIsConnecting(false);
  };

  const startSession = async (isRetry = false) => {
    shouldBeActiveRef.current = true;
    setIsConnecting(true);
    
    try {
      if (!process.env.API_KEY) {
          throw new Error("API Key is missing");
      }

      // Explicitly request microphone permission first to handle errors
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
      } catch (err: any) {
        console.error("Microphone permission error:", err);
        let errorMsg = "Microphone access denied. Please check your permissions.";
        if (err.name === 'NotAllowedError') errorMsg = "You denied microphone permission. Please allow it in browser settings.";
        else if (err.name === 'NotFoundError') errorMsg = "No microphone found on this device.";
        alert(errorMsg);
        setIsConnecting(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctxIn = new AudioContextClass({ sampleRate: 16000 });
      const ctxOut = new AudioContextClass({ sampleRate: 24000 });
      
      audioContextInRef.current = ctxIn;
      audioContextOutRef.current = ctxOut;

      const sourceMic = ctxIn.createMediaStreamSource(stream);
      const scriptProcessor = ctxIn.createScriptProcessor(4096, 1, 1);

      // Create a gain node with 0 gain to mute local feedback while keeping the graph active
      const muteGain = ctxIn.createGain();
      muteGain.gain.value = 0;

      sourceMic.connect(scriptProcessor);
      scriptProcessor.connect(muteGain);
      muteGain.connect(ctxIn.destination);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          systemInstruction: lang === 'mr' ? `तू 'AI कृषी मित्र' आहेस. अस्सल ग्रामीण मराठमोळी भाषा वापर. पिकाबद्दल ${user.crop} वर चर्चा कर.` : `You are AI Krushi Mitra. Speak in a native warm tone about ${user.crop}.`,
          outputAudioTranscription: {},
          inputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            console.log("Session opened");
            setIsActive(true); 
            setIsConnecting(false);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (!shouldBeActiveRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPCMChunk(inputData);
              sessionPromise.then(s => s?.sendRealtimeInput({ media: pcmBlob }));
            };
          },
          onmessage: async (msg) => {
            if (msg.serverContent?.outputTranscription) setAiTranscription(prev => prev + msg.serverContent!.outputTranscription!.text);
            if (msg.serverContent?.inputTranscription) setUserTranscription(prev => prev + msg.serverContent!.inputTranscription!.text);
            if (msg.serverContent?.turnComplete) {
              setMessages(p => [...p, { id: `u-${Date.now()}`, role: 'user', text: userTranscription, timestamp: new Date() }, { id: `a-${Date.now()}`, role: 'model', text: aiTranscription, timestamp: new Date() }]);
              setUserTranscription(''); setAiTranscription('');
            }
            const base64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64 && audioContextOutRef.current) {
              setIsSpeaking(true);
              const audioBuffer = await decodeAudioData(decode(base64), audioContextOutRef.current, 24000, 1);
              const source = audioContextOutRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContextOutRef.current.destination);
              source.onended = () => { sourcesRef.current.delete(source); if (sourcesRef.current.size === 0) setIsSpeaking(false); };
              source.start(); sourcesRef.current.add(source);
            }
          },
          onerror: (err) => { 
              console.error("Session error:", err);
              if (shouldBeActiveRef.current) {
                  // alert("Connection interrupted. Retrying...");
                  // Optional: Retry logic
              }
          },
          onclose: () => { 
              console.log("Session closed");
              if (shouldBeActiveRef.current) {
                  setIsActive(false); 
              }
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (error: any) { 
        console.error("Start session failed:", error);
        alert(`Could not start voice session: ${error.message}`);
        setIsConnecting(false); 
        stopSession();
    }
  };

  return (
    <div className="h-full bg-slate-950 flex flex-col relative overflow-hidden">
       {/* Background Animated Blobs */}
       <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-600/30 rounded-full blur-[120px] animate-blob"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-sky-600/20 rounded-full blur-[100px] animate-blob delay-300"></div>
       </div>

       <div className="relative z-10 glass-dark p-6 flex justify-between items-center">
          <button onClick={onBack} className="p-3 bg-white/5 rounded-2xl text-white hover:bg-white/10 transition-colors"><ArrowLeft/></button>
          <div className="text-center">
             <h2 className="text-white font-black text-xl tracking-tight">Krushi AI Voice</h2>
             <div className="flex items-center gap-2 justify-center mt-1">
                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-rose-500 animate-pulse' : 'bg-slate-600'}`}></div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{isActive ? 'Listening' : 'Ready'}</span>
             </div>
          </div>
          <div className="w-12 h-12 flex items-center justify-center font-mono font-black text-emerald-400 bg-white/5 rounded-2xl border border-white/10">
             {Math.floor(timer/60)}:{timer%60 < 10 ? '0'+timer%60 : timer%60}
          </div>
       </div>

       <div className="relative z-10 flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
          {messages.length === 0 && !userTranscription && !aiTranscription && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-1000">
               <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
                  <div className="w-32 h-32 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30 relative">
                     <Mic2 size={64} className="text-emerald-500 animate-float"/>
                  </div>
               </div>
               <div className="space-y-2">
                  <h3 className="text-4xl font-black text-white tracking-tighter">राम राम पाटील!</h3>
                  <p className="text-slate-500 text-lg font-bold">विचारा काहीही, मी ऐकतोय...</p>
               </div>
            </div>
          )}

          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
               <div className={`max-w-[85%] p-6 rounded-[2.5rem] ${m.role === 'user' ? 'bg-emerald-600 text-white shadow-2xl shadow-emerald-900/40' : 'glass-dark text-white border-white/5'}`}>
                  <p className="text-lg font-bold leading-relaxed">{m.text}</p>
               </div>
            </div>
          ))}

          {(userTranscription || aiTranscription) && (
            <div className="space-y-4">
              {userTranscription && (
                <div className="flex justify-end animate-in fade-in slide-in-from-right-10">
                   <div className="max-w-[80%] p-6 rounded-[2.5rem] bg-emerald-900/40 text-emerald-200 italic border-r-8 border-emerald-500">
                      {userTranscription}...
                   </div>
                </div>
              )}
              {aiTranscription && (
                <div className="flex justify-start animate-in fade-in slide-in-from-left-10">
                   <div className="max-w-[80%] p-6 rounded-[2.5rem] glass-dark text-white/60 italic border-l-8 border-emerald-500 flex items-center gap-4">
                      <div className="flex gap-1">
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-100"></div>
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-200"></div>
                      </div>
                      {aiTranscription}...
                   </div>
                </div>
              )}
            </div>
          )}
          <div ref={scrollRef} />
       </div>

       <div className="relative z-10 p-12 bg-gradient-to-t from-black via-black/80 to-transparent">
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-10">
             {isActive && (
               <div className="flex items-center gap-2 h-20 w-full justify-center">
                  {[...Array(24)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1.5 rounded-full bg-emerald-500 transition-all duration-300 ${isSpeaking ? 'h-full animate-pulse' : 'h-1/4 animate-bounce'}`} 
                      style={{ animationDelay: `${i * 0.04}s` }}
                    ></div>
                  ))}
               </div>
             )}
             <button 
               onClick={isActive ? stopSession : () => startSession()}
               className={`group relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-rose-500 scale-110 shadow-[0_0_50px_rgba(244,63,94,0.4)]' : 'bg-emerald-600 hover:scale-110 shadow-[0_0_30px_rgba(16,185,129,0.3)]'}`}
             >
                <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${isActive ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                {isActive ? <MicOff size={40} className="text-white"/> : isConnecting ? <RefreshCw size={40} className="text-white animate-spin"/> : <Mic size={40} className="text-white"/>}
             </button>
          </div>
       </div>
    </div>
  );
};

// --- DISEASE DETECTOR ---
const DiseaseDetector = ({ lang, onBack }: { lang: Language, onBack: () => void }) => {
  const t = TRANSLATIONS[lang];
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImage(base64); setLoading(true);
      const analysis = await analyzeCropDisease(base64, lang);
      setResult(analysis); setLoading(false);
      speak(analysis, lang);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-full bg-slate-50 overflow-y-auto pb-32 animate-slide-up">
       <Header onBack={onBack} />
       <div className="p-8 max-w-4xl mx-auto space-y-10">
          {!image ? (
            <div onClick={() => fileInputRef.current?.click()} className="aspect-video bg-white border-4 border-dashed border-slate-200 rounded-[3.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 hover:border-emerald-500 group transition-all duration-500 shadow-xl shadow-slate-200/50">
               <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-8 group-hover:scale-110 transition-transform shadow-inner">
                  <Camera size={44}/>
               </div>
               <h3 className="text-3xl font-black text-slate-800 tracking-tight">{t.upload_photo}</h3>
               <p className="mt-2 text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Analyze crop health instantly</p>
               <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleCapture} />
            </div>
          ) : (
            <div className="space-y-10">
               <div className="relative rounded-[3.5rem] overflow-hidden shadow-2xl border-[10px] border-white group">
                  <img src={image} className="w-full h-auto" alt="Crop" />
                  {loading && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] overflow-hidden">
                       <div className="absolute inset-x-0 h-1 bg-emerald-500 shadow-[0_0_20px_#10b981] animate-scan"></div>
                    </div>
                  )}
                  <button onClick={() => { setImage(null); setResult(null); window.speechSynthesis.cancel(); }} className="absolute top-6 right-6 p-5 bg-slate-900/80 text-white rounded-full backdrop-blur-md hover:bg-rose-500 transition-colors shadow-2xl">
                    <X size={24}/>
                  </button>
               </div>
               
               {loading ? (
                 <div className="bg-white p-16 rounded-[3.5rem] shadow-xl border border-slate-100 flex flex-col items-center gap-8">
                    <div className="relative">
                       <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
                       <Loader2 className="animate-spin text-emerald-600 relative" size={72}/>
                    </div>
                    <div className="text-center">
                       <h3 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">{t.analyzing}</h3>
                       <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Gemini AI is examining cells...</p>
                    </div>
                 </div>
               ) : result && (
                 <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border-l-[16px] border-emerald-500 space-y-8 animate-in slide-in-from-bottom-10">
                    <div className="flex items-center gap-4 text-emerald-600">
                       <CheckCircle2 size={44}/>
                       <h3 className="text-4xl font-black tracking-tighter">{t.result}</h3>
                    </div>
                    <div className="text-slate-700 text-2xl font-medium leading-relaxed whitespace-pre-wrap">{result}</div>
                    <div className="flex gap-4 pt-6">
                       <Button variant="outline" className="flex-1"><Share2 size={20}/> Share Report</Button>
                       <Button variant="primary" className="flex-1"><Save size={20}/> Save Record</Button>
                    </div>
                 </div>
               )}
            </div>
          )}
       </div>
    </div>
  );
};

// --- MAIN HUB ---
const Hub = ({ lang, user, onNavigate }: any) => {
  const t = TRANSLATIONS[lang];
  return (
    <div className="h-full bg-slate-50 text-slate-900 overflow-y-auto pb-40 scrollbar-hide">
       {/* High-Impact Alert */}
       <div className="bg-amber-50 p-4 border-b border-amber-100 flex items-center justify-center gap-4 animate-in slide-in-from-top duration-1000">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
             <Bell className="text-amber-600 animate-swing" size={18}/>
          </div>
          <p className="text-sm font-bold text-amber-900">
             {lang === 'mr' ? 'हवामान इशारा: पुढच्या २ तासात विजांच्या कडकडाटासह पावसाची शक्यता!' : 'Weather Alert: Heavy thunderstorm expected in 2 hours!'}
          </p>
          <button className="text-[10px] font-black uppercase text-amber-600 bg-white px-3 py-1 rounded-full border border-amber-200">View Map</button>
       </div>

       <div className="px-6 py-12 max-w-7xl mx-auto space-y-16">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
             <div className="flex-1 animate-in slide-in-from-left-20 duration-1000">
                <div className="flex items-center gap-3 mb-6">
                   <div className="px-4 py-1.5 bg-emerald-600 text-white rounded-full text-[10px] font-black tracking-[0.2em] uppercase">Krushi AI Pro</div>
                   <div className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black tracking-[0.2em] uppercase">V3.1</div>
                </div>
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] text-slate-950">
                   नमस्कार, <br/>
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-400">{user.name.split(' ')[0]} पाटील!</span>
                </h1>
                <p className="mt-8 text-xl text-slate-500 font-bold max-w-lg">तुमच्या <span className="text-emerald-600 font-black">{user.crop}</span> शेतीसाठी आजचा खास सल्ला आणि माहिती.</p>
             </div>
             
             {/* Dynamic Weather Widget */}
             <div onClick={() => onNavigate('WEATHER')} className="cursor-pointer group relative">
                <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full scale-150 group-hover:bg-emerald-500/20 transition-all"></div>
                <div className="relative glass-card bg-white p-8 rounded-[3.5rem] shadow-2xl border border-white flex items-center gap-10 hover:scale-105 transition-all duration-500">
                   <div className="text-right">
                      <div className="text-6xl font-black text-slate-900 tracking-tighter">28°C</div>
                      <div className="flex items-center justify-end gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">
                         <MapPin size={12}/> Baramati, IN
                      </div>
                   </div>
                   <div className="w-24 h-24 bg-sky-50 rounded-[2.5rem] flex items-center justify-center text-sky-500 shadow-inner group-hover:rotate-12 transition-transform">
                      <Sun size={56} className="animate-spin-slow"/>
                   </div>
                </div>
             </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
             <div onClick={() => onNavigate('BLOG')} className="md:col-span-7 lg:col-span-8 relative h-[500px] rounded-[4rem] overflow-hidden group cursor-pointer shadow-2xl">
                <img src={MOCK_BLOGS[0].image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="Blog" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-12 w-full md:w-3/4 space-y-6">
                   <span className="px-5 py-2 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">{MOCK_BLOGS[0].category}</span>
                   <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter leading-tight group-hover:translate-x-2 transition-transform duration-500">{MOCK_BLOGS[0].title}</h2>
                   <div className="flex items-center gap-4">
                      <Button variant="glass" size="lg">लेख वाचा <ArrowUpRight size={22}/></Button>
                   </div>
                </div>
             </div>
             
             <div onClick={() => onNavigate('DISEASE_DETECTOR')} className="md:col-span-5 lg:col-span-4 relative h-[500px] rounded-[4rem] overflow-hidden group cursor-pointer bg-emerald-600 shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                <div className="absolute inset-0 p-12 flex flex-col justify-end text-white space-y-6">
                   <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center backdrop-blur-md border border-white/30 group-hover:rotate-6 transition-transform">
                      <ScanLine size={40} />
                   </div>
                   <h3 className="text-4xl font-black leading-[0.9] tracking-tighter">{t.disease_check}</h3>
                   <p className="text-emerald-100 font-bold leading-relaxed">पिकाच्या पानाचा फोटो काढा आणि रोगाचे अचूक निदान मिळवा.</p>
                   <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] pt-4">
                      Start Scanning <ChevronRight size={16}/>
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
             <ActionCard title={t.voice_help} icon={Mic} subtitle="Talk with AI" color="bg-indigo-600" onClick={() => onNavigate('VOICE_ASSISTANT')} delay="delay-100" />
             <ActionCard title={t.market} icon={Store} subtitle="Live Rates" color="bg-amber-500" onClick={() => onNavigate('MARKET')} delay="delay-200" />
             <ActionCard title={t.schemes} icon={Landmark} subtitle="Govt Benefits" color="bg-slate-900" onClick={() => onNavigate('SCHEMES')} delay="delay-300" />
             <ActionCard title={t.profit} icon={TrendingUp} subtitle="Yield Forecast" color="bg-blue-600" onClick={() => onNavigate('YIELD')} delay="delay-400" />
          </div>
       </div>

       {/* Enhanced Bottom Nav (Mobile Only) */}
       <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md lg:hidden z-50">
          <div className="glass-dark px-8 py-5 rounded-[2.5rem] flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
             <button onClick={() => onNavigate('DASHBOARD')} className="p-3 text-emerald-500 relative nav-active"><Home size={24}/></button>
             <button onClick={() => onNavigate('BLOG')} className="p-3 text-white/50 hover:text-white transition-colors"><Newspaper size={24}/></button>
             <button onClick={() => onNavigate('VOICE_ASSISTANT')} className="w-16 h-16 -mt-12 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40 border-4 border-slate-950 active:scale-90 transition-all"><Mic size={28}/></button>
             <button onClick={() => onNavigate('MARKET')} className="p-3 text-white/50 hover:text-white transition-colors"><Store size={24}/></button>
             <button onClick={() => onNavigate('WEATHER')} className="p-3 text-white/50 hover:text-white transition-colors"><CloudSun size={24}/></button>
          </div>
       </nav>
    </div>
  );
};

const ActionCard = ({ title, icon: Icon, onClick, delay, color, subtitle }: any) => (
  <div onClick={onClick} className={`bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100 cursor-pointer group hover:-translate-y-4 hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 animate-in slide-in-from-bottom-10 ${delay}`}>
    <div className={`${color} w-20 h-20 rounded-[2rem] flex items-center justify-center mb-8 text-white group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl shadow-current/20`}>
      <Icon size={36} />
    </div>
    <div className="space-y-2">
       <h3 className="text-3xl font-black tracking-tighter leading-tight text-slate-900">{title}</h3>
       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{subtitle}</p>
    </div>
  </div>
);

const Sidebar = ({ view, setView, lang }: any) => {
  const t = TRANSLATIONS[lang];
  const items = [
    { id: 'DASHBOARD', icon: Home, label: t.dashboard },
    { id: 'BLOG', icon: Newspaper, label: t.blog },
    { id: 'DISEASE_DETECTOR', icon: ScanLine, label: t.disease_check },
    { id: 'VOICE_ASSISTANT', icon: Mic, label: t.voice_help },
    { id: 'MARKET', icon: Store, label: t.market },
    { id: 'WEATHER', icon: CloudSun, label: t.weather },
    { id: 'SCHEMES', icon: Landmark, label: t.schemes },
  ];
  return (
    <div className="w-96 bg-white border-r border-slate-200 flex flex-col h-full hidden lg:flex shadow-2xl z-50 relative">
      <div className="p-12 flex items-center gap-5 cursor-pointer group" onClick={() => setView('DASHBOARD')}>
         <div className="bg-emerald-600 p-4 rounded-[1.5rem] text-white shadow-xl shadow-emerald-500/20 group-hover:scale-110 transition-transform"><Sprout size={32} /></div>
         <h1 className="font-black text-3xl text-slate-950 tracking-tighter">AI Krushi<br/><span className="text-emerald-600">Mitra</span></h1>
      </div>
      <div className="flex-1 px-8 space-y-4 overflow-y-auto scrollbar-hide">
        {items.map((item) => (
          <button 
            key={item.id} 
            onClick={() => setView(item.id)} 
            className={`w-full flex items-center gap-6 p-6 rounded-[2rem] transition-all duration-500 group ${view === item.id ? 'bg-emerald-600 text-white shadow-2xl shadow-emerald-500/40 translate-x-4' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
          >
            <div className={`p-3 rounded-2xl ${view === item.id ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-600'} transition-all`}>
               <item.icon size={24} />
            </div>
            <span className="text-lg font-black tracking-tight">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="p-12 border-t border-slate-100">
         <button className="flex items-center gap-4 text-slate-400 font-black text-xs uppercase tracking-[0.2em] hover:text-rose-500 transition-colors">
            <Radio size={20}/> {t.logout}
         </button>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<ViewState>('SPLASH');
  const [lang, setLang] = useState<Language>('mr');
  const [user] = useState<UserProfile>({ name: 'Sanjay Pawar', village: 'Baramati', district: 'Pune', landSize: '5', crop: 'Soyabean' });

  const renderContent = () => {
    switch (view) {
      case 'SPLASH': return <SplashScreen onComplete={() => setView('LANGUAGE')} />;
      case 'LANGUAGE': return <LanguageSelection onSelect={(l) => { setLang(l); setView('DASHBOARD'); }} />;
      case 'DASHBOARD': return <Hub lang={lang} user={user} onNavigate={setView} />;
      case 'BLOG': return <AgriBlog lang={lang} onBack={() => setView('DASHBOARD')} />;
      case 'DISEASE_DETECTOR': return <DiseaseDetector lang={lang} onBack={() => setView('DASHBOARD')} />;
      case 'VOICE_ASSISTANT': return <VoiceAssistant lang={lang} user={user} onBack={() => setView('DASHBOARD')} />;
      case 'MARKET': return <MarketView lang={lang} onBack={() => setView('DASHBOARD')} />;
      case 'WEATHER': return <WeatherView lang={lang} onBack={() => setView('DASHBOARD')} />;
      case 'SCHEMES': return <SchemesView lang={lang} onBack={() => setView('DASHBOARD')} />;
      default: return <Hub lang={lang} user={user} onNavigate={setView} />;
    }
  };

  if (view === 'SPLASH' || view === 'LANGUAGE') return renderContent();

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar view={view} setView={setView} lang={lang} />
      <div className="flex-1 relative h-full overflow-hidden bg-white">{renderContent()}</div>
    </div>
  );
}

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => { const t = setTimeout(onComplete, 2500); return () => clearTimeout(t); }, []);
  return (
    <div className="h-full bg-emerald-600 flex flex-col items-center justify-center text-white text-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 animate-blob">
         <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-white rounded-full blur-[100px]"></div>
      </div>
      <div className="relative z-10 p-12 bg-white/20 rounded-[4rem] shadow-2xl backdrop-blur-xl border border-white/30 animate-in zoom-in-50 duration-1000">
         <Sprout size={120} className="animate-float" />
      </div>
      <h1 className="text-7xl font-black mt-12 tracking-tighter relative z-10">AI कृषी मित्र</h1>
      <p className="mt-4 text-emerald-100 font-black uppercase tracking-[0.4em] text-xs relative z-10">Modern Farming AI Ecosystem</p>
    </div>
  );
};

const LanguageSelection = ({ onSelect }: { onSelect: (l: Language) => void }) => (
  <div className="h-full bg-slate-50 flex flex-col items-center justify-center p-12 space-y-12 animate-in fade-in duration-1000 relative overflow-hidden">
    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-100/50 rounded-full -mr-80 -mt-80 blur-[120px]"></div>
    <div className="text-center relative z-10">
       <div className="w-28 h-28 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl mx-auto text-white rotate-6 hover:rotate-0 transition-transform duration-500">
          <Globe size={56}/>
       </div>
       <h2 className="text-5xl font-black text-slate-950 mb-4 tracking-tighter">निवडा तुमची भाषा</h2>
       <p className="text-slate-400 font-bold">Select your preferred language to continue</p>
    </div>
    <div className="w-full max-w-xl space-y-6 relative z-10">
       {['mr', 'hi', 'en'].map((l, i) => (
         <button 
           key={l} 
           onClick={() => onSelect(l as Language)} 
           className="w-full p-10 bg-white border border-slate-200 rounded-[3rem] text-4xl font-black text-slate-900 hover:bg-emerald-600 hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-xl hover:shadow-emerald-500/20 group animate-in slide-in-from-bottom-20"
           style={{ animationDelay: `${i * 100}ms` }}
         >
           <span className="flex items-center justify-between">
              {l === 'mr' ? 'मराठी' : l === 'hi' ? 'हिन्दी' : 'English'}
              <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity" size={32}/>
           </span>
         </button>
       ))}
    </div>
  </div>
);
