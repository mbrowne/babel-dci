export default function Loan(borrower: User, itemRecord: itemRecord, numDays: number) {
	this._id = null; //This should be auto-generated somehow
	this._startDate = new Date();
	this._borrower = borrower;
	this._itemRecord = itemRecord;
	this._numDays = numDays;
}

Loan.prototype = {
	constructor: Loan,
	get id(): number {return this._id},
	get startDate(): Date {return this._startDate},
	get borrower(): User {return this._borrower},
	get itemRecord(): ItemRecord {return this._itemRecord},
	get numDays(): number {return this._numDays}
};