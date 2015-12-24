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
	
	decreaseBalance = function(amount: number) {
		ledgers.addEntry('withdrawing', 0 - amount);		
	}
	
	get balance(): number {
		return ledgers.getBalance();
	}
	
	role ledgers {
		addEntry(message, amount) {
			ledgers.push(new LedgerEntry(message, amount));
		}
		
		getBalance(): number {
			let sum = 0;
			for (let entry of ledgers) {
				sum += entry.amount;
			}
			return sum;
		}
	}
}

export class LedgerEntry
{
	constructor(message: string, amount: number) {
		this.message = message;
		this.amount = amount;
	}
}