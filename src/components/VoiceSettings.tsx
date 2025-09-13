"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VoiceSettings as VoiceSettingsType } from "@/lib/audio-utils";

interface VoiceSettingsProps {
  settings: VoiceSettingsType;
  onSettingsChange: (settings: VoiceSettingsType) => void;
  disabled?: boolean;
}

export default function VoiceSettings({ settings, onSettingsChange, disabled = false }: VoiceSettingsProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    // Load voices when component mounts
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Set default voice if none selected
      if (!settings.voice && availableVoices.length > 0) {
        const defaultVoice = availableVoices.find(voice => voice.default) || availableVoices[0];
        onSettingsChange({ ...settings, voice: defaultVoice });
      }
    };

    loadVoices();
    
    // Some browsers load voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    return () => {
      if (window.speechSynthesis.onvoiceschanged) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [settings, onSettingsChange]);

  const handleVoiceChange = (voiceName: string) => {
    const selectedVoice = voices.find(voice => voice.name === voiceName) || null;
    onSettingsChange({ ...settings, voice: selectedVoice });
  };

  const handleRateChange = (value: number[]) => {
    onSettingsChange({ ...settings, rate: value[0] });
  };

  const handlePitchChange = (value: number[]) => {
    onSettingsChange({ ...settings, pitch: value[0] });
  };

  const handleVolumeChange = (value: number[]) => {
    onSettingsChange({ ...settings, volume: value[0] });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Voice Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Voice Selection */}
        <div className="space-y-2">
          <Label htmlFor="voice-select">Voice</Label>
          <Select
            value={settings.voice?.name || ""}
            onValueChange={handleVoiceChange}
            disabled={disabled || voices.length === 0}
          >
            <SelectTrigger id="voice-select">
              <SelectValue placeholder="Select a voice..." />
            </SelectTrigger>
            <SelectContent>
              {voices.map((voice) => (
                <SelectItem key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Speaking Rate */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label htmlFor="rate-slider">Speaking Rate</Label>
            <span className="text-sm text-gray-600">{settings.rate.toFixed(1)}x</span>
          </div>
          <Slider
            id="rate-slider"
            min={0.5}
            max={2}
            step={0.1}
            value={[settings.rate]}
            onValueChange={handleRateChange}
            disabled={disabled}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Slow</span>
            <span>Normal</span>
            <span>Fast</span>
          </div>
        </div>

        {/* Pitch */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label htmlFor="pitch-slider">Pitch</Label>
            <span className="text-sm text-gray-600">{settings.pitch.toFixed(1)}</span>
          </div>
          <Slider
            id="pitch-slider"
            min={0.5}
            max={2}
            step={0.1}
            value={[settings.pitch]}
            onValueChange={handlePitchChange}
            disabled={disabled}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Low</span>
            <span>Normal</span>
            <span>High</span>
          </div>
        </div>

        {/* Volume */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label htmlFor="volume-slider">Volume</Label>
            <span className="text-sm text-gray-600">{Math.round(settings.volume * 100)}%</span>
          </div>
          <Slider
            id="volume-slider"
            min={0}
            max={1}
            step={0.1}
            value={[settings.volume]}
            onValueChange={handleVolumeChange}
            disabled={disabled}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Quiet</span>
            <span>Loud</span>
          </div>
        </div>

        {/* Voice Info */}
        {settings.voice && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm space-y-1">
              <div><strong>Voice:</strong> {settings.voice.name}</div>
              <div><strong>Language:</strong> {settings.voice.lang}</div>
              <div><strong>Local:</strong> {settings.voice.localService ? 'Yes' : 'No'}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}