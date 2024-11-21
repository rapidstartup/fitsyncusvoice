import { config } from '../config/env';
import { v4 as uuidv4 } from 'uuid';
import WebSocket from 'isomorphic-ws';

const COACH_PROMPT = `You are a CrossFit AI coach. Keep responses brief and actionable. You will help guide users through their workouts, provide motivation, and respond to their questions. You can control the workout UI and music playback through available functions.`;

export interface ConversationEntry {
  timestamp: Date;
  type: 'user' | 'coach';
  message: string;
  action?: string;
}

export interface WorkoutState {
  name: string;
  repsCompleted: number;
  timePerRep?: number;
}

type ActionHandler = (action: string) => void;
type ConversationUpdateHandler = (history: ConversationEntry[]) => void;
type VoiceActivityHandler = (isActive: boolean) => void;

interface WebSocketMessage {
  type: string;
  session?: {
    id?: string;
    tools?: Tool[];
    voice?: string;
    instructions?: string;
    input_audio_transcription?: boolean;
    turn_detection?: string;
  };
  conversation?: {
    id: string;
  };
  item?: {
    type: string;
    role?: string;
    content?: Array<{
      type: string;
      text: string;
    }>;
    name?: string;
    arguments?: string;
    call_id?: string;
  };
  error?: {
    code: string;
    message: string;
  };
  response?: {
    modalities: string[];
    instructions: string;
  };
  name?: string;
  arguments?: string;
  call_id?: string;
  response_id?: string;
  item_id?: string;
  output_index?: number;
  authorization?: string;
}

interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface FunctionCallItem {
  name: string;
  arguments: string;
  call_id?: string;
}

interface FunctionCallArguments {
  name: string;
  arguments: string;
  call_id?: string;
}

export class VoiceCoach {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private isListening = false;
  private conversationHistory: ConversationEntry[] = [];
  private onConversationUpdate?: ConversationUpdateHandler;
  private onWorkoutAction?: ActionHandler;
  private onVoiceActivity?: VoiceActivityHandler;
  private voiceDetectionInterval: number | null = null;
  private lastVoiceDetectionTime = 0;
  private currentWorkoutState: WorkoutState | null = null;
  private sessionId: string;
  private audioChunks: Blob[] = [];
  private isProcessingAudio = false;

  private tools = [
    {
      name: 'start_workout',
      description: 'Start a new workout session',
      parameters: {
        type: 'object',
        properties: {
          workout: {
            type: 'string',
            description: 'Name of the workout to start (optional)',
          }
        }
      }
    },
    {
      name: 'next_movement',
      description: 'Move to the next exercise in the workout',
      parameters: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'show_stats',
      description: 'Display current workout statistics',
      parameters: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'end_workout',
      description: 'End the current workout session',
      parameters: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'music_control',
      description: 'Control music playback',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['play', 'pause', 'next', 'volume_up', 'volume_down'],
            description: 'The music control action to perform'
          }
        },
        required: ['action']
      }
    }
  ];

  constructor() {
    this.sessionId = uuidv4();
  }

  setActionHandler(handler: ActionHandler) {
    this.onWorkoutAction = handler;
  }

  setConversationUpdateHandler(handler: ConversationUpdateHandler) {
    this.onConversationUpdate = handler;
    handler(this.conversationHistory);
  }

  setVoiceActivityHandler(handler: VoiceActivityHandler) {
    this.onVoiceActivity = handler;
  }

  getConversationHistory() {
    return this.conversationHistory;
  }

  updateWorkoutState(state: WorkoutState) {
    this.currentWorkoutState = state;
    this.addToConversation({
      timestamp: new Date(),
      type: 'coach',
      message: this.generateWorkoutFeedback(state)
    });
  }

  private generateWorkoutFeedback(state: WorkoutState): string {
    if (!state.timePerRep) {
      return `Keep pushing through the ${state.name.toLowerCase()}! Maintain good form.`;
    }
    const isGoodPace = state.timePerRep < 3;
    return isGoodPace
      ? `Great pace on the ${state.name.toLowerCase()}! Keep up the intensity.`
      : `Take your time with the ${state.name.toLowerCase()}, focus on form over speed.`;
  }

  private async connectWebSocket(): Promise<void> {
    if (!config.openai.apiKey) {
      console.error('OpenAI API key is missing. Please check your environment variables.');
      throw new Error('OpenAI API key is missing. Please check your environment configuration.');
    }

    return new Promise((resolve, reject) => {
      try {
        const url = `wss://api.openai.com/v1/realtime/v1/audio?authorization=${encodeURIComponent(`Bearer ${config.openai.apiKey}`)}&model=gpt-4o-realtime-preview`;
        
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected, sending session update...');
          
          this.sendMessage({
            type: 'session.update',
            session: {
              tools: this.tools as Tool[],
              voice: 'onyx',
              instructions: COACH_PROMPT,
              input_audio_transcription: true,
              turn_detection: 'server_vad'
            }
          });

          this.sendMessage({
            type: 'response.create',
            response: {
              modalities: ['text', 'audio'],
              instructions: COACH_PROMPT
            }
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data.toString());
            console.log('WebSocket message received:', data);
            this.handleWebSocketMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.handleWebSocketError();
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event);
          this.handleWebSocketClose();
        };

      } catch (error) {
        console.error('Error connecting WebSocket:', error);
        reject(error);
      }
    });
  }

  private handleWebSocketMessage(data: WebSocketMessage) {
    switch (data.type) {
      case 'session.created':
        console.log('Session created:', data.session?.id);
        break;

      case 'conversation.created':
        console.log('Conversation created:', data.conversation?.id);
        break;

      case 'input_audio_buffer.speech_started':
        this.isProcessingAudio = true;
        break;

      case 'input_audio_buffer.speech_stopped':
        this.isProcessingAudio = false;
        this.processAudioChunks();
        break;

      case 'conversation.item.created':
        if (data.item?.type === 'message' && data.item?.role === 'assistant') {
          const content = data.item.content || [];
          const message = content[0]?.text || '';
          this.addToConversation({
            timestamp: new Date(),
            type: 'coach',
            message
          });
        } else if (data.item?.type === 'function_call' && data.item.name && data.item.arguments) {
          this.handleFunctionCall({
            name: data.item.name,
            arguments: data.item.arguments,
            call_id: data.item.call_id
          });
        }
        break;

      case 'response.function_call_arguments.done':
        if ('name' in data && 'arguments' in data && 
            typeof data.name === 'string' && typeof data.arguments === 'string') {
          this.handleFunctionCallArguments({
            name: data.name,
            arguments: data.arguments,
            call_id: data.call_id
          });
        }
        break;

      case 'error':
        console.error('Realtime API error:', data.error);
        break;
    }
  }

  private async processAudioChunks() {
    if (this.audioChunks.length === 0) return;

    const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
    this.audioChunks = [];

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.openai.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status} - ${await response.text()}`);
      }

      const data = await response.json();
      const transcription = data.text.trim();

      if (transcription) {
        this.addToConversation({
          timestamp: new Date(),
          type: 'user',
          message: transcription
        });

        this.sendMessage({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{
              type: 'text',
              text: transcription
            }]
          }
        });

        this.sendMessage({
          type: 'response.create',
          response: {
            modalities: ['text', 'audio'],
            instructions: COACH_PROMPT
          }
        });
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      this.addToConversation({
        timestamp: new Date(),
        type: 'coach',
        message: "Sorry, I couldn't process that. Please try again."
      });
    }
  }

  private handleFunctionCall(item: FunctionCallItem) {
    const { name, arguments: args } = item;
    let action = '';

    switch (name) {
      case 'start_workout':
        action = 'START_WORKOUT';
        break;
      case 'next_movement':
        action = 'NEXT_MOVEMENT';
        break;
      case 'show_stats':
        action = 'SHOW_STATS';
        break;
      case 'end_workout':
        action = 'END_WORKOUT';
        break;
      case 'music_control': {
        const parsedArgs = JSON.parse(args);
        switch (parsedArgs.action) {
          case 'play':
            action = 'MUSIC_PLAY';
            break;
          case 'pause':
            action = 'MUSIC_PAUSE';
            break;
          case 'next':
            action = 'MUSIC_NEXT';
            break;
          case 'volume_up':
            action = 'MUSIC_VOLUME_UP';
            break;
          case 'volume_down':
            action = 'MUSIC_VOLUME_DOWN';
            break;
        }
        break;
      }
    }

    if (action && this.onWorkoutAction) {
      this.onWorkoutAction(action);
    }
  }

  private handleFunctionCallArguments(data: FunctionCallArguments) {
    const { name, arguments: args } = data;
    this.handleFunctionCall({ name, arguments: args });
  }

  private handleWebSocketError() {
    this.addToConversation({
      timestamp: new Date(),
      type: 'coach',
      message: "I'm having trouble connecting. Please try again."
    });
  }

  private handleWebSocketClose() {
    this.addToConversation({
      timestamp: new Date(),
      type: 'coach',
      message: "Connection closed. Please restart voice mode if you'd like to continue."
    });
  }

  private setupVoiceDetection(stream: MediaStream) {
    this.audioContext = new AudioContext();
    this.analyzer = this.audioContext.createAnalyser();
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyzer);
    
    this.analyzer.fftSize = 256;
    const bufferLength = this.analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVoiceActivity = () => {
      if (!this.analyzer) return;
      
      this.analyzer.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const isActive = average > 20; // Adjusted threshold for better sensitivity

      if (isActive) {
        this.lastVoiceDetectionTime = Date.now();
        this.onVoiceActivity?.(true);
      } else if (Date.now() - this.lastVoiceDetectionTime > 500) {
        this.onVoiceActivity?.(false);
      }
    };

    this.voiceDetectionInterval = window.setInterval(checkVoiceActivity, 100);
  }

  async startListening() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      this.mediaStream = stream;
      await this.connectWebSocket();
      this.setupVoiceDetection(stream);

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Record in 1-second chunks
      this.isListening = true;

      this.addToConversation({
        timestamp: new Date(),
        type: 'coach',
        message: "Voice mode activated, I am here to help"
      });

      // Return cleanup function
      return () => {
        if (this.voiceDetectionInterval) {
          clearInterval(this.voiceDetectionInterval);
        }
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach(track => track.stop());
        }
        if (this.audioContext) {
          this.audioContext.close();
        }
        if (this.ws) {
          this.ws.close();
        }
      };

    } catch (error) {
      console.error('Error starting voice recognition:', error);
      throw error;
    }
  }

  private addToConversation(entry: ConversationEntry) {
    this.conversationHistory.push(entry);
    this.onConversationUpdate?.(this.conversationHistory);
    
    if (entry.action && this.onWorkoutAction) {
      this.onWorkoutAction(entry.action);
    }
  }

  stopListening() {
    if (this.isListening) {
      this.isListening = false;
      
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
      }
      
      if (this.audioContext) {
        this.audioContext.close();
      }
      
      if (this.voiceDetectionInterval) {
        clearInterval(this.voiceDetectionInterval);
      }

      if (this.ws) {
        this.ws.close();
      }

      this.onVoiceActivity?.(false);
      this.audioChunks = [];

      this.addToConversation({
        timestamp: new Date(),
        type: 'coach',
        message: "Voice mode deactivated"
      });
    }
  }

  private sendMessage(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('Sending WebSocket message:', message);
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not ready, message not sent:', message);
    }
  }
}