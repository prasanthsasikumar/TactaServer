const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const util = require('util');
const SerialPort = require('serialport');
const createTable = require('data-table')
var clients = [];
var ports = {};

/*****************************************************
        STARTING A LOCAL SERVER
*****************************************************/
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});
app.use(express.static('public'));

http.listen(3000, function() {
  console.log('Tacta Server listening on *:3000');
});

/*****************************************************
    SOCKET CONNECTION AND WHAT TO DO WITH EACH
*****************************************************/
io.on('connection', function(socket) {

  clients.push(socket.id); //track connected clients via log
  var clientConnectedMsg = 'User connected ' + util.inspect(socket.id) + ', total: ' + clients.length;
  io.emit('log', clientConnectedMsg);
  //console.log(clientConnectedMsg);

  socket.on('disconnect', function() { //track disconnected clients via log
    clients.pop(socket.id);
    var clientDisconnectedMsg = 'User disconnected ' + util.inspect(socket.id) + ', total: ' + clients.length;
    io.emit('log', clientDisconnectedMsg);
    console.log(clientDisconnectedMsg);
  })

  socket.on('command', function(command) {
    //var combinedMsg = socket.id.substring(0, 4) + msg;
    io.emit('log', command);
    processCommand(command);
  });

  socket.on('query', function(query) {
    processQuery(query);
  });
});

/*****************************************************
        FINDING THE AVAILABLE COM PORTS
*****************************************************/
function findBoards() {
  SerialPort.list(function(err, ports) {
    const headers = Object.keys(ports[0])
    const table = createTable(headers)
    tableHTML = ''
    table.on('data', data => tableHTML += data)
    table.on('end', () => io.emit('portsTable', tableHTML))
    ports.forEach(port => table.write(port))
    table.end();
    io.emit('portsArray', ports);
  });
}

/*****************************************************
        CONNECTING TO TACTABOARD
*****************************************************/
function connectToBoard(board) {

  if (ports[board.boardPort]) {
    io.emit('log', "Port Already Connected!");
    return;
  }
  var port = new SerialPort(board.boardPort, {
    baudRate: board.baudRate
  });
  const ByteLength = SerialPort.parsers.ByteLength;
  const parser = port.pipe(new ByteLength({
    length: 1
  }));
  port.pipe(parser);

  function respondToBoard(data) { //METHOD THAT GETS CALLED WHEN DATA IS RECEIVED
    var log = "Board : " + data;
    //console.log(log);
    if (board.debug) { //IF DEBUG IS ENABLED ALL BOARD RESPONSES WILL BE SEND TO THE WEBPAGE
      io.emit('log', log);
    }
    if (data == "*") {
      if (!board.isConnected) {
        board.isConnected = true;
        ports[board.boardPort] = port;
        io.emit('log', board.boardType + " connected at " + board.boardPort);
        io.emit('connected', board);
      }
    }
  };

  function verifyConnection() { //METHOD TO VERIFY CONNECTION
    var buffer = new Buffer(2);
    buffer[0] = 0x2A;
    buffer[1] = 0x2A;
    port.write(buffer, 'hex');
  };
  parser.on('data', respondToBoard);
  setTimeout(verifyConnection, 1700);
}

/*****************************************************
        DISCONNECTING TACTABOARD
*****************************************************/
function disconnectBoard(board) {
  ports[board.boardPort].close(function() {
    delete ports[board.boardPort];
    board.isConnected = false;
    io.emit('log', board.boardType + " disconnected from " + board.boardPort);
    io.emit('disconnected', board);
  })
}
/*****************************************************
    BYTE ARRAYS THAT PERFORM VARIOUS TASKS
*****************************************************/
function enableTactorPins(board) {
  var buffer = new Buffer(6);
  buffer[0] = 0x2A;
  buffer[1] = 0x50;
  buffer[2] = 0x50;
  buffer[3] = 0xFF;
  buffer[4] = 0xFF;
  buffer[5] = 0xFF;
  ports[board.boardPort].write(buffer, 'hex');
}

function controlAll(query) {
  var buffer = new Buffer(7);
  buffer[0] = 0x2A;
  buffer[1] = 0x56;
  buffer[2] = 0x56;
  buffer[3] = 0xFF;
  buffer[4] = query.intensity.toString(16);
  buffer[5] = 0xFF;
  buffer[6] = 0xFF;
  ports[query.board.boardPort].write(buffer, 'hex');
}

function controlOne(query) {
  var buffer = new Buffer(7);
  buffer[0] = 0x2A;
  buffer[1] = 0x56;
  buffer[2] = 0x56;
  buffer[3] = query.tactor.tactorNo;
  buffer[4] = query.tactor.intensity.toString(16);
  buffer[5] = 0xFF;
  buffer[6] = 0xFF;
  //console.log(buffer);
  ports[query.board.boardPort].write(buffer, 'hex');
}

function toHex(d) { //CONVERT DECIMAL TO HEX
  return ("0" + (Number(d).toString(16))).slice(-2).toUpperCase()
}

/*****************************************************
        METHOD TO PROCESS COMMAND
*****************************************************/
function processCommand(command) { //Verify and process command
  var badCommandResponse = "Please enter Commands with syntax - (COMXX,tactorNo,intensity)";
  if (command.startsWith("(") && command.endsWith(")")) {
    command = command.replace('(', '');
    command = command.replace(')', '');
    var array = command.split(',');
    if (array.length != 3 || !isInt(array[1]) || !isInt(array[2])) { //check if all are integer
      io.emit('log', badCommandResponse);
      return;
    }
    var isConnected = false;
    if (ports[array[0]]) {
      isConnected = true;
    }
    var board = {
      boardPort: array[0],
      isConnected: isConnected
    };
    var tactor = {
      tactorNo: array[1],
      intensity: array[2]
    };
    var query = {
      command: "controlOne",
      tactor: tactor,
      board: board
    };
    processQuery(query);
  } else {
    io.emit('log', badCommandResponse);
  }
}

function isInt(value) {
  return !isNaN(value) && (function(x) {
    return (x | 0) === x;
  })(parseFloat(value))
}

/*****************************************************
        METHOD TO PROCESS QUERY
*****************************************************/
function processQuery(query) {
  if (query.command == "getPortsList") {
    findBoards();
  } else if (query.command == "connectDevice") {
    connectToBoard(query.board);
  } else if (!query.board.isConnected) {
    io.emit('log', "Board not Connected");
    return;
  }
  if (query.command == "controlAll") {
    controlAll(query);
  } else if (query.command == "controlOne") {
    controlOne(query);
  } else if (query.command == "disconnectBoard") {
    disconnectBoard(query.board);
  }
}
