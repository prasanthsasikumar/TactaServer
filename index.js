const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const util = require('util');
const SerialPort = require('serialport');
const createTable = require('data-table')
const baudRate = 19200;
var clients = [];
var ports = {};
//var port;
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
  //track connected clients via log
  clients.push(socket.id);
  var clientConnectedMsg = 'User connected ' + util.inspect(socket.id) + ', total: ' + clients.length;
  io.emit('dataLog', clientConnectedMsg);
  //console.log(clientConnectedMsg);

  //track disconnected clients via log
  socket.on('disconnect', function() {
    clients.pop(socket.id);
    var clientDisconnectedMsg = 'User disconnected ' + util.inspect(socket.id) + ', total: ' + clients.length;
    io.emit('dataLog', clientDisconnectedMsg);
    console.log(clientDisconnectedMsg);
  })

  socket.on('dataLog', function(command) {
    //var command = 'Command: ' + command; //var combinedMsg = socket.id.substring(0, 4) + ':data: ' + msg;
    io.emit('dataLog', command);
    processCommand(command);
    /*if (isBoardConnected) {
      port.write(msg);
    } else {
      io.emit('dataLog', "Board not connected");
    }*/
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
        CONNECTING TO TACTAVEST
*****************************************************/
function connectToBoard(board) {
  if (port) {
    port.close();
  }
  const Readline = SerialPort.parsers.Readline;
  var port = new SerialPort(board.boardPort, {
    baudRate: baudRate
  });
  const parser = new Readline(); //reason why \n is required in arduino
  port.pipe(parser);

  function respondToBoard(data) { //METHOD THAT GETS CALLED WHEN DATA IS RECEIVED
    var boardMsg = "Board : " + data;
    console.log(boardMsg);
    //io.emit('dataLog', boardMsg);
    if (data == "*") {
      if (!board.isConnected) {
        board.isConnected = true;
        io.emit('dataLog', "TactaVest Connected");
        io.emit('ConnectionSucess', board);
      }
    }
  };

  function verifyConnection() { //METHOD TO VERIFY CONNECTION
    var buffer = new Buffer(2);
    buffer[0] = 0x2A;
    buffer[1] = 0x2A;
    ports[board.boardPort].write(buffer, 'hex');
  };
  parser.on('data', respondToBoard);
  setTimeout(verifyConnection, 1000);
  ports[board.boardPort] = port;
}

/*****************************************************
    BYTE ARRAYS THAT PERFORM VARIOUS TASKS
*****************************************************/
function enableTactorPins() {
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
function processCommand(command) {
  var badCommandResponse = "Please enter Commands with syntax - (COMXX,tactorNo,intensity)";
  if (command.startsWith("(") && command.endsWith(")")) {
    command = command.replace('(', '');
    command = command.replace(')', '');
    var array = command.split(',');
    if (array.length != 3 || !isInt(array[1]) || !isInt(array[2])) { //check if all are integer
      io.emit('dataLog', badCommandResponse);
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
    io.emit('dataLog', badCommandResponse);
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
    io.emit('dataLog', "Board not Connected");
    return;
  }
  if (query.command == "controlAll") {
    controlAll(query);
  } else if (query.command == "controlOne") {
    controlOne(query);
  }
}
