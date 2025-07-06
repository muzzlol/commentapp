import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/LoginForm';
import { SignupForm } from '@/components/SignupForm';

// User Profile Component (for authenticated header)
function UserProfile() {
  const { user, logout } = useAuth();
  
  if (!user) return null;

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-3">
        <span className="text-white text-xl font-semibold">
          {user.email.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-gray-900">
          {user.email.split('@')[0]}
        </h1>
        <p className="text-sm text-gray-600">{user.email}</p>
      </div>
      <Button onClick={logout} variant="outline" size="sm" className="mt-4">
        Logout
      </Button>
    </div>
  );
}

// Auth Modal Component
function AuthModal({ 
  isOpen, 
  onClose, 
  mode, 
  onSwitchMode 
}: {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
  onSwitchMode: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
        
        {mode === 'login' ? (
          <LoginForm
            onSwitchToSignup={onSwitchMode}
            onSuccess={onClose}
          />
        ) : (
          <SignupForm
            onSwitchToLogin={onSwitchMode}
            onSuccess={onClose}
          />
        )}
      </div>
    </div>
  );
}

// Header Component
function Header() {
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const switchAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'signup' : 'login');
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {isAuthenticated ? (
            <UserProfile />
          ) : (
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold text-gray-900">Comments App</h1>
              <div className="space-x-2">
                <Button onClick={() => openAuth('login')} variant="outline" size="sm">
                  Login
                </Button>
                <Button onClick={() => openAuth('signup')} size="sm">
                  Sign Up
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onSwitchMode={switchAuthMode}
      />
    </>
  );
}

// Main Content Component
function MainContent() {
  const { isAuthenticated } = useAuth();

  const PlaceholderBox = ({ children }: { children: React.ReactNode }) => (
    <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-500">
      {children}
    </div>
  );

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Discussion</h2>
        
        {isAuthenticated ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              Welcome! You can now participate in discussions by posting comments and replies.
            </p>
            <PlaceholderBox>
              <p>Comments section</p>
            </PlaceholderBox>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Browse comments and discussions below. Join the conversation by logging in or signing up!
            </p>
            <PlaceholderBox>
              <p>Comments section (read-only for guests)</p>
            </PlaceholderBox>
          </div>
        )}
      </div>
    </main>
  );
}

// Loading Component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Main App Content
function AppContent() {
  const { isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <MainContent />
    </div>
  );
}

// Root App Component
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App