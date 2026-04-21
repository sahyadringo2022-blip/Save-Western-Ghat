import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

export default function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'mr' | 'en'>('mr');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const recipients = [
    'seiaa.mah@gmail.com', 
    'dgm@mahaforest.gov.in', 
    'krishnendu.mondal@gov.in', 
    'collector.kolhapur@maharashtra.gov.in'
  ];
  
  const emailData = {
    en: {
      label: 'English Appeal',
      subject: 'Objection to Proposed Bauxite Mining in Shahuwadi Eco-Sensitive Area (Sahyadri Tiger Corridor)',
      body: `Dear Authorities,

I am writing to express my strong objection to the proposed bauxite mining in the Parali and Ghungur blocks of Shahuwadi Taluka, Kolhapur.

This project constitutes a severe threat to the Sahyadri habitat. The proposed site is a critical 'Tiger Corridor' connecting the Sahyadri Tiger Reserve and is designated as a Western Ghats Eco-Sensitive Area (ESA).

Furthermore, the Letters of Intent (LoI) for these blocks have expired (e.g., Parali LoI expired on 13/09/2023). Proceeding with mining on expired LoIs is a direct violation of the Mineral Concession Rules.

I urge you to reject these mining proposals immediately to safeguard our biodiversity and legal integrity.

Sincerely,
[My Name]`,
    },
    mr: {
      label: 'मराठी अपील',
      subject: 'शाहूवाडी पर्यावरण संवेदनशील क्षेत्रातील (सह्याद्री व्याघ्र कॉरिडॉर) प्रस्तावित बॉक्साईट उत्खननास विरोध',
      body: `आदरणीय अधिकारी महोदय,

मी कोल्हापूर जिल्ह्यातील शाहूवाडी तालुक्यातील परळी आणि घूंगूर ब्लॉकमध्ये प्रस्तावित असलेल्या बॉक्साईट उत्खननास तीव्र विरोध दर्शवण्यासाठी हे पत्र लिहित आहे.

हा प्रकल्प सह्याद्रीच्या नैसर्गिक अधिवासासाठी अत्यंत घातक आहे. प्रस्तावित जागा सह्याद्री व्याघ्र प्रकल्पाला जोडणारा महत्त्वाचा 'व्याघ्र कॉरिडॉर' असून ती पश्चिम घाट पर्यावरण संवेदनशील क्षेत्र (ESA) अंतर्गत येते.

पश्यात्, या ब्लॉक्ससाठीचे 'लेटर ऑफ इंटेंट' (LoI) कालबाह्य झाले आहेत (उदा. परळी LoI १३/०९/२०२३ रोजी संपले आहे). कालबाह्य LoI वर आधारित उत्खनन हे खनिज सवलत नियमांचे उल्लंघन आहे.

आमची आपणास नम्र विनंती आहे की, निसर्ग आणि कायद्याचे रक्षण करण्यासाठी हे उत्खनन प्रस्ताव त्वरित फेटाळून लावावेत.

कळावे,
[आपले नाव]`,
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const currentEmailData = emailData[activeTab];
  
  // Robust mailto construction: 
  // 1. Join recipients with commas (no spaces)
  // 2. Use %0D%0A (CRLF) for newlines in the body for maximum client compatibility
  // 3. Ensure all components are properly URI encoded
  const recipientsStr = recipients.map(r => r.trim()).join(',');
  const encodedSubject = encodeURIComponent(currentEmailData.subject);
  const encodedBody = encodeURIComponent(currentEmailData.body.replace(/\n/g, '\r\n'));
  const mailtoUrl = `mailto:${recipientsStr}?subject=${encodedSubject}&body=${encodedBody}`;

  return (
    <div className="min-h-screen bg-[#f9f7f2] font-sans text-gray-900 selection:bg-[#c08b5c]/30">
      {/* Browser Environment Alert */}
      <div className="bg-[#c08b5c]/10 text-[#0a1f11] text-[10px] py-1.5 px-6 text-center font-bold uppercase tracking-widest relative z-[60] border-b border-[#c08b5c]/10">
        Tip: For the best experience and to test email features, click "Open in new window" in the top right.
      </div>
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a1f11]/90 backdrop-blur-md border-b border-[#c08b5c]/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-[#c08b5c] rounded">
              <TreePine className="text-[#0a1f11] w-5 h-5" />
            </div>
            <span className="font-serif font-bold text-white tracking-wide text-lg sm:text-xl">
              Sahyadri Bachav
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-[#f9f7f2]/80 text-xs font-bold uppercase tracking-widest">
            <a href="#about" className="hover:text-[#c08b5c] transition-colors">The Crisis</a>
            <a href="#stats" className="hover:text-[#c08b5c] transition-colors">Legal Status</a>
            <a href="#action" className="px-5 py-2 bg-[#c08b5c] text-[#0a1f11] rounded hover:bg-[#c08b5c]/80 transition-colors">Take Action</a>
          </div>

          <button 
            className="md:hidden text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 px-6 overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#1b4332] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#c08b5c] rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1.5 bg-[#1b4332]/10 text-[#1b4332] rounded-md text-[10px] font-black uppercase tracking-[0.3em] mb-8 border border-[#1b4332]/10">
              Emergency Action Needed
            </span>
            <h1 className="text-6xl md:text-9xl font-serif font-black text-[#0a1f11] leading-[0.85] mb-10">
              Save <span className="text-[#c08b5c]">Sahyadri</span>
            </h1>
            <p className="font-marathi text-2xl md:text-4xl text-[#1b4332] font-semibold leading-relaxed max-w-4xl mx-auto mb-12">
              शाहूवाडीतील बेकायदेशीर बॉक्साईट उत्खननास थांबवण्यासाठी आजच आपले मत नोंदवा!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <a 
                href="#action" 
                className="w-full sm:w-auto px-10 py-5 bg-[#0a1f11] text-[#f9f7f2] rounded-full font-black uppercase tracking-widest hover:bg-[#1b4332] hover:scale-105 transition-all flex items-center justify-center gap-3 shadow-2xl"
              >
                Send Your Email <ChevronRight className="w-5 h-5" />
              </a>
              <a 
                href="#about" 
                className="w-full sm:w-auto px-10 py-5 border-2 border-[#1b4332] text-[#1b4332] rounded-full font-black uppercase tracking-widest hover:bg-[#1b4332] hover:text-white transition-all flex items-center justify-center gap-2"
              >
                Explore Context
              </a>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-[-100px] left-1/2 -translate-x-1/2 hidden lg:block"
          >
            <div className="flex flex-col items-center gap-2 text-[#c08b5c]/40 font-black text-[10px] uppercase tracking-widest">
              <span>Scroll to start</span>
              <ChevronDown className="animate-bounce" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Info Stats Section */}
      <section id="stats" className="bg-[#0a1f11] text-[#f9f7f2] py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 grayscale pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        </div>
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-0 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-12 border-b md:border-b-0 md:border-r border-white/10 group hover:bg-[#1b4332]/20 transition-colors">
            <span className="text-[#c08b5c] font-black text-xs uppercase tracking-widest mb-4 block">Rule Violation</span>
            <h3 className="text-5xl font-serif text-white mb-6">13/09/2023</h3>
            <p className="text-white/60 leading-relaxed text-sm">The <strong>Letter of Intent (LoI)</strong> for the Parali block expired months ago. Mining based on lapsed permissions is a direct breach of the Mineral Concession Rules.</p>
          </div>
          <div className="p-12 border-b md:border-b-0 md:border-r border-white/10 group hover:bg-[#1b4332]/20 transition-colors">
            <span className="text-[#c08b5c] font-black text-xs uppercase tracking-widest mb-4 block">Migration Path</span>
            <h3 className="text-5xl font-serif text-white mb-6">Tiger Path</h3>
            <p className="text-white/60 leading-relaxed text-sm">This Shahuwadi corridor is the primary link for the <strong>Sahyadri Tiger Reserve</strong>. Open-cast mining will irreversibly sever this vital ecological artery.</p>
          </div>
          <div className="p-12 group hover:bg-[#1b4332]/20 transition-colors">
            <span className="text-[#c08b5c] font-black text-xs uppercase tracking-widest mb-4 block">Legal Status</span>
            <h3 className="text-5xl font-serif text-white mb-6">ESA Protection</h3>
            <p className="text-white/60 leading-relaxed text-sm">As part of the Western Ghats <strong>Eco-Sensitive Area (ESA)</strong>, these blocks are legally designated for conservation, not destructive industrial extraction.</p>
          </div>
        </div>
      </section>

      {/* The Crisis Context */}
      <section id="about" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-20 items-center">
          <div className="flex-1 space-y-10 order-2 lg:order-1">
            <div>
              <div className="flex items-center gap-3 text-[#c08b5c] mb-4">
                <div className="w-12 h-px bg-[#c08b5c]/30" />
                <span className="font-black text-xs uppercase tracking-[0.4em]">The Investigation</span>
              </div>
              <h2 className="text-5xl md:text-7xl font-serif font-black text-[#0a1f11] mb-8 leading-[0.9]">Illegal Bauxite <br/>Exploitation</h2>
            </div>
            
            <div className="space-y-6 text-lg text-gray-700 leading-relaxed font-light">
              <p>
                In the heart of Shahuwadi, the Parali and Ghungur blocks represent our last stand for the Sahyadri ecosystem. Recent findings show that mining operations are proceeding despite the expiration of their legal mandates.
              </p>
              <div className="bg-[#1b4332]/5 rounded-2xl p-8 border border-[#1b4332]/10">
                <h4 className="font-bold text-[#0a1f11] mb-4 flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-[#c08b5c]" /> Legal Violation Details
                </h4>
                <p className="text-sm">The <strong>Mineral Concession Rules</strong> are clear: once a Letter of Intent (LoI) has expired, any further action for clearing or extraction is invalid. The Parali block's LoI expired on <strong>13th September 2023</strong>, yet the threat persists.</p>
              </div>
              <p className="font-marathi text-2xl font-semibold text-[#1b4332]">आपल्या जंगलाचे रक्षण करणे, म्हणजे आपल्या भविष्याचे रक्षण करणे आहे.</p>
            </div>
          </div>
          
          <div className="flex-1 order-1 lg:order-2 w-full">
            <div className="relative group">
              <div className="absolute -inset-4 bg-[#c08b5c]/10 rounded-[40px] rotate-2 scale-95 group-hover:rotate-0 transition-transform duration-500" />
              <img 
                src="https://picsum.photos/seed/sah_mist/1200/1500" 
                alt="Western Ghats Landscape" 
                className="relative z-10 w-full h-[600px] object-cover rounded-[32px] shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Take Action Section */}
      <section id="action" className="py-24 px-6 bg-[#0a1f11] relative">
        {/* Abstract decorative elements */}
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <Leaf className="w-64 h-64 text-[#c08b5c]" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              className="inline-block p-4 bg-[#c08b5c]/10 rounded-full mb-8"
            >
              <Mail className="text-[#c08b5c] w-12 h-12" />
            </motion.div>
            <h2 className="text-5xl md:text-8xl font-serif text-white font-black mb-8">Send Your Objection</h2>
            <p className="text-white/60 text-xl max-w-2xl mx-auto font-light leading-relaxed">
              We have drafted a professional, legal appeal in both Marathi and English. Click below to launch your email app.
            </p>
          </div>

          <div className="bg-white rounded-[40px] p-8 md:p-16 shadow-2xl">
            {/* Tab Selector */}
            <div className="flex bg-[#f9f7f2] p-1.5 rounded-2xl mb-12 max-w-md mx-auto border border-gray-100">
              <button 
                onClick={() => setActiveTab('mr')}
                className={`flex-1 py-4 px-6 rounded-xl font-bold uppercase tracking-widest text-xs transition-all ${
                  activeTab === 'mr' ? 'bg-[#0a1f11] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                मराठी अपील
              </button>
              <button 
                onClick={() => setActiveTab('en')}
                className={`flex-1 py-4 px-6 rounded-xl font-bold uppercase tracking-widest text-xs transition-all ${
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
                    <Info className="w-3 h-3" /> Step-by-Step Action
                  </h4>
                  <ul className="space-y-8">
                    <li className="flex gap-5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0a1f11] text-white flex items-center justify-center font-bold text-xs">1</div>
                      <p className="text-gray-600 leading-tight pt-1">Review the pre-filled content in the preview window.</p>
                    </li>
                    <li className="flex gap-5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0a1f11] text-white flex items-center justify-center font-bold text-xs">2</div>
                      <p className="text-gray-600 leading-tight pt-1">Click <strong>"Send Automatic Email"</strong> to launch your preferred app.</p>
                    </li>
                    <li className="flex gap-5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0a1f11] text-white flex items-center justify-center font-bold text-xs">3</div>
                      <p className="text-gray-600 leading-tight pt-1">If the app doesn't open, use the <strong>copy buttons</strong> to manually paste the info.</p>
                    </li>
                  </ul>
                </div>

                <div className="pt-8 border-t border-gray-100">
                  <a 
                    href={mailtoUrl}
                    className="w-full py-6 bg-[#1b4332] text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#0a1f11] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 no-underline text-center"
                  >
                    Send Automatic Email <ExternalLink className="w-5 h-5" />
                  </a>
                  <p className="mt-4 text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
                    <Info className="w-3 h-3" /> Note: Must be opened in English/Marathi tab to sync content.
                  </p>
                </div>
              </div>

              {/* Email Content Preview */}
              <div className="bg-[#f9f7f2] border border-gray-100 rounded-3xl p-8 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Mail className="w-32 h-32 text-gray-900" />
                </div>
                
                <div className="relative z-10 space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#c08b5c]">To (Recipients)</label>
                      <button 
                        onClick={() => copyToClipboard(recipients.join(','), 'to')}
                        className="p-1 hover:bg-white rounded transition-colors"
                      >
                        {copiedField === 'to' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                      </button>
                    </div>
                    <div className="text-[11px] font-mono p-3 bg-white/50 border border-gray-100 rounded-lg text-gray-500 break-all leading-relaxed">
                      {recipients.join(', ')}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#c08b5c]">Subject</label>
                      <button 
                        onClick={() => copyToClipboard(emailData[activeTab].subject, 'subject')}
                        className="p-1 hover:bg-white rounded transition-colors"
                      >
                        {copiedField === 'subject' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                      </button>
                    </div>
                    <div className="text-xs font-serif font-bold p-3 bg-white/50 border border-gray-100 rounded-lg text-[#0a1f11]">
                      {emailData[activeTab].subject}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#c08b5c]">Body</label>
                      <button 
                        onClick={() => copyToClipboard(emailData[activeTab].body, 'body')}
                        className="p-1 hover:bg-white rounded transition-colors"
                      >
                        {copiedField === 'body' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                      </button>
                    </div>
                    <div className="text-[11px] h-[220px] overflow-y-auto whitespace-pre-wrap p-4 bg-white border border-gray-100 rounded-xl leading-relaxed text-gray-600 custom-scrollbar">
                      {emailData[activeTab].body}
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
              A community-led campaign for the preservation of the Shahuwadi eco-sensitive zone and the protection of the Sahyadri Tiger Corridor from illegal mining encroachment.
            </p>
          </div>
          
          <div className="text-right space-y-4">
            <a href="#" className="block text-[#c08b5c] font-black text-xs uppercase tracking-widest hover:text-white transition-colors">Back to top</a>
            <p className="text-[10px] text-white/20 uppercase tracking-[0.5em]">Kolhapur, India © 2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
