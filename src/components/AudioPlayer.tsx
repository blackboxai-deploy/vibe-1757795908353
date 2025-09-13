"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatTime, estimateDuration } from "@/lib/audio-utils";

interface AudioPlayerProps {
  isPlaying: boolean;
  isPaused: boolean;
  text: string;
  rate: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onDownload: () => void;
  isDownloading: boolean;
  disabled?: boolean;
}

export default function AudioPlayer({
  isPlaying,
  isPaused,
  text,
  rate,
  onPlay,
  onPause,
  onStop,
  onDownload,
  isDownloading,
  disabled = false
}: AudioPlayerProps) {
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Estimate and update duration when text or rate changes
  useEffect(() => {
    const estimatedDuration = estimateDuration(text, rate);
    setDuration(estimatedDuration);
  }, [text, rate]);

  // Update progress when playing
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isPlaying && !isPaused) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 0.1;
          const progressPercentage = duration > 0 ? (newTime / duration) * 100 : 0;
          setProgress(Math.min(progressPercentage, 100));
          return newTime;
        });
      }, 100);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, isPaused, duration]);

  // Reset progress when stopped
  useEffect(() => {
    if (!isPlaying && !isPaused) {
      setProgress(0);
      setCurrentTime(0);
    }
  }, [isPlaying, isPaused]);

  const handlePlayPause = () => {
    if (isPlaying && !isPaused) {
      onPause();
    } else if (isPaused) {
      onPause(); // This will resume
    } else {
      onPlay();
    }
  };

  const getPlayButtonText = () => {
    if (isPlaying && !isPaused) return "Pause";
    if (isPaused) return "Resume";
    return "Play";
  };

  const getPlayButtonIcon = () => {
    if (isPlaying && !isPaused) return "⏸️";
    return "▶️";
  };

  const canPlay = text.trim().length > 0 && !disabled;

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {/* Progress Bar */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <Progress value={progress} className="w-full h-2" />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center space-x-4 mb-4">
          {/* Play/Pause Button */}
          <Button
            onClick={handlePlayPause}
            disabled={!canPlay}
            size="lg"
            className="px-8 py-3 text-lg"
          >
            <span className="mr-2">{getPlayButtonIcon()}</span>
            {getPlayButtonText()}
          </Button>

          {/* Stop Button */}
          <Button
            onClick={onStop}
            disabled={!isPlaying && !isPaused}
            variant="outline"
            size="lg"
            className="px-6 py-3"
          >
            <span className="mr-2">⏹️</span>
            Stop
          </Button>

          {/* Download Button */}
          <Button
            onClick={onDownload}
            disabled={!canPlay || isDownloading}
            variant="secondary"
            size="lg"
            className="px-6 py-3"
          >
            <span className="mr-2">⬇️</span>
            {isDownloading ? "Generating..." : "Download"}
          </Button>
        </div>

        {/* Status Display */}
        <div className="text-center">
          {isPlaying && !isPaused && (
            <div className="text-green-600 font-medium">
              🎵 Playing...
            </div>
          )}
          {isPaused && (
            <div className="text-yellow-600 font-medium">
              ⏸️ Paused
            </div>
          )}
          {!isPlaying && !isPaused && text.trim().length > 0 && (
            <div className="text-gray-600">
              Ready to play
            </div>
          )}
          {!canPlay && text.trim().length === 0 && (
            <div className="text-gray-400">
              Enter some text to get started
            </div>
          )}
          {isDownloading && (
            <div className="text-blue-600 font-medium mt-2">
              🔄 Generating audio file...
            </div>
          )}
        </div>

        {/* Audio Info */}
        {text.trim().length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Word Count:</span>
                <span className="font-medium">{text.split(/\s+/).filter(word => word.length > 0).length}</span>
              </div>
              <div className="flex justify-between">
                <span>Character Count:</span>
                <span className="font-medium">{text.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Duration:</span>
                <span className="font-medium">{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}