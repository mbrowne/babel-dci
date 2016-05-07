import ItemRecord from './ItemRecord';

export default function Book(id: number, title: string) {
	ItemRecord.call(this, id, title);
}

Book.prototype = Object.create(ItemRecord.prototype);
Book.prototype.constructor = Book;