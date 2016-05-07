import ItemRecord from './ItemRecord';

export default function DVD(id: number, title: string) {
	ItemRecord.call(this, id, title);
}

DVD.prototype = Object.create(ItemRecord.prototype);
DVD.prototype.constructor = DVD;