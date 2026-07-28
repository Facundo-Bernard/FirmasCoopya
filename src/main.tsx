import ReactDOM from 'react-dom/client'; 
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Root element not found');
}

// cambiamos la forma para react 18
const root = ReactDOM.createRoot(rootElement);
root.render(
    <App />
);
