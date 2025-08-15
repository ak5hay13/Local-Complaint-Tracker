import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import TabSwitcher from '../components/TabSwitcher';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import api from '../api';

// Fix for default marker icon issue in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Authority handles for Twitter crosspost
const AUTHORITY_HANDLES = [
  { handle: '@mybmc', responsibility: 'Roads & Infrastructure' },
  { handle: '@MumbaiPolice', responsibility: 'Law & Order' },
  { handle: '@MESKAMumbai', responsibility: 'Electricity' },
  { handle: '@mybmcwater', responsibility: 'Water Supply' },
  { handle: '@TrafficMumbai', responsibility: 'Traffic Management' },
  { handle: '@MumbaiFireBrig', responsibility: 'Fire Safety' },
  { handle: '@SwachhMumbai', responsibility: 'Sanitation & Cleanliness' }
];

// Component to handle map view changes
function MapView({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
}

function Complaints() {
  const [activeMainTab, setActiveMainTab] = useState('active');
  const [activeComplaints, setActiveComplaints] = useState([]);
  const [solvedComplaints, setSolvedComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [mapZoom, setMapZoom] = useState(5);
  
  const [currentUser, setCurrentUser] = useState(null);
  
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedComplaint, setEditedComplaint] = useState({});
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showTwitterModal, setShowTwitterModal] = useState(false);
  const [selectedAuthority, setSelectedAuthority] = useState('');
  
  const [updateForm, setUpdateForm] = useState({
    status: 'pending',
    description: '',
    afterPhoto: null,
    userLocation: null
  });

  const [locationStatus, setLocationStatus] = useState('Getting location...');
  
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    console.log('Current user loaded:', user);
    
    fetchComplaints();
    getCurrentUserLocation();
  }, []);

  const getCurrentUserLocation = () => {
    setLocationStatus('Getting location...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUpdateForm(prev => ({
            ...prev,
            userLocation: userLoc
          }));
          setLocationStatus(`Location found: ${userLoc.lat.toFixed(4)}, ${userLoc.lng.toFixed(4)}`);
          console.log('📍 User location obtained:', userLoc);
        },
        (error) => {
          console.error('Error getting user location:', error);
          setLocationStatus('Location access denied or unavailable');
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              setLocationStatus('Location permission denied. Please allow location access.');
              break;
            case error.POSITION_UNAVAILABLE:
              setLocationStatus('Location information unavailable.');
              break;
            case error.TIMEOUT:
              setLocationStatus('Location request timed out.');
              break;
            default:
              setLocationStatus('Unknown location error.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        }
      );
    } else {
      setLocationStatus('Geolocation not supported by this browser');
    }
  };

  const fetchComplaints = async () => {
    try {
      console.log('🔍 Fetching complaints...');
      const response = await api.get('/api/complaints');
      console.log('✅ Complaints response:', response.data);
      
      const complaints = response.data.data || response.data;
      
      const active = complaints.filter(c => 
        c.status !== 'completed' && c.status !== 'resolved'
      );
      const solved = complaints.filter(c => 
        c.status === 'completed' || c.status === 'resolved'
      );
      
      setActiveComplaints(active);
      setSolvedComplaints(solved);
      
    } catch (error) {
      console.error('❌ Error fetching complaints:', error);
      const storedComplaints = JSON.parse(localStorage.getItem('complaints') || '[]');
      const active = storedComplaints.filter(c => c.status !== 'completed');
      const solved = storedComplaints.filter(c => c.status === 'completed');
      
      setActiveComplaints(active);
      setSolvedComplaints(solved);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    console.log(`📏 Distance calculated: ${distance.toFixed(3)} km`);
    return distance;
  };

  const pendingComplaints = activeComplaints.filter(c => c.status === 'pending');
  const partialComplaints = activeComplaints.filter(c => c.status === 'partial-completed');
  const inProgressComplaints = activeComplaints.filter(c => c.status === 'in-progress');

  const handleViewDetails = (complaint) => {
    setSelectedComplaint(complaint);
    setEditedComplaint({...complaint});
    setShowComplaintModal(true);
    setEditMode(false);
  };

  const handleEditComplaint = () => {
    if (!currentUser || !currentUser._id) {
      alert('Please log in to edit complaints');
      return;
    }
    
    if (currentUser._id !== selectedComplaint.createdBy && currentUser.username !== selectedComplaint.createdByUsername) {
      alert('Only the original creator can edit this complaint');
      return;
    }
    
    setEditMode(true);
  };

  const handleSaveComplaint = async () => {
    try {
      const updateLog = [{
        timestamp: new Date().toISOString(),
        action: 'Complaint Edited',
        user: currentUser?.username || currentUser?.email || 'Anonymous User',
        userId: currentUser?._id,
        description: 'Complaint details were updated by the original creator',
        changes: {
          category: editedComplaint.category,
          priority: editedComplaint.priority,
          description: editedComplaint.description,
          address: editedComplaint.address
        }
      }];

      const updatedComplaint = {
        category: editedComplaint.category,
        description: editedComplaint.description,
        priority: editedComplaint.priority,
        address: editedComplaint.address,
        updateLog: updateLog
      };

      console.log('💾 Saving complaint with proper user info:', updatedComplaint);

      await api.put(`/api/complaints/${selectedComplaint._id}`, updatedComplaint);
      
      fetchComplaints();
      setEditMode(false);
      setShowComplaintModal(false);
      alert('Complaint updated successfully!');
    } catch (error) {
      console.error('Error updating complaint:', error);
      alert('Failed to update complaint: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdateStatus = (complaint) => {
    setSelectedComplaint(complaint);
    setUpdateForm({
      status: 'pending',
      description: '',
      afterPhoto: null,
      userLocation: updateForm.userLocation
    });
    setShowUpdateModal(true);
    
    getCurrentUserLocation();
  };

  const handleStatusUpdate = async () => {
    if (!updateForm.afterPhoto) {
      alert('Please upload an after photo - it\'s mandatory for status updates');
      return;
    }

    if (!updateForm.description.trim()) {
      alert('Please provide a description of the update');
      return;
    }

    if (!updateForm.userLocation) {
      alert('Unable to get your location. Please allow location access and try again.');
      getCurrentUserLocation();
      return;
    }

    if (!selectedComplaint.latitude || !selectedComplaint.longitude) {
      alert('Original complaint location not available');
      return;
    }

    const distance = calculateDistance(
      updateForm.userLocation.lat,
      updateForm.userLocation.lng,
      selectedComplaint.latitude,
      selectedComplaint.longitude
    );

    if (distance > 1) {
      alert(`You are ${distance.toFixed(2)} km away from the complaint location. You must be within 1km to update status.`);
      return;
    }

    try {
      const updateLog = [{
        timestamp: new Date().toISOString(),
        action: `Status Updated to ${updateForm.status.charAt(0).toUpperCase() + updateForm.status.slice(1)}`,
        user: currentUser?.username || currentUser?.email || 'Anonymous User',
        userId: currentUser?._id,
        description: updateForm.description,
        afterPhoto: updateForm.afterPhoto,
        location: updateForm.userLocation,
        distanceFromOriginal: distance.toFixed(3) + ' km'
      }];

      const updateData = {
        status: updateForm.status,
        updateLog: updateLog
      };

      if (updateForm.status === 'completed') {
        updateData.resolvedAt = new Date().toISOString();
        updateData.resolvedBy = currentUser?.username || currentUser?.email || 'Anonymous User';
        updateData.resolvedByUserId = currentUser?._id;
      }

      console.log('🔄 Updating status with proper user info:', updateData);

      await api.put(`/api/complaints/${selectedComplaint._id}`, updateData);
      
      fetchComplaints();
      setShowUpdateModal(false);
      alert(`Status updated successfully! Distance verified: ${distance.toFixed(2)} km`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleTwitterCrosspost = (complaint) => {
    setSelectedComplaint(complaint);
    setSelectedAuthority('');
    setShowTwitterModal(true);
  };

  // FIXED: Safe Twitter function that handles null window.open()
// FIXED: Enhanced Twitter function with reliable image display
const postToTwitter = () => {
  try {
    const coordinates = selectedComplaint.latitude && selectedComplaint.longitude 
      ? `📍 ${selectedComplaint.latitude.toFixed(4)}, ${selectedComplaint.longitude.toFixed(4)}`
      : '';

    const tweetText = `🚨 COMPLAINT ALERT 🚨

Category: ${selectedComplaint.category}
Priority: ${selectedComplaint.priority}
Location: ${selectedComplaint.address}
${coordinates}

Description: ${selectedComplaint.description}

${selectedAuthority ? `${selectedAuthority}` : ''}

#CitizenComplaint #Mumbai #FixIt`;

    // First, always open Twitter
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    const twitterWindow = window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    
    if (!twitterWindow) {
      alert(`Popup blocked! Please copy this link and open it manually:\n\n${twitterUrl}`);
      navigator.clipboard?.writeText(twitterUrl).catch(() => console.log('Could not copy to clipboard'));
    }

    // FIXED: Enhanced image display method
    if (selectedComplaint.image) {
      // Show image immediately without waiting for Twitter
      setTimeout(() => {
        const imageWindow = window.open('', 'complaintImageForTwitter', 'width=700,height=600,scrollbars=yes');
        
        if (imageWindow) {
          try {
            const htmlContent = `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Complaint Image - Download for Twitter</title>
                  <meta charset="UTF-8">
                  <style>
                    body { 
                      font-family: 'Segoe UI', Arial, sans-serif; 
                      padding: 20px; 
                      margin: 0;
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                      text-align: center;
                    }
                    .container {
                      background: white;
                      color: #333;
                      border-radius: 15px;
                      padding: 25px;
                      max-width: 600px;
                      margin: 0 auto;
                      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    }
                    .header {
                      background: #1DA1F2;
                      color: white;
                      padding: 15px;
                      border-radius: 10px;
                      margin-bottom: 20px;
                    }
                    img { 
                      max-width: 100%; 
                      height: auto; 
                      border: 3px solid #1DA1F2; 
                      border-radius: 10px; 
                      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                      margin: 15px 0;
                    }
                    .instructions { 
                      background: #f8f9fa; 
                      padding: 20px; 
                      margin: 20px 0; 
                      border-radius: 10px; 
                      text-align: left;
                      border-left: 4px solid #1DA1F2;
                    }
                    .step {
                      background: white;
                      margin: 10px 0;
                      padding: 12px;
                      border-radius: 8px;
                      border-left: 3px solid #28a745;
                      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    }
                    .buttons {
                      margin-top: 20px;
                    }
                    button { 
                      background: #1DA1F2; 
                      color: white; 
                      padding: 12px 25px; 
                      border: none; 
                      border-radius: 25px; 
                      cursor: pointer; 
                      margin: 5px; 
                      font-size: 14px;
                      font-weight: bold;
                      transition: all 0.3s ease;
                    }
                    button:hover {
                      background: #1991db;
                      transform: translateY(-2px);
                      box-shadow: 0 5px 15px rgba(29, 161, 242, 0.4);
                    }
                    .twitter-logo {
                      color: #1DA1F2;
                      font-size: 24px;
                      margin-right: 8px;
                    }
                    .complaint-info {
                      background: #e3f2fd;
                      padding: 15px;
                      border-radius: 8px;
                      margin: 15px 0;
                      text-align: left;
                    }
                    .complaint-info h4 {
                      color: #1976d2;
                      margin: 0 0 10px 0;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h2><span class="twitter-logo">🐦</span>Twitter Image Upload Helper</h2>
                    </div>
                    
                    <div class="complaint-info">
                      <h4>📋 Complaint Details:</h4>
                      <p><strong>Category:</strong> ${selectedComplaint.category}</p>
                      <p><strong>Priority:</strong> ${selectedComplaint.priority}</p>
                      <p><strong>Location:</strong> ${selectedComplaint.address}</p>
                    </div>
                    
                    <h3>📸 Complaint Photo for Twitter Upload</h3>
                    <img src="${selectedComplaint.image}" alt="Complaint image" id="complaintImage" />
                    
                    <div class="instructions">
                      <h3 style="color: #1DA1F2; margin-top: 0;">📝 How to Upload to Twitter:</h3>
                      
                      <div class="step">
                        <strong>Step 1:</strong> Right-click on the image above and select "Save Image As..." or "Save Picture As..."
                      </div>
                      
                      <div class="step">
                        <strong>Step 2:</strong> Save the image to your device (Downloads folder recommended)
                      </div>
                      
                      <div class="step">
                        <strong>Step 3:</strong> Go back to your Twitter tab (should be open already)
                      </div>
                      
                      <div class="step">
                        <strong>Step 4:</strong> In the Twitter compose window, click the 📷 photo/media button
                      </div>
                      
                      <div class="step">
                        <strong>Step 5:</strong> Select and upload the saved image file
                      </div>
                      
                      <div class="step">
                        <strong>Step 6:</strong> Complete and post your tweet!
                      </div>
                    </div>
                    
                    <div class="buttons">
                      <button onclick="downloadImage()">💾 Download Image</button>
                      <button onclick="copyImageData()">📋 Copy Image</button>
                      <button onclick="window.print()">🖨️ Print Page</button>
                      <button onclick="window.close()" style="background: #dc3545;">✖️ Close</button>
                    </div>
                    
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">
                      💡 <strong>Tip:</strong> Keep this window open while posting to Twitter for easy reference!
                    </p>
                  </div>
                  
                  <script>
                    function downloadImage() {
                      try {
                        const img = document.getElementById('complaintImage');
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        ctx.drawImage(img, 0, 0);
                        
                        canvas.toBlob(function(blob) {
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'complaint-photo-${selectedComplaint.category.replace(/[^a-zA-Z0-9]/g, '-')}.jpg';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          
                          alert('✅ Image downloaded! Check your Downloads folder.');
                        }, 'image/jpeg', 0.9);
                      } catch (error) {
                        alert('❌ Download failed. Please right-click and save the image manually.');
                        console.error('Download error:', error);
                      }
                    }
                    
                    function copyImageData() {
                      try {
                        const img = document.getElementById('complaintImage');
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        ctx.drawImage(img, 0, 0);
                        
                        canvas.toBlob(async function(blob) {
                          try {
                            await navigator.clipboard.write([
                              new ClipboardItem({ 'image/png': blob })
                            ]);
                            alert('✅ Image copied to clipboard! You can paste it directly in Twitter.');
                          } catch (err) {
                            alert('❌ Could not copy to clipboard. Please save the image manually.');
                          }
                        });
                      } catch (error) {
                        alert('❌ Copy failed. Please right-click and save the image manually.');
                        console.error('Copy error:', error);
                      }
                    }
                    
                    // Auto-focus and enhance image loading
                    window.onload = function() {
                      const img = document.getElementById('complaintImage');
                      img.onload = function() {
                        console.log('✅ Image loaded successfully in Twitter helper window');
                      };
                      img.onerror = function() {
                        console.error('❌ Image failed to load in Twitter helper window');
                        this.style.display = 'none';
                        this.parentNode.innerHTML += '<div style="padding: 20px; background: #ffebee; color: #c62828; border-radius: 8px;">❌ Image could not be loaded. Please check the original complaint.</div>';
                      };
                    };
                  </script>
                </body>
              </html>
            `;
            
            imageWindow.document.open();
            imageWindow.document.write(htmlContent);
            imageWindow.document.close();
            
            // Focus the image window
            imageWindow.focus();
            
            console.log('✅ Twitter image helper window opened successfully');
            
          } catch (docError) {
            console.error('❌ Error writing to image window:', docError);
            alert('Could not display image helper. Please check your popup blocker settings.');
          }
        } else {
          // Fallback if popup is blocked
          alert(`📸 Twitter Image Available!\n\nThe complaint image is available for upload to Twitter.\nPlease:\n1. Allow popups for this site\n2. Or manually save the image from the complaint details\n3. Upload it to your Twitter post`);
        }
      }, 300); // Small delay to ensure Twitter window opens first
    }

    setShowTwitterModal(false);
    
    // Show success message
    setTimeout(() => {
      if (selectedComplaint.image) {
        alert('🐦 Twitter post opened!\n📸 Image helper window also opened.\n\n✅ Follow the instructions in the image window to upload the photo to your tweet.');
      } else {
        alert('🐦 Twitter post opened successfully!\n\nℹ️ No image available for this complaint.');
      }
    }, 500);

  } catch (error) {
    console.error('❌ Error in postToTwitter:', error);
    alert('❌ Error posting to Twitter. Please try again or copy the text manually.');
  }
};


  const handleViewLocation = (latitude, longitude, title) => {
    setSelectedLocation({ lat: latitude, lng: longitude, title });
    setMapCenter([latitude, longitude]);
    setMapZoom(15);
    setShowMap(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('📸 Image uploaded for status update:', reader.result ? 'SUCCESS' : 'FAILED');
        setUpdateForm(prev => ({
          ...prev,
          afterPhoto: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper function to safely display images with error handling
  const SafeImage = ({ src, alt, className, onClick, onError }) => {
    const [imageError, setImageError] = useState(false);
    const [imageSrc, setImageSrc] = useState(src);

    const handleImageError = () => {
      console.log('❌ Image failed to load:', src);
      setImageError(true);
      if (onError) onError();
    };

    const handleImageLoad = () => {
      console.log('✅ Image loaded successfully:', src);
      setImageError(false);
    };

    if (imageError) {
      return (
        <div className={`${className} bg-gray-200 flex items-center justify-center text-gray-500 text-xs`}>
          <span>❌ Image not available</span>
        </div>
      );
    }

    return (
      <img
        src={imageSrc}
        alt={alt}
        className={className}
        onClick={onClick}
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{ display: 'block' }}
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading complaints...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const renderActiveComplaintCards = (complaintsToRender) => {
    if (complaintsToRender.length === 0) {
      return (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No complaints</h3>
          <p className="mt-1 text-sm text-gray-500">There are no active complaints at this time.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fadeIn">
        {complaintsToRender.map((complaint, index) => (
          <div key={complaint._id || complaint.id || index} className="bg-white overflow-hidden shadow rounded-lg hover-lift">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900 truncate">
                  {complaint.category || 'Complaint'}
                </h3>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  complaint.priority === 'High' ? 'bg-red-100 text-red-800' : 
                  complaint.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-green-100 text-green-800'
                }`}>
                  {complaint.priority || 'Medium'}
                </span>
              </div>
              
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p className="line-clamp-2">{complaint.description || 'No description provided'}</p>
              </div>
              
              <div className="mt-3 flex items-center text-sm text-gray-500">
                <span className="truncate">{complaint.category || 'General'}</span>
                <span className="mx-1">•</span>
                <span className="truncate">{complaint.address || 'Location not specified'}</span>
              </div>

              {complaint.latitude && complaint.longitude && (
                <div className="mt-2 text-xs text-gray-400">
                  📍 {complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)}
                </div>
              )}
              
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  <span>Status: </span>
                  <span className="font-medium text-gray-900 capitalize">{complaint.status || 'Pending'}</span>
                </div>
                <div className="text-sm text-gray-500">
                  <span>Created: </span>
                  <span>{new Date(complaint.createdAt).toLocaleDateString() || 'N/A'}</span>
                </div>
              </div>
              
              <div className="mt-2 text-xs text-gray-500">
                Created by: {complaint.createdByUsername || complaint.createdBy || 'Unknown User'}
              </div>
              
              {complaint.image && (
                <div className="mt-3">
                  <SafeImage
                    src={complaint.image}
                    alt="Complaint"
                    className="h-32 w-full object-cover rounded-md"
                  />
                </div>
              )}
              
              <div className="mt-4 flex flex-wrap gap-2">
                <button 
                  onClick={() => handleViewDetails(complaint)}
                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                >
                  📝 View Details
                </button>
                <button 
                  onClick={() => handleUpdateStatus(complaint)}
                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200"
                >
                  🔄 Update Status
                </button>
                <button 
                  onClick={() => handleTwitterCrosspost(complaint)}
                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  🐦 Post to X
                </button>
                {complaint.latitude && complaint.longitude && (
                  <button 
                    onClick={() => handleViewLocation(complaint.latitude, complaint.longitude, complaint.category)}
                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-purple-700 bg-purple-100 hover:bg-purple-200"
                  >
                    📍 View Location
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSolvedComplaintCards = (complaintsToRender) => {
    if (complaintsToRender.length === 0) {
      return (
        <div className="text-center py-12">
          <h3 className="mt-2 text-sm font-medium text-gray-900">No solved complaints</h3>
          <p className="mt-1 text-sm text-gray-500">There are no completed complaints at this time.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fadeIn">
        {complaintsToRender.map((complaint, index) => (
          <div key={complaint._id || complaint.id || index} className="bg-white overflow-hidden shadow rounded-lg hover-lift">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900 truncate">
                  {complaint.category || 'Complaint'}
                </h3>
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  Completed ✅
                </span>
              </div>
              
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p className="line-clamp-2">{complaint.description || 'No description provided'}</p>
              </div>

              {complaint.latitude && complaint.longitude && (
                <div className="mt-2 text-xs text-gray-400">
                  📍 {complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)}
                </div>
              )}

              <div className="mt-3 text-xs text-gray-500">
                <div>Created by: {complaint.createdByUsername || 'Unknown User'}</div>
                <div>Completed by: {complaint.resolvedBy || 'Unknown User'}</div>
                <div>Completed on: {complaint.resolvedAt ? new Date(complaint.resolvedAt).toLocaleDateString() : 'N/A'}</div>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2">
                <button 
                  onClick={() => handleViewDetails(complaint)}
                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                >
                  📝 View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const activeTabs = [
    {
      label: `All (${activeComplaints.length})`,
      content: renderActiveComplaintCards(activeComplaints)
    },
    {
      label: `Pending (${pendingComplaints.length})`,
      content: renderActiveComplaintCards(pendingComplaints)
    },
    {
      label: `In Progress (${inProgressComplaints.length})`,
      content: renderActiveComplaintCards(inProgressComplaints)
    }
  ];
  
  const solvedTabs = [
    {
      label: `All (${solvedComplaints.length})`,
      content: renderSolvedComplaintCards(solvedComplaints)
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* FIXED: Complaint Details Modal with Working After Photo Display */}
          {showComplaintModal && selectedComplaint && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {editMode ? 'Edit Complaint' : 'Complaint Details'}
                    </h2>
                    <div className="flex gap-2">
                      {!editMode && currentUser && (
                        currentUser._id === selectedComplaint.createdBy || 
                        currentUser.username === selectedComplaint.createdByUsername
                      ) && (
                        <button
                          onClick={handleEditComplaint}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          ✏️ Edit
                        </button>
                      )}
                      <button
                        onClick={() => setShowComplaintModal(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {!editMode && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-700">
                        💡 Only the original creator ({selectedComplaint.createdByUsername || 'Unknown User'}) can edit this complaint. Others can update status only.
                      </p>
                    </div>
                  )}

                  {/* Complaint Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      {editMode ? (
                        <select
                          value={editedComplaint.category}
                          onChange={(e) => setEditedComplaint(prev => ({...prev, category: e.target.value}))}
                          className="w-full border rounded-md p-2"
                        >
                          <option value="Garbage">Garbage</option>
                          <option value="Water Leakage">Water Leakage</option>
                          <option value="Pothole">Pothole</option>
                          <option value="Electricity Issue">Electricity Issue</option>
                          <option value="Street Light">Street Light</option>
                          <option value="Sewage">Sewage</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <p className="text-gray-900">{selectedComplaint.category}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      {editMode ? (
                        <select
                          value={editedComplaint.priority}
                          onChange={(e) => setEditedComplaint(prev => ({...prev, priority: e.target.value}))}
                          className="w-full border rounded-md p-2"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      ) : (
                        <span className={`px-3 py-1 text-sm rounded-full ${
                          selectedComplaint.priority === 'High' ? 'bg-red-100 text-red-800' : 
                          selectedComplaint.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'
                        }`}>
                          {selectedComplaint.priority}
                        </span>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      {editMode ? (
                        <textarea
                          value={editedComplaint.description}
                          onChange={(e) => setEditedComplaint(prev => ({...prev, description: e.target.value}))}
                          rows={4}
                          className="w-full border rounded-md p-2"
                        />
                      ) : (
                        <p className="text-gray-900">{selectedComplaint.description}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      {editMode ? (
                        <input
                          type="text"
                          value={editedComplaint.address}
                          onChange={(e) => setEditedComplaint(prev => ({...prev, address: e.target.value}))}
                          className="w-full border rounded-md p-2"
                        />
                      ) : (
                        <p className="text-gray-900">{selectedComplaint.address}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                      <p className="text-gray-600 bg-gray-50 p-2 rounded">
                        {selectedComplaint.latitude ? selectedComplaint.latitude.toFixed(6) : 'Not available'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                      <p className="text-gray-600 bg-gray-50 p-2 rounded">
                        {selectedComplaint.longitude ? selectedComplaint.longitude.toFixed(6) : 'Not available'}
                      </p>
                    </div>
                  </div>

                  {selectedComplaint.image && (
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Original Photo</label>
                      <SafeImage
                        src={selectedComplaint.image}
                        alt="Original complaint"
                        className="max-h-64 rounded-md shadow-sm border"
                      />
                    </div>
                  )}

                  {/* FIXED: Activity Log with Working After Photos */}
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">📋 Activity Log</h3>
                    <div className="bg-gray-50 rounded-md p-4 max-h-80 overflow-y-auto">
                      {/* Initial creation entry */}
                      <div className="border-l-4 border-blue-500 pl-4 pb-4 mb-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 flex items-center">
                              🎯 Complaint Created
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              Created by <span className="font-medium text-blue-600">
                                {selectedComplaint.createdByUsername || selectedComplaint.createdBy || 'Unknown User'}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(selectedComplaint.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {selectedComplaint.image && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600 mb-1 font-medium">Original Photo:</p>
                            <SafeImage
                              src={selectedComplaint.image}
                              alt="Original complaint"
                              className="max-h-20 rounded-md shadow-sm border cursor-pointer hover:shadow-lg transition-shadow"
                              onClick={() => {
                                const newWindow = window.open('', '_blank', 'width=800,height=600');
                                if (newWindow) {
                                  newWindow.document.write(`
                                    <html>
                                      <head><title>Original Complaint Photo</title></head>
                                      <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#000;">
                                        <img src="${selectedComplaint.image}" style="max-width:100%; max-height:100vh; object-fit:contain;" alt="Original complaint" />
                                      </body>
                                    </html>
                                  `);
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* FIXED: Update log entries with working after photos */}
                      {(selectedComplaint.updateLog || []).map((log, index) => {
                        console.log(`📊 Rendering log entry ${index}:`, {
                          action: log.action,
                          user: log.user,
                          hasAfterPhoto: !!log.afterPhoto,
                          afterPhotoLength: log.afterPhoto ? log.afterPhoto.length : 0
                        });
                        
                        return (
                          <div key={index} className={`border-l-4 pl-4 pb-4 mb-4 last:mb-0 ${
                            log.action.includes('Edit') ? 'border-yellow-500' : 
                            log.action.includes('Completed') || log.action.includes('completed') ? 'border-green-500' : 
                            'border-blue-500'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 flex items-center">
                                  {log.action.includes('Edit') ? '✏️' : 
                                   log.action.includes('Completed') || log.action.includes('completed') ? '✅' : '🔄'} {log.action}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  Updated by <span className="font-medium text-blue-600">{log.user || 'Unknown User'}</span>
                                  {log.distanceFromOriginal && (
                                    <span className="text-green-600 ml-2">📍 {log.distanceFromOriginal} from location</span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(log.timestamp).toLocaleString()}
                                </p>
                                {log.description && (
                                  <div className="mt-2 bg-white p-3 rounded border-l-2 border-gray-300">
                                    <p className="text-xs text-gray-600 font-medium mb-1">Update Description:</p>
                                    <p className="text-sm text-gray-700">{log.description}</p>
                                  </div>
                                )}
                                {log.changes && Object.keys(log.changes).length > 0 && (
                                  <div className="mt-2 bg-yellow-50 p-2 rounded border-l-2 border-yellow-400">
                                    <p className="text-xs text-yellow-700 font-medium">Changes Made:</p>
                                    {Object.entries(log.changes).map(([key, value]) => (
                                      <p key={key} className="text-xs text-yellow-800">
                                        <strong>{key}:</strong> {value}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* FIXED: After Photo Display - This should now work! */}
                            {log.afterPhoto && (
                              <div className="mt-3 bg-white p-3 rounded border-2 border-gray-200">
                                <p className="text-xs text-gray-600 mb-2 font-medium">📸 After Photo:</p>
                                <SafeImage
                                  src={log.afterPhoto}
                                  alt={`After photo - ${log.action}`}
                                  className="max-h-40 w-auto rounded-md shadow-sm border cursor-pointer hover:shadow-lg transition-shadow"
                                  onClick={() => {
                                    const newWindow = window.open('', '_blank', 'width=900,height=700');
                                    if (newWindow) {
                                      newWindow.document.write(`
                                        <html>
                                          <head><title>After Photo - ${log.action}</title></head>
                                          <body style="margin:0; display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:100vh; background:#000; color:white; font-family:Arial; padding:20px;">
                                            <h3 style="margin-bottom:20px; text-align:center;">${log.action} - ${log.user}</h3>
                                            <img src="${log.afterPhoto}" style="max-width:90%; max-height:70vh; object-fit:contain; border:2px solid #fff;" alt="After photo" />
                                            <div style="margin-top:20px; text-align:center; max-width:600px;">
                                              <p style="margin:10px 0;"><strong>Description:</strong> ${log.description || 'No description provided'}</p>
                                              <p style="margin:10px 0;"><strong>Date:</strong> ${new Date(log.timestamp).toLocaleString()}</p>
                                              ${log.distanceFromOriginal ? `<p style="margin:10px 0;"><strong>Distance:</strong> ${log.distanceFromOriginal} from original location</p>` : ''}
                                            </div>
                                          </body>
                                        </html>
                                      `);
                                    }
                                  }}
                                />
                                <p className="text-xs text-gray-500 mt-1">📱 Click to view full size</p>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Show completion info if resolved */}
                      {selectedComplaint.resolvedAt && (
                        <div className="border-l-4 border-green-500 pl-4 pb-4 bg-green-50 rounded-r">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-green-900 flex items-center">
                                🎉 Complaint Completed
                              </p>
                              <p className="text-sm text-green-700 mt-1">
                                Completed by <span className="font-medium">{selectedComplaint.resolvedBy || 'Unknown User'}</span>
                              </p>
                              <p className="text-xs text-green-600">
                                {new Date(selectedComplaint.resolvedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          
                          {/* Show completion photo if available */}
                          {(() => {
                            const completionLog = (selectedComplaint.updateLog || [])
                              .filter(log => (log.action.includes('completed') || log.action.includes('Completed')) && log.afterPhoto)
                              .pop();
                            
                            return completionLog && completionLog.afterPhoto && (
                              <div className="mt-3 bg-white p-2 rounded border">
                                <p className="text-xs text-green-700 mb-2 font-medium">✅ Completion Photo:</p>
                                <SafeImage
                                  src={completionLog.afterPhoto}
                                  alt="Completion photo"
                                  className="max-h-32 rounded-md shadow-sm border cursor-pointer hover:shadow-lg transition-shadow"
                                  onClick={() => {
                                    const newWindow = window.open('', '_blank', 'width=800,height=600');
                                    if (newWindow) {
                                      newWindow.document.write(`
                                        <html>
                                          <head><title>Completion Photo</title></head>
                                          <body style="margin:0; display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:100vh; background:#000; color:white; font-family:Arial;">
                                            <h3 style="margin-bottom:20px; color:#4ade80;">✅ Complaint Completed</h3>
                                            <img src="${completionLog.afterPhoto}" style="max-width:90%; max-height:80vh; object-fit:contain; border:2px solid #4ade80;" alt="Completion photo" />
                                            <p style="margin-top:20px; text-align:center; max-width:600px;">${completionLog.description}</p>
                                          </body>
                                        </html>
                                      `);
                                    }
                                  }}
                                />
                                <p className="text-xs text-green-600 mt-1">📱 Click to view full size</p>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    {editMode ? (
                      <>
                        <button
                          onClick={() => setEditMode(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveComplaint}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          💾 Save Changes
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setShowComplaintModal(false)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Update Status Modal */}
          {showUpdateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Update Complaint Status</h2>
                    <button
                      onClick={() => setShowUpdateModal(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={updateForm.status}
                        onChange={(e) => setUpdateForm(prev => ({...prev, status: e.target.value}))}
                        className="w-full border rounded-md p-2"
                      >
                        <option value="pending">Pending</option>
                        <option value="partial-completed">Partial Completed</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Update Description *</label>
                      <textarea
                        value={updateForm.description}
                        onChange={(e) => setUpdateForm(prev => ({...prev, description: e.target.value}))}
                        rows={3}
                        className="w-full border rounded-md p-2"
                        placeholder="Describe the changes made or current status..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">After Photo *</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="w-full border rounded-md p-2"
                        required
                      />
                      {updateForm.afterPhoto && (
                        <div className="mt-2">
                          <SafeImage
                            src={updateForm.afterPhoto}
                            alt="After photo preview"
                            className="h-32 w-32 object-cover rounded-md border shadow-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">Preview of after photo</p>
                        </div>
                      )}
                    </div>

                    <div className="bg-blue-50 p-3 rounded-md">
                      <p className="text-sm text-blue-700">
                        📍 Location verification status: {locationStatus}
                      </p>
                      {updateForm.userLocation && selectedComplaint.latitude && selectedComplaint.longitude && (
                        <p className="text-sm text-green-700 mt-1">
                          ✅ Distance: {calculateDistance(
                            updateForm.userLocation.lat,
                            updateForm.userLocation.lng,
                            selectedComplaint.latitude,
                            selectedComplaint.longitude
                          ).toFixed(3)} km from complaint location
                        </p>
                      )}
                      <button
                        onClick={getCurrentUserLocation}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        🔄 Refresh Location
                      </button>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-700">
                        👤 Updating as: <span className="font-medium">{currentUser?.username || currentUser?.email || 'Unknown User'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => setShowUpdateModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStatusUpdate}
                      disabled={!updateForm.userLocation}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🔄 Update Status
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Twitter Modal */}
          {showTwitterModal && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">🐦 Post to X (Twitter)</h2>
                    <button
                      onClick={() => setShowTwitterModal(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Authority to Tag</label>
                      <select
                        value={selectedAuthority}
                        onChange={(e) => setSelectedAuthority(e.target.value)}
                        className="w-full border rounded-md p-2"
                      >
                        <option value="">Select an authority...</option>
                        {AUTHORITY_HANDLES.map((authority, index) => (
                          <option key={index} value={authority.handle}>
                            {authority.handle} - {authority.responsibility}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tweet Preview</label>
                      <div className="border rounded-md p-3 bg-gray-50 text-sm">
                        🚨 COMPLAINT ALERT 🚨<br/><br/>
                        Category: {selectedComplaint?.category}<br/>
                        Priority: {selectedComplaint?.priority}<br/>
                        Location: {selectedComplaint?.address}<br/>
                        {selectedComplaint?.latitude && selectedComplaint?.longitude && (
                          <>📍 {selectedComplaint.latitude.toFixed(4)}, {selectedComplaint.longitude.toFixed(4)}<br/></>
                        )}
                        <br/>
                        Description: {selectedComplaint?.description}<br/><br/>
                        {selectedAuthority && <span className="text-blue-600">{selectedAuthority}</span>}<br/><br/>
                        #CitizenComplaint #Mumbai #FixIt
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => setShowTwitterModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={postToTwitter}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      🐦 Post to X
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Map Modal */}
          {showMap && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full">
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">
                      {selectedLocation ? `Location: ${selectedLocation.title}` : 'Complaint Location'}
                    </h3>
                    <button
                      onClick={() => setShowMap(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="h-96 rounded-lg overflow-hidden">
                    <MapContainer
                      center={mapCenter}
                      zoom={mapZoom}
                      scrollWheelZoom={true}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <MapView center={mapCenter} zoom={mapZoom} />
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {selectedLocation && (
                        <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
                          <Popup>
                            <div>
                              <h3 className="font-bold">{selectedLocation.title}</h3>
                            </div>
                          </Popup>
                        </Marker>
                      )}
                    </MapContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Complaints Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Total: {activeComplaints.length + solvedComplaints.length} complaints
                {currentUser && (
                  <span className="ml-2 text-blue-600">• Logged in as: {currentUser.username || currentUser.email}</span>
                )}
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button
                onClick={fetchComplaints}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveMainTab('active')}
                  className={`${
                    activeMainTab === 'active'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Active Complaints ({activeComplaints.length})
                </button>
                <button
                  onClick={() => setActiveMainTab('completed')}
                  className={`${
                    activeMainTab === 'completed'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Completed Complaints ({solvedComplaints.length})
                </button>
              </nav>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {activeMainTab === 'active' ? (
              <TabSwitcher tabs={activeTabs} />
            ) : (
              <TabSwitcher tabs={solvedTabs} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Complaints;
