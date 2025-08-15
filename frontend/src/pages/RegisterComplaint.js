import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { createComplaint } from '../services/complaintService';
import api from "../api"; // 


function RegisterComplaint() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const captureMode = new URLSearchParams(search).get('capture') === 'true';

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    category: 'Garbage',
    description: '',
    address: '',
    lat: '',
    lng: '',
    priority: 'Medium',
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isGettingLoc, setIsGettingLoc] = useState(false);
  const [locError, setLocError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitOK, setSubmitOK] = useState(false);

  // Reverse geocoding
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`
      );
      const json = await res.json();
      if (json?.display_name) {
        setFormData((p) => ({ ...p, address: json.display_name }));
      }
    } catch (err) {
      console.error('Reverse-geocode error:', err);
    }
  }, []);

  // Enhanced geolocation with better mobile support
  const getLocation = useCallback(() => {
    setIsGettingLoc(true);
    setLocError('');

    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by this browser');
      setIsGettingLoc(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000, // Increased timeout for mobile
      maximumAge: 60000 // Accept cached location up to 1 minute old
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setFormData((p) => ({
          ...p,
          lat: latitude.toFixed(6),
          lng: longitude.toFixed(6),
        }));
        reverseGeocode(latitude, longitude);
        setIsGettingLoc(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        let errorMessage = 'Unable to get your location. ';
        switch(err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please allow location access in your browser settings and refresh the page.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please check your device location settings.';
            break;
          case err.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again or enter address manually.';
            break;
          default:
            errorMessage = 'An unknown location error occurred.';
        }
        setLocError(errorMessage);
        setIsGettingLoc(false);
      },
      options
    );
  }, [reverseGeocode]);

  // Enhanced camera with better error handling for mobile
  const startCamera = useCallback(async () => {
    try {
      console.log('🎬 Starting camera...');
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices) {
        alert('Camera not available on this connection. Please use HTTPS or localhost, or upload an image file instead.');
        return;
      }

      if (!navigator.mediaDevices.getUserMedia) {
        alert('Camera access not supported. Please upload an image file instead.');
        return;
      }

      // Stop previous stream
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
        setCameraStream(null);
      }

      setVideoReady(false);
      setShowCamera(true);

      // Try different camera constraints
      let stream;
      try {
        // First try with environment camera (back camera)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          },
          audio: false,
        });
      } catch (err) {
        console.log('Environment camera failed, trying user camera...');
        // Fallback to front camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user',
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          },
          audio: false,
        });
      }

      console.log('📹 Stream obtained:', stream);
      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        const setupVideo = () => {
          return new Promise((resolve, reject) => {
            const video = videoRef.current;
            
            const onLoadedMetadata = () => {
              console.log('📊 Video metadata loaded');
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              resolve();
            };

            const onError = (err) => {
              console.error('❌ Video error:', err);
              video.removeEventListener('error', onError);
              reject(err);
            };

            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('error', onError);
            
            // Fallback timeout
            setTimeout(() => {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              resolve(); // Continue anyway
            }, 5000);
          });
        };

        await setupVideo();
        
        // Play the video
        try {
          await videoRef.current.play();
          console.log('▶️ Video playing');
          
          // Wait a bit more for the video to stabilize
          setTimeout(() => {
            if (videoRef.current && videoRef.current.videoWidth > 0) {
              console.log('✅ Video ready:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
              setVideoReady(true);
            } else {
              console.log('⏳ Video still loading...');
              // Try again in a moment
              setTimeout(() => {
                if (videoRef.current && videoRef.current.videoWidth > 0) {
                  setVideoReady(true);
                }
              }, 1000);
            }
          }, 500);
          
        } catch (playErr) {
          console.error('❌ Play error:', playErr);
          // Sometimes autoplay fails, but video still works
          setVideoReady(true);
        }
      }

    } catch (err) {
      console.error('❌ Camera error:', err);
      if (err.name === 'NotAllowedError') {
        alert('Camera permission denied. Please allow camera access and try again, or use "Choose File" to upload an image.');
      } else if (err.name === 'NotFoundError') {
        alert('No camera found on this device. Please use "Choose File" to upload an image.');
      } else {
        alert('Camera unavailable on this connection. Please use "Choose File" to upload an image instead.');
      }
      setShowCamera(false);
    }
  }, [cameraStream]);

  // Stop camera
  const stopCamera = () => {
    console.log('🛑 Stopping camera');
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
    setVideoReady(false);
  };

  // Enhanced photo capture
  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    console.log('📸 Taking photo...');
    console.log('Video element:', video);
    console.log('Video ready:', videoReady);
    console.log('Video dimensions:', video?.videoWidth, 'x', video?.videoHeight);
    
    if (!video || !canvas) {
      alert('Camera elements not ready');
      return;
    }
    
    if (!videoReady || video.videoWidth === 0 || video.videoHeight === 0) {
      alert('Camera is still loading. Please wait a moment and try again.');
      return;
    }

    try {
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      console.log('🎨 Canvas size set to:', canvas.width, 'x', canvas.height);
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      console.log('📷 Photo captured, size:', dataUrl.length);
      
      if (dataUrl.length < 1000) {
        alert('Photo capture failed. Please try again.');
        return;
      }
      
      // Set preview
      setImagePreview(dataUrl);
      
      // Create file object
      fetch(dataUrl)
        .then((r) => r.blob())
        .then((blob) => {
          const file = new File([blob], `complaint-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setImage(file);
          console.log('✅ File created:', file.name, file.size);
        });

      console.log('✅ Photo captured successfully');
      stopCamera();
      
    } catch (err) {
      console.error('❌ Capture error:', err);
      alert('Error capturing photo: ' + err.message);
    }
  };

  // Effects
  useEffect(() => {
    getLocation();
    if (captureMode) {
      startCamera();
    }

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [captureMode, getLocation, startCamera, cameraStream]);

  // Form handlers
  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

// In your RegisterComplaint.js, update the onSubmit function:

// In your RegisterComplaint.js or wherever you create complaints
const onSubmit = async (e) => {
  e.preventDefault();
  
  if (!formData.address.trim()) {
    alert('Please wait for location to be detected or refresh location');
    return;
  }

  setIsSubmitting(true);

  try {
    const complaintData = {
      category: formData.category,
      description: formData.description,
      priority: formData.priority,
      address: formData.address,
      latitude: Number(formData.lat) || null,
      longitude: Number(formData.lng) || null,
      image: imagePreview
    };
    
    console.log('Submitting complaint:', complaintData);
    
    // Use your configured API instance that includes JWT tokens
    const response = await api.post('/api/complaints', complaintData);
    console.log('Complaint submitted successfully:', response.data);
    
    setSubmitOK(true);
    
    // Reset form after success
    setTimeout(() => {
      setFormData({
        category: 'Garbage',
        description: '',
        address: '',
        lat: '',
        lng: '',
        priority: 'Medium',
      });
      setImage(null);
      setImagePreview(null);
      setSubmitOK(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      getLocation();
    }, 3000);
    
  } catch (err) {
    console.error('Submit error:', err);
    alert('Failed to submit complaint: ' + (err.response?.data?.message || err.message));
  } finally {
    setIsSubmitting(false);
  }
};



  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white p-6 rounded-lg w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Take a Photo</h3>
              <button 
                onClick={stopCamera}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-700">
                📷 {videoReady ? 'Camera ready - position to capture the issue' : 'Loading camera...'}
              </p>
            </div>

            <div className="relative bg-black rounded-md overflow-hidden" style={{ minHeight: '250px' }}>
              <video
                ref={videoRef}
                className="w-full h-auto"
                style={{ maxHeight: '300px', minHeight: '200px' }}
                playsInline
                muted
                autoPlay
              />
              
              {!videoReady && (
                <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-50">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <p className="text-sm">Loading camera...</p>
                  </div>
                </div>
              )}
            </div>
            
            <canvas ref={canvasRef} className="hidden" />

            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={stopCamera}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={takePhoto}
                disabled={!videoReady}
                className={`px-6 py-2 rounded-md text-white ${
                  videoReady 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                📸 {videoReady ? 'Capture Photo' : 'Please Wait...'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <main className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-8 bg-gradient-to-r from-blue-600 to-blue-800">
            <h2 className="text-2xl font-bold text-white">Register a Complaint</h2>
            <p className="mt-2 text-blue-100">Fill out the form below to submit your complaint</p>
          </div>

          <div className="px-6 py-8">
            {submitOK && (
              <div className="mb-6 p-4 rounded-md bg-green-50 border border-green-300 text-green-700">
                ✅ Your complaint has been submitted successfully!
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-6">
              {/* Category & Priority */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={onChange}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {['Garbage', 'Water Leakage', 'Pothole', 'Electricity Issue', 'Street Light', 'Sewage', 'Other'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={onChange}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {['Low', 'Medium', 'High'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  rows={4}
                  required
                  value={formData.description}
                  onChange={onChange}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Please provide detailed information about the issue"
                />
              </div>

              {/* Enhanced Location Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                {isGettingLoc ? (
                  <div className="flex items-center text-blue-600 mb-2">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Getting your location...
                  </div>
                ) : locError ? (
                  <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{locError}</p>
                    <button
                      type="button"
                      onClick={getLocation}
                      className="mt-1 text-sm text-red-600 hover:text-red-800 underline"
                    >
                      Try Again
                    </button>
                  </div>
                ) : formData.lat && formData.lng ? (
                  <div className="mb-2 flex items-center text-green-600">
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Location detected successfully
                    <button
                      type="button"
                      onClick={getLocation}
                      className="ml-2 text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Update
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={getLocation}
                    className="mb-2 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                  >
                    <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Get Current Location
                  </button>
                )}
                
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={onChange}
                  placeholder="Address will be auto-filled from your location"
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                
                {formData.lat && formData.lng && (
                  <p className="mt-1 text-xs text-gray-500">
                    Coordinates: {formData.lat}, {formData.lng}
                  </p>
                )}
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={onFile}
                    className="hidden"
                    id="fileInput"
                  />
                  <label
                    htmlFor="fileInput"
                    className="px-3 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-sm"
                  >
                    Choose File
                  </label>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    📸 Take Photo
                  </button>
                  <span className="text-sm text-gray-600">
                    {image ? (image.name || 'Photo captured') : 'No image selected'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Supported formats: JPG, PNG, GIF. Max size: 5MB
                </p>

                {/* Image Preview */}
                {imagePreview && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-40 rounded-md border shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImage(null);
                          setImagePreview(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Submit Complaint'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default RegisterComplaint;
