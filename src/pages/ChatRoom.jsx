// Librerías externas
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';

// Datos mock
import { mensajesIniciales } from '../data/mockData';

/**
 * ChatRoom — Sala de chat de un proyecto específico.
 * Muestra el historial de conversación y permite enviar nuevos mensajes.
 * Lee el parámetro `projectId` de la URL para identificar el proyecto.
 */
const ChatRoom = () => {
    // --- ESTADOS ---
    const { projectId } = useParams();
    const [inputValue, setInputValue] = useState('');

    // Se inicializa con los mensajes de prueba definidos en mockData
    const [messages, setMessages] = useState(mensajesIniciales);

    // --- REFS ---
    // Referencia al final de la lista de mensajes para hacer scroll automático
    const messagesEndRef = useRef(null);

    // --- EFECTOS ---
    /**
     * Desplaza la vista hasta el último mensaje cada vez que
     * el array de mensajes cambia (al recibir o enviar un mensaje).
     */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // --- HANDLERS ---
    /**
     * Maneja el envío del formulario de mensaje.
     * Crea un nuevo objeto de mensaje y lo añade al estado,
     * luego limpia el campo de texto.
     * @param {React.FormEvent} e - Evento del formulario
     */
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (inputValue.trim() === '') return;

        const newMessage = {
            id: messages.length + 1,
            sender: 'me',
            text: inputValue,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            name: 'Yo'
        };

        setMessages([...messages, newMessage]);
        setInputValue('');
    };

    // --- RENDERIZADO ---
    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Encabezado con botón de regreso e indicador de conexión */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center shadow-sm sticky top-0 z-10">
                <Link to={`/project/${projectId}`} className="mr-4 text-gray-500 hover:text-gray-900">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-lg font-bold text-gray-900">Proyecto: COLAB-ITO</h1>
                    <p className="text-xs text-green-500 font-medium">● 3 Conectados</p>
                </div>
            </div>

            {/* Área de mensajes con scroll */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}
                    >
                        <span className="text-xs text-gray-500 mb-1 ml-1 mr-1">{msg.name}</span>
                        <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${msg.sender === 'me'
                                ? 'bg-black text-white rounded-br-none'
                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                }`}
                        >
                            <p className="text-sm">{msg.text}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 mx-1">{msg.time}</span>
                    </div>
                ))}
                {/* Marcador invisible para el scroll automático */}
                <div ref={messagesEndRef} />
            </div>

            {/* Formulario de envío de mensaje */}
            <div className="bg-white border-t border-gray-200 p-4 sticky bottom-0">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 rounded-full border-gray-300 bg-gray-50 focus:border-black focus:ring-black px-4 py-2 text-sm shadow-sm"
                    />
                    <button
                        type="submit"
                        className="bg-black text-white p-2 rounded-full hover:bg-gray-800 transition-colors shadow-sm flex-shrink-0"
                    >
                        <svg className="h-5 w-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatRoom;
