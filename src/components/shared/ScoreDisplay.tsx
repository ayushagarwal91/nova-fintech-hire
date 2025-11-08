interface ScoreDisplayProps {
  score: number;
  maxScore?: number;
}

const getScoreColor = (score: number): string => {
  if (score >= 8) return 'text-accent';
  if (score >= 7) return 'text-primary';
  return 'text-muted-foreground';
};

export const ScoreDisplay = ({ score, maxScore = 10 }: ScoreDisplayProps) => {
  return (
    <span className={`font-semibold ${getScoreColor(score)}`}>
      {score || '-'}/{maxScore}
    </span>
  );
};
