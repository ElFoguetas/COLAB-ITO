// Librerías externas
import React from 'react';
import { Link } from 'react-router-dom';

// Componentes internos
import ProjectCard from './ProjectCard';

// ─── Skeleton de carga ──────────────────────────────────────────────────────
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
            <div className="h-3 w-4/6 bg-gray-100 rounded-md" />
        </div>
        <div className="flex gap-2 mt-1">
            <div className="h-5 w-14 bg-gray-100 rounded-full" />
            <div className="h-5 w-16 bg-gray-100 rounded-full" />
            <div className="h-5 w-12 bg-gray-100 rounded-full" />
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-auto">
            <div className="h-4 w-24 bg-gray-200 rounded-md" />
            <div className="h-7 w-24 bg-gray-200 rounded-lg" />
        </div>
    </div>
);

// ─── Estado vacío ────────────────────────────────────────────────────────────
const EmptyState = ({ canPublish }) => (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
        </div>
        <h3 className="mb-1 text-base font-semibold text-gray-800">
            Aún no hay proyectos publicados
        </h3>
        <p className="mb-6 max-w-xs text-sm text-gray-500">
            La comunidad del tecnológico todavía no ha publicado ningún proyecto. ¡Sé el primero!
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
    </div>
);

/**
 * ProjectsGrid — Cuadrícula de tarjetas de proyectos.
 * Reutilizable en LandingPage (destacados) y en ProjectsPage (catálogo completo).
 *
 * @param {Array}   proyectos    - Lista de proyectos de Supabase a mostrar.
 * @param {boolean} [loading]    - Si true, muestra skeletons en vez de tarjetas.
 * @param {boolean} [canPublish] - Si true, el EmptyState muestra el CTA de publicar.
 * @param {string}  [titulo]     - Título de la sección (para uso en landing).
 * @param {string}  [subtitulo]  - Subtítulo de la sección (para uso en landing).
 */
const ProjectsGrid = ({
    proyectos = [],
    loading = false,
    canPublish = false,
    titulo = 'Proyectos Destacados',
    subtitulo = 'Explora los proyectos innovadores desarrollados por nuestra comunidad.',
}) => {
    return (
        <section className="py-12 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Encabezado de sección */}
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        {titulo}
                    </h2>
                    <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
                        {subtitulo}
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {loading ? (
                        // Skeletons mientras carga
                        [1, 2, 3].map((n) => <SkeletonCard key={n} />)
                    ) : proyectos.length === 0 ? (
                        <EmptyState canPublish={canPublish} />
                    ) : (
                        proyectos.map((proyecto) => (
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
            </div>
        </section>
    );
};

export default ProjectsGrid;
