import "babel-polyfill";

//import BorrowLibraryItems from './BorrowLibraryItems';
import Controller from './Controller';
import app from './app';
import loadDemoData from './loadDemoData';

loadDemoData();

//session.user = new User(12345, 'Test', 'User');

new Controller().init();

//BorrowLibraryItems(new Controller());