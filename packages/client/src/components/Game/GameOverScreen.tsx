import './GameOverScreen.css';

interface Props {
  scores: { playerId: string; name: string; gold: number; cardsInHand: number }[];
  winnerId: string;
  myId: string;
}

export function GameOverScreen({ scores, winnerId, myId }: Props) {
  const isWinner = winnerId === myId;

  return (
    <div className="game-over">
      <h1>{isWinner ? 'You Win!' : 'Game Over'}</h1>
      <div className="scoreboard">
        <h2>Final Scores</h2>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Gold</th>
              <th>Cards</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score, i) => (
              <tr
                key={score.playerId}
                className={`${score.playerId === winnerId ? 'winner-row' : ''} ${score.playerId === myId ? 'my-row' : ''}`}
              >
                <td>{i + 1}</td>
                <td>
                  {score.name}
                  {score.playerId === myId && ' (you)'}
                  {score.playerId === winnerId && ' *'}
                </td>
                <td>{score.gold}</td>
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
        Play Again
      </button>
    </div>
  );
}
