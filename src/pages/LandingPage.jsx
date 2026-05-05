// Librerías externas
import React, { useState, useEffect } from 'react';

// Componentes internos
import Hero from '../components/Hero';
import ProjectsGrid from '../components/ProjectsGrid';

// Configuración de Supabase
import { supabase } from '../config/supabaseClient';

// Contexto de perfil
import { useProfile } from '../context/ProfileContext';

/**
 * LandingPage — Página de inicio de la aplicación.
 * Muestra el Hero y los 3 proyectos más recientes publicados en Supabase.
 */
const LandingPage = () => {
    const { isProfileComplete } = useProfile();

    // --- ESTADOS ---
    const [proyectos, setProyectos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- EFECTO: cargar proyectos destacados ---
    useEffect(() => {
        const fetchDestacados = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error: sbError } = await supabase
                    .from('proyectos')
                    .select('id, titulo, resumen, tecnologias, autor_nombre, estado, categoria')
                    .order('created_at', { ascending: false })
                    .limit(3);

                if (sbError) throw sbError;
                setProyectos(data ?? []);
            } catch (err) {
                console.error('[LandingPage] Error al cargar proyectos:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDestacados();
    }, []);

    // --- RENDERIZADO ---
    return (
        <>
            <Hero />
            <ProjectsGrid
                proyectos={proyectos}
                loading={loading}
                canPublish={isProfileComplete === true}
                titulo="Proyectos Destacados"
                subtitulo="Explora los proyectos innovadores publicados por la comunidad del tecnológico."
            />
            {/* Mensaje de error no intrusivo bajo el grid */}
            {error && (
                <div className="text-center py-4 text-sm text-gray-400">
                    No se pudieron cargar los proyectos. Intenta recargar la página.
                </div>
            )}
        </>
    );
};

export default LandingPage;
