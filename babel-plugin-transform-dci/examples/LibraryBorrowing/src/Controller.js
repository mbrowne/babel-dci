import BorrowLibraryItems from './BorrowLibraryItems';
import session from './session';
import User from './data-objects/User';
import Panel from './Panel';
import MenuView from './MenuView';
import Deferred from './Deferred';
import Command from './Command';

var log = console.log.bind(console);

/**
 * MVC Controller
 */
export default context Controller {
	_panel: Panel;
	_menu: MenuView;
	_deferredNextCommand: Deferred;

	constructor() {
		this._deferredNextCommand = new Deferred();
	}
	
	init() {
		let self = this;
		//setTimeout(function() {
		//
		//self._emitCommand('scanAnother');
		//}, 100);
		
		self._panel = new Panel(self);
		self._menu = new MenuView({
			el: '#menu'	//render to #menu element
		});
		
		//TEMP
		window.panel = self._panel;

		self._initEventHandlers();
	}
	
	showScannedItem(item: ItemRecord) {
		this._panel.set('itemScanned', item);
	}
	
	showNextSteps() {
		//this._panel.find('#scanFirstItemButton').hidden = true;

		this._menu.set('firstItemWasScanned', true);
	}
	
	showError(errMsg: string) {
		alert(errMsg);
	}
	
	_initEventHandlers() {
		let self = this,
			menu = self._menu;
		
		menu.on('scanFirstItem', function() {
			/*
			 * Start the use case
			 */
			BorrowLibraryItems(session.user, self._generateRandomItemId(), self);
		});
		
		//let menuOptions = ['scanAnother', 'finishWithReceipt', 'finishWithoutReceipt'];
		
		menu.on('scanAnother', function() {
			self._emitCommand('scanAnother', [self._generateRandomItemId()]);
		});
		
		menu.on('finishWithReceipt', function() {
			self._emitCommand('finishWithReceipt');
		});
	}
	
	//generate random item number (mock scanner)
	_generateRandomItemId() {
		let min = 1, max = 4;
		return Math.floor(Math.random() * (max - min)) + min;
	}
	
	_emitCommand(commandName: string, args: ?Array<any>) {
		this._deferredNextCommand.resolve(new Command(commandName, args));
		this._deferredNextCommand = new Deferred();
	}

	async nextCommand() {
		//setTimeout(() => deferred.resolve("test"), 100);
		return this._deferredNextCommand.promise;
	}
}