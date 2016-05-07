import Controller from './Controller';
import Command from './Command';
import User from './data-objects/User';
import ItemRecord from './data-objects/ItemRecord';
import Loan from './data-objects/Loan';
import app from './app';

//var log = console.log.bind(console);

/**
 * Borrow Library Items
 * Based on this use case by Andreas Söderlund (with some modifications):
 * https://docs.google.com/spreadsheets/d/1TSpjKUhjvP9pMRukt_mInHVbdQWsXHzFjSymQ3VyGmE/edit#gid=2
 */
export default function BorrowLibraryItems(borrower: User, firstItemId: number, controller) {
	Borrower = borrower;
	Screen = controller;
	Database = app.objectStore;
	Printer = window;
	
	let borrowedItems: Map<number, ItemRecord> = new Map();
	
	Borrower.borrowLoanItem(firstItemId);
	
	role Borrower {
		borrowLoanItem(itemId: number) {
			let loanItem: ItemRecord = Database.getById(itemId);
			let error;
			
			if (!loanItem.isAvailable()) {
				error = 'Sorry, this item is not available to be checked out at this time.';
				//(in a real system this would also explain why it's not available)
			}
			else if (borrowedItems.has(loanItem.id)) {
				error = 'The item "' + loanItem.title + '" was already scanned.';
			}
			
			if (error) {
				Screen.showScannedItem(loanItem, false);
				Screen.showError(error);
			}
			else {			
				let loan = new Loan(Borrower, loanItem);
				Database.save(loan);
				//add to local map of borrowed items (indexed by item ID)
				borrowedItems.set(loanItem.id, loanItem);
				Screen.showScannedItem(loanItem, true);
			}
			Screen.askForNextItem();
		}
	}
	contract {
		id: number;
	}
	
	role Screen {
		async askForNextItem() {
			self.showNextSteps();
			let cmd = await Screen.nextCommand();
			switch (cmd.name) {
				case "scanAnother":
					Borrower.borrowLoanItem((cmd.arguments[0]: number));
					break;
				case "finishWithReceipt":
				case "finishWithoutReceipt":
					let arrBorrowedItems = Array.from(borrowedItems.values());
					Screen.showConfirmation(arrBorrowedItems);
					if (cmd.name == "finishWithReceipt") {
						Screen.showReceipt(Borrower, arrBorrowedItems, new Date());
						Printer.print();
					}
					break;
				default:
					throw Error('Invalid command: "' + cmd.name + '"');
			}
		}
	}
	contract {
		showScannedItem(item: ItemRecord, successfullyBorrowed: boolean): void;
		showNextSteps(): void;
		nextCommand(): Promise<Command>;
		showConfirmation(loanItems: Array<ItemRecord>): void;
		showReceipt(borrower:User, loanItems: Array<ItemRecord>, date: Date): void;
		showError(err: string): void;
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