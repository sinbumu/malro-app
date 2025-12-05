import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionResultItem = {
  transcript: string;
};

type SpeechRecognitionResult = Array<SpeechRecognitionResultItem | undefined> & {
  isFinal?: boolean;
};

type SpeechRecognitionEventLike = {
  results: SpeechRecognitionResult[];
  resultIndex: number;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart?: (() => void) | null;
};

type RecognitionConstructor = new () => SpeechRecognitionInstance;

type RecognitionWindow = typeof window & {
  webkitSpeechRecognition?: RecognitionConstructor;
  SpeechRecognition?: RecognitionConstructor;
};

export interface SpeechRecognitionOptions {
  lang?: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
}

export interface SpeechRecognitionControls {
  isRecording: boolean;
  isSupported: boolean;
  error: string | null;
  lastTranscript: string;
  start: () => void;
  stop: () => void;
}

const MOBILE_UA_REGEX = /android|iphone|ipad|ipod|mobile/i;

export function useSpeechRecognition(options: SpeechRecognitionOptions = {}): SpeechRecognitionControls {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef<SpeechRecognitionOptions['onResult']>(options.onResult);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldContinueRef = useRef(false);
  const isMobileBrowserRef = useRef(false);
  const lastMobileFinalRef = useRef("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState("");

  useEffect(() => {
    onResultRef.current = options.onResult;
  }, [options.onResult]);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsSupported(false);
      return;
    }
    isMobileBrowserRef.current = MOBILE_UA_REGEX.test(navigator.userAgent);

    const speechCtor: RecognitionConstructor | undefined =
      (window as RecognitionWindow).SpeechRecognition || (window as RecognitionWindow).webkitSpeechRecognition;

    if (!speechCtor || !window.isSecureContext) {
      setIsSupported(false);
      setError("이 환경에서는 음성 인식을 지원하지 않습니다. (Chrome + HTTPS 필요)");
      recognitionRef.current = null;
      return;
    }

    const recognition = new speechCtor();
    recognition.lang = options.lang ?? "ko-KR";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const result = event.results[event.resultIndex];
      if (!result) {
        return;
      }
      const transcript = Array.from(result)
        .map((item) => item?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) {
        const isFinal = Boolean(result.isFinal);
        if (isFinal && isMobileBrowserRef.current) {
          if (transcript === lastMobileFinalRef.current) {
            if (process.env.NODE_ENV !== "production") {
              console.info("[STT] skip duplicate mobile final transcript", transcript);
            }
            return;
          }
          lastMobileFinalRef.current = transcript;
        } else if (!isFinal) {
          lastMobileFinalRef.current = "";
        }
        setLastTranscript(transcript);
        onResultRef.current?.(transcript, isFinal);
        if (process.env.NODE_ENV !== "production") {
          console.info("[STT] onresult", { transcript, isFinal });
        }
      }
    };

    recognition.onerror = (evt: SpeechRecognitionErrorEventLike) => {
      setError(evt.error ?? "speech-error");
      if (process.env.NODE_ENV !== "production") {
        console.error("[STT] onerror", evt.error);
      }
      const recoverable = evt.error === "no-speech" || evt.error === "audio-capture";
      if (!recoverable) {
        shouldContinueRef.current = false;
        setIsRecording(false);
      }
    };

    recognition.onend = () => {
      if (process.env.NODE_ENV !== "production") {
        console.info("[STT] onend");
      }
      if (shouldContinueRef.current) {
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
        }
        restartTimerRef.current = setTimeout(() => {
          try {
            recognition.start();
          } catch (err) {
            shouldContinueRef.current = false;
            setIsRecording(false);
            setError(err instanceof Error ? err.message : "음성 인식을 다시 시작할 수 없습니다.");
          }
        }, 150);
      } else {
        setIsRecording(false);
      }
    };
    recognition.onstart = () => {
      if (process.env.NODE_ENV !== "production") {
        console.info("[STT] onstart");
      }
    };

    recognitionRef.current = recognition;
    setIsSupported(true);
    setError(null);

    return () => {
      shouldContinueRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      recognition.stop();
      lastMobileFinalRef.current = "";
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onstart = null;
      recognitionRef.current = null;
    };
  }, [options.lang]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError("이 디바이스에서는 음성 입력을 사용할 수 없습니다.");
      setIsSupported(false);
      return;
    }

    try {
      if (isRecording) {
        return;
      }
      setError(null);
      setIsRecording(true);
      shouldContinueRef.current = true;
      if (process.env.NODE_ENV !== "production") {
        console.info("[STT] start recognition");
      }
      recognition.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : "음성 인식을 시작할 수 없습니다.");
      setIsRecording(false);
    }
  }, [isRecording]);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      return;
    }
    shouldContinueRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (process.env.NODE_ENV !== "production") {
      console.info("[STT] stop recognition");
    }
    recognition.stop();
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    isSupported,
    error,
    lastTranscript,
    start,
    stop
  };
}


