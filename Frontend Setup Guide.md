# Frontend Setup Guide

This guide will help you set up and run the LifeFlight dashboard frontend application.

## Prerequisites

### Node.js Version
- **Required**: Node.js 14.0 or higher
- **Recommended**: Node.js 16.0 or higher
- **Tested with**: Node.js 18.x and higher

To check your Node.js version:
```bash
node --version
```

To check your npm version:
```bash
npm --version
```

If you don't have Node.js installed:
- **macOS/Linux**: Install from [nodejs.org](https://nodejs.org/) or use [nvm](https://github.com/nvm-sh/nvm)
- **Windows**: Download from [nodejs.org](https://nodejs.org/)

### Install Node.js using nvm (Recommended for macOS/Linux)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js LTS version
nvm install --lts
nvm use --lts
```

## Installation Steps

### 1. Navigate to Frontend Directory
```bash
cd lifeflight-dashboard
```

### 2. Install Dependencies
Install all required npm packages:
```bash
npm install
```

This will:
- Read `package.json` to determine required packages
- Download and install all dependencies to `node_modules/`
- Create or update `package-lock.json`

**Note**: This may take a few minutes depending on your internet connection.

### 3. Verify Installation
Check that all packages are installed:
```bash
npm list --depth=0
```

You should see all dependencies listed, including:
- react
- react-dom
- @mui/material
- react-router-dom
- chart.js
- and others

## Running the Application

### 1. Start the Development Server
```bash
npm start
```

This will:
- Start the React development server
- Open your browser automatically to `http://localhost:3000`
- Enable hot-reloading (changes will refresh automatically)

### 2. Access the Application
Open your browser and navigate to:
```
http://localhost:3000
```

The application will automatically reload if you make changes to the code.

### 3. Stop the Server
Press `Ctrl + C` in the terminal to stop the development server.

## Configuration

### Backend API URL
The frontend is configured to connect to the backend API at:
```
http://localhost:5001
```

If your backend is running on a different port, you'll need to update the API URLs in the following files:
- `src/scenes/dashboard/index.jsx` (line 25)
- `src/components/LineChart.jsx` (line 13)
- `src/components/HistogramChart.jsx` (line 42)
- `src/components/HeatMap.jsx` (line 4)

### Port Configuration
By default, the frontend runs on port 3000. If port 3000 is in use, React will automatically use the next available port (3001, 3002, etc.).

To specify a different port:
```bash
PORT=3001 npm start
```

Or create a `.env` file in the `lifeflight-dashboard` directory:
```env
PORT=3001
```

## Project Structure

```
lifeflight-dashboard/
├── public/                 # Static files
│   ├── index.html         # HTML template
│   └── assets/            # Images and static assets
├── src/
│   ├── components/        # Reusable React components
│   │   ├── BarChart.jsx
│   │   ├── LineChart.jsx
│   │   ├── GeographyChart.jsx
│   │   ├── HeatMap.jsx
│   │   └── ...
│   ├── scenes/            # Page components
│   │   ├── dashboard/     # Dashboard page
│   │   ├── bar/           # Bar chart page
│   │   ├── line/          # Line chart page
│   │   ├── geography/     # Geography chart page
│   │   └── ...
│   ├── data/              # Mock data files
│   ├── App.js             # Main App component
│   ├── index.js           # Entry point
│   └── theme.js           # Theme configuration
├── package.json           # Dependencies and scripts
└── package-lock.json      # Locked dependency versions
```

## Available Scripts

### `npm start`
Runs the app in development mode.
- Opens [http://localhost:3000](http://localhost:3000)
- Page reloads when you make edits
- Shows lint errors in the console

### `npm test`
Launches the test runner in interactive watch mode.

### `npm run build`
Builds the app for production to the `build` folder.
- Optimizes the build for best performance
- Minifies files
- Ready for deployment

### `npm run eject`
**Note: This is a one-way operation. Once you `eject`, you can't go back!**

Ejects from Create React App, giving you full control over the configuration.

## Troubleshooting

### Port Already in Use
If port 3000 is already in use:
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or use a different port
PORT=3001 npm start
```

### npm install Fails
If `npm install` fails:

**Clear npm cache:**
```bash
npm cache clean --force
```

**Delete node_modules and reinstall:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Check Node.js version:**
```bash
node --version
# Should be 14.0 or higher
```

### Module Not Found Errors
If you see "Module not found" errors:
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

### Backend Connection Errors
If the frontend can't connect to the backend:

1. **Verify backend is running:**
   ```bash
   curl http://localhost:5001/api/test
   ```

2. **Check backend port:**
   - Default backend port is 5001
   - Make sure backend is running on the correct port

3. **Check CORS settings:**
   - Backend should have CORS enabled (already configured in `backend/app.py`)

4. **Update API URLs:**
   - If backend runs on a different port, update API URLs in frontend code

### Build Errors
If you encounter build errors:
```bash
# Clear build cache
rm -rf node_modules/.cache
rm -rf build

# Reinstall dependencies
npm install

# Try building again
npm run build
```

### React Scripts Issues
If `react-scripts` has issues:
```bash
# Reinstall react-scripts
npm install react-scripts@5.0.1 --save
```

## Development Tips

### Hot Reloading
The development server supports hot reloading. When you save a file, the browser will automatically refresh with your changes.

### Browser Developer Tools
- Open browser DevTools (F12 or Cmd+Option+I)
- Check the Console tab for errors
- Check the Network tab to see API requests

### Environment Variables
Create a `.env` file in the `lifeflight-dashboard` directory for environment-specific variables:
```env
REACT_APP_API_URL=http://localhost:5001
PORT=3000
```

Note: Environment variables must start with `REACT_APP_` to be accessible in the app.

## Production Build

### Build for Production
```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

### Serve Production Build Locally
```bash
# Install serve globally
npm install -g serve

# Serve the build
serve -s build
```

### Deploy
The `build` folder contains the production-ready files that can be deployed to any static hosting service:
- Netlify
- Vercel
- AWS S3
- GitHub Pages
- etc.

## Dependencies

### Key Dependencies
- **React** (^18.2.0) - UI library
- **Material-UI** (@mui/material) - Component library
- **React Router** (^6.3.0) - Routing
- **Chart.js** (^3.9.1) - Charting library
- **Nivo** - Data visualization library
- **Formik** (^2.2.9) - Form handling

See `package.json` for the complete list of dependencies.

## API Integration

The frontend communicates with the backend API at `http://localhost:5001`. The following endpoints are used:

- `GET /api/indicators` - Dashboard indicators
- `GET /api/veh_count` - Vehicle count statistics
- `GET /api/hourly_departure` - Hourly departure data
- `GET /api/heatmap` - Heatmap visualization

## Next Steps

1. **Start the backend server** (see backend README)
2. **Start the frontend server** (`npm start`)
3. **Open your browser** to `http://localhost:3000`
4. **Begin development!**

## Support

If you encounter any issues:
1. Check that Node.js version is 14.0 or higher
2. Verify all dependencies are installed: `npm list`
3. Ensure backend server is running on port 5001
4. Check browser console for errors
5. Verify API endpoints are correct

## License

[tbh]

