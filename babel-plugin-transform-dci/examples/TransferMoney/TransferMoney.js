/* @flow */

import Account from './Account';

/**
 * TransferMoney use case
 */
export default function TransferMoney(sourceAccount: Account, destinationAccount: Account, amount: number) {
	banker = this;
	banker.transfer();

	role banker {
		transfer() {
			sourceAccount.withdraw();
			destinationAccount.deposit();
		}
	}

	role sourceAccount {
		withdraw() {
			if (this.balance < amount) {
				throw Error('Insufficient funds');
			}
			this.decreaseBalance(amount);
		}
	}
	contract {
		balance: number;
		decreaseBalance(amt: number): void;
	}
	
	role destinationAccount {
		deposit() {
			this.increaseBalance(amount);
		}
	}
	contract {
		increaseBalance(amt: number): void;
	}
	
	role amount {}
}