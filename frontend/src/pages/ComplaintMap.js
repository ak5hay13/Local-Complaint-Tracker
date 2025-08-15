import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
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

// Create custom markers for different complaint statuses
const createCustomIcon = (status, priority) => {
  let color = '#3388ff'; // Default blue
  
  // Color based on status
  switch (status) {
    case 'completed':
    case 'resolved':
      color = '#28a745'; // Green
      break;
    case 'in-progress':
      color = '#ffc107'; // Yellow
      break;
    case 'partial-completed':
      color = '#fd7e14'; // Orange
      break;
    default:
      color = '#dc3545'; // Red for pending
  }
  
  // Adjust opacity based on priority
  const opacity = priority === 'High' ? 1 : priority === 'Medium' ? 0.8 : 0.6;
  
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        opacity: ${opacity};
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

function ComplaintMap() {
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState({
    status: 'all',
    category: 'all',
    priority: 'all'
  });
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default center (India)
  const [mapZoom, setMapZoom] = useState(5);

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [complaints, selectedFilters]);

  const fetchComplaints = async () => {
    try {
      console.log('🔍 Fetching complaints for map...');
      const response = await api.get('/api/complaints');
      console.log('✅ Complaints response:', response.data);
      
      const complaintsData = response.data.data || response.data;
      
      // Filter out complaints without location data
      const complaintsWithLocation = complaintsData.filter(c => 
        c.latitude && c.longitude && 
        !isNaN(c.latitude) && !isNaN(c.longitude)
      );
      
      setComplaints(complaintsWithLocation);
      
      // Set map center to the average of all complaint locations
      if (complaintsWithLocation.length > 0) {
        const avgLat = complaintsWithLocation.reduce((sum, c) => sum + c.latitude, 0) / complaintsWithLocation.length;
        const avgLng = complaintsWithLocation.reduce((sum, c) => sum + c.longitude, 0) / complaintsWithLocation.length;
        setMapCenter([avgLat, avgLng]);
        setMapZoom(10);
      }
      
    } catch (error) {
      console.error('❌ Error fetching complaints for map:', error);
      // Fallback to localStorage if API fails
      const storedComplaints = JSON.parse(localStorage.getItem('complaints') || '[]');
      const complaintsWithLocation = storedComplaints.filter(c => 
        c.latitude && c.longitude
      );
      setComplaints(complaintsWithLocation);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...complaints];

    if (selectedFilters.status !== 'all') {
      if (selectedFilters.status === 'active') {
        filtered = filtered.filter(c => 
          c.status !== 'completed' && c.status !== 'resolved'
        );
      } else if (selectedFilters.status === 'completed') {
        filtered = filtered.filter(c => 
          c.status === 'completed' || c.status === 'resolved'
        );
      } else {
        filtered = filtered.filter(c => c.status === selectedFilters.status);
      }
    }

    if (selectedFilters.category !== 'all') {
      filtered = filtered.filter(c => c.category === selectedFilters.category);
    }

    if (selectedFilters.priority !== 'all') {
      filtered = filtered.filter(c => c.priority === selectedFilters.priority);
    }

    setFilteredComplaints(filtered);
  };

  const handleFilterChange = (filterType, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const getUniqueCategories = () => {
    return [...new Set(complaints.map(c => c.category))];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'resolved':
        return 'text-green-600 bg-green-100';
      case 'in-progress':
        return 'text-yellow-600 bg-yellow-100';
      case 'partial-completed':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-red-600 bg-red-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading complaint locations...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">📍 Complaints Map</h1>
              <p className="mt-1 text-sm text-gray-500">
                View all complaint locations on the map • Showing {filteredComplaints.length} of {complaints.length} complaints
              </p>
            </div>
            <button
              onClick={fetchComplaints}
              className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              🔄 Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Filter Complaints</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={selectedFilters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md p-2"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="completed">Completed Only</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="partial-completed">Partial Completed</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={selectedFilters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md p-2"
                >
                  <option value="all">All Categories</option>
                  {getUniqueCategories().map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={selectedFilters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md p-2"
                >
                  <option value="all">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Map Legend</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
                <span>Pending</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-yellow-500 mr-2"></div>
                <span>In Progress</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-orange-500 mr-2"></div>
                <span>Partial Completed</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                <span>Completed</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Tip: Higher priority complaints appear more opaque. Click markers for details.
            </p>
          </div>

          {/* Map Container */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div style={{ height: '600px', width: '100%' }}>
              {filteredComplaints.length > 0 ? (
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  scrollWheelZoom={true}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* Render all complaint markers */}
                  {filteredComplaints.map((complaint, index) => (
                    <Marker
                      key={complaint._id || complaint.id || index}
                      position={[complaint.latitude, complaint.longitude]}
                      icon={createCustomIcon(complaint.status, complaint.priority)}
                    >
                      <Popup maxWidth={300} className="complaint-popup">
                        <div className="p-2">
                          {/* Popup Header */}
                          <div className="mb-3">
                            <h3 className="font-bold text-lg text-gray-800 mb-1">
                              {complaint.category}
                            </h3>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                                {complaint.status.charAt(0).toUpperCase() + complaint.status.slice(1)}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                complaint.priority === 'High' ? 'bg-red-100 text-red-800' : 
                                complaint.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-green-100 text-green-800'
                              }`}>
                                {complaint.priority} Priority
                              </span>
                            </div>
                          </div>

                          {/* Description */}
                          <div className="mb-3">
                            <p className="text-sm text-gray-700 mb-2">
                              {complaint.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              📍 {complaint.address}
                            </p>
                          </div>

                          {/* Complaint Image */}
                          {complaint.image && (
                            <div className="mb-3">
                              <img
                                src={complaint.image}
                                alt="Complaint"
                                className="w-full h-24 object-cover rounded border"
                              />
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="border-t pt-2 text-xs text-gray-500">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <strong>Created by:</strong><br/>
                                {complaint.createdByUsername || 'Unknown User'}
                              </div>
                              <div>
                                <strong>Created:</strong><br/>
                                {formatDate(complaint.createdAt)}
                              </div>
                            </div>
                            {complaint.resolvedBy && (
                              <div className="mt-2 pt-2 border-t">
                                <strong>Completed by:</strong> {complaint.resolvedBy}<br/>
                                <strong>Completed on:</strong> {formatDate(complaint.resolvedAt)}
                              </div>
                            )}
                          </div>

                          {/* Coordinates */}
                          <div className="mt-2 pt-2 border-t text-xs text-gray-400">
                            📊 {complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No complaints with location data</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {complaints.length === 0 
                        ? 'No complaints found in the system.'
                        : 'Try adjusting your filters or ensure complaints have location data.'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          {filteredComplaints.length > 0 && (
            <div className="mt-6 bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-700 mb-3">📊 Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{filteredComplaints.length}</div>
                  <div className="text-xs text-gray-500">Total Shown</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {filteredComplaints.filter(c => c.status === 'pending').length}
                  </div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {filteredComplaints.filter(c => c.status === 'in-progress').length}
                  </div>
                  <div className="text-xs text-gray-500">In Progress</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {filteredComplaints.filter(c => c.status === 'completed' || c.status === 'resolved').length}
                  </div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ComplaintMap;
