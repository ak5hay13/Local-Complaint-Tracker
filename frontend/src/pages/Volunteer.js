import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import TabSwitcher from '../components/TabSwitcher';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../api';

// Fix for default marker icon issue in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom group marker icon
const createGroupIcon = (memberCount, isOwner) => {
  const color = isOwner ? '#dc2626' : '#059669';
  
  return L.divIcon({
    className: 'group-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        font-weight: bold;
      ">${memberCount}</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

function Volunteer() {
  // State management
  const [volunteerGroups, setVolunteerGroups] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  
  // Modal states
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupDetailsModal, setShowGroupDetailsModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  // Form state
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    maxMembers: 5,
    skills: ''
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    
    fetchData();
    getCurrentUserLocation();
  }, []);

  const getCurrentUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error('Location error:', error)
      );
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch complaints and volunteer groups
      const [complaintsRes, groupsRes] = await Promise.all([
        api.get('/api/complaints'),
        api.get('/api/volunteer-groups')
      ]);
      
      const activeComplaints = (complaintsRes.data.data || complaintsRes.data).filter(c => 
        c.status !== 'completed' && c.status !== 'resolved' && c.latitude && c.longitude
      );
      
      setComplaints(activeComplaints);
      setVolunteerGroups(groupsRes.data.data || groupsRes.data);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

// Calculate group statistics using fresh user data
const getGroupStats = () => {
  const freshUser = JSON.parse(localStorage.getItem('user') || '{}');
  
  console.log('🔍 Calculating stats for user:', freshUser._id);
  
  const myGroups = volunteerGroups.filter(g => {
    const isMyGroup = g.createdBy === freshUser._id;
    console.log(`My Groups - "${g.name}": createdBy=${g.createdBy}, myId=${freshUser._id}, match=${isMyGroup}`);
    return isMyGroup;
  });
  
  const joinedGroups = volunteerGroups.filter(g => {
    const hasMembers = g.members && g.members.some(m => m.userId === freshUser._id);
    const isNotMyGroup = g.createdBy !== freshUser._id;
    const isJoined = hasMembers && isNotMyGroup;
    console.log(`Joined Groups - "${g.name}": hasMembers=${hasMembers}, isNotMyGroup=${isNotMyGroup}, isJoined=${isJoined}`);
    if (hasMembers) {
      console.log(`  Members: ${g.members.map(m => m.username + '(' + m.userId + ')').join(', ')}`);
    }
    return isJoined;
  });
  
  const availableGroups = volunteerGroups.filter(g => 
    g.status === 'open' && 
    g.createdBy !== freshUser._id && 
    (!g.members || !g.members.some(m => m.userId === freshUser._id))
  );
  
  console.log('📊 Final stats:', {
    myGroups: myGroups.length,
    joinedGroups: joinedGroups.length,
    availableGroups: availableGroups.length
  });
  
  return {
    myGroups,
    joinedGroups,
    availableGroups,
    total: volunteerGroups.length
  };
};


  const stats = getGroupStats();

  // Create new volunteer group
  const handleCreateGroup = async () => {
    if (!groupForm.name.trim()) {
      alert('Please enter a group name');
      return;
    }
    
    if (!selectedComplaint) {
      alert('Please select a complaint to create a group for');
      return;
    }

    try {
      const groupData = {
        name: groupForm.name,
        description: groupForm.description,
        maxMembers: parseInt(groupForm.maxMembers),
        requiredSkills: groupForm.skills.split(',').map(s => s.trim()).filter(s => s),
        complaintId: selectedComplaint._id,
        complaintTitle: selectedComplaint.category,
        complaintLocation: {
          address: selectedComplaint.address,
          latitude: selectedComplaint.latitude,
          longitude: selectedComplaint.longitude
        },
        createdBy: currentUser._id,
        createdByUsername: currentUser.username || currentUser.email,
        status: 'open',
        members: [{
          userId: currentUser._id,
          username: currentUser.username || currentUser.email,
          role: 'leader',
          joinedAt: new Date().toISOString()
        }]
      };

      const response = await api.post('/api/volunteer-groups', groupData);
      
      if (response.data.success) {
        alert('✅ Volunteer group created successfully!');
        await fetchData();
        setShowCreateGroupModal(false);
        setGroupForm({ name: '', description: '', maxMembers: 5, skills: '' });
        setSelectedComplaint(null);
      }
      
    } catch (error) {
      console.error('Error creating group:', error);
      alert('❌ Failed to create group: ' + (error.response?.data?.message || error.message));
    }
  };

  // Join a volunteer group
  const handleJoinGroup = async (group) => {
    if (group.members && group.members.length >= group.maxMembers) {
      alert('This group is already full');
      return;
    }

    try {
      const response = await api.post(`/api/volunteer-groups/${group._id}/join`, {
        userId: currentUser._id,
        username: currentUser.username || currentUser.email
      });
      
      if (response.data.success) {
        alert('✅ Successfully joined the group!');
        await fetchData();
      }
      
    } catch (error) {
      console.error('Error joining group:', error);
      alert('❌ Failed to join group: ' + (error.response?.data?.message || error.message));
    }
  };

  // Leave a volunteer group
// Leave a volunteer group
const handleLeaveGroup = async (group) => {
  if (group.createdBy === currentUser._id) {
    alert('As the group leader, you cannot leave. You can delete the group instead.');
    return;
  }

  try {
    console.log('🚪 Attempting to leave group:', group.name);
    console.log('🔍 Current user ID:', currentUser._id);
    console.log('🔍 Group members before leave:', group.members.map(m => m.username));

    const response = await api.post(`/api/volunteer-groups/${group._id}/leave`, {
      userId: currentUser._id
    });
    
    if (response.data.success) {
      console.log('✅ Successfully left group via API');
      
      // CRITICAL: Force complete data refresh instead of relying on state
      await fetchData(); // This will get fresh data from the server
      
      alert('✅ You have left the volunteer group');
    }
    
  } catch (error) {
    console.error('❌ Error leaving volunteer group:', error);
    alert('❌ Failed to leave volunteer group: ' + (error.response?.data?.message || error.message));
  }
};


  // Delete a volunteer group
  const handleDeleteGroup = async (group) => {
    if (group.createdBy !== currentUser._id) {
      alert('Only the group leader can delete this group');
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${group.name}"?`)) {
      try {
        const response = await api.delete(`/api/volunteer-groups/${group._id}`);
        
        if (response.data.success) {
          alert('✅ Group deleted successfully');
          await fetchData();
        }
        
      } catch (error) {
        console.error('Error deleting group:', error);
        alert('❌ Failed to delete group: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  // Calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Render available groups to browse
  const renderBrowseGroups = () => {
    if (stats.availableGroups.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Groups</h3>
          <p className="text-gray-600 mb-4">
            There are no volunteer groups available to join right now.
          </p>
          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Your Own Group
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Available Groups ({stats.availableGroups.length})
          </h3>
          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            + Create New Group
          </button>
        </div>

        {stats.availableGroups.map((group) => (
          <GroupCard
            key={group._id}
            group={group}
            currentUser={currentUser}
            userLocation={userLocation}
            calculateDistance={calculateDistance}
            onJoin={() => handleJoinGroup(group)}
            onViewDetails={() => {
              setSelectedGroup(group);
              setShowGroupDetailsModal(true);
            }}
            showJoinButton={true}
          />
        ))}
      </div>
    );
  };

  // Render user's created groups
  const renderMyGroups = () => {
    if (stats.myGroups.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="mb-4">👤</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Groups Created</h3>
          <p className="text-gray-600 mb-4">
            You haven't created any volunteer groups yet.
          </p>
          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Your First Group
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {stats.myGroups.map((group) => (
          <GroupCard
            key={group._id}
            group={group}
            currentUser={currentUser}
            userLocation={userLocation}
            calculateDistance={calculateDistance}
            onDelete={() => handleDeleteGroup(group)}
            onViewDetails={() => {
              setSelectedGroup(group);
              setShowGroupDetailsModal(true);
            }}
            isOwner={true}
          />
        ))}
      </div>
    );
  };

  // Render groups user has joined
  const renderJoinedGroups = () => {
    if (stats.joinedGroups.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="mb-4">🤝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Groups Joined</h3>
          <p className="text-gray-600">
            You haven't joined any volunteer groups yet. Browse available groups to get started!
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {stats.joinedGroups.map((group) => (
          <GroupCard
            key={group._id}
            group={group}
            currentUser={currentUser}
            userLocation={userLocation}
            calculateDistance={calculateDistance}
            onLeave={() => handleLeaveGroup(group)}
            onViewDetails={() => {
              setSelectedGroup(group);
              setShowGroupDetailsModal(true);
            }}
            isMember={true}
          />
        ))}
      </div>
    );
  };

  // Render map with group locations
  const renderGroupMap = () => {
    if (!userLocation || volunteerGroups.length === 0) {
      return (
        <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="mb-4">🗺️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Map Not Available</h3>
            <p className="text-gray-600">
              {!userLocation ? 'Location access required' : 'No groups to display'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div style={{ height: '500px', width: '100%' }}>
          <MapContainer
            center={[userLocation.lat, userLocation.lng]}
            zoom={12}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* User location marker */}
            <Marker position={[userLocation.lat, userLocation.lng]}>
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold">📍 Your Location</h3>
                  <p className="text-sm">Find volunteer groups near you</p>
                </div>
              </Popup>
            </Marker>

            {/* Group markers */}
            {volunteerGroups.map((group) => {
              if (!group.complaintLocation?.latitude || !group.complaintLocation?.longitude) return null;
              
              const isOwner = group.createdBy === currentUser._id;
              const memberCount = group.members ? group.members.length : 1;
              
              return (
                <Marker
                  key={group._id}
                  position={[group.complaintLocation.latitude, group.complaintLocation.longitude]}
                  icon={createGroupIcon(memberCount, isOwner)}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-sm mb-2">{group.name}</h3>
                      <p className="text-xs text-gray-600 mb-2">{group.complaintTitle}</p>
                      <div className="text-xs mb-2">
                        Members: {memberCount}/{group.maxMembers}
                      </div>
                      <div className="text-xs mb-3">
                        Leader: {group.createdByUsername}
                      </div>
                      {!isOwner && (!group.members || !group.members.some(m => m.userId === currentUser._id)) && (
                        <button
                          onClick={() => handleJoinGroup(group)}
                          className="w-full px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          disabled={group.members && group.members.length >= group.maxMembers}
                        >
                          {group.members && group.members.length >= group.maxMembers ? 'Full' : 'Join'}
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    );
  };

  // Tab configuration
  const tabs = [
    {
      label: `Browse Groups (${stats.availableGroups.length})`,
      content: renderBrowseGroups()
    },
    {
      label: `My Groups (${stats.myGroups.length})`,
      content: renderMyGroups()
    },
    {
      label: `Joined Groups (${stats.joinedGroups.length})`,
      content: renderJoinedGroups()
    },
    {
      label: 'Group Map',
      content: renderGroupMap()
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading volunteer groups...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">👥 Volunteer Groups</h1>
              <p className="mt-1 text-sm text-gray-500">
                Create or join volunteer groups to work together on complaints • Welcome, {currentUser?.username || 'Volunteer'}!
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <button
                onClick={fetchData}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Groups</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{stats.myGroups.length}</div>
              <div className="text-sm text-gray-500">Groups You Created</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">{stats.joinedGroups.length}</div>
              <div className="text-sm text-gray-500">Groups You Joined</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-yellow-600">{stats.availableGroups.length}</div>
              <div className="text-sm text-gray-500">Available to Join</div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <TabSwitcher tabs={tabs} />
          </div>

          {/* Create Group Modal */}
          {showCreateGroupModal && (
            <CreateGroupModal
              isOpen={showCreateGroupModal}
              onClose={() => {
                setShowCreateGroupModal(false);
                setSelectedComplaint(null);
                setGroupForm({ name: '', description: '', maxMembers: 5, skills: '' });
              }}
              groupForm={groupForm}
              setGroupForm={setGroupForm}
              selectedComplaint={selectedComplaint}
              setSelectedComplaint={setSelectedComplaint}
              complaints={complaints}
              onSubmit={handleCreateGroup}
            />
          )}

          {/* Group Details Modal */}
          {showGroupDetailsModal && selectedGroup && (
            <GroupDetailsModal
              isOpen={showGroupDetailsModal}
              onClose={() => {
                setShowGroupDetailsModal(false);
                setSelectedGroup(null);
              }}
              group={selectedGroup}
              currentUser={currentUser}
              onJoin={() => handleJoinGroup(selectedGroup)}
              onLeave={() => handleLeaveGroup(selectedGroup)}
              onDelete={() => handleDeleteGroup(selectedGroup)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// Group Card Component
const GroupCard = ({ 
  group, 
  currentUser, 
  userLocation,
  calculateDistance,
  onJoin, 
  onLeave, 
  onDelete, 
  onViewDetails, 
  isOwner = false,
  isMember = false,
  showJoinButton = false
}) => {
  const memberCount = group.members ? group.members.length : 1;
  const isFull = memberCount >= group.maxMembers;
  
  // Calculate distance if user location is available
  let distance = null;
  if (userLocation && group.complaintLocation?.latitude && group.complaintLocation?.longitude) {
    distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      group.complaintLocation.latitude,
      group.complaintLocation.longitude
    );
  }

  return (
    <div className={`p-6 rounded-lg border ${
      isOwner ? 'bg-blue-50 border-blue-200' : 
      isMember ? 'bg-green-50 border-green-200' : 
      'bg-white border-gray-200'
    } hover:shadow-lg transition-shadow`}>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
            {isOwner && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Leader</span>}
            {isMember && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Member</span>}
          </div>
          <p className="text-sm text-gray-600 mb-2">{group.description}</p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>📍 For: <strong>{group.complaintTitle}</strong></span>
            {distance && <span>🚶 {distance.toFixed(1)} km away</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500 mb-1">Members</div>
          <div className={`text-lg font-bold ${isFull ? 'text-red-600' : 'text-green-600'}`}>
            {memberCount}/{group.maxMembers}
          </div>
        </div>
      </div>

      {/* Skills Required */}
      {group.requiredSkills && group.requiredSkills.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-1">Skills Needed:</div>
          <div className="flex flex-wrap gap-1">
            {group.requiredSkills.map((skill, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-2">Group Members:</div>
        <div className="flex flex-wrap gap-2">
          {group.members && group.members.map((member, index) => (
            <div key={index} className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
              member.role === 'leader' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
            }`}>
              {member.role === 'leader' ? '👑' : '👤'} {member.username}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onViewDetails}
          className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
        >
          📋 View Details
        </button>
        
        {showJoinButton && onJoin && (
          <button
            onClick={onJoin}
            disabled={isFull}
            className={`px-3 py-1 rounded text-sm ${
              isFull 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isFull ? 'Group Full' : '🤝 Join Group'}
          </button>
        )}
        
        {isMember && onLeave && (
          <button
            onClick={onLeave}
            className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
          >
            🚪 Leave Group
          </button>
        )}
        
        {isOwner && onDelete && (
          <button
            onClick={onDelete}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            🗑️ Delete Group
          </button>
        )}
      </div>

      {/* Status */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
        <span>Created by: <strong>{group.createdByUsername}</strong></span>
        <span>Status: <strong className="capitalize">{group.status}</strong></span>
      </div>
    </div>
  );
};

// Create Group Modal
const CreateGroupModal = ({ 
  isOpen, 
  onClose, 
  groupForm, 
  setGroupForm, 
  selectedComplaint,
  setSelectedComplaint,
  complaints, 
  onSubmit 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Create Volunteer Group</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* Select Complaint */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Complaint to Work On *
              </label>
              <select
                value={selectedComplaint?._id || ''}
                onChange={(e) => {
                  const complaint = complaints.find(c => c._id === e.target.value);
                  setSelectedComplaint(complaint);
                }}
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                required
              >
                <option value="">Choose a complaint...</option>
                {complaints.map((complaint) => (
                  <option key={complaint._id} value={complaint._id}>
                    {complaint.category} - {complaint.address.substring(0, 50)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Complaint Details */}
            {selectedComplaint && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-1">Selected Complaint:</h4>
                <p className="text-sm text-blue-800 mb-1">{selectedComplaint.category}</p>
                <p className="text-xs text-blue-600">{selectedComplaint.description}</p>
                <p className="text-xs text-blue-600">📍 {selectedComplaint.address}</p>
              </div>
            )}

            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                value={groupForm.name}
                onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                placeholder="e.g., Downtown Cleanup Crew"
                required
              />
            </div>

            {/* Group Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={groupForm.description}
                onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                placeholder="Describe what your group will do..."
              />
            </div>

            {/* Max Members */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Members
              </label>
              <select
                value={groupForm.maxMembers}
                onChange={(e) => setGroupForm(prev => ({ ...prev, maxMembers: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
              >
                <option value={2}>2 members</option>
                <option value={3}>3 members</option>
                <option value={4}>4 members</option>
                <option value={5}>5 members</option>
                <option value={6}>6 members</option>
                <option value={8}>8 members</option>
                <option value={10}>10 members</option>
              </select>
            </div>

            {/* Required Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Required Skills (Optional)
              </label>
              <input
                type="text"
                value={groupForm.skills}
                onChange={(e) => setGroupForm(prev => ({ ...prev, skills: e.target.value }))}
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                placeholder="e.g., Cleaning tools, Photography (comma separated)"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              👥 Create Group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Group Details Modal
const GroupDetailsModal = ({ 
  isOpen, 
  onClose, 
  group, 
  currentUser,
  onJoin,
  onLeave,
  onDelete
}) => {
  if (!isOpen || !group) return null;

  const isOwner = group.createdBy === currentUser._id;
  const isMember = group.members && group.members.some(m => m.userId === currentUser._id);
  const memberCount = group.members ? group.members.length : 1;
  const isFull = memberCount >= group.maxMembers;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Group Details</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Group Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{group.name}</h3>
              {group.description && <p className="text-gray-600 mb-4">{group.description}</p>}
            </div>

            {/* Complaint Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">📋 Working On:</h4>
              <p className="text-blue-800 font-medium">{group.complaintTitle}</p>
              {group.complaintLocation && (
                <p className="text-sm text-blue-600">📍 {group.complaintLocation.address}</p>
              )}
            </div>

            {/* Group Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-500">Members</div>
                <div className="text-xl font-bold text-gray-900">{memberCount}/{group.maxMembers}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-500">Status</div>
                <div className="text-xl font-bold text-gray-900 capitalize">{group.status}</div>
              </div>
            </div>

            {/* Required Skills */}
            {group.requiredSkills && group.requiredSkills.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">🛠️ Skills Needed:</h4>
                <div className="flex flex-wrap gap-2">
                  {group.requiredSkills.map((skill, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Members */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">👥 Group Members:</h4>
              <div className="space-y-2">
                {group.members && group.members.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        member.role === 'leader' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {member.role === 'leader' ? '👑' : '👤'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{member.username}</div>
                        <div className="text-sm text-gray-500 capitalize">{member.role}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            
            {!isOwner && !isMember && onJoin && (
              <button
                onClick={() => { onJoin(); onClose(); }}
                disabled={isFull}
                className={`px-4 py-2 rounded-md ${
                  isFull 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isFull ? 'Group Full' : '🤝 Join Group'}
              </button>
            )}
            
            {isMember && !isOwner && onLeave && (
              <button
                onClick={() => { onLeave(); onClose(); }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
              >
                🚪 Leave Group
              </button>
            )}
            
            {isOwner && onDelete && (
              <button
                onClick={() => { onDelete(); onClose(); }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                🗑️ Delete Group
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Volunteer;
