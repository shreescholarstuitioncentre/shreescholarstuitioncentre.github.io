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
    avatarLight: { ambient: 1.6, key: 1.5 }, // avatar bahut chamkila/andhera lage to ye 2 numbers badlein
    registrationClasses: "Class 10 और Class 12", // student-registration.html me jo classes khuli hain, wahi likhein
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
      reply: () => "📝 **रजिस्ट्रेशन** के लिए Student Registration पेज खोलें।\n• अभी " + CONFIG.registrationClasses + " के लिए खुला है।\n• भरना होगा: नाम, मोबाइल (10 अंक), जेंडर, ईमेल, क्लास, बोर्ड, स्कूल का नाम और जगह।\n• रजिस्ट्रेशन पूरा होते ही **Student ID और Password अपने आप बन जाते हैं** — उन्हें save कर लें।\n" + regStatus(),
      actions: () => [act.page("📝 रजिस्ट्रेशन पेज खोलें", SITE.registerPage), act.go("📅 तारीख / ऑफर देखें", "#offerAccess")] },

    { id: "enquiry",
      kw: ["enquiry", "inquiry", "admission", "demo", "demo class", "join", "puchna", "poochna", "jankari", "jaankari", "batch", "पूछताछ", "एडमिशन", "दाखिला", "डेमो", "जानकारी"],
      reply: () => "❓ **पूछताछ / एडमिशन** के 3 आसान तरीके:\n1️⃣ \"Connect Us\" में बच्चे का नाम, क्लास और मोबाइल भरकर Sir/Ma'am को WhatsApp करें।\n2️⃣ \"Admission Form\" भरें।\n3️⃣ सीधे कॉल करें।\n🎁 Free Demo Class भी उपलब्ध है।",
      actions: () => [act.go("📲 Connect Us फ़ॉर्म", "#leadbox"), act.go("📋 Admission Form", ".contact-section")].concat(callBoth()) },

        { id: "studentid",
      kw: ["student id kaise", "student id kya", "id kaise milega", "id kaise milegi", "password kaise milega", "password kaise banega", "स्टूडेंट आईडी"],
      reply: () => "🎫 **Student ID और Password** आपको रजिस्ट्रेशन पूरा होते ही अपने आप मिल जाते हैं — फ़ॉर्म में इन्हें खुद नहीं भरना।\nSuccess बॉक्स में दिखें तो उन्हें **save / screenshot** कर लें, लॉगिन में यही चाहिए होंगे।",
      actions: () => [act.page("📝 रजिस्ट्रेशन पेज", SITE.registerPage), act.page("🔐 लॉगिन पेज", SITE.accessPage)] },

    { id: "login",
      kw: ["login", "log in", "signin", "sign in", "लॉगिन", "notes", "note", "नोट्स", "ebook", "e book", "e-book", "pdf", "library", "access", "sstc access", "study material", "लाइब्रेरी", "किताब", "पासवर्ड", "password", "forgot", "bhool", "bhul", "भूल"],
      reply: () => "🔐 **लॉगिन** के लिए SSTC Access पेज खोलें:\n1️⃣ **Student** टैब चुनें\n2️⃣ अपना Student ID और Password डालें (ये रजिस्ट्रेशन के बाद अपने आप बनते हैं)\n3️⃣ लॉगिन के बाद आपका student dashboard खुलेगा, जहाँ से notes और library मिलती हैं।\n\n🔑 Password भूल गए हों तो “Forgot Password?” दबाएँ, या Sir से संपर्क करें। नए student पहले रजिस्ट्रेशन करें।\n⚠️ अपना Password किसी को न बताएँ — मुझे भी चैट में न लिखें।",
      actions: () => [act.page("🔐 SSTC Access खोलें", SITE.accessPage), act.page("📝 नया student? Register", SITE.registerPage), act.wa("💬 Sir WhatsApp", SITE.sir.tel)] },


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
.sai-stage{position:relative;height:210px;flex:0 0 auto;overflow:hidden;
  background:radial-gradient(circle at 14% 28%,rgba(255,255,255,.95) 0 5%,transparent 5.5%),
  radial-gradient(circle at 86% 22%,rgba(255,226,140,.85) 0 4.5%,transparent 5%),
  radial-gradient(circle at 78% 78%,rgba(255,255,255,.8) 0 3.5%,transparent 4%),
  radial-gradient(circle at 22% 82%,rgba(255,214,102,.7) 0 3%,transparent 3.5%),
  linear-gradient(165deg,#e3f0ff,#c7defa 55%,#b3cdf3)}
.sai-stage.g-female{background:radial-gradient(circle at 14% 28%,rgba(255,255,255,.95) 0 5%,transparent 5.5%),
  radial-gradient(circle at 86% 22%,rgba(255,226,140,.85) 0 4.5%,transparent 5%),
  radial-gradient(circle at 78% 78%,rgba(255,255,255,.8) 0 3.5%,transparent 4%),
  radial-gradient(circle at 22% 82%,rgba(255,214,102,.7) 0 3%,transparent 3.5%),
  linear-gradient(165deg,#ffe9f3,#fbd3e6 55%,#f2bfdc)}
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
    window.addEventListener("pointermove", (e) => {
      if (!state.open) return;
      const r = els.stage.getBoundingClientRect();
      const cl = (v) => Math.max(-1, Math.min(1, v));
      look.tx = cl((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2));
      look.ty = cl((e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2));
    }, { passive: true });
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
    els.stage.classList.toggle("g-female", state.gender === "female");
    if (state.stageReady === "failed") els.emoji.textContent = state.gender === "female" ? "👩‍🏫" : "👨‍🏫";
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
    let t = first.reply();
    const path = location.pathname.toLowerCase();
    if (/registration/.test(path)) t += "\n\n📝 आप अभी रजिस्ट्रेशन पेज पर हैं — फ़ॉर्म भरने में कुछ अटके तो पूछिए।";
    else if (/sstc-access/.test(path)) t += "\n\n🔐 आप अभी लॉगिन पेज पर हैं — लॉगिन या पासवर्ड में मदद चाहिए तो पूछिए।";
    addMsg("bot", t, [], { speak: state.sound });
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
    await ensureStage(); if (state.stageReady === true) safeBuild(gen);
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
     7. 3D ANIME AVATAR  (Three.js + toon shading, koi model-file nahi chahiye)
        Boy : formal shirt + tie + chashma   |   Girl : saree-style + choti + bindi
  ------------------------------------------------------------------ */
  let T = null, renderer, scene, camera, clock, avatar = null, rig = null, raf = 0;
  let nextBlink = 2, blinkAt = -1, mouthOpen = 0;
  const look = { x: 0, y: 0, tx: 0, ty: 0 }; // avatar cursor / ungli ki taraf dekhta hai

  const H = { rx: 0.52, ry: 0.56, rz: 0.5 }; // sir ka size (anime jaisa: chhoti nukili thodi)
  const taper = (yn) => { const t = yn < 0 ? Math.pow(-yn, 1.4) : 0; return [1 - 0.3 * t, 1 - 0.22 * t]; };
  function faceZ(x, y) { // chehre ki surface par (x,y) ka z
    const yn = y / H.ry, tp = taper(yn);
    const xn = x / (H.rx * tp[0]);
    return H.rz * tp[1] * Math.sqrt(Math.max(1 - xn * xn - yn * yn, 0.01));
  }
  function torsoZ(x, y) { // dhad + kandhe ki surface
    const a = 1 - Math.pow(x / 0.8, 2) - Math.pow((y + 0.95) / 0.9, 2);
    const t = a > 0 ? 0.46 * Math.sqrt(a) : 0;
    const b = 1 - Math.pow((x - Math.sign(x) * 0.62) / 0.2, 2) - Math.pow((y + 0.27) / 0.16, 2);
    const s = b > 0 ? 0.18 * Math.sqrt(b) : 0;
    return Math.max(t, s, 0.1);
  }

  function drawEye(x, o, open, mirror) {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, 256, 256);
    x.save();
    if (mirror) { x.translate(256, 0); x.scale(-1, 1); }
    x.lineCap = "round"; x.lineJoin = "round";
    // bhaunh
    x.strokeStyle = o.brow; x.lineWidth = o.girl ? 9 : 16;
    x.beginPath();
    if (o.girl) { x.moveTo(50, 56); x.quadraticCurveTo(126, 14, 208, 46); }
    else { x.moveTo(48, 60); x.quadraticCurveTo(130, 30, 210, 50); }
    x.stroke();
    if (open) {
      x.save();
      x.beginPath(); x.ellipse(128, 152, 84, 66, 0, 0, Math.PI * 2); x.clip();
      x.fillStyle = "#fff"; x.fillRect(0, 0, 256, 256);
      let g = x.createLinearGradient(0, 86, 0, 150);
      g.addColorStop(0, "rgba(70,40,40,.45)"); g.addColorStop(1, "rgba(70,40,40,0)");
      x.fillStyle = g; x.fillRect(0, 86, 256, 64);
      g = x.createLinearGradient(0, 90, 0, 214);
      g.addColorStop(0, o.iris[0]); g.addColorStop(0.5, o.iris[1]); g.addColorStop(1, o.iris[2]);
      x.fillStyle = g; x.beginPath(); x.ellipse(128, 152, 50, 62, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = "#0c0605"; x.beginPath(); x.ellipse(128, 150, 22, 30, 0, 0, Math.PI * 2); x.fill();
      x.restore();
      x.strokeStyle = "#17100e"; x.lineWidth = o.girl ? 15 : 13; // upar ki palak
      x.beginPath(); x.ellipse(128, 152, 86, 68, 0, Math.PI * 1.03, Math.PI * 1.97); x.stroke();
      x.lineWidth = o.girl ? 11 : 8; // bahar ka kona
      x.beginPath(); x.moveTo(206, 126); x.quadraticCurveTo(230, 118, o.girl ? 242 : 234, 100); x.stroke();
      x.strokeStyle = "rgba(60,35,30,.6)"; x.lineWidth = 4; // neeche ki palak
      x.beginPath(); x.ellipse(128, 152, 84, 66, 0, Math.PI * 0.12, Math.PI * 0.88); x.stroke();
    } else {
      x.strokeStyle = "#17100e"; x.lineWidth = o.girl ? 14 : 12;
      x.beginPath(); x.moveTo(46, 148); x.quadraticCurveTo(128, 200, 210, 148); x.stroke();
      x.beginPath(); x.moveTo(206, 150); x.quadraticCurveTo(230, 142, 240, 124); x.stroke();
    }
    x.restore();
    if (open) { // chamak hamesha upar-left se (mirror nahi hoti)
      x.fillStyle = "#fff";
      x.beginPath(); x.arc(102, 118, 17, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.arc(152, 186, 8, 0, Math.PI * 2); x.fill();
    }
  }

  function drawMouth(x, shape, o) {
    x.clearRect(0, 0, 256, 128);
    x.lineCap = "round";
    if (shape === 0) { // muskurahat
      x.strokeStyle = o.lip; x.lineWidth = o.girl ? 11 : 9;
      x.beginPath(); x.moveTo(80, 50); x.quadraticCurveTo(128, 90, 176, 50); x.stroke();
      return;
    }
    const d = [null, [32, 20], [44, 34], [24, 30]][shape]; // chhota, bada, "o"
    const cx = 128, cy = 62;
    x.save();
    x.beginPath(); x.ellipse(cx, cy, d[0], d[1], 0, 0, Math.PI * 2); x.clip();
    x.fillStyle = "#4a0e14"; x.fillRect(0, 0, 256, 128);
    x.fillStyle = "#e8667a"; x.beginPath(); x.ellipse(cx, cy + d[1] * 0.8, d[0] * 0.75, d[1] * 0.5, 0, 0, Math.PI * 2); x.fill();
    if (shape === 2) { x.fillStyle = "#fff"; x.fillRect(cx - d[0], cy - d[1], d[0] * 2, 10); }
    x.restore();
    x.strokeStyle = o.lip; x.lineWidth = 5;
    x.beginPath(); x.ellipse(cx, cy, d[0], d[1], 0, 0, Math.PI * 2); x.stroke();
  }

  function disposeObj(o) {
    o.traverse((n) => {
      if (n.geometry && n.geometry.dispose) n.geometry.dispose();
      if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => {
        if (m.map && m.map.dispose) m.map.dispose();
        if (m.gradientMap && m.gradientMap.dispose) m.gradientMap.dispose();
        if (m.dispose) m.dispose();
      });
    });
  }

  function buildAvatar(gender) {
    if (!T) return;
    if (avatar) { scene.remove(avatar); disposeObj(avatar); avatar = null; rig = null; }
    const f = gender === "female";

    const gmap = new T.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, T.RedFormat);
    gmap.minFilter = gmap.magFilter = T.NearestFilter; gmap.generateMipmaps = false; gmap.needsUpdate = true;
    const toon = (c, e) => new T.MeshToonMaterial({ color: c, gradientMap: gmap, emissive: e || 0x000000 });
    const part = (parent, geo, mat, x, y, z, sx, sy, sz, rx, ry, rz) => {
      const m = new T.Mesh(geo, mat);
      m.position.set(x, y, z); m.scale.set(sx || 1, sy || 1, sz || 1); m.rotation.set(rx || 0, ry || 0, rz || 0);
      parent.add(m); return m;
    };
    const outline = (m, k) => { // anime jaisi kaali outline
      const o = new T.Mesh(m.geometry, new T.MeshBasicMaterial({ color: 0x1a1218, side: T.BackSide }));
      o.position.copy(m.position); o.rotation.copy(m.rotation); o.scale.copy(m.scale).multiplyScalar(k || 1.05);
      m.parent.add(o); return o;
    };
    const tex = (w, h, fn) => {
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      fn(c.getContext("2d"));
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
    };
    const decal = (parent, map, w, h, x, y, lift) => { // chehre par chipka hua sticker
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({
        map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      const z = faceZ(x, y) + (lift || 0.004);
      const nx = x / (H.rx * H.rx), ny = y / (H.ry * H.ry), nz = z / (H.rz * H.rz);
      const len = Math.hypot(nx, ny, nz);
      m.rotation.order = "YXZ";
      m.rotation.y = Math.atan2(nx, nz);
      m.rotation.x = -Math.asin(ny / len);
      m.position.set(x, y, z);
      m.renderOrder = 2;
      parent.add(m); return m;
    };

    const skin = toon(f ? 0xf0c09a : 0xe8b28a);
    const hair = toon(f ? 0x15100e : 0x1b1411, 0x080c16);
    const gold = toon(0xf2b632, 0x3a2a00);
    const white = toon(0xffffff);
    const cloth = toon(f ? 0xb3235a : 0x8fc1ea);

    const root = new T.Group();
    const head = new T.Group();
    head.position.set(0, 0.62, 0);
    root.add(head);

    /* ---- dhad, kandhe, gardan ---- */
    part(root, new T.SphereGeometry(1, 32, 24), cloth, 0, -0.95, 0, 0.8, 0.9, 0.46);
    const sareeMat = toon(0x7d1238);
    [-1, 1].forEach((s) => part(root, new T.SphereGeometry(1, 20, 16), f && s < 0 ? sareeMat : cloth, s * 0.62, -0.27, 0, 0.2, 0.16, 0.18));
    part(root, new T.CylinderGeometry(0.15, 0.17, 0.42, 20), skin, 0, 0.12, 0);

    /* ---- sir (anime: thodi nukili thodi) ---- */
    const hg = new T.SphereGeometry(1, 48, 36);
    const pos = hg.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const yn = pos.getY(i), tp = taper(yn);
      pos.setXYZ(i, pos.getX(i) * H.rx * tp[0], yn * H.ry, pos.getZ(i) * H.rz * tp[1]);
    }
    hg.computeVertexNormals();
    const face = new T.Mesh(hg, skin);
    head.add(face);
    outline(face, 1.045);
    [-1, 1].forEach((s) => part(head, new T.SphereGeometry(0.09, 16, 12), skin, s * 0.51, -0.02, 0, 0.55, 1.1, 0.8));

    /* ---- chehre ke sticker: aankhein, naak, mooh, gaal ---- */
    const o = {
      girl: f,
      brow: f ? "#1a1210" : "#15100e",
      iris: f ? ["#2a140c", "#6a3a1c", "#d09a58"] : ["#1d0f08", "#5b3318", "#b9824a"],
      lip: f ? "#c2335a" : "#8a3a35",
    };
    const eyeOpen = [tex(256, 256, (x) => drawEye(x, o, true, true)), tex(256, 256, (x) => drawEye(x, o, true, false))];
    const eyeClosed = [tex(256, 256, (x) => drawEye(x, o, false, true)), tex(256, 256, (x) => drawEye(x, o, false, false))];
    const eyes = [decal(head, eyeOpen[0], 0.4, 0.4, -0.22, 0.014), decal(head, eyeOpen[1], 0.4, 0.4, 0.22, 0.014)];
    const mouthTex = [0, 1, 2, 3].map((s) => tex(256, 128, (x) => drawMouth(x, s, o)));
    const mouth = decal(head, mouthTex[0], 0.34, 0.17, 0, -0.27);
    decal(head, tex(128, 128, (x) => {
      x.strokeStyle = "rgba(150,85,55,.7)"; x.lineWidth = 7; x.lineCap = "round";
      x.beginPath(); x.moveTo(50, 62); x.quadraticCurveTo(58, 88, 80, 80); x.stroke();
    }), 0.12, 0.12, 0, -0.12);
    const blush = tex(64, 64, (x) => {
      const g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
      g.addColorStop(0, f ? "rgba(255,105,115,.6)" : "rgba(255,120,110,.35)"); g.addColorStop(1, "rgba(255,105,115,0)");
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    });
    [-1, 1].forEach((s) => decal(head, blush, 0.2, 0.12, s * 0.31, -0.16, 0.003));

    /* ---- baal: topi + bangs (dono) ---- */
    const cap = part(head, new T.SphereGeometry(1, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.53), hair, 0, 0.02, -0.04, 0.58, 0.61, 0.58, -0.65, 0, 0);
    outline(cap, 1.04);

    let braid = null;
    if (!f) {
      /* ================= BOY: neat teacher look ================= */
      for (let i = 0; i < 7; i++) { // nukili bangs
        const a = (i - 3) / 3, x = a * 0.4, y = 0.33 - Math.abs(a) * 0.05;
        const h = 0.17 + (1 - Math.abs(a)) * 0.04;
        part(head, new T.ConeGeometry(0.1, h, 6), hair, x, y + 0.03 - h / 2, faceZ(x, y) + 0.035, 1, 1, 0.8, -0.3, 0, Math.PI + (-0.18 + a * 0.38));
      }
      [[-0.1, 0.6, -0.1, 0.3], [0.05, 0.64, -0.14, -0.15], [0.2, 0.58, -0.08, -0.5]].forEach((c) =>
        part(head, new T.ConeGeometry(0.09, 0.3, 6), hair, c[0], c[1], c[2], 1, 1, 1, -0.6, 0, c[3]));
      [-1, 1].forEach((s) => part(head, new T.ConeGeometry(0.06, 0.2, 6), hair, s * 0.47, 0.08, 0.17, 1, 1, 1, 0, 0, Math.PI + s * 0.1));

      // chashma
      const frame = toon(0x1f232b);
      [-0.22, 0.22].forEach((x) => {
        const z = faceZ(x, -0.02) + 0.05;
        const r = part(head, new T.TorusGeometry(0.135, 0.013, 8, 32), frame, x, -0.02, z);
        r.rotation.order = "YXZ"; r.rotation.y = Math.atan2(x / (H.rx * H.rx), z / (H.rz * H.rz));
      });
      part(head, new T.BoxGeometry(0.1, 0.014, 0.014), frame, 0, 0.0, faceZ(0, 0) + 0.06);
      [-1, 1].forEach((s) => part(head, new T.BoxGeometry(0.014, 0.014, 0.36), frame, s * 0.435, 0.0, 0.165, 1, 1, 1, 0, s * 0.43, 0));

      // collar + tie
      [-1, 1].forEach((s) => part(root, new T.BoxGeometry(0.2, 0.06, 0.03), white, s * 0.1, -0.26, torsoZ(s * 0.1, -0.26) + 0.02, 1, 1, 1, 0, 0, s * -0.6));
      part(root, new T.SphereGeometry(0.07, 12, 10), toon(0x8b1a2b), 0, -0.3, torsoZ(0, -0.3) + 0.03);
      part(root, new T.BoxGeometry(0.1, 0.5, 0.025), toon(0x8b1a2b), 0, -0.58, torsoZ(0, -0.45) + 0.02, 1, 1, 1, -0.25, 0, 0);
    } else {
      /* ================= GIRL: saree-style teacher ================= */
      part(head, new T.SphereGeometry(1, 32, 24), hair, 0, -0.28, -0.2, 0.62, 0.9, 0.46); // peeche ke lambe baal
      for (let i = 0; i < 6; i++) { // side bangs (beech me bindi ke liye jagah)
        const a = (i - 2.5) / 2.5, x = a * 0.4;
        if (Math.abs(x) < 0.12) continue;
        const h = 0.18 + (1 - Math.abs(a)) * 0.04;
        part(head, new T.ConeGeometry(0.11, h, 6), hair, x, 0.33 + 0.03 - h / 2, faceZ(x, 0.33) + 0.035, 1, 1, 0.8, -0.3, 0, Math.PI + a * 0.5);
      }
      [-1, 1].forEach((s) => part(head, new T.CapsuleGeometry(0.07, 0.55, 6, 12), hair, s * 0.5, -0.28, 0.12, 1, 1, 0.9, 0, 0, s * 0.06));

      // bindi + jhumka
      decal(head, tex(64, 64, (x) => {
        x.fillStyle = "#d3202a"; x.beginPath(); x.arc(32, 32, 20, 0, Math.PI * 2); x.fill();
        x.strokeStyle = "#f2b632"; x.lineWidth = 4; x.beginPath(); x.arc(32, 32, 24, 0, Math.PI * 2); x.stroke();
      }), 0.06, 0.06, 0, 0.18);
      [-1, 1].forEach((s) => {
        part(head, new T.SphereGeometry(0.035, 10, 8), gold, s * 0.57, -0.14, 0.06);
        part(head, new T.ConeGeometry(0.045, 0.1, 10), gold, s * 0.57, -0.22, 0.06, 1, 1, 1, 0, 0, Math.PI);
      });

      // saree ka pallu (baayein kandhe se tirchha) + sunehri kinara
      for (let k = 0; k <= 5; k++) {
        const t = k / 5, x = -0.46 + t * 0.62, y = -0.2 - t * 0.5;
        part(root, new T.SphereGeometry(1, 16, 12), sareeMat, x, y, torsoZ(x, y) + 0.012, 0.2, 0.17, 0.06, 0, 0, 0.62);
        part(root, new T.SphereGeometry(1, 12, 10), gold, x + 0.1, y + 0.12, torsoZ(x + 0.1, y + 0.12) + 0.03, 0.035, 0.2, 0.05, 0, 0, 0.9);
      }

      // choti (braid) + gajra + laal ribbon
      braid = new T.Group();
      braid.position.set(0.4, 0.2, 0.06);
      root.add(braid);
      for (let k = 0; k < 7; k++) {
        const r = 0.105 - k * 0.0075, by = -k * 0.125, bz = k * 0.03;
        part(braid, new T.SphereGeometry(r, 14, 10), hair, Math.sin(k * 1.3) * 0.015, by, bz, 1, 1.2, 1);
        if (k % 2 === 1) part(braid, new T.SphereGeometry(0.028, 8, 6), white, r * 0.7, by + 0.02, bz + r * 0.8);
      }
      const ribbon = toon(0xc81e1e);
      part(braid, new T.SphereGeometry(0.06, 12, 10), ribbon, 0, -7 * 0.125 + 0.02, 7 * 0.03);
      [-1, 1].forEach((s) => part(braid, new T.ConeGeometry(0.04, 0.14, 8), ribbon, s * 0.05, -7 * 0.125 - 0.06, 7 * 0.03, 1, 1, 1, 0, 0, Math.PI + s * 0.4));
    }

    scene.add(root);
    avatar = root;
    rig = { root, head, eyes, eyeOpen, eyeClosed, mouth, mouthTex, braid, blinkState: false, mouthShape: 0 };
  }

  function showEmojiFallback() {
    state.stageReady = "failed";
    stopLoop();
    els.canvas.style.display = "none";
    els.emoji.style.display = "flex";
    els.emoji.textContent = state.gender === "female" ? "👩‍🏫" : "👨‍🏫";
  }
  function safeBuild(gen) {
    try { buildAvatar(gen); }
    catch (e) { console.warn("SSTC avatar: 3D avatar nahi ban paya, emoji dikha rahe hain.", e); showEmojiFallback(); }
  }

  async function ensureStage() {
    if (state.stageReady === true) { if (!avatar) safeBuild(state.gender); return state.stageReady === true; }
    if (state.stageReady === "failed") return false;
    try {
      T = await import(CONFIG.threeUrl);
      renderer = new T.WebGLRenderer({ canvas: els.canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      scene = new T.Scene();
      camera = new T.PerspectiveCamera(30, 1, 0.1, 50);
      camera.position.set(0, 0.46, 3.3); camera.lookAt(0, 0.44, 0);
      scene.add(new T.AmbientLight(0xffffff, CONFIG.avatarLight.ambient));
      const key = new T.DirectionalLight(0xffffff, CONFIG.avatarLight.key); key.position.set(1.5, 2, 3); scene.add(key);
      const rim = new T.DirectionalLight(0xb9a3ff, 0.8); rim.position.set(-2, 1, -2); scene.add(rim);
      clock = new T.Clock();
      state.stageReady = true;
      safeBuild(state.gender);
      return state.stageReady === true;
    } catch (e) {
      console.warn("SSTC avatar: 3D load nahi hua, emoji avatar dikha rahe hain.", e);
      showEmojiFallback();
      return false;
    }
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
    const t = clock.getElapsedTime(), R = rig, sp = state.speaking;
    look.x += (look.tx - look.x) * 0.06; look.y += (look.ty - look.y) * 0.06;

    R.root.position.y = Math.sin(t * 1.5) * 0.012;
    R.head.rotation.y = Math.sin(t * 0.6) * 0.08 + look.x * 0.35 + (sp ? Math.sin(t * 2.3) * 0.07 : 0);
    R.head.rotation.x = Math.sin(t * 0.9) * 0.025 - look.y * 0.2 + (sp ? Math.sin(t * 5.2) * 0.03 : 0);
    R.head.rotation.z = state.listening ? 0.14 : Math.sin(t * 0.45) * 0.02;
    if (R.braid) R.braid.rotation.z = Math.sin(t * 1.3) * 0.04 + (sp ? Math.sin(t * 6) * 0.03 : 0);

    // palak
    if (t > nextBlink) { blinkAt = t; nextBlink = t + 2.5 + Math.random() * 3.2; }
    const closed = t - blinkAt >= 0 && t - blinkAt < 0.13;
    if (closed !== R.blinkState) {
      R.blinkState = closed;
      R.eyes.forEach((e, i) => { e.material.map = closed ? R.eyeClosed[i] : R.eyeOpen[i]; });
    }

    // bolte waqt mooh ki shapes (lip-sync jaisa)
    const target = sp ? 0.25 + Math.abs(Math.sin(t * 12)) * 0.5 * (0.55 + 0.45 * Math.abs(Math.sin(t * 3.3))) : 0;
    mouthOpen += (target - mouthOpen) * 0.4;
    let shape = 0;
    if (mouthOpen > 0.14) shape = mouthOpen > 0.5 ? 2 : (Math.sin(t * 2.7) > 0.55 ? 3 : 1);
    if (shape !== R.mouthShape) { R.mouthShape = shape; R.mouth.material.map = R.mouthTex[shape]; }

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
