import React, { FC, useState, useEffect, useRef, ReactNode } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useData } from '../../contexto/DataContext';
import { BotMessageSquareIcon, MicrophoneIcon, SendIcon } from '../ui/Icons';
import { View } from '../../types';

// --- AUDIO HELPERS ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const AIAssistant: FC<{ onNavigate: (view: View) => void; showToast: (message: string) => void }> = ({ onNavigate, showToast }) => {
    const { addClient, addSale, addPayment, clients } = useData();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string | ReactNode }[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
    const [isDragging, setIsDragging] = useState(false);
    const wasDraggedRef = useRef(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const orbRef = useRef<HTMLDivElement>(null);
    const chatRef = useRef<any>(null);
    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const lastPlayedMessageRef = useRef<ReactNode | null>(null);
    const [initialGreetingAudio, setInitialGreetingAudio] = useState<AudioBuffer | null>(null);
    const [ttsDisabled, setTtsDisabled] = useState(false);

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    useEffect(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
    }, []);

    const textToSpeechAndPlay = async (text: string) => {
        if (!GEMINI_API_KEY || !audioCtxRef.current || !text || ttsDisabled) return;
        
        setIsLoading(true);
        try {
            if (audioCtxRef.current.state === 'suspended') {
                await audioCtxRef.current.resume();
            }
            const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-3.1-flash-tts-preview",
                contents: [{ role: 'user', parts: [{ text }] }],
                config: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Kore' },
                        },
                    },
                },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioCtxRef.current) {
                const audioData = decode(base64Audio);
                const audioBuffer = await decodeAudioData(audioData, audioCtxRef.current, 24000, 1);
                const source = audioCtxRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioCtxRef.current.destination);
                source.start();
            }
        } catch (error: any) {
            if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
                setTtsDisabled(true);
            } else {
                console.error("TTS Error:", error);
                showToast("Desculpe, tive um problema com minha voz.");
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const preloadGreetingAudio = async (text: string) => {
        if (!GEMINI_API_KEY || !audioCtxRef.current || !text || ttsDisabled) return;
        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-3.1-flash-tts-preview",
                contents: [{ role: 'user', parts: [{ text }] }],
                config: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Kore' },
                        },
                    },
                },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioCtxRef.current) {
                const audioData = decode(base64Audio);
                const audioBuffer = await decodeAudioData(audioData, audioCtxRef.current, 24000, 1);
                setInitialGreetingAudio(audioBuffer);
            }
        } catch (error: any) {
            if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
                setTtsDisabled(true);
            } else {
                console.error("TTS Preload Error:", error);
            }
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

        const lastMessage = messages[messages.length - 1];
        if (
            lastMessage?.sender === 'ai' &&
            typeof lastMessage.text === 'string' &&
            lastMessage.text !== lastPlayedMessageRef.current
        ) {
            lastPlayedMessageRef.current = lastMessage.text;
            textToSpeechAndPlay(lastMessage.text);
        }
    }, [messages, isOpen]);

    useEffect(() => {
        const initialGreeting = `Olá, Ivone! 🌸 Sou sua assistente e estou pronta para te ajudar com as encomendas da revista e a ver quem falta pagar. O que você quer anotar no caderninho hoje? 📖✨`;
        setMessages([{ sender: 'ai', text: initialGreeting }]);
        preloadGreetingAudio(initialGreeting);
    }, []);

    useEffect(() => {
        if (!GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY not found.");
            return;
        }
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const clientNames = clients.map(c => c.fullName).join(', ') || 'Nenhum';
        
        const systemInstruction = `Você é a "Assistente Ivone", o cérebro do app Ivone-2026. Sua função é ajudar uma revendedora de cosméticos (Natura, Boticário) a organizar suas vendas e cobranças de forma ultra simples.

DIRETRIZES DE ESTILO:
- Use uma linguagem acolhedora, simples e sem termos técnicos (nada de "database", "input", "interface" ou "software").
- Chame as ações de "anotações no caderninho".
- Use emojis para ser amigável (🌸, 📖, 💰, ✨, ✅).

1. FLUXO DE VENDAS:
Como ela não trabalha com estoque fixo, o foco é registrar o que o cliente escolheu na revista para ela poder pedir depois.
- Se o usuário disser algo como "A vizinha comprou um perfume Essencial da Natura de 180 reais e já me deu 50", você deve responder de forma carinhosa confirmando os valores.

2. REGRAS DE OURO:
- Se ela perguntar "Quem me deve?", liste os nomes e os valores de forma direta, ex: "A Maria ainda falta pagar R$ 40,00 do batom".
- O foco é: Comprou -> Entregou -> Recebeu.
- Se faltar o nome da cliente ou o valor, pergunte com doçura.

SAÍDA ESTRUTURADA (INTERNA):
Extraia dados de vendas e pagamentos. Clientes existentes: ${clientNames}.
Quando tiver dados suficientes para uma ação, responda APENAS com o JSON correspondente.
Para Vendas: {"comando": "REGISTRAR_PEDIDO", "dados": { "cliente": "Nome", "item": "Nome do Produto", "total": 180.0, "entrada": 50.0 }}
Para Clientes: {"comando": "SALVAR_CLIENTE", "dados": { "nome": "Nome", "telefone": "...", "endereco": "..." }}
Para Pagamentos: {"comando": "SALVAR_PAGAMENTO", "dados": { "cliente": "Nome", "valor": 50.0 }}
Para Navegação: {"comando": "NAVEGAR", "dados": { "destino": "dashboard" | "clients" | "sales_view" | "pending_payments" | "reports" | "history" }}

IMPORTANTE: Não adicione texto antes ou depois do JSON se estiver executando um comando. Se estiver apenas conversando, seja a melhor amiga da Ivone.`;

        chatRef.current = ai.chats.create({ 
            model: 'gemini-3-flash-preview',
            config: {
                systemInstruction: systemInstruction
            }
        });
    }, [clients]);

     useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'pt-BR';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error || event);
                if (event.error === 'not-allowed') {
                    showToast("Permissão de microfone negada.");
                }
                setIsListening(false);
            };
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setUserInput(transcript);
                sendMessageToAI(transcript);
            };
            recognitionRef.current = recognition;
        }
    }, []);

    const handleAction = (comando: string, dados: any) => {
        let successMessage = '';
        try {
            switch (comando) {
                case 'REGISTRAR_PEDIDO':
                case 'SALVAR_VENDA': {
                    const clientName = dados.cliente || dados.nome;
                    const client = clients.find(c => c.fullName.toLowerCase() === clientName.toLowerCase());
                    if (!client) throw new Error(`Cliente ${clientName} não encontrada.`);
                    
                    const totalValue = parseFloat(dados.total || dados.valor);
                    const entryValue = parseFloat(dados.entrada || dados.pago || 0);
                    const remaining = totalValue - entryValue;

                    addSale({
                        clientId: client.id,
                        saleDate: new Date().toISOString().split('T')[0],
                        productCode: '',
                        productName: dados.item || dados.produto,
                        quantity: 1,
                        unitPrice: totalValue,
                        observation: `Encomenda via caderninho. Entrada: R$ ${entryValue}. Falta: R$ ${remaining}.`,
                    });

                    if (entryValue > 0) {
                        addPayment({
                            clientId: client.id,
                            paymentDate: new Date().toISOString().split('T')[0],
                            amount: entryValue,
                            observation: `Entrada para: ${dados.item || dados.produto}`,
                        });
                    }

                    successMessage = `Anotado, Ivone! 📖 Já coloquei no caderninho que a ${client.fullName} quer o ${dados.item || dados.produto}. Ela te deu R$ ${entryValue.toFixed(2)} e o restante (R$ ${remaining.toFixed(2)}) ficou para quando você entregar o produto. ✅`;
                    break;
                }
                case 'SALVAR_CLIENTE':
                    addClient({
                        fullName: dados.nome,
                        cep: '',
                        street: dados.endereco || '',
                        number: '',
                        complement: '',
                        neighborhood: '',
                        city: '',
                        state: '',
                        phone: dados.telefone || '',
                        email: '',
                        cpf: dados.cpf || '',
                        observation: '',
                    });
                    successMessage = `Tudo bem, Ivone! Já coloquei o nome da ${dados.nome} no seu caderninho de clientes. 🌸`;
                    break;
                case 'SALVAR_PAGAMENTO': {
                    const client = clients.find(c => c.fullName.toLowerCase() === dados.cliente.toLowerCase());
                    if (!client) throw new Error(`Cliente ${dados.cliente} não encontrada.`);
                    addPayment({
                        clientId: client.id,
                        paymentDate: new Date().toISOString().split('T')[0],
                        amount: parseFloat(dados.valor),
                        observation: 'Pagamento registrado via assistente',
                    });
                     successMessage = `Prontinho, Ivone! Registrei o pagamento de R$ ${dados.valor} da ${client.fullName}. 💸`;
                    break;
                }
                case 'NAVEGAR':
                    onNavigate(dados.destino);
                    successMessage = `Indo para ${dados.destino}... 🚀`;
                    break;
                default:
                    throw new Error('Ação desconhecida.');
            }
            showToast(successMessage);
            setMessages(prev => [...prev, { sender: 'ai', text: successMessage }]);

        } catch (error: any) {
            const errorMessage = `Ivone, deu um probleminha: ${error.message} 😥`;
            setMessages(prev => [...prev, { sender: 'ai', text: errorMessage }]);
        }
    };
    
    const sendMessageToAI = async (message: string) => {
        if (!message.trim() || !chatRef.current) return;
        
        const newMessages = [...messages, { sender: 'user' as const, text: message }];
        setMessages(newMessages);
        setUserInput('');
        setIsLoading(true);

        try {
            const result = await chatRef.current.sendMessage({
                message: message
            });
            const responseText = result.text.trim();
            
            if (responseText.startsWith('{') && responseText.endsWith('}')) {
                try {
                    const jsonResponse = JSON.parse(responseText);
                    if (jsonResponse.comando && jsonResponse.dados) {
                        handleAction(jsonResponse.comando, jsonResponse.dados);
                    } else if (jsonResponse.action && jsonResponse.data) {
                        // Legacy support if model gets confused
                        handleAction(jsonResponse.action, jsonResponse.data);
                    }
                } catch (e) {
                    setMessages(prev => [...prev, { sender: 'ai', text: responseText }]);
                }
            } else {
                 setMessages(prev => [...prev, { sender: 'ai', text: responseText }]);
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { sender: 'ai', text: 'Desculpe, estou com um problema para me conectar. Tente novamente. 😥' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessageToAI(userInput);
    };
    
    const handleListen = () => {
        if (!recognitionRef.current) {
            alert('Desculpe, seu navegador não suporta comandos de voz.');
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
    };

    // Drag handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (orbRef.current) {
            orbRef.current.style.transition = 'none';
        }
        wasDraggedRef.current = false;
        setIsDragging(true);
        dragStartPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (orbRef.current) {
            orbRef.current.style.transition = 'none';
        }
        wasDraggedRef.current = false;
        setIsDragging(true);
        const touch = e.touches[0];
        dragStartPos.current = {
            x: touch.clientX - position.x,
            y: touch.clientY - position.y
        };
    };

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            wasDraggedRef.current = true;
            const newX = Math.max(0, Math.min(window.innerWidth - 64, e.clientX - dragStartPos.current.x));
            const newY = Math.max(0, Math.min(window.innerHeight - 64, e.clientY - dragStartPos.current.y));
            setPosition({ x: newX, y: newY });
        };
        
        const handleGlobalTouchMove = (e: TouchEvent) => {
            if (!isDragging) return;
            wasDraggedRef.current = true;
            const touch = e.touches[0];
            const newX = Math.max(0, Math.min(window.innerWidth - 64, touch.clientX - dragStartPos.current.x));
            const newY = Math.max(0, Math.min(window.innerHeight - 64, touch.clientY - dragStartPos.current.y));
            setPosition({ x: newX, y: newY });
        };

        const handleGlobalMouseUp = () => {
            if (orbRef.current) {
                orbRef.current.style.transition = '';
            }
            setIsDragging(false);
        };

        const handleGlobalTouchEnd = () => {
            if (orbRef.current) {
                orbRef.current.style.transition = '';
            }
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
            window.addEventListener('touchmove', handleGlobalTouchMove);
            window.addEventListener('touchend', handleGlobalTouchEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('touchmove', handleGlobalTouchMove);
            window.removeEventListener('touchend', handleGlobalTouchEnd);
        };
    }, [isDragging]);

    const handleOrbClick = async () => {
        if (wasDraggedRef.current) return;

        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume();
        }

        const playGreeting = () => {
            const greetingMessage = messages.find(m => m.sender === 'ai');
            if (greetingMessage && typeof greetingMessage.text === 'string') {
                lastPlayedMessageRef.current = greetingMessage.text;
                if (initialGreetingAudio && audioCtxRef.current) {
                    try {
                        const source = audioCtxRef.current.createBufferSource();
                        source.buffer = initialGreetingAudio;
                        source.connect(audioCtxRef.current.destination);
                        source.start();
                    } catch (e) {
                        console.error("Error playing preloaded audio", e);
                    }
                }
            }
        };

        if (!isOpen) {
            playGreeting();
        }
        setIsOpen(!isOpen);
    };

    return (
        <>
            <div 
                ref={orbRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onClick={handleOrbClick}
                style={{ left: position.x, top: position.y }}
                className={`fixed z-50 w-16 h-16 rounded-full cursor-pointer flex items-center justify-center shadow-2xl transition-transform duration-300 hover:scale-110 active:scale-95 ${isDragging ? 'scale-110' : ''} ${isOpen ? 'bg-gradient-to-br from-rose-500 to-pink-600' : 'bg-gradient-to-br from-pink-400 to-rose-500 animate-pulse-glow'}`}
            >
                {isOpen ? (
                    <span className="text-white text-2xl font-bold">&times;</span>
                ) : (
                    <BotMessageSquareIcon className="w-8 h-8 text-white" />
                )}
            </div>

            {isOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[80vh] animate-scale-up">
                        <header className="bg-gradient-to-r from-pink-500 to-rose-500 p-6 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                                    <BotMessageSquareIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg italic">Assistente Ivone ✨</h3>
                                    <p className="text-xs text-pink-100">Seu caderninho inteligente</p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-2xl hover:rotate-90 transition-transform">&times;</button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-pink-50/30">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in`}>
                                    <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${msg.sender === 'user' ? 'bg-pink-500 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-pink-100'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start animate-pulse">
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-pink-100 flex gap-1">
                                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-100"></div>
                                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-200"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleFormSubmit} className="p-4 bg-white border-t border-pink-100 flex gap-2 items-center">
                            <button 
                                type="button" 
                                onClick={handleListen}
                                className={`p-3 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-pink-100 text-pink-600 hover:bg-pink-200'}`}
                            >
                                <MicrophoneIcon className="w-6 h-6" />
                            </button>
                            <input 
                                type="text" 
                                value={userInput}
                                onChange={e => setUserInput(e.target.value)}
                                placeholder="Converse com sua assistente... 🌸"
                                className="flex-1 bg-gray-100 border-none rounded-full px-5 py-3 focus:ring-2 focus:ring-pink-500 transition-all outline-none"
                            />
                            <button 
                                type="submit" 
                                disabled={!userInput.trim() || isLoading}
                                className="p-3 bg-pink-500 text-white rounded-full hover:bg-pink-600 disabled:opacity-50 disabled:hover:bg-pink-500 transition-all shadow-md active:scale-90"
                            >
                                <SendIcon className="w-6 h-6" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};
