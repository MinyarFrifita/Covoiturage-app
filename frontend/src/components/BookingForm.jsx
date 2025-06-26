import React, { useState } from 'react';
import api from '../services/api';

function BookingForm({ trip, token, onBook }) {
  const [error, setError] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({
    seats: 1,
    paymentStatus: 'pending',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
     // Placeholder pour l'API Konnect - Remplace par l'endpoint et les données spécifiques de Konnect
   const paymentResponse = await api.post(
  'https://dev.konnect.network/api/payment/sessions', // Endpoint à confirmer avec la doc Konnect
  {
    receiverWalletId: '5f7a209aeb3f76490ac4a3d1', // Remplace par ton wallet ID Konnect
    token: 'TND',
    amount: trip.price * bookingDetails.seats * 1000, // Convertir en centimes (ex. 10 TND = 10000)
    type: 'immediate',
    description: `Réservation pour trajet ${trip.departure_city} -> ${trip.destination}`,
    acceptedPaymentMethods: ['wallet', 'bank_card', 'e-DINAR'],
    lifespan: 10,
    checkoutForm: true,
    addPaymentFeesToAmount: true,
    firstName: 'John', // Remplace par current_user.firstName si disponible
    lastName: 'Doe',   // Remplace par current_user.lastName si disponible
    phoneNumber: '22777777', // Remplace par current_user.phone si disponible
    email: 'john.doe@gmail.com', // Remplace par current_user.email si disponible
    orderId: trip.id.toString(),
    webhook: 'https://your-backend.com/api/webhook', // Remplace par ton URL de webhook
    theme: 'dark',
  },
  {
    headers: {
      Authorization: `Bearer ${token}`,
      // Ajoute le jeton API Konnect si requis (ex. 'X-API-Key: 6137ad140c181c5eb44a7f88:Rp2dpHPb0mBpj3_51s86zzp3PXs5w1')
    },
  }
);

const payUrl = paymentResponse.data.payUrl;
if (payUrl) {
  window.location.href = payUrl; // Redirige vers la page de paiement Konnect
} else {
  setError('No payment URL received from Konnect.');
}
      if (response.data.success) {
        onBook(); 
        alert('Booking and payment successful with Konnect!');
      } else {
        setError('Payment failed with Konnect.');
      }
    } catch (err) {
      setError('Booking failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4">Book Trip</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="number"
          min="1"
          max={trip.available_seats}
          value={bookingDetails.seats}
          onChange={(e) => setBookingDetails({ ...bookingDetails, seats: parseInt(e.target.value) })}
          placeholder="Number of seats"
          className="w-full p-2 border rounded"
          required
        />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">
          Book Now
        </button>
      </form>
    </div>
  );
}

export default BookingForm;
