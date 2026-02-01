
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { UserData, AppState } from './types';
import BookingFlow from './BookingFlow';
import AdminDashboard from './AdminDashboard';
import DailyReportView from './DailyReportView';
import Login from './Login';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState & { reportDate?: string }>({
    view: 'user',
    step: 1,
    userData: null
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const dateParam = params.get('date');

    if (viewParam === 'report' && dateParam) {
      // Fixed: Removed 'as any' as 'report' is now a valid member of AppState.view
      setAppState(prev => ({ ...prev, view: 'report', reportDate: dateParam }));
    } else if (params.get('panel') === 'admin' || viewParam === 'admin') {
      setAppState(prev => ({ ...prev, view: 'admin' }));
    }
  }, []);

  const isEmbedded = useMemo(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('embed') === 'true';
    }
    return false;
  }, []);

  const handleNextStep = useCallback((data: UserData) => {
    setAppState(prev => ({
      ...prev,
      userData: data,
      step: 2
    }));
  }, []);

  const resetFlow = useCallback(() => {
    setAppState({
      view: 'user',
      step: 1,
      userData: null
    });
  }, []);

  const toggleView = () => {
    setAppState(prev => ({
      ...prev,
      view: prev.view === 'user' ? 'admin' : 'user',
      step: 1
    }));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAppState(prev => ({ ...prev, view: 'user' }));
  };

  // Fixed error: This comparison is now valid since 'report' was added to AppState's view property in types.ts
  if (appState.view === 'report' && appState.reportDate) {
    return <DailyReportView date={appState.reportDate} />;
  }

  return (
    <div className={`min-h-screen flex flex-col ${isEmbedded ? 'bg-transparent' : 'bg-slate-50'} font-sans`}>
      {!isEmbedded && (
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-2.5 md:py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
          <div className="flex items-center">
            <span className="text-sm md:text-xl font-black text-slate-900 tracking-tighter uppercase">Surf Side Urla</span>
          </div>
          
          <div className="flex items-center gap-2">
            {isLoggedIn && appState.view === 'admin' && (
              <button
                onClick={handleLogout}
                className="px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors"
              >
                Çıkış
              </button>
            )}
            <button
              onClick={toggleView}
              className="px-3 md:px-5 py-1.5 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-all active:scale-95"
            >
              {appState.view === 'user' ? 'Admin Paneli' : 'Rezervasyon'}
            </button>
          </div>
        </header>
      )}

      <main className={`flex-1 flex flex-col items-center ${isEmbedded ? 'p-2 md:p-4' : 'p-3 md:p-8'}`}>
        {appState.view === 'user' ? (
          <div className="w-full max-w-4xl">
            {appState.step !== 3 && (
              <div className={`text-center mb-6 md:mb-10`}>
                <h1 className="text-xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-tight">
                  {appState.step === 1 ? 'Rezervasyon Bilgileri' : 'Aktivite Seçimi'}
                </h1>
                <p className="mt-1 text-[10px] md:text-base text-slate-500 font-medium max-w-lg mx-auto leading-tight md:leading-relaxed">
                  Denizle buluşmak için formu doldurmanız yeterli.
                </p>
              </div>
            )}

            <BookingFlow 
              step={appState.step}
              userData={appState.userData}
              onStep1Submit={handleNextStep}
              onComplete={() => setAppState(prev => ({ ...prev, step: 3 }))}
              onReset={resetFlow}
            />
          </div>
        ) : (
          isLoggedIn ? (
            <div className="w-full">
              {isEmbedded && (
                <button onClick={toggleView} className="mb-4 text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2 hover:translate-x-1 transition-transform">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                   Müşteri Görünümüne Dön
                </button>
              )}
              <AdminDashboard />
            </div>
          ) : (
            <Login onLogin={() => setIsLoggedIn(true)} onCancel={() => setAppState(prev => ({ ...prev, view: 'user' }))} />
          )
        )}
      </main>

      {!isEmbedded && (
        <footer className="py-4 md:py-6 text-center text-slate-400 text-[8px] md:text-[10px] font-bold uppercase tracking-widest border-t border-slate-200 bg-white">
          &copy; {new Date().getFullYear()} Surf Side Urla. Tüm hakları saklıdır.
        </footer>
      )}
    </div>
  );
};

export default App;
