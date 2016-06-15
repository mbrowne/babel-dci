import "babel-polyfill";

import Controller from './Controller';
import app from './app';
import loadDemoData from './loadDemoData';

loadDemoData();

new Controller().init();