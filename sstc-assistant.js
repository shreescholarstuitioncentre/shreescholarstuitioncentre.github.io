/* =====================================================================
   SSTC AI Assistant  |  Shree Scholars Tuition Centre
   - 3D digital avatar (Male / Female choice)
   - Chat box + microphone (voice) + voice replies
   - Guides students: registration, enquiry, login, notes, fees, contact...
   Install: add  <script src="sstc-assistant.js" defer></script>
            just before </body> on every page.
   ===================================================================== */
(function () {
  "use strict";
  if (window.__sstcAI) return;

  /* ------------------------------------------------------------------
     1. SETTINGS  (yahin se sab kuch badal sakte hain)
  ------------------------------------------------------------------ */
  const CONFIG = {
    // Optional: Cloudflare Worker URL (worker.js). Khali chhodne par sirf
    // site-guide (rule-based) jawab milenge, jo free hain aur sahi links dete hain.
    aiEndpoint: "",
    threeUrl: "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    names: { male: "आरव", female: "आन्या" },
    registrationOpens: "2026-10-19", // site par likhi hui date
    homePage: "index.html",
  };

  const SITE = {
    sir:  { name: "Alekh Srivastava Sir",    role: "Science / Senior Classes",  tel: "918953012298", show: "+91 89530 12298" },
    maam: { name: "Pritha Srivastava Ma'am", role: "Commerce / Primary Classes", tel: "919565959697", show: "+91 95659 59697" },
    address: "Govind Ram Haveli के सामने, जटा शंकर चौक, दिलेज़ाकपुर, गोरखपुर, उत्तर प्रदेश – 273001",
    map: "https://www.google.com/maps?q=26.760083,83.366028",
    registerPage: "student-registration.html",
    accessPage: "sstc-access.html",
  };

  /* ------------------------------------------------------------------
     2. HELPERS
  ------------------------------------------------------------------ */
  const $ = (s, r) => (r || document).querySelector(s);
  const mk = (h) => { const d = document.createElement("div"); d.innerHTML = h.trim(); return d.firstChild; };
  const safe = (fn) => { try { return fn(); } catch (e) { return undefined; } };
  const store = {
    get: (k, d) => { const v = safe(() => localStorage.getItem(k)); return v === null || v === undefined ? d : v; },
    set: (k, v) => safe(() => localStorage.setItem(k, v)),
  };
  const sess = {
    get: (k, d) => { const v = safe(() => sessionStorage.getItem(k)); return v === null || v === undefined ? d : v; },
    set: (k, v) => safe(() => sessionStorage.setItem(k, v)),
    del: (k) => safe(() => sessionStorage.removeItem(k)),
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");

  const state = {
    gender: store.get("sstc_ai_gender", ""),
    sound: store.get("sstc_ai_sound", "1") === "1",
    open: false, speaking: false, listening: false, busy: false,
    history: [], stageReady: false,
  };
  const g = (m, f) => (state.gender === "female" ? f : m);
  const botName = () => CONFIG.names[state.gender || "male"];

  /* ------------------------------------------------------------------
     3. KNOWLEDGE BASE  (site ke asli data se)
  ------------------------------------------------------------------ */
  const act = {
    page: (label, v) => ({ t: "page", l: label, v }),
    go:   (label, v) => ({ t: "go", l: label, v }),
    tel:  (label, v) => ({ t: "tel", l: label, v }),
    wa:   (label, v) => ({ t: "wa", l: label, v }),
    ext:  (label, v) => ({ t: "ext", l: label, v }),
  };
  const callBoth = () => [
    act.tel("📞 Sir को कॉल", SITE.sir.tel), act.tel("📞 Ma'am को कॉल", SITE.maam.tel),
    act.wa("💬 Sir WhatsApp", SITE.sir.tel), act.wa("💬 Ma'am WhatsApp", SITE.maam.tel),
  ];
  const regStatus = () =>
    Date.now() >= new Date(CONFIG.registrationOpens + "T00:00:00+05:30").getTime()
      ? "✅ रजिस्ट्रेशन अभी चालू है।"
      : "📅 ध्यान दें: रजिस्ट्रेशन **19 अक्टूबर 2026** से शुरू होगा।";

  const FEE_TIERS = [
    { max: 2, label: "Nursery – Class 2", fee: 500, old: 1000 },
    { max: 5, label: "Class 3 – 5", fee: 1000, old: 2000 },
    { max: 8, label: "Class 6 – 8", fee: 1100, old: 2200 },
    { max: 10, label: "Class 9 – 10", fee: 1500, old: 3000 },
    { max: 12, label: "Class 11 – 12", fee: 1800, old: 3600 },
  ];
  function classFee(q) {
    const t = String(q || "").toLowerCase();
    let n = null;
    if (/nursery|playway|lkg|ukg|नर्सरी/.test(t)) n = 0;
    else {
      const m = t.match(/(?:class|cls|कक्षा)\s*(\d{1,2})|\b(\d{1,2})\s*(?:th|st|nd|rd|वीं|वी)\b/);
      if (m) n = +(m[1] || m[2]);
    }
    if (n === null || n > 12) return null;
    return FEE_TIERS.find((x) => n <= x.max);
  }

  const INTENTS = [
    { id: "register",
      kw: ["registration", "register", "registar", "regestration", "sign up", "signup", "रजिस्ट्रेशन", "पंजीकरण", "नाम लिखवाना", "naam likhwana"],
      reply: () => "📝 **रजिस्ट्रेशन** के लिए Student Registration पेज खोलें।\n" + regStatus() + "\nरजिस्ट्रेशन के लिए ज़रूरी जानकारी पहले से तैयार रखें।",
      actions: () => [act.page("📝 रजिस्ट्रेशन पेज खोलें", SITE.registerPage), act.go("📅 तारीख / ऑफर देखें", "#offerAccess")] },

    { id: "enquiry",
      kw: ["enquiry", "inquiry", "admission", "demo", "demo class", "join", "puchna", "poochna", "jankari", "jaankari", "batch", "पूछताछ", "एडमिशन", "दाखिला", "डेमो", "जानकारी"],
      reply: () => "❓ **पूछताछ / एडमिशन** के 3 आसान तरीके:\n1️⃣ \"Connect Us\" में बच्चे का नाम, क्लास और मोबाइल भरकर Sir/Ma'am को WhatsApp करें।\n2️⃣ \"Admission Form\" भरें।\n3️⃣ सीधे कॉल करें।\n🎁 Free Demo Class भी उपलब्ध है।",
      actions: () => [act.go("📲 Connect Us फ़ॉर्म", "#leadbox"), act.go("📋 Admission Form", ".contact-section")].concat(callBoth()) },

    { id: "login",
      kw: ["login", "log in", "signin", "sign in", "लॉगिन", "notes", "note", "नोट्स", "ebook", "e book", "e-book", "pdf", "library", "access", "sstc access", "study material", "लाइब्रेरी", "किताब", "पासवर्ड", "password"],
      reply: () => "🔐 **लॉगिन / नोट्स / E-Book Library** के लिए ऊपर हेडर में बैंगनी बटन **SSTC Access** पर क्लिक करें। वहाँ से अपनी क्लास की लाइब्रेरी, नोट्स और Question Bank खोल सकते हैं।",
      actions: () => [act.page("🔐 SSTC Access खोलें", SITE.accessPage), act.go("👆 बटन दिखाओ", ".sstc-access")] },

    { id: "offer",
      kw: ["offer", "plan", "plans", "rent", "question bank", "50%", "discount", "ऑफर", "छूट", "प्लान", "किराया", "kitne ka", "subject plan"],
      reply: () => "🎉 **50% OFF – हर सब्जेक्ट पर**\n\n**Question Bank (प्रति सब्जेक्ट):** 3 माह ₹49 | 6 माह ₹69 | 12 माह ₹99\nकोई भी 6 सब्जेक्ट: 6 माह ₹199 | 12 माह ₹399\n\n**Subject Notes (Rent, प्रति सब्जेक्ट):** 3 माह ₹69 | 6 माह ₹99 | 12 माह ₹149\nकोई भी 6 सब्जेक्ट: 6 माह ₹399 | 12 माह ₹599",
      actions: () => [act.go("👀 ऑफर सेक्शन देखें", "#offerAccess"), act.page("📝 रजिस्ट्रेशन", SITE.registerPage)] },

    { id: "fees",
      kw: ["fee", "fees", "fees structure", "monthly", "charges", "kitni fees", "price", "cost", "paisa", "paise", "kharcha", "rupaye", "फीस", "शुल्क", "मासिक", "pricing"],
      reply: (q) => {
        const c = classFee(q);
        if (c) return "💰 **" + c.label + "** की फीस **₹" + c.fee + "/माह** है (₹" + c.old + " पर 50% स्कॉलरशिप के साथ)।\nसही बैच और फीस की पुष्टि के लिए Sir / Ma'am से एक बार बात कर लें।";
        return "💰 **मासिक फीस (50% स्कॉलरशिप के साथ):**\n• Nursery – Class 2: ₹500\n• Class 3 – 5: ₹1000\n• Class 6 – 8: ₹1100\n• Class 9 – 10: ₹1500\n• Class 11 – 12: ₹1800\n(प्रति माह)\n\nकिसी क्लास की फीस जाननी हो तो लिखें, जैसे \"class 9 fees\"।";
      },
      actions: () => [act.go("💎 Fees Structure देखें", "#pricing"), act.go("📲 Join Now", "#leadbox")] },

    { id: "contact",
      kw: ["contact", "phone", "number", "mobile", "call", "whatsapp", "संपर्क", "नंबर", "मोबाइल", "कॉल", "baat karni", "बात करनी"],
      reply: () => "📞 **संपर्क करें:**\n• " + SITE.sir.name + " (" + SITE.sir.role + "): " + SITE.sir.show + "\n• " + SITE.maam.name + " (" + SITE.maam.role + "): " + SITE.maam.show,
      actions: () => callBoth() },

    { id: "address",
      kw: ["address", "location", "map", "direction", "directions", "route", "kahan hai", "kaha hai", "kahan par", "pata", "reach", "where", "पता", "कहां है", "कहाँ है", "लोकेशन", "रास्ता", "चौक"],
      reply: () => "📍 **हमारा पता:**\n" + SITE.address,
      actions: () => [act.ext("🧭 Google Maps Directions", SITE.map), act.go("🗺️ नक्शा देखें", ".contact-section")] },

    { id: "skills",
      kw: ["computer", "coding", "programming", "html", "excel", "coreldraw", "corel", "spoken english", "skill", "skills", "ai basics", "कंप्यूटर", "कोडिंग", "स्किल"],
      reply: () => "🚀 **Skill & Technology Programs:**\n• Basic Skills (Spoken English + Computer Basics): ₹500/माह\n• HTML + CSS: ₹999\n• Advanced Excel: ₹999\n• AI Basics: ₹1499\n• CorelDraw: ₹4999\n• Programming: ₹9999",
      actions: () => [act.go("🚀 Programs देखें", ".saas-section"), act.go("✅ Enroll Now", "#leadbox")] },

    { id: "courses",
      kw: ["course", "courses", "subject", "subjects", "class", "classes", "medium", "nursery", "kaun kaun", "पाठ्यक्रम", "विषय", "कक्षा", "कोर्स"],
      reply: () => "📚 **कोर्स:** Nursery से Class 12 तक, English और Hindi Medium।\nविषय: Maths, Science, Computer, Hindi, Sanskrit, English, Commerce और Computer Courses।\nClass 9–10 में सभी 6 विषय, Class 11–12 में PCM / PCB / Commerce।",
      actions: () => [act.go("📚 Courses देखें", ".courses"), act.go("💰 फीस", "#pricing")] },

    { id: "results",
      kw: ["result", "results", "topper", "toppers", "marks", "percent", "रिजल्ट", "टॉपर", "नतीजे", "अंक"],
      reply: () => "🏆 **Class 10 UP Board टॉपर्स:**\n• Adarsh Dwivedi – 80%\n• Harsh Verma – 78%\n• Tabish – 63%",
      actions: () => [act.go("🏆 Toppers देखें", ".results")] },

    { id: "teachers",
      kw: ["teacher", "teachers", "faculty", "sir", "maam", "ma am", "madam", "who teaches", "शिक्षक", "सर", "मैम", "टीचर"],
      reply: () => "👨‍🏫 **हमारे शिक्षक:**\n• **" + SITE.maam.name + "** – " + SITE.maam.role + "\n• **" + SITE.sir.name + "** – " + SITE.sir.role,
      actions: () => [act.go("📲 Connect Us", "#leadbox")] },

    { id: "install",
      kw: ["install", "app", "pwa", "download app", "ऐप", "इंस्टॉल", "ऍप"],
      reply: () => "📲 **Shree Scholars App** इंस्टॉल करने के लिए पेज पर \"Install\" बॉक्स का बटन दबाएँ। अगर दिखे नहीं तो ब्राउज़र के **⋮ मेनू → Add to Home screen** चुनें।",
      actions: () => [act.go("📲 Install बॉक्स", "#pwaInstallBox")] },

    { id: "timing",
      kw: ["timing", "timings", "batch time", "schedule", "samay", "kitne baje", "kab se", "kab tak", "kab", "समय", "टाइमिंग"],
      reply: () => "⏰ बैच के समय की सही जानकारी के लिए कृपया Sir / Ma'am से सीधे संपर्क करें।",
      actions: () => callBoth() },

    { id: "thanks",
      kw: ["thanks", "thank you", "thankyou", "shukriya", "dhanyavad", "धन्यवाद", "शुक्रिया", "थैंक्स"],
      reply: () => "आपका स्वागत है! 😊 और कुछ जानना हो तो बेझिझक पूछिए।", actions: () => [] },

    { id: "help",
      kw: ["help", "madad", "menu", "what can you do", "मदद", "kya kar sakte", "क्या कर सकते"],
      reply: () => "मैं इन सब में मदद कर सकत" + g("ा", "ी") + " हूँ: 📝 रजिस्ट्रेशन • ❓ पूछताछ/डेमो • 🔐 लॉगिन • 📚 नोट्स • 💰 फीस • 🎁 ऑफर • 📞 संपर्क नंबर • 📍 पता। नीचे बटन चुनें या अपना सवाल लिखें/बोलें।",
      actions: () => [] },

    { id: "greet", greet: true,
      kw: ["hi", "hello", "hey", "hii", "namaste", "namaskar", "good morning", "good evening", "नमस्ते", "हेलो", "हाय", "नमस्कार", "प्रणाम"],
      reply: () => "नमस्ते! 😊 मैं " + botName() + " हूँ, SSTC का AI असिस्टेंट। मैं रजिस्ट्रेशन, पूछताछ, लॉगिन, नोट्स, फीस, संपर्क नंबर और पता बताने में आपकी मदद कर सकत" + g("ा", "ी") + " हूँ। आप क्या जानना चाहते हैं?",
      actions: () => [] },
  ];

  const CHIPS = [
    ["📝 रजिस्ट्रेशन", "registration"], ["❓ पूछताछ / डेमो", "enquiry"], ["🔐 लॉगिन", "login"],
    ["📚 नोट्स", "notes"], ["💰 फीस", "fees"], ["🎁 ऑफर", "offer"],
    ["📞 संपर्क", "contact"], ["📍 पता", "address"], ["📚 कोर्स", "courses"],
  ];

  function norm(s) { return s.toLowerCase().replace(/[.,!?;:()"'‘’“”\-_/]/g, " ").replace(/\s+/g, " ").trim(); }
  function hasKw(msg, kw) {
    if (/[^\x00-\x7f]/.test(kw)) return msg.indexOf(kw) !== -1; // Devanagari
    const k = norm(kw).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp("(^|[^a-z0-9])" + k + "([^a-z0-9]|$)").test(msg);
  }
  function matchIntent(text) {
    const msg = norm(text);
    let best = null, bestScore = 0, greetHit = null;
    for (const it of INTENTS) {
      let s = 0;
      for (const k of it.kw) if (hasKw(msg, k)) s += k.length > 12 ? 2 : 1;
      if (!s) continue;
      if (it.greet) { greetHit = it; continue; }
      if (s > bestScore) { best = it; bestScore = s; }
    }
    return best || greetHit; // greeting sirf tab, jab aur kuch match na ho
  }

  /* ------------------------------------------------------------------
     4. STYLES
  ------------------------------------------------------------------ */
  const CSS = `
#sai-root,#sai-root *{box-sizing:border-box;font-family:Arial,"Noto Sans Devanagari","Nirmala UI",sans-serif}
#sai-root{position:fixed;left:16px;bottom:16px;z-index:9999;line-height:1.45}
.sai-fab{display:flex;align-items:center;gap:8px;border:none;cursor:pointer;color:#fff;font-weight:700;font-size:14px;
  padding:12px 18px;border-radius:40px;background:linear-gradient(45deg,#6c2bd9,#9c4dff);
  box-shadow:0 6px 18px rgba(108,43,217,.45);animation:saiPulse 2.2s infinite}
.sai-fab span{font-size:20px}
@keyframes saiPulse{0%{box-shadow:0 0 0 0 rgba(108,43,217,.6)}70%{box-shadow:0 0 0 14px rgba(108,43,217,0)}100%{box-shadow:0 0 0 0 rgba(108,43,217,0)}}
.sai-teaser{position:absolute;left:0;bottom:62px;width:230px;background:#fff;color:#333;font-size:13px;padding:10px 12px;
  border-radius:14px 14px 14px 4px;box-shadow:0 8px 24px rgba(0,0,0,.2);display:none;cursor:pointer;border:1px solid #eee}
.sai-teaser.show{display:block;animation:saiUp .4s ease}
@keyframes saiUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.sai-panel{position:absolute;left:0;bottom:0;width:380px;max-width:calc(100vw - 24px);height:620px;max-height:calc(100vh - 28px);
  background:#fff;border-radius:20px;box-shadow:0 18px 50px rgba(0,0,0,.35);display:flex;flex-direction:column;overflow:hidden;
  animation:saiUp .3s ease}
.sai-panel[hidden]{display:none}
.sai-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;color:#fff;
  background:linear-gradient(135deg,#0b1e3c,#4a1d9e)}
.sai-title strong{display:block;font-size:15px}
.sai-title small{font-size:11px;opacity:.85}
.sai-tools{display:flex;gap:6px;align-items:center}
.sai-tools button{width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;font-size:15px;color:#fff;
  background:rgba(255,255,255,.18);transition:.2s}
.sai-tools button:hover{background:rgba(255,255,255,.32)}
.sai-tools button.on{background:#ff9800;box-shadow:0 0 0 2px #fff}
.sai-stage{position:relative;height:210px;flex:0 0 auto;background:radial-gradient(circle at 50% 40%,#f3ecff,#dfe8ff 60%,#c9d6f5)}
.sai-stage canvas{width:100%;height:100%;display:block}
.sai-emoji{position:absolute;inset:0;display:none;align-items:center;justify-content:center;font-size:90px}
.sai-stage.listening::after{content:"";position:absolute;inset:8px;border-radius:16px;border:3px solid #d32f2f;animation:saiRing 1s infinite}
@keyframes saiRing{0%{opacity:1}50%{opacity:.25}100%{opacity:1}}
.sai-msgs{flex:1;overflow-y:auto;padding:12px;background:#f7f8fc;display:flex;flex-direction:column;gap:10px}
.sai-b{max-width:88%;padding:9px 12px;border-radius:14px;font-size:14px;word-wrap:break-word;animation:saiUp .25s ease}
.sai-b.bot{align-self:flex-start;background:#fff;color:#222;border:1px solid #e6e6ee;border-bottom-left-radius:4px}
.sai-b.user{align-self:flex-end;color:#fff;background:linear-gradient(45deg,#6c2bd9,#8b35db);border-bottom-right-radius:4px}
.sai-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.sai-acts button{border:1.5px solid #6c2bd9;background:#fff;color:#4a1d9e;font-size:12px;font-weight:700;padding:6px 10px;
  border-radius:20px;cursor:pointer;transition:.2s}
.sai-acts button:hover{background:#6c2bd9;color:#fff}
.sai-typing{display:inline-flex;gap:4px}
.sai-typing i{width:7px;height:7px;border-radius:50%;background:#9c4dff;animation:saiDot 1s infinite}
.sai-typing i:nth-child(2){animation-delay:.2s}.sai-typing i:nth-child(3){animation-delay:.4s}
@keyframes saiDot{0%,80%,100%{opacity:.25;transform:scale(.8)}40%{opacity:1;transform:scale(1.1)}}
.sai-chips{display:flex;gap:6px;overflow-x:auto;padding:8px 10px;background:#fff;border-top:1px solid #eee;scrollbar-width:thin}
.sai-chips button{flex:0 0 auto;border:1px solid #d9c9ff;background:#f6f0ff;color:#4a1d9e;font-size:12px;padding:6px 11px;border-radius:18px;cursor:pointer;white-space:nowrap}
.sai-chips button:hover{background:#6c2bd9;color:#fff}
.sai-input{display:flex;gap:6px;align-items:center;padding:8px 10px 10px;background:#fff}
.sai-input input{flex:1;min-width:0;border:1px solid #ddd;border-radius:22px;padding:10px 14px;font-size:14px;outline:none}
.sai-input input:focus{border-color:#6c2bd9}
.sai-input button{width:40px;height:40px;border-radius:50%;border:none;cursor:pointer;color:#fff;font-size:17px;flex:0 0 auto}
#sai-mic{background:#d32f2f}#sai-mic.on{animation:saiPulse 1s infinite;background:#b71c1c}
#sai-send{background:#6c2bd9}
.sai-choose{position:absolute;inset:0;z-index:5;background:linear-gradient(160deg,#0b1e3c,#4a1d9e);color:#fff;display:none;
  flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:22px;text-align:center}
.sai-choose.show{display:flex}
.sai-choose h3{font-size:19px}.sai-choose p{font-size:13px;opacity:.9}
.sai-pick{display:flex;gap:14px;margin-top:6px}
.sai-pick button{width:140px;padding:16px 8px;border-radius:18px;border:2px solid rgba(255,255,255,.4);background:rgba(255,255,255,.1);
  color:#fff;cursor:pointer;font-size:14px;transition:.25s}
.sai-pick button:hover{transform:translateY(-5px);background:#fff;color:#4a1d9e}
.sai-pick b{display:block;font-size:44px;margin-bottom:6px}
.sai-close2{background:none;border:none;color:#fff;opacity:.75;cursor:pointer;font-size:13px;text-decoration:underline;margin-top:6px}
.sai-hl{outline:4px solid #ff9800!important;outline-offset:6px;border-radius:14px;animation:saiHl 1s ease 3}
@keyframes saiHl{0%,100%{outline-color:#ff9800}50%{outline-color:#d32f2f}}
@media(max-width:600px){
  #sai-root{left:10px;bottom:10px}
  .sai-panel{position:fixed;left:8px;right:8px;bottom:8px;width:auto;height:88vh;max-height:none;max-width:none}
  .sai-stage{height:170px}
  .sai-fab b{font-size:13px}
}
@media(prefers-reduced-motion:reduce){.sai-fab,#sai-mic.on{animation:none}}
`;

  /* ------------------------------------------------------------------
     5. UI
  ------------------------------------------------------------------ */
  let els = {};
  function buildUI() {
    const st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);

    const root = mk(`
<div id="sai-root">
  <div class="sai-teaser" id="sai-teaser">नमस्ते! 👋 रजिस्ट्रेशन, नोट्स या फीस के बारे में पूछिए — मैं मदद करूँगा/करूँगी।</div>
  <button class="sai-fab" id="sai-fab" aria-label="SSTC AI असिस्टेंट खोलें"><span>🎓</span><b>AI Assistant</b></button>
  <section class="sai-panel" id="sai-panel" role="dialog" aria-label="SSTC AI Assistant" hidden>
    <header class="sai-head">
      <div class="sai-title"><strong id="sai-name">SSTC Assistant</strong><small id="sai-status">ऑनलाइन</small></div>
      <div class="sai-tools">
        <button id="sai-gm" title="Male assistant" aria-label="Male assistant">👨</button>
        <button id="sai-gf" title="Female assistant" aria-label="Female assistant">👩</button>
        <button id="sai-snd" title="आवाज़ चालू/बंद" aria-label="आवाज़ चालू बंद">🔊</button>
        <button id="sai-x" title="बंद करें" aria-label="बंद करें">✕</button>
      </div>
    </header>
    <div class="sai-stage" id="sai-stage"><canvas id="sai-canvas"></canvas><div class="sai-emoji" id="sai-emoji"></div></div>
    <div class="sai-msgs" id="sai-msgs" aria-live="polite"></div>
    <div class="sai-chips" id="sai-chips"></div>
    <div class="sai-input">
      <button id="sai-mic" title="बोलकर पूछें" aria-label="माइक">🎤</button>
      <input id="sai-in" type="text" placeholder="अपना सवाल लिखें या 🎤 दबाएँ…" autocomplete="off" enterkeyhint="send">
      <button id="sai-send" title="भेजें" aria-label="भेजें">➤</button>
    </div>
    <div class="sai-choose" id="sai-choose">
      <h3>अपना AI असिस्टेंट चुनें</h3>
      <p>आप किसके साथ बात करना चाहेंगे?</p>
      <div class="sai-pick">
        <button data-g="male"><b>👨‍🏫</b>Male<br><small>${CONFIG.names.male}</small></button>
        <button data-g="female"><b>👩‍🏫</b>Female<br><small>${CONFIG.names.female}</small></button>
      </div>
      <button class="sai-close2" id="sai-close2">अभी नहीं</button>
    </div>
  </section>
</div>`);
    document.body.appendChild(root);

    els = {
      root, fab: $("#sai-fab"), panel: $("#sai-panel"), teaser: $("#sai-teaser"), name: $("#sai-name"),
      status: $("#sai-status"), stage: $("#sai-stage"), canvas: $("#sai-canvas"), emoji: $("#sai-emoji"),
      msgs: $("#sai-msgs"), chips: $("#sai-chips"), input: $("#sai-in"), mic: $("#sai-mic"),
      snd: $("#sai-snd"), gm: $("#sai-gm"), gf: $("#sai-gf"), choose: $("#sai-choose"),
    };

    CHIPS.forEach(([label, q]) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = label;
      b.onclick = () => handleUser(label.replace(/^[^\s]+\s/, ""), false, q);
      els.chips.appendChild(b);
    });

    els.fab.onclick = openPanel;
    els.teaser.onclick = () => { els.teaser.classList.remove("show"); openPanel(); };
    $("#sai-x").onclick = closePanel;
    $("#sai-close2").onclick = closePanel;
    $("#sai-send").onclick = sendTyped;
    els.input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); sendTyped(); } });
    els.mic.onclick = toggleMic;
    els.snd.onclick = () => {
      state.sound = !state.sound; store.set("sstc_ai_sound", state.sound ? "1" : "0");
      if (!state.sound) stopSpeaking();
      refreshHeader();
    };
    els.gm.onclick = () => switchGender("male");
    els.gf.onclick = () => switchGender("female");
    els.choose.querySelectorAll("[data-g]").forEach((b) => (b.onclick = () => pickGender(b.dataset.g)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && state.open) closePanel(); });
    window.addEventListener("resize", resizeStage);
    document.addEventListener("visibilitychange", () => { if (document.hidden) stopLoop(); else if (state.open) startLoop(); });
    window.addEventListener("pagehide", stopSpeaking);
    refreshHeader();
  }

  function refreshHeader() {
    els.name.textContent = state.gender ? botName() + " • SSTC AI" : "SSTC AI Assistant";
    els.gm.classList.toggle("on", state.gender === "male");
    els.gf.classList.toggle("on", state.gender === "female");
    els.snd.textContent = state.sound ? "🔊" : "🔇";
    els.status.textContent = state.listening ? g("सुन रहा हूँ…", "सुन रही हूँ…")
      : state.speaking ? g("बोल रहा हूँ…", "बोल रही हूँ…") : "ऑनलाइन • मदद के लिए तैयार";
    els.stage.classList.toggle("listening", state.listening);
    els.mic.classList.toggle("on", state.listening);
  }

  /* ---------- messages ---------- */
  function scrollDown() { els.msgs.scrollTop = els.msgs.scrollHeight; }

  function renderMsg(role, text, actions) {
    const b = document.createElement("div");
    b.className = "sai-b " + role;
    b.innerHTML = fmt(text);
    if (actions && actions.length) {
      const row = document.createElement("div");
      row.className = "sai-acts";
      actions.forEach((a) => {
        const btn = document.createElement("button");
        btn.type = "button"; btn.textContent = a.l;
        btn.onclick = () => runAction(a);
        row.appendChild(btn);
      });
      b.appendChild(row);
    }
    els.msgs.appendChild(b);
    scrollDown();
    return b;
  }

  function addMsg(role, text, actions, opts) {
    opts = opts || {};
    renderMsg(role, text, actions);
    state.history.push({ role, text, actions: actions || [] });
    if (state.history.length > 30) state.history.shift();
    sess.set("sstc_ai_hist", JSON.stringify(state.history));
    if (role === "bot" && opts.speak) speak(text);
  }

  function showTyping() {
    const b = document.createElement("div");
    b.className = "sai-b bot";
    b.innerHTML = '<span class="sai-typing"><i></i><i></i><i></i></span>';
    els.msgs.appendChild(b); scrollDown();
    return b;
  }

  /* ---------- actions ---------- */
  function goTo(sel) {
    let el = null;
    try { el = document.querySelector(sel); } catch (e) {}
    if (!el) { // dusre page par ho to home page par le jao
      sess.set("sstc_ai_goto", sel);
      location.href = CONFIG.homePage;
      return;
    }
    if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") {
      addMsg("bot", "यह हिस्सा अभी स्क्रीन पर उपलब्ध नहीं है।");
      return;
    }
    if (window.innerWidth <= 700) closePanel(); // mobile par panel hata do
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("sai-hl"); void el.offsetWidth; el.classList.add("sai-hl");
    setTimeout(() => el.classList.remove("sai-hl"), 3500);
  }

  function runAction(a) {
    if (a.t === "page") location.href = a.v;
    else if (a.t === "go") goTo(a.v);
    else if (a.t === "tel") location.href = "tel:+" + a.v;
    else if (a.t === "wa") window.open("https://wa.me/" + a.v + "?text=" + encodeURIComponent("नमस्ते, मुझे Shree Scholars Tuition Centre के बारे में जानकारी चाहिए।"), "_blank");
    else if (a.t === "ext") window.open(a.v, "_blank", "noopener");
  }

  /* ---------- conversation ---------- */
  function sendTyped() {
    const t = els.input.value.trim();
    if (!t) return;
    els.input.value = "";
    handleUser(t, false);
  }

  async function askAI(q, hist) {
    const r = await fetch(CONFIG.aiEndpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gender: state.gender || "male", messages: hist.concat([{ role: "user", content: q }]) }),
    });
    if (!r.ok) throw new Error("AI " + r.status);
    const d = await r.json();
    return d.reply;
  }

  async function handleUser(text, viaVoice, matchText) {
    if (state.busy || !text) return;
    stopSpeaking();
    const hist = state.history.slice(-6).map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text }));
    while (hist.length && hist[0].role !== "user") hist.shift();
    addMsg("user", text);
    state.busy = true;
    const typing = showTyping();
    const speakIt = state.sound || viaVoice;
    await new Promise((r) => setTimeout(r, 350));
    const intent = matchIntent(matchText || text);
    let reply, actions = [];
    if (intent) {
      reply = intent.reply(matchText || text); actions = intent.actions();
    } else if (CONFIG.aiEndpoint) {
      try { reply = await askAI(text, hist); }
      catch (e) { reply = null; }
    }
    if (!reply) {
      reply = "माफ़ कीजिए, मैं यह पूरी तरह समझ नहीं पाया/पाई। 🙏 नीचे दिए विकल्प चुनें, या Sir / Ma'am से सीधे बात करें।";
      actions = callBoth();
    }
    typing.remove();
    state.busy = false;
    addMsg("bot", reply, actions, { speak: speakIt });
  }

  /* ---------- gender / open / close ---------- */
  function greet() {
    const first = matchIntent("hello");
    addMsg("bot", first.reply(), [], { speak: state.sound });
  }

  async function pickGender(gen) {
    state.gender = gen; store.set("sstc_ai_gender", gen);
    els.choose.classList.remove("show");
    refreshHeader();
    await ensureStage(); resizeStage(); startLoop();
    if (!state.history.length) greet();
  }

  async function switchGender(gen) {
    if (state.gender === gen) return;
    state.gender = gen; store.set("sstc_ai_gender", gen);
    refreshHeader();
    await ensureStage(); buildAvatar(gen);
    stopSpeaking();
    addMsg("bot", "नमस्ते! मैं " + botName() + " हूँ। अब मैं आपकी मदद करूँगा/करूँगी — पूछिए!".replace("करूँगा/करूँगी", g("करूँगा", "करूँगी")), [], { speak: state.sound });
  }

  async function openPanel() {
    state.open = true;
    els.teaser.classList.remove("show");
    sess.set("sstc_ai_teaser", "1");
    els.fab.style.display = "none";
    els.panel.hidden = false;
    if (!state.gender) { els.choose.classList.add("show"); return; }
    await ensureStage(); resizeStage(); startLoop();
    if (!state.history.length) greet();
    scrollDown();
    setTimeout(() => els.input.focus({ preventScroll: true }), 150);
  }

  function closePanel() {
    state.open = false;
    els.panel.hidden = true;
    els.fab.style.display = "";
    stopSpeaking(); stopMic(); stopLoop();
  }

  /* ------------------------------------------------------------------
     6. VOICE  (browser ki free Web Speech API)
  ------------------------------------------------------------------ */
  let voices = [], rec = null, speakQ = 0;
  function loadVoices() { voices = (window.speechSynthesis && speechSynthesis.getVoices()) || []; }
  if (window.speechSynthesis) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }

  function pickVoice() {
    const hi = voices.filter((v) => /^hi/i.test(v.lang));
    const pool = hi.length ? hi : voices.filter((v) => /^en-IN/i.test(v.lang));
    if (!pool.length) return null;
    const fem = /female|kalpana|lekha|swara|neerja|heera|google.*(hindi|हिन्दी)/i;
    const mal = /\bmale\b|hemant|madhur|prabhat|ravi/i;
    const want = state.gender === "female" ? fem : mal;
    return pool.find((v) => want.test(v.name)) || pool[0];
  }

  function cleanForSpeech(t) {
    return t.replace(/\*\*/g, "")
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "")
      .replace(/₹\s?(\d[\d,]*)/g, "$1 रुपये")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\+91\s?([\d ]+)/g, (m, d) => d.replace(/\D/g, "").split("").join(" "))
      .replace(/[•\-–]/g, ",")
      .replace(/\s+/g, " ").trim();
  }

  function setSpeaking(v) { state.speaking = v; refreshHeader(); }

  function speak(text) {
    if (!window.speechSynthesis) return; // caller (addMsg) decide karta hai ki bolna hai ya nahi
    stopSpeaking();
    const chunks = cleanForSpeech(text).split(/(?<=[।.!?\n])\s*/).filter(Boolean);
    if (!chunks.length) return;
    const my = ++speakQ;
    const v = pickVoice();
    chunks.forEach((c, i) => {
      const u = new SpeechSynthesisUtterance(c);
      u.lang = (v && v.lang) || "hi-IN";
      if (v) u.voice = v;
      u.rate = 0.98;
      u.pitch = state.gender === "female" ? 1.15 : 0.8;
      if (i === 0) u.onstart = () => { if (my === speakQ) setSpeaking(true); };
      if (i === chunks.length - 1) { u.onend = u.onerror = () => { if (my === speakQ) setSpeaking(false); }; }
      speechSynthesis.speak(u);
    });
  }

  function stopSpeaking() {
    speakQ++;
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (state.speaking) setSpeaking(false);
  }

  function setListening(v) { state.listening = v; refreshHeader(); }
  function stopMic() { if (rec) { try { rec.abort(); } catch (e) {} rec = null; } setListening(false); }

  function toggleMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      addMsg("bot", "इस ब्राउज़र में माइक सपोर्ट नहीं है। 🙏 कृपया Chrome इस्तेमाल करें या टाइप करके पूछें।");
      return;
    }
    if (state.listening) { rec && rec.stop(); return; }
    stopSpeaking();
    rec = new SR();
    rec.lang = "hi-IN"; rec.interimResults = true; rec.maxAlternatives = 1;
    let finalText = "";
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
      }
      els.input.value = (finalText + interim).trim();
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed")
        addMsg("bot", "माइक की अनुमति नहीं मिली। 🙏 ब्राउज़र की एड्रेस बार में माइक को **Allow** करें।");
    };
    rec.onend = () => {
      setListening(false); rec = null;
      const t = els.input.value.trim();
      if (t) { els.input.value = ""; handleUser(t, true); }
    };
    try { rec.start(); } catch (e) { setListening(false); }
  }

  /* ------------------------------------------------------------------
     7. 3D AVATAR  (Three.js, koi model-file nahi chahiye)
  ------------------------------------------------------------------ */
  let T = null, renderer, scene, camera, clock, avatar = null, rig = null, raf = 0;
  let nextBlink = 2, blinkAt = -1, mouthOpen = 0;

  async function ensureStage() {
    if (state.stageReady === true) { if (!avatar) buildAvatar(state.gender); return true; }
    if (state.stageReady === "failed") return false;
    try {
      T = await import(CONFIG.threeUrl);
      renderer = new T.WebGLRenderer({ canvas: els.canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      scene = new T.Scene();
      camera = new T.PerspectiveCamera(35, 1, 0.1, 50);
      camera.position.set(0, 0.1, 4.2); camera.lookAt(0, 0.1, 0);
      scene.add(new T.AmbientLight(0xffffff, 1.0));
      const key = new T.DirectionalLight(0xffffff, 1.4); key.position.set(1.5, 2, 3); scene.add(key);
      const rim = new T.DirectionalLight(0xb9a3ff, 0.6); rim.position.set(-2, 1, -2); scene.add(rim);
      clock = new T.Clock();
      state.stageReady = true;
      buildAvatar(state.gender);
      return true;
    } catch (e) {
      console.warn("SSTC avatar: 3D load nahi hua, emoji avatar dikha rahe hain.", e);
      state.stageReady = "failed";
      els.canvas.style.display = "none";
      els.emoji.style.display = "flex";
      els.emoji.textContent = state.gender === "female" ? "👩‍🏫" : "👨‍🏫";
      return false;
    }
  }

  function disposeObj(o) {
    o.traverse((n) => {
      if (n.geometry) n.geometry.dispose();
      if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => m.dispose());
    });
  }

  function buildAvatar(gender) {
    if (!T) return;
    if (avatar) { scene.remove(avatar); disposeObj(avatar); }
    const f = gender === "female";
    const M = (c, o) => new T.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
    const skin = M(f ? 0xe6b48e : 0xd9a279);
    const hair = M(0x17100d);
    const shirt = M(f ? 0x6c2bd9 : 0x0b1e3c);
    const white = M(0xffffff), dark = M(0x111111);
    const mouthMat = M(f ? 0x8e1b3a : 0x5a0f12);

    const root = new T.Group();
    const head = new T.Group();
    root.add(head);
    const add = (parent, geo, mat, x, y, z, sx, sy, sz) => {
      const m = new T.Mesh(geo, mat);
      m.position.set(x, y, z); m.scale.set(sx || 1, sy || 1, sz || 1);
      parent.add(m); return m;
    };

    // body + neck
    add(root, new T.SphereGeometry(0.8, 32, 24), shirt, 0, -0.98, 0, 1.0, 0.7, 0.6);
    add(root, new T.CylinderGeometry(0.15, 0.17, 0.45, 20), skin, 0, -0.22, 0);
    if (!f) add(root, new T.TorusGeometry(0.2, 0.035, 8, 24, Math.PI), white, 0, -0.42, 0.18, 1, 1, 1).rotation.z = Math.PI; // collar

    // head
    add(head, new T.SphereGeometry(0.55, 40, 32), skin, 0, 0.55, 0, 1, 1.08, 1);
    add(head, new T.SphereGeometry(0.075, 12, 10), skin, -0.55, 0.52, 0, 0.6, 1.4, 0.8); // ears
    add(head, new T.SphereGeometry(0.075, 12, 10), skin, 0.55, 0.52, 0, 0.6, 1.4, 0.8);
    add(head, new T.SphereGeometry(0.052, 12, 10), skin, 0, 0.5, 0.54, 0.9, 1.1, 0.9); // nose

    // hair
    const cap = add(head, new T.SphereGeometry(0.585, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.52), hair, 0, 0.57, -0.03);
    cap.rotation.x = f ? -0.5 : -0.42;
    if (f) {
      add(head, new T.SphereGeometry(0.6, 32, 24), hair, 0, -0.1, -0.3, 1.0, 1.3, 0.55);       // long hair (back)
      add(head, new T.SphereGeometry(0.15, 16, 12), hair, -0.5, 0.35, 0.02, 0.8, 3.0, 1.5);     // side locks
      add(head, new T.SphereGeometry(0.15, 16, 12), hair, 0.5, 0.35, 0.02, 0.8, 3.0, 1.5);
    }

    // eyes (blink ke liye alag group)
    const eyes = [];
    [-0.2, 0.2].forEach((x) => {
      const eg = new T.Group(); eg.position.set(x, 0.62, 0); head.add(eg);
      add(eg, new T.SphereGeometry(0.075, 16, 12), white, 0, 0, 0.49, 1, 1, 0.55);
      add(eg, new T.SphereGeometry(0.042, 12, 10), dark, 0, 0, 0.52, 1, 1, 0.5);
      eyes.push(eg);
      const brow = add(head, new T.BoxGeometry(0.17, 0.022, 0.03), hair, x, 0.745, 0.49, 1, f ? 1 : 1.8, 1);
      brow.rotation.z = x < 0 ? 0.08 : -0.08;
      if (f) add(head, new T.BoxGeometry(0.17, 0.012, 0.02), dark, x, 0.695, 0.51);
    });
    if (f) { // halka blush
      const bl = M(0xff8a80, { transparent: true, opacity: 0.4 });
      add(head, new T.SphereGeometry(0.07, 12, 10), bl, -0.3, 0.42, 0.44, 1, 1, 0.3);
      add(head, new T.SphereGeometry(0.07, 12, 10), bl, 0.3, 0.42, 0.44, 1, 1, 0.3);
    }

    // mouth: smile (idle) + open ellipse (bolte waqt)
    const mouth = add(head, new T.SphereGeometry(0.1, 16, 12), mouthMat, 0, 0.32, 0.5, 1, 0.15, 0.4);
    const smile = add(head, new T.TorusGeometry(0.09, 0.013, 6, 18, Math.PI), mouthMat, 0, 0.41, 0.54);
    smile.rotation.z = Math.PI;

    root.position.y = -0.05;
    scene.add(root);
    avatar = root;
    rig = { head, eyes, mouth, smile, root };
  }

  function resizeStage() {
    if (!renderer || !els.canvas) return;
    const w = els.canvas.clientWidth, h = els.canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    if (!rig) return;
    const t = clock.getElapsedTime();
    const { head, eyes, mouth, smile, root } = rig;
    root.position.y = -0.05 + Math.sin(t * 1.4) * 0.012;
    head.rotation.y = Math.sin(t * 0.6) * 0.12 + (state.speaking ? Math.sin(t * 2.3) * 0.06 : 0);
    head.rotation.x = Math.sin(t * 0.9) * 0.03 + (state.speaking ? Math.sin(t * 5) * 0.035 : 0);
    head.rotation.z = state.listening ? 0.13 : Math.sin(t * 0.45) * 0.02;

    if (t > nextBlink) { blinkAt = t; nextBlink = t + 2.5 + Math.random() * 3; }
    const bp = t - blinkAt;
    const es = bp >= 0 && bp < 0.15 ? 1 - Math.sin((bp / 0.15) * Math.PI) * 0.92 : 1;
    eyes.forEach((e) => (e.scale.y = es));

    const target = state.speaking
      ? 0.25 + Math.abs(Math.sin(t * 12)) * 0.5 * (0.55 + 0.45 * Math.abs(Math.sin(t * 3.3)))
      : 0;
    mouthOpen += (target - mouthOpen) * 0.35;
    mouth.scale.y = 0.15 + mouthOpen * 1.3;
    const open = mouthOpen > 0.1;
    mouth.visible = open; smile.visible = !open;
    renderer.render(scene, camera);
  }
  function startLoop() { if (!raf && state.stageReady === true) { clock.start(); tick(); } }
  function stopLoop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  /* ------------------------------------------------------------------
     8. INIT
  ------------------------------------------------------------------ */
  function init() {
    window.__sstcAI = { matchIntent };
    buildUI();

    // pichhli chat (jab student dusre page par gaya ho) wapas dikhao
    try {
      const saved = JSON.parse(sess.get("sstc_ai_hist", "[]"));
      if (Array.isArray(saved)) {
        saved.forEach((m) => renderMsg(m.role, m.text, m.actions));
        state.history = saved;
      }
    } catch (e) {}

    // assistant ne jis section par bheja tha, uspar le jao
    const pending = sess.get("sstc_ai_goto", "");
    if (pending) {
      sess.del("sstc_ai_goto");
      setTimeout(() => {
        let el = null; try { el = document.querySelector(pending); } catch (e) {}
        if (el) goTo(pending);
      }, 700);
    }

    if (!sess.get("sstc_ai_teaser", "")) {
      setTimeout(() => { if (!state.open) els.teaser.classList.add("show"); }, 6000);
      setTimeout(() => els.teaser.classList.remove("show"), 17000);
    }
  }

  if (typeof document !== "undefined" && document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else if (typeof document !== "undefined" && document.body) init();
  else if (typeof window !== "undefined") window.__sstcAI = { matchIntent };
})();
