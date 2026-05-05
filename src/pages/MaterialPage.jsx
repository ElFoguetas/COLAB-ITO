// Librerías externas
import React, { useState, useEffect, useRef } from 'react';

// Configuración de Supabase
import { supabase } from '../config/supabaseClient';

// Componentes internos
import MaterialCard from '../components/MaterialCard';

// ─── Constantes ───────────────────────────────────────────────
const TIPOS_ARCHIVO = ['pdf', 'docx', 'pptx', 'xlsx', 'txt'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPT_EXTENSIONS = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt';

// Estado vacío del formulario de subida
const FORM_INICIAL = {
    titulo: '',
    descripcion: '',
    tipo: 'pdf',
    archivo: null,
};

/**
 * UploadModal — Modal de subida de materiales académicos.
 * Se encarga de validar, subir a Supabase Storage e insertar el registro en la BD.
 *
 * @param {object}   session  - Sesión activa de Supabase (con session.user.id).
 * @param {Function} onClose  - Callback para cerrar el modal.
 * @param {Function} onUploaded - Callback para recargar la lista tras subir.
 */
const UploadModal = ({ session, onClose, onUploaded }) => {
    const [form, setForm] = useState(FORM_INICIAL);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    // Cierra el modal limpiando el formulario
    const handleClose = () => {
        setForm(FORM_INICIAL);
        setError('');
        onClose();
    };

    // Actualiza campos de texto y select
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // Valida y almacena el archivo seleccionado
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > MAX_SIZE_BYTES) {
            setError('El archivo supera el límite de 10 MB.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        setError('');
        setForm((prev) => ({ ...prev, archivo: file }));
    };

    // Flujo completo de subida
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.archivo) {
            setError('Selecciona un archivo antes de continuar.');
            return;
        }

        setUploading(true);
        setError('');

        try {
            const { titulo, descripcion, tipo, archivo } = form;
            const userId = session.user.id;

            // 1. Generar ruta única en el bucket
            const filePath = `${userId}/${Date.now()}_${archivo.name}`;

            // 2. Subir el archivo al bucket "materiales"
            const { error: storageError } = await supabase.storage
                .from('materiales')
                .upload(filePath, archivo);

            if (storageError) throw storageError;

            // 3. Obtener URL pública del archivo
            const { data: { publicUrl } } = supabase.storage
                .from('materiales')
                .getPublicUrl(filePath);

            // 4. Insertar registro en la tabla materiales
            const { error: dbError } = await supabase.from('materiales').insert({
                titulo,
                descripcion: descripcion || null,
                file_type: tipo,
                file_path: filePath,
                url_archivo: publicUrl,
                uploader_auth_id: userId,
            });

            if (dbError) throw dbError;

            // 5. Éxito: cerrar modal y recargar lista
            handleClose();
            onUploaded();

        } catch (err) {
            console.error('Error al subir material:', err);
            setError(err.message || 'Ocurrió un error inesperado. Inténtalo de nuevo.');
        } finally {
            setUploading(false);
        }
    };

    return (
        // Fondo semitransparente (backdrop)
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            {/* Contenedor del modal */}
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 sm:p-8">

                {/* Encabezado */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Subir Material</h2>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={uploading}
                        aria-label="Cerrar modal"
                        className="text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Título */}
                    <div>
                        <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">
                            Título <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="titulo"
                            name="titulo"
                            type="text"
                            value={form.titulo}
                            onChange={handleChange}
                            placeholder="Ej. Guía de Cálculo II"
                            required
                            disabled={uploading}
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition disabled:opacity-50"
                        />
                    </div>

                    {/* Descripción */}
                    <div>
                        <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
                            Descripción <span className="text-gray-400 font-normal">(opcional)</span>
                        </label>
                        <textarea
                            id="descripcion"
                            name="descripcion"
                            rows={3}
                            value={form.descripcion}
                            onChange={handleChange}
                            placeholder="Breve descripción del contenido…"
                            disabled={uploading}
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition disabled:opacity-50 resize-none"
                        />
                    </div>

                    {/* Tipo de archivo */}
                    <div>
                        <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo de archivo <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="tipo"
                            name="tipo"
                            value={form.tipo}
                            onChange={handleChange}
                            required
                            disabled={uploading}
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition disabled:opacity-50"
                        >
                            {TIPOS_ARCHIVO.map((t) => (
                                <option key={t} value={t}>{t.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    {/* Selector de archivo */}
                    <div>
                        <label htmlFor="archivo" className="block text-sm font-medium text-gray-700 mb-1">
                            Archivo <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="archivo"
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPT_EXTENSIONS}
                            onChange={handleFileChange}
                            disabled={uploading}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-sm file:font-semibold file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-50 cursor-pointer"
                        />
                        <p className="mt-1 text-xs text-gray-400">Máximo 10 MB. Formatos: PDF, DOCX, PPTX, XLSX, TXT.</p>
                    </div>

                    {/* Mensaje de error */}
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                            {error}
                        </p>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={uploading}
                            className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={uploading}
                            className="flex-1 py-2.5 px-4 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {uploading ? 'Subiendo…' : 'Subir material'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
/**
 * MaterialPage — Página del repositorio académico.
 * Carga materiales reales desde Supabase, detecta la sesión activa
 * para mostrar el botón de subida, y renderiza el modal UploadModal.
 * No recibe props.
 */
const MaterialPage = () => {
    // --- ESTADOS ---
    const [materiales, setMateriales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [session, setSession] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // --- EFECTOS ---
    /**
     * Al montar:
     * 1. Obtiene la sesión activa para mostrar/ocultar el botón de subida.
     * 2. Carga los materiales desde Supabase.
     */
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        fetchMateriales();
    }, []);

    // --- HELPERS ---
    /**
     * Consulta todos los materiales ordenados por fecha de subida (más reciente primero).
     */
    const fetchMateriales = async () => {
        setLoading(true);
        setError('');
        try {
            const { data, error: dbError } = await supabase
                .from('materiales')
                .select('*')
                .order('fecha_subida', { ascending: false });

            if (dbError) throw dbError;
            setMateriales(data || []);
        } catch (err) {
            console.error('Error al cargar materiales:', err);
            setError('No se pudieron cargar los materiales. Intenta de nuevo más tarde.');
        } finally {
            setLoading(false);
        }
    };

    // --- RENDERIZADO ---
    return (
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">

            {/* Encabezado de página */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10 gap-4">
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        Recursos y Guías de Estudio
                    </h1>
                    <p className="mt-2 text-lg text-gray-500">
                        Accede a documentos compartidos por la comunidad académica.
                    </p>
                </div>

                {/* Botón de subida — solo visible con sesión activa */}
                {session && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-2 self-center sm:self-auto bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Subir material
                    </button>
                )}
            </div>

            {/* Estado: cargando */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                    <svg className="animate-spin h-8 w-8 mb-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <p className="text-sm font-medium">Cargando materiales…</p>
                </div>
            )}

            {/* Estado: error */}
            {!loading && error && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <p className="text-red-600 font-medium mb-3">{error}</p>
                    <button
                        onClick={fetchMateriales}
                        className="text-sm font-semibold text-black underline hover:no-underline"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {/* Estado: sin materiales */}
            {!loading && !error && materiales.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
                    <svg className="h-12 w-12 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                    </svg>
                    <p className="text-lg font-medium text-gray-500">Aún no hay materiales.</p>
                    <p className="text-sm mt-1">¡Sé el primero en compartir uno!</p>
                </div>
            )}

            {/* Cuadrícula de materiales */}
            {!loading && !error && materiales.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {materiales.map((material) => (
                        <MaterialCard
                            key={material.id}
                            title={material.titulo}
                            subtitle={material.descripcion || 'Sin descripción'}
                            type={material.file_type}
                            fileUrl={material.url_archivo}
                        />
                    ))}
                </div>
            )}

            {/* Modal de subida */}
            {showModal && session && (
                <UploadModal
                    session={session}
                    onClose={() => setShowModal(false)}
                    onUploaded={fetchMateriales}
                />
            )}
        </div>
    );
};

export default MaterialPage;
