
import React, { useState } from 'react';

interface LoginProps {
  onLogin: () => void;
  onCancel: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'surfside2024') {
      onLogin();
    } else {
      setError('Geçersiz kullanıcı adı veya şifre.');
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
        <h2 className="text-2xl font-black text-center mb-8 uppercase tracking-tighter">Panel Girişi</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required type="text" placeholder="admin" className="w-full p-4 border rounded-xl" value={username} onChange={e => setUsername(e.target.value)} />
          <input required type="password" placeholder="••••••••" className="w-full p-4 border rounded-xl" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <div className="text-rose-600 text-xs font-bold text-center">{error}</div>}
          <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-xl font-black">Giriş Yap</button>
          <button type="button" onClick={onCancel} className="w-full text-slate-400 text-xs font-black p-2">Vazgeç</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
