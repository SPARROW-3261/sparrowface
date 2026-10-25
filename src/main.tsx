import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Filter out benign MediaPipe / TensorFlow Lite WASM C++ INFO messages routed to console.error
if (typeof window !== 'undefined') {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    const msg = args && args[0] ? String(args[0]) : '';
    if (
      msg.includes('XNNPACK delegate') ||
      msg.includes('TensorFlow Lite') ||
      msg.startsWith('INFO:') ||
      msg.includes('INFO: Created')
    ) {
      console.info(...args);
      return;
    }
    origError.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(<App />);
