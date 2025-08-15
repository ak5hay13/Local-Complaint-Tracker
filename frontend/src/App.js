import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Complaints from './pages/Complaints';
import RegisterComplaint from './pages/RegisterComplaint';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Volunteer from './pages/Volunteer';
import Profile from './pages/Profile';
import ComplaintMap from './pages/ComplaintMap';
import './App.css';


function PrivateRoute({ children }) {
  const user = JSON.parse(localStorage.getItem("user"));
  return user ? children : <Navigate to="/" />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/map" element={<ComplaintMap />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

      

        <Route
          path="/complaints"
          element={
            <PrivateRoute>
              <Complaints />
            </PrivateRoute>
          }
        />

        <Route
          path="/complaint"
          element={
            <PrivateRoute>
              <RegisterComplaint />
            </PrivateRoute>
          }
        />
        
        <Route
          path="/volunteer"
          element={
            <PrivateRoute>
              <Volunteer />
            </PrivateRoute>
          }
        />
        
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
