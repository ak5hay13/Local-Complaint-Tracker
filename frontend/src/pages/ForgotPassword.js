// src/pages/ForgotPassword.js
import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      // ✅ FIXED: Use the correct endpoint that matches your backend
      const res = await api.post("/api/auth/forgot-password", { email });

      console.log('Forgot password response:', res.data);

      if (res.data.success) {
        localStorage.setItem('resetEmail', email);
        setMessage('OTP sent! Please check your email.');
        setTimeout(() => navigate('/reset-password'), 2000);
      } else {
        setMessage(res.data.message);
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setMessage(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-md rounded-md p-6 w-full max-w-md space-y-4">
        <h2 className="text-xl font-semibold text-center">Forgot Password</h2>
        <p className="text-sm text-gray-600 text-center">
          Enter your registered email to receive an OTP
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Enter your registered email"
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <button 
            type="submit" 
            className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </form>
        {message && (
          <p className={`text-center text-sm ${
            message.includes('sent') ? 'text-green-600' : 'text-red-500'
          }`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
