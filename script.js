const configuredApiURL = document.querySelector('meta[name="gohar-api-url"]')?.content.trim().replace(/\/+$/, "");
const isLocalFrontendPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port !== "8000";
const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_URL = isLocalFrontendPreview
  ? "http://" + window.location.hostname + ":8000"
  : isLocalHost ? window.location.origin : configuredApiURL || window.location.origin;
const LANGUAGES = {
  en: { name: "English", native: "English", voice: "en-IN", direction: "ltr" },
  hi: { name: "Hindi", native: "हिंदी", voice: "hi-IN", direction: "ltr" },
  ur: { name: "Urdu", native: "اردو", voice: "ur-PK", direction: "rtl" },
  bn: { name: "Bengali", native: "বাংলা", voice: "bn-IN", direction: "ltr" },
  ta: { name: "Tamil", native: "தமிழ்", voice: "ta-IN", direction: "ltr" },
  te: { name: "Telugu", native: "తెలుగు", voice: "te-IN", direction: "ltr" },
  mr: { name: "Marathi", native: "मराठी", voice: "mr-IN", direction: "ltr" },
  gu: { name: "Gujarati", native: "ગુજરાતી", voice: "gu-IN", direction: "ltr" },
  kn: { name: "Kannada", native: "ಕನ್ನಡ", voice: "kn-IN", direction: "ltr" },
  ml: { name: "Malayalam", native: "മലയാളം", voice: "ml-IN", direction: "ltr" },
  pa: { name: "Punjabi", native: "ਪੰਜਾਬੀ", voice: "pa-IN", direction: "ltr" },
  or: { name: "Odia", native: "ଓଡ଼ିଆ", voice: "or-IN", direction: "ltr" },
  as: { name: "Assamese", native: "অসমীয়া", voice: "as-IN", direction: "ltr" },
  ks: { name: "Kashmiri", native: "कॉशुर", voice: "ks-IN", direction: "rtl" },
  sd: { name: "Sindhi", native: "سنڌي", voice: "sd-IN", direction: "rtl" },
  ne: { name: "Nepali", native: "नेपाली", voice: "ne-NP", direction: "ltr" },
  sa: { name: "Sanskrit", native: "संस्कृतम्", voice: "sa-IN", direction: "ltr" },
  es: { name: "Spanish", native: "Español", voice: "es-ES", direction: "ltr" },
  fr: { name: "French", native: "Français", voice: "fr-FR", direction: "ltr" },
  ar: { name: "Arabic", native: "العربية", voice: "ar-SA", direction: "rtl" },
};
const form = document.querySelector("#chatForm");
const input = document.querySelector("#question");
const sendButton = document.querySelector("#sendButton");
const voiceButton = document.querySelector("#voiceButton");
const hint = document.querySelector("#inputHint");
const welcome = document.querySelector("#welcome");
const conversation = document.querySelector("#conversation");
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const farmFields = [
  { id: "farmCrop", label: "cropLabel", placeholder: "cropPlaceholder", voiceLabel: "cropVoice" },
  { id: "farmLocation", label: "locationLabel", placeholder: "locationPlaceholder", voiceLabel: "locationVoice" },
  { id: "farmStage", label: "stageLabel", placeholder: "stagePlaceholder", voiceLabel: "stageVoice" },
  { id: "farmSymptoms", label: "symptomsLabel", placeholder: "symptomsPlaceholder", voiceLabel: "symptomsVoice" },
];
let language = "hi";
try {
  const savedLanguage = localStorage.getItem("gohar-language");
  if (savedLanguage && LANGUAGES[savedLanguage]) language = savedLanguage;
} catch { /* Browser storage may be disabled for local files. */ }
let recognition = null;
let activeTarget = null;
let activeMicButton = null;
let isListening = false;
let voiceNoSpeech = false;
let voiceDraft = "";
let mediaStream = null;
let mediaRecorder = null;
const HISTORY_KEY = "gohar-chat-history";
const HISTORY_LIMIT = 12;
const HISTORY_MESSAGE_LIMIT = 30;
let chatHistory = [];
let activeChatId = null;
try {
  const savedHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  if (Array.isArray(savedHistory)) {
    chatHistory = savedHistory
      .filter((chat) => chat && typeof chat.id === "string" && Array.isArray(chat.messages))
      .slice(0, HISTORY_LIMIT);
  }
} catch { /* Continue with an empty history if browser storage is unavailable. */ }

const copy = {
  hi: {
    eyebrow: "✦ &nbsp; किसानों के लिए, किसानों की भाषा में",
    title: "नमस्ते, <em>किसान भाई!</em>",
    intro: "आज खेत में क्या दिक्कत है? अपना सवाल पूछिए।<br>गोहर खेती की जानकारी समझने में आपकी मदद करेगा।",
    placeholder: "अपना सवाल यहाँ लिखें…",
    hint: "✦ हिंदी या अवधी में पूछें",
    listening: "सुन रहा हूँ… अब बोलें",
    thinking: "गोहर जवाब तैयार कर रहा है…",
    mic: "🎙", micLabel: "बोलकर सवाल पूछें", sendLabel: "सवाल भेजें",
    farmerForm: "खेत की जानकारी", optional: "(वैकल्पिक)",
    crop: "फसल", cropPlaceholder: "जैसे गेहूँ", cropVoice: "फसल का नाम बोलें",
    location: "गाँव / ज़िला", locationPlaceholder: "गाँव या ज़िला", locationVoice: "गाँव या ज़िला बोलें",
    stage: "फसल की उम्र / अवस्था", stagePlaceholder: "जैसे 30 दिन, फूल आना", stageVoice: "फसल की उम्र या अवस्था बोलें",
    symptoms: "दिक्कत / लक्षण", symptomsPlaceholder: "क्या बदलाव दिख रहा है?", symptomsVoice: "फसल की दिक्कत या लक्षण बोलें",
    topics: [["फसल की दिक्कत", "पीले पत्ते या कम बढ़त"], ["खाद की सलाह", "समय और फसल की अवस्था"], ["मौसम की जानकारी", "बारिश और सावधानी"], ["कीड़े और रोग", "संभावित कारण और अगले कदम"]],
    prompts: ["गेहूँ के पत्ते पीले पड़ रहे हैं, क्या करूँ?", "गेहूँ में खाद कब और कैसे देनी चाहिए?", "मेरे खेत के लिए मौसम की जानकारी कैसे देखूँ?", "सरसों की फसल में कीड़े दिख रहे हैं, क्या जाँच करूँ?"],
    detailsHeading: "किसान के खेत की जानकारी", questionHeading: "सवाल",
    openError: "इस ब्राउज़र में आवाज़ से सवाल लेना उपलब्ध नहीं है। Chrome या Edge में कोशिश करें।",
    micError: "माइक शुरू नहीं हो पाया। ब्राउज़र की microphone permission जाँचें।",
    voiceLanguageError: "इस भाषा की आवाज़ पहचान आपके ब्राउज़र में उपलब्ध नहीं है। दूसरी भाषा चुनें या सवाल लिखें।",
    micDenied: "माइक की अनुमति नहीं मिली। ब्राउज़र की साइट सेटिंग में microphone अनुमति दें।",
    connection: "गोहर सर्वर से जुड़ नहीं पा रहा। Backend चालू करके फिर कोशिश करें।",
    routeNotFound: "Backend में /chat नहीं मिला ({url})। Frontend की API URL को FastAPI backend पर सेट करें।",
    retry: "सवाल भेजा नहीं जा सका। कृपया फिर कोशिश करें।",
    transcriptReady: "आवाज़ का पाठ नीचे है—जाँचकर भेजें।", noSpeech: "आवाज़ सुनाई नहीं दी। माइक दबाकर फिर बोलें।", voiceUnavailable: "आवाज़ से लिखने के लिए यह पेज Chrome या Edge में खोलें.",
    spoken: "जवाब सुनें", source: "स्रोत", fallback: "AI मॉडल अभी उपलब्ध नहीं है", ai: "गोहर AI",
    newChat: "नई बातचीत", history: "हाल की बातचीत", emptyHistory: "आपकी बातचीत यहाँ दिखेगी।", openHistory: "बातचीत का इतिहास खोलें",
    season: "मौसम / सीज़न", seasonPlaceholder: "सीज़न चुनें (वैकल्पिक)",
  },
  en: {
    eyebrow: "✦ &nbsp; FARMING GUIDANCE IN YOUR LANGUAGE",
    title: "Hello, <em>farmer!</em>",
    intro: "What’s happening in your field today? Ask Gohar a question.<br>Gohar can help you understand farming information.",
    placeholder: "Type your question here…",
    hint: "✦ Ask in Hindi, Awadhi, or English",
    listening: "Listening… speak now",
    thinking: "Gohar is preparing an answer…",
    mic: "🎙", micLabel: "Ask by voice", sendLabel: "Send question",
    farmerForm: "Farm details", optional: "(optional)",
    crop: "Crop", cropPlaceholder: "e.g. wheat", cropVoice: "Speak crop name",
    location: "Village / district", locationPlaceholder: "Village or district", locationVoice: "Speak village or district",
    stage: "Crop age / stage", stagePlaceholder: "e.g. 30 days, flowering", stageVoice: "Speak crop age or stage",
    symptoms: "Problem / symptoms", symptomsPlaceholder: "What changes are you seeing?", symptomsVoice: "Speak the crop problem or symptoms",
    topics: [["Crop problem", "Yellow leaves or slow growth"], ["Fertilizer advice", "Timing and crop stage"], ["Weather information", "Rain and precautions"], ["Pests and disease", "Possible causes and next steps"]],
    prompts: ["Why are my wheat leaves turning yellow?", "When and how should I fertilize wheat?", "How can I check weather information for my farm?", "What should I check if I see pests on mustard?"],
    detailsHeading: "Farmer and field details", questionHeading: "Question",
    openError: "Voice input is unavailable in this browser. Try Chrome or Edge.",
    micError: "Could not start the microphone. Check your browser’s microphone permission.",
    voiceLanguageError: "Voice recognition for this language is not available in your browser. Choose another language or type your question.",
    micDenied: "Microphone access was blocked. Allow microphone access in your browser’s site settings.",
    connection: "Can’t connect to the Gohar server. Start the backend and try again.",
    routeNotFound: "The backend has no /chat route at {url}. Set the frontend API URL to your FastAPI backend.",
    retry: "Could not send your question. Please try again.",
    transcriptReady: "Your speech is in the box—review it, then send.", noSpeech: "No speech detected. Tap the microphone and try again.", voiceUnavailable: "Voice typing is unavailable here. Open this page in Chrome or Edge.",
    spoken: "Listen to answer", source: "Source", fallback: "AI model unavailable", ai: "Gohar AI",
    newChat: "New conversation", history: "RECENT CHATS", emptyHistory: "Your conversations will appear here.", openHistory: "Open chat history",
    season: "Growing season", seasonPlaceholder: "Choose season (optional)",
  },
};

const UI_TRANSLATION_CACHE_KEY = "gohar-ui-translations-v1";
const UI_TEXT_ATTRIBUTES = ["placeholder", "title", "aria-label", "aria-description", "data-prompt"];
const uiTextSources = new Map();
const uiAttributeSources = new Map();
let uiTranslations = {};
const BUILT_IN_URDU_UI = {
  "✦ &nbsp; FARMING GUIDANCE IN YOUR LANGUAGE": "✦ &nbsp; آپ کی زبان میں زرعی رہنمائی",
  "Hello, <em>farmer!</em>": "السلام علیکم، <em>کسان بھائی!</em>",
  "What’s happening in your field today? Ask Gohar a question.<br>Gohar can help you understand farming information.": "آج آپ کے کھیت میں کیا مسئلہ ہے؟ گوہر سے سوال پوچھیں۔<br>گوہر کھیتی باڑی کی معلومات سمجھنے میں آپ کی مدد کر سکتا ہے۔",
  "Type your question here…": "اپنا سوال یہاں لکھیں…",
  "✦ Ask in Hindi, Awadhi, or English": "✦ ہندی، اودھی یا انگریزی میں پوچھیں",
  "Listening… speak now": "سن رہا ہوں… اب بولیں",
  "Gohar is preparing an answer…": "گوہر جواب تیار کر رہا ہے…",
  "Ask by voice": "بول کر سوال پوچھیں",
  "Send question": "سوال بھیجیں",
  "Farm details": "کھیت کی معلومات",
  "(optional)": "(اختیاری)",
  "Crop": "فصل",
  "e.g. wheat": "مثلاً گندم",
  "Speak crop name": "فصل کا نام بولیں",
  "Village / district": "گاؤں / ضلع",
  "Village or district": "گاؤں یا ضلع",
  "Speak village or district": "گاؤں یا ضلع بولیں",
  "Crop age / stage": "فصل کی عمر / مرحلہ",
  "e.g. 30 days, flowering": "مثلاً ۳۰ دن، پھول آنے کا وقت",
  "Speak crop age or stage": "فصل کی عمر یا مرحلہ بولیں",
  "Problem / symptoms": "مسئلہ / علامات",
  "What changes are you seeing?": "آپ کو کیا تبدیلی نظر آ رہی ہے؟",
  "Speak the crop problem or symptoms": "فصل کا مسئلہ یا علامات بولیں",
  "Crop problem": "فصل کا مسئلہ",
  "Yellow leaves or slow growth": "پتے پیلے یا بڑھوتری سست",
  "Fertilizer advice": "کھاد کا مشورہ",
  "Timing and crop stage": "وقت اور فصل کا مرحلہ",
  "Weather information": "موسم کی معلومات",
  "Rain and precautions": "بارش اور احتیاط",
  "Pests and disease": "کیڑے اور بیماریاں",
  "Possible causes and next steps": "ممکنہ وجوہات اور اگلے اقدامات",
  "Why are my wheat leaves turning yellow?": "گندم کے پتے پیلے کیوں ہو رہے ہیں؟",
  "When and how should I fertilize wheat?": "گندم میں کھاد کب اور کیسے ڈالنی چاہیے؟",
  "How can I check weather information for my farm?": "میں اپنے کھیت کے لیے موسم کی معلومات کیسے دیکھوں؟",
  "What should I check if I see pests on mustard?": "سرسوں میں کیڑے نظر آئیں تو کیا جانچنا چاہیے؟",
  "Farmer and field details": "کسان اور کھیت کی معلومات",
  "Question": "سوال",
  "Voice input is unavailable in this browser. Try Chrome or Edge.": "اس براؤزر میں آواز سے سوال پوچھنا دستیاب نہیں۔ Chrome یا Edge میں کوشش کریں۔",
  "Could not start the microphone. Check your browser’s microphone permission.": "مائیکروفون شروع نہیں ہو سکا۔ براؤزر میں مائیکروفون کی اجازت چیک کریں۔",
  "Voice recognition for this language is not available in your browser. Choose another language or type your question.": "آپ کے براؤزر میں اس زبان کی آواز کی شناخت دستیاب نہیں۔ دوسری زبان منتخب کریں یا سوال لکھیں۔",
  "Microphone access was blocked. Allow microphone access in your browser’s site settings.": "مائیکروفون کی اجازت بند ہے۔ براؤزر کی سائٹ ترتیبات میں اجازت دیں۔",
  "Can’t connect to the Gohar server. Start the backend and try again.": "گوہر سرور سے رابطہ نہیں ہو رہا۔ بیک اینڈ شروع کرکے دوبارہ کوشش کریں۔",
  "Could not send your question. Please try again.": "آپ کا سوال نہیں بھیجا جا سکا۔ دوبارہ کوشش کریں۔",
  "Your speech is in the box—review it, then send.": "آپ کی آواز کا متن درج ہے—جائزہ لے کر بھیجیں۔",
  "No speech detected. Tap the microphone and try again.": "آواز نہیں سنی گئی۔ مائیکروفون دبا کر دوبارہ بولیں۔",
  "Listen to answer": "جواب سنیں",
  "Source": "ماخذ",
  "AI model unavailable": "اے آئی ماڈل دستیاب نہیں",
  "Gohar AI": "گوہر اے آئی",
  "New conversation": "نئی گفتگو",
  "RECENT CHATS": "حالیہ گفتگو",
  "Your conversations will appear here.": "آپ کی گفتگو یہاں دکھائی دے گی۔",
  "Open chat history": "گفتگو کی تاریخ کھولیں",
  "Growing season": "فصل کا موسم",
  "Choose season (optional)": "موسم منتخب کریں (اختیاری)",
  "Ask Gohar": "گوہر سے پوچھیں",
  "Season & fertilizer guide": "موسم اور کھاد کی رہنمائی",
  "YOUR FARMING ASSISTANT": "آپ کا زرعی معاون",
  "RECENT CHATS": "حالیہ گفتگو",
  "Your conversations will appear here.": "آپ کی گفتگو یہاں دکھائی دے گی۔",
  "Season alerts & fertilizer guide": "موسمی رہنمائی اور کھاد کا مشورہ",
  "Choose a season and crop to see practical checks, nutrient roles and trusted references.": "عملی جانچ، غذائی اجزا کے کردار اور مستند معلومات کے لیے موسم اور فصل منتخب کریں۔",
  "SEASON WATCH": "موسم پر نظر",
  "Seasonal field checklist": "موسم کے مطابق کھیت کی فہرست",
  "Kharif · Monsoon": "خریف · برسات",
  "Rabi · Winter": "ربیع · سردی",
  "Zaid · Summer": "زائد · گرمی",
  "Seasonal reminders, not live weather or pest alerts. Check the local KVK/IMD advisory before acting.": "یہ موسمی یاددہانیاں ہیں، براہِ راست موسم یا کیڑوں کی اطلاع نہیں۔ عمل سے پہلے مقامی زرعی مرکز کی ہدایت دیکھیں۔",
  "CROP NUTRITION": "فصل کی غذائیت",
  "Best fertilizer sources, by crop": "فصل کے لحاظ سے کھاد کے ذرائع",
  "Choose crop": "فصل منتخب کریں",
  "There is no single “best fertilizer” for every field. Use your Soil Health Card and crop/region package for rates; confirm unfamiliar products with a KVK or agriculture officer.": "ہر کھیت کے لیے ایک ہی بہترین کھاد نہیں ہوتی۔ مقدار کے لیے مٹی کی صحت کا کارڈ اور مقامی زرعی سفارشات دیکھیں؛ غیر مانوس مصنوعات کی تصدیق زرعی افسر سے کریں۔",
  "Wheat · गेहूँ": "گندم",
  "Rice · धान": "چاول",
  "Maize · मक्का": "مکئی",
  "Mustard · सरसों": "سرسوں",
  "Pulses · दलहन": "دالیں",
  "English": "انگریزی",
};
if (!uiTranslations.ur) uiTranslations.ur = {};
Object.assign(uiTranslations.ur, BUILT_IN_URDU_UI);
const BUILT_IN_MARATHI_UI = {
  "✦ &nbsp; FARMING GUIDANCE IN YOUR LANGUAGE": "✦ &nbsp; तुमच्या भाषेत शेतीविषयक मार्गदर्शन",
  "Hello, <em>farmer!</em>": "नमस्कार, <em>शेतकरी मित्रा!</em>",
  "What’s happening in your field today? Ask Gohar a question.<br>Gohar can help you understand farming information.": "आज तुमच्या शेतात काय समस्या आहे? गोहरला प्रश्न विचारा.<br>शेतीविषयक माहिती समजून घेण्यासाठी गोहर मदत करेल.",
  "Type your question here…": "तुमचा प्रश्न येथे लिहा…",
  "✦ Ask in Hindi, Awadhi, or English": "✦ हिंदी, अवधी किंवा इंग्रजीत विचारा",
  "Listening… speak now": "ऐकत आहे… आता बोला",
  "Gohar is preparing an answer…": "गोहर उत्तर तयार करत आहे…",
  "Ask by voice": "बोलून प्रश्न विचारा",
  "Send question": "प्रश्न पाठवा",
  "Farm details": "शेताची माहिती",
  "(optional)": "(ऐच्छिक)",
  "Crop": "पीक",
  "e.g. wheat": "उदा. गहू",
  "Speak crop name": "पिकाचे नाव बोला",
  "Village / district": "गाव / जिल्हा",
  "Village or district": "गाव किंवा जिल्हा",
  "Speak village or district": "गाव किंवा जिल्हा बोला",
  "Crop age / stage": "पिकाचे वय / अवस्था",
  "e.g. 30 days, flowering": "उदा. ३० दिवस, फुलोरा",
  "Speak crop age or stage": "पिकाचे वय किंवा अवस्था बोला",
  "Problem / symptoms": "समस्या / लक्षणे",
  "What changes are you seeing?": "तुम्हाला कोणते बदल दिसत आहेत?",
  "Speak the crop problem or symptoms": "पिकाची समस्या किंवा लक्षणे बोला",
  "Crop problem": "पिकाची समस्या",
  "Yellow leaves or slow growth": "पाने पिवळी किंवा वाढ मंद",
  "Fertilizer advice": "खताचा सल्ला",
  "Timing and crop stage": "वेळ आणि पिकाची अवस्था",
  "Weather information": "हवामानाची माहिती",
  "Rain and precautions": "पाऊस आणि काळजी",
  "Pests and disease": "किडी आणि रोग",
  "Possible causes and next steps": "संभाव्य कारणे आणि पुढील उपाय",
  "Why are my wheat leaves turning yellow?": "गव्हाची पाने पिवळी का पडत आहेत?",
  "When and how should I fertilize wheat?": "गव्हाला खत कधी आणि कसे द्यावे?",
  "How can I check weather information for my farm?": "माझ्या शेतासाठी हवामानाची माहिती कशी पाहू?",
  "What should I check if I see pests on mustard?": "मोहरीच्या पिकावर कीड दिसल्यास काय तपासावे?",
  "Farmer and field details": "शेतकरी आणि शेताची माहिती",
  "Question": "प्रश्न",
  "Voice input is unavailable in this browser. Try Chrome or Edge.": "या ब्राउझरमध्ये आवाजाद्वारे प्रश्न विचारता येत नाही. Chrome किंवा Edge वापरून पाहा.",
  "Could not start the microphone. Check your browser’s microphone permission.": "मायक्रोफोन सुरू झाला नाही. ब्राउझरमधील मायक्रोफोन परवानगी तपासा.",
  "Voice recognition for this language is not available in your browser. Choose another language or type your question.": "तुमच्या ब्राउझरमध्ये या भाषेची आवाज ओळख उपलब्ध नाही. दुसरी भाषा निवडा किंवा प्रश्न लिहा.",
  "Microphone access was blocked. Allow microphone access in your browser’s site settings.": "मायक्रोफोनची परवानगी बंद आहे. ब्राउझरच्या साइट सेटिंग्जमध्ये परवानगी द्या.",
  "Can’t connect to the Gohar server. Start the backend and try again.": "गोहर सर्व्हरशी जोडता येत नाही. बॅकएंड सुरू करून पुन्हा प्रयत्न करा.",
  "Could not send your question. Please try again.": "तुमचा प्रश्न पाठवता आला नाही. कृपया पुन्हा प्रयत्न करा.",
  "Your speech is in the box—review it, then send.": "तुमचे बोलणे मजकूरात आले आहे—तपासून पाठवा.",
  "No speech detected. Tap the microphone and try again.": "आवाज ऐकू आला नाही. मायक्रोफोन दाबून पुन्हा बोला.",
  "Listen to answer": "उत्तर ऐका",
  "Source": "स्रोत",
  "AI model unavailable": "एआय मॉडेल उपलब्ध नाही",
  "Gohar AI": "गोहर एआय",
  "New conversation": "नवीन संभाषण",
  "RECENT CHATS": "अलीकडील संभाषणे",
  "Your conversations will appear here.": "तुमची संभाषणे येथे दिसतील.",
  "Open chat history": "संभाषणाचा इतिहास उघडा",
  "Growing season": "हंगाम",
  "Choose season (optional)": "हंगाम निवडा (ऐच्छिक)",
  "Ask Gohar": "गोहरला विचारा",
  "Season & fertilizer guide": "हंगाम आणि खत मार्गदर्शक",
  "YOUR FARMING ASSISTANT": "तुमचा शेती सहाय्यक",
  "Season alerts & fertilizer guide": "हंगामी सूचना आणि खत मार्गदर्शक",
  "Choose a season and crop to see practical checks, nutrient roles and trusted references.": "उपयुक्त तपासण्या, पोषक घटकांची माहिती आणि विश्वसनीय संदर्भ पाहण्यासाठी हंगाम व पीक निवडा.",
  "SEASON WATCH": "हंगामावर लक्ष",
  "Seasonal field checklist": "हंगामानुसार शेत तपासणी",
  "Kharif · Monsoon": "खरीप · पावसाळा",
  "Rabi · Winter": "रब्बी · हिवाळा",
  "Zaid · Summer": "उन्हाळी · उन्हाळा",
  "CROP NUTRITION": "पीक पोषण",
  "Best fertilizer sources, by crop": "पिकानुसार खतांचे स्रोत",
  "Choose crop": "पीक निवडा",
  "There is no single “best fertilizer” for every field. Use your Soil Health Card and crop/region package for rates; confirm unfamiliar products with a KVK or agriculture officer.": "प्रत्येक शेतासाठी एकच सर्वोत्तम खत नसते. मात्रेसाठी मृदा आरोग्य पत्रिका आणि स्थानिक पीक शिफारसी पाहा; अपरिचित उत्पादनाची कृषी अधिकाऱ्याकडून खात्री करा.",
  "Wheat · गेहूँ": "गहू",
  "Rice · धान": "भात",
  "Maize · मक्का": "मका",
  "Mustard · सरसों": "मोहरी",
  "Pulses · दलहन": "कडधान्ये",
  "English": "इंग्रजी",
};
if (!uiTranslations.mr) uiTranslations.mr = {};
Object.assign(uiTranslations.mr, BUILT_IN_MARATHI_UI);
let localizationRevision = 0;
try {
  const savedTranslations = JSON.parse(localStorage.getItem(UI_TRANSLATION_CACHE_KEY) || "{}");
  if (savedTranslations && typeof savedTranslations === "object" && !Array.isArray(savedTranslations)) {
    uiTranslations = {
      ...savedTranslations,
      ...uiTranslations,
      ur: { ...(savedTranslations.ur || {}), ...(uiTranslations.ur || {}) },
      mr: { ...(savedTranslations.mr || {}), ...(uiTranslations.mr || {}) },
    };
  }
} catch { /* The language cache is optional. */ }

function translateCopy(value, translations) {
  if (typeof value === "string") return translations[value] || value;
  if (Array.isArray(value)) return value.map((item) => translateCopy(item, translations));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, translateCopy(item, translations)]));
  return value;
}

function words() {
  if (language === "hi") return copy.hi;
  if (language === "en") return copy.en;
  return translateCopy(copy.en, uiTranslations[language] || {});
}

function cachedTranslation(source, target = language) {
  if (target === "en") return source;
  return uiTranslations[target]?.[source] || source;
}

function isAlreadyLocalized(value, original, target) {
  const translations = uiTranslations[target] || {};
  const known = translations[original];
  return Boolean((typeof known === "string" && value.startsWith(known)) || Object.values(translations).some((translation) => typeof translation === "string" && translation && value.includes(translation)));
}

function questionHint() {
  if (language === "hi") return words().hint;
  if (language === "en") return "✦ Replies and voice in English";
  const source = "✦ Reply language: " + LANGUAGES[language].native + " · Voice: " + LANGUAGES[language].native;
  return cachedTranslation(source);
}

function excludedFromInterfaceTranslation(element) {
  return Boolean(element?.closest(".brand, .mobile-brand, #conversation, #chatHistory, .site-credit, script, style, svg, #languageSelect option"));
}

function collectInterfaceParts() {
  const parts = [];
  const root = document.querySelector(".layout");
  if (!root) return parts;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (excludedFromInterfaceTranslation(node.parentElement) || !node.nodeValue.trim()) continue;
    if (!uiTextSources.has(node)) uiTextSources.set(node, node.nodeValue);
    const value = node.nodeValue;
    const original = uiTextSources.get(node);
    if (value !== original && (language === "hi" || isAlreadyLocalized(value, original, language))) continue;
    if (/[A-Za-z]/.test(value)) parts.push({ source: value, set: (translated) => { node.nodeValue = translated; }, connected: () => node.isConnected });
  }
  root.querySelectorAll("*").forEach((element) => {
    if (excludedFromInterfaceTranslation(element)) return;
    let sources = uiAttributeSources.get(element);
    if (!sources) {
      sources = new Map();
      uiAttributeSources.set(element, sources);
    }
    UI_TEXT_ATTRIBUTES.forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return;
      if (!sources.has(attribute)) sources.set(attribute, element.getAttribute(attribute));
      const value = element.getAttribute(attribute);
      const original = sources.get(attribute);
      if (value !== original && (language === "hi" || isAlreadyLocalized(value, original, language))) return;
      if (value && /[A-Za-z]/.test(value)) parts.push({ source: value, set: (translated) => element.setAttribute(attribute, translated), connected: () => element.isConnected });
    });
  });
  const sourceTitle = document.documentElement.dataset.goharTitleSource || document.title;
  document.documentElement.dataset.goharTitleSource = sourceTitle;
  if (/[A-Za-z]/.test(document.title)) parts.push({ source: document.title, set: (translated) => { document.title = translated; }, connected: () => true });
  return parts;
}

function restoreInterfaceSources() {
  uiTextSources.forEach((source, node) => { if (node.isConnected) node.nodeValue = source; });
  uiAttributeSources.forEach((sources, element) => {
    if (element.isConnected) sources.forEach((source, attribute) => element.setAttribute(attribute, source));
  });
  if (document.documentElement.dataset.goharTitleSource) document.title = document.documentElement.dataset.goharTitleSource;
}

function saveTranslationCache() {
  try { localStorage.setItem(UI_TRANSLATION_CACHE_KEY, JSON.stringify(uiTranslations)); } catch { /* Keep translations available for this session. */ }
}

async function translateMissingStrings(target, strings, revision) {
  if (!uiTranslations[target]) uiTranslations[target] = {};
  const unique = [...new Set(strings)].filter((source) => source && !uiTranslations[target][source]);
  const batchSize = 8;
  for (let start = 0; start < unique.length; start += batchSize) {
    if (revision !== localizationRevision) return false;
    const batch = unique.slice(start, start + batchSize);
    const response = await fetch(`${API_URL}/translate-ui`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: target, texts: batch }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof payload.detail === "string" ? payload.detail : `Translation service error (${response.status})`);
    if (!Array.isArray(payload.translations) || payload.translations.length !== batch.length) throw new Error("The local model returned an incomplete translation.");
    batch.forEach((source, index) => { uiTranslations[target][source] = payload.translations[index] || source; });
    saveTranslationCache();
  }
  return revision === localizationRevision;
}

function showLanguageNotice(message, duration = 6500) {
  let notice = document.querySelector("#languageNotice");
  if (!notice) {
    notice = document.createElement("div");
    notice.id = "languageNotice";
    notice.className = "language-toast";
    notice.setAttribute("role", "status");
    document.body.append(notice);
  }
  notice.textContent = message;
  notice.classList.add("visible");
  window.clearTimeout(notice.hideTimer);
  if (duration > 0) notice.hideTimer = window.setTimeout(() => notice.classList.remove("visible"), duration);
}

async function localizeInterface() {
  const target = language;
  const revision = ++localizationRevision;
  if (target === "en" || target === "hi") {
    // English and Hindi are bundled with the page; do not call Ollama on startup.
    applyLanguage();
    renderHistory();
    document.querySelector("#languageNotice")?.classList.remove("visible");
    return;
  }
  if (["ur", "mr"].includes(target)) {
    // Urdu and Marathi labels are bundled with the frontend and remain available offline.
    applyLanguage();
    renderHistory();
    collectInterfaceParts().forEach((part) => {
      if (part.connected() && uiTranslations[target][part.source]) part.set(uiTranslations[target][part.source]);
    });
    document.title = cachedTranslation(document.documentElement.dataset.goharTitleSource || document.title, target);
    document.querySelector("#languageNotice")?.classList.remove("visible");
    return;
  }
  const parts = collectInterfaceParts().filter((part) => target !== "hi" || /[A-Za-z]/.test(part.source));
  const copyStrings = target === "hi" ? [] : Object.entries(copy.en).filter(([key]) => !["eyebrow", "title", "intro"].includes(key)).flatMap(([, value]) => {
    const collect = (item) => typeof item === "string" ? [item] : Array.isArray(item) ? item.flatMap(collect) : item && typeof item === "object" ? Object.values(item).flatMap(collect) : [];
    return collect(value);
  });
  const dynamicStrings = [
    "Just now", "{count} minutes ago", "{count} hours ago", "Yesterday", "Conversation",
    "Connection issue", "Voice input", "Microphone", "Couldn’t translate the interface. Check Ollama and try again.",
    "✦ Reply language: " + LANGUAGES[target].native + " · Voice: " + LANGUAGES[target].native,
  ];
  try {
    const allStrings = [...parts.map((part) => part.source), ...copyStrings, ...dynamicStrings];
    const hasUncachedStrings = allStrings.some((source) => source && !uiTranslations[target]?.[source]);
    if (hasUncachedStrings) showLanguageNotice(`Preparing the ${LANGUAGES[target].name} interface with Gemma…`, 0);
    const ready = await translateMissingStrings(target, allStrings, revision);
    if (!ready || revision !== localizationRevision) return;
    applyLanguage();
    renderHistory();
    collectInterfaceParts().forEach((part) => { if (part.connected()) part.set(cachedTranslation(part.source, target)); });
    document.title = cachedTranslation(document.documentElement.dataset.goharTitleSource || document.title, target);
    document.querySelector("#languageNotice")?.classList.remove("visible");
  } catch (error) {
    if (revision !== localizationRevision) return;
    showLanguageNotice(target === "hi"
      ? "इंटरफ़ेस का अनुवाद नहीं हो पाया। Ollama चालू करके फिर कोशिश करें।"
      : "Couldn’t translate the interface. Check Ollama and try again.");
    console.warn("Gohar interface translation failed:", error);
  }
}

function applyLanguage() {
  const text = words();
  const richText = text;
  const languageSelect = document.querySelector("#languageSelect");
  document.documentElement.lang = language;
  document.documentElement.dir = LANGUAGES[language].direction;
  languageSelect.value = language;
  languageSelect.setAttribute("aria-label", language === "hi" ? "जवाब और आवाज़ की भाषा चुनें" : "Choose reply and voice language");
  languageSelect.title = "Choose one of 20 languages for Gohar replies and voice input";
  document.querySelector("#eyebrow").innerHTML = richText.eyebrow;
  document.querySelector("#welcomeTitle").innerHTML = richText.title;
  document.querySelector("#welcomeIntro").innerHTML = richText.intro;
  document.querySelector("#farmerDetailsLabel").textContent = text.farmerForm;
  document.querySelector("#optionalLabel").textContent = text.optional;
  document.querySelector("#historyHeading").textContent = text.history;
  document.querySelector("#emptyHistory").textContent = text.emptyHistory;
  document.querySelector("#newChat").textContent = `＋  ${text.newChat}`;
  document.querySelector("#historyToggle").setAttribute("aria-label", text.openHistory);
  document.querySelector("#question").placeholder = text.placeholder;
  input.setAttribute("aria-label", text.placeholder);
  sendButton.setAttribute("aria-label", text.sendLabel);
  const voiceSupported = Boolean(Recognition);
  voiceButton.disabled = !voiceSupported;
  voiceButton.setAttribute("aria-label", voiceSupported ? text.micLabel : text.voiceUnavailable);
  voiceButton.title = voiceSupported ? text.micLabel : text.voiceUnavailable;
  hint.classList.toggle("voice-unavailable", !voiceSupported);
  hint.textContent = !voiceSupported ? text.voiceUnavailable : isListening ? text.listening : questionHint();
  document.querySelector("#seasonLabel").textContent = text.season;
  document.querySelector("#farmSeason").options[0].textContent = text.seasonPlaceholder;
  farmFields.forEach((field) => {
    document.querySelector(`#${field.label}`).textContent = text[field.id === "farmCrop" ? "crop" : field.id === "farmLocation" ? "location" : field.id === "farmStage" ? "stage" : "symptoms"];
    const control = document.querySelector(`#${field.id}`);
    control.placeholder = text[field.placeholder];
    const mic = document.querySelector(`[data-field="${field.id}"]`);
    mic.disabled = !voiceSupported;
    mic.title = voiceSupported ? text[field.voiceLabel] : text.voiceUnavailable;
    mic.setAttribute("aria-label", voiceSupported ? text[field.voiceLabel] : text.voiceUnavailable);
  });
  document.querySelectorAll(".topic").forEach((button, index) => {
    const [title, subtitle] = text.topics[index];
    button.querySelector("b").textContent = title;
    button.querySelector("small").textContent = subtitle;
    button.dataset.prompt = text.prompts[index];
  });
}

const SEASON_GUIDE = {
  kharif: {
    title: "Kharif · monsoon season",
    summary: "Monsoon timing differs by district. Use the local sowing window and weather bulletin for your village.",
    tasks: ["Check the latest IMD/KVK rain and sowing advisory before field operations.", "Clear field drains and protect seed and fertilizer from standing water.", "Use a current soil test or Soil Health Card to plan balanced nutrients.", "Keep a note of sowing date and crop stage for later nutrient and pest checks."],
  },
  rabi: {
    title: "Rabi · winter season",
    summary: "Winter crop timing varies with crop, district, irrigation and temperature. Confirm the local package of practices.",
    tasks: ["Check the district KVK sowing window and select a locally recommended variety.", "Test soil before buying fertilizer; plan irrigation and nutrient splits together.", "Record sowing and irrigation dates so stage-based advice is more accurate.", "Watch official advisories for cold, frost, rain and crop-stage risks."],
  },
  zaid: {
    title: "Zaid · summer season",
    summary: "Summer crop choices depend strongly on water availability and local heat conditions.",
    tasks: ["Confirm that irrigation water is available for the full crop cycle before sowing.", "Use local guidance for heat-tolerant crops and sowing dates.", "Keep soil covered where practical and avoid wasting irrigation water.", "Check weather advisories before fertilizer application or field spraying."],
  },
};

const CROP_GUIDE = {
  wheat: {
    season: "Rabi · winter", focus: "Nitrogen (N), phosphorus (P) and potassium (K), balanced to the soil test.",
    sources: "Urea supplies N; DAP supplies P plus some N; SSP supplies P and sulphur; MOP supplies K. Count nutrients from every product to avoid applying the same nutrient twice.",
    timing: "Use the local wheat package for basal P/K and split N timing. ICAR's Rabi advisory describes soil-test-based planning and splitting N around sowing and the first irrigation.",
    watch: "Do not add zinc or extra N just from leaf colour alone. Check the Soil Health Card and rule out water, root, weed or disease problems.",
    source: "https://www.icar.gov.in/sites/default/files/2022-09/Rabi-Agro-Advisory-2021-22_0.pdf",
    sourceLabel: "ICAR Rabi Agro-Advisory (PDF)",
  },
  rice: {
    season: "Often Kharif · monsoon (also grown in other seasons by region)", focus: "Balanced NPK; zinc or other micronutrients only when the soil test or local recommendation indicates a need.",
    sources: "Match the fertilizer product to the missing nutrient. Farmyard manure, compost, green manure and crop residues can complement mineral fertilizer as part of integrated nutrient management.",
    timing: "Use local split-N guidance rather than one large application. ICAR highlights the Leaf Colour Chart as a practical aid for need-based nitrogen management in rice.",
    watch: "Flooding, drainage, variety and transplant/direct-seeding method change nutrient availability. Avoid blanket urea applications.",
    source: "https://icar.gov.in/en/soil-sustenance-akshaya-tritiya-campaign-balanced-fertilisation-and-resilient-agriculture",
    sourceLabel: "ICAR: soil testing and rice Leaf Colour Chart",
  },
  maize: {
    season: "Commonly Kharif · monsoon (also grown in Rabi/summer in some regions)", focus: "NPK balance based on soil test, irrigation and whether the crop is rainfed or irrigated.",
    sources: "Choose N, P and K sources that match the recommendation. ICAR's Kharif advisory describes basal P/K and splitting N across crop growth; exact rates vary by production conditions.",
    timing: "Apply nutrients at the crop stages and by the placement method in your local package. Do not place concentrated fertilizer against seed or roots.",
    watch: "Rainfall, soil texture and irrigation change nutrient loss and crop demand. Use the district recommendation rather than copying a rate from another state.",
    source: "https://icar.gov.in/sites/default/files/Circulars/ICAR%20En-Kharif%20Agro-Advisories%20for%20Farmers%202025.pdf",
    sourceLabel: "ICAR Kharif Agro-Advisory (PDF)",
  },
  mustard: {
    season: "Rabi · winter", focus: "NPK plus attention to sulphur; oilseeds may respond to sulphur, but need depends on soil and location.",
    sources: "Use the soil test and district package to choose products. SSP can supply both P and sulphur; gypsum is another sulphur source. Count product nutrients so the total stays within the recommendation.",
    timing: "Follow locally recommended basal and top-dressing timing. ICAR material advises soil-test-based fertilizer planning for rapeseed-mustard.",
    watch: "Do not apply sulphur, zinc or boron automatically. These are not substitutes for a balanced NPK plan and excess micronutrients can harm crops.",
    source: "https://icar.gov.in/sites/default/files/inline-files/Strategies-and-technologies.pdf",
    sourceLabel: "ICAR crop strategies: mustard nutrition (PDF)",
  },
  pulses: {
    season: "Kharif or Rabi · depends on pulse and region", focus: "Start with soil-test-based P, K and sulphur; legumes can fix nitrogen when nodulation and crop conditions are suitable.",
    sources: "Crop-specific Rhizobium inoculant and phosphorus-solubilizing biofertilizer may be useful where recommended. Use only the correct crop strain and follow the product label; they do not replace every nutrient need.",
    timing: "Ask the local KVK about seed inoculation, seed-treatment compatibility and the basal nutrient plan for your pulse and soil.",
    watch: "Avoid assuming all pulses need no nitrogen or that inoculant alone supplies all nutrients. Crop, soil acidity, moisture and nodulation matter.",
    source: "https://icar.gov.in/sites/default/files/2022-06/ICAR-technologies-Biofertilizers.pdf",
    sourceLabel: "ICAR biofertilizer technologies (PDF)",
  },
};

const CROP_NAMES = { wheat: "Wheat", rice: "Rice", maize: "Maize", mustard: "Mustard", pulses: "Pulses" };

function renderSeasonGuide() {
  const key = document.querySelector("#guideSeason").value;
  const guide = SEASON_GUIDE[key] || SEASON_GUIDE.kharif;
  document.querySelector("#seasonTitle").textContent = guide.title;
  document.querySelector("#seasonSummary").textContent = guide.summary;
  const list = document.querySelector("#seasonChecklist");
  list.replaceChildren();
  guide.tasks.forEach((task) => { const item = document.createElement("li"); item.textContent = task; list.append(item); });
}

function renderCropGuide() {
  const cropKey = document.querySelector("#guideCrop").value;
  const crop = CROP_GUIDE[cropKey] || CROP_GUIDE.wheat;
  const card = document.querySelector("#cropGuideCard");
  card.innerHTML = `<div class="crop-guide-top"><span class="crop-season">${crop.season}</span><h3>${CROP_NAMES[cropKey] || CROP_NAMES.wheat}</h3></div>
    <div class="analysis-grid"><section><h4>1. Nutrient focus</h4><p>${crop.focus}</p></section><section><h4>2. Fertilizer sources</h4><p>${crop.sources}</p></section><section><h4>3. Timing and method</h4><p>${crop.timing}</p></section><section><h4>4. Checks before applying</h4><p>${crop.watch}</p></section></div>
    <a class="source-link" href="${crop.source}" target="_blank" rel="noopener noreferrer">Read source: ${crop.sourceLabel} ↗</a>
    <button id="askCropQuestion" class="guide-ask-button" type="button">💬 Ask Gohar about this crop</button>`;
  card.querySelector("#askCropQuestion").addEventListener("click", () => {
    const cropName = document.querySelector("#guideCrop").selectedOptions[0].textContent.split(" · ")[0];
    document.querySelector("#farmCrop").value = cropName;
    document.querySelector("#farmSeason").value = ["wheat", "mustard"].includes(document.querySelector("#guideCrop").value) ? "rabi"
      : ["rice", "maize"].includes(document.querySelector("#guideCrop").value) ? "kharif" : "";
    input.value = `What fertilizer and nutrient sources should I consider for ${cropName}? Please ask for my district, soil test, crop stage and irrigation details before suggesting a rate.`;
    document.querySelector(".farmer-details").open = true;
    setPage("chat");
    input.focus();
  });
}

function setPage(page) {
  const guideOpen = page === "guide";
  if (guideOpen) {
    stopListening();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }
  document.querySelector("#guidePage").classList.toggle("hidden", !guideOpen);
  document.querySelector("#welcome").classList.toggle("hidden", guideOpen || conversation.children.length > 0);
  document.querySelector("#conversation").classList.toggle("hidden", guideOpen || conversation.children.length === 0);
  document.querySelector(".composer-wrap").classList.toggle("hidden", guideOpen);
  document.querySelector("#showChatPage").classList.toggle("active", !guideOpen);
  document.querySelector("#showGuidePage").classList.toggle("active", guideOpen);
  closeHistoryDrawer();
}

function showConversation() {
  welcome.classList.add("hidden");
  conversation.classList.remove("hidden");
}

function persistHistory() {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(chatHistory)); } catch { /* Keep the active conversation usable if storage is full or blocked. */ }
}

function renderHistory() {
  const list = document.querySelector("#chatHistory");
  const empty = document.querySelector("#emptyHistory");
  if (!list || !empty) return;
  list.replaceChildren();
  empty.classList.toggle("hidden", chatHistory.length > 0);
  const heading = document.querySelector("#historyHeading");
  if (heading) heading.textContent = words().history + (chatHistory.length ? " · " + chatHistory.length : "");
  chatHistory.forEach((chat) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `history-item${chat.id === activeChatId ? " active" : ""}`;
    button.disabled = sendButton.disabled;
    const icon = document.createElement("span");
    icon.className = "history-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "☷";
    const details = document.createElement("span");
    details.className = "history-copy";
    const title = document.createElement("span");
    title.className = "history-title";
    title.textContent = chat.title || words().newChat;
    const time = document.createElement("span");
    time.className = "history-time";
    time.textContent = formatHistoryTime(chat.updatedAt);
    details.append(title, time);
    const arrow = document.createElement("span");
    arrow.className = "history-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    button.append(icon, details, arrow);
    button.title = title.textContent;
    button.setAttribute("aria-label", title.textContent + " · " + time.textContent);
    button.setAttribute("aria-current", chat.id === activeChatId ? "true" : "false");
    button.addEventListener("click", () => openHistoryChat(chat.id));
    list.append(button);
  });
}

function formatHistoryTime(timestamp) {
  const time = Number(timestamp);
  if (!Number.isFinite(time) || time <= 0) return cachedTranslation("Conversation");
  const elapsed = Math.max(0, Date.now() - time);
  if (elapsed < 60_000) return cachedTranslation("Just now");
  if (elapsed < 3_600_000) {
    const minutes = Math.floor(elapsed / 60_000);
    return cachedTranslation("{count} minutes ago").replace("{count}", formatLocalizedNumber(minutes));
  }
  if (elapsed < 86_400_000) {
    const hours = Math.floor(elapsed / 3_600_000);
    return cachedTranslation("{count} hours ago").replace("{count}", formatLocalizedNumber(hours));
  }
  if (elapsed < 172_800_000) return cachedTranslation("Yesterday");
  try { return new Intl.DateTimeFormat(language === "en" ? "en-IN" : language, { day: "numeric", month: "short" }).format(time); }
  catch { return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(time); }
}

function formatLocalizedNumber(value) {
  try { return new Intl.NumberFormat(language === "en" ? "en-IN" : language).format(value); }
  catch { return new Intl.NumberFormat("en-IN").format(value); }
}

function saveMessage(text, role, meta, messageLanguage = language) {
  if (role.includes("typing")) return;
  if (!activeChatId) {
    if (!role.includes("user")) return;
    activeChatId = globalThis.crypto?.randomUUID?.() || `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const firstLine = text.split("\n").find((line) => line.trim()) || text;
    const title = firstLine.replace(/^Question:\s*/i, "").trim().slice(0, 48) || words().newChat;
    chatHistory.unshift({ id: activeChatId, title, updatedAt: Date.now(), messages: [] });
  }
  const chat = chatHistory.find((item) => item.id === activeChatId);
  if (!chat) return;
  chat.messages.push({ text, role, meta, language: messageLanguage });
  chat.messages = chat.messages.slice(-HISTORY_MESSAGE_LIMIT);
  chat.updatedAt = Date.now();
  chatHistory.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  chatHistory = chatHistory.slice(0, HISTORY_LIMIT);
  persistHistory();
  renderHistory();
}

function closeHistoryDrawer() {
  document.querySelector(".sidebar").classList.remove("mobile-open");
  document.querySelector("#navOverlay").classList.remove("open");
  const toggle = document.querySelector("#historyToggle");
  toggle.setAttribute("aria-expanded", "false");
  toggle.classList.remove("is-open");
  toggle.textContent = "☰";
}

function openHistoryChat(id) {
  const chat = chatHistory.find((item) => item.id === id);
  if (!chat) return;
  activeChatId = chat.id;
  conversation.replaceChildren();
  chat.messages.forEach((message) => addMessage(message.text, message.role, message.meta || "", false, message.language || "hi"));
  showConversation();
  input.value = "";
  farmFields.forEach((field) => { document.querySelector(`#${field.id}`).value = ""; });
  document.querySelector("#farmSeason").value = "";
  document.querySelector(".farmer-details").open = false;
  renderHistory();
  setPage("chat");
  closeHistoryDrawer();
}

function speak(text, languageCode = language) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voiceLocale = LANGUAGES[languageCode]?.voice || LANGUAGES.hi.voice;
  utterance.lang = voiceLocale;
  const voices = window.speechSynthesis.getVoices();
  const languagePrefix = voiceLocale.split("-")[0].toLowerCase();
  const matchingVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(languagePrefix));
  if (matchingVoice) utterance.voice = matchingVoice;
  utterance.rate = 0.94;
  window.speechSynthesis.speak(utterance);
}

function addMessage(text, role, meta = "", saveToHistory = true, messageLanguage = language) {
  const message = document.createElement("article");
  message.className = `message ${role}`;
  const body = document.createElement("div");
  body.textContent = text;
  message.append(body);
  if (role.includes("assistant") && !role.includes("typing")) {
    const listen = document.createElement("button");
    listen.type = "button";
    listen.className = "listen-button";
    listen.textContent = "🔊";
    listen.title = words().spoken;
    listen.setAttribute("aria-label", words().spoken);
    listen.addEventListener("click", () => speak(text, messageLanguage));
    message.append(listen);
  }
  if (meta) {
    const note = document.createElement("div");
    note.className = "meta";
    note.textContent = cachedTranslation(meta);
    message.append(note);
  }
  conversation.append(message);
  conversation.scrollTop = conversation.scrollHeight;
  if (saveToHistory) saveMessage(text, role, meta, messageLanguage);
  return message;
}

function setBusy(busy) {
  sendButton.disabled = busy;
  input.disabled = busy;
  voiceButton.disabled = busy || !Recognition;
  document.querySelectorAll(".field-voice").forEach((button) => { button.disabled = busy || !Recognition; });
  document.querySelector("#newChat").disabled = busy;
  document.querySelector("#historyToggle").disabled = busy;
  document.querySelector("#languageSelect").disabled = busy;
  document.querySelectorAll(".history-item").forEach((button) => { button.disabled = busy; });
  sendButton.textContent = busy ? "…" : "↑";
  hint.textContent = busy ? words().thinking : !Recognition ? words().voiceUnavailable : isListening ? words().listening : questionHint();
}

function farmerDetails() {
  const text = words();
  const labels = [text.crop, text.location, text.stage, text.symptoms];
  const values = farmFields.map((field) => document.querySelector(`#${field.id}`).value.trim());
  const details = values.map((value, index) => value ? `${labels[index]}: ${value}` : "").filter(Boolean);
  const season = document.querySelector("#farmSeason").value;
  if (season) details.push(`${text.season}: ${season.toUpperCase()}`);
  return details;
}

async function sendQuestion(question) {
  const cleanQuestion = question.trim();
  if (cleanQuestion.length < 2 || sendButton.disabled) return;
  const details = farmerDetails();
  const detailsTitle = words().detailsHeading;
  const displayText = [cleanQuestion, ...(details.length ? ["", `${detailsTitle}:`, ...details] : [])].join("\n");
  const farmContext = details.length ? `${detailsTitle}:\n${details.join("\n")}` : "";
  const apiQuestion = [cleanQuestion, farmContext].filter(Boolean).join("\n\n").slice(0, 1500);
  showConversation();
  addMessage(displayText, "user");
  const activeChat = chatHistory.find((chat) => chat.id === activeChatId);
  const history = (activeChat?.messages || [])
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(0, -1)
    .slice(-8)
    .map((message) => ({ role: message.role, content: message.text.slice(0, 1500) }));
  input.value = "";
  input.style.height = "auto";
  setBusy(true);
  const pending = addMessage(words().thinking, "assistant typing");
  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: apiQuestion, language, language_name: LANGUAGES[language].name, history }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detail = errorData.detail;
      const detailText = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((item) => item.msg).filter(Boolean).join("; ") : "";
      const errorText = response.status === 404
        ? words().routeNotFound.replace("{url}", `${API_URL}/chat`)
        : detailText || `Server error (${response.status})`;
      throw new Error(errorText);
    }
    const data = await response.json();
    pending.remove();
    const meta = [data.mode === "fallback" ? words().fallback : words().ai, data.source ? `${words().source}: ${data.source}` : ""].filter(Boolean).join(" · ");
    addMessage(data.answer, `assistant${data.mode === "fallback" ? " error" : ""}`, meta);
  } catch (error) {
    pending.remove();
    let detail = error.message;
    if (!(error instanceof TypeError) && language !== "en" && cachedTranslation(detail) === detail) {
      try {
        const targetLanguage = language;
        await translateMissingStrings(targetLanguage, [detail], localizationRevision);
        if (targetLanguage === language) detail = cachedTranslation(detail, targetLanguage);
      } catch { /* Show the original backend detail alongside the localized retry message. */ }
    }
    const message = error instanceof TypeError ? words().connection : `${words().retry} ${detail}`;
    addMessage(message, "assistant error", "Connection issue");
  } finally {
    setBusy(false);
    input.focus();
  }
}

function stopListening() {
  if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
}

function audioBufferToWav(buffer) {
  const targetRate = 16000;
  const sourceRate = buffer.sampleRate;
  const frameCount = Math.ceil(buffer.length * targetRate / sourceRate);
  const pcm = new ArrayBuffer(44 + frameCount * 2);
  const view = new DataView(pcm);
  const writeText = (offset, value) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  writeText(0, "RIFF");
  view.setUint32(4, 36 + frameCount * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, frameCount * 2, true);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  for (let i = 0; i < frameCount; i += 1) {
    const sourceIndex = Math.min(buffer.length - 1, Math.floor(i * sourceRate / targetRate));
    let sample = channels.reduce((sum, channel) => sum + channel[sourceIndex], 0) / channels.length;
    sample = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return new Uint8Array(pcm);
}

async function transcribeRecording(chunks, target, button) {
  const blob = new Blob(chunks, { type: mediaRecorder?.mimeType || "audio/webm" });
  if (!blob.size) throw new Error("No audio was recorded. Check the microphone and try again.");
  const audioContext = new AudioContext();
  try {
    const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer());
    const wav = audioBufferToWav(decoded);
    let binary = "";
    for (let offset = 0; offset < wav.length; offset += 0x8000) {
      binary += String.fromCharCode(...wav.subarray(offset, offset + 0x8000));
    }
    const response = await fetch(API_URL + "/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, audio_base64: btoa(binary) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || ("Transcription failed (" + response.status + ")."));
    target.value = (data.text || "").trim();
    target.dispatchEvent(new Event("input", { bubbles: true }));
    if (!target.value) throw new Error("No speech was detected. Please try speaking closer to the microphone.");
    if (target === input) hint.textContent = words().transcriptReady;
  } finally {
    await audioContext.close();
    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    button.classList.remove("listening");
    button.textContent = button === voiceButton ? words().mic : "🎙";
    activeTarget = null;
    activeMicButton = null;
    isListening = false;
  }
}

async function startListening(target = input, button = voiceButton) {
  if (isListening) {
    stopListening();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder || !window.AudioContext) {
    showConversation();
    addMessage("माइक के लिए Chrome या Edge में localhost खोलें और साइट को microphone access दें।", "assistant error", "Voice input");
    return;
  }
  activeTarget = target;
  activeMicButton = button;
  target.value = "";
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    const recorder = new MediaRecorder(mediaStream);
    mediaRecorder = recorder;
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstart = () => {
      isListening = true;
      button.classList.add("listening");
      button.textContent = "■";
      if (target === input) hint.textContent = "रिकॉर्डिंग… रोकने के लिए फिर माइक दबाएँ (अधिकतम 20 सेकंड)";
    };
    recorder.onerror = () => {
      mediaStream?.getTracks().forEach((track) => track.stop());
      mediaStream = null;
      isListening = false;
      button.classList.remove("listening");
      button.textContent = button === voiceButton ? words().mic : "🎙";
      showConversation();
      addMessage("माइक रिकॉर्डिंग विफल हुई। ब्राउज़र की microphone permission जाँचें।", "assistant error", "Microphone");
    };
    recorder.onstop = async () => {
      showConversation();
      if (target === input) hint.textContent = "Gemma आपकी आवाज़ को स्थानीय रूप से लिख रहा है…";
      try {
        await transcribeRecording(chunks, target, button);
      } catch (error) {
        mediaStream?.getTracks().forEach((track) => track.stop());
        mediaStream = null;
        isListening = false;
        button.classList.remove("listening");
        button.textContent = button === voiceButton ? words().mic : "🎙";
        addMessage(error.message || "आवाज़ लिखने में विफलता।", "assistant error", "Offline transcription");
      }
    };
    recorder.start();
    window.setTimeout(() => {
      if (mediaRecorder === recorder && recorder.state === "recording") recorder.stop();
    }, 20000);
  } catch (error) {
    isListening = false;
    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    showConversation();
    const message = error.name === "NotAllowedError" || error.name === "SecurityError"
      ? "माइक की अनुमति बंद है। Chrome/Edge में localhost के पास site settings खोलकर Microphone को Allow करें।"
      : "माइक उपलब्ध नहीं है। जाँचें कि यह दूसरे ऐप में इस्तेमाल नहीं हो रहा है।";
    addMessage(message, "assistant error", "Microphone");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendQuestion(input.value);
});
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 130)}px`;
});
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
voiceButton.addEventListener("click", () => startListening(input, voiceButton));
document.querySelectorAll(".field-voice").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.querySelector(`#${button.dataset.field}`);
    startListening(target, button);
  });
});
document.querySelector("#languageSelect").addEventListener("change", (event) => {
  stopListening();
  language = LANGUAGES[event.target.value] ? event.target.value : "hi";
  try { localStorage.setItem("gohar-language", language); } catch { /* Keep the selection for this page session. */ }
  restoreInterfaceSources();
  applyLanguage();
  renderHistory();
  renderSeasonGuide();
  renderCropGuide();
  hint.classList.remove("language-changed");
  void hint.offsetWidth;
  hint.classList.add("language-changed");
  window.setTimeout(() => hint.classList.remove("language-changed"), 850);
  void localizeInterface();
});
document.querySelectorAll(".topic").forEach((button) => {
  button.addEventListener("click", () => sendQuestion(button.dataset.prompt || ""));
});
document.querySelector("#newChat").addEventListener("click", () => {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  stopListening();
  conversation.replaceChildren();
  conversation.classList.add("hidden");
  welcome.classList.remove("hidden");
  input.value = "";
  farmFields.forEach((field) => { document.querySelector(`#${field.id}`).value = ""; });
  document.querySelector("#farmSeason").value = "";
  document.querySelector(".farmer-details").open = false;
  activeChatId = null;
  renderHistory();
  closeHistoryDrawer();
  setPage("chat");
  input.focus();
});

document.querySelector("#showChatPage").addEventListener("click", () => setPage("chat"));
document.querySelector("#showGuidePage").addEventListener("click", () => setPage("guide"));
document.querySelector("#guideSeason").addEventListener("change", () => {
  renderSeasonGuide();
  if (language !== "en") void localizeInterface();
});
document.querySelector("#guideCrop").addEventListener("change", () => {
  renderCropGuide();
  if (language !== "en") void localizeInterface();
});

document.querySelector("#historyToggle").addEventListener("click", () => {
  const sidebar = document.querySelector(".sidebar");
  const opening = !sidebar.classList.contains("mobile-open");
  sidebar.classList.toggle("mobile-open", opening);
  document.querySelector("#navOverlay").classList.toggle("open", opening);
  document.querySelector("#historyToggle").setAttribute("aria-expanded", String(opening));
  document.querySelector("#historyToggle").classList.toggle("is-open", opening);
  document.querySelector("#historyToggle").textContent = opening ? "×" : "☰";
});
document.querySelector("#navOverlay").addEventListener("click", closeHistoryDrawer);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeHistoryDrawer();
});

const month = new Date().getMonth();
document.querySelector("#guideSeason").value = month >= 5 && month <= 8 ? "kharif" : month >= 9 || month <= 2 ? "rabi" : "zaid";
const initialLanguage = language;
language = "en";
applyLanguage();
renderHistory();
renderSeasonGuide();
renderCropGuide();
collectInterfaceParts();
language = initialLanguage;
restoreInterfaceSources();
applyLanguage();
renderHistory();
void localizeInterface();

