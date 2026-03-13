import React, { useState, useEffect } from 'react';
import { subscribeToCollection, updateDocument, saveDocument, deleteDocument } from '../services/db';
import { Trash2 } from 'lucide-react';

export const StudentQuestions = ({ courses }: { courses: any[] }) => {
  const [comments, setComments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToCollection('lesson_comments', (data) => {
      setComments(data as any[]);
    });
    const unsubscribeUsers = subscribeToCollection('users', (data) => {
      setUsers(data as any[]);
    });
    return () => {
      unsubscribe();
      unsubscribeUsers();
    };
  }, []);

  const handleReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const newReply = {
      id: Date.now().toString(),
      userId: 'admin',
      userName: 'المشرف',
      text: replyText.trim(),
      timestamp: Date.now(),
      isTeacher: true
    };

    const updatedReplies = [...(comment.replies || []), newReply];

    try {
      await updateDocument('lesson_comments', commentId, { replies: updatedReplies });
      
      // Send notification to student
      if (comment.userId !== 'admin') {
        await saveDocument('notifications', Date.now().toString(), {
          userId: comment.userId,
          message: `قام المدرس بالرد على سؤالك في الدرس: "${comment.text.substring(0, 20)}..."`,
          timestamp: Date.now(),
          read: false
        });
      }

      setReplyingTo(null);
      setReplyText('');
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
      try {
        await deleteDocument('lesson_comments', commentId);
      } catch (error) {
        console.error('Error deleting comment:', error);
        alert('فشل حذف السؤال');
      }
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black">أسئلة الطلاب</h2>
      {comments.map(comment => {
        const course = courses.find(c => c.lessons?.some((l: any) => l.id === comment.lessonId));
        const lesson = course?.lessons?.find((l: any) => l.id === comment.lessonId);
        const student = users.find(u => u.phone === comment.userId);
        
        return (
          <div key={comment.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-bold text-lg">{comment.userName}</p>
                <p className="text-sm text-slate-500">رقم الهاتف: {comment.userId}</p>
                {student && (
                  <>
                    <p className="text-sm text-slate-500">السنة الدراسية: {student.grade}</p>
                    <p className="text-sm text-slate-500">كود الطالب: {student.studentCode || 'غير متوفر'}</p>
                  </>
                )}
                <p className="text-sm text-primary font-bold mt-1">الدرس: {lesson?.title || 'غير معروف'} - {course?.title || 'غير معروف'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{new Date(comment.timestamp).toLocaleDateString('ar-EG')}</span>
                <button 
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                  title="حذف السؤال"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p className="text-slate-700 mb-4">{comment.text}</p>
            
            {/* Replies */}
            {comment.replies && comment.replies.map((reply: any) => (
              <div key={reply.id} className="bg-slate-50 p-4 rounded-xl mb-2">
                <p className="font-bold text-primary">{reply.userName}:</p>
                <p className="text-slate-700">{reply.text}</p>
              </div>
            ))}

            {replyingTo === comment.id ? (
              <div className="flex gap-2 mt-4">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="اكتب الرد هنا..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2"
                />
                <button onClick={() => handleReply(comment.id)} className="bg-primary text-white px-4 py-2 rounded-xl font-bold">إرسال</button>
              </div>
            ) : (
              <button onClick={() => setReplyingTo(comment.id)} className="text-primary font-bold hover:underline">رد</button>
            )}
          </div>
        );
      })}
    </div>
  );
};
