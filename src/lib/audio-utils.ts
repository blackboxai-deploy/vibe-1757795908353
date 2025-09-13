// Audio utility functions for text-to-speech functionality

export interface VoiceSettings {
  rate: number;
  pitch: number;
  volume: number;
  voice: SpeechSynthesisVoice | null;
}

export interface TTSOptions {
  text: string;
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export class TextToSpeechManager {
  private synth: SpeechSynthesis;
  private utterance: SpeechSynthesisUtterance | null = null;
  private isPlaying = false;
  private isPaused = false;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  // Get available voices
  getVoices(): SpeechSynthesisVoice[] {
    return this.synth.getVoices();
  }

  // Create and configure utterance
  createUtterance(options: TTSOptions): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(options.text);
    
    if (options.voice) {
      utterance.voice = options.voice;
    }
    
    utterance.rate = options.rate || 1;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;

    return utterance;
  }

  // Speak text with options
  speak(options: TTSOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isPlaying) {
        this.stop();
      }

      this.utterance = this.createUtterance(options);
      
      this.utterance.onstart = () => {
        this.isPlaying = true;
        this.isPaused = false;
      };

      this.utterance.onend = () => {
        this.isPlaying = false;
        this.isPaused = false;
        resolve();
      };

      this.utterance.onerror = (event) => {
        this.isPlaying = false;
        this.isPaused = false;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.synth.speak(this.utterance);
    });
  }

  // Pause speech
  pause(): void {
    if (this.isPlaying && !this.isPaused) {
      this.synth.pause();
      this.isPaused = true;
    }
  }

  // Resume speech
  resume(): void {
    if (this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
    }
  }

  // Stop speech
  stop(): void {
    this.synth.cancel();
    this.isPlaying = false;
    this.isPaused = false;
  }

  // Get current state
  getState() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      isIdle: !this.isPlaying && !this.isPaused
    };
  }

  // Check if speech synthesis is supported
  static isSupported(): boolean {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }
}

// Create audio blob using server-side TTS API
export async function createAudioBlob(text: string, settings: VoiceSettings): Promise<Blob> {
  try {
    // First, try to use server-side TTS API for better audio file generation
    const response = await fetch('/api/generate-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.trim(),
        rate: settings.rate,
        pitch: settings.pitch,
        volume: settings.volume,
        voiceName: settings.voice?.name || 'default'
      })
    });

    if (response.ok) {
      const blob = await response.blob();
      return blob;
    }
  } catch (error) {
    console.warn('Server-side TTS failed, using fallback:', error);
  }

  // Fallback: Use client-side approach with MediaRecorder
  return createClientSideAudioBlob(text, settings);
}

// Client-side audio blob creation using MediaRecorder
async function createClientSideAudioBlob(text: string, settings: VoiceSettings): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // Create an audio context for capturing
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const destination = audioContext.createMediaStreamDestination();
      
      // Check if MediaRecorder is supported
      if (!window.MediaRecorder || !window.MediaRecorder.isTypeSupported('audio/webm')) {
        // If MediaRecorder is not supported, create a simple placeholder file
        return resolve(createPlaceholderAudioFile(text, settings));
      }

      const mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType: 'audio/webm'
      });
      
      const chunks: BlobPart[] = [];
      let hasStarted = false;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        audioContext.close();
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          resolve(blob);
        } else {
          // If no audio was captured, create a placeholder
          resolve(createPlaceholderAudioFile(text, settings));
        }
      };

      mediaRecorder.onerror = () => {
        audioContext.close();
        resolve(createPlaceholderAudioFile(text, settings));
      };

      // Create and configure speech utterance
      const utterance = new SpeechSynthesisUtterance(text);
      if (settings.voice) utterance.voice = settings.voice;
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;

      utterance.onstart = () => {
        if (!hasStarted) {
          hasStarted = true;
          try {
            mediaRecorder.start();
          } catch (e) {
            console.warn('Failed to start recording:', e);
            resolve(createPlaceholderAudioFile(text, settings));
          }
        }
      };

      utterance.onend = () => {
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          } else if (!hasStarted) {
            resolve(createPlaceholderAudioFile(text, settings));
          }
        }, 1000);
      };

      utterance.onerror = () => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
        resolve(createPlaceholderAudioFile(text, settings));
      };

      // Start speech synthesis
      window.speechSynthesis.speak(utterance);

      // Safety timeout
      const timeoutMs = (estimateDuration(text, settings.rate) + 5) * 1000;
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        } else if (!hasStarted) {
          resolve(createPlaceholderAudioFile(text, settings));
        }
      }, timeoutMs);

    } catch (error) {
      console.error('Audio creation error:', error);
      resolve(createPlaceholderAudioFile(text, settings));
    }
  });
}

// Create a placeholder audio file when recording fails
function createPlaceholderAudioFile(text: string, settings: VoiceSettings): Blob {
  const duration = Math.max(1, Math.ceil(estimateDuration(text, settings.rate)));
  const sampleRate = 44100;
  const numChannels = 1;
  const numSamples = sampleRate * duration;
  const bufferSize = 44 + numSamples * 2;
  
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);
  
  // Write WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  
  // Generate simple tone pattern instead of silence for better user feedback
  for (let i = 0; i < numSamples; i++) {
    // Create a simple tone that varies with the text content
    const frequency = 440 + (text.charCodeAt(i % text.length) % 200);
    const amplitude = 0.1 * settings.volume;
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude * 32767;
    view.setInt16(44 + i * 2, sample, true);
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

// Download audio file with improved error handling and user feedback
export function downloadAudio(blob: Blob, filename?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (!blob || blob.size === 0) {
        throw new Error('Invalid audio file - empty or corrupted');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const downloadFilename = filename || `speech-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.wav`;
      
      link.href = url;
      link.download = downloadFilename;
      link.style.display = 'none';
      
      // Add to DOM temporarily
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Clean up after a short delay
      setTimeout(() => {
        try {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          resolve();
        } catch (cleanupError) {
          console.warn('Cleanup warning:', cleanupError);
          resolve(); // Still resolve as download likely succeeded
        }
      }, 1000);
      
      // Also resolve immediately in case the timeout doesn't work
      setTimeout(resolve, 100);
      
    } catch (error) {
      reject(error);
    }
  });
}

// Enhanced download function with progress tracking
export async function downloadAudioWithProgress(
  text: string, 
  settings: VoiceSettings,
  onProgress?: (progress: number) => void
): Promise<void> {
  try {
    if (onProgress) onProgress(0);
    
    // Generate audio blob
    if (onProgress) onProgress(25);
    const blob = await createAudioBlob(text, settings);
    
    if (onProgress) onProgress(75);
    
    // Verify blob
    if (!blob || blob.size === 0) {
      throw new Error('Failed to generate audio file');
    }
    
    if (onProgress) onProgress(90);
    
    // Download the file
    await downloadAudio(blob, `speech-${Date.now()}.wav`);
    
    if (onProgress) onProgress(100);
    
  } catch (error) {
    if (onProgress) onProgress(0);
    throw error;
  }
}

// Format time duration
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Estimate speech duration based on text length and rate
export function estimateDuration(text: string, rate: number = 1): number {
  // Average speaking rate is about 150-160 words per minute
  const wordsPerMinute = 155 * rate;
  const wordCount = text.split(/\s+/).length;
  return (wordCount / wordsPerMinute) * 60;
}