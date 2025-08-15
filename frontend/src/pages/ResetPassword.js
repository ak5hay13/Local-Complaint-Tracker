// src/pages/ResetPassword.js
import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import api from "../api"; // ← Use your configured api instance instead of axios

export default function ResetPassword() {
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const email = localStorage.getItem("resetEmail");

  // Redirect if no email found
  if (!email) {
    return <Navigate to="/forgot-password" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      // ✅ Use your api instance with relative path instead of hardcoded URL
      const res = await api.post("/api/auth/verify-reset", {
        email,
        otp,
        newPassword,
      });

      if (res.data.success) {
        localStorage.removeItem("resetEmail");
        setMessage("Password updated successfully! Redirecting...");
        setTimeout(() => navigate("/"), 1500);
      } else {
        setMessage(res.data.message);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-md rounded-md p-6 w-full max-w-md space-y-4">
        <h2 className="text-xl font-semibold text-center">Reset Password</h2>
        <p className="text-sm text-gray-600 text-center">
          Enter the OTP sent to: <strong>{email}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Enter 6-digit OTP"
            className="w-full p-2 border border-gray-300 rounded-md"
            required
            minLength={6}
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Only allow digits
          />
          <input
            type="password"
            placeholder="Enter new password"
            className="w-full p-2 border border-gray-300 rounded-md"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button 
            type="submit" 
            className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition"
          >
            Reset Password
          </button>
        </form>
        {message && (
          <p className={`text-center text-sm ${
            message.includes('successfully') ? 'text-green-600' : 'text-red-500'
          }`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
