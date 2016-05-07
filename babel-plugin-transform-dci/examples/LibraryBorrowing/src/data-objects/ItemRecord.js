export default function ItemRecord(id: number, title: string) {
	this._id = id;
	this._title = title;
}

ItemRecord.prototype = {
	constructor: ItemRecord,
	
	//available for loan?
	isAvailable() {
		return GetLoanItemAvailability(this);
	},
	
	get id(): number {return this._id},
	get title(): string {return this._title}
};

//In a real app, this would probably be a Context
function GetLoanItemAvailability(loanItem: ItemRecord) {
	//just make all items available for the sake of this simple example
	return true;
}