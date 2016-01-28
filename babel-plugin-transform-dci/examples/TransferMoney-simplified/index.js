import Account from './Account';
import TransferMoney from './TransferMoney';

let sourceAccount = new Account();
sourceAccount.increaseBalance(30);

let destinationAccount = new Account();
destinationAccount.increaseBalance(30);

//run the use case
TransferMoney(sourceAccount, destinationAccount, 10);

console.log('source balance', sourceAccount.balance);
console.log('destination balance', destinationAccount.balance);
