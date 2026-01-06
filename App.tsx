import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ViewState, Language, UserProfile, ChatMessage, BlogPost } from './types';
import { TRANSLATIONS } from './constants';
import { 
  Sprout, CloudSun, ScanLine, Mic, Droplets, ArrowLeft, User, Home, Store, 
  Wind, Camera, X, Send, Wheat, Sun, MapPin, Calendar, ArrowUpRight, 
  Landmark, Newspaper, Radio, Share2, TrendingUp, ChevronRight, 
  CheckCircle2, Zap, Loader2, Volume2, UserCircle, Clock, 
  MicOff, RefreshCw, Mic2, Bell, ShieldCheck, 
  CloudRain, Zap as Lightning, Globe, Lightbulb, Play, Pause, ThermometerSun,
  Menu, LogOut, Settings, LayoutDashboard, FileText, Activity, Info, WifiOff,
  Signal
} from 'lucide-react';
import { Button } from './components/Button';
import { getAIFarmingAdvice, analyzeCropDisease } from './services/geminiService';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from '@google/genai';

// --- AUDIO HELPERS ---
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
const MOCK_BLOGS: BlogPost[] = [
  {
    id: '1',
    title: 'Smart Farming 2025: ड्रोन तंत्रज्ञानाचा वापर',
    category: 'Technology',
    date: 'Today',
    author: 'AI Krushi',
    image: 'https://images.unsplash.com/photo-1615811361269-669f437998bb?q=80&w=800',
    intro: 'शेतीमध्ये ड्रोनचा वापर करून फवारणी कशी सोपी करावी आणि वेळेची बचत कशी करावी याबद्दल सविस्तर माहिती.',
    sections: [
        {
            heading: 'ड्रोन तंत्रज्ञान का वापरावे?',
            content: 'पारंपारिक फवारणी पद्धतीत जास्त वेळ आणि मजूर लागतात. ड्रोनमुळे हे काम अतिशय वेगाने होते. एका एकराची फवारणी अवघ्या १० ते १५ मिनिटांत पूर्ण होऊ शकते.'
        },
        {
            heading: 'फायदे',
            content: '१. वेळेची बचत: जलद फवारणी.\n२. पाण्याची बचत: एकरी फक्त १०-१५ लिटर पाणी लागते.\n३. आरोग्याची काळजी: शेतकऱ्याचा औषधाशी थेट संपर्क येत नाही.\n४. समान फवारणी: पिकाच्या पानांवर औषध समान प्रमाणात पडते.'
        },
        {
            heading: 'सबसिडी आणि योजना',
            content: 'केंद्र सरकारने ड्रोन खरेदीसाठी शेतकऱ्यांना आणि FPO ना ५०% ते ७५% पर्यंत अनुदान जाहीर केले आहे.'
        }
    ], 
    conclusion: 'ड्रोन हे आधुनिक शेतीचे भविष्य आहे. यामुळे खर्च कमी होऊन उत्पन्न वाढण्यास मदत होईल.'
  },
  {
    id: '2',
    title: 'कांदा पिकावरील करपा रोगाचे नियंत्रण',
    category: 'Disease',
    date: 'Yesterday',
    author: 'Dr. Patil',
    image: 'https://images.unsplash.com/photo-1627920769842-6a6eb1222472?q=80&w=800',
    intro: 'ढगाळ वातावरणामुळे कांद्यावर येणाऱ्या रोगांचे नियोजन आणि व्यवस्थापन.',
    sections: [
        {
            heading: 'रोग ओळखण्याची लक्षणे',
            content: 'पानांवर सुरुवातीला पिवळसर लांबट चट्टे दिसतात. नंतर ते तपकिरी होऊन पाने वाळतात. यालाच शेतकरी करपा म्हणतात.'
        },
        {
            heading: 'हवामानाचा परिणाम',
            content: 'सतत ढगाळ वातावरण आणि जास्त आर्द्रता (८०% पेक्षा जास्त) असल्यास या बुरशीचा प्रादुर्भाव वेगाने होतो.'
        },
        {
            heading: 'एकात्मिक उपाय',
            content: '१. बीजप्रक्रिया: पेरणीपूर्वी बियाण्यास थायरम चोळावे.\n२. फवारणी: मॅन्कोझेब २५ ग्रॅम किंवा टेब्युकोनॅझोल १० मिली प्रति १० लिटर पाण्यात मिसळून फवारणी करावी.\n३. नत्र खताचा अतिरेक टाळावा.'
        }
    ],
    conclusion: 'योग्य वेळी निदान आणि फवारणी केल्यास ३०-४०% नुकसान टाळता येते.'
  },
  {
    id: '3',
    title: 'सेंद्रिय शेती: काळाची गरज',
    category: 'Organic',
    date: '2 Days Ago',
    author: 'Prof. Deshmukh',
    image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=800',
    intro: 'रासायनिक खतांचा वापर कमी करून जमिनीचा पोत सुधारण्याचे उपाय.',
    sections: [
        {
            heading: 'सेंद्रिय शेती म्हणजे काय?',
            content: 'रासायनिक खते आणि कीटकनाशके न वापरता, निसर्गात उपलब्ध असलेल्या साधनांचा वापर करून केलेली शेती.'
        },
        {
            heading: 'जीवामृत तयार करण्याची पद्धत',
            content: 'साहित्य: १० किलो देशी गाईचे शेण, १० लिटर गोमूत्र, २ किलो गूळ, २ किलो डाळीचे पीठ. हे सर्व २०० लिटर पाण्यात मिसळून ४८ तास सावलीत ठेवावे. हे १ एकरासाठी उत्तम खत आहे.'
        },
        {
            heading: 'फायदे',
            content: 'जमिनीचा पोत सुधारतो, पिकाची चव वाढते, आणि खर्च कमी होतो. ग्राहकांकडून सेंद्रिय मालाला चांगली मागणी आहे.'
        }
    ], 
    conclusion: 'दीर्घकालीन फायद्यासाठी आणि जमिनीच्या आरोग्यासाठी सेंद्रिय शेती हाच उत्तम पर्याय आहे.'
  }
];

const MOCK_MARKET = [
  { name: 'Soyabean', price: 4850, trend: '+120', arrival: 'High', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Wheat },
  { name: 'Cotton', price: 7200, trend: '-50', arrival: 'Med', color: 'text-rose-500', bg: 'bg-rose-50', icon: CloudSun },
  { name: 'Onion', price: 1800, trend: '-200', arrival: 'High', color: 'text-rose-500', bg: 'bg-rose-50', icon: Sprout },
  { name: 'Wheat', price: 2450, trend: '+15', arrival: 'Low', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Wheat },
];

const MOCK_SCHEMES = [
  { id: 1, title: 'PM-Kisan Samman Nidhi', sub: '₹6000/Year', benefit: '₹2000 per installment', color: 'bg-blue-50 text-blue-700 border-blue-100', status: 'OPEN', deadline: 'Ongoing' },
  { id: 2, title: 'Pradhan Mantri Fasal Bima', sub: 'Crop Insurance', benefit: 'Full Coverage', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', status: 'OPEN', deadline: '31 Aug' },
  { id: 3, title: 'Kusum Solar Pump', sub: '90% Subsidy', benefit: 'Solar Pump Set', color: 'bg-amber-50 text-amber-700 border-amber-100', status: 'OPEN', deadline: 'Limited' },
  { id: 4, title: 'Drip Irrigation Subsidy', sub: 'Subsidized', benefit: 'upto 80% Off', color: 'bg-cyan-50 text-cyan-700 border-cyan-100', status: 'CLOSED', deadline: 'Expired' }
];

// --- COMPONENTS ---

// Desktop Sidebar
const Sidebar = ({ view, setView, lang }: { view: ViewState, setView: (v: ViewState) => void, lang: Language }) => {
  const t = TRANSLATIONS[lang];
  const menu = [
    { id: 'DASHBOARD', icon: LayoutDashboard, label: t.menu_dashboard },
    { id: 'MARKET', icon: Store, label: t.menu_market },
    { id: 'WEATHER', icon: CloudSun, label: t.menu_weather },
    { id: 'DISEASE_DETECTOR', icon: ScanLine, label: t.menu_crop_doctor },
    { id: 'BLOG', icon: FileText, label: t.menu_knowledge },
    { id: 'SCHEMES', icon: Landmark, label: t.menu_schemes },
  ];

  return (
    <div className="hidden md:flex w-72 bg-farm-poly h-screen border-r border-slate-200 flex-col sticky top-0 z-50 shadow-2xl">
       <div className="p-8 pb-4 relative z-10">
          <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => setView('DASHBOARD')}>
             <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-emerald-200 shadow-xl group-hover:scale-110 transition-transform">
                <Sprout size={28} />
             </div>
             <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">AI Krushi</h1>
                <span className="text-emerald-600 font-bold text-xs uppercase tracking-widest">Mitra Pro</span>
             </div>
          </div>
       </div>

       <div className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar relative z-10">
          {menu.map(item => (
             <button key={item.id} onClick={() => setView(item.id as ViewState)}
               className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 font-bold text-sm group backdrop-blur-sm ${view === item.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-600 hover:bg-white/60 hover:text-emerald-700'}`}>
                <item.icon size={20} className={`transition-colors ${view === item.id ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'}`} />
                {item.label}
             </button>
          ))}
       </div>

       <div className="p-4 border-t border-slate-200/50 bg-white/30 backdrop-blur-md">
          <button onClick={() => setView('VOICE_ASSISTANT')} className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white p-4 rounded-2xl shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group">
             <Mic className="animate-pulse" size={20} />
             <span className="font-bold">{t.menu_voice}</span>
          </button>
          <button onClick={() => setView('LANGUAGE')} className="w-full mt-2 text-slate-500 hover:text-emerald-600 p-2 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
             <Settings size={14}/> Change Language
          </button>
       </div>
    </div>
  );
};

// Mobile Bottom Nav
const MobileNav = ({ active, setView, lang }: { active: ViewState, setView: (v: ViewState) => void, lang: Language }) => {
  const t = TRANSLATIONS[lang];
  const navItems = [
    { id: 'DASHBOARD', icon: Home, label: t.menu_dashboard },
    { id: 'MARKET', icon: Store, label: t.menu_market },
    { id: 'VOICE_ASSISTANT', icon: Mic, label: t.menu_voice, main: true },
    { id: 'DISEASE_DETECTOR', icon: ScanLine, label: t.menu_crop_doctor },
    { id: 'WEATHER', icon: CloudSun, label: t.menu_weather },
  ];

  return (
    <div className="md:hidden fixed bottom-6 left-4 right-4 z-50 animate-enter">
      <div className="glass-dark rounded-[2.5rem] px-2 py-2 flex justify-between items-center shadow-2xl shadow-slate-900/20 relative backdrop-blur-xl border border-white/10">
        {navItems.map((item) => {
          const isActive = active === item.id;
          if (item.main) {
            return (
              <button key={item.id} onClick={() => setView(item.id as ViewState)} 
                className="relative -top-8 bg-gradient-to-br from-emerald-500 to-teal-400 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40 border-[6px] border-slate-50 active:scale-90 transition-transform">
                <Mic size={28} />
              </button>
            );
          }
          return (
            <button key={item.id} onClick={() => setView(item.id as ViewState)} 
              className={`p-4 rounded-full transition-all duration-300 active:scale-75 ${isActive ? 'text-emerald-400 bg-white/10' : 'text-slate-400 hover:text-white'}`}>
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Header
const Header = ({ title, subtitle, onBack }: { title: string, subtitle?: string, onBack?: () => void }) => (
  <div className="pt-6 pb-4 px-6 md:px-10 flex items-center gap-4 sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md border-b border-slate-100 md:hidden">
    {onBack && (
      <button onClick={onBack} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 active:scale-90 transition-transform shadow-sm">
        <ArrowLeft size={20} />
      </button>
    )}
    <div className="flex-1">
      <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{title}</h1>
      {subtitle && <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-1">{subtitle}</p>}
    </div>
    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border border-emerald-200">
      AI
    </div>
  </div>
);

// --- AVATAR COMPONENT ---
const TalkingAvatar = ({ analyser }: { analyser: AnalyserNode | null }) => {
  const mouthRef = useRef<SVGPathElement>(null);
  const [blink, setBlink] = useState(false);

  // Blinking animation loop
  useEffect(() => {
    const blinkLoop = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
      setTimeout(blinkLoop, Math.random() * 3000 + 2000);
    };
    const timeout = setTimeout(blinkLoop, 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Lip-sync animation loop
  useEffect(() => {
    if (!analyser) return;
    
    const bufferLength = analyser.frequencyBinCount; // 32
    const dataArray = new Uint8Array(bufferLength);
    let animationId: number;

    const animate = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume from lower frequencies (voice range)
      let sum = 0;
      const bins = Math.min(dataArray.length, 16); 
      for(let i = 0; i < bins; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bins;
      
      // Map volume to mouth opening
      // Threshold 10 to ignore silence/noise floor
      const val = Math.max(0, avg - 10); 
      const opening = (val / 150) * 35; // Max opening ~35px
      
      if (mouthRef.current) {
         // Create a mouth shape that opens downwards
         // Top lip: curve from 75,125 to 125,125
         // Bottom lip control point: 100, 125 + opening
         mouthRef.current.setAttribute('d', `M 75 125 Q 100 125 125 125 Q 100 ${125 + opening} 75 125 z`);
      }

      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [analyser]);

  return (
    <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center animate-enter">
       {/* Glow Effect */}
       <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
       
       <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl relative z-10">
          <defs>
             <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f5d0b0"/>
                <stop offset="100%" stopColor="#eac09a"/>
             </linearGradient>
             <linearGradient id="turban" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f97316"/> 
                <stop offset="100%" stopColor="#ea580c"/> 
             </linearGradient>
          </defs>
          
          {/* Shadow */}
          <ellipse cx="100" cy="180" rx="60" ry="10" fill="rgba(0,0,0,0.3)" filter="blur(8px)"/>
          
          {/* Neck */}
          <rect x="80" y="140" width="40" height="40" fill="#eac09a" rx="10"/>

          {/* Face */}
          <circle cx="100" cy="100" r="55" fill="url(#skin)" />
          
          {/* Turban (Smart Farmer Style) */}
          <path d="M 40 90 Q 100 35 160 90 Q 160 55 100 45 Q 40 55 40 90" fill="url(#turban)" />
          {/* Turban folds */}
          <path d="M 45 85 Q 100 25 155 85" fill="none" stroke="#fdba74" strokeWidth="2" opacity="0.4"/>

          {/* Eyes Group */}
          <g className={`transition-transform duration-100 ${blink ? 'scale-y-0' : 'scale-y-100'}`} style={{transformOrigin: '100px 95px'}}>
             {/* Left Eye */}
             <ellipse cx="80" cy="95" rx="6" ry="7" fill="#1e293b"/>
             <circle cx="82" cy="93" r="2" fill="white" opacity="0.7"/>
             
             {/* Right Eye */}
             <ellipse cx="120" cy="95" rx="6" ry="7" fill="#1e293b"/>
             <circle cx="122" cy="93" r="2" fill="white" opacity="0.7"/>
          </g>

          {/* Smart Glasses */}
          <g stroke="#0f172a" strokeWidth="2.5" fill="rgba(255,255,255,0.1)">
             <circle cx="80" cy="95" r="16"/>
             <circle cx="120" cy="95" r="16"/>
             <line x1="96" y1="95" x2="104" y2="95" strokeWidth="2"/>
             <line x1="38" y1="90" x2="64" y2="95" strokeWidth="2"/> {/* Left arm */}
             <line x1="136" y1="95" x2="162" y2="90" strokeWidth="2"/> {/* Right arm */}
          </g>
          
          {/* Nose */}
          <path d="M 100 105 Q 95 115 100 118" fill="none" stroke="#d4a373" strokeWidth="2" strokeLinecap="round"/>

          {/* Mouth (Animated) */}
          <path ref={mouthRef} d="M 75 125 Q 100 125 125 125" fill="#581c0c" />
          
          {/* Tech Aura Ring */}
          <circle cx="100" cy="100" r="85" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="4 6" opacity="0.3" className="animate-spin-slow" />
       </svg>
    </div>
  );
};


// --- VIEWS ---
const Hub = ({ lang, user, onNavigate }: any) => {
  const t = TRANSLATIONS[lang];
  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-slate-50">
      <div className="px-6 md:px-10 pt-10 pb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 animate-enter">
          <div>
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               {t.live_system}
             </div>
             <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight">
               {t.welcome_title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">{user.name.split(' ')[0]}!</span>
             </h1>
             <p className="text-slate-500 font-medium mt-2 max-w-lg">{t.welcome_subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden md:flex flex-col items-end mr-2">
                <span className="font-bold text-slate-900">{user.village}</span>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">32°C {t.menu_weather}</span>
             </div>
             <div onClick={() => onNavigate('PROFILE')} className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white border-2 border-slate-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all">
                <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white font-bold">SP</div>
             </div>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-4 bg-amber-50 border border-amber-100 p-4 rounded-2xl animate-enter delay-100 shadow-sm max-w-3xl">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
             <Bell size={20} className="text-amber-600 animate-swing" />
          </div>
          <div className="flex-1">
             <p className="text-sm font-bold text-amber-900">{t.weather_alert_title}</p>
             <p className="text-xs text-amber-700 font-medium mt-0.5">{t.weather_alert_msg}</p>
          </div>
          <ChevronRight size={20} className="text-amber-400" />
        </div>
      </div>

      <div className="px-6 md:px-10 pb-32 md:pb-10 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div onClick={() => onNavigate('WEATHER')} className="col-span-1 md:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.01] animate-enter delay-100 h-64 flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all duration-700"></div>
          <div className="relative z-10 flex justify-between items-start">
             <div className="bg-white/20 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <MapPin size={12}/> {user.village}
             </div>
             <Sun size={48} className="text-yellow-300 animate-spin-slow" />
          </div>
          <div className="relative z-10">
             <div className="text-7xl font-black tracking-tighter">28°</div>
             <div className="text-lg font-medium opacity-90 flex items-center gap-3">
                <span>Sunny Day</span>
                <span className="w-1 h-1 rounded-full bg-white/50"></span>
                <span>H: 31° L: 24°</span>
             </div>
          </div>
        </div>

        <div onClick={() => onNavigate('DISEASE_DETECTOR')} className="bg-white rounded-[2.5rem] p-6 shadow-lg shadow-slate-100 border border-slate-100 cursor-pointer hover:border-emerald-200 transition-all hover:-translate-y-1 group animate-enter delay-200 flex flex-col justify-between h-64">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-inner">
            <ScanLine size={32} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-2xl leading-tight mb-2">{t.quick_action_doctor}</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{t.quick_action_doctor_desc}</p>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
             <div className="w-3/4 h-full bg-emerald-500 rounded-full"></div>
          </div>
        </div>

        <div onClick={() => onNavigate('MARKET')} className="bg-white rounded-[2.5rem] p-6 shadow-lg shadow-slate-100 border border-slate-100 cursor-pointer hover:border-orange-200 transition-all hover:-translate-y-1 group animate-enter delay-200 flex flex-col justify-between h-64">
          <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all duration-500 shadow-inner">
            <TrendingUp size={32} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-2xl leading-tight mb-2">{t.quick_action_market}</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{t.quick_action_market_desc}</p>
          </div>
          <div className="flex -space-x-2">
             <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white"></div>
             <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white"></div>
             <div className="w-8 h-8 rounded-full bg-orange-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-orange-600">+3</div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-3 lg:col-span-4 mt-4 animate-enter delay-300">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-900">{t.govt_schemes}</h3>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {MOCK_SCHEMES.map(s => (
                 <div key={s.id} onClick={() => onNavigate('SCHEMES')} className={`p-5 rounded-3xl border ${s.color} cursor-pointer hover:shadow-md transition-all active:scale-95`}>
                    <Landmark size={24} className="mb-4 opacity-80" />
                    <h4 className="font-black text-base leading-tight">{s.title}</h4>
                    <p className="text-xs font-bold opacity-70 mt-1 uppercase tracking-wider">{s.sub}</p>
                 </div>
               ))}
           </div>
        </div>

        <div className="col-span-1 md:col-span-3 lg:col-span-4 mt-4 animate-enter delay-300">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">{t.latest_news}</h3>
              <button onClick={() => onNavigate('BLOG')} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full hover:bg-emerald-100 transition-colors">{t.view_all}</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {MOCK_BLOGS.map(blog => (
               <div key={blog.id} onClick={() => onNavigate('BLOG')} className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 hover:border-emerald-200 hover:shadow-lg transition-all cursor-pointer group flex flex-row gap-4 h-full">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden shrink-0">
                     <img src={blog.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={blog.title} />
                  </div>
                  <div className="flex flex-col justify-center">
                     <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider bg-emerald-50 px-2 py-0.5 rounded-md w-fit mb-2">{blog.category}</span>
                     <h4 className="font-bold text-slate-900 leading-tight line-clamp-2 text-lg mb-2 group-hover:text-emerald-700 transition-colors">{blog.title}</h4>
                     <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                        <Clock size={12}/> {blog.date}
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

const VoiceAssistant = ({ lang, user, onBack }: { lang: Language, user: UserProfile, onBack: () => void }) => {
  const t = TRANSLATIONS[lang];
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'reconnecting'>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Audio state
  const sessionRef = useRef<any>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const analyserInRef = useRef<AnalyserNode | null>(null);
  const analyserOutRef = useRef<AnalyserNode | null>(null);
  const nextStartTime = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const userDisconnecting = useRef(false);
  const reconnectTimeoutRef = useRef<any>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
        cleanup(true);
    }
  }, []);

  const cleanup = (fullyStop = false) => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    sessionRef.current?.close();
    
    // Stop all playing audio
    sourcesRef.current.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    nextStartTime.current = 0;

    audioContextInRef.current?.close();
    audioContextOutRef.current?.close();
    
    audioContextInRef.current = null;
    audioContextOutRef.current = null;
    sessionRef.current = null;
    
    if (fullyStop) {
        setStatus('idle');
    }
  };

  const connectToAI = async (isRetry = false) => {
      if (userDisconnecting.current) return;
      
      setStatus(isRetry ? 'reconnecting' : 'connecting');
      
      try {
         const stream = await navigator.mediaDevices.getUserMedia({ 
             audio: { 
                 sampleRate: 16000, 
                 echoCancellation: true,
                 noiseSuppression: true,
                 autoGainControl: true
             } 
         });

         const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
         const ctxIn = new AudioContextClass({ sampleRate: 16000 });
         const ctxOut = new AudioContextClass({ sampleRate: 24000 });
         
         // Visualizers
         const analyserIn = ctxIn.createAnalyser();
         analyserIn.fftSize = 64;
         analyserInRef.current = analyserIn;

         const analyserOut = ctxOut.createAnalyser();
         analyserOut.fftSize = 64;
         analyserOutRef.current = analyserOut;

         await ctxIn.resume(); 
         await ctxOut.resume();
         
         audioContextInRef.current = ctxIn; 
         audioContextOutRef.current = ctxOut;
         
         nextStartTime.current = 0;
         sourcesRef.current.clear();

         const source = ctxIn.createMediaStreamSource(stream);
         source.connect(analyserIn); // Connect mic to analyser
         const processor = ctxIn.createScriptProcessor(4096, 1, 1);
         analyserIn.connect(processor); // Connect analyser to processor
         processor.connect(ctxIn.destination);

         const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
         
         const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: { 
                responseModalities: [Modality.AUDIO], 
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
                systemInstruction: lang === 'mr' 
                    ? `तुम्ही 'AI कृषी मित्र' आहात, एक हुशार आणि प्रेमळ शेतकरी मित्र. अस्सल मराठमोळ्या ग्रामीण भाषेत बोला. उत्तरे छोटी आणि स्पष्ट द्या. 'राम राम', 'पाटील' असे शब्द वापरा. 
                    शेतकरी: ${user.name}, गाव: ${user.village}, पीक: ${user.crop}.
                    तुमचे मुख्य काम: शेतकऱ्याशी गप्पा मारणे आणि त्यांच्या समस्या सोडवणे.
                    महत्वाचे: जर संपर्क तुटला आणि पुन्हा जोडला गेला, तर आधीचा विषय आठवण्याचा प्रयत्न करा आणि संभाषण नैसर्गिक ठेवा. वारंवार स्वतःची ओळख करून देऊ नका.` 
                    : `You are 'AI Krushi Mitra', a smart and friendly farmer friend. Speak in a warm, rural style in simple English/Hindi. Keep answers short, clear and practical.
                    Farmer: ${user.name}, Village: ${user.village}, Crop: ${user.crop}.
                    Key Role: Chat with the farmer and solve their problems.
                    Important: Maintain conversation continuity. Do not repeat introductions if reconnected.`
            },
            callbacks: {
               onopen: () => { 
                  setStatus('connected');
                  setRetryCount(0);
                  processor.onaudioprocess = (e) => {
                     const blob = createPCMChunk(e.inputBuffer.getChannelData(0));
                     sessionPromise.then(s => s.sendRealtimeInput({ media: blob }));
                  };
               },
               onmessage: async (msg) => {
                  const serverContent = msg.serverContent;
                  
                  if (serverContent?.interrupted) {
                      sourcesRef.current.forEach(source => {
                          try { source.stop(); } catch(e) {}
                      });
                      sourcesRef.current.clear();
                      nextStartTime.current = 0;
                  }

                  const audioData = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                  if (audioData) {
                     const buffer = await decodeAudioData(decode(audioData), ctxOut, 24000, 1);
                     
                     const source = ctxOut.createBufferSource();
                     source.buffer = buffer;
                     source.connect(analyserOut); // Connect output to analyser
                     analyserOut.connect(ctxOut.destination);
                     
                     const currentTime = ctxOut.currentTime;
                     if (nextStartTime.current < currentTime + 0.05) {
                         nextStartTime.current = currentTime + 0.05;
                     }
                     
                     source.start(nextStartTime.current);
                     nextStartTime.current += buffer.duration;
                     
                     sourcesRef.current.add(source);
                     source.onended = () => {
                         sourcesRef.current.delete(source);
                     };
                  }
               },
               onclose: () => {
                   if (!userDisconnecting.current) {
                       console.log("Session closed unexpectedly. Reconnecting...");
                       handleAutoReconnect();
                   } else {
                       setStatus('idle');
                   }
               },
               onerror: (err) => {
                   console.error("Session Error:", err);
                   if (!userDisconnecting.current) {
                       handleAutoReconnect();
                   } else {
                       cleanup(true);
                       setStatus('error');
                   }
               }
            }
         });
         
         // Store session for cleanup
         sessionPromise.then(s => {
             sessionRef.current = s;
         });
         
      } catch (e) { 
           console.error("Connection Failed", e); 
           if (!userDisconnecting.current) {
               handleAutoReconnect();
           } else {
               cleanup(true);
               setStatus('error'); 
           }
      }
  };

  const handleAutoReconnect = () => {
      cleanup(false); // Clean resources but don't set to idle
      if (retryCount < 5) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff max 10s
          setStatus('reconnecting');
          setRetryCount(prev => prev + 1);
          reconnectTimeoutRef.current = setTimeout(() => {
              connectToAI(true);
          }, delay);
      } else {
          setStatus('error');
      }
  };

  const toggleSession = () => {
    if (status === 'connected' || status === 'connecting' || status === 'reconnecting') {
       userDisconnecting.current = true;
       cleanup(true);
    } else {
       userDisconnecting.current = false;
       setRetryCount(0);
       connectToAI();
    }
  };

  const isActive = status === 'connected';
  const isConnecting = status === 'connecting';
  const isReconnecting = status === 'reconnecting';
  const isError = status === 'error';

  return (
    <div className="h-full bg-slate-900 text-white flex flex-col relative overflow-hidden">
       <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/30 via-slate-900 to-slate-900 animate-pulse"></div>
          {(isActive || isReconnecting) && (
             <>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px] animate-scale"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
             </>
          )}
       </div>

       <div className="relative z-10 px-6 pt-6 md:pt-10 flex justify-between items-center max-w-5xl mx-auto w-full">
          <button onClick={onBack} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-90 transition-transform"><ArrowLeft /></button>
          <div className={`bg-white/5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md border border-white/5 transition-colors ${isActive ? 'border-emerald-500/30 bg-emerald-900/20' : ''}`}>
            {isActive ? <span className="text-emerald-400 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/> Live Session</span> : 
             isReconnecting ? <span className="text-amber-400 flex items-center gap-2"><RefreshCw size={12} className="animate-spin"/> Reconnecting...</span> :
             isConnecting ? <span className="text-amber-400 flex items-center gap-2"><Loader2 size={12} className="animate-spin"/> Connecting...</span> :
             isError ? <span className="text-rose-400 flex items-center gap-2"><WifiOff size={12}/> Connection Failed</span> :
             "AI Ready"}
          </div>
          <div className="w-12"></div>
       </div>

       <div className="flex-1 flex flex-col items-center justify-center relative z-10 p-6 space-y-16 max-w-4xl mx-auto w-full">
          
          {isActive ? (
             /* Talking Avatar */
             <div onClick={toggleSession} className="cursor-pointer transition-transform active:scale-95">
               <TalkingAvatar analyser={analyserOutRef.current} />
             </div>
          ) : (
             /* Default Mic Button */
             <div className="relative group cursor-pointer" onClick={toggleSession}>
                {isReconnecting && (
                    <div className="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-20 duration-1000"></div>
                )}
                
                <div className={`w-40 h-40 md:w-56 md:h-56 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(16,185,129,0.2)] transition-all duration-500 relative z-10 border-[8px] ${
                    isReconnecting ? 'bg-amber-100 text-amber-600 border-amber-400/30' :
                    isConnecting ? 'bg-amber-100 text-amber-600 border-amber-400/30 animate-pulse' :
                    isError ? 'bg-rose-100 text-rose-600 border-rose-400/30' :
                    'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-white/10 hover:scale-105 hover:shadow-[0_0_100px_rgba(16,185,129,0.4)]'
                    }`}>
                   {isReconnecting ? <Signal size={64} className="animate-pulse" /> :
                    isConnecting ? <Loader2 size={64} className="animate-spin" /> :
                    isError ? <RefreshCw size={64} /> :
                    <Mic size={64} />}
                </div>
             </div>
          )}
          
          <div className="text-center space-y-4 animate-enter delay-100">
             <h2 className="text-4xl md:text-5xl font-black tracking-tight">
                 {isActive ? t.voice_title : 
                  isReconnecting ? "Signal Weak..." :
                  isConnecting ? "Establishing Link..." :
                  isError ? "Connection Error" :
                  t.voice_tap}
             </h2>
             <p className="text-slate-400 font-medium leading-relaxed text-lg max-w-md mx-auto">
                 {isError ? "Check your internet and try again." : 
                  isReconnecting ? "Trying to reconnect to the farm network..." : 
                  t.voice_desc}
             </p>
          </div>
       </div>

       {!isActive && !isConnecting && !isReconnecting && (
         <div className="relative z-10 p-6 pb-20 md:pb-12 animate-enter delay-200 max-w-5xl mx-auto w-full">
            <div className="flex flex-wrap justify-center gap-4">
               {t.voice_hints.map((q: string, i: number) => (
                  <button key={i} className="px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-emerald-500/50 hover:text-emerald-400 active:scale-95 transition-all text-sm font-medium">
                     {q}
                  </button>
               ))}
            </div>
         </div>
       )}
    </div>
  );
};

const MarketView = ({ lang, onBack }: any) => {
  const t = TRANSLATIONS[lang];
  return (
    <div className="h-full bg-slate-50 overflow-y-auto custom-scrollbar">
       <div className="md:hidden"><Header title={t.market_title} subtitle={t.market_subtitle} onBack={onBack} /></div>
       <div className="hidden md:block px-10 pt-10 pb-4">
          <h1 className="text-4xl font-black text-slate-900">{t.market_title}</h1>
          <p className="text-slate-500 mt-2 font-medium">{t.market_subtitle}</p>
       </div>

       <div className="p-6 md:p-10 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOCK_MARKET.map((m, i) => (
              <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:border-slate-200 transition-all duration-300 flex flex-col justify-between group animate-enter" style={{ animationDelay: `${i * 100}ms` }}>
                 <div className="flex justify-between items-start mb-6">
                    <div className={`w-14 h-14 rounded-2xl ${m.bg} flex items-center justify-center text-slate-700 group-hover:scale-110 transition-transform`}>
                       <m.icon size={28} className={m.color} />
                    </div>
                    <div className={`text-xs font-black ${m.color} bg-slate-50 px-3 py-1.5 rounded-lg`}>{m.trend}</div>
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-900">{m.name}</h3>
                    <div className="flex justify-between items-end mt-2">
                       <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t.price_label}</p>
                          <p className="text-2xl font-black text-slate-900">₹{m.price}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t.arrival_label}</p>
                          <p className="text-sm font-bold text-slate-700">{m.arrival}</p>
                       </div>
                    </div>
                 </div>
              </div>
            ))}
          </div>
       </div>
    </div>
  );
};

const App = () => {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [lang, setLang] = useState<Language>('mr');
  const [user] = useState<UserProfile>({
    name: "Suresh Patil",
    village: "Satara",
    district: "Satara",
    landSize: "5 Acres",
    crop: "Soyabean"
  });

  const renderContent = () => {
    switch(view) {
      case 'DASHBOARD':
        return <Hub lang={lang} user={user} onNavigate={setView} />;
      case 'VOICE_ASSISTANT':
        return <VoiceAssistant lang={lang} user={user} onBack={() => setView('DASHBOARD')} />;
      case 'MARKET':
        return <MarketView lang={lang} onBack={() => setView('DASHBOARD')} />;
      case 'WEATHER':
      case 'DISEASE_DETECTOR':
      case 'SCHEMES':
      case 'BLOG':
         return (
             <div className="h-full bg-slate-50 flex flex-col">
                 <div className="md:hidden"><Header title={TRANSLATIONS[lang][`menu_${view === 'DISEASE_DETECTOR' ? 'crop_doctor' : view === 'BLOG' ? 'knowledge' : view.toLowerCase()}`] || view} onBack={() => setView('DASHBOARD')} /></div>
                 <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                     <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6">
                         {view === 'WEATHER' ? <CloudSun size={40}/> : 
                          view === 'DISEASE_DETECTOR' ? <ScanLine size={40}/> :
                          view === 'SCHEMES' ? <Landmark size={40}/> :
                          <FileText size={40}/>}
                     </div>
                     <h2 className="text-2xl font-black text-slate-900 mb-2">Coming Soon</h2>
                     <p className="text-slate-500 max-w-xs mx-auto">This feature is under development for the demo.</p>
                     <Button variant="primary" className="mt-8" onClick={() => setView('DASHBOARD')}>Go Back</Button>
                 </div>
             </div>
         )
      default:
        return <Hub lang={lang} user={user} onNavigate={setView} />;
    }
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900">
       {/* Sidebar only visible on desktop and when not in immersive mode like Voice Assistant */}
       {view !== 'VOICE_ASSISTANT' && (
         <Sidebar view={view} setView={setView} lang={lang} />
       )}
       
       <main className={`flex-1 h-full relative overflow-hidden transition-all duration-300 ${view === 'VOICE_ASSISTANT' ? 'w-full' : ''}`}>
          {renderContent()}
       </main>

       {/* Mobile Nav only visible on mobile and when not in immersive mode */}
       {view !== 'VOICE_ASSISTANT' && (
         <MobileNav active={view} setView={setView} lang={lang} />
       )}
    </div>
  );
}

export default App;