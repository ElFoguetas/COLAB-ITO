import React, { createContext, useContext, useState } from 'react';

/**
 * ProfileContext — Contexto global para el estado de perfil del usuario.
 *
 * isProfileComplete: true  → el usuario tiene perfil guardado, navegación libre.
 * isProfileComplete: false → el usuario no tiene perfil, Navbar muestra bloqueo.
 * isProfileComplete: null  → estado inicial (desconocido aún, no bloquear UI).
 *
 * setIsProfileComplete: actualiza el flag desde UserProfile o GlobalAuthHandler.
 */
const ProfileContext = createContext({
    isProfileComplete: null,
    setIsProfileComplete: () => {},
});

export const ProfileProvider = ({ children }) => {
    // null = aún no se sabe; true = tiene perfil; false = no tiene perfil
    const [isProfileComplete, setIsProfileComplete] = useState(null);

    return (
        <ProfileContext.Provider value={{ isProfileComplete, setIsProfileComplete }}>
            {children}
        </ProfileContext.Provider>
    );
};

/** Hook de conveniencia para consumir el contexto. */
export const useProfile = () => useContext(ProfileContext);
