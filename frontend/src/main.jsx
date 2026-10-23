import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App.jsx';
import { FleetProvider } from './context/FleetContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter><FleetProvider><App /></FleetProvider></BrowserRouter>
);
