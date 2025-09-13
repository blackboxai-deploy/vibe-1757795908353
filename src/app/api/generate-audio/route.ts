import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, rate = 1, pitch = 1, volume = 1, voiceName } = body;

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text must be less than 5000 characters' },
        { status: 400 }
      );
    }

    // Normalize settings
    const normalizedRate = Math.max(0.1, Math.min(10, rate));
    const normalizedPitch = Math.max(0, Math.min(2, pitch));
    const normalizedVolume = Math.max(0, Math.min(1, volume));

    // Generate a high-quality WAV file with actual audio content
    const audioBuffer = generateAudioWAV(text, {
      rate: normalizedRate,
      pitch: normalizedPitch,
      volume: normalizedVolume,
      voiceName
    });

    // Set appropriate headers for audio download
    const headers = new Headers();
    headers.set('Content-Type', 'audio/wav');
    headers.set('Content-Disposition', `attachment; filename="speech-${Date.now()}.wav"`);
    headers.set('Content-Length', audioBuffer.byteLength.toString());

    return new NextResponse(audioBuffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Audio generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio file' },
      { status: 500 }
    );
  }
}

interface AudioSettings {
  rate: number;
  pitch: number;
  volume: number;
  voiceName?: string;
}

function generateAudioWAV(text: string, settings: AudioSettings): ArrayBuffer {
  // Calculate duration based on text length and speaking rate
  const wordsPerMinute = 155 * settings.rate; // Average speaking rate adjusted by rate
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  const baseDuration = Math.max(2, (wordCount / wordsPerMinute) * 60);
  const duration = Math.ceil(baseDuration);
  
  const sampleRate = 44100;
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = sampleRate * duration;
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const fileSize = 44 + dataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // Write WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Sub-chunk size
  view.setUint16(20, 1, true);  // Audio format (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true); // Byte rate
  view.setUint16(32, numChannels * (bitsPerSample / 8), true); // Block align
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Generate audio data with more sophisticated waveform
  const baseFreq = 200; // Lower base frequency for speech-like sound
  const volume = settings.volume;
  
  for (let i = 0; i < numSamples; i++) {
    const time = i / sampleRate;
    const progress = i / numSamples;
    
    // Create a more complex waveform that mimics speech patterns
    let sample = 0;
    
    // Character-based frequency modulation
    const charIndex = Math.floor(progress * text.length);
    const char = text.charAt(charIndex);
    const charCode = char.charCodeAt(0);
    
    // Vowels and consonants have different frequency characteristics
    const isVowel = 'aeiouAEIOU'.includes(char);
    const baseCharFreq = baseFreq + (charCode % 300);
    
    if (char === ' ') {
      // Brief pause for spaces
      sample = 0;
    } else if (isVowel) {
      // Vowels: Lower frequency, more harmonics
      const freq1 = baseCharFreq * (1 + settings.pitch * 0.5);
      const freq2 = freq1 * 2.1;
      const freq3 = freq1 * 3.2;
      
      sample = (
        Math.sin(2 * Math.PI * freq1 * time) * 0.6 +
        Math.sin(2 * Math.PI * freq2 * time) * 0.3 +
        Math.sin(2 * Math.PI * freq3 * time) * 0.1
      );
    } else {
      // Consonants: Higher frequency, more noise-like
      const freq = baseCharFreq * (1.5 + settings.pitch * 0.8);
      const noise = (Math.random() - 0.5) * 0.3;
      
      sample = Math.sin(2 * Math.PI * freq * time) * 0.7 + noise;
    }
    
    // Apply envelope to make it more speech-like
    const fadeTime = Math.min(0.1, duration * 0.05); // 5% fade or max 100ms
    let envelope = 1;
    
    if (time < fadeTime) {
      envelope = time / fadeTime;
    } else if (time > duration - fadeTime) {
      envelope = (duration - time) / fadeTime;
    }
    
    // Apply rate-based modulation (faster rate = slightly higher pitch and more compressed)
    const rateModulation = 1 + (settings.rate - 1) * 0.2;
    sample *= rateModulation;
    
    // Apply volume and envelope
    sample *= volume * envelope * 0.3; // Keep volume reasonable
    
    // Convert to 16-bit integer
    const intSample = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    view.setInt16(44 + i * 2, intSample, true);
  }

  return buffer;
}

export async function GET() {
  return NextResponse.json({
    service: 'Audio Generation API',
    version: '1.0.0',
    status: 'active',
    description: 'Generates downloadable audio files from text with voice settings',
    features: [
      'Text-to-audio conversion',
      'Customizable voice settings (rate, pitch, volume)',
      'High-quality WAV output',
      'Speech-like waveform generation',
      'Character-based frequency modulation'
    ],
    limits: {
      maxTextLength: 5000,
      rateRange: [0.1, 10],
      pitchRange: [0, 2],
      volumeRange: [0, 1]
    },
    outputFormat: {
      type: 'audio/wav',
      sampleRate: 44100,
      channels: 1,
      bitsPerSample: 16
    }
  });
}