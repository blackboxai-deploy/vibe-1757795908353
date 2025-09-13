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

    // Note: This is a server-side endpoint that would typically use a TTS service
    // For now, we'll return instructions to use client-side Web Speech API
    // In a real implementation, you could integrate with services like:
    // - Google Text-to-Speech API
    // - Amazon Polly
    // - Microsoft Speech Services
    // - Azure Cognitive Services Speech

    const response = {
      message: 'Server-side TTS not implemented. Please use client-side Web Speech API.',
      settings: {
        text: text.trim(),
        rate: Math.max(0.1, Math.min(10, rate)),
        pitch: Math.max(0, Math.min(2, pitch)),
        volume: Math.max(0, Math.min(1, volume)),
        voiceName
      },
      instructions: {
        clientSide: 'Use the Web Speech API in the browser for text-to-speech conversion',
        alternatives: [
          'Google Text-to-Speech API',
          'Amazon Polly',
          'Microsoft Speech Services',
          'Azure Cognitive Services Speech'
        ]
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('TTS API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Text-to-Speech API',
    version: '1.0.0',
    status: 'active',
    features: [
      'Client-side Web Speech API integration',
      'Text validation and sanitization',
      'Voice settings normalization',
      'Error handling and logging'
    ],
    limits: {
      maxTextLength: 5000,
      rateRange: [0.1, 10],
      pitchRange: [0, 2],
      volumeRange: [0, 1]
    },
    supportedMethods: ['POST'],
    note: 'This endpoint provides configuration and fallback support. Primary TTS functionality uses client-side Web Speech API.'
  });
}