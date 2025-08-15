import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import TabSwitcher from '../components/TabSwitcher';

function ActiveComplaints() {
  // Mock data for active complaints
  const [complaints, setComplaints] = useState([
    {
      id: 1,
      title: 'Water Leakage in Building A',
      description: 'There is a major water leakage in the basement of Building A that needs immediate attention.',
      category: 'Plumbing',
      priority: 'High',
      status: 'In Progress',
      createdAt: '2023-10-15',
      assignedTo: 'John Doe',
      location: 'Building A, Basement'
    },
    {
      id: 2,
      title: 'Broken Street Light',
      description: 'The street light at the corner of Main St. and 5th Ave. is not working, creating a safety hazard at night.',
      category: 'Electrical',
      priority: 'Medium',
      status: 'Assigned',
      createdAt: '2023-10-18',
      assignedTo: 'Jane Smith',
      location: 'Main St. & 5th Ave.'
    },
    {
      id: 3,
      title: 'Garbage Collection Missed',
      description: 'The garbage collection service has missed our street for the past two weeks.',
      category: 'Sanitation',
      priority: 'Medium',
      status: 'Pending',
      createdAt: '2023-10-20',
      assignedTo: 'Unassigned',
      location: 'Maple Street'
    },
    {
      id: 4,
      title: 'Pothole on Highway',
      description: 'Large pothole on Highway 101 causing traffic and potential vehicle damage.',
      category: 'Roads',
      priority: 'High',
      status: 'In Progress',
      createdAt: '2023-10-12',
      assignedTo: 'Robert Johnson',
      location: 'Highway 101, Mile 24'
    },
  ]);

  // Filter complaints by status
  const pendingComplaints = complaints.filter(c => c.status === 'Pending');
  const assignedComplaints = complaints.filter(c => c.status === 'Assigned');
  const inProgressComplaints = complaints.filter(c => c.status === 'In Progress');

  // Function to render complaint cards
  const renderComplaintCards = (complaintsToRender) => {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fadeIn">
        {complaintsToRender.map(complaint => (
          <div key={complaint.id} className="bg-white overflow-hidden shadow rounded-lg hover-lift">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900 truncate">{complaint.title}</h3>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  complaint.priority === 'High' ? 'bg-red-100 text-red-800' : 
                  complaint.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-green-100 text-green-800'
                }`}>
                  {complaint.priority}
                </span>
              </div>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p className="truncate">{complaint.description}</p>
              </div>
              <div className="mt-3 flex items-center text-sm text-gray-500">
                <span className="truncate">{complaint.category}</span>
                <span className="mx-1">•</span>
                <span>{complaint.location}</span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  <span>Assigned to: </span>
                  <span className="font-medium text-gray-900">{complaint.assignedTo}</span>
                </div>
                <div className="text-sm text-gray-500">
                  <span>Created: </span>
                  <span>{complaint.createdAt}</span>
                </div>
              </div>
              <div className="mt-4 flex space-x-2">
                <button className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  View Details
                </button>
                <button className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                  Update Status
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Define tabs for the TabSwitcher
  const tabs = [
    {
      label: 'All',
      count: complaints.length,
      content: renderComplaintCards(complaints)
    },
    {
      label: 'Pending',
      count: pendingComplaints.length,
      content: renderComplaintCards(pendingComplaints)
    },
    {
      label: 'Assigned',
      count: assignedComplaints.length,
      content: renderComplaintCards(assignedComplaints)
    },
    {
      label: 'In Progress',
      count: inProgressComplaints.length,
      content: renderComplaintCards(inProgressComplaints)
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Active Complaints</h1>
              <p className="mt-1 text-sm text-gray-500">Manage and track all active complaints in the system</p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search complaints..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Filter
              </button>
            </div>
          </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <TabSwitcher tabs={tabs} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default ActiveComplaints;