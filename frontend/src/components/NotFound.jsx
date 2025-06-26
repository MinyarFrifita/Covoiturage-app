import React from 'react';

function NotFound() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Page non trouvée</h1>
        <p className="text-gray-700">La page que vous cherchez n'existe pas.</p>
        <a href="/" className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Retour à l'accueil
        </a>
      </div>
    </div>
  );
}

export default NotFound;
