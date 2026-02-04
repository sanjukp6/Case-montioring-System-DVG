import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { POLICE_STATIONS, UserRole, User } from '../types/User';
import {
    Users,
    Plus,
    Trash2,
    Search,
    Shield,
    Building2,
    AlertCircle,
    CheckCircle,
    X,
    Loader2,
} from 'lucide-react';

export const UserManagement: React.FC = () => {
    const { getAllUsers, createUser, deleteUser, user: currentUser } = useAuth();
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        role: 'Writer' as UserRole,
        policeStation: '',
        employeeNumber: '',
    });

    // Fetch users on mount
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        const fetchedUsers = await getAllUsers();
        setUsers(fetchedUsers);
        setIsLoading(false);
    };

    const filteredUsers = users.filter(
        (u) =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.policeStation.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateUser = async () => {
        if (!formData.username || !formData.password || !formData.name || !formData.policeStation) {
            setMessage({ type: 'error', text: 'Please fill all required fields' });
            return;
        }

        if (formData.password.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setIsSubmitting(true);
        const result = await createUser(formData);
        setIsSubmitting(false);

        if (result.success) {
            setMessage({ type: 'success', text: 'User created successfully!' });
            setShowAddModal(false);
            setFormData({
                username: '',
                password: '',
                name: '',
                role: 'Writer',
                policeStation: '',
                employeeNumber: '',
            });
            fetchUsers(); // Refresh user list
        } else {
            setMessage({ type: 'error', text: result.error || 'Failed to create user' });
        }

        setTimeout(() => setMessage(null), 3000);
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!window.confirm(`Are you sure you want to delete user "${userName}"?`)) {
            return;
        }

        const result = await deleteUser(userId);

        if (result.success) {
            setMessage({ type: 'success', text: 'User deleted successfully!' });
            fetchUsers(); // Refresh user list
        } else {
            setMessage({ type: 'error', text: result.error || 'Failed to delete user' });
        }

        setTimeout(() => setMessage(null), 3000);
    };

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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
                    <p className="text-gray-600">Manage system users and their roles</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition"
                >
                    <Plus size={20} />
                    <span>Add User</span>
                </button>
            </div>

            {/* Message */}
            {message && (
                <div
                    className={`flex items-center space-x-2 px-4 py-3 rounded-lg ${message.type === 'success'
                            ? 'bg-green-50 border border-green-200 text-green-700'
                            : 'bg-red-50 border border-red-200 text-red-700'
                        }`}
                >
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span>{message.text}</span>
                </div>
            )}

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={32} className="animate-spin text-blue-600" />
                        <span className="ml-2 text-gray-600">Loading users...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Username</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Police Station</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee No</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                                            <Users size={48} className="mx-auto mb-4 text-gray-300" />
                                            <p className="text-lg font-medium">No users found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((userItem) => (
                                        <tr key={userItem.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                                                        {userItem.name.charAt(0)}
                                                    </div>
                                                    <span className="font-medium text-gray-800">{userItem.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{userItem.username}</td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                                                        userItem.role
                                                    )}`}
                                                >
                                                    {userItem.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{userItem.policeStation}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{userItem.employeeNumber}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center">
                                                    {userItem.id !== currentUser?.id && (
                                                        <button
                                                            onClick={() => handleDeleteUser(userItem.id, userItem.name)}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center">
                                <Users size={24} className="mr-2 text-blue-600" />
                                Add New User
                            </h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter full name"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="Enter username"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Minimum 6 characters"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Number</label>
                                <input
                                    type="text"
                                    value={formData.employeeNumber}
                                    onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                                    placeholder="Enter employee number"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                                <div className="relative">
                                    <Shield size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="Writer">Writer / Constable</option>
                                        <option value="SHO">Station House Officer (SHO)</option>
                                        <option value="SP">Superintendent of Police (SP)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Police Station *</label>
                                <div className="relative">
                                    <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <select
                                        value={formData.policeStation}
                                        onChange={(e) => setFormData({ ...formData, policeStation: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select police station</option>
                                        {POLICE_STATIONS.map((station) => (
                                            <option key={station} value={station}>
                                                {station}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end space-x-3 p-5 border-t bg-gray-50 rounded-b-2xl">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateUser}
                                disabled={isSubmitting}
                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center space-x-2 disabled:opacity-50"
                            >
                                {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                                <span>{isSubmitting ? 'Creating...' : 'Create User'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
