// Tic Tac Toe - Game Logic, AI, and WebSocket Client

const WS_URL = 'ws://localhost:3000';
const AI_DEPTH = 4;

// Game State
let gameMode = 'solo'; // 'solo' or 'multi'
let currentPlayer = 'X';
let board = Array(9).fill(null);
let gameOver = false;
let scores = { X: 0, O: 0, draw: 0 };

// Solo Mode
let isPlayerTurn = true;
let aiThinking = false;

// Multiplayer Mode
let ws = null;
let roomCode = null;
let playerSymbol = null;
let opponentConnected = false;
let isMyTurn = false;

// DOM Elements
const soloUI = document.getElementById('solo-ui');
const multiUI = document.getElementById('multi-ui');
const roomLobby = document.getElementById('room-lobby');
const waitingRoom = document.getElementById('waiting-room');
const multiGame = document.getElementById('multi-game');
const statusEl = document.getElementById('status');
const boardEl = document.getElementById('board');
const boardMultiEl = document.getElementById('board-multi');
const restartBtn = document.getElementById('restart');
const restartMultiBtn = document.getElementById('restart-multi');
const scoreX = document.getElementById('score-x');
const scoreDraw = document.getElementById('score-draw');
const scoreO = document.getElementById('score-o');

// Mode buttons
const btnSolo = document.getElementById('btn-solo');
const btnMulti = document.getElementById('btn-multi');

// Multiplayer elements
const roomCodeInput = document.getElementById('room-code-input');
const btnCreateRoom = document.getElementById('btn-create-room');
const btnJoinRoom = document.getElementById('btn-join-room');
const displayRoomCode = document.getElementById('display-room-code');
const btnCopyCode = document.getElementById('btn-copy-code');
const multiStatus = document.getElementById('multi-status');
const multiStatusGame = document.getElementById('multi-status-game');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initModeButtons();
    initSoloBoard();
    initMultiplayerBoard();
    initMultiplayerControls();
});

// Mode Selection
function initModeButtons() {
    btnSolo.addEventListener('click', () => switchMode('solo'));
    btnMulti.addEventListener('click', () => switchMode('multi'));
}

function switchMode(mode) {
    gameMode = mode;
    btnSolo.classList.toggle('active', mode === 'solo');
    btnMulti.classList.toggle('active', mode === 'multi');
    
    soloUI.classList.toggle('hidden', mode !== 'solo');
    multiUI.classList.toggle('hidden', mode !== 'multi');
    
    if (mode === 'solo') {
        resetSoloGame();
    } else {
        resetMultiplayerUI();
    }
}

// Solo Mode
function initSoloBoard() {
    const cells = boardEl.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.addEventListener('click', () => handleSoloClick(parseInt(cell.dataset.index)));
    });
    
    restartBtn.addEventListener('click', resetSoloGame);
}

function handleSoloClick(index) {
    if (gameOver || !isPlayerTurn || aiThinking) return;
    if (board[index] !== null) return;
    
    makeMove(index, 'X');
    
    if (!gameOver) {
        isPlayerTurn = false;
        statusEl.textContent = 'AI thinking...';
        
        aiThinking = true;
        setTimeout(() => {
            const aiMove = getAIMove();
            makeMove(aiMove, 'O');
            aiThinking = false;
            
            if (!gameOver) {
                isPlayerTurn = true;
                statusEl.textContent = 'Your turn (X)';
            }
        }, 500);
    }
}

function resetSoloGame() {
    board = Array(9).fill(null);
    gameOver = false;
    currentPlayer = 'X';
    isPlayerTurn = true;
    aiThinking = false;
    
    const cells = boardEl.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.className = 'cell';
    });
    
    statusEl.textContent = 'Your turn (X)';
    restartBtn.classList.add('hidden');
}

// AI (Minimax)
function getAIMove() {
    let bestScore = -Infinity;
    let bestMove = 4; // Center is often good
    
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            board[i] = 'O';
            const score = minimax(board, AI_DEPTH - 1, false);
            board[i] = null;
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }
    
    return bestMove;
}

function minimax(boardState, depth, isMaximizing) {
    const winner = checkWinner(boardState);
    if (winner !== null) {
        if (winner === 'O') return 10 + depth;
        if (winner === 'X') return -10 - depth;
        return 0;
    }
    
    if (depth === 0 || isBoardFull(boardState)) {
        return evaluateBoard(boardState);
    }
    
    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (boardState[i] === null) {
                boardState[i] = 'O';
                const score = minimax(boardState, depth - 1, false);
                boardState[i] = null;
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < 9; i++) {
            if (boardState[i] === null) {
                boardState[i] = 'X';
                const score = minimax(boardState, depth - 1, true);
                boardState[i] = null;
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}

function evaluateBoard(boardState) {
    let score = 0;
    
    // Center control
    if (boardState[4] === 'O') score += 3;
    if (boardState[4] === 'X') score -= 3;
    
    // Corners
    const corners = [0, 2, 6, 8];
    corners.forEach(i => {
        if (boardState[i] === 'O') score += 1;
        if (boardState[i] === 'X') score -= 1;
    });
    
    // Potential lines
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
        [0, 4, 8], [2, 4, 6] // diagonals
    ];
    
    lines.forEach(line => {
        const values = line.map(i => boardState[i]);
        const oCount = values.filter(v => v === 'O').length;
        const xCount = values.filter(v => v === 'X').length;
        const emptyCount = values.filter(v => v === null).length;
        
        if (oCount === 2 && emptyCount === 1) score += 5;
        if (xCount === 2 && emptyCount === 1) score -= 5;
        if (oCount === 1 && emptyCount === 2) score += 1;
        if (xCount === 1 && emptyCount === 2) score -= 1;
    });
    
    return score;
}

// Shared Game Logic
function makeMove(index, symbol) {
    board[index] = symbol;
    
    const cells = gameMode === 'solo' 
        ? boardEl.querySelectorAll('.cell') 
        : boardMultiEl.querySelectorAll('.cell');
    
    const cell = cells[index];
    cell.textContent = symbol;
    cell.classList.add(symbol.toLowerCase(), 'occupied');
    
    const result = checkWinner(board);
    if (result) {
        endGame(result, getWinningLine(board));
    } else if (isBoardFull(board)) {
        endGame('draw', null);
    } else {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    }
}

function checkWinner(boardState) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
        [0, 4, 8], [2, 4, 6] // diagonals
    ];
    
    for (const line of lines) {
        const [a, b, c] = line;
        if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
            return boardState[a];
        }
    }
    
    return null;
}

function getWinningLine(boardState) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    for (const line of lines) {
        const [a, b, c] = line;
        if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
            return line;
        }
    }
    
    return null;
}

function isBoardFull(boardState) {
    return boardState.every(cell => cell !== null);
}

function endGame(winner, winningLine) {
    gameOver = true;
    
    const cells = gameMode === 'solo' 
        ? boardEl.querySelectorAll('.cell') 
        : boardMultiEl.querySelectorAll('.cell');
    
    if (winningLine) {
        winningLine.forEach(i => {
            cells[i].classList.add('winning');
        });
    }
    
    cells.forEach(cell => cell.classList.add('game-over'));
    
    if (winner === 'draw') {
        scores.draw++;
        scoreDraw.textContent = scores.draw;
        
        if (gameMode === 'solo') {
            statusEl.textContent = "It's a draw!";
        } else {
            multiStatusGame.textContent = "It's a draw!";
        }
    } else {
        scores[winner]++;
        
        if (gameMode === 'solo') {
            scoreX.textContent = scores.X;
            scoreO.textContent = scores.O;
            statusEl.textContent = winner === 'X' ? 'You win!' : 'AI wins!';
        } else {
            scoreX.textContent = scores.X;
            scoreO.textContent = scores.O;
            
            const isWinner = (playerSymbol === winner);
            multiStatusGame.textContent = isWinner ? 'You win!' : 'You lose!';
        }
    }
    
    if (gameMode === 'solo') {
        restartBtn.classList.remove('hidden');
    } else {
        restartMultiBtn.classList.remove('hidden');
    }
}

// Multiplayer Mode
function initMultiplayerBoard() {
    const cells = boardMultiEl.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.addEventListener('click', () => {
            const index = parseInt(cell.dataset.index);
            handleMultiplayerClick(index);
        });
    });
    
    restartMultiBtn.addEventListener('click', () => {
        restartMultiBtn.classList.add('hidden');
        // Send restart request via WebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'restart' }));
        }
    });
}

function initMultiplayerControls() {
    btnCreateRoom.addEventListener('click', createRoom);
    btnJoinRoom.addEventListener('click', joinRoom);
    btnCopyCode.addEventListener('click', copyRoomCode);
}

function createRoom() {
    const code = generateRoomCode();
    roomCode = code;
    displayRoomCode.textContent = code;
    
    roomLobby.classList.add('hidden');
    waitingRoom.classList.remove('hidden');
    
    connectWebSocket(code);
}

function joinRoom() {
    const code = roomCodeInput.value.toUpperCase().trim();
    if (code.length !== 6) {
        alert('Please enter a valid 6-character room code');
        return;
    }
    
    roomCode = code;
    displayRoomCode.textContent = code;
    
    roomLobby.classList.add('hidden');
    waitingRoom.classList.remove('hidden');
    
    connectWebSocket(code);
}

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function copyRoomCode() {
    navigator.clipboard.writeText(roomCode).then(() => {
        btnCopyCode.textContent = 'Copied!';
        setTimeout(() => {
            btnCopyCode.textContent = 'Copy Code';
        }, 2000);
    });
}

function connectWebSocket(code) {
    try {
        ws = new WebSocket(WS_URL);
        
        ws.onopen = () => {
            console.log('WebSocket connected');
            if (roomCode === displayRoomCode.textContent) {
                ws.send(JSON.stringify({ type: 'create_room', roomCode: code }));
            } else {
                ws.send(JSON.stringify({ type: 'join_room', roomCode: code }));
            }
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleServerMessage(data);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            multiStatus.textContent = 'Connection error';
        };
        
        ws.onclose = () => {
            console.log('WebSocket closed');
            if (!gameOver) {
                multiStatus.textContent = 'Connection lost';
            }
        };
    } catch (e) {
        console.error('WebSocket connection failed:', e);
        multiStatus.textContent = 'Failed to connect';
    }
}

function handleServerMessage(data) {
    switch (data.type) {
        case 'room_created':
            roomCode = data.roomCode;
            displayRoomCode.textContent = roomCode;
            multiStatus.textContent = 'Room created. Waiting for opponent...';
            break;
            
        case 'room_joined':
            playerSymbol = data.player;
            opponentConnected = true;
            multiStatus.textContent = `You are ${playerSymbol}. Waiting for game start...`;
            break;
            
        case 'game_start':
            playerSymbol = data.first;
            isMyTurn = data.first === 'X';
            startMultiplayerGame();
            break;
            
        case 'move_made':
            board[data.index] = data.player;
            updateMultiplayerBoard();
            
            const winner = checkWinner(board);
            if (winner) {
                endGame(winner, getWinningLine(board));
            } else if (isBoardFull(board)) {
                endGame('draw', getWinningLine(board));
            } else {
                isMyTurn = !isMyTurn;
                updateMultiplayerStatus();
            }
            break;
            
        case 'game_over':
            if (data.winner) {
                endGame(data.winner, data.line);
            } else {
                endGame('draw', null);
            }
            break;
            
        case 'opponent_left':
            multiStatusGame.textContent = 'Opponent left the game';
            break;
            
        case 'error':
            alert(data.message);
            resetMultiplayerUI();
            break;
            
        case 'restart':
            resetMultiplayerGame();
            break;
    }
}

function handleMultiplayerClick(index) {
    if (!isMyTurn || gameOver || board[index] !== null) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    ws.send(JSON.stringify({ type: 'move', index }));
}

function startMultiplayerGame() {
    waitingRoom.classList.add('hidden');
    multiGame.classList.remove('hidden');
    
    resetMultiplayerGame();
}

function resetMultiplayerGame() {
    board = Array(9).fill(null);
    gameOver = false;
    currentPlayer = 'X';
    
    const cells = boardMultiEl.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.className = 'cell';
    });
    
    updateMultiplayerStatus();
    restartMultiBtn.classList.add('hidden');
}

function updateMultiplayerBoard() {
    const cells = boardMultiEl.querySelectorAll('.cell');
    board.forEach((symbol, index) => {
        if (symbol) {
            const cell = cells[index];
            cell.textContent = symbol;
            cell.classList.add(symbol.toLowerCase(), 'occupied');
        }
    });
}

function updateMultiplayerStatus() {
    if (gameOver) return;
    
    const symbol = isMyTurn ? playerSymbol : (playerSymbol === 'X' ? 'O' : 'X');
    multiStatusGame.textContent = isMyTurn ? `Your turn (${symbol})` : `Opponent's turn...`;
}

function resetMultiplayerUI() {
    if (ws) {
        ws.close();
        ws = null;
    }
    
    roomCode = null;
    playerSymbol = null;
    opponentConnected = false;
    isMyTurn = false;
    gameOver = false;
    board = Array(9).fill(null);
    
    roomLobby.classList.remove('hidden');
    waitingRoom.classList.add('hidden');
    multiGame.classList.add('hidden');
    roomCodeInput.value = '';
    multiStatus.textContent = 'Waiting for opponent...';
    multiStatusGame.textContent = 'Waiting for opponent...';
    restartMultiBtn.classList.add('hidden');
    
    const cells = boardMultiEl.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.className = 'cell';
    });
}

// Expose restart for multiplayer
window.restartMultiplayer = resetMultiplayerGame;