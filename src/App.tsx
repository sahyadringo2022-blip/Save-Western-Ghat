import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  setDoc, 
  increment, 
  serverTimestamp, 
  collection, 
  addDoc,
  writeBatch,
  getDocFromServer,
  initializeFirestore
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  Leaf, 
  AlertTriangle, 
  ShieldCheck, 
  Mail, 
  Copy, 
  Check, 
  ChevronRight, 
  Menu, 
  X, 
  Landmark, 
  TreePine,
  ExternalLink,
  ChevronDown,
  Info
} from 'lucide-react';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Using initializeFirestore to force long polling, which is more reliable in sandboxed iframes
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, (firebaseConfig as any).firestoreDatabaseId);

export default function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'mr' | null>(null);
  const [activeTab, setActiveTab] = useState<'mr' | 'en'>('mr');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<number, boolean>>({});
  const [expandedBio, setExpandedBio] = useState<Record<string, boolean>>({});

  const [sendCount, setSendCount] = useState(0); 
  const [hasSent, setHasSent] = useState(false);

  // Firebase Error Handler
  const handleFirestoreError = (error: any, operation: string) => {
    console.error(`Firestore ${operation} failed:`, error);
    // Silent error for UI, but logs for debugging
  };

  // Test Connection & Listen to global counter
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'stats', 'global'));
      } catch (error: any) {
        if (error.message.includes('permission-denied')) {
          console.log("Stats document initialization pending first write.");
        } else if (error.message.includes('offline')) {
          console.warn("Firestore is initially offline. It will sync automatically when the connection is established.");
        } else {
          handleFirestoreError(error, 'testConnection');
        }
      }
    };
    testConnection();

    const unsubscribe = onSnapshot(doc(db, 'stats', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSendCount(data.appealCount || 0);
      }
    }, (error) => handleFirestoreError(error, 'onSnapshot'));

    return () => unsubscribe();
  }, []);

  const content = {
    en: {
      nav: { crisis: 'The Crisis', stats: 'Legal Status', action: 'Take Action' },
      hero: {
        alert: 'Emergency Conservation Appeal',
        title: 'Save Sahyadri',
        subtitle: 'Cast your vote today to stop illegal excavation in Shahuwadi!',
        ctaAction: 'Take Action Now',
        ctaEvidence: 'Context & Evidence'
      },
      stats: {
        violation: { label: 'Rule Violation', title: 'Expired LoIs', body: 'The Letters of Intent (LoI) for Parali, Ghungur-1, and Ghungur-2 have expired. Moving forward with these projects is a direct breach of Mineral Concession Rules.' },
        migration: { label: 'Migration Path', title: 'Tiger Corridor', body: 'The Shahuwadi region is a designated corridor linking Sahyadri Tiger Reserve. Mining will sever this vital ecological artery permanently.' },
        protection: { label: 'Legal Status', title: 'ESA Area', body: 'As part of the Western Ghats Eco-Sensitive Area (ESA), these blocks are legally protected from industrial extraction.' }
      },
      biodiversity: {
        badge: 'Critical Habitat',
        envImpact: 'Environmental Impact',
        title: 'The Pride of Sahyadri',
        body: 'The Shahuwadi region serves as a vital corridor for the Sahyadri Tiger Reserve. Open-cast bauxite mining doesn\'t just clear trees; it destroys the habitat of the magnificent Tiger and the Great Indian Hornbill.',
        risk: 'Species at Risk',
        riskSpecies: 'Tiger, Leopard, Wild Boar',
        riskDetails: 'The Western Ghats of Shahuwadi are a vital habitat for the elusive Tiger and Indian Leopard. Mining activities directly fragment their hunting grounds and migration routes, leading to dangerous man-animal conflicts and genetic isolation of these majestic species.',
        avian: 'Avian Life',
        avianSpecies: 'Great Indian Hornbill, Forest Owlet',
        avianDetails: 'The Shahuwadi region provides old-growth tall trees essential for the nesting of the Great Indian Hornbill. Industrial mining leads to massive canopy loss, destroying nesting sites and silencing the prehistoric call of these forest giants permanently.',
        showMore: 'Learn More',
        showLess: 'Show Less'
      },
      crisis: {
        investigation: 'The Investigation',
        title: 'Shahuwadi Ecosystem Under Threat',
        body: 'The Parali, Ghungur Block-1, and Ghungur Block-2 represent our last stand for the Sahyadri ecosystem. All three projects lack valid legal mandates as their LoIs have expired between 2023 and 2025.',
        violationDetails: 'Legal Status Update',
        violationBody: 'Mineral Concession Rules state that once an LoI expires, all clearing and extraction processes are invalid. Despite this, these 3 blocks continue to move toward development.',
        quote: 'Protecting our forest is protecting our future.'
      },
      action: {
        title: 'Send Your Objection',
        subtitle: 'We have drafted a professional, legal appeal in both Marathi and English. Click below to launch your email app.',
        stepTitle: 'Step-by-Step Action',
        step1: 'Review the pre-filled content in the preview window.',
        step2: 'Click "Send Automatic Email" to launch your preferred app.',
        step3: 'If the app doesn\'t open, use the copy buttons to manually paste the info.',
        cta: 'Send Automatic Email',
        copyNote: 'Note: Content syncs with active tab.'
      },
      impact: {
        title: 'Campaign Momentum',
        label: 'Appeals Sent So Far',
        unit: 'Citizens'
      },
      footer: {
        about: 'A community-led campaign for the preservation of the Shahuwadi eco-sensitive zone and the protection of the Sahyadri Tiger Corridor from illegal mining encroachment.',
        top: 'Back to top'
      },
      modal: {
        title: 'Complete your Appeal',
        body: 'To make your objection legally valid, please enter your full name. This will be dynamically inserted into the official appeal.',
        label: 'Your Full Name',
        placeholder: 'Enter your name here...',
        confirm: 'Confirm & Send',
        cancel: 'Cancel',
        sending: 'Processing...',
        successTitle: 'Thank You!',
        successBody: 'Your appeal has been recorded and your email app should be opening. If it doesn\'t, please use the manual copy buttons below.',
        close: 'Done'
      },
      fallback: {
        title: 'Manual Copy (If email doesn\'t open)',
        copyTo: 'Copy Recipients',
        copySubject: 'Copy Subject',
        copyBody: 'Copy Email Body',
        copied: 'Copied!',
        to: 'To',
        cc: 'CC',
        copyCC: 'Copy CC',
        subject: 'Subject',
        body: 'Message Body'
      }
    },
    mr: {
      nav: { crisis: 'संकट', stats: 'कायदेशीर स्थिती', action: 'कृती करा' },
      hero: {
        alert: 'तात्काळ संवर्धन आवाहन',
        title: 'सह्याद्री वाचवा',
        subtitle: 'शाहूवाडीतील बेकायदेशीर उत्खननास थांबवण्यासाठी आजच आपले मत नोंदवा!',
        ctaAction: 'आताच कृती करा',
        ctaEvidence: 'पुरावा आणि संदर्भा'
      },
      stats: {
        violation: { label: 'नियमांचे उल्लंघन', title: 'कालबाह्य परवाने', body: 'परळी, घुंगुर-१ आणि घुंगुर-२ या तिन्ही प्रकल्पांचे लेटर ऑफ इंटेंट (LoI) कालबाह्य झाले आहेत. तरीही कार्यवाही सुरू ठेवणे हे कायद्याचे उल्लंघन आहे.' },
        migration: { label: 'स्थलांतर मार्ग', title: 'व्याघ्र मार्ग', body: 'शाहूवाडीचा हा कॉरिडॉर सह्याद्री व्याघ्र प्रकल्पाचा मुख्य दुवा आहे. खाणकामामुळे या महत्त्वपूर्ण पर्यावरणीय धमनीचा संपर्क कायमचा तुटेल.' },
        protection: { label: 'कायदेशीर स्थिती', title: 'ESA संरक्षण', body: 'पश्चिम घाट पर्यावरण संवेदनशील क्षेत्र (ESA) चा भाग म्हणून, हे ब्लॉक कायदेशीररीत्या संवर्धनासाठी नियुक्त केलेले आहेत.' }
      },
      biodiversity: {
        badge: 'गंभीर अधिवास',
        envImpact: 'पर्यावरणीय प्रभाव',
        title: 'सह्याद्रीचा अभिमान',
        body: 'शाहूवाडी प्रदेश सह्याद्री व्याघ्र प्रकल्पासाठी एक महत्त्वाचा कॉरिडोर म्हणून काम करतो. बॉक्साईट उत्खननामुळे केवळ झाडे तोडली जात नाहीत; तर वाघ आणि धनेश पक्षांचा अधिवासही नष्ट होतो.',
        risk: 'धोक्यात असलेल्या प्रजाती',
        riskSpecies: 'वाघ, बिबट्या, रानडुक्कर',
        riskDetails: 'शाहूवाडीचा पश्चिम घाट हा वाघ आणि बिबट्यांचे महत्त्वाचे निवासस्थान आहे. उत्खननामधून उद्भवणाऱ्या गोंधळामुळे आणि जंगलतोडीमुळे त्यांच्या शिकारीच्या क्षेत्राचा नाश होतो, ज्यामुळे मानवी वस्तीत वाघांचा वावर वाढण्याचा धोका निर्माण होतो.',
        avian: 'पक्षी जीवन',
        avianSpecies: 'धनेश (Hornbill), रान पिंगळा',
        avianDetails: 'धनेश (Hornbill) पक्ष्यांना घरट्यांसाठी अतिशय उंच आणि जुन्या झाडांची आवश्यकता असते. बॉक्साईट खाणकामामुळे मोठ्या प्रमाणावर होणारी वृक्षतोड या पक्ष्यांचा अधिवास कायमचा नष्ट करेल.',
        showMore: 'अधिक माहिती',
        showLess: 'कमी माहिती'
      },
      crisis: {
        investigation: 'तपास',
        title: '३ खाण प्रकल्पांचा धोका',
        body: 'शाहूवाडीच्या परळी, घुंगुर-१ आणि घुंगुर-२ या तिन्ही ब्लॉकमधील प्रस्तावित खाणकाम सह्याद्रीच्या पर्यावरणासाठी घातक आहे. कायदेशीर आदेश संपल्यानंतरही येथे कार्यवाही सुरू आहे.',
        violationDetails: 'कायदेशीर उल्लंघनाचा तपशील',
        violationBody: 'लेटर ऑफ इंटेंट (LoI) संपल्यानंतर, उत्खननासाठी कोणतीही पुढील कार्यवाही अवैध आहे. परळी (२०२३), घुंगुर-१ (२०२५) आणि घुंगुर-२ (२०२४) असे तिन्ही प्रकल्प बेकायदेशीर आहेत.',
        quote: 'आपल्या जंगलाचे रक्षण करणे, म्हणजे आपल्या भविष्याचे रक्षण करणे आहे.'
      },
      action: {
        title: 'तुमचा आक्षेप नोंदवा',
        subtitle: 'आम्ही मराठी आणि इंग्रजी दोन्ही भाषांमध्ये व्यावसायिक, कायदेशीर अपील तयार केले आहे. तुमचे ईमेल अॅप उघडण्यासाठी खाली क्लिक करा.',
        stepTitle: 'स्टेप-बाय-स्टेप कृती',
        step1: 'पूर्वावलोकन विंडोमधील मजकूर तपासा.',
        step2: '"स्वयंचलित ईमेल पाठवा" वर क्लिक करा.',
        step3: 'अॅप उघडत नसल्यास, माहिती मॅन्युअली पेस्ट करण्यासाठी कॉपी बटणे वापरा.',
        cta: 'स्वयंचलित ईमेल पाठवा',
        copyNote: 'टीप: मजकूर सक्रिय टॅबसह समक्रमित होतो.'
      },
      footer: {
        about: 'शाहूवाडी पर्यावरण संवेदनशील क्षेत्राचे जतन आणि बेकायदेशीर खाणकामांच्या अतिक्रमणापासून सह्याद्री व्याघ्र कॉरिडॉरच्या संरक्षणासाठी लोक-नेतृत्व मोहीम.',
        top: 'वर जा'
      },
      modal: {
        title: 'तुमचे अपील पूर्ण करा',
        body: 'तुमचा आक्षेप कायदेशीररित्या ग्राह्य धरण्यासाठी, कृपया तुमचे पूर्ण नाव प्रविष्ट करा. हे नाव ईमेलमध्ये समाविष्ट केले जाईल.',
        label: 'तुमचे पूर्ण नाव',
        placeholder: 'येथे तुमचे नाव लिहा...',
        confirm: 'खात्री करा आणि पाठवा',
        cancel: 'रद्द करा',
        sending: 'प्रक्रिया सुरू आहे...',
        successTitle: 'धन्यवाद!',
        successBody: 'तुमची नोंद झाली आहे आणि तुमचे ईमेल अॅप उघडत असेल. न उघडल्यास, खालील कॉपी बटणे वापरा.',
        close: 'पूर्ण'
      },
      impact: {
        title: 'मोहिमेचा प्रभाव',
        label: 'आतापर्यंत पाठवलेली अपील्स',
        unit: 'नागरिक'
      },
      fallback: {
        title: 'मॅन्युअल कॉपी (ईमेल उघडत नसल्यास)',
        copyTo: 'प्राप्तकर्ता कॉपी करा',
        copySubject: 'विषय कॉपी करा',
        copyBody: 'मजकूर कॉपी करा',
        copied: 'कॉपी झाले!',
        to: 'प्रति',
        cc: 'CC (प्रत)',
        copyCC: 'CC कॉपी करा',
        subject: 'विषय',
        body: 'मजकूर'
      }
    }
  };

  const l = selectedLanguage ? content[selectedLanguage] : null;

  const recipients = [
    'seiaa.mah@gmail.com', 
    'pccfwl@mahaforest.gov.in', 
    'dcf.kolhapur@gmail.com',
    'collector.kolhapur@maharashtra.gov.in'
  ];
  
  const ccEmails = ['ms-ntca@nic.in'];
  
  const emailData = {
    en: {
      label: 'English Appeal',
      subject: 'Formal Objection against Granting Environmental and Forest Clearances for 3 Bauxite Mining Projects in Shahuwadi, Kolhapur',
      body: (name: string) => `To: 1. The Chairperson/Secretary, SEIAA (State Level Environmental Impact Assessment Authority), Mumbai.
2. The Principal Chief Conservator of Forests (Wildlife), Maharashtra State, Nagpur.
3. The District Collector, Kolhapur.
4. The Divisional Forest Officer, Kolhapur.

Subject: Formal Objection against Granting Environmental and Forest Clearances for 3 Bauxite Mining Projects in Shahuwadi, Kolhapur.

Respected Sir/Madam,

I am writing to you on behalf of the Sahyadri Bachav Sanghatana to register a formal and urgent objection against the proposed bauxite mining projects in Parali, Ghungur Block-I, and Ghungur Block-II in Shahuwadi Taluka, Kolhapur.

Granting clearances to these projects would constitute a direct violation of environmental laws and mineral concession rules. Our objections are based on the following critical points:

1. Violation of Mineral Concession Rules (Expired LoIs):
A mining project loses its legal standing once the Letter of Intent (LoI) expires. As per official records, the LoIs for all three projects have already lapsed:
- Parali Bauxite Block (Shree Malhar Minerals): LoI expired on 13/09/2023.
- Ghungur Bauxite Block-I (Shree Bhairavnath Earth Movers & Co.): LoI expired on 12/09/2025.
- Ghungur Bauxite Block-II (Shri Jugai Minerals): LoI expired on 12/09/2024.
Proceeding with any administrative clearance based on expired documents is legally untenable and constitutes a procedural lapse.

2. Threat to the Sahyadri Tiger Reserve Corridor:
These project sites are located within a vital North-South Tiger Corridor connecting the Sahyadri Tiger Reserve to the forests of the Southern Western Ghats. The draft Tiger Conservation Plan (TCP) identifies these villages as essential movement paths for tigers and other Schedule-I species. We are aware of recent attempts to exclude these villages from the TCP to facilitate mining, which violates the Wildlife Protection Act.

3. Proximity to Eco-Sensitive Area (ESA):
Specifically, the Parali project is located a mere 0.2 km from the Western Ghats ESA boundary. Mining activities in such a sensitive buffer zone will lead to depletion of water tables and permanent loss of endemic biodiversity.

4. Non-Compliance with Public Hearing Protocols:
The Project Proponents have failed to provide point-wise written replies to grievances raised during public hearings, which is a mandatory requirement for Environmental Clearance.

Our Demand:
- Reject all pending Forest and Environmental Clearance applications for these three blocks.
- Ensure no villages are excluded from the Tiger Conservation Plan.
- Halt any unauthorized surveys in these forest areas.

Sincerely,
${name || '[Your Name]'}
Representative, Sahyadri Bachav Sanghatana
Shahuwadi, Kolhapur.`,
    },
    mr: {
      label: 'मराठी अपील',
      subject: 'शाहूवाडी तालुक्यातील ३ प्रस्तावित बॉक्साईट खाण प्रकल्पांना वन आणि पर्यावरण मंजुरी नाकारण्याबाबत आणि तातडीने बंदी घालण्याबाबत',
      body: (name: string) => `प्रति,
१. अध्यक्ष/सचिव, SEIAA (State Level Environmental Impact Assessment Authority), मुंबई.
२. प्रधान मुख्य वनसंरक्षक (वन्यजीव), महाराष्ट्र राज्य, नागपूर.
३. जिल्हाधिकारी, कोल्हापूर.
४. विभागीय वन अधिकारी, कोल्हापूर.

विषय: शाहूवाडी तालुक्यातील ३ प्रस्तावित बॉक्साईट खाण प्रकल्पांना वन आणि पर्यावरण मंजुरी नाकारण्याबाबत आणि तातडीने बंदी घालण्याबाबत.

महोदय,

मी शाहूवाडी (कोल्हापूर) येथील निसर्गप्रेमी नागरिक आणि सह्याद्री बचाव मोहिमेचा प्रतिनिधी, या पत्राद्वारे शाहूवाडी तालुक्यातील परळी, घुंगुर ब्लॉक-१ आणि घुंगुर ब्लॉक-२ या तीन बॉक्साईट खाण प्रकल्पांबाबत गंभीर कायदेशीर आक्षेप नोंदवत आहे.

या प्रकल्पांना मंजुरी देणे म्हणजे कायद्याचे आणि पर्यावरणाचे उघड उल्लंघन ठरेल. त्याबाबतचे सविस्तर मुद्दे खालीलप्रमाणे आहेत:

१. प्रकल्पांचे मुदतबाह्य परवाने (Expired Letters of Intent - LoI):
खनिज सवलत नियमांनुसार, एकदा LoI ची मुदत संपली की तो प्रकल्प कायदेशीररित्या अवैध ठरतो. या तिन्ही प्रकल्पांची स्थिती खालीलप्रमाणे आहे:

परळी बॉक्साईट ब्लॉक (श्री मल्हार मिनरल्स): या प्रकल्पाचा LoI १३/०९/२०२३ रोजीच संपला आहे.
घुंगुर बॉक्साईट ब्लॉक-१ (श्री भैरवनाथ अर्थ मूव्हर्स): याचा LoI १२/०९/२०२५ रोजी संपला आहे.
घुंगुर बॉक्साईट ब्लॉक-२ (श्री जुगाई मिनरल्स): याचा LoI १२/०९/२०२४ रोजी संपला आहे.
मुदतबाह्य कागदपत्रांच्या आधारे कोणतीही प्रशासकीय प्रक्रिया पुढे नेणे हे बेकायदेशीर आहे.

२. सह्याद्री व्याघ्र प्रकल्प आणि व्याघ्र भ्रमणमार्ग (Tiger Corridor):
हे तिन्ही प्रकल्प सह्याद्री व्याघ्र प्रकल्पाच्या (STR) अत्यंत महत्त्वाच्या भ्रमणमार्गात येतात. नॅशनल टायगर कन्झर्वेशन अथॉरिटी (NTCA) कडे सादर केलेल्या व्याघ्र संवर्धन योजनेत (TCP) या गावांचा स्पष्ट उल्लेख 'कॉरिडॉर' म्हणून आहे.

३. पश्चिम घाट संवेदनशील क्षेत्र (ESA) उल्लंघन:
परळी आणि घुंगुर हे दोन्ही भाग पश्चिम घाटातील 'Ecologically Sensitive Area' (ESA) मध्ये येतात. परळी खाण प्रकल्प हा ESA सीमेपासून केवळ ०.२ किमी अंतरावर आहे.

४. जनसुनावणीतील त्रुटी (Public Hearing Non-Compliance):
या प्रकल्पांच्या जनसुनावणी दरम्यान स्थानिक ग्रामस्थांनी उपस्थित केलेल्या महत्त्वाच्या मुद्द्यांना आणि आक्षेपांना प्रकल्प प्रवर्तकांनी अद्याप समाधानकारक लेखी उत्तरे दिलेली नाहीत.

आमची मागणी:
वरील कायदेशीर आणि पर्यावरणीय वस्तुस्थिती लक्षात घेऊन, या तिन्ही प्रकल्पांची वन आणि पर्यावरण मंजुरी प्रक्रिया तात्काळ थांबवण्यात यावी आणि त्यांचे खाण परवाने कायमस्वरूपी रद्द करण्यात यावेत.

आपला नम्र,
${name || '[तुमचे नाव]'}
सह्याद्री बचाव संघटना / प्रतिनिधी
शाहूवाडी, कोल्हापूर.`,
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const currentEmailData = emailData[activeTab];
  const finalBody = currentEmailData.body(userName);
  
  const recipientsStr = recipients.map(r => r.trim()).join(',');
  const ccStr = ccEmails.join(',');
  const encodedSubject = encodeURIComponent(currentEmailData.subject);
  const encodedBody = encodeURIComponent(finalBody.replace(/\n/g, '\r\n'));
  const mailtoUrl = `mailto:${recipientsStr}?cc=${ccStr}&subject=${encodedSubject}&body=${encodedBody}`;

  const handleSendAction = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const confirmAndSend = async () => {
    if (!userName.trim()) return;
    setIsSending(true);

    try {
      const batch = writeBatch(db);
      
      const statsRef = doc(db, 'stats', 'global');
      batch.set(statsRef, { 
        appealCount: increment(1), 
        lastUpdate: serverTimestamp() 
      }, { merge: true });

      const subRef = doc(collection(db, 'submissions'));
      batch.set(subRef, {
        timestamp: serverTimestamp(),
        language: activeTab
      });

      await batch.commit();
      setHasSent(true);
      setShowSuccess(true);
      
      // Delay opening mailto slightly to allow success UI to be seen
      setTimeout(() => {
        window.location.href = mailtoUrl;
      }, 800);

    } catch (error) {
      handleFirestoreError(error, 'confirmAndSend');
      window.location.href = mailtoUrl;
      setShowConfirmModal(false);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f7f2] font-sans text-gray-900 selection:bg-[#c08b5c]/30">
      <AnimatePresence>
        {!selectedLanguage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center bg-[#0a1f11] p-6 overflow-y-auto"
          >
            <div className="max-w-xl w-full text-center space-y-10 py-10">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 sm:p-5 bg-[#c08b5c] rounded-2xl sm:rounded-3xl shadow-[0_0_40px_rgba(192,139,92,0.2)]">
                  <TreePine className="text-[#0a1f11] w-10 h-10 sm:w-12 sm:h-12" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-tight">Sahyadri Bachav</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <button 
                  onClick={() => { setSelectedLanguage('mr'); setActiveTab('mr'); }}
                  className="group relative p-6 sm:p-8 bg-[#1b4332] border border-white/10 rounded-[2.5rem] hover:border-[#c08b5c]/50 transition-all text-left flex flex-col items-center sm:items-start text-center sm:text-left min-h-[140px] justify-center"
                >
                  <span className="block text-3xl sm:text-4xl font-marathi font-bold text-white mb-2">मराठी</span>
                  <span className="block text-white/40 text-[10px] uppercase tracking-widest group-hover:text-[#c08b5c] transition-colors">Continue in Marathi</span>
                </button>
                <button 
                  onClick={() => { setSelectedLanguage('en'); setActiveTab('en'); }}
                  className="group relative p-6 sm:p-8 bg-[#1b4332] border border-white/10 rounded-[2.5rem] hover:border-[#c08b5c]/50 transition-all text-left flex flex-col items-center sm:items-start text-center sm:text-left min-h-[140px] justify-center"
                >
                  <span className="block text-3xl sm:text-4xl font-serif font-bold text-white mb-2 tracking-tight">English</span>
                  <span className="block text-white/40 text-[10px] uppercase tracking-widest group-hover:text-[#c08b5c] transition-colors">Continue in English</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {showConfirmModal && l && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-[#0a1f11]/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-[32px] p-6 sm:p-12 max-w-lg w-full shadow-2xl relative overflow-hidden z-[201]"
            >
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-3 text-gray-400 hover:text-[#0a1f11] hover:bg-gray-100 rounded-full transition-all z-20"
                aria-label="Close modal"
              >
                <X className="w-6 h-6 sm:w-5 sm:h-5" />
              </button>

              <div className="absolute top-0 right-0 p-8 opacity-5">
                <ShieldCheck className="w-24 h-24 text-[#0a1f11]" />
              </div>
              
              <div className="relative z-10 text-center sm:text-left">
                {!showSuccess ? (
                  <>
                    <h3 className="text-3xl font-serif font-black text-[#0a1f11] mb-4">{l?.modal?.title}</h3>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                      {l?.modal?.body}
                    </p>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-[#c08b5c] mb-2">{l?.modal?.label}</label>
                        <input 
                          type="text" 
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          placeholder={l?.modal?.placeholder}
                          autoFocus
                          disabled={isSending}
                          className="w-full px-6 py-4 bg-[#f9f7f2] border border-gray-200 rounded-xl focus:outline-none focus:border-[#c08b5c] focus:ring-4 focus:ring-[#c08b5c]/10 transition-all font-bold text-[#0a1f11] disabled:opacity-50"
                        />
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={confirmAndSend}
                          disabled={!userName.trim() || isSending}
                          className="flex-1 py-4 bg-[#1b4332] text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#0a1f11] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1b4332]/20 flex items-center justify-center gap-3"
                        >
                          {isSending ? (
                            <>
                              <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                              />
                              {l?.modal?.sending}
                            </>
                          ) : l?.modal?.confirm}
                        </motion.button>
                        {!isSending && (
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowConfirmModal(false)}
                            className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
                          >
                            {l?.modal?.cancel}
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-6 text-center"
                  >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 12 }}
                      >
                        <Check className="w-10 h-10 text-green-600" />
                      </motion.div>
                    </div>
                    <h3 className="text-3xl font-serif font-black text-[#0a1f11] mb-4">{l?.modal?.successTitle}</h3>
                    <p className="text-gray-500 mb-8 leading-relaxed max-w-sm mx-auto">
                      {l?.modal?.successBody}
                    </p>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setShowConfirmModal(false);
                        setTimeout(() => setShowSuccess(false), 500);
                      }}
                      className="px-12 py-4 bg-[#1b4332] text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#0a1f11] transition-all shadow-lg"
                    >
                      {l?.modal?.close}
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Browser Environment Alert */}
      <div className="bg-[#c08b5c]/10 text-[#0a1f11] text-[9px] sm:text-[10px] py-2.5 px-6 text-center font-black uppercase tracking-[0.2em] relative z-50 border-b border-[#c08b5c]/10 mt-[65px] sm:mt-[72px]">
        Best experienced by clicking "Open in new window" ↗
      </div>
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#0a1f11]/95 border-b border-white/5 py-4 px-6 sm:px-8 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex justify-center items-center">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-[#c08b5c] rounded">
              <TreePine className="text-[#0a1f11] w-5 h-5" />
            </div>
            <span className="font-serif font-bold text-white tracking-wide text-lg sm:text-xl">
              Sahyadri Bachav
            </span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[100svh] flex items-center pt-10 overflow-hidden bg-[#0a1f11]">
        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full pt-20 pb-28 text-center">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
            >
              <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="w-6 sm:w-16 h-px bg-[#c08b5c]/30" />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-[#c08b5c]">{l?.hero?.alert}</span>
                <div className="w-6 sm:w-16 h-px bg-[#c08b5c]/30" />
              </div>
              <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem] font-serif font-black text-white leading-[1] sm:leading-[0.8] mb-8 sm:mb-12 tracking-tight">
                {l?.hero?.title?.split(' ')[0]} <br className="hidden sm:block"/><span className="text-[#c08b5c]">{l?.hero?.title?.split(' ')[1]}</span>
              </h1>

              {/* Momentum Counter */}
              <div className="flex flex-col items-center mb-10 sm:mb-14">
                <div className="px-6 py-3 bg-[#c08b5c]/10 border border-[#c08b5c]/20 rounded-2xl flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0a1f11] overflow-hidden">
                        <img src={`https://picsum.photos/seed/person${i}/100/100`} alt="Supporter" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ))}
                  </div>
                  <div className="text-left">
                    <span className="block text-[#c08b5c] font-black text-xl leading-none">
                      {sendCount.toLocaleString()}
                    </span>
                    <span className="block text-white/40 text-[10px] uppercase tracking-widest font-bold">
                      {l?.impact?.label}
                    </span>
                  </div>
                </div>
              </div>

              <p className={`${selectedLanguage === 'mr' ? 'font-marathi' : 'font-sans'} text-lg sm:text-2xl md:text-3xl lg:text-4xl text-white/70 font-medium leading-[1.4] sm:leading-relaxed mb-10 sm:mb-14 max-w-2xl mx-auto`}>
                {l?.hero?.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                <a 
                  href="#action" 
                  className="w-full sm:w-auto px-10 py-5 sm:py-6 bg-[#c08b5c] text-[#0a1f11] rounded-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs hover:bg-[#b07b4c] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(192,139,92,0.15)]"
                >
                  {l?.hero?.ctaAction} <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Info Stats Section */}
      <section id="stats" className="bg-[#f9f7f2] text-[#0a1f11] py-24 px-6 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#0a1f11]/10 rounded-[2rem] sm:rounded-3xl overflow-hidden shadow-sm bg-white">
          <div className="p-6 sm:p-12 border-b md:border-b-0 md:border-r border-[#0a1f11]/5 group hover:bg-[#c08b5c]/5 transition-colors">
            <span className="text-[#c08b5c] font-black text-[10px] sm:text-xs uppercase tracking-widest mb-4 block">{l?.stats?.violation?.label}</span>
            <h3 className="text-3xl sm:text-5xl font-serif text-[#0a1f11] mb-5 sm:mb-6">{l?.stats?.violation?.title}</h3>
            <p className="text-gray-500 leading-relaxed text-sm">{l?.stats?.violation?.body}</p>
          </div>
          <div className="p-6 sm:p-12 border-b md:border-b-0 md:border-r border-[#0a1f11]/5 group hover:bg-[#c08b5c]/5 transition-colors">
            <span className="text-[#c08b5c] font-black text-[10px] sm:text-xs uppercase tracking-widest mb-4 block">{l?.stats?.migration?.label}</span>
            <h3 className="text-3xl sm:text-5xl font-serif text-[#0a1f11] mb-5 sm:mb-6">{l?.stats?.migration?.title}</h3>
            <p className="text-gray-500 leading-relaxed text-sm">{l?.stats?.migration?.body}</p>
          </div>
          <div className="p-6 sm:p-12 group hover:bg-[#c08b5c]/5 transition-colors">
            <span className="text-[#c08b5c] font-black text-[10px] sm:text-xs uppercase tracking-widest mb-4 block">{l?.stats?.protection?.label}</span>
            <h3 className="text-3xl sm:text-5xl font-serif text-[#0a1f11] mb-5 sm:mb-6">{l?.stats?.protection?.title}</h3>
            <p className="text-gray-500 leading-relaxed text-sm">{l?.stats?.protection?.body}</p>
          </div>
        </div>
      </section>

      {/* Biodiversity Section */}
      <section className="py-20 sm:py-32 px-6 bg-[#0a1f11] text-white">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block px-4 py-2 bg-[#c08b5c]/10 rounded-full border border-[#c08b5c]/20">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#c08b5c] flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-red-500" /> {l?.biodiversity?.badge}
            </span>
          </div>
          <div className="space-y-4">
            <span className="font-black text-[10px] sm:text-xs uppercase tracking-[0.4em] text-[#c08b5c] block">{l?.biodiversity?.envImpact}</span>
            <h2 className="text-3xl sm:text-6xl md:text-7xl font-serif font-black text-white leading-tight px-2">{l?.biodiversity?.title}</h2>
          </div>
          <p className="text-base sm:text-2xl text-white/60 leading-relaxed font-light px-2 sm:px-0">
            {l?.biodiversity?.body}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-6 sm:pt-8">
            <motion.div 
              layout
              className="p-6 sm:p-8 bg-white/5 rounded-3xl border border-white/5 text-left h-fit"
            >
              <h5 className="font-black text-[10px] uppercase tracking-widest text-[#c08b5c] mb-3 sm:mb-4">{l?.biodiversity?.risk}</h5>
              <p className="text-lg sm:text-xl font-bold text-white leading-tight mb-4">{l?.biodiversity?.riskSpecies}</p>
              
              <button 
                onClick={() => setExpandedBio(prev => ({ ...prev, risk: !prev['risk'] }))}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[#c08b5c] transition-colors"
              >
                {expandedBio['risk'] ? l?.biodiversity?.showLess : l?.biodiversity?.showMore}
                <motion.div animate={{ rotate: expandedBio['risk'] ? 180 : 0 }}>
                  <ChevronDown className="w-3 h-3" />
                </motion.div>
              </button>

              <AnimatePresence>
                {expandedBio['risk'] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="pt-4 text-sm text-white/50 leading-relaxed font-light">
                      {l?.biodiversity?.riskDetails}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div 
              layout
              className="p-6 sm:p-8 bg-white/5 rounded-3xl border border-white/5 text-left h-fit"
            >
              <h5 className="font-black text-[10px] uppercase tracking-widest text-[#c08b5c] mb-3 sm:mb-4">{l?.biodiversity?.avian}</h5>
              <p className="text-lg sm:text-xl font-bold text-white leading-tight mb-4">{l?.biodiversity?.avianSpecies}</p>

              <button 
                onClick={() => setExpandedBio(prev => ({ ...prev, avian: !prev['avian'] }))}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[#c08b5c] transition-colors"
              >
                {expandedBio['avian'] ? l?.biodiversity?.showLess : l?.biodiversity?.showMore}
                <motion.div animate={{ rotate: expandedBio['avian'] ? 180 : 0 }}>
                  <ChevronDown className="w-3 h-3" />
                </motion.div>
              </button>

              <AnimatePresence>
                {expandedBio['avian'] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="pt-4 text-sm text-white/50 leading-relaxed font-light">
                      {l?.biodiversity?.avianDetails}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Crisis Context */}
      <section id="about" className="py-20 sm:py-32 px-6 bg-[#f9f7f2]">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center">
            <span className="font-black text-[10px] uppercase tracking-[0.4em] text-[#c08b5c] block mb-4">{l?.crisis?.investigation}</span>
            <h2 className="text-3xl sm:text-6xl md:text-7xl font-serif font-black text-[#0a1f11] leading-tight px-2">{l?.crisis?.title}</h2>
          </div>
          
          <div className="space-y-8 text-base sm:text-xl text-gray-700 leading-relaxed text-center sm:text-center">
            <p className="font-light px-2 sm:px-0">{l?.crisis?.body}</p>
            <div className="bg-white rounded-[2rem] p-6 sm:p-12 border border-[#0a1f11]/5 shadow-sm text-left">
              <h4 className="font-bold text-[#0a1f11] text-lg sm:text-xl mb-4 sm:mb-6 flex items-center gap-3">
                <Landmark className="w-5 h-5 sm:w-6 sm:h-6 text-[#c08b5c]" /> {l?.crisis?.violationDetails}
              </h4>
              <p className="text-gray-500 leading-relaxed text-sm sm:text-base">{l?.crisis?.violationBody}</p>
            </div>
            <p className={`text-xl sm:text-4xl font-bold text-[#1b4332] italic mt-12 px-2 ${selectedLanguage === 'mr' ? 'font-marathi' : 'font-serif'}`}>
              "{l?.crisis?.quote}"
            </p>
          </div>
        </div>
      </section>

      {/* Take Action Section */}
      <section id="action" className="py-24 px-6 bg-[#0a1f11] relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              className="inline-block p-4 bg-[#c08b5c]/10 rounded-full mb-8 relative"
            >
              <Mail className="text-[#c08b5c] w-12 h-12" />
              {hasSent && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#0a1f11]"
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </motion.div>
            <h2 className="text-4xl sm:text-6xl md:text-8xl font-serif text-white font-black mb-8">{l?.action?.title}</h2>
            
            {/* Impact Highlight */}
            <div className="flex flex-col items-center gap-2 mb-8">
              <span className="text-[#c08b5c] font-black text-4xl sm:text-6xl tracking-tighter">
                {sendCount.toLocaleString()}+
              </span>
              <span className="text-white/40 font-black text-[10px] sm:text-xs uppercase tracking-[0.5em]">
                {l?.impact?.label}
              </span>
            </div>

            <p className="text-white/60 text-base sm:text-xl max-w-2xl mx-auto font-light leading-relaxed px-4">
              {l?.action?.subtitle}
            </p>
          </div>

          <div className="bg-white rounded-[2rem] sm:rounded-[40px] p-6 md:p-16 shadow-2xl">
            {/* Tab Selector */}
            <div className="flex flex-col sm:flex-row bg-[#f9f7f2] p-1.5 rounded-[1.5rem] sm:rounded-2xl mb-8 sm:mb-12 max-w-md mx-auto border border-gray-100 gap-1 sm:gap-0">
              <button 
                onClick={() => setActiveTab('mr')}
                className={`w-full sm:flex-1 py-3 sm:py-4 px-6 rounded-xl font-bold uppercase tracking-widest text-xs transition-all ${
                  activeTab === 'mr' ? 'bg-[#0a1f11] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                मराठी अपील
              </button>
              <button 
                onClick={() => setActiveTab('en')}
                className={`w-full sm:flex-1 py-3 sm:py-4 px-6 rounded-xl font-bold uppercase tracking-widest text-xs transition-all ${
                  activeTab === 'en' ? 'bg-[#0a1f11] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                English Appeal
              </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <div className="space-y-8">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#c08b5c] mb-6 flex items-center gap-2">
                    <Info className="w-3 h-3" /> {l?.action?.stepTitle}
                  </h4>
                  <ul className="space-y-8">
                    <li className="flex gap-5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0a1f11] text-white flex items-center justify-center font-bold text-xs">1</div>
                      <p className="text-gray-600 leading-tight pt-1">{l?.action?.step1}</p>
                    </li>
                    <li className="flex gap-5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0a1f11] text-white flex items-center justify-center font-bold text-xs">2</div>
                      <p className="text-gray-600 leading-tight pt-1">{l?.action?.step2}</p>
                    </li>
                    <li className="flex gap-5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0a1f11] text-white flex items-center justify-center font-bold text-xs">3</div>
                      <p className="text-gray-600 leading-tight pt-1">{l?.action?.step3}</p>
                    </li>
                  </ul>
                </div>

                <div className="pt-8 border-t border-gray-100">
                  <a 
                    href={mailtoUrl}
                    onClick={handleSendAction}
                    className="w-full py-6 bg-[#1b4332] text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#0a1f11] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 no-underline text-center"
                  >
                    {l?.action?.cta} <ExternalLink className="w-5 h-5" />
                  </a>
                  <p className="mt-4 text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
                    <Info className="w-3 h-3" /> {l?.action?.copyNote}
                  </p>
                </div>
              </div>

              {/* Email Content Preview */}
              <div className="bg-[#fbfcfa] border border-gray-100 rounded-[2.5rem] p-6 sm:p-10 shadow-inner relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Mail className="w-24 h-24 text-[#0a1f11]" />
                </div>
                
                <div className="relative z-10 space-y-8">
                  <div className="border-b border-[#0a1f11]/5 pb-6">
                    <h5 className="font-serif font-black text-[#0a1f11] text-xl mb-1">{l?.fallback?.title}</h5>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">{l?.action?.copyNote}</p>
                  </div>

                  {/* Recipients Field */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c08b5c]">{l?.fallback?.to}</label>
                      <button 
                        onClick={() => copyToClipboard(recipients.join(','), 'to')}
                        className={`w-full sm:w-auto min-w-[120px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-full text-[10px] font-bold transition-all overflow-hidden ${
                          copiedField === 'to' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-[#0a1f11]/5 text-[#0a1f11] hover:bg-[#0a1f11]/10'
                        }`}
                      >
                        <AnimatePresence mode="wait">
                          {copiedField === 'to' ? (
                            <motion.span
                              key="copied"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2"
                            >
                              <Check className="w-3 h-3" /> {l?.fallback?.copied}
                            </motion.span>
                          ) : (
                            <motion.span
                              key="copy"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2"
                            >
                              <Copy className="w-3 h-3" /> {l?.fallback?.copyTo}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </button>
                    </div>
                    <div 
                      onClick={() => copyToClipboard(recipients.join(','), 'to')}
                      className="text-[10px] sm:text-[11px] font-mono p-4 bg-white border-2 border-dashed border-gray-100 rounded-2xl text-gray-500 break-all leading-relaxed shadow-sm cursor-pointer hover:border-[#c08b5c]/30 hover:bg-[#f9f7f2]/30 transition-all group/field"
                    >
                      <span className="group-hover/field:text-[#0a1f11] transition-colors">{recipients.join(', ')}</span>
                    </div>
                  </div>

                  {/* CC Field */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c08b5c]">{l?.fallback?.cc}</label>
                      <button 
                        onClick={() => copyToClipboard(ccEmails.join(','), 'cc')}
                        className={`w-full sm:w-auto min-w-[120px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-full text-[10px] font-bold transition-all overflow-hidden ${
                          copiedField === 'cc' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-[#0a1f11]/5 text-[#0a1f11] hover:bg-[#0a1f11]/10'
                        }`}
                      >
                        <AnimatePresence mode="wait">
                          {copiedField === 'cc' ? (
                            <motion.span
                              key="copied"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2"
                            >
                              <Check className="w-3 h-3" /> {l?.fallback?.copied}
                            </motion.span>
                          ) : (
                            <motion.span
                              key="copy"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2"
                            >
                              <Copy className="w-3 h-3" /> {l?.fallback?.copyCC}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </button>
                    </div>
                    <div 
                      onClick={() => copyToClipboard(ccEmails.join(','), 'cc')}
                      className="text-[10px] sm:text-[11px] font-mono p-4 bg-white border-2 border-dashed border-gray-100 rounded-2xl text-gray-500 break-all leading-relaxed shadow-sm cursor-pointer hover:border-[#c08b5c]/30 hover:bg-[#f9f7f2]/30 transition-all group/field"
                    >
                      <span className="group-hover/field:text-[#0a1f11] transition-colors">{ccEmails.join(', ')}</span>
                    </div>
                  </div>

                  {/* Subject Field */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c08b5c]">{l?.fallback?.subject}</label>
                      <button 
                        onClick={() => copyToClipboard(emailData[activeTab].subject, 'subject')}
                        className={`w-full sm:w-auto min-w-[120px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-full text-[10px] font-bold transition-all overflow-hidden ${
                          copiedField === 'subject' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-[#0a1f11]/5 text-[#0a1f11] hover:bg-[#0a1f11]/10'
                        }`}
                      >
                        <AnimatePresence mode="wait">
                          {copiedField === 'subject' ? (
                            <motion.span
                              key="copied"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2"
                            >
                              <Check className="w-3 h-3" /> {l?.fallback?.copied}
                            </motion.span>
                          ) : (
                            <motion.span
                              key="copy"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2"
                            >
                              <Copy className="w-3 h-3" /> {l?.fallback?.copySubject}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </button>
                    </div>
                    <div 
                      onClick={() => copyToClipboard(emailData[activeTab].subject, 'subject')}
                      className="text-xs font-bold p-4 bg-white border-2 border-dashed border-gray-100 rounded-2xl text-[#0a1f11] leading-relaxed shadow-sm cursor-pointer hover:border-[#c08b5c]/30 hover:bg-[#f9f7f2]/30 transition-all group/field"
                    >
                      <span className="group-hover/field:text-black transition-colors">{emailData[activeTab].subject}</span>
                    </div>
                  </div>

                  {/* Body Field */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c08b5c]">{l?.fallback?.body}</label>
                      <button 
                        onClick={() => copyToClipboard(finalBody, 'body')}
                        className={`w-full sm:w-auto min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-full text-[10px] font-bold transition-all overflow-hidden ${
                          copiedField === 'body' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-[#1b4332] text-white hover:bg-[#0a1f11]'
                        }`}
                      >
                        <AnimatePresence mode="wait">
                          {copiedField === 'body' ? (
                            <motion.span
                              key="copied"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2"
                            >
                              <Check className="w-3 h-3" /> {l?.fallback?.copied}
                            </motion.span>
                          ) : (
                            <motion.span
                              key="copy"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2"
                            >
                              <Check className="w-3 h-3" /> {l?.fallback?.copyBody}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </button>
                    </div>
                    <div 
                      onClick={() => copyToClipboard(finalBody, 'body')}
                      className="text-[10px] sm:text-[11px] h-[300px] sm:h-[350px] overflow-y-auto whitespace-pre-wrap p-5 bg-white border-2 border-dashed border-gray-100 rounded-[2.5rem] text-gray-600 leading-relaxed custom-scrollbar shadow-sm cursor-pointer hover:border-[#c08b5c]/30 hover:bg-[#f9f7f2]/30 transition-all group/field relative"
                    >
                      <div className="absolute top-4 right-6 opacity-0 group-hover/field:opacity-20 transition-opacity">
                        <Copy className="w-4 h-4" />
                      </div>
                      <span className="group-hover/field:text-gray-900 transition-colors">{finalBody}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a1f11] py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#c08b5c] rounded">
                <TreePine className="text-[#0a1f11] w-6 h-6" />
              </div>
              <span className="font-serif font-black text-white text-3xl tracking-tight">Sahyadri Bachav</span>
            </div>
            <p className="text-white/40 text-sm max-w-sm tracking-wide leading-relaxed">
              {l?.footer?.about}
            </p>
          </div>
          
          <div className="text-right space-y-4">
            <a href="#" className="block text-[#c08b5c] font-black text-xs uppercase tracking-widest hover:text-white transition-colors">{l?.footer?.top}</a>
            <p className="text-[10px] text-white/20 uppercase tracking-[0.5em]">Kolhapur, India © 2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
