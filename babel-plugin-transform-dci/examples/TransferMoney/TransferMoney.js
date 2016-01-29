/* @flow */

/**
 * TransferMoney use case
 */
export default function TransferMoney(source: Account, destination: Account, amount: number) {
	bank = this;
	bank.transfer();

	role bank {
		transfer() {
			source.withdraw();
			destination.deposit();
		}
	}

	role source {
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
	
	role destination {
		deposit() {
			self.increaseBalance(amount);
		}
	}
	contract {
		increaseBalance(amt: number): void;
	}
	
	role amount {}
}