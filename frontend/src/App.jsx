import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigate, useLocation } from 'react-router-dom';
import { Header, OnlineStatus } from './components/common';
import { Home, FarmerOnboarding, SubmissionStatus, OfflineQueue, AdminDashboard, WebBridge, Login, OfficerDashboard, OfficerLogin } from './pages';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('smart_e_peek_token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const OfficerRoute = ({ children }) => {
  const token = localStorage.getItem('smart_e_peek_token');
  const officer = localStorage.getItem('smart_e_peek_officer');
  const location = useLocation();

  if (!token || !officer) {
    return <Navigate to="/officer/login" state={{ from: location }} replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-primary-100">
        <Header />

        <main className="flex-1 flex flex-col relative w-full h-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <FarmerOnboarding />
              </ProtectedRoute>
            } />
            <Route path="/submission/:id" element={<SubmissionStatus />} />
            <Route path="/submit" element={<WebBridge />} />
            <Route path="/offline" element={<OfflineQueue />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/officer/login" element={<OfficerLogin />} />
            <Route path="/officer" element={
              <OfficerRoute>
                <OfficerDashboard />
              </OfficerRoute>
            } />
            <Route path="*" element={<div className="p-8 text-center text-gray-500">Page not found</div>} />
          </Routes>
        </main>

        <OnlineStatus />
      </div>
    </BrowserRouter>
  );
}

export default App;
