// Librerías externas
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

// Configuración de Supabase
import { supabase } from '../config/supabaseClient';

// Dominios institucionales permitidos para el registro con email
const DOMINIOS_PERMITIDOS = ['@itocotlan.com', '@ocotlan.tecnm.mx'];

/**
 * Comprueba si el email pertenece a uno de los dominios institucionales.
 * @param {string} email
 * @returns {boolean}
 */
const esCorreoInstitucional = (email) => {
    const lower = (email || '').toLowerCase();
    return DOMINIOS_PERMITIDOS.some((dominio) => lower.endsWith(dominio));
};

/**
 * AuthPage — Página de autenticación de la aplicación.
 * Alterna entre modo "Iniciar Sesión" y "Registro".
 * El flujo de Google OAuth es manejado globalmente por GlobalAuthHandler en App.jsx;
 * aquí solo iniciamos el redirect y mostramos mensajes de error si volvemos con state.
 */
const AuthPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    // --- ESTADOS ---
    const [isLogin, setIsLogin] = useState(true);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // --- EFECTO: Leer query param al montar ---
    useEffect(() => {
        const mode = searchParams.get('mode');
        setIsLogin(mode !== 'register');
        setFullName('');
        setEmail('');
        setPassword('');
        setError('');
    }, [searchParams]);

    // --- EFECTO: Mostrar error de dominio de Google si GlobalAuthHandler lo envió ---
    useEffect(() => {
        if (location.state?.googleDomainError) {
            const emailRechazado = location.state.googleDomainEmail || '';
            setError(
                `El correo ${emailRechazado ? `"${emailRechazado}" ` : ''}no pertenece a un dominio institucional. ` +
                'Solo se permiten correos @itocotlan.com o @ocotlan.tecnm.mx para acceder a COLAB-ITO.'
            );
            // Limpiar el state de la URL para que el error no persista en recarga
            window.history.replaceState({}, '');
        }
    }, [location.state]);

    // --- HANDLERS ---

    /**
     * Maneja el envío del formulario de email/contraseña.
     * En registro valida el dominio institucional antes de llamar a Supabase.
     */
    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isLogin) {
                // --- LOGIN ---
                const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
                if (authError) { setError(authError.message); return; }
                navigate('/', { replace: true });

            } else {
                // --- REGISTRO ---

                // 1. Validar dominio institucional
                if (!esCorreoInstitucional(email)) {
                    setError(
                        'Debes usar tu correo institucional @itocotlan.com o @ocotlan.tecnm.mx para registrarte.'
                    );
                    return;
                }

                // 2. Registrar en Supabase
                const { error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName } },
                });

                if (authError) { setError(authError.message); return; }

                // 3. Llevar al perfil obligatorio
                navigate('/profile', {
                    replace: true,
                    state: {
                        fromSignup: true,
                        initialNombre: fullName,
                    },
                });
            }

        } catch (err) {
            setError('Ocurrió un error inesperado. Inténtalo de nuevo.');
            console.error('Error de autenticación:', err);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Inicia el flujo OAuth con Google.
     * La detección de dominio, perfil y redirección la maneja GlobalAuthHandler en App.jsx.
     */
    const handleGoogleLogin = async () => {
        setError('');
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
            });
            if (error) throw error;
        } catch (err) {
            console.error('Error al iniciar sesión con Google:', err.message);
            setError('Error al conectar con Google. Inténtalo de nuevo.');
        }
    };

    /**
     * Alterna entre modo Login y Registro, limpiando campos y errores.
     */
    const handleToggleMode = () => {
        setIsLogin(!isLogin);
        setFullName('');
        setEmail('');
        setPassword('');
        setError('');
    };

    // --- RENDERIZADO ---
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">

            {/* Tarjeta central del formulario */}
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 sm:p-10">

                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <img
                        src="/assets/logo_full_black.svg"
                        alt="COLAB-ITO"
                        className="h-10"
                    />
                </div>

                {/* Título dinámico según el modo */}
                <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
                    {isLogin ? 'Inicia sesión en COLAB-ITO' : 'Crea tu cuenta en COLAB-ITO'}
                </h1>
                <p className="text-sm text-gray-500 text-center mb-8">
                    {isLogin
                        ? 'Ingresa tus credenciales para continuar.'
                        : 'Únete a la comunidad estudiantil de COLAB-ITO.'}
                </p>

                {/* Formulario principal */}
                <form onSubmit={handleAuth} className="space-y-5">

                    {/* Input de Nombre Completo — solo visible en modo Registro */}
                    {!isLogin && (
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre Completo
                            </label>
                            <input
                                id="fullName"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Ej. Juan Pérez García"
                                required={!isLogin}
                                disabled={loading}
                                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                    )}

                    {/* Input de Correo */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            {isLogin ? 'Correo' : 'Correo Institucional'}
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (error && error.includes('institucional')) setError('');
                            }}
                            placeholder={isLogin ? 'tu@correo.com' : 'usuario@ocotlan.tecnm.mx'}
                            required
                            disabled={loading}
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    {/* Input de Contraseña */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Contraseña
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            required
                            disabled={loading}
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    {/* Mensaje de error */}
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                            {error}
                        </p>
                    )}

                    {/* Botón principal de acción */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-2.5 px-4 rounded-lg font-semibold text-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
                    </button>
                </form>

                {/* Separador */}
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="bg-white px-3 text-gray-400 font-medium">O continuar con</span>
                    </div>
                </div>

                {/* Botón OAuth de Google */}
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-semibold text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continuar con Google
                </button>

                {/* Toggle Login/Registro */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                    <button
                        type="button"
                        onClick={handleToggleMode}
                        disabled={loading}
                        className="font-semibold text-black hover:underline focus:outline-none disabled:opacity-50"
                    >
                        {isLogin ? 'Regístrate' : 'Inicia sesión'}
                    </button>
                </p>

            </div>
        </div>
    );
};

export default AuthPage;
