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
			if (this.balance < amount) {
				throw Error('Insufficient funds');
			}
			this.decreaseBalance(amount);
		}
	}
	
	role destination {
		deposit() {
			this.increaseBalance(amount);
		}
	}
	
	role amount {}
}