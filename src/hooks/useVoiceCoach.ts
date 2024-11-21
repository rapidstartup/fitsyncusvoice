import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceCoach, ConversationEntry } from '../services/voiceCoach';

export function useVoiceCoach() {
  const [isListening, setIsListening] = useState(false);
  const [isMicReady, setIsMicReady] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const voiceCoachRef = useRef<VoiceCoach | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!voiceCoachRef.current) {
      voiceCoachRef.current = new VoiceCoach();
      
      // Set up handlers
      voiceCoachRef.current.setConversationUpdateHandler((history) => {
        setConversationHistory(history);
      });
      
      voiceCoachRef.current.setVoiceActivityHandler((isActive) => {
        setIsProcessingVoice(isActive);
      });

      // Check mic permission status
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => setIsMicReady(true))
        .catch((err) => {
          console.error('Microphone access error:', err);
          setIsMicReady(false);
        });
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (voiceCoachRef.current) {
        voiceCoachRef.current.stopListening();
      }
    };
  }, []);

  const toggleListening = useCallback(async () => {
    if (!voiceCoachRef.current) return;

    try {
      if (isListening) {
        voiceCoachRef.current.stopListening();
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }
        setIsListening(false);
      } else {
        if (!isMicReady) {
          const permission = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (permission) {
            setIsMicReady(true);
          }
        }
        const cleanup = await voiceCoachRef.current.startListening();
        cleanupRef.current = cleanup;
        setIsListening(true);
      }
    } catch (error) {
      console.error('Error toggling voice recognition:', error);
      setIsListening(false);
    }
  }, [isListening, isMicReady]);

  return {
    isListening,
    isMicReady,
    isProcessingVoice,
    toggleListening,
    conversationHistory,
    voiceCoach: voiceCoachRef.current
  };
}