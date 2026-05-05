import React from 'react';

const Footer = () => {
    return (
        <footer className="bg-white border-t border-gray-200 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
                <p>&copy; {new Date().getFullYear()} COLAB-ITO. Todos los derechos reservados.</p>
                <div className="mt-2 space-x-4">
                    <a href="#" className="hover:text-black transition-colors">Términos</a>
                    <a href="#" className="hover:text-black transition-colors">Privacidad</a>
                    <a href="#" className="hover:text-black transition-colors">Contacto</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
