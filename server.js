const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3000;

// HTTP server (for health check)
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Tic Tac Toe WebSocket Server\n');
});

// WebSocket server
const wss = new WebSocket.Server({ server });

// Room storage: roomCode -> { players: [ws1, ws2], board: Array(9).fill(null), currentTurn: 'X', gameOver: false }
const rooms = new Map();

// Generate 6-character alphanumeric room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Get player symbol in a room
function getPlayerSymbol(room, ws) {
  if (room.players[0] === ws) return 'X';
  if (room.players[1] === ws) return 'O';
  return null;
}

// Check for win
function checkWin(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return null;
}

// Check for draw
function checkDraw(board) {
  return board.every(cell => cell !== null);
}

// Broadcast to all players in room
function broadcast(room, message, exclude = null) {
  const data = JSON.stringify(message);
  for (const player of room.players) {
    if (player && player !== exclude && player.readyState === WebSocket.OPEN) {
      player.send(data);
    }
  }
}

// Send to specific client
function send(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Clean up room
function cleanupRoom(roomCode) {
  const room = rooms.get(roomCode);
  if (room) {
    for (const player of room.players) {
      if (player && player.readyState === WebSocket.OPEN) {
        player.send(JSON.stringify({ type: 'room_closed' }));
        player.close();
      }
    }
    rooms.delete(roomCode);
    console.log(`Room ${roomCode} cleaned up`);
  }
}

// Handle incoming messages
function handleMessage(ws, message) {
  const { type, roomCode, index } = message;
  const room = rooms.get(ws.roomCode);

  switch (type) {
    case 'create_room': {
      const newCode = generateRoomCode();
      const newRoom = {
        players: [ws, null],
        board: Array(9).fill(null),
        currentTurn: 'X',
        gameOver: false
      };
      ws.roomCode = newCode;
      rooms.set(newCode, newRoom);
      send(ws, { type: 'room_created', roomCode: newCode, player: 'X' });
      console.log(`Room ${newCode} created`);
      break;
    }

    case 'join_room': {
      if (!roomCode || roomCode.length !== 6) {
        send(ws, { type: 'error', message: 'Invalid room code' });
        return;
      }
      const targetRoom = rooms.get(roomCode.toUpperCase());
      if (!targetRoom) {
        send(ws, { type: 'error', message: 'Room not found' });
        return;
      }
      if (targetRoom.players[1]) {
        send(ws, { type: 'error', message: 'Room is full' });
        return;
      }
      if (targetRoom.gameOver) {
        // Restart game for rejoin
        targetRoom.board = Array(9).fill(null);
        targetRoom.currentTurn = 'X';
        targetRoom.gameOver = false;
      }
      targetRoom.players[1] = ws;
      ws.roomCode = roomCode.toUpperCase();
      send(ws, { type: 'room_joined', roomCode: ws.roomCode, player: 'O' });
      // Notify both players
      const playerX = targetRoom.players[0];
      if (playerX && playerX.readyState === WebSocket.OPEN) {
        playerX.send(JSON.stringify({ type: 'opponent_joined', player: 'O' }));
      }
      broadcast(targetRoom, { type: 'game_start', first: 'X' }, ws);
      console.log(`Player O joined room ${ws.roomCode}`);
      break;
    }

    case 'move': {
      if (!room || room.gameOver) return;
      const playerSymbol = getPlayerSymbol(room, ws);
      if (!playerSymbol) return;
      if (playerSymbol !== room.currentTurn) return;
      if (typeof index !== 'number' || index < 0 || index > 8) return;
      if (room.board[index]) return; // cell occupied

      // Make move
      room.board[index] = playerSymbol;
      broadcast(room, { type: 'move_made', player: playerSymbol, index });

      // Check win
      const winResult = checkWin(room.board);
      if (winResult) {
        room.gameOver = true;
        broadcast(room, { type: 'game_over', winner: winResult.winner, line: winResult.line });
        console.log(`Game over in room ${ws.roomCode}: ${winResult.winner} wins`);
        return;
      }

      // Check draw
      if (checkDraw(room.board)) {
        room.gameOver = true;
        broadcast(room, { type: 'draw' });
        console.log(`Draw in room ${ws.roomCode}`);
        return;
      }

      // Switch turn
      room.currentTurn = room.currentTurn === 'X' ? 'O' : 'X';
      break;
    }

    case 'restart': {
      if (!room) return;
      const playerSymbol = getPlayerSymbol(room, ws);
      if (!playerSymbol) return;
      // Either player can restart
      room.board = Array(9).fill(null);
      room.currentTurn = 'X';
      room.gameOver = false;
      broadcast(room, { type: 'game_restart', first: 'X' });
      console.log(`Game restarted in room ${ws.roomCode}`);
      break;
    }

    case 'ping': {
      send(ws, { type: 'pong' });
      break;
    }

    default:
      console.log(`Unknown message type: ${type}`);
  }
}

// Handle client disconnect
function handleDisconnect(ws) {
  const roomCode = ws.roomCode;
  if (!roomCode) return;
  
  const room = rooms.get(roomCode);
  if (!room) return;

  const playerSymbol = getPlayerSymbol(room, ws);
  if (!playerSymbol) return;

  // Notify opponent
  const opponent = room.players[0] === ws ? room.players[1] : room.players[0];
  if (opponent && opponent.readyState === WebSocket.OPEN) {
    send(opponent, { type: 'opponent_left', player: playerSymbol });
  }

  // Remove player from room
  if (playerSymbol === 'X') {
    room.players[0] = null;
  } else {
    room.players[1] = null;
  }

  // Clean up room if empty or opponent left
  if (!room.players[0] && !room.players[1]) {
    cleanupRoom(roomCode);
  } else {
    console.log(`Player ${playerSymbol} left room ${roomCode}`);
  }
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  ws.roomCode = null;
  console.log('New client connected');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, message);
    } catch (err) {
      console.error('Failed to parse message:', err);
      send(ws, { type: 'error', message: 'Invalid message format' });
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
    console.log('Client disconnected');
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

// Clean up inactive rooms periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [roomCode, room] of rooms) {
    // Could add more sophisticated cleanup logic here
    if (!room.players[0] && !room.players[1]) {
      cleanupRoom(roomCode);
    }
  }
}, 5 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`Tic Tac Toe server running on port ${PORT}`);
});