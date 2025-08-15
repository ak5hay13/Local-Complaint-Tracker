import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import TabSwitcher from '../components/TabSwitcher';

function SolvedComplaints() {
  // Mock data for solved complaints
  const [complaints, setComplaints] = useState([
    {
      id: 101,
      title: 'Broken Playground Equipment',
      description: 'The swing set in Central Park has a broken chain that needs to be replaced.',
      category: 'Parks',
      priority: 'Medium',
      status: 'Resolved',
      createdAt: '2023-09-05',
      resolvedAt: '2023-09-12',
      resolvedBy: 'Michael Brown',
      location: 'Central Park, East Side'
    },
    {
      id: 102,
      title: 'Traffic Light Malfunction',
      description: 'The traffic light at Oak Street and Pine Avenue is stuck on red in all directions.',
      category: 'Traffic',
      priority: 'High',
      status: 'Resolved',
      createdAt: '2023-09-10',
      resolvedAt: '2023-09-11',
      resolvedBy: 'Sarah Wilson',
      location: 'Oak St & Pine Ave'
    },
    {
      id: 103,
      title: 'Graffiti on Public Building',
      description: 'There is extensive graffiti on the west wall of the community center.',
      category: 'Vandalism',
      priority: 'Low',
      status: 'Resolved',
      createdAt: '2023-09-15',
      resolvedAt: '2023-09-25',
      resolvedBy: 'David Martinez',
      location: 'Community Center, 123 Main St'
    },
    {
      id: 104,
      title: 'Fallen Tree Blocking Road',
      description: 'A large oak tree has fallen and is completely blocking Cedar Lane.',
      category: 'Roads',
      priority: 'High',
      status: 'Resolved',
      createdAt: '2023-09-20',
      resolvedAt: '2023-09-21',
      resolvedBy: 'Emergency Response Team',
      location: 'Cedar Lane, near house #42'
    },
  ]);

  // Filter complaints by resolution time
  const thisWeekComplaints = complaints.filter(c => {
    const resolvedDate = new Date(c.resolvedAt);
    const today = new Date();
    const oneWeekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    return resolvedDate >= oneWeekAgo;
  });

  const thisMonthComplaints = complaints.filter(c => {
    const resolvedDate = new Date(c.resolvedAt);
    const today = new Date();
    const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    return resolvedDate >= oneMonthAgo;
  });

  // Function to render complaint cards
  const renderComplaintCards = (complaintsToRender) => {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fadeIn">
        {complaintsToRender.map(complaint => (
          <div key={complaint.id} className="bg-white overflow-hidden shadow rounded-lg hover-lift">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900 truncate">{complaint.title}</h3>
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  Resolved
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
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Created</p>
                  <p className="font-medium">{complaint.createdAt}</p>
                </div>
                <div>
                  <p className="text-gray-500">Resolved</p>
                  <p className="font-medium">{complaint.resolvedAt}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">Resolved by</p>
                  <p className="font-medium">{complaint.resolvedBy}</p>
                </div>
              </div>
              <div className="mt-4 flex space-x-2">
                <button className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  View Details
                </button>
                <button className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Download Report
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
      label: 'This Week',
      count: thisWeekComplaints.length,
      content: renderComplaintCards(thisWeekComplaints)
    },
    {
      label: 'This Month',
      count: thisMonthComplaints.length,
      content: renderComplaintCards(thisMonthComplaints)
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Solved Complaints</h1>
              <p className="mt-1 text-sm text-gray-500">View history of all resolved complaints</p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search resolved complaints..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Export
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

export default SolvedComplaints;