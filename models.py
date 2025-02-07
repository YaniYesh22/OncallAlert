# models.py
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Device(db.Model):
   __tablename__ = 'devices'
   id = db.Column(db.Integer, primary_key=True)
   name = db.Column(db.String(100), nullable=False)
   ip_address = db.Column(db.String(15))
   alerts = db.relationship('Alert', backref='device', lazy=True)

class Alert(db.Model): 
   __tablename__ = 'alerts'
   id = db.Column(db.Integer, primary_key=True)
   device_id = db.Column(db.Integer, db.ForeignKey('devices.id', ondelete='CASCADE'), nullable=False)
   subject = db.Column(db.String(200), nullable=False)
   content = db.Column(db.Text, nullable=False)
   severity = db.Column(db.String(50), nullable=False)
   timestamp = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
   resolved = db.Column(db.Boolean, default=False)
   resolution_comment = db.Column(db.Text)
   resolved_at = db.Column(db.DateTime(timezone=True))

   def to_dict(self):
       return {
           'id': self.id,
           'device': self.device.name,
           'device_ip': self.device.ip_address,
           'subject': self.subject,
           'content': self.content, 
           'severity': self.severity,
           'timestamp': self.timestamp.isoformat(),
           'resolved': self.resolved,
           'resolution_comment': self.resolution_comment,
           'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None
       }