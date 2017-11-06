# TactaServer
Node Js Based server application to control Tactaboard.
TactaServer V<sup>2</sup>

This is the source code for an application for controlling tactaboard
Please refer to it to learn how to run this application.

## Dependencies
  * An installation of [NODE JS](https://nodejs.org/en/)
  * npm
  * [socket.io](https://www.npmjs.com/package/socket.io)
  * [serialport](https://www.npmjs.com/package/serialport)
  * [data-table](https://www.npmjs.com/package/data-table)
  * [express](https://www.npmjs.com/package/express)

## Installation
 1. Clone this repo into `~/TactaServer` directory.
 2. Configure the parameters if needed `~/TactaServer/public/tacta.js`:

    ```
    var boardTypes = ["TACTAVEST", "TACTAFAN"];
    var hardCodedBoardValues = {
      baudRate: 19200,
      limit: 8,
      min: 80,
      max: 255,
      value: 100,
      debug: false
    };

    ```
 3. Run command `npm install` in `~/TactaServer` directory.
 4. Run command `node index`.
 5. sudo npm start in `~/TactaServer`. //Not implemneted yet

## Config Options
| **Option** | **Default** | **Description** |
| --- | --- | --- |
| `limit` | `8` | Number of Tactors connect to the device. |
| `min` | `80` | Minimum value that can be given to the tactor.|
| `max` | `255` | Maximum value that can be given to the tactor. |
| `value` | `100` | Default value that is given to the tactor. |
| `boardTypes` | `BoardTypes` | Type of Boards Available |

## For Developers
//have to update

USAGE :
//Will update
