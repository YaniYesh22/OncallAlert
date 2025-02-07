from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sock import Sock
from flask_socketio import SocketIO

from models import db, Device, Alert
from datetime import datetime
import threading
import random
import time
import requests
import json
#psql postgres CREATE DATABASE alerts; CREATE USER admin WITH PASSWORD admin; GRANT ALL PRIVILEGES ON DATABASE alerts TO admin; \q
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://admin:admin@localhost:5432/alerts'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
websocket_clients = set()


@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

def broadcast_alert(alert_dict):
    socketio.emit('alert', alert_dict)


@app.route('/api/devices', methods=['GET'])
def get_devices():
   devices = Device.query.all()
   return jsonify([{
       'id': d.id, 
       'name': d.name, 
       'ip_address': d.ip_address
   } for d in devices])

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
   device_id = request.args.get('device_id')
   resolved = request.args.get('resolved', 'false').lower() == 'true'
   
   query = Alert.query.filter_by(resolved=resolved)
   if device_id and device_id != 'all':
       query = query.filter_by(device_id=device_id)
   
   alerts = query.order_by(Alert.timestamp.desc()).all()
   return jsonify([alert.to_dict() for alert in alerts])

@app.route('/api/alerts', methods=['POST'])
def create_alert():
   data = request.json
   alert = Alert(
       device_id=data['device_id'],
       subject=data['subject'],
       content=data['content'],
       severity=data['severity']
   )
   db.session.add(alert)
   db.session.commit()
   
   broadcast_alert(alert.to_dict())
   return jsonify(alert.to_dict())

@app.route('/api/alerts/<int:alert_id>/resolve', methods=['POST'])
def resolve_alert(alert_id):
   data = request.json
   alert = Alert.query.get_or_404(alert_id)
   
   alert.resolved = True
   alert.resolution_comment = data['comment']
   alert.resolved_at = datetime.utcnow()
   
   db.session.commit()
   return jsonify(alert.to_dict())

@app.route('/api/stats', methods=['GET'])
def get_stats():
   device_id = request.args.get('device_id')
   resolved = request.args.get('resolved', 'false').lower() == 'true'
   
   query = Alert.query.filter_by(resolved=resolved)
   if device_id and device_id != 'all':
       query = query.filter_by(device_id=device_id)
   
   alerts = query.all()
   return jsonify({
       'total': len(alerts),
       'error': len([a for a in alerts if a.severity == 'error']),
       'warning': len([a for a in alerts if a.severity == 'warning']),
       'info': len([a for a in alerts if a.severity == 'info'])
   })
@app.route('/api/test/generate-alert', methods=['POST'])
def generate_test_alert():
    devices = Device.query.all()
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
    
    alert = Alert(
        device_id=random.choice(devices).id,
        subject=random.choice(subjects),
        content=random.choice(contents),
        severity=random.choice(severities)
    )
    
    db.session.add(alert)
    db.session.commit()
    
    broadcast_alert(alert.to_dict())
    return jsonify({"status": "success"}), 200


@app.route('/api/reset-db', methods=['POST'])
def reset_db():
    with app.app_context():
        # Drop all tables
        db.drop_all()
        
        # Recreate tables
        db.create_all()
        
       # Add sample devices
        devices = [
               Device(name='FMlab', ip_address='192.168.1.100'),
               Device(name='HFLab Server', ip_address='192.168.1.101'),
               Device(name='fmlwa.csa.ot.ice', ip_address='192.168.1.2'),
               Device(name='fmlwb.csa.ot.ice', ip_address='192.168.1.1'),
               Device(name='mail_relay', ip_address='192.168.1.1'),
        ]
        db.session.add_all(devices)
        db.session.commit()

        return jsonify({"message": "Database reset successful"}), 200
    
def alert_generator():
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

    while True:
        try:
            devices = Device.query.all()
            alert = Alert(
                device_id=random.choice(devices).id,
                subject=random.choice(subjects),
                content=random.choice(contents),
                severity=random.choice(severities)
            )
            db.session.add(alert)
            db.session.commit()
            broadcast_alert(alert.to_dict())
        except Exception as e:
            print(f"Error in alert generator: {e}")
        time.sleep(10)

def init_db():
   with app.app_context():
       db.create_all()
       
       if not Device.query.first():
           devices = [
               Device(name='FMlab', ip_address='192.168.1.100'),
               Device(name='HFLab Server', ip_address='192.168.1.101'),
               Device(name='fmlwa.csa.ot.ice', ip_address='192.168.1.2'),
               Device(name='fmlwb.csa.ot.ice', ip_address='192.168.1.1'),
               Device(name='mail_relay', ip_address='192.168.1.1'),
           ]
           db.session.add_all(devices)
           db.session.commit()

if __name__ == '__main__':
    init_db()
    socketio.run(app, debug=False)

    # threading.Thread(target=alert_generator, daemon=True).start()
    # app.run(debug=False )
