// Librerías externas
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Configuración de Supabase
import { supabase } from '../config/supabaseClient';

// Contexto de perfil
import { useProfile } from '../context/ProfileContext';

/**
 * UserProfile — Página de configuración de perfil del usuario.
 * Carga y guarda datos reales en la tabla `perfiles` de Supabase.
 * Es obligatoria la primera vez que el usuario llega tras registrarse.
 * Comunica el estado de completitud al ProfileContext para que
 * Navbar pueda bloquear o desbloquear la navegación.
 */
const UserProfile = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setIsProfileComplete } = useProfile();

    // State recibido desde el flujo de registro
    const fromSignup = location.state?.fromSignup ?? false;

    // --- ESTADOS DEL FORMULARIO ---
    const [nombre, setNombre] = useState(location.state?.initialNombre ?? '');
    const [institucion, setInstitucion] = useState(location.state?.initialInstitucion ?? '');
    const [bio, setBio] = useState(location.state?.initialBio ?? '');

    // --- ESTADOS DE UI ---
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Si ya tiene perfil guardado → UPDATE; si no → INSERT
    const [perfilExiste, setPerfilExiste] = useState(false);
    // Es true cuando detectamos que NO hay perfil guardado (formulario obligatorio)
    const [isProfileRequired, setIsProfileRequired] = useState(false);

    // Sesión activa
    const [session, setSession] = useState(null);

    // --- EFECTO: Control de acceso y carga de perfil ---
    useEffect(() => {
        const init = async () => {
            // 1. Obtener sesión
            const { data: { session: sesionActual } } = await supabase.auth.getSession();

            if (!sesionActual) {
                navigate('/login', { replace: true });
                return;
            }

            setSession(sesionActual);

            // 2. Consultar perfil existente
            const { data: perfil } = await supabase
                .from('perfiles')
                .select('nombre_completo, institucion, bio')
                .eq('id', sesionActual.user.id)
                .maybeSingle();

            if (perfil) {
                // Perfil encontrado → rellenar campos; es edición, no obligatorio
                setNombre(perfil.nombre_completo ?? '');
                setInstitucion(perfil.institucion ?? '');
                setBio(perfil.bio ?? '');
                setPerfilExiste(true);
                setIsProfileRequired(false);
                // Informar al contexto que el perfil está completo
                setIsProfileComplete(true);
            } else {
                // Sin perfil → formulario obligatorio
                setPerfilExiste(false);
                setIsProfileRequired(true);
                // Informar al contexto que el perfil NO está completo (bloquea nav)
                setIsProfileComplete(false);
                // Los campos ya tienen los valores de location.state (si vienen de registro)
            }

            setLoading(false);
        };

        init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- HANDLER: Guardar perfil ---
    const handleSave = async () => {
        setError('');
        setSuccessMsg('');

        // Validaciones obligatorias
        if (!nombre.trim() || !institucion.trim() || !bio.trim()) {
            setError('Por favor completa todos los campos: nombre, institución y bio.');
            return;
        }

        setSaving(true);

        try {
            let dbError;

            if (perfilExiste) {
                // UPDATE
                const { error } = await supabase
                    .from('perfiles')
                    .update({
                        nombre_completo: nombre.trim(),
                        institucion: institucion.trim(),
                        bio: bio.trim(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', session.user.id);
                dbError = error;
            } else {
                // INSERT
                const { error } = await supabase
                    .from('perfiles')
                    .insert({
                        id: session.user.id,
                        nombre_completo: nombre.trim(),
                        institucion: institucion.trim(),
                        bio: bio.trim(),
                    });
                dbError = error;
                if (!error) setPerfilExiste(true);
            }

            if (dbError) {
                setError('Error al guardar el perfil: ' + dbError.message);
                return;
            }

            // Perfil guardado: desbloquear navegación
            setIsProfileRequired(false);
            setIsProfileComplete(true);

            setSuccessMsg('¡Perfil actualizado correctamente!');

            // Si venía del registro (primer llenado), redirigir al inicio
            if (fromSignup || isProfileRequired) {
                setTimeout(() => navigate('/', { replace: true }), 1200);
            }

        } catch (err) {
            setError('Ocurrió un error inesperado. Inténtalo de nuevo.');
            console.error('Error al guardar el perfil:', err);
        } finally {
            setSaving(false);
        }
    };

    // --- RENDERIZADO: Pantalla de carga ---
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-500">
                Cargando perfil...
            </div>
        );
    }

    // --- RENDERIZADO PRINCIPAL ---
    return (
        <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-8">

                    {/* Título — indica si es primera vez o edición */}
                    <div className="mb-8 border-b border-gray-100 pb-4">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isProfileRequired
                                ? 'Configura tu perfil para continuar'
                                : 'Configuración de Perfil'}
                        </h1>
                        {isProfileRequired && (
                            <p className="mt-1 text-sm text-gray-500">
                                Completa la información antes de usar COLAB-ITO. Será visible para otros miembros.
                            </p>
                        )}
                    </div>

                    <div className="space-y-8">

                        {/* Sección de avatar */}
                        <div className="flex flex-col items-center sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                            <div className="relative group">
                                <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 overflow-hidden">
                                    {session?.user?.user_metadata?.avatar_url ? (
                                        <img
                                            src={session.user.user_metadata.avatar_url}
                                            alt="Avatar"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                            <div className="text-center sm:text-left">
                                <h3 className="text-lg font-medium text-gray-900">Foto de Perfil</h3>
                                <p className="text-sm text-gray-500">
                                    {session?.user?.user_metadata?.avatar_url
                                        ? 'Se usa tu foto de Google.'
                                        : 'Visible para otros miembros de COLAB-ITO.'}
                                </p>
                            </div>
                        </div>

                        {/* Campo: Nombre Completo */}
                        <div>
                            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre Completo <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="nombre"
                                value={nombre}
                                onChange={(e) => { setNombre(e.target.value); setError(''); setSuccessMsg(''); }}
                                placeholder="Ej. Juan Pérez García"
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm py-2 px-3 border"
                            />
                        </div>

                        {/* Campo: Institución */}
                        <div>
                            <label htmlFor="institucion" className="block text-sm font-medium text-gray-700 mb-1">
                                Institución <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="institucion"
                                value={institucion}
                                onChange={(e) => { setInstitucion(e.target.value); setError(''); setSuccessMsg(''); }}
                                placeholder="Ej. Instituto Tecnológico de Ocotlán"
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm py-2 px-3 border"
                            />
                        </div>

                        {/* Campo: Bio */}
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                                Bio / Descripción <span className="text-red-500">*</span>
                            </label>
                            <p className="text-xs text-gray-500 mb-2">Cuéntanos sobre ti, tus habilidades e intereses.</p>
                            <textarea
                                id="bio"
                                rows={4}
                                value={bio}
                                onChange={(e) => { setBio(e.target.value); setError(''); setSuccessMsg(''); }}
                                placeholder="Soy estudiante de Ingeniería en Sistemas..."
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm py-2 px-3 border"
                            />
                        </div>

                        {/* Mensaje de error */}
                        {error && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                                {error}
                            </p>
                        )}

                        {/* Mensaje de éxito */}
                        {successMsg && (
                            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                                {successMsg}
                            </p>
                        )}

                        {/* Botón de guardado */}
                        <div className="pt-4 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Guardando...' : (isProfileRequired ? 'Guardar y continuar' : 'Guardar Cambios')}
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
