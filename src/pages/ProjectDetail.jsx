// Librerías externas
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

// Configuración de Supabase
import { supabase } from '../config/supabaseClient';

// ─── Mapa de estilos para el estado ──────────────────────────────────────────
const ESTADO_STYLES = {
    'abierto':     'bg-emerald-50 text-emerald-700 border border-emerald-200',
    'en progreso': 'bg-amber-50 text-amber-700 border border-amber-200',
    'cerrado':     'bg-gray-100 text-gray-500 border border-gray-200',
};
const ESTADO_LABELS = {
    'abierto':     'Abierto',
    'en progreso': 'En progreso',
    'cerrado':     'Cerrado',
};
const MODALIDAD_LABELS = {
    'remoto':  'Remoto',
    'híbrido': 'Híbrido',
};

// ─── Skeleton de carga ────────────────────────────────────────────────────────
const SkeletonDetail = () => (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8 animate-pulse">
        <div className="mb-8 border-b border-gray-200 pb-6">
            <div className="h-8 w-2/3 bg-gray-200 rounded-md mb-4" />
            <div className="h-4 w-1/3 bg-gray-100 rounded-md" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-3">
                <div className="h-6 w-1/4 bg-gray-200 rounded-md" />
                <div className="h-4 w-full bg-gray-100 rounded-md" />
                <div className="h-4 w-5/6 bg-gray-100 rounded-md" />
                <div className="h-4 w-4/6 bg-gray-100 rounded-md" />
                <div className="h-4 w-full bg-gray-100 rounded-md" />
            </div>
            <div className="lg:col-span-1">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 space-y-4">
                    <div className="h-5 w-1/2 bg-gray-200 rounded-md" />
                    <div className="h-4 w-3/4 bg-gray-100 rounded-md" />
                    <div className="h-4 w-3/4 bg-gray-100 rounded-md" />
                    <div className="h-4 w-2/3 bg-gray-100 rounded-md" />
                </div>
            </div>
        </div>
    </div>
);

// ─── Helper: formatear fecha ──────────────────────────────────────────────────
const formatearFecha = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

// ─── ProjectDetail ────────────────────────────────────────────────────────────
/**
 * ProjectDetail — Vista completa de un proyecto individual.
 * Obtiene el proyecto desde Supabase usando el `id` de la URL (/proyectos/:id).
 */
const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // --- ESTADOS ---
    const [proyecto, setProyecto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- EFECTO: cargar proyecto por id ---
    useEffect(() => {
        if (!id) {
            navigate('/proyectos', { replace: true });
            return;
        }

        const fetchProyecto = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error: sbError } = await supabase
                    .from('proyectos')
                    .select('*')
                    .eq('id', id)
                    .maybeSingle();

                if (sbError) throw sbError;

                if (!data) {
                    setError('not_found');
                } else {
                    setProyecto(data);
                }
            } catch (err) {
                console.error('[ProjectDetail] Error al cargar proyecto:', err);
                setError('error');
            } finally {
                setLoading(false);
            }
        };

        fetchProyecto();
    }, [id, navigate]);

    // ─── Estado de carga ─────────────────────────────────────────────────────
    if (loading) return <SkeletonDetail />;

    // ─── Error: no encontrado ─────────────────────────────────────────────────
    if (error === 'not_found') {
        return (
            <div className="max-w-4xl mx-auto px-4 py-20 sm:px-6 lg:px-8 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mx-auto">
                    <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Proyecto no encontrado</h1>
                <p className="text-sm text-gray-500 mb-8">
                    El proyecto que buscas no existe o fue eliminado.
                </p>
                <Link
                    to="/proyectos"
                    className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                >
                    ← Ver todos los proyectos
                </Link>
            </div>
        );
    }

    // ─── Error: fallo de red / Supabase ──────────────────────────────────────
    if (error) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-20 sm:px-6 lg:px-8 text-center">
                <h1 className="text-xl font-bold text-gray-900 mb-2">Ocurrió un error</h1>
                <p className="text-sm text-gray-500 mb-8">
                    No se pudo cargar el proyecto. Verifica tu conexión e intenta de nuevo.
                </p>
                <div className="flex justify-center gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-500 transition-colors"
                    >
                        Reintentar
                    </button>
                    <Link
                        to="/proyectos"
                        className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                    >
                        Ir al catálogo
                    </Link>
                </div>
            </div>
        );
    }

    // ─── Datos del proyecto ───────────────────────────────────────────────────
    const estadoClass = ESTADO_STYLES[proyecto.estado] ?? 'bg-gray-100 text-gray-500 border border-gray-200';
    const estadoLabel = ESTADO_LABELS[proyecto.estado] ?? proyecto.estado;
    const modalidadLabel = MODALIDAD_LABELS[proyecto.modalidad] ?? proyecto.modalidad;
    const tecnologias = proyecto.tecnologias ?? [];
    const vacantes    = proyecto.vacantes    ?? [];

    // ─── RENDERIZADO ─────────────────────────────────────────────────────────
    return (
        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">

            {/* Breadcrumb */}
            <nav className="mb-6">
                <Link
                    to="/proyectos"
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors inline-flex items-center gap-1.5"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    Volver a proyectos
                </Link>
            </nav>

            {/* Encabezado del proyecto */}
            <div className="mb-8 border-b border-gray-200 pb-6">
                <div className="flex flex-wrap items-start gap-3 mb-3">
                    {proyecto.categoria && (
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                            {proyecto.categoria}
                        </span>
                    )}
                    {proyecto.estado && (
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${estadoClass}`}>
                            {estadoLabel}
                        </span>
                    )}
                </div>
                <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
                    {proyecto.titulo}
                </h1>
                {proyecto.resumen && (
                    <p className="text-lg text-gray-500 mb-4 max-w-2xl leading-relaxed">
                        {proyecto.resumen}
                    </p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span className="font-medium">{proyecto.autor_nombre}</span>
                    </span>
                    {proyecto.institucion && (
                        <span className="flex items-center gap-1.5">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                            </svg>
                            {proyecto.institucion}
                        </span>
                    )}
                    <span className="text-gray-400">
                        Publicado el {formatearFecha(proyecto.created_at)}
                    </span>
                </div>
            </div>

            {/* Layout principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                {/* Columna principal: descripción */}
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        Sobre el Proyecto
                    </h2>
                    <div className="prose prose-indigo text-gray-600 whitespace-pre-line leading-relaxed">
                        {proyecto.descripcion}
                    </div>

                    {/* Tecnologías */}
                    {tecnologias.length > 0 && (
                        <div className="mt-10">
                            <h3 className="text-lg font-bold text-gray-900 mb-3">
                                Tecnologías
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {tecnologias.map((tag, i) => (
                                    <span
                                        key={i}
                                        className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full font-medium"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Barra lateral: info del proyecto + vacantes */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 sticky top-24">

                        {/* Detalles del proyecto */}
                        <h3 className="text-base font-bold text-gray-900 mb-4">
                            Detalles
                        </h3>
                        <dl className="space-y-3 mb-6 text-sm">
                            {proyecto.modalidad && (
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Modalidad</dt>
                                    <dd className="font-medium text-gray-800">{modalidadLabel}</dd>
                                </div>
                            )}
                            {proyecto.estado && (
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Estado</dt>
                                    <dd>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${estadoClass}`}>
                                            {estadoLabel}
                                        </span>
                                    </dd>
                                </div>
                            )}
                            {proyecto.categoria && (
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Área</dt>
                                    <dd className="font-medium text-gray-800">{proyecto.categoria}</dd>
                                </div>
                            )}
                            {proyecto.institucion && (
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Institución</dt>
                                    <dd className="font-medium text-gray-800 text-right max-w-[140px]">
                                        {proyecto.institucion}
                                    </dd>
                                </div>
                            )}
                        </dl>

                        {/* Vacantes requeridas */}
                        {vacantes.length > 0 && (
                            <>
                                <div className="border-t border-gray-200 pt-5 mb-5">
                                    <h3 className="text-base font-bold text-gray-900 mb-3">
                                        ¿Qué necesitamos?
                                    </h3>
                                    <ul className="space-y-2">
                                        {vacantes.map((vacante, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <svg className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="text-sm text-gray-700">{vacante}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        )}

                        {/* Nota: funcionalidades futuras */}
                        <p className="text-xs text-gray-400 text-center mt-2">
                            Próximamente: solicitar unirse al proyecto
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetail;
