import React, { useState, useEffect } from 'react';
import { subscribeToCollection, saveDocument, updateDocument } from '../services/db';
import { User, Reply as ReplyIcon } from 'lucide-react';

interface Reply {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  isTeacher: boolean;
}

interface Comment {
  id: string;
  lessonId: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  replies?: Reply[];
}

export const LessonComments = ({ lessonId, user }: { lessonId: string, user: any }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToCollection('lesson_comments', (data) => {
      const lessonComments = (data as Comment[])
        .filter(c => c.lessonId === lessonId && (c.userId === user?.phone || user?.role === 'admin'))
        .sort((a, b) => b.timestamp - a.timestamp);
      setComments(lessonComments);
    });
    return () => unsubscribe();
  }, [lessonId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const commentId = Date.now().toString();
      const comment: Comment = {
        id: commentId,
        lessonId,
        userId: user.phone,
        userName: user.name,
        text: newComment.trim(),
        timestamp: Date.now(),
        replies: []
      };
      
      await saveDocument('lesson_comments', commentId, comment);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('حدث خطأ أثناء إضافة التعليق');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (commentId: string) => {
    if (!replyText.trim() || !user) return;
    
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const newReply: Reply = {
      id: Date.now().toString(),
      userId: user.phone,
      userName: user.name,
      text: replyText.trim(),
      timestamp: Date.now(),
      isTeacher: user.role === 'admin'
    };

    const updatedReplies = [...(comment.replies || []), newReply];

    try {
      await updateDocument('lesson_comments', commentId, { replies: updatedReplies });
      
      // Also add a notification for the user who asked the question
      if (user.role === 'admin' && comment.userId !== user.phone) {
        await saveDocument('notifications', Date.now().toString(), {
          userId: comment.userId,
          message: `قام المدرس بالرد على سؤالك في الدرس`,
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

  return (
    <div className="mt-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
      <h3 className="text-2xl font-black mb-6">الأسئلة والتعليقات</h3>
      
      {user ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
              <User />
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="اكتب سؤالك أو تعليقك هنا..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none h-24"
              />
              <div className="flex justify-end mt-2">
                <button 
                  type="submit" 
                  disabled={!newComment.trim() || isSubmitting}
                  className="bg-primary text-white px-6 py-2 rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'جاري الإضافة...' : 'إضافة تعليق'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-slate-50 p-6 rounded-xl text-center mb-8 text-slate-500">
          يرجى تسجيل الدخول لإضافة تعليق
        </div>
      )}

      <div className="space-y-6">
        {comments.length === 0 ? (
          <p className="text-center text-slate-400 py-4">لا توجد تعليقات حتى الآن. كن أول من يعلق!</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center shrink-0 font-bold">
                  {comment.userName.charAt(0)}
                </div>
                <div className="flex-1 bg-slate-50 p-4 rounded-2xl rounded-tr-none">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm">{comment.userName}</h4>
                    <span className="text-xs text-slate-400">
                      {new Date(comment.timestamp).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                  
                  {user && user.role === 'admin' && replyingTo !== comment.id && (
                    <button 
                      onClick={() => setReplyingTo(comment.id)}
                      className="mt-3 text-sm text-primary font-bold flex items-center gap-1 hover:underline"
                    >
                      <ReplyIcon size={14} /> رد
                    </button>
                  )}
                </div>
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="pr-16 space-y-4">
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="flex gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold ${reply.isTeacher ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {reply.userName.charAt(0)}
                      </div>
                      <div className={`flex-1 p-4 rounded-2xl rounded-tr-none ${reply.isTeacher ? 'bg-primary/5 border border-primary/10' : 'bg-slate-50'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className={`font-bold text-sm flex items-center gap-2 ${reply.isTeacher ? 'text-primary' : ''}`}>
                            {reply.userName}
                            {reply.isTeacher && <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full">المدرس</span>}
                          </h4>
                          <span className="text-xs text-slate-400">
                            {new Date(reply.timestamp).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{reply.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Input */}
              {replyingTo === comment.id && (
                <div className="pr-16 mt-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="اكتب ردك هنا..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                    />
                    <button 
                      onClick={() => handleReply(comment.id)}
                      disabled={!replyText.trim()}
                      className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                      إرسال
                    </button>
                    <button 
                      onClick={() => { setReplyingTo(null); setReplyText(''); }}
                      className="bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-300 transition-all"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
