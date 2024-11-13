// Select DOM elements
const connectButton = document.getElementById('connectButton');
const temperatureElement = document.getElementById('temperature');
const lightElement = document.getElementById('light');
const statusElement = document.getElementById('status');
const unitToggle = document.getElementById('unitToggle');
const tempUnit = document.getElementById('tempUnit');

let port;
let reader;
let inputDone;
let inputStream;
let isConnected = false;
let currentUnit = 'C'; // Default unit is Celsius

// Function to connect to the serial port
async function connect() {
  try {
    // Request a port
    port = await navigator.serial.requestPort();
    // Open the port with the correct baud rate
    await port.open({ baudRate: 9600 });
    statusElement.textContent = 'Status: Connected';
    statusElement.classList.add('connected');
    isConnected = true;
    connectButton.textContent = 'Disconnect';
    connectButton.classList.add('connected');
    unitToggle.disabled = false;
    readLoop();
  } catch (error) {
    console.error('Error connecting to serial port:', error);
  }
}

// Function to read data from the serial port
async function readLoop() {
  const textDecoder = new TextDecoderStream();
  inputDone = port.readable.pipeTo(textDecoder.writable);
  inputStream = textDecoder.readable;

  reader = inputStream.getReader();
  let dataBuffer = '';

  while (isConnected) {
    try {
      const { value, done } = await reader.read();
      if (done) {
        // Allow the serial port to be closed
        break;
      }
      if (value) {
        dataBuffer += value;
        let lines = dataBuffer.split('\n');
        dataBuffer = lines.pop(); // Keep incomplete line for next read

        for (let line of lines) {
          parseData(line.trim());
        }
      }
    } catch (error) {
      console.error('Error reading data:', error);
      disconnect();
      break;
    }
  }
}

// Function to parse incoming data
function parseData(data) {
  try {
    const jsonData = JSON.parse(data);
    // Update temperature
    if (jsonData.temperature !== undefined) {
      let temp = jsonData.temperature;
      if (currentUnit === 'F') {
        temp = (temp * 9/5) + 32;
      }
      temperatureElement.textContent = temp.toFixed(2);
    }
    // Update light intensity
    if (jsonData.light !== undefined) {
      lightElement.textContent = jsonData.light;
    }
  } catch (error) {
    console.error('Error parsing JSON:', error);
  }
}

// Function to disconnect from the serial port
async function disconnect() {
  if (reader) {
    await reader.cancel();
    await inputDone.catch(() => { /* Ignore the error */ });
    reader = null;
    inputDone = null;
  }
  if (port) {
    await port.close();
    port = null;
  }
  statusElement.textContent = 'Status: Disconnected';
  statusElement.classList.remove('connected');
  isConnected = false;
  connectButton.textContent = 'Connect to Arduino';
  connectButton.classList.remove('connected');
  unitToggle.disabled = true;
}

// Function to toggle temperature unit
function toggleUnit() {
  if (currentUnit === 'C') {
    currentUnit = 'F';
    unitToggle.textContent = 'Switch to °C';
  } else {
    currentUnit = 'C';
    unitToggle.textContent = 'Switch to °F';
  }
  tempUnit.textContent = currentUnit === 'C' ? '°C' : '°F';
  // If temperature is already received, update it
  if (temperatureElement.textContent !== '--') {
    let temp = parseFloat(temperatureElement.textContent);
    if (currentUnit === 'F') {
      temp = (temp * 9/5) + 32;
    } else {
      temp = (temp - 32) * 5/9;
    }
    temperatureElement.textContent = temp.toFixed(2);
  }
}

// Event listener for the connect/disconnect button
connectButton.addEventListener('click', () => {
  if (isConnected) {
    disconnect();
  } else {
    connect();
  }
});

// Event listener for the unit toggle button
unitToggle.addEventListener('click', toggleUnit);

// Disable the unit toggle button initially
unitToggle.disabled = true;
