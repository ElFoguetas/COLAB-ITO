// Librerías externas
import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';

// Configuración de Supabase
import { supabase } from './config/supabaseClient';

// Contexto de perfil
import { ProfileProvider, useProfile } from './context/ProfileContext';

// Layout principal
import LayoutPrincipal from './layouts/LayoutPrincipal';

// Páginas de la aplicación
import LandingPage from './pages/LandingPage';
import ProjectDetail from './pages/ProjectDetail';
import ProjectsPage from './pages/ProjectsPage';
import CreateProjectPage from './pages/CreateProjectPage';
import EditProjectPage from './pages/EditProjectPage';
import UserProfile from './pages/UserProfile';
import MaterialPage from './pages/MaterialPage';
import ChatRoom from './pages/ChatRoom';
import AuthPage from './pages/AuthPage';
import NotificationsPage from './pages/NotificationsPage';

// Dominios institucionales permitidos
const DOMINIOS_PERMITIDOS = ['@itocotlan.com', '@ocotlan.tecnm.mx'];

const esCorreoInstitucional = (email) => {
    const lower = (email || '').toLowerCase();
    return DOMINIOS_PERMITIDOS.some((d) => lower.endsWith(d));
};

/**
 * GlobalAuthHandler — Componente interno (sin UI) que vive dentro del Router.
 * Se suscribe a onAuthStateChange para interceptar el retorno de Google OAuth,
 * sin importar en qué ruta esté el usuario en ese momento.
 *
 * Responsabilidades:
 *  1. Validar dominio institucional del correo de Google.
 *  2. Comprobar si el usuario tiene perfil en la tabla `perfiles`.
 *  3. Redirigir a /profile (perfil obligatorio) o a / según corresponda.
 *  4. Actualizar el contexto de perfil.
 */
const GlobalAuthHandler = () => {
    const navigate = useNavigate();
    const { setIsProfileComplete } = useProfile();
    // Evitamos múltiples disparos en la misma carga de página
    const handled = useRef(false);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            // Sólo actuamos cuando Supabase confirma un login
            if (event !== 'SIGNED_IN' || !session?.user) return;

            const user = session.user;
            const proveedor = user.app_metadata?.provider;

            // Este handler solo gestiona el flujo de Google OAuth.
            // El flujo de email/contraseña lo maneja handleAuth en AuthPage directamente.
            if (proveedor !== 'google') return;

            // Evitar doble disparo dentro de la misma sesión de página
            if (handled.current) return;
            handled.current = true;

            // --- 1. Validar dominio institucional ---
            const email = user.email || '';
            if (!esCorreoInstitucional(email)) {
                // Correo no institucional: cerrar sesión y redirigir con mensaje de error
                await supabase.auth.signOut();
                navigate('/login', {
                    replace: true,
                    state: {
                        googleDomainError: true,
                        googleDomainEmail: email,
                    },
                });
                return;
            }

            // --- 2. Comprobar si ya tiene perfil ---
            const { data: perfil } = await supabase
                .from('perfiles')
                .select('id')
                .eq('id', user.id)
                .maybeSingle();

            if (!perfil) {
                // Usuario nuevo o sin perfil → perfil obligatorio
                setIsProfileComplete(false);
                const initialNombre =
                    user.user_metadata?.full_name ||
                    user.user_metadata?.name ||
                    '';

                navigate('/profile', {
                    replace: true,
                    state: {
                        fromSignup: true,
                        initialNombre,
                        initialInstitucion: '',
                        initialBio: '',
                    },
                });
            } else {
                // Tiene perfil → ir a la landing
                setIsProfileComplete(true);
                navigate('/', { replace: true });
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null; // Sin UI
};

/**
 * App — Componente raíz de la aplicación.
 * Configura el enrutamiento con react-router-dom y envuelve todas las
 * páginas dentro del LayoutPrincipal (que incluye Navbar y Footer).
 * Incluye ProfileProvider para compartir estado de perfil entre componentes.
 */
function App() {
    return (
        <Router>
            <ProfileProvider>
                {/* Handler global para el retorno de Google OAuth */}
                <GlobalAuthHandler />
                <LayoutPrincipal>
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/proyectos" element={<ProjectsPage />} />
                        <Route path="/proyectos/crear" element={<CreateProjectPage />} />
                        <Route path="/proyectos/:id/editar" element={<EditProjectPage />} />
                        <Route path="/proyectos/:id" element={<ProjectDetail />} />
                        <Route path="/profile" element={<UserProfile />} />
                        <Route path="/materials" element={<MaterialPage />} />
                        <Route path="/chat/:projectId" element={<ChatRoom />} />
                        <Route path="/login" element={<AuthPage />} />
                        <Route path="/notificaciones" element={<NotificationsPage />} />
                    </Routes>
                </LayoutPrincipal>
            </ProfileProvider>
        </Router>
    );
}

export default App;
