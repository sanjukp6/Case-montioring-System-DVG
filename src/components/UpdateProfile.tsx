import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Save, AlertCircle, CheckCircle } from 'lucide-react';

export const UpdateProfile: React.FC = () => {
    const { user, updateProfile } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [employeeNumber, setEmployeeNumber] = useState(user?.employeeNumber || '');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (!name.trim()) {
            setMessage({ type: 'error', text: 'Name is required' });
            return;
        }

        if (name.trim().length < 3) {
            setMessage({ type: 'error', text: 'Name must be at least 3 characters' });
            return;
        }

        setIsLoading(true);

        try {
            const result = await updateProfile({ name: name.trim(), employeeNumber: employeeNumber.trim() });

            if (result.success) {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to update profile' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred while updating profile' });
        }

        setIsLoading(false);
    };

    return (
        <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <User size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Update Profile</h1>
                            <p className="text-blue-100 text-sm">Change your personal information</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
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

                    {/* Current Info */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <p className="text-sm text-gray-600">
                            <span className="font-medium">Username:</span> {user?.username}
                        </p>
                        <p className="text-sm text-gray-600">
                            <span className="font-medium">Role:</span> {user?.role}
                        </p>
                        <p className="text-sm text-gray-600">
                            <span className="font-medium">Police Station:</span> {user?.policeStation}
                        </p>
                    </div>

                    {/* Name Field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your full name"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Employee Number Field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Employee Number
                        </label>
                        <input
                            type="text"
                            value={employeeNumber}
                            onChange={(e) => setEmployeeNumber(e.target.value)}
                            placeholder="Enter your employee number"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span>Updating...</span>
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                <span>Update Profile</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
