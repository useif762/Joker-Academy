import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { MessageCircle, X, Send, Bot, User as UserIcon, Paperclip, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Message = {
  role: 'user' | 'model';
  text: string;
  fileData?: { data: string; mimeType: string };
  fileName?: string;
};

export const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'مرحباً! أنا المساعد الذكي للمنصة. كيف يمكنني مساعدتك في دراستك اليوم؟' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const systemInstruction = 'أنت مساعد ذكي لطلاب منصة تعليمية. أجب على أسئلتهم بوضوح واختصار باللغة العربية، وساعدهم في فهم المواد الدراسية. استخدم تنسيق Markdown لتنظيم إجاباتك (مثل القوائم النقطية، العناوين، والنص العريض) لتكون سهلة القراءة.';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fileToGenerativePart = async (file: File): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        resolve({
          data: base64Data,
          mimeType: file.type
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;

    const userText = input.trim();
    const file = selectedFile;
    
    let fileData;
    if (file) {
      try {
        fileData = await fileToGenerativePart(file);
      } catch (err) {
        console.error("Error reading file:", err);
        return;
      }
    }

    const newUserMsg: Message = {
      role: 'user',
      text: userText,
      fileData,
      fileName: file?.name
    };

    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    setInput('');
    setSelectedFile(null);
    setIsLoading(true);

    try {
      // Build contents array for Gemini API
      // We skip the first message if it's the default greeting to ensure the conversation starts with the user
      const apiContents = newMessages
        .filter((msg, idx) => !(idx === 0 && msg.role === 'model'))
        .map(msg => {
          const parts: any[] = [];
          if (msg.fileData) {
            parts.push({ inlineData: msg.fileData });
          }
          if (msg.text) {
            parts.push({ text: msg.text });
          }
          // If a user message only has a file, Gemini still requires some text or it might fail depending on the model.
          // We'll add a dummy text if it's completely empty, but usually users type something.
          if (parts.length === 1 && msg.fileData) {
            parts.push({ text: 'يرجى تحليل هذا الملف.' });
          }
          return {
            role: msg.role,
            parts
          };
        });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: apiContents,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }]
        }
      });
      
      setMessages(prev => [...prev, { role: 'model', text: response.text || 'عذراً، لم أتمكن من فهم ذلك.' }]);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة لاحقاً.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end pointer-events-none">
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 left-4 h-[70vh] sm:bottom-24 sm:right-6 sm:left-auto sm:w-[400px] sm:h-[600px] bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 flex flex-col overflow-hidden transition-all transform origin-bottom-right pointer-events-auto">
          {/* Header */}
          <div className="bg-primary text-white p-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <Bot />
              <h3 className="font-bold">المساعد الذكي</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-secondary text-white' : 'bg-primary text-white'}`}>
                  {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
                </div>
                <div className={`p-3 rounded-2xl max-w-[85%] sm:max-w-[75%] text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-secondary text-white rounded-tl-none' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-tr-none shadow-sm'
                }`}>
                  {msg.fileName && (
                    <div className="flex items-center gap-2 bg-black/10 p-2 rounded-lg mb-2 text-xs">
                      <FileText size={14} />
                      <span className="truncate">{msg.fileName}</span>
                    </div>
                  )}
                  {msg.role === 'user' ? (
                    msg.text
                  ) : (
                    <div className="markdown-body prose prose-sm prose-slate max-w-none rtl" dir="rtl">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                  <Bot size={16} />
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 rounded-tr-none shadow-sm flex gap-1 items-center">
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-slate-100 flex flex-col shrink-0">
            {selectedFile && (
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText size={16} className="text-primary" />
                  <span className="truncate max-w-[200px] font-medium">{selectedFile.name}</span>
                </div>
                <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="p-3 flex gap-2 items-center">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.txt,image/*"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-primary hover:bg-slate-50 transition-colors rounded-xl shrink-0"
                title="إرفاق ملف"
              >
                <Paperclip size={20} />
              </button>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="اسألني أي شيء..."
                className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm min-w-0"
              />
              <button 
                onClick={handleSend}
                disabled={(!input.trim() && !selectedFile) || isLoading}
                className="bg-primary text-white p-2 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center group w-10 h-10"
                title="إرسال"
              >
                <Send size={20} className="transform rtl:-scale-x-100 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform hover:shadow-primary/30 pointer-events-auto m-6 sm:m-0"
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
};
