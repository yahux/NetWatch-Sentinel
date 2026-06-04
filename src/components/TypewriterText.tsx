import { useEffect, useState } from 'react';

export interface TypewriterTextProps {
  messages: string[];
  msPerChar?: number;
  pauseBetweenMessages?: number;
  /** Resets the cycle when this value changes (e.g. alert mode toggle). */
  resetKey?: string;
  /** When false, holds the last message after it finishes typing. */
  loop?: boolean;
  className?: string;
  cursorClassName?: string;
}

export default function TypewriterText({
  messages,
  msPerChar = 30,
  pauseBetweenMessages = 1400,
  resetKey = 'default',
  loop = true,
  className = '',
  cursorClassName = 'text-sentinel-cyan animate-pulse',
}: TypewriterTextProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    setMessageIndex(0);
    setCharIndex(0);
    setDisplayed('');
  }, [resetKey, messages.join('|')]);

  useEffect(() => {
    if (messages.length === 0) {
      setDisplayed('');
      return;
    }

    const current = messages[messageIndex % messages.length];

    if (charIndex < current.length) {
      const timer = setTimeout(() => {
        setDisplayed(current.slice(0, charIndex + 1));
        setCharIndex((prev) => prev + 1);
      }, msPerChar);
      return () => clearTimeout(timer);
    }

    if (!loop) {
      setDisplayed(current);
      return;
    }

    const timer = setTimeout(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
      setCharIndex(0);
      setDisplayed('');
    }, pauseBetweenMessages);

    return () => clearTimeout(timer);
  }, [messages, messageIndex, charIndex, msPerChar, pauseBetweenMessages, loop]);

  return (
    <span className={className}>
      {displayed}
      <span className={cursorClassName} aria-hidden>
        |
      </span>
    </span>
  );
}
