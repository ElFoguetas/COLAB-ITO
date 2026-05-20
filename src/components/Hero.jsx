// Librerías externas
import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Hero — Sección principal (héroe) de la LandingPage.
 * Muestra el eslogan, descripción y llamadas a la acción de la plataforma.
 * No recibe props.
 */
const Hero = () => {
    // --- RENDERIZADO ---
    return (
        <div className="relative isolate bg-white px-6 pt-14 lg:px-8">
            <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56 text-center">
                {/* Etiqueta de anuncio (visible en pantallas medianas en adelante) */}
                <div className="hidden sm:mb-8 sm:flex sm:justify-center">
                    <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 ring-1 ring-gray-900/10 hover:ring-gray-900/20">
                        Conectando el talento universitario.{' '}
                        <a href="#" className="font-semibold text-black">
                            <span className="absolute inset-0" aria-hidden="true" />
                            Saber más <span aria-hidden="true">&rarr;</span>
                        </a>
                    </div>
                </div>

                {/* Título principal */}
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                    Colabora en proyectos universitarios
                </h1>

                {/* Subtítulo */}
                <p className="mt-6 text-lg leading-8 text-gray-600">
                    La plataforma para conectar estudiantes de ingeniería y crear el futuro.
                </p>

                {/* Botones de acción */}
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <Link
                        to="/login?mode=register"
                        className="rounded-md bg-black px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black transition-colors"
                    >
                        Unirse ahora
                    </Link>
                    <Link to="/proyectos" className="text-sm font-semibold leading-6 text-gray-900">
                        Ver proyectos <span aria-hidden="true">→</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Hero;
