var socket = io();
var boardTypes = ["TACTAVEST", "TACTAFAN"];
var hardCodedBoardValues = {
  baudRate: 19200,
  limit: 8,
  min: 80,
  max: 255,
  value: 100,
  debug: false
};

/*****************************************************
          CREATING THE COM PORT LIST
*****************************************************/
var portsList = document.createElement("select");
portsList.id = "portsList";
portsList.className = "form-control";
document.getElementById("portsListCol").appendChild(portsList);

socket.emit('query', {
  command: "getPortsList"
});
socket.on('portsArray', function(portsList) {
  var ports = portsList;
  updatePortListDropDown(ports);
});
socket.on('portsTable', function(portsTable) {
  document.getElementById("portsTable").innerHTML = portsTable;
});

function updatePortListDropDown(ports) {
  var select = document.getElementById("portsList");
  while (select.hasChildNodes()) {
    select.removeChild(select.lastChild);
  }
  ports.forEach(function(port) {
    var portListData = new Option(port.comName, port.comName);
    document.getElementById("portsList").appendChild(portListData);
  });
}

/*****************************************************
          CREATING THE BOARD TYPE LIST
*****************************************************/
var boardsList = document.createElement("select");
boardsList.className = "form-control";
boardsList.id = "boardsList";
document.getElementById("boardsListCol").appendChild(boardsList);
boardTypes.forEach(function(boardType) {
  var boardListData = new Option(boardType, boardType);
  document.getElementById("boardsList").appendChild(boardListData);
});

/*****************************************************
          CONNECT TO DEVICE BUTTON
*****************************************************/
var addButton = document.createElement("BUTTON");
addButton.className = "btn btn-block btn-success";
addButton.appendChild(document.createTextNode("CONNECT"));
addButton.onclick = function() {
  var board = {
    boardPort: document.getElementById("portsList").value,
    boardType: document.getElementById("boardsList").value,
    baudRate: hardCodedBoardValues.baudRate,
    debug: hardCodedBoardValues.debug,
    isConnected: false,
  };
  console.log(board);
  socket.emit('query', {
    command: "connectDevice",
    board: board
  });
};
document.getElementById("addButton").appendChild(addButton);

/*****************************************************
          DISPLAY LOG AND COMAND FORM
*****************************************************/
socket.on('log', function(log) {
  $('#messages').append($('<li>').text(log));
  //  window.scrollTo(0, document.body.scrollHeight);
});

$('form').submit(function() {
  socket.emit('command', $('#m').val());
  $('#m').val('');
  return false;
});

/*****************************************************
          CLEAR LOG BUTTON
*****************************************************/
var clearButton = document.createElement("BUTTON");
clearButton.className = "btn btn-info";
clearButton.appendChild(document.createTextNode("Clear Log"));
clearButton.onclick = function() {
  $('#messages').empty();
};
document.getElementById("clearLog").appendChild(clearButton);

/*****************************************************
  ADDING/REMOVING SLIDER ON CONNECTION/DISCONNECTION
*****************************************************/
socket.on('connected', function(board) {
  document.getElementById("portsTable").style.display = "none";
  board["limit"] = hardCodedBoardValues.limit;
  board["min"] = hardCodedBoardValues.min;
  board["max"] = hardCodedBoardValues.max;
  board["value"] = hardCodedBoardValues.value;
  console.log(board);
  document.getElementById("sliderDiv").appendChild(getSliders(board));
});
socket.on('disconnected', function(board) {
  console.log(board);
  removeSlider(board);
});

/*****************************************************
      METHOD TO CREATE THE SLIDERS / UI
*****************************************************/
function getSliders(board) {
  var sliderContainer = document.createElement("div");
  sliderContainer.id = board.boardPort;
  sliderContainer.className = "container";

  var sliderRow = document.createElement("div");
  sliderRow.id = "sliderRow";
  sliderRow.className = "row";

  var boardDetails = document.createElement("div");
  boardDetails.id = "sliderCboardDetailsontainer";
  boardDetails.className = "well";
  boardDetails.style.textAlign = "center";

  var disconnectButton = document.createElement("BUTTON");
  disconnectButton.className = "btn btn-danger btn-sm";
  disconnectButton.style = "float: right;"
  disconnectButton.addEventListener("click", function() {
    socket.emit('query', {
      command: "disconnectBoard",
      board: board
    });
  }, false);
  var disconnectSpan = document.createElement("SPAN");
  disconnectSpan.className = "glyphicon glyphicon-link"; //"glyphicon glyphicon-remove-sign";
  disconnectSpan.innerHTML = "Disconnect";
  disconnectButton.appendChild(disconnectSpan);

  var heading = document.createElement("H3") // Create a <h1> element
  var text = document.createTextNode(board.boardType + " connected at " + board.boardPort + ""); // Create a text node
  heading.appendChild(text);
  heading.appendChild(disconnectButton);
  boardDetails.appendChild(heading);
  sliderRow.appendChild(boardDetails);

  for (i = 1; i <= board.limit + 1; i++) { //CREATING AS MANY SLIDERS AS NEEDED
    (function() {
      var sliderInnerDiv = document.createElement("div");
      sliderInnerDiv.id = "sliderInnerDiv";
      sliderInnerDiv.className = "col-xs-3";
      var sliderWell = document.createElement("div");
      sliderWell.id = "sliderWell";
      sliderWell.className = "well";
      var sliderText = document.createElement("div");
      sliderText.id = board.boardPort + "sliderText" + i;
      sliderText.className = "text-right";
      sliderText.innerHTML = "tacta-" + i;
      var sliderValue = document.createElement("div");
      sliderValue.id = board.boardPort + "sliderValue" + i;
      sliderValue.className = "text-left";
      var slider = document.createElement("INPUT");
      slider.setAttribute("type", "range");
      slider.setAttribute("min", board.min);
      slider.setAttribute("max", board.max);
      slider.setAttribute("value", board.value);
      slider.setAttribute("class", "slider");
      //slider.style.transform = "rotate(270deg)";
      slider.id = board.boardPort + "tacta" + i;
      slider.addEventListener("change", function() {
        sliderValue.innerHTML = this.value;
        var tactorNo = this.id.substr(this.id.indexOf('-'));
        var tactor = {
          intensity: this.value,
          tactorNo: tactorNo
        };
        socket.emit('query', {
          command: "controlOne",
          tactor: tactor,
          board: board
        });
      });

      //Adding a master Slider
      if (i == board.limit + 1) {
        slider.id = "masterSlider";
        sliderInnerDiv.className = "col-xs-12";
        sliderText.innerHTML = "Master Slider";
        slider.addEventListener("change", function() { //Change all sliders when the master slider is changed
          for (j = 1; j <= board.limit; j++) {
            document.getElementById(board.boardPort + "sliderValue" + j).innerHTML = this.value;
            document.getElementById(board.boardPort + "tacta" + j).value = this.value;
          }
          socket.emit('query', {
            command: "controlAll",
            intensity: this.value,
            board: board
          });
        });
      }

      sliderWell.appendChild(sliderText);
      sliderWell.appendChild(slider);
      sliderValue.innerHTML = slider.value;
      sliderWell.appendChild(sliderValue);
      sliderInnerDiv.appendChild(sliderWell);
      sliderInnerDiv.appendChild(document.createElement("br"));
      sliderRow.appendChild(sliderInnerDiv);
    }()); // immediate invocation
  }
  sliderContainer.appendChild(sliderRow);
  return sliderContainer;
}

/*****************************************************
          METHOD TO REMOVE SLIDER
*****************************************************/
function removeSlider(board) {
  var sliderToRemove = document.getElementById(board.boardPort);
  sliderToRemove.parentNode.removeChild(sliderToRemove);
}
