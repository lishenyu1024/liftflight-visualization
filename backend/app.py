from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import pandas as pd
from config import config
from utils.heatmap import generate_city_demand_heatmap, map_to_html


app = Flask(__name__)

# Load configuration
env = os.environ.get('FLASK_ENV', 'development')
app.config.from_object(config[env])

# Enable CORS for cross-origin requests from frontend
CORS(app)

@app.route('/api/heatmap',methods=['GET'])
def get_heatmap():
    """Get heatmap visualization"""
    df = pd.read_csv(os.path.join(os.path.dirname(__file__), 'data', 'data.csv'), encoding='latin1')
    map_obj = generate_city_demand_heatmap(df)
    html_map = map_to_html(map_obj)

    return html_map

@app.route('/')
def index():
    """健康检查端点"""
    return jsonify({
        'status': 'success',
        'message': 'LifeFlight API is running',
        'version': '1.0.0'
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'LifeFlight Backend API'
    })

@app.route('/api/test', methods=['GET'])
def test():
    """Test endpoint"""
    return jsonify({
        'message': 'Backend is working correctly',
        'data': {
            'timestamp': '2024-01-01T00:00:00Z',
            'test': True
        }
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])

