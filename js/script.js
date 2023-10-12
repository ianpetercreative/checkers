/*----- constants -----*/
/*----- cached elements  -----*/
const tableEl = document.getElementById('table');

const gameBoardEl = document.getElementById('game-board');

const rowEls = [...gameBoardEl.querySelectorAll('.row')];

const playerTurnMsg = document.getElementById('player-turn');
const winnerPopup = document.getElementById('winner-popup');
const winnerMsg = document.getElementById('winner-msg');
const title = document.getElementById('title');


/*----- state variables -----*/
// starting game state: 
const gameBoard = [
  [null, -1, null, -1, null, -1, null, -1],
  [-1, null, -1, null, -1, null, -1, null],
  [null, -1, null, -1, null, -1, null, -1],
  [0, null, 0, null, 0, null, 0, null],
  [null, 0, null, 0, null, 0, null, 0],
  [1, null, 1, null, 1, null, 1, null],
  [null, 1, null, 1, null, 1, null, 1],
  [1, null, 1, null, 1, null, 1, null],
];

// track player turn and winner: 
let playerTurn = 1;
let winner = null;

// track pucks and kings that belong to the current player separatately.
// tracking separately allows for the functions to check for jumps more easily. 
let playerPucks = [];
let playerKings = [];

// available moves will be tracked in between each click. 
// if a player can attempt a multi-jump in one turn, only multijumps will have values
let multiJumps = [];
// if no multijumps are available, the turn will switch
// if jumps are available, only jumpsavailable will have values 
let jumpsAvailable = [];
// if no multijumps and no jumpsavailable, then the movablepuck array will have values 
let movablePucks = [];
// destinations are determined by the previous arrays values 
let destinations = [];

// temporarily track click information in the global scope 
let selectedPuck = null;
let selectedPuckRow = null;
let selectedPuckCol = null;
let moveToRow = null;
let moveToCol = null;


/*----- event listeners -----*/


gameBoardEl.addEventListener('click', function clickHandler(evt) {
  // record click information to determine what the click should do with the information 
  const clickedEl = evt.target;
  const clickedElParent = clickedEl.parentElement;
  const rowIdx = parseInt(clickedElParent.dataset.row);
  const colIdx = parseInt(clickedElParent.dataset.col);

  // if there is a winner, the click should not perform any actions 
  if (winner) {
    return;
  }

  // click priority:
  // 1. Did the user click a movable puck? 
  // 2. Did the user click a destination? 
  // 3. Did user click anywhere else? 
  if (clickedElParent.className.includes('movable-puck')) {
    // user clicked a moovable puck 
    // clear destination highlights and the array
    clearDestinationHighlights();
    destinations = [];

    // highlight destinations based on the clicked puck. store data in global scope 
    highlightDestination(rowIdx, colIdx)
    selectedPuck = evt.target;
    selectedPuckRow = rowIdx
    selectedPuckCol = colIdx


  } else if (clickedEl.classList.contains('destination')) {
    // user clicked a destination 
    // store destination row and col in global scope 
    moveToRow = parseInt(clickedEl.dataset.row);
    moveToCol = parseInt(clickedEl.dataset.col);

    // if performing a jump 
    if (jumpsAvailable.length > 0 || multiJumps.length > 0) {
      // clear destination highlights
      clearDestinationHighlights();

      // perform jump 
      jumpPuck(selectedPuck, selectedPuckRow, selectedPuckCol, moveToRow, moveToCol)

      // reset state variables 
      movablePucks = [];
      jumpsAvailable = [];

      // check for kings and winner 
      checkForKings();
      checkForWinner();

      // if performing a regular move 
    } else {
      // clear destination highlights 
      clearDestinationHighlights();
      destinations = [];

      // perform move
      movePuck(selectedPuck, selectedPuckRow, selectedPuckCol, moveToRow, moveToCol);

      // reset state variables 
      movablePucks = [];

      // check for kings, change player, check for winner 
      checkForKings();
      changePlayer();
      checkForWinner();
    }
  } else {
    // the user did not click on a movable puck or a destination 
    // clear all highlights and variables
    // re-render the board in its previous state 
    clearDestinationHighlights();
    destinations = [];
    selectedPuck = null;
    selectedPuckRow = null;
    selectedPuckCol = null;
    movablePucks = [];

    render();
  }




})


/*----- functions -----*/

function render() {
  // iterate over gameBoad to place pucks
  for (let rowIdx = 0; rowIdx < gameBoard.length; rowIdx++) {
    const row = gameBoard[rowIdx];
    const squaresInRow = rowEls[rowIdx].querySelectorAll('.square');
    for (let sqIdx = 0; sqIdx < row.length; sqIdx++) {
      const squareValue = row[sqIdx];
      const square = squaresInRow[sqIdx];
      square.innerHTML = '';
      if (squareValue === 1) {
        const redPuck = document.createElement('div');
        redPuck.setAttribute("class", "red-puck");
        square.appendChild(redPuck);
      } else if (squareValue === -1) {
        const blackPuck = document.createElement('div');
        blackPuck.setAttribute("class", "black-puck");
        square.appendChild(blackPuck);
      } else if (squareValue === 2) {
        const redKing = document.createElement('div')
        redKing.setAttribute("class", "red-king")
        square.appendChild(redKing)
        // square.classList.add('king-container')
      } else if (squareValue === -2) {
        const blackKing = document.createElement('div');
        blackKing.setAttribute("class", "black-king");
        square.appendChild(blackKing);
        // square.classList.add('king-container')
      }
    }
  }

  // display player turn 
  if (playerTurn === 1) {
    playerTurnMsg.textContent = `Red's Turn`

  } else if (playerTurn === -1) {
    playerTurnMsg.textContent = `Black's Turn`

  }

  // check for moves – this will highlight movable pucks 
  checkForMoves(playerTurn);
}


// multiply the playerTurn by -1 to change player turn 
function changePlayer() {
  // players are 1 and -1.
  // positive values belong to player 1
  // negative values belong to player -1 
  playerTurn *= -1;
}


function checkForWinner() {
  // gather the players regular pucks and kings 
  playerPucks = getAllPlayerPucks(playerTurn);
  playerKings = getAllPlayerKings(playerTurn)

  // add the pucks and kings together 
  const currentPlayerPucks = playerPucks.length + playerKings.length
  // if there are no pucks for the player remaining, declare a winner 
  if (currentPlayerPucks === 0) {

    winner = playerTurn * -1;

    // declare winner 
    // popup message occurs
    // blur the background around the popup 
    // button in the popup will restart the game 
    if (winner === 1) {
      winnerMsg.textContent = `Red wins!`
      tableEl.classList.add('blur')
      playerTurnMsg.classList.add('blur')
      title.classList.add('blur')
      winnerPopup.style.display = "flex";

    } else if (winner === -1) {
      winnerMsg.textContent = `Black wins!`
      tableEl.classList.add('blur')
      playerTurnMsg.classList.add('blur')
      title.classList.add('blur')
      winnerPopup.style.display = "flex";

    }
    return true;

  } else {
    // if the current player still has pucks/kings, render the board and continue 
    render();
  }

}



function getAllPlayerPucks(player) {
  // function used to calculate the current player's pucks 
  playerPucks = [];

  // iterate over the gameBoard and gather the pucks into the global playerPucks array 
  gameBoard.forEach((row, rowIdx) => {
    row.forEach((squareValue, colIdx) => {
      if (squareValue === player) {
        playerPucks.push({ row: rowIdx, col: colIdx });
      }
    });
  });
  return playerPucks;
}

function getAllPlayerKings(player) {
  // function used to calculate the current player's pucks 
  playerKings = [];

  // iterate over the gameBoard and gather the kings into the global playerKings array 
  gameBoard.forEach((row, rowIdx) => {
    row.forEach((squareValue, colIdx) => {
      if (squareValue === player * 2) {
        playerKings.push({ row: rowIdx, col: colIdx })
      }
    });
  });
  return playerKings;
}

// checks for all moves and jumps that can be made
// return depends on length of moves, jumps, and multijumps arrays 
function checkForMoves(player) {
  // reset all global variables first to make sure nothing is leftover from the previous player's turn 
  playerPucks = [];
  playerKings = [];

  // gather the current player's pucks/kings in the global scope 
  playerPucks = getAllPlayerPucks(player);
  playerKings = getAllPlayerKings(player);

  // set variables for the function to call on 
  let possibleMoves = [];
  let possibleJumps = [];

  // check normal puck movements. add to possible moves array
  playerPucks.forEach((puck) => {
    // check all possible moves for each puck/king of the current player 
    // if the puck cannot move or jump, it gets left out of the global array 
    
    // if player 1's turn, forward movement is row - 1 
    if (playerTurn === 1) {
      // player 1: forward, right 
      if (canItMove(puck.row - 1, puck.col + 1)) {
        const newRow = puck.row - 1;
        const newCol = puck.col + 1;
        possibleMoves.push({ currentRow: puck.row, currentCol: puck.col, newRow: newRow, newCol: newCol })
        // if canItMove is false, check for a jump:
      } else if (checkForOpponent(puck.row - 1, puck.col + 1)) {
        if (canItJump(puck.row - 2, puck.col + 2)) {
          const newRow = puck.row - 2;
          const newCol = puck.col + 2;
          const removePuckFromRow = puck.row - 1;
          const removePuckFromCol = puck.col + 1
          possibleJumps.push({ currentRow: puck.row, currentCol: puck.col, newRow: newRow, newCol: newCol, removePuckFromRow: removePuckFromRow, removePuckFromCol: removePuckFromCol })
        }
      }

      // player 1: forward, left 
      if (canItMove(puck.row - 1, puck.col - 1)) {
        const newRow = puck.row - 1;
        const newCol = puck.col - 1;
        possibleMoves.push({ currentRow: puck.row, currentCol: puck.col, newRow: newRow, newCol: newCol })
        // if canItMove is false, check for a jump: 
      } else if (checkForOpponent(puck.row - 1, puck.col - 1)) {
        if (canItJump(puck.row - 2, puck.col - 2)) {
          const newRow = puck.row - 2;
          const newCol = puck.col - 2;
          const removePuckFromRow = puck.row - 1;
          const removePuckFromCol = puck.col - 1
          possibleJumps.push({ currentRow: puck.row, currentCol: puck.col, newRow: newRow, newCol: newCol, removePuckFromRow: removePuckFromRow, removePuckFromCol: removePuckFromCol })
        }
      }
    }

    // if player -1's turn, forward movement is row + 1
    if (playerTurn === -1) {
      // player -1: down, left 
      if (canItMove(puck.row + 1, puck.col - 1)) {
        const newRow = puck.row + 1;
        const newCol = puck.col - 1;
        possibleMoves.push({ currentRow: puck.row, currentCol: puck.col, newRow: newRow, newCol: newCol })
        // if canItMove is false, check for a jump:
      } else if (checkForOpponent(puck.row + 1, puck.col - 1)) {
        if (canItJump(puck.row + 2, puck.col - 2)) {
          const newRow = puck.row + 2;
          const newCol = puck.col - 2;
          const removePuckFromRow = puck.row + 1;
          const removePuckFromCol = puck.col - 1
          possibleJumps.push({ currentRow: puck.row, currentCol: puck.col, newRow: newRow, newCol: newCol, removePuckFromRow: removePuckFromRow, removePuckFromCol: removePuckFromCol })
        }
      }

      // player -1: down, right
      if (canItMove(puck.row + 1, puck.col + 1)) {
        const newRow = puck.row + 1;
        const newCol = puck.col + 1;
        possibleMoves.push({ currentRow: puck.row, currentCol: puck.col, newRow: newRow, newCol: newCol })
        // if canItMove is false, check for a jump: 
      } else if (checkForOpponent(puck.row + 1, puck.col + 1)) {
        if (canItJump(puck.row + 2, puck.col + 2)) {
          const newRow = puck.row + 2;
          const newCol = puck.col + 2;
          const removePuckFromRow = puck.row + 1;
          const removePuckFromCol = puck.col + 1
          possibleJumps.push({ currentRow: puck.row, currentCol: puck.col, newRow: newRow, newCol: newCol, removePuckFromRow: removePuckFromRow, removePuckFromCol: removePuckFromCol })
        }
      }


    }
  })

  // Check for king movements. Only need one function since direction isn't a factor.
  playerKings.forEach((king) => {
    // check up, right
    if (canItMove(king.row - 1, king.col + 1)) {
      const newRow = king.row - 1;
      const newCol = king.col + 1;
      possibleMoves.push({ currentRow: king.row, currentCol: king.col, newRow: newRow, newCol: newCol })
    } else if (checkForOpponent(king.row - 1, king.col + 1)) {
      if (canItJump(king.row - 2, king.col + 2)) {
        const newRow = king.row - 2;
        const newCol = king.col + 2;
        const removePuckFromRow = king.row - 1;
        const removePuckFromCol = king.col + 1
        possibleJumps.push({ currentRow: king.row, currentCol: king.col, newRow: newRow, newCol: newCol, removePuckFromRow: removePuckFromRow, removePuckFromCol: removePuckFromCol })
      }
    }

    // check up, left
    if (canItMove(king.row - 1, king.col - 1)) {
      const newRow = king.row - 1;
      const newCol = king.col - 1;
      possibleMoves.push({ currentRow: king.row, currentCol: king.col, newRow: newRow, newCol: newCol })
    } else if (checkForOpponent(king.row - 1, king.col - 1)) {
      if (canItJump(king.row - 2, king.col - 2)) {
        const newRow = king.row - 2;
        const newCol = king.col - 2;
        const removePuckFromRow = king.row - 1;
        const removePuckFromCol = king.col - 1
        possibleJumps.push({ currentRow: king.row, currentCol: king.col, newRow: newRow, newCol: newCol, removePuckFromRow: removePuckFromRow, removePuckFromCol: removePuckFromCol })
      }
    }


    // check down, right
    if (canItMove(king.row + 1, king.col + 1)) {
      const newRow = king.row + 1;
      const newCol = king.col + 1;
      possibleMoves.push({ currentRow: king.row, currentCol: king.col, newRow: newRow, newCol: newCol })
    } else if (checkForOpponent(king.row + 1, king.col + 1)) {
      if (canItJump(king.row + 2, king.col + 2)) {
        const newRow = king.row + 2;
        const newCol = king.col + 2;
        const removePuckFromRow = king.row + 1;
        const removePuckFromCol = king.col + 1
        possibleJumps.push({ currentRow: king.row, currentCol: king.col, newRow: newRow, newCol: newCol, removePuckFromRow: removePuckFromRow, removePuckFromCol: removePuckFromCol })
      }
    }


    // check down, left 
    if (canItMove(king.row + 1, king.col - 1)) {
      const newRow = king.row + 1;
      const newCol = king.col - 1;
      possibleMoves.push({ currentRow: king.row, currentCol: king.col, newRow: newRow, newCol: newCol })
    } else if (checkForOpponent(king.row + 1, king.col - 1)) {
      if (canItJump(king.row + 2, king.col - 2)) {
        const newRow = king.row + 2;
        const newCol = king.col - 2;
        const removePuckFromRow = king.row + 1;
        const removePuckFromCol = king.col - 1
        possibleJumps.push({ currentRow: king.row, currentCol: king.col, newRow: newRow, newCol: newCol, removePuckFromRow: removePuckFromRow, removePuckFromCol: removePuckFromCol })
      }
    }
  })

  // if multi-Jumps are possible, don't return movablePucks or jumpsAvailable so that the current player must continue with the previously used puck. 
  // multi-jumps are determined in the multiJump function. 
  // if jumps are possible, don't return Moves. Force the user into jumps. 
  // if no multijumps and no jumpsAvailable, then return the moves 
  if (multiJumps.length > 0) {
    movablePucks = [];
    jumpsAvailable = [];
  } else if (possibleJumps.length > 0) {
    possibleMoves = []
    jumpsAvailable = possibleMoves.concat(possibleJumps);
    movablePucks = [];
  } else if (possibleMoves.length > 0) {
    movablePucks = possibleMoves
  }

  // highlight the movable pucks 
  // return all of the arrays 
  highlightMovablePucks();
  return movablePucks, jumpsAvailable, multiJumps;
}

// is that square empty? 
function canItMove(row, col) {
  // is the row/col off the board or did it manage its way into an unplayable square? Then, stop. 
  // is that row/col empty? If yes, then continue. 
  if (row < 0 || col < 0 || row > 7 || col > 7 || gameBoard[row][col] === null) {
    return false;
  } else if (gameBoard[row][col] === 0) {
    return true;
  }
}

// Is there an opponent in that square? 
function checkForOpponent(row, col) {
  // is the row/col off the board or did it manage its way into an unplayable square? Then, stop. 
  // is an opponent occupying the square? then, continue. 

  if (row < 0 || col < 0 || row > 7 || col > 7 || gameBoard[row][col] === null) {
    return false;
  } else if (gameBoard[row][col] === playerTurn * -1 || gameBoard[row][col] === playerTurn * -2) {
    return true;
  }
}

// If checkForOppoent is true, check the next space for a possible jump if it is empty 
function canItJump(row, col) {
  if (row < 0 || col < 0 || row > 7 || col > 7 || gameBoard[row][col] === null) {
    return false;
  } else if (gameBoard[row][col] === 0) {
    return true;
  }
}

// depending on which array has values (movablePucks, jumpsAvailable, or multiJumps), highlight the movable pucks in those arrays 
function highlightMovablePucks() {
  if (movablePucks.length > 0) {
    movablePucks.forEach((puck) => {
      const row = puck.currentRow;
      const col = puck.currentCol;

      const puckSquare = rowEls[row].querySelectorAll('.square')[col]
      puckSquare.classList.add('movable-puck');
    })
  } else if (jumpsAvailable.length > 0) {
    jumpsAvailable.forEach((jump) => {
      const row = jump.currentRow;
      const col = jump.currentCol;

      const puckSquare = rowEls[row].querySelectorAll('.square')[col]
      puckSquare.classList.add('movable-puck');
    })
  } else if (multiJumps.length > 0) {
    multiJumps.forEach((jump) => {
      const row = jump.currentRow;
      const col = jump.currentCol;

      const puckSquare = rowEls[row].querySelectorAll('.square')[col]
      puckSquare.classList.add('movable-puck');
    })
  }
}

// depending on which array has values (movablePucks, jumpsAvailable, or multiJumps), add their destinations to the destinations array and highlight those squares. .
// if a jump/multijump is occuring, also highlight the jumped puck's square 
function highlightDestination(row, col) {
  if (movablePucks.length > 0) {
    movablePucks.forEach((puck) => {
      const row = puck.currentRow;
      const col = puck.currentCol;

      const puckSquare = rowEls[row].querySelectorAll('.square')[col]
      puckSquare.classList.remove('movable-puck')
    })

    for (let i = 0; i < movablePucks.length; i++) {
      if (row === movablePucks[i].currentRow && col === movablePucks[i].currentCol) {
        destinations.push({ newRow: movablePucks[i].newRow, newCol: movablePucks[i].newCol })
      }
    }

    destinations.forEach((destination) => {
      const row = destination.newRow;
      const col = destination.newCol;
      const possibleDestination = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
      possibleDestination.classList.add(`destination`)

    })
  } else if (jumpsAvailable.length > 0) {
    jumpsAvailable.forEach((jump) => {
      const row = jump.currentRow;
      const col = jump.currentCol;

      const puckSquare = rowEls[row].querySelectorAll('.square')[col]
      puckSquare.classList.remove('movable-puck')
    })

    for (let i = 0; i < jumpsAvailable.length; i++) {
      if (row === jumpsAvailable[i].currentRow && col === jumpsAvailable[i].currentCol) {
        destinations.push({ currentRow: jumpsAvailable[i].currentRow, currentCol: jumpsAvailable[i].currentCol, newRow: jumpsAvailable[i].newRow, newCol: jumpsAvailable[i].newCol, removePuckFromRow: jumpsAvailable[i].removePuckFromRow, removePuckFromCol: jumpsAvailable[i].removePuckFromCol })
      }
    }

    destinations.forEach((destination) => {
      const row = destination.newRow;
      const col = destination.newCol;
      const jumpedRow = destination.removePuckFromRow;
      const jumpedCol = destination.removePuckFromCol;
      const possibleDestination = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
      const jumpedPuck = document.querySelector(`[data-row="${jumpedRow}"][data-col="${jumpedCol}"]`)
      possibleDestination.classList.add(`destination`)
      jumpedPuck.classList.add(`possible-jumped-puck`)

    })
  } else if (multiJumps.length > 0) {
    multiJumps.forEach((jump) => {
      const row = jump.currentRow;
      const col = jump.currentCol;

      const puckSquare = rowEls[row].querySelectorAll('.square')[col];
      puckSquare.classList.remove('movable-puck');
    })

    for (let i = 0; i < multiJumps.length; i++) {
      if (row === multiJumps[i].currentRow && col === multiJumps[i].currentCol) {
        destinations.push({ currentRow: multiJumps[i].currentRow, currentCol: multiJumps[i].currentCol, newRow: multiJumps[i].newRow, newCol: multiJumps[i].newCol, removePuckFromRow: multiJumps[i].removePuckFromRow, removePuckFromCol: multiJumps[i].removePuckFromCol })
      }
    }

    destinations.forEach((destination) => {
      const row = destination.newRow;
      const col = destination.newCol;
      const jumpedRow = destination.removePuckFromRow;
      const jumpedCol = destination.removePuckFromCol;
      const possibleDestination = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
      const jumpedPuck = document.querySelector(`[data-row="${jumpedRow}"][data-col="${jumpedCol}"]`)
      possibleDestination.classList.add(`destination`)
      jumpedPuck.classList.add(`possible-jumped-puck`)
    })
  }
}

// select all highlighted squares and remove the highlights 
function clearDestinationHighlights() {
  const destinationSquares = document.querySelectorAll('.destination')
  const jumpedPucks = document.querySelectorAll('.possible-jumped-puck')

  destinationSquares.forEach((square) => {
    square.classList.remove('destination');
  });
  jumpedPucks.forEach((puck) => {
    puck.classList.remove('possible-jumped-puck')
  });
}

// move the puck div to the new square div 
function movePuck(selectedPuck, oldRow, oldCol, newRow, newCol) {
  // select the destination by matching the data in the HTML element.
  // move the puck into the square 
  const destination = document.querySelector(`[data-row="${newRow}"][data-col="${newCol}"]`);
  destination.appendChild(selectedPuck)

  // record the value of the puck priot to the move
  // set the new square to the same value 
  // set the old square to empty 
  const puckValue = gameBoard[oldRow][oldCol]
  gameBoard[newRow][newCol] = puckValue;
  gameBoard[oldRow][oldCol] = 0;
}

// move the puck div to the new square div, AND remove the puck div that was jumped 
function jumpPuck(selectedPuck, oldRow, oldCol, newRow, newCol) {
  // get the destination and jumped div locations by calculating the row/col and matching it to the HTML element 
  const jumpedRow = (oldRow + newRow) / 2;
  const jumpedCol = (oldCol + newCol) / 2;
  const destinationSquare = document.querySelector(`[data-row="${newRow}"][data-col="${newCol}"]`);

  // move the puck to the destination
  destinationSquare.appendChild(selectedPuck);
  // record the old value
  const puckValue = gameBoard[oldRow][oldCol];
  // move the value to the new destination 
  gameBoard[newRow][newCol] = puckValue;
  // set the old square to empty 
  gameBoard[oldRow][oldCol] = 0;
  // set the jumped square to empty 
  gameBoard[jumpedRow][jumpedCol] = 0;
  // check for multijumps 
  checkForMultiJump(newRow, newCol);
}

// after a jump, checkForMultiJump activates to check for additional jumps with the same piece that was just used 
function checkForMultiJump(row, col) {
  // identify the puck in its new position 
  const puck = gameBoard[row][col]
  // reset the multiJumps array 
  multiJumps = [];

  // check the value of the puck just used. 
  // then check for foward moves and king moves
  // playerTurn is irrelevant as the puck value will reflect the current turn 
  if (puck === 1) {
    // check up left
    if (checkForOpponent(row - 1, col - 1)) {
      if (canItJump(row - 2, col - 2)) {
        multiJumps.push({ currentRow: row, currentCol: col, newRow: row - 2, newCol: col - 2, removePuckFromRow: row - 1, removePuckFromCol: col - 1 });
        render();
      }
    }
    // check up right
    if (checkForOpponent(row - 1, col + 1)) {
      if (canItJump(row - 2, col + 2)) {
        multiJumps.push({ currentRow: row, currentCol: col, newRow: row - 2, newCol: col + 2, removePuckFromRow: row - 1, removePuckFromCol: col + 1 });
        render();
      }
    }

  } else if (puck === -1) {
    // check down left
    if (checkForOpponent(row + 1, col - 1)) {
      if (canItJump(row + 2, col - 2)) {
        multiJumps.push({ currentRow: row, currentCol: col, newRow: row + 2, newCol: col - 2, removePuckFromRow: row + 1, removePuckFromCol: col - 1 });
        render();
      }
    }
    // check down right 
    if (checkForOpponent(row + 1, col + 1)) {
      if (canItJump(row + 2, col + 2)) {
        multiJumps.push({ currentRow: row, currentCol: col, newRow: row + 2, newCol: col + 2, removePuckFromRow: row + 1, removePuckFromCol: col + 1 });
        render();
      }
    }
  } else if (puck === 2 || puck === -2) {
    // check up left
    if (checkForOpponent(row - 1, col - 1)) {
      if (canItJump(row - 2, col - 2)) {
        multiJumps.push({ currentRow: row, currentCol: col, newRow: row - 2, newCol: col - 2, removePuckFromRow: row - 1, removePuckFromCol: col - 1 });
        render();
      }
    }
    // check up right
    if (checkForOpponent(row - 1, col + 1)) {
      if (canItJump(row - 2, col + 2)) {
        multiJumps.push({ currentRow: row, currentCol: col, newRow: row - 2, newCol: col + 2, removePuckFromRow: row - 1, removePuckFromCol: col + 1 });
        render();
      }
    }
    // check down left
    if (checkForOpponent(row + 1, col - 1)) {
      if (canItJump(row + 2, col - 2)) {
        multiJumps.push({ currentRow: row, currentCol: col, newRow: row + 2, newCol: col - 2, removePuckFromRow: row + 1, removePuckFromCol: col - 1 });
        render();
      }
    }
    // check down right 
    if (checkForOpponent(row + 1, col + 1)) {
      if (canItJump(row + 2, col + 2)) {
        multiJumps.push({ currentRow: row, currentCol: col, newRow: row + 2, newCol: col + 2, removePuckFromRow: row + 1, removePuckFromCol: col + 1 });
        render();
      }
    }
  }

  // if the check for additional jumps results in 0, then change the player turn 
  if (multiJumps.length === 0) {
    changePlayer();
  }
}


function checkForKings() {
  // check for either player's "pucks" reaching a square opposite their starting end 
  // apply visual update 
  for (let i = 0; i < gameBoard[0].length; i++) {
    if (gameBoard[0][i] === 1) {
      gameBoard[0][i] = 2;
    }
  }

  for (let i = 0; i < gameBoard[7].length; i++) {
    if (gameBoard[7][i] === -1) {
      gameBoard[7][i] = -2;
    }
  }
}


function initialize() {
  // THIS IS THE CODE THAT WILL INITIALIZE THE GAME AND SET THE STATE OF THE GAME
  render();
}


initialize();
