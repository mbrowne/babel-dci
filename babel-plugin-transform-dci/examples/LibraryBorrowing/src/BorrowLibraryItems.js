import Controller from './Controller';
import Command from './Command';
import User from './data-objects/User';
import ItemRecord from './data-objects/ItemRecord';
import Loan from './data-objects/Loan';
import app from './app';

var log = console.log.bind(console);

/**
 * Borrow Library Items
 * Based on this use case by Andreas Söderlund (with some modifications):
 * https://docs.google.com/spreadsheets/d/1TSpjKUhjvP9pMRukt_mInHVbdQWsXHzFjSymQ3VyGmE/edit#gid=2
 */
export default function BorrowLibraryItems(borrower: User, firstItemId: number, controller) {
	Borrower = borrower;
	Screen = controller;
	Librarian = this;
	Database = app.objectStore;
	Printer = window;
	
	let borrowedItems: {[id:number]: ItemRecord} = {};
	
	Borrower.borrowLoanItem(firstItemId);
	
	role Borrower {
		borrowLoanItem(itemId: number) {
			let loanItem: ItemRecord = Database.getById(itemId);
			Screen.showScannedItem(loanItem);
			
			if (!loanItem.isAvailable()) {
				Screen.showError('Sorry, this item is not available to be checked out at this time.');
				//(in a real system this would also explain why it's not available)
			}
			else if (loanItem.id in borrowedItems) {
				Screen.showError('The item "' + loanItem.title + '" was already scanned.');
			}
			else {			
				let loan = new Loan(Borrower, loanItem);
				Database.save(loan);
				borrowedItems[loanItem.id] = loanItem;
			}
			
			Librarian.askForNextItem();
		}
	}
	contract {
		id: number;
	}
	
	role Screen {} contract {
		showScannedItem(item: ItemRecord): void;
		showNextSteps(): void;
		nextCommand(): Promise<Command>;
		showError(err: string): void;
	}
	
	role Librarian {
		async askForNextItem() {
			Screen.showNextSteps();
			let cmd = await Screen.nextCommand();
			switch (cmd.name) {
                case "scanAnother":
                    Borrower.borrowLoanItem((cmd.arguments[0]: number));
                    break;
                case "finishWithReceipt":
                    Printer.print();
					break;
                case "finishWithoutReceipt":
                    break;
            }
		}
	}
	
	role Database {
		getItemRecordById(id: number): ItemRecord {
			return (self.getById(id): ItemRecord);
		}
	}
	contract {
		getById(id: number): Object;
		save(entity: Object): void;
	}
	
	role Printer {} contract {
		print(): void;
	}
}