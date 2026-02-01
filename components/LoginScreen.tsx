import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha no login');
      }

      // Success
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans">
      {/* Left Side - Brand Visuals */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 text-white">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-brand-gradient opacity-10"></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-meta rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-wa rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
            <span className="font-extrabold text-xl tracking-tight text-white">T</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Talke.ia</span>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Automatize conversas, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">feche mais negócios.</span>
          </h1>
          <p className="text-slate-400 text-lg mb-8 leading-relaxed">
            A plataforma CRM e Omnichannel preferida por empresas que buscam escalar seu atendimento no WhatsApp sem perder a qualidade humana.
          </p>

          {/* Social Proof Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <svg key={i} className="w-5 h-5 text-amber-400 fill-current" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              ))}
            </div>
            <p className="text-slate-200 italic mb-4">"O Talke.ia transformou completamente a forma como gerenciamos nossos leads. Nossa conversão aumentou 40% no primeiro mês."</p>
            <div className="flex items-center gap-3">
              <img src="https://picsum.photos/50/50?random=1" alt="User" className="w-10 h-10 rounded-full border-2 border-white/20" />
              <div>
                <p className="text-sm font-semibold">Ricardo Mendes</p>
                <p className="text-xs text-slate-400">CEO, Growth Corp</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex gap-6 text-sm text-slate-400">
          <span>© 2024 Talke.ia</span>
          <a href="#" className="hover:text-white transition-colors">Termos</a>
          <a href="#" className="hover:text-white transition-colors">Privacidade</a>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Bem-vindo de volta</h2>
            <p className="text-slate-500 mt-2">Insira suas credenciais para acessar o workspace.</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              {/* Google Button */}
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-medium py-3 rounded-xl transition-all duration-200 group"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Entrar com Google
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink-0 mx-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ou continue com email</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Email corporativo</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-meta transition-colors" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-meta/20 focus:border-meta transition-all duration-200 sm:text-sm"
                    placeholder="voce@empresa.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-semibold text-slate-700">Senha</label>
                  <a href="#" className="text-xs font-medium text-meta hover:text-meta/80">Esqueceu a senha?</a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-meta transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-meta/20 focus:border-meta transition-all duration-200 sm:text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600 cursor-pointer" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600 cursor-pointer" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-meta focus:ring-meta border-slate-300 rounded cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 cursor-pointer select-none">
                Lembrar deste dispositivo por 30 dias
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-meta/25 text-sm font-bold text-white bg-brand-gradient hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-meta disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  Acessar Painel <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Ainda não tem uma conta?{' '}
            <a href="#" className="font-semibold text-meta hover:text-meta/80 transition-colors">
              Fale com um especialista
            </a>
          </p>

          <div className="pt-8 border-t border-slate-100 flex items-center justify-center gap-6 text-slate-400 grayscale opacity-70">
            <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest">
              <ShieldCheck size={16} /> Enterprise Grade Security
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;