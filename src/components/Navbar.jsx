// Librerías externas
//Porbando git
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

// Configuración de Supabase
import { supabase } from '../config/supabaseClient';

// Contexto de perfil
import { useProfile } from '../context/ProfileContext';

// Notificaciones
import { contarNoLeidas } from '../lib/notificaciones';
import NotificationsPanel from './NotificationsPanel';

/**
 * Navbar — Barra de navegación principal de la aplicación.
 * - Con sesión activa: muestra saludo, avatar, campana y logout.
 * - Sin sesión: muestra botones de Login y Registro.
 * - Menú hamburguesa funcional en móvil con cierre automático al navegar.
 */
const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isProfileComplete } = useProfile();

    // --- ESTADOS ---
    const [user, setUser]               = useState(null);
    const [displayName, setDisplayName] = useState('');

    // --- NOTIFICACIONES ---
    const [noLeidas, setNoLeidas]                   = useState(0);
    const [panelNotifAbierto, setPanelNotifAbierto] = useState(false);
    const notifRef = useRef(null);

    // --- MENÚ MÓVIL ---
    const [mobileMenuAbierto, setMobileMenuAbierto] = useState(false);

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const fetchDisplayName = async (userId) => {
        const { data } = await supabase
            .from('perfiles')
            .select('nombre_completo')
            .eq('id', userId)
            .maybeSingle();
        setDisplayName(data?.nombre_completo ?? '');
    };

    const refreshNoLeidas = async (userId) => {
        const { count } = await contarNoLeidas(userId);
        setNoLeidas(count);
    };

    // ─── Efectos ──────────────────────────────────────────────────────────────

    // Sesión + nombre + contador de notificaciones
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            const u = session?.user ?? null;
            setUser(u);
            if (u) {
                fetchDisplayName(u.id);
                refreshNoLeidas(u.id);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const u = session?.user ?? null;
            setUser(u);
            if (u) {
                fetchDisplayName(u.id);
                refreshNoLeidas(u.id);
            } else {
                setDisplayName('');
                setNoLeidas(0);
                setPanelNotifAbierto(false);
                setMobileMenuAbierto(false); // cerrar menú si la sesión cambia
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Re-fetch del nombre cuando el perfil se completa
    useEffect(() => {
        if (isProfileComplete && user) fetchDisplayName(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isProfileComplete]);

    // Cerrar panel de notificaciones al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setPanelNotifAbierto(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cerrar menú móvil automáticamente al cambiar de ruta
    useEffect(() => {
        setMobileMenuAbierto(false);
    }, [location.pathname]);

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleLogout = async () => {
        setMobileMenuAbierto(false);
        await supabase.auth.signOut();
        navigate('/');
    };

    const getDisplayName = (u) => {
        if (displayName) return displayName;
        return (
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.email?.split('@')[0] ||
            'Estudiante'
        );
    };

    const perfilBloqueado = isProfileComplete === false;

    // ─── RENDERIZADO ──────────────────────────────────────────────────────────
    return (
        <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur-md">

            {/* ── Barra principal ── */}
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

                {/* Logo */}
                <div className="flex items-center">
                    <Link
                        to={perfilBloqueado ? '/profile' : '/'}
                        className="flex-shrink-0"
                        onClick={() => setMobileMenuAbierto(false)}
                    >
                        <img src="/assets/logo_full_black.svg" alt="COLAB-ITO" className="h-10" />
                    </Link>
                </div>

                {/* Links de navegación — solo escritorio */}
                <div className="hidden md:flex md:items-center md:space-x-8">
                    {perfilBloqueado ? (
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

                {/* Sección derecha — escritorio */}
                <div className="hidden md:flex md:items-center gap-4">
                    {user ? (
                        <>
                            {/* Avatar + saludo */}
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

                            {/* Campana de notificaciones */}
                            <div ref={notifRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setPanelNotifAbierto((v) => !v)}
                                    aria-label="Notificaciones"
                                    className="relative p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                                    </svg>
                                    {noLeidas > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                                            {noLeidas > 9 ? '9+' : noLeidas}
                                        </span>
                                    )}
                                </button>
                                {panelNotifAbierto && (
                                    <NotificationsPanel
                                        userId={user.id}
                                        onNoLeidasChange={(count) => setNoLeidas(count)}
                                        onClose={() => setPanelNotifAbierto(false)}
                                    />
                                )}
                            </div>

                            {/* Cerrar sesión */}
                            <button
                                onClick={handleLogout}
                                className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
                            >
                                Cerrar sesión
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
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

                {/* Botón hamburguesa — solo móvil */}
                <div className="flex md:hidden items-center gap-2">
                    {/* Badge de notificaciones en móvil (cuando hay sesión) */}
                    {user && noLeidas > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                            {noLeidas > 9 ? '9+' : noLeidas}
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={() => setMobileMenuAbierto((v) => !v)}
                        aria-label={mobileMenuAbierto ? 'Cerrar menú' : 'Abrir menú'}
                        aria-expanded={mobileMenuAbierto}
                        className="p-2 rounded-lg text-gray-700 hover:text-black hover:bg-gray-100 transition-colors"
                    >
                        {mobileMenuAbierto ? (
                            /* Ícono X */
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            /* Ícono hamburguesa */
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Panel del menú móvil ── */}
            {mobileMenuAbierto && (
                <>
                    {/* Backdrop semitransparente — cerrar al tocar fuera */}
                    <div
                        className="fixed inset-0 top-16 z-40 bg-black/20"
                        onClick={() => setMobileMenuAbierto(false)}
                        aria-hidden="true"
                    />

                    {/* Panel del menú */}
                    <div className="relative z-50 border-t border-gray-100 bg-white shadow-lg md:hidden">
                        <div className="mx-auto max-w-7xl px-4 py-4 space-y-1">

                            {/* ── Si el perfil está bloqueado, mostrar aviso ── */}
                            {perfilBloqueado && (
                                <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                                    <p className="text-xs font-medium text-amber-700">
                                        Completa tu perfil para acceder a todas las secciones.
                                    </p>
                                </div>
                            )}

                            {/* ── Navegación general (siempre visible) ── */}
                            <Link
                                to="/"
                                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                            >
                                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                                </svg>
                                Inicio
                            </Link>

                            {!perfilBloqueado && (
                                <>
                                    <Link
                                        to="/proyectos"
                                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                                    >
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                        </svg>
                                        Proyectos
                                    </Link>

                                    <Link
                                        to="/materials"
                                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                                    >
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                        </svg>
                                        Material
                                    </Link>
                                </>
                            )}

                            {/* ── Sección autenticada ── */}
                            {user ? (
                                <>
                                    <div className="border-t border-gray-100 my-2" />

                                    {/* Cabecera de usuario */}
                                    <div className="flex items-center gap-3 px-3 py-2">
                                        {user.user_metadata?.avatar_url ? (
                                            <img
                                                src={user.user_metadata.avatar_url}
                                                alt="Avatar"
                                                className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-200"
                                            />
                                        ) : (
                                            <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                                <svg className="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {getDisplayName(user)}
                                            </p>
                                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                        </div>
                                    </div>

                                    {/* Perfil */}
                                    <Link
                                        to="/profile"
                                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                                    >
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                        </svg>
                                        Mi perfil
                                    </Link>

                                    {/* Notificaciones — badge inline */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMobileMenuAbierto(false);
                                            // Las notificaciones viven en el panel del Navbar desktop;
                                            // en móvil navega al catálogo de proyectos como fallback útil.
                                            navigate('/proyectos');
                                        }}
                                        className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                                    >
                                        <div className="relative">
                                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                                            </svg>
                                            {noLeidas > 0 && (
                                                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                                                    {noLeidas > 9 ? '9+' : noLeidas}
                                                </span>
                                            )}
                                        </div>
                                        Notificaciones
                                        {noLeidas > 0 && (
                                            <span className="ml-auto text-xs font-semibold text-red-600">
                                                {noLeidas} nueva{noLeidas !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </button>

                                    <div className="border-t border-gray-100 my-2" />

                                    {/* Cerrar sesión */}
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                                        </svg>
                                        Cerrar sesión
                                    </button>
                                </>
                            ) : (
                                <>
                                    {/* ── Sin sesión ── */}
                                    <div className="border-t border-gray-100 my-2" />

                                    <Link
                                        to="/login"
                                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                                    >
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                        </svg>
                                        Iniciar sesión
                                    </Link>

                                    <Link
                                        to="/login?mode=register"
                                        className="flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors mt-2"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                                        </svg>
                                        Crear cuenta
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </nav>
    );
};

export default Navbar;
