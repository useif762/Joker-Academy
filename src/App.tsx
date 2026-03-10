import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

import { useState, useEffect, FormEvent, memo, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { subscribeToCollection, saveDocument, getDocument, updateDocument } from './services/db';
import { db } from './firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from "motion/react";
import { 
  School, 
  Login as LoginIcon, 
  Menu, 
  AutoAwesome, 
  Map, 
  WorkspacePremium, 
  AccountCircle, 
  MenuBook, 
  Quiz, 
  TrendingUp, 
  MilitaryTech,
  VideoLibrary,
  Chat,
  SocialLeaderboard,
  Public,
  HistoryEdu,
  Search,
  Mail,
  Castle,
  Explore,
  Close,
  Logout,
  Badge,
  PlayCircle,
  Visibility,
  VisibilityOff,
  Timer,
  Download,
  CheckCircle,
  Lock,
  DarkMode,
  LightMode,
} from "./components/Icons";

import { AIChatbot } from './components/AIChatbot';
import { LessonComments } from './components/LessonComments';

// --- Types ---
type Page = 'home' | 'courses' | 'exams' | 'profile' | 'login' | 'curriculum' | 'exam-view' | 'course-view' | 'lesson-quiz-view' | 'leaderboard';

type User = {
  name: string;
  phone: string;
  password?: string;
  parentPhone?: string;
  gender?: string;
  grade: string;
  studentId?: string;
  joinDate?: string;
  role?: 'student' | 'admin';
  completedLessons?: (number | string)[];
  lessonProgress?: Record<string, number>; // lessonId to percentage (0-100)
  lastSeen?: number;
  points?: number;
  seenLessonIds?: string[];
  seenExamIds?: string[];
  examResults?: {
    examId: number | string;
    examTitle: string;
    score: number | any;
    total: number;
    date: string;
    answers: any[];
  }[];
};

type Question = {
  id: string;
  text: string;
  image?: string;
  type?: 'multiple-choice' | 'true-false' | 'text';
  options: string[];
  correctAnswer: number | string; // number for index, string for text answer
  score: number;
};

type Exam = {
  id: string;
  title: string;
  questions: Question[];
  duration?: number; // in minutes
  totalScore?: number;
  isPublished?: boolean;
};

type Lesson = {
  id: string;
  title: string;
  duration: string;
  url: string;
  type: 'youtube' | 'local';
  pdfUrl?: string;
  quiz?: Question[];
  quizDuration?: number;
  quizTotalScore?: number;
  isPublished?: boolean;
};

type Course = {
  id: string;
  title: string;
  description: string;
  image: string;
  lessons: Lesson[];
  isPublished?: boolean;
  grade?: string;
};

// --- Decorative Background Icons ---
const BackgroundDecorations = memo(() => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-[0.25] select-none">
    {/* Emojis and Icons scattered around - more visible like WhatsApp stickers */}
    <div className="absolute top-[10%] left-[5%] text-5xl animate-pulse">🌍</div>
    <div className="absolute top-[25%] right-[8%] text-6xl rotate-12">🗿</div>
    <div className="absolute top-[45%] left-[12%] text-4xl -rotate-12">🔍</div>
    <div className="absolute bottom-[20%] right-[15%] text-7xl opacity-60">🏺</div>
    <div className="absolute bottom-[10%] left-[25%] text-5xl rotate-45">📜</div>
    <div className="absolute top-[60%] right-[20%] text-6xl -rotate-6">🐫</div>
    <div className="absolute top-[15%] left-[45%] text-4xl">🧭</div>
    <div className="absolute bottom-[35%] left-[8%] text-6xl">🏛️</div>
    <div className="absolute top-[80%] right-[40%] text-5xl">🗺️</div>
    <div className="absolute top-[5%] right-[30%] text-4xl">⚔️</div>
    <div className="absolute bottom-[5%] right-[5%] text-5xl">👑</div>
  </div>
));

// --- Components ---

const FeatureCard = memo(({ icon: Icon, title, desc, color, mt = false }: { icon: any, title: string, desc: string, color: string, mt?: boolean }) => (
  <div className={`bg-white p-8 rounded-2xl shadow-lg border-b-4 border-${color} ${mt ? 'md:mt-8' : ''}`}>
    <div className={`bg-${color}/10 w-14 h-14 rounded-xl flex items-center justify-center text-${color} mb-6`}>
      <Icon className="text-3xl" />
    </div>
    <h5 className="font-bold mb-2">{title}</h5>
    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
  </div>
));

const Features = memo(() => (
  <section className="py-20 relative">
    <div className="container mx-auto px-6">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div className="grid grid-cols-2 gap-6">
          <FeatureCard icon={AccountCircle} title="حساب شخصي" desc="ملف خاص لمتابعة إنجازاتك وخطتك الدراسية" color="primary" />
          <FeatureCard icon={MenuBook} title="دروس تفاعلية" desc="فيديوهات شرح مبسطة مع خرائط تفاعلية" color="secondary" mt />
          <FeatureCard icon={Quiz} title="بنك الأسئلة" desc="آلاف الامتحانات والأسئلة لضمان التميز" color="accent" />
          <FeatureCard icon={TrendingUp} title="تتبع التقدم" desc="تقارير دورية لمستواك الأكاديمي" color="green-500" mt />
        </div>
        <div className="flex flex-col gap-6">
          <h3 className="text-4xl font-black leading-tight">لماذا يفضل الطلاب <br/><span className="text-primary">منصة الجوكر؟</span></h3>
          <p className="text-lg text-slate-600 leading-relaxed">
            نحن لا نقدم مجرد دروس، بل نبني رحلة استكشافية ممتعة. مع نظام "الجوكر" للجوائز والنقاط، سيتحول المذاكرة إلى تحدي ممتع ومكافئ.
          </p>
          <div className="flex items-center gap-4 p-6 bg-accent/20 rounded-2xl border border-accent/30">
            <MilitaryTech className="text-accent text-4xl" />
            <div>
              <h6 className="font-black text-slate-900">نظام المكافآت الذكي</h6>
              <p className="text-sm text-slate-700">اجمع النقاط مع كل درس تكمله واستبدلها بجوائز رائعة!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
));

const CTA = memo(() => (
  <section className="py-20">
    <div className="container mx-auto px-6">
      <div className="bg-primary rounded-3xl p-12 text-center text-white relative overflow-hidden shadow-2xl shadow-primary/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-32 -mb-32"></div>
        <div className="relative z-10">
          <h3 className="text-3xl lg:text-5xl font-black mb-6">جاهز لتكون من الأوائل؟</h3>
          <p className="text-lg opacity-90 mb-10 max-w-xl mx-auto">انضم الآن وابدأ رحلتك التعليمية المجانية مع الجوكر. التفوق في الدراسات أصبح أسهل من أي وقت مضى!</p>
          <div className="flex justify-center">
            <button className="px-12 py-5 bg-secondary text-white text-xl font-black rounded-2xl shadow-2xl hover:scale-105 transition-all">سجل الآن مجاناً</button>
          </div>
        </div>
      </div>
    </div>
  </section>
));

// --- Pages ---

const Navbar = ({ currentPage, setPage, toggleMenu, user, onLogout, notifications, showNotifications, setShowNotifications }: { currentPage: Page, setPage: (p: Page) => void, toggleMenu: () => void, user: User | null, onLogout: () => void, notifications: any[], showNotifications: boolean, setShowNotifications: (s: boolean) => void }) => (
  <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-white/80 backdrop-blur-md">
    <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
      <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => setPage('home')}>
        <div className="bg-primary p-1.5 sm:p-2 rounded-lg text-white">
          <School className="text-2xl sm:text-3xl" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">الجوكر 🃏</h1>
      </div>
      
      <nav className="hidden md:flex items-center gap-6 lg:gap-8">
        {[
          { id: 'home', label: 'الرئيسية' },
          { id: 'courses', label: 'الدورات' },
          { id: 'exams', label: 'الامتحانات' },
          { id: 'leaderboard', label: 'لوحة الشرف' },
          { id: 'profile', label: 'الملف الشخصي' },
        ].map((item) => (
          <button 
            key={item.id}
            onClick={() => setPage(item.id as Page)}
            className={`font-bold text-sm lg:text-base transition-colors relative py-2 ${currentPage === item.id ? 'text-primary' : 'text-slate-600 hover:text-primary'}`}
          >
            {item.label}
            {currentPage === item.id && (
              <motion.div layoutId="nav-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2 sm:gap-4">
        <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-slate-600 hover:text-primary transition-colors bg-slate-50 rounded-xl">
          <Mail className="text-xl sm:text-2xl" />
          {notifications.length > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] sm:text-[10px] font-bold w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center border-2 border-white">
              {notifications.length}
            </span>
          )}
        </button>

        {user ? (
          <button 
            onClick={onLogout}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 font-bold rounded-xl hover:bg-red-100 transition-all text-sm"
          >
            <Logout className="text-sm" />
            <span>خروج</span>
          </button>
        ) : (
          <button 
            onClick={() => setPage('login')}
            className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
          >
            <LoginIcon className="text-sm" />
            <span>دخول</span>
          </button>
        )}
        
        <button className="md:hidden p-2 text-slate-900 bg-slate-50 rounded-xl" onClick={toggleMenu}>
          <Menu className="text-2xl sm:text-3xl" />
        </button>
      </div>
    </div>
  </header>
);

const MobileMenu = ({ isOpen, setPage, close, user, onLogout, notifications, setShowNotifications }: { isOpen: boolean, setPage: (p: Page) => void, close: () => void, user: User | null, onLogout: () => void, notifications: any[], setShowNotifications: (s: boolean) => void }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 bottom-0 z-[110] w-[80%] max-w-sm bg-white shadow-2xl flex flex-col"
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-1.5 rounded-lg text-white">
                <School className="text-xl" />
              </div>
              <h1 className="text-xl font-black text-primary tracking-tight">الجوكر 🃏</h1>
            </div>
            <button onClick={close} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600">
              <Close className="text-xl" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex flex-col gap-2">
              {[
                { id: 'home', label: 'الرئيسية', icon: <Castle className="text-xl" /> },
                { id: 'courses', label: 'الدورات', icon: <MenuBook className="text-xl" /> },
                { id: 'exams', label: 'الامتحانات', icon: <Quiz className="text-xl" /> },
                { id: 'leaderboard', label: 'لوحة الشرف', icon: <WorkspacePremium className="text-xl" /> },
                { id: 'profile', label: 'الملف الشخصي', icon: <AccountCircle className="text-xl" /> },
              ].map((item) => (
                <button 
                  key={item.id}
                  onClick={() => { setPage(item.id as Page); close(); }}
                  className="flex items-center gap-4 p-4 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 hover:text-primary transition-all text-right"
                >
                  <span className="text-slate-400">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
              <button 
                onClick={() => { setShowNotifications(true); close(); }}
                className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl font-bold text-slate-700"
              >
                <div className="flex items-center gap-4">
                  <Mail className="text-xl text-slate-400" />
                  <span>الإشعارات</span>
                </div>
                {notifications.length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {user ? (
                <button 
                  onClick={() => { onLogout(); close(); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all"
                >
                  <Logout className="text-xl" />
                  <span>تسجيل الخروج</span>
                </button>
              ) : (
                <button 
                  onClick={() => { setPage('login'); close(); }}
                  className="w-full flex items-center gap-4 p-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20"
                >
                  <LoginIcon className="text-xl" />
                  <span>تسجيل الدخول</span>
                </button>
              )}
            </div>
          </div>
          
          <div className="p-6 bg-slate-50 text-center">
            <p className="text-xs text-slate-400 font-bold">منصة الجوكر التعليمية © 2026</p>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const Home = ({ setPage, onViewCurriculum }: { setPage: (p: Page) => void, onViewCurriculum: (grade: string) => void }) => (
  <>
    <section className="relative overflow-hidden pattern-bg pt-12 pb-20 lg:pt-20 lg:pb-32">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="order-2 lg:order-1 flex flex-col gap-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary rounded-full w-fit">
              <AutoAwesome className="text-sm" />
              <span className="text-sm font-bold">مرحباً بك في مستقبل التعليم</span>
            </div>
            <h2 className="text-4xl lg:text-6xl font-black leading-tight text-slate-900">
              منصة <span className="text-primary">الجوكر</span> لتعلم الدراسات الاجتماعية
            </h2>
            <p className="text-lg lg:text-xl text-slate-600 max-w-xl leading-relaxed">
              استمتع بتعلم التاريخ والجغرافيا مع أفضل الأساليب التعليمية المبتكرة. انضم إلينا اليوم وحقق التفوق!
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => setPage('courses')} className="px-8 py-4 bg-primary text-white text-lg font-bold rounded-xl shadow-xl shadow-primary/30 hover:scale-105 transition-transform">
                ابدأ التعلم الآن
              </button>
              <button onClick={() => onViewCurriculum('1')} className="px-8 py-4 bg-white border-2 border-slate-100 text-slate-700 text-lg font-bold rounded-xl hover:bg-slate-50 transition-colors">
                اكتشف المنهج
              </button>
            </div>
            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-3 space-x-reverse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden">
                    <img className="w-full h-full object-cover" src={`https://picsum.photos/seed/kid${i}/100/100`} alt="Student" referrerPolicy="no-referrer" loading="lazy" />
                  </div>
                ))}
              </div>
              <p className="text-sm font-bold text-slate-500">انضم إلى <span className="text-primary">+5000</span> طالب متميز</p>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="order-1 lg:order-2 relative"
          >
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full"></div>
            <img className="relative z-10 w-full max-w-lg mx-auto transform hover:rotate-2 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAkxHAYbTNopIyo6yBLPzvm46H1R05thbjB53fkFx30yt75pmtwXAoYXM7FCXf-E1BdiubNSQT0GH0kY9MJ_tiMYdf_fV96uI0pkN2OQST_whTziVTh7gN-DXTjXi1qPpANL5awg4NyC2WPXMjtvvZXx5FXJt4hzKb0eaGJ0OChapaj8Fdk3RudKx7yqiuw9y9GGfLzpQoCWJXe5EZL88owtcAxPV5bqw-EYyWpnpJwWtDqmMyKqxDsUp7u5-14xSDHknugf81masej" alt="Joker" referrerPolicy="no-referrer" loading="lazy" />
            <div className="absolute top-0 right-0 bg-white p-4 rounded-2xl shadow-xl z-20 flex items-center gap-3 animate-bounce">
              <Map className="text-secondary text-3xl" />
              <span className="font-bold text-sm">خرائط تفاعلية!</span>
            </div>
            <div className="absolute bottom-10 left-0 bg-white p-4 rounded-2xl shadow-xl z-20 flex items-center gap-3">
              <WorkspacePremium className="text-accent text-3xl" />
              <span className="font-bold text-sm">جوائز وتكريم</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>

    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-black mb-4">اختر صفك الدراسي</h3>
          <p className="text-slate-500 max-w-2xl mx-auto">نحن نغطي منهج الدراسات الاجتماعية لجميع صفوف المرحلة الإعدادية</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { id: '1', title: "الأول الإعدادي", tag: "التاريخ القديم", color: "primary", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuASQ2SYTPNs7kwdmpjd0sAQ4GYqJWFPO8tlMrTdBqWezsMf8ww2H5PJORCBq27epf9yPnRtMcR5ldN3OjkmynejIByXVIQ7QEiZrWWYhAOLy6iFFVCw2gBGihTOVZ_02XXrN3yQn4RBVB6WryntOsj02WOb7MuSRxO4wJedBK8FcwS9Rer5zuuN18MagdXhkHDFWVGA3qqg6ZJz1OyqYf8a5mqxB7yDRCtq4PU40jgUBBpZgOG2AshN82_4WpD-AfizobtxtBlPAsU7" },
            { id: '2', title: "الثاني الإعدادي", tag: "الوطن العربي", color: "secondary", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCwMF7rm8eLMbyPn5mR9RsEw3r0rU1UPDaNFj4P032qUyGvW5jEbQR2l97ZVV31qtjp_k8DxJMWtblplTrVvaqY9HgmiGLocy8u79eum0yTWg_Gtk_uK_BvReoE-cIx1706w016vYFEhJmhLV4u_aX1B4yVnTIjMJFdq_Md2GeTfsomubMvNqLGNfpvCXzlTVy7yDW47u2wJPkfV8O8pts-P6rPJqcDQJRNXOT7ini90aF67JqFi7YnNk210jynZj3xyyzcBghVmY0p" },
            { id: '3', title: "الثالث الإعدادي", tag: "العالم الحديث", color: "accent", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCjJ0pp9_1Gp_40urWnuRguUrelRGmBdjCE0eCSkx-cgm1IyToAqZdR80fDqsR9ID424vrMjMjGXoNhquq2fcgD2FGwod4r-miITGGcbDklPs-YfamZsLGmkttf3QvvEmt8nGUHIAW50xB9Ef28ivup1qW8SeO9-LMFf0xgVoCjjLq3hPMbItUCtPCpFj6UIuqSbSXJc6u2gwggS3ZEAgLusfWn2NvGbTSAdyEmxxDM93O0kj-EyviVEaTjOgE7ePJ8TBFfvxHMyV9e" },
          ].map((grade, i) => (
            <motion.div key={i} whileHover={{ y: -10 }} className="group bg-background-light rounded-xl overflow-hidden border border-slate-100 hover:shadow-2xl transition-all">
              <div className="h-48 overflow-hidden relative">
                {grade.img && <img className="w-full h-full object-cover group-hover:scale-110 transition-transform" src={grade.img} alt={grade.title} referrerPolicy="no-referrer" loading="lazy" />}
                <span className={`absolute bottom-4 right-4 z-20 bg-${grade.color} text-white text-xs font-bold px-3 py-1 rounded-full`}>{grade.tag}</span>
              </div>
              <div className="p-8">
                <h4 className="text-xl font-bold mb-3">{grade.title}</h4>
                <button onClick={() => onViewCurriculum(grade.id)} className={`w-full py-3 bg-white border-2 border-${grade.color} text-${grade.color} font-bold rounded-xl group-hover:bg-${grade.color} group-hover:text-white transition-all`}>عرض المنهج</button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <Features />
    <CTA />
  </>
);
const Courses = memo(({ setPage, courses, onSelectCourse, user }: { setPage: (p: Page) => void, courses: Course[], onSelectCourse: (id: string) => void, user: User | null }) => {
  const publishedCourses = courses.filter(c => {
    const isPublished = c.isPublished;
    const matchesGrade = !user || !c.grade || c.grade === user.grade;
    return isPublished && matchesGrade;
  });
  
  return (
    <section className="py-20 container mx-auto px-6">
      <h2 className="text-4xl font-black mb-4 text-center">الدورات التعليمية</h2>
      {user && (
        <p className="text-center text-slate-500 mb-12">نعرض لك الدورات المناسبة لـ {user.grade === '1' ? 'الصف الأول الإعدادي' : user.grade === '2' ? 'الصف الثاني الإعدادي' : 'الصف الثالث الإعدادي'}</p>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {publishedCourses.map((course) => (
          <div key={course.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
            <div className="h-40 bg-slate-100 relative">
              <img className="w-full h-full object-cover" src={course.image || 'https://picsum.photos/seed/placeholder/400/200'} alt={course.title} referrerPolicy="no-referrer" loading="lazy" />
              <div className="absolute top-4 right-4 bg-primary text-white p-2 rounded-lg"><PlayCircle /></div>
            </div>
            <div className="p-6">
              <h3 className="font-bold text-xl mb-2">{course.title}</h3>
              <p className="text-slate-500 text-sm mb-4">{course.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-primary font-bold">{course.lessons.filter(l => l.isPublished).length} درس</span>
                <button 
                  onClick={() => onSelectCourse(course.id)}
                  className="px-4 py-2 bg-slate-100 rounded-lg font-bold hover:bg-primary hover:text-white transition-all"
                >
                  ابدأ الآن
                </button>
              </div>
            </div>
          </div>
        ))}
        {publishedCourses.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
            لا توجد دورات متاحة حالياً
          </div>
        )}
      </div>
    </section>
  );
});

const Exams = memo(({ setPage, exams, onSelectExam, user }: { setPage: (p: Page) => void, exams: Exam[], onSelectExam: (id: string) => void, user: User | null }) => {
  const publishedExams = exams.filter(e => e.isPublished);

  return (
    <section className="py-20 container mx-auto px-6">
      <h2 className="text-4xl font-black mb-12 text-center">بنك الامتحانات</h2>
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {publishedExams.map((exam) => {
          const isTaken = user?.examResults?.some(r => String(r.examId) === exam.id);
          return (
            <div key={exam.id} className="bg-white p-6 rounded-2xl shadow-md flex items-center justify-between border-r-8 border-primary">
              <div className="flex items-center gap-6">
                <div className="bg-primary/10 p-4 rounded-xl text-primary"><Quiz className="text-3xl" /></div>
                <div>
                  <h3 className="font-bold text-xl">{exam.title}</h3>
                  <p className="text-slate-500 text-sm">{exam.questions.length} سؤال • {exam.duration || 30} دقيقة • متوسط الصعوبة</p>
                </div>
              </div>
              {isTaken ? (
                <button 
                  disabled
                  className="px-8 py-3 bg-slate-200 text-slate-500 font-bold rounded-xl cursor-not-allowed flex items-center gap-2"
                >
                  <Badge /> تم الانتهاء
                </button>
              ) : (
                <button 
                  onClick={() => onSelectExam(exam.id)}
                  className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all"
                >
                  ابدأ الاختبار
                </button>
              )}
            </div>
          );
        })}
        {publishedExams.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
            لا توجد امتحانات متاحة حالياً
          </div>
        )}
      </div>
    </section>
  );
});

const ExamView = ({ onBack, exam, user, onUpdateUser }: { onBack: () => void, exam: Exam | null, user: User | null, onUpdateUser: (u: User) => void }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, {selectedOption: number | string, isCorrect: boolean}>>({});
  const [textAnswer, setTextAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState<number>((exam?.duration || 30) * 60);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const questions = exam?.questions || [];

  // Timer Effect
  useEffect(() => {
    if (isFinished || !exam) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFinished, exam?.id]);

  // Prevent leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isFinished) {
        // Attempt to auto-submit before leaving
        finishExam();
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFinished]);

  // Disable back button
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      alert("لا يمكنك الرجوع أثناء الامتحان!");
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const finishExam = () => {
    if (isFinished) return;
    
    // Calculate final score and complete answers
    const completedAnswers: {questionId: string, selectedOption: number | string, isCorrect: boolean}[] = [];
    let totalScore = 0;
    
    questions.forEach((q) => {
      const answer = userAnswers[q.id];
      const questionScore = q.score || 1;
      
      if (answer) {
        completedAnswers.push({
          questionId: q.id,
          selectedOption: answer.selectedOption,
          isCorrect: answer.isCorrect
        });
        if (answer.isCorrect) {
          totalScore += questionScore;
        }
      } else {
        completedAnswers.push({
          questionId: q.id,
          selectedOption: "لم يتم الحل",
          isCorrect: false
        });
      }
    });

    setIsFinished(true);
    
    // Save results to user
    if (user && exam) {
      const sumOfQuestionScores = questions.reduce((acc, q) => acc + (q.score || 1), 0);
      let scaledScore = totalScore;
      let scaledTotal = sumOfQuestionScores;

      if (exam.totalScore) {
        scaledTotal = exam.totalScore;
        scaledScore = Math.round((totalScore / sumOfQuestionScores) * scaledTotal);
      }

      const result = {
        examId: exam.id,
        examTitle: exam.title,
        score: scaledScore,
        total: scaledTotal,
        date: new Date().toLocaleString('ar-EG'),
        answers: completedAnswers
      };
      
      const isMiniQuiz = String(exam.id).startsWith('lesson_quiz_');
      const pointsEarned = isMiniQuiz ? 5 : 10;
      
      const updatedUser = {
        ...user,
        points: (user.points || 0) + pointsEarned,
        examResults: [result, ...(user.examResults || [])]
      };
      onUpdateUser(updatedUser);
    }
  };

  if (questions.length === 0) {
    return createPortal(
      <div className="fixed inset-0 z-[150] bg-slate-50 overflow-y-auto flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">هذا الامتحان لا يحتوي على أسئلة بعد</h2>
          <button onClick={onBack} className="px-6 py-2 bg-primary text-white rounded-xl">العودة</button>
        </div>
      </div>,
      document.body
    );
  }

  const handleAnswer = (answer: number | string) => {
    const q = questions[currentQuestion];
    let isCorrect = false;
    if (typeof answer === 'number') {
        isCorrect = answer === q.correctAnswer;
    } else {
        // For text answers, we mark as correct if not empty for now, 
        // but ideally they should be manually graded or matched.
        isCorrect = answer.trim().length > 0; 
    }

    setUserAnswers(prev => ({
      ...prev,
      [q.id]: {
        selectedOption: answer,
        isCorrect
      }
    }));

    // Auto-advance to next question if it exists, but don't finish
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setTextAnswer("");
    }
  };

  const currentQ = questions[currentQuestion];
  const currentAnswer = currentQ ? userAnswers[currentQ.id] : null;

  if (!exam || !currentQ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold">جاري تحميل الامتحان...</p>
        </div>
      </div>
    );
  }

  if (isFinished) {
    // Recalculate score for display
    let totalScore = 0;
    questions.forEach(q => {
      if (userAnswers[q.id]?.isCorrect) totalScore += (q.score || 1);
    });

    const sumOfQuestionScores = questions.reduce((acc, q) => acc + (q.score || 1), 0);
    let finalScore = totalScore;
    let finalTotal = sumOfQuestionScores;

    if (exam?.totalScore) {
      finalTotal = exam.totalScore;
      finalScore = Math.round((totalScore / sumOfQuestionScores) * finalTotal);
    }

    return createPortal(
      <div className="fixed inset-0 z-[150] bg-slate-50 overflow-y-auto pb-20">
        <div className="min-h-screen py-6 sm:py-10 container mx-auto px-4 sm:px-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-6 sm:p-12 rounded-3xl shadow-2xl max-w-4xl mx-auto mb-6 sm:mb-8 text-center border border-slate-100">
            {finalScore / finalTotal < 0.5 ? (
              <>
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-4xl sm:text-5xl mx-auto mb-4 sm:mb-6">
                  <Close />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black mb-2 text-red-500">درجة سيئة للأسف حاول مرة أخرى</h2>
              </>
            ) : (
              <>
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-4xl sm:text-5xl mx-auto mb-4 sm:mb-6">
                  <WorkspacePremium />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black mb-2">أحسنت يا بطل!</h2>
              </>
            )}
            <p className="text-slate-500 mb-6 sm:mb-8 font-bold text-base sm:text-lg">لقد حصلت على {finalScore} من {finalTotal}</p>
            <button onClick={onBack} className="w-full sm:w-auto px-8 py-4 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all">
              {exam?.id.toString().startsWith('lesson_quiz') ? 'العودة للدرس' : 'العودة للرئيسية'}
            </button>
          </motion.div>

          {/* Graded Paper */}
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            <h3 className="text-xl sm:text-2xl font-black mb-4 sm:mb-6 flex items-center gap-2">
              <MenuBook className="text-primary" /> مراجعة الإجابات
            </h3>
            {questions.map((q, i) => {
              const userAnswer = userAnswers[q.id];
              const isCorrect = userAnswer?.isCorrect;
              
              return (
                <div key={q.id} className={`bg-white p-4 sm:p-6 rounded-2xl shadow-sm border-2 ${isCorrect ? 'border-green-200' : 'border-red-200'}`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-4">
                    <h4 className="font-bold text-base sm:text-lg leading-relaxed">{i + 1}. {q.text}</h4>
                    <span className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-bold shrink-0 ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'}
                    </span>
                  </div>
                  
                  {q.image && (
                    <img src={q.image} alt="Question" className="max-h-64 rounded-xl mb-6 object-contain border border-slate-100 shadow-sm" />
                  )}

                  <div className="space-y-3">
                    {q.type === 'multiple-choice' || q.type === 'true-false' ? (
                      q.options?.map((opt, optIdx) => {
                        const isSelected = String(userAnswer?.selectedOption) === String(optIdx);
                        const isActuallyCorrect = String(q.correctAnswer) === String(optIdx);
                        
                        let optionClass = "p-4 rounded-xl border-2 font-bold flex justify-between items-center transition-all ";
                        if (isActuallyCorrect) {
                          optionClass += "bg-green-50 border-green-500 text-green-700";
                        } else if (isSelected && !isCorrect) {
                          optionClass += "bg-red-50 border-red-500 text-red-700";
                        } else {
                          optionClass += "bg-slate-50 border-slate-200 text-slate-500 opacity-50";
                        }

                        return (
                          <div key={optIdx} className={optionClass}>
                            <div className="flex flex-col">
                              <span>{opt}</span>
                              {isSelected && (
                                <span className="text-[10px] mt-1 opacity-70">إجابتك</span>
                              )}
                            </div>
                            {isActuallyCorrect && <span className="text-green-500 text-xl">✓</span>}
                            {isSelected && !isCorrect && <span className="text-red-500 text-xl">✗</span>}
                          </div>
                        );
                      })
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <span className="text-sm font-bold text-slate-500 block mb-2">إجابتك:</span>
                          <div className={`p-4 rounded-xl border-2 font-bold ${isCorrect ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700'}`}>
                            {userAnswer?.selectedOption || 'لم يتم الحل'}
                          </div>
                        </div>
                        {!isCorrect && q.correctAnswer && (
                          <div>
                            <span className="text-sm font-bold text-slate-500 block mb-2">الإجابة الصحيحة (أو نموذج الإجابة):</span>
                            <div className="p-4 rounded-xl border-2 bg-green-50 border-green-500 text-green-700 font-bold">
                              {q.correctAnswer}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[150] bg-slate-50 overflow-y-auto">
      <div className="min-h-screen py-10 container mx-auto px-6">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-4 gap-8">
          {/* Sidebar: Navigation Grid */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 sticky top-10">
              <h4 className="font-black text-lg mb-6 text-center">الأسئلة</h4>
              <div className="grid grid-cols-4 gap-2">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (currentQ.type === 'text' && textAnswer.trim()) {
                        handleAnswer(textAnswer);
                      }
                      setCurrentQuestion(i);
                      setTextAnswer("");
                    }}
                    className={`aspect-square rounded-xl font-bold transition-all flex items-center justify-center border-2 ${
                      currentQuestion === i 
                        ? 'bg-primary text-white border-primary shadow-lg scale-110 z-10' 
                        : userAnswers[questions[i].id] 
                          ? 'bg-green-50 text-green-600 border-green-200' 
                          : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-primary/30'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              
              <div className="mt-8 pt-8 border-t border-slate-100">
                <div className="flex justify-between items-center text-sm mb-4">
                  <span className="text-slate-400">تمت الإجابة:</span>
                  <span className="font-black text-primary">{Object.keys(userAnswers).length} / {questions.length}</span>
                </div>
                <button 
                  onClick={() => {
                    if (currentQ.type === 'text' && textAnswer.trim()) {
                      handleAnswer(textAnswer);
                    }
                    setShowConfirmSubmit(true);
                  }}
                  className="w-full py-4 bg-secondary text-white font-black rounded-xl shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  تسليم الاختبار
                </button>
              </div>
            </div>
          </div>

          {/* Main Content: Question View */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="text-slate-500 font-bold">
                الاختبار قيد التشغيل
              </div>
              <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-full font-black flex items-center gap-2 ${timeLeft < 60 ? 'bg-red-100 text-red-500 animate-pulse' : 'bg-primary/10 text-primary'}`}>
                  <Timer /> {formatTime(timeLeft)}
                </div>
                <div className="bg-slate-100 px-4 py-2 rounded-full font-bold text-slate-500">
                  سؤال {currentQuestion + 1} من {questions.length}
                </div>
              </div>
            </div>

            <div className="w-full bg-slate-100 h-2 rounded-full mb-8 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                className="h-full bg-primary"
              />
            </div>

            <motion.div key={currentQuestion} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
              <div className="flex justify-between items-start mb-6">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-xs font-black">
                  {currentQ.type === 'multiple-choice' ? 'اختيار من متعدد' : currentQ.type === 'true-false' ? 'صح وخطأ' : 'سؤال مقالي'}
                </span>
                <span className="text-slate-400 font-bold text-sm">{currentQ.score} درجة</span>
              </div>
              
              <h3 className="text-2xl font-black mb-8 leading-relaxed">{currentQ.text}</h3>
              
              {currentQ.image && (
                <div className="mb-8 flex justify-center">
                  <img 
                    src={currentQ.image} 
                    alt="Question" 
                    className="max-h-80 rounded-2xl border border-slate-100 shadow-sm object-contain cursor-zoom-in hover:scale-[1.02] transition-transform" 
                    loading="lazy"
                    onClick={() => setZoomedImage(currentQ.image || null)}
                  />
                </div>
              )}

            {currentQ.type === 'text' ? (
              <div className="space-y-6">
                <textarea 
                  value={textAnswer || (userAnswers[currentQ.id]?.selectedOption as string) || ""}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  className="w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary min-h-[150px] text-lg font-bold"
                  placeholder="اكتب إجابتك هنا..."
                />
                <button 
                  onClick={() => handleAnswer(textAnswer)}
                  disabled={!textAnswer.trim() && !userAnswers[currentQ.id]}
                  className="w-full py-4 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  حفظ الإجابة
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {currentQ.options?.map((opt, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleAnswer(i)}
                    className={`w-full p-5 text-right border-2 rounded-2xl font-bold transition-all flex items-center justify-between group ${
                      userAnswers[currentQ.id]?.selectedOption === i 
                        ? 'bg-primary text-white border-primary shadow-lg' 
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-100 hover:border-primary/30'
                    }`}
                  >
                    <span>{opt}</span>
                    <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs ${
                      userAnswers[currentQ.id]?.selectedOption === i 
                        ? 'border-white/50' 
                        : 'border-slate-200 group-hover:border-primary/30'
                    }`}>
                      {i + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-12 pt-8 border-t border-slate-100">
              <button 
                onClick={() => {
                  if (currentQ.type === 'text' && textAnswer.trim()) {
                    handleAnswer(textAnswer);
                  }
                  if (currentQuestion > 0) {
                    setCurrentQuestion(currentQuestion - 1);
                    setTextAnswer("");
                  }
                }}
                disabled={currentQuestion === 0}
                className="px-8 py-3 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                السابق
              </button>
              
              {currentQuestion < questions.length - 1 ? (
                <button 
                  onClick={() => {
                    if (currentQ.type === 'text' && textAnswer.trim()) {
                      handleAnswer(textAnswer);
                    }
                    setCurrentQuestion(currentQuestion + 1);
                    setTextAnswer("");
                  }}
                  className="px-8 py-3 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all"
                >
                  التالي
                </button>
              ) : (
                <button 
                  onClick={() => {
                    if (currentQ.type === 'text' && textAnswer.trim()) {
                      handleAnswer(textAnswer);
                    }
                    setShowConfirmSubmit(true);
                  }}
                  className="px-8 py-3 bg-secondary text-white font-black rounded-xl shadow-lg shadow-secondary/20 hover:scale-105 transition-all"
                >
                  تسليم الاختبار
                </button>
              )}
            </div>

            {/* Zoomed Image Modal */}
            <AnimatePresence>
              {zoomedImage && (
                <div 
                  className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
                  onClick={() => setZoomedImage(null)}
                >
                  <motion.img 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    src={zoomedImage} 
                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" 
                    alt="Zoomed" 
                  />
                  <button className="absolute top-6 right-6 text-white bg-white/20 p-2 rounded-full hover:bg-white/40 transition-colors">
                    <Close className="text-3xl" />
                  </button>
                </div>
              )}
            </AnimatePresence>

            {/* Submit Confirmation Modal */}
            <AnimatePresence>
              {showConfirmSubmit && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center"
                  >
                    <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                      <Quiz />
                    </div>
                    <h3 className="text-2xl font-black mb-4">هل أنت متأكد من تسليم الاختبار؟</h3>
                    <p className="text-slate-500 mb-8 font-bold">لن تتمكن من تعديل إجاباتك بعد التسليم.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setShowConfirmSubmit(false)}
                        className="py-3 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all"
                      >
                        إلغاء
                      </button>
                      <button 
                        onClick={() => {
                          setShowConfirmSubmit(false);
                          finishExam();
                        }}
                        className="py-3 bg-secondary text-white font-black rounded-xl shadow-lg shadow-secondary/20 hover:bg-secondary/90 transition-all"
                      >
                        نعم، تسليم
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  </div>,
  document.body
);
};

const CourseView = ({ onBack, course, user, onUpdateUser, initialLessonIndex }: { onBack: () => void, course: Course | null, user: User | null, onUpdateUser: (u: User) => void, initialLessonIndex?: number }) => {
  const [activeLesson, setActiveLesson] = useState<number | null>(initialLessonIndex ?? null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const playerRef = useRef<any>(null);
  
  const lessons = useMemo(() => (course?.lessons || []).filter(l => l.isPublished), [course?.lessons]);

  useEffect(() => {
    setShowQuiz(false);
    setShowPdf(false);
    setCurrentProgress(0);
  }, [activeLesson]);

  // YouTube API integration
  useEffect(() => {
    if (activeLesson === null) return;
    const currentLesson = lessons[activeLesson];
    if (currentLesson?.type !== 'youtube' || !currentLesson.url) return;

    let interval: any;

    const onPlayerReady = (event: any) => {
      playerRef.current = event.target;
      interval = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          const currentTime = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration();
          if (duration > 0) {
            const progress = Math.round((currentTime / duration) * 100);
            handleProgressUpdate(progress);
          }
        }
      }, 5000);
    };

    const handleProgressUpdate = (progress: number) => {
      if (progress > currentProgress) {
        setCurrentProgress(progress);
        if (progress >= 70 && user && !user.completedLessons?.includes(currentLesson.id)) {
          handleMarkCompleted(progress);
        } else if (user) {
          updateProgress(progress);
        }
      }
    };

    // Initialize player if API is ready
    if ((window as any).YT && (window as any).YT.Player) {
      new (window as any).YT.Player('youtube-player', {
        events: {
          'onReady': onPlayerReady
        }
      });
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeLesson, lessons, user?.phone]);

  // Track progress for local video
  const handleTimeUpdate = (e: any) => {
    const video = e.target;
    const progress = Math.round((video.currentTime / video.duration) * 100);
    if (progress > currentProgress) {
      setCurrentProgress(progress);
      
      // If progress reaches 70%, we can mark as completed or just update progress
      if (progress >= 70 && user && !user.completedLessons?.includes(lessons[activeLesson].id)) {
        // Auto-mark as completed if it reaches 70%
        handleMarkCompleted(progress);
      } else if (user) {
        // Just update progress
        updateProgress(progress);
      }
    }
  };

  const updateProgress = (progress: number) => {
    if (user && lessons[activeLesson]) {
      const lessonId = lessons[activeLesson].id;
      const oldProgress = user.lessonProgress?.[lessonId] || 0;
      if (progress > oldProgress) {
        const updatedUser = {
          ...user,
          lessonProgress: {
            ...(user.lessonProgress || {}),
            [lessonId]: progress
          }
        };
        onUpdateUser(updatedUser);
      }
    }
  };

  const handleMarkCompleted = (progress: number = 100) => {
    if (user && lessons[activeLesson]) {
      const lessonId = lessons[activeLesson].id;
      if (!user.completedLessons?.includes(lessonId)) {
        const updatedUser = {
          ...user,
          points: (user.points || 0) + 20, // Add 20 points for completing a lesson
          completedLessons: [...(user.completedLessons || []), lessonId],
          lessonProgress: {
            ...(user.lessonProgress || {}),
            [lessonId]: Math.max(progress, user.lessonProgress?.[lessonId] || 0)
          }
        };
        onUpdateUser(updatedUser);
      }
    }
  };

  if (lessons.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">هذه الدورة لا تحتوي على دروس بعد</h2>
          <button onClick={onBack} className="px-6 py-2 bg-primary text-white rounded-xl">العودة</button>
        </div>
      </div>
    );
  }

  if (activeLesson === null) {
    return (
      <div className="min-h-screen bg-slate-50 py-10">
        <div className="container mx-auto px-6">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-bold mb-8 hover:text-primary transition-all">
            <Close /> العودة للدورات
          </button>
          
          <h2 className="text-3xl font-black mb-8">{course?.title}</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson, index) => {
              const progress = user?.lessonProgress?.[lesson.id] || 0;
              const isCompleted = user?.completedLessons?.includes(lesson.id);
              return (
                <button
                  key={lesson.id}
                  onClick={() => setActiveLesson(index)}
                  className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all text-right group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center font-black text-primary text-lg">
                      {index + 1}
                    </div>
                    {isCompleted && <CheckCircle className="text-green-500" />}
                  </div>
                  <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{lesson.title}</h3>
                  <p className="text-slate-400 text-sm mb-4">{lesson.duration}</p>
                  
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const currentLesson = lessons[activeLesson];
  const lessonQuizId = `lesson_quiz_${currentLesson.id}`;
  const existingResult = user?.examResults?.find(r => r.examId === lessonQuizId);

  if (showQuiz && currentLesson.quiz) {
    const lessonExam: Exam = {
      id: lessonQuizId,
      title: `اختبار سريع: ${currentLesson.title}`,
      questions: currentLesson.quiz,
      duration: currentLesson.quizDuration || 15,
      totalScore: currentLesson.quizTotalScore || 10,
      isPublished: true
    };
    return (
      <ExamView 
        onBack={() => setShowQuiz(false)} 
        exam={lessonExam} 
        user={user} 
        onUpdateUser={onUpdateUser} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <button onClick={() => setActiveLesson(null)} className="flex items-center gap-2 text-slate-500 font-bold hover:text-primary transition-all text-sm sm:text-base">
            <Close /> العودة لقائمة الدروس
          </button>
          
          <div className="w-full sm:w-64">
            <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-500 mb-2">
              <span>نسبة الإنجاز في الدورة</span>
              <span>{Math.round(((user?.completedLessons?.filter(id => lessons.some(l => l.id === id)).length || 0) / lessons.length) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${((user?.completedLessons?.filter(id => lessons.some(l => l.id === id)).length || 0) / lessons.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div>
          <div>
            <div className="bg-black aspect-video rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl mb-6 sm:mb-8 flex items-center justify-center">
              {currentLesson.type === 'youtube' && currentLesson.url ? (
                <iframe 
                  width="100%" 
                  height="100%" 
                  src={`https://www.youtube.com/embed/${currentLesson.url}?enablejsapi=1`} 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                  id="youtube-player"
                ></iframe>
              ) : currentLesson.type === 'local' && currentLesson.url ? (
                <video 
                  src={currentLesson.url} 
                  controls 
                  className="w-full h-full object-contain"
                  onTimeUpdate={handleTimeUpdate}
                />
              ) : (
                <div className="text-white">لا يوجد فيديو متاح</div>
              )}
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-black">{currentLesson.title}</h2>
                {user?.completedLessons?.includes(currentLesson.id) ? (
                  <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-xl">
                    <CheckCircle /> مكتمل
                  </div>
                ) : (
                  <button 
                    onClick={() => handleMarkCompleted()}
                    className="flex items-center gap-2 bg-primary text-white font-bold px-4 py-2 rounded-xl hover:bg-primary/90 transition-all"
                  >
                    <CheckCircle /> تحديد كمكتمل
                  </button>
                )}
              </div>
              <p className="text-slate-500 leading-relaxed mb-8">
                {course?.description}
              </p>

              {/* Attachments & Quiz */}
              <div className="grid md:grid-cols-2 gap-6 pt-8 border-t border-slate-100">
                {currentLesson.pdfUrl && (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h4 className="font-bold mb-4 flex items-center gap-2 text-primary">
                      <MenuBook /> ملخص الدرس (PDF)
                    </h4>
                    
                    {showPdf ? (
                      <div className="space-y-4">
                        <div className="relative w-full h-[600px] rounded-xl border border-slate-200 bg-white overflow-hidden">
                          <iframe 
                            src={currentLesson.pdfUrl.includes('cloudinary') 
                              ? currentLesson.pdfUrl 
                              : `https://docs.google.com/viewer?url=${encodeURIComponent(currentLesson.pdfUrl)}&embedded=true`} 
                            className="w-full h-full"
                            title="PDF Viewer"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button 
                            onClick={() => setShowPdf(false)}
                            className="flex-1 py-2 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm"
                          >
                            إخفاء الملف
                          </button>
                          <a 
                            href={currentLesson.pdfUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 py-2 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-all text-sm text-center"
                          >
                            فتح في نافذة جديدة
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setShowPdf(true)}
                          className="flex-1 py-3 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                        >
                          عرض الملف
                        </button>
                        <a 
                          href={currentLesson.pdfUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl flex items-center justify-center hover:border-primary hover:text-primary transition-all"
                          title="تحميل"
                        >
                          <Download />
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {currentLesson.quiz && currentLesson.quiz.length > 0 && (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h4 className="font-bold mb-4 flex items-center gap-2 text-secondary">
                      <Quiz /> اختبار سريع على الدرس
                    </h4>
                    {existingResult ? (
                      <div className="text-center">
                        <p className="text-2xl font-black text-secondary mb-2">درجتك: {existingResult.score} / {existingResult.total}</p>
                        <p className="text-sm text-slate-500">تم اجتياز الاختبار</p>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowQuiz(true)}
                        className="w-full py-3 bg-secondary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-secondary/90 transition-all shadow-lg shadow-secondary/20"
                      >
                        ابدأ الاختبار
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Comments Section */}
            <LessonComments lessonId={currentLesson.id} user={user} />
          </div>
        </div>
      </div>
    </div>
  );
};

const Leaderboard = memo(({ user }: { user: User | null }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToCollection('users', (data) => {
      const sortedUsers = (data as User[]).sort((a, b) => (b.points || 0) - (a.points || 0));
      setUsers(sortedUsers);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <section className="py-20 container mx-auto px-6 max-w-4xl">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <WorkspacePremium className="text-4xl" />
        </div>
        <h2 className="text-4xl font-black mb-4">لوحة الشرف</h2>
        <p className="text-slate-500 text-lg">أوائل الطلبة الأكثر تفاعلاً وإنجازاً على المنصة</p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 p-4 grid grid-cols-12 gap-4 font-bold text-slate-500 text-sm border-b border-slate-100">
          <div className="col-span-2 text-center">المركز</div>
          <div className="col-span-7">الطالب</div>
          <div className="col-span-3 text-center">النقاط</div>
        </div>
        
        <div className="divide-y divide-slate-100">
          {users
            .filter(u => u.grade === user?.grade)
            .sort((a, b) => (b.points || 0) - (a.points || 0))
            .map((u, idx) => (
            <div key={u.phone} className={`p-4 grid grid-cols-12 gap-4 items-center transition-colors hover:bg-slate-50 ${idx < 3 ? 'bg-amber-50/30' : ''}`}>
              <div className="col-span-2 flex justify-center">
                {idx === 0 ? (
                  <div className="w-10 h-10 bg-amber-400 text-white rounded-full flex items-center justify-center font-black shadow-lg shadow-amber-400/30">1</div>
                ) : idx === 1 ? (
                  <div className="w-10 h-10 bg-slate-300 text-white rounded-full flex items-center justify-center font-black shadow-lg shadow-slate-300/30">2</div>
                ) : idx === 2 ? (
                  <div className="w-10 h-10 bg-amber-700/50 text-white rounded-full flex items-center justify-center font-black shadow-lg shadow-amber-700/20">3</div>
                ) : (
                  <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold">{idx + 1}</div>
                )}
              </div>
              <div className="col-span-7 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-lg">
                  {u.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-lg">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.grade}</p>
                </div>
              </div>
              <div className="col-span-3 text-center">
                <span className="inline-block bg-green-100 text-green-700 font-black px-4 py-2 rounded-xl">
                  {u.points || 0}
                </span>
              </div>
            </div>
          ))}
          {users.filter(u => u.grade === user?.grade).length === 0 && (
            <div className="p-8 text-center text-slate-500">لا يوجد بيانات حتى الآن</div>
          )}
        </div>
      </div>
    </section>
  );
});

const Profile = memo(({ user, exams, courses }: { user: User | null, exams: Exam[], courses: Course[] }) => {
  const [viewingResult, setViewingResult] = useState<any>(null);

  const stats = useMemo(() => {
    let points = 0;
    // Exams: 10 points each (not mini-quizzes)
    const examsCount = user?.examResults?.filter((r: any) => !r.examId.toString().startsWith('lesson_quiz_')).length || 0;
    points += examsCount * 10;
    
    // Mini-quizzes: 5 points each
    const miniQuizzesCount = user?.examResults?.filter((r: any) => r.examId.toString().startsWith('lesson_quiz_')).length || 0;
    points += miniQuizzesCount * 5;
    
    // Lectures: 20 points each (if progress > 70%)
    const completedLessons = user?.completedLessons || [];
    const lessonProgress = user?.lessonProgress || {};
    
    completedLessons.forEach((id: any) => {
      const progress = lessonProgress[id] !== undefined ? lessonProgress[id] : 100;
      if (progress >= 70) {
        points += 20;
      }
    });

    return {
      points,
      lessons: user?.completedLessons?.length || 0,
      exams: examsCount
    };
  }, [user]);

  const chartData = useMemo(() => {
    const results = user?.examResults || [];
    const labels = results.map((r: any) => r.date).reverse();
    const data = results.map((r: any) => (r.score / r.total) * 100).reverse();
    
    return {
      labels,
      datasets: [{
        label: 'نسبة النجاح (%)',
        data,
        borderColor: '#007fff',
        backgroundColor: '#007fff20',
        tension: 0.4
      }]
    };
  }, [user]);

  return (
    <section className="py-10 sm:py-20 container mx-auto px-4 sm:px-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Left Column: Student Info */}
        <div className="flex flex-col gap-6 sm:gap-8">
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl text-center border border-slate-100">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full mx-auto mb-4 sm:mb-6 border-4 border-primary p-1">
              <img className="w-full h-full rounded-full object-cover" src={`https://picsum.photos/seed/${user?.phone}/200/200`} alt="Profile" referrerPolicy="no-referrer" loading="lazy" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black mb-1">{user?.name || 'طالب متميز'}</h2>
            <p className="text-slate-500 mb-4 font-bold text-sm sm:text-base">{user?.grade === '1' ? 'الصف الأول الإعدادي' : user?.grade === '2' ? 'الصف الثاني الإعدادي' : 'الصف الثالث الإعدادي'}</p>
            
            <div className="bg-slate-50 p-4 rounded-2xl mb-6 text-right space-y-2">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-slate-400">كود الطالب:</span>
                <span className="font-black text-primary">{user?.studentId || '---'}</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-slate-400">رقم الهاتف:</span>
                <span className="font-bold">{user?.phone}</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-slate-400">تاريخ الانضمام:</span>
                <span className="font-bold">{user?.joinDate || '---'}</span>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <div className="bg-accent/10 p-2 sm:p-3 rounded-xl text-accent"><Badge /></div>
              <div className="bg-primary/10 p-2 sm:p-3 rounded-xl text-primary"><MilitaryTech /></div>
            </div>
          </div>
          
          <div className="bg-primary p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-primary/20">
            <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp /> إحصائياتي</h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              <div><p className="text-[10px] sm:text-xs opacity-70">النقاط</p><p className="text-xl sm:text-2xl font-black">{stats.points}</p></div>
              <div><p className="text-[10px] sm:text-xs opacity-70">الدروس</p><p className="text-xl sm:text-2xl font-black">{stats.lessons}</p></div>
              <div><p className="text-[10px] sm:text-xs opacity-70">الامتحانات</p><p className="text-xl sm:text-2xl font-black">{stats.exams}</p></div>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <h3 className="text-xl sm:text-2xl font-black mb-6">تطور الأداء</h3>
            <div className="w-full overflow-x-auto">
              {user?.examResults && user.examResults.length > 0 ? (
                <div className="min-w-[300px]">
                  <Line data={chartData} options={{ responsive: true, maintainAspectRatio: true }} />
                </div>
              ) : (
                <p className="text-center text-slate-400 py-8">لا توجد بيانات كافية للرسم البياني</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Column: Statistics/Results */}
        <div className="flex flex-col gap-8">
          {viewingResult ? (
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black">مراجعة: {viewingResult.examTitle}</h3>
                <button onClick={() => setViewingResult(null)} className="text-primary font-bold">عودة</button>
              </div>
              <div className="space-y-8">
                {viewingResult.answers.map((ans: any, idx: number) => {
                  let question: any = null;
                  
                  // Try to find in main exams
                  const exam = exams.find(e => e.id === viewingResult.examId);
                  if (exam) {
                    question = exam.questions.find(q => q.id === ans.questionId);
                  } else {
                    // Try to find in lesson quizzes
                    const lessonId = viewingResult.examId.replace('lesson_quiz_', '');
                    for (const course of courses) {
                      const lesson = course.lessons.find(l => l.id === lessonId);
                      if (lesson && lesson.quiz) {
                        question = lesson.quiz.find(q => q.id === ans.questionId);
                        if (question) break;
                      }
                    }
                  }

                  if (!question) return null;

                  return (
                    <div key={idx} className={`p-6 rounded-2xl border-2 ${ans.isCorrect ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'}`}>
                      <p className="font-bold mb-4">{idx + 1}. {question.text}</p>
                      <div className="grid gap-2">
                        {question.type === 'text' ? (
                          <div className="space-y-4">
                            <div>
                              <span className="text-xs text-slate-400 font-bold block mb-1">إجابتك:</span>
                              <p className={`p-4 rounded-xl border-2 font-bold ${ans.isCorrect ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700'}`}>
                                {ans.selectedOption || 'لم يتم الحل'}
                              </p>
                            </div>
                            {!ans.isCorrect && question.correctAnswer && (
                              <div>
                                <span className="text-xs text-slate-400 font-bold block mb-1">الإجابة الصحيحة:</span>
                                <p className="p-4 rounded-xl border-2 bg-green-50 border-green-500 text-green-700 font-bold">
                                  {question.correctAnswer}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          question.options?.map((opt, optIdx) => {
                            const isSelected = String(ans.selectedOption) === String(optIdx);
                            const isActuallyCorrect = String(question.correctAnswer) === String(optIdx);
                            
                            return (
                              <div 
                                key={optIdx} 
                                className={`p-3 rounded-xl text-sm flex justify-between items-center ${
                                  isActuallyCorrect 
                                    ? 'bg-green-500 text-white font-bold' 
                                    : isSelected && !ans.isCorrect
                                    ? 'bg-red-500 text-white font-bold'
                                    : 'bg-white border border-slate-100'
                                }`}
                              >
                                <span>{opt}</span>
                                {isActuallyCorrect && <span className="text-xs bg-white/20 px-2 py-1 rounded">الإجابة الصحيحة</span>}
                                {isSelected && !ans.isCorrect && <span className="text-xs bg-white/20 px-2 py-1 rounded">إجابتك</span>}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                <h3 className="text-2xl font-black mb-6">نتائج الامتحانات</h3>
                <div className="flex flex-col gap-4">
                  {user?.examResults && user.examResults.length > 0 ? (
                    user.examResults.map((result, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm"><Quiz /></div>
                        <div className="flex-1">
                          <p className="font-bold">{result.examTitle}</p>
                          <p className="text-xs text-slate-400">{result.date}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <span className={`font-bold ${result.score / result.total >= 0.5 ? 'text-green-500' : 'text-red-500'}`}>
                            {result.score} / {result.total}
                          </span>
                          <button 
                            onClick={() => setViewingResult(result)}
                            className="text-xs bg-primary text-white px-3 py-1 rounded-lg hover:bg-primary/80 transition-colors"
                          >
                            مراجعة الأسئلة
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-slate-400 py-8">لم تقم بأداء أي امتحانات بعد</p>
                  )}
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                <h3 className="text-2xl font-black mb-6">الدروس المكتملة</h3>
                <div className="flex flex-col gap-4">
                  {user?.completedLessons && user.completedLessons.length > 0 ? (
                    user.completedLessons.map((lessonId, i) => {
                      // Try to find the lesson title from courses
                      let lessonTitle = "درس تعليمي";
                      courses.forEach(c => {
                        const lesson = c.lessons.find(l => l.id === lessonId);
                        if (lesson) lessonTitle = lesson.title;
                      });
                      
                      return (
                        <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-secondary shadow-sm"><PlayCircle /></div>
                          <div className="flex-1">
                            <p className="font-bold">{lessonTitle}</p>
                            <p className="text-xs text-slate-400">تمت المشاهدة بنجاح</p>
                          </div>
                          <span className="text-green-500 font-bold">✓ مكتمل</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-slate-400 py-8">لم تكتمل أي دروس بعد</p>
                  )}
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                <h3 className="text-2xl font-black mb-6">الجوائز المحققة</h3>
                <div className="grid grid-cols-4 gap-4">
                  {stats.points >= 100 && <div className="aspect-square bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 text-4xl shadow-inner"><WorkspacePremium /></div>}
                  {stats.lessons >= 1 && <div className="aspect-square bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 text-4xl shadow-inner"><Badge /></div>}
                  {stats.exams >= 1 && <div className="aspect-square bg-green-50 rounded-2xl flex items-center justify-center text-green-500 text-4xl shadow-inner"><MilitaryTech /></div>}
                  {stats.points === 0 && <p className="col-span-4 text-center text-slate-400 py-4">ابدأ التعلم لتحصل على الجوائز!</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
});

const Login = ({ setPage, onLogin }: { setPage: (p: Page) => void, onLogin: (u: User) => void }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorModal, setErrorModal] = useState<{ show: boolean; message: string; type: 'error' | 'redirect' }>({ show: false, message: '', type: 'error' });
  
  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem('login_form_data');
    return saved ? JSON.parse(saved) : { name: '', phone: '', parentPhone: '', grade: '', gender: '', password: '', confirmPassword: '' };
  });

  useEffect(() => {
    sessionStorage.setItem('login_form_data', JSON.stringify(formData));
  }, [formData]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (isRegister) {
      if (!formData.name || !formData.phone || !formData.parentPhone || !formData.grade || !formData.gender || !formData.password || !formData.confirmPassword) {
        setErrorModal({ show: true, message: 'يرجى ملء جميع الخانات المطلوبة لإنشاء الحساب', type: 'error' });
        return;
      }
      if (formData.phone.length !== 11 || formData.parentPhone.length !== 11) {
        setErrorModal({ show: true, message: 'رقم الهاتف يجب أن يكون 11 رقم (مثال: 01012345678)', type: 'error' });
        return;
      }
      if (formData.password.length < 8) {
        setErrorModal({ show: true, message: 'كلمة المرور يجب أن تكون 8 أرقام أو حروف على الأقل لضمان أمان حسابك', type: 'error' });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setErrorModal({ show: true, message: 'كلمة المرور وتأكيدها غير متطابقين، يرجى إعادة كتابتهما بعناية', type: 'error' });
        return;
      }
    } else {
      if (!formData.phone || !formData.password) {
        setErrorModal({ show: true, message: 'يرجى إدخال رقم الهاتف وكلمة المرور لتسجيل الدخول', type: 'error' });
        return;
      }
    }

    if (isRegister) {
      // Check if user already exists via Firestore
      try {
        const existingUser = await getDocument('users', formData.phone);
        if (existingUser) {
          setErrorModal({ show: true, message: 'هذا الرقم مسجل بالفعل، يرجى تسجيل الدخول بدلاً من إنشاء حساب جديد', type: 'error' });
          setIsRegister(false);
          return;
        }
      } catch (e) {
        console.error("Error checking user existence", e);
      }
      
      const newUser: User = {
        name: formData.name,
        phone: formData.phone,
        parentPhone: formData.parentPhone,
        grade: formData.grade,
        gender: formData.gender,
        password: formData.password,
        studentId: `STU-${Math.floor(100000 + Math.random() * 900000)}`,
        joinDate: new Date().toISOString().split('T')[0],
        completedLessons: [],
        examResults: []
      };
      
      // Save to Firestore
      try {
        await saveDocument('users', newUser.phone, newUser);
        sessionStorage.removeItem('login_form_data');
        onLogin(newUser);
        setPage('profile');
      } catch (e) {
        setErrorModal({ show: true, message: 'فشل إنشاء الحساب، يرجى التأكد من اتصالك بالإنترنت والمحاولة مرة أخرى', type: 'error' });
      }

    } else {
      // Login mode
      try {
        const user = await getDocument<User>('users', formData.phone);
        if (user) {
          if (user.password === formData.password) {
             sessionStorage.removeItem('login_form_data');
             onLogin(user);
             setPage('profile');
          } else {
             setErrorModal({ show: true, message: 'كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى', type: 'error' });
          }
        } else {
          setErrorModal({ 
            show: true, 
            message: 'رقم الهاتف غير مسجل، برجاء إنشاء حساب أولاً', 
            type: 'redirect' 
          });
        }
      } catch (e) {
        setErrorModal({ show: true, message: 'حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة لاحقاً', type: 'error' });
      }
    }
  };

  return (
    <section className="py-20 flex items-center justify-center min-h-[80vh] relative">
      <AnimatePresence>
        {errorModal.show && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center"
            >
              <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4">
                <Close className="text-3xl" />
              </div>
              <h3 className="text-xl font-black mb-2">تنبيه</h3>
              <p className="text-slate-600 mb-6">{errorModal.message}</p>
              <button 
                onClick={() => {
                  setErrorModal({ ...errorModal, show: false });
                  if (errorModal.type === 'redirect') {
                    setIsRegister(true);
                  }
                }}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                تم
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100"
      >
        <div className="text-center mb-10">
          <div className="bg-primary w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-primary/30">
            <School className="text-4xl" />
          </div>
          <h2 className="text-3xl font-black">{isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</h2>
          <p className="text-slate-500 mt-2">
            {isRegister ? 'انضم إلينا وابدأ رحلة التفوق' : 'أهلاً بك مجدداً في منصة الجوكر'}
          </p>
        </div>
        
        <div className="flex flex-col gap-5">
          {isRegister && (
            <div className="flex flex-col gap-2">
              <label className="font-bold text-sm">الاسم رباعي</label>
              <input 
                className="px-6 py-4 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-right" 
                type="text" 
                placeholder="أدخل اسمك بالكامل" 
                required 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="font-bold text-sm">رقم الهاتف</label>
            <input 
              className="px-6 py-4 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-right" 
              type="tel" 
              placeholder="01xxxxxxxxx" 
              maxLength={11}
              required 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/[^0-9]/g, '')})}
            />
          </div>

          {isRegister && (
            <div className="flex flex-col gap-2">
              <label className="font-bold text-sm">رقم ولي الأمر</label>
              <input 
                className="px-6 py-4 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-right" 
                type="tel" 
                placeholder="01xxxxxxxxx" 
                maxLength={11}
                required 
                value={formData.parentPhone}
                onChange={(e) => setFormData({...formData, parentPhone: e.target.value.replace(/[^0-9]/g, '')})}
              />
            </div>
          )}

          {isRegister && (
            <>
              <div className="flex flex-col gap-2">
                <label className="font-bold text-sm">السنة الدراسية</label>
                <select 
                  className="px-6 py-4 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-right appearance-none cursor-pointer" 
                  required
                  value={formData.grade}
                  onChange={(e) => setFormData({...formData, grade: e.target.value})}
                >
                  <option value="">اختر السنة الدراسية</option>
                  <option value="1">الصف الأول الإعدادي</option>
                  <option value="2">الصف الثاني الإعدادي</option>
                  <option value="3">الصف الثالث الإعدادي</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-bold text-sm">النوع</label>
                <select 
                  className="px-6 py-4 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-right appearance-none cursor-pointer" 
                  required
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                >
                  <option value="">اختر النوع</option>
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>
            </>
          )}

          <div className="flex flex-col gap-2">
            <label className="font-bold text-sm">كلمة المرور</label>
            <div className="relative">
              <input 
                className="w-full px-6 py-4 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-right pl-14" 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                required 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="flex flex-col gap-2">
              <label className="font-bold text-sm">تأكيد كلمة المرور</label>
              <div className="relative">
                <input 
                  className="w-full px-6 py-4 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-right pl-14" 
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  required 
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </button>
              </div>
            </div>
          )}

          <button type="button" onClick={handleSubmit} className="w-full py-4 bg-primary text-white font-black rounded-xl shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all mt-4">
            {isRegister ? 'تسجيل' : 'دخول'}
          </button>
        </div>

        <p className="text-center mt-8 text-slate-500 text-sm">
          {isRegister ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟'} 
          <button 
            onClick={() => setIsRegister(!isRegister)} 
            className="text-primary font-bold mr-1"
          >
            {isRegister ? 'سجل دخول' : 'انشئ حساب'}
          </button>
        </p>
      </motion.div>
    </section>
  );
};

const Curriculum = memo(({ courses, selectedGrade, onSelectLesson }: { courses: Course[], selectedGrade: string, onSelectLesson: (courseId: string, lessonIndex: number) => void }) => {
  const gradeTitle = selectedGrade === '1' ? 'الصف الأول الإعدادي' : selectedGrade === '2' ? 'الصف الثاني الإعدادي' : 'الصف الثالث الإعدادي';
  const gradeCourses = courses.filter(c => (c.grade === selectedGrade || !c.grade) && c.isPublished); // Fallback to show courses without grade

  return (
    <section className="py-20 container mx-auto px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-black mb-4 text-center">منهج {gradeTitle}</h2>
        <p className="text-slate-500 text-center mb-12">خطة دراسية متكاملة تغطي التاريخ والجغرافيا</p>
        
        <div className="flex flex-col gap-12">
          {gradeCourses.length === 0 ? (
            <div className="text-center text-slate-500 py-12 bg-white rounded-3xl shadow-sm border border-slate-100">
              لا توجد وحدات دراسية متاحة حالياً لهذا الصف.
            </div>
          ) : (
            gradeCourses.map((course, i) => (
              <div key={course.id} className={`bg-white p-8 rounded-3xl shadow-xl border-r-8 ${i % 2 === 0 ? 'border-secondary' : 'border-primary'}`}>
                <h3 className={`text-2xl font-black mb-6 flex items-center gap-3 ${i % 2 === 0 ? 'text-secondary' : 'text-primary'}`}>
                  {i % 2 === 0 ? <Map /> : <HistoryEdu />} {course.title}
                </h3>
                <div className="flex flex-col gap-4">
                  {(() => {
                    const publishedLessons = course.lessons.filter(l => l.isPublished);
                    if (publishedLessons.length === 0) {
                      return <p className="text-slate-400 text-sm">لا توجد دروس متاحة في هذه الوحدة.</p>;
                    }
                    return publishedLessons.map((lesson, lessonIndex) => (
                      <div key={lessonIndex} onClick={() => onSelectLesson(course.id, lessonIndex)} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer">
                        <span className="font-bold">{lesson.title}</span>
                        <PlayCircle className={i % 2 === 0 ? 'text-secondary' : 'text-primary'} />
                      </div>
                    ));
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
});

const LoadingScreen = () => (
  <motion.div 
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.5 }}
    className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center"
  >
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center gap-6"
    >
      <motion.img 
        initial={{ rotate: -10 }}
        animate={{ rotate: 10 }}
        transition={{ repeat: Infinity, repeatType: "reverse", duration: 1, ease: "easeInOut" }}
        src="https://i.postimg.cc/yYsGD8cG/Logo.png" 
        alt="الجوكر" 
        referrerPolicy="no-referrer"
        className="w-32 h-32 object-contain drop-shadow-2xl"
      />
      <h1 className="text-4xl font-black text-primary tracking-tight">الجوكر 🃏</h1>
      <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden mt-4">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="h-full bg-primary"
        />
      </div>
    </motion.div>
  </motion.div>
);

// --- Main App ---

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentPage = useMemo(() => {
    const path = location.pathname.replace(/^\//, '').split('?')[0];
    if (path === '' || path === 'home') return 'home';
    return (path as Page) || 'home';
  }, [location.pathname]);

  const setCurrentPage = (page: Page) => {
    const targetPath = page === 'home' ? '' : page;
    const currentPath = location.pathname.replace(/^\//, '').split('?')[0];
    if (currentPath !== targetPath) {
      navigate(`/${targetPath}${location.search}`);
    }
  };

  const [isLoading, setIsLoading] = useState(() => {
    return !sessionStorage.getItem('joker_loaded');
  });
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('joker_user');
    console.log('Initializing user from localStorage:', savedUser);
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(() => localStorage.getItem('joker_selected_course'));
  const [selectedExamId, setSelectedExamId] = useState<string | null>(() => localStorage.getItem('joker_selected_exam'));
  const [selectedGrade, setSelectedGrade] = useState<string>(() => localStorage.getItem('joker_selected_grade') || '1');
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<number | null>(() => {
    const saved = localStorage.getItem('joker_selected_lesson');
    return saved ? parseInt(saved) : null;
  });

  useEffect(() => {
    if (selectedCourseId) localStorage.setItem('joker_selected_course', selectedCourseId);
    else localStorage.removeItem('joker_selected_course');
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedExamId) localStorage.setItem('joker_selected_exam', selectedExamId);
    else localStorage.removeItem('joker_selected_exam');
  }, [selectedExamId]);

  useEffect(() => {
    localStorage.setItem('joker_selected_grade', selectedGrade);
  }, [selectedGrade]);

  useEffect(() => {
    if (selectedLessonIndex !== null) localStorage.setItem('joker_selected_lesson', selectedLessonIndex.toString());
    else localStorage.removeItem('joker_selected_lesson');
  }, [selectedLessonIndex]);

  useEffect(() => {
    localStorage.setItem('joker_page', currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false);
        sessionStorage.setItem('joker_loaded', 'true');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    // Safety fallback for data loading - ensure UI isn't stuck if Firestore is slow or empty
    const timer = setTimeout(() => {
      setIsDataLoaded(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribeCourses = subscribeToCollection('courses', (data) => {
      setCourses(data as Course[]);
      setIsDataLoaded(true);
    });
    const unsubscribeExams = subscribeToCollection('exams', (data) => {
      setExams(data as Exam[]);
      setIsDataLoaded(true);
    });

    return () => {
      unsubscribeCourses();
      unsubscribeExams();
    };
  }, []);

  useEffect(() => {
    const unsubscribeNotifications = subscribeToCollection('notifications', (data) => {
      const userNotifications = data.filter((n: any) => !n.userId || (user && n.userId === user.phone));
      setNotifications(userNotifications.sort((a: any, b: any) => b.timestamp - a.timestamp));
    });
    return () => unsubscribeNotifications();
  }, [user]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  useEffect(() => {
    if (!user || courses.length === 0 || exams.length === 0) return;

    let updatedUser = false;
    const currentSeenLessons = new Set(user.seenLessonIds || []);
    const currentSeenExams = new Set(user.seenExamIds || []);
    
    const userCourses = courses.filter(c => c.grade === user.grade);
    const userExams = exams.filter(e => e.isPublished !== false);

    const newNotifications: any[] = [];

    userCourses.forEach(course => {
      course.lessons.forEach(lesson => {
        if (!currentSeenLessons.has(lesson.id)) {
          currentSeenLessons.add(lesson.id);
          updatedUser = true;
          // Only notify if the user already had some seen lessons (not first time)
          if (user.seenLessonIds && user.seenLessonIds.length > 0) {
            newNotifications.push({
              id: Date.now().toString() + Math.random(),
              userId: user.phone,
              message: `تم إضافة درس جديد: ${lesson.title} في دورة ${course.title}`,
              timestamp: Date.now(),
              read: false
            });
          }
        }
      });
    });

    userExams.forEach(exam => {
      if (!currentSeenExams.has(exam.id)) {
        currentSeenExams.add(exam.id);
        updatedUser = true;
        // Only notify if the user already had some seen exams (not first time)
        if (user.seenExamIds && user.seenExamIds.length > 0) {
          newNotifications.push({
            id: Date.now().toString() + Math.random(),
            userId: user.phone,
            message: `تم إضافة امتحان جديد: ${exam.title}`,
            timestamp: Date.now(),
            read: false
          });
        }
      }
    });

    if (updatedUser) {
      const newUser = {
        ...user,
        seenLessonIds: Array.from(currentSeenLessons),
        seenExamIds: Array.from(currentSeenExams)
      };
      
      // Save notifications to DB
      const saveNotifications = async () => {
        try {
          for (const n of newNotifications) {
            await saveDocument('notifications', n.id, n);
          }
          await saveDocument('users', newUser.phone, newUser);
          setUser(newUser);
          localStorage.setItem('joker_user', JSON.stringify(newUser));
        } catch (e) {
          console.error('Failed to save notifications or user', e);
        }
      };
      
      saveNotifications();
    }
  }, [courses, exams, user]);

  const handleLogin = async (u: User) => {
    setUser(u);
    localStorage.setItem('joker_user', JSON.stringify(u));
    
    // Update user on server
    try {
      await saveDocument('users', u.phone, u);
    } catch (e) {
      console.error('Failed to save user to Firestore', e);
    }
  };

  // Heartbeat to update lastSeen and check if user still exists
  useEffect(() => {
    if (!user) return;

    // 1. Subscribe to user document for real-time updates (exam resets, etc.)
    const unsubscribe = onSnapshot(doc(db, 'users', user.phone), (snapshot) => {
      console.log('Snapshot update for user:', user.phone, 'exists:', snapshot.exists());
      if (!snapshot.exists()) {
        console.warn('User document not found, logging out.');
        setUser(null);
        localStorage.removeItem('joker_user');
        setCurrentPage('login');
        return;
      }
      
      const remoteUser = { id: snapshot.id, ...snapshot.data() } as unknown as User;
      
      // Check for updates from admin (e.g. exam reset)
      const localExams = user.examResults || [];
      const remoteExams = remoteUser.examResults || [];
      
      // Simple check: if lengths differ, or if specific exam IDs are missing in remote
      const needsUpdate = localExams.length !== remoteExams.length || 
                          localExams.some(l => !remoteExams.find(r => r.examId === l.examId));

      if (needsUpdate) {
        console.log('Syncing user data from Firestore...');
        setUser({ ...remoteUser });
        localStorage.setItem('joker_user', JSON.stringify(remoteUser));
      }
    });

    // 2. Periodic heartbeat to update lastSeen
    const updatePresence = async () => {
      try {
        await updateDocument('users', user.phone, { lastSeen: Date.now() });
      } catch (e) {
        console.error("Heartbeat failed", e);
      }
    };

    // Update immediately on mount/login
    updatePresence();

    // Update every 30 seconds (less frequent for Firestore)
    const interval = setInterval(updatePresence, 30000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user?.phone]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('joker_user');
    setCurrentPage('home');
  };

  // Protected view check
  const renderPage = () => {
    const dataRequiredPages: Page[] = ['courses', 'exams', 'profile', 'exam-view', 'course-view', 'curriculum', 'leaderboard'];
    
    // Only show loading for specific item views to avoid blocking the whole app
    if (!isDataLoaded && (currentPage === 'exam-view' || currentPage === 'course-view')) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background-light">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-primary font-black text-xl">جاري تحميل البيانات...</p>
          </div>
        </div>
      );
    }

    if (dataRequiredPages.includes(currentPage) && !user && currentPage !== 'leaderboard') {
      return <Login setPage={setCurrentPage} onLogin={handleLogin} />;
    }

    switch (currentPage) {
      case 'home': return <Home setPage={setCurrentPage} onViewCurriculum={(g) => { setSelectedGrade(g); setCurrentPage('curriculum'); }} />;
      case 'courses': return <Courses setPage={setCurrentPage} courses={courses} onSelectCourse={(id) => { setSelectedCourseId(id); setSelectedLessonIndex(null); setCurrentPage('course-view'); }} user={user} />;
      case 'exams': return <Exams setPage={setCurrentPage} exams={exams} onSelectExam={(id) => { setSelectedExamId(id); setCurrentPage('exam-view'); }} user={user} />;
      case 'leaderboard': return <Leaderboard user={user} />;
      case 'profile': return <Profile user={user} exams={exams} courses={courses} />;
      case 'login': return <Login setPage={setCurrentPage} onLogin={handleLogin} />;
      case 'curriculum': return <Curriculum courses={courses} selectedGrade={selectedGrade} onSelectLesson={(courseId, lessonIndex) => {
        setSelectedCourseId(courseId);
        setSelectedLessonIndex(lessonIndex);
        setCurrentPage('course-view');
      }} />;
      case 'exam-view': {
        const exam = exams.find(e => e.id === selectedExamId);
        if (!exam && isDataLoaded && exams.length > 0) {
          setTimeout(() => setCurrentPage('exams'), 0);
          return null;
        }
        return <ExamView onBack={() => setCurrentPage('exams')} exam={exam || null} user={user} onUpdateUser={handleLogin} />;
      }
      case 'course-view': {
        const course = courses.find(c => c.id === selectedCourseId);
        if (!course && isDataLoaded && courses.length > 0) {
          setTimeout(() => setCurrentPage('courses'), 0);
          return null;
        }
        return <CourseView onBack={() => setCurrentPage('courses')} course={course || null} user={user} onUpdateUser={handleLogin} initialLessonIndex={selectedLessonIndex ?? undefined} />;
      }
      default: return <Home setPage={setCurrentPage} onViewCurriculum={(g) => { setSelectedGrade(g); setCurrentPage('curriculum'); }} />;
    }
  };

  return (
    <div className="min-h-screen bg-background-light font-display relative">
      <AnimatePresence>
        {isLoading && <LoadingScreen />}
      </AnimatePresence>
      <BackgroundDecorations />
      <Navbar 
        currentPage={currentPage} 
        setPage={setCurrentPage} 
        toggleMenu={() => setIsMobileMenuOpen(true)} 
        user={user}
        onLogout={handleLogout}
        notifications={notifications}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
      />
      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        setPage={setCurrentPage} 
        close={() => setIsMobileMenuOpen(false)} 
        user={user}
        onLogout={handleLogout}
        notifications={notifications}
        setShowNotifications={setShowNotifications}
      />
      
      <main className="relative">
        {showNotifications && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black">الإشعارات</h2>
                <button onClick={() => setShowNotifications(false)}><Close className="text-2xl" /></button>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center text-slate-500">لا توجد إشعارات جديدة</p>
                ) : (
                  notifications.map((n: any) => (
                    <div key={n.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-sm text-slate-700">{n.message}</p>
                      <p className="text-xs text-slate-400 mt-2">{new Date(n.timestamp).toLocaleDateString('ar-EG')}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {currentPage !== 'login' && currentPage !== 'exam-view' && currentPage !== 'course-view' && (
        <footer className="bg-slate-900 text-white py-12 relative z-10">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-4 gap-12 border-b border-slate-800 pb-12 mb-12">
              <div className="col-span-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-primary p-2 rounded-lg text-white">
                    <School className="text-2xl" />
                  </div>
                  <h4 className="text-2xl font-black">الجوكر 🃏</h4>
                </div>
                <p className="text-slate-400 max-w-md leading-relaxed">
                  المنصة التعليمية الأولى في مصر المتخصصة في مادة الدراسات الاجتماعية للمرحلة الإعدادية.
                </p>
              </div>
              <div>
                <h5 className="font-bold mb-6">روابط سريعة</h5>
                <ul className="flex flex-col gap-4 text-slate-400">
                  <li><button onClick={() => setCurrentPage('home')} className="hover:text-primary text-right">الرئيسية</button></li>
                  <li><button onClick={() => setCurrentPage('courses')} className="hover:text-primary text-right">الدورات</button></li>
                  <li><button onClick={() => setCurrentPage('exams')} className="hover:text-primary text-right">الامتحانات</button></li>
                </ul>
              </div>
              <div>
                <h5 className="font-bold mb-6">تابعنا</h5>
                <div className="flex gap-4">
                  <a className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors" href="#"><SocialLeaderboard /></a>
                  <a className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors" href="#"><VideoLibrary /></a>
                  <a className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors" href="#"><Chat /></a>
                </div>
              </div>
            </div>
            <div className="text-center text-slate-500 text-sm">
              <p>جميع الحقوق محفوظة لمنصة الجوكر التعليمية © 2024</p>
            </div>
          </div>
        </footer>
      )}
      
      {/* AI Chatbot */}
      {user && <AIChatbot />}
    </div>
  );
}
