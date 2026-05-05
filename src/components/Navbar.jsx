// Librerías externas
//Porbando git
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Configuración de Supabase
import { supabase } from '../config/supabaseClient';

// Contexto de perfil
import { useProfile } from '../context/ProfileContext';

/**
 * Navbar — Barra de navegación principal de la aplicación.
 * - Con sesión activa: muestra saludo, avatar y botón de cierre de sesión.
 * - Sin sesión: muestra botones de Login y Registro.
 * - Si isProfileComplete es false (perfil obligatorio pendiente): reemplaza los
 *   links de navegación con un banner que indica que debe completar el perfil.
 * El nombre mostrado en el saludo prioriza nombre_completo de la tabla `perfiles`.
 */
const Navbar = () => {
    const navigate = useNavigate();
    const { isProfileComplete } = useProfile();

    // --- ESTADOS ---
    const [user, setUser] = useState(null);
    const [displayName, setDisplayName] = useState('');

    // --- HELPER: obtener nombre del perfil ---
    const fetchDisplayName = async (userId) => {
        const { data } = await supabase
            .from('perfiles')
            .select('nombre_completo')
            .eq('id', userId)
            .maybeSingle();
        setDisplayName(data?.nombre_completo ?? '');
    };

    // --- EFECTOS ---
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            const u = session?.user ?? null;
            setUser(u);
            if (u) fetchDisplayName(u.id);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const u = session?.user ?? null;
            setUser(u);
            if (u) {
                fetchDisplayName(u.id);
            } else {
                setDisplayName('');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Re-fetch del nombre cada vez que el perfil se marque como completo
    // (permite actualizar el saludo justo después de guardar el perfil)
    useEffect(() => {
        if (isProfileComplete && user) {
            fetchDisplayName(user.id);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isProfileComplete]);

    // --- HANDLERS ---
    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    // --- HELPERS ---
    /**
     * Devuelve el nombre a mostrar en el saludo.
     * Prioridad: perfil → metadata OAuth → email local.
     */
    const getDisplayName = (user) => {
        if (displayName) return displayName;
        return (
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            'Estudiante'
        );
    };

    // isProfileComplete === false significa que el usuario NO tiene perfil guardado
    // (null = aún desconocido, no bloqueamos en ese caso)
    const perfilBloqueado = isProfileComplete === false;

    // --- RENDERIZADO ---
    return (
        <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

                {/* Logo */}
                <div className="flex items-center">
                    <Link to={perfilBloqueado ? '/profile' : '/'} className="flex-shrink-0">
                        <img
                            src="/assets/logo_full_black.svg"
                            alt="COLAB-ITO"
                            className="h-10"
                        />
                    </Link>
                </div>

                {/* Links de navegación (escritorio) — bloqueados si perfil incompleto */}
                <div className="hidden md:flex md:items-center md:space-x-8">
                    {perfilBloqueado ? (
                        /* Banner de bloqueo */
                        <span className="text-sm font-medium text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                            Completa tu perfil para continuar
                        </span>
                    ) : (
                        <>
                            <Link to="/proyectos" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
                                Proyectos
                            </Link>
                            <Link to="/materials" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
                                Material
                            </Link>
                        </>
                    )}
                </div>

                {/* Sección derecha */}
                <div className="hidden md:flex md:items-center gap-4">
                    {user ? (
                        <>
                            {/* Avatar + saludo → enlaza a perfil (siempre activo) */}
                            <Link to="/profile" className="flex items-center gap-2 group">
                                {user.user_metadata?.avatar_url ? (
                                    <img
                                        src={user.user_metadata.avatar_url}
                                        alt="Avatar"
                                        className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-200 group-hover:ring-black transition-all"
                                    />
                                ) : (
                                    <div className="h-9 w-9 rounded-full bg-gray-200 group-hover:bg-gray-300 flex items-center justify-center transition-colors">
                                        <svg className="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    </div>
                                )}
                                <span className="text-sm font-medium text-gray-700 group-hover:text-black transition-colors">
                                    Hola, {getDisplayName(user)}
                                </span>
                            </Link>

                            {/* Cerrar sesión — siempre disponible */}
                            <button
                                onClick={handleLogout}
                                className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
                            >
                                Cerrar sesión
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
                            >
                                Iniciar Sesión
                            </Link>
                            <Link
                                to="/login?mode=register"
                                className="bg-black text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                            >
                                Registrarse
                            </Link>
                        </>
                    )}
                </div>

                {/* Menú hamburguesa (móvil) */}
                <div className="flex md:hidden">
                    <button type="button" className="text-gray-700 hover:text-black">
                        <span className="sr-only">Open main menu</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>
                </div>

            </div>
        </nav>
    );
};

export default Navbar;
