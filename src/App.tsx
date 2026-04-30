import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  MapPin,
  Lock,
  Power,
  Home,
  Wrench,
  User,
  ArrowRight,
  MessageCircle,
  CheckCircle,
  Copy,
  Smartphone,
  LockKeyhole,
  ListOrdered
} from 'lucide-react';
import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp, getDocs, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.01.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.95-.57 3.86-1.67 5.43-1.1 1.57-2.6 2.76-4.38 3.32-1.78.56-3.73.49-5.45-.19-1.72-.68-3.15-1.92-4.05-3.5-1.46-2.55-1.42-5.75.09-8.251 1.51-2.5 4.31-4.03 7.22-4.14V11.5c-1.4.15-2.73.8-3.73 1.83-1 .1 .03-1.75 1.1-2.54 1.08-1.57 2.66-2.19 4.38-2.6 1.72-.41 3.79-.19 4.19.19v-11.83z" />
  </svg>
);

const ActionBtn = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <div onClick={onClick} className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95">
    <div className="w-[72px] h-[72px] rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center shadow-sm">
      {icon}
    </div>
    <span className="text-[15px] font-extrabold text-slate-900">{label}</span>
  </div>
);

const SmallActionBtn = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <div onClick={onClick} className="flex flex-col items-center gap-1 cursor-pointer transition-transform active:scale-95">
    <div className="w-14 h-14 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center shadow-sm text-slate-500">
      {icon}
    </div>
    <span className="text-sm font-extrabold text-slate-900 mt-1">{label}</span>
  </div>
);

const ProgressSteps = ({ step }: { step: number }) => (
  <div className="flex justify-between items-center px-4 py-4 mb-4 select-none">
    <div className="flex flex-col items-center gap-2 w-16">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>1</div>
      <span className={`text-[10px] font-bold ${step >= 1 ? 'text-indigo-800' : 'text-slate-400'}`}>القسم</span>
    </div>
    <div className={`h-px flex-1 mx-2 ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
    <div className="flex flex-col items-center gap-2 w-16">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>2</div>
      <span className={`text-[10px] font-bold ${step >= 2 ? 'text-indigo-800' : 'text-slate-400'}`}>الرابط</span>
    </div>
    <div className={`h-px flex-1 mx-2 ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
    <div className="flex flex-col items-center gap-2 w-16">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 3 ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>3</div>
      <span className={`text-[10px] font-bold ${step >= 3 ? 'text-indigo-800' : 'text-slate-400'}`}>الدفع</span>
    </div>
  </div>
);

export default function App() {
  const [view, setView] = useState<'HOME' | 'LINK' | 'PAYMENT' | 'SUCCESS' | 'ADMIN'>('HOME');
  const [selectedAction, setSelectedAction] = useState<{ title: string; type: string }>({ title: '', type: '' });
  const [linkInput, setLinkInput] = useState('');
  
  // Admin state
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    // Attempt silent anonymous auth
    signInAnonymously(auth).catch(err => console.warn('Anonymous auth failed. Please enable it in Firebase console.', err));
  }, []);

  const navigate = (newView: typeof view) => {
    window.scrollTo({ top: 0 });
    setView(newView);
  };

  const startAction = (title: string, type: string) => {
    setSelectedAction({ title, type });
    setLinkInput('');
    navigate('LINK');
  };

  const submitOrder = async () => {
    const tNumber = (document.getElementById('transfer_number') as HTMLInputElement).value;
    const wNumber = (document.getElementById('whatsapp_number') as HTMLInputElement).value;
    
    if (!tNumber || !wNumber) {
      alert('الرجاء إدخال رقم التحويل ورقم الواتساب أولاً.');
      return;
    }

    try {
      const orderData = {
        actionTitle: selectedAction.title,
        actionType: selectedAction.type,
        accountLink: linkInput || 'غير متوفر',
        transferNumber: tNumber,
        whatsappNumber: wNumber,
        status: 'pending',
        userId: auth.currentUser?.uid || 'anonymous',
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'orders'), orderData);
      navigate('SUCCESS');
    } catch (error) {
      try { handleFirestoreError(error, OperationType.CREATE, 'orders'); } catch (e) {}
      alert('حدث خطأ أثناء الإرسال. تأكد من إعدادات قاعدة البيانات.');
    }
  };

  const handleAdminAccess = () => {
    setShowAdminLogin(true);
    setAdminError('');
  };

  const submitAdminPassword = async () => {
    setAdminError('');
    if (adminPassword === "ahmed787878") {
       try {
          setShowAdminLogin(false);
          setAdminPassword('');
          loadAdminOrders();
          navigate('ADMIN');
       } catch (error: any) {
          setAdminError('تعذر الدخول. تأكد من إعدادات قاعدة البيانات: ' + (error.message || ''));
       }
    } else {
       setAdminError("كلمة مرور غير صحيحة");
    }
  };

  const loadAdminOrders = async () => {
    setLoadingOrders(true);
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedOrders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(fetchedOrders);
      setLoadingOrders(false);
    } catch (error) {
      setLoadingOrders(false);
      try { handleFirestoreError(error, OperationType.LIST, 'orders'); } catch (e) {}
      alert('تعذر جلب الطلبات. راجع الصلاحيات.');
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, y: -15, transition: { duration: 0.2, ease: 'easeIn' } }
  };


  return (
    <div className="w-full h-full flex flex-col text-slate-900 bg-slate-50 relative">
      <AnimatePresence mode="wait">
        {view === 'HOME' && (
          <motion.div key="home" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col h-full">
            <nav className="h-16 bg-white border-b border-slate-200 px-5 flex items-center justify-between shadow-sm shrink-0">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-inner">
                     <ShieldCheck className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-xl font-extrabold tracking-tight text-slate-800">حمايتك واجبنا</span>
               </div>
               <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors" onClick={handleAdminAccess}>
                  <User className="w-4 h-4 text-slate-500" />
               </div>
            </nav>

            <div className="flex-1 overflow-y-auto pb-24 px-5 pt-6 space-y-6">
              
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg shadow-indigo-600/30">
                 <h2 className="text-lg font-bold mb-3 opacity-90">مرحباً بك</h2>
                 <p className="text-sm font-medium opacity-90 mb-4 bg-indigo-900/40 p-3 rounded-lg border border-indigo-400/20 leading-relaxed">
                   في حالة عدم وجود شبهة في حساب الشخص لن نقوم بعمل شيء.
                 </p>
                 <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs backdrop-blur-sm">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    الخدمات مفعلة وتعمل بكفاءة
                 </div>
              </div>

              {/* القسم الأول */}
              <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 py-3 px-5 flex items-center justify-between">
                   <h2 className="text-lg font-black text-slate-900">القسم الأول: قسم الاختراق</h2>
                   <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">متاح</span>
                </div>
                <div className="p-5 flex justify-around items-center px-1 text-center">
                  <ActionBtn
                    icon={<Facebook className="w-8 h-8 text-[#1877F2]" />}
                    label="فيس بوك"
                    onClick={() => startAction('اختراق حساب فيس بوك', 'facebook')}
                  />
                  <ActionBtn
                    icon={<Instagram className="w-8 h-8 text-[#E1306C]" />}
                    label="انستجرام"
                    onClick={() => startAction('اختراق حساب انستجرام', 'instagram')}
                  />
                  <ActionBtn
                    icon={<TikTokIcon className="w-8 h-8" />}
                    label="تيك توك"
                    onClick={() => startAction('اختراق حساب تيك توك', 'tiktok')}
                  />
                </div>
              </div>

              {/* القسم الثاني */}
              <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 py-3 px-5">
                   <h2 className="text-lg font-black text-slate-900 text-center">القسم الثاني: معلومات شخصيه او موقع حساب</h2>
                </div>
                
                <div className="p-5 flex justify-around items-center px-1 text-center">
                  <ActionBtn
                    icon={<Facebook className="w-8 h-8 text-[#1877F2]" />}
                    label="فيس بوك"
                    onClick={() => startAction('معلومات فيس بوك', 'facebook')}
                  />
                  <ActionBtn
                    icon={<TikTokIcon className="w-8 h-8" />}
                    label="تيك توك"
                    onClick={() => startAction('معلومات تيك توك', 'tiktok')}
                  />
                  <ActionBtn
                    icon={<Youtube className="w-8 h-8 text-[#FF0000]" />}
                    label="يوتيوب"
                    onClick={() => startAction('معلومات يوتيوب', 'youtube')}
                  />
                </div>
              </div>

              {/* القسم الثالث */}
              <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 py-3 px-5">
                   <h2 className="text-lg font-black text-slate-900 text-center">القسم الثالث: غلق الحساب نهائياً</h2>
                </div>
                <div className="p-5 flex items-center gap-5">
                  <div className="flex-shrink-0 cursor-pointer active:scale-95 transition-transform bg-slate-900 rounded-2xl p-4 shadow-md" onClick={() => startAction('غلق حساب', 'power')}>
                    <Power className="w-12 h-12 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col gap-3 flex-grow">
                    <button onClick={() => startAction('غلق حساب فيس بوك', 'facebook')} className="bg-slate-50 text-slate-900 hover:bg-slate-100 active:bg-slate-200 py-3 px-4 rounded-xl flex items-center justify-between transition-colors border border-slate-200 font-extrabold text-[15px]">
                       <span>غلق فيس بوك</span>
                       <Facebook className="w-5 h-5 flex-shrink-0 text-[#1877F2]" />
                    </button>
                    <button onClick={() => startAction('غلق حساب تيك توك', 'tiktok')} className="bg-slate-50 text-slate-900 hover:bg-slate-100 active:bg-slate-200 py-3 px-4 rounded-xl flex items-center justify-between transition-colors border border-slate-200 font-extrabold text-[15px]">
                       <span>غلق تيك توك</span>
                       <TikTokIcon className="w-5 h-5 flex-shrink-0" />
                    </button>
                    <button onClick={() => startAction('غلق حساب واتساب', 'whatsapp')} className="bg-slate-50 text-slate-900 hover:bg-slate-100 active:bg-slate-200 py-3 px-4 rounded-xl flex items-center justify-between transition-colors border border-slate-200 font-extrabold text-[15px]">
                       <span>غلق واتساب</span>
                       <MessageCircle className="w-5 h-5 flex-shrink-0 text-[#25D366]" />
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Nav */}
            <div className="absolute bottom-0 w-full bg-white border-t border-slate-200 flex justify-around p-3 pb-safe z-50">
               <div className="flex flex-col items-center text-indigo-700 transition-colors">
                  <Home className="w-6 h-6" strokeWidth={2.5} />
                  <span className="text-[10px] font-bold mt-1">الرئيسية</span>
               </div>
               <div className="flex flex-col items-center text-slate-400 hover:text-slate-600 transition-colors">
                  <ShieldCheck className="w-6 h-6" />
                  <span className="text-[10px] font-bold mt-1">الأمن</span>
               </div>
               <div className="flex flex-col items-center text-slate-400 hover:text-slate-600 transition-colors">
                  <Wrench className="w-6 h-6" />
                  <span className="text-[10px] font-bold mt-1">الأدوات</span>
               </div>
               <div className="flex flex-col items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" onClick={handleAdminAccess}>
                  <User className="w-6 h-6" />
                  <span className="text-[10px] font-bold mt-1">الشخصي</span>
               </div>
            </div>
          </motion.div>
        )}

        {view === 'LINK' && (
          <motion.div key="link" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col bg-slate-50 h-full z-40 relative">
             <nav className="h-16 bg-white border-b border-slate-200 px-4 flex items-center shadow-sm shrink-0">
                <button onClick={() => navigate('HOME')} className="p-2 -mr-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors hidden md:block">
                  <ArrowRight className="w-5 h-5 text-slate-700" />
                </button>
                <button onClick={() => navigate('HOME')} className="p-2 -mr-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors md:hidden">
                  <ArrowRight className="w-5 h-5 text-slate-700" />
                </button>
                <h1 className="text-lg font-bold flex-1 text-center pl-8 text-slate-800">{selectedAction.title}</h1>
             </nav>
             
             <div className="flex-1 flex flex-col pt-2 overflow-y-auto">
                <ProgressSteps step={2} />

                <div className="px-5">
                   <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden mb-8">
                      <div className="p-5 border-b border-slate-100 bg-indigo-50/50 flex flex-col gap-3">
                         <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-2">
                             <ShieldCheck className="w-5 h-5" />
                         </div>
                         <p className="text-slate-700 text-sm font-semibold leading-relaxed">
                            لإكمال طلب <b className="text-indigo-700">إضافة اللينك</b> بنجاح، الرجاء إدخال الرابط (اللينك) الخاص بالحساب لإتمام تفعيل القسم لبدء العملية بأمان تام.
                         </p>
                      </div>
                      <div className="p-6">
                        <label className="block text-sm font-bold text-slate-700 mb-2 px-1">رابط الحساب (Link)</label>
                        <input 
                           dir="ltr"
                           type="url" 
                           placeholder="https://..."
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-left outline-none hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-mono text-base placeholder:text-slate-400"
                           id="account_link"
                           value={linkInput}
                           onChange={(e) => setLinkInput(e.target.value)}
                        />
                      </div>
                   </div>

                   <button 
                      onClick={() => navigate('PAYMENT')}
                      className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 touch-none mb-6"
                   >
                      المتابعة للدفع
                   </button>
                </div>
             </div>
          </motion.div>
        )}

        {view === 'PAYMENT' && (
          <motion.div key="payment" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col bg-slate-50 h-full z-40 relative">
             <nav className="h-16 bg-white border-b border-slate-200 px-4 flex items-center shadow-sm shrink-0 sticky top-0 z-10">
                <button onClick={() => navigate('LINK')} className="p-2 -mr-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
                  <ArrowRight className="w-5 h-5 text-slate-700" />
                </button>
                <h1 className="text-lg font-bold flex-1 text-center pl-8 text-slate-800">إتمام التفعيل</h1>
             </nav>
             
             <div className="flex-1 flex flex-col pt-2 overflow-y-auto">
                <ProgressSteps step={3} />
                
                <div className="px-5 pb-8">
                   <div className="bg-indigo-50 border border-indigo-100 ring-1 ring-indigo-200/50 rounded-xl p-5 mb-6 shadow-sm">
                      <p className="text-indigo-900 font-bold mb-4 text-xs text-center uppercase tracking-wide">رقم المحفظة (فودافون كاش)</p>
                      
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-indigo-100 shadow-sm text-indigo-900">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 hidden sm:flex">
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <span className="text-2xl font-mono font-bold tracking-widest leading-none dir-ltr">
                               01080239975
                            </span>
                         </div>
                         <button onClick={() => navigator.clipboard.writeText('01080239975')} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2">
                            نسخ <Copy className="w-4 h-4 hidden sm:block" />
                         </button>
                      </div>
                      <p className="text-xs font-bold text-slate-600 mt-4 text-center">قم بتحويل الرسوم المقررة إلى هذا الرقم لاستلام البيانات</p>
                   </div>

                   <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden mb-8">
                      <div className="p-6 space-y-6">
                         <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 px-1">رقم التحويل</label>
                            <input 
                               type="tel" 
                               dir="ltr"
                               placeholder="مثلاً: 01xxxxxxxxx"
                               className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-left outline-none hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-mono text-base placeholder:text-slate-400"
                               id="transfer_number"
                            />
                            <p className="text-xs text-slate-500 mt-2 px-1 font-semibold">رقم الموبايل الذي قمت بتحويل المبلغ منه</p>
                         </div>
                         <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 px-1">رقم الواتساب للاستلام</label>
                            <div className="relative">
                              <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6 pointer-events-none" />
                              <input 
                                 type="tel" 
                                 dir="ltr"
                                 placeholder="أدخل رقمك للتواصل"
                                 className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 pl-12 text-left outline-none hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-mono text-base placeholder:text-slate-400"
                                 id="whatsapp_number"
                              />
                            </div>
                            <p className="text-xs text-slate-500 mt-2 px-1 font-semibold">سنقوم بإرسال النتيجة فوراً إلى هذا الرقم</p>
                         </div>
                      </div>
                   </div>

                   <button 
                      onClick={submitOrder}
                      className="w-full bg-slate-900 text-white py-5 rounded-xl font-bold text-lg shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 touch-none"
                   >
                      إرسال بيانات التأكيد 🚀
                   </button>
                   
                   <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-bold">
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                      سيتم مراجعة طلبك وإرسال البيانات خلال لحظات
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                   </div>
                </div>
             </div>
          </motion.div>
        )}

        {view === 'SUCCESS' && (
          <motion.div key="success" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-6 text-center z-50 relative h-full">
             <motion.div 
               initial={{ scale: 0 }} 
               animate={{ scale: 1 }} 
               transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
               className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-slate-200/50 border border-slate-100"
             >
                <CheckCircle className="w-12 h-12 text-indigo-600" strokeWidth={2.5} />
             </motion.div>
             <h2 className="text-2xl font-black text-slate-800 mb-3">تم الاستلام بنجاح</h2>
             <p className="text-slate-600 font-medium mb-10 max-w-[280px] text-sm leading-relaxed">
                جاري التحقق من عملية الدفع.<br/>
                سيتم إرسال كافة البيانات المطلوبة إلى رقم الواتساب الخاص بك قريباً.
             </p>
             <button 
                onClick={() => navigate('HOME')}
                className="w-full max-w-xs bg-white text-slate-800 rounded-xl py-4 font-bold text-sm transition-colors border border-slate-200 shadow-sm active:scale-[0.98]"
             >
                العودة للرئيسية
             </button>
          </motion.div>
        )}

        {view === 'ADMIN' && (
          <motion.div key="admin" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col bg-slate-50 h-full z-50 relative">
             <nav className="h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center shadow-md shrink-0 sticky top-0 z-10">
                <button onClick={() => navigate('HOME')} className="p-2 -mr-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors text-white">
                  <ArrowRight className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-bold flex-1 text-center pl-8 text-white flex items-center justify-center gap-2">
                   <LockKeyhole className="w-5 h-5 text-indigo-400" /> لوحة التحكم
                </h1>
                <button onClick={loadAdminOrders} className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-full transition-colors text-white">
                  <ListOrdered className="w-5 h-5" />
                </button>
             </nav>
             <div className="flex-1 overflow-y-auto p-5">
                {loadingOrders ? (
                   <div className="flex justify-center items-center h-40">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                   </div>
                ) : orders.length === 0 ? (
                   <div className="text-center text-slate-500 mt-10">لا توجد طلبات حتى الآن</div>
                ) : (
                   <div className="space-y-4 pb-20">
                      {orders.map((order, i) => (
                         <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                               <h3 className="font-bold text-slate-900">{order.actionTitle}</h3>
                               <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                                  {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString('ar-EG') : 'الآن'}
                               </span>
                            </div>
                            <div className="space-y-2 text-sm">
                               <div className="flex gap-2">
                                  <span className="text-slate-500 font-bold min-w-[80px]">اللينك:</span>
                                  <span className="text-slate-900 dir-ltr text-right break-all">{order.accountLink}</span>
                               </div>
                               <div className="flex gap-2">
                                  <span className="text-slate-500 font-bold min-w-[80px]">رقم التحويل:</span>
                                  <span className="text-slate-900 font-mono tracking-wider">{order.transferNumber}</span>
                               </div>
                               <div className="flex gap-2">
                                  <span className="text-slate-500 font-bold min-w-[80px]">واتساب:</span>
                                  <span className="text-slate-900 font-mono tracking-wider">{order.whatsappNumber}</span>
                               </div>
                            </div>
                         </div>
                      ))}
                   </div>
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminLogin && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200"
            >
               <div className="bg-indigo-600 p-5 flex flex-col items-center text-white">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
                     <LockKeyhole className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-lg">صلاحيات المدير</h3>
               </div>
               <div className="p-6">
                 <p className="text-sm font-semibold text-slate-600 mb-4 text-center">أدخل كلمة المرور للوصول إلى لوحة التحكم واستعراض بيانات المستخدمين</p>
                 {adminError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs mb-4 text-center border border-red-200">
                       {adminError}
                    </div>
                 )}
                 <input 
                   type="password"
                   placeholder="كلمة المرور..."
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-center outline-none hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-mono mb-4 text-slate-800"
                   value={adminPassword}
                   onChange={(e) => setAdminPassword(e.target.value)}
                   onKeyDown={(e) => { if(e.key === 'Enter') submitAdminPassword() }}
                   dir="ltr"
                 />
                 <div className="flex gap-3">
                    <button 
                      onClick={() => { setShowAdminLogin(false); setAdminPassword(''); }}
                      className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      إلغاء
                    </button>
                    <button 
                      onClick={submitAdminPassword}
                      className="flex-1 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30 transition-all"
                    >
                      دخول
                    </button>
                 </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
