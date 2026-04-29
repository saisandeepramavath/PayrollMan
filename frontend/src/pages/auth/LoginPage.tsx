import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { login as loginApi } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface LoginForm {
  email: string;
  password: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setServerError('');
    try {
      const { access_token } = await loginApi(data);
      await login(access_token);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Invalid credentials';
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.svg" alt="PayrollMan Logo" className="w-12 h-12 mb-4 shadow-lg shadow-indigo-600/30" />
          <h1 className="text-xl font-bold text-slate-100">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your PayrollMan account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm p-7 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <Input
              label="Email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
              })}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 pr-11 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all hover:border-slate-600"
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rose-400">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3">
                <p className="text-xs text-rose-400">{serverError}</p>
              </div>
            )}

            <Button type="submit" isLoading={isSubmitting} className="w-full justify-center mt-1">
              Sign in
            </Button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
