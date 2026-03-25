import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log('App mounting to #root...');
const container = document.getElementById('root');
if (!container) {
  console.error('Root container not found!');
} else {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log('App mounted.');
}
