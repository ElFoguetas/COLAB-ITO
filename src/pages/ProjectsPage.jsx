// Librerías externas
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';

// Componentes internos
import ProjectCard from '../components/ProjectCard';

// Configuración de Supabase
import { supabase } from '../config/supabaseClient';

// ─── Skeleton de carga ────────────────────────────────────────────────────────
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

// ─── Estado vacío ─────────────────────────────────────────────────────────────
const EmptyState = ({ onClear, filtrosActivos, canPublish }) => (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            {filtrosActivos ? (
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
                </svg>
            ) : (
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
            )}
        </div>
        {filtrosActivos ? (
            <>
                <h3 className="mb-1 text-base font-semibold text-gray-800">
                    No encontramos proyectos con esos criterios
                </h3>
                <p className="mb-6 max-w-xs text-sm text-gray-500">
                    Intenta ajustar los filtros o la búsqueda para ver más resultados.
                </p>
                <button
                    onClick={onClear}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-500 hover:text-gray-900 transition-all duration-150"
                >
                    Limpiar filtros
                </button>
            </>
        ) : (
            <>
                <h3 className="mb-1 text-base font-semibold text-gray-800">
                    Aún no hay proyectos publicados
                </h3>
                <p className="mb-6 max-w-xs text-sm text-gray-500">
                    La comunidad todavía no ha publicado ningún proyecto.
                </p>
                {canPublish && (
                    <Link
                        to="/proyectos/crear"
                        className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Publica el primer proyecto
                    </Link>
                )}
            </>
        )}
    </div>
);

// ─── Utilidades de filtrado ───────────────────────────────────────────────────

const ESTADO_LABELS = {
    'abierto':     'Abierto',
    'en progreso': 'En progreso',
    'cerrado':     'Cerrado',
};

const getCategorias = (lista) => {
    const set = new Set(lista.map((p) => p.categoria).filter(Boolean));
    return ['Todas', ...Array.from(set).sort()];
};

const getEstados = (lista) => {
    const set = new Set(lista.map((p) => p.estado).filter(Boolean));
    return ['Todos', ...Array.from(set)];
};

// ─── ProjectsPage ─────────────────────────────────────────────────────────────

/**
 * ProjectsPage — Vista dedicada al catálogo completo de proyectos.
 * Carga todos los proyectos desde Supabase y aplica filtros locales.
 */
const ProjectsPage = () => {
    // --- ESTADO: puede publicar (verificado directamente, no via contexto) ---
    // El contexto global solo se actualiza en el flujo de Google OAuth.
    // Para usuarios con email/contraseña o recargas de página, hacemos
    // nuestra propia consulta de sesión + perfil.
    const [canPublish, setCanPublish] = useState(false);

    useEffect(() => {
        const verificarPublicacion = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) { setCanPublish(false); return; }

            const { data: perfil } = await supabase
                .from('perfiles')
                .select('id')
                .eq('id', session.user.id)
                .maybeSingle();

            setCanPublish(!!perfil);
        };

        verificarPublicacion();

        // Reaccionar si cambia la sesión (login/logout mientras la página está abierta)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session?.user) { setCanPublish(false); return; }
            supabase
                .from('perfiles')
                .select('id')
                .eq('id', session.user.id)
                .maybeSingle()
                .then(({ data }) => setCanPublish(!!data));
        });

        return () => subscription.unsubscribe();
    }, []);

    const [todosLosProyectos, setTodosLosProyectos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- ESTADOS DE FILTRO ---
    const [busqueda, setBusqueda] = useState('');
    const [categoria, setCategoria] = useState('Todas');
    const [estado, setEstado] = useState('Todos');

    // --- EFECTO: cargar proyectos desde Supabase ---
    useEffect(() => {
        const fetchProyectos = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error: sbError } = await supabase
                    .from('proyectos')
                    .select('id, titulo, resumen, tecnologias, autor_nombre, estado, categoria, created_at')
                    .order('created_at', { ascending: false });

                if (sbError) throw sbError;
                setTodosLosProyectos(data ?? []);
            } catch (err) {
                console.error('[ProjectsPage] Error al cargar proyectos:', err);
                setError('No se pudieron cargar los proyectos. Intenta recargar la página.');
            } finally {
                setLoading(false);
            }
        };

        fetchProyectos();
    }, []);

    // --- LISTAS DE OPCIONES (derivadas de los datos cargados) ---
    const categorias = useMemo(() => getCategorias(todosLosProyectos), [todosLosProyectos]);
    const estados    = useMemo(() => getEstados(todosLosProyectos), [todosLosProyectos]);

    // --- PROYECTOS FILTRADOS ---
    const resultados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return todosLosProyectos.filter((p) => {
            const matchBusqueda =
                !q ||
                (p.titulo ?? '').toLowerCase().includes(q) ||
                (p.resumen ?? '').toLowerCase().includes(q) ||
                (p.tecnologias ?? []).some((t) => t.toLowerCase().includes(q)) ||
                (p.autor_nombre ?? '').toLowerCase().includes(q);

            const matchCategoria =
                categoria === 'Todas' || p.categoria === categoria;

            const matchEstado =
                estado === 'Todos' || p.estado === estado;

            return matchBusqueda && matchCategoria && matchEstado;
        });
    }, [busqueda, categoria, estado, todosLosProyectos]);

    // --- HANDLER: limpiar todos los filtros ---
    const limpiarFiltros = () => {
        setBusqueda('');
        setCategoria('Todas');
        setEstado('Todos');
    };

    const hayFiltrosActivos =
        busqueda.trim() !== '' || categoria !== 'Todas' || estado !== 'Todos';

    // ─── RENDERIZADO ─────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50">

            {/* ── Encabezado de página ──────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-200">
                <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                                Proyectos
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Explora iniciativas colaborativas creadas por la comunidad del tecnológico.
                            </p>
                        </div>

                        {/* Acciones: contador + botón publicar */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Contador */}
                            {!loading && !error && (
                                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
                                    <span className="text-2xl font-bold text-gray-900">
                                        {resultados.length}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        {resultados.length === 1 ? 'proyecto' : 'proyectos'}
                                        {hayFiltrosActivos ? ' encontrados' : ' disponibles'}
                                    </span>
                                </div>
                            )}

                            {/* Botón "+ Publicar proyecto" — solo con sesión y perfil completo */}
                            {canPublish && (
                                <Link
                                    to="/proyectos/crear"
                                    className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    Publicar proyecto
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Barra de exploración ──────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-100 shadow-sm">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">

                        {/* Input de búsqueda */}
                        <div className="relative flex-1">
                            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por nombre, tecnología o autor…"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm text-gray-800 placeholder-gray-400 focus:border-gray-400 focus:bg-white focus:outline-none transition-colors"
                            />
                        </div>

                        {/* Select de categoría */}
                        <select
                            value={categoria}
                            onChange={(e) => setCategoria(e.target.value)}
                            className="rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-3 pr-8 text-sm text-gray-700 focus:border-gray-400 focus:bg-white focus:outline-none transition-colors appearance-none cursor-pointer sm:w-48"
                            style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25em 1.25em' }}
                        >
                            {categorias.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        {/* Select de estado */}
                        <select
                            value={estado}
                            onChange={(e) => setEstado(e.target.value)}
                            className="rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-3 pr-8 text-sm text-gray-700 focus:border-gray-400 focus:bg-white focus:outline-none transition-colors appearance-none cursor-pointer sm:w-40"
                            style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25em 1.25em' }}
                        >
                            {estados.map((est) => (
                                <option key={est} value={est}>
                                    {est === 'Todos' ? 'Todos' : (ESTADO_LABELS[est] ?? est)}
                                </option>
                            ))}
                        </select>

                        {/* Botón limpiar filtros */}
                        {hayFiltrosActivos && (
                            <button
                                onClick={limpiarFiltros}
                                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-all duration-150 whitespace-nowrap"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Grid de proyectos ─────────────────────────────────────────── */}
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

                {/* Error de carga */}
                {error && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        [1, 2, 3, 4, 5, 6].map((n) => <SkeletonCard key={n} />)
                    ) : resultados.length === 0 ? (
                        <EmptyState
                            onClear={limpiarFiltros}
                            filtrosActivos={hayFiltrosActivos}
                            canPublish={canPublish}
                        />
                    ) : (
                        resultados.map((proyecto) => (
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
            </main>
        </div>
    );
};

export default ProjectsPage;
