/* @flow */

/**
 * Bank Account
 */
export default context Account
{
	constructor(ledgers: Array<LedgerEntry>) {
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
			let sum = 0;
			ledgers.forEach(ledger => sum += ledger.amount);
			return sum;
		}
	}
}

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