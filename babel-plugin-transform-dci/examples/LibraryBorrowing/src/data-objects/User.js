export default function User(cardNumber: number, firstName: string, lastName: string) {
	this._cardNumber = cardNumber;
	this.firstName = firstName;
	this.lastName = lastName;
}

User.prototype = {
	constructor: User,
	get name(): string {
		return this.firstName + ' ' + this.lastName;
	},
	get cardNumber(): number {return this._cardNumber}
};