import { useEffect, useState } from 'react';

export function useTypewriter(
  lines: string[],
  active: boolean,
  resetKey: string,
  msPerChar = 22
) {
  const [output, setOutput] = useState('');
  const fullText = lines.join('\n');

  useEffect(() => {
    if (!active || !fullText) {
      setOutput('');
      return;
    }

    setOutput('');
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setOutput(fullText.slice(0, index));
      if (index >= fullText.length) {
        clearInterval(timer);
      }
    }, msPerChar);

    return () => clearInterval(timer);
  }, [active, fullText, msPerChar, resetKey]);

  const isComplete = active && output.length >= fullText.length && fullText.length > 0;

  return { output, isComplete };
}
