import { Sprout, LogOut } from 'lucide-react';

export const Header = () => {
  const token = localStorage.getItem('smart_e_peek_token');

  const handleLogout = () => {
    localStorage.removeItem('smart_e_peek_token');
    window.location.href = '/login';
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary-500 p-2 rounded-lg">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 leading-tight">E-Peek Pahani</h1>
            <p className="text-xs text-gray-500 font-medium">Smart Agriculture</p>
          </div>
        </div>
        {token && (
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
};
