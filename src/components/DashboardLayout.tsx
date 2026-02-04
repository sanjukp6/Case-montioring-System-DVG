import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Home,
    FilePlus,
    Search,
    Calendar,
    FileText,
    Users,
    LogOut,
    Menu,
    X,
    Key,
    Shield,
    ChevronDown,
    Scale,
} from 'lucide-react';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
    roles?: ('Writer' | 'SHO' | 'SP')[];
}

const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Home / Dashboard', icon: <Home size={20} /> },
    { path: '/case/new', label: 'Register New Case', icon: <FilePlus size={20} />, roles: ['Writer', 'SHO'] },
    { path: '/search', label: 'Search / View Case', icon: <Search size={20} /> },
    { path: '/hearings', label: 'Update Hearing Dates', icon: <Calendar size={20} />, roles: ['SHO', 'SP'] },
    { path: '/reports', label: 'Reports', icon: <FileText size={20} />, roles: ['SHO', 'SP'] },
    { path: '/users', label: 'User Management', icon: <Users size={20} />, roles: ['SP'] },
];

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const { user, logout, hasRole } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filteredNavItems = navItems.filter(
        (item) => !item.roles || hasRole(item.roles)
    );

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'SP':
                return 'bg-purple-100 text-purple-800';
            case 'SHO':
                return 'bg-green-100 text-green-800';
            case 'Writer':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-blue-900 to-blue-950 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Sidebar Header */}
                <div className="p-4 border-b border-blue-800">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                            <Scale size={24} />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">Case Tracking</h1>
                            <p className="text-xs text-blue-300">Davangere Police</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-1">
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-white/20 text-white'
                                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                                }`
                            }
                        >
                            {item.icon}
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Sidebar Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-800">
                    <div className="text-xs text-blue-300 text-center">
                        <p>© 2025 Davangere Police</p>
                        <p>v1.0.0</p>
                    </div>
                </div>
            </aside>

            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Top Bar */}
                <header className="bg-white shadow-sm sticky top-0 z-30">
                    <div className="flex items-center justify-between px-4 py-3">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                        >
                            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>

                        {/* Welcome Message */}
                        <div className="hidden sm:flex items-center space-x-2">
                            <Shield size={20} className="text-blue-600" />
                            <span className="text-gray-700">
                                Welcome, <strong>{user?.name}</strong>
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleBadgeColor(user?.role || '')}`}>
                                {user?.role}
                            </span>
                        </div>

                        {/* Right Side Actions */}
                        <div className="flex items-center space-x-2">
                            {/* Mobile: Show role badge */}
                            <span className={`sm:hidden text-xs px-2 py-1 rounded-full font-medium ${getRoleBadgeColor(user?.role || '')}`}>
                                {user?.role}
                            </span>

                            {/* User Menu Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
                                >
                                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                                        {user?.name?.charAt(0) || 'U'}
                                    </div>
                                    <ChevronDown size={16} className="text-gray-500" />
                                </button>

                                {/* Dropdown Menu */}
                                {userMenuOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setUserMenuOpen(false)}
                                        />
                                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-20">
                                            <div className="p-3 border-b">
                                                <p className="font-semibold text-gray-800">{user?.name}</p>
                                                <p className="text-xs text-gray-500">{user?.policeStation}</p>
                                                <p className="text-xs text-gray-400">{user?.employeeNumber}</p>
                                            </div>
                                            <div className="p-2">
                                                <button
                                                    onClick={() => {
                                                        setUserMenuOpen(false);
                                                        navigate('/profile');
                                                    }}
                                                    className="w-full flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                                >
                                                    <Users size={18} />
                                                    <span>Update Profile</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setUserMenuOpen(false);
                                                        navigate('/change-password');
                                                    }}
                                                    className="w-full flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                                >
                                                    <Key size={18} />
                                                    <span>Change Password</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setUserMenuOpen(false);
                                                        handleLogout();
                                                    }}
                                                    className="w-full flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                >
                                                    <LogOut size={18} />
                                                    <span>Logout</span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};
