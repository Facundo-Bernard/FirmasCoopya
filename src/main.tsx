import ReactDOM from 'react-dom/client'; 
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import store from './REDUX/store';
import { Provider } from 'react-redux';


const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Root element not found');
}

// cambiamos la forma para react 18
const root = ReactDOM.createRoot(rootElement);
root.render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
);
