// Librerías externas
import React from 'react';

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Devuelve las clases de Tailwind para el fondo e ícono del badge
 * según el tipo de archivo.
 * @param {string} type - Extensión del archivo (ej. 'pdf', 'docx').
 * @returns {{ bg: string, text: string, badge: string }}
 */
const getTypeStyles = (type) => {
    const map = {
        pdf:  { bg: 'bg-red-50',    text: 'text-red-600',    badge: 'bg-red-100 text-red-700' },
        docx: { bg: 'bg-blue-50',   text: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700' },
        doc:  { bg: 'bg-blue-50',   text: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700' },
        pptx: { bg: 'bg-orange-50', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
        ppt:  { bg: 'bg-orange-50', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
        xlsx: { bg: 'bg-green-50',  text: 'text-green-600',  badge: 'bg-green-100 text-green-700' },
        xls:  { bg: 'bg-green-50',  text: 'text-green-600',  badge: 'bg-green-100 text-green-700' },
        txt:  { bg: 'bg-gray-50',   text: 'text-gray-500',   badge: 'bg-gray-100 text-gray-600' },
    };
    return map[type?.toLowerCase()] ?? { bg: 'bg-gray-50', text: 'text-gray-500', badge: 'bg-gray-100 text-gray-600' };
};

// ─────────────────────────────────────────────────────────────

/**
 * MaterialCard — Tarjeta de presentación de un recurso académico.
 * Se muestra en la cuadrícula de MaterialPage.
 *
 * @param {string}   title           - Nombre del documento o guía.
 * @param {string}   subtitle        - Descripción o autor del material.
 * @param {string}   type            - Tipo de archivo (ej: 'pdf', 'docx').
 * @param {string}   fileUrl         - URL pública del archivo en Supabase Storage.
 * @param {string}   materialId      - ID del registro en la tabla materiales.
 * @param {string}   uploaderAuthId  - auth_id del usuario que subió el material.
 * @param {string}   sessionUserId   - auth_id del usuario autenticado actualmente.
 * @param {Function} onEliminar      - Callback para iniciar flujo de eliminación.
 */
const MaterialCard = ({ title, subtitle, type, fileUrl, materialId, uploaderAuthId, sessionUserId, onEliminar }) => {
    const styles = getTypeStyles(type);

    // El botón de eliminar solo aparece si el usuario autenticado es el autor
    const esAutor = sessionUserId && uploaderAuthId && sessionUserId === uploaderAuthId;

    const handleDownload = () => {
        if (fileUrl) window.open(fileUrl, '_blank', 'noopener,noreferrer');
    };

    // --- RENDERIZADO ---
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start space-x-4 hover:shadow-md transition-shadow">

            {/* Ícono del tipo de archivo (coloreado por tipo) */}
            <div className="flex-shrink-0">
                <div className={`h-12 w-12 ${styles.bg} rounded-lg flex items-center justify-center`}>
                    <svg className={`h-6 w-6 ${styles.text}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                    </svg>
                </div>
            </div>

            {/* Información del material y acciones */}
            <div className="flex-1 min-w-0">
                {/* Título */}
                <p className="text-sm font-semibold text-gray-900 truncate" title={title}>
                    {title}
                </p>

                {/* Descripción / subtítulo */}
                <p className="text-sm text-gray-500 truncate mt-0.5" title={subtitle}>
                    {subtitle}
                </p>

                {/* Fila inferior: badge del tipo + acciones */}
                <div className="mt-3 flex items-center justify-between gap-2">
                    {/* Badge del tipo de archivo */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase ${styles.badge}`}>
                        {type || '—'}
                    </span>

                    <div className="flex items-center gap-3">
                        {/* Botón de eliminar — solo visible para el autor */}
                        {esAutor && onEliminar && (
                            <button
                                type="button"
                                onClick={() => onEliminar({ id: materialId, titulo: title, file_path: fileUrl })}
                                title="Eliminar material"
                                className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-7 0H5" />
                                </svg>
                                Eliminar
                            </button>
                        )}

                        {/* Botón de descarga — solo si fileUrl existe */}
                        {fileUrl && (
                            <button
                                type="button"
                                onClick={handleDownload}
                                title="Descargar archivo"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-black transition-colors"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
                                </svg>
                                Descargar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaterialCard;
