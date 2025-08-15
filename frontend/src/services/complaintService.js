import api from '../api';

// Get all complaints
export const getAllComplaints = async () => {
  try {
    const response = await api.get('/api/complaints');
    return response.data;
  } catch (error) {
    console.error('Error fetching complaints:', error);
    throw error;
  }
};

// Create a new complaint
export const createComplaint = async (complaintData) => {
  try {
    const response = await api.post('/api/complaints', complaintData);
    return response.data;
  } catch (error) {
    console.error('Error creating complaint:', error);
    throw error;
  }
};

// Update a complaint
export const updateComplaint = async (id, complaintData) => {
  try {
    const response = await api.put(`/api/complaints/${id}`, complaintData);
    return response.data;
  } catch (error) {
    console.error('Error updating complaint:', error);
    throw error;
  }
};

// Delete a complaint
export const deleteComplaint = async (id) => {
  try {
    const response = await api.delete(`/api/complaints/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting complaint:', error);
    throw error;
  }
};
