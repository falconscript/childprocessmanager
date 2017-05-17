"use strict";

/**
 * ChildProcessManager
 *
 * In charge of controlling a program/process through its lifecycle
 */

var ps = require('ps-node'),
    lineReader = require('line-reader'),
    spawn = require('child_process').spawn;

var DIE = function() {
    //var red="\u001B[0;31m"; var boldRed="\u001B[1;31m";
    console.log.apply(console, arguments);
    console.log("[+] Exiting.");
    process.exit(0);
};

class ChildProcessManager {
  constructor (args) {
    this.proc = null; // process obj

    // Pass these as arguments.
    this.onStdout = args.onStdout || function (data) { console.log("[D] stdout received", data); };
    this.onStderr = args.onStderr || function (data) { console.log("[D] stderr received", data); };
    this.onDataLine = args.onDataLine || false;
    this.onClose = args.onClose || function (signal) { console.log('[D]', this.name, 'terminated ', signal) };
    this.processPath = args.processPath;

    this.name = this.processPath.split('/').pop();
  }
  lookupProc (procName, callback) {
    // A simple pid lookup
    ps.lookup({ command: procName, /*arguments: '--debug',*/ }, (err, procs) => {
      if (err) {
          throw new Error( err );
      }

      procs.forEach((proc) => {
        if (proc) {
            console.log('[D] Process Found - PID: %s, COMMAND: %s, ARGUMENTS: %s',
              proc.pid, proc.command, proc.arguments );
        }
      });

      return callback(procs);
    });
  }
  killProcById (procId, callback) {
    ps.kill(procId, (err) => {
      if (err) {
          throw new Error( err );
      }

      console.log("[D] Old process killed.");
      return callback();
    });
  }
  killProcByName (procName, callback) {
    this.lookupProc(procName, (procs) => {
      if (procs && procs[0]) {
        console.log("[D] " + procName + "  running. Killing to gain control.");

        return this.killProcById(procs[0].pid, callback);
      } else {
        return callback();
      }
    });
  }
  startProc (procArgs) {

    console.log("[D] Starting process ->", this.processPath, procArgs);

    // add handler to close child process upon termination of parent process
    // Must be added before these other items
    SignalManagerService.addShutdownHandler(this.shutdownHandler.bind(this));

    // Open process
    var proc = spawn(this.processPath, procArgs);

    // Data capture
    proc.stdout.on('data', (dataBuffer) => {

      var lines = dataBuffer.toString();

      this.onStdout(lines);

      if (this.onDataLine) {
        lines.split('\n').forEach((data, lineIndex) => {
          this.onDataLine(data)
        });
      }
    });

    proc.stderr.on('data', (dataBuffer) => {
      var data = dataBuffer.toString();

      this.onStderr(data);
    });

    proc.on('close', (code, signal) => {
      this.onClose(code, signal);
      SignalManagerService.removeShutdownHandler(this.shutdownHandler.bind(this));
    });


    return proc;
  }

  /**
   * send data to process
   * I guess this method is synchronous
   * ENSURE THAT YOU SEND A \n CHARACTER AT THE END OF YOUR DATA
   */
  sendDataLine (data) {
    if (!this.proc) {
      return console.log("[!] No process started!");
    }
    //this.proc.stdin.setEncoding('utf-8');
    //this.proc.stdout.pipe(process.stdout); // interesting idea though
    this.proc.stdin.write(data); // MUST END WITH \n usually
  }
  /**
   * Start a process killing old process if still alive
   */
  startProcFresh (procArgs, callback) {
    this.killProcByName(this.name, () => {
      this.proc = this.startProc(procArgs);

      return callback();
    });
  }
  shutdownHandler (callback) {
    return callback(true); // child processes will die automatically
    console.log("[D] procmanager - closing", this.name);
    this.killProcByName(this.name, () => {
      return callback(true);
    });
  }
};


module.exports = ChildProcessManager;
