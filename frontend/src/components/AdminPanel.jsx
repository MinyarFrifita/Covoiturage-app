import React from 'react';
import { Link } from 'react-router-dom';

function AdminPanel({ currentAdmin }) {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Admin Panel</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-700">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin-dashboard"
            className="bg-blue-100 p-4 rounded-lg hover:bg-blue-200 transition text-center flex items-center justify-center"
          >
            <h4 className="font-medium text-blue-800">Manage Users & Trips</h4>
          </Link>
          <Link
            to="/admin-settings"
            className="bg-yellow-100 p-4 rounded-lg hover:bg-yellow-200 transition text-center flex items-center justify-center"
          >
            <h4 className="font-medium text-yellow-800">System Settings</h4>
          </Link>
          <Link
            to="/admin-reports"
            className="bg-purple-100 p-4 rounded-lg hover:bg-purple-200 transition text-center flex items-center justify-center"
          >
            <h4 className="font-medium text-purple-800">Reports</h4>
          </Link>
          <div className="bg-gray-100 p-4 rounded-lg text-center flex items-center justify-center">
            <h4 className="font-medium text-gray-500">Coming Soon</h4>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Admin Information</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="mb-2">
              <span className="font-medium text-gray-600">Email:</span>{' '}
              <span className="text-gray-800">{currentAdmin?.email || 'Not available'}</span>
            </p>
            <p className="mb-2">
              <span className="font-medium text-gray-600">Role:</span>{' '}
              <span className="text-gray-800">{currentAdmin?.role || 'Not available'}</span>
            </p>
            <p>
              <span className="font-medium text-gray-600">Last Login:</span>{' '}
              <span className="text-gray-800">
                {currentAdmin?.last_login
                  ? new Date(currentAdmin.last_login).toLocaleString()
                  : 'Not available'}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
