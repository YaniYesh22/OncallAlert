const API_URL = 'http://localhost:5000/api';

// Initialize socket connection
const socket = io('http://localhost:5000');

socket.on('connect', () => {
    console.log('Connected to WebSocket server');
});

socket.on('alert', (alert) => {
    console.log('New alert:', alert);
    const test = document.getElementById('test');
    console.log(alert)
    test.innerHTML = alert.subject;
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});