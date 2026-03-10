import { useState, useEffect } from 'react';
import { saveDocument, subscribeToCollection, deleteDocument } from '../services/db';
import { Mail, Close, HistoryEdu } from './Icons';

const Notifications = () => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToCollection('notifications', (data) => {
      const sorted = data.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(sorted);
    });
    return () => unsubscribe();
  }, []);

  const handleSend = async () => {
    if (!message) return;
    setSending(true);
    try {
      await saveDocument('notifications', Date.now().toString(), {
        message,
        timestamp: Date.now(),
        read: false,
      });
      setMessage('');
      alert('تم إرسال الإشعار بنجاح!');
    } catch (e) {
      console.error('Failed to send notification', e);
      alert('فشل إرسال الإشعار');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
      try {
        await deleteDocument('notifications', id);
      } catch (e) {
        console.error('Failed to delete notification', e);
      }
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="p-8 bg-white rounded-3xl shadow-sm border border-slate-100 h-fit">
        <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
          <Mail className="text-primary" /> إرسال إشعار جديد
        </h2>
        <textarea
          className="w-full p-4 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-right mb-4 font-bold"
          rows={4}
          placeholder="اكتب نص الإشعار هنا..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button 
          onClick={handleSend}
          disabled={sending}
          className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all disabled:bg-slate-300 shadow-lg shadow-primary/20"
        >
          {sending ? 'جاري الإرسال...' : 'إرسال الإشعار'}
        </button>
      </div>

      <div className="p-8 bg-white rounded-3xl shadow-sm border border-slate-100">
        <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
          <HistoryEdu className="text-secondary" /> الإشعارات السابقة
        </h2>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <div key={notif.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                <button 
                  onClick={() => handleDelete(notif.id)}
                  className="absolute top-2 left-2 flex items-center gap-1 text-red-500 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-all"
                >
                  <Close className="text-xs" />
                  <span className="text-[10px] font-bold">حذف</span>
                </button>
                <p className="text-slate-700 font-bold mb-2 text-sm leading-relaxed">{notif.message}</p>
                <p className="text-[10px] text-slate-400 font-bold">
                  {new Date(notif.timestamp).toLocaleString('ar-EG')}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-400 font-bold">
              لا يوجد إشعارات مرسلة بعد
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
