# Sorry with Love — Content & SEO Update (Hindi)

## इस अपडेट में क्या बदला गया

- होमपेज का H1 अब वास्तविक और स्वाभाविक तरीके से `Sorry with Love` ब्रांड और `Heartfelt Apology Card` उपयोग करता है।
- होमपेज पर लगभग 1,200+ शब्दों की मौलिक, उपयोगकर्ता-केंद्रित गाइड जोड़ी गई है। इसमें कार्ड बनाना, ईमानदार माफ़ी, संदेश के उदाहरण, आम गलतियाँ, भरोसा दोबारा बनाना, सीमाओं का सम्मान और FAQ शामिल हैं।
- होमपेज पर कई स्पष्ट H2 सेक्शन जोड़े गए हैं; कीवर्ड को बार-बार भरने के बजाय प्राकृतिक भाषा में रखा गया है।
- वही संपादकीय सामग्री `scripts/prerender-seo.mjs` में भी शामिल की गई है ताकि build के बाद static HTML में भी होमपेज का मुख्य कॉन्टेंट मौजूद रहे।
- ब्राउज़र title, meta description और social description को Sorry with Love के वास्तविक उपयोग के अनुरूप अपडेट किया गया है।
- मोबाइल और डेस्कटॉप के लिए लंबी गाइड का responsive CSS जोड़ा गया है। मौजूदा कार्ड क्रिएटर/फ्लो को जानबूझकर नहीं बदला गया।

## Deploy करने से पहले जरूरी काम

1. `src/App.jsx` में `/contact` सेक्शन के लिए वास्तविक, मॉनिटर किया जाने वाला सपोर्ट ईमेल प्रकाशित करें। अभी साइट मालिक का ईमेल उपलब्ध नहीं था, इसलिए कोई नकली ईमेल नहीं जोड़ा गया।
2. `public/ads.txt` में Publisher ID को अपने AdSense अकाउंट से मिलाएँ। ID की पुष्टि के बिना विज्ञापन चालू न करें।
3. Live domain और canonical URL को सत्यापित करें। वर्तमान प्रोजेक्ट में `https://sorry-withlove.vercel.app` कॉन्फ़िगर है; यदि आपका वास्तविक डोमेन अलग है, तो `index.html`, `scripts/prerender-seo.mjs`, sitemap/robots configuration और social image URLs को उसी डोमेन के अनुसार अपडेट करें।
4. Deploy के बाद मोबाइल पर होमपेज, सभी ब्लॉग, SEO pages, Contact, Privacy, Terms, card sharing और iframe fallback को जाँचें।
5. Google Search Console में sitemap submit करें और URL Inspection से मुख्य URLs की indexing स्थिति देखें।
6. हर ब्लॉग लेख की तथ्यात्मक शुद्धता और उपयोगिता पढ़कर जाँचें। केवल शब्द संख्या बढ़ाने या एक जैसे लेखों की नकल करने से बचें।

## SEO और AdSense के बारे में

यह अपडेट crawlable homepage content, headings, metadata और internal navigation को बेहतर करता है। इससे indexing और relevance में मदद मिल सकती है, लेकिन Google में किसी खास keyword पर पहले स्थान की गारंटी नहीं है। AdSense की स्वीकृति भी Google की स्वतंत्र समीक्षा पर निर्भर है; कोई code change इसे सुनिश्चित नहीं कर सकता।
