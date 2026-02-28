import './GameOverScreen.css';

interface Props {
  scores: { playerId: string; name: string; gold: number; cardsInHand: number }[];
  winnerId: string;
  myId: string;
}

const RANK_EMOJI = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

export function GameOverScreen({ scores, winnerId, myId }: Props) {
  const isWinner = winnerId === myId;

  return (
    <div className="game-over">
      <div className="game-over-header">
        <span className="game-over-emoji">{isWinner ? '🏆' : '🫘'}</span>
        <h1>{isWinner ? 'You Win!' : 'Game Over'}</h1>
      </div>
      <div className="scoreboard">
        <h2>Final Scores</h2>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>🪙 Gold</th>
              <th>🃏 Cards</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score, i) => (
              <tr
                key={score.playerId}
                className={`${score.playerId === winnerId ? 'winner-row' : ''} ${score.playerId === myId ? 'my-row' : ''}`}
              >
                <td>{RANK_EMOJI[i] || i + 1}</td>
                <td>
                  {score.name}
                  {score.playerId === myId && ' (you)'}
                </td>
                <td className="gold-cell">{score.gold}</td>
                <td>{score.cardsInHand}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        className="play-again-btn"
        onClick={() => window.location.reload()}
      >
        🔄 Play Again
      </button>
    </div>
  );
}
