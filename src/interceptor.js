"use strict";

var root = (typeof self === 'object' && self.self === self && self) || (typeof global === 'object' && global.global === global && global) || this;

(function( global ) {

  var Interceptor = function( config ){

    var that = this;

    if ( !Interceptor.isRecordingSupported() ) {
      throw new Error("Recording is not supported in this browser");
    }

    this.state = "inactive";
    this.renderState = "running";
    this.renderIdleCounter = 0;
    this.eventTarget = global.document.createDocumentFragment();
    this.audioContext = new global.AudioContext();
    this.monitorNode = this.audioContext.createGain();

    this.config = config = config || {};
    this.config.command = "init";
    this.config.bufferLength = config.bufferLength || 4096;
    this.config.monitorGain = config.monitorGain || 0;
    this.config.numberOfChannels = config.numberOfChannels || 1;
    this.config.originalSampleRate = this.audioContext.sampleRate;
    this.config.encoderSampleRate = config.encoderSampleRate || 48000;
    this.config.encoderPath = config.encoderPath || 'encoderWorker.min.js';
    this.config.decoderPath = config.decoderPath || 'decoderWorker.min.js';
    this.config.streamPages = true; // always yield asap
    this.config.rawPacket = config.rawPacket || false;
    this.config.leaveStreamOpen = config.leaveStreamOpen || false;
    this.config.maxBuffersPerPage = config.maxBuffersPerPage || 40;
    this.config.encoderApplication = config.encoderApplication || 2049;
    this.config.encoderFrameSize = config.encoderFrameSize || 20;
    this.config.resampleQuality = config.resampleQuality || 3;
    this.config.streamOptions = config.streamOptions || {
      optional: [],
      mandatory: {
        googEchoCancellation: false,
        googAutoGainControl: false,
        googNoiseSuppression: false,
        googHighpassFilter: false
      }
    };

    this.setMonitorGain( this.config.monitorGain );
    this.scriptProcessorNode = this.audioContext.createScriptProcessor( this.config.bufferLength, this.config.numberOfChannels, this.config.numberOfChannels );

    this.renderQueue = new Array();
    this.scriptProcessorNode.onaudioprocess = function( e ){
      that.encodeBuffers( e.inputBuffer );
      if ( that.renderQueue.length && that.renderState === "running" ) {
        var buffer = that.renderQueue.shift();
        for ( var i = 0; i < e.outputBuffer.numberOfChannels; i++ ) {
          e.outputBuffer.copyToChannel(buffer[i], i);
        }
        that.eventTarget.dispatchEvent( new global.CustomEvent( "rqupdate", { detail: that.renderQueue.length } ) );
      }

      else {
        ++that.renderIdleCounter;
        that.eventTarget.dispatchEvent( new global.CustomEvent( "ridle", { detail: that.renderIdleCounter } ) );
      }
    };

    this.decoder = new global.Worker( this.config.decoderPath );
      this.decoder.onmessage = function ( e ) {
        if (e.data === null) {
          // end of decode
        }

        else {
          that.renderQueue.push( e.data );
          that.eventTarget.dispatchEvent( new global.CustomEvent( "rqupdate", { detail: that.renderQueue.length } ) );
        }
    }
    this.decoder.postMessage({ 
      command:'init',
      bufferLength: this.config.bufferLength,
      decoderSampleRate: this.config.encoderSampleRate,
      outputBufferSampleRate: this.audioContext.sampleRate,
      rawPacket: this.config.rawPacket
    });
  };

  Interceptor.isRecordingSupported = function(){
    return global.AudioContext && global.navigator && ( global.navigator.getUserMedia || ( global.navigator.mediaDevices && global.navigator.mediaDevices.getUserMedia ) );
  };

  Interceptor.prototype.addEventListener = function( type, listener, useCapture ){
    this.eventTarget.addEventListener( type, listener, useCapture );
  };

  Interceptor.prototype.clearStream = function() {
    if ( this.stream ) {

      if ( this.stream.getTracks ) {
        this.stream.getTracks().forEach(function ( track ) {
          track.stop();
        });
      }

      else {
        this.stream.stop();
      }

      delete this.stream;
    }
  };

  Interceptor.prototype.encodeBuffers = function( inputBuffer ){
    if ( this.state === "recording" ) {
      var buffers = [];
      for ( var i = 0; i < inputBuffer.numberOfChannels; i++ ) {
        buffers[i] = inputBuffer.getChannelData(i);
      }

      this.encoder.postMessage({
        command: "encode",
        buffers: buffers
      });
    }
  };

  Interceptor.prototype.initStream = function(){
    var that = this;

    var onStreamInit = function( stream ){
      that.stream = stream;
      that.sourceNode = that.audioContext.createMediaStreamSource( stream );
      that.sourceNode.connect( that.scriptProcessorNode );
      that.sourceNode.connect( that.monitorNode );
      that.eventTarget.dispatchEvent( new global.Event( "streamReady" ) );
      return stream;
    }

    var onStreamError = function( e ){
      that.eventTarget.dispatchEvent( new global.ErrorEvent( "streamError", { error: e } ) );
    }

    var constraints = { audio : this.config.streamOptions };

    if ( this.stream ) {
      this.eventTarget.dispatchEvent( new global.Event( "streamReady" ) );
      return global.Promise.resolve( this.stream );
    }

    if ( global.navigator.mediaDevices && global.navigator.mediaDevices.getUserMedia ) {
      return global.navigator.mediaDevices.getUserMedia( constraints ).then( onStreamInit, onStreamError );
    }

    if ( global.navigator.getUserMedia ) {
      return new global.Promise( function( resolve, reject ) {
        global.navigator.getUserMedia( constraints, resolve, reject );
      }).then( onStreamInit, onStreamError );
    }
  };

  Interceptor.prototype.pause = function(){
    if ( this.state === "recording" ){
      this.state = "paused";
      this.eventTarget.dispatchEvent( new global.Event( 'pause' ) );
    }
  };

  Interceptor.prototype.removeEventListener = function( type, listener, useCapture ){
    this.eventTarget.removeEventListener( type, listener, useCapture );
  };

  Interceptor.prototype.resume = function() {
    if ( this.state === "paused" ) {
      this.state = "recording";
      this.eventTarget.dispatchEvent( new global.Event( 'resume' ) );
    }
  };

  Interceptor.prototype.setMonitorGain = function( gain ){
    this.monitorNode.gain.value = gain;
  };

  Interceptor.prototype.start = function(){
    if ( this.state === "inactive" && this.stream ) {
      var that = this;
      this.encoder = new global.Worker( this.config.encoderPath );

      this.encoder.addEventListener( "message", function ( e ) {
        if ( e.data === null ) {
          that.eventTarget.dispatchEvent( new global.Event( 'stop' ) );
        }

        else {
          that.eventTarget.dispatchEvent( new global.CustomEvent( 'dataAvailable', {
            detail: e.data
          }));
        }
      });

      // First buffer can contain old data. Don't encode it.
      this.encodeBuffers = function(){
        delete this.encodeBuffers;
      };

      this.state = "recording";
      this.monitorNode.connect( this.audioContext.destination );
      this.scriptProcessorNode.connect( this.audioContext.destination );
      this.eventTarget.dispatchEvent( new global.Event( 'start' ) );
      this.encoder.postMessage( this.config );
    }
  };

  Interceptor.prototype.stop = function(){
    if ( this.state !== "inactive" ) {
      this.state = "inactive";
      this.sourceNode.disconnect( this.scriptProcessorNode );
      this.sourceNode.disconnect( this.monitorNode );
      this.monitorNode.disconnect( this.audioContext.destination );
      this.scriptProcessorNode.disconnect( this.audioContext.destination );

      if ( !this.config.leaveStreamOpen ) {
        this.clearStream();
      }

      this.encoder.postMessage({ command: "done" });
    }
  };

  Interceptor.prototype.renderPause = function(){
    if ( this.renderState === "running" ){
      this.renderState = "paused";
      this.eventTarget.dispatchEvent( new global.Event( 'rpause' ) );
    }
  };

  Interceptor.prototype.renderResume = function() {
    if ( this.renderState === "paused" ) {
      this.renderState = "running";
      this.eventTarget.dispatchEvent( new global.Event( 'rresume' ) );
    }
  };

  Interceptor.prototype.renderFForward = function() {
    while ( this.renderQueue.length) {
      this.renderQueue.shift();
    }
    this.eventTarget.dispatchEvent( new global.Event( 'rfforward' ) );
  };

  Interceptor.prototype.renderRICounter = function() {
    this.renderIdleCounter = 0;
    this.eventTarget.dispatchEvent( new global.CustomEvent( "ridle", { detail: this.renderIdleCounter } ) );
  };

  Interceptor.prototype.feedData = function( data ){
    this.decoder.postMessage({
      command: 'decode',
      pages: data
    }, [data.buffer] );
  };

  // Exports
  global.Interceptor = Interceptor;

  if ( typeof define === 'function' && define.amd ) {
    define( [], function() {
      return Interceptor;
    });
  }

  else if ( typeof module == 'object' && module.exports ) {
    module.exports = Interceptor;
  }

})(root);
