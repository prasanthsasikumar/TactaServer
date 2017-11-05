var socket = io();
var boardTypes = ["TACTAVEST", "TACTAFAN"];

/*****************************************************
    CREATING THE UI FOR TACTABOARD WITH SLIDERS
*****************************************************/
function getSliders(board) {
  var sliderContainer = document.createElement("div");
  sliderContainer.id = "sliderContainer";
  sliderContainer.className = "container";

  var sliderRow = document.createElement("div");
  sliderRow.id = "sliderRow";
  sliderRow.className = "row";

  var boardDetails = document.createElement("div");
  boardDetails.id = "sliderCboardDetailsontainer";
  boardDetails.className = "well";
  boardDetails.style.textAlign = "center";
  var h = document.createElement("H3") // Create a <h1> element
  var t = document.createTextNode(board.boardType + " connected at " + board.boardPort); // Create a text node
  h.appendChild(t);
  boardDetails.appendChild(h);
  sliderRow.appendChild(boardDetails);

  for (i = 1; i <= board.limit + 1; i++) { //CREATING AS MANY SLIDERS AS NEEDED
    (function() {
      var sliderInnerDiv = document.createElement("div");
      sliderInnerDiv.id = "sliderInnerDiv";
      sliderInnerDiv.className = "col-xs-3";
      var sliderWell = document.createElement("div");
      sliderWell.id = "sliderWell";
      sliderWell.className = "well";
      var sliderName = document.createElement("div");
      sliderName.id = "sliderName" + i;
      sliderName.className = "text-right";
      sliderName.innerHTML = "tacta-" + i;
      var sliderValue = document.createElement("div");
      sliderValue.id = "sliderValue" + i;
      sliderValue.className = "text-left";
      var slider = document.createElement("INPUT");
      slider.setAttribute("type", "range");
      slider.setAttribute("min", board.min);
      slider.setAttribute("max", board.max);
      slider.setAttribute("value", board.value);
      slider.setAttribute("class", "slider");
      //slider.style.transform = "rotate(270deg)";
      slider.id = "tacta" + i;
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
        sliderName.innerHTML = "Master Slider";
        slider.addEventListener("change", function() {
          changeSliderValues({
            value: this.value,
            board: board
          });
        });
      }

      sliderWell.appendChild(sliderName);
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
          METHOD FOR THE MASTER SLIDER
*****************************************************/
function changeSliderValues(params) { //Change all sliders when the master slider is changed
  socket.emit('query', {
    command: "controlAll",
    intensity: params.value,
    board: params.board

  });
  for (j = 1; j <= params.board.limit; j++) {
    document.getElementById("sliderValue" + j).innerHTML = params.value;
    document.getElementById("tacta" + j).value = params.value;
  }
}

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
          CONNECT TO DEVICE BUTTON
*****************************************************/
var addButton = document.createElement("BUTTON");
addButton.className = "btn btn-block btn-success";
addButton.appendChild(document.createTextNode("CONNECT"));
addButton.onclick = function() {
  var board = {
    boardPort: document.getElementById("portsList").value,
    boardType: document.getElementById("boardsList").value,
    isConnected: false
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
socket.on('dataLog', function(log) {
  $('#messages').append($('<li>').text(log));
  //  window.scrollTo(0, document.body.scrollHeight);
});

$('form').submit(function() {
  socket.emit('dataLog', $('#m').val());
  $('#m').val('');
  return false;
});

socket.on('ConnectionSucess', function(board) {
  document.getElementById("portsTable").style.display = "none";
  board["limit"] = 8;
  board["min"] = 80;
  board["max"] = 255;
  board["value"] = 100;
  console.log(board);
  document.getElementById("sliderDiv").appendChild(getSliders(board));

});
