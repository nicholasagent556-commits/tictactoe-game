# Tic Tac Toe Game Specification

## Project Overview

- **Project Name:** Tic Tac Toe (Multiplayer)
- **Type:** Real-time Web Game
- **Core Functionality:** Classic Tic Tac Toe with solo AI mode and real-time multiplayer via WebSocket
- **Target Users:** Casual gamers wanting quick matches solo or with friends

---

## 1. UI/UX Specification

### Layout Structure

**Page Sections:**
- Header: Game title, mode selector (Solo/Multiplayer)
- Main: 3x3 game board (centered)
- Footer: Game status, restart button, score display

**Responsive Breakpoints:**
- Mobile: < 640px (board cells 80px, vertical layout)
- Tablet: 640px - 1024px (board cells 100px)
- Desktop: > 1024px (board cells 120px)

### Visual Design

**Color Palette (Dark Theme):**
- Background: `#0f0f0f`
- Surface: `#1a1a1a`
- Surface Elevated: `#252525`
- Primary (X): `#ff6b6b` (coral red)
- Secondary (O): `#4ecdc4` (teal)
- Text Primary: `#ffffff`
- Text Secondary: `#888888`
- Accent/Highlight: `#ffe66d` (gold for wins)
- Border: `#333333`

**Typography:**
- Font Family: `"JetBrains Mono", "Fira Code", monospace`
- Title: 2rem, bold
- Board Symbols: 3rem (mobile), 4rem (desktop), bold
- Body: 1rem
- Status: 1.25rem

**Spacing System:**
- Base unit: 8px
- Container padding: 24px
- Cell gap: 8px
- Section spacing: 16px

**Visual Effects:**
- Cell hover: background lightens to `#2a2a2a`
- Cell occupied: subtle scale(0.95) with 150ms transition
- Win highlight: cell glow with accent color, pulse animation
- Board: subtle box-shadow `0 8px 32px rgba(0,0,0,0.5)`

### Components

**Mode Selector:**
- Two toggle buttons: "Solo" | "Multiplayer"
- Active state: filled with primary color
- Inactive: outlined, transparent

**Game Board:**
- 3x3 CSS Grid
- Each cell: square aspect-ratio, clickable
- States: empty, X, O, winning (highlighted)

**Cell States:**
- Default: empty, shows hover effect on empty cells only
- X: displays "X" in primary color
- O: displays "O" in secondary color
- Winning: gold glow, slight pulse

**Status Display:**
- Shows: "Your turn", "AI thinking...", "Waiting for opponent...", "X wins!", "Draw!"
- Animated text transition on change

**Restart Button:**
- Appears after game ends
- Resets board, keeps scores

**Score Board:**
- Three columns: X (Player) | Draws | O (AI/Player 2)
- Persists across games in session

**Multiplayer Room UI:**
- Room code input (6 characters)
- "Create Room" button
- "Join Room" button with code field
- Waiting room state with shareable code

---

## 2. Functionality Specification

### Core Features

**Solo Mode (vs AI):**
- Player is always X, AI is O
- AI moves after 500ms delay (feels natural)
- AI uses minimax algorithm with depth limit 4 (unbeatable but fast)

**Multiplayer Mode:**
- Create room → generates 6-char alphanumeric code
- Join room → enter code to connect
- Real-time sync via WebSocket
- Player X goes first
- Reconnection handling (30s timeout)

**Game Mechanics:**
- Standard Tic Tac Toe rules
- Win: 3 in a row (horizontal, vertical, diagonal)
- Draw: all 9 cells filled, no winner
- Click to place mark (valid moves only)
- Game ends immediately on win

### User Interactions

1. Select mode (Solo/Multiplayer)
2. Solo: click cell to play
3. Multiplayer: create/join room, then play
4. View game result
5. Click Restart to play again

### Edge Cases

- Clicking occupied cell: ignored
- Clicking during AI turn: ignored
- Multiplayer disconnect: show error, offer to restart
- Invalid room code: show error message
- Simultaneous clicks (multiplayer): server decides, sync state

---

## 3. Technical Specification

### AI Logic (Minimax)

```
function minimax(board, depth, isMaximizing):
    if game over: return score (+10, -10, 0)
    if depth == 0: return heuristic evaluation
    
    if isMaximizing (AI, O):
        best = -infinity
        for each move:
            result = minimax(board with O, depth-1, false)
            best = max(best, result)
        return best
    else (Player, X):
        best = +infinity
        for each move:
            result = minimax(board with X, depth-1, true)
            best = min(best, result)
        return best
```

- Depth limit: 4 (fast, unbeatable at casual level)
- Heuristic: count potential wins, block opponent wins

### WebSocket API

**Connection:**
- URL: `wss://[server]/game`
- Auth: room code in handshake

**Messages (JSON):**

Client → Server:
```json
{"type": "create_room"}
{"type": "join_room", "roomCode": "ABC123"}
{"type": "move", "index": 4}
{"type": "ping"}
```

Server → Client:
```json
{"type": "room_created", "roomCode": "ABC123"}
{"type": "room_joined", "player": "X", "opponent": "O"}
{"type": "game_start", "first": "X"}
{"type": "move_made", "player": "X", "index": 4}
{"type": "game_over", "winner": "X", "line": [0,1,2]}
{"type": "draw"}
{"type": "opponent_left"}
{"type": "error", "message": "Invalid room code"}
{"type": "pong"}
```

**Room Management:**
- Room codes: 6 uppercase alphanumeric
- Timeout: 60 seconds waiting for opponent
- Inactivity: 5 minutes, then auto-cleanup

---

## 4. Acceptance Criteria

### Visual Checkpoints
- [ ] Dark theme with #0f0f0f background
- [ ] X displays in #ff6b6b, O in #4ecdc4
- [ ] Board centered, responsive across breakpoints
- [ ] Win state shows gold glow on winning line
- [ ] Mode toggle clearly shows active state

### Functional Checkpoints
- [ ] Solo mode: can play vs AI, AI makes reasonable moves
- [ ] AI is at least difficult to beat (blocks wins, takes wins)
- [ ] Multiplayer: can create room, get code
- [ ] Multiplayer: can join room with code
- [ ] Real-time sync: moves appear within 200ms
- [ ] Game correctly detects all win conditions
- [ ] Draw detected when board full
- [ ] Restart resets board, preserves scores

### Mobile Checkpoints
- [ ] Board fits screen without horizontal scroll
- [ ] Touch targets minimum 44px
- [ ] Text readable without zoom

---

## 5. File Structure

```
tictactoe/
├── SPEC.md
├── index.html      # Main game page
├── style.css      # All styles
├── game.js       # Game logic, AI, UI
├── client.js    # WebSocket client
└── server.js    # WebSocket server (Node.js)
```

**Server Requirements:**
- Node.js with `ws` package
- Port: 3000 (or environment variable)
- CORS: allow all origins (development)