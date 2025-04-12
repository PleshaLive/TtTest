const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// Path to the JSON "database" file
const DB_FILE = path.join(__dirname, 'db.json');

// Load existing data from db.json, or initialize a new object
let db;
try {
  const jsonData = fs.readFileSync(DB_FILE, 'utf8');
  db = JSON.parse(jsonData);
} catch (err) {
  db = {};
}

// Ensure the required structure and default values
if (typeof db.matchdata !== 'object') db.matchdata = {};
if (typeof db.mapveto !== 'object') db.mapveto = [];
if (typeof db.vrs !== 'object') db.vrs = {};
if (db.vrs.TEAM1 === undefined) db.vrs.TEAM1 = 0;
if (db.vrs.TEAM2 === undefined) db.vrs.TEAM2 = 0;
if (typeof db.customfields !== 'object') db.customfields = {};
if (db.customfields.field1 === undefined) db.customfields.field1 = '';
if (db.customfields.field2 === undefined) db.customfields.field2 = '';

// Save any default initialization to the file (this ensures db.json always has the keys)
try {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
} catch (err) {
  console.error('Error initializing db.json:', err);
}

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve static assets (JS, CSS) from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Handle socket connections
io.on('connection', (socket) => {
  console.log('Client connected');
  // Send current data to the newly connected client
  socket.emit('updateData', db);

  // Handle incoming save events from the client
  socket.on('saveData', (newData) => {
    // Update each section of the database if provided
    if (newData.matchdata) db.matchdata = newData.matchdata;
    if (newData.mapveto) db.mapveto = newData.mapveto;
    if (newData.vrs) db.vrs = newData.vrs;
    if (newData.customfields) db.customfields = newData.customfields;

    // Write the updated data to db.json (persist changes)
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (err) {
      console.error('Failed to write to db.json', err);
    }

    // Broadcast the updated data to all connected clients (update their UI)
    io.emit('updateData', db);
  });
});

// Start the server (use PORT from environment for Railway)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
