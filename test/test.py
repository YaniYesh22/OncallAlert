from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sock import Sock
from flask_socketio import SocketIO
from datetime import datetime
import threading
import random
import time
import requests
import json

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")
websocket_clients = set()
@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

def broadcast_alert(alert_dict):
    socketio.emit('alert', alert_dict)


@app.route('/api/test/generate-alert', methods=['POST'])
def generate_test_alert():
    subjects = [
        'High CPU Usage', 'Memory Warning', 'Disk Space Low', 
        'Network Latency', 'Service Down', 'Security Alert',
        'Backup Failed', 'Database Error', 'SSL Certificate Expiring'
    ]
    contents = [
        'CPU usage exceeded 90%', 'Available memory below 10%',
        'Disk usage above 95%', 'Network latency above 200ms',
        'Critical service stopped responding', 'Multiple failed login attempts',
        'Backup process failed', 'Database connection timeout',
        'SSL certificate expires in 7 days'
    ]
    severities = ['error', 'warning', 'info']
    
    alert = {
        "device_id" : 1,
        "subject" : random.choice(subjects)
    }
    
    broadcast_alert(alert)  # Use broadcast_alert instead of direct emit
    return '', 204  # Return empty response with 204 No Content


if __name__ == '__main__':
    socketio.run(app, debug=False)
