/* @flow */

/**
 * Bank Account
 */
export default context Account
{
	constructor(ledgers: ?[LedgerEntry]) {
		if (!ledgers) ledgers = [];
	}
	
	increaseBalance(amount: number) {
		ledgers.addEntry('depositing', amount);
	}
	
	decreaseBalance(amount: number) {
		ledgers.addEntry('withdrawing', 0 - amount);		
	}
	
	get balance(): number {
		return ledgers.getBalance();
	}
	
	role ledgers {
		addEntry(message: string, amount: number) {
			ledgers.push(new LedgerEntry(message, amount));
		}
		
		getBalance(): number {
			return ledgers.reduce((sum, ledger) => (
				sum + ledger.amount
			), 0);
		}
	}
}

export function LedgerEntry(message: string, amount: number) {
	this._message = message;
	this._amount = amount;
}

LedgerEntry.prototype = {
	constructor: LedgerEntry,
	
	get message(): string {
		return this._message;
	},
	
	get amount(): number {
		return this._amount;
	}
};

/*
Or as a class:

export class LedgerEntry
{
	constructor(message: string, amount: number) {
		this._message = message;
		this._amount = amount;
	}
	
	get message(): string {
		return this._message;
	}
	
	get amount(): number {
		return this._amount;
	}
}
*/