// Librerías externas
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';

// Configuración de Supabase
import { supabase } from '../config/supabaseClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convierte una cadena separada por comas en un array limpio. */
const parsearArray = (str) =>
    str
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

// ─── TagInput ──────────────────────────────────────────────────────────────────
/**
 * TagInput — Input de texto + lista de tags interactivos.
 * Reutiliza la misma lógica que en CreateProjectPage.
 */
const TagInput = ({ tags, onChange, placeholder }) => {
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef(null);

    const agregarDesdeInput = () => {
        const nuevos = parsearArray(inputValue);
        if (nuevos.length > 0) {
            const sinDuplicados = [...new Set([...tags, ...nuevos])];
            onChange(sinDuplicados);
            setInputValue('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            agregarDesdeInput();
        }
        if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
            onChange(tags.slice(0, -1));
        }
    };

    const eliminarTag = (index) => {
        onChange(tags.filter((_, i) => i !== index));
    };

    return (
        <div
            className="min-h-[44px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 flex flex-wrap gap-1.5 cursor-text focus-within:border-gray-400 focus-within:bg-white transition-colors"
            onClick={() => inputRef.current?.focus()}
        >
            {tags.map((tag, i) => (
                <span
                    key={i}
                    className="inline-flex items-center gap-1 bg-gray-900 text-white text-xs px-2.5 py-1 rounded-full font-medium"
                >
                    {tag}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); eliminarTag(i); }}
                        className="ml-0.5 text-gray-300 hover:text-white transition-colors"
                        aria-label={`Eliminar ${tag}`}
                    >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </span>
            ))}
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={agregarDesdeInput}
                placeholder={tags.length === 0 ? placeholder : ''}
                className="flex-1 min-w-[120px] bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
            />
        </div>
    );
};

// ─── FormSection ──────────────────────────────────────────────────────────────
const FormSection = ({ numero, titulo, descripcion, children }) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4 flex items-start gap-4">
            <span className="flex-shrink-0 h-7 w-7 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">
                {numero}
            </span>
            <div>
                <h2 className="text-sm font-semibold text-gray-900">{titulo}</h2>
                {descripcion && (
                    <p className="text-xs text-gray-500 mt-0.5">{descripcion}</p>
                )}
            </div>
        </div>
        <div className="px-6 py-5 space-y-4">
            {children}
        </div>
    </div>
);

// ─── Campo ────────────────────────────────────────────────────────────────────
const Campo = ({ label, required, error, children, hint }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
        {hint && !error && (
            <p className="mt-1 text-xs text-gray-400">{hint}</p>
        )}
        {error && (
            <p className="mt-1 text-xs text-red-600">{error}</p>
        )}
    </div>
);

// ─── Estilos base de los inputs ───────────────────────────────────────────────
const INPUT_CLASS =
    'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-gray-400 focus:bg-white focus:outline-none transition-colors';

const SELECT_CLASS =
    'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 focus:border-gray-400 focus:bg-white focus:outline-none transition-colors appearance-none cursor-pointer';

const SELECT_STYLE = {
    backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1.25em 1.25em',
};

// ─── Spinner de carga genérico ────────────────────────────────────────────────
const Spinner = ({ mensaje = 'Cargando…' }) => (
    <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
            <svg className="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-sm">{mensaje}</span>
        </div>
    </div>
);

// ─── AccesoDenegado ───────────────────────────────────────────────────────────
const AccesoDenegado = ({ motivo }) => (
    <div className="max-w-4xl mx-auto px-4 py-20 sm:px-6 lg:px-8 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 mx-auto border border-amber-200">
            <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Acceso denegado</h1>
        <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">
            {motivo || 'No tienes permiso para editar este proyecto.'}
        </p>
        <Link
            to="/proyectos"
            className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
        >
            ← Ver todos los proyectos
        </Link>
    </div>
);

// ─── EditProjectPage ───────────────────────────────────────────────────────────
/**
 * EditProjectPage — Página dedicada para editar un proyecto existente.
 * Protegida: solo el creador del proyecto puede acceder.
 *
 * Ruta: /proyectos/:id/editar
 */
const EditProjectPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // --- ESTADOS DE ACCESO ---
    const [verificando, setVerificando]     = useState(true);
    const [accesoDenegado, setAccesoDenegado] = useState(null); // null | string (motivo)
    const [sessionUserId, setSessionUserId] = useState(null);

    // --- ESTADO DEL FORMULARIO ---
    const [form, setForm] = useState({
        titulo:      '',
        resumen:     '',
        descripcion: '',
        categoria:   '',
        institucion: '',
        modalidad:   'remoto',
        estado:      'abierto',
    });
    const [tecnologias, setTecnologias] = useState([]);
    const [vacantes, setVacantes]       = useState([]);

    // --- ESTADO DE ENVÍO ---
    const [guardando, setGuardando]       = useState(false);
    const [errores, setErrores]           = useState({});
    const [errorGeneral, setErrorGeneral] = useState('');

    // ─── Protección de ruta + carga del proyecto ──────────────────────────────
    useEffect(() => {
        if (!id) {
            navigate('/proyectos', { replace: true });
            return;
        }

        const verificarYCargar = async () => {
            // 1. Verificar sesión activa
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                navigate('/login', { replace: true });
                return;
            }

            const userId = session.user.id;
            setSessionUserId(userId);

            // 2. Cargar el proyecto
            const { data: proyecto, error: sbError } = await supabase
                .from('proyectos')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (sbError || !proyecto) {
                navigate('/proyectos', { replace: true });
                return;
            }

            // 3. Verificar que el usuario sea el creador
            if (proyecto.creator_auth_id !== userId) {
                setAccesoDenegado('Solo el creador del proyecto puede editarlo.');
                setVerificando(false);
                return;
            }

            // 4. Pre-cargar los datos del formulario
            setForm({
                titulo:      proyecto.titulo      ?? '',
                resumen:     proyecto.resumen     ?? '',
                descripcion: proyecto.descripcion ?? '',
                categoria:   proyecto.categoria   ?? '',
                institucion: proyecto.institucion ?? '',
                modalidad:   proyecto.modalidad   ?? 'remoto',
                estado:      proyecto.estado      ?? 'abierto',
            });
            setTecnologias(Array.isArray(proyecto.tecnologias) ? proyecto.tecnologias : []);
            setVacantes(Array.isArray(proyecto.vacantes) ? proyecto.vacantes : []);
            setVerificando(false);
        };

        verificarYCargar();
    }, [id, navigate]);

    // ─── Actualizar campo del formulario ──────────────────────────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errores[name]) {
            setErrores((prev) => ({ ...prev, [name]: '' }));
        }
    };

    // ─── Validación ───────────────────────────────────────────────────────────
    const validar = () => {
        const nuevosErrores = {};
        if (!form.titulo.trim())       nuevosErrores.titulo      = 'El título es obligatorio.';
        if (!form.resumen.trim())      nuevosErrores.resumen     = 'El resumen es obligatorio.';
        if (!form.descripcion.trim())  nuevosErrores.descripcion = 'La descripción es obligatoria.';
        if (!form.categoria.trim())    nuevosErrores.categoria   = 'La categoría es obligatoria.';
        if (!form.institucion.trim())  nuevosErrores.institucion = 'La institución es obligatoria.';
        if (tecnologias.length === 0)  nuevosErrores.tecnologias = 'Agrega al menos una tecnología o etiqueta.';
        if (vacantes.length === 0)     nuevosErrores.vacantes    = 'Agrega al menos un perfil o vacante requerida.';
        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    // ─── Guardar cambios ──────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorGeneral('');

        if (!validar()) return;

        // Doble verificación: confirmar que el usuario sigue siendo el creador
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || session.user.id !== sessionUserId) {
            setErrorGeneral('No tienes permiso para guardar estos cambios.');
            return;
        }

        setGuardando(true);
        try {
            // --- 1. Moderación con Gemini ---
            const { moderateSubmission } = await import('../services/moderationService');
            const { MODERATION_STATUS } = await import('../constants/moderation');

            const modResult = await moderateSubmission('project', {
                titulo: form.titulo.trim(),
                resumen: form.resumen.trim(),
                descripcion: form.descripcion.trim(),
                tecnologias,
                vacantes
            });

            if (modResult.status === MODERATION_STATUS.REJECTED) {
                setErrorGeneral('Tus cambios no cumplen con nuestras políticas de comunidad y han sido rechazados. Por favor, revisa el contenido.');
                setGuardando(false);
                return;
            }

            const { error: sbError } = await supabase
                .from('proyectos')
                .update({
                    titulo:      form.titulo.trim(),
                    resumen:     form.resumen.trim(),
                    descripcion: form.descripcion.trim(),
                    categoria:   form.categoria.trim(),
                    institucion: form.institucion.trim(),
                    modalidad:   form.modalidad,
                    estado:      form.estado,
                    tecnologias: tecnologias,
                    vacantes:    vacantes,
                    // updated_at se actualiza automáticamente en Supabase
                    // creator_auth_id y autor_nombre NO se modifican
                })
                .eq('id', id)
                .eq('creator_auth_id', sessionUserId); // Filtro de seguridad adicional

            if (sbError) throw sbError;

            // Redirigir al detalle actualizado
            navigate(`/proyectos/${id}`, { replace: true });
        } catch (err) {
            console.error('[EditProjectPage] Error al guardar:', err);
            setErrorGeneral(
                err.message || 'No se pudieron guardar los cambios. Verifica tu conexión e inténtalo de nuevo.'
            );
        } finally {
            setGuardando(false);
        }
    };

    // ─── Estados de pantalla ──────────────────────────────────────────────────
    if (verificando) return <Spinner mensaje="Verificando acceso…" />;
    if (accesoDenegado) return <AccesoDenegado motivo={accesoDenegado} />;

    // ─── RENDERIZADO ──────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50">

            {/* ── Encabezado ──────────────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-200">
                <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
                    <nav className="mb-4">
                        <Link
                            to={`/proyectos/${id}`}
                            className="text-sm text-gray-500 hover:text-gray-900 transition-colors inline-flex items-center gap-1.5"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                            Volver al proyecto
                        </Link>
                    </nav>

                    <div className="flex items-center gap-3">
                        {/* Badge de edición */}
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                            </svg>
                            Modo edición
                        </span>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mt-2">
                        Editar proyecto
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Actualiza la información de tu proyecto. Los campos marcados con{' '}
                        <span className="text-red-500 font-medium">*</span> son obligatorios.
                    </p>
                </div>
            </div>

            {/* ── Formulario ──────────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} noValidate>
                <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-5">

                    {/* Error general */}
                    {errorGeneral && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                            <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                            {errorGeneral}
                        </div>
                    )}

                    {/* ── Sección 1: Información básica ─────────────────────── */}
                    <FormSection
                        numero="1"
                        titulo="Información básica"
                        descripcion="El nombre y resumen del proyecto son lo primero que verán otros estudiantes."
                    >
                        <Campo label="Título del proyecto" required error={errores.titulo}>
                            <input
                                type="text"
                                name="titulo"
                                value={form.titulo}
                                onChange={handleChange}
                                placeholder="Ej. Sistema de Riego Inteligente con IoT"
                                className={`${INPUT_CLASS} ${errores.titulo ? 'border-red-300 focus:border-red-400' : ''}`}
                                maxLength={120}
                            />
                        </Campo>

                        <Campo
                            label="Resumen corto"
                            required
                            error={errores.resumen}
                            hint="Una o dos frases que describan el proyecto. Se muestra en la tarjeta del catálogo."
                        >
                            <textarea
                                name="resumen"
                                value={form.resumen}
                                onChange={handleChange}
                                placeholder="Ej. Plataforma web para optimizar el riego agrícola mediante sensores conectados."
                                rows={2}
                                className={`${INPUT_CLASS} resize-none ${errores.resumen ? 'border-red-300 focus:border-red-400' : ''}`}
                                maxLength={280}
                            />
                        </Campo>
                    </FormSection>

                    {/* ── Sección 2: Descripción completa ───────────────────── */}
                    <FormSection
                        numero="2"
                        titulo="Descripción completa"
                        descripcion="Explica el problema que resuelve, cómo funciona y qué hace tu proyecto especial."
                    >
                        <Campo label="Descripción" required error={errores.descripcion}>
                            <textarea
                                name="descripcion"
                                value={form.descripcion}
                                onChange={handleChange}
                                placeholder="Describe el contexto del problema, la solución propuesta, el estado actual del desarrollo..."
                                rows={8}
                                className={`${INPUT_CLASS} resize-y ${errores.descripcion ? 'border-red-300 focus:border-red-400' : ''}`}
                            />
                        </Campo>
                    </FormSection>

                    {/* ── Sección 3: Clasificación ───────────────────────────── */}
                    <FormSection
                        numero="3"
                        titulo="Clasificación del proyecto"
                        descripcion="Esta información ayuda a otros a encontrar tu proyecto con los filtros del catálogo."
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Campo label="Categoría o área" required error={errores.categoria}>
                                <input
                                    type="text"
                                    name="categoria"
                                    value={form.categoria}
                                    onChange={handleChange}
                                    placeholder="Ej. Web, IoT, IA, Apps Móviles…"
                                    className={`${INPUT_CLASS} ${errores.categoria ? 'border-red-300 focus:border-red-400' : ''}`}
                                    maxLength={60}
                                />
                            </Campo>

                            <Campo label="Institución" required error={errores.institucion}>
                                <input
                                    type="text"
                                    name="institucion"
                                    value={form.institucion}
                                    onChange={handleChange}
                                    placeholder="Ej. ITO Ocotlán"
                                    className={`${INPUT_CLASS} ${errores.institucion ? 'border-red-300 focus:border-red-400' : ''}`}
                                    maxLength={120}
                                />
                            </Campo>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Campo label="Modalidad" required>
                                <select
                                    name="modalidad"
                                    value={form.modalidad}
                                    onChange={handleChange}
                                    className={SELECT_CLASS}
                                    style={SELECT_STYLE}
                                >
                                    <option value="remoto">Remoto</option>
                                    <option value="híbrido">Híbrido</option>
                                </select>
                            </Campo>

                            <Campo label="Estado del proyecto" required>
                                <select
                                    name="estado"
                                    value={form.estado}
                                    onChange={handleChange}
                                    className={SELECT_CLASS}
                                    style={SELECT_STYLE}
                                >
                                    <option value="abierto">Abierto</option>
                                    <option value="en progreso">En progreso</option>
                                    <option value="cerrado">Cerrado</option>
                                </select>
                            </Campo>
                        </div>
                    </FormSection>

                    {/* ── Sección 4: Tecnologías y vacantes ─────────────────── */}
                    <FormSection
                        numero="4"
                        titulo="Tecnologías y perfiles requeridos"
                        descripcion="Agrega tags separados por coma o presionando Enter. Puedes eliminarlos haciendo clic en la ×."
                    >
                        <Campo
                            label="Tecnologías o etiquetas"
                            required
                            error={errores.tecnologias}
                            hint="Ej. React, Node.js, PostgreSQL, Figma…"
                        >
                            <TagInput
                                tags={tecnologias}
                                onChange={setTecnologias}
                                placeholder="Escribe y presiona Enter o coma…"
                            />
                            {errores.tecnologias && (
                                <p className="mt-1 text-xs text-red-600">{errores.tecnologias}</p>
                            )}
                        </Campo>

                        <Campo
                            label="Vacantes o perfiles requeridos"
                            required
                            error={errores.vacantes}
                            hint="Ej. Desarrollador Frontend, Diseñador UX, Backend con Python…"
                        >
                            <TagInput
                                tags={vacantes}
                                onChange={setVacantes}
                                placeholder="Escribe y presiona Enter o coma…"
                            />
                            {errores.vacantes && (
                                <p className="mt-1 text-xs text-red-600">{errores.vacantes}</p>
                            )}
                        </Campo>
                    </FormSection>

                    {/* ── Acciones ──────────────────────────────────────────── */}
                    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2 pb-8">
                        <Link
                            to={`/proyectos/${id}`}
                            className="flex-1 sm:flex-none text-center rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-500 hover:text-gray-900 transition-all duration-150"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={guardando}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {guardando ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Guardando…
                                </>
                            ) : (
                                <>
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                    Guardar cambios
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </form>
        </div>
    );
};

export default EditProjectPage;
