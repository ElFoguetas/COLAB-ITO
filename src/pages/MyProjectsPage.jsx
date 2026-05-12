// Librerías externas
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Configuración de Supabase
import { supabase } from '../config/supabaseClient';

// Componentes reutilizables
import ProjectCard from '../components/ProjectCard';

// ─── Skeleton de carga (reutiliza el mismo estilo de ProjectsPage) ────────────
const SkeletonCard = () => (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-3 animate-pulse">
        <div className="flex justify-between">
            <div className="h-3 w-20 bg-gray-200 rounded-full" />
            <div className="h-3 w-16 bg-gray-200 rounded-full" />
        </div>
        <div className="h-5 w-3/4 bg-gray-200 rounded-md" />
        <div className="space-y-2">
            <div className="h-3 w-full bg-gray-100 rounded-md" />
            <div className="h-3 w-5/6 bg-gray-100 rounded-md" />
        </div>
        <div className="flex gap-2 mt-1">
            <div className="h-5 w-14 bg-gray-100 rounded-full" />
            <div className="h-5 w-16 bg-gray-100 rounded-full" />
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-auto">
            <div className="h-4 w-24 bg-gray-200 rounded-md" />
            <div className="h-7 w-24 bg-gray-200 rounded-lg" />
        </div>
    </div>
);

// ─── Estado vacío por sección ──────────────────────────────────────────────────
const EmptySection = ({ tipo }) => {
    const esAprobados = tipo === 'approved';
    return (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                {esAprobados ? (
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ) : (
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
            </div>
            {esAprobados ? (
                <>
                    <p className="text-sm font-medium text-gray-700 mb-1">Ningún proyecto publicado aún</p>
                    <p className="text-xs text-gray-400 max-w-xs">
                        Cuando tus proyectos sean aprobados por el equipo de moderación, aparecerán aquí.
                    </p>
                </>
            ) : (
                <>
                    <p className="text-sm font-medium text-gray-700 mb-1">Sin proyectos en revisión</p>
                    <p className="text-xs text-gray-400 max-w-xs">
                        Los proyectos que envíes para revisión aparecerán aquí mientras esperan ser aprobados.
                    </p>
                </>
            )}
        </div>
    );
};

// ─── Estado completamente vacío (sin ningún proyecto) ─────────────────────────
const EmptyTotal = () => (
    <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
        </div>
        <h3 className="mb-1 text-base font-semibold text-gray-800">
            Aún no tienes proyectos
        </h3>
        <p className="mb-6 max-w-xs text-sm text-gray-500">
            Publica tu primer proyecto y aparecerá aquí. Los proyectos pasan por un proceso de revisión antes de ser visibles al público.
        </p>
        <Link
            to="/proyectos/crear"
            className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
        >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Publicar mi primer proyecto
        </Link>
    </div>
);

// ─── Cabecera de sección ───────────────────────────────────────────────────────
const SectionHeader = ({ titulo, count, tipo }) => {
    const esAprobados = tipo === 'approved';
    return (
        <div className="flex items-center gap-3 mb-5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                esAprobados ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
            }`}>
                {esAprobados ? (
                    <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                ) : (
                    <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-900">{titulo}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                    {count === 0
                        ? 'Sin proyectos en esta sección'
                        : `${count} ${count === 1 ? 'proyecto' : 'proyectos'}`}
                </p>
            </div>
            {count > 0 && (
                <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${
                    esAprobados
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                    {count}
                </span>
            )}
        </div>
    );
};

// ─── MyProjectsPage ───────────────────────────────────────────────────────────
/**
 * MyProjectsPage — Vista privada del autor para gestionar sus propios proyectos.
 * Muestra proyectos con moderation_status = 'approved' y 'pending_review',
 * separados en dos secciones visuales.
 *
 * Ruta: /mis-proyectos
 * Protección: redirige a /login si no hay sesión activa.
 */
const MyProjectsPage = () => {
    const navigate = useNavigate();

    // --- ESTADOS ---
    const [verificando, setVerificando]     = useState(true);
    const [sessionUserId, setSessionUserId] = useState(null);
    const [loading, setLoading]             = useState(false);
    const [error, setError]                 = useState(null);

    const [aprobados, setAprobados]         = useState([]);
    const [pendientes, setPendientes]       = useState([]);

    // ─── Protección de ruta + carga de proyectos ──────────────────────────────
    useEffect(() => {
        const inicializar = async () => {
            // 1. Verificar sesión activa
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                navigate('/login', { replace: true });
                return;
            }

            // 2. Verificar que el usuario tenga perfil completo
            const { data: perfil } = await supabase
                .from('perfiles')
                .select('id')
                .eq('id', session.user.id)
                .maybeSingle();

            if (!perfil) {
                // Sin perfil → redirigir a completar perfil
                navigate('/profile', { replace: true });
                return;
            }

            setSessionUserId(session.user.id);
            setVerificando(false);

            // 3. Cargar proyectos del autor
            await cargarMisProyectos(session.user.id);
        };

        inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Carga de proyectos del autor ─────────────────────────────────────────
    const cargarMisProyectos = async (userId) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: sbError } = await supabase
                .from('proyectos')
                .select('id, titulo, resumen, tecnologias, autor_nombre, estado, categoria, moderation_status, created_at')
                .eq('creator_auth_id', userId)
                .in('moderation_status', ['approved', 'pending_review'])
                .order('created_at', { ascending: false });

            if (sbError) throw sbError;

            const lista = data ?? [];
            setAprobados(lista.filter((p) => p.moderation_status === 'approved'));
            setPendientes(lista.filter((p) => p.moderation_status === 'pending_review'));
        } catch (err) {
            console.error('[MyProjectsPage] Error al cargar proyectos:', err);
            setError('No se pudieron cargar tus proyectos. Intenta recargar la página.');
        } finally {
            setLoading(false);
        }
    };

    // ─── Pantalla de verificación ─────────────────────────────────────────────
    if (verificando) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                    <svg className="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="text-sm">Verificando acceso…</span>
                </div>
            </div>
        );
    }

    const totalProyectos = aprobados.length + pendientes.length;

    // ─── RENDERIZADO ──────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50">

            {/* ── Encabezado de página ───────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-200">
                <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                                Mis proyectos
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Administra y revisa todos los proyectos que has publicado o enviado a revisión.
                            </p>
                        </div>

                        {/* Acciones: contador + botón publicar */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Contador total */}
                            {!loading && !error && (
                                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
                                    <span className="text-2xl font-bold text-gray-900">
                                        {totalProyectos}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        {totalProyectos === 1 ? 'proyecto' : 'proyectos'} en total
                                    </span>
                                </div>
                            )}

                            {/* Botón publicar nuevo */}
                            <Link
                                to="/proyectos/crear"
                                className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                Nuevo proyecto
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Contenido principal ─────────────────────────────────────────── */}
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

                {/* Error de carga */}
                {error && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                        <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        {error}
                        <button
                            onClick={() => cargarMisProyectos(sessionUserId)}
                            className="ml-auto text-xs font-semibold underline hover:no-underline"
                        >
                            Reintentar
                        </button>
                    </div>
                )}

                {/* Estado completamente vacío (sin proyectos) */}
                {!loading && !error && totalProyectos === 0 && (
                    <EmptyTotal />
                )}

                {/* ── Sección: Proyectos publicados (approved) ─────────────── */}
                {(!loading && !error && totalProyectos > 0) && (
                    <section className="mb-10">
                        <SectionHeader
                            titulo="Proyectos publicados"
                            count={aprobados.length}
                            tipo="approved"
                        />
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {loading ? (
                                [1, 2, 3].map((n) => <SkeletonCard key={n} />)
                            ) : aprobados.length === 0 ? (
                                <EmptySection tipo="approved" />
                            ) : (
                                aprobados.map((proyecto) => (
                                    <ProjectCard
                                        key={proyecto.id}
                                        id={proyecto.id}
                                        titulo={proyecto.titulo}
                                        resumen={proyecto.resumen}
                                        tecnologias={proyecto.tecnologias ?? []}
                                        autor_nombre={proyecto.autor_nombre}
                                        estado={proyecto.estado}
                                        categoria={proyecto.categoria}
                                    />
                                ))
                            )}
                        </div>
                    </section>
                )}

                {/* ── Sección: Proyectos en revisión (pending_review) ────────── */}
                {(!loading && !error && totalProyectos > 0) && (
                    <section>
                        <SectionHeader
                            titulo="En revisión"
                            count={pendientes.length}
                            tipo="pending_review"
                        />

                        {/* Aviso informativo sobre el estado de moderación */}
                        {pendientes.length > 0 && (
                            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                                <svg className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>
                                    Estos proyectos están siendo revisados por el equipo de moderación y <strong>aún no son visibles</strong> para el resto de la comunidad. Te notificaremos cuando sean aprobados.
                                </span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {loading ? (
                                [1, 2].map((n) => <SkeletonCard key={n} />)
                            ) : pendientes.length === 0 ? (
                                <EmptySection tipo="pending_review" />
                            ) : (
                                pendientes.map((proyecto) => (
                                    // Para proyectos pending_review usamos una variante de tarjeta
                                    // con indicador visual de estado de moderación
                                    <div key={proyecto.id} className="relative">
                                        {/* Badge de estado de moderación */}
                                        <div className="absolute -top-2 left-4 z-10">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm">
                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                En revisión
                                            </span>
                                        </div>
                                        <div className="pt-2">
                                            <ProjectCard
                                                id={proyecto.id}
                                                titulo={proyecto.titulo}
                                                resumen={proyecto.resumen}
                                                tecnologias={proyecto.tecnologias ?? []}
                                                autor_nombre={proyecto.autor_nombre}
                                                estado={proyecto.estado}
                                                categoria={proyecto.categoria}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                )}

                {/* Skeletons de carga (mientras se verifican las secciones) */}
                {loading && (
                    <>
                        <div className="mb-10">
                            <div className="h-8 w-48 bg-gray-200 rounded-md animate-pulse mb-5" />
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
                            </div>
                        </div>
                        <div>
                            <div className="h-8 w-40 bg-gray-200 rounded-md animate-pulse mb-5" />
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {[1, 2].map((n) => <SkeletonCard key={n} />)}
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default MyProjectsPage;
