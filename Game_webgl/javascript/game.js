const canvas = document.getElementById('gameCanvas');
const gl = canvas.getContext('webgl');

if (!gl) {
  throw new Error('WebGL not supported');
}

// Initialize variables
let points = 0;
let playerPosition = 0; // -1 to 1 range for horizontal movement
const playerSize = 0.03;
const fallingObjects = [];
const pointsLabel = document.getElementById('pointsLabel');
let speed = 0.5; // Initial speed
let gameOver = false;

// Vertex shader
const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, `
  attribute vec2 aPosition;
  uniform float uYPosition;
  uniform float uXPosition;
  uniform float uSize;
  varying vec2 vPosition;
  void main() {
    gl_Position = vec4(aPosition.x * uSize + uXPosition, aPosition.y * uSize + uYPosition, 0.0, 1.0);
    vPosition = aPosition;
  }
`);
gl.compileShader(vertexShader);

// Fragment shader
const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, `
  precision mediump float;
  uniform vec4 uColor;
  void main() {
    gl_FragColor = uColor;
  }
`);
gl.compileShader(fragmentShader);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

// Attribute and uniform locations
const aPositionLocation = gl.getAttribLocation(program, 'aPosition');
const uYPositionLocation = gl.getUniformLocation(program, 'uYPosition');
const uXPositionLocation = gl.getUniformLocation(program, 'uXPosition');
const uSizeLocation = gl.getUniformLocation(program, 'uSize');
const uColorLocation = gl.getUniformLocation(program, 'uColor');

// Set up the position buffer
const positions = new Float32Array([
  // Vertex positions for a square
  -1, -1,
  1, -1,
  1, 1,
  -1, -1,
  1, 1,
  -1, 1,
]);
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
gl.enableVertexAttribArray(aPositionLocation);
gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);

// Adjust the sliding speed of the box (player)
const playerSpeed = 0.02; // Decreased speed for a more coherent slide

// Update the player's position based on keyboard input
let leftPressed = false;
let rightPressed = false;

document.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'ArrowLeft':
      leftPressed = true;
      document.getElementById('clickSound').play();
      break;
    case 'ArrowRight':
      rightPressed = true;
      document.getElementById('clickSound').play();
      break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.key) {
    case 'ArrowLeft':
      leftPressed = false;
      document.getElementById('clickSound').play();
      break;
    case 'ArrowRight':
      rightPressed = false;
      document.getElementById('clickSound').play();
      break;
  }
});

function updateFallingObjects(deltaTime) {
  // Iterate through the falling objects from the end to the beginning
  for (let i = fallingObjects.length - 1; i >= 0; i--) {
    const obj = fallingObjects[i];
    // Update the falling object's position based on deltaTime and speed
    obj.y -= deltaTime * speed;

    // Check for collision with the player
    if (obj.y - obj.size / 1.5 <= -0.8 + playerSize / 1.5 && 
        obj.y + obj.size / 1.5 >= -0.8 - playerSize / 1.5 && 
        obj.x - obj.size / 1.5 <= playerPosition + playerSize / 1.5 && 
        obj.x + obj.size / 1.5 >= playerPosition - playerSize / 1.5) {
      points++; // Increment points when a collision occurs
      gameOver = true;
    }

    // Handle objects that go off screen (below the canvas)
    if (obj.y + obj.size / 1.5 < -1) {
      // Remove the object
      fallingObjects.splice(i, 1);
    }
  }
}

// Draw the scene
function drawScene() {
  // Clear the canvas
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw the player (cube)
  gl.uniform4fv(uColorLocation, [0.0, 0.0, 1.0, 1.0]); //  // Blue color
  gl.uniform1f(uYPositionLocation, -0.8); // Player Y position
  gl.uniform1f(uXPositionLocation, playerPosition); // Player X position
  gl.uniform1f(uSizeLocation, playerSize);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Draw the falling objects
  fallingObjects.forEach(obj => {
    gl.uniform4fv(uColorLocation, obj.color);
    gl.uniform1f(uYPositionLocation, obj.y);
    gl.uniform1f(uXPositionLocation, obj.x);
    gl.uniform1f(uSizeLocation, obj.size);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  });
}

// Create falling objects at regular intervals with some randomness
function createFallingObject() {
  const object = {
    x: Math.random() * 2 - 1, // Random horizontal position
    y: 1.0, // Start at the top of the screen
    size: 0.05, // Size of the falling object
    color: [1.0, 1.0, 1.0, 1.0], // white
  };
  fallingObjects.push(object);
}

// Function to pause/unpause the game
let isPaused = false;
function pauseGame() {
  if (gameOver) {
    return; // Don't pause if game is already over
  }
  if (isPaused) {
    // Unpause the game
    mainLoopId = requestAnimationFrame(mainLoop);
    
  } else {
    // Pause the game
    cancelAnimationFrame(mainLoopId);
    document.getElementById('backgroundMusic').volume = 0;
  }
  isPaused = !isPaused;
}

// Function to restart the game
function restartGame() {
  location.reload();
}

// Main loop
function mainLoop(time) {
  const deltaTime = (time - lastTime) / 1000;
  lastTime = time;

  if (leftPressed) {
    playerPosition -= playerSpeed; // Move left
    if (playerPosition < -0.97) {
      playerPosition = -0.97; // Prevent moving off the left edge
    }
  }
  if (rightPressed) {
    playerPosition += playerSpeed; // Move right
    if (playerPosition > 0.97) {
      playerPosition = 0.97; // Prevent moving off the right edge
    }
  }

  // Boundary checks
  if (playerPosition < -0.97 + playerSize / 2) {
    playerPosition = -0.97 + playerSize / 2; // Prevent moving off the left edge
  }
  if (playerPosition > 0.97 - playerSize / 2) {
    playerPosition = 0.97 - playerSize / 2; // Prevent moving off the right edge
  }

  updateFallingObjects(deltaTime);

  // Increase speed over time
  speed += 0.001;

  // Randomly create falling objects with an increased probability
  if (Math.random() < 0.1) {
    createFallingObject();
  }

  drawScene();

  if (!gameOver) {
    mainLoopId = requestAnimationFrame(mainLoop);
    // Play background music
    const backgroundMusic = document.getElementById('backgroundMusic');
    backgroundMusic.volume = 0.1;
  } else {
    const points = Math.floor(speed*10);
    pointsLabel.textContent = `Points: ${points}`; // Update points label
    const gOver= document.getElementById('gameOverSound');
    gOver.volume=0.5;
    gOver.play();// play game over sound
    backgroundMusic.volume = 0;
    
  }
}
let lastTime = 0;
let mainLoopId = requestAnimationFrame(mainLoop);



