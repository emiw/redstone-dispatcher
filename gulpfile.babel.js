/* (c) 2015 EMIW, LLC. emiw.xyz/license */
/* eslint no-var:0, prefer-const: 0, vars-on-top: 0 */

global.Promise = global.Bluebird = require('bluebird');

require('require-dir')('./gulp');
