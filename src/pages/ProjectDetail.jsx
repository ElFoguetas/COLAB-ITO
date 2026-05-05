// Librerías externas
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

// Configuración de Supabase
import { supabase } from '../config/supabaseClient';

// Componentes
import SolicitudPanel from '../components/SolicitudPanel';

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

// ─── Modal de confirmación de borrado ─────────────────────────────────────────
const ModalConfirmarBorrado = ({ titulo, onCancelar, onConfirmar, eliminando, errorEliminar }) => (
    // Overlay
    <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-titulo"
    >
        {/* Fondo oscuro */}
        <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onCancelar}
        />

        {/* Tarjeta del diálogo */}
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-[fadeInScale_0.18s_ease-out]">

            {/* Ícono destructivo */}
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 border border-red-100 mx-auto">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
            </div>

            <h2 id="dialog-titulo" className="text-base font-bold text-gray-900 text-center mb-1">
                ¿Eliminar este proyecto?
            </h2>
            <p className="text-sm text-gray-500 text-center mb-1">
                <span className="font-medium text-gray-700">"{titulo}"</span>
            </p>
            <p className="text-xs text-gray-400 text-center mb-6">
                Esta acción es permanente y no se puede deshacer.
            </p>

            {/* Error al eliminar */}
            {errorEliminar && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 text-center">
                    {errorEliminar}
                </div>
            )}

            {/* Botones */}
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onCancelar}
                    disabled={eliminando}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    onClick={onConfirmar}
                    disabled={eliminando}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {eliminando ? (
                        <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Eliminando…
                        </>
                    ) : (
                        'Eliminar'
                    )}
                </button>
            </div>
        </div>
    </div>
);

// ─── ProjectDetail ────────────────────────────────────────────────────────────
/**
 * ProjectDetail — Vista completa de un proyecto individual.
 * Obtiene el proyecto desde Supabase usando el `id` de la URL (/proyectos/:id).
 * Si el usuario autenticado es el creador, muestra botones de Editar y Eliminar.
 */
const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // --- ESTADOS DEL PROYECTO ---
    const [proyecto, setProyecto]   = useState(null);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);

    // --- SESIÓN ---
    const [sessionUserId, setSessionUserId] = useState(null);

    // --- BORRADO ---
    const [mostrarModalBorrado, setMostrarModalBorrado] = useState(false);
    const [eliminando, setEliminando]                   = useState(false);
    const [errorEliminar, setErrorEliminar]             = useState('');

    // --- EFECTO: cargar sesión y proyecto ---
    useEffect(() => {
        if (!id) {
            navigate('/proyectos', { replace: true });
            return;
        }

        const cargarDatos = async () => {
            setLoading(true);
            setError(null);

            // Obtener sesión (no bloquea la vista pública)
            const { data: { session } } = await supabase.auth.getSession();
            setSessionUserId(session?.user?.id ?? null);

            // Cargar proyecto
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

        cargarDatos();
    }, [id, navigate]);

    // --- El usuario actual es el creador ---
    const esCreador =
        sessionUserId !== null &&
        proyecto !== null &&
        proyecto.creator_auth_id === sessionUserId;

    // ─── Eliminar proyecto ────────────────────────────────────────────────────
    const handleEliminar = useCallback(async () => {
        setErrorEliminar('');

        // Verificación de seguridad antes de ejecutar
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || session.user.id !== sessionUserId) {
            setErrorEliminar('No tienes permiso para eliminar este proyecto.');
            return;
        }

        setEliminando(true);
        try {
            const { error: sbError } = await supabase
                .from('proyectos')
                .delete()
                .eq('id', id)
                .eq('creator_auth_id', session.user.id); // Filtro de seguridad

            if (sbError) throw sbError;

            navigate('/proyectos', { replace: true });
        } catch (err) {
            console.error('[ProjectDetail] Error al eliminar:', err);
            setErrorEliminar('No se pudo eliminar el proyecto. Inténtalo de nuevo.');
        } finally {
            setEliminando(false);
        }
    }, [id, sessionUserId, navigate]);

    // ─── Estados de pantalla ──────────────────────────────────────────────────
    if (loading) return <SkeletonDetail />;

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
    const estadoClass    = ESTADO_STYLES[proyecto.estado]    ?? 'bg-gray-100 text-gray-500 border border-gray-200';
    const estadoLabel    = ESTADO_LABELS[proyecto.estado]    ?? proyecto.estado;
    const modalidadLabel = MODALIDAD_LABELS[proyecto.modalidad] ?? proyecto.modalidad;
    const tecnologias    = proyecto.tecnologias ?? [];
    const vacantes       = proyecto.vacantes    ?? [];

    // ─── RENDERIZADO ─────────────────────────────────────────────────────────
    return (
        <>
            {/* Modal de confirmación de borrado */}
            {mostrarModalBorrado && (
                <ModalConfirmarBorrado
                    titulo={proyecto.titulo}
                    onCancelar={() => { setMostrarModalBorrado(false); setErrorEliminar(''); }}
                    onConfirmar={handleEliminar}
                    eliminando={eliminando}
                    errorEliminar={errorEliminar}
                />
            )}

            <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">

                {/* Breadcrumb + acciones del propietario */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <nav>
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

                    {/* Botones visibles SOLO para el creador */}
                    {esCreador && (
                        <div className="flex items-center gap-2">
                            {/* Editar */}
                            <Link
                                to={`/proyectos/${id}/editar`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-all duration-150"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                </svg>
                                Editar
                            </Link>

                            {/* Eliminar */}
                            <button
                                type="button"
                                onClick={() => setMostrarModalBorrado(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 transition-all duration-150"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                                Eliminar
                            </button>
                        </div>
                    )}
                </div>

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

                            {/* Panel de solicitud: maneja todos los estados del flujo */}
                            <SolicitudPanel
                                proyecto={proyecto}
                                sessionUserId={sessionUserId}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProjectDetail;
