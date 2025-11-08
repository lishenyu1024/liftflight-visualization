# Backend Setup Guide

This guide will help you set up and run the LifeFlight backend server.

## Prerequisites

### Python Version
- **Required**: Python 3.8 or higher
- **Recommended**: Python 3.10 or higher
- **Tested with**: Python 3.12.3

To check your Python version:
```bash
python3 --version
```

If you don't have Python installed, download it from [python.org](https://www.python.org/downloads/).

### System Dependencies (macOS)
On macOS, you may need to install Homebrew dependencies:
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install system dependencies (if needed)
brew install libarchive
```

## Installation Steps

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Create Virtual Environment
Create a virtual environment to isolate project dependencies:
```bash
python3 -m venv venv
```

### 3. Activate Virtual Environment

**On macOS/Linux:**
```bash
source venv/bin/activate
```

**On Windows:**
```bash
venv\Scripts\activate
```

After activation, you should see `(venv)` in your terminal prompt.

### 4. Upgrade pip and Build Tools
Update pip, setuptools, and wheel to the latest versions:
```bash
pip install --upgrade pip setuptools wheel
```

### 5. Install Dependencies
Install all required Python packages:
```bash
pip install -r requirements.txt
```

#### Troubleshooting pandas Installation

If you encounter errors installing pandas (especially on Python 3.12):

**Problem**: `libarchive.20.dylib cannot be loaded` or compilation errors

**Solution 1**: Use a compatible pandas version (already in requirements.txt)
- The `requirements.txt` uses `pandas>=2.1.0` which has pre-built wheels for Python 3.12
- If installation fails, try:
  ```bash
  pip install --upgrade pip setuptools wheel
  pip install pandas>=2.1.0
  ```

**Solution 2**: Install from pre-built wheels only
```bash
pip install --only-binary :all: pandas>=2.1.0
```

**Solution 3**: If using Python 3.8-3.11, you can use pandas 2.0.0:
```bash
pip install pandas==2.0.0
```

**Solution 4**: Install system libraries (macOS)
```bash
brew install libarchive
```

### 6. Verify Installation
Verify that all packages are installed correctly:
```bash
pip list
```

You should see:
- Flask==3.0.0
- flask-cors==4.0.0
- python-dotenv==1.0.0
- folium==0.15.0
- pandas>=2.1.0
- numpy (dependency)
- and other dependencies

Test pandas import:
```bash
python -c "import pandas as pd; print(f'pandas version: {pd.__version__}')"
```

## Running the Server

### 1. Ensure Virtual Environment is Activated
```bash
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows
```

### 2. Run the Flask Server
```bash
python app.py
```

The server will start on **port 5001** by default.

**Note**: Port 5000 is often occupied by macOS AirPlay Receiver. The backend is configured to use port 5001 to avoid conflicts.

### 3. Verify Server is Running
Open your browser and visit:
```
http://localhost:5001/api/test
```

You should see a JSON response:
```json
{
    "message": "Backend is working correctly",
    "data": {
        "test": true,
        "timestamp": "2024-01-01T00:00:00Z"
    }
}
```

## API Endpoints

The backend provides the following API endpoints:

- `GET /api/test` - Test endpoint to verify server is running
- `GET /api/indicators` - Get dashboard indicators (total missions, cities covered, response times)
- `GET /api/veh_count` - Get vehicle count statistics
- `GET /api/hourly_departure` - Get hourly departure density data
- `GET /api/heatmap` - Get heatmap visualization HTML

## Configuration

### Environment Variables

Create a `.env` file in the `backend` directory (optional):
```env
FLASK_ENV=development
FLASK_DEBUG=True
PORT=5001
SECRET_KEY=your-secret-key-here
```

### Port Configuration

By default, the server runs on port 5001. To change the port:
```bash
export PORT=5002
python app.py
```

Or modify `app.py`:
```python
port = int(os.environ.get('PORT', 5001))  # Change default port here
```

## Project Structure

```
backend/
├── app.py                 # Main Flask application
├── config.py             # Configuration settings
├── requirements.txt      # Python dependencies
├── data/
│   ├── data.csv         # Main data file (LifeFlight mission data)
│   └── city_coordinates.json  # City coordinates for heatmap
└── utils/
    ├── getData.py       # Data loading utilities
    ├── heatmap.py       # Heatmap generation
    ├── responseTime.py  # Response time calculations
    └── veh_count.py     # Vehicle count calculations
```

## Troubleshooting

### Port Already in Use
If you get "Address already in use" error:
```bash
# Find process using port 5001
lsof -ti:5001

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or use a different port
export PORT=5002
python app.py
```

### Virtual Environment Issues
If you encounter issues with the virtual environment:
```bash
# Delete and recreate virtual environment
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### pandas Import Errors
If pandas fails to import after installation:
```bash
# Reinstall pandas
pip uninstall pandas
pip install pandas>=2.1.0

# Verify installation
python -c "import pandas; print(pandas.__version__)"
```

### CORS Errors
If you see CORS errors in the browser console, ensure `flask-cors` is installed:
```bash
pip install flask-cors==4.0.0
```

## Development

### Running in Debug Mode
The server runs in debug mode by default in development. To disable:
```bash
export FLASK_DEBUG=False
python app.py
```

### Logging
Server logs will appear in the terminal where you run `python app.py`.

## Data Files

The backend requires the following data files:
- `data/data.csv` - Main LifeFlight mission data
- `data/city_coordinates.json` - City coordinates mapping

Ensure these files exist in the `backend/data/` directory before running the server.

## Next Steps

After starting the backend server:
1. Start the frontend server (see frontend README)
2. The frontend will connect to `http://localhost:5001` by default
3. Open your browser and navigate to the frontend URL (usually `http://localhost:3000`)

## Support

If you encounter any issues:
1. Check that Python version is 3.8 or higher
2. Ensure virtual environment is activated
3. Verify all dependencies are installed: `pip list`
4. Check that data files exist in `backend/data/` directory
5. Verify server is running: `curl http://localhost:5001/api/test`

## License

[Your License Here]

