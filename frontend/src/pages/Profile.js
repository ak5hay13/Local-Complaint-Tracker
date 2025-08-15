import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../api'; // Import your API instance

function Profile() {
  // Get user data from localStorage
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : { 
      username: 'User', 
      email: 'user@example.com',
      phone: '',
      address: ''
    };
  });

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email,
    phone: user.phone || '',
    address: user.address || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate form data
  const validateForm = () => {
    const newErrors = {};

    // Basic validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation (only if user is trying to change password)
    const isChangingPassword = formData.currentPassword || formData.newPassword || formData.confirmPassword;
    
    if (isChangingPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required to change password';
      }

      if (!formData.newPassword) {
        newErrors.newPassword = 'New password is required';
      } else if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'New password must be at least 6 characters';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your new password';
      } else if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }

      if (formData.currentPassword === formData.newPassword) {
        newErrors.newPassword = 'New password must be different from current password';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const isChangingPassword = formData.currentPassword || formData.newPassword || formData.confirmPassword;
      
      // Prepare update data
      const updateData = {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        address: formData.address
      };

      // Add password data if changing password
      if (isChangingPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      console.log('🔄 Updating profile...', { ...updateData, currentPassword: '***', newPassword: '***' });

      // Call API to update profile
      const response = await api.put('/api/auth/profile', updateData);

      if (response.data.success) {
        // Update local user state and localStorage
        const updatedUser = {
          ...user,
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          address: formData.address
        };
        
        setUser(updatedUser);
        
        // Update localStorage with new user data (but keep the token)
        const currentUserData = JSON.parse(localStorage.getItem('user') || '{}');
        const newUserData = {
          ...currentUserData,
          ...updatedUser
        };
        localStorage.setItem('user', JSON.stringify(newUserData));
        
        // Reset form and exit edit mode
        setFormData({
          username: updatedUser.username,
          email: updatedUser.email,
          phone: updatedUser.phone,
          address: updatedUser.address,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        setIsEditing(false);
        setErrors({});
        
        if (isChangingPassword) {
          alert('✅ Profile and password updated successfully!');
        } else {
          alert('✅ Profile updated successfully!');
        }
        
      } else {
        throw new Error(response.data.message || 'Update failed');
      }
      
    } catch (error) {
      console.error('❌ Profile update error:', error);
      
      // Handle specific error messages
      if (error.response?.data?.message) {
        if (error.response.data.message.includes('password')) {
          setErrors({ currentPassword: 'Current password is incorrect' });
        } else if (error.response.data.message.includes('email')) {
          setErrors({ email: 'Email is already in use' });
        } else if (error.response.data.message.includes('username')) {
          setErrors({ username: 'Username is already taken' });
        } else {
          alert('❌ ' + error.response.data.message);
        }
      } else {
        alert('❌ Failed to update profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original user data
    setFormData({
      username: user.username,
      email: user.email,
      phone: user.phone || '',
      address: user.address || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setErrors({});
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your account information and preferences</p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {isEditing ? (
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  {/* Username Field */}
                  <div className="sm:col-span-3">
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                      Username *
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="username"
                        id="username"
                        value={formData.username}
                        onChange={handleChange}
                        className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                          errors.username ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                        required
                      />
                      {errors.username && (
                        <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                      )}
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="sm:col-span-3">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email address *
                    </label>
                    <div className="mt-1">
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                          errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                        required
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Phone Field */}
                  <div className="sm:col-span-3">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <div className="mt-1">
                      <input
                        type="tel"
                        name="phone"
                        id="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+1 (555) 123-4567"
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  {/* Address Field */}
                  <div className="sm:col-span-6">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                      Address
                    </label>
                    <div className="mt-1">
                      <textarea
                        name="address"
                        id="address"
                        rows="3"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Enter your full address..."
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  {/* Password Change Section */}
                  <div className="sm:col-span-6 border-t border-gray-200 pt-5">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">🔒 Change Password</h3>
                    <p className="mt-1 text-sm text-gray-500">Leave all password fields blank if you don't want to change your password</p>
                  </div>

                  {/* Current Password */}
                  <div className="sm:col-span-6">
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                      Current Password
                    </label>
                    <div className="mt-1">
                      <input
                        type="password"
                        name="currentPassword"
                        id="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleChange}
                        className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                          errors.currentPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                        placeholder="Enter your current password"
                      />
                      {errors.currentPassword && (
                        <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
                      )}
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="sm:col-span-3">
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                      New Password
                    </label>
                    <div className="mt-1">
                      <input
                        type="password"
                        name="newPassword"
                        id="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                          errors.newPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                        placeholder="Enter new password (min 6 characters)"
                      />
                      {errors.newPassword && (
                        <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                      )}
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="sm:col-span-3">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Confirm New Password
                    </label>
                    <div className="mt-1">
                      <input
                        type="password"
                        name="confirmPassword"
                        id="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                          errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                        }`}
                        placeholder="Confirm your new password"
                      />
                      {errors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={loading}
                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      '💾 Save Changes'
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="px-4 py-5 sm:p-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">👤 Username</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.username}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">📧 Email address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">📱 Phone number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.phone || 'Not provided'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">🏠 Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.address || 'Not provided'}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">🔒 Password</dt>
                    <dd className="mt-1 text-sm text-gray-900">••••••••</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">📅 Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900">{new Date().toLocaleDateString()}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Profile;
