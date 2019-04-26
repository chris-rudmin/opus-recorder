"use strict";

var global = global || self;
var encoder;

importScripts('lame.min.js');

global['onmessage'] = function( e ){
  switch( e['data']['command'] ){

    case 'encode':
      if (encoder) {
        encoder.encode( e['data']['buffers'] );
      }
      break;

    case 'done':
      if (encoder) {
        encoder.finishEncoding();
        global['postMessage']( {message: 'done'} );
        encoder = null;
      }
      break;

    case 'close':
      global['close']();
      break;

    case 'flush':
      if (encoder) {
        encoder.flush();
      }
      break;

    case 'init':
      encoder = new MP3Encoder( e['data'] );
      global['postMessage']( {message: 'ready'} );
      break;

    default:
      // Ignore any unknown commands and continue recieving commands
  }
};

var MP3Encoder = function( config ){

  this.config = Object.assign({
    bufferLength: 4096,
    numberOfChannels: 1,
    originalSampleRate: 44100,
    encoderBitRate: 128,
    streamBufferSize: 10000 // buffer this amount of encoded data before generating a onPage/dataAvailable event
  }, config);

  this.samplePosition = 0;

  this.encodedBuffer = new Int8Array(this.config.streamBufferSize);
  this.encodedBufferUsed = 0;

  this.lameEncoder = new lamejs.Mp3Encoder(this.config.numberOfChannels, this.config.originalSampleRate, this.config.encoderBitRate);
};

MP3Encoder.prototype.encode = function( buffers ) {
  // maximum of two channels, left and right. Any more are ignored.
  var numChannels = Math.min(this.config.numberOfChannels, 2);
  var buffers16bit = new Array(numChannels);

  for (var i = 0; i < numChannels; i ++) {
    buffers16bit[i] = this.convertBuffer(buffers[i]);
  }

  var encodedData = null;

  if (numChannels > 1) {
    encodedData = this.lameEncoder.encodeBuffer(buffers16bit[0], buffers16bit[1]);
  } else {
    encodedData = this.lameEncoder.encodeBuffer(buffers16bit[0]);
  }

  this.samplePosition += buffers16bit[0].length;
  this.handleEncodedData(encodedData);
};

MP3Encoder.prototype.finishEncoding = function() {
  var lastData = this.lameEncoder.flush();

  if (lastData.length > 0) {
    this.handleEncodedData(lastData);
  }

  this.streamAllFromBuffer();
};

MP3Encoder.prototype.flush = function() {
  this.streamAllFromBuffer();
  global['postMessage']( {message: 'flushed'} );
};

MP3Encoder.prototype.handleEncodedData = function(data) {
  if (data.length > 0) {

    var dataRemaining = data.length;
    var dataIndex = 0;

    while (dataRemaining > 0) {
      var spaceInBuffer = this.config.streamBufferSize - this.encodedBufferUsed;
      var amountToCopy = Math.min(spaceInBuffer, dataRemaining);
      var dataToCopy = data.subarray(dataIndex, dataIndex + amountToCopy);

      this.encodedBuffer.set(dataToCopy, this.encodedBufferUsed);
      this.encodedBufferUsed += amountToCopy;

      dataIndex += amountToCopy;
      dataRemaining -= amountToCopy;

      if (this.encodedBufferUsed >= this.config.streamBufferSize) {
        this.streamAllFromBuffer();
      }
    }
  }
};

MP3Encoder.prototype.streamAllFromBuffer = function() {
  if (this.encodedBufferUsed > 0) {
    var data = new Int8Array(this.encodedBuffer.subarray(0, this.encodedBufferUsed));
    global['postMessage']( {message: 'page', page: data, samplePosition: this.samplePosition}, [data.buffer] );
    this.encodedBufferUsed = 0;
  }
};

MP3Encoder.prototype.floatTo16BitPCM = function( input, output ) {
  for (var i = 0; i < input.length; i ++) {
    var s = Math.max(-1, Math.min(1, input[i]));
    output[i] = (s < 0 ? s * 0x8000 : s * 0x7FFF);
  }
};

MP3Encoder.prototype.convertBuffer = function( arrayBuffer ){
  var data = new Float32Array(arrayBuffer);
  var out = new Int16Array(arrayBuffer.length);
  this.floatTo16BitPCM(data, out)
  return out;
};
