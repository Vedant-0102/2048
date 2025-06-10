import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const GRID_SIZE = 4;
const INITIAL_TILES = 2;

let tileId = 0;
const getNextId = () => ++tileId;

const getRandomEmptyPosition = (tiles) => {
  const occupied = new Set(tiles.map(t => `${t.row},${t.col}`));
  const empty = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!occupied.has(`${r},${c}`)) empty.push({ row: r, col: c });
    }
  }
  return empty.length > 0 ? empty[Math.floor(Math.random() * empty.length)] : null;
};

const addRandomTile = (tiles) => {
  const pos = getRandomEmptyPosition(tiles);
  if (pos) {
    return [
      ...tiles,
      {
        id: getNextId(),
        value: Math.random() < 0.9 ? 2 : 4,
        row: pos.row,
        col: pos.col,
        isNew: true,
        initialPosition: true 
      },
    ];
  }
  return tiles;
};

const getTileAt = (tiles, row, col) => tiles.find(t => t.row === row && t.col === col);

const moveLine = (line) => {
  const filtered = line.filter(cell => cell.value !== 0);
  const merged = [];
  let scoreIncrease = 0;
  let skip = false;

  for (let i = 0; i < filtered.length; i++) {
    if (!skip && i < filtered.length - 1 && filtered[i].value === filtered[i + 1].value) {
      merged.push({ ...filtered[i], value: filtered[i].value * 2 });
      scoreIncrease += filtered[i].value * 2;
      skip = true;
    } else if (!skip) {
      merged.push(filtered[i]);
    } else {
      skip = false;
    }
  }

  while (merged.length < GRID_SIZE) merged.push(null);
  return { line: merged, scoreIncrease };
};

const moveBoard = (tiles, direction) => {
  let moved = false;
  let scoreIncrease = 0;
  const newTiles = [];
  const isHorizontal = direction === 'left' || direction === 'right';

  for (let i = 0; i < GRID_SIZE; i++) {
    const line = [];

    for (let j = 0; j < GRID_SIZE; j++) {
      const row = isHorizontal ? i : j;
      const col = isHorizontal ? j : i;
      const t = getTileAt(tiles, row, col);
      line.push(t ? { ...t } : { value: 0, row, col });
    }

    if (direction === 'right' || direction === 'down') line.reverse();
    const { line: newLine, scoreIncrease: delta } = moveLine(line);
    if (direction === 'right' || direction === 'down') newLine.reverse();

    for (let j = 0; j < GRID_SIZE; j++) {
      const row = isHorizontal ? i : j;
      const col = isHorizontal ? j : i;
      const newTile = newLine[j];
      if (newTile && newTile.value !== 0) {
        newTiles.push({ ...newTile, row, col, isNew: false });
      }
    }

    scoreIncrease += delta;
    if (delta > 0 || line.some((cell, idx) => cell.value !== newLine[idx]?.value)) {
      moved = true;
    }
  }

  return { tiles: newTiles, scoreIncrease, moved };
};

const isGameOver = (tiles) => {
  if (tiles.length < GRID_SIZE * GRID_SIZE) return false;
  for (const tile of tiles) {
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const neighbor = getTileAt(tiles, tile.row + dr, tile.col + dc);
      if (neighbor && neighbor.value === tile.value) return false;
    }
  }
  return true;
};

const checkWin = (tiles) => tiles.some(t => t.value === 2048);

const App = () => {
  const [tiles, setTiles] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeout = useRef(null);

  const initializeGame = useCallback(() => {
    tileId = 0;
    let t = [];
    for (let i = 0; i < INITIAL_TILES; i++) {
      t = addRandomTile(t);
    }
    setTiles(t);
    setScore(0);
    setGameOver(false);
    setGameWon(false);
    setIsAnimating(false);
  }, []);

  useEffect(() => {
    const saved = parseInt(localStorage.getItem('2048-highScore') || '0', 10);
    setHighScore(saved);
    initializeGame();
    return () => clearTimeout(animationTimeout.current);
  }, [initializeGame]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('2048-highScore', score.toString());
    }
  }, [score, highScore]);

  const handleMove = useCallback((direction) => {
    if (isAnimating || gameOver) return;
    const { tiles: movedTiles, scoreIncrease, moved } = moveBoard(tiles, direction);

    if (moved) {
      setIsAnimating(true);
      setScore(prev => prev + scoreIncrease);
      const newTiles = addRandomTile(movedTiles);
      setTiles(newTiles);
      if (checkWin(newTiles) && !gameWon) setGameWon(true);
      if (isGameOver(newTiles)) setGameOver(true);

      animationTimeout.current = setTimeout(() => {
        setTiles(prev => prev.map(t => ({ ...t, isNew: false })));
        setIsAnimating(false);
      }, 200);
    }
  }, [tiles, isAnimating, gameOver, gameWon]);

  useEffect(() => {
    const handleKey = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        handleMove(e.key.replace('Arrow', '').toLowerCase());
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleMove]);

  return (
    <div className="game-container">
      <div className="game-header">
        <h1 className="game-title">2048</h1>
        <div className="score-container">
          <div className="score-box">
            <div className="score-label">Score</div>
            <div className="score-value">{score}</div>
          </div>
          <div className="score-box">
            <div className="score-label">Best</div>
            <div className="score-value">{highScore}</div>
          </div>
        </div>
      </div>
      <div className="game-info">
        <p>Join the tiles, get to <strong>2048!</strong></p>
        <p className="game-instructions">Use arrow keys to move tiles</p>
      </div>
      <div className="game-board-container">
        <div className="game-board">
          <div className="grid-background">
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
              <div key={i} className="grid-cell" />
            ))}
          </div>
          <div className="grid-tiles">
            {tiles.map(tile => (
              <div
                key={tile.id}
                className={`tile tile-${tile.value}${tile.isNew ? ' tile-new' : ''}`}
                style={{
                  '--x': tile.col,
                  '--y': tile.row,
                  transform: `translate(${tile.col * 78}px, ${tile.row * 78}px)`
                }}
              >
                {tile.value}
              </div>
            ))}
          </div>
        </div>
        <button className="restart-button" onClick={initializeGame}>
          New Game
        </button>
      </div>

      {gameWon && (
        <div className="game-overlay">
          <div className="game-message">
            <h2>You Win!</h2>
            <p>Congratulations! You reached 2048!</p>
            <button onClick={() => setGameWon(false)}>Continue</button>
            <button onClick={initializeGame}>Try Again</button>
          </div>
        </div>
      )}

      {gameOver && (
        <div className="game-overlay">
          <div className="game-message">
            <h2>Game Over!</h2>
            <p>No more moves available.</p>
            <button onClick={initializeGame}>Try Again</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
