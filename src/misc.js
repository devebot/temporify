'use strict';

const crypto = require('crypto');
const fs = require('fs');

function Misc() {

  this.isArray = function (val) {
    return Array.isArray(val);
  }
  
  this.isObject = function (val) {
    return val && typeof val === 'object' && !this.isArray(val);
  }
  
  this.isString = function (val) {
    return typeof val === 'string';
  }

  this.removeFirstLineBreak = function (str) {
    if (this.isString(str) && str[0] === '\n') {
      return str.slice(1);
    }
    return str;
  }

  this.generateChecksum = function (str) {
    return generateChecksum(str);
  }

  this.getChecksumOfFile = function(filename) {
    return generateChecksum(fs.readFileSync(filename));
  }

  this.isCleanupSkipped = function () {
    return process.env.TEMPORIFY_CLEANUP_SKIPPED != null;
  }

  this.isUnsafeCleanup = function () {
    return process.env.TEMPORIFY_UNSAFE_CLEANUP === "true";
  }
}

function generateChecksum(str) {
  return crypto
      .createHash('sha1')
      .update(str, 'utf8')
      .digest('hex');
}

module.exports = new Misc();
