import Account from './Account';
import TransferMoney from './TransferMoney';

const sourceAccount = new Account();
sourceAccount.increaseBalance(30);

const destinationAccount = new Account();
destinationAccount.increaseBalance(20);

//run the use case
TransferMoney(sourceAccount, destinationAccount, 10);

console.log('source balance', sourceAccount.balance);
console.log('destination balance', destinationAccount.balance);
