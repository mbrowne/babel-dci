/* @flow */

/**
 * Bank Account
 */
export default class Account
{
    _balance: number = 0;
    
    increaseBalance(amount: number) {
        this._balance += amount;
    }
    
    decreaseBalance(amount: number) {
        this._balance -= amount;
    }
    
    get balance(): number {
        return this._balance;
    }
}