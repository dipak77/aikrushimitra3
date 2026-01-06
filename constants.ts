
import { Language } from './types';

export const TRANSLATIONS: Record<Language, any> = {
  mr: {
    app_name: "AI कृषी मित्र",
    menu_dashboard: "डॅशबोर्ड",
    menu_market: "बाजार भाव",
    menu_weather: "हवामान",
    menu_crop_doctor: "पीक डॉक्टर",
    menu_knowledge: "कृषी ज्ञान",
    menu_schemes: "योजना",
    menu_voice: "व्हॉइस असिस्टंट",
    
    live_system: "लाईव्ह सिस्टम",
    welcome_title: "नमस्कार,",
    welcome_subtitle: "तुमच्या शेतीचा आजचा अहवाल",
    weather_alert_title: "हवामान इशारा",
    weather_alert_msg: "पुढील २ तासात जोरदार पावसाची शक्यता आहे. काढणी केलेला माल सुरक्षित ठेवा.",
    
    quick_action_doctor: "पीक डॉक्टर",
    quick_action_doctor_desc: "झटपट रोग निदान",
    quick_action_market: "बाजार भाव",
    quick_action_market_desc: "ताजी अपडेट",
    
    govt_schemes: "शासकीय योजना",
    latest_news: "कृषी बातम्या",
    view_all: "सर्व पहा",
    
    schemes_title: "शासकीय योजना",
    schemes_desc: "शेतकऱ्यांसाठी विविध सरकारी योजनांची माहिती",
    scheme_benefit: "फायदा",
    scheme_deadline: "मुदत",
    apply_btn: "अर्ज करा",
    open_status: "सुरू आहे",
    closed_status: "बंद",

    market_title: "बाजार भाव",
    market_subtitle: "तुमच्या जवळील बाजार समित्यांचे भाव",
    price_label: "भाव",
    arrival_label: "आवक",

    weather_title: "हवामान अंदाज",
    weather_subtitle: "पुढील ३ दिवसांचा अंदाज",
    wind: "वारा",
    humidity: "आद्रता",
    uv_index: "उन",

    scan_title: "पीक डॉक्टर",
    scan_desc: "पिकाच्या पानाचा फोटो काढा आणि रोगाचे अचूक निदान मिळवा",
    take_photo: "फोटो काढा",
    upload_text: "किंवा फोटो अपलोड करा",
    analyzing: "तपासणी करत आहे...",
    analysis_report: "तपासणी अहवाल",
    save_report: "अहवाल जतन करा",
    share_expert: "तज्ञांना पाठवा",

    voice_title: "मी ऐकतोय...",
    voice_tap: "बोलण्यासाठी टॅप करा",
    voice_desc: "हवामान, पीक किंवा बाजारभावाबद्दल तुमच्या भाषेत विचारा.",
    voice_hints: [
      "सोयाबीनचा आजचा भाव काय आहे?",
      "आज पाऊस पडेल का?",
      "पीएम किसान योजनेची माहिती द्या",
      "कापसावर कोणती फवारणी करावी?"
    ],

    blog_title: "कृषी ज्ञान भांडार",
    blog_subtitle: "नवीन तंत्रज्ञान आणि यशोगाथा",
    read_article: "लेख वाचा",
    
    author: "लेखक",
    date_format: "दिनांक",
  },
  hi: {
    app_name: "AI कृषि मित्र",
    menu_dashboard: "डैशबोर्ड",
    menu_market: "मंडी भाव",
    menu_weather: "मौसम",
    menu_crop_doctor: "फसल डॉक्टर",
    menu_knowledge: "कृषि ज्ञान",
    menu_schemes: "योजनाएं",
    menu_voice: "वॉयस असिस्टेंट",

    live_system: "लाइव सिस्टम",
    welcome_title: "नमस्ते,",
    welcome_subtitle: "आपकी खेती की आज की रिपोर्ट",
    weather_alert_title: "मौसम चेतावनी",
    weather_alert_msg: "अगले 2 घंटों में भारी बारिश की संभावना है। फसल सुरक्षित करें।",

    quick_action_doctor: "फसल डॉक्टर",
    quick_action_doctor_desc: "त्वरित निदान",
    quick_action_market: "मंडी भाव",
    quick_action_market_desc: "ताज़ा अपडेट",

    govt_schemes: "सरकारी योजनाएं",
    latest_news: "कृषि समाचार",
    view_all: "सभी देखें",

    schemes_title: "सरकारी योजनाएं",
    schemes_desc: "किसानों के लिए विभिन्न सरकारी योजनाओं की जानकारी",
    scheme_benefit: "लाभ",
    scheme_deadline: "समय सीमा",
    apply_btn: "आवेदन करें",
    open_status: "खुला है",
    closed_status: "बंद",

    market_title: "मंडी भाव",
    market_subtitle: "आपके नजदीकी मंडी के भाव",
    price_label: "भाव",
    arrival_label: "आवक",

    weather_title: "मौसम पूर्वानुमान",
    weather_subtitle: "अगले 3 दिनों का अनुमान",
    wind: "हवा",
    humidity: "नमी",
    uv_index: "धूप",

    scan_title: "फसल डॉक्टर",
    scan_desc: "फसल की पत्ती की फोटो लें और बीमारी का सटीक निदान पाएं",
    take_photo: "फोटो लें",
    upload_text: "या फोटो अपलोड करें",
    analyzing: "जांच कर रहा है...",
    analysis_report: "जांच रिपोर्ट",
    save_report: "रिपोर्ट सेव करें",
    share_expert: "विशेषज्ञ को भेजें",

    voice_title: "मैं सुन रहा हूँ...",
    voice_tap: "बोलने के लिए टैप करें",
    voice_desc: "मौसम, फसल या बाजार भाव के बारे में अपनी भाषा में पूछें।",
    voice_hints: [
      "सोयाबीन का आज का भाव क्या है?",
      "क्या आज बारिश होगी?",
      "पीएम किसान योजना की जानकारी दें",
      "कपास पर कौन सा छिड़काव करें?"
    ],

    blog_title: "कृषि ज्ञान केंद्र",
    blog_subtitle: "नई तकनीक और सफलता की कहानियाँ",
    read_article: "लेख पढ़ें",

    author: "लेखक",
    date_format: "दिनांक",
  },
  en: {
    app_name: "AI Krushi Mitra",
    menu_dashboard: "Dashboard",
    menu_market: "Market",
    menu_weather: "Weather",
    menu_crop_doctor: "Crop Doctor",
    menu_knowledge: "Knowledge",
    menu_schemes: "Schemes",
    menu_voice: "Voice Assistant",

    live_system: "Live System",
    welcome_title: "Hello,",
    welcome_subtitle: "Here's your smart farming summary",
    weather_alert_title: "Weather Alert",
    weather_alert_msg: "Heavy rain expected in next 2 hours. Secure harvested crops.",

    quick_action_doctor: "Crop Doctor",
    quick_action_doctor_desc: "Instant Diagnosis",
    quick_action_market: "Market Rates",
    quick_action_market_desc: "Live Updates",

    govt_schemes: "Govt Schemes",
    latest_news: "Agri News",
    view_all: "View All",

    schemes_title: "Government Schemes",
    schemes_desc: "Benefits and subsidies for farmers",
    scheme_benefit: "Benefit",
    scheme_deadline: "Deadline",
    apply_btn: "Apply Now",
    open_status: "Open",
    closed_status: "Closed",

    market_title: "Market Rates",
    market_subtitle: "Live prices from local Mandis",
    price_label: "Price",
    arrival_label: "Arrival",

    weather_title: "Weather Forecast",
    weather_subtitle: "Forecast for next 3 days",
    wind: "Wind",
    humidity: "Humidity",
    uv_index: "UV Index",

    scan_title: "Crop Doctor",
    scan_desc: "Upload a photo of your crop leaf for instant diagnosis",
    take_photo: "Take Photo",
    upload_text: "or drag and drop here",
    analyzing: "Analyzing...",
    analysis_report: "Analysis Report",
    save_report: "Save Report",
    share_expert: "Share with Expert",

    voice_title: "I'm listening...",
    voice_tap: "Tap to Speak",
    voice_desc: "Ask about weather, crops, or market rates in your language.",
    voice_hints: [
      "What is the soyabean rate?",
      "Will it rain today?",
      "Explain PM Kisan Scheme",
      "Identify crop disease"
    ],

    blog_title: "Knowledge Hub",
    blog_subtitle: "Latest farming techniques",
    read_article: "Read Article",

    author: "Author",
    date_format: "Date",
  }
};
