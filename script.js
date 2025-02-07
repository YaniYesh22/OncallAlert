const API_URL = 'http://localhost:5000/api';

// Initialize socket connection
const socket = io('http://localhost:5000');

socket.on('connect', () => {
    console.log('Connected to WebSocket server');
});

socket.on('alert', (alert) => {
    console.log('New alert:', alert);
    showNotification(alert);
    appendNewAlert(alert);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

let state = {
    currentView: 'active',
    currentDevice: 'all',
    deviceChart: null
};

const api = {
    async fetchDevices() {
        const response = await fetch(`${API_URL}/devices`);
        return response.json();
    },
    

    async fetchAlerts(resolved = false, deviceId = null) {
        let url = `${API_URL}/alerts?resolved=${resolved}`;
        if (deviceId && deviceId !== 'all') {
            url += `&device_id=${deviceId}`;
        }
        const response = await fetch(url);
        return response.json();
    },

    async resolveAlert(alertId, comment) {
        const response = await fetch(`${API_URL}/alerts/${alertId}/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment })
        });
        return response.json();
    },

    async fetchStats(resolved = false, deviceId = null) {
        let url = `${API_URL}/stats?resolved=${resolved}`;
        if (deviceId && deviceId !== 'all') {
            url += `&device_id=${deviceId}`;
        }
        const response = await fetch(url);
        return response.json();
    }
    
};

api.generateTestAlert = async () => {
    try {
        const response = await fetch(`${API_URL}/test/generate-alert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Alert generation failed');
        return false; // Prevent form submission
    } catch (error) {
        console.error('Error:', error);
        return false;
    }
};

function formatTimestamp(date) {
    return new Date(date).toLocaleString();
}
async function appendNewAlert(alert) {
    if (state.currentView === 'active') {
        const container = document.getElementById('activeAlertsContainer');
        const wrapper = document.createElement('div');
        wrapper.innerHTML = createAlertCard(alert);
        container.insertBefore(wrapper.firstElementChild, container.firstChild);

        const totalAlerts = document.getElementById('totalAlerts');
        if (totalAlerts) {
            totalAlerts.textContent = parseInt(totalAlerts.textContent) + 1;
        }

        await updateStats();

        // Fetch latest alerts and update chart
        const alerts = await api.fetchAlerts(false, state.currentDevice);
        updateDeviceChart(alerts);
    }
}

let activeNotifications = [];
let notificationHeight = 100; // Height of each notification + margin


function showNotification(alert) {
    // Clean up old notifications
    activeNotifications = activeNotifications.filter(n => document.body.contains(n));

    // Maximum 6 notifications
    if (activeNotifications.length >= 6) {
        const oldNotification = activeNotifications.shift();
        oldNotification.classList.add('hide');
        setTimeout(() => oldNotification.remove(), 300);
    }

    const notification = document.createElement('div');
    notification.className = `notification ${alert.severity}`;
    notification.innerHTML = `
       <div class="notification-header">${alert.device}: ${alert.subject}</div>
       <div class="notification-body">${alert.content}</div>
   `;

    notification.style.top = `${20 + (activeNotifications.length * notificationHeight)}px`;
    document.body.appendChild(notification);
    activeNotifications.push(notification);

    requestAnimationFrame(() => {
        notification.classList.add('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.classList.add('hide');
                setTimeout(() => {
                    const index = activeNotifications.indexOf(notification);
                    if (index > -1) {
                        activeNotifications.splice(index, 1);
                        notification.remove();

                        // Reposition remaining notifications
                        activeNotifications.forEach((n, i) => {
                            n.style.transition = 'top 0.3s ease';
                            n.style.top = `${20 + (i * notificationHeight)}px`;
                        });
                    }
                }, 300);
            }
        }, 5000);
    });
}

function updateDeviceChart(alerts) {
    if (!Array.isArray(alerts) || alerts.length === 0) return;

    try {
        const deviceStats = alerts.reduce((acc, alert) => {
            if (alert && alert.device) {
                acc[alert.device] = (acc[alert.device] || 0) + 1;
            }
            return acc;
        }, {});

        const ctx = document.getElementById('deviceChart');
        if (!ctx || Object.keys(deviceStats).length === 0) return;

        if (state.deviceChart) {
            state.deviceChart.destroy();
        }

        state.deviceChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(deviceStats),
                datasets: [{
                    data: Object.values(deviceStats),
                    backgroundColor: ['#4f46e5', '#dc2626', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right' }
                }
            }
        });
    } catch (error) {
        console.error("Chart error:", error);
    }
}
function createAlertCard(alert) {
    return `
       <div class="alert-card ${alert.severity} fade-in">
           <div class="alert-header">
               <div>
                   <div class="alert-title">Alert Subject</div>
                   <h3 class="alert-value">${alert.subject}</h3>
               </div>
               <div>
                   <div class="alert-title">Device Info</div>
                   <span class="alert-value">${alert.device} (${alert.device_ip})</span>
               </div>
           </div>
           
           <div class="alert-content">
               <div class="alert-item">
                   <div class="alert-title">Description</div>
                   <p class="alert-value">${alert.content}</p>
               </div>
               
               <div class="alert-item">
                   <div class="alert-title">Severity Level</div>
                   <div class="alert-value alert-severity ${alert.severity}">
                       ${alert.severity.toUpperCase()}
                   </div>
               </div>

               <div class="alert-item">
                   <div class="alert-title">Time Reported</div>
                   <div class="alert-value">${formatTimestamp(alert.timestamp)}</div>
               </div>
           </div>

           ${state.currentView === 'resolved' ? `
               <div class="resolution-info">
                   <div class="alert-title">Resolution Details</div>
                   <div class="alert-value">${alert.resolution_comment}</div>
                   <div class="alert-title">Resolved At</div>
                   <div class="alert-value">${formatTimestamp(alert.resolved_at)}</div>
               </div>
           ` : `
               <div class="resolution-section">
                   <div class="alert-title">Resolution Comment</div>
                   <textarea class="comment-input" placeholder="Add resolution comment..." data-alert-id="${alert.id}"></textarea>
                   <button class="resolve-btn" onclick="handleResolveAlert(${alert.id})">
                       <span>Resolve Alert</span>
                   </button>
               </div>
           `}
       </div>
   `;
}
async function handleResolveAlert(alertId, event) {
    if (event) event.preventDefault();

    const commentEl = document.querySelector(`textarea[data-alert-id="${alertId}"]`);
    const comment = commentEl.value.trim();

    if (!comment) {
        alert('Please add a resolution comment');
        return;
    }

    const alertCard = commentEl.closest('.alert-card');
    await api.resolveAlert(alertId, comment);

    alertCard.remove();
    updateStats();
    updateDeviceChart();
}
async function updateStats() {
    const stats = await api.fetchStats(
        state.currentView === 'resolved',
        state.currentDevice
    );

    document.getElementById('totalAlerts').textContent = stats.total;
    document.getElementById('errorAlerts').textContent = stats.error;
    document.getElementById('warningAlerts').textContent = stats.warning;
}

async function updateDashboard() {
    const alerts = await api.fetchAlerts(
        state.currentView === 'resolved',
        state.currentDevice
    );

    await updateStats();
    updateDeviceChart(alerts);

    const activeContainer = document.getElementById('activeAlertsContainer');
    const resolvedContainer = document.getElementById('resolvedAlertsContainer');

    activeContainer.style.display = state.currentView === 'active' ? 'block' : 'none';
    resolvedContainer.style.display = state.currentView === 'resolved' ? 'block' : 'none';

    const container = state.currentView === 'active' ? activeContainer : resolvedContainer;
    container.innerHTML = alerts.map(alert => createAlertCard(alert)).join('');
}

async function initializeDeviceFilter() {
    const devices = await api.fetchDevices();
    const select = document.getElementById('deviceFilter');

    devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.id;
        option.textContent = device.name;
        select.appendChild(option);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await initializeDeviceFilter();

    document.getElementById('deviceFilter').addEventListener('change', (e) => {
        state.currentDevice = e.target.value;
        updateDashboard();
    });

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentView = btn.dataset.tab;
        updateDashboard();
    });
});

    updateDashboard();
});

