import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import sahyadriLogo from './assets/sahyadri-logo.jpg';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, Cell, LabelList } from 'recharts';
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
  getDoc,
  initializeFirestore,
  query,
  getDocs,
  orderBy
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  googleSheetsSignIn, 
  getSheetsAccessToken, 
  getOrCreateVolunteerSheet, 
  appendVolunteerToSheet, 
  batchSyncVolunteersToSheet, 
  VolunteerData 
} from './googleSheets';
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
  Info,
  Share2,
  Users,
  FileSpreadsheet,
  RefreshCw,
  Table,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Using initializeFirestore to force long polling, which is more reliable in sandboxed iframes
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, (firebaseConfig as any).firestoreDatabaseId);

export default function App() {
  const isStandaloneLegal = window.location.hostname.startsWith('legal.') || window.location.pathname.includes('/legal');
  const isStandaloneVolunteer = window.location.hostname.startsWith('volunteer.') || window.location.pathname.includes('/volunteer');
  const isInvestigation = window.location.pathname.includes('/nexus') || window.location.pathname.includes('/investigation');
  
  const [activeView, setActiveView] = useState<'main' | 'investigation' | 'legal' | 'volunteer'>(
    isStandaloneLegal ? 'legal' : isStandaloneVolunteer ? 'volunteer' : isInvestigation ? 'investigation' : 'main'
  );

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.includes('/legal')) setActiveView('legal');
      else if (path.includes('/volunteer')) setActiveView('volunteer');
      else if (path.includes('/nexus') || path.includes('/investigation')) setActiveView('investigation');
      else setActiveView('main');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (view: 'main' | 'investigation' | 'legal' | 'volunteer') => {
    setActiveView(view);
    window.scrollTo(0, 0);
    const path = view === 'main' ? '/' : `/${view}`;
    // Only push state if we are not already on that path, to avoid duplicate history entries
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguageState] = useState<'en' | 'mr' | null>(() => {
    const saved = localStorage.getItem('sahyadri-lang');
    if (saved === 'en' || saved === 'mr') return saved;
    return null;
  });
  
  const setSelectedLanguage = (lang: 'en' | 'mr' | null) => {
    setSelectedLanguageState(lang);
    if (lang) {
      localStorage.setItem('sahyadri-lang', lang);
    } else {
      localStorage.removeItem('sahyadri-lang');
    }
  };

  const [activeTab, setActiveTab] = useState<'mr' | 'en'>(() => {
    const saved = localStorage.getItem('sahyadri-lang');
    return (saved === 'en' || saved === 'mr') ? saved : 'mr';
  });
  // Toast Notification State
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'info' | 'error' }>>([]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [nameError, setNameError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [pendingExternalUrl, setPendingExternalUrl] = useState('');
  
  // Download Modal State
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState<any>(null);
  const [dlName, setDlName] = useState('');
  const [dlEmail, setDlEmail] = useState('');
  const [dlLocation, setDlLocation] = useState('');
  const [dlError, setDlError] = useState('');
  const [dlSuccess, setDlSuccess] = useState(false);
  
  // Volunteer Modal State
  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [volName, setVolName] = useState('');
  const [volEmail, setVolEmail] = useState('');
  const [volPhone, setVolPhone] = useState('');
  const [volLocation, setVolLocation] = useState('');
  const [volRole, setVolRole] = useState('');
  const [volSkills, setVolSkills] = useState('');
  const [volError, setVolError] = useState('');
  const [volSuccess, setVolSuccess] = useState(false);
  const [isVolSending, setIsVolSending] = useState(false);

  // Google Sheets Integration State
  const [sheetsToken, setSheetsToken] = useState<string | null>(() => getSheetsAccessToken());
  const [gsheetId, setGsheetId] = useState<string>(() => localStorage.getItem('sahyadri_volunteer_sheet_id') || '');
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetsSyncMsg, setSheetsSyncMsg] = useState<string>('');

  const handleConnectAndSyncSheets = async () => {
    setIsSyncingSheets(true);
    setSheetsSyncMsg('');
    try {
      let token = getSheetsAccessToken() || sheetsToken;
      if (!token) {
        const authRes = await googleSheetsSignIn();
        if (authRes) {
          token = authRes.accessToken;
          setSheetsToken(token);
        }
      }
      if (!token) throw new Error('Google Sign-In required to connect Google Sheets.');

      let activeSheetId = gsheetId;
      if (!activeSheetId) {
        activeSheetId = await getOrCreateVolunteerSheet(token);
        setGsheetId(activeSheetId);
      }

      // Fetch existing volunteers from Firestore
      let snapshot;
      try {
        const volQuery = query(collection(db, 'volunteers'), orderBy('timestamp', 'desc'));
        snapshot = await getDocs(volQuery);
      } catch (e) {
        snapshot = await getDocs(collection(db, 'volunteers'));
      }
      const volList: VolunteerData[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const dateStr = data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : new Date().toLocaleString();
        return {
          timestamp: dateStr,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          location: data.location || '',
          role: data.role || '',
          skills: data.skills || '',
          language: data.language || 'mr'
        };
      });

      if (volList.length > 0) {
        await batchSyncVolunteersToSheet(token, activeSheetId, volList);
        const msg = selectedLanguage === 'mr' ? `एकूण ${volList.length} अर्ज गूगल शीटमध्ये सेव्ह झाले!` : `Synced ${volList.length} volunteer records to Google Sheets!`;
        setSheetsSyncMsg(msg);
        showToast(msg, 'success');
      } else {
        const msg = selectedLanguage === 'mr' ? 'गूगल शीट तयार झाली! नवीन अर्ज येथे आपोआप जमा होतील.' : 'Google Sheet connected! New applications will automatically append here.';
        setSheetsSyncMsg(msg);
        showToast(msg, 'success');
      }
    } catch (err: any) {
      console.error('Google Sheets sync error:', err);
      setSheetsSyncMsg(err.message || 'Could not connect to Google Sheets.');
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const chartRef = useRef(null);
  const isChartInView = useInView(chartRef, { once: true, margin: "-100px" });

  const [expandedEvidence, setExpandedEvidence] = useState<Record<number, boolean>>({});
  const [expandedBio, setExpandedBio] = useState<Record<string, boolean>>({});

  const BASE_APPEAL_COUNT = 1480;

  const [sendCount, setSendCount] = useState<number>(() => {
    const saved = localStorage.getItem('sahyadri_appeal_count');
    return saved ? Math.max(BASE_APPEAL_COUNT, parseInt(saved, 10)) : BASE_APPEAL_COUNT;
  }); 
  const [volCount, setVolCount] = useState(0);
  const [hasSent, setHasSent] = useState(false);

  // Helper to build a proportional chart distribution based on total appeal count
  const buildChartDistribution = (totalCount: number, realW1 = 0, realW2 = 0, realW3 = 0, realCurr = 0) => {
    if (realW1 > 0 || realW2 > 0 || realW3 > 0) {
      return [
        { name: 'Week 1', appeals: realW1 },
        { name: 'Week 2', appeals: realW2 },
        { name: 'Week 3', appeals: realW3 },
        { name: 'Current', appeals: realCurr }
      ];
    }
    const w1 = Math.round(totalCount * 0.18);
    const w2 = Math.round(totalCount * 0.24);
    const w3 = Math.round(totalCount * 0.28);
    const current = Math.max(0, totalCount - (w1 + w2 + w3));
    return [
      { name: 'Week 1', appeals: w1 },
      { name: 'Week 2', appeals: w2 },
      { name: 'Week 3', appeals: w3 },
      { name: 'Current', appeals: current }
    ];
  };

  const [chartData, setChartData] = useState(() => buildChartDistribution(sendCount));

  // Firebase Error Handler
  const handleFirestoreError = (error: any, operation: string) => {
    const msg = error?.message || String(error);
    if (msg.includes('offline') || error?.code === 'unavailable') {
      console.warn(`Firestore ${operation}: Client is offline. Operating in offline mode.`);
    } else {
      console.error(`Firestore ${operation} failed:`, error);
    }
  };

  // Test Connection & Listen to global counter
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'stats', 'global'));
      } catch (error: any) {
        const msg = error?.message || String(error);
        if (msg.includes('permission-denied')) {
          console.log("Stats document initialization pending first write.");
        } else if (msg.includes('offline') || error?.code === 'unavailable') {
          console.warn("Firestore is initially offline. It will sync automatically when the connection is established.");
        } else {
          handleFirestoreError(error, 'testConnection');
        }
      }
    };
    testConnection();

    const fetchHistoricalData = async () => {
      try {
        let sn;
        try {
          const q = query(collection(db, 'submissions'), orderBy('timestamp', 'asc'));
          sn = await getDocs(q);
        } catch (err) {
          sn = await getDocs(collection(db, 'submissions'));
        }

        const realSubmissionsCount = sn.size;
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        let w1 = 0, w2 = 0, w3 = 0, current = 0;
        sn.forEach(d => {
          const t = d.data().timestamp;
          const time = t && typeof t.toMillis === 'function' ? t.toMillis() : Date.now();
          const diff = now - time;
          if (diff < oneWeek) current++;
          else if (diff < 2 * oneWeek) w3++;
          else if (diff < 3 * oneWeek) w2++;
          else w1++;
        });

        const calculatedTotal = BASE_APPEAL_COUNT + realSubmissionsCount;
        setSendCount(prev => {
          const newTotal = Math.max(prev, calculatedTotal);
          localStorage.setItem('sahyadri_appeal_count', newTotal.toString());
          setChartData(buildChartDistribution(newTotal, w1, w2, w3, current));
          return newTotal;
        });

        // Ensure stats/global document maintains at least baseline count
        try {
          const statsRef = doc(db, 'stats', 'global');
          const statsSnap = await getDoc(statsRef);
          const existingCount = statsSnap.exists() ? (statsSnap.data().appealCount || 0) : 0;
          if (calculatedTotal > existingCount) {
            await setDoc(statsRef, {
              appealCount: calculatedTotal,
              lastUpdate: serverTimestamp()
            }, { merge: true });
          }
        } catch (sErr) {
          console.warn("Unable to update stats document offline:", sErr);
        }
      } catch (error: any) {
        const msg = error?.message || String(error);
        if (msg.includes('offline') || error?.code === 'unavailable') {
          console.warn("Firestore historical sync skipped: client is offline. Using local count & chart distribution.");
        } else {
          console.warn("Failed to fetch historical chart data:", error);
        }
      }
    };
    fetchHistoricalData();

    const unsubscribeStats = onSnapshot(doc(db, 'stats', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const dbCount = data.appealCount || 0;
        setSendCount(prev => {
          const newTotal = Math.max(prev, dbCount, BASE_APPEAL_COUNT);
          localStorage.setItem('sahyadri_appeal_count', newTotal.toString());
          setChartData(prevData => {
            const hasRealHistory = prevData[0].appeals > 0 && prevData[1].appeals > 0 && prevData[0].appeals !== Math.round(prev * 0.18);
            if (hasRealHistory) {
              return prevData;
            }
            return buildChartDistribution(newTotal);
          });
          return newTotal;
        });
        setVolCount(data.volunteerCount || 0);
      }
    }, (error) => handleFirestoreError(error, 'onSnapshot'));

    return () => unsubscribeStats();
  }, []);

  const content = {
    en: {
      nav: { crisis: 'The Crisis', stats: 'Legal Status', action: 'Take Action', nexus: 'The Nexus', volunteer: 'Volunteer' },
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
      share: {
        title: 'Spread the Word',
        whatsapp: 'Share on WhatsApp',
        facebook: 'Facebook',
        twitter: 'X / Twitter',
        copy: 'Copy Link',
        system: 'Share link',
        message: 'Join the campaign to save the Sahyadri Tiger Corridor from illegal mining! Please send an objection email to protect the Western Ghats and its biodiversity: ',
        copySuccess: 'Link copied!'
      },
      impact: {
        title: 'Campaign Momentum',
        label: 'Appeals Sent So Far',
        unit: 'Citizens'
      },
      timeline: {
        title: 'Timeline of Events',
        subtitle: 'Key tracking milestones covering the Shahuwadi mining proposals, clearances, and expirations.',
        events: [
          { year: '2008', date: 'August 2008', title: 'Initial Approvals', desc: 'Preliminary environmental clearances were proposed for bauxite extraction in the Western Ghats without complete ecological mapping.' },
          { year: '2012', date: 'WGEEP Report', title: 'Gadgil Committee', desc: 'The Western Ghats Ecology Expert Panel (WGEEP) designated the Shahuwadi region as Eco-Sensitive Zone 1, recommending a ban on new mining.' },
          { year: '2023', date: 'Sep 13, 2023', title: 'Perli LoI Expiration', desc: 'The Letter of Intent for the Perli Bauxite Block officially expired, rendering further steps potentially void.' },
          { year: '2024', date: 'Sep 12, 2024', title: 'Ghungur-II LoI Expiration', desc: 'The LoI for Ghungur Block-II lapsed, resulting in a loss of legal authority to proceed with extraction.' },
          { year: '2025', date: 'Expected 2025', title: 'Ghungur-I LoI Expiry', desc: 'The final Ghungur Block-I LoI is set to expire, facing heavy objections in public hearings regarding false EIA data and biodiversity suppression.' },
        ]
      },
      investigation: {
        title: 'The Nexus: Profit vs Nature',
        subtitle: 'An investigative report into how high-level politics and corporate interests are stripping the Sahyadri Tiger Corridor of its legal protection.',
        back: 'Back to Campaign',
        sections: [
          {
            title: 'The Tiger Corridor Deletion',
            body: 'Environmentalists and the Sahyadri Bachav Sanghatana have flagged a calculated attempt by the State Forest Department to exclude villages like Parali, Ghungur, and Yelvan Jugai from the Sahyadri Tiger Reserve Conservation Plan. By redrawing these boundaries, the projects deliberately bypass the mandatory National Tiger Conservation Authority (NTCA) oversight.'
          },
          {
            title: 'Political Patronage',
            body: 'Local political leadership, including reports pointing to the influence of representatives like MLA Vinay Kore, has consistently prioritized mining "development" over the UNESCO World Heritage status of the Western Ghats. Lobbying efforts have been documented to shrink the Eco-Sensitive Zone (ESZ) buffers around Shahuwadi, specifically to accommodate the 3 bauxite blocks.'
          },
          {
            title: 'The Profit Motive',
            body: 'Each of the 3 mining blocks—Perli, Ghungur-I, and Ghungur-II—contains high-grade bauxite worth thousands of crores. The proponents (Shree Malhar Minerals, Shree Bhairavnath Earth Movers, and Shri Jugai Minerals) are aggressively pushing for clearances despite their Letters of Intent (LoI) having expired between 2023 and 2025.'
          },
          {
            title: 'Ecological Sabotage',
            body: 'While official records claim "minimum impact," these areas are documented movement paths for tigers moving from Radhanagari and Goa towards STR. Deleting these areas from the corridor plan is an act of ecological sabotage that violates the Wildlife (Protection) Act, 1972.'
          }
        ]
      },
      gallery: {
        title: 'Government Records',
        subtitle: 'Official proof of the legal violations across the 3 contested blocks.',
        view: 'View Legal Document',
        blocks: [
          { name: 'Perli Bauxite Block', proponent: 'Shree Malhar Minerals', status: 'LoI Expired (2023)', url:'https://parivesh.nic.in/newupgrade/#/trackYourProposal/proposal-details?proposalId=SIA%2FMH%2FMIN%2F557966%2F2025&proposal=350503578' },
          { name: 'Ghungur Block-I', proponent: 'Shree Bhairavnath Earth Movers', status: 'LoI Expired (2025)', url:'https://parivesh.nic.in/newupgrade/#/trackYourProposal/proposal-details?proposalId=SIA%2FMH%2FMIN%2F544562%2F2025&proposal=131987801' },
          { name: 'Ghungur Block-II', proponent: 'Shri Jugai Minerals', status: 'LoI Expired (2024)', url:'https://parivesh.nic.in/newupgrade/#/trackYourProposal/proposal-details?proposalId=SIA%2FMH%2FMIN%2F545254%2F2025&proposal=132332846' }
        ],
        externalModal: {
          title: 'Leaving Sahyadri Bachav',
          body: 'You are about to open an external government website (parivesh.nic.in) in a new tab.',
          cancel: 'Stay Here',
          continue: 'Continue to Site'
        }
      },
      legal: {
        title: 'Legal Status',
        subtitle: 'Comprehensive breakdown of environmental and legal objections submitted against the mining approvals.',
        downloadInstructions: 'You can read the detailed summary of the violations below. To access the official PDF document, a download request is required.',
        downloadBtn: 'Download PDF',
        back: 'Back to Campaign',
        dlModal: {
          title: 'Download Legal Document',
          body: 'Please provide your details to download the official legal documents. This information will be registered securely.',
          nameLabel: 'Full Name',
          emailLabel: 'Email Address',
          emailPlaceholder: 'you@example.com',
          locLabel: 'Village / City',
          confirm: 'Confirm & Download',
          cancel: 'Cancel',
          successTitle: 'Download Started!',
          successBody: 'Your download should begin shortly. Would you also like to notify the action committee manually?',
          adminNotifyFallback: 'Notify via Email Client'
        },
        docs: [
          {
            id: 'ghungur-1',
            title: 'Ghungur Bauxite Block-I',
            proponent: 'Shree Bhairavnath Earth Movers',
            area: '14.24 Ha',
            points: [
              { title: 'Legal Nullity', desc: 'Letter of Intent (LoI) expired on September 12, 2024, rendering the clearance process ab-initio void.' },
              { title: 'False EIA Information', desc: 'Concealed critical biodiversity information including the presence of Endemic Birds and Medicinal Plants in the "barren land" classification.' },
              { title: 'Public Hearing Non-Compliance', desc: 'Failed to provide point-wise replies to hundreds of critical objections raised by locals, violating EIA Notification 2006.' },
              { title: 'Habitat Fragmentation', desc: 'The site falls squarely within a documented Wildlife Corridor, increasing the risk of human-wildlife conflict.' }
            ]
          },
          {
            id: 'ghungur-2',
            title: 'Ghungur Bauxite Block-II',
            proponent: 'Shri Jugai Minerals',
            area: '13.86 Ha',
            points: [
              { title: 'Expired Approval', desc: 'Letter of Intent (LoI) expired on September 12, 2024. Authority over the land has legally lapsed.' },
              { title: 'Violation of EIA 2006', desc: 'Severe Public Hearing flaws, maintaining a "Deferred" status by SEAC/SEIAA which must be permanently upheld.' },
              { title: 'Ecological Impact', desc: 'Significant reduction in forest land threatening the habitat corridor of the Indian Bison (Gaur) and Leopards.' },
              { title: 'Hydrological Hazard', desc: 'Red mud pollution and destruction of the mountain "sponge" threatening the water security of surrounding villages.' }
            ]
          },
          {
            id: 'perli',
            title: 'Perli Bauxite Block',
            proponent: 'Shree Malhar Minerals',
            area: '7.54 Ha',
            points: [
              { title: 'Buffer Zone Violation', desc: 'The site is located merely 0.2km (200 meters) from the declared Western Ghats ESA boundary, an explicit violation of MoEF&CC guidelines.' },
              { title: 'Expired LoI', desc: 'The foundational Letter of Intent (LoI) expired over two years ago on September 13, 2023.' },
              { title: 'Forest Conservation Act Breach', desc: 'Operating without mandatory "Stage-1" Forest Clearance on protected forest land.' },
              { title: 'Water Tower Destruction', desc: 'Irreversible destruction of the natural water catchment area, directly leading to dry wells in 5 adjoining downstream villages.' }
            ]
          }
        ]
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
        locationLabel: 'Village / Taluka',
        locationPlaceholder: 'e.g. Shahuwadi, Kolhapur',
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
      },
      volunteerModal: {
        title: 'Become a Volunteer',
        body: 'Join us on the ground or help us digitally to protect the Sahyadri ecosystem.',
        whyNeed: 'Why We Need You',
        whyNeedText: 'The Sahyadri mountain range is vast and faces continuous threats from illegal deforestation, mining, and unregulated tourism. We need passionate individuals to help monitor these regions, raise awareness, and work together with local communities. Your skills, time, and local knowledge are our most valuable assets in the fight for conservation.',
        howHelp: 'How You Can Help',
        howHelpText: [
          'Ground monitoring & reporting illegal environmental damage',
          'Assisting in native tree plantation & flora restoration',
          'Running digital awareness & social media campaigns',
          'Engaging with local villages to promote sustainable practices',
          'Providing legal, technical, or administrative support'
        ],
        nameLabel: 'Full Name',
        emailLabel: 'Email Address',
        phoneLabel: 'Phone Number',
        locLabel: 'Village / City',
        roleLabel: 'How can you help us the most? (Select Area)',
        roles: [
          { value: '', label: 'Select your focus area...' },
          { value: 'field', label: 'Field Monitoring & Ground Action' },
          { value: 'wildlife', label: 'Wildlife & Biodiversity Monitoring' },
          { value: 'mapping', label: 'GIS Mapping & Evidence Gathering' },
          { value: 'legal', label: 'Legal Research & Documentation' },
          { value: 'rti', label: 'RTI Filing & Data Collection' },
          { value: 'social', label: 'Social Media & Digital Awareness' },
          { value: 'media', label: 'Photography & Documentary Making' },
          { value: 'plantation', label: 'Native Tree Plantation' },
          { value: 'community', label: 'Community Outreach & Engagement' },
          { value: 'campaign', label: 'Organizing Protests & Campaigns' },
          { value: 'fundraising', label: 'Fundraising & Network Building' },
          { value: 'tech', label: 'Technical / IT Support' },
          { value: 'other', label: 'Other/General Volunteering' }
        ],
        skillsLabel: 'Additional details or skills (Optional)',
        confirm: 'Submit Application',
        successTitle: 'Thank You!',
        successBody: 'We have received your details. Our team will contact you soon.'
      }
    },
    mr: {
      nav: { crisis: 'संकट', stats: 'कायदेशीर स्थिती', action: 'कृती करा', nexus: 'जाचा', volunteer: 'स्वयंसेवक' },
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
        locationLabel: 'गाव / तालुका',
        locationPlaceholder: 'उदा. शाहूवाडी, कोल्हापूर',
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
      timeline: {
        title: 'घटनाक्रम आणि कायदेशीर टप्पे',
        subtitle: 'शाहूवाडीतील खाण प्रकल्पांचे प्रस्ताव, मुदत संपलेले परवाने आणि महत्त्वपूर्ण कायदेशीर टप्प्यांचा घटनाक्रम.',
        events: [
          { year: '2008', date: 'ऑगस्ट 2008', title: 'प्राथमिक मान्यता', desc: 'पश्चिम घाटात बॉक्साईट उत्खननासाठी प्राथमिक पर्यावरणीय मंजुरी प्रस्तावित केली गेली होती, ज्यामध्ये पर्यावरणीय सर्वेक्षण अपूर्ण होते.' },
          { year: '2012', date: 'गाडगीळ समिती अहवाल', title: 'WGEEP अहवाल', desc: 'डब्लूजीईईपी (WGEEP) ने शाहूवाडीला इको-सेन्सिटिव्ह झोन १ म्हणून घोषित केले आणि नवीन खाणकामावर बंदी घालण्याची शिफारस केली.' },
          { year: '2023', date: '13 सप्टेंबर 2023', title: 'परळी LoI कालबाह्य', desc: 'परळी बॉक्साईट ब्लॉकचा लेटर ऑफ इंटेंट (LoI) अधिकृतपणे संपुष्टात आला, ज्यामुळे पुढील प्रक्रिया अवैध ठरते.' },
          { year: '2024', date: '12 सप्टेंबर 2024', title: 'घुंगूर-II LoI कालबाह्य', desc: 'घुंगूर-II ब्लॉकचा LoI संपला, ज्यामुळे कंपनीचा खाणकामाचा कायदेशीर अधिकार संपुष्टात आला.' },
          { year: '2025', date: 'अपेक्षित 2025', title: 'घुंगूर-I चे आक्षेप', desc: 'घुंगूर ब्लॉक-१ चा जनसुनावणीत तीव्र विरोध झाला. EIA मधील खोटी माहिती आणि जैवविविधतेची लपवलेली माहिती यावरून मंजुरी धोक्यात आहे.' },
        ]
      },
      share: {
        title: 'ही मोहीम शेअर करा',
        whatsapp: 'WhatsApp वर शेअर करा',
        system: 'लिंक शेअर करा',
        message: 'सह्याद्री व्याघ्र कॉरिडॉरला बेकायदेशीर खाणकामापासून वाचवण्यासाठी मोहिमेत सामील व्हा! कृपया पश्चिम घाट आणि येथील जैवविविधता वाचवण्यासाठी आक्षेप ईमेल पाठवा: '
      },
      investigation: {
        title: 'नेक्सस: नफा विरुद्ध निसर्ग',
        subtitle: 'उच्चस्तरीय राजकारण आणि कॉर्पोरेट हितसंबंध कशा प्रकारे सह्याद्री व्याघ्र कॉरिडॉरचे कायदेशीर संरक्षण काढून घेत आहेत, याचा शोध अहवाल.',
        back: 'मोहिमेवर परत या',
        sections: [
          {
            title: 'व्याघ्र भ्रमणमार्ग वगळण्याचे षडयंत्र',
            body: 'पर्यावरणवाद्यांनी आणि सह्याद्री बचाव संघटनेने राज्य वनविभागाच्या त्या प्रयत्नांचा पर्दाफाश केला आहे, ज्यामध्ये परळी, घुंगुर आणि येळवण जुगाई या गावांना सह्याद्री व्याघ्र संवर्धन आराखड्याबाहेर ठेवण्याचा प्रयत्न केला जात आहे. या सीमा बदलून, हे प्रकल्प जाणीवपूर्वक राष्ट्रीय व्याघ्र संवर्धन प्राधिकरण (NTCA) कडून मिळणारी तपासणी टाळत आहेत.'
          },
          {
            title: 'राजकीय वरदहस्त',
            body: 'स्थानिक राजकीय नेतृत्व, ज्यात आमदार विनय कोरे यांच्या प्रभावाचे निर्देश देणारे अहवाल आहेत, त्यांनी पश्चिम घाटाच्या युनेस्को जागतिक वारसा दर्जापेक्षा खाणकाम "विकासाला" सातत्याने प्राधान्य दिले आहे. कोल्हापूर जिल्ह्यातील शाहूवाडी तालुक्यातील या ३ बॉक्साईड ब्लॉक्सना सोयीचे व्हावे म्हणून पर्यावरण संवेदनशील क्षेत्र (ESZ) कमी करण्यासाठी लॉबिंग केल्याचे दस्तऐवजीकरण झाले आहे.'
          },
          {
            title: 'नफ्याचा उद्देश',
            body: 'परळी, घुंगुर-१ आणि घुंगुर-२ या तिन्ही खाण ब्लॉक्समध्ये हजारो कोटींचे उच्च दर्जाचे बॉक्साईड आहे. श्री मल्हार मिनरल्स, श्री भैरवनाथ अर्थ मूव्हर्स आणि श्री जुगाई मिनरल्स हे प्रवर्तक, त्यांचे लेटर ऑफ इंटेंट (LoI) २०२३ ते २०२५ दरम्यान संपले असूनही, वन आणि पर्यावरण मंजुरी मिळवण्यासाठी आक्रमकपणे प्रयत्न करत आहेत.'
          },
          {
            title: 'पर्यावरणीय घातपात',
            body: 'अधिकृत नोंदी "किमान परिणाम" दर्शवत असल्या तरी, हे भाग राधानगरी आणि गोव्याकडून सह्याद्री व्याघ्र प्रकल्पाकडे जाणाऱ्या वाघांचे दस्तऐवजीकरण केलेले भ्रमणमार्ग आहेत. कॉरिडोर आराखड्यातून हे क्षेत्र वगळणे हा पर्यावरणीय घातपात असून वन्यजीव (संरक्षण) कायदा १९७२ चे उल्लंघन आहे.'
          }
        ]
      },
      gallery: {
        title: 'शासकीय दस्ताऐवज',
        subtitle: '३ वादग्रस्त ब्लॉकमधील कायदेशीर उल्लंघनांचा अधिकृत पुरावा.',
        view: 'कागदपत्र पहा',
        blocks: [
          { name: 'परळी बॉक्साईड ब्लॉक', proponent: 'श्री मल्हार मिनरल्स', status: 'LoI मुदतबाह्य (२०२३)', url: 'https://parivesh.nic.in/newupgrade/#/trackYourProposal/proposal-details?proposalId=SIA%2FMH%2FMIN%2F557966%2F2025&proposal=350503578' },
          { name: 'घुंगुर ब्लॉक-१', proponent: 'श्री भैरवनाथ अर्थ मूव्हर्स', status: 'LoI मुदतबाह्य (२०२५)', url: 'https://parivesh.nic.in/newupgrade/#/trackYourProposal/proposal-details?proposalId=SIA%2FMH%2FMIN%2F544562%2F2025&proposal=131987801' },
          { name: 'घुंगुर ब्लॉक-२', proponent: 'श्री जुगाई मिनरल्स', status: 'LoI मुदतबाह्य (२०२४)', url: 'https://parivesh.nic.in/newupgrade/#/trackYourProposal/proposal-details?proposalId=SIA%2FMH%2FMIN%2F545254%2F2025&proposal=132332846' }
        ],
        externalModal: {
          title: 'सह्याद्री बचाव सोडत आहात?',
          body: 'तुम्ही आता बाह्य सरकारी वेबसाइट (parivesh.nic.in) उघडणार आहात. ही वेबसाइट नवीन टॅबमध्ये उघडेल.',
          cancel: 'मागे फिरा',
          continue: 'पुढे जा'
        }
      },
      legal: {
        title: 'कायदेशीर स्थिती आणि पुरावे',
        subtitle: 'खाण प्रकल्पांना दिलेल्या मंजुरीविरुद्ध दाखल केलेल्या पर्यावरणीय आणि कायदेशीर आक्षेपांचे सविस्तर विश्लेषण.',
        downloadInstructions: 'तुम्ही खाली उल्लंघनांचा सविस्तर गोषवारा वाचू शकता. अधिकृत PDF दस्तऐवज मिळवण्यासाठी डाउनलोड विनंती आवश्यक आहे.',
        downloadBtn: 'PDF डाउनलोड करा',
        back: 'मोहिमेवर परत या',
        dlModal: {
          title: 'कायदेशीर दस्तऐवज डाउनलोड करा',
          body: 'अधिकृत कायदेशीर दस्तऐवज डाउनलोड करण्यासाठी कृपया तुमची माहिती द्या. ही माहिती सुरक्षित ठेवली जाईल.',
          nameLabel: 'पूर्ण नाव',
          emailLabel: 'ईमेल आयडी',
          emailPlaceholder: 'you@example.com',
          locLabel: 'गाव / शहर',
          confirm: 'खात्री करा आणि डाउनलोड करा',
          cancel: 'रद्द करा',
          successTitle: 'डाउनलोड सुरू झाले!',
          successBody: 'तुमचे डाउनलोड लवकरच सुरू होईल. तुम्हाला समन्वयकांना ईमेल द्वारे स्वहस्ते सूचित करायला आवडेल का?',
          adminNotifyFallback: 'ईमेल द्वारे सूचित करा'
        },
        docs: [
          {
            id: 'ghungur-1',
            title: 'घुंगुर बॉक्साईट ब्लॉक-१',
            proponent: 'श्री भैरवनाथ अर्थ मूव्हर्स',
            area: '१४.२४ हेक्टर',
            points: [
              { title: 'कायदेशीर अवैधता (Legal Nullity)', desc: 'लेटर ऑफ इंटेंट (LoI) १२ सप्टेंबर २०२४ रोजी संपुष्टात आला आहे, ज्यामुळे मंजुरीची प्रक्रिया बेकायदेशीर ठरते.' },
              { title: 'चुकीचा EIA अहवाल', desc: 'ज्या ठिकाणाला "पडीक जमीन" म्हटले आहे, तिथे दुर्मिळ पक्षी आणि औषधी वनस्पती आहेत. ही माहिती जाणीवपूर्वक लपवण्यात आली आहे.' },
              { title: 'जनसुनावणीतील त्रुटी', desc: 'स्थानिकांच्या शेकडो आक्षेपांवर कंपनीने अद्याप \'Point-wise Reply\' (मुद्देसूद उत्तर) दिलेले नाही, जे EIA अधिसूचनेचे उल्लंघन आहे.' },
              { title: 'वन्यजीव अधिवासाचे खंडन', desc: 'सदर क्षेत्र वन्यजीवांच्या हालचालीचा मुख्य मार्ग (Wildlife Corridor) आहे, ज्यामुळे वन्यजीव-मानव संघर्ष वाढेल.' }
            ]
          },
          {
            id: 'ghungur-2',
            title: 'घुंगुर बॉक्साईट ब्लॉक-२',
            proponent: 'श्री जुगाई मिनरल्स',
            area: '१३.८६ हेक्टर',
            points: [
              { title: 'कालबाह्य परवाना', desc: 'लेटर ऑफ इंटेंट (LoI) १२ सप्टेंबर २०२४ रोजी संपलेला आहे. या कंपनीकडे आता कोणताही कायदेशीर अधिकार राहिलेला नाही.' },
              { title: 'EIA 2006 चे उल्लंघन', desc: 'जनसुनावणीतील त्रुटींमुळे SEAC/SEIAA ने हा प्रकल्प \'Deferred\' (स्थगित) केला आहे, जी स्थगिती कायमस्वरूपी असणे आवश्यक आहे.' },
              { title: 'जैवविविधता हानी', desc: 'सह्याद्रीतील गवे (Indian Bison) आणि बिबट्यांच्या अधिवासाला धोका निर्माण होईल.' },
              { title: 'जलप्रदूषण आणि पाणीटंचाई', desc: 'उत्खननामुळे लाल माती (Red Mud) नदीत मिसळून पाणी गढूळ होईल आणि नैसर्गिक जलस्त्रोत नष्ट होतील.' }
            ]
          },
          {
            id: 'perli',
            title: 'परळी बॉक्साईड ब्लॉक',
            proponent: 'श्री मल्हार मिनरल्स',
            area: '७.५४ हेक्टर',
            points: [
              { title: 'पश्चिम घाट ESA चे उल्लंघन', desc: 'प्रस्तावित खाण क्षेत्र पश्चिम घाट पर्यावरण संवेदनशील क्षेत्रापासून (ESA) केवळ ०.२ किमी (२०० मीटर) अंतरावर आहे.' },
              { title: 'मुदतबाह्य LoI', desc: '१३ सप्टेंबर २०२३ रोजीच मूळ परवाना (LoI) संपुष्टात आला आहे.' },
              { title: 'वन संवर्धन कायद्याची पायमल्ली', desc: 'संरक्षित वनजमीन असूनही अद्याप \'स्टेज-१\' वन मंजुरी (Forest Clearance) मिळालेली नाही.' },
              { title: 'जलस्रोतांचा नाश', desc: 'डोंगरमाथा (Water Tower) पोखरल्यामुळे पावसाचे पाणी जमिनीत मुरणार नाही, ज्यामुळे ५ गावांवर कायमचे जलसंकट येईल.' }
            ]
          }
        ]
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
      },
      volunteerModal: {
        title: 'स्वयंसेवक व्हा',
        body: 'सह्याद्रीचे रक्षण करण्यासाठी आमच्यात सामील व्हा.',
        whyNeed: 'आम्हाला तुमची गरज का आहे',
        whyNeedText: 'सह्याद्रीची परिसंस्था खूप मोठी आहे आणि बेकायदेशीर जंगलतोड, खाणकाम आणि अनियंत्रित पर्यटनामुळे तिला अनेक धोके आहेत. या क्षेत्रांवर लक्ष ठेवण्यासाठी, जनजागृती करण्यासाठी आणि स्थानिक समुदायाच्या प्रयत्नांना संघटित करण्यासाठी आम्हाला तरुण आणि उत्साही लोकांची गरज आहे.',
        howHelp: 'तुम्ही कशी मदत करू शकता',
        howHelpText: [
          'प्रत्यक्ष पाहणी आणि बेकायदेशीर कृत्यांचा अहवाल देणे',
          'वृक्षारोपण आणि स्थानिक वनस्पतींच्या संवर्धनात मदत करणे',
          'डिजिटल जनजागृती आणि सोशल मीडिया मोहिमा चालवणे',
          'शाश्वत पद्धतींना प्रोत्साहन देण्यासाठी स्थानिक गावांशी संपर्क साधणे',
          'कायदेशीर किंवा तांत्रिक मदत करणे'
        ],
        nameLabel: 'पूर्ण नाव',
        emailLabel: 'ईमेल आयडी',
        phoneLabel: 'फोन नंबर',
        locLabel: 'गाव / शहर',
        roleLabel: 'तुम्ही आम्हाला कशी मदत करू शकता? (क्षेत्र निवडा)',
        roles: [
          { value: '', label: 'तुमचे क्षेत्र निवडा...' },
          { value: 'field', label: 'क्षेत्रीय पाहणी आणि प्रत्यक्ष कृती' },
          { value: 'wildlife', label: 'वन्यजीव आणि जैवविविधता निरीक्षण' },
          { value: 'mapping', label: 'मॅपिंग आणि पुरावे गोळा करणे' },
          { value: 'legal', label: 'कायदेशीर संशोधन आणि दस्तऐवजीकरण' },
          { value: 'rti', label: 'माहिती अधिकार (RTI) आणि डेटा संकलन' },
          { value: 'social', label: 'सोशल मीडिया आणि डिजिटल जनजागृती' },
          { value: 'media', label: 'फोटोग्राफी आणि डॉक्युमेंटरी' },
          { value: 'plantation', label: 'स्थानिक वृक्षारोपण आणि संवर्धन' },
          { value: 'community', label: 'स्थानिक संवाद आणि प्रबोधन' },
          { value: 'campaign', label: 'आंदोलने आणि मोहिमा आयोजित करणे' },
          { value: 'fundraising', label: 'निधी संकलन आणि नेटवर्क उभारणी' },
          { value: 'tech', label: 'तांत्रिक आणि आयटी समर्थन' },
          { value: 'other', label: 'इतर कामे' }
        ],
        skillsLabel: 'इतर कोणतीही माहिती किंवा कौशल्य (पर्यायी)',
        confirm: 'अर्ज सबमिट करा',
        successTitle: 'धन्यवाद!',
        successBody: 'आम्हाला तुमची माहिती मिळाली आहे. आमची टीम लवकरच तुमच्याशी संपर्क साधेल.'
      }
    }
  };

  const l = selectedLanguage ? content[selectedLanguage] : null;

  const recipients = [
    'seiaa.mah@gmail.com', 
    'seiaamaharashtra@gmail.com',
    'mhseac.1@gmail.com',
    'pccfngp@mahaforest.gov.in',
    'envd.mm@nic.in',
    'rokolhapur@mpcb.gov.in',
    'ms-ntca@nic.in',
    'ig-ntca@nic.in',
    'krishnendu.mondal@gov.in',
    'pccfwl@mahaforest.gov.in', 
    'dcf.kolhapur@gmail.com',
    'collector.kolhapur@maharashtra.gov.in'
  ];
  
  const emailData = {
    en: {
      label: 'English Appeal',
      subject: 'Objection: Illegal Bauxite Mining Clearances in Sahyadri Tiger Corridor - Shahuwadi, Kolhapur',
      body: (name: string, location: string) => `To: 
1. The Chairperson, SEIAA & SEAC-1, Maharashtra.
2. The Member Secretary, National Tiger Conservation Authority (NTCA), New Delhi.
3. The Principal Chief Conservator of Forests (Wildlife), Maharashtra.
4. The Secretary, MoEFCC, Regional Office, Nagpur.
5. The District Collector & DCF, Kolhapur.

Subject: Formal Objection Against Environmental/Forest Clearances for 3 Bauxite Mining Projects in Shahuwadi, Kolhapur (Tiger Corridor Zone).

Respected Sir/Madam,

I am writing to register an urgent formal objection against the proposed bauxite mining projects in Shahuwadi Taluka, Kolhapur. These projects are legally untenable and ecologically destructive.

1. Violation of Mineral Concession Rules (Expired LoIs):
The following blocks are proceeding despite having EXPIRED Letters of Intent (LoI):
- Perli Bauxite Block (SIA/MH/MIN/557966/2025): LoI Expired on 13/09/2023.
- Ghungur Block-I (SIA/MH/MIN/544562/2025): LoI Expired on 12/09/2025.
- Ghungur Block-II (SIA/MH/MIN/545254/2025): LoI Expired on 12/09/2024.
As per Rule 10 of MCR 2016, a project loses legal standing once the LoI expires. Granting EC/FC based on lapsed documents is a procedural illegality.

2. Destruction of Sahyadri Tiger Reserve Corridor:
The mining sites fall directly within the critical North-South Tiger Corridor linking Sahyadri Tiger Reserve to the Southern Western Ghats. Any mining here will permanently sever this corridor, violating the Wildlife (Protection) Act, 1972 and the direct oversight of the NTCA.

3. Proximity to Eco-Sensitive Area (ESA):
Specifically, the Perli block is within 0.2 km of the Western Ghats ESA boundary. Mining in this buffer zone will deplete local water tables and destroy endemic biodiversity essential for the survival of the Tiger and Great Indian Hornbill.

Our Demand:
- Immediately reject the EC/FC proposals for Perli, Ghungur-I, and Ghungur-II.
- Halt all illegal surveys and forest clearing in Shahuwadi.
- Ensure the sanctity of the Tiger Conservation Plan (TCP).

Sincerely,
${name || '[Your Name]'}
Citizen & Representative, Sahyadri Bachav Sanghatana
${location || 'Shahuwadi, Kolhapur'}.`,
    },
    mr: {
      label: 'मराठी अपील',
      subject: 'तात्काळ आक्षेप: सह्याद्री व्याघ्र कॉरिडॉरमधील (शाहूवाडी) ३ बेकायदेशीर बॉक्साईड खाण प्रकल्पांना पर्यावरण मंजुरी नाकारण्याबाबत',
      body: (name: string, location: string) => `प्रति,
१. अध्यक्ष/सचिव, SEIAA व SEAC-1, महाराष्ट्र राज्य.
२. सदस्य सचिव, राष्ट्रीय व्याघ्र संवर्धन प्राधिकरण (NTCA), नवी दिल्ली.
३. प्रधान मुख्य वनसंरक्षक (वन्यजीव), महाराष्ट्र राज्य, नागपूर.
४. प्रादेशिक अधिकारी, पर्यावरण व वन मंत्रालय (MoEFCC), नागपूर.
५. जिल्हाधिकारी व उपवनसंरक्षक, कोल्हापूर.

विषय: शाहूवाडी तालुक्यातील ३ प्रस्तावित बेकायदेशीर बॉक्साईट खाण प्रकल्पांना (परळी, घुंगुर) पर्यावरण आणि वन मंजुरी नाकारण्याबाबत फॉर्मल आक्षेप.

महोदय,

मी शाहूवाडी (कोल्हापूर) येथील सजग नागरिक आणि सह्याद्री बचाव मोहिमेचा प्रतिनिधी या पत्राद्वारे शाहूवाडी तालुक्यातील परळी, घुंगुर ब्लॉक-१ आणि घुंगुर ब्लॉक-२ या तीन खाण प्रकल्पांबाबत तीव्र आक्षेप नोंदवत आहे. हे प्रकल्प कायदेशीररीत्या अवैध आणि पर्यावरणीयदृष्ट्या विनाशकारी आहेत.

१. खनिज सवलत नियमांचे उल्लंघन (कालबाह्य LoI):
खालील प्रकल्पांचे 'लेटर ऑफ इंटेंट' (LoI) आधीच संपलेले आहेत:
- परळी बॉक्साईट ब्लॉक (SIA/MH/MIN/557966/2025): १३/०९/२०२३ रोजी मुदत संपली.
- घुंगुर ब्लॉक-१ (SIA/MH/MIN/544562/2025): १२/०९/२०२५ रोजी मुदत संपली.
- घुंगुर ब्लॉक-२ (SIA/MH/MIN/545254/2025): १२/०९/२०२४ रोजी मुदत संपली.
खनिज सवलत नियमांनुसार LoI संपल्यानंतर कोणतीही मंजुरी प्रक्रिया पुढे नेणे बेकायदेशीर आहे.

२. सह्याद्री व्याघ्र कॉरिडॉरचा विनाश:
हे प्रकल्प प्रस्तावित असलेला परिसर सह्याद्री व्याघ्र प्रकल्प आणि दक्षिण पश्चिम घाटांना जोडणारा मुख्य व्याघ्र मार्ग (Tiger Corridor) आहे. खाणकामामुळे हा संवेदनशील मार्ग कायमचा नष्ट होईल, जे वन्यजीव संरक्षण कायदा १९७२ चे थेट उल्लंघन ठरेल.

३. पर्यावरण संवेदनशील क्षेत्राची (ESA) जवळीक:
परळी प्रकल्पाचा परिसर पश्चिम घाट ESA च्या फक्त ०.२ किमी अंतरावर आहे. अशा संवेदनशील क्षेत्रात खाणकाम केल्यास भूजल पातळी घटून येथील अमूल्य जैवविविधता नष्ट होईल.

आमची मागणी:
- परळी, घुंगुर-१ आणि घुंगुर-२ या तिन्ही प्रकल्पांचे EC/FC प्रस्ताव तातडीने फेटाळण्यात यावेत.
- शाहूवाडीतील जंगलातील बेकायदेशीर सर्वेक्षण आणि झाडे तोडणे थांबवावे.
- व्याघ्र संवर्धन आराखड्याचे (TCP) काटेकोरपणे पालन व्हावे.

आपला नम्र,
${name || '[तुमचे नाव]'}
नागरिक व प्रतिनिधी, सह्याद्री बचाव संघटना
${location || 'शाहूवाडी, कोल्हापूर'}.`,
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showToast(
      selectedLanguage === 'mr' 
        ? 'क्लिपबोर्डवर माहिती कॉपी झाली!' 
        : `${field.toUpperCase()} copied to clipboard!`, 
      'success'
    );
    setTimeout(() => setCopiedField(null), 2000);
  };

  const currentEmailData = emailData[activeTab];
  const finalBody = currentEmailData.body(userName, userLocation);
  
  const recipientsStr = recipients.map(r => r.trim()).join(',');
  const encodedSubject = encodeURIComponent(currentEmailData.subject);
  const encodedBody = encodeURIComponent(finalBody.replace(/\n/g, '\r\n'));
  const mailtoUrl = `mailto:${recipientsStr}?subject=${encodedSubject}&body=${encodedBody}`;

  const handleSendAction = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const validateFields = () => {
    let isValid = true;
    setSubmitError('');

    if (!userName.trim()) {
      setNameError(selectedLanguage === 'mr' ? 'अपील पाठवण्यासाठी कृपया तुमचे नाव लिहा.' : 'We need your name to sign the appeal.');
      isValid = false;
    } else if (userName.trim().length < 2) {
      setNameError(selectedLanguage === 'mr' ? 'कृपया तुमचे पूर्ण नाव लिहा (किमान २ अक्षरे).' : 'Please enter your full name (at least 2 letters).');
      isValid = false;
    } else {
      setNameError('');
    }

    if (!userLocation.trim()) {
      setLocationError(selectedLanguage === 'mr' ? 'शासनाला माहिती देण्यासाठी कृपया तुमचे गाव किंवा शहर लिहा.' : 'Please let officials know your village or city.');
      isValid = false;
    } else if (userLocation.trim().length < 2) {
      setLocationError(selectedLanguage === 'mr' ? 'कृपया वैध ठिकाणाचे नाव लिहा (किमान २ अक्षरे).' : 'Please enter a valid location (at least 2 characters).');
      isValid = false;
    } else {
      setLocationError('');
    }

    return isValid;
  };

  const validateDownloadFields = () => {
    let isValid = true;
    setDlError('');

    if (!dlName.trim() || dlName.trim().length < 2) {
      setDlError(selectedLanguage === 'mr' ? 'कृपया तुमचे पूर्ण नाव लिहा (किमान २ अक्षरे).' : 'Please enter your full name.');
      isValid = false;
    } else if (!dlLocation.trim() || dlLocation.trim().length < 2) {
      setDlError(selectedLanguage === 'mr' ? 'कृपया वैध ठिकाणाचे नाव लिहा.' : 'Please enter a valid location.');
      isValid = false;
    } else if (!dlEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dlEmail.trim())) {
      setDlError(selectedLanguage === 'mr' ? 'कृपया वैध ईमेल लिहा.' : 'Please enter a valid email address.');
      isValid = false;
    }

    return isValid;
  };

  const validateVolunteerFields = () => {
    let isValid = true;
    setVolError('');

    if (!volName.trim() || volName.trim().length < 2) {
      setVolError(selectedLanguage === 'mr' ? 'कृपया तुमचे पूर्ण नाव लिहा (किमान २ अक्षरे).' : 'Please enter your full name.');
      isValid = false;
    } else if (!volLocation.trim() || volLocation.trim().length < 2) {
      setVolError(selectedLanguage === 'mr' ? 'कृपया वैध ठिकाणाचे नाव लिहा.' : 'Please enter a valid location.');
      isValid = false;
    } else if (!volEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(volEmail.trim())) {
      setVolError(selectedLanguage === 'mr' ? 'कृपया वैध ईमेल लिहा.' : 'Please enter a valid email address.');
      isValid = false;
    } else if (!volRole) {
      setVolError(selectedLanguage === 'mr' ? 'कृपया मदत करण्याचा मार्ग निवडा.' : 'Please select how you can help.');
      isValid = false;
    }

    return isValid;
  };

  const handleShareSystem = async () => {
    const url = window.location.href;
    const shareData = {
      title: 'Sahyadri Tiger Corridor',
      text: l?.share?.message,
      url: url
    };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(`${l?.share?.message} ${url}`);
      showToast(
        selectedLanguage === 'mr' 
          ? 'मोहिम लिंक क्लिपबोर्डवर कॉपी झाली!' 
          : 'Campaign link copied to clipboard!', 
        'success'
      );
    }
  };

  const handleShareWhatsApp = () => {
    const url = window.location.href;
    const text = encodeURIComponent(`${l?.share?.message} ${url}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleVolunteerSubmit = async () => {
    if (!validateVolunteerFields()) return;
    setIsVolSending(true);
    setVolError('');

    try {
      const volRef = doc(collection(db, 'volunteers'));
      
      // Look up full label for role
      const selectedRoleObj = l?.volunteerModal?.roles?.find((r: any) => r.value === volRole);
      const roleToSave = selectedRoleObj ? selectedRoleObj.label : volRole;

      const batch = writeBatch(db);
      
      batch.set(volRef, {
        timestamp: serverTimestamp(),
        language: activeTab,
        name: volName.trim(),
        location: volLocation.trim(),
        email: volEmail.trim(),
        phone: volPhone.trim(),
        role: roleToSave,
        skills: volSkills.trim()
      });

      const statsRef = doc(db, 'stats', 'global');
      batch.set(statsRef, { 
        volunteerCount: increment(1)
      }, { merge: true });

      await batch.commit();

      // Auto-append to Google Sheets if OAuth is connected
      const currentToken = getSheetsAccessToken() || sheetsToken;
      if (currentToken) {
        try {
          let activeSheetId = gsheetId;
          if (!activeSheetId) {
            activeSheetId = await getOrCreateVolunteerSheet(currentToken);
            setGsheetId(activeSheetId);
          }
          await appendVolunteerToSheet(currentToken, activeSheetId, {
            name: volName.trim(),
            email: volEmail.trim(),
            phone: volPhone.trim(),
            location: volLocation.trim(),
            role: roleToSave,
            skills: volSkills.trim(),
            language: activeTab
          });
        } catch (gsErr) {
          console.warn('Google Sheets background sync failed:', gsErr);
        }
      }

      setVolSuccess(true);
      showToast(
        selectedLanguage === 'mr' 
          ? 'अभिनंदन! तुमचा स्वयंसेवक अर्ज यशस्वीरित्या नोंदवला गेला आहे.' 
          : 'Thank you! Your volunteer application has been recorded.', 
        'success'
      );
      
      // Auto redirect after 3 seconds
      setTimeout(() => {
        if (!isStandaloneVolunteer) {
          navigateTo('main');
        }
        setTimeout(() => {
          setVolSuccess(false);
          setVolName('');
          setVolEmail('');
          setVolPhone('');
          setVolLocation('');
          setVolRole('');
          setVolSkills('');
        }, 500);
      }, 3000);

    } catch (error: any) {
      handleFirestoreError(error, 'handleVolunteerSubmit');
      let defaultMsg = selectedLanguage === 'mr'
        ? 'डेटाबेसशी संपर्क होऊ शकला नाही. कृपया पुन्हा प्रयत्न करा.'
        : 'There was an issue connecting to our servers. Please try again.';
      setVolError(defaultMsg);
    } finally {
      setIsVolSending(false);
    }
  };

  const handleDownloadSubmit = async () => {
    if (!validateDownloadFields() || !downloadingDoc) return;
    setIsSending(true);
    setDlError('');

    try {
      // 1. Log to Firestore
      const dlRef = doc(collection(db, 'downloads'));
      await setDoc(dlRef, {
        timestamp: serverTimestamp(),
        language: activeTab,
        name: dlName.trim(),
        location: dlLocation.trim(),
        email: dlEmail.trim(),
        document: downloadingDoc.id
      });

      // 2. Trigger UI Success View
      setDlSuccess(true);
      showToast(
        selectedLanguage === 'mr' 
          ? 'आक्षेप दस्तऐवज डाऊनलोड सुरू झाला आहे!' 
          : 'Objection document download initiated!', 
        'success'
      );

      // 3. Trigger actual file download
      const link = document.createElement('a');
      link.href = `/documents/${downloadingDoc.id}_objection.pdf`;
      link.download = `${downloadingDoc.id}_objection.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error: any) {
      handleFirestoreError(error, 'handleDownloadSubmit');
      let defaultMsg = selectedLanguage === 'mr'
        ? 'डेटाबेसशी संपर्क होऊ शकला नाही. कृपया पुन्हा प्रयत्न करा.'
        : 'There was an issue connecting to our servers. Please try again.';
      setDlError(defaultMsg);
    } finally {
      setIsSending(false);
    }
  };

  const confirmAndSend = async () => {
    if (!validateFields()) return;
    setIsSending(true);
    setSubmitError('');

    try {
      setSendCount(prev => {
        const next = prev + 1;
        localStorage.setItem('sahyadri_appeal_count', next.toString());
        setChartData(buildChartDistribution(next));
        return next;
      });
      const batch = writeBatch(db);
      
      const statsRef = doc(db, 'stats', 'global');
      batch.set(statsRef, { 
        appealCount: increment(1), 
        lastUpdate: serverTimestamp() 
      }, { merge: true });

      const subRef = doc(collection(db, 'submissions'));
      batch.set(subRef, {
        timestamp: serverTimestamp(),
        language: activeTab,
        location: userLocation
      });

      await batch.commit();
      setHasSent(true);
      setShowSuccess(true);
      showToast(
        selectedLanguage === 'mr' 
          ? 'तुमचा आक्षेप यशस्वीरीत्या नोंदवला गेला! ईमेल उघडत आहे...' 
          : 'Your objection has been logged! Opening email client...', 
        'success'
      );
      
      // Delay opening mailto slightly to allow success UI to be seen
      setTimeout(() => {
        window.location.href = mailtoUrl;
      }, 800);

    } catch (error: any) {
      handleFirestoreError(error, 'confirmAndSend');
      let defaultMsg = selectedLanguage === 'mr' 
        ? 'डेटाबेसशी संपर्क होऊ शकला नाही. परंतु तुम्ही तरीही तुमचा ईमेल तयार करण्यासाठी खालील बटण वापरू शकता.' 
        : 'There was an issue connecting to our servers. However, you can still proceed to generate your email.';
      
      if (error?.message?.includes('permission-denied') || error?.code === 'permission-denied') {
        defaultMsg = selectedLanguage === 'mr' 
          ? 'सुरक्षा त्रुटी: तुम्हाला ही कारवाई करण्याची परवानगी नाही. कृपया पुन्हा प्रयत्न करा.' 
          : 'Security error: You do not have permission to perform this action. Please refresh the page and try again.';
      } else if (error?.message?.includes('offline') || error?.code === 'unavailable') {
        defaultMsg = selectedLanguage === 'mr' 
          ? 'तुमचे इंटरनेट कनेक्शन खंडित झाले आहे. तुमची माहिती ऑफलाइन सेव्ह केली आहे, तुम्ही ईमेल पाठवू शकता.' 
          : 'You seem to be offline. Your support is saved locally, and you can still proceed to your email app.';
      }
      
      setSubmitError(defaultMsg);
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
                <div className="p-2 bg-[#c08b5c]/20 border border-[#c08b5c]/40 rounded-3xl shadow-[0_0_50px_rgba(192,139,92,0.3)]">
                  <img 
                    src={sahyadriLogo} 
                    alt="Sahyadri NGO Logo" 
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-xl" 
                  />
                </div>
                <h2 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-tight">Sahyadri Bachav</h2>
                <span className="text-xs font-bold text-[#c08b5c] uppercase tracking-widest -mt-2">Sahyadri NGO Environmental Protection Campaign</span>
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

      <AnimatePresence mode="wait">
        {activeView === 'main' ? (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >

      {/* External Link Modal */}
      <AnimatePresence>
        {showExternalModal && l && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-6 bg-[#0a1f11]/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-[32px] p-6 sm:p-10 max-w-sm w-full shadow-2xl relative overflow-hidden text-center z-[401]"
            >
              <div className="w-16 h-16 bg-[#c08b5c]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <ExternalLink className="w-8 h-8 text-[#c08b5c]" />
              </div>
              <h3 className="text-2xl font-serif font-black text-[#0a1f11] mb-3">{l.gallery.externalModal.title}</h3>
              <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                {l.gallery.externalModal.body}
              </p>
              
              <div className="flex flex-col gap-3">
                <a 
                  href={pendingExternalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowExternalModal(false)}
                  className="w-full py-4 bg-[#c08b5c] text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#a67448] transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {l.gallery.externalModal.continue} <ExternalLink className="w-3 h-3" />
                </a>
                <button 
                  onClick={() => setShowExternalModal(false)}
                  className="w-full py-4 bg-gray-100 text-gray-500 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-200 transition-all block"
                >
                  {l.gallery.externalModal.cancel}
                </button>
              </div>
            </motion.div>
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
                      {submitError && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium text-left border border-red-100 flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                          <p>{submitError}</p>
                        </motion.div>
                      )}
                      
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-[#c08b5c] mb-2">{l?.modal?.label}</label>
                        <input 
                          type="text" 
                          value={userName}
                          onChange={(e) => {
                            setUserName(e.target.value);
                            if (nameError) setNameError('');
                          }}
                          placeholder={l?.modal?.placeholder}
                          autoFocus
                          disabled={isSending}
                          className={`w-full px-6 py-4 bg-[#f9f7f2] border rounded-xl focus:outline-none focus:ring-4 transition-all font-bold text-[#0a1f11] disabled:opacity-50 ${nameError ? 'border-red-400 focus:border-red-500 focus:ring-red-400/10' : 'border-gray-200 focus:border-[#c08b5c] focus:ring-[#c08b5c]/10'}`}
                        />
                        {nameError && (
                          <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs font-bold mt-2 text-left">
                            {nameError}
                          </motion.p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-[#c08b5c] mb-2">{l?.modal?.locationLabel}</label>
                        <input 
                          type="text" 
                          value={userLocation}
                          onChange={(e) => {
                            setUserLocation(e.target.value);
                            if (locationError) setLocationError('');
                          }}
                          placeholder={l?.modal?.locationPlaceholder}
                          disabled={isSending}
                          className={`w-full px-6 py-4 bg-[#f9f7f2] border rounded-xl focus:outline-none focus:ring-4 transition-all font-bold text-[#0a1f11] disabled:opacity-50 ${locationError ? 'border-red-400 focus:border-red-500 focus:ring-red-400/10' : 'border-gray-200 focus:border-[#c08b5c] focus:ring-[#c08b5c]/10'}`}
                        />
                        {locationError && (
                          <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs font-bold mt-2 text-left">
                            {locationError}
                          </motion.p>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={submitError ? () => { window.location.href = mailtoUrl; setShowConfirmModal(false); } : confirmAndSend}
                          disabled={!userName.trim() || !userLocation.trim() || isSending}
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
                          ) : submitError ? (selectedLanguage === 'mr' ? 'तरीही ईमेल पाठवा' : 'Send Email Anyway') : l?.modal?.confirm}
                        </motion.button>
                        {!isSending && (
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { setShowConfirmModal(false); setSubmitError(''); }}
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

      {/* Navigation */}
      {!(activeView === 'legal' || activeView === 'volunteer') && (
        <div className="fixed top-0 left-0 right-0 z-[100] px-4 pt-4 sm:pt-6 pointer-events-none">
          <nav className="max-w-5xl mx-auto pointer-events-auto flex justify-between items-center bg-[#0a1f11]/80 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-full py-2.5 px-3 sm:px-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-2 sm:gap-6">
              <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity pl-1 sm:pl-2" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <img 
                  src={sahyadriLogo} 
                  alt="Sahyadri NGO Logo" 
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-[#c08b5c]/60 shadow-md shrink-0" 
                />
                <div className="flex flex-col">
                  <span className="font-serif font-black text-white tracking-tight text-sm sm:text-lg leading-tight">
                    Sahyadri Bachav
                  </span>
                  <span className="text-[9px] text-[#c08b5c] font-black uppercase tracking-wider hidden sm:block -mt-0.5">
                    Sahyadri NGO
                  </span>
                </div>
              </div>
              
              <div className="h-4 w-px bg-white/10 hidden sm:block"></div>

              <button 
                onClick={() => navigateTo('legal')}
                className="text-[10px] sm:text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-white/70 hover:text-[#c08b5c] px-3 py-2 rounded-full hover:bg-white/5 transition-all hidden sm:block"
              >
                {selectedLanguage === 'mr' ? 'कायदेशीर स्थिती' : 'Legal'}
              </button>
              <button 
                onClick={() => navigateTo('investigation')}
                className="text-[10px] sm:text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-white/70 hover:text-[#c08b5c] px-3 py-2 rounded-full hover:bg-white/5 transition-all hidden sm:block"
              >
                {l?.nav?.nexus}
              </button>
              <button 
                onClick={() => navigateTo('volunteer')}
                className="text-[10px] sm:text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-[#c08b5c] hover:text-white px-3 py-2 rounded-full hover:bg-white/5 transition-all hidden lg:block border border-[#c08b5c]/30"
              >
                {l?.nav?.volunteer}
              </button>
            </div>

            <button 
              onClick={() => setSelectedLanguage(selectedLanguage === 'en' ? 'mr' : 'en')}
              className="px-4 py-2 border border-white/10 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#c08b5c] hover:bg-white/10 transition-all flex items-center gap-2 bg-white/5 whitespace-nowrap shadow-sm"
            >
              {selectedLanguage === 'en' ? 'मराठी' : 'English'}
            </button>
          </nav>
        </div>
      )}



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
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#c08b5c]/10 border border-[#c08b5c]/30 rounded-full">
                  <img 
                    src={sahyadriLogo} 
                    alt="Sahyadri NGO" 
                    className="w-4 h-4 rounded-full object-cover shrink-0" 
                  />
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-[#c08b5c]">{l?.hero?.alert} • Sahyadri NGO</span>
                </div>
                <div className="w-6 sm:w-16 h-px bg-[#c08b5c]/30" />
              </div>
              <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem] font-serif font-black text-white leading-[1] sm:leading-[0.8] mb-8 sm:mb-12 tracking-tight">
                {l?.hero?.title?.split(' ')[0]} <br className="hidden sm:block"/><span className="text-[#c08b5c]">{l?.hero?.title?.split(' ')[1]}</span>
              </h1>

              {/* Momentum Counter */}
              <div className="flex flex-col items-center mb-10 sm:mb-14 w-full">
                <div className="px-6 py-6 bg-[#c08b5c]/10 border border-[#c08b5c]/20 rounded-3xl flex flex-col items-center gap-4 w-full max-w-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0a1f11] overflow-hidden relative z-10">
                          <img src={`https://picsum.photos/seed/person${i}/100/100`} alt="Supporter" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                    <div className="text-left">
                      <span className="block text-[#c08b5c] font-black text-2xl leading-none">
                        {sendCount.toLocaleString()}
                      </span>
                      <span className="block text-white/40 text-[10px] uppercase tracking-widest font-bold mt-1">
                        {l?.impact?.label}
                      </span>
                    </div>
                  </div>

                  {/* Animated Bar Chart */}
                  <div ref={chartRef} className="w-full h-[140px] mt-2">
                    {isChartInView && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                          <Tooltip 
                            cursor={{fill: 'rgba(255,255,255,0.02)'}} 
                            contentStyle={{ backgroundColor: '#0a1f11', border: '1px solid rgba(192,139,92,0.3)', borderRadius: '12px', fontSize: '12px' }}
                            itemStyle={{ color: '#c08b5c', fontWeight: 'bold' }}
                            labelStyle={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', marginBottom: '4px' }}
                          />
                          <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                          <Bar dataKey="appeals" radius={[4, 4, 0, 0]} isAnimationActive={true}>
                            <LabelList dataKey="appeals" position="top" fill="rgba(255,255,255,0.7)" fontSize={11} fontWeight="black" offset={8} />
                            { chartData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={index === 3 ? '#c08b5c' : '#c08b5c55'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
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
                <button 
                  onClick={() => navigateTo('volunteer')}
                  className="w-full sm:w-auto px-10 py-5 sm:py-6 bg-transparent border-2 border-[#c08b5c] text-[#c08b5c] rounded-full font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs hover:bg-[#c08b5c]/10 transition-all flex items-center justify-center gap-3"
                >
                  {l?.nav?.volunteer}
                </button>
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

      {/* Document Gallery Section */}
      <section className="py-24 px-6 bg-white overflow-hidden scroll-mt-20">
        <div className="max-w-7xl mx-auto shadow-[0_40px_100px_rgba(0,0,0,0.03)] border border-gray-100 rounded-[3rem] p-8 sm:p-20 relative bg-white">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
            <Landmark className="w-64 h-64 text-[#0a1f11]" />
          </div>
          
          <div className="relative z-10 grid lg:grid-cols-12 gap-16 items-start">
            <div className="lg:col-span-5 space-y-8">
              <div className="space-y-4">
                <span className="font-black text-[10px] uppercase tracking-[0.4em] text-[#c08b5c] block">{l?.gallery?.title}</span>
                <h2 className="text-4xl sm:text-6xl font-serif font-black text-[#0a1f11] leading-tight">{l?.gallery?.title}</h2>
              </div>
              <p className="text-lg text-gray-500 leading-relaxed font-light">
                {l?.gallery?.subtitle}
              </p>
              
              <div className="hidden lg:block pt-8 border-t border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#c08b5c]/10 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-[#c08b5c]" />
                  </div>
                  <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                    All documents sourced from the Directorate of Geology and Mining, Government of Maharashtra.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 grid gap-6">
              {l?.gallery?.blocks?.map((block: any, idx: number) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="group bg-[#f9f7f2] hover:bg-white border border-transparent hover:border-[#c08b5c]/30 p-6 sm:p-8 rounded-[2rem] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                >
                  <div className="flex items-start gap-5">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-100 group-hover:bg-[#c08b5c] transition-all">
                      <Copy className="w-5 h-5 text-[#c08b5c] group-hover:text-white transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xl font-serif font-black text-[#0a1f11]">{block.name}</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-[#c08b5c] transition-colors">{block.proponent}</p>
                      <div className="flex items-center gap-2 pt-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-500">{block.status}</span>
                      </div>
                    </div>
                  </div>
                  
                  <a 
                    href={block.url}
                    onClick={(e) => {
                      e.preventDefault();
                      setPendingExternalUrl(block.url);
                      setShowExternalModal(true);
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#0a1f11] hover:bg-[#0a1f11] hover:text-white transition-all shadow-sm"
                  >
                    {l?.gallery?.view} <ExternalLink className="w-3 h-3" />
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-24 px-6 bg-white overflow-hidden relative">
        <div className="max-w-5xl mx-auto space-y-16">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center space-y-4"
          >
            <h2 className="text-4xl sm:text-6xl font-serif font-black text-[#0a1f11] leading-tight">{l?.timeline?.title}</h2>
            <p className="text-lg text-gray-500 leading-relaxed font-light max-w-2xl mx-auto">
              {l?.timeline?.subtitle}
            </p>
          </motion.div>
          
          <div className="relative border-l border-gray-200 ml-4 sm:ml-8 space-y-12 pb-8">
            {l?.timeline?.events?.map((event: any, idx: number) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30, x: -20 }}
                whileInView={{ opacity: 1, y: 0, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
                className="relative pl-8 sm:pl-12"
              >
                <div className="absolute top-0 left-0 -translate-x-1/2 w-4 h-4 rounded-full bg-[#c08b5c] border-4 border-white shadow-sm" />
                <div className="bg-[#f9f7f2] hover:bg-white border border-transparent hover:border-[#c08b5c]/30 transition-all p-6 sm:p-8 rounded-3xl -mt-4 group shadow-sm hover:shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 mb-4">
                    <span className="text-2xl font-black font-serif text-[#0a1f11] group-hover:text-[#c08b5c] transition-colors">{event.year}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#c08b5c]">{event.date}</span>
                  </div>
                  <h4 className="text-xl font-bold text-[#0a1f11] mb-3">{event.title}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{event.desc}</p>
                </div>
              </motion.div>
            ))}
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

      {/* Share Section */}
      <section id="share" className="py-20 px-6 bg-[#1b4332] text-white">
        <div className="max-w-4xl mx-auto text-center space-y-10">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-5xl font-serif font-black">{l?.share?.title}</h2>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleShareWhatsApp}
              className="w-full sm:w-auto px-8 py-4 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-full font-bold uppercase tracking-wide flex items-center justify-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-lg"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {l?.share?.whatsapp}
            </button>
            <button
              onClick={handleShareSystem}
              className="w-full sm:w-auto px-8 py-4 bg-white text-[#1b4332] rounded-full font-bold uppercase tracking-wide flex items-center justify-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-lg"
            >
              <Share2 className="w-6 h-6" />
              {l?.share?.system}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a1f11] py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <img 
                src={sahyadriLogo} 
                alt="Sahyadri NGO Logo" 
                className="w-11 h-11 rounded-full object-cover border border-[#c08b5c]/50 shadow-md shrink-0" 
              />
              <div>
                <span className="font-serif font-black text-white text-3xl tracking-tight block leading-none">Sahyadri Bachav</span>
                <span className="text-[10px] text-[#c08b5c] font-black uppercase tracking-widest block mt-1">Sahyadri NGO Environmental Initiative</span>
              </div>
            </div>
            <p className="text-white/40 text-sm max-w-sm tracking-wide leading-relaxed">
              {l?.footer?.about}
            </p>
          </div>
          
          <div className="text-right space-y-4">
            <button 
              onClick={() => navigateTo('investigation')}
              className="block w-full text-right text-white/60 font-black text-[10px] uppercase tracking-widest hover:text-[#c08b5c] transition-colors mb-2"
            >
              {l?.nav?.nexus}
            </button>
            <a href="#" className="block text-[#c08b5c] font-black text-xs uppercase tracking-widest hover:text-white transition-colors">{l?.footer?.top}</a>
            <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-sans">© 2026 सह्याद्री बचाव संघटना</p>
          </div>
        </div>
      </footer>
        </motion.div>
      ) : activeView === 'investigation' ? (
          <motion.div
            key="investigation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen bg-[#fcfcfc] pb-24"
          >
            <nav className="sticky top-0 z-[100] bg-white border-b border-gray-100 px-6 py-6 font-sans">
              <div className="max-w-5xl mx-auto flex items-center justify-between">
                <button 
                  onClick={() => navigateTo('main')}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#0a1f11] transition-all"
                >
                  ← {l?.investigation?.back || 'Back'}
                </button>
                <div className="flex items-center gap-2">
                  <img 
                    src={sahyadriLogo} 
                    alt="Sahyadri NGO" 
                    className="w-6 h-6 rounded-full object-cover border border-[#1b4332]" 
                  />
                  <span className="font-serif font-black text-sm text-[#0a1f11]">Investigation Board • Sahyadri NGO</span>
                </div>
              </div>
            </nav>

            <div className="max-w-5xl mx-auto px-6 pt-24 space-y-24">
              <div className="space-y-6 text-center max-w-3xl mx-auto">
                <span className="text-[10px] font-black uppercase tracking-[0.6em] text-[#c08b5c]">Investigative Report</span>
                <h1 className="text-5xl sm:text-7xl font-serif font-black text-[#0a1f11] leading-tight">{l?.investigation?.title}</h1>
                <p className="text-xl text-gray-500 font-light leading-relaxed">
                  {l?.investigation?.subtitle}
                </p>
              </div>

              {/* Eco-Sensitive Zone Map Visual */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-[#1b4332] rounded-[3rem] p-8 sm:p-12 relative overflow-hidden shadow-[0_40px_100px_rgba(27,67,50,0.15)]"
              >
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat"></div>
                
                <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center">
                  <div className="lg:w-1/3 space-y-6">
                    <h3 className="text-3xl font-serif font-black text-white">Shahuwadi Eco-Sensitive Zone</h3>
                    <p className="text-white/70 font-light leading-relaxed text-sm">
                      A visual representation of the critical Sahyadri Tiger Corridor and the encroachment of the 3 disputed bauxite mining blocks.
                    </p>
                    
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border-2 border-emerald-400 bg-emerald-400/20"></div>
                        <span className="text-xs font-black uppercase tracking-wider text-white/80">Protected Corridor</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded bg-red-500 animate-pulse"></div>
                        <span className="text-xs font-black uppercase tracking-wider text-white/80">Threatened Block</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-white"></div>
                        <span className="text-xs font-black uppercase tracking-wider text-white/80">Reference Point</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="lg:w-2/3 w-full h-[400px] relative bg-[#0a1f11] rounded-[2rem] border border-white/10 overflow-hidden shadow-inner">
                    {/* Abstract Topography / Tiger Corridor */}
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 400">
                      <path d="M0,150 C150,200 300,50 450,150 C600,250 700,50 800,100 L800,400 L0,400 Z" fill="#143425" opacity="0.5" />
                      <path d="M0,250 C200,300 400,100 600,250 C750,350 800,250 800,250 L800,400 L0,400 Z" fill="#1b4332" opacity="0.8" />
                      <path d="M-50,200 C150,100 350,350 500,250 C700,100 850,200 850,200" fill="none" stroke="#34d399" strokeWidth="40" strokeLinecap="round" opacity="0.15" className="blur-sm" />
                      <path d="M-50,200 C150,100 350,350 500,250 C700,100 850,200 850,200" fill="none" stroke="#34d399" strokeWidth="8" strokeLinecap="round" strokeDasharray="10 20" opacity="0.6" />
                    </svg>

                    {/* Mining Blocks */}
                    <div className="absolute top-[30%] left-[25%] lg:left-[35%] group">
                      <div className="w-12 h-12 bg-red-500/20 border-2 border-red-500 rounded-lg animate-pulse absolute -translate-x-1/2 -translate-y-1/2"></div>
                      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/80 px-3 py-1 rounded text-[9px] font-black uppercase tracking-wider text-red-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">Perli Block</div>
                    </div>
                    
                    <div className="absolute top-[60%] left-[40%] lg:left-[55%] group">
                      <div className="w-16 h-14 bg-red-500/20 border-2 border-red-500 rounded-lg animate-pulse absolute -translate-x-1/2 -translate-y-1/2 rotate-12"></div>
                      <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-black/80 px-3 py-1 rounded text-[9px] font-black uppercase tracking-wider text-red-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">Ghungur Block-I</div>
                    </div>

                    <div className="absolute top-[50%] left-[65%] lg:left-[75%] group">
                      <div className="w-14 h-16 bg-red-500/20 border-2 border-red-500 rounded-lg animate-pulse absolute -translate-x-1/2 -translate-y-1/2 -rotate-6"></div>
                      <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-black/80 px-3 py-1 rounded text-[9px] font-black uppercase tracking-wider text-red-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">Ghungur Block-II</div>
                    </div>

                    {/* Reference Points */}
                    <div className="absolute top-[15%] left-[70%] flex items-center gap-2 group">
                      <div className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                      <span className="text-[10px] font-medium text-white/50 group-hover:text-white transition-colors cursor-default">Sahyadri Tiger Reserve Boundary</span>
                    </div>

                    <div className="absolute bottom-[10%] left-[10%] flex items-center gap-2 group">
                      <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                      <span className="text-[10px] font-medium text-white/50 group-hover:text-white transition-colors cursor-default">Shahuwadi Town</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="grid gap-8">
                {l?.investigation?.sections?.map((section: any, idx: number) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                    className="group bg-white border border-gray-100 p-10 sm:p-16 rounded-[4rem] shadow-[0_30px_80px_rgba(0,0,0,0.02)] hover:shadow-[0_40px_100px_rgba(0,0,0,0.04)] transition-all"
                  >
                    <div className="flex flex-col sm:flex-row gap-12 items-start">
                      <div className="w-16 h-16 bg-[#f9f7f2] rounded-3xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#c08b5c] transition-all">
                        <span className="text-xl font-serif font-black text-[#c08b5c] group-hover:text-white">0{idx + 1}</span>
                      </div>
                      <div className="space-y-8">
                        <h3 className="text-3xl sm:text-4xl font-serif font-black text-[#0a1f11] leading-tight">{section.title}</h3>
                        <p className="text-lg text-gray-500 leading-relaxed font-light first-letter:text-4xl first-letter:font-serif first-letter:font-black first-letter:text-[#c08b5c] first-letter:mr-2">
                          {section.body}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="p-12 bg-[#0a1f11] rounded-[4rem] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10">
                  <AlertTriangle className="w-48 h-48" />
                </div>
                <div className="relative z-10 space-y-6 max-w-xl">
                  <h4 className="text-3xl font-serif font-black">Call for Accountability</h4>
                  <p className="text-gray-400 font-light leading-relaxed">
                    We urge the Ministry of Environment, Forest and Climate Change (MoEFCC) and the NBWL to investigate these artificial boundary shifts designed to favor mining proponents over protected species.
                  </p>
                  <button 
                    onClick={() => navigateTo('main')}
                    className="px-8 py-4 bg-white text-[#0a1f11] rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#c08b5c] hover:text-white transition-all shadow-xl shadow-black/20"
                  >
                    Join the Resistance
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
      ) : activeView === 'volunteer' ? (
          <motion.div
            key="volunteer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen bg-[#fcfcfc] pb-24"
          >
            <nav className="sticky top-0 z-[100] bg-white border-b border-gray-100 px-6 py-6 font-sans">
              <div className="max-w-5xl mx-auto flex items-center justify-between">
                {isStandaloneVolunteer ? (
                  <a 
                    href="https://savesahyadri.in"
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#0a1f11] transition-all no-underline"
                  >
                    ← {l?.legal?.back || 'Back'}
                  </a>
                ) : (
                  <button 
                    onClick={() => navigateTo('main')}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#0a1f11] transition-all"
                  >
                    ← {l?.legal?.back || 'Back'}
                  </button>
                )}
                <div className="flex items-center gap-4">
                  {isStandaloneVolunteer && (
                    <button 
                      onClick={() => setSelectedLanguage(selectedLanguage === 'en' ? 'mr' : 'en')}
                      className="px-3 py-1 border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-widest text-[#c08b5c] hover:bg-gray-50 transition-all"
                    >
                      {selectedLanguage === 'en' ? 'मराठी' : 'English'}
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <img 
                      src={sahyadriLogo} 
                      alt="Sahyadri NGO" 
                      className="w-6 h-6 rounded-full object-cover border border-[#1b4332]" 
                    />
                    <span className="font-serif font-black text-sm text-[#0a1f11]">{l?.volunteerModal?.title} • Sahyadri NGO</span>
                  </div>
                </div>
              </div>
            </nav>

            <div className="max-w-5xl mx-auto px-6 pt-12 grid md:grid-cols-2 gap-10 items-start">
              
              <div className="space-y-10 mt-4 md:mt-8">
                <div>
                  <h3 className="text-2xl font-serif font-black text-[#0a1f11] mb-4">{l?.volunteerModal?.whyNeed}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {l?.volunteerModal?.whyNeedText}
                  </p>
                </div>

                <div>
                  <h3 className="text-2xl font-serif font-black text-[#0a1f11] mb-5">{l?.volunteerModal?.howHelp}</h3>
                  <ul className="space-y-4">
                    {l?.volunteerModal?.howHelpText?.map((text: string, i: number) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 mt-0.5 rounded-full bg-[#1b4332]/10 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 text-[#1b4332]" />
                        </div>
                        <span className="text-gray-600 text-sm leading-relaxed">{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-[32px] p-6 sm:p-10 shadow-xl border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                  <Leaf className="w-32 h-32 text-[#0a1f11]" />
                </div>
                
                <div className="relative z-10 text-center sm:text-left h-full">
                  {!volSuccess ? (
                    <>
                      <h3 className="text-3xl font-serif font-black text-[#0a1f11] mb-2">{l?.volunteerModal?.title}</h3>
                      <p className="text-gray-500 mb-8 leading-relaxed text-sm">
                        {l?.volunteerModal?.body}
                      </p>
                      
                      {volCount > 0 && (
                        <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-[#c08b5c]/10 text-[#c08b5c] rounded-full text-xs font-bold uppercase tracking-wider">
                          <Users className="w-4 h-4" />
                          {volCount} {selectedLanguage === 'mr' ? 'इतर नागरिक मोहिमेत जोडले गेले आहेत' : (volCount === 1 ? 'other has joined the fight' : 'others have joined the fight')}
                        </div>
                      )}
                      
                      <div className="space-y-4 pr-2">
                        {volError && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium text-left border border-red-100 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                            <p>{volError}</p>
                          </motion.div>
                        )}
                        
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-[#c08b5c] mb-2">{l?.volunteerModal?.nameLabel}</label>
                          <input 
                            type="text" 
                            value={volName}
                            onChange={(e) => { setVolName(e.target.value); setVolError(''); }}
                            disabled={isVolSending}
                            className="w-full px-5 py-3.5 bg-[#f9f7f2] border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:border-[#c08b5c] focus:ring-[#c08b5c]/10 transition-all font-bold text-[#0a1f11]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-[#c08b5c] mb-2">{l?.volunteerModal?.emailLabel}</label>
                          <input 
                            type="email" 
                            value={volEmail}
                            onChange={(e) => { setVolEmail(e.target.value); setVolError(''); }}
                            disabled={isVolSending}
                            className="w-full px-5 py-3.5 bg-[#f9f7f2] border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:border-[#c08b5c] focus:ring-[#c08b5c]/10 transition-all font-bold text-[#0a1f11]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-[#c08b5c] mb-2">{l?.volunteerModal?.phoneLabel}</label>
                          <input 
                            type="tel" 
                            value={volPhone}
                            onChange={(e) => { setVolPhone(e.target.value); setVolError(''); }}
                            disabled={isVolSending}
                            className="w-full px-5 py-3.5 bg-[#f9f7f2] border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:border-[#c08b5c] focus:ring-[#c08b5c]/10 transition-all font-bold text-[#0a1f11]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-[#c08b5c] mb-2">{l?.volunteerModal?.locLabel}</label>
                          <input 
                            type="text" 
                            value={volLocation}
                            onChange={(e) => { setVolLocation(e.target.value); setVolError(''); }}
                            disabled={isVolSending}
                            className="w-full px-5 py-3.5 bg-[#f9f7f2] border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:border-[#c08b5c] focus:ring-[#c08b5c]/10 transition-all font-bold text-[#0a1f11]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-[#c08b5c] mb-2">{l?.volunteerModal?.roleLabel}</label>
                          <div className="relative">
                            <select
                              value={volRole}
                              onChange={(e) => { setVolRole(e.target.value); setVolError(''); }}
                              disabled={isVolSending}
                              className="w-full px-5 py-3.5 bg-[#f9f7f2] border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:border-[#c08b5c] focus:ring-[#c08b5c]/10 transition-all font-bold text-[#0a1f11] appearance-none"
                            >
                              {l?.volunteerModal?.roles?.map((role: any) => (
                                <option key={role.value} value={role.value} disabled={role.value === ''}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-gray-500">
                              <ChevronRight className="w-4 h-4 rotate-90" />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-[#c08b5c] mb-2">{l?.volunteerModal?.skillsLabel}</label>
                          <textarea 
                            value={volSkills}
                            onChange={(e) => { setVolSkills(e.target.value); setVolError(''); }}
                            disabled={isVolSending}
                            rows={3}
                            className="w-full px-5 py-3.5 bg-[#f9f7f2] border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:border-[#c08b5c] focus:ring-[#c08b5c]/10 transition-all font-bold text-[#0a1f11] resize-none"
                          />
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleVolunteerSubmit}
                            disabled={!volName.trim() || !volLocation.trim() || !volEmail.trim() || !volRole || isVolSending}
                            className="flex-1 py-4 bg-[#1b4332] text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#0a1f11] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-3"
                          >
                            {isVolSending ? (
                              <>
                                <motion.div 
                                  animate={{ rotate: 360 }}
                                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                />
                                {l?.modal?.sending}
                              </>
                            ) : l?.volunteerModal?.confirm}
                          </motion.button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="py-12 text-center"
                    >
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
                          <Check className="w-10 h-10 text-green-600" />
                        </motion.div>
                      </div>
                      <h3 className="text-3xl font-serif font-black text-[#0a1f11] mb-4">{l?.volunteerModal?.successTitle}</h3>
                      <p className="text-gray-500 mb-8 leading-relaxed max-w-sm mx-auto text-sm">
                        {l?.volunteerModal?.successBody}
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
      ) : activeView === 'legal' ? (
          <motion.div
            key="legal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen bg-[#fcfcfc] pb-24"
          >
            <nav className="sticky top-0 z-[100] bg-white border-b border-gray-100 px-6 py-6 font-sans">
              <div className="max-w-5xl mx-auto flex items-center justify-between">
                {isStandaloneLegal ? (
                  <a 
                    href="https://savesahadri.in"
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#0a1f11] transition-all no-underline"
                  >
                    ← {l?.legal?.back || 'Back'}
                  </a>
                ) : (
                  <button 
                    onClick={() => navigateTo('main')}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#0a1f11] transition-all"
                  >
                    ← {l?.legal?.back || 'Back'}
                  </button>
                )}
                <div className="flex items-center gap-4">
                  {isStandaloneLegal && (
                    <button 
                      onClick={() => setSelectedLanguage(selectedLanguage === 'en' ? 'mr' : 'en')}
                      className="px-3 py-1 border border-gray-200 rounded-full text-[10px] font-black uppercase tracking-widest text-[#c08b5c] hover:bg-gray-50 transition-all"
                    >
                      {selectedLanguage === 'en' ? 'मराठी' : 'English'}
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <img 
                      src={sahyadriLogo} 
                      alt="Sahyadri NGO" 
                      className="w-6 h-6 rounded-full object-cover border border-[#c08b5c]" 
                    />
                    <span className="font-serif font-black text-sm text-[#0a1f11]">{l?.legal?.title} • Sahyadri NGO</span>
                  </div>
                </div>
              </div>
            </nav>

            <div className="max-w-5xl mx-auto px-6 pt-24 space-y-24">
              <div className="space-y-6 text-center max-w-3xl mx-auto">
                <span className="text-[10px] font-black uppercase tracking-[0.6em] text-[#c08b5c]">Government Evidence</span>
                <h1 className="text-5xl sm:text-7xl font-serif font-black text-[#0a1f11] leading-tight">{l?.legal?.title}</h1>
                <p className="text-xl text-gray-500 font-light leading-relaxed">
                  {l?.legal?.subtitle}
                </p>
                <p className="text-sm font-bold text-[#c08b5c] bg-[#f9f7f2] inline-block px-4 py-2 rounded-xl mt-4">
                  {l?.legal?.downloadInstructions}
                </p>
              </div>

              <div className="grid gap-12">
                {l?.legal?.docs?.map((docData: any, idx: number) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-white border border-gray-100 p-8 sm:p-12 rounded-[3xl] sm:rounded-[4rem] shadow-sm relative overflow-hidden"
                  >
                    <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-center border-b border-gray-100 pb-8 mb-8">
                      <div>
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <span className="px-3 py-1 bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-widest rounded-full">Rejected / Void</span>
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-full">{docData.area}</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#0a1f11]">{docData.title}</h2>
                        <p className="text-gray-400 font-black uppercase tracking-widest text-xs mt-2">{docData.proponent}</p>
                      </div>
                      
                      <button 
                        onClick={() => {
                          setDownloadingDoc(docData);
                          setDlSuccess(false);
                          setShowDownloadModal(true);
                        }}
                        className="w-full md:w-auto px-8 py-4 bg-[#0a1f11] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#c08b5c] transition-all flex items-center justify-center gap-3 flex-shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" /> {l?.legal?.downloadBtn}
                      </button>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-8">
                      {docData.points.map((pt: any, ptIdx: number) => (
                        <div key={ptIdx} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-[#f9f7f2] flex items-center justify-center text-[#c08b5c] font-black text-xs font-serif">
                              {ptIdx + 1}
                            </span>
                            <h4 className="font-bold text-[#0a1f11] text-lg">{pt.title}</h4>
                          </div>
                          <p className="text-gray-500 text-sm leading-relaxed pl-11">{pt.desc}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Global Download Modal */}
      <AnimatePresence>
        {showDownloadModal && l?.legal && downloadingDoc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 bg-[#0a1f11]/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-[32px] p-6 sm:p-12 max-w-lg w-full shadow-2xl relative overflow-hidden z-[501]"
            >
              <button 
                onClick={() => setShowDownloadModal(false)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-3 text-gray-400 hover:text-[#0a1f11] hover:bg-gray-100 rounded-full transition-all z-20"
              >
                <X className="w-6 h-6 sm:w-5 sm:h-5" />
              </button>

              <div className="absolute top-0 right-0 p-8 opacity-5">
                <ExternalLink className="w-24 h-24 text-[#0a1f11]" />
              </div>
              
              <div className="relative z-10 text-center sm:text-left">
                {!dlSuccess ? (
                  <>
                    <h3 className="text-3xl font-serif font-black text-[#0a1f11] mb-2">{l.legal.dlModal.title}</h3>
                    <p className="text-[#c08b5c] font-black text-xs tracking-widest uppercase mb-4">{downloadingDoc.title}</p>
                    <p className="text-gray-500 mb-8 leading-relaxed text-sm">
                      {l.legal.dlModal.body}
                    </p>
                    
                    <div className="space-y-5">
                      {dlError && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium text-left border border-red-100 flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                          <p>{dlError}</p>
                        </motion.div>
                      )}
                      
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-[#c08b5c] mb-2">{l.legal.dlModal.nameLabel}</label>
                        <input 
                          type="text" 
                          value={dlName}
                          onChange={(e) => { setDlName(e.target.value); setDlError(''); }}
                          disabled={isSending}
                          className="w-full px-5 py-4 bg-[#f9f7f2] border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:border-[#c08b5c] focus:ring-[#c08b5c]/10 transition-all font-bold text-[#0a1f11]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-[#c08b5c] mb-2">{l.legal.dlModal.emailLabel}</label>
                        <input 
                          type="email" 
                          value={dlEmail}
                          onChange={(e) => { setDlEmail(e.target.value); setDlError(''); }}
                          placeholder={l.legal.dlModal.emailPlaceholder}
                          disabled={isSending}
                          className="w-full px-5 py-4 bg-[#f9f7f2] border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:border-[#c08b5c] focus:ring-[#c08b5c]/10 transition-all font-bold text-[#0a1f11]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-[#c08b5c] mb-2">{l.legal.dlModal.locLabel}</label>
                        <input 
                          type="text" 
                          value={dlLocation}
                          onChange={(e) => { setDlLocation(e.target.value); setDlError(''); }}
                          disabled={isSending}
                          className="w-full px-5 py-4 bg-[#f9f7f2] border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:border-[#c08b5c] focus:ring-[#c08b5c]/10 transition-all font-bold text-[#0a1f11]"
                        />
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleDownloadSubmit}
                          disabled={!dlName.trim() || !dlLocation.trim() || !dlEmail.trim() || isSending}
                          className="flex-1 py-4 bg-[#1b4332] text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#0a1f11] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-3"
                        >
                          {isSending ? (
                            <>
                              <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                              />
                              {l.modal.sending}
                            </>
                          ) : l.legal.dlModal.confirm}
                        </motion.button>
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
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
                        <Check className="w-10 h-10 text-green-600" />
                      </motion.div>
                    </div>
                    <h3 className="text-3xl font-serif font-black text-[#0a1f11] mb-4">{l.legal.dlModal.successTitle}</h3>
                    <p className="text-gray-500 mb-8 leading-relaxed max-w-sm mx-auto text-sm">
                      {l.legal.dlModal.successBody}
                    </p>
                    <div className="flex flex-col gap-3">
                      <a 
                        href={`mailto:sahyadringo2022@gmail.com?subject=Legal Document Download (${downloadingDoc.title})&body=User Details:%0A- Name: ${dlName}%0A- Location: ${dlLocation}%0A- Email: ${dlEmail}%0A%0AThey have requested the official legal document.`}
                        className="w-full py-4 bg-[#c08b5c] text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#a67448] transition-all shadow-lg flex justify-center"
                      >
                        {l.legal.dlModal.adminNotifyFallback}
                      </a>
                      <button 
                        onClick={() => {
                          setShowDownloadModal(false);
                          setTimeout(() => setDlSuccess(false), 500);
                        }}
                        className="w-full py-4 bg-gray-100 text-gray-500 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-200 transition-all shadow-sm"
                      >
                        {l.modal.close}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Toast Notification Floating Container */}
      <div className="fixed bottom-6 right-6 z-[600] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="pointer-events-auto flex items-center justify-between p-4 bg-[#0a1f11] text-white border border-[#1b4332] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                {toast.type === 'success' && (
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
                {toast.type === 'info' && (
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
                    <Info className="w-5 h-5" />
                  </div>
                )}
                {toast.type === 'error' && (
                  <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                )}
                <p className="text-xs font-semibold leading-snug">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-3 shrink-0 cursor-pointer"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
