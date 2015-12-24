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
				throw new Error('Insufficient funds');
			}
			self.decreaseBalance(amount);
		}
	}
	
	role destination {
		deposit() {
			self.increaseBalance(amount);
		}
	}
	
	role amount {}
}