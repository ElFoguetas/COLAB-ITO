// Librerías externas
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

// Configuración de Supabase
import { supabase } from '../config/supabaseClient';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonPerfil = () => (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8 animate-pulse">
        <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex items-center gap-5 mb-8">
                <div className="h-16 w-16 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="space-y-2">
                    <div className="h-5 w-40 bg-gray-200 rounded-md" />
                    <div className="h-3 w-28 bg-gray-100 rounded-md" />
                </div>
            </div>
            <div className="space-y-3">
                <div className="h-3 w-full bg-gray-100 rounded-md" />
                <div className="h-3 w-5/6 bg-gray-100 rounded-md" />
                <div className="h-3 w-4/6 bg-gray-100 rounded-md" />
            </div>
        </div>
    </div>
);

// ─── PublicProfilePage ────────────────────────────────────────────────────────
/**
 * PublicProfilePage — Perfil público de un usuario navegable desde la gestión
 * de participantes del proyecto.
 *
 * Ruta: /perfil/:userId
 * Acceso: cualquier usuario autenticado.
 */
const PublicProfilePage = () => {
    const { userId } = useParams();
    const navigate   = useNavigate();

    const [perfil, setPerfil]   = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);

    useEffect(() => {
        if (!userId) {
            navigate('/proyectos', { replace: true });
            return;
        }

        const cargarPerfil = async () => {
            setLoading(true);
            setError(null);

            // Verificar sesión (la vista requiere estar autenticado)
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                navigate('/login', { replace: true });
                return;
            }

            try {
                console.log('[PublicProfilePage] Consultando perfil para userId:', userId);
                console.log('[PublicProfilePage] Usuario autenticado (session.user.id):', session.user.id);

                const { data, error: sbError } = await supabase
                    .from('perfiles')
                    .select('id, nombre_completo, institucion, bio')
                    .eq('id', userId)
                    .maybeSingle();

                console.log('[PublicProfilePage] Resultado Supabase → data:', data, '| error:', sbError);

                if (sbError) throw sbError;

                if (!data) {
                    // data = null sin error suele indicar que RLS bloqueó la lectura
                    // o que el perfil genuinamente no existe.
                    console.warn(
                        '[PublicProfilePage] data es null. Causa probable: ' +
                        'la policy RLS de SELECT en "perfiles" no permite leer perfiles ajenos. ' +
                        'Aplica la policy "perfiles_select_autenticados" desde el SQL Editor de Supabase.'
                    );
                    setError('not_found');
                } else {
                    setPerfil(data);
                }
            } catch (err) {
                console.error('[PublicProfilePage] Error al cargar perfil:', err);
                setError('error');
            } finally {
                setLoading(false);
            }
        };

        cargarPerfil();
    }, [userId, navigate]);

    if (loading) return <SkeletonPerfil />;

    if (error === 'not_found') {
        return (
            <div className="max-w-2xl mx-auto px-4 py-20 sm:px-6 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mx-auto">
                    <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Perfil no encontrado</h1>
                <p className="text-sm text-gray-500 mb-8">
                    Este usuario no existe o aún no ha completado su perfil.
                </p>
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                >
                    ← Volver
                </button>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-20 sm:px-6 text-center">
                <h1 className="text-xl font-bold text-gray-900 mb-2">Ocurrió un error</h1>
                <p className="text-sm text-gray-500 mb-8">No se pudo cargar el perfil. Intenta de nuevo.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-500 transition-colors"
                >
                    Volver
                </button>
            </div>
        );
    }

    // ─── Renderizado del perfil ────────────────────────────────────────────────
    const inicial = (perfil.nombre_completo || '?').charAt(0).toUpperCase();

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8">

                {/* Breadcrumb */}
                <nav className="mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-sm text-gray-500 hover:text-gray-900 transition-colors inline-flex items-center gap-1.5"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        Volver
                    </button>
                </nav>

                {/* Tarjeta de perfil */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-8">

                        {/* Avatar + nombre */}
                        <div className="flex items-center gap-5 mb-8 pb-6 border-b border-gray-100">
                            <div className="h-16 w-16 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                                <span className="text-xl font-bold text-white">{inicial}</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">
                                    {perfil.nombre_completo || 'Sin nombre'}
                                </h1>
                                {perfil.institucion && (
                                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                                        </svg>
                                        {perfil.institucion}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Bio */}
                        {perfil.bio ? (
                            <div>
                                <h2 className="text-sm font-semibold text-gray-700 mb-2">Acerca de</h2>
                                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                                    {perfil.bio}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic">Este usuario no ha añadido una bio.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicProfilePage;
