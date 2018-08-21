'use strict';

const fs = require('fs');
const path = require('path');
const deindent = require('deindent');
const ejs = require('ejs');
const shell = require('shelljs');


var homedir = '/home/drupalex/Downloads/demo';
var filelist = [];
if (shell.test('-d', homedir)) {
  shell.ls('-lR', homedir).forEach(function(file) {
    filelist.push(file);
  });
}

console.log('List: %s', JSON.stringify(filelist, null, 2));