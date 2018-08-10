'use strict';

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
}

module.exports = new Misc();
