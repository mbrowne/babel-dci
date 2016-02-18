/* @flow */

/**
 * TransferMoney use case
 */
export default function TransferMoney(source: Account, destination: Account, amount: number) {
	banker = this;
	banker.transfer();

	role banker {
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
	
	role destination {
		deposit() {
			self.increaseBalance(amount);
		}
	}
	
	role amount {}
}