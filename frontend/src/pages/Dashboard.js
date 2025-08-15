import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api'; // Import your configured API

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeComplaints: 0,
    solvedComplaints: 0,
    totalComplaints: 0,
    volunteers: 0
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user from localStorage
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      setUser(userData);
    }
    
    // Fetch real statistics
    fetchDashboardStats();
  }, []);

const fetchDashboardStats = async () => {
  try {
    setLoading(true);
    console.log('🔍 Fetching dashboard stats...');

    let complaints = [];
    let volunteerGroups = [];

    // Try to fetch complaints with better data handling
    try {
      console.log('📞 Calling /api/complaints...');
      const complaintsResponse = await api.get('/api/complaints');
      
      console.log('✅ Raw complaints response:', complaintsResponse.data);
      
      // Handle different response formats
      if (complaintsResponse.data) {
        if (Array.isArray(complaintsResponse.data)) {
          complaints = complaintsResponse.data;
        } else if (complaintsResponse.data.data && Array.isArray(complaintsResponse.data.data)) {
          complaints = complaintsResponse.data.data;
        } else if (complaintsResponse.data.complaints && Array.isArray(complaintsResponse.data.complaints)) {
          complaints = complaintsResponse.data.complaints;
        } else {
          console.warn('⚠️ Complaints data is not in expected array format:', typeof complaintsResponse.data);
          complaints = [];
        }
      }
      
      console.log('✅ Processed complaints:', {
        isArray: Array.isArray(complaints),
        count: complaints.length,
        firstItem: complaints[0] || 'No items'
      });
      
    } catch (error) {
      console.warn('❌ Complaints API error:', error.response?.status, error.message);
      complaints = [];
    }

    // Try to fetch volunteer groups
    try {
      console.log('📞 Calling /api/volunteer-groups...');
      const volunteerResponse = await api.get('/api/volunteer-groups');
      volunteerGroups = volunteerResponse.data?.data || volunteerResponse.data || [];
      
      // Ensure it's an array
      if (!Array.isArray(volunteerGroups)) {
        console.warn('⚠️ Volunteer groups data is not an array:', typeof volunteerGroups);
        volunteerGroups = [];
      }
      
    } catch (error) {
      console.warn('❌ Volunteer groups API error:', error.response?.status, error.message);
      volunteerGroups = [];
    }

    // Now safely calculate stats (complaints is guaranteed to be an array)
    const activeComplaints = complaints.filter(complaint => 
      complaint.status === 'active' || 
      complaint.status === 'pending' ||
      complaint.status === 'in-progress' || 
      complaint.status === 'open'
    ).length;

    const solvedComplaints = complaints.filter(complaint => 
      complaint.status === 'resolved' || 
      complaint.status === 'closed' || 
      complaint.status === 'completed' ||
      complaint.status === 'solved'
    ).length;

    const totalComplaints = complaints.length;

    // Count unique volunteers
    const uniqueVolunteers = new Set();
    volunteerGroups.forEach(group => {
      if (group.members && Array.isArray(group.members)) {
        group.members.forEach(member => {
          if (member.userId) {
            uniqueVolunteers.add(member.userId);
          }
        });
      }
      if (group.createdBy) {
        uniqueVolunteers.add(group.createdBy);
      }
    });

    const volunteersCount = uniqueVolunteers.size;

    console.log('📊 Final Dashboard Stats:', {
      totalComplaints,
      activeComplaints,
      solvedComplaints,
      volunteersCount
    });

    setStats({
      activeComplaints,
      solvedComplaints,
      totalComplaints,
      volunteers: volunteersCount
    });

  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    // Keep default stats if everything fails
  } finally {
    setLoading(false);
  }
};



  const cards = [
    {
      title: 'Register New Complaint',
      icon: '📝',
      description: 'Submit a new complaint or issue that needs attention',
      color: 'bg-blue-500',
      path: '/complaint'
    },
    
    {
      title: 'Active Complaints',
      icon: '🟠',
      description: 'View and manage all active complaints',
      color: 'bg-orange-500',
      path: '/complaints',
      count: stats.activeComplaints // Show count on card
    },
    
    {
      title: 'Become a Volunteer',
      icon: '🤝',
      description: 'Join our team to help resolve community issues',
      color: 'bg-purple-500',
      path: '/volunteer',
      count: stats.volunteers // Show volunteer count
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Welcome section */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-8 bg-gradient-to-r from-blue-600 to-blue-800 sm:p-10 sm:pb-6">
              <div className="flex items-center justify-between flex-wrap">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Welcome, {user?.username || 'User'}!
                  </h2>
                  <p className="mt-2 text-blue-100">
                    Track and manage your complaints efficiently
                  </p>
                </div>
                <div className="mt-4 sm:mt-0">
                  <span className="inline-flex rounded-md shadow-sm">
                    <button
                      onClick={() => navigate('/complaint')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-5 font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue active:bg-blue-200 transition ease-in-out duration-150"
                    >
                      New Complaint
                    </button>
                  </span>
                </div>
              </div>
            </div>
            
            {/* Stats section with loading state */}
            <div className="bg-gray-50 px-6 py-4">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 bg-white rounded shadow animate-pulse">
                      <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                      <div className="h-8 bg-gray-300 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-white rounded shadow">
                    <p className="text-sm font-medium text-gray-500 truncate">Total Complaints</p>
                    <p className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalComplaints}</p>
                  </div>
                  <div className="p-4 bg-white rounded shadow">
                    <p className="text-sm font-medium text-gray-500 truncate">Active Complaints</p>
                    <p className="mt-1 text-3xl font-semibold text-orange-600">{stats.activeComplaints}</p>
                  </div>
                  <div className="p-4 bg-white rounded shadow">
                    <p className="text-sm font-medium text-gray-500 truncate">Solved Complaints</p>
                    <p className="mt-1 text-3xl font-semibold text-green-600">{stats.solvedComplaints}</p>
                  </div>
                  <div className="p-4 bg-white rounded shadow">
                    <p className="text-sm font-medium text-gray-500 truncate">Volunteers</p>
                    <p className="mt-1 text-3xl font-semibold text-purple-600">{stats.volunteers}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cards section */}
        <div className="mt-8 px-4 sm:px-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            <button 
              onClick={fetchDashboardStats}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              disabled={loading}
            >
              {loading ? 'Updating...' : '🔄 Refresh Stats'}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card, index) => (
              <div 
                key={index} 
                className={`${card.color} overflow-hidden shadow rounded-lg cursor-pointer transition-transform duration-300 hover:scale-105`}
                onClick={() => navigate(card.path)}
              >
                <div className="px-4 py-5 sm:p-6 text-white">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-white bg-opacity-30 rounded-full p-3">
                      <span className="text-2xl">{card.icon}</span>
                    </div>
                    {card.count !== undefined && card.count > 0 && (
                      <div className="ml-auto bg-white text-gray-800 rounded-full h-8 w-8 flex items-center justify-center font-bold text-sm">
                        {card.count}
                      </div>
                    )}
                  </div>
                  <h3 className="mt-4 text-lg font-medium">{card.title}</h3>
                  <p className="mt-1 text-sm text-white text-opacity-80">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
