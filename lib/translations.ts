export type LangCode =
  | "en" | "zh" | "yue" | "hi" | "te" | "ta"
  | "es" | "ko" | "tl" | "ar" | "fr" | "de" | "ja";

export interface LangOption {
  code: LangCode;
  englishName: string;
  nativeName: string;
}

export const LANGUAGES: LangOption[] = [
  { code: "en",  englishName: "English",          nativeName: "English"      },
  { code: "zh",  englishName: "Mandarin Chinese",  nativeName: "中文"         },
  { code: "yue", englishName: "Cantonese",         nativeName: "粵語"         },
  { code: "hi",  englishName: "Hindi",             nativeName: "हिन्दी"      },
  { code: "te",  englishName: "Telugu",            nativeName: "తెలుగు"      },
  { code: "ta",  englishName: "Tamil",             nativeName: "தமிழ்"       },
  { code: "es",  englishName: "Spanish",           nativeName: "Español"      },
  { code: "ko",  englishName: "Korean",            nativeName: "한국어"        },
  { code: "tl",  englishName: "Tagalog",           nativeName: "Tagalog"      },
  { code: "ar",  englishName: "Arabic",            nativeName: "العربية"      },
  { code: "fr",  englishName: "French",            nativeName: "Français"     },
  { code: "de",  englishName: "German",            nativeName: "Deutsch"      },
  { code: "ja",  englishName: "Japanese",          nativeName: "日本語"       },
];

export type TranslationKeys = typeof en;

const en = {
  langSelect: {
    title:    "Choose your language",
    subtitle: "Select the language you're most comfortable with",
    continue: "Continue",
  },
  common: {
    continue: "Continue",
    back:     "Back",
    cancel:   "Cancel",
    done:     "Done",
    post:     "Post",
    add:      "Add",
    remove:   "Remove",
    signOut:  "Sign Out",
    resetAll: "Reset All Data",
    save:     "Save",
  },
  nav: {
    browse:   "Browse",
    myCircle: "My Circle",
    map:      "PopMap",
    profile:  "Profile",
  },
  home: {
    greeting:      "Hey, {{name}}",
    tagline:       "UIUC Housing — Find your match",
    browseBy:      "Browse by housing type",
    features:      "Other features",
    circle:        "Circle",
    listings:      "Listings",
    breakPosts:    "Break Posts",
    protection:    "PopMatch Protection",
    summerOnly:    "Summer Only",
    augustGap:     "The August Gap",
    semester:      "Semester / Full Year",
    shortTerm:     "Short-Term & Events",
    matchmaker:    "Year-Long Matchmaker",
    breaks:        "Break Stay Board",
    matchmakerSub: "Swipe to find your roommate",
    breaksSub:     "Thanksgiving, Spring, Winter",
  },
  onboarding: {
    welcome:  "Welcome to PopMatch",
    subtitle: "UIUC students only — verify your @illinois.edu email",
    step1:    "Create Profile",
    step2:    "About You",
    step3:    "Housing Prefs",
    step4:    "Location & Lifestyle",
    step5:    "Breaks & Landlord",
    emailPlaceholder: "netid@illinois.edu",
    namePlaceholder:  "Full name",
    bioPlaceholder:   "Tell potential roommates about yourself...",
    majorPlaceholder: "Major",
  },
  profile: {
    title:    "Profile",
    signOut:  "Sign Out",
    resetAll: "Reset All Data",
    liked:    "Liked",
    budget:   "Budget/mo",
    listings: "Listings",
    housing:  "Housing Details",
    lifestyle:"Lifestyle",
    breaks:   "Break Plans",
    matching: "How Matching Works",
    signOutConfirm: "Are you sure you want to sign out?",
    resetConfirm:   "This will erase all your data. This cannot be undone.",
  },
  circle: {
    title:       "My Circle",
    myCircleTab: "My Circle",
    matchesTab:  "Matches",
    addTitle:    "Add to My Circle",
    suggestions: "Suggested connections",
    emptyTitle:  "Your circle is empty",
    emptySub:    "Add your first connection",
    firstDegree: "1st Degree",
    secondDegree:"2nd Degree",
    vouched:     "You vouched",
    noMatches:   "No matches yet",
    noMatchesSub:"Start swiping in the Matchmaker to find your roommate!",
  },
  marketplace: {
    title:       "Sublease Marketplace",
    noListings:  "No listings yet",
    noListingsSub:"Be the first to post a sublease!",
    post:        "Post",
    perMonth:    "/month",
    breakFriendly:"Break-Friendly",
  },
};

const zh: TranslationKeys = {
  langSelect: { title: "选择您的语言", subtitle: "选择您最熟悉的语言", continue: "继续" },
  common: { continue: "继续", back: "返回", cancel: "取消", done: "完成", post: "发布", add: "添加", remove: "删除", signOut: "退出登录", resetAll: "重置所有数据", save: "保存" },
  nav: { browse: "浏览", myCircle: "我的圈子", map: "地图", profile: "个人资料" },
  home: { greeting: "你好，{{name}}", tagline: "UIUC 住房 — 找到您的室友", browseBy: "按住房类型浏览", features: "其他功能", circle: "圈子", listings: "房源", breakPosts: "假期帖子", protection: "PopMatch 保护", summerOnly: "夏季专属", augustGap: "八月空档", semester: "学期 / 全年", shortTerm: "短租 & 活动", matchmaker: "年度室友匹配", breaks: "假期住宿板", matchmakerSub: "滑动找到您的室友", breaksSub: "感恩节、春假、寒假" },
  onboarding: { welcome: "欢迎使用 PopMatch", subtitle: "仅限 UIUC 学生 — 验证您的 @illinois.edu 邮箱", step1: "创建资料", step2: "关于您", step3: "住房偏好", step4: "位置与生活方式", step5: "假期与房东", emailPlaceholder: "netid@illinois.edu", namePlaceholder: "全名", bioPlaceholder: "向潜在室友介绍自己...", majorPlaceholder: "专业" },
  profile: { title: "个人资料", signOut: "退出登录", resetAll: "重置所有数据", liked: "已喜欢", budget: "月预算", listings: "房源", housing: "住房详情", lifestyle: "生活方式", breaks: "假期计划", matching: "匹配原理", signOutConfirm: "确定要退出登录吗？", resetConfirm: "这将删除您的所有数据。此操作无法撤销。" },
  circle: { title: "我的圈子", myCircleTab: "我的圈子", matchesTab: "匹配", addTitle: "添加到我的圈子", suggestions: "推荐联系人", emptyTitle: "您的圈子还是空的", emptySub: "添加您的第一个联系人", firstDegree: "一度好友", secondDegree: "二度好友", vouched: "您已背书", noMatches: "暂无匹配", noMatchesSub: "在室友匹配中开始滑动，找到您的室友！" },
  marketplace: { title: "转租市场", noListings: "暂无房源", noListingsSub: "抢先发布转租信息！", post: "发布", perMonth: "/月", breakFriendly: "假期友好" },
};

const yue: TranslationKeys = {
  langSelect: { title: "選擇您嘅語言", subtitle: "選擇您最熟悉嘅語言", continue: "繼續" },
  common: { continue: "繼續", back: "返回", cancel: "取消", done: "完成", post: "發布", add: "添加", remove: "刪除", signOut: "登出", resetAll: "重置所有數據", save: "保存" },
  nav: { browse: "瀏覽", myCircle: "我嘅圈子", map: "地圖", profile: "個人資料" },
  home: { greeting: "你好，{{name}}", tagline: "UIUC 住房 — 搵到你嘅室友", browseBy: "按住房類型瀏覽", features: "其他功能", circle: "圈子", listings: "房源", breakPosts: "假期帖子", protection: "PopMatch 保護", summerOnly: "夏季專屬", augustGap: "八月空檔", semester: "學期 / 全年", shortTerm: "短租 & 活動", matchmaker: "年度室友配對", breaks: "假期住宿板", matchmakerSub: "滑動搵室友", breaksSub: "感恩節、春假、寒假" },
  onboarding: { welcome: "歡迎使用 PopMatch", subtitle: "只限 UIUC 學生 — 驗證您嘅 @illinois.edu 電郵", step1: "建立資料", step2: "關於您", step3: "住房偏好", step4: "位置同生活方式", step5: "假期同業主", emailPlaceholder: "netid@illinois.edu", namePlaceholder: "全名", bioPlaceholder: "向潛在室友介紹自己...", majorPlaceholder: "專業" },
  profile: { title: "個人資料", signOut: "登出", resetAll: "重置所有數據", liked: "已喜歡", budget: "月預算", listings: "房源", housing: "住房詳情", lifestyle: "生活方式", breaks: "假期計劃", matching: "配對原理", signOutConfirm: "確定要登出嗎？", resetConfirm: "呢個操作將刪除您嘅所有數據，無法撤銷。" },
  circle: { title: "我嘅圈子", myCircleTab: "我嘅圈子", matchesTab: "配對", addTitle: "添加到我嘅圈子", suggestions: "建議聯繫人", emptyTitle: "您嘅圈子仲係空的", emptySub: "添加您嘅第一個聯繫人", firstDegree: "一度好友", secondDegree: "二度好友", vouched: "您已背書", noMatches: "暫無配對", noMatchesSub: "開始喺室友配對中滑動，搵到您嘅室友！" },
  marketplace: { title: "轉租市場", noListings: "暫無房源", noListingsSub: "搶先發布轉租資訊！", post: "發布", perMonth: "/月", breakFriendly: "假期友好" },
};

const hi: TranslationKeys = {
  langSelect: { title: "अपनी भाषा चुनें", subtitle: "वह भाषा चुनें जिसमें आप सबसे अधिक सहज हों", continue: "जारी रखें" },
  common: { continue: "जारी रखें", back: "वापस", cancel: "रद्द करें", done: "हो गया", post: "पोस्ट करें", add: "जोड़ें", remove: "हटाएं", signOut: "साइन आउट", resetAll: "सभी डेटा रीसेट करें", save: "सहेजें" },
  nav: { browse: "ब्राउज़", myCircle: "मेरा सर्कल", map: "नक्शा", profile: "प्रोफ़ाइल" },
  home: { greeting: "नमस्ते, {{name}}", tagline: "UIUC हाउसिंग — अपना मैच खोजें", browseBy: "आवास प्रकार से ब्राउज़ करें", features: "अन्य सुविधाएं", circle: "सर्कल", listings: "लिस्टिंग", breakPosts: "ब्रेक पोस्ट", protection: "PopMatch सुरक्षा", summerOnly: "केवल गर्मी", augustGap: "अगस्त गैप", semester: "सेमेस्टर / पूरा वर्ष", shortTerm: "शॉर्ट-टर्म", matchmaker: "वार्षिक मैचमेकर", breaks: "ब्रेक बोर्ड", matchmakerSub: "रूममेट खोजने के लिए स्वाइप करें", breaksSub: "थैंक्सगिविंग, स्प्रिंग, विंटर" },
  onboarding: { welcome: "PopMatch में आपका स्वागत है", subtitle: "केवल UIUC छात्र — अपना @illinois.edu ईमेल सत्यापित करें", step1: "प्रोफ़ाइल बनाएं", step2: "आपके बारे में", step3: "आवास प्राथमिकताएं", step4: "स्थान और जीवनशैली", step5: "ब्रेक और मकान मालिक", emailPlaceholder: "netid@illinois.edu", namePlaceholder: "पूरा नाम", bioPlaceholder: "संभावित रूममेट्स को अपने बारे में बताएं...", majorPlaceholder: "विषय" },
  profile: { title: "प्रोफ़ाइल", signOut: "साइन आउट", resetAll: "सभी डेटा रीसेट करें", liked: "पसंद किए", budget: "बजट/माह", listings: "लिस्टिंग", housing: "आवास विवरण", lifestyle: "जीवनशैली", breaks: "ब्रेक योजनाएं", matching: "मैचिंग कैसे काम करती है", signOutConfirm: "क्या आप साइन आउट करना चाहते हैं?", resetConfirm: "यह आपका सारा डेटा मिटा देगा। यह पूर्ववत नहीं किया जा सकता।" },
  circle: { title: "मेरा सर्कल", myCircleTab: "मेरा सर्कल", matchesTab: "मैच", addTitle: "मेरे सर्कल में जोड़ें", suggestions: "सुझाए गए कनेक्शन", emptyTitle: "आपका सर्कल खाली है", emptySub: "अपना पहला कनेक्शन जोड़ें", firstDegree: "1st डिग्री", secondDegree: "2nd डिग्री", vouched: "आपने वाउच किया", noMatches: "अभी कोई मैच नहीं", noMatchesSub: "रूममेट खोजने के लिए मैचमेकर में स्वाइप करें!" },
  marketplace: { title: "सब्लीज़ मार्केटप्लेस", noListings: "अभी कोई लिस्टिंग नहीं", noListingsSub: "पहले सब्लीज़ पोस्ट करें!", post: "पोस्ट", perMonth: "/माह", breakFriendly: "ब्रेक-फ्रेंडली" },
};

const te: TranslationKeys = {
  langSelect: { title: "మీ భాషను ఎంచుకోండి", subtitle: "మీకు అత్యంత సౌకర్యంగా ఉండే భాషను ఎంచుకోండి", continue: "కొనసాగించు" },
  common: { continue: "కొనసాగించు", back: "వెనుకకు", cancel: "రద్దు చేయి", done: "పూర్తయింది", post: "పోస్ట్ చేయి", add: "జోడించు", remove: "తొలగించు", signOut: "సైన్ అవుట్", resetAll: "అన్ని డేటా రీసెట్ చేయి", save: "సేవ్ చేయి" },
  nav: { browse: "బ్రౌజ్", myCircle: "నా సర్కిల్", map: "మ్యాప్", profile: "ప్రొఫైల్" },
  home: { greeting: "హాయ్, {{name}}", tagline: "UIUC హౌసింగ్ — మీ మ్యాచ్ కనుగొనండి", browseBy: "హౌసింగ్ రకం ద్వారా బ్రౌజ్ చేయి", features: "ఇతర ఫీచర్లు", circle: "సర్కిల్", listings: "లిస్టింగ్లు", breakPosts: "బ్రేక్ పోస్ట్లు", protection: "PopMatch రక్షణ", summerOnly: "వేసవి మాత్రమే", augustGap: "ఆగస్టు గ్యాప్", semester: "సెమెస్టర్ / పూర్తి సంవత్సరం", shortTerm: "షార్ట్-టర్మ్", matchmaker: "వార్షిక మ్యాచ్‌మేకర్", breaks: "బ్రేక్ స్టే బోర్డ్", matchmakerSub: "రూమ్‌మేట్ కనుగొనడానికి స్వైప్ చేయి", breaksSub: "థాంక్స్‌గివింగ్, స్ప్రింగ్, వింటర్" },
  onboarding: { welcome: "PopMatch కి స్వాగతం", subtitle: "UIUC విద్యార్థులు మాత్రమే — మీ @illinois.edu ఇమెయిల్ ధృవీకరించండి", step1: "ప్రొఫైల్ సృష్టించు", step2: "మీ గురించి", step3: "హౌసింగ్ ప్రాధాన్యతలు", step4: "స్థానం & జీవనశైలి", step5: "బ్రేక్స్ & ల్యాండ్‌లార్డ్", emailPlaceholder: "netid@illinois.edu", namePlaceholder: "పూర్తి పేరు", bioPlaceholder: "సంభావ్య రూమ్‌మేట్లకు మీ గురించి చెప్పండి...", majorPlaceholder: "మేజర్" },
  profile: { title: "ప్రొఫైల్", signOut: "సైన్ అవుట్", resetAll: "అన్ని డేటా రీసెట్ చేయి", liked: "ఇష్టపడ్డారు", budget: "బడ్జెట్/నెల", listings: "లిస్టింగ్లు", housing: "హౌసింగ్ వివరాలు", lifestyle: "జీవనశైలి", breaks: "బ్రేక్ ప్లాన్లు", matching: "మ్యాచింగ్ ఎలా పని చేస్తుంది", signOutConfirm: "మీరు సైన్ అవుట్ చేయాలనుకుంటున్నారా?", resetConfirm: "ఇది మీ అన్ని డేటాను తొలగిస్తుంది. ఇది రద్దు చేయబడదు." },
  circle: { title: "నా సర్కిల్", myCircleTab: "నా సర్కిల్", matchesTab: "మ్యాచ్లు", addTitle: "నా సర్కిల్‌కు జోడించు", suggestions: "సూచించిన కనెక్షన్లు", emptyTitle: "మీ సర్కిల్ ఖాళీగా ఉంది", emptySub: "మీ మొదటి కనెక్షన్ జోడించండి", firstDegree: "1వ డిగ్రీ", secondDegree: "2వ డిగ్రీ", vouched: "మీరు వాచ్ చేశారు", noMatches: "ఇంకా మ్యాచ్లు లేవు", noMatchesSub: "రూమ్‌మేట్ కనుగొనడానికి మ్యాచ్‌మేకర్‌లో స్వైప్ చేయండి!" },
  marketplace: { title: "సబ్లీజ్ మార్కెట్‌ప్లేస్", noListings: "ఇంకా లిస్టింగ్లు లేవు", noListingsSub: "మొదటి సబ్లీజ్ పోస్ట్ చేయండి!", post: "పోస్ట్", perMonth: "/నెల", breakFriendly: "బ్రేక్-ఫ్రెండ్లీ" },
};

const ta: TranslationKeys = {
  langSelect: { title: "உங்கள் மொழியை தேர்வு செய்யுங்கள்", subtitle: "நீங்கள் மிகவும் வசதியாக உணரும் மொழியை தேர்வு செய்யுங்கள்", continue: "தொடர்க" },
  common: { continue: "தொடர்க", back: "திரும்பு", cancel: "ரத்து செய்", done: "முடிந்தது", post: "இடுக", add: "சேர்க்க", remove: "நீக்கு", signOut: "வெளியேறு", resetAll: "அனைத்து தரவையும் மீட்டமை", save: "சேமி" },
  nav: { browse: "உலாவு", myCircle: "என் வட்டம்", map: "வரைபடம்", profile: "சுயவிவரம்" },
  home: { greeting: "வணக்கம், {{name}}", tagline: "UIUC வீடுகள் — உங்கள் பொருத்தத்தை கண்டறியுங்கள்", browseBy: "வீட்டு வகை மூலம் உலாவுக", features: "மற்ற அம்சங்கள்", circle: "வட்டம்", listings: "பட்டியல்கள்", breakPosts: "இடைவேளை இடுகைகள்", protection: "PopMatch பாதுகாப்பு", summerOnly: "கோடை மட்டும்", augustGap: "ஆகஸ்ட் இடைவெளி", semester: "செமஸ்டர் / முழு ஆண்டு", shortTerm: "குறுகிய கால", matchmaker: "ஆண்டு மேட்ச்மேக்கர்", breaks: "இடைவேளை தங்குமிட பலகை", matchmakerSub: "அறைத்தோழரை கண்டறிய ஸ்வைப் செய்யுங்கள்", breaksSub: "நன்றியுணர்வு,봄 விடுமுறை, குளிர்காலம்" },
  onboarding: { welcome: "PopMatch-க்கு வரவேற்கிறோம்", subtitle: "UIUC மாணவர்கள் மட்டும் — உங்கள் @illinois.edu மின்னஞ்சலை சரிபார்க்கவும்", step1: "சுயவிவரம் உருவாக்கு", step2: "உங்களைப் பற்றி", step3: "வீட்டு விருப்பங்கள்", step4: "இடம் & வாழ்க்கை முறை", step5: "இடைவேளை & வீட்டுடைமையாளர்", emailPlaceholder: "netid@illinois.edu", namePlaceholder: "முழு பெயர்", bioPlaceholder: "சாத்தியமான அறைத்தோழர்களுக்கு உங்களைப் பற்றி சொல்லுங்கள்...", majorPlaceholder: "பிரிவு" },
  profile: { title: "சுயவிவரம்", signOut: "வெளியேறு", resetAll: "அனைத்து தரவையும் மீட்டமை", liked: "விரும்பினவை", budget: "பட்ஜெட்/மாதம்", listings: "பட்டியல்கள்", housing: "வீட்டு விவரங்கள்", lifestyle: "வாழ்க்கை முறை", breaks: "இடைவேளை திட்டங்கள்", matching: "பொருத்தம் எவ்வாறு செயல்படுகிறது", signOutConfirm: "வெளியேற விரும்புகிறீர்களா?", resetConfirm: "இது உங்கள் அனைத்து தரவையும் நீக்கும். இதை செயல்தவிர்க்க முடியாது." },
  circle: { title: "என் வட்டம்", myCircleTab: "என் வட்டம்", matchesTab: "பொருத்தங்கள்", addTitle: "என் வட்டத்தில் சேர்க்கவும்", suggestions: "பரிந்துரைக்கப்பட்ட தொடர்புகள்", emptyTitle: "உங்கள் வட்டம் காலியாக உள்ளது", emptySub: "உங்கள் முதல் தொடர்பை சேர்க்கவும்", firstDegree: "1ம் நிலை", secondDegree: "2ம் நிலை", vouched: "நீங்கள் உத்தரவாதம் அளித்தீர்கள்", noMatches: "இன்னும் பொருத்தங்கள் இல்லை", noMatchesSub: "அறைத்தோழரை கண்டறிய மேட்ச்மேக்கரில் ஸ்வைப் செய்யுங்கள்!" },
  marketplace: { title: "சப்லீஸ் சந்தை", noListings: "இன்னும் பட்டியல்கள் இல்லை", noListingsSub: "முதல் சப்லீஸை இடுங்கள்!", post: "இடுக", perMonth: "/மாதம்", breakFriendly: "இடைவேளை-நட்பு" },
};

const es: TranslationKeys = {
  langSelect: { title: "Elige tu idioma", subtitle: "Selecciona el idioma con el que te sientas más cómodo", continue: "Continuar" },
  common: { continue: "Continuar", back: "Atrás", cancel: "Cancelar", done: "Listo", post: "Publicar", add: "Agregar", remove: "Eliminar", signOut: "Cerrar sesión", resetAll: "Restablecer todo", save: "Guardar" },
  nav: { browse: "Explorar", myCircle: "Mi Círculo", map: "Mapa", profile: "Perfil" },
  home: { greeting: "Hola, {{name}}", tagline: "Vivienda UIUC — Encuentra tu pareja", browseBy: "Explorar por tipo de vivienda", features: "Otras funciones", circle: "Círculo", listings: "Anuncios", breakPosts: "Posts de vacaciones", protection: "Protección PopMatch", summerOnly: "Solo verano", augustGap: "El Hueco de Agosto", semester: "Semestre / Todo el año", shortTerm: "Corto plazo", matchmaker: "Buscador de compañero", breaks: "Tablero de vacaciones", matchmakerSub: "Desliza para encontrar compañero", breaksSub: "Acción de Gracias, primavera, invierno" },
  onboarding: { welcome: "Bienvenido a PopMatch", subtitle: "Solo estudiantes UIUC — verifica tu email @illinois.edu", step1: "Crear perfil", step2: "Sobre ti", step3: "Preferencias", step4: "Ubicación y estilo de vida", step5: "Vacaciones y arrendador", emailPlaceholder: "netid@illinois.edu", namePlaceholder: "Nombre completo", bioPlaceholder: "Cuéntales a posibles compañeros sobre ti...", majorPlaceholder: "Carrera" },
  profile: { title: "Perfil", signOut: "Cerrar sesión", resetAll: "Restablecer todo", liked: "Me gustó", budget: "Presupuesto/mes", listings: "Anuncios", housing: "Detalles de vivienda", lifestyle: "Estilo de vida", breaks: "Planes de vacaciones", matching: "Cómo funciona el matching", signOutConfirm: "¿Estás seguro de que quieres cerrar sesión?", resetConfirm: "Esto borrará todos tus datos. No se puede deshacer." },
  circle: { title: "Mi Círculo", myCircleTab: "Mi Círculo", matchesTab: "Matches", addTitle: "Agregar a Mi Círculo", suggestions: "Conexiones sugeridas", emptyTitle: "Tu círculo está vacío", emptySub: "Agrega tu primera conexión", firstDegree: "1er Grado", secondDegree: "2do Grado", vouched: "Avalaste", noMatches: "Aún no hay matches", noMatchesSub: "¡Desliza en el Matchmaker para encontrar compañero!" },
  marketplace: { title: "Mercado de Subarrendamiento", noListings: "Aún no hay anuncios", noListingsSub: "¡Sé el primero en publicar!", post: "Publicar", perMonth: "/mes", breakFriendly: "Amigable con vacaciones" },
};

const ko: TranslationKeys = {
  langSelect: { title: "언어를 선택하세요", subtitle: "가장 편한 언어를 선택하세요", continue: "계속하기" },
  common: { continue: "계속하기", back: "뒤로", cancel: "취소", done: "완료", post: "게시", add: "추가", remove: "삭제", signOut: "로그아웃", resetAll: "모든 데이터 초기화", save: "저장" },
  nav: { browse: "탐색", myCircle: "내 서클", map: "지도", profile: "프로필" },
  home: { greeting: "안녕, {{name}}", tagline: "UIUC 주거 — 당신의 매치를 찾으세요", browseBy: "주거 유형별 탐색", features: "다른 기능들", circle: "서클", listings: "매물", breakPosts: "방학 게시글", protection: "PopMatch 보호", summerOnly: "여름 한정", augustGap: "8월 공백", semester: "학기 / 1년", shortTerm: "단기 & 이벤트", matchmaker: "연간 룸메이트 매칭", breaks: "방학 숙소 게시판", matchmakerSub: "스와이프해서 룸메이트 찾기", breaksSub: "추수감사절, 봄방학, 겨울방학" },
  onboarding: { welcome: "PopMatch에 오신 것을 환영합니다", subtitle: "UIUC 학생만 — @illinois.edu 이메일 인증", step1: "프로필 만들기", step2: "나에 대해", step3: "주거 선호도", step4: "위치 및 생활 방식", step5: "방학 및 집주인", emailPlaceholder: "netid@illinois.edu", namePlaceholder: "성명", bioPlaceholder: "잠재적 룸메이트에게 자신을 소개해 주세요...", majorPlaceholder: "전공" },
  profile: { title: "프로필", signOut: "로그아웃", resetAll: "모든 데이터 초기화", liked: "좋아한 항목", budget: "예산/월", listings: "매물", housing: "주거 상세정보", lifestyle: "생활 방식", breaks: "방학 계획", matching: "매칭 작동 방식", signOutConfirm: "로그아웃하시겠습니까?", resetConfirm: "모든 데이터가 삭제됩니다. 되돌릴 수 없습니다." },
  circle: { title: "내 서클", myCircleTab: "내 서클", matchesTab: "매치", addTitle: "내 서클에 추가", suggestions: "추천 연결", emptyTitle: "서클이 비어 있습니다", emptySub: "첫 번째 연결을 추가하세요", firstDegree: "1촌", secondDegree: "2촌", vouched: "보증했습니다", noMatches: "아직 매치가 없습니다", noMatchesSub: "룸메이트를 찾으려면 매치메이커에서 스와이프하세요!" },
  marketplace: { title: "전대 마켓플레이스", noListings: "아직 매물이 없습니다", noListingsSub: "첫 번째 전대를 게시하세요!", post: "게시", perMonth: "/월", breakFriendly: "방학 친화적" },
};

const tl: TranslationKeys = {
  langSelect: { title: "Pumili ng wika", subtitle: "Piliin ang wikang pinaka-komportable ka", continue: "Magpatuloy" },
  common: { continue: "Magpatuloy", back: "Bumalik", cancel: "Kanselahin", done: "Tapos na", post: "I-post", add: "Idagdag", remove: "Alisin", signOut: "Mag-sign out", resetAll: "I-reset ang lahat ng data", save: "I-save" },
  nav: { browse: "I-browse", myCircle: "Aking Grupo", map: "Mapa", profile: "Profile" },
  home: { greeting: "Kumusta, {{name}}", tagline: "UIUC Pabahay — Hanapin ang iyong katugma", browseBy: "I-browse ayon sa uri ng pabahay", features: "Iba pang mga tampok", circle: "Grupo", listings: "Mga Listahan", breakPosts: "Mga Post sa Bakasyon", protection: "Proteksyon ng PopMatch", summerOnly: "Tag-araw Lamang", augustGap: "Agwat ng Agosto", semester: "Semestre / Buong Taon", shortTerm: "Maikling Panahon", matchmaker: "Taunang Matchmaker", breaks: "Bulletin ng Bakasyon", matchmakerSub: "Mag-swipe para mahanap ang kasama sa kuwarto", breaksSub: "Thanksgiving, Spring, Winter" },
  onboarding: { welcome: "Maligayang pagdating sa PopMatch", subtitle: "Para sa mga UIUC estudyante lamang — i-verify ang iyong @illinois.edu na email", step1: "Gumawa ng Profile", step2: "Tungkol sa Iyo", step3: "Mga Kagustuhan sa Pabahay", step4: "Lokasyon at Pamumuhay", step5: "Bakasyon at Panginoong-Ari", emailPlaceholder: "netid@illinois.edu", namePlaceholder: "Buong pangalan", bioPlaceholder: "Ipakilala ang iyong sarili sa mga potensyal na kasama sa kuwarto...", majorPlaceholder: "Major" },
  profile: { title: "Profile", signOut: "Mag-sign out", resetAll: "I-reset ang lahat ng data", liked: "Na-like", budget: "Badyet/buwan", listings: "Mga Listahan", housing: "Mga Detalye ng Pabahay", lifestyle: "Pamumuhay", breaks: "Mga Plano sa Bakasyon", matching: "Paano Gumagana ang Pagtutugma", signOutConfirm: "Sigurado ka bang gusto mong mag-sign out?", resetConfirm: "Mabubura ang lahat ng iyong data. Hindi ito mababawi." },
  circle: { title: "Aking Grupo", myCircleTab: "Aking Grupo", matchesTab: "Mga Tugma", addTitle: "Idagdag sa Aking Grupo", suggestions: "Mga Mungkahing Koneksyon", emptyTitle: "Walang laman ang iyong grupo", emptySub: "Idagdag ang iyong unang koneksyon", firstDegree: "1st Degree", secondDegree: "2nd Degree", vouched: "Na-vouch mo", noMatches: "Wala pang mga tugma", noMatchesSub: "Mag-swipe sa Matchmaker para mahanap ang kasama sa kuwarto!" },
  marketplace: { title: "Sublease Marketplace", noListings: "Wala pang mga listahan", noListingsSub: "Maging una sa pag-post ng sublease!", post: "I-post", perMonth: "/buwan", breakFriendly: "Bakasyon-Friendly" },
};

const ar: TranslationKeys = {
  langSelect: { title: "اختر لغتك", subtitle: "اختر اللغة التي تشعر بأكبر قدر من الراحة معها", continue: "متابعة" },
  common: { continue: "متابعة", back: "رجوع", cancel: "إلغاء", done: "تم", post: "نشر", add: "إضافة", remove: "إزالة", signOut: "تسجيل الخروج", resetAll: "إعادة تعيين جميع البيانات", save: "حفظ" },
  nav: { browse: "استعراض", myCircle: "دائرتي", map: "الخريطة", profile: "الملف الشخصي" },
  home: { greeting: "مرحباً، {{name}}", tagline: "إسكان UIUC — اعثر على تطابقك", browseBy: "تصفح حسب نوع السكن", features: "ميزات أخرى", circle: "الدائرة", listings: "القوائم", breakPosts: "منشورات الإجازة", protection: "حماية PopMatch", summerOnly: "الصيف فقط", augustGap: "فجوة أغسطس", semester: "الفصل الدراسي / السنة الكاملة", shortTerm: "قصير المدى", matchmaker: "المُزاوج السنوي", breaks: "لوحة إجازة السكن", matchmakerSub: "اسحب للعثور على شريك الغرفة", breaksSub: "عيد الشكر، الربيع، الشتاء" },
  onboarding: { welcome: "مرحباً بك في PopMatch", subtitle: "لطلاب UIUC فقط — تحقق من بريدك @illinois.edu", step1: "إنشاء ملف شخصي", step2: "عنك", step3: "تفضيلات السكن", step4: "الموقع ونمط الحياة", step5: "الإجازات والمُلاك", emailPlaceholder: "netid@illinois.edu", namePlaceholder: "الاسم الكامل", bioPlaceholder: "أخبر شركاء الغرفة المحتملين عن نفسك...", majorPlaceholder: "التخصص" },
  profile: { title: "الملف الشخصي", signOut: "تسجيل الخروج", resetAll: "إعادة تعيين جميع البيانات", liked: "الإعجابات", budget: "الميزانية/الشهر", listings: "القوائم", housing: "تفاصيل السكن", lifestyle: "نمط الحياة", breaks: "خطط الإجازة", matching: "كيف يعمل التطابق", signOutConfirm: "هل أنت متأكد أنك تريد تسجيل الخروج؟", resetConfirm: "سيؤدي هذا إلى مسح جميع بياناتك. لا يمكن التراجع عن ذلك." },
  circle: { title: "دائرتي", myCircleTab: "دائرتي", matchesTab: "التطابقات", addTitle: "إضافة إلى دائرتي", suggestions: "اقتراحات الاتصال", emptyTitle: "دائرتك فارغة", emptySub: "أضف أول اتصال لك", firstDegree: "الدرجة الأولى", secondDegree: "الدرجة الثانية", vouched: "ضمنت", noMatches: "لا تطابقات بعد", noMatchesSub: "ابدأ التمرير في المُزاوج للعثور على شريك الغرفة!" },
  marketplace: { title: "سوق الإيجار الفرعي", noListings: "لا قوائم بعد", noListingsSub: "كن أول من ينشر إيجاراً فرعياً!", post: "نشر", perMonth: "/شهر", breakFriendly: "صديق للإجازة" },
};

const fr: TranslationKeys = {
  langSelect: { title: "Choisissez votre langue", subtitle: "Sélectionnez la langue avec laquelle vous vous sentez le plus à l'aise", continue: "Continuer" },
  common: { continue: "Continuer", back: "Retour", cancel: "Annuler", done: "Terminé", post: "Publier", add: "Ajouter", remove: "Supprimer", signOut: "Se déconnecter", resetAll: "Réinitialiser tout", save: "Enregistrer" },
  nav: { browse: "Explorer", myCircle: "Mon Cercle", map: "Carte", profile: "Profil" },
  home: { greeting: "Salut, {{name}}", tagline: "Logement UIUC — Trouvez votre correspondance", browseBy: "Parcourir par type de logement", features: "Autres fonctionnalités", circle: "Cercle", listings: "Annonces", breakPosts: "Posts de vacances", protection: "Protection PopMatch", summerOnly: "Été seulement", augustGap: "Créneau d'août", semester: "Semestre / Toute l'année", shortTerm: "Court terme", matchmaker: "Chercheur annuel", breaks: "Tableau des séjours de vacances", matchmakerSub: "Glissez pour trouver votre colocataire", breaksSub: "Thanksgiving, Printemps, Hiver" },
  onboarding: { welcome: "Bienvenue sur PopMatch", subtitle: "Étudiants UIUC uniquement — vérifiez votre email @illinois.edu", step1: "Créer un profil", step2: "À propos de vous", step3: "Préférences de logement", step4: "Lieu et style de vie", step5: "Vacances et propriétaire", emailPlaceholder: "netid@illinois.edu", namePlaceholder: "Nom complet", bioPlaceholder: "Présentez-vous aux colocataires potentiels...", majorPlaceholder: "Spécialité" },
  profile: { title: "Profil", signOut: "Se déconnecter", resetAll: "Réinitialiser tout", liked: "Aimé", budget: "Budget/mois", listings: "Annonces", housing: "Détails du logement", lifestyle: "Style de vie", breaks: "Plans de vacances", matching: "Comment fonctionne le matching", signOutConfirm: "Êtes-vous sûr de vouloir vous déconnecter ?", resetConfirm: "Ceci effacera toutes vos données. Cette action est irréversible." },
  circle: { title: "Mon Cercle", myCircleTab: "Mon Cercle", matchesTab: "Correspondances", addTitle: "Ajouter à Mon Cercle", suggestions: "Connexions suggérées", emptyTitle: "Votre cercle est vide", emptySub: "Ajoutez votre première connexion", firstDegree: "1er Degré", secondDegree: "2e Degré", vouched: "Vous avez garanti", noMatches: "Pas encore de correspondances", noMatchesSub: "Commencez à swiper dans le Matchmaker pour trouver votre colocataire !" },
  marketplace: { title: "Marché de sous-location", noListings: "Pas encore d'annonces", noListingsSub: "Soyez le premier à publier une sous-location !", post: "Publier", perMonth: "/mois", breakFriendly: "Adapté aux vacances" },
};

const de: TranslationKeys = {
  langSelect: { title: "Wählen Sie Ihre Sprache", subtitle: "Wählen Sie die Sprache, mit der Sie sich am wohlsten fühlen", continue: "Weiter" },
  common: { continue: "Weiter", back: "Zurück", cancel: "Abbrechen", done: "Fertig", post: "Veröffentlichen", add: "Hinzufügen", remove: "Entfernen", signOut: "Abmelden", resetAll: "Alle Daten zurücksetzen", save: "Speichern" },
  nav: { browse: "Erkunden", myCircle: "Mein Kreis", map: "Karte", profile: "Profil" },
  home: { greeting: "Hallo, {{name}}", tagline: "UIUC Wohnen — Finden Sie Ihre Übereinstimmung", browseBy: "Nach Wohnungstyp durchsuchen", features: "Andere Funktionen", circle: "Kreis", listings: "Anzeigen", breakPosts: "Ferienbeiträge", protection: "PopMatch-Schutz", summerOnly: "Nur Sommer", augustGap: "August-Lücke", semester: "Semester / Ganzes Jahr", shortTerm: "Kurzfristig", matchmaker: "Jährlicher Matchmaker", breaks: "Ferienunterkunft-Board", matchmakerSub: "Wischen Sie, um einen Mitbewohner zu finden", breaksSub: "Thanksgiving, Frühling, Winter" },
  onboarding: { welcome: "Willkommen bei PopMatch", subtitle: "Nur für UIUC-Studenten — verifizieren Sie Ihre @illinois.edu E-Mail", step1: "Profil erstellen", step2: "Über Sie", step3: "Wohnpräferenzen", step4: "Standort & Lebensstil", step5: "Ferien & Vermieter", emailPlaceholder: "netid@illinois.edu", namePlaceholder: "Vollständiger Name", bioPlaceholder: "Stellen Sie sich potenziellen Mitbewohnern vor...", majorPlaceholder: "Studiengang" },
  profile: { title: "Profil", signOut: "Abmelden", resetAll: "Alle Daten zurücksetzen", liked: "Gemocht", budget: "Budget/Monat", listings: "Anzeigen", housing: "Wohnungsdetails", lifestyle: "Lebensstil", breaks: "Ferienpläne", matching: "Wie Matching funktioniert", signOutConfirm: "Sind Sie sicher, dass Sie sich abmelden möchten?", resetConfirm: "Dies löscht alle Ihre Daten. Dies kann nicht rückgängig gemacht werden." },
  circle: { title: "Mein Kreis", myCircleTab: "Mein Kreis", matchesTab: "Übereinstimmungen", addTitle: "Zu meinem Kreis hinzufügen", suggestions: "Vorgeschlagene Verbindungen", emptyTitle: "Ihr Kreis ist leer", emptySub: "Fügen Sie Ihre erste Verbindung hinzu", firstDegree: "1. Grad", secondDegree: "2. Grad", vouched: "Sie haben gebürgt", noMatches: "Noch keine Übereinstimmungen", noMatchesSub: "Beginnen Sie im Matchmaker zu wischen, um einen Mitbewohner zu finden!" },
  marketplace: { title: "Untervermietungsmarkt", noListings: "Noch keine Anzeigen", noListingsSub: "Seien Sie der Erste, der eine Untervermietung veröffentlicht!", post: "Veröffentlichen", perMonth: "/Monat", breakFriendly: "Ferienfreundlich" },
};

const ja: TranslationKeys = {
  langSelect: { title: "言語を選択してください", subtitle: "最も快適に使える言語を選択してください", continue: "続ける" },
  common: { continue: "続ける", back: "戻る", cancel: "キャンセル", done: "完了", post: "投稿", add: "追加", remove: "削除", signOut: "サインアウト", resetAll: "全データをリセット", save: "保存" },
  nav: { browse: "ブラウズ", myCircle: "マイサークル", map: "マップ", profile: "プロフィール" },
  home: { greeting: "こんにちは、{{name}}", tagline: "UIUC 住宅 — あなたのマッチを見つけよう", browseBy: "住宅タイプ別に探す", features: "その他の機能", circle: "サークル", listings: "物件", breakPosts: "休暇投稿", protection: "PopMatchの保護", summerOnly: "夏限定", augustGap: "8月の空白期間", semester: "学期 / 1年間", shortTerm: "短期 & イベント", matchmaker: "年間マッチメーカー", breaks: "休暇滞在ボード", matchmakerSub: "スワイプしてルームメイトを見つけよう", breaksSub: "サンクスギビング、春休み、冬休み" },
  onboarding: { welcome: "PopMatchへようこそ", subtitle: "UIUCの学生のみ — @illinois.eduメールアドレスを確認してください", step1: "プロフィールを作成", step2: "あなたについて", step3: "住宅の希望", step4: "場所とライフスタイル", step5: "休暇と大家", emailPlaceholder: "netid@illinois.edu", namePlaceholder: "フルネーム", bioPlaceholder: "潜在的なルームメイトに自己紹介してください...", majorPlaceholder: "専攻" },
  profile: { title: "プロフィール", signOut: "サインアウト", resetAll: "全データをリセット", liked: "いいね！", budget: "予算/月", listings: "物件", housing: "住宅の詳細", lifestyle: "ライフスタイル", breaks: "休暇の計画", matching: "マッチングの仕組み", signOutConfirm: "サインアウトしてよろしいですか？", resetConfirm: "すべてのデータが削除されます。元に戻すことはできません。" },
  circle: { title: "マイサークル", myCircleTab: "マイサークル", matchesTab: "マッチ", addTitle: "マイサークルに追加", suggestions: "おすすめのつながり", emptyTitle: "サークルが空です", emptySub: "最初のつながりを追加してください", firstDegree: "1度つながり", secondDegree: "2度つながり", vouched: "保証しました", noMatches: "まだマッチがありません", noMatchesSub: "マッチメーカーでスワイプしてルームメイトを見つけましょう！" },
  marketplace: { title: "サブリース市場", noListings: "まだ物件がありません", noListingsSub: "最初のサブリースを投稿してください！", post: "投稿", perMonth: "/月", breakFriendly: "休暇対応" },
};

export const TRANSLATIONS: Record<LangCode, TranslationKeys> = {
  en, zh, yue, hi, te, ta, es, ko, tl, ar, fr, de, ja,
};

export function t(lang: LangCode, key: string, vars?: Record<string, string>): string {
  const parts = key.split(".");
  let val: any = TRANSLATIONS[lang] || TRANSLATIONS["en"];
  for (const p of parts) {
    val = val?.[p];
    if (val === undefined) break;
  }
  if (typeof val !== "string") {
    let fallback: any = TRANSLATIONS["en"];
    for (const p of parts) fallback = fallback?.[p];
    val = typeof fallback === "string" ? fallback : key;
  }
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      val = val.replace(`{{${k}}}`, v);
    }
  }
  return val;
}
