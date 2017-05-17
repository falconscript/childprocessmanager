"use strict";

/**
 * ChildProcessManager
 *
 * In charge of controlling a program/process through its lifecycle
 */

var ps = require('ps-node'),
    spawn = require('child_process').spawn;

var DIE = function() {
    //var red="\u001B[0;31m"; var boldRed="\u001B[1;31m";
    console.log.apply(console, arguments);
    console.log("[+] Exiting.");
    process.exit(0);
};


// https://nodejs.org/api/child_process.html#child_process_options_detached
// On Windows, setting options.detached to true makes it possible for the child process
// to continue running after the parent exits. The child will have its own console window.
// Once enabled for a child process, it cannot be disabled.

// On non-Windows platforms, if options.detached is set to true, the child process will
// be made the leader of a new process group and session. Note that child processes may
// continue running after the parent exits regardless of whether they are detached or not.

class ChildProcessManager {
  constructor (args) {
    this.proc = null; // process obj

    // Pass these as arguments.
    this.onStdout = args.onStdout || function (data) { console.log("[D] stdout received", data); };
    this.onStderr = args.onStderr || function (data) { console.log("[D] stderr received", data); };
    this.onDataLine = args.onDataLine || false;
    this.onClose = args.onClose || function (code, signal) { console.log('[D]', this.name, 'terminated ', code) };
    this.processPath = args.processPath;
    this.detached = args.detached || false;
    this.procIsRunning = false;

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

    // Open process
    var proc = spawn(this.processPath, procArgs, {detached: this.detached});

    this.procIsRunning = true;

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

    // Attach close handler
    proc.on('close', (code, signal) => {
      this.isProcessRunning = false;
      this.onClose(code, signal);
    });


    return proc;
  }

  isProcessRunning () {
    return this.procIsRunning;
  }

  killThisProc (callback) {
    if (this.proc && this.procIsRunning) {
      return this.killProcById(this.proc.pid, callback);
    } else {
      return console.log("[!] ERR trying to kill process that is not running:", this.name);
    }
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
};


module.exports = ChildProcessManager;
