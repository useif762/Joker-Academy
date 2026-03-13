import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center text-white">
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 max-w-md w-full">
            <h1 className="text-4xl mb-4">⚠️</h1>
            <h2 className="text-2xl font-black mb-4">عذراً، حدث خطأ غير متوقع</h2>
            <p className="text-slate-300 mb-8 font-bold">
              يرجى محاولة إعادة تحميل الصفحة. إذا استمرت المشكلة، يرجى الاتصال بالدعم.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
            >
              إعادة تحميل الصفحة
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/';
              }}
              className="w-full mt-4 py-2 text-slate-400 font-bold text-sm hover:text-slate-200 transition-colors"
            >
              مسح البيانات والعودة للرئيسية
            </button>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 p-4 bg-black/50 rounded-xl text-left overflow-auto max-h-40 text-xs font-mono text-red-400">
                {this.state.error?.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
