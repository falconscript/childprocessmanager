# childprocessmanager

> ES6 JS class to spawn and manage external processes

## Installation

```sh
npm install childprocessmanager --save
```

## Usage

```js
var childprocessmanager = require('childprocessmanager');

var lsProc = new childprocessmanager({
  processPath: "/bin/ls",
  onStdout: (data) => {
    console.log("[D] New stdout chunk:", data);
  },
  onStderr: (data) => {
    console.log("[D] New stderr chunk:", data);
  },
  onDataLine: (line) => {
    // Full line of data received (will be called as well as onStdout, recommend only using this callback)
    console.log("[D] New line of data from stdout:", line);
  },
  onClose: () => {
    console.log("[D] Process closed.");
  },
});

```
