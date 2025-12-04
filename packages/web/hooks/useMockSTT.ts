import { useCallback, useState } from 'react';

export interface STTControls {
  isRecording: boolean;
  start: () => void;
  stop: () => string;
}

export function useMockSTT(): STTControls {
  const [isRecording, setIsRecording] = useState(false);

  const start = useCallback(() => {
    setIsRecording(true);
  }, []);

  const stop = useCallback(() => {
    setIsRecording(false);
    // 실제 STT API를 붙일 위치. 지금은 더미 텍스트를 리턴한다.
    return '아이스 아메리카노 톨 사이즈 두 잔 포장';
  }, []);

  return { isRecording, start, stop };
}

