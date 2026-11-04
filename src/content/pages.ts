import type { L10n } from "@/lib/i18n";

export type PageSection = { heading: L10n; body: L10n };
export type InfoPage = { title: L10n; intro: L10n; sections: PageSection[]; legalDraft?: boolean };

export type PageKey = "about" | "development" | "antiDoping" | "downloads" | "privacy" | "terms";

export const PAGES: Record<PageKey, InfoPage> = {
  about: {
    title: { en: "About Sri Lanka Athletics", si: "ශ්‍රී ලංකා මලල ක්‍රීඩා සංගමය ගැන", ta: "இலங்கை மெய்வல்லுநர் சங்கம் பற்றி" },
    intro: {
      en: "Sri Lanka Athletics (SLA) is the national governing body for athletics in Sri Lanka and a member of World Athletics and Asian Athletics.",
      si: "ශ්‍රී ලංකා මලල ක්‍රීඩා සංගමය (SLA) ශ්‍රී ලංකාවේ මලල ක්‍රීඩා සඳහා වන ජාතික පාලක ආයතනය වන අතර ලෝක මලල ක්‍රීඩා සංගමයේ සහ ආසියානු මලල ක්‍රීඩා සංගමයේ සාමාජිකයෙකි.",
      ta: "இலங்கை மெய்வல்லுநர் சங்கம் (SLA) இலங்கையில் மெய்வல்லுநர் விளையாட்டுக்கான தேசிய நிர்வாக அமைப்பாகும்; உலக மெய்வல்லுநர் மற்றும் ஆசிய மெய்வல்லுநர் சங்கங்களின் உறுப்பினராகும்.",
    },
    sections: [
      {
        heading: { en: "What we do", si: "අප කරන දේ", ta: "நாங்கள் செய்வது" },
        body: {
          en: "We organise national championships, select national teams, keep the national register of athletes, coaches and clubs, ratify national records and develop the sport in all 25 districts.",
          si: "අපි ජාතික ශූරතාවලි සංවිධානය කරමු, ජාතික කණ්ඩායම් තෝරමු, ක්‍රීඩකයින්, පුහුණුකරුවන් සහ සමාජවල ජාතික ලේඛනය පවත්වාගෙන යමු, ජාතික වාර්තා අනුමත කරමු සහ දිස්ත්‍රික්ක 25 පුරාම ක්‍රීඩාව දියුණු කරමු.",
          ta: "நாங்கள் தேசிய சாம்பியன்ஷிப்களை ஏற்பாடு செய்கிறோம், தேசிய அணிகளைத் தெரிவு செய்கிறோம், வீரர்கள், பயிற்றுநர்கள் மற்றும் கழகங்களின் தேசியப் பதிவேட்டைப் பேணுகிறோம், தேசிய சாதனைகளை அங்கீகரிக்கிறோம், 25 மாவட்டங்களிலும் விளையாட்டை வளர்க்கிறோம்.",
        },
      },
      {
        heading: { en: "Governance", si: "පාලනය", ta: "நிர்வாகம்" },
        body: {
          en: "SLA is run by an elected executive committee under its constitution. The constitution, committee members and annual reports will be published on the Downloads page.",
          si: "SLA එහි ව්‍යවස්ථාව යටතේ තේරී පත් වූ විධායක කමිටුවක් විසින් පාලනය කෙරේ. ව්‍යවස්ථාව, කමිටු සාමාජිකයින් සහ වාර්ෂික වාර්තා බාගැනීම් පිටුවේ පළ කෙරේ.",
          ta: "SLA அதன் யாப்பின் கீழ் தெரிவுசெய்யப்பட்ட நிறைவேற்றுக் குழுவால் நடத்தப்படுகிறது. யாப்பு, குழு உறுப்பினர்கள் மற்றும் ஆண்டறிக்கைகள் பதிவிறக்கங்கள் பக்கத்தில் வெளியிடப்படும்.",
        },
      },
      {
        heading: { en: "Contact", si: "සම්බන්ධ වන්න", ta: "தொடர்பு" },
        body: {
          en: "Contact details for the SLA office will be added here.",
          si: "SLA කාර්යාලයේ සම්බන්ධතා විස්තර මෙහි එක් කෙරේ.",
          ta: "SLA அலுவலகத்தின் தொடர்பு விவரங்கள் இங்கே சேர்க்கப்படும்.",
        },
      },
    ],
  },
  development: {
    title: { en: "Development", si: "සංවර්ධනය", ta: "வளர்ச்சி" },
    intro: {
      en: "Grassroots programmes, coach education and pathways from school sport to the national team.",
      si: "මූලික මට්ටමේ වැඩසටහන්, පුහුණුකරු අධ්‍යාපනය සහ පාසල් ක්‍රීඩාවේ සිට ජාතික කණ්ඩායම දක්වා මාර්ග.",
      ta: "அடிமட்டத் திட்டங்கள், பயிற்றுநர் கல்வி மற்றும் பாடசாலை விளையாட்டிலிருந்து தேசிய அணி வரையிலான பாதைகள்.",
    },
    sections: [
      {
        heading: { en: "Coach education", si: "පුහුණුකරු අධ්‍යාපනය", ta: "பயிற்றுநர் கல்வி" },
        body: {
          en: "SLA runs World Athletics CECS courses at Level 1 (youth), Level 2 (event group) and Level 3 (elite). Registered coaches hear about new courses first.",
          si: "SLA ලෝක මලල ක්‍රීඩා CECS පාඨමාලා 1 මට්ටම (යෞවන), 2 මට්ටම (ඉසව් කණ්ඩායම) සහ 3 මට්ටම (ප්‍රභූ) ලෙස පවත්වයි. ලියාපදිංචි පුහුණුකරුවන්ට නව පාඨමාලා ගැන මුලින්ම දැනුම් දෙනු ලැබේ.",
          ta: "SLA உலக மெய்வல்லுநர் CECS பாடநெறிகளை நிலை 1 (இளையோர்), நிலை 2 (நிகழ்ச்சிக் குழு) மற்றும் நிலை 3 (உயர்நிலை) என நடத்துகிறது. பதிவுசெய்த பயிற்றுநர்கள் புதிய பாடநெறிகள் பற்றி முதலில் அறிவார்கள்.",
        },
      },
      {
        heading: { en: "Young athletes", si: "තරුණ ක්‍රීඩකයින්", ta: "இளம் வீரர்கள்" },
        body: {
          en: "District programmes help talented young athletes find a qualified coach and a club near home, and move up to provincial and national squads.",
          si: "දක්ෂ තරුණ ක්‍රීඩකයින්ට නිවස අසල සුදුසුකම් ලත් පුහුණුකරුවෙකු සහ සමාජයක් සොයා ගැනීමටත්, පළාත් සහ ජාතික සංචිත දක්වා ඉදිරියට යාමටත් දිස්ත්‍රික් වැඩසටහන් උපකාර වේ.",
          ta: "திறமையான இளம் வீரர்கள் வீட்டுக்கு அருகில் தகுதியான பயிற்றுநரையும் கழகத்தையும் கண்டறியவும், மாகாண மற்றும் தேசிய அணிகளுக்கு முன்னேறவும் மாவட்டத் திட்டங்கள் உதவுகின்றன.",
        },
      },
    ],
  },
  antiDoping: {
    title: { en: "Anti-doping and safeguarding", si: "උත්තේජක විරෝධී සහ ආරක්ෂණය", ta: "ஊக்கமருந்து எதிர்ப்பு மற்றும் பாதுகாப்பு" },
    intro: {
      en: "Clean sport and the safety of every athlete, especially children, come first.",
      si: "පිරිසිදු ක්‍රීඩාව සහ සෑම ක්‍රීඩකයෙකුගේම, විශේෂයෙන් ළමුන්ගේ ආරක්ෂාව ප්‍රමුඛ වේ.",
      ta: "தூய விளையாட்டும் ஒவ்வொரு வீரரின், குறிப்பாகக் குழந்தைகளின் பாதுகாப்பும் முதன்மையானவை.",
    },
    sections: [
      {
        heading: { en: "Clean sport", si: "පිරිසිදු ක්‍රීඩාව", ta: "தூய விளையாட்டு" },
        body: {
          en: "Athletes are responsible for everything in their body. Check every medicine and supplement before you take it, and ask your coach or doctor if you are unsure. Every registered coach commits to the anti-doping rules.",
          si: "තම සිරුරේ ඇති සෑම දෙයකටම ක්‍රීඩකයා වගකිව යුතුය. ඕනෑම ඖෂධයක් හෝ අතිරේකයක් ගැනීමට පෙර පරීක්ෂා කරන්න, සැක ඇත්නම් පුහුණුකරුගෙන් හෝ වෛද්‍යවරයාගෙන් අසන්න. සෑම ලියාපදිංචි පුහුණුකරුවෙකුම උත්තේජක විරෝධී නීතිවලට කැප වේ.",
          ta: "தங்கள் உடலில் உள்ள அனைத்துக்கும் வீரர்களே பொறுப்பு. எந்த மருந்தையோ ஊட்டச்சத்துப் பொருளையோ எடுக்கும் முன் சரிபாருங்கள்; சந்தேகம் இருந்தால் பயிற்றுநரிடமோ மருத்துவரிடமோ கேளுங்கள். பதிவுசெய்த ஒவ்வொரு பயிற்றுநரும் ஊக்கமருந்து எதிர்ப்பு விதிகளுக்குக் கட்டுப்படுகிறார்.",
        },
      },
      {
        heading: { en: "Safeguarding", si: "ආරක්ෂණය", ta: "பாதுகாப்பு" },
        body: {
          en: "Every coach registered with SLA confirms a safeguarding declaration. If you are worried about the safety of an athlete, tell SLA. Reports are handled in confidence.",
          si: "SLA හි ලියාපදිංචි සෑම පුහුණුකරුවෙකුම ආරක්ෂණ ප්‍රකාශයක් තහවුරු කරයි. ක්‍රීඩකයෙකුගේ ආරක්ෂාව ගැන ඔබට කනස්සල්ලක් ඇත්නම් SLA වෙත දන්වන්න. වාර්තා රහසිගතව හසුරුවනු ලැබේ.",
          ta: "SLA இல் பதிவுசெய்த ஒவ்வொரு பயிற்றுநரும் பாதுகாப்பு உறுதிமொழியை உறுதிப்படுத்துகிறார். ஒரு வீரரின் பாதுகாப்பு குறித்து உங்களுக்குக் கவலை இருந்தால் SLA க்குத் தெரிவியுங்கள். முறைப்பாடுகள் இரகசியமாகக் கையாளப்படும்.",
        },
      },
    ],
  },
  downloads: {
    title: { en: "Downloads", si: "බාගැනීම්", ta: "பதிவிறக்கங்கள்" },
    intro: {
      en: "Rules, forms, circulars and reports. Documents will be added here as SLA publishes them.",
      si: "නීති, පෝරම, චක්‍රලේඛ සහ වාර්තා. SLA ඒවා පළ කරන විට ලේඛන මෙහි එක් කෙරේ.",
      ta: "விதிகள், படிவங்கள், சுற்றறிக்கைகள் மற்றும் அறிக்கைகள். SLA வெளியிடும்போது ஆவணங்கள் இங்கே சேர்க்கப்படும்.",
    },
    sections: [
      {
        heading: { en: "Competition rules", si: "තරඟ නීති", ta: "போட்டி விதிகள்" },
        body: {
          en: "SLA follows the World Athletics Competition and Technical Rules, with national rules for age groups and entry standards.",
          si: "SLA වයස් කාණ්ඩ සහ ඇතුළත් වීමේ ප්‍රමිති සඳහා ජාතික නීති සමඟ ලෝක මලල ක්‍රීඩා තරඟ හා තාක්ෂණික නීති අනුගමනය කරයි.",
          ta: "வயதுப் பிரிவுகள் மற்றும் நுழைவுத் தரங்களுக்கான தேசிய விதிகளுடன் உலக மெய்வல்லுநர் போட்டி மற்றும் தொழில்நுட்ப விதிகளை SLA பின்பற்றுகிறது.",
        },
      },
      {
        heading: { en: "Forms and circulars", si: "පෝරම සහ චක්‍රලේඛ", ta: "படிவங்கள் மற்றும் சுற்றறிக்கைகள்" },
        body: {
          en: "Registration is now online; paper forms are no longer needed. Circulars for clubs and schools will be listed here.",
          si: "ලියාපදිංචිය දැන් මාර්ගගතයි; කඩදාසි පෝරම තවදුරටත් අවශ්‍ය නැත. සමාජ සහ පාසල් සඳහා චක්‍රලේඛ මෙහි ලැයිස්තුගත කෙරේ.",
          ta: "பதிவு இப்போது இணையவழியில்; காகிதப் படிவங்கள் இனி தேவையில்லை. கழகங்கள் மற்றும் பாடசாலைகளுக்கான சுற்றறிக்கைகள் இங்கே பட்டியலிடப்படும்.",
        },
      },
    ],
  },
  privacy: {
    legalDraft: true,
    title: { en: "Privacy notice", si: "රහස්‍යතා දැන්වීම", ta: "தனியுரிமை அறிவிப்பு" },
    intro: {
      en: "How Sri Lanka Athletics uses personal data, under the Personal Data Protection Act No. 9 of 2022.",
      si: "2022 අංක 9 දරන පුද්ගලික දත්ත ආරක්ෂණ පනත යටතේ ශ්‍රී ලංකා මලල ක්‍රීඩා සංගමය පුද්ගලික දත්ත භාවිත කරන ආකාරය.",
      ta: "2022 ஆம் ஆண்டின் 9 ஆம் இலக்க தனிப்பட்ட தரவுப் பாதுகாப்புச் சட்டத்தின் கீழ் இலங்கை மெய்வல்லுநர் சங்கம் தனிப்பட்ட தரவைப் பயன்படுத்தும் முறை.",
    },
    sections: [
      {
        heading: { en: "What this website shows", si: "මෙම වෙබ් අඩවිය පෙන්වන දේ", ta: "இந்த இணையதளம் காட்டுபவை" },
        body: {
          en: "Official results, rankings, records and verified SLA IDs are public. For athletes under 18 the name is shortened and the club is hidden. NIC numbers, exact birth dates, phone numbers, email addresses and guardian details are never shown.",
          si: "නිල ප්‍රතිඵල, ශ්‍රේණිගත කිරීම්, වාර්තා සහ තහවුරු කළ SLA අංක පොදු වේ. වයස අවුරුදු 18ට අඩු ක්‍රීඩකයින්ගේ නම කෙටි කර සමාජය සඟවනු ලැබේ. ජාතික හැඳුනුම්පත් අංක, නිශ්චිත උපන් දින, දුරකථන අංක, විද්‍යුත් තැපැල් ලිපින සහ භාරකරුවන්ගේ විස්තර කිසිවිටෙක පෙන්වනු නොලැබේ.",
          ta: "உத்தியோகபூர்வ முடிவுகள், தரவரிசைகள், சாதனைகள் மற்றும் உறுதிப்படுத்தப்பட்ட SLA இலக்கங்கள் பொதுவானவை. 18 வயதுக்குட்பட்ட வீரர்களின் பெயர் சுருக்கப்பட்டு கழகம் மறைக்கப்படும். தேசிய அடையாள அட்டை இலக்கங்கள், சரியான பிறந்த திகதிகள், தொலைபேசி இலக்கங்கள், மின்னஞ்சல் முகவரிகள் மற்றும் பாதுகாவலர் விவரங்கள் ஒருபோதும் காட்டப்படாது.",
        },
      },
      {
        heading: { en: "Cookies", si: "කුකීස්", ta: "குக்கீகள்" },
        body: {
          en: "This website uses one cookie to remember your language. It does not use advertising or tracking cookies.",
          si: "මෙම වෙබ් අඩවිය ඔබේ භාෂාව මතක තබා ගැනීමට එක් කුකියක් භාවිත කරයි. එය දැන්වීම් හෝ ලුහුබැඳීමේ කුකීස් භාවිත නොකරයි.",
          ta: "உங்கள் மொழியை நினைவில் வைக்க இந்த இணையதளம் ஒரு குக்கீயைப் பயன்படுத்துகிறது. விளம்பர அல்லது கண்காணிப்புக் குக்கீகளைப் பயன்படுத்துவதில்லை.",
        },
      },
      {
        heading: { en: "Your rights", si: "ඔබේ අයිතිවාසිකම්", ta: "உங்கள் உரிமைகள்" },
        body: {
          en: "You can ask to see, correct or delete your data, and change what your public profile shows. Official results stay part of the public record.",
          si: "ඔබේ දත්ත බැලීමට, නිවැරදි කිරීමට හෝ මකා දැමීමට සහ ඔබේ පොදු පැතිකඩෙහි පෙන්වන දේ වෙනස් කිරීමට ඔබට ඉල්ලිය හැකිය. නිල ප්‍රතිඵල පොදු වාර්තාවේ කොටසක් ලෙස පවතී.",
          ta: "உங்கள் தரவைப் பார்க்க, திருத்த அல்லது நீக்கவும், உங்கள் பொதுச் சுயவிவரம் காட்டுவதை மாற்றவும் நீங்கள் கோரலாம். உத்தியோகபூர்வ முடிவுகள் பொதுப் பதிவின் பகுதியாகவே இருக்கும்.",
        },
      },
    ],
  },
  terms: {
    legalDraft: true,
    title: { en: "Terms of use", si: "භාවිත නියම", ta: "பயன்பாட்டு விதிமுறைகள்" },
    intro: {
      en: "The rules for using this website.",
      si: "මෙම වෙබ් අඩවිය භාවිත කිරීමේ නීති.",
      ta: "இந்த இணையதளத்தைப் பயன்படுத்துவதற்கான விதிகள்.",
    },
    sections: [
      {
        heading: { en: "Results and records", si: "ප්‍රතිඵල සහ වාර්තා", ta: "முடிவுகள் மற்றும் சாதனைகள்" },
        body: {
          en: "Provisional results can change. Only results marked official, and records ratified by SLA, are final.",
          si: "තාවකාලික ප්‍රතිඵල වෙනස් විය හැකිය. නිල ලෙස සලකුණු කළ ප්‍රතිඵල සහ SLA අනුමත කළ වාර්තා පමණක් අවසාන වේ.",
          ta: "தற்காலிக முடிவுகள் மாறலாம். உத்தியோகபூர்வமாகக் குறிக்கப்பட்ட முடிவுகளும் SLA அங்கீகரித்த சாதனைகளும் மட்டுமே இறுதியானவை.",
        },
      },
      {
        heading: { en: "Fair use", si: "සාධාරණ භාවිතය", ta: "நியாயமான பயன்பாடு" },
        body: {
          en: "Do not copy athlete information in bulk or use it to contact athletes without their permission.",
          si: "ක්‍රීඩක තොරතුරු තොග වශයෙන් පිටපත් නොකරන්න, නැතහොත් ඔවුන්ගේ අවසරයකින් තොරව ක්‍රීඩකයින් හා සම්බන්ධ වීමට ඒවා භාවිත නොකරන්න.",
          ta: "வீரர் தகவல்களை மொத்தமாக நகலெடுக்கவோ, அவர்களின் அனுமதியின்றி வீரர்களைத் தொடர்புகொள்ளப் பயன்படுத்தவோ வேண்டாம்.",
        },
      },
    ],
  },
};
