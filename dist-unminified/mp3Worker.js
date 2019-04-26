(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["MP3Worker"] = factory();
	else
		root["MP3Worker"] = factory();
})(typeof self !== 'undefined' ? self : this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/mp3Worker.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/mp3Worker.js":
/*!**************************!*\
  !*** ./src/mp3Worker.js ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\nvar global = global || self;\nvar encoder;\n\nimportScripts('lame.min.js');\n\nglobal['onmessage'] = function( e ){\n  switch( e['data']['command'] ){\n\n    case 'encode':\n      if (encoder) {\n        encoder.encode( e['data']['buffers'] );\n      }\n      break;\n\n    case 'done':\n      if (encoder) {\n        encoder.finishEncoding();\n        global['postMessage']( {message: 'done'} );\n        encoder = null;\n      }\n      break;\n\n    case 'close':\n      global['close']();\n      break;\n\n    case 'flush':\n      if (encoder) {\n        encoder.flush();\n      }\n      break;\n\n    case 'init':\n      encoder = new MP3Encoder( e['data'] );\n      global['postMessage']( {message: 'ready'} );\n      break;\n\n    default:\n      // Ignore any unknown commands and continue recieving commands\n  }\n};\n\nvar MP3Encoder = function( config ){\n\n  this.config = Object.assign({\n    bufferLength: 4096,\n    numberOfChannels: 1,\n    originalSampleRate: 44100,\n    encoderBitRate: 128,\n    streamBufferSize: 10000 // buffer this amount of encoded data before generating a onPage/dataAvailable event\n  }, config);\n\n  this.samplePosition = 0;\n\n  this.encodedBuffer = new Int8Array(this.config.streamBufferSize);\n  this.encodedBufferUsed = 0;\n\n  this.lameEncoder = new lamejs.Mp3Encoder(this.config.numberOfChannels, this.config.originalSampleRate, this.config.encoderBitRate);\n};\n\nMP3Encoder.prototype.encode = function( buffers ) {\n  // maximum of two channels, left and right. Any more are ignored.\n  var numChannels = Math.min(this.config.numberOfChannels, 2);\n  var buffers16bit = new Array(numChannels);\n\n  for (var i = 0; i < numChannels; i ++) {\n    buffers16bit[i] = this.convertBuffer(buffers[i]);\n  }\n\n  var encodedData = null;\n\n  if (numChannels > 1) {\n    encodedData = this.lameEncoder.encodeBuffer(buffers16bit[0], buffers16bit[1]);\n  } else {\n    encodedData = this.lameEncoder.encodeBuffer(buffers16bit[0]);\n  }\n\n  this.samplePosition += buffers16bit[0].length;\n  this.handleEncodedData(encodedData);\n};\n\nMP3Encoder.prototype.finishEncoding = function() {\n  var lastData = this.lameEncoder.flush();\n\n  if (lastData.length > 0) {\n    this.handleEncodedData(lastData);\n  }\n\n  this.streamAllFromBuffer();\n};\n\nMP3Encoder.prototype.flush = function() {\n  this.streamAllFromBuffer();\n  global['postMessage']( {message: 'flushed'} );\n};\n\nMP3Encoder.prototype.handleEncodedData = function(data) {\n  if (data.length > 0) {\n\n    var dataRemaining = data.length;\n    var dataIndex = 0;\n\n    while (dataRemaining > 0) {\n      var spaceInBuffer = this.config.streamBufferSize - this.encodedBufferUsed;\n      var amountToCopy = Math.min(spaceInBuffer, dataRemaining);\n      var dataToCopy = data.subarray(dataIndex, dataIndex + amountToCopy);\n\n      this.encodedBuffer.set(dataToCopy, this.encodedBufferUsed);\n      this.encodedBufferUsed += amountToCopy;\n\n      dataIndex += amountToCopy;\n      dataRemaining -= amountToCopy;\n\n      if (this.encodedBufferUsed >= this.config.streamBufferSize) {\n        this.streamAllFromBuffer();\n      }\n    }\n  }\n};\n\nMP3Encoder.prototype.streamAllFromBuffer = function() {\n  if (this.encodedBufferUsed > 0) {\n    var data = new Int8Array(this.encodedBuffer.subarray(0, this.encodedBufferUsed));\n    global['postMessage']( {message: 'page', page: data, samplePosition: this.samplePosition}, [data.buffer] );\n    this.encodedBufferUsed = 0;\n  }\n};\n\nMP3Encoder.prototype.floatTo16BitPCM = function( input, output ) {\n  for (var i = 0; i < input.length; i ++) {\n    var s = Math.max(-1, Math.min(1, input[i]));\n    output[i] = (s < 0 ? s * 0x8000 : s * 0x7FFF);\n  }\n};\n\nMP3Encoder.prototype.convertBuffer = function( arrayBuffer ){\n  var data = new Float32Array(arrayBuffer);\n  var out = new Int16Array(arrayBuffer.length);\n  this.floatTo16BitPCM(data, out)\n  return out;\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvbXAzV29ya2VyLmpzLmpzIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vTVAzV29ya2VyLy4vc3JjL21wM1dvcmtlci5qcz82MDA4Il0sInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZ2xvYmFsID0gZ2xvYmFsIHx8IHNlbGY7XG52YXIgZW5jb2RlcjtcblxuaW1wb3J0U2NyaXB0cygnbGFtZS5taW4uanMnKTtcblxuZ2xvYmFsWydvbm1lc3NhZ2UnXSA9IGZ1bmN0aW9uKCBlICl7XG4gIHN3aXRjaCggZVsnZGF0YSddWydjb21tYW5kJ10gKXtcblxuICAgIGNhc2UgJ2VuY29kZSc6XG4gICAgICBpZiAoZW5jb2Rlcikge1xuICAgICAgICBlbmNvZGVyLmVuY29kZSggZVsnZGF0YSddWydidWZmZXJzJ10gKTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnZG9uZSc6XG4gICAgICBpZiAoZW5jb2Rlcikge1xuICAgICAgICBlbmNvZGVyLmZpbmlzaEVuY29kaW5nKCk7XG4gICAgICAgIGdsb2JhbFsncG9zdE1lc3NhZ2UnXSgge21lc3NhZ2U6ICdkb25lJ30gKTtcbiAgICAgICAgZW5jb2RlciA9IG51bGw7XG4gICAgICB9XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ2Nsb3NlJzpcbiAgICAgIGdsb2JhbFsnY2xvc2UnXSgpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdmbHVzaCc6XG4gICAgICBpZiAoZW5jb2Rlcikge1xuICAgICAgICBlbmNvZGVyLmZsdXNoKCk7XG4gICAgICB9XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ2luaXQnOlxuICAgICAgZW5jb2RlciA9IG5ldyBNUDNFbmNvZGVyKCBlWydkYXRhJ10gKTtcbiAgICAgIGdsb2JhbFsncG9zdE1lc3NhZ2UnXSgge21lc3NhZ2U6ICdyZWFkeSd9ICk7XG4gICAgICBicmVhaztcblxuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBJZ25vcmUgYW55IHVua25vd24gY29tbWFuZHMgYW5kIGNvbnRpbnVlIHJlY2lldmluZyBjb21tYW5kc1xuICB9XG59O1xuXG52YXIgTVAzRW5jb2RlciA9IGZ1bmN0aW9uKCBjb25maWcgKXtcblxuICB0aGlzLmNvbmZpZyA9IE9iamVjdC5hc3NpZ24oe1xuICAgIGJ1ZmZlckxlbmd0aDogNDA5NixcbiAgICBudW1iZXJPZkNoYW5uZWxzOiAxLFxuICAgIG9yaWdpbmFsU2FtcGxlUmF0ZTogNDQxMDAsXG4gICAgZW5jb2RlckJpdFJhdGU6IDEyOCxcbiAgICBzdHJlYW1CdWZmZXJTaXplOiAxMDAwMCAvLyBidWZmZXIgdGhpcyBhbW91bnQgb2YgZW5jb2RlZCBkYXRhIGJlZm9yZSBnZW5lcmF0aW5nIGEgb25QYWdlL2RhdGFBdmFpbGFibGUgZXZlbnRcbiAgfSwgY29uZmlnKTtcblxuICB0aGlzLnNhbXBsZVBvc2l0aW9uID0gMDtcblxuICB0aGlzLmVuY29kZWRCdWZmZXIgPSBuZXcgSW50OEFycmF5KHRoaXMuY29uZmlnLnN0cmVhbUJ1ZmZlclNpemUpO1xuICB0aGlzLmVuY29kZWRCdWZmZXJVc2VkID0gMDtcblxuICB0aGlzLmxhbWVFbmNvZGVyID0gbmV3IGxhbWVqcy5NcDNFbmNvZGVyKHRoaXMuY29uZmlnLm51bWJlck9mQ2hhbm5lbHMsIHRoaXMuY29uZmlnLm9yaWdpbmFsU2FtcGxlUmF0ZSwgdGhpcy5jb25maWcuZW5jb2RlckJpdFJhdGUpO1xufTtcblxuTVAzRW5jb2Rlci5wcm90b3R5cGUuZW5jb2RlID0gZnVuY3Rpb24oIGJ1ZmZlcnMgKSB7XG4gIC8vIG1heGltdW0gb2YgdHdvIGNoYW5uZWxzLCBsZWZ0IGFuZCByaWdodC4gQW55IG1vcmUgYXJlIGlnbm9yZWQuXG4gIHZhciBudW1DaGFubmVscyA9IE1hdGgubWluKHRoaXMuY29uZmlnLm51bWJlck9mQ2hhbm5lbHMsIDIpO1xuICB2YXIgYnVmZmVyczE2Yml0ID0gbmV3IEFycmF5KG51bUNoYW5uZWxzKTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IG51bUNoYW5uZWxzOyBpICsrKSB7XG4gICAgYnVmZmVyczE2Yml0W2ldID0gdGhpcy5jb252ZXJ0QnVmZmVyKGJ1ZmZlcnNbaV0pO1xuICB9XG5cbiAgdmFyIGVuY29kZWREYXRhID0gbnVsbDtcblxuICBpZiAobnVtQ2hhbm5lbHMgPiAxKSB7XG4gICAgZW5jb2RlZERhdGEgPSB0aGlzLmxhbWVFbmNvZGVyLmVuY29kZUJ1ZmZlcihidWZmZXJzMTZiaXRbMF0sIGJ1ZmZlcnMxNmJpdFsxXSk7XG4gIH0gZWxzZSB7XG4gICAgZW5jb2RlZERhdGEgPSB0aGlzLmxhbWVFbmNvZGVyLmVuY29kZUJ1ZmZlcihidWZmZXJzMTZiaXRbMF0pO1xuICB9XG5cbiAgdGhpcy5zYW1wbGVQb3NpdGlvbiArPSBidWZmZXJzMTZiaXRbMF0ubGVuZ3RoO1xuICB0aGlzLmhhbmRsZUVuY29kZWREYXRhKGVuY29kZWREYXRhKTtcbn07XG5cbk1QM0VuY29kZXIucHJvdG90eXBlLmZpbmlzaEVuY29kaW5nID0gZnVuY3Rpb24oKSB7XG4gIHZhciBsYXN0RGF0YSA9IHRoaXMubGFtZUVuY29kZXIuZmx1c2goKTtcblxuICBpZiAobGFzdERhdGEubGVuZ3RoID4gMCkge1xuICAgIHRoaXMuaGFuZGxlRW5jb2RlZERhdGEobGFzdERhdGEpO1xuICB9XG5cbiAgdGhpcy5zdHJlYW1BbGxGcm9tQnVmZmVyKCk7XG59O1xuXG5NUDNFbmNvZGVyLnByb3RvdHlwZS5mbHVzaCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnN0cmVhbUFsbEZyb21CdWZmZXIoKTtcbiAgZ2xvYmFsWydwb3N0TWVzc2FnZSddKCB7bWVzc2FnZTogJ2ZsdXNoZWQnfSApO1xufTtcblxuTVAzRW5jb2Rlci5wcm90b3R5cGUuaGFuZGxlRW5jb2RlZERhdGEgPSBmdW5jdGlvbihkYXRhKSB7XG4gIGlmIChkYXRhLmxlbmd0aCA+IDApIHtcblxuICAgIHZhciBkYXRhUmVtYWluaW5nID0gZGF0YS5sZW5ndGg7XG4gICAgdmFyIGRhdGFJbmRleCA9IDA7XG5cbiAgICB3aGlsZSAoZGF0YVJlbWFpbmluZyA+IDApIHtcbiAgICAgIHZhciBzcGFjZUluQnVmZmVyID0gdGhpcy5jb25maWcuc3RyZWFtQnVmZmVyU2l6ZSAtIHRoaXMuZW5jb2RlZEJ1ZmZlclVzZWQ7XG4gICAgICB2YXIgYW1vdW50VG9Db3B5ID0gTWF0aC5taW4oc3BhY2VJbkJ1ZmZlciwgZGF0YVJlbWFpbmluZyk7XG4gICAgICB2YXIgZGF0YVRvQ29weSA9IGRhdGEuc3ViYXJyYXkoZGF0YUluZGV4LCBkYXRhSW5kZXggKyBhbW91bnRUb0NvcHkpO1xuXG4gICAgICB0aGlzLmVuY29kZWRCdWZmZXIuc2V0KGRhdGFUb0NvcHksIHRoaXMuZW5jb2RlZEJ1ZmZlclVzZWQpO1xuICAgICAgdGhpcy5lbmNvZGVkQnVmZmVyVXNlZCArPSBhbW91bnRUb0NvcHk7XG5cbiAgICAgIGRhdGFJbmRleCArPSBhbW91bnRUb0NvcHk7XG4gICAgICBkYXRhUmVtYWluaW5nIC09IGFtb3VudFRvQ29weTtcblxuICAgICAgaWYgKHRoaXMuZW5jb2RlZEJ1ZmZlclVzZWQgPj0gdGhpcy5jb25maWcuc3RyZWFtQnVmZmVyU2l6ZSkge1xuICAgICAgICB0aGlzLnN0cmVhbUFsbEZyb21CdWZmZXIoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbk1QM0VuY29kZXIucHJvdG90eXBlLnN0cmVhbUFsbEZyb21CdWZmZXIgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuZW5jb2RlZEJ1ZmZlclVzZWQgPiAwKSB7XG4gICAgdmFyIGRhdGEgPSBuZXcgSW50OEFycmF5KHRoaXMuZW5jb2RlZEJ1ZmZlci5zdWJhcnJheSgwLCB0aGlzLmVuY29kZWRCdWZmZXJVc2VkKSk7XG4gICAgZ2xvYmFsWydwb3N0TWVzc2FnZSddKCB7bWVzc2FnZTogJ3BhZ2UnLCBwYWdlOiBkYXRhLCBzYW1wbGVQb3NpdGlvbjogdGhpcy5zYW1wbGVQb3NpdGlvbn0sIFtkYXRhLmJ1ZmZlcl0gKTtcbiAgICB0aGlzLmVuY29kZWRCdWZmZXJVc2VkID0gMDtcbiAgfVxufTtcblxuTVAzRW5jb2Rlci5wcm90b3R5cGUuZmxvYXRUbzE2Qml0UENNID0gZnVuY3Rpb24oIGlucHV0LCBvdXRwdXQgKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoOyBpICsrKSB7XG4gICAgdmFyIHMgPSBNYXRoLm1heCgtMSwgTWF0aC5taW4oMSwgaW5wdXRbaV0pKTtcbiAgICBvdXRwdXRbaV0gPSAocyA8IDAgPyBzICogMHg4MDAwIDogcyAqIDB4N0ZGRik7XG4gIH1cbn07XG5cbk1QM0VuY29kZXIucHJvdG90eXBlLmNvbnZlcnRCdWZmZXIgPSBmdW5jdGlvbiggYXJyYXlCdWZmZXIgKXtcbiAgdmFyIGRhdGEgPSBuZXcgRmxvYXQzMkFycmF5KGFycmF5QnVmZmVyKTtcbiAgdmFyIG91dCA9IG5ldyBJbnQxNkFycmF5KGFycmF5QnVmZmVyLmxlbmd0aCk7XG4gIHRoaXMuZmxvYXRUbzE2Qml0UENNKGRhdGEsIG91dClcbiAgcmV0dXJuIG91dDtcbn07XG4iXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Iiwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./src/mp3Worker.js\n");

/***/ })

/******/ });
});