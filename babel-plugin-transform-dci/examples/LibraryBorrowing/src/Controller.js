import BorrowLibraryItems from './BorrowLibraryItems';
import app from './app';
import User from './data-objects/User';
import Deferred from './Deferred';
import Command from './Command';
import Ractive from 'ractive';

//var log = console.log.bind(console);

/**
 * MVC Controller
 */
export default context Controller {
	_panel: Ractive;
	_menuView: Ractive;
	_confirmationView: Ractive;
	_receiptView: Ractive;
	_deferredNextCommand: Deferred;

	constructor() {
		Scanner = null;
		this._deferredNextCommand = new Deferred();
	}
	
	init() {
		this._renderPanel();
		this._renderMenu();
		this._initEventHandlers();
	}
	
	role Scanner {
		//generate random item number (mock scanner)
		getItemId(): number {
			let min = 1, max = 7;
			return Math.floor(Math.random() * (max - min + 1)) + min;
		}
	}
	
	showScannedItem(item: ItemRecord, successfullyBorrowed: boolean) {
		this._panel.set('scannedItem', item);
		this._panel.set('successfullyBorrowed', successfullyBorrowed);
	}
	
	showNextSteps() {
		this._menuView.set('firstItemWasScanned', true);
	}
	
	showError(errMsg: string) {
		alert(errMsg);
	}
	
	_initEventHandlers() {
		let menu = this._menuView;
		
		menu.on('scanFirstItem', () =>
			/*
			 * Start the use case
			 */
			BorrowLibraryItems(app.session.user, Scanner.getItemId(), this)
		);
		
		menu.on('scanAnother', () =>
			this._emitCommand('scanAnother', [Scanner.getItemId()])
		);
		
		menu.on('finishWithReceipt', () =>
			this._emitCommand('finishWithReceipt')
		);
		
		menu.on('finishWithoutReceipt', () =>
			this._emitCommand('finishWithoutReceipt')
		);
	}
	
	_emitCommand(commandName: string, args: ?Array<any>) {
		this._deferredNextCommand.resolve(new Command(commandName, args));
		this._deferredNextCommand = new Deferred();
	}

	async nextCommand() {
		//setTimeout(() => deferred.resolve("test"), 100);
		return this._deferredNextCommand.promise;
	}
	
	_renderPanel() {
		this._panel = new Ractive({
			el: 'container',
			template: '#panelTemplate'
		});
	}
	
	_renderMenu() {
		this._menuView = new Ractive({
			el: 'menu',
			template: '#menuTemplate',
			data: {
				firstItemScanned: false
			}
		});
	}
	
	showConfirmation(loanItems: Array<ItemRecord>) {
		this._confirmationView = new Ractive({
			el: 'container',
			template: '#confirmationTemplate',
			data: {
				loanItems
			}
		});
	}
	
	showReceipt(borrower:User, loanItems: Array<ItemRecord>, date: Date) {
		this._receiptView = new Ractive({
			el: 'receipt',
			template: '#receiptTemplate',
			data: {
				borrower,
				loanItems,
				date
			}
		});
	}
}