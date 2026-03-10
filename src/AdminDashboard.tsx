import { useState, ChangeEvent, useEffect, FormEvent, useMemo } from "react";
import { subscribeToCollection, saveDocument, deleteDocument } from './services/db';
import { storage } from './firebase';
import { ref, uploadBytesResumable, uploadBytes, getDownloadURL } from "firebase/storage";
import { Link } from 'react-router-dom';
import Notifications from './components/Notifications';
import { StudentQuestions } from './components/StudentQuestions';
import { motion, AnimatePresence } from "motion/react";
import { 
  AccountCircle, 
  Quiz, 
  TrendingUp, 
  VideoLibrary,
  HistoryEdu,
  Search,
  Close,
  PlayCircle,
  MenuBook,
  AutoAwesome,
  School,
  MilitaryTech
} from "./components/Icons";

type AdminTab = 'students' | 'courses' | 'exams' | 'edit-exam' | 'edit-course' | 'stats' | 'notifications' | 'questions';

type Question = {
  id: string;
  text: string;
  image?: string;
  type?: 'multiple-choice' | 'true-false' | 'text';
  options: string[];
  correctAnswer: number | string;
  score: number;
};

type Exam = {
  id: string;
  title: string;
  questions: Question[];
  duration?: number;
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

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('tab') as AdminTab) || 'students';
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [selectedResult, setSelectedResult] = useState<{student: any, result: any} | null>(null);
  const [newScore, setNewScore] = useState<number | ''>(0);

  const handleViewResult = (student: any, result: any) => {
    setSelectedResult({ student, result });
    setNewScore(result.score);
  };

  const handleUpdateScore = async () => {
    if (!selectedResult) return;
    
    const { student, result } = selectedResult;
    
    // Update local state
    const updatedResults = student.examResults.map((r: any) => 
      r.examId === result.examId ? { ...r, score: newScore } : r
    );
    
    const updatedStudent = { ...student, examResults: updatedResults };
    
    // Update in list
    setStudents(students.map(s => s.phone === student.phone ? updatedStudent : s));
    
    // Save to Firestore
    try {
      await saveDocument('users', updatedStudent.phone, updatedStudent);
      alert("تم تحديث الدرجة بنجاح!");
      setSelectedResult(null);
    } catch (e) {
      console.error("Failed to update score", e);
      alert("فشل تحديث الدرجة");
    }
  };
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [activeTab]);
  
  // --- Students State ---
  const [students, setStudents] = useState<any[]>([]);

  // --- Courses State ---
  const [courses, setCourses] = useState<Course[]>([]);
  const [newCourse, setNewCourse] = useState({ title: "", description: "", image: "", grade: "1" });
  const [newLesson, setNewLesson] = useState({ 
    title: "", 
    duration: "", 
    url: "", 
    type: 'youtube' as 'youtube' | 'local',
    pdfUrl: ""
  });
  const [lessonQuizQuestions, setLessonQuizQuestions] = useState<Question[]>([]);
  const [lessonQuizDuration, setLessonQuizDuration] = useState<number | ''>(15);
  const [lessonQuizTotalScore, setLessonQuizTotalScore] = useState<number | ''>(10);
  const [showQuizSettings, setShowQuizSettings] = useState(false);
  const [editingLessonIndex, setEditingLessonIndex] = useState<number | null>(null);

  // --- Exams State ---
  const [exams, setExams] = useState<Exam[]>([]);
  const [newExamTitle, setNewExamTitle] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isUploading, _setIsUploading] = useState(false);
  const setIsUploading = (value: boolean) => {
    _setIsUploading(value);
  };
  const [uploadProgress, setUploadProgress] = useState(0);

  // --- Persistence ---
  useEffect(() => {
    setIsUploading(false);
    const unsubscribeCourses = subscribeToCollection('courses', (data) => {
      setCourses(data as Course[]);
    });
    const unsubscribeExams = subscribeToCollection('exams', (data) => {
      setExams(data as Exam[]);
    });

    setIsLoaded(true);

    return () => {
      unsubscribeCourses();
      unsubscribeExams();
    };
  }, []);

  useEffect(() => {
    let unsubscribeUsers = () => {};
    
    // Only subscribe to users if we are on the students or stats tab
    if (activeTab === 'students' || activeTab === 'stats') {
      unsubscribeUsers = subscribeToCollection('users', (data) => {
        setStudents(data);
      });
    }

    return () => {
      unsubscribeUsers();
    };
  }, [activeTab]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>, onComplete: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // --- إعدادات Cloudinary ---
    const CLOUD_NAME = "dp52lwhke"; 
    const UPLOAD_PRESET = "ml_default"; 

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      // مهم جداً للسماح برفع الفيديوهات والـ PDF والصور في نفس الوقت
      formData.append('resource_type', 'auto');

      const xhr = new XMLHttpRequest();
      // نستخدم /auto/upload لضمان قبول كل أنواع الملفات
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(Math.round(progress));
        }
      };

      xhr.onload = () => {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status === 200) {
          onComplete(response.secure_url);
          setIsUploading(false);
          setUploadProgress(0);
          alert("تم رفع الملف بنجاح! ✅");
        } else {
          console.error("Cloudinary Error Details:", response);
          let errorMsg = "فشل الرفع.";
          
          if (response.error?.message.includes("Upload preset")) {
            errorMsg = `خطأ: الـ Upload Preset اللي اسمه (${UPLOAD_PRESET}) مش موجود في حسابك أو مش معمول Unsigned. يرجى التأكد من الإعدادات في Cloudinary.`;
          } else {
            errorMsg = `فشل الرفع: ${response.error?.message || "خطأ غير معروف"}`;
          }
          
          alert(errorMsg);
          setIsUploading(false);
          setUploadProgress(0);
        }
      };

      xhr.onerror = () => {
        alert("حدث خطأ في الاتصال بالإنترنت.");
        setIsUploading(false);
        setUploadProgress(0);
      };

      xhr.send(formData);
    } catch (error) {
      alert("حدث خطأ غير متوقع.");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    console.log("handleFileChange called");
    const file = e.target.files?.[0];
    console.log("File selected:", file);
    if (file) {
      // For smaller files like question images, we can still use base64 if needed, 
      // but let's stick to storage for consistency if possible.
      // For now, keeping this for quick question images.
      if (file.size > 1 * 1024 * 1024) {
        alert("حجم الملف كبير جداً للرفع المباشر! يرجى استخدام خاصية الرفع في الأعلى للملفات الكبيرة.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteStudent = async (phone: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الطالب "${name}" نهائياً؟ سيتم حذف جميع بياناته ونتائجه.`)) {
      try {
        await deleteDocument('users', phone);
        const updatedStudents = students.filter(s => s.phone !== phone);
        setStudents(updatedStudents);
      } catch (e) {
        alert('فشل حذف الطالب');
      }
    }
  };

  const isOnline = (lastSeen?: number) => {
    if (!lastSeen) return false;
    return Date.now() - lastSeen < 60000; // 1 minute threshold
  };

  const filteredStudents = students.filter(s => s.phone && s.phone.includes(searchTerm));

  const handleResetExam = async (studentId: string | number, examId: number) => {
    const student = students.find(s => s.phone === studentId || s.id === studentId);
    if (!student) return;

    const updatedStudent = {
      ...student,
      examResults: student.examResults ? student.examResults.filter((e: any) => e.examId !== examId) : []
    };

    try {
      await saveDocument('users', updatedStudent.phone, updatedStudent);
      
      const updatedStudents = students.map(s => s.phone === student.phone ? updatedStudent : s);
      setStudents(updatedStudents);
      alert(`تمت إعادة الامتحان بنجاح للطالب`);
    } catch (e) {
      alert('فشل إعادة الامتحان');
    }
  };

  const handleAddCourse = async () => {
    if (newCourse.title) {
      const course: Course = { 
        id: Date.now().toString(), 
        ...newCourse, 
        image: newCourse.image || `https://picsum.photos/seed/${Date.now()}/400/200`,
        lessons: [] 
      };
      setCourses([...courses, course]);
      await saveDocument('courses', course.id, course);
      setNewCourse({ title: "", description: "", image: "", grade: "1" });
      alert("تمت إضافة الدورة بنجاح!");
    }
  };

  const handleRemoveCourse = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذه الدورة؟")) {
      const updated = courses.filter(c => c.id !== id);
      setCourses(updated);
      await deleteDocument('courses', id);
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setActiveTab('edit-course');
  };

  const handleAddLesson = async () => {
    if (!editingCourse) {
      alert("خطأ: لم يتم تحديد الدورة.");
      return;
    }
    if (!newLesson.title) {
      alert("يرجى إدخال عنوان الدرس.");
      return;
    }
    if (!newLesson.url && newLesson.type !== 'local') {
      alert("يرجى إدخال رابط الفيديو.");
      return;
    }
    if (!newLesson.url && newLesson.type === 'local') {
      alert("يرجى رفع الفيديو أولاً.");
      return;
    }

    const lesson: Lesson = { 
      id: editingLessonIndex !== null ? editingCourse.lessons[editingLessonIndex].id : Date.now().toString(), 
      ...newLesson,
      isPublished: true, 
      quiz: lessonQuizQuestions.length > 0 ? lessonQuizQuestions : null,
      quizDuration: lessonQuizQuestions.length > 0 ? (Number(lessonQuizDuration) || 15) : null,
      quizTotalScore: lessonQuizQuestions.length > 0 ? (Number(lessonQuizTotalScore) || 10) : null
    };

    // Remove null values to avoid cluttering the database, but ensure no undefined values are passed
    const cleanedLesson = Object.fromEntries(
      Object.entries(lesson).filter(([_, v]) => v !== null && v !== undefined)
    ) as unknown as Lesson;

    try {
      setEditingCourse(prev => {
        if (!prev) return prev;
        
        let updatedLessons = [...prev.lessons];
        if (editingLessonIndex !== null) {
          updatedLessons[editingLessonIndex] = cleanedLesson;
        } else {
          updatedLessons.push(cleanedLesson);
        }
        
        const updatedCourse = { ...prev, lessons: updatedLessons };
        
        // Update courses list as well
        setCourses(prevCourses => prevCourses.map(c => c.id === updatedCourse.id ? updatedCourse : c));
        
        // Save to DB
        console.log("Saving course to DB:", updatedCourse);
        saveDocument('courses', updatedCourse.id, updatedCourse).then(() => {
          console.log("Course saved successfully");
        }).catch(err => {
          console.error("Failed to save course:", err);
          alert("فشل حفظ الدرس في قاعدة البيانات: " + err.message);
        });
        
        return updatedCourse;
      });

      setNewLesson({ title: "", duration: "", url: "", type: 'youtube', pdfUrl: "" });
      setLessonQuizQuestions([]);
      setLessonQuizDuration(15);
      setLessonQuizTotalScore(10);
      setEditingLessonIndex(null);
      alert(editingLessonIndex !== null ? "تم تحديث الدرس بنجاح!" : "تمت إضافة الدرس بنجاح!");
    } catch (e) {
      console.error("Error in handleAddLesson:", e);
      alert("حدث خطأ أثناء إضافة/تحديث الدرس");
    }
  };

  const handleRemoveLesson = async (lessonId: string) => {
    if (editingCourse) {
      const updatedCourse = { ...editingCourse, lessons: editingCourse.lessons.filter(l => l.id !== lessonId) };
      setEditingCourse(updatedCourse);
      const updatedCourses = courses.map(c => c.id === updatedCourse.id ? updatedCourse : c);
      setCourses(updatedCourses);
      await saveDocument('courses', updatedCourse.id, updatedCourse);
    }
  };

  const [newExamDuration, setNewExamDuration] = useState<number | ''>(30);
  const [newExamTotalScore, setNewExamTotalScore] = useState<number | ''>(100);

  const handleAddExam = async () => {
    if (newExamTitle) {
      const newExam: Exam = { 
        id: Date.now().toString(), 
        title: newExamTitle, 
        questions: [],
        duration: newExamDuration || 30,
        totalScore: newExamTotalScore || 100,
        isPublished: false
      };
      const updatedExams = [...exams, newExam];
      setExams(updatedExams);
      await saveDocument('exams', newExam.id, newExam);
      setNewExamTitle("");
      setNewExamDuration(30);
      setNewExamTotalScore(100);
      alert("تم إنشاء الامتحان! يمكنك الآن إضافة الأسئلة.");
      setEditingExam(newExam);
      setActiveTab('edit-exam');
    }
  };

  const handleEditQuestions = (exam: Exam) => {
    setEditingExam(exam);
    setActiveTab('edit-exam');
  };

  const handleSaveQuestions = async () => {
    if (editingExam) {
      const updatedExams = exams.map(e => e.id === editingExam.id ? editingExam : e);
      setExams(updatedExams);
      await saveDocument('exams', editingExam.id, editingExam);
      setActiveTab('exams');
      setEditingExam(null);
      alert("تم حفظ الأسئلة بنجاح!");
    }
  };

  const addQuestion = () => {
    if (editingExam) {
      const newQ: Question = {
        id: Date.now().toString(),
        text: "",
        type: 'multiple-choice',
        options: ["", "", "", ""],
        correctAnswer: 0,
        score: 5
      };
      setEditingExam({
        ...editingExam,
        questions: [...editingExam.questions, newQ]
      });
    }
  };

  const updateQuestion = (qId: string, field: keyof Question, value: any) => {
    setEditingExam(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: prev.questions.map(q => q.id === qId ? { ...q, [field]: value } : q)
      };
    });
  };

  const updateOption = (qId: string, optIdx: number, value: string) => {
    setEditingExam(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: prev.questions.map(q => {
          if (q.id === qId) {
            const newOpts = [...q.options];
            newOpts[optIdx] = value;
            return { ...q, options: newOpts };
          }
          return q;
        })
      };
    });
  };

  const removeQuestion = (qId: string) => {
    if (editingExam) {
      setEditingExam({
        ...editingExam,
        questions: editingExam.questions.filter(q => q.id !== qId)
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-primary p-3 rounded-2xl text-white shadow-lg shadow-primary/30">
              <School className="text-3xl" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900">لوحة تحكم المدرس</h1>
              <p className="text-slate-500 font-bold">إدارة المحتوى ومتابعة الطلاب</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              to="/"
              className="px-6 py-2 bg-white border-2 border-slate-100 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2 text-slate-600"
            >
              <AutoAwesome className="text-primary" />
              العودة للمنصة
            </Link>
            <button 
              onClick={() => {
                alert("البيانات يتم تحديثها تلقائياً!");
              }}
              className="px-6 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all"
            >
              تحديث البيانات
            </button>
            {/* Tabs Navigation */}
            <div className="flex flex-nowrap overflow-x-auto bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
            <button 
              onClick={() => setActiveTab('students')}
              className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'students' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              الطلاب
            </button>
            <button 
              onClick={() => setActiveTab('courses')}
              className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'courses' ? 'bg-secondary text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              الدورات والدروس
            </button>
            <button 
              onClick={() => setActiveTab('exams')}
              className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'exams' ? 'bg-accent text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              الامتحانات
            </button>
            <button 
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'stats' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              الإحصائيات
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'notifications' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              الإشعارات
            </button>
            <button 
              onClick={() => setActiveTab('questions')}
              className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'questions' ? 'bg-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              أسئلة الطلاب
            </button>
          </div>
        </div>
        {/* Debug Section */}
        <div className="bg-yellow-50 p-4 rounded-xl mb-6 border border-yellow-200">
          <h3 className="font-bold text-yellow-800">Debug: عدد الطلاب في الذاكرة: {students.length}</h3>
          <div className="text-xs text-yellow-700 mt-2">
            {students.map(s => s.name).join(', ')}
          </div>
        </div>
      </header>

        <AnimatePresence mode="wait">
          {activeTab === 'notifications' && (
            <Notifications />
          )}
          {activeTab === 'questions' && (
            <motion.div 
              key="questions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <StudentQuestions courses={courses} />
            </motion.div>
          )}
          {activeTab === 'students' && (
            <motion.div 
              key="students"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="relative w-full max-w-md mb-6">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="ابحث برقم الهاتف..." 
                  className="w-full pr-12 pl-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="grid gap-6">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(student => (
                    <motion.div 
                      key={student.phone || student.id}
                      className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 overflow-hidden"
                    >
                      <div className="flex flex-col lg:flex-row gap-8">
                        {/* Student Info */}
                        <div className="lg:w-1/3 border-l border-slate-100 pl-8">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                              <AccountCircle className="text-3xl" />
                            </div>
                            <div>
                              <div className="flex items-center justify-between gap-2 w-full">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-xl font-bold text-slate-900">{student.name}</h3>
                                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{student.studentId || 'N/A'}</span>
                                </div>
                                <button 
                                  onClick={() => handleDeleteStudent(student.phone, student.name)}
                                  className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"
                                  title="حذف الطالب"
                                >
                                  <Close className="text-sm" />
                                </button>
                              </div>
                              {isOnline(student.lastSeen) ? (
                                <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full font-bold">نشط الآن</span>
                              ) : (
                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-bold">غير نشط</span>
                              )}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">كود الطالب:</span>
                              <span className="font-bold text-primary">{student.studentId || '---'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">رقم الهاتف:</span>
                              <span className="font-mono font-bold">{student.phone}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">السنة الدراسية:</span>
                              <span className="font-bold text-primary">
                                {student.grade === '1' ? 'الأول الإعدادي' : student.grade === '2' ? 'الثاني الإعدادي' : student.grade === '3' ? 'الثالث الإعدادي' : 'غير محدد'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">رقم ولي الأمر:</span>
                              <span className="font-mono font-bold">{student.parentPhone || 'غير متوفر'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">تاريخ الانضمام:</span>
                              <span className="font-bold">{student.joinDate || 'غير متوفر'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="lg:w-1/4 flex flex-col justify-center gap-4 border-l border-slate-100 pl-8">
                          <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4">
                            <VideoLibrary className="text-secondary text-2xl" />
                            <div>
                              <p className="text-xs text-slate-500">دروس تمت مشاهدتها</p>
                              <p className="text-xl font-black">{student.completedLessons?.length || 0}</p>
                            </div>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4">
                            <Quiz className="text-accent text-2xl" />
                            <div>
                              <p className="text-xs text-slate-500">امتحانات تم حلها</p>
                              <p className="text-xl font-black">{student.examResults?.filter((r: any) => !r.examId.toString().startsWith('lesson_quiz_')).length || 0}</p>
                            </div>
                          </div>
                          <div className="bg-primary/10 p-4 rounded-2xl flex items-center gap-4 border border-primary/20">
                            <MilitaryTech className="text-primary text-2xl" />
                            <div>
                              <p className="text-xs text-slate-500">إجمالي النقاط</p>
                              <p className="text-xl font-black text-primary">
                                {(() => {
                                  let points = 0;
                                  // Exams: 10 points each (not mini-quizzes)
                                  const examsCount = student.examResults?.filter((r: any) => !r.examId.toString().startsWith('lesson_quiz_')).length || 0;
                                  points += examsCount * 10;
                                  
                                  // Mini-quizzes: 5 points each
                                  const miniQuizzesCount = student.examResults?.filter((r: any) => r.examId.toString().startsWith('lesson_quiz_')).length || 0;
                                  points += miniQuizzesCount * 5;
                                  
                                  // Lectures: 20 points each (if progress > 70%)
                                  // If lessonProgress is not available, we check completedLessons and assume 100% for now
                                  const completedLessons = student.completedLessons || [];
                                  const lessonProgress = student.lessonProgress || {};
                                  
                                  completedLessons.forEach((id: string) => {
                                    const progress = lessonProgress[id] !== undefined ? lessonProgress[id] : 100;
                                    if (progress >= 70) {
                                      points += 20;
                                    }
                                  });
                                  
                                  return points;
                                })()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Exam Results & Lessons */}
                        <div className="lg:w-5/12 space-y-6">
                          <div>
                            <h4 className="font-bold mb-4 flex items-center gap-2">
                              <TrendingUp className="text-green-500" /> نتائج الامتحانات
                            </h4>
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                              {student.examResults && student.examResults.length > 0 ? (
                                student.examResults.map((result: any, idx: number) => (
                                  <div key={result.examId || idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <div>
                                      <p className="text-sm font-bold">{result.examTitle}</p>
                                      <p className="text-xs text-slate-500">الدرجة: {result.score} / {result.total}</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => handleViewResult(student, result)}
                                        className="text-xs font-bold text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                      >
                                        عرض الإجابات
                                      </button>
                                      <button 
                                        onClick={() => handleResetExam(student.phone, result.examId)}
                                        className="flex items-center gap-1 text-xs font-bold text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                      >
                                        <HistoryEdu className="text-sm" /> إعادة
                                      </button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-center text-slate-400 py-4 text-sm">لا توجد امتحانات مسجلة</p>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-bold mb-4 flex items-center gap-2">
                              <PlayCircle className="text-secondary" /> الدروس المكتملة
                            </h4>
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                              {student.completedLessons && student.completedLessons.length > 0 ? (
                                student.completedLessons.map((lessonId: string, idx: number) => {
                                  let lessonTitle = "درس تعليمي";
                                  courses.forEach(c => {
                                    const lesson = c.lessons.find(l => l.id === lessonId);
                                    if (lesson) lessonTitle = `${c.title} - ${lesson.title}`;
                                  });
                                  return (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                      <p className="text-sm font-bold">{lessonTitle}</p>
                                      <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded-full font-bold">مكتمل ✅</span>
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-center text-slate-400 py-4 text-sm">لم يشاهد أي دروس بعد</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                    <Search className="text-6xl text-slate-200 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-400">لا يوجد طلاب بهذا الرقم</h3>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'courses' && (
            <motion.div 
              key="courses"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid md:grid-cols-2 gap-8"
            >
              {/* Add New Course Form */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
                <h3 className="text-2xl font-black mb-6 flex items-center gap-2 text-secondary">
                  <VideoLibrary /> إضافة دورة تعليمية جديدة
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">اسم الدورة</label>
                    <input 
                      type="text" 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary"
                      placeholder="مثال: تاريخ مصر القديمة"
                      value={newCourse.title}
                      onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">الصف الدراسي</label>
                    <select 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary font-bold"
                      value={newCourse.grade}
                      onChange={(e) => setNewCourse({...newCourse, grade: e.target.value})}
                    >
                      <option value="1">الصف الأول الإعدادي</option>
                      <option value="2">الصف الثاني الإعدادي</option>
                      <option value="3">الصف الثالث الإعدادي</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">وصف قصير</label>
                    <textarea 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary h-24"
                      placeholder="اكتب وصفاً مختصراً للدورة..."
                      value={newCourse.description}
                      onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">صورة الدورة</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        id="course-image-upload"
                        disabled={isUploading}
                        onChange={(e) => handleFileUpload(e, (url) => setNewCourse({ ...newCourse, image: url }))}
                      />
                      <label 
                        htmlFor="course-image-upload"
                        className={`flex-1 p-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-center cursor-pointer hover:border-secondary transition-all text-sm text-slate-500 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isUploading ? `جاري الرفع... ${uploadProgress}%` : newCourse.image ? "تم اختيار صورة ✅" : "اضغط لرفع صورة الدورة"}
                      </label>
                      {newCourse.image && (
                        <img src={newCourse.image} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={handleAddCourse}
                    className="w-full py-4 bg-secondary text-white rounded-2xl font-black shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    إنشاء الدورة الآن
                  </button>
                </div>
              </div>

              {/* Existing Courses List */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-700 mb-4">الدورات المتاحة</h3>
                {courses.map(course => (
                  <div key={course.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary overflow-hidden">
                        <img src={course.image || 'https://picsum.photos/seed/placeholder/400/200'} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-bold">{course.title}</p>
                        <p className="text-xs text-slate-400">{course.lessons.length} درس</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${course.isPublished ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                          {course.isPublished ? 'منشور' : 'مسودة'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button 
                        onClick={async () => {
                          const updatedCourse = { ...course, isPublished: !course.isPublished };
                          const updated = courses.map(c => c.id === course.id ? updatedCourse : c);
                          setCourses(updated);
                          await saveDocument('courses', course.id, updatedCourse);
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${course.isPublished ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}
                      >
                        {course.isPublished ? 'إلغاء النشر' : 'نشر'}
                      </button>
                      <button 
                        onClick={() => handleEditCourse(course)}
                        className="text-primary hover:bg-primary/5 p-2 rounded-xl transition-colors font-bold text-xs"
                      >
                        إدارة الدروس
                      </button>
                      <button 
                        onClick={() => handleRemoveCourse(course.id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"
                      >
                        <Close />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'edit-course' && editingCourse && (
            <motion.div 
              key="edit-course"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <button onClick={() => setActiveTab('courses')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <Close />
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <input 
                        type="text" 
                        value={editingCourse.title}
                        onChange={async (e) => {
                          const updated = { ...editingCourse, title: e.target.value };
                          setEditingCourse(updated);
                          const updatedCourses = courses.map(c => c.id === updated.id ? updated : c);
                          setCourses(updatedCourses);
                          await saveDocument('courses', updated.id, updated);
                        }}
                        className="text-2xl font-black text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-primary outline-none flex-1"
                      />
                      <div className="flex items-center gap-2">
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          id="edit-course-image"
                          onChange={(e) => handleFileUpload(e, async (url) => {
                            const updated = { ...editingCourse, image: url };
                            setEditingCourse(updated);
                            const updatedCourses = courses.map(c => c.id === updated.id ? updated : c);
                            setCourses(updatedCourses);
                            await saveDocument('courses', updated.id, updated);
                          })}
                        />
                        <label htmlFor="edit-course-image" className="p-2 bg-slate-100 rounded-xl cursor-pointer hover:bg-slate-200 transition-all text-primary">
                          <VideoLibrary className="text-xl" />
                        </label>
                        <img src={editingCourse.image || 'https://picsum.photos/seed/placeholder/400/200'} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2">
                      <select
                        value={editingCourse.grade || '1'}
                        onChange={async (e) => {
                          const updated = { ...editingCourse, grade: e.target.value };
                          setEditingCourse(updated);
                          const updatedCourses = courses.map(c => c.id === updated.id ? updated : c);
                          setCourses(updatedCourses);
                          await saveDocument('courses', updated.id, updated);
                        }}
                        className="text-sm font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-1 outline-none"
                      >
                        <option value="1">الصف الأول الإعدادي</option>
                        <option value="2">الصف الثاني الإعدادي</option>
                        <option value="3">الصف الثالث الإعدادي</option>
                      </select>
                      <input 
                        type="text" 
                        value={editingCourse.description}
                        onChange={async (e) => {
                          const updated = { ...editingCourse, description: e.target.value };
                          setEditingCourse(updated);
                          const updatedCourses = courses.map(c => c.id === updated.id ? updated : c);
                          setCourses(updatedCourses);
                          await saveDocument('courses', updated.id, updated);
                        }}
                        placeholder="وصف الدورة..."
                        className="text-sm text-slate-500 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary outline-none flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Add Lesson Form */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
                  <h4 className="text-xl font-black mb-6 flex items-center gap-2 text-primary">
                    <PlayCircle /> إضافة درس جديد
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">عنوان الدرس</label>
                      <input 
                        type="text" 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                        placeholder="مثال: الدرس الأول: المقدمة"
                        value={newLesson.title}
                        onChange={(e) => setNewLesson({...newLesson, title: e.target.value})}
                      />
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setNewLesson({...newLesson, type: 'youtube'})}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newLesson.type === 'youtube' ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}
                      >
                        يوتيوب
                      </button>
                      <button 
                        onClick={() => setNewLesson({...newLesson, type: 'local'})}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newLesson.type === 'local' ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}
                      >
                        فيديو من الجهاز
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2">
                        {newLesson.type === 'youtube' ? 'رابط الفيديو' : 'رفع الفيديو'}
                      </label>
                      {newLesson.type === 'youtube' ? (
                        <input 
                          type="text" 
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                          placeholder="رابط يوتيوب"
                          value={newLesson.url}
                          onChange={(e) => setNewLesson({...newLesson, url: e.target.value})}
                        />
                      ) : (
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="video/*"
                            className="hidden"
                            id="lesson-video-upload"
                            disabled={isUploading}
                            onChange={(e) => handleFileUpload(e, (url) => setNewLesson(prev => ({ ...prev, url, type: 'local' })))}
                          />
                          <label 
                            htmlFor="lesson-video-upload"
                            className={`block w-full p-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-center cursor-pointer hover:border-primary transition-all text-xs text-slate-500 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isUploading ? `جاري الرفع... ${uploadProgress}%` : newLesson.url ? "تم رفع الفيديو ✅" : "اضغط لرفع الفيديو"}
                          </label>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold mb-2">وصف المدة (مثال: 15 دقيقة)</label>
                        <input 
                          type="text" 
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                          placeholder="مثال: 15 دقيقة"
                          value={newLesson.duration}
                          onChange={(e) => setNewLesson({...newLesson, duration: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2 text-slate-700">ملف PDF (اختياري)</label>
                        <div className="flex items-center gap-4">
                          <input 
                            type="file" 
                            accept="application/pdf"
                            className="hidden"
                            id="lesson-pdf-upload"
                            disabled={isUploading}
                            onChange={(e) => handleFileUpload(e, (url) => setNewLesson(prev => ({ ...prev, pdfUrl: url })))}
                          />
                          <label 
                            htmlFor="lesson-pdf-upload"
                            className={`flex-1 p-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-center cursor-pointer hover:border-primary transition-all text-xs text-slate-500 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isUploading ? `جاري الرفع... ${uploadProgress}%` : newLesson.pdfUrl ? "تم اختيار ملف PDF ✅" : "اضغط لرفع ملخص PDF"}
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Lesson Quiz Section */}
                    <div className="pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => setShowQuizSettings(!showQuizSettings)}
                        className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-all"
                      >
                        <h5 className="font-bold text-sm flex items-center gap-2">
                          <Quiz className="text-secondary" /> اختبار سريع على الدرس ({lessonQuizQuestions.length} أسئلة)
                        </h5>
                        <span className={`transition-transform duration-300 ${showQuizSettings ? 'rotate-180' : ''}`}>▼</span>
                      </button>
                      
                      <AnimatePresence>
                        {showQuizSettings && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 space-y-4">
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <label className="block text-xs font-bold mb-1">مدة الاختبار (بالدقائق)</label>
                                  <input 
                                    type="number" 
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                                    value={lessonQuizDuration}
                                    onChange={(e) => setLessonQuizDuration(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-xs font-bold mb-1">الدرجة الكلية</label>
                                  <input 
                                    type="number" 
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                                    value={lessonQuizTotalScore}
                                    onChange={(e) => setLessonQuizTotalScore(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                                  />
                                </div>
                              </div>

                              <button 
                                onClick={() => {
                                  const q: Question = { id: Date.now().toString(), text: "", type: 'multiple-choice', options: ["", "", "", ""], correctAnswer: 0, score: 5 };
                                  setLessonQuizQuestions([...lessonQuizQuestions, q]);
                                }}
                                className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                              >
                                + إضافة سؤال للاختبار السريع
                              </button>
                              
                              <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                                {lessonQuizQuestions.map((q, qIdx) => (
                                  <div key={q.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
                                    <button 
                                      onClick={() => setLessonQuizQuestions(lessonQuizQuestions.filter(item => item.id !== q.id))}
                                      className="absolute top-2 left-2 text-red-500 hover:bg-red-50 p-1 rounded-lg"
                                    >
                                      <Close className="text-sm" />
                                    </button>
                                    
                                    <div className="flex flex-col gap-2 mb-2">
                                      <select
                                        value={q.type || 'multiple-choice'}
                                        onChange={(e) => {
                                          const newType = e.target.value;
                                          setLessonQuizQuestions(prev => {
                                            const updated = [...prev];
                                            let newOptions = updated[qIdx].options;
                                            if (newType === 'true-false') newOptions = ['صح', 'خطأ'];
                                            if (newType === 'multiple-choice' && updated[qIdx].options.length < 4) newOptions = ['', '', '', ''];
                                            updated[qIdx] = { ...updated[qIdx], type: newType as any, options: newOptions, correctAnswer: 0 };
                                            return updated;
                                          });
                                        }}
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none"
                                      >
                                        <option value="multiple-choice">اختيار من متعدد</option>
                                        <option value="true-false">صح وخطأ</option>
                                        <option value="text">سؤال مقالي</option>
                                      </select>

                                      <input 
                                        type="text" 
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                        placeholder="نص السؤال..."
                                        value={q.text}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setLessonQuizQuestions(prev => {
                                            const updated = [...prev];
                                            updated[qIdx] = { ...updated[qIdx], text: val };
                                            return updated;
                                          });
                                        }}
                                      />

                                      {/* Image Upload for Lesson Quiz */}
                                      <div className="flex items-center gap-2">
                                        <input 
                                          type="file" 
                                          accept="image/*"
                                          className="hidden"
                                          id={`lq-image-${q.id}`}
                                          onChange={(e) => handleFileChange(e, (base64) => {
                                            setLessonQuizQuestions(prev => {
                                              const updated = [...prev];
                                              updated[qIdx] = { ...updated[qIdx], image: base64 };
                                              return updated;
                                            });
                                          })}
                                        />
                                        <label 
                                          htmlFor={`lq-image-${q.id}`}
                                          className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-center cursor-pointer hover:bg-slate-50 text-xs text-slate-500"
                                        >
                                          {q.image ? "تغيير الصورة ✅" : "إضافة صورة"}
                                        </label>
                                        {q.image && (
                                          <button 
                                            onClick={() => {
                                              const updated = [...lessonQuizQuestions];
                                              updated[qIdx].image = undefined;
                                              setLessonQuizQuestions(updated);
                                            }}
                                            className="text-red-500 bg-white border border-slate-200 rounded-lg p-1"
                                          >
                                            ×
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {q.type !== 'text' && (
                                      <div className="grid grid-cols-2 gap-2">
                                        {q.options.map((opt, optIdx) => (
                                          <div key={optIdx} className={`flex items-center gap-1 p-1 rounded-lg border ${q.correctAnswer === optIdx ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white'}`}>
                                            <input 
                                              type="radio" 
                                              name={`correct-lq-${q.id}`}
                                              checked={q.correctAnswer === optIdx}
                                              onChange={() => {
                                                setLessonQuizQuestions(prev => {
                                                  const updated = [...prev];
                                                  updated[qIdx] = { ...updated[qIdx], correctAnswer: optIdx };
                                                  return updated;
                                                });
                                              }}
                                              className="w-3 h-3 accent-green-500"
                                            />
                                            <input 
                                              type="text" 
                                              className="w-full bg-transparent outline-none text-xs"
                                              placeholder={`خيار ${optIdx + 1}`}
                                              value={opt}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setLessonQuizQuestions(prev => {
                                                  const updated = [...prev];
                                                  const newOpts = [...updated[qIdx].options];
                                                  newOpts[optIdx] = val;
                                                  updated[qIdx] = { ...updated[qIdx], options: newOpts };
                                                  return updated;
                                                });
                                              }}
                                              readOnly={q.type === 'true-false'}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <button 
                      onClick={handleAddLesson}
                      disabled={isUploading}
                      className={`w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isUploading ? 'جاري رفع الملفات...' : editingLessonIndex !== null ? 'تحديث الدرس' : 'إضافة الدرس للدورة'}
                    </button>
                  </div>
                </div>

                {/* Lessons List */}
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-slate-700">دروس الدورة الحالية</h4>
                  {editingCourse.lessons.map((lesson, idx) => (
                    <div key={lesson.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-400 text-xs">{idx + 1}</span>
                        <div>
                          <p className="font-bold text-sm">{lesson.title}</p>
                          <p className="text-xs text-slate-400">{lesson.duration}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${lesson.isPublished ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                            {lesson.isPublished ? 'منشور' : 'مسودة'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setNewLesson({
                              title: lesson.title,
                              duration: lesson.duration,
                              url: lesson.url,
                              type: lesson.type,
                              pdfUrl: lesson.pdfUrl || ""
                            });
                            setLessonQuizQuestions(lesson.quiz || []);
                            setLessonQuizDuration(lesson.quizDuration || 0);
                            setLessonQuizTotalScore(lesson.quizTotalScore || 0);
                            // Assuming you have a way to know which lesson is being edited to update it
                            setEditingLessonIndex(idx); 
                          }}
                          className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors text-xs font-bold"
                        >
                          تعديل
                        </button>
                        <button 
                          onClick={async () => {
                            const updatedCourse = {
                              ...editingCourse,
                              lessons: editingCourse.lessons.map(l => l.id === lesson.id ? { ...l, isPublished: !l.isPublished } : l)
                            };
                            setEditingCourse(updatedCourse);
                            const updatedCourses = courses.map(c => c.id === updatedCourse.id ? updatedCourse : c);
                            setCourses(updatedCourses);
                            await saveDocument('courses', updatedCourse.id, updatedCourse);
                          }}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${lesson.isPublished ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}
                        >
                          {lesson.isPublished ? 'إلغاء النشر' : 'نشر'}
                        </button>
                        <button 
                          onClick={() => handleRemoveLesson(lesson.id)}
                          className="text-red-400 hover:text-red-600 p-2 transition-colors"
                        >
                          <Close />
                        </button>
                      </div>
                    </div>
                  ))}
                  {editingCourse.lessons.length === 0 && (
                    <div className="text-center py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                      لا يوجد دروس في هذه الدورة بعد
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'exams' && (
            <motion.div 
              key="exams"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid md:grid-cols-2 gap-8"
            >
              {/* Add New Exam Form */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
                <h3 className="text-2xl font-black mb-6 flex items-center gap-2 text-accent">
                  <Quiz /> إنشاء امتحان جديد
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">اسم الامتحان</label>
                    <input 
                      type="text" 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-accent"
                      placeholder="مثال: اختبار الشهر الأول"
                      value={newExamTitle}
                      onChange={(e) => setNewExamTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">مدة الامتحان (بالدقائق)</label>
                    <input 
                      type="number" 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-accent"
                      placeholder="مثال: 30"
                      value={newExamDuration}
                      onChange={(e) => setNewExamDuration(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">الدرجة الكلية للامتحان</label>
                    <input 
                      type="number" 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-accent"
                      placeholder="مثال: 100"
                      value={newExamTotalScore}
                      onChange={(e) => setNewExamTotalScore(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="p-4 bg-accent/5 rounded-2xl border border-accent/10">
                    <p className="text-sm text-accent font-bold mb-2 flex items-center gap-2">
                      <AutoAwesome /> نصيحة للمدرس
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      بعد إنشاء الامتحان، ستتمكن من إضافة الأسئلة وتحديد الإجابات الصحيحة وتحديد الدرجة النهائية لكل سؤال.
                    </p>
                  </div>
                  <button 
                    onClick={handleAddExam}
                    className="w-full py-4 bg-accent text-white rounded-2xl font-black shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    بدء بناء الامتحان
                  </button>
                </div>
              </div>

              {/* Existing Exams List */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-700 mb-4">الامتحانات المتاحة</h3>
                {exams.map(exam => (
                  <div key={exam.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                        <MenuBook />
                      </div>
                      <div>
                        <p className="font-bold">{exam.title}</p>
                        <p className="text-xs text-slate-400">{exam.questions.length} سؤال • {exam.duration || 30} دقيقة • {exam.totalScore || 100} درجة</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${exam.isPublished ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                          {exam.isPublished ? 'منشور' : 'مسودة'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button 
                        onClick={async () => {
                          const updatedExam = { ...exam, isPublished: !exam.isPublished };
                          const updated = exams.map(e => e.id === exam.id ? updatedExam : e);
                          setExams(updated);
                          await saveDocument('exams', exam.id, updatedExam);
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${exam.isPublished ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}
                      >
                        {exam.isPublished ? 'إلغاء النشر' : 'نشر'}
                      </button>
                      <button 
                        onClick={() => handleEditQuestions(exam)}
                        className="text-primary hover:bg-primary/5 p-2 rounded-xl transition-colors font-bold text-xs"
                      >
                        تعديل الأسئلة
                      </button>
                      <button 
                        onClick={async () => {
                          if (window.confirm('هل أنت متأكد من حذف هذا الامتحان؟')) {
                            const updatedExams = exams.filter(e => e.id !== exam.id);
                            setExams(updatedExams);
                            await deleteDocument('exams', exam.id);
                          }
                        }}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"
                      >
                        <Close />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'edit-exam' && editingExam && (
            <motion.div 
              key="edit-exam"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                  <button onClick={() => setActiveTab('exams')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <Close />
                  </button>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">تعديل أسئلة: {editingExam.title}</h3>
                    <p className="text-slate-500">أضف الأسئلة وحدد الإجابات الصحيحة</p>
                  </div>
                </div>
                <button 
                  onClick={handleSaveQuestions}
                  className="px-8 py-3 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                >
                  حفظ التغييرات
                </button>
              </div>

              <div className="space-y-6">
                {editingExam.questions.map((q, idx) => (
                  <div key={q.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative group">
                    <div className="flex flex-col gap-4 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400">
                          {idx + 1}
                        </span>
                        
                        <div className="flex items-center gap-3 flex-wrap">
                          <select
                            value={q.type || 'multiple-choice'}
                            onChange={(e) => {
                              const newType = e.target.value;
                              let newOptions = q.options;
                              if (newType === 'true-false') newOptions = ['صح', 'خطأ'];
                              if (newType === 'multiple-choice' && q.options.length < 4) newOptions = ['', '', '', ''];
                              
                              const updatedQuestions = editingExam.questions.map(item => 
                                item.id === q.id ? { ...item, type: newType as any, options: newOptions, correctAnswer: 0 } : item
                              );
                              setEditingExam({ ...editingExam, questions: updatedQuestions });
                            }}
                            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="multiple-choice">اختيار من متعدد</option>
                            <option value="true-false">صح وخطأ</option>
                            <option value="text">سؤال مقالي</option>
                          </select>

                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-bold text-sm">الدرجة:</span>
                            <input 
                              type="number" 
                              value={q.score}
                              onChange={(e) => updateQuestion(q.id, 'score', e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                              className="w-16 p-2 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-primary text-center font-bold"
                            />
                          </div>

                          <button 
                            onClick={() => removeQuestion(q.id)}
                            className="text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                          >
                            <Close className="text-xs" /> حذف السؤال
                          </button>
                        </div>
                      </div>

                      <input 
                        type="text" 
                        value={q.text}
                        onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                        placeholder="اكتب نص السؤال هنا..."
                        className="w-full text-xl font-bold bg-transparent border-b-2 border-slate-100 focus:border-primary outline-none py-2 transition-all"
                      />

                      {/* Image Upload */}
                      <div className="flex items-center gap-4">
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          id={`q-image-${q.id}`}
                          onChange={(e) => handleFileChange(e, (base64) => updateQuestion(q.id, 'image', base64))}
                        />
                        <label 
                          htmlFor={`q-image-${q.id}`}
                          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-all flex items-center gap-2"
                        >
                          <VideoLibrary className="text-sm" /> {q.image ? "تغيير الصورة" : "إضافة صورة للسؤال"}
                        </label>
                        {q.image && (
                          <div className="relative">
                            {q.image && <img src={q.image} alt="Question" className="h-16 w-16 object-cover rounded-lg border border-slate-200" />}
                            <button 
                              onClick={() => updateQuestion(q.id, 'image', undefined)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center text-xs"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {q.type !== 'text' && (
                      <div className="grid md:grid-cols-2 gap-4 mb-6">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${q.correctAnswer === optIdx ? 'border-green-500 bg-green-50' : 'border-slate-50 bg-slate-50'}`}>
                            <input 
                              type="radio" 
                              name={`correct-${q.id}`}
                              checked={q.correctAnswer === optIdx}
                              onChange={() => updateQuestion(q.id, 'correctAnswer', optIdx)}
                              className="w-5 h-5 accent-green-500 cursor-pointer"
                            />
                            <input 
                              type="text" 
                              value={opt}
                              onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                              placeholder={`الاختيار ${optIdx + 1}`}
                              className="flex-1 bg-transparent outline-none font-bold"
                              readOnly={q.type === 'true-false'} // Read-only for True/False options
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {q.type === 'text' && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-sm text-center">
                        هذا السؤال مقالي، سيقوم الطالب بكتابة الإجابة.
                      </div>
                    )}
                  </div>
                ))}

                <button 
                  onClick={addQuestion}
                  className="w-full py-6 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                >
                  <AutoAwesome /> إضافة سؤال جديد
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center">
                <AccountCircle className="text-4xl text-primary mx-auto mb-4" />
                <h4 className="text-slate-500 text-sm font-bold mb-1">إجمالي الطلاب</h4>
                <p className="text-3xl font-black">{students.length}</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center">
                <VideoLibrary className="text-4xl text-secondary mx-auto mb-4" />
                <h4 className="text-slate-500 text-sm font-bold mb-1">إجمالي الدورات</h4>
                <p className="text-3xl font-black">{courses.length}</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center">
                <Quiz className="text-4xl text-accent mx-auto mb-4" />
                <h4 className="text-slate-500 text-sm font-bold mb-1">إجمالي الامتحانات</h4>
                <p className="text-3xl font-black">{exams.length}</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center">
                <MilitaryTech className="text-4xl text-yellow-500 mx-auto mb-4" />
                <h4 className="text-slate-500 text-sm font-bold mb-1">إجمالي النقاط الموزعة</h4>
                <p className="text-3xl font-black">
                  {students.reduce((acc, s) => {
                    let studentPoints = 0;
                    // Exams: 10
                    const examsCount = s.examResults?.filter((r: any) => !r.examId.toString().startsWith('lesson_quiz_')).length || 0;
                    studentPoints += examsCount * 10;
                    // Mini-quizzes: 5
                    const miniQuizzesCount = s.examResults?.filter((r: any) => r.examId.toString().startsWith('lesson_quiz_')).length || 0;
                    studentPoints += miniQuizzesCount * 5;
                    // Lectures: 20 (if progress >= 70%)
                    const completedLessons = s.completedLessons || [];
                    const lessonProgress = s.lessonProgress || {};
                    completedLessons.forEach((id: string) => {
                      const progress = lessonProgress[id] !== undefined ? lessonProgress[id] : 100;
                      if (progress >= 70) studentPoints += 20;
                    });
                    return acc + studentPoints;
                  }, 0)}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Result Modal */}
        <AnimatePresence>
          {selectedResult && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl"
              >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">تفاصيل إجابة الطالب</h3>
                    <p className="text-slate-500 text-sm">{selectedResult.student.name} - {selectedResult.result.examTitle}</p>
                  </div>
                  <button onClick={() => setSelectedResult(null)} className="p-2 hover:bg-slate-100 rounded-full">
                    <Close />
                  </button>
                </div>
                
                <div className="p-6 space-y-6">
                  {(() => {
                    const exam = exams.find(e => e.id === selectedResult.result.examId);
                    if (!exam) return <p className="text-center text-slate-400">لم يتم العثور على بيانات الامتحان الأصلي</p>;

                    return exam.questions.map((q, idx) => {
                      const answer = selectedResult.result.answers.find((a: any) => a.questionId === q.id);
                      const isCorrect = answer?.isCorrect;
                      
                      return (
                        <div key={q.id} className={`p-6 rounded-2xl border-2 ${isCorrect ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'}`}>
                          <div className="flex gap-4 mb-4">
                            <span className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-slate-400 text-xs shadow-sm">
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-bold text-lg mb-2">{q.text}</p>
                              {q.image && (
                                <img src={q.image} alt="Question" className="h-32 rounded-lg border border-slate-200 object-contain mb-2" />
                              )}
                              <div className="flex items-center gap-2 text-xs font-bold">
                                <span className="text-slate-500">الدرجة: {q.score}</span>
                                {isCorrect ? (
                                  <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded-full">إجابة صحيحة</span>
                                ) : (
                                  <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded-full">إجابة خاطئة</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-2">
                            <div>
                              <span className="text-xs text-slate-400 font-bold block mb-1">إجابة الطالب:</span>
                              <p className="font-bold text-slate-800">
                                {q.type === 'text' ? (
                                  answer?.selectedOption || <span className="text-slate-400 italic">لم يجب</span>
                                ) : (
                                  q.options?.[Number(answer?.selectedOption)] || <span className="text-slate-400 italic">لم يجب</span>
                                )}
                              </p>
                            </div>
                            {!isCorrect && (
                              <div className="pt-2 border-t border-slate-50">
                                <span className="text-xs text-slate-400 font-bold block mb-1">الإجابة الصحيحة:</span>
                                <p className="font-bold text-green-600">
                                  {q.type === 'text' ? q.correctAnswer : q.options?.[Number(q.correctAnswer)]}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-8">
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                      <HistoryEdu className="text-primary" /> تعديل الدرجة النهائية
                    </h4>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-2">الدرجة المستحقة</label>
                        <input 
                          type="number" 
                          value={newScore}
                          onChange={(e) => setNewScore(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-lg"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-2">الدرجة الكلية</label>
                        <div className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-lg text-slate-500">
                          {selectedResult.result.total}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={handleUpdateScore}
                      className="w-full mt-4 py-3 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                    >
                      حفظ الدرجة الجديدة
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminDashboard;
