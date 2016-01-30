/* @flow */

/**
 * TransferMoney use case
 */
export default function TransferMoney(sourceAccount: Account, destinationAccount: Account, amount: number) {
	bank = this;
	bank.transfer();

	role bank {
		transfer() {
			sourceAccount.withdraw();
			destinationAccount.deposit();
		}
	}

	role sourceAccount {
		withdraw() {
			if (self.balance < amount) {
				throw Error('Insufficient funds');
			}
			self.decreaseBalance(amount);
		}
	}
	contract {
		decreaseBalance(amt: number): void;
	}
	
	role destinationAccount {
		deposit() {
			self.increaseBalance(amount);
		}
	}
	contract {
		increaseBalance(amt: number): void;
	}
	
	role amount {}
}