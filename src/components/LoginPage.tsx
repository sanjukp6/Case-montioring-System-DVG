import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Lock, RefreshCw, Eye, EyeOff, AlertCircle } from 'lucide-react';

// Generate random captcha
const generateCaptcha = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let captcha = '';
    for (let i = 0; i < 6; i++) {
        captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return captcha;
};

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [captchaInput, setCaptchaInput] = useState('');
    const [captcha, setCaptcha] = useState(generateCaptcha());
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    const refreshCaptcha = () => {
        setCaptcha(generateCaptcha());
        setCaptchaInput('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Please enter username and password');
            return;
        }

        if (captchaInput.toLowerCase() !== captcha.toLowerCase()) {
            setError('Invalid captcha. Please try again.');
            refreshCaptcha();
            return;
        }

        setIsLoading(true);

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const result = await login(username, password);

        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.error || 'Login failed');
            refreshCaptcha();
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col">
            {/* Top Header Bar */}
            <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        {/* Left - Logo */}
                        <div className="flex items-center space-x-3">
                            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center p-1 shadow-md overflow-hidden">
                                <img
                                    src="/logo.png"
                                    alt="Police Case Tracking Logo"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-xs text-blue-200">Government of Karnataka</p>
                                <p className="text-sm font-semibold">Karnataka State Police</p>
                            </div>
                        </div>

                        {/* Center - Title */}
                        <div className="text-center flex-1 px-4">
                            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-wide">
                                COURT CASE MONITORING SYSTEM
                            </h1>
                            <p className="text-blue-200 text-sm hidden sm:block">DAVANGERE DISTRICT</p>
                        </div>

                        {/* Right - Placeholder for symmetry */}
                        <div className="w-14 sm:w-24"></div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Login Card */}
                    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                        {/* Card Header */}
                        <div className="bg-gradient-to-r from-blue-800 to-blue-900 px-6 py-8 text-center">
                            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur">
                                <Shield size={40} className="text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Secure Login</h2>
                            <p className="text-blue-200 text-sm mt-1">Enter your credentials to access the system</p>
                        </div>

                        {/* Login Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Error Message */}
                            {error && (
                                <div className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                    <AlertCircle size={18} />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}

                            {/* Username Field */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Username / Employee Number
                                </label>
                                <div className="relative">
                                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Enter your username"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Captcha Field */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Security Code (Captcha)
                                </label>
                                <div className="flex space-x-3">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={captchaInput}
                                            onChange={(e) => setCaptchaInput(e.target.value)}
                                            placeholder="Enter code shown"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                            autoComplete="off"
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div
                                            className="px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg border border-gray-300 select-none"
                                            style={{
                                                fontFamily: 'monospace',
                                                fontSize: '18px',
                                                letterSpacing: '3px',
                                                fontWeight: 'bold',
                                                textDecoration: 'line-through',
                                                fontStyle: 'italic',
                                                background: 'linear-gradient(45deg, #f0f0f0, #e0e0e0, #f0f0f0)',
                                            }}
                                        >
                                            {captcha}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={refreshCaptcha}
                                            className="p-3 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            title="Refresh Captcha"
                                        >
                                            <RefreshCw size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Login Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            >
                                {isLoading ? (
                                    <>
                                        <RefreshCw size={20} className="animate-spin" />
                                        <span>Logging in...</span>
                                    </>
                                ) : (
                                    <>
                                        <Lock size={20} />
                                        <span>Login</span>
                                    </>
                                )}
                            </button>

                            {/* Forgot Password Link */}
                            <div className="text-center">
                                <button
                                    type="button"
                                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                    onClick={() => alert('Please contact your Station House Officer (SHO) or System Administrator to reset your password.')}
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Demo Credentials Note */}
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                        <p className="font-semibold text-blue-800 mb-2">Demo Credentials:</p>
                        <div className="grid grid-cols-3 gap-2 text-blue-700">
                            <div>
                                <p className="font-medium">Writer:</p>
                                <p className="text-xs">writer1 / password123</p>
                            </div>
                            <div>
                                <p className="font-medium">SHO:</p>
                                <p className="text-xs">sho1 / password123</p>
                            </div>
                            <div>
                                <p className="font-medium">SP:</p>
                                <p className="text-xs">sp1 / password123</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-slate-800 text-slate-300 py-4 text-center text-sm">
                <p>© 2025 Davangere Police</p>
                <p className="text-xs mt-1 text-slate-400">v1.0.0</p>
            </footer>
        </div>
    );
};
