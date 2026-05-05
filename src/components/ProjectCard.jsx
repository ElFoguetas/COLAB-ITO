// Librerías externas
import React from 'react';
import { Link } from 'react-router-dom';

// Mapa de colores para los estados reales de la tabla `proyectos`
const ESTADO_STYLES = {
    'abierto':      'bg-emerald-50 text-emerald-700 border border-emerald-200',
    'en progreso':  'bg-amber-50 text-amber-700 border border-amber-200',
    'cerrado':      'bg-gray-100 text-gray-500 border border-gray-200',
};

const ESTADO_LABELS = {
    'abierto':      'Abierto',
    'en progreso':  'En progreso',
    'cerrado':      'Cerrado',
};

/**
 * ProjectCard — Tarjeta de presentación de un proyecto.
 * Trabaja con los campos reales de la tabla `proyectos` en Supabase.
 *
 * @param {string}   id           - UUID del proyecto (para el link de detalle).
 * @param {string}   titulo       - Nombre del proyecto.
 * @param {string}   resumen      - Descripción breve del proyecto.
 * @param {string[]} tecnologias  - Lista de tecnologías o etiquetas.
 * @param {string}   autor_nombre - Nombre del autor.
 * @param {string}   [estado]     - Estado del proyecto: 'abierto' | 'en progreso' | 'cerrado'.
 * @param {string}   [categoria]  - Categoría del proyecto.
 */
const ProjectCard = ({ id, titulo, resumen, tecnologias = [], autor_nombre, estado, categoria }) => {
    const estadoClass = ESTADO_STYLES[estado] ?? 'bg-gray-50 text-gray-500 border border-gray-200';
    const estadoLabel = ESTADO_LABELS[estado] ?? estado;

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex flex-col h-full">

            {/* Cabecera: categoría + badge de estado */}
            <div className="flex items-center justify-between mb-3">
                {categoria && (
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide truncate max-w-[120px]">
                        {categoria}
                    </span>
                )}
                {estado && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${estadoClass}`}>
                        {estadoLabel}
                    </span>
                )}
            </div>

            {/* Título */}
            <h3 className="text-base font-semibold text-gray-900 mb-2 leading-snug">
                {titulo}
            </h3>

            {/* Resumen / descripción breve */}
            <p className="text-sm text-gray-500 mb-4 flex-grow leading-relaxed line-clamp-3">
                {resumen}
            </p>

            {/* Etiquetas de tecnologías */}
            {tecnologias.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-5">
                    {tecnologias.slice(0, 4).map((tag, index) => (
                        <span
                            key={index}
                            className="bg-gray-100 text-gray-600 text-xs px-2.5 py-0.5 rounded-full font-medium"
                        >
                            {tag}
                        </span>
                    ))}
                    {tecnologias.length > 4 && (
                        <span className="bg-gray-100 text-gray-400 text-xs px-2.5 py-0.5 rounded-full font-medium">
                            +{tecnologias.length - 4}
                        </span>
                    )}
                </div>
            )}

            {/* Pie: autor + enlace de detalle */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-auto">
                <div className="flex items-center gap-1.5">
                    <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <svg className="h-3.5 w-3.5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <span className="text-xs text-gray-500 truncate max-w-[120px]">{autor_nombre}</span>
                </div>
                <Link
                    to={`/proyectos/${id}`}
                    className="text-xs font-semibold text-gray-900 hover:text-black border border-gray-300 hover:border-black px-3 py-1.5 rounded-lg transition-all duration-150 whitespace-nowrap"
                >
                    Ver detalle →
                </Link>
            </div>
        </div>
    );
};

export default ProjectCard;
