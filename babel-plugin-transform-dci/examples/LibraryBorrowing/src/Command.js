export default function Command(name: string, args: ?Array<any>) {
	this._name = name;
	this._args = args;
}

Command.prototype = {
	constructor: Command,
	get name() {return this._name},
	get arguments() {return this._args}
};