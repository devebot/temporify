'use strict';

const crypto = require('crypto');

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
    return crypto
        .createHash('sha1')
        .update(str, 'utf8')
        .digest('hex');
  }

  this.isCleanupSkipped = function () {
    return process.env.TEMPORIFY_SKIP_CLEANUP != null;
  }
}

module.exports = new Misc();
