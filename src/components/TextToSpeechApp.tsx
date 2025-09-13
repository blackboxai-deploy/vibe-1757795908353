"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AudioPlayer from "./AudioPlayer";
import VoiceSettings from "./VoiceSettings";
import { 
  TextToSpeechManager, 
  VoiceSettings as VoiceSettingsType, 
  createAudioBlob, 
  downloadAudio,
  downloadAudioWithProgress
} from "@/lib/audio-utils";

const SAMPLE_TEXTS = [
  "Hello! Welcome to our text-to-speech application. This tool converts your written text into natural-sounding speech that you can play and download.",
  "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the English alphabet and is perfect for testing speech synthesis.",
  "In a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole, filled with the ends of worms and an oozy smell, nor yet a dry, bare, sandy hole with nothing in it to sit down on or to eat.",
  "To be or not to be, that is the question. Whether 'tis nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles."
];

const MAX_CHARACTER_LIMIT = 5000;

export default function TextToSpeechApp() {
  // Text and UI state
  const [text, setText] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Voice settings state
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettingsType>({
    rate: 1,
    pitch: 1,
    volume: 1,
    voice: null
  });

  // TTS manager and playback state
  const [ttsManager, setTtsManager] = useState<TextToSpeechManager | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Initialize TTS manager
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (TextToSpeechManager.isSupported()) {
        setTtsManager(new TextToSpeechManager());
        setIsSupported(true);
      } else {
        setIsSupported(false);
        setError("Text-to-speech is not supported in this browser. Please try Chrome, Firefox, Safari, or Edge.");
      }
    }
  }, []);

  // Update playback state
  const updatePlaybackState = useCallback(() => {
    if (ttsManager) {
      const state = ttsManager.getState();
      setIsPlaying(state.isPlaying);
      setIsPaused(state.isPaused);
    }
  }, [ttsManager]);

  // Polling for playback state updates
  useEffect(() => {
    const interval = setInterval(updatePlaybackState, 100);
    return () => clearInterval(interval);
  }, [updatePlaybackState]);

  const handleTextChange = (value: string) => {
    if (value.length <= MAX_CHARACTER_LIMIT) {
      setText(value);
      setError(null);
    }
  };

  const handleSampleTextSelect = (sampleText: string) => {
    setText(sampleText);
  };

  const handleClearText = () => {
    setText("");
    if (ttsManager) {
      ttsManager.stop();
    }
  };

  const handlePlay = async () => {
    if (!ttsManager || !text.trim()) return;

    try {
      setError(null);
      await ttsManager.speak({
        text: text.trim(),
        voice: voiceSettings.voice,
        rate: voiceSettings.rate,
        pitch: voiceSettings.pitch,
        volume: voiceSettings.volume
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to play speech");
    }
  };

  const handlePause = () => {
    if (!ttsManager) return;
    
    if (isPaused) {
      ttsManager.resume();
    } else {
      ttsManager.pause();
    }
  };

  const handleStop = () => {
    if (!ttsManager) return;
    ttsManager.stop();
  };

  const handleDownload = async () => {
    if (!text.trim() || isDownloading) return;

    setIsDownloading(true);
    setError(null);

    try {
      // Use the enhanced download function with better error handling
      const audioBlob = await createAudioBlob(text.trim(), voiceSettings);
      
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error("Failed to generate audio file - empty result");
      }

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `speech-${timestamp}.wav`;
      
      await downloadAudio(audioBlob, filename);
      
      // Show success message briefly
      setTimeout(() => {
        // Could add a toast notification here if desired
      }, 100);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate audio file";
      console.error('Download error:', err);
      setError(`Download failed: ${errorMessage}. Please try again or use the Play button to hear the speech.`);
    } finally {
      setIsDownloading(false);
    }
  };

  const characterCount = text.length;
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  const isTextValid = text.trim().length > 0;

  if (!isSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertDescription>
            Text-to-speech is not supported in this browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Text to Audio
            </h1>
            <p className="text-gray-600 text-lg">
              Convert your text to natural-sounding speech with customizable voice settings
            </p>
          </div>
          
          {/* Features badges */}
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary">🎵 Natural Speech</Badge>
            <Badge variant="secondary">⚙️ Voice Controls</Badge>
            <Badge variant="secondary">⬇️ Download Audio</Badge>
            <Badge variant="secondary">📱 Responsive</Badge>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Text Input */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Text Input</CardTitle>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <span className={characterCount > MAX_CHARACTER_LIMIT * 0.9 ? "text-orange-500" : ""}>
                      {characterCount}/{MAX_CHARACTER_LIMIT} characters
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="text-input">Enter text to convert to speech</Label>
                  <Textarea
                    id="text-input"
                    placeholder="Type or paste your text here..."
                    value={text}
                    onChange={(e) => handleTextChange(e.target.value)}
                    className="min-h-[200px] resize-y"
                    maxLength={MAX_CHARACTER_LIMIT}
                  />
                </div>

                {/* Sample Texts and Actions */}
                <Tabs defaultValue="samples" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="samples">Sample Texts</TabsTrigger>
                    <TabsTrigger value="actions">Actions</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="samples" className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {SAMPLE_TEXTS.map((sample, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSampleTextSelect(sample)}
                          className="text-left h-auto p-3 justify-start"
                        >
                          <span className="truncate">
                            {sample.substring(0, 60)}...
                          </span>
                        </Button>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="actions" className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearText}
                        disabled={!text}
                      >
                        Clear Text
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const words = text.split(/\s+/);
                          setText(words.slice(0, Math.ceil(words.length / 2)).join(' '));
                        }}
                        disabled={!text}
                      >
                        Keep First Half
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setText(text.toUpperCase())}
                        disabled={!text}
                      >
                        UPPERCASE
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setText(text.toLowerCase())}
                        disabled={!text}
                      >
                        lowercase
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Audio Player */}
            <AudioPlayer
              isPlaying={isPlaying}
              isPaused={isPaused}
              text={text}
              rate={voiceSettings.rate}
              onPlay={handlePlay}
              onPause={handlePause}
              onStop={handleStop}
              onDownload={handleDownload}
              isDownloading={isDownloading}
              disabled={!isTextValid}
            />
          </div>

          {/* Voice Settings Sidebar */}
          <div className="lg:col-span-1">
            <VoiceSettings
              settings={voiceSettings}
              onSettingsChange={setVoiceSettings}
              disabled={isPlaying && !isPaused}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-6">
          <p>Built with Web Speech API • Works best in Chrome, Firefox, Safari & Edge</p>
        </div>
      </div>
    </div>
  );
}