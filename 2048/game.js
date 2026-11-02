// Create an empty 4x4 board
let board = Array.from({ length: 4 }, () => Array(4).fill(null));

let score = 0;
let bestScore = Number(localStorage.getItem("bestScore")) || 0;
let nextTileId = 1;

const gameBoard = document.getElementById("game-board");

let cellLayer = null;
let tileLayer = null;

const tileElements = new Map();
const gap = 10;


// Create a new tile object
function createTile(value) {
    return {
        id: nextTileId++,
        value: value
    };
}


// Add a random tile to an empty cell
function addRandomTile() {
    const emptyCells = [];

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            if (board[row][col] === null) {
                emptyCells.push({ row, col });
            }
        }
    }

    if (emptyCells.length === 0) return;

    const index = Math.floor(Math.random() * emptyCells.length);
    const { row, col } = emptyCells[index];

    const value = Math.random() < 0.9 ? 2 : 4;
    board[row][col] = createTile(value);
}


// Create the stationary board layers once
function setupBoard() {
    gameBoard.innerHTML = "";

    cellLayer = document.createElement("div");
    cellLayer.classList.add("cell-layer");

    tileLayer = document.createElement("div");
    tileLayer.classList.add("tile-layer");

    for (let i = 0; i < 16; i++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cellLayer.appendChild(cell);
    }

    gameBoard.appendChild(cellLayer);
    gameBoard.appendChild(tileLayer);
}


// Draw tiles without recreating existing ones
function drawBoard() {
    if (!tileLayer) {
        setupBoard();
    }

    document.getElementById("score").textContent = score;
    document.getElementById("best-score").textContent = bestScore;

    const activeIds = new Set();

    const cellSize = (tileLayer.clientWidth - gap * 3) / 4;

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            const tileData = board[row][col];

            if (tileData === null) continue;

            const { id, value } = tileData;
            activeIds.add(id);

            let element = tileElements.get(id);
            const isNew = !element;

            if (isNew) {
                element = document.createElement("div");
                element.style.transform = "scale(0.75)";
                element.style.opacity = "0";

                tileElements.set(id, element);
                tileLayer.appendChild(element);
            }

            element.className = `tile tile-${value}`;
            element.textContent = value;

            element.style.width = `${cellSize}px`;
            element.style.height = `${cellSize}px`;
            element.style.left = `${col * (cellSize + gap)}px`;
            element.style.top = `${row * (cellSize + gap)}px`;

            if (isNew) {
                requestAnimationFrame(() => {
                    element.style.transform = "scale(1)";
                    element.style.opacity = "1";
                });
            }
        }
    }

    // Remove tiles that were consumed in a merge
    for (const [id, element] of tileElements) {
        if (!activeIds.has(id)) {
            element.remove();
            tileElements.delete(id);
        }
    }
}


// Compare the board before and after a move
function boardChanged(snapshot) {
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            const oldTile = snapshot[row][col];
            const newTile = board[row][col];

            if (oldTile?.id !== newTile?.id ||
                oldTile?.value !== newTile?.value) {
                return true;
            }
        }
    }

    return false;
}


// Move and merge tiles in any direction
function move(direction) {
    const snapshot = board.map(row =>
        row.map(tile => tile ? { ...tile } : null)
    );

    // Process each row or column from the side we're moving towards
    for (let line = 0; line < 4; line++) {
        const positions = [];

        for (let step = 0; step < 4; step++) {
            let row, col;

            if (direction === "left") {
                row = line;
                col = step;
            } else if (direction === "right") {
                row = line;
                col = 3 - step;
            } else if (direction === "up") {
                row = step;
                col = line;
            } else {
                row = 3 - step;
                col = line;
            }

            positions.push({ row, col });
        }

        const tiles = positions
            .map(({ row, col }) => board[row][col])
            .filter(tile => tile !== null);

        const merged = [];

        for (let i = 0; i < tiles.length; i++) {
            const current = tiles[i];
            const next = tiles[i + 1];

            if (next && current.value === next.value) {
                // Keep the first tile's identity and double its value
                current.value *= 2;
                merged.push(current);

                score += current.value;
                i++; // The second tile is consumed

                if (score > bestScore) {
                    bestScore = score;
                    localStorage.setItem("bestScore", bestScore);
                }
            } else {
                merged.push(current);
            }
        }

        // Put the resulting tiles against the requested edge
        positions.forEach(({ row, col }, index) => {
            board[row][col] = merged[index] ?? null;
        });
    }

    return boardChanged(snapshot);
}


// Check whether any moves remain
function isGameOver() {
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            if (board[row][col] === null) return false;

            if (col < 3 &&
                board[row][col].value === board[row][col + 1]?.value) {
                return false;
            }

            if (row < 3 &&
                board[row][col].value === board[row + 1][col]?.value) {
                return false;
            }
        }
    }

    return true;
}


// Start a fresh game
function startNewGame() {
    board = Array.from({ length: 4 }, () => Array(4).fill(null));
    score = 0;

    document.getElementById("game-over").hidden = true;

    // Clear old tile elements and reset their identities
    tileElements.clear();
    nextTileId = 1;

    if (tileLayer) {
        tileLayer.innerHTML = "";
    }

    addRandomTile();
    addRandomTile();
    drawBoard();
}


// Handle keyboard input
document.addEventListener("keydown", function(event) {
    const directions = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down"
    };

    const direction = directions[event.key];

    if (!direction) return;

    event.preventDefault();

    const changed = move(direction);

    if (changed) {
        addRandomTile();
    }

    drawBoard();

    document.getElementById("game-over").hidden = !isGameOver();
});


// Connect the New Game button
document.getElementById("new-game").addEventListener("click", startNewGame);


// Start the game
startNewGame();