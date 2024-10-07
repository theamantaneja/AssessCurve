// ChatBox.jsx

import React, { useState, useEffect, useRef } from 'react';
import axios from './axiosConfig.js';
import ReactMarkdown from 'react-markdown';
import MermaidRenderer from './MermaidRenderer.jsx';
import './style.css';

const ChatBox = ({ role }) => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [user, setUser] = useState({ role });
  const [currentStep, setCurrentStep] = useState(0);
  const [isCollectionComplete, setIsCollectionComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const chatHistoryRef = useRef(null);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSend = async () => {
    if (message.trim() === '' || isProcessing) return;

    setIsProcessing(true);

    setChatHistory((prevHistory) => [
      ...prevHistory,
      { type: 'user', text: message },
    ]);

    try {
      let response;
      if (isCollectionComplete) {
        if (message.toLowerCase().includes('explain')) {
          const topic = message.replace('explain', '').trim();
          response = await axios.post('/api/explain', { topic });
          const { explanation, diagram } = response.data;

          setChatHistory((prevHistory) => [
            ...prevHistory,
            { type: 'bot', text: explanation },
            { type: 'mermaid', chart: diagram }
          ]);
        } else {
          response = await axios.post('/api/chat/furtherRequest', { message, role });
          setChatHistory((prevHistory) => [
            ...prevHistory,
            { type: 'bot', text: response.data.reply }
          ]);
        }
      }
    } catch (error) {
      console.error('Error handling user response:', error);
      setChatHistory((prevHistory) => [
        ...prevHistory,
        { type: 'bot', text: 'An error occurred while processing your request. Please try again.' }
      ]);
    } finally {
      setMessage('');
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const getFirstQuestion = async () => {
      try {
        const response = await axios.post('/api/chat/saveResponse', { user, role, step: 0 });
        setChatHistory((prevHistory) => [
          ...prevHistory,
          { type: 'bot', text: response.data.nextQuestion }
        ]);
        setCurrentStep(1);
      } catch (error) {
        console.error('Error fetching first question:', error);
        setChatHistory((prevHistory) => [
          ...prevHistory,
          { type: 'bot', text: 'Failed to load initial question. Please refresh the page.' }
        ]);
      }
    };

    if (currentStep === 0 && role) {
      getFirstQuestion();
    }
  }, [role, currentStep]);

  return (
    <div className="chat-container">
      <div ref={chatHistoryRef} className="chat-history">
        {chatHistory.map((chat, index) => (
          <div key={index} className={`chat-message ${chat.type}`}>
            {chat.type === 'mermaid' ? (
              <MermaidRenderer chart={chat.chart} />
            ) : (
              <ReactMarkdown>{chat.text}</ReactMarkdown>
            )}
          </div>
        ))}
      </div>
      <div className="chat-footer">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input-message mb-20"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message"
          disabled={isProcessing}
        />
        <button onClick={handleSend} className="send-button" disabled={isProcessing}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;