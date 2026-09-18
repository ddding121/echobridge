"use client";

import { useEffect, useRef, useState } from "react";

type TranscriptLine = { time: string; text: string };
type AlternativeLike = { transcript: string };
type ResultLike = { isFinal: boolean; [index: number]: AlternativeLike };
type ResultEventLike = { resultIndex: number; results: ArrayLike<ResultLike> };
type ErrorEventLike = { error: string };
type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: ResultEventLike) => void) | null;
  onerror: ((event: ErrorEventLike) => void) | null;
  onend: (() => void) | null;
};
type RecognitionConstructor = new () => RecognitionLike;
type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

function formatElapsed(startedAt: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function useSpeechRecognition() {
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const startedAtRef = useRef(Date.now());
  const [supported, setSupported] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const speechWindow = window as SpeechWindow;
    setSupported(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition));
    return () => recognitionRef.current?.stop();
  }, []);

  function start() {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setSupported(false);
      setError("当前浏览器不支持实时语音识别，请使用最新版 Chrome 或 Edge。");
      return;
    }

    setError("");
    setInterim("");
    startedAtRef.current = Date.now();
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "zh-CN";
    recognition.onresult = (event) => {
      let temporary = "";
      const completed: TranscriptLine[] = [];
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript?.trim();
        if (!text) continue;
        if (result.isFinal) completed.push({ time: formatElapsed(startedAtRef.current), text });
        else temporary += text;
      }
      if (completed.length) setLines((current) => [...current, ...completed]);
      setInterim(temporary);
    };
    recognition.onerror = (event) => {
      const messages: Record<string, string> = {
        "not-allowed": "未获得麦克风权限，请在浏览器地址栏允许使用麦克风。",
        "no-speech": "暂时没有检测到语音，请靠近麦克风后再试。",
        network: "语音服务暂时无法连接，请检查网络后重试。",
      };
      setError(messages[event.error] || `语音识别遇到问题：${event.error}`);
      setRecording(false);
    };
    recognition.onend = () => {
      setRecording(false);
      setInterim("");
    };
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }

  function stop() {
    recognitionRef.current?.stop();
    setRecording(false);
  }

  function reset() {
    stop();
    setLines([]);
    setInterim("");
    setError("");
  }

  return { supported, recording, interim, lines, error, start, stop, reset };
}
