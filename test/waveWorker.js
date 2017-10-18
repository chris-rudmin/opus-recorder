var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require("sinon-chai");

chai.use(sinonChai);
var should = chai.should();
var expect = chai.expect;


describe('waveWorker', function() {

  var WavePCM = require('../src/waveWorker.js');

  it('should should throw an error if wavSampleRate is not defined', function () {
    expect(WavePCM).to.throw("wavSampleRate value is required to record. NOTE: Audio is not resampled!");
  });

  it('should throw an error if unsupported waveBitDepth value specified', function () {
    expect(WavePCM.bind(WavePCM, {
      wavSampleRate: 44100,
      wavBitDepth: 40
    })).to.throw('Only 8, 16, 24, 32 and 64 bits per sample are supported');
  });

  it('should initialize standard config', function () {
    var wavPCM = new WavePCM({
      wavSampleRate: 44100
    });

    expect(wavPCM).to.have.property('sampleRate', 44100);
    expect(wavPCM).to.have.property('bitDepth', 16);
    expect(wavPCM).to.have.property('bytesPerSample', 2);
  });

  it('should initialize custom config', function () {
    var wavPCM = new WavePCM({
      wavSampleRate: 44100,
      wavBitDepth: 8
    });

    expect(wavPCM).to.have.property('sampleRate', 44100);
    expect(wavPCM).to.have.property('bitDepth', 8);
    expect(wavPCM).to.have.property('bytesPerSample', 1);
  });

  it('should initialize 64-bit config', function () {
    var wavPCM = new WavePCM({
      wavSampleRate: 44100,
      wavBitDepth: 64
    });

    expect(wavPCM).to.have.property('sampleRate', 44100);
    expect(wavPCM).to.have.property('bitDepth', 64);
    expect(wavPCM).to.have.property('bytesPerSample', 8);
  });

  it('should record 64-bit audio', function () {
    var wavPCM = new WavePCM({
      wavSampleRate: 44100,
      wavBitDepth: 64
    });
    wavPCM.record([[0.5]]);

    expect(wavPCM.recordedBuffers[0]).to.have.lengthOf(8);
  });

  it('should split a 64 float into two words', function () {
    var wavPCM = new WavePCM({
      wavSampleRate: 44100,
      wavBitDepth: 64
    });
    var words = wavPCM.splitFloat64(0.5)

    expect(words).to.have.lengthOf(2);
  });

});
