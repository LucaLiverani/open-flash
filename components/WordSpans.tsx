interface WordSpansProps {
  sentence: string;
  onWordClick: (e: React.MouseEvent<HTMLSpanElement>, word: string) => void;
}

export default function WordSpans({ sentence, onWordClick }: WordSpansProps) {
  return (
    <>
      {sentence.split(/(\s+)/).map((token, i) => {
        if (/^\s+$/.test(token)) {
          return <span key={i}>{token}</span>;
        }
        const cleaned = token.replace(/[.,;:!?"""''()[\]{}¡¿«»]/g, "").trim();
        return (
          <span
            key={i}
            data-word={cleaned || undefined}
            onClick={(e) => onWordClick(e, token)}
            className="cursor-pointer hover:bg-primary/10 active:bg-primary/20 rounded px-0.5 transition-colors"
          >
            {token}
          </span>
        );
      })}
    </>
  );
}
