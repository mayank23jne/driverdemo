const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const GOOGLE_MAPS_API_KEY = 'AIzaSyDFf3YK0MWDI1dYyVcJONOwdaaXW_eO3aU';

// Serve the frontend
app.use(express.static('public'));

// Store bus locations
let busLocations = {};

// Simulated ETA calculation function using Google Maps Directions API
async function calculateETA(busLocation, destination, mode = 'driving') {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: `${busLocation.latitude},${busLocation.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        mode: mode,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    const route = response.data.routes[0];
    const eta = route.legs[0].duration.value / 60; // Convert seconds to minutes
    return eta.toFixed(2);
  } catch (error) {
    console.error('Error calculating ETA:', error);
    return 'N/A';
  }
}

// Handle socket connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Listen for location updates from drivers
  socket.on('driverLocationUpdate', async (data) => {
    console.log('Received driverLocationUpdate', data);
    busLocations[data.busId] = {
      latitude: data.latitude,
      longitude: data.longitude
    };

    // Calculate ETA to a fixed destination
    const eta = await calculateETA(busLocations[data.busId], { latitude: 23.1652669, longitude: 75.7889062 });
    io.emit(`busLocationUpdate-${data.busId}`, { ...data, eta });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });

});


// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
