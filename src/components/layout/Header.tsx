import React from 'react';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User, Menu } from 'lucide-react';

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <button className="lg:hidden p-2 rounded-md hover:bg-gray-100">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              Sistema de Gestión
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">{user?.email}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut()}
              className="flex items-center space-x-1"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}