import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { DialogProvider } from './context/DialogContext';
import AppRouter from './routes/AppRouter';
import ErrorBoundary from './components/ErrorBoundary';

const App = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <DialogProvider>
            <AppRouter />
          </DialogProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
