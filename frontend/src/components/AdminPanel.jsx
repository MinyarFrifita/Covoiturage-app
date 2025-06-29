import React from 'react';
import { Link } from 'react-router-dom';

function AdminPanel({ currentAdmin }) {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Admin Panel</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link 
            to="/admin/users" 
            className="bg-blue-100 p-4 rounded-lg hover:bg-blue-200 transition"
          >
            <h4 className="font-medium">Manage Users</h4>
          </Link>
          <Link 
            to="/admin/trips" 
            className="bg-green-100 p-4 rounded-lg hover:bg-green-200 transition"
          >
            <h4 className="font-medium">Manage Trips</h4>
          </Link>
          <div className="bg-yellow-100 p-4 rounded-lg">
            <h4 className="font-medium">System Settings</h4>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg">
            <h4 className="font-medium">Reports</h4>
          </div>
        </div>
        
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Admin Information</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p><span className="font-medium">Email:</span> {currentAdmin?.email}</p>
            <p><span className="font-medium">Role:</span> {currentAdmin?.role}</p>
            <p><span className="font-medium">Last Login:</span> {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
