import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const ChatBot = () => {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Привет! Я помогу вам с вопросами о волонтерских мероприятиях. Спросите меня о регистрации, расписании или отчетах!' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input };
    setInput('');
    setMessages(prev => [...prev, userMsg, { 
      role: 'assistant', 
      content: '⌛ Обработка...' 
    }]);

    try {
      const response = await axios.post('http://localhost:3000/api/chat', {
        messages: [...messages, userMsg]
      });

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error('Некорректный ответ сервера');
      }

      const reply = response.data.choices[0].message.content;
      
      setMessages(prev => [...prev.slice(0, -1), { 
        role: 'assistant', 
        content: reply 
      }]);
      
    } catch (err) {
      const errorData = err.response?.data || {};
      const errorMessage = [
        errorData.error || 'Ошибка соединения',
        errorData.solution && `\n🛠️ ${errorData.solution}`
      ].filter(Boolean).join('');

      setMessages(prev => [...prev.slice(0, -1), { 
        role: 'assistant', 
        content: `⚠️ ${errorMessage}` 
      }]);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '20px', 
      right: '20px', 
      zIndex: 1000 
    }}>
      {isOpen && (
        <div style={{
          width: '400px',
          height: '500px',
          backgroundColor: '#e6f0ff',
          borderRadius: '10px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#2196F3', 
            color: 'white', 
            borderRadius: '10px 10px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Чат-помощник</h2>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                cursor: 'pointer',
                fontSize: '1.5rem',
                padding: '0 8px'
              }}
              aria-label="Закрыть чат"
            >
              ×
            </button>
          </div>

          <div style={{ 
            flex: 1,
            padding: '12px',
            overflowY: 'auto',
            backgroundColor: '#ffffff'
          }}>
            {messages.map((msg, index) => (
              <div 
                key={index}
                style={{ 
                  margin: '8px 0',
                  textAlign: msg.role === 'user' ? 'right' : 'left'
                }}
              >
                <div style={{
                  display: 'inline-block',
                  padding: '10px 15px',
                  borderRadius: msg.role === 'user' 
                    ? '15px 15px 0 15px' 
                    : '15px 15px 15px 0',
                  backgroundColor: msg.role === 'user' ? '#2196F3' : '#e0e0e0',
                  color: msg.role === 'user' ? 'white' : 'black',
                  maxWidth: '80%',
                  wordBreak: 'break-word',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ 
            padding: '12px',
            borderTop: '1px solid #ddd'
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Введите ваш вопрос..."
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                marginBottom: '8px',
                fontSize: '1rem',
                outline: 'none'
              }}
              aria-label="Поле ввода сообщения"
            />
            <button 
              onClick={handleSend}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'opacity 0.2s'
              }}
              onMouseOver={e => e.target.style.opacity = '0.8'}
              onMouseOut={e => e.target.style.opacity = '1'}
            >
              Отправить
            </button>
          </div>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          fontSize: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        aria-label={isOpen ? "Закрыть чат" : "Открыть чат"}
      >
        {isOpen ? '×' : '💬'}
      </button>
    </div>
  );
};

export default ChatBot;