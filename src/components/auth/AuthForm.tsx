import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, UserPlus, Mail, Lock, User } from 'lucide-react';

interface AuthFormProps {
  mode: 'signin' | 'signup';
  onToggle: () => void;
}

export function AuthForm({ mode, onToggle }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Normalizar entradas para evitar espacios accidentales
      const emailClean = email.trim();
      const passwordClean = password.trim();
      const fullNameClean = fullName.trim();

      if (mode === 'signin') {
        const result = await signIn(emailClean, passwordClean);
        if (result.error) {
          setError(result.error.message || 'Error de autenticación');
        }
      } else {
        const result = await signUp(emailClean, passwordClean, fullNameClean);
        if (result.error) {
          setError(result.error.message || 'Error al crear usuario');
        } else {
          // Cambiar a modo signin después de registro exitoso
          onToggle();
          setError('');
          setEmail('');
          setPassword('');
          setFullName('');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ha ocurrido un error');
    } finally {
      setLoading(false);
    }
  };

  const isSignIn = mode === 'signin';

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            {isSignIn ? (
              <LogIn className="w-6 h-6 text-blue-600" />
            ) : (
              <UserPlus className="w-6 h-6 text-blue-600" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isSignIn ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <p className="text-gray-600">
            {isSignIn 
              ? 'Ingresa a tu cuenta para continuar' 
              : 'Crea una cuenta para comenzar'
            }
          </p>
        </div>

        {/* Mostrar credenciales de prueba para login */}
        {isSignIn && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Usuarios de prueba:</h3>
            <div className="text-xs text-blue-700 space-y-1">
              <div><strong>Admin:</strong> admin@wms.com / Admin123!</div>
              <div><strong>Manager:</strong> manager@wms.com / Manager123!</div>
              <div><strong>Operador:</strong> operator@wms.com / Operator123!</div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isSignIn && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            loading={loading}
          >
            {isSignIn ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </Button>
        </form>

        <div className="text-center">
          <button
            onClick={onToggle}
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            {isSignIn 
              ? '¿No tienes cuenta? Crear una' 
              : '¿Ya tienes cuenta? Iniciar sesión'
            }
          </button>
        </div>
      </div>
    </div>
  );
}