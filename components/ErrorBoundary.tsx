import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public props!: Props;
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="bg-white rounded-3xl p-8 shadow-xl max-w-md border border-slate-200">
            <h1 className="text-2xl font-black text-rose-600 mb-3">დაფიქსირდა შეცდომა</h1>
            <p className="text-slate-600 mb-6 text-sm">
              აპლიკაციაში მოხდა გაუთვალისწინებელი შეცდომა. გთხოვთ გადატვირთოთ გვერდი.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-md active:scale-95"
            >
              გვერდის გადატვირთვა
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
