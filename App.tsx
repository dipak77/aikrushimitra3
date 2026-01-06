
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Language, UserProfile, ChatMessage, BlogPost } from './types';
import { TRANSLATIONS } from './constants';
import { 
  Sprout, CloudSun, ScanLine, Mic, Droplets, ArrowLeft, User, Home, Store, 
  Wind, Camera, X, Send, Wheat, Sun, MapPin, Calendar, ArrowUpRight, 
  Landmark, Newspaper, Radio, Share2, TrendingUp, ChevronRight, 
  CheckCircle2, Zap, Loader2, Volume2, UserCircle, Clock, 
  MicOff, RefreshCw, Mic2, Bell, ShieldCheck, 
  CloudRain, Zap as Lightning, Globe, Lightbulb, Play, Pause, ThermometerSun,
  Menu, LogOut, Settings, LayoutDashboard, FileText, Activity, Info
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
  const [active, setActive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Audio state
  const sessionRef = useRef<any>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTime = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  const toggleSession = async () => {
    if (active) {
       sessionRef.current?.close();
       setActive(false);
       
       // Stop all playing audio
       sourcesRef.current.forEach(source => {
           try { source.stop(); } catch(e) {}
       });
       sourcesRef.current.clear();
       nextStartTime.current = 0;

       audioContextInRef.current?.close();
       audioContextOutRef.current?.close();
    } else {
       try {
         const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, echoCancellation: true } });
         const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
         const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
         const ctxIn = new AudioContextClass({ sampleRate: 16000 });
         const ctxOut = new AudioContextClass({ sampleRate: 24000 });
         await ctxIn.resume(); await ctxOut.resume();
         audioContextInRef.current = ctxIn; audioContextOutRef.current = ctxOut;
         
         // Reset audio scheduling cursors
         nextStartTime.current = 0;
         sourcesRef.current.clear();

         const source = ctxIn.createMediaStreamSource(stream);
         const processor = ctxIn.createScriptProcessor(4096, 1, 1);
         source.connect(processor); processor.connect(ctxIn.destination);

         const session = await ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: { 
                responseModalities: [Modality.AUDIO], 
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
                systemInstruction: lang === 'mr' 
                    ? `तुम्ही 'AI कृषी मित्र' आहात, एक हुशार आणि प्रेमळ शेतकरी मित्र. अस्सल मराठमोळ्या ग्रामीण भाषेत बोला. उत्तरे छोटी आणि स्पष्ट द्या. खूप बडबड नको. 'राम राम', 'पाटील' असे शब्द वापरा. ${user.crop} पिकाबद्दल आणि हवामानाबद्दल अचूक माहिती द्या. तुमचे बोलणे स्वच्छ आणि स्पष्ट असावे.` 
                    : `You are 'AI Krushi Mitra', a smart and friendly farmer friend. Speak in a warm, rural style in simple English/Hindi. Keep answers short, clear and practical. Use local greetings. Give accurate info about ${user.crop} and weather.`
            },
            callbacks: {
               onopen: () => { 
                  setActive(true);
                  processor.onaudioprocess = (e) => {
                     const blob = createPCMChunk(e.inputBuffer.getChannelData(0));
                     session.sendRealtimeInput({ media: blob });
                  };
               },
               onmessage: async (msg) => {
                  const serverContent = msg.serverContent;
                  
                  // 1. Handle Audio Interruption (User spoke, so stop model)
                  if (serverContent?.interrupted) {
                      sourcesRef.current.forEach(source => {
                          try { source.stop(); } catch(e) {}
                      });
                      sourcesRef.current.clear();
                      nextStartTime.current = 0;
                  }

                  // 2. Handle Audio Output
                  const audioData = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                  if (audioData) {
                     const buffer = await decodeAudioData(decode(audioData), ctxOut, 24000, 1);
                     
                     const source = ctxOut.createBufferSource();
                     source.buffer = buffer;
                     source.connect(ctxOut.destination);
                     
                     // Gapless Playback Logic
                     const currentTime = ctxOut.currentTime;
                     if (nextStartTime.current < currentTime) {
                         nextStartTime.current = currentTime;
                     }
                     
                     source.start(nextStartTime.current);
                     nextStartTime.current += buffer.duration;
                     
                     // Track source to stop on interruption
                     sourcesRef.current.add(source);
                     source.onended = () => {
                         sourcesRef.current.delete(source);
                     };
                  }
               }
            }
         });
         sessionRef.current = session;
       } catch (e) { console.error(e); alert("Microphone access failed."); }
    }
  };

  return (
    <div className="h-full bg-slate-900 text-white flex flex-col relative overflow-hidden">
       <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/30 via-slate-900 to-slate-900 animate-pulse"></div>
          {active && (
             <>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px] animate-scale"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
             </>
          )}
       </div>

       <div className="relative z-10 px-6 pt-6 md:pt-10 flex justify-between items-center max-w-5xl mx-auto w-full">
          <button onClick={onBack} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-90 transition-transform"><ArrowLeft /></button>
          <div className="bg-white/5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md border border-white/5">
            {active ? <span className="text-emerald-400 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/> Live Session</span> : "AI Ready"}
          </div>
          <div className="w-12"></div>
       </div>

       <div className="flex-1 flex flex-col items-center justify-center relative z-10 p-6 space-y-16 max-w-4xl mx-auto w-full">
          <div className="relative group cursor-pointer" onClick={toggleSession}>
             {active && (
                <>
                  <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20 duration-1000"></div>
                  <div className="absolute inset-[-40px] bg-emerald-500/10 rounded-full animate-pulse blur-2xl"></div>
                </>
             )}
             <div className={`w-40 h-40 md:w-56 md:h-56 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(16,185,129,0.2)] transition-all duration-500 relative z-10 border-[8px] ${active ? 'bg-white text-emerald-600 scale-105 border-emerald-400/30' : 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-white/10 hover:scale-105 hover:shadow-[0_0_100px_rgba(16,185,129,0.4)]'}`}>
                {active ? <Mic2 size={64} className="animate-bounce" /> : <Mic size={64} />}
             </div>
          </div>
          
          <div className="text-center space-y-4 animate-enter delay-100">
             <h2 className="text-4xl md:text-5xl font-black tracking-tight">{active ? t.voice_title : t.voice_tap}</h2>
             <p className="text-slate-400 font-medium leading-relaxed text-lg max-w-md mx-auto">{t.voice_desc}</p>
          </div>
       </div>

       {!active && (
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

const SchemesView = ({ lang, onBack }: any) => {
   const t = TRANSLATIONS[lang];
   return (
      <div className="h-full bg-slate-50 overflow-y-auto custom-scrollbar">
         <div className="md:hidden"><Header title={t.schemes_title} subtitle={t.schemes_desc} onBack={onBack} /></div>
         <div className="hidden md:block px-10 pt-10 pb-6">
             <h1 className="text-4xl font-black text-slate-900">{t.schemes_title}</h1>
             <p className="text-slate-500 mt-2 font-medium">{t.schemes_desc}</p>
         </div>
         
         <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            {MOCK_SCHEMES.map((s, i) => (
               <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group animate-enter flex flex-col justify-between" style={{ animationDelay: `${i*100}ms` }}>
                  <div className="flex justify-between items-start mb-4">
                     <div className={`w-14 h-14 rounded-2xl ${s.color} flex items-center justify-center`}>
                        <Landmark size={28} />
                     </div>
                     <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${s.status === 'OPEN' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {s.status === 'OPEN' ? t.open_status : t.closed_status}
                     </span>
                  </div>
                  <div>
                     <h3 className="text-xl font-black text-slate-900 mb-2">{s.title}</h3>
                     <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-400 font-bold">{t.scheme_benefit}:</span>
                           <span className="font-bold text-slate-800">{s.benefit}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-400 font-bold">{t.scheme_deadline}:</span>
                           <span className="font-bold text-slate-800">{s.deadline}</span>
                        </div>
                     </div>
                  </div>
                  <Button fullWidth variant={s.status === 'OPEN' ? 'primary' : 'outline'} disabled={s.status !== 'OPEN'}>
                     {t.apply_btn} <ArrowUpRight size={18}/>
                  </Button>
               </div>
            ))}
         </div>
      </div>
   );
};

const WeatherView = ({ lang, onBack }: any) => {
   const t = TRANSLATIONS[lang];
   return (
      <div className="h-full bg-white overflow-y-auto custom-scrollbar">
         <div className="md:hidden"><Header title="" onBack={onBack} /></div>
         
         <div className="relative bg-gradient-to-br from-blue-600 to-indigo-800 rounded-b-[3rem] md:rounded-[3rem] md:m-8 p-8 pb-12 text-white shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="mt-4 flex flex-col items-center text-center relative z-10 animate-enter">
               <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border border-white/20 shadow-lg">Baramati, Pune</div>
               <Sun size={100} className="text-yellow-300 mb-6 animate-spin-slow drop-shadow-xl"/>
               <h1 className="text-9xl font-black tracking-tighter">28°</h1>
               <p className="text-2xl font-medium opacity-90 mt-2">Sunny & Clear</p>
            </div>
         </div>

         <div className="p-6 md:p-10 -mt-8 relative z-20 max-w-5xl mx-auto">
            <div className="grid grid-cols-3 gap-4 md:gap-8">
               {[
                  { label: t.wind, val: '12 km/h', icon: Wind },
                  { label: t.humidity, val: '45%', icon: Droplets },
                  { label: t.uv_index, val: 'High', icon: Sun },
               ].map((item, i) => (
                  <div key={i} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-50 flex flex-col items-center justify-center gap-3 animate-enter hover:-translate-y-1 transition-transform" style={{ animationDelay: `${i*100}ms` }}>
                     <item.icon size={28} className="text-blue-500" />
                     <span className="font-black text-xl text-slate-800">{item.val}</span>
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                  </div>
               ))}
            </div>
            
            <div className="mt-12">
               <h3 className="font-black text-slate-900 text-xl mb-6 px-2">{t.weather_subtitle}</h3>
               <div className="space-y-4">
                  {['Monday', 'Tuesday', 'Wednesday'].map((d, i) => (
                     <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] animate-enter-right hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-slate-100" style={{ animationDelay: `${i*100 + 300}ms` }}>
                        <span className="font-bold text-slate-700 w-24">{d}</span>
                        <div className="flex items-center gap-3 flex-1 justify-center">
                           <CloudSun size={24} className="text-slate-400"/>
                           <span className="font-bold text-slate-600">Partly Cloudy</span>
                        </div>
                        <span className="font-black text-slate-900 text-lg">26° / 18°</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
   )
}

const DiseaseDetector = ({ lang, onBack }: any) => {
   const t = TRANSLATIONS[lang];
   const [img, setImg] = useState<string | null>(null);
   const [analyzing, setAnalyzing] = useState(false);
   const [result, setResult] = useState<string | null>(null);
   const inputRef = useRef<HTMLInputElement>(null);
   const [dragActive, setDragActive] = useState(false);

   const handleFile = (file: File) => {
      const r = new FileReader();
      r.onload = async (ev) => {
         setImg(ev.target?.result as string);
         setAnalyzing(true);
         const res = await analyzeCropDisease(ev.target?.result as string, lang);
         setResult(res); setAnalyzing(false);
      }
      r.readAsDataURL(file);
   }

   const onDrop = (e: React.DragEvent) => {
      e.preventDefault(); setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
   };

   return (
      <div className="h-full bg-slate-900 text-white overflow-y-auto custom-scrollbar">
         <div className="md:hidden"><Header title="" onBack={onBack} /></div>
         
         <div className="p-6 md:p-12 max-w-6xl mx-auto min-h-screen flex flex-col">
            <div className="hidden md:flex justify-between items-center mb-10">
               <div>
                  <h1 className="text-4xl font-black">{t.scan_title}</h1>
                  <p className="text-slate-400 mt-2">{t.scan_desc}</p>
               </div>
               <button onClick={onBack} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"><X/></button>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-10">
               {/* Upload Area */}
               <div className="flex-1">
                  {!img ? (
                     <div 
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={onDrop}
                        className={`h-[50vh] md:h-[600px] border-4 border-dashed rounded-[3rem] flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden group ${dragActive ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-500'}`}
                     >
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
                        <div className="w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)] mb-8 animate-pulse group-hover:scale-110 transition-transform">
                           <Camera size={40} />
                        </div>
                        <h3 className="text-3xl font-black mb-2">{t.take_photo}</h3>
                        <p className="text-slate-400 font-medium mb-8">{t.upload_text}</p>
                        <button className="px-8 py-3 bg-white text-slate-900 rounded-full font-bold hover:bg-emerald-50 transition-colors">Select File</button>
                        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFile(e.target.files[0])}/>
                     </div>
                  ) : (
                     <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl h-[50vh] md:h-[600px] bg-black">
                        <img src={img} className="w-full h-full object-contain" />
                        {analyzing && (
                           <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm z-20">
                              <Loader2 size={64} className="text-emerald-500 animate-spin mb-6" />
                              <p className="font-bold tracking-widest uppercase text-sm animate-pulse">{t.analyzing}</p>
                           </div>
                        )}
                        <button onClick={() => { setImg(null); setResult(null); }} className="absolute top-6 right-6 bg-black/60 p-3 rounded-full backdrop-blur-md text-white hover:bg-red-600 transition-colors z-30"><X size={24}/></button>
                     </div>
                  )}
               </div>

               {/* Result Area */}
               {result && (
                  <div className="lg:w-[400px] bg-slate-800/50 border border-slate-700 p-8 rounded-[2.5rem] animate-enter-right flex flex-col">
                     <div className="flex items-center gap-4 mb-6 text-emerald-400">
                        <CheckCircle2 size={32} />
                        <span className="font-black text-2xl tracking-tight">{t.analysis_report}</span>
                     </div>
                     <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                         <p className="text-slate-300 leading-relaxed font-medium whitespace-pre-wrap text-lg">{result}</p>
                     </div>
                     <div className="mt-8 pt-6 border-t border-slate-700">
                        <Button fullWidth variant="primary" className="mb-3">{t.save_report}</Button>
                        <Button fullWidth variant="glass">{t.share_expert}</Button>
                     </div>
                  </div>
               )}
            </div>
         </div>
      </div>
   )
}

const AgriBlog = ({onBack, lang, onBlogSelect}: any) => {
   const t = TRANSLATIONS[lang];
   return (
      <div className="h-full bg-slate-50 overflow-y-auto custom-scrollbar">
         <div className="md:hidden"><Header title={t.blog_title} subtitle={t.blog_subtitle} onBack={onBack}/></div>
         <div className="hidden md:block px-10 pt-10 pb-6">
             <h1 className="text-4xl font-black text-slate-900">{t.blog_title}</h1>
             <p className="text-slate-500 mt-2 font-medium">{t.blog_subtitle}</p>
         </div>

         <div className="p-6 md:px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {MOCK_BLOGS.map((b,i) => (
               <div key={b.id} onClick={() => onBlogSelect(b.id)} className="group cursor-pointer bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 flex flex-col">
                  <div className="h-64 overflow-hidden relative">
                     <img src={b.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
                     <div className="absolute top-4 left-4">
                        <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg">{b.category}</span>
                     </div>
                  </div>
                  <div className="p-8 flex-1 flex flex-col">
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">
                         <Clock size={14}/> {b.date} • <UserCircle size={14}/> {b.author}
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 leading-tight mb-4 group-hover:text-emerald-700 transition-colors">{b.title}</h2>
                      <p className="text-slate-500 font-medium line-clamp-3 mb-6 flex-1">{b.intro}</p>
                      <div className="flex items-center text-emerald-600 font-bold text-sm uppercase tracking-wider group-hover:gap-2 transition-all">
                         {t.read_article} <ArrowUpRight size={16} className="ml-1"/>
                      </div>
                  </div>
               </div>
            ))}
         </div>
      </div>
   )
}

const BlogDetailView = ({ blogId, onBack }: { blogId: string, onBack: () => void }) => {
   const blog = MOCK_BLOGS.find(b => b.id === blogId);
   if (!blog) return null;

   return (
      <div className="h-full bg-slate-50 overflow-y-auto custom-scrollbar">
         <div className="relative h-[40vh] md:h-[50vh]">
            <img src={blog.image} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80"></div>
            <button onClick={onBack} className="absolute top-6 left-6 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
               <ArrowLeft size={24} />
            </button>
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 text-white">
               <span className="bg-emerald-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4 inline-block">{blog.category}</span>
               <h1 className="text-3xl md:text-5xl font-black leading-tight mb-4">{blog.title}</h1>
               <div className="flex items-center gap-4 text-sm font-bold opacity-80">
                  <span className="flex items-center gap-2"><UserCircle size={16}/> {blog.author}</span>
                  <span className="flex items-center gap-2"><Clock size={16}/> {blog.date}</span>
               </div>
            </div>
         </div>
         
         <div className="max-w-4xl mx-auto p-6 md:p-12 -mt-10 relative z-10 bg-slate-50 rounded-t-[3rem]">
            <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-sm border border-slate-100">
               <p className="text-xl font-medium text-slate-600 leading-relaxed mb-10">{blog.intro}</p>
               
               {blog.sections.map((section, idx) => (
                  <div key={idx} className="mb-10 animate-enter" style={{ animationDelay: `${idx * 100}ms` }}>
                     <h3 className="text-2xl font-black text-slate-900 mb-4">{section.heading}</h3>
                     <p className="text-lg text-slate-500 leading-relaxed whitespace-pre-line">{section.content}</p>
                  </div>
               ))}

               <div className="mt-12 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <h4 className="font-black text-emerald-800 text-lg mb-2">Conclusion</h4>
                  <p className="text-emerald-700 font-medium">{blog.conclusion}</p>
               </div>
            </div>
         </div>
      </div>
   );
};

// --- MAIN APP LAYOUT ---
export default function App() {
  const [view, setView] = useState<ViewState>('SPLASH');
  const [lang, setLang] = useState<Language>('mr');
  const [user] = useState<UserProfile>({ name: 'Sanjay Pawar', village: 'Baramati', district: 'Pune', landSize: '5', crop: 'Soyabean' });
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);

  // Render view content
  const renderContent = () => {
    switch (view) {
      case 'DASHBOARD': return <Hub lang={lang} user={user} onNavigate={setView} />;
      case 'MARKET': return <MarketView lang={lang} onBack={() => setView('DASHBOARD')} />;
      case 'VOICE_ASSISTANT': return <VoiceAssistant lang={lang} user={user} onBack={() => setView('DASHBOARD')} />;
      case 'WEATHER': return <WeatherView lang={lang} onBack={() => setView('DASHBOARD')} />;
      case 'DISEASE_DETECTOR': return <DiseaseDetector lang={lang} onBack={() => setView('DASHBOARD')} />;
      case 'BLOG': return <AgriBlog lang={lang} onBack={() => setView('DASHBOARD')} onBlogSelect={(id: string) => { setSelectedBlogId(id); setView('BLOG_DETAIL'); }} />;
      case 'BLOG_DETAIL': return selectedBlogId ? <BlogDetailView blogId={selectedBlogId} onBack={() => setView('BLOG')} /> : <AgriBlog lang={lang} onBack={() => setView('DASHBOARD')} onBlogSelect={(id: string) => { setSelectedBlogId(id); setView('BLOG_DETAIL'); }} />;
      case 'SCHEMES': return <SchemesView lang={lang} onBack={() => setView('DASHBOARD')} />;
      default: return <Hub lang={lang} user={user} onNavigate={setView} />;
    }
  };

  if (view === 'SPLASH') return <SplashScreen onComplete={() => setView('LANGUAGE')} />;
  if (view === 'LANGUAGE') return <LangSelect onSelect={(l) => { setLang(l); setView('DASHBOARD'); }} />;

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans selection:bg-emerald-200">
      <Sidebar view={view} setView={setView} lang={lang} />
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
         {renderContent()}
         <MobileNav active={view} setView={setView} lang={lang} />
      </div>
    </div>
  );
}

// --- ONBOARDING ---
const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => { setTimeout(onComplete, 2500); }, []);
  return (
    <div className="h-full w-full bg-emerald-600 flex flex-col items-center justify-center relative overflow-hidden bg-poly-emerald">
       <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center shadow-2xl animate-enter mb-8 rotate-3">
          <Sprout size={64} className="text-emerald-600" />
       </div>
       <h1 className="text-6xl font-black text-white tracking-tighter animate-enter delay-100">Krushi<span className="text-emerald-200">AI</span></h1>
       <p className="text-emerald-100 font-bold uppercase tracking-[0.3em] text-sm mt-4 animate-enter delay-200">Next Gen Farming</p>
    </div>
  );
};

const LangSelect = ({ onSelect }: { onSelect: (l: Language) => void }) => (
  <div className="h-full w-full bg-white flex items-center justify-center p-8 bg-grid-pattern">
     <div className="max-w-md w-full space-y-10 animate-enter">
        <div className="text-center space-y-4">
           <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-xl shadow-emerald-100"><Globe size={40}/></div>
           <h2 className="text-4xl font-black text-slate-900 tracking-tight">Select Language</h2>
           <p className="text-slate-400 font-medium text-lg">Choose your preferred language to continue</p>
        </div>
        <div className="space-y-4">
           {[
              { code: 'mr', label: 'मराठी', sub: 'Marathi' }, 
              { code: 'hi', label: 'हिंदी', sub: 'Hindi' }, 
              { code: 'en', label: 'English', sub: 'English' }
           ].map((l, i) => (
              <button key={l.code} onClick={() => onSelect(l.code as Language)} 
                className="w-full p-6 rounded-[2rem] border border-slate-100 bg-white hover:bg-emerald-600 hover:text-white hover:shadow-2xl hover:shadow-emerald-200/50 transition-all group flex items-center justify-between active:scale-95 shadow-sm"
                style={{ animationDelay: `${i*100}ms` }}>
                 <div className="text-left">
                    <div className="text-2xl font-black">{l.label}</div>
                    <div className="text-xs font-bold uppercase opacity-60 tracking-wider group-hover:text-emerald-100">{l.sub}</div>
                 </div>
                 <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                    <ChevronRight className="opacity-50 group-hover:opacity-100 group-hover:text-white" />
                 </div>
              </button>
           ))}
        </div>
     </div>
  </div>
);
